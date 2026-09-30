// "Pick up where you left off" (30 Sep 2026) — the pure rules.
//
// Why: the founder's brief (30 Sep 2026) is that a member who comes back the
// next day finds what they wanted waiting. The home "For you" block, the
// dashboard and the hub showed the last result, but never the last question
// the member asked the tutor, nor whether it was ever answered (213 of 1,266
// chats in 31 Aug – 29 Sep, 16.8%, end on the student's message with no
// stored reply — mostly credit outages). Now one card, for signed-in members
// only, on the pages returns start on:
//   • their last tutor question (14 days, their own, real exams or the
//     general chat — never a school chat: those are listed only inside their
//     own class chat, src/lib/db/recent-chats.ts), with its exam and IST day:
//       – answered: "You asked the tutor: …" → "Continue this chat" (the saved
//         conversation, reopened) and ONE follow-up chip ("Give me 3 practice
//         questions on this", or "Next mistake" in a mistake review);
//       – unanswered — ONLY when the stored last row is the student's, or an
//         empty stored reply (the chat shows that as "Not answered" too):
//         "Your question did not get an answer: …" → "Get the answer now"
//         (the conversation reopened, and its own Retry re-sends it once —
//         src/lib/pickup-followup.ts);
//   • their last finished mock on an active real exam (30 days) with its score and
//     its weakest topics (the attempt's own topicScores), each one tap to the
//     tutor with the results page's own per-topic seed.
// Home and dashboard render it on the server (member-only pages); the hub
// gets it as a compact client strip for an enrolled member (GET
// /api/me/pickup), so the hub's public server HTML, title and JSON-LD are
// unchanged and its server time does not grow.
// The next-day mail line (Daily-5 and coach-morning, no new email type):
// the member's own last TYPED tutor question from the last 3 IST days (never
// one of Shishya's prefilled prompts or quick replies), cut to 60 characters,
// HTML-escaped, with a link back into that conversation — skipped when there
// is none.
// Never for Classes 1-7: no school session and no school attempt is read, and
// none of these surfaces is a school page.
//
// Pure — no DB, no React. DB reads: src/lib/db/pickup.ts. Card:
// src/components/PickupCard.tsx. Tests: tests/unit/pickup.test.ts

import {
  RECENT_CHATS_DAYS,
  TITLE_CHARS,
  chatResumeHref,
  chatTitle,
  cutText,
  isMistakeReviewOpener,
  istDayLabel,
  recentChatsCopy,
} from "@/lib/recent-chats";
import { isTypedQuestion } from "@/lib/tutor-memory";
import { FOLLOW_UP_PARAM, followUpText, type PickupFollowUp } from "@/lib/pickup-followup";
import { formatDisplayScorePct } from "@/lib/scoring";
import { asCopyLocale, pickCopy, type CopyLocale } from "@/lib/ui-locale-copy";

/** Look-back for the last tutor question (the Recent chats window). */
export const PICKUP_CHAT_DAYS = RECENT_CHATS_DAYS;
/** Look-back for the last finished mock. */
export const PICKUP_MOCK_DAYS = 30;
/** The question on the card is cut to this many characters. */
export const PICKUP_QUESTION_CHARS = TITLE_CHARS;
/** Weakest topics of the last mock shown. */
export const PICKUP_WEAK_TOPICS = 3;
/** The mail quotes at most this many characters of the question. */
export const EMAIL_QUOTE_CHARS = 60;
/** The mail quotes a question from today or the two IST days before. */
export const EMAIL_QUOTE_MAX_DAYS = 2;

export interface PickupCopy {
  title: string;
  youAsked: string;
  notAnswered: string;
  continueChat: string;
  getAnswer: string;
  lastResult: string;
  weakest: string;
  /** {c} right of {t} */
  right: string;
  askTutor: string;
}

