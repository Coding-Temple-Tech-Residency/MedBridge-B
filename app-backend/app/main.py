"""
MedBridge Backend — FastAPI Application

Startup:
    uvicorn app.main:app --reload

Environment:
    Copy .env.example to .env and fill in all values before running.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import time
from app.config import get_settings
from app.routers import auth, documents, features, user_settings, app_router, analytics, patient_profile, medications
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

settings = get_settings()


# 🕵️‍♂️ UPDATE YOUR PRINT STATEMENT TO THIS:
print("\n🔍 --- ENVIRONMENT AUDIT ---")
print("Allowed Origins:", settings.origins_list)
print("Supabase URL loaded:", f"'{settings.supabase_url}'")
print("---------------------------\n")

app = FastAPI(
    title="MedBridge API",
    description=(
        "Healthcare understanding tool. "
        "Helps patients understand medical documents in plain language. "
        "Does not provide medical advice, diagnosis, or treatment recommendations."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PayloadAuditMiddleware(BaseHTTPMiddleware):
    """Logs request/response sizes to help audit cellular data usage."""
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        content_length = request.headers.get("content-length")
        req_kb = int(content_length) / 1024 if content_length else 0.0
        response = await call_next(request)
        res_bytes = response.headers.get("content-length")
        res_kb = int(res_bytes) / 1024 if res_bytes else 0.0
        elapsed_ms = (time.perf_counter() - start) * 1000
        logging.getLogger(__name__).info(
            f"PAYLOAD {request.url.path} | req={req_kb:.1f}KB | res={res_kb:.1f}KB | {elapsed_ms:.0f}ms"
        )
        return response

app.add_middleware(PayloadAuditMiddleware)

app.include_router(auth.router)
app.include_router(patient_profile.router)
app.include_router(medications.router)
app.include_router(documents.router)
app.include_router(features.router)
app.include_router(user_settings.router)
app.include_router(app_router.router)
app.include_router(analytics.router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "medbridge-api"}
