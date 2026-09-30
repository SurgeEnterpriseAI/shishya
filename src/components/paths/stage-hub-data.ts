// Server inputs for /after-10th and /after-12th and their context.md files
// (30 Sep 2026, P1 build 1 — agent B). Two cached reads the site already
// makes, no new query (tests/unit/exam-scope-guard.test.ts):
//   • loadLiveExams() — which exam codes have a live hub, so an exam chip
//     links only a page that exists (a failed read gives an empty map: every
//     chip is then a plain label, nothing can 404);
//   • getExamListRows() → levelCounts() — how many exams /exams/after/{level}
//     lists, printed beside that link. A failed read gives null and the link
//     shows without a count (never a guessed one).
// The page models themselves are pure (src/lib/paths/stage-pages.ts).

import { getExamListRows } from "@/lib/exam-list-rows";
import { levelCounts } from "@/lib/exam-qualification";
import { loadLiveExams } from "@/lib/live-exam-codes";

export type StageHubLevel = "10th" | "12th";

/** Exams listed on /exams/after/{level}, or null when the rows could not be read. */
export async function examsAfterTotal(level: StageHubLevel): Promise<number | null> {
  try {
    const rows = await getExamListRows();
    return levelCounts(rows).find((c) => c.level.slug === level)?.total ?? null;
  } catch (err) {
    console.error("[stage-hub] exam rows read failed; the exams-after link shows no count:", String(err).slice(0, 200));
    return null;
  }
}

export async function loadStageHubInputs(level: StageHubLevel): Promise<{ live: ReadonlyMap<string, string>; examsAfterTotal: number | null }> {
  const [live, total] = await Promise.all([loadLiveExams(), examsAfterTotal(level)]);
  return { live, examsAfterTotal: total };
}
