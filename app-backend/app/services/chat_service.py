"""
Chat / Q&A service.

Answers patient questions grounded strictly in the uploaded document.
Never speculates beyond document content.
Escalates clinical judgment questions to healthcare providers.
"""

import logging
from dataclasses import dataclass
from typing import Optional

from groq import Groq
from tenacity import retry, stop_after_attempt, wait_exponential
from app.config import get_settings
from app.services.chunking_service import (
    assemble_context,
    simple_keyword_retrieval,
    needs_chunking,
)

logger = logging.getLogger(__name__)

DEFAULT_MAX_TOKENS = 800
EXTENDED_MAX_TOKENS = 1500

DISCLAIMER = (
    "This answer is based only on your uploaded document. "
    "MedBridge does not provide medical advice. "
    "Please consult a healthcare provider for medical decisions."
)

QA_SYSTEM_PROMPT = """You are MedBridge, a healthcare understanding tool.

You are answering a patient's question about their uploaded medical document.

Rules you MUST follow:
1. Answer ONLY using information found in the provided document context.
2. Do NOT use general medical knowledge to fill gaps.
3. Do NOT diagnose conditions.
4. Do NOT recommend treatments or medications.
5. Do NOT recommend changing or stopping medications.
6. If the answer is not in the document, say clearly:
   "I could not find that information in your uploaded document."
7. If the question requires clinical judgment (e.g. "should I be worried?",
   "is this serious?", "what should I do?"), respond:
   "That's an important question for your healthcare provider. 
    MedBridge can explain what your document says, but medical decisions 
    should always be made with your doctor."
8. Explain any medical terms you use, inline.
9. Use a warm, reassuring tone. Patients asking questions are often anxious.
10. Write in second person ("your document says...", "according to your results...")

Do NOT add a disclaimer at the end — that is added programmatically."""


def _wants_more(question: str) -> bool:
    """Return True when the patient is asking for a longer or deeper answer."""
    q = question.lower()
    return any(
        phrase in q
        for phrase in (
            "more detail",
            "explain more",
            "explain further",
            "tell me more",
            "go deeper",
            "elaborate",
            "in more depth",
        )
    )


@dataclass
class ChatResult:
    answer: str
    success: bool = True
    error_message: Optional[str] = None
    tokens_used: int = 0
    context_source: str = "full_document"  # "full_document" | "chunks"


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True,
)
def _call_groq(
    client: Groq,
    model: str,
    messages: list[dict],
    max_tokens: int = DEFAULT_MAX_TOKENS,
) -> tuple[str, int]:
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=max_tokens,
        temperature=0.2,
    )
    text = response.choices[0].message.content.strip()
    tokens = response.usage.total_tokens if response.usage else 0
    return text, tokens


def answer_question(
    question: str,
    extracted_text: str,
    chunk_texts: Optional[list[str]] = None,
) -> ChatResult:
    """
    Answer a patient question about their document.

    If chunk_texts is provided (large document), uses keyword retrieval
    to select the most relevant chunks. Otherwise uses full document text.

    Args:
        question: Patient's question string
        extracted_text: Full extracted text (used if document is small)
        chunk_texts: List of pre-stored chunk strings (used if document is large)
    """
    settings = get_settings()

    if not question or not question.strip():
        return ChatResult(
            answer="",
            success=False,
            error_message="Please enter a question.",
        )

    # Determine context source
    if chunk_texts and len(chunk_texts) > 1:
        # Large document — retrieve relevant chunks
        relevant = simple_keyword_retrieval(chunk_texts, question, top_k=5)
        context = assemble_context(relevant, settings.max_context_tokens - 300)
        context_source = "chunks"
    else:
        # Small document — use full text (truncated to limit)
        from app.services.summary_service import _truncate_to_limit
        context = _truncate_to_limit(extracted_text, settings.max_context_tokens - 300)
        context_source = "full_document"

    client = Groq(api_key=settings.groq_api_key)
    messages = [
        {"role": "system", "content": QA_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"DOCUMENT:\n{context}\n\n"
                f"PATIENT QUESTION:\n{question}"
            ),
        },
    ]

    try:
        max_tokens = EXTENDED_MAX_TOKENS if _wants_more(question) else DEFAULT_MAX_TOKENS
        answer_text, tokens_used = _call_groq(client, settings.groq_model, messages, max_tokens=max_tokens)
        if max_tokens == DEFAULT_MAX_TOKENS and len(answer_text) > 200:
            answer_text += "\n\n_Want more detail? Just ask me to explain further._"
        full_answer = f"{answer_text}\n\n---\n\n{DISCLAIMER}"
        return ChatResult(
            answer=full_answer,
            tokens_used=tokens_used,
            context_source=context_source,
        )
    except Exception as e:
        logger.exception(f"Q&A generation failed: {e}")
        return ChatResult(
            answer="",
            success=False,
            error_message=(
                "We were unable to answer your question at this time. "
                "Please try again in a few moments."
            ),
        )


async def stream_question(
    question: str,
    extracted_text: str,
    chunk_texts=None,
):
    """
    Streaming variant of answer_question.
    Yields text chunks as they arrive from Groq.
    Used by the /documents/{document_id}/chat/stream SSE endpoint.
    """
    from typing import AsyncGenerator
    settings = get_settings()

    if not question or not question.strip():
        yield "Please enter a question."
        return

    if chunk_texts and len(chunk_texts) > 1:
        from app.services.chunking_service import simple_keyword_retrieval, assemble_context
        relevant = simple_keyword_retrieval(chunk_texts, question, top_k=5)
        context = assemble_context(relevant, settings.max_context_tokens - 300)
    else:
        from app.services.summary_service import _truncate_to_limit
        context = _truncate_to_limit(extracted_text, settings.max_context_tokens - 300)

    max_tokens = EXTENDED_MAX_TOKENS if _wants_more(question) else DEFAULT_MAX_TOKENS

    client = Groq(api_key=settings.groq_api_key)
    messages = [
        {"role": "system", "content": QA_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"DOCUMENT:\n{context}\n\n"
                f"PATIENT QUESTION:\n{question}"
            ),
        },
    ]

    stream = client.chat.completions.create(
        model=settings.groq_model,
        messages=messages,
        max_tokens=max_tokens,
        temperature=0.2,
        stream=True,
    )

    for chunk in stream:
        delta = chunk.choices[0].delta
        if delta and delta.content:
            yield delta.content
