"use client";

// Client-side chat — consumes Server-Sent Events from POST /api/chat.
// Maintains a simple in-memory message log; persistence is handled server-side.

import { useEffect, useRef, useState } from "react";

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
  labels,
}: {
  examCode: string;
  labels: ChatLabels;
}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actions, setActions] = useState<{ kind: string; topicCode?: string; reason: string }[]>([]);
  const [toolStatus, setToolStatus] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

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
        body: JSON.stringify({ examCode, sessionId, message: text }),
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

  return (
    <div className="mt-4 flex flex-1 flex-col rounded-md border border-ink-200 bg-white">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" style={{ maxHeight: "calc(100vh - 280px)" }}>
        {messages.length === 0 && (
          <div className="mx-auto max-w-md text-center">
            <p className="text-sm text-ink-600">
              {labels.empty} <strong>{labels.emptyExamPrefix} {examCode}</strong>.
            </p>
            <ul className="mt-5 grid grid-cols-1 gap-2">
              {labels.starters.map((s) => (
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
                  ? "max-w-prose rounded-lg bg-saffron-500 px-4 py-2 text-sm text-white"
                  : "max-w-prose rounded-lg bg-ink-100 px-4 py-2 text-sm text-ink-900 whitespace-pre-line"
              }
            >
              {m.content || (
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
