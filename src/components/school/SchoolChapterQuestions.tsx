// Checked practice questions printed with their answers on a Class 8-12
// chapter page (3 Oct 2026, crawl audit G3) — the school twin of
// src/components/TopicQuestionsInFull.tsx and the PYQ page.
//
// Server component, no script: stem and options are visible; the answer and
// the explanation sit under a native <details>, so they are in the page HTML
// for a reader, a crawler and an assistant alike (the first one open, as a
// worked example). Which questions and in what order:
// src/lib/school/chapter-questions.ts (answer-checked rows only, at most ten,
// one of each concept first). Every word: CHAPTER_QUESTIONS_COPY in
// src/lib/school/student-copy.ts — the block says the questions are written
// with AI and checked by an automated pass, never the book's or a board's.
// Text goes through the notes' inline renderer (src/lib/notes-markdown.ts
// inlineHtml: every character escaped, "**a**" vector notation drawn bold),
// never as raw markup. The page renders it only behind
// SCHOOL_CHAPTER_QUESTIONS_PRINTED (default OFF) and only on Class 8-12.

import type { ShownQuestion } from "@/lib/topic-question-display";
import { inlineHtml } from "@/lib/notes-markdown";
import { CHAPTER_QUESTIONS_COPY as C } from "@/lib/school/student-copy";

/** Escaped inline markdown (bold, italic, code) — never markup from the row. */
function Inline({ text }: { text: string }) {
  return <span dangerouslySetInnerHTML={{ __html: inlineHtml(text) }} />;
}

export function SchoolChapterQuestions({
  questions,
  chapterName,
  reportLabel,
}: {
  questions: readonly ShownQuestion[];
  chapterName: string;
  /** Names the chapter in an error report's subject line. */
  reportLabel: string;
}) {
  if (questions.length === 0) return null;
  return (
    <section className="mt-10" data-school-questions={questions.length} aria-labelledby="chapter-questions-heading">
      <h2 id="chapter-questions-heading" className="text-base font-semibold text-ink-900">
        {C.heading}
      </h2>
      <p className="mt-1 text-xs text-ink-500">{C.intro(questions.length, chapterName)}</p>
      <ol className="mt-4 space-y-4">
        {questions.map((q, i) => {
          const correct = q.options.find((o) => o.key === q.answerKey);
          return (
            <li key={q.id} className="rounded-lg border border-ink-200 bg-white p-4 sm:p-5">
              <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-ink-900 sm:text-base">
                <span className="mr-1 text-ink-500">{i + 1}.</span>
                <Inline text={q.body} />
              </p>
              <ul className="mt-3 space-y-1.5">
                {q.options.map((o) => (
                  <li key={o.key} className="flex gap-2 text-sm text-ink-800">
                    <span className="shrink-0 font-semibold text-ink-600">({o.key})</span>
                    <span className="whitespace-pre-line">
                      <Inline text={o.text} />
                    </span>
                  </li>
                ))}
              </ul>
              <details className="mt-3 rounded-md border border-ink-200 bg-ink-50/60" open={i === 0}>
                <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-saffron-700">{C.showAnswer}</summary>
                <div className="border-t border-ink-200 px-3 py-3 text-sm leading-relaxed text-ink-800">
                  <p>
                    <span className="font-semibold text-ink-900">{C.answer}:</span> ({q.answerKey}){" "}
                    {correct ? <Inline text={correct.text} /> : null}
                  </p>
                  <p className="mt-2 whitespace-pre-line">
                    <span className="font-semibold text-ink-900">{C.explanation}:</span> <Inline text={q.solution} />
                  </p>
                  <p className="mt-3 text-xs text-ink-500">
                    <a
                      href={`mailto:corp@surgesoftware.co.in?subject=${encodeURIComponent(`Error in question ${q.id} (${reportLabel})`)}`}
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
    </section>
  );
}
