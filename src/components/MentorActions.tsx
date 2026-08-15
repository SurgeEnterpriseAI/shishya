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
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="Next steps you agreed with the student (they will see this on their report)…"
        className="w-full rounded-lg border border-ink-200 p-2.5 text-sm focus:border-saffron-400 focus:outline-none"
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
        {busy ? "Saving…" : "Mark session done + send next steps"}
      </button>
    </div>
  );
}
