// Pure unit tests for the 16 Sep 2026 stage gate on exam-night and mail
// surfaces. No DB. Run with: npx vitest run tests/unit/exam-week-stage-gate.test.ts
//
// What is pinned:
//   • /live and /reactions (buildExamNightFacts) never offer the stored
//     Prelims-pattern paper for a Mains sitting, in any phase, and name the
//     sitting's stage next to its date
//   • stageAwareClaim keeps the date and its tier word, adds the row's stage
//     and drops the "today" / "held" claims for a sitting of another stage
//   • examDoneState (routine mails' "never name a finished exam") does not
//     call an open-ended start row finished in the week after it

import { describe, it, expect } from "vitest";
import {
  buildExamNightFacts,
  examNightShareMessage,
  stageAwareClaim,
  stageAwarePhaseMeta,
  type ExamNightExam,
  type ExamNightInput,
} from "@/lib/exam-night-facts";
import { examDayClaim, phaseArticleMeta, type ExamNightSummary } from "@/lib/phase-article-copy";
import { examDoneState } from "@/lib/exam-week-mail";
import type { TimelineInput } from "@/lib/exam-timeline";

const d = (iso: string) => `${iso}T00:00:00.000Z`;
/** An instant on IST day `day` at IST clock time hh:mm. */
const ist = (day: string, hh: number, mm = 0) => new Date(Date.parse(`${day}T00:00:00Z`) - 330 * 60_000 + (hh * 60 + mm) * 60_000);

const UPSC_URL = "https://upsc.gov.in";
const UPSC_PRELIMS: ExamNightExam = {
  id: "upsc",
  code: "UPSC_PRELIMS",
  shortName: "UPSC Prelims",
  name: "UPSC Civil Services Examination — Prelims",
  active: true,
  totalQuestions: 100,
  scoredQuestions: null,
  totalMarks: 200,
  marksPerQ: 2,
  description: "General Studies Paper I: 100 questions, 200 marks.",
};
const mainsRow: TimelineInput = {
  id: "cmtphdp9z004j70xof3lruprc",
  label: "Mains exam begins",
  date: d("2026-08-21"),
  isExamDay: true,
  kind: "EXAM",
  confidence: "official",
  url: "https://upsc.gov.in/examinations/cse-mains-2026",
  notes: "Mains scheduled: Aug 21, 22, 23, 29, 30 (9 papers over 5 days)",
};
const prelimsRow: TimelineInput = { ...mainsRow, id: "prelims", label: "Prelims exam", date: d("2026-05-24"), notes: null };
const IBPS_URL = "https://www.ibps.in";
const IBPS_PO: ExamNightExam = {
  ...UPSC_PRELIMS,
  id: "ibps",
  code: "IBPS_PO",
  shortName: "IBPS PO",
  name: "IBPS Probationary Officer (Prelims)",
};
const ibpsMains: TimelineInput = {
  ...mainsRow,
  id: "ibps-mains",
  label: "Mains exam",
  date: d("2026-10-04"),
  url: "https://www.ibps.in/crp-po-mt-xvi",
  notes: null,
};

function input(over: Partial<ExamNightInput> = {}): ExamNightInput {
  return {
    exam: UPSC_PRELIMS,
    rows: [mainsRow],
    officialUrl: UPSC_URL,
    tally: null,
    phase: "LIVE",
    subjects: [],
    pyq: null,
    fullMockId: "full-mock-1",
    hasCutoffPage: false,
    strictArticle: { LIVE: false, REACTIONS: false },
    ...over,
  };
}
const fmt = (now: Date) => ({ tierWord: (t: string) => t, now });

describe("buildExamNightFacts — the real-pattern paper follows the stored stage", () => {
  it("hides the Prelims paper for a Mains sitting, in exam week and outside it, and names the stage", () => {
    for (const now of [ist("2026-08-20", 18), ist("2026-08-21", 19), ist("2026-08-24", 10), ist("2026-09-16", 16)]) {
      const f = buildExamNightFacts(input(), fmt(now));
      expect(f.fullMockId).toBeNull();
      expect(f.examDayStage).toBe("Mains");
    }
  });

  it("keeps the paper for the stored stage's own sitting (and for a stage-less row)", () => {
    const own = buildExamNightFacts(input({ rows: [prelimsRow] }), fmt(ist("2026-05-24", 19)));
    expect(own.fullMockId).toBe("full-mock-1");
    expect(own.examDayStage).toBeNull();
    const plain = buildExamNightFacts(input({ rows: [{ ...mainsRow, label: "Written exam" }] }), fmt(ist("2026-08-21", 19)));
    expect(plain.fullMockId).toBe("full-mock-1");
  });
});

const SUMMARY: ExamNightSummary = {
  poll: false,
  tally: false,
  keyStatus: true,
  questionPaper: false,
  cutoffEstimate: false,
  estimator: false,
  pyq: false,
  nextStage: false,
  article: false,
};

