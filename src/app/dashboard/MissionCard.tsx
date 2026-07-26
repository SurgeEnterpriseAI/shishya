// MissionCard — identity + urgency + visible progress in one glance.
//
// Three motivation-science mechanics, all aligned with the student's
// actual goal (clearing the exam):
//   • IDENTITY  — "Day N of your SSC CGL journey" (identity-based habit:
//     people act consistently with who they believe they are)
//   • URGENCY   — "⏳ N days to exam" countdown (deadline gradient:
//     effort rises as a real date approaches; vague futures don't move)
//   • PROGRESS  — syllabus coverage bar (endowed progress + goal
//     gradient: visible progress accelerates completion)
// No dark patterns: every element points at the student's own outcome.

import Link from "next/link";

export function MissionCard({
  examShort,
  examCode,
  journeyDay,
  daysToExam,
  examDateLabel,
  topicsTotal,
  topicsTouched,
  topicsMastered,
}: {
  examShort: string;
  examCode: string;
  journeyDay: number;
  daysToExam: number | null;
  examDateLabel: string | null;
  topicsTotal: number;
  topicsTouched: number;
  topicsMastered: number;
}) {
  const pct = topicsTotal > 0 ? Math.min(100, Math.round((topicsTouched / topicsTotal) * 100)) : 0;
  return (
    <section className="mt-4 rounded-xl border border-ink-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-bold text-ink-900">
          🎯 Day {journeyDay} of your{" "}
          <Link href={`/exams/${examCode}`} className="text-saffron-700 hover:underline">
            {examShort}
          </Link>{" "}
          journey
        </p>
        {daysToExam != null && daysToExam >= 0 && (
          <p className="text-sm font-semibold tabular-nums text-ink-900">
            ⏳ {daysToExam === 0 ? "Exam is TODAY" : `${daysToExam} day${daysToExam === 1 ? "" : "s"} to exam`}
            {examDateLabel && daysToExam > 0 && (
              <span className="ml-1.5 font-normal text-ink-500">· {examDateLabel}</span>
            )}
          </p>
        )}
      </div>

      {topicsTotal > 0 && (
        <div className="mt-3">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-medium text-ink-700">
              Syllabus covered: {topicsTouched}/{topicsTotal} topics
              {topicsMastered > 0 && (
                <span className="ml-1.5 text-emerald-700">· {topicsMastered} strong</span>
              )}
            </span>
            <span className="tabular-nums font-semibold text-saffron-700">{pct}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div className="h-full rounded-full bg-saffron-400 transition-all" style={{ width: `${Math.max(2, pct)}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] text-ink-500">
            {pct === 0
              ? "Your first mock starts mapping the syllabus — every topic you touch turns this bar orange."
              : pct < 40
                ? "Every mock and Daily-5 pushes this forward. Small daily reps compound."
                : pct < 80
                  ? "Past the halfway mind-set — keep the streak and this fills fast."
                  : "Almost full coverage — now sharpen the weak topics to the finish."}
          </p>
        </div>
      )}
    </section>
  );
}
