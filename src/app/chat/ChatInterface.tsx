"use client";

// Client-side chat — consumes Server-Sent Events from POST /api/chat.
// Maintains a simple in-memory message log; persistence is handled server-side.
//
// Guest → account (16 Sep 2026): when a guest taps "Save this conversation —
// sign in, free", the chat (last 12 exchanges) is kept in localStorage
// (GUEST_CHAT_KEY) for 30 minutes. When the same browser opens the same chat
// signed in within that window, it is posted once to /api/chat/import, which
// saves only the turns the server itself logged for this browser as a new
// conversation of the signed-in student; the saved turns are shown and the
// chat continues in that conversation. The key is removed after the attempt.
// Nothing is kept without that tap: a guest who just leaves must not have
// the chat land in whichever account signs in next on a shared phone or a
// cyber-café PC (review, 16 Sep 2026).
//
// Seeds and failed turns (24 Sep 2026, September data read): a /chat?seed=…
// prompt auto-sends once per tab in 30 minutes and leaves the URL once used
// (src/lib/chat-seed-once.ts) — it used to re-send on every reload, back or
// reopened tab. A turn whose reply never arrived shows "Not answered —
// Retry", which re-sends the same text in place (209 of 1,166 signed-in
// messages got no reply in September, mostly in the 19/21/22 Sep outages).
// Every turn carries a turnId and its Retry sends the same one, so the
// server replays only the reply to that turn, never an earlier answer to the
// same text ("B" twice in a quiz) — review, same day.
//
// Cut-off replies (25 Sep 2026): a reply that streamed some text and then
// errored, or stopped without a done event, used to look finished with no
// Retry. It keeps its text, reads "Reply incomplete — Retry", and Retry
// replaces it the same way (src/lib/chat-reply-status.ts). Error events with
// a known code (the route's "still-answering") show this chat's own en/hi/te
// line instead of the route's English.
//
// School chat (26 Sep 2026): with the `school` prop (a Class 8-12 chat,
// guest or signed in (27 Sep 2026), on its class container,
// src/app/chat/page.tsx) the island shows
// the "You are talking to an AI tutor" line above the messages, keeps the
// page's hint-first starters, hides every exam CTA — the topic diagnostic,
// "Still stuck? talk to a teacher", the guest save card, suggested actions —
// and honours the daily cap: a done event carrying the cap code
// (src/lib/school/tutor-cap.ts) closes the composer with the end-of-day line
// and the way back to the chapter. No leaderboard, challenge, share or
// study-group surface is ever reachable from here. Fixer review, same day:
// the cap code closes the composer WITHOUT the `school` prop too (the line
// in the UI language, no back link). A guest's school chat shows no counter
// (the server caps it per browser) and never imports a saved guest chat.
//
// Whole-platform chat (27 Sep 2026): a general chat's save card offers to
// keep the conversation in an account (it no longer promises "mock
// mistakes"), the empty state names the exam by its short name, and the
// "talk to a teacher" row (a phone form) shows only in an exam chat — never
// in a general, guest-general or school chat, where minors may be.
//
// 30 Sep 2026 (sign-up build 2; 1 save tap since 16 Sep, 0 imports ever):
// ANY sign-in the guest starts from this chat keeps it — the save card, now a
// full-width button shown after the FIRST reply, and every link to /login on
// the page (the top "Sign in free" line, the header's Sign in), caught by one
// click listener. The import then runs on whichever page the sign-in lands
// (src/components/WelcomeStrip.tsx); back here, a conversation imported
// elsewhere is restored and continued instead of imported twice. Storage,
// TTL and decisions: src/lib/guest-chat-carry.ts. A school chat never keeps
// one, and the under-13 line drops a kept one.
//
// Saved chats (30 Sep 2026, "the tutor remembers" — src/lib/recent-chats.ts):
// with `resume` (a signed-in member's own conversation, reopened by
// /chat?session=<id> in its own scope) the chat starts on its stored turns
// and the next message continues it; a question that never got a reply shows
// "Not answered", and on the latest turn its Retry re-sends it in place. A
// "New chat" link starts a fresh one. The signed-in empty state lists the
// member's recent chats (`recentChats`) under the starters — it blocks
// nothing. A mistake review from the results page (its first question is
// the results seed) offers three quick replies under each complete tutor
// reply — "Next mistake", "Give me a similar question", "Explain it more
// simply" — each an ordinary turn; never in a school chat. The results seed
// carries its attempt (`reviewAttemptId`) on its own turn only, so the new
// conversation is tagged and the results page can reopen it.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import { TalkToTeacher } from "@/components/TalkToTeacher";
import { SCHOOL_CAP_CODE, SCHOOL_TUTOR_CAP_COPY, SCHOOL_TUTOR_DAILY_CAP } from "@/lib/school/tutor-cap";
import { UNDER13_CLOSED } from "@/lib/under13";
import { markSeedFired, seedFingerprint, stripSeedParam, wasSeedFiredRecently } from "@/lib/chat-seed-once";
import {
  GUEST_CHAT_MAX_TURNS,
  carryDecision,
  dropKeptGuestChat,
  isLoginLink,
  keepGuestChat,
  postGuestChatImport,
  readKeptGuestChat,
} from "@/lib/guest-chat-carry";
import {
  canRetryAt,
  chatErrorText,
  failedReplyKind,
  replyStreamFailed,
  retryableTurn,
  withLastReplyFailed,
} from "@/lib/chat-reply-status";
import {
  REVIEW_CHIPS,
  isMistakeReviewOpener,
  reviewChipsVisible,
  type ChatResume,
  type RecentChatsList,
} from "@/lib/recent-chats";
import {
  followUpAction,
  followUpOnceKey,
  stripFollowUpParam,
  type PickupFollowUp,
} from "@/lib/pickup-followup";
import {
  GUEST_RESTORED_NOTE,
  TUTOR_UNAVAILABLE_CODE,
  dropGuestUnanswered,
  isTutorUnavailableCode,
  keepGuestUnanswered,
  lateAnswerNote,
  readGuestUnanswered,
  tutorUnavailableState,
  tutorUnavailableText,
  type StorageLike,
} from "@/lib/tutor-unavailable";
import { SignUpButton } from "@/components/SignUpButton";
import { signUpLabel } from "@/lib/signup-cta-copy";

// AI unavailable (1 Oct 2026, src/lib/tutor-unavailable.ts): an error event
// with a "tutor-unavailable…" code shows this chat's own line in the UI
// language — a member's question is saved and answered here later (and
// emailed only when the route says the account can receive our mails); a
// guest's is kept in this browser for 6 hours and put back in the box when
// they return (never in a school chat, never once the under-13 line closed
// it; a member's chat in the same browser drops it), and the line says
// "saved in this browser" only when the browser actually kept it. A reply
// the late-answer run stored carries "Answered later — our AI tutor was
// unavailable when you asked." (a replayed one too).

