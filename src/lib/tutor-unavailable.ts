// "Our AI tutor is unavailable right now" (1 Oct 2026) — the pure, client-safe
// half: why a tutor turn failed, the words the chat shows for it, and the
// guest's own copy of an unanswered question in this browser.
//
// Why (1 Oct 2026 read): when the organisation's Anthropic credit hit zero,
// every tutor call failed 0.3-0.5 s after it started. 30 Sep 06:47-12:01
// IST: 12 member questions from 7 people (4 of them signed up that day)
// failed and NONE was ever answered; 3 guest turns too. 28 Sep 09:21-11:35:
// 9 of 17 failed. The chat said "briefly unavailable, try again" and the
// question was simply left there. Founder brief: a student should find
// tomorrow what they asked today; two-actor rule: every handoff needs "how
// does the other side know?". So now:
//   • a member's question that failed because the AI was unavailable (credit,
//     auth, overload, rate limit, 5xx, timeout, network — never a bug of
//     ours) is kept, and a late-answer run (/api/cron/tutor-answer-later,
//     src/lib/tutor-late-answer.ts) answers it in the same conversation once
//     the AI is back; the chat says exactly that — and "and email you" ONLY
//     when the account can receive our mails (src/lib/db/tutor-answer-email.ts:
//     an address, not unsubscribed, not a school-only account, no such mail
//     in the last 24 hours; never for a school chat);
//   • a guest's question is kept in THIS browser (localStorage, 6 hours, the
//     chat's own scope) and put back in the box when the guest returns — no
//     late answer and no email for guests (nothing server-side knows who they
//     are); when the browser cannot keep it, the copy says only "ask again in
//     a little while". Never in a school chat (a guest school chat keeps
//     nothing, as src/lib/guest-chat-carry.ts);
//   • any other failure keeps the old "Something went wrong on our side" line
//     and promises nothing.
// 7 Oct 2026 (B6): a guest's "saved in this browser" was a dead end. When the
// browser kept the question, the notice now also offers the standing sign-up
// door (src/app/chat/GuestQuestionDoor.tsx — GUEST_QUESTION_DOOR_REASON over
// the white "Sign up with Google" button), and a sign-up started there carries
// the question into the new account as a saved, failed member question, which
// the late-answer run answers (src/lib/guest-question-carry.ts; the chat then
// says GUEST_QUESTION_CARRIED_NOTE). Never in a school chat, never after the
// under-13 line, never on a kids' exam chat.
// Raw errors never reach the student.
//
// Pure — no DOM, no SDK. The SDK-error classifier is src/lib/ai/tutor-failure.ts.
// Tests: tests/unit/tutor-late-answer.test.ts

export type TutorUiLang = "en" | "hi" | "te";

/** Why a tutor turn failed. Everything but "other" means the AI itself was unavailable. */
export type TutorFailReason = "credit" | "auth" | "overloaded" | "rate-limit" | "server" | "timeout" | "network" | "other";

export const TUTOR_FAIL_REASONS: readonly TutorFailReason[] = ["credit", "auth", "overloaded", "rate-limit", "server", "timeout", "network", "other"];

/** True when the failure was the AI being unavailable (the late answer's promise applies). */
export function isAiUnavailable(reason: TutorFailReason | null | undefined): boolean {
  return reason != null && reason !== "other" && (TUTOR_FAIL_REASONS as readonly string[]).includes(reason);
}

/** Stable codes on /api/chat error events for an AI-unavailable turn. */
export const TUTOR_UNAVAILABLE_CODE = {
  /** A member whose account can receive our mails: saved, answered here, emailed. */
  memberEmail: "tutor-unavailable-email",
  /** A member we will not email (unsubscribed, no address, school chat, mailed today): saved, answered here. */
  member: "tutor-unavailable",
  /** A guest: the browser keeps the question when it can. */
  guest: "tutor-unavailable-guest",
} as const;

export type TutorUnavailableCode = (typeof TUTOR_UNAVAILABLE_CODE)[keyof typeof TUTOR_UNAVAILABLE_CODE];

/** What the chat says: which promise it can keep. */
export type TutorUnavailableState = "member-email" | "member" | "guest-saved" | "guest";

const CODES: readonly string[] = Object.values(TUTOR_UNAVAILABLE_CODE);

export function isTutorUnavailableCode(code: unknown): code is TutorUnavailableCode {
  return typeof code === "string" && CODES.includes(code);
}

/** The code the route sends for an AI-unavailable turn. */
export function tutorUnavailableCode(a: { signedIn: boolean; emailable: boolean }): TutorUnavailableCode {
  if (!a.signedIn) return TUTOR_UNAVAILABLE_CODE.guest;
  return a.emailable ? TUTOR_UNAVAILABLE_CODE.memberEmail : TUTOR_UNAVAILABLE_CODE.member;
}

