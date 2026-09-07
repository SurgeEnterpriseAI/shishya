// /exams/[code]/live — exam-day live coverage.
//
// Highest-traffic moment for any exam: students step out of the
// centre, grab their phone, and Google "{exam} difficulty today".
// This route is the canonical landing for that intent. The phase-article
// cron compiles the body from public student discussion during the exam
// window; nothing is published until at least two real sources exist, so
// the page never claims coverage it does not have.
//
// Metadata is phase-aware (6 Sep 2026 review): "live … today" only when
// the tracker puts an announced exam day today; otherwise the dated
// "{date} ({tier}) paper" — the same helper PhaseArticleView uses for the
// tagline, so <title> and body cannot disagree.

import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { PhaseArticleView } from "@/components/exam-phase/PhaseArticleView";
import { prisma } from "@/lib/db/prisma";
import { getExamWeekInputs } from "@/lib/exam-week-inputs";
import { examDayClaim, phaseArticleMeta } from "@/lib/phase-article-copy";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const exam = await prisma.exam.findUnique({
    where: { code },
    select: { id: true, shortName: true, name: true },
  });
  if (!exam) return { title: "Exam not found — Shishya" };
  const inputs = await getExamWeekInputs(exam.id);
  const meta = phaseArticleMeta("LIVE", exam, examDayClaim(inputs.rows, inputs.officialUrl));
  const url = `https://shishya.in/exams/${code}/live`;
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: url },
    openGraph: {
      title: meta.ogTitle,
      description: meta.ogDescription,
      url,
      type: "article",
    },
  };
}

export default async function LivePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <PhaseArticleView code={code} phase="LIVE" />
    </main>
  );
}
