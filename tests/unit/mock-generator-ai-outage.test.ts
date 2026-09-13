// When the model is unavailable, a mock still starts (13 Sep 2026 RCA).
//
// On 11 Sep and 12-13 Sep the Anthropic credit balance hit zero. Every
// "Start mock" for a student with < 20 recorded responses (ADAPTIVE → the
// LLM picker) failed and printed the provider's own "credit balance is too
// low" text. The ADAPTIVE picker now falls back to a rule-based pick from
// the same pool; a free-form USER_REQUEST refuses with a friendly 503.
// No network, no DB: the Anthropic client is mocked to throw the SDK's
// APIError shape (status 400 + headers + error.type).
// Run: npx vitest run tests/unit/mock-generator-ai-outage.test.ts

import { describe, it, expect, vi } from "vitest";

const PROVIDER_TEXT = "Your credit balance is too low to access the Anthropic API.";

vi.mock("@/lib/ai/client", () => ({
  callClaude: vi.fn(async () => {
    throw Object.assign(new Error(PROVIDER_TEXT), {
      status: 400,
      headers: {},
      error: { type: "invalid_request_error" },
    });
  }),
  cachedSystem: (...blocks: string[]) => blocks.map((text) => ({ type: "text", text })),
  extractText: () => "",
  TOKEN_LIMITS: { generator: 1024 },
}));

import { generateMock } from "@/lib/ai/generator";
import type { GenerateMockInput, GenerateMockOutput, QuestionRef } from "@/lib/ai/types";

function pool(n: number): QuestionRef[] {
  const diffs = ["EASY", "MEDIUM", "HARD"] as const;
  return Array.from({ length: n }, (_, i) => ({
    id: `q${i}`,
    topicId: `t${i % 4}`,
    topicCode: `T${i % 4}`,
    difficulty: diffs[i % 3],
  }));
}

function input(request: GenerateMockInput["request"], n: number): GenerateMockInput {
  return {
    request,
    availableQuestions: pool(n),
    studentState: {
      userId: "u1",
      examCode: "SSC_CGL",
      examName: "SSC Combined Graduate Level",
      preferredLang: "EN",
      enrolledAt: "2026-09-01",
      weaknesses: [],
      strengths: [],
      totalMocksTaken: 3,
    } as unknown as GenerateMockInput["studentState"],
    syllabus: {
      examCode: "SSC_CGL",
      examName: "SSC Combined Graduate Level",
      examShortName: "SSC CGL",
      subjects: [{ code: "QA", name: "Quantitative Aptitude", weight: 1, topics: [{ code: "T0", name: "Number System" }] }],
    },
  };
}

describe("mock generator when the model is unavailable", () => {
  it("ADAPTIVE still returns the requested number of real pool questions", async () => {
    const out = (await generateMock(input({ type: "ADAPTIVE", questionCount: 10 }, 40))) as GenerateMockOutput & { fallback?: boolean };
    expect(out.questionIds).toHaveLength(10);
    expect(new Set(out.questionIds).size).toBe(10);
    const ids = new Set(pool(40).map((q) => q.id));
    for (const id of out.questionIds) expect(ids.has(id)).toBe(true);
    expect(out.fallback).toBe(true);
  });

  it("ADAPTIVE never invents ids when the pool is smaller than the request", async () => {
    const out = await generateMock(input({ type: "ADAPTIVE", questionCount: 10 }, 6));
    expect(out.questionIds).toHaveLength(6);
  });

  it("the fallback is labelled as a practice set, never as adaptive, and never carries provider text", async () => {
    const out = await generateMock(input({ type: "ADAPTIVE", questionCount: 5, durationMin: 12 }, 20));
    expect(out.title).toBe("Practice Mock — SSC CGL");
    expect(out.rationale.toLowerCase()).not.toContain("adaptive");
    expect(`${out.title} ${out.rationale}`).not.toContain("credit");
    expect(out.durationMin).toBe(12);
  });

  it("USER_REQUEST refuses with a friendly 503 instead of the provider error", async () => {
    await expect(
      generateMock(input({ type: "USER_REQUEST", instruction: "tough polity questions", questionCount: 10 }, 40)),
    ).rejects.toMatchObject({ status: 503, friendly: true });
    await expect(
      generateMock(input({ type: "USER_REQUEST", instruction: "tough polity questions", questionCount: 10 }, 40)),
    ).rejects.not.toThrow(/credit/);
  });

  it("rule-based paths never touch the model", async () => {
    const out = await generateMock(input({ type: "TOPIC", topicCode: "T1", questionCount: 5 }, 40));
    expect(out.questionIds).toHaveLength(5);
    expect((out as { fallback?: boolean }).fallback).toBeUndefined();
  });
});
