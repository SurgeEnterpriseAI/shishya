// Exam hub FAQ copy (26 Sep 2026): no "admin" claim in any locale, the
// automated answer check stated in every locale, and the count sentence
// honest about which count it prints. The hub's FAQPage JSON-LD is built by
// src/components/ExamFaq.tsx from these same strings, so it follows.
// 26 Sep 2026 (repair): the free answer no longer claims every question was
// answer-checked (157 validated questions on 55 exams carry no answer-check
// record); the count answer states the exam's own split (faqCountAnswer).

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { EXAM_HUB_COPY, faqCountAnswer, fillHub } from "@/lib/exam-hub-copy";
import { findForbiddenPhrases } from "@/lib/truth-lint";

const LOCALES = ["en", "hi", "te"] as const;
const allText = (lc: (typeof LOCALES)[number]) => Object.values(EXAM_HUB_COPY[lc]).join("\n");

describe("exam hub copy — the question pipeline, honestly", () => {
  it("no 'admin' claim in any locale (English, Hindi, Telugu spellings)", () => {
    for (const lc of LOCALES) {
      const text = allText(lc);
      expect(text, lc).not.toMatch(/admin/i);
      expect(text, lc).not.toContain("एडमिन");
      expect(text, lc).not.toContain("అడ్మిన్");
      expect(findForbiddenPhrases(text, `exam-hub-copy:${lc}`), lc).toEqual([]);
    }
  });

  it("the free answer makes no universal check claim — only AI writing and the report re-check", () => {
    expect(fillHub(EXAM_HUB_COPY.en.faqFreeA, { short: "SSC CGL" })).toBe(
      "Yes. Every SSC CGL mock test, PYQ-pattern paper and study tool on Shishya is completely free — no subscription and no credit card. Questions are written with AI from the official syllabus and notification, and re-checked whenever a student reports one.",
    );
    for (const lc of LOCALES) {
      const a = EXAM_HUB_COPY[lc].faqFreeA;
      expect(a, lc).toContain("AI");
      expect(a, lc).not.toMatch(/answer-check|before they go live|examiner/i);
      expect(a, lc).not.toContain("स्वचालित जाँच");
      expect(a, lc).not.toContain("ఆటోమేటిక్ తనిఖీ");
    }
  });

  it("the count answer claims the answer check only for the questions it passed", () => {
    const en = EXAM_HUB_COPY.en;
    // Split unknown (read failed): no check claim at all.
    expect(faqCountAnswer(en, { count: 1234, unchecked: null, short: "SSC CGL" })).toBe(
      "Shishya has 1,234 SSC CGL practice questions, written with AI (any question a student reports is re-checked), available as adaptive mock tests with a worked solution for every question.",
    );
    // Every validated question passed.
    expect(faqCountAnswer(en, { count: 1234, unchecked: 0, short: "SSC CGL" })).toBe(
      "Shishya has 1,234 SSC CGL practice questions, written with AI; every one of them has passed an automated answer check (three independent AI solves and an examiner), and any question a student reports is re-checked. They are available as adaptive mock tests with a worked solution for every question.",
    );
    // Some did not (IBPS PO on 26 Sep 2026: 6 of 251).
    expect(faqCountAnswer(en, { count: 251, unchecked: 6, short: "IBPS PO" })).toBe(
      "Shishya has 251 IBPS PO practice questions, written with AI. The automated answer check (three independent AI solves and an examiner) has passed 245 of them; for the remaining 6, that check has not run yet. Any question a student reports is re-checked. They are available as adaptive mock tests with a worked solution for every question.",
    );
    // Indian digit grouping on both numbers.
    expect(faqCountAnswer(en, { count: 123456, unchecked: 1200, short: "X" })).toContain("has passed 1,22,256 of them; for the remaining 1,200,");
    // Stale caches can never make the split claim more than the count, and
    // nothing passed means no check claim.
    expect(faqCountAnswer(en, { count: 5, unchecked: 9, short: "X" })).toBe(faqCountAnswer(en, { count: 5, unchecked: null, short: "X" }));
    expect(faqCountAnswer(en, { count: 5, unchecked: 5, short: "X" })).not.toMatch(/answer check/);
    expect(faqCountAnswer(en, { count: 5, unchecked: Number.NaN, short: "X" })).not.toMatch(/answer check/);
    for (const lc of LOCALES) {
      const C = EXAM_HUB_COPY[lc];
      for (const key of ["faqCountA", "faqCountCheckedA", "faqCountPartA"] as const) {
        expect(C[key], `${lc}.${key}`).toContain("{count}");
        expect(C[key], `${lc}.${key}`).toContain("{short}");
        expect(C[key], `${lc}.${key}`).toContain("AI");
        expect(C[key], `${lc}.${key}`).not.toMatch(/before they go live|answer-checked/i);
      }
      expect(C.faqCountPartA, lc).toContain("{checked}");
      expect(C.faqCountPartA, lc).toContain("{unchecked}");
      const partial = faqCountAnswer(C, { count: 251, unchecked: 6, short: "IBPS PO" });
      expect(partial, lc).toContain("245");
      expect(partial, lc).toContain("6");
      expect(partial, lc).not.toMatch(/\{\w+\}/);
    }
    // The unknown form never names the check in any locale; the checked forms do.
    expect(EXAM_HUB_COPY.en.faqCountA).not.toMatch(/answer check|examiner/i);
    expect(EXAM_HUB_COPY.hi.faqCountA).not.toContain("स्वचालित जाँच");
    expect(EXAM_HUB_COPY.te.faqCountA).not.toContain("ఆటోమేటిక్ తనిఖీ");
    expect(EXAM_HUB_COPY.hi.faqCountCheckedA).toContain("तीन अलग-अलग AI हल");
    expect(EXAM_HUB_COPY.hi.faqCountPartA).toContain("स्वचालित जाँच");
    expect(EXAM_HUB_COPY.te.faqCountCheckedA).toContain("మూడు వేర్వేరు AI పరిష్కారాలు");
    expect(EXAM_HUB_COPY.te.faqCountPartA).toContain("ఆటోమేటిక్ తనిఖీ");
  });

  it("the hub reads the exam's answer-check split and passes it to ExamFaq", () => {
    const hub = fs.readFileSync(path.join(process.cwd(), "src/app/exams/[code]/page.tsx"), "utf8");
    expect(hub).toContain("examUncheckedQuestionCount(exam.code)");
    expect(hub).toMatch(/uncheckedCount=\{faqUncheckedCount\}/);
    const lib = fs.readFileSync(path.join(process.cwd(), "src/lib/exam-answer-check.ts"), "utf8");
    // The firewall's pass record, NULL-safe, over the hub count's population.
    expect(lib).toContain(`COALESCE(q."validatedBy", '') LIKE 'factory:%'`);
    expect(lib).toContain("COALESCE(q.metadata ? 'factoryVerify', FALSE)");
    expect(lib).toContain("q.validated = TRUE AND ${REAL_EXAM_SQL}");
  });

  it("ExamFaq renders these strings into both the accordion and its FAQPage JSON-LD", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "src/components/ExamFaq.tsx"), "utf8");
    expect(src).toContain("C.faqFreeA");
    expect(src).toContain("faqCountAnswer(C, { count: questionCount, unchecked: uncheckedCount");
    expect(src).toMatch(/"@type": "FAQPage",\s*mainEntity: faqs\.map/);
    // The comments no longer credit an admin team either.
    expect(src).not.toMatch(/admin-validated|validated by Shishya's admin/i);
  });
});
