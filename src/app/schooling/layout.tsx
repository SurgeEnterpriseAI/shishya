// /schooling/** — shared layout.
//
// 25 Sep 2026 (school build, Step 0): the whole school section is noindex
// (links still followed) until chapter content passes a content gate. The
// pages stay reachable by URL. Every page under here also sets
// SCHOOLING_ROBOTS itself, so a page that later adds its own `robots`
// cannot silently drop the noindex; tests/unit/schooling-honesty.test.ts
// checks both.

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SCHOOLING_ROBOTS } from "@/lib/schooling-data";

export const metadata: Metadata = {
  robots: SCHOOLING_ROBOTS,
};

export default function SchoolingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
