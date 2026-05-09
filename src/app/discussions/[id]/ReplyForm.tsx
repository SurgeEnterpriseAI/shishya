"use client";

// Inline reply form on /discussions/[id]. Posts to the messages API and
// triggers router.refresh() so the new message lands without a full reload.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";

export function ReplyForm({
  threadId,
  labels,
}: {
  threadId: string;
  labels: { placeholder: string; send: string };
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await apiPost(`/api/discussions/${threadId}/messages`, { content });
      setContent("");
      router.refresh();
    } catch (e: any) {
      setErr(e.message ?? "Could not post reply");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-ink-200 bg-white p-4 shadow-sm">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={labels.placeholder}
        rows={3}
        disabled={busy}
        className="w-full resize-y rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200 disabled:bg-ink-50"
        maxLength={4000}
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs text-ink-500">{content.length} / 4000</p>
        <button
          type="submit"
          disabled={!content.trim() || busy}
          className="btn-primary !py-2 !px-4 text-sm disabled:opacity-50"
        >
          {busy ? "…" : labels.send}
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-rose-700">{err}</p>}
    </form>
  );
}
