// Saved tutor chats a member can reopen (30 Sep 2026, "the tutor remembers").
//
// Why: 0 of 606 member tutor-days in the 30 days to 29 Sep continued a chat
// started on an earlier day — every /chat load started blank, and nothing
// listed or reopened a stored ChatSession, although the sign-up pitch says
// "Your mocks, scores and chats are saved" (src/lib/signup-pitch.ts). Now:
//   • /chat?session=<id> reopens the member's own conversation — its last
//     RESUME_TURNS rows, oldest first — and the next message continues it
//     (POST /api/chat already continues body.sessionId after its owner and
//     scope checks). Only in the conversation's own scope: a general chat on
//     /chat?general=1, an exam chat on /chat?examCode=<its exam>, a Class
//     8-12 school chat only inside that class's school chat. A seeded URL
//     never attaches to an old conversation (resumeSessionParam).
//   • The signed-in empty state lists the member's recent chats (14 days, up
//     to 5) with honest titles: the first question cut to 80 characters, a
//     results-page opener as "Mistake review: <mock>", the exam, the IST day
//     and "no reply yet" when the last stored row is the student's. The
//     dashboard lists them too (non-school only).
//   • A mistake review keeps going: after each complete tutor reply the chat
//     offers three quick replies (REVIEW_CHIPS), each an ordinary turn, and
//     the results page reopens an existing review of that attempt instead of
//     starting another.
//
// Pure — no DB, no React; imported by the chat island, pages and tests.
// DB reads: src/lib/db/recent-chats.ts. Tests: tests/unit/recent-chats.test.ts

import { MISTAKE_REVIEW_OPENER } from "@/lib/tutor-templates";
import { pickCopy, type CopyLocale } from "@/lib/ui-locale-copy";

/** Look-back for the Recent chats lists (by last activity). */
export const RECENT_CHATS_DAYS = 14;
/** How many chats the /chat empty state lists. */
export const RECENT_CHATS_LIMIT = 5;
/** How many chats the dashboard lists. */
export const DASHBOARD_CHATS_LIMIT = 3;
/** Rows a reopened chat loads — the same window POST /api/chat sends the model. */
export const RESUME_TURNS = 30;
/** A title is the first question cut to this many characters. */
export const TITLE_CHARS = 80;
/** A continued conversation's updatedAt is moved at most this often, so the
 *  lists order by last use without a write on every turn. */
export const SESSION_TOUCH_MS = 30 * 60_000;

/** ChatSession ids: cuid, or a UUID for an imported guest chat. */
const SESSION_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
/** Attempt ids (cuid). */
const ATTEMPT_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

export interface RecentChatsCopy {
  heading: string;
  continue: string;
  /** {mock} = the mock's title, or mockOf. */
  mistakeReview: string;
  /** {exam} = the exam's short name. */
  mockOf: string;
  /** The scope label of a general chat. */
  general: string;
  today: string;
  yesterday: string;
  /** {n} = whole IST days. */
  daysAgo: string;
  noReply: string;
  /** Above a reopened chat. {when} = today / yesterday / N days ago. */
  resumedNote: string;
  newChat: string;
  /** Dashboard: the link to the full list on the tutor page. */
  moreInTutor: string;
  /** Results page: the tutor button when a review of this attempt exists. */
  continueReview: string;
  /** Results page, under it. {when} as above. */
  continueReviewNote: string;
}

/** {name} placeholders — local, so the chat island does not pull in the i18n dictionary. */
function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, name: string) => (Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : m));
}

