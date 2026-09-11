// ExamWeekLines — one exam-week line per enrolled exam on the dashboard
// (11 Sep 2026). Signed-in students land here (221 landers / 14 d) and saw
// nothing about tonight: the hub carries Exam Week Mode, the dashboard did
// not. The page computes each line from the shared state machine
// (computeExamWeekState + the student's own shift day) and hands plain
// strings in; this only lays them out. Server component, no client JS.
//
// Honesty rules travel in the strings the page builds: every date carries
// its tier word, answer key / result are only what the tracker holds, and
// an EXPECTED exam day produces no line at all.

import Link from "next/link";

export interface ExamWeekLine {
  code: string;
  icon: string;
  text: string;
  /** Where the line leads — the exam hub (poll / checklist / key status). */
  href: string;
  cta: string | null;
}

export function ExamWeekLines({ lines }: { lines: ExamWeekLine[] }) {
  if (lines.length === 0) return null;
  return (
    <ul className="mt-4 space-y-2">
      {lines.map((l) => (
        <li key={l.code}>
          <Link
            href={l.href}
            prefetch={false}
            className="flex items-center justify-between gap-3 rounded-xl border-2 border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 px-4 py-3 transition-colors hover:border-saffron-400"
          >
            <span className="min-w-0 text-sm font-semibold text-ink-900">
              {l.icon} {l.text}
            </span>
            {l.cta && <span className="shrink-0 text-sm font-bold text-saffron-700">{l.cta} →</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
