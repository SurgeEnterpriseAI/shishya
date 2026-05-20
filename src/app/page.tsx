// / — the Shishya homepage.
//
// Exam-first surface (current strategy until 100k users). The lifecycle
// section tiles (Schooling, Colleges, Scholarships, etc.) used to live
// here but are intentionally removed — those routes stay live for SEO
// but the homepage is dedicated to driving exam discovery + signup.
//
// Two render modes:
//   * Anonymous or signed-out: hero + search + popular exams strip.
//   * Signed-in + onboarding complete: PersonalisedHub at the top
//     (Your prep · Your state · Your stage), then the same exam
//     discovery surface below for cross-exam browsing.
//   * Signed-in + onboarding NOT complete: redirect to /onboarding.
//
// Live counters fetch client-side via /api/live-counts.

import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { LiveCountersStrip } from "@/components/LiveCounters";
import { PersonalisedHub } from "@/components/PersonalisedHub";
import { ExamSearchBox } from "@/app/exams/browse/ExamSearchBox";
import { prisma } from "@/lib/db/prisma";
import { unstable_cache } from "next/cache";
import { auth } from "@/lib/auth";

// Cannot cache statically — homepage now branches on auth + user profile.
export const revalidate = 0;
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shishya — Free preparation for every Indian entrance exam | 163 exams, in your language",
  description:
    "Free mock tests, previous year papers, adaptive practice and study help for 163 Indian entrance and government exams — JEE, NEET, UPSC, SSC, IBPS, RRB, GATE, CAT, all state PSCs, all TETs. Verified by students who cleared the same exam. In English, Hindi and 17 other Indian languages.",
  alternates: { canonical: "https://shishya.in" },
  keywords: [
    "free mock test India",
    "entrance exams India",
    "government job preparation",
    "SSC UPSC JEE NEET IBPS RRB",
    "previous year papers",
    "exam preparation in Hindi",
    "Indian entrance exam prep",
    "Shishya",
  ],
  openGraph: {
    title: "Shishya — Free preparation for every Indian entrance exam",
    description:
      "163 exams. Adaptive mocks, previous year papers, study help. Verified by students who cleared the same exam. Free, in your language.",
    url: "https://shishya.in",
    siteName: "Shishya",
    locale: "en_IN",
    type: "website",
  },
};

// Live count of active exams — drives the "X exams covered" copy.
// Cached 5 min so this page stays static-fast under load.
const examCount = unstable_cache(
  async () => {
    try {
      return await prisma.exam.count({ where: { active: true } });
    } catch {
      return 163; // sane fallback so the page still renders if DB is down
    }
  },
  ["hub-exam-count-v1"],
  { revalidate: 300, tags: ["exams"] },
);

interface PopularExamRow {
  code: string;
  shortName: string;
  name: string;
  category: string;
  candidatesPerYear: number | null;
}

// Top-N most-written exams. Drives the "Popular exams" strip on the
// homepage so anonymous visitors get a one-click path to the biggest
// exams without typing anything. Cached because the underlying ranking
// barely changes day to day.
const popularExams = unstable_cache(
  async (): Promise<PopularExamRow[]> => {
    try {
      return await prisma.exam.findMany({
        where: { active: true, candidatesPerYear: { not: null } },
        orderBy: { candidatesPerYear: "desc" },
        take: 8,
        select: {
          code: true,
          shortName: true,
          name: true,
          category: true,
          candidatesPerYear: true,
        },
      }) as unknown as PopularExamRow[];
    } catch {
      return [];
    }
  },
  ["hub-popular-exams-v1"],
  { revalidate: 600, tags: ["exams"] },
);

interface UserProfileRow {
  name: string | null;
  onbStage: string | null;
  onbState: string | null;
  onbPrepCodes: string[];
  onbCompletedAt: Date | null;
}

interface PrepExamRow {
  code: string;
  shortName: string;
  name: string;
  category: string;
}

