from app.schemas.patient_profile import PatientProfileResponse


def to_profile_response(row: dict, email: str) -> PatientProfileResponse:
    return PatientProfileResponse(
        user_id=row["user_id"],
        email=email,
        full_name=row.get("full_name"),
        preferred_language=row.get("preferred_language", "en"),
        explanation_level=row.get("explanation_level", "plain"),
    )


def get_profile_row(supabase, user_id: str) -> dict | None:
    result = (
        supabase.table("user_profiles")
        .select("*")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    return result.data if result else None
