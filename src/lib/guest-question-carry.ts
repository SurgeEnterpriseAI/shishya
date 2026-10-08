// A guest's unanswered tutor question → the account it signs up to
// (7 Oct 2026, build B6 of the sign-up calendar).
//
// Why: when the AI tutor is unavailable (src/lib/tutor-unavailable.ts) a
// member's question is saved and answered later in its own conversation
// (src/lib/tutor-late-answer.ts), but a guest got only "saved in this browser
// — ask again in a little while": a dead end, while every guest is exactly the
// person a sign-up door is for. Now:
//   1. the guest's failure notice offers the standing sign-up door
//      (src/app/chat/GuestQuestionDoor.tsx: the line "Sign up free and we'll
//      answer this question here as soon as the tutor is back." over the white
//      "Sign up with Google" button) — only when guestQuestionDoor() says so:
//      the "tutor-unavailable-guest" code with the route's `carry: true` (the
//      log row will name this browser's shishya_anon cookie — review, same day:
//      a seeded first turn can arrive before the cookie is set, and its row
//      could never be verified), this browser KEPT the question (the
//      carry rides in localStorage across the Google sign-in: without storage
//      there is no promise), nothing of the reply streamed (the server checks
//      a failed guest turn = a log row with no reply), never a school chat
//      (Class 8-12: no sign-up offer there; Class 1-7 has no chat), never once
//      the under-13 line closed the chat, never on a kids' exam chat
//      (src/lib/signin-cta.ts chatQuestionDoorAllowed);
//   2. a press on the door — or on any /login link of the chat while the door
//      is up (the header's Sign in, the save card: the chat's capture
//      listener) — copies the question to its own key for 30 minutes (the
//      guest chat carry's TTL and rule: nothing is carried unless the guest
//      pressed sign-in on that chat, so a shared phone never hands the next
//      account a question it did not ask);
//   3. signed in, the chat page of the same scope (src/app/chat/ChatInterface.tsx)
//      — or the Header's WelcomeStrip on any other page — posts it ONCE to
//      POST /api/chat/carry-question, which takes nothing on the client's word:
//      the text must match a FAILED guest turn (an AnonTutorLog row with no
//      reply) the chat route logged for this browser's shishya_anon cookie, same
//      exam scope, in the last 6 hours, not answered by a later guest turn of
//      the same text (pickFailedGuestTurn). It stores the logged text as a USER
//      ChatMessage marked as the chat route marks a member's AI-unavailable
//      failure (carriedQuestionMeta: failedAt, sentAt = when the guest asked,
//      latePromised, the reply language, the topic) — the very row the
//      late-answer run picks — in a new conversation, or at the end of the
//      guest chat the same sign-in just imported (/api/chat/import);
//   4. the chat shows it as "Not answered — Retry" with the line "Your question
//      is saved to your account. We'll answer it here as soon as our AI tutor is
//      back — or press Retry to try now." (Retry re-sends that very row: the
//      route's own turnId match, src/lib/chat-turn-dedupe.ts.) Review, same
//      day: when the server does not save it after all (the log row was not
//      written, the day's cap), the chat puts the question back in the box,
//      unsent, with "Your question from earlier is in the box" — never lost.
// The guest turn's failure reason is not stored server-side (AnonTutorLog has
// no column for it), so the row carries no failedReason; latePromised is the
// promise, exactly what the late-answer run's selection reads.
// The copy is a guest turn already counted in AnonTutorLog: its conversation
// carries contextSnapshot.source = "guest-import" (CARRY_SESSION_SOURCE), so
// the site's question counters (src/lib/live-counts-server.ts
// GUEST_IMPORT_SOURCE) count it once.
//
// Pure decisions first (tests/unit/guest-question-carry.test.ts), guarded DOM
// wrappers after. No DOM access at import, no Prisma.

import { GUEST_CHAT_TTL_MS } from "@/lib/guest-chat-carry";
import { chatQuestionDoorAllowed } from "@/lib/signin-cta";
import { TUTOR_UNAVAILABLE_CODE } from "@/lib/tutor-unavailable";

/** localStorage key: the question a sign-up was started for (one at a time). */
export const GUEST_QUESTION_CARRY_KEY = "shishya_guest_question_carry";
/** How long after the sign-up press the account may pick the question up (= the guest chat carry). */
export const GUEST_QUESTION_CARRY_TTL_MS = GUEST_CHAT_TTL_MS;
/** The failed guest turn must be this recent (= the browser's own keep, GUEST_UNANSWERED_TTL_MS, and /api/chat/import's window). */
export const CARRY_LOG_WINDOW_MS = 6 * 3600_000;
/** Carried questions per account per 24 hours. */
export const CARRY_MAX_PER_DAY = 3;
/** = GUEST_IMPORT_SOURCE (src/lib/live-counts-server.ts) and /api/chat/import's IMPORT_SOURCE: a copy of a guest turn. */
export const CARRY_SESSION_SOURCE = "guest-import";
/** = /api/chat's message limit (and the guest log's userMessage cap). */
const MAX_TEXT = 2000;
/** The late-answer run keeps only these shapes (src/lib/tutor-late-answer.ts lateTurnMeta). */
export const CARRY_TOPIC_CODE_RE = /^[A-Za-z0-9_.-]{1,80}$/;
export const CARRY_REPLY_LANG_RE = /^[A-Za-z]{2,3}$/;
const EXAM_CODE_RE = /^[A-Za-z0-9_-]{1,40}$/;