/** localStorage, or null when the browser blocks it. */
function localStore(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** The reply never arrived or was cut off (error, outage, dropped stream) — the bubble offers Retry. */
  failed?: boolean;
  /** User turns: this turn's id, sent again by its Retry so the server knows which turn failed. */
  turnId?: string;
  /** A reply the late-answer run stored after an outage (1 Oct 2026). */
  lateAnswer?: boolean;
}

interface ChatLabels {
  placeholder: string;
  send: string;
  thinking: string;
  empty: string;
  emptyExamPrefix: string;
  suggested: string;
  starters: string[];
  focusLabel: string;
  focusClear: string;
  diagnosticCta: string;
  diagnosticBuilding: string;
  diagnosticHint: string;
}

interface TopicFocus {
  code: string;
  name: string;
  subjectName: string;
  examShortName: string;
}

/** A school chat (26 Sep 2026): a Class 8-12 chat on its class container,
 *  guest or signed in (27 Sep 2026). The chat then shows the "AI tutor"
 *  line, hides every exam CTA (diagnostic, teacher, save-conversation,
 *  suggested actions) and keeps the daily cap (src/lib/school/tutor-cap.ts). */
interface SchoolChat {
  /** "You are talking to an AI tutor…" — always visible above the messages. */
  aiLine: string;
  /** "Class 9 · CBSE" — the scope shown in the focus chip and the empty state. */
  classLabel: string;
  /** The account's cap was reached before this page loaded. */
  capReached: boolean;
  /** The end-of-day line, in the site UI language. */
  capLine: string;
  /** Messages the account may still send today; null = a guest (no counter). */
  messagesLeft: number | null;
  /** "{n} of {cap} tutor messages left today". */
  leftTemplate: string;
  /** The chapter (or class) page, for the capped state. */
  backHref: string;
  backLabel: string;
}

function prettyTool(name?: string): string {
  switch (name) {
    case "get_my_mastery": return "Looking up your weak topics…";
    case "get_recent_attempts": return "Fetching your recent attempts…";
    case "find_questions_on_topic": return "Pulling practice questions…";
    case "get_attempt_mistakes": return "Reviewing your mistakes…";
    case "predict_rank": return "Estimating your rank band…";
    case "start_adaptive_quiz": return "Building your quiz (warmup + full mock)…";
    case "find_scholarships": return "Finding scholarships you qualify for…";
    default: return name ? `Calling ${name}…` : "Thinking…";
  }
}

// The guest save card (30 Sep 2026: a full-width button, not a text-xs link).
// Honest words only: signing in keeps THIS conversation in the account (the
// import, src/lib/guest-chat-carry.ts), and the signed-in exam tutor can read
// the student's mock mistakes and weak topics (src/lib/ai/tools.ts). No claim
// that the tutor "remembers it tomorrow". (30 Sep 2026: a member can now
// reopen a saved chat from the Recent chats list — the copy is unchanged.)
const SAVE_COPY = {
  en: {
    saved: "Your guest conversation is saved to your account.",
    // 2 Oct 2026: these two are the card's line above the shared "Sign up
    // with Google" button (they were the button's own words).
    button: "Save this chat to your account — free",
    // A general chat (27 Sep 2026): no mocks in view there.
    buttonGeneral: "Keep this chat in a free Shishya account",
    sub: "Signed in, the tutor also sees your mock mistakes and weak topics.",
    subGeneral: "Free, with Google. Accounts are for ages 13 and above.",
  },
  hi: {
    saved: "आपकी गेस्ट बातचीत आपके अकाउंट में सेव हो गई है।",
    button: "यह बातचीत अपने अकाउंट में सेव करें — मुफ़्त",
    buttonGeneral: "यह बातचीत मुफ़्त Shishya अकाउंट में रखें",
    sub: "साइन इन के बाद ट्यूटर आपकी मॉक की गलतियाँ और कमज़ोर टॉपिक भी देखता है।",
    subGeneral: "मुफ़्त, Google से। अकाउंट 13 साल और उससे ऊपर के लिए हैं।",
  },
  te: {
    saved: "మీ గెస్ట్ సంభాషణ మీ అకౌంట్‌లో సేవ్ అయింది.",
    button: "ఈ చాట్‌ను మీ అకౌంట్‌లో సేవ్ చేయండి — ఉచితంగా",
    buttonGeneral: "ఈ చాట్‌ను ఉచిత Shishya అకౌంట్‌లో ఉంచుకోండి",
    sub: "సైన్ ఇన్ అయ్యాక ట్యూటర్ మీ మాక్ తప్పులు, బలహీన టాపిక్‌లు కూడా చూస్తుంది.",
    subGeneral: "ఉచితం, Google తో. అకౌంట్‌లు 13 ఏళ్లు, ఆపై వయసు వారికి.",
  },
} as const;

// 2 Oct 2026 (the sentences pass): `unavailable` told a guest to "Sign in
// (free)"; it says "Sign up with Google (free)" now, with the label taken
// from the one module that spells it (signUpLabel) in all three languages.
// Review, same day: `unavailablePlain` is the same line WITHOUT the
// invitation — for a school chat (Class 8-12, where no sign-up offer is
// shown: the banner and the save card are off there) and for a chat the
// under-13 line has closed.
// A turn with no reply, a seed held back, and the guest tutor declining a
// browser it takes for a crawler (24 Sep 2026). The last is signed-out only:
// signed-in students are never judged by their user-agent. A reply cut off
// part-way (25 Sep 2026) keeps its text under "incomplete".
const TURN_COPY = {
  en: {
    notAnswered: "Not answered",
    incomplete: "Reply incomplete",
    retry: "Retry",
    seedHeld: "You asked this here a little while ago, so it was not sent again. Send it when you want to.",
    unavailable: `The guest tutor isn't available in this browser. ${signUpLabel("en")} (free) to use the tutor.`,
    unavailablePlain: "The guest tutor isn't available in this browser.",
    stuck: "Still stuck after chatting with Shishya?",
  },
  hi: {
    notAnswered: "जवाब नहीं आया",
    incomplete: "जवाब अधूरा रह गया",
    retry: "फिर से भेजें",
    seedHeld: "आपने यह यहाँ कुछ देर पहले पूछा था, इसलिए इसे दोबारा नहीं भेजा गया। जब चाहें, भेज दें।",
    unavailable: `इस ब्राउज़र में गेस्ट ट्यूटर उपलब्ध नहीं है। ट्यूटर के लिए ${signUpLabel("hi")} (मुफ़्त)।`,
    unavailablePlain: "इस ब्राउज़र में गेस्ट ट्यूटर उपलब्ध नहीं है।",
    stuck: "Shishya से बात करके भी अटके हैं?",
  },
  te: {
    notAnswered: "సమాధానం రాలేదు",
    incomplete: "సమాధానం పూర్తి కాలేదు",
    retry: "మళ్లీ పంపండి",
    seedHeld: "మీరు ఇది ఇక్కడ కొద్దిసేపటి క్రితం అడిగారు, కాబట్టి మళ్లీ పంపలేదు. కావాలనుకున్నప్పుడు పంపండి.",
    unavailable: `ఈ బ్రౌజర్‌లో గెస్ట్ ట్యూటర్ అందుబాటులో లేదు. ట్యూటర్ కోసం ${signUpLabel("te")} (ఉచితం).`,
    unavailablePlain: "ఈ బ్రౌజర్‌లో గెస్ట్ ట్యూటర్ అందుబాటులో లేదు.",
    stuck: "Shishya తో మాట్లాడినా ఇంకా అర్థం కాలేదా?",
  },
} as const;

