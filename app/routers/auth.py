from fastapi import APIRouter, HTTPException, status
from supabase_auth.errors import AuthApiError
from app.schemas.auth import RegisterRequest, LoginRequest, AuthResponse
from app.database import get_supabase, get_supabase_auth
from app.services.auth_errors import map_auth_error
import logging

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger(__name__)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest):
    auth_client = get_supabase_auth()
    admin = get_supabase()
    try:
        response = auth_client.auth.sign_up({
            "email": payload.email,
            "password": payload.password,
        })
        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed. Please check your email and try again.",
            )

        try:
            admin.table("user_profiles").insert({
                "user_id": response.user.id,
                "full_name": payload.full_name,
                "preferred_language": "en",
                "explanation_level": "plain",
            }).execute()
        except Exception as e:
            logger.exception("Profile setup failed for user %s: %s", response.user.id, e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=(
                    "Account created but profile setup failed. "
                    "Contact support or retry after logging in."
                ),
            )

        if not response.session:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Account created but email confirmation is required. "
                    "Confirm your email in Supabase or disable confirmation for local dev, "
                    "then log in."
                ),
            )

        #! added this for sessions that are not granted immediately(email confirmation is pending).

        token = response.session.access_token if response.session else None

        return AuthResponse(
            access_token=token,
            user_id=response.user.id,
            email=response.user.email,
        )
    except HTTPException:
        raise
    except AuthApiError as e:
        logger.warning("Registration rejected by Supabase: %s", e)
        status_code, detail = map_auth_error(e, context="register")
        raise HTTPException(status_code=status_code, detail=detail)
    except Exception as e:
        logger.exception(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed. Please try again.",
        )


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest):
    auth_client = get_supabase_auth()
    try:
        response = auth_client.auth.sign_in_with_password({
            "email": payload.email,
            "password": payload.password,
        })
        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        if not response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=(
                    "Email not confirmed. Check your inbox or disable email "
                    "confirmation in Supabase Auth settings, then log in."
                ),
            )

        return AuthResponse(
            access_token=response.session.access_token,
            user_id=response.user.id,
            email=response.user.email,
        )
    except HTTPException:
        raise
    except AuthApiError as e:
        logger.warning("Login rejected by Supabase: %s", e)
        status_code, detail = map_auth_error(e, context="login")
        raise HTTPException(status_code=status_code, detail=detail)
    except Exception as e:
        logger.exception(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout():
    # Supabase JWTs are stateless; client discards the token.
    # Server-side sign-out invalidates the refresh token.
    auth_client = get_supabase_auth()
    try:
        auth_client.auth.sign_out()
    except Exception:
        pass  # Best-effort logout
    return
