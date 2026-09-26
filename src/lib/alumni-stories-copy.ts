// /alumni-stories head copy — title, meta description, CollectionPage
// JSON-LD, H1, subline and breadcrumb in one place (26 Sep 2026).
//
// Why: the page's <title>, meta description and CollectionPage JSON-LD called
// the stories "real career journeys from real Indian students", while the
// code and the page's own disclaimer box say they are composites. Search
// snippets and LLM answers quote the title and description, not the body
// disclaimer, so the head of the page has to say "composite" in plain words.
// One source for metadata, JSON-LD and the H1 so they cannot drift apart
// again; tests/unit/alumni-stories-copy.test.ts pins it.
//
// It lives in src/lib (not in the page) because a Next.js page file may only
// export its page fields. No imports, no counts: the number of examples is
// STORIES.length inside the page, never typed here.

export const ALUMNI_STORIES_COPY = {
  /** <title> and og:title source. */
  title: "Career journey examples — composite stories from Indian students | Shishya",
  /** H1 and the CollectionPage JSON-LD name (the title without the brand). */
  heading: "Career journey examples — composite stories from Indian students",
  /** Meta description and the CollectionPage JSON-LD description. */
  description:
    "Composite, anonymised examples built from several students' paths — not any one person's story. Tier-3 BTech to a product company, BA to UPSC, ITI to a state electricity board JE, Commerce to CA, NIOS to freelance writing.",
  /** The line under the H1. */
  subline:
    "Composite, anonymised examples built from several students' paths — no example is one person's story. Each shows a timeline, key decisions, setbacks and advice, failures and gaps included.",
  /** Visible breadcrumb and BreadcrumbList label. */
  breadcrumb: "Career journey examples",
  keywords: [
    "career journey examples india",
    "indian career journey",
    "tier 3 college career path",
    "NIOS to job",
    "ITI to government job",
    "BA to UPSC path",
  ],
} as const;