describe("stageAwareClaim — /live and /reactions titles never give this exam another stage's day", () => {
  it("adds the stage after the dated tier word and drops today / held", () => {
    const now = ist("2026-08-21", 19);
    const raw = examDayClaim([mainsRow], UPSC_URL, now);
    expect(raw.live).toBe(true);
    const claim = stageAwareClaim(UPSC_PRELIMS, raw);
    expect(claim.live).toBe(false);
    expect(claim.held).toBe(false);
    expect(claim.dated).toMatch(/^21 Aug\S* \(official\) Mains$/);
    const live = phaseArticleMeta("LIVE", UPSC_PRELIMS, claim, SUMMARY);
    expect(live.title).toMatch(/^UPSC Prelims exam day — 21 Aug\S* \(official\) Mains paper — /);
    expect(live.title).not.toContain("exam today");
    const reactions = phaseArticleMeta("REACTIONS", UPSC_PRELIMS, claim, SUMMARY);
    expect(reactions.title).toMatch(/^UPSC Prelims post-exam — 21 Aug\S* \(official\) Mains paper — /);
  });

  it("a short name without a stage keeps 'exam today' on the other stage's day (review, 16 Sep 2026)", () => {
    const now = ist("2026-10-04", 19);
    const raw = examDayClaim([ibpsMains], IBPS_URL, now);
    expect(raw.live).toBe(true);
    const claim = stageAwareClaim(IBPS_PO, raw);
    expect(claim.live).toBe(true);
    expect(claim.held).toBe(true);
    expect(claim.dated).toMatch(/^4 Oct\S* \(official\) Mains$/);
    const live = stageAwarePhaseMeta("LIVE", IBPS_PO, raw, SUMMARY);
    expect(live.title).toMatch(/^IBPS PO exam today — /);
    // The full name carries the record's stage, so the description re-stages it.
    expect(live.description).toMatch(/^IBPS Probationary Officer \(Mains\) is being held today, 4 Oct\S* \(official\)\. /);
    expect(live.description).not.toContain("(Prelims)");
    const reactions = stageAwarePhaseMeta("REACTIONS", IBPS_PO, raw, SUMMARY);
    expect(reactions.description).toMatch(/^The IBPS Probationary Officer \(Mains\) paper on 4 Oct\S* \(official\) has been held\. /);
  });

  it("stageAwarePhaseMeta on a stage-named short name: no 'today', the full name re-staged, 'Mains' once", () => {
    const now = ist("2026-08-21", 19);
    const raw = examDayClaim([mainsRow], UPSC_URL, now);
    const live = stageAwarePhaseMeta("LIVE", UPSC_PRELIMS, raw, SUMMARY);
    expect(live.title).toMatch(/^UPSC Prelims exam day — 21 Aug\S* \(official\) Mains paper — /);
    expect(live.description).toMatch(/^UPSC Civil Services Examination — Mains, 21 Aug\S* \(official\) paper\. /);
    expect(live.description).not.toContain("being held today");
    // Same stage: exactly phaseArticleMeta.
    const own = examDayClaim([prelimsRow], UPSC_URL, ist("2026-05-24", 19));
    expect(stageAwarePhaseMeta("LIVE", UPSC_PRELIMS, own, SUMMARY)).toEqual(phaseArticleMeta("LIVE", UPSC_PRELIMS, own, SUMMARY));
  });

  it("the share text names the sitting's stage next to its date", () => {
    const f = buildExamNightFacts(input(), fmt(ist("2026-08-24", 10)));
    expect(examNightShareMessage("UPSC Prelims", f)).toMatch(/^UPSC Prelims \(21 Aug\S* \(official\) Mains\): /);
    const own = buildExamNightFacts(input({ rows: [prelimsRow] }), fmt(ist("2026-05-26", 10)));
    expect(examNightShareMessage("UPSC Prelims", own)).toMatch(/^UPSC Prelims \(24 May\S* \(official\)\): /);
  });

  it("returns the claim untouched when the stages agree or a side is silent", () => {
    const now = ist("2026-05-24", 19);
    const raw = examDayClaim([prelimsRow], UPSC_URL, now);
    expect(stageAwareClaim(UPSC_PRELIMS, raw)).toBe(raw);
    const noRow = examDayClaim([], UPSC_URL, now);
    expect(stageAwareClaim(UPSC_PRELIMS, noRow)).toBe(noRow);
  });
});

describe("examDoneState — an open-ended start row is not a finished exam", () => {
  const raeo: TimelineInput = {
    id: "cmu1n5jyf003yhfwbwi7kmt7n",
    label: "Online exam begins — shifts 09:00–12:00 and 14:30–17:30 (end date not announced)",
    date: d("2026-09-17"),
    isExamDay: true,
    kind: "EXAM",
    confidence: "official",
    url: "https://esb.mp.gov.in/rulebooks/RB_2026/x.pdf",
    notes: null,
  };
  it("not done for the week after the start row, done after that", () => {
    expect(examDoneState([raeo], "https://esb.mp.gov.in", ist("2026-09-18", 7)).done).toBe(false);
    expect(examDoneState([raeo], "https://esb.mp.gov.in", ist("2026-09-24", 7)).done).toBe(false);
    expect(examDoneState([raeo], "https://esb.mp.gov.in", ist("2026-09-25", 7)).done).toBe(true);
  });
  it("a plain single-day exam is done the next day, as before", () => {
    const plain = { ...raeo, id: "plain", label: "Online exam — shifts 09:00–12:00 and 14:30–17:30" };
    expect(examDoneState([plain], "https://esb.mp.gov.in", ist("2026-09-18", 7)).done).toBe(true);
  });
});
