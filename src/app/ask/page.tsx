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
};

const JSON_LD = {
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
};

export default function AskPage() {
  return (
    <main className="min-h-screen bg-paper-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
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
