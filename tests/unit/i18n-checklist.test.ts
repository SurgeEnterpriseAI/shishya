// The last-minute checklist in the reader's language (16 Sep 2026).
// src/lib/exam-checklist.ts builds its sentences from chk.* keys through an
// optional translator, and src/lib/marking-scheme.ts hands every refusal out
// as key + vars next to its English `reason`. No DB, no network.
// Run with: npx vitest run tests/unit/i18n-checklist.test.ts
//
// What it guards:
//   • with no translator the builder prints the English it always printed —
//     the meta builder, llms-full.txt and the exam-eve mail call it that way;
//   • every carry item's key carries exactly its English sentence;
//   • every marking-scheme refusal's `detail`, rendered in English, IS its
//     `reason` — so the hi / te sentence can never drift from the rule;
//   • in hi / te the exam-day line, the window, the marking line and the
//     refusals come out in that script, with the tier word of that language,
//     the same numbers, and no English clause left inside them.

import { describe, it, expect } from "vitest";
import { dict, fillTemplate, tk, type Locale, type StringKey } from "@/lib/i18n";
import {
  buildExamChecklist,
  EN_T,
  examChecklistMeta,
  markingReasonText,
  patternSummary,
  WHAT_TO_CARRY,
  type ChecklistExam,
  type ChecklistInput,
} from "@/lib/exam-checklist";
import { markingSchemeVerdict, stageMismatchDetail, stageMismatchReason, UNEQUAL_PAPER_EXAMS, UNEQUAL_PAPER_EXAM_KEYS, SITTING_NOTES, SITTING_NOTE_KEYS } from "@/lib/marking-scheme";
import type { SourceTier, TimelineInput } from "@/lib/exam-timeline";

const tOf = (locale: Locale) => (key: StringKey) => (dict[locale] as Record<string, string>)[key] ?? dict.en[key];
const SCRIPT = { hi: /[ऀ-ॿ]/, te: /[ఀ-౿]/ } as const;
const d = (iso: string) => `${iso}T00:00:00.000Z`;
const ist = (day: string, hh: number, mm = 0) => new Date(Date.parse(`${day}T00:00:00Z`) - 330 * 60_000 + (hh * 60 + mm) * 60_000);

const SSC_CGL: ChecklistExam & { description: string } = {
  code: "SSC_CGL",
  name: "SSC CGL Tier 1",
  shortName: "SSC CGL",
  category: "GOVT_JOBS",
  description: "Computer-based Tier 1: 100 questions, 200 marks, 60 minutes.",
  durationMin: 60,
  totalQuestions: 100,
  scoredQuestions: null,
  totalMarks: 200,
  marksPerQ: 2,
  negativeMark: 0.5,
  languages: ["EN", "HI"],
};
const SBI_PO: ChecklistExam & { description: string } = {
  ...SSC_CGL,
  code: "SBI_PO",
  name: "SBI Probationary Officer (Prelims)",
  shortName: "SBI PO",
  category: "BANKING",
  description: "Online preliminary exam: English, Quantitative Aptitude, Reasoning.",
  totalMarks: 100,
  marksPerQ: 1,
  negativeMark: 0.25,
};
const SSC_URL = "https://ssc.gov.in";
const exam = (day: string, extra: Partial<TimelineInput> = {}): TimelineInput => ({
  id: `e-${day}`,
  label: "Tier 1 exam",
  date: d(day),
  isExamDay: true,
  kind: "EXAM",
  confidence: "official",
  url: "https://ssc.gov.in/notices/cgl-2026-tier1",
  ...extra,
});

const input = (over: Partial<ChecklistInput> = {}): ChecklistInput => ({
  exam: SSC_CGL,
  subjects: [],
  rows: [exam("2026-09-20")],
  officialUrl: SSC_URL,
  officialName: "Staff Selection Commission (SSC)",
  now: ist("2026-09-13", 10),
  ...over,
});
const localised = (locale: "hi" | "te"): Partial<ChecklistInput> => {
  const t = tOf(locale);
  return { t, locale, tierWord: (tier: SourceTier) => t(`ew.tier.${tier}` as StringKey), passedText: t("tracker.passedEstimate") };
};

