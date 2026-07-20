// /colleges/placements — Honest framing of college placement data.
//
// Indian college placement marketing is famously misleading
// ("Highest CTC ₹2 crore!"). This page is the truth-telling surface.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { JsonLd, collectionPageLd, breadcrumbLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Understanding College Placement Data — What the numbers really mean | Shishya",
  description:
    "Honest read of Indian college placement statistics. Median vs Highest CTC, placement % math, foreign vs domestic offers, service vs product split. Read this before picking a college based on placements.",
  alternates: { canonical: "https://shishya.in/colleges/placements" },
  keywords: [
    "college placement india",
    "IIT placement statistics",
    "highest CTC meaning",
    "median package vs average",
    "college placement misleading",
  ],
};

export const revalidate = 86_400;

const MEDIAN_TIERS = [
  { tier: "Top IITs (Bombay/Delhi/Madras/Kharagpur/Kanpur) — CSE", median: "₹22 - ₹28 LPA", note: "Median, not headline. Top decile ₹50 LPA+ but heavily concentrated in CS/Math + foreign placements." },
  { tier: "Top IITs — other branches (Mech, Civil, Chem, Met)", median: "₹12 - ₹18 LPA", note: "Substantial gap from CSE within same college. Most non-CSE IITians don't do core engineering jobs anymore." },
  { tier: "Old NITs (Trichy, Surathkal, Warangal, Rourkela) — CSE", median: "₹14 - ₹20 LPA", note: "Slightly below top IIT CSE. Same product/service split logic." },
  { tier: "Old NITs — other branches", median: "₹7 - ₹12 LPA", note: "Solid but well below CSE." },
  { tier: "Tier-2 Engg (mid NITs, IIIT-A, IIITH, BITS, COEP, JU, etc.)", median: "₹6 - ₹12 LPA", note: "Strong dev-job pipelines at Indian product companies + service majors." },
  { tier: "IIM-A/B/C/L (MBA)", median: "₹32 - ₹38 LPA", note: "Median. ROI on IIM tuition (~₹25-30L over 2 years) genuinely strong here." },
  { tier: "Other IIMs (Tier-1 newer) — MBA", median: "₹22 - ₹28 LPA", note: "Below ABCs but still strong placement infrastructure." },
  { tier: "NLSIU/NLU-D/NALSAR (Law)", median: "₹15 - ₹20 LPA at top corporate firms; litigation track separate", note: "Top-tier corporate law firms. Litigation starts lower; senior counsel earnings substantial." },
  { tier: "AIIMS / top govt MBBS", median: "Govt MBBS doctor ₹6-8 LPA fresh + ₹15-25 LPA post-MD", note: "Placement % isn't a meaningful metric for MBBS. MD/MS specialisation drives outcomes." },
];

const MISLEADING_PATTERNS = [
  {
    pattern: "Highest CTC ₹2 crore!",
    reality: "Single foreign-payroll offer at a tier-1 firm to a top-1% student. Not representative of the cohort. The 99th percentile says nothing about the 50th percentile.",
  },
  {
    pattern: "100% placement record",
    reality: "Excludes students who 'opted out' (didn't sit for placements). Often includes ₹2-3 LPA mass-recruiter offers students took because they had no other option. Always check median.",
  },
  {
    pattern: "Average package ₹15 LPA",
    reality: "Average is skewed by 1-2 outliers. Median is the honest number. Always ask for median — it usually halves the average.",
  },
  {
    pattern: "Top recruiters: Google, Microsoft, Amazon",
    reality: "Means 1-3 students out of 200 got those offers. Look at total placements by company, not just logos at the top.",
  },
  {
    pattern: "Average CTC ₹X LPA (with foreign offers in INR)",
    reality: "A ₹2.5 Cr foreign-payroll offer ($300k+) pulls the average up massively. Either exclude foreign or report median.",
  },
  {
    pattern: "100% placement at Tier-3 BTech college",
    reality: "Usually means service-company offers at ₹3-4 LPA. Verify median, branch-wise breakup, and dropouts/opt-outs.",
  },
];

