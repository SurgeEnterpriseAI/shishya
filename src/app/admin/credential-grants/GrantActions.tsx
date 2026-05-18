"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  credentialId: string;
  userId: string;
  email: string;
}

export function GrantActions({ credentialId, userId, email }: Props) {
  void userId;
  const router = useRouter();
  const [mode, setMode] = useState<"primary" | "reject">("primary");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { kind: string }>(null);

  async function call(action: "grant" | "reject", body?: object) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/credentials/${credentialId}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || j.message || `HTTP ${res.status}`);
        return;
      }
      setDone({ kind: action });
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const colour = done.kind === "grant" ? "emerald" : "rose";
    return (
      <div className={`mt-3 rounded-md border bg-${colour}-50 border-${colour}-200 px-3 py-2 text-xs text-${colour}-800`}>
        {done.kind === "grant" ? "Granted." : "Rejected."} {email} notified.
      </div>
    );
  }

  if (mode === "reject") {
    return (
      <div className="mt-3 space-y-2">
        <p className="text-xs font-medium text-ink-900">Reason for rejection:</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Why is this claim being rejected? Notes are visible to the claimant."
          className="w-full rounded-md border border-ink-300 bg-white p-2 text-xs text-ink-900"
        />
        <div className="flex gap-2">
          <button
            disabled={busy || reason.trim().length < 10}
            onClick={() => call("reject", { reason })}
            className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            Submit rejection
          </button>
          <button
            onClick={() => setMode("primary")}
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
        onClick={() => call("grant")}
        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        Grant + promote to Domain Expert
      </button>
      <button
        disabled={busy}
        onClick={() => setMode("reject")}
        className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-800 hover:bg-rose-50"
      >
        Reject
      </button>
      {error && <p className="w-full text-xs text-rose-700">{error}</p>}
    </div>
  );
}
