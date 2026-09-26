// The paper a mock SERVES (26 Sep 2026) — pure logic, no DB.
//
// The bank answer check withdraws questions (validated → false) that sit in
// the site's mocks and in students' sets. A mock must serve only questions
// that exist, are validated and are not tagged rejected; the paper an
// attempt starts with is persisted on it (skeleton rows with slots) so a
// resume keeps it whatever is withdrawn later, and submit grades that same
// list. Counts and titles say what is served; an empty paper is not started.
// Run: npx vitest run tests/unit/served-paper.test.ts

import { describe, it, expect } from "vitest";
import {
  MIN_SERVED_QUESTIONS,
  SERVED_PAPER_COPY,
  adoptPaper,
  answeredInPaper,
  canServePaper,
  honestMockTitle,
  isServable,
  liveTestPapersDiffer,
  paperSkeleton,
  persistedPaperIds,
  servedPaperCopy,
  servedPaperIds,
  withdrawnCount,
  withdrawnLine,
} from "@/lib/served-paper";
import { attemptPaperIds } from "@/lib/attempt-paper";
import { gradeSubmission, samePayloadAsGraded } from "@/lib/attempts-submit";
import { COPY_LOCALES } from "@/lib/ui-locale-copy";
import type { AnswerRecord } from "@/lib/attempts-sync";

type Q = { validated: boolean; tags?: string[] | null };
const bank = (rows: Record<string, Q>) => new Map(Object.entries(rows));

const SIX = ["q1", "q2", "q3", "q4", "q5", "q6"];
const BANK = bank({
  q1: { validated: true, tags: [] },
  q2: { validated: false, tags: [] }, // failed the answer check
  q3: { validated: true, tags: ["rejected"] }, // withdrawn by an admin
  // q4: deleted
  q5: { validated: true, tags: ["pyq"] },
  q6: { validated: true, tags: null },
});

function qmap(rows: Array<{ id: string; answerKey: string }>) {
  const m = new Map();
  for (const r of rows) {
    m.set(r.id, { id: r.id, answerKey: r.answerKey, topicId: "t1", topicCode: "topic.1", topicName: "Topic 1", difficulty: "MEDIUM" });
  }
  return m;
}
const rec = (questionId: string, patch: Partial<AnswerRecord> = {}): AnswerRecord => ({
  questionId,
  chosen: null,
  timeSec: 0,
  marked: false,
  ...patch,
});

describe("servedPaperIds", () => {
  it("keeps the mock's order and drops unknown, unvalidated and rejected-tagged questions", () => {
    expect(servedPaperIds({ questionIds: SIX }, BANK)).toEqual(["q1", "q5", "q6"]);
  });
  it("serves a duplicate id once", () => {
    expect(servedPaperIds({ questionIds: ["q6", "q1", "q6", "q1"] }, BANK)).toEqual(["q6", "q1"]);
  });
  it("serves everything when nothing is withdrawn", () => {
    const all = bank({ a: { validated: true }, b: { validated: true, tags: [] } });
    expect(servedPaperIds({ questionIds: ["b", "a"] }, all)).toEqual(["b", "a"]);
  });
  it("isServable: validated and not tagged rejected", () => {
    expect(isServable({ validated: true })).toBe(true);
    expect(isServable({ validated: true, tags: ["pyq"] })).toBe(true);
    expect(isServable({ validated: false })).toBe(false);
    expect(isServable({ validated: true, tags: ["rejected"] })).toBe(false);
    expect(isServable(undefined)).toBe(false);
    expect(isServable(null)).toBe(false);
  });
});

describe("canServePaper / withdrawnCount", () => {
  it("a paper under five questions is not started", () => {
    expect(MIN_SERVED_QUESTIONS).toBe(5);
    expect(canServePaper([])).toBe(false);
    expect(canServePaper(["a", "b", "c", "d"])).toBe(false);
    expect(canServePaper(["a", "b", "c", "d", "e"])).toBe(true);
  });
  it("counts the mock's slots that are not served, each id once", () => {
    expect(withdrawnCount({ questionIds: SIX }, ["q1", "q5", "q6"])).toBe(3);
    expect(withdrawnCount({ questionIds: ["q1", "q2", "q2"] }, ["q1"])).toBe(1);
    expect(withdrawnCount({ questionIds: ["q1"] }, ["q1"])).toBe(0);
  });
});

