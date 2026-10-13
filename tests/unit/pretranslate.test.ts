// Night pre-translation on Surge's server (13 Oct 2026): a local translation of a
// question is stored only when it is clean — same option keys and numbers, in the
// target script, no other script or CJK characters mixed in (both models leaked
// some in the eval). The cron is off unless "pretranslate" is a local bulk feature.
// Run: npx vitest run tests/unit/pretranslate.test.ts

import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { translationProblem } from "@/lib/ai/translator";

const src = {
  body: "A train 120 m long crosses a pole in 6 seconds. What is its speed?",
  options: [{ key: "A", text: "20 m/s" }, { key: "B", text: "18 m/s" }, { key: "C", text: "72 m/s" }, { key: "D", text: "12 m/s" }],
  solution: "Speed = 120/6 = 20 m/s.",
};
const ta = (over: Partial<{ body: string; options: Array<{ key: string; text: string }>; solution: string }> = {}) => ({
  id: "q1",
  body: "120 மீ நீளமுள்ள ஒரு ரயில் ஒரு கம்பத்தை 6 வினாடிகளில் கடக்கிறது. அதன் வேகம் என்ன?",
  options: [{ key: "A", text: "20 மீ/வி" }, { key: "B", text: "18 மீ/வி" }, { key: "C", text: "72 மீ/வி" }, { key: "D", text: "12 மீ/வி" }],
  solution: "வேகம் = 120/6 = 20 மீ/வி.",
  ...over,
});

describe("translationProblem", () => {
  it("passes a clean Tamil translation", () => {
    expect(translationProblem(src, ta(), "ta")).toBeNull();
  });
  it("rejects a missing question, changed keys, changed numbers", () => {
    expect(translationProblem(src, undefined, "ta")).toBe("missing");
    expect(translationProblem(src, ta({ options: [{ key: "A", text: "20" }, { key: "B", text: "18" }, { key: "C", text: "72" }] }), "ta")).toBe("option keys changed");
    expect(translationProblem(src, ta({ body: "100 மீ நீளமுள்ள ஒரு ரயில் ஒரு கம்பத்தை 6 வினாடிகளில் கடக்கிறது." }), "ta")).toBe("numbers changed");
  });
  it("rejects CJK leaks, a mixed-in script, and text left in English", () => {
    expect(translationProblem(src, ta({ solution: "வலது从左 இருந்து 120/6 = 20" }), "ta")).toBe("foreign characters");
    expect(translationProblem(src, ta({ solution: "வேகம் कोठा 120/6 = 20" }), "ta")).toMatch(/script mixed in/);
    expect(translationProblem(src, { id: "q1", ...src }, "ta")).toBe("not in the target script");
  });
});

describe("the pretranslate cron", () => {
  const route = fs.readFileSync("src/app/api/cron/pretranslate/route.ts", "utf8");
  it("is guarded by CRON_SECRET and off unless pretranslate is a local feature", () => {
    expect(route).toContain("Bearer ${secret}");
    expect(route).toContain('localRouteFor("pretranslate"');
  });
  it("never calls Claude", () => {
    expect(route).not.toMatch(/\btranslateBatch\(|callClaude|anthropic/);
    const lib = fs.readFileSync("src/lib/pretranslate.ts", "utf8");
    expect(lib).not.toMatch(/\btranslateBatch\(|callClaude|anthropic/);
  });
  it("is scheduled at night (UTC 16-01 = IST 21:30-07:30)", () => {
    const v = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
    expect(v.crons.find((c: any) => c.path === "/api/cron/pretranslate")?.schedule).toBe("*/10 16-23,0-1 * * *");
  });
});
