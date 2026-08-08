// Vernacular-medium mock generator.
//
// The demand signal (8 Aug 2026): "Telugu TET Paper IIA for ap mock
// test full" — aspirants for state exams (TETs, police, PSC Group C/D)
// STUDY in Telugu/Hindi/Marathi/Kannada, and the real papers are set
// in those mediums. Our mocks were English-first. Nobody serves free
// vernacular-medium mocks well; this closes the most strategic gap on
// the demand list.
//
// Generates full-paper questions written NATIVELY in the target
// language (body, options, solution — native script, exam-register
// vocabulary), grounded via web_search in the real exam's pattern.
// NOT translation: translated mocks read wrong; these are authored in
// the medium, the way the actual paper is.

import Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODEL } from "./client";

export const LANG_META: Record<string, { name: string; native: string; bcp: string }> = {
  TE: { name: "Telugu", native: "తెలుగు", bcp: "te-IN" },
  HI: { name: "Hindi", native: "हिन्दी", bcp: "hi-IN" },
  MR: { name: "Marathi", native: "मराठी", bcp: "mr-IN" },
  KN: { name: "Kannada", native: "ಕನ್ನಡ", bcp: "kn-IN" },
  TA: { name: "Tamil", native: "தமிழ்", bcp: "ta-IN" },
  BN: { name: "Bengali", native: "বাংলা", bcp: "bn-IN" },
};

export interface VernacularBatchInput {
  examCode: string;
  examName: string;
  examShortName: string;
  category: string;
  lang: string; // "TE" | "HI" | ...
  topics: Array<{ id: string; code: string; name: string; subjectName: string }>;
  targetCount: number;
}

export interface VernacularQuestion {
  topicId: string;
  topicCode: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  body: string;
  options: Array<{ key: string; text: string }>;
  answerKey: string;
  solution: string;
}

const SYSTEM = `You are setting multiple-choice questions for an Indian government-exam mock paper, written NATIVELY in the requested Indian language — the way the REAL exam paper is set in that medium.

LANGUAGE RULES (non-negotiable):
- Question body, all four options, and the solution must be written in the target language, in its native script.
- Use the exam-register vocabulary that real papers in that medium use (e.g. Telugu TET papers use standard textbook Telugu; Hindi police papers use shuddh but accessible Hindi). Technical terms that real papers keep in English (e.g. "GDP", scientific symbols) stay in English — mirror real-paper conventions, discovered via web_search.
- This is NOT translation of English questions. Author natively.

WORKFLOW (use web_search actively):
1. Search how the real exam's {language}-medium paper is phrased — sample questions, official syllabus in that medium, paper conventions.
2. Author fresh questions in that register. Never reproduce a real question verbatim.
3. Spread across the provided topics; difficulty mix ~40% EASY / 40% MEDIUM / 20% HARD.

OUTPUT — CRITICAL: return ONLY a JSON object, { as the first character, no preamble, no fences, no narration after web_search. Shape:
{"questions":[{"topicCode":"<exact code from input>","difficulty":"EASY|MEDIUM|HARD","body":"<native-language question>","options":[{"key":"A","text":"..."},{"key":"B","text":"..."},{"key":"C","text":"..."},{"key":"D","text":"..."}],"answerKey":"A|B|C|D","solution":"<1-2 native-language sentences>"}]}

Each question: exactly 4 options A-D, exactly one correct answer, topicCode from the input list, self-contained (no diagrams).`;

export const MAX_PER_CALL = 10;

export async function generateVernacularBatch(
  input: VernacularBatchInput,
): Promise<{ questions: VernacularQuestion[]; inputTokens: number; outputTokens: number }> {
  const meta = LANG_META[input.lang];
  if (!meta) throw new Error(`unsupported lang ${input.lang}`);
  const topicLines = input.topics.map((t) => `${t.code}  [${t.subjectName} → ${t.name}]`).join("\n");
  const userBlock = `Author ${Math.min(input.targetCount, MAX_PER_CALL)} questions in ${meta.name} (${meta.native}), native script, for this exam's ${meta.name}-medium mock paper.

Exam:     ${input.examName} (${input.examShortName})
Code:     ${input.examCode}
Category: ${input.category}
Language: ${meta.name} (${meta.bcp})

Topics (use these codes EXACTLY):
${topicLines}

Search the web for how the real ${input.examShortName} ${meta.name}-medium paper is phrased, then author fresh questions in that register. Return STRICT JSON only.`;

  let finalMessage: Anthropic.Messages.Message;
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt += 1;
    try {
      const stream = anthropic.messages.stream({
        model: MODEL,
        max_tokens: 16000,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }] as any,
        system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }] as Anthropic.Messages.TextBlockParam[],
        messages: [{ role: "user", content: userBlock }],
      } as any);
      finalMessage = await stream.finalMessage();
      break;
    } catch (err: any) {
      const msg = String(err?.message ?? err);
      if (attempt < 2 && /ECONNRESET|ETIMEDOUT|socket hang up|fetch failed/i.test(msg)) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      throw err;
    }
  }

  const text = finalMessage.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  let parsed: any = null;
  let body = text;
  if (body.startsWith("```")) body = body.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  try { parsed = JSON.parse(body); } catch {
    const first = body.indexOf("{");
    const last = body.lastIndexOf("}");
    if (first !== -1 && last > first) {
      try { parsed = JSON.parse(body.slice(first, last + 1)); } catch {}
    }
  }
  if (!parsed || !Array.isArray(parsed.questions)) {
    throw new Error(`vernacular-gen malformed JSON (len=${text.length}) head: ${text.slice(0, 160)}`);
  }

  const topicByCode = new Map(input.topics.map((t) => [t.code, t.id]));
  const questions: VernacularQuestion[] = [];
  for (const q of parsed.questions) {
    const topicId = topicByCode.get(q?.topicCode);
    if (!topicId) continue;
    if (!Array.isArray(q?.options) || q.options.length !== 4) continue;
    if (!["A", "B", "C", "D"].includes(q?.answerKey)) continue;
    if (typeof q?.body !== "string" || q.body.length < 10) continue;
    questions.push({
      topicId,
      topicCode: q.topicCode,
      difficulty: (["EASY", "MEDIUM", "HARD"].includes(q?.difficulty) ? q.difficulty : "MEDIUM") as any,
      body: String(q.body).slice(0, 2000),
      options: q.options.map((o: any) => ({ key: String(o?.key ?? "").slice(0, 2), text: String(o?.text ?? "").slice(0, 500) })),
      answerKey: q.answerKey,
      solution: String(q?.solution ?? "").slice(0, 1000),
    });
  }
  return { questions, inputTokens: finalMessage.usage.input_tokens, outputTokens: finalMessage.usage.output_tokens };
}
