from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import get_supabase
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    Validates the Supabase JWT and returns the user payload.
    Raises 401 if token is missing, expired, or invalid.

    Usage in routers:
        @router.get("/protected")
        async def protected_route(user: dict = Depends(get_current_user)):
            user_id = user["id"]
    """
    token = credentials.credentials
    supabase = get_supabase()

    try:
        response = supabase.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        return {"id": response.user.id, "email": response.user.email}
    except Exception as e:
        logger.warning(f"Auth validation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


async def get_current_user_sse(
    token: str = None,
    credentials: HTTPAuthorizationCredentials = Depends(
        HTTPBearer(auto_error=False)
    ),
) -> dict:
    """
    Auth dependency for SSE (EventSource) endpoints.

    EventSource in the browser cannot send custom headers, so the JWT
    cannot be passed as Authorization: Bearer <token>.

    This dependency accepts the token two ways (in priority order):
      1. ?token=<jwt> query parameter  (used by EventSource)
      2. Authorization: Bearer <jwt> header (used by standard fetch)

    All other endpoints use get_current_user (header only).
    Only use this dependency on streaming endpoints.
    """
    raw_token = None

    if token:
        raw_token = token
    elif credentials:
        raw_token = credentials.credentials

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    supabase = get_supabase()
    try:
        response = supabase.auth.get_user(raw_token)
        if not response or not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        return {"id": response.user.id, "email": response.user.email}
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"SSE auth validation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
