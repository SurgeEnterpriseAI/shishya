// Live government-vacancy explorer data — powers the homepage widget
// that lets any visitor see, on any day, how many government vacancies
// exist national-wide, state-wide, exam-wise and (indicatively)
// reservation-category-wise. Assembled from ExamEligibility, filtered
// to government-JOB exams only (same tag rule as /find-your-exam).
//
// Category splits apply the standard central-government reservation
// roster to the total — explicitly indicative, since the real split
// varies by exam/state/notification.

import { prisma } from "@/lib/db/prisma";
import { computeExamTags } from "@/lib/exam-tags";
import { INDIAN_STATES } from "@/lib/states";

const JOB_TAGS = new Set(["govt", "banking", "teaching", "police", "civil_services", "defence"]);

export interface VacExam {
  code: string;
  short: string;
  vac: number;
}
export interface VacState {
  code: string;
  name: string;
  total: number;
  exams: VacExam[];
}
export interface VacCategory {
  key: string;
  label: string;
  pct: number;
  count: number;
}
export interface VacancyExplorer {
  grandTotal: number;
  totalLakh: string;
  examCount: number;
  national: { total: number; exams: VacExam[] };
  states: VacState[];
  categories: VacCategory[];
  /** ISO timestamp of the most recent vacancy-data refresh (max
   *  ExamEligibility.generatedAt) — shown as the "updated" stamp. */
  updatedAt: string | null;
}

// Standard central-government reservation roster (indicative).
const RESERVATION: { key: string; label: string; pct: number }[] = [
  { key: "UR", label: "General / UR", pct: 0.405 },
  { key: "OBC", label: "OBC", pct: 0.27 },
  { key: "SC", label: "SC", pct: 0.15 },
  { key: "EWS", label: "EWS", pct: 0.1 },
  { key: "ST", label: "ST", pct: 0.075 },
];

const STATE_NAME = new Map(INDIAN_STATES.map((s) => [s.code, s.name]));

export async function loadVacancyExplorer(): Promise<VacancyExplorer> {
  const rows = await prisma.$queryRaw<
    { code: string; short: string; category: string; state: string | null; v: number | null; generatedAt: Date }[]
  >`
    SELECT e.code, e."shortName" AS short, e.category::text AS category, e.state,
           x."vacanciesApprox" AS v, x."generatedAt"
    FROM "ExamEligibility" x JOIN "Exam" e ON e.id = x."examId"
    WHERE e.active = TRUE
  `;

  const jobs = rows.filter((r) =>
    computeExamTags({ code: r.code, category: r.category, state: r.state }).some((t) => JOB_TAGS.has(t)),
  );
  const updatedAt = jobs.reduce<Date | null>(
    (max, r) => (r.generatedAt && (!max || r.generatedAt > max) ? r.generatedAt : max),
    null,
  );

  const national: VacExam[] = [];
  const byState = new Map<string, VacExam[]>();
  let grandTotal = 0;
  for (const r of jobs) {
    const vac = r.v ?? 0;
    grandTotal += vac;
    const item: VacExam = { code: r.code, short: r.short, vac };
    if (r.state) {
      if (!byState.has(r.state)) byState.set(r.state, []);
      byState.get(r.state)!.push(item);
    } else {
      national.push(item);
    }
  }
  national.sort((a, b) => b.vac - a.vac);

  const states: VacState[] = [...byState.entries()]
    .map(([code, exams]) => ({
      code,
      name: STATE_NAME.get(code) ?? code,
      total: exams.reduce((a, e) => a + e.vac, 0),
      exams: exams.sort((a, b) => b.vac - a.vac),
    }))
    .sort((a, b) => b.total - a.total);

  const categories: VacCategory[] = RESERVATION.map((r) => ({
    ...r,
    count: Math.round(grandTotal * r.pct),
  }));

  return {
    grandTotal,
    totalLakh: (grandTotal / 100_000).toFixed(1),
    examCount: jobs.length,
    national: { total: national.reduce((a, e) => a + e.vac, 0), exams: national },
    states,
    categories,
    updatedAt: updatedAt ? updatedAt.toISOString() : null,
  };
}
