// Single source of truth for every "how many languages" claim in copy.
//
// Audit 11 Sep 2026: live pages said "22 Indian languages", "हिंदी + 12
// languages", "19 languages" — three different numbers for one feature.
// The only list the product actually honours is `locales` in i18n.ts —
// it drives the site UI, the in-test question translator
// (/api/mocks/[id]/translate validates against it) and the language
// switchers — so every count is derived from it here. Add a locale
// there and every sentence updates itself; never type a number.

import { locales } from "@/lib/i18n";

/** Every supported locale, English included. */
export const LANGUAGE_COUNT: number = locales.length;

/** Indian languages — everything except English. */
export const INDIAN_LANGUAGE_COUNT: number = LANGUAGE_COUNT - 1;

/** Indian languages other than Hindi — for "हिंदी + N languages" copy. */
export const OTHER_INDIAN_LANGUAGE_COUNT: number = INDIAN_LANGUAGE_COUNT - 1;
