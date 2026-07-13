"""
Document upload / retrieve / delete authorization tests.

Proves only the document owner can upload, retrieve, and delete their documents.
Other users and unauthenticated callers are blocked.

Requires a running FastAPI server and two Supabase test users.
Set env vars before running:

    TEST_USER_A_EMAIL=...
    TEST_USER_A_PASSWORD=...
    TEST_USER_B_EMAIL=...
    TEST_USER_B_PASSWORD=...

Start server: uvicorn app.main:app --reload
Run: pytest tests/security/test_document_access.py -v
"""

import httpx

from tests.security.conftest import USER_A, USER_B, auth_headers, login

MINIMAL_PDF = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\ntrailer\n<< /Root 1 0 R >>"


def _upload_doc(client: httpx.Client, token: str) -> str:
    resp = client.post(
        "/documents/upload",
        files={"file": ("test.pdf", MINIMAL_PDF, "application/pdf")},
        headers=auth_headers(token),
    )
    assert resp.status_code == 201, f"Upload failed: {resp.text}"
    return resp.json()["document_id"]


def test_owner_can_upload_and_retrieve(client: httpx.Client):
    token = login(client, USER_A)
    doc_id = _upload_doc(client, token)

    resp = client.get(f"/documents/{doc_id}", headers=auth_headers(token))
    assert resp.status_code == 200
    assert resp.json()["document_id"] == doc_id


def test_owner_can_delete_own_document(client: httpx.Client):
    token = login(client, USER_A)
    doc_id = _upload_doc(client, token)

    del_resp = client.delete(f"/documents/{doc_id}", headers=auth_headers(token))
    assert del_resp.status_code == 204

    resp = client.get(f"/documents/{doc_id}", headers=auth_headers(token))
    assert resp.status_code == 404


def test_unauthenticated_cannot_access_documents(client: httpx.Client):
    fake_id = "00000000-0000-0000-0000-000000000001"

    upload_resp = client.post(
        "/documents/upload",
        files={"file": ("test.pdf", MINIMAL_PDF, "application/pdf")},
    )
    assert upload_resp.status_code == 401

    get_resp = client.get(f"/documents/{fake_id}")
    assert get_resp.status_code == 401

    delete_resp = client.delete(f"/documents/{fake_id}")
    assert delete_resp.status_code == 401


def test_other_user_cannot_retrieve_document(client: httpx.Client):
    token_a = login(client, USER_A)
    token_b = login(client, USER_B)
    doc_id = _upload_doc(client, token_a)

    resp = client.get(f"/documents/{doc_id}", headers=auth_headers(token_b))
    assert resp.status_code == 404


def test_other_user_cannot_delete_document(client: httpx.Client):
    token_a = login(client, USER_A)
    token_b = login(client, USER_B)
    doc_id = _upload_doc(client, token_a)

    resp = client.delete(f"/documents/{doc_id}", headers=auth_headers(token_b))
    assert resp.status_code == 404
    assert resp.json() == {"detail": "Document not found."}

    owner_resp = client.get(f"/documents/{doc_id}", headers=auth_headers(token_a))
    assert owner_resp.status_code == 200


def test_delete_nonexistent_matches_foreign_document_response(client: httpx.Client):
    token_a = login(client, USER_A)
    token_b = login(client, USER_B)
    foreign_id = _upload_doc(client, token_a)
    missing_id = "00000000-0000-0000-0000-000000000002"

    foreign_resp = client.delete(f"/documents/{foreign_id}", headers=auth_headers(token_b))
    missing_resp = client.delete(f"/documents/{missing_id}", headers=auth_headers(token_b))

    assert foreign_resp.status_code == 404
    assert missing_resp.status_code == 404
    assert foreign_resp.json() == missing_resp.json()

    owner_resp = client.get(f"/documents/{foreign_id}", headers=auth_headers(token_a))
    assert owner_resp.status_code == 200
