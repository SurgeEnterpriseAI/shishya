// One-line entry into the Personal Coach, placed where the intent is
// already there: an exam hub, a syllabus the student is staring at, a
// mock result they just got. Deliberately ONE compact line — the full
// pitch lives on /coach; this is only the door.
//
// Frictionless: ?exam=CODE pre-selects the exam in the intake, so the
// student lands on a half-filled 30-second form, not a blank one.

import Link from "next/link";

export function CoachEntry({
  examCode,
  examShort,
  variant = "default",
}: {
  examCode: string;
  examShort: string;
  /** Tunes the sentence to the moment the student is in. */
  variant?: "default" | "syllabus" | "results" | "cutoff" | "guide" | "finder";
}) {
  const line =
    variant === "syllabus"
      ? `This whole syllabus, split into daily doses — free.`
      : variant === "results"
        ? `Turn this score into a plan — what to study tomorrow, and the day after.`
        : variant === "cutoff"
          ? `Now you know the score to beat. Get the free day-by-day plan that gets you there.`
          : variant === "guide"
            ? `Strategy is easy to read and hard to follow. Get it as a daily plan instead — free.`
            : variant === "finder"
              ? `Found your exam. Now get the free day-by-day plan to actually crack ${examShort}.`
              : `Preparing for ${examShort}? Get a free day-by-day plan to exam day.`;

  return (
    <Link
      href={`/coach?exam=${encodeURIComponent(examCode)}`}
      className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-saffron-300 bg-saffron-50/70 px-4 py-3 transition-colors hover:border-saffron-400 hover:bg-saffron-50"
    >
      <span className="min-w-0 text-sm text-ink-800">
        🎓 <span className="font-semibold">{line}</span>{" "}
        <span className="text-ink-600">
          Rebuilt every morning around what you actually did — miss a day, nothing is lost.
        </span>
      </span>
      <span className="shrink-0 text-sm font-bold text-saffron-700">Build my plan →</span>
    </Link>
  );
}
