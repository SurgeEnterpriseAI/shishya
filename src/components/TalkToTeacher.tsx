"use client";

// "Talk to a real teacher" — human-connection pilot (entry points + waitlist).
//
// Renders a trigger (a prominent card or an inline link) that opens a short
// form. Submitting POSTs to /api/teacher-request, which files the request for
// the team to work manually and emails them. No teacher marketplace yet — this
// exists to (a) give students the human touch/escalation when the AI + notes
// aren't enough, and (b) measure real demand before investing in supply.

import { useEffect, useState } from "react";

interface Props {
  surface: "results" | "topic" | "chat" | "onboarding" | "nav" | "exam";
  examCode?: string | null;
  topicCode?: string | null;
  attemptId?: string | null;
  /** Prefill when we know the signed-in student. */
  defaultName?: string | null;
  defaultEmail?: string | null;
  /** "card" = prominent block; "link" = inline text link. */
  variant?: "card" | "link";
  /** Optional context to seed the message placeholder, e.g. a topic name. */
  contextLabel?: string;
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
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [name, setName] = useState(defaultName ?? "");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (message.trim().length < 5) {
      setErr("Tell us a little about what you're stuck on.");
      return;
    }
    if (!email.trim()) {
      setErr("Add an email so a teacher can reach you.");
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
          contactPhone: phone || undefined,
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
          <p className="mt-1 text-base font-bold text-ink-900">Talk to a real teacher</p>
          <p className="mt-1 text-xs text-ink-600">
            Get 1:1 help from someone who cleared this exam — we&apos;ll reach out to set it up.
          </p>
        </div>
        <span className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">
          Request help →
        </span>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:text-indigo-800"
      >
        🙋 Talk to a real teacher →
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
            className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Talk to a real teacher"
          >
            {done ? (
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">
                  ✓
                </div>
                <p className="mt-3 text-lg font-bold text-ink-900">Request sent!</p>
                <p className="mt-1 text-sm text-ink-600">
                  Our team will reach out within a day to connect you with a teacher. Keep practising
                  in the meantime — you&apos;re on the right track.
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
              <form onSubmit={submit}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-bold text-ink-900">Talk to a real teacher</p>
                    <p className="mt-1 text-sm text-ink-600">
                      We&apos;re piloting 1:1 help with teachers who cleared these exams. Tell us
                      what you need and we&apos;ll reach out.
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

                <label className="mt-4 block text-xs font-semibold text-ink-700">
                  What do you need help with?
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  autoFocus
                  placeholder={
                    contextLabel
                      ? `e.g. I keep getting ${contextLabel} questions wrong…`
                      : "e.g. I don't understand where to start / this topic keeps confusing me…"
                  }
                  className="mt-1 w-full rounded-lg border border-ink-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />

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
                    <label className="block text-xs font-semibold text-ink-700">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="mt-1 w-full rounded-lg border border-ink-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                </div>
                <label className="mt-3 block text-xs font-semibold text-ink-700">
                  WhatsApp / phone <span className="font-normal text-ink-400">(optional — for a quick callback)</span>
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91…"
                  className="mt-1 w-full rounded-lg border border-ink-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />

                {err && <p className="mt-3 text-xs text-rose-700">{err}</p>}

                <button
                  type="submit"
                  disabled={busy}
                  className="mt-5 w-full rounded-lg bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-wait disabled:opacity-70"
                >
                  {busy ? "Sending…" : "Request a teacher →"}
                </button>
                <p className="mt-2 text-center text-[11px] text-ink-400">
                  Free during the pilot. We&apos;ll never share your details.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
