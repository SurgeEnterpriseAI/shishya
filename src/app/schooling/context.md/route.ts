// GET /schooling/context.md — the school section's machine brief (26 Sep
// 2026, B-machine-crawl).
//
// The class and subject context files existed; the section itself had none.
// This lists every class page with its context file and computed counts,
// and the chapters that carry Shishya's own notes or answer-checked
// practice — all from the live surface (src/lib/school/surface.ts), worded
// in src/lib/section-context.ts with the school honesty and children lines
// of src/lib/school/context.ts. Headers as the class context files, plus an
// HTTP canonical link to the section page.

import { istDay } from "@/lib/exam-week";
import { SCHOOL_HUB_PATH } from "@/lib/school/landings";
import { EMPTY_SCHOOL_SURFACE, loadSchoolSurface } from "@/lib/school/surface";
import { SITE, contextMarkdownHeaders, schoolSectionContextMarkdown } from "@/lib/section-context";

export const revalidate = 3600;

export async function GET() {
  const surface = await loadSchoolSurface().catch(() => EMPTY_SCHOOL_SURFACE);
  return new Response(schoolSectionContextMarkdown(surface, istDay(new Date())), {
    headers: contextMarkdownHeaders(`${SITE}${SCHOOL_HUB_PATH}`),
  });
}
