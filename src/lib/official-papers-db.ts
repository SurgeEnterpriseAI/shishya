// Database reads for official previous-year papers (14 Sep 2026): the rows
// scripts/import-official-papers.ts verified (src/lib/official-papers.ts).
// Cached per exam for an hour — they change only when the importer runs —
// and a failed read is never cached: it shows no papers for that request.
// Raw SQL, like OfficialCutoff.

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import type { OfficialPaperRow } from "@/lib/official-papers";

const cachedPapers = unstable_cache(
  async (examId: string): Promise<OfficialPaperRow[]> =>
    prisma.$queryRaw<OfficialPaperRow[]>`
      SELECT year, paper, kind, language, url, "listingUrl", publisher, bytes, pages, scan
      FROM "OfficialPaper" WHERE "examId" = ${examId} AND "archivedAt" IS NULL`,
  ["official-papers-v1"],
  { revalidate: 3600, tags: ["exam-shared"] },
);

export async function loadOfficialPapers(examId: string): Promise<OfficialPaperRow[]> {
  try {
    return await cachedPapers(examId);
  } catch {
    return [];
  }
}

/** Codes of the exams holding at least one verified official paper or listing page. */
export async function examCodesWithOfficialPapers(): Promise<Set<string>> {
  try {
    const rows = await prisma.$queryRaw<{ code: string }[]>`
      SELECT DISTINCT e.code FROM "OfficialPaper" p JOIN "Exam" e ON e.id = p."examId" WHERE p."archivedAt" IS NULL`;
    return new Set(rows.map((r) => r.code));
  } catch {
    return new Set();
  }
}
