// /discussions/[id] — full thread view, public read.
// Server component fetches and renders messages; reply form is a client island.

import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getT } from "@/lib/i18n-server";
import { formatRelative } from "@/lib/relative-time";
import { ReplyForm } from "./ReplyForm";
import { UserBadge, type UserBadgeLevel } from "@/components/UserBadge";

export const revalidate = 0; // always fresh on direct page load

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const thread = await prisma.discussion
    .findUnique({ where: { id }, select: { title: true } })
    .catch(() => null);
  if (!thread) return { title: "Discussion — Shishya" };
  return {
    title: `${thread.title} — Shishya Discussions`,
    description: `Aspirants discussing: ${thread.title}. Read the thread and join the conversation free on Shishya.`,
    alternates: { canonical: `https://shishya.in/discussions/${id}` },
  };
}

export default async function DiscussionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ t }, session] = await Promise.all([getT(), auth().catch(() => null)]);

  const thread = await prisma.discussion.findUnique({
    where: { id },
    include: {
      exam: { select: { code: true, shortName: true } },
      messages: { orderBy: { createdAt: "asc" }, take: 200 },
    },
  });
  if (!thread) notFound();

  // Batch-fetch badge levels for all unique authorIds in this thread.
  const authorIds = Array.from(new Set([
    thread.authorId,
    ...thread.messages.map((m) => m.authorId).filter(Boolean) as string[],
  ].filter(Boolean) as string[]));
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
  const myUserId = session?.user?.id ?? null;
  const youLabel = t("disc.thread.you");

  return (
    <main className="min-h-screen bg-ink-50/40">
      <header className="border-b border-ink-200/50 bg-white/80 backdrop-blur">
        <div className="container-prose flex h-16 items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-saffron-500 text-lg font-bold text-white">
              शि
            </span>
            <span className="text-lg font-semibold tracking-tight text-ink-900">Shishya</span>
          </Link>
          <Link href="/discussions" className="text-sm text-ink-700 hover:text-ink-900">
            ← {t("nav.dashboard").replace("Dashboard", "Discussions")}
          </Link>
        </div>
      </header>

      <section className="container-prose py-8 sm:py-12">
        {/* ── Thread header ─────────────────────────────────────── */}
        <div className="rounded-lg border border-ink-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-baseline gap-2">
            {thread.exam && (
              <Link
                href={`/exams/${thread.exam.code}`}
                className="rounded bg-saffron-100 px-2 py-0.5 text-xs font-medium text-saffron-800 hover:bg-saffron-200"
              >
                {thread.exam.shortName}
              </Link>
            )}
            {thread.pinned && (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Pinned
              </span>
            )}
            {thread.locked && (
              <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800">
                Locked
              </span>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-bold text-ink-900 sm:text-3xl">{thread.title}</h1>
          <p className="mt-2 flex flex-wrap items-baseline gap-1.5 text-xs text-ink-500">
            <span className="font-medium text-ink-700">{thread.authorName ?? "Anonymous"}</span>
            {thread.authorId && <UserBadge level={badgeByAuthor.get(thread.authorId)} />}
            <span className="text-ink-300">·</span>
            <span>{formatRelative(thread.createdAt, relLabels, now)}</span>
            <span className="text-ink-300">·</span>
            <span>{thread.messageCount} {thread.messageCount === 1 ? t("disc.reply") : t("disc.replies")}</span>
          </p>
        </div>

        {/* ── Messages ──────────────────────────────────────────── */}
        <ol className="mt-6 space-y-3">
          {thread.messages.map((m, i) => {
            const isYou = myUserId && m.authorId === myUserId;
            // Backwards-compat: handle both the legacy "Shishya AI" author
            // name (still in older DB rows) and the new "Shishya" — render
            // both as the simple "Shishya" brand.
            const isShishya = m.authorName === "Shishya AI" || m.authorName === "Shishya";
            const displayName = isShishya ? "Shishya" : (m.authorName ?? "Anonymous");
            return (
              <li
                key={m.id}
                className={
                  isShishya
                    ? "rounded-lg border border-saffron-200 bg-saffron-50/40 p-5"
                    : isYou
                    ? "rounded-lg border border-emerald-200 bg-emerald-50/40 p-5"
                    : "rounded-lg border border-ink-200 bg-white p-5"
                }
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="flex flex-wrap items-baseline gap-1.5 text-sm font-semibold text-ink-900">
                    <span>{displayName}</span>
                    {m.authorId && <UserBadge level={badgeByAuthor.get(m.authorId)} compact />}
                    {isYou && <span className="text-xs font-normal text-emerald-700">({youLabel})</span>}
                    {isShishya && <span className="text-xs font-normal text-saffron-700">🤖</span>}
                  </p>
                  <p className="text-xs text-ink-500">
                    {i === 0 ? "" : "#" + (i + 1) + " · "}
                    {formatRelative(m.createdAt, relLabels, now)}
                  </p>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-800">
                  {m.content}
                </p>
              </li>
            );
          })}
        </ol>

        {/* ── Reply box ─────────────────────────────────────────── */}
        <div className="mt-6">
          {thread.locked ? (
            <p className="rounded-lg border border-ink-200 bg-ink-50 p-4 text-center text-sm text-ink-500">
              {t("disc.thread.locked")}
            </p>
          ) : session?.user?.id ? (
            <ReplyForm
              threadId={thread.id}
              labels={{
                placeholder: t("disc.thread.replyPlaceholder"),
                send: t("disc.thread.send"),
              }}
            />
          ) : (
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(`/discussions/${thread.id}`)}`}
              className="block rounded-lg border-2 border-dashed border-saffron-300 bg-saffron-50/60 p-5 text-center text-sm font-medium text-saffron-800 hover:bg-saffron-50"
            >
              {t("disc.thread.signinToReply")} →
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
