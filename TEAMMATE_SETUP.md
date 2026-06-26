# Teammate Setup � MedBridge Backend

## 1. Create virtual environment

python -m venv .venv
.\.venv\Scripts\Activate.ps1

## 2. Install dependencies

pip install -r requirements.txt

## 3. Create environment file

copy .env.example .env

Fill in the credentials provided privately.

Required variables:

- SUPABASE_URL
- SUPABASE_ANON_KEY
- DATABASE_URL
- GROQ_API_KEY

## 4. Start the FastAPI server

uvicorn app.main:app --reload

Then open:

http://127.0.0.1:8000/docs

## 5. Run integration tests

pytest tests/integration/ -v --timeout=60

If anything fails, copy the full error output.
# MedBridge — Teammate Setup Guide

Welcome to the MedBridge backend. This gets you connected in about 20 minutes.

---

## Current Status

Done:

- Database schema — 10 tables, all with Row Level Security
- Loader scripts written — synthea_loader.py, fhir_mapper.py
- FHIR OAuth spike written — ready to connect to Epic sandbox

Still in progress:

- Synthea synthetic data (not loaded yet)
- Epic FHIR sandbox connection (not connected yet)
- api_responses.json — placeholder only, will be rewritten with real data

---

## Step 1: Get Supabase credentials

Ask Kathy for:

- Supabase project URL
- Anon key
- DATABASE_URL (backend devs only — keep private, never share in channel)

These go in your .env file. NEVER commit them to GitHub.

---

## Step 2: Clone the repo and set up Python

Windows PowerShell:
git clone https://github.com/Coding-Temple-Tech-Residency/MedBridge-B.git
cd MedBridge-B
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt

Mac/Linux:
git clone https://github.com/Coding-Temple-Tech-Residency/MedBridge-B.git
cd MedBridge-B
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

---

## Step 3: Configure environment

Windows:
Copy-Item .env.example .env

Mac/Linux:
cp .env.example .env

Fill in the values Kathy shared with you via DM.

---

## For frontend developers

You do NOT need Python or the database to start building.

Check sample_responses/api_responses.json for the current API
response shapes. Note these are placeholders until real Synthea
and Epic data is loaded — shapes may change slightly.

Local backend URL: http://localhost:8000
Auth header required: Authorization: Bearer <supabase_jwt>

---

## For backend developers

The FastAPI app will live in app/. Sprint 1 endpoints:

POST /documents Upload PDF
GET /documents List user records
GET /documents/{id} Full record with clinical data
POST /documents/{id}/summarize Trigger Groq summary
GET /documents/{id}/chat Chat history
POST /documents/{id}/chat Send message
DELETE /documents/{id} Delete record

All endpoints verify the Supabase JWT from the Authorization header.
Never trust a user_id from the request body.

---

## Questions?

Post in the Disco team channel or message Kathy directly.
