"""
app/analytics/scores.py
-----------------------
KPI score computation engine for MedBridge.
All scores return a float 0.0-1.0 unless noted.
"""
from typing import Optional


def understanding_score(
    questions_asked: int,
    summaries_viewed: int,
    follow_ups_completed: int,
    total_sessions: int,
) -> float:
    """North Star KPI. Measures active comprehension behaviors."""
    if total_sessions == 0:
        return 0.0
    engaged = summaries_viewed + questions_asked + follow_ups_completed
    return min(round(engaged / (total_sessions * 3), 4), 1.0)


def confidence_score(ratings: list[int]) -> float:
    """Average feedback rating 1-5, normalized to 0-1."""
    if not ratings:
        return 0.0
    return round((sum(ratings) / len(ratings)) / 5, 4)


def feature_adoption_score(
    features_used: int,
    total_features: int = 8,
) -> float:
    """Ratio of features used vs total available."""
    if total_features == 0:
        return 0.0
    return round(min(features_used / total_features, 1.0), 4)


def patient_activation_score(
    has_uploaded: bool,
    has_asked_question: bool,
    has_set_reminder: bool,
    has_added_provider: bool,
) -> float:
    """4-point activation checklist, each worth 0.25."""
    steps = [has_uploaded, has_asked_question, has_set_reminder, has_added_provider]
    return round(sum(steps) / len(steps), 4)


def digital_equity_score(
    used_accessibility_features: bool,
    preferred_language_set: bool,
    low_bandwidth_mode_used: bool,
) -> float:
    """Measures equitable access behaviors."""
    flags = [used_accessibility_features, preferred_language_set, low_bandwidth_mode_used]
    return round(sum(flags) / len(flags), 4)


def data_quality_score(
    records_with_summaries: int,
    total_records: int,
    failed_ocr_count: int = 0,
) -> float:
    """Ratio of successfully processed records."""
    if total_records == 0:
        return 0.0
    penalty = min(failed_ocr_count / max(total_records, 1), 1.0)
    base = records_with_summaries / total_records
    return round(max(base - penalty, 0.0), 4)


def compute_all_scores(data: dict) -> dict:
    """
    Convenience wrapper. Pass a dict of raw event counts,
    returns all KPI scores keyed by metric name.
    """
    return {
        "understanding_score": understanding_score(
            questions_asked=data.get("questions_asked", 0),
            summaries_viewed=data.get("summaries_viewed", 0),
            follow_ups_completed=data.get("follow_ups_completed", 0),
            total_sessions=data.get("total_sessions", 1),
        ),
        "confidence_score": confidence_score(
            ratings=data.get("ratings", []),
        ),
        "feature_adoption_score": feature_adoption_score(
            features_used=data.get("features_used", 0),
        ),
        "patient_activation_score": patient_activation_score(
            has_uploaded=data.get("has_uploaded", False),
            has_asked_question=data.get("has_asked_question", False),
            has_set_reminder=data.get("has_set_reminder", False),
            has_added_provider=data.get("has_added_provider", False),
        ),
        "digital_equity_score": digital_equity_score(
            used_accessibility_features=data.get("used_accessibility_features", False),
            preferred_language_set=data.get("preferred_language_set", False),
            low_bandwidth_mode_used=data.get("low_bandwidth_mode_used", False),
        ),
        "data_quality_score": data_quality_score(
            records_with_summaries=data.get("records_with_summaries", 0),
            total_records=data.get("total_records", 0),
            failed_ocr_count=data.get("failed_ocr_count", 0),
        ),
    }
