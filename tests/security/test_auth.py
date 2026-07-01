"""
Auth acceptance tests.

Covers register, login, duplicate user, wrong password, and missing field validation.

Requires a running FastAPI server and Supabase test credentials.
Start server: uvicorn app.main:app --reload

Run: pytest tests/security/test_auth.py -v
"""

import uuid

import httpx
import pytest

from tests.security.conftest import USER_A

MISSING_FIELD_CASES = [
    ("/auth/login", {"password": "somepassword"}),
    ("/auth/login", {"email": "user@example.com"}),
    ("/auth/register", {"password": "validpassword123"}),
    ("/auth/register", {"email": "user@example.com"}),
]


def test_duplicate_user_registration_fails(client: httpx.Client):
    resp = client.post(
        "/auth/register",
        json={"email": USER_A["email"], "password": "AnotherPassword123!"},
    )
    assert resp.status_code == 400


def test_register_success(client: httpx.Client):
    email = f"auth-test-{uuid.uuid4()}@test.com"
    resp = client.post(
        "/auth/register",
        json={"email": email, "password": "TestPassword123!"},
    )
    if resp.status_code == 429:
        pytest.skip("Supabase signup rate limit exceeded; retry later")
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["access_token"]
    assert body["user_id"]
    assert body["email"] == email


def test_login_success(client: httpx.Client):
    resp = client.post("/auth/login", json=USER_A)
    assert resp.status_code == 200, resp.text
    assert len(resp.json()["access_token"]) > 20


def test_wrong_password_fails(client: httpx.Client):
    resp = client.post(
        "/auth/login",
        json={"email": USER_A["email"], "password": "wrong-password"},
    )
    assert resp.status_code == 401


@pytest.mark.parametrize("endpoint,payload", MISSING_FIELD_CASES)
def test_missing_required_field_fails(client: httpx.Client, endpoint: str, payload: dict):
    resp = client.post(endpoint, json=payload)
    assert resp.status_code == 422
