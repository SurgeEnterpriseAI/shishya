// /join/[inviteCode] — student-facing batch-join landing page.
//
// Flow:
//   1. Visitor opens the link the institution shared.
//   2. We look up the batch by inviteCode. 404 if unknown.
//   3. If not signed in (as a student), bounce to /login with
//      callbackUrl back to this same page.
//   4. If signed in, show a confirmation card: institution name,
//      course, batch name, capacity. Single button: "Join this batch".
//   5. POST → /api/join/[inviteCode] creates the BatchEnrollment.
//   6. Redirect to /dashboard with a success toast.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { JoinBatchButton } from "./JoinBatchButton";

export const metadata: Metadata = {
  title: "Join a batch | Shishya",
  robots: { index: false }, // don't index invite URLs
};

export const dynamic = "force-dynamic";

export default async function JoinBatchPage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const { inviteCode } = await params;

  const batch = await prisma.batch.findUnique({
    where: { inviteCode },
    include: {
      course: {
        include: {
          institution: {
            select: { id: true, slug: true, name: true, logoUrl: true, verified: true },
          },
        },
      },
      _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
    },
  });
  if (!batch || batch.archived) notFound();
  if (!batch.course.institution) notFound();

  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;

  // Check existing enrollment so the button can say "Already joined"
  // instead of submitting a duplicate.
  let existing: { status: string } | null = null;
  if (userId) {
    existing = await prisma.batchEnrollment.findUnique({
      where: { batchId_userId: { batchId: batch.id, userId } },
      select: { status: true },
    });
  }
  const full =
    batch.capacity != null && batch._count.enrollments >= batch.capacity;

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <section className="container-prose py-14">
        <div className="mx-auto max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
            Batch invite
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Join {batch.course.institution.name}
          </h1>
          <p className="mt-2 text-sm text-ink-600">
            You&apos;ve been invited to join the{" "}
            <span className="font-semibold text-ink-800">{batch.name}</span> batch
            for{" "}
            <span className="font-semibold text-ink-800">
              {batch.course.name}
            </span>
            .
          </p>

          <div className="mt-8 rounded-xl border border-ink-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              {batch.course.institution.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={batch.course.institution.logoUrl}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-ink-200"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-saffron-100 text-xl font-bold text-saffron-800">
                  {batch.course.institution.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-base font-semibold text-ink-900">
                  {batch.course.institution.name}
                  {batch.course.institution.verified && (
                    <span className="ml-1.5 text-emerald-600" aria-label="verified">
                      ✓
                    </span>
                  )}
                </p>
                <p className="text-xs text-ink-500">
                  Mode: {batch.mode.toLowerCase()}
                  {batch.capacity && (
                    <>
                      {" "}
                      · {batch._count.enrollments} / {batch.capacity} seats taken
                    </>
                  )}
                  {batch.startDate && (
                    <>
                      {" "}
                      · starts{" "}
                      {new Date(batch.startDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-6 border-t border-ink-100 pt-5">
              {!userId ? (
                <>
                  <p className="text-sm text-ink-600">
                    Sign in with Google to join this batch — takes a second.
                  </p>
                  <Link
                    href={`/login?callbackUrl=${encodeURIComponent(`/join/${inviteCode}`)}`}
                    className="mt-3 inline-block rounded-md bg-saffron-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-saffron-600"
                  >
                    Sign in with Google →
                  </Link>
                </>
              ) : existing && existing.status === "ACTIVE" ? (
                <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  ✓ You&apos;re already enrolled in this batch.{" "}
                  <Link
                    href="/dashboard"
                    className="font-semibold underline-offset-2 hover:underline"
                  >
                    Go to dashboard →
                  </Link>
                </p>
              ) : full && (!existing || existing.status !== "ACTIVE") ? (
                <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  Sorry — this batch is full. Ping{" "}
                  <Link
                    href={`/institutions/${batch.course.institution.slug}`}
                    className="font-semibold underline-offset-2 hover:underline"
                  >
                    {batch.course.institution.name}
                  </Link>{" "}
                  to ask about other batches.
                </p>
              ) : (
                <JoinBatchButton inviteCode={inviteCode} />
              )}
            </div>
          </div>

          <p className="mt-4 text-center text-[11px] text-ink-500">
            By joining you share your name, email and progress data with the
            institution. You can leave the batch any time from your dashboard.
          </p>
        </div>
      </section>
    </main>
  );
}
