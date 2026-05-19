// /worldwide/loans — education loan landscape comparison.
//
// Honest, non-affiliated comparison of the major Indian education-loan
// providers. No "recommended lender" buttons. No referral kickbacks.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { EDUCATION_LOANS, TAX_BENEFIT_NOTE } from "@/lib/worldwide-data";

export const metadata: Metadata = {
  title: "Education Loan for Study Abroad (India) — Compare SBI, HDFC, Axis, ICICI, NBFCs | Shishya",
  description:
    "Honest comparison of 8 Indian education loan providers for study abroad. SBI Global Ed-Vantage, HDFC Credila, Axis, ICICI, BoB, Avanse, GyanDhan, Prodigy. Section 80E tax benefit. No affiliate links.",
  alternates: { canonical: "https://shishya.in/worldwide/loans" },
  keywords: [
    "education loan India",
    "SBI Global Ed-Vantage",
    "HDFC Credila",
    "Axis Bank education loan",
    "Section 80E",
    "education loan without collateral",
    "Prodigy Finance India",
    "Avanse education loan",
  ],
};

export const revalidate = 86_400;

export default function LoansPage() {
  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/worldwide" className="hover:text-ink-800">Worldwide</Link> · Education loans
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ink-900">
          Education Loans for Study Abroad
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-700">
          8 Indian lenders compared. Public-sector banks (lowest rates, slower
          processing, strict collateral above ₹7.5L). Private banks (faster,
          slightly higher rates). NBFCs (fastest, often non-collateral up
          to ₹40-50L for premium institutions, highest rates).{" "}
          <strong className="text-ink-900">
            Shishya has zero affiliate or referral arrangement with any
            lender on this page.
          </strong>{" "}
          Numbers are indicative — actual rate depends on co-applicant
          income + co-applicant credit + institution + program.
        </p>

        {/* The big table */}
        <h2 className="mt-8 text-base font-semibold text-ink-900">Comparison</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-ink-200 bg-white">
          {EDUCATION_LOANS.map((l) => (
            <div key={l.slug} className="border-b border-ink-100 p-5 last:border-b-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold text-ink-900">{l.name}</h3>
                <span className={
                  l.kind === "BANK"
                    ? "rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800"
                    : "rounded bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800"
                }>
                  {l.kind === "BANK" ? "Bank" : "NBFC"}
                </span>
              </div>
              <p className="mt-2 text-sm text-ink-700">{l.notes}</p>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                <div>
                  <dt className="font-semibold text-ink-500">Max loan</dt>
                  <dd className="mt-0.5 text-ink-800">{l.maxLoanInr}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-ink-500">Interest range</dt>
                  <dd className="mt-0.5 text-ink-800">{l.interestRange}</dd>
                </div>
                <div className="sm:col-span-2 lg:col-span-2">
                  <dt className="font-semibold text-ink-500">Collateral policy</dt>
                  <dd className="mt-0.5 text-ink-800">{l.collateralPolicy}</dd>
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <dt className="font-semibold text-ink-500">Repayment</dt>
                  <dd className="mt-0.5 text-ink-800">{l.repayment}</dd>
                </div>
              </dl>
              <a
                href={l.officialSite}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex text-xs text-saffron-700 underline hover:text-saffron-800"
              >
                Open official site ↗
              </a>
            </div>
          ))}
        </div>

        {/* Section 80E */}
        <div className="mt-8 rounded-lg border border-emerald-200 bg-emerald-50/30 p-5">
          <h2 className="text-base font-semibold text-ink-900">Section 80E tax benefit</h2>
          <p className="mt-2 text-sm text-ink-700">{TAX_BENEFIT_NOTE}</p>
        </div>

        {/* Practical advice */}
        <div className="mt-8 rounded-lg border border-ink-200 bg-white p-5 text-sm text-ink-700">
          <h2 className="text-base font-semibold text-ink-900">
            How to actually shop for an education loan
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs">
            <li>
              <strong className="text-ink-800">Get sanction letters from 2-3 lenders</strong>{" "}
              before paying any university deposit. Sanction is free; it locks
              in your rate + amount.
            </li>
            <li>
              <strong className="text-ink-800">Compare APR, not just headline rate.</strong>{" "}
              Banks often quote MCLR/Repo + spread; NBFCs quote flat rate.
              Use APR (effective annualised rate) to compare apples-to-apples.
            </li>
            <li>
              <strong className="text-ink-800">Check processing fee + insurance + foreclosure charges.</strong>{" "}
              These add 1-3% to the effective cost.
            </li>
            <li>
              <strong className="text-ink-800">For US/UK MS programs at top universities,</strong>{" "}
              HDFC Credila or Prodigy Finance can give non-collateral loans
              that exceed bank limits. Higher rates, but unblock students
              who can't put up immovable property.
            </li>
            <li>
              <strong className="text-ink-800">For Canada / Germany / Australia,</strong>{" "}
              SBI Global Ed-Vantage is usually cheapest if you can put up
              collateral (parental property). 1.5-2.5% rate advantage over
              NBFCs compounds heavily over 10-year tenure.
            </li>
            <li>
              <strong className="text-ink-800">Don't sign with the first lender.</strong>{" "}
              Loan officers will quote different rates to different applicants
              based on co-applicant profile. Negotiate.
            </li>
          </ol>
        </div>

        {/* Red flags */}
        <div className="mt-8 rounded-lg border border-rose-200 bg-rose-50/30 p-5 text-sm text-ink-700">
          <h2 className="text-base font-semibold text-ink-900">
            Red flags from "study abroad consultants"
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
            <li>"We get you a better rate through our partner bank" — usually means they're a DSA earning commission on your loan</li>
            <li>"Pay our processing fee + we'll guarantee approval" — banks process the loan themselves; consultants can't guarantee anything</li>
            <li>"Fixed-rate loan" pitched as a benefit — for education loans, MCLR/Repo-linked floating typically beats fixed over 10 years</li>
            <li>Lender asks for "facilitation charges" outside the loan agreement — fraud signal, walk away</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
