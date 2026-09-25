// Topic-fill fixes (25 Sep 2026) — pure logic. No DB, no network.
//   1. Availability: what a builder selection really holds at a difficulty,
//      which sizes it can fill, "All N".
//   2. Titles from the actual size: no "25Q" over 3 questions.
//   3. Seen = ANSWERED: never-shown → shown-but-unanswered → answered.
// Run: npx vitest run tests/unit/topic-fill.test.ts

import { describe, it, expect, vi } from "vitest";

// answered-questions.ts is server code; only its pure row mapper is tested.
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

import {
  MIN_MOCK_QUESTIONS,
  availableFor,
  effectiveSize,
  instructionScore,
  largestFittingSize,
  levelMix,
  levelNote,
  questionsLabel,
  rankByInstruction,
  shortfallLine,
  sizeChoices,
  stripCountClaims,
  sumCounts,
  titleWithCount,
  warmupReplyWithSize,
} from "@/lib/mock-fill";
import {
  answeredBankLine,
  asSeenHistory,
  countRepeats,
  partitionBySeen,
  pickTiered,
  pickWithSeenExclusion,
  seenSummary,
  shapeCandidates,
  type SeenHistory,
  type SeenMap,
} from "@/lib/question-pick";
import { historyFromRows } from "@/lib/answered-questions";
import { builderFillCopy } from "@/lib/builder-fill-copy";

function q(n: number) {
  return { id: `q${n}` };
}
function pool(n: number) {
  return Array.from({ length: n }, (_, i) => q(i + 1));
}
function map(entries: Record<string, number>): SeenMap {
  return new Map(Object.entries(entries));
}
function history(answered: Record<string, number>, shown: Record<string, number>): SeenHistory {
  return { answered: map(answered), shown: map(shown) };
}
function seeded(seed = 1) {
  let s = seed;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}

// ── 1. Availability ────────────────────────────────────────────────────

describe("availableFor — mirrors the API's difficulty rule", () => {
  const c = { EASY: 4, MEDIUM: 5, HARD: 2 };

  it("MIXED draws on every difficulty", () => {
    expect(availableFor(c, "MIXED")).toEqual({ total: 11, strict: 11, fallback: 0 });
  });

  it("EASY = easy first, MEDIUM when easy runs out; HARD questions never count", () => {
    expect(availableFor(c, "EASY")).toEqual({ total: 9, strict: 4, fallback: 5 });
  });

  it("HARD = hard first, MEDIUM when hard runs out; EASY questions never count", () => {
    expect(availableFor(c, "HARD")).toEqual({ total: 7, strict: 2, fallback: 5 });
  });

  it("sums per-topic counts for a selection", () => {
    // SBI Clerk-shaped topics: Arithmetic 12 (5/5/2) + Number Series 11 (5/5/1)
    const sel = sumCounts([
      { EASY: 5, MEDIUM: 5, HARD: 2 },
      { EASY: 5, MEDIUM: 5, HARD: 1 },
    ]);
    expect(sel).toEqual({ EASY: 10, MEDIUM: 10, HARD: 3 });
    expect(availableFor(sel, "MIXED").total).toBe(23);
    expect(availableFor(sel, "HARD").total).toBe(13);
    expect(sumCounts([])).toEqual({ EASY: 0, MEDIUM: 0, HARD: 0 });
  });
});

