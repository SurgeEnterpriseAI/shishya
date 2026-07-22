// /current-affairs — the current-affairs hub. Shows the latest day's
// digest inline plus links to recent days. Primary target: "current
// affairs today", "daily current affairs for competitive exams".

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { JsonLd, collectionPageLd, breadcrumbLd } from "@/components/JsonLd";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Daily Current Affairs for UPSC, SSC, Banking & Railways | Shishya",
  description:
    "Free daily current affairs for Indian government exams — national, international, economy, science, schemes & appointments, summarised for aspirants. Updated every day.",
  alternates: { canonical: "https://shishya.in/current-affairs" },
  keywords: ["current affairs today", "daily current affairs", "current affairs for UPSC SSC banking railways", "GK today India"],
};

interface Row {
  id: string;
  date: Date;
  title: string;
  summary: string;
  category: string;
  examTags: string[];
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function pretty(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export default async function CurrentAffairsHub() {
  // Latest date that has content, plus recent distinct dates for the rail.
  const dateRows = await prisma
    .$queryRawUnsafe<{ d: Date }[]>(
      `SELECT DISTINCT date AS d FROM "CurrentAffair" ORDER BY date DESC LIMIT 30`,
    )
    .catch(() => [] as { d: Date }[]);
  const dates = dateRows.map((r) => r.d);
  const latest = dates[0] ?? null;

  const latestItems = latest
    ? await prisma
        .$queryRawUnsafe<Row[]>(
          `SELECT id, date, title, summary, category, "examTags"
           FROM "CurrentAffair" WHERE date = $1::date ORDER BY category, title`,
          iso(latest),
        )
        .catch(() => [] as Row[])
    : [];

  return (
    <main className="min-h-screen bg-ink-50/40">
      <JsonLd
        data={[
          collectionPageLd({
            name: "Daily Current Affairs for Indian Government Exams",
            description:
              "Free daily current affairs for UPSC, SSC, banking, railways and state exams — national, international, economy, science, schemes and appointments.",
            path: "/current-affairs",
          }),
          breadcrumbLd([["Current affairs", "/current-affairs"]]),
        ]}
      />
      <Header />
      <section className="container-prose py-8 sm:py-10">
        <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">
          Daily current affairs for government exams
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-700">
          The day&apos;s most exam-relevant current affairs for UPSC, SSC, banking, railways and
          state exams — free, factual, updated every morning. Come back daily; it&apos;s how the
          GK section is won.
        </p>

        {latest === null ? (
          <div className="mt-8 rounded-md border border-dashed border-ink-300 bg-white px-4 py-10 text-center text-sm text-ink-500">
            Today&apos;s digest is being prepared — check back shortly.
          </div>
        ) : (
          <>
            <div className="mt-6 flex items-baseline justify-between">
              <h2 className="text-base font-bold text-ink-900">Latest — {pretty(latest)}</h2>
              <Link href={`/current-affairs/${iso(latest)}`} className="text-xs font-medium text-saffron-700 hover:underline">
                Full day →
              </Link>
            </div>
            <ul className="mt-3 space-y-3">
              {latestItems.slice(0, 10).map((r) => (
                <li key={r.id} className="rounded-lg border border-ink-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-ink-900">{r.title}</p>
                    <span className="shrink-0 rounded-full bg-saffron-50 px-2 py-0.5 text-[10px] font-semibold text-saffron-700">
                      {r.category}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-700">{r.summary}</p>
                </li>
              ))}
            </ul>

            {dates.length > 1 && (
              <div className="mt-8">
                <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500">Recent days</h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {dates.slice(1).map((d) => (
                    <li key={iso(d)}>
                      <Link
                        href={`/current-affairs/${iso(d)}`}
                        className="rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-medium text-ink-700 hover:border-saffron-400 hover:text-saffron-800"
                      >
                        {pretty(d)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
