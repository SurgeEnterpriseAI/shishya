// PersonalisedHub — the homepage rail rendered for signed-in users
// who have completed the 3-question onboarding wizard.
//
// Surfaces three lanes, in this order:
//   1. Your prep exams — direct links to /exams/[code] for each
//      onbPrepCode + a quick "open AI tutor" CTA.
//   2. Your state — state-specific exam aggregator + scholarship match
//      (deep link to /scholarships/match with state pre-filled).
//   3. Your stage — schooling/college/PG/jobs primary surface based
//      on onbStage.
//
// Pure server component. Reads from the User row + Exam/Scholarship
// catalogues already loaded by the parent. No client JS needed.

import Link from "next/link";
import { STATES } from "@/lib/state-info";
import { STAGE_OPTIONS } from "@/lib/onboarding-options";

export interface PersonalisedHubProps {
  /** From User.onbStage. Null = wizard skipped (we still render fallback). */
  stage: string | null;
  /** From User.onbState. Null/empty = "prefer not to say". */
  state: string | null;
  /** From User.onbPrepCodes — list of exam codes the user targets. */
  prepCodes: string[];
  /** Display info for each prepCode that exists in Exam. */
  prepExams: Array<{ code: string; shortName: string; name: string; category: string }>;
  /** User's display name; trims to first name for friendliness. */
  displayName: string | null;
}

const STAGE_LANE: Record<string, {
  title: string;
  blurb: string;
  primaryHref: string;
  primaryLabel: string;
  secondary: Array<{ href: string; label: string }>;
}> = {
  CLASS_9_10: {
    title: "Class 9–10",
    blurb: "Boards + Olympiad + early entrance-exam exposure.",
    primaryHref: "/schooling",
    primaryLabel: "Open Schooling →",
    secondary: [
      { href: "/exams?stage=CLASS_9_10", label: "Olympiads + NTSE" },
      { href: "/insights/jee-vs-neet-aspirant-volume", label: "Plan your high-school path" },
    ],
  },
  CLASS_11_12: {
    title: "Class 11–12",
    blurb: "Board prep + entrance exams. The years that matter most.",
    primaryHref: "/exams",
    primaryLabel: "Open Entrance Exams →",
    secondary: [
      { href: "/schooling", label: "Class 11/12 syllabus" },
      { href: "/scholarships/match", label: "Find scholarships you qualify for" },
      { href: "/colleges", label: "Browse colleges" },
    ],
  },
  UG: {
    title: "Undergraduate",
    blurb: "PG entrance + government jobs + placements.",
    primaryHref: "/exams",
    primaryLabel: "Open Exams →",
    secondary: [
      { href: "/colleges", label: "College profiles" },
      { href: "/post-graduation", label: "PG planning" },
      { href: "/worldwide", label: "Study abroad" },
    ],
  },
  PG: {
    title: "Postgraduate / PhD",
    blurb: "UGC NET, CSIR NET, GATE for PhD, fellowships.",
    primaryHref: "/exams",
    primaryLabel: "Open Exams →",
    secondary: [
      { href: "/post-graduation", label: "PG resources" },
      { href: "/worldwide", label: "PhD abroad" },
      { href: "/insights", label: "Insights" },
    ],
  },
  WORKING: {
    title: "Working professional",
    blurb: "Govt-job switch, MBA, upskilling.",
    primaryHref: "/exams",
    primaryLabel: "Open Exams →",
    secondary: [
      { href: "/jobs", label: "Jobs & Careers" },
      { href: "/worldwide", label: "Study abroad" },
      { href: "/scholarships", label: "Scholarships" },
    ],
  },
  OTHER: {
    title: "Explore Shishya",
    blurb: "Browse every section.",
    primaryHref: "/exams",
    primaryLabel: "Browse exams →",
    secondary: [
      { href: "/schooling", label: "Schooling" },
      { href: "/colleges", label: "Colleges" },
      { href: "/scholarships", label: "Scholarships" },
    ],
  },
};

