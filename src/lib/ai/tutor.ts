// AI Tutor (chat) — with tool use.
// ─────────────────────────────────────────────────────────────────────
// The tutor runs a tool-use loop: Claude can call tools (look up the
// student's mastery map, recent attempts, fetch practice questions, etc.)
// before answering. The loop terminates when stop_reason !== "tool_use".
//
// We stream *text deltas* and *tool events* to the route handler, which
// forwards them as SSE. Tool-use turns are not delta-streamed (the SDK
// gives them as units), but interim tool events let the UI show "Looking
// up your weak topics…" while we work.

import Anthropic from "@anthropic-ai/sdk";
import { recordAiUsage } from "@/lib/ai/usage";
import { anthropic, MODEL, cachedSystemHourFirst, TOKEN_LIMITS } from "./client";
import { ledgerFeature, withReserve } from "./reserve";
import {
  PLATFORM_PERSONA,
  ANSWER_FORMAT_RULES,
  SAFETY_RULES,
  SCOPE_RULES,
  SIGNIN_NUDGE,
  GENERAL_MODE_NOTE,
  syllabusBlock,
  studentStateBlock,
  journeyBlock,
} from "./prompts";
import type { TutorInput, TutorOutput } from "./types";
import { tutorTools, executeTool, type ToolContext } from "./tools";
import { siteFeaturesBlock } from "./site-facts";
import { buildTutorExamFacts, examFactsBlock } from "./exam-facts";
import { SCHOOL_TUTOR_STATIC_PROMPT, schoolClassBlock, schoolTurnContext, type SchoolTurn, type SchoolTutorScope } from "@/lib/school/tutor-persona";

// What Shishya actually offers (24 Sep 2026) — exam-agnostic, rendered once,
// so it is part of the shared 1-hour prefix and byte-identical for everyone.
const SITE_FEATURES = siteFeaturesBlock();

// Tool-use turns were capped at 4 but a typical mock-results follow-up
// chained 3 sequential tool calls before answering — each ~3-5s
// round-trip from US Lambda to Anthropic, so first-token latency hit
// 30-45s. Capping at 2 keeps the loop snappy without losing the most
// common pattern (one mastery lookup + one practice question lookup).
const MAX_TOOL_TURNS = 2;

const TOOL_USE_GUIDE = `Tools available
───────────────
You have tools to look up real student data. Use them when relevant — never invent stats.

- get_my_mastery → student's weakest topics (mastery %, attempt count). Call this when asked about weaknesses, what to study, or where to focus.
- get_recent_attempts → last few mock attempts (score, topic mix, date). Call when student references "my last test" or asks about progress.
- find_questions_on_topic → real validated practice questions on a topic. Call when student asks "quiz me", "give me a question on X", or you want to anchor an explanation in a real exam-format question.
- get_attempt_mistakes → questions a student got wrong on a specific attempt. Call when reviewing a past attempt (after get_recent_attempts gave you the attempt_id).
- predict_rank → maps a mock-test percentage to a likely real-exam rank window + the colleges/posts typically reached at that band. Call when student asks "what rank can I get with X%", "will this score get me into [college]", "is my score enough for [post]", or any cut-off/outcome question. If they don't give a score, fetch their latest via get_recent_attempts first.

IMPORTANT — skip tool calls when the user has already supplied the data in their message. Examples:
- "I scored 22.2% on my last RRB NTPC mock, weakest was Time Distance Speed 0/1" → do NOT call get_recent_attempts or get_my_mastery; you already have the data. Answer directly.
- "Explain my mistake on Q4" without an attempt id → ask one short clarifying question rather than spinning up tools.
- "Quiz me on Profit & Loss" → ONE find_questions_on_topic call is enough; don't chain.
Each tool call adds ~5 seconds of latency the student is staring at "Thinking…" — every avoidable call hurts.

When find_questions_on_topic returns a question, present it WITHOUT the answer first. Let the student attempt; only reveal the solution after they respond.`;

