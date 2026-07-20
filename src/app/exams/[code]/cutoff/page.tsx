// /exams/:code/cutoff — programmatic SEO landing for "[exam] cutoff" /
// "[exam] expected cutoff 2026" queries (among the highest-volume exam
// search patterns we didn't own a page for). Data: ExamRankBand — the same
// AI-curated, source-annotated score→rank→outcome bands that power the
// post-mock RankCard. PUBLIC + cached; honest disclaimer built in.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { ShareExamButton } from "@/components/ShareExamButton";
import { TalkToTeacher } from "@/components/TalkToTeacher";

export const revalidate = 3600;

const YEAR = new Date().getFullYear();

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const exam = await prisma.exam.findUnique({
    where: { code },
    select: { code: true, shortName: true, name: true },
  });
  if (!exam) return { title: "Exam cutoff — Shishya" };
  const title = `${exam.shortName} Cutoff ${YEAR} — Expected Score, Rank & What It Gets You | Shishya`;
  const description =
    `${exam.shortName} (${exam.name}) expected cutoff ${YEAR}: score-to-rank bands, what each score range typically achieves, ` +
    `curated from historic patterns. Take a free mock to see exactly where you stand.`;
  const url = `https://shishya.in/exams/${exam.code}/cutoff`;
  return {
    title,
    description,
    alternates: { canonical: url },
    keywords: [
      `${exam.shortName} cutoff ${YEAR}`,
      `${exam.shortName} expected cutoff`,
      `${exam.shortName} cutoff marks`,
      `${exam.shortName} safe score`,
      `${exam.shortName} rank predictor`,
    ],
    openGraph: { title, description, url, siteName: "Shishya", locale: "en_IN", type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CutoffPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const exam = await prisma.exam.findUnique({
    where: { code },
    select: { id: true, code: true, shortName: true, name: true, active: true, totalMarks: true },
  });
  if (!exam || !exam.active) notFound();

  const bands = await prisma.examRankBand.findMany({
    where: { examId: exam.id, archivedAt: null },
    orderBy: { orderIdx: "asc" },
    select: {
      label: true,
      scorePctMin: true,
      scorePctMax: true,
      rankMin: true,
      rankMax: true,
      outcomes: true,
      source: true,
    },
  });
  if (bands.length === 0) notFound();

  const url = `https://shishya.in/exams/${exam.code}/cutoff`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${exam.shortName} Cutoff ${YEAR} — Expected Score & Rank Bands`,
    description: `Score-to-rank cutoff bands for ${exam.name}, curated from historic patterns.`,
    url,
    inLanguage: "en-IN",
    isAccessibleForFree: true,
    about: [{ "@type": "Thing", name: exam.name }, { "@type": "Thing", name: `${exam.shortName} cutoff` }],
    publisher: { "@type": "Organization", name: "Shishya", url: "https://shishya.in" },
    isPartOf: { "@type": "Course", name: `${exam.shortName} preparation`, url: `https://shishya.in/exams/${exam.code}` },
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: exam.shortName, item: `https://shishya.in/exams/${exam.code}` },
      { "@type": "ListItem", position: 3, name: "Cutoff", item: url },
    ],
  };

  const outcomesList = (md: string) =>
    md
      .split("\n")
      .map((l) => l.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean);

  // Category-wise expected cutoffs (gap-fill #4 — "is 95 safe for OBC?"
  // is how aspirants actually frame the question). Raw SQL keeps this
  // independent of client typegen; renders when generated.
  const catRows = await prisma
    .$queryRaw<{ content: string }[]>`
      SELECT content FROM "ExamCategoryCutoff" WHERE "examId" = ${exam.id} LIMIT 1
    `.catch(() => [] as { content: string }[]);
  const categoryMd = catRows[0]?.content ?? null;
  // Parse the strict markdown the generator emits: a pipe table + bullets.
  const catTable: string[][] = [];
  const catNotes: string[] = [];
  if (categoryMd) {
    for (const raw of categoryMd.split("\n")) {
      const line = raw.trim();
      if (/^\|/.test(line)) {
        if (/^\|[\s:-]+\|/.test(line.replace(/-/g, "-"))&& /---/.test(line)) continue; // separator row
        catTable.push(line.split("|").map((c) => c.trim()).filter(Boolean));
      } else if (/^[-*•]\s+/.test(line)) {
        catNotes.push(line.replace(/^[-*•]\s+/, ""));
      }
    }
  }

  return (
    <main className="min-h-screen bg-ink-50/40">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <Header />
      <section className="container-prose py-8 sm:py-10">
        <p className="text-xs text-ink-500">
          <Link href={`/exams/${exam.code}`} className="hover:text-ink-800">
            {exam.shortName}
          </Link>{" "}
          · Cutoff
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900 sm:text-3xl">
          {exam.shortName} Cutoff {YEAR} — expected score &amp; rank bands
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-700">
          What does your score in {exam.name} actually get you? These bands map a mock/exam
          percentage to the rank window and outcomes that score range has typically achieved.
        </p>
        <p className="mt-2 max-w-3xl rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
          AI-curated from historic cutoff patterns — indicative, not official. Always verify with
          the latest official notification.
        </p>

        <div className="mt-4">
          <ShareExamButton
            url={url}
            message={`${exam.shortName} expected cutoff ${YEAR} — score-to-rank bands + what each range gets you (free on Shishya):`}
            surface="exam"
          />
        </div>

        {/* Category-wise table — the way aspirants actually ask the
            question ("safe for OBC?"). */}
        {catTable.length > 1 && (
          <section className="mt-6">
            <h2 className="text-base font-semibold text-ink-900">
              Category-wise expected cutoff (indicative)
            </h2>
            <div className="mt-3 overflow-x-auto rounded-lg border border-ink-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-200 bg-ink-50/60 text-left">
                    {catTable[0].map((h, i) => (
                      <th key={i} className="px-4 py-2 font-semibold text-ink-800">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {catTable.slice(1).map((row, i) => (
                    <tr key={i} className="border-b border-ink-100 last:border-0">
                      {row.map((c, j) => (
                        <td key={j} className={`px-4 py-2 ${j === 0 ? "font-medium text-ink-900" : "tabular-nums text-ink-700"}`}>{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {catNotes.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-ink-600">
                {catNotes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Cutoff anxiety is the single most expert-worthy moment — surface
            the human option right where the doubt forms. */}
        <p className="mt-3 text-sm text-ink-600">
          Not sure if your score is safe for your category?{" "}
          <TalkToTeacher
            surface="exam"
            examCode={exam.code}
            variant="link"
            contextLabel={`${exam.shortName} cutoff — am I safe for my category?`}
            linkLabel="Ask our subject expert — free"
          />
        </p>

        <h2 className="mt-8 text-base font-semibold text-ink-900">Score → rank → outcome bands</h2>
        <ul className="mt-3 space-y-3">
          {bands.map((b, i) => (
            <li key={i} className="rounded-lg border border-ink-200 bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-bold text-ink-900">{b.label}</p>
                <p className="text-xs font-semibold tabular-nums text-saffron-700">
                  {Math.round(b.scorePctMin)}–{Math.round(b.scorePctMax)}%
                  {b.rankMin != null && b.rankMax != null && (
                    <span className="ml-2 text-ink-500">rank ~{b.rankMin.toLocaleString("en-IN")}–{b.rankMax.toLocaleString("en-IN")}</span>
                  )}
                </p>
              </div>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-ink-700">
                {outcomesList(b.outcomes).slice(0, 6).map((o, j) => (
                  <li key={j}>{o}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-xl border-2 border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 p-5">
          <p className="text-base font-bold text-ink-900">Where would YOUR score land?</p>
          <p className="mt-1 text-sm text-ink-600">
            Take a free {exam.shortName} mock — instant score, this exact rank mapping, and your
            weak topics identified. No coaching fees.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href={`/exams/${exam.code}`} className="btn-primary !py-2 !px-4 text-sm">
              Start free preparation →
            </Link>
            <Link
              href={`/exams/${exam.code}/quiz`}
              className="inline-flex items-center rounded-md border-2 border-saffron-500 bg-white px-4 py-2 text-sm font-bold text-saffron-700 hover:bg-saffron-50"
            >
              5-question quiz — no signup →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
