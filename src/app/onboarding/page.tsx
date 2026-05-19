// /onboarding — 30-second 3-question profile wizard.
//
// Asked the first time a signed-in user lands on / or /dashboard. The
// wizard captures:
//
//   1. Stage (Class 9-10 / Class 11-12 / UG / PG / Working / Other)
//   2. State (Indian state code)
//   3. Prep target (multi-select exam codes; pre-suggested based on stage)
//
// Submission writes to User.onbStage / onbState / onbPrepCodes /
// onbCompletedAt, then redirects to /. The homepage then renders a
// personalised hub instead of the generic 7-tile landing.
//
// Server component shell — client form below.

import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { OnboardingWizard } from "./OnboardingWizard";

export const metadata: Metadata = {
  title: "Welcome to Shishya — 30-second setup",
  robots: { index: false, follow: false },
};

interface ExamRow { code: string; shortName: string; name: string; category: string }
interface UserRow { onbCompletedAt: Date | null }

export default async function OnboardingPage({
  searchParams,
}: { searchParams: Promise<{ rerun?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/onboarding");

  const sp = await searchParams;
  const rerun = sp.rerun === "1";

  // If already completed AND this isn't an explicit rerun, send them
  // home. Re-running is opt-in via /me/settings.
  const userRows = await prisma.$queryRaw<UserRow[]>`
    SELECT "onbCompletedAt" FROM "User" WHERE "id" = ${session.user.id} LIMIT 1
  `;
  if (userRows[0]?.onbCompletedAt && !rerun) {
    redirect("/");
  }

  // Load the catalogue of active exams so step 3 can search across them.
  const exams = await prisma.$queryRaw<ExamRow[]>`
    SELECT "code", "shortName", "name", "category"::text AS category
    FROM "Exam"
    WHERE "active" = TRUE AND "category"::text != 'SCHOOL_BOARD'
    ORDER BY "candidatesPerYear" DESC NULLS LAST, "code" ASC
    LIMIT 100
  `;

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> · Welcome
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ink-900">
          Welcome to Shishya 👋
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-700">
          Three quick questions so we can show you the right content. Takes
          about 30 seconds. You can skip and pick later from{" "}
          <Link href="/me/settings" className="text-saffron-700 underline">profile settings</Link>.
        </p>

        <OnboardingWizard exams={exams} />
      </section>
    </main>
  );
}
