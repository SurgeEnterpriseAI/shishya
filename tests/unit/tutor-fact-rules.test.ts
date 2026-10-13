// The tutor's "numbers you have no data for" rules (13 Oct 2026) — pure, no
// DB, no model call.
//
// The 12-13 Oct quality audit (29 real guest turns, blind judge) found Claude
// breaking the tutor's own honesty rule in 8 of them: "four equal sections,
// 22-23 questions each" for SSC MTS built from the syllabus "(weight 1)",
// a per-subject marks table and a cut-off for RPSC RAS, Siemens scholarship
// amounts and an income limit, an SSC Stenographer pattern in general mode,
// "Parent's Education Tax" for "pet", a valid clock method called wrong, and a
// 3-day countdown for an exam whose rows had passed. These tests pin where
// the rules live (exam and general chats only; never the school tutor or the
// features that share ANSWER_FORMAT_RULES) and the exam-facts lines.
// Run: npx vitest run tests/unit/tutor-fact-rules.test.ts

import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

import { ANSWER_FORMAT_RULES, GENERAL_MODE_NOTE, SAFETY_RULES, TURN_FACT_REMINDER, TUTOR_FACT_RULES } from "@/lib/ai/prompts";
import { examFactsBlock } from "@/lib/ai/exam-facts";
import { tutorSystemBlocks, tutorTurnContext } from "@/lib/ai/tutor";
import type { TutorExamFacts } from "@/lib/ai/types";

const EMPTY = { examCode: "X", examName: "X", examShortName: "X", subjects: [] };

describe("TUTOR_FACT_RULES", () => {
  it("allows exam numbers only from the chat's own blocks, and shuts the two covers the audit saw", () => {
    expect(TUTOR_FACT_RULES).toMatch(/give a number only when the syllabus block, the exam facts block or the Shishya features list in this chat states it, a tool result in this chat returned it, or the student gave it/);
    for (const kind of ["questions or marks per section, subject or topic", "how often a topic is asked", "cut-offs", "vacancies", "fees, salaries, pay levels and scholarship amounts", "age, income, class and marks limits", "typing or shorthand speeds"]) {
      expect(TUTOR_FACT_RULES).toContain(kind);
    }
    expect(TUTOR_FACT_RULES).toContain("even when you think you remember it, do not write it");
    expect(TUTOR_FACT_RULES).toContain(`not with "approximately", "about", "usually" or "from past papers", and not followed by "confirm it on the official site"`);
    expect(TUTOR_FACT_RULES).toContain("send the student to the official notification, or the Shishya page that shows it");
  });

  it("says the syllabus weight is not the paper's weightage (SSC MTS: 'four equal sections')", () => {
    expect(TUTOR_FACT_RULES).toContain(`The "weight" beside a subject in the syllabus block is Shishya's relative study weight, not the paper's weightage`);
    expect(TUTOR_FACT_RULES).toContain(`never turn it into question counts, marks or "equal sections"`);
  });

  it("keeps subject teaching open, and covers names and methods", () => {
    expect(TUTOR_FACT_RULES).toContain("This does not limit teaching");
    // A current-affairs scheme is NOT in the teaching exception (13 Oct eval: it invited a remembered scheme figure).
    expect(TUTOR_FACT_RULES).not.toMatch(/current affairs/);
    expect(TUTOR_FACT_RULES).toContain("Never expand an abbreviation or a half-named exam into a name you are not sure exists");
    expect(TUTOR_FACT_RULES).toContain("(PET, steno, TET)");
    expect(TUTOR_FACT_RULES).toContain("Never call a mathematically valid method wrong");
  });

  it("is in the exam tutor (guest and signed in) and the general tutor, right after the format rules", () => {
    for (const args of [{ toolsOn: false }, { toolsOn: true }, { toolsOn: false, generalMode: true }]) {
      const t = tutorSystemBlocks({ syllabus: EMPTY, ...args })[0].text;
      expect(t).toContain(`${ANSWER_FORMAT_RULES}\n\n${TUTOR_FACT_RULES}\n\nWhat Shishya offers`);
      expect(t.split(TUTOR_FACT_RULES)).toHaveLength(2);
    }
  });

  it("is not in the school tutor, nor in the shared format or safety rules other features send", () => {
    const scope = {
      examCode: "NCERT_C09",
      curriculum: "NCERT",
      cls: 9,
      boardShort: "CBSE",
      boardLabel: "CBSE (NCERT textbooks)",
      classPath: "/schooling/cbse/class-9",
      subjects: [{ code: "SCIENCE", name: "Science", path: "/schooling/cbse/class-9/science", chapters: [{ code: "iesc1.ch01", name: "Matter in Our Surroundings" }] }],
    } as any;
    const school = tutorSystemBlocks({ syllabus: EMPTY, toolsOn: false, school: scope }).map((b) => b.text).join("\n");
    expect(school).not.toContain(TUTOR_FACT_RULES.slice(0, 40));
    // explainer, coach, diagnostic and generator send ANSWER_FORMAT_RULES / SAFETY_RULES: unchanged.
    expect(ANSWER_FORMAT_RULES).not.toContain("Numbers and names you have no data for");
    expect(SAFETY_RULES).not.toContain("Numbers and names you have no data for");
  });
});

