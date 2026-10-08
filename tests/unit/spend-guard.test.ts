// Background AI spend guard (7 Oct 2026, resilience plan builds 3 + 5b/5c,
// src/lib/ai/spend-guard.ts).
//
// Why: the Anthropic credit is topped up by hand; it ran dry 19 times between
// 19 Sep and 7 Oct, and a scheduled job was the last spender before 6 of
// those. The guard every cron asks before a model call must: keep student
// features out of it entirely; stop can-wait jobs at $1.75 a day and
// must-run jobs at $3.99 (each job also at its own cap); skip every
// background call for 20 minutes after an empty-balance failure unless a
// student call has succeeded since; hold can-wait work for the rest of a day
// that had a 30-minute outage, except a job that has not run since
// yesterday; and fail open when a read breaks. No DB, no model call.

import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: { aiUsage: { create: h.create } } }));

import Anthropic from "@anthropic-ai/sdk";
import {
  AI_FEATURE_CLASS,
  BACKGROUND_CAPS,
  BACKGROUND_FEATURES,
  CREDIT_COOLDOWN_MS,
  DEFAULT_CAN_WAIT_DAILY_USD,
  DEFAULT_MUST_RUN_DAILY_USD,
  STUDENT_FEATURES,
  createSpendGuard,
  decideBackgroundCall,
  groupCapsFromEnv,
  groupLedger,
  hadOutageToday,
  inCreditCooldown,
  isApiCreditError,
  istDayStart,
  ledgerOf,
  type CreditState,
  type SpendGuardDeps,
} from "@/lib/ai/spend-guard";
import { pendingUsageUsd, recordAiUsage } from "@/lib/ai/usage";
import { classifyTutorFailure } from "@/lib/ai/tutor-failure";

const MIN = 60_000;
/** 7 Oct 2026, 15:00 IST. */
const NOW = new Date("2026-10-07T09:30:00Z");
const ist = (hhmm: string, day = "2026-10-07") => new Date(Date.parse(`${day}T${hhmm}:00Z`) - 330 * MIN);
const CAPS = { mustRunUsd: DEFAULT_MUST_RUN_DAILY_USD, canWaitUsd: DEFAULT_CAN_WAIT_DAILY_USD };
const CLEAR: CreditState = { lastCreditFailAt: null, lastStudentOkAt: null, outageToday: false };

function spend(usd: Record<string, number> = {}, rows: Record<string, number> = {}) {
  return { usdByFeature: new Map(Object.entries(usd)), rowsSinceYesterday: new Map(Object.entries(rows)) };
}
function decide(feature: string, opts: { usd?: Record<string, number>; rows?: Record<string, number>; credit?: Partial<CreditState>; estUsd?: number } = {}) {
  return decideBackgroundCall({
    feature,
    now: NOW,
    spend: spend(opts.usd, opts.rows),
    credit: { ...CLEAR, ...opts.credit },
    caps: CAPS,
    estUsd: opts.estUsd,
  });
}
/** The SDK's own empty-balance error. */
function apiError(status: number, type: string, message: string) {
  return Anthropic.APIError.generate(status, { type: "error", error: { type, message } }, message, {} as any);
}
const creditError = () =>
  apiError(400, "invalid_request_error", "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.");

