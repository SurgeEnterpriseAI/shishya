"use client";

// PulseAsk — a quiet one-line micro-feedback row (1 Sep 2026).
//
// The founder's ask, verbatim: "not whole pages or popups, just some
// CTAs here and there, not intrusive but encouraging aspirants to share
// something so we know what's in their minds." So:
//   • in-flow only — never fixed, never overlay, no layout shift on
//     submit (the row swaps to a same-height thanks line)
//   • one tap = captured; "Something else…" opens an inline one-line
//     input (signed-in only — anon gets chips only, /api/pulse enforces)
//
// Anti-nag contract (critic-reviewed, stricter than FeedbackWidget):
//   • sessionStorage mutex: at most ONE prompt per browser session
//     across every surface — first mounted wins, the rest render null
//   • per-surface 14-day cooldown after any interaction (dismiss/answer)
//   • answered surface stays silent 60 days
//   • 2 dismissals anywhere → 30-day global snooze
//   • READS FeedbackWidget's snooze key — a widget-snoozed user is
//     silent here too (we never write that key)
// Worst case ≈ 2-3 asks per month for an everyday user.

import { useEffect, useState } from "react";
import { SNOOZE_KEY as WIDGET_SNOOZE_KEY } from "@/components/FeedbackWidget";

const SESSION_MUTEX = "pulse-shown";
const GLOBAL_SNOOZE = "pulse-snooze-until";
const GLOBAL_DISMISS = "pulse-dismiss-count";
const DAY = 86_400_000;

const seenKey = (k: string) => `pulse-seen-${k}`;
const answeredKey = (k: string) => `pulse-answered-${k}`;

function readNum(key: string): number {
  try {
    return Number(localStorage.getItem(key) ?? 0) || 0;
  } catch {
    return 0;
  }
}

export function PulseAsk({
  surface,
  prompt,
  chips,
  signedIn,
  examCode,
  topicCode,
  attemptId,
  promptKey,
}: {
  surface: "results" | "coach" | "exam" | "updates" | "pyq";
  prompt: string;
  chips: string[];
  signedIn: boolean;
  examCode?: string;
  topicCode?: string;
  attemptId?: string;
  /** Cooldown key override — e.g. `results-SSC_CGL` keys per exam. */
  promptKey?: string;
}) {
  const key = promptKey ?? surface;
  const [state, setState] = useState<"hidden" | "idle" | "text" | "busy" | "done">("hidden");
  const [text, setText] = useState("");
  const [err, setErr] = useState(false);

  useEffect(() => {
    try {
      const now = Date.now();
      if (Number(localStorage.getItem(WIDGET_SNOOZE_KEY) ?? 0) > now) return;
      if (readNum(GLOBAL_SNOOZE) > now) return;
      if (readNum(answeredKey(key)) > now - 60 * DAY) return;
      if (readNum(seenKey(key)) > now - 14 * DAY) return;
      if (sessionStorage.getItem(SESSION_MUTEX)) return;
      sessionStorage.setItem(SESSION_MUTEX, key);
      setState("idle");
    } catch {
      /* storage unavailable → stay hidden */
    }
  }, [key]);

  if (state === "hidden") return null;

  const markSeen = () => {
    try {
      localStorage.setItem(seenKey(key), String(Date.now()));
    } catch {}
  };

  const dismiss = () => {
    markSeen();
    try {
      const n = readNum(GLOBAL_DISMISS) + 1;
      localStorage.setItem(GLOBAL_DISMISS, String(n));
      if (n >= 2) {
        localStorage.setItem(GLOBAL_SNOOZE, String(Date.now() + 30 * DAY));
        localStorage.setItem(GLOBAL_DISMISS, "0");
      }
    } catch {}
    setState("hidden");
  };

  const submit = async (chip: string, freeText?: string) => {
    setState("busy");
    setErr(false);
    try {
      const res = await fetch("/api/pulse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ surface, chip, text: freeText || undefined, examCode, topicCode, attemptId }),
      });
      if (!res.ok) throw new Error();
      markSeen();
      try {
        localStorage.setItem(answeredKey(key), String(Date.now()));
        localStorage.setItem(GLOBAL_DISMISS, "0");
      } catch {}
      setState("done");
    } catch {
      setErr(true);
      setState(freeText !== undefined ? "text" : "idle");
    }
  };

  if (state === "done") {
    return (
      <div className="mt-4 rounded-md border border-ink-200 bg-ink-50/50 px-3 py-2 text-sm text-ink-600">
        🙏 Noted — this goes straight to the team. Thank you.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-md border border-ink-200 bg-ink-50/50 px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-ink-700">{prompt}</p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 text-xs text-ink-400 hover:text-ink-600"
        >
          ✕
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {chips.map((c) => (
          <button
            key={c}
            type="button"
            disabled={state === "busy"}
            onClick={() => submit(c)}
            className="rounded-full border border-ink-300 bg-white px-2.5 py-1 text-xs font-medium text-ink-700 transition-colors hover:border-saffron-400 hover:text-saffron-700 disabled:opacity-50"
          >
            {c}
          </button>
        ))}
        {signedIn && state !== "text" && (
          <button
            type="button"
            disabled={state === "busy"}
            onClick={() => setState("text")}
            className="rounded-full border border-dashed border-ink-300 bg-white px-2.5 py-1 text-xs font-medium text-ink-500 transition-colors hover:border-saffron-400 hover:text-saffron-700 disabled:opacity-50"
          >
            Something else…
          </button>
        )}
      </div>
      {state === "text" && (
        <form
          className="mt-2 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim().length >= 3) void submit("Something else", text.trim());
          }}
        >
          <input
            autoFocus
            value={text}
            maxLength={280}
            onChange={(e) => setText(e.target.value)}
            placeholder="One line — what's on your mind?"
            className="min-w-0 flex-1 rounded-md border border-ink-300 bg-white px-2.5 py-1.5 text-sm text-ink-800 placeholder:text-ink-400 focus:border-saffron-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={text.trim().length < 3}
            className="shrink-0 rounded-md bg-saffron-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-saffron-600 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      )}
      {err && <p className="mt-1 text-xs text-red-600">Couldn&apos;t send — try once more.</p>}
    </div>
  );
}
