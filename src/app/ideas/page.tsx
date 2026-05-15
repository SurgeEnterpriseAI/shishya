// /ideas — public board of feature requests submitted via the widget.
//
// Anyone can read the list. Signed-in students can upvote (one vote
// per user per idea, toggleable). Acts both as social proof (others
// have asked for this; vote so it rises) and dedup nudge (you can see
// the popular asks before submitting a duplicate).

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { IdeaCard } from "./IdeaCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ideas — what students want next | Shishya",
  description:
    "What students are asking us to build next. Upvote the ideas you want to see and add your own from any page.",
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

const STATUS_COPY: Record<string, { label: string; tone: string }> = {
  OPEN: { label: "Open", tone: "bg-ink-100 text-ink-700" },
  UNDER_REVIEW: { label: "Under review", tone: "bg-amber-100 text-amber-800" },
  PLANNED: { label: "Planned", tone: "bg-saffron-100 text-saffron-800" },
  SHIPPED: { label: "Shipped", tone: "bg-emerald-100 text-emerald-800" },
  DECLINED: { label: "Declined", tone: "bg-ink-100 text-ink-500" },
};

export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const { area } = await searchParams;

  const where: any = { status: { not: "DECLINED" as const } };
  if (area && (AREAS as readonly string[]).includes(area)) where.area = area;

  const requests = await prisma.featureRequest.findMany({
    where,
    orderBy: [{ upvoteCount: "desc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      title: true,
      body: true,
      area: true,
      examCode: true,
      upvoteCount: true,
      status: true,
      authorName: true,
      createdAt: true,
    },
  });

  const myUpvotes = userId
    ? new Set(
        (
          await prisma.featureRequestUpvote.findMany({
            where: { userId, requestId: { in: requests.map((r) => r.id) } },
            select: { requestId: true },
          })
        ).map((u) => u.requestId),
      )
    : new Set<string>();

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header />
      <section className="container-prose py-8">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> · Ideas
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900">Ideas board</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-600">
          What students are asking us to build next. Upvote the ones you want
          to see, or click the <span className="font-medium">💡 Suggest a feature</span>{" "}
          pill on any page to add your own.
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

        {requests.length === 0 ? (
          <p className="mt-10 rounded-md border border-dashed border-ink-300 bg-white p-6 text-center text-sm text-ink-500">
            No ideas in this area yet. Be the first to suggest one — click the
            pill at the bottom-right of any page.
          </p>
        ) : (
          <ul className="mt-8 space-y-3">
            {requests.map((r) => {
              const status = STATUS_COPY[r.status] ?? STATUS_COPY.OPEN;
              return (
                <li key={r.id}>
                  <IdeaCard
                    id={r.id}
                    title={r.title}
                    body={r.body}
                    area={r.area}
                    examCode={r.examCode}
                    authorName={r.authorName}
                    upvoteCount={r.upvoteCount}
                    statusLabel={status.label}
                    statusTone={status.tone}
                    upvotedByMe={myUpvotes.has(r.id)}
                    canUpvote={!!userId}
                    createdAt={r.createdAt.toISOString()}
                  />
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-10 text-center text-xs text-ink-400">
          {requests.length} idea{requests.length === 1 ? "" : "s"} shown.
        </p>
      </section>
    </main>
  );
}
