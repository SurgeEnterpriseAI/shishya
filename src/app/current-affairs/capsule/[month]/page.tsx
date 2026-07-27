// /current-affairs/capsule/[month] — the Monthly Current Affairs
// Capsule (month = YYYY-MM). One clean, print-styled page holding the
// whole month's items grouped by date → downloadable as PDF via the
// browser's print dialog (zero dependencies, works on any phone) and
// shareable on WhatsApp. The offline capsule PDF is a staple of every
// paid platform; ours is free.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { Header } from "@/components/Header";
import { CapsuleActions } from "./CapsuleActions";

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
  return {
    title: `Current Affairs Capsule ${label} — free monthly PDF | Shishya`,
    description: `Complete ${label} current affairs for UPSC, SSC, banking, railways and state exams in one free capsule — national, international, economy, science, schemes. Read online or download as PDF.`,
    alternates: { canonical: `https://shishya.in/current-affairs/capsule/${month}` },
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

  const items = await prisma.$queryRaw<
    { date: Date; title: string; summary: string; category: string; whyItMatters: string | null }[]
  >`
    SELECT date, title, summary, category, "whyItMatters"
    FROM "CurrentAffair"
    WHERE date >= ${from} AND date < ${to}
    ORDER BY date ASC, category ASC`;

  if (items.length === 0) notFound();

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
              {items.length} exam-relevant items · UPSC, SSC, banking, railways &amp; state exams
              · free from shishya.in
            </p>
          </div>
          <CapsuleActions month={month} label={label} />
        </div>

        {[...byDate.entries()].map(([iso, dayItems]) => (
          <div key={iso} className="mt-7 break-inside-avoid-page">
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
        ))}

        <p className="mt-10 border-t border-ink-200 pt-4 text-center text-xs text-ink-500">
          Compiled by Shishya — India&apos;s end-to-end free government exam preparation
          platform. Daily updates at{" "}
          <Link href="/current-affairs" className="font-medium text-saffron-700">
            shishya.in/current-affairs
          </Link>
          . Free mock tests for 177 exams at shishya.in.
        </p>
      </section>
    </main>
  );
}
