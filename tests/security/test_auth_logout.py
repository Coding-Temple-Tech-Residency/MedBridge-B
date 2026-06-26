"""
Auth logout tests.

Requires a running FastAPI server and TEST_USER_A_* credentials in .env.
Start server: uvicorn app.main:app --reload

Run: pytest tests/security/test_auth_logout.py -v
"""

import os

import httpx
import pytest

BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")

USER_A = {
    "email": os.getenv("TEST_USER_A_EMAIL", "user_a@test.medbridge.local"),
    "password": os.getenv("TEST_USER_A_PASSWORD", "TestPassword123!"),
}


@pytest.fixture(scope="module")
def client():
    return httpx.Client(base_url=BASE_URL, timeout=30)


def _login(client: httpx.Client, creds: dict) -> str:
    resp = client.post("/auth/login", json=creds)
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["access_token"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_logout_without_token_returns_401(client):
    resp = client.post("/auth/logout")
    assert resp.status_code == 401


def test_logout_with_valid_token_returns_204(client):
    token = _login(client, USER_A)
    resp = client.post("/auth/logout", headers=_auth_headers(token))
    assert resp.status_code == 204
    assert resp.content == b""


def test_logout_with_invalid_token_returns_401(client):
    resp = client.post("/auth/logout", headers=_auth_headers("not-a-valid-jwt"))
    assert resp.status_code == 401


def test_relogin_after_logout_succeeds(client):
    token = _login(client, USER_A)
    logout_resp = client.post("/auth/logout", headers=_auth_headers(token))
    assert logout_resp.status_code == 204

    relogin_resp = client.post("/auth/login", json=USER_A)
    assert relogin_resp.status_code == 200
    assert relogin_resp.json().get("access_token")
