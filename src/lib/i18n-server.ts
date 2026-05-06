// Server-side helpers for picking the active locale.
// Priority order:
//   1. cookie `shishya-lang`  (set by LangSwitcher)
//   2. session user.preferredLang (if signed in)
//   3. 'en' (default)

import "server-only";
import { cookies } from "next/headers";
import { auth } from "./auth";
import { prisma } from "./db/prisma";
import { dict, locales, type Locale, type StringKey } from "./i18n";

const COOKIE_NAME = "shishya-lang";

export async function getLocale(): Promise<Locale> {
  const c = await cookies();
  const fromCookie = c.get(COOKIE_NAME)?.value;
  if (fromCookie && (locales as readonly string[]).includes(fromCookie)) {
    return fromCookie as Locale;
  }
  // Fallback: read from user.preferredLang
  try {
    const session = await auth();
    if (session?.user?.id) {
      const u = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { preferredLang: true },
      });
      if (u?.preferredLang) {
        const lc = u.preferredLang.toLowerCase();
        if ((locales as readonly string[]).includes(lc)) return lc as Locale;
      }
    }
  } catch {
    // best-effort; fall through
  }
  return "en";
}

export async function getT() {
  const locale = await getLocale();
  return {
    locale,
    t: (key: StringKey) => (dict[locale] as any)[key] ?? dict.en[key],
  };
}
