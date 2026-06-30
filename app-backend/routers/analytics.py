"""
app/routers/analytics.py
------------------------
Analytics and dashboard endpoints for MedBridge.
All endpoints require authentication via Bearer token.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import os
import psycopg2
from app.analytics.scores import compute_all_scores

router = APIRouter(prefix="/analytics", tags=["analytics"])
security = HTTPBearer()

DB_URL = os.getenv("DATABASE_URL")


def get_db():
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    return conn


# ---------- Schemas ----------

class FeedbackSubmit(BaseModel):
    summary_id: str
    rating: int = Field(..., ge=1, le=5)
    feedback_text: Optional[str] = None


class EventLog(BaseModel):
    event_type: str
    event_category: str
    event_data: Optional[dict] = {}
    session_id: Optional[str] = None
    response_time_ms: Optional[int] = None
    success: Optional[bool] = True


class UserSettingsUpdate(BaseModel):
    preferred_language: Optional[str] = None
    accessibility_mode: Optional[bool] = None
    low_bandwidth_mode: Optional[bool] = None
    notification_enabled: Optional[bool] = None


# ---------- Helpers ----------

def get_user_id(credentials: HTTPAuthorizationCredentials) -> str:
    """Extract user_id from token via Supabase auth.users lookup."""
    token = credentials.credentials
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            "SELECT id FROM auth.users WHERE id::text = %s LIMIT 1",
            (token,)
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row:
            raise HTTPException(status_code=401, detail="Invalid token")
        return str(row[0])
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Auth error")


# ---------- Endpoints ----------

@router.post("/feedback", status_code=201)
async def submit_feedback(
    body: FeedbackSubmit,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Submit a feedback rating for a summary. Feeds Confidence Score KPI."""
    user_id = get_user_id(credentials)
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO summary_feedback (user_id, summary_id, rating, feedback_text, created_at)
            VALUES (%s, %s, %s, %s, NOW())
            RETURNING id
            """,
            (user_id, body.summary_id, body.rating, body.feedback_text),
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
        return {"id": str(row[0]), "status": "recorded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/events", status_code=201)
async def log_event(
    body: EventLog,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Log a user interaction event. Powers all KPI calculations."""
    user_id = get_user_id(credentials)
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO app_events
                (user_id, event_type, event_category, event_data,
                 session_id, response_time_ms, success, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
            RETURNING id
            """,
            (
                user_id,
                body.event_type,
                body.event_category,
                psycopg2.extras.Json(body.event_data),
                body.session_id,
                body.response_time_ms,
                body.success,
            ),
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
        return {"id": str(row[0]), "status": "logged"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/settings")
async def get_user_settings(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Get current user settings."""
    user_id = get_user_id(credentials)
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM user_settings WHERE user_id = %s LIMIT 1",
            (user_id,)
        )
        row = cur.fetchone()
        cols = [d[0] for d in cur.description]
        cur.close()
        conn.close()
        if not row:
            return {"user_id": user_id, "settings": {}}
        return dict(zip(cols, row))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/settings")
