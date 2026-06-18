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
import { anthropic, MODEL, cachedSystem, TOKEN_LIMITS } from "./client";
import {
  PLATFORM_PERSONA,
  ANSWER_FORMAT_RULES,
  SAFETY_RULES,
  SCOPE_RULES,
  syllabusBlock,
  studentStateBlock,
  journeyBlock,
} from "./prompts";
import type { TutorInput, TutorOutput } from "./types";
import { tutorTools, executeTool, type ToolContext } from "./tools";

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

/** Streaming version — yields {delta} for text chunks, {tool} for tool events, {done} when complete. */
export async function* tutorStream(
  input: TutorInput & { ctx?: ToolContext }
): AsyncGenerator<
  | { delta: string }
  | { tool: { name: string; args: any; ok: boolean; ms: number } }
  | { done: TutorOutput }
> {
  const { studentState, syllabus, history, userMessage, language, topicFocus, journey, generalMode, ctx } = input;

  // Anthropic caps `cache_control` blocks at 4 per request. Combine the 4
  // small static blocks (persona + safety + format + tools) into one cached
  // block; keep syllabus as its own cached block. That's 2 blocks, well
  // under the limit, and the cache key is unchanged for warm-cache hits as
  // long as the four constants don't change between requests.
  // Tools are only wired when we have an exam-scoped ctx (signed-in
  // student). Anonymous / general chats have no ctx, so drop the
  // tool-use guide rather than advertise tools the model can't call.
  const toolsOn = Boolean(ctx);
  // SCOPE_RULES go in EVERY mode — the tutor must stay an exam-prep tutor
  // whether the chat is exam-scoped, general, or anonymous. It is not a
  // general-purpose assistant.
  const STATIC_PROMPT = generalMode
    ? `${PLATFORM_PERSONA}\n\n${SCOPE_RULES}\n\n${SAFETY_RULES}\n\n${ANSWER_FORMAT_RULES}\n\nThis chat is in GENERAL mode — exam-agnostic. The student wants help with cross-exam questions, career advice, study technique, or choosing an exam. You have no syllabus to reference and no student mastery data. Answer based on general knowledge of Indian entrance exams; ask one short clarifying question if a specific exam would change your answer. Stay within the scope rules above.`
    : `${PLATFORM_PERSONA}\n\n${SCOPE_RULES}\n\n${SAFETY_RULES}\n\n${ANSWER_FORMAT_RULES}${toolsOn ? `\n\n${TOOL_USE_GUIDE}` : ""}`;
  const systemBlocks = generalMode
    ? cachedSystem(STATIC_PROMPT)
    : cachedSystem(STATIC_PROMPT, syllabusBlock(syllabus));

  const focusBlock = topicFocus
    ? `CURRENT FOCUS — the student opened this chat from the study-notes page for "${topicFocus.name}" (subject: ${topicFocus.subjectName}). Anchor your reply to this topic: use its terminology, examples, and formulas. Only diverge if the student explicitly asks to switch topics. When citing the topic, use the code \`${topicFocus.code}\`.
${topicFocus.notesExcerpt ? `\nReference notes (already shown to the student — do not re-paste verbatim; build on them):\n${topicFocus.notesExcerpt}\n` : ""}`
    : "";

  const journeyText = journey && !generalMode ? journeyBlock(journey) : "";

  // In general mode we don't show studentStateBlock either — there's no
  // useful exam-scoped data to reference.
  const dynamicContext = generalMode
    ? `Reply language: ${language}.`
    : `${studentStateBlock(studentState)}
${journeyText ? `\n${journeyText}\n` : ""}${focusBlock ? `\n${focusBlock}\n` : ""}
Reply language: ${language}.

If you suggest follow-up actions to the student, append a single line in this format:
<<ACTIONS>>{"actions":[{"kind":"TAKE_MOCK","topicCode":"quant.percentage","reason":"...","priority":1}]}<<END>>
Skip if no clear next step.`;

  // Build the conversation. History first, then the user's new message with the dynamic context block.
  const messages: Anthropic.Messages.MessageParam[] = [
    ...history.map((t) => ({ role: t.role, content: t.content })),
    { role: "user" as const, content: `${dynamicContext}\n\n---\n\nUser: ${userMessage}` },
  ];

  let finalText = "";
  let toolTurns = 0;

  while (true) {
    const start = Date.now();
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: TOKEN_LIMITS.tutor,
      system: systemBlocks,
      messages,
      tools: ctx ? tutorTools : undefined,
    });

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
      // Soft-cap: tell the model to wrap up.
      messages.push({
        role: "user",
        content: "Tool budget exhausted. Answer the student now using what you already know.",
      });
      // One last call without tools to force a text answer.
      const wrap = await anthropic.messages.create({
        model: MODEL,
        max_tokens: TOKEN_LIMITS.tutor,
        system: systemBlocks,
        messages,
      });
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
