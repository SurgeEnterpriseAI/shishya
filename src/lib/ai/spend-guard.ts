// Background AI spend guard (7 Oct 2026, resilience plan builds 3 + 5b/5c,
// simplest form).
//
// Why: the Anthropic credit is topped up by hand. Between 19 Sep and 7 Oct it
// ran dry 19 times (89 dark hours, 21% of the 06:00-23:00 IST study hours),
// and the last spender before 6 of those cut-offs was a scheduled job (the
// exam-news refresh, about 42% of all spend). Students got $30.93 of the
// 1-7 Oct spend; scheduled jobs $53.94. The tutor needs the balance more
// than a fourth refresh of the same exam does.
//
// Every scheduled (cron) AI call asks `guard.allow(feature)` first. The
// answer is "no" when, in this order:
//   1. credit cool-down — a model call failed with an empty balance in the
//      last 20 minutes and no student-facing call has succeeded since. One
//      failed call per 20 minutes across all jobs, not one per exam.
//   2. outage day (can-wait only) — the AI was unavailable for 30 minutes or
//      more earlier today (IST): can-wait work waits until midnight, so the
//      fresh top-up goes to students. Floor: a can-wait job with no ledger row
//      yesterday or today still runs (within its cap), so nothing waits two
//      days running.
//   3. job cap — this job's spend today (IST) plus the call's estimate would
//      pass its own cap (the 5b table below).
//   4. group cap — all must-run jobs together stop at AI_BG_MUSTRUN_DAILY_USD
//      ($3.99); all can-wait jobs together at AI_BG_CANWAIT_DAILY_USD ($1.75).
// Student-facing features (tutor, explain, translate, Ask, fresh sets …) are
// never blocked: they do not call the guard, and the guard answers "yes" for
// any feature that is not a background job.
//
// Spend today = AiUsage rows since IST midnight (rows a cron writes land when
// its run ends, through after()) plus this process's rows not yet landed
// (pendingUsageUsd in src/lib/ai/usage.ts), so a run sees its own calls.
// Credit failures are known from AnalyticsEvent rows with reason "credit":
// the ones build 1 writes for students (surface "ai-unavailable") and the
// ones this guard writes for background jobs (surface "ai-background"). A
// student-facing AiUsage row newer than the last failure means the AI is back.
// Every read fails open (a broken read never stops a job); nothing is written
// under vitest.
//
// What was held is visible: one AnalyticsEvent per job and reason per run
// (CTA_CLICKED, props.surface "ai-background", action "skip"; client "bot" so
// no human counter sees it, and eventCountsByKind leaves it out), a console
// line per skip, and guard.summary() in each cron's JSON reply. No alert, no
// mail, no cron of its own.
//
// Tests: tests/unit/spend-guard.test.ts

import Anthropic from "@anthropic-ai/sdk";
import { classifyTutorFailure } from "@/lib/ai/tutor-failure";
import { pendingUsageUsd } from "@/lib/ai/usage";
import { recordEvent } from "@/lib/analytics";
import { prisma } from "@/lib/db/prisma";

export type AiSpendClass = "student" | "must-run" | "can-wait" | "bulk";

/**
 * Every AiUsage feature the code writes, by whom it serves.
 * student  — a person is waiting (or a promise to a person is kept): never blocked.
 * must-run — scheduled, date-bound work students read the same day.
 * can-wait — scheduled work that loses little by waiting a day.
 * bulk     — operator-run local scripts (their own --max-usd guard, src/lib/ai/batch.ts).
 * A feature not listed is never blocked and never counted.
 */
