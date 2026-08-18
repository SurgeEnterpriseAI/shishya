"use client";

// Small "leave batch" control on the student's educator card — fulfils
// the join page's "you can leave any time from your dashboard" promise
// (audit 18 Aug 2026). Confirms once, then LEFT.

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LeaveBatchLink({ batchId, batchName }: { batchId: string; batchName: string }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-[11px] text-ink-400 underline underline-offset-2 hover:text-ink-600"
      >
        Leave batch
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[11px]">
      <span className="text-ink-500">Leave {batchName}?</span>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await fetch("/api/me/batches/leave", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ batchId }),
          }).catch(() => null);
          router.refresh();
        }}
        className="font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50"
      >
        {busy ? "…" : "Yes"}
      </button>
      <button onClick={() => setConfirming(false)} className="text-ink-400 hover:text-ink-600">
        No
      </button>
    </span>
  );
}
