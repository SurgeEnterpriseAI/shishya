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
  TUTOR_FACT_RULES,
  TURN_FACT_REMINDER,
  SAFETY_RULES,
  SCOPE_RULES,
  SIGNIN_NUDGE,
  GENERAL_MODE_NOTE,
  syllabusBlock,
  studentStateBlock,
  journeyBlock,
} from "./prompts";
import type { TutorInput, TutorOutput } from "./types";
import { tutorTools, executeTool, FIND_QUESTIONS_MAX, type ToolContext } from "./tools";
import { isEnglishOnly, localRouteFor, streamLocal, ReplyStreamFilter, LOCAL_MODEL, type LocalToolCall } from "./local-llm";
import { indicLanguageRule, indicReplyProblem } from "./indic-reply-guard";
import { routeTutorTurn, unsupportedFacts } from "./tutor-router";
import { groundFromBank, groundingBlock } from "./grounding";
import { cleanActions, gateUnit, takeSentences, type GateStats } from "./sentence-gate";
import { prisma } from "@/lib/db/prisma";
import { gradeAnswers, gradingBlock, gradingConsistent, loadGradedQuestions, parseAnswerTurn, shownQuestionIds, type GradedAnswer } from "./answer-grading";
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

// 17 Oct 2026: practice questions on Claude come from the checked bank too.
// On 13 Oct only Qwen got this rule (LOCAL_TOOL_RULES below, "Claude does
// neither"), but Claude wrote its own MCQs when asked for "20 questions",
// "quiz me" or "one easy question to start" — 51 of 66 recent quiz answers
// were to questions the tutor wrote itself, which answer-grading.ts cannot
// mark (no verified key). Its first sentence is LOCAL_TOOL_RULES' own. Part
// of the signed-in guide, so every model and the late-answer run get it;
// guest, general and school chats have their own line (prompts.ts
// SIGNIN_NUDGE, GENERAL_MODE_NOTE; the school persona).
export const PRACTICE_FROM_BANK_RULE = `Practice questions come only from Shishya's checked bank
- Any practice question you show must come from find_questions_on_topic, shown exactly as returned with its options A-D; never write your own question. Shishya marks answers only against the bank's verified key, so a question you write is never answer-checked. This holds however the student asks — "give me 20 questions on X", "test me", "quiz", "MCQs", "with timer", "one easy question, then harder" — and in every language.
- Ask the tool for the number the student wants, up to ${FIND_QUESTIONS_MAX}, and show the questions without answers or solutions so they all fit. For "start easy, then harder", fetch one EASY question, then MEDIUM and HARD ones on later turns. For a test, a timed set or more than ${FIND_QUESTIONS_MAX} questions, follow MOCK REQUESTS in the syllabus block (its builder link, where this exam has the builder); you may also offer up to ${FIND_QUESTIONS_MAX} here. A generic "quiz me" with no topic named goes to start_adaptive_quiz.
- If the bank has nothing on that topic, say so plainly in one line — never fill the gap with questions of your own — and offer the nearest real option: a close topic from the syllabus, the mock builder (only where this exam has it) or the exam's mocks, or a walk-through of the concept.
- Teaching is not limited: a worked example of your own inside an explanation is fine — solve it there; do not set it to the student as practice or a quiz.`;

