// URL-addressable locales for SEO (23 Aug 2026).
//
// Shishya's UI language is a cookie (shishya-lang) — invisible to
// crawlers, so Hindi/Telugu pages never existed as far as Google was
// concerned. This helper + src/middleware.ts give the main public
// surfaces crawlable twins:
//
//   /exams/SSC_CGL            English (canonical, x-default)
//   /hi/exams/SSC_CGL         Hindi   (self-canonical, hreflang hi-IN)
//   /te/exams/SSC_CGL         Telugu  (self-canonical, hreflang te-IN)
//
// The middleware REWRITES /hi/* and /te/* to the real route and stamps
// the `x-shishya-lang` header; getLocale() honours that header before
// the cookie, so the same page component renders in the URL's language.
// The cookie keeps working for users; the URL is for crawlers and for
// shareable/searchable entry points.
//
// Only locales with enough dictionary coverage get URL twins for now.
//
// 13 Sep 2026 (index shape): "self-canonical, hreflang-paired" now holds
// only for a twin whose rendered body is ≥ 30% native script
// (src/lib/twin-localisation.ts → TwinVerdict below). A twin under that
// canonicalises to the English URL and is left out of hreflang, the
// sitemap and IndexNow; the URL itself keeps serving.

import type { Locale } from "@/lib/i18n";

export const SITE = "https://shishya.in";
export const URL_LOCALES = ["hi", "te"] as const;
export type UrlLocale = (typeof URL_LOCALES)[number];
export type PageLocale = "en" | UrlLocale;

export const LANG_HEADER = "x-shishya-lang";

export function isUrlLocale(x: unknown): x is UrlLocale {
  return typeof x === "string" && (URL_LOCALES as readonly string[]).includes(x);
}

/** Path for a locale: "/exams/X" → "/hi/exams/X"; "/" → "/hi". */
export function localizedPath(path: string, locale: Locale | PageLocale): string {
  if (!isUrlLocale(locale)) return path;
  return `/${locale}${path === "/" ? "" : path}`;
}

export function localizedUrl(path: string, locale: Locale | PageLocale): string {
  return `${SITE}${localizedPath(path, locale)}`;
}

/** Is each twin of a page genuinely localised? Measured by
 *  src/lib/twin-localisation.ts (native-script share of the rendered body,
 *  13 Sep 2026). A twin that is not stays reachable but is never declared:
 *  no hreflang entry, canonical → the English URL. */
export interface TwinVerdict {
  hi: boolean;
  te: boolean;
}
export const NO_TWINS: TwinVerdict = { hi: false, te: false };
export const ALL_TWINS: TwinVerdict = { hi: true, te: true };

/** Next.js `alternates.languages` block — reciprocal on every twin that is
 *  localised (default: both, the pre-13 Sep behaviour). */
export function languageAlternates(path: string, twins: TwinVerdict = ALL_TWINS): Record<string, string> {
  const out: Record<string, string> = { "en-IN": `${SITE}${path}` };
  if (twins.hi) out["hi-IN"] = `${SITE}${localizedPath(path, "hi")}`;
  if (twins.te) out["te-IN"] = `${SITE}${localizedPath(path, "te")}`;
  out["x-default"] = `${SITE}${path}`;
  return out;
}

/** Canonical for a page rendered at `locale`: self for English and for a
 *  localised twin; the English URL for a twin that is not localised. */
export function twinCanonical(path: string, locale: Locale | PageLocale, twins: TwinVerdict): string {
  return isUrlLocale(locale) && !twins[locale] ? `${SITE}${path}` : localizedUrl(path, locale);
}

export function ogLocale(locale: Locale | PageLocale): string {
  return locale === "hi" ? "hi_IN" : locale === "te" ? "te_IN" : "en_IN";
}

export function inLanguage(locale: Locale | PageLocale): string {
  return locale === "hi" ? "hi-IN" : locale === "te" ? "te-IN" : "en-IN";
}

/** BCP-47 for <html lang>. */
export function htmlLang(locale: Locale | string): string {
  return typeof locale === "string" && /^[a-z]{2,3}$/.test(locale) ? locale : "en";
}
