"use client";

// Score estimator inputs (6 Sep 2026, Exam Week Mode wave 2). Three
// numbers — attempted, correct, wrong — and the exam's marking scheme
// from the server page:
//
//   score = correct × marksPerQ − wrong × negativeMark
//
// Recomputed on every keystroke; correct + wrong may not exceed attempted
// (ew.score.invalid). Nothing leaves the browser: no storage, no API, no
// analytics — the answer key is the student's business.

import { useState } from "react";

export interface ScoreEstimatorLabels {
  attempted: string;
  correct: string;
  wrong: string;
  /** "Estimated score: {score} / {marks}" */
  result: string;
  /** "That is {pct}% of the paper." */
  pct: string;
  invalid: string;
}

function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/** 2 → "2", 0.5 → "0.5", 0.25 → "0.25", 1.33 → "1.33". */
function fmt(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/0$/, "");
}

export function ScoreEstimator({
  marksPerQ,
  negativeMark,
  totalQuestions,
  totalMarks,
  labels,
}: {
  marksPerQ: number;
  negativeMark: number;
  totalQuestions: number;
  totalMarks: number;
  labels: ScoreEstimatorLabels;
}) {
  const [attempted, setAttempted] = useState("");
  const [correct, setCorrect] = useState("");
  const [wrong, setWrong] = useState("");

  // Whole numbers in [0, totalQuestions]; blank / junk → null.
  const parse = (v: string): number | null => {
    if (v.trim() === "") return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.min(Math.floor(n), totalQuestions);
  };
  const a = parse(attempted);
  const c = parse(correct);
  const w = parse(wrong);
  const invalid = a != null && (c ?? 0) + (w ?? 0) > a;
  const ready = a != null && c != null && w != null && !invalid;
  const score = ready ? Math.round((c * marksPerQ - w * negativeMark) * 100) / 100 : null;
  const pct = score != null && totalMarks > 0 ? Math.round((score / totalMarks) * 1000) / 10 : null;

  const field = (id: string, label: string, value: string, set: (v: string) => void) => (
    <label htmlFor={id} className="block text-sm">
      <span className="font-medium text-ink-800">{label}</span>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        max={totalQuestions}
        step={1}
        value={value}
        onChange={(e) => set(e.target.value)}
        className="mt-1 w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-base tabular-nums text-ink-900 focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
      />
    </label>
  );

  return (
    <div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {field("se-attempted", labels.attempted, attempted, setAttempted)}
        {field("se-correct", labels.correct, correct, setCorrect)}
        {field("se-wrong", labels.wrong, wrong, setWrong)}
      </div>
      {invalid && (
        <p role="alert" className="mt-2 text-sm font-medium text-rose-700">
          {labels.invalid}
        </p>
      )}
      {score != null && (
        <div className="mt-4 rounded-lg bg-saffron-50 px-4 py-3" aria-live="polite">
          <p className="text-lg font-bold text-ink-900">{fill(labels.result, { score: fmt(score), marks: fmt(totalMarks) })}</p>
          {pct != null && <p className="mt-0.5 text-sm text-ink-700">{fill(labels.pct, { pct: fmt(pct) })}</p>}
        </div>
      )}
    </div>
  );
}
