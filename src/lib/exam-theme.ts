// Per-category visual theme for exam-bound surfaces.
//
// WHY THIS EXISTS
// A student preparing for NEET should feel the medical-green vibe the
// moment they land on /exams/NEET_UG. A JEE aspirant should feel the
// engineering electric-blue. Same exam catalogue, same brand, but each
// category gets a distinct accent so the page reads as "your space"
// instead of "another portal page". The brand saffron stays as the
// primary CTA / button colour everywhere — themes layer secondary
// accents (ribbon, category badge, exam-day highlight, phase chips,
// hero gradient) on top.
//
// IMPORTANT — Tailwind purging
// Tailwind statically scans source files for class names. Dynamic
// template literals (`bg-${color}-100`) get purged because the
// scanner can't see them. We sidestep that by storing FULL CLASS
// STRINGS in this file — every theme class appears in the source as a
// complete string, so the JIT picks it up at build time. Do NOT
// refactor this into a colour-tuple + interpolation helper.

import type { ExamCategory } from "@prisma/client";

export interface ExamTheme {
  /** Human-readable category label for the badge ("Engineering", "Medical", …). */
  label: string;
  /** Small emoji rendered in the badge + ribbon. Visual quick-read. */
  icon: string;
  /** Top hero ribbon — 6 px coloured strip. Full Tailwind gradient class string. */
  ribbon: string;
  /** Category badge — pill above the exam title. {bg, text, ring} all baked in. */
  badge: string;
  /** Soft background tint for the hero card behind the title. */
  heroTint: string;
  /** Border accent for the action panel + exam-day calendar entries. */
  borderAccent: string;
  /** Bg tint for the exam-day calendar entry (saffron → category colour). */
  examDayBg: string;
  /** Text colour for the exam-day "X days away" copy. */
  examDayText: string;
  /** Phase chip surface (Checklist / Live / Reactions). */
  phaseChip: string;
  /** Bottom-of-hero short tagline that reinforces the category vibe. */
  tagline: string;
}

// Saffron-baseline theme used for STATE_LEVEL, OTHER, and any
// category we haven't customised yet. Keeps the brand intact.
const SAFFRON: ExamTheme = {
  label: "Exam prep",
  icon: "✦",
  ribbon: "bg-gradient-to-r from-saffron-500 via-amber-500 to-saffron-500",
  badge: "bg-saffron-100 text-saffron-800 ring-1 ring-saffron-300",
  heroTint: "bg-gradient-to-b from-saffron-50/60 to-white",
  borderAccent: "border-saffron-300",
  examDayBg: "bg-saffron-50",
  examDayText: "text-saffron-900",
  phaseChip: "bg-saffron-100 text-saffron-800 hover:bg-saffron-200",
  tagline: "Verified by students who&apos;ve cleared the same path",
};

