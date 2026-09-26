// The exam-day pages' index rule = the sitemap's inclusion rule (26 Sep 2026).
//
// 27 Sep 2026 (integration): the pages no longer call these helpers. G1 moved
// /live, /reactions and /score-estimate (and /checklist) to ONE rule that the
// pages and the sitemap both read — src/lib/exam-week-gates.ts
// (examPageIndexGates / examPageRobots, Google-only noindex out of window),
// pinned by tests/unit/exam-week-gates.test.ts, which also asserts no page
// imports this module. The source-pin block ("the three pages use the shared
// rule") was removed with it; the helper tests below stay until the module is
// deleted.

import { describe, it, expect } from "vitest";
import {
  SCORE_ESTIMATE_EXAM_DAY_WINDOW_DAYS,
  examDayRobots,
  isPhasePageIndexable,
  isScoreEstimateIndexable,
  typedExamDays,
} from "@/lib/exam-phase-indexable";

const now = new Date("2026-09-26T06:00:00Z");
const DAY = 86_400_000;
const at = (days: number) => new Date(now.getTime() + days * DAY);

describe("isScoreEstimateIndexable", () => {
  it("indexable within ±30 days of a typed exam day, inclusive", () => {
    expect(SCORE_ESTIMATE_EXAM_DAY_WINDOW_DAYS).toBe(30);
    for (const d of [-30, -1, 0, 1, 30]) {
      expect(isScoreEstimateIndexable({ examDays: [at(d)], answerKeyOpen: false, now }), `day ${d}`).toBe(true);
    }
    for (const d of [-31, 31, 77]) {
      expect(isScoreEstimateIndexable({ examDays: [at(d)], answerKeyOpen: false, now }), `day ${d}`).toBe(false);
    }
  });

  it("CTET on 12 Dec with no answer key out (the 26 Sep 2026 crawl case) is noindex", () => {
    expect(isScoreEstimateIndexable({ examDays: ["2026-12-12T00:00:00.000Z"], answerKeyOpen: false, now })).toBe(false);
  });

  it("an open answer-key comparison keeps it indexable weeks after the exam", () => {
    expect(isScoreEstimateIndexable({ examDays: [at(-40)], answerKeyOpen: true, now })).toBe(true);
    expect(isScoreEstimateIndexable({ examDays: [], answerKeyOpen: true, now })).toBe(true);
  });

  it("no exam day and no answer key: noindex; a bad date never counts", () => {
    expect(isScoreEstimateIndexable({ examDays: [], answerKeyOpen: false, now })).toBe(false);
    expect(isScoreEstimateIndexable({ examDays: ["not a date"], answerKeyOpen: false, now })).toBe(false);
  });

  it("typedExamDays keeps kind 'EXAM' rows only (untyped legacy rows never count)", () => {
    const rows = [
      { kind: "EXAM", date: "2026-10-01T00:00:00.000Z" },
      { kind: null, date: "2026-10-02T00:00:00.000Z" },
      { kind: "RESULT", date: "2026-10-03T00:00:00.000Z" },
      { date: "2026-10-04T00:00:00.000Z" },
    ];
    expect(typedExamDays(rows)).toEqual(["2026-10-01T00:00:00.000Z"]);
  });
});

describe("isPhasePageIndexable (/live, /reactions)", () => {
  it("an active article or exam week makes it indexable; neither does not", () => {
    expect(isPhasePageIndexable({ hasActiveArticle: true, inExamWeek: false })).toBe(true);
    expect(isPhasePageIndexable({ hasActiveArticle: false, inExamWeek: true })).toBe(true);
    expect(isPhasePageIndexable({ hasActiveArticle: false, inExamWeek: false })).toBe(false);
  });
});

describe("examDayRobots", () => {
  it("noindex,follow out of season; the site default in season", () => {
    expect(examDayRobots(false)).toEqual({ index: false, follow: true });
    expect(examDayRobots(true)).toBeUndefined();
  });
});
