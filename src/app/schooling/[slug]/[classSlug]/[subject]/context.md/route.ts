// GET /schooling/{board}/class-{n}/{subject}/context.md — one subject's
// machine-readable brief (26 Sep 2026, school go-live): its official books or
// syllabus links and every chapter with what Shishya holds for it, from the
// same live surface as the class file (src/lib/school/surface.ts, wording in
// src/lib/school/context.ts). 404 when the class is not live or the subject
// segment names no subject of it.

import { istDay } from "@/lib/exam-week";
import { schoolClassIdentity, schoolSubjectContextMarkdown } from "@/lib/school/context";
import { EMPTY_SCHOOL_SURFACE, findSchoolClass, loadSchoolSurface, parseSchoolClassSlug, schoolSubjectPath } from "@/lib/school/surface";

export const revalidate = 3600;

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; classSlug: string; subject: string }> }) {
  const { slug, classSlug, subject } = await params;
  const cls = parseSchoolClassSlug(classSlug);
  const surface = cls === null ? EMPTY_SCHOOL_SURFACE : await loadSchoolSurface().catch(() => EMPTY_SCHOOL_SURFACE);
  const c = cls === null ? undefined : findSchoolClass(surface, slug, cls);
  const s = c?.subjects.find((x) => x.slug === subject);
  if (!c || !s) {
    return new Response("Not found\n", { status: 404, headers: { "content-type": "text/plain" } });
  }
  return new Response(schoolSubjectContextMarkdown(c, s, schoolClassIdentity(c.curriculum, c.cls), istDay(new Date())), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=900, s-maxage=3600, stale-while-revalidate=86400",
      // 26 Sep 2026 (G2): the HTML subject page is the canonical URL, as on
      // /exams/{CODE}/context.md. No noindex: AI search must still fetch it.
      link: `<https://shishya.in${schoolSubjectPath(slug, c.cls, s.slug)}>; rel="canonical"`,
    },
  });
}
