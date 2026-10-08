// The exam-news refresh run under the background spend guard (7 Oct 2026,
// B2 review; src/lib/exam-refresh-run.ts, src/lib/ai/spend-guard.ts).
//
// Why: on the dry-account mornings of 28 Sep and 2 Oct the run stamped 38
// exams as tried, called a dry account for each, and sent them to the back
// of the queue unrefreshed. Now: exam-week exams write "exam-info"
// (must-run) and the rest "exam-info-other" (can-wait); a held exam is not
// stamped; the first empty-balance failure stops the run and writes that
// exam's previous refreshAttemptedAt back. No DB, no model call.

import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  exams: [] as Array<Record<string, unknown>>,
  week: [] as Array<{ id: string; state: { phase: string; tier: string; daysTo: number } }>,
  executeRaw: vi.fn(),
  generate: vi.fn(),
  write: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    examNewsItem: { groupBy: vi.fn(async () => []) },
    exam: { findMany: vi.fn(async () => h.exams) },
    $executeRaw: (strings: TemplateStringsArray, ...values: unknown[]) => {
      h.executeRaw(strings.join("?"), values);
      return Promise.resolve(1);
    },
    $queryRawUnsafe: vi.fn(async () => [
      { code: "EXAM_A", people: 50 },
      { code: "EXAM_B", people: 3 },
    ]),
  },
}));
vi.mock("@/lib/db/exam-scope", () => ({ REAL_EXAM_WHERE: {} }));
vi.mock("@/lib/ai/exam-info", () => ({ generateExamInfo: h.generate }));
vi.mock("@/lib/exam-data-writer", () => ({ writeExamInfo: h.write, GEN_SOURCE: "ai-generated:claude" }));
vi.mock("@/lib/exam-week-aeo", () => ({ loadExamWeekExams: vi.fn(async () => h.week) }));

import Anthropic from "@anthropic-ai/sdk";
import { runExamDataRefresh } from "@/lib/exam-refresh-run";
import { isApiCreditError, type GuardDecision, type SpendGuard } from "@/lib/ai/spend-guard";

const NOW = new Date("2026-10-08T13:15:00Z"); // 18:45 IST
const DAY = 86_400_000;
const PREV_LANE = new Date(NOW.getTime() - DAY); // yesterday's 18:45
const PREV_TAIL = new Date(NOW.getTime() - 30 * DAY);

const creditError = () =>
  Anthropic.APIError.generate(
    400,
    { type: "error", error: { type: "invalid_request_error", message: "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits." } },
    "credit",
    {} as any,
  );

function exam(id: string, refreshAttemptedAt: Date) {
  return { id, code: id, name: id, shortName: id, category: "SSC", candidatesPerYear: 1000, refreshAttemptedAt, eligibility: null };
}

function fakeGuard(decide: (feature: string) => GuardDecision = () => ({ allow: true })): SpendGuard & { asked: string[] } {
  const asked: string[] = [];
  return {
    asked,
    allow: vi.fn(async (f: string) => {
      asked.push(f);
      return decide(f);
    }),
    noteFailure: vi.fn(async (_f: string, err: unknown) => isApiCreditError(err)),
    summary: () => ({ held: {}, creditStops: [], floorRuns: [] }),
  };
}

const stamps = () => h.executeRaw.mock.calls.filter((c) => String(c[0]).includes("NOW()")).map((c) => (c[1] as unknown[])[0]);
const writeBacks = () => h.executeRaw.mock.calls.filter((c) => !String(c[0]).includes("NOW()")).map((c) => c[1] as unknown[]);

beforeEach(() => {
  h.executeRaw.mockReset();
  h.generate.mockReset();
  h.write.mockReset();
  h.write.mockResolvedValue({ news: 1, dates: 1, datesDropped: 0, newsSuppressed: 0 });
  // LANE_X: 1 day after its exam day (twice a day, last refreshed 24 h ago);
  // EXAM_A / EXAM_B: not in exam week, last refreshed 30 days ago.
  h.exams = [exam("LANE_X", PREV_LANE), exam("EXAM_A", PREV_TAIL), exam("EXAM_B", PREV_TAIL)];
  h.week = [{ id: "LANE_X", state: { phase: "post", tier: "official", daysTo: -1 } }];
});

describe("runExamDataRefresh with the spend guard", () => {
  it("exam-week exams ask and write as 'exam-info', the rest as 'exam-info-other'", async () => {
    h.generate.mockResolvedValue({});
    const guard = fakeGuard();
    const r = await runExamDataRefresh({ now: NOW, guard });
    expect(guard.asked).toEqual(["exam-info", "exam-info-other", "exam-info-other"]);
    expect(h.generate.mock.calls.map((c) => [(c[0] as { examCode: string }).examCode, (c[1] as { usageFeature: string }).usageFeature])).toEqual([
      ["LANE_X", "exam-info"],
      ["EXAM_A", "exam-info-other"],
      ["EXAM_B", "exam-info-other"],
    ]);
    expect(r.held).toBe(0);
  });

  it("a held can-wait tail is neither called nor stamped; the lane still runs", async () => {
    h.generate.mockResolvedValue({});
    const guard = fakeGuard((f) => (f === "exam-info-other" ? { allow: false, reason: "outage-day" } : { allow: true }));
    const r = await runExamDataRefresh({ now: NOW, guard });
    expect(h.generate).toHaveBeenCalledTimes(1);
    expect(stamps()).toEqual(["LANE_X"]);
    // asked once for the tail, not once per tail exam
    expect(guard.asked).toEqual(["exam-info", "exam-info-other"]);
    expect(r.held).toBe(2);
  });

  it("a credit cool-down stops the whole run before any call or stamp", async () => {
    const guard = fakeGuard(() => ({ allow: false, reason: "credit-cooldown" }));
    const r = await runExamDataRefresh({ now: NOW, guard });
    expect(h.generate).not.toHaveBeenCalled();
    expect(stamps()).toEqual([]);
    expect(r.held).toBe(1);
  });

  it("an empty balance: one call, the run stops, and that exam's previous stamp is written back", async () => {
    h.generate.mockRejectedValue(creditError());
    const guard = fakeGuard();
    const r = await runExamDataRefresh({ now: NOW, guard });
    expect(h.generate).toHaveBeenCalledTimes(1);
    expect(stamps()).toEqual(["LANE_X"]);
    expect(writeBacks()).toEqual([[PREV_LANE, "LANE_X"]]);
    expect(guard.noteFailure).toHaveBeenCalledWith("exam-info", expect.anything());
    expect(r.spendGuard).toBeDefined();
  });

  it("3 tail exams a run, and the tail it cannot reach is not reported as failures", async () => {
    h.generate.mockResolvedValue({});
    h.exams = [...h.exams, ...["EXAM_C", "EXAM_D", "EXAM_E", "EXAM_F"].map((id) => exam(id, PREV_TAIL))];
    const r = await runExamDataRefresh({ now: NOW, guard: fakeGuard() });
    expect(h.generate).toHaveBeenCalledTimes(4); // LANE_X + 3 tail
    expect(r.failed).toBe(0);
    expect(r.queueDepth).toBe(4);
  });

  it("any other failure keeps the new stamp (to the back of the queue) and the run goes on", async () => {
    h.generate.mockRejectedValueOnce(new Error('exam-info JSON parse failed for LANE_X: {"news":"fee billing'));
    h.generate.mockResolvedValue({});
    const guard = fakeGuard();
    await runExamDataRefresh({ now: NOW, guard });
    expect(h.generate).toHaveBeenCalledTimes(3);
    expect(writeBacks()).toEqual([]);
  });
});
