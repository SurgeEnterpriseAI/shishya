"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BatchCreateForm() {
  const router = useRouter();
  const [courseName, setCourseName] = useState("");
  const [examCode, setExamCode] = useState("");
  const [batchName, setBatchName] = useState("");
  const [mode, setMode] = useState<"ONLINE" | "OFFLINE" | "HYBRID">("ONLINE");
  const [startDate, setStartDate] = useState("");
  const [capacity, setCapacity] = useState("");
  const [feesInr, setFeesInr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = courseName.trim().length >= 3 && batchName.trim().length >= 3;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/i/batches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          courseName: courseName.trim(),
          examCode: examCode.trim() || null,
          batchName: batchName.trim(),
          mode,
          startDate: startDate || null,
          capacity: capacity ? parseInt(capacity, 10) : null,
          feesInr: feesInr ? parseInt(feesInr, 10) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Could not create batch — try again.");
        setSubmitting(false);
        return;
      }
      // Jump straight to the new batch's manage page so the admin
      // can copy the invite link and share with their students.
      router.push(`/i/batches/${data.batchId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Course name" required>
          <input
            type="text"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="SSC CGL Foundation 2026"
            className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
          />
        </Field>
        <Field label="Exam code" hint="Optional. e.g. SSC_CGL, UPSC_PRELIMS">
          <input
            type="text"
            value={examCode}
            onChange={(e) => setExamCode(e.target.value.toUpperCase())}
            placeholder="SSC_CGL"
            className="w-full rounded-md border border-ink-300 px-3 py-2 font-mono text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
          />
        </Field>
      </div>

      <Field label="Batch name" required hint="Pick something students will recognise.">
        <input
          type="text"
          value={batchName}
          onChange={(e) => setBatchName(e.target.value)}
          placeholder="Morning batch — Aug 2026"
          className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Mode">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as typeof mode)}
            className="w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
          >
            <option value="ONLINE">Online</option>
            <option value="OFFLINE">Offline</option>
            <option value="HYBRID">Hybrid</option>
          </select>
        </Field>
        <Field label="Start date">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
          />
        </Field>
        <Field label="Capacity" hint="Optional">
          <input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            min={1}
            max={10000}
            placeholder="100"
            className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
          />
        </Field>
        <Field label="Fees (₹)" hint="Optional">
          <input
            type="number"
            value={feesInr}
            onChange={(e) => setFeesInr(e.target.value)}
            min={0}
            placeholder="25000"
            className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
          />
        </Field>
      </div>

      {error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!valid || submitting}
        className="rounded-md bg-saffron-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-300 disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create batch + get invite link →"}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-ink-700">
        {label}
        {required && <span className="ml-0.5 text-rose-600">*</span>}
      </span>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-0.5 text-[10px] text-ink-500">{hint}</p>}
    </label>
  );
}
