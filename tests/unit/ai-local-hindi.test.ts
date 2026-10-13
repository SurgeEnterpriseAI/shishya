// Hindi readers on Surge's server (13 Oct 2026): a feature in LOCAL_LLM_HINDI_FEATURES
// may go local for a Hindi reply; every other Indian language stays on Claude, and a
// local explanation that is not in Devanagari goes to Claude.
// Run: npx vitest run tests/unit/ai-local-hindi.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";

const sys = (text: string) => [{ type: "text" as const, text }];
const user = (content: string) => [{ role: "user" as const, content }];
const ENV = { LOCAL_LLM_URL: "https://surgeai.example.ts.net/v1/", LOCAL_LLM_KEY: "k", LOCAL_LLM_FEATURES: "explain" };

async function load(env: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import("../../src/lib/ai/local-llm");
}

beforeEach(() => vi.unstubAllEnvs());

describe("Hindi replies on the local route", () => {
  const hindiQ = { system: sys("Persona"), messages: user("'महा + औषधि' में संधि करने पर कौन-सा शब्द बनेगा?\nReply language: hi") };
  const englishQForHindi = { system: sys("Persona"), messages: user("Which Indus site is in Gujarat?\nReply language: hi") };
  const marathi = { system: sys("Persona"), messages: user("सत्यशोधक समाजाची स्थापना कोणी केली?\nReply language: mr") };
  const telugu = { system: sys("Persona"), messages: user("ఆర్టికల్ 21 అంటే ఏమిటి?\nReply language: hi") };

  it("stays on Claude without LOCAL_LLM_HINDI_FEATURES", async () => {
    const m = await load(ENV);
    expect(m.localEligible("explain", hindiQ)).toBe(false);
  });
  it("goes local for a Hindi reply of a listed feature only", async () => {
    const m = await load({ ...ENV, LOCAL_LLM_HINDI_FEATURES: "explain" });
    expect(m.localEligible("explain", hindiQ)).toBe(true);
    expect(m.localEligible("explain", englishQForHindi)).toBe(true);
    expect(m.localEligible("explain", marathi)).toBe(false);
    expect(m.localEligible("explain", telugu)).toBe(false);
    expect(m.localEligible("tutor-anon", hindiQ)).toBe(false);
  });
  it("measures how much of a reply is Devanagari", async () => {
    const m = await load(ENV);
    expect(m.devanagariShare("महा + औषधि = महौषधि (वृद्धि संधि)")).toBeGreaterThan(0.9);
    expect(m.devanagariShare("Maha + aushadhi = mahaushadhi")).toBe(0);
  });
});

describe("explainLocalCheck for a Hindi reader", () => {
  it("rejects a local explanation in English or romanised Hindi, accepts Devanagari", async () => {
    vi.resetModules();
    const { explainLocalCheck } = await import("../../src/lib/ai/explainer");
    const json = (steps: string[]) => JSON.stringify({ keyDisputed: false, keyDisputeReason: null, stepByStep: steps, whyChosenIsWrong: null, similarConcepts: [], practiceTopicCode: null });
    expect(explainLocalCheck(json(["Bhagat Singh ko 23 March 1931 ko phansi di gayi thi."]), "hi")).toBe("not in Hindi");
    expect(explainLocalCheck(json(["Dholavira is in Gujarat."]), "hi")).toBe("not in Hindi");
    expect(explainLocalCheck(json(["धोलावीरा गुजरात के कच्छ ज़िले में है।"]), "hi")).toBeNull();
    expect(explainLocalCheck(json(["Dholavira is in Gujarat."]), "EN")).toBeNull();
  });
});
