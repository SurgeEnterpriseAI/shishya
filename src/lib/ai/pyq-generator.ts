// PYQ-pattern question generator.
//
// Claude searches the real web — official board sites, exam-prep blogs,
// PYQ analysis pages — to identify the question PATTERN actually used
// on a given exam in a given year for a given topic. It then produces
// FRESH questions in the same pattern, returned as strict JSON.
//
// We don't store verbatim copyrighted PYQs. Outputs are marked
// source = PYQ + pyqYear in the DB so the existing UI ("Filter by
// year", "PYQs by year" panel) renders them correctly.

import Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODEL } from "./client";

export interface PYQGenerationInput {
  examCode: string;
  examName: string;
  examShortName: string;
  category: string;
  /** Topics to spread questions across. Codes like "quant.percentage". */
  topics: Array<{ id: string; code: string; name: string; subjectName: string }>;
  /** Years to spread across; typically last 5 years. */
  years: number[];
  /** Target total questions (we may return fewer if the model thinks the
   *  exam genuinely has thin recent material). */
  targetCount: number;
}

export interface PYQQuestion {
  topicId: string;
  topicCode: string;
  pyqYear: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  body: string;
  options: Array<{ key: string; text: string }>;
  answerKey: string;
  solution: string;
}

export interface PYQGenerationResult {
  questions: PYQQuestion[];
  inputTokens: number;
  outputTokens: number;
  // Citations Claude pulled from the web — admin can audit the
  // sources we patterned from.
  sources: string[];
}

const SYSTEM = `You are generating multiple-choice practice questions modelled on the PATTERN of an Indian entrance exam's previous-year papers.

CRITICAL legal/ethical rule: NEVER reproduce a real PYQ verbatim, even if you found it in a source. Every question MUST be FRESHLY WORDED — same topic, same style, same difficulty class, same kind of numerical or conceptual twist, but new wording and new specific numbers. Treat the real PYQs as inspiration for the pattern, not text to copy.

WORKFLOW (use the web_search tool actively):
1. Search for the actual exam pattern + year-wise topic distribution for the requested topics.
2. Identify the typical question style for that exam (e.g. SSC CGL Quant favours simplification + percentage word problems; NEET Physics favours numerical with formula application; UPSC Prelims GS favours statement-based "which of the above is correct").
3. Produce questions in that PATTERN with FRESH wording and FRESH numbers/data.
4. Spread questions evenly across the topics + years provided.
5. Mix difficulties roughly 40% EASY, 40% MEDIUM, 20% HARD unless the exam is known to be harder (e.g. JEE Advanced, GATE) in which case skew to MEDIUM/HARD.

OUTPUT FORMAT — CRITICAL:
- Return ONLY the JSON object, starting with { as the very first character.
- NO preamble. NO "Based on my research…". NO "Here are the questions:". NO markdown fences. The entire response must be valid JSON.
- After web_search use, do NOT narrate — silently go straight to producing the JSON.
- Shape:
{
  "questions": [
    {
      "topicCode": "<exact code from input topics>",
      "pyqYear": 2024,
      "difficulty": "EASY" | "MEDIUM" | "HARD",
      "body": "<question text>",
      "options": [
        { "key": "A", "text": "..." },
        { "key": "B", "text": "..." },
        { "key": "C", "text": "..." },
        { "key": "D", "text": "..." }
      ],
      "answerKey": "A" | "B" | "C" | "D",
      "solution": "<1-2 sentences explaining why the marked answer is correct>"
    }
  ]
}

Each question MUST:
- Use exactly 4 options A/B/C/D
- Have exactly one correct answer
- Reference a topicCode that appears in the input
- Have a pyqYear in the requested years list
- Be answerable from the listed topic without external context
- Be conceptually self-contained (no diagrams referenced)`;

// Lowered from 15 → 10 after observing truncated JSON on multi-batch
// runs. 10 questions × ~250 output tokens + web_search reasoning fits
// comfortably under max_tokens=16000 with margin.
export const MAX_QUESTIONS_PER_CALL = 10;

