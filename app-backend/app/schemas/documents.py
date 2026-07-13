from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum
from app.schemas.patient_profile import PatientProfileResponse


class DocumentStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    EXTRACTED = "extracted"
    SUMMARIZED = "summarized"
    READY = "ready"
    FAILED = "failed"


class DocumentResponse(BaseModel):
    document_id: str
    user_id: str
    file_name: str
    mime_type: str
    file_size_bytes: int
    status: DocumentStatus
    uploaded_at: datetime
    error_message: Optional[str] = None


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int


class UploadResponse(BaseModel):
    document_id: str
    status: DocumentStatus
    message: str = "Document uploaded successfully. Processing has started."


class SummaryResponse(BaseModel):
    summary_id: str
    document_id: str
    summary_text: str
    reading_level_target: str = "4th grade"
    created_at: datetime
    disclaimer: str = (
        "MedBridge explains information from your uploaded document in plain language. "
        "It does not provide medical advice, diagnosis, or treatment recommendations. "
        "Please contact a healthcare provider for medical decisions."
    )


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    message_id: str
    document_id: str
    question: str
    answer: str
    created_at: datetime
    disclaimer: str = (
        "This answer is based only on your uploaded document. "
        "MedBridge does not provide medical advice. "
        "Please consult a healthcare provider for medical decisions."
    )


class FeedbackRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5)


class ReminderCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    due_date: Optional[datetime] = None
    notes: Optional[str] = None


class ReminderResponse(BaseModel):
    reminder_id: str
    user_id: str
    document_id: Optional[str] = None
    title: str
    due_date: Optional[datetime]
    notes: Optional[str]
    created_at: datetime


# ── Understanding rating ──────────────────────────────────────────────────────

class UnderstandingRating(str):
    YES = "yes"
    SOMEWHAT = "somewhat"
    NO = "no"


class UnderstandingRequest(BaseModel):
    rating: str = Field(..., pattern="^(yes|somewhat|no)$")


class UnderstandingResponse(BaseModel):
    id: str
    summary_id: str
    rating: str
    created_at: datetime


# ── Appointment prep ──────────────────────────────────────────────────────────

class PrepResponse(BaseModel):
    prep_id: str
    document_id: str
    questions: list[str]
    created_at: datetime
    note: str = (
        "These questions are generated from your document to help you "
        "prepare for a conversation with your healthcare provider. "
        "They are not medical advice."
    )


# ── Dashboard (extended) ──────────────────────────────────────────────────────

class KpiReadingLevel(BaseModel):
    total_summaries: int = 0
    avg_reading_level: Optional[float] = None
    at_or_below_grade_6: int = 0
    pct_on_target: Optional[float] = None

class KpiQuality(BaseModel):
    total_summaries: int = 0
    passed: int = 0
    failed: int = 0
    pass_rate_pct: Optional[float] = None

class KpiSatisfaction(BaseModel):
    rated_messages: int = 0
    avg_rating: Optional[float] = None
    positive: int = 0
    negative: int = 0

class DashboardResponse(BaseModel):
    user: PatientProfileResponse
    profile_complete: bool
    documents: list[DocumentResponse]
    total_documents: int
    total_summaries: int
    total_questions_asked: int
    avg_seconds_to_summary: Optional[float] = None
    reading_level: Optional[KpiReadingLevel] = None
    quality: Optional[KpiQuality] = None
    satisfaction: Optional[KpiSatisfaction] = None

# ── Digital Equity: Structured Error Envelope ────────────────────────────────
from typing import Optional, Literal

class ErrorEnvelope(BaseModel):
    """Standard error response returned by all MedBridge API endpoints."""
    success: Literal[False] = False
    error_code: str
    message: str
    retry_after: Optional[int] = None


def groq_timeout_error() -> ErrorEnvelope:
    return ErrorEnvelope(
        error_code="GROQ_TIMEOUT",
        message="The AI is taking longer than usual. Please try again in a moment.",
        retry_after=5,
    )

def groq_unavailable_error() -> ErrorEnvelope:
    return ErrorEnvelope(
        error_code="GROQ_UNAVAILABLE",
        message="The AI service is temporarily unavailable. Please try again shortly.",
        retry_after=10,
    )

def document_not_found_error() -> ErrorEnvelope:
    return ErrorEnvelope(
        error_code="DOC_NOT_FOUND",
        message="We could not find that document. It may have been removed.",
    )

def extraction_failed_error() -> ErrorEnvelope:
    return ErrorEnvelope(
        error_code="EXTRACTION_FAILED",
        message="We had trouble reading that file. Try uploading a clearer photo or a different file format.",
    )

def unauthorized_error() -> ErrorEnvelope:
    return ErrorEnvelope(
        error_code="UNAUTHORIZED",
        message="Your session has expired. Please sign in again.",
    )
# ── End Digital Equity patch ─────────────────────────────────────────────────