from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import JSONResponse, StreamingResponse
from app.schemas.documents import (
    UploadResponse, DocumentResponse, DocumentListResponse,
    SummaryResponse, ChatRequest, ChatResponse, FeedbackRequest,
    UnderstandingRequest, UnderstandingResponse,
    PrepResponse, DashboardResponse,
    KpiReadingLevel, KpiQuality, KpiSatisfaction,
    ErrorEnvelope, groq_timeout_error, groq_unavailable_error, document_not_found_error,
)
from app.middleware.auth import get_current_user, get_current_user_sse
# schemas imported above
from app.services import document_service, chat_service
from app.services.profile_service import get_profile_row, dashboard_user
from app.database import get_supabase
import logging
import uuid
from datetime import datetime, timezone

router = APIRouter(tags=["Documents"])
logger = logging.getLogger(__name__)
RECENT_DOCUMENTS_LIMIT = 5


@router.post("/documents/upload", response_model=UploadResponse, status_code=201)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    file_bytes = await file.read()
    result = document_service.upload_document(
        user_id=user["id"],
        file_bytes=file_bytes,
        filename=file.filename or "upload",
        background_tasks=background_tasks,
    )
    if not result["success"]:
        error = result["error"]
        if "exceeds" in error or "size" in error.lower():
            raise HTTPException(status_code=413, detail=error)
        raise HTTPException(status_code=400, detail=error)
    return UploadResponse(document_id=result["document_id"], status=result["status"])


@router.get("/documents", response_model=DocumentListResponse)
async def list_documents(user: dict = Depends(get_current_user)):
    docs = document_service.get_documents(user["id"])
    return DocumentListResponse(documents=docs, total=len(docs))