const COPY: Readonly<Record<CopyLocale, RecentChatsCopy>> = {
  en: {
    heading: "Your recent chats",
    continue: "Continue",
    mistakeReview: "Mistake review: {mock}",
    mockOf: "{exam} mock",
    general: "General",
    today: "today",
    yesterday: "yesterday",
    daysAgo: "{n} days ago",
    noReply: "no reply yet",
    resumedNote: "Your saved chat · last active {when}",
    newChat: "New chat",
    moreInTutor: "More in Ask Shishya →",
    continueReview: "Continue your mistake review →",
    continueReviewNote: "You started this review {when}. It opens where you left off.",
  },
  hi: {
    heading: "आपकी हाल की बातचीत",
    continue: "जारी रखें",
    mistakeReview: "गलतियों की समीक्षा: {mock}",
    mockOf: "{exam} मॉक",
    general: "सामान्य",
    today: "आज",
    yesterday: "कल",
    daysAgo: "{n} दिन पहले",
    noReply: "अभी जवाब नहीं आया",
    resumedNote: "आपकी सेव बातचीत · आख़िरी बार {when}",
    newChat: "नई बातचीत",
    moreInTutor: "Ask Shishya में और देखें →",
    continueReview: "गलतियों की समीक्षा जारी रखें →",
    continueReviewNote: "यह समीक्षा आपने {when} शुरू की थी। यह वहीं से खुलेगी जहाँ आपने छोड़ा था।",
  },
  te: {
    heading: "మీ ఇటీవలి చాట్‌లు",
    continue: "కొనసాగించండి",
    mistakeReview: "తప్పుల సమీక్ష: {mock}",
    mockOf: "{exam} మాక్",
    general: "సాధారణ",
    today: "ఈరోజు",
    yesterday: "నిన్న",
    daysAgo: "{n} రోజుల క్రితం",
    noReply: "ఇంకా సమాధానం రాలేదు",
    resumedNote: "మీ సేవ్ అయిన చాట్ · చివరిసారి {when}",
    newChat: "కొత్త చాట్",
    moreInTutor: "Ask Shishya లో మరిన్ని →",
    continueReview: "తప్పుల సమీక్ష కొనసాగించండి →",
    continueReviewNote: "ఈ సమీక్షను మీరు {when} మొదలుపెట్టారు. మీరు ఆపిన చోటు నుంచే తెరుచుకుంటుంది.",
  },
};

export function recentChatsCopy(locale: string | null | undefined): RecentChatsCopy {
  return pickCopy(COPY, locale);
}

/** The mistake review's quick replies, shown under each complete tutor reply.
 *  Each is sent as an ordinary student turn, exactly as written; the same
 *  strings are in src/lib/tutor-templates.ts EXACT, so demand mining and the
 *  tutor's memory never take them for the student's own questions. */
export const REVIEW_CHIPS: Readonly<Record<CopyLocale, readonly [string, string, string]>> = {
  en: ["Next mistake", "Give me a similar question", "Explain it more simply"],
  hi: ["अगली गलती", "ऐसा ही एक और सवाल दीजिए", "इसे और आसान तरीके से समझाइए"],
  te: ["తర్వాతి తప్పు", "ఇలాంటి ఇంకో ప్రశ్న ఇవ్వండి", "దీన్ని ఇంకా సులభంగా వివరించండి"],
};

/** Whitespace collapsed, cut to `max` characters (code points) with "…". */
export function cutText(text: string | null | undefined, max: number): string {
  const s = (text ?? "").replace(/\s+/g, " ").trim();
  const chars = Array.from(s);
  return chars.length > max ? chars.slice(0, Math.max(1, max - 1)).join("").trimEnd() + "…" : s;
}

/** True when a chat's first question is the results page's mistake-review seed. */
export function isMistakeReviewOpener(text: string | null | undefined): boolean {
  return MISTAKE_REVIEW_OPENER.test((text ?? "").trim());
}

/** The exam short name a mistake-review opener names ("SSC CGL"), or null. */
export function mistakeReviewExam(text: string | null | undefined): string | null {
  const m = MISTAKE_REVIEW_OPENER.exec((text ?? "").trim());
  return m ? m[1].trim() : null;
}

/** The review tag POST /api/chat writes on a conversation started from a
 *  results page: which attempt it reviews, and that mock's title. */
export interface ReviewTag {
  attemptId: string;
  mockTitle: string | null;
}

/** ChatSession.contextSnapshot → its review tag, or null. */
export function reviewTagOf(snapshot: unknown): ReviewTag | null {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return null;
  const s = snapshot as Record<string, unknown>;
  if (typeof s.reviewAttemptId !== "string" || !s.reviewAttemptId) return null;
  return {
    attemptId: s.reviewAttemptId,
    mockTitle: typeof s.reviewMockTitle === "string" && s.reviewMockTitle.trim() ? s.reviewMockTitle.trim() : null,
  };
}

/** The contextSnapshot a new review conversation is created with. */
export function reviewSnapshot(tag: ReviewTag): { reviewAttemptId: string; reviewMockTitle?: string } {
  return { reviewAttemptId: tag.attemptId, ...(tag.mockTitle ? { reviewMockTitle: cutText(tag.mockTitle, 120) } : {}) };
}

/** A chat's title: a mistake review names its mock; anything else is the
 *  first question, cut to TITLE_CHARS. Never invented: no question, no title. */
