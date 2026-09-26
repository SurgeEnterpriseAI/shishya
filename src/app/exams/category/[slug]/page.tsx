// /exams/category/{slug} — one comparison page per exam category
// (26 Sep 2026, G4 honest page families).
//
// Categories and their membership rules: src/lib/exam-categories.ts (tags
// from src/lib/exam-tags.ts, state PSCs by src/lib/state-exams.ts
// examTypeOf). Rows: one cached read of every real exam
// (src/lib/exam-list-rows.ts). The lead, the table and the one visible FAQ
// item are computed from those rows; dates carry their tier (an estimate is
// called one); eligibility is the hand-checked deep content where it exists,
// else the AI-drafted summary labelled "indicative" with its source.
// A configured slug with fewer than EXAM_CATEGORY_MIN exams is a 404, any
// other slug too (dynamicParams = false). Static segment "category" beside
// [code]: exam codes are upper-case and src/lib/url-normalize.ts treats
// "category" as a static sibling. Hourly ISR; a failed read throws, so ISR
// keeps the last good page.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { ExamCompareTable } from "@/components/ExamCompareTable";
import { clipDescription } from "@/lib/section-seo";
import { EXAM_CATEGORIES, categoryFaq, categoryLead, examsInCategory, findExamCategory, isCategoryLive } from "@/lib/exam-categories";
import { getExamListRows } from "@/lib/exam-list-rows";

export const revalidate = 3600;
export const dynamicParams = false;

const SITE = "https://shishya.in";

interface PageParams { slug: string }

export function generateStaticParams() {
  return EXAM_CATEGORIES.map((c) => ({ slug: c.slug }));
}

async function load(slug: string) {
  const cat = findExamCategory(slug);
  if (!cat) return null;
  const rows = await getExamListRows();
  const list = examsInCategory(cat, rows);
  if (!isCategoryLive(list)) return null;
  // The other live hubs, for the link row (the same rows, so never a 404).
  const others = EXAM_CATEGORIES.filter((c) => c.slug !== cat.slug && isCategoryLive(examsInCategory(c, rows)));
  return { cat, list, others };
}

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const r = await load((await params).slug);
  if (!r) return { title: "Not found — Shishya", robots: { index: false, follow: true } };
  const { cat, list } = r;
  const url = `${SITE}/exams/category/${cat.slug}`;
  const title = `${cat.heading}: ${list.length} Exams Compared`;
  const description = clipDescription(`${categoryLead(cat, list)} One table: conducting body, next exam day with its source tier, age limit, qualification and official site.`);
  return {
    title: `${title} | Shishya`,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "Shishya", locale: "en_IN", type: "website" },
  };
}

export default async function ExamCategoryPage({ params }: { params: Promise<PageParams> }) {
  const r = await load((await params).slug);
  if (!r) notFound();
  const { cat, list, others } = r;
  const url = `${SITE}/exams/category/${cat.slug}`;
  const lead = categoryLead(cat, list);
  const faq = categoryFaq(cat, list);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: cat.heading,
      description: lead,
      url,
      inLanguage: "en-IN",
      isAccessibleForFree: true,
      isPartOf: { "@type": "WebSite", name: "Shishya", url: SITE },
      mainEntity: { "@id": `${url}#exams` },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": `${url}#exams`,
      name: cat.heading,
      numberOfItems: list.length,
      itemListElement: list.map((e, i) => ({ "@type": "ListItem", position: i + 1, name: e.shortName, url: `${SITE}/exams/${e.code}` })),
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
        { "@type": "ListItem", position: 2, name: "All exams", item: `${SITE}/exams/browse` },
        { "@type": "ListItem", position: 3, name: cat.heading, item: url },
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
          <Link href="/exams/browse" className="hover:text-ink-800">All exams</Link> · {cat.heading}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">{cat.heading}</h1>
        <p className="mt-3 max-w-3xl text-sm text-ink-700">{lead}</p>
        <p className="mt-2 max-w-3xl text-xs text-ink-500">
          Who is listed: {cat.rule} Dates are marked official (the conducting body&apos;s own site), reported (a cited secondary source) or
          expected (an estimate, not announced). Age limit and qualification are marked &quot;checked&quot; where Shishya read them
          against the notification; otherwise they are an indicative summary. Confirm on the official website before applying.
        </p>

        <ExamCompareTable rows={list} />

        <section className="mt-10 rounded-lg border border-ink-200 bg-white p-5" aria-labelledby="cat-faq">
          <h2 id="cat-faq" className="text-base font-semibold text-ink-900">Question</h2>
          <dl className="mt-3 text-sm">
            <dt className="font-semibold text-ink-900">{faq.q}</dt>
            <dd className="mt-1 text-ink-700">{faq.a}</dd>
          </dl>
        </section>

        <nav aria-label="More exam lists" className="mt-6 rounded-lg border border-ink-200 bg-white p-5 text-sm">
          <h2 className="text-base font-semibold text-ink-900">More exam lists</h2>
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/exams/browse" className="font-medium text-saffron-700 hover:underline">All government and entrance exams</Link>
            <Link href="/exams/entrance" className="font-medium text-saffron-700 hover:underline">Entrance exams</Link>
            <Link href="/exams/state" className="font-medium text-saffron-700 hover:underline">Exams by state</Link>
            <Link href="/exams/after/12th" className="font-medium text-saffron-700 hover:underline">Exams after 12th</Link>
            <Link href="/exams/after/graduation" className="font-medium text-saffron-700 hover:underline">Exams after graduation</Link>
            <Link href="/exam-calendar" className="font-medium text-saffron-700 hover:underline">Exam calendar</Link>
          </p>
          {others.length > 0 && (
            <p className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              {others.map((c) => (
                <Link key={c.slug} href={`/exams/category/${c.slug}`} className="font-medium text-saffron-700 hover:underline">
                  {c.heading}
                </Link>
              ))}
            </p>
          )}
        </nav>
      </section>
    </main>
  );
}