describe("classification: every ledger feature has a class", () => {
  // Every feature in AiUsage over 23 Sep-7 Oct 2026 (scripts/tmp-fix-b2-examinfo.ts),
  // plus the three labels this build adds.
  const SEEN = [
    "bank-solve", "bank-verify", "exam-info", "school-gen", "akr-crawl", "tutor", "phase-article-web", "translate",
    "fresh-questions", "tutor-anon", "school-notes", "mock-adaptive", "explain", "state-depth-gen", "akr-check",
    "vacancies", "current-affairs", "coach-day", "rank-bands", "ask", "tutor-late", "daily-brief", "student-360",
    "mock-user-request", "phase-article", "demand-mine", "seed-discussions", "tutor-school", "question-adjudicate",
    "results-extract", "demand-consolidate", "intent-router", "tutor-late-probe",
  ];
  const NEW = ["exam-info-other", "phase-article-today", "phase-article-today-web", "akr-plan"];

  it("classifies every feature the ledger has seen and every new label", () => {
    for (const f of [...SEEN, ...NEW]) expect(AI_FEATURE_CLASS[f], f).toBeDefined();
  });

  it("the tutor, explain, translate, Ask and fresh sets are student-facing; bulk scripts are bulk", () => {
    for (const f of ["tutor", "tutor-anon", "tutor-school", "tutor-late", "tutor-late-probe", "explain", "translate", "ask", "fresh-questions", "mock-adaptive"]) {
      expect(AI_FEATURE_CLASS[f], f).toBe("student");
    }
    for (const f of ["bank-solve", "bank-verify", "school-gen", "akr-crawl"]) expect(AI_FEATURE_CLASS[f], f).toBe("bulk");
  });

  it("exam-week news, exam-day pages, current affairs, coach notes and the 21:00 answer-key check are must-run", () => {
    for (const f of ["exam-info", "phase-article-today", "current-affairs", "coach-day", "akr-check", "results-extract", "question-adjudicate"]) {
      expect(BACKGROUND_CAPS[f].group, f).toBe("must-run");
    }
  });

  it("other exams' news, other exam-week pages, vacancies, rank bands, the brief note, demand mining and the Monday plan can wait", () => {
    for (const f of ["exam-info-other", "phase-article", "vacancies", "rank-bands", "daily-brief", "demand-mine", "akr-plan"]) {
      expect(BACKGROUND_CAPS[f].group, f).toBe("can-wait");
    }
  });

  it("every job's ledger features carry the job's class; no student feature is a job or in a job's ledger", () => {
    for (const [key, cap] of Object.entries(BACKGROUND_CAPS)) {
      for (const f of ledgerOf(key)) expect(AI_FEATURE_CLASS[f], `${key} → ${f}`).toBe(cap.group);
    }
    for (const f of STUDENT_FEATURES) {
      expect(BACKGROUND_CAPS[f]).toBeUndefined();
      expect(BACKGROUND_FEATURES).not.toContain(f);
    }
  });

  it("the Monday plan stays outside the can-wait allowance; the 21:00 check is inside the must-run one", () => {
    expect(groupLedger("can-wait")).not.toContain("akr-plan");
    expect(groupLedger("must-run")).toContain("akr-check");
    expect(groupLedger("must-run")).toEqual(expect.arrayContaining(["exam-info", "phase-article-today", "phase-article-today-web"]));
    expect(groupLedger("can-wait")).toEqual(expect.arrayContaining(["exam-info-other", "phase-article", "phase-article-web"]));
  });
});

describe("student-facing features are never blocked", () => {
  it("whatever the spend, the credit state or the outage", () => {
    const worst = {
      usd: Object.fromEntries(BACKGROUND_FEATURES.map((f) => [f, 50])),
      credit: { lastCreditFailAt: new Date(NOW.getTime() - MIN), lastStudentOkAt: null, outageToday: true },
    };
    for (const f of [...STUDENT_FEATURES, "some-new-feature"]) expect(decide(f, worst), f).toEqual({ allow: true });
  });

  it("the guard answers yes without reading anything", async () => {
    const deps = fakeDeps();
    const guard = createSpendGuard(deps);
    expect(await guard.allow("tutor")).toEqual({ allow: true });
    expect(await guard.allow("translate")).toEqual({ allow: true });
    expect(deps.readSpend).not.toHaveBeenCalled();
    expect(deps.readCreditFailures).not.toHaveBeenCalled();
  });
});

