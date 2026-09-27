// The study-only pre-filter for POST /api/chat (27 Sep 2026).
//
// The same pre-filter /ask runs (src/lib/ask-scope.ts, src/lib/ask-distress.ts),
// applied to every chat turn — guest or signed in, general, exam or school —
// before any DB work or model call:
//   - distress gets the helpline reply (Tele-MANAS 14416 / 1800-891-4416,
//     Childline 1098, 112), never a lesson;
//   - the unsafe or injection reasons (adult, weapons, violence, drugs,
//     gambling, hacking, "ignore your instructions") get the one-line
//     study-only answer.
// Neither reaches the model. The soft reasons (politics, celebrity,
// entertainment, romance, jokes, chit-chat) DO go to the model, whose scope
// rules (src/lib/ai/prompts.ts SCOPE_RULES) answer them in one friendly line —
// so a mid-chat "ok", "thanks" or "b" (a quiz answer) is never refused with a
// canned reply.
//
// Pure: no DB, no model, no network. Tests: tests/unit/chat-scope.test.ts.

import { askScopeOf, normScope, offTopicReply, type AskLocale, type AskScopeReason } from "@/lib/ask-scope";
import { declaresUnder13, UNDER13_REPLY, under13Locale } from "@/lib/under13";

/** The reasons that never reach the model in a chat. */
export const CHAT_HARD_SCOPE: ReadonlySet<AskScopeReason> = new Set<AskScopeReason>([
  "distress",
  "instructions",
  "adult",
  "weapons",
  "violence",
  "drugs",
  "gambling",
  "hacking",
]);

/**
 * Devanagari first-person "मुझे मरना है" / "मैं मरना चाहता…" — the mirror of
 * the Hinglish "mujhe marna hai" line in src/lib/ask-distress.ts, whose Hindi
 * line only knows "मरना चाहत…" (27 Sep 2026). Written for normScope's form.
 * The shared detector should learn it too (then /ask and the search strip
 * catch it); until then the chat checks it here.
 */
const CHAT_EXTRA_DISTRESS = /(?:मुझे|मुझको|मैं|मै) (?:भी )?(?:मरना|मर जाना) (?:है|हैं|चाहत)/;

/** The `code` on the done event of a pre-filtered reply. */
export const CHAT_SCOPE_CODE = { distress: "scope-distress", offTopic: "scope-off-topic", under13: "scope-under13" } as const;

export interface ChatScopeReply {
  text: string;
  code: string;
}

/**
 * The pre-filtered reply for this message, or null when it may go to the
 * model. `uiLang` is the site UI language; a Devanagari or Telugu message is
 * answered in its own script (ask-scope's scopeReplyLocale).
 */
export function chatScopeReply(message: string, uiLang: AskLocale): ChatScopeReply | null {
  const s = askScopeOf(message);
  const extraDistress = s.distress !== true && CHAT_EXTRA_DISTRESS.test(normScope(message));
  // Under 13 (27 Sep 2026, founder: below 13, content only and no data): a
  // first-person "I am 11" / "I am in class 6" gets the fixed 13-and-above
  // line, never reaches the model, and the route stores nothing
  // (src/lib/under13.ts). Distress always comes first.
  if (!extraDistress && s.distress !== true && declaresUnder13(message)) {
    return { text: UNDER13_REPLY[under13Locale(message, uiLang)], code: CHAT_SCOPE_CODE.under13 };
  }
  if (!extraDistress && (s.inScope || !s.reason || !CHAT_HARD_SCOPE.has(s.reason))) return null;
  const distress = extraDistress || s.distress === true;
  return {
    text: offTopicReply(uiLang, { question: message, distress }).answer,
    code: distress ? CHAT_SCOPE_CODE.distress : CHAT_SCOPE_CODE.offTopic,
  };
}

/** A pre-filtered reply as a normal stream: delta + done (no meta: nothing is stored). */
export function chatScopeFrames(r: ChatScopeReply): string {
  return (
    `event: delta\ndata: ${JSON.stringify(r.text)}\n\n` +
    `event: done\ndata: ${JSON.stringify({ messageId: "scope", actions: [], toolCalls: [], code: r.code })}\n\n`
  );
}
