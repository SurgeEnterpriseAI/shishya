# Shishya — first-time setup

End-to-end setup for a fresh laptop or a fresh deploy. Total time: **~20 minutes**.

---

## Prerequisites

- Node.js 20+ (`node --version` to check; we tested on 24.x)
- A Google account (for OAuth + sign-in)
- An Anthropic API key (for AI tutor / mock generation)
- This repo cloned to disk

```bash
cd C:\Users\ADMIN\Desktop\shishya
npm install
```

---

## Step 1 — Postgres database (Neon, free tier) · ~3 minutes

1. Go to **https://console.neon.tech/signup** and sign in with Google.
2. Create a new project. Defaults are fine. Region: **AWS Mumbai (ap-south-1)** for low Indian latency.
3. On the project home, click **Connection string** → copy the `postgresql://…` URL.
4. Paste it as `DATABASE_URL` in your `.env.local` (we set this in Step 4).

Neon's free tier gives 0.5 GB storage + autosuspend after 5 min idle — more than enough for MVP through several thousand users.

> Alternatives: Supabase (also free), Railway (paid from day 1), or local Postgres (`docker run postgres`). Anything that gives you a `postgresql://...` URL works.

---

## Step 2 — Google OAuth client · ~5 minutes

NextAuth needs a Google OAuth 2.0 client to authenticate Gmail sign-ins.

1. Go to **https://console.cloud.google.com/** and create a new project (e.g. `shishya`).
2. Open **APIs & Services → OAuth consent screen**.
   - User type: **External**
   - App name: `Shishya`
   - User support email: `venumuvva@gmail.com`
   - Developer contact: `venumuvva@gmail.com`
   - Save. (You can skip scopes — NextAuth requests `openid email profile` defaults.)
3. Open **APIs & Services → Credentials → Create credentials → OAuth client ID**.
   - Application type: **Web application**
   - Name: `Shishya local` (you can add a separate prod client later)
   - Authorized JavaScript origins:
     - `http://localhost:3000`
     - (Production:) `https://shishya.in`
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - (Production:) `https://shishya.in/api/auth/callback/google`
   - Save. Copy the **Client ID** and **Client secret**.
4. Paste them into `.env.local` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

> The OAuth consent screen will be in **Testing** mode initially — only emails you add as "Test users" can sign in. Add yourself there until you publish the app for verification (free for low-impact scopes).

---

## Step 3 — Anthropic API key · ~30 seconds

You already have one (the Surge org used it for the Teams MCP server). If not:

1. Go to **https://console.anthropic.com/settings/keys**.
2. Create a key, copy it.
3. Paste it into `.env.local` as `ANTHROPIC_API_KEY`.

> Cost note: at MVP scale (a few hundred mocks/day) and with prompt caching on, the bill should be under **$5/day**. The bulk question generator (one-off batches) costs roughly **$3–5 for 200 SSC CGL questions**.

---

## Step 4 — Environment variables · ~1 minute

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```ini
# Postgres connection string from Step 1
DATABASE_URL="postgresql://user:pwd@host.neon.tech/shishya?sslmode=require"

# NextAuth — generate a random 32+ char secret
# On Windows PowerShell:  -join ((48..57+65..90+97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
# On *nix:                openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<paste 32+ char random string>"

# Google OAuth from Step 2
GOOGLE_CLIENT_ID="<your-id>.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="<your-secret>"

# Anthropic from Step 3
ANTHROPIC_API_KEY="sk-ant-…"
ANTHROPIC_MODEL="claude-sonnet-4-5-20250929"

# Admin — comma-separated emails that get /admin access
ADMIN_EMAILS="venumuvva@gmail.com"
```

Verify with:

```bash
npm run check-env
```

This runs a pre-flight: env vars present, DB reachable, Anthropic key valid. **If anything fails here, fix it before continuing.**

---

## Step 5 — Database schema + seed content · ~2 minutes

```bash
npm run db:generate   # generate Prisma client (idempotent)
npm run db:push       # create tables in your Postgres
npm run seed:all      # 10 exams + SSC CGL syllabus + RRB NTPC syllabus + 150 sample SSC CGL Qs
```

If you already pushed and re-seed, all upserts are idempotent — no duplicates.

---

## Step 6 — Run · ~10 seconds

```bash
npm run dev
```

