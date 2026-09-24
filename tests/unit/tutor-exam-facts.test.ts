// Pure unit tests for the tutor's per-exam facts (24 Sep 2026):
// src/lib/ai/exam-facts.ts, the syllabusBlock opts in src/lib/ai/prompts.ts
// and the block order in src/lib/ai/tutor.ts. No DB, no model call.
//
// Guards the September findings: the tutor told a TS Police PC student the
// paper is not 200 questions, gave SSC GD three different totals (the row
// says 80 questions / 160 marks), and said it had no SOF IMO dates while the
// tracker held the official ones. And the honesty rules: an expected-tier
// (estimated) date never reaches the tutor; a reported date carries its
// secondary source; a date the tracker holds is never called "not
// announced" because the list left it out; nothing date-relative is taken
// from the (stale-served) syllabus cache.

import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("next/server", () => ({ after: () => {} }));

import {
  buildTutorExamFacts,
  examFactsBlock,
  patternLines,
  TRACKER_DATE_CAP,
  type ExamFactsExam,
  type ExamFactsInput,
} from "@/lib/ai/exam-facts";
import { syllabusBlock } from "@/lib/ai/prompts";
import { tutorSystemBlocks } from "@/lib/ai/tutor";
import type { SyllabusContext, TutorExamFactsSource, TutorTrackerRow } from "@/lib/ai/types";

// 24 Sep 2026, 12:00 IST. Stored dates are midnight-UTC of the IST day.
const now = new Date("2026-09-24T06:30:00Z");
const d = (iso: string) => `${iso}T00:00:00.000Z`;

const SSC_GD: ExamFactsExam = {
  code: "SSC_GD",
  name: "SSC General Duty Constable",
  shortName: "SSC GD",
  description: "SSC GD Constable CBT — 60-minute test with 80 questions.",
  totalQuestions: 80,
  scoredQuestions: null,
  totalMarks: 160,
  marksPerQ: 2,
  negativeMark: 0.5,
  durationMin: 60,
  languages: ["EN", "HI"],
};

const TS_PC: ExamFactsExam = {
  code: "TS_POLICE_PC",
  name: "Telangana Police Constable (TSLPRB)",
  shortName: "TS Police PC",
  description: "200 MCQs in 3 hours.",
  totalQuestions: 200,
  scoredQuestions: null,
  totalMarks: 200,
  marksPerQ: 1,
  negativeMark: 0,
  durationMin: 180,
  languages: ["EN", "TE"],
};

let seq = 0;
function row(day: string, label: string, confidence: string | null, url: string | null, kind = "EXAM"): TutorTrackerRow {
  seq += 1;
  return { id: `r${String(seq).padStart(3, "0")}`, label, date: d(day), isExamDay: kind === "EXAM", kind, confidence, url };
}

/** The date-free source getSyllabusContext caches. */
function source(exam: ExamFactsExam, rows: TutorTrackerRow[], extra: Partial<TutorExamFactsSource> = {}): TutorExamFactsSource {
  return {
    exam,
    rows,
    rowsComplete: true,
    officialUrl: "https://ssc.gov.in",
    officialName: "Staff Selection Commission (SSC)",
    pages: { cutoff: true, tricks: true, guide: false, syllabus: true, buildMock: true },
    fullPatternMock: true,
    pyqYears: [2023, 2025, 2024],
    officialPaperYears: ["2023", "2024-25"],
    ...extra,
  };
}

function input(exam: ExamFactsExam, rows: TutorTrackerRow[], extra: Partial<ExamFactsInput> = {}): ExamFactsInput {
  return { ...source(exam, rows), now, ...extra };
}

