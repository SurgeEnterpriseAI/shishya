// GET /scholarships/context.md — the scholarships section's machine brief
// (26 Sep 2026, B-machine-crawl): one line per entry of
// src/data/scholarships.ts — name, awarding body, levels, scope, the
// Shishya page and the official link (src/lib/section-context.ts). Static
// data, no DB. Headers as the exam context files, plus an HTTP canonical
// link to /scholarships.

import { istDay } from "@/lib/exam-week";
// 26 Sep 2026 (repair): the schemes, never the one outside aggregator
// (Buddy4Study) the raw catalogue holds — src/lib/scholarship-schemes.ts.
import { SCHOLARSHIP_SCHEMES } from "@/lib/scholarship-schemes";
import { SITE, contextMarkdownHeaders, scholarshipsContextMarkdown } from "@/lib/section-context";

export const revalidate = 3600;

export async function GET() {
  return new Response(scholarshipsContextMarkdown(SCHOLARSHIP_SCHEMES, istDay(new Date())), {
    headers: contextMarkdownHeaders(`${SITE}/scholarships`),
  });
}