/** The state for a code; a guest's copy says "saved" only when this browser kept the question. */
export function tutorUnavailableState(code: TutorUnavailableCode, guestSaved: boolean): TutorUnavailableState {
  if (code === TUTOR_UNAVAILABLE_CODE.memberEmail) return "member-email";
  if (code === TUTOR_UNAVAILABLE_CODE.member) return "member";
  return guestSaved ? "guest-saved" : "guest";
}

const COPY: Readonly<Record<TutorUiLang, Readonly<Record<TutorUnavailableState, string>>>> = {
  en: {
    "member-email": "Our AI tutor is unavailable right now. Your question is saved — we'll answer it here as soon as it's back, and email you.",
    member: "Our AI tutor is unavailable right now. Your question is saved — we'll answer it here as soon as it's back.",
    "guest-saved": "Our AI tutor is unavailable right now. Your question is saved in this browser — ask again in a little while.",
    guest: "Our AI tutor is unavailable right now. Please ask again in a little while.",
  },
  hi: {
    "member-email": "हमारा AI ट्यूटर अभी उपलब्ध नहीं है। आपका सवाल सेव है — ट्यूटर के लौटते ही हम यहीं जवाब देंगे और आपको ईमेल करेंगे।",
    member: "हमारा AI ट्यूटर अभी उपलब्ध नहीं है। आपका सवाल सेव है — ट्यूटर के लौटते ही हम यहीं जवाब देंगे।",
    "guest-saved": "हमारा AI ट्यूटर अभी उपलब्ध नहीं है। आपका सवाल इसी ब्राउज़र में सेव है — थोड़ी देर बाद फिर से पूछें।",
    guest: "हमारा AI ट्यूटर अभी उपलब्ध नहीं है। थोड़ी देर बाद फिर से पूछें।",
  },
  te: {
    "member-email": "మా AI ట్యూటర్ ప్రస్తుతం అందుబాటులో లేదు. మీ ప్రశ్న సేవ్ అయింది — ట్యూటర్ తిరిగి రాగానే ఇక్కడే సమాధానం ఇస్తాం, మీకు ఈమెయిల్ కూడా చేస్తాం.",
    member: "మా AI ట్యూటర్ ప్రస్తుతం అందుబాటులో లేదు. మీ ప్రశ్న సేవ్ అయింది — ట్యూటర్ తిరిగి రాగానే ఇక్కడే సమాధానం ఇస్తాం.",
    "guest-saved": "మా AI ట్యూటర్ ప్రస్తుతం అందుబాటులో లేదు. మీ ప్రశ్న ఈ బ్రౌజర్‌లో సేవ్ అయింది — కొద్దిసేపటి తర్వాత మళ్లీ అడగండి.",
    guest: "మా AI ట్యూటర్ ప్రస్తుతం అందుబాటులో లేదు. కొద్దిసేపటి తర్వాత మళ్లీ అడగండి.",
  },
};

function lang(l: string | null | undefined): TutorUiLang {
  return l === "hi" || l === "te" ? l : "en";
}

/** The line for a state, in the chat's UI language (English otherwise). */
export function tutorUnavailableText(state: TutorUnavailableState, uiLang: string | null | undefined): string {
  return COPY[lang(uiLang)][state];
}

/** The note on a reply the late-answer run stored (the chat thread). */
export const LATE_ANSWER_NOTE: Readonly<Record<TutorUiLang, string>> = {
  en: "Answered later — our AI tutor was unavailable when you asked.",
  hi: "बाद में जवाब दिया गया — जब आपने पूछा था, तब हमारा AI ट्यूटर उपलब्ध नहीं था।",
  te: "తర్వాత సమాధానం ఇచ్చాం — మీరు అడిగినప్పుడు మా AI ట్యూటర్ అందుబాటులో లేదు.",
};

export function lateAnswerNote(uiLang: string | null | undefined): string {
  return LATE_ANSWER_NOTE[lang(uiLang)];
}

// ── The guest's question, kept in this browser ─────────────────────────

/** localStorage key (one question per browser: the latest unanswered one). */
export const GUEST_UNANSWERED_KEY = "shishya_guest_unanswered";
/**
 * How long the browser keeps it. 1 Oct 2026 review: 6 hours, not 24 — on a
 * shared device (a cyber-café PC) the next person on the same chat page would
 * otherwise find the earlier guest's question in the box. The chat also drops
 * it as soon as it renders a member's chat (src/app/chat/ChatInterface.tsx).
 */
export const GUEST_UNANSWERED_TTL_MS = 6 * 3600_000;
/** = /api/chat's message limit. */
const MAX_TEXT = 2000;

