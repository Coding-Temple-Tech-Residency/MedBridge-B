"""
medbridge-data/fhir_mapper.py

Pulls clinical data from the Epic FHIR sandbox for a connected user and
inserts it into the MedBridge normalized schema.

Prerequisites:
  1. Migrations 001-004 run against Supabase
  2. User has completed the OAuth flow (fhir_oauth_spike/main.py)
     which wrote a row to fhir_connections
  3. DATABASE_URL set in .env

Usage:
  python fhir_mapper.py --user-id <supabase-user-uuid>
  python fhir_mapper.py --user-id <uuid> --resources Observation,Condition
  python fhir_mapper.py --user-id <uuid> --dry-run

Resources pulled by default:
  Patient, Condition, MedicationRequest, Observation (labs),
  Encounter, AllergyIntolerance
"""

import argparse
import json
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

import httpx
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

ALL_RESOURCES = [
    "Observation",
    "Condition",
    "MedicationRequest",
    "Encounter",
    "AllergyIntolerance",
]

# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------
def get_conn():
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise EnvironmentError("DATABASE_URL not set in .env")
    return psycopg2.connect(url, cursor_factory=psycopg2.extras.RealDictCursor)


def get_fhir_connection(conn, user_id: str) -> dict:
    """Fetch the most recent fhir_connections row for this user."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT * FROM fhir_connections
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (user_id,)
        )
        row = cur.fetchone()
    if not row:
        raise ValueError(
            f"No FHIR connection found for user {user_id}.\n"
            "Complete the OAuth flow first: cd fhir_oauth_spike && uvicorn main:app --port 8000"
        )
    return dict(row)


def refresh_token_if_needed(conn, fhir_conn: dict) -> str:
    """Return a valid access token, refreshing if expired."""
    now = datetime.now(timezone.utc)
    expires_at = fhir_conn["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))

    # Refresh 5 minutes before expiry to be safe
    if expires_at - now > timedelta(minutes=5):
        return fhir_conn["access_token"]

    refresh_token = fhir_conn.get("refresh_token")
    if not refresh_token:
        raise ValueError(
            "Access token expired and no refresh token available.\n"
            "Re-run the OAuth flow to get a new token."
        )

    print("  Access token expired — refreshing...")
    # Discover token endpoint
    r = httpx.get(
        f"{fhir_conn['fhir_base_url']}/.well-known/smart-configuration",
        timeout=20
    )
    r.raise_for_status()
    token_endpoint = r.json()["token_endpoint"]

    r = httpx.post(
        token_endpoint,
        data={
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": os.environ.get("EPIC_CLIENT_ID", ""),
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=30,
    )
    if r.status_code != 200:
        raise ValueError(f"Token refresh failed: {r.status_code} {r.text}")

    tok = r.json()
    new_access = tok["access_token"]
    new_expires = datetime.now(timezone.utc) + timedelta(seconds=tok.get("expires_in", 3600))

    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE fhir_connections
            SET access_token = %s,
                expires_at = %s,
                refresh_token = COALESCE(%s, refresh_token)
            WHERE id = %s
            """,
            (new_access, new_expires, tok.get("refresh_token"), fhir_conn["id"])
        )
    conn.commit()
    print("  Token refreshed successfully.")
    return new_access


# ---------------------------------------------------------------------------
# FHIR API helpers
# ---------------------------------------------------------------------------
def fhir_headers(access_token: str) -> dict:
    return {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/fhir+json",
    }


def fhir_get_all(base_url: str, resource_type: str,
                 patient_id: str, access_token: str) -> list:
    """
    Fetch ALL resources of a given type for a patient, following pagination.
    Epic FHIR returns bundles with up to 10 entries; we follow 'next' links.
    """
    results = []
    url = f"{base_url}/{resource_type}"
    params = {"patient": patient_id, "_count": "50"}

    while url:
        r = httpx.get(
            url,
            params=params if "?" not in url else None,
            headers=fhir_headers(access_token),
            timeout=30,
        )
        if r.status_code == 403:
            print(f"    403 Forbidden — scope may not include {resource_type}. Skipping.")
            break
        r.raise_for_status()
        bundle = r.json()

        entries = bundle.get("entry", [])
        for entry in entries:
            resource = entry.get("resource", {})
            if resource.get("resourceType") == resource_type:
                results.append(resource)

        # Follow pagination
        url = None
        params = None
        for link in bundle.get("link", []):
            if link.get("relation") == "next":
                url = link["url"]
                break

    return results


