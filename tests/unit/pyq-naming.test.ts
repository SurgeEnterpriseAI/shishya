// Both names on previous-year content (src/lib/pyq-naming.ts): every PYQ
// surface carries the search phrase "previous year paper" AND the honest
// label "PYQ-pattern", and a pattern set is never presented as the paper.
import { describe, it, expect } from "vitest";
import { hubPyqPhrase, pyqYearDescription, pyqYearH1, pyqYearHeadline, SITE_PYQ_PHRASE } from "@/lib/pyq-naming";
import { findForbiddenPhrases } from "@/lib/truth-lint";

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
