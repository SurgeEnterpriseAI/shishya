// Exam-page FAQ — a visible, accessible accordion PLUS matching FAQPage
// JSON-LD. Google's FAQ rich-result policy requires the Q&A to be visibly
// present on the page (not schema-only), so this component renders both
// from the SAME data — every answer shown to a user is exactly what's in
// the structured data. All facts are sourced from real exam data (free
// pricing, admin-validated question count, available PYQ years, exam
// duration); nothing is fabricated, and items only appear when the
// underlying fact exists. FAQ rich results are high-leverage for exam
// queries like "is <exam> free", "how many <exam> questions", "<exam>
// previous papers".
//
// Honesty (11 Sep 2026 audit): these answers used to claim the questions
// were "community-verified … by students and educators who have cleared
// the same exam" and "student-verified". Question.validated is set only
// by admin routes; there is no student-verification loop. The answers
// now state the real pipeline: AI-generated, grounded in the official
// syllabus/notification, admin-validated before going live, and
// re-checked when a student reports one. PYQ sets are PYQ-pattern
// (freshly worded in that year's pattern), never "the paper".
//
// 16 Sep 2026: the four answers follow the reader's language on the /hi and
// /te hub twins (src/lib/exam-hub-copy.ts). The visible accordion and the
// FAQPage JSON-LD are still built from the SAME data, so they can never
// disagree; English output is unchanged.

import { examHubCopy, fillHub, hubDuration } from "@/lib/exam-hub-copy";

interface FaqItem {
  q: string;
  a: string;
}

export function ExamFaq({
  examShortName,
  examName,
  questionCount,
  pyqYears,
  durationMin,
  hasOfficialPapers = false,
  locale,
}: {
  examShortName: string;
  examName: string;
  questionCount: number;
  /** Distinct PYQ years we have validated questions for. */
  pyqYears: number[];
  durationMin?: number | null;
  /** The conducting body's own question papers are linked on the hub (official-papers-db). */
  hasOfficialPapers?: boolean;
  /** The hub body's language (getT().locale). Defaults to English. */
  locale?: string;
}) {
  const C = examHubCopy(locale);
  const faqs: FaqItem[] = [];

  // Always true — Shishya is free; the question pipeline is stated as it is.
  faqs.push({
    q: fillHub(C.faqFreeQ, { short: examShortName }),
    a: fillHub(C.faqFreeA, { short: examShortName }),
  });

  if (questionCount > 0) {
    faqs.push({
      q: fillHub(C.faqCountQ, { short: examShortName }),
      a: fillHub(C.faqCountA, { count: questionCount.toLocaleString("en-IN"), short: examShortName }),
    });
  }

  if (pyqYears.length > 0) {
    const sorted = [...pyqYears].sort((a, b) => b - a);
    const range =
      sorted.length > 1
        ? `${sorted[sorted.length - 1]}–${sorted[0]}`
        : `${sorted[0]}`;
    faqs.push({
      q: fillHub(C.faqPyqQ, { short: examShortName }),
      // Both names (15 Sep 2026): the official papers where the conducting
      // body published them, and the PYQ-pattern practice sets, each named
      // for what it is.
      a: fillHub(hasOfficialPapers ? C.faqPyqOfficialA : C.faqPyqA, {
        short: examShortName,
        range,
        n: pyqYears.length,
        yearWord: pyqYears.length === 1 ? C.faqYearOne : C.faqYearMany,
      }),
    });
  }

  if (durationMin && durationMin > 0) {
    faqs.push({
      q: fillHub(C.faqLengthQ, { short: examShortName }),
      a: fillHub(C.faqLengthA, { name: examName, short: examShortName, dur: hubDuration(C, durationMin) }),
    });
  }

  // Nothing meaningful to show (shouldn't happen — the free Q&A always
  // applies — but guards against an empty section just in case).
  if (faqs.length === 0) return null;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <section className="mt-10" aria-labelledby="exam-faq-heading">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <h2
        id="exam-faq-heading"
        className="text-base font-semibold text-ink-800"
      >
        {fillHub(C.faqHeading, { short: examShortName })}
      </h2>
      <div className="mt-3 space-y-2">
        {faqs.map((f, i) => (
          <details
            key={i}
            className="group rounded-lg border border-ink-200 bg-white"
          >
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-ink-800 hover:bg-ink-50/60">
              <span className="inline-flex w-full items-center justify-between gap-3">
                {f.q}
                <span
                  aria-hidden
                  className="shrink-0 text-ink-400 transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </span>
            </summary>
            <div className="border-t border-ink-100 px-4 py-3 text-sm leading-relaxed text-ink-700">
              {f.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
