// GET /exams/{CODE}/exam-week.ics — the exam's key dates as a calendar
// file (6 Sep 2026, Exam Week Mode wave 2). Linked from the cutoff page's
// exam-week block and the hub's post-exam block ("Add the answer key and
// result dates to my calendar").
//
// One all-day VEVENT per exam-day / answer-key / result row the tracker
// HOLDS (typed rows only): SUMMARY carries the tier word, DESCRIPTION the
// cited source URL and the tracker + hub links, expected rows are
// TENTATIVE. Missing rows are simply absent — never an invented date.
// Builder: src/lib/exam-week-ics.ts. Cached an hour; no personal data.

import { prisma } from "@/lib/db/prisma";
import { realExamKey } from "@/lib/db/exam-scope";
import { getExamWeekInputs } from "@/lib/exam-week-inputs";
import { buildExamWeekIcs, examWeekCalendarRows } from "@/lib/exam-week-ics";

export const revalidate = 3600;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const exam = await prisma.exam
    .findUnique({
      where: realExamKey({ code }),
      select: { id: true, code: true, shortName: true, name: true, active: true },
    })
    .catch(() => null);
  if (!exam || !exam.active) {
    return new Response("Not found\n", { status: 404, headers: { "content-type": "text/plain" } });
  }

  const { rows, officialUrl } = await getExamWeekInputs(exam.id);
  const body = buildExamWeekIcs(exam, examWeekCalendarRows(rows, officialUrl));

  return new Response(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${exam.code}-exam-week.ics"`,
      // The file is linked from crawlable pages (cutoff + hub), so without
      // this a calendar download could be indexed — and outrank the tracker
      // page it was built from. It is a companion file, never a landing
      // page: keep it out of the index and don't pass link equity.
      "x-robots-tag": "noindex, nofollow",
      "cache-control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
