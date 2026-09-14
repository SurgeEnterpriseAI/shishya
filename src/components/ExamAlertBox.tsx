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
//
// Phone alerts (13 Sep 2026, reach program #3): under the email option,
// "Alert me on this phone" subscribes THIS device to web-push notifications
// for the exam (rules: src/lib/push-alert-rules.ts; worker: public/push-sw.js).
// The button appears only where the browser supports push and the site has
// a VAPID key, and the browser's permission prompt appears only after that
// tap — never on page load. The server sends one confirmation notification,
// so the student sees at once that it works.

import { useEffect, useState } from "react";
import type { ExamWeekPhase } from "@/lib/exam-week";

export interface ExamAlertPushLabels {
  cta: string;
  done: string;
  denied: string;
  err: string;
}

export interface ExamAlertLabels {
  title: string;
  body: string;
  emailPlaceholder: string;
  btn: string;
  btnSigned: string;
  done: string;
  invalid: string;
  err: string;
  /** Phone-notification option (tracker.alert.push*). English when omitted. */
  push?: ExamAlertPushLabels;
}

/** ew.alert.cta / ew.alert.done — the answer-key / result wording. */
export interface ExamAlertWeekLabels {
  cta: string;
  done: string;
}

/** Phases where "alert me" means the answer key / result, not the notification. */
const KEY_RESULT_PHASES: ReadonlySet<ExamWeekPhase> = new Set<ExamWeekPhase>(["today-pm", "post"]);

const PUSH_DEFAULTS: ExamAlertPushLabels = {
  cta: "📱 Alert me on this phone",
  done: "✓ Phone alerts on — one notification when something real happens.",
  denied: "Notifications are blocked for shishya.in. Allow them in your browser's site settings to get phone alerts.",
  err: "Couldn't turn on phone alerts — try again.",
};

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const pushFlagKey = (examCode: string) => `shishya:push:${examCode}`;

function pushSupported(): boolean {
  try {
    return (
      VAPID_PUBLIC_KEY.length > 0 &&
      window.isSecureContext &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  } catch {
    return false;
  }
}

/** base64url VAPID key → the raw bytes PushManager.subscribe expects. */
function vapidKeyBytes(base64url: string): ArrayBuffer {
  const b64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

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
  // "hidden" on the server and until the effect runs — no hydration mismatch.
  const [pushState, setPushState] = useState<"hidden" | "idle" | "busy" | "done" | "denied">("hidden");
  const [pushErr, setPushErr] = useState<string | null>(null);
  const push = labels.push ?? PUSH_DEFAULTS;

  const keyResultMode = !!phase && KEY_RESULT_PHASES.has(phase) && !!weekLabels;
  const title = keyResultMode ? weekLabels!.cta : labels.title;
  const doneText = keyResultMode ? weekLabels!.done : labels.done;

  useEffect(() => {
    if (!pushSupported()) return;
    let on = false;
    try {
      on = localStorage.getItem(pushFlagKey(examCode)) === "1" && Notification.permission === "granted";
    } catch {
      /* private mode: offer the button, the server de-duplicates */
    }
    setPushState(on ? "done" : "idle");
  }, [examCode]);

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

  async function subscribePush() {
    setPushErr(null);
    setPushState("busy");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushState(permission === "denied" ? "denied" : "idle");
        return;
      }
      const registration = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKeyBytes(VAPID_PUBLIC_KEY) }));
      const json = subscription.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ examCode, subscription: { endpoint: json.endpoint, keys: json.keys } }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPushErr(j?.error ?? push.err);
        setPushState("idle");
        return;
      }
      try {
        localStorage.setItem(pushFlagKey(examCode), "1");
      } catch {
        /* private mode */
      }
      setPushState("done");
      try {
        window.shishyaTrack?.("CTA_CLICKED", { cta: "exam-alert-push", examCode, ...(phase ? { phase } : {}) });
      } catch {
        /* analytics is best-effort */
      }
    } catch {
      setPushErr(push.err);
      setPushState("idle");
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
      {pushState !== "hidden" && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {pushState === "done" ? (
            <span className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">{push.done}</span>
          ) : pushState === "denied" ? (
            <p className="text-xs text-ink-600">{push.denied}</p>
          ) : (
            <button
              type="button"
              disabled={pushState === "busy"}
              onClick={() => void subscribePush()}
              className="rounded-lg border border-saffron-400 bg-white px-3 py-1.5 text-xs font-bold text-saffron-700 hover:bg-saffron-50 disabled:opacity-60"
            >
              {pushState === "busy" ? "…" : push.cta}
            </button>
          )}
        </div>
      )}
      {pushErr && <p className="mt-1 text-xs font-medium text-rose-700">{pushErr}</p>}
      {note && <p className="mt-2 text-xs text-ink-500">{note}</p>}
    </div>
  );
}