# ---------------------------------------------------------------------------
# Shared FHIR parsers (same logic as synthea_loader.py)
# These functions are source-agnostic — they work on any FHIR R4 resource.
# ---------------------------------------------------------------------------
def coding_first(codeable_concept: dict) -> dict:
    return (codeable_concept or {}).get("coding", [{}])[0] or {}


def text_or_display(codeable_concept: dict) -> Optional[str]:
    if not codeable_concept:
        return None
    return codeable_concept.get("text") or coding_first(codeable_concept).get("display")


def parse_date(dt_str: Optional[str]) -> Optional[str]:
    return dt_str[:10] if dt_str else None


def parse_datetime(dt_str: Optional[str]) -> Optional[datetime]:
    if not dt_str:
        return None
    try:
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except ValueError:
        return None


def friendly_system(uri: Optional[str]) -> Optional[str]:
    mapping = {
        "http://snomed.info/sct": "SNOMED-CT",
        "http://hl7.org/fhir/sid/icd-10-cm": "ICD-10-CM",
        "http://www.nlm.nih.gov/research/umls/rxnorm": "RxNorm",
        "http://loinc.org": "LOINC",
    }
    return mapping.get(uri or "", uri)


def parse_condition(res, health_record_id, user_id):
    code_cc = res.get("code", {})
    coding = coding_first(code_cc)
    status_code = coding_first(res.get("clinicalStatus", {})).get("code", "unknown")
    status_map = {"active": "active", "resolved": "resolved",
                  "inactive": "inactive", "remission": "resolved"}
    name = text_or_display(code_cc)
    if not name:
        return None
    return {
        "id": str(uuid.uuid4()),
        "health_record_id": health_record_id,
        "user_id": user_id,
        "name": name,
        "code": coding.get("code"),
        "code_system": friendly_system(coding.get("system")),
        "status": status_map.get(status_code, "unknown"),
        "onset_date": parse_date(
            res.get("onsetDateTime") or
            (res.get("onsetPeriod") or {}).get("start")
        ),
        "note": None,
    }


def parse_medication_request(res, health_record_id, user_id):
    med_cc = res.get("medicationCodeableConcept", {})
    coding = coding_first(med_cc)
    name = text_or_display(med_cc)
    if not name:
        return None
    dosage = (res.get("dosageInstruction") or [{}])[0]
    dose_text = dosage.get("text", "")
    dose, frequency = dose_text, None
    for sep in [" once", " twice", " daily", " weekly", " every", " as needed"]:
        if sep in dose_text.lower():
            idx = dose_text.lower().index(sep)
            dose = dose_text[:idx].strip() or dose_text
            frequency = dose_text[idx:].strip()
            break
    fhir_status = res.get("status", "unknown")
    status_map = {"active": "active", "stopped": "stopped",
                  "completed": "stopped", "on-hold": "on-hold"}
    return {
        "id": str(uuid.uuid4()),
        "health_record_id": health_record_id,
        "user_id": user_id,
        "name": name,
        "code": coding.get("code"),
        "code_system": friendly_system(coding.get("system")),
        "dose": dose or None,
        "frequency": frequency,
        "route": text_or_display(dosage.get("route")),
        "status": status_map.get(fhir_status, "unknown"),
        "start_date": None,
        "end_date": None,
    }


