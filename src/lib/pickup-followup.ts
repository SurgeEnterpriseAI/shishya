// One tap from "Pick up where you left off" into the reopened chat (30 Sep
// 2026) — the client-safe half of src/lib/pickup.ts.
//
// The card (home, dashboard, the member strip on an enrolled hub) and the
// next-day line in the Daily-5 / coach-morning mails link to the member's
// own saved conversation (/chat?…&session=<id>, src/lib/recent-chats.ts) with
// one of three FIXED follow-ups in ?f=:
//   • f=answer — the conversation's last message never got a reply: the chat
//     re-sends it through its own Retry (body.retry + turnId — the route
//     answers on the same row, src/lib/chat-turn-dedupe.ts), once;
//   • f=practice — "Give me 3 practice questions on this", sent once as an
//     ordinary turn under the last complete reply;
//   • f=next — a mistake review's "Next mistake" (REVIEW_CHIPS), the same.
// Never free text from the URL: the key picks one of our own strings (listed
// in src/lib/tutor-templates.ts EXACT, so the tutor's memory and demand
// mining never take them for the student's words). The follow-up fires only
// on a reopened conversation (never with a seed, never a school chat), only
// when the chat's state fits it (a follow-up never lands under an unanswered
// question; a retry only when the last turn is retryable), once per tab
// (sessionStorage key) and the param leaves the URL, so a reload never
// sends it again.
//
// Pure — imported by the chat island, the chat page and tests.
// Tests: tests/unit/pickup.test.ts

import { REVIEW_CHIPS, resumeSessionParam } from "@/lib/recent-chats";
import { retryableTurn } from "@/lib/chat-reply-status";
import type { CopyLocale } from "@/lib/ui-locale-copy";

export type PickupFollowUp = "answer" | "practice" | "next";

/** The query param the card and the mail links carry. */
export const FOLLOW_UP_PARAM = "f";

const KINDS: readonly PickupFollowUp[] = ["answer", "practice", "next"];

/** The practice follow-up, exactly as sent (en / hi / te). */
export const PRACTICE_FOLLOW_UP: Readonly<Record<CopyLocale, string>> = {
  en: "Give me 3 practice questions on this",
  hi: "इस पर मुझे 3 अभ्यास प्रश्न दीजिए",
  te: "దీనిపై నాకు 3 ప్రాక్టీస్ ప్రశ్నలు ఇవ్వండి",
};

/** The words a follow-up sends, or null for the retry (it re-sends the student's own turn). */
export function followUpText(kind: PickupFollowUp, lang: CopyLocale): string | null {
  if (kind === "practice") return PRACTICE_FOLLOW_UP[lang];
  if (kind === "next") return REVIEW_CHIPS[lang][0];
  return null;
}

/** The follow-up a /chat URL asks for — only alongside a conversation it
 *  reopens (a valid ?session=, no seed); anything else is ignored. */
export function pickupFollowUpParam(sp: { f?: string | null; session?: string | null; seed?: string | null }): PickupFollowUp | null {
  if (!resumeSessionParam(sp)) return null;
  const f = typeof sp.f === "string" ? sp.f.trim() : "";
  return (KINDS as readonly string[]).includes(f) ? (f as PickupFollowUp) : null;
}

interface Bubble {
  id?: string;
  role: "user" | "assistant";
  content: string;
  failed?: boolean;
  turnId?: string;
}

export type FollowUpAction = { type: "retry" } | { type: "send"; text: string };

/**
 * What the reopened chat does with the follow-up, or null (nothing):
 *   • answer → a retry, only when the last turn is retryable (its reply is
 *     missing or failed) — an answered chat gets nothing;
 *   • practice / next → the fixed words, only under a complete reply — never
 *     stacked on a question still waiting for its answer.
 * Never while busy or when the chat is closed (school cap, under-13 line).
 */
export function followUpAction(a: {
  kind: PickupFollowUp | null | undefined;
  messages: readonly Bubble[];
  busy: boolean;
  closed: boolean;
  lang: CopyLocale;
}): FollowUpAction | null {
  if (!a.kind || a.busy || a.closed) return null;
  if (a.kind === "answer") return retryableTurn(a.messages) ? { type: "retry" } : null;
  const last = a.messages[a.messages.length - 1];
  if (!last || last.role !== "assistant" || last.failed || !last.content.trim()) return null;
  const text = followUpText(a.kind, a.lang);
  return text ? { type: "send", text } : null;
}

/** sessionStorage key: one follow-up per conversation state per tab. */
export function followUpOnceKey(sessionId: string, kind: PickupFollowUp, messages: readonly Bubble[]): string {
  const last = messages[messages.length - 1];
  return `shishya_pickup_f:${sessionId}:${kind}:${last?.id ?? messages.length}`;
}

/** The URL without ?f= (null when it had none or cannot be parsed). */
export function stripFollowUpParam(href: string): string | null {
  try {
    const u = new URL(href);
    if (!u.searchParams.has(FOLLOW_UP_PARAM)) return null;
    u.searchParams.delete(FOLLOW_UP_PARAM);
    return u.toString();
  } catch {
    return null;
  }
}
