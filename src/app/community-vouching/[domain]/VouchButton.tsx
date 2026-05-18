"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function VouchButton({ credentialId }: { credentialId: string }) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [mode, setMode] = useState<"button" | "form" | "done">("button");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoted, setPromoted] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/credentials/${credentialId}/vouch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ comment: comment || undefined }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || j.message || `HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      setPromoted(Boolean(data.promotedToVerified));
      setMode("done");
      // Refresh to reflect the new vouch count + potential promotion.
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setBusy(false);
    }
  }

  if (mode === "done") {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50/50 p-3 text-xs text-emerald-800">
        Vouch recorded.
        {promoted && <> This was the 3rd vouch — the credential is now <strong>VERIFIED</strong>.</>}
      </div>
    );
  }

  if (mode === "form") {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-ink-900">Optional comment</p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="How do you know this person holds this credential? Not displayed publicly."
          className="w-full rounded-md border border-ink-300 bg-white p-2 text-xs text-ink-900"
        />
        <div className="flex gap-2">
          <button
            disabled={busy}
            onClick={submit}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            Vouch
          </button>
          <button
            onClick={() => setMode("button")}
            className="rounded-md border border-ink-300 px-3 py-1.5 text-xs text-ink-700 hover:bg-ink-50"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-rose-700">{error}</p>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setMode("form")}
      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
    >
      Vouch for this credential
    </button>
  );
}
