"""Pydantic schemas for the medications API."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

MedicationStatus = Literal["active", "stopped", "on-hold", "unknown"]


class MedicationCreate(BaseModel):
    name: str = Field(..., min_length=1)
    code: Optional[str] = None
    code_system: Optional[str] = None
    dose: Optional[str] = None
    frequency: Optional[str] = None
    status: MedicationStatus = "active"


class MedicationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    code: Optional[str] = None
    code_system: Optional[str] = None
    dose: Optional[str] = None
    frequency: Optional[str] = None
    status: Optional[MedicationStatus] = None


class MedicationResponse(BaseModel):
    id: str
    user_id: str
    name: str
    code: Optional[str] = None
    code_system: Optional[str] = None
    dose: Optional[str] = None
    frequency: Optional[str] = None
    status: Optional[str] = None
    created_at: datetime