def parse_observation(res, health_record_id, user_id):
    categories = res.get("category", [])
    is_lab = any(
        coding_first(cat).get("code") == "laboratory"
        for cat in categories
    )
    if not is_lab:
        return None
    code_cc = res.get("code", {})
    coding = coding_first(code_cc)
    name = text_or_display(code_cc)
    if not name:
        return None
    value_quantity, value_text, unit = None, None, None
    if "valueQuantity" in res:
        vq = res["valueQuantity"]
        value_quantity = vq.get("value")
        value_text = str(value_quantity) if value_quantity is not None else None
        unit = vq.get("unit") or vq.get("code")
    elif "valueString" in res:
        value_text = res["valueString"]
    elif "valueCodeableConcept" in res:
        value_text = text_or_display(res["valueCodeableConcept"])
    rr = (res.get("referenceRange") or [{}])[0]
    rr_low = (rr.get("low") or {}).get("value")
    rr_high = (rr.get("high") or {}).get("value")
    interp = coding_first((res.get("interpretation") or [{}])[0]).get("code", "")
    flag_map = {"N": "normal", "H": "high", "L": "low",
                "HH": "critical", "LL": "critical"}
    flag = flag_map.get(interp.upper(), "unknown")
    if flag == "unknown" and value_quantity is not None:
        if rr_low is not None and value_quantity < rr_low:
            flag = "low"
        elif rr_high is not None and value_quantity > rr_high:
            flag = "high"
        elif rr_low is not None and rr_high is not None:
            flag = "normal"
    effective = (res.get("effectiveDateTime") or
                 (res.get("effectivePeriod") or {}).get("start"))
    return {
        "id": str(uuid.uuid4()),
        "health_record_id": health_record_id,
        "user_id": user_id,
        "name": name,
        "code": coding.get("code"),
        "code_system": friendly_system(coding.get("system")),
        "value_quantity": value_quantity,
        "value_text": value_text,
        "unit": unit,
        "reference_range_low": rr_low,
        "reference_range_high": rr_high,
        "reference_range_text": rr.get("text"),
        "flag": flag,
        "observed_at": parse_datetime(effective),
    }


def parse_encounter(res, health_record_id, user_id):
    enc_types = res.get("type", [{}])
    enc_type = text_or_display(enc_types[0]) if enc_types else None
    reason = res.get("reasonCode", [{}])
    description = text_or_display(reason[0]) if reason else None
    participant = (res.get("participant") or [{}])[0]
    provider = (participant.get("individual") or {}).get("display")
    service_provider = (res.get("serviceProvider") or {}).get("display")
    period = res.get("period") or {}
    return {
        "id": str(uuid.uuid4()),
        "health_record_id": health_record_id,
        "user_id": user_id,
        "encounter_type": enc_type,
        "description": description,
        "provider": provider,
        "facility": service_provider,
        "occurred_at": parse_datetime(period.get("start")),
    }


def parse_allergy(res, health_record_id, user_id):
    substance_cc = res.get("code") or (res.get("reaction") or [{}])[0].get("substance", {})
    substance = text_or_display(substance_cc)
    if not substance:
        return None
    reactions = res.get("reaction") or []
    reaction_text, severity = None, "unknown"
    if reactions:
        r = reactions[0]
        manifestations = r.get("manifestation") or []
        if manifestations:
            reaction_text = text_or_display(manifestations[0])
        s = r.get("severity", "unknown")
        severity = s if s in ("mild", "moderate", "severe") else "unknown"
    status_code = coding_first(res.get("clinicalStatus", {})).get("code", "active")
    status_map = {"active": "active", "inactive": "inactive", "resolved": "resolved"}
    return {
        "id": str(uuid.uuid4()),
        "health_record_id": health_record_id,
        "user_id": user_id,
        "substance": substance,
        "reaction": reaction_text,
        "severity": severity,
        "status": status_map.get(status_code, "active"),
    }


PARSERS = {
    "Condition": parse_condition,
    "MedicationRequest": parse_medication_request,
    "Observation": parse_observation,
    "Encounter": parse_encounter,
    "AllergyIntolerance": parse_allergy,
}

TABLES = {
    "Condition": "conditions",
    "MedicationRequest": "medications",
    "Observation": "lab_results",
    "Encounter": "encounters",
    "AllergyIntolerance": "allergies",
}


