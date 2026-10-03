// The site's default robots directives as a value (3 Oct 2026, fix plan C8).
//
// src/app/layout.tsx sets index, follow, max-image-preview:large and
// max-snippet:-1 for every page. Next merges metadata per top-level key, so a
// page that returns the key `robots` with the value `undefined` clears the
// layout's object and prints NO robots meta at all (the crawl audit found 84
// indexable URLs printing none: /after-10th, /after-12th, /exams/after/*,
// /find-your-exam and the exam-day pages in season). An indexable page either
// leaves the key out or returns this object. It is the same four values as
// the layout's block (tests/unit/site-robots.test.ts reads both); the layout
// keeps its own literal because its test stubs every import.

export const SITE_DEFAULT_ROBOTS = { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } as const;
