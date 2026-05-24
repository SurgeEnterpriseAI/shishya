// /exams/[code]/checklist — last-minute revision article.
//
// Thin route file: PhaseArticleView does all the work and handles the
// notFound() when the exam code is unknown. We just thread the phase
// in and let the shared component render.

import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { PhaseArticleView } from "@/components/exam-phase/PhaseArticleView";
import { prisma } from "@/lib/db/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const exam = await prisma.exam.findUnique({
    where: { code },
    select: { shortName: true, name: true },
  });
  if (!exam) return { title: "Exam not found — Shishya" };
  return {
    title: `${exam.shortName} last-minute checklist — what to revise, what to carry | Shishya`,
    description: `One week to go for ${exam.name}. Last-mile revision topics, formulae sheet, what to carry to the centre, mock-score targets — written by students who've cleared the same paper.`,
    alternates: { canonical: `https://shishya.in/exams/${code}/checklist` },
    openGraph: {
      title: `${exam.shortName} — Last-minute checklist`,
      description: `Last-mile revision for ${exam.name}. Free, verified, in your language.`,
      url: `https://shishya.in/exams/${code}/checklist`,
      type: "article",
    },
  };
}

export default async function ChecklistPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <PhaseArticleView code={code} phase="CHECKLIST" />
    </main>
  );
}
