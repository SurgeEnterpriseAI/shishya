"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function JoinBatchButton({ inviteCode }: { inviteCode: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/join/${inviteCode}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Could not join — try again.");
        setSubmitting(false);
        return;
      }
      router.push("/dashboard?joined=1");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={join}
        disabled={submitting}
        className="rounded-md bg-saffron-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-300 disabled:opacity-50"
      >
        {submitting ? "Joining…" : "Join this batch →"}
      </button>
      {error && (
        <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      )}
    </>
  );
}
