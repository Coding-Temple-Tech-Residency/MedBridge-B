"""
Security tests for dashboard endpoint authentication and data isolation.

Requires a running FastAPI server and Supabase test credentials.
Start server: uvicorn app.main:app --reload

Run: pytest tests/security/test_dashboard_access.py -v
"""

import httpx
import pytest

from tests.security.conftest import USER_A, USER_B, auth_headers, login

DASHBOARD_URL = "/dashboard"
LIST_DOCS_URL = "/documents"


class TestDashboardAuthentication:
    def test_dashboard_rejects_no_token(self, client: httpx.Client):
        resp = client.get(DASHBOARD_URL)
        assert resp.status_code == 401

    def test_dashboard_rejects_bad_token(self, client: httpx.Client):
        resp = client.get(DASHBOARD_URL, headers={"Authorization": "Bearer not-a-real-token"})
        assert resp.status_code == 401


class TestDashboardIsolation:
    def test_dashboard_user_isolation(self, client: httpx.Client):
        token_a = login(client, USER_A)
        token_b = login(client, USER_B)

        docs_a_resp = client.get(LIST_DOCS_URL, headers=auth_headers(token_a))
        docs_b_resp = client.get(LIST_DOCS_URL, headers=auth_headers(token_b))
        dashboard_b_resp = client.get(DASHBOARD_URL, headers=auth_headers(token_b))

        assert docs_a_resp.status_code == 200
        assert docs_b_resp.status_code == 200
        assert dashboard_b_resp.status_code == 200

        user_a_document_ids = {doc["document_id"] for doc in docs_a_resp.json().get("documents", [])}
        user_b_document_ids = {doc["document_id"] for doc in docs_b_resp.json().get("documents", [])}
        dashboard_b_document_ids = {doc["document_id"] for doc in dashboard_b_resp.json().get("documents", [])}

        if not user_a_document_ids:
            pytest.skip("User A has no documents to validate isolation against.")

        assert dashboard_b_document_ids.issubset(user_b_document_ids)
        assert dashboard_b_document_ids.isdisjoint(user_a_document_ids)
