// /admin/stats — the founder's one-page read of Shishya (13 Oct 2026):
// where every AI call went (Surge's own Qwen server or Claude), what it
// cost, what the local server saved, and the people and traffic behind it.
// Read-only. Days are IST calendar days. People numbers reuse the live
// strip's definitions (src/lib/live-counts-server.ts) so the two never
// disagree; the per-day series here are labelled for what they count.

import { prisma } from "@/lib/db/prisma";
import { usageCostUsd } from "@/lib/ai/usage";
import { GUEST_IMPORT_SOURCE } from "@/lib/live-counts-server";

/** IST calendar day of a UTC timestamp column. */
const IST_DAY = (col: string) => `((${col} AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata')::date`;

/** The model a local call stands in for, for the "Claude would have charged" estimate. */
export const SAVING_REFERENCE_MODEL = "claude-sonnet-4-5";

export type Provider = "local" | "claude";

export interface AiDay {
  day: string; // YYYY-MM-DD (IST)
  localCalls: number;
  claudeCalls: number;
  localTokens: number;
  claudeTokens: number;
  claudeUsd: number;
  savedUsd: number;
}

export interface AiFeatureRow {
  feature: string;
  localCalls: number;
  claudeCalls: number;
  localTokens: number;
  claudeTokens: number;
  claudeUsd: number;
  savedUsd: number;
  avgMs: number | null;
}

export interface AiModelRow {
  model: string;
  provider: Provider;
  calls: number;
  inTokens: number;
  outTokens: number;
  cacheReadTokens: number;
  usd: number;
}

export interface PeopleDay {
  day: string;
  visitors: number;
  pageViews: number;
  signups: number;
  tutorQuestions: number;
}

export interface SourceRow {
  source: string;
  pageViews: number;
  visitors: number;
}

export interface PathRow {
  path: string;
  pageViews: number;
}

export interface MissRow {
  q: string;
  count: number;
}

const n = (v: unknown) => Number(v ?? 0) || 0;

/** What Claude Sonnet would have charged for these tokens (local calls carry no bill). */
export function savedUsd(inTokens: number, outTokens: number): number {
  return usageCostUsd(SAVING_REFERENCE_MODEL, { input_tokens: inTokens, output_tokens: outTokens }).cost;
}

/** Fill missing days with zeros so every chart has one column per day. */
export function fillDays<T extends { day: string }>(rows: T[], days: number, today: string, zero: (day: string) => T): T[] {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out: T[] = [];
  const end = new Date(`${today}T00:00:00Z`);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 86_400_000).toISOString().slice(0, 10);
    out.push(byDay.get(d) ?? zero(d));
  }
  return out;
}

/** Today's IST date as YYYY-MM-DD. */
export function istToday(now: Date = new Date()): string {
  return new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}

/** First instant (UTC) of the IST day `days - 1` days before today. */
export function windowStart(days: number, now: Date = new Date()): Date {
  const today = istToday(now);
  return new Date(new Date(`${today}T00:00:00+05:30`).getTime() - (days - 1) * 86_400_000);
}

export async function aiDaily(days: number): Promise<AiDay[]> {
  const since = windowStart(days);
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT to_char(${IST_DAY('"createdAt"')}, 'YYYY-MM-DD') AS day,
            COUNT(*) FILTER (WHERE model LIKE 'local:%') AS local_calls,
            COUNT(*) FILTER (WHERE model NOT LIKE 'local:%') AS claude_calls,
            COALESCE(SUM("inputTokens" + "outputTokens") FILTER (WHERE model LIKE 'local:%'), 0) AS local_tokens,
            COALESCE(SUM("inputTokens" + "outputTokens" + "cacheReadTokens" + "cacheWriteTokens") FILTER (WHERE model NOT LIKE 'local:%'), 0) AS claude_tokens,
            COALESCE(SUM("costUsd") FILTER (WHERE model NOT LIKE 'local:%'), 0) AS claude_usd,
            COALESCE(SUM("inputTokens") FILTER (WHERE model LIKE 'local:%'), 0) AS local_in,
            COALESCE(SUM("outputTokens") FILTER (WHERE model LIKE 'local:%'), 0) AS local_out
       FROM "AiUsage" WHERE "createdAt" >= $1 GROUP BY 1 ORDER BY 1`,
    since,
  );
  const mapped = rows.map((r) => ({
    day: r.day,
    localCalls: n(r.local_calls),
    claudeCalls: n(r.claude_calls),
    localTokens: n(r.local_tokens),
    claudeTokens: n(r.claude_tokens),
    claudeUsd: n(r.claude_usd),
    savedUsd: savedUsd(n(r.local_in), n(r.local_out)),
  }));
  return fillDays(mapped, days, istToday(), (day) => ({ day, localCalls: 0, claudeCalls: 0, localTokens: 0, claudeTokens: 0, claudeUsd: 0, savedUsd: 0 }));
}

export async function aiByFeature(days: number): Promise<AiFeatureRow[]> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT feature,
            COUNT(*) FILTER (WHERE model LIKE 'local:%') AS local_calls,
            COUNT(*) FILTER (WHERE model NOT LIKE 'local:%') AS claude_calls,
            COALESCE(SUM("inputTokens" + "outputTokens") FILTER (WHERE model LIKE 'local:%'), 0) AS local_tokens,
            COALESCE(SUM("inputTokens" + "outputTokens" + "cacheReadTokens" + "cacheWriteTokens") FILTER (WHERE model NOT LIKE 'local:%'), 0) AS claude_tokens,
            COALESCE(SUM("costUsd") FILTER (WHERE model NOT LIKE 'local:%'), 0) AS claude_usd,
            COALESCE(SUM("inputTokens") FILTER (WHERE model LIKE 'local:%'), 0) AS local_in,
            COALESCE(SUM("outputTokens") FILTER (WHERE model LIKE 'local:%'), 0) AS local_out,
            AVG("latencyMs") AS avg_ms
       FROM "AiUsage" WHERE "createdAt" >= $1 GROUP BY 1`,
    windowStart(days),
  );
  return rows
    .map((r) => ({
      feature: r.feature,
      localCalls: n(r.local_calls),
      claudeCalls: n(r.claude_calls),
      localTokens: n(r.local_tokens),
      claudeTokens: n(r.claude_tokens),
      claudeUsd: n(r.claude_usd),
      savedUsd: savedUsd(n(r.local_in), n(r.local_out)),
      avgMs: r.avg_ms == null ? null : Math.round(n(r.avg_ms)),
    }))
    .sort((a, b) => b.claudeUsd + b.savedUsd - (a.claudeUsd + a.savedUsd));
}

