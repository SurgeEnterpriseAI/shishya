"use client";

// Growth lever #2 — the anonymous "taste" quiz UI.
//
// Plays a short MCQ set with instant client-side grading and solution
// reveal (no login, no persistence), then converts on the results screen:
// sign in to save + take full mocks, or discuss the ones you missed with
// the free AI tutor. Deliberately frictionless — the whole point is that a
// signed-out visitor experiences the product before hitting any gate.

import { useState } from "react";
import Link from "next/link";
import type { AnonQuiz } from "@/lib/anon-quiz";

export function AnonQuizPlayer({ quiz }: { quiz: AnonQuiz }) {
  const qs = quiz.questions;
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [answers, setAnswers] = useState<{ key: string; correct: boolean }[]>([]);
  const [done, setDone] = useState(false);

  const q = qs[idx];
  const answered = picked !== null;

  function choose(key: string) {
    if (answered) return;
    setPicked(key);
  }
  function next() {
    const correct = picked === q.answerKey;
    const nextAnswers = [...answers, { key: picked as string, correct }];
    setAnswers(nextAnswers);
    if (idx + 1 >= qs.length) {
      setDone(true);
      // Fire-and-forget completion signal so the funnel report sees it.
      try {
        navigator.sendBeacon?.(
          "/api/analytics",
          new Blob(
            [
              JSON.stringify({
                kind: "QUIZ_ATTEMPTED",
                path: typeof location !== "undefined" ? location.pathname : undefined,
                props: {
                  anon: true,
                  exam: quiz.examCode,
                  topic: quiz.topicCode,
                  score: nextAnswers.filter((a) => a.correct).length,
                  total: qs.length,
                },
              }),
            ],
            { type: "application/json" },
          ),
        );
      } catch {
        /* analytics is best-effort */
      }
    } else {
      setIdx(idx + 1);
      setPicked(null);
    }
  }

  if (done) {
    const score = answers.filter((a) => a.correct).length;
    const pct = Math.round((score / qs.length) * 100);
    const loginHref = `/login?callbackUrl=${encodeURIComponent(`/exams/${quiz.examCode}`)}`;
    const tutorSeed = `I just took a quick ${quiz.scopeLabel} quiz for ${quiz.examShort} and scored ${score}/${qs.length}. Explain the ones I likely got wrong and how to improve.`;
    const tutorHref = `/chat?examCode=${quiz.examCode}&seed=${encodeURIComponent(tutorSeed)}`;
    const good = pct >= 60;
    return (
      <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">Your score</p>
        <p className="mt-1 text-4xl font-extrabold text-ink-900">
          {score}<span className="text-2xl text-ink-400">/{qs.length}</span>
        </p>
        <p className="mt-1 text-sm text-ink-600">
          {good
            ? `Strong start on ${quiz.scopeLabel} — now go deeper.`
            : `${quiz.scopeLabel} needs some work — that's exactly what Shishya's built for.`}
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link
            href={loginHref}
            className="inline-flex flex-1 items-center justify-center rounded-lg bg-saffron-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-300"
          >
            Sign in free — take the full mock &amp; track your weak topics →
          </Link>
          <Link
            href={tutorHref}
            className="inline-flex flex-1 items-center justify-center rounded-lg border border-ink-300 bg-white px-5 py-3 text-sm font-semibold text-ink-800 transition-colors hover:bg-ink-50"
          >
            Ask Shishya to explain these
          </Link>
        </div>

        {/* Per-question recap */}
        <ul className="mt-6 space-y-1.5">
          {answers.map((a, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                  a.correct ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                }`}
              >
                {a.correct ? "✓" : "✕"}
              </span>
              <span className="text-ink-600">Q{i + 1}</span>
              <span className="line-clamp-1 text-ink-800">{qs[i].body}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
          Question {idx + 1} of {qs.length}
        </p>
        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-600">
          {q.difficulty}
        </span>
      </div>
      {/* progress bar */}
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
        <div
          className="h-full rounded-full bg-saffron-400 transition-all"
          style={{ width: `${((idx + (answered ? 1 : 0)) / qs.length) * 100}%` }}
        />
      </div>

      <p className="mt-4 text-base font-medium leading-relaxed text-ink-900">{q.body}</p>

      <div className="mt-4 flex flex-col gap-2">
        {q.options.map((o) => {
          const isPicked = picked === o.key;
          const isAnswer = o.key === q.answerKey;
          let cls = "border-ink-200 bg-white hover:border-saffron-400";
          if (answered) {
            if (isAnswer) cls = "border-emerald-400 bg-emerald-50";
            else if (isPicked) cls = "border-rose-400 bg-rose-50";
            else cls = "border-ink-200 bg-white opacity-70";
          }
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => choose(o.key)}
              disabled={answered}
              className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-saffron-300 ${cls}`}
            >
              <span className="mt-0.5 font-semibold text-ink-500">{o.key}</span>
              <span className="text-ink-800">{o.text}</span>
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-4 rounded-lg bg-ink-50 p-3 text-sm text-ink-700">
          <p className="font-semibold text-ink-900">
            {picked === q.answerKey ? "Correct ✓" : `Answer: ${q.answerKey}`}
          </p>
          {q.solution && <p className="mt-1 leading-relaxed">{q.solution}</p>}
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={next}
          disabled={!answered}
          className="inline-flex items-center justify-center rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-ink-800 focus:outline-none focus:ring-2 focus:ring-ink-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {idx + 1 >= qs.length ? "See my score →" : "Next question →"}
        </button>
      </div>
    </div>
  );
}
