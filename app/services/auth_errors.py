from typing import Literal

from supabase_auth.errors import AuthApiError


def map_auth_error(
    error: AuthApiError,
    *,
    context: Literal["register", "login"],
) -> tuple[int, str]:
    """Map Supabase Auth errors to HTTP status codes and actionable messages."""
    message = str(error).lower()

    if "rate limit" in message:
        return (
            429,
            "Too many auth emails sent. Wait ~1 hour, create the user in "
            "Supabase Dashboard, or disable email confirmation for your test project.",
        )

    if "already registered" in message or "user already" in message:
        return (
            409,
            "An account with this email already exists. Try logging in instead.",
        )

    if "is invalid" in message:
        return (
            400,
            "This email address is not accepted. Use a real inbox or create "
            "the user in Supabase Dashboard.",
        )

    if context == "login":
        if "email not confirmed" in message:
            return (
                401,
                "Email not confirmed. Check your inbox or disable email "
                "confirmation in Supabase Auth settings.",
            )
        if "invalid login credentials" in message:
            return 401, "Invalid email or password."

    default_status = 400 if context == "register" else 401
    return default_status, str(error)