/**
 * The tutor's system blocks, in cache order. Pure (no model call) and
 * exported so tests and scripts can print the exact prompt.
 *
 *   1. STATIC_PROMPT — persona, scope, safety, format, the site-features
 *      list, then the tool guide / sign-in nudge / general-mode note. Same
 *      bytes for every exam and student within a mode: 1-hour cache.
 *   2. syllabusBlock — per exam, 5-minute cache (as before).
 *   3. examFactsBlock (24 Sep 2026) — per exam: pattern, announced tracker
 *      dates, which pages exist. Its own 5-minute segment AFTER the
 *      syllabus, so a date change never re-writes the syllabus segment and
 *      nothing per-exam touches the shared prefix. Absent when the facts
 *      read failed. 3 cache_control blocks, under the API's cap of 4.
 *
 * The facts are built HERE, for `now` (review fix, 24 Sep 2026): the source
 * rides in getSyllabusContext's unstable_cache entry, which Next serves
 * stale after a quiet spell, so "today" and past/upcoming must not be
 * baked into it. The block still caches: it only changes when the rows or
 * the IST day do.
 *
 * School mode (26 Sep 2026): a Class 8-12 chat (guest or signed in) opened
 * from a school chapter or class page gets the SCHOOL persona instead — its own 1-hour
 * static block and a per-class 5-minute block (src/lib/school/tutor-persona.ts),
 * and nothing of the exam layout below runs, so the exam prefix stays
 * byte-identical for every exam chat (tests/unit/school-tutor.test.ts pins
 * its hash).
 */
export function tutorSystemBlocks(args: {
  syllabus: TutorInput["syllabus"];
  generalMode?: boolean;
  toolsOn: boolean;
  now?: Date;
  /** The class scope of a school chat; unset for every exam / general chat. */
  school?: SchoolTutorScope | null;
}) {
  if (args.school) return cachedSystemHourFirst(SCHOOL_TUTOR_STATIC_PROMPT, schoolClassBlock(args.school));
  const { syllabus, generalMode, toolsOn } = args;
  // Anthropic caps `cache_control` blocks at 4 per request. Combine the
  // small static blocks (persona + safety + format + features + tools) into
  // one cached block; the cache key is unchanged for warm-cache hits as
  // long as those constants don't change between requests.
  // Tools are only wired when we have an exam-scoped ctx (signed-in
  // student). Anonymous / general chats have no ctx, so drop the
  // tool-use guide rather than advertise tools the model can't call.
  // A tools-off EXAM chat (a guest on one exam) can't pull real
  // questions/mocks/mastery, so it gets the sign-in nudge for "give me
  // questions" moments.
  // SCOPE_RULES go in EVERY mode — the tutor is a study tutor for students
  // in India (school Class 8-12, entrance and government exams, college,
  // scholarships, careers), never a general-purpose assistant. General mode
  // gets GENERAL_MODE_NOTE and never the sign-in nudge: signing in unlocks no
  // tools there (27 Sep 2026). SITE_FEATURES too (24 Sep 2026): a guest or
  // general-mode student asking "is there an app?" gets the same truth.
  const STATIC_PROMPT = generalMode
    ? `${PLATFORM_PERSONA}\n\n${SCOPE_RULES}\n\n${SAFETY_RULES}\n\n${ANSWER_FORMAT_RULES}\n\n${SITE_FEATURES}\n\n${GENERAL_MODE_NOTE}`
    : `${PLATFORM_PERSONA}\n\n${SCOPE_RULES}\n\n${SAFETY_RULES}\n\n${ANSWER_FORMAT_RULES}\n\n${SITE_FEATURES}${toolsOn ? `\n\n${TOOL_USE_GUIDE}` : `\n\n${SIGNIN_NUDGE}`}`;
  // The static prompt is the same for every exam, but quiet hours leave 5-60
  // minutes between tutor calls (week to 14 Sep 2026: 95 of 540 signed-in and
  // 114 of 246 signed-out calls), and each of those re-wrote it. It keeps a
  // 1-hour entry; the per-exam syllabus stays on 5 minutes, where a 1-hour
  // write would cost more than the extra hits it buys.
  if (generalMode) return cachedSystemHourFirst(STATIC_PROMPT);
  const source = syllabus.examFacts;
  let factsText: string | null = null;
  if (source) {
    try {
      const facts = buildTutorExamFacts({ ...source, now: args.now ?? new Date() });
      factsText = examFactsBlock(facts, { code: syllabus.examCode, name: syllabus.examName });
    } catch (err) {
      // Never fail a chat over the facts: answer as before, without them.
      console.warn(`[tutor] exam facts build failed for ${syllabus.examCode}:`, (err as Error)?.message ?? err);
    }
  }
  const syllabusText = syllabusBlock(
    syllabus,
    factsText != null && source
      ? { buildMock: source.pages ? source.pages.buildMock : null, fullPatternMock: source.fullPatternMock }
      : {},
  );
  return factsText != null
    ? cachedSystemHourFirst(STATIC_PROMPT, syllabusText, factsText)
    : cachedSystemHourFirst(STATIC_PROMPT, syllabusText);
}