// IMPORTANT: every class string here must appear verbatim in source —
// don't build them via interpolation. The Tailwind scanner walks the
// raw text of this file at build time.
export const EXAM_THEMES: Record<ExamCategory, ExamTheme> = {
  ENGINEERING: {
    label: "Engineering",
    icon: "⚙️",
    ribbon: "bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600",
    badge: "bg-blue-100 text-blue-800 ring-1 ring-blue-300",
    heroTint: "bg-gradient-to-b from-blue-50/70 to-white",
    borderAccent: "border-blue-300",
    examDayBg: "bg-blue-50",
    examDayText: "text-blue-900",
    phaseChip: "bg-blue-100 text-blue-800 hover:bg-blue-200",
    tagline: "Built for JEE / GATE / state-CET aspirants",
  },
  MEDICAL: {
    label: "Medical & Allied Health",
    icon: "🩺",
    ribbon: "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600",
    badge: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300",
    heroTint: "bg-gradient-to-b from-emerald-50/70 to-white",
    borderAccent: "border-emerald-300",
    examDayBg: "bg-emerald-50",
    examDayText: "text-emerald-900",
    phaseChip: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
    tagline: "Built for NEET / AIIMS / nursing aspirants",
  },
  CIVIL_SERVICES: {
    label: "Civil Services",
    icon: "🏛️",
    ribbon: "bg-gradient-to-r from-rose-700 via-red-700 to-rose-800",
    badge: "bg-rose-100 text-rose-900 ring-1 ring-rose-300",
    heroTint: "bg-gradient-to-b from-rose-50/70 to-white",
    borderAccent: "border-rose-400",
    examDayBg: "bg-rose-50",
    examDayText: "text-rose-900",
    phaseChip: "bg-rose-100 text-rose-900 hover:bg-rose-200",
    tagline: "Built for UPSC IAS / IPS / IFS aspirants",
  },
  BANKING: {
    label: "Banking & Finance",
    icon: "🏦",
    ribbon: "bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600",
    badge: "bg-indigo-100 text-indigo-800 ring-1 ring-indigo-300",
    heroTint: "bg-gradient-to-b from-indigo-50/70 to-white",
    borderAccent: "border-indigo-300",
    examDayBg: "bg-indigo-50",
    examDayText: "text-indigo-900",
    phaseChip: "bg-indigo-100 text-indigo-800 hover:bg-indigo-200",
    tagline: "Built for IBPS / SBI / RBI / NABARD aspirants",
  },
  GOVT_JOBS: {
    label: "Government Jobs",
    icon: "🇮🇳",
    ribbon: "bg-gradient-to-r from-sky-600 via-cyan-600 to-sky-700",
    badge: "bg-sky-100 text-sky-900 ring-1 ring-sky-300",
    heroTint: "bg-gradient-to-b from-sky-50/70 to-white",
    borderAccent: "border-sky-300",
    examDayBg: "bg-sky-50",
    examDayText: "text-sky-900",
    phaseChip: "bg-sky-100 text-sky-900 hover:bg-sky-200",
    tagline: "Built for SSC / RRB / Defence aspirants",
  },
  TEACHING: {
    label: "Teaching",
    icon: "👩‍🏫",
    ribbon: "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600",
    badge: "bg-amber-100 text-amber-900 ring-1 ring-amber-300",
    heroTint: "bg-gradient-to-b from-amber-50/70 to-white",
    borderAccent: "border-amber-300",
    examDayBg: "bg-amber-50",
    examDayText: "text-amber-900",
    phaseChip: "bg-amber-100 text-amber-900 hover:bg-amber-200",
    tagline: "Built for CTET / state-TET / KVS / NVS aspirants",
  },
  LAW: {
    label: "Law",
    icon: "⚖️",
    ribbon: "bg-gradient-to-r from-stone-700 via-stone-800 to-stone-900",
    badge: "bg-stone-200 text-stone-900 ring-1 ring-stone-400",
    heroTint: "bg-gradient-to-b from-stone-100 to-white",
    borderAccent: "border-stone-400",
    examDayBg: "bg-stone-100",
    examDayText: "text-stone-900",
    phaseChip: "bg-stone-200 text-stone-900 hover:bg-stone-300",
    tagline: "Built for CLAT / AILET / state law-CETs aspirants",
  },
  MBA: {
    label: "MBA",
    icon: "📈",
    ribbon: "bg-gradient-to-r from-slate-700 via-zinc-700 to-slate-800",
    badge: "bg-slate-200 text-slate-900 ring-1 ring-slate-400",
    heroTint: "bg-gradient-to-b from-slate-100 to-white",
    borderAccent: "border-slate-400",
    examDayBg: "bg-slate-100",
    examDayText: "text-slate-900",
    phaseChip: "bg-slate-200 text-slate-900 hover:bg-slate-300",
    tagline: "Built for CAT / XAT / MAT / state MBA-CETs aspirants",
  },
  UNIVERSITY: {
    label: "University Entrance",
    icon: "🎓",
    ribbon: "bg-gradient-to-r from-fuchsia-500 via-pink-500 to-fuchsia-600",
    badge: "bg-fuchsia-100 text-fuchsia-900 ring-1 ring-fuchsia-300",
    heroTint: "bg-gradient-to-b from-fuchsia-50/70 to-white",
    borderAccent: "border-fuchsia-300",
    examDayBg: "bg-fuchsia-50",
    examDayText: "text-fuchsia-900",
    phaseChip: "bg-fuchsia-100 text-fuchsia-900 hover:bg-fuchsia-200",
    tagline: "Built for CUET / IPU CET / university entrance aspirants",
  },
  OLYMPIAD: {
    label: "Olympiad",
    icon: "🏅",
    ribbon: "bg-gradient-to-r from-violet-500 via-purple-500 to-violet-600",
    badge: "bg-violet-100 text-violet-900 ring-1 ring-violet-300",
    heroTint: "bg-gradient-to-b from-violet-50/70 to-white",
    borderAccent: "border-violet-300",
    examDayBg: "bg-violet-50",
    examDayText: "text-violet-900",
    phaseChip: "bg-violet-100 text-violet-900 hover:bg-violet-200",
    tagline: "Built for HBCSE / SOF / Silverzone / NSTSE aspirants",
  },
  STATE_LEVEL: {
    ...SAFFRON,
    label: "State-level",
    icon: "📍",
    tagline: "Built for state-PSC / state-TET / state-police aspirants",
  },
  SCHOOL_BOARD: { ...SAFFRON, label: "School board", icon: "🏫" },
  OTHER: { ...SAFFRON },
};

/** Lookup the theme for an exam's category. Always returns a theme —
 *  unknown / nullable categories fall through to the saffron default
 *  so callers can `theme.ribbon` etc without null-guards.            */
export function getExamTheme(category: ExamCategory | null | undefined): ExamTheme {
  if (!category) return SAFFRON;
  return EXAM_THEMES[category] ?? SAFFRON;
}
