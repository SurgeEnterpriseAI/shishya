// Pure unit tests for src/lib/exam-timeline.ts — the two picks that feed
// the tracker's key-dates strip, its FAQ answers and the Telegram /dates
// reply. No DB. No network. Run with: npx vitest run tests/unit/exam-timeline.test.ts
//
// Guards the 7 Sep 2026 regression: SSC CGL's tracker answered "when is
// the result?" with a May seed row (kind NULL, RESULT guessed from the
// label "Tier 1 result announcement", 16 Sep) instead of the exam's own
// declared RESULT row (15 Dec) — a result nine days BEFORE its own exam.

import { describe, it, expect } from "vitest";
import { buildTimeline, focusExamRow, latestOfKind, PASSED_ESTIMATE_TEXT, stageOf, upcomingOfKind, type TimelineInput } from "@/lib/exam-timeline";

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
    // An announced, cited key (so it survives the expected-key guard
    // below) dated before the only exam day is still not offered.
    const key: TimelineInput = { id: "k", label: "Answer key", date: d("2026-09-15"), isExamDay: false, kind: "ANSWER_KEY", confidence: "official", url: "https://ssc.gov.in/key" };
    const tl = buildTimeline([examDay, key], now);
    expect(tl.map((r) => r.id)).toContain("k");
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

// 11 Sep 2026: 40 stored ANSWER_KEY rows carried confidence "expected"
// (CDS "answer key (expected) 17 Sep" was on prod /updates and
// /score-estimate). The founder's rule — never show an expected answer-key
// date — is enforced at read time in buildTimeline, so no surface built on
// it can leak one. RESULT estimates are allowed with their tier word.
describe("expected answer-key rows never enter the timeline", () => {
  const officialKey: TimelineInput = { id: "ok", label: "Answer key", date: d("2026-09-28"), isExamDay: false, kind: "ANSWER_KEY", confidence: "official", url: "https://ssc.gov.in/key" };
  const reportedKey: TimelineInput = { id: "rk", label: "Answer key", date: d("2026-09-29"), isExamDay: false, kind: "ANSWER_KEY", confidence: "official", url: "https://testbook.com/ssc-key" };
  const expectedKey: TimelineInput = { id: "xk", label: "Answer key (expected)", date: d("2026-09-30"), isExamDay: false, kind: "ANSWER_KEY", confidence: "expected", url: null };
  const uncitedKey: TimelineInput = { id: "uk", label: "Answer key", date: d("2026-10-01"), isExamDay: false, kind: "ANSWER_KEY", confidence: "official", url: null };
  const legacyKey: TimelineInput = { id: "lk", label: "Provisional answer key release", date: d("2026-10-02"), isExamDay: false, kind: null, confidence: null, url: null };
  const expectedResult: TimelineInput = { id: "xr", label: "Result (expected)", date: d("2026-11-15"), isExamDay: false, kind: "RESULT", confidence: "expected", url: null };

  it("drops expected, uncited and legacy-inferred keys; keeps official and reported ones", () => {
    const tl = buildTimeline([examDay, officialKey, reportedKey, expectedKey, uncitedKey, legacyKey, expectedResult], now);
    expect(tl.map((r) => r.id)).toEqual(["exam", "ok", "rk", "xr"]);
    expect(tl.find((r) => r.id === "ok")?.tier).toBe("official");
    expect(tl.find((r) => r.id === "rk")?.tier).toBe("reported");
    expect(tl.every((r) => r.kind !== "ANSWER_KEY" || r.tier !== "expected")).toBe(true);
  });

  it("an exam with only an expected key answers 'not announced' (null) everywhere", () => {
    const tl = buildTimeline([examDay, expectedKey], now);
    expect(upcomingOfKind(tl, "ANSWER_KEY")).toBeNull();
    expect(latestOfKind(tl, "ANSWER_KEY")).toBeNull();
  });

  it("keeps an expected RESULT — allowed with its tier word", () => {
    const tl = buildTimeline([examDay, expectedResult], now);
    expect(upcomingOfKind(tl, "RESULT")?.id).toBe("xr");
    expect(upcomingOfKind(tl, "RESULT")?.tier).toBe("expected");
  });
});

