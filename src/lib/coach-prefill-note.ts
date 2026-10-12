// The words after the coach intake's "2 · Exam date" for a date prefilled
// from the tracker (src/app/coach/CoachIntake.tsx): never "official" unless
// the row is official tier — it said "from the official calendar" for every
// row, AI-made estimates included, until 12 Oct 2026. English (the intake is).
//
// Its own module (12 Oct 2026) because CoachIntake is a client component:
// src/lib/date-tier-view.ts imports official-source → hub-title →
// exam-timeline → ai/exam-info (the Anthropic SDK, ai/usage's `after`), and
// `next build` refuses that chain in a client bundle. Keep this file free of
// value imports; date-tier-view re-exports it for server code and tests.

import type { SourceTier } from "@/lib/official-source";

export function coachPrefillDateNote(opt: { nextDate: string | null; nextDateTier?: SourceTier | null } | undefined): string {
  if (!opt?.nextDate) return "";
  if (opt.nextDateTier === "official") return "(from the official notice — confirm or change)";
  if (opt.nextDateTier === "reported") return "(reported, not yet checked against an official notice — confirm or change)";
  if (opt.nextDateTier === "expected") return "(expected — an estimate, not announced; confirm or change)";
  return "(from our exam calendar — confirm or change)";
}
