# MedBridge — Frontend API Reference

Everything the frontend team needs to connect to the backend.
You do not need Python, Supabase, or any backend setup.

**Local backend:** `http://localhost:8000`
**Interactive docs:** `http://localhost:8000/docs`

---

## Authentication

Every request except `/auth/register` and `/auth/login` requires:

```
Authorization: Bearer <supabase_jwt>
```

Store the JWT in memory (not localStorage). On 401, redirect to login. On logout, call `POST /auth/logout` before clearing the token (see below).

---

## Auth Endpoints

### Register

```
POST /auth/register
Content-Type: application/json

{ "email": "patient@example.com", "password": "securepassword" }
```

### Login

```
POST /auth/login
Content-Type: application/json

{ "email": "patient@example.com", "password": "securepassword" }
```

Response:

```json
{ "access_token": "<jwt>", "token_type": "bearer", "user_id": "<uuid>", "email": "patient@example.com" }
```

### Logout

```
POST /auth/logout
Authorization: Bearer <jwt>
```

Response: `204 No Content` (empty body)

**Frontend logout flow (required):**

1. Call `POST /auth/logout` with the current Bearer token (best-effort — use `try/finally` so local cleanup always runs).
2. Clear the JWT from in-memory auth state (React context, Zustand, etc.) — never `localStorage`.
3. Clear cached user-specific data (documents, chat, settings).
4. Redirect to the login route.
5. If the token is already expired (401 from logout), skip or ignore the API error — still clear locally and redirect.

**Security note:** Supabase access JWTs remain cryptographically valid until their `exp` time even after logout. Client-side token discard plus server-side refresh-token revocation is the intended protection for normal logout (especially on shared devices).

Example:

```javascript
async function logout() {
  const token = getAccessToken(); // from in-memory auth state
  try {
    if (token) {
      await fetch("http://localhost:8000/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } finally {
    clearAccessToken();
    clearUserState();
    window.location.href = "/login";
  }
}
```

---

## Document Endpoints

### Upload

```
POST /documents/upload
Authorization: Bearer <jwt>
Content-Type: multipart/form-data

file: <pdf or image>
```

Response (201):

```json
{ "document_id": "uuid", "status": "uploaded" }
```

- Accepts PDF, JPG, PNG including phone photos (OCR handles them)
- Processing is async — poll GET /documents/{id} until status = "summarized"

### List

```
GET /documents
Authorization: Bearer <jwt>
```

### Get one

```
GET /documents/{document_id}
Authorization: Bearer <jwt>
```

### Delete

```
DELETE /documents/{document_id}
Authorization: Bearer <jwt>
```

Response: 204 No Content

---

## Document Status Flow

```
uploaded → extracted → summarized
```

Show a loading indicator until status is `summarized` before enabling summary or chat.

---

## Summary Endpoints

### Get summary

```
GET /documents/{document_id}/summary
Authorization: Bearer <jwt>
```

Response (200):

```json
{
  "summary_id": "uuid",
  "document_id": "uuid",
  "summary_text": "Your lab results show...",
  "created_at": "..."
}
```

- Returns 202 if still generating — retry after 3 seconds
- All summaries written at 6th-grade reading level
- Medical terms explained inline

### Rate understanding

```
POST /summaries/{summary_id}/understanding
Authorization: Bearer <jwt>
Content-Type: application/json

{ "rating": "yes" }
```

Valid values: "yes", "somewhat", "no"

---

## Chat Endpoints

### Standard chat (full response, waits for complete answer)

```
POST /documents/{document_id}/chat
Authorization: Bearer <jwt>
Content-Type: application/json

{ "question": "What does my LDL result mean?" }
```

Response (201):

```json
{
  "message_id": "uuid",
  "document_id": "uuid",
  "question": "What does my LDL result mean?",
  "answer": "Your LDL (low-density lipoprotein)...",
  "created_at": "..."
}
```

