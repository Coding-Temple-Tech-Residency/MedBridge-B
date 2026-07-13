from app.services import document_service


def test_get_recent_documents_respects_limit(monkeypatch):
    docs = [{"document_id": f"doc-{i}", "uploaded_at": f"2026-01-{i:02d}"} for i in range(10, 0, -1)]
    monkeypatch.setattr(document_service, "get_documents", lambda user_id: docs)

    recent = document_service.get_recent_documents("user-1", limit=5)

    assert len(recent) == 5
    assert recent == docs[:5]


def test_get_recent_documents_returns_empty_when_no_docs(monkeypatch):
    monkeypatch.setattr(document_service, "get_documents", lambda user_id: [])

    assert document_service.get_recent_documents("user-1", limit=5) == []
