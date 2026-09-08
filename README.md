# RepIQ

A social fitness app that scores your lifts with computer vision and quizzes you on your own form corrections.

React Native (Expo SDK 57) · FastAPI · Supabase (Postgres + Auth + Storage) · MediaPipe · OpenAI

---

## What it does

- **Log workouts** — pick exercises, log sets (weight / reps / RPE), rest timer with presets and overtime, saved templates for repeat sessions.
- **Personal records** — Postgres triggers compute Epley-formula est-1RM on every set, upsert into a PR table, and notify the athlete.
- **Progression charts** — per-exercise est-1RM trend lines on the progress screen.
- **Form check** — upload a lift video, backend runs MediaPipe pose estimation over the clip, rubric-based scorer produces a 0–100 score and specific coaching feedback bullets, returns an annotated video.
- **AI coach quiz** — after a form check, `POST /form/{id}/quiz` sends the exercise, score, and feedback bullets to OpenAI (`gpt-4o-mini`) with a strict JSON schema and gets back a 3-question multiple-choice quiz that reinforces the *specific* corrections from that analysis. Answers are graded in the sheet with per-question explanations.
- **Gym social feed** — join a gym, share finished workouts to your gym's feed, react + comment, follow other lifters, unread notifications tab with badge counts.
- **Gym challenges** — time-boxed goals (e.g. "10 workouts in 30 days") that any gym member can join and progress against.

## Stack

**Mobile (`src/`)**
- Expo SDK 57, expo-router file-based routing, React 19, TypeScript
- NativeWind (Tailwind for RN) for styling
- TanStack Query for server state, Zustand for client-only state (rest timer, active workout UI)
- Supabase JS client (auth + direct table reads via RLS)

**Backend (`api/`)**
- FastAPI + PyJWT (Supabase JWT verification, HS256)
- MediaPipe Pose (33 landmarks) for pose extraction, OpenCV for video decode + annotation
- OpenAI SDK with structured outputs (`response_format: json_schema, strict: true`)
- Forwards the caller's JWT to Supabase REST — RLS scopes every query without an extra `where user_id = ?` check in Python

**Data (`supabase/`)**
- Postgres via Supabase CLI + Docker for local dev
- Row-level security on every user-owned table
- PL/pgSQL triggers for PR detection, notification fan-out, and profile bootstrap
- Storage bucket for lift videos (private, signed URLs)

## Repo layout

```
src/                            # Expo app
  app/                          # expo-router routes
    (auth)/                     # sign-in / sign-up
    (tabs)/                     # home / log / notifications / profile
    workout/[id].tsx            # finished workout detail
    form-check/[id].tsx         # form analysis + quiz sheet
    gym/[id].tsx, post/[id].tsx, user/[id].tsx, challenge/[id].tsx
    templates.tsx, progress.tsx, exercise-picker.tsx
  components/                   # Button, FeedCard, RestTimerBar, QuizSheet, ...
  hooks/                        # useSession, useWorkouts, useFormAnalysis, ...
  lib/db/                       # thin data-access layer over supabase-js
  stores/                       # zustand stores
api/
  app/main.py                   # FastAPI entrypoint
  app/auth.py                   # Supabase JWT verification
  app/form.py                   # POST /form/analyze (upload → pose → score)
  app/pose.py                   # MediaPipe pose extraction
  app/scoring.py                # rubric scoring per exercise
  app/quiz.py                   # POST /form/{id}/quiz (OpenAI)
supabase/
  migrations/                   # SQL migrations, applied by `supabase db reset`
  config.toml
```

## Local dev (three terminals)

Prereqs: Node 20+, Xcode + iOS simulator, Python 3.12, Docker Desktop, Supabase CLI (`brew install supabase/tap/supabase`).

### 1. Supabase

```bash
supabase start        # first run pulls container images; later runs are seconds
supabase status       # shows API_URL, anon key, JWT secret, service_role key
```

To apply / reset migrations locally:

```bash
supabase db reset
```

### 2. FastAPI backend

```bash
cd api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env         # fill in SUPABASE_JWT_SECRET, OPENAI_API_KEY
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 3. Expo (iOS simulator)

```bash
npm install
npm run ios
```

If Metro complains about stale env / theme, restart with `npx expo start -c`.

## Environment

- `/.env.local` — Expo public vars (Supabase URL + anon key for local, API URL)
- `/api/.env` — FastAPI vars (`SUPABASE_JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `OPENAI_MODEL`)
- `/supabase/config.toml` — checked in; secrets come from `supabase status`

Local Supabase Studio: http://127.0.0.1:54323

## Troubleshooting

- **"Missing env var EXPO_PUBLIC_*"** — stop Metro, `npx expo start -c`.
- **`supabase start` errors** — Docker Desktop must be running.
- **Sign in works but `/me` returns 401** — the `SUPABASE_JWT_SECRET` in `api/.env` doesn't match `supabase status`. Copy it in and restart uvicorn.
- **Form-check upload times out** — the pose pipeline is CPU-bound; first run downloads MediaPipe model weights.
- **Quiz endpoint returns 503** — set `OPENAI_API_KEY` in `api/.env` and restart uvicorn.
