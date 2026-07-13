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

  /** Log a contact tap (WhatsApp / call) as an enquiry — best-effort,
   *  never blocks the wa.me / tel: navigation. */
  function logTap(kind: "WHATSAPP" | "CALL") {
    try {
      navigator.sendBeacon?.(
        "/api/teacher-request",
        new Blob(
          [
            JSON.stringify({
              message: `[${kind} tap] Student initiated ${kind === "WHATSAPP" ? "a WhatsApp chat" : "a call"}${contextLabel ? ` about ${contextLabel}` : ""}.`,
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

  // Prefilled WhatsApp message — aspirants live on WhatsApp; a wa.me deep
  // link with context is far lower-friction than a phone call or a form
  // (the call-first version got 0 enquiries in its first 12 days).
  const waText = encodeURIComponent(
    `Hi Shishya team! I need help${contextLabel ? ` with ${contextLabel}` : ""}${examCode ? ` (${examCode})` : ""}. — from the ${surface} page`,
  );
  const waHref = `https://wa.me/${EXPERT_PHONE.replace(/\D/g, "")}?text=${waText}`;

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

                {/* Path 1 — WHATSAPP (primary: this audience lives there) */}
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => logTap("WHATSAPP")}
                  className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  WhatsApp our expert — instant reply
                </a>
                {/* Path 2 — call (secondary) */}
                <a
                  href={`tel:${EXPERT_PHONE}`}
                  onClick={() => logTap("CALL")}
                  className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-ink-300 bg-white px-5 py-2.5 text-sm font-semibold text-ink-800 transition-colors hover:bg-ink-50"
                >
                  📞 or call {EXPERT_PHONE_DISPLAY}
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
