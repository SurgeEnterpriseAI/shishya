// /scholarships/match — Match Wizard.
//
// 5-question flow: state → category → gender → level → income (+ optional
// exams). The student gets a ranked list of scholarships they actually
// qualify for, with plain-language "why this matched" reasons.
//
// Server component shell — the wizard itself is a client component
// because it needs interactive step-state.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { SCHOLARSHIPS } from "@/data/scholarships";
import { MatchWizard } from "./MatchWizard";

export const metadata: Metadata = {
  title: "Scholarship Match Wizard — Find scholarships you qualify for | Shishya",
  description:
    "Answer 5 quick questions about your state, category, level, gender, and family income to find the central, state, and private scholarships you actually qualify for. Free.",
  alternates: { canonical: "https://shishya.in/scholarships/match" },
  keywords: [
    "scholarship eligibility India",
    "scholarship match India",
    "find scholarship India",
    "girls scholarship India",
    "SC ST OBC scholarship India",
    "income-based scholarship India",
  ],
};

export const revalidate = 86_400;

export default function MatchWizardPage() {
  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/scholarships" className="hover:text-ink-800">Scholarships</Link> · Match Wizard
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ink-900 sm:text-4xl">
          Match yourself to scholarships in 5 questions
        </h1>
        <p className="mt-2 max-w-2xl text-base text-ink-700">
          We check eligibility for you. Answer 5 quick questions — nothing is
          stored, your responses live only in your browser. We don&apos;t take
          your name, email, phone, or family-income details to a server.
        </p>

        <MatchWizard scholarships={SCHOLARSHIPS} />

        <div className="mt-10 rounded-lg border border-ink-200 bg-white p-5 text-xs text-ink-600">
          <p className="font-semibold text-ink-800">A note on accuracy</p>
          <p className="mt-2">
            Eligibility rules change every cycle. The wizard surfaces
            schemes that match the rules we've recorded; before applying,
            click through to the awarding body and verify the latest
            cutoffs, income ceilings, and document requirements directly
            on the official portal. Shishya never collects payment or
            charges a finder's fee — links go to the awarding body
            directly.
          </p>
        </div>
      </section>
    </main>
  );
}
