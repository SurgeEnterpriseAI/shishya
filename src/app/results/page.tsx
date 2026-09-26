// /results — declared government & entrance exam results, structured:
// what was declared, the official link, cutoff expectation, and the
// candidate's exact next steps. Reached from the header's 🎉 Results
// button. Server-fetches the last 60 days; the client browser adds
// instant exam search + category chips. Zero friction: public, no
// login anywhere.

import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { NOT_SCHOOL_SQL } from "@/lib/db/exam-scope";
import { Header } from "@/components/Header";
import { ResultsBrowser, type ResultRow } from "./ResultsBrowser";
import { RESULTS_LIMIT, RESULTS_WINDOW_DAYS, resultsIntro } from "@/lib/results-copy";

export const revalidate = 1800;

// 26 Sep 2026: the meta said "All declared … results in one place" and the
// share cards "Every declared … result", while the page lists only what we
// extracted in the last RESULTS_WINDOW_DAYS days (8 of 52 ExamResult rows
// today). Number-free, true wording here; the on-page intro states the
// computed count (src/lib/results-copy.ts).
export const metadata: Metadata = {
  title: "Latest Govt & Entrance Exam Results Declared — cutoffs & what's next | Shishya",
  description:
    "Declared government and entrance exam results we track — the official link, an expected-cutoff read and your next steps in the selection process for each. Free.",
  alternates: { canonical: "https://shishya.in/results" },
  openGraph: {
    title: 'Declared government & entrance exam results — official links, cutoffs & next steps | Shishya'.replace(" | Shishya", ""),
    description: 'Declared government and entrance exam results we track, each with the official link, an honest cutoff read and your next steps in the selection process. Updated every morning.',
    url: "https://shishya.in/results",
    siteName: "Shishya",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: 'Declared government & entrance exam results — official links, cutoffs & next steps | Shishya'.replace(" | Shishya", ""),
    description: 'Declared government and entrance exam results we track, each with the official link, an honest cutoff read and your next steps in the selection process. Updated every morning.',
  },
};

export default async function ResultsPage() {
  const rows = await prisma.$queryRaw<
    (Omit<ResultRow, "declaredOn" | "nextSteps"> & { declaredOn: Date; nextSteps: any })[]
  >`
    SELECT r.id, r.stage, r.headline, r."declaredOn", r."officialUrl", r."officialName",
           r."cutoffNote", r."nextSteps", e.code, e."shortName" AS short, e.category::text AS category
    FROM "ExamResult" r
    JOIN "Exam" e ON e.id = r."examId"
    WHERE r.stage <> '__not_a_result__'
      AND r."declaredOn" > NOW() - (${RESULTS_WINDOW_DAYS}::int * INTERVAL '1 day') -- 26 Sep 2026: same window the intro states
      AND ${NOT_SCHOOL_SQL} -- 25 Sep 2026: exam results only, never a school class container
    ORDER BY r."declaredOn" DESC, r."createdAt" DESC
    LIMIT ${RESULTS_LIMIT}`;

  const plain: ResultRow[] = rows.map((r) => ({
    ...r,
    declaredOn: r.declaredOn.toISOString(),
    nextSteps: Array.isArray(r.nextSteps) ? r.nextSteps : null,
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Latest government and entrance exam results declared",
    itemListElement: plain.slice(0, 20).map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${r.short} — ${r.stage} result`,
      url: `https://shishya.in/exams/${r.code}/results/${r.id}`,
    })),
  };

  return (
    <main className="min-h-screen bg-paper-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      <section className="container-prose py-8">
        <h1 className="text-2xl font-bold text-ink-900">🎉 Results declared</h1>
        {/* 26 Sep 2026: computed count, not "Every declared result" (src/lib/results-copy.ts). */}
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-600">
          {resultsIntro(plain)}
        </p>
        {plain.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-ink-300 bg-white px-4 py-10 text-center text-sm text-ink-500">
            No results in the last {RESULTS_WINDOW_DAYS} days — declarations land here the morning they&apos;re out.
          </div>
        ) : (
          <ResultsBrowser rows={plain} />
        )}
      </section>
    </main>
  );
}
