// Question translator — turns English (or whatever the source locale is)
// question text + options + solution into the student's chosen locale.
//
// Strategy: ONE Anthropic call translates the whole batch at once. The
// caller (an API route) checks the QuestionTranslation cache first; only
// the misses are sent to Claude. Results are persisted so the next
// student who picks the same locale on the same question gets it instantly.

import Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODEL } from "./client";
import type { Locale } from "@/lib/i18n";
import { localeNames } from "@/lib/i18n";

export interface TranslateInputQuestion {
  id: string;
  body: string;
  options: Array<{ key: string; text: string }>;
  solution: string;
  hints?: unknown;
}

export interface TranslatedQuestion {
  id: string;
  body: string;
  options: Array<{ key: string; text: string }>;
  solution: string;
  hints?: unknown;
}

// Source: an exam-prep platform. Numbers, formulas, English proper nouns
// (people, places, organizations) and code blocks stay verbatim. Option
// keys (A/B/C/D) NEVER change. The model must return strict JSON.
const SYSTEM_PROMPT = `You are a translation engine for an Indian entrance-exam tutoring platform (Shishya).

Your job: translate a batch of exam questions from English into a target Indian language.

ABSOLUTE RULES — non-negotiable:
1. Keep numbers, mathematical expressions, formulas, currency, units, dates exactly as-is.
2. Keep English proper nouns (names of people, places, organizations, technical terms with no local equivalent) in their original script. e.g. "Mahatma Gandhi" stays "Mahatma Gandhi" in Telugu output — students recognize him better that way.
3. Keep the option keys ("A", "B", "C", "D", etc.) literally — only the option text is translated.
4. Keep the question ID exactly as provided in input.
5. Preserve LaTeX, code blocks, and any \`backtick wrappers\` verbatim.
6. Do NOT add explanations, headers, or commentary. Return ONLY the JSON.
7. If a question references a passage in English that students are meant to read in English (e.g. an English comprehension passage on the UPSSSC PET exam), preserve the passage in English BUT translate the questions/options/solution about it into the target language.
8. The translation should feel natural to a native speaker of the target language; don't transliterate word-for-word.

OUTPUT FORMAT — strict JSON, no markdown fences, no prose around it:
{
  "translations": [
    {
      "id": "<original question id>",
      "body": "<translated question body>",
      "options": [{ "key": "A", "text": "<translated option text>" }, ...],
      "solution": "<translated solution explanation>"
    },
    ...
  ]
}`;

export interface TranslateBatchInput {
  locale: Locale;
  questions: TranslateInputQuestion[];
}

export interface TranslateBatchResult {
  translated: TranslatedQuestion[];
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

// Hard cap so we never send a runaway batch. With streaming we have plenty
// of headroom (32k output cap), so we can comfortably batch 15 questions at
// a time. Anything larger risks the model losing track of the question list.
export const MAX_BATCH_SIZE = 15;

export async function translateBatch(
  input: TranslateBatchInput,
): Promise<TranslateBatchResult> {
  if (input.questions.length === 0) {
    return { translated: [], inputTokens: 0, outputTokens: 0, latencyMs: 0 };
  }
  if (input.questions.length > MAX_BATCH_SIZE) {
    throw new Error(
      `translateBatch called with ${input.questions.length} questions (max ${MAX_BATCH_SIZE})`,
    );
  }
  if (input.locale === "en") {
    // No-op: identity translation. Caller should normally skip but be safe.
    return {
      translated: input.questions.map((q) => ({
        id: q.id,
        body: q.body,
        options: q.options,
        solution: q.solution,
        hints: q.hints,
      })),
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: 0,
    };
  }

  const targetName = localeNames[input.locale] ?? input.locale;
  const userBlock = `Translate the following questions to ${targetName} (${input.locale}).\n\nQUESTIONS_JSON:\n${JSON.stringify(
    {
      questions: input.questions.map((q) => ({
        id: q.id,
        body: q.body,
        options: q.options,
        solution: q.solution,
      })),
    },
    null,
    2,
  )}`;

  // Use streaming. Non-streaming caps max_tokens at ~8k (10-min HTTP
  // timeout safeguard); streaming has no such ceiling and lets us safely
  // allow up to 32k output for passage-heavy reading-comprehension
  // batches. Server-side we just collect the chunks and parse at the end.
  //
  // Hard 25-second AbortController so a stuck stream (Anthropic rate
  // limit, network hang, etc.) doesn't blow the 60-second Vercel
  // runtime. The caller's Promise.allSettled treats aborted batches as
  // failures, the rest of the mock still translates.
  const start = Date.now();
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 25_000);
  let finalMessage: Awaited<ReturnType<typeof anthropic.messages.create>>;
  try {
    const stream = anthropic.messages.stream(
      {
        model: MODEL,
        max_tokens: Math.min(32000, 1500 * input.questions.length + 2000),
        system: [
          { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        ] as Anthropic.Messages.TextBlockParam[],
        messages: [{ role: "user", content: userBlock }],
      },
      { signal: abortController.signal },
    );
    finalMessage = await stream.finalMessage();
  } finally {
    clearTimeout(timeoutId);
  }
  const latencyMs = Date.now() - start;

  const text = finalMessage.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  const parsed = extractJson(text);
  if (!parsed || !Array.isArray(parsed.translations)) {
    throw new Error(`translator returned malformed JSON: ${text.slice(0, 300)}`);
  }

  const byId = new Map<string, TranslatedQuestion>();
  for (const t of parsed.translations) {
    if (typeof t.id !== "string") continue;
    byId.set(t.id, {
      id: t.id,
      body: String(t.body ?? ""),
      options: Array.isArray(t.options)
        ? t.options.map((o: any) => ({
            key: String(o.key ?? ""),
            text: String(o.text ?? ""),
          }))
        : [],
      solution: String(t.solution ?? ""),
    });
  }

  const translated: TranslatedQuestion[] = input.questions.map((q) => {
    const t = byId.get(q.id);
    if (t && t.body && t.options.length === q.options.length) return t;
    return {
      id: q.id,
      body: q.body,
      options: q.options,
      solution: q.solution,
      hints: q.hints,
    };
  });

  return {
    translated,
    inputTokens: finalMessage.usage.input_tokens,
    outputTokens: finalMessage.usage.output_tokens,
    latencyMs,
  };
}

function extractJson(text: string): any | null {
  let body = text.trim();
  if (body.startsWith("```")) {
    body = body.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  try {
    return JSON.parse(body);
  } catch {
    const first = body.indexOf("{");
    const last = body.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first) return null;
    try {
      return JSON.parse(body.slice(first, last + 1));
    } catch {
      return null;
    }
  }
}
