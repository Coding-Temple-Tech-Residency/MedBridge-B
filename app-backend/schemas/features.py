"""
Pydantic schemas for Mary features:
reminders, trusted_contacts, follow_ups, providers, resources, health_scores
"""
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, date


# ── Reminders ────────────────────────────────────────────────────────────────

class ReminderCreate(BaseModel):
    health_record_id: Optional[str] = None
    reminder_type: str          # "medication" | "appointment" | "follow_up" | "general"
    title: str
    body: Optional[str] = None
    remind_at: datetime
    repeat_interval: Optional[str] = None  # "daily" | "weekly" | "monthly" | None

class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    remind_at: Optional[datetime] = None
    repeat_interval: Optional[str] = None
    completed: Optional[bool] = None

class ReminderResponse(BaseModel):
    id: str
    user_id: str
    health_record_id: Optional[str] = None
    reminder_type: str
    title: str
    body: Optional[str] = None
    remind_at: datetime
    repeat_interval: Optional[str] = None
    completed: bool
    created_at: datetime


# ── Trusted Contacts ─────────────────────────────────────────────────────────

class TrustedContactCreate(BaseModel):
    contact_email: str
    contact_name: str
    access_level: str = "read"   # "read" | "full"

class TrustedContactUpdate(BaseModel):
    contact_name: Optional[str] = None
    access_level: Optional[str] = None
    status: Optional[str] = None  # "pending" | "accepted" | "revoked"

class TrustedContactResponse(BaseModel):
    id: str
    user_id: str
    contact_email: str
    contact_name: str
    access_level: str
    status: str
    created_at: datetime


# ── Follow-ups ───────────────────────────────────────────────────────────────

class FollowUpCreate(BaseModel):
    health_record_id: str
    what: str
    when_text: Optional[str] = None
    due_date: Optional[date] = None

class FollowUpUpdate(BaseModel):
    what: Optional[str] = None
    when_text: Optional[str] = None
    due_date: Optional[date] = None
    completed: Optional[bool] = None

class FollowUpResponse(BaseModel):
    id: str
    health_record_id: str
    user_id: str
    what: str
    when_text: Optional[str] = None
    due_date: Optional[date] = None
    completed: bool
    created_at: datetime


# ── Providers ────────────────────────────────────────────────────────────────

class ProviderCreate(BaseModel):
    name: str
    specialty: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    fhir_provider_id: Optional[str] = None

class ProviderUpdate(BaseModel):
    name: Optional[str] = None
    specialty: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class ProviderResponse(BaseModel):
    id: str
    user_id: str
    name: str
    specialty: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    fhir_provider_id: Optional[str] = None
    created_at: datetime


# ── Resources (Discover) ─────────────────────────────────────────────────────

class ResourceResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    url: Optional[str] = None
    resource_type: Optional[str] = None
    tags: Optional[list] = None
    condition_codes: Optional[list] = None
    created_at: datetime


# ── Health Scores ─────────────────────────────────────────────────────────────

class HealthScoreResponse(BaseModel):
    id: str
    user_id: str
    health_record_id: Optional[str] = None
    score: float
    score_label: Optional[str] = None
    rationale: Optional[str] = None
    scored_at: datetime
    created_at: datetime
