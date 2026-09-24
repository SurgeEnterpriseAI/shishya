// A /chat?seed=… prompt auto-sends once per tab in 30 minutes, and the seed
// param leaves the URL once used (24 Sep 2026: 204 identical re-sends in
// September from reloads / back-navigation / reopened tabs).
// Pure — no DB. Run: npx vitest run tests/unit/chat-seed-once.test.ts

import { describe, it, expect } from "vitest";
import {
  attemptSeedScope,
  markSeedFired,
  readFiredMap,
  seedFingerprint,
  SEED_ONCE_KEY,
  SEED_ONCE_MAX,
  SEED_ONCE_TTL_MS,
  stripSeedParam,
  wasSeedFiredRecently,
} from "@/lib/chat-seed-once";

function memoryStore() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    raw: m,
  };
}

const throwingStore = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
};

const SEED = "I just took a TS Police PC mock and got 8 questions wrong — review my mistakes.";
const T0 = Date.UTC(2026, 8, 24, 6, 0, 0);

describe("seedFingerprint", () => {
  it("is the same for the same seed, exam and topic, whatever the surrounding whitespace", () => {
    expect(seedFingerprint(`  ${SEED}\n`, "TS_PC", null)).toBe(seedFingerprint(SEED, "TS_PC", null));
    expect(seedFingerprint("Teach me   Percentage", "SSC_CGL", "quant.percentage")).toBe(
      seedFingerprint("Teach me Percentage", "SSC_CGL", "quant.percentage"),
    );
  });

  it("differs when the text, the exam or the topic differs", () => {
    const base = seedFingerprint(SEED, "TS_PC", null);
    expect(seedFingerprint(SEED + " Again.", "TS_PC", null)).not.toBe(base);
    expect(seedFingerprint(SEED, "SSC_GD", null)).not.toBe(base);
    expect(seedFingerprint(SEED, "TS_PC", "reasoning.series")).not.toBe(base);
    expect(seedFingerprint(SEED, null, null)).not.toBe(base);
  });

  // Review, 24 Sep 2026: results-page seeds carry no attempt id, so two
  // attempts with the same wrong count and weakest topics give the same text.
  it("differs when the student's latest attempt (scope) differs, and no scope keeps the old key", () => {
    const base = seedFingerprint(SEED, "TS_PC", null);
    expect(seedFingerprint(SEED, "TS_PC", null, null)).toBe(base);
    expect(seedFingerprint(SEED, "TS_PC", null, "")).toBe(base);
    const a1 = seedFingerprint(SEED, "TS_PC", null, "att1:1790000000000");
    expect(a1).not.toBe(base);
    expect(seedFingerprint(SEED, "TS_PC", null, "att1:1790000000000")).toBe(a1);
    expect(seedFingerprint(SEED, "TS_PC", null, "att2:1790000600000")).not.toBe(a1);
    expect(seedFingerprint(SEED, "TS_PC", null, "att1:open")).not.toBe(a1);
  });
});

describe("attemptSeedScope", () => {
  it("names the latest attempt and whether it has finished", () => {
    expect(attemptSeedScope(null)).toBeNull();
    expect(attemptSeedScope(undefined)).toBeNull();
    expect(attemptSeedScope({ id: "att1", finishedAt: null })).toBe("att1:open");
    expect(attemptSeedScope({ id: "att1", finishedAt: new Date(T0) })).toBe(`att1:${T0}`);
  });
});

