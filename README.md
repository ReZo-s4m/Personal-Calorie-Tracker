# Personal Calorie Tracker

A multi-user web app for logging meals, setting calorie/macro targets, recording weight, and viewing reports. The UI is Next.js. The API is Express. Data is PostgreSQL.

Live: https://calorie-tracker-ochre-eight.vercel.app  
Demo: https://youtu.be/ZUAhar1ciLc

---

## How to set up and run

### What you need

- Node.js 20 or newer
- A PostgreSQL database. [Neon](https://console.neon.tech) works (create a project, skip Neon Auth)
- Two terminals (API and web run as separate processes)

From Neon, copy:

- **Pooled** connection string → `DATABASE_URL`
- **Direct** connection string → `DIRECT_URL`

Both should end with `?sslmode=require`.

Optional: a [Gemini API key](https://aistudio.google.com/apikey) if you want photo scan, Ask AI, and PDF Deep Analyse. Without it, those three calls return 503 and the rest of the app still runs.

### 1. Start the API

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and set at least:

```
DATABASE_URL="postgresql://.../?sslmode=require"
DIRECT_URL="postgresql://.../?sslmode=require"
JWT_SECRET="a long random string, 32+ characters"
```

Then:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

The API is at http://127.0.0.1:4000. Check it with http://127.0.0.1:4000/api/health.

Leave this terminal running.

### 2. Start the web app

Open a **second** terminal:

```bash
cd frontend
cp .env.example .env.local
npm install
```

`frontend/.env.local` can stay as:

```
NEXT_PUBLIC_API_URL=/api
```

Next.js will proxy `/api` to the Express process on port 4000.

If you already ran the API in this same terminal, `PORT` may still be `4000`. Next must not use that port.

**PowerShell (Windows):**

```powershell
if ($env:PORT) { Remove-Item Env:PORT }
npm run dev
```

**bash / macOS / Linux:**

```bash
unset PORT
npm run dev
```

Open http://localhost:3000 → **Sign up** → set a Target → **Add Meal**.

### Quick check that it works

1. Create an account
2. Open Target and save daily calories + protein / carbs / fat
3. Open Add Meal, enter a food, save
4. Overview should show that meal against the target
5. Food Log should list it; you can edit or delete it

### Tests (optional)

API unit tests + HTTP tests (uses `DATABASE_URL` in `backend/.env`):

```bash
npm test --prefix backend
```

Browser tests (both servers must already be running):

```bash
cd frontend
npx playwright install chromium
npm run test:e2e
```

---

## Assumptions

These are product rules I treated as given while building, not extra features.

1. **Two processes.** The frontend never imports backend code. The only coupling is HTTP under `/api`.
2. **Users are isolated.** After signup/login, every meal, target, and weigh-in is scoped to that account. Another account cannot read them.
3. **Meal types** are breakfast, lunch, dinner, and snacks.
4. **A day** is the user’s local calendar date (`YYYY-MM-DD`), not the server’s UTC day.
5. **Targets are versioned** by `effectiveFrom`. Saving again on the same date replaces that version, so an old report still compares against the targets that applied on that day.
6. **One weigh-in per calendar day.** Saving again that day replaces the previous reading.
7. **Micronutrients** are an open list of named amounts (not a fixed set of database columns).
8. **AI is optional.** Photo extract, Ask AI, and PDF Deep Analyse need `GEMINI_API_KEY` (photo extract can use `AI_API_KEY` / OpenAI if Gemini is unset). If neither key is set, those endpoints return 503; logging, targets, weight, and reports still work.
9. **Photo and PDF do not auto-save.** They produce a draft. The user reviews it, then confirms. Only then is a meal row written.
10. **PDF import** tries a local table parser first. Gemini Deep Analyse is opt-in.
11. **Ask AI can write** meals and targets, but destructive or ambiguous edits go through a confirm step.
12. **Forgot password** sends an OTP through a console email adapter in this project (no SMTP provider wired). Check the API logs for the code when running locally.

---

## Repo layout (for running the right folder)

| Path | What to run |
| --- | --- |
| `backend/` | `npm run dev` — Express API, Prisma, Postgres |
| `frontend/` | `npm run dev` — Next.js UI |

---

## Production (already deployed)

| Part | Host | Root directory |
| --- | --- | --- |
| Web | Vercel | `frontend` |
| API | Render | `backend` |
| Database | Neon | — |

On a free Render instance, the first request after idle can take about a minute.

Do not create a Render database. Put secrets in the Vercel/Render dashboards. Names match `backend/.env.example` and `frontend/.env.example`. Do not set `PORT` on Render.

Vercel: `NEXT_PUBLIC_API_URL=/api` and `API_UPSTREAM=https://<your-render-host>` (no trailing slash, no `/api` on `API_UPSTREAM`). Redeploy after changing them. Turn off Vercel Deployment Protection on production so visitors see this app’s login page.
