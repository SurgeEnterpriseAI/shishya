// Tutor honesty fixes (17 Oct 2026) — pure, no DB, no model call.
//
// 1. Practice questions on the Claude path come from the checked bank, the
//    rule the local path got on 13 Oct (aae2d02): 51 of 66 recent quiz answers
//    were to questions the tutor wrote itself, which answer-grading.ts cannot
//    mark. Signed-in: PRACTICE_FROM_BANK_RULE in the tools guide; guest:
//    SIGNIN_NUDGE; general: GENERAL_MODE_NOTE; school: the school persona.
// 2. find_questions_on_topic returns up to 10 (was 5; the tutor told a
//    student "the system allows 5").
// 3. Every language the tutor is sent is one it says it can write: a Marathi
//    ask got "I cannot give a full answer in Marathi" (13 Oct, MPSC Group C).
// Run: npx vitest run tests/unit/tutor-practice-bank.test.ts

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ pool: [] as any[] }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    exam: { findUnique: vi.fn(async () => ({ id: "e1" })) },
    topic: { findFirst: vi.fn(async () => ({ id: "t1", code: "quant.percentage", children: [] })) },
    question: { findMany: vi.fn(async () => state.pool) },
  },
}));
vi.mock("@/lib/answered-questions", () => ({ getSeenHistory: vi.fn(async () => null) }));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

import { executeTool, FIND_QUESTIONS_MAX, tutorTools } from "@/lib/ai/tools";
import { PRACTICE_FROM_BANK_RULE, tutorRequest, tutorSystemBlocks } from "@/lib/ai/tutor";
import { ANSWER_FORMAT_RULES, GENERAL_MODE_NOTE, SIGNIN_NUDGE } from "@/lib/ai/prompts";
import { SCHOOL_TUTOR_STATIC_PROMPT } from "@/lib/school/tutor-persona";
import { locales } from "@/lib/i18n";
import { langToReplyLanguage } from "@/lib/preferred-lang";

const EMPTY = { examCode: "SSC_CGL", examName: "SSC CGL", examShortName: "SSC CGL", subjects: [] };
const LOCAL_SENTENCE =
  "Any practice question you show must come from find_questions_on_topic, shown exactly as returned with its options A-D; never write your own question.";
const src = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");

const rows = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `q${i + 1}`,
    body: `body ${i + 1}`,
    options: [{ key: "A", text: "a" }, { key: "B", text: "b" }, { key: "C", text: "c" }, { key: "D", text: "d" }],
    answerKey: "A",
    solution: null,
    difficulty: "EASY",
    topic: { code: "quant.percentage", name: "Percentage" },
  }));

describe("find_questions_on_topic — up to 10 per call", () => {
  const ctx = { userId: "u1", examCode: "SSC_CGL" };
  const ids = async (input: object) => {
    const out = await executeTool(ctx, "find_questions_on_topic", { topic_code: "quant.percentage", ...input });
    expect(out.ok).toBe(true);
    return (out as { ok: true; data: { questions: { id: string }[] } }).data.questions.map((q) => q.id);
  };

  it("is 10, and a bigger ask is capped there", async () => {
    expect(FIND_QUESTIONS_MAX).toBe(10);
    state.pool = rows(30);
    expect(await ids({ limit: 20 })).toHaveLength(10);
    expect(await ids({ limit: 10 })).toHaveLength(10);
    expect(await ids({ limit: 7 })).toHaveLength(7);
    expect(await ids({})).toHaveLength(3);
  });

  it("the tool's schema says up to 10 — nothing tells the model 5 or 1-3", () => {
    const tool = tutorTools.find((t) => t.name === "find_questions_on_topic")!;
    const text = JSON.stringify(tool);
    expect(tool.description).toContain("up to 10 per call");
    expect((tool.input_schema as any).properties.limit.description).toContain("max 10");
    expect(text).not.toMatch(/max 5|1-3 validated/);
    expect(src("src/lib/ai/tools.ts")).not.toContain("Math.min(5,");
  });

  it("an empty bank is said plainly, with no questions of the tutor's own", async () => {
    state.pool = [];
    const out = await executeTool(ctx, "find_questions_on_topic", { topic_code: "quant.percentage" });
    const msg = (out as { ok: true; data: { message: string } }).data.message;
    expect(msg).toContain("Shishya's checked bank has no questions on 'quant.percentage' yet");
    expect(msg).toContain("do not write practice questions of your own");
    expect(msg).toContain("Offer the nearest real option");
  });
});

