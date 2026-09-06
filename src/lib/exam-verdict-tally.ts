// Exam-verdict tally — read side of the "how was the paper?" poll.
//
// NOTE FOR THE MERGE: the poll's write side and the canonical
// getVerdictTally(examId, examDateIso) live in src/lib/exam-verdict.ts
// (agent B). That file was not present in this worktree, so this module
// carries the same-shaped helper for the AEO surfaces; the lead can point
// the imports in exam-week-aeo.ts at src/lib/exam-verdict.ts and delete
// this file. Shape of the tally matches the API contract:
//   GET /api/exam-verdict?exam=CODE&date=YYYY-MM-DD
//     → { n, easy, moderate, tough, sections: [{ label, n }] }
//
// Honesty rule (founder): counts / percentages are only ever shown from
// n >= VERDICT_MIN_N, and the line is a mood reading — never a prediction.

import { prisma } from "@/lib/db/prisma";

export interface VerdictTally {
  n: number;
  easy: number;
  moderate: number;
  tough: number;
  sections: Array<{ label: string; n: number }>;
}

export const VERDICT_MIN_N = 10;

export function emptyTally(): VerdictTally {
  return { n: 0, easy: 0, moderate: 0, tough: 0, sections: [] };
}

function utcMidnight(iso: string): Date | null {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Tally for every verdict whose examDate lies in [fromIso, toIso]
 *  (inclusive) — multi-day windows (SSC-style CBTs) pool their days.
 *  Never throws: a missing table / query error reads as "no votes". */
export async function getVerdictTallyRange(examId: string, fromIso: string, toIso: string): Promise<VerdictTally> {
  const from = utcMidnight(fromIso);
  const to = utcMidnight(toIso);
  if (!from || !to) return emptyTally();
  try {
    const where = { examId, examDate: { gte: from, lte: to } };
    const [byVerdict, bySection] = await Promise.all([
      prisma.examVerdict.groupBy({ by: ["verdict"], where, _count: { _all: true } }),
      prisma.examVerdict.groupBy({ by: ["section"], where: { ...where, section: { not: null } }, _count: { _all: true } }),
    ]);
    const count = (v: string) => byVerdict.find((r) => r.verdict === v)?._count._all ?? 0;
    const easy = count("EASY");
    const moderate = count("MODERATE");
    const tough = count("TOUGH");
    const sections: Array<{ label: string; n: number }> = [];
    for (const r of bySection) {
      const label = typeof r.section === "string" ? r.section.trim() : "";
      if (label) sections.push({ label, n: r._count._all });
    }
    sections.sort((a, b) => b.n - a.n);
    return { n: easy + moderate + tough, easy, moderate, tough, sections: sections.slice(0, 5) };
  } catch {
    return emptyTally();
  }
}

/** Contract-shaped single-day helper (same signature as src/lib/exam-verdict.ts). */
export function getVerdictTally(examId: string, examDateIso: string): Promise<VerdictTally> {
  return getVerdictTallyRange(examId, examDateIso, examDateIso);
}

/** "N students rated the paper: x% easy / y% moderate / z% tough" — or
 *  null below the n >= 10 floor. English only: consumed by the
 *  machine-readable AEO files (context.md / llms-full.txt). */
export function tallyLine(t: VerdictTally | null | undefined): string | null {
  if (!t || t.n < VERDICT_MIN_N) return null;
  const pct = (x: number) => Math.round((x / t.n) * 100);
  return `${t.n} students rated the paper: ${pct(t.easy)}% easy / ${pct(t.moderate)}% moderate / ${pct(t.tough)}% tough`;
}
