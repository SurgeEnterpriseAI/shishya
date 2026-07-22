// Prominent homepage entry to the /find-your-exam matcher.
//
// The "want a govt job but which one?" newcomer needs a door they can't
// miss — this hero card leads with the live vacancy count and the fit
// promise ("which one best fits your strengths"). It sits above the goal
// cards but does NOT replace them: people who already know their exam
// keep using search / goal tiles (zero added friction for them).

import Link from "next/link";

export function VacancyFinderCard({
  totalLakh,
  examCount,
}: {
  totalLakh: string;
  examCount: number;
}) {
  return (
    <Link
      href="/find-your-exam"
      className="group flex h-full flex-col justify-center overflow-hidden rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-saffron-50 via-amber-50 to-white p-5 shadow-sm transition-all hover:border-saffron-500 hover:shadow-md sm:p-6"
    >
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
            🎯 Find your government job
          </p>
          <p className="mt-2 text-lg font-bold leading-snug text-ink-900 sm:text-xl">
            India, as on today, has{" "}
            <span className="text-saffron-700">~{totalLakh} lakh government job vacancies</span>{" "}
            across {examCount}+ exams.
            <br className="hidden sm:block" />{" "}
            Which one best fits <span className="underline decoration-saffron-400 decoration-2 underline-offset-2">your strengths</span>?
          </p>
          <p className="mt-2 text-sm text-ink-600">
            Answer 5 quick questions — age, education, state, what you&apos;re good at — and see the
            exams you can actually crack, ranked for you. Free, no signup.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-saffron-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors group-hover:bg-saffron-600">
          Find my exams →
        </span>
      </div>
    </Link>
  );
}
