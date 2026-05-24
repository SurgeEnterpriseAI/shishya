// 10 student-intent "goals" that drive the /exams guided funnel.
//
// Flow:
//   Step 1 — visitor taps a goal card on /exams ("Engineering")
//   Step 2 — picks scope: "National" or "My state"
//             (skipped automatically when a goal has only one scope —
//              e.g. Olympiad is national-only, Police is state-only)
//   Step 3 — sees the exam list, taps an exam → /exams/{code}
//
// Each goal points at one or more `ExamTag` values from src/lib/exam-tags.
// We reuse those tags rather than re-categorising — keeps the funnel + the
// existing tag chips in sync.
//
// A goal's `hasNational` / `hasState` flags drive whether Step 2 is shown
// or skipped. If both are false something is wrong — but the runtime
// guards against that.

import type { ExamTag } from "@/lib/exam-tags";

export interface ExamGoal {
  /** URL-safe slug used as ?g=<slug>. */
  slug: string;
  /** Tile / page heading. */
  label: string;
  /** One-liner shown under the heading. */
  blurb: string;
  /** Big emoji shown on the goal card. */
  icon: string;
  /**
   * Tag(s) that match an exam to this goal. An exam matches if it carries
   * ANY of these tags. Most goals are a single tag — `government` is the
   * exception because "Govt jobs" = govt tag MINUS banking + civil services
   * (those are their own goal cards).
   */
  tags: ExamTag[];
  /**
   * If true, an exam must NOT carry any of these tags to count. Used to
   * stop "Govt jobs" from also showing IBPS / UPSC exams that already have
   * their own dedicated tiles.
   */
  excludeTags?: ExamTag[];
  /** True if any national-level exams match this goal. */
  hasNational: boolean;
  /** True if any state-level exams match this goal. */
  hasState: boolean;
  /** Optional copy override for Step 2 — defaults to "National exams" / "Exams in my state". */
  nationalLabel?: string;
  stateLabel?: string;
}

export const EXAM_GOALS: ExamGoal[] = [
  {
    slug: "engineering",
    label: "Engineering",
    blurb: "BTech / BE — IITs, NITs, IIITs and all state engineering colleges.",
    icon: "⚙️",
    tags: ["engineering"],
    hasNational: true,
    hasState: true,
  },
  {
    slug: "medical",
    label: "Medical & nursing",
    blurb: "MBBS, BDS, AIIMS, JIPMER and state nursing entrances.",
    icon: "🩺",
    tags: ["medical"],
    hasNational: true,
    hasState: true,
  },
  {
    slug: "government-jobs",
    label: "Government jobs",
    blurb: "SSC, Railways, postal, state SSCs — clerical to gazetted.",
    icon: "🏛️",
    // "govt" minus banking / civil_services (those have their own tiles).
    tags: ["govt"],
    excludeTags: ["banking", "civil_services"],
    hasNational: true,
    hasState: true,
  },
  {
    slug: "banking",
    label: "Banking",
    blurb: "IBPS, SBI, RBI — PO, Clerk, SO, Grade B.",
    icon: "💳",
    tags: ["banking"],
    hasNational: true,
    hasState: false,
  },
  {
    slug: "civil-services",
    label: "Civil services",
    blurb: "UPSC IAS / IPS + every state PSC's civil-service stream.",
    icon: "🇮🇳",
    tags: ["civil_services"],
    hasNational: true,
    hasState: true,
  },
  {
    slug: "teaching",
    label: "Teaching",
    blurb: "CTET + every state TET — primary and upper-primary.",
    icon: "📚",
    tags: ["teaching"],
    hasNational: true,
    hasState: true,
  },
  {
    slug: "law",
    label: "Law",
    blurb: "CLAT, AILET + state law entrances (LAWCET, MH-CET Law).",
    icon: "⚖️",
    tags: ["law"],
    hasNational: true,
    hasState: true,
  },
  {
    slug: "mba",
    label: "MBA",
    blurb: "CAT, XAT, MAT + state MBA-CETs and ICETs.",
    icon: "📈",
    tags: ["mba"],
    hasNational: true,
    hasState: true,
  },
  {
    slug: "defence",
    label: "Defence",
    blurb: "NDA, CDS, Agniveer — Army, Navy, Air Force routes.",
    icon: "🪖",
    tags: ["defence"],
    hasNational: true,
    hasState: false,
  },
  {
    slug: "olympiad",
    label: "Olympiads",
    blurb: "IOQM, NSEP / NSEC / NSEB and SOF / Silverzone olympiads.",
    icon: "🥇",
    tags: ["olympiad"],
    hasNational: true,
    hasState: false,
  },
];

export function findGoal(slug: string | null | undefined): ExamGoal | null {
  if (!slug) return null;
  return EXAM_GOALS.find((g) => g.slug === slug) ?? null;
}

/**
 * Does an exam (by its tag set) match this goal?
 * An exam matches if it carries ANY of the goal's tags AND none of its
 * excludeTags.
 */
export function matchesGoal(examTags: ExamTag[], goal: ExamGoal): boolean {
  const tagSet = new Set(examTags);
  const hits = goal.tags.some((t) => tagSet.has(t));
  if (!hits) return false;
  if (goal.excludeTags?.some((t) => tagSet.has(t))) return false;
  return true;
}
