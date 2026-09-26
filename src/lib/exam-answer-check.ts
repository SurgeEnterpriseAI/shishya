// How many of an exam's live questions the answer check has NOT passed
// (26 Sep 2026, repair).
//
// Why: the hub FAQ (src/lib/exam-hub-copy.ts, src/components/ExamFaq.tsx)
// said every question on every exam was "answer-checked by an automated
// check (three independent AI solves and an examiner) before they go live".
// A read-only probe of the prod DB on 26 Sep 2026 found 157 validated
// questions on 55 real exams with no answer-check record (SZF_IOM 10 of 176,
// IBPS_PO 6 of 251, SSC_MTS 6 of 263 …): they were validated at insert
// (system:pyq-pattern, scripts/seed-pyqs.ts) or in bulk
// (system:bulk:overnight, sme-bulk-2026-05-10) — the header of
// scripts/verify-question-bank.ts says those stamps were given "without an
// answer check". Pickers serve every validated question, so the claim was
// false on every exam where this count is not 0. The FAQ now states the
// split exam by exam (faqCountAnswer), and makes no check claim when this
// read fails.
//
// "Passed" is the firewall's own record, the rule
// src/lib/site-description-counts.ts counts: validatedBy LIKE 'factory:%'
// AND metadata ? 'factoryVerify'. NULL validatedBy or metadata counts as NOT
// passed (COALESCE — a bare NOT (NULL …) would drop the row from the count).
// The population is the hub count's own (src/lib/db/exam-cache.ts:
// validated = true), so both numbers in one FAQ answer describe one set.
//
// One grouped read for every real exam, cached like the other hub gates
// (src/lib/page-gates-notes.ts): 10 minutes, tag "exam-shared".

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { REAL_EXAM_SQL } from "@/lib/db/exam-scope";

type UncheckedRow = { code: string; n: number };

const cachedUncheckedByExam = unstable_cache(
  async (): Promise<UncheckedRow[]> =>
    prisma.$queryRaw<UncheckedRow[]>`
      SELECT e.code, COUNT(*)::int AS n
      FROM "Question" q
      JOIN "Exam" e ON e.id = q."examId"
      WHERE q.validated = TRUE AND ${REAL_EXAM_SQL}
        AND NOT (COALESCE(q."validatedBy", '') LIKE 'factory:%' AND COALESCE(q.metadata ? 'factoryVerify', FALSE))
      GROUP BY e.code`,
  ["exam-unchecked-questions-v1"],
  { revalidate: 600, tags: ["exam-shared"] },
);

/** Validated questions of this exam the answer check has not passed; 0 when
 *  every one has; null when the read failed (the FAQ then claims no check). */
export async function examUncheckedQuestionCount(code: string): Promise<number | null> {
  try {
    const rows = await cachedUncheckedByExam();
    const n = rows.find((r) => r.code === code)?.n ?? 0;
    return Number.isFinite(Number(n)) ? Number(n) : null;
  } catch {
    return null;
  }
}
