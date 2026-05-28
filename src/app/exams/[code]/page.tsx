// /exams/:code — exam landing page (bilingual, SEO-indexable).
//
// PUBLIC: this page renders fully for unauthenticated visitors (Google,
// Bing, students linked from search) so it gets crawled and ranked for
// queries like "RRB NTPC syllabus" or "SSC CGL previous year papers".
// Interactive parts (Start Mock, Ask Shishya, Score Boost rail, Weakness
// map, Recent attempts) are gated behind a Sign-in CTA so we keep the
// auth model clean without blocking the crawler.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { RankLadder } from "@/components/RankCard";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getExamShared } from "@/lib/db/exam-cache";
import { getT } from "@/lib/i18n-server";
import { StartMockButton } from "./StartMockButton";
import { PageTour } from "@/components/PageTour";
import { formatDisplayScorePct } from "@/lib/scoring";
import { computeScoreBoost } from "@/lib/focus-topics";
import { ScholarshipsForExamSection } from "@/components/ScholarshipsForExamSection";
import { CollegesForExamSection } from "@/components/CollegesForExamSection";
import { SectionVerificationSummary } from "@/components/VerificationBadge";
import { ExamDeepContentBlock } from "@/components/ExamDeepContentBlock";
import { findDeepContent, hasDeepContent } from "@/data/exam-deep-content";
import { getExamTheme } from "@/lib/exam-theme";

// Per-exam meta. Beefed-up version that bakes in:
//   1. state name (for "Tamil Nadu PSC" / "तमिलनाडु TET" style searches)
//   2. native-script + English language coverage (for "TNPSC in Tamil" type
//      long-tail queries, which is most of the high-intent India traffic)
//   3. current year (2026 — refreshed annually by the title template)
//   4. JSON-LD Course schema is added inline in the page body further down
//
// Goal: rank for every plausible spelling of every one of 163 exams in
// every Indian language a student would type in.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const exam = await prisma.exam.findUnique({
    where: { code },
    select: {
      code: true, name: true, shortName: true, description: true,
      category: true, state: true, languages: true,
    },
  });
  if (!exam) return { title: "Exam not found — Shishya" };

  const { stateInfo, languageList, languageName } = await import("@/lib/state-info");
  const st = stateInfo(exam.state);
  const langs = exam.languages.length > 0 ? exam.languages : ["EN", "HI"];
  const year = new Date().getUTCFullYear();

  // Title — prioritises state name for state exams (huge SEO lever for
  // "Tamil Nadu TET 2026" / "Bihar Police mock test"-style searches).
  const stateBit = st ? ` (${st.name})` : "";
  const title = `${exam.shortName}${stateBit} ${year} — Free Mock Tests, PYQ, Syllabus | Shishya`;

  // Description — packs in: exam full name, state name (English + Hindi
  // + native script), the languages the questions are available in, and
  // the year. ≤300 chars so Google doesn't truncate.
  const langCopy = languageList(langs);
  const stateCopy = st ? `${st.name} (${st.nativeName} / ${st.hindiName}). ` : "";
  const description =
    `Free ${exam.shortName} (${exam.name}) ${year} mock tests, previous year papers ` +
    `and study help — verified by students who cleared it. ${stateCopy}Questions available in ${langCopy}. No paywall.`;

  // Keywords — a wide net mixing English, native-script state name, exam
  // name in native script (transliteration via state's hindi/native name),
  // and the standard long-tail phrases students actually type.
  const baseKeywords = [
    `${exam.shortName} syllabus`,
    `${exam.shortName} mock test`,
    `${exam.shortName} mock test ${year}`,
    `${exam.shortName} previous year papers`,
    `${exam.shortName} PYQ`,
    `${exam.shortName} preparation`,
    `${exam.shortName} free mocks`,
    `${exam.shortName} online test`,
    `${exam.shortName} ${year}`,
    `${exam.name}`,
    `Shishya ${exam.shortName}`,
  ];
  const stateKeywords = st ? [
    `${st.name} entrance exams`,
    `${st.name} government exams`,
    `${st.nativeName} ${exam.shortName}`,
    `${st.hindiName} ${exam.shortName}`,
    `${exam.shortName} ${st.name} ${year}`,
    `${st.name} state exam mock test`,
  ] : [];
  const langKeywords = langs.flatMap((l) => {
    const ln = languageName(l);
    return [
      `${exam.shortName} in ${ln.en}`,
      `${exam.shortName} mock test in ${ln.en}`,
      `${exam.shortName} ${ln.native}`,
    ];
  });

  const url = `https://shishya.in/exams/${exam.code}`;
  return {
    title,
    description: description.slice(0, 300),
    alternates: { canonical: url },
    keywords: [...baseKeywords, ...stateKeywords, ...langKeywords],
    openGraph: {
      title,
      description: description.slice(0, 300),
      url,
      siteName: "Shishya",
      locale: "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: description.slice(0, 200),
    },
  };
}