describe("practice questions come only from the checked bank — every Claude path", () => {
  it("the signed-in rule reuses the local path's own sentence (aae2d02)", () => {
    expect(PRACTICE_FROM_BANK_RULE).toContain(LOCAL_SENTENCE);
    // LOCAL_TOOL_RULES (Qwen only) still carries the same words.
    expect(src("src/lib/ai/tutor.ts")).toContain(`"${LOCAL_SENTENCE}"`);
  });

  it("names the asks that wrote MCQs, the empty-bank line and the teaching exception", () => {
    for (const ask of ['"give me 20 questions on X"', '"test me"', '"quiz"', '"with timer"', '"one easy question, then harder"']) {
      expect(PRACTICE_FROM_BANK_RULE).toContain(ask);
    }
    expect(PRACTICE_FROM_BANK_RULE).toContain("a question you write is never answer-checked");
    expect(PRACTICE_FROM_BANK_RULE).toContain("up to 10");
    expect(PRACTICE_FROM_BANK_RULE).toContain("If the bank has nothing on that topic, say so plainly in one line — never fill the gap with questions of your own");
    expect(PRACTICE_FROM_BANK_RULE).toContain("follow MOCK REQUESTS in the syllabus block");
    expect(PRACTICE_FROM_BANK_RULE).toContain("start_adaptive_quiz");
    expect(PRACTICE_FROM_BANK_RULE).toContain("a worked example of your own inside an explanation is fine");
  });

  it("is in the request Claude gets for a signed-in exam turn (tools on), in the cached static block", () => {
    const req = tutorRequest({
      studentState: { examCode: "SSC_CGL", weaknesses: [], strengths: [], totalMocksTaken: 0 },
      syllabus: EMPTY,
      history: [],
      userMessage: "give me 20 questions on percentage with timer",
      language: "EN",
      ctx: { userId: "u1", examCode: "SSC_CGL" },
    } as any);
    expect(req.tools?.some((t) => t.name === "find_questions_on_topic")).toBe(true);
    expect(req.system[0].text).toContain(PRACTICE_FROM_BANK_RULE);
    expect(req.system[0].text.split(PRACTICE_FROM_BANK_RULE)).toHaveLength(2);
  });

  it("a guest exam chat (tools off) is told never to write questions and where no-sign-in practice is", () => {
    const t = tutorSystemBlocks({ syllabus: EMPTY, toolsOn: false })[0].text;
    expect(t).toContain(SIGNIN_NUDGE);
    expect(t).not.toContain(PRACTICE_FROM_BANK_RULE);
    expect(SIGNIN_NUDGE).toContain("Never write practice, quiz or test questions yourself in this chat");
    expect(SIGNIN_NUDGE).toContain("https://shishya.in/exams/{CODE}/topics/{TOPIC}/quiz");
    expect(SIGNIN_NUDGE).toContain("https://shishya.in/exams/{CODE}/quiz");
    expect(SIGNIN_NUDGE).toContain("A worked example of your own inside an explanation is fine");
  });

  it("general mode no longer offers a question of its own", () => {
    expect(GENERAL_MODE_NOTE).not.toContain("ONE short example question of your own");
    expect(GENERAL_MODE_NOTE).toContain("do not write practice or quiz questions yourself (a question written in this chat is never answer-checked)");
    const t = tutorSystemBlocks({ syllabus: EMPTY, toolsOn: false, generalMode: true })[0].text;
    expect(t).toContain(GENERAL_MODE_NOTE);
    // General mode never nudges a sign-in (27 Sep 2026), and still doesn't.
    expect(t).not.toContain(SIGNIN_NUDGE);
  });

  it("the school tutor points a practice ask to the chapter page and asks no sign-in", () => {
    expect(SCHOOL_TUTOR_STATIC_PROMPT).toContain('When the student asks for practice, a quiz, a test or a set of questions ("give me 10 questions", "test me"), do not write them in this chat');
    expect(SCHOOL_TUTOR_STATIC_PROMPT).toContain("Point to the chapter's Shishya page");
    expect(SCHOOL_TUTOR_STATIC_PROMPT).toContain("End with one short check question");
    expect(SCHOOL_TUTOR_STATIC_PROMPT).not.toMatch(/\bsign[ -]?(?:in|up)\b/i);
  });
});

describe("languages — the tutor never says it cannot write one it is sent", () => {
  it("every Reply language the chat route can send is named in the format rules, Marathi included", () => {
    expect(ANSWER_FORMAT_RULES).toContain("MR Marathi");
    for (const l of locales) {
      const code = langToReplyLanguage(l);
      expect(ANSWER_FORMAT_RULES, code).toMatch(new RegExp(`(?:Codes: |, |locales: )${code} [A-Z]`));
      expect(SCHOOL_TUTOR_STATIC_PROMPT, code).toMatch(new RegExp(`(?:Codes: |, |locales: )${code} [A-Z]`));
    }
  });

  it("says it can write every listed language and never claims it cannot", () => {
    expect(ANSWER_FORMAT_RULES).toContain("You can write every language in the list above in full. Never tell a student that you cannot answer in one of them, or that a full answer in it is not available: write the answer in it.");
    expect(ANSWER_FORMAT_RULES).toContain('or misspelt, like "maratgi"');
    expect(SCHOOL_TUTOR_STATIC_PROMPT).toContain("You can write every language in this list in full: never tell a student that you cannot answer in one of them");
    // local-llm.ts reads every "Reply language:" line; the rules add none.
    expect(ANSWER_FORMAT_RULES).not.toMatch(/Reply language:/);
    expect(SCHOOL_TUTOR_STATIC_PROMPT).not.toMatch(/Reply language:/);
  });

  it("all three exam-tutor modes carry the line", () => {
    for (const args of [{ toolsOn: true }, { toolsOn: false }, { toolsOn: false, generalMode: true }]) {
      expect(tutorSystemBlocks({ syllabus: EMPTY, ...args })[0].text).toContain("Never tell a student that you cannot answer in one of them");
    }
  });
});