describe("TUTOR_FACT_RULES — news", () => {
  it("has no news feed: no recent event or scheme figure as fact, no quiz on a day's news", () => {
    expect(TUTOR_FACT_RULES).toContain("You have no news feed: never state a recent event, appointment, scheme figure or date from the news as fact, and never write a quiz on a given day's or month's news.");
    expect(TUTOR_FACT_RULES).toContain("https://shishya.in/current-affairs");
  });
});

describe("TURN_FACT_REMINDER — the turn context of exam and general chats", () => {
  const state = { examCode: "SSC_MTS", weaknesses: [], strengths: [], totalMocksTaken: 0 } as any;

  it("says exam numbers come only from the blocks, never from memory", () => {
    expect(TURN_FACT_REMINDER).toContain("come only from the exam facts and syllabus blocks above, a tool result or the student's own message, never from memory and not even approximately");
    expect(TURN_FACT_REMINDER).toContain("say you don't have that figure here and point to the official notification or the Shishya page that shows it");
    // 13 Oct review: the reminder had cut the syllabus block's topic-notes link (9/22 -> 5/22 exam replies).
    expect(TURN_FACT_REMINDER.endsWith("This does not change teaching: when you teach a topic from the syllabus block, still end with its one notes link.")).toBe(true);
    // local-llm.ts reads every "Reply language:" line; the reminder must not add one.
    expect(TURN_FACT_REMINDER).not.toMatch(/Reply language:/);
  });

  it("sits right above the language line in a general and an exam chat", () => {
    expect(tutorTurnContext({ school: null, generalMode: true, studentState: state, focusBlock: "", language: "EN" })).toBe(`${TURN_FACT_REMINDER}\nReply language: EN.`);
    const exam = tutorTurnContext({ school: null, generalMode: false, studentState: state, focusBlock: "", language: "HI" });
    expect(exam).toContain(`\n${TURN_FACT_REMINDER}\nReply language: HI.\n`);
    expect(exam.match(/Reply language:/g)).toHaveLength(1);
    expect(exam).toContain("<<ACTIONS>>");
  });

  it("is not in a school chat's turn", () => {
    const school = {
      scope: { examCode: "NCERT_C09", cls: 9, board: "CBSE", boardShort: "CBSE", classPath: "/schooling/cbse/class-9", subjects: [] },
      focus: null,
      band: null,
    } as unknown as Parameters<typeof tutorTurnContext>[0]["school"];
    expect(tutorTurnContext({ school, generalMode: false, studentState: state, focusBlock: "", language: "EN" })).not.toContain(TURN_FACT_REMINDER);
  });
});

