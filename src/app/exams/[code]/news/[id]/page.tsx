// /exams/:code/news/:id — individual news-item permalink.
//
// Why this exists: every news + notification item we generate via
// the refresh-exam-data cron used to be a single line of body text
// trapped inside the per-exam page's news section. When the cron
// archived it on the next tick, even that single line vanished.
//
// Now each item gets its own indexable URL, with:
//   - <NewsArticle> JSON-LD for Google rich results
//   - canonical URL so duplicates merge cleanly
//   - per-category theme wash so each item still feels like part of
//     its exam's "room"
//
// Each cron tick produces ~5-10 news items per active exam → over
// time the platform accumulates thousands of long-tail-keyword
// pages without manual authoring. Sitemap is updated by the same
// cron via its inclusion in src/app/sitemap.ts.
//
// 404 path: when an item id is unknown OR (archivedAt is set AND
// the row is older than a configurable retention window), we 404.
// Today retention is "forever" — archive grows monotonically.
//
// Funnel card (16 Sep 2026): the "Expected cutoffs" and "Syllabus" links
// appear only when that page renders (src/lib/exam-page-gates.ts, cached
// 10 min — one read shared by every permalink). The 345 sitemap permalinks
// of the 12 exams with no syllabus, and every MP_RAEO / KA_KSRP permalink,
// linked a 404. A failed gate read keeps the links, as before. The link
// label and the meta description say "study notes" only for an exam with
// notes (src/lib/page-gates-notes.ts) — 127 of the 168 syllabus exams have
// none, and the syllabus page says so. A failed notes read claims none.
//
// 26 Sep 2026 (G1 index hygiene, src/lib/news-index-policy.ts):
//   • robots come from newsRobots(): while the founder flag
//     NEWS_GOOGLE_NOINDEX is on, Google alone gets noindex,follow (Bing,
//     ChatGPT search and Perplexity keep index,follow) — founder approval
//     before deploy;
//   • a copy of the same headline (same exam, same normalised title, within
//     60 days) canonicalises to one row of its group — the live row with an
//     official citation, else the earliest live row, else the earliest row —
//     read once per exam and cached (loadNewsCanonicals);
//   • structured data is Article, not NewsArticle (the page has no image, so
//     Google's NewsArticle feature never applied), with author and publisher
//     the site's one Organization node, and dateModified = publishedAt:
//     archiving is a status change, not an edit — the old archivedAt
//     dateModified told crawlers 5,462 unchanged stories had been edited.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { getExamTheme } from "@/lib/exam-theme";
import { getT } from "@/lib/i18n-server";
import { SUPPRESSED_SOURCE } from "@/lib/exam-timeline";
import { StateExamsLink } from "@/components/StateExamsLink";
import { examPageGates } from "@/lib/exam-page-gates";
import { examHasNotes } from "@/lib/page-gates-notes";
import { newsPermalinkCopy } from "@/lib/page-gates-copy";
import { SHISHYA_ORG_REF } from "@/components/JsonLd";
import { newsCanonicalMap, newsRobots } from "@/lib/news-index-policy";

interface RouteParams {
  code: string;
  id: string;
}

/** Duplicate-title canonicals of one exam's permalinks: { rowId: canonicalRowId }
 *  for the copies only (src/lib/news-index-policy.ts newsCanonicalMap). One
 *  read per exam, cached an hour — the refresh cron writes a few rows a day. */
