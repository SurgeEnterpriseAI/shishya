// GET /schooling/{board}/class-{n}/context.md — a class's machine-readable
// brief for AI crawlers and answer engines (26 Sep 2026, school go-live).
//
// The school twin of /exams/{CODE}/context.md: the class and board, its
// subjects, the official NCERT books (or CISCE syllabus PDFs) with their
// links, every chapter with NCERT's own PDF, and which chapters carry
// Shishya's own notes and answer-checked practice — computed from the live
// rows (src/lib/school/surface.ts), worded in src/lib/school/context.ts.
// 404 for a board this surface does not serve, a bad class segment, or a
// class whose container is not live.

import { istDay } from "@/lib/exam-week";
import { schoolClassContextMarkdown, schoolClassIdentity } from "@/lib/school/context";
import { EMPTY_SCHOOL_SURFACE, findSchoolClass, loadSchoolSurface, parseSchoolClassSlug, schoolClassPath } from "@/lib/school/surface";

export const revalidate = 3600;

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; classSlug: string }> }) {
  const { slug, classSlug } = await params;
  const cls = parseSchoolClassSlug(classSlug);
  const surface = cls === null ? EMPTY_SCHOOL_SURFACE : await loadSchoolSurface().catch(() => EMPTY_SCHOOL_SURFACE);
  const c = cls === null ? undefined : findSchoolClass(surface, slug, cls);
  if (!c) {
    return new Response("Not found\n", { status: 404, headers: { "content-type": "text/plain" } });
  }
  return new Response(schoolClassContextMarkdown(c, schoolClassIdentity(c.curriculum, c.cls), istDay(new Date())), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=900, s-maxage=3600, stale-while-revalidate=86400",
      // 26 Sep 2026 (G2): the HTML class page is the canonical URL, as on
      // /exams/{CODE}/context.md (Bing fetches these files and would
      // otherwise keep each as a separate document). No noindex: AI search
      // must still fetch this file.
      link: `<https://shishya.in${schoolClassPath(slug, c.cls)}>; rel="canonical"`,
    },
  });
}
