// GET /careers/context.md — the careers section's machine brief (26 Sep
// 2026, B-machine-crawl): one line per entry of src/data/careers.ts by
// category with its URL, plus /career-map and the /jobs pages
// (src/lib/section-context.ts). Static data, no DB. Headers as the exam
// context files, plus an HTTP canonical link to /careers.

import { istDay } from "@/lib/exam-week";
import { CAREERS, CAREER_CATEGORIES } from "@/data/careers";
import { SITE, careersContextMarkdown, contextMarkdownHeaders } from "@/lib/section-context";

export const revalidate = 3600;

export async function GET() {
  return new Response(careersContextMarkdown(CAREERS, CAREER_CATEGORIES, istDay(new Date())), {
    headers: contextMarkdownHeaders(`${SITE}/careers`),
  });
}
