// /current-affairs/capsule/[month] — the Monthly Current Affairs
// Capsule (month = YYYY-MM). One clean, print-styled page holding the
// whole month's items grouped by date → downloadable as PDF via the
// browser's print dialog (zero dependencies, works on any phone) and
// shareable on WhatsApp. The offline capsule PDF is a staple of every
// paid platform; ours is free.

import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { Header } from "@/components/Header";
import { CapsuleActions } from "./CapsuleActions";
import { LandingActions } from "@/components/LandingActions";
import { currentAffairsActions } from "@/lib/landing-actions";
import { SoftWall } from "@/components/SoftWall";
import { SignupInline } from "@/components/SignupInline";
import { PIB_CATEGORY } from "@/lib/current-affairs-pib";

export const revalidate = 3600;

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ month: string }>;
}): Promise<Metadata> {
  const { month } = await params;
  if (!MONTH_RE.test(month)) return { title: "Capsule not found — Shishya" };
  const label = monthLabel(month);
  const title = `Current Affairs Capsule ${label} — free monthly PDF | Shishya`;
  // 26 Sep 2026: not "Complete" — the capsule holds only the days Shishya published (some days are missing).
  const description = `${label} current affairs for UPSC, SSC, banking, railways and state exams in one free capsule, from the days Shishya published — national, international, economy, science, schemes. Read online or download as PDF.`;
  const url = `https://shishya.in/current-affairs/capsule/${month}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "Shishya", locale: "en_IN", type: "article" },
  };
}

export default async function CapsulePage({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  const { month } = await params;
  if (!MONTH_RE.test(month)) notFound();
  const [y, m] = month.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1));
  const to = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1));

  const rows = await prisma.$queryRaw<
    { date: Date; title: string; summary: string; category: string; whyItMatters: string | null }[]
  >`
    SELECT date, title, summary, category, "whyItMatters"
    FROM "CurrentAffair"
    WHERE date >= ${from} AND date < ${to}
    ORDER BY date ASC, category ASC`;

  if (rows.length === 0) notFound();

  // 6 Oct 2026 (B2): a day filled later from PIB's own list of that day's
  // releases (scripts/backfill-current-affairs-pib.ts, category "PIB
  // releases") holds every PIB headline of the day, not exam-relevant
  // summaries: it is linked below, not counted or printed in the capsule. The
  // line names no number of empty days: a day with no row at all is neither
  // a PIB day nor a digest day (4 and 6 Sep 2026 had none on 6 Oct).
  const items = rows.filter((it) => it.category !== PIB_CATEGORY);
  const pibDays = [...new Set(rows.filter((it) => it.category === PIB_CATEGORY).map((it) => it.date.toISOString().slice(0, 10)))];

  const byDate = new Map<string, typeof items>();
  for (const it of items) {
    const key = it.date.toISOString().slice(0, 10);
    const arr = byDate.get(key) ?? [];
    arr.push(it);
    byDate.set(key, arr);
  }
  const label = monthLabel(month);

  return (
    <main className="min-h-screen bg-paper-50 print:bg-white">
      <div className="print:hidden">
        <Header />
      </div>
      <section className="container-prose py-8 print:py-2">
        <div className="flex flex-wrap items-start justify-between gap-3 print:block">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
              Shishya · Monthly Capsule
            </p>
            <h1 className="mt-1 text-2xl font-bold text-ink-900">
              Current Affairs — {label}
            </h1>
            <p className="mt-1 text-sm text-ink-600 print:text-ink-800">
              {items.length > 0 ? (
                <>
                  {items.length} exam-relevant items · UPSC, SSC, banking, railways &amp; state exams
                  · free from shishya.in
                </>
              ) : (
                // Every row of the month is a PIB backfill row: no count of "exam-relevant items".
                <>No day of Shishya&apos;s daily digest this month · free from shishya.in</>
              )}
            </p>
          </div>
          <CapsuleActions month={month} label={label} />
        </div>
        {/* 27 Sep 2026: next steps + the free sign-up offer right under the answer (src/lib/landing-actions.ts — landing pages without them lost 71-93% of search visitors after one page). 30 Sep 2026 (sign-up build 3): links only now — the sign-up line is the SignupInline after the first day below (src/lib/content-signup.ts). */}
        <div className="print:hidden">
          <LandingActions actions={currentAffairsActions(label, "en")} locale="en" surface="ca-capsule" />
        </div>
        {/* 27 Sep 2026: sign-up wall EXPERIMENT (src/lib/soft-wall.ts) — half of signed-out visitors see a few lines, the rest blurred behind a free sign-in card; crawlers always get this full HTML. */}
        <SoftWall>

        {[...byDate.entries()].map(([iso, dayItems], di) => (
          <Fragment key={iso}>
          <div className="mt-7 break-inside-avoid-page">
            <h2 className="border-b-2 border-saffron-300 pb-1 text-base font-bold text-ink-900">
              {new Date(iso + "T00:00:00Z").toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                timeZone: "UTC",
              })}
            </h2>
            <ul className="mt-3 space-y-3">
              {dayItems.map((it, i) => (
                <li key={i} className="break-inside-avoid text-sm leading-relaxed">
                  <p className="font-semibold text-ink-900">
                    <span className="mr-1.5 rounded bg-saffron-50 px-1.5 py-0.5 text-[10px] font-bold text-saffron-700 print:border print:border-saffron-300">
                      {it.category}
                    </span>
                    {it.title}
                  </p>
                  <p className="mt-0.5 text-ink-700">{it.summary}</p>
                  {it.whyItMatters && (
                    <p className="mt-0.5 text-xs text-ink-500">
                      <span className="font-semibold">Why it matters:</span> {it.whyItMatters}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
          {/* 30 Sep 2026 (sign-up build 3): the guest sign-up line, once per page, after the first day's items (print:hidden) — client-only, never on Class 1-7 (src/lib/content-signup.ts). */}
          {di === 0 && <SignupInline surface="ca-capsule" revealOffscreen />}
          </Fragment>
        ))}

        {pibDays.length > 0 && (
          <p className="mt-8 text-sm text-ink-700">
            On these days of {label}, Shishya&apos;s daily digest stored nothing. Each of these pages
            lists the headlines of press releases the Press Information Bureau (PIB) posted that
            day, linked to the releases, not summarised:{" "}
            {pibDays.map((d, i) => (
              <Fragment key={d}>
                {i > 0 && ", "}
                <Link href={`/current-affairs/${d}`} className="font-medium text-saffron-700 hover:underline">
                  {new Date(d + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}
                </Link>
              </Fragment>
            ))}
            .
          </p>
        )}

        {/* 26 Sep 2026: the site's one-line description (src/lib/site-description.ts
            SITE_CLAUSE) — it said "end-to-end free government exam preparation
            platform … 170+ exams", a stale typed count and the old scope. */}
        <p className="mt-10 border-t border-ink-200 pt-4 text-center text-xs text-ink-500">
          Compiled by Shishya (shishya.in) — one smart, free place to study for students in India. Daily updates at{" "}
          <Link href="/current-affairs" className="font-medium text-saffron-700">
            shishya.in/current-affairs
          </Link>
          .
        </p>
        </SoftWall>
      </section>
    </main>
  );
}
