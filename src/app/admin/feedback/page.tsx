// /admin/feedback — operator-facing triage panel for in-product
// feature requests.
//
// Lists every request (incl. DECLINED, unlike the public /ideas view)
// with a status changer + optional note. The triage UI is a small
// client island per row so admins can mark + comment without a full
// page reload.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { isCurrentUserAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db/prisma";
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
  const where: any = {};
  if (status && ["OPEN", "UNDER_REVIEW", "PLANNED", "SHIPPED", "DECLINED"].includes(status)) {
    where.status = status;
  }

  const requests = await prisma.featureRequest.findMany({
    where,
    orderBy: [
      { status: "asc" }, // OPEN first alphabetically
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
  });

  const counts: Record<string, number> = {};
  for (const r of requests) counts[r.status] = (counts[r.status] ?? 0) + 1;

  const STATUSES = ["OPEN", "UNDER_REVIEW", "PLANNED", "SHIPPED", "DECLINED"] as const;

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header admin />
      <section className="container-prose py-8">
        <p className="text-xs text-ink-500">
          <Link href="/admin" className="hover:text-ink-800">Admin</Link> · Feedback
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900">Feature requests</h1>
        <p className="mt-1 text-sm text-ink-600">
          Submitted via the in-product widget. Status + admin note are
          editable inline.
        </p>

        {/* Status filters */}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/admin/feedback"
            className={
              !status
                ? "rounded-full border border-saffron-300 bg-saffron-50 px-3 py-1 text-xs font-medium text-saffron-900"
                : "rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-medium text-ink-700 hover:bg-ink-50"
            }
          >
            All ({requests.length})
          </Link>
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={`/admin/feedback?status=${s}`}
              className={
                status === s
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
            No requests {status ? `in ${status}` : "yet"}.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {requests.map((r) => (
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
                  adminNote={r.adminNote}
                  createdAt={r.createdAt.toISOString()}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