export const AI_FEATURE_CLASS: Readonly<Record<string, AiSpendClass>> = {
  // student-facing
  tutor: "student",
  "tutor-school": "student",
  "tutor-anon": "student",
  "tutor-wrap": "student",
  "tutor-late": "student", // late answers to saved tutor questions (a promise to a student)
  "tutor-late-wrap": "student",
  "tutor-late-probe": "student",
  translate: "student",
  explain: "student",
  "fresh-questions": "student",
  ask: "student", // also the teacher-request SLA answer: a reply a student asked for
  "mock-adaptive": "student",
  "mock-user-request": "student",
  "descriptive-eval": "student",
  "discussion-reply": "student",
  "student-360": "student",
  "intent-router": "student",
  diagnostic: "student",
  "coach-weekly": "student",
  // must-run background
  "exam-info": "must-run", // exam news + dates for exams in exam week (the lane)
  "phase-article-today": "must-run", // exam-day page for an exam sitting today
  "phase-article-today-web": "must-run",
  "current-affairs": "must-run",
  "coach-day": "must-run", // the 04:00 plans; a student's on-open rebuild shares the label and is never guarded
  "akr-check": "must-run", // answer-key watch, 21:00 check
  "results-extract": "must-run",
  "question-adjudicate": "must-run", // weekly sweep; a student's instant re-check shares the label and is never guarded
  // can-wait background
  "exam-info-other": "can-wait", // exam news + dates for exams not in exam week (the tail)
  "phase-article": "can-wait", // exam-week pages for exams not sitting today
  "phase-article-web": "can-wait",
  vacancies: "can-wait",
  "rank-bands": "can-wait",
  "daily-brief": "can-wait",
  "demand-mine": "can-wait",
  "demand-consolidate": "can-wait",
  "seed-discussions": "can-wait", // retired 3 Oct 2026; old rows only
  "akr-plan": "can-wait", // Monday answer-key plan: its own $3.00 cap, outside the daily allowance (D7)
  // bulk scripts
  "bank-solve": "bulk",
  "bank-verify": "bulk",
  "school-gen": "bulk",
  "school-notes": "bulk",
  "akr-crawl": "bulk",
  "state-depth-gen": "bulk",
  "pyq-verify": "bulk",
};

export type BackgroundGroup = "must-run" | "can-wait";

export interface BackgroundCap {
  group: BackgroundGroup;
  /** USD per IST day for this job. */
  capUsd: number;
  /** Typical cost of one call (measured in AiUsage), added before the call. */
  estUsd: number;
  /** AiUsage features this job's calls write (default: the key itself). */
  ledger?: readonly string[];
  /** Counted against its own cap only, not the group allowance (D7). */
  outsideAllowance?: true;
}

/**
 * The 5b table (plan.md section 5), keyed by the feature a call site passes.
 * Caps per job; the group caps below bind the total. Changed from the plan:
 * current affairs $0.75 (the 6 Oct same-day retry allows three paid calls a
 * day, src/lib/current-affairs-run.ts); the weekly question sweep $0.10 (15
 * re-solves at about $0.007).
 * A job stops BEFORE a call that would pass its cap (spent + estUsd), so at
 * the measured costs a cap buys one call fewer than the plan's table says
 * for three jobs: exam-week news 9 calls a day (plan: 10), other exams' news
 * 5 (plan: 6), rank bands 2 (plan: 3).
 */
export const BACKGROUND_CAPS: Readonly<Record<string, BackgroundCap>> = {
  // must-run
  "exam-info": { group: "must-run", capUsd: 2.05, estUsd: 0.21 },
  "phase-article-today": { group: "must-run", capUsd: 0.5, estUsd: 0.25, ledger: ["phase-article-today", "phase-article-today-web"] },
  "current-affairs": { group: "must-run", capUsd: 0.75, estUsd: 0.25 },
  "coach-day": { group: "must-run", capUsd: 0.24, estUsd: 0.006 },
  "akr-check": { group: "must-run", capUsd: 0.9, estUsd: 0.15 },
  "results-extract": { group: "must-run", capUsd: 0.03, estUsd: 0.007 },
  "question-adjudicate": { group: "must-run", capUsd: 0.1, estUsd: 0.007 },
  // can-wait
  "exam-info-other": { group: "can-wait", capUsd: 1.22, estUsd: 0.21 },
  "phase-article": { group: "can-wait", capUsd: 0.25, estUsd: 0.25, ledger: ["phase-article", "phase-article-web"] },
  vacancies: { group: "can-wait", capUsd: 0.15, estUsd: 0.07 },
  "rank-bands": { group: "can-wait", capUsd: 0.05, estUsd: 0.018 },
  "daily-brief": { group: "can-wait", capUsd: 0.05, estUsd: 0.003 },
  "demand-mine": { group: "can-wait", capUsd: 0.05, estUsd: 0.015, ledger: ["demand-mine", "demand-consolidate"] },
  "akr-plan": { group: "can-wait", capUsd: 3.0, estUsd: 0.15, outsideAllowance: true },
};