describe("levelMix — the Easy / Hard note states bounds the API always keeps", () => {
  // The reviewer's case: E20 / M35 / H4, Hard, 25.
  const c = { EASY: 20, MEDIUM: 35, HARD: 4 };
  const none = { EASY: 0, MEDIUM: 0, HARD: 0 };
  const fill = (t: string, v: Record<string, number>) => t.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m));

  it("medium = the set's share, not every MEDIUM question in the selection", () => {
    const m = levelMix(c, none, "HARD", 25)!;
    expect(m).toEqual({ size: 25, strictTotal: 4, strictAnswered: 0, maxStrict: 4, minMedium: 21, answeredFirst: false });
    expect(levelNote(m)).toBe("short");
    const F = builderFillCopy("en");
    expect(fill(F.fallbackHard, { strict: m.maxStrict, medium: m.minMedium, size: m.size })).toBe(
      "Hard: this selection has only 4 hard questions, so at least 21 of these 25 will be medium.",
    );
  });

  it("answered hard questions go after unanswered medium ones: 4 answered → all 25 medium", () => {
    const m = levelMix(c, { EASY: 0, MEDIUM: 0, HARD: 4 }, "HARD", 25)!;
    expect(m).toMatchObject({ maxStrict: 0, minMedium: 25, strictAnswered: 4, answeredFirst: true });
    expect(levelNote(m)).toBe("answeredNone");
  });

  it("some hard answered: only the unanswered ones can go in while unanswered medium remain", () => {
    const m = levelMix(c, { EASY: 0, MEDIUM: 0, HARD: 2 }, "HARD", 25)!;
    expect(m).toMatchObject({ maxStrict: 2, minMedium: 23, answeredFirst: true });
    expect(levelNote(m)).toBe("answered");
  });

  it("answered hard questions come back once every unanswered one is in (oldest first)", () => {
    // H30 all answered, M20 never answered, 25 → 20 medium + 5 answered hard.
    const m = levelMix({ EASY: 0, MEDIUM: 20, HARD: 30 }, { EASY: 0, MEDIUM: 0, HARD: 30 }, "HARD", 25)!;
    expect(m).toMatchObject({ maxStrict: 5, minMedium: 20, answeredFirst: true });
    // Answered MEDIUM ones go after answered hard ones.
    const m2 = levelMix({ EASY: 0, MEDIUM: 20, HARD: 30 }, { EASY: 0, MEDIUM: 20, HARD: 30 }, "HARD", 25);
    expect(m2).toBeNull();
  });

  it("no note when the chosen level fills the set with questions not yet answered", () => {
    expect(levelMix({ EASY: 30, MEDIUM: 20, HARD: 0 }, none, "EASY", 25)).toBeNull();
    expect(levelMix({ EASY: 30, MEDIUM: 20, HARD: 0 }, { EASY: 5, MEDIUM: 0, HARD: 0 }, "EASY", 25)).toBeNull();
    expect(levelMix(c, none, "MIXED", 25)).toBeNull();
  });

  it("no questions at the chosen level: all medium (UKSSSC Culture-shaped, H0)", () => {
    const m = levelMix({ EASY: 2, MEDIUM: 4, HARD: 0 }, null, "HARD", 4)!;
    expect(m).toMatchObject({ size: 4, maxStrict: 0, minMedium: 4, answeredFirst: false });
    expect(levelNote(m)).toBe("none");
  });

  it("answered counts not measured → bank-only bounds (still true: never more hard than the bank holds)", () => {
    const m = levelMix(c, null, "HARD", 25)!;
    expect(m).toMatchObject({ maxStrict: 4, minMedium: 21, strictAnswered: 0, answeredFirst: false });
  });

  it("size is capped at what the selection holds", () => {
    expect(levelMix({ EASY: 0, MEDIUM: 3, HARD: 2 }, none, "HARD", 25)).toMatchObject({ size: 5, maxStrict: 2, minMedium: 3 });
  });
});