export function PersonalisedHub({
  stage,
  state,
  prepCodes,
  prepExams,
  displayName,
}: PersonalisedHubProps) {
  const firstName = displayName ? displayName.split(" ")[0] : "there";
  const stageInfo = stage && STAGE_LANE[stage] ? STAGE_LANE[stage] : STAGE_LANE.OTHER;
  const stageLabel = STAGE_OPTIONS.find((s) => s.value === stage)?.label ?? "your journey";
  const stateInfo = state ? STATES[state] ?? null : null;

  return (
    <section className="container-prose pt-12 pb-8 sm:pt-16">
      {/* Hero */}
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-5xl">
          Welcome back, {firstName} 👋
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-600 sm:text-lg">
          Picking up where you left off. {stageLabel}
          {stateInfo && <> · {stateInfo.name}</>}.{" "}
          <Link href="/me/settings" className="text-saffron-700 underline">
            Update preferences
          </Link>
        </p>
      </div>

      {/* Lane 1 — Your prep exams */}
      {prepExams.length > 0 && (
        <div className="mt-12">
          <h2 className="text-base font-semibold text-ink-900">Your prep exams</h2>
          <p className="mt-1 text-xs text-ink-500">
            Pinned from your onboarding profile. Each opens to topics, mocks, and Ask Shishya.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {prepExams.map((e) => (
              <li key={e.code}>
                <Link
                  href={`/exams/${e.code}`}
                  className="block h-full rounded-lg border border-saffron-200 bg-saffron-50/30 p-4 transition-colors hover:border-saffron-400"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-700">
                    {e.category.replace(/_/g, " ")}
                  </p>
                  <p className="mt-1 text-base font-semibold text-ink-900">{e.shortName}</p>
                  <p className="mt-0.5 text-xs text-ink-600 line-clamp-2">{e.name}</p>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Link
              href={`/chat${prepExams.length > 0 ? `?examCode=${prepExams[0].code}` : ""}`}
              className="rounded-md bg-saffron-500 px-3 py-1.5 font-semibold text-white hover:bg-saffron-600"
            >
              Ask Shishya →
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md border border-ink-300 px-3 py-1.5 font-medium text-ink-700 hover:bg-ink-50"
            >
              Full dashboard
            </Link>
          </div>
        </div>
      )}

      {/* Lane 2 — Your state */}
      {stateInfo && (
        <div className="mt-12">
          <h2 className="text-base font-semibold text-ink-900">
            Pinned for {stateInfo.name}
          </h2>
          <p className="mt-1 text-xs text-ink-500">
            State-specific exams, board info, and scholarships you can apply to.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <li>
              <Link
                href={`/exams/state/${stateInfo.code.toLowerCase()}`}
                className="block h-full rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400"
              >
                <p className="text-sm font-semibold text-ink-900">{stateInfo.name} entrance exams</p>
                <p className="mt-1 text-xs text-ink-600">
                  State CETs, government recruitment, and other {stateInfo.name}-specific exams.
                </p>
              </Link>
            </li>
            <li>
              <Link
                href={`/colleges/state/${stateInfo.code.toLowerCase()}`}
                className="block h-full rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400"
              >
                <p className="text-sm font-semibold text-ink-900">{stateInfo.name} colleges</p>
                <p className="mt-1 text-xs text-ink-600">
                  Top colleges in {stateInfo.name} — NIRF-ranked + state directory.
                </p>
              </Link>
            </li>
            <li>
              <Link
                href="/scholarships/match"
                className="block h-full rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400"
              >
                <p className="text-sm font-semibold text-ink-900">Find matching scholarships</p>
                <p className="mt-1 text-xs text-ink-600">
                  5-question wizard — surfaces only what you actually qualify for.
                </p>
              </Link>
            </li>
          </ul>
        </div>
      )}

      {/* Lane 3 — Your stage */}
      <div className="mt-12">
        <h2 className="text-base font-semibold text-ink-900">{stageInfo.title}</h2>
        <p className="mt-1 text-xs text-ink-500">{stageInfo.blurb}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            href={stageInfo.primaryHref}
            className="rounded-md bg-saffron-500 px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-600"
          >
            {stageInfo.primaryLabel}
          </Link>
          {stageInfo.secondary.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-md border border-ink-300 bg-white px-3 py-2 text-xs text-ink-700 hover:border-saffron-400"
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {/* "Show me everything" — never hide the generic 7-tile rail */}
      <div className="mt-12 text-center text-xs text-ink-500">
        Looking for something else? <Link href="#all-sections" className="text-saffron-700 underline">See all sections</Link>
      </div>
    </section>
  );
}
