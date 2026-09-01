"use client";

// Per-cluster "mark shipped & notify" island on /admin/demand.
// Founder fills title/note/url → POST /api/admin/demand/ship → every
// signed-in voice behind the cluster gets the you-asked-it's-live
// email. Dry-run first shows the reach without sending.

import { useState } from "react";

export function ShipForm({ clusterKey, label }: { clusterKey: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(label);
  const [note, setNote] = useState("");
  const [url, setUrl] = useState("/exams/{exam}");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<string | null>(null);

  const fire = async (dry: boolean) => {
    setBusy(true);
    setOut(null);
    try {
      const res = await fetch("/api/admin/demand/ship", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clusterKey, title, note, urlTemplate: url, dry }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error ?? `HTTP ${res.status}`);
      setOut(
        dry
          ? `Dry run: ${d.voices} voices reachable, ${d.sent} would get mail (${d.skippedDupe} already told).`
          : `Sent ${d.sent} · already told ${d.skippedDupe} · failed ${d.failed}. Cluster marked shipped.`,
      );
    } catch (e) {
      setOut(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-1 text-xs font-medium text-saffron-700 hover:underline">
        📣 Mark shipped &amp; notify askers
      </button>
    );
  }
  return (
    <div className="mt-2 space-y-1.5 rounded-md border border-saffron-200 bg-saffron-50/50 p-2">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What shipped (email headline)"
        className="w-full rounded border border-ink-300 bg-white px-2 py-1 text-xs" />
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="1-2 plain sentences on what it does"
        className="w-full rounded border border-ink-300 bg-white px-2 py-1 text-xs" />
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL — {exam} becomes their exam code"
        className="w-full rounded border border-ink-300 bg-white px-2 py-1 text-xs" />
      <div className="flex gap-2">
        <button type="button" disabled={busy || note.length < 3} onClick={() => fire(true)}
          className="rounded border border-ink-300 bg-white px-2 py-1 text-xs font-medium disabled:opacity-50">Dry run</button>
        <button type="button" disabled={busy || note.length < 3} onClick={() => fire(false)}
          className="rounded bg-saffron-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50">Send for real</button>
        <button type="button" onClick={() => setOpen(false)} className="px-1 text-xs text-ink-500">close</button>
      </div>
      {out && <p className="text-xs text-ink-700">{out}</p>}
    </div>
  );
}
