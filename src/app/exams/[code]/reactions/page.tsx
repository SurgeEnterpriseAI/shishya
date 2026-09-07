// /exams/[code]/reactions — post-exam student verdict.
//
// Active for the 3 days following exam day. Highest-intent queries:
//   "{exam} expected cutoff 2026"
//   "{exam} answer key analysis"
//   "{exam} difficulty review"
//   "what students are saying about {exam}"
//
// The phase-article cron aggregates public reactions (Reddit, RSS, web
// search) after each sitting; an article appears only once at least two
// real sources exist — never a placeholder.
//
// Metadata is phase-aware (6 Sep 2026 review): "after the paper" only
// when the tracker puts an announced exam day behind us; otherwise the
// dated "{date} ({tier}) paper" — the same helper PhaseArticleView uses
// for the tagline, so <title> and body cannot disagree.

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
  const meta = phaseArticleMeta("REACTIONS", exam, examDayClaim(inputs.rows, inputs.officialUrl));
  const url = `https://shishya.in/exams/${code}/reactions`;
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

export default async function ReactionsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <PhaseArticleView code={code} phase="REACTIONS" />
    </main>
  );
}