// 11 Sep 2026 (audit judge): a PAST expected-tier row rendered as "Done".
// Nothing was announced, so nothing is known to have happened — the row is
// chronologically past (status "done", so the "still to come" filters keep
// working) but its display status is "passed-estimate", which every
// surface must render as "was expected — not confirmed".
describe("passed estimates are never 'done'", () => {
  const pastExpectedExam: TimelineInput = { id: "px", label: "Tier 1 exam (expected)", date: d("2026-09-01"), isExamDay: true, kind: "EXAM", confidence: "expected", url: null };
  const pastOfficialExam: TimelineInput = { id: "po", label: "Tier 1 exam", date: d("2026-08-20"), isExamDay: true, kind: "EXAM", confidence: "official", url: "https://ssc.gov.in/tier1" };
  const pastReported: TimelineInput = { id: "pr", label: "Admit card", date: d("2026-08-10"), isExamDay: false, kind: "ADMIT_CARD", confidence: "official", url: "https://testbook.com/ac" };
  const legacyPast: TimelineInput = { id: "lp", label: "Notification", date: d("2026-06-01"), isExamDay: false, kind: null, confidence: null, url: null };

  it("marks a past expected row as a passed estimate, not done", () => {
    const [row] = buildTimeline([pastExpectedExam], now);
    expect(row.status).toBe("done"); // chronologically past — filters rely on this
    expect(row.passedEstimate).toBe(true);
    expect(row.displayStatus).toBe("passed-estimate");
    expect(PASSED_ESTIMATE_TEXT).toBe("was expected — not confirmed");
  });

  it("announced past rows (official / reported) are genuinely done", () => {
    const tl = buildTimeline([pastOfficialExam, pastReported], now);
    expect(tl.map((r) => r.displayStatus)).toEqual(["done", "done"]);
    expect(tl.every((r) => r.passedEstimate === false)).toBe(true);
  });

  it("a legacy past row (no confidence → expected) is a passed estimate too", () => {
    const [row] = buildTimeline([legacyPast], now);
    expect(row.tier).toBe("expected");
    expect(row.displayStatus).toBe("passed-estimate");
  });

  it("today's and future expected rows keep their ordinary status", () => {
    const todayExpected: TimelineInput = { ...pastExpectedExam, id: "tx", date: d("2026-09-07") };
    const futureExpected: TimelineInput = { ...pastExpectedExam, id: "fx", date: d("2026-09-20") };
    const tl = buildTimeline([todayExpected, futureExpected], now);
    expect(tl.map((r) => r.displayStatus)).toEqual(["today", "upcoming"]);
    expect(tl.every((r) => r.passedEstimate === false)).toBe(true);
  });

  it("still counts as past for the 'what is next' picks", () => {
    const tl = buildTimeline([pastExpectedExam, examDay], now);
    expect(stageOf(tl).nextExam?.id).toBe("exam");
    expect(upcomingOfKind(tl, "EXAM")?.id).toBe("exam");
    expect(focusExamRow(tl)?.id).toBe("exam");
  });
});

// The exam-day row a "this sitting" question is about — feeds the
// marking-scheme stage check outside the ±7-day exam-week window.
describe("focusExamRow — next or just-held exam day", () => {
  const prelims: TimelineInput = { id: "pre", label: "Prelims Exam", date: d("2026-08-02"), isExamDay: true, kind: "EXAM", confidence: "official", url: "https://sbi.bank.in/pre" };
  const mainsRow: TimelineInput = { id: "mains", label: "Mains Exam", date: d("2026-09-12"), isExamDay: true, kind: "EXAM", confidence: "official", url: "https://sbi.bank.in/mains" };

  it("prefers today's / the next upcoming exam day", () => {
    const tl = buildTimeline([prelims, mainsRow, declaredResult], now); // 7 Sep
    expect(focusExamRow(tl)?.id).toBe("mains");
  });

  it("falls back to the most recently held exam day", () => {
    const later = new Date("2026-09-20T06:00:00Z");
    expect(focusExamRow(buildTimeline([prelims, mainsRow], later))?.id).toBe("mains");
    expect(focusExamRow(buildTimeline([prelims], later))?.id).toBe("pre");
  });

  it("is null when the tracker has no exam day", () => {
    expect(focusExamRow(buildTimeline([declaredResult], now))).toBeNull();
  });
});

// 13 Sep 2026: the hub Important Dates list renders raw rows, so the
// answer-key guard is exported and shared with the hub cache loader.
import { isUnannouncedAnswerKey } from "@/lib/exam-timeline";

describe("isUnannouncedAnswerKey", () => {
  const on = new Date("2026-06-02T00:00:00.000Z");
  it("flags an untyped, unsourced row whose label reads as an answer key", () => {
    expect(isUnannouncedAnswerKey({ label: "Final answer key release", isExamDay: false, kind: null, confidence: null, url: null })).toBe(true);
    // and buildTimeline drops the same row
    expect(buildTimeline([{ id: "x", label: "Final answer key release", date: on, isExamDay: false }], new Date("2026-09-13T06:00:00Z"))).toEqual([]);
  });
  it("keeps an official, cited answer key", () => {
    expect(isUnannouncedAnswerKey({ label: "Provisional answer key released", isExamDay: false, kind: "ANSWER_KEY", confidence: "official", url: "https://tgeapcet.nic.in/key.pdf" })).toBe(false);
  });
  it("never touches a result row, whatever its tier", () => {
    expect(isUnannouncedAnswerKey({ label: "Result (expected)", isExamDay: false, kind: "RESULT", confidence: "expected", url: null })).toBe(false);
  });
});
