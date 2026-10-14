// Exam info researched on Surge's server (14 Oct 2026): fail closed — an "official" date stays
// only when its cited page was opened and prints that date; a news item only when its page was opened.
// Run: npx vitest run tests/unit/exam-info-local.test.ts

import { describe, expect, it } from "vitest";
import { checkAgainstPages, dateOnPage } from "@/lib/ai/exam-info";
import { normUrl } from "@/lib/ai/local-research";

describe("dateOnPage", () => {
  it("finds the forms Indian notices print dates in", () => {
    for (const page of ["Exam on 12-10-2026 (Sunday)", "12.10.2026", "12/10/26", "2026-10-12", "12 October 2026", "12th Oct. 2026", "October 12, 2026", "12th of October, 2026"]) {
      expect(dateOnPage("2026-10-12", page), page).toBe(true);
    }
  });
  it("does not match a different day, month or year", () => {
    for (const page of ["112-10-2026", "12-11-2026", "12 October 2025", "2 October 2026", "October 120, 2026", "12 Octxber 2026"]) {
      expect(dateOnPage("2026-10-12", page), page).toBe(false);
    }
  });
});

describe("checkAgainstPages", () => {
  const notice = "https://ssc.gov.in/notice.pdf";
  const r = { opened: new Set([normUrl(notice)]), pages: new Map([[normUrl(notice), "Tier-I will be held on 12-10-2026."]]) };
  const row = (o: any) => ({ label: "x", daysFromNow: 0, isExamDay: false, notes: null, kind: "EXAM", date: "2026-10-12", confidence: "official", source: notice, ...o });
  it("keeps an official date printed on its opened page; drops one that is not, or whose page was never opened", () => {
    const out = checkAgainstPages(
      { news: [], dates: [row({}), row({ date: "2026-10-13" }), row({ source: "https://ssc.gov.in/other.pdf" }), row({ confidence: "expected", source: null, date: null })] as any },
      r,
    );
    expect(out.dates.map((d) => d.date)).toEqual(["2026-10-12", null]);
  });
  it("keeps news only from opened pages", () => {
    const out = checkAgainstPages({ news: [{ title: "a", body: "b", daysAgo: 1, source: notice }, { title: "c", body: "d", daysAgo: 1, source: "https://x.in/y" }], dates: [] }, r);
    expect(out.news.map((n) => n.title)).toEqual(["a"]);
  });
});