export async function aiByModel(days: number): Promise<AiModelRow[]> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT model, COUNT(*) AS calls, COALESCE(SUM("inputTokens"),0) AS in_tok, COALESCE(SUM("outputTokens"),0) AS out_tok,
            COALESCE(SUM("cacheReadTokens"),0) AS cache_read, COALESCE(SUM("costUsd"),0) AS usd
       FROM "AiUsage" WHERE "createdAt" >= $1 GROUP BY 1 ORDER BY 2 DESC`,
    windowStart(days),
  );
  return rows.map((r) => ({
    model: r.model,
    provider: String(r.model).startsWith("local:") ? "local" : "claude",
    calls: n(r.calls),
    inTokens: n(r.in_tok),
    outTokens: n(r.out_tok),
    cacheReadTokens: n(r.cache_read),
    usd: n(r.usd),
  }));
}

/**
 * People per IST day. visitors = distinct ids (account, else browser cookie)
 * with a page view, tagged bots excluded — a per-day browser count, not the
 * strip's learner rule (which needs the whole history). Sign-ups = accounts
 * created. Tutor questions follow the strip's tutorQuestions rule.
 */
export async function peopleDaily(days: number): Promise<PeopleDay[]> {
  const since = windowStart(days);
  const [views, signups, tutor] = await Promise.all([
    prisma.$queryRawUnsafe<any[]>(
      `SELECT to_char(${IST_DAY('"createdAt"')}, 'YYYY-MM-DD') AS day, COUNT(*) AS views,
              COUNT(DISTINCT COALESCE("userId", "anonId")) AS visitors
         FROM "AnalyticsEvent"
        WHERE kind = 'PAGE_VIEW' AND "createdAt" >= $1 AND client IS DISTINCT FROM 'bot'
        GROUP BY 1`,
      since,
    ),
    prisma.$queryRawUnsafe<any[]>(
      `SELECT to_char(${IST_DAY('"createdAt"')}, 'YYYY-MM-DD') AS day, COUNT(*) AS n FROM "User" WHERE "createdAt" >= $1 GROUP BY 1`,
      since,
    ),
    prisma.$queryRawUnsafe<any[]>(
      `SELECT day, SUM(n) AS n FROM (
         SELECT to_char(${IST_DAY('cm."createdAt"')}, 'YYYY-MM-DD') AS day, COUNT(*) AS n
           FROM "ChatMessage" cm JOIN "ChatSession" cs ON cs.id = cm."sessionId"
          WHERE cm.role = 'USER' AND cm."createdAt" >= $1
            AND COALESCE(cs."contextSnapshot"->>'source', '') <> $2
          GROUP BY 1
         UNION ALL
         SELECT to_char(${IST_DAY('"createdAt"')}, 'YYYY-MM-DD'), COUNT(*)
           FROM "AnonTutorLog" WHERE "anonId" IS NOT NULL AND "createdAt" >= $1 GROUP BY 1
       ) t GROUP BY day`,
      since,
      GUEST_IMPORT_SOURCE,
    ),
  ]);
  const byDay = new Map<string, PeopleDay>();
  const get = (day: string) => {
    let r = byDay.get(day);
    if (!r) byDay.set(day, (r = { day, visitors: 0, pageViews: 0, signups: 0, tutorQuestions: 0 }));
    return r;
  };
  for (const r of views) Object.assign(get(r.day), { visitors: n(r.visitors), pageViews: n(r.views) });
  for (const r of signups) get(r.day).signups = n(r.n);
  for (const r of tutor) get(r.day).tutorQuestions = n(r.n);
  return fillDays([...byDay.values()], days, istToday(), (day) => ({ day, visitors: 0, pageViews: 0, signups: 0, tutorQuestions: 0 }));
}

/**
 * Where visitors came from: the link tag (utm_source) when there is one,
 * else the referring site, else "Direct / app". Page views and distinct
 * visitors, tagged bots excluded; Shishya's own pages are not a source.
 */
export async function trafficSources(days: number, limit = 12): Promise<SourceRow[]> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT src, COUNT(*) AS views, COUNT(DISTINCT COALESCE("userId", "anonId")) AS visitors FROM (
       SELECT CASE
                WHEN NULLIF("utmSource", '') IS NOT NULL THEN lower("utmSource")
                WHEN NULLIF("refHost", '') IS NOT NULL AND "refHost" NOT ILIKE '%shishya%' AND "refHost" NOT ILIKE 'accounts.google.%' THEN lower(regexp_replace("refHost", '^www\\.', ''))
                ELSE NULL
              END AS src, "userId", "anonId"
         FROM "AnalyticsEvent"
        WHERE kind = 'PAGE_VIEW' AND "createdAt" >= $1 AND client IS DISTINCT FROM 'bot'
     ) t WHERE src IS NOT NULL GROUP BY 1 ORDER BY 3 DESC LIMIT $2`,
    windowStart(days),
    limit,
  );
  return rows.map((r) => ({ source: r.src, pageViews: n(r.views), visitors: n(r.visitors) }));
}

