// Duplicate and failed tutor turns — what POST /api/chat does with a
// signed-in turn before it writes a USER row or calls the model. Guest turns
// are not stored server-side, so they never come here.
//
// 24 Sep 2026 (September data read):
//  • The /chat seed re-sent itself on every mount of the chat: 204 identical
//    re-sends within 30 minutes, 199 of them in a NEW conversation. One
//    student sent the same results-page prompt 25 times from 2 clicks, and
//    the tutor, reading its own history, told them they had taken "five/six
//    mocks in a row". The browser now sends a seed once (chat-seed-once.ts);
//    as a second line, a FRESH chat whose text matches the student's latest
//    message of the last 10 minutes (same exam scope) that already has a
//    reply gets that stored reply replayed — no model call, no second USER
//    row — and carries on in that conversation.
//  • 209 of 1,166 signed-in messages got no reply (credit outages on 19, 21
//    and 22 Sep). When the same text comes again for a turn that never got a
//    reply, its stored USER row is reused, so the history never holds the
//    question twice.
//  • Inside a conversation a repeated text is usually a real turn: 2 of the
//    4 same-conversation repeats in September were "B", answering two quiz
//    questions in a row. There a stored reply is replayed only when the
//    client re-sends the very turn it saw fail (Retry, same turnId).
//
// Review fixes, same day:
//  • A replay must not describe an older state of the student. Replies to
//    the seeds speak about the student's own record ("you haven't taken a
//    mock yet", "your last one scored 31%", "each mistake from this mock");
//    24 of 308 would-be replays in Aug–Sep had an attempt started or
//    finished in between. A fresh-chat repeat is never replayed then
//    (stateChanged) — the tutor answers again.
//  • Retry is tied to the turn that failed (turnId, stored on the USER row).
//    A retry whose send never reached the server would otherwise replay an
//    earlier answered turn with the same text ("B" → "Correct! …" again, as
//    if Q2 had been graded).
//  • The server keeps answering after a dropped connection (the stream's
//    emit guard), so an unanswered USER row may still be being answered.
//    Re-sending it then would pay the model twice and store two replies.
//    Such a row is waited on (the route polls, then replays — settleWait),
//    unless it is marked failed or is older than the longest a turn can run.

/** How far back a fresh chat looks for the same message. */
export const REPLAY_WINDOW_MS = 10 * 60_000;
/**
 * How long an unanswered, not-failed USER row may still be being answered:
 * /api/chat's maxDuration (300 s) plus a margin. Older than this, the run
 * that owned it is gone and the row is simply re-sent.
 */
export const ANSWERING_MS = 330_000;
/** How long a turn waits for another run's reply before telling the student to retry. */
export const WAIT_FOR_ANSWER_MS = 45_000;
/** How often that wait looks for the reply. */
export const WAIT_POLL_MS = 1_500;

/** A stored ChatMessage row, as much of it as the decision needs. */
export interface StoredTurn {
  id: string;
  sessionId: string;
  role: string; // ChatRole: USER | ASSISTANT | SYSTEM | TOOL
  content: string;
  metadata?: unknown;
  createdAt?: Date | string | number;
}

/**
 * What a signed-in USER row's metadata carries (24 Sep 2026): the client's
 * id for the turn, when a re-send of a failed row started answering again,
 * and when the turn last failed. Older rows have none of it.
 */
export interface UserTurnMeta {
  turnId?: string;
  answeringAt?: number;
  failedAt?: number;
}

export type TurnDecision =
  /** Store the USER row and call the model, as always. */
  | { kind: "new" }
  /** A failed turn sent again: keep its USER row, call the model in its conversation. */
  | { kind: "reuse"; sessionId: string; userRowId: string }
  /** Already answered: stream the stored reply, no model call, nothing written. */
  | { kind: "replay"; sessionId: string; reply: StoredTurn }
  /** Another run may still be answering this row: wait for its reply, then decide again. */
  | { kind: "wait"; sessionId: string; userRowId: string };

/** Same turn text — only surrounding whitespace is ignored. */
export function sameTurnText(a: string, b: string): boolean {
  return a.trim() === b.trim();
}

/** The turn fields of a USER row's metadata; anything malformed is dropped. */
export function userTurnMeta(metadata: unknown): UserTurnMeta {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const m = metadata as Record<string, unknown>;
  const out: UserTurnMeta = {};
  if (typeof m.turnId === "string" && m.turnId) out.turnId = m.turnId;
  if (typeof m.answeringAt === "number" && Number.isFinite(m.answeringAt)) out.answeringAt = m.answeringAt;
  if (typeof m.failedAt === "number" && Number.isFinite(m.failedAt)) out.failedAt = m.failedAt;
  return out;
}

function timeOf(v: Date | string | number | undefined): number | null {
  if (v == null) return null;
  const t = v instanceof Date ? v.getTime() : typeof v === "number" ? v : Date.parse(v);
  return Number.isFinite(t) ? t : null;
}