describe("wasSeedFiredRecently / markSeedFired", () => {
  it("a seed fires once, then is held for 30 minutes, then fires again", () => {
    const store = memoryStore();
    const fp = seedFingerprint(SEED, "TS_PC", null);
    expect(wasSeedFiredRecently(store, fp, T0)).toBe(false);
    markSeedFired(store, fp, T0);
    expect(wasSeedFiredRecently(store, fp, T0 + 1_000)).toBe(true); // reload
    expect(wasSeedFiredRecently(store, fp, T0 + SEED_ONCE_TTL_MS - 1)).toBe(true);
    expect(wasSeedFiredRecently(store, fp, T0 + SEED_ONCE_TTL_MS)).toBe(false);
  });

  it("a different seed (a new results page, a new topic) still fires", () => {
    const store = memoryStore();
    markSeedFired(store, seedFingerprint(SEED, "TS_PC", null), T0);
    expect(wasSeedFiredRecently(store, seedFingerprint("Teach me Percentage", "TS_PC", "quant.percentage"), T0 + 5_000)).toBe(false);
    expect(wasSeedFiredRecently(store, seedFingerprint(SEED, "TS_PC", "reasoning.series"), T0 + 5_000)).toBe(false);
  });

  it("the same results-page text after another attempt still fires; with no new attempt it is held", () => {
    const store = memoryStore();
    const first = attemptSeedScope({ id: "att1", finishedAt: new Date(T0 - 60_000) });
    markSeedFired(store, seedFingerprint(SEED, "TS_PC", null, first), T0);
    // Same attempt state: a second click of the same link is held.
    expect(wasSeedFiredRecently(store, seedFingerprint(SEED, "TS_PC", null, first), T0 + 8 * 60_000)).toBe(true);
    // Retook the mock with the same count and topics: a new results page.
    const second = attemptSeedScope({ id: "att2", finishedAt: new Date(T0 + 7 * 60_000) });
    expect(wasSeedFiredRecently(store, seedFingerprint(SEED, "TS_PC", null, second), T0 + 8 * 60_000)).toBe(false);
  });

  it("prunes expired entries and keeps at most the newest SEED_ONCE_MAX", () => {
    const store = memoryStore();
    markSeedFired(store, "old", T0);
    for (let i = 0; i < SEED_ONCE_MAX + 5; i++) markSeedFired(store, `fp${i}`, T0 + SEED_ONCE_TTL_MS + i);
    const map = JSON.parse(store.raw.get(SEED_ONCE_KEY)!);
    expect(Object.keys(map)).toHaveLength(SEED_ONCE_MAX);
    expect(map.old).toBeUndefined();
    expect(map.fp0).toBeUndefined(); // oldest dropped first
    expect(map[`fp${SEED_ONCE_MAX + 4}`]).toBe(T0 + SEED_ONCE_TTL_MS + SEED_ONCE_MAX + 4);
  });

  it("never throws when storage is missing or blocked — the seed simply sends", () => {
    expect(wasSeedFiredRecently(null, "x", T0)).toBe(false);
    expect(() => markSeedFired(null, "x", T0)).not.toThrow();
    expect(wasSeedFiredRecently(throwingStore, "x", T0)).toBe(false);
    expect(() => markSeedFired(throwingStore, "x", T0)).not.toThrow();
  });
});

describe("readFiredMap", () => {
  it("drops malformed, future and expired entries", () => {
    expect(readFiredMap(null, T0)).toEqual({});
    expect(readFiredMap("not json", T0)).toEqual({});
    expect(readFiredMap("[1,2]", T0)).toEqual({});
    expect(
      readFiredMap(JSON.stringify({ a: T0 - 1_000, b: "x", c: T0 + 60_000, d: T0 - SEED_ONCE_TTL_MS }), T0),
    ).toEqual({ a: T0 - 1_000 });
  });
});

describe("stripSeedParam", () => {
  it("removes only the seed param, keeping the others and the hash", () => {
    expect(
      stripSeedParam("https://shishya.in/chat?examCode=TS_PC&seed=Review%20my%20mistakes&topicCode=reasoning.series#end"),
    ).toBe("/chat?examCode=TS_PC&topicCode=reasoning.series#end");
    expect(stripSeedParam("https://shishya.in/chat?seed=hi")).toBe("/chat");
    expect(stripSeedParam("http://localhost:3000/chat?general=1&seed=x")).toBe("/chat?general=1");
  });

  it("is null when there is no seed param or the URL is unreadable", () => {
    expect(stripSeedParam("https://shishya.in/chat?examCode=TS_PC")).toBeNull();
    expect(stripSeedParam("not a url")).toBeNull();
  });
});
