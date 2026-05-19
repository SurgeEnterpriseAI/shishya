// / — the Shishya hub.
//
// Two render modes:
//   * Anonymous or signed-out: hero + 7 lifecycle tiles (the generic
//     marketing landing).
//   * Signed-in + onboarding complete: PersonalisedHub at the top
//     (Your prep · Your state · Your stage), then the 7 tiles below
//     as a "browse everything" rail.
//   * Signed-in + onboarding NOT complete: redirect to /onboarding.
//
// Live counters fetch client-side via /api/live-counts.

import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { LiveCountersStrip } from "@/components/LiveCounters";
import { PersonalisedHub } from "@/components/PersonalisedHub";
import { prisma } from "@/lib/db/prisma";
import { unstable_cache } from "next/cache";
import { COLLEGES } from "@/lib/colleges-data";
import { SCHOLARSHIPS } from "@/data/scholarships";
import { BOARDS } from "@/lib/schooling-data";
import { WORLDWIDE_COUNTRIES } from "@/lib/worldwide-data";
import { INSIGHTS_ARTICLES } from "@/data/insights-articles";
import { auth } from "@/lib/auth";

// Cannot cache statically — homepage now branches on auth + user profile.
export const revalidate = 0;
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shishya — Free AI prep for every stage of Indian education",
  description:
    "From school to college to entrance exams to jobs to study abroad — Shishya helps Indian students at every stage. 163 entrance exams covered today, more sections shipping monthly. Free, AI-tutored, in your language.",
  alternates: { canonical: "https://shishya.in" },
  keywords: [
    "indian education platform",
    "school college entrance exam preparation",
    "free AI tutor India",
    "study abroad India",
    "indian student career guidance",
    "government job preparation",
    "scholarships India",
    "Shishya",
  ],
  openGraph: {
    title: "Shishya — Free AI prep for every stage of Indian education",
    description: "School, college, exams, jobs, abroad — one free platform.",
    url: "https://shishya.in",
    siteName: "Shishya",
    locale: "en_IN",
    type: "website",
  },
};

// Real exam count drives one of the tiles. Cached 5 min so this page
// stays static-fast under load.
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

