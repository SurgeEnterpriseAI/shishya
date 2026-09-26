// Site header: brand + auth-aware right rail + the orange Primary row that
// names Shishya's sections. Pure synchronous Server Component — no auth(),
// cookies(), headers() or getT() calls — so pages that include it can stay
// statically renderable and benefit from edge caching
// (tests/unit/cache-pilot-routes.test.ts walks this file).
//
// The auth-dependent right-rail (language switcher + Dashboard/Profile/
// Logout vs Sign in) is a Client Component (HeaderAuthControls) that
// resolves the user's session in the browser after hydration. For
// anonymous visitors this is just a one-shot fetch to NextAuth's
// /api/auth/session endpoint — no extra latency on initial paint.
//
// 26 Sep 2026 (founder: "this strip ... is only focusing on government
// exams"): Shishya is now ONE smart place to study with independent
// sections — School, Entrance exams, Government exams, College &
// scholarships, Careers — and a context-driven tutor, Ask Shishya. The
// Primary row now says exactly that, in the home page's own words: the
// five labels are the door titles (HOME_DOORS_COPY.en.doors.*.title in
// src/lib/home-doors-copy.ts) and the hrefs are the doors' own
// (src/components/home/HomeDoors.tsx). The labels are typed here as static
// English on purpose — importing the per-locale copy map would put the home
// page's copy into ~135 pages' chrome — and tests/unit/header-nav.test.ts
// pins that they stay equal. The old note here ("Until Shishya hits 100k
// users the lifecycle nav (Schooling, Colleges, Scholarships, etc.) is
// hidden") no longer holds: those sections ARE the header now. Each
// section stands alone; nothing in the header reads as an order.

import Link from "next/link";
import { BackLink } from "./BackLink";
import { HeaderAuthControls, TodayNavLink } from "./HeaderAuthControls";
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

// Primary-row link styles (26 Sep 2026). Sections are plain white anchors
// (structure is text: the anchor text is what a sitelink displays); the one
// action, Ask Shishya, is the row's single chip; the exam utilities behind
// the divider are a shade lighter so the sections read first.
const SECTION_LINK = "hover:text-saffron-100";
const UTILITY_LINK = "font-medium text-white/90 hover:text-white";

