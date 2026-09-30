// A guest's tutor chat → the account it signs in to.
//
// 16 Sep 2026: when a guest tapped the chat's save card ("sign in, free"),
// ChatInterface kept the finished turns in localStorage (GUEST_CHAT_KEY) for
// 30 minutes, and the same chat, opened signed in, posted them once to
// /api/chat/import — which saves only the turns the chat route itself
// logged for this browser.
//
// 30 Sep 2026 (sign-up build 2; audit: 1 save tap since 16 Sep and 0
// imports ever, while the chat page's own top line "Sign in free to save
// your chats" saved nothing):
//   • ANY sign-in the guest starts from the chat keeps it — the save card
//     (now a full-width button, after the first reply), the page's top
//     "Sign in free" line, the header's Sign in: ChatInterface listens for
//     a click on any link to /login (isLoginLink);
//   • the import runs once after that sign-in on WHICHEVER page the browser
//     lands — the Header's WelcomeStrip island (src/components/
//     WelcomeStrip.tsx) — not only back on the same chat. The verified turns
//     then stay here, marked with the new session's id, until the 30 minutes
//     run out, so the chat page shows and continues that conversation
//     ("restore") and the strip can link it.
// Unchanged: nothing is kept unless the guest pressed sign-in on the chat —
// a guest who just leaves must never have the chat land in the next account
// on a shared phone (review, 16 Sep 2026); the 30-minute TTL; the server
// check. Never for a school chat (it has no save), never after the under-13
// line closed the chat (ChatInterface drops the key), and nothing runs on a
// Class 1-7 page (the caller passes childPath).
//
// Pure decisions first (tests/unit/guest-chat-carry.test.ts), guarded DOM
// wrappers after. No DOM access at import.

export const GUEST_CHAT_KEY = "shishya_guest_chat";
/** How long after the sign-in tap the account may pick the chat up. */
export const GUEST_CHAT_TTL_MS = 30 * 60_000;
export const GUEST_CHAT_MAX_TURNS = 24;
/** /api/chat/import caps a turn at 8,000 characters. */
const MAX_TURN_CHARS = 8000;

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface KeptGuestChat {
  v: 1;
  examCode: string | null;
  savedAt: number;
  turns: ChatTurn[];
  /** Set once the import saved it: the account's new conversation. */
  importedSessionId?: string;
}

/** The finished exchanges worth keeping: user→assistant pairs only (a
 *  trailing question with no reply and a leading reply are cut), the last 24
 *  turns, none over the import route's size cap. null when no reply is left. */
export function guestChatTail(messages: readonly { role: string; content: string }[]): ChatTurn[] | null {
  const turns: ChatTurn[] = messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && m.content.trim() && m.content.length <= MAX_TURN_CHARS)
    .map((m) => ({ role: m.role as ChatTurn["role"], content: m.content }));
  if (turns.length && turns[turns.length - 1].role === "user") turns.pop();
  let tail = turns.slice(-GUEST_CHAT_MAX_TURNS);
  if (tail[0]?.role === "assistant") tail = tail.slice(1);
  return tail.some((t) => t.role === "assistant") ? tail : null;
}

/** The stored value, "expired" past the TTL, or null when absent / malformed. */
export function parseKeptGuestChat(raw: string | null | undefined, nowMs: number): KeptGuestChat | "expired" | null {
  if (typeof raw !== "string" || !raw) return null;
  let v: Partial<KeptGuestChat> | null;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!v || v.v !== 1 || !Array.isArray(v.turns) || typeof v.savedAt !== "number") return null;
  if (nowMs - v.savedAt > GUEST_CHAT_TTL_MS) return "expired";
  const turns = v.turns.filter(
    (t): t is ChatTurn => !!t && (t.role === "user" || t.role === "assistant") && typeof t.content === "string",
  );
  return {
    v: 1,
    examCode: typeof v.examCode === "string" ? v.examCode : null,
    savedAt: v.savedAt,
    turns,
    ...(typeof v.importedSessionId === "string" && v.importedSessionId ? { importedSessionId: v.importedSessionId } : {}),
  };
}

export type CarryAction = "none" | "drop" | "import" | "restore";