describe("English stays the English it was", () => {
  it("exam-day lines in every phase", () => {
    const week = buildExamChecklist(input());
    expect(week.examDayLine).toBe(`Exam on ${week.examDay!.dated} — 7 days to go.`);
    const eve = buildExamChecklist(input({ now: ist("2026-09-19", 10) }));
    expect(eve.examDayLine).toBe(`Exam tomorrow, ${eve.examDay!.dated}.`);
    const today = buildExamChecklist(input({ now: ist("2026-09-20", 8) }));
    expect(today.examDayLine).toBe(`Exam today, ${today.examDay!.dated}.`);
    const post = buildExamChecklist(input({ now: ist("2026-09-22", 10) }));
    expect(post.examDayLine).toBe(`The paper was held on ${post.examDay!.dated}.`);
    const far = buildExamChecklist(input({ rows: [exam("2026-11-20")] }));
    expect(far.examDayLine).toBe(`Next exam day: ${far.examDay!.dated} — 68 days to go.`);
    const passed = buildExamChecklist(input({ rows: [exam("2026-09-01", { confidence: "expected", url: null })] }));
    expect(passed.examDayLine).toBe(
      `Exam day: ${passed.examDay!.dated}. No date has been announced since — check the official portal.`,
    );
    expect(passed.examDay!.dated).toMatch(/ — was expected — not confirmed$/);
  });

  it("the window, the marking line and the pattern summary", () => {
    const win = buildExamChecklist(input({ rows: [exam("2026-09-12"), exam("2026-09-20")], now: ist("2026-09-15", 10) }));
    expect(win.window).toMatch(/^12 Sept? to 20 Sept? \(official\)$/);
    expect(win.examDayLine).toBe(`Exam window: ${win.window}. Your shift day is on your admit card.`);
    const c = buildExamChecklist(input());
    expect(c.pattern.marking).toBe("+2 per correct answer, −0.5 per wrong answer");
    expect(patternSummary(c.pattern)).toBe("100 questions, 200 marks, 60 minutes");
    expect(patternSummary({ ...c.pattern, scoredQuestions: 90 })).toBe("100 questions (90 scored), 200 marks, 60 minutes");
    const noNeg = buildExamChecklist(input({ exam: { ...SSC_CGL, negativeMark: 0 } }));
    expect(noNeg.pattern.marking).toBe("+2 per correct answer, no negative mark on our records — confirm it in the official notice");
  });

  it("the <title> and description never take a translator", () => {
    expect(examChecklistMeta.length).toBe(2);
    const hi = buildExamChecklist(input(localised("hi")));
    // The page builds its metadata from an English checklist (loadChecklist
    // without `lang`); this is that call.
    const meta = examChecklistMeta(SSC_CGL, buildExamChecklist(input()));
    expect(meta.title).toMatch(/^SSC CGL last-minute checklist — exam 20 Sept? \(official\): what to carry, admit card, pattern \| Shishya$/);
    expect(meta.description).not.toMatch(SCRIPT.hi);
    expect(hi.examDayLine).toMatch(SCRIPT.hi);
  });

  it("every carry item's key is its English sentence", () => {
    const items = Object.values(WHAT_TO_CARRY).flat();
    expect(items.length).toBeGreaterThan(40);
    for (const item of items) expect(tk(item.key, "en"), item.key).toBe(item.text);
    const keys = new Set(items.map((i) => i.key));
    expect(keys.size).toBe(new Set(items.map((i) => i.text)).size);
    for (const key of keys) {
      expect(dict.hi[key as keyof typeof dict.hi], key).toMatch(SCRIPT.hi);
      expect((dict.te as Record<string, string>)[key], key).toMatch(SCRIPT.te);
    }
  });
});

