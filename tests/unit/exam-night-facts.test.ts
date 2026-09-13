// Pure unit tests for the exam-night facts shaping behind /exams/[code]/live
// and /reactions (src/lib/exam-night-facts.ts). No DB, no model.
// Run with: npx vitest run tests/unit/exam-night-facts.test.ts
//
// What is pinned: every date leaves with its tier word (a passed estimate
// says "was expected — not confirmed"), and with its year when the row is
// in another year or long past; the poll mounts only on an announced exam
// day; the tally split and hardest-section votes only from n >= 10; the
// estimator only when one marking scheme can be stated for the sitting in
// focus; question papers only when official; no cutoff figure from a
// model-written note ever reaches the view; the window line never prints a
// bare tier word for a passed estimate.

import { describe, it, expect } from "vitest";
import {
  buildExamNightFacts,
  examNightPollDay,
  examNightShareMessage,
  type ExamNightExam,
  type ExamNightInput,
} from "@/lib/exam-night-facts";
import { computeExamWeekState } from "@/lib/exam-week";
import type { TimelineInput } from "@/lib/exam-timeline";

const d = (iso: string) => `${iso}T00:00:00.000Z`;
/** An instant on IST day `day` at IST clock time hh:mm. */
const ist = (day: string, hh: number, mm = 0) => new Date(Date.parse(`${day}T00:00:00Z`) - 330 * 60_000 + (hh * 60 + mm) * 60_000);

const OFFICIAL_URL = "https://ssc.gov.in";

const CGL: ExamNightExam = {
  id: "e1",
  code: "SSC_CGL",
  shortName: "SSC CGL",
  name: "SSC Combined Graduate Level (Tier 1)",
  active: true,
  totalQuestions: 100,
  scoredQuestions: null,
  totalMarks: 200,
  marksPerQ: 2,
  description: "Computer-based Tier 1: 100 questions, 200 marks, 60 minutes.",
};

function examRow(id: string, day: string, over: Partial<TimelineInput> = {}): TimelineInput {
  return {
    id,
    label: "Tier 1 exam",
    date: d(day),
    isExamDay: true,
    kind: "EXAM",
    confidence: "official",
    url: "https://ssc.gov.in/notice/cgl-2026",
    notes: null,
    ...over,
  };
}

function row(id: string, kind: string, day: string, over: Partial<TimelineInput> = {}): TimelineInput {
  return { id, label: kind, date: d(day), isExamDay: false, kind, confidence: "official", url: "https://ssc.gov.in/notice/x", notes: null, ...over };
}

function input(over: Partial<ExamNightInput> = {}): ExamNightInput {
  return {
    exam: CGL,
    rows: [examRow("ex", "2026-09-13")],
    officialUrl: OFFICIAL_URL,
    tally: null,
    phase: "LIVE",
    subjects: ["Quantitative Aptitude", "English"],
    pyq: null,
    fullMockId: null,
    hasCutoffPage: false,
    strictArticle: { LIVE: false, REACTIONS: false },
    ...over,
  };
}

const fmt = (now: Date) => ({ tierWord: (t: string) => t, now });