export default function PlacementsPage() {
  return (
    <main className="min-h-screen bg-saffron-50/30">
      <JsonLd
        data={[
          collectionPageLd({
            name: "Understanding College Placement Data — What the numbers really mean",
            description:
              "Honest read of Indian college placement statistics. Median vs Highest CTC, placement % math, foreign vs domestic offers, service vs product split. Read this before picking a college based on placements.",
            path: "/colleges/placements",
          }),
          breadcrumbLd([["Colleges", "/colleges"], ["Placements", "/colleges/placements"]]),
        ]}
      />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/colleges" className="hover:text-ink-800">Colleges</Link> · Placements
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ink-900">
          Reading college placement data honestly
        </h1>
        <p className="mt-2 max-w-3xl text-base text-ink-700">
          Indian college placement marketing is famously misleading. "₹2 Cr
          highest CTC!", "100% placement!", "Top recruiters Google + MS!".
          These are technically true and decision-useless. Here's how to
          read them.
        </p>

        {/* Honest medians */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">Honest median packages — top tiers</h2>
        <p className="mt-1 text-xs text-ink-500">
          Median = middle 50%. Not "highest", not "average" (which is skewed
          by outliers). Sources: published placement reports cross-checked
          with student forums (Pagalguy, Quora, anonymous IIM placement
          spreadsheets).
        </p>
        <ul className="mt-4 space-y-2">
          {MEDIAN_TIERS.map((t, i) => (
            <li key={i} className="rounded-lg border border-ink-200 bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-ink-800">{t.tier}</span>
                <span className="text-sm font-semibold text-saffron-800">{t.median}</span>
              </div>
              <p className="mt-1 text-[11px] text-ink-600">{t.note}</p>
            </li>
          ))}
        </ul>

        {/* Misleading patterns */}
        <h2 className="mt-12 text-base font-semibold text-ink-900">6 misleading patterns to ignore</h2>
        <ul className="mt-3 space-y-3">
          {MISLEADING_PATTERNS.map((m, i) => (
            <li key={i} className="rounded-lg border border-rose-200 bg-rose-50/30 p-4">
              <p className="text-sm font-semibold text-ink-900">"{m.pattern}"</p>
              <p className="mt-1 text-xs text-ink-700"><strong>Reality:</strong> {m.reality}</p>
            </li>
          ))}
        </ul>

        {/* Questions to ask */}
        <h2 className="mt-12 text-base font-semibold text-ink-900">Questions to actually ask</h2>
        <ol className="mt-3 list-decimal space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/30 p-4 pl-8 text-sm text-ink-700">
          <li><strong>What's the median CTC?</strong> Not average. Not highest. Median.</li>
          <li><strong>What's the median for MY branch?</strong> CSE median ≠ Mechanical median.</li>
          <li><strong>How many got offers from top product / consulting / IB / govt?</strong> Not just "logos visited" — actual offer count.</li>
          <li><strong>What % of students sat for placements?</strong> If 30% opted out, "100% placed of 70%" is the real number — not 100%.</li>
          <li><strong>What's the bottom decile CTC?</strong> If lowest-decile gets ₹3 LPA service offers, that's the floor.</li>
          <li><strong>Is the foreign offer ₹2 Cr included in the average?</strong> Should be excluded for honest comparison.</li>
          <li><strong>Where do alumni 5 years out work?</strong> The most-honest signal. LinkedIn search for "[college] [batch year]".</li>
          <li><strong>What's the salary 5 years out — not just at graduation?</strong> Some tier-3 BTech grads start at ₹3.5L but reach ₹15L in 5 years. Some IIT grads start at ₹30L but plateau if they don't switch firms.</li>
        </ol>

        {/* What we publish */}
        <div className="mt-12 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5 text-sm text-ink-700">
          <h2 className="text-base font-semibold text-ink-900">What Shishya publishes vs not</h2>
          <p className="mt-3 text-xs">
            We publish:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
            <li>Median ranges from official college placement reports (where available)</li>
            <li>NIRF Graduation Outcomes score (with caveats — see our <Link href="/insights/nirf-rank-vs-employment-outcomes" className="text-saffron-700 underline">insights article</Link>)</li>
            <li>Cross-links to colleges' own placement reports (which you should read)</li>
            <li>Career-path-level salary bands (in <Link href="/careers" className="text-saffron-700 underline">/careers</Link>)</li>
          </ul>
          <p className="mt-3 text-xs">We deliberately don't publish:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
            <li>"Highest CTC" numbers — they're decision-useless</li>
            <li>"100% placement" claims without context</li>
            <li>College rankings based on placement alone (use NIRF + multiple signals)</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
