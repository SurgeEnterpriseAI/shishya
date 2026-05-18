"use client";

// Admin promote / deny / defer buttons.

import { useState } from "react";

interface Props {
  userId: string;
  email: string;
}

export function PromotionActions({ userId, email }: Props) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { kind: string; reason?: string }>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"primary" | "deny" | "defer">("primary");
  const [reason, setReason] = useState("");

  async function submit(kind: "PROMOTE" | "DENY" | "DEFER", finalReason?: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/verification-promotions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, kind, reason: finalReason }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || j.message || `HTTP ${res.status}`);
        return;
      }
      setDone({ kind, reason: finalReason });
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const colour = done.kind === "PROMOTE" ? "emerald" : done.kind === "DENY" ? "rose" : "amber";
    return (
      <div className={`mt-3 rounded-md border bg-${colour}-50 border-${colour}-200 px-3 py-2 text-xs text-${colour}-800`}>
        Recorded: <strong>{done.kind}</strong> for {email}
        {done.reason && <> — {done.reason}</>}
      </div>
    );
  }

  if (mode === "deny" || mode === "defer") {
    const action = mode === "deny" ? "DENY" : "DEFER";
    const colour = mode === "deny" ? "rose" : "amber";
    return (
      <div className="mt-3 space-y-2">
        <p className="text-xs font-medium text-ink-900">
          Reason for <strong>{action}</strong>:
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder={mode === "deny" ? "What disqualifies this verifier?" : "What additional signal do you want to see first?"}
          className="w-full rounded-md border border-ink-300 bg-white p-2 text-xs text-ink-900 focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
        />
        <p className="text-[10px] text-ink-500">{reason.length}/500</p>
        <div className="flex gap-2">
          <button
            disabled={busy || reason.trim().length < 10}
            onClick={() => submit(action as "DENY" | "DEFER", reason)}
            className={`rounded-md bg-${colour}-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-${colour}-700 disabled:opacity-60`}
          >
            Submit {action}
          </button>
          <button
            onClick={() => { setMode("primary"); setReason(""); }}
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
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        disabled={busy}
        onClick={() => submit("PROMOTE")}
        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        Promote to Trusted Verifier
      </button>
      <button
        disabled={busy}
        onClick={() => setMode("deny")}
        className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-800 hover:bg-rose-50"
      >
        Deny
      </button>
      <button
        disabled={busy}
        onClick={() => setMode("defer")}
        className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50"
      >
        Defer
      </button>
      {error && <p className="w-full text-xs text-rose-700">{error}</p>}
    </div>
  );
}