describe("caps (5b): per job, then per group", () => {
  it("defaults are $3.99 must-run and $1.75 can-wait; the env can change them, junk is ignored", () => {
    expect(CAPS).toEqual({ mustRunUsd: 3.99, canWaitUsd: 1.75 });
    vi.stubEnv("AI_BG_CANWAIT_DAILY_USD", "1.00");
    vi.stubEnv("AI_BG_MUSTRUN_DAILY_USD", "abc");
    expect(groupCapsFromEnv()).toEqual({ mustRunUsd: 3.99, canWaitUsd: 1 });
    vi.unstubAllEnvs();
  });

  it("a job stops when today's spend plus one call would pass its own cap", () => {
    expect(decide("exam-info", { usd: { "exam-info": 1.8 } })).toEqual({ allow: true }); // 1.80 + 0.21 ≤ 2.05
    expect(decide("exam-info", { usd: { "exam-info": 1.9 } })).toEqual({ allow: false, reason: "job-cap", spentUsd: 1.9, capUsd: 2.05 });
    // current affairs: up to three paid calls a day (the 6 Oct retry rule)
    expect(decide("current-affairs", { usd: { "current-affairs": 0.48 } }).allow).toBe(true);
    expect(decide("current-affairs", { usd: { "current-affairs": 0.72 } }).allow).toBe(false);
  });

  it("a job's ledger counts every label it writes (exam-day pages: plain and web)", () => {
    expect(decide("phase-article-today", { usd: { "phase-article-today-web": 0.3 } })).toMatchObject({ allow: false, reason: "job-cap" });
  });

  it("can-wait jobs together stop at $1.75 though each is under its own cap", () => {
    const usd = { "exam-info-other": 1.0, "phase-article-web": 0.25, vacancies: 0.14, "daily-brief": 0.05, "demand-mine": 0.05, "demand-consolidate": 0.03, "rank-bands": 0.03 };
    // $1.55 spent: a rank-band call ($0.018) fits, an exam-news call ($0.21) does not
    expect(decide("rank-bands", { usd }).allow).toBe(true);
    expect(decide("exam-info-other", { usd })).toMatchObject({ allow: false, reason: "group-cap", capUsd: 1.75 });
  });

  it("must-run jobs together stop at $3.99; can-wait spend does not count against them", () => {
    const usd = { "exam-info": 2.05, "phase-article-today-web": 0.5, "current-affairs": 0.25, "coach-day": 0.2, "akr-check": 0.9 };
    expect(decide("results-extract", { usd }).allow).toBe(true); // 3.90 + 0.007
    expect(decide("question-adjudicate", { usd: { ...usd, "results-extract": 0.03 }, estUsd: 0.07 })).toMatchObject({ allow: false, reason: "group-cap", capUsd: 3.99 });
    expect(decide("coach-day", { usd: { "exam-info-other": 1.75, vacancies: 0.15 } }).allow).toBe(true);
  });

  it("the Monday plan is held only by its own $3.00, not by the can-wait allowance, and its spend leaves the allowance alone", () => {
    expect(decide("akr-plan", { usd: { "exam-info-other": 1.75 } }).allow).toBe(true);
    expect(decide("akr-plan", { usd: { "akr-plan": 2.9 } })).toMatchObject({ allow: false, reason: "job-cap", capUsd: 3 });
    expect(decide("vacancies", { usd: { "akr-plan": 3.0 } }).allow).toBe(true);
  });
});

describe("credit cool-down (build 3, simplest form): no retry storms", () => {
  it("a credit failure 5 minutes ago holds every background job, must-run included", () => {
    const credit = { lastCreditFailAt: new Date(NOW.getTime() - 5 * MIN) };
    expect(decide("exam-info", { credit })).toEqual({ allow: false, reason: "credit-cooldown" });
    expect(decide("vacancies", { credit })).toEqual({ allow: false, reason: "credit-cooldown" });
  });

  it("ends 20 minutes after the failure", () => {
    expect(inCreditCooldown({ lastCreditFailAt: new Date(NOW.getTime() - CREDIT_COOLDOWN_MS + 1000), lastStudentOkAt: null }, NOW)).toBe(true);
    expect(inCreditCooldown({ lastCreditFailAt: new Date(NOW.getTime() - CREDIT_COOLDOWN_MS), lastStudentOkAt: null }, NOW)).toBe(false);
  });

  it("ends at once when a student-facing call succeeded after the failure (the top-up came), not before it", () => {
    const fail = new Date(NOW.getTime() - 5 * MIN);
    expect(inCreditCooldown({ lastCreditFailAt: fail, lastStudentOkAt: new Date(NOW.getTime() - 2 * MIN) }, NOW)).toBe(false);
    expect(inCreditCooldown({ lastCreditFailAt: fail, lastStudentOkAt: new Date(NOW.getTime() - 9 * MIN) }, NOW)).toBe(true);
  });
});