/**
 * The reason line above the guest's sign-up door (7 Oct 2026, B6 — hi / te:
 * founder review). True only because the door shows only when this browser
 * kept the question and the sign-up carries it into the account as a failed
 * member question the late-answer run answers (src/lib/guest-question-carry.ts).
 */
export const GUEST_QUESTION_DOOR_REASON: Readonly<Record<TutorUiLang, string>> = {
  en: "Sign up free and we'll answer this question here as soon as the tutor is back.",
  hi: "मुफ़्त साइन अप करें — ट्यूटर के लौटते ही हम इस सवाल का जवाब यहीं देंगे।",
  te: "ఉచితంగా సైన్ అప్ చేయండి — ట్యూటర్ తిరిగి రాగానే ఈ ప్రశ్నకు ఇక్కడే సమాధానం ఇస్తాం.",
};

export function guestQuestionDoorReason(uiLang: string | null | undefined): string {
  return GUEST_QUESTION_DOOR_REASON[lang(uiLang)];
}

/**
 * Signed in after the door: the carried question is in the chat as "Not
 * answered — Retry" (B6 — hi / te: founder review; "Retry" is the button's own
 * word in each language, ChatInterface TURN_COPY.retry). No email is promised:
 * the door promised none.
 */
export const GUEST_QUESTION_CARRIED_NOTE: Readonly<Record<TutorUiLang, string>> = {
  en: "Your question is saved to your account. We'll answer it here as soon as our AI tutor is back — or press Retry to try now.",
  hi: "आपका सवाल आपके अकाउंट में सेव है। हमारा AI ट्यूटर लौटते ही हम यहीं जवाब देंगे — या अभी आज़माने के लिए “फिर से भेजें” दबाएँ।",
  te: "మీ ప్రశ్న మీ అకౌంట్‌లో సేవ్ అయింది. మా AI ట్యూటర్ తిరిగి రాగానే ఇక్కడే సమాధానం ఇస్తాం — లేదా ఇప్పుడే ప్రయత్నించడానికి “మళ్లీ పంపండి” నొక్కండి.",
};

export function guestQuestionCarriedNote(uiLang: string | null | undefined): string {
  return GUEST_QUESTION_CARRIED_NOTE[lang(uiLang)];
}

/** Shown when a kept question is put back in the box. */
export const GUEST_RESTORED_NOTE: Readonly<Record<TutorUiLang, string>> = {
  en: "Your question from earlier is in the box — send it when you're ready.",
  hi: "आपका पिछला सवाल बॉक्स में है — जब चाहें, भेज दें।",
  te: "మీ మునుపటి ప్రశ్న బాక్స్‌లో ఉంది — సిద్ధంగా ఉన్నప్పుడు పంపండి.",
};

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface KeptQuestion {
  v: 1;
  text: string;
  /** The chat's scope: an exam code, or null for the general chat. */
  examCode: string | null;
  at: number;
}

/** Keep the question for this chat's scope; true only when the browser stored it. */
export function keepGuestUnanswered(store: StorageLike | null | undefined, q: { text: string; examCode: string | null }, now: number): boolean {
  const text = (q.text ?? "").trim().slice(0, MAX_TEXT);
  if (!store || !text) return false;
  try {
    const rec: KeptQuestion = { v: 1, text, examCode: q.examCode ?? null, at: now };
    store.setItem(GUEST_UNANSWERED_KEY, JSON.stringify(rec));
    return store.getItem(GUEST_UNANSWERED_KEY) != null;
  } catch {
    return false;
  }
}

/** The kept question for this scope (not expired), or null. An expired or malformed one is dropped. */
export function readGuestUnanswered(store: StorageLike | null | undefined, scope: { examCode: string | null }, now: number): string | null {
  if (!store) return null;
  let raw: string | null = null;
  try {
    raw = store.getItem(GUEST_UNANSWERED_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  let rec: Partial<KeptQuestion> | null = null;
  try {
    rec = JSON.parse(raw) as Partial<KeptQuestion>;
  } catch {
    rec = null;
  }
  const ok =
    !!rec &&
    rec.v === 1 &&
    typeof rec.text === "string" &&
    rec.text.trim().length > 0 &&
    typeof rec.at === "number" &&
    now - rec.at >= 0 &&
    now - rec.at < GUEST_UNANSWERED_TTL_MS;
  if (!ok) {
    dropGuestUnanswered(store);
    return null;
  }
  // Another chat's question stays for its own page.
  if ((rec!.examCode ?? null) !== (scope.examCode ?? null)) return null;
  return rec!.text!;
}

export function dropGuestUnanswered(store: StorageLike | null | undefined): void {
  try {
    store?.removeItem(GUEST_UNANSWERED_KEY);
  } catch {
    /* storage blocked — nothing kept anyway */
  }
}
