"use client";

// "Alert me about this exam" — the capture box on the exam tracker
// page (/exams/[code]/updates) and the exam calendar. Same shape as
// SundayLiveTestBanner: signed-in = one tap (we know the email);
// anonymous = one email field, no account needed. Labels come from
// the server page so the box renders in the page's language.
//
// Exam Week Mode (6 Sep 2026): the box is phase-aware. On exam evening
// and in the post-exam week the promise a student wants is "tell me when
// the answer key / result is out", so the server page passes the ew.alert.*
// strings as `weekLabels` and the phase; the box swaps the title and the
// confirmation for post / today-pm and keeps the default copy elsewhere.
// Every existing mount (examCode + signedIn + labels [+ compact]) renders
// exactly as before — the new props are optional.

import { useState } from "react";
import type { ExamWeekPhase } from "@/lib/exam-week";

export interface ExamAlertLabels {
  title: string;
  body: string;
  emailPlaceholder: string;
  btn: string;
  btnSigned: string;
  done: string;
  invalid: string;
  err: string;
}

/** ew.alert.cta / ew.alert.done — the answer-key / result wording. */
export interface ExamAlertWeekLabels {
  cta: string;
  done: string;
}

/** Phases where "alert me" means the answer key / result, not the notification. */
const KEY_RESULT_PHASES: ReadonlySet<ExamWeekPhase> = new Set<ExamWeekPhase>(["today-pm", "post"]);

export function ExamAlertBox({
  examCode,
  signedIn,
  labels,
  compact = false,
  phase,
  weekLabels,
  note,
}: {
  examCode: string;
  signedIn: boolean;
  labels: ExamAlertLabels;
  compact?: boolean;
  /** From computeExamWeekState(); only "today-pm" and "post" change the copy. */
  phase?: ExamWeekPhase;
  /** Required for the phase copy to apply (server-translated ew.alert.*). */
  weekLabels?: ExamAlertWeekLabels;
  /** Light footnote under the control, e.g. the existing tracker.alert.body
   *  ("one email when something real happens … unsubscribe anytime"). */
  note?: string;
}) {
  const [state, setState] = useState<"idle" | "form" | "busy" | "done">("idle");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const keyResultMode = !!phase && KEY_RESULT_PHASES.has(phase) && !!weekLabels;
  const title = keyResultMode ? weekLabels!.cta : labels.title;
  const doneText = keyResultMode ? weekLabels!.done : labels.done;

  async function subscribe(withEmail?: string) {
    setErr(null);
    setState("busy");
    try {
      const res = await fetch("/api/exam-alerts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ examCode, email: withEmail }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(j?.error ?? labels.err);
        // A one-tap (no email) attempt that the server bounced with 400
        // means the session is gone since render — offer the email field
        // instead of a dead button.
        setState(withEmail || res.status === 400 ? "form" : "idle");
        return;
      }
      setState("done");
      try {
        window.shishyaTrack?.("CTA_CLICKED", { cta: "exam-alert", examCode, ...(phase ? { phase } : {}) });
      } catch {
        /* analytics is best-effort */
      }
    } catch {
      setErr(labels.err);
      setState(withEmail ? "form" : "idle");
    }
  }

  return (
    <div
      className={
        compact
          ? "rounded-xl border border-saffron-200 bg-saffron-50/70 px-4 py-3"
          : "rounded-xl border-2 border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 p-5"
      }
    >
      <p className={compact ? "text-sm font-bold text-ink-900" : "text-base font-bold text-ink-900"}>{title}</p>
      {!compact && <p className="mt-1 text-sm text-ink-700">{labels.body}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {state === "done" ? (
          <span className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white">{doneText}</span>
        ) : state === "form" ? (
          <>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={labels.emailPlaceholder}
              aria-label="Email"
              className="w-56 max-w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-saffron-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
                  setErr(labels.invalid);
                  return;
                }
                void subscribe(email);
              }}
              className="rounded-lg bg-saffron-500 px-4 py-2 text-sm font-bold text-white hover:bg-saffron-600"
            >
              {labels.btn}
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={state === "busy"}
            onClick={() => (signedIn ? void subscribe() : setState("form"))}
            className="rounded-lg bg-saffron-500 px-4 py-2 text-sm font-bold text-white hover:bg-saffron-600 disabled:opacity-60"
          >
            {state === "busy" ? "…" : signedIn ? labels.btnSigned : `🔔 ${labels.btn}`}
          </button>
        )}
      </div>
      {err && <p className="mt-2 text-xs font-medium text-rose-700">{err}</p>}
      {note && <p className="mt-2 text-xs text-ink-500">{note}</p>}
    </div>
  );
}
