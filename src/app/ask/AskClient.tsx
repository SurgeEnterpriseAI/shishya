"use client";

// Ask Shishya client — question box + staged progress + answer.
// The engine takes 5-20s (tool loop, sometimes web search), so the
// progress states do the psychological work of "it's genuinely
// searching", which it is.

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChatMarkdown } from "@/components/ChatMarkdown";

const STAGES = [
  "Searching Shishya's 177 exams…",
  "Checking vacancies, eligibility & guides…",
  "Cross-checking dates and results…",
  "Writing your answer…",
];

const SUGGESTED = [
  "I want a government job in Bihar — what can I apply for?",
  "Which exams can a 12th-pass student from UP write?",
  "What is the salary in SSC CGL posts?",
  "How many bank job vacancies are there right now?",
];

export function AskClient() {
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [usedWeb, setUsedWeb] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fired = useRef(false);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setBusy(true);
    setErr(null);
    setAnswer(null);
    setStage(0);
    const stager = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 3500);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error ?? "Something hiccuped — try again.");
        return;
      }
      setAnswer(data.answer);
      setUsedWeb(Boolean(data.usedWeb));
    } catch {
      setErr("Network hiccup — try again.");
    } finally {
      clearInterval(stager);
      setBusy(false);
    }
  }

  // Auto-run when arriving with ?q= (from the homepage search box).
  useEffect(() => {
    const initial = sp.get("q");
    if (initial && !fired.current) {
      fired.current = true;
      void ask(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mt-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(q);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask anything — jobs in your state, salary, eligibility, vacancies…"
          className="w-full rounded-xl border-2 border-saffron-300 bg-white px-4 py-3 text-sm text-ink-900 outline-none focus:border-saffron-500"
          maxLength={800}
        />
        <button
          type="submit"
          disabled={busy}
          className="shrink-0 rounded-xl bg-saffron-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600 disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? "…" : "Ask →"}
        </button>
      </form>

      {!answer && !busy && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setQ(s);
                void ask(s);
              }}
              className="rounded-full border border-ink-300 bg-white px-3 py-1 text-xs text-ink-600 hover:border-saffron-400"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {busy && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-saffron-500" aria-hidden />
          <p className="text-sm text-ink-600" aria-live="polite">{STAGES[stage]}</p>
        </div>
      )}

      {err && <p className="mt-4 text-sm text-rose-700">{err}</p>}

      {answer && (
        <div className="mt-6 rounded-xl border border-ink-200 bg-white p-5">
          <ChatMarkdown text={answer} />
          {usedWeb && (
            <p className="mt-4 border-t border-ink-100 pt-3 text-[11px] text-ink-400">
              Parts of this answer came from a live web search and are marked tentative —
              always verify on the official portal before acting.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
