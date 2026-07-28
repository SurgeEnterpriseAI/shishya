"use client";

// The 30-second intake — three answers, zero friction:
// which exam, when is it, how much time daily. Exam date prefills from
// our own calendar the moment an exam is picked.

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface ExamOption {
  code: string;
  short: string;
  nextDate: string | null; // YYYY-MM-DD from our calendar, if announced
}

export function CoachIntake({
  options,
  initial,
}: {
  options: ExamOption[];
  initial?: { examCode: string; examDate: string; dailyMinutes: number } | null;
}) {
  const router = useRouter();
  const [examCode, setExamCode] = useState(initial?.examCode ?? options[0]?.code ?? "");
  const [date, setDate] = useState(
    initial?.examDate ?? options[0]?.nextDate ?? "",
  );
  const [minutes, setMinutes] = useState<45 | 90 | 180>(
    (initial?.dailyMinutes as 45 | 90 | 180) ?? 90,
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function pickExam(code: string) {
    setExamCode(code);
    const opt = options.find((o) => o.code === code);
    if (opt?.nextDate) setDate(opt.nextDate);
  }

  async function submit() {
    if (!examCode || !date) {
      setErr("Pick your exam and its date — that's all the coach needs.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ examCode, examDate: date, dailyMinutes: minutes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error ?? "Couldn't save — try again.");
        setBusy(false);
        return;
      }
      router.push("/coach");
      router.refresh();
    } catch {
      setErr("Network hiccup — try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 max-w-xl rounded-xl border-2 border-saffron-200 bg-white p-6">
      <p className="text-sm font-bold text-ink-900">Three answers. Thirty seconds. Then your plan.</p>

      <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-ink-500">
        1 · Which exam are you cracking?
      </label>
      <select
        value={examCode}
        onChange={(e) => pickExam(e.target.value)}
        className="mt-1.5 w-full rounded-lg border border-ink-300 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-saffron-400"
      >
        {options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.short}
          </option>
        ))}
      </select>

      <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-ink-500">
        2 · Exam date {options.find((o) => o.code === examCode)?.nextDate ? "(from the official calendar — confirm or change)" : ""}
      </label>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="mt-1.5 w-full rounded-lg border border-ink-300 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-saffron-400"
      />

      <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-ink-500">
        3 · Honest daily time (the plan adapts to reality, so be real)
      </label>
      <div className="mt-1.5 flex gap-2">
        {([
          [45, "< 1 hour"],
          [90, "1–2 hours"],
          [180, "3+ hours"],
        ] as const).map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => setMinutes(v)}
            className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-semibold ${
              minutes === v
                ? "border-saffron-400 bg-saffron-500 text-white"
                : "border-ink-300 bg-white text-ink-700 hover:border-saffron-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {err && <p className="mt-3 text-sm text-rose-700">{err}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="mt-5 w-full rounded-lg bg-saffron-500 px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600 disabled:cursor-wait disabled:opacity-70"
      >
        {busy ? "Building your plan…" : "Build my day-by-day plan →"}
      </button>
      <p className="mt-2 text-center text-[11px] text-ink-400">
        Free forever. Rebuilt every morning around what you actually did.
      </p>
    </div>
  );
}
