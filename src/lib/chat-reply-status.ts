// A tutor reply that failed — with no text at all, or cut off part-way — and
// the error codes /api/chat sends so the chat can speak the student's
// language instead of the route's English.
//
// 25 Sep 2026 (September data read, batch 2): "Not answered — Retry"
// (24 Sep, src/lib/chat-turn-dedupe.ts) appeared only on an EMPTY reply
// bubble. A reply that streamed some text and then errored, or whose stream
// just stopped with no done event, sat there looking finished, with no way
// to ask again. Now any reply without a done event is marked failed: an
// empty one reads "Not answered", a partial one keeps its text and reads
// "Reply incomplete", and both offer Retry on the latest turn. Retry replaces
// that bubble and re-sends the same turnId, so the server keeps the 24 Sep
// semantics (reuse the failed USER row, wait for a still-running answer, or
// replay the reply that was stored after the connection dropped).
//
// The wait-then-give-up error ("Your earlier message is still being
// answered…") was English-only; the route now sends code "still-answering"
// with it, and the chat shows its own en/hi/te line for that code, falling
// back to the server's text for anything it does not know.
//
// Pure — no DOM, no React. Tests: tests/unit/chat-reply-status.test.ts

export type ChatUiLang = "en" | "hi" | "te";

/** As much of a chat bubble as these rules need. */
export interface ReplyBubble {
  role: "user" | "assistant";
  content: string;
  /** The reply ended without a done event (error, outage, dropped stream). */
  failed?: boolean;
  /** User turns: the turn's id, re-sent by its Retry. */
  turnId?: string;
}

/** The latest bubble, when it is a reply, marked failed — empty or partial alike. */
export function withLastReplyFailed<T extends ReplyBubble>(messages: T[]): T[] {
  const last = messages[messages.length - 1];
  if (!last || last.role !== "assistant" || last.failed) return messages;
  return [...messages.slice(0, -1), { ...last, failed: true }];
}

/**
 * How a failed reply reads: "not-answered" (no text arrived) or "incomplete"
 * (some text arrived, then the stream failed). Null for anything else.
 */
export function failedReplyKind(m: ReplyBubble): "not-answered" | "incomplete" | null {
  if (m.role !== "assistant" || !m.failed) return null;
  return m.content.trim() ? "incomplete" : "not-answered";
}

/**
 * The turn Retry re-sends, or null: only the latest bubble can be retried in
 * place, and only a failed reply that follows its question.
 */
export function retryableTurn(messages: readonly ReplyBubble[]): { text: string; turnId?: string } | null {
  const last = messages[messages.length - 1];
  const prev = messages[messages.length - 2];
  if (!last || failedReplyKind(last) == null || !prev || prev.role !== "user") return null;
  return { text: prev.content, turnId: prev.turnId };
}

/** Whether bubble i shows the Retry control (it is the one retryableTurn would re-send). */
export function canRetryAt(messages: readonly ReplyBubble[], i: number): boolean {
  return i === messages.length - 1 && retryableTurn(messages) != null;
}

/**
 * A reply stream is complete only when its done event arrived and no error
 * event did. A stream that just stops (a dropped connection) is not.
 */
export function replyStreamFailed(seen: { done: boolean; error: boolean }): boolean {
  return seen.error || !seen.done;
}

/** Stable codes on /api/chat error events (the `code` field next to `error`). */
export const CHAT_ERROR_CODE = {
  /** Another run is still answering this turn; the wait for it ran out. */
  stillAnswering: "still-answering",
} as const;

/** The chat's own copy for each code. `en` is also what the route sends as text. */
export const CHAT_ERROR_COPY: Record<(typeof CHAT_ERROR_CODE)[keyof typeof CHAT_ERROR_CODE], Record<ChatUiLang, string>> = {
  "still-answering": {
    en: "Your earlier message is still being answered. Tap Retry again in a moment to see the reply.",
    hi: "आपके पिछले संदेश का जवाब अभी तैयार हो रहा है। जवाब देखने के लिए थोड़ी देर में \"फिर से भेजें\" दोबारा दबाएँ।",
    te: "మీ మునుపటి సందేశానికి సమాధానం ఇంకా సిద్ధమవుతోంది. సమాధానం చూడటానికి కొద్దిసేపటి తర్వాత \"మళ్లీ పంపండి\" నొక్కండి.",
  },
};

/**
 * The text to show for an /api/chat error event: the chat's own line for a
 * known code in the UI language, else the server's text, else the fallback.
 */
export function chatErrorText(payload: unknown, lang: ChatUiLang, fallback: string): string {
  const p = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, unknown>) : null;
  const code = typeof p?.code === "string" ? p.code : null;
  if (code && Object.prototype.hasOwnProperty.call(CHAT_ERROR_COPY, code)) {
    const copy = CHAT_ERROR_COPY[code as keyof typeof CHAT_ERROR_COPY];
    return copy[lang] ?? copy.en;
  }
  if (typeof p?.error === "string" && p.error.trim()) return p.error;
  return fallback;
}
