"use client";

// Status + note controls for one educator lead. The note field is
// where the per-educator agreements live: the jointly-defined
// "useful" milestone, the case-study clause yes/no, promises made.

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = ["NEW", "CONTACTED", "PILOT", "CONVERTED", "CLOSED"] as const;

export function LeadActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function send(payload: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/educator-leads/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "failed");
      router.refresh();
      setNote("");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-ink-100 pt-3">
      {STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          disabled={busy || s === status}
          onClick={() => send({ status: s })}
          className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
            s === status
              ? "bg-indigo-600 text-white"
              : "bg-ink-100 text-ink-600 hover:bg-ink-200 disabled:opacity-60"
          }`}
        >
          {s}
        </button>
      ))}
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder='Note — e.g. milestone agreed: "60% weekly-active for a month"…'
        className="min-w-[220px] flex-1 rounded-md border border-ink-200 px-2 py-1 text-xs focus:border-indigo-400 focus:outline-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && note.trim()) send({ note: note.trim() });
        }}
      />
      <button
        type="button"
        disabled={busy || !note.trim()}
        onClick={() => send({ note: note.trim() })}
        className="rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {busy ? "…" : "Save note"}
      </button>
      {err && <p className="w-full text-[11px] text-rose-700">{err}</p>}
    </div>
  );
}
