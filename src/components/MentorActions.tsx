"use client";

// Mentor-side actions on a session request: claim the student, and
// close the session with a next-steps note (which the student sees on
// their own report — the loop always closes, never dangles).

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TakeButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const r = await fetch(`/api/mentor-sessions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "take" }),
        }).catch(() => null);
        setBusy(false);
        if (r?.ok) router.refresh();
      }}
      className="rounded-lg bg-saffron-500 px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-600 disabled:opacity-50"
    >
      {busy ? "Taking…" : "Take this student"}
    </button>
  );
}

export function DoneForm({ id }: { id: string }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-ink-600">
        ⚠️ Fill this only AFTER the call has happened — it completes the session and moves the
        student to your &ldquo;Recently completed&rdquo; list. Waiting to meet? That&apos;s fine:
        they already have the room link by email, and the session stays active here until you
        close it.
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="After the call: the next steps you both agreed (the student sees this on their report)…"
        className="mt-2 w-full rounded-lg border border-ink-200 p-2.5 text-sm focus:border-saffron-400 focus:outline-none"
      />
      <button
        disabled={busy || note.trim().length < 5}
        onClick={async () => {
          setBusy(true);
          const r = await fetch(`/api/mentor-sessions/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "done", sessionNote: note.trim() }),
          }).catch(() => null);
          setBusy(false);
          if (r?.ok) router.refresh();
        }}
        className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {busy ? "Saving…" : "Session over — send next steps & complete"}
      </button>
      <ReleaseButton id={id} />
    </div>
  );
}

// The call never happened — student didn't show, or the mentor can't
// continue. Without this the only exit from TAKEN was a fake "done",
// which burned the student's one free session and told them a session
// had happened (audit, 18 Aug 2026). Release hands the request back to
// the waiting list; nothing is consumed.
export function ReleaseButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();
  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="mt-2 ml-2 rounded-lg border border-ink-200 px-3 py-2 text-xs font-medium text-ink-600 hover:border-ink-300 hover:bg-ink-50"
      >
        The call didn&apos;t happen — release this student
      </button>
    );
  }
  return (
    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="text-xs text-ink-700">
        This returns the student to the waiting list so any mentor can pick them up. Their free
        session is <span className="font-semibold">not</span> used, and they&apos;ll be told they
        can request again.
      </p>
      <div className="mt-2 flex gap-2">
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const r = await fetch(`/api/mentor-sessions/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "release" }),
            }).catch(() => null);
            setBusy(false);
            if (r?.ok) router.push("/mentor");
          }}
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {busy ? "Releasing…" : "Yes, release"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs text-ink-600 hover:bg-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
