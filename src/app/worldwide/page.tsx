// /worldwide — landing page for study-abroad coverage.
//
// Replaces the previous "coming soon" stub with the real Phase 4
// foundation: 5 countries (US, UK, Canada, Australia, Germany) with
// per-country pages + universities + test prep + loan landscape.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { WORLDWIDE_COUNTRIES, TEST_PREP } from "@/lib/worldwide-data";

export const metadata: Metadata = {
  title: "Worldwide — Study abroad from India, neutral comparison | Shishya",
  description:
    "Study abroad from India neutrally. US, UK, Canada, Australia, Germany. ~50 top universities, visa info, IELTS/TOEFL/GRE/GMAT prep, education loans. No agent referrals.",
  alternates: { canonical: "https://shishya.in/worldwide" },
  keywords: [
    "study abroad india",
    "MS in US from india",
    "study in Canada from india",
    "study in UK from india",
    "study in Germany from india",
    "study in Australia from india",
    "IELTS preparation",
    "GRE preparation",
    "GMAT preparation",
    "student visa india",
    "post study work visa",
    "education loan india",
  ],
  openGraph: {
    title: "Worldwide on Shishya",
    description: "Study abroad neutrally — 5 countries, ~50 universities, test prep, loans, visa info.",
    url: "https://shishya.in/worldwide",
    siteName: "Shishya",
    type: "website",
  },
};

export const revalidate = 86_400;

export default function WorldwideLanding() {
  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> · Worldwide
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ink-900 sm:text-4xl">
          Study or work abroad — honestly, without an agent
        </h1>
        <p className="mt-2 max-w-3xl text-base text-ink-700">
          Country information, university comparisons, visa processes, loans,
          scholarships. Verified by Indian students who&apos;ve actually made
          it. Tuition costs, visa processes, post-study work permits, PR
          pathways, and university lists — sourced from official embassies,
          universities, and government portals.{" "}
          <strong className="text-ink-900">
            No agent partnerships. No affiliate links. No loan referrals.
          </strong>
        </p>

        {/* Countries grid */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">
          {WORLDWIDE_COUNTRIES.length} destination countries
        </h2>
        <p className="mt-1 text-xs text-ink-500">
          Covers ~95% of Indian students studying abroad. Use the{" "}
          <Link href="/worldwide/compare" className="text-saffron-700 underline">comparison tool</Link>{" "}
          to weigh cost vs PSW vs PR difficulty side-by-side.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {WORLDWIDE_COUNTRIES.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/worldwide/${c.slug}`}
                className="block h-full rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400 hover:bg-saffron-50/30"
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl">{c.emojiFlag}</span>
                  <h3 className="text-base font-semibold text-ink-900">{c.name}</h3>
                </div>
                <p className="mt-1 text-xs text-ink-600">{c.indianStudentCount}</p>
                <p className="mt-2 text-[11px] text-ink-500">
                  {c.universities.length} top universities · {c.postStudyWork.split(".")[0].toLowerCase()}
                </p>
              </Link>
            </li>
          ))}
        </ul>

        {/* Test prep */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">
          Language + standardised test prep
        </h2>
        <p className="mt-1 text-xs text-ink-500">
          Honest 5-test coverage. No coaching upsell. We tell you which test
          to pick + a brutally-honest prep strategy.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {TEST_PREP.map((t) => (
            <li key={t.slug}>
              <Link
                href={`/worldwide/test-prep/${t.slug}`}
                className="block rounded-lg border border-ink-200 bg-white p-3 transition-colors hover:border-saffron-400 hover:bg-saffron-50/30"
              >
                <p className="text-sm font-semibold text-ink-900">{t.name}</p>
                <p className="mt-0.5 text-[11px] text-ink-500">{t.fullName}</p>
                <p className="mt-1 text-[11px] text-ink-600">For: {t.acceptedFor.slice(0, 3).join(", ")}</p>
              </Link>
            </li>
          ))}
        </ul>

        {/* Loans */}
        <div className="mt-10 rounded-lg border border-saffron-300 bg-saffron-50/40 p-5">
          <h2 className="text-base font-semibold text-ink-900">
            Education loan landscape (India)
          </h2>
          <p className="mt-2 text-sm text-ink-700">
            8 lenders compared: SBI Global Ed-Vantage, HDFC Credila, Axis
            Bank, ICICI, Bank of Baroda, Avanse, GyanDhan aggregator,
            Prodigy Finance (USD).{" "}
            <strong>
              We have zero affiliate or referral relationship with any
              lender.
            </strong>{" "}
            Comparison shown is informational — for the real interest rate
            you qualify for, approach the lenders directly.
          </p>
          <Link
            href="/worldwide/loans"
            className="mt-3 inline-flex rounded-md bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-saffron-600"
          >
            Open loan comparison →
          </Link>
        </div>

        {/* Roadmap */}
        <div className="mt-10 rounded-lg border border-ink-200 bg-white p-5 text-xs text-ink-700">
          <p className="font-semibold text-ink-800">What's still being built</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>9 more countries (NZ, Ireland, France, Netherlands, Singapore, Japan, Sweden, UAE, Italy)</li>
            <li>Side-by-side country comparison tool — pick on YOUR priorities, not consultant commissions</li>
            <li>Per-country visa step-by-step + document checklists</li>
            <li>City-wise Indian student community resources (real groups, not aggregators)</li>
            <li>Cross-link to relevant scholarships for international study (some live in /scholarships already)</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