/** A turn's id (24 Sep 2026 review) — unique enough per browser; never shown. */
function newTurnId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function uiLang(): "en" | "hi" | "te" {
  try {
    const m = document.cookie.match(/(?:^|;\s*)shishya-lang=([^;]+)/);
    return m?.[1] === "hi" || m?.[1] === "te" ? m[1] : "en";
  } catch {
    return "en";
  }
}

// First-party analytics beacon (same shape as ShareExamButton).
function beacon(props: Record<string, unknown>) {
  try {
    navigator.sendBeacon?.(
      "/api/analytics",
      new Blob(
        [
          JSON.stringify({
            kind: "CTA_CLICKED",
            path: typeof location !== "undefined" ? location.pathname : "/chat",
            props,
          }),
        ],
        { type: "application/json" },
      ),
    );
  } catch {
    /* analytics is best-effort */
  }
}

export function ChatInterface({
  examCode,
  examShortName,
  topicFocus,
  initialSeed,
  seedScope,
  labels,
  guestSignInHref,
  guestBanner,
  school,
  resume,
  recentChats,
  reviewAttemptId,
  followUp,
}: {
  /** Null when the chat is in "General" mode — exam-agnostic Q&A. The
   *  /api/chat call then sends `general: true` instead of an examCode
   *  and the tutor uses a generic system prompt with no syllabus or
   *  student-state injection (30 Sep 2026: a signed-in general chat does
   *  carry the student's own earlier questions — src/lib/tutor-memory.ts). */
  examCode: string | null;
  /** The exam's short name for the empty state ("SSC CGL", not "SSC_CGL") — 27 Sep 2026. */
  examShortName?: string | null;
  topicFocus?: TopicFocus | null;
  initialSeed?: string | null;
  /** Signed-in: the student's latest attempt as this page rendered it — part
   *  of the seed's once-per-tab key, so the same seed text after another
   *  attempt still sends by itself (chat-seed-once.ts, 24 Sep 2026 review). */
  seedScope?: string | null;
  labels: ChatLabels;
  /** Guest (signed-out) chats only: the /login URL whose callback returns
   *  to this chat. When set, an inline save-this-conversation card appears
   *  after the second completed reply (11 Sep 2026 signup-leak audit) —
   *  the ask comes after value, and costs no model call. */
  guestSignInHref?: string | null;
  /** Guest chats only (2 Oct 2026): the line under the page title — "You're
   *  chatting as a guest. Sign in free to keep your chats …" in the page's
   *  language — with the shared sign-up button under it. Rendered here, not
   *  by the server page, so it disappears once a guest says they are under
   *  13 and so the button steps aside once the save card is up. */
  guestBanner?: { text: string; locale: string; continueLabel: string } | null;
  /** Set for a school chat — see SchoolChat. */
  school?: SchoolChat | null;
  /** Signed-in: a saved conversation reopened from /chat?session= (30 Sep 2026). */
  resume?: ChatResume | null;
  /** Signed-in empty state: the member's own recent chats (30 Sep 2026). */
  recentChats?: RecentChatsList | null;
  /** A results-page seed: the attempt it reviews, sent with the seed's own turn (30 Sep 2026). */
  reviewAttemptId?: string | null;
  /** A reopened chat from a "Pick up where you left off" link: the one
   *  follow-up to do once (src/lib/pickup-followup.ts, 30 Sep 2026). */
  followUp?: PickupFollowUp | null;
}) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(resume?.sessionId ?? null);
  const [messages, setMessages] = useState<Message[]>(resume?.messages ?? []);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actions, setActions] = useState<{ kind: string; topicCode?: string; reason: string }[]>([]);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const [creatingDiag, setCreatingDiag] = useState(false);
  const [importedNote, setImportedNote] = useState<string | null>(null);
  // School chat (26 Sep 2026): the daily cap. Reached on load, or when a
  // turn's done event carries the cap code — the composer closes and the
  // line stays; a reload asks the server again.
  const [capped, setCapped] = useState<boolean>(school?.capReached ?? false);
  // Under 13 (27 Sep 2026, founder: below 13, content only and no data): the
  // server answered "I am 11" / "I am in class 6" with its fixed 13-and-above
  // line (code "scope-under13", src/lib/chat-scope.ts). The chat closes — no
  // composer, no starters, no sign-in card — and points to the class pages.
  const [under13, setUnder13] = useState(false);
  const [messagesLeft, setMessagesLeft] = useState<number | null>(school ? school.messagesLeft : null);
  // This island's own lines in the site UI language (16 Sep 2026). Read after
  // mount — the server cannot see the shishya-lang cookie, and the guest save
  // nudge only appears after two completed tutor replies, so nothing is ever
  // repainted under the reader.
  const [navLang, setNavLang] = useState<"en" | "hi" | "te">("en");
  // 30 Sep 2026: the mistake review's quick replies wait for this, so a
  // reopened review never paints them in English and then switches.
  const [langReady, setLangReady] = useState(false);
  useEffect(() => {
    setNavLang(uiLang());
    setLangReady(true);
  }, []);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // ── Voice input (user-requested "mike button") ─────────────────────────
  // Web Speech API — Chrome/Edge/Android WebView; feature-detected so the
  // button simply doesn't render where unsupported (Firefox). Speaking is a
  // much lower barrier than typing for vernacular users (we see Gujarati /
  // Hinglish asks in the tutor logs). Recognition language follows the page
  // locale so Hindi/Telugu/etc. speech is transcribed natively.
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recogRef = useRef<any>(null);
  useEffect(() => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (SR) setSpeechSupported(true);
  }, []);
  function toggleMic() {
    if (listening) {
      recogRef.current?.stop();
      return;
    }
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recog = new SR();
    const pageLang = document.documentElement.lang || "en";
    recog.lang = pageLang.includes("-") ? pageLang : `${pageLang}-IN`;
    recog.interimResults = true;
    recog.continuous = false;
    const base = input ? input.replace(/\s+$/, "") + " " : "";
    recog.onresult = (ev: any) => {
      let transcript = "";
      for (const res of ev.results) transcript += res[0].transcript;
      setInput(base + transcript);
    };
    recog.onend = () => setListening(false);
    recog.onerror = () => setListening(false);
    recogRef.current = recog;
    setListening(true);
    recog.start();
  }

  // The guest pressed sign-in on this chat: keep the finished turns so the
  // sign-in can save them (see header). Only complete user→assistant
  // exchanges; a turn too long for the import route is left out. Never for
  // a school chat, never once the under-13 line has closed the chat.
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;
  const under13Ref = useRef(false);
  under13Ref.current = under13;
  function keepGuestChatForSignIn() {
    if (!guestSignInHref || school || under13Ref.current) return;
    keepGuestChat(examCode ?? null, messagesRef.current);
  }

  // 30 Sep 2026: every sign-in link on the guest chat's page keeps it — the
  // save card, the page's top "Sign in free" line, the header's Sign in.
  // Capture phase, so it runs before the navigation starts.
  useEffect(() => {
    if (!guestSignInHref || school) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (a && isLoginLink(a.getAttribute("href"), location.origin)) keepGuestChatForSignIn();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestSignInHref, school]);

  // A chat the under-13 line closed is never carried into an account.
  useEffect(() => {
    if (under13) dropKeptGuestChat();
  }, [under13]);

  // A guest's question an outage left unanswered (1 Oct 2026): this browser
  // kept it for this chat's scope, so it goes back in the box, unsent, with a
  // line saying so — never over a seed, never in a school chat.
  const [guestRestored, setGuestRestored] = useState(false);
  useEffect(() => {
    if (!guestSignInHref || school || (initialSeed && initialSeed.trim())) return;
    const kept = readGuestUnanswered(localStore(), { examCode: examCode ?? null }, Date.now());
    if (!kept) return;
    setInput((cur) => (cur.trim() ? cur : kept));
    setGuestRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (under13) dropGuestUnanswered(localStore());
  }, [under13]);
  // 1 Oct 2026 review: a member's general or exam chat lets go of any guest's
  // kept question in this browser — on a shared device (a cyber-café PC) it
  // must not wait in the box for the next person. (A school chat takes no
  // guestSignInHref for guests either, so it is left out.)
  useEffect(() => {
    if (!guestSignInHref && !school) dropGuestUnanswered(localStore());
  }, [guestSignInHref, school]);

  /** The line for an AI-unavailable error event, or null for any other error. */
  function unavailableLine(payload: unknown, question: string): string | null {
    const p = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, unknown>) : null;
    const code = p?.code;
    if (!isTutorUnavailableCode(code)) return null;
    let saved = false;
    if (code === TUTOR_UNAVAILABLE_CODE.guest && guestSignInHref && !school && !under13Ref.current) {
      saved = keepGuestUnanswered(localStore(), { text: question, examCode: examCode ?? null }, Date.now());
    }
    const more = typeof p?.more === "string" && p.more.trim() ? ` ${p.more.trim()}` : "";
    return `${tutorUnavailableText(tutorUnavailableState(code, saved), uiLang())}${more}`;
  }

  // Signed in: a guest chat from this browser for this same chat → save it once.
  const importTriedRef = useRef(false);
  // Set by send(): once the student has sent a turn, a late import is saved
  // server-side but not swapped into the screen.
  const sentRef = useRef(false);
  useEffect(() => {
    // A reopened saved chat (30 Sep 2026) shows that conversation; a kept
    // guest chat waits for its own page, as it does for a seeded chat.
    if (guestSignInHref || school || resume || importTriedRef.current) return;
    importTriedRef.current = true;
    const kept = readKeptGuestChat();
    // Another chat (other exam, or general) keeps the key for its own page;
    // a seeded chat starts its own turn right away — don't race it.
    const action = carryDecision(kept, {
      childPath: false,
      chatScope: { examCode: examCode ?? null, seeded: !!(initialSeed && initialSeed.trim()) },
    });
    if (action === "drop") return dropKeptGuestChat();
    if (!kept || kept === "expired" || action === "none") return;
    const show = (sid: string, turns: { role: string; content: string }[]) => {
      if (!sentRef.current) {
        setMessages(
          turns.map((t, i) => ({
            id: `g-${i}`,
            role: t.role === "assistant" ? ("assistant" as const) : ("user" as const),
            content: t.content,
          })),
        );
        setSessionId(sid);
      }
      setImportedNote(SAVE_COPY[uiLang()].saved);
    };
    // 30 Sep 2026: imported on the page the sign-in landed on — show it and
    // continue that conversation (the chat route accepts the owner's session
    // of the same scope); no second import.
    if (action === "restore" && kept.importedSessionId) {
      dropKeptGuestChat();
      show(kept.importedSessionId, kept.turns);
      beacon({ cta: "chat-guest-restored", surface: "chat", examCode, pairs: Math.floor(kept.turns.length / 2) });
      return;
    }
    void postGuestChatImport({ ...kept, turns: kept.turns.slice(-GUEST_CHAT_MAX_TURNS) }).then((r) => {
      if (r.status === "retry") return; // the key stays for a later visit
      dropKeptGuestChat();
      if (r.status !== "imported") return;
      show(r.sessionId, r.turns);
      beacon({ cta: "chat-guest-imported", surface: "chat", examCode, pairs: Math.floor(r.turns.length / 2) });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the user lands here from a topic page (e.g. clicked "Open Shishya
  // tutor" on Number System), auto-fire the seed prompt so the tutor starts
  // teaching immediately instead of showing a blank chat.
  //
  // 24 Sep 2026: once, not on every mount (src/lib/chat-seed-once.ts). The
  // seed param leaves the URL as soon as it is used, so a reload does not
  // carry it; a repeat mount of the same seed (same text, exam and topic)
  // within 30 minutes in this tab — a back-navigation, a restored tab — puts
  // the prompt in the input box unsent. So does an automated browser
  // (navigator.webdriver): JS-running crawlers fired ~188 guest replies in
  // September. A seeded URL never reopens a stored conversation (the page
  // ignores ?session= with a seed — 30 Sep 2026), so a held seed is the
  // honest fallback; for a signed-in student, sending
  // it within 10 minutes replays the stored reply (chat-turn-dedupe.ts) —
  // unless an attempt since then makes that reply describe an older record.
  // A signed-in student's key includes their latest attempt (seedScope), so
  // the same text after another attempt is not held at all.
  const seedFiredRef = useRef(false);
  const [seedHeld, setSeedHeld] = useState(false);
  useEffect(() => {
    if (seedFiredRef.current) return;
    const seed = initialSeed?.trim();
    if (!seed) return;
    seedFiredRef.current = true;
    try {
      const stripped = stripSeedParam(window.location.href);
      if (stripped) window.history.replaceState(window.history.state, "", stripped);
    } catch {
      /* the URL keeps its seed; the once-per-tab check below still holds */
    }
    let automated = false;
    try {
      automated = navigator.webdriver === true;
    } catch {
      /* treat as a person */
    }
    let store: Storage | null = null;
    try {
      store = window.sessionStorage;
    } catch {
      /* storage blocked — the seed sends, as before */
    }
    const fp = seedFingerprint(seed, examCode, topicFocus?.code ?? null, seedScope);
    if (automated || wasSeedFiredRecently(store, fp)) {
      setInput(seed);
      if (!automated) setSeedHeld(true);
      return;
    }
    markSeedFired(store, fp);
    // The results seed names the attempt it reviews on its own turn only.
    void send(seed, reviewAttemptId ? { reviewAttemptId } : {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSeed]);

  // Pick up where you left off (30 Sep 2026, src/lib/pickup-followup.ts): a
  // reopened chat opened from the card or a morning mail with ?f= does ONE
  // thing, once — f=answer re-sends the unanswered last turn through Retry
  // (same row, same turnId: the route answers in place), f=practice / f=next
  // sends our fixed follow-up under the last complete reply, and nothing
  // happens when the chat's state does not fit. It waits for the UI language
  // (the words go out in it); ?f= leaves the URL and a per-tab key stops a
  // repeat, so a reload or a back-navigation never sends it twice. Never in a
  // school chat (the page passes none there).
  const followUpFiredRef = useRef(false);
  useEffect(() => {
    if (!followUp || !resume || school || !langReady || followUpFiredRef.current) return;
    followUpFiredRef.current = true;
    try {
      const stripped = stripFollowUpParam(window.location.href);
      if (stripped) window.history.replaceState(window.history.state, "", stripped);
    } catch {
      /* the URL keeps ?f=; the per-tab key below still holds */
    }
    const key = followUpOnceKey(resume.sessionId, followUp, messages);
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      /* storage blocked — once per mount still holds */
    }
    const action = followUpAction({ kind: followUp, messages, busy, closed: capped || under13, lang: navLang });
    if (!action) return;
    beacon({ cta: "pickup-follow-up", surface: "chat", examCode, kind: followUp });
    if (action.type === "retry") retryLastTurn();
    else void send(action.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [langReady]);

  // The reply never arrived, or stopped part-way: the bubble becomes "Not
  // answered — Retry", or keeps its text under "Reply incomplete — Retry"
  // (25 Sep 2026; it used to be marked only when empty).
  function markLastReplyFailed() {
    setMessages((m) => withLastReplyFailed(m));
  }

  // "Retry" on the last turn: the same text again, in place (24 Sep 2026).
  // A signed-in retry reuses the stored question row instead of adding a
  // second one, and gets the stored reply if one was saved after all — the
  // same turnId tells the server which turn this is. A cut-off reply's
  // partial text is replaced by the new answer (25 Sep 2026).
  function retryLastTurn() {
    const turn = retryableTurn(messages);
    if (busy || !turn) return;
    beacon({ cta: "chat-retry", surface: "chat", examCode });
    void send(turn.text, { retry: true, turnId: turn.turnId });
  }

  async function send(text: string, opts: { retry?: boolean; turnId?: string; reviewAttemptId?: string } = {}) {
    if (!text.trim() || busy || capped || under13) return;
    sentRef.current = true;
    setImportedNote(null);
    setSeedHeld(false);
    setGuestRestored(false);
    // Snapshot prior turns BEFORE we append the new message. Sent in the
    // request body so anonymous (signed-out) chats — which aren't stored
    // server-side — still get multi-turn context. Signed-in chats ignore
    // this and use their DB-persisted history. A retry re-sends the failed
    // turn in place: that turn (the last user bubble and its empty or
    // cut-off reply) stays out of the snapshot, and only its reply bubble is
    // replaced.
    const priorHistory = (opts.retry ? messages.slice(0, -2) : messages)
      .filter((m) => m.content.trim())
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content }));
    const turnId = opts.turnId ?? newTurnId();
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text, turnId };
    const placeholder: Message = { id: `a-${Date.now()}`, role: "assistant", content: "" };
    setMessages((m) => (opts.retry ? [...m.slice(0, -1), placeholder] : [...m, userMsg, placeholder]));
    if (!opts.retry) setInput("");
    setBusy(true);
    setError(null);
    setActions([]);
    setToolStatus(null);

    // Which closing events arrived. Only a done event (and no error) makes
    // the reply complete; a stream that just stops — a dropped connection —
    // leaves it failed, with whatever text it had (25 Sep 2026).
    const seen = { done: false, error: false };
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          examCode: examCode ?? undefined,
          general: examCode == null ? true : undefined,
          sessionId,
          message: text,
          topicCode: topicFocus?.code ?? undefined,
          history: priorHistory,
          retry: opts.retry ? true : undefined,
          turnId,
          reviewAttemptId: opts.reviewAttemptId && !sessionId ? opts.reviewAttemptId : undefined,
        }),
      });
      if (!res.ok || !res.body) {
        let detail = "";
        let code: unknown = null;
        try {
          const j = await res.json();
          code = j?.error;
          detail = j?.error ? ` — ${j.error}` : "";
        } catch {}
        // The guest tutor declined this browser as a crawler (24 Sep 2026).
        // 2 Oct 2026 (review): no sign-up invitation in a school chat or once
        // the under-13 line has closed the chat — the plain line there.
        if (res.status === 403 && code === "unavailable") throw new Error(TURN_COPY[uiLang()][school || under13Ref.current ? "unavailablePlain" : "unavailable"]);
        throw new Error(`Chat failed (${res.status})${detail}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        // Parse SSE frames
        const events = buf.split("\n\n");
        buf = events.pop() ?? "";
        for (const evt of events) {
          const lines = evt.split("\n");
          let event = "message";
          let data = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) event = line.slice(7).trim();
            else if (line.startsWith("data: ")) data += line.slice(6);
          }
          if (event === "meta") {
            try {
              const parsed = JSON.parse(data);
              if (parsed?.sessionId) setSessionId(parsed.sessionId);
            } catch {}
          } else if (event === "delta") {
            try {
              const parsed = JSON.parse(data);
              setToolStatus(null);
              setMessages((m) => {
                const last = m[m.length - 1];
                if (last?.role !== "assistant") return m;
                const updated = { ...last, content: (last.content ?? "") + parsed };
                return [...m.slice(0, -1), updated];
              });
            } catch {}
          } else if (event === "tool") {
            try {
              const parsed = JSON.parse(data);
              setToolStatus(prettyTool(parsed?.name));
            } catch {}
          } else if (event === "done") {
            seen.done = true;
            try {
              const parsed = JSON.parse(data);
              if (Array.isArray(parsed?.actions) && parsed.actions.length) setActions(parsed.actions);
              setToolStatus(null);
              // 1 Oct 2026 review: a replayed reply the late-answer run stored
              // carries its "Answered later" note here too.
              if (parsed?.lateAnswer === true) {
                setMessages((m) => {
                  const last = m[m.length - 1];
                  return last?.role === "assistant" ? [...m.slice(0, -1), { ...last, lateAnswer: true }] : m;
                });
              }
              // School chat: the cap line came instead of a reply, or one
              // more of today's messages was used (a replayed reply used none).
              if (parsed?.code === "scope-under13") setUnder13(true);
              if (parsed?.code === SCHOOL_CAP_CODE) setCapped(true);
              // A pre-filtered reply (src/lib/chat-scope.ts, "scope-…" code) is not stored, so it used none either.
              else if (school && !parsed?.replayed && !String(parsed?.code ?? "").startsWith("scope-")) setMessagesLeft((n) => (n == null ? n : Math.max(0, n - 1)));
            } catch {}
          } else if (event === "error") {
            seen.error = true;
            markLastReplyFailed();
            // A known code shows this chat's own line in the UI language;
            // anything else, the server's text (25 Sep 2026).
            let parsed: unknown = null;
            try {
              parsed = JSON.parse(data);
            } catch {}
            // 1 Oct 2026: the AI was unavailable — the honest line (see the header).
            setError(unavailableLine(parsed, text) ?? chatErrorText(parsed, uiLang(), "Chat stream error"));
          }
        }
      }
      if (replyStreamFailed(seen)) markLastReplyFailed();
      // A guest's kept question that has now been answered is let go.
      else if (guestSignInHref && !school && readGuestUnanswered(localStore(), { examCode: examCode ?? null }, Date.now())?.trim() === text.trim()) {
        dropGuestUnanswered(localStore());
      }
    } catch (e: any) {
      // A read that fails after the done event changes nothing: the reply is
      // complete. Otherwise the reply (empty or partial) failed; an error
      // event's message, if one came, stays on screen.
      if (!seen.done) {
        markLastReplyFailed();
        if (!seen.error) setError(e.message ?? "Chat failed");
      }
    } finally {
      setToolStatus(null);
      setBusy(false);
    }
  }

  // "Test my improvement" — when the student is tutoring on a topic and
  // wants to verify their understanding, spin up a 10-Q topic diagnostic
  // and navigate to it. The smart-learning loop the student described:
  // tutor → topic-targeted diagnostic → if score improved, take a full
  // mock. The before/after delta is implicit in WeaknessMap — the topic
  // score on the next mock shows the lift.
  async function takeTopicDiagnostic() {
    // Diagnostic mocks only make sense when an exam is in scope; the
    // button is gated on topicFocus so this guard is belt-and-braces.
    if (!topicFocus || !examCode || creatingDiag) return;
    setCreatingDiag(true);
    setError(null);
    try {
      const res = await fetch("/api/mocks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          examCode,
          request: {
            type: "TOPIC",
            topicCode: topicFocus.code,
            questionCount: 10,
          },
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? `Mock creation failed (${res.status})`);
      }
      const data = await res.json();
      const mockId = data?.mock?.id;
      if (!mockId) throw new Error("No mock id returned");
      router.push(`/mocks/${mockId}`);
    } catch (e: any) {
      setError(e.message ?? "Could not create the diagnostic");
      setCreatingDiag(false);
    }
  }

  // Topic-tailored starters override the generic ones when focused. A
  // school chat keeps the page's hint-first starters whatever the focus.
  const starters: string[] = school
    ? labels.starters
    : topicFocus
    ? [
        `Go deeper on ${topicFocus.name} for ${topicFocus.examShortName} — examples and edge cases I should know.`,
        `Give me 3 fastest shortcuts to solve ${topicFocus.name} questions in the exam.`,
        `What are the most common mistakes students make on ${topicFocus.name}? How do I avoid them?`,
        `Quiz me on ${topicFocus.name} — start with one easy question, then go harder based on how I answer.`,
      ]
    : labels.starters;

  // A mistake review (30 Sep 2026): its first question is the results seed —
  // this page's seed, or a reopened conversation's opener (which may sit
  // outside the loaded turns). Never a school chat.
  const reviewMode =
    !school && (resume?.mistakeReview === true || isMistakeReviewOpener(messages.find((m) => m.role === "user")?.content));
  const showReviewChips =
    langReady && reviewChipsVisible({ reviewMode, school: !!school, busy, closed: capped || under13, messages });

  // The guest has a FINISHED reply — which is when the save card below first
  // comes up. The reply that is streaming right now (the last message while
  // busy) does not count: the banner's button used to vanish the moment the
  // first reply began, and the chat box jumped up under the student's eyes
  // while they started reading; it now leaves at the same moment the card
  // appears. Once one reply has finished it stays away (no blink while a
  // later reply streams).
  const guestHasReply = messages.some((m, i) => m.role === "assistant" && m.content && !m.failed && !(busy && i === messages.length - 1));

  return (
    <>
    {/* The guest line under the page title (2 Oct 2026 — it was a sentence
        with a "Sign in free" link in its middle, rendered by the server
        page). The sentence is plain text now: it is the reason. Under it,
        the one shared "Sign up with Google" button (en / hi / te; any other
        language: its "Continue with Google"), door id "chat-banner" (the
        link was counted as "link"). Its click keeps the chat on screen for
        the new account like every /login link on this page (the capture
        listener above). Never in a school chat; gone — sentence and button —
        once a guest says they are under 13; and the button steps aside once
        the save card below offers the same thing (one invitation a screen). */}
    {guestBanner && guestSignInHref && !school && !under13 && (
      <div className="mt-2 rounded-md bg-saffron-50 px-3 py-2 ring-1 ring-saffron-200">
        <p data-su-reason className="text-xs text-ink-600">{guestBanner.text}</p>
        {!guestHasReply && (
          <SignUpButton
            href={`${guestSignInHref}&from=chat-banner`}
            surface="chat-banner"
            locale={guestBanner.locale}
            continueLabel={guestBanner.continueLabel}
            exam={examShortName}
            examCode={examCode}
            explain="own"
            className="mt-2"
          />
        )}
      </div>
    )}
    <div className="mt-4 flex flex-1 flex-col rounded-md border border-ink-200 bg-white">
      {/* A reopened saved chat (30 Sep 2026): when it was last active, and a way to start fresh. */}
      {resume && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-200 bg-ink-50 px-4 py-2 text-xs text-ink-600">
          <p>{resume.note}</p>
          <a href={resume.newChatHref} className="font-medium text-saffron-700 hover:underline">
            + {resume.newChatLabel}
          </a>
        </div>
      )}

      {/* Topic-focus chip */}
      {topicFocus && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-saffron-200 bg-saffron-50/60 px-4 py-2 text-xs">
          <p className="text-ink-700">
            <span className="font-medium text-saffron-800">{labels.focusLabel}:</span>{" "}
            {topicFocus.name}
            <span className="text-ink-500"> · {topicFocus.subjectName} · {topicFocus.examShortName}</span>
          </p>
          <div className="flex items-center gap-3">
            {!school && (
            <button
              type="button"
              onClick={takeTopicDiagnostic}
              disabled={creatingDiag}
              className="rounded-md border border-saffron-400 bg-white px-3 py-1 text-xs font-medium text-saffron-800 hover:bg-saffron-100 disabled:opacity-60"
              title={labels.diagnosticHint}
            >
              {creatingDiag ? `${labels.diagnosticBuilding}…` : `${labels.diagnosticCta} →`}
            </button>
            )}
            <a
              href={examCode ? `/chat?examCode=${encodeURIComponent(examCode)}` : "/chat?general=1"}
              className="text-ink-500 hover:text-ink-800"
            >
              {labels.focusClear} ✕
            </a>
          </div>
        </div>
      )}

      {/* School chat: the AI disclosure, always visible (26 Sep 2026). */}
      {school && (
        <p role="note" className="border-b border-ink-200 bg-ink-50 px-4 py-2 text-xs text-ink-700">
          <span aria-hidden="true">🤖</span> {school.aiLine}
        </p>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" style={{ maxHeight: "calc(100vh - 280px)" }}>
        {messages.length === 0 && (
          <div className="mx-auto max-w-md text-center">
            <p className="text-sm text-ink-600">
              {labels.empty}
              {(topicFocus || examCode) && (
                <>
                  {" "}
                  <strong>
                    {labels.emptyExamPrefix} {topicFocus ? topicFocus.name : school ? school.classLabel : (examShortName ?? examCode)}
                  </strong>.
                </>
              )}
            </p>
            {!capped && !under13 && (
            <ul className="mt-5 grid grid-cols-1 gap-2">
              {starters.map((s) => (
                <li key={s}>
                  <button
                    onClick={() => send(s)}
                    className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-left text-sm text-ink-800 hover:border-saffron-400 hover:bg-saffron-50/40"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
            )}
            {/* The member's recent chats in this scope (30 Sep 2026) — under
                the starters, so nothing is pushed out of the way. */}
            {recentChats && recentChats.items.length > 0 && !capped && !under13 && (
              <div className="mt-6 text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{recentChats.heading}</p>
                <ul className="mt-2 divide-y divide-ink-100 overflow-hidden rounded-md border border-ink-200 bg-white">
                  {recentChats.items.map((c) => (
                    <li key={c.id}>
                      <a
                        href={c.href}
                        onClick={() => beacon({ cta: "chat-recent-open", surface: "chat", examCode, unanswered: c.unanswered })}
                        className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-saffron-50/40"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-ink-800">{c.title}</span>
                          <span className={`block text-[11px] ${c.unanswered ? "text-rose-700" : "text-ink-500"}`}>{c.meta}</span>
                        </span>
                        <span className="shrink-0 text-xs font-medium text-saffron-700">{recentChats.continueLabel} →</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {messages.map((m, i) => {
          // A failed reply: "not-answered" (empty) or "incomplete" (its text
          // stopped part-way — 25 Sep 2026). Only the latest turn can be
          // retried in place.
          const failedKind = failedReplyKind(m);
          const failedNote = failedKind && (
            <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <span>{failedKind === "incomplete" ? TURN_COPY[navLang].incomplete : TURN_COPY[navLang].notAnswered}</span>
              {canRetryAt(messages, i) && (
                <>
                  <span aria-hidden="true">—</span>
                  <button
                    type="button"
                    onClick={retryLastTurn}
                    disabled={busy}
                    className="rounded-md border border-rose-300 bg-white px-2.5 py-0.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-60"
                  >
                    {TURN_COPY[navLang].retry}
                  </button>
                </>
              )}
            </span>
          );
          return (
            <div
              key={m.id}
              className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={
                  m.role === "user"
                    ? "max-w-prose rounded-lg bg-saffron-500 px-4 py-2 text-sm text-white whitespace-pre-line"
                    : failedKind === "not-answered"
                      ? "max-w-prose rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
                      : failedKind === "incomplete"
                        ? "max-w-prose rounded-lg border border-rose-200 bg-ink-100 px-4 py-3 text-sm text-ink-900"
                        : "max-w-prose rounded-lg bg-ink-100 px-4 py-3 text-sm text-ink-900"
                }
              >
                {m.role === "user" ? (
                  m.content
                ) : failedKind === "not-answered" ? (
                  failedNote
                ) : m.content ? (
                  <>
                    <ChatMarkdown text={m.content} />
                    {failedKind === "incomplete" && (
                      <div className="mt-2 border-t border-rose-200 pt-2 text-rose-800">{failedNote}</div>
                    )}
                    {m.lateAnswer && !failedKind && (
                      <p className="mt-2 border-t border-ink-200 pt-2 text-xs text-ink-500">{lateAnswerNote(navLang)}</p>
                    )}
                  </>
                ) : (
                  <span className="text-ink-500">{toolStatus ?? labels.thinking}</span>
                )}
              </div>
            </div>
          );
        })}

        {/* The mistake review keeps going (30 Sep 2026): three quick replies
            under the latest complete tutor reply — each an ordinary turn.
            Never under a failed reply, never while answering, never twice. */}
        {showReviewChips && (
          <div className="flex flex-wrap gap-2">
            {REVIEW_CHIPS[navLang].map((chip, i) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  beacon({ cta: "chat-review-chip", surface: "chat", examCode, chip: i });
                  void send(chip);
                }}
                className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-50"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {importedNote && (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">✓ {importedNote}</p>
        )}

        {/* Guest save card — once the tutor has answered; the callback brings
            them straight back to this chat (general chats to /chat?general=1),
            where the conversation is saved (16 Sep 2026 — it used to be lost).
            30 Sep 2026 (sign-up build 2): after the FIRST completed reply (was
            the second), and a full-width button instead of a text-xs link —
            1 tap in two weeks. No timer, no counter, never over the chat. */}
        {guestSignInHref && !school && !under13 && !busy && messages.some((m) => m.role === "assistant" && m.content && !m.failed) && (
          <div className="rounded-md border border-saffron-200 bg-saffron-50/60 p-3">
            {/* 2 Oct 2026 (founder, standing: "Sign up with Google"): the card
                says what it is for in a line (the words the old button
                carried), and its button is the one shared sign-up button —
                Google's white button with the "G", full width. With a mouse,
                hover or keyboard focus opens the explanation; on every device
                the line above is the card's own (explain="own": no second
                caption). 2 Oct 2026, later: the explanation is this card's own
                entry of the table (door.chat-save.*). It says the chats a
                student has AFTER signing up are saved — never "this chat is
                saved": no carried guest chat has been seen in production. On
                an exam chat it names the exam (the sign-in returns to this
                exam's chat), and it speaks of the student's own mocks only
                where the page said the exam can serve one.
                Still /login (not in the skip-/login test), the same carry-over
                and the same "chat-guest-save" beacon; its sign-in door is now
                named "chat-save" (it was counted as a plain "link"). Review,
                same day: the tooltip opens ABOVE the button — this card is
                the last thing in the scrolling message pane, and a tooltip
                under it was cut off by the pane's edge. */}
            <p data-su-reason className="text-center text-sm font-semibold text-ink-900">
              {examCode == null ? SAVE_COPY[navLang].buttonGeneral : SAVE_COPY[navLang].button}
            </p>
            <SignUpButton
              href={examCode == null ? `/login?callbackUrl=${encodeURIComponent("/chat?general=1")}` : guestSignInHref}
              surface="chat-save"
              locale={navLang}
              exam={examShortName}
              examCode={examCode}
              explain="own"
              side="top"
              block
              className="mt-2"
              onSignInClick={() => {
                keepGuestChatForSignIn();
                beacon({ cta: "chat-guest-save", surface: "chat", examCode });
              }}
            />
            <p className="mt-1.5 text-center text-[11px] text-ink-600">
              {examCode == null ? SAVE_COPY[navLang].subGeneral : SAVE_COPY[navLang].sub}
            </p>
          </div>
        )}

        {/* Human escalation — "still stuck?" appears once the student has
            had a real exchange with the AI (2+ completed replies) and the
            tutor isn't mid-answer. The AI absorbs volume; a real teacher is
            the escape hatch when it isn't landing (human-connection pilot).
            27 Sep 2026: exam chats only — its form asks for a phone number,
            and a general or school chat may be a minor's. */}
        {!school && examCode != null && !busy && messages.filter((m) => m.role === "assistant" && m.content).length >= 2 && (
          <div className="flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50/60 px-3 py-2">
            <p className="text-xs text-ink-600">
              {TURN_COPY[navLang].stuck}
            </p>
            <TalkToTeacher surface="chat" examCode={examCode} variant="link" />
          </div>
        )}

        {!school && actions.length > 0 && (
          <div className="rounded-md border border-saffron-200 bg-saffron-50/60 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-saffron-800">
              {labels.suggested}
            </p>
            <ul className="mt-2 space-y-1.5">
              {actions.map((a, i) => (
                <li key={i} className="text-sm text-ink-800">
                  <span className="rounded-md bg-white px-2 py-0.5 text-xs font-medium text-saffron-800">
                    {a.kind.replace(/_/g, " ")}
                  </span>{" "}
                  {a.reason}
                  {a.topicCode && <span className="ml-1 text-xs text-ink-500">— {a.topicCode}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </div>
        )}
      </div>

      {/* A seed this tab already sent a little while ago waits in the input
          box (24 Sep 2026) — say why it did not send by itself. */}
      {seedHeld && !busy && (
        <p className="border-t border-ink-200 bg-ink-50 px-3 py-2 text-xs text-ink-600">
          {TURN_COPY[navLang].seedHeld}
        </p>
      )}
      {/* A guest's question an outage left unanswered, back in the box (1 Oct 2026). */}
      {guestRestored && !busy && !seedHeld && (
        <p className="border-t border-ink-200 bg-ink-50 px-3 py-2 text-xs text-ink-600">
          {GUEST_RESTORED_NOTE[navLang]}
        </p>
      )}

      {/* School chat, cap reached: the end-of-day line and the way back to
          the chapter, in place of the composer (26 Sep 2026). */}
      {under13 ? (
        <div className="border-t border-ink-200 bg-saffron-50/60 px-4 py-3 text-sm text-ink-800">
          <p>{UNDER13_CLOSED[navLang].line}</p>
          <a href="/schooling" className="mt-2 inline-block text-sm font-medium text-saffron-700 hover:underline">
            {UNDER13_CLOSED[navLang].link}
          </a>
        </div>
      ) : capped ? (
        <div className="border-t border-ink-200 bg-saffron-50/60 px-4 py-3 text-sm text-ink-800">
          <p>{school ? school.capLine : SCHOOL_TUTOR_CAP_COPY[navLang]}</p>
          {school && (
            <a href={school.backHref} className="mt-2 inline-block text-sm font-medium text-saffron-700 hover:underline">
              {school.backLabel}
            </a>
          )}
        </div>
      ) : (
      <>
      {school && messagesLeft != null && (
        <p className="bg-white px-3 pt-2 text-[11px] text-ink-500">
          {school.leftTemplate.replace("{n}", String(messagesLeft)).replace("{cap}", String(SCHOOL_TUTOR_DAILY_CAP))}
        </p>
      )}
      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t border-ink-200 bg-white p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={listening ? "Listening… speak now" : labels.placeholder}
          disabled={busy}
          className="flex-1 rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none disabled:bg-ink-50"
        />
        {speechSupported && (
          <button
            type="button"
            onClick={toggleMic}
            disabled={busy}
            aria-label={listening ? "Stop listening" : "Speak your question"}
            title={listening ? "Stop listening" : "Speak your question"}
            className={`rounded-md border px-3 py-2 text-sm transition-colors disabled:opacity-50 ${
              listening
                ? "animate-pulse border-rose-400 bg-rose-50 text-rose-600"
                : "border-ink-300 bg-white text-ink-600 hover:border-saffron-400 hover:text-saffron-700"
            }`}
          >
            {listening ? "⏹" : "🎤"}
          </button>
        )}
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="btn-primary !py-2 !px-4 text-sm disabled:opacity-50"
        >
          {busy ? "…" : labels.send}
        </button>
      </form>
      </>
      )}
    </div>
    </>
  );
}
