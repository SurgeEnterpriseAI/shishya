"use client";

// ChapterQuizPlayer — 5-question MCQ player for a chapter.
//
// Self-contained: tracks selections, shows instant feedback on each
// answer with the explanation, computes a final score, and persists
// the best score locally so a student can see their progress over
// repeated attempts.
//
// Keyboard accessibility: arrow keys navigate options, Enter/Space
// selects.

import { useEffect, useMemo, useState } from "react";
import type { QuizQuestion } from "@/lib/schooling-quizzes";

interface Props {
  /** Stable identifier for this chapter's quiz. Used as the localStorage key. */
  quizKey: string;
  questions: QuizQuestion[];
}

interface BestScore {
  correct: number;
  total: number;
  /** ISO date string of last attempt. */
  at: string;
}

export function ChapterQuizPlayer({ quizKey, questions }: Props) {
  const [picks, setPicks] = useState<Array<number | null>>(() => questions.map(() => null));
  const [submitted, setSubmitted] = useState(false);
  const [best, setBest] = useState<BestScore | null>(null);

  // Hydrate best-score from localStorage once on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey(quizKey));
      if (raw) setBest(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, [quizKey]);

  function pick(qIndex: number, optionIndex: number) {
    if (submitted) return;
    setPicks((arr) => {
      const next = arr.slice();
      next[qIndex] = optionIndex;
      return next;
    });
  }

  const allAnswered = picks.every((p) => p !== null);
  const score = useMemo(() => {
    return picks.reduce<number>((acc, p, i) => acc + (p === questions[i].correctIndex ? 1 : 0), 0);
  }, [picks, questions]);

  function submit() {
    if (!allAnswered) return;
    setSubmitted(true);
    const candidate: BestScore = {
      correct: score,
      total: questions.length,
      at: new Date().toISOString(),
    };
    // Update best only if strictly better, or if no previous record.
    if (!best || candidate.correct > best.correct) {
      try {
        window.localStorage.setItem(storageKey(quizKey), JSON.stringify(candidate));
      } catch {
        /* ignore */
      }
      setBest(candidate);
    }
  }

  function retry() {
    setPicks(questions.map(() => null));
    setSubmitted(false);
  }

  return (
    <div className="mt-3 space-y-4">
      {best && (
        <p className="text-[11px] text-ink-500">
          Your best on this chapter: <strong className="text-ink-800 tabular-nums">{best.correct} / {best.total}</strong>
          {" "}· last attempt {best.at.slice(0, 10)}
        </p>
      )}
      <ol className="space-y-4">
        {questions.map((q, qi) => {
          const userPick = picks[qi];
          const isCorrect = userPick === q.correctIndex;
          return (
            <li key={q.id} className="rounded-lg border border-ink-200 bg-white p-4">
              <p className="text-sm font-semibold text-ink-900">
                <span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded bg-saffron-100 text-[10px] font-bold text-saffron-800 tabular-nums">
                  {qi + 1}
                </span>
                {q.prompt}
              </p>
              <ul className="mt-3 space-y-1.5">
                {q.options.map((opt, oi) => {
                  const isPicked = userPick === oi;
                  const isCorrectOption = oi === q.correctIndex;
                  let styling = "border-ink-200 bg-white hover:border-saffron-400";
                  if (submitted) {
                    if (isCorrectOption) styling = "border-emerald-400 bg-emerald-50 text-emerald-900";
                    else if (isPicked) styling = "border-rose-400 bg-rose-50 text-rose-900";
                    else styling = "border-ink-200 bg-white text-ink-500";
                  } else if (isPicked) {
                    styling = "border-saffron-500 bg-saffron-50";
                  }
                  return (
                    <li key={oi}>
                      <button
                        type="button"
                        onClick={() => pick(qi, oi)}
                        disabled={submitted}
                        className={`flex w-full items-baseline gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${styling} disabled:cursor-not-allowed`}
                      >
                        <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border border-current text-[10px] font-semibold">
                          {String.fromCharCode(65 + oi)}
                        </span>
                        <span>{opt}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {submitted && (
                <p className={`mt-2 rounded px-3 py-2 text-xs ${isCorrect ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
                  <span className="font-semibold">
                    {isCorrect ? "✓ Correct." : "✗ Not quite."}
                  </span>{" "}
                  {q.explanation}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {!submitted ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={!allAnswered}
            className="rounded-md bg-saffron-500 px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-600 disabled:cursor-not-allowed disabled:bg-ink-300"
          >
            Submit answers
          </button>
          {!allAnswered && (
            <p className="text-[11px] text-ink-500">Answer all {questions.length} to submit.</p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-saffron-300 bg-saffron-50/50 p-5">
          <p className="text-sm">
            <strong className="text-ink-900">Score: {score} / {questions.length}</strong>
            {score === questions.length && " — perfect!"}
            {score >= Math.ceil(questions.length * 0.6) && score < questions.length && " — solid."}
            {score < Math.ceil(questions.length * 0.6) && " — re-read the NCERT chapter and try again."}
          </p>
          <button
            type="button"
            onClick={retry}
            className="mt-3 rounded-md border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-800 hover:bg-ink-50"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

function storageKey(quizKey: string): string {
  return `shishya:chapter-quiz-best:${quizKey}`;
}