export const DEFAULT_MUST_RUN_DAILY_USD = 3.99;
export const DEFAULT_CAN_WAIT_DAILY_USD = 1.75;
export const CREDIT_COOLDOWN_MS = 20 * 60_000;
export const OUTAGE_PAUSE_MIN_MS = 30 * 60_000;
/** AnalyticsEvent props.surface of the rows this guard writes. */
export const BACKGROUND_SURFACE = "ai-background";

const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;

/** Start of the IST calendar day of `now`, as a UTC instant. */
export function istDayStart(now: Date): Date {
  return new Date(Math.floor((now.getTime() + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS);
}

export function featureClass(feature: string): AiSpendClass | null {
  return Object.prototype.hasOwnProperty.call(AI_FEATURE_CLASS, feature) ? AI_FEATURE_CLASS[feature] : null;
}

export function ledgerOf(feature: string): readonly string[] {
  return BACKGROUND_CAPS[feature]?.ledger ?? [feature];
}

/** Features whose spend counts toward a group (outside-allowance jobs excluded). */
export function groupLedger(group: BackgroundGroup): string[] {
  const out = new Set<string>();
  for (const [key, cap] of Object.entries(BACKGROUND_CAPS)) {
    if (cap.group !== group || cap.outsideAllowance) continue;
    for (const f of ledgerOf(key)) out.add(f);
  }
  return [...out];
}

export const STUDENT_FEATURES: readonly string[] = Object.entries(AI_FEATURE_CLASS)
  .filter(([, c]) => c === "student")
  .map(([f]) => f);

export const BACKGROUND_FEATURES: readonly string[] = [...new Set(Object.keys(BACKGROUND_CAPS).flatMap((k) => [...ledgerOf(k)]))];

function envUsd(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export interface GroupCaps {
  mustRunUsd: number;
  canWaitUsd: number;
}

export function groupCapsFromEnv(): GroupCaps {
  return {
    mustRunUsd: envUsd("AI_BG_MUSTRUN_DAILY_USD", DEFAULT_MUST_RUN_DAILY_USD),
    canWaitUsd: envUsd("AI_BG_CANWAIT_DAILY_USD", DEFAULT_CAN_WAIT_DAILY_USD),
  };
}

// ── pure rules ───────────────────────────────────────────────────────

export interface SpendToday {
  /** USD per AiUsage feature since IST midnight (landed rows + this process's pending). */
  usdByFeature: ReadonlyMap<string, number>;
  /** AiUsage rows per feature since yesterday's IST midnight (the floor's "had a run"). */
  rowsSinceYesterday: ReadonlyMap<string, number>;
}

export interface CreditState {
  /** Newest empty-balance failure known (any process), or null. */
  lastCreditFailAt: Date | null;
  /** Newest student-facing success after it, or null. */
  lastStudentOkAt: Date | null;
  /** The AI was unavailable for OUTAGE_PAUSE_MIN_MS or more earlier today (IST). */
  outageToday: boolean;
}

export type GuardReason = "credit-cooldown" | "outage-day" | "job-cap" | "group-cap";

export type GuardDecision =
  | { allow: true; floor?: true }
  | { allow: false; reason: GuardReason; spentUsd?: number; capUsd?: number };

/** True while the last known call failed on an empty balance less than 20 minutes ago. */
export function inCreditCooldown(credit: Pick<CreditState, "lastCreditFailAt" | "lastStudentOkAt">, now: Date): boolean {
  const f = credit.lastCreditFailAt;
  if (!f) return false;
  if (now.getTime() - f.getTime() >= CREDIT_COOLDOWN_MS) return false;
  return !(credit.lastStudentOkAt && credit.lastStudentOkAt.getTime() > f.getTime());
}

/**
 * Did today (IST) hold an outage of 30 minutes or more? For each credit
 * failure today, the outage lasted at least until the first student-facing
 * success after it (or until now, when none came yet). Two blips of a minute
 * or two each start no pause.
 */
export function hadOutageToday(failures: readonly Date[], studentOks: readonly Date[], now: Date): boolean {
  const dayStart = istDayStart(now).getTime();
  const oks = [...studentOks].map((d) => d.getTime()).sort((a, b) => a - b);
  for (const f of failures) {
    const t = f.getTime();
    if (t < dayStart || t > now.getTime()) continue;
    const back = oks.find((o) => o > t);
    if ((back ?? now.getTime()) - t >= OUTAGE_PAUSE_MIN_MS) return true;
  }
  return false;
}

function sumOf(map: ReadonlyMap<string, number>, features: Iterable<string>): number {
  let s = 0;
  for (const f of features) s += map.get(f) ?? 0;
  return s;
}

/** The decision for one background call. Pure. */
export function decideBackgroundCall(args: {
  feature: string;
  now: Date;
  spend: SpendToday;
  credit: CreditState;
  caps: GroupCaps;
  estUsd?: number;
}): GuardDecision {
  const cap = BACKGROUND_CAPS[args.feature];
  // Student-facing and unknown features: never blocked.
  if (!cap) return { allow: true };
  if (inCreditCooldown(args.credit, args.now)) return { allow: false, reason: "credit-cooldown" };

  const ledger = ledgerOf(args.feature);
  let floor = false;
  if (cap.group === "can-wait" && args.credit.outageToday) {
    // Floor: no run yesterday and none today → this run goes ahead.
    floor = sumOf(args.spend.rowsSinceYesterday, ledger) === 0 && sumOf(args.spend.usdByFeature, ledger) === 0;
    if (!floor) return { allow: false, reason: "outage-day" };
  }

  const est = Math.max(0, args.estUsd ?? cap.estUsd);
  const jobSpent = sumOf(args.spend.usdByFeature, ledger);
  if (jobSpent + est > cap.capUsd + 1e-9) return { allow: false, reason: "job-cap", spentUsd: round(jobSpent), capUsd: cap.capUsd };

  if (!cap.outsideAllowance) {
    const groupCap = cap.group === "must-run" ? args.caps.mustRunUsd : args.caps.canWaitUsd;
    const groupSpent = sumOf(args.spend.usdByFeature, groupLedger(cap.group));
    if (groupSpent + est > groupCap + 1e-9) return { allow: false, reason: "group-cap", spentUsd: round(groupSpent), capUsd: groupCap };
  }
  return floor ? { allow: true, floor: true } : { allow: true };
}

function round(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

/**
 * An empty balance as the API reported it: the SDK's own error (or one that
 * carries its HTTP status). classifyTutorFailure also reads plain message
 * text, and a parse failure can quote model output ("…billing…", "…usage
 * limit…"); that is not an outage and must not pause every job (review,
 * 7 Oct 2026).
 */
export function isApiCreditError(err: unknown): boolean {
  const apiShaped = err instanceof Anthropic.APIError || typeof (err as { status?: unknown } | null)?.status === "number";
  return apiShaped && classifyTutorFailure(err) === "credit";
}

// ── the guard a cron run holds ───────────────────────────────────────

export interface SpendGuardDeps {
  now(): Date;
  /** Landed AiUsage USD since `dayStart` and row counts since `yesterdayStart`, for `features`. */
  readSpend(features: readonly string[], dayStart: Date, yesterdayStart: Date): Promise<{ usd: Map<string, number>; rows: Map<string, number> }>;
  /** Credit-failure times since `since`, oldest first. */
  readCreditFailures(since: Date): Promise<Date[]>;
  /** Student-facing success times since `since`, oldest first. */
  readStudentOks(since: Date): Promise<Date[]>;
  /** This process's ledger rows not landed yet (src/lib/ai/usage.ts). */
  pendingUsd(features: readonly string[]): number;
  /** One AnalyticsEvent row. Never throws. */
  writeEvent(props: Record<string, unknown>): Promise<void>;
  log(line: string): void;
  caps: GroupCaps;
}

export interface SpendGuardSummary {
  held: Record<string, Partial<Record<GuardReason, number>>>;
  creditStops: string[];
  floorRuns: string[];
}

export interface SpendGuard {
  /** Ask before one model call. A "no" is logged (console every time, one event per job and reason). */
  allow(feature: string, estUsd?: number): Promise<GuardDecision>;
  /**
   * Tell the guard a call failed. Returns true when it was an empty balance:
   * the caller stops making calls this run, and every other background job
   * skips for the next 20 minutes.
   */
  noteFailure(feature: string, err: unknown): Promise<boolean>;
  summary(): SpendGuardSummary;
}

// 15 s, not longer (review, 7 Oct 2026): pendingUsd covers rows handed to
// after(), but an awaited row (the answer-key check, recordAiUsageAwaited)
// is only in the ledger, so a long cache would let a run's own calls go
// uncounted for that long.
const SPEND_TTL_MS = 15_000;
const CREDIT_TTL_MS = 30_000;

export function createSpendGuard(overrides: Partial<SpendGuardDeps> = {}): SpendGuard {
  const deps: SpendGuardDeps = { ...defaultDeps(), ...overrides };
  let spendAt = 0;
  let spend: { usd: Map<string, number>; rows: Map<string, number> } | null = null;
  let creditAt = 0;
  let credit: CreditState = { lastCreditFailAt: null, lastStudentOkAt: null, outageToday: false };
  // A failure seen by this run counts at once, whatever the database says.
  let localCreditFailAt: Date | null = null;
  const held: SpendGuardSummary["held"] = {};
  const written = new Set<string>();
  const creditStops: string[] = [];
  const floorRuns = new Set<string>();

  async function loadSpend(now: Date) {
    if (spend && now.getTime() - spendAt < SPEND_TTL_MS) return spend;
    const dayStart = istDayStart(now);
    const yesterdayStart = new Date(dayStart.getTime() - DAY_MS);
    try {
      spend = await deps.readSpend(BACKGROUND_FEATURES, dayStart, yesterdayStart);
    } catch (err) {
      // Fail open: a broken ledger read never stops a job.
      deps.log(`[spend-guard] ledger read failed, allowing: ${String((err as Error)?.message ?? err).slice(0, 120)}`);
      spend = { usd: new Map(), rows: new Map() };
    }
    spendAt = now.getTime();
    return spend;
  }

  async function loadCredit(now: Date) {
    if (now.getTime() - creditAt >= CREDIT_TTL_MS) {
      const dayStart = istDayStart(now);
      const since = new Date(Math.min(dayStart.getTime(), now.getTime() - CREDIT_COOLDOWN_MS));
      try {
        const failures = await deps.readCreditFailures(since);
        if (failures.length === 0) {
          credit = { lastCreditFailAt: null, lastStudentOkAt: null, outageToday: false };
        } else {
          const oks = await deps.readStudentOks(failures[0]);
          const last = failures[failures.length - 1];
          const okAfter = oks.filter((o) => o.getTime() > last.getTime());
          credit = {
            lastCreditFailAt: last,
            lastStudentOkAt: okAfter.length ? okAfter[okAfter.length - 1] : null,
            outageToday: hadOutageToday(failures, oks, now),
          };
        }
      } catch (err) {
        deps.log(`[spend-guard] credit read failed, allowing: ${String((err as Error)?.message ?? err).slice(0, 120)}`);
        credit = { lastCreditFailAt: null, lastStudentOkAt: null, outageToday: false };
      }
      creditAt = now.getTime();
    }
    if (localCreditFailAt && (!credit.lastCreditFailAt || localCreditFailAt > credit.lastCreditFailAt)) {
      return { ...credit, lastCreditFailAt: localCreditFailAt, lastStudentOkAt: null };
    }
    return credit;
  }

  return {
    async allow(feature, estUsd) {
      if (!BACKGROUND_CAPS[feature]) return { allow: true };
      const now = deps.now();
      const [s, c] = await Promise.all([loadSpend(now), loadCredit(now)]);
      let pending = new Map<string, number>();
      try {
        pending = new Map(BACKGROUND_FEATURES.map((f) => [f, deps.pendingUsd([f])]));
      } catch {
        // pending unknown → landed rows only
      }
      const usdByFeature = new Map<string, number>();
      for (const f of BACKGROUND_FEATURES) usdByFeature.set(f, (s.usd.get(f) ?? 0) + (pending.get(f) ?? 0));
      const spendNow = { usdByFeature, rowsSinceYesterday: s.rows };
      let d = decideBackgroundCall({ feature, now, spend: spendNow, credit: c, caps: deps.caps, estUsd });
      // The floor is one RUN, not one call: once this run went ahead inside
      // the pause, its later calls are judged by the caps alone.
      if (!d.allow && d.reason === "outage-day" && floorRuns.has(feature)) {
        d = decideBackgroundCall({ feature, now, spend: spendNow, credit: { ...c, outageToday: false }, caps: deps.caps, estUsd });
      }
      if (d.allow) {
        if (d.floor && !floorRuns.has(feature)) {
          floorRuns.add(feature);
          deps.log(`[spend-guard] ${feature}: runs inside today's outage pause (no run yesterday or today)`);
        }
        return d;
      }
      const byReason = (held[feature] ??= {});
      byReason[d.reason] = (byReason[d.reason] ?? 0) + 1;
      deps.log(
        `[spend-guard] held ${feature}: ${d.reason}${d.spentUsd !== undefined ? ` ($${d.spentUsd.toFixed(2)} of $${d.capUsd?.toFixed(2)} today)` : ""}`,
      );
      const key = `${feature}|${d.reason}`;
      if (!written.has(key)) {
        written.add(key);
        await deps.writeEvent({
          surface: BACKGROUND_SURFACE,
          action: "skip",
          feature,
          group: BACKGROUND_CAPS[feature].group,
          reason: d.reason,
          ...(d.spentUsd !== undefined ? { spentUsd: d.spentUsd, capUsd: d.capUsd } : {}),
        });
      }
      return d;
    },

    async noteFailure(feature, err) {
      let credit: boolean;
      try {
        credit = isApiCreditError(err);
      } catch {
        return false;
      }
      if (!credit) return false;
      const now = deps.now();
      localCreditFailAt = now;
      creditStops.push(feature);
      deps.log(`[spend-guard] ${feature}: empty AI balance; background calls pause for 20 minutes`);
      // The marker other runs read (reason "credit").
      await deps.writeEvent({ surface: BACKGROUND_SURFACE, action: "credit-fail", feature, reason: "credit" });
      return true;
    },

    summary() {
      return { held, creditStops: [...creditStops], floorRuns: [...floorRuns] };
    },
  };
}

// ── database I/O (fails open; no writes under vitest) ────────────────

function defaultDeps(): SpendGuardDeps {
  const writesOff = !!process.env.VITEST;
  return {
    now: () => new Date(),
    caps: groupCapsFromEnv(),
    log: (line) => console.warn(line),
    async readSpend(features, dayStart, yesterdayStart) {
      const rows = (await prisma.$queryRawUnsafe(
        `SELECT feature,
                COALESCE(SUM("costUsd") FILTER (WHERE "createdAt" >= $2), 0)::float AS usd,
                COUNT(*)::int AS n
           FROM "AiUsage"
          WHERE "createdAt" >= $1 AND feature = ANY($3::text[])
          GROUP BY feature`,
        yesterdayStart,
        dayStart,
        [...features],
      )) as Array<{ feature: string; usd: number; n: number }>;
      return {
        usd: new Map(rows.map((r) => [r.feature, Number(r.usd) || 0])),
        rows: new Map(rows.map((r) => [r.feature, Number(r.n) || 0])),
      };
    },
    async readCreditFailures(since) {
      // Newest 500, returned oldest first: on a long outage the latest
      // failure is the one the cool-down needs.
      const rows = (await prisma.$queryRawUnsafe(
        `SELECT "createdAt" FROM "AnalyticsEvent"
          WHERE kind = 'CTA_CLICKED'::"EventKind" AND "createdAt" >= $1
            AND props->>'reason' = 'credit' AND props->>'surface' IN ('ai-unavailable', $2)
          ORDER BY "createdAt" DESC LIMIT 500`,
        since,
        BACKGROUND_SURFACE,
      )) as Array<{ createdAt: Date }>;
      return rows.map((r) => new Date(r.createdAt)).reverse();
    },
    async readStudentOks(since) {
      const rows = (await prisma.$queryRawUnsafe(
        `SELECT "createdAt" FROM "AiUsage"
          WHERE "createdAt" > $1 AND feature = ANY($2::text[])
          ORDER BY "createdAt" ASC LIMIT 5000`,
        since,
        [...STUDENT_FEATURES],
      )) as Array<{ createdAt: Date }>;
      return rows.map((r) => new Date(r.createdAt));
    },
    pendingUsd: (features) => pendingUsageUsd(features),
    async writeEvent(props) {
      if (writesOff) return;
      try {
        // Not a person: client "bot" keeps the row out of every human counter.
        await recordEvent({ kind: "CTA_CLICKED", client: "bot", props });
      } catch (err) {
        console.error("[spend-guard] event not written:", (err as Error)?.message);
      }
    },
  };
}