const COPY: Readonly<Record<CopyLocale, PickupCopy>> = {
  en: {
    title: "Pick up where you left off",
    youAsked: "You asked the tutor",
    notAnswered: "Your question did not get an answer",
    continueChat: "Continue this chat →",
    getAnswer: "Get the answer now →",
    lastResult: "Your last result",
    weakest: "Weakest in it",
    right: "{c}/{t} right",
    askTutor: "Ask the tutor →",
  },
  hi: {
    title: "जहाँ छोड़ा था, वहीं से शुरू करें",
    youAsked: "आपने ट्यूटर से पूछा था",
    notAnswered: "आपके सवाल का जवाब नहीं आया था",
    continueChat: "यही बातचीत जारी रखें →",
    getAnswer: "अभी जवाब पाएँ →",
    lastResult: "आपका पिछला परिणाम",
    weakest: "इसमें सबसे कमज़ोर",
    right: "{t} में से {c} सही",
    askTutor: "ट्यूटर से पूछें →",
  },
  te: {
    title: "మీరు ఆపిన చోటు నుంచే కొనసాగించండి",
    youAsked: "మీరు ట్యూటర్‌ను అడిగారు",
    notAnswered: "మీ ప్రశ్నకు సమాధానం రాలేదు",
    continueChat: "ఈ చాట్ కొనసాగించండి →",
    getAnswer: "ఇప్పుడే సమాధానం పొందండి →",
    lastResult: "మీ చివరి ఫలితం",
    weakest: "ఇందులో బలహీనమైనవి",
    right: "{t}లో {c} సరైనవి",
    askTutor: "ట్యూటర్‌ను అడగండి →",
  },
};

export function pickupCopy(locale: string | null | undefined): PickupCopy {
  return pickCopy(COPY, locale);
}

/** The member's most recent conversation, as src/lib/db/pickup.ts reads it. */
export interface PickupThread {
  sessionId: string;
  /** Null = the general chat. */
  examCode: string | null;
  examShort: string | null;
  /** The last stored row's time. */
  lastAt: Date;
  /** The last stored row (USER / ASSISTANT only). */
  lastRole: string;
  lastContent: string;
  /** The conversation's first question (it names a mistake review). */
  opener: string | null;
  /** The student's latest row in it. */
  lastUser: string | null;
  /** The student's latest row that they typed themselves (not one of our prompts). */
  lastTyped: string | null;
  reviewMockTitle: string | null;
}

/** The member's last finished mock, as src/lib/db/pickup.ts reads it. */
export interface PickupMock {
  attemptId: string;
  mockTitle: string;
  scorePct: number | null;
  finishedAt: Date;
  examCode: string;
  examShort: string;
  /** Attempt.topicScores: { topicId: { topicCode, topicName, correct, total, score } }. */
  topicScores: unknown;
}

export interface PickupData {
  thread: PickupThread | null;
  mock: PickupMock | null;
}

/** What the card renders — plain strings and links, serialisable (the hub strip gets it as JSON). */
export interface PickupView {
  title: string;
  question: {
    answered: boolean;
    label: string;
    text: string;
    /** "SSC CGL · yesterday" */
    meta: string;
    primary: { href: string; label: string };
    followUp: { href: string; label: string } | null;
  } | null;
  mock: {
    attemptId: string;
    label: string;
    title: string;
    score: string;
    meta: string;
    href: string;
    weakLabel: string;
    weak: Array<{ key: string; name: string; detail: string; href: string; label: string }>;
  } | null;
}

/** The conversation's last message got no answer: the stored last row is the
 *  student's, or an empty stored reply (the chat shows both as "Not answered"). */
export function isUnansweredLast(role: string | null | undefined, content: string | null | undefined): boolean {
  if (role === "USER") return true;
  return role === "ASSISTANT" && !(content ?? "").trim();
}

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m));
}

function withParam(href: string, key: string, value: string): string {
  return `${href}${href.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(value)}`;
}

/** The question the card quotes. Unanswered: exactly the message that got
 *  no answer (a mistake review's own seed reads as its title, "Mistake
 *  review: <mock>") — never an earlier question that WAS answered. Answered:
 *  the student's latest typed question; else the conversation's honest title
 *  (a mistake review names its mock; any other chat its first question).
 *  Never invented. */