describe("poll + exam day — announced days only, tier word always", () => {
  it("exam night on an official day: poll mounts, dated label carries (official), key/result not announced", () => {
    const f = buildExamNightFacts(input(), fmt(ist("2026-09-13", 19)));
    expect(f.state.phase).toBe("today-pm");
    expect(f.poll).not.toBeNull();
    expect(f.poll!.examDate).toBe("2026-09-13");
    expect(f.poll!.examDayLabel).toMatch(/^13 Sept? \(official\)$/);
    expect(f.poll!.morning).toBe(false);
    expect(f.examDay!.dated).toMatch(/\(official\)$/);
    expect(f.keyStatus).toBe(true);
    expect(f.answerKey).toBeNull();
    expect(f.result).toBeNull();
    expect(f.alertPhase).toBe("today-pm");
    expect(f.summary.poll).toBe(true);
    expect(f.summary.keyStatus).toBe(true);
  });

  it("an expected-tier exam day never mounts the poll and keeps its tier word", () => {
    const rows = [examRow("ex", "2026-09-13", { confidence: "expected", url: null })];
    const now = ist("2026-09-13", 19);
    const f = buildExamNightFacts(input({ rows, tally: { n: 40, easy: 10, moderate: 20, tough: 10, sections: [] } }), fmt(now));
    expect(examNightPollDay(computeExamWeekState(rows, OFFICIAL_URL, now), now)).toBeNull();
    expect(f.poll).toBeNull();
    expect(f.pollPending).toBe(false);
    expect(f.tally).toBeNull();
    expect(f.announced).toBe(false);
    expect(f.examDay!.dated).toMatch(/\(expected\)$/);
    expect(f.alertPhase).toBe("none");
    expect(f.summary.poll).toBe(false);
    expect(f.summary.tally).toBe(false);
  });

  it("before the first shift only 'all the best'; from the shift's start the morning poll", () => {
    const rows = [examRow("ex", "2026-09-13", { notes: "Shift 1: 10:00 AM to 11:00 AM" })];
    const early = buildExamNightFacts(input({ rows }), fmt(ist("2026-09-13", 9, 30)));
    expect(early.poll).toBeNull();
    expect(early.pollPending).toBe(true);
    const later = buildExamNightFacts(input({ rows }), fmt(ist("2026-09-13", 10, 30)));
    expect(later.poll?.morning).toBe(true);
    expect(later.pollPending).toBe(false);
  });

  it("a passed estimate reads 'was expected — not confirmed', never '(expected)'", () => {
    const rows = [examRow("ex", "2026-09-10", { confidence: "expected", url: null })];
    const f = buildExamNightFacts(input({ rows }), fmt(ist("2026-09-13", 10)));
    expect(f.examDay!.passedEstimate).toBe(true);
    expect(f.examDay!.dated).toMatch(/^10 Sept? \(was expected — not confirmed\)$/);
    expect(f.examDay!.dated).not.toContain("(expected)");
    expect(f.poll).toBeNull();
  });

  it("no typed exam day: no poll, no key status, nothing dated", () => {
    const f = buildExamNightFacts(input({ rows: [{ ...examRow("legacy", "2026-09-13"), kind: null }] }), fmt(ist("2026-09-13", 19)));
    expect(f.examDay).toBeNull();
    expect(f.keyStatus).toBe(false);
    expect(f.poll).toBeNull();
    expect(f.estimator).toBe(false);
    expect(examNightShareMessage("SSC CGL", f)).not.toMatch(/rate the paper/);
  });
});

describe("window line — never a bare tier word on a passed estimate", () => {
  it("after an expected window (post): no window line; the exam-day line says 'was expected — not confirmed'", () => {
    const rows = [examRow("a", "2026-09-08", { confidence: "expected", url: null }), examRow("b", "2026-09-10", { confidence: "expected", url: null })];
    const f = buildExamNightFacts(input({ rows, phase: "REACTIONS" }), fmt(ist("2026-09-13", 10)));
    expect(f.state.phase).toBe("post");
    expect(f.window).toBeNull();
    expect(f.examDay!.dated).toMatch(/^10 Sept? \(was expected — not confirmed\)$/);
    expect(JSON.stringify(f.window ?? {})).not.toContain("expected");
  });

  it("inside an expected window whose first day has passed: no window line", () => {
    const rows = [examRow("a", "2026-09-08", { confidence: "expected", url: null }), examRow("b", "2026-09-15", { confidence: "expected", url: null })];
    const f = buildExamNightFacts(input({ rows }), fmt(ist("2026-09-13", 10)));
    expect(f.state.phase).toBe("window");
    expect(f.window).toBeNull();
    expect(f.examDay!.dated).toContain("was expected — not confirmed");
    expect(f.examDay!.dated).not.toContain("(expected)");
  });

  it("an expected window still ahead keeps its tier; an announced window after the paper keeps (official)", () => {
    const ahead = buildExamNightFacts(
      input({ rows: [examRow("a", "2026-09-16", { confidence: "expected", url: null }), examRow("b", "2026-09-18", { confidence: "expected", url: null })] }),
      fmt(ist("2026-09-13", 10)),
    );
    expect(ahead.state.phase).toBe("week");
    expect(ahead.window).toMatchObject({ tier: "expected" });
    expect(ahead.window!.from).toMatch(/^16 Sept?$/);
    expect(ahead.window!.to).toMatch(/^18 Sept?$/);

    const held = buildExamNightFacts(input({ rows: [examRow("a", "2026-09-08"), examRow("b", "2026-09-10")] }), fmt(ist("2026-09-13", 10)));
    expect(held.state.phase).toBe("post");
    expect(held.window).toMatchObject({ tier: "official" });
    expect(held.window!.to).toMatch(/^10 Sept?$/);
  });
});