const loadNewsCanonicals = unstable_cache(
  async (examId: string): Promise<Record<string, string>> => {
    const [rows, elig] = await Promise.all([
      prisma.examNewsItem.findMany({
        where: { examId, OR: [{ source: null }, { source: { not: SUPPRESSED_SOURCE } }] },
        select: { id: true, title: true, publishedAt: true, archivedAt: true, url: true },
      }),
      prisma.examEligibility.findUnique({ where: { examId }, select: { officialUrl: true } }),
    ]);
    return Object.fromEntries(newsCanonicalMap(rows, elig?.officialUrl ?? null));
  },
  ["news-canonicals-v1"],
  { revalidate: 3600, tags: ["exam-shared"] },
);

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { code, id } = await params;
  const row = await prisma.examNewsItem.findUnique({
    where: { id },
    include: {
      exam: { select: { code: true, name: true, shortName: true } },
    },
  });
  if (!row || row.exam.code !== code || row.source === SUPPRESSED_SOURCE) {
    return { title: "Notification not found — Shishya" };
  }

  // SEO-tuned title: news headline + exam shortname + Shishya. The
  // description is the searcher's snippet — trim the body at a word
  // boundary (a mid-word cut reads broken in the SERP) and end with
  // the one differentiator none of the ranking job-alert sites have:
  // everything here is free.
  const title = `${row.title} — ${row.exam.shortName} | Shishya`;
  const bodyLead = row.body.slice(0, 140).replace(/\s+/g, " ").replace(/\s+\S*$/, "").trim();
  const [hasNotes, canonicals] = await Promise.all([
    examHasNotes(row.exam.code),
    // A failed read keeps the page self-canonical (its old behaviour).
    loadNewsCanonicals(row.examId).catch(() => ({}) as Record<string, string>),
  ]);
  const { descriptionTail } = newsPermalinkCopy(row.exam.shortName, hasNotes);
  const description = `${bodyLead}… ${descriptionTail}`;
  const canonical = `https://shishya.in/exams/${code}/news/${canonicals[id] ?? id}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: row.title,
      description,
      url: canonical,
      siteName: "Shishya",
      locale: "en_IN",
      type: "article",
      publishedTime: row.publishedAt.toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      title: row.title,
      description,
    },
    // Archived rows stay public too — a long-tail surface ("[exam]
    // notification 2024") for Bing and ChatGPT. Google: see newsRobots()
    // (26 Sep 2026, founder flag NEWS_GOOGLE_NOINDEX).
    robots: newsRobots(),
  };
}

export default async function NewsPermalinkPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { code, id } = await params;

  const row = await prisma.examNewsItem.findUnique({
    where: { id },
    include: {
      exam: {
        select: {
          id: true,
          code: true,
          name: true,
          shortName: true,
          category: true,
          state: true,
        },
      },
    },
  });
  // A story a human suppressed as wrong is gone, not archived history.
  if (!row || row.exam.code !== code || row.source === SUPPRESSED_SOURCE) notFound();
  const [{ t, locale }, gates, hasNotes] = await Promise.all([
    getT(),
    examPageGates(row.exam.code),
    examHasNotes(row.exam.code),
  ]);

  const theme = getExamTheme(row.exam.category);
  const isArchived = row.archivedAt !== null;

  // Article JSON-LD (26 Sep 2026: was NewsArticle — without an image
  // Google's NewsArticle feature never applied). dateModified = publishedAt:
  // archiving is a status, not an edit. author + publisher = the one
  // Organization node the root layout declares (SHISHYA_ORG_REF).
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: row.title,
    description: row.body.slice(0, 200),
    datePublished: row.publishedAt.toISOString(),
    dateModified: row.publishedAt.toISOString(),
    inLanguage: "en-IN",
    isAccessibleForFree: true,
    author: SHISHYA_ORG_REF,
    publisher: SHISHYA_ORG_REF,
    about: {
      "@type": "Course",
      name: row.exam.name,
      url: `https://shishya.in/exams/${row.exam.code}`,
    },
    mainEntityOfPage: `https://shishya.in/exams/${code}/news/${id}`,
  };

  // BreadcrumbList for sitelinks-style hierarchy in Google SERP.
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      // 26 Sep 2026: /exams 308-redirects to the home page; the exam index is /exams/browse.
      { "@type": "ListItem", position: 2, name: "All exams", item: "https://shishya.in/exams/browse" },
      {
        "@type": "ListItem",
        position: 3,
        name: row.exam.shortName,
        item: `https://shishya.in/exams/${row.exam.code}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: row.title,
        item: `https://shishya.in/exams/${row.exam.code}/news/${id}`,
      },
    ],
  };

  return (
    <main className={`min-h-screen ${theme.pageBg}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className={`h-1.5 w-full ${theme.ribbon}`} aria-hidden />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href={`/exams/${row.exam.code}`} className="hover:text-ink-800">
            ← {row.exam.shortName}
          </Link>
          {isArchived && (
            <>
              {" "}·{" "}
              <Link
                href={`/exams/${row.exam.code}/archive`}
                className="hover:text-ink-800"
              >
                Archive
              </Link>
            </>
          )}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${theme.badge}`}
          >
            <span aria-hidden>{theme.icon}</span>
            {theme.label}
          </span>
          {isArchived && (
            <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-[11px] font-semibold text-ink-700">
              Archived
            </span>
          )}
        </div>

        <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-ink-900 sm:text-3xl">
          {row.title}
        </h1>
        <StateExamsLink state={row.exam.state} label={t("exam.state.more")} locale={locale} />

        <p className="mt-2 text-xs text-ink-500">
          Published{" "}
          {row.publishedAt.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          {isArchived && row.archivedAt && (
            <>
              {" "}· archived{" "}
              {row.archivedAt.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </>
          )}
        </p>

        <article className="prose prose-ink mt-6 max-w-none rounded-lg border border-ink-200 bg-white p-6 shadow-sm">
          {/* News body is short-form (1-3 paragraphs from cron output).
              Split paragraph on double-newline; otherwise render as-is. */}
          {row.body.split(/\n\n+/).map((para, i) => (
            <p key={i} className="text-sm leading-relaxed text-ink-800">
              {para}
            </p>
          ))}

          {/* Source line. Real URLs link out; internal provenance tags
              (e.g. "ai-generated:claude") must NEVER leak raw to students —
              they read as untrustworthy debug output. Instead: an honest,
              human trust line. */}
          {row.source && (
            <p className="mt-4 border-t border-ink-100 pt-3 text-xs text-ink-500">
              {row.source.startsWith("http") ? (
                <>
                  Source:{" "}
                  <a
                    href={row.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-saffron-700 hover:underline"
                  >
                    {new URL(row.source).hostname.replace(/^www\./, "")}
                  </a>
                </>
              ) : (
                <>
                  Compiled by <span className="font-medium text-ink-700">Shishya</span> from
                  official notifications — always verify dates on the official exam portal.
                </>
              )}
            </p>
          )}
        </article>

        {/* Funnel card — the reason a searcher should stay after reading
            the notification. Descriptive anchors double as internal-link
            signals for the exam hub. */}
        <div className="mt-8 rounded-xl border border-saffron-200 bg-saffron-50/50 p-5">
          <p className="text-sm font-bold text-ink-900">
            Preparing for {row.exam.shortName}? Everything on Shishya is free.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/exams/${row.exam.code}`}
              className="rounded-lg bg-saffron-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600"
            >
              Free {row.exam.shortName} mock tests →
            </Link>
            <Link
              href={`/exams/${row.exam.code}/updates`}
              className="rounded-lg border border-ink-300 bg-white px-4 py-2 text-sm font-semibold text-ink-700 transition-colors hover:border-saffron-400"
            >
              Exam date, admit card & result tracker
            </Link>
            {gates.cutoff && (
              <Link
                href={`/exams/${row.exam.code}/cutoff`}
                className="rounded-lg border border-ink-300 bg-white px-4 py-2 text-sm font-semibold text-ink-700 transition-colors hover:border-saffron-400"
              >
                Expected cutoffs
              </Link>
            )}
            {gates.syllabus && (
              <Link
                href={`/exams/${row.exam.code}/syllabus`}
                className="rounded-lg border border-ink-300 bg-white px-4 py-2 text-sm font-semibold text-ink-700 transition-colors hover:border-saffron-400"
              >
                {newsPermalinkCopy(row.exam.shortName, hasNotes).syllabusLabel}
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
