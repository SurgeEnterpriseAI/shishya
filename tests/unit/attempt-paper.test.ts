// The paper an attempt actually had (25 Sep 2026) — pure logic, no DB.
//
// A shared mock's slot can be swapped after students took it (the SBI Clerk
// fix of 24 Sep; scripts/tmp-datafix-sysmock-unvalidated-sep25.ts), and a PYQ
// year set can grow or shrink. The results page, result card and challenge
// link must show a past taker the questions they had, with their own
// answers — never a question they did not see.
// The result card and "challenge a friend" readers run against an in-memory
// Prisma stub (no DB, no network).
// Run: npx vitest run tests/unit/attempt-paper.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  attempt: null as unknown,
  questions: [] as { id: string; examId: string; validated: boolean; type: string }[],
  inserted: [] as unknown[][],
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    attempt: {
      findUnique: async () => db.attempt,
      findFirst: async () => null,
    },
    question: {
      findMany: async ({ where }: { where: { id: { in: string[] }; examId?: string; validated?: boolean; type?: string } }) =>
        db.questions
          .filter(
            (q) =>
              where.id.in.includes(q.id) &&
              (where.examId === undefined || q.examId === where.examId) &&
              (where.validated === undefined || q.validated === where.validated) &&
              (where.type === undefined || q.type === where.type),
          )
          .map((q) => ({ id: q.id })),
    },
    $queryRaw: async () => [],
    $executeRaw: async (_s: TemplateStringsArray, ...values: unknown[]) => {
      db.inserted.push(values);
      return 1;
    },
  },
}));
vi.mock("@/lib/live-test", () => ({ liveTestRank: async () => null }));
vi.mock("@/lib/email", () => ({ sendEmail: async () => undefined }));
vi.mock("@/lib/web-push", () => ({ pushConfigured: () => false, sendPush: async () => "sent" }));
vi.mock("@/lib/anon-quiz", () => ({ getAnonQuiz: async () => null }));

import { loadResultCard } from "@/lib/result-card-db";
import { createChallenge } from "@/lib/challenge-db";
import {
  attemptPaperIds,
  isGradedAnswerList,
  readSlotSwaps,
  withSlotSwaps,
  SLOT_SWAPS_KEY,
  type SlotSwap,
} from "@/lib/attempt-paper";
import { gradeSubmission } from "@/lib/attempts-submit";

const KEYS: Record<string, string> = { q1: "A", q2: "B", q3: "C", q4: "D", old: "A", neu: "B", neu2: "C", q5: "A" };
const byId = new Map(
  Object.entries(KEYS).map(([id, answerKey]) => [
    id,
    { id, answerKey, topicId: "t1", topicCode: "quant.x", topicName: "X", difficulty: "MEDIUM" as const },
  ]),
);

/** What submit writes: scoreAttempt's graded list over `paper`. */
function graded(paper: string[], chosen: Record<string, string | null>) {
  return gradeSubmission({
    questionIds: paper,
    questionsById: byId,
    stored: Object.entries(chosen).map(([questionId, c]) => ({ questionId, chosen: c, timeSec: 5, marked: false })),
    marksPerQ: 2,
    negativeMark: 0.5,
  });
}

const SWAP_AT = "2026-09-25T12:00:00.000Z";
const BEFORE = new Date("2026-09-20T10:00:00.000Z");
const AFTER = new Date("2026-09-26T10:00:00.000Z");
const OLD_PAPER = ["q1", "q2", "old", "q4"];
const NEW_PAPER = ["q1", "q2", "neu", "q4"];
const swap: SlotSwap = { slot: 2, from: "old", to: "neu", at: SWAP_AT, by: "datafix:test" };
const swappedConfig = withSlotSwaps({ durationMin: 60, mockIndex: 1 }, [swap]);

describe("isGradedAnswerList", () => {
  it("is true only for submit's graded list", () => {
    expect(isGradedAnswerList(graded(OLD_PAPER, { q1: "A" }).scored)).toBe(true);
    expect(isGradedAnswerList([{ questionId: "q1", chosen: "A", timeSec: 3, marked: false }])).toBe(false);
    expect(isGradedAnswerList([])).toBe(false);
    expect(isGradedAnswerList(null)).toBe(false);
    expect(isGradedAnswerList([{ questionId: "q1", correct: true, marks: 2 }, null])).toBe(false);
  });
});

