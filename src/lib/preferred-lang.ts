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

// ── Tutor language requests (15 Sep 2026) ────────────────────────────────
// A student who types "Marathi", "hindi me btao" or "explain in telugu" is
// asking the tutor to answer in that language. Nothing used to read the
// message: the prompt said "Reply language: EN" and one such student got
// "Got it! I'll reply in English from now on". Deliberately conservative — a
// question ABOUT a language ("Hindi sandhi ke bhed", "Is Marathi compulsory
// for MPSC?") is not a request. The choice is remembered for the tutor only,
// in its own cookie, so the site's interface language never changes under
// the student.

export const TUTOR_LANG_COOKIE = "shishya-tutor-lang";

const LANGUAGE_WORDS: ReadonlyArray<readonly [Locale, readonly string[]]> = [
  ["en", ["english", "angrezi", "angreji", "अंग्रेजी", "अंग्रेज़ी", "ఇంగ్లీష్"]],
  ["hi", ["hindi", "हिंदी", "हिन्दी", "హిందీ"]],
  ["te", ["telugu", "తెలుగు"]],
  ["ta", ["tamil", "தமிழ்"]],
  ["kn", ["kannada", "ಕನ್ನಡ"]],
  ["ml", ["malayalam", "മലയാളം"]],
  ["mr", ["marathi", "मराठी"]],
  ["bn", ["bengali", "bangla", "বাংলা"]],
  ["gu", ["gujarati", "ગુજરાતી"]],
  ["pa", ["punjabi", "ਪੰਜਾਬੀ"]],
  ["or", ["odia", "oriya", "ଓଡ଼ିଆ"]],
  ["ur", ["urdu", "اردو"]],
  ["as", ["assamese", "অসমীয়া"]],
  ["kok", ["konkani", "कोंकणी"]],
  ["ne", ["nepali", "नेपाली"]],
  ["sa", ["sanskrit", "संस्कृत", "संस्कृतम्"]],
  ["sd", ["sindhi", "سنڌي"]],
  ["ks", ["kashmiri", "کٲشُر"]],
  ["mni", ["manipuri", "meitei", "মৈতৈলোন্"]],
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// "in X" markers that follow the language word: Hinglish me/mein, Marathi
// madhe/मध्ये/त, Telugu lo/లో, Kannada ದಲ್ಲಿ, Hindi में.
const IN_MARKER = "(?:me|mein|mai|mei|madhe|madhye|mdhe|lo|में|मध्ये|त|లో|ದಲ್ಲಿ)";
const POLITE = "(?:please|pls|plz|language|bhasha|bhasa|only|medium|me|mein)";
const ASK_VERB =
  "(?:btao|batao|bataiye|batayiye|samjhao|samjhaiye|samjhayiye|bolo|boliye|likho|jawab|answer|explain|cheppu|cheppandi|chepandi|sang|sanga|samjav|samjava|बताओ|बताइए|बताइये|समझाओ|समझाइए|सांगा|समजावून|చెప్పండి|చెప్పు|వివరించండి)";

/** The language a tutor message explicitly asks for, or null. */
function matchLanguageRequest(message: string | null | undefined): { locale: Locale; bare: boolean } | null {
  if (!message) return null;
  const text = message.normalize("NFC").trim().toLowerCase().replace(/[.!?।,;:]+$/u, "").trim();
  if (!text || text.length > 200) return null;
  for (const [locale, words] of LANGUAGE_WORDS) {
    for (const w of words) {
      const lw = escapeRe(w);
      // The whole message is the language: "marathi", "in marathi please", "hindi me", "తెలుగులో", "मराठीत".
      if (new RegExp(`^(?:please\\s+|pls\\s+|plz\\s+)?(?:(?:in|into)\\s+)?${lw}(?:\\s*${IN_MARKER})?(?:\\s+${POLITE})?$`, "u").test(text)) return { locale, bare: true };
      // A reply verb aimed at the language: "explain in marathi", "can you answer in telugu", "switch to english".
      if (new RegExp(`(?:^|\\s)(?:reply|answer|explain|respond|speak|talk|write|tell|teach|continue|switch|chat|say|give)\\b[^.?!\\n]{0,30}?\\b(?:in|to|into)\\s+${lw}(?:[\\s,.;:!?।]|$)`, "u").test(text)) return { locale, bare: false };
      // Mixed-language asks: "hindi me btao", "telugu lo cheppandi", "marathi madhe sanga", "हिंदी में समझाओ".
      if (new RegExp(`(?:^|\\s)${lw}\\s*${IN_MARKER}\\s+${ASK_VERB}(?:[\\s,.;:!?।]|$)`, "u").test(text)) return { locale, bare: false };
      // Leading "in X" before the question: "in hindi and bhakti to koi ras hai…", "in telugu: …".
      if (new RegExp(`^(?:please\\s+)?in\\s+${lw}(?:\\s*[,:–—-]\\s*|\\s+(?:and|aur|also|pls|please)\\s+)`, "u").test(text)) return { locale, bare: false };
    }
  }
  return null;
}

/** The language a tutor message explicitly asks for, or null. */
export function detectLanguageRequest(message: string | null | undefined): Locale | null {
  return matchLanguageRequest(message)?.locale ?? null;
}

/** The language when the message is ONLY a language ("Marathi", "hindi me",
 *  "తెలుగులో"). After an answer it means: say that again in this language. */
export function bareLanguageRequest(message: string | null | undefined): Locale | null {
  const m = matchLanguageRequest(message);
  return m?.bare ? m.locale : null;
}

/** What the tutor model receives for a student message (15 Sep 2026, checked
 *  live): a bare language name after an answer got a fresh greeting, so it
 *  becomes an explicit request to give the previous answer again in that
 *  language. Everything else passes through unchanged; the stored chat keeps
 *  the student's own words. */
export function tutorMessageFor(message: string, hasPriorAnswer: boolean): string {
  const bare = hasPriorAnswer ? bareLanguageRequest(message) : null;
  if (!bare) return message;
  const word = LANGUAGE_WORDS.find(([l]) => l === bare)?.[1][0] ?? bare;
  return `Please give your previous answer again, in full, in ${word.charAt(0).toUpperCase()}${word.slice(1)}.`;
}
