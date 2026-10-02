// The "Sign up with Google" words, for a BROWSER (2 Oct 2026): one language,
// loaded on demand — and the rules that choose the sentence with it.
//
// The table is about 24 KB in English and 61-63 KB in Hindi and in Telugu
// (5-7 KB each on the wire), and the rules that pick an entry
// (src/lib/signup-place.ts) are another 10 KB. The header is on every page
// and page weight is the first suspect for a sign-up dip, so NO client
// component imports either of them statically. A client island asks for a
// "kit" — the reader's ONE language and the rules — once the page has loaded
// and the browser is idle, at once where a caption is waiting on screen, or
// when a button is hovered or takes the keyboard focus before that
// (src/lib/use-signup-words.ts). Each language is its own chunk and so are
// the rules; each is fetched once and kept in memory. A fetch that fails is
// counted here, so the hook can try again and let go of a caption's line.
// tests/unit/signup-places.test.ts pins that the three word files and the
// rules are reached from "use client" code only through the dynamic imports
// below.
//
// Server components read the words through src/lib/signup-place-words.ts and
// hand them to the button as text; this module is for the islands that only
// exist in the browser (the header's tooltip, the site card, the timed bar,
// the early line) and for doors rendered by client components.
//
// Pure of React: a tiny store (subscribe / snapshot) that
// src/lib/use-signup-words.ts reads with useSyncExternalStore.

import type { SignUpTable } from "@/lib/signup-place";

export type SignUpWordsLang = "en" | "hi" | "te";

/** The language of the words: en, hi or te — anything else reads English
 *  (the same rule as signUpWordsLocale in src/lib/signup-place.ts; the test
 *  keeps the two in step). */
export function signUpWordsLang(locale: string | null | undefined): SignUpWordsLang {
  return locale === "hi" || locale === "te" ? locale : "en";
}

/** The rules module (which entry a placement shows, and how it is filled). */
type SignUpRules = typeof import("@/lib/signup-place");

/** One language's words and the rules: all a client button needs. */
export interface SignUpKit {
  table: SignUpTable;
  rules: SignUpRules;
}

const TABLES: Readonly<Record<SignUpWordsLang, () => Promise<{ default: SignUpTable }>>> = {
  en: () => import("@/data/signup-places/en.json"),
  hi: () => import("@/data/signup-places/hi.json"),
  te: () => import("@/data/signup-places/te.json"),
};
const loadRules = (): Promise<SignUpRules> => import("@/lib/signup-place");

const kits: Partial<Record<SignUpWordsLang, SignUpKit>> = {};
const pending: Partial<Record<SignUpWordsLang, Promise<SignUpKit>>> = {};
// Fetches of a language that failed since it was last asked for with success
// (a weak signal, a phone that went offline): the hook tries again, and a
// caption's line is not held open for words that may never come.
const failures: Partial<Record<SignUpWordsLang, number>> = {};
const listeners = new Set<() => void>();

function tell(): void {
  for (const fn of [...listeners]) fn();
}

/** The language's kit if it is already here, else null (no request). */
export function cachedSignUpKit(lang: SignUpWordsLang): SignUpKit | null {
  return kits[lang] ?? null;
}

/** How many fetches of this language's kit have failed in a row (0: none
 *  failed, or the kit is here). */
export function signUpKitFailures(lang: SignUpWordsLang): number {
  return kits[lang] ? 0 : failures[lang] ?? 0;
}

/** Called whenever a language's kit arrives, or a fetch of it fails. */
export function subscribeSignUpKits(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Fetch one language's words and the rules (once; later calls share the
 *  request). A failed fetch is counted and forgotten, so the next call tries
 *  again. */
export function loadSignUpKit(lang: SignUpWordsLang): Promise<SignUpKit> {
  const hit = kits[lang];
  if (hit) return Promise.resolve(hit);
  const running = pending[lang];
  if (running) return running;
  const p = Promise.all([TABLES[lang](), loadRules()])
    .then(([words, rules]) => {
      const kit: SignUpKit = { table: words.default, rules };
      kits[lang] = kit;
      delete pending[lang];
      delete failures[lang];
      tell();
      return kit;
    })
    .catch((err) => {
      delete pending[lang];
      failures[lang] = (failures[lang] ?? 0) + 1;
      tell();
      throw err;
    });
  pending[lang] = p;
  return p;
}
