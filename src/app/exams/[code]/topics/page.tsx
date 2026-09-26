// /exams/:code/topics — no page of its own; it sends the visitor to the
// hub's Syllabus section, where every topic of the exam is listed (24 Sep
// 2026).
//
// The September read found /exams/[code]/topics and /exams/[code]/pyq were
// both 404s: 46 views from 20 students, 30 of them straight from a topic or
// PYQ page — the URL edited up one level to find "all topics" / "all
// papers". The hub already lists both (#syllabus, #pyqs — anchors other
// pages link to), so these paths redirect there instead of growing a
// thinner copy of the hub.
//
// /hi and /te twins reach this route through the middleware rewrite
// (x-shishya-lang, src/middleware.ts) and are sent to their own twin of the
// hub. An unknown or inactive exam is a 404, exactly as the hub itself.

// 26 Sep 2026: permanentRedirect (308) — the path has no page of its own and
// never will, so crawlers should fold it into the hub rather than keep
// re-checking a temporary (307) redirect. Same target.
import { notFound, permanentRedirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { realExamKey } from "@/lib/db/exam-scope";
import { getUrlLocale } from "@/lib/i18n-server";
import { localizedPath } from "@/lib/seo-locale";

export default async function ExamTopicsIndexPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const exam = await prisma.exam.findUnique({ where: realExamKey({ code }), select: { code: true, active: true } });
  if (!exam || !exam.active) notFound();
  permanentRedirect(`${localizedPath(`/exams/${exam.code}`, await getUrlLocale())}#syllabus`);
}
