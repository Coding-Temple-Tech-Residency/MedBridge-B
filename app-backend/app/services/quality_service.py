"""
Summary quality service.

Checks every generated summary against the quality standard defined in the
Action Plan and QA documents:

  - Reading level: target 4th grade, max 8th grade
  - No forbidden language (diagnosis, treatment, medication directives)
  - Disclaimer present
  - Medical terms expected to be explained (heuristic check)

Returns a QualityResult with pass/fail and a list of specific issues.
The processing pipeline logs failures but does not block the user —
quality issues are recorded in the summaries table so the team can
review and improve the prompt over time.
"""

import re
import logging
from dataclasses import dataclass, field
from typing import Optional

import textstat
import nltk

logger = logging.getLogger(__name__)

# Download required NLTK data on first use — silent if already present
def _ensure_nltk_data():
    try:
        nltk.data.find("corpora/cmudict")
    except LookupError:
        logger.info("Downloading NLTK cmudict (one-time setup)...")
        nltk.download("cmudict", quiet=True)

_ensure_nltk_data()

# Reading level thresholds (Flesch-Kincaid grade)
READING_LEVEL_TARGET = 6.0   # ideal ceiling
READING_LEVEL_MAX = 12.0      # hard maximum

# Phrases that indicate the AI overstepped its informational role
FORBIDDEN_PATTERNS = [
    r"\byou have been diagnosed\b",
    r"\byou are diagnosed\b",
    r"\byou suffer from\b",
    r"\byou should (?:take|start|stop|increase|decrease)\b",
    r"\bi recommend\b",
    r"\bmy recommendation\b",
    r"\bprescribe\b",
    r"\bstart(?:ing)? (?:medication|treatment|therapy)\b",
    r"\bstop(?:ping)? (?:medication|treatment)\b",
    r"\byou (?:have|likely have|probably have) (?:cancer|diabetes|hypertension|disease)\b",
]

# Strings that must appear somewhere in every summary
REQUIRED_STRINGS = [
    "medical advice",   # from the disclaimer
]

# Common medical abbreviations that should be explained if present
# (heuristic — checks that a plain-language follow-up appears nearby)
MEDICAL_TERMS_TO_CHECK = [
    "eGFR", "HbA1c", "LDL", "HDL", "WBC", "RBC", "BUN", "CBC",
    "TSH", "INR", "PSA", "ALT", "AST", "BMI", "ECG", "EKG",
]


@dataclass
class QualityResult:
    passed: bool
    reading_level: Optional[float]
    issues: list[str] = field(default_factory=list)


def check_summary_quality(summary_text: str) -> QualityResult:
    """
    Run all quality checks on a generated summary.
    Returns a QualityResult — never raises.
    """
    if not summary_text or not summary_text.strip():
        return QualityResult(
            passed=False,
            reading_level=None,
            issues=["Summary text is empty."],
        )

    issues = []

    # ── Reading level ─────────────────────────────────────────────────────────
    try:
        grade = textstat.flesch_kincaid_grade(summary_text)
    except Exception as e:
        logger.warning(f"Reading level check failed: {e}")
        grade = None

    if grade is not None and grade > READING_LEVEL_MAX:
        issues.append(
            f"Reading level too high: {grade:.1f} (max {READING_LEVEL_MAX}). "
            f"Consider simplifying language in the prompt."
        )

    # ── Forbidden language ────────────────────────────────────────────────────
    text_lower = summary_text.lower()
    for pattern in FORBIDDEN_PATTERNS:
        if re.search(pattern, text_lower):
            issues.append(f"Forbidden language detected: pattern '{pattern}'")

    # ── Required disclaimer ───────────────────────────────────────────────────
    for required in REQUIRED_STRINGS:
        if required not in text_lower:
            issues.append(f"Required string missing: '{required}'")

    # ── Medical term explanation (heuristic) ──────────────────────────────────
    unexplained = []
    for term in MEDICAL_TERMS_TO_CHECK:
        if term in summary_text:
            # Check that some explanatory phrase appears within 300 chars after the term
            idx = summary_text.find(term)
            context = summary_text[idx: idx + 300].lower()
            # Heuristic: look for parentheses, "which is", "also called", "means"
            explained = any(
                marker in context
                for marker in ["(", "which is", "also called", "means ", "known as", "refers to"]
            )
            if not explained:
                unexplained.append(term)

    if unexplained:
        issues.append(
            f"Medical terms may not be explained: {', '.join(unexplained)}. "
            f"The prompt instructs inline explanation — check whether the model followed it."
        )

    passed = len(issues) == 0
    if not passed:
        logger.warning("Summary quality check failed with %d issue(s).", len(issues))

    return QualityResult(passed=passed, reading_level=grade, issues=issues)


def measure_reading_level(text: str) -> Optional[float]:
    """Convenience function for tests and standalone checks."""
    try:
        return textstat.flesch_kincaid_grade(text)
    except Exception:
        return None
