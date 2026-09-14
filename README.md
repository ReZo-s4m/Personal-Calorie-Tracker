# Personal Calorie Tracker

I built this as a split-stack web app: a Next.js client and an Express API that stores each user’s diary in Postgres. You create an account, set daily calorie/macro targets, log food (typed, photo, PDF, or chat), weigh in, and pull reports.

- Demo video: https://youtu.be/ZUAhar1ciLc
- Deployed app: https://calorie-tracker-ochre-eight.vercel.app  
  (free API host — if it has been idle, the first request can take a while)

---

## What you can do in the UI

| Page | Path | What it is for |
| --- | --- | --- |
| Home | `/` | Marketing landing, signed-out |
| Sign up / Sign in | `/signup`, `/login` | JWT session, stored in the browser |
| Forgot password | `/forgot-password` | Email OTP → new password |
| Overview | `/dashboard` | Today’s meals vs the current target |
| Add Meal | `/log` | Manual form + plate/label scan |
| Food Log | `/entries` | Filter by dates, search, page, edit, delete |
| Target | `/goals` | Calories, P/C/F, optional weight goal (versioned by date) |
| Weigh-in | `/weight` | One reading per calendar day |
| Insights | `/reports` | Charts + downloadable PDF |
| Ask AI | `/chat` | Natural-language log / edit / report |
| Upload | `/import` | PDF diary → review drafts → commit |

Breakfast, lunch, dinner, and snacks share the same `DietEntry` table. Micros are extra named rows, not extra columns.

---

## Stack

| Layer | Choice |
| --- | --- |
| Client | Next.js (App Router), TypeScript |
| API | Express 5, TypeScript |
| ORM | Prisma |
| DB | PostgreSQL (Neon in prod) |
| Auth | bcrypt + JWT |
| AI | Gemini (`GEMINI_API_KEY`). Photo extract can fall back to OpenAI if `AI_API_KEY` is set |
| PDF reports | PDFKit |
| PDF import | Local table parser first; Gemini only if you pick Deep Analyse |
| Tests | Node test runner (unit + API), Playwright (browser) |
| Hosts | Vercel (frontend), Render (API), Neon (database) |

The browser never talks to Prisma. Next.js proxies `/api/*` to Express (`127.0.0.1:4000` locally, Render in production).

---

## Folder map

```
backend/          Express API
  prisma/         schema + migrations
  src/modules/    one folder per feature
  src/providers/  Gemini / OpenAI / diary parsers
  test/api/       HTTP tests against a real database
frontend/         Next.js app
  src/app/        routes
  src/components/ UI
  e2e/            Playwright
```

Inside `backend/src/modules/<feature>/`:

- `*Handler.ts` — routes and status codes
- `*Logic.ts` — rules + database
- `*.rules.ts` — express-validator
- `I*Logic.ts` — the interface the handler depends on

`backend/src/container.ts` constructs the object graph. `backend/src/routes/index.ts` mounts it under `/api`.

---

## Run it on your machine

Needs **Node 20+**. Create a Neon project (database only, not Neon Auth). Use the pooled URI as `DATABASE_URL` and the direct URI as `DIRECT_URL`. Append `?sslmode=require` if it is missing.

### 1. API

```bash
cd backend
cp .env.example .env
```

Fill in `DATABASE_URL`, `DIRECT_URL`, and a long `JWT_SECRET`. `GEMINI_API_KEY` is optional; without it, photo/chat/Deep Analyse return 503 and everything else still works.

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

http://127.0.0.1:4000 — probe with `GET /api/health`.

### 2. Web

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

If the shell inherited `PORT=4000` from the API env, Next will collide with Express.

PowerShell:

```powershell
if ($env:PORT) { Remove-Item Env:PORT }
npm run dev
```

bash:

```bash
unset PORT && npm run dev
```

Open http://localhost:3000, register, set a target, log a meal.

---

## How I test

Unit + API (needs Postgres in `backend/.env`, or the GitHub Actions service):

```bash
npm test --prefix backend
```

That is what `.github/workflows/test.yml` runs.

Browser (API and Next both up):

```bash
cd frontend
npx playwright install chromium
npm run test:e2e
```

`frontend/e2e/assignment.spec.ts` walks signup, meals, listing, reports, PDF import, and isolation between two users.

---

## HTTP API

Prefix: `/api`. Public: health, signup, login, forgot/verify/reset password. The rest send `Authorization: Bearer <token>`.

| Area | Methods |
| --- | --- |
| Health | `GET /health` |
| Auth | `POST /auth/signup`, `/auth/login`, `/auth/forgot-password`, `/auth/verify-otp`, `/auth/reset-password` · `GET /auth/me` |
| Meals | `GET/POST /entries`, `POST /entries/batch`, `GET/PATCH/DELETE /entries/:id` |
| Targets | `GET /goals`, `/goals/current` · `POST /goals` · `DELETE /goals/:id` |
| Weight | `GET /weights`, `/weights/current` · `POST /weights` · `DELETE /weights/:id` |
| Reports | `GET /reports/daily`, `/weekly`, `/macros`, `/micronutrients`, `/goal-comparison`, `/pdf` |
| Import | `GET /imports/status` · `POST /imports/parse`, `/imports/commit` |
| AI | `GET /ai/status` · `POST /ai/extract`, `/ai/chat` |

---

## Rules I coded in (not just UI copy)

- A “day” is the eater’s local `YYYY-MM-DD`, not the server’s UTC date.
- Saving a target again on the same `effectiveFrom` overwrites that version; older days still compare against whatever target was in force then.
- Saving a weigh-in again on the same calendar day overwrites it (`@@unique` on user + day).
- Photo extract and PDF parse produce drafts. Nothing hits `DietEntry` until the user confirms.
- Chat can mutate meals/targets, but the pending-action flow asks before bulk edits/deletes.
- Accounts are isolated: user A’s queries always filter on `userId` from the JWT.

---

## Production

| Process | Where | Root |
| --- | --- | --- |
| UI | Vercel | `frontend` |
| API | Render | `backend` |
| Data | Neon | — |

Do not attach a Render Postgres. Put secrets in the dashboards. Names match `backend/.env.example` and `frontend/.env.example`.

**Render:** health `/api/health`, build `npm ci --include=dev && npm run build`, start `npm run start:prod`. Set `NODE_ENV=production`, `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `CORS_ORIGIN` (Vercel origin, no trailing slash). Leave `PORT` unset. Add `GEMINI_API_KEY` if AI should work in prod.

**Vercel:** `NEXT_PUBLIC_API_URL=/api` and `API_UPSTREAM=https://<render-host>` (no `/api` suffix). Rebuild after changing them. Turn off Deployment Protection on production so visitors hit this app’s login, not Vercel’s.