describe("outage day (5c): can-wait work waits until midnight", () => {
  it("an outage of 30 minutes or more today starts the pause", () => {
    // 2 Oct-style: dry from 06:47, first student success 12:01
    expect(hadOutageToday([ist("06:47"), ist("07:00")], [ist("12:01")], NOW)).toBe(true);
    // still dry, 40 minutes since the failure
    expect(hadOutageToday([new Date(NOW.getTime() - 40 * MIN)], [], NOW)).toBe(true);
  });

  it("two blips of a few minutes start none (30 Sep 23:31 and 23:55)", () => {
    const late = new Date(Date.parse("2026-09-30T23:59:00Z") - 330 * MIN);
    expect(hadOutageToday([ist("23:31", "2026-09-30"), ist("23:55", "2026-09-30")], [ist("23:33", "2026-09-30"), ist("23:58", "2026-09-30")], late)).toBe(false);
  });

  it("yesterday's outage starts none today; a 10-minute-old failure is not yet an outage", () => {
    expect(hadOutageToday([ist("06:47", "2026-10-06")], [ist("13:00", "2026-10-06")], NOW)).toBe(false);
    expect(hadOutageToday([new Date(NOW.getTime() - 10 * MIN)], [], NOW)).toBe(false);
  });

  it("holds can-wait jobs that ran yesterday or today; never must-run jobs", () => {
    const credit = { outageToday: true };
    expect(decide("vacancies", { credit, rows: { vacancies: 2 } })).toEqual({ allow: false, reason: "outage-day" });
    expect(decide("exam-info-other", { credit, usd: { "exam-info-other": 0.2 }, rows: { "exam-info-other": 1 } })).toEqual({ allow: false, reason: "outage-day" });
    expect(decide("exam-info", { credit, rows: { "exam-info": 9 } })).toEqual({ allow: true });
    expect(decide("current-affairs", { credit })).toEqual({ allow: true });
  });

  it("floor: a can-wait job with no run yesterday and none today runs (within its cap), so nothing waits two days running", () => {
    expect(decide("rank-bands", { credit: { outageToday: true } })).toEqual({ allow: true, floor: true });
    expect(decide("rank-bands", { credit: { outageToday: true }, estUsd: 0.06 })).toMatchObject({ allow: false, reason: "job-cap" });
  });
});

describe("istDayStart", () => {
  it("is IST midnight", () => {
    expect(istDayStart(new Date("2026-10-07T18:29:59Z")).toISOString()).toBe("2026-10-06T18:30:00.000Z");
    expect(istDayStart(new Date("2026-10-07T18:30:00Z")).toISOString()).toBe("2026-10-07T18:30:00.000Z");
  });
});

// ── the guard a run holds ────────────────────────────────────────────

function fakeDeps(over: Partial<SpendGuardDeps> = {}) {
  const deps = {
    now: vi.fn(() => NOW),
    caps: CAPS,
    readSpend: vi.fn(async () => ({ usd: new Map<string, number>(), rows: new Map<string, number>() })),
    readCreditFailures: vi.fn(async (): Promise<Date[]> => []),
    readStudentOks: vi.fn(async (): Promise<Date[]> => []),
    pendingUsd: vi.fn(() => 0),
    writeEvent: vi.fn(async () => {}),
    log: vi.fn(),
    ...over,
  };
  return deps;
}