export function Header({ admin = false }: { admin?: boolean }) {
  // Daily-rotating motivational quote shown in the empty middle space
  // of the header. Picked deterministically by IST calendar day so
  // every visitor sees the same quote within a day, swaps at midnight.
  // Skip on admin pages — too playful for an admin chrome.
  const quote = admin ? null : getDailyQuote();
  // The middle column is about 370 px wide at every xl+ width (the container
  // is max-w-7xl). Measured 20 Sep 2026: up to ~95 characters fit on two
  // 13 px lines; the longest quotes (119 with the author) need 12 px type.
  const longQuote = quote ? (quote.text + (quote.author ? ` — ${quote.author}` : "")).length > 95 : false;

  return (
    <header className="border-b border-ink-200/50 bg-white/80 backdrop-blur">
      <div className="container-prose flex h-16 items-center gap-2 sm:gap-3">
        {/* Left: brand + back-link.
            26 Sep 2026 (phone fit): measured live on shishya.in/exams/SSC_CGL
            at a 360 px phone, the top row's content was 508 px (logo +
            wordmark 110, Back 63, Results 83, language 117, Sign in 71, gaps
            and padding) against a 328 px content box — the page zoomed out
            and Sign in sat off-screen (434 px on / itself). So the wordmark
            shows from 400 px (the शि mark alone is the logo on the smallest
            phones), ← Back from sm (phones have the system back gesture),
            and the row's gaps are 8 px below sm. Re-measured with the new
            markup the same day (Inter, both auth states): 360 px guest 241 /
            signed-in 282 px of a 328 px box; 400 px signed-in 356 of 368
            (368 of 368 with 12 px gaps, hence the 8); 412 px signed-in 356
            of 380; 640 px signed-in 581 of 592. Do not "restore" the
            wordmark, Back or the gaps without re-measuring both auth states
            at 360 and 400 px. Admin pages keep the old brand and Back. */}
        <div className="flex shrink-0 items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            {/* font-sans (16 Sep 2026): under the body's font-multi stack these
                two letters were one reason English pages fetched the 121 KB Noto
                Sans Devanagari web font; the device's own Devanagari font draws
                the logo instead. Same class on the other "शि" logo marks. */}
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-saffron-500 font-sans text-lg font-bold text-white">
              शि
            </span>
            {admin ? (
              <span className="text-lg font-semibold tracking-tight text-ink-900">Shishya</span>
            ) : (
              <span className="hidden flex-col min-[400px]:flex">
                <span className="text-lg font-semibold leading-tight tracking-tight text-ink-900">Shishya</span>
                {/* 26 Sep 2026: the home page's h1, verbatim — the one place
                    the header says "free". From md only: at sm a signed-in
                    rail (Dashboard, Profile, bell, Sign out) plus this line
                    would overflow the row. */}
                <span className="hidden text-[11px] font-medium leading-tight text-ink-500 md:block">
                  One smart place to study
                </span>
              </span>
            )}
            {admin && (
              <span className="ml-2 rounded-md bg-ink-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                Admin
              </span>
            )}
          </Link>
          {admin ? (
            <BackLink />
          ) : (
            // display:contents from sm, so on "/" (where BackLink renders
            // nothing) no empty flex item adds a stray gap.
            <div className="hidden sm:contents">
              <BackLink />
            </div>
          )}
        </div>

        {/* Middle: today's quote. The nav gained the Jobs-Map pill
            (Aug 2026), so below xl the middle can't fit a readable
            sentence — it was clipping mid-word against the nav. Show
            the quote only from xl up, where it has honest room;
            min-w-0 + mr-3 keep a gap from the nav even at tight xl widths.
            20 Sep 2026: one line with truncate cut the bilingual quotes
            mid-word ("… accomplished by ef…"); the quote now wraps to two
            balanced lines inside the 64 px header — the longest of the 42
            quotes (119 characters) fits at the narrowest xl width.
            26 Sep 2026: the three rail pills are gone, so the quote has
            more room than before at xl; it stays xl+ until someone
            measures the lg widths in both auth states. */}
        {quote && (
          <p
            className={`ml-4 mr-3 hidden min-w-0 flex-1 text-balance text-center italic text-ink-500 xl:block ${longQuote ? "text-xs leading-tight" : "text-[13px] leading-snug"}`}
            title={quote.author ? `${quote.text} — ${quote.author}` : quote.text}
          >
            {/* The two-line cap sits on an inner span: on the <p> its display
                value would fight "hidden" / "xl:block". */}
            <span className={longQuote ? "line-clamp-3" : "line-clamp-2"}>
              <span className="mr-1.5 text-saffron-500" aria-hidden>✦</span>
              <span className="font-medium text-ink-700">{quote.text}</span>
              {quote.author && (
                <span className="ml-2 text-ink-400">— {quote.author}</span>
              )}
            </span>
          </p>
        )}

        {/* Right: language switcher + auth controls (Sign in stays the filled
            button at every width).
            26 Sep 2026: the rail's three pills left it, so the row fits a
            360 px phone in both auth states:
              • "🗺️ India's Govt Jobs Map" (/jobs-map) — it belongs under
                Careers: the home Careers door's "Govt jobs map" chip, the
                /jobs hub and the vacancy rails link it.
              • "🎉 Results" (/results) — moved into the Primary row below,
                as a plain white link at every width.
              • "Aptitude Test" (/aptitude) — Surge's own admission-screening
                test for hiring, not for learners; noindex and now reached by
                direct URL only (share https://shishya.in/aptitude with
                candidates). */}
        <nav className="ml-auto flex shrink-0 items-center gap-2 text-sm text-ink-700 sm:gap-3">
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
          is what a sitelink displays.
          20 Sep 2026 (founder): the row is a bar in the exact orange of the
          Ask button (saffron-500, #f97316 — his call after saffron-600 read
          as too heavy), white bold links like that button's label.
          26 Sep 2026 (founder brief: the strip spoke only of government
          exams): the row is now the platform's structure — Ask Shishya ·
          School · Entrance exams · Government exams · College &
          scholarships · Careers │ Exam calendar · Results · Current
          affairs. Nothing in it is hidden at any width, so every phone and
          every crawler reads the same row (three of the old seven were
          sm+ only). Sections sit left; from lg the divider takes ml-auto so
          the exam utilities sit right. The row still scrolls sideways on
          narrow screens; at 360 px a guest sees Ask Shishya, School,
          Entrance exams and the cut start of Government exams — the cut
          word is the scroll cue, so the scrollbar is hidden (measured: on
          a Windows desktop a classic horizontal scrollbar took 16 of the
          36 px and forced a second, vertical one inside the bar). Widths,
          measured in Inter the same day: guest row 934 px of content at
          16 px gaps, 898 at lg's 12 px — fits from 1024 px; signed-in (+ the
          Today pill) fits from about 1065 px and at 1024 shows "Current
          affairs" cut, scrollable. From xl the gaps open to 24 px (both
          auth states still fit at 1280). data-nav names each link for tap
          attribution. Where the old row's links went:
            • All Exams (/exams/browse) — renamed "Government exams", same
              URL, so the existing sitelink target stays.
            • Exam Calendar (/exam-calendar) — kept, as "Exam calendar".
            • Live Tests (/live-test) — kept, as "Live tests" after Exam
              calendar (founder-side call at integration, 26 Sep 2026: the
              Sunday All-India test is a signature feature and the header is
              its only permanent link). The builder had dropped it because
              every other link to it is conditional — every
              remaining link is conditional: the exam pages of that week's
              Sunday roster (TOP_EXAMS = 6 in src/lib/live-test.ts) and of
              exam-week rehearsals, attempt results that carry an All-India
              rank, the home banner only while a test is open or opening,
              and, for signed-in users, the dashboard banners and the Sunday
              coach-plan item.
            • Find Your Exam (/find-your-exam) — the home finder line and
              the "Find mine" rail, /exams/state, the sitemap.
            • Current Affairs (/current-affairs) — kept, now at every width:
              the header is its only site-wide internal link.
            • Mentors (/mentors) — the supply side ("Become a mentor"): the
              home page's foot line, /dashboard and /mentor link it.
            • Pricing (/pricing) — the footer's "Pricing" link and the
              sitemap; a Pricing anchor on every page contradicted "free" at
              a glance. The page keeps its Razorpay-KYC role. */}
      {!admin && (
        <nav
          aria-label="Primary"
          className="border-t border-saffron-500 bg-saffron-500"
        >
          <div className="container-prose flex h-9 items-center gap-4 overflow-x-auto whitespace-nowrap text-[13px] font-bold text-white [scrollbar-width:none] lg:gap-3 xl:gap-6 [&::-webkit-scrollbar]:hidden">
            {/* Signed-in only, first so it is always on-screen on phones
                (the row scrolls horizontally). Client island; renders
                nothing for anonymous visitors and crawlers. */}
            <TodayNavLink />
            {/* 26 Sep 2026: the tutor, first in the DOM so it is on-screen on
                every phone and tab order matches what is seen. Plain /chat
                picks the right tutor: guests get the free general tutor with
                no sign-in, members their exam tutor, Class 8-12 school
                accounts their class chat. prefetch off: /chat runs auth()
                and the database, and ~135 pages must not prefetch it. */}
            <Link
              href="/chat"
              prefetch={false}
              data-nav="ask"
              title="Ask Shishya — free, no sign-in"
              className="rounded-md bg-white px-2.5 py-0.5 text-saffron-700 hover:bg-saffron-50"
            >
              Ask Shishya
            </Link>
            {/* 26 Sep 2026 (integration): the section and utility links carry
                no title tooltips — only Ask Shishya keeps one. The /hi and /te
                twin gate (src/lib/twin-localisation.ts) counts every twin
                page's hard-coded English, this header included, against the
                pinned TWIN_CHROME.literalLatin. Eight English tooltips (457
                letters) pushed the updates, cutoff, score-estimate and
                exam-calendar twins past the guard in
                tests/unit/index-shape-twins.test.ts: the live gate would have
                under-counted English by ~344 letters a page and could have
                indexed English-heavy twins as "localised". Without them the
                header's measured English is 144 letters (old header: 257), so
                the calibrated gate stays conservative. The labels are the home
                doors' own titles; re-measure the twin gate before adding any
                tooltip back. */}
            <Link href="/schooling" data-nav="school" className={SECTION_LINK}>
              School
            </Link>
            {/* No page lists admission tests alone, so the Entrance door on
                the home page (li#entrance, HomeDoors.tsx) is the section:
                JEE, NEET, CUET, NDA and olympiad chips. Point this at an
                entrance-only catalogue view the day one exists. */}
            <Link href="/#entrance" data-nav="entrance" className={SECTION_LINK}>
              Entrance exams
            </Link>
            <Link href="/exams/browse" data-nav="government" className={SECTION_LINK}>
              Government exams
            </Link>
            <Link href="/colleges" data-nav="college" className={SECTION_LINK}>
              College &amp; scholarships
            </Link>
            <Link href="/careers" data-nav="careers" className={SECTION_LINK}>
              Careers
            </Link>
            <span aria-hidden className="h-4 w-px shrink-0 bg-white/40 lg:ml-auto" />
            <Link href="/exam-calendar" data-nav="calendar" className={UTILITY_LINK}>
              Exam calendar
            </Link>
            <Link href="/live-test" data-nav="live-tests" className={UTILITY_LINK}>
              Live tests
            </Link>
            <Link href="/results" data-nav="results" className={UTILITY_LINK}>
              Results
            </Link>
            <Link href="/current-affairs" data-nav="current-affairs" className={UTILITY_LINK}>
              Current affairs
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
