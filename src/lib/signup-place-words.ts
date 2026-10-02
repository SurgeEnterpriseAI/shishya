// The "Sign up with Google" words, for the SERVER (2 Oct 2026).
//
// The table — 76 entries, a tooltip and a caption each, in English, Hindi and
// Telugu — is ONE data source: src/data/signup-places/{en,hi,te}.json. This
// module imports all three languages statically, so it must never reach a
// browser: only server components, route handlers and tests import it.
// tests/unit/signup-places.test.ts walks the static imports of every
// "use client" file under src/ and fails if one reaches this module or the
// three files. A client island loads the reader's ONE language on demand
// instead (src/lib/signup-place-load.ts).
//
// A server-rendered button gets its words here and passes them to the button
// as plain text (SignUpButton and GoogleSignInButton take `text` and
// `short`), so they are in the page's HTML with the button: no wait, nothing
// moves.
//
// Which entry a button shows, and what fills it: src/lib/signup-place.ts.

import en from "@/data/signup-places/en.json";
import hi from "@/data/signup-places/hi.json";
import te from "@/data/signup-places/te.json";
import {
  signUpPlaceFor,
  signUpWordsFrom,
  signUpWordsLocale,
  type SignUpPlace,
  type SignUpPlaceInput,
  type SignUpTable,
  type SignUpWords,
} from "@/lib/signup-place";

/** The three languages' words (the data source itself — the tests read it too). */
export const SIGNUP_TABLES: Readonly<Record<"en" | "hi" | "te", SignUpTable>> = { en, hi, te };

/** The tooltip and the caption of one entry, in the reader's language (en /
 *  hi / te; anything else reads English). */
export function signUpPlaceWords(locale: string | null | undefined, place: SignUpPlace | null | undefined): SignUpWords {
  return signUpWordsFrom(SIGNUP_TABLES[signUpWordsLocale(locale)], place);
}

/** The words of a door, resolved on the server: spread
 *  `{...signUpWords(locale, { surface, callback, … })}` on a <SignUpButton>
 *  or a <GoogleSignInButton>. */
export function signUpWords(locale: string | null | undefined, input: SignUpPlaceInput): SignUpWords {
  return signUpPlaceWords(locale, signUpPlaceFor(input));
}