export async function generatePYQPatternBatch(
  input: PYQGenerationInput,
): Promise<PYQGenerationResult> {
  if (input.topics.length === 0 || input.years.length === 0) {
    return { questions: [], inputTokens: 0, outputTokens: 0, sources: [] };
  }

  const topicLines = input.topics
    .map((t) => `${t.code}  [${t.subjectName} → ${t.name}]`)
    .join("\n");

  const userBlock = `Generate ${Math.min(input.targetCount, MAX_QUESTIONS_PER_CALL)} PYQ-PATTERN questions for this Indian entrance exam.

Exam:        ${input.examName} (${input.examShortName})
Code:        ${input.examCode}
Category:    ${input.category}

Topics (use these codes EXACTLY):
${topicLines}

Spread across these years: ${input.years.join(", ")}

Use the web_search tool to find: actual exam pattern, year-wise topic distribution, question style. DO NOT copy any real PYQ verbatim — generate fresh wording / fresh numbers in the same pattern.

Return STRICT JSON per the schema in the system prompt.`;

  // Wrap in retry — ECONNRESET on the streaming socket is common on
  // long-running web_search calls. Retry once before giving up.
  let finalMessage: Anthropic.Messages.Message;
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt += 1;
    try {
      const stream = anthropic.messages.stream(
        {
          model: MODEL,
          max_tokens: 16000,
          tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }] as any,
          system: [
            { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
          ] as Anthropic.Messages.TextBlockParam[],
          messages: [{ role: "user", content: userBlock }],
        } as any,
      );
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

  // Citations from web_search results — best-effort extraction.
  const sources = new Set<string>();
  for (const block of finalMessage.content as any[]) {
    if (block?.type === "web_search_tool_result" && Array.isArray(block.content)) {
      for (const r of block.content) {
        if (r?.url) sources.add(r.url);
      }
    }
  }

  const parsed = extractJson(text);
  if (!parsed || !Array.isArray(parsed.questions)) {
    // Show head + tail so we can tell truncation (tail mid-token) from
    // genuine parse failures (tail looks clean but extra prose).
    const head = text.slice(0, 200).replace(/\s+/g, " ");
    const tail = text.slice(-200).replace(/\s+/g, " ");
    const stopReason = (finalMessage as any).stop_reason ?? "?";
    throw new Error(
      `PYQ-gen returned malformed JSON (len=${text.length}, stop=${stopReason})\n  head: ${head}\n  tail: ${tail}`,
    );
  }

  const topicByCode = new Map(input.topics.map((t) => [t.code, t.id]));
  const yearSet = new Set(input.years);

  const questions: PYQQuestion[] = [];
  for (const q of parsed.questions) {
    const topicId = topicByCode.get(q?.topicCode);
    if (!topicId) continue;
    const pyqYear = Number.isFinite(q?.pyqYear) ? Math.round(q.pyqYear) : NaN;
    if (!yearSet.has(pyqYear)) continue;
    if (!Array.isArray(q?.options) || q.options.length !== 4) continue;
    if (typeof q?.answerKey !== "string" || !["A", "B", "C", "D"].includes(q.answerKey)) continue;
    if (typeof q?.body !== "string" || q.body.length < 10) continue;
    questions.push({
      topicId,
      topicCode: q.topicCode,
      pyqYear,
      difficulty: (["EASY", "MEDIUM", "HARD"].includes(q?.difficulty) ? q.difficulty : "MEDIUM") as any,
      body: String(q.body).slice(0, 2000),
      options: q.options.map((o: any) => ({
        key: String(o?.key ?? "").slice(0, 2),
        text: String(o?.text ?? "").slice(0, 500),
      })),
      answerKey: q.answerKey,
      solution: String(q?.solution ?? "").slice(0, 1000),
    });
  }

  return {
    questions,
    inputTokens: finalMessage.usage.input_tokens,
    outputTokens: finalMessage.usage.output_tokens,
    sources: [...sources],
  };
}

function extractJson(text: string): any | null {
  let body = text.trim();
  // Strip a leading markdown fence if present.
  if (body.startsWith("```")) body = body.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  try { return JSON.parse(body); } catch {}
  // Common failure: Claude prefixes the JSON with narrative
  // ("I'll search... Based on my research, here's the JSON: { ... }").
  // Pull the first balanced JSON object out of the text.
  const first = body.indexOf("{");
  const last = body.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    // Try the largest candidate first.
    try { return JSON.parse(body.slice(first, last + 1)); } catch {}
    // Fallback: scan for the largest balanced { ... } substring.
    let depth = 0;
    let start = -1;
    let best: { from: number; to: number } | null = null;
    for (let i = 0; i < body.length; i++) {
      const ch = body[i];
      if (ch === "{") {
        if (depth === 0) start = i;
        depth += 1;
      } else if (ch === "}") {
        depth -= 1;
        if (depth === 0 && start !== -1) {
          if (!best || i - start > best.to - best.from) best = { from: start, to: i };
          start = -1;
        }
      }
    }
    if (best) {
      try { return JSON.parse(body.slice(best.from, best.to + 1)); } catch {}
    }
  }
  // Truncation salvage: when the model hit max_tokens mid-output,
  // the top-level JSON won't close. But we can still recover the
  // complete `{ ... }` question objects inside the `"questions": [`
  // array up to the point the stream cut off.
  const qKey = body.indexOf('"questions"');
  if (qKey !== -1) {
    const arrStart = body.indexOf("[", qKey);
    if (arrStart !== -1) {
      const objs: any[] = [];
      let i = arrStart + 1;
      while (i < body.length) {
        while (i < body.length && /[\s,]/.test(body[i])) i++;
        if (body[i] !== "{") break;
        let depth = 0;
        const objStart = i;
        let closed = false;
        for (; i < body.length; i++) {
          if (body[i] === "{") depth += 1;
          else if (body[i] === "}") {
            depth -= 1;
            if (depth === 0) { i += 1; closed = true; break; }
          }
        }
        if (!closed) break;
        try { objs.push(JSON.parse(body.slice(objStart, i))); } catch { break; }
      }
      if (objs.length > 0) return { questions: objs };
    }
  }
  return null;
}