/**
 * The per-turn context put before the student's message (never cached).
 * Pure and exported for tests.
 *
 * 30 Sep 2026 ("the tutor remembers"): a signed-in GENERAL chat gets the
 * journey too — the student's own earlier questions (src/lib/tutor-memory.ts;
 * the route loads it by userId only). A general chat still gets no student
 * state block (no exam to scope it) and no actions line; a school chat still
 * gets its own context and no journey. An exam chat's context is unchanged.
 */
export function tutorTurnContext(args: {
  school: SchoolTurn | null;
  generalMode?: boolean;
  studentState: TutorInput["studentState"];
  journey?: TutorInput["journey"];
  focusBlock: string;
  language: TutorInput["language"];
}): string {
  const { school, generalMode, studentState, journey, focusBlock, language } = args;
  if (school) return schoolTurnContext(school, language);
  const journeyText = journey ? journeyBlock(journey) : "";
  // In general mode we don't show studentStateBlock either — there's no
  // useful exam-scoped data to reference.
  if (generalMode) return `${journeyText ? `${journeyText}\n\n` : ""}Reply language: ${language}.`;
  return `${studentStateBlock(studentState)}
${journeyText ? `\n${journeyText}\n` : ""}${focusBlock ? `\n${focusBlock}\n` : ""}
Reply language: ${language}.

If you suggest follow-up actions to the student, append a single line in this format:
<<ACTIONS>>{"actions":[{"kind":"TAKE_MOCK","topicCode":"quant.percentage","reason":"...","priority":1}]}<<END>>
Skip if no clear next step.`;
}

/**
 * The spend ledger for one tutorStream run (1 Oct 2026). The late-answer run
 * (src/lib/tutor-late-answer.ts) books its calls under its own AiUsage
 * feature and keeps a running total against its $1.00 per-run cap; the chat
 * route passes nothing and its rows are unchanged ("tutor" / "tutor-school" /
 * "tutor-anon" / "tutor-wrap"). Never changes the prompt or the request.
 */
export interface TutorUsageOpts {
  /** AiUsage feature for this run's calls; the soft-cap wrap call gets "<feature>-wrap". */
  feature?: string;
  /** Called with each call's recorded cost in USD. */
  onCost?: (usd: number) => void;
}

/** What tutorStream takes. */
export type TutorStreamInput = TutorInput & { ctx?: ToolContext; school?: SchoolTurn | null; usage?: TutorUsageOpts };

/**
 * The first request tutorStream sends for an input: the system blocks, the
 * conversation (history, then the turn's context and the student's message),
 * the tools when they are on, and how many calls the tool loop can make at
 * most (1 Oct 2026 review). Pure. tutorStream builds its request here, and
 * the late-answer run (src/lib/db/tutor-late-answer.ts) prices this very
 * request before it calls, so its $1.00 cap holds — every prompt is still
 * written only in this file.
 */
