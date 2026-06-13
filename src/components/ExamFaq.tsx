// Exam-page FAQ — a visible, accessible accordion PLUS matching FAQPage
// JSON-LD. Google's FAQ rich-result policy requires the Q&A to be visibly
// present on the page (not schema-only), so this component renders both
// from the SAME data — every answer shown to a user is exactly what's in
// the structured data. All facts are sourced from real exam data (free
// pricing, verified-question count, available PYQ years, exam duration);
// nothing is fabricated, and items only appear when the underlying fact
// exists. FAQ rich results are high-leverage for exam queries like
// "is <exam> free", "how many <exam> questions", "<exam> previous papers".

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
}: {
  examShortName: string;
  examName: string;
  questionCount: number;
  /** Distinct PYQ years we have validated questions for. */
  pyqYears: number[];
  durationMin?: number | null;
}) {
  const faqs: FaqItem[] = [];

  // Always true — Shishya is free + community-verified.
  faqs.push({
    q: `Is Shishya free for ${examShortName} preparation?`,
    a: `Yes. Every ${examShortName} mock test, previous-year paper, and study tool on Shishya is completely free — no subscription and no credit card. Shishya is community-verified, so questions are checked by students and educators who have cleared the same exam.`,
  });

  if (questionCount > 0) {
    faqs.push({
      q: `How many ${examShortName} practice questions does Shishya have?`,
      a: `Shishya has ${questionCount.toLocaleString("en-IN")} student-verified ${examShortName} practice questions, available as adaptive mock tests with a worked solution for every question.`,
    });
  }

  if (pyqYears.length > 0) {
    const sorted = [...pyqYears].sort((a, b) => b - a);
    const range =
      sorted.length > 1
        ? `${sorted[sorted.length - 1]}–${sorted[0]}`
        : `${sorted[0]}`;
    faqs.push({
      q: `Are ${examShortName} previous year question papers available?`,
      a: `Yes. Shishya has free ${examShortName} previous-year papers covering ${range} (${pyqYears.length} ${pyqYears.length === 1 ? "year" : "years"}). Each is a timed practice set with full solutions.`,
    });
  }

  if (durationMin && durationMin > 0) {
    const h = Math.floor(durationMin / 60);
    const m = durationMin % 60;
    const dur =
      h > 0
        ? `${h} hour${h > 1 ? "s" : ""}${m ? ` ${m} minutes` : ""}`
        : `${m} minutes`;
    faqs.push({
      q: `How long is the ${examShortName} exam?`,
      a: `The ${examName} (${examShortName}) runs for ${dur}. Shishya's mock tests mirror this duration so you can practise under real exam-time pressure.`,
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
        {examShortName} — Frequently asked questions
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