export default async function ExamPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const { code } = await params;
  const { locale, t } = await getT();

  // Shared payload — cached by unstable_cache for EXAM_CACHE_TTL seconds.
  // First request after a content change pays the DB cost; everyone else
  // gets it from Next's data cache. Drops a hot /exams/[code] TTFB from
  // ~2-3s to ~50-200ms.
  const shared = await getExamShared(code);
  if (!shared) notFound();
  const {
    exam,
    validatedQuestionCount,
    newsItems,
    importantDates,
    pyqYears,
    systemMocks,
    leaderboard,
    rankBands,
  } = shared;

  // Per-category visual theme. The brand saffron stays as the primary
  // CTA colour everywhere on the page (buttons, score boost rail) —
  // this theme drives the secondary accent surfaces so an engineering
  // student walking into JEE feels electric-blue, a medical student
  // into NEET feels emerald, etc. See src/lib/exam-theme.ts.
  const theme = getExamTheme(exam.category);

  // User-specific queries — only run when authenticated. Defaults to empty so
  // unauth render path stays simple. Crawlers never trigger these.
  //
  // We SERIALIZE these 4 queries rather than Promise.all-ing them: the
  // pooled pgbouncer connection_limit=1 makes concurrent queries queue,
  // and when /exams/[code] is prefetched 10+ times in parallel (one per
  // visible dashboard card), the queue overflows the 10s pool timeout
  // and pages take 20+ seconds. Sequential is +200-400ms in isolation
  // but avoids pile-up entirely.
  // Fire EVERY user-specific query in parallel — including
  // computeScoreBoost which itself fans out into 5 more parallel
  // queries. Connection_limit=5 on the pool means these all complete
  // in ~max(query_time) instead of the old sum() wall clock. We
  // speculate on scoreBoost for any signed-in user; if they turn out
  // to be unenrolled we just discard the result (1 wasted query, not
  // worth gating sequentially).
  const [enrollment, weakness, recent, myBest, speculativeScoreBoost] = userId
    ? await Promise.all([
        prisma.enrollment.findUnique({
          where: { userId_examId: { userId, examId: exam.id } },
        }),
        prisma.weaknessMap.findMany({
          where: { userId, examId: exam.id },
          include: { topic: true },
          orderBy: { masteryScore: "asc" },
          take: 5,
        }),
        prisma.attempt.findMany({
          where: {
            userId,
            mock: { examId: exam.id },
            status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
          },
          include: { mock: true },
          orderBy: { startedAt: "desc" },
          take: 5,
        }),
        prisma.attempt.findFirst({
          where: {
            userId,
            mock: { examId: exam.id },
            status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
            scorePct: { not: null },
          },
          orderBy: { scorePct: "desc" },
          select: { id: true, scorePct: true, percentile: true, rank: true, finishedAt: true },
        }),
        computeScoreBoost(userId, exam.id).catch(() => null),
      ])
    : ([null, [], [], null, null] as const);

  const isEnrolled = !!enrollment;
  const hasContent = validatedQuestionCount > 0;
  // Discard speculative score boost when user isn't enrolled — no UI uses it.
  const scoreBoost = isEnrolled ? speculativeScoreBoost : null;

  // JSON-LD structured data — helps Google show this page as a rich
  // Course result with breadcrumb. Built from public exam data only.
  // For state exams we add an `about` field (state name) and a 4-step
  // breadcrumb that includes the state index page, giving Google a clear
  // hierarchy: Home → Exams → State → Specific exam.
  const { stateInfo: lookupState } = await import("@/lib/state-info");
  const stateInfo2 = lookupState(exam.state);
  const courseJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: `${exam.shortName}${stateInfo2 ? ` (${stateInfo2.name})` : ""} — Free Mock Tests, Syllabus & Study Help`,
    description: exam.description ?? `${exam.name} preparation on Shishya — free expert-curated mocks, previous year papers, and study help verified by students who cleared the same path.`,
    provider: {
      "@type": "EducationalOrganization",
      name: "Shishya",
      url: "https://shishya.in",
    },
    educationalLevel: "Entrance Exam",
    inLanguage: exam.languages ?? ["en"],
    url: `https://shishya.in/exams/${exam.code}`,
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "Online",
      courseWorkload: `PT${exam.durationMin}M`,
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      url: `https://shishya.in/exams/${exam.code}`,
    },
  };
  if (stateInfo2) {
    courseJsonLd.about = {
      "@type": "AdministrativeArea",
      name: stateInfo2.name,
      alternateName: [stateInfo2.nativeName, stateInfo2.hindiName],
    };
  }
  const { stateSlug } = await import("@/lib/state-info");
  const breadcrumbItems: Array<Record<string, unknown>> = [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
    { "@type": "ListItem", position: 2, name: "Exams", item: "https://shishya.in/exams" },
  ];
  if (stateInfo2) {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 3,
      name: `${stateInfo2.name} exams`,
      item: `https://shishya.in/exams/state/${stateSlug(stateInfo2.code)}`,
    });
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 4,
      name: exam.shortName,
      item: `https://shishya.in/exams/${exam.code}`,
    });
  } else {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 3,
      name: exam.shortName,
      item: `https://shishya.in/exams/${exam.code}`,
    });
  }
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems,
  };

  return (
    // Whole-page background tinted to the category theme. This is the
    // single biggest visual differentiator — walking from NEET (emerald
    // wash) into JEE (blue wash) into UPSC (rose wash) feels like
    // moving between different rooms. Saffron CTAs / cards stay on top
    // of the wash so the brand remains intact.
    <main className={`min-h-screen ${theme.pageBg}`}>
      {/* JSON-LD for Google rich-result eligibility */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Header />
      {/* Per-category top ribbon — 6px coloured strip that immediately
          signals which "track" the visitor is in (engineering blue,
          medical green, civil-services red, etc). Saffron remains the
          brand colour beneath the ribbon. */}
      <div className={`h-1.5 w-full ${theme.ribbon}`} aria-hidden />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/dashboard" className="hover:text-ink-800">{t("nav.dashboard")}</Link> · {t("nav.exams")} · {exam.shortName}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {/* Category badge — pill above the title that mirrors the
              ribbon's hue. Tells the visitor at a glance which
              category this exam falls into, without forcing them to
              scroll/search for it. */}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${theme.badge}`}
          >
            <span aria-hidden>{theme.icon}</span>
            {theme.label}
          </span>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-ink-900">{exam.shortName}</h1>
        <p className="mt-1 text-sm text-ink-600">{exam.name}</p>
        <p className="mt-4 max-w-3xl text-sm text-ink-700">{exam.description}</p>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-ink-600">
          <span className="rounded-full bg-white border border-ink-200 px-3 py-1">{exam.totalQuestions} {t("exam.totalQs")}</span>
          <span className="rounded-full bg-white border border-ink-200 px-3 py-1">{exam.totalMarks} {t("exam.marks")}</span>
          <span className="rounded-full bg-white border border-ink-200 px-3 py-1">{exam.durationMin} {t("exam.minutes")}</span>
          <span className="rounded-full bg-white border border-ink-200 px-3 py-1">
            {t("exam.negative")}: {exam.negativeMark === 0 ? t("exam.no.negative") : `−${formatNegativeMark(exam.negativeMark)}`}
          </span>
        </div>

        {/* Single section-level verification badge covers the static
            exam meta above (pattern, duration, marks). Once per-fact
            verification rows ship in Phase 2 each chip will get its
            own badge. */}
        <SectionVerificationSummary
          status="ai"
          source="official exam authority notification"
          refreshCadence="weekly"
        />

        {/* Sign-in CTA banner for unauthenticated visitors. Crawlers see
            this; search-arriving students see exactly what they get for free.
            Border + background take their colour from the per-category theme
            so the CTA feels native to the exam track (blue for engineering,
            green for medical, etc) rather than a generic saffron pop-out. */}
        {!userId && (
          <div className={`mt-6 rounded-md border p-5 ${theme.borderAccent} ${theme.heroTint}`}>
            <p className="text-sm font-semibold text-ink-900">
              Free {exam.shortName} preparation on Shishya
            </p>
            <p className="mt-1 text-sm text-ink-700">
              Take expert-curated mocks, practise previous year papers, and Ask{" "}
              <strong>Shishya</strong> when you&apos;re stuck — verified by
              students who cleared the same path. All free, no credit card.
              Sign in with Google to begin.
            </p>
            <Link
              href={`/login?callbackUrl=/exams/${exam.code}`}
              className="btn-primary mt-3 inline-block !py-2 !px-4 text-sm"
            >
              Sign in to start →
            </Link>
          </div>
        )}

        {/* Action panel */}
        <div className="mt-8 rounded-md border border-ink-200 bg-white p-6">
          {!hasContent ? (
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink-600">{t("exam.no.content")}</p>
              <Link href={`/chat?examCode=${exam.code}`} className="btn-secondary !py-2 !px-4 text-xs sm:text-sm">
                {t("nav.tutor")}
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink-900">
                  {isEnrolled ? t("exam.action.continue") : t("exam.action.start")}
                </p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {isEnrolled ? t("exam.action.continue.body") : t("exam.action.start.body")}
                </p>
              </div>
              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <Link
                  href={`/chat?examCode=${exam.code}`}
                  data-tour="exam-ask"
                  className="btn-secondary !py-2 !px-4 text-xs sm:text-sm"
                >
                  {t("nav.tutor")}
                </Link>
                <span data-tour="exam-start-mock">
                  <StartMockButton
                    examCode={exam.code}
                    hasHistory={isEnrolled && recent.length > 0}
                    labels={{
                      adaptive: t("exam.cta.adaptive"),
                      diagnostic: t("exam.cta.diagnostic"),
                      firstDiagnostic: t("exam.cta.firstDiagnostic"),
                      building: t("exam.cta.building"),
                    }}
                  />
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Deep content (eligibility / cutoffs / paper analysis / salary)
            ───────────────────────────────────────────────────────────
            Per-exam high-intent SEO content. Renders only when authored
            for this exam (see src/data/exam-deep-content.ts). Sits ABOVE
            the interactive PYQ/Mocks panel so organic-search arrivals
            see the answer to their query before the CTA wall. */}
        {(() => {
          const deep = findDeepContent(exam.code);
          if (!deep || !hasDeepContent(deep)) return null;
          return <ExamDeepContentBlock content={deep} examShortName={exam.shortName} />;
        })()}

        <div className="mt-2 lg:grid lg:grid-cols-3 lg:gap-8">
        <div className="lg:col-span-2 min-w-0">

        {/* ── Previous Papers ─────────────────────────────────────────── */}
        <section id="pyqs" className="mt-10 scroll-mt-20">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-ink-800">{t("exam.pyq.title")}</h2>
            <span className="text-xs text-ink-500">
              {pyqYears.reduce((a, r) => a + r._count, 0)} {t("exam.pyq.totalQs")}
            </span>
          </div>
          {pyqYears.length === 0 ? (
            <p className="mt-3 rounded-md border border-dashed border-ink-300 bg-white px-4 py-5 text-sm text-ink-500">
              {t("exam.pyq.empty")}
            </p>
          ) : (
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {pyqYears.map((y) => (
                <li key={y.pyqYear ?? 0} className="rounded-md border border-ink-200 bg-white p-3">
                  <p className="text-lg font-semibold text-ink-900">{y.pyqYear}</p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {y._count} {t("exam.pyq.questions")}
                  </p>
                  <Link
                    href={`/exams/${exam.code}/pyq/${y.pyqYear}`}
                    className="mt-2 inline-block text-xs font-medium text-saffron-700 hover:text-saffron-800"
                  >
                    {t("exam.pyq.take")} →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Mock Tests ──────────────────────────────────────────────── */}
        <section id="mocks" className="mt-10 scroll-mt-20">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-ink-800">{t("exam.mocks.title")}</h2>
            <Link
              href={`/exams/${exam.code}/attempts`}
              className="text-xs font-medium text-saffron-700 hover:text-saffron-800"
            >
              {t("exam.mocks.allAttempts")} →
            </Link>
          </div>
          <p className="mt-1 text-xs text-ink-500">{t("exam.mocks.langHint")}</p>
          {systemMocks.length === 0 ? (
            <p className="mt-3 rounded-md border border-dashed border-ink-300 bg-white px-4 py-5 text-sm text-ink-500">
              {t("exam.mocks.empty")}
            </p>
          ) : (
            // Mocks live inside the lg:col-span-2 main column (2/3 of
            // container-prose, ~830px at common laptop widths). A
            // 3-col grid here squeezes each tile to ~260px which
            // wrapped longer mock titles awkwardly. Hold at 2-col
            // until xl (1280px+) where the main column reaches
            // ~960px and 3 columns have proper breathing room.
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {systemMocks.map((m) => (
                <li key={m.id} className="rounded-md border border-ink-200 bg-white p-4">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-medium text-ink-900">{m.title}</p>
                    <span className="rounded-full border border-ink-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-600">
                      {m.type}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-500">
                    {m.questionIds.length} {t("exam.pyq.questions")}
                    {(m.config as any)?.durationMin ? ` · ${(m.config as any).durationMin} ${t("exam.minutes")}` : ""}
                  </p>
                  <Link
                    href={`/mocks/${m.id}`}
                    prefetch={false}
                    className="mt-2 inline-block text-xs font-medium text-saffron-700 hover:text-saffron-800"
                  >
                    {t("exam.mocks.take")} →
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {recent.length > 0 && (
            <div className="mt-5">
              <h3 className="text-xs font-medium uppercase tracking-wide text-ink-500">
                {t("exam.mocks.recent")}
              </h3>
              <ul className="mt-2 space-y-1.5">
                {recent.slice(0, 5).map((a) => (
                  <li key={a.id} className="flex items-center justify-between rounded-md border border-ink-200 bg-white px-3 py-2 text-sm">
                    <span className="text-ink-800">{a.mock.title}</span>
                    <span className="flex items-center gap-3 text-xs text-ink-500">
                      <span>{formatDisplayScorePct(a.scorePct)}</span>
                      <Link href={`/attempts/${a.id}/results`} prefetch={false} className="font-medium text-saffron-700 hover:text-saffron-800">
                        {t("exam.mocks.review")} →
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ── Rank & Leaderboard ──────────────────────────────────────── */}
        <section id="rank" className="mt-10 scroll-mt-20">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-ink-800">{t("exam.rank.title")}</h2>
            <span className="text-xs text-ink-500">{t("exam.rank.subtitle")}</span>
          </div>
          {!myBest ? (
            <p className="mt-3 rounded-md border border-dashed border-ink-300 bg-white px-4 py-5 text-sm text-ink-500">
              {t("exam.rank.empty")}
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-saffron-300 bg-saffron-50 p-4">
                <p className="text-xs uppercase tracking-wide text-saffron-800">{t("exam.rank.bestScore")}</p>
                <p className="mt-1 text-3xl font-bold text-ink-900 tabular-nums">{formatDisplayScorePct(myBest.scorePct)}</p>
              </div>
              <div className="rounded-md border border-ink-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-ink-500">{t("exam.rank.percentile")}</p>
                <p className="mt-1 text-3xl font-bold text-ink-900 tabular-nums">
                  {myBest.percentile?.toFixed(1) ?? "—"}
                </p>
              </div>
              <div className="rounded-md border border-ink-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-ink-500">{t("exam.rank.rank")}</p>
                <p className="mt-1 text-3xl font-bold text-ink-900 tabular-nums">
                  {myBest.rank ? `#${myBest.rank}` : "—"}
                </p>
              </div>
            </div>
          )}

          {leaderboard.length > 0 && (
            <div className="mt-5 overflow-hidden rounded-md border border-ink-200 bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-ink-200 bg-ink-50/60 text-left text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="w-14 px-4 py-2 font-medium">#</th>
                    <th className="px-4 py-2 font-medium">{t("exam.rank.student")}</th>
                    <th className="px-4 py-2 text-right font-medium">{t("exam.rank.score")}</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row, idx) => {
                    const display = displayName(row.user?.name, row.userId);
                    const isMe = row.userId === userId;
                    return (
                      <tr
                        key={row.id}
                        className={`border-b border-ink-100 last:border-b-0 ${isMe ? "bg-saffron-50/40" : ""}`}
                      >
                        <td className="px-4 py-2 tabular-nums text-ink-600">{idx + 1}</td>
                        <td className="px-4 py-2 text-ink-800">
                          {display}
                          {isMe && <span className="ml-2 rounded-full bg-saffron-200 px-2 py-0.5 text-[10px] font-medium text-saffron-900">{t("exam.rank.you")}</span>}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatDisplayScorePct(row.scorePct)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Performance Analysis ────────────────────────────────────── */}
        {recent.length > 0 && (
          <section id="analysis" className="mt-10 scroll-mt-20">
            <h2 className="text-base font-semibold text-ink-800">{t("exam.analysis.title")}</h2>
            <p className="mt-1 text-sm text-ink-600">{t("exam.analysis.body")}</p>

            {/* Score-over-time mini-chart (text + bars) */}
            <div className="mt-4 rounded-md border border-ink-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                {t("exam.analysis.lastFive")}
              </p>
              <ul className="mt-3 space-y-2">
                {[...recent].reverse().map((a) => {
                  const pct = Math.max(0, a.scorePct ?? 0);
                  return (
                    <li key={a.id} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-xs text-ink-500">
                        {a.startedAt.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                      </span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                        <div
                          className="h-full bg-saffron-500"
                          style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
                        />
                      </div>
                      <span className="w-14 shrink-0 text-right text-sm font-medium tabular-nums text-ink-800">
                        {formatDisplayScorePct(a.scorePct)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs text-ink-500">
                {t("exam.analysis.trend")}:{" "}
                <span className="font-medium text-ink-700">{describeTrend(recent.map((a) => a.scorePct ?? 0))}</span>
              </p>
            </div>
          </section>
        )}

        {/* ── Rank ladder — full score→rank→outcome map for this exam.
            Public so signed-out visitors see what's achievable, which is
            a big motivator for landing-page conversions. */}
        {rankBands.length > 0 && (
          <section className="mt-10">
            <RankLadder
              examShortName={exam.shortName}
              bands={rankBands}
              source={rankBands[0]?.source ?? null}
            />
          </section>
        )}

        {/* News + Important Dates */}
        {(newsItems.length > 0 || importantDates.length > 0) && (
          <section className="mt-10">
            {/* "See older updates" link → archive page. Surfacing it
                here (above the news/dates panel) so students who
                want last year's postponement notice or prior cutoff
                trajectories find their way in one click. */}
            <div className="mb-3 flex items-center justify-between">
              <h2 className="sr-only">News & timeline</h2>
              <Link
                href={`/exams/${exam.code}/archive`}
                prefetch={false}
                className="ml-auto text-xs font-medium text-saffron-700 hover:text-saffron-800"
              >
                See older updates →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* News */}
            <div>
              <h2 className="text-base font-semibold text-ink-800">{t("timeline.news.title")}</h2>
              {newsItems.length === 0 ? (
                <p className="mt-3 rounded-md border border-dashed border-ink-300 bg-white px-4 py-5 text-sm text-ink-500">
                  {t("timeline.news.empty")}
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {newsItems.map((n) => {
                    // unstable_cache serialises Date objects to ISO
                    // strings on cache hits, so we always coerce.
                    const publishedAt = new Date(n.publishedAt as unknown as string | Date);
                    const ageDays = Math.floor((Date.now() - publishedAt.getTime()) / (24 * 60 * 60 * 1000));
                    return (
                      <li key={n.id} className="rounded-md border border-ink-200 bg-white p-4">
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="text-sm font-semibold text-ink-900">{n.title}</h3>
                          <span className="shrink-0 text-xs text-ink-500">
                            {ageDays === 0 ? t("timeline.dates.today")
                              : ageDays === 1 ? `1 ${t("disc.daysAgo")}`
                              : `${ageDays} ${t("disc.daysAgo")}`}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm text-ink-700">{n.body}</p>
                        {n.source && (
                          <a
                            href={n.source}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-block text-xs font-medium text-saffron-700 hover:text-saffron-800"
                          >
                            Source →
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Important Dates */}
            <div>
              <h2 className="text-base font-semibold text-ink-800">{t("timeline.dates.title")}</h2>
              {importantDates.length === 0 ? (
                <p className="mt-3 rounded-md border border-dashed border-ink-300 bg-white px-4 py-5 text-sm text-ink-500">
                  {t("timeline.dates.empty")}
                </p>
              ) : (
                <ol className="mt-3 space-y-2">
                  {importantDates.map((d) => {
                    // Same Date deserialisation guard as newsItems above.
                    const dateObj = new Date(d.date as unknown as string | Date);
                    const days = Math.ceil((dateObj.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
                    const passed = days < 0;
                    let when: string;
                    if (passed) when = t("timeline.dates.passed");
                    else if (days === 0) when = t("timeline.dates.today");
                    else if (days === 1) when = t("timeline.dates.tomorrow");
                    else when = `${days} ${t("timeline.dates.daysAway")}`;
                    return (
                      <li
                        key={d.id}
                        className={
                          d.isExamDay
                            ? `rounded-md border-2 p-4 ${theme.borderAccent} ${theme.examDayBg}`
                            : passed
                            ? "rounded-md border border-ink-200 bg-ink-50/40 p-4 opacity-60"
                            : "rounded-md border border-ink-200 bg-white p-4"
                        }
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-medium text-ink-900">
                            {d.isExamDay && <span className="mr-1">{theme.icon}</span>}
                            {d.label}
                          </p>
                          <span className={d.isExamDay ? `shrink-0 text-xs font-semibold ${theme.examDayText}` : "shrink-0 text-xs text-ink-500"}>
                            {when}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-ink-500">
                          {dateObj.toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                        </p>
                        {d.notes && <p className="mt-1.5 text-xs text-ink-600">{d.notes}</p>}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
            </div>{/* /grid news+dates */}
          </section>
        )}

        {/* Weakness map */}
        {weakness.length > 0 && (
          <section className="mt-10">
            <h2 className="text-base font-semibold text-ink-800">{t("exam.weakest")}</h2>
            <ul className="mt-3 space-y-2">
              {weakness.map((w) => (
                <li key={w.id}>
                  <Link
                    href={`/chat?examCode=${exam.code}&topicCode=${encodeURIComponent(w.topic.code)}&seed=${encodeURIComponent(`I'm weak in ${w.topic.name} for ${exam.shortName}. Tutor me on this topic.`)}`}
                    className="block rounded-md border border-ink-200 bg-white p-3 hover:border-saffron-400 hover:bg-saffron-50/30"
                  >
                    <div className="flex items-baseline justify-between">
                      <p className="text-sm font-medium text-ink-900">{w.topic.name}</p>
                      <p className="text-xs text-ink-500">
                        {w.correctCount}/{w.attemptsCount}
                      </p>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                      <div
                        className="h-full bg-saffron-500"
                        style={{ width: `${Math.round(w.masteryScore * 100)}%` }}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Syllabus */}
        <section id="syllabus" data-tour="exam-syllabus" className="mt-10 scroll-mt-20">
          <h2 className="text-base font-semibold text-ink-800">{t("exam.syllabus")}</h2>
          <p className="mt-1 text-xs text-ink-500">{t("exam.syllabus.clickHint")}</p>
          <div className="mt-4 space-y-6">
            {exam.subjects.map((s) => (
              <div key={s.id}>
                <h3 className="text-sm font-semibold text-ink-900">{s.name}</h3>
                <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {s.topics.map((tp) => (
                    <li
                      key={tp.id}
                      id={`syllabus-topic-${tp.code}`}
                      className="scroll-mt-24 syllabus-target"
                    >
                      <Link
                        href={`/exams/${exam.code}/topics/${tp.code}`}
                        className="group block rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-700 transition-colors hover:border-saffron-400 hover:bg-saffron-50/40"
                      >
                        <p className="font-medium text-ink-800 group-hover:text-saffron-800">{tp.name}</p>
                        {tp.description && (
                          <p className="mt-0.5 text-xs text-ink-500 line-clamp-2">{tp.description}</p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        </div>{/* /lg:col-span-2 */}

        {/* ── Right rail: Shishya helper (sticky on lg+) ─────────────────
            Replaces the previous inline Score Boost + Focus Topics +
            Shishya Interaction sections which were tucked far down the
            page. The rail follows the student as they scroll mocks / news
            / syllabus, so the quick-prompt CTAs and topic uplift never
            require a long scroll. */}
        <aside className="mt-10 lg:col-span-1 lg:mt-0 lg:sticky lg:top-20 lg:self-start space-y-4">

          {scoreBoost && scoreBoost.focusTopics.length > 0 && (
            <div className="rounded-md border border-saffron-200 bg-gradient-to-b from-saffron-50 to-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-saffron-800">
                {t("dash.boost.eyebrow")}
              </p>
              <h3 className="mt-1 text-sm font-semibold text-ink-900">
                {t("dash.boost.title.before")} {exam.shortName} {t("dash.boost.title.after")}
              </h3>

              {scoreBoost.latestScorePct != null && (
                <div className="mt-3 rounded-md border border-ink-200 bg-white px-3 py-2 text-xs">
                  <p className="text-ink-500">{t("dash.boost.latest")}</p>
                  <p className="mt-0.5">
                    <span className="text-base font-bold text-ink-900 tabular-nums">
                      {formatDisplayScorePct(scoreBoost.latestScorePct)}
                    </span>
                    {scoreBoost.currentRank && (
                      <span className="ml-2 text-ink-500">
                        · {t("dash.boost.rank")} #{scoreBoost.currentRank}
                        {scoreBoost.totalCohort > 1 && (
                          <span className="text-ink-400"> / {scoreBoost.totalCohort}</span>
                        )}
                      </span>
                    )}
                  </p>
                </div>
              )}

              <p className="mt-3 text-xs font-medium uppercase tracking-wider text-ink-500">
                {t("dash.boost.focusOn")}
              </p>
              <ul className="mt-2 space-y-1.5">
                {scoreBoost.focusTopics.map((ft) => (
                  <li key={ft.topicId}>
                    <div className="rounded-md border border-ink-200 bg-white p-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-xs font-medium text-ink-900">{ft.topicName}</p>
                        <p className="shrink-0 text-[11px] text-ink-500">
                          {Math.round(ft.currentMastery * 100)}%
                        </p>
                      </div>
                      <p className="mt-0.5 text-[11px] text-emerald-700">
                        +{ft.estimatedExtraMarks.toFixed(1)} {t("dash.focus.marks")}{" "}
                        <span className="text-ink-500">{t("dash.focus.uplift.atTarget")}</span>
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <a
                          href={`#syllabus-topic-${encodeURIComponent(ft.topicCode)}`}
                          className="rounded border border-saffron-300 bg-saffron-100 px-2 py-1 text-[11px] font-medium text-saffron-900 hover:bg-saffron-200"
                        >
                          {t("exam.focus.gotoSyllabus")} ↓
                        </a>
                        <Link
                          href={`/exams/${exam.code}/topics/${encodeURIComponent(ft.topicCode)}`}
                          className="rounded border border-ink-200 bg-white px-2 py-1 text-[11px] font-medium text-ink-700 hover:border-saffron-400"
                        >
                          {t("dash.focus.cta.study")}
                        </Link>
                        <Link
                          href={`/chat?examCode=${exam.code}&topicCode=${encodeURIComponent(ft.topicCode)}&seed=${encodeURIComponent(`I'm weak in ${ft.topicName} for ${exam.shortName}. Tutor me on this topic.`)}`}
                          className="rounded border border-ink-200 bg-white px-2 py-1 text-[11px] font-medium text-ink-700 hover:border-saffron-400"
                        >
                          {t("dash.focus.cta.ask")}
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-3 rounded-md bg-saffron-100 px-3 py-2 text-xs text-ink-800">
                <p>
                  <strong>{t("dash.boost.combined")}:</strong>{" "}
                  +{scoreBoost.combinedExtraMarks.toFixed(1)} {t("dash.focus.marks")}{" "}
                  <span className="text-ink-500">(+{scoreBoost.combinedExtraPct.toFixed(1)}%)</span>
                </p>
                {scoreBoost.projectedRank &&
                  scoreBoost.currentRank &&
                  scoreBoost.projectedRank < scoreBoost.currentRank && (
                    <p className="mt-1 text-emerald-800">
                      {t("dash.boost.rankUplift")} #{scoreBoost.currentRank} →{" "}
                      <strong>#{scoreBoost.projectedRank}</strong>
                    </p>
                  )}
                {scoreBoost.projectedScorePct != null && (
                  <p className="mt-1 text-ink-600">
                    {t("dash.boost.projected")}{" "}
                    <strong className="text-ink-900">
                      {formatDisplayScorePct(scoreBoost.projectedScorePct)}
                    </strong>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Shishya quick prompts — primary engagement surface, so it
              sits above the scholarships list. */}
          {hasContent && (
            <div id="shishya" className="scroll-mt-20 rounded-md border border-ink-200 bg-white p-4 shadow-sm">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-semibold text-ink-900">{t("exam.shishya.title")}</h3>
                <Link
                  href={`/chat?examCode=${exam.code}`}
                  className="text-xs font-medium text-saffron-700 hover:text-saffron-800"
                >
                  {t("exam.shishya.openChat")} →
                </Link>
              </div>
              <p className="mt-1 text-xs text-ink-600">{t("exam.shishya.body")}</p>
              <ul className="mt-3 space-y-1.5">
                {([
                  ["exam.shishya.prompt.weakest", `Quiz me on my weakest ${exam.shortName} topic`],
                  ["exam.shishya.prompt.explain", `Explain the concept I got wrong most in my last ${exam.shortName} mock`],
                  ["exam.shishya.prompt.plan", `Make me a 30-minute study plan for ${exam.shortName} today`],
                  ["exam.shishya.prompt.syllabus", `Walk me through the ${exam.shortName} syllabus and which topics carry highest weight`],
                ] as const).map(([labelKey, q]) => (
                  <li key={labelKey}>
                    <Link
                      href={`/chat?examCode=${exam.code}&seed=${encodeURIComponent(q)}`}
                      className="block rounded-md border border-ink-200 bg-white p-2.5 text-xs text-ink-800 hover:border-saffron-400 hover:bg-saffron-50/40"
                    >
                      <span className="block font-medium">{t(labelKey)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Scholarships for this exam — surfaced on every exam page so
              students who can't afford coaching see they qualify for funded
              schemes. Always rendered (no auth gate, no DB hit). */}
          <ScholarshipsForExamSection
            examCode={exam.code}
            examShortName={exam.shortName}
            examCategory={String(exam.category)}
            examState={null}
          />

          {/* Top NIRF colleges that admit via this exam — drives the
              "I'm preparing for X, where can I go?" intent into our
              colleges section. Pure server render, no DB hit. */}
          <CollegesForExamSection
            examCode={exam.code}
            examShortName={exam.shortName}
            examCategory={String(exam.category)}
          />

        </aside>

        </div>{/* /lg:grid */}
      </section>

      {/* First-visit coach-mark tour for the per-exam page. tourId is
          shared across all per-exam pages (`exam-v1`) — once a user
          has been guided through one exam's layout they don't need it
          again on another exam (the layout is identical). Steps point
          at the three primary actions: Start Mock, Ask Shishya, and
          the syllabus block. */}
      <PageTour
        tourId="exam-v1"
        steps={[
          {
            key: "exam-welcome",
            icon: "👋",
            title: `You're on ${exam.shortName}`,
            body: "Three things matter here — start a mock, ask Shishya if you're stuck, or browse the syllabus. Let me show you each.",
          },
          {
            key: "exam-start",
            anchor: "exam-start-mock",
            placement: "bottom",
            icon: "🎯",
            title: "Start an adaptive mock",
            body: "Tap this to begin. The first attempt is a diagnostic — Shishya uses it to spot your weak topics. Every next mock targets those.",
          },
          {
            key: "exam-ask",
            anchor: "exam-ask",
            placement: "bottom",
            icon: "💬",
            title: "Stuck on a topic? Ask Shishya",
            body: "Free AI tutor that knows this exam's syllabus + your mock history. Answers in English, Hindi, or your language.",
          },
          {
            key: "exam-syllabus",
            anchor: "exam-syllabus",
            icon: "📚",
            title: "Browse the syllabus",
            body: "Every topic is clickable — see PYQs, practice questions, and your mastery score per topic.",
          },
          {
            key: "exam-done",
            icon: "✓",
            title: "Take your first mock now",
            body: "Scroll back up and tap Start. 30 minutes, free, with full solutions after. Your weak topics get mapped automatically.",
          },
        ]}
      />
    </main>
  );
}

function displayName(name: string | null | undefined, userId: string): string {
  if (!name) return `Student #${userId.slice(-4).toUpperCase()}`;
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function describeTrend(scores: number[]): string {
  if (scores.length < 2) return "—";
  const first = scores[scores.length - 1];
  const last = scores[0];
  const delta = last - first;
  if (Math.abs(delta) < 1.5) return "stable";
  return delta > 0 ? `up ${delta.toFixed(1)}%` : `down ${Math.abs(delta).toFixed(1)}%`;
}

/**
 * Format the per-Q negative-mark value for display in the meta chip
 * row. Several exams store fractions as raw floats (e.g. UPSC = 1/3
 * → 0.6666666666666666) that read as garbage in the UI. We detect
 * the most common fraction forms and render them as "1/3", "1/4",
 * "2/3" etc; everything else rounds to 2 decimals.
 */
function formatNegativeMark(n: number): string {
  // Common UPSC/MPSC pattern: 1/3 per question wrong.
  if (Math.abs(n - 1 / 3) < 1e-6) return "1/3";
  if (Math.abs(n - 2 / 3) < 1e-6) return "2/3";
  // SSC + IBPS pattern: 0.25 / 0.50 / 0.75 — render as fractions for
  // readability, not as 0.25 marks.
  if (Math.abs(n - 0.25) < 1e-6) return "1/4";
  if (Math.abs(n - 0.5) < 1e-6) return "1/2";
  if (Math.abs(n - 0.75) < 1e-6) return "3/4";
  // Whole numbers (NEET = 1, JEE Adv = 1 or 2) render bare.
  if (Number.isInteger(n)) return String(n);
  // Everything else: 2-decimal display.
  return n.toFixed(2);
}
