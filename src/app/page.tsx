// / — the new Shishya hub. Replaces the previous exam-only landing
// (that content moved to /exams). Positions Shishya as a lifecycle
// platform for every Indian student: school → college → exams → PG →
// jobs → study abroad → insights.
//
// Deliberately light page: no auth wall, no DB-heavy reads beyond the
// public exam count. Live counters fetch client-side via /api/live-counts.
// The seven tiles are the only thing this page exists for.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { LiveCountersStrip } from "@/components/LiveCounters";
import { prisma } from "@/lib/db/prisma";
import { unstable_cache } from "next/cache";
import { COLLEGES } from "@/lib/colleges-data";
import { SCHOLARSHIPS } from "@/data/scholarships";
import { BOARDS } from "@/lib/schooling-data";

export const revalidate = 300; // 5 min

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

export default async function HomeHub() {
  const exams = await examCount();
  const collegeCount = COLLEGES.length;
  const scholarshipCount = SCHOLARSHIPS.length;
  const boardCount = BOARDS.length;

  const tiles: Tile[] = [
    {
      href: "/schooling",
      title: "Schooling",
      blurb: "Class 1–12, every board, every state. Syllabus, practice, free resources.",
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
      href: "/post-graduation",
      title: "Post-Graduation",
      blurb: "GATE, CAT, NEET-PG, UGC-NET, fellowships, research pathways.",
      meta: "PG entrances · Research · Fellowships",
      status: "soon",
      glyph: "P",
    },
    {
      href: "/jobs",
      title: "Jobs & Careers",
      blurb: "Government job tracking, career paths, fresher guidance, resume help.",
      meta: "Govt jobs · Private · Internships · Career switches",
      status: "soon",
      glyph: "J",
    },
    {
      href: "/worldwide",
      title: "Worldwide",
      blurb: "Study abroad, work visas, global careers. US, UK, Canada, AU, Germany and more.",
      meta: "14 countries · Test prep · Visas · Loans",
      status: "soon",
      glyph: "W",
    },
    {
      href: "/insights",
      title: "Insights",
      blurb: "Aggregated, anonymised platform data. Exam trends, college interest, career flows.",
      meta: "Public-good research · Annual reports",
      status: "soon",
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

      <section className="container-prose pt-12 pb-16 sm:pt-16 sm:pb-20">
        {/* Hero */}
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="bg-gradient-to-r from-ink-900 via-saffron-700 to-ink-900 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-5xl">
            Free AI prep for every stage of Indian education
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-ink-600 sm:text-lg">
            Shishya helps Indian students at every stage — school, college,
            entrance exams, jobs and beyond. Free, AI-tutored, in your language.
          </p>
        </div>

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