describe("sizeChoices / effectiveSize — never offer a size the selection cannot fill", () => {
  it("18 available: 10 fits, 25 and 50 do not, and All 18 is offered", () => {
    expect(sizeChoices(18)).toEqual([
      { pick: 10, size: 10, fits: true },
      { pick: 25, size: 25, fits: false },
      { pick: 50, size: 50, fits: false },
      { pick: "all", size: 18, fits: true },
    ]);
  });

  it("no All chip when the count is already a size, or at 50+", () => {
    expect(sizeChoices(25).some((c) => c.pick === "all")).toBe(false);
    expect(sizeChoices(50).every((c) => c.fits)).toBe(true);
    expect(sizeChoices(120).some((c) => c.pick === "all")).toBe(false);
  });

  it("under the 5-question minimum nothing fits and no All chip", () => {
    expect(sizeChoices(MIN_MOCK_QUESTIONS - 1).some((c) => c.fits)).toBe(false);
    expect(sizeChoices(MIN_MOCK_QUESTIONS).find((c) => c.pick === "all")).toEqual({ pick: "all", size: 5, fits: true });
  });

  it("the set holds min(pick, available); All = every available up to 50", () => {
    expect(effectiveSize(25, 18)).toBe(18);
    expect(effectiveSize(25, 40)).toBe(25);
    expect(effectiveSize("all", 18)).toBe(18);
    expect(effectiveSize("all", 300)).toBe(50);
    expect(effectiveSize(10, 0)).toBe(0);
  });

  it("largestFittingSize", () => {
    expect(largestFittingSize(9)).toBeNull();
    expect(largestFittingSize(18)).toBe(10);
    expect(largestFittingSize(49)).toBe(25);
    expect(largestFittingSize(50)).toBe(50);
  });
});

// ── 2. Title from the actual size ──────────────────────────────────────

describe("titles never claim more questions than the mock holds", () => {
  it("the builder title carries the number picked, not the number asked", () => {
    expect(titleWithCount("SBI Clerk — Custom: Arithmetic, Number Series", 18)).toBe(
      "SBI Clerk — Custom: Arithmetic, Number Series · 18 questions",
    );
    expect(titleWithCount("UKSSSC — Custom: Rivers of Uttarakhand", 1)).toBe("UKSSSC — Custom: Rivers of Uttarakhand · 1 question");
  });

  it("strips model-written count claims (the '25Q' title over 3 questions)", () => {
    expect(titleWithCount("Polity Mock (25Q)", 3)).toBe("Polity Mock · 3 questions");
    expect(stripCountClaims("25-Question Mock on Percentage")).toBe("Mock on Percentage");
    expect(stripCountClaims("Mock Test - 25 Questions")).toBe("Mock Test");
    expect(stripCountClaims("Quick 10 Q Practice: Ratio")).toBe("Quick Practice: Ratio");
    expect(stripCountClaims("Polity — 50 MCQs")).toBe("Polity");
    expect(stripCountClaims("भारतीय राजव्यवस्था 25 प्रश्न")).toBe("भारतीय राजव्यवस्था");
    expect(stripCountClaims("25 ప్రశ్నలు పాలిటీ")).toBe("పాలిటీ");
  });

  it("leaves years and topic names alone", () => {
    expect(stripCountClaims("SSC CGL 2024 Questions Review")).toBe("SSC CGL 2024 Questions Review");
    expect(stripCountClaims("Adaptive Mock — SBI Clerk")).toBe("Adaptive Mock — SBI Clerk");
    expect(stripCountClaims("Topic drill — quant.percentage")).toBe("Topic drill — quant.percentage");
  });

  it("falls back when only a count claim was there", () => {
    expect(titleWithCount("25Q", 3)).toBe("Custom mock · 3 questions");
    expect(titleWithCount("(25 Questions)", 7, "Custom Mock")).toBe("Custom Mock · 7 questions");
  });

  it("shortfallLine: plain words, real numbers, null when full", () => {
    expect(shortfallLine(25, 18)).toBe("Only 18 questions were available for these topics, so this mock has 18, not 25.");
    expect(shortfallLine(25, 1, "this request")).toBe("Only 1 question was available for this request, so this mock has 1, not 25.");
    expect(shortfallLine(25, 25)).toBeNull();
    expect(shortfallLine(10, 12)).toBeNull();
    expect(questionsLabel(2)).toBe("2 questions");
  });

  it("the tutor's warmup reply says when it holds fewer than 10", () => {
    const msg = "Your **3-question warmup on Samas** is ready.";
    expect(warmupReplyWithSize(msg, 10, "Samas")).toBe(msg);
    const short = warmupReplyWithSize(msg, 3, "Samas");
    expect(short.startsWith(msg)).toBe(true);
    expect(short).toContain("This warmup has 3 questions, not 10");
  });

  it("builder copy: hi and te keep exactly the English {placeholders} in every template", () => {
    const holes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    const en = builderFillCopy("en") as unknown as Record<string, string>;
    for (const loc of ["hi", "te"]) {
      const tr = builderFillCopy(loc) as unknown as Record<string, string>;
      expect(Object.keys(tr).sort()).toEqual(Object.keys(en).sort());
      for (const k of Object.keys(en)) expect([k, holes(tr[k])]).toEqual([k, holes(en[k])]);
    }
  });

  it("builder copy: every locale has the short/available templates with real placeholders", () => {
    for (const loc of ["en", "hi", "te"]) {
      const F = builderFillCopy(loc);
      expect(F.builtShort).toContain("{count}");
      expect(F.builtShort).toContain("{requested}");
      expect(F.onlyAvailable).toContain("{n}");
      expect(F.onlyAvailable).toContain("{count}");
      expect(F.tooFew).toContain("{min}");
      expect(F.answeredLine).toContain("{seen}");
      // The answered copy must not describe the old "opened" rule.
      expect(F.answeredLine.toLowerCase()).not.toContain("opened");
    }
  });
});

