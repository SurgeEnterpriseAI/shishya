// Pure unit tests: the daily brief written without the model (16 Sep 2026).
// Every sentence comes from a stored fact; a missing fact drops its
// sentence, and no number appears that the facts do not hold.
// Run: npx vitest run tests/unit/brief-fallback.test.ts

import { describe, it, expect } from "vitest";
import {
  briefLang,
  briefSittingName,
  buildFallbackBrief,
  rankWeakTopics,
  RULE_BRIEF_SOURCE,
  storedBriefFacts,
  type BriefFacts,
} from "@/lib/brief-fallback";

// 16 Sep 2026, 02:05 IST (the cron's run window).
const NOW = new Date("2026-09-15T20:35:00.000Z");

function facts(over: Partial<BriefFacts> = {}): BriefFacts {
  return {
    examShort: "SSC CGL",
    weakest: [
      { name: "Percentage", correctCount: 4, attemptsCount: 14 },
      { name: "Ratio", correctCount: 4, attemptsCount: 9 },
    ],
    lastScorePct: 42.5,
    // Stored as the tracker row's instant: midnight UTC of the calendar day.
    nextExam: { date: "2026-09-20T00:00:00.000Z", tier: "official", sitting: null },
    ...over,
  };
}

/** Every number printed must be one of these (the facts, or the day count). */
function numbersIn(s: string): string[] {
  return s.match(/\d+(?:\.\d+)?/g) ?? [];
}

describe("buildFallbackBrief", () => {
  it("names the weakest topic, last score, exam day with its tier, and the practice set", () => {
    const note = buildFallbackBrief(facts(), { hasMock: true, now: NOW });
    expect(note).toContain("Your weakest SSC CGL topic on record is Percentage: 4 of 14 questions right (29%).");
    expect(note).toContain("Your last SSC CGL mock: 42.5%.");
    expect(note).toMatch(/SSC CGL exam: 20 Sept? \(official\), 4 days to go\./);
    expect(note).toContain("Today: take the practice set below, then revise Percentage.");
    for (const n of numbersIn(note)) expect(["4", "14", "29", "42.5", "20"]).toContain(n);
  });

  it("without a practice set it points at the hub, never at a set below", () => {
    const note = buildFallbackBrief(facts(), { hasMock: false, now: NOW });
    expect(note).not.toContain("below");
    expect(note).toContain("Today: open the SSC CGL hub and practise Percentage.");
  });

  it("an expected date carries 'expected — not confirmed'", () => {
    const note = buildFallbackBrief(facts({ nextExam: { date: "2026-10-04T00:00:00.000Z", tier: "expected" } }), {
      hasMock: false,
      now: NOW,
    });
    expect(note).toMatch(/\(expected — not confirmed\), 18 days to go\./);
  });

  it("today and tomorrow read as words, a passed day is dropped", () => {
    expect(buildFallbackBrief(facts({ nextExam: { date: "2026-09-16T00:00:00.000Z", tier: "reported" } }), { hasMock: false, now: NOW })).toMatch(
      /SSC CGL exam: today, 16 Sept? \(reported\)\./,
    );
    expect(buildFallbackBrief(facts({ nextExam: { date: "2026-09-17T00:00:00.000Z", tier: "reported" } }), { hasMock: false, now: NOW })).toMatch(
      /SSC CGL exam: tomorrow, 17 Sept? \(reported\)\./,
    );
    const passed = buildFallbackBrief(facts({ nextExam: { date: "2026-09-10T00:00:00.000Z", tier: "official" } }), { hasMock: false, now: NOW });
    expect(passed).not.toContain("exam:");
  });

  it("missing facts drop their sentences — nothing is guessed", () => {
    const note = buildFallbackBrief(facts({ weakest: [], lastScorePct: null, nextExam: null }), { hasMock: false, now: NOW });
    expect(note).toBe(
      "No SSC CGL topic has enough answered questions on record yet to name a weak spot. Today: open the SSC CGL hub and take a short practice set.",
    );
    expect(numbersIn(note)).toEqual([]);
  });

  it("a negative stored score shows as the site does (0.0%), never a made-up figure", () => {
    const note = buildFallbackBrief(facts({ lastScorePct: -16.7 }), { hasMock: false, now: NOW });
    expect(note).toContain("Your last SSC CGL mock: 0.0%.");
  });

  it("today's coach task replaces the generic action", () => {
    const note = buildFallbackBrief(facts(), { hasMock: true, coachTask: "Daily 5 — keep the streak", now: NOW });
    expect(note).toContain("Today's coach task: Daily 5 — keep the streak.");
    expect(note).not.toContain("practice set below");
  });

  it("renders in Hindi and Telugu with the same numbers and tier words", () => {
    const hi = buildFallbackBrief(facts(), { hasMock: false, now: NOW }, "hi");
    expect(hi).toContain("Percentage");
    expect(hi).toContain("आधिकारिक");
    expect(hi).toContain("14 में से 4 सवाल सही (29%)");
    expect(hi).toContain("4 दिन बाकी");
    const te = buildFallbackBrief(facts({ nextExam: { date: "2026-10-04T00:00:00.000Z", tier: "expected" } }), { hasMock: false, now: NOW }, "te");
    expect(te).toContain("అంచనా — నిర్ధారించలేదు");
    expect(te).toContain("ఇంకా 18 రోజులు");
    expect(briefLang("hi")).toBe("hi");
    expect(briefLang("mr")).toBe("en");
  });
});

