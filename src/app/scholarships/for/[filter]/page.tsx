// /scholarships/for/{filter} — one crawlable list per student group
// (26 Sep 2026, G4 honest page families).
//
// The six lists and their rules live in src/lib/scholarship-lists.ts
// (girls, sc-st-obc, minority, class-9-10, class-11-12, phd); any other
// segment is a 404 (dynamicParams = false). Every number on the page is the
// list's own length; the last-date column shows a 2026-27 date only when it
// was read on the official portal (with its tier), else the usual window.
// Indexable only with at least SCHOLARSHIP_LIST_MIN schemes and less than
// LIST_OVERLAP_MAX overlap with the whole catalogue — below that the page is
// noindex,follow and still useful to a visitor. A discontinued scheme is in
// no list. The one FAQ item is visible and is the only FAQPage entry.
//
// 27 Sep 2026 (repair): a row marked unlisted (not a scholarship, or status
// in doubt) is in no list, and a list is indexable only when every row was
// re-checked on the awarding body's own page (Scholarship.reviewed) — none
// is yet, so every list is noindex,follow until the catalogue audit. The
// page says how many rows were re-checked, and promises "apply links", not
// "official links" (some apply hosts are not the awarding body's own).
//
// Static segment "for" beside [id]: no scholarship id is "for" (pinned in
// tests/unit/scholarship-lists.test.ts). Hourly ISR: the date column moves
// with the IST day.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { clipDescription } from "@/lib/section-seo";
import {
  SCHOLARSHIP_FILTERS,
  filterFaq,
  filterLeadLine,
  findScholarshipFilter,
  isFilterListIndexable,
  istToday,
  listReviewLine,
  schemesForFilter,
} from "@/lib/scholarship-lists";
import { ScholarshipTable } from "../../ScholarshipTable";

export const revalidate = 3600;
export const dynamicParams = false;

const SITE = "https://shishya.in";

interface PageParams { filter: string }

export function generateStaticParams() {
  return SCHOLARSHIP_FILTERS.map((f) => ({ filter: f.slug }));
}

function load(slug: string) {
  const filter = findScholarshipFilter(slug);
  if (!filter) return null;
  const today = istToday();
  const list = schemesForFilter(filter, today);
  return { filter, today, list, indexable: isFilterListIndexable(list) };
}

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const r = load((await params).filter);
  if (!r) return { title: "Not found — Shishya", robots: { index: false, follow: true } };
  const { filter, list, today, indexable } = r;
  const url = `${SITE}/scholarships/for/${filter.slug}`;
  const title = `${list.length} Scholarships for ${filter.audienceTitle} in India — Amounts & Apply Links`;
  const description = clipDescription(`${filterLeadLine(filter, list, today)} Each row links the scheme's apply page. Free to use.`);
  return {
    title: `${title} | Shishya`,
    description,
    alternates: { canonical: url },
    robots: indexable ? undefined : { index: false, follow: true },
    openGraph: { title, description, url, siteName: "Shishya", locale: "en_IN", type: "website" },
  };
}

export default async function ScholarshipListPage({ params }: { params: Promise<PageParams> }) {
  const r = load((await params).filter);
  if (!r) notFound();
  const { filter, list, today } = r;
  const url = `${SITE}/scholarships/for/${filter.slug}`;
  const lead = filterLeadLine(filter, list, today);
  const faq = filterFaq(filter, list, today);
  const reviewLine = listReviewLine(list);
  const others = SCHOLARSHIP_FILTERS.filter((f) => f.slug !== filter.slug);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `Scholarships for ${filter.audience} in India`,
      description: lead,
      url,
      inLanguage: "en-IN",
      isAccessibleForFree: true,
      isPartOf: { "@type": "WebSite", name: "Shishya", url: SITE },
      mainEntity: { "@id": `${url}#list` },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": `${url}#list`,
      name: `Scholarships for ${filter.audience}`,
      numberOfItems: list.length,
      itemListElement: list.map((s, i) => ({ "@type": "ListItem", position: i + 1, name: s.name, url: `${SITE}/scholarships/${s.id}` })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [{ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } }],
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: "Scholarships", item: `${SITE}/scholarships` },
        { "@type": "ListItem", position: 3, name: `For ${filter.audience}`, item: url },
      ],
    },
  ];
  const ld = (d: object) => JSON.stringify(d).replace(/</g, "\\u003c");

  return (
    <main className="min-h-screen bg-ink-50/40">
      {jsonLd.map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(d) }} />
      ))}
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/scholarships" className="hover:text-ink-800">Scholarships</Link> · For {filter.audience}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">Scholarships for {filter.audience} in India</h1>
        <p className="mt-3 max-w-3xl text-sm text-ink-700">{lead}</p>
        <p className="mt-2 max-w-3xl text-xs text-ink-500">
          Who is listed: {filter.rule} Details come from Shishya&apos;s scholarship catalogue; a date marked official was read
          on the scheme&apos;s own portal on the day shown. Rules and amounts change — confirm on the official website before you apply.
          Shishya does not collect applications or charge anything.
        </p>
        {reviewLine && <p className="mt-2 max-w-3xl text-xs font-medium text-ink-600">{reviewLine}</p>}

        {list.length > 0 ? (
          <ScholarshipTable rows={list} today={today} />
        ) : (
          <p className="mt-8 rounded-md border border-dashed border-ink-300 bg-white px-4 py-8 text-center text-sm text-ink-600">
            No open scheme in the catalogue matches this list today.
          </p>
        )}

        <section className="mt-10 rounded-lg border border-ink-200 bg-white p-5" aria-labelledby="list-faq">
          <h2 id="list-faq" className="text-base font-semibold text-ink-900">Question</h2>
          <dl className="mt-3 text-sm">
            <dt className="font-semibold text-ink-900">{faq.q}</dt>
            <dd className="mt-1 text-ink-700">{faq.a}</dd>
          </dl>
        </section>

        <nav aria-label="More scholarship lists" className="mt-6 rounded-lg border border-ink-200 bg-white p-5">
          <h2 className="text-base font-semibold text-ink-900">More scholarship lists</h2>
          <ul className="mt-3 flex flex-wrap gap-2 text-xs">
            {others.map((f) => (
              <li key={f.slug}>
                <Link href={`/scholarships/for/${f.slug}`} className="inline-block rounded-md border border-ink-200 bg-white px-3 py-1.5 text-ink-700 hover:border-saffron-400">
                  {f.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/scholarships/closing-soon" className="inline-block rounded-md border border-ink-200 bg-white px-3 py-1.5 text-ink-700 hover:border-saffron-400">
                Closing in the next 30 days
              </Link>
            </li>
            <li>
              <Link href="/scholarships/match" className="inline-block rounded-md border border-ink-200 bg-white px-3 py-1.5 text-ink-700 hover:border-saffron-400">
                Match wizard (five questions)
              </Link>
            </li>
            <li>
              <Link href="/scholarships" className="inline-block rounded-md border border-ink-200 bg-white px-3 py-1.5 text-ink-700 hover:border-saffron-400">
                All scholarships
              </Link>
            </li>
          </ul>
        </nav>
      </section>
    </main>
  );
}
