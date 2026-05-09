"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";

export function ComposeForm({
  exams,
  labels,
}: {
  exams: { code: string; shortName: string }[];
  labels: { titlePlaceholder: string; bodyPlaceholder: string; examLabel: string; publish: string };
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [examCode, setExamCode] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (title.trim().length < 8) { setErr("Title must be at least 8 characters."); return; }
    if (body.trim().length < 10) { setErr("Add a bit more detail in the body."); return; }
    setBusy(true);
    setErr(null);
    try {
      const res = await apiPost<{ id: string }>("/api/discussions", {
        title: title.trim(),
        body: body.trim(),
        examCode: examCode || undefined,
      });
      router.push(`/discussions/${res.id}`);
    } catch (e: any) {
      setErr(e.message ?? "Could not publish");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border border-ink-200 bg-white p-6 shadow-sm">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={labels.titlePlaceholder}
        className="w-full rounded-md border border-ink-300 px-3 py-2 text-base font-semibold focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
        maxLength={140}
        autoFocus
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={labels.bodyPlaceholder}
        rows={6}
        className="w-full resize-y rounded-md border border-ink-300 px-3 py-2 text-sm leading-relaxed focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
        maxLength={4000}
      />

      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wider text-ink-500">{labels.examLabel}</span>
        <select
          value={examCode}
          onChange={(e) => setExamCode(e.target.value)}
          className="mt-1 w-full rounded-md border border-ink-300 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">— None —</option>
          {exams.map((e) => (
            <option key={e.code} value={e.code}>{e.shortName}</option>
          ))}
        </select>
      </label>

      {err && <p className="text-xs text-rose-700">{err}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={busy || title.trim().length < 8 || body.trim().length < 10}
          className="btn-primary !py-2 !px-5 text-sm disabled:opacity-50"
        >
          {busy ? "Publishing…" : labels.publish}
        </button>
      </div>
    </form>
  );
}
