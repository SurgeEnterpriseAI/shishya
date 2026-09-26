// /colleges — Colleges section landing.
//
// Phase 2 first cut: NIRF-ranked colleges hardcoded (COLLEGES), filterable
// by stream + state + type, every entry links to a per-college page at
// /colleges/[slug]. No invented rankings — every rank cites NIRF with the
// official source URL.
//
// 26 Sep 2026 (every-education-search wave):
//   • STATIC. The page read searchParams, which made the route dynamic, and
//     with nothing else async the shell flushed before the metadata resolved:
//     for Googlebot (left streaming in next.config.ts) the <title>, meta
//     description and rel=canonical landed inside <body>, where Google does
//     not honour a canonical. The filters now run in the browser
//     (CollegeFinderFromQuery, useSearchParams under <Suspense>); the
//     server-rendered fallback is the full list, so crawlers and a first
//     paint see every college. Old /colleges?stream=… links keep working.
//   • Title: "Colleges in India — NIRF {year} ranked colleges by stream and
//     state" (no "Graduation": that section is only being built). The year
//     is NIRF_SOURCE_YEAR, the count COLLEGES.length.
//   • Own openGraph; /colleges/context.md declared as the markdown twin.
//   • "6.5M students" (unsourced) and "every Indian student can apply"
//     removed; the exam cross-link went to /exams (a 308 to the home page) —
//     it now links the sections through SectionCrossLinks.

import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { SectionCrossLinks } from "@/components/SectionCrossLinks";
// 26 Sep 2026 (repair): the schemes, never the one outside aggregator
// (Buddy4Study) the raw catalogue holds — src/lib/scholarship-schemes.ts.
import { SCHOLARSHIP_SCHEMES } from "@/lib/scholarship-schemes";
import { COLLEGES, NIRF_SOURCE_YEAR, NIRF_SOURCE_URL } from "@/lib/colleges-data";
import { CollegeFinder, filterColleges } from "./CollegeFinder";
import { CollegeFinderFromQuery } from "./CollegeFinderFromQuery";

export const revalidate = 86_400; // 24h

const TITLE = `Colleges in India — NIRF ${NIRF_SOURCE_YEAR} ranked colleges by stream and state`;
const DESCRIPTION = `${COLLEGES.length} colleges from the NIRF ${NIRF_SOURCE_YEAR} rankings by stream, state and type — engineering, medical, management, law and more. Every rank cites NIRF; official sites linked.`;
const PAGE_URL = "https://shishya.in/colleges";

export const metadata: Metadata = {
  title: `${TITLE} | Shishya`,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL, types: { "text/markdown": `${PAGE_URL}/context.md` } },
  keywords: [
    `NIRF top colleges ${NIRF_SOURCE_YEAR}`,
    "top engineering colleges india",
    "top medical colleges india",
    "top management colleges india",
    "top law colleges india",
    "IIT IIM AIIMS NLU rankings",
    "college search india",
    "universities in india",
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PAGE_URL,
    siteName: "Shishya",
    locale: "en_IN",
    type: "website",
  },
};

export default function CollegesLanding() {
  const all = filterColleges({});
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `NIRF ${NIRF_SOURCE_YEAR} ranked Indian colleges`,
    numberOfItems: all.length,
    itemListElement: all.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://shishya.in/colleges/${c.slug}`,
      name: c.shortName,
    })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: "Colleges", item: PAGE_URL },
    ],
  };

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> · Colleges
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">
          Find the right college, on numbers you can check
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-ink-700">
          NIRF rankings, real fee structures, honest cutoffs, scholarships you
          may have missed.{" "}
          {COLLEGES.length} colleges curated from the official NIRF{" "}
          {NIRF_SOURCE_YEAR} rankings — engineering, medical, management, law,
          universities and pharmacy. Every rank cites NIRF directly. No invented
          rankings, no paid placements.
        </p>
        <p className="mt-2 text-[11px] text-ink-500">
          Source: <a href={NIRF_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="text-saffron-700 underline">National Institutional Ranking Framework</a>, Ministry of Education, Government of India ({NIRF_SOURCE_YEAR}).
        </p>

        {/* Decision-support entries */}
        <ul className="mt-6 grid gap-3 sm:grid-cols-3">
          <li>
            <Link
              href="/colleges/cutoffs"
              className="block h-full rounded-lg border border-saffron-200 bg-saffron-50/30 p-4 transition-colors hover:border-saffron-400"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-800">Cutoffs</p>
              <p className="mt-1 text-sm font-semibold text-ink-900">Reading cutoffs honestly</p>
              <p className="mt-0.5 text-[11px] text-ink-600">JoSAA/MCC/NLU sources, 5-step method, rank predictor caveats.</p>
            </Link>
          </li>
          <li>
            <Link
              href="/colleges/placements"
              className="block h-full rounded-lg border border-saffron-200 bg-saffron-50/30 p-4 transition-colors hover:border-saffron-400"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-800">Placements</p>
              <p className="mt-1 text-sm font-semibold text-ink-900">Reading placement data honestly</p>
              <p className="mt-0.5 text-[11px] text-ink-600">Median vs Highest CTC, opt-out math, foreign-offer skew.</p>
            </Link>
          </li>
          <li>
            <Link
              href="/colleges/iti-diploma"
              className="block h-full rounded-lg border border-saffron-200 bg-saffron-50/30 p-4 transition-colors hover:border-saffron-400"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-800">ITI · Diploma</p>
              <p className="mt-1 text-sm font-semibold text-ink-900">The parallel education path</p>
              <p className="mt-0.5 text-[11px] text-ink-600">ITI trades + Polytechnic diplomas; often better ROI than a tier-3 BTech.</p>
            </Link>
          </li>
        </ul>

        {/* Filters + list: the unfiltered list server-side, the URL's
            filters applied in the browser (see CollegeFinder.tsx). */}
        <Suspense fallback={<CollegeFinder />}>
          <CollegeFinderFromQuery />
        </Suspense>

        {/* Scholarships — sibling discovery */}
        <div className="mt-12 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5 text-sm text-ink-700">
          <h3 className="text-base font-semibold text-ink-900">
            Funding your education
          </h3>
          <p className="mt-2">
            Shishya lists {SCHOLARSHIP_SCHEMES.length} central government, state and
            private scholarships, with eligibility and the awarding body&apos;s
            official link on every entry. All free to apply.
          </p>
          <Link
            href="/scholarships"
            className="mt-3 inline-flex rounded-md bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-saffron-600"
          >
            Browse scholarships →
          </Link>
        </div>

        {/* Phase-2 status: explain what's coming and what's already live */}
        <div className="mt-6 rounded-lg border border-ink-200 bg-white p-5 text-sm text-ink-700">
          <h3 className="text-base font-semibold text-ink-900">
            What&apos;s still coming to this section
          </h3>
          <p className="mt-2">
            Cutoff trends per college × exam × category × branch, fee
            structures linked to official college fee pages, placement
            statistics from official reports only, and AI counselling
            (&quot;I scored X in JEE Main, what colleges should I
            consider?&quot;) that pulls from cutoff data + your category +
            state preference.
          </p>
        </div>

        <SectionCrossLinks current="/colleges" />
      </section>
    </main>
  );
}
