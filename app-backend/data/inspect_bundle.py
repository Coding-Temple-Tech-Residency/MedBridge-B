"""
medbridge-data/inspect_bundle.py

Inspects a Synthea FHIR bundle OR live Epic FHIR resources and prints
the actual field structure so you can validate the ERD matches reality.

This is the tool to run BEFORE finalizing the schema.

Usage:
  # Inspect a Synthea bundle
  python inspect_bundle.py --bundle output/fhir/SomePatient.json

  # Inspect live Epic FHIR data (requires completed OAuth flow)
  python inspect_bundle.py --fhir --user-id YOUR-UUID

  # Inspect specific resource types only
  python inspect_bundle.py --bundle file.json --resources Observation,Condition
"""

import argparse
import json
import os
from pathlib import Path
from typing import Optional

import psycopg2
import psycopg2.extras
import httpx
from dotenv import load_dotenv

load_dotenv()

RESOURCE_TYPES = [
    "Patient",
    "Condition",
    "MedicationRequest",
    "Observation",
    "Encounter",
    "AllergyIntolerance",
]


def flatten_keys(obj, prefix="", depth=0, max_depth=3) -> list:
    """Recursively extract all field paths from a JSON object."""
    if depth > max_depth:
        return []
    keys = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            full_key = f"{prefix}.{k}" if prefix else k
            keys.append(full_key)
            keys.extend(flatten_keys(v, full_key, depth + 1, max_depth))
    elif isinstance(obj, list) and obj:
        keys.extend(flatten_keys(obj[0], prefix + "[0]", depth + 1, max_depth))
    return keys


def summarize_resource(resource: dict) -> dict:
    """Extract the most important fields from a FHIR resource for ERD design."""
    rt = resource.get("resourceType", "Unknown")
    summary = {"resourceType": rt, "fields": {}}

    if rt == "Patient":
        summary["fields"] = {
            "id": resource.get("id"),
            "name": resource.get("name", [{}])[0],
            "birthDate": resource.get("birthDate"),
            "gender": resource.get("gender"),
        }

    elif rt == "Condition":
        summary["fields"] = {
            "id": resource.get("id"),
            "clinicalStatus": resource.get("clinicalStatus"),
            "code": resource.get("code"),
            "onsetDateTime": resource.get("onsetDateTime"),
            "subject": resource.get("subject"),
        }

    elif rt == "MedicationRequest":
        summary["fields"] = {
            "id": resource.get("id"),
            "status": resource.get("status"),
            "intent": resource.get("intent"),
            "medicationCodeableConcept": resource.get("medicationCodeableConcept"),
            "dosageInstruction": resource.get("dosageInstruction", [{}])[:1],
            "dispenseRequest": resource.get("dispenseRequest"),
        }

    elif rt == "Observation":
        summary["fields"] = {
            "id": resource.get("id"),
            "status": resource.get("status"),
            "category": resource.get("category"),
            "code": resource.get("code"),
            "valueQuantity": resource.get("valueQuantity"),
            "valueString": resource.get("valueString"),
            "valueCodeableConcept": resource.get("valueCodeableConcept"),
            "interpretation": resource.get("interpretation"),
            "referenceRange": resource.get("referenceRange"),
            "effectiveDateTime": resource.get("effectiveDateTime"),
        }

    elif rt == "Encounter":
        summary["fields"] = {
            "id": resource.get("id"),
            "status": resource.get("status"),
            "class": resource.get("class"),
            "type": resource.get("type"),
            "reasonCode": resource.get("reasonCode"),
            "participant": resource.get("participant", [{}])[:1],
            "serviceProvider": resource.get("serviceProvider"),
            "period": resource.get("period"),
        }

    elif rt == "AllergyIntolerance":
        summary["fields"] = {
            "id": resource.get("id"),
            "clinicalStatus": resource.get("clinicalStatus"),
            "code": resource.get("code"),
            "reaction": resource.get("reaction", [{}])[:1],
        }

    return summary


