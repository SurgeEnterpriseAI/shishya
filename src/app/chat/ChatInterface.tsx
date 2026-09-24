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

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import { TalkToTeacher } from "@/components/TalkToTeacher";
import { markSeedFired, seedFingerprint, stripSeedParam, wasSeedFiredRecently } from "@/lib/chat-seed-once";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** The reply never arrived (error, outage, dropped stream) — the bubble offers Retry. */
  failed?: boolean;
  /** User turns: this turn's id, sent again by its Retry so the server knows which turn failed. */
  turnId?: string;
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

const GUEST_CHAT_KEY = "shishya_guest_chat";
/** How long after the save tap the sign-in may pick the chat up. */
const GUEST_CHAT_TTL_MS = 30 * 60_000;
const GUEST_CHAT_MAX_TURNS = 24;

const SAVE_COPY = {
  en: {
    saved: "Your guest conversation is saved to your account.",
    // The nudge is split around the sign-in link (16 Sep 2026, i18n.10).
    nudge: "Save this conversation and let the tutor see your mock mistakes — ",
    nudgeLink: "sign in, free",
    nudgeEnd: ".",
  },
  hi: {
    saved: "आपकी गेस्ट बातचीत आपके अकाउंट में सेव हो गई है।",
    nudge: "इस बातचीत को सेव करें और ट्यूटर को अपनी मॉक की गलतियाँ देखने दें — ",
    nudgeLink: "साइन इन करें, मुफ़्त",
    nudgeEnd: "।",
  },
  te: {
    saved: "మీ గెస్ట్ సంభాషణ మీ అకౌంట్‌లో సేవ్ అయింది.",
    nudge: "ఈ సంభాషణను సేవ్ చేసి, మీ మాక్ తప్పులను ట్యూటర్ చూడనివ్వండి — ",
    nudgeLink: "సైన్ ఇన్ చేయండి, ఉచితం",
    nudgeEnd: ".",
  },
} as const;

