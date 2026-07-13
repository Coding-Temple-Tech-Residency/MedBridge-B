from unittest.mock import MagicMock

from app.services.profile_service import dashboard_user, get_profile_row


def test_get_profile_row_returns_none_when_execute_returns_none():
    supabase = MagicMock()
    supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = None

    assert get_profile_row(supabase, "user-1") is None


def test_get_profile_row_returns_none_when_data_empty():
    supabase = MagicMock()
    result = MagicMock()
    result.data = None
    supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = result

    assert get_profile_row(supabase, "user-1") is None


def test_get_profile_row_returns_row_when_present():
    supabase = MagicMock()
    result = MagicMock()
    result.data = {"user_id": "user-1", "full_name": "Jane Doe"}
    supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = result

    assert get_profile_row(supabase, "user-1") == {"user_id": "user-1", "full_name": "Jane Doe"}


def test_dashboard_user_defaults_when_no_row():
    profile = dashboard_user(None, "user-1", "patient@example.com")
    assert profile.user_id == "user-1"
    assert profile.email == "patient@example.com"
    assert profile.full_name is None
    assert profile.preferred_language == "en"
    assert profile.explanation_level == "plain"


def test_dashboard_user_uses_stub_row():
    profile = dashboard_user({"user_id": "user-1"}, "user-1", "patient@example.com")
    assert profile.full_name is None
    assert profile.preferred_language == "en"


def test_dashboard_user_uses_completed_profile():
    profile = dashboard_user(
        {
            "user_id": "user-1",
            "full_name": "Jane Doe",
            "preferred_language": "es",
            "explanation_level": "detailed",
        },
        "user-1",
        "patient@example.com",
    )
    assert profile.full_name == "Jane Doe"
    assert profile.preferred_language == "es"
    assert profile.explanation_level == "detailed"
