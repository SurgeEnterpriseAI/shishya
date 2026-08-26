// Reusable header with brand + "Browse exams" CTA + auth-aware right
// rail. Pure synchronous Server Component — no auth(), cookies(), or
// headers() calls — so pages that include it can stay statically
// renderable and benefit from edge caching.
//
// The auth-dependent right-rail (language switcher + Dashboard/Profile/
// Logout vs Sign in) is a Client Component (HeaderAuthControls) that
// resolves the user's session in the browser after hydration. For
// anonymous visitors this is just a one-shot fetch to NextAuth's
// /api/auth/session endpoint — no extra latency on initial paint.
//
// Until Shishya hits 100k users the lifecycle nav (Schooling, Colleges,
// Scholarships, etc.) is hidden — those routes stay live but aren't
// promoted.

import Link from "next/link";
import { BackLink } from "./BackLink";
import { HeaderAuthControls } from "./HeaderAuthControls";
import { getDailyQuote } from "@/data/motivational-quotes";

// English labels for the auth-aware right rail. We keep this static so
// the page including Header can remain statically renderable. The
// LangSwitcher inside HeaderAuthControls still lets users change
// language; the three CTA labels here stay in English for now — a
// reasonable tradeoff for the edge-cache win until we set up a
// client-side i18n provider.
const RAIL_LABELS = {
  dashboard: "Dashboard",
  signout: "Sign out",
  signinShort: "Sign in",
} as const;

// Default locale chip shown in the LangSwitcher trigger. The switcher
// component itself reads the `shishya-lang` cookie on the client and
// updates its own display on mount, so this is just the initial paint
// label — a millisecond of "English" before hydration is invisible to
// the user.
const DEFAULT_LOCALE = "en";

export function Header({ admin = false }: { admin?: boolean }) {
  // Daily-rotating motivational quote shown in the empty middle space
  // of the header. Picked deterministically by IST calendar day so
  // every visitor sees the same quote within a day, swaps at midnight.
  // Skip on admin pages — too playful for an admin chrome.
  const quote = admin ? null : getDailyQuote();

  return (
    <header className="border-b border-ink-200/50 bg-white/80 backdrop-blur">
      <div className="container-prose flex h-16 items-center gap-3">
        {/* Left: brand + back-link. */}
        <div className="flex shrink-0 items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-saffron-500 text-lg font-bold text-white">
              शि
            </span>
            <span className="text-lg font-semibold tracking-tight text-ink-900">Shishya</span>
            {admin && (
              <span className="ml-2 rounded-md bg-ink-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                Admin
              </span>
            )}
          </Link>
          <BackLink />
        </div>

        {/* Middle: today's quote. The nav gained the Jobs-Map pill
            (Aug 2026), so below xl the middle can't fit a readable
            sentence — it was clipping mid-word against the nav. Show
            the quote only from xl up, where it has honest room;
            min-w-0 + mr-3 make the flex truncation correct and keep a
            gap from the nav even at tight xl widths. */}
        {quote && (
          <p
            className="ml-4 mr-3 hidden min-w-0 flex-1 truncate text-center text-sm italic text-ink-500 xl:block"
            title={quote.author ? `${quote.text} — ${quote.author}` : quote.text}
          >
            <span className="mr-1.5 text-saffron-500" aria-hidden>✦</span>
            <span className="font-medium text-ink-700">{quote.text}</span>
            {quote.author && (
              <span className="ml-2 text-ink-400">— {quote.author}</span>
            )}
          </p>
        )}

        {/* Right: Surge aptitude test entry + language switcher + auth
            controls. The aptitude link is the admission-screening test —
            kept top-right so it's easy to point candidates at. */}
        <nav className="ml-auto flex shrink-0 items-center gap-3 text-sm text-ink-700">
          {!admin && (
            <Link
              href="/jobs-map"
              className="hidden rounded-md border border-ink-200 bg-white px-2.5 py-1 text-xs font-semibold text-ink-700 hover:bg-ink-50 sm:inline-block"
              title="India's Government Jobs Map — Group A to Group C, every path with live vacancies"
            >
              🗺️ India&apos;s Govt Jobs Map
            </Link>
          )}
          {!admin && (
            <Link
              href="/results"
              className="rounded-md bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-600"
              title="Declared exam results — official links, cutoff reads, next steps"
            >
              🎉 Results
            </Link>
          )}
          {!admin && (
            <Link
              href="/aptitude"
              className="hidden rounded-md border border-saffron-300 bg-saffron-50 px-2.5 py-1 text-xs font-semibold text-saffron-800 hover:bg-saffron-100 sm:inline-block"
              title="Surge admission aptitude test — 30 questions, 30 minutes"
            >
              Aptitude Test
            </Link>
          )}
          {!admin && (
            <HeaderAuthControls locale={DEFAULT_LOCALE} labels={RAIL_LABELS} />
          )}
        </nav>
      </div>
      {/* Primary site navigation (26 Aug 2026). One consistent, crawlable
          row of the core destinations on every page — what users need one
          tap away, and the structural precondition Google's sitelinks
          algorithm looks for (clear nav, descriptive anchors, stable
          across the site). Plain text anchors on purpose: the anchor text
          is what a sitelink displays. */}
      {!admin && (
        <nav
          aria-label="Primary"
          className="border-t border-ink-100 bg-white/60"
        >
          <div className="container-prose flex h-9 items-center gap-4 overflow-x-auto whitespace-nowrap text-[13px] font-medium text-ink-600">
            <Link href="/exams/browse" className="hover:text-ink-900">All Exams</Link>
            <Link href="/exam-calendar" className="hover:text-ink-900">Exam Calendar</Link>
            <Link href="/live-test" className="hover:text-ink-900">Live Tests</Link>
            <Link href="/find-your-exam" className="hover:text-ink-900">Find Your Exam</Link>
            <Link href="/current-affairs" className="hidden hover:text-ink-900 sm:inline">Current Affairs</Link>
            <Link href="/mentors" className="hidden hover:text-ink-900 sm:inline">Mentors</Link>
            <Link href="/pricing" className="hidden hover:text-ink-900 sm:inline">Pricing</Link>
          </div>
        </nav>
      )}
    </header>
  );
}
