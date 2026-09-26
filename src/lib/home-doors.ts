// Pure helpers for the "Doors" home page (26 Sep 2026). No DB, no React —
// tests/unit/home-doors.test.ts runs them as they are.

import type { ExamCard } from "@/components/ExamPicker";
import { findGoal } from "@/data/exam-goals";

/** The five doors, in grid order, with their in-page anchor ids. The jump
 *  pills under the hero point at these; the ids sit on the door cards. */
export const HOME_DOOR_IDS = ["school", "entrance", "government", "college", "careers"] as const;
export type HomeDoorId = (typeof HOME_DOOR_IDS)[number];

/** /schooling/cbse/class-N — the class page route (src/app/schooling/
 *  [slug]/[classSlug] parses "class-N", N = 1..12). Built here rather than
 *  imported so the home page does not depend on the school loaders. */
export function cbseClassHref(cls: number): string {
  return `/schooling/cbse/class-${cls}`;
}

/** The CBSE classes the School door offers as one-tap tiles. The board data
 *  (src/lib/schooling-data.ts BOARDS) is the source; this guards against a
 *  malformed list so the door never renders "Class 0" or "Class 13". */
export function cbseClassTiles(classes: readonly number[] | undefined): number[] {
  const ok = (classes ?? []).filter((c) => Number.isInteger(c) && c >= 1 && c <= 12);
  return ok.length > 0 ? [...new Set(ok)].sort((a, b) => a - b) : Array.from({ length: 12 }, (_, i) => i + 1);
}

/** The exams most people sit, for the finder chips: curated "popular" first,
 *  then everything else, each group by candidates per year. The same order
 *  the retired "Most popular this week" grid used (src/lib/exam-browse.ts),
 *  minus the "this week" claim nothing measured. */
export function mostTakenExams(exams: readonly ExamCard[], n = 8): ExamCard[] {
  const byVolume = (a: ExamCard, b: ExamCard) => (b.candidatesPerYear ?? 0) - (a.candidatesPerYear ?? 0);
  const popular = exams.filter((e) => e.tags.includes("popular")).sort(byVolume);
  const rest = exams.filter((e) => !e.tags.includes("popular")).sort(byVolume);
  return [...popular, ...rest].slice(0, Math.max(0, n));
}

/** The exams the two exam doors offer as one-tap chips, by code, in this
 *  order (26 Sep 2026, review). Verified live that day against the catalogue
 *  (scripts/tmp-home-fixer-probe.ts): every code is an active exam with
 *  checked questions or a system mock. CLAT is absent on purpose — it has no
 *  exam row, so /exams/CLAT is a 404. NDA is a defence-recruitment exam that
 *  Class 12 leavers sit, so it belongs on the Entrance door. */
export const ENTRANCE_DOOR_CODES = ["JEE_MAIN", "NEET_UG", "CUET_UG", "NDA"] as const;
export const GOVERNMENT_DOOR_CODES = ["SSC_CGL", "UPSC_PRELIMS"] as const;

/** The chips a door renders: the wanted codes, in order, restricted to the
 *  exams present in the catalogue the page loaded (live, or the DB-down
 *  fallback list). A chip therefore never links an exam page that would
 *  404, and the label is the catalogue's own shortName, never typed. */
export function doorExamChips(exams: readonly ExamCard[], codes: readonly string[]): ExamCard[] {
  const byCode = new Map(exams.map((e) => [e.code, e]));
  return codes.map((c) => byCode.get(c)).filter((e): e is ExamCard => Boolean(e));
}

/** Goal slug (the retired ?g= funnel, src/data/exam-goals.ts) → the browse
 *  catalogue's category filter (src/app/exams/browse/page.tsx
 *  FILTER_CATEGORIES). Defence exams are GOVT_JOBS rows in the catalogue. */
const GOAL_TO_CATEGORY: Readonly<Record<string, string>> = {
  engineering: "ENGINEERING",
  medical: "MEDICAL",
  "government-jobs": "GOVT_JOBS",
  banking: "BANKING",
  "civil-services": "CIVIL_SERVICES",
  teaching: "TEACHING",
  law: "LAW",
  mba: "MBA",
  defence: "GOVT_JOBS",
  olympiad: "OLYMPIAD",
};

/** Where an inbound link to the retired ?g= / ?s= / ?st= funnel goes now.
 *  null = no funnel params, render the home page. Indexed permutations
 *  (/?g=engineering&s=state&st=MH) 308 to the catalogue instead of landing
 *  on a page that no longer reads them. */
export function legacyFunnelRedirect(sp: { g?: string; s?: string; st?: string }): string | null {
  if (!sp.g) return null;
  const goal = findGoal(sp.g);
  if (!goal) return "/exams/browse";
  if (sp.s === "state") return "/exams/state";
  const category = GOAL_TO_CATEGORY[goal.slug];
  return category ? `/exams/browse?category=${category}` : "/exams/browse";
}
