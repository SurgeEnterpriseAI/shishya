// /exams/[code]/results/[id] — permalink for one declared result.
// The SEO surface for "{exam} {stage} result 2026" queries (the largest
// query family in this category): declaration + official link, cutoff
// read, and the candidate's full next-steps timeline, with Article
// + BreadcrumbList + FAQPage JSON-LD.
//
// 26 Sep 2026 (G1 index hygiene, src/lib/result-permalink-copy.ts):
//   • the title and description name "cutoff" only when the row has a
//     cutoffNote and "next steps" only when it has steps (9 of 52 rows have
//     a cutoffNote; every page promised one);
//   • every FAQPage question is printed on the page as a heading with its
//     answer (resultFaq — one list for both), as Google requires;
//   • a row without an officialUrl (50 of 52) is Google-only
//     noindex,follow and is not in the sitemap; Bing and ChatGPT search
//     keep index,follow;
//   • Article, not NewsArticle (no image, so Google's news feature never
//     applied), author + publisher = the site's Organization node;
//   • the /cutoff and /syllabus links render only when those pages do
//     (examPageGates), and "study notes" only for an exam with notes.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { NOT_SCHOOL_SQL } from "@/lib/db/exam-scope";
import { Header } from "@/components/Header";
import { SHISHYA_ORG_REF } from "@/components/JsonLd";
import { examPageGates } from "@/lib/exam-page-gates";
import { examHasNotes } from "@/lib/page-gates-notes";
import { newsPermalinkCopy } from "@/lib/page-gates-copy";
import {
  resultFaq,
  resultPermalinkDescription,
  resultPermalinkTitle,
  resultRobots,
  type ResultCopyInput,
} from "@/lib/result-permalink-copy";

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
    WHERE r.id = ${id} AND e.code = ${code} AND ${NOT_SCHOOL_SQL} AND r.stage <> '__not_a_result__'
    LIMIT 1`;
  return rows[0] ?? null;
}

function declaredLabelOf(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function copyInput(r: Row): ResultCopyInput {
  return {
    short: r.short,
    stage: r.stage,
    year: r.declaredOn.getFullYear(),
    headline: r.headline,
    cutoffNote: r.cutoffNote,
    nextSteps: Array.isArray(r.nextSteps) ? r.nextSteps : null,
    officialName: r.officialName,
    declaredLabel: declaredLabelOf(r.declaredOn),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { code, id } = await params;
  const r = await loadResult(code, id);
  if (!r) return { title: "Result not found — Shishya" };
  const copy = copyInput(r);
  const title = resultPermalinkTitle(copy);
  const description = resultPermalinkDescription(copy);
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
    robots: resultRobots(r.officialUrl),
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
  const [gates, hasNotes] = await Promise.all([examPageGates(r.code), examHasNotes(r.code)]);
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${r.short} ${r.stage} result declared`,
    description: r.headline,
    datePublished: r.createdAt.toISOString(),
    dateModified: r.createdAt.toISOString(),
    inLanguage: "en-IN",
    isAccessibleForFree: true,
    author: SHISHYA_ORG_REF,
    publisher: SHISHYA_ORG_REF,
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

  // FAQPage — the questions aspirants type into ChatGPT / Gemini /
  // Perplexity ("has X result come?", "cutoff?", "what next?"). 26 Sep 2026:
  // each question is also printed on the page as the heading of its answer
  // (resultFaq is the one list for both; its order is declared, cutoff when
  // the row has a cutoffNote, next steps when it has steps).
  const copy = copyInput(r);
  const faq = resultFaq(copy);
  const declaredQ = faq[0];
  const cutoffQ = r.cutoffNote && r.cutoffNote.trim() ? faq[1] : undefined;
  const stepsQ = Array.isArray(r.nextSteps) && r.nextSteps.length > 0 ? faq[faq.length - 1] : undefined;
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((x) => ({ "@type": "Question", name: x.question, acceptedAnswer: { "@type": "Answer", text: x.answer } })),
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
          {r.short} {r.stage} result — declared {copy.declaredLabel}
        </h1>
        <h2 className="mt-4 text-sm font-bold text-ink-900">{declaredQ.question}</h2>
        <p className="mt-1 rounded-lg border border-ink-200 bg-white p-4 text-sm leading-relaxed text-ink-800">
          {declaredQ.answer}
        </p>

        {cutoffQ && (
          <div className="mt-4 rounded-xl border border-saffron-200 bg-saffron-50/60 p-4">
            <h2 className="text-sm font-bold text-saffron-800">{cutoffQ.question}</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-800">{cutoffQ.answer}</p>
            {gates.cutoff && (
              <Link
                href={`/exams/${code}/cutoff`}
                className="mt-2 inline-block text-sm font-semibold text-saffron-700 hover:underline"
              >
                Category-wise expected cutoffs →
              </Link>
            )}
          </div>
        )}

        {stepsQ && Array.isArray(r.nextSteps) && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <h2 className="text-sm font-bold text-emerald-800">{stepsQ.question}</h2>
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
          {gates.syllabus && (
            <Link
              href={`/exams/${code}/syllabus`}
              className="rounded-lg border border-ink-300 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:border-saffron-400"
            >
              {newsPermalinkCopy(r.short, hasNotes).syllabusLabel}
            </Link>
          )}
        </div>
        <p className="mt-3 text-xs text-ink-500">
          Compiled by Shishya from official notifications — always verify dates and lists on the
          official portal{r.officialName ? ` (${r.officialName})` : ""}.
        </p>
      </section>
    </main>
  );
}
