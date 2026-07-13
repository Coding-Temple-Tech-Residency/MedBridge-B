"""
Security tests for the medications API.

Requires a running FastAPI server and Supabase test credentials.
Start server: uvicorn app.main:app --reload

Run: pytest tests/security/test_clinical.py -v
"""

import httpx
import pytest

from tests.security.conftest import USER_A, USER_B, auth_headers, login

MEDICATIONS_URL = "/medications"

VALID_MEDICATION = {
    "name": "Lisinopril",
    "dose": "10 mg",
    "frequency": "once daily",
    "status": "active",
    "route": "oral",
    "start_date": "2026-01-01",
    "end_date": "2026-12-31",
    "prescribing_provider": "Dr. Smith",
    "reason": "Hypertension",
    "notes": "Take with food",
}


class TestMedicationsAuthentication:
    def test_list_rejects_no_token(self, client: httpx.Client):
        resp = client.get(MEDICATIONS_URL)
        assert resp.status_code == 401

    def test_post_rejects_no_token(self, client: httpx.Client):
        resp = client.post(MEDICATIONS_URL, json=VALID_MEDICATION)
        assert resp.status_code == 401

    def test_get_by_id_rejects_no_token(self, client: httpx.Client):
        resp = client.get(f"{MEDICATIONS_URL}/00000000-0000-0000-0000-000000000001")
        assert resp.status_code == 401

    def test_patch_rejects_no_token(self, client: httpx.Client):
        resp = client.patch(
            f"{MEDICATIONS_URL}/00000000-0000-0000-0000-000000000001",
            json={"dose": "20 mg"},
        )
        assert resp.status_code == 401

    def test_put_rejects_no_token(self, client: httpx.Client):
        resp = client.put(
            f"{MEDICATIONS_URL}/00000000-0000-0000-0000-000000000001",
            json={"name": "Lisinopril"},
        )
        assert resp.status_code == 401

    def test_delete_rejects_no_token(self, client: httpx.Client):
        resp = client.delete(f"{MEDICATIONS_URL}/00000000-0000-0000-0000-000000000001")
        assert resp.status_code == 401


class TestMedicationsValidation:
    def test_post_missing_name_returns_422(self, client: httpx.Client):
        token = login(client, USER_A)
        resp = client.post(MEDICATIONS_URL, json={}, headers=auth_headers(token))
        assert resp.status_code == 422

    def test_post_with_only_name_returns_201(self, client: httpx.Client):
        token = login(client, USER_A)
        resp = client.post(
            MEDICATIONS_URL,
            json={"name": "Name Only Test"},
            headers=auth_headers(token),
        )
        assert resp.status_code == 201, resp.text
        body = resp.json()
        assert body["name"] == "Name Only Test"
        assert body["status"] == "active"
        assert body["is_active"] is True
        client.delete(f"{MEDICATIONS_URL}/{body['id']}", headers=auth_headers(token))

    def test_post_dosage_alias_works(self, client: httpx.Client):
        token = login(client, USER_A)
        resp = client.post(
            MEDICATIONS_URL,
            json={"name": "Dosage Alias Test", "dosage": "5 mg"},
            headers=auth_headers(token),
        )
        assert resp.status_code == 201, resp.text
        body = resp.json()
        assert body["dose"] == "5 mg"
        assert body["dosage"] == "5 mg"
        client.delete(f"{MEDICATIONS_URL}/{body['id']}", headers=auth_headers(token))

    def test_post_is_active_false_sets_stopped(self, client: httpx.Client):
        token = login(client, USER_A)
        resp = client.post(
            MEDICATIONS_URL,
            json={"name": "Inactive Test", "is_active": False},
            headers=auth_headers(token),
        )
        assert resp.status_code == 201, resp.text
        body = resp.json()
        assert body["status"] == "stopped"
        assert body["is_active"] is False
        client.delete(f"{MEDICATIONS_URL}/{body['id']}", headers=auth_headers(token))

    def test_patch_with_no_fields_returns_400(self, client: httpx.Client):
        token = login(client, USER_A)
        create_resp = client.post(
            MEDICATIONS_URL,
            json=VALID_MEDICATION,
            headers=auth_headers(token),
        )
        assert create_resp.status_code == 201, create_resp.text
        medication_id = create_resp.json()["id"]

        patch_resp = client.patch(
            f"{MEDICATIONS_URL}/{medication_id}",
            json={},
            headers=auth_headers(token),
        )
        assert patch_resp.status_code == 400

        client.delete(f"{MEDICATIONS_URL}/{medication_id}", headers=auth_headers(token))