describe("paperSkeleton / persistedPaperIds", () => {
  it("one empty row per served question, in order, with its slot", () => {
    expect(paperSkeleton(["q1", "q5", "q6"])).toEqual([
      { questionId: "q1", chosen: null, timeSec: 0, marked: false, slot: 0 },
      { questionId: "q5", chosen: null, timeSec: 0, marked: false, slot: 1 },
      { questionId: "q6", chosen: null, timeSec: 0, marked: false, slot: 2 },
    ]);
  });
  it("round-trips: the skeleton IS the paper", () => {
    expect(persistedPaperIds(paperSkeleton(["q1", "q5", "q6"]))).toEqual(["q1", "q5", "q6"]);
  });
  it("orders by slot whatever order the rows are stored in, and keeps a saved row's slot", () => {
    const rows = [
      { questionId: "q3", chosen: null, timeSec: 0, marked: false, slot: 2 },
      { questionId: "q1", chosen: "B", timeSec: 12, marked: true, updatedAt: 1700000000000, slot: 0 },
      { questionId: "q2", chosen: null, timeSec: 0, marked: false, slot: 1 },
    ];
    expect(persistedPaperIds(rows)).toEqual(["q1", "q2", "q3"]);
  });
  it("a row without a slot is not in the paper; a list with no slots is not a persisted paper", () => {
    const rows = [...paperSkeleton(["q1", "q2"]), rec("q9", { chosen: "A" })];
    expect(persistedPaperIds(rows)).toEqual(["q1", "q2"]);
    expect(persistedPaperIds([rec("q1", { chosen: "A" }), rec("q2")])).toBeNull();
    expect(persistedPaperIds([])).toBeNull();
    expect(persistedPaperIds(null)).toBeNull();
    expect(persistedPaperIds("nope")).toBeNull();
  });
  it("ignores malformed slots and repeats an id once", () => {
    const rows = [
      { questionId: "q1", slot: 0 },
      { questionId: "q1", slot: 3 },
      { questionId: "q2", slot: -1 },
      { questionId: "q3", slot: 1.5 },
      { questionId: "", slot: 1 },
      { questionId: "q4", slot: "2" },
      { questionId: "q5", slot: 2 },
    ];
    expect(persistedPaperIds(rows)).toEqual(["q1", "q5"]);
  });
});

describe("adoptPaper (an attempt started before the paper was persisted)", () => {
  it("keeps what was saved for served questions, drops the rest, assigns slots in paper order", () => {
    const saved = [
      rec("q2", { chosen: "C", timeSec: 30, updatedAt: 5 }), // withdrawn since — dropped
      rec("q6", { chosen: "A", timeSec: 9, marked: true, updatedAt: 7 }),
      rec("q1", { chosen: "", timeSec: 3 }),
    ];
    expect(adoptPaper(saved, ["q1", "q5", "q6"])).toEqual([
      { questionId: "q1", chosen: null, timeSec: 3, marked: false, slot: 0 },
      { questionId: "q5", chosen: null, timeSec: 0, marked: false, slot: 1 },
      { questionId: "q6", chosen: "A", timeSec: 9, marked: true, updatedAt: 7, slot: 2 },
    ]);
  });
  it("an empty or malformed list adopts a plain skeleton", () => {
    expect(adoptPaper([], ["q1", "q5"])).toEqual(paperSkeleton(["q1", "q5"]));
    expect(adoptPaper(null, ["q1"])).toEqual(paperSkeleton(["q1"]));
    expect(adoptPaper([null, "x", { chosen: "A" }], ["q1"])).toEqual(paperSkeleton(["q1"]));
  });
});

