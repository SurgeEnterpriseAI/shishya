"use client";

// The /colleges filters, read from the URL in the browser (26 Sep 2026) so
// the page itself stays static and its metadata renders in <head> for every
// crawler. See CollegeFinder.tsx for why. Wrapped in <Suspense> by the page;
// the server-rendered fallback is the same component with no filters.

import { useSearchParams } from "next/navigation";
import { CollegeFinder, parseCollegeFilters } from "./CollegeFinder";

export function CollegeFinderFromQuery() {
  const sp = useSearchParams();
  const filters = parseCollegeFilters({ stream: sp.get("stream"), state: sp.get("state"), type: sp.get("type") });
  return <CollegeFinder {...filters} />;
}
