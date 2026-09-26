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
import { realExamKey } from "@/lib/db/exam-scope";
import { getT } from "@/lib/i18n-server";
import { formatDisplayScorePct } from "@/lib/scoring";
import { StartFullMockButton } from "./StartFullMockButton";
import { ShareExamButton } from "@/components/ShareExamButton";
import { PulseAsk } from "@/components/PulseAsk";
import { StateExamsLink } from "@/components/StateExamsLink";
import { pyqYearDescription, pyqYearH1, pyqYearHeadline } from "@/lib/pyq-naming";
import { fillPyq, pyqCopyLocale, pyqYearCopy } from "@/lib/pyq-year-copy";
import {
  FULL_PATTERN_PREFIX,
  fullMockFaqNote,
  isQuestionPaper,
  officialYearFaqNote,
  pickFullPatternMock,
  pickOfficialPaperLinks,
} from "@/lib/pyq-full-paper";
import { OfficialYearPapers, WholePaperLinks } from "./WholePaperLinks";

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
    where: realExamKey({ code }),
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
  // Both names (15 Sep 2026, src/lib/pyq-naming.ts): the search phrase
  // "previous year paper" plus the honest label; the official paper is named
  // only where the conducting body published one and we link it.
  const { loadOfficialPapers: loadOfficialPapersMeta } = await import("@/lib/official-papers-db");
  const { papersForYear: papersForYearMeta } = await import("@/lib/official-papers");
  const officialYearRows = papersForYearMeta(await loadOfficialPapersMeta(exam.id), yearNum);
  const officialMeta = officialYearRows.find((r) => r.kind !== "answer key") ?? null;
  // Soft-404 guard (26 Sep 2026): /exams/SSC_CGL/pyq/1999 and /pyq/2031
  // returned 200, self-canonical, "0 of 100, Solve Free" — an indexable page
  // promising a paper for any year. With no question and no official paper
  // row for the year the URL is a 404 (the page body does the same); with
  // only an official paper (or key) it renders the links, noindex,follow.
  // The title wording is unchanged (founder decision, 15 Sep 2026).
  if (held === 0 && officialYearRows.length === 0) notFound();
  const emptyYear = held === 0;
  const description = pyqYearDescription({
    short: exam.shortName,
    name: exam.name,
    year: yearNum,
    held,
    total: exam.totalQuestions,
    partial,
    officialPublisher: officialMeta?.publisher ?? null,
  });
  const url = `https://shishya.in/exams/${exam.code}/pyq/${year}`;
  // The per-exam social card (src/app/exams/[code]/opengraph-image.tsx).
  const ogImage = `https://shishya.in/exams/${exam.code}/opengraph-image`;
  return {
    title,
    description,
    alternates: { canonical: url },
    ...(emptyYear ? { robots: { index: false, follow: true } } : {}),
    keywords: [
      `${exam.shortName} ${year} question paper`,
      `${exam.shortName} ${year} previous year question paper`,
      `${exam.shortName} PYQ ${year}`,
      `${exam.shortName} PYQ-pattern practice`,
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
  // 16 Sep 2026: the body of this twin (/hi, /te) now carries the 15 Sep
  // both-names wording in the reader's language, with the same honesty —
  // "previous year paper" + "PYQ-pattern", the N-of-M depth, and "not the
  // original questions". generateMetadata stays English: this page
  // canonicalises every locale to the English URL.
  const lc = pyqCopyLocale(locale);
  const P = pyqYearCopy(lc);

  const exam = await prisma.exam.findUnique({ where: realExamKey({ code }) });
  // Inactive = seeded ahead of its question bank; not public yet.
  if (!exam || !exam.active) notFound();

  // The original paper, when the conducting body publishes it (14 Sep 2026):
  // linked to the body's own file, never reproduced (src/lib/official-papers.ts).
  const { loadOfficialPapers } = await import("@/lib/official-papers-db");
  // 25 Sep 2026: students on year pages ask for "the real 200 question
  // paper". The exam's full-length real-pattern mock (the hub's tile) and
  // the body's papers from other years are linked here too
  // (src/lib/pyq-full-paper.ts) — one extra small query, in parallel with the
  // page's own; the official rows are the same cached read as before.
  const [questions, fullPatternMocks, officialRows] = await Promise.all([
    prisma.question.findMany({
      where: { examId: exam.id, source: "PYQ", pyqYear: yearNum, validated: true },
      include: { topic: { include: { subject: true } } },
      orderBy: { id: "asc" },
    }),
    prisma.mock
      .findMany({
        where: { examId: exam.id, userId: null, generatedBy: { startsWith: FULL_PATTERN_PREFIX } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, generatedBy: true, questionIds: true, config: true, createdAt: true },
      })
      .catch(() => []),
    loadOfficialPapers(exam.id),
  ]);
  const fullMock = pickFullPatternMock(fullPatternMocks, exam);
  const official = pickOfficialPaperLinks(officialRows, yearNum);
  const officialForYear = official.sameYear;

  // 26 Sep 2026: no question and no official paper row for the year → 404
  // (it was a 200 "0 of 100" page for any year, 1999 or 2031). An official
  // paper alone keeps the page, noindex (generateMetadata).
  if (questions.length === 0 && officialForYear.length === 0) notFound();

  if (questions.length === 0) {
    return (
      <main className="min-h-screen bg-ink-50/40">
        <Header />
        <section className="container-prose py-10">
          <p className="text-xs text-ink-500">
            <Link href={`/exams/${code}`} className="hover:text-ink-800">{exam.shortName}</Link> · {P.crumb} · {yearNum}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink-900">{exam.shortName} — {yearNum}</h1>
          <p className="mt-3 rounded-md border border-dashed border-ink-300 bg-white px-4 py-5 text-sm text-ink-500">
            {t("exam.pyq.empty")}
          </p>
          <OfficialYearPapers rows={officialForYear} year={yearNum} locale={locale} />
          <WholePaperLinks
            fullMock={fullMock}
            official={official}
            examCode={exam.code}
            examShortName={exam.shortName}
            locale={locale}
          />
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
  const modelled = fillPyq(P.modelled, { n: questions.length, year: yearNum, m: exam.totalQuestions });
  // The structured data below stays English in every locale (inLanguage
  // "en-IN", canonical → the English URL), so its sentence is built from the
  // English copy — a Hindi clause inside an English FAQ answer is noise to
  // an answer engine (16 Sep 2026).
  const modelledEn = fillPyq(pyqYearCopy("en").modelled, { n: questions.length, year: yearNum, m: exam.totalQuestions });
  // A question paper only (25 Sep 2026): the fallback to officialForYear[0]
  // handed an answer key to the FAQ note below as "the original paper".
  const officialPaper = officialForYear.find(isQuestionPaper) ?? null;
  // "Ask Shishya — your free AI tutor — …", split at the first "Shishya".
  const tutorBodyParts = fillPyq(P.tutorBody, { short: exam.shortName, year: yearNum }).split("Shishya");
  // A real question paper (not only an answer key) for this year.
  const hasOfficialQuestionPaper = official.sameYearHasPaper;
  // A key-only year is named as the answer key, like the visible heading.
  const officialPaperNote = officialYearFaqNote(officialForYear, yearNum);

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
    headline: pyqYearHeadline({
      short: exam.shortName,
      year: yearNum,
      held: questions.length,
      total: exam.totalQuestions,
      partial,
      hasOfficialPaper: hasOfficialQuestionPaper,
    }),
    name: `${exam.shortName} ${yearNum} PYQ — previous year paper practice`,
    description: pyqYearDescription({
      short: exam.shortName,
      name: exam.name,
      year: yearNum,
      held: questions.length,
      total: exam.totalQuestions,
      partial,
      officialPublisher: officialPaper?.publisher ?? null,
    }),
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
        name: `Where can I solve the ${exam.shortName} ${yearNum} previous year paper (PYQ) free online?`,
        acceptedAnswer: {
          "@type": "Answer",
          text:
            `At ${pageUrl} you can solve ${exam.shortName} ${modelledEn} free. Shishya does not reproduce the original paper: every question is freshly worded in that year's pattern — same topics, style and difficulty, new wording and numbers` +
            (partial ? `, and this set covers ${questions.length} of the paper's ${exam.totalQuestions} questions, not the whole paper` : ", at the real paper's full length") +
            `. They run as a timed mock with instant scoring, step-by-step solutions and topic-wise weak-area analysis. No fee and no coaching enrolment needed.` +
            officialPaperNote,
        },
      },
      {
        "@type": "Question",
        name: `Are these the actual ${exam.shortName} ${yearNum} paper questions?`,
        acceptedAnswer: {
          "@type": "Answer",
          // + the full-length real-pattern mock (25 Sep 2026), with its own size.
          text: `No. They are PYQ-pattern questions modelled on the ${exam.shortName} ${yearNum} paper — freshly worded practice questions in the same pattern, not the original questions, which Shishya does not reproduce. The page shows how many questions it holds (${questions.length}) against the real paper's length (${exam.totalQuestions}).${officialPaperNote}${fullMockFaqNote(fullMock, exam.code)}`,
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
        <h1 className="mt-1 text-3xl font-bold text-ink-900">{pyqYearH1(exam.shortName, yearNum, hasOfficialQuestionPaper, lc)}</h1>
        <p className="mt-1 text-sm text-ink-600">
          {/* "20 PYQ-pattern questions modelled on the 2023 paper (which
              had 150) · 60 minutes" — the student knows exactly what they
              are getting before they start. Built from pyq-year-copy.ts in
              every locale (16 Sep 2026), never from the i18n line
              exam.pyq.partialLine, which still says "previous-year
              questions" — the claim this page must not make. */}
          {modelled} · {exam.durationMin} {t("exam.minutes")}
        </p>
        <p className="mt-2 max-w-3xl text-xs text-ink-500">{fillPyq(P.freshNote, { year: yearNum })}</p>
        <StateExamsLink state={exam.state} label={t("exam.state.more")} locale={locale} />
        <OfficialYearPapers rows={officialForYear} year={yearNum} locale={locale} />
        {/* The whole paper (25 Sep 2026): the full-length real-pattern mock
            and, when this year has no official paper, other years' — beside
            the set, never renaming it. Nothing renders when neither exists. */}
        <WholePaperLinks
          fullMock={fullMock}
          official={official}
          examCode={exam.code}
          examShortName={exam.shortName}
          locale={locale}
        />

        <div className="mt-4">
          <ShareExamButton
            url={`https://shishya.in/exams/${code}/pyq/${yearNum}`}
            message={fillPyq(partial ? P.sharePartial : P.shareFull, { short: exam.shortName, year: yearNum, modelled })}
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
                    ? fillPyq(P.ctaPartial, { n: questions.length, year: yearNum })
                    : fillPyq(P.ctaFull, { year: yearNum })}
                </p>
                <p className="mt-0.5 text-xs text-ink-500">{fillPyq(P.ctaBody, { modelled })}</p>
              </div>
              <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(`/exams/${code}/pyq/${yearNum}`)}`}
                  className="btn-primary text-center"
                >
                  {P.ctaSignIn}
                </Link>
                <Link
                  href={`/exams/${code}/quiz`}
                  className="text-center text-xs font-semibold text-saffron-700 underline-offset-2 hover:underline"
                >
                  {P.ctaQuiz}
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
                    are the paper's; `modelled` (pyq-year-copy.ts, every
                    locale) does not. */}
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
              <StartFullMockButton locale={locale}
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
          <p className="text-sm font-semibold text-ink-900">{P.tutorHeading}</p>
          <p className="mt-1 text-sm text-ink-600">
            {/* "Shishya" stays bold, as it was: the sentence is split at the
                product name, which is Latin in every locale. */}
            {tutorBodyParts[0]}
            {tutorBodyParts.length > 1 && <strong>Shishya</strong>}
            {tutorBodyParts.slice(1).join("Shishya")}
          </p>
          <Link
            rel="nofollow" href={`/chat?examCode=${code}&seed=${encodeURIComponent(
              fillPyq(P.tutorSeed, { short: exam.shortName, year: yearNum }),
            )}`}
            prefetch={false}
            className="btn-primary mt-4 !py-2 !px-4 text-sm"
          >
            {P.tutorButton}
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
            prompt={fillPyq(P.pulsePrompt, { short: exam.shortName, year: yearNum, n: questions.length, m: exam.totalQuestions })}
            chips={[P.pulseYes, P.pulseEnough]}
            signedIn={!!userId}
            examCode={exam.code}
          />
        )}
      </section>
    </main>
  );
}