describe("attemptPaperIds reads the persisted paper", () => {
  const started = "2026-09-26T08:00:00.000Z";
  it("a resumed attempt keeps the paper it started with — later withdrawals and a shrunk set are ignored", () => {
    // Started with q1 q2 q3; since then q2 was withdrawn and the PYQ page
    // re-synced the mock to q1 q3 q9.
    const answers = paperSkeleton(["q1", "q2", "q3"]);
    expect(attemptPaperIds({ questionIds: ["q1", "q3", "q9"], answers, startedAt: started })).toEqual(["q1", "q2", "q3"]);
  });
  it("a save merged into a skeleton row keeps the paper (slot kept, order from slots)", () => {
    const answers = [
      { questionId: "q1", chosen: null, timeSec: 0, marked: false, slot: 0 },
      { questionId: "q2", chosen: "B", timeSec: 20, marked: false, updatedAt: 1, slot: 1 },
      { questionId: "q3", chosen: null, timeSec: 0, marked: false, slot: 2 },
    ];
    expect(attemptPaperIds({ questionIds: ["q9"], answers, startedAt: started })).toEqual(["q1", "q2", "q3"]);
  });
  it("a finished attempt's graded list still wins", () => {
    const graded = [
      { questionId: "q1", chosen: "A", correct: true, marks: 1, timeSec: 5, marked: false },
      { questionId: "q3", chosen: null, correct: false, marks: 0, timeSec: 0, marked: false },
    ];
    expect(attemptPaperIds({ questionIds: ["q1", "q2", "q3"], answers: graded, startedAt: started })).toEqual(["q1", "q3"]);
  });
  it("a slot swap logged after the start is a no-op on a persisted paper (it already holds `from`)", () => {
    const answers = paperSkeleton(["q1", "q2", "q3"]);
    const config = { slotSwaps: [{ slot: 1, from: "q2", to: "q7", at: "2026-09-26T09:00:00.000Z" }] };
    expect(attemptPaperIds({ questionIds: ["q1", "q7", "q3"], answers, startedAt: started, config })).toEqual(["q1", "q2", "q3"]);
  });
  it("an attempt started before 26 Sep (no slots) falls back to the mock's current order, as before", () => {
    const answers = [rec("q2", { chosen: "A" })];
    expect(attemptPaperIds({ questionIds: ["q1", "q2", "q3"], answers, startedAt: started })).toEqual(["q1", "q2", "q3"]);
  });
});

describe("scoring over the attempt's own paper", () => {
  const QUESTIONS = qmap([
    { id: "q1", answerKey: "A" },
    { id: "q2", answerKey: "B" }, // withdrawn after the start; key as the bank holds it now
    { id: "q3", answerKey: "C" },
    { id: "q9", answerKey: "D" }, // in the mock now, never in this paper
  ]);
  it("a persisted paper is graded as it was served: scoreMax over the paper, an answer outside it is dropped", () => {
    const stored = paperSkeleton(["q1", "q2", "q3"]);
    const paper = persistedPaperIds(stored)!;
    const payload = [rec("q1", { chosen: "A" }), rec("q2", { chosen: "B" }), rec("q9", { chosen: "D" })];
    const r = gradeSubmission({ stored: stored as unknown as AnswerRecord[], payload, questionIds: paper, questionsById: QUESTIONS, marksPerQ: 2, negativeMark: 0.5 });
    expect(r.scored.map((s) => s.questionId)).toEqual(["q1", "q2", "q3"]);
    expect(r.scoreMax).toBe(6);
    expect(r.scoreRaw).toBe(4);
    expect(r.dropped).toEqual(["q9"]);
  });
  it("an attempt without a persisted paper is graded over the served list: a withdrawn question is neither counted nor scored", () => {
    const mockIds = ["q1", "q2", "q3"];
    const served = servedPaperIds(
      { questionIds: mockIds },
      bank({ q1: { validated: true }, q2: { validated: false }, q3: { validated: true } }),
    );
    expect(served).toEqual(["q1", "q3"]);
    const stored = [rec("q2", { chosen: "B" }), rec("q3", { chosen: "C" })];
    const r = gradeSubmission({ stored, payload: undefined, questionIds: served, questionsById: QUESTIONS, marksPerQ: 1, negativeMark: 0 });
    expect(r.scored.map((s) => s.questionId)).toEqual(["q1", "q3"]);
    expect(r.scoreMax).toBe(2);
    expect(r.scoreRaw).toBe(1);
  });
  it("a resubmit is compared over the paper the attempt was graded on, not the mock's list", () => {
    const graded = [
      { questionId: "q1", chosen: "A" },
      { questionId: "q3", chosen: null },
    ];
    const paper = attemptPaperIds({
      questionIds: ["q1", "q2", "q3"],
      answers: graded.map((g) => ({ ...g, correct: g.chosen === "A", marks: g.chosen === "A" ? 1 : 0 })),
    });
    expect(paper).toEqual(["q1", "q3"]);
    const payload = [rec("q1", { chosen: "A" }), rec("q2", { chosen: "B" })];
    expect(samePayloadAsGraded(graded, payload, paper)).toBe(true);
    expect(samePayloadAsGraded(graded, payload, ["q1", "q2", "q3"])).toBe(false);
  });
});

