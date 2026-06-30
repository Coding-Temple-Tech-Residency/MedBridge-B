from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime
from app.database import get_supabase

router = APIRouter(prefix="/user-settings", tags=["user_settings"])

class UserSettingsUpdate(BaseModel):
    allow_trusted_contacts: Optional[bool] = None
    allow_mychart_integration: Optional[bool] = None
    enable_reminders: Optional[bool] = None

class UserSettingsResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    allow_trusted_contacts: bool
    allow_mychart_integration: bool
    enable_reminders: bool
    updated_at: datetime

@router.get("/", response_model=UserSettingsResponse)
async def get_user_settings(user_id: uuid.UUID, db=Depends(get_supabase)):
    result = db.table("user_settings").select("*").eq("user_id", str(user_id)).execute()
    
    if not result.data:
        result = db.table("user_settings").insert({"user_id": str(user_id)}).execute()
    
    return result.data[0]

@router.patch("/", response_model=UserSettingsResponse)
async def update_user_settings(
    user_id: uuid.UUID,
    payload: UserSettingsUpdate,
    db=Depends(get_supabase)
):
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided to update")
    
    result = db.table("user_settings").update(updates).eq("user_id", str(user_id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Settings not found")
    
    return result.data[0]
