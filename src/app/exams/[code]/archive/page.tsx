// /exams/:code/archive — historical news + dates for one exam.
//
// Every time the refresh-exam-data cron runs (3× daily), the previous
// generation of news items and important dates for that exam gets
// archivedAt-stamped instead of deleted. This page surfaces that
// archive so students can:
//   - Read postponement / centre-change notices from earlier cycles
//   - See last year's exam-day, application window, result date
//   - Trace how cutoff predictions evolved
//
// Public + SEO-indexable. Older students prepping for an exam love
// being able to look back at the previous year's official-notification
// timeline — it shapes what to expect this year.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { getExamTheme } from "@/lib/exam-theme";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const exam = await prisma.exam.findUnique({
    where: { code },
    select: { shortName: true, name: true },
  });
  if (!exam) return { title: "Archive — Shishya" };
  return {
    title: `${exam.shortName} — older notifications & timeline | Shishya`,
    description: `Historical news, postponements, important dates and cutoff predictions for ${exam.name}. Browse every cycle's official-source notifications archived by Shishya.`,
    alternates: { canonical: `https://shishya.in/exams/${code}/archive` },
    robots: { index: true, follow: true },
  };
}

export default async function ArchivePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const exam = await prisma.exam.findUnique({
    where: { code },
    select: { id: true, code: true, name: true, shortName: true, category: true },
  });
  if (!exam) notFound();

  const theme = getExamTheme(exam.category);

  // Pull EVERY archived row (caps for sanity — 200 each is way more
  // than any single exam has accumulated, and per-row cost is tiny).
  const [news, dates] = await Promise.all([
    prisma.examNewsItem.findMany({
      where: { examId: exam.id, archivedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      take: 200,
    }),
    prisma.examImportantDate.findMany({
      where: { examId: exam.id, archivedAt: { not: null } },
      orderBy: { date: "desc" },
      take: 200,
    }),
  ]);

  return (
    <main className={`min-h-screen ${theme.pageBg}`}>
      <div className={`h-1.5 w-full ${theme.ribbon}`} aria-hidden />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href={`/exams/${exam.code}`} className="hover:text-ink-800">
            ← Back to {exam.shortName}
          </Link>
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${theme.badge}`}>
            <span aria-hidden>{theme.icon}</span>
            {theme.label}
          </span>
          <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-[11px] font-semibold text-ink-700">
            Archive
          </span>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-ink-900">
          {exam.shortName} — older updates
        </h1>
        <p className="mt-1 text-sm text-ink-600">
          Every cycle of news + important dates we&apos;ve captured for{" "}
          {exam.name}, oldest cycles at the bottom. Live information is
          on the main exam page; this archive preserves what each
          previous cycle officially announced.
        </p>

        {news.length === 0 && dates.length === 0 ? (
          <div className="mt-10 rounded-md border border-dashed border-ink-300 bg-white px-4 py-8 text-center text-sm text-ink-500">
            No archived updates yet — once the next refresh cycle runs,
            the current items will get archived here for future
            reference.
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <section>
              <h2 className="text-base font-semibold text-ink-800">
                Older news ({news.length})
              </h2>
              {news.length === 0 ? (
                <p className="mt-3 text-sm text-ink-500">No archived news yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {news.map((n) => (
                    <li
                      key={n.id}
                      className="rounded-md border border-ink-200 bg-white p-4 opacity-90"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        {/* Linked headline → news permalink. Crawler-
                            friendly: every archived item is one click
                            from this aggregator, and from the sitemap. */}
                        <h3 className="text-sm font-semibold text-ink-900">
                          <Link
                            href={`/exams/${exam.code}/news/${n.id}`}
                            prefetch={false}
                            className="hover:text-saffron-700"
                          >
                            {n.title}
                          </Link>
                        </h3>
                        <span className="shrink-0 text-[10px] text-ink-500">
                          {new Date(n.publishedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-ink-700">{n.body}</p>
                      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                        <Link
                          href={`/exams/${exam.code}/news/${n.id}`}
                          prefetch={false}
                          className="text-xs font-medium text-saffron-700 hover:text-saffron-800"
                        >
                          Read full notice →
                        </Link>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-ink-400">
                          Archived{" "}
                          {n.archivedAt
                            ? new Date(n.archivedAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="text-base font-semibold text-ink-800">
                Older dates ({dates.length})
              </h2>
              {dates.length === 0 ? (
                <p className="mt-3 text-sm text-ink-500">No archived dates yet.</p>
              ) : (
                <ol className="mt-3 space-y-2">
                  {dates.map((d) => (
                    <li
                      key={d.id}
                      className={
                        d.isExamDay
                          ? `rounded-md border-2 p-4 opacity-90 ${theme.borderAccent} ${theme.examDayBg}`
                          : "rounded-md border border-ink-200 bg-white p-4 opacity-90"
                      }
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-ink-900">
                          {d.isExamDay && <span className="mr-1">{theme.icon}</span>}
                          {d.label}
                        </p>
                        <span className="shrink-0 text-xs text-ink-500">
                          {new Date(d.date).toLocaleDateString("en-IN", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {d.notes && (
                        <p className="mt-1.5 text-xs text-ink-600">{d.notes}</p>
                      )}
                      <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-ink-400">
                        Archived{" "}
                        {d.archivedAt
                          ? new Date(d.archivedAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : ""}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        )}

        <p className="mt-10 text-center text-xs text-ink-500">
          Looking for the current cycle?{" "}
          <Link
            href={`/exams/${exam.code}`}
            className="font-medium text-saffron-700 hover:underline"
          >
            Back to live {exam.shortName} page →
          </Link>
        </p>
      </section>
    </main>
  );
}