If the patient asks "tell me more" or "explain more", the AI automatically
returns a longer response.

### Streaming chat (recommended — shows response as it generates)

Better perceived performance on slow/cellular connections.

```
GET /documents/{document_id}/chat/stream?message=<question>&token=<jwt>
```

No Authorization header needed — pass JWT as `?token=` query param.
EventSource cannot send custom headers.

```javascript
function streamChat(documentId, message, token, onChunk, onDone, onError) {
  const params = new URLSearchParams({ message, token });
  const url = `http://localhost:8000/documents/${documentId}/chat/stream?${params}`;
  const source = new EventSource(url);

  source.onmessage = (event) => {
    if (event.data === '[DONE]') { source.close(); onDone(); return; }
    if (event.data.startsWith('[ERROR]')) {
      source.close();
      onError(event.data.replace('[ERROR] ', ''));
      return;
    }
    onChunk(event.data);
  };

  source.onerror = () => {
    source.close();
    onError('Connection lost. Please check your connection and try again.');
  };

  return () => source.close();
}
```

React usage:

```javascript
const [response, setResponse] = useState('');
const [loading, setLoading] = useState(false);

function handleSend(message) {
  setResponse('');
  setLoading(true);
  streamChat(
    documentId, message, token,
    (chunk) => setResponse(prev => prev + chunk),
    () => setLoading(false),
    (err) => { setResponse('Something went wrong. Please try again.'); setLoading(false); }
  );
}
```

### Get chat history

```
GET /documents/{document_id}/chat
Authorization: Bearer <jwt>
```

Returns array of `{ id, role, content, created_at }` — role is "user" or "assistant".

### Rate a message — OPEN TICKET (James)

```
PATCH /chat/{message_id}/rating
Authorization: Bearer <jwt>
Content-Type: application/json

{ "rating": 5 }
```

Valid: 1-5 integer. Feeds the AI Satisfaction Score KPI. Wire to a star or thumbs widget.

---

## Appointment Prep

```
POST /documents/{document_id}/prep
Authorization: Bearer <jwt>
```

Response (201):

```json
{
  "prep_id": "uuid",
  "document_id": "uuid",
  "questions": ["What follow-up tests were recommended?"],
  "created_at": "..."
}
```

---

## Dashboard

```
GET /dashboard
Authorization: Bearer <jwt>
```

Response:

```json
{
  "documents": [...],
  "total_documents": 3,
  "total_summaries": 3,
  "total_questions_asked": 12
}
```

---

## Error Responses

All errors return a consistent envelope — never a blank screen:

```json
{
  "success": false,
  "error_code": "GROQ_TIMEOUT",
  "message": "The AI is taking longer than usual. Please try again in a moment.",
  "retry_after": 5
}
```

| error_code | When | What to show |
|---|---|---|
| GROQ_TIMEOUT | AI slow | Message + retry button after retry_after seconds |
| GROQ_UNAVAILABLE | AI down | Message + retry button |
| DOC_NOT_FOUND | Wrong/deleted ID | Redirect to document list |
| EXTRACTION_FAILED | Unreadable file | Ask for clearer photo or different format |
| UNAUTHORIZED | JWT expired | Redirect to login |

---

## Health Check

```
GET /health
```

No auth. Returns `{ "status": "ok" }`.
Call this on app startup to confirm backend is reachable before showing the UI.

---

## Questions?

Post in the Discord team channel or DM Kathy.

---

## Reminders

### List reminders

```
GET /reminders
Authorization: Bearer <jwt>
```

### Create reminder

```
POST /reminders
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "reminder_type": "medication",
  "title": "Take blood pressure medication",
  "body": "Take with food",
  "remind_at": "2026-06-15T08:00:00Z",
  "repeat_interval": "daily",
  "health_record_id": "uuid (optional)"
}
```

Valid reminder_type: "medication", "appointment", "follow_up", "general"
Valid repeat_interval: "daily", "weekly", "monthly", null

### Update reminder

```
PATCH /reminders/{reminder_id}
Authorization: Bearer <jwt>
Content-Type: application/json

