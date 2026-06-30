"""
Health Score Service

Generates a patient health engagement score (0-100) from document text.
Measures how well the patient appears to be keeping up with their care plan.
NOT a clinical assessment — scores engagement and document clarity only.
"""

import logging
from groq import Groq
from app.config import get_settings

logger = logging.getLogger(__name__)

HEALTH_SCORE_PROMPT = """You are analyzing a patient medical document to assess health engagement.

Score the patient's apparent engagement with their care plan on a scale of 0-100 based ONLY on what the document shows:
- Are follow-up appointments scheduled?
- Are medications listed with clear instructions?
- Are lab results within normal range?
- Are there clear action items for the patient?
- Is the care plan specific and actionable?

Do NOT diagnose. Do NOT assess clinical severity. Score engagement and plan clarity only.

Respond in this exact JSON format with no other text:
{
  "score": <number 0-100>,
  "label": "<one of: Excellent / Good / Needs Attention / Critical>",
  "rationale": "<one plain-language sentence explaining the score, written for a patient at 6th grade reading level>"
}

Label guide:
- Excellent (80-100): Clear plan, follow-ups scheduled, medications clear
- Good (60-79): Mostly clear plan with some gaps
- Needs Attention (40-59): Significant gaps in the care plan
- Critical (0-39): Very unclear plan or missing key information"""


def generate_health_score(extracted_text: str) -> dict:
    """
    Generate a health engagement score from document text.
    Returns dict with success, score, label, rationale.
    """
    settings = get_settings()

    if not extracted_text or not extracted_text.strip():
        return {"success": False, "error": "No document text available"}

    # Truncate to avoid token limit
    text = extracted_text[:3000]

    client = Groq(api_key=settings.groq_api_key)

    try:
        response = client.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {"role": "system", "content": HEALTH_SCORE_PROMPT},
                {"role": "user", "content": f"DOCUMENT:\n{text}"},
            ],
            max_tokens=200,
            temperature=0.1,
        )

        import json
        raw = response.choices[0].message.content.strip()
        # Strip markdown fences if present
        raw = raw.replace("```json", "").replace("```", "").strip()
        data = json.loads(raw)

        score = float(data.get("score", 0))
        label = data.get("label", "Needs Attention")
        rationale = data.get("rationale", "Unable to assess from this document.")

        # Validate label
        valid_labels = ["Excellent", "Good", "Needs Attention", "Critical"]
        if label not in valid_labels:
            if score >= 80:
                label = "Excellent"
            elif score >= 60:
                label = "Good"
            elif score >= 40:
                label = "Needs Attention"
            else:
                label = "Critical"

        return {
            "success": True,
            "score": round(score, 1),
            "label": label,
            "rationale": rationale,
        }

    except Exception as e:
        logger.exception(f"Health score generation failed: {e}")
        return {"success": False, "error": str(e)}