describe("honestMockTitle", () => {
  it("a title that states the size says the served size", () => {
    expect(honestMockTitle("TS Police PC — 2025 PYQ-pattern set (119 of 200 questions)", 119, 115)).toBe(
      "TS Police PC — 2025 PYQ-pattern set (115 of 200 questions)",
    );
    expect(honestMockTitle("RRB NTPC — 2021 PYQ-pattern set (19 of 100 questions)", 19, 17)).toBe(
      "RRB NTPC — 2021 PYQ-pattern set (17 of 100 questions)",
    );
    expect(honestMockTitle("SSC CGL — 100 questions, real pattern", 100, 96)).toBe("SSC CGL — 96 questions, real pattern");
    expect(honestMockTitle("TS Police PC — Quick Practice (20 Q)", 20, 16)).toBe("TS Police PC — Quick Practice (16 Q)");
  });
  it("leaves a year alone and a title with no count alone", () => {
    expect(honestMockTitle("MPSC Group C — 2025 (PYQ Pattern)", 100, 93)).toBe("MPSC Group C — 2025 (PYQ Pattern)");
    expect(honestMockTitle("KPSC — 2025 PYQ-pattern set (25 of 100 questions)", 25, 20)).toBe(
      "KPSC — 2025 PYQ-pattern set (20 of 100 questions)",
    );
    expect(honestMockTitle("MPESB Group — Full Mock 1", 200, 185)).toBe("MPESB Group — Full Mock 1");
  });
  it("is the stored title when nothing is withdrawn", () => {
    expect(honestMockTitle("X — set (19 of 100 questions)", 19, 19)).toBe("X — set (19 of 100 questions)");
    expect(honestMockTitle("X — set (19 of 100 questions)", 0, 0)).toBe("X — set (19 of 100 questions)");
  });
});

describe("liveTestPapersDiffer (the rank note's condition)", () => {
  it("true only when the ranked papers carry more than one scoreMax", () => {
    // TNPSC Group I rehearsal on 26 Sep: three takers graded over 25 × 1.5,
    // a taker after the fix over 19 × 1.5 — papers differ, the note is true.
    expect(liveTestPapersDiffer([37.5, 37.5, 37.5, 28.5])).toBe(true);
    expect(liveTestPapersDiffer([25, 24])).toBe(true);
  });
  it("false when a question was withdrawn BEFORE the window opened — everyone had the same shorter paper", () => {
    expect(liveTestPapersDiffer([24, 24, 24])).toBe(false);
  });
  it("false when nothing was withdrawn, for one taker, for nobody, and ignores null / non-finite", () => {
    expect(liveTestPapersDiffer([25, 25])).toBe(false);
    expect(liveTestPapersDiffer([25])).toBe(false);
    expect(liveTestPapersDiffer([])).toBe(false);
    expect(liveTestPapersDiffer([25, null, undefined, Number.NaN])).toBe(false);
    expect(liveTestPapersDiffer([null, 25, 24])).toBe(true);
  });
});

