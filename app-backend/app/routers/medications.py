"""
Medications router.

Endpoints:
  GET    /medications              — list user's medications
  GET    /medications/{id}         — get single medication
  POST   /medications              — create medication
  PUT    /medications/{id}         — replace medication
  PATCH  /medications/{id}         — partial update medication
  DELETE /medications/{id}         — delete medication
"""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from postgrest.exceptions import APIError

from app.database import get_supabase
from app.middleware.auth import get_current_user
from app.schemas.medications import (
    MedicationCreate,
    MedicationResponse,
    MedicationUpdate,
)

router = APIRouter(prefix="/medications", tags=["Medications"])
logger = logging.getLogger(__name__)


def _get_owned_medication(supabase, medication_id: str, user_id: str) -> dict:
    try:
        result = (
            supabase.table("medications")
            .select("*")
            .eq("id", medication_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
    except (APIError, Exception) as e:
        logger.exception("Failed to retrieve medication from database: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve medication.",
        ) from e

    if result is None or not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found.")
    return result.data


@router.get("", response_model=list[MedicationResponse])
async def list_medications(
    status_filter: str | None = Query(None, alias="status"),
    is_active: bool | None = Query(None),
    user: dict = Depends(get_current_user),
):
    """Return all medications for the authenticated user."""
    supabase = get_supabase()
    query = (
        supabase.table("medications")
        .select("*")
        .eq("user_id", user["id"])
    )
    if status_filter:
        query = query.eq("status", status_filter)
    elif is_active is not None:
        query = query.eq("status", "active" if is_active else "stopped")

    result = query.order("name").execute()
    return result.data or []


@router.get("/{medication_id}", response_model=MedicationResponse)
async def get_medication(
    medication_id: str,
    user: dict = Depends(get_current_user),
):
    """Retrieve a single medication by ID."""
    supabase = get_supabase()
    return _get_owned_medication(supabase, medication_id, user["id"])


@router.post("", response_model=MedicationResponse, status_code=status.HTTP_201_CREATED)
async def create_medication(
    payload: MedicationCreate,
    user: dict = Depends(get_current_user),
):
    """Create a medication for the authenticated user."""
    supabase = get_supabase()
    row = payload.to_db_row(medication_id=str(uuid.uuid4()), user_id=user["id"])

    result = supabase.table("medications").insert(row).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create medication.")
    return result.data[0]


@router.put("/{medication_id}", response_model=MedicationResponse)
async def replace_medication(
    medication_id: str,
    payload: MedicationCreate,
    user: dict = Depends(get_current_user),
):
    """Replace a medication (full update). Only name is required."""
    supabase = get_supabase()
    _get_owned_medication(supabase, medication_id, user["id"])

    row = payload.to_db_row(medication_id=medication_id, user_id=user["id"])
    del row["id"]
    del row["user_id"]

    result = (
        supabase.table("medications")
        .update(row)
        .eq("id", medication_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update medication.")
    return result.data[0]


@router.patch("/{medication_id}", response_model=MedicationResponse)
async def update_medication(
    medication_id: str,
    payload: MedicationUpdate,
    user: dict = Depends(get_current_user),
):
    """Partially update a medication."""
    supabase = get_supabase()
    _get_owned_medication(supabase, medication_id, user["id"])

    updates = payload.to_db_updates()
    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields provided to update.")

    result = (
        supabase.table("medications")
        .update(updates)
        .eq("id", medication_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update medication.")
    return result.data[0]


@router.delete("/{medication_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_medication(
    medication_id: str,
    user: dict = Depends(get_current_user),
):
    """Delete a medication."""
    supabase = get_supabase()
    _get_owned_medication(supabase, medication_id, user["id"])
    supabase.table("medications").delete().eq("id", medication_id).eq("user_id", user["id"]).execute()
