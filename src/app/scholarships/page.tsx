// /scholarships — public catalogue of every scholarship Shishya knows
// about. Static curated data (src/data/scholarships.ts), filtered
// entirely client-side so the page is cacheable + fast.
//
// Future: gate "Match me" personalised view behind sign-in once we
// collect home-state, category, income-band, etc. on a profile page.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { JsonLd, collectionPageLd, breadcrumbLd } from "@/components/JsonLd";
import { SectionCrossLinks } from "@/components/SectionCrossLinks";
// 26 Sep 2026 (repair): the schemes, never the one outside aggregator
// (Buddy4Study) the raw catalogue holds — src/lib/scholarship-schemes.ts.
import { SCHOLARSHIP_SCHEMES } from "@/lib/scholarship-schemes";
// 26 Sep 2026 (G4): the ready lists and the closing-soon list, computed.
import { SCHOLARSHIP_FILTERS, closingSoon, formatIsoDay, istToday, schemesForFilter } from "@/lib/scholarship-lists";
import { ScholarshipBrowser, type ReadyListLink } from "./ScholarshipBrowser";

// 26 Sep 2026: the count is SCHOLARSHIP_SCHEMES.length, never typed. "every Indian
// student can apply for" (most schemes are for one state, level or
// category) and "Free forever" (a promise) are gone; the page is free to use
// and every scheme is free to apply for. Own openGraph (it inherited none),
// and the section's context.md is declared as the markdown alternate.
const TITLE = `Scholarships in India — ${SCHOLARSHIP_SCHEMES.length} central, state and private schemes`;
const DESCRIPTION = `${SCHOLARSHIP_SCHEMES.length} central, state and private scholarships for students in India, by state, category, level and exam — each with its official apply link. Free to use.`;
const PAGE_URL = "https://shishya.in/scholarships";

export const metadata: Metadata = {
  title: `${TITLE} | Shishya`,
  description: DESCRIPTION,
  // Self canonical (16 Sep 2026): one of 7 sitemap landings the crawl found without one.
  alternates: { canonical: PAGE_URL, types: { "text/markdown": `${PAGE_URL}/context.md` } },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: "Shishya", locale: "en_IN", type: "website" },
};

export const revalidate = 3600; // refresh static cache every hour

export default function ScholarshipsPage() {
  // 26 Sep 2026 (G4): plain crawlable links to the list pages, with their
  // computed counts (the ?query filter URLs stay robots-blocked).
  const today = istToday();
  const soon = closingSoon(today);
  const lists: ReadyListLink[] = [
    ...SCHOLARSHIP_FILTERS.map((f) => ({ href: `/scholarships/for/${f.slug}`, label: f.label, count: schemesForFilter(f, today).length })),
    { href: "/scholarships/closing-soon", label: "Closing in 30 days", count: soon.length },
  ];
  return (
    <main className="min-h-screen bg-ink-50/40">
      <JsonLd
        data={[
          collectionPageLd({
            name: TITLE,
            description: DESCRIPTION,
            path: "/scholarships",
          }),
          breadcrumbLd([["Scholarships", "/scholarships"]]),
        ]}
      />
      <Header />
      <section className="container-prose py-10">
        <h1 className="text-3xl font-bold text-ink-900 sm:text-4xl">Scholarships for Indian students</h1>
        <p className="mt-2 max-w-2xl text-base text-ink-700">
          Curated list of central government, state government and private foundation scholarships
          you can apply for — covering school, diploma, UG, PG, research. Filter by your state,
          category, level, or target exam. <strong className="text-ink-900">All free to apply.</strong>
        </p>
        <p className="mt-2 max-w-2xl text-sm text-ink-500">
          We link to the awarding body&apos;s official portal. Shishya does not collect any payment
          or charge a finder&apos;s fee — the link is direct.
        </p>

        <div className="mt-6 rounded-lg border border-saffron-300 bg-saffron-50/50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-2xl">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-800">
                Don&apos;t know where to start?
              </p>
              <h2 className="mt-1 text-lg font-semibold text-ink-900">
                Match Wizard — 5 questions, ranked results
              </h2>
              <p className="mt-1 text-xs text-ink-700">
                Tell us your state, level, category, gender, income band, and
                we&apos;ll surface only the schemes you actually qualify for.
                Nothing is stored — answers stay in your browser.
              </p>
            </div>
            <Link
              href="/scholarships/match"
              className="rounded-md bg-saffron-500 px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-600"
            >
              Open Match Wizard →
            </Link>
          </div>
        </div>

        {soon.length > 0 && (
          <p className="mt-6 max-w-3xl rounded-md border border-rose-200 bg-rose-50/60 px-3 py-2 text-sm text-ink-800">
            <Link href="/scholarships/closing-soon" className="font-semibold text-rose-800 hover:underline">
              {soon.length} {soon.length === 1 ? "scholarship closes" : "scholarships close"} in the next 30 days
            </Link>{" "}
            — the soonest: {soon[0].name}, {formatIsoDay(soon[0].cycle!.closesOn!)} ({soon[0].cycle!.tier}).
          </p>
        )}

        <ScholarshipBrowser scholarships={SCHOLARSHIP_SCHEMES} lists={lists} />

        <SectionCrossLinks
          current="/scholarships"
          extra={[
            { label: "Scholarship match wizard", href: "/scholarships/match", blurb: "Five questions; the schemes whose rules fit your answers." },
            { label: "Class 11 streams", href: "/schooling/streams", blurb: "What Science, Commerce and Humanities each open up." },
          ]}
        />
      </section>
    </main>
  );
}