export function chatTitle(
  chat: { opener: string | null | undefined; reviewMockTitle?: string | null },
  copy: RecentChatsCopy,
): string {
  const opener = (chat.opener ?? "").trim();
  if (isMistakeReviewOpener(opener)) {
    const exam = mistakeReviewExam(opener);
    const mock = chat.reviewMockTitle?.trim() || (exam ? fill(copy.mockOf, { exam }) : "");
    return cutText(fill(copy.mistakeReview, { mock }), TITLE_CHARS);
  }
  return cutText(opener, TITLE_CHARS);
}

const IST_MS = 5.5 * 3600_000;
const istDay = (ms: number) => Math.floor((ms + IST_MS) / 86_400_000);

/** "today" / "yesterday" / "N days ago", by IST calendar day. */
export function istDayLabel(at: Date, now: Date, copy: RecentChatsCopy): string {
  const d = istDay(now.getTime()) - istDay(at.getTime());
  if (d <= 0) return copy.today;
  if (d === 1) return copy.yesterday;
  return fill(copy.daysAgo, { n: d });
}

/** Where a conversation continues: its own scope, with the session named. */
export function chatResumeHref(chat: { examCode: string | null; sessionId: string }): string {
  const sid = encodeURIComponent(chat.sessionId);
  return chat.examCode
    ? `/chat?examCode=${encodeURIComponent(chat.examCode)}&session=${sid}`
    : `/chat?general=1&session=${sid}`;
}

/** The session a /chat URL asks to reopen, or null. A seeded URL starts its
 *  own conversation and never attaches to an old one; a malformed id is
 *  ignored. */
export function resumeSessionParam(sp: { session?: string | null; seed?: string | null }): string | null {
  if (sp.seed && sp.seed.trim()) return null;
  const id = typeof sp.session === "string" ? sp.session.trim() : "";
  return SESSION_ID_RE.test(id) ? id : null;
}

/** The attempt a results-page seed reviews (/chat?…&review=<attemptId>), or null. */
export function reviewAttemptParam(sp: { review?: string | null; seed?: string | null }): string | null {
  if (!sp.seed || !sp.seed.trim()) return null;
  const id = typeof sp.review === "string" ? sp.review.trim() : "";
  return ATTEMPT_ID_RE.test(id) ? id : null;
}

/** Whether this /chat URL is already the conversation's own scope (else the
 *  page redirects there once — never in a loop: the target IS canonical). */
export function isResumeUrlCanonical(
  sp: { examCode?: string | null; general?: string | null },
  chat: { examCode: string | null },
): boolean {
  if (chat.examCode == null) return sp.general === "1";
  return sp.general !== "1" && sp.examCode === chat.examCode;
}

/** A stored row, as the resume loader reads it. */
export interface StoredChatRow {
  id: string;
  role: string;
  content: string;
  metadata?: unknown;
}

/** A bubble of a reopened chat — the chat island's Message shape. */
export interface ResumeBubble {
  id: string;
  role: "user" | "assistant";
  content: string;
  failed?: boolean;
  turnId?: string;
  /** A reply the late-answer run stored after an outage (1 Oct 2026, src/lib/tutor-late-answer.ts). */
  lateAnswer?: boolean;
}

function turnIdOf(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return undefined;
  const t = (metadata as Record<string, unknown>).turnId;
  return typeof t === "string" && t ? t : undefined;
}

/** A stored reply the late-answer run wrote (metadata.lateAnswer === true). */
export function isLateAnswerRow(metadata: unknown): boolean {
  return !!metadata && typeof metadata === "object" && !Array.isArray(metadata) && (metadata as Record<string, unknown>).lateAnswer === true;
}

/** A late answer the student has not opened yet (no lateSeenAt): the pick-up card still leads with it. */
export function isUnseenLateAnswer(metadata: unknown): boolean {
  return isLateAnswerRow(metadata) && (metadata as Record<string, unknown>).lateSeenAt == null;
}

/**
 * Stored rows (oldest first) → the bubbles the chat shows. A question with no
 * stored reply after it gets an empty failed reply ("Not answered"; on the
 * latest turn the chat's Retry re-sends it with its own turnId, which the
 * route answers on the same row — src/lib/chat-turn-dedupe.ts). An empty
 * stored reply reads the same way. The window can open on a reply whose
 * question fell outside it; those leading replies are dropped, as the route
 * drops them from the model's history.
 */
