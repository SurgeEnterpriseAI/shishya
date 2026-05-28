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

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { getExamTheme } from "@/lib/exam-theme";

interface RouteParams {
  code: string;
  id: string;
}

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
  if (!row || row.exam.code !== code) {
    return { title: "Notification not found — Shishya" };
  }

  // SEO-tuned title: news headline + exam shortname + Shishya. Body
  // first 160 chars → description. Both feed Google's search snippet.
  const title = `${row.title} — ${row.exam.shortName} | Shishya`;
  const description = row.body.slice(0, 160).replace(/\s+/g, " ").trim();

  return {
    title,
    description,
    alternates: { canonical: `https://shishya.in/exams/${code}/news/${id}` },
    openGraph: {
      title: row.title,
      description,
      url: `https://shishya.in/exams/${code}/news/${id}`,
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
    // We keep archived rows indexable too — they're a key long-tail
    // SEO surface ("[exam] notification 2024", "last year postponement
    // [exam]"). robots default = index, follow.
    robots: { index: true, follow: true },
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
        },
      },
    },
  });
  if (!row || row.exam.code !== code) notFound();

  const theme = getExamTheme(row.exam.category);
  const isArchived = row.archivedAt !== null;

  // NewsArticle JSON-LD for Google rich results. Generic enough that
  // Bing / DuckDuckGo / Yandex understand it too.
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: row.title,
    description: row.body.slice(0, 200),
    datePublished: row.publishedAt.toISOString(),
    dateModified: (row.archivedAt ?? row.publishedAt).toISOString(),
    inLanguage: "en-IN",
    isAccessibleForFree: true,
    publisher: {
      "@type": "EducationalOrganization",
      name: "Shishya",
      url: "https://shishya.in",
      logo: {
        "@type": "ImageObject",
        url: "https://shishya.in/icon.svg",
      },
    },
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
      { "@type": "ListItem", position: 2, name: "Exams", item: "https://shishya.in/exams" },
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

          {row.source && (
            <p className="mt-4 border-t border-ink-100 pt-3 text-xs text-ink-500">
              Source:{" "}
              {row.source.startsWith("http") ? (
                <a
                  href={row.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-saffron-700 hover:underline"
                >
                  {new URL(row.source).hostname.replace(/^www\./, "")}
                </a>
              ) : (
                <span className="font-medium text-ink-700">{row.source}</span>
              )}
            </p>
          )}
        </article>

        <p className="mt-8 text-xs text-ink-500">
          Looking for the live {row.exam.shortName} prep page?{" "}
          <Link
            href={`/exams/${row.exam.code}`}
            className="font-medium text-saffron-700 hover:underline"
          >
            Mocks, PYQ, syllabus → /exams/{row.exam.code}
          </Link>
        </p>
      </section>
    </main>
  );
}
