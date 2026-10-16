// Hindi/Marathi tutor turns may go local only behind LOCAL_LLM_INDIC_TUTOR=1 (16 Oct 2026).
// Run: npx vitest run tests/unit/local-llm-indic-tutor.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";

const BASE = { LOCAL_LLM_URL: "https://surgeai.example.ts.net/v1", LOCAL_LLM_KEY: "k", LOCAL_LLM_FEATURES: "tutor,explain" };
async function load(extra: Record<string, string> = {}) {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const [k, v] of Object.entries({ ...BASE, ...extra })) vi.stubEnv(k, v);
  return import("../../src/lib/ai/local-llm");
}
const req = (lang: string, msg = "प्रतिशत समझाइए") => ({ system: [{ type: "text" as const, text: `Persona\nReply language: ${lang}` }], messages: [{ role: "user" as const, content: msg }], tools: [{}] });
afterEach(() => vi.unstubAllEnvs());

describe("LOCAL_LLM_INDIC_TUTOR", () => {
  it("off (default): a Hindi tutor turn stays on Claude", async () => {
    const m = await load();
    expect(m.localEligible("tutor", req("HI"), { allowTools: true })).toBe(false);
  });
  it("on: Hindi and Marathi tutor turns may go local; Tamil and other features do not", async () => {
    const m = await load({ LOCAL_LLM_INDIC_TUTOR: "1" });
    expect(m.localEligible("tutor", req("HI"), { allowTools: true })).toBe(true);
    expect(m.localEligible("tutor", req("MR"), { allowTools: true })).toBe(true);
    expect(m.localEligible("tutor", req("TA", "சதவீதம்"), { allowTools: true })).toBe(false);
    expect(m.localEligible("tutor", req("HI", "శాతం"), { allowTools: true })).toBe(false);
    expect(m.localEligible("tutor-anon", req("HI"), { allowTools: true })).toBe(false);
  });
});
