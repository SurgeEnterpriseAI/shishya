// First-Time Dashboard — the screen a brand-new signup sees.
//
// Old behaviour: zero-attempt users landed on the regular dashboard.
// That dashboard looks like a directory: empty "Your exams" placeholder,
// no recent attempts, then 163 exam cards in a search grid. 68% of
// signups bounced from this screen without doing anything (measured).
//
// New behaviour: a single conversational card asks "what exam are you
// preparing for?" with 8 popular-exam buttons. One click takes them
// straight to /chat where the tutor auto-fires start_adaptive_quiz
// and they're answering a 10-Q warmup within ~5 seconds.
//
// Falls back to the full dashboard via "Browse all 163 exams" link
// for users who want to look around. Anyone with ≥1 enrollment or
// attempt automatically gets the regular dashboard going forward.

import Link from "next/link";
import { Header } from "@/components/Header";
import { OnboardingTour } from "@/components/OnboardingTour";

interface PopularExam {
  code: string;
  short: string;
  emoji: string;
  blurb: string;
}

// The 8 exams that drive ~80% of Indian aspirant traffic. Hand-picked
// from candidatesPerYear DESC ordering. Each tile shows an emoji + the
// exam's short name + a one-line "what it is" so the student picks
// confidently without clicking through.
const POPULAR_EXAMS: PopularExam[] = [
  { code: "SSC_CGL",       short: "SSC CGL",       emoji: "🏛️", blurb: "Central govt clerks, ITOs, auditors" },
  { code: "NEET_UG",       short: "NEET UG",       emoji: "🩺", blurb: "MBBS / BDS / Ayush admissions" },
  { code: "JEE_MAIN",      short: "JEE Main",      emoji: "⚙️", blurb: "NIT / IIIT / engineering" },
  { code: "UPSC_PRELIMS",  short: "UPSC Prelims",  emoji: "🎓", blurb: "IAS / IPS / IFS / IRS" },
  { code: "RRB_NTPC",      short: "RRB NTPC",      emoji: "🚂", blurb: "Railway non-technical jobs" },
  { code: "CTET",          short: "CTET",          emoji: "📚", blurb: "Teaching at central schools" },
  { code: "SBI_PO",        short: "SBI PO",        emoji: "🏦", blurb: "Banking — probationary officer" },
  { code: "CAT",           short: "CAT",           emoji: "📊", blurb: "IIM and top MBA admissions" },
];

const QUIZ_SEED = (examShort: string) =>
  `Quiz me on ${examShort} — start with 10 easy questions, then build a full mock around my weak topics.`;

export function FirstTimeDashboard({
  userName,
  showOnboardingTour,
}: {
  userName: string;
  showOnboardingTour: boolean;
}) {
  return (
    <main className="min-h-screen bg-saffron-50/40">
      <Header />
      {/* The standard onboarding tour can still mount on top of this
          screen for users who haven't dismissed it. */}
      {showOnboardingTour && <OnboardingTour />}

      <section className="container-prose py-12 sm:py-16">
        <div className="mx-auto max-w-2xl">
          {/* Greeting card */}
          <div className="rounded-2xl border border-saffron-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-saffron-500 text-xl font-bold text-white"
              >
                शि
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-saffron-700">Shishya AI</p>
                <h1 className="mt-1 text-xl font-semibold text-ink-900 sm:text-2xl">
                  Hey {userName}, welcome 👋
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-ink-700">
                  I&apos;m Shishya — your AI tutor. Tell me which exam you&apos;re
                  preparing for and I&apos;ll build you a quick 10-question
                  warmup right now. Pick one below to start.
                </p>
              </div>
            </div>
          </div>

          {/* Exam picker — popular 8 */}
          <p className="mt-8 text-xs font-semibold uppercase tracking-wider text-ink-500">
            Pick your exam
          </p>
          <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {POPULAR_EXAMS.map((e) => (
              <li key={e.code}>
                <Link
                  href={`/chat?examCode=${e.code}&seed=${encodeURIComponent(QUIZ_SEED(e.short))}`}
                  className="group flex items-start gap-3 rounded-xl border border-ink-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-saffron-400 hover:shadow-md"
                  prefetch={false}
                >
                  <span aria-hidden className="text-2xl">
                    {e.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900">{e.short}</p>
                    <p className="mt-0.5 text-xs text-ink-600">{e.blurb}</p>
                  </div>
                  <span
                    aria-hidden
                    className="self-center text-ink-300 transition-colors group-hover:text-saffron-500"
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Escape hatch for the long-tail exams */}
          <div className="mt-8 rounded-md border border-dashed border-ink-300 bg-white p-4 text-center">
            <p className="text-xs text-ink-500">
              Preparing for something else?
            </p>
            <Link
              href="/dashboard?explore=1"
              className="mt-1 inline-block text-sm font-medium text-saffron-700 hover:text-saffron-800"
            >
              Browse all 163 exams →
            </Link>
          </div>

          {/* Quiet reassurance */}
          <p className="mt-6 text-center text-[11px] text-ink-400">
            Free forever. No ads. No paywall.
          </p>
        </div>
      </section>
    </main>
  );
}
