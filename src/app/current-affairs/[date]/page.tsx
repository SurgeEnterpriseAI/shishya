// /current-affairs/:date — the daily current-affairs digest (YYYY-MM-DD).
// The SEO + return-habit workhorse: "current affairs 22 July 2026",
// "today current affairs for SSC/UPSC". PUBLIC + cached. Data:
// CurrentAffair rows for that IST date (raw SQL — no client typegen dep).

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { JsonLd, breadcrumbLd } from "@/components/JsonLd";

export const revalidate = 3600;

interface Row {
  id: string;
  title: string;
  summary: string;
  category: string;
  examTags: string[];
  whyItMatters: string | null;
  source: string | null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function prettyDate(d: string): string {
  const dt = new Date(`${d}T00:00:00Z`);
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

async function load(date: string): Promise<Row[]> {
  return prisma
    .$queryRawUnsafe<Row[]>(
      `SELECT id, title, summary, category, "examTags", "whyItMatters", source
       FROM "CurrentAffair" WHERE date = $1::date ORDER BY category, title`,
      date,
    )
    .catch(() => [] as Row[]);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>;
}): Promise<Metadata> {
  const { date } = await params;
  if (!DATE_RE.test(date)) return { title: "Current affairs — Shishya" };
  const pretty = prettyDate(date);
  const title = `Current Affairs ${pretty} — Daily GK for UPSC, SSC, Banking, Railways | Shishya`;
  const description = `Today's current affairs (${pretty}) for Indian government exams: national, international, economy, science, schemes & appointments — free, exam-ready summaries.`;
  const url = `https://shishya.in/current-affairs/${date}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    keywords: [`current affairs ${pretty}`, "current affairs today", "daily current affairs", "current affairs for UPSC SSC banking"],
    openGraph: { title, description, url, siteName: "Shishya", locale: "en_IN", type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CurrentAffairsDatePage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!DATE_RE.test(date)) notFound();
  const rows = await load(date);
  if (rows.length === 0) notFound();

  const pretty = prettyDate(date);
  const url = `https://shishya.in/current-affairs/${date}`;

  // Group by category for scannability.
  const byCat = new Map<string, Row[]>();
  for (const r of rows) {
    if (!byCat.has(r.category)) byCat.set(r.category, []);
    byCat.get(r.category)!.push(r);
  }

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `Current Affairs ${pretty} — daily GK digest for Indian government exams`,
    datePublished: `${date}T02:00:00+05:30`,
    dateModified: `${date}T14:00:00+05:30`,
    inLanguage: "en-IN",
    isAccessibleForFree: true,
    url,
    author: { "@type": "EducationalOrganization", name: "Shishya", url: "https://shishya.in" },
    publisher: { "@type": "EducationalOrganization", name: "Shishya", url: "https://shishya.in" },
    about: rows.slice(0, 12).map((r) => ({ "@type": "Thing", name: r.title })),
  };

  return (
    <main className="min-h-screen bg-ink-50/40">
      <JsonLd
        data={[
          articleLd,
          breadcrumbLd([
            ["Current affairs", "/current-affairs"],
            [pretty, `/current-affairs/${date}`],
          ]),
        ]}
      />
      <Header />
      <section className="container-prose py-8 sm:py-10">
        <p className="text-xs text-ink-500">
          <Link href="/current-affairs" className="hover:text-ink-800">
            Current affairs
          </Link>{" "}
          · {pretty}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900 sm:text-3xl">
          Current affairs — {pretty}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-700">
          The day&apos;s most exam-relevant current affairs for UPSC, SSC, banking, railways and
          state exams — free, factual, revision-ready. {rows.length} updates.
        </p>

        {[...byCat.entries()].map(([cat, items]) => (
          <section key={cat} className="mt-7">
            <h2 className="text-sm font-bold uppercase tracking-wide text-saffron-700">{cat}</h2>
            <ul className="mt-3 space-y-3">
              {items.map((r) => (
                <li key={r.id} className="rounded-lg border border-ink-200 bg-white p-4">
                  <p className="text-sm font-bold text-ink-900">{r.title}</p>
                  <p className="mt-1 text-sm text-ink-700">{r.summary}</p>
                  {r.whyItMatters && (
                    <p className="mt-2 text-xs text-ink-500">
                      <span className="font-semibold text-ink-600">Why it matters: </span>
                      {r.whyItMatters}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {r.examTags.slice(0, 5).map((tg) => (
                      <span key={tg} className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium text-ink-600">
                        {tg}
                      </span>
                    ))}
                    {r.source && (
                      <a
                        href={r.source}
                        target="_blank"
                        rel="nofollow noopener noreferrer"
                        className="text-[10px] font-medium text-saffron-700 hover:underline"
                      >
                        source ↗
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <div className="mt-8 rounded-xl border-2 border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 p-5">
          <p className="text-base font-bold text-ink-900">Turn today&apos;s GK into marks</p>
          <p className="mt-1 text-sm text-ink-600">
            Read the news, then lock it in with a free mock on your exam. Current affairs stick when
            you test yourself.
          </p>
          <Link href="/" className="btn-primary mt-3 inline-block !py-2 !px-4 text-sm">
            Practice free on your exam →
          </Link>
        </div>
      </section>
    </main>
  );
}