export function pickupQuestionText(t: PickupThread, locale: string | null | undefined): string {
  const rc = recentChatsCopy(locale);
  const title = () => chatTitle({ opener: t.opener ?? t.lastUser, reviewMockTitle: t.reviewMockTitle }, rc);
  if (isUnansweredLast(t.lastRole, t.lastContent)) {
    const waiting = (t.lastUser ?? "").trim();
    return waiting && !isMistakeReviewOpener(waiting) ? cutText(waiting, PICKUP_QUESTION_CHARS) : title();
  }
  return t.lastTyped && isTypedQuestion(t.lastTyped) ? cutText(t.lastTyped, PICKUP_QUESTION_CHARS) : title();
}

/** The attempt's weakest topics (a topic with at least one miss), lowest
 *  share right first, then most missed; at most `limit`. Unknown shapes → []. */
export function weakTopicsOf(
  topicScores: unknown,
  limit = PICKUP_WEAK_TOPICS,
): Array<{ code: string; name: string; correct: number; total: number }> {
  if (!topicScores || typeof topicScores !== "object" || Array.isArray(topicScores)) return [];
  const out: Array<{ code: string; name: string; correct: number; total: number }> = [];
  for (const v of Object.values(topicScores as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const r = v as Record<string, unknown>;
    const code = typeof r.topicCode === "string" ? r.topicCode : "";
    const name = typeof r.topicName === "string" ? r.topicName.trim() : "";
    const correct = Number(r.correct);
    const total = Number(r.total);
    if (!code || !name || !Number.isFinite(correct) || !Number.isFinite(total) || total <= 0 || correct >= total || correct < 0) continue;
    out.push({ code, name, correct, total });
  }
  return out
    .sort((a, b) => a.correct / a.total - b.correct / b.total || b.total - b.correct - (a.total - a.correct) || a.name.localeCompare(b.name))
    .slice(0, Math.max(0, limit));
}

/** The results page's own per-topic seed (src/app/attempts/[id]/results/page.tsx),
 *  so the tutor's memory knows it as a weak topic the student chose to ask about. */
export function weakTopicSeed(examShort: string, t: { name: string; correct: number; total: number }): string {
  return `On my last ${examShort} mock I got ${t.correct}/${t.total} on ${t.name}. Help me improve on this topic.`;
}

/** The card, or null when there is nothing to pick up. `now` sets the IST day labels. */
export function pickupView(data: PickupData | null | undefined, locale: string | null | undefined, now: Date): PickupView | null {
  if (!data || (!data.thread && !data.mock)) return null;
  const c = pickupCopy(locale);
  const rc = recentChatsCopy(locale);
  const lang = asCopyLocale(locale);

  let question: PickupView["question"] = null;
  const t = data.thread;
  if (t) {
    const answered = !isUnansweredLast(t.lastRole, t.lastContent);
    const href = chatResumeHref({ examCode: t.examCode, sessionId: t.sessionId });
    const followKind: PickupFollowUp = isMistakeReviewOpener(t.opener) ? "next" : "practice";
    const followLabel = followUpText(followKind, lang);
    question = {
      answered,
      label: answered ? c.youAsked : c.notAnswered,
      text: pickupQuestionText(t, locale),
      meta: [t.examShort || rc.general, istDayLabel(t.lastAt, now, rc)].join(" · "),
      primary: answered
        ? { href, label: c.continueChat }
        : { href: withParam(href, FOLLOW_UP_PARAM, "answer"), label: c.getAnswer },
      followUp: answered && followLabel ? { href: withParam(href, FOLLOW_UP_PARAM, followKind), label: followLabel } : null,
    };
  }

  let mock: PickupView["mock"] = null;
  const m = data.mock;
  if (m) {
    mock = {
      attemptId: m.attemptId,
      label: c.lastResult,
      title: m.mockTitle,
      score: formatDisplayScorePct(m.scorePct),
      meta: [m.examShort, istDayLabel(m.finishedAt, now, rc)].join(" · "),
      href: `/attempts/${encodeURIComponent(m.attemptId)}/results`,
      weakLabel: c.weakest,
      weak: weakTopicsOf(m.topicScores).map((w) => ({
        key: w.code,
        name: w.name,
        detail: fill(c.right, { c: w.correct, t: w.total }),
        label: c.askTutor,
        href: `/chat?examCode=${encodeURIComponent(m.examCode)}&topicCode=${encodeURIComponent(w.code)}&seed=${encodeURIComponent(weakTopicSeed(m.examShort, w))}`,
      })),
    };
  }
  return { title: c.title, question, mock };
}

// ── The next-day mail line ─────────────────────────────────────────────

/** A recent question the member asked, as the mail loader reads it. */
export interface EmailQuestionRow {
  sessionId: string;
  /** Null = the general chat. */
  examCode: string | null;
  content: string;
  createdAt: Date;
  /** A non-empty tutor reply is stored after it in its conversation. */
  answered: boolean;
  /** No later student row in its conversation — so the reopened chat's Retry
   *  (which re-sends the LAST student turn) would ask exactly this question. */
  isLastUser: boolean;
}

/** The member's latest question they typed themselves, from rows newest
 *  first — Shishya's prefilled prompts and quick replies are skipped. */
export function pickEmailQuestion(rowsNewestFirst: readonly EmailQuestionRow[]): EmailQuestionRow | null {
  return rowsNewestFirst.find((r) => isTypedQuestion(r.content)) ?? null;
}

/** The quote: control characters out, whitespace collapsed, at most EMAIL_QUOTE_CHARS characters.
 *  The bidi controls (U+200E/F, U+202A–E, U+2066–9) are written as escapes
 *  (review, 30 Sep 2026): typed literally they are invisible, so a reader
 *  could not see what the class strips (the "Trojan Source" pattern). */
export function emailQuote(text: string | null | undefined): string {
  // eslint-disable-next-line no-control-regex
  const clean = (text ?? "").replace(/[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, " ");
  return cutText(clean, EMAIL_QUOTE_CHARS);
}

/** HTML-escape for the mail body (quotes too — the link sits in an attribute). */
export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const IST_MS = 5.5 * 3600_000;
const istDayNo = (ms: number) => Math.floor((ms + IST_MS) / 86_400_000);

/**
 * The line both morning mails carry, or null (no question, an empty quote, or
 * older than EMAIL_QUOTE_MAX_DAYS IST days, or dated after `now`).
 * An unanswered question links with f=answer — the reopened chat's own
 * Retry asks it again once — but only when it is still the conversation's
 * last student turn: Retry re-sends the LAST one, so after a later prompt
 * (say a quick reply that also got no answer) f=answer would ask that prompt,
 * not the quoted question. Then the line is the neutral "pick up where you
 * left off" with the plain link (review, 30 Sep 2026). The link carries
 * utm_content=pickup; sendEmail adds utm_source / utm_medium / utm_campaign
 * to every shishya.in link itself (src/lib/email.ts withMailUtm).
 */
export function pickupEmailLine(q: EmailQuestionRow | null | undefined, now: Date): { text: string; html: string } | null {
  if (!q) return null;
  const quote = emailQuote(q.content);
  if (!quote) return null;
  const days = istDayNo(now.getTime()) - istDayNo(q.createdAt.getTime());
  if (days < 0 || days > EMAIL_QUOTE_MAX_DAYS) return null;
  const when = days === 0 ? "Earlier today" : days === 1 ? "Yesterday" : "Two days ago";
  const retryable = !q.answered && q.isLastUser;
  let href = chatResumeHref({ examCode: q.examCode, sessionId: q.sessionId });
  if (retryable) href = withParam(href, FOLLOW_UP_PARAM, "answer");
  const url = `https://shishya.in${withParam(href, "utm_content", "pickup")}`;
  const text = retryable
    ? `💬 ${when} you asked the tutor: “${quote}” — it did not get an answer then. Get the answer now: ${url}`
    : `💬 ${when} you asked the tutor: “${quote}” — pick up where you left off: ${url}`;
  const html = `<p style="font-size:13px;line-height:1.6;margin:14px 0 0;color:#334155;">💬 ${when} you asked the tutor: <em>“${escapeHtml(quote)}”</em><br><a href="${escapeHtml(url)}" style="color:#c2410c;font-weight:600;text-decoration:none;">${
    retryable ? "It did not get an answer then — get the answer now →" : "Pick up where you left off →"
  }</a></p>`;
  return { text, html };
}