// ── The door ───────────────────────────────────────────────────────────

/** Whether the guest's failure notice offers the sign-up door (see the header, step 1). */
export function guestQuestionDoor(a: {
  /** The error event's code. */
  code: unknown;
  /** The error event said the server can carry this turn (`carry: true`:
   *  its log row names this browser's shishya_anon cookie and holds no
   *  reply — 7 Oct 2026 review: a seeded first turn can beat the beacon that
   *  sets the cookie, and its row could never be verified). */
  carriable: boolean;
  /** This browser kept the question (keepGuestUnanswered returned true). */
  kept: boolean;
  /** Some of the reply streamed before the failure (the guest log then holds it: not a failed turn). */
  streamed: boolean;
  /** A guest chat (the page passed guestSignInHref). */
  guest: boolean;
  school: boolean;
  under13: boolean;
  /** The chat's exam; null = the general chat. */
  examCode: string | null;
}): boolean {
  if (a.code !== TUTOR_UNAVAILABLE_CODE.guest || !a.carriable) return false;
  if (!a.guest || a.school || a.under13 || !a.kept || a.streamed) return false;
  return chatQuestionDoorAllowed(a.examCode);
}

// ── The kept question ──────────────────────────────────────────────────

export interface KeptQuestionCarry {
  v: 1;
  text: string;
  /** The chat's scope: an exam code, or null for the general chat. */
  examCode: string | null;
  /** The topic the chat was opened on (the late answer's focus), or null. */
  topicCode: string | null;
  /** When the sign-up was pressed. */
  savedAt: number;
}

/** The stored value, "expired" past the TTL, or null when absent / malformed. */
export function parseQuestionCarry(raw: string | null | undefined, nowMs: number): KeptQuestionCarry | "expired" | null {
  if (typeof raw !== "string" || !raw) return null;
  let v: Partial<KeptQuestionCarry> | null;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!v || v.v !== 1 || typeof v.text !== "string" || !v.text.trim() || typeof v.savedAt !== "number") return null;
  if (nowMs - v.savedAt > GUEST_QUESTION_CARRY_TTL_MS || nowMs < v.savedAt) return "expired";
  return {
    v: 1,
    text: v.text.trim().slice(0, MAX_TEXT),
    examCode: typeof v.examCode === "string" && EXAM_CODE_RE.test(v.examCode) ? v.examCode : null,
    topicCode: typeof v.topicCode === "string" && CARRY_TOPIC_CODE_RE.test(v.topicCode) ? v.topicCode : null,
    savedAt: v.savedAt,
  };
}

export type QuestionCarryAction = "none" | "drop" | "post";

/** What a SIGNED-IN page does with a kept question.
 *  • "post" — send it to /api/chat/carry-question now;
 *  • "drop" — expired;
 *  • "none" — leave it: a Class 1-7 page, another chat's page (it keeps the
 *             key for its own), or a seeded chat (it starts its own turn). */
export function questionCarryDecision(
  kept: KeptQuestionCarry | "expired" | null,
  where: { childPath: boolean; chatScope?: { examCode: string | null; seeded: boolean } | null },
): QuestionCarryAction {
  if (kept === null) return "none";
  if (kept === "expired") return "drop";
  if (where.childPath) return "none";
  const chat = where.chatScope;
  if (!chat) return "post";
  if ((kept.examCode ?? null) !== (chat.examCode ?? null)) return "none";
  return chat.seeded ? "none" : "post";
}

// ── The server's check (POST /api/chat/carry-question) ─────────────────

/** An AnonTutorLog row as the route reads it. */
export interface GuestLogRow {
  id: string;
  userMessage: string;
  reply: string | null;
  createdAt: Date;
}

/**
 * The failed guest turn this question is (the newest), or null. A failed
 * guest turn is logged by the chat route with no reply; one answered by a
 * later guest turn of the same text (the guest asked again and got it) is not
 * carried — the guest already has the answer.
 */
export function pickFailedGuestTurn(logs: readonly GuestLogRow[], text: string, nowMs: number): GuestLogRow | null {
  const want = (text ?? "").trim().slice(0, MAX_TEXT);
  if (!want) return null;
  const same = logs
    .filter((l) => l.userMessage.trim() === want)
    .filter((l) => {
      const t = l.createdAt.getTime();
      return Number.isFinite(t) && t <= nowMs && nowMs - t <= CARRY_LOG_WINDOW_MS;
    })
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  let picked: GuestLogRow | null = null;
  for (const l of same) {
    if (l.reply == null || l.reply === "") picked = l;
    else if (picked && l.createdAt.getTime() > picked.createdAt.getTime()) picked = null;
  }
  return picked;
}

