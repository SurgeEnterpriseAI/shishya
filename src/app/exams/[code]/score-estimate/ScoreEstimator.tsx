"use client";

// Score estimator inputs (6 Sep 2026, Exam Week Mode wave 2). Three
// numbers — attempted, correct, wrong — and the exam's marking scheme
// from the server page:
//
//   score = correct × marksPerQ − wrong × negativeMark
//
// Recomputed on every keystroke; correct + wrong may not exceed attempted
// (ew.score.invalid). The calculator itself keeps nothing.
//
// 14 Sep 2026 — answer-key day is also the most forwarded moment of an
// exam, so under a valid score:
//   • share: WhatsApp / copy / the phone's share sheet, a message with the
//     estimate and a link to this calculator (share utm, surface
//     'score-estimate');
//   • "where do I stand?", only while a sitting is open for comparison
//     (src/lib/score-sitting.ts): the candidate may CHOOSE to add the
//     counts anonymously — the server recomputes the score, keeps one entry
//     per browser, and answers with the count or, from 30 entries, how many
//     scored higher and lower (src/lib/score-standing.ts). Nothing is sent
//     unless that button is tapped.

import { useEffect, useState } from "react";
import { challengePlayerKey } from "@/lib/challenge-local";
import { STANDING_MIN_ENTRIES, type StandingView } from "@/lib/score-standing";
import { shareUrl, type ShareChannel } from "@/lib/share-url";

export interface ScoreEstimatorLabels {
  attempted: string;
  correct: string;
  wrong: string;
  /** "Estimated score: {score} / {marks}" */
  result: string;
  /** "That is {pct}% of the paper." */
  pct: string;
  invalid: string;
  /** "Share my estimate" */
  shareButton: string;
  /** "My estimated {exam} score from the answer key: {score}/{marks}. … {url}" */
  shareText: string;
  whatsapp: string;
  copy: string;
  copied: string;
  more: string;
  standTitle: string;
  /** {exam} {sitting} */
  standBody: string;
  standFine: string;
  standAdd: string;
  standAdding: string;
  standAdded: string;
  /** {n} {min} */
  standCount: string;
  /** {n} {higher} {score} {lower} */
  standPosition: string;
  standCaveat: string;
  standError: string;
}

function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/** 2 → "2", 0.5 → "0.5", 0.25 → "0.25", 1.33 → "1.33". */
function fmt(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/0$/, "");
}

// First-party analytics beacon (same shape as ShareScoreButton).
function beacon(props: Record<string, unknown>) {
  try {
    navigator.sendBeacon?.(
      "/api/analytics",
      new Blob([JSON.stringify({ kind: "CTA_CLICKED", path: typeof location !== "undefined" ? location.pathname : "/", props })], {
        type: "application/json",
      }),
    );
  } catch {
    /* analytics is best-effort */
  }
}

export function ScoreEstimator({
  marksPerQ,
  negativeMark,
  totalQuestions,
  totalMarks,
  labels,
  examCode,
  examShort,
  sharePath,
  standing,
}: {
  marksPerQ: number;
  negativeMark: number;
  totalQuestions: number;
  totalMarks: number;
  labels: ScoreEstimatorLabels;
  examCode: string;
  examShort: string;
  /** This calculator's path in the page's language, for the share link. */
  sharePath: string;
  /** Present only while a sitting is open for comparison. */
  standing: { sitting: string } | null;
}) {
  const [attempted, setAttempted] = useState("");
  const [correct, setCorrect] = useState("");
  const [wrong, setWrong] = useState("");
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState(false);
  const [added, setAdded] = useState<{ score: number; view: StandingView } | null>(null);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);
  // A changed answer sheet is a different entry: offer "add" again (it replaces the old one).
  useEffect(() => {
    setAdded(null);
    setAddErr(false);
  }, [attempted, correct, wrong]);

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

  const textFor = (channel: ShareChannel) =>
    score == null
      ? ""
      : fill(labels.shareText, {
          exam: examShort,
          score: fmt(score),
          marks: fmt(totalMarks),
          url: shareUrl(sharePath, { surface: "score-estimate", channel, exam: examCode }),
        });
  const track = (via: ShareChannel) => beacon({ cta: "share", surface: "score-estimate", via, exam: examCode });

  async function copy() {
    try {
      await navigator.clipboard.writeText(textFor("copy"));
      setCopied(true);
      track("copy");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* old browsers without the clipboard API */
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ text: textFor("native") });
      track("native");
    } catch {
      /* cancelled */
    }
  }

  async function addMine() {
    if (!ready || a == null || c == null || w == null) return;
    setAdding(true);
    setAddErr(false);
    try {
      const res = await fetch("/api/score-estimate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ examCode, attempted: a, correct: c, wrong: w, key: challengePlayerKey() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || typeof j?.score !== "number" || !j?.view) {
        setAddErr(true);
        return;
      }
      setAdded({ score: j.score, view: j.view as StandingView });
      beacon({ cta: "score-standing-add", exam: examCode });
    } catch {
      setAddErr(true);
    } finally {
      setAdding(false);
    }
  }

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

  const btn =
    "inline-flex items-center justify-center rounded-lg border border-ink-300 bg-white px-3 py-2 text-xs font-semibold text-ink-800 transition-colors hover:bg-ink-50";

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
        <>
          <div className="mt-4 rounded-lg bg-saffron-50 px-4 py-3" aria-live="polite">
            <p className="text-lg font-bold text-ink-900">{fill(labels.result, { score: fmt(score), marks: fmt(totalMarks) })}</p>
            {pct != null && <p className="mt-0.5 text-sm text-ink-700">{fill(labels.pct, { pct: fmt(pct) })}</p>}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-ink-600">{labels.shareButton}:</span>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(textFor("whatsapp"))}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("whatsapp")}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600"
            >
              {labels.whatsapp}
            </a>
            <button type="button" onClick={copy} className={btn}>
              {copied ? labels.copied : labels.copy}
            </button>
            {canShare && (
              <button type="button" onClick={nativeShare} className={btn}>
                {labels.more}
              </button>
            )}
          </div>

          {standing && (
            <div className="mt-4 rounded-lg border border-ink-200 bg-white p-4">
              <p className="text-sm font-semibold text-ink-900">{labels.standTitle}</p>
              {added ? (
                <>
                  <p className="mt-1 text-xs font-semibold text-emerald-700">{labels.standAdded}</p>
                  {added.view.kind === "position" && (
                    <p className="mt-1 text-sm text-ink-800">
                      {fill(labels.standPosition, {
                        n: added.view.n,
                        higher: added.view.higher,
                        lower: added.view.lower,
                        score: fmt(added.score),
                      })}
                    </p>
                  )}
                  {added.view.kind === "count" && (
                    <p className="mt-1 text-sm text-ink-800">{fill(labels.standCount, { n: added.view.n, min: STANDING_MIN_ENTRIES })}</p>
                  )}
                  <p className="mt-1 text-[11px] text-ink-500">{labels.standCaveat}</p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-xs text-ink-600">{fill(labels.standBody, { exam: examShort, sitting: standing.sitting })}</p>
                  <button
                    type="button"
                    onClick={addMine}
                    disabled={adding}
                    className="mt-2 inline-flex items-center justify-center rounded-lg bg-saffron-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600 disabled:opacity-60"
                  >
                    {adding ? labels.standAdding : labels.standAdd}
                  </button>
                  <p className="mt-2 text-[11px] text-ink-500">{labels.standFine}</p>
                  {addErr && <p className="mt-1 text-xs text-rose-700">{labels.standError}</p>}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
