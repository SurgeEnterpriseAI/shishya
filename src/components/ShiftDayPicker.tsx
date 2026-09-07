"use client";

// ShiftDayPicker — "Which day is your shift?" (Exam Week Mode wave 2,
// 6 Sep 2026). Rendered by ExamWeekBlock for a SIGNED-IN, ENROLLED student
// while a multi-day CBT window is upcoming or running. One chip per
// announced window day (label already carries the tier word); a tap POSTs
// /api/enrollment/shift and refreshes the server tree so the block and the
// poll re-key on that day. Anonymous visitors never see this — the server
// simply does not mount it.

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface ShiftDayLabels {
  prompt: string;
  /** Group name for assistive tech ("Save my shift day"). */
  save: string;
  /** Template with {date}. */
  saved: string;
  change: string;
  err: string;
}

export interface ShiftDayOption {
  /** IST "YYYY-MM-DD". */
  iso: string;
  /** e.g. "13 Sep (official)". */
  label: string;
}

function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function ShiftDayPicker({
  examCode,
  days,
  initial,
  labels,
}: {
  examCode: string;
  days: ShiftDayOption[];
  /** The stored Enrollment.shiftDate, when it is one of `days`. */
  initial: string | null;
  labels: ShiftDayLabels;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState<string | null>(initial);
  const [editing, setEditing] = useState(!initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  async function pick(iso: string) {
    setBusy(iso);
    setErr(false);
    try {
      const res = await fetch("/api/enrollment/shift", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ examCode, shiftDate: iso }),
      });
      const j = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (!res.ok || !j?.ok) throw new Error();
      setSaved(iso);
      setEditing(false);
      try {
        window.shishyaTrack?.("CTA_CLICKED", { cta: "exam-shift", examCode, shiftDate: iso });
      } catch {
        /* analytics is best-effort */
      }
      // The block's phase / poll are server-decided from the stored day.
      router.refresh();
    } catch {
      setErr(true);
    } finally {
      setBusy(null);
    }
  }

  if (saved && !editing) {
    const label = days.find((d) => d.iso === saved)?.label ?? saved;
    return (
      <p className="mt-2 text-xs text-ink-700">
        ✓ {fill(labels.saved, { date: label })}{" "}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="font-semibold text-saffron-700 underline-offset-2 hover:underline"
        >
          {labels.change}
        </button>
      </p>
    );
  }

  return (
    <div className="mt-2">
      <p className="text-xs font-semibold text-ink-800">{labels.prompt}</p>
      <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-label={labels.save}>
        {days.map((d) => {
          const selected = saved === d.iso;
          return (
            <button
              key={d.iso}
              type="button"
              disabled={!!busy}
              aria-pressed={selected}
              onClick={() => void pick(d.iso)}
              className={
                selected
                  ? "rounded-full border border-saffron-500 bg-saffron-100 px-2.5 py-1 text-xs font-semibold text-saffron-900 disabled:opacity-60"
                  : "rounded-full border border-ink-300 bg-white px-2.5 py-1 text-xs font-medium text-ink-700 transition-colors hover:border-saffron-400 hover:text-saffron-700 disabled:opacity-60"
              }
            >
              {busy === d.iso ? "…" : d.label}
            </button>
          );
        })}
      </div>
      {err && <p className="mt-1 text-xs text-rose-700">{labels.err}</p>}
    </div>
  );
}
