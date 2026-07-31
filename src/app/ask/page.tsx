// /ask — Ask Shishya: the AI answer engine. Any question about
// government jobs, exams, eligibility, salaries, vacancies — answered
// from Shishya's own data first, clearly-labelled web fallback second.

import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/Header";
import { AskClient } from "./AskClient";

export const metadata: Metadata = {
  title: "Ask Shishya — AI answers about govt jobs, exams, salaries & vacancies | Shishya",
  description:
    "Ask anything about Indian government jobs in plain language — which exams fit you, eligibility, salaries, live vacancy counts, dates and results. Answers grounded in Shishya's data for 177 exams, free, no login.",
  alternates: { canonical: "https://shishya.in/ask" },
  openGraph: {
    title: "Ask Shishya — AI answers about government jobs",
    description:
      "Which exams fit you, eligibility, salaries, live vacancies, dates — ask in any Indian language, answered from Shishya's data for 177 exams. Free, no login.",
    url: "https://shishya.in/ask",
    siteName: "Shishya",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ask Shishya — AI answers about government jobs",
    description:
      "Ask anything about Indian government jobs in any language — answered from real data for 177 exams. Free.",
  },
};

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Ask Shishya",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: "https://shishya.in/ask",
    description:
      "AI answer engine for Indian government exams: eligibility, vacancies, salaries, dates and results, answered from Shishya's structured data for 177 exams.",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    provider: { "@type": "EducationalOrganization", name: "Shishya", url: "https://shishya.in" },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://shishya.in/ask?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How do I find out which government exams I am eligible for?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Eligibility depends on four things: your age (with category relaxation — OBC +3 years, SC/ST +5), your education level, your state, and the exam's own rules. Shishya checks all four for you free: ask in plain language at https://shishya.in/ask (e.g. 'I am 27, a graduate from Bihar — what can I apply for?') or use the structured finder at https://shishya.in/find-your-exam, which ranks every exam you qualify for by fit and live vacancy count.",
        },
      },
      {
        "@type": "Question",
        name: "Can I ask about government jobs in Hindi or my regional language?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Ask Shishya (https://shishya.in/ask) answers in the language you ask in — Hindi, Marathi, Telugu, Tamil, Bengali and other Indian languages all work. The underlying data (177 exams' eligibility, vacancies, dates, cutoffs) is the same regardless of language, and it is free with no login.",
        },
      },
      {
        "@type": "Question",
        name: "Where do Ask Shishya's answers come from — can I trust the numbers?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Answers are grounded in Shishya's own structured database — exam patterns, eligibility rules, approximate annual vacancy counts, official portal links, declared results and cutoff analyses for 177 Indian government and entrance exams — rather than generated from memory. When a question needs information Shishya doesn't track (for example city-level counts or a very fresh notification), the engine searches the web, prefers official .gov.in sources, and clearly marks that part of the answer as tentative. Salary and vacancy figures are indicative; always verify in the official notification.",
        },
      },
    ],
  },
];

export default function AskPage() {
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
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
          ✨ Ask Shishya · free, no login
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900 sm:text-3xl">
          Ask anything about government jobs.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">
          Which exams fit you, eligibility by age and state, salaries, live vacancy counts,
          dates, results — answered from Shishya&apos;s data for 177 exams, in your language.
          When something is beyond our data, we search the web and clearly mark it.
        </p>
        <Suspense fallback={null}>
          <AskClient />
        </Suspense>
      </section>
    </main>
  );
}