/** The USER row's metadata: what the chat route's markTurnFailed writes for a
 *  member's AI-unavailable failure, plus where the copy came from. */
export function carriedQuestionMeta(a: {
  turnId: string;
  nowMs: number;
  /** When the guest asked (the log row) — the start of the late answer's 72 hours. */
  askedAt: Date;
  replyLang?: string | null;
  topicCode?: string | null;
  logId: string;
}): Record<string, string | number | boolean> {
  return {
    turnId: a.turnId,
    failedAt: a.nowMs,
    sentAt: a.askedAt.getTime(),
    latePromised: true,
    // The door promised an answer here, never an email.
    emailPromised: false,
    ...(a.replyLang && CARRY_REPLY_LANG_RE.test(a.replyLang) ? { replyLang: a.replyLang } : {}),
    ...(a.topicCode && CARRY_TOPIC_CODE_RE.test(a.topicCode) ? { topicCode: a.topicCode } : {}),
    guestLogId: a.logId,
    carriedAt: a.nowMs,
  };
}

/** Where the question goes: the guest chat this sign-in just imported — the
 *  account's own conversation of the same scope, made by /api/chat/import, whose
 *  last turn is older than the question — or else a new conversation (null). */
export function appendTarget(
  s: { userId: string; examId: string | null; contextSnapshot: unknown; lastMessageAt: Date | null } | null,
  want: { userId: string; examId: string | null; askedAt: Date },
): boolean {
  if (!s || s.userId !== want.userId || (s.examId ?? null) !== (want.examId ?? null)) return false;
  const snap = s.contextSnapshot && typeof s.contextSnapshot === "object" && !Array.isArray(s.contextSnapshot) ? (s.contextSnapshot as Record<string, unknown>) : null;
  if (snap?.source !== CARRY_SESSION_SOURCE || typeof snap.firstLogId !== "string") return false;
  return s.lastMessageAt != null && s.lastMessageAt.getTime() < want.askedAt.getTime();
}

/** The saved conversation's own page (= src/lib/recent-chats.ts chatResumeHref,
 *  restated so the header's island does not load that module). */
export function carriedQuestionHref(examCode: string | null, sessionId: string): string {
  const sid = encodeURIComponent(sessionId);
  return examCode ? `/chat?examCode=${encodeURIComponent(examCode)}&session=${sid}` : `/chat?general=1&session=${sid}`;
}

// ── DOM wrappers (client islands only; every access guarded) ─────────

/** Keep the question for the sign-up that follows. False when storage is blocked. */
export function keepGuestQuestionCarry(q: { text: string; examCode: string | null; topicCode?: string | null }): boolean {
  const text = (q.text ?? "").trim().slice(0, MAX_TEXT);
  if (!text) return false;
  try {
    const kept: KeptQuestionCarry = {
      v: 1,
      text,
      examCode: q.examCode ?? null,
      topicCode: q.topicCode && CARRY_TOPIC_CODE_RE.test(q.topicCode) ? q.topicCode : null,
      savedAt: Date.now(),
    };
    localStorage.setItem(GUEST_QUESTION_CARRY_KEY, JSON.stringify(kept));
    return true;
  } catch {
    return false;
  }
}

export function readGuestQuestionCarry(): KeptQuestionCarry | "expired" | null {
  try {
    return parseQuestionCarry(localStorage.getItem(GUEST_QUESTION_CARRY_KEY), Date.now());
  } catch {
    return null;
  }
}

export function dropGuestQuestionCarry(): void {
  try {
    localStorage.removeItem(GUEST_QUESTION_CARRY_KEY);
  } catch {
    /* storage blocked */
  }
}

export type QuestionCarryOutcome =
  | { status: "saved"; sessionId: string; turnId: string | null; text: string }
  /** Keep the key and try on a later page: signed out after all, rate-limited, server or network error. */
  | { status: "retry" }
  /** Nothing to carry: not verified, over the daily cap, not allowed here. */
  | { status: "done" };

/** POST the kept question once (into `sessionId` — a guest chat just imported — when given). Never throws. */
export async function postGuestQuestionCarry(kept: KeptQuestionCarry, sessionId?: string | null): Promise<QuestionCarryOutcome> {
  try {
    const res = await fetch("/api/chat/carry-question", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ examCode: kept.examCode ?? null, text: kept.text, topicCode: kept.topicCode ?? null, sessionId: sessionId ?? null }),
    });
    if (res.status === 401 || res.status === 429 || res.status >= 500) return { status: "retry" };
    const j = res.ok ? await res.json().catch(() => null) : null;
    if (j?.saved === true && typeof j.sessionId === "string" && typeof j.text === "string" && j.text) {
      return { status: "saved", sessionId: j.sessionId, turnId: typeof j.turnId === "string" ? j.turnId : null, text: j.text };
    }
    return { status: "done" };
  } catch {
    return { status: "retry" };
  }
}
