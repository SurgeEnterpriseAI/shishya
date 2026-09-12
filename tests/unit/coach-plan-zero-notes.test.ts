// Pure unit tests: the coach never sends a student to an empty notes page
// (audit 11 Sep 2026 — 1,012 of 1,419 enrolments were on exams with zero
// topic notes, and the default task landed on "Study notes are still
// being prepared"). No DB, no model: the DB client and the Anthropic
// client are mocked so importing coach-plan.ts is side-effect free.
// Run: npx vitest run tests/unit/coach-plan-zero-notes.test.ts

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/ai/client", () => ({
  callClaude: vi.fn(),
  cachedSystem: (...b: string[]) => b,
  parseJson: (s: string) => JSON.parse(s),
  MODEL: "test",
}));

import {
  deterministicTaskIds,
  taskFromId,
  drillScope,
  drillTask,
  remapStoredTasks,
  DRILL_HREF_PREFIX,
  DRILL_MIN_QS,
  DRILL_MOCK_TYPE,
  type CoachTask,
  type PlanContext,
  type TopicInfo,
} from "@/lib/coach-plan";

function topic(over: Partial<TopicInfo> & Pick<TopicInfo, "code" | "name">): TopicInfo {
  return {
    id: `id-${over.code}`,
    mastery: null,
    priority: 1,
    hasNotes: false,
    qDrill: 0,
    subjectCode: "GA",
    subjectName: "General Awareness",
    qSubject: 0,
    ...over,
  };
}

function makeCtx(pool: TopicInfo[], over: Partial<PlanContext> = {}): PlanContext {
  return {
    userId: "u1",
    examId: "e1",
    examCode: "X_EXAM",
    examShort: "X",
    examDate: new Date("2026-12-01T00:00:00Z"),
    dailyMinutes: 90, // → 2 topics per day
    dayNumber: 1,
    totalDays: 80,
    daysLeft: 80,
    phase: "cover",
    status: "fresh",
    progress: { covered: 0, total: pool.length, mastered: 0 },
    triage: null,
    pool,
    topicsByCode: new Map(pool.map((t) => [t.code, t])),
    qExam: 12,
    isSunday: false,
    ...over,
  };
}

// Three zero-notes topics: A has its own pool, B is thin (subject
// fallback), C has nothing in its subject (exam fallback).
const A = topic({ code: "A", name: "Ancient History", qDrill: 5, qSubject: 20 });
const B = topic({ code: "B", name: "Budget Basics", qDrill: 2, qSubject: 10 });
const C = topic({ code: "C", name: "Census", qDrill: 0, qSubject: 0, subjectCode: "ST", subjectName: "Statistics" });

function resolve(ctx: PlanContext): CoachTask[] {
  return deterministicTaskIds(ctx)
    .map((id) => taskFromId(ctx, id))
    .filter((t): t is CoachTask => Boolean(t));
}

