"""
Integration / acceptance tests — end-to-end workflow.

These tests call the live FastAPI server against a real Supabase test project.

Prerequisites:
  1. Server running: uvicorn app.main:app --reload
  2. .env pointing at a TEST Supabase project (not production)
  3. TEST_USER_A_EMAIL / TEST_USER_A_PASSWORD set

Run: pytest tests/integration/test_workflow.py -v --timeout=60
"""

import os
import time
import pytest
import httpx

BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")
USER = {
    "email": os.getenv("TEST_USER_A_EMAIL", "user_a@test.com"),
    "password": os.getenv("TEST_USER_A_PASSWORD", "TestPassword123!"),
}

MINIMAL_PDF = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\ntrailer\n<< /Root 1 0 R >>"

# A more realistic lab result for acceptance test 1
LAB_RESULT_TEXT = b"""
LABORATORY REPORT
Patient: Test Patient
Date: 2026-06-01

COMPLETE BLOOD COUNT
WBC: 7.2 x10^9/L [Normal: 4.5-11.0]
RBC: 4.8 x10^12/L [Normal: 4.2-5.8]
Hemoglobin: 14.2 g/dL [Normal: 13.0-17.0]
Hematocrit: 42% [Normal: 38-50]
MCV: 88 fL [Normal: 80-100]

BASIC METABOLIC PANEL
Glucose: 95 mg/dL [Normal: 70-100]
BUN: 18 mg/dL [Normal: 7-25]
Creatinine: 0.9 mg/dL [Normal: 0.6-1.2]
eGFR: >60 mL/min [Normal: >60]
Sodium: 140 mEq/L [Normal: 136-145]
Potassium: 4.1 mEq/L [Normal: 3.5-5.1]

All results within normal limits.
Follow up with your physician as scheduled.
""".strip()


@pytest.fixture(scope="module")
def client():
    return httpx.Client(base_url=BASE_URL, timeout=60)


