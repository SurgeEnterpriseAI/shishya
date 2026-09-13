// /admin/feedback — operator-facing triage panel for in-product
// feature requests, and (13 Sep 2026) the ONE place an idea is marked
// built and the people who asked are told.
//
// Lists every request (incl. DECLINED, unlike the public /ideas view)
// with a status changer + private note. Marking BUILT opens a small form
// per row: one-line "what we built", a shishya.in link, and the admin's
// depth check — the server refuses SHIPPED without all three. The system
// never suggests or decides that something is built.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { isCurrentUserAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db/prisma";
import { FEATURE_REQUEST_STATUSES, isFeatureRequestStatus, parseAdminNote } from "@/lib/feature-requests";
import { FeedbackRow } from "./FeedbackRow";

export const dynamic = "force-dynamic";

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { isAdmin } = await isCurrentUserAdmin();
  if (!isAdmin) redirect("/");

  const { status } = await searchParams;
  const filter = isFeatureRequestStatus(status) ? status : null;

  const [requests, grouped] = await Promise.all([
    prisma.featureRequest.findMany({
      where: filter ? { status: filter } : {},
      orderBy: [
        { status: "asc" }, // enum order: OPEN first
        { upvoteCount: "desc" },
        { createdAt: "desc" },
      ],
      take: 200,
      select: {
        id: true,
        title: true,
        body: true,
        area: true,
        routePath: true,
        examCode: true,
        authorName: true,
        authorEmail: true,
        upvoteCount: true,
        status: true,
        adminNote: true,
        createdAt: true,
      },
    }),
    prisma.featureRequest.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  // Counts over ALL requests, not just the filtered page.
  const counts: Record<string, number> = {};
  for (const g of grouped) counts[g.status] = g._count._all;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header admin />
      <section className="container-prose py-8">
        <p className="text-xs text-ink-500">
          <Link href="/admin" className="hover:text-ink-800">Admin</Link> · Feedback
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900">Feature requests</h1>
        <p className="mt-1 text-sm text-ink-600">
          Submitted via the in-product widget. Status and private note are editable inline.
        </p>

        <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-ink-800">
          <p className="font-semibold text-ink-900">Marking an idea Built is your call — the system never makes it.</p>
          <p className="mt-1">
            Nothing here marks anything built for you: no script, no match against code comments.
            Verify depth before you mark — open the link and use the feature the way this student
            asked for it (every exam it claims, not one sample page).
          </p>
          <p className="mt-1">
            Built needs a one-line &ldquo;what we built&rdquo; and a shishya.in link. Saving tells the
            student who asked and everyone who upvoted before that moment: one in-app notice and at most
            one plain email each (opt-outs respected). It cannot be unsent. Saving again never tells
            anyone twice; moving an idea out of Built removes it from /ideas&rsquo; Built list and from
            dashboards.
          </p>
        </div>

        {/* Status filters */}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/admin/feedback"
            className={
              !filter
                ? "rounded-full border border-saffron-300 bg-saffron-50 px-3 py-1 text-xs font-medium text-saffron-900"
                : "rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-medium text-ink-700 hover:bg-ink-50"
            }
          >
            All ({total})
          </Link>
          {FEATURE_REQUEST_STATUSES.map((s) => (
            <Link
              key={s}
              href={`/admin/feedback?status=${s}`}
              className={
                filter === s
                  ? "rounded-full border border-saffron-300 bg-saffron-50 px-3 py-1 text-xs font-medium text-saffron-900"
                  : "rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-medium text-ink-700 hover:bg-ink-50"
              }
            >
              {s.replace("_", " ")} ({counts[s] ?? 0})
            </Link>
          ))}
        </div>

        {requests.length === 0 ? (
          <p className="mt-10 rounded-md border border-dashed border-ink-300 bg-white p-6 text-center text-sm text-ink-500">
            No requests {filter ? `in ${filter}` : "yet"}.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {requests.map((r) => {
              const parsed = parseAdminNote(r.adminNote);
              return (
                <li key={r.id}>
                  <FeedbackRow
                    id={r.id}
                    title={r.title}
                    body={r.body}
                    area={r.area}
                    routePath={r.routePath}
                    examCode={r.examCode}
                    authorName={r.authorName}
                    authorEmail={r.authorEmail}
                    upvoteCount={r.upvoteCount}
                    status={r.status}
                    ship={parsed.ship}
                    privateNote={parsed.privateNote}
                    createdAt={r.createdAt.toISOString()}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