// A turn with no reply, a seed held back, and the guest tutor declining a
// browser it takes for a crawler (24 Sep 2026). The last is signed-out only:
// signed-in students are never judged by their user-agent.
const TURN_COPY = {
  en: {
    notAnswered: "Not answered",
    retry: "Retry",
    seedHeld: "You asked this here a little while ago, so it was not sent again. Send it when you want to.",
    unavailable: "The guest tutor isn't available in this browser. Sign in (free) to use the tutor.",
  },
  hi: {
    notAnswered: "जवाब नहीं आया",
    retry: "फिर से भेजें",
    seedHeld: "आपने यह यहाँ कुछ देर पहले पूछा था, इसलिए इसे दोबारा नहीं भेजा गया। जब चाहें, भेज दें।",
    unavailable: "इस ब्राउज़र में गेस्ट ट्यूटर उपलब्ध नहीं है। ट्यूटर के लिए साइन इन करें (मुफ़्त)।",
  },
  te: {
    notAnswered: "సమాధానం రాలేదు",
    retry: "మళ్లీ పంపండి",
    seedHeld: "మీరు ఇది ఇక్కడ కొద్దిసేపటి క్రితం అడిగారు, కాబట్టి మళ్లీ పంపలేదు. కావాలనుకున్నప్పుడు పంపండి.",
    unavailable: "ఈ బ్రౌజర్‌లో గెస్ట్ ట్యూటర్ అందుబాటులో లేదు. ట్యూటర్ కోసం సైన్ ఇన్ చేయండి (ఉచితం).",
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
  topicFocus,
  initialSeed,
  seedScope,
  labels,
  guestSignInHref,
}: {
  /** Null when the chat is in "General" mode — exam-agnostic Q&A. The
   *  /api/chat call then sends `general: true` instead of an examCode
   *  and the tutor uses a generic system prompt with no syllabus /
   *  student-state / journey injection. */
  examCode: string | null;
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
}) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actions, setActions] = useState<{ kind: string; topicCode?: string; reason: string }[]>([]);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const [creatingDiag, setCreatingDiag] = useState(false);
  const [importedNote, setImportedNote] = useState<string | null>(null);
  // This island's own lines in the site UI language (16 Sep 2026). Read after
  // mount — the server cannot see the shishya-lang cookie, and the guest save
  // nudge only appears after two completed tutor replies, so nothing is ever
  // repainted under the reader.
  const [navLang, setNavLang] = useState<"en" | "hi" | "te">("en");
  useEffect(() => {
    setNavLang(uiLang());
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

  // Guest tapped "Save this conversation": keep the finished turns so the
  // sign-in can save them (see header). Only complete user→assistant
  // exchanges; a turn too long for the import route is left out.
  function keepGuestChatForSignIn() {
    const turns = messages
      .filter((m) => m.content.trim() && m.content.length <= 8000)
      .map((m) => ({ role: m.role, content: m.content }));
    if (turns.length && turns[turns.length - 1].role === "user") turns.pop();
    let tail = turns.slice(-GUEST_CHAT_MAX_TURNS);
    if (tail[0]?.role === "assistant") tail = tail.slice(1);
    if (!tail.some((t) => t.role === "assistant")) return;
    try {
      localStorage.setItem(GUEST_CHAT_KEY, JSON.stringify({ v: 1, examCode: examCode ?? null, savedAt: Date.now(), turns: tail }));
    } catch {
      /* storage blocked — the chat still works, it just isn't carried over */
    }
  }

  // Signed in: a guest chat from this browser for this same chat → save it once.
  const importTriedRef = useRef(false);
  // Set by send(): once the student has sent a turn, a late import is saved
  // server-side but not swapped into the screen.
  const sentRef = useRef(false);
  useEffect(() => {
    if (guestSignInHref || importTriedRef.current) return;
    importTriedRef.current = true;
    let saved: { v?: number; examCode?: string | null; savedAt?: number; turns?: { role: string; content: string }[] } | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(GUEST_CHAT_KEY) ?? "null");
    } catch {
      return;
    }
    if (!saved || saved.v !== 1 || !Array.isArray(saved.turns) || typeof saved.savedAt !== "number") return;
    const drop = () => {
      try {
        localStorage.removeItem(GUEST_CHAT_KEY);
      } catch {
        /* ignore */
      }
    };
    if (Date.now() - saved.savedAt > GUEST_CHAT_TTL_MS) return drop();
    // Another chat (other exam, or general) keeps the key for its own page.
    if ((saved.examCode ?? null) !== (examCode ?? null)) return;
    // A seeded chat starts its own turn right away; don't race it.
    if (initialSeed && initialSeed.trim()) return;
    fetch("/api/chat/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ examCode: examCode ?? null, turns: saved.turns.slice(-GUEST_CHAT_MAX_TURNS) }),
    })
      .then(async (res) => {
        if (res.status === 429 || res.status >= 500) return; // try again on a later visit
        drop();
        const j = res.ok ? await res.json().catch(() => null) : null;
        const turns = Array.isArray(j?.turns) ? (j.turns as { role: string; content: string }[]) : [];
        if (typeof j?.sessionId !== "string" || turns.length === 0) return;
        if (!sentRef.current) {
          setMessages(
            turns.map((t, i) => ({
              id: `g-${i}`,
              role: t.role === "assistant" ? ("assistant" as const) : ("user" as const),
              content: t.content,
            })),
          );
          setSessionId(j.sessionId);
        }
        setImportedNote(SAVE_COPY[uiLang()].saved);
        beacon({ cta: "chat-guest-imported", surface: "chat", examCode, pairs: Math.floor(turns.length / 2) });
      })
      .catch(() => {
        /* network: the key stays for the next visit */
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
  // September. There is no way to reopen a stored conversation on this page,
  // so a held seed is the honest fallback; for a signed-in student, sending
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
    void send(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSeed]);

  // The reply never arrived: the empty bubble becomes "Not answered — Retry".
  function markLastReplyFailed() {
    setMessages((m) => {
      const last = m[m.length - 1];
      if (last?.role !== "assistant" || last.content) return m;
      return [...m.slice(0, -1), { ...last, failed: true }];
    });
  }

  // "Retry" on the last turn: the same text again, in place (24 Sep 2026).
  // A signed-in retry reuses the stored question row instead of adding a
  // second one, and gets the stored reply if one was saved after all — the
  // same turnId tells the server which turn this is.
  function retryLastTurn() {
    const last = messages[messages.length - 1];
    const prev = messages[messages.length - 2];
    if (busy || !last?.failed || prev?.role !== "user") return;
    beacon({ cta: "chat-retry", surface: "chat", examCode });
    void send(prev.content, { retry: true, turnId: prev.turnId });
  }

  async function send(text: string, opts: { retry?: boolean; turnId?: string } = {}) {
    if (!text.trim() || busy) return;
    sentRef.current = true;
    setImportedNote(null);
    setSeedHeld(false);
    // Snapshot prior turns BEFORE we append the new message. Sent in the
    // request body so anonymous (signed-out) chats — which aren't stored
    // server-side — still get multi-turn context. Signed-in chats ignore
    // this and use their DB-persisted history. A retry re-sends the failed
    // turn in place: that turn (the last user bubble and its empty reply)
    // stays out of the snapshot, and only its reply bubble is replaced.
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
        if (res.status === 403 && code === "unavailable") throw new Error(TURN_COPY[uiLang()].unavailable);
        throw new Error(`Chat failed (${res.status})${detail}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      // A done or error event arrived. A stream that just stops (a dropped
      // connection) leaves the turn unanswered, and it is shown as such.
      let settled = false;

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
            settled = true;
            try {
              const parsed = JSON.parse(data);
              if (Array.isArray(parsed?.actions) && parsed.actions.length) setActions(parsed.actions);
              setToolStatus(null);
            } catch {}
          } else if (event === "error") {
            settled = true;
            markLastReplyFailed();
            try {
              const parsed = JSON.parse(data);
              setError(parsed?.error ?? "Chat stream error");
            } catch {
              setError("Chat stream error");
            }
          }
        }
      }
      if (!settled) markLastReplyFailed();
    } catch (e: any) {
      markLastReplyFailed();
      setError(e.message ?? "Chat failed");
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

  // Topic-tailored starters override the generic ones when focused.
  const starters: string[] = topicFocus
    ? [
        `Go deeper on ${topicFocus.name} for ${topicFocus.examShortName} — examples and edge cases I should know.`,
        `Give me 3 fastest shortcuts to solve ${topicFocus.name} questions in the exam.`,
        `What are the most common mistakes students make on ${topicFocus.name}? How do I avoid them?`,
        `Quiz me on ${topicFocus.name} — start with one easy question, then go harder based on how I answer.`,
      ]
    : labels.starters;

  return (
    <div className="mt-4 flex flex-1 flex-col rounded-md border border-ink-200 bg-white">
      {/* Topic-focus chip */}
      {topicFocus && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-saffron-200 bg-saffron-50/60 px-4 py-2 text-xs">
          <p className="text-ink-700">
            <span className="font-medium text-saffron-800">{labels.focusLabel}:</span>{" "}
            {topicFocus.name}
            <span className="text-ink-500"> · {topicFocus.subjectName} · {topicFocus.examShortName}</span>
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={takeTopicDiagnostic}
              disabled={creatingDiag}
              className="rounded-md border border-saffron-400 bg-white px-3 py-1 text-xs font-medium text-saffron-800 hover:bg-saffron-100 disabled:opacity-60"
              title={labels.diagnosticHint}
            >
              {creatingDiag ? `${labels.diagnosticBuilding}…` : `${labels.diagnosticCta} →`}
            </button>
            <a
              href={examCode ? `/chat?examCode=${encodeURIComponent(examCode)}` : "/chat?general=1"}
              className="text-ink-500 hover:text-ink-800"
            >
              {labels.focusClear} ✕
            </a>
          </div>
        </div>
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
                    {labels.emptyExamPrefix} {topicFocus ? topicFocus.name : examCode}
                  </strong>.
                </>
              )}
            </p>
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
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={m.id}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={
                m.role === "user"
                  ? "max-w-prose rounded-lg bg-saffron-500 px-4 py-2 text-sm text-white whitespace-pre-line"
                  : m.failed && !m.content
                    ? "max-w-prose rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
                    : "max-w-prose rounded-lg bg-ink-100 px-4 py-3 text-sm text-ink-900"
              }
            >
              {m.content ? (
                m.role === "assistant"
                  ? <ChatMarkdown text={m.content} />
                  : m.content
              ) : m.role === "assistant" ? (
                m.failed ? (
                  // Only the latest turn can be retried in place.
                  <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    <span>{TURN_COPY[navLang].notAnswered}</span>
                    {i === messages.length - 1 && messages[i - 1]?.role === "user" && (
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
                ) : (
                  <span className="text-ink-500">{toolStatus ?? labels.thinking}</span>
                )
              ) : null}
            </div>
          </div>
        ))}

        {importedNote && (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">✓ {importedNote}</p>
        )}

        {/* Guest save card — after the second completed reply the guest has
            seen the tutor work; this is the one moment the sign-in ask is
            earned. Plain link, no timer, no counter; the callback brings
            them straight back to this chat (general chats to /chat?general=1,
            the page that can pick the saved conversation up), where the
            conversation is saved (16 Sep 2026 — it used to be lost). */}
        {guestSignInHref && !busy && messages.filter((m) => m.role === "assistant" && m.content).length >= 2 && (
          <div className="rounded-md border border-saffron-200 bg-saffron-50/60 px-3 py-2">
            <p className="text-xs text-ink-700">
              {SAVE_COPY[navLang].nudge}
              <a
                href={examCode == null ? `/login?callbackUrl=${encodeURIComponent("/chat?general=1")}` : guestSignInHref}
                onClick={() => {
                  keepGuestChatForSignIn();
                  beacon({ cta: "chat-guest-save", surface: "chat", examCode });
                }}
                className="font-semibold text-saffron-700 hover:underline"
              >
                {SAVE_COPY[navLang].nudgeLink}
              </a>
              {SAVE_COPY[navLang].nudgeEnd}
            </p>
          </div>
        )}

        {/* Human escalation — "still stuck?" appears once the student has
            had a real exchange with the AI (2+ completed replies) and the
            tutor isn't mid-answer. The AI absorbs volume; a real teacher is
            the escape hatch when it isn't landing (human-connection pilot). */}
        {!busy && messages.filter((m) => m.role === "assistant" && m.content).length >= 2 && (
          <div className="flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50/60 px-3 py-2">
            <p className="text-xs text-ink-600">
              Still stuck after chatting with Shishya?
            </p>
            <TalkToTeacher surface="chat" examCode={examCode} variant="link" />
          </div>
        )}

        {actions.length > 0 && (
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
    </div>
  );
}
