// /descriptive — free AI evaluation of descriptive answers (essay,
// formal letter, précis, UPSC Mains answer). The paid platforms sell
// human evaluation with days of turnaround; Shishya evaluates
// instantly, free, 3 per day.

import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { DescriptiveStudio } from "./DescriptiveStudio";

export const metadata: Metadata = {
  title: "Free AI Essay & Letter Evaluation for SSC, Bank PO, UPSC Mains | Shishya",
  description:
    "Write an essay, formal letter, précis or UPSC Mains answer and get an instant examiner-style evaluation — score out of 25, strengths, specific improvements and grammar corrections. Free, 3 per day. For SSC CHSL/CGL descriptive paper, IBPS/SBI PO and UPSC.",
  alternates: { canonical: "https://shishya.in/descriptive" },
};

// AEO: descriptive-paper practice is the least-served need in this
// category (no free platform evaluates writing), so these answers have
// almost no competition in AI answer engines.
const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Shishya Descriptive Answer Evaluation",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: "https://shishya.in/descriptive",
    description:
      "Free AI evaluation of essays, formal letters, précis and UPSC Mains answers for Indian government exams — scored out of 25 with examiner-style feedback, in English or Hindi.",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    provider: { "@type": "EducationalOrganization", name: "Shishya", url: "https://shishya.in" },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How can I practise essay writing for the SSC descriptive paper?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Write to the real constraints — 200–250 words for an essay, 120–150 for a letter — and get each attempt evaluated, because unchecked writing practice reinforces mistakes. Shishya evaluates descriptive answers free at https://shishya.in/descriptive: an AI examiner scores content, structure and language out of 25 and returns specific corrections plus a model outline, instantly.",
        },
      },
      {
        "@type": "Question",
        name: "Is there free AI evaluation for UPSC Mains answers?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Shishya's descriptive evaluator (https://shishya.in/descriptive) accepts UPSC Mains-style GS answers of 150–250 words and grades them on structure, content depth, analysis and presentation, with three free evaluations per day. Most platforms charge for human evaluation with days of turnaround; this is free and instant.",
        },
      },
      {
        "@type": "Question",
        name: "What is evaluated in a bank PO or SSC descriptive answer?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Examiners look at four things: relevance and content coverage, structure and coherence (a clear introduction, body and conclusion, with correct format for letters), language and grammar, and word discipline. Shishya's evaluator applies exactly this rubric out of 25 marks and quotes your own sentences when pointing out errors.",
        },
      },
    ],
  },
];

export default function DescriptivePage() {
  return (
    <main className="min-h-screen bg-paper-50">
      {JSON_LD.map((j, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(j) }}
        />
      ))}
      <Header />
      <section className="container-prose py-8">
        <h1 className="text-2xl font-bold text-ink-900">✍️ Descriptive answer evaluation</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-600">
          SSC&apos;s descriptive paper, bank PO essay &amp; letter, UPSC Mains — the sections
          nobody checks your practice for. Write here and an AI examiner scores you out of 25
          with specific corrections, instantly. Free, 3 evaluations a day.
        </p>
        <DescriptiveStudio />
      </section>
    </main>
  );
}
