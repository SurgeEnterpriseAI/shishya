// /colleges/cutoffs — Cutoff trends framework + honest framing.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { JsonLd, collectionPageLd, breadcrumbLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "College Cutoff Trends — How to read JEE/NEET/CLAT cutoffs honestly | Shishya",
  description:
    "Honest guide to college cutoff trends. JEE Advanced / Main, NEET UG, CLAT, CUET, IIM CAT cutoffs by category and branch. Read this before chasing rank predictors.",
  alternates: { canonical: "https://shishya.in/colleges/cutoffs" },
  keywords: [
    "JEE cutoff trend",
    "NEET cutoff trend",
    "CLAT cutoff",
    "CUET cutoff",
    "rank predictor accuracy",
    "JoSAA opening closing rank",
    "MCC closing rank",
  ],
};

export const revalidate = 86_400;

const SOURCES = [
  {
    exam: "JEE Advanced (IITs)",
    portal: "https://josaa.nic.in/",
    portalName: "JoSAA",
    detail: "JoSAA publishes opening + closing rank for every IIT × branch × category × gender combination after each round (Round 1, 2, 3, 4, 5, 6). The Round-6 closing rank is the 'final cutoff' for that year.",
  },
  {
    exam: "JEE Main (NITs / IIITs / GFTIs)",
    portal: "https://josaa.nic.in/",
    portalName: "JoSAA",
    detail: "Same JoSAA portal — Choice Filling for NIT / IIIT / GFTI rounds. CSAB Special Rounds happen after JoSAA closes (for vacant seats).",
  },
  {
    exam: "NEET UG (MBBS / BDS)",
    portal: "https://mcc.nic.in/",
    portalName: "MCC",
    detail: "MCC runs All-India 15% quota + Deemed + Central Universities counselling. State counselling runs separately for state quota (85% in most states).",
  },
  {
    exam: "CLAT (NLUs)",
    portal: "https://consortiumofnlus.ac.in/",
    portalName: "Consortium of NLUs",
    detail: "Published merit + cutoff per NLU + category. Top NLU (NLSIU) closing rank typically 50-100 in general category.",
  },
  {
    exam: "CUET UG (Central Universities)",
    portal: "https://cuet.samarth.ac.in/",
    portalName: "NTA / Samarth",
    detail: "CUET admission via individual university portals (DU, BHU, JNU, etc.). Each university publishes its own closing percentiles + scores.",
  },
  {
    exam: "CAT (IIMs)",
    portal: "https://www.iimcat.ac.in/",
    portalName: "IIM CAT",
    detail: "IIMs publish their cutoff sectional + overall percentile annually. Top IIMs cutoff ~99 percentile overall; gender + category-specific cutoffs vary.",
  },
  {
    exam: "GATE (PSUs + IIT MTech)",
    portal: "https://gate2025.iitr.ac.in/",
    portalName: "GATE",
    detail: "GATE scores feed into individual IIT MTech admissions + PSU-specific cutoffs (NTPC, ONGC, IOCL etc each publish own).",
  },
];

const HOW_TO_USE = [
  {
    step: "Step 1 — Get the previous 3-5 years' closing ranks",
    body: "From JoSAA / MCC / NLU consortium / IIM-CAT websites. Build a spreadsheet — year × college × branch × category × gender × your rank. Trends matter more than single-year cutoffs (seats + applicants change).",
  },
  {
    step: "Step 2 — Filter to YOUR category + gender",
    body: "OBC-NCL cutoff for Mech at NIT Trichy is very different from General cutoff for CSE at IIT Bombay. The number you should track is YOUR demographic's cutoff.",
  },
  {
    step: "Step 3 — Look at the TREND line, not single year",
    body: "JEE Advanced 2022 saw a sudden CSE rank inflation due to seat increases. Single-year cutoffs misrepresent. Use 3-year median + a safety margin.",
  },
  {
    step: "Step 4 — Apply rank predictor logic conservatively",
    body: "Rank predictors are typically ±2000 rank accurate (sometimes worse). If a predictor says 'CSE @ IIT BHU likely with rank X', confirm X is well below the 3-year closing rank, not equal to it.",
  },
  {
    step: "Step 5 — Plan a 5-college choice list with safety margin",
    body: "JoSAA lets you fill 80+ choices. Front-load with stretch options (3-4 above your predicted rank), midload with likely-fit, and back-load with safety colleges. Skip the 'wishful thinking' choices that need ranks far above yours.",
  },
];

