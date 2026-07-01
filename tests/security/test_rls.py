"""
Security / RLS tests.

These tests require two real test users in a Supabase test environment.
Set env vars before running:

    TEST_USER_A_EMAIL=...
    TEST_USER_A_PASSWORD=...
    TEST_USER_B_EMAIL=...
    TEST_USER_B_PASSWORD=...

Run: pytest tests/security/test_rls.py -v

These tests make real HTTP calls to the running FastAPI server.
Start the server first: uvicorn app.main:app --reload
"""

import pytest
import httpx

from tests.security.conftest import USER_A, USER_B, auth_headers, login

# Minimal valid PDF for upload tests
MINIMAL_PDF = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\ntrailer\n<< /Root 1 0 R >>"


def _upload_doc(client: httpx.Client, token: str) -> str:
    """Upload a minimal PDF and return document_id."""
    resp = client.post(
        "/documents/upload",
        files={"file": ("test.pdf", MINIMAL_PDF, "application/pdf")},
        headers=auth_headers(token),
    )
    assert resp.status_code == 201, f"Upload failed: {resp.text}"
    return resp.json()["document_id"]


# ── Authentication ────────────────────────────────────────────────────────────

class TestAuthentication:
    def test_protected_endpoint_rejects_no_token(self, client):
        resp = client.get("/documents")
        assert resp.status_code == 401

    def test_protected_endpoint_rejects_bad_token(self, client):
        resp = client.get("/documents", headers={"Authorization": "Bearer not-a-real-token"})
        assert resp.status_code == 401


# ── Cross-user document access ────────────────────────────────────────────────

class TestCrossUserAccess:
    @pytest.fixture(scope="class", autouse=True)
    def setup(self, client):
        self.token_a = login(client, USER_A)
        self.token_b = login(client, USER_B)
        self.doc_id_a = _upload_doc(client, self.token_a)

    def test_user_a_can_access_own_document(self, client):
        resp = client.get(
            f"/documents/{self.doc_id_a}",
            headers=auth_headers(self.token_a),
        )
        assert resp.status_code == 200

    def test_user_b_cannot_access_user_a_document(self, client):
        resp = client.get(
            f"/documents/{self.doc_id_a}",
            headers=auth_headers(self.token_b),
        )
        assert resp.status_code == 404  # Not 200; also not leaking 403 vs 404

    def test_user_b_cannot_get_user_a_summary(self, client):
        resp = client.get(
            f"/documents/{self.doc_id_a}/summary",
            headers=auth_headers(self.token_b),
        )
        assert resp.status_code in (404, 403)

    def test_user_b_cannot_get_user_a_chat(self, client):
        resp = client.get(
            f"/documents/{self.doc_id_a}/chat",
            headers=auth_headers(self.token_b),
        )
        assert resp.status_code in (404, 403)

    def test_user_b_cannot_delete_user_a_document(self, client):
        resp = client.delete(
            f"/documents/{self.doc_id_a}",
            headers=auth_headers(self.token_b),
        )
        assert resp.status_code in (404, 403)

    def test_user_b_cannot_rate_user_a_message(self, client):
        # Try to rate a message ID that belongs to user A
        fake_message_id = "00000000-0000-0000-0000-000000000000"
        resp = client.patch(
            f"/chat/{fake_message_id}/rating",
            json={"rating": 5},
            headers=auth_headers(self.token_b),
        )
        assert resp.status_code in (404, 403)


# ── File validation ───────────────────────────────────────────────────────────

class TestFileValidation:
    @pytest.fixture(scope="class", autouse=True)
    def setup(self, client):
        self.token = login(client, USER_A)

    def test_rejects_executable(self, client):
        resp = client.post(
            "/documents/upload",
            files={"file": ("virus.exe", b"\x4d\x5a\x90\x00malware", "application/octet-stream")},
            headers=auth_headers(self.token),
        )
        assert resp.status_code == 400

    def test_rejects_javascript(self, client):
        resp = client.post(
            "/documents/upload",
            files={"file": ("script.js", b"alert('xss')", "text/javascript")},
            headers=auth_headers(self.token),
        )
        assert resp.status_code == 400

    def test_rejects_oversized_file(self, client):
        big = b"%PDF" + b"x" * (11 * 1024 * 1024)
        resp = client.post(
            "/documents/upload",
            files={"file": ("big.pdf", big, "application/pdf")},
            headers=auth_headers(self.token),
        )
        assert resp.status_code == 413

    def test_rejects_empty_file(self, client):
        resp = client.post(
            "/documents/upload",
            files={"file": ("empty.pdf", b"", "application/pdf")},
            headers=auth_headers(self.token),
        )
        assert resp.status_code == 400

    def test_accepts_valid_pdf(self, client):
        resp = client.post(
            "/documents/upload",
            files={"file": ("valid.pdf", MINIMAL_PDF, "application/pdf")},
            headers=auth_headers(self.token),
        )
        assert resp.status_code == 201
