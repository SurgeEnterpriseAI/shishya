// Both names on previous-year content (src/lib/pyq-naming.ts): every PYQ
// surface carries the search phrase "previous year paper" AND the honest
// label "PYQ-pattern", and a pattern set is never presented as the paper.
import { describe, it, expect } from "vitest";
import { hubPyqPhrase, pyqYearDescription, pyqYearH1, pyqYearHeadline, SITE_PYQ_PHRASE } from "@/lib/pyq-naming";
import { findForbiddenPhrases } from "@/lib/truth-lint";
import { PYQ_TEXT_QUESTIONS, pyqFaqItems, pyqModelledEn, pyqOptions, pyqTextShownLine } from "@/lib/pyq-faq";
import fs from "node:fs";
import path from "node:path";

const base = { short: "SSC CGL", name: "Staff Selection Commission CGL", year: 2024, held: 23, total: 100, partial: true };

const both = (s: string) => {
  expect(s.toLowerCase()).toContain("previous year paper");
  expect(s.toLowerCase()).toContain("pyq-pattern");
};

describe("pyq-naming", () => {
  it("case B (no official paper): both names, qualified, never the paper", () => {
    const d = pyqYearDescription({ ...base, officialPublisher: null });
    both(d);
    expect(d).toContain("previous year paper practice");
    expect(d).toContain("not the original questions");
    expect(d).toContain("23 PYQ-pattern questions");
    expect(d).toContain("which had 100");
    expect(d.toLowerCase()).not.toContain("official");
    both(pyqYearH1("SSC CGL", 2024, false));
    both(pyqYearHeadline({ ...base, hasOfficialPaper: false }));
  });

  it("case A (official paper linked): names the official paper and its publisher, keeps the qualifier", () => {
    const d = pyqYearDescription({ ...base, short: "UPSC Prelims", name: "UPSC Civil Services Prelims", officialPublisher: "UPSC" });
    both(d);
    expect(d).toContain("the official 2024 paper as UPSC published it");
    expect(d).toContain("not the original questions");
    const h1 = pyqYearH1("UPSC Prelims", 2024, true);
    both(h1);
    expect(h1).toContain("official paper");
    expect(pyqYearHeadline({ ...base, hasOfficialPaper: true })).toContain("(Official)");
  });

  it("full-length sets say full-length, partial sets keep N of M", () => {
    const full = pyqYearDescription({ ...base, held: 100, partial: false, officialPublisher: null });
    expect(full).toContain("full-length PYQ-pattern paper");
    expect(pyqYearHeadline({ ...base, hasOfficialPaper: false })).toContain("23 of 100 questions");
  });

  it("hub and site phrases carry both names", () => {
    both(hubPyqPhrase(true));
    both(hubPyqPhrase(false));
    expect(hubPyqPhrase(false)).toContain("practice");
    both(SITE_PYQ_PHRASE);
  });

  it("no forbidden trust phrase in any generated string", () => {
    const all = [
      pyqYearDescription({ ...base, officialPublisher: null }),
      pyqYearDescription({ ...base, officialPublisher: "UPSC" }),
      pyqYearH1("X", 2024, true),
      pyqYearH1("X", 2024, false),
      pyqYearHeadline({ ...base, hasOfficialPaper: true }),
      pyqYearHeadline({ ...base, hasOfficialPaper: false }),
      hubPyqPhrase(true),
      hubPyqPhrase(false),
      SITE_PYQ_PHRASE,
    ].join("\n");
    expect(findForbiddenPhrases(all, "pyq-naming")).toEqual([]);
  });
});

// 26 Sep 2026 (discoverability wave 2 G3): the year page's FAQ is visible and
// its question text is on the page — both keep both names and the N of M.
describe("pyq year page — visible FAQ and question text", () => {
  const faq = pyqFaqItems({
    short: "SSC CGL",
    year: 2024,
    pageUrl: "https://shishya.in/exams/SSC_CGL/pyq/2024",
    modelledEn: pyqModelledEn(23, 2024),
    partial: true,
    held: 23,
    officialPaperNote: "",
    fullMockNote: "",
  });

  // 27 Sep 2026 (repair, adversarial review): the paper's length for a
  // given year has no source (Exam.totalQuestions is one undated number —
  // NEET UG 2025 had 180, not the stored 200), so these surfaces state only
  // the set's own count.
  it("the FAQ carries both names, the set's own count and 'not the original questions' — never a paper length", () => {
    const all = faq.map((f) => `${f.q} ${f.a}`).join("\n");
    both(all);
    expect(all).toContain("this set holds 23 questions, not the whole paper");
    expect(all).toContain("23 PYQ-pattern questions modelled on the 2024 paper free");
    expect(all).not.toMatch(/of the paper's \d+|real paper's length|which had \d+|paper had \d+/);
    expect(all).toContain("not the original questions");
    expect(findForbiddenPhrases(all, "pyq-faq")).toEqual([]);
  });

  it("the shown-questions line states the set's own count, no paper length", () => {
    expect(pyqTextShownLine(10, 23)).toBe(
      "Showing 10 of the 23 PYQ-pattern questions in this set — freshly worded in that year's pattern, not the original questions. Answers and solutions open under each question.",
    );
    expect(pyqTextShownLine(1, 1)).toContain("Showing 1 of the 1 PYQ-pattern question in this set —");
    expect(pyqModelledEn(1, 2025)).toBe("1 PYQ-pattern question modelled on the 2025 paper");
    const page = fs.readFileSync(path.join(process.cwd(), "src/app/exams/[code]/pyq/[year]/page.tsx"), "utf8");
    expect(page).toContain("{pyqTextShownLine(textQuestions.length, questions.length)}");
    expect(page).toContain("modelledEn: pyqModelledEn(questions.length, yearNum),");
    expect(PYQ_TEXT_QUESTIONS).toBe(10);
  });

  it("options as stored, a malformed row tolerated", () => {
    expect(pyqOptions([{ key: "A", text: "12" }, { key: "B", text: " 15 " }, { key: "", text: "x" }, null])).toEqual([
      { key: "A", text: "12" },
      { key: "B", text: "15" },
    ]);
    expect(pyqOptions("nope")).toEqual([]);
  });

  it("wiring: English body only; answers folded; /mocks link nofollow; official papers before the questions", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "src/app/exams/[code]/pyq/[year]/page.tsx"), "utf8");
    expect(page).toContain('const englishBody = lc === "en";');
    expect(page).toContain("questions.slice(0, PYQ_TEXT_QUESTIONS)");
    expect(page).toMatch(/<details className="mt-2 text-sm">\s*<summary[^>]*>Answer and solution<\/summary>/);
    expect(page).toContain('<Link href={`/mocks/${mock.id}`} rel="nofollow"');
    expect(page.lastIndexOf("<OfficialYearPapers")).toBeLessThan(page.indexOf('id="questions"'));
  });
});
