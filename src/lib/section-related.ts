// Cross-links between the section pages (26 Sep 2026, group D) — pure
// rules over the static data, shared by the pages and
// tests/unit/section-metadata.test.ts.
//
//   relatedScholarships  — /scholarships/[id]'s "Related scholarships".
//   careerExamCodes      — the exams a career page names: the career's own
//                          examCodes plus a short, factual list for careers
//                          whose entrance exam the data never named (an
//                          architect needs NATA). Links go through the live
//                          catalogue (src/lib/live-exam-codes.ts), so a code
//                          with no page renders as a label.
//   careerCollegeStreams — the /colleges/stream/{stream} pages a career
//                          leads through, only streams some college has.

import type { Scholarship } from "@/data/scholarships";
import type { Career } from "@/data/careers";
import { ALL_STREAMS, COLLEGES, type CollegeStream } from "@/lib/colleges-data";

/** Up to `max` other scholarships: same state (when this one has a state)
 *  first, then a shared level, then the same type or a shared reserved
 *  category; data order breaks ties. Only scholarships with at least one of
 *  the three in common. */
export function relatedScholarships(s: Scholarship, all: readonly Scholarship[], max = 6): Scholarship[] {
  const scored: Array<{ x: Scholarship; score: number; i: number }> = [];
  all.forEach((x, i) => {
    if (x.id === s.id) return;
    const sameState = s.state !== null && x.state === s.state ? 4 : 0;
    const sharedLevel = x.levels.some((l) => s.levels.includes(l)) ? 2 : 0;
    const sharedCategory =
      x.type === s.type || (x.eligibility.categories ?? []).some((c) => (s.eligibility.categories ?? []).includes(c)) ? 1 : 0;
    const score = sameState + sharedLevel + sharedCategory;
    if (score > 0) scored.push({ x, score, i });
  });
  return scored
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, max)
    .map((r) => r.x);
}

/** Entrance exams a career's data does not name but its main degree route
 *  requires (B.Arch → NATA; B.Des → UCEED / NID DAT; fashion → NIFT). */
export const CAREER_EXTRA_EXAMS: Readonly<Record<string, readonly string[]>> = {
  architect: ["NATA"],
  "fashion-designer": ["NIFT"],
  "ux-designer": ["UCEED", "NID_DAT"],
  "graphic-designer": ["NID_DAT", "UCEED"],
  "animator-vfx-artist": ["NID_DAT"],
};

export function careerExamCodes(c: Pick<Career, "slug" | "examCodes">): string[] {
  return [...new Set([...(c.examCodes ?? []), ...(CAREER_EXTRA_EXAMS[c.slug] ?? [])])];
}

/** Career category → the college streams its degree routes run through. */
const CATEGORY_STREAMS: Readonly<Record<string, readonly CollegeStream[]>> = {
  engineering: ["engineering"],
  medicine: ["medical"],
  law: ["law"],
  "business-mgmt": ["management"],
};

/** Per-career overrides (replace the category's list). */
const SLUG_STREAMS: Readonly<Record<string, readonly CollegeStream[]>> = {
  architect: ["architecture"],
  pharmacist: ["pharmacy"],
  scientist: ["research"],
  "phd-researcher": ["research", "university"],
  "college-professor": ["research", "university"],
  "school-teacher": ["university"],
  psychologist: ["university"],
  dentist: [],
  "veterinary-doctor": [],
  "nutritionist-dietitian": [],
};

export function careerCollegeStreams(c: Pick<Career, "slug" | "category">): Array<{ value: CollegeStream; label: string }> {
  const wanted = SLUG_STREAMS[c.slug] ?? CATEGORY_STREAMS[c.category] ?? [];
  return ALL_STREAMS.filter((s) => wanted.includes(s.value) && COLLEGES.some((col) => col.streams.includes(s.value)));
}

// ── School "Next steps" (26 Sep 2026) ─────────────────────────────────
// Where a Class 9-12 page points next. Exam steps name a code and render
// only while that exam is live (examHubHref); page steps are fixed routes.
// /exams/entrance is the entrance-exam landing (group C, same wave).
// 26 Sep 2026 (entry points): Class 11-12 pages also link the qualification
// list /exams/after/12th (src/lib/exam-qualification.ts) — the exams whose
// lowest listed qualification is Class 12, government and entrance side by
// side (71 exams, indexable, on the 26 Sep 2026 probe
// scripts/tmp-w2-entry-points.ts). The page itself falls back to
// noindex,follow if it ever drops below QUALIFICATION_MIN; the route always
// renders (12th is never held), so the fixed link never 404s.