describe("zero-notes exam — no read:* task, no link to a notes page", () => {
  const ctx = makeCtx([A, B, C]);

  it("emits test:<topic> ids instead of read:<topic> in the cover phase", () => {
    const ids = deterministicTaskIds(ctx);
    expect(ids.some((id) => id.startsWith("read:"))).toBe(false);
    expect(ids).toContain("test:A");
    expect(ids).toContain("test:B");
    expect(ids).toContain("daily5");
  });

  it("the day's task list has no /topics/ href and every drill says why", () => {
    const tasks = resolve(ctx);
    expect(tasks.length).toBeGreaterThan(0);
    for (const t of tasks) expect(t.href).not.toMatch(/\/topics\//);
    const drills = tasks.filter((t) => t.href.startsWith(DRILL_HREF_PREFIX));
    expect(drills).toHaveLength(2);
    for (const d of drills) {
      expect(d.kind).toBe("test");
      expect(d.label).toMatch(/not ready yet/);
      expect(d.label).not.toMatch(/tomorrow|coming soon|check back/i);
    }
  });

  it("own pool → 'drill N questions instead'; thin pool → names the subject", () => {
    const a = taskFromId(ctx, "test:A")!;
    expect(a.label).toBe("Ancient History — notes for this topic are not ready yet; drill 5 questions instead");
    expect(a.href).toBe("/api/coach/today/drill?exam=X_EXAM&topic=A");

    const b = taskFromId(ctx, "test:B")!;
    expect(b.label).toContain("General Awareness");
    expect(b.label).toContain("only 2 validated questions on this topic");
    expect(b.label).toContain("drill 5 from General Awareness instead");
  });

  it("empty subject → exam-wide drill naming the exam; nothing validated → no task at all", () => {
    const c = taskFromId(ctx, "test:C")!;
    expect(c.href.startsWith(DRILL_HREF_PREFIX)).toBe(true);
    expect(c.label).toContain("Statistics");
    expect(c.label).toContain("mixed X questions");

    const dry = makeCtx([C], { qExam: 2 });
    expect(taskFromId(dry, "test:C")).toBeNull();
    expect(drillTask(dry, C)).toBeNull();
    // The plan still has no dead link — the drill is dropped, not faked.
    const tasks = resolve(dry);
    for (const t of tasks) expect(t.href).not.toMatch(/\/topics\//);
    expect(tasks.map((t) => t.kind)).toEqual(["daily5"]);
  });

  it("final phase: revise:<topic> also lands on the drill, never the notes page", () => {
    const fin = makeCtx([A, B, C], { phase: "final", daysLeft: 5 });
    const ids = deterministicTaskIds(fin);
    expect(ids).toContain("fullmock");
    expect(ids).toContain("revise:A");
    const r = taskFromId(fin, "revise:A")!;
    expect(r.kind).toBe("test");
    expect(r.href.startsWith(DRILL_HREF_PREFIX)).toBe(true);
    for (const t of resolve(fin)) expect(t.href).not.toMatch(/\/topics\//);
  });

  it("encodes topic codes in the drill href", () => {
    const dotted = topic({ code: "quant.percentage", name: "Percentage", qDrill: 9, qSubject: 9 });
    const c2 = makeCtx([dotted]);
    expect(taskFromId(c2, "test:quant.percentage")!.href).toBe(
      "/api/coach/today/drill?exam=X_EXAM&topic=quant.percentage",
    );
    const spaced = topic({ code: "a b&c", name: "Odd", qDrill: 9, qSubject: 9 });
    const c3 = makeCtx([spaced]);
    expect(taskFromId(c3, "test:a b&c")!.href).toBe("/api/coach/today/drill?exam=X_EXAM&topic=a%20b%26c");
  });
});

describe("control — topics WITH notes keep the exact task they had (plan shape stable)", () => {
  const An = { ...A, hasNotes: true };
  const Bn = { ...B, hasNotes: true };
  const withNotes = makeCtx([An, Bn, C]);
  const zeroNotes = makeCtx([A, B, C]);

  it("read:<topic> → the notes page with the original label", () => {
    const ids = deterministicTaskIds(withNotes);
    expect(ids).toEqual(["read:A", "read:B", "daily5"]);
    const a = taskFromId(withNotes, "read:A")!;
    expect(a).toEqual({
      kind: "read",
      label: "Ancient History — read the notes, then test yourself (10 Qs)",
      href: "/exams/X_EXAM/topics/A",
    });
    const rev = taskFromId(withNotes, "revise:A")!;
    expect(rev).toEqual({ kind: "test", label: "Revise weak topic: Ancient History", href: "/exams/X_EXAM/topics/A" });
  });

  it("same slots, same order, same count — only the id prefix differs", () => {
    const a = deterministicTaskIds(withNotes);
    const b = deterministicTaskIds(zeroNotes);
    expect(b).toHaveLength(a.length);
    expect(b.map((id) => id.replace(/^test:/, "read:"))).toEqual(a);
  });

  it("an explicit test:<topic> id drills even when notes exist (the AI menu never offers it then, but the id stays valid)", () => {
    const t = taskFromId(withNotes, "test:A")!;
    expect(t.href.startsWith(DRILL_HREF_PREFIX)).toBe(true);
  });
});

describe("remapStoredTasks — CoachDay rows written before this rule", () => {
  const N = topic({ code: "N", name: "Noted Topic", hasNotes: true, qDrill: 9, qSubject: 9 });
  const ctx = makeCtx([A, N, C]);

  it("re-routes a stored notes link for a notes-less topic to the drill, leaves everything else byte-identical", () => {
    const stale: CoachTask = { kind: "read", label: "Ancient History — read the notes, then test yourself (10 Qs)", href: "/exams/X_EXAM/topics/A" };
    const keep: CoachTask = { kind: "read", label: "Noted Topic — read the notes, then test yourself (10 Qs)", href: "/exams/X_EXAM/topics/N" };
    const mock: CoachTask = { kind: "mock", label: "Full X mock — exam-length, exam-silence", href: "/exams/X_EXAM" };
    const daily: CoachTask = { kind: "daily5", label: "Daily 5 — keep the streak", href: "/dashboard" };
    const out = remapStoredTasks(ctx, [stale, keep, mock, daily]);
    expect(out).toHaveLength(4);
    expect(out[0].href).toBe("/api/coach/today/drill?exam=X_EXAM&topic=A");
    expect(out[0].kind).toBe("test");
    expect(out[0].label).toMatch(/not ready yet/);
    expect(out[1]).toBe(keep);
    expect(out[2]).toBe(mock);
    expect(out[3]).toBe(daily);
    for (const t of out) if (t !== keep) expect(t.href).not.toMatch(/\/topics\//);
  });

  it("drops a stored notes link when nothing validated exists to drill (no dead link either way)", () => {
    const dry = makeCtx([C], { qExam: 0 });
    const stale: CoachTask = { kind: "read", label: "Census — read the notes, then test yourself (10 Qs)", href: "/exams/X_EXAM/topics/C" };
    expect(remapStoredTasks(dry, [stale])).toEqual([]);
  });

  it("ignores other exams' links, drill links and unknown topics", () => {
    const other: CoachTask = { kind: "read", label: "x", href: "/exams/OTHER/topics/A" };
    const drill: CoachTask = { kind: "test", label: "x", href: "/api/coach/today/drill?exam=X_EXAM&topic=A" };
    const unknown: CoachTask = { kind: "read", label: "x", href: "/exams/X_EXAM/topics/ZZZ" };
    const out = remapStoredTasks(ctx, [other, drill, unknown]);
    expect(out[0]).toBe(other);
    expect(out[1]).toBe(drill);
    expect(out[2]).toBe(unknown);
  });
});

describe("drillScope thresholds", () => {
  it("topic pool wins at DRILL_MIN_QS, subject next, exam last, else null", () => {
    expect(DRILL_MIN_QS).toBe(3);
    expect(drillScope({ qDrill: 3, qSubject: 0 }, 0)).toEqual({ scope: "topic", n: 3 });
    expect(drillScope({ qDrill: 9, qSubject: 0 }, 0)).toEqual({ scope: "topic", n: 5 });
    expect(drillScope({ qDrill: 2, qSubject: 3 }, 0)).toEqual({ scope: "subject", n: 3 });
    expect(drillScope({ qDrill: 2, qSubject: 40 }, 0)).toEqual({ scope: "subject", n: 5 });
    expect(drillScope({ qDrill: 0, qSubject: 2 }, 4)).toEqual({ scope: "exam", n: 4 });
    expect(drillScope({ qDrill: 2, qSubject: 2 }, 2)).toBeNull();
  });
});

describe("drill mock type — must not collide with Today's 5", () => {
  it("is never a type findTodaysDailyFive resumes as the Daily 5, and is a practice type the player accepts", () => {
    // src/lib/study-day-five.ts: any 5-question TOPIC/DIAGNOSTIC/ADAPTIVE
    // mock created today IS the student's Daily 5 — a drill stored under
    // one of those would hijack /today into the drill's results page.
    const dailyFiveSignatureTypes = ["TOPIC", "DIAGNOSTIC", "ADAPTIVE"];
    expect(dailyFiveSignatureTypes).not.toContain(DRILL_MOCK_TYPE);
    // src/app/mocks/[id]/page.tsx and /api/attempts/[id]/reveal PRACTICE_TYPES.
    const practiceTypes = ["TOPIC", "SUBJECT", "REVISION", "ADAPTIVE"];
    expect(practiceTypes).toContain(DRILL_MOCK_TYPE);
  });
});