describe("createSpendGuard", () => {
  it("one event per job and reason per run, a console line per skip, counts in the summary", async () => {
    const deps = fakeDeps({ readSpend: vi.fn(async () => ({ usd: new Map([["vacancies", 0.14]]), rows: new Map() })) });
    const guard = createSpendGuard(deps);
    for (let i = 0; i < 5; i++) expect((await guard.allow("vacancies")).allow).toBe(false);
    expect(deps.writeEvent).toHaveBeenCalledTimes(1);
    expect(deps.writeEvent).toHaveBeenCalledWith({
      surface: "ai-background",
      action: "skip",
      feature: "vacancies",
      group: "can-wait",
      reason: "job-cap",
      spentUsd: 0.14,
      capUsd: 0.15,
    });
    expect(deps.log).toHaveBeenCalledTimes(5);
    expect(guard.summary().held).toEqual({ vacancies: { "job-cap": 5 } });
    expect(deps.readSpend).toHaveBeenCalledTimes(1); // cached within the run
  });

  it("an empty balance stops this run at once and writes the marker other runs read; nothing else does", async () => {
    const deps = fakeDeps();
    const guard = createSpendGuard(deps);
    expect(await guard.noteFailure("exam-info", new Error("socket hang up"))).toBe(false);
    expect(await guard.noteFailure("exam-info", apiError(529, "overloaded_error", "Overloaded"))).toBe(false);
    expect(deps.writeEvent).not.toHaveBeenCalled();
    expect(await guard.noteFailure("exam-info", creditError())).toBe(true);
    expect(deps.writeEvent).toHaveBeenCalledWith({ surface: "ai-background", action: "credit-fail", feature: "exam-info", reason: "credit" });
    // The database knows nothing yet; this run holds anyway.
    expect(await guard.allow("exam-info")).toEqual({ allow: false, reason: "credit-cooldown" });
    expect(await guard.allow("coach-day")).toEqual({ allow: false, reason: "credit-cooldown" });
    expect(await guard.allow("tutor")).toEqual({ allow: true });
    expect(guard.summary().creditStops).toEqual(["exam-info"]);
  });

  it("a parse failure that quotes model text about billing or usage limits is not an empty balance (review, 7 Oct 2026)", async () => {
    const deps = fakeDeps();
    const guard = createSpendGuard(deps);
    const parse = new Error('exam-info JSON parse failed for SSC_CGL: {"news":[{"title":"Fee billing window and usage limits for the portal"');
    expect(classifyTutorFailure(parse)).toBe("credit"); // the shared classifier reads plain text…
    expect(isApiCreditError(parse)).toBe(false); // …the guard needs the API's own error
    expect(await guard.noteFailure("exam-info", parse)).toBe(false);
    expect(deps.writeEvent).not.toHaveBeenCalled();
    expect(await guard.allow("exam-info")).toEqual({ allow: true });
    // a status-carrying error with the API's text still counts
    expect(isApiCreditError(Object.assign(new Error("Your credit balance is too low"), { status: 400 }))).toBe(true);
    expect(isApiCreditError(creditError())).toBe(true);
  });

  it("reads another run's credit failure and the student success after it", async () => {
    const fail = new Date(NOW.getTime() - 4 * MIN);
    const held = createSpendGuard(fakeDeps({ readCreditFailures: vi.fn(async () => [fail]) }));
    expect(await held.allow("daily-brief")).toEqual({ allow: false, reason: "credit-cooldown" });
    const back = createSpendGuard(
      fakeDeps({ readCreditFailures: vi.fn(async () => [fail]), readStudentOks: vi.fn(async () => [new Date(NOW.getTime() - MIN)]) }),
    );
    expect(await back.allow("daily-brief")).toEqual({ allow: true });
  });

  it("counts this process's calls that have not landed in the ledger yet", async () => {
    const deps = fakeDeps({ pendingUsd: vi.fn((f: readonly string[]) => (f[0] === "exam-info" ? 1.9 : 0)) });
    expect(await createSpendGuard(deps).allow("exam-info")).toMatchObject({ allow: false, reason: "job-cap", spentUsd: 1.9 });
  });

  it("fails open when a read breaks", async () => {
    const deps = fakeDeps({
      readSpend: vi.fn(async () => {
        throw new Error("db down");
      }),
      readCreditFailures: vi.fn(async () => {
        throw new Error("db down");
      }),
      pendingUsd: vi.fn(() => {
        throw new Error("no such export");
      }),
    });
    expect(await createSpendGuard(deps).allow("exam-info")).toEqual({ allow: true });
    expect(deps.log).toHaveBeenCalledWith(expect.stringContaining("ledger read failed, allowing"));
  });

  it("an outage earlier today holds a can-wait job that ran yesterday", async () => {
    const deps = fakeDeps({
      readCreditFailures: vi.fn(async () => [ist("06:47")]),
      readStudentOks: vi.fn(async () => [ist("12:01")]),
      readSpend: vi.fn(async () => ({ usd: new Map(), rows: new Map([["vacancies", 2]]) })),
    });
    const guard = createSpendGuard(deps);
    expect(await guard.allow("vacancies")).toEqual({ allow: false, reason: "outage-day" });
    expect(await guard.allow("exam-info")).toEqual({ allow: true });
    // floor: rank bands had no run yesterday or today
    expect(await guard.allow("rank-bands")).toEqual({ allow: true, floor: true });
    expect(guard.summary().floorRuns).toEqual(["rank-bands"]);
  });

  it("the floor is one run, not one call: the run's later calls are judged by the caps alone", async () => {
    let pending = 0;
    const deps = fakeDeps({
      readCreditFailures: vi.fn(async () => [ist("06:47")]),
      readStudentOks: vi.fn(async () => [ist("12:01")]),
      pendingUsd: vi.fn((f: readonly string[]) => (f[0] === "rank-bands" ? pending : 0)),
    });
    const guard = createSpendGuard(deps);
    expect(await guard.allow("rank-bands")).toEqual({ allow: true, floor: true });
    pending = 0.018; // the first call, not landed yet
    expect(await guard.allow("rank-bands")).toEqual({ allow: true });
    pending = 0.036;
    expect(await guard.allow("rank-bands")).toMatchObject({ allow: false, reason: "job-cap" });
    // another can-wait job that did run yesterday is still held
    expect(await createSpendGuard({ ...deps, readSpend: vi.fn(async () => ({ usd: new Map(), rows: new Map([["vacancies", 1]]) })) }).allow("vacancies")).toEqual({
      allow: false,
      reason: "outage-day",
    });
  });
});

