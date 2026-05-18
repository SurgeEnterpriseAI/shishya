// Reusable header with brand + lifecycle nav + auth state + language switcher.
// Server Component — reads the session via NextAuth helper.
//
// The 7-item lifecycle nav (Schooling → Worldwide) positions Shishya
// as a multi-stage education platform; collapses to a hamburger drawer
// below md so phones stay usable.

import Link from "next/link";
import { auth } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { LangSwitcher } from "./LangSwitcher";
import { BackLink } from "./BackLink";
import { MobileNavToggle } from "./MobileNavToggle";
import { NotificationBell } from "./NotificationBell";

const PRIMARY_NAV: Array<{ href: string; label: string; short: string }> = [
  { href: "/schooling",       label: "Schooling",               short: "School" },
  { href: "/colleges",        label: "Colleges & Graduation",   short: "Colleges" },
  { href: "/exams",           label: "Entrance & Govt Exams",   short: "Exams" },
  { href: "/post-graduation", label: "Post-Graduation",          short: "PG" },
  { href: "/jobs",            label: "Jobs & Careers",           short: "Jobs" },
  { href: "/worldwide",       label: "Worldwide",                short: "Worldwide" },
  { href: "/insights",        label: "Insights",                 short: "Insights" },
];

export async function Header({ admin = false }: { admin?: boolean }) {
  const [session, { locale, t }] = await Promise.all([auth(), getT()]);
  return (
    <header className="border-b border-ink-200/50 bg-white/80 backdrop-blur">
      {/* Row 1: brand + right-side controls. */}
      <div className="container-prose flex h-16 items-center justify-between gap-3">
        <div className="flex items-center gap-3">
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
        <nav className="flex items-center gap-3 text-sm text-ink-700">
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
          {/* Mobile-only hamburger that opens the section drawer. */}
          {!admin && <MobileNavToggle items={PRIMARY_NAV} />}
        </nav>
      </div>

      {/* Row 2: lifecycle nav. Hidden on small screens (use hamburger).
          Admin pages skip this row to keep the operator surface dense. */}
      {!admin && (
        <nav
          className="hidden border-t border-ink-100 bg-white/60 md:block"
          aria-label="Primary"
        >
          <ul className="container-prose flex h-11 items-center gap-1 overflow-x-auto text-xs">
            {PRIMARY_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex items-center whitespace-nowrap rounded-md px-3 py-1.5 font-medium text-ink-700 hover:bg-saffron-50/50 hover:text-saffron-800"
                >
                  <span className="hidden lg:inline">{item.label}</span>
                  <span className="lg:hidden">{item.short}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