async def update_user_settings(
    body: UserSettingsUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Update user settings. Creates record if none exists."""
    user_id = get_user_id(credentials)
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    try:
        conn = get_db()
        cur = conn.cursor()
        set_clause = ", ".join(f"{k} = %s" for k in updates)
        values = list(updates.values()) + [user_id]
        cur.execute(
            f"""
            INSERT INTO user_settings (user_id, {', '.join(updates.keys())})
            VALUES (%s, {', '.join(['%s'] * len(updates))})
            ON CONFLICT (user_id) DO UPDATE SET {set_clause}
            RETURNING user_id
            """,
            [user_id] + list(updates.values()) + list(updates.values()),
        )
        cur.close()
        conn.close()
        return {"status": "updated", "user_id": user_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard/patient")
async def patient_dashboard(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Patient-facing KPI dashboard. Returns personal engagement scores."""
    user_id = get_user_id(credentials)
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT
                COUNT(*) FILTER (WHERE event_type = 'summary_viewed') AS summaries_viewed,
                COUNT(*) FILTER (WHERE event_type = 'question_asked') AS questions_asked,
                COUNT(*) FILTER (WHERE event_type = 'follow_up_completed') AS follow_ups_completed,
                COUNT(DISTINCT session_id) AS total_sessions,
                COUNT(DISTINCT event_category) AS features_used
            FROM app_events WHERE user_id = %s
            """,
            (user_id,)
        )
        row = cur.fetchone()
        cur.execute(
            "SELECT rating FROM summary_feedback WHERE user_id = %s",
            (user_id,)
        )
        ratings = [r[0] for r in cur.fetchall()]
        cur.execute(
            """
            SELECT
                COUNT(*) FILTER (WHERE event_type = 'document_uploaded') > 0,
                COUNT(*) FILTER (WHERE event_type = 'question_asked') > 0,
                COUNT(*) FILTER (WHERE event_type = 'reminder_set') > 0,
                COUNT(*) FILTER (WHERE event_type = 'provider_added') > 0
            FROM app_events WHERE user_id = %s
            """,
            (user_id,)
        )
        activation = cur.fetchone()
        cur.close()
        conn.close()
        scores = compute_all_scores({
            "summaries_viewed": row[0] or 0,
            "questions_asked": row[1] or 0,
            "follow_ups_completed": row[2] or 0,
            "total_sessions": max(row[3] or 1, 1),
            "features_used": row[4] or 0,
            "ratings": ratings,
            "has_uploaded": activation[0],
            "has_asked_question": activation[1],
            "has_set_reminder": activation[2],
            "has_added_provider": activation[3],
        })
        return {"user_id": user_id, "scores": scores, "generated_at": datetime.utcnow().isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard/stakeholder")
async def stakeholder_dashboard(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Aggregate metrics across all users. For Ellijah/admin view."""
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(DISTINCT user_id) FROM app_events")
        total_users = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM app_events WHERE event_type = 'document_uploaded'")
        total_uploads = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM app_events WHERE event_type = 'summary_viewed'")
        total_summaries = cur.fetchone()[0]
        cur.execute("SELECT AVG(rating) FROM summary_feedback")
        avg_rating = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM app_events WHERE success = false")
        total_errors = cur.fetchone()[0]
        cur.close()
        conn.close()
        return {
            "total_active_users": total_users,
            "total_documents_uploaded": total_uploads,
            "total_summaries_viewed": total_summaries,
            "average_feedback_rating": round(float(avg_rating or 0), 2),
            "total_errors_logged": total_errors,
            "generated_at": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard/team")
async def team_dashboard(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Team-facing metrics: feature usage breakdown and error rates."""
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT event_category, COUNT(*) as count
            FROM app_events
            GROUP BY event_category
            ORDER BY count DESC
            """
        )
        rows = cur.fetchall()
        cur.execute(
            """
            SELECT DATE(created_at) as day, COUNT(*) as events
            FROM app_events
            WHERE created_at >= NOW() - INTERVAL '7 days'
            GROUP BY day ORDER BY day
            """
        )
        daily = cur.fetchall()
        cur.close()
        conn.close()
        return {
            "feature_usage": [{"category": r[0], "count": r[1]} for r in rows],
            "daily_events_7d": [{"date": str(r[0]), "events": r[1]} for r in daily],
            "generated_at": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard/provider-readiness")
async def provider_readiness_dashboard(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Provider-readiness metrics: appointment prep and follow-up rates."""
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM app_events WHERE event_type = 'appointment_prep_viewed'")
        prep_views = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM follow_ups WHERE status = 'completed'")
        completed_followups = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM follow_ups")
        total_followups = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM reminders WHERE status = 'sent'")
        reminders_sent = cur.fetchone()[0]
        cur.close()
        conn.close()
        followup_rate = round(completed_followups / max(total_followups, 1), 4)
        return {
            "appointment_prep_views": prep_views,
            "follow_up_completion_rate": followup_rate,
            "reminders_sent": reminders_sent,
            "generated_at": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