describe("attemptPaperIds — finished before the swap", () => {
  const done = graded(OLD_PAPER, { q1: "A", old: "A", q4: "B" });

  it("an untouched paper is the mock's paper", () => {
    expect(attemptPaperIds({ questionIds: OLD_PAPER, answers: done.scored, startedAt: BEFORE })).toEqual(OLD_PAPER);
  });

  it("after the swap it is still the paper the student had, with their answer to the old question", () => {
    const paper = attemptPaperIds({ questionIds: NEW_PAPER, answers: done.scored, startedAt: BEFORE, config: swappedConfig });
    expect(paper).toEqual(OLD_PAPER);
    const rec = (done.scored as { questionId: string; chosen: string | null; correct: boolean }[]).find((a) => a.questionId === paper[2]);
    expect(rec).toMatchObject({ chosen: "A", correct: true });
  });

  it("works without a swap log too (the 24 Sep SBI Clerk swap logged nothing)", () => {
    expect(attemptPaperIds({ questionIds: NEW_PAPER, answers: done.scored, startedAt: BEFORE })).toEqual(OLD_PAPER);
  });

  it("the review's correct count matches the stored grade", () => {
    const paper = attemptPaperIds({ questionIds: NEW_PAPER, answers: done.scored, startedAt: BEFORE, config: swappedConfig });
    const byQ = new Map((done.scored as { questionId: string; correct: boolean }[]).map((a) => [a.questionId, a]));
    const correct = paper.filter((id) => byQ.get(id)?.correct).length;
    expect(correct).toBe(2); // q1 and old; q4 wrong
    expect(done.scoreRaw).toBe(2 * 2 - 0.5);
  });

  it("a PYQ set that grew later shows only the questions the attempt had", () => {
    const small = graded(["q1", "q2"], { q1: "A" });
    expect(attemptPaperIds({ questionIds: ["q1", "q2", "q3", "q4"], answers: small.scored })).toEqual(["q1", "q2"]);
  });

  it("a set that shrank later keeps the question that left it", () => {
    const full = graded(["q1", "q2", "q3"], { q3: "C" });
    expect(attemptPaperIds({ questionIds: ["q1", "q2"], answers: full.scored })).toEqual(["q1", "q2", "q3"]);
  });
});

describe("attemptPaperIds — legacy ungraded answers", () => {
  it("keeps the mock's current order (the old behaviour)", () => {
    const legacy = [{ questionId: "q2", chosen: "B", timeSec: 4, marked: false }];
    expect(attemptPaperIds({ questionIds: OLD_PAPER, answers: legacy })).toEqual(OLD_PAPER);
    expect(attemptPaperIds({ questionIds: OLD_PAPER, answers: null })).toEqual(OLD_PAPER);
  });

  it("but a logged swap after the attempt started walks the slot back", () => {
    const legacy = [{ questionId: "old", chosen: "A", timeSec: 4, marked: false }];
    expect(attemptPaperIds({ questionIds: NEW_PAPER, answers: legacy, startedAt: BEFORE, config: swappedConfig })).toEqual(OLD_PAPER);
  });
});

describe("attemptPaperIds — unfinished at the swap, submitted later", () => {
  it("graded on the new paper with the new question unanswered → shows the old question it had", () => {
    // Stored answers had nothing for "old" (the data fix never swaps a slot
    // an unfinished attempt answered); the time-up screen submits later.
    const late = graded(NEW_PAPER, { q1: "A", q4: "D" });
    const paper = attemptPaperIds({ questionIds: NEW_PAPER, answers: late.scored, startedAt: BEFORE, config: swappedConfig });
    expect(paper).toEqual(OLD_PAPER);
    // Same grade as the old paper with "old" unanswered (both are 0 marks).
    const onOld = graded(OLD_PAPER, { q1: "A", q4: "D" });
    expect(late.scoreRaw).toBe(onOld.scoreRaw);
    expect(late.scoreMax).toBe(onOld.scoreMax);
  });

  it("a replacement the student did answer was seen, so it stays", () => {
    const answeredNew = graded(NEW_PAPER, { neu: "B" });
    expect(attemptPaperIds({ questionIds: NEW_PAPER, answers: answeredNew.scored, startedAt: BEFORE, config: swappedConfig })).toEqual(NEW_PAPER);
  });

  it("an attempt that started after the swap had the new paper", () => {
    const fresh = graded(NEW_PAPER, {});
    expect(attemptPaperIds({ questionIds: NEW_PAPER, answers: fresh.scored, startedAt: AFTER, config: swappedConfig })).toEqual(NEW_PAPER);
  });

  it("no startedAt → the swap log is not used", () => {
    const late = graded(NEW_PAPER, {});
    expect(attemptPaperIds({ questionIds: NEW_PAPER, answers: late.scored, config: swappedConfig })).toEqual(NEW_PAPER);
  });

  it("a slot swapped twice walks back to what the attempt had", () => {
    const second: SlotSwap = { slot: 2, from: "neu", to: "neu2", at: "2026-09-27T12:00:00.000Z" };
    const cfg = withSlotSwaps(swappedConfig, [second]);
    const latest = ["q1", "q2", "neu2", "q4"];
    const late = graded(latest, {});
    expect(attemptPaperIds({ questionIds: latest, answers: late.scored, startedAt: BEFORE, config: cfg })).toEqual(OLD_PAPER);
    // Started between the two swaps: it had "neu".
    expect(attemptPaperIds({ questionIds: latest, answers: late.scored, startedAt: AFTER, config: cfg })).toEqual(NEW_PAPER);
  });

  it("never puts the old question in twice", () => {
    const weird = graded(["q1", "old", "neu", "q4"], {});
    expect(
      attemptPaperIds({ questionIds: ["q1", "old", "neu", "q4"], answers: weird.scored, startedAt: BEFORE, config: swappedConfig }),
    ).toEqual(["q1", "old", "neu", "q4"]);
  });
});

