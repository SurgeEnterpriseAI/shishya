// /exams/:code/pyq — no page of its own; it sends the visitor to the hub's
// Previous Papers section (#pyqs), where the official papers and every
// year's PYQ-pattern set are listed (24 Sep 2026). Why: see
// src/app/exams/[code]/topics/page.tsx — both paths were 404s that students
// reached by editing a PYQ-year or topic URL up one level.
//
// /hi and /te twins keep their language (middleware rewrite, x-shishya-lang);
// an unknown or inactive exam is a 404, as the hub.

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { realExamKey } from "@/lib/db/exam-scope";
import { getUrlLocale } from "@/lib/i18n-server";
import { localizedPath } from "@/lib/seo-locale";

export default async function ExamPyqIndexPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const exam = await prisma.exam.findUnique({ where: realExamKey({ code }), select: { code: true, active: true } });
  if (!exam || !exam.active) notFound();
  redirect(`${localizedPath(`/exams/${exam.code}`, await getUrlLocale())}#pyqs`);
}