interface Tile {
  href: string;
  title: string;
  blurb: string;
  meta: string;
  status: "live" | "soon";
  glyph: string; // single character or short symbol for the tile badge
}

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
  // Auth-aware branching. Signed-out + non-onboarded users see the
  // generic marketing landing; onboarded users see PersonalisedHub above
  // the same tile rail.
  const session = await auth().catch(() => null);
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

  const exams = await examCount();
  const collegeCount = COLLEGES.length;
  const scholarshipCount = SCHOLARSHIPS.length;
  const boardCount = BOARDS.length;
  const countryCount = WORLDWIDE_COUNTRIES.length;
  const uniCount = WORLDWIDE_COUNTRIES.reduce((s, c) => s + c.universities.length, 0);
  const insightsCount = INSIGHTS_ARTICLES.length;

  const tiles: Tile[] = [
    {
      href: "/schooling",
      title: "Schooling",
      blurb: "Class 1–12, every board, every state. Syllabus, chapter notes, mastery quizzes.",
      meta: `${boardCount} boards · CBSE · ICSE · IB · State Boards`,
      status: "live",
      glyph: "1",
    },
    {
      href: "/colleges",
      title: "Colleges & Graduation",
      blurb: "UG admissions, cutoffs, scholarships, college info. NIRF + state colleges.",
      meta: `${collegeCount} NIRF colleges · ${scholarshipCount}+ scholarships`,
      status: "live",
      glyph: "C",
    },
    {
      href: "/exams",
      title: "Entrance & Government Exams",
      blurb: "Adaptive mock tests, previous year papers, AI tutor. Free, every state covered.",
      meta: `${exams} exams covered today`,
      status: "live",
      glyph: "E",
    },
    {
      href: "/careers",
      title: "Careers & Career Paths",
      blurb: "What does each career actually pay? Path, qualifications, salary band, growth.",
      meta: "Doctor · Engineer · IAS · CA · Designer · 40+ careers",
      status: "live",
      glyph: "K",
    },
    {
      href: "/post-graduation",
      title: "Post-Graduation",
      blurb: "GATE, CAT, NEET-PG, UGC-NET, fellowships, research pathways. PG vs Job vs Abroad.",
      meta: "PG entrances · Research · Fellowships",
      status: "live",
      glyph: "P",
    },
    {
      href: "/jobs",
      title: "Jobs & Careers",
      blurb: "Government job tracking, internships, resume + interview prep, skill-based careers.",
      meta: "Govt jobs · Private · Internships · Skill paths",
      status: "live",
      glyph: "J",
    },
    {
      href: "/worldwide",
      title: "Worldwide",
      blurb: "Study abroad neutrally. Tuition, visa, post-study work, PR pathways, education loans.",
      meta: `${countryCount} countries · ${uniCount} universities · IELTS/TOEFL/GRE/GMAT · Loans`,
      status: "live",
      glyph: "W",
    },
    {
      href: "/insights",
      title: "Insights",
      blurb: "Honest essays on Indian education decisions. Sourced from NIRF, NTA, MEA, official data.",
      meta: `${insightsCount} articles · annual report (Nov)`,
      status: "live",
      glyph: "I",
    },
  ];

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

      {/* Personalised hub renders ABOVE the marketing tiles for onboarded
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

      <section id="all-sections" className="container-prose pt-12 pb-16 sm:pt-16 sm:pb-20">
        {/* Hero — only when NOT showing PersonalisedHub */}
        {!personalised && (
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="bg-gradient-to-r from-ink-900 via-saffron-700 to-ink-900 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-5xl">
              Free AI prep for every stage of Indian education
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-ink-600 sm:text-lg">
              Shishya helps Indian students at every stage — school, college,
              entrance exams, jobs and beyond. Free, AI-tutored, in your language.
            </p>
          </div>
        )}

        {/* Section heading when shown below PersonalisedHub */}
        {personalised && (
          <div className="mx-auto max-w-3xl">
            <h2 className="text-base font-semibold text-ink-900">Browse everything</h2>
            <p className="mt-1 text-xs text-ink-500">
              All 7 Shishya sections. Use these when you want to explore beyond your pinned prep.
            </p>
          </div>
        )}

        {/* Seven tiles */}
        <ul className="mx-auto mt-10 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((tile) => (
            <li key={tile.href}>
              <Link
                href={tile.href}
                className="group relative block h-full rounded-xl border border-ink-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-saffron-400 hover:shadow-lg"
              >
                {/* Status pill */}
                <span
                  className={
                    tile.status === "live"
                      ? "absolute right-4 top-4 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800"
                      : "absolute right-4 top-4 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium text-ink-600"
                  }
                >
                  {tile.status === "live" ? "Live" : "Coming soon"}
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-saffron-500 text-base font-bold text-white">
                  {tile.glyph}
                </div>
                <h2 className="mt-3 text-base font-semibold text-ink-900">
                  {tile.title}
                </h2>
                <p className="mt-1 text-sm text-ink-700">{tile.blurb}</p>
                <p className="mt-3 text-[11px] uppercase tracking-wider text-ink-500">
                  {tile.meta}
                </p>
              </Link>
            </li>
          ))}
        </ul>

        {/* Trust strip — visible verification commitment on first scroll. */}
        <div className="mx-auto mt-12 max-w-3xl rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 text-sm text-ink-700">
          <h3 className="text-base font-semibold text-ink-900">
            Every fact carries a verification badge
          </h3>
          <p className="mt-2">
            We don't give you confident answers without showing our work.
            Every exam date, college rank, scholarship eligibility and
            visa rule on Shishya shows a visible badge telling you
            exactly how it's been verified — AI-checked against the
            official source, community-confirmed, or flagged for review.
            Click any badge anywhere on the site to see the full
            verification history.{" "}
            <Link href="/verification" className="text-saffron-700 underline">
              How verification works →
            </Link>
          </p>
        </div>

        {/* Footer / mission */}
        <div className="mx-auto mt-12 max-w-3xl rounded-xl border border-ink-200 bg-white p-6 text-sm text-ink-700">
          <h3 className="text-base font-semibold text-ink-900">Why Shishya is free</h3>
          <p className="mt-2">
            Coaching costs in India have outpaced what most families can
            afford. AI finally makes high-quality, personalised prep
            economically possible for everyone. Shishya is funded by Surge
            Enterprise AI's separate consulting business, not by ads, not by
            paywalls and not by selling student data. Every section is
            free, with sources cited on every factual claim.
          </p>
          <p className="mt-3 text-[12px] text-ink-500">
            No affiliate links. No referral fees. No invented rankings —
            only NIRF, QS, THE and similar established systems, fully
            attributed.
          </p>
        </div>
      </section>
    </main>
  );
}
