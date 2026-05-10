// Reusable header with brand + auth state + language switcher.
// Server Component — reads the session via NextAuth helper.

import Link from "next/link";
import { auth } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { LangSwitcher } from "./LangSwitcher";

export async function Header({ admin = false }: { admin?: boolean }) {
  const [session, { locale, t }] = await Promise.all([auth(), getT()]);
  return (
    <header className="border-b border-ink-200/50 bg-white/80 backdrop-blur">
      <div className="container-prose flex h-16 items-center justify-between gap-3">
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
        <nav className="flex items-center gap-3 text-sm text-ink-700">
          {!admin && <LangSwitcher current={locale} />}
          {session?.user ? (
            <>
              <Link href="/dashboard" className="hidden hover:text-ink-900 sm:inline">
                {t("nav.dashboard")}
              </Link>
              <span className="hidden text-ink-500 lg:inline">{session.user.email}</span>
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