class TestMedicationsOwnership:
    @pytest.fixture(scope="class")
    def user_a_medication_id(self, client: httpx.Client):
        token = login(client, USER_A)
        resp = client.post(
            MEDICATIONS_URL,
            json=VALID_MEDICATION,
            headers=auth_headers(token),
        )
        assert resp.status_code == 201, resp.text
        medication_id = resp.json()["id"]
        yield medication_id
        client.delete(f"{MEDICATIONS_URL}/{medication_id}", headers=auth_headers(token))

    def test_user_b_cannot_get_user_a_medication(self, client: httpx.Client, user_a_medication_id: str):
        token_b = login(client, USER_B)
        resp = client.get(
            f"{MEDICATIONS_URL}/{user_a_medication_id}",
            headers=auth_headers(token_b),
        )
        assert resp.status_code == 404

    def test_user_b_cannot_patch_user_a_medication(self, client: httpx.Client, user_a_medication_id: str):
        token_b = login(client, USER_B)
        resp = client.patch(
            f"{MEDICATIONS_URL}/{user_a_medication_id}",
            json={"dose": "20 mg"},
            headers=auth_headers(token_b),
        )
        assert resp.status_code == 404

    def test_user_b_cannot_put_user_a_medication(self, client: httpx.Client, user_a_medication_id: str):
        token_b = login(client, USER_B)
        resp = client.put(
            f"{MEDICATIONS_URL}/{user_a_medication_id}",
            json={"name": "Stolen Med"},
            headers=auth_headers(token_b),
        )
        assert resp.status_code == 404

    def test_user_b_cannot_delete_user_a_medication(self, client: httpx.Client, user_a_medication_id: str):
        token_b = login(client, USER_B)
        resp = client.delete(
            f"{MEDICATIONS_URL}/{user_a_medication_id}",
            headers=auth_headers(token_b),
        )
        assert resp.status_code == 404

        token_a = login(client, USER_A)
        verify = client.get(
            f"{MEDICATIONS_URL}/{user_a_medication_id}",
            headers=auth_headers(token_a),
        )
        assert verify.status_code == 200


