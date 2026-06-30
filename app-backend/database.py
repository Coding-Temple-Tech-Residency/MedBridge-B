from supabase import create_client, Client
from functools import lru_cache
from app.config import get_settings


@lru_cache
def get_supabase() -> Client:
    """
    Returns a Supabase client using the SERVICE ROLE KEY.
    This client bypasses RLS — use only in server-side service functions.
    Never expose this client or its key to the frontend.
    """
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def get_supabase_anon() -> Client:
    """
    Returns a Supabase client using the ANON KEY.
    RLS is enforced. Use for user-scoped operations when you want
    Supabase's auth layer to enforce row-level security.
    """
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_anon_key)
