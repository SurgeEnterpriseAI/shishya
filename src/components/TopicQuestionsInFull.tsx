// Practice questions printed whole on a topic page (29 Sep 2026): stem,
// every option, the answer and the worked solution. Which questions and in
// what order: src/lib/topic-question-display.ts.
//
// Server component, no script: the answer sits under a native <details>, so
// it is in the page HTML for a reader, a crawler and an assistant alike.
// The first question shows its solution open.

import Link from "next/link";
import type { ShownQuestion } from "@/lib/topic-question-display";
import { fillTopicQuestions, topicQuestionsCopy } from "@/lib/topic-questions-copy";

export function TopicQuestionsInFull({
  questions,
  topicName,
  examShort,
  examCode,
  topicCode,
  locale,
  firstOpen = true,
  className = "mt-8",
}: {
  questions: readonly ShownQuestion[];
  topicName: string;
  examShort: string;
  examCode: string;
  topicCode: string;
  locale: string;
  /** Show the first question's solution open. */
  firstOpen?: boolean;
  className?: string;
}) {
  if (questions.length === 0) return null;
  const C = topicQuestionsCopy(locale);
  const vars = { n: questions.length, topic: topicName, exam: examShort };
  return (
    <section className={className} data-topic-questions={questions.length} aria-labelledby="topic-questions-heading">
      <h2 id="topic-questions-heading" className="text-lg font-bold leading-snug text-ink-900">
        {fillTopicQuestions(questions.length === 1 ? C.headingOne : C.heading, vars)}
      </h2>
      <p className="mt-1 text-xs text-ink-500">{C.notice}</p>
      <ol className="mt-4 space-y-4">
        {questions.map((q, i) => {
          const correct = q.options.find((o) => o.key === q.answerKey);
          return (
            <li key={q.id} className="rounded-lg border border-ink-200 bg-white p-4 sm:p-5">
              <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-ink-900 sm:text-base">
                <span className="mr-1 text-ink-500">{i + 1}.</span>
                {q.body}
              </p>
              <ul className="mt-3 space-y-1.5">
                {q.options.map((o) => (
                  <li key={o.key} className="flex gap-2 text-sm text-ink-800">
                    <span className="shrink-0 font-semibold text-ink-600">({o.key})</span>
                    <span className="whitespace-pre-line">{o.text}</span>
                  </li>
                ))}
              </ul>
              <details className="mt-3 rounded-md border border-ink-200 bg-ink-50/60" open={firstOpen && i === 0}>
                <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-saffron-700">{C.showAnswer}</summary>
                <div className="border-t border-ink-200 px-3 py-3 text-sm leading-relaxed text-ink-800">
                  <p>
                    <span className="font-semibold text-ink-900">{C.answer}:</span> ({q.answerKey}){correct ? ` ${correct.text}` : ""}
                  </p>
                  <p className="mt-2 whitespace-pre-line">
                    <span className="font-semibold text-ink-900">{C.solution}:</span> {q.solution}
                  </p>
                  <p className="mt-3 text-xs text-ink-500">
                    <a
                      href={`mailto:corp@surgesoftware.co.in?subject=${encodeURIComponent(`Error in question ${q.id} (${topicName}, ${examShort})`)}`}
                      rel="nofollow"
                      className="font-medium text-saffron-700 underline-offset-2 hover:underline"
                    >
                      {C.report}
                    </a>
                  </p>
                </div>
              </details>
            </li>
          );
        })}
      </ol>
      <Link
        href={`/exams/${examCode}/topics/${topicCode}/quiz`}
        className="mt-4 inline-block text-sm font-semibold text-saffron-700 underline-offset-2 hover:underline"
      >
        {C.quizLink}
      </Link>
    </section>
  );
}
