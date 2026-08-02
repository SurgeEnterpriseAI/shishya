"use client";

// Approve / reject / note controls for one mentor application.

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MentorActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function send(payload: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/mentors/${id}`, {
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
      {["PENDING", "APPROVED", "REJECTED"].map((s) => (
        <button
          key={s}
          type="button"
          disabled={busy || s === status}
          onClick={() => send({ status: s })}
          className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
            s === status
              ? s === "APPROVED"
                ? "bg-emerald-600 text-white"
                : "bg-indigo-600 text-white"
              : "bg-ink-100 text-ink-600 hover:bg-ink-200 disabled:opacity-60"
          }`}
        >
          {s}
        </button>
      ))}
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (call outcome, verification)…"
        className="min-w-[200px] flex-1 rounded-md border border-ink-200 px-2 py-1 text-xs focus:border-indigo-400 focus:outline-none"
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