export function tutorRequest(input: TutorStreamInput): {
  system: ReturnType<typeof tutorSystemBlocks>;
  messages: Anthropic.Messages.MessageParam[];
  tools: Anthropic.Messages.Tool[] | undefined;
  /** Tools on: MAX_TOOL_TURNS rounds, the call after them, and the wrap. Tools off: one. */
  maxCalls: number;
} {
  const { studentState, history, userMessage, language, topicFocus, journey, generalMode } = input;
  // 26 Sep 2026: a school turn is tools-off whatever the caller passed (the
  // tools read mastery, attempts and rank bands — a school chat has none)
  // and gets the school prompt blocks and turn context.
  const school = input.school ?? null;
  const ctx = school ? undefined : input.ctx;

  const systemBlocks = tutorSystemBlocks({ syllabus: input.syllabus, generalMode, toolsOn: Boolean(ctx), school: school?.scope });

  const focusBlock = topicFocus
    ? `CURRENT FOCUS — the student opened this chat from the study-notes page for "${topicFocus.name}" (subject: ${topicFocus.subjectName}). Anchor your reply to this topic: use its terminology, examples, and formulas. Only diverge if the student explicitly asks to switch topics. When citing the topic, use the code \`${topicFocus.code}\`.
${topicFocus.notesExcerpt ? `\nReference notes (already shown to the student — do not re-paste verbatim; build on them):\n${topicFocus.notesExcerpt}\n` : ""}`
    : "";

  const dynamicContext = tutorTurnContext({ school, generalMode, studentState, journey, focusBlock, language });

  // Build the conversation. History first, then the user's new message with the dynamic context block.
  const messages: Anthropic.Messages.MessageParam[] = [
    ...history.map((t) => ({ role: t.role, content: t.content })),
    { role: "user" as const, content: `${dynamicContext}\n\n---\n\nUser: ${userMessage}` },
  ];
  return { system: systemBlocks, messages, tools: ctx ? tutorTools : undefined, maxCalls: ctx ? MAX_TOOL_TURNS + 2 : 1 };
}

/** Streaming version — yields {delta} for text chunks, {tool} for tool events, {done} when complete. */
export async function* tutorStream(
  input: TutorStreamInput
): AsyncGenerator<
  | { delta: string }
  | { tool: { name: string; args: any; ok: boolean; ms: number } }
  | { done: TutorOutput }