describe("marking-scheme refusals: detail renders to reason", () => {
  const CASES = [
    // rule 4 with a verified sitting note, with a date
    markingSchemeVerdict(SBI_PO, { rowLabel: "Mains Exam", rowDate: new Date("2026-09-12T00:00:00Z") }),
    // rule 4 without a note, without a date
    markingSchemeVerdict({ ...SSC_CGL }, { rowLabel: "Tier 2 exam" }),
    // rule 4 without figures
    markingSchemeVerdict({ ...SSC_CGL, totalQuestions: 0, totalMarks: 0 }, { rowLabel: "Tier 2 exam", rowDate: "2026-12-10T00:00:00Z" }),
    // rule 5
    markingSchemeVerdict({ ...SSC_CGL, code: "CDS", name: "Combined Defence Services", shortName: "CDS" }),
    // not on our records
    markingSchemeVerdict({ ...SSC_CGL, marksPerQ: 0 }),
    // rule 1 — an average
    markingSchemeVerdict({ code: "X", name: "N", shortName: "SSC CGL", totalQuestions: 150, scoredQuestions: 120, totalMarks: 300, marksPerQ: 1.37, description: "" }),
    // rule 2 — does not add up
    markingSchemeVerdict({ code: "X", name: "N", shortName: "SSC CGL", totalQuestions: 100, scoredQuestions: null, totalMarks: 250, marksPerQ: 2, description: "" }),
    // rule 3 — parts with different totals
    markingSchemeVerdict({ code: "X", name: "N", shortName: "SSC CGL", totalQuestions: 100, scoredQuestions: null, totalMarks: 200, marksPerQ: 2, description: "Paper 1 100 marks, Paper 2 60 marks, Paper 3 40 marks" }),
  ];

  it("covers every refusal shape", () => {
    expect(CASES.every((v) => !v.ok && v.reason && v.detail)).toBe(true);
    expect(new Set(CASES.map((v) => v.detail!.key)).size).toBe(CASES.length);
    expect(markingSchemeVerdict(SSC_CGL)).toEqual({ ok: true, reason: null });
  });

  it("English: markingReasonText(detail) === reason", () => {
    for (const v of CASES) expect(markingReasonText(v.detail, EN_T), v.detail!.key).toBe(v.reason);
    expect(markingReasonText(stageMismatchDetail(SBI_PO, "Mains Exam", null), EN_T)).toBe(stageMismatchReason(SBI_PO, "Mains Exam", null));
    expect(stageMismatchDetail(SBI_PO, "Prelims exam")).toBeNull();
    expect(markingReasonText(null, EN_T)).toBeNull();
  });

  it("the per-exam sentences have their keys, and the keys carry the same English", () => {
    for (const [code, sentence] of Object.entries(UNEQUAL_PAPER_EXAMS)) expect(tk(UNEQUAL_PAPER_EXAM_KEYS[code], "en")).toBe(sentence);
    for (const [code, stages] of Object.entries(SITTING_NOTES)) {
      for (const [stage, note] of Object.entries(stages)) expect(tk(SITTING_NOTE_KEYS[code][stage], "en")).toBe(note);
    }
  });

  for (const locale of ["hi", "te"] as const) {
    it(`${locale}: same numbers, own script, no English clause left`, () => {
      const t = tOf(locale);
      for (const v of CASES) {
        const text = markingReasonText(v.detail, t)!;
        expect(text, v.detail!.key).toMatch(SCRIPT[locale]);
        expect(text).not.toMatch(/\{\w+\}/);
        expect(text).not.toMatch(/\b(marks|questions|sitting|scored|unequal|cannot)\b/);
        const nums = (s: string) => [...new Set(s.match(/\d+(?:\.\d+)?/g) ?? [])].sort().join();
        expect(nums(text), v.detail!.key).toBe(nums(v.reason!));
      }
    });

    // 16 Sep 2026: the sitting's day stayed "19 Sept" inside the hi / te
    // sentence while the exam-day line on the same page said "19 सित॰".
    it(`${locale}: the sitting's day is in the reader's language, and is the same day`, () => {
      const t = tOf(locale);
      const MONTH_EN = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\b/;
      const dated = CASES.filter((v) => typeof v.detail!.vars.dayIso === "string");
      expect(dated.length).toBe(2);
      for (const v of dated) {
        expect(v.reason).toMatch(MONTH_EN);
        const text = markingReasonText(v.detail, t, locale)!;
        expect(text, v.detail!.key).not.toMatch(MONTH_EN);
        expect(text).toMatch(SCRIPT[locale]);
        expect(text).not.toMatch(/\{\w+\}/);
        expect(text).toContain(String(new Date(String(v.detail!.vars.dayIso)).getUTCDate()));
        // English ignores the locale argument and stays the reason string.
        expect(markingReasonText(v.detail, EN_T, "en")).toBe(v.reason);
      }
      // Through the page's own builder: a Prelims record on a Mains row.
      const c = buildExamChecklist(
        input({ ...localised(locale), exam: SBI_PO, rows: [exam("2026-09-20", { label: "Mains Exam" })] }),
      );
      expect(c.pattern.stageMismatch).toMatch(SCRIPT[locale]);
      expect(c.pattern.stageMismatch).toContain("20");
      expect(c.pattern.stageMismatch).not.toMatch(MONTH_EN);
      const en = buildExamChecklist(input({ exam: SBI_PO, rows: [exam("2026-09-20", { label: "Mains Exam" })] }));
      expect(en.pattern.stageMismatch).toBe(stageMismatchReason(SBI_PO, "Mains Exam", d("2026-09-20")));
    });
  }
});

