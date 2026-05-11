// Per-user rate limiting for expensive endpoints (chat, explain).
//
// At 10k concurrent students a single misbehaving (or buggy retrying) client
// can amplify Anthropic spend and DB load. We cap each authenticated user to
// a sliding-window quota.
//
// Backend:
//   - Production: Upstash Redis via REST when UPSTASH_REDIS_REST_URL +
//     UPSTASH_REDIS_REST_TOKEN are set. Survives across serverless invocations
//     because the counter lives in Redis.
//   - Dev (no Upstash env): in-memory Map. Only useful for single-instance
//     testing — multiple serverless instances each see their own counter,
//     which is exactly why production must use Upstash.
//
// Failure mode: if Upstash is set but unreachable, we *fail open* (allow the
// request) rather than locking users out on a transient Redis hiccup.

type Result = { ok: boolean; limit: number; remaining: number; reset: number };

const limits = {
  chat:    { limit: 30, windowSec: 60 },   // 30 chat messages per minute per user
  explain: { limit: 20, windowSec: 60 },   // 20 explain calls per minute per user
} as const;

export type LimitName = keyof typeof limits;

// ── In-memory fallback (dev only) ───────────────────────────────────────
const memBuckets = new Map<string, { count: number; expiresAt: number }>();

function memoryCheck(key: string, limit: number, windowSec: number): Result {
  const now = Date.now();
  const bucket = memBuckets.get(key);
  if (!bucket || bucket.expiresAt < now) {
    memBuckets.set(key, { count: 1, expiresAt: now + windowSec * 1000 });
    return { ok: true, limit, remaining: limit - 1, reset: now + windowSec * 1000 };
  }
  bucket.count += 1;
  return {
    ok: bucket.count <= limit,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    reset: bucket.expiresAt,
  };
}

// ── Upstash REST adapter (prod) ─────────────────────────────────────────
async function upstashCheck(
  key: string,
  limit: number,
  windowSec: number,
): Promise<Result> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  // Atomic INCR + EXPIRE pipeline so the counter sets a TTL on first hit.
  const body = JSON.stringify([
    ["INCR", key],
    ["EXPIRE", key, String(windowSec), "NX"],
  ]);
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body,
      // Hard cap on round-trip — if Upstash is slow we'd rather fail open
      // than block the chat path.
      signal: AbortSignal.timeout(800),
    });
    if (!res.ok) throw new Error(`upstash ${res.status}`);
    const data = (await res.json()) as Array<{ result: number }>;
    const count = data?.[0]?.result ?? 0;
    return {
      ok: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      reset: Date.now() + windowSec * 1000,
    };
  } catch {
    // Fail open — better to serve than to falsely lock out a paying student.
    return { ok: true, limit, remaining: limit, reset: Date.now() + windowSec * 1000 };
  }
}

function hasUpstash(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/**
 * Check the user against the named limit. Caller is responsible for
 * returning a 429 to the client when result.ok is false.
 */
export async function checkRateLimit(
  name: LimitName,
  userId: string,
): Promise<Result> {
  const cfg = limits[name];
  const key = `rl:${name}:${userId}`;
  return hasUpstash()
    ? upstashCheck(key, cfg.limit, cfg.windowSec)
    : memoryCheck(key, cfg.limit, cfg.windowSec);
}

/** Standard HTTP 429 response body + headers. */
export function rateLimited(result: Result): Response {
  return new Response(
    JSON.stringify({ error: "RATE_LIMITED", message: "Too many requests. Slow down." }),
    {
      status: 429,
      headers: {
        "content-type": "application/json",
        "x-ratelimit-limit": String(result.limit),
        "x-ratelimit-remaining": String(result.remaining),
        "x-ratelimit-reset": String(Math.ceil(result.reset / 1000)),
        "retry-after": String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))),
      },
    },
  );
}