export function historyToBubbles(rows: readonly StoredChatRow[]): ResumeBubble[] {
  const out: ResumeBubble[] = [];
  let i = 0;
  while (i < rows.length && rows[i].role !== "USER") i++;
  for (; i < rows.length; i++) {
    const r = rows[i];
    if (r.role === "USER") {
      const turnId = turnIdOf(r.metadata);
      out.push({ id: `h-${r.id}`, role: "user", content: r.content, ...(turnId ? { turnId } : {}) });
      const next = rows[i + 1];
      if (!next || next.role === "USER") out.push({ id: `h-${r.id}-none`, role: "assistant", content: "", failed: true });
    } else {
      const text = r.content ?? "";
      // 1 Oct 2026: a late answer says so on its bubble ("Answered later — …").
      const late = text.trim() && isLateAnswerRow(r.metadata) ? { lateAnswer: true } : {};
      out.push({ id: `h-${r.id}`, role: "assistant", content: text, ...(text.trim() ? {} : { failed: true }), ...late });
    }
  }
  return out;
}

/** Whether the review's quick replies show: a mistake review (never a school
 *  chat), not busy, the chat open, and the latest bubble a complete reply —
 *  so a failed reply never collects chips, and they never stack. */
export function reviewChipsVisible(a: {
  reviewMode: boolean;
  school: boolean;
  busy: boolean;
  closed: boolean;
  messages: readonly { role: "user" | "assistant"; content: string; failed?: boolean }[];
}): boolean {
  if (!a.reviewMode || a.school || a.busy || a.closed) return false;
  const last = a.messages[a.messages.length - 1];
  return !!last && last.role === "assistant" && !last.failed && last.content.trim().length > 0;
}

/** Whether a continued conversation's updatedAt should move now (see SESSION_TOUCH_MS). */
export function shouldTouchSession(updatedAt: unknown, nowMs: number): boolean {
  return updatedAt instanceof Date && !Number.isNaN(updatedAt.getTime()) && nowMs - updatedAt.getTime() >= SESSION_TOUCH_MS;
}

/** "Your saved chat · last active yesterday" */
export function resumedNoteText(lastAt: Date, now: Date, copy: RecentChatsCopy): string {
  return fill(copy.resumedNote, { when: istDayLabel(lastAt, now, copy) });
}

/** "You started this review yesterday. It opens where you left off." */
export function continueReviewNoteText(startedAt: Date, now: Date, copy: RecentChatsCopy): string {
  return fill(copy.continueReviewNote, { when: istDayLabel(startedAt, now, copy) });
}

/** What the chat island gets for a reopened conversation. */
export interface ChatResume {
  sessionId: string;
  messages: ResumeBubble[];
  note: string;
  /** This scope's chat with no conversation named. */
  newChatHref: string;
  newChatLabel: string;
  /** Its first question is the results page's mistake-review seed (the quick replies show). */
  mistakeReview: boolean;
}

export function chatResumeView(
  chat: { id: string; rows: readonly StoredChatRow[]; lastAt: Date; opener: string | null },
  newChatHref: string,
  copy: RecentChatsCopy,
  now: Date,
): ChatResume {
  return {
    sessionId: chat.id,
    messages: historyToBubbles(chat.rows),
    note: resumedNoteText(chat.lastAt, now, copy),
    newChatHref,
    newChatLabel: copy.newChat,
    mistakeReview: isMistakeReviewOpener(chat.opener),
  };
}

/** What the chat island gets for its Recent chats list (empty state). */
export interface RecentChatsList {
  heading: string;
  continueLabel: string;
  items: RecentChatItem[];
}

/** One conversation as the DB loader returns it for the lists. */
export interface RecentChatRow {
  id: string;
  examCode: string | null;
  examShort: string | null;
  opener: string;
  lastAt: Date;
  /** The last stored row's role — "USER" means the student's last message has no reply. */
  lastRole: string;
  reviewMockTitle: string | null;
}

/** One line of a Recent chats list. */
export interface RecentChatItem {
  id: string;
  title: string;
  /** "SSC CGL · yesterday · no reply yet" */
  meta: string;
  href: string;
  unanswered: boolean;
}

export function recentChatItem(row: RecentChatRow, copy: RecentChatsCopy, now: Date): RecentChatItem {
  const unanswered = row.lastRole === "USER";
  const parts = [row.examShort || copy.general, istDayLabel(row.lastAt, now, copy)];
  if (unanswered) parts.push(copy.noReply);
  return {
    id: row.id,
    title: chatTitle({ opener: row.opener, reviewMockTitle: row.reviewMockTitle }, copy),
    meta: parts.join(" · "),
    href: chatResumeHref({ examCode: row.examCode, sessionId: row.id }),
    unanswered,
  };
}

export function recentChatsList(rows: readonly RecentChatRow[], copy: RecentChatsCopy, now: Date): RecentChatsList {
  return { heading: copy.heading, continueLabel: copy.continue, items: rows.map((r) => recentChatItem(r, copy, now)) };
}