/** What a SIGNED-IN page does with a kept guest chat.
 *  • "import"  — post it to /api/chat/import now;
 *  • "restore" — the chat page of the same scope shows the already-imported
 *                turns and continues that conversation (no second import);
 *  • "drop"    — expired;
 *  • "none"    — leave it: a Class 1-7 page, another chat's page (it keeps
 *                the key for its own), a seeded chat (it starts its own
 *                turn), or already imported and this is not its chat. */
export function carryDecision(
  kept: KeptGuestChat | "expired" | null,
  where: { childPath: boolean; chatScope?: { examCode: string | null; seeded: boolean } | null },
): CarryAction {
  if (kept === null) return "none";
  if (kept === "expired") return "drop";
  if (where.childPath) return "none";
  const chat = where.chatScope;
  if (!chat) return kept.importedSessionId ? "none" : "import";
  if ((kept.examCode ?? null) !== (chat.examCode ?? null)) return "none";
  if (chat.seeded) return "none";
  return kept.importedSessionId ? "restore" : "import";
}

/** The chat page a kept conversation continues on. */
export function guestChatHref(examCode: string | null): string {
  return examCode ? `/chat?examCode=${encodeURIComponent(examCode)}` : "/chat?general=1";
}

/** True for a link to this site's /login — any sign-in the guest starts. */
export function isLoginLink(href: string | null | undefined, origin: string): boolean {
  if (typeof href !== "string" || !href) return false;
  try {
    const u = new URL(href, origin);
    return u.origin === origin && u.pathname === "/login";
  } catch {
    return false;
  }
}

// ── DOM wrappers (client islands only; every access guarded) ─────────

export function readKeptGuestChat(): KeptGuestChat | "expired" | null {
  try {
    return parseKeptGuestChat(localStorage.getItem(GUEST_CHAT_KEY), Date.now());
  } catch {
    return null;
  }
}

export function dropKeptGuestChat(): void {
  try {
    localStorage.removeItem(GUEST_CHAT_KEY);
  } catch {
    /* storage blocked */
  }
}

/** Keep the finished turns for the sign-in that follows. False when there
 *  is nothing to keep or storage is blocked (the chat still works). */
export function keepGuestChat(examCode: string | null, messages: readonly { role: string; content: string }[]): boolean {
  const turns = guestChatTail(messages);
  if (!turns) return false;
  try {
    const kept: KeptGuestChat = { v: 1, examCode: examCode ?? null, savedAt: Date.now(), turns };
    localStorage.setItem(GUEST_CHAT_KEY, JSON.stringify(kept));
    return true;
  } catch {
    return false;
  }
}

/** After an import on another page: keep the verified turns (same TTL) so
 *  the chat page can restore them. */
export function markGuestChatImported(kept: KeptGuestChat, sessionId: string, turns: ChatTurn[]): void {
  try {
    const next: KeptGuestChat = { ...kept, turns, importedSessionId: sessionId };
    localStorage.setItem(GUEST_CHAT_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked — the conversation is saved server-side all the same */
  }
}

export type ImportOutcome =
  | { status: "imported"; sessionId: string; turns: ChatTurn[] }
  /** Keep the key and try on a later page: signed out after all, rate-limited, server or network error. */
  | { status: "retry" }
  /** Nothing (more) to import: already imported, not verified, over the daily cap. */
  | { status: "done" };

/** POST the kept chat to /api/chat/import once. Never throws. */
export async function postGuestChatImport(kept: KeptGuestChat): Promise<ImportOutcome> {
  try {
    const res = await fetch("/api/chat/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ examCode: kept.examCode ?? null, turns: kept.turns.slice(-GUEST_CHAT_MAX_TURNS) }),
    });
    if (res.status === 401 || res.status === 429 || res.status >= 500) return { status: "retry" };
    const j = res.ok ? await res.json().catch(() => null) : null;
    const turns = Array.isArray(j?.turns)
      ? (j.turns as { role: string; content: string }[])
          .filter((t) => t && typeof t.content === "string")
          .map((t) => ({ role: t.role === "assistant" ? ("assistant" as const) : ("user" as const), content: t.content }))
      : [];
    if (typeof j?.sessionId === "string" && turns.length > 0) return { status: "imported", sessionId: j.sessionId, turns };
    return { status: "done" };
  } catch {
    return { status: "retry" };
  }
}
