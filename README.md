# NutriAI — Personal Calorie Tracker

Live: https://my-nutriai.vercel.app/

A private food diary. Log meals by hand, from a photo, from a PDF, or by asking Ask AI. Set calorie and macro targets, record weigh-ins, and read daily/weekly reports.

The browser talks only to Next.js. Next.js proxies `/api` to Express. Express is the only process that touches Postgres.

---

## Features

| | |
| --- | --- |
| **Accounts** | Sign up, log in, and reset a forgotten password (email OTP). Every row belongs to one user. |
| **Today** | Dashboard of today’s calories and macros against the current target. |
| **Log a meal** | Name, quantity, unit, calories, macros, and optional micronutrients. Breakfast, lunch, dinner, or snacks. |
| **Photo extract** | A plate or nutrition label drafts the entry. You confirm before anything is written. |
| **Diary** | List meals by date range, search, sort, edit, and delete. |
| **Targets** | Daily calories plus protein / carbs / fat, optional goal weight. Versioned by date so past reports use the target that was in force then. |
| **Weigh-ins** | One reading per calendar day. Saving again that day replaces it. |
| **Reports** | Daily and weekly totals, macro split, micronutrients, target vs actual, and a downloadable PDF. |
| **PDF import** | Drop a food-diary PDF, review parsed rows, then commit. A local parser runs first; Gemini only if you ask for Deep Dive. |
| **Ask AI** | Log, edit, or delete meals, attach a photo or PDF, set a target, or ask for a report in ordinary words. Writes wait for confirmation. |

---

## Stack

| Layer | |
| --- | --- |
| Web | Next.js 16 (App Router), React 19, Tailwind 4 |
| API | Node 20, Express 5, TypeScript |
| Data | PostgreSQL via Prisma 6 (Neon in production) |
| Auth | JWT bearer tokens, bcrypt password hashes |
| AI | Gemini for Ask AI, photo extract, and PDF Deep Dive (optional OpenAI fallback for extract) |
| Tests | `node:test` (unit + API) and Playwright (e2e) |

AI keys are optional. If they are unset, those endpoints return 503 and the rest of the app still works.

---

## Repository layout

```
backend/     Express API  (port 4000)
frontend/    Next.js app  (port 3000)
vercel.json  Vercel Services: frontend at /, API at /api
```

`frontend/` never imports `backend/` code. HTTP under `/api` is the only coupling.

---

## API

Base path `/api`. `GET /api/health`, signup, login, and password-reset routes are public. Everything else needs `Authorization: Bearer <token>`.

**Health**

- `GET /api/health` — liveness

**Auth**

- `POST /api/auth/signup` — create an account, return a JWT
- `POST /api/auth/login` — sign in, return a JWT
- `POST /api/auth/forgot-password` — send (or log) a one-time code
- `POST /api/auth/verify-otp` — check the code
- `POST /api/auth/reset-password` — set a new password
- `GET /api/auth/me` — current user (auth)

**Entries**

- `GET /api/entries` — list meals (date range, filters, pagination)
- `POST /api/entries` — create one meal
- `POST /api/entries/batch` — create several meals (import / Ask AI)
- `GET /api/entries/:id` — one meal
- `PATCH /api/entries/:id` — edit a meal
- `DELETE /api/entries/:id` — delete a meal

**Goals** *(handled by the targets module)*

- `GET /api/goals/current` — target in force for a date (today if omitted)
- `GET /api/goals` — target history
- `POST /api/goals` — set or replace the target for `effectiveFrom`
- `DELETE /api/goals/:id` — remove a target version

**Weights**

- `GET /api/weights/current` — latest weigh-in
- `GET /api/weights` — history
- `POST /api/weights` — log a weigh-in (same calendar day replaces)
- `DELETE /api/weights/:id` — delete a weigh-in

**Reports**

- `GET /api/reports/daily` — per-day totals
- `GET /api/reports/weekly` — weekly totals
- `GET /api/reports/macros` — macro split
- `GET /api/reports/micronutrients` — micronutrient totals
- `GET /api/reports/goal-comparison` — intake vs the target in force each day
- `GET /api/reports/pdf` — the same numbers as a downloadable PDF

**Imports**

