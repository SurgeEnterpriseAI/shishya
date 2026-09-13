// /ideas — public board of feature requests submitted via the widget.
//
// Anyone can read the list. Signed-in students can upvote open ideas (one
// vote per user per idea, toggleable).
//
// 13 Sep 2026 (close the loop): the audit found 15 of 16 ideas reading
// "Open" although at least 5 were built. Now what the team MARKED built
// comes first, each with its one-line "what we built" and a link to it;
// open / under review / planned ideas follow, by upvotes. DECLINED stays
// off the public board. The admin's private triage note never leaves the
// server — only the parsed ship record (note, link, date) reaches the card.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import {
  BUILT_WITHOUT_RECORD_LINE,
  OPEN_BOARD_STATUSES,
  PUBLIC_STATUS_LABEL,
  STATUS_TONE,
  isFeatureRequestStatus,
  markedBuiltLabel,
  splitIdeasBoard,
} from "@/lib/feature-requests";
import { IdeaCard } from "./IdeaCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ideas — what students asked for, and what's built | Shishya",
  description:
    "What students asked Shishya to build: the ideas the team has marked built, and the open ideas you can upvote next.",
  alternates: { canonical: "https://shishya.in/ideas" },
};

const AREAS = [
  "Mock tests",
  "AI Tutor",
  "Translations",
  "Results & Rank",
  "UI / Navigation",
  "Other",
] as const;

const SELECT = {
  id: true,
  title: true,
  body: true,
  area: true,
  examCode: true,
  upvoteCount: true,
  status: true,
  adminNote: true,
  authorName: true,
  createdAt: true,
} as const;

export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const { area } = await searchParams;
  const areaFilter = area && (AREAS as readonly string[]).includes(area) ? { area } : {};

  const [builtRows, openRows] = await Promise.all([
    prisma.featureRequest.findMany({
      where: { ...areaFilter, status: "SHIPPED" },
      orderBy: { updatedAt: "desc" },
      take: 60,
      select: SELECT,
    }),
    prisma.featureRequest.findMany({
      where: { ...areaFilter, status: { in: [...OPEN_BOARD_STATUSES] } },
      orderBy: [{ upvoteCount: "desc" }, { createdAt: "desc" }],
      take: 100,
      select: SELECT,
    }),
  ]);
  const { built, open } = splitIdeasBoard([...builtRows, ...openRows]);

  const myUpvotes = userId
    ? new Set(
        (
          await prisma.featureRequestUpvote.findMany({
            where: { userId, requestId: { in: open.map((r) => r.id) } },
            select: { requestId: true },
          })
        ).map((u) => u.requestId),
      )
    : new Set<string>();

  const labelFor = (s: string) => (isFeatureRequestStatus(s) ? PUBLIC_STATUS_LABEL[s] : PUBLIC_STATUS_LABEL.OPEN);
  const toneFor = (s: string) => (isFeatureRequestStatus(s) ? STATUS_TONE[s] : STATUS_TONE.OPEN);

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header />
      <section className="container-prose py-8">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> · Ideas
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900">Ideas board</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-600">
          What students asked us to build — what is built so far, and what is still open.
          Upvote the open ones you want next, or click the{" "}
          <span className="font-medium">💡 Suggest a feature</span> pill on any page to add your own.
        </p>

        {/* Area filters */}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/ideas"
            className={
              !area
                ? "rounded-full border border-saffron-300 bg-saffron-50 px-3 py-1 text-xs font-medium text-saffron-900"
                : "rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-medium text-ink-700 hover:bg-ink-50"
            }
          >
            All
          </Link>
          {AREAS.map((a) => (
            <Link
              key={a}
              href={`/ideas?area=${encodeURIComponent(a)}`}
              className={
                area === a
                  ? "rounded-full border border-saffron-300 bg-saffron-50 px-3 py-1 text-xs font-medium text-saffron-900"
                  : "rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-medium text-ink-700 hover:bg-ink-50"
              }
            >
              {a}
            </Link>
          ))}
        </div>

        {built.length === 0 && open.length === 0 ? (
          <p className="mt-10 rounded-md border border-dashed border-ink-300 bg-white p-6 text-center text-sm text-ink-500">
            No ideas in this area yet. Be the first to suggest one — click the
            pill at the bottom-right of any page.
          </p>
        ) : (
          <>
            {built.length > 0 && (
              <section className="mt-8" aria-labelledby="ideas-built">
                <h2 id="ideas-built" className="text-base font-semibold text-ink-900">Built</h2>
                <p className="mt-1 text-xs text-ink-600">
                  Ideas the Shishya team has marked built. The date is the day it was marked, not
                  necessarily the day it went live.
                </p>
                <ul className="mt-3 space-y-3">
                  {built.map(({ row, ship }) => (
                    <li key={row.id}>
                      <IdeaCard
                        id={row.id}
                        title={row.title}
                        body={row.body}
                        area={row.area}
                        examCode={row.examCode}
                        authorName={row.authorName}
                        upvoteCount={row.upvoteCount}
                        statusLabel={labelFor(row.status)}
                        statusTone={toneFor(row.status)}
                        upvotedByMe={false}
                        canUpvote={false}
                        votingClosed
                        ship={ship ? { note: ship.note, link: ship.link, markedLabel: markedBuiltLabel(ship.shippedAt) } : null}
                        noRecordLine={ship ? undefined : BUILT_WITHOUT_RECORD_LINE}
                        createdAt={row.createdAt.toISOString()}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-8" aria-labelledby="ideas-open">
              <h2 id="ideas-open" className="text-base font-semibold text-ink-900">Still open</h2>
              <p className="mt-1 text-xs text-ink-600">
                {userId ? "Upvote the ones you want built next." : "Sign in to upvote the ones you want built next."}
              </p>
              {open.length === 0 ? (
                <p className="mt-3 rounded-md border border-dashed border-ink-300 bg-white p-4 text-center text-sm text-ink-500">
                  No open ideas in this area. Suggest one from the pill at the bottom-right of any page.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {open.map((r) => (
                    <li key={r.id}>
                      <IdeaCard
                        id={r.id}
                        title={r.title}
                        body={r.body}
                        area={r.area}
                        examCode={r.examCode}
                        authorName={r.authorName}
                        upvoteCount={r.upvoteCount}
                        statusLabel={labelFor(r.status)}
                        statusTone={toneFor(r.status)}
                        upvotedByMe={myUpvotes.has(r.id)}
                        canUpvote={!!userId}
                        createdAt={r.createdAt.toISOString()}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        <p className="mt-10 text-center text-xs text-ink-400">
          {built.length} built · {open.length} open shown.
        </p>
      </section>
    </main>
  );
}
