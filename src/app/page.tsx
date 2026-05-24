// / — the Shishya homepage.
//
// Exam-first surface (current strategy until 100k users). Pure marketing
// landing — anonymous content for everyone. No auth check, no per-user
// branching here. Signed-in users get their personalised view at
// /dashboard (which the header CTAs link to).
//
// Why static instead of dynamic: every homepage request used to hit a
// Vercel serverless function (~400ms TTFB) because we awaited auth()
// inline, which Next.js treats as a dynamic-rendering signal. With the
// auth check removed the page can be rendered once and served by
// Vercel's edge CDN for every subsequent visit (~50ms TTFB), with a
// 60-second background revalidation to pick up new exam counts and
// popular-exam ordering.
//
// Live counters fetch client-side via /api/live-counts so they remain
// fresh even though the surrounding HTML is cached.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { LiveCountersStrip } from "@/components/LiveCounters";
import { ExamSearchBox } from "@/app/exams/browse/ExamSearchBox";
import { PersonaGridTracker } from "./PersonaGridTracker";
import { prisma } from "@/lib/db/prisma";
import { unstable_cache } from "next/cache";
import { PERSONAS } from "@/data/personas";

// Re-generate the homepage HTML at most once per minute. Between
// regenerations Vercel serves cached HTML from its edge CDN, so the
// vast majority of visits never invoke a serverless function — TTFB
// drops from ~400ms (function execution) to ~50ms (edge cache hit).
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Shishya — Pick your stage, see your curated prep | Free, in your language",
  description:
    "Tell us what you're preparing for — Class 10/12, engineering, medical, govt jobs, banking, civil services — and we'll show you the 3-5 exams that matter, the articles to read, and what to do this week. Free, with sourced verification on every fact.",
  alternates: { canonical: "https://shishya.in" },
  keywords: [
    "free exam prep India",
    "entrance exams India by stage",
    "what exam should I prepare for",
    "SSC UPSC JEE NEET IBPS RRB",
    "personalised exam prep",
    "Indian entrance exam prep",
    "Shishya",
  ],
  openGraph: {
    title: "Shishya — Pick your stage, see your curated prep",
    description:
      "Don't browse 163 exams. Tell us what you're preparing for — we'll show the 3-5 that matter for you. Free, in your language.",
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

export default async function HomeHub() {
  // No auth check, no user profile lookup — this keeps the page in the
  // static branch so Vercel can serve it from the edge CDN. Signed-in
  // users see the same marketing landing; their personalised view lives
  // at /dashboard, which the header CTAs link to.
  const exams = await examCount();

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

      <section id="exam-discovery" className="container-prose pt-12 pb-16 sm:pt-16 sm:pb-20">
        {/* Hero — frames the page as a "tell us what you're preparing
            for" question rather than dumping the full catalogue. Signed-
            in users get their personalised view at /dashboard via the
            header. */}
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="bg-gradient-to-r from-ink-900 via-saffron-700 to-ink-900 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-5xl">
            What are you preparing for?
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-ink-600 sm:text-lg">
            Pick the stage you&apos;re at. We&apos;ll show you 3-5 relevant exams,
            the prep articles that actually matter, and what to do this week — not
            the full catalogue of {exams} exams you don&apos;t need.
          </p>
        </div>

        {/* Persona picker — the primary navigation surface. Replaces
            the older "top 8 most-written exams" tile rail because that
            still dumped a wall of unrelated exams on every visitor.
            PersonaGridTracker is an invisible client-side analytics
            beacon that fires a persona_tile_click event before the
            navigation; lets us measure tile CTR per persona without
            converting the server-rendered grid into a client component. */}
        <PersonaGridTracker />
        <ul className="mx-auto mt-10 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PERSONAS.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/for/${p.slug}`}
                className="group block h-full rounded-xl border border-ink-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-saffron-400 hover:shadow-lg"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-saffron-500 text-base font-bold text-white">
                  {p.badge}
                </div>
                <h2 className="mt-3 text-base font-semibold text-ink-900">{p.label}</h2>
                <p className="mt-1 text-xs text-ink-600 line-clamp-3">{p.blurb}</p>
                <p className="mt-3 text-xs font-medium text-saffron-700">
                  See my exams + plan →
                </p>
              </Link>
            </li>
          ))}
        </ul>

        {/* Fallback for visitors who already know their exam. Sits BELOW
            the persona picker so it doesn't become the first thing
            visitors reach for. */}
        <div className="mx-auto mt-12 max-w-2xl border-t border-ink-200 pt-8">
          <p className="text-center text-xs uppercase tracking-wider text-ink-500">
            Already know your exam?
          </p>
          <div className="mt-3">
            <ExamSearchBox placeholder="Search by exam name — SSC CGL, NEET, UPSC, TNPSC, JEE…" />
          </div>
          <p className="mt-2 text-center text-[11px] text-ink-500">
            Or{" "}
            <Link href="/exams" className="text-saffron-700 underline hover:text-saffron-800">
              browse all {exams} exams →
            </Link>
          </p>
        </div>

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