/**
 * True when an unanswered USER row may still be being answered by another
 * run: not marked failed, and (re)sent less than ANSWERING_MS ago. A row
 * with no time to judge by is treated as not in flight.
 */
export function mayStillBeAnswering(row: StoredTurn, now: number): boolean {
  const meta = userTurnMeta(row.metadata);
  if (meta.failedAt != null) return false;
  const since = meta.answeringAt ?? timeOf(row.createdAt);
  return since != null && now - since < ANSWERING_MS;
}

export function decideTurn(input: {
  /** The incoming message text. */
  message: string;
  /** The turn continues a conversation the student owns (the client sent its id). */
  continuing: boolean;
  /** The client is re-sending a turn it saw fail (the "Retry" control). */
  retry: boolean;
  /** The client's id for this turn — the same on a Retry of it. */
  turnId?: string | null;
  /**
   * Fresh chats: an attempt was started or finished after latestUser was
   * stored, so its reply may describe an older state of the student.
   */
  stateChanged?: boolean;
  /** Clock, for the in-flight check. */
  now?: number;
  /**
   * The latest USER row in scope: continuing → that conversation's latest
   * USER row; fresh → the student's latest USER row within REPLAY_WINDOW_MS
   * in a conversation of the same exam scope. Null when there is none.
   */
  latestUser: StoredTurn | null;
  /** The row stored right after latestUser in its conversation, or null. */
  next: StoredTurn | null;
}): TurnDecision {
  const { message, continuing, retry, latestUser, next } = input;
  if (!latestUser || latestUser.role !== "USER" || !sameTurnText(latestUser.content, message)) {
    return { kind: "new" };
  }
  const now = input.now ?? Date.now();
  // The very turn the client saw fail, re-sent by Retry.
  const sameTurn = retry && !!input.turnId && userTurnMeta(latestUser.metadata).turnId === input.turnId;
  // A fresh chat repeating an earlier message (a re-sent seed or starter).
  const freshRepeat = !continuing && !sameTurn;
  const stale = freshRepeat && input.stateChanged === true;

  if (!next) {
    // Nothing after it yet. Still being answered by another run → wait for
    // that reply (unless the student's state moved on since: answer anew).
    if (mayStillBeAnswering(latestUser, now)) {
      return stale ? { kind: "new" } : { kind: "wait", sessionId: latestUser.sessionId, userRowId: latestUser.id };
    }
    // That turn never got a reply — send it again on the same row.
    return { kind: "reuse", sessionId: latestUser.sessionId, userRowId: latestUser.id };
  }
  const answered = next.role === "ASSISTANT" && next.content.trim().length > 0;
  if (!answered) return { kind: "new" };
  // Answered but never shown: the reply to this very turn, whatever changed since.
  if (sameTurn) return { kind: "replay", sessionId: latestUser.sessionId, reply: next };
  // Inside a conversation the same text again is a real turn ("B", "B") —
  // including a Retry of a send that never reached the server.
  if (continuing) return { kind: "new" };
  // A fresh chat re-sending an answered seed / starter gets that reply —
  // unless an attempt since then makes it describe an older state.
  return stale ? { kind: "new" } : { kind: "replay", sessionId: latestUser.sessionId, reply: next };
}

/**
 * A turn that is waiting on another run's answer to the same USER row,
 * looked at again (row and the row after it re-read). The turn arrived while
 * that row was unanswered, so whatever reply lands is the answer to it —
 * even inside a conversation, where the same text is otherwise a new turn.
 */
export function settleWait(row: StoredTurn | null, next: StoredTurn | null, now: number): TurnDecision {
  if (!row || row.role !== "USER") return { kind: "new" };
  if (!next) {
    return mayStillBeAnswering(row, now)
      ? { kind: "wait", sessionId: row.sessionId, userRowId: row.id }
      : { kind: "reuse", sessionId: row.sessionId, userRowId: row.id };
  }
  const answered = next.role === "ASSISTANT" && next.content.trim().length > 0;
  return answered ? { kind: "replay", sessionId: row.sessionId, reply: next } : { kind: "new" };
}

/**
 * The SSE frames for a replayed reply — the live stream's meta / delta /
 * done events, same names and payload shape (done adds replayed: true).
 */
export function replayFrames(sessionId: string, reply: StoredTurn): string[] {
  const meta =
    reply.metadata && typeof reply.metadata === "object" && !Array.isArray(reply.metadata)
      ? (reply.metadata as { actions?: unknown; toolCalls?: unknown })
      : null;
  return [
    `event: meta\ndata: ${JSON.stringify({ sessionId })}\n\n`,
    `event: delta\ndata: ${JSON.stringify(reply.content)}\n\n`,
    `event: done\ndata: ${JSON.stringify({
      messageId: reply.id,
      actions: Array.isArray(meta?.actions) ? meta.actions : [],
      toolCalls: Array.isArray(meta?.toolCalls) ? meta.toolCalls : [],
      replayed: true,
    })}\n\n`,
  ];
}