export default async function HomeHub() {
  // Auth-aware branching. Signed-out users see hero + search + popular
  // exams. Onboarded users see PersonalisedHub above the same exam
  // discovery surface for cross-exam browsing.
  //
  // Fire auth() in parallel with the two cached count/popular queries
  // so cold-cache loads aren't penalised by sequential round-trips.
  // The user-profile + prep-exams chain stays sequential for signed-in
  // users (each step depends on the previous) but runs concurrently
  // with examCount + popularExams, which are completely independent.
  const [session, exams, popular] = await Promise.all([
    auth().catch(() => null),
    examCount(),
    popularExams(),
  ]);

  let personalised: {
    profile: UserProfileRow;
    prepExams: PrepExamRow[];
  } | null = null;

  if (session?.user?.id) {
    const rows = await prisma.$queryRaw<UserProfileRow[]>`
      SELECT "name", "onbStage", "onbState", "onbPrepCodes", "onbCompletedAt"
      FROM "User" WHERE "id" = ${session.user.id} LIMIT 1
    `.catch(() => [] as UserProfileRow[]);
    const profile = rows[0];

    // Signed-in but never finished onboarding → wizard.
    if (profile && !profile.onbCompletedAt) {
      redirect("/onboarding");
    }

    if (profile) {
      const prepExams = profile.onbPrepCodes.length > 0
        ? await prisma.$queryRaw<PrepExamRow[]>`
            SELECT "code", "shortName", "name", "category"::text AS category
            FROM "Exam"
            WHERE "code" = ANY(${profile.onbPrepCodes}::text[]) AND "active" = TRUE
            ORDER BY "candidatesPerYear" DESC NULLS LAST
          `.catch(() => [] as PrepExamRow[])
        : [];
      personalised = { profile, prepExams };
    }
  }

  function formatCandidates(n: number | null): string {
    if (!n || n <= 0) return "";
    if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(1)} crore writers/yr`;
    if (n >= 100_000) return `${(n / 100_000).toFixed(1)} lakh writers/yr`;
    if (n >= 1000) return `${Math.round(n / 1000)}K writers/yr`;
    return `${n} writers/yr`;
  }

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />

      {/* Live activity strip — same component the /exams page uses, gives
          new visitors immediate social proof on first scroll. */}
      <LiveCountersStrip
        labels={{
          preparingNow:      "preparing now",
          inMockNow:         "in a mock right now",
          activeDiscussions: "live discussions",
          totalEver:         "helped till now",
        }}
      />

      {/* Personalised hub renders ABOVE the marketing hero for onboarded
          users. Generic hero stays for everyone else. */}
      {personalised ? (
        <PersonalisedHub
          stage={personalised.profile.onbStage}
          state={personalised.profile.onbState}
          prepCodes={personalised.profile.onbPrepCodes}
          prepExams={personalised.prepExams}
          displayName={personalised.profile.name}
        />
      ) : null}

      <section id="exam-discovery" className="container-prose pt-12 pb-16 sm:pt-16 sm:pb-20">
        {/* Hero — only when NOT showing PersonalisedHub */}
        {!personalised && (
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="bg-gradient-to-r from-ink-900 via-saffron-700 to-ink-900 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-5xl">
              Free preparation for every Indian entrance exam.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-ink-600 sm:text-lg">
              {exams} exams covered — adaptive mocks, previous year papers,
              study help, syllabus. Verified by students who cleared the same
              exam. In your language.
            </p>
          </div>
        )}

        {/* Section heading when shown below PersonalisedHub */}
        {personalised && (
          <div className="mx-auto max-w-3xl">
            <h2 className="text-base font-semibold text-ink-900">Browse all exams</h2>
            <p className="mt-1 text-xs text-ink-500">
              Search across all {exams} exams or jump into one of the most-written
              below.
            </p>
          </div>
        )}

        {/* Big search box — straight into /exams with the query
            pre-applied. Works without JS via the form's GET fallback. */}
        <div className="mx-auto mt-8 max-w-2xl">
          <ExamSearchBox placeholder="Search any exam — SSC CGL, NEET, UPSC, TNPSC, JEE…" />
          <p className="mt-2 text-center text-[11px] text-ink-500">
            Or{" "}
            <Link href="/exams" className="text-saffron-700 underline hover:text-saffron-800">
              browse all {exams} exams →
            </Link>
          </p>
        </div>

        {/* Popular exams — top 8 by candidates/yr, one-click into any of
            them. Drives the biggest funnel: SSC CGL, NEET, JEE, UPSC… */}
        {popular.length > 0 && (
          <>
            <h2 className="mx-auto mt-14 max-w-5xl text-base font-semibold text-ink-900">
              Most-written exams in India
            </h2>
            <p className="mx-auto mt-1 max-w-5xl text-xs text-ink-500">
              One click into the exams Indian students write the most. Free
              mocks + previous year papers ready inside.
            </p>
            <ul className="mx-auto mt-5 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {popular.map((e) => (
                <li key={e.code}>
                  <Link
                    href={`/exams/${e.code}`}
                    className="group block h-full rounded-xl border border-ink-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-saffron-400 hover:shadow-lg"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-700">
                      {e.category.replace(/_/g, " ")}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-ink-900">{e.shortName}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-ink-600">{e.name}</p>
                    {e.candidatesPerYear && (
                      <p className="mt-3 text-[11px] uppercase tracking-wider text-ink-500">
                        {formatCandidates(e.candidatesPerYear)}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mx-auto mt-6 max-w-5xl text-right">
              <Link href="/exams" className="text-sm font-medium text-saffron-700 hover:text-saffron-800">
                See all {exams} exams →
              </Link>
            </div>
          </>
        )}

        {/* Trust strip — visible verification commitment on first scroll. */}
        <div className="mx-auto mt-14 max-w-3xl rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 text-sm text-ink-700">
          <h3 className="text-base font-semibold text-ink-900">
            Every fact carries a verification badge
          </h3>
          <p className="mt-2">
            We don&apos;t give you confident answers without showing our work.
            Every exam date, syllabus item, eligibility rule and cut-off on
            Shishya shows a visible badge telling you how it&apos;s been
            verified — auto-checked against the official source, then
            confirmed by students who cleared the same exam. Click any badge
            to see the full verification history.{" "}
            <Link href="/verification" className="text-saffron-700 underline">
              How verification works →
            </Link>
          </p>
        </div>

        {/* Footer / mission */}
        <div className="mx-auto mt-12 max-w-3xl rounded-xl border border-ink-200 bg-white p-6 text-sm text-ink-700">
          <h3 className="text-base font-semibold text-ink-900">Why Shishya is free</h3>
          <p className="mt-2">
            Coaching for India&apos;s entrance and government exams costs
            ₹50k–₹3 lakh — what most families can&apos;t afford. Shishya is
            funded by Surge Enterprise AI&apos;s separate consulting business,
            not by ads, not by paywalls and not by selling student data. Every
            exam, every mock, every previous year paper is free, with the
            official source cited on every factual claim.
          </p>
          <p className="mt-3 text-[12px] text-ink-500">
            No affiliate links. No referral fees. No coaching upsells. Just
            mocks, practice and study help — verified by students who cleared
            the same exam.
          </p>
        </div>
      </section>
    </main>
  );
}
