"""
Document service — orchestration layer.

Column mapping (existing Supabase schema → our code):
  id             → document_id  (normalized via _normalize())
  filename       → file_name
  storage_path   → file_path
  raw_text       → extracted_text
  file_type      → mime_type
"""

import logging
import uuid
from typing import Optional

from fastapi import BackgroundTasks

from app.config import get_settings
from app.database import get_supabase
from app.services.extraction_service import extract_text, ExtractionResult
from app.services.chunking_service import chunk_document
from app.services.summary_service import generate_summary

logger = logging.getLogger(__name__)

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "text/plain",
}

MAGIC_BYTES: dict[bytes, str] = {
    b"%PDF":         "application/pdf",
    b"\x89PNG":      "image/png",
    b"\xff\xd8\xff": "image/jpeg",
}


# ── Internal helpers ──────────────────────────────────────────────────────────

def _normalize(row: dict) -> dict:
    """Map existing DB column names to the names our API uses."""
    if not row:
        return row
    if "id" in row and "document_id" not in row:
        row["document_id"] = row.pop("id")
    if row.get("filename"):
        row["file_name"] = row.pop("filename")
    elif "display_name" in row and row["display_name"]:
        row["file_name"] = row["display_name"]
    elif "file_name" not in row:
        row["file_name"] = "Unknown document"
    if "storage_path" in row:
        row["file_path"] = row.pop("storage_path")
    if "raw_text" in row:
        row["extracted_text"] = row.pop("raw_text")
    if row.get("file_type"):
        row["mime_type"] = row.pop("file_type")
    elif "mime_type" not in row:
        row["mime_type"] = row.get("source_type") or "application/octet-stream"
    if row.get("file_size_bytes") is None:
        row["file_size_bytes"] = 0
    if "created_at" in row and "uploaded_at" not in row:
        row["uploaded_at"] = row["created_at"]
    return row


def _update_status(document_id: str, status: str, error_message: Optional[str] = None) -> None:
    supabase = get_supabase()
    update = {"status": status}
    if error_message:
        update["error_message"] = error_message
    supabase.table("health_records").update(update).eq("id", document_id).execute()


# ── Validation ────────────────────────────────────────────────────────────────

def detect_mime_type(file_bytes: bytes, filename: str) -> Optional[str]:
    for magic, mime in MAGIC_BYTES.items():
        if file_bytes.startswith(magic):
            return mime
    if filename.lower().endswith(".txt"):
        return "text/plain"
    return None


def validate_upload(file_bytes: bytes, filename: str) -> tuple[bool, str, Optional[str]]:
    settings = get_settings()
    if len(file_bytes) == 0:
        return False, "File is empty.", None
    if len(file_bytes) > settings.max_file_size_bytes:
        return False, f"File exceeds the {settings.max_file_size_mb}MB limit.", None
    mime_type = detect_mime_type(file_bytes, filename)
    if mime_type not in ALLOWED_MIME_TYPES:
        return (
            False,
            "Unsupported file type. Please upload a PDF, PNG, JPEG, or plain text file.",
            None,
        )
    return True, "", mime_type


# ── Upload ────────────────────────────────────────────────────────────────────

def upload_document(
    user_id: str,
    file_bytes: bytes,
    filename: str,
    background_tasks: Optional[BackgroundTasks] = None,
) -> dict:
    supabase = get_supabase()
    settings = get_settings()

    is_valid, error_msg, mime_type = validate_upload(file_bytes, filename)
    if not is_valid:
        return {"success": False, "error": error_msg}

    document_id = str(uuid.uuid4())
    file_path = f"{user_id}/{document_id}/{filename}"

    # Store file
    try:
        supabase.storage.from_(settings.supabase_storage_bucket).upload(
            path=file_path,
            file=file_bytes,
            file_options={"content-type": mime_type},
        )
    except Exception as e:
        logger.exception(f"Storage upload failed: {e}")
        return {"success": False, "error": "File storage failed. Please try again."}

    # added to fix upload and relplace file_type mime_type to file_extension value in dictionary below. 
    file_extension = filename.split(".")[-1].lower() if "." in filename else "unknown"

    # Create health_records row using ACTUAL column names
    try:
        supabase.table("health_records").insert({
            "id": document_id,
            "user_id": user_id,
            "filename": filename,
            "storage_path": file_path,
            "file_type": file_extension,
            "file_size_bytes": len(file_bytes),
            "source_type": "upload",
            "status": "uploaded",
        }).execute()
    except Exception as e:
        logger.exception(f"health_records insert failed: {e}")
        return {"success": False, "error": "Database write failed. Please try again."}

    if background_tasks:
        background_tasks.add_task(_process_document, document_id, user_id, file_bytes, mime_type)
    else:
        _process_document(document_id, user_id, file_bytes, mime_type)

    return {"success": True, "document_id": document_id, "status": "processing"}