describe("weak topics: the running record, never the last set's masteryScore", () => {
  it("ranks by share right on record, firmer record first on a tie; bad rows dropped", () => {
    const ranked = rankWeakTopics([
      { name: "A", correctCount: 12, attemptsCount: 22, code: "a" },
      { name: "B", correctCount: 10, attemptsCount: 24, code: "b" },
      { name: "C", correctCount: 1, attemptsCount: 2, code: "c" },
      { name: "D", correctCount: 2, attemptsCount: 4, code: "d" },
      { name: "E", correctCount: 5, attemptsCount: 0, code: "e" },
      { name: "F", correctCount: 3, attemptsCount: 2, code: "f" },
    ]);
    expect(ranked.map((r) => r.code)).toEqual(["b", "d", "c", "a"]);
  });

  it("a 12-of-22 record reads 12 of 22 (55%), whatever the last set scored", () => {
    const note = buildFallbackBrief(
      facts({ weakest: [{ name: "Percentage", correctCount: 12, attemptsCount: 22 }], lastScorePct: null, nextExam: null }),
      { hasMock: false, now: NOW },
    );
    expect(note).toContain("Percentage: 12 of 22 questions right (55%).");
    expect(note).not.toMatch(/mastery|after d+ questions/);
  });
});

describe("next exam day: its own stage", () => {
  const ibps = { code: "IBPS_PO", name: "IBPS Probationary Officer (Prelims)", shortName: "IBPS PO" };
  const upsc = { code: "UPSC_PRELIMS", name: "UPSC Civil Services Examination — Prelims", shortName: "UPSC Prelims" };

  it("names the sitting when the row is another stage than the exam's record", () => {
    expect(briefSittingName(ibps, "Mains exam")).toBe("IBPS PO Mains");
    expect(briefSittingName(upsc, "Mains exam begins")).toBe("UPSC Mains");
    expect(briefSittingName(ibps, "Prelims exam - Day 1")).toBeNull();
    expect(briefSittingName(ibps, "Exam day")).toBeNull();
    expect(briefSittingName({ code: "SSC_GD", name: "SSC GD Constable", shortName: "SSC GD" }, "Mains exam")).toBeNull();
  });

  it("the date sentence carries the sitting name; the rest keeps the exam's", () => {
    const note = buildFallbackBrief(
      facts({ examShort: "IBPS PO", nextExam: { date: "2026-10-04T00:00:00.000Z", tier: "reported", sitting: "IBPS PO Mains" } }),
      { hasMock: false, now: NOW },
    );
    expect(note).toContain("IBPS PO Mains exam: 4 Oct (reported), 18 days to go.");
    expect(note).toContain("Your weakest IBPS PO topic on record is Percentage");
    expect(note).not.toMatch(/IBPS PO exam:/);
  });
});

describe("storedBriefFacts", () => {
  it("reads back only rule briefs with a valid shape", () => {
    const f = facts();
    expect(storedBriefFacts({ source: RULE_BRIEF_SOURCE, facts: JSON.parse(JSON.stringify(f)) })).toEqual(f);
    const staged = facts({ nextExam: { date: "2026-10-04T00:00:00.000Z", tier: "reported", sitting: "IBPS PO Mains" } });
    expect(storedBriefFacts({ source: RULE_BRIEF_SOURCE, facts: JSON.parse(JSON.stringify(staged)) })).toEqual(staged);
    // A brief stored before the running-record fix (masteryScore, no correctCount) names no topic.
    expect(
      storedBriefFacts({ source: RULE_BRIEF_SOURCE, facts: { examShort: "X", weakest: [{ name: "P", masteryScore: 0, attemptsCount: 22 }] } })?.weakest,
    ).toEqual([]);
    expect(storedBriefFacts({ source: "ai", facts: f })).toBeNull();
    expect(storedBriefFacts({ weakest: ["x"], scores: [40] })).toBeNull();
    expect(storedBriefFacts(null)).toBeNull();
    expect(storedBriefFacts({ source: RULE_BRIEF_SOURCE, facts: { examShort: "" , weakest: [] } })).toBeNull();
    expect(
      storedBriefFacts({ source: RULE_BRIEF_SOURCE, facts: { examShort: "X", weakest: [], nextExam: { date: "d", tier: "maybe" } } })?.nextExam,
    ).toBeNull();
  });
});
