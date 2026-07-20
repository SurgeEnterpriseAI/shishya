// /insights — public-good editorial + future anonymised platform data.
//
// Phase 5 launch: 5 hand-authored grounded essays sourced against
// official data. As Shishya's user base grows, anonymised platform
// aggregates ship as a separate article type below.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { JsonLd, collectionPageLd, breadcrumbLd } from "@/components/JsonLd";
import { INSIGHTS_ARTICLES, allTags } from "@/data/insights-articles";

export const metadata: Metadata = {
  title: "Insights — Honest Essays on Indian Education Decisions | Shishya",
  description:
    "Public-good editorial on Indian education: JEE vs NEET by the numbers, NIRF rank vs employment, scholarship discovery gap, study abroad shifts, tier-3 college outcomes. Hand-authored, sourced.",
  alternates: { canonical: "https://shishya.in/insights" },
  keywords: [
    "Indian education insights",
    "JEE NEET comparison",
    "NIRF rank meaning",
    "study abroad India 2024",
    "scholarship India guide",
    "education research India",
  ],
  openGraph: {
    title: "Insights on Shishya",
    description: "Public-good editorial on Indian education. Hand-authored, sourced, free.",
    url: "https://shishya.in/insights",
    siteName: "Shishya",
    type: "website",
  },
};

export const revalidate = 86_400;

export default function InsightsLanding() {
  const tags = allTags();
  return (
    <main className="min-h-screen bg-saffron-50/30">
      <JsonLd
        data={[
          collectionPageLd({
            name: "Insights — Honest Essays on Indian Education Decisions",
            description:
              "Public-good editorial on Indian education: JEE vs NEET by the numbers, NIRF rank vs employment, scholarship discovery gap, study abroad shifts, tier-3 college outcomes. Hand-authored, sourced.",
            path: "/insights",
          }),
          breadcrumbLd([["Insights", "/insights"]]),
        ]}
      />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> · Insights
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ink-900 sm:text-4xl">
          Real data on Indian education decisions
        </h1>
        <p className="mt-2 max-w-3xl text-base text-ink-700">
          What students actually do, where they actually go, what actually
          works. Honest analysis, no spin. Every article cites official sources
          at the bottom — no hot takes, no marketing tone. Anonymised platform
          aggregates will ship here as Shishya&apos;s user base grows large
          enough to publish them responsibly.
        </p>

        {/* Tag chips */}
        {tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
              Topics:
            </span>
            {tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-ink-200 bg-white px-2 py-0.5 text-[10px] font-medium text-ink-700"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Article list */}
        <ul className="mt-8 space-y-4">
          {INSIGHTS_ARTICLES.map((a) => (
            <li key={a.slug} className="rounded-lg border border-ink-200 bg-white p-5">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="rounded bg-saffron-100 px-2 py-0.5 text-[10px] font-medium text-saffron-800">
                  {a.tags[0]}
                </span>
                <span className="text-[11px] text-ink-500">
                  {a.publishedOn} · {a.readMins} min read · {a.author}
                </span>
              </div>
              <h2 className="mt-2 text-lg font-semibold text-ink-900">
                <Link href={`/insights/${a.slug}`} className="hover:text-saffron-800">
                  {a.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm text-ink-700">{a.dek}</p>
              <Link
                href={`/insights/${a.slug}`}
                className="mt-3 inline-flex text-xs text-saffron-700 underline"
              >
                Read more →
              </Link>
            </li>
          ))}
        </ul>

        {/* Roadmap */}
        <div className="mt-10 rounded-lg border border-ink-200 bg-white p-5 text-xs text-ink-700">
          <p className="font-semibold text-ink-800">What's coming</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Annual "State of Indian Education Decisions" report — published every March, free, with downloadable aggregate data</li>
            <li>Topic-wise weakness aggregates across exam categories (anonymised attempt data, only when sample size is statistically responsible)</li>
            <li>Year-on-year admission cycle deep-dives</li>
            <li>Scholarship discovery + utilisation analytics</li>
          </ul>
        </div>

        {/* Editorial policy */}
        <div className="mt-6 rounded-lg border border-saffron-200 bg-saffron-50/30 p-5 text-xs text-ink-700">
          <p className="font-semibold text-ink-800">Editorial policy</p>
          <p className="mt-2">
            Every article cites the sources it draws on. We don't invent stats.
            We don't push affiliate products. We don't accept paid placements.
            If you spot something factually wrong, the verification badge on
            each claim lets you flag it — same trust mechanism we use across
            the platform.
          </p>
        </div>
      </section>
    </main>
  );
}