class TestMedicationsCrudLifecycle:
    def test_create_list_get_patch_delete(self, client: httpx.Client):
        token = login(client, USER_A)

        create_resp = client.post(
            MEDICATIONS_URL,
            json=VALID_MEDICATION,
            headers=auth_headers(token),
        )
        assert create_resp.status_code == 201, create_resp.text
        created = create_resp.json()
        medication_id = created["id"]
        assert created["name"] == "Lisinopril"
        assert "health_record_id" not in created

        list_resp = client.get(MEDICATIONS_URL, headers=auth_headers(token))
        assert list_resp.status_code == 200
        ids = [m["id"] for m in list_resp.json()]
        assert medication_id in ids

        get_resp = client.get(
            f"{MEDICATIONS_URL}/{medication_id}",
            headers=auth_headers(token),
        )
        assert get_resp.status_code == 200

        patch_resp = client.patch(
            f"{MEDICATIONS_URL}/{medication_id}",
            json={"dose": "20 mg", "status": "stopped"},
            headers=auth_headers(token),
        )
        assert patch_resp.status_code == 200
        assert patch_resp.json()["dose"] == "20 mg"
        assert patch_resp.json()["status"] == "stopped"

        delete_resp = client.delete(
            f"{MEDICATIONS_URL}/{medication_id}",
            headers=auth_headers(token),
        )
        assert delete_resp.status_code == 204

        gone_resp = client.get(
            f"{MEDICATIONS_URL}/{medication_id}",
            headers=auth_headers(token),
        )
        assert gone_resp.status_code == 404

    def test_create_put_full_replace(self, client: httpx.Client):
        token = login(client, USER_A)

        create_resp = client.post(
            MEDICATIONS_URL,
            json={"name": "PUT Test Med", "dose": "10 mg"},
            headers=auth_headers(token),
        )
        assert create_resp.status_code == 201, create_resp.text
        medication_id = create_resp.json()["id"]

        put_resp = client.put(
            f"{MEDICATIONS_URL}/{medication_id}",
            json={
                "name": "PUT Test Med Updated",
                "dosage": "20 mg",
                "frequency": "twice daily",
                "route": "oral",
                "prescribing_provider": "Dr. Jones",
                "start_date": "2026-02-01",
                "end_date": "2026-08-01",
                "reason": "Blood pressure",
                "notes": "Evening dose",
                "is_active": True,
            },
            headers=auth_headers(token),
        )
        assert put_resp.status_code == 200, put_resp.text
        updated = put_resp.json()
        assert updated["name"] == "PUT Test Med Updated"
        assert updated["dose"] == "20 mg"
        assert updated["dosage"] == "20 mg"
        assert updated["frequency"] == "twice daily"
        assert updated["route"] == "oral"
        assert updated["prescribing_provider"] == "Dr. Jones"
        assert updated["reason"] == "Blood pressure"
        assert updated["notes"] == "Evening dose"
        assert updated["is_active"] is True
        assert "updated_at" in updated

        client.delete(f"{MEDICATIONS_URL}/{medication_id}", headers=auth_headers(token))

    def test_list_status_filter(self, client: httpx.Client):
        token = login(client, USER_A)

        active_resp = client.post(
            MEDICATIONS_URL,
            json={**VALID_MEDICATION, "name": "Filter Test Active", "status": "active"},
            headers=auth_headers(token),
        )
        stopped_resp = client.post(
            MEDICATIONS_URL,
            json={**VALID_MEDICATION, "name": "Filter Test Stopped", "status": "stopped"},
            headers=auth_headers(token),
        )
        assert active_resp.status_code == 201
        assert stopped_resp.status_code == 201
        active_id = active_resp.json()["id"]
        stopped_id = stopped_resp.json()["id"]

        filtered = client.get(
            f"{MEDICATIONS_URL}?status=active",
            headers=auth_headers(token),
        )
        assert filtered.status_code == 200
        names = [m["name"] for m in filtered.json()]
        assert "Filter Test Active" in names
        assert "Filter Test Stopped" not in names

        client.delete(f"{MEDICATIONS_URL}/{active_id}", headers=auth_headers(token))
        client.delete(f"{MEDICATIONS_URL}/{stopped_id}", headers=auth_headers(token))


class TestMedicationsListAll:
    def test_list_without_query_params_returns_all_user_medications(self, client: httpx.Client):
        token = login(client, USER_A)

        first_resp = client.post(
            MEDICATIONS_URL,
            json={**VALID_MEDICATION, "name": "List All Test A"},
            headers=auth_headers(token),
        )
        second_resp = client.post(
            MEDICATIONS_URL,
            json={**VALID_MEDICATION, "name": "List All Test B"},
            headers=auth_headers(token),
        )
        assert first_resp.status_code == 201, first_resp.text
        assert second_resp.status_code == 201, second_resp.text
        first_id = first_resp.json()["id"]
        second_id = second_resp.json()["id"]

        list_resp = client.get(MEDICATIONS_URL, headers=auth_headers(token))
        assert list_resp.status_code == 200
        ids = [m["id"] for m in list_resp.json()]
        assert first_id in ids
        assert second_id in ids

        client.delete(f"{MEDICATIONS_URL}/{first_id}", headers=auth_headers(token))
        client.delete(f"{MEDICATIONS_URL}/{second_id}", headers=auth_headers(token))