describe("readSlotSwaps / withSlotSwaps", () => {
  it("appends to the log and keeps every other config key", () => {
    const cfg = withSlotSwaps({ durationMin: 60, rehearsal: false }, [swap]);
    expect(cfg).toMatchObject({ durationMin: 60, rehearsal: false });
    expect(readSlotSwaps(cfg)).toEqual([swap]);
    const two = withSlotSwaps(cfg, [{ slot: 0, from: "q1", to: "q5", at: SWAP_AT }]);
    expect(readSlotSwaps(two)).toHaveLength(2);
    expect(withSlotSwaps(null, [swap])).toEqual({ [SLOT_SWAPS_KEY]: [swap] });
  });

  it("ignores malformed entries", () => {
    const cfg = {
      [SLOT_SWAPS_KEY]: [
        swap,
        { slot: -1, from: "a", to: "b", at: SWAP_AT },
        { slot: 1, from: "a", to: "a", at: SWAP_AT },
        { slot: 1, from: "a", to: "b", at: "not a date" },
        { slot: 1.5, from: "a", to: "b", at: SWAP_AT },
        "junk",
        null,
      ],
    };
    expect(readSlotSwaps(cfg)).toEqual([swap]);
    expect(readSlotSwaps({ [SLOT_SWAPS_KEY]: "x" })).toEqual([]);
    expect(readSlotSwaps(undefined)).toEqual([]);
  });
});

describe("result card and challenge read the attempt's own paper", () => {
  // A 9-question shared mock; slot 3 ("old", pulled) was swapped for "neu".
  const PAPER_OLD = ["q1", "q2", "old", "q4", "q5", "q6", "q7", "q8", "q9"];
  const PAPER_NEW = ["q1", "q2", "neu", "q4", "q5", "q6", "q7", "q8", "q9"];
  const keys: Record<string, string> = { q6: "A", q7: "B", q8: "C", q9: "D" };
  const qById = new Map(
    [...PAPER_OLD, "neu"].map((id) => [
      id,
      { id, answerKey: KEYS[id] ?? keys[id], topicId: "t1", topicCode: "quant.x", topicName: "X", difficulty: "MEDIUM" as const },
    ]),
  );
  const done = gradeSubmission({
    questionIds: PAPER_OLD,
    questionsById: qById,
    stored: [
      { questionId: "q1", chosen: "A", timeSec: 5, marked: false },
      { questionId: "old", chosen: "A", timeSec: 5, marked: false },
      { questionId: "q6", chosen: "A", timeSec: 5, marked: false },
    ],
    marksPerQ: 1,
    negativeMark: 0,
  });

  beforeEach(() => {
    db.inserted = [];
    db.questions = [...PAPER_OLD, "neu"].map((id) => ({ id, examId: "ex1", validated: id !== "old", type: "MCQ" }));
    db.attempt = {
      id: "att1",
      userId: "u1",
      status: "SUBMITTED",
      scoreRaw: done.scoreRaw,
      scoreMax: done.scoreMax,
      scorePct: done.scorePct,
      answers: done.scored,
      startedAt: BEFORE,
      finishedAt: new Date("2026-09-20T11:00:00.000Z"),
      user: { name: "Ravi Kumar" },
      mock: {
        id: "m1",
        userId: null,
        examId: "ex1",
        generatedBy: "system:full-mock:1",
        config: withSlotSwaps({ durationMin: 60 }, [{ slot: 2, from: "old", to: "neu", at: SWAP_AT }]),
        questionIds: PAPER_NEW,
        exam: { code: "SSC_CGL", shortName: "SSC CGL", active: true },
      },
    };
  });

  it("the result card counts the answer to the question the student had", async () => {
    const card = await loadResultCard("att1", "u1");
    expect(card?.correct).toBe(3); // q1, old, q6 — "old" was answered right
    expect(card?.total).toBe(9);
  });

  it("a challenge is cut from the attempt's paper — never the swapped-in question the maker didn't see", async () => {
    const r = await createChallenge({ source: "mock", attemptId: "att1", name: null, locale: "en" }, { userId: "u1", anonId: null });
    expect(r.ok).toBe(true);
    const ids = db.inserted[0][4] as string[];
    // "old" is no longer servable to a friend and "neu" was never on this paper.
    expect(ids).not.toContain("neu");
    expect(ids).not.toContain("old");
    expect(ids).toEqual(["q1", "q2", "q4", "q5", "q6", "q7", "q8", "q9"]);
    if (r.ok) {
      expect(r.creatorCorrect).toBe(2); // q1 and q6
      expect(r.questionCount).toBe(8);
    }
  });
});