describe("pattern", () => {
  it("renders the Exam row's numbers (SSC GD: 80 questions, 160 marks)", () => {
    const f = buildTutorExamFacts(input(SSC_GD, []));
    const text = patternLines(f.pattern).join("\n");
    expect(text).toContain("80 questions · 160 marks in total · 2 marks per question · 60 minutes");
    expect(text).toContain("Negative marking: −0.5 marks per wrong answer");
    expect(text).toContain("Paper offered in: English, Hindi");
    expect(text).not.toContain("180");
  });

  it("states TS Police PC as 200 questions with no negative marking", () => {
    const f = buildTutorExamFacts(input(TS_PC, [], { officialUrl: "https://www.tslprb.in" }));
    const text = patternLines(f.pattern).join("\n");
    expect(text).toContain("200 questions · 200 marks in total · 1 mark per question · 180 minutes");
    expect(text).toContain("Negative marking: none");
  });

  it("prints asked vs scored questions and a one-third penalty as a fraction", () => {
    const neet: ExamFactsExam = {
      ...SSC_GD,
      code: "NEET_UG",
      name: "NEET UG",
      shortName: "NEET UG",
      totalQuestions: 200,
      scoredQuestions: 180,
      totalMarks: 720,
      marksPerQ: 4,
      negativeMark: 1 / 3,
    };
    const text = patternLines(buildTutorExamFacts(input(neet, [])).pattern).join("\n");
    expect(text).toContain("200 questions asked, 180 of them scored · 720 marks in total · 4 marks per question");
    expect(text).toContain("−1/3 (0.33) marks per wrong answer");
  });

  it("withholds a per-question mark the marking scheme cannot state", () => {
    // SOF IMO row: 50 questions, 60 marks, "1 per question" — not uniform.
    const imo: ExamFactsExam = { ...SSC_GD, code: "SOF_IMO", name: "SOF International Mathematics Olympiad", shortName: "SOF IMO", totalQuestions: 50, totalMarks: 60, marksPerQ: 1, negativeMark: 0 };
    const f = buildTutorExamFacts(input(imo, []));
    expect(f.pattern.marksPerQ).toBeNull();
    const text = patternLines(f.pattern).join("\n");
    expect(text).toContain("50 questions · 60 marks in total · 60 minutes");
    expect(text).not.toMatch(/marks? per question ·/);
    expect(text).toMatch(/Marks per question: not stated — .+ Do not work one out from the totals\./);
  });

  it("calls the pattern Shishya's record, with the official notification final", () => {
    // Some Exam rows are still unchecked against the notification (review,
    // 24 Sep 2026) — the tutor must not defend a row against the notice.
    const b = examFactsBlock(buildTutorExamFacts(input(SSC_GD, [])), { code: "SSC_GD", name: "SSC GD" });
    expect(b).toContain("## Pattern — Shishya's exam record for SSC GD.");
    expect(b).toContain("never replace them with figures from memory or from another exam");
    expect(b).toContain("The official notification is final");
    expect(b).not.toContain("never contradict them");
  });
});

