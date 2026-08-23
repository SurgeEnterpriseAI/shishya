// Server-side helpers for picking the active locale.
// Priority order:
//   0. `x-shishya-lang` request header — stamped by src/middleware.ts when
//      the URL carries a locale prefix (/hi/..., /te/...). URL beats
//      cookie so a crawler (no cookies) and a shared link both render the
//      language the URL promises. (23 Aug 2026 — SEO twins.)
//   1. cookie `shishya-lang`  (set by LangSwitcher)
//   2. session user.preferredLang (if signed in)
//   3. 'en' (default)

import "server-only";
import { cookies, headers } from "next/headers";
import { auth } from "./auth";
import { prisma } from "./db/prisma";
import { dict, locales, type Locale, type StringKey } from "./i18n";
import { LANG_HEADER, isUrlLocale, type PageLocale } from "./seo-locale";

const COOKIE_NAME = "shishya-lang";

/** The locale the URL itself asked for ("en" when the path has no
 *  prefix). Use this — not getLocale() — for canonical/hreflang/title
 *  decisions, so a Hindi-cookie user on the English URL still emits the
 *  English canonical and Google sees one stable answer per URL. */
export async function getUrlLocale(): Promise<PageLocale> {
  try {
    const h = await headers();
    const v = h.get(LANG_HEADER);
    if (isUrlLocale(v)) return v;
  } catch {
    /* headers() unavailable (static render) → en */
  }
  return "en";
}

export async function getLocale(): Promise<Locale> {
  const fromUrl = await getUrlLocale();
  if (fromUrl !== "en") return fromUrl;
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

/** t() bound to an explicit locale — for generateMetadata, which should
 *  localise by the URL locale rather than the cookie. */
export function tFor(locale: Locale | PageLocale) {
  return (key: StringKey) => (dict[locale as Locale] as any)?.[key] ?? dict.en[key];
}
