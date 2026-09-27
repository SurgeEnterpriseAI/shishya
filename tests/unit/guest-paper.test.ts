import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  guestPaperStoreKey,
  isGuestPaperMock,
  readGuestPaperState,
  remainingSec,
  weakestFirst,
  GUEST_PAPER_MAX_AGE_MS,
} from "@/lib/guest-paper";
import { guestPaperCopy } from "@/lib/guest-paper-copy";

// 27 Sep 2026 — content first, wave 2: a guest takes a whole shared paper with
// no sign-in; nothing is written for a guest; keys only after submit.

const ROOT = path.resolve(__dirname, "../..");
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("readGuestPaperState", () => {
  const ids = ["q1", "q2", "q3"];
  const now = 1_790_000_000_000;
  it("keeps only answers to served questions and a valid index", () => {
    const raw = JSON.stringify({
      v: 1,
      startedAt: now - 60_000,
      idx: 2,
      answers: [
        { questionId: "q1", chosen: "B", timeSec: 12, marked: false },
        { questionId: "zz", chosen: "A", timeSec: 3, marked: true },
        { questionId: "q3", chosen: "  ", timeSec: -4, marked: true },
      ],
    });
    const s = readGuestPaperState(raw, ids, now);
    expect(s?.idx).toBe(2);
    expect(s?.answers).toEqual([
      { questionId: "q1", chosen: "B", timeSec: 12, marked: false },
      { questionId: "q3", chosen: null, timeSec: 0, marked: true },
    ]);
  });
  it("rejects malformed, stale and future states", () => {
    expect(readGuestPaperState(null, ids, now)).toBeNull();
    expect(readGuestPaperState("{not json", ids, now)).toBeNull();
    expect(readGuestPaperState(JSON.stringify({ v: 2, startedAt: now }), ids, now)).toBeNull();
    expect(readGuestPaperState(JSON.stringify({ v: 1, startedAt: now - GUEST_PAPER_MAX_AGE_MS - 1 }), ids, now)).toBeNull();
    expect(readGuestPaperState(JSON.stringify({ v: 1, startedAt: now + 3_600_000 }), ids, now)).toBeNull();
  });
  it("an index outside the paper resets to the first question", () => {
    expect(readGuestPaperState(JSON.stringify({ v: 1, startedAt: now, idx: 9, answers: [] }), ids, now)?.idx).toBe(0);
  });
});

describe("clock, topics, eligibility, store key", () => {
  it("remainingSec counts down and stops at zero", () => {
    expect(remainingSec(0, 10, 0)).toBe(600);
    expect(remainingSec(0, 10, 540_000)).toBe(60);
    expect(remainingSec(0, 10, 700_000)).toBe(0);
  });
  it("weakestFirst orders by share correct, then size, then name", () => {
    const out = weakestFirst([
      { name: "B", correct: 3, total: 4 },
      { name: "A", correct: 1, total: 4 },
      { name: "C", correct: 1, total: 2 },
      { name: "D", correct: 2, total: 4 },
    ]);
    expect(out.map((t) => t.name)).toEqual(["A", "D", "C", "B"]);
  });
  it("only shared, non-live mocks are guest papers", () => {
    expect(isGuestPaperMock({ userId: null, generatedBy: "system:pyq:SSC_CGL:2024" })).toBe(true);
    expect(isGuestPaperMock({ userId: null, generatedBy: null })).toBe(true);
    expect(isGuestPaperMock({ userId: null, generatedBy: "live-test" })).toBe(false);
    expect(isGuestPaperMock({ userId: "u1", generatedBy: null })).toBe(false);
  });
  it("the store key is per mock", () => {
    expect(guestPaperStoreKey("abc12345")).toBe("shishya_guest_paper:abc12345");
  });
});

describe("guestPaperCopy — en, hi and te carry the same keys and placeholders", () => {
  const en = guestPaperCopy("en");
  for (const loc of ["hi", "te"]) {
    it(loc, () => {
      const c = guestPaperCopy(loc) as unknown as Record<string, string>;
      expect(Object.keys(c).sort()).toEqual(Object.keys(en).sort());
      for (const [k, v] of Object.entries(en)) {
        const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
        expect(ph(c[k]), k).toBe(ph(v));
      }
    });
  }
  it("other locales fall back to English", () => {
    expect(guestPaperCopy("ta")).toBe(en);
  });
});

describe("guest paper — no writes, no keys before submit (source)", () => {
  const WRITE = /\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\(|\$executeRaw|recordEvent\(|ensureEnrollment\(/;
  it("the grade route and the loader write nothing", () => {
    expect(code(read("src/app/api/guest-paper/grade/route.ts"))).not.toMatch(WRITE);
    expect(code(read("src/lib/guest-paper-db.ts"))).not.toMatch(WRITE);
  });
  it("the grade route refuses bots and is rate limited", () => {
    const src = code(read("src/app/api/guest-paper/grade/route.ts"));
    expect(src).toContain('classifyClient(req.headers.get("user-agent")) === "bot"');
    expect(src).toContain('checkRateLimit("guestPaper", ip)');
    expect(src).toContain("gradeSubmission(");
  });
  it("the mock page sends the guest player no answer key or solution, and keeps live tests and bots on the gate", () => {
    const src = code(read("src/app/mocks/[id]/page.tsx"));
    const i = src.indexOf("<GuestPaperPlayer");
    expect(i).toBeGreaterThan(0);
    const block = src.slice(src.indexOf("questions={pp.questions.map", i), src.indexOf("labels={{", i));
    expect(block).not.toMatch(/answerKey|solution/);
    expect(src).toContain('guestMock.generatedBy !== "live-test" && classifyClient((await headers()).get("user-agent")) !== "bot"');
  });
  it("the player reads keys only from the grade response", () => {
    const src = code(read("src/app/mocks/[id]/GuestPaperPlayer.tsx"));
    expect(src).not.toMatch(/export interface GuestPaperQuestionView[^}]*answerKey/);
    expect(src).toContain('fetch("/api/guest-paper/grade"');
  });
});
