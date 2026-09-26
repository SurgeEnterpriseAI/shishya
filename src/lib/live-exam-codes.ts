// Which exam codes have a live /exams/[code] hub (26 Sep 2026, group D).
//
// The section pages (careers, career map, colleges, a college branch,
// scholarships, personas, school class and subject pages) name exams by
// code from hand-written data. Several of those codes have no Exam row —
// CLAT, BITSAT, UGC_NET, GATE, LPUNEST on 26 Sep 2026 — so their links
// 404'd. One cached read of every live real exam (REAL_EXAM_WHERE: active,
// not a school container) decides: a code in the map is linked through
// examHubHref (src/lib/section-seo.ts), anything else renders as a plain
// label. Cached 10 minutes like src/lib/exam-page-gates.ts, same tag.
//
// A failed read returns an empty map: the pages then show plain labels (no
// link can 404) and ISR re-reads on the next revalidate.

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { REAL_EXAM_WHERE } from "@/lib/db/exam-scope";

const cachedLiveExams = unstable_cache(
  async (): Promise<Array<[string, string]>> => {
    const rows = await prisma.exam.findMany({ where: REAL_EXAM_WHERE, select: { code: true, shortName: true } });
    return rows.map((r) => [r.code, r.shortName]);
  },
  ["live-exam-codes-v1"],
  { revalidate: 600, tags: ["exam-shared"] },
);

/** code → shortName for every live real exam; empty on a failed read. */
export async function loadLiveExams(): Promise<ReadonlyMap<string, string>> {
  try {
    return new Map(await cachedLiveExams());
  } catch (err) {
    console.error("[live-exam-codes] read failed; exam chips render as plain labels:", String(err).slice(0, 200));
    return new Map();
  }
}
