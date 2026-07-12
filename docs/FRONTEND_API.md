# MedBridge — Frontend API Reference

Sprint 2 API contracts for frontend integration. Backend is the source of truth for all request/response shapes.

**Local backend:** `http://localhost:8000`  
**Interactive docs:** `http://localhost:8000/docs`  
**OpenAPI schema:** `http://localhost:8000/openapi.json`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Error Response Formats](#error-response-formats)
3. [Health & App Config](#health--app-config)
4. [Auth Endpoints](#auth-endpoints)
5. [Patient Profile](#patient-profile)
6. [Medications](#medications)
7. [Documents](#documents)
8. [Document Status Flow](#document-status-flow)
9. [Summaries](#summaries)
10. [Chat](#chat)
11. [Appointment Prep](#appointment-prep)
12. [Dashboard](#dashboard)
13. [Reminders](#reminders)
14. [Trusted Contacts](#trusted-contacts)
15. [Follow-ups](#follow-ups)
16. [Providers](#providers)
17. [Resources (Discover)](#resources-discover)
18. [Health Scores](#health-scores)
19. [User Settings (Feature Toggles)](#user-settings-feature-toggles)
20. [Analytics](#analytics)
21. [Contract Review Notes](#contract-review-notes)

---

## Authentication

Most endpoints require:

```
Authorization: Bearer <supabase_jwt>
```

**Public (no auth):** `GET /health`, `GET /app/config`, `POST /auth/register`, `POST /auth/login`

**Exceptions:**

- `GET /documents/{document_id}/chat/stream` — JWT via `?token=` query param (EventSource cannot send headers)
- `GET /user-settings/` and `PATCH /user-settings/` — `user_id` query param only (no JWT); see [User Settings](#user-settings-feature-toggles)
- `/analytics/*` — Bearer token required, but uses a non-standard auth helper; see [Contract Review Notes](#contract-review-notes)

On `401`, redirect to login. On logout, call `POST /auth/logout` before clearing the token.

**Logout flow (recommended):**

1. Call `POST /auth/logout` with the current Bearer token (best-effort — use `try/finally` so local cleanup always runs).
2. Clear the JWT from auth state.
3. Clear cached user-specific data (documents, chat, settings).
4. Redirect to the login route.
5. If the token is already expired (401 from logout), still clear locally and redirect.

---

## Error Response Formats

Most endpoints return **standard FastAPI errors**:

```json
{ "detail": "Human-readable error message" }
```

Validation errors (`422`) return:

```json
{
  "detail": [
    {
      "type": "string_too_short",
      "loc": ["body", "password"],
      "msg": "String should have at least 8 characters",
      "input": "short"
    }
  ]
}
```

**AI chat errors (`503` only)** on `POST /documents/{document_id}/chat` return an `ErrorEnvelope`:

```json
{
  "success": false,
  "error_code": "GROQ_TIMEOUT",
  "message": "The AI is taking longer than usual. Please try again in a moment.",
  "retry_after": 5
}
```

| error_code | When | Suggested UI |
|---|---|---|
| `GROQ_TIMEOUT` | AI slow | Show message + retry after `retry_after` seconds |
| `GROQ_UNAVAILABLE` | AI down | Show message + retry button |

SSE streaming errors are inline in the event stream: `data: [ERROR] <message>`

---

## Health & App Config

### Health Check

`GET /health`

**Auth:** None

**Request body:** None

**Success (200):**

```json
{
  "status": "ok",
  "service": "medbridge-api"
}
```

**Errors:** None expected.

---

### App Config

`GET /app/config`

**Auth:** None

**Request body:** None

**Success (200):**

```json
{
  "app": {
    "name": "MedBridge",
    "version": "0.1.0",
    "environment": "development"
  },
  "limits": {
    "max_upload_mb": 10,
    "allowed_file_types": ["application/pdf", "image/jpeg", "image/png"],
    "max_pages_per_document": 50
  },
  "features": {
    "document_upload": true,
    "ocr_extraction": true,
    "ai_summarization": true,
    "document_chat": true,
    "summary_feedback": true,
    "analytics_dashboard": false,
    "appointment_prep": false,
    "reminders": false,
    "multilanguage": false
  },
  "ai": {
    "model": "llama-3.3-70b-versatile",
    "max_summary_tokens": 1024,
    "max_chat_tokens": 4096
  }
}
```

**Errors:** None expected.

---

## Auth Endpoints

### Register

`POST /auth/register`

**Auth:** None

**Request body:**

```json
{
  "email": "patient@example.com",
  "password": "securepassword",
  "full_name": "Jane Patient"
}
```

| Field | Required | Notes |
|---|---|---|
| `email` | Yes | Valid email |
| `password` | Yes | Minimum 8 characters |
| `full_name` | No | Optional display name |

**Success (201):**

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "patient@example.com"
}
```

Password is never returned. `access_token` may be `null` if email confirmation is pending in Supabase.

**Errors:**

| Status | Body | When |
|---|---|---|
| 400 | `{"detail": "Registration failed. Please check your email and try again."}` | Signup failed or no session |
| 400 | `{"detail": "Registration failed. This email may already be registered."}` | Duplicate email |
| 400 | `{"detail": "This email address is not accepted..."}` | Invalid email format |
| 409 | `{"detail": "An account with this email already exists. Try logging in instead."}` | Email already registered |
| 422 | Validation detail array | Missing/invalid fields |
| 429 | `{"detail": "Supabase signup rate limit exceeded."}` | Rate limited |

---

### Login

`POST /auth/login`

**Auth:** None

**Request body:**

```json
{
  "email": "patient@example.com",
  "password": "securepassword"
}
```

**Success (200):**

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "patient@example.com"
}
```

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid email or password."}` | Bad credentials |
| 401 | `{"detail": "Email not confirmed. Check your inbox..."}` | Email not verified |
| 422 | Validation detail array | Missing/invalid fields |
| 429 | `{"detail": "Too many auth emails sent..."}` | Rate limited |

---

### Logout

`POST /auth/logout`

**Auth:** Bearer JWT

**Request body:** None

**Success (204):** Empty body

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |

---

## Patient Profile

### Create Profile

`POST /patient-profile`

**Auth:** Bearer JWT

**Request body:**

```json
{
  "full_name": "Jane Patient",
  "preferred_language": "en",
  "explanation_level": "plain"
}
```

| Field | Required | Notes |
|---|---|---|
| `full_name` | Yes | Minimum 1 character |
| `preferred_language` | Yes | 2–10 characters (e.g. `"en"`, `"es"`) |
| `explanation_level` | No | `"plain"` (default) or `"detailed"` |

Completes a stub profile created at registration if one exists.

**Success (201):**

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "patient@example.com",
  "full_name": "Jane Patient",
  "preferred_language": "en",
  "explanation_level": "plain"
}
```

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 409 | `{"detail": "Patient profile already exists. Use PATCH to update."}` | Profile already complete |
| 422 | Validation detail array | Missing/invalid fields |
| 500 | `{"detail": "Failed to create patient profile."}` | Database error |

---

### Get Profile

`GET /patient-profile`

**Auth:** Bearer JWT

**Request body:** None

**Success (200):**

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "patient@example.com",
  "full_name": "Jane Patient",
  "preferred_language": "en",
  "explanation_level": "plain"
}
```

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 404 | `{"detail": "Patient profile not found."}` | No profile row |

---

### Update Profile

`PATCH /patient-profile`

**Auth:** Bearer JWT

**Request body:** (all fields optional)

```json
{
  "full_name": "Jane Doe",
  "preferred_language": "es",
  "explanation_level": "detailed"
}
```

**Success (200):** Same shape as Get Profile response.

**Errors:**

| Status | Body | When |
|---|---|---|
| 400 | `{"detail": "No fields provided to update."}` | Empty PATCH body |
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 404 | `{"detail": "Patient profile not found."}` | No profile row |
| 422 | Validation detail array | Invalid field values |
| 500 | `{"detail": "Failed to update patient profile."}` | Database error |

---

## Medications

Medications are scoped to the authenticated user via JWT. `user_id` is never sent in the request body — it is set server-side from the token. Medications are independent of uploaded documents.

**Only `name` is required** on create and replace (POST/PUT). All other fields are optional.

**Timestamps:** `created_at` and `updated_at` are ISO 8601 datetimes in UTC with a `Z` suffix (e.g. `2026-06-08T10:00:00Z`). The backend stores and returns all timestamps in UTC; clients should convert to the user's local timezone for display. `start_date` and `end_date` are date-only values (`YYYY-MM-DD`) with no time or timezone component.

### List Medications

`GET /medications`

**Auth:** Bearer JWT

**Query params (all optional):**

| Param | Type | Notes |
|---|---|---|
| `status` | string | Filter by status: `active`, `stopped`, `on-hold`, `unknown` |
| `is_active` | boolean | Shorthand filter: `true` → active, `false` → stopped. Ignored when `status` is also provided |

**Success (200):**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440020",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Lisinopril",
    "code": "314076",
    "code_system": "RxNorm",
    "dose": "10 mg",
    "dosage": "10 mg",
    "frequency": "once daily",
    "route": "oral",
    "status": "active",
    "is_active": true,
    "start_date": "2026-01-01",
    "end_date": null,
    "prescribing_provider": "Dr. Smith",
    "reason": "Hypertension",
    "notes": "Take with food",
    "created_at": "2026-06-08T10:00:00Z",
    "updated_at": "2026-06-08T10:00:00Z"
  }
]
```

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 500 | `{"detail": "Failed to ..."}` | Database error |

---

### Get Medication

`GET /medications/{medication_id}`

**Auth:** Bearer JWT

**Request body:** None

**Success (200):** Same shape as a single item in the list response above.

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 404 | `{"detail": "Medication not found."}` | Not found or belongs to another user |
| 500 | `{"detail": "Failed to ..."}` | Database error |

---

### Create Medication

`POST /medications`

**Auth:** Bearer JWT

**Request body:**

```json
{
  "name": "Lisinopril",
  "code": "314076",
  "code_system": "RxNorm",
  "dosage": "10 mg",
  "frequency": "once daily",
  "route": "oral",
  "status": "active",
  "is_active": true,
  "start_date": "2026-01-01",
  "end_date": "2026-12-31",
  "prescribing_provider": "Dr. Smith",
  "reason": "Hypertension",
  "notes": "Take with food"
}
```

| Field | Required | Notes |
|---|---|---|
| `name` | Yes | Minimum 1 character |
| `code` | No | RxNorm or other code |
| `code_system` | No | |
| `dose` / `dosage` | No | `dosage` is an alias for `dose` |
| `frequency` | No | |
| `route` | No | e.g. oral, topical |
| `status` | No | `active` (default), `stopped`, `on-hold`, `unknown` |
| `is_active` | No | Boolean shorthand; maps to `status` unless `status` is also sent |
| `start_date` | No | ISO date (`YYYY-MM-DD`) |
| `end_date` | No | ISO date; must be on or after `start_date` when both provided |
| `prescribing_provider` | No | |
| `reason` | No | |
| `notes` | No | |

Minimal valid body: `{"name": "Lisinopril"}`

**Success (201):** `MedicationResponse` (same shape as list item).

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 422 | Validation detail array | Missing/invalid fields |
| 500 | `{"detail": "Failed to create medication."}` | Database error |

---

### Replace Medication

`PUT /medications/{medication_id}`

**Auth:** Bearer JWT

**Request body:** Same fields as create. Only `name` is required; omitted optional fields are cleared (set to `null` or defaults). `status` defaults to `active` when omitted.

```json
{
  "name": "Lisinopril",
  "dosage": "20 mg",
  "frequency": "once daily",
  "status": "active"
}
```

**Success (200):** Updated `MedicationResponse`.

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 404 | `{"detail": "Medication not found."}` | Not found or belongs to another user |
| 422 | Validation detail array | Invalid field values |
| 500 | `{"detail": "Failed to update medication."}` | Database error |

---

### Update Medication (partial)

`PATCH /medications/{medication_id}`

**Auth:** Bearer JWT

**Request body:** (all fields optional)

```json
{
  "name": "Lisinopril",
  "dose": "20 mg",
  "frequency": "once daily",
  "status": "stopped",
  "is_active": false,
  "notes": "Discontinued per provider"
}
```

**Success (200):** Updated `MedicationResponse`.

**Errors:**

| Status | Body | When |
|---|---|---|
| 400 | `{"detail": "No fields provided to update."}` | Empty PATCH body |
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 404 | `{"detail": "Medication not found."}` | Not found or belongs to another user |
| 422 | Validation detail array | Invalid field values |
| 500 | `{"detail": "Failed to update medication."}` | Database error |

---

### Delete Medication

`DELETE /medications/{medication_id}`

**Auth:** Bearer JWT

**Request body:** None

**Success (204):** No body.

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 404 | `{"detail": "Medication not found."}` | Not found or belongs to another user |
| 500 | `{"detail": "Failed to ..."}` | Database error |

---

## Documents

### Upload

`POST /documents/upload`

**Auth:** Bearer JWT

**Request body:** `multipart/form-data`

| Field | Required | Notes |
|---|---|---|
| `file` | Yes | PDF, JPG, or PNG |

**Success (201):**

```json
{
  "user": {
    "user_id": "uuid",
    "email": "patient@example.com",
    "full_name": "Jane Doe",
    "preferred_language": "en",
    "explanation_level": "plain"
  },
  "profile_complete": true,
  "documents": [],
  "total_documents": 12,
  "total_summaries": 8,
  "total_questions_asked": 3
}
```

`documents` is a recent subset (maximum 5 items), while `total_documents` is
the full count for the authenticated user.

---

### List Documents

`GET /documents`

**Auth:** Bearer JWT

**Request body:** None

**Success (200):**

```json
{
  "documents": [
    {
      "document_id": "550e8400-e29b-41d4-a716-446655440001",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "file_name": "lab_results_june.pdf",
      "mime_type": "application/pdf",
      "file_size_bytes": 245760,
      "status": "summarized",
      "uploaded_at": "2026-06-08T14:22:00Z",
      "error_message": null
    }
  ],
  "total": 1
}
```

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |

---

### Get Document

`GET /documents/{document_id}`

**Auth:** Bearer JWT

**Request body:** None

**Success (200):** Single `DocumentResponse` object (same shape as items in list above).

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 404 | `{"detail": "Document not found."}` | Wrong ID or not owned by user |

---

### Delete Document

`DELETE /documents/{document_id}`

**Auth:** Bearer JWT

**Request body:** None

**Success (204):** Empty body

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 404 | `{"detail": "Document not found."}` | Wrong ID or not owned by user |

---

## Document Status Flow

```
uploaded → processing → extracted → summarized
```

Also possible: `ready`, `failed` (with `error_message` on the document).

Show a loading indicator until `status` is `"summarized"` before enabling summary, chat, prep, or health score.

---

## Summaries

### Get Summary

`GET /documents/{document_id}/summary`

**Auth:** Bearer JWT

**Request body:** None

**Success (200):**

```json
{
  "summary_id": "550e8400-e29b-41d4-a716-446655440002",
  "document_id": "550e8400-e29b-41d4-a716-446655440001",
  "summary_text": "Your lab results show...",
  "reading_level_target": "4th grade",
  "created_at": "2026-06-08T14:25:00Z",
  "disclaimer": "MedBridge explains information from your uploaded document in plain language. It does not provide medical advice, diagnosis, or treatment recommendations. Please contact a healthcare provider for medical decisions."
}
```

**Errors:**

| Status | Body | When |
|---|---|---|
| 202 | `{"detail": "Summary still generating. Status: extracted"}` | Still processing — retry after 3 seconds |
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 404 | `{"detail": "Document not found."}` | Wrong document ID |
| 404 | `{"detail": "Summary not found."}` | Document ready but no summary |

---

### Regenerate Summary

`POST /documents/{document_id}/summary`

**Auth:** Bearer JWT

**Request body:** None

**Success (201):** Same shape as Get Summary response.

**Errors:**

| Status | Body | When |
|---|---|---|
| 400 | `{"detail": "Document text not yet extracted."}` | Extraction incomplete |
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 404 | `{"detail": "Document not found."}` | Wrong ID |
| 500 | `{"detail": "<AI error message>"}` | Summary generation failed |

---

### Rate Understanding

`POST /summaries/{summary_id}/understanding`

**Auth:** Bearer JWT

**Request body:**

```json
{ "rating": "yes" }
```

Valid values: `"yes"`, `"somewhat"`, `"no"`

**Success (201):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "summary_id": "550e8400-e29b-41d4-a716-446655440002",
  "rating": "yes",
  "created_at": "2026-06-08T14:30:00Z"
}
```

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 404 | `{"detail": "Summary not found."}` | Wrong summary ID |
| 422 | Validation detail array | Invalid rating value |

---

## Chat

### Ask Question (standard)

`POST /documents/{document_id}/chat`

**Auth:** Bearer JWT

**Request body:**

```json
{ "question": "What does my LDL result mean?" }
```

| Field | Required | Notes |
|---|---|---|
| `question` | Yes | 1–2000 characters |

**Success (201):**

```json
{
  "message_id": "550e8400-e29b-41d4-a716-446655440004",
  "document_id": "550e8400-e29b-41d4-a716-446655440001",
  "question": "What does my LDL result mean?",
  "answer": "Your LDL (low-density lipoprotein)...",
  "created_at": "2026-06-08T14:35:00Z",
  "disclaimer": "This answer is based only on your uploaded document. MedBridge does not provide medical advice. Please consult a healthcare provider for medical decisions."
}
```

**Errors:**

| Status | Body | When |
|---|---|---|
| 400 | `{"detail": "Document still processing. Status: extracted"}` | Document not summarized |
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 404 | `{"detail": "Document not found."}` | Wrong ID |
| 422 | Validation detail array | Empty or too-long question |
| 503 | `ErrorEnvelope` | AI timeout or unavailable (see [Error Response Formats](#error-response-formats)) |

---

### Stream Chat (SSE)

`GET /documents/{document_id}/chat/stream?message=<question>&token=<jwt>`

**Auth:** JWT via `?token=` query param (no Authorization header)

**Request body:** None

**Success (200):** `text/event-stream`

```
data: Your LDL
data:  (low-density lipoprotein)
data: [DONE]
```

| Event data | Meaning |
|---|---|
| Text chunks | Partial AI response |
| `[DONE]` | Stream complete |
| `[ERROR] <message>` | Error (document not found, still processing, AI failure) |

**Errors:** Delivered inline in the SSE stream, not as HTTP error codes (except 401 for bad token).

---

### Get Chat History

`GET /documents/{document_id}/chat`

**Auth:** Bearer JWT

**Request body:** None

**Success (200):** Array of raw database rows:

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440004",
    "health_record_id": "550e8400-e29b-41d4-a716-446655440001",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "role": "user",
    "content": "What does my LDL result mean?",
    "created_at": "2026-06-08T14:35:00Z",
    "feedback_rating": null
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440005",
    "health_record_id": "550e8400-e29b-41d4-a716-446655440001",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "role": "assistant",
    "content": "Your LDL (low-density lipoprotein)...",
    "created_at": "2026-06-08T14:35:02Z",
    "feedback_rating": null
  }
]
```

`role` is `"user"` or `"assistant"`.

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 404 | `{"detail": "Document not found."}` | Wrong ID |

---

### Rate Message

`PATCH /chat/{message_id}/rating`

**Auth:** Bearer JWT

**Request body:**

```json
{ "rating": 5 }
```

| Field | Required | Notes |
|---|---|---|
| `rating` | Yes | Integer 1–5 |

**Success (200):**

```json
{
  "message_id": "550e8400-e29b-41d4-a716-446655440005",
  "rating": 5
}
```

Feeds the AI Satisfaction Score KPI.

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 404 | `{"detail": "Message not found."}` | Wrong message ID |
| 422 | Validation detail array | Rating out of range |

---

## Appointment Prep

### Generate Prep Questions

`POST /documents/{document_id}/prep`

**Auth:** Bearer JWT

**Request body:** None

**Success (201):**

```json
{
  "prep_id": "550e8400-e29b-41d4-a716-446655440006",
  "document_id": "550e8400-e29b-41d4-a716-446655440001",
  "questions": [
    "What follow-up tests were recommended?",
    "Should I change any medications based on these results?"
  ],
  "created_at": "2026-06-08T14:40:00Z",
  "note": "These questions are generated from your document to help you prepare for a conversation with your healthcare provider. They are not medical advice."
}
```

**Errors:**

| Status | Body | When |
|---|---|---|
| 400 | `{"detail": "Document still processing."}` | Document not summarized |
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 404 | `{"detail": "Document not found."}` | Wrong ID |
| 500 | `{"detail": "<AI error message>"}` | Prep generation failed |

---

## Dashboard

### Get Dashboard

`GET /dashboard`

**Auth:** Bearer JWT

**Request body:** None

**Success (200):**

```json
{
  "user": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "patient@example.com",
    "full_name": "Jane Patient",
    "preferred_language": "en",
    "explanation_level": "plain"
  },
  "profile_complete": true,
  "documents": [
    {
      "document_id": "550e8400-e29b-41d4-a716-446655440001",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "file_name": "lab_results_june.pdf",
      "mime_type": "application/pdf",
      "file_size_bytes": 245760,
      "status": "summarized",
      "uploaded_at": "2026-06-08T14:22:00Z",
      "error_message": null
    }
  ],
  "total_documents": 12,
  "total_summaries": 8,
  "total_questions_asked": 3,
  "avg_seconds_to_summary": 45.2,
  "reading_level": {
    "total_summaries": 8,
    "avg_reading_level": 5.2,
    "at_or_below_grade_6": 7,
    "pct_on_target": 87.5
  },
  "quality": {
    "total_summaries": 8,
    "passed": 7,
    "failed": 1,
    "pass_rate_pct": 87.5
  },
  "satisfaction": {
    "rated_messages": 5,
    "avg_rating": 4.2,
    "positive": 4,
    "negative": 1
  }
}
```

`documents` is a recent subset (maximum 5 items). `reading_level`, `quality`, `satisfaction`, and `avg_seconds_to_summary` may be `null` if KPI views are unavailable.

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |

---

## Reminders

### List Reminders

`GET /reminders`

**Auth:** Bearer JWT

**Request body:** None

**Success (200):**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "health_record_id": null,
    "reminder_type": "medication",
    "title": "Take blood pressure medication",
    "body": "Take with food",
    "remind_at": "2026-06-15T08:00:00Z",
    "repeat_interval": "daily",
    "completed": false,
    "created_at": "2026-06-08T10:00:00Z"
  }
]
```

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |

---

### Create Reminder

`POST /reminders`

**Auth:** Bearer JWT

**Request body:**

```json
{
  "reminder_type": "medication",
  "title": "Take blood pressure medication",
  "body": "Take with food",
  "remind_at": "2026-06-15T08:00:00Z",
  "repeat_interval": "daily",
  "health_record_id": "550e8400-e29b-41d4-a716-446655440001"
}
```

| Field | Required | Notes |
|---|---|---|
| `reminder_type` | Yes | `"medication"`, `"appointment"`, `"follow_up"`, `"general"` |
| `title` | Yes | |
| `remind_at` | Yes | ISO 8601 datetime |
| `body` | No | |
| `repeat_interval` | No | `"daily"`, `"weekly"`, `"monthly"`, or `null` |
| `health_record_id` | No | Link to a document |

**Success (201):** Single `ReminderResponse` object (same shape as list items).

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 422 | Validation detail array | Missing required fields |
| 500 | `{"detail": "Failed to create reminder."}` | Database error |

---

### Update Reminder

`PATCH /reminders/{reminder_id}`

**Auth:** Bearer JWT

**Request body:** (all fields optional)

```json
{
  "title": "Updated title",
  "body": "Updated body",
  "remind_at": "2026-06-16T08:00:00Z",
  "repeat_interval": "weekly",
  "completed": false
}
```

**Success (200):** Updated `ReminderResponse` object.

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 404 | `{"detail": "Reminder not found."}` | Wrong ID |

---

### Complete Reminder

`POST /reminders/{reminder_id}/complete`

**Auth:** Bearer JWT

**Request body:** None

**Success (200):**

```json
{
  "reminder_id": "550e8400-e29b-41d4-a716-446655440010",
  "completed": true
}
```

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 404 | `{"detail": "Reminder not found."}` | Wrong ID |

---

### Delete Reminder

`DELETE /reminders/{reminder_id}`

**Auth:** Bearer JWT

**Request body:** None

**Success (204):** Empty body

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 404 | `{"detail": "Reminder not found."}` | Wrong ID |

---

## Trusted Contacts

### List Trusted Contacts

`GET /trusted-contacts`

**Auth:** Bearer JWT

**Request body:** None

**Success (200):**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440020",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "contact_email": "caregiver@example.com",
    "contact_name": "Maria Lopez",
    "access_level": "read",
    "status": "pending",
    "created_at": "2026-06-08T10:00:00Z"
  }
]
```

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |

---

### Add Trusted Contact

`POST /trusted-contacts`

**Auth:** Bearer JWT

**Request body:**

```json
{
  "contact_email": "caregiver@example.com",
  "contact_name": "Maria Lopez",
  "access_level": "read"
}
```

| Field | Required | Notes |
|---|---|---|
| `contact_email` | Yes | |
| `contact_name` | Yes | |
| `access_level` | No | `"read"` (default) or `"full"` |

Status starts as `"pending"`.

**Success (201):** Single `TrustedContactResponse` object.

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 422 | Validation detail array | Missing required fields |
| 500 | `{"detail": "Failed to add trusted contact."}` | Database error |

---

### Update Trusted Contact

`PATCH /trusted-contacts/{contact_id}`

**Auth:** Bearer JWT

**Request body:** (all fields optional)

```json
{
  "contact_name": "Maria Lopez",
  "access_level": "full",
  "status": "accepted"
}
```

Valid `status`: `"pending"`, `"accepted"`, `"revoked"`

**Success (200):** Updated `TrustedContactResponse` object.

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 404 | `{"detail": "Trusted contact not found."}` | Wrong ID |

---

### Remove Trusted Contact

`DELETE /trusted-contacts/{contact_id}`

**Auth:** Bearer JWT

**Request body:** None

**Success (204):** Empty body

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 404 | `{"detail": "Trusted contact not found."}` | Wrong ID |

---

## Follow-ups

### List Follow-ups

`GET /documents/{document_id}/follow-ups`

**Auth:** Bearer JWT

**Request body:** None

**Success (200):**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440030",
    "health_record_id": "550e8400-e29b-41d4-a716-446655440001",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "what": "Schedule follow-up blood test",
    "when_text": "Within 2 weeks",
    "due_date": "2026-06-28",
    "completed": false,
    "created_at": "2026-06-08T10:00:00Z"
  }
]
```

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |

---

### Create Follow-up

`POST /documents/{document_id}/follow-ups`

**Auth:** Bearer JWT

**Request body:**

```json
{
  "health_record_id": "550e8400-e29b-41d4-a716-446655440001",
  "what": "Schedule follow-up blood test",
  "when_text": "Within 2 weeks",
  "due_date": "2026-06-28"
}
```

| Field | Required | Notes |
|---|---|---|
| `health_record_id` | Yes (schema) | Required by OpenAPI schema; router uses path `{document_id}` and ignores this field |
| `what` | Yes | Action description |
| `when_text` | No | Human-readable timing |
| `due_date` | No | ISO date (`YYYY-MM-DD`) |

**Success (201):** Single `FollowUpResponse` object.

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 422 | Validation detail array | Missing `health_record_id` or `what` |
| 500 | `{"detail": "Failed to create follow-up."}` | Database error |

---

### Update Follow-up

`PATCH /follow-ups/{followup_id}`

**Auth:** Bearer JWT

**Request body:** (all fields optional)

```json
{
  "what": "Reschedule blood test",
  "when_text": "Next month",
  "due_date": "2026-07-28",
  "completed": true
}
```

**Success (200):** Updated `FollowUpResponse` object.

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 404 | `{"detail": "Follow-up not found."}` | Wrong ID |

---

### Complete Follow-up

`POST /follow-ups/{followup_id}/complete`

**Auth:** Bearer JWT

**Request body:** None

**Success (200):**

```json
{
  "followup_id": "550e8400-e29b-41d4-a716-446655440030",
  "completed": true
}
```

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 404 | `{"detail": "Follow-up not found."}` | Wrong ID |

---

### Delete Follow-up

`DELETE /follow-ups/{followup_id}`

**Auth:** Bearer JWT

**Request body:** None

**Success (204):** Empty body

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 404 | `{"detail": "Follow-up not found."}` | Wrong ID |

---

## Providers

### List Providers

`GET /providers`

**Auth:** Bearer JWT

**Request body:** None

**Success (200):**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440040",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Dr. Sarah Chen",
    "specialty": "Cardiology",
    "phone": "555-123-4567",
    "address": "123 Medical Center Dr",
    "fhir_provider_id": null,
    "created_at": "2026-06-08T10:00:00Z"
  }
]
```

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |

---

### Add Provider

`POST /providers`

**Auth:** Bearer JWT

**Request body:**

```json
{
  "name": "Dr. Sarah Chen",
  "specialty": "Cardiology",
  "phone": "555-123-4567",
  "address": "123 Medical Center Dr",
  "fhir_provider_id": null
}
```

| Field | Required | Notes |
|---|---|---|
| `name` | Yes | |
| `specialty` | No | |
| `phone` | No | |
| `address` | No | |
| `fhir_provider_id` | No | Epic FHIR provider ID |

**Success (201):** Single `ProviderResponse` object.

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 422 | Validation detail array | Missing `name` |
| 500 | `{"detail": "Failed to add provider."}` | Database error |

---

### Update Provider

`PATCH /providers/{provider_id}`

**Auth:** Bearer JWT

**Request body:** (all fields optional)

```json
{ "phone": "555-999-0000" }
```

**Success (200):** Updated `ProviderResponse` object.

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 404 | `{"detail": "Provider not found."}` | Wrong ID |

---

### Delete Provider

`DELETE /providers/{provider_id}`

**Auth:** Bearer JWT

**Request body:** None

**Success (204):** Empty body

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 404 | `{"detail": "Provider not found."}` | Wrong ID |

---

## Resources (Discover)

Shared content — not per-user. Read-only.

### List Resources

`GET /resources`  
`GET /resources?resource_type=article`  
`GET /resources?tag=diabetes`

**Auth:** Bearer JWT

**Request body:** None

**Query params:**

| Param | Required | Notes |
|---|---|---|
| `resource_type` | No | Filter by type |
| `tag` | No | Filter by tag (client-side filter on `tags` array) |

**Success (200):**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440050",
    "title": "Understanding Your Lab Results",
    "description": "A plain-language guide...",
    "url": "https://example.com/lab-guide",
    "resource_type": "article",
    "tags": ["lab results", "general"],
    "condition_codes": ["Z00.00"],
    "created_at": "2026-06-01T00:00:00Z"
  }
]
```

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |

---

### Get Resource

`GET /resources/{resource_id}`

**Auth:** Bearer JWT

**Request body:** None

**Success (200):** Single `ResourceResponse` object.

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 404 | `{"detail": "Resource not found."}` | Wrong ID |

---

## Health Scores

Scores patient engagement with the care plan — NOT a clinical health assessment.

### List Health Scores

`GET /health-scores`

**Auth:** Bearer JWT

**Request body:** None

**Success (200):**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440060",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "health_record_id": "550e8400-e29b-41d4-a716-446655440001",
    "score": 72.5,
    "score_label": "Good",
    "rationale": "Your care plan has clear medication instructions but is missing a scheduled follow-up appointment.",
    "scored_at": "2026-06-08T15:00:00Z",
    "created_at": "2026-06-08T15:00:00Z"
  }
]
```

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |

---

### Generate Health Score

`POST /documents/{document_id}/health-score`

**Auth:** Bearer JWT

**Request body:** None

**Success (201):** Single `HealthScoreResponse` object.

Valid `score_label` values: `"Excellent"` (80–100), `"Good"` (60–79), `"Needs Attention"` (40–59), `"Critical"` (0–39)

**Errors:**

| Status | Body | When |
|---|---|---|
| 400 | `{"detail": "Document still processing."}` | Document not summarized |
| 400 | `{"detail": "Document text not available."}` | No extracted text |
| 401 | `{"detail": "Invalid or expired token"}` | Missing or bad JWT |
| 404 | `{"detail": "Document not found."}` | Wrong ID |
| 500 | `{"detail": "Health score generation failed."}` | AI error |

---

## User Settings (Feature Toggles)

Profile screen toggles: Reminders, Trusted Contacts, MyChart.

> **Note:** This is separate from [Analytics Settings](#analytics-settings-preferences). See [Contract Review Notes](#contract-review-notes).

### Get User Settings

`GET /user-settings/?user_id={user_id}`

**Auth:** `user_id` query param (UUID) — **no JWT required**

**Request body:** None

**Success (200):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440070",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "allow_trusted_contacts": true,
  "allow_mychart_integration": false,
  "enable_reminders": true,
  "updated_at": "2026-06-08T10:00:00Z"
}
```

Creates a default row if none exists.

**Errors:**

| Status | Body | When |
|---|---|---|
| 422 | Validation detail array | Invalid `user_id` format |

---

### Update User Settings

`PATCH /user-settings/?user_id={user_id}`

**Auth:** `user_id` query param (UUID) — **no JWT required**

**Request body:** (all fields optional)

```json
{
  "allow_trusted_contacts": true,
  "allow_mychart_integration": false,
  "enable_reminders": true
}
```

**Success (200):** Updated `UserSettingsResponse` object.

**Errors:**

| Status | Body | When |
|---|---|---|
| 400 | `{"detail": "No fields provided to update"}` | Empty PATCH body |
| 404 | `{"detail": "Settings not found"}` | No settings row |
| 422 | Validation detail array | Invalid `user_id` or field values |

---

## Analytics

All `/analytics/*` endpoints require `Authorization: Bearer <token>`. See [Contract Review Notes](#contract-review-notes) for auth behavior details.

### Submit Feedback

`POST /analytics/feedback`

**Auth:** Bearer token

**Request body:**

```json
{
  "summary_id": "550e8400-e29b-41d4-a716-446655440002",
  "rating": 4,
  "feedback_text": "Very helpful summary"
}
```

| Field | Required | Notes |
|---|---|---|
| `summary_id` | Yes | UUID |
| `rating` | Yes | Integer 1–5 |
| `feedback_text` | No | Free text |

**Success (201):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440080",
  "status": "recorded"
}
```

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid token"}` | Auth failure |
| 422 | Validation detail array | Invalid fields |
| 500 | `{"detail": "<error>"}` | Database error |

---

### Log Event

`POST /analytics/events`

**Auth:** Bearer token

**Request body:**

```json
{
  "event_type": "summary_viewed",
  "event_category": "engagement",
  "event_data": { "document_id": "550e8400-e29b-41d4-a716-446655440001" },
  "session_id": "sess-abc123",
  "response_time_ms": 250,
  "success": true
}
```

| Field | Required | Notes |
|---|---|---|
| `event_type` | Yes | e.g. `"document_uploaded"`, `"question_asked"`, `"summary_viewed"` |
| `event_category` | Yes | e.g. `"engagement"`, `"navigation"` |
| `event_data` | No | Arbitrary key-value object |
| `session_id` | No | Session identifier |
| `response_time_ms` | No | Response time in milliseconds |
| `success` | No | Defaults to `true` |

**Success (201):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440081",
  "status": "logged"
}
```

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid token"}` | Auth failure |
| 422 | Validation detail array | Missing required fields |
| 500 | `{"detail": "<error>"}` | Database error |

---

### Analytics Settings (Preferences)

`GET /analytics/settings`  
`PATCH /analytics/settings`

**Auth:** Bearer token

User preferences and accessibility — separate from [User Settings (Feature Toggles)](#user-settings-feature-toggles).

#### Get Settings

`GET /analytics/settings`

**Request body:** None

**Success (200):** Full `user_settings` table row, or if no row exists:

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "settings": {}
}
```

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid token"}` | Auth failure |
| 500 | `{"detail": "<error>"}` | Database error |

#### Update Settings

`PATCH /analytics/settings`

**Request body:** (all fields optional)

```json
{
  "preferred_language": "es",
  "accessibility_mode": true,
  "low_bandwidth_mode": false,
  "notification_enabled": true
}
```

**Success (200):**

```json
{
  "status": "updated",
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Errors:**

| Status | Body | When |
|---|---|---|
| 400 | `{"detail": "No fields to update"}` | Empty PATCH body |
| 401 | `{"detail": "Invalid token"}` | Auth failure |
| 500 | `{"detail": "<error>"}` | Database error |

---

### Patient Dashboard

`GET /analytics/dashboard/patient`

**Auth:** Bearer token

**Request body:** None

**Success (200):**

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "scores": {
    "understanding_score": 0.75,
    "confidence_score": 0.8,
    "feature_adoption_score": 0.5,
    "patient_activation_score": 0.75,
    "digital_equity_score": 0.33,
    "data_quality_score": 0.9
  },
  "generated_at": "2026-06-08T16:00:00Z"
}
```

All scores are floats 0.0–1.0.

**Errors:**

| Status | Body | When |
|---|---|---|
| 401 | `{"detail": "Invalid token"}` | Auth failure |
| 500 | `{"detail": "<error>"}` | Database error |

---

### Stakeholder Dashboard

`GET /analytics/dashboard/stakeholder`

**Auth:** Bearer token (no role-based access control — internal/stakeholder use only)

**Request body:** None

**Success (200):**

```json
{
  "total_active_users": 42,
  "total_documents_uploaded": 156,
  "total_summaries_viewed": 312,
  "average_feedback_rating": 4.2,
  "total_errors_logged": 3,
  "generated_at": "2026-06-08T16:00:00Z"
}
```

**Errors:**

| Status | Body | When |
|---|---|---|
| 500 | `{"detail": "<error>"}` | Database error |

---

### Team Dashboard

`GET /analytics/dashboard/team`

**Auth:** Bearer token (no role-based access control — internal/team use only)

**Request body:** None

**Success (200):**

```json
{
  "feature_usage": [
    { "category": "engagement", "count": 245 },
    { "category": "navigation", "count": 180 }
  ],
  "daily_events_7d": [
    { "date": "2026-06-02", "events": 35 },
    { "date": "2026-06-03", "events": 42 }
  ],
  "generated_at": "2026-06-08T16:00:00Z"
}
```

**Errors:**

| Status | Body | When |
|---|---|---|
| 500 | `{"detail": "<error>"}` | Database error |

---

### Provider Readiness Dashboard

`GET /analytics/dashboard/provider-readiness`

**Auth:** Bearer token

**Request body:** None

**Success (200):**

```json
{
  "appointment_prep_views": 28,
  "follow_up_completion_rate": 0.65,
  "reminders_sent": 45,
  "generated_at": "2026-06-08T16:00:00Z"
}
```

**Errors:**

| Status | Body | When |
|---|---|---|
| 500 | `{"detail": "<error>"}` | Database error |

---

## Contract Review Notes

Items for the frontend team to review and align their code against. Listed here only — no GitHub issues filed.

### Two Settings APIs

| Endpoint | Purpose | Auth | Fields |
|---|---|---|---|
| `GET/PATCH /user-settings/?user_id=` | Feature toggles (Profile screen) | `user_id` query param, no JWT | `allow_trusted_contacts`, `allow_mychart_integration`, `enable_reminders` |
| `GET/PATCH /analytics/settings` | User preferences / accessibility | Bearer token | `preferred_language`, `accessibility_mode`, `low_bandwidth_mode`, `notification_enabled` |

Both touch the `user_settings` table but expose different field subsets.

### Analytics Auth Behavior

`/analytics/*` endpoints use a non-standard auth helper (`get_user_id`) that looks up `auth.users` where `id::text = <token>`. This expects the raw user UUID as the Bearer token, **not** a Supabase JWT. Standard JWT auth via `get_current_user` is used by all other protected routes. Frontend must verify which token format works with analytics endpoints in their environment.

### Follow-up Create: Redundant `health_record_id`

The `FollowUpCreate` schema requires `health_record_id` in the request body, but the router derives it from the URL path `{document_id}` and ignores the body value. Frontend should send `health_record_id` matching the path `document_id` to pass validation.

### Frontend Type Drift

The frontend TypeScript types in `app-frontend/src/types/features.ts` have known mismatches with backend schemas:

| Issue | Backend (correct) | Frontend (current) |
|---|---|---|
| Duplicate `ReminderCreate` / `ReminderResponse` | Single shape in `features.py` | Two conflicting interface definitions |
| `TrustedContactUpdate` field name | `access_level` | `contact_level` (typo) |
| `ResourceResponse.tags` | `string[]` (array) | `string` |
| `ResourceResponse.condition_codes` | `string[]` (array) | `string` |

### Resources URL Bug (frontend-side)

`app-frontend/src/api/resources.queries.ts` falls back to relative `"/resources"` when no query filters are passed, instead of the full `http://localhost:8000/resources` URL used by all other query files.

### Chat Message Rating

`PATCH /chat/{message_id}/rating` is implemented and documented. Frontend wiring status should be confirmed by the team.

### Stakeholder/Team Dashboards

`GET /analytics/dashboard/stakeholder` and `GET /analytics/dashboard/team` have no role-based access control. Any caller with a valid analytics token can access aggregate data. Treat as internal/stakeholder-only in the UI.

### JWT Storage

This doc recommends in-memory JWT storage. The current frontend implementation stores the token in a cookie (`auth_token`). Either approach works with the API; the frontend team should align on their preferred strategy.

### Error Parsing

Most endpoints return `{"detail": "..."}`. Only `POST /documents/{document_id}/chat` returns `ErrorEnvelope` on 503. The frontend `apiHelper` currently reads `errorData.message` — it will not parse standard FastAPI `detail` errors correctly unless updated.

---
