// The three languages the app surfaces carry, and how a client island
// finds the visitor's one (16 Sep 2026).
//
// Why this file exists: src/lib/i18n.ts holds the dictionary, but the
// surfaces in this wave (ideas board, dashboard cards, quiz entry points,
// the share landing, discussion labels) are a mix of server pages that can
// call getT() and client islands whose SERVER caller lives in a file this
// partition does not own. So their words live in small COPY maps next to
// the surface — the src/lib/challenge-copy.ts pattern — with en, hi and te
// and an English fallback for every other locale.
//
// Two rules the callers follow:
//   • A server component that already has a locale (getT() / getLocale())
//     passes it in — no cookie read, no flash.
//   • A client island whose caller cannot pass one reads the shishya-lang
//     cookie AFTER mount (useEffect), never during render: the server has
//     no way to know it, so rendering English first and switching on mount
//     is the only hydration-safe order. Same trick as ChatInterface's
//     uiLang() (16 Sep 2026) and the Header's language island.
//
// English strings in every module that imports this are byte-identical to
// the literals they replaced; tests/unit/i18n-c-app-copy.test.ts pins that.

export type CopyLocale = "en" | "hi" | "te";

export const COPY_LOCALES: readonly CopyLocale[] = ["en", "hi", "te"];

/** Any locale string → the one we have words for; everything else is en. */
export function asCopyLocale(locale: string | null | undefined): CopyLocale {
  return locale === "hi" || locale === "te" ? locale : "en";
}

/** The entry for this locale, falling back to English like tk() does. */
export function pickCopy<T>(map: Readonly<Record<CopyLocale, T>>, locale: string | null | undefined): T {
  return map[asCopyLocale(locale)];
}

/** The site UI language from the `shishya-lang` cookie (set by the
 *  LangSwitcher, by onboarding, and by the middleware on a /hi or /te URL
 *  when the visitor has none). On a /hi or /te URL the prefix wins, in
 *  getLocale()'s own order: the server rendered that twin in that language
 *  whatever the cookie says. Browser only — returns "en" on the server and
 *  whenever neither can be read. A stored User.preferredLang is invisible
 *  here; a caller that has it passes `locale` instead. */
export function clientUiLocale(): CopyLocale {
  try {
    if (typeof document === "undefined") return "en";
    const fromUrl = typeof location === "undefined" ? null : location.pathname.match(/^\/(hi|te)(?:\/|$)/);
    if (fromUrl) return asCopyLocale(fromUrl[1]);
    const m = document.cookie.match(/(?:^|;\s*)shishya-lang=([^;]+)/);
    return asCopyLocale(m?.[1]);
  } catch {
    return "en";
  }
}
