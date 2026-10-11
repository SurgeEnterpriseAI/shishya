// Source-scan allowances that live ONLY until their scratchpad patch lands
// (6 Oct 2026, search plan doNow 1, build B1; review r1).
//
// src/app/layout.tsx belongs to build B3 this week, so B1's fix to the
// Organization JSON-LD description (on every page) ships as the index-only
// patch search-oct06/patches/layout.tsx.patch. Until it lands, this exact
// HEAD line is the one allowance in tests/unit/truth-lint.test.ts and
// tests/unit/search-honesty-b1.test.ts — a hit on any other line, or a
// reworded line that still makes the claim, fails both scans.
//
// Release step, in the SAME commit as B1 (search-oct06/patches/
// b1-layout-release.py does all of it): apply layout.tsx.patch to the index
// and the working copy, and set LAYOUT_PENDING_LINE to null here.
//   • Patch applied, constant still set  → both tests fail ("stale allowance").
//   • Constant null, patch not applied   → both scans fail on layout.tsx.
// So neither half can ship alone. Leaving BOTH out still passes and keeps
// the claim on every page — that is what the release step is for.

/** The HEAD line of src/app/layout.tsx the scans may skip; null = none. */
export const LAYOUT_PENDING_LINE: string | null = null;

/** True when `line` of `rel` is the pending layout line (exact match). */
export function isPendingLayoutLine(rel: string, line: string): boolean {
  return LAYOUT_PENDING_LINE !== null && rel.replace(/\\/g, "/") === "src/app/layout.tsx" && line === LAYOUT_PENDING_LINE;
}