const TOOL_USE_GUIDE = `Tools available
───────────────
You have tools to look up real student data. Use them when relevant — never invent stats.

- get_my_mastery → student's weakest topics (mastery %, attempt count). Call this when asked about weaknesses, what to study, or where to focus.
- get_recent_attempts → last few mock attempts (score, topic mix, date). Call when student references "my last test" or asks about progress.
- find_questions_on_topic → real validated practice questions on a topic, up to ${FIND_QUESTIONS_MAX} per call. Call when student asks "quiz me on X", "give me a question on X", "give me 10 questions on X", or you want to anchor an explanation in a real exam-format question.
- get_attempt_mistakes → questions a student got wrong on a specific attempt. Call when reviewing a past attempt (after get_recent_attempts gave you the attempt_id).
- predict_rank → maps a mock-test percentage to a likely real-exam rank window + the colleges/posts typically reached at that band. Call when student asks "what rank can I get with X%", "will this score get me into [college]", "is my score enough for [post]", or any cut-off/outcome question. If they don't give a score, fetch their latest via get_recent_attempts first.

IMPORTANT — skip tool calls when the user has already supplied the data in their message. Examples:
- "I scored 22.2% on my last RRB NTPC mock, weakest was Time Distance Speed 0/1" → do NOT call get_recent_attempts or get_my_mastery; you already have the data. Answer directly.
- "Explain my mistake on Q4" without an attempt id → ask one short clarifying question rather than spinning up tools.
- "Quiz me on Profit & Loss" → ONE find_questions_on_topic call is enough; don't chain.
Each tool call adds ~5 seconds of latency the student is staring at "Thinking…" — every avoidable call hurts.

When find_questions_on_topic returns a question, present it WITHOUT the answer first. Let the student attempt; only reveal the solution after they respond.

${PRACTICE_FROM_BANK_RULE}`;

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
  // TUTOR_FACT_RULES (13 Oct 2026, prompts.ts): no exam numbers from memory.
  const STATIC_PROMPT = generalMode
    ? `${PLATFORM_PERSONA}\n\n${SCOPE_RULES}\n\n${SAFETY_RULES}\n\n${ANSWER_FORMAT_RULES}\n\n${TUTOR_FACT_RULES}\n\n${SITE_FEATURES}\n\n${GENERAL_MODE_NOTE}`
    : `${PLATFORM_PERSONA}\n\n${SCOPE_RULES}\n\n${SAFETY_RULES}\n\n${ANSWER_FORMAT_RULES}\n\n${TUTOR_FACT_RULES}\n\n${SITE_FEATURES}${toolsOn ? `\n\n${TOOL_USE_GUIDE}` : `\n\n${SIGNIN_NUDGE}`}`;
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
  // TURN_FACT_REMINDER (13 Oct 2026, prompts.ts): exam numbers only from the blocks.
  if (generalMode) return `${journeyText ? `${journeyText}\n\n` : ""}${TURN_FACT_REMINDER}\nReply language: ${language}.`;
  return `${studentStateBlock(studentState)}
${journeyText ? `\n${journeyText}\n` : ""}${focusBlock ? `\n${focusBlock}\n` : ""}
${TURN_FACT_REMINDER}
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
  | { tool: { name: string; args: any; ok: boolean; ms: number; shown?: string[] } }
  | { done: TutorOutput }
> {
  // The request is built by tutorRequest (1 Oct 2026 — moved there unchanged).
  const school = input.school ?? null;
  const ctx = school ? undefined : input.ctx;
  const { system: baseSystem, messages } = tutorRequest(input);
  // 16 Oct 2026: an answer to bank questions the tutor just showed ("b",
  // "1.b 2.c") is graded here against the verified key (ai/answer-grading.ts);
  // whichever model answers gets the grading as a fixed fact.
  let graded: GradedAnswer[] | null = null;
  if (ctx && input.pendingQuestionIds?.length) {
    const answers = parseAnswerTurn(input.userMessage, input.pendingQuestionIds.length);
    if (answers) {
      const qs = await loadGradedQuestions(prisma as never, input.pendingQuestionIds).catch(() => null);
      graded = qs ? gradeAnswers(qs, answers) : null;
    }
  }
  const systemBlocks = graded ? [...baseSystem, { type: "text" as const, text: gradingBlock(graded) }] : baseSystem;

  let finalText = "";
  let toolTurns = 0;
  const feature = input.usage?.feature ?? (school ? "tutor-school" : ctx ? "tutor" : "tutor-anon");

  // 12 Oct 2026: a tools-off English turn on Surge's own server streams the
  // answer piece by piece as the model writes it — Qwen 27B writes ~20
  // tokens/s, so a long explanation took ~70 s behind a spinner. The wait
  // limit covers the first piece only. If the server fails before anything
  // is shown, the turn runs on Claude below as before; a failure after the
  // student has seen text is thrown (the route's honest unavailable line).
  // Two habits of the local model with tools (12 Oct 2026 checks): it wrote
  // part of the answer, looked something up, then wrote it all again; and it
  // sometimes wrote its own practice question instead of fetching a checked
  // one from the bank. Claude does neither, so these rules go to Qwen only.
  // (17 Oct 2026: Claude did write its own questions — the practice rule is
  // now also in the signed-in guide for every model, PRACTICE_FROM_BANK_RULE.)
  const LOCAL_TOOL_RULES =
    "Tool rules: when you need a tool, call it FIRST, before writing anything to the student, and make all the calls you need before you start the answer. " +
    "Any practice question you show must come from find_questions_on_topic, shown exactly as returned with its options A-D; never write your own question.";
  let route = localRouteFor(feature, { system: systemBlocks, messages, tools: ctx ? tutorTools : undefined }, { allowTools: true });
  // A guest turn goes local only under its own name, "tutor-anon": the router
  // eval (13 Oct) had Qwen lose 9 of 14 guest turns, so a listed batch feature
  // such as "tutor-late" (answer-later, hourly) takes only its signed-in turns.
  if (route && !ctx && feature !== "tutor-anon") route = null;
  // 13 Oct 2026 (founder: "local server first; Claude only where it cannot do
  // it or errors; quality not compromised"). Each turn is sorted first
  // (ai/tutor-router.ts, from the 13 Oct audit): kinds the local model loses on
  // go to Claude; a turn that leans on a specific fact is answered locally only
  // with verified bank entries in its prompt (ai/grounding.ts) and is held back
  // until the fact check passes; any other turn streams, one checked sentence at
  // a time (ai/sentence-gate.ts). On whenever the tutor goes local
  // (LOCAL_LLM_FEATURES); LOCAL_LLM_TUTOR_ROUTER=0 turns it off.
  // Router eval, blind Opus judge vs fresh Claude: signed-in 15 wins, 1 tie,
  // 0 losses of 16, criticals Claude 10 vs local 0; guest 5/14 → guest stays
  // on Claude (leave tutor-anon out of LOCAL_LLM_FEATURES).
  const ROUTER_ON = process.env.LOCAL_LLM_TUTOR_ROUTER !== "0";
  // A Hindi/Marathi turn (LOCAL_LLM_INDIC_TUTOR): local because of its
  // language, so the router's language reasons are no reason to leave, and
  // the reply is always held and checked whole.
  const indicTurn = !!route && !isEnglishOnly(systemBlocks, messages);
  let grounding = "";
  let hold = indicTurn;
  const indicRule = indicTurn ? indicLanguageRule(systemBlocks.map((b) => b.text).join("\n")) : null;
  if (route && ROUTER_ON && graded) {
    // A code-graded answer runs local, held and checked whole (it would
    // otherwise be a "very short turn" for Claude).
    hold = true;
  } else if (route && ROUTER_ON) {
    let turn = routeTutorTurn(input.userMessage);
    if (indicTurn && turn.route === "claude" && turn.reasons.every((r) => r === "Hinglish" || r === "asks for an Indian language")) turn = { route: "general", reasons: [] };
    if (turn.route === "claude") {
      console.info(`[local-llm] ${feature}: router → Claude (${turn.reasons.join(", ")})`);
      route = null;
    } else if (turn.route === "fact") {
      const g = await groundFromBank(prisma as never, input.userMessage).catch(() => null);
      if (!g?.items.length) {
        console.info(`[local-llm] ${feature}: router → Claude (a fact turn with no verified bank match)`);
        route = null;
      } else {
        grounding = groundingBlock(g);
        hold = true;
      }
    } else if (turn.route === "check") {
      hold = true;
    }
  }
  if (route) {
    const start = Date.now();
    const filter = new ReplyStreamFilter();
    // The local turn works on its own copy of the conversation: if it falls
    // back before showing anything, the Claude loop below starts clean.
    const convo: Anthropic.Messages.MessageParam[] = [...messages];
    let raw = "";
    let shown = false;
    let localTurns = 0;
    const usage = { input_tokens: 0, output_tokens: 0 };
    // What the checks compare a reply against: the prompt, the grounding, and
    // every message so far — tool results included.
    const contextText = () =>
      [
        ...systemBlocks.map((b) => b.text),
        grounding,
        ...convo.map((m) =>
          typeof m.content === "string"
            ? m.content
            : m.content.map((b: any) => (b.type === "text" ? b.text : b.type === "tool_result" ? (typeof b.content === "string" ? b.content : JSON.stringify(b.content)) : "")).join("\n"),
        ),
      ].join("\n");
    const gate: GateStats = { sentences: 0, dropped: [], repairedLinks: 0 };
    let gateBuf = "";
    let shownText = "";
    const examCode = input.syllabus?.examCode ?? null;
    // A streamed turn under the router: whole sentences only, each checked.
    const release = function* (piece: string, flush = false): Generator<{ delta: string }> {
      if (!ROUTER_ON) {
        if (piece) {
          shownText += piece;
          yield { delta: piece };
        }
        return;
      }
      gateBuf += piece;
      const { done, rest } = flush ? { done: [gateBuf], rest: "" } : takeSentences(gateBuf);
      gateBuf = rest;
      for (const unit of done) {
        const out = gateUnit(unit, contextText(), examCode, gate);
        if (out) {
          shownText += out;
          yield { delta: out };
        }
      }
    };
    try {
      // 12 Oct 2026: the signed-in tutor's tool loop runs here too — each
      // turn streams; when the model calls tools (read-only lookups of the
      // student's own data) they run and the next turn streams on, the same
      // MAX_TOOL_TURNS budget as the Claude loop, then tools are switched off
      // so the model must answer.
      for (;;) {
        let turnText = "";
        let calls: LocalToolCall[] = [];
        const toolsOff = !ctx || localTurns >= MAX_TOOL_TURNS;
        for await (const ev of streamLocal(
          {
            system: [
              ...systemBlocks,
              ...(ctx ? [{ type: "text" as const, text: LOCAL_TOOL_RULES }] : []),
              ...(indicRule ? [{ type: "text" as const, text: indicRule }] : []),
              ...(grounding ? [{ type: "text" as const, text: grounding }] : []),            ],
            messages: convo,
            maxTokens: TOKEN_LIMITS.tutor,
            tools: ctx ? tutorTools : undefined,
            toolChoice: toolsOff ? "none" : "auto",
          },
          route,
        )) {
          if ("usage" in ev) {
            usage.input_tokens += ev.usage.input_tokens;
            usage.output_tokens += ev.usage.output_tokens;
            continue;
          }
          if ("toolCalls" in ev) {
            calls = ev.toolCalls;
            continue;
          }
          // Text of a later turn joins the earlier turns' text the way the
          // Claude loop joins its turns (finalText, "\n").
          const piece = !turnText && raw ? `\n${ev.delta}` : ev.delta;
          turnText += ev.delta;
          raw += piece;
          const out = filter.push(piece);
          // A held (fact) turn shows nothing until the whole reply is checked.
          if (out && !hold) {
            for (const d of release(out)) {
              shown = true;
              yield d;
            }
          }
        }
        if (!ctx || toolsOff || !calls.length) break;
        convo.push({
          role: "assistant",
          content: [
            ...(turnText ? [{ type: "text" as const, text: turnText }] : []),
            ...calls.map((c) => ({ type: "tool_use" as const, id: c.id, name: c.name, input: c.input })),
          ],
        });
        const results: Anthropic.Messages.ToolResultBlockParam[] = [];
        for (const c of calls) {
          const tStart = Date.now();
          const result = await executeTool(ctx, c.name, c.input);
          yield { tool: { name: c.name, args: c.input, ok: result.ok, ms: Date.now() - tStart, shown: shownQuestionIds(c.name, result) } };
          results.push({
            type: "tool_result",
            tool_use_id: c.id,
            content: JSON.stringify(result.ok ? result.data : { error: result.error }),
            is_error: !result.ok,
          });
        }
        // Whatever this turn already wrote has been shown; Qwen tends to
        // start its answer over after a tool result, which showed the same
        // question twice (12 Oct 2026). The note asks it to carry on instead.
        convo.push({
          role: "user",
          content: [
            ...results,
            ...(turnText.trim()
              ? [{ type: "text" as const, text: "(The student has already seen what you wrote above. Continue from where you stopped; do not repeat it.)" }]
              : []),
          ],
        });
        localTurns += 1;
      }
      if (!raw.trim()) throw new Error("local-llm: empty reply");
      let final = splitActions(raw);
      if (hold) {
        // The fact check on the whole reply: anything unsupported → Claude, nothing shown.
        const bad = unsupportedFacts(final.reply, contextText());
        if (bad.length) throw new Error(`fact check: ${bad.slice(0, 3).join(" | ")}`);
        const why = graded ? gradingConsistent(final.reply, graded) : null;
        if (why) throw new Error(`grading check: ${why}`);
        if (indicTurn) {
          const toolText = convo
            .flatMap((m) => (typeof m.content === "string" ? [] : m.content.filter((b: any) => b.type === "tool_result").map((b: any) => (typeof b.content === "string" ? b.content : JSON.stringify(b.content)))))
            .join("\n");
          const problem = indicReplyProblem(final.reply, toolText);
          if (problem) throw new Error(`language check: ${problem}`);
        }
        shown = true;
        shownText = final.reply;
        yield { delta: final.reply };
      } else {
        const rest = filter.finish(final.reply);
        for (const d of release(rest, false)) yield d;
        for (const d of release("", true)) yield d;
      }
      if (ROUTER_ON) {
        final = { ...final, reply: shownText.trim(), suggestedActions: cleanActions(final.suggestedActions, contextText()) };
        if (gate.dropped.length || gate.repairedLinks) {
          console.warn(`[local-llm] ${feature}: gate dropped ${gate.dropped.length} of ${gate.sentences} sentences, repaired ${gate.repairedLinks} links`);
        }
      }
      const cost = recordAiUsage(feature, { usage, model: `local:${LOCAL_MODEL}` }, { model: `local:${LOCAL_MODEL}`, ref: input.syllabus?.examCode ?? null, latencyMs: Date.now() - start });
      input.usage?.onCost?.(cost);
      yield { done: final };
      return;
    } catch (err) {
      if (shown) throw err;
      console.warn(`[local-llm] ${feature}: stream fell back to Claude (${String((err as Error)?.message ?? err).slice(0, 160)})`);
    }
  }

  // 13 Oct 2026: Claude's answer streams too, piece by piece as it is
  // written (it used to arrive whole, then be cut into ~80-char chunks).
  // Text of every turn — before a tool call, after it, the wrap — joins
  // exactly as finalText does, through the same filter as the local route,
  // so the pieces add up to the reply that is stored.
  const filter = new ReplyStreamFilter();
  let streamed = "";
  const show = function* (piece: string): Generator<{ delta: string }> {
    streamed += piece;
    const out = filter.push(piece);
    if (out) yield { delta: out };
  };

  while (true) {
    const start = Date.now();
    // 7 Oct 2026: an empty main balance is retried once on the reserve key
    // for a student's turn (src/lib/ai/reserve.ts); "tutor-late" never is.
    // The retry still works with streaming: the credit error comes back on
    // the request itself, before any piece of the answer.
    const tools = ctx ? tutorTools : undefined;
    const { value: res, reserve } = await withReserve(feature, anthropic, (client) =>
      client.messages.create({ model: MODEL, max_tokens: TOKEN_LIMITS.tutor, system: systemBlocks, messages, tools, stream: true }),
    );
    let response!: Anthropic.Messages.Message;
    for await (const ev of claudeTurn(res)) {
      if ("message" in ev) response = ev.message;
      else yield* show(ev.newBlock && streamed ? `\n${ev.delta}` : ev.delta);
    }
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
      const { value: wrapRes, reserve: wrapReserve } = await withReserve(wrapFeature, anthropic, (client) =>
        client.messages.create({
          model: MODEL,
          max_tokens: TOKEN_LIMITS.tutor,
          system: systemBlocks,
          messages,
          tools: tutorTools,
          tool_choice: { type: "none" },
          stream: true,
        }),
      );
      let wrap!: Anthropic.Messages.Message;
      for await (const ev of claudeTurn(wrapRes)) {
        if ("message" in ev) wrap = ev.message;
        else yield* show(ev.newBlock && streamed ? `\n${ev.delta}` : ev.delta);
      }
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
        tool: { name: tu.name, args: tu.input, ok: result.ok, ms, shown: shownQuestionIds(tu.name, result) },
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

  // The pieces shown so far are the reply up to the end; whatever the final
  // trim leaves over (normally nothing) goes out last.
  const { reply, suggestedActions, citedTopics } = splitActions(finalText);
  if (streamed !== finalText) console.warn("[tutor] streamed text differs from the stored reply");
  const rest = filter.finish(reply);
  if (rest) yield { delta: rest };
  yield { done: { reply, suggestedActions, citedTopics } };
}

/**
 * One Claude turn requested with stream: true, as text pieces and then the
 * whole message (13 Oct 2026). newBlock marks the first piece of each text
 * block, which finalText joins with "\n". A finished message (a client or a
 * test that does not stream) passes through as its text blocks, whole.
 */
async function* claudeTurn(
  res: unknown,
): AsyncGenerator<{ delta: string; newBlock: boolean } | { message: Anthropic.Messages.Message }> {
  if (!res || typeof (res as any)[Symbol.asyncIterator] !== "function") {
    const message = res as Anthropic.Messages.Message;
    for (const b of message.content) if (b.type === "text" && b.text) yield { delta: b.text, newBlock: true };
    yield { message };
    return;
  }
  let message: any = null;
  const blocks: any[] = [];
  const json: string[] = [];
  const started = new Set<number>();
  for await (const ev of res as AsyncIterable<Anthropic.Messages.RawMessageStreamEvent>) {
    switch (ev.type) {
      case "message_start":
        message = { ...ev.message, content: [] };
        break;
      case "content_block_start":
        blocks[ev.index] = { ...ev.content_block };
        if (ev.content_block.type === "tool_use") json[ev.index] = "";
        if (ev.content_block.type === "text" && ev.content_block.text) {
          yield { delta: ev.content_block.text, newBlock: true };
          started.add(ev.index);
        }
        break;
      case "content_block_delta":
        if (ev.delta.type === "text_delta") {
          blocks[ev.index].text = (blocks[ev.index].text ?? "") + ev.delta.text;
          yield { delta: ev.delta.text, newBlock: !started.has(ev.index) };
          started.add(ev.index);
        } else if (ev.delta.type === "input_json_delta") {
          json[ev.index] += ev.delta.partial_json;
        }
        break;
      case "content_block_stop":
        if (blocks[ev.index]?.type === "tool_use") blocks[ev.index].input = json[ev.index] ? JSON.parse(json[ev.index]) : {};
        break;
      case "message_delta":
        message.stop_reason = ev.delta.stop_reason;
        message.stop_sequence = ev.delta.stop_sequence ?? null;
        message.usage = { ...message.usage, ...ev.usage };
        break;
    }
  }
  message.content = blocks.filter(Boolean);
  yield { message: message as Anthropic.Messages.Message };
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
