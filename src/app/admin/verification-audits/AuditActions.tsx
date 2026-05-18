"use client";

// Inline audit-decision buttons for /admin/verification-audits.
// Submits to POST /api/admin/verification-audits and on success
// fades the card so the admin sees the queue shrink in real time.

import { useState } from "react";

interface Props {
  verificationId: string;
  factId: string;
}

export function AuditActions({ verificationId, factId }: Props) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { result: string; notes?: string }>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"primary" | "notes-required">("primary");
  const [notes, setNotes] = useState("");
  const [pendingResult, setPendingResult] = useState<"REJECTED" | "CORRECTED" | null>(null);

  async function submit(result: "APPROVED" | "REJECTED" | "CORRECTED", finalNotes?: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/verification-audits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ verificationId, factId, auditResult: result, notes: finalNotes }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || j.message || `HTTP ${res.status}`);
        return;
      }
      setDone({ result, notes: finalNotes });
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div
        className={
          done.result === "APPROVED"
            ? "mt-4 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800"
            : "mt-4 rounded-md bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-800"
        }
      >
        Recorded: <strong>{done.result}</strong>
        {done.notes && <> — {done.notes}</>}
      </div>
    );
  }

  if (mode === "notes-required" && pendingResult) {
    return (
      <div className="mt-4 space-y-2">
        <p className="text-xs font-medium text-ink-900">
          Notes for <strong>{pendingResult}</strong>:
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="What did you find at the source? Why is this verification wrong?"
          className="w-full rounded-md border border-ink-300 bg-white p-2 text-xs text-ink-900 focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
        />
        <p className="text-[10px] text-ink-500">{notes.length}/500</p>
        <div className="flex gap-2">
          <button
            disabled={busy || notes.trim().length < 10}
            onClick={() => submit(pendingResult, notes)}
            className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            Submit
          </button>
          <button
            onClick={() => { setMode("primary"); setPendingResult(null); setNotes(""); }}
            className="rounded-md border border-ink-300 px-3 py-1.5 text-xs text-ink-700 hover:bg-ink-50"
          >
            Back
          </button>
        </div>
        {error && <p className="text-xs text-rose-700">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button
        disabled={busy}
        onClick={() => submit("APPROVED")}
        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        Approved — source matches
      </button>
      <button
        disabled={busy}
        onClick={() => { setMode("notes-required"); setPendingResult("REJECTED"); }}
        className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-800 hover:bg-rose-50"
      >
        Rejected — verifier was wrong
      </button>
      <button
        disabled={busy}
        onClick={() => { setMode("notes-required"); setPendingResult("CORRECTED"); }}
        className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50"
      >
        Corrected — fact updated
      </button>
      {error && <p className="w-full text-xs text-rose-700">{error}</p>}
    </div>
  );
}