Open **http://localhost:3000** → click **Sign in with Google** → land on `/dashboard`.

---

## Step 7 — SME validation pass · ~15 minutes

The 150 sample SSC CGL questions ship as `validated: false` — they need a human pass before students see them.

1. Open **http://localhost:3000/admin/questions?source=AI_GENERATED&validated=false**
2. Click each question, read the body, options, answer key, and solution. Either:
   - **Validate ✓** — promotes to live
   - **Reject** — keeps out of mocks; counts against acceptance rate
   - Edit if it's almost right, then validate
3. Use the **Bulk validate** button at the top to validate all visible filtered questions in one click (after spot-checking — see warning).
4. Track progress at **http://localhost:3000/admin/sme-stats**.

> **Pragmatic shortcut:** if you trust a topic (e.g. you've spot-checked 10 of 50), filter `topic=quant.percentage` and use **Bulk validate**. The bulk-validate button on this view will validate every question matching the current filter.

---

## Step 8 — Take a mock to verify the loop · ~5 minutes

1. From `/dashboard`, click **SSC CGL** → **Take diagnostic mock →**
2. Answer the 12 questions, submit.
3. You should see the results page with topic breakdown + AI diagnostic.
4. Click any wrong answer's **Explain step-by-step (AI)** — verifies the Anthropic key works.
5. Visit `/chat` and ask the tutor a question — verifies streaming SSE works.

If all of those work → **the platform is ready.**

---

## Step 9 — Mobile QA · ~10 minutes

See [MOBILE_QA.md](./MOBILE_QA.md) — short checklist of what to test on a real Android device.

---

## Step 10 — Run the integration tests

```bash
npm test               # 22 unit tests, no DB needed
npm run smoke-test     # full e2e flow against your DB (creates + cleans up a test user)
```

If both pass, you have green-field confidence the pipeline is intact.

---

## Step 11 — Generate more content with the AI pipeline

```bash
# Dry-run on one topic (no API spend)
npx tsx scripts/generate-questions.ts --exam SSC_CGL --topic quant.percentage --count 5 --dry-run

# Real run — generate 10 Qs for one topic
npx tsx scripts/generate-questions.ts --exam SSC_CGL --topic quant.percentage --count 10

# Whole subject
npx tsx scripts/generate-questions.ts --exam SSC_CGL --subject QUANT --count 15
```

After each run, review at `/admin/questions?source=AI_GENERATED&validated=false`, then watch acceptance rate trend at `/admin/sme-stats`.

---

## Step 12 — Production deploy (when ready)

- Hosting: **Vercel** (frontend) + **Railway** or **Neon** (DB) is the easiest combo.
- Push the same env vars in the provider's dashboard. Neon and Anthropic don't need URL changes; only `NEXTAUTH_URL` flips to your domain, and add prod redirect URI to the Google OAuth client (see Step 2).
- Domain: `shishya.in` is registered. Point it at Vercel.
- Verify with `https://shishya.in/api/health` (TODO — add a /health endpoint when needed).

---

## Quick troubleshooting

| Symptom | Fix |
|---------|-----|
| `npm run db:push` hangs | Neon project may be paused; visit the dashboard to wake it. |
| Sign-in returns to `/api/auth/error` with `OAuthCallback` | Redirect URI mismatch. The callback URL in Google Cloud must match the `NEXTAUTH_URL` exactly. |
| `/api/mocks` returns "No questions available" | You haven't validated any Qs yet — go to `/admin/questions` and validate. |
| Hindi text shows boxes/empty squares | Your system may be missing a Devanagari font fallback; the Noto font is bundled but a quick OS update usually fixes it. |
| `npx tsc --noEmit` fails after pulling | Run `npm run db:generate` — Prisma client is gitignored. |

---

## What's bundled and ready

- **10 exams** scaffolded with metadata
- **SSC CGL** — full syllabus (4 subjects, ~55 topics) + 150 sample Qs
- **RRB NTPC** — full syllabus (3 subjects, ~49 topics)
- **Bilingual UI** — English + Hindi switcher in header
- **AI pipeline** — diagnostic, mock generator, tutor chat, solution explainer, weekly coach
- **Admin** — question validation, SME acceptance stats, bulk validate
- **Tests** — 22 unit tests + 1 e2e smoke test

You can launch with just SSC CGL validated. Other exams come online as content is added.