> {
  // The request is built by tutorRequest (1 Oct 2026 — moved there unchanged).
  const school = input.school ?? null;
  const ctx = school ? undefined : input.ctx;
  const { system: systemBlocks, messages } = tutorRequest(input);

  let finalText = "";
  let toolTurns = 0;

  while (true) {
    const start = Date.now();
    // 7 Oct 2026: an empty main balance is retried once on the reserve key
    // for a student's turn (src/lib/ai/reserve.ts); "tutor-late" never is.
    const feature = input.usage?.feature ?? (school ? "tutor-school" : ctx ? "tutor" : "tutor-anon");
    const { value: response, reserve } = await withReserve(feature, anthropic, (client) =>
      client.messages.create({
        model: MODEL,
        max_tokens: TOKEN_LIMITS.tutor,
        system: systemBlocks,
        messages,
        tools: ctx ? tutorTools : undefined,
      }),
    );
    const cost = recordAiUsage(ledgerFeature(feature, reserve), response, { model: MODEL, ref: input.syllabus?.examCode ?? null, latencyMs: Date.now() - start });
    input.usage?.onCost?.(cost);

    // Append the assistant message to the conversation history (full content blocks
    // — tool_use blocks need to be carried forward so tool_result can reference them).
    messages.push({ role: "assistant", content: response.content });

    // Capture any text from this turn.
    for (const block of response.content) {
      if (block.type === "text") finalText += (finalText ? "\n" : "") + block.text;
    }

    if (response.stop_reason !== "tool_use" || !ctx) {
      break;
    }

    if (toolTurns >= MAX_TOOL_TURNS) {
      // Soft-cap: tell the model to wrap up. The API requires a tool_result
      // for every tool_use in the previous assistant turn, so answer each
      // pending tool call with an error result (a bare text message here
      // was a guaranteed 400 — "Something went wrong" for the student).
      const pending = response.content.filter(
        (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use",
      );
      messages.push({
        role: "user",
        content: [
          ...pending.map((tu) => ({
            type: "tool_result" as const,
            tool_use_id: tu.id,
            is_error: true,
            content: "Tool budget exhausted — answer the student now using what you already know.",
          })),
          { type: "text" as const, text: "Tool budget exhausted. Answer the student now using what you already know." },
        ],
      });
      // One last call that forbids further tool use to force a text
      // answer. `tools` stays in the request so the cached prefix
      // (tools → system) is byte-identical to the loop's requests and the
      // call is a cache HIT; omitting tools re-wrote ~4k tokens per wrap.
      const wrapFeature = input.usage?.feature ? `${input.usage.feature}-wrap` : "tutor-wrap";
      const { value: wrap, reserve: wrapReserve } = await withReserve(wrapFeature, anthropic, (client) =>
        client.messages.create({
          model: MODEL,
          max_tokens: TOKEN_LIMITS.tutor,
          system: systemBlocks,
          messages,
          tools: tutorTools,
          tool_choice: { type: "none" },
        }),
      );
      input.usage?.onCost?.(recordAiUsage(ledgerFeature(wrapFeature, wrapReserve), wrap, { model: MODEL, ref: input.syllabus?.examCode ?? null }));
      for (const block of wrap.content) {
        if (block.type === "text") finalText += (finalText ? "\n" : "") + block.text;
      }
      break;
    }

    // Execute every tool_use block from this response in order.
    const toolUses = response.content.filter(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use"
    );
    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      const tStart = Date.now();
      const result = await executeTool(ctx, tu.name, tu.input);
      const ms = Date.now() - tStart;
      yield {
        tool: { name: tu.name, args: tu.input, ok: result.ok, ms },
      };
      toolResults.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: JSON.stringify(result.ok ? result.data : { error: result.error }),
        is_error: !result.ok,
      });
    }
    messages.push({ role: "user", content: toolResults });
    toolTurns += 1;
    void start; // (latency telemetry consumer can be added later)
  }

  // Stream the final text out as ~80-char chunks for SSE feel.
  const { reply, suggestedActions, citedTopics } = splitActions(finalText);
  for (const piece of chunkForStream(reply)) {
    yield { delta: piece };
  }
  yield { done: { reply, suggestedActions, citedTopics } };
}

/** Non-streaming version (one-shot). Useful for tests / batch processing. */
export async function tutorReply(input: TutorInput & { ctx?: ToolContext }): Promise<TutorOutput> {
  let final: TutorOutput | null = null;
  for await (const chunk of tutorStream(input)) {
    if ("done" in chunk) final = chunk.done;
  }
  if (!final) throw new Error("tutorStream completed without done");
  return final;
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function* chunkForStream(text: string): Generator<string> {
  if (!text) return;
  // Break on word boundaries every ~80 chars so tokens stay coherent.
  let i = 0;
  while (i < text.length) {
    const next = Math.min(text.length, i + 80);
    let cut = next;
    if (next < text.length) {
      const ws = text.lastIndexOf(" ", next);
      if (ws > i + 20) cut = ws + 1;
    }
    yield text.slice(i, cut);
    i = cut;
  }
}

function splitActions(text: string): TutorOutput {
  const re = /<<ACTIONS>>([\s\S]*?)<<END>>/;
  const m = re.exec(text);
  if (!m) {
    return { reply: text.trim(), citedTopics: extractTopicCodes(text) };
  }
  const reply = text.replace(re, "").trim();
  let actions;
  try {
    actions = JSON.parse(m[1]).actions;
  } catch {
    actions = undefined;
  }
  return { reply, suggestedActions: actions, citedTopics: extractTopicCodes(reply) };
}

function extractTopicCodes(text: string): string[] {
  const re = /`([a-z]+\.[a-z][a-z0-9_.-]*)`/g;
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) found.add(m[1]);
  return [...found];
}
