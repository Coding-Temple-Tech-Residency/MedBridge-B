"""Unit tests for medication request/response schemas."""

from datetime import date, datetime, timezone

import pytest
from pydantic import ValidationError

from app.schemas.medications import MedicationCreate, MedicationResponse, MedicationUpdate


def test_create_with_only_name_succeeds():
    med = MedicationCreate(name="Lisinopril")
    assert med.status == "active"
    assert med.dose is None


def test_create_requires_name():
    med = MedicationCreate(name="Lisinopril")
    assert med.status == "active"


def test_create_rejects_empty_name():
    with pytest.raises(ValidationError):
        MedicationCreate(name="")


def test_create_rejects_invalid_status():
    with pytest.raises(ValidationError):
        MedicationCreate(name="Lisinopril", status="discontinued")


def test_create_accepts_dosage_alias():
    med = MedicationCreate(name="Lisinopril", dosage="10 mg")
    assert med.dose == "10 mg"


def test_create_is_active_false_maps_to_stopped():
    med = MedicationCreate(name="Lisinopril", is_active=False)
    assert med.status == "stopped"


def test_create_is_active_true_maps_to_active():
    med = MedicationCreate(name="Lisinopril", is_active=True)
    assert med.status == "active"


def test_create_prefers_explicit_status_over_is_active():
    med = MedicationCreate(name="Lisinopril", status="on-hold", is_active=True)
    assert med.status == "on-hold"


def test_create_rejects_end_date_before_start_date():
    with pytest.raises(ValidationError):
        MedicationCreate(
            name="Lisinopril",
            start_date=date(2026, 6, 10),
            end_date=date(2026, 6, 1),
        )


def test_update_allows_partial_fields():
    med = MedicationUpdate(dose="20 mg")
    assert med.name is None
    assert med.status is None
    assert med.to_db_updates() == {"dose": "20 mg"}


def test_update_maps_is_active_to_status():
    med = MedicationUpdate(is_active=False)
    assert med.status == "stopped"
    assert med.to_db_updates() == {"status": "stopped"}


def test_update_does_not_set_status_when_only_dose_provided():
    med = MedicationUpdate(dose="20 mg")
    assert "status" not in med.to_db_updates()


def test_response_includes_computed_fields():
    now = datetime.now(timezone.utc)
    med = MedicationResponse(
        id="550e8400-e29b-41d4-a716-446655440010",
        user_id="550e8400-e29b-41d4-a716-446655440000",
        name="Lisinopril",
        dose="10 mg",
        status="active",
        created_at=now,
    )
    dumped = med.model_dump()
    assert dumped["dosage"] == "10 mg"
    assert dumped["is_active"] is True


def test_response_is_active_false_when_stopped():
    now = datetime.now(timezone.utc)
    med = MedicationResponse(
        id="550e8400-e29b-41d4-a716-446655440010",
        user_id="550e8400-e29b-41d4-a716-446655440000",
        name="Lisinopril",
        status="stopped",
        created_at=now,
    )
    assert med.is_active is False