export default function CutoffsPage() {
  return (
    <main className="min-h-screen bg-saffron-50/30">
      <JsonLd
        data={[
          collectionPageLd({
            name: "College Cutoff Trends — How to read JEE/NEET/CLAT cutoffs honestly",
            description:
              "Honest guide to college cutoff trends. JEE Advanced / Main, NEET UG, CLAT, CUET, IIM CAT cutoffs by category and branch. Read this before chasing rank predictors.",
            path: "/colleges/cutoffs",
          }),
          breadcrumbLd([["Colleges", "/colleges"], ["Cutoffs", "/colleges/cutoffs"]]),
        ]}
      />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/colleges" className="hover:text-ink-800">Colleges</Link> · Cutoff Trends
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ink-900">
          Reading college cutoffs honestly
        </h1>
        <p className="mt-2 max-w-3xl text-base text-ink-700">
          Cutoffs are the single most-searched college admission data. They're
          also the most-misread. Rank predictors over-promise. "Last year's
          cutoff" is misleading. Here's the framework that actually works.
        </p>

        {/* Sources */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">
          Official sources by exam
        </h2>
        <p className="mt-1 text-xs text-ink-500">
          The only data worth trusting. Coaching-institute "cutoffs" are
          retrofitted from these.
        </p>
        <ul className="mt-3 space-y-3">
          {SOURCES.map((s, i) => (
            <li key={i} className="rounded-lg border border-ink-200 bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-ink-900">{s.exam}</h3>
                <a
                  href={s.portal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-saffron-700 underline"
                >
                  {s.portalName} portal ↗
                </a>
              </div>
              <p className="mt-2 text-xs text-ink-700">{s.detail}</p>
            </li>
          ))}
        </ul>

        {/* How to use */}
        <h2 className="mt-12 text-base font-semibold text-ink-900">
          The 5-step method to use cutoffs
        </h2>
        <ol className="mt-3 space-y-3">
          {HOW_TO_USE.map((h, i) => (
            <li key={i} className="rounded-lg border border-saffron-200 bg-saffron-50/30 p-4">
              <p className="text-sm font-semibold text-ink-900">{h.step}</p>
              <p className="mt-1 text-xs text-ink-700">{h.body}</p>
            </li>
          ))}
        </ol>

        {/* What we don't do */}
        <div className="mt-10 rounded-lg border border-amber-200 bg-amber-50/40 p-5 text-sm text-ink-700">
          <h3 className="text-base font-semibold text-ink-900">What Shishya doesn't ship (yet)</h3>
          <p className="mt-2 text-xs">
            We don't yet publish a per-college × branch × year cutoff table
            on Shishya. Reasons:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
            <li>JoSAA / MCC publish authoritative data in real-time — caching it on a third-party site is value-light + creates staleness risk.</li>
            <li>Single-year cutoffs are misleading; we'd need to build trend visualisations + category filters to publish responsibly.</li>
            <li>Premium players (e.g., Careers360) have this; the real gap is in honest framing + decision-help, which is what we do here.</li>
          </ul>
          <p className="mt-3 text-xs">
            <strong>Roadmap:</strong> A cutoff explorer tool with 5-year trend
            charts per (college × branch × category × gender), driven from
            JoSAA + MCC scraped + maintained yearly. Shipping in Phase 6 of the
            colleges roadmap.
          </p>
        </div>

        {/* Related */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link href="/colleges/placements" className="rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400">
            <p className="text-sm font-semibold text-ink-900">Reading placement data honestly →</p>
            <p className="mt-1 text-xs text-ink-600">Median vs highest CTC, opt-out math, foreign-offer skew.</p>
          </Link>
          <Link href="/insights/nirf-rank-vs-employment-outcomes" className="rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400">
            <p className="text-sm font-semibold text-ink-900">NIRF rank vs employment outcomes →</p>
            <p className="mt-1 text-xs text-ink-600">Why NIRF rank is a tier signal, not a fine-grained order.</p>
          </Link>
        </div>
      </section>
    </main>
  );
}
