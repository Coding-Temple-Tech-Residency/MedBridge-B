"""
Appointment preparation service.

Generates 3–5 plain-language questions a patient might want to discuss
with their healthcare provider, based on their uploaded document.

Design decisions:
  - Uses a constrained prompt with approved question templates
  - Does NOT do open-ended "ask anything" generation
  - Output is framed as "you may wish to ask" — never as directives
  - Grounded in the document, not general medical knowledge
  - Explicitly avoids generating diagnostic or treatment suggestions
"""

import logging
from dataclasses import dataclass
from typing import Optional

from groq import Groq
from tenacity import retry, stop_after_attempt, wait_exponential
from app.config import get_settings
from app.services.chunking_service import assemble_context, simple_keyword_retrieval
from app.services.summary_service import _truncate_to_limit

logger = logging.getLogger(__name__)

PREP_SYSTEM_PROMPT = """You are MedBridge, a healthcare understanding tool.

Your task is to help a patient prepare questions for a conversation with
their healthcare provider, based on their uploaded medical document.

Generate 3 to 5 questions the patient may wish to ask their provider.

Rules:
1. Base questions ONLY on information in the document.
2. Frame every question as something the patient might ask, not as advice.
   Good: "You may wish to ask: What does my LDL result mean for my health?"
   Bad: "Your LDL is high — ask about statins."
3. Do NOT suggest diagnoses or treatments.
4. Do NOT generate questions that imply a specific diagnosis.
5. Focus on: clarification of results, next steps mentioned in the document,
   follow-up timing, and anything that appears abnormal or flagged.
6. Use plain language. Target a 4th–6th grade reading level.
7. Return ONLY a JSON array of question strings. No preamble, no markdown.
   Example format: ["Question one?", "Question two?", "Question three?"]"""


@dataclass
class PrepResult:
    questions: list[str]
    success: bool = True
    error_message: Optional[str] = None


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True,
)
def _call_groq(client: Groq, model: str, messages: list[dict]) -> str:
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=500,
        temperature=0.2,
    )
    return response.choices[0].message.content.strip()


def generate_prep_questions(
    extracted_text: str,
    chunk_texts: Optional[list[str]] = None,
) -> PrepResult:
    """
    Generate appointment preparation questions from a document.
    Returns a PrepResult with a list of question strings.
    """
    import json

    settings = get_settings()

    if not extracted_text or not extracted_text.strip():
        return PrepResult(
            questions=[],
            success=False,
            error_message="No document text available to generate questions from.",
        )

    # Build context — same strategy as Q&A service
    if chunk_texts and len(chunk_texts) > 1:
        relevant = simple_keyword_retrieval(
            chunk_texts,
            "results findings abnormal follow-up next steps",
            top_k=4,
        )
        context = assemble_context(relevant, settings.max_context_tokens - 200)
    else:
        context = _truncate_to_limit(extracted_text, settings.max_context_tokens - 200)

    client = Groq(api_key=settings.groq_api_key)
    messages = [
        {"role": "system", "content": PREP_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"DOCUMENT:\n{context}\n\n"
                f"Generate 3–5 questions this patient may wish to ask their provider."
            ),
        },
    ]

    try:
        raw = _call_groq(client, settings.groq_model, messages)

        # Parse JSON array — strip markdown fences if present
        raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        questions = json.loads(raw)

        if not isinstance(questions, list):
            raise ValueError("Response was not a list")

        # Sanitise — keep only strings, cap at 7
        questions = [str(q).strip() for q in questions if str(q).strip()][:7]

        if not questions:
            raise ValueError("Empty question list returned")

        return PrepResult(questions=questions)

    except json.JSONDecodeError as e:
        logger.warning(f"Prep JSON parse failed: {e} — raw: {raw[:200]}")
        # Graceful fallback: return a generic set of questions
        return PrepResult(questions=_fallback_questions())

    except Exception as e:
        logger.exception(f"Prep generation failed: {e}")
        return PrepResult(
            questions=[],
            success=False,
            error_message=(
                "We were unable to generate questions at this time. "
                "Please try again in a few moments."
            ),
        )


def _fallback_questions() -> list[str]:
    """
    Generic questions used when the model output cannot be parsed.
    Always safe to show — not document-specific.
    """
    return [
        "What do the results in this document mean for my health?",
        "Are any of these results outside the normal range?",
        "Is any follow-up testing or appointment recommended?",
        "Are there any changes to my care plan based on this document?",
    ]
