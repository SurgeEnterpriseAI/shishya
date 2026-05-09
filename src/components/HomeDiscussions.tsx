// Server component. Renders a rolling list of recent discussion threads on
// the home page. Clicking a thread → /discussions/[id] (public read).
// Replying requires sign-in.
//
// Cache: 30s revalidate so the home page feels live without hitting the DB
// on every request. Adjust if real-time becomes a requirement later.

import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatRelative, type RelativeLabels } from "@/lib/relative-time";

export const revalidate = 30;

interface DiscussionLabels extends RelativeLabels {
  title: string;
  subtitle: string;
  replies: string;
  reply: string;
  viewAll: string;
  startNew: string;
  empty: string;
}

export async function HomeDiscussions({
  labels,
  signedIn,
  limit = 6,
}: {
  labels: DiscussionLabels;
  signedIn: boolean;
  limit?: number;
}) {
  // Resilient fetch: if DB env vars aren't set in production yet, render the
  // empty state instead of crashing the whole landing.
  let threads: Array<{
    id: string;
    title: string;
    examShort: string | null;
    authorName: string | null;
    messageCount: number;
    pinned: boolean;
    lastActivityAt: Date;
  }> = [];
  try {
    threads = await prisma.discussion.findMany({
      orderBy: [{ pinned: "desc" }, { lastActivityAt: "desc" }],
      take: limit,
      select: {
        id: true,
        title: true,
        authorName: true,
        messageCount: true,
        pinned: true,
        lastActivityAt: true,
        exam: { select: { shortName: true } },
      },
    }).then((rows) =>
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        examShort: r.exam?.shortName ?? null,
        authorName: r.authorName,
        messageCount: r.messageCount,
        pinned: r.pinned,
        lastActivityAt: r.lastActivityAt,
      }))
    );
  } catch {
    threads = [];
  }

  const now = new Date();
  const newDiscussionHref = signedIn
    ? "/discussions/new"
    : `/api/auth/signin/google?callbackUrl=${encodeURIComponent("/discussions/new")}`;

  return (
    <section id="discussions" className="border-t border-ink-200/50 bg-white py-16 sm:py-20">
      <div className="container-prose">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
              {labels.title}
            </h2>
            <p className="mt-1 text-sm text-ink-600">{labels.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={newDiscussionHref}
              className="rounded-md border border-ink-300 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50"
            >
              {labels.startNew}
            </Link>
            <Link
              href="/discussions"
              className="text-xs font-medium text-saffron-700 hover:text-saffron-800"
            >
              {labels.viewAll}
            </Link>
          </div>
        </div>

        {threads.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-ink-300 bg-ink-50/40 px-4 py-8 text-center">
            <p className="text-sm text-ink-500">{labels.empty}</p>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-ink-200 overflow-hidden rounded-lg border border-ink-200 bg-white">
            {threads.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/discussions/${t.id}`}
                  className="flex items-start gap-4 px-4 py-4 transition-colors hover:bg-saffron-50/40 sm:px-5"
                >
                  {/* Activity dot — green if active in the last hour, ink-300 otherwise */}
                  <span
                    className={
                      Date.now() - t.lastActivityAt.getTime() < 60 * 60 * 1000
                        ? "mt-2 h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500"
                        : "mt-2 h-2 w-2 shrink-0 rounded-full bg-ink-300"
                    }
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      {t.pinned && (
                        <span className="rounded bg-saffron-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-saffron-800">
                          Pinned
                        </span>
                      )}
                      {t.examShort && (
                        <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-medium text-ink-600">
                          {t.examShort}
                        </span>
                      )}
                      <h3 className="truncate text-sm font-semibold text-ink-900 sm:text-base">
                        {t.title}
                      </h3>
                    </div>
                    <p className="mt-1 text-xs text-ink-500">
                      {t.authorName ?? "Anonymous"}
                      <span className="mx-1.5 text-ink-300">·</span>
                      <span className="font-medium text-ink-700">
                        {t.messageCount} {t.messageCount === 1 ? labels.reply : labels.replies}
                      </span>
                      <span className="mx-1.5 text-ink-300">·</span>
                      {formatRelative(t.lastActivityAt, labels, now)}
                    </p>
                  </div>
                  <span className="hidden text-ink-400 sm:inline">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