export async function topPaths(days: number, limit = 12): Promise<PathRow[]> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT path, COUNT(*) AS views FROM "AnalyticsEvent"
      WHERE kind = 'PAGE_VIEW' AND "createdAt" >= $1 AND client IS DISTINCT FROM 'bot' AND path IS NOT NULL
      GROUP BY 1 ORDER BY 2 DESC LIMIT $2`,
    windowStart(days),
    limit,
  );
  return rows.map((r) => ({ path: r.path, pageViews: n(r.views) }));
}

export async function searchMisses(days: number, limit = 10): Promise<MissRow[]> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT lower(trim(props->>'q')) AS q, COUNT(*) AS c FROM "AnalyticsEvent"
      WHERE kind = 'SEARCH_MISS' AND "createdAt" >= $1 AND client IS DISTINCT FROM 'bot' AND COALESCE(props->>'q', '') <> ''
      GROUP BY 1 ORDER BY 2 DESC LIMIT $2`,
    windowStart(days),
    limit,
  );
  return rows.map((r) => ({ q: r.q, count: n(r.c) }));
}

/** Friendly names for the AI jobs in the ledger. Unknown labels show as they are. */
export const FEATURE_NAMES: Record<string, string> = {
  tutor: "AI tutor — signed in",
  "tutor-anon": "AI tutor — guests",
  "tutor-school": "AI tutor — school",
  "tutor-late": "Tutor answer-later",
  "tutor-wrap": "Tutor wrap-up",
  explain: "Answer explanations",
  "exam-info": "Exam info (web search)",
  "exam-info-other": "Exam info, other (web search)",
  "akr-crawl": "Answer-key crawl (web)",
  "akr-check": "Answer-key check (web)",
  "akr-plan": "Answer-key plan (web)",
  "bank-solve": "Question bank — solving",
  "bank-verify": "Question bank — verification",
  "factory-solve": "Question factory — solving",
  "factory-verify": "Question factory — verification",
  translate: "Translation (Indian languages)",
  "current-affairs": "Current affairs (web)",
  "phase-article-web": "Exam-phase articles (web)",
  "phase-article": "Exam-phase articles",
  vacancies: "Vacancies (web)",
  "coach-day": "Daily coach plan",
  "coach-weekly": "Weekly coach plan",
  "daily-brief": "Daily brief email",
  "student-360": "Student 360 (mentor desk)",
  "rank-bands": "Rank bands",
  "mock-adaptive": "Adaptive mocks",
  "mock-user-request": "Mocks on request",
  "fresh-questions": "Fresh question generation",
  "state-depth-gen": "State-exam depth generation",
  "demand-mine": "Demand mining",
  "demand-consolidate": "Demand clustering",
  "discussion-reply": "Discussion replies",
  diagnostic: "Diagnostic",
  ask: "Ask (search answers)",
  "school-gen": "School content generation",
  other: "Other (unlabelled calls)",
  "tutor-late-probe": "Answer-later health probe",
  "seed-discussions": "Discussion seeding",
  "custom-mock": "Custom mocks",
  "descriptive-eval": "Descriptive answer grading",
  essay: "Essay grading",
  "results-extract": "Results extraction",
  "pyq-verify": "Past-paper verification",
  "phase-article-today-web": "Today's exam-phase article (web)",
  "question-adjudicate": "Question adjudication",
};

export const featureName = (f: string) => FEATURE_NAMES[f] ?? f;
