from fastapi import APIRouter, Depends
from app.config import Settings, get_settings

router = APIRouter(tags=["App Config"])

@router.get("/app/config", summary="Get application configuration")
def get_app_config(settings: Settings = Depends(get_settings)):
    return {
        "app": {
            "name": "MedBridge",
            "version": "0.1.0",
            "environment": settings.app_env,
        },
        "limits": {
            "max_upload_mb": settings.max_file_size_mb,
            "allowed_file_types": ["application/pdf", "image/jpeg", "image/png"],
            "max_pages_per_document": 50,
        },
        "features": {
            "document_upload": True,
            "ocr_extraction": True,
            "ai_summarization": True,
            "document_chat": True,
            "summary_feedback": True,
            "analytics_dashboard": False,
            "appointment_prep": False,
            "reminders": False,
            "multilanguage": False,
        },
        "ai": {
            "model": settings.groq_model,
            "max_summary_tokens": 1024,
            "max_chat_tokens": settings.max_context_tokens,
        },
    }
