"use client";

// "Alert me about this exam" — the capture box on the exam tracker
// page (/exams/[code]/updates) and the exam calendar. Same shape as
// SundayLiveTestBanner: signed-in = one tap (we know the email);
// anonymous = one email field, no account needed. Labels come from
// the server page so the box renders in the page's language.

import { useState } from "react";

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

export function ExamAlertBox({
  examCode,
  signedIn,
  labels,
  compact = false,
}: {
  examCode: string;
  signedIn: boolean;
  labels: ExamAlertLabels;
  compact?: boolean;
}) {
  const [state, setState] = useState<"idle" | "form" | "busy" | "done">("idle");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);

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
        setState(withEmail ? "form" : "idle");
        return;
      }
      setState("done");
      try {
        window.shishyaTrack?.("CTA_CLICKED", { cta: "exam-alert", examCode });
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
      <p className={compact ? "text-sm font-bold text-ink-900" : "text-base font-bold text-ink-900"}>{labels.title}</p>
      {!compact && <p className="mt-1 text-sm text-ink-700">{labels.body}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {state === "done" ? (
          <span className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white">{labels.done}</span>
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
    </div>
  );
}
