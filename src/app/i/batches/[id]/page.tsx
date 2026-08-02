// /i/batches/[id] — per-batch admin view.
//
// Shows:
//   - The invite link (copy-able) so the admin shares it with students
//   - The list of enrolled students with their email + join date
//   - Course/batch meta + a "remove student" form per row
//
// Server component does the data fetch + ownership check. Removal
// happens via a small client component (RemoveStudentButton) that
// POSTs to /api/i/batches/[id]/remove.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { requireInstitutionSession } from "@/lib/institution-auth";
import { InviteLinkCopy } from "./InviteLinkCopy";
import { RemoveStudentButton } from "./RemoveStudentButton";

export const metadata: Metadata = {
  title: "Manage batch | Institution dashboard | Shishya",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function BatchManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { institution } = await requireInstitutionSession();
  const { id } = await params;

  const batch = await prisma.batch.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, name: true, examCode: true, institutionId: true } },
      enrollments: {
        where: { status: "ACTIVE" },
        orderBy: { enrolledAt: "desc" },
        include: {
          user: {
            select: { id: true, email: true, name: true, image: true },
          },
        },
      },
    },
  });

  // Ownership check — a batch is only visible to admins of THEIR
  // institution. Anyone else gets a 404 (not a 403, so we don't even
  // confirm the batch exists).
  if (!batch || batch.course.institutionId !== institution.id) notFound();

  const inviteUrl = `https://shishya.in/join/${batch.inviteCode}`;

  // ── Batch progress analytics ──────────────────────────────────────
  // The educator's "what the big apps never show you" view: per-student
  // practice volume, average score and last-active, plus the batch's
  // weakest topics — so the next class targets exactly where the batch
  // bleeds marks. One aggregate query per concern, only when students
  // exist. (Batch-wide topic drill-down = phase 2.)
  const memberIds = batch.enrollments.map((e) => e.user.id);
  type StuStat = { userId: string; total: bigint; wk: bigint; avgPct: number | null; lastAt: Date | null };
  const stuStats: StuStat[] = memberIds.length
    ? await prisma.$queryRaw<StuStat[]>`
        SELECT "userId",
               COUNT(*) AS total,
               COUNT(*) FILTER (WHERE "finishedAt" > NOW() - INTERVAL '7 days') AS wk,
               AVG("scorePct") AS "avgPct",
               MAX("finishedAt") AS "lastAt"
        FROM "Attempt"
        WHERE "userId" = ANY(${memberIds}) AND status IN ('SUBMITTED', 'AUTO_SUBMITTED')
        GROUP BY "userId"
      `.catch(() => [])
    : [];
  const statBy = new Map(stuStats.map((s) => [s.userId, s]));
  const batchMocks = stuStats.reduce((a, s) => a + Number(s.total), 0);
  const batchMocksWk = stuStats.reduce((a, s) => a + Number(s.wk), 0);
  const scored = stuStats.filter((s) => s.avgPct != null);
  const batchAvg = scored.length
    ? Math.round(scored.reduce((a, s) => a + (s.avgPct ?? 0), 0) / scored.length)
    : null;
  const activeWk = stuStats.filter((s) => Number(s.wk) > 0).length;
  const fmtLast = (d: Date | null) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—";

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <section className="container-prose py-10">
        <div className="mx-auto max-w-3xl">
          <nav className="mb-2 text-xs text-ink-500">
            <Link
              href="/i/batches"
              className="font-medium text-saffron-700 hover:underline"
            >
              ← Batches
            </Link>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            {batch.name}
          </h1>
          <p className="mt-1 text-sm text-ink-600">
            {batch.course.name}
            {batch.course.examCode && (
              <span className="ml-2 rounded bg-saffron-100 px-1.5 py-0.5 text-[10px] font-semibold text-saffron-800">
                {batch.course.examCode.replace(/_/g, " ")}
              </span>
            )}
            <span className="mx-2 text-ink-400">·</span>
            {batch.mode.toLowerCase()}
            {batch.capacity && (
              <>
                <span className="mx-2 text-ink-400">·</span>
                {batch.enrollments.length} / {batch.capacity} enrolled
              </>
            )}
          </p>

          {/* ── Invite link card ───────────────────────────── */}
          <div className="mt-8 rounded-xl border border-saffron-300 bg-saffron-50/60 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-saffron-900">
              📨 Share this link with your students
            </h2>
            <p className="mt-1 text-xs text-saffron-800">
              Anyone with this link can join this batch after signing in with
              Google. The link doesn&apos;t expire. Share it on WhatsApp,
              email, or wherever you talk to your batch.
            </p>
            <div className="mt-3">
              <InviteLinkCopy url={inviteUrl} />
            </div>
          </div>

          {/* ── Batch progress summary ─────────────────────── */}
          {batch.enrollments.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "mocks completed", value: String(batchMocks) },
                { label: "mocks this week", value: String(batchMocksWk) },
                { label: "batch avg score", value: batchAvg != null ? `${batchAvg}%` : "—" },
                { label: "active this week", value: `${activeWk}/${batch.enrollments.length}` },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-ink-200 bg-white p-3 text-center">
                  <p className="text-xl font-bold tabular-nums text-ink-900">{s.value}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wide text-ink-500">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Enrolled students ──────────────────────────── */}
          <div className="mt-10">
            <h2 className="text-base font-semibold text-ink-900">
              Enrolled students ({batch.enrollments.length})
            </h2>
            {batch.enrollments.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-ink-300 bg-white p-8 text-center text-sm text-ink-500">
                No students yet. Share the invite link above to onboard your
                first cohort.
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-ink-100 rounded-xl border border-ink-200 bg-white shadow-sm">
                {batch.enrollments.map((en) => (
                  <li
                    key={en.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {en.user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={en.user.image}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-full"
                        />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-saffron-100 text-xs font-semibold text-saffron-800">
                          {(en.user.name ?? en.user.email).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-900">
                          {en.user.name ?? en.user.email.split("@")[0]}
                        </p>
                        <p className="truncate text-xs text-ink-500">
                          {en.user.email} · joined{" "}
                          {new Date(en.enrolledAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                        {(() => {
                          const s = statBy.get(en.user.id);
                          return (
                            <p className="truncate text-[11px] text-ink-600">
                              📝 <span className="tabular-nums font-medium">{Number(s?.total ?? 0)}</span> mocks
                              {" · "}wk <span className="tabular-nums font-medium">{Number(s?.wk ?? 0)}</span>
                              {" · "}avg{" "}
                              <span className="tabular-nums font-medium">
                                {s?.avgPct != null ? `${Math.round(s.avgPct)}%` : "—"}
                              </span>
                              {" · "}last {fmtLast(s?.lastAt ?? null)}
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                    <RemoveStudentButton enrollmentId={en.id} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
