// /exams/after/{10th|12th|diploma-iti|graduation} — the exams whose lowest
// listed qualification is that level (26 Sep 2026, G4 honest page families).
//
// Membership and every sentence: src/lib/exam-qualification.ts (grouped by
// the LOWEST education tag an exam lists; olympiads left out; government
// recruitment / eligibility tests split from entrance / admission tests).
// Rows: src/lib/exam-list-rows.ts. The qualification column quotes each
// exam's rule — the hand-checked deep content where it exists, otherwise the
// AI-drafted summary verbatim, labelled indicative with its source — and an
// exam that lists several levels says so. No vacancies (no source).
// /exams/after/postgraduation is held (404) — see the lib header. Any other
// segment 404s (dynamicParams = false). Indexable with at least
// QUALIFICATION_MIN exams, else noindex,follow. Static segment "after"
// beside [code] (src/lib/url-normalize.ts EXAM_STATIC_SEGMENTS). Hourly ISR.
// 27 Sep 2026 (repair): an exam whose hand-checked and summary rules name
// different levels is on no level page, and teaching exams that also need a
// D.El.Ed. or B.Ed. are counted in the lead, not listed — the page links the
// teaching hub for them while that hub is live (src/lib/exam-qualification.ts).

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { ExamCompareTable } from "@/components/ExamCompareTable";
import { clipDescription } from "@/lib/section-seo";
import { getExamListRows } from "@/lib/exam-list-rows";
import { examsInCategory, findExamCategory, isCategoryLive } from "@/lib/exam-categories";
import {
  PUBLISHED_LEVELS,
  examsAfter,
  findQualificationLevel,
  isLevelIndexable,
  levelCounts,
  qualificationFaq,
  qualificationLead,
  qualificationTitle,
} from "@/lib/exam-qualification";

export const revalidate = 3600;
export const dynamicParams = false;

const SITE = "https://shishya.in";

interface PageParams { level: string }

export function generateStaticParams() {
  return PUBLISHED_LEVELS.map((l) => ({ level: l.slug }));
}

async function load(slug: string) {
  const level = findQualificationLevel(slug);
  if (!level || level.held) return null;
  const rows = await getExamListRows();
  const groups = examsAfter(level, rows);
  const teaching = findExamCategory("teaching");
  const teachingLive = !!teaching && isCategoryLive(examsInCategory(teaching, rows));
  return { level, groups, indexable: isLevelIndexable(level, groups), counts: levelCounts(rows), teachingLive };
}

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const r = await load((await params).level);
  if (!r) return { title: "Not found — Shishya", robots: { index: false, follow: true } };
  const { level, groups, indexable } = r;
  const url = `${SITE}/exams/after/${level.slug}`;
  const title = qualificationTitle(level, groups);
  const description = clipDescription(`${qualificationLead(level, groups)} Next exam day with its source tier, age limit and official site for each.`);
  return {
    title: `${title} | Shishya`,
    description,
    alternates: { canonical: url },
    robots: indexable ? undefined : { index: false, follow: true },
    openGraph: { title, description, url, siteName: "Shishya", locale: "en_IN", type: "website" },
  };
}

export default async function ExamsAfterPage({ params }: { params: Promise<PageParams> }) {
  const r = await load((await params).level);
  if (!r) notFound();
  const { level, groups, counts, teachingLive } = r;
  const url = `${SITE}/exams/after/${level.slug}`;
  const title = qualificationTitle(level, groups);
  const lead = qualificationLead(level, groups);
  const faq = qualificationFaq(level, groups);
  const all = [...groups.government, ...groups.entrance];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `Exams after ${level.after} in India`,
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
      name: `Exams after ${level.after}`,
      numberOfItems: all.length,
      itemListElement: all.map((e, i) => ({ "@type": "ListItem", position: i + 1, name: e.shortName, url: `${SITE}/exams/${e.code}` })),
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
        { "@type": "ListItem", position: 3, name: `Exams after ${level.after}`, item: url },
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
          <Link href="/exams/browse" className="hover:text-ink-800">All exams</Link> · Exams after {level.after}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm text-ink-700">{lead}</p>
        <p className="mt-2 max-w-3xl text-xs text-ink-500">
          Most qualification and age summaries here were drafted with AI and are indicative; rows marked &quot;checked&quot; were read
          against the notification. Dates are marked official, reported or expected (an estimate). Confirm
          on the official website before applying.
        </p>

        {groups.government.length > 0 && (
          <section className="mt-8" aria-labelledby="after-gov">
            <h2 id="after-gov" className="text-xl font-bold text-ink-900">
              Government recruitment and eligibility tests ({groups.government.length})
            </h2>
            <ExamCompareTable rows={groups.government} showLevels />
          </section>
        )}
        {groups.entrance.length > 0 && (
          <section className="mt-10" aria-labelledby="after-ent">
            <h2 id="after-ent" className="text-xl font-bold text-ink-900">
              Entrance and admission tests ({groups.entrance.length})
            </h2>
            <ExamCompareTable rows={groups.entrance} showLevels />
          </section>
        )}
        {all.length === 0 && (
          <p className="mt-8 rounded-md border border-dashed border-ink-300 bg-white px-4 py-8 text-center text-sm text-ink-600">
            No exam on Shishya lists {level.qualification} as its lowest qualification yet.
          </p>
        )}

        <section className="mt-10 rounded-lg border border-ink-200 bg-white p-5" aria-labelledby="after-faq">
          <h2 id="after-faq" className="text-base font-semibold text-ink-900">Question</h2>
          <dl className="mt-3 text-sm">
            <dt className="font-semibold text-ink-900">{faq.q}</dt>
            <dd className="mt-1 text-ink-700">{faq.a}</dd>
          </dl>
        </section>

        <nav aria-label="Exams by qualification" className="mt-6 rounded-lg border border-ink-200 bg-white p-5 text-sm">
          <h2 className="text-base font-semibold text-ink-900">By qualification</h2>
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {counts
              .filter((c) => c.level.slug !== level.slug && c.total > 0)
              .map((c) => (
                <Link key={c.level.slug} href={`/exams/after/${c.level.slug}`} className="font-medium text-saffron-700 hover:underline">
                  After {c.level.after} ({c.total})
                </Link>
              ))}
            {teachingLive && (groups.teacherTraining?.length ?? 0) > 0 && (
              <Link href="/exams/category/teaching" className="font-medium text-saffron-700 hover:underline">
                Teaching exams (need a D.El.Ed. or B.Ed.)
              </Link>
            )}
            <Link href="/find-your-exam" className="font-medium text-saffron-700 hover:underline">
              Check your own eligibility
            </Link>
            <Link href="/exams/browse" className="font-medium text-saffron-700 hover:underline">
              All exams
            </Link>
          </p>
        </nav>
      </section>
    </main>
  );
}
