"use client";

// Work-an-enquiry controls for /admin/teacher-requests: advance status,
// record the referral (nearby coaching centre / expert — the commercial),
// and log every call/answer/follow-up so the loop closes with a paper trail.

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = ["PENDING", "CONTACTED", "RESOLVED", "CLOSED"] as const;
const KINDS = ["CALL", "NOTE", "FOLLOW_UP", "REFERRAL"] as const;

export function RequestActions({
  id,
  status,
  referredTo,
}: {
  id: string;
  status: string;
  referredTo: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [kind, setKind] = useState<(typeof KINDS)[number]>("CALL");
  const [refTo, setRefTo] = useState(referredTo ?? "");
  const [err, setErr] = useState<string | null>(null);

  async function send(payload: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/teacher-requests/${id}`, {
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
    <div className="mt-3 border-t border-ink-100 pt-3">
      <div className="flex flex-wrap items-center gap-1.5">
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
          value={refTo}
          onChange={(e) => setRefTo(e.target.value)}
          placeholder="Referred to (centre / expert)…"
          className="ml-2 min-w-[180px] flex-1 rounded-md border border-ink-200 px-2 py-1 text-xs focus:border-indigo-400 focus:outline-none"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => send({ referredTo: refTo, ...(refTo ? { note: `Referred to: ${refTo}`, noteKind: "REFERRAL" } : {}) })}
          className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          Save referral
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as any)}
          className="rounded-md border border-ink-200 px-1.5 py-1 text-[11px] text-ink-700 focus:outline-none"
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k.replace("_", " ")}
            </option>
          ))}
        </select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Log the call / answer given / next follow-up…"
          className="min-w-[220px] flex-1 rounded-md border border-ink-200 px-2 py-1 text-xs focus:border-indigo-400 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && note.trim()) send({ note, noteKind: kind });
          }}
        />
        <button
          type="button"
          disabled={busy || !note.trim()}
          onClick={() => send({ note, noteKind: kind })}
          className="rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? "…" : "Add log"}
        </button>
      </div>
      {err && <p className="mt-1 text-[11px] text-rose-700">{err}</p>}
    </div>
  );
}
