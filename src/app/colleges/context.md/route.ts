// GET /colleges/context.md — the colleges section's machine brief (26 Sep
// 2026, B-machine-crawl): every college in src/lib/colleges-data.ts grouped
// by stream and by state with its URL, and the NIRF source exactly as the
// data file states it (src/lib/section-context.ts). Static data, no DB.
// Headers as the exam context files, plus an HTTP canonical link to
// /colleges.

import { istDay } from "@/lib/exam-week";
import { ALL_STREAMS, COLLEGES, NIRF_SOURCE_URL, NIRF_SOURCE_YEAR } from "@/lib/colleges-data";
import { SITE, collegesContextMarkdown, contextMarkdownHeaders } from "@/lib/section-context";

export const revalidate = 3600;

export async function GET() {
  const md = collegesContextMarkdown(COLLEGES, ALL_STREAMS, { year: NIRF_SOURCE_YEAR, url: NIRF_SOURCE_URL }, istDay(new Date()));
  return new Response(md, { headers: contextMarkdownHeaders(`${SITE}/colleges`) });
}