{ "title": "Updated title", "completed": false }
```

### Complete reminder

```
POST /reminders/{reminder_id}/complete
Authorization: Bearer <jwt>
```

### Delete reminder

```
DELETE /reminders/{reminder_id}
Authorization: Bearer <jwt>
```

Response: 204 No Content

---

## Trusted Contacts (Caregiver Access)

### List trusted contacts

```
GET /trusted-contacts
Authorization: Bearer <jwt>
```

### Add trusted contact

```
POST /trusted-contacts
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "contact_email": "caregiver@example.com",
  "contact_name": "Maria Lopez",
  "access_level": "read"
}
```

Valid access_level: "read", "full"
Status starts as "pending" until the contact accepts.

### Update contact

```
PATCH /trusted-contacts/{contact_id}
Authorization: Bearer <jwt>
Content-Type: application/json

{ "access_level": "full", "status": "accepted" }
```

Valid status: "pending", "accepted", "revoked"

### Remove contact

```
DELETE /trusted-contacts/{contact_id}
Authorization: Bearer <jwt>
```

Response: 204 No Content

---

## Follow-ups

### List follow-ups for a document

```
GET /documents/{document_id}/follow-ups
Authorization: Bearer <jwt>
```

### Create follow-up

```
POST /documents/{document_id}/follow-ups
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "what": "Schedule follow-up blood test",
  "when_text": "Within 2 weeks",
  "due_date": "2026-06-28"
}
```

### Update follow-up

```
PATCH /follow-ups/{followup_id}
Authorization: Bearer <jwt>
Content-Type: application/json

{ "completed": true }
```

### Complete follow-up

```
POST /follow-ups/{followup_id}/complete
Authorization: Bearer <jwt>
```

### Delete follow-up

```
DELETE /follow-ups/{followup_id}
Authorization: Bearer <jwt>
```

---

## Providers (Care Team)

### List providers

```
GET /providers
Authorization: Bearer <jwt>
```

### Add provider

```
POST /providers
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "name": "Dr. Sarah Chen",
  "specialty": "Cardiology",
  "phone": "555-123-4567",
  "address": "123 Medical Center Dr"
}
```

### Update provider

```
PATCH /providers/{provider_id}
Authorization: Bearer <jwt>
Content-Type: application/json

{ "phone": "555-999-0000" }
```

### Delete provider

```
DELETE /providers/{provider_id}
Authorization: Bearer <jwt>
```

---

## Resources (Discover Section)

Shared content — not per-user. Read-only.

### List resources

```
GET /resources
GET /resources?resource_type=article
GET /resources?tag=diabetes
Authorization: Bearer <jwt>
```

### Get one resource

```
GET /resources/{resource_id}
Authorization: Bearer <jwt>
```

Response:

```json
{
  "id": "uuid",
  "title": "Understanding Your Lab Results",
  "description": "A plain-language guide...",
  "url": "https://...",
  "resource_type": "article",
  "tags": ["lab results", "general"],
  "condition_codes": ["Z00.00"],
  "created_at": "..."
}
```

---

## Health Scores

### List health scores

```
GET /health-scores
Authorization: Bearer <jwt>
```

### Generate health score from document

```
POST /documents/{document_id}/health-score
Authorization: Bearer <jwt>
```

Response (201):

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "health_record_id": "uuid",
  "score": 72.5,
  "score_label": "Good",
  "rationale": "Your care plan has clear medication instructions but is missing a scheduled follow-up appointment.",
  "scored_at": "...",
  "created_at": "..."
}
```

Valid score_label values: "Excellent" (80-100), "Good" (60-79), "Needs Attention" (40-59), "Critical" (0-39)

Note: This scores patient engagement with the care plan — NOT a clinical health assessment.