# ---------------------------------------------------------------------------
# Patient name helper
# ---------------------------------------------------------------------------
def get_patient_name(base_url: str, patient_id: str, access_token: str) -> str:
    try:
        r = httpx.get(
            f"{base_url}/Patient/{patient_id}",
            headers=fhir_headers(access_token),
            timeout=20,
        )
        r.raise_for_status()
        patient = r.json()
        names = patient.get("name", [{}])
        n = names[0] if names else {}
        given = " ".join(n.get("given", []))
        family = n.get("family", "")
        return f"{given} {family}".strip() or patient_id
    except Exception:
        return patient_id


# ---------------------------------------------------------------------------
# Main mapper
# ---------------------------------------------------------------------------
def map_fhir_to_db(user_id: str, resources: list,
                   dry_run: bool = False, conn=None) -> dict:
    """
    Pull FHIR resources for a user and insert into normalized tables.
    Returns count dict.
    """
    close_conn = conn is None
    if conn is None:
        conn = get_conn()

    try:
        fhir_conn = get_fhir_connection(conn, user_id)
        access_token = refresh_token_if_needed(conn, fhir_conn)
        base_url = fhir_conn["fhir_base_url"]
        patient_id = fhir_conn["fhir_patient_id"]

        patient_name = get_patient_name(base_url, patient_id, access_token)
        print("\nPatient context loaded.")
        print(f"Base URL: {base_url}")
        print(f"Resources to pull: {', '.join(resources)}\n")

        counts = {rt: 0 for rt in resources}

        if dry_run:
            print("DRY RUN — fetching counts only, nothing written to DB.")
            for rt in resources:
                items = fhir_get_all(base_url, rt, patient_id, access_token)
                print(f"  {rt}: {len(items)} resources available")
            return counts

        # Create the health_record hub row
        hr_id = str(uuid.uuid4())
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO health_records
                  (id, user_id, source_type, fhir_connection_id,
                   fhir_patient_id, display_name, status)
                VALUES (%s, %s, 'fhir', %s, %s, %s, 'ready')
                """,
                (hr_id, user_id, fhir_conn["id"], patient_id,
                 f"Epic records — {patient_name} — {today}")
            )

        # Pull and insert each resource type
        for rt in resources:
            if rt not in PARSERS:
                print(f"  Skipping unknown resource type: {rt}")
                continue

            print(f"  Pulling {rt}...", end=" ", flush=True)
            items = fhir_get_all(base_url, rt, patient_id, access_token)
            print(f"{len(items)} found", end=" → ", flush=True)

            inserted = 0
            table = TABLES[rt]
            with conn.cursor() as cur:
                for item in items:
                    row = PARSERS[rt](item, hr_id, user_id)
                    if row is None:
                        continue
                    cols = list(row.keys())
                    placeholders = ["%s"] * len(cols)
                    cur.execute(
                        f"INSERT INTO {table} ({', '.join(cols)}) "
                        f"VALUES ({', '.join(placeholders)})",
                        [row[c] for c in cols]
                    )
                    inserted += 1

            counts[rt] = inserted
            print(f"{inserted} inserted")

        conn.commit()
        return {"health_record_id": hr_id, "patient_name": patient_name,
                "counts": counts}

    finally:
        if close_conn:
            conn.close()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="Pull Epic FHIR data for a user and load into MedBridge schema."
    )
    parser.add_argument("--user-id", required=True,
        help="Supabase user UUID (must have a row in fhir_connections)")
    parser.add_argument("--resources", default=",".join(ALL_RESOURCES),
        help=f"Comma-separated resource types. Default: {','.join(ALL_RESOURCES)}")
    parser.add_argument("--dry-run", action="store_true",
        help="Fetch counts only — nothing written to the database")
    args = parser.parse_args()

    resources = [r.strip() for r in args.resources.split(",")]
    result = map_fhir_to_db(args.user_id, resources, dry_run=args.dry_run)

    if not args.dry_run and result:
        print(f"\n{'='*50}")
        print(f"Done. health_record: {result['health_record_id']}")
        c = result["counts"]
        print(f"Conditions: {c.get('Condition',0)}  "
              f"Medications: {c.get('MedicationRequest',0)}  "
              f"Labs: {c.get('Observation',0)}  "
              f"Encounters: {c.get('Encounter',0)}  "
              f"Allergies: {c.get('AllergyIntolerance',0)}")


if __name__ == "__main__":
    main()