describe("hi and te checklists", () => {
  for (const locale of ["hi", "te"] as const) {
    const t = tOf(locale);
    it(`${locale}: sentences, tier words and numbers`, () => {
      const c = buildExamChecklist(input(localised(locale)));
      expect(c.examDay!.dated).toContain(`(${t("ew.tier.official")})`);
      expect(c.examDayLine).toBe(fillTemplate(t("chk.day.week"), { d: c.examDay!.dated, n: 7 }));
      expect(c.examDayLine).toMatch(SCRIPT[locale]);
      expect(c.pattern.marking).toMatch(SCRIPT[locale]);
      expect(c.pattern.marking).toContain("+2");
      expect(c.pattern.marking).toContain("−0.5");
      expect(patternSummary(c.pattern, t)).toBe(
        [
          fillTemplate(t("chk.pattern.q"), { n: 100 }),
          fillTemplate(t("chk.pattern.marks"), { n: 200 }),
          fillTemplate(t("chk.pattern.minutes"), { n: 60 }),
        ].join(", "),
      );
      // Facts are the same in every language.
      const en = buildExamChecklist(input());
      expect(c.phase).toBe(en.phase);
      expect(c.daysTo).toBe(en.daysTo);
      expect(c.carry.map((i) => i.key)).toEqual(en.carry.map((i) => i.key));
    });

    it(`${locale}: a passed estimate still says it was never confirmed`, () => {
      const c = buildExamChecklist(input({ ...localised(locale), rows: [exam("2026-09-01", { confidence: "expected", url: null })] }));
      expect(c.examDay!.passedEstimate).toBe(true);
      expect(c.examDay!.dated).toContain(t("tracker.passedEstimate"));
      expect(c.examDayLine).toBe(fillTemplate(t("chk.day.passed"), { d: c.examDay!.dated }));
      expect(c.examDayLine).not.toBe(fillTemplate(t("chk.day.post"), { d: c.examDay!.dated }));
    });

    it(`${locale}: another stage's sitting withholds the scheme, in that language`, () => {
      const c = buildExamChecklist(
        input({
          ...localised(locale),
          exam: SBI_PO,
          rows: [exam("2026-09-20", { label: "Mains Exam", url: "https://sbi.co.in/n" })],
          officialUrl: "https://sbi.co.in",
        }),
      );
      expect(c.pattern.marking).toBeNull();
      expect(c.pattern.stageMismatch).toMatch(SCRIPT[locale]);
      expect(c.pattern.stageMismatch).toContain("Prelims");
      expect(c.pattern.stageMismatch).toContain("Mains");
      expect(c.pattern.stageMismatch).not.toContain("unequal per-question marks");
      expect(c.pattern.stageMismatch).toContain(t("mark.sitting.SBI_PO.mains"));
    });
  }
});
