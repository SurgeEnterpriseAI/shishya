"use client";

// The funnel gate on the Student-360 report. Consent is the whole
// point: the aspirant explicitly chooses to share their preparation
// data with a verified mentor — it is never shared silently.
// 17 Oct 2026 (src/lib/mentor-request.ts): no NEW request in a kids' context
// (`allowNew` false — the page decides with mentorRequestOpen; a request the
// student already has still shows its state), and words the product keeps:
// no promise that a mentor who cleared the exam will pick it up.

import { useState } from "react";
import { MENTOR_REQUEST_COPY as COPY } from "@/lib/mentor-request";

interface Existing {
  status: string;
  meetUrl: string | null;
  mentorName: string | null;
  sessionNote: string | null;
  awaitingPayment?: boolean;
  paymentLink?: string | null;
}

export function MentorRequestCard({
  examCode,
  existing,
  allowNew = true,
}: {
  examCode: string | null;
  existing: Existing | null;
  /** False in a kids' context (mentorRequestOpen): no form, no new request. */
  allowNew?: boolean;
}) {
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  if (existing?.status === "TAKEN" && existing.awaitingPayment) {
    return (
      <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5">
        <p className="text-sm font-bold text-ink-900">
          🎉 Your mentor{existing.mentorName ? ` — ${existing.mentorName}` : ""} accepted!
        </p>
        <p className="mt-1 text-sm text-ink-700">
          One small step: <b>₹9 (incl. GST)</b> — and to be clear about what it&apos;s for:{" "}
          <b>this is only for your mentor&apos;s personal time</b>, a real person sitting down just
          for you. Everything else on Shishya — every mock, note, plan and
          report — is free and stays free forever. Less than a cup of chai, for a conversation that
          can reshape your preparation.
        </p>
        {existing.paymentLink && (
          <a href={existing.paymentLink} target="_blank" rel="noopener noreferrer"
            className="mt-3 inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">
            Honour your mentor&apos;s time — ₹9 &amp; unlock the room →
          </a>
        )}
        <p className="mt-2 text-xs text-ink-500">
          Paid already? Refresh this page — the room appears automatically.
        </p>
      </div>
    );
  }

  if (existing?.status === "TAKEN") {
    return (
      <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-5">
        <p className="text-sm font-bold text-ink-900">🤝 Your mentor{existing.mentorName ? ` — ${existing.mentorName}` : ""} is ready</p>
        <p className="mt-1 text-sm text-ink-700">
          They can see this report and have opened a session room for you. Check your email, or join directly:
        </p>
        {existing.meetUrl && (
          <a href={existing.meetUrl} target="_blank" rel="noopener noreferrer"
            className="mt-3 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            Join the session room →
          </a>
        )}
      </div>
    );
  }

  if (existing?.status === "NEW" || state === "sent") {
    return (
      <div className="rounded-xl border-2 border-saffron-300 bg-saffron-50 p-5">
        <p className="text-sm font-bold text-ink-900">{COPY.sentTitle}</p>
        <p className="mt-1 text-sm text-ink-700">{COPY.sentBody}</p>
      </div>
    );
  }

  // A kids' context: nothing new is offered or stored.
  if (!allowNew) return null;

  return (
    <div className="rounded-xl border-2 border-saffron-300 bg-white p-5">
      <p className="text-sm font-bold text-ink-900">{COPY.formTitle}</p>
      {existing?.status === "DONE" && existing.sessionNote && (
        <div className="mt-2 rounded-lg bg-ink-50 p-3 text-sm text-ink-700">
          <span className="font-semibold">Your mentor&apos;s last next-steps note:</span> {existing.sessionNote}
        </div>
      )}
      <p className="mt-1 text-sm text-ink-600">{COPY.formBody}</p>
      <p className="mt-1 text-xs text-ink-500">{COPY.fee}</p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What do you want to discuss? (optional — e.g. 'scores stuck at 40%, exam in 30 days')"
        rows={2}
        className="mt-3 w-full rounded-lg border border-ink-200 p-2.5 text-sm focus:border-saffron-400 focus:outline-none"
      />
      <label className="mt-2 flex items-start gap-2 text-sm text-ink-700">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
        <span>Share my preparation report (scores, weak areas, activity) with the mentor who takes my request. Nothing is shared without this.</span>
      </label>
      <button
        disabled={!consent || state === "sending"}
        onClick={async () => {
          setState("sending");
          try {
            const r = await fetch("/api/mentor-sessions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ note: note || undefined, examCode, consent }),
            });
            setState(r.ok ? "sent" : "error");
          } catch {
            setState("error");
          }
        }}
        className="mt-3 rounded-lg bg-saffron-500 px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state === "sending" ? "Sending…" : "Request a mentor session"}
      </button>
      {state === "error" && <p className="mt-2 text-xs text-red-600">Something went wrong — try again.</p>}
    </div>
  );
}
