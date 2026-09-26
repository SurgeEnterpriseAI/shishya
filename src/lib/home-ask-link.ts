// The /ask link on the home page's "How Shishya works" row (26 Sep 2026,
// entry points).
//
// Beside the tutor line (/chat — kept for people; robots.txt blocks /chat
// for every crawler) sits a plain link to /ask, the whole-platform search
// with AI answers, so the crawlable tutor page has a link from the home page.
// Its label is the /ask page's H1 ("Search or ask Shishya") in the reader's
// language, and it opens that language's twin (/hi/ask, /te/ask — public
// twins in src/middleware.ts TWIN_PUBLIC_RE). Pure, no JSX, so the unit test
// can import it (tests/unit/entry-points-ask-link.test.ts).

import { HOME_DOORS_COPY, type HomeDoorsCopy } from "@/lib/home-doors-copy";
import type { HomeCopyLocale } from "@/lib/home-strip-copy";

/** The /ask link beside the tutor line, per home-copy locale. */
export const HOME_ASK_PAGE_LINK: Readonly<Record<HomeCopyLocale, { href: string; label: string }>> = {
  en: { href: "/ask", label: "Search or ask Shishya →" },
  hi: { href: "/hi/ask", label: "Shishya पर खोजें या पूछें →" },
  te: { href: "/te/ask", label: "Shishyaలో వెతకండి లేదా అడగండి →" },
};

/** Which locale's copy the page passed — src/app/page.tsx passes
 *  HOME_DOORS_COPY[locale] — so the component needs no new prop. English
 *  when it is none of them. */
export function homeCopyLocaleOf(copy: HomeDoorsCopy): HomeCopyLocale {
  for (const l of ["hi", "te"] as const) if (HOME_DOORS_COPY[l] === copy) return l;
  return "en";
}
