"use client";

// "Try one question" conversion hook for SIGNED-OUT exam-page visitors.
//
// 91% of unique visitors browse anonymously and bounce. The exam pages
// pull strong organic SEO traffic but give an anonymous visitor nothing
// to DO except a "Sign in to start" wall. This card lets them answer ONE
// real question instantly — no signup — then reveals correct/wrong + the
// worked solution, and gates "keep going" behind a signup CTA at peak
// engagement (they just felt the product work).
//
// No auth-gated data here: the question + answer + solution are a public
// sample, the whole point is to show the experience.

import { useState } from "react";
import Link from "next/link";

interface Props {
  examCode: string;
  examShortName: string;
  topicName: string;
  question: {
    body: string;
    options: { key: string; text: string }[];
    answerKey: string;
    solution: string;
  };
}

export function TryOneQuestion({ examCode, examShortName, topicName, question }: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const revealed = picked !== null;
  const correct = picked === question.answerKey;

  const loginHref = `/login?callbackUrl=${encodeURIComponent(`/exams/${examCode}`)}`;

  return (
    <div className="mt-6 rounded-xl border-2 border-saffron-300 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
          ✦ Try a {examShortName} question — free, no signup
        </p>
        {topicName && (
          <span className="hidden rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium text-ink-600 sm:inline">
            {topicName}
          </span>
        )}
      </div>

      <p className="mt-3 whitespace-pre-line text-sm font-medium text-ink-900 sm:text-base">
        {question.body}
      </p>

      <ul className="mt-4 space-y-2">
        {question.options.map((opt) => {
          const isAnswer = opt.key === question.answerKey;
          const isPicked = opt.key === picked;
          let cls = "border-ink-200 bg-white hover:border-saffron-400 hover:bg-saffron-50/40";
          if (revealed) {
            if (isAnswer) cls = "border-emerald-400 bg-emerald-50";
            else if (isPicked) cls = "border-rose-300 bg-rose-50";
            else cls = "border-ink-200 bg-white opacity-70";
          }
          return (
            <li key={opt.key}>
              <button
                type="button"
                onClick={() => !revealed && setPicked(opt.key)}
                disabled={revealed}
                className={`flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${cls} ${revealed ? "cursor-default" : "cursor-pointer"}`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${
                    revealed && isAnswer
                      ? "bg-emerald-500 text-white"
                      : revealed && isPicked
                        ? "bg-rose-500 text-white"
                        : "border border-ink-300 text-ink-700"
                  }`}
                >
                  {opt.key}
                </span>
                <span className="text-ink-800">{opt.text}</span>
                {revealed && isAnswer && (
                  <span className="ml-auto shrink-0 text-xs font-medium text-emerald-700">Correct</span>
                )}
                {revealed && isPicked && !isAnswer && (
                  <span className="ml-auto shrink-0 text-xs font-medium text-rose-700">Your pick</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {revealed && (
        <div className="mt-4 space-y-3">
          <div
            className={`rounded-md border p-3 text-sm ${
              correct
                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                : "border-amber-300 bg-amber-50 text-amber-900"
            }`}
          >
            <p className="font-semibold">
              {correct ? "🎯 Correct!" : `Not quite — the answer is ${question.answerKey}.`}
            </p>
            <p className="mt-1.5 whitespace-pre-line text-ink-700">{question.solution}</p>
          </div>

          {/* The gate — at peak engagement. They just felt the product. */}
          <div className="rounded-lg bg-gradient-to-r from-saffron-50 to-amber-50 p-4 text-center">
            <p className="text-sm font-bold text-ink-900">
              That&apos;s 1 question. Want a full {examShortName} mock?
            </p>
            <p className="mt-1 text-xs text-ink-600">
              Sign in free → adaptive mocks, PYQs, and Ask Shishya tracks your
              weak topics. No credit card.
            </p>
            <Link
              href={loginHref}
              className="mt-3 inline-flex items-center justify-center rounded-lg bg-saffron-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600"
            >
              Sign in & keep practising →
            </Link>
            {/* Lower-friction path — they just answered ONE question; 5 more
                with no signup is the natural next step for the hesitant. */}
            <Link
              href={`/exams/${examCode}/quiz`}
              className="mt-2 block text-xs font-semibold text-saffron-700 underline-offset-2 hover:underline"
            >
              or try 5 more questions — no signup needed →
            </Link>
          </div>
        </div>
      )}

      {!revealed && (
        <p className="mt-3 text-[11px] text-ink-500">
          Tap an option to check your answer.
        </p>
      )}
    </div>
  );
}
