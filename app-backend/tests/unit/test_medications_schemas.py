"""Unit tests for medication request/response schemas."""

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from app.schemas.medications import MedicationCreate, MedicationResponse, MedicationUpdate


def test_create_requires_name():
    med = MedicationCreate(name="Lisinopril")
    assert med.status == "active"


def test_create_rejects_empty_name():
    with pytest.raises(ValidationError):
        MedicationCreate(name="")


def test_create_rejects_invalid_status():
    with pytest.raises(ValidationError):
        MedicationCreate(name="Lisinopril", status="discontinued")


def test_update_allows_partial_fields():
    med = MedicationUpdate(dose="20 mg")
    assert med.name is None
    assert med.status is None


def test_response_shape():
    now = datetime.now(timezone.utc)
    med = MedicationResponse(
        id="550e8400-e29b-41d4-a716-446655440010",
        user_id="550e8400-e29b-41d4-a716-446655440000",
        name="Lisinopril",
        created_at=now,
    )
    assert med.name == "Lisinopril"
    assert med.user_id == "550e8400-e29b-41d4-a716-446655440000"