describe("dates carry the year when the row is in another year or long past", () => {
  it("last cycle's sitting outside exam week: '14 Sept 2025 (official)', its answer key dated with the year too", () => {
    const rows = [examRow("ex", "2025-09-14"), row("key", "ANSWER_KEY", "2025-10-01", { label: "Tier 1 answer key" })];
    const f = buildExamNightFacts(input({ rows }), fmt(ist("2026-09-13", 10)));
    expect(f.state.phase).toBe("none");
    expect(f.examDay!.dated).toMatch(/^14 Sept? 2025 \(official\)$/);
    expect(f.answerKey!.dated).toMatch(/^1 Oct 2025 \(official\)$/);
    expect(examNightShareMessage("SSC CGL", f)).toContain("2025");
  });

  it("same year but more than 60 days back carries the year; next year's paper carries its year; near dates stay short", () => {
    const june = buildExamNightFacts(input({ rows: [examRow("ex", "2026-06-01")] }), fmt(ist("2026-09-13", 10)));
    expect(june.examDay!.dated).toMatch(/^1 Jun 2026 \(official\)$/);

    const jan = buildExamNightFacts(input({ rows: [examRow("ex", "2027-01-10")] }), fmt(ist("2026-09-13", 10)));
    expect(jan.examDay!.dated).toMatch(/^10 Jan 2027 \(official\)$/);

    const near = buildExamNightFacts(input({ rows: [examRow("ex", "2026-08-01")] }), fmt(ist("2026-09-13", 10)));
    expect(near.examDay!.dated).toMatch(/^1 Aug \(official\)$/);
  });
});

describe("tally floor — n >= 10", () => {
  const sections = [{ label: "English", n: 6 }];
  it("below the floor only n leaves; split and hardest sections are withheld", () => {
    const f = buildExamNightFacts(input({ tally: { n: 9, easy: 1, moderate: 4, tough: 4, sections } }), fmt(ist("2026-09-13", 19)));
    expect(f.tally).toEqual({ n: 9, easy: 0, moderate: 0, tough: 0, sections: [] });
    expect(f.tallyShown).toBe(false);
    expect(f.hardestSections).toEqual([]);
    expect(f.summary.tally).toBe(false);
  });
  it("from the floor the tally and hardest sections show", () => {
    const f = buildExamNightFacts(input({ tally: { n: 10, easy: 2, moderate: 4, tough: 4, sections } }), fmt(ist("2026-09-13", 19)));
    expect(f.tallyShown).toBe(true);
    expect(f.tally!.tough).toBe(4);
    expect(f.hardestSections).toEqual(sections);
    expect(f.summary.tally).toBe(true);
  });
});

describe("tracker status — tier words, dropped estimates, official question papers", () => {
  it("answer key (reported), passed result estimate and next stage (official) each carry their tier", () => {
    const rows = [
      examRow("ex", "2026-09-10"),
      row("key", "ANSWER_KEY", "2026-09-12", { label: "Tier 1 answer key", url: "https://testbook.com/ssc-cgl/answer-key" }),
      row("res", "RESULT", "2026-09-11", { label: "Tier 1 result", confidence: "expected", url: null }),
      examRow("t2", "2026-11-20", { label: "Tier 2 exam" }),
    ];
    const f = buildExamNightFacts(input({ rows, phase: "REACTIONS" }), fmt(ist("2026-09-13", 10)));
    expect(f.state.phase).toBe("post");
    expect(f.answerKey!.dated).toMatch(/^12 Sept? \(reported\)$/);
    expect(f.answerKey!.official).toBe(false);
    expect(f.result!.dated).toContain("was expected — not confirmed");
    expect(f.result!.dated).not.toContain("(expected)");
    expect(f.nextStage!.label).toBe("Tier 2 exam");
    expect(f.nextStage!.dated).toMatch(/^20 Nov \(official\)$/);
    expect(f.summary.nextStage).toBe(true);
  });

  it("an expected answer-key row never reaches the page (tracker guard) — status stays 'not announced'", () => {
    const rows = [examRow("ex", "2026-09-10"), row("key", "ANSWER_KEY", "2026-09-17", { confidence: "expected", url: null })];
    const f = buildExamNightFacts(input({ rows }), fmt(ist("2026-09-13", 10)));
    expect(f.answerKey).toBeNull();
    expect(f.keyStatus).toBe(true);
  });

  it("question papers are linked only when official", () => {
    const rows = [
      examRow("ex", "2026-09-10"),
      row("qp1", "QUESTION_PAPER", "2026-09-11", { label: "Question paper — Tier 1", url: "https://ssc.gov.in/question-papers/cgl" }),
      row("qp2", "QUESTION_PAPER", "2026-09-11", { label: "Question paper — Tier 1 (coaching)", url: "https://testbook.com/cgl-paper" }),
    ];
    const f = buildExamNightFacts(input({ rows }), fmt(ist("2026-09-13", 10)));
    expect(f.questionPapers.map((q) => q.id)).toEqual(["qp1"]);
    expect(f.questionPapers[0].dated).toMatch(/\(official\)$/);
    expect(f.summary.questionPaper).toBe(true);
  });
});