def print_schema_analysis(resource: dict):
    """
    Print a schema analysis showing:
    1. The actual data shape
    2. How it maps to our normalized schema
    3. Any fields NOT captured by our schema
    """
    rt = resource.get("resourceType")
    summary = summarize_resource(resource)

    SCHEMA_MAPPING = {
        "Condition": {
            "code.coding[0].code":      "→ conditions.code",
            "code.coding[0].system":    "→ conditions.code_system",
            "code.text":                "→ conditions.name",
            "clinicalStatus.coding[0].code": "→ conditions.status",
            "onsetDateTime":            "→ conditions.onset_date",
        },
        "MedicationRequest": {
            "medicationCodeableConcept.text":           "→ medications.name",
            "medicationCodeableConcept.coding[0].code": "→ medications.code",
            "medicationCodeableConcept.coding[0].system": "→ medications.code_system",
            "dosageInstruction[0].text":                "→ medications.dose + frequency",
            "status":                                   "→ medications.status",
        },
        "Observation": {
            "code.text":                    "→ lab_results.name",
            "code.coding[0].code":          "→ lab_results.code (LOINC)",
            "valueQuantity.value":          "→ lab_results.value_quantity",
            "valueQuantity.unit":           "→ lab_results.unit",
            "referenceRange[0].low.value":  "→ lab_results.reference_range_low",
            "referenceRange[0].high.value": "→ lab_results.reference_range_high",
            "interpretation[0].coding[0].code": "→ lab_results.flag",
            "effectiveDateTime":            "→ lab_results.observed_at",
        },
        "Encounter": {
            "type[0].text":             "→ encounters.encounter_type",
            "reasonCode[0].text":       "→ encounters.description",
            "participant[0].individual.display": "→ encounters.provider",
            "serviceProvider.display":  "→ encounters.facility",
            "period.start":             "→ encounters.occurred_at",
        },
        "AllergyIntolerance": {
            "code.text":                        "→ allergies.substance",
            "reaction[0].manifestation[0].text":"→ allergies.reaction",
            "reaction[0].severity":             "→ allergies.severity",
            "clinicalStatus.coding[0].code":    "→ allergies.status",
        },
    }

    print(f"\n{'='*60}")
    print(f"  {rt}")
    print(f"{'='*60}")

    print("\n  Raw fields (key data):")
    sensitive_fields = {"birthDate", "gender"}
    for key, val in summary["fields"].items():
        if val is not None:
            if key in sensitive_fields:
                val_str = "[REDACTED]"
            else:
                val_str = json.dumps(val, indent=None)
            if len(val_str) > 80:
                val_str = val_str[:77] + "..."
            print(f"    {key}: {val_str}")

    if rt in SCHEMA_MAPPING:
        print(f"\n  Schema mapping:")
        for fhir_field, db_field in SCHEMA_MAPPING[rt].items():
            print(f"    {fhir_field:<45} {db_field}")

    # Fields in the resource NOT captured by our schema
    all_keys = set(flatten_keys(resource))
    mapped_prefixes = set()
    if rt in SCHEMA_MAPPING:
        for k in SCHEMA_MAPPING[rt].keys():
            mapped_prefixes.add(k.split(".")[0].split("[")[0])

    uncaptured = [
        k for k in sorted(all_keys)
        if not any(k.startswith(p) for p in mapped_prefixes)
        and k not in ("resourceType", "id", "meta", "text",
                      "subject", "patient", "context", "encounter")
        and "." not in k  # top-level only to keep it readable
    ]
    if uncaptured:
        print(f"\n  Top-level fields NOT in current schema:")
        for k in uncaptured[:10]:
            print(f"    {k}  ← consider adding?")


# ---------------------------------------------------------------------------
# Synthea path
# ---------------------------------------------------------------------------
def inspect_bundle_file(bundle_path: str, resources: list):
    print(f"\nInspecting: {bundle_path}")
    with open(bundle_path) as f:
        bundle = json.load(f)

    from collections import Counter
    all_types = Counter(
        e["resource"]["resourceType"]
        for e in bundle.get("entry", [])
        if "resource" in e
    )
    print(f"\nResource types in this bundle:")
    for rt, count in sorted(all_types.items()):
        marker = "✓" if rt in resources else " "
        print(f"  [{marker}] {rt}: {count}")

    # Analyze one of each requested type
    seen = set()
    for entry in bundle.get("entry", []):
        resource = entry.get("resource", {})
        rt = resource.get("resourceType")
        if rt in resources and rt not in seen:
            print_schema_analysis(resource)
            seen.add(rt)


# ---------------------------------------------------------------------------
# Epic FHIR path
# ---------------------------------------------------------------------------
def inspect_fhir_live(user_id: str, resources: list):
    import sys
    sys.path.insert(0, str(Path(__file__).parent))
    from fhir_mapper import (get_conn, get_fhir_connection,
                              refresh_token_if_needed, fhir_headers)

    conn = get_conn()
    fhir_conn = get_fhir_connection(conn, user_id)
    access_token = refresh_token_if_needed(conn, fhir_conn)
    base_url = fhir_conn["fhir_base_url"]
    patient_id = fhir_conn["fhir_patient_id"]
    patient_id_masked = (f"...{patient_id[-4:]}"
    if isinstance(patient_id, str) and len(patient_id) >= 4 else "[redacted]")

    print(f"Base URL: {base_url}")

    for rt in resources:
        if rt == "Patient":
            r = httpx.get(
                f"{base_url}/Patient/{patient_id}",
                headers=fhir_headers(access_token),
                timeout=20,
            )
        else:
            r = httpx.get(
                f"{base_url}/{rt}",
                params={"patient": patient_id, "_count": "1"},
                headers=fhir_headers(access_token),
                timeout=20,
            )
        if r.status_code != 200:
            print(f"\n  {rt}: HTTP {r.status_code} — skipping")
            continue

        data = r.json()
        if data.get("resourceType") == "Bundle":
            entries = data.get("entry", [])
            if not entries:
                print(f"\n  {rt}: 0 results in sandbox")
                continue
            resource = entries[0]["resource"]
        else:
            resource = data

        print_schema_analysis(resource)

    conn.close()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="Inspect FHIR data structure to validate ERD design."
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--bundle", type=str,
        help="Path to a Synthea FHIR bundle JSON file")
    group.add_argument("--fhir", action="store_true",
        help="Inspect live Epic FHIR sandbox data (requires completed OAuth)")
    parser.add_argument("--user-id", type=str,
        help="Supabase user UUID (required with --fhir)")
    parser.add_argument("--resources",
        default=",".join(RESOURCE_TYPES),
        help=f"Comma-separated resource types. Default: {','.join(RESOURCE_TYPES)}")
    args = parser.parse_args()

    resources = [r.strip() for r in args.resources.split(",")]

    if args.fhir:
        if not args.user_id:
            parser.error("--user-id is required with --fhir")
        inspect_fhir_live(args.user_id, resources)
    else:
        inspect_bundle_file(args.bundle, resources)

    print("\n\nNext step: compare the fields above against the ERD.")
    print("Any 'NOT in current schema' fields that map to a feature")
    print("Mary listed should be added before Sprint 1.")


if __name__ == "__main__":
    main()
