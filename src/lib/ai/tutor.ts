// AI Tutor (chat)
// ────────────────
// Conversational tutor. Knows the syllabus, the student's weakness map,
// recent attempts. Replies in the student's preferred language. Can suggest
// follow-up actions (take a topic mock, study a concept, etc.).
//
// Streams over the wire; the route handler should pipe to the client.

import Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODEL, cachedSystem, TOKEN_LIMITS } from "./client";
import { PLATFORM_PERSONA, ANSWER_FORMAT_RULES, SAFETY_RULES, syllabusBlock, studentStateBlock } from "./prompts";
import type { TutorInput, TutorOutput } from "./types";

/** Non-streaming version — use for tests / one-shot calls. */
export async function tutorReply(input: TutorInput): Promise<TutorOutput> {
  const { studentState, syllabus, history, userMessage, language } = input;

  const systemBlocks = cachedSystem(
    PLATFORM_PERSONA,
    SAFETY_RULES,
    ANSWER_FORMAT_RULES,
    syllabusBlock(syllabus)
  );

  const dynamicContext = `${studentStateBlock(studentState)}

Reply language: ${language}.

If you want to suggest follow-up actions to the student, end your reply with a JSON line like:
<<ACTIONS>>{"actions":[{"kind":"TAKE_MOCK","topicCode":"quant.percentage","reason":"...","priority":1}]}<<END>>

Only include the ACTIONS block if you have a clear, useful next step. Skip otherwise.`;

  const messages: Anthropic.Messages.MessageParam[] = [
    ...history.map((t) => ({ role: t.role, content: t.content })),
    { role: "user" as const, content: `${dynamicContext}\n\n---\n\nUser: ${userMessage}` },
  ];

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: TOKEN_LIMITS.tutor,
    system: systemBlocks,
    messages,
  });

  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const { reply, suggestedActions, citedTopics } = splitActions(text);
  return { reply, suggestedActions, citedTopics };
}

/** Streaming version — yields text deltas; final chunk includes parsed actions. */
export async function* tutorStream(
  input: TutorInput
): AsyncGenerator<{ delta?: string; done?: TutorOutput }> {
  const { studentState, syllabus, history, userMessage, language } = input;

  const systemBlocks = cachedSystem(
    PLATFORM_PERSONA,
    SAFETY_RULES,
    ANSWER_FORMAT_RULES,
    syllabusBlock(syllabus)
  );
  const dynamicContext = `${studentStateBlock(studentState)}\n\nReply language: ${language}.`;

  const messages: Anthropic.Messages.MessageParam[] = [
    ...history.map((t) => ({ role: t.role, content: t.content })),
    { role: "user" as const, content: `${dynamicContext}\n\n---\n\nUser: ${userMessage}` },
  ];

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: TOKEN_LIMITS.tutor,
    system: systemBlocks,
    messages,
  });

  let acc = "";
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      acc += event.delta.text;
      yield { delta: event.delta.text };
    }
  }
  const final = await stream.finalMessage();
  // ensure we use the canonical text in case streaming missed anything
  const text =
    final.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n") || acc;
  const { reply, suggestedActions, citedTopics } = splitActions(text);
  yield { done: { reply, suggestedActions, citedTopics } };
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
