"""
Auth logout tests.

Requires a running FastAPI server and TEST_USER_A_* credentials in .env.
Start server: uvicorn app.main:app --reload

Run: pytest tests/security/test_auth_logout.py -v
"""

import httpx

from tests.security.conftest import USER_A, auth_headers, login


def test_logout_without_token_returns_401(client: httpx.Client):
    resp = client.post("/auth/logout")
    assert resp.status_code == 401


def test_logout_with_valid_token_returns_204(client: httpx.Client):
    token = login(client, USER_A)
    resp = client.post("/auth/logout", headers=auth_headers(token))
    assert resp.status_code == 204
    assert resp.content == b""


def test_logout_with_invalid_token_returns_401(client: httpx.Client):
    resp = client.post("/auth/logout", headers=auth_headers("not-a-valid-jwt"))
    assert resp.status_code == 401


def test_relogin_after_logout_succeeds(client: httpx.Client):
    token = login(client, USER_A)
    logout_resp = client.post("/auth/logout", headers=auth_headers(token))
    assert logout_resp.status_code == 204

    relogin_resp = client.post("/auth/login", json=USER_A)
    assert relogin_resp.status_code == 200
    assert relogin_resp.json().get("access_token")