@pytest.fixture(scope="module")
def token(client):
    resp = client.post("/auth/login", json=USER)
    assert resp.status_code == 200, f"Login failed ({resp.status_code}): {resp.text}"
    return resp.json()["access_token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def wait_for_status(client, doc_id, token_val, target="summarized", max_wait=60):
    """Poll document status until target reached or timeout."""
    for _ in range(max_wait // 3):
        resp = client.get(f"/documents/{doc_id}", headers=auth(token_val))
        status = resp.json().get("status")
        if status == target:
            return True
        if status == "failed":
            return False
        time.sleep(3)
    return False


# ── Acceptance Test 1: Upload PDF, receive summary ────────────────────────────

class TestUploadAndSummary:
    def test_upload_plain_text_lab_result(self, client, token):
        resp = client.post(
            "/documents/upload",
            files={"file": ("lab_result.txt", LAB_RESULT_TEXT, "text/plain")},
            headers=auth(token),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert "document_id" in data
        self.__class__.doc_id = data["document_id"]

    def test_document_reaches_summarized_status(self, client, token):
        reached = wait_for_status(client, self.doc_id, token, "summarized")
        assert reached, f"Document did not reach 'summarized' status"

    def test_summary_is_retrievable(self, client, token):
        resp = client.get(f"/documents/{self.doc_id}/summary", headers=auth(token))
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["summary_text"]) > 50

    def test_summary_contains_disclaimer(self, client, token):
        resp = client.get(f"/documents/{self.doc_id}/summary", headers=auth(token))
        text = resp.json()["summary_text"]
        assert "medical advice" in text.lower() or "healthcare provider" in text.lower()

    def test_summary_does_not_contain_diagnosis_language(self, client, token):
        resp = client.get(f"/documents/{self.doc_id}/summary", headers=auth(token))
        text = resp.json()["summary_text"].lower()
        # These specific phrases indicate the AI overstepped
        forbidden = ["you have been diagnosed", "you should take", "i recommend you start"]
        for phrase in forbidden:
            assert phrase not in text, f"Forbidden phrase found: '{phrase}'"


# ── Acceptance Test 2: Ask a question about the document ─────────────────────

class TestQA:
    @pytest.fixture(autouse=True)
    def require_doc(self, client, token):
        # Reuse document from previous test class if available
        if not hasattr(TestUploadAndSummary, "doc_id"):
            pytest.skip("No document available from upload test")
        self.doc_id = TestUploadAndSummary.doc_id

    def test_ask_question_returns_answer(self, client, token):
        resp = client.post(
            f"/documents/{self.doc_id}/chat",
            json={"question": "What was the glucose level in this document?"},
            headers=auth(token),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert len(data["answer"]) > 20

    def test_answer_contains_disclaimer(self, client, token):
        resp = client.post(
            f"/documents/{self.doc_id}/chat",
            json={"question": "What does eGFR mean?"},
            headers=auth(token),
        )
        text = resp.json()["answer"].lower()
        assert "medical advice" in text or "provider" in text

    def test_off_document_question_says_not_found(self, client, token):
        resp = client.post(
            f"/documents/{self.doc_id}/chat",
            json={"question": "What is my blood type?"},
            headers=auth(token),
        )
        text = resp.json()["answer"].lower()
        assert "not find" in text or "not in" in text or "provider" in text


# ── Acceptance Test 3: Dashboard shows history ───────────────────────────────

class TestDashboard:
    def test_dashboard_requires_auth(self, client):
        resp = client.get("/dashboard")
        assert resp.status_code == 401

    def test_dashboard_returns_documents(self, client, token):
        resp = client.get("/dashboard", headers=auth(token))
        assert resp.status_code == 200
        data = resp.json()
        assert "user" in data
        assert "profile_complete" in data
        assert isinstance(data["total_documents"], int)
        assert data["total_documents"] >= 0

    def test_dashboard_returns_user_data(self, client, token):
        resp = client.get("/dashboard", headers=auth(token))
        assert resp.status_code == 200
        data = resp.json()
        assert data["user"]["user_id"]
        assert data["user"]["email"] == USER["email"]

    def test_dashboard_returns_profile_complete(self, client, token):
        resp = client.get("/dashboard", headers=auth(token))
        assert resp.status_code == 200
        assert isinstance(resp.json()["profile_complete"], bool)

    def test_dashboard_returns_recent_documents(self, client, token):
        resp = client.get("/dashboard", headers=auth(token))
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["documents"]) <= 5
        if data["documents"]:
            uploaded_at_values = [doc["uploaded_at"] for doc in data["documents"]]
            assert uploaded_at_values == sorted(uploaded_at_values, reverse=True)

    def test_dashboard_returns_record_count(self, client, token):
        resp = client.get("/dashboard", headers=auth(token))
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_documents"] >= len(data["documents"])

    def test_dashboard_shows_summary_count(self, client, token):
        resp = client.get("/dashboard", headers=auth(token))
        assert resp.status_code == 200
        data = resp.json()
        assert "user" in data
        assert "profile_complete" in data
        assert isinstance(data["total_summaries"], int)
        assert data["total_summaries"] >= 0


# ── Acceptance Test 4: Unsupported file type ─────────────────────────────────

class TestUnsupportedFiles:
    def test_exe_rejected_with_clear_error(self, client, token):
        resp = client.post(
            "/documents/upload",
            files={"file": ("bad.exe", b"\x4d\x5a\x90\x00", "application/octet-stream")},
            headers=auth(token),
        )
        assert resp.status_code == 400
        assert "Unsupported" in resp.json()["detail"] or "type" in resp.json()["detail"].lower()

    def test_no_partial_data_written_on_rejection(self, client, token):
        count_before = client.get("/dashboard", headers=auth(token)).json()["total_documents"]
        client.post(
            "/documents/upload",
            files={"file": ("bad.exe", b"\x4d\x5a\x90\x00", "application/octet-stream")},
            headers=auth(token),
        )
        count_after = client.get("/dashboard", headers=auth(token)).json()["total_documents"]
        assert count_after == count_before
