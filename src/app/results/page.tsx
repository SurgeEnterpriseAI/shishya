// /results — declared government & entrance exam results, structured:
// what was declared, the official link, cutoff expectation, and the
// candidate's exact next steps in the selection process. Zero friction:
// public, no login, one tap to cutoffs and next-stage prep.

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { Header } from "@/components/Header";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Latest Govt Exam Results Declared — cutoffs & what's next | Shishya",
  description:
    "All declared government and entrance exam results in one place — SSC, banking, railways, PSC, TET. Official links, expected cutoffs by difficulty, and your exact next steps in the selection process. Free.",
  alternates: { canonical: "https://shishya.in/results" },
};

interface Row {
  id: string;
  stage: string;
  headline: string;
  declaredOn: Date;
  officialUrl: string | null;
  officialName: string | null;
  cutoffNote: string | null;
  nextSteps: { step: string; note: string }[] | null;
  code: string;
  short: string;
}

export default async function ResultsPage() {
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT r.id, r.stage, r.headline, r."declaredOn", r."officialUrl", r."officialName",
           r."cutoffNote", r."nextSteps", e.code, e."shortName" AS short
    FROM "ExamResult" r
    JOIN "Exam" e ON e.id = r."examId"
    WHERE r.stage <> '__not_a_result__'
      AND r."declaredOn" > NOW() - INTERVAL '60 days'
    ORDER BY r."declaredOn" DESC, r."createdAt" DESC
    LIMIT 60`;

  const weekAgo = Date.now() - 7 * 86_400_000;
  const thisWeek = rows.filter((r) => r.declaredOn.getTime() >= weekAgo);
  const earlier = rows.filter((r) => r.declaredOn.getTime() < weekAgo);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Latest government exam results declared",
    itemListElement: rows.slice(0, 20).map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${r.short} — ${r.stage} result`,
      url: `https://shishya.in/results#${r.id}`,
    })),
  };

  const card = (r: Row) => (
    <div
      key={r.id}
      id={r.id}
      className="scroll-mt-24 rounded-xl border border-ink-200 bg-white p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-base font-bold text-ink-900">
          <Link href={`/exams/${r.code}`} className="hover:text-saffron-700">
            {r.short}
          </Link>{" "}
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-800">
            🎉 {r.stage} declared
          </span>
        </p>
        <span className="text-xs tabular-nums text-ink-500">
          {r.declaredOn.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </span>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{r.headline}</p>

      {r.cutoffNote && (
        <p className="mt-3 rounded-lg bg-saffron-50/70 px-3 py-2 text-sm leading-relaxed text-ink-800">
          <span className="font-semibold text-saffron-800">Cutoff read:</span> {r.cutoffNote}
        </p>
      )}

      {Array.isArray(r.nextSteps) && r.nextSteps.length > 0 && (
        <details className="mt-3 group">
          <summary className="cursor-pointer text-sm font-semibold text-saffron-700 hover:underline">
            Your next steps ({r.nextSteps.length}) ↓
          </summary>
          <ol className="mt-2 space-y-2 border-l-2 border-saffron-200 pl-4">
            {r.nextSteps.map((s, i) => (
              <li key={i} className="text-sm leading-relaxed">
                <span className="font-semibold text-ink-900">{s.step}</span>
                {s.note && <span className="text-ink-600"> — {s.note}</span>}
              </li>
            ))}
          </ol>
        </details>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {r.officialUrl && (
          <a
            href={r.officialUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="rounded-lg bg-ink-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-ink-900"
          >
            Official portal ↗
          </a>
        )}
        <Link
          href={`/exams/${r.code}/cutoff`}
          className="rounded-lg border border-ink-300 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:border-saffron-400"
        >
          Category-wise cutoffs
        </Link>
        <Link
          href={`/exams/${r.code}`}
          className="rounded-lg border border-saffron-300 bg-saffron-50 px-3 py-1.5 text-xs font-semibold text-saffron-800 hover:bg-saffron-100"
        >
          Prepare for the next stage — free →
        </Link>
      </div>
      <p className="mt-2 text-[11px] text-ink-400">
        Always verify on the official portal{r.officialName ? ` (${r.officialName})` : ""} before
        acting.
      </p>
    </div>
  );

  return (
    <main className="min-h-screen bg-paper-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      <section className="container-prose py-8">
        <h1 className="text-2xl font-bold text-ink-900">🎉 Results declared</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-600">
          Every declared result across {""}government and entrance exams — with the official
          link, an honest cutoff read, and exactly what a candidate should do next. Updated
          every morning.
        </p>

        {rows.length === 0 && (
          <div className="mt-8 rounded-xl border border-dashed border-ink-300 bg-white px-4 py-10 text-center text-sm text-ink-500">
            No results in the last 60 days — declarations land here the morning they&apos;re out.
          </div>
        )}

        {thisWeek.length > 0 && (
          <>
            <h2 className="mt-7 text-base font-bold text-ink-900">This week</h2>
            <div className="mt-3 space-y-4">{thisWeek.map(card)}</div>
          </>
        )}
        {earlier.length > 0 && (
          <>
            <h2 className="mt-8 text-base font-bold text-ink-900">Earlier</h2>
            <div className="mt-3 space-y-4">{earlier.map(card)}</div>
          </>
        )}
      </section>
    </main>
  );
}