describe("GENERAL_MODE_NOTE — no live data, no exam facts (13 Oct 2026)", () => {
  it("names the exam pattern and a scholarship's eligibility limits, even when remembered", () => {
    expect(GENERAL_MODE_NOTE).toContain("You have no live data and no exam facts in this chat.");
    expect(GENERAL_MODE_NOTE).toContain("an exam's pattern (sections, number of questions, marks, time, typing or shorthand speed)");
    expect(GENERAL_MODE_NOTE).toContain("a scholarship's amount or eligibility limits (income, marks, class)");
    expect(GENERAL_MODE_NOTE).toContain(`not even when you think you remember it, and not softened with "approximately" or followed by "confirm it on the official site"`);
    expect(GENERAL_MODE_NOTE).toContain("say which Shishya page shows it (the exam's page, the Exam calendar, Colleges, Scholarships, Careers)");
  });
});

const FACTS: TutorExamFacts = {
  asOfDay: "2026-10-13",
  pattern: { totalQuestions: 90, scoredQuestions: null, totalMarks: 270, marksPerQ: 3, markingNote: null, durationMin: 90, negativeMark: 1, languages: ["EN", "HI"] },
  officialPortal: { url: "https://ssc.gov.in", name: "Staff Selection Commission" },
  dates: [
    { day: "2026-10-10", kind: "EXAM", label: "Prelims exam starts", tier: "official", host: "ibps.in", status: "past", daysFromToday: -3 },
    { day: "2026-10-11", kind: "EXAM", label: "Prelims exam ends", tier: "official", host: "ibps.in", status: "past", daysFromToday: -2 },
  ],
  datesOmitted: 0,
  notAnnouncedKinds: null,
  pages: { cutoff: true, tricks: false, guide: false, syllabus: true, buildMock: true },
  fullPatternMock: true,
  pyqYears: [],
  officialPaperYears: [],
};

describe("examFactsBlock — the record's limits and the student's date (13 Oct 2026)", () => {
  const lines = examFactsBlock(FACTS, { code: "SSC_MTS", name: "SSC MTS" }).split("\n");

  it("says the record has no section split and no cut-off, right after the pattern lines", () => {
    const i = lines.findIndex((l) => l.startsWith("- Not in this record:"));
    expect(i).toBeGreaterThan(0);
    expect(lines[i - 1]).toMatch(/^- Paper offered in:/);
    expect(lines[i + 1]).toMatch(/^A mock the student took may be shorter than the real paper/);
    expect(lines[i]).toContain("how the questions or marks split across sections, subjects or topics, and any cut-off");
    expect(lines[i]).toContain("past cut-offs are on https://shishya.in/exams/SSC_MTS/cutoff");
    expect(lines[i]).toContain("never give a count or marks for a section or topic, not even an approximate one you remember");
  });

  it("points to /cutoff only when the exam has that page", () => {
    for (const pages of [null, { ...FACTS.pages!, cutoff: false }]) {
      const b = examFactsBlock({ ...FACTS, pages }, { code: "SSC_MTS", name: "SSC MTS" });
      expect(b).toContain("say the split is in the official notification and cut-offs are published with each result;");
      expect(b).not.toContain("past cut-offs are on");
    }
  });

  it("asks the tutor to correct a date the rows rule out, before the REPORTED rule", () => {
    const i = lines.findIndex((l) => l.startsWith("- If the student's message assumes a date these rows rule out"));
    expect(i).toBeGreaterThan(0);
    expect(lines[i]).toContain(`(an exam "in 3 days" whose exam rows have all passed, or a day outside its exam window)`);
    expect(lines[i]).toContain("their own date and shift are on their admit card, then help with what they asked");
    expect(lines[i + 1]).toMatch(/^- REPORTED rows:/);
  });

  it("leaves the date line out when no date is listed (nothing is ruled out)", () => {
    const b = examFactsBlock({ ...FACTS, dates: [], datesOmitted: 0, notAnnouncedKinds: [] }, { code: "SSC_MTS", name: "SSC MTS" });
    expect(b).not.toContain("assumes a date these rows rule out");
    expect(b).toContain("- Not in this record:");
  });
});