@router.get("/documents/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: str, user: dict = Depends(get_current_user)):
    doc = document_service.get_document(document_id, user["id"])
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc


@router.delete("/documents/{document_id}", status_code=204)
async def delete_document(document_id: str, user: dict = Depends(get_current_user)):
    success = document_service.delete_document(document_id, user["id"])
    if not success:
        raise HTTPException(status_code=404, detail="Document not found.")


@router.get("/documents/{document_id}/summary", response_model=SummaryResponse)
async def get_summary(document_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    doc = document_service.get_document(document_id, user["id"])
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Use actual DB column: health_record_id
    result = (
        supabase.table("summaries")
        .select("*")
        .eq("health_record_id", document_id)
        .eq("user_id", user["id"])
        .maybe_single()
        .execute()
    )
    # added safety check to prevent server from crashing if no summary is present/available. 
    if not result or not result.data:
        current_status = doc.get("status", "unknown")
        if current_status in ("uploaded", "processing", "extracted"):
            raise HTTPException(status_code=202, detail=f"Summary still generating. Status: {current_status}")
        if current_status == "failed":
            detail = doc.get("error_message") or "Summary generation failed."
            raise HTTPException(
                status_code=502,
                detail=f"{detail} Use POST /documents/{document_id}/summary to retry.",
            )
        raise HTTPException(status_code=404, detail="Summary not found.")

    row = result.data
    return SummaryResponse(
        summary_id=row["id"],
        document_id=row["health_record_id"],
        summary_text=row["plain_summary"],
        created_at=row["created_at"],
    )


@router.post("/documents/{document_id}/summary", response_model=SummaryResponse, status_code=201)
async def regenerate_summary(
    document_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    doc = document_service.get_document(document_id, user["id"])
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    extracted_text = doc.get("extracted_text") or doc.get("raw_text", "")
    if not extracted_text:
        raise HTTPException(status_code=400, detail="Document text not yet extracted.")

    from app.services.summary_service import generate_summary
    from app.services.quality_service import check_summary_quality
    result = generate_summary(extracted_text)
    if not result.success:
        raise HTTPException(status_code=500, detail=result.error_message)

    quality = check_summary_quality(result.text)
    summary_id = str(uuid.uuid4())
    supabase.table("summaries").upsert({
        "id": summary_id,
        "health_record_id": document_id,
        "user_id": user["id"],
        "plain_summary": result.text,
        "reading_level_score": quality.reading_level,
        "quality_passed": quality.passed,
    }).execute()

    return SummaryResponse(
        summary_id=summary_id,
        document_id=document_id,
        summary_text=result.text,
        created_at=datetime.now(timezone.utc),
    )


@router.post("/summaries/{summary_id}/understanding", response_model=UnderstandingResponse, status_code=201)
async def rate_understanding(
    summary_id: str,
    payload: UnderstandingRequest,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    existing = (
        supabase.table("summaries")
        .select("id")
        .eq("id", summary_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Summary not found.")

    feedback_id = str(uuid.uuid4())
    supabase.table("summary_feedback").insert({
        "id": feedback_id,
        "user_id": user["id"],
        "summary_id": summary_id,
        "understanding_rating": payload.rating,
    }).execute()

    return UnderstandingResponse(
        id=feedback_id,
        summary_id=summary_id,
        rating=payload.rating,
        created_at=datetime.now(timezone.utc),
    )


@router.post("/documents/{document_id}/chat", response_model=ChatResponse, status_code=201)
async def ask_question(
    document_id: str,
    payload: ChatRequest,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    doc = document_service.get_document(document_id, user["id"])
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if doc.get("status") != "summarized":
        raise HTTPException(status_code=400, detail=f"Document still processing. Status: {doc.get('status')}")

    extracted_text = doc.get("extracted_text", "")
    chunks_result = (
        supabase.table("document_chunks")
        .select("chunk_text, chunk_index")
        .eq("document_id", document_id)
        .order("chunk_index")
        .execute()
    )
    chunk_texts = [r["chunk_text"] for r in (chunks_result.data or [])]

    try:
        result = chat_service.answer_question(
            question=payload.question,
            extracted_text=extracted_text,
            chunk_texts=chunk_texts if chunk_texts else None,
        )
    except Exception:
        logger.exception("Groq call failed in chat endpoint")
        return JSONResponse(status_code=503, content=groq_timeout_error().model_dump())

    if not result.success:
        return JSONResponse(status_code=503, content=groq_unavailable_error().model_dump())

    message_id = str(uuid.uuid4())
    # Store user message
    supabase.table("chat_messages").insert({
        "id": message_id,
        "health_record_id": document_id,
        "user_id": user["id"],
        "role": "user",
        "content": payload.question,
    }).execute()
    # Store assistant response
    supabase.table("chat_messages").insert({
        "id": str(uuid.uuid4()),
        "health_record_id": document_id,
        "user_id": user["id"],
        "role": "assistant",
        "content": result.answer,
    }).execute()

    return ChatResponse(
        message_id=message_id,
        document_id=document_id,
        question=payload.question,
        answer=result.answer,
        created_at=datetime.now(timezone.utc),
    )


@router.get("/documents/{document_id}/chat", response_model=list[dict])
async def get_chat_history(document_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    doc = document_service.get_document(document_id, user["id"])
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    result = (
        supabase.table("chat_messages")
        .select("*")
        .eq("health_record_id", document_id)
        .eq("user_id", user["id"])
        .order("created_at")
        .execute()
    )
    return result.data or []


@router.get("/documents/{document_id}/chat/stream")
async def stream_chat(
    document_id: str,
    message: str,
    token: str = None,
    user: dict = Depends(get_current_user_sse),
):
    """
    Server-Sent Events streaming chat endpoint.
    Returns AI response as a stream of text chunks.
    Frontend connects with EventSource — see streaming_patch.py for JS snippet.
    """
    supabase = get_supabase()
    doc = document_service.get_document(document_id, user["id"])
    if not doc:
        async def not_found():
            yield f"data: [ERROR] Document not found.\n\n"
        return StreamingResponse(not_found(), media_type="text/event-stream")

    if doc.get("status") != "summarized":
        async def not_ready():
            yield f"data: [ERROR] Document still processing. Please wait.\n\n"
        return StreamingResponse(not_ready(), media_type="text/event-stream")

    extracted_text = doc.get("extracted_text", "")
    chunks_result = (
        supabase.table("document_chunks")
        .select("chunk_text, chunk_index")
        .eq("document_id", document_id)
        .order("chunk_index")
        .execute()
    )
    chunk_texts = [r["chunk_text"] for r in (chunks_result.data or [])]

    from app.services.chat_service import stream_question

    async def event_stream():
        full_response = []
        try:
            async for chunk in stream_question(
                question=message,
                extracted_text=extracted_text,
                chunk_texts=chunk_texts if chunk_texts else None,
            ):
                safe_chunk = chunk.replace("\n", " ")
                full_response.append(chunk)
                yield f"data: {safe_chunk}\n\n"
            yield "data: [DONE]\n\n"

            # Persist the full response to chat_messages after stream completes
            try:
                supabase.table("chat_messages").insert({
                    "id": str(uuid.uuid4()),
                    "health_record_id": document_id,
                    "user_id": user["id"],
                    "role": "user",
                    "content": message,
                }).execute()
                supabase.table("chat_messages").insert({
                    "id": str(uuid.uuid4()),
                    "health_record_id": document_id,
                    "user_id": user["id"],
                    "role": "assistant",
                    "content": "".join(full_response),
                }).execute()
            except Exception:
                logger.warning("Failed to persist streamed chat message — non-fatal")

        except Exception:
            logger.exception("Streaming error")
            yield "data: [ERROR] Something went wrong. Please try again.\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.patch("/chat/{message_id}/rating", status_code=200)
async def rate_message(
    message_id: str,
    payload: FeedbackRequest,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    existing = (
        supabase.table("chat_messages")
        .select("id")
        .eq("id", message_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Message not found.")

    supabase.table("chat_messages").update({"feedback_rating": payload.rating}).eq("id", message_id).execute()
    return {"message_id": message_id, "rating": payload.rating}


@router.post("/documents/{document_id}/prep", response_model=PrepResponse, status_code=201)
async def get_appointment_prep(document_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    doc = document_service.get_document(document_id, user["id"])
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if doc.get("status") != "summarized":
        raise HTTPException(status_code=400, detail="Document still processing.")

    extracted_text = doc.get("extracted_text", "")
    chunks_result = (
        supabase.table("document_chunks")
        .select("chunk_text, chunk_index")
        .eq("document_id", document_id)
        .order("chunk_index")
        .execute()
    )
    chunk_texts = [r["chunk_text"] for r in (chunks_result.data or [])]

    from app.services.prep_service import generate_prep_questions
    result = generate_prep_questions(extracted_text=extracted_text, chunk_texts=chunk_texts if chunk_texts else None)
    if not result.success:
        raise HTTPException(status_code=500, detail=result.error_message)

    prep_id = str(uuid.uuid4())
    try:
        supabase.table("appointment_prep").insert({
            "prep_id": prep_id,
            "document_id": document_id,
            "user_id": user["id"],
            "questions": result.questions,
        }).execute()
    except Exception as e:
        logger.warning(f"Prep storage failed (non-fatal): {e}")

    return PrepResponse(
        prep_id=prep_id,
        document_id=document_id,
        questions=result.questions,
        created_at=datetime.now(timezone.utc),
    )


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    uid = user["id"]
    all_docs = document_service.get_documents(uid)
    recent_docs = document_service.get_recent_documents(uid, RECENT_DOCUMENTS_LIMIT)
    profile_row = get_profile_row(supabase, uid)
    profile_complete = bool(profile_row and profile_row.get("full_name"))
    user_profile = dashboard_user(profile_row, uid, user["email"])

    summary_count = (
        supabase.table("summaries").select("id", count="exact").eq("user_id", uid).execute()
    )
    questions_asked = 0
    try:
        chat_count = (
            supabase.table("chat_messages").select("id", count="exact")
            .eq("user_id", uid).eq("role", "user").execute()
        )
        questions_asked = chat_count.count or 0
    except Exception:
        logger.warning("chat_messages query failed — non-fatal (MVP schema)")

    # ── KPI views (global — not filtered by user, admin-level analytics) ──
    reading_level_kpi = None
    quality_kpi = None
    satisfaction_kpi = None
    avg_seconds = None

    try:
        rl = supabase.table("kpi_reading_level").select("*").execute()
        if rl.data:
            r = rl.data[0]
            reading_level_kpi = KpiReadingLevel(
                total_summaries=r.get("total_summaries") or 0,
                avg_reading_level=r.get("avg_reading_level"),
                at_or_below_grade_6=r.get("at_or_below_grade_6") or 0,
                pct_on_target=r.get("pct_on_target"),
            )
    except Exception:
        logger.warning("kpi_reading_level query failed — non-fatal")

    try:
        q = supabase.table("kpi_quality").select("*").limit(1).execute()
        if q.data:
            r = q.data[0]
            quality_kpi = KpiQuality(
                total_summaries=r.get("total_summaries") or 0,
                passed=r.get("passed") or 0,
                failed=r.get("failed") or 0,
                pass_rate_pct=r.get("pass_rate_pct"),
            )
    except Exception:
        logger.warning("kpi_quality query failed — non-fatal")

    try:
        s = supabase.table("kpi_ai_satisfaction").select("*").limit(1).execute()
        if s.data:
            r = s.data[0]
            satisfaction_kpi = KpiSatisfaction(
                rated_messages=r.get("rated_messages") or 0,
                avg_rating=r.get("avg_rating"),
                positive=r.get("positive") or 0,
                negative=r.get("negative") or 0,
            )
    except Exception:
        logger.warning("kpi_ai_satisfaction query failed — non-fatal")

    try:
        pt = supabase.table("kpi_processing_time").select("avg_seconds_to_summary").limit(1).execute()
        if pt.data:
            avg_seconds = pt.data[0].get("avg_seconds_to_summary")
    except Exception:
        logger.warning("kpi_processing_time query failed — non-fatal")

    return DashboardResponse(
        user=user_profile,
        profile_complete=profile_complete,
        documents=recent_docs,
        total_documents=len(all_docs),
        total_summaries=summary_count.count or 0,
        total_questions_asked=questions_asked,
        avg_seconds_to_summary=avg_seconds,
        reading_level=reading_level_kpi,
        quality=quality_kpi,
        satisfaction=satisfaction_kpi,
    )
