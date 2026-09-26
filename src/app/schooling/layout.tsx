// /schooling/** — shared layout.
//
// 25 Sep 2026 (school build, Step 0): the whole section was noindex here
// (links followed) until chapter content passed a content gate.
// 26 Sep 2026 (school go-live): the section is public page by page, so this
// layout no longer sets robots — a layout-level noindex would override
// nothing (a page's own `robots` wins) but read as if the section were
// still hidden. Every page under here sets `robots` itself: SCHOOLING_ROBOTS
// (noindex) for a page with nothing of its own, schoolRobots(indexable)
// otherwise (src/lib/schooling-data.ts); tests/unit/schooling-honesty.test.ts
// checks every metadata return.

import type { ReactNode } from "react";

export default function SchoolingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
