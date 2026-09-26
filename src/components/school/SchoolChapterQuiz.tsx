"use client";

// School chapter practice (26 Sep 2026) — the 5-question guest quiz on a
// /schooling chapter page.
//
// Same data shape and the same question card as the exam guest quiz
// (src/components/AnonQuizPlayer.tsx, fed by getSchoolGuestQuiz in
// src/lib/anon-quiz.ts), but NOT that component: its result screen leads to
// the AI tutor (/chat), a sign-in CTA, "challenge a friend" and a teacher
// request. None of those may appear on a school page (Anthropic minors
// policy; the parent-consent and safety layer is not built), so this
// player's result is the score, the recap and "try again" — nothing else.
// No account, no localStorage, no result saved to any account or profile.
// The one server call is an anonymous QUIZ_ATTEMPTED analytics beacon at
// the finish (chapter and score, under the rotating shishya_anon cookie —
// the same endpoint every page view sends to) so the founder can see
// whether practice is used; the page copy says exactly that (26 Sep 2026
// fixer: it used to say "nothing is saved", which this beacon made untrue).

import { useState } from "react";
import type { AnonQuiz } from "@/lib/anon-quiz";
import { fillTemplate } from "@/lib/i18n";
import { quizDifficultyLabel, type QuizLabels } from "@/lib/challenge-copy";

export interface SchoolQuizCopy {
  /** "Practice: {n} questions on {scope}" */
  heading: string;
  intro: string;
  start: string;
  tryAgain: string;
  backToNotes: string;
  /** "{score} of {n} right" */
  result: string;
  /** Shown under every set: written by Shishya's AI, answer-checked, not from the book. */
  honesty: string;
}

// 26 Sep 2026 (integrator): `backToNotes` — the result screen's second
// button jumps to the page's #notes anchor, which exists only when the
// chapter has Shishya's notes; a practice-only chapter (>= 5 checked
// questions, no notes) hides it rather than offer a dead link.
export function SchoolChapterQuiz({ quiz, labels, copy, backToNotes = true }: { quiz: AnonQuiz; labels: QuizLabels; copy: SchoolQuizCopy; backToNotes?: boolean }) {
  const QL = labels;
  const qs = quiz.questions;
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [answers, setAnswers] = useState<{ key: string; correct: boolean }[]>([]);
  const [done, setDone] = useState(false);

  const n = qs.length;
  const vars = { n, scope: quiz.scopeLabel };

  function reset() {
    setIdx(0);
    setPicked(null);
    setAnswers([]);
    setDone(false);
  }

  function next() {
    const q = qs[idx];
    const correct = picked === q.answerKey;
    const nextAnswers = [...answers, { key: picked as string, correct }];
    setAnswers(nextAnswers);
    if (idx + 1 >= n) {
      setDone(true);
      try {
        navigator.sendBeacon?.(
          "/api/analytics",
          new Blob(
            [
              JSON.stringify({
                kind: "QUIZ_ATTEMPTED",
                path: typeof location !== "undefined" ? location.pathname : undefined,
                props: { anon: true, school: true, exam: quiz.examCode, topic: quiz.topicCode, score: nextAnswers.filter((a) => a.correct).length, total: n },
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

  if (!open) {
    return (
      <section aria-labelledby="school-quiz-heading" className="rounded-xl border border-saffron-200 bg-saffron-50/50 p-5">
        <h2 id="school-quiz-heading" className="text-base font-semibold text-ink-900">
          {fillTemplate(copy.heading, vars)}
        </h2>
        <p className="mt-1 text-sm text-ink-700">{copy.intro}</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 inline-flex items-center justify-center rounded-lg bg-saffron-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-300"
        >
          {fillTemplate(copy.start, vars)}
        </button>
        <p className="mt-3 text-[11px] text-ink-500">{copy.honesty}</p>
      </section>
    );
  }

  if (done) {
    const score = answers.filter((a) => a.correct).length;
    const good = score / n >= 0.6;
    return (
      <section aria-labelledby="school-quiz-heading" className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
        <p id="school-quiz-heading" className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
          {QL["quiz.yourScore"]}
        </p>
        <p className="mt-1 text-4xl font-extrabold text-ink-900">
          {score}
          <span className="text-2xl text-ink-400">/{n}</span>
        </p>
        <p className="mt-1 text-sm text-ink-600">{fillTemplate(copy.result, { score, n })}</p>
        <p className="mt-1 text-sm text-ink-600">{fillTemplate(QL[good ? "quiz.strong" : "quiz.needsWork"], vars)}</p>
        <ul className="mt-5 space-y-1.5">
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
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex flex-1 items-center justify-center rounded-lg bg-saffron-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-300"
          >
            {copy.tryAgain}
          </button>
          {backToNotes && (
            <a
              href="#notes"
              className="inline-flex flex-1 items-center justify-center rounded-lg border border-ink-300 bg-white px-5 py-3 text-sm font-semibold text-ink-800 transition-colors hover:bg-ink-50"
            >
              {copy.backToNotes}
            </a>
          )}
        </div>
        <p className="mt-3 text-[11px] text-ink-500">{copy.honesty}</p>
      </section>
    );
  }

  const q = qs[idx];
  const answered = picked !== null;
  return (
    <section aria-labelledby="school-quiz-heading" className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <p id="school-quiz-heading" className="text-xs font-semibold uppercase tracking-wider text-ink-500">
          {fillTemplate(QL["quiz.questionOf"], { i: idx + 1, n })}
        </p>
        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-600">{quizDifficultyLabel(QL, q.difficulty)}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
        <div className="h-full rounded-full bg-saffron-400 transition-all" style={{ width: `${((idx + (answered ? 1 : 0)) / n) * 100}%` }} />
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
              onClick={() => !answered && setPicked(o.key)}
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
          <p className="font-semibold text-ink-900">{picked === q.answerKey ? QL["quiz.correct"] : fillTemplate(QL["quiz.answer"], { key: q.answerKey })}</p>
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
          {idx + 1 >= n ? QL["quiz.seeScore"] : QL["quiz.next"]}
        </button>
      </div>
    </section>
  );
}
