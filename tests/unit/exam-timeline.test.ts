// Pure unit tests for src/lib/exam-timeline.ts — the two picks that feed
// the tracker's key-dates strip, its FAQ answers and the Telegram /dates
// reply. No DB. No network. Run with: npx vitest run tests/unit/exam-timeline.test.ts
//
// Guards the 7 Sep 2026 regression: SSC CGL's tracker answered "when is
// the result?" with a May seed row (kind NULL, RESULT guessed from the
// label "Tier 1 result announcement", 16 Sep) instead of the exam's own
// declared RESULT row (15 Dec) — a result nine days BEFORE its own exam.

import { describe, it, expect } from "vitest";
import { buildTimeline, latestOfKind, upcomingOfKind, type TimelineInput } from "@/lib/exam-timeline";

// 7 Sep 2026, 11:30 IST. Dates are midnight-UTC of the IST calendar day.
const now = new Date("2026-09-07T06:00:00Z");
const d = (iso: string) => `${iso}T00:00:00.000Z`;

const examDay: TimelineInput = {
  id: "exam",
  label: "Tier 1",
  date: d("2026-09-25"),
  isExamDay: true,
  kind: "EXAM",
  confidence: "official",
  url: "https://ssc.gov.in/tier1",
};
// The May seed: no kind column, no confidence — RESULT is inferred from
// the label, and the date is earlier than the exam it claims to report.
const seededResult: TimelineInput = {
  id: "seed",
  label: "Tier 1 result announcement",
  date: d("2026-09-16"),
  isExamDay: false,
  kind: null,
  confidence: null,
  url: null,
};
const declaredResult: TimelineInput = {
  id: "declared",
  label: "Tier 1 result",
  date: d("2026-12-15"),
  isExamDay: false,
  kind: "RESULT",
  confidence: "expected",
  url: null,
};

describe("upcomingOfKind / latestOfKind — declared kind beats inferred kind", () => {
  it("picks the declared RESULT over an earlier inferred one", () => {
    const tl = buildTimeline([examDay, seededResult, declaredResult], now);
    expect(upcomingOfKind(tl, "RESULT")?.id).toBe("declared");
    expect(latestOfKind(tl, "RESULT")?.id).toBe("declared");
    // The seeded row is still in the timeline students read as history.
    expect(tl.map((r) => r.id)).toContain("seed");
    expect(tl.find((r) => r.id === "seed")?.kindDeclared).toBe(false);
    expect(tl.find((r) => r.id === "declared")?.kindDeclared).toBe(true);
  });

  it("leaves an all-legacy exam exactly as it was", () => {
    // Every row kind NULL: the earliest upcoming inferred row still wins.
    const legacyExam: TimelineInput = { ...examDay, id: "lexam", kind: null, label: "Tier 1 exam date" };
    const laterResult: TimelineInput = { ...declaredResult, id: "lresult", kind: null, label: "Result declaration" };
    const tl = buildTimeline([legacyExam, seededResult, laterResult], now);
    expect(tl.every((r) => r.kindDeclared === false)).toBe(true);
    // seed (16 Sep) is before the only exam day (25 Sep) → still refused
    // by the outcome guard, so the next honest answer is the later row.
    expect(upcomingOfKind(tl, "RESULT")?.id).toBe("lresult");
    expect(upcomingOfKind(tl, "EXAM")?.id).toBe("lexam");
  });

  it("does not let a declared row of another kind hide legacy rows", () => {
    // ADMIT_CARD has no declared row here, so the inferred one survives.
    const admit: TimelineInput = { id: "ac", label: "Admit card", date: d("2026-09-18"), isExamDay: false, kind: null, confidence: null, url: null };
    const tl = buildTimeline([examDay, admit, declaredResult], now);
    expect(upcomingOfKind(tl, "ADMIT_CARD")?.id).toBe("ac");
  });
});

describe("outcome rows cannot precede the exam they report on", () => {
  it("never offers a still-to-come result dated before every exam day", () => {
    const tl = buildTimeline([examDay, seededResult], now);
    expect(upcomingOfKind(tl, "RESULT")).toBeNull();
    expect(latestOfKind(tl, "RESULT")).toBeNull();
    // …but the row is still listed in the timeline itself.
    expect(tl.map((r) => r.id)).toEqual(["seed", "exam"]);
  });

  it("applies to answer keys too", () => {
    const key: TimelineInput = { id: "k", label: "Answer key", date: d("2026-09-15"), isExamDay: false, kind: "ANSWER_KEY", confidence: null, url: null };
    const tl = buildTimeline([examDay, key], now);
    expect(upcomingOfKind(tl, "ANSWER_KEY")).toBeNull();
  });

  it("keeps a multi-stage result that falls before the NEXT exam", () => {
    // Tier 1 already written, Tier 1 result due 15 Dec, Tier 2 in Jan —
    // the result precedes the next upcoming exam but not the first one.
    const later = new Date("2026-11-01T06:00:00Z");
    const tier2: TimelineInput = { id: "t2", label: "Tier 2", date: d("2027-01-20"), isExamDay: true, kind: "EXAM", confidence: "expected", url: null };
    const tl = buildTimeline([examDay, declaredResult, tier2], later);
    expect(tl.find((r) => r.id === "exam")?.status).toBe("done");
    expect(upcomingOfKind(tl, "RESULT")?.id).toBe("declared");
    expect(upcomingOfKind(tl, "EXAM")?.id).toBe("t2");
  });

  it("keeps a result that has already passed (genuine history)", () => {
    const past: TimelineInput = { id: "old", label: "Result", date: d("2026-08-01"), isExamDay: false, kind: "RESULT", confidence: null, url: null };
    const tl = buildTimeline([examDay, past], now);
    expect(upcomingOfKind(tl, "RESULT")).toBeNull(); // it is done, not upcoming
    expect(latestOfKind(tl, "RESULT")?.id).toBe("old");
  });

  it("leaves outcome rows alone when no exam day is on record", () => {
    const tl = buildTimeline([seededResult], now);
    expect(upcomingOfKind(tl, "RESULT")?.id).toBe("seed");
  });
});
