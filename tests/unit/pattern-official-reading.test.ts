import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PATTERN_VERIFIED, negativeMarkingText, patternCitation, patternSentence, sectionText, verifiedPattern } from "@/lib/pattern-verified";
import { hubFaqExtraItems } from "@/lib/hub-faq";
import { OFFICIAL_SYLLABUS_PLACES, officialSyllabusPlace, syllabusPlaceCopy } from "@/lib/official-syllabus-lines";
import { TOPIC_PAGES_STAGE1 } from "@/lib/topic-pages-stage1";

// 29 Sep 2026 — four exams read twice from the conducting body's own
// documents: TNPSC Group I, UPSSSC PET, APPSC Group II, IOQM.

const stored = (code: string) => {
  const v = PATTERN_VERIFIED[code];
  return { code, totalQuestions: v.questions, totalMarks: v.marks, durationMin: v.durationMin, negativeMark: v.negativePerWrong };
};

describe("the four exams, as their notices print them", () => {
  it("every source is on the body's own site and carries where it was read", () => {
    const hosts: Record<string, string> = { TN_TNPSC_GROUP1: "tnpsc.gov.in", UP_UPSSSC_PET: "upsssc.gov.in", AP_APPSC_GROUP2: "psc.ap.gov.in", IOQM: "olympiads.hbcse.tifr.res.in" };
    for (const [code, host] of Object.entries(hosts)) {
      const v = verifiedPattern(stored(code));
      expect(v, code).not.toBeNull();
      expect(new URL(v!.source.url).hostname, code).toBe(host);
      expect(v!.source.para.length, code).toBeGreaterThan(5);
      expect(v!.checkedOn, code).toBe("2026-09-29");
    }
  });

  it("TNPSC Group I: no deduction printed for a wrong answer, 0.5 for a blank one — never 'no negative marking'", () => {
    const v = PATTERN_VERIFIED.TN_TNPSC_GROUP1;
    expect(patternSentence(v)).toBe(
      "Preliminary Examination: 200 questions, 300 marks, 180 minutes, no deduction printed for a wrong answer; 0.5 mark is deducted if a question is left blank (TNPSC notice, 23 Jun 2026).",
    );
    expect(patternSentence(v)).not.toContain("no negative marking");
    expect(v.sections.map(sectionText)).toEqual(["General Studies (Degree Standard) 175 questions", "Aptitude and Mental Ability (SSLC Standard) 25 questions"]);
  });

  it("UPSSSC PET: marks by subject, questions only where printed, no language stated, a scanned advertisement", () => {
    const v = PATTERN_VERIFIED.UP_UPSSSC_PET;
    expect(patternSentence(v)).toBe("Preliminary Eligibility Test: 100 questions, 100 marks, 120 minutes, −0.25 per wrong answer (UPSSSC advertisement, 1 Aug 2026).");
    expect(v.sections.reduce((a, s) => a + (s.marks ?? 0), 0)).toBe(100);
    expect(sectionText(v.sections[0])).toBe("Indian History (5 marks)");
    expect(sectionText(v.sections[12])).toBe("Unseen Hindi passage (2 passages) 10 questions (10 marks)");
    expect(v.languages).toBe("");
    expect(v.source.scanned).toBe(true);
  });

  it("APPSC Group II: the deduction in the notice's words, not a decimal", () => {
    const v = PATTERN_VERIFIED.AP_APPSC_GROUP2;
    expect(negativeMarkingText(v)).toBe("each wrong answer is penalised with 1/3rd of the marks prescribed for the question");
    expect(patternSentence(v)).not.toMatch(/0\.33/);
    expect(patternCitation(v)).toBe("APPSC notice, 7 Dec 2023");
  });

  it("IOQM Stage 1: integer answers with no options, marks of 2, 3 and 5, an undated brochure cited by the day it was read", () => {
    const v = PATTERN_VERIFIED.IOQM;
    expect(patternCitation(v)).toBe("HBCSE brochure, read 29 Sept 2026".replace("Sept", new Date("2026-09-29T00:00:00Z").toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" })));
    expect(patternSentence(v)).toContain("each answer is an integer from 00 to 99");
    expect(patternSentence(v)).toContain("no negative marking");
    expect(v.marksNote).toBe("10 questions carry 2 marks each, 10 carry 3 marks and 10 carry 5 marks");
    expect(10 * 2 + 10 * 3 + 10 * 5).toBe(v.marks);
    expect(v.practiceFormatDiffers).toBe(true);
    expect(v.sections).toEqual([]);
  });

  it("a stored row that stops agreeing drops the exam back to no numbers", () => {
    expect(verifiedPattern({ ...stored("UP_UPSSSC_PET"), negativeMark: 0 })).toBeNull();
    expect(verifiedPattern({ ...stored("IOQM"), totalMarks: 150 })).toBeNull();
  });
});

describe("hub questions and answers", () => {
  const base = {
    code: "X", name: "X", short: "X", cutoffPage: false, cutoffOfficial: null, realPatternMock: true, buildMock: false,
    hasPyq: false, tutorLanguageCount: 12,
  } as unknown as Parameters<typeof hubFaqExtraItems>[0];
  const faq = (code: string, short: string) => hubFaqExtraItems({ ...base, code, name: short, short, pattern: PATTERN_VERIFIED[code] });

  it("TNPSC Group I: the negative-marking answer states both facts", () => {
    const a = faq("TN_TNPSC_GROUP1", "TNPSC Group I").find((f) => /negative marking/.test(f.q))!.a;
    expect(a).toBe("In TNPSC Group I Preliminary Examination: no deduction printed for a wrong answer; 0.5 mark is deducted if a question is left blank (TNPSC notice, 23 Jun 2026).");
  });
  it("UPSSSC PET: no languages answer, because the advertisement states none", () => {
    const items = faq("UP_UPSSSC_PET", "UPSSSC PET");
    expect(items.some((f) => /languages/.test(f.q))).toBe(false);
    expect(items.find((f) => /exam pattern/.test(f.q))!.a).toContain("Indian History (5 marks)");
  });
  it("IOQM: the pattern answer has no empty section list, and the mock answer claims no pattern", () => {
    const items = faq("IOQM", "IOQM");
    const pat = items.find((f) => /exam pattern/.test(f.q))!.a;
    expect(pat).toContain("IOQM Stage 1 has 30 questions for 100 marks in 180 minutes. Answers: each answer is an integer from 00 to 99");
    expect(pat).not.toContain("minutes: .");
    const mock = items.find((f) => /full-length/.test(f.q))!.a;
    expect(mock).toContain("not in the paper's answer format");
    expect(mock).not.toMatch(/mock in the .* pattern/);
  });
});

describe("where the official syllabus names a topic", () => {
  it("the 30 hand-read places, each on the body's own site, each a stage-1 topic page", () => {
    // 29 Sep 2026: generated readings add more places (src/data/official-readings.ts, tested there).
    const keys = Object.keys(OFFICIAL_SYLLABUS_PLACES).filter((k) => /^(TN_TNPSC_GROUP1|UP_UPSSSC_PET|AP_APPSC_GROUP2|IOQM)\//.test(k));
    expect(keys).toHaveLength(30);
    for (const k of keys) {
      expect(TOPIC_PAGES_STAGE1.has(k), k).toBe(true);
      const p = OFFICIAL_SYLLABUS_PLACES[k];
      expect(new URL(p.doc.url).hostname, k).toMatch(/(^|\.)(tnpsc\.gov\.in|upsssc\.gov\.in|psc\.ap\.gov\.in|ioqm\.mtai\.org\.in)$/);
      expect(p.where.length, k).toBeGreaterThan(5);
    }
  });
  it("topics neither reading could place are not listed", () => {
    expect(officialSyllabusPlace("IOQM", "math.combinatorics.permutations")).toBeNull();
    expect(officialSyllabusPlace("AP_APPSC_GROUP2", "gs.indian_polity.governance")).toBeNull();
    expect(officialSyllabusPlace("SSC_CGL", "quant.si_ci")).toBeNull();
  });
  it("the olympiad syllabus carries its caveat; the scanned advertisement says it was read by AI", () => {
    expect(officialSyllabusPlace("IOQM", "math.combinatorics")!.doc.caveat).toMatch(/not exhaustive/);
    expect(officialSyllabusPlace("UP_UPSSSC_PET", "history.indus_valley")!.doc.scanned).toBe(true);
    for (const l of ["en", "hi", "te"]) expect(syllabusPlaceCopy(l).scanned).toContain("AI");
  });
  it("the topic page prints the place, not the syllabus text, and the format note where the paper differs", () => {
    const page = fs.readFileSync(path.resolve(__dirname, "../../src/app/exams/[code]/topics/[topicCode]/page.tsx"), "utf8");
    expect(page).toContain("const syllabusPlace = officialSyllabusPlace(exam.code, topic.code);");
    expect(page).toContain("data-official-syllabus");
    expect(page).toContain("officialPattern?.practiceFormatDiffers");
    expect(page).toContain("formatNote={formatNote}");
  });
});
