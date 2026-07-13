"""
Summary service.

Sends extracted document text to Groq/Llama and returns a plain-language
summary suitable for patients with low health literacy.

Enforces:
  - 4th grade reading level target
  - No diagnosis, treatment, or medication recommendations
  - Inline medical term explanations
  - Warm, reassuring tone
  - Mandatory disclaimer at end of every summary
"""

import logging
from dataclasses import dataclass
from typing import Optional

from groq import Groq
from tenacity import retry, stop_after_attempt, wait_exponential
from app.config import get_settings
from app.services.chunking_service import count_tokens, assemble_context

logger = logging.getLogger(__name__)

DISCLAIMER = (
    "MedBridge explains information from your uploaded document in plain language. "
    "It does not provide medical advice, diagnosis, or treatment recommendations. "
    "Please contact a healthcare provider for medical decisions."
)

SYSTEM_PROMPT = """You are MedBridge, a healthcare understanding tool.

Your purpose is to help patients understand medical documents they have uploaded.

You do NOT provide:
- diagnoses
- treatment recommendations  
- medication recommendations
- clinical decisions of any kind

You explain information found in the uploaded document ONLY.
Do not draw on general medical knowledge to fill gaps in the document.
If information is not present in the document, say so clearly.

Language requirements:
- Use plain language. Target a 4th grade reading level.
- Never exceed an 8th grade reading level unless medically unavoidable.
- Explain medical terms automatically, inline, as they appear.
  Example: instead of "The patient has hypertension", write
  "The document says you have hypertension (high blood pressure)."
- Use a warm, reassuring tone. Medical documents are confusing.
  Patients should not feel judged for not understanding them.
- Write in second person ("your document says...", "this means...")
  to make the summary feel personal and relevant.

Structure your summary as:
1. A one-sentence plain-language overview of what kind of document this is.
2. The key findings or information, explained in plain language.
3. Any dates, follow-up actions, or next steps mentioned in the document.
4. One sentence acknowledging that the patient should speak to their
   provider if they have further questions.

When you cannot explain something:
- If a section is unclear or incomplete: acknowledge it honestly.
- If clinical judgment is required: recommend the patient ask their provider.

Do NOT end with the disclaimer — that is added programmatically."""


@dataclass
class SummaryResult:
    text: str
    success: bool = True
    error_message: Optional[str] = None
    tokens_used: int = 0


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True,
)
def _call_groq(client: Groq, model: str, messages: list[dict]) -> tuple[str, int]:
    """Retryable Groq API call. Returns (text, total_tokens)."""
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=1500,
        temperature=0.3,   # Low temp = more consistent, less hallucination
    )
    text = response.choices[0].message.content.strip()
    tokens = response.usage.total_tokens if response.usage else 0
    return text, tokens


def generate_summary(extracted_text: str) -> SummaryResult:
    """
    Generate a plain-language summary of the extracted document text.

    For large documents, truncates to MAX_CONTEXT_TOKENS before sending.
    The full chunked Q&A retrieval handles large documents at query time.
    """
    settings = get_settings()

    if not extracted_text or not extracted_text.strip():
        return SummaryResult(
            text="",
            success=False,
            error_message="No text was found in this document to summarize.",
        )

    # Truncate to context limit for summary (simpler than chunking for summary)
    text_to_summarize = _truncate_to_limit(extracted_text, settings.max_context_tokens - 500)

    client = Groq(api_key=settings.groq_api_key)
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Please summarize the following medical document for a patient:\n\n"
                f"{text_to_summarize}"
            ),
        },
    ]

    try:
        summary_text, tokens_used = _call_groq(client, settings.groq_model, messages)
        # Append the mandatory disclaimer
        full_text = f"{summary_text}\n\n---\n\n{DISCLAIMER}"
        return SummaryResult(text=full_text, tokens_used=tokens_used)
    except Exception as e:
        logger.exception(f"Summary generation failed: {e}")
        err = str(e).lower()
        if "model_decommissioned" in err or "decommissioned" in err:
            message = (
                f"The configured AI model ({settings.groq_model}) is no longer supported by Groq. "
                "Update GROQ_MODEL in your .env to a supported model and restart the server."
            )
        else:
            message = (
                "We were unable to generate a summary at this time. "
                "Please try again in a few moments."
            )
        return SummaryResult(
            text="",
            success=False,
            error_message=message,
        )


def _truncate_to_limit(text: str, max_tokens: int) -> str:
    """Truncate text to fit within the token limit."""
    if count_tokens(text) <= max_tokens:
        return text

    # Decode-encode truncation via tiktoken
    import tiktoken
    encoder = tiktoken.get_encoding("cl100k_base")
    tokens = encoder.encode(text)[:max_tokens]
    truncated = encoder.decode(tokens)
    logger.info(f"Document truncated from {count_tokens(text)} to {max_tokens} tokens for summary")
    return truncated + "\n\n[Note: This document was long. The summary covers the first portion.]"
