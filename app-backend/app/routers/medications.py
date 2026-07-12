"""
Medications router.

Endpoints:
  GET    /medications              — list user's medications
  GET    /medications/{id}         — get single medication
  POST   /medications              — create medication
  PATCH  /medications/{id}         — update medication
  DELETE /medications/{id}         — delete medication
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import get_supabase
from app.middleware.auth import get_current_user
from app.schemas.medications import (
    MedicationCreate,
    MedicationResponse,
    MedicationUpdate,
)

router = APIRouter(prefix="/medications", tags=["Medications"])


def _get_owned_medication(supabase, medication_id: str, user_id: str) -> dict:
    result = (
        supabase.table("medications")
        .select("*")
        .eq("id", medication_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if result is None or not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found.")
    return result.data


@router.get("", response_model=list[MedicationResponse])
async def list_medications(
    status_filter: str | None = Query(None, alias="status"),
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
    row = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "name": payload.name,
        "code": payload.code,
        "code_system": payload.code_system,
        "dose": payload.dose,
        "frequency": payload.frequency,
        "status": payload.status,
    }

    result = supabase.table("medications").insert(row).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create medication.")
    return result.data[0]


@router.patch("/{medication_id}", response_model=MedicationResponse)
async def update_medication(
    medication_id: str,
    payload: MedicationUpdate,
    user: dict = Depends(get_current_user),
):
    """Update a medication."""
    supabase = get_supabase()
    _get_owned_medication(supabase, medication_id, user["id"])

    updates = {k: v for k, v in payload.model_dump(mode="json").items() if v is not None}
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
