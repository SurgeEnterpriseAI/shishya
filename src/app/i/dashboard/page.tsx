// /i/dashboard — institution admin landing page.
//
// Stage-1 stub: confirms login worked, shows the institution's basic
// stats, and links to the (still-to-build) /i/profile and /i/batches.
// Subsequent commits expand this into a real management surface.
//
// All /i/* routes call requireInstitutionSession() — unauthenticated
// visitors redirect to /login/institution.

import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { requireInstitutionSession } from "@/lib/institution-auth";

export const metadata: Metadata = {
  title: "Institution dashboard | Shishya",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function InstitutionDashboardPage() {
  const { institution, user } = await requireInstitutionSession();

  // Cheap aggregate counts for the welcome panel.
  const [courseCount, batchCount, studentCount] = await Promise.all([
    prisma.course.count({ where: { institutionId: institution.id } }),
    prisma.batch.count({ where: { course: { institutionId: institution.id }, archived: false } }),
    prisma.batchEnrollment.count({
      where: { batch: { course: { institutionId: institution.id } }, status: "ACTIVE" },
    }),
  ]);

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <section className="container-prose py-10">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
              Institution dashboard
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
              Welcome back, {user.name}
            </h1>
            <p className="mt-1 text-sm text-ink-600">
              You&apos;re logged in as <span className="font-medium">{user.email}</span>{" "}
              · admin of{" "}
              <Link
                href={`/institutions/${institution.slug}`}
                className="font-medium text-saffron-700 underline-offset-2 hover:underline"
              >
                {institution.name}
              </Link>
            </p>
          </div>
          <form action="/api/institutions/logout" method="POST">
            <button
              type="submit"
              className="rounded-md border border-ink-300 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50"
            >
              Sign out
            </button>
          </form>
        </div>

        {/* Stats strip */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          <Stat label="Courses" value={courseCount} href="/i/batches" />
          <Stat label="Active batches" value={batchCount} href="/i/batches" />
          <Stat label="Enrolled students" value={studentCount} href="/i/batches" />
        </div>

        {/* Verification status banner */}
        {!institution.verified && (
          <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">
              ⏳ Your listing is pending Shishya verification
            </p>
            <p className="mt-1 text-amber-800">
              We&apos;ll review your details within 24 hours and add the green
              ✓ to your public profile. Until then your profile is live but
              labelled &quot;Pending verification&quot;. No action needed.
            </p>
          </div>
        )}

        {/* Action cards */}
        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ActionCard
            icon="✏️"
            title="Edit your public profile"
            body="Update tagline, description, logo, contact details, location, exams covered, and modes (online/offline/hybrid)."
            href="/i/profile"
          />
          <ActionCard
            icon="🎓"
            title="Manage cohorts & students"
            body="Create courses, set up batches, share an invite link with your students so they enrol in one click."
            href="/i/batches"
          />
          <ActionCard
            icon="👁️"
            title="See your public profile"
            body="What aspirants see when they land on your listing from Shishya search or the directory."
            href={`/institutions/${institution.slug}`}
          />
          <ActionCard
            icon="📊"
            title="Student progress"
            body="Coming soon — per-student mastery scores, attempt history, and class leaderboards for every active batch."
            href="#"
            disabled
          />
        </div>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-ink-200 bg-white p-4 text-center shadow-sm transition-colors hover:border-saffron-400"
    >
      <p className="text-2xl font-bold tabular-nums text-ink-900">{value}</p>
      <p className="mt-0.5 text-[11px] uppercase tracking-wider text-ink-500">
        {label}
      </p>
    </Link>
  );
}

function ActionCard({
  icon,
  title,
  body,
  href,
  disabled = false,
}: {
  icon: string;
  title: string;
  body: string;
  href: string;
  disabled?: boolean;
}) {
  const className =
    "group flex h-full items-start gap-4 rounded-xl border border-ink-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-saffron-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-saffron-300";
  const inner = (
    <>
      <span className="text-2xl" aria-hidden>
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-base font-semibold text-ink-900">{title}</span>
        <span className="mt-1 block text-sm leading-snug text-ink-600">{body}</span>
        {disabled && (
          <span className="mt-2 inline-block text-[10px] font-semibold uppercase tracking-wider text-ink-400">
            Coming soon
          </span>
        )}
      </span>
    </>
  );
  if (disabled) {
    return <div className={`${className} opacity-50 hover:translate-y-0`}>{inner}</div>;
  }
  return (
    <Link href={href} prefetch={false} className={className}>
      {inner}
    </Link>
  );
}
