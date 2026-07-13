"""Pydantic schemas for the medications API."""

from datetime import date, datetime
from typing import Literal, Optional, Self

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, computed_field, model_validator

MedicationStatus = Literal["active", "stopped", "on-hold", "unknown"]

_DB_MUTABLE_FIELDS = (
    "name",
    "code",
    "code_system",
    "dose",
    "frequency",
    "route",
    "status",
    "start_date",
    "end_date",
    "prescribing_provider",
    "reason",
    "notes",
)


def _validate_date_range(start_date: Optional[date], end_date: Optional[date]) -> None:
    if start_date is not None and end_date is not None and end_date < start_date:
        raise ValueError("end_date must be on or after start_date")


class _MedicationInputBase(BaseModel):
    code: Optional[str] = None
    code_system: Optional[str] = None
    dose: Optional[str] = Field(None, validation_alias=AliasChoices("dosage", "dose"))
    frequency: Optional[str] = None
    route: Optional[str] = None
    status: Optional[MedicationStatus] = None
    is_active: Optional[bool] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    prescribing_provider: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="after")
    def validate_dates(self) -> Self:
        _validate_date_range(self.start_date, self.end_date)
        return self


class MedicationCreate(_MedicationInputBase):
    name: str = Field(..., min_length=1)

    @model_validator(mode="after")
    def resolve_status(self) -> Self:
        if "status" in self.model_fields_set and self.status is not None:
            return self
        if self.is_active is not None:
            object.__setattr__(self, "status", "active" if self.is_active else "stopped")
        else:
            object.__setattr__(self, "status", "active")
        return self

    def to_db_row(self, *, medication_id: str, user_id: str) -> dict:
        return {
            "id": medication_id,
            "user_id": user_id,
            "name": self.name,
            "code": self.code,
            "code_system": self.code_system,
            "dose": self.dose,
            "frequency": self.frequency,
            "route": self.route,
            "status": self.status,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "prescribing_provider": self.prescribing_provider,
            "reason": self.reason,
            "notes": self.notes,
        }


class MedicationUpdate(_MedicationInputBase):
    name: Optional[str] = Field(None, min_length=1)

    @model_validator(mode="after")
    def resolve_status_from_is_active(self) -> Self:
        if "status" not in self.model_fields_set and "is_active" in self.model_fields_set:
            if self.is_active is None:
                object.__setattr__(self, "status", None)
            else:
                object.__setattr__(self, "status", "active" if self.is_active else "stopped")
        return self

    def to_db_updates(self) -> dict:
        fields_to_apply = set(self.model_fields_set) - {"is_active"}
        if "is_active" in self.model_fields_set:
            fields_to_apply.add("status")

        updates: dict = {}
        for field in _DB_MUTABLE_FIELDS:
            if field not in fields_to_apply:
                continue
            value = getattr(self, field)
            if field in ("start_date", "end_date") and value is not None:
                updates[field] = value.isoformat()
            else:
                updates[field] = value
        return updates


class MedicationResponse(BaseModel):
    id: str
    user_id: str
    name: str
    code: Optional[str] = None
    code_system: Optional[str] = None
    dose: Optional[str] = None
    frequency: Optional[str] = None
    route: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    prescribing_provider: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def dosage(self) -> Optional[str]:
        return self.dose

    @computed_field
    @property
    def is_active(self) -> bool:
        return self.status == "active"
