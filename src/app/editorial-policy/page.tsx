// /editorial-policy — how Shishya's content is produced and checked
// (25 Aug 2026, E-E-A-T). Every claim on this page is verifiable in the
// product: official-source links on trackers, the report-a-question
// loop, the expert desk. No puffery — raters and users read this page
// the same way.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "How Shishya builds and checks its content | Shishya",
  description:
    "Shishya's editorial policy: AI-assisted content grounded in official notifications and previous-year papers, official dates always linked to the source, expected dates clearly labelled, student error-reporting on every question, and human review.",
  alternates: { canonical: "https://shishya.in/editorial-policy" },
};

export default function EditorialPolicyPage() {
  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header />
      <section className="container-prose max-w-3xl py-10 text-sm leading-relaxed text-ink-700">
        <h1 className="text-2xl font-bold text-ink-900">How Shishya builds and checks its content</h1>
        <p className="mt-2 text-xs text-ink-500">
          Operated by Surge Software Solutions Pvt Ltd, Bengaluru ·{" "}
          <a className="text-saffron-700 underline" href="mailto:corp@surgesoftware.co.in">corp@surgesoftware.co.in</a>
        </p>

        <h2 className="mt-8 text-lg font-semibold text-ink-900">AI-assisted, source-grounded</h2>
        <p className="mt-2">
          Shishya covers 175+ Indian government and entrance exams. At that breadth, our practice
          questions, study notes and exam summaries are drafted with AI — we say that plainly —
          and they are grounded in the material that matters: official notifications from the
          conducting bodies, previous-year papers, and each exam&apos;s published pattern. Practice
          questions go through a validation step before they are served to aspirants.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-ink-900">Official vs expected — always labelled</h2>
        <p className="mt-2">
          On every exam tracker, a date is marked <b>Official</b> only when we can link the official
          notice it came from — the link is right there. Anything else is marked{" "}
          <b>Expected</b>: an estimate from previous cycles, never presented as an announcement. We
          also show when each exam&apos;s data was last updated, and we always tell aspirants to
          confirm on the conducting body&apos;s website before acting.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-ink-900">Every question can be challenged</h2>
        <p className="mt-2">
          Every practice question carries a <b>Report</b> action. Reported questions are reviewed by
          a human and corrected or removed; reporters are notified of the outcome. Aspirants can
          also bring any doubt to the free expert desk, which a person answers.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-ink-900">What we will not do</h2>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>No paywall on preparation — mocks, papers, notes, tutor, plans stay free.</li>
          <li>No invented vacancy counts, cutoffs or dates presented as fact.</li>
          <li>No ads, no affiliate links, no selling of aspirant data.</li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold text-ink-900">Corrections</h2>
        <p className="mt-2">
          Found something wrong? Use the report button on the question, the{" "}
          <Link href="/contact" className="text-saffron-700 underline">contact page</Link>, or email{" "}
          <a className="text-saffron-700 underline" href="mailto:corp@surgesoftware.co.in">corp@surgesoftware.co.in</a>{" "}
          — corrections ship fast and quietly.
        </p>

        <p className="mt-8">
          <Link href="/about" className="font-medium text-saffron-700 underline">About Shishya →</Link>
        </p>
      </section>
    </main>
  );
}