describe("tracker dates", () => {
  const rows = [
    row("2026-10-23", "CBT exam", "official", "https://ssc.gov.in/notice.pdf"),
    row("2026-06-15", "Provisional answer key released", "official", "https://www.pw.live/ssc/answer-key", "ANSWER_KEY"),
    row("2026-09-01", "Physical Efficiency Test (expected)", "expected", null, "OTHER"),
    row("2026-12-01", "Result (expected)", "expected", null, "RESULT"),
    row("2026-11-01", "Notification (expected, cited)", "expected", "https://ssc.gov.in/calendar", "NOTIFICATION"),
    row("2026-09-10", "Admit card", "official", "https://testbook.com/news/admit", "ADMIT_CARD"),
    row("2026-06-01", "Notification released", "official", "https://ssc.gov.in/old", "NOTIFICATION"),
    row("2027-12-01", "Next-cycle exam", "official", "https://ssc.gov.in/far", "EXAM"),
    row("2026-03-01", "Older notification", "official", "https://ssc.gov.in/older", "NOTIFICATION"),
  ];
  const facts = buildTutorExamFacts(input(SSC_GD, rows));
  const block = examFactsBlock(facts, { code: "SSC_GD", name: "SSC General Duty Constable" });

  it("never lets an expected-tier row through — not even one with a URL", () => {
    expect(facts.dates.every((r) => r.tier === "official" || r.tier === "reported")).toBe(true);
    expect(block).not.toContain("(expected");
    expect(block).not.toContain("Physical Efficiency Test");
    expect(block).not.toContain("Result (expected)");
    expect(block).not.toContain("Notification (expected, cited)");
    expect(block).not.toContain("2026-09-01");
    expect(block).not.toContain("2026-12-01");
  });

  it("labels a reported row with its secondary source and its kind", () => {
    expect(block).toContain("- 2026-09-10 · admit card · Admit card · past · REPORTED by testbook.com — a secondary source, not the conducting body");
  });

  it("labels an official row with the notice host and its kind", () => {
    expect(block).toContain("- 2026-10-23 · exam · CBT exam · upcoming · OFFICIAL (notice on ssc.gov.in)");
  });

  it("always lists each kind's latest past row, whatever its age", () => {
    // 115 and 101 days back — outside the 60-day window, but the latest
    // notification / answer key on the tracker: the tutor must see them.
    expect(block).toContain("- 2026-06-01 · notification · Notification released · past · OFFICIAL (notice on ssc.gov.in)");
    expect(block).toContain("- 2026-06-15 · answer key · Provisional answer key released · past · REPORTED by pw.live");
    expect(facts.dates.map((r) => r.label)).toEqual([
      "Notification released",
      "Provisional answer key released",
      "Admit card",
      "CBT exam",
    ]);
  });

  it("counts every announced row it leaves out, across the whole tracker", () => {
    // Left out: an older notification (not the latest of its kind, out of
    // the window) and a next-cycle exam beyond the next one and 12 months.
    expect(block).not.toContain("Older notification");
    expect(block).not.toContain("Next-cycle exam");
    expect(facts.datesOmitted).toBe(2);
    expect(block).toContain("- (2 more announced dates on the tracker are not listed here — other days, older cycles: https://shishya.in/exams/SSC_GD/updates)");
  });

  it("names only kinds with no announced row anywhere as 'not announced'", () => {
    expect(facts.notAnnouncedKinds).toEqual(["APPLICATION_START", "APPLICATION_END", "RESULT"]);
    expect(block).toContain("- Not announced on Shishya's tracker yet (no official or reported date at all): application opens, application closes, result");
    // An expected RESULT row is not an announcement: "result" stays listed.
  });

  it("tells the tutor never to guess a date and where to send the student", () => {
    expect(block).toMatch(/For every kind of date except "other", this list holds the tracker's latest one that has passed and its next one still to come\./);
    expect(block).toContain(`For a kind under "Not announced", say no official date for it has been announced on Shishya's tracker yet.`);
    expect(block).toMatch(/Any other date not listed here .+ say it isn't among the dates you have and send the student to the full tracker https:\/\/shishya\.in\/exams\/SSC_GD\/updates\./);
    expect(block).toContain("the official site https://ssc.gov.in (Staff Selection Commission (SSC))");
    expect(block).toMatch(/Never guess or estimate a date/);
    // The first cut's blanket denial is gone.
    expect(block).not.toMatch(/For ANY date not listed here/);
  });

  it("never calls an old official result 'not announced' (review, 24 Sep 2026)", () => {
    // UPSC prelims: the official result row is 101 days old.
    const f = buildTutorExamFacts(input(SSC_GD, [row("2026-06-15", "Prelims result announced", "official", "https://upsc.gov.in/r.pdf", "RESULT")]));
    const b = examFactsBlock(f, { code: "UPSC_PRELIMS", name: "UPSC Prelims" });
    expect(b).toContain("- 2026-06-15 · result · Prelims result announced · past · OFFICIAL (notice on upsc.gov.in)");
    expect(f.notAnnouncedKinds).not.toContain("RESULT");
    expect(b).not.toMatch(/Not announced on Shishya's tracker yet[^\n]*result/);
  });

  it("makes no 'not announced' claim when the rows read was incomplete", () => {
    const f = buildTutorExamFacts(input(SSC_GD, rows, { rowsComplete: false }));
    expect(f.notAnnouncedKinds).toBeNull();
    const b = examFactsBlock(f, { code: "SSC_GD", name: "SSC GD" });
    expect(b).not.toContain("Not announced");
    expect(b).toContain("Any other date not listed here");
  });

  it("says so when the tracker holds nothing announced", () => {
    const empty = examFactsBlock(buildTutorExamFacts(input(SSC_GD, [rows[2], rows[3]])), { code: "SSC_GD", name: "SSC GD" });
    expect(empty).toContain("- None: Shishya's tracker has no officially announced or reported date of any kind for SSC_GD yet.");
    expect(empty).toContain("- For any date the student asks about, say no official date has been announced on Shishya's tracker yet.");
    expect(empty).toMatch(/Never guess or estimate a date/);
  });

  it(`caps at ${TRACKER_DATE_CAP} rows, favouring upcoming ones but keeping recent past context`, () => {
    const many: TutorTrackerRow[] = [];
    for (let i = 1; i <= 6; i++) many.push(row(`2026-09-${String(i + 10).padStart(2, "0")}`, `past ${i}`, "official", "https://ssc.gov.in/p"));
    for (let i = 1; i <= 20; i++) many.push(row(`2026-10-${String(i).padStart(2, "0")}`, `next ${i}`, "official", "https://ssc.gov.in/n"));
    const f = buildTutorExamFacts(input(SSC_GD, many));
    expect(f.dates).toHaveLength(TRACKER_DATE_CAP);
    expect(f.dates.filter((r) => r.status === "past").map((r) => r.label)).toEqual(["past 3", "past 4", "past 5", "past 6"]);
    expect(f.dates.filter((r) => r.status !== "past").map((r) => r.label)).toEqual(
      ["next 1", "next 2", "next 3", "next 4", "next 5", "next 6", "next 7", "next 8"],
    );
    expect(f.datesOmitted).toBe(14);
  });

  it("keeps every kind's latest and next row even when the cap is full", () => {
    // RRB NTPC shape: 20 upcoming exam days used to push the official
    // CBT-1 result rows out of the list.
    const many: TutorTrackerRow[] = [row("2026-08-24", "UG CBT-1 result", "official", "https://rrbcdg.gov.in/r.pdf", "RESULT")];
    for (let i = 1; i <= 20; i++) many.push(row(`2026-10-${String(i).padStart(2, "0")}`, `CBT day ${i}`, "official", "https://rrbcdg.gov.in/n"));
    many.push(row("2026-12-20", "CBT-2 admit card", "official", "https://rrbcdg.gov.in/a", "ADMIT_CARD"));
    const f = buildTutorExamFacts(input(SSC_GD, many, { officialUrl: "https://rrbcdg.gov.in" }));
    expect(f.dates).toHaveLength(TRACKER_DATE_CAP);
    const labels = f.dates.map((r) => r.label);
    expect(labels).toContain("UG CBT-1 result");
    expect(labels).toContain("CBT-2 admit card");
    expect(labels).toContain("CBT day 1");
    expect(f.datesOmitted).toBe(22 - TRACKER_DATE_CAP);
  });

  it("puts the best-sourced row first when a kind's latest day has two", () => {
    const f = buildTutorExamFacts(
      input(SSC_GD, [
        row("2026-06-01", "Result (coaching copy)", "official", "https://testbook.com/r", "RESULT"),
        row("2026-06-01", "Result", "official", "https://ssc.gov.in/r", "RESULT"),
      ]),
    );
    const results = f.dates.filter((r) => r.kind === "RESULT");
    expect(results.map((r) => r.label)).toEqual(["Result"]);
    expect(results[0].tier).toBe("official");
  });
});

describe("date-relative facts are worked out when the prompt is built", () => {
  // SBI Clerk prelims Day 1 on 26 Sep 2026. The cached source was built the
  // evening before; the first chat of exam morning must not say "tomorrow".
  const sbi = source(SSC_GD, [row("2026-09-26", "Prelims exam — Day 1", "official", "https://sbi.co.in/p.pdf")], {
    officialUrl: "https://sbi.co.in",
  });
  // What unstable_cache hands back: a JSON round trip.
  const cached = JSON.parse(JSON.stringify(sbi)) as TutorExamFactsSource;
  const syl: SyllabusContext = {
    examCode: "SBI_CLERK",
    examName: "SBI Clerk",
    examShortName: "SBI Clerk",
    subjects: [],
    examFacts: cached,
  };

  it("carries no 'today' in the cached source", () => {
    expect(JSON.stringify(cached)).not.toMatch(/asOfDay|upcoming|"past"|daysFromToday/);
  });

  it("states the day the prompt is built, not the day the cache was filled", () => {
    const eve = tutorSystemBlocks({ syllabus: syl, toolsOn: true, now: new Date("2026-09-25T17:00:00Z") }); // 22:30 IST
    const morning = tutorSystemBlocks({ syllabus: syl, toolsOn: true, now: new Date("2026-09-26T01:30:00Z") }); // 07:00 IST
    expect(eve[2].text).toContain("as of 2026-09-25 (IST)");
    expect(eve[2].text).toContain("- 2026-09-26 · exam · Prelims exam — Day 1 · upcoming");
    expect(morning[2].text).toContain("as of 2026-09-26 (IST)");
    expect(morning[2].text).toContain("- 2026-09-26 · exam · Prelims exam — Day 1 · today");
    // The shared prefix does not move with the day.
    expect(morning[0].text).toBe(eve[0].text);
  });
});

describe("what exists for the exam", () => {
  it("lists gated pages that render and forbids the ones that don't", () => {
    const b = examFactsBlock(buildTutorExamFacts(input(SSC_GD, [])), { code: "SSC_GD", name: "SSC GD" });
    expect(b).toContain("- Pages that exist: https://shishya.in/exams/SSC_GD/syllabus, https://shishya.in/exams/SSC_GD/cutoff, https://shishya.in/exams/SSC_GD/tricks, https://shishya.in/exams/SSC_GD/build-mock");
    expect(b).toContain("- NOT available for this exam (never link them): https://shishya.in/exams/SSC_GD/guide");
    expect(b).toContain(`the "Full-Length Mock (Real Pattern)" tile`);
    expect(b).toContain("PYQ-pattern practice sets (modelled on that year's paper, not the paper itself, usually far fewer questions): 2025, 2024, 2023");
    expect(b).toContain(`"Official papers" block on https://shishya.in/exams/SSC_GD): 2024-25, 2023`);
  });

  it("says nothing about gated pages when the gate read failed", () => {
    const b = examFactsBlock(buildTutorExamFacts(input(SSC_GD, [], { pages: null, fullPatternMock: null })), { code: "SSC_GD", name: "SSC GD" });
    expect(b).not.toContain("Pages that exist");
    expect(b).not.toContain("NOT available");
    expect(b).not.toContain("Full-length real-pattern mock");
  });
});

// ── syllabusBlock opts + block order ───────────────────────────────────
const syllabus: SyllabusContext = {
  examCode: "SSC_GD",
  examName: "SSC General Duty Constable",
  examShortName: "SSC GD",
  subjects: [{ code: "GK", name: "General Knowledge", weight: 1, topics: [{ code: "gk.history", name: "History" }] }],
};

describe("syllabusBlock opts", () => {
  it("leaves the block unchanged when opts are absent, null or true", () => {
    const base = syllabusBlock(syllabus);
    expect(syllabusBlock(syllabus, {})).toBe(base);
    expect(syllabusBlock(syllabus, { buildMock: null, fullPatternMock: null })).toBe(base);
    expect(syllabusBlock(syllabus, { buildMock: true, fullPatternMock: true })).toBe(base);
    expect(base).toContain("[Build your <topics> mock →](https://shishya.in/exams/SSC_GD/build-mock?topics=CODE1,CODE2)");
    expect(base).toContain(`point to the "Full-Length Mock (Real Pattern)" tile. Only a generic "quiz me"`);
  });

  it("drops the builder link and the full-length tile where they don't exist", () => {
    const b = syllabusBlock(syllabus, { buildMock: false, fullPatternMock: false });
    expect(b).not.toContain("/build-mock?topics=");
    expect(b).not.toContain("Full-Length Mock (Real Pattern)");
    expect(b).toContain("has not built one for this exam yet");
    expect(b).toContain("has no topic with enough questions for this exam yet");
  });
});

describe("tutorSystemBlocks", () => {
  const withFacts = (s: SyllabusContext, exam: ExamFactsExam, rows: TutorTrackerRow[] = []): SyllabusContext => ({
    ...s,
    examFacts: source(exam, rows),
  });
  const tsSyllabus: SyllabusContext = { ...syllabus, examCode: "TS_POLICE_PC", examName: "Telangana Police Constable (TSLPRB)", examShortName: "TS Police PC" };

  it("keeps the shared 1-hour prefix byte-identical across exams", () => {
    const a = tutorSystemBlocks({ syllabus: withFacts(syllabus, SSC_GD), toolsOn: true, now });
    const b = tutorSystemBlocks({ syllabus: withFacts(tsSyllabus, TS_PC, [row("2026-12-20", "Preliminary Written Test", "official", "https://www.tgprb.in/x.pdf")]), toolsOn: true, now });
    expect(a[0].text).toBe(b[0].text);
    expect((a[0].cache_control as { ttl?: string }).ttl).toBe("1h");
    // The features list is in it; nothing exam-specific is.
    expect(a[0].text).toContain("What Shishya offers");
    expect(a[0].text).not.toContain("# Syllabus");
    expect(a[0].text).not.toContain("# Exam facts");
    expect(a[0].text).not.toContain("TS_POLICE_PC");
  });

  it("puts the exam facts in their own 5-minute segment after the syllabus", () => {
    const blocks = tutorSystemBlocks({ syllabus: withFacts(syllabus, SSC_GD), toolsOn: false, now });
    expect(blocks).toHaveLength(3);
    expect(blocks.map((x) => (x.cache_control as { ttl?: string }).ttl ?? "5m")).toEqual(["1h", "5m", "5m"]);
    expect(blocks[1].text).toContain("# Syllabus — SSC General Duty Constable (SSC_GD)");
    expect(blocks[2].text).toContain("# Exam facts — SSC General Duty Constable (SSC_GD)");
    expect(blocks[2].text).toContain("80 questions · 160 marks in total");
  });

  it("falls back to two blocks when the facts read failed, one in general mode", () => {
    expect(tutorSystemBlocks({ syllabus, toolsOn: true })).toHaveLength(2);
    const general = tutorSystemBlocks({ syllabus: { ...syllabus, subjects: [] }, generalMode: true, toolsOn: false });
    expect(general).toHaveLength(1);
    expect(general[0].text).toContain("What Shishya offers");
  });

  it("answers without the facts, never fails, when the cached source is malformed", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const bad = { ...syllabus, examFacts: { ...source(SSC_GD, []), rows: null } as unknown as TutorExamFactsSource };
    const blocks = tutorSystemBlocks({ syllabus: bad, toolsOn: true, now });
    expect(blocks).toHaveLength(2);
    // Without facts the syllabus block is the plain one.
    expect(blocks[1].text).toBe(syllabusBlock(syllabus));
    warn.mockRestore();
  });
});
