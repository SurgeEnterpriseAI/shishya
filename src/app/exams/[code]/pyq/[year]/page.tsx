// /exams/:code/pyq/:year — PYQ paper landing page.
// PUBLIC: these are among the highest-value SEO pages on the site
// ("[exam] PYQ 2025" queries are top landing content) — they were
// accidentally redirecting every signed-out visitor AND crawler to /login,
// which made every sitemap-listed PYQ URL invisible to Google. Anonymous
// visitors now get the full landing (paper info, subject breakdown) with a
// sign-in CTA to attempt; the system Mock is only touched for signed-in
// users so crawler hits never write to the DB.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getT } from "@/lib/i18n-server";
import { formatDisplayScorePct } from "@/lib/scoring";
import { StartFullMockButton } from "./StartFullMockButton";
import { ShareExamButton } from "@/components/ShareExamButton";
import { PulseAsk } from "@/components/PulseAsk";
import { StateExamsLink } from "@/components/StateExamsLink";

// Public SEO landing page — previous-year question sets rarely change.
export const revalidate = 600;

// Honesty guard (7 Sep 2026): of 587 PYQ exam-years on prod, 534 hold less
// than half the real paper and 521 hold ≤25 questions. Calling a 20-question
// set "the 2023 paper" is the single biggest overclaim on the site, so every
// surface below states what the year actually holds against the real paper.
// A year counts as the paper only once it holds ≥80% of it.
//
// Second honesty guard (11 Sep 2026): NONE of these questions is the
// original. Every PYQ question on the site is freshly worded in the PATTERN
// of that year's paper (src/lib/ai/pyq-generator.ts — "never reproduce a
// real PYQ verbatim"; scripts/build-full-pyq-papers.ts assembles the
// full-length ones the same way). This page said "real questions from the
// {year} paper". Every surface below — title, description, JSON-LD, FAQ
// answers, share text, body, tutor seed — now says "{n} PYQ-pattern
// questions modelled on the {year} paper (which had {total})". The SEO
// title keeps the phrase students search for, "Previous Year Questions
// (PYQ)", because that is the query; the claim lives in the rest.
const FULL_PAPER_RATIO = 0.8;
function isPartialPaper(held: number, totalQuestions: number): boolean {
  // totalQuestions <= 0 means we don't know the real paper's size — say
  // nothing rather than guess.
  return totalQuestions > 0 && held < totalQuestions * FULL_PAPER_RATIO;
}
/** "{n} of {m}" → substitutes named vars; same helper shape as ExamWeekBlock. */
function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string; year: string }>;
}): Promise<Metadata> {
  const { code, year } = await params;
  const exam = await prisma.exam.findUnique({
    where: { code },
    select: { id: true, code: true, shortName: true, name: true, totalQuestions: true },
  });
  if (!exam) return { title: "Previous year paper — Shishya" };
  const yearNum = parseInt(year, 10);
  if (!Number.isFinite(yearNum)) return { title: "Previous year paper — Shishya" };
  // Same filter as the page body, so the title can never promise more
  // questions than the page renders.
  const held = await prisma.question.count({
    where: { examId: exam.id, source: "PYQ", pyqYear: yearNum, validated: true },
  });
  const partial = isPartialPaper(held, exam.totalQuestions);
  // Exam name + year stay at the front of the title — these pages rank for
  // "<exam> <year> previous year paper"; the title keeps the search phrase
  // "Previous Year Questions (PYQ)", the description carries the claim:
  // pattern-modelled, never the original questions.
  const title = partial
    ? `${exam.shortName} ${year} Previous Year Questions (PYQ) — ${held} of ${exam.totalQuestions}, Solve Free | Shishya`
    : `${exam.shortName} ${year} Previous Year Questions (PYQ) — Full-Length Pattern Paper, Solve Free | Shishya`;
  const description =
    `${held} PYQ-pattern questions modelled on the ${exam.shortName} (${exam.name}) ${year} paper (which had ` +
    `${exam.totalQuestions}) — freshly worded in that paper's pattern, not the original questions. ` +
    (partial ? "Solve this set free" : "Solve it free as a full-length timed mock") +
    ` on Shishya with instant scoring, solutions and topic-wise analysis. No coaching fees, in your language.`;
  const url = `https://shishya.in/exams/${exam.code}/pyq/${year}`;
  // The per-exam social card (src/app/exams/[code]/opengraph-image.tsx).
  const ogImage = `https://shishya.in/exams/${exam.code}/opengraph-image`;
  return {
    title,
    description,
    alternates: { canonical: url },
    keywords: [
      `${exam.shortName} ${year} question paper`,
      `${exam.shortName} PYQ ${year}`,
      `${exam.shortName} previous year paper`,
      `${exam.shortName} ${year} paper with solutions`,
      `${exam.shortName} old papers`,
    ],
    openGraph: {
      title,
      description,
      url,
      siteName: "Shishya",
      locale: "en_IN",
      type: "article",
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${exam.shortName} — Shishya` }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

export default async function PYQYearPage({
  params,
}: {
  params: Promise<{ code: string; year: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const { code, year } = await params;
  const yearNum = parseInt(year, 10);
  if (!Number.isFinite(yearNum)) notFound();
  const { t, locale } = await getT();

  const exam = await prisma.exam.findUnique({ where: { code } });
  // Inactive = seeded ahead of its question bank; not public yet.
  if (!exam || !exam.active) notFound();

  const questions = await prisma.question.findMany({
    where: { examId: exam.id, source: "PYQ", pyqYear: yearNum, validated: true },
    include: { topic: { include: { subject: true } } },
    orderBy: { id: "asc" },
  });

  if (questions.length === 0) {
    return (
      <main className="min-h-screen bg-ink-50/40">
        <Header />
        <section className="container-prose py-10">
          <p className="text-xs text-ink-500">
            <Link href={`/exams/${code}`} className="hover:text-ink-800">{exam.shortName}</Link> · PYQ · {yearNum}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink-900">{exam.shortName} — {yearNum}</h1>
          <p className="mt-3 rounded-md border border-dashed border-ink-300 bg-white px-4 py-5 text-sm text-ink-500">
            {t("exam.pyq.empty")}
          </p>
        </section>
      </main>
    );
  }

  // Is this year a full-length pattern paper, or a set of questions in the
  // paper's pattern? Drives the H1 line, the CTA copy, the JSON-LD and the
  // AEO answer below. Either way the questions are pattern-modelled, and
  // `modelled` is the one sentence every surface on this page uses.
  const partial = isPartialPaper(questions.length, exam.totalQuestions);
  const counts = { n: questions.length, m: exam.totalQuestions, year: yearNum };
  const modelled = `${questions.length} PYQ-pattern questions modelled on the ${yearNum} paper (which had ${exam.totalQuestions})`;
  // The original paper, when the conducting body publishes it (14 Sep 2026):
  // linked to the body's own file, never reproduced (src/lib/official-papers.ts).
  const { loadOfficialPapers } = await import("@/lib/official-papers-db");
  const { formatPdfSize, papersForYear } = await import("@/lib/official-papers");
  const officialForYear = papersForYear(await loadOfficialPapers(exam.id), yearNum);
  const officialPaper = officialForYear.find((r) => r.kind !== "answer key") ?? officialForYear[0] ?? null;
  const officialPaperNote = officialPaper
    ? ` The original ${yearNum} paper is published by ${officialPaper.publisher}: ${officialPaper.url}`
    : "";

  // Signed-in only: find-or-create the system Mock + the user's attempt
  // state. Anonymous visitors (and crawlers) get a read-only landing — no
  // DB writes on crawl traffic.
  const generatedBy = `system:pyq:${code}:${yearNum}`;
  let mock: { id: string } | null = null;
  let userAttempt: { id: string; status: string; scorePct: any; finishedAt: Date | null } | null = null;
  let hasSubmittedHistory = false;
  if (userId) {
    let m = await prisma.mock.findFirst({
      where: { examId: exam.id, userId: null, generatedBy },
    });
    // 15 Sep 2026: the title says what the set is — a full-length pattern
    // paper, or N of the paper's M questions — and follows the count when a
    // year is deepened (165 older titles still said "(Previous Year)").
    const honestTitle = partial
      ? `${exam.shortName} — ${yearNum} PYQ-pattern set (${questions.length} of ${exam.totalQuestions} questions)`
      : `${exam.shortName} — ${yearNum} (PYQ Pattern)`;
    if (!m) {
      m = await prisma.mock.create({
        data: {
          examId: exam.id,
          userId: null,
          type: "FULL",
          title: honestTitle,
          questionIds: questions.map((q) => q.id),
          generatedBy,
          config: {
            source: "PYQ",
            year: yearNum,
            durationMin: exam.durationMin,
            count: questions.length,
          } as any,
        },
      });
    } else if (m.questionIds.length !== questions.length || m.title !== honestTitle) {
      // Keep the mock in sync if PYQs were added/removed for this year.
      m = await prisma.mock.update({
        where: { id: m.id },
        data: { questionIds: questions.map((q) => q.id), title: honestTitle },
      });
    }
    mock = m;

    // Has the user already attempted this paper?
    userAttempt = await prisma.attempt.findFirst({
      where: { mockId: m.id, userId },
      orderBy: { startedAt: "desc" },
      select: { id: true, status: true, scorePct: true, finishedAt: true },
    });

    // Has the user already submitted ANY mock on this exam? Drives whether
    // the StartFullMockButton shows the warmup-vs-full-mock dialog.
    const submittedHistoryCount = await prisma.attempt.count({
      where: {
        userId,
        status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
        mock: { examId: exam.id },
      },
    });
    hasSubmittedHistory = submittedHistoryCount > 0;
  }

  // Group preview by subject for the landing card.
  const bySubject = new Map<string, { name: string; count: number }>();
  for (const q of questions) {
    const subj = q.topic.subject;
    const cur = bySubject.get(subj.code) ?? { name: subj.name, count: 0 };
    cur.count += 1;
    bySubject.set(subj.code, cur);
  }
  const subjectRows = [...bySubject.entries()];

  // Structured data: breadcrumbs + the paper as a free LearningResource —
  // eligible for rich results and machine-citable by answer engines.
  const pageUrl = `https://shishya.in/exams/${exam.code}/pyq/${yearNum}`;
  const pyqJsonLd = {
    "@context": "https://schema.org",
    "@type": ["Article", "LearningResource"],
    headline: partial
      ? `${exam.shortName} ${yearNum} PYQ-Pattern Questions (${questions.length} of ${exam.totalQuestions})`
      : `${exam.shortName} ${yearNum} PYQ-Pattern Paper (${questions.length} questions)`,
    name: `${exam.shortName} ${yearNum} PYQ`,
    description: `${questions.length} PYQ-pattern questions modelled on the ${exam.name} ${yearNum} paper (which had ${exam.totalQuestions}) — freshly worded in that paper's pattern, not the original questions. Solve ${partial ? "this set" : "it as a full-length timed mock"} free with instant scoring and solutions.`,
    url: pageUrl,
    inLanguage: "en-IN",
    isAccessibleForFree: true,
    learningResourceType: partial
      ? "PYQ-pattern practice questions (modelled on part of the paper)"
      : "PYQ-pattern practice paper (full-length, modelled on the paper)",
    educationalLevel: "Competitive exam preparation",
    about: [
      { "@type": "Thing", name: exam.name },
      { "@type": "Thing", name: `${exam.shortName} ${yearNum} question paper` },
    ],
    publisher: { "@type": "Organization", name: "Shishya", url: "https://shishya.in" },
    isPartOf: { "@type": "Course", name: `${exam.shortName} preparation`, url: `https://shishya.in/exams/${exam.code}` },
  };
  const pyqBreadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: exam.shortName, item: `https://shishya.in/exams/${exam.code}` },
      { "@type": "ListItem", position: 3, name: `PYQ ${yearNum}`, item: pageUrl },
    ],
  };
  // AEO: the questions searchers/AI engines actually ask about PYQs,
  // answered contextually for THIS exam and year with the live count.
  const pyqFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Where can I solve ${exam.shortName} ${yearNum} previous year questions free online?`,
        acceptedAnswer: {
          "@type": "Answer",
          text:
            `At ${pageUrl} you can solve ${exam.shortName} ${modelled} free. Shishya does not reproduce the original paper: every question is freshly worded in that year's pattern — same topics, style and difficulty, new wording and numbers` +
            (partial ? `, and this set covers ${questions.length} of the paper's ${exam.totalQuestions} questions, not the whole paper` : ", at the real paper's full length") +
            `. They run as a timed mock with instant scoring, step-by-step solutions and topic-wise weak-area analysis. No fee and no coaching enrolment needed.`,
        },
      },
      {
        "@type": "Question",
        name: `Are these the actual ${exam.shortName} ${yearNum} paper questions?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `No. They are PYQ-pattern questions modelled on the ${exam.shortName} ${yearNum} paper — freshly worded practice questions in the same pattern, not the original questions, which Shishya does not reproduce. The page shows how many questions it holds (${questions.length}) against the real paper's length (${exam.totalQuestions}).${officialPaperNote}`,
        },
      },
      {
        "@type": "Question",
        name: `Do these ${exam.shortName} ${yearNum} pattern questions come with solutions and analysis?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Yes — every question carries a worked solution, and on submitting you get an instant score with a topic-wise breakdown showing exactly which areas to revise. Wrong answers are auto-collected into a free Mistake Notebook for one-tap re-practice until cleared.`,
        },
      },
      {
        "@type": "Question",
        name: `Are previous year papers enough to crack ${exam.shortName}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Previous-year papers are the best signal of what the exam actually tests, but toppers pair them with targeted practice and a plan. On Shishya (all free): solve PYQ-pattern sets year-wise, drill weak topics via the Mistake Notebook, follow a day-by-day plan from the Personal Coach at https://shishya.in/coach, and sit the Sunday All-India Live Test at https://shishya.in/live-test to see where you stand nationally.`,
        },
      },
    ],
  };

  return (
    <main className="min-h-screen bg-ink-50/40">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pyqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pyqBreadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pyqFaq) }}
      />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href={`/exams/${code}`} className="hover:text-ink-800">{exam.shortName}</Link> · {t("exam.pyq.title")} · {yearNum}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">{exam.shortName} — {yearNum}</h1>
        <p className="mt-1 text-sm text-ink-600">
          {/* "20 PYQ-pattern questions modelled on the 2023 paper (which
              had 150) · 60 minutes" — the student knows exactly what they
              are getting before they start. English on every locale: the
              i18n line (exam.pyq.partialLine) still says "previous-year
              questions", which is the claim this page must not make. */}
          {modelled} · {exam.durationMin} {t("exam.minutes")}
        </p>
        <p className="mt-2 max-w-3xl text-xs text-ink-500">
          Every question here is freshly worded in the pattern of the {yearNum} paper — same topics, style and
          difficulty — not the original questions, which Shishya does not reproduce.
        </p>
        <StateExamsLink state={exam.state} label={t("exam.state.more")} locale={locale} />
        {officialForYear.length > 0 && (
          <div id="official-paper" className="mt-3 max-w-3xl rounded-md border border-ink-200 bg-white p-3">
            <p className="text-sm font-semibold text-ink-900">
              The original {yearNum} paper, as {officialForYear[0].publisher} published it
            </p>
            <ul className="mt-1 space-y-1">
              {officialForYear.map((r) => (
                <li key={r.url} className="text-sm leading-snug">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener nofollow"
                    className="break-words font-medium text-saffron-800 underline underline-offset-2 hover:text-saffron-900"
                  >
                    {r.paper} ↗
                  </a>
                  <span className="text-xs text-ink-500">
                    {[r.kind, r.language, r.scan ? "scanned PDF" : "PDF", formatPdfSize(r.bytes)]
                      .filter(Boolean)
                      .map((s) => ` · ${s}`)
                      .join("")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4">
          <ShareExamButton
            url={`https://shishya.in/exams/${code}/pyq/${yearNum}`}
            message={`${exam.shortName} ${yearNum}: ${modelled} — solve them free on Shishya, ${partial ? "instant score" : "full-length timed mock, instant score"}:`}
            surface="pyq"
          />
        </div>

        <div className="mt-6 rounded-md border border-ink-200 bg-white p-6">
          {!userId || !mock ? (
            // Anonymous (and crawler) view — the paper is fully described
            // above; attempting needs a free account for scoring + history.
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink-900">
                  {partial
                    ? `Solve these ${questions.length} ${yearNum}-pattern questions as a timed mock — free`
                    : `Solve this ${yearNum}-pattern paper as a full-length timed mock — free`}
                </p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {modelled} · instant scoring · topic-wise analysis. Sign in free to attempt and track your progress.
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(`/exams/${code}/pyq/${yearNum}`)}`}
                  className="btn-primary text-center"
                >
                  Sign in free &amp; start →
                </Link>
                <Link
                  href={`/exams/${code}/quiz`}
                  className="text-center text-xs font-semibold text-saffron-700 underline-offset-2 hover:underline"
                >
                  or try a 5-question quiz first — no signup
                </Link>
              </div>
            </div>
          ) : (
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink-900">
                {userAttempt?.status === "SUBMITTED" || userAttempt?.status === "AUTO_SUBMITTED"
                  ? t(partial ? "exam.pyq.retakePartial" : "exam.pyq.retake")
                  : userAttempt?.status === "IN_PROGRESS"
                  ? t("exam.pyq.resume")
                  : t(partial ? "exam.pyq.startPartial" : "exam.pyq.start")}
              </p>
              <p className="mt-0.5 text-xs text-ink-500">
                {/* The i18n bodies (exam.pyq.startBodyPartial: "This set is
                    {n} of the paper's {m} questions") claim the questions
                    are the paper's; this English line does not. */}
                {userAttempt?.scorePct != null
                  ? `${t("exam.rank.bestScore")}: ${formatDisplayScorePct(userAttempt.scorePct)}`
                  : exam.negativeMark > 0
                  ? `${t("exam.pyq.startBody")} ${modelled}.`
                  : `${modelled}.`}
              </p>
            </div>
            {userAttempt?.status === "IN_PROGRESS" ? (
              // Already in progress — go straight to the player. No
              // warmup-vs-full prompt; they've already chosen.
              <Link href={`/mocks/${mock.id}`} prefetch={false} className="btn-primary">
                {t("exam.pyq.resumeBtn")}
              </Link>
            ) : (
              <StartFullMockButton
                mockId={mock.id}
                examCode={code}
                examShortName={exam.shortName}
                totalQuestions={questions.length}
                paperQuestions={exam.totalQuestions}
                durationMin={exam.durationMin}
                hasSubmittedHistory={hasSubmittedHistory}
                label={t("exam.pyq.startBtn")}
              />
            )}
          </div>
          )}

          {userAttempt && (userAttempt.status === "SUBMITTED" || userAttempt.status === "AUTO_SUBMITTED") && (
            <div className="mt-4 border-t border-ink-100 pt-3">
              <Link
                href={`/attempts/${userAttempt.id}/results`}
                prefetch={false}
                className="text-xs font-medium text-saffron-700 hover:text-saffron-800"
              >
                {t("exam.mocks.review")} →
              </Link>
            </div>
          )}
        </div>

        {/* Ask Shishya — the highest-intent tutor entry: a stuck aspirant
            looking at a real past paper. prefetch=false so the header-link
            prefetch inflation we just fixed isn't reintroduced here. */}
        <div className="mt-6 rounded-md border border-saffron-200 bg-saffron-50/60 p-5">
          <p className="text-sm font-semibold text-ink-900">
            Stuck on a question from this set?
          </p>
          <p className="mt-1 text-sm text-ink-600">
            Ask <strong>Shishya</strong> — your free AI tutor — to explain any {exam.shortName}{" "}
            {yearNum}-pattern question, concept, or shortcut, step by step, in your language.
          </p>
          <Link
            rel="nofollow" href={`/chat?examCode=${code}&seed=${encodeURIComponent(
              `I'm solving PYQ-pattern questions modelled on the ${exam.shortName} ${yearNum} paper. Explain the questions and concepts I'm stuck on, step by step.`,
            )}`}
            prefetch={false}
            className="btn-primary mt-4 !py-2 !px-4 text-sm"
          >
            Ask Shishya about this set →
          </Link>
        </div>

        {subjectRows.length > 0 && (
          <section className="mt-8">
            <h2 className="text-base font-semibold text-ink-800">{t("exam.pyq.breakdown")}</h2>
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {subjectRows.map(([code, { name, count }]) => (
                <li key={code} className="rounded-md border border-ink-200 bg-white p-3">
                  <p className="text-sm font-medium text-ink-900">{name}</p>
                  <p className="mt-0.5 text-xs text-ink-500">{count} {t("exam.pyq.questions")}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* PulseAsk (1 Sep 2026): back-year papers are ~20-Q samplers
            for many exams — when this year is thin, ask whether the
            student needs the full paper. Direct demand-validation for
            the full-PYQ build. Gated on `partial` rather than a flat
            "<100 questions" (7 Sep 2026): an 80-question exam whose year
            holds 78 is complete, and was being asked for "the full paper". */}
        {partial && (
          <PulseAsk
            surface="pyq"
            promptKey={`pyq-${exam.code}-${yearNum}`}
            prompt={`Want a full-length ${exam.shortName} ${yearNum}-pattern paper? This page has ${questions.length} pattern questions; the real paper had ${exam.totalQuestions}.`}
            chips={["Yes, need the full-length paper", "This sampler is enough"]}
            signedIn={!!userId}
            examCode={exam.code}
          />
        )}
      </section>
    </main>
  );
}
