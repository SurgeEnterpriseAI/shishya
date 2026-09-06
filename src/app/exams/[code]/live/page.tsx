// /exams/[code]/live — exam-day live coverage.
//
// Highest-traffic moment for any exam: students step out of the
// centre, grab their phone, and Google "{exam} difficulty today".
// This route is the canonical landing for that intent. The phase-article
// cron compiles the body from public student discussion during the exam
// window; nothing is published until at least two real sources exist, so
// the page never claims coverage it does not have.

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
    title: `${exam.shortName} live analysis — difficulty, shift-wise, answer key | Shishya`,
    description: `Live ${exam.name} coverage — students' first reactions and shift-by-shift difficulty, compiled from public discussion during the exam window.`,
    alternates: { canonical: `https://shishya.in/exams/${code}/live` },
    openGraph: {
      title: `${exam.shortName} — Live exam-day analysis`,
      description: `Live ${exam.name} difficulty, shift-by-shift, from public student discussion.`,
      url: `https://shishya.in/exams/${code}/live`,
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
