// Pure unit tests: which coach tasks tick (16 Sep 2026). One definition for
// /api/coach/today, /coach and the dashboard strip — and only honest
// signals: opening a notes page (readAt) never ticks a topic task.
// No DB, no model: the DB client and the Anthropic client are mocked so
// importing coach-plan.ts / coach-done.ts is side-effect free.
// Run: npx vitest run tests/unit/coach-done.test.ts

import { describe, it, expect, vi } from "vitest";

const queryRaw = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db/prisma", () => ({ prisma: { $queryRaw: queryRaw } }));
vi.mock("@/lib/ai/client", () => ({
  callClaude: vi.fn(),
  cachedSystem: (...b: string[]) => b,
  parseJson: (s: string) => JSON.parse(s),
  MODEL: "test",
}));

import { drillHref, type CoachTask } from "@/lib/coach-plan";
import {
  coachTaskDoneFlags,
  doneFlags,
  istDayStart,
  showsDoneCount,
  taskDone,
  type DayActivity,
  type DayAttempt,
} from "@/lib/coach-done";

const readTask: CoachTask = {
  kind: "read",
  label: "Percentage — read the notes, then test yourself (10 Qs)",
  href: "/exams/SSC_CGL/topics/quant.percentage",
};
const reviseTask: CoachTask = { kind: "test", label: "Revise weak topic: Ratio", href: "/exams/SSC_CGL/topics/quant.ratio" };
const drillTask: CoachTask = { kind: "test", label: "Polity — drill 5", href: drillHref("SSC_CGL", "ga.polity") };
const mockTask: CoachTask = { kind: "mock", label: "Full SSC CGL mock", href: "/exams/SSC_CGL" };
const liveTask: CoachTask = { kind: "livetest", label: "All-India Live Test", href: "/live-test" };
const daily5: CoachTask = { kind: "daily5", label: "Daily 5 — keep the streak", href: "/dashboard" };
const examDay: CoachTask = { kind: "read", label: "Today is your SSC CGL exam.", href: "/exams/SSC_CGL" };
const postExam: CoachTask = { kind: "read", label: "Your SSC CGL exam is done", href: "/coach?next=1&from=SSC_CGL" };

function attempt(over: Partial<DayAttempt>): DayAttempt {
  return { type: "TOPIC", generatedBy: "ai", coachTopic: null, examCode: "SSC_CGL", topics: [], parents: [], ...over };
}
function act(over: Partial<DayActivity> = {}): DayActivity {
  return { completedTopics: new Set(), attempts: [], ...over };
}

describe("topic tasks — only a real completion signal ticks", () => {
  it("opening the notes page (readAt only) is NOT done", () => {
    // readAt is not part of DayActivity at all: an open page leaves no trace here.
    expect(taskDone(readTask, act())).toBe(false);
    expect(taskDone(reviseTask, act())).toBe(false);
  });

  it("'Mark topic done' today (completedAt) ticks it — for that exam only", () => {
    expect(taskDone(readTask, act({ completedTopics: new Set(["SSC_CGL:quant.percentage"]) }))).toBe(true);
    expect(taskDone(readTask, act({ completedTopics: new Set(["SSC_CHSL:quant.percentage"]) }))).toBe(false);
  });

  it("a submitted topic quiz on the topic (or on its sub-topics) ticks it", () => {
    expect(taskDone(readTask, act({ attempts: [attempt({ topics: ["quant.percentage"] })] }))).toBe(true);
    expect(taskDone(readTask, act({ attempts: [attempt({ topics: ["quant.percentage.successive"], parents: ["quant.percentage"] })] }))).toBe(true);
    expect(taskDone(reviseTask, act({ attempts: [attempt({ type: "SUBJECT", generatedBy: "coach-drill", coachTopic: "quant.ratio" })] }))).toBe(true);
  });

  it("a full mock or adaptive set that merely includes the topic does not", () => {
    expect(taskDone(readTask, act({ attempts: [attempt({ type: "FULL", generatedBy: "system", topics: ["quant.percentage"] })] }))).toBe(false);
    expect(taskDone(readTask, act({ attempts: [attempt({ type: "ADAPTIVE", topics: ["quant.percentage"] })] }))).toBe(false);
  });

  it("a topic quiz on the same code in another exam does not", () => {
    expect(taskDone(readTask, act({ attempts: [attempt({ examCode: "SSC_CHSL", topics: ["quant.percentage"] })] }))).toBe(false);
  });
});

describe("other task kinds keep their rules", () => {
  it("drill: an assigned drill or any set that covered the topic", () => {
    expect(taskDone(drillTask, act())).toBe(false);
    expect(taskDone(drillTask, act({ attempts: [attempt({ type: "SUBJECT", generatedBy: "coach-drill", coachTopic: "ga.polity" })] }))).toBe(true);
    expect(taskDone(drillTask, act({ attempts: [attempt({ type: "ADAPTIVE", topics: ["ga.polity"] })] }))).toBe(true);
  });

  it("full mock needs a FULL non-live-test attempt; live test needs a live-test attempt", () => {
    const topicQuiz = act({ attempts: [attempt({})] });
    expect(taskDone(mockTask, topicQuiz)).toBe(false);
    expect(taskDone(mockTask, act({ attempts: [attempt({ type: "FULL", generatedBy: "live-test" })] }))).toBe(false);
    expect(taskDone(mockTask, act({ attempts: [attempt({ type: "FULL", generatedBy: "system" })] }))).toBe(true);
    expect(taskDone(liveTask, act({ attempts: [attempt({ type: "FULL", generatedBy: "live-test" })] }))).toBe(true);
    expect(taskDone(liveTask, topicQuiz)).toBe(false);
  });

  it("Daily 5 ticks on any submitted attempt (the habit task)", () => {
    expect(taskDone(daily5, act())).toBe(false);
    expect(taskDone(daily5, act({ attempts: [attempt({ type: "FULL" })] }))).toBe(true);
  });

  it("exam-day and post-exam tasks never tick, and hide the N/M count", () => {
    const busy = act({ attempts: [attempt({ type: "FULL", generatedBy: "system" })], completedTopics: new Set(["SSC_CGL:x"]) });
    expect(taskDone(examDay, busy)).toBe(false);
    expect(taskDone(postExam, busy)).toBe(false);
    expect(showsDoneCount("exam-day")).toBe(false);
    expect(showsDoneCount("post-exam")).toBe(false);
    expect(showsDoneCount("final")).toBe(true);
    expect(showsDoneCount("cover")).toBe(true);
  });

  it("doneFlags keeps task order", () => {
    expect(doneFlags([readTask, daily5, mockTask], act({ attempts: [attempt({ topics: ["quant.percentage"] })] }))).toEqual([true, true, false]);
  });
});

describe("istDayStart", () => {
  it("is IST midnight as a UTC instant", () => {
    expect(istDayStart(new Date("2026-09-16T15:45:00.000Z")).toISOString()).toBe("2026-09-15T18:30:00.000Z");
    expect(istDayStart(new Date("2026-09-15T18:29:59.000Z")).toISOString()).toBe("2026-09-14T18:30:00.000Z");
  });
});

describe("a failed activity read", () => {
  it("rejects — never '0/N done' over tasks the student finished", async () => {
    queryRaw.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("timeout"));
    await expect(coachTaskDoneFlags("u1", [daily5, mockTask])).rejects.toThrow("timeout");
  });

  it("reads fine → flags", async () => {
    queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([attempt({ type: "TOPIC" })]);
    await expect(coachTaskDoneFlags("u1", [daily5, mockTask])).resolves.toEqual([true, false]);
  });
});
