"use client";

// Client-side chat — consumes Server-Sent Events from POST /api/chat.
// Maintains a simple in-memory message log; persistence is handled server-side.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatMarkdown } from "@/components/ChatMarkdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
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
    default: return name ? `Calling ${name}…` : "Thinking…";
  }
}

export function ChatInterface({
  examCode,
  topicFocus,
  initialSeed,
  labels,
}: {
  /** Null when the chat is in "General" mode — exam-agnostic Q&A. The
   *  /api/chat call then sends `general: true` instead of an examCode
   *  and the tutor uses a generic system prompt with no syllabus /
   *  student-state / journey injection. */
  examCode: string | null;
  topicFocus?: TopicFocus | null;
  initialSeed?: string | null;
  labels: ChatLabels;
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

  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // When the user lands here from a topic page (e.g. clicked "Open Shishya
  // tutor" on Number System), auto-fire the seed prompt so the tutor starts
  // teaching immediately instead of showing a blank chat.
  const seedFiredRef = useRef(false);
  useEffect(() => {
    if (seedFiredRef.current) return;
    if (initialSeed && initialSeed.trim()) {
      seedFiredRef.current = true;
      void send(initialSeed.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSeed]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text };
    const placeholder: Message = { id: `a-${Date.now()}`, role: "assistant", content: "" };
    setMessages((m) => [...m, userMsg, placeholder]);
    setInput("");
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
        }),
      });
      if (!res.ok || !res.body) {
        let detail = "";
        try {
          const j = await res.json();
          detail = j?.error ? ` — ${j.error}` : "";
        } catch {}
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
            try {
              const parsed = JSON.parse(data);
              if (Array.isArray(parsed?.actions) && parsed.actions.length) setActions(parsed.actions);
              setToolStatus(null);
            } catch {}
          } else if (event === "error") {
            try {
              const parsed = JSON.parse(data);
              setError(parsed?.error ?? "Chat stream error");
            } catch {
              setError("Chat stream error");
            }
          }
        }
      }
    } catch (e: any) {
      setError(e.message ?? "Chat failed");
    } finally {
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

        {messages.map((m) => (
          <div
            key={m.id}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={
                m.role === "user"
                  ? "max-w-prose rounded-lg bg-saffron-500 px-4 py-2 text-sm text-white whitespace-pre-line"
                  : "max-w-prose rounded-lg bg-ink-100 px-4 py-3 text-sm text-ink-900"
              }
            >
              {m.content ? (
                m.role === "assistant"
                  ? <ChatMarkdown text={m.content} />
                  : m.content
              ) : (
                m.role === "assistant"
                  ? <span className="text-ink-500">{toolStatus ?? labels.thinking}</span>
                  : null
              )}
            </div>
          </div>
        ))}

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
          placeholder={labels.placeholder}
          disabled={busy}
          className="flex-1 rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none disabled:bg-ink-50"
        />
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