# ── Processing pipeline ───────────────────────────────────────────────────────

def _process_document(document_id: str, user_id: str, file_bytes: bytes, mime_type: str) -> None:
    from app.services.quality_service import check_summary_quality
    supabase = get_supabase()
    _update_status(document_id, "processing")

    # Extraction
    extraction: ExtractionResult = extract_text(file_bytes, mime_type)
    if not extraction.success:
        _update_status(document_id, "failed", extraction.error_message)
        return

    try:
        supabase.table("health_records").update({
            "raw_text": extraction.text,
            "extraction_method": extraction.method,
            "ocr_confidence": extraction.confidence,
            "status": "extracted",
        }).eq("id", document_id).execute()
    except Exception as e:
        logger.exception(f"Extraction storage failed: {e}")
        _update_status(document_id, "failed", "Failed to store extracted text.")
        return

    # Chunking
    chunks = chunk_document(extraction.text)
    if len(chunks) > 1:
        try:
            supabase.table("document_chunks").insert([
                {
                    "document_id": document_id,
                    "user_id": user_id,
                    "chunk_index": c.index,
                    "chunk_text": c.text,
                    "token_count": c.token_count,
                }
                for c in chunks
            ]).execute()
        except Exception as e:
            logger.warning(f"Chunk storage failed (non-fatal): {e}")

    # Summary
    summary_result = generate_summary(extraction.text)
    if not summary_result.success:
        _update_status(document_id, "failed", summary_result.error_message)
        return

    quality = check_summary_quality(summary_result.text)

    try:
        summary_id = str(uuid.uuid4())
        supabase.table("summaries").insert({
            "id": summary_id,
            "health_record_id": document_id,
            "user_id": user_id,
            "plain_summary": summary_result.text,
            "reading_level_score": quality.reading_level,
            "quality_passed": quality.passed,
        }).execute()
        _update_status(document_id, "summarized")
    except Exception as e:
        logger.exception(f"Summary storage failed: {e}")
        _update_status(document_id, "failed", "Failed to store summary.")


# ── Read helpers ──────────────────────────────────────────────────────────────

def get_document(document_id: str, user_id: str) -> Optional[dict]:
    supabase = get_supabase()
    result = (
        supabase.table("health_records")
        .select("*")
        .eq("id", document_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    return _normalize(result.data) if result.data else None


def get_documents(user_id: str) -> list[dict]:
    supabase = get_supabase()
    result = (
        supabase.table("health_records")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return [_normalize(row) for row in (result.data or [])]


def delete_document(document_id: str, user_id: str) -> bool:
    supabase = get_supabase()
    settings = get_settings()
    doc = get_document(document_id, user_id)
    if not doc:
        return False
    try:
        supabase.storage.from_(settings.supabase_storage_bucket).remove([doc["file_path"]])
    except Exception as e:
        logger.warning(f"Storage delete failed: {e}")
    supabase.table("health_records").delete().eq("id", document_id).eq("user_id", user_id).execute()
    return True


def get_signed_url(file_path: str) -> Optional[str]:
    supabase = get_supabase()
    settings = get_settings()
    try:
        result = supabase.storage.from_(settings.supabase_storage_bucket).create_signed_url(
            file_path, expires_in=3600
        )
        return result.get("signedURL")
    except Exception as e:
        logger.warning(f"Signed URL generation failed: {e}")
        return None