describe("answeredInPaper (the exits' 'answered of total')", () => {
  const saved = [
    rec("q1", { chosen: "A" }),
    rec("q2", { chosen: "B" }), // withdrawn since — outside the paper
    rec("q5", { chosen: "" }), // blank
    rec("q6", { chosen: "  " }), // blank
    rec("q1", { chosen: "C" }), // a duplicate row for q1 counts once
    { questionId: 7, chosen: "A" },
    null,
  ];
  it("counts a chosen option on a question of the paper, each question once", () => {
    expect(answeredInPaper(saved, ["q1", "q5", "q6"])).toBe(1);
    expect(answeredInPaper(saved, ["q1", "q2", "q5", "q6"])).toBe(2);
  });
  it("is 0 for an empty paper, no answers or a non-list", () => {
    expect(answeredInPaper(saved, [])).toBe(0);
    expect(answeredInPaper([], ["q1"])).toBe(0);
    expect(answeredInPaper(null, ["q1"])).toBe(0);
    expect(answeredInPaper(paperSkeleton(["q1", "q5"]), ["q1", "q5"])).toBe(0);
  });
});

describe("copy (en, hi, te)", () => {
  const keys = Object.keys(SERVED_PAPER_COPY.en) as (keyof typeof SERVED_PAPER_COPY.en)[];
  it("every locale carries every line, non-empty", () => {
    for (const loc of COPY_LOCALES) {
      for (const k of keys) expect(SERVED_PAPER_COPY[loc][k].trim().length, `${loc}.${k}`).toBeGreaterThan(0);
      expect(SERVED_PAPER_COPY[loc].withdrawnMany).toContain("{k}");
      expect(SERVED_PAPER_COPY[loc].withdrawnOne).not.toContain("{k}");
      expect(SERVED_PAPER_COPY[loc].rebuildBody).toContain("{exam}");
      expect(SERVED_PAPER_COPY[loc].rebuildBack).toContain("{exam}");
      expect(SERVED_PAPER_COPY[loc].rebuildAttemptAnswered).toContain("{answered}");
      expect(SERVED_PAPER_COPY[loc].rebuildSubmit).toContain("{answered}");
      expect(SERVED_PAPER_COPY[loc].rebuildAttemptEmpty).not.toContain("{answered}");
    }
  });
  it("the English lines are the ones the page promises", () => {
    expect(SERVED_PAPER_COPY.en.withdrawnMany).toBe("{k} questions were withdrawn after an answer check and are not served.");
    expect(SERVED_PAPER_COPY.en.rebuildTitle).toBe("This mock is being rebuilt");
    expect(SERVED_PAPER_COPY.en.rebuildDiscard).toBe("Discard this attempt");
    expect(SERVED_PAPER_COPY.en.rebuildSubmit).toBe("Submit my {answered} answers & see the result");
  });
  it("the live-test rank note claims only what the cohort's scoreMax establishes", () => {
    // It says papers differed and why; it does NOT say "while the test was
    // open" (a pre-deploy taker and a post-deploy taker can differ over a
    // question withdrawn before the window) or that THIS paper shrank.
    const line = SERVED_PAPER_COPY.en.livePapersDiffer;
    expect(line).toBe(
      "Not everyone in this test had the same number of questions — some were withdrawn after an answer check. Ranks compare percentage scores.",
    );
    expect(line.toLowerCase()).not.toContain("while the test was open");
  });
  it("withdrawnLine: nothing for 0, singular for 1, the count otherwise; any other locale reads English", () => {
    const en = servedPaperCopy("en");
    expect(withdrawnLine(en, 0)).toBeNull();
    expect(withdrawnLine(en, -1)).toBeNull();
    expect(withdrawnLine(en, 1)).toBe("1 question was withdrawn after an answer check and is not served.");
    expect(withdrawnLine(en, 7)).toBe("7 questions were withdrawn after an answer check and are not served.");
    expect(withdrawnLine(servedPaperCopy("hi"), 2)).toBe(SERVED_PAPER_COPY.hi.withdrawnMany.replace("{k}", "2"));
    expect(servedPaperCopy("fr")).toBe(SERVED_PAPER_COPY.en);
    expect(servedPaperCopy(null)).toBe(SERVED_PAPER_COPY.en);
  });
});
