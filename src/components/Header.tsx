// Reusable header with brand + auth state + language switcher.
// Server Component — reads the session via NextAuth helper.
//
// Until Shishya hits 100k users we focus the entire surface on entrance
// exams. The lifecycle nav (Schooling, Colleges, Scholarships, etc.)
// is intentionally hidden from the primary header — those routes stay
// live for direct visitors and SEO but we don't advertise them. The
// only navigation surface here is a single "Browse exams" CTA.

import Link from "next/link";
import { auth } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { LangSwitcher } from "./LangSwitcher";
import { BackLink } from "./BackLink";
import { NotificationBell } from "./NotificationBell";

export async function Header({ admin = false }: { admin?: boolean }) {
  const [session, { locale, t }] = await Promise.all([auth(), getT()]);
  return (
    <header className="border-b border-ink-200/50 bg-white/80 backdrop-blur">
      {/* Single row: brand · "Browse exams" CTA · language + auth.
          No lifecycle nav, no hamburger — the entire surface is
          exam-focused until we hit 100k users. */}
      <div className="container-prose flex h-16 items-center gap-3">
        {/* Left: brand + back-link. */}
        <div className="flex shrink-0 items-center gap-3">
          <Link href={session?.user ? "/dashboard" : "/"} className="flex items-center gap-2">
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
          {/* Back button — hidden on landing; tries history first, then a
              path-derived parent for direct/SEO-landed visitors. */}
          <BackLink />
        </div>

        {/* Middle: a single, prominent "Browse exams" CTA. Admin pages
            hide it to keep the operator surface dense. On sub-sm screens
            the CTA collapses to just "Exams" so the right-side auth
            controls always have room. */}
        {!admin && (
          <nav className="ml-2 flex flex-1 justify-center sm:ml-6" aria-label="Primary">
            <Link
              href="/exams"
              className="inline-flex items-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold text-saffron-800 hover:bg-saffron-50/70"
            >
              <span className="hidden sm:inline">Browse exams</span>
              <span className="sm:hidden">Exams</span>
            </Link>
          </nav>
        )}

        {/* Right: language switcher + auth controls. ml-auto so it pins
            to the far right even when the middle CTA is hidden. */}
        <nav className="ml-auto flex shrink-0 items-center gap-3 text-sm text-ink-700">
          {!admin && <LangSwitcher current={locale} />}
          {session?.user ? (
            <>
              <Link href="/dashboard" className="hidden hover:text-ink-900 sm:inline">
                {t("nav.dashboard")}
              </Link>
              <Link href="/me" className="hidden hover:text-ink-900 sm:inline" title="Your contributions">
                Profile
              </Link>
              <NotificationBell />
              <Link href="/logout" className="rounded-md border border-ink-300 px-3 py-1.5 text-xs font-medium hover:bg-ink-50">
                {t("nav.signout")}
              </Link>
            </>
          ) : (
            <Link href="/login" className="btn-primary !py-2 !px-4 text-xs sm:text-sm">
              {t("nav.signin.short")}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
