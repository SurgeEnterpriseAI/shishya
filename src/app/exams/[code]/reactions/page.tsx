// /exams/[code]/reactions — post-exam student verdict.
//
// Active for the 3 days following exam day. Highest-intent queries:
//   "{exam} expected cutoff 2026"
//   "{exam} answer key analysis"
//   "{exam} difficulty review"
//   "what students are saying about {exam}"
//
// The 2-hour scraping pipeline aggregates social-media reactions
// (Reddit + Telegram + YouTube + X / Twitter when budget allows) so
// the article is always within a couple hours of the freshest
// student chatter.

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
    title: `${exam.shortName} — student verdict, expected cutoff, answer key | Shishya`,
    description: `What ${exam.name} candidates are saying: difficulty verdict, expected cutoff, answer-key analysis. Refreshed every 2 hours for 3 days post-exam.`,
    alternates: { canonical: `https://shishya.in/exams/${code}/reactions` },
    openGraph: {
      title: `${exam.shortName} — Post-exam reactions`,
      description: `Student verdict, expected cutoff, answer-key analysis for ${exam.name}.`,
      url: `https://shishya.in/exams/${code}/reactions`,
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
