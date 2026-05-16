// Sidebar card shown on /exams/[code] — surfaces a curated 3-5 of the
// scholarships most relevant to students preparing for that exam. Pulls
// from src/data/scholarships.ts so we don't need a DB query. Renders
// nothing if no scholarships matched (graceful fallback).

import Link from "next/link";
import { scholarshipsForExam, type Scholarship } from "@/data/scholarships";

export function ScholarshipsForExamSection({
  examCode,
  examShortName,
  examCategory,
  examState,
}: {
  examCode: string;
  examShortName: string;
  examCategory: string;
  /** Indian state code if this is a state-level exam (e.g. "TN"). */
  examState?: string | null;
}) {
  // 1) Exam-targeted matches (relevantExamCodes / requiresExam / category heuristic)
  let matched: Scholarship[] = scholarshipsForExam(examCode, examCategory);

  // 2) For state-level exams, also fold in state-specific scholarships
  //    (e.g. TN exam → Tamil Nadu Medical Free Tuition).
  if (examState) {
    const stateOnes = matched.filter((s) => s.state === examState);
    const others = matched.filter((s) => s.state !== examState);
    // State-specific bubbles to the top.
    matched = [...stateOnes, ...others];
  }

  // Cap to 5 — sidebar is space-constrained. Full list is on /scholarships.
  const top = matched.slice(0, 5);
  if (top.length === 0) return null;

  return (
    <div className="scroll-mt-20 rounded-md border border-saffron-200 bg-saffron-50/40 p-4 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-ink-900">
          🎓 Scholarships for {examShortName} aspirants
        </h3>
        <Link
          href="/scholarships"
          className="text-xs font-medium text-saffron-700 hover:text-saffron-800"
        >
          See all →
        </Link>
      </div>
      <p className="mt-1 text-xs text-ink-600">
        Free to apply. Direct links to the awarding body — no third-party fees.
      </p>
      <ul className="mt-3 space-y-2">
        {top.map((s) => (
          <li key={s.id}>
            <a
              href={s.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-md border border-ink-200 bg-white p-2.5 hover:border-saffron-400 hover:bg-saffron-50/60"
            >
              <p className="text-xs font-semibold text-ink-900">{s.name}</p>
              <p className="mt-0.5 text-[11px] text-ink-600">
                <span className="font-medium text-ink-800">{s.amount.split(/[.,]/)[0]}</span>
                <span className="mx-1.5 text-ink-300">·</span>
                <span className="text-ink-500">{s.awardingBody}</span>
              </p>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
