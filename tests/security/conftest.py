"""
Shared fixtures and helpers for security integration tests.

Requires a running FastAPI server and Supabase test credentials.
Start server: uvicorn app.main:app --reload
"""

import os
from pathlib import Path

import httpx
import pytest
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")

USER_A = {
    "email": os.getenv("TEST_USER_A_EMAIL", "user_a@test.com"),
    "password": os.getenv("TEST_USER_A_PASSWORD", "TestPassword123!"),
}
USER_B = {
    "email": os.getenv("TEST_USER_B_EMAIL", "user_b@test.com"),
    "password": os.getenv("TEST_USER_B_PASSWORD", "TestPassword456!"),
}


@pytest.fixture(scope="module")
def client():
    return httpx.Client(base_url=BASE_URL, timeout=30)


def login(client: httpx.Client, creds: dict) -> str:
    """Returns access token."""
    resp = client.post("/auth/login", json=creds)
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["access_token"]


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
