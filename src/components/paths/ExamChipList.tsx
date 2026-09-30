// Exam chips on the life-stage pages (30 Sep 2026, P1 build 1 — agent B).
// A chip links /exams/{code} only when the model gave it an href (the exam
// is live: examHubHref over loadLiveExams' map); otherwise it is a plain
// label with "no Shishya page yet", so no chip can 404 — the /career-map and
// /schooling/streams rule. Server component.

import Link from "next/link";
import type { ExamChip } from "@/lib/paths/index-helpers";
import { pathCopy } from "@/lib/paths/copy";

export function ExamChipList({ chips, locale, compact = false }: { chips: readonly ExamChip[]; locale?: string | null; compact?: boolean }) {
  if (chips.length === 0) return null;
  const noPage = pathCopy(locale).blocks.examNoPage;
  const pad = compact ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs";
  return (
    <ul className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <li key={c.label}>
          {c.href ? (
            <Link href={c.href} prefetch={false} className={`inline-block rounded-md border border-saffron-300 bg-saffron-50/40 ${pad} text-saffron-800 hover:bg-saffron-100`}>
              {c.label} →
            </Link>
          ) : (
            <span className={`inline-block rounded-md border border-ink-200 bg-white ${pad} text-ink-700`}>
              {c.label} <span className="text-ink-500">· {noPage}</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
