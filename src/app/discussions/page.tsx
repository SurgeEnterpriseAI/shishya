// /discussions — full list of discussion threads (public).
//
// 3 Oct 2026: only threads a signed-in student started are listed
// (src/lib/discussion-visibility.ts). Every row stored before that day was
// written by Shishya — 34 seed-script threads under invented names and the
// retired cron's starter questions — so none of them is listed, counted or
// marked up. The page is noindex while DISCUSSIONS_INDEXABLE is false
// (next.config.ts sends the same as an X-Robots-Tag header). ?examCode=
// (the exam-day pages link with it) scopes the list to that exam.

import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getT } from "@/lib/i18n-server";
import { formatRelative } from "@/lib/relative-time";
import { UserBadge, type UserBadgeLevel } from "@/components/UserBadge";
import { JsonLd, collectionPageLd, breadcrumbLd } from "@/components/JsonLd";
import { discussionLabelsCopy } from "@/lib/discussion-labels-copy";
import { isSignUpLocale } from "@/lib/signup-cta-copy";
import { DISCUSSIONS_INDEXABLE, STUDENT_THREAD_WHERE } from "@/lib/discussion-visibility";

export const revalidate = 30;

const LIST_TITLE = "Exam Discussions — Ask & Help Fellow Aspirants | Shishya";
const LIST_DESCRIPTION =
  "Questions and answers from students on Shishya — doubts, strategy and exam-day experiences. Free to read; sign up free to reply.";

export async function generateMetadata(): Promise<Metadata> {
  const n = await prisma.discussion.count({ where: STUDENT_THREAD_WHERE }).catch(() => 0);
  return {
    title: n === 0 ? "Discussions — ask your study question | Shishya" : LIST_TITLE,
    description:
      n === 0
        ? "Ask a study or exam question on Shishya. No student has posted yet. Replies signed Shishya AI are written by AI, not by a student."
        : LIST_DESCRIPTION,
    alternates: { canonical: "https://shishya.in/discussions" },
    ...(DISCUSSIONS_INDEXABLE ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function DiscussionsList({
  searchParams,
}: {
  searchParams: Promise<{ examCode?: string }>;
}) {
  const [{ t, locale }, session, sp] = await Promise.all([getT(), auth().catch(() => null), searchParams]);
  const examCode = typeof sp?.examCode === "string" && sp.examCode ? sp.examCode : undefined;
  // The empty-list H1, the thread-state chips and the no-name fallback in the
  // reader's language (16 Sep 2026); the page metadata and JSON-LD stay
  // English. No "starter question" chip: only student threads (isSeed false)
  // are listed since 3 Oct 2026.
  const D = discussionLabelsCopy(locale);

  const threads = await prisma.discussion.findMany({
    where: { ...STUDENT_THREAD_WHERE, ...(examCode ? { exam: { code: examCode } } : {}) },
    orderBy: [{ pinned: "desc" }, { lastActivityAt: "desc" }],
    take: 50,
    include: {
      exam: { select: { code: true, shortName: true } },
      // Replies a student wrote: the opening post is the student's own, and
      // a reply with no account behind it is Shishya AI, not a student.
      _count: { select: { messages: { where: { authorId: { not: null } } } } },
    },
  });

  // Batch-fetch badge levels for every thread author. One query for
  // all authors keeps the list page snappy as the thread count grows.
  // Raw SQL because the typed Prisma client may not include badgeLevel
  // locally yet (Windows file lock on regen — see facts.ts).
  const authorIds = Array.from(new Set(threads.map((t) => t.authorId).filter(Boolean) as string[]));
  const badgeRows = authorIds.length > 0
    ? await prisma.$queryRaw<Array<{ id: string; badgeLevel: string }>>`
        SELECT "id", "badgeLevel"::text AS "badgeLevel"
        FROM "User" WHERE "id" = ANY(${authorIds}::text[])
      `
    : [];
  const badgeByAuthor = new Map<string, UserBadgeLevel>(
    badgeRows.map((r) => [r.id, r.badgeLevel as UserBadgeLevel]),
  );

  const now = new Date();
  const relLabels = {
    justNow: t("disc.justNow"),
    minutesAgo: t("disc.minutesAgo"),
    hoursAgo: t("disc.hoursAgo"),
    daysAgo: t("disc.daysAgo"),
  };
  const newHref = session?.user
    ? "/discussions/new"
    : `/login?callbackUrl=${encodeURIComponent("/discussions/new")}`;

  return (
    <main className="min-h-screen bg-ink-50/40">
      <JsonLd
        data={[
          // A collection only when a student thread exists to collect.
          ...(threads.length > 0
            ? [
                collectionPageLd({
                  name: "Exam Discussions — Ask & Help Fellow Aspirants",
                  description: LIST_DESCRIPTION,
                  path: "/discussions",
                }),
              ]
            : []),
          breadcrumbLd([["Discussions", "/discussions"]]),
        ]}
      />
      <header className="border-b border-ink-200/50 bg-white/80 backdrop-blur">
        <div className="container-prose flex h-16 items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-saffron-500 font-sans text-lg font-bold text-white">
              शि
            </span>
            <span className="text-lg font-semibold tracking-tight text-ink-900">Shishya</span>
          </Link>
          <Link href={newHref} className="btn-primary !py-2 !px-3 text-xs">
            {t("disc.startNew")}
          </Link>
        </div>
      </header>

      <section className="container-prose py-8 sm:py-12">
        <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">{threads.length === 0 ? D.listTitleEmpty : t("disc.title")}</h1>
        {/* 2 Oct 2026 (review of the sentences pass): a guest reads "sign up
            with Google to reply" — the words of the button on a thread. A
            member keeps "sign in to reply", and so does a language other
            than en / hi / te (the guest line exists in those three). */}
        <p className="mt-1 text-sm text-ink-600">{t(!session?.user && isSignUpLocale(locale) ? "disc.subtitle.guest" : "disc.subtitle")}</p>

        <ul className="mt-6 divide-y divide-ink-200 overflow-hidden rounded-lg border border-ink-200 bg-white">
          {threads.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-ink-500">{t("disc.empty")}</li>
          ) : (
            threads.map((th) => (
              <li key={th.id}>
                <Link
                  href={`/discussions/${th.id}`}
                  className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-saffron-50/40"
                >
                  <span
                    className={
                      Date.now() - th.lastActivityAt.getTime() < 60 * 60 * 1000
                        ? "mt-2 h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500"
                        : "mt-2 h-2 w-2 shrink-0 rounded-full bg-ink-300"
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      {th.pinned && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                          {D.pinned}
                        </span>
                      )}
                      {th.exam && (
                        <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-medium text-ink-600">
                          {th.exam.shortName}
                        </span>
                      )}
                      <h2 className="truncate text-sm font-semibold text-ink-900 sm:text-base">{th.title}</h2>
                    </div>
                    <p className="mt-1 flex flex-wrap items-baseline gap-1.5 text-xs text-ink-500">
                      <span>{th.authorName ?? D.anonymous}</span>
                      {th.authorId && (
                        <UserBadge level={badgeByAuthor.get(th.authorId)} compact />
                      )}
                      <span className="text-ink-300">·</span>
                      <span className="font-medium text-ink-700">
                        {Math.max(th._count.messages - 1, 0)} {Math.max(th._count.messages - 1, 0) === 1 ? t("disc.reply") : t("disc.replies")}
                      </span>
                      <span className="text-ink-300">·</span>
                      <span>{formatRelative(th.lastActivityAt, relLabels, now)}</span>
                    </p>
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>
    </main>
  );
}
