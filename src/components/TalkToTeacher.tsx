"use client";

// "Talk to a subject expert" — the human-connection layer, call-first.
//
// Placed at every high-intent stuck moment (wrong answer, low score, weak
// areas, topic page, tutor chat). Two paths:
//   1. CALL NOW — tel: link straight to the Surge office line (staffed
//      during office hours); the tap is also logged as an enquiry so the
//      team sees who called and can follow up.
//   2. REQUEST A CALLBACK — short form (phone required, city captured for
//      nearby coaching-centre/expert routing — the referral business model).
// Every enquiry lands in /admin/teacher-requests where the team logs
// answers, follow-ups, and referrals so the loop closes.

import { useEffect, useState } from "react";

// Surge office line for subject-expert calls. Override per environment with
// NEXT_PUBLIC_EXPERT_PHONE (E.164, e.g. +917624967999).
const EXPERT_PHONE = process.env.NEXT_PUBLIC_EXPERT_PHONE ?? "+917624967999";
const EXPERT_PHONE_DISPLAY = EXPERT_PHONE.replace(/^\+91/, "+91 ");
const OFFICE_HOURS = "10 AM – 7 PM IST, Mon–Sat";

interface Props {
  surface:
    | "results"
    | "topic"
    | "chat"
    | "onboarding"
    | "nav"
    | "exam"
    | "review"
    | "weak-areas"
    | "dashboard";
  examCode?: string | null;
  topicCode?: string | null;
  attemptId?: string | null;
  defaultName?: string | null;
  defaultEmail?: string | null;
  /** "card" = prominent block; "link" = inline text link. */
  variant?: "card" | "link";
  /** Optional context label, e.g. a topic name — seeds the message. */
  contextLabel?: string;
  /** Optional custom link label (link variant only). */
  linkLabel?: string;
}

export function TalkToTeacher({
  surface,
  examCode,
  topicCode,
  attemptId,
  defaultName,
  defaultEmail,
  variant = "card",
  contextLabel,
  linkLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [name, setName] = useState(defaultName ?? "");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  /** Log the call-now tap as an enquiry (best-effort, never blocks tel:). */
  function logCallTap() {
    try {
      navigator.sendBeacon?.(
        "/api/teacher-request",
        new Blob(
          [
            JSON.stringify({
              message: `[CALL-NOW tap] Student initiated a call${contextLabel ? ` about ${contextLabel}` : ""}.`,
              surface,
              examCode: examCode ?? undefined,
              topicCode: topicCode ?? undefined,
              attemptId: attemptId ?? undefined,
              contactName: name || defaultName || undefined,
              contactEmail: email || defaultEmail || undefined,
              wantsCall: true,
            }),
          ],
          { type: "application/json" },
        ),
      );
    } catch {
      /* best-effort */
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (message.trim().length < 5) {
      setErr("Tell us a little about what you need help with.");
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) {
      setErr("Add a phone number so our expert can call you back.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/teacher-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message,
          surface,
          examCode: examCode ?? undefined,
          topicCode: topicCode ?? undefined,
          attemptId: attemptId ?? undefined,
          contactName: name || undefined,
          contactEmail: email || undefined,
          contactPhone: phone,
          city: city || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error ?? "Couldn't send that — please try again.");
        setBusy(false);
        return;
      }
      setDone(true);
    } catch {
      setErr("Network hiccup — try again.");
      setBusy(false);
    }
  }

  const trigger =
    variant === "card" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 p-5 text-left shadow-sm transition-colors hover:border-indigo-300"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
            Prefer a human?
          </p>
          <p className="mt-1 text-base font-bold text-ink-900">Talk to a subject expert</p>
          <p className="mt-1 text-xs text-ink-600">
            Call our expert desk or get a callback — personal guidance to better your chances.
          </p>
        </div>
        <span className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">
          📞 Talk now →
        </span>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:text-indigo-800"
      >
        {linkLabel ?? "🙋 Talk to a subject expert →"}
      </button>
    );

  return (
    <>
      {trigger}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/50 p-0 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Talk to a subject expert"
          >
            {done ? (
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">
                  ✓
                </div>
                <p className="mt-3 text-lg font-bold text-ink-900">Request received!</p>
                <p className="mt-1 text-sm text-ink-600">
                  Our subject expert will call you back{city ? ` (we'll also look for good options near ${city})` : ""}.
                  Keep practising in the meantime — you&apos;re on the right track.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-primary mt-5 !py-2 !px-5 text-sm"
                >
                  Done
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-bold text-ink-900">Talk to a subject expert</p>
                    <p className="mt-1 text-sm text-ink-600">
                      Real guidance from our expert desk — doubts, strategy, and where to get the
                      right coaching near you.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="ml-2 shrink-0 rounded-md p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                  >
                    ✕
                  </button>
                </div>

                {/* Path 1 — CALL NOW */}
                <a
                  href={`tel:${EXPERT_PHONE}`}
                  onClick={logCallTap}
                  className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
                >
                  📞 Call now — {EXPERT_PHONE_DISPLAY}
                </a>
                <p className="mt-1 text-center text-[11px] text-ink-500">
                  Expert desk hours: {OFFICE_HOURS}
                </p>

                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-ink-200" />
                  <span className="text-xs text-ink-400">or get a callback</span>
                  <div className="h-px flex-1 bg-ink-200" />
                </div>

                {/* Path 2 — CALLBACK form */}
                <form onSubmit={submit}>
                  <label className="block text-xs font-semibold text-ink-700">
                    What do you need help with?
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={2}
                    placeholder={
                      contextLabel
                        ? `e.g. I keep getting ${contextLabel} questions wrong…`
                        : "e.g. my score is stuck / which topics should I focus on…"
                    }
                    className="mt-1 w-full rounded-lg border border-ink-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-ink-700">
                        Phone / WhatsApp <span className="text-rose-600">*</span>
                      </label>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91…"
                        className="mt-1 w-full rounded-lg border border-ink-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink-700">
                        Your city <span className="font-normal text-ink-400">(for nearby options)</span>
                      </label>
                      <input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Lucknow"
                        className="mt-1 w-full rounded-lg border border-ink-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-ink-700">Name</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className="mt-1 w-full rounded-lg border border-ink-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink-700">
                        Email <span className="font-normal text-ink-400">(optional)</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@email.com"
                        className="mt-1 w-full rounded-lg border border-ink-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                  </div>

                  {err && <p className="mt-3 text-xs text-rose-700">{err}</p>}

                  <button
                    type="submit"
                    disabled={busy}
                    className="mt-4 w-full rounded-lg bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-wait disabled:opacity-70"
                  >
                    {busy ? "Sending…" : "Request a callback →"}
                  </button>
                  <p className="mt-2 text-center text-[11px] text-ink-400">
                    Free guidance. We&apos;ll never share your details without asking.
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
