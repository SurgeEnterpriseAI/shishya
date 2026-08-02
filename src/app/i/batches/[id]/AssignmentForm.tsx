"use client";

// Create-assignment form for the educator batch page. Kept inline and
// tiny — title + optional instructions/exam/due date, one POST.

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AssignmentForm({ batchId }: { batchId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [examCode, setExamCode] = useState("");
  const [due, setDue] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (title.trim().length < 3) {
      setErr("Give the assignment a short title.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/i/batches/${batchId}/assignments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          instructions,
          examCode,
          dueAt: due ? new Date(due + "T23:59:00+05:30").toISOString() : "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "failed");
      setTitle(""); setInstructions(""); setExamCode(""); setDue("");
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 rounded-lg bg-saffron-500 px-4 py-2 text-xs font-bold text-white hover:bg-saffron-600"
      >
        + New assignment
      </button>
    );
  }

  const input =
    "w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-saffron-400 focus:outline-none";

  return (
    <form onSubmit={submit} className="mt-3 grid gap-2 rounded-xl border border-saffron-200 bg-saffron-50/40 p-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <input className={input} placeholder="Title * — e.g. Complete 1 full SSC CGL mock" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <textarea className={input} rows={2} placeholder="Instructions (optional) — what exactly, and why" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
      </div>
      <input className={input} placeholder="Exam (optional) — e.g. SSC CGL → tracks who did it" value={examCode} onChange={(e) => setExamCode(e.target.value)} />
      <input className={input} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      {err && <p className="text-xs font-medium text-rose-700 sm:col-span-2">{err}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={busy} className="rounded-lg bg-saffron-500 px-4 py-2 text-xs font-bold text-white hover:bg-saffron-600 disabled:opacity-60">
          {busy ? "Saving…" : "Set assignment →"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-ink-300 bg-white px-4 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-50">
          Cancel
        </button>
      </div>
    </form>
  );
}
