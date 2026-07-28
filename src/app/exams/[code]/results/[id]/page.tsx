// /exams/[code]/results/[id] — permalink for one declared result.
// The SEO surface for "{exam} {stage} result 2026" queries (the largest
// query family in this category): declaration + official link, cutoff
// read, and the candidate's full next-steps timeline, with NewsArticle
// + BreadcrumbList JSON-LD.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { Header } from "@/components/Header";

export const revalidate = 3600;

interface RouteParams {
  code: string;
  id: string;
}

interface Row {
  id: string;
  stage: string;
  headline: string;
  declaredOn: Date;
  officialUrl: string | null;
  officialName: string | null;
  cutoffNote: string | null;
  nextSteps: { step: string; note: string }[] | null;
  createdAt: Date;
  code: string;
  short: string;
  examName: string;
}

async function loadResult(code: string, id: string): Promise<Row | null> {
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT r.id, r.stage, r.headline, r."declaredOn", r."officialUrl", r."officialName",
           r."cutoffNote", r."nextSteps", r."createdAt",
           e.code, e."shortName" AS short, e.name AS "examName"
    FROM "ExamResult" r JOIN "Exam" e ON e.id = r."examId"
    WHERE r.id = ${id} AND e.code = ${code} AND r.stage <> '__not_a_result__'
    LIMIT 1`;
  return rows[0] ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { code, id } = await params;
  const r = await loadResult(code, id);
  if (!r) return { title: "Result not found — Shishya" };
  const year = r.declaredOn.getFullYear();
  const title = `${r.short} ${r.stage} Result ${year} — declared, cutoff & next steps | Shishya`;
  const description = `${r.headline} Expected cutoff analysis and the candidate's exact next steps in the ${r.short} selection process — free on Shishya.`;
  const url = `https://shishya.in/exams/${code}/results/${id}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Shishya",
      locale: "en_IN",
      type: "article",
      publishedTime: r.createdAt.toISOString(),
    },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true },
  };
}

export default async function ResultPermalinkPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { code, id } = await params;
  const r = await loadResult(code, id);
  if (!r) notFound();

  const url = `https://shishya.in/exams/${code}/results/${id}`;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: `${r.short} ${r.stage} result declared`,
    description: r.headline,
    datePublished: r.createdAt.toISOString(),
    dateModified: r.createdAt.toISOString(),
    inLanguage: "en-IN",
    isAccessibleForFree: true,
    publisher: {
      "@type": "EducationalOrganization",
      name: "Shishya",
      url: "https://shishya.in",
      logo: { "@type": "ImageObject", url: "https://shishya.in/icon.svg" },
    },
    about: { "@type": "Course", name: r.examName, url: `https://shishya.in/exams/${code}` },
    mainEntityOfPage: url,
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: "Results", item: "https://shishya.in/results" },
      { "@type": "ListItem", position: 3, name: r.short, item: `https://shishya.in/exams/${code}` },
      { "@type": "ListItem", position: 4, name: `${r.stage} result`, item: url },
    ],
  };

  // FAQPage — mirrors the exact questions aspirants type into ChatGPT/
  // Gemini/Perplexity ("has X result come?", "cutoff?", "what next?"),
  // so AI answer engines can lift a direct, citeable Q&A.
  const declaredLabel = r.declaredOn.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const faqEntities = [
    {
      "@type": "Question",
      name: `Has the ${r.short} ${r.stage} result been declared?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: `Yes — declared on ${declaredLabel}. ${r.headline} Verify on the official portal${r.officialName ? ` (${r.officialName})` : ""}.`,
      },
    },
    ...(r.cutoffNote
      ? [
          {
            "@type": "Question",
            name: `What is the expected cutoff for the ${r.short} ${r.stage}?`,
            acceptedAnswer: { "@type": "Answer", text: r.cutoffNote },
          },
        ]
      : []),
    ...(Array.isArray(r.nextSteps) && r.nextSteps.length > 0
      ? [
          {
            "@type": "Question",
            name: `What happens after the ${r.short} ${r.stage} result?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: r.nextSteps
                .map((s, i) => `${i + 1}. ${s.step}${s.note ? ` — ${s.note}` : ""}`)
                .join(" "),
            },
          },
        ]
      : []),
  ];
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqEntities,
  };

  return (
    <main className="min-h-screen bg-paper-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/results" className="hover:text-ink-800">🎉 Results</Link> ·{" "}
          <Link href={`/exams/${code}`} className="hover:text-ink-800">{r.short}</Link>
        </p>

        <h1 className="mt-2 text-2xl font-bold leading-tight text-ink-900 sm:text-3xl">
          {r.short} {r.stage} result — declared{" "}
          {r.declaredOn.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </h1>
        <p className="mt-3 rounded-lg border border-ink-200 bg-white p-4 text-sm leading-relaxed text-ink-800">
          {r.headline}
        </p>

        {r.cutoffNote && (
          <div className="mt-4 rounded-xl border border-saffron-200 bg-saffron-50/60 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-saffron-700">
              Cutoff read
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-800">{r.cutoffNote}</p>
            <Link
              href={`/exams/${code}/cutoff`}
              className="mt-2 inline-block text-sm font-semibold text-saffron-700 hover:underline"
            >
              Category-wise expected cutoffs →
            </Link>
          </div>
        )}

        {Array.isArray(r.nextSteps) && r.nextSteps.length > 0 && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Your next steps in the {r.short} process
            </p>
            <ol className="mt-2 space-y-2.5 border-l-2 border-emerald-300 pl-4">
              {r.nextSteps.map((s, i) => (
                <li key={i} className="text-sm leading-relaxed">
                  <span className="font-semibold text-ink-900">
                    {i + 1}. {s.step}
                  </span>
                  {s.note && <span className="text-ink-700"> — {s.note}</span>}
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {r.officialUrl && (
            <a
              href={r.officialUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="rounded-lg bg-ink-800 px-4 py-2 text-sm font-bold text-white hover:bg-ink-900"
            >
              Official portal ↗
            </a>
          )}
          <Link
            href={`/exams/${code}`}
            className="rounded-lg bg-saffron-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-saffron-600"
          >
            Free {r.short} mocks for the next stage →
          </Link>
          <Link
            href={`/exams/${code}/syllabus`}
            className="rounded-lg border border-ink-300 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:border-saffron-400"
          >
            Syllabus &amp; study notes
          </Link>
        </div>
        <p className="mt-3 text-xs text-ink-500">
          Compiled by Shishya from official notifications — always verify dates and lists on the
          official portal{r.officialName ? ` (${r.officialName})` : ""}.
        </p>
      </section>
    </main>
  );
}