- `GET /api/imports/status` — whether Deep Dive is configured
- `POST /api/imports/parse` — draft rows from a PDF (writes nothing)
- `POST /api/imports/commit` — save reviewed rows

**AI**

- `GET /api/ai/status` — whether extract and chat are configured
- `POST /api/ai/extract` — photo extract (plate or label)
- `POST /api/ai/chat` — Ask AI

---

## Prerequisites

- Node.js 20 or newer
- npm
- A PostgreSQL database you can reach (Neon is what production uses)

---

## 1. Database

**Option A — Neon (recommended)**

1. Create a project at [neon.tech](https://neon.tech). Skip Neon Auth.
2. Copy both connection strings, each ending `?sslmode=require`:
   - pooled URI → `DATABASE_URL`
   - direct URI → `DIRECT_URL`

**Option B — local Docker**

```bash
docker run -d --name ct-postgres \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=calorie_tracker_test \
  -p 55432:5432 postgres:16
```

Then use:

```
DATABASE_URL="postgresql://test:test@localhost:55432/calorie_tracker_test"
DIRECT_URL="postgresql://test:test@localhost:55432/calorie_tracker_test"
```

---

## 2. API

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Pooled Postgres URI |
| `DIRECT_URL` | yes | Direct Postgres URI (Prisma migrations) |
| `JWT_SECRET` | yes | At least 32 characters |
| `CORS_ORIGIN` | no | Defaults to `http://localhost:3000` |
| `GEMINI_API_KEY` | no | Ask AI, photo extract, PDF Deep Dive |
| `AI_API_KEY` | no | OpenAI-compatible fallback for photo extract |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | no | Forgot-password email. Without them, the OTP is printed in the API log. |

Then:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

The API listens on [http://localhost:4000](http://localhost:4000). Health check: [http://localhost:4000/api/health](http://localhost:4000/api/health).

---

## 3. Web app

In a second terminal:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

`.env.local` should keep:

```
NEXT_PUBLIC_API_URL=/api
```

Next.js rewrites `/api/*` to `http://127.0.0.1:4000` in development, so the browser stays same-origin.

Open [http://localhost:3000](http://localhost:3000), sign up, set a daily target, and log a meal.

If Next fails to bind port 3000, another process is using it, or `PORT=4000` leaked into the shell from the API `.env`. Unset `PORT` before `npm run dev` in `frontend/`.

---

## Tests

From the repo root (after both packages are installed and `backend/.env` has a Postgres URI):

```bash
npm test              # unit + API
npm run test:unit     # no database
npm run test:api      # needs Postgres; runs migrations first
npm run test:e2e      # Playwright; starts API + web if they are not already running
```

Or from each package:

```bash
cd backend && npm test
cd frontend && npx playwright install && npm run test:e2e
```

---

## Production (Vercel)

Frontend and API deploy together as [Vercel Services](https://vercel.com/docs/services). `vercel.json` routes `/` to Next.js and `/api` to Express. Postgres stays on Neon.

Set these in the Vercel project (Production and Preview):

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `/api` |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Neon pooled URI |
| `DIRECT_URL` | Neon direct URI |
| `JWT_SECRET` | 32+ random characters |
| `GEMINI_API_KEY` | optional |

Turn **Deployment Protection** off on production, or visitors see Vercel’s login instead of this app’s.

---

## Assumptions

- Meal types are breakfast, lunch, dinner, and snacks.
- A calendar day is the user’s local day (`YYYY-MM-DD`), not the API host’s UTC day. Stored `consumedOn` / `loggedOn` values are midnight UTC of that local day.
- Targets are versioned by `effectiveFrom`. Saving again on the same date replaces that version; earlier versions stay so historical reports stay honest.
- One weigh-in per calendar day; saving again that day replaces it.
- Micronutrients are an open-ended list of named amounts, not fixed columns.
- Photo extract and PDF import create drafts. Nothing is written until the user confirms.
- PDF import tries a local table parser first. Deep Dive (Gemini) is optional.
- Ask AI can log, edit, and delete meals after confirmation. The frontend never imports backend code; `/api` is the only coupling.
- The HTTP API still uses `/api/goals` and field names such as `targetWeightKg`. Domain tables are `Target`, `DietEntry`, and `WeighIn`; handlers map between the two.
- Source (manual / image / chat / pdf) is stored on each meal for the API, but it is not shown in the diary UI.