describe("rankByInstruction — the named topic's questions reach the model first", () => {
  const names: Record<string, string> = {
    "quant.percentage": "Percentage",
    "quant.profit-loss": "Profit and Loss",
    "reasoning.coding": "Coding-Decoding",
  };
  const text = (code: string) => names[code] ?? "";
  const qs = [
    { id: "a", topicCode: "reasoning.coding" },
    { id: "b", topicCode: "quant.profit-loss" },
    { id: "c", topicCode: "reasoning.coding" },
    { id: "d", topicCode: "quant.percentage" },
    { id: "e", topicCode: "quant.percentage" },
  ];

  it("moves matching topics first, keeps order within a score, drops nothing", () => {
    const out = rankByInstruction(qs, "Percentage ka mock test", text);
    expect(out.map((x) => x.id)).toEqual(["d", "e", "a", "b", "c"]);
    expect(out).toHaveLength(qs.length);
  });

  it("more matched words rank higher; stems match (percent ~ percentage)", () => {
    expect(instructionScore("hard questions on profit & loss", "Profit and Loss quant profit loss")).toBe(2);
    const out = rankByInstruction(qs, "profit loss and percent", text);
    expect(out.map((x) => x.id)).toEqual(["b", "d", "e", "a", "c"]);
  });

  it("no match → original order", () => {
    expect(rankByInstruction(qs, "give me a mock test", text).map((x) => x.id)).toEqual(["a", "b", "c", "d", "e"]);
  });
});

// ── 3. Seen = answered ─────────────────────────────────────────────────

