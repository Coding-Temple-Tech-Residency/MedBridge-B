from supabase import create_client, Client
from functools import lru_cache
from app.config import get_settings


@lru_cache
def get_supabase() -> Client:
    """
    Returns a Supabase client using the SERVICE ROLE KEY.
    This client bypasses RLS — use only in server-side service functions.
    Never expose this client or its key to the frontend.
    Never call .auth.sign_in / .sign_up on this client; that replaces the
    service-role session and breaks storage/DB operations (RLS errors).
    """
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


@lru_cache
def get_supabase_auth() -> Client:
    """
    Anon-key client for auth flows (login, register, JWT validation).
    Isolated from the service-role singleton so auth calls cannot downgrade it.
    """
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_anon_key)


def get_supabase_anon() -> Client:
    """
    Returns a Supabase client using the ANON KEY.
    RLS is enforced. Use for user-scoped operations when you want
    Supabase's auth layer to enforce row-level security.
    """
    return get_supabase_auth()
