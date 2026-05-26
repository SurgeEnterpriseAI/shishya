// /i/batches — institution-admin view of all their batches.
//
// Server-renders the existing list, then renders the BatchCreateForm
// (client island) below. Creating a batch reloads the page so the
// new row appears without us needing a client-side store.

import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { requireInstitutionSession } from "@/lib/institution-auth";
import { BatchCreateForm } from "./BatchCreateForm";

export const metadata: Metadata = {
  title: "Batches | Institution dashboard | Shishya",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function InstitutionBatchesPage() {
  const { institution } = await requireInstitutionSession();

  const batches = await prisma.batch.findMany({
    where: { course: { institutionId: institution.id }, archived: false },
    orderBy: { createdAt: "desc" },
    include: {
      course: { select: { name: true, examCode: true } },
      _count: { select: { enrollments: true } },
    },
  });

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <section className="container-prose py-10">
        <div className="mx-auto max-w-3xl">
          <nav className="mb-2 text-xs text-ink-500">
            <Link
              href="/i/dashboard"
              className="font-medium text-saffron-700 hover:underline"
            >
              ← Dashboard
            </Link>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Cohorts &amp; batches
          </h1>
          <p className="mt-2 text-sm text-ink-600">
            One batch = one cohort of students taking the same course at the
            same time. Each batch gets a shareable invite link — share it with
            your students so they enrol in one tap.
          </p>

          {/* ── Create form ─────────────────────────────────── */}
          <div className="mt-8 rounded-xl border border-ink-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-ink-900">Add a new batch</h2>
            <p className="mt-1 text-xs text-ink-500">
              We&apos;ll create the course automatically if it doesn&apos;t exist
              yet.
            </p>
            <div className="mt-4">
              <BatchCreateForm />
            </div>
          </div>

          {/* ── Existing batches list ───────────────────────── */}
          <div className="mt-10">
            <h2 className="text-base font-semibold text-ink-900">
              Active batches ({batches.length})
            </h2>
            {batches.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-ink-300 bg-white p-8 text-center text-sm text-ink-500">
                No batches yet. Create one above to get started.
              </div>
            ) : (
              <ul className="mt-3 space-y-3">
                {batches.map((b) => (
                  <li
                    key={b.id}
                    className="rounded-xl border border-ink-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-ink-900">
                          {b.name}
                        </h3>
                        <p className="mt-0.5 text-xs text-ink-600">
                          {b.course.name}
                          {b.course.examCode && (
                            <span className="ml-2 rounded bg-saffron-100 px-1.5 py-0.5 text-[10px] font-semibold text-saffron-800">
                              {b.course.examCode.replace(/_/g, " ")}
                            </span>
                          )}
                        </p>
                        <p className="mt-1 text-xs text-ink-500">
                          {b.mode.toLowerCase()} ·{" "}
                          {b._count.enrollments}
                          {b.capacity ? ` / ${b.capacity}` : ""} enrolled
                          {b.startDate &&
                            ` · starts ${new Date(b.startDate).toLocaleDateString(
                              "en-IN",
                              { day: "numeric", month: "short", year: "numeric" },
                            )}`}
                        </p>
                      </div>
                      <Link
                        href={`/i/batches/${b.id}`}
                        className="rounded-md border border-ink-300 bg-white px-3 py-1.5 text-xs font-medium text-ink-800 hover:bg-ink-50"
                      >
                        Manage →
                      </Link>
                    </div>
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
