// Copy for /live and /reactions names only what the page renders
// (src/lib/phase-article-copy.ts with an ExamNightSummary). No DB.
// Run with: npx vitest run tests/unit/exam-night-facts-copy.test.ts

import { describe, it, expect } from "vitest";
import { examDayClaim, phaseArticleCopy, phaseArticleMeta, type ExamNightSummary } from "@/lib/phase-article-copy";

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

const NOTHING: ExamNightSummary = {
  poll: false,
  tally: false,
  keyStatus: false,
  questionPaper: false,
  cutoffEstimate: false,
  estimator: false,
  pyq: false,
  nextStage: false,
  article: false,
};

const EVERYTHING: ExamNightSummary = {
  poll: true,
  tally: true,
  keyStatus: true,
  questionPaper: true,
  cutoffEstimate: true,
  estimator: true,
  pyq: true,
  nextStage: true,
  article: true,
};

describe("exam-night copy — nothing the page does not render", () => {
  const tonight = examDayClaim([row("a", "2026-09-13")], null, new Date("2026-09-13T13:00:00Z")); // 18:30 IST

  it("key status only: no poll, cutoff, analysis or discussion claims", () => {
    const sm = { ...NOTHING, keyStatus: true };
    const copy = phaseArticleCopy("LIVE", "SSC CGL", tonight, sm);
    const meta = phaseArticleMeta("LIVE", exam, tonight, sm);
    for (const text of [copy.tagline, copy.fallbackTitle, meta.title, meta.description, meta.ogDescription]) {
      expect(text).not.toMatch(/rate the paper|shift-wise|shift-by-shift|analysis|discussion|cutoff|verdict/i);
    }
    expect(copy.tagline).toContain("answer-key and result status from the tracker");
    expect(meta.title).toContain("answer key status");
    expect(copy.tagline).toMatch(/is happening today/);
  });

  it("poll + article: each named", () => {
    const sm = { ...NOTHING, poll: true, keyStatus: true, article: true };
    const copy = phaseArticleCopy("LIVE", "SSC CGL", tonight, sm);
    expect(copy.tagline).toContain("rate the paper in one tap");
    expect(copy.tagline).toContain("public student discussion");
    expect(phaseArticleMeta("LIVE", exam, tonight, sm).title).toMatch(/rate the paper's difficulty, answer key status, shift-wise analysis/);
  });

  it("with every flag on, no copy names a declared / official / last cutoff; the estimate link says not official", () => {
    for (const phase of ["LIVE", "REACTIONS"] as const) {
      const copy = phaseArticleCopy(phase, "SSC CGL", tonight, EVERYTHING);
      const meta = phaseArticleMeta(phase, exam, tonight, EVERYTHING);
      for (const text of [copy.tagline, copy.fallbackTitle, copy.emptyBody, meta.title, meta.description, meta.ogTitle, meta.ogDescription]) {
        expect(text).not.toMatch(/declared cutoff|official cutoff|last cutoff|last (official )?cut-?off/i);
      }
      expect(copy.tagline).toContain("indicative cutoff estimate (not official)");
    }
  });

  it("reactions without poll or article: no 'student verdict', no 'expected cutoff', no 'reactions' badge", () => {
    const sm = { ...NOTHING, keyStatus: true };
    const held = examDayClaim([row("a", "2026-09-10")], null, new Date("2026-09-12T04:00:00Z"));
    const copy = phaseArticleCopy("REACTIONS", "SSC CGL", held, sm);
    const meta = phaseArticleMeta("REACTIONS", exam, held, sm);
    expect(copy.badge).not.toMatch(/reactions/i);
    expect(meta.title).not.toMatch(/student verdict|expected cutoff/);
    expect(copy.tagline).toMatch(/has been held/);
  });

  it("an expected-tier day is never 'today' / 'held'; a passed estimate says so", () => {
    const expToday = examDayClaim([row("a", "2026-09-13", "expected", null)], null, new Date("2026-09-13T14:00:00Z"));
    const sm = { ...NOTHING, keyStatus: true };
    expect(phaseArticleMeta("LIVE", exam, expToday, sm).title).not.toMatch(/today/);
    expect(phaseArticleCopy("LIVE", "SSC CGL", expToday, sm).tagline).toContain("(expected)");

    const passed = examDayClaim([row("a", "2026-09-08", "expected", null)], null, new Date("2026-09-13T04:00:00Z"));
    expect(passed.dated).toMatch(/^8 Sept? \(was expected — not confirmed\)$/);
    const copy = phaseArticleCopy("REACTIONS", "SSC CGL", passed, sm);
    expect(copy.tagline).toContain("was expected — not confirmed");
    expect(copy.tagline).not.toMatch(/has been held/);
  });

  it("last cycle's sitting carries its year in the tagline and the <title>", () => {
    const stale = examDayClaim([row("a", "2025-09-14")], null, new Date("2026-09-13T04:00:00Z"));
    expect(stale.dated).toMatch(/^14 Sept? 2025 \(official\)$/);
    const sm = { ...NOTHING, keyStatus: true };
    expect(phaseArticleCopy("LIVE", "SSC CGL", stale, sm).tagline).toMatch(/14 Sept? 2025 \(official\)/);
    expect(phaseArticleMeta("LIVE", exam, stale, sm).title).toMatch(/14 Sept? 2025 \(official\)/);
    expect(phaseArticleMeta("REACTIONS", exam, stale, sm).title).toMatch(/14 Sept? 2025 \(official\)/);
  });

  it("no summary → the older copy is unchanged (checklist and legacy callers)", () => {
    expect(phaseArticleCopy("LIVE", "SSC CGL", tonight).tagline).toMatch(/compiled from public student discussion/);
    expect(phaseArticleMeta("CHECKLIST", exam, tonight).ogDescription).not.toMatch(/verified/);
  });
});
