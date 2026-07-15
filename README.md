# MedBridge — Backend

AI-Powered Patient Health Companion — Backend API

## Project Information

**Project Name:** MedBridge  
**Team Name:** Team 2 (Disco)  
**Cohort / Sprint:** Tech Residency 43 / Sprint 1–2  
**Team Members:** Kathy Matos Linares, Kyle Babington, James Hightower, Mary Fobbs-Guillory, Melodie Fan, Riman Bastola  
**Tech Stack:** Python 3.11+, FastAPI, Supabase (PostgreSQL), Groq API (Llama 3.3 70B), SMART on FHIR / Epic sandbox, Render

## Project Overview

MedBridge helps patients understand their health records through AI-powered summaries, chat, and care coordination tools.

- **Problem:** Medical documents are dense and hard for patients to interpret on their own.
- **Target user:** Patients managing chronic conditions who need plain-language explanations of labs, medications, and visit notes.
- **Core features completed:** Document upload (PDF/OCR), AI summaries, document chat, reminders, care team contacts, follow-ups, provider resources, user settings, analytics/KPI dashboards, and Row Level Security across all tables.

## Setup & Documentation

- **Clone:** `git clone https://github.com/Coding-Temple-Tech-Residency/MedBridge-B.git`
- **Setup guide:** See [docs/TEAMMATE_SETUP.md](docs/TEAMMATE_SETUP.md)
- **Environment variables:** Copy `.env.example` to `.env` and fill in Supabase + Groq credentials (never commit `.env`)
- **API documentation:** Run `cd app-backend && uvicorn app.main:app --reload` and open `http://localhost:8000/docs`, or see [docs/FRONTEND_API.md](docs/FRONTEND_API.md)
- **Postman:** Import `app-backend/postman/MedBridge-API.postman_collection.json` and `app-backend/postman/MedBridge-Local.postman_environment.json`
- **Migrations:** Run SQL files in `app-backend/migrations/` in order (001 through 008; note two files share the `006` prefix: `006_user_settings.sql` and `006_app_events.sql`) in the Supabase SQL Editor

- ## Deployment
This project is deployed on Vercel and Render (free tier) — link TBD. Pushes to `main` trigger production deployments.

## Project Structure

    MedBridge-B/
      app-backend/          Backend API, tests, migrations, and tooling
        app/                FastAPI application package
        migrations/         SQL schema migrations (run in order)
        tests/              Unit, integration, and security tests
        seed/               Synthea synthetic data loader
        data/               FHIR mapper, data inspector, verifier
        postman/            API collection for local testing
      app-frontend/         React frontend
      docs/                 Setup guides and API documentation

## Running integration tests

Integration and security tests call a live FastAPI server against a real Supabase test project.

1. Start the server: `cd app-backend && uvicorn app.main:app --reload`
2. Point `.env` at a **test** Supabase project (not production)
3. Create test users (one-time):
   - `POST /auth/register` with the emails/passwords from `.env.example` (`TEST_USER_A_*`, `TEST_USER_B_*`), or
   - create users in the Supabase Auth dashboard
4. Create the Supabase Storage bucket `medical-documents` (private) in the Storage dashboard
5. If Supabase requires email confirmation, disable it for the test project or confirm users manually — otherwise login returns 401
6. Run: `cd app-backend && pytest tests/integration/ -v --timeout=60`

If POST routes return 500 after pulling code changes, restart the server so middleware updates are loaded.

---

## Team

| Name                | Role                     |
| ------------------- | ------------------------ |
| Kathy Matos Linares | Backend + Data Analytics |
| Kyle Babington      | Backend                  |
| James Hightower     | Frontend                 |
| Mary Fobbs-Guillory | Frontend                 |
| Melodie Fan         | Frontend                 |
| Riman Bastola       | Cybersecurity            |

## Notes

- Synthea synthetic data and Epic FHIR sandbox connection are in progress.
- `app-backend/sample_responses/api_responses.json` contains placeholder shapes; real data loading may adjust response fields slightly.
- Two migration files share the `006` prefix: run `006_user_settings.sql` and `006_app_events.sql` after 005.
- Backend server-side operations require `SUPABASE_SERVICE_ROLE_KEY` in `.env` (server only — never expose to frontend).

## Development Standards Reminder

All submissions should reflect professional engineering standards:

- Write clean, readable, and modular code
- Use clear naming conventions
- Remove unused files, variables, and console logs
- Follow consistent formatting and linting practices
- Write meaningful commit messages
- Keep branches organized and avoid pushing broken code to main
- Review teammate pull requests respectfully and constructively

Your repository should be organized, understandable, and demo-ready.

## Intellectual Property Notice

This project was created as part of a Coding Temple Tech Residency. All work produced during the residency is considered the intellectual property of Coding Temple or the sponsoring employer, unless otherwise stated in a signed agreement. By contributing to this project, you acknowledge and agree to these terms.

Tech Residency 43 — Coding Temple — June–July 2026
