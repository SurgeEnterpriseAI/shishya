"use client";

// Inline "try one" question at the END of the study notes — the
// notes→quiz bridge. Funnel data (Jul 12): readers who REACH a quiz
// complete it 93% of the time, but only ~8% of note readers ever reach
// one. This puts the first question directly in the reading flow: finish
// the notes → answer one MCQ → instant grade + solution → one-tap into
// the full 5-question quiz (no signup needed — the quiz route is public).

import { useState } from "react";
import Link from "next/link";

interface Props {
  examCode: string;
  topicCode: string;
  topicName: string;
  question: {
    body: string;
    options: { key: string; text: string }[];
    answerKey: string;
    solution: string;
  };
}

export function InlineTopicQuestion({ examCode, topicCode, topicName, question }: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const revealed = picked !== null;
  const correct = picked === question.answerKey;

  return (
    <section className="mt-8 rounded-xl border-2 border-saffron-200 bg-saffron-50/40 p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
        You read the notes — now try one
      </p>
      <p className="mt-2 text-sm font-medium leading-relaxed text-ink-900">{question.body}</p>

      <ul className="mt-3 space-y-2">
        {question.options.map((o) => {
          const isPicked = picked === o.key;
          const isAnswer = o.key === question.answerKey;
          let cls = "border-ink-200 bg-white hover:border-saffron-400 cursor-pointer";
          if (revealed) {
            if (isAnswer) cls = "border-emerald-400 bg-emerald-50";
            else if (isPicked) cls = "border-rose-400 bg-rose-50";
            else cls = "border-ink-200 bg-white opacity-70";
          }
          return (
            <li key={o.key}>
              <button
                type="button"
                onClick={() => !revealed && setPicked(o.key)}
                disabled={revealed}
                className={`flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${cls}`}
              >
                <span className="font-semibold text-ink-500">{o.key}</span>
                <span className="text-ink-800">{o.text}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {revealed && (
        <div className="mt-3">
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
            {question.solution && (
              <p className="mt-1.5 whitespace-pre-line text-ink-700">{question.solution}</p>
            )}
          </div>
          <Link
            href={`/exams/${examCode}/topics/${topicCode}/quiz`}
            className="mt-3 inline-flex items-center justify-center rounded-lg bg-saffron-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600"
          >
            {correct ? `Keep going — 5 more on ${topicName} →` : `Practise 5 more on ${topicName} →`}
          </Link>
          <p className="mt-1 text-[11px] text-ink-500">Instant answers · no signup needed</p>
        </div>
      )}
      {!revealed && (
        <p className="mt-2 text-[11px] text-ink-500">Tap an option to check your answer.</p>
      )}
    </section>
  );
}
