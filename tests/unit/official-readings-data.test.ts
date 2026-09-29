import { describe, expect, it } from "vitest";
import { READ_DOCUMENTS, READ_PATTERNS, READ_PLACES } from "@/data/official-readings";
import { NEGATIVE_NOT_PRINTED, PATTERN_VERIFIED, negativeMarkingText, patternCitation, patternSentence, sectionText, verifiedPattern } from "@/lib/pattern-verified";
import { OFFICIAL_SYLLABUS_PLACES } from "@/lib/official-syllabus-lines";
import { TOPIC_PAGES_STAGE1 } from "@/lib/topic-pages-stage1";
import { hubFaqExtraItems } from "@/lib/hub-faq";

// 29 Sep 2026 — the generated official readings (scripts/build-official-readings.ts).
// Whatever the generator wrote, every entry must be printable as it stands.

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const BAD = /\b(?:null|undefined|NaN)\b|\[object/;

describe("generated patterns", () => {
  it("every pattern has whole numbers, a source on https, a place in the document and the day it was read", () => {
    for (const [code, v] of Object.entries(READ_PATTERNS)) {
      expect(v.code, code).toBe(code);
      for (const n of [v.questions, v.marks, v.durationMin]) expect(Number.isInteger(n) && n > 0, `${code} ${n}`).toBe(true);
      expect(v.negativePerWrong, code).toBeGreaterThanOrEqual(0);
      expect(v.negativePerWrong, code).toBeLessThanOrEqual(v.marks);
      expect(v.source.url, code).toMatch(/^https?:\/\//);
      expect(v.source.publisherShort.length, code).toBeGreaterThan(1);
      expect(v.source.para.length, code).toBeGreaterThan(3);
      expect(v.checkedOn, code).toMatch(DAY);
      if (v.source.publishedOn) expect(v.source.publishedOn, code).toMatch(DAY);
      if (v.source.publishedOn) expect(v.source.publishedOn <= v.checkedOn, code).toBe(true);
    }
  });

  it("every sentence a page can print from it is whole", () => {
    for (const [code, v] of Object.entries(READ_PATTERNS)) {
      const texts = [patternSentence(v), patternCitation(v), negativeMarkingText(v), ...v.sections.map(sectionText)];
      for (const t of texts) {
        expect(t, code).not.toMatch(BAD);
        expect(t.trim().length, code).toBeGreaterThan(3);
      }
      for (const s of v.sections) expect(s.questions !== null || s.marks !== null, `${code} ${s.name}`).toBe(true);
      const faq = hubFaqExtraItems({
        code, name: code, short: code, cutoffPage: false, cutoffOfficial: null, realPatternMock: true, buildMock: false, hasPyq: false, tutorLanguageCount: 12, pattern: v,
      } as unknown as Parameters<typeof hubFaqExtraItems>[0]);
      for (const f of faq) expect(`${f.q} ${f.a}`, code).not.toMatch(BAD);
      if (!v.languages) expect(faq.some((f) => /languages/.test(f.q)), code).toBe(false);
      if (v.practiceFormatDiffers) expect(faq.find((f) => /full-length/.test(f.q))!.a, code).toContain("not in the paper's answer format");
    }
  });

  it("printed section figures never exceed the paper's totals", () => {
    for (const [code, v] of Object.entries(READ_PATTERNS)) {
      if (v.sections.length && v.sections.every((s) => s.questions !== null)) expect(v.sections.reduce((a, s) => a + s.questions!, 0), code).toBeLessThanOrEqual(v.questions);
      if (v.sections.length && v.sections.every((s) => s.marks !== null)) expect(v.sections.reduce((a, s) => a + s.marks!, 0), code).toBeLessThanOrEqual(v.marks);
    }
  });

  it("a notice that is silent on wrong answers is never printed as 'no negative marking'", () => {
    const silent = { ...PATTERN_VERIFIED.SSC_CGL, negativePerWrong: 0, negativeNotPrinted: true };
    expect(negativeMarkingText(silent)).toBe(NEGATIVE_NOT_PRINTED);
    expect(patternSentence(silent)).not.toContain("no negative marking");
    for (const [code, v] of Object.entries(READ_PATTERNS)) if (v.negativeNotPrinted) expect(patternSentence(v), code).not.toContain("no negative marking");
  });

  it("the stored row's wrong-answer figure is not compared where the notice prints none", () => {
    const v = { ...PATTERN_VERIFIED.SSC_CGL };
    const row = { code: "SSC_CGL", totalQuestions: v.questions, totalMarks: v.marks, durationMin: v.durationMin, negativeMark: 0.25 };
    expect(verifiedPattern(row)).toBeNull();
  });

  it("hand-read exams win over a generated entry of the same code", () => {
    for (const code of ["SSC_CGL", "TN_TNPSC_GROUP1", "UP_UPSSSC_PET", "AP_APPSC_GROUP2", "IOQM"]) {
      expect(READ_PATTERNS[code], code).toBeUndefined();
      expect(PATTERN_VERIFIED[code].checkedOn, code).toMatch(DAY);
    }
    for (const code of Object.keys(READ_PATTERNS)) expect(PATTERN_VERIFIED[code]).toBe(READ_PATTERNS[code]);
  });
});

describe("generated syllabus places", () => {
  it("every place points at a listed document and a stage-1 topic page", () => {
    for (const [key, place] of Object.entries(READ_PLACES)) {
      expect(READ_DOCUMENTS[place.doc], key).toBeDefined();
      expect(TOPIC_PAGES_STAGE1.has(key), key).toBe(true);
      expect(key.startsWith(`${place.doc}/`), key).toBe(true);
      expect(place.where.length, key).toBeGreaterThan(3);
      expect(place.where, key).not.toMatch(BAD);
      expect(OFFICIAL_SYLLABUS_PLACES[key], key).toBeDefined();
    }
  });
  it("every document has a link, a name, the body's short name and the day it was read", () => {
    for (const [code, d] of Object.entries(READ_DOCUMENTS)) {
      expect(d.url, code).toMatch(/^https?:\/\//);
      expect(d.name.length, code).toBeGreaterThan(5);
      expect(d.publisherShort.length, code).toBeGreaterThan(1);
      expect(d.readOn, code).toMatch(DAY);
    }
  });
});