export interface NextStep {
  label: string;
  /** A Shishya page (page steps). */
  href?: string;
  /** An exam code (exam steps) — linked to its hub only while live. */
  exam?: string;
}

const OLYMPIAD_STEPS: readonly NextStep[] = [
  { label: "IOQM (maths olympiad)", exam: "IOQM" },
  { label: "NSEJS (junior science olympiad)", exam: "NSEJS" },
  { label: "SOF NSO (science olympiad)", exam: "SOF_NSO" },
  { label: "SOF IMO (maths olympiad)", exam: "SOF_IMO" },
];

const SENIOR_SECTION_STEPS: readonly NextStep[] = [
  { label: "Entrance exams", href: "/exams/entrance" },
  { label: "Exams after 12th", href: "/exams/after/12th" },
  { label: "Colleges", href: "/colleges" },
  { label: "Scholarships", href: "/scholarships" },
  { label: "Career guides", href: "/careers" },
];

const ENTRANCE_BY_SUBJECT: Readonly<Record<string, readonly NextStep[]>> = {
  physics: [
    { label: "JEE Main", exam: "JEE_MAIN" },
    { label: "NEET UG", exam: "NEET_UG" },
    { label: "CUET UG", exam: "CUET_UG" },
  ],
  chemistry: [
    { label: "JEE Main", exam: "JEE_MAIN" },
    { label: "NEET UG", exam: "NEET_UG" },
    { label: "CUET UG", exam: "CUET_UG" },
  ],
  mathematics: [
    { label: "JEE Main", exam: "JEE_MAIN" },
    { label: "CUET UG", exam: "CUET_UG" },
  ],
  biology: [
    { label: "NEET UG", exam: "NEET_UG" },
    { label: "CUET UG", exam: "CUET_UG" },
  ],
};

/** Next steps for a school class page (no subject) or subject page. Empty
 *  where none apply: Classes 1-8, and Class 9-10 subject pages. */
export function schoolNextSteps(cls: number, subjectName?: string): NextStep[] {
  if (subjectName === undefined) {
    if (cls === 9 || cls === 10) {
      return [
        ...OLYMPIAD_STEPS,
        { label: "Choosing a Class 11 stream", href: "/schooling/streams" },
        { label: "Class 10 student: what to focus on", href: "/for/class-10-student" },
        { label: "Career map", href: "/career-map" },
        { label: "Scholarships", href: "/scholarships" },
      ];
    }
    if (cls === 11 || cls === 12) {
      return [...ENTRANCE_BY_SUBJECT.physics, ...SENIOR_SECTION_STEPS];
    }
    return [];
  }
  if (cls !== 11 && cls !== 12) return [];
  const exams = ENTRANCE_BY_SUBJECT[subjectName.trim().toLowerCase()];
  return exams ? [...exams, ...SENIOR_SECTION_STEPS] : [];
}

// ── Career salary bands (26 Sep 2026) ─────────────────────────────────

/** The salary sources src/data/careers.ts cites in its header (one list for
 *  every career; the data file keeps them there so bands update yearly). */
export const CAREER_SALARY_SOURCES =
  "NASSCOM Indian IT salary report, Naukri JobSpeak, 7th Pay Commission tables, PayScale and AmbitionBox aggregates, official salary structures published by ministries";

/** [low, high] in rupees a year from a plain "₹3.5 - ₹6 LPA" or
 *  "₹1 Cr - ₹5 Cr" band — the band's own two numbers, nothing derived;
 *  null for anything else (monthly, dollars, an open-ended "+", prose). */
export function salaryBandRange(band: string): [number, number] | null {
  const m = /^₹\s*(\d+(?:\.\d+)?)\s*(LPA|L|Cr)?\s*-\s*₹\s*(\d+(?:\.\d+)?)\s*(LPA|Cr)(?![+\w])/.exec(band.trim());
  if (!m || /\+|month|\$/i.test(band)) return null;
  const unit = (u: string | undefined) => (u === "Cr" ? 10_000_000 : 100_000);
  const lo = Math.round(Number(m[1]) * unit(m[2] ?? m[4]));
  const hi = Math.round(Number(m[3]) * unit(m[4]));
  return Number.isFinite(lo) && Number.isFinite(hi) && hi >= lo ? [lo, hi] : null;
}
