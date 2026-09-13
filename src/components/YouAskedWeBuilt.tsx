// "You asked for this — it's on Shishya" (13 Sep 2026): the student side of
// the /ideas loop on the dashboard.
//
// Shows up to 3 ideas THIS student suggested, or upvoted before they were
// marked built, that the team marked built in the last 30 days — each with
// the team's one-line note, the deep link and a forward to their prep group.
// Renders nothing otherwise: no generic "we built X" marketing, no counts.
// Copy is sequence-neutral (src/lib/feature-requests.ts): the date is the
// day it was MARKED, and nothing claims it was built because they asked —
// a marked item may have existed before the ask.
// Server component; one indexed query, best-effort (a failure renders
// nothing, never a broken dashboard).

import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { ShareExamButton } from "@/components/ShareExamButton";
import {
  BUILT_FOR_YOU_DAYS,
  builtForYouHeading,
  builtForYouShareMessage,
  markedBuiltLabel,
  selectBuiltForYou,
} from "@/lib/feature-requests";

export async function YouAskedWeBuilt({ userId }: { userId: string }) {
  const now = new Date();
  // updatedAt is always >= the ship moment (the ship write sets it), so
  // this is a safe superset of "built in the last 30 days".
  const since = new Date(now.getTime() - BUILT_FOR_YOU_DAYS * 86_400_000);
  const rows = await prisma.featureRequest
    .findMany({
      where: {
        status: "SHIPPED",
        updatedAt: { gte: since },
        OR: [{ authorId: userId }, { upvotes: { some: { userId } } }],
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        status: true,
        adminNote: true,
        authorId: true,
        upvotes: { where: { userId }, select: { createdAt: true }, take: 1 },
      },
    })
    .catch(() => []);

  const items = selectBuiltForYou(
    rows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      adminNote: r.adminNote,
      authorId: r.authorId,
      myUpvoteAt: r.upvotes[0]?.createdAt ?? null,
    })),
    userId,
    now,
  );
  if (items.length === 0) return null;

  const heading = `💡 ${builtForYouHeading(items.map((i) => i.role))}`;

  return (
    <section className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
      <p className="text-sm font-bold text-ink-900">{heading}</p>
      <ul className="mt-3 space-y-3">
        {items.map((i) => (
          <li key={i.id} className="rounded-lg border border-emerald-100 bg-white p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">
              {i.role === "asked" ? "You suggested" : "You upvoted"} · {markedBuiltLabel(i.shippedAt, { capital: false })}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-ink-900">{i.title}</p>
            <p className="mt-1 text-sm text-ink-700">
              <span className="font-medium">What we built:</span> {i.note}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link href={i.link} prefetch={false} className="text-sm font-bold text-emerald-700 hover:text-emerald-800">
                Open it →
              </Link>
              <ShareExamButton
                url={i.link}
                message={builtForYouShareMessage(i.role, i.title)}
                label="Tell your prep group:"
                surface="you-asked-we-built"
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