describe("seen means ANSWERED — SeenHistory in the picker", () => {
  it("partition: fresh, then shown-but-unanswered (least-recently-shown first), then answered", () => {
    const h = history({ q1: 50, q2: 10 }, { q3: 40, q4: 20 });
    const { fresh, shownLrs, seenLrs, unseen } = partitionBySeen(pool(6), h);
    expect(fresh.map((x) => x.id)).toEqual(["q5", "q6"]);
    expect(shownLrs.map((x) => x.id)).toEqual(["q4", "q3"]);
    expect(seenLrs.map((x) => x.id)).toEqual(["q2", "q1"]);
    expect(unseen.map((x) => x.id)).toEqual(["q5", "q6", "q4", "q3"]);
  });

  it("an unanswered question from an abandoned mock is picked before any answered one, and is not a repeat", () => {
    // q1-q3 answered, q4-q6 only on screen (mock left at question 1), q7-q8 never shown.
    const h = history({ q1: 1, q2: 2, q3: 3 }, { q4: 30, q5: 10, q6: 20 });
    const r = pickWithSeenExclusion(pool(8), 6, h, seeded());
    const ids = r.picked.map((x) => x.id);
    expect(new Set(ids.slice(0, 2))).toEqual(new Set(["q7", "q8"]));
    expect(ids.slice(2, 5)).toEqual(["q5", "q6", "q4"]);
    expect(ids[5]).toBe("q1");
    expect(r.repeats).toBe(1);
    expect(r.reshown).toBe(3);
    expect(r.unseenAvailable).toBe(5);
  });

  it("the old flat map keeps its meaning (everything in it is seen)", () => {
    const flat = map({ q1: 1, q2: 2 });
    const r = pickWithSeenExclusion(pool(3), 3, flat, seeded());
    expect(r.picked.map((x) => x.id)).toEqual(["q3", "q1", "q2"]);
    expect(r.repeats).toBe(2);
    expect(r.reshown).toBe(0);
    expect(asSeenHistory(flat).shown.size).toBe(0);
  });

  it("tiers: never-shown of every tier, then shown of every tier, then answered", () => {
    const strict = [q(1), q(2)];
    const fallback = [q(3), q(4)];
    const h = history({ q1: 5 }, { q2: 5 });
    const r = pickTiered([strict, fallback], 4, h, seeded());
    expect(new Set(r.picked.slice(0, 2).map((x) => x.id))).toEqual(new Set(["q3", "q4"]));
    expect(r.picked.slice(2).map((x) => x.id)).toEqual(["q2", "q1"]);
    expect(r.repeats).toBe(1);
  });

  it("never the same question twice, never more than the pool", () => {
    const h = history({ q1: 1 }, { q2: 2 });
    const r = pickTiered([[...pool(3), q(1)], pool(3)], 10, h, seeded());
    expect(r.picked.map((x) => x.id).sort()).toEqual(["q1", "q2", "q3"]);
  });

  it("shapeCandidates: never-shown only when enough, else shown then answered to the floor", () => {
    const h = history({ q1: 1, q2: 2 }, { q3: 9, q4: 3 });
    expect(shapeCandidates(pool(8), h, 3).map((x) => x.id)).toEqual(["q5", "q6", "q7", "q8"]);
    expect(shapeCandidates(pool(6), h, 5).map((x) => x.id)).toEqual(["q5", "q6", "q4", "q3", "q1"]);
  });

  it("bank numbers and repeats count answered questions only", () => {
    const h = history({ q1: 1, q2: 2, other: 3 }, { q3: 4, q4: 5 });
    expect(seenSummary(pool(5), h)).toEqual({ bankSize: 5, seenInBank: 2 });
    expect(countRepeats(["q1", "q3", "q4", "q5"], h)).toBe(1);
    const line = answeredBankLine({ size: 42, seen: 12, repeats: 0, windowDays: 90 });
    expect(line).toBe("You have answered 12 of the 42 validated questions in this bank in the last 90 days; this set repeats 0 of them.");
    expect(line.toLowerCase()).not.toMatch(/fresh|weekly|daily|new set/);
  });

  it("historyFromRows: a row with an answer time is answered, otherwise shown-only", () => {
    const h = historyFromRows([
      { questionId: "q1", shownAt: "2026-09-20T10:00:00Z", answeredAt: "2026-09-20T10:00:00Z" },
      { questionId: "q2", shownAt: new Date("2026-09-21T10:00:00Z"), answeredAt: null },
    ]);
    expect([...h.answered.keys()]).toEqual(["q1"]);
    expect([...h.shown.keys()]).toEqual(["q2"]);
    expect(h.shown.get("q2")).toBe(Date.parse("2026-09-21T10:00:00Z"));
  });
});