describe("pendingUsageUsd (src/lib/ai/usage.ts)", () => {
  beforeEach(() => {
    h.create.mockReset();
  });

  it("a row handed to the ledger counts until its insert settles", async () => {
    let land!: () => void;
    h.create.mockImplementation(() => new Promise<void>((r) => (land = () => r())));
    const cost = recordAiUsage("exam-info", { usage: { input_tokens: 10_000, output_tokens: 2_000 } }, { model: "claude-sonnet-4-5" });
    expect(cost).toBeCloseTo(0.06, 6);
    expect(h.create).toHaveBeenCalledTimes(1);
    expect(pendingUsageUsd(["exam-info"])).toBeCloseTo(cost, 6);
    expect(pendingUsageUsd(["vacancies"])).toBe(0);
    land();
    await new Promise((r) => setTimeout(r, 0));
    expect(pendingUsageUsd(["exam-info"])).toBe(0);
  });

  it("an entry whose insert never settled stops counting after 10 minutes", () => {
    h.create.mockImplementation(() => new Promise<void>(() => {}));
    const cost = recordAiUsage("rank-bands", { usage: { input_tokens: 1_000, output_tokens: 1_000 } }, { model: "claude-sonnet-4-5" });
    expect(pendingUsageUsd(["rank-bands"])).toBeCloseTo(cost, 6);
    expect(pendingUsageUsd(["rank-bands"], Date.now() + 11 * MIN)).toBe(0);
  });
});
