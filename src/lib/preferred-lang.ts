// The student's language is a first-class fact (12 Sep 2026).
//
// Pure helpers — no prisma, no "server-only" — shared by the onboarding
// wizard (client), POST /api/me/preferences, /mocks/[id], /api/chat and the
// anonymous quiz overlay. Unit-tested in tests/unit/preferred-lang.test.ts.
//
// RESOLUTION ORDER — one rule, used everywhere a language is picked:
//
//   explicit choice (request body / URL locale / a tap)
//     > User.preferredLang when it is NOT the default EN
//     > shishya-lang cookie
//     > "en"
//
// Why EN counts as "unset": User.preferredLang is `Language @default(EN)`
// and nothing wrote the column before this wave, so all 1,565 accounts sat
// on EN whether they chose it or not (audit 11 Sep 2026). No schema change
// is allowed, so a stored EN is read as "no signal" and the cookie decides.
// To honour "never auto-switch a student who explicitly chose English",
// every explicit EN tap (onboarding chip, header LangSwitcher) ALSO writes
// the cookie shishya-lang=en, so the fallback lands on English. Accepted
// trade-off: a member who chose EN on device A and opens device B with a
// stale hi cookie sees the Hindi UI until they touch the switcher once.
//
// Zero model calls live here or in any caller added this wave.

import { STATES } from "@/lib/state-info";
import { locales, type Locale } from "@/lib/i18n";

/** prisma `enum Language` — the only values User.preferredLang can hold.
 *  Kept in step by hand; the schema is read-only this wave. */
export const LANGUAGE_CODES = ["EN", "HI", "TE", "TA", "KN", "ML", "MR", "BN", "GU", "PA"] as const;
export type LanguageCode = (typeof LANGUAGE_CODES)[number];

export function isLanguageCode(x: unknown): x is LanguageCode {
  return typeof x === "string" && (LANGUAGE_CODES as readonly string[]).includes(x);
}

function isLocale(x: unknown): x is Locale {
  return typeof x === "string" && (locales as readonly string[]).includes(x);
}

/** i18n locale ("hi") or enum code ("HI") → enum code. Locales with no enum
 *  value (kok, as, ks, mni, ne, or, sa, sd, ur) and garbage → null. */
export function localeToLanguage(locale: string | null | undefined): LanguageCode | null {
  if (!locale) return null;
  const up = locale.trim().toUpperCase();
  return isLanguageCode(up) ? up : null;
}

/** Enum code ("MR") → i18n locale ("mr"); null when the code is unknown. */
export function languageToLocale(code: string | null | undefined): Locale | null {
  if (!code) return null;
  const lc = code.trim().toLowerCase();
  return isLocale(lc) ? lc : null;
}

/** The medium to pre-select in onboarding from the student's state — the
 *  first entry of STATES[code].languages (state-info.ts is the single
 *  source of truth: Hindi belt → HI, MH → MR, AP/TS → TE, TN/PY → TA,
 *  KA → KN, GJ/DN → GU, KL/LD → ML, PB/CH → PA, WB/AS/TR → BN). States whose
 *  first language has no enum value (Odisha — Odia is not in the enum yet)
 *  and unknown/empty codes suggest EN. Only ever a suggestion: the student
 *  confirms or changes it in one tap. */
export function suggestLangForState(stateCode: string | null | undefined): LanguageCode {
  if (!stateCode) return "EN";
  const first = STATES[stateCode]?.languages?.[0];
  return isLanguageCode(first) ? first : "EN";
}

/** The resolution rule from the header. Every input is optional and
 *  tolerant of garbage; the result is always a real Locale. */
export function resolvePreferredLocale(input: {
  /** A choice made right now: request body, URL twin locale, a tap. */
  explicit?: string | null;
  /** User.preferredLang — EN is read as "unset" (see header). */
  preferredLang?: string | null;
  /** The shishya-lang cookie value. */
  cookie?: string | null;
}): Locale {
  if (isLocale(input.explicit)) return input.explicit;
  if (input.preferredLang && input.preferredLang !== "EN") {
    const lc = languageToLocale(input.preferredLang);
    if (lc) return lc;
  }
  if (isLocale(input.cookie)) return input.cookie;
  return "en";
}

/** What the tutor prompt's "Reply language: …" line gets — the enum code
 *  when the locale maps to one ("hi" → "HI"), else the locale code itself
 *  ("kok"), mirroring /api/explain so all 19 locales keep working. */
export function langToReplyLanguage(locale: Locale): string {
  return localeToLanguage(locale) ?? locale;
}

// ── Native-medium guard ────────────────────────────────────────────────
// Unicode blocks of each locale's script. Used to refuse overlaying a cached
// translation onto a question that is ALREADY written in that script (a
// paper authored natively in Hindi must never be "translated" to Hindi).
const SCRIPT_RE: Partial<Record<Locale, RegExp>> = {
  hi: /[ऀ-ॿ]/g,
  mr: /[ऀ-ॿ]/g,
  kok: /[ऀ-ॿ]/g,
  ne: /[ऀ-ॿ]/g,
  sa: /[ऀ-ॿ]/g,
  bn: /[ঀ-৿]/g,
  as: /[ঀ-৿]/g,
  mni: /[ঀ-৿]/g,
  pa: /[਀-੿]/g,
  gu: /[઀-૿]/g,
  or: /[଀-୿]/g,
  ta: /[஀-௿]/g,
  te: /[ఀ-౿]/g,
  kn: /[ಀ-೿]/g,
  ml: /[ഀ-ൿ]/g,
  ur: /[؀-ۿ]/g,
  sd: /[؀-ۿ]/g,
  ks: /[؀-ۿ]/g,
};

/** True when `text` is already written (mostly) in `locale`'s script —
 *  i.e. at least as many letters of that script as Latin letters. English
 *  text with a stray native word stays "not native"; a Devanagari question
 *  with "GDP" in it is native. "en" is never native here (nothing to
 *  overlay for English anyway). */
export function looksNativelyIn(text: string, locale: Locale): boolean {
  const re = SCRIPT_RE[locale];
  if (!re || !text) return false;
  const script = (text.match(re) ?? []).length;
  if (script === 0) return false;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  return script >= latin;
}
