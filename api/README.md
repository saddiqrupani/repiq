# RepIQ API

FastAPI backend for the RepIQ mobile app. Verifies Supabase-issued JWTs and exposes app endpoints.

## First-time setup

```bash
cd api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

## Run

```bash
cd api
source .venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Sanity check: `curl http://127.0.0.1:8000/health` → `{"status":"ok"}`.

## Auth

Every protected route depends on `current_user`, which verifies the `Authorization: Bearer <supabase JWT>` header against `SUPABASE_JWT_SECRET` (HS256, audience `authenticated`).