describe("estimator gate — markingSchemeStatable of the sitting in focus", () => {
  const now = ist("2026-09-13", 19);
  it("a stated scheme on its own stage links the estimator", () => {
    expect(buildExamNightFacts(input(), fmt(now)).estimator).toBe(true);
  });
  it("a Tier 1 pattern on a 'Tier 2 exam' row does not", () => {
    const f = buildExamNightFacts(input({ rows: [examRow("ex", "2026-09-13", { label: "Tier 2 exam" })] }), fmt(now));
    expect(f.estimator).toBe(false);
    expect(f.summary.estimator).toBe(false);
  });
  it("an exam whose papers score unequally (CDS) does not", () => {
    const cds: ExamNightExam = { ...CGL, code: "CDS", shortName: "CDS", name: "Combined Defence Services", totalQuestions: 300, totalMarks: 300, marksPerQ: 1, description: "Three papers." };
    expect(buildExamNightFacts(input({ exam: cds }), fmt(now)).estimator).toBe(false);
  });
  it("no exam-day row in focus → no estimator", () => {
    expect(buildExamNightFacts(input({ rows: [] }), fmt(now)).estimator).toBe(false);
  });
});

describe("cutoff — only the indicative page link, never a figure from a model note", () => {
  it("result rows with cutoff notes never reach the view, the summary or the share text", () => {
    // The reviewers' failing notes (13 Sep): a model forecast, a stage
    // number and a date each passed the old figure filter and printed as
    // "Last declared cutoff … (official)". Extra fields on the input must
    // be ignored now.
    const notes = [
      "Given the tough paper, the General cutoff should be in the 140-150 range.",
      "Candidates who qualify Tier 2 will be called for document verification.",
      "Cutoff marks will be released on 25 September along with scorecards.",
      "General: 152.35, OBC: 146.10, SC: 128.40",
    ];
    const withNotes = {
      ...input({ hasCutoffPage: true, phase: "REACTIONS" }),
      results: notes.map((cutoffNote, i) => ({
        id: `r${i}`,
        stage: "Tier 1",
        declaredOn: "2026-03-10T00:00:00.000Z",
        officialUrl: "https://ssc.gov.in/results/cgl",
        officialName: "ssc.gov.in",
        cutoffNote,
      })),
    } as ExamNightInput;
    const f = buildExamNightFacts(withNotes, fmt(ist("2026-09-13", 19)));
    const text = JSON.stringify(f);
    for (const note of notes) expect(text).not.toContain(note);
    expect("lastCutoff" in f).toBe(false);
    expect("lastCutoff" in f.summary).toBe(false);
    expect(f.hasCutoffPage).toBe(true);
    expect(f.summary.cutoffEstimate).toBe(true);
    expect(examNightShareMessage("SSC CGL", f)).not.toMatch(/cutoff/i);
  });
});

describe("summary follows what renders", () => {
  it("article flag comes from the strict gate result for THIS phase", () => {
    const live = buildExamNightFacts(input({ phase: "LIVE", strictArticle: { LIVE: false, REACTIONS: true } }), fmt(ist("2026-09-13", 19)));
    expect(live.summary.article).toBe(false);
    const reactions = buildExamNightFacts(input({ phase: "REACTIONS", strictArticle: { LIVE: false, REACTIONS: true } }), fmt(ist("2026-09-13", 19)));
    expect(reactions.summary.article).toBe(true);
  });
  it("PYQ link only with a count; cutoff page only for an active exam", () => {
    const f = buildExamNightFacts(input({ pyq: { year: 2024, count: 0 }, hasCutoffPage: true, exam: { ...CGL, active: false } }), fmt(ist("2026-09-13", 19)));
    expect(f.pyq).toBeNull();
    expect(f.hasCutoffPage).toBe(false);
    const g = buildExamNightFacts(input({ pyq: { year: 2024, count: 25 } }), fmt(ist("2026-09-13", 19)));
    expect(g.pyq).toEqual({ year: 2024, count: 25, total: 100 });
  });
});
