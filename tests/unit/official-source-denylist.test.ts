// Source denylist (26 Sep 2026, G1 index hygiene) — src/lib/official-source.ts.
// A copycat or scraper site's "announcement" is not an announcement: the row
// classifies as tier "expected" and its link is never offered as a source.

import { describe, it, expect } from "vitest";
import {
  SOURCE_DENYLIST,
  SOURCE_DENYLIST_HOSTS,
  SOURCE_DENYLIST_SUFFIXES,
  citableSourceUrl,
  isOfficialSource,
  isUntrustedSource,
  passedEstimateLine,
  passedEstimateView,
  sourceTier,
} from "@/lib/official-source";
import { buildTimeline } from "@/lib/exam-timeline";

const DENIED = [
  // lookalike country suffixes of sarkariresult.com / sarkarijob.com (live rows on 26 Sep 2026)
  "https://sarkariresult.com.cm/ssc-cgl-2026/",
  "https://www.sarkariresult.com.cm/x",
  "https://sarkariresult.com.im/upsc",
  "https://sarkarijob.com.im/y",
  "https://sarkariresult.cm/z",
  "https://example.co.im/a",
  "https://portal.com.co/b",
  "https://site.om/c",
  // named hosts and their subdomains
  "https://gngroup.org/blog/exam-dates",
  "https://www.fastjobsearchers.com/ssc",
  "https://ukexamalert.in/uksssc",
  "https://news.aryacollegejpr.com/rpsc",
];

const TRUSTED = [
  "https://ssc.gov.in/notice.pdf",
  "https://upsc.gov.in/x",
  "https://ibps.in/crp",
  "https://sbi.bank.in/careers",
  "https://testbook.com/ssc-cgl", // a secondary source — reported, not denied
  "https://indianexpress.com/article/education/x",
  "https://www.sarkariresult.com/ssc", // the real portal is a secondary source, not a denylisted clone
  "https://cisce.org/x.pdf",
  "https://example.com/a", // ".com" is not the ".om" / ".cm" typo suffix
  "https://example.in/b",
];

describe("isUntrustedSource", () => {
  it("the denylist: named hosts (and subdomains) plus lookalike country suffixes", () => {
    expect(SOURCE_DENYLIST_HOSTS).toEqual(["gngroup.org", "fastjobsearchers.com", "ukexamalert.in", "aryacollegejpr.com"]);
    expect(SOURCE_DENYLIST_SUFFIXES).toContain("cm");
    expect(SOURCE_DENYLIST_SUFFIXES).toContain("com.im");
    expect(SOURCE_DENYLIST).toContain("*.cm");
    expect(SOURCE_DENYLIST).toContain("gngroup.org");
  });

  it.each(DENIED)("denies %s", (u) => {
    expect(isUntrustedSource(u)).toBe(true);
    expect(citableSourceUrl(u)).toBeNull();
    expect(isOfficialSource(u)).toBe(false);
    expect(isOfficialSource(u, u)).toBe(false); // not even as the exam's own portal
  });

  it.each(TRUSTED)("does not deny %s", (u) => {
    expect(isUntrustedSource(u)).toBe(false);
    expect(citableSourceUrl(u)).toBe(u);
  });

  it("a missing or unparsable URL is not 'untrusted' (it is not a citation at all)", () => {
    expect(isUntrustedSource(null)).toBe(false);
    expect(isUntrustedSource(undefined)).toBe(false);
    expect(isUntrustedSource("ai-generated:claude")).toBe(false);
    expect(citableSourceUrl(null)).toBeNull();
    expect(citableSourceUrl("ai-generated:claude")).toBeNull();
    // a host that merely contains a denied name is not denied
    expect(isUntrustedSource("https://notgngroup.org/x")).toBe(false);
    expect(isUntrustedSource("https://gngroup.org.in/x")).toBe(false);
  });
});

describe("sourceTier: a denylisted citation is an estimate", () => {
  it.each(DENIED)("confidence official + %s → expected", (u) => {
    expect(sourceTier("official", u)).toBe("expected");
    expect(sourceTier("official", u, u)).toBe("expected");
  });

  it("the tiers of trusted citations are unchanged", () => {
    expect(sourceTier("official", "https://ssc.gov.in/notice.pdf")).toBe("official");
    expect(sourceTier("official", "https://testbook.com/ssc-cgl")).toBe("reported");
    expect(sourceTier("official", "https://www.examportal.co/n", "https://examportal.co")).toBe("official");
    expect(sourceTier("expected", "https://ssc.gov.in/notice.pdf")).toBe("expected");
    expect(sourceTier("official", null)).toBe("expected");
  });

  it("the timeline: a denylisted answer key is dropped (an unannounced key is never shown), a denylisted exam day reads as an estimate", () => {
    const now = new Date("2026-09-26T06:00:00Z");
    const rows = buildTimeline(
      [
        { id: "k", kind: "ANSWER_KEY", label: "Answer key", date: "2026-09-20T00:00:00.000Z", isExamDay: false, confidence: "official", url: "https://sarkariresult.com.cm/key" },
        { id: "e", kind: "EXAM", label: "Tier 1 exam", date: "2026-10-12T00:00:00.000Z", isExamDay: true, confidence: "official", url: "https://ukexamalert.in/x" },
      ],
      now,
    );
    expect(rows.map((r) => r.id)).toEqual(["e"]);
    expect(rows[0].tier).toBe("expected");
    expect(rows[0].official).toBe(false);
  });
});

describe("a passed row cited only to a denylisted host never says 'No official date yet'", () => {
  const now = new Date("2026-09-26T06:00:00Z");
  const copied = { kind: "RESULT", tier: "expected" as const, date: "2026-09-10T00:00:00.000Z", label: "NTPC CBT 1 result", url: "https://sarkariresult.com.cm/rrb-ntpc-result" };
  it("reads 'unsure' — the claim may be a copy of a real notice", () => {
    expect(passedEstimateView(copied, [copied], now)).toBe("unsure");
    expect(passedEstimateLine("RESULT", "en", "unsure")).toBe("The expected result date has passed — check the official website");
    expect(passedEstimateView({ ...copied, kind: "OTHER" }, [], now)).toBe("unsure");
    // A caller that stripped the link says so with the flag.
    expect(passedEstimateView({ ...copied, url: null, untrustedSource: true }, [], now)).toBe("unsure");
  });
  it("an announced row of the same event still settles it; an ordinary estimate keeps the old line", () => {
    const announced = { kind: "RESULT", tier: "official" as const, date: "2026-09-12T00:00:00.000Z", label: "NTPC CBT 1 result declared", url: "https://rrb.gov.in/r.pdf" };
    expect(passedEstimateView(copied, [copied, announced], now)).toBe("omit");
    const estimate = { ...copied, url: null };
    expect(passedEstimateView(estimate, [estimate], now)).toBe("line");
    expect(passedEstimateView({ ...estimate, kind: "OTHER" }, [], now)).toBe("line");
    // Not yet passed: the date prints as before.
    expect(passedEstimateView({ ...copied, date: "2026-10-10T00:00:00.000Z" }, [], now)).toBe("date");
  });
});
