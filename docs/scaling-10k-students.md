# Scaling Shishya to 10k concurrent students

Code changes in commit are necessary but **not sufficient** — three Vercel-side actions are required for the new defaults to take effect. The build will still run without them, but the per-Lambda connection cap that protects Neon won't kick in.

## Bottleneck inventory

| Bottleneck | Symptom at 10k | Fix |
|---|---|---|
| NextAuth `database` sessions | Extra `Session` SELECT per auth'd request → 10k+ wasted q/s | Switched to JWT — done in code |
| Direct Neon URL on serverless | Connection-pool exhaustion within seconds; `P1001` / `P2024` errors | **Switch DATABASE_URL to pooled endpoint** — env-var change below |
| Default 10s function timeout | Streaming chat dies mid-response | `maxDuration = 300` set on `/api/chat` etc. — done in code |
| Repeated syllabus/exam-list fetches | ~5k+ duplicate q/s pulling the same rows | `unstable_cache` (5min syllabus, 60s exams list) — done in code |
| No rate limit | One abusive client → Anthropic spend blowup | Upstash-backed limiter (30 chat/min/user, 20 explain/min/user) — done in code, **needs env vars** |
| Sequential queries in tutor path | Each chat ~3× longer than needed | Parallelized — done in code |

## Required Vercel env-var changes

### 1. Switch `DATABASE_URL` to the Neon pooled endpoint

In Neon's dashboard, copy the **pooled connection string** (the hostname has `-pooler` in it). Append `&pgbouncer=true&connection_limit=1` to the query string.

Existing URL pattern:

```
postgresql://USER:PASS@ep-nameless-block-xxx.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

Pooled URL pattern (this is what `DATABASE_URL` must become):

```
postgresql://USER:PASS@ep-nameless-block-xxx-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connection_limit=1
```

### 2. Add `DIRECT_URL` (for migrations only)

Same hostname **without** the `-pooler` suffix, **without** the `pgbouncer` / `connection_limit` params:

```
postgresql://USER:PASS@ep-nameless-block-xxx.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

Prisma uses this for `prisma migrate` / `db push` (pgBouncer rejects the prepared-statement workflow they rely on).

### 3. Add Upstash Redis for rate limiting

1. Create a free Upstash Redis database at <https://upstash.com>.
2. From its dashboard copy the REST URL and REST token.
3. Add to Vercel env:

```
UPSTASH_REDIS_REST_URL=https://<id>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<token>
```

Without these, each serverless Lambda has its own private in-memory counter and the per-user quota is meaningless — a busy user gets `30 × N` requests per minute instead of 30, where N = number of warm Lambdas.

## Re-deploy after env-var changes

Env-var changes don't trigger a build — push an empty commit or click "Redeploy" on the latest production deployment so the running Lambdas pick up the new env. Existing user logins will be invalidated by the JWT switch — users will need to sign in again, which is fine.

## Capacity headroom after these changes

- **DB connections**: a single Lambda holds 1 Postgres connection. Vercel scales serverless to ~1000 concurrent invocations per region by default. Neon pooler scales to ~10k connections. Plenty of headroom.
- **Anthropic spend**: rate limit caps each user at 30 messages/min × 4k tokens ≈ ~0.5 USD/user/hour worst case. Healthy daily usage (15 msgs/day/user) at 10k = ~$30/day.
- **DB QPS**: with syllabus + exam-list cached, the tutor path issues ~6–8 q/call. At 10k concurrent students sending ~1 msg / 30s = ~333 chat/s → ~2,500 q/s, within Neon Pro tier.

## Things still on the table

- **Prisma Accelerate** — drops the connection-pool concern entirely and adds an edge cache. Trades cost (~$30/mo + per-query) for simpler ops. Worth revisiting at 50k+.
- **Mock-submit scoring async** — current submit handler does the WeaknessMap upsert inline. At very high concurrency move to a background queue (Upstash QStash) so the response returns immediately.
- **Question pool query cache** — `/api/mocks/[id]` pulls all question bodies on render; could ISR or cache per (mockId, attemptId).
