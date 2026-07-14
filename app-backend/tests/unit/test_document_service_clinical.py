from types import SimpleNamespace

from app.services import document_service


DOCUMENT_ID = "doc-123"
USER_ID = "user-123"


class FakeQuery:
    def __init__(self, table_name: str, responses: dict):
        self.table_name = table_name
        self.responses = responses
        self.filters: list[tuple[str, str]] = []

    def select(self, _columns: str):
        return self

    def eq(self, column: str, value: str):
        self.filters.append((column, value))
        return self

    def maybe_single(self):
        return self

    def execute(self):
        return SimpleNamespace(data=self.responses.get(self.table_name))


class FakeSupabase:
    def __init__(self, responses: dict):
        self.responses = responses

    def table(self, table_name: str):
        return FakeQuery(table_name, self.responses)


def test_get_document_includes_clinical_payload(monkeypatch):
    responses = {
        "health_records": {
            "id": DOCUMENT_ID,
            "user_id": USER_ID,
            "filename": "synthea-record.json",
            "file_type": "synthea",
            "file_size_bytes": 0,
            "status": "ready",
            "created_at": "2026-07-13T12:00:00Z",
        },
        "conditions": [{"name": "Hypertension"}],
        "medications": [{"name": "Lisinopril"}],
        "lab_results": [
            {
                "name": "Cholesterol",
                "code": "2093-3",
                "code_system": "LOINC",
                "value_quantity": 163.05,
                "unit": "mg/dL",
                "observed_at": "2023-12-06T15:46:53Z",
            }
        ],
        "encounters": [],
        "follow_ups": [],
        "allergies": [],
    }

    fake_supabase = FakeSupabase(responses)
    monkeypatch.setattr(document_service, "get_supabase", lambda: fake_supabase)

    document = document_service.get_document(DOCUMENT_ID, USER_ID)

    assert document is not None
    assert document["document_id"] == DOCUMENT_ID
    assert document["conditions"][0]["name"] == "Hypertension"
    assert document["medications"][0]["name"] == "Lisinopril"
    assert document["lab_results"][0]["code"] == "2093-3"
    assert document["encounters"] == []
    assert document["follow_ups"] == []
    assert document["allergies"] == []


def test_get_document_returns_none_when_document_is_missing(monkeypatch):
    fake_supabase = FakeSupabase({"health_records": None})
    monkeypatch.setattr(document_service, "get_supabase", lambda: fake_supabase)

    assert document_service.get_document(DOCUMENT_ID, USER_ID) is None
