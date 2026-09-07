// Pure unit tests for src/lib/phase-article-copy.ts — the honesty rules
// behind /live, /reactions and /checklist copy. No DB. Run with: npm test

import { describe, it, expect } from "vitest";
import { examDayClaim, phaseArticleCopy, phaseArticleMeta } from "@/lib/phase-article-copy";

const row = (id: string, day: string, confidence: string | null = "official", url: string | null = "https://ssc.gov.in/notice") => ({
  id,
  label: "Tier 1",
  date: `${day}T00:00:00.000Z`,
  isExamDay: true,
  kind: "EXAM",
  confidence,
  url,
});
const exam = { shortName: "SSC CGL", name: "SSC Combined Graduate Level" };

describe("phase-article copy honesty", () => {
  it("says 'happening today' only on an announced exam day", () => {
    const claim = examDayClaim([row("a", "2026-09-13")], null, new Date("2026-09-13T04:00:00Z"));
    expect(claim.live).toBe(true);
    expect(phaseArticleCopy("LIVE", "SSC CGL", claim).tagline).toMatch(/is happening today/);
    expect(phaseArticleCopy("LIVE", "SSC CGL", claim).badge).toMatch(/Live/);
    expect(phaseArticleMeta("LIVE", exam, claim).title).toMatch(/today/);
  });

  it("never says today / done on an expected-tier exam day", () => {
    const claim = examDayClaim([row("a", "2026-09-13", "expected", null)], null, new Date("2026-09-13T14:00:00Z"));
    expect(claim.live).toBe(false);
    expect(claim.held).toBe(false);
    expect(claim.dated).toMatch(/^13 Sept? \(expected\)$/);
    expect(phaseArticleCopy("LIVE", "SSC CGL", claim).tagline).toContain("(expected)");
    expect(phaseArticleCopy("LIVE", "SSC CGL", claim).tagline).not.toMatch(/today/);
    expect(phaseArticleCopy("REACTIONS", "SSC CGL", claim).tagline).not.toMatch(/is done/);
    expect(phaseArticleMeta("LIVE", exam, claim).title).not.toMatch(/today/);
    expect(phaseArticleMeta("LIVE", exam, claim).title).toContain("(expected)");
  });

  it("falls back to the dated paper outside exam week, and to a neutral line with no typed rows", () => {
    const later = examDayClaim([row("a", "2026-10-20")], null, new Date("2026-09-06T04:00:00Z"));
    expect(later.live).toBe(false);
    expect(later.runUp).toBe(false);
    expect(phaseArticleCopy("LIVE", "CDS", later).tagline).toMatch(/20 Oct \(official\)/);
    expect(phaseArticleCopy("REACTIONS", "CDS", later).tagline).not.toMatch(/is done/);

    const none = examDayClaim([{ ...row("b", "2026-09-06"), kind: null }], null, new Date("2026-09-06T04:00:00Z"));
    expect(none.row).toBeNull();
    expect(phaseArticleCopy("LIVE", "CDS", none).tagline).not.toMatch(/today/);
    expect(phaseArticleCopy("LIVE", "CDS", none).fallbackTitle).toBe("CDS — exam-day analysis");
  });

  it("says done after an announced paper, and dates the run-up checklist", () => {
    const post = examDayClaim([row("a", "2026-09-10")], null, new Date("2026-09-12T04:00:00Z"));
    expect(post.held).toBe(true);
    expect(phaseArticleCopy("REACTIONS", "SSC CGL", post).tagline).toMatch(/is done/);

    const eve = examDayClaim([row("a", "2026-09-13")], null, new Date("2026-09-12T04:00:00Z"));
    expect(eve.runUp).toBe(true);
    expect(phaseArticleCopy("CHECKLIST", "SSC CGL", eve).tagline).toMatch(/SSC CGL is on 13 Sept? \(official\)/);
  });
});
