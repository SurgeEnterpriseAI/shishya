// /exams/[code]/live — exam-day page.
//
// Highest-traffic moment for any exam: students step out of the
// centre, grab their phone, and Google "{exam} difficulty today".
// This route is the canonical landing for that intent.
//
// Exam night (13 Sep 2026): the page used to render only the phase article,
// which the summariser cannot write before public discussion exists — so on
// the night itself it was an empty state under a title that matched the
// search. It now LEADS with first-party facts (src/lib/exam-night-facts.ts
// → ExamNightFacts): the one-tap poll on an announced exam day, the tally
// from n >= 10, answer-key / result status with tier words, official
// question papers, the indicative cutoff page link (labelled estimate, not
// official — never a "declared" cutoff: we hold no typed, sourced cutoff
// figure), the estimator only where one marking scheme can be stated, the
// PYQ-pattern link, the
// next stage and the alert box. The public-discussion article renders below
// it only when it passes passesStrictArticleGate; no empty-state paragraph.
//
// Metadata is phase-aware (6 Sep 2026 review) and fact-aware (13 Sep): the
// claim ("today" only on an announced exam day, else the dated paper) comes
// from examDayClaim, and every phrase after it names something the page
// renders (the same summary the tagline reads), so <title> and body cannot
// disagree.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { PhaseArticleView } from "@/components/exam-phase/PhaseArticleView";
import { ExamNightFacts } from "@/components/exam-phase/ExamNightFacts";
import { auth } from "@/lib/auth";
import { getT, tFor } from "@/lib/i18n-server";
import type { StringKey } from "@/lib/i18n";
import type { SourceTier } from "@/lib/exam-timeline";
import { getExamWeekInputs } from "@/lib/exam-week-inputs";
import { loadExamNightExam, loadExamNightFacts, stageAwarePhaseMeta } from "@/lib/exam-night-facts";
import { examDayClaim } from "@/lib/phase-article-copy";

type TFn = (key: StringKey) => string;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const exam = await loadExamNightExam(code);
  if (!exam) return { title: "Exam not found — Shishya" };
  const tEn = tFor("en") as TFn;
  const [inputs, facts] = await Promise.all([
    getExamWeekInputs(exam.id),
    loadExamNightFacts(exam, "LIVE", {
      tierWord: (tier: SourceTier) => tEn(`ew.tier.${tier}` as StringKey),
      passedWord: tEn("tracker.passedEstimate"),
      locale: "en",
    }),
  ]);
  // Stage-aware (16 Sep 2026): a focus row of another stage keeps its date
  // but names that stage ("21 Aug (official) Mains paper"), never this
  // exam's own stage; "today" / "held" drop only when the short name is a
  // stage ("UPSC Prelims"), and the description re-stages the full name.
  const meta = stageAwarePhaseMeta("LIVE", exam, examDayClaim(inputs.rows, inputs.officialUrl), facts.summary);
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
  const exam = await loadExamNightExam(code);
  // Inactive = seeded ahead of its question bank; not public yet.
  if (!exam || !exam.active) notFound();
  const [{ t: tRaw, locale }, session] = await Promise.all([getT(), auth().catch(() => null)]);
  const t = tRaw as TFn;
  const facts = await loadExamNightFacts(exam, "LIVE", {
    tierWord: (tier: SourceTier) => t(`ew.tier.${tier}` as StringKey),
    passedWord: t("tracker.passedEstimate"),
    locale,
  });
  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <PhaseArticleView
        code={code}
        phase="LIVE"
        articleGate="strict"
        hideEmpty
        summary={facts.summary}
        lead={<ExamNightFacts facts={facts} exam={exam} slug="live" signedIn={!!session?.user} t={t} locale={locale} />}
      />
    </main>
  );
}
