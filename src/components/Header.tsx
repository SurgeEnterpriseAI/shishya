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

        {/* No middle nav. The homepage at / IS the exam discovery
            surface (guided funnel) — every header click should either
            return home (via the logo) or progress the user into the
            funnel/dashboard. The schooling / careers / colleges /
            scholarships routes stay live at their URLs but are not
            promoted here until Shishya hits its traction milestone. */}

        {/* Right: language switcher + auth controls (client component). */}
        <nav className="ml-auto flex shrink-0 items-center gap-3 text-sm text-ink-700">
          {!admin && (
            <HeaderAuthControls locale={DEFAULT_LOCALE} labels={RAIL_LABELS} />
          )}
        </nav>
      </div>
    </header>
  );
}
