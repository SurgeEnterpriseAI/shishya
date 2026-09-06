"use client";

// ExamVerdictPoll — "How was the paper?" one-tap poll (6 Sep 2026, Exam
// Week Mode). Rendered by ExamWeekBlock on exam night, inside a multi-day
// window and on the days after.
//
//   • three chips (Easy / Moderate / Tough) → POST /api/exam-verdict
//   • optional hardest-section chips (the exam's subject names) after a
//     verdict lands — a second POST carrying the same verdict + section
//   • tally line: counts only, shown from n >= 10, else ew.verdict.few;
//     never worded as a prediction
//   • ?verdict=EASY|MODERATE|TOUGH in the URL (the day-after mail links)
//     preselects and auto-submits once, then the param is stripped
//
// Identity is the server's business (session or shishya_anon cookie,
// issued on demand) — this never asks for a login. Labels come from the
// server so /hi and /te render in the page's language. Deliberately NOT
// built on PulseAsk: its one-prompt-per-session mutex would silence the
// poll whenever any other pulse row mounted first.

import { useCallback, useEffect, useRef, useState } from "react";
import type { VerdictTally } from "@/lib/exam-verdict";

const VERDICTS = ["EASY", "MODERATE", "TOUGH"] as const;
type Verdict = (typeof VERDICTS)[number];

export interface ExamVerdictLabels {
  prompt: string;
  easy: string;
  moderate: string;
  tough: string;
  section: string;
  thanks: string;
  /** Template with {n} {easy} {moderate} {tough}. */
  tally: string;
  few: string;
  /** Optional failure line; without it a failed tap just re-enables the chips. */
  err?: string;
}

function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

function isVerdict(x: unknown): x is Verdict {
  return typeof x === "string" && (VERDICTS as readonly string[]).includes(x);
}

export function ExamVerdictPoll({
  examCode,
  examDate,
  labels,
  sections,
  initialTally,
  minN = 10,
}: {
  examCode: string;
  /** IST exam day in focus, "YYYY-MM-DD". */
  examDate: string;
  labels: ExamVerdictLabels;
  /** Hardest-section chip labels (the exam's subject names, max 6). */
  sections: string[];
  initialTally: VerdictTally | null;
  minN?: number;
}) {
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(false);
  const [tally, setTally] = useState<VerdictTally | null>(initialTally);
  const autoFired = useRef(false);

  const submit = useCallback(
    async (v: Verdict, s?: string) => {
      setBusy(true);
      setErr(false);
      try {
        const res = await fetch("/api/exam-verdict", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ examCode, examDate, verdict: v, ...(s !== undefined ? { section: s } : {}) }),
        });
        const j = (await res.json().catch(() => null)) as { ok?: boolean; tally?: VerdictTally } | null;
        if (!res.ok || !j?.ok) throw new Error();
        setVerdict(v);
        if (s !== undefined) setSection(s);
        if (j.tally) setTally(j.tally);
        setDone(true);
        try {
          window.shishyaTrack?.("CTA_CLICKED", { cta: "exam-verdict", examCode, verdict: v, section: s ?? null });
        } catch {
          /* analytics is best-effort */
        }
      } catch {
        // A failed tap leaves the chips enabled and unselected — that is
        // the retry affordance; the optional err label adds words.
        setVerdict(null);
        setErr(true);
      } finally {
        setBusy(false);
      }
    },
    [examCode, examDate],
  );

  // Day-after mail links: /exams/X?verdict=TOUGH → one auto-submit, then
  // the param is stripped so a reload or share never re-votes. The ref
  // guards the once-only even if the effect re-runs.
  useEffect(() => {
    if (autoFired.current) return;
    autoFired.current = true;
    try {
      const url = new URL(window.location.href);
      const v = url.searchParams.get("verdict")?.toUpperCase();
      if (!isVerdict(v)) return;
      url.searchParams.delete("verdict");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
      setVerdict(v);
      void submit(v);
    } catch {
      /* URL API unavailable — the chips still work */
    }
  }, [submit]);

  const chips: { v: Verdict; label: string }[] = [
    { v: "EASY", label: labels.easy },
    { v: "MODERATE", label: labels.moderate },
    { v: "TOUGH", label: labels.tough },
  ];

  const tallyLine =
    tally && tally.n >= minN
      ? fill(labels.tally, {
          n: tally.n,
          easy: Math.round((tally.easy / tally.n) * 100),
          moderate: Math.round((tally.moderate / tally.n) * 100),
          tough: Math.round((tally.tough / tally.n) * 100),
        })
      : labels.few;

  return (
    <div className="mt-2">
      <p className="text-sm font-semibold text-ink-900">{labels.prompt}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2" role="group" aria-label={labels.prompt}>
        {chips.map((c) => {
          const selected = verdict === c.v;
          return (
            <button
              key={c.v}
              type="button"
              disabled={busy}
              aria-pressed={selected}
              onClick={() => void submit(c.v)}
              className={
                selected
                  ? "rounded-full border-2 border-saffron-500 bg-saffron-500 px-3.5 py-1.5 text-sm font-bold text-white shadow-sm disabled:opacity-60"
                  : "rounded-full border-2 border-ink-300 bg-white px-3.5 py-1.5 text-sm font-semibold text-ink-800 transition-colors hover:border-saffron-400 hover:text-saffron-700 disabled:opacity-60"
              }
            >
              {c.label}
            </button>
          );
        })}
      </div>
      {done && verdict && (
        <p className="mt-2 text-xs font-medium text-emerald-700">✓ {labels.thanks}</p>
      )}
      {done && verdict && sections.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-ink-600">{labels.section}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {sections.map((s) => {
              const selected = section === s;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={busy}
                  aria-pressed={selected}
                  onClick={() => void submit(verdict, s)}
                  className={
                    selected
                      ? "rounded-full border border-saffron-500 bg-saffron-100 px-2.5 py-1 text-xs font-semibold text-saffron-900"
                      : "rounded-full border border-ink-300 bg-white px-2.5 py-1 text-xs font-medium text-ink-700 transition-colors hover:border-saffron-400 hover:text-saffron-700 disabled:opacity-50"
                  }
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {err && labels.err && <p className="mt-2 text-xs text-rose-700">{labels.err}</p>}
      <p className="mt-2 text-xs text-ink-600">{tallyLine}</p>
    </div>
  );
}
