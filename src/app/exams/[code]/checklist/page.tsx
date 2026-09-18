// /exams/[code]/checklist — the last-minute checklist, built from stored
// facts for every exam (13 Sep 2026).
//
// Before: the route rendered only the CHECKLIST phase article, which needs
// at least two scraped sources, so for most of the 178 exams students got
// "we compile it as the date nears" — while the exam-day row and its
// timings, the admit-card row and its reporting notes, the pattern, the
// sections, the languages and the official portal were already on our
// records. The exam-eve mail sent SBI PO students to the hub instead.
//
// Now the page is src/lib/exam-checklist.ts rendered: exam day (with its
// tier word; a passed estimate reads "was expected — not confirmed"), what
// to carry (universal items as fact, varying ones as "check your admit
// card"; olympiads state nothing as fact), admit card + notes, the pattern
// (negative marking only when markingSchemeStatable), the syllabus subjects
// (question counts only when the weights are counts — never a share from
// relative weights), languages, answer key / result status
// ("not announced yet" when the tracker holds nothing), the portal, and
// the things a visitor can keep (alert box, calendar file, share). Zero
// model calls — deterministic reads, cached.
//
// The CHECKLIST phase article, when a REAL one exists (isRealArticle: two
// cited sources, not a placeholder), renders below as an optional extra.
//
// Canonical is always the English URL — this route is not one of the
// measured twin surfaces (src/lib/twin-localisation.ts), so it emits no
// hreflang block and the metadata below stays English for every URL.
// The BODY is rendered in the reader's language (16 Sep 2026): getT()
// honours the /hi | /te URL prefix, then the cookie, then preferredLang,
// so a Hindi reader who follows the language switcher or an exam-eve mail
// link no longer lands on an English checklist.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import type { ArticleReaction } from "@prisma/client";
import { Header } from "@/components/Header";
import { ExamAlertBox } from "@/components/ExamAlertBox";
import { ShareExamButton } from "@/components/ShareExamButton";
import { ReactionButtons } from "@/components/exam-phase/ReactionButtons";
import { ShareButtons } from "@/components/exam-phase/ShareButtons";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { fillTemplate, type StringKey } from "@/lib/i18n";
import { alertPhase, examAlertLabels, getExamWeekInputs } from "@/lib/exam-week-inputs";
import { alertCopyPhase } from "@/lib/exam-week";
import {
  buildExamChecklist,
  examChecklistMeta,
  hasChecklist,
  patternSummary,
  type ChecklistT,
  type ChecklistDate,
  type ChecklistExam,
  type ChecklistInput,
  type ChecklistSubject,
  type ExamChecklist,
} from "@/lib/exam-checklist";
import { isRealArticle } from "@/lib/phase-article-quality";
import { examPageGates } from "@/lib/exam-page-gates";
import { renderMarkdown } from "@/lib/markdown";

interface ChecklistFacts {
  exam: ChecklistExam & { id: string };
  subjects: ChecklistSubject[];
  officialUrl: string | null;
  officialName: string | null;
  fullMockId: string | null;
  hasTricks: boolean;
}

/** Exam-level facts — change on seed / refresh, not per request. Tracker
 *  rows come from the shared 15-minute getExamWeekInputs cache. */
const loadChecklistFacts = unstable_cache(
  async (code: string): Promise<ChecklistFacts | null> => {
    const exam = await prisma.exam.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        name: true,
        shortName: true,
        category: true,
        description: true,
        durationMin: true,
        totalQuestions: true,
        scoredQuestions: true,
        totalMarks: true,
        marksPerQ: true,
        negativeMark: true,
        languages: true,
        active: true,
      },
    });
    // Inactive = seeded ahead of its question bank; not public yet.
    if (!exam || !exam.active) return null;
    const [subjects, eligibility, fullMock, tricks] = await Promise.all([
      prisma.subject
        .findMany({ where: { examId: exam.id }, orderBy: { orderIdx: "asc" }, select: { name: true, weight: true } })
        .catch(() => [] as ChecklistSubject[]),
      prisma.examEligibility
        .findUnique({ where: { examId: exam.id }, select: { officialUrl: true, officialName: true } })
        .catch(() => null),
      prisma.mock
        .findFirst({
          where: { examId: exam.id, userId: null, generatedBy: { startsWith: "system:full-pattern" } },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        })
        .catch(() => null),
      prisma.examTricks.findUnique({ where: { examId: exam.id }, select: { id: true } }).catch(() => null),
    ]);
    return {
      exam: { ...exam, category: String(exam.category), languages: exam.languages.map(String) },
      subjects,
      officialUrl: eligibility?.officialUrl ?? null,
      officialName: eligibility?.officialName ?? null,
      fullMockId: fullMock?.id ?? null,
      hasTricks: !!tricks,
    };
  },
  ["exam-checklist-facts-v2"],
  { revalidate: 900, tags: ["exam-shared"] },
);

/** `lang` localises the sentences the checklist builder assembles (the
 *  exam-day line, the window, the marking line, the marking-scheme reason)
 *  and the tier word inside every date. Omitted — as generateMetadata omits
 *  it — everything stays English, byte for byte. */
async function loadChecklist(
  code: string,
  now: Date,
  lang?: { t: ChecklistT; locale: string },
): Promise<{ facts: ChecklistFacts; checklist: ExamChecklist } | null> {
  const facts = await loadChecklistFacts(code).catch(() => null);
  // SCHOOL_BOARD (Board, Class) containers are not exams: no checklist page.
  if (!facts || !hasChecklist(facts.exam.category)) return null;
  const inputs = await getExamWeekInputs(facts.exam.id).catch(() => ({ rows: [], officialUrl: null }));
  const localised: Partial<ChecklistInput> = lang
    ? {
        t: lang.t,
        locale: lang.locale,
        tierWord: (tier) => lang.t(`ew.tier.${tier}` as StringKey),
        passedText: lang.t("tracker.passedEstimate"),
      }
    : {};
  const checklist = buildExamChecklist({
    exam: facts.exam,
    subjects: facts.subjects,
    rows: inputs.rows,
    officialUrl: inputs.officialUrl ?? facts.officialUrl,
    officialName: facts.officialName,
    now,
    ...localised,
  });
  return { facts, checklist };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const loaded = await loadChecklist(code, new Date());
  if (!loaded) return { title: "Exam not found — Shishya" };
  const { exam } = loaded.facts;
  const meta = examChecklistMeta(exam, loaded.checklist);
  const url = `https://shishya.in/exams/${exam.code}/checklist`;
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: url },
    openGraph: {
      title: `${exam.shortName} — last-minute checklist`,
      // Whole clauses only, no marking clause — never a sliced number.
      description: meta.ogDescription,
      url,
      type: "article",
    },
  };
}

function NoticeLink({ row, t }: { row: ChecklistDate; t: (key: StringKey) => string }) {
  if (!row.url) return null;
  return (
    <>
      {" "}
      <a
        href={row.url}
        target="_blank"
        rel="nofollow noopener noreferrer"
        className="font-semibold text-saffron-700 hover:text-saffron-800"
      >
        {row.official ? t("chk.notice.official") : t("chk.notice.source")}
      </a>
    </>
  );
}

interface ArticleSource {
  url: string;
  type?: string;
  label?: string;
}

export default async function ChecklistPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const now = new Date();
  const { t, locale } = await getT();
  const loaded = await loadChecklist(code, now, { t, locale });
  if (!loaded) notFound();
  const { facts, checklist: c } = loaded;
  const { exam } = facts;
  const short = exam.shortName;

  // /cutoff 404s without rank bands (MP RAEO, KA KSRP — 16 Sep 2026): the
  // link renders only when the page does. A failed gate read keeps it.
  const [session, articleRow, gates] = await Promise.all([
    auth().catch(() => null),
    prisma.examPhaseArticle
      .findFirst({
        where: { examId: exam.id, phase: "CHECKLIST", archivedAt: null },
        orderBy: { lastUpdatedAt: "desc" },
        select: { id: true, title: true, bodyMarkdown: true, summarySnippet: true, sourcesScraped: true, createdAt: true, lastUpdatedAt: true },
      })
      .catch(() => null),
    examPageGates(exam.code),
  ]);
  const signedIn = !!session?.user;
  const userId = session?.user?.id ?? null;

  // Optional extra: the compiled article, only when it passes the gate.
  const article = articleRow && isRealArticle(articleRow) ? articleRow : null;
  const [likes, dislikes, myReaction] = article
    ? await Promise.all([
        prisma.examArticleReaction.count({ where: { articleId: article.id, reaction: "LIKE" satisfies ArticleReaction } }).catch(() => 0),
        prisma.examArticleReaction.count({ where: { articleId: article.id, reaction: "DISLIKE" satisfies ArticleReaction } }).catch(() => 0),
        userId
          ? prisma.examArticleReaction
              .findFirst({ where: { articleId: article.id, userId }, select: { reaction: true } })
              .catch(() => null)
          : Promise.resolve(null),
      ])
    : [0, 0, null];
  const sources = ((article?.sourcesScraped as unknown as ArticleSource[] | null) ?? []).filter(
    (s) => s && typeof s.url === "string" && /^https?:\/\//i.test(s.url),
  );

  const pageUrl = `https://shishya.in/exams/${exam.code}/checklist`;
  const summary = patternSummary(c.pattern, t);
  const alert = examAlertLabels(t, short);
  const upcomingDated = c.examDay && !c.examDay.passedEstimate && c.examDay.daysFromToday >= 0 ? c.examDay.dated : null;
  const shareMessage = upcomingDated
    ? fillTemplate(t("chk.share.dated"), { exam: short, date: upcomingDated })
    : fillTemplate(t("chk.share"), { exam: short });

  const linkCls =
    "inline-flex items-center gap-1 rounded-full border border-saffron-300 bg-white px-3 py-1 text-xs font-semibold text-saffron-800 hover:bg-saffron-100";
  const cardCls = "mt-5 rounded-xl border border-ink-200 bg-white p-5 shadow-sm";
  const h2Cls = "text-base font-bold text-ink-900";

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: "Exams", item: "https://shishya.in/exams" },
      { "@type": "ListItem", position: 3, name: short, item: `https://shishya.in/exams/${exam.code}` },
      { "@type": "ListItem", position: 4, name: "Last-minute checklist", item: pageUrl },
    ],
  };
  const articleJsonLd = article
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: article.title,
        description: article.summarySnippet || undefined,
        datePublished: article.createdAt.toISOString(),
        dateModified: article.lastUpdatedAt.toISOString(),
        inLanguage: "en-IN",
        isAccessibleForFree: true,
        author: { "@type": "EducationalOrganization", name: "Shishya", url: "https://shishya.in" },
        publisher: {
          "@type": "EducationalOrganization",
          name: "Shishya",
          url: "https://shishya.in",
          logo: { "@type": "ImageObject", url: "https://shishya.in/icon.svg" },
        },
        about: { "@type": "Course", name: exam.name, url: `https://shishya.in/exams/${exam.code}` },
        mainEntityOfPage: pageUrl,
      }
    : null;

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {articleJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      )}
      <Header />
      <article className="container-prose py-10">
        <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-ink-500" aria-label={t("chk.crumb.aria")}>
          <Link href="/" className="font-medium text-saffron-700 hover:underline">
            {t("chk.crumb.all")}
          </Link>
          <span aria-hidden>›</span>
          <Link href={`/exams/${exam.code}`} className="font-medium text-saffron-700 hover:underline">
            {short}
          </Link>
          <span aria-hidden>›</span>
          <span className="font-medium text-ink-700">{t("chk.crumb.self")}</span>
        </nav>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-900">
          {t("chk.badge")}
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          {fillTemplate(t("chk.h1"), { exam: short })}
        </h1>
        <p className="mt-3 text-base text-ink-600">
          {fillTemplate(t("chk.intro.lead"), { name: exam.name })}{" "}
          <strong>{t("ew.tier.official")}</strong> {t("chk.intro.official")} <strong>{t("ew.tier.reported")}</strong>{" "}
          {t("chk.intro.reported")} {t("chk.intro.or")} <strong>{t("ew.tier.expected")}</strong>{" "}
          {t("chk.intro.expected")} {t("chk.intro.tail")}
        </p>

        {/* 1 — Exam day */}
        <section className="mt-6 rounded-xl border-2 border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 px-5 py-4">
          <h2 className={h2Cls}>{t("chk.examDay.h2")}</h2>
          {c.examDayLine && c.examDay ? (
            <>
              <p className="mt-1 text-sm font-semibold text-ink-900">
                {c.examDayLine}
                <NoticeLink row={c.examDay} t={t} />
              </p>
              {c.sittings.length > 1 ? (
                // Every sitting of the day (16 Sep 2026): KSRP holds two
                // official sittings on 20 Sep in different regions and hours,
                // and the single "Tracker row" line showed one of them.
                <>
                  <p className="mt-0.5 text-xs text-ink-600">{t("chk.sittings.label")}</p>
                  <ul className="mt-0.5 space-y-0.5 text-xs text-ink-700">
                    {c.sittings.map((s, i) => (
                      <li key={i}>
                        🕘 {s.label} — {s.dated}
                        <NoticeLink row={s} t={t} />
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-0.5 text-xs text-ink-600">
                  {fillTemplate(t("chk.trackerRow"), { label: c.examDay.label })}
                </p>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm text-ink-800">
              {fillTemplate(t("chk.noDate"), { exam: short })}{" "}
              <Link href={`/exams/${exam.code}/updates`} className="font-semibold text-saffron-700 hover:text-saffron-800">
                {t("chk.followTracker")}
              </Link>
            </p>
          )}
          {c.examNotes.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-ink-800">
              {c.examNotes.map((n, i) => (
                <li key={i}>
                  🕘{" "}
                  <span className="text-xs font-semibold text-ink-600">
                    {fillTemplate(t("chk.timings"), { dated: n.dated })}
                  </span>{" "}
                  {n.text}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 2 — What to carry */}
        <section className={cardCls}>
          <h2 className={h2Cls}>{t("chk.carry.h2")}</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-800">
            {c.carry.map((item) => (
              <li key={item.key} className="flex gap-2">
                <span aria-hidden className="shrink-0">
                  {item.check ? "🔎" : "✅"}
                </span>
                <span>{t(item.key)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-500">
            {c.carry.some((item) => !item.check) ? t("chk.carry.universal") : ""}
            {t("chk.carry.note")}
          </p>
        </section>

        {/* 3 — Admit card */}
        <section className={cardCls}>
          <h2 className={h2Cls}>{t("chk.admit.h2")}</h2>
          {c.admitCard ? (
            <>
              <p className="mt-1 text-sm text-ink-800">
                {c.admitCard.label}: <span className="font-semibold">{c.admitCard.dated}</span>
                <NoticeLink row={c.admitCard} t={t} />
              </p>
              {c.admitCard.notes && (
                <p className="mt-1 text-sm text-ink-700">
                  {fillTemplate(t("chk.admit.notes"), { notes: c.admitCard.notes })}
                </p>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm text-ink-800">
              {t("chk.admit.none")}{" "}
              {c.portal ? (
                <a href={c.portal.url} target="_blank" rel="nofollow noopener noreferrer" className="font-semibold text-saffron-700 hover:text-saffron-800">
                  {c.portal.name} ↗
                </a>
              ) : (
                t("chk.admit.none.fallback")
              )}
              {t("chk.sentenceEnd")}
            </p>
          )}
        </section>

        {/* 4 — Pattern */}
        <section className={cardCls}>
          <h2 className={h2Cls}>{t("chk.pattern.h2")}</h2>
          <p className="mt-0.5 text-xs text-ink-500">{c.pattern.paper}</p>
          {c.pattern.stageMismatch && (
            <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">⚠️ {c.pattern.stageMismatch}</p>
          )}
          {summary && <p className="mt-2 text-sm font-semibold text-ink-900">{summary}</p>}
          {c.pattern.marking ? (
            <p className="mt-1 text-sm text-ink-800">{fillTemplate(t("chk.pattern.marking"), { text: c.pattern.marking })}</p>
          ) : c.pattern.markingNote && !c.pattern.stageMismatch ? (
            <p className="mt-1 text-sm text-ink-700">
              {fillTemplate(t("chk.pattern.marking"), { text: c.pattern.markingNote })}
            </p>
          ) : null}
          {c.sections.length > 0 && (
            <>
              {/* Question counts only when the stored weights ARE counts;
                  otherwise names only — relative syllabus weights are
                  estimates, never the paper's weightage. */}
              <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-ink-500">
                {c.sectionsAreCounts ? t("chk.pattern.sections") : t("chk.pattern.subjects")}
              </p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-sm text-ink-800">
                {c.sections.map((s, i) => (
                  <li key={i}>
                    {s.name}
                    {s.questions != null ? ` — ${fillTemplate(t("chk.pattern.q"), { n: s.questions })}` : ""}
                  </li>
                ))}
              </ol>
            </>
          )}
          <p className="mt-3 text-sm text-ink-700">
            {fillTemplate(t("chk.languages"), {
              list: c.languages.length > 0 ? c.languages.join(", ") : t("chk.languages.none"),
            })}
          </p>
          {c.pattern.description && <p className="mt-2 text-sm text-ink-600">{c.pattern.description}</p>}
          <p className="mt-2 text-xs text-ink-500">{t("chk.patternChange")}</p>
        </section>

        {/* 5 — After the paper */}
        <section className={cardCls}>
          <h2 className={h2Cls}>{t("chk.after.h2")}</h2>
          <ul className="mt-1 space-y-1 text-sm text-ink-800">
            <li>
              {t("chk.after.answerKey")}{" "}
              {c.answerKey ? (
                <>
                  <span className="font-semibold">{c.answerKey.dated}</span>
                  <NoticeLink row={c.answerKey} t={t} />
                </>
              ) : (
                t("chk.notAnnounced")
              )}
            </li>
            <li>
              {t("chk.after.result")}{" "}
              {c.result ? (
                <>
                  <span className="font-semibold">{c.result.dated}</span>
                  <NoticeLink row={c.result} t={t} />
                </>
              ) : (
                t("chk.notAnnounced")
              )}
            </li>
            {c.nextStage && (
              <li>
                {fillTemplate(t("chk.after.nextStage"), { label: c.nextStage.label })}{" "}
                <span className="font-semibold">{c.nextStage.dated}</span>
                <NoticeLink row={c.nextStage} t={t} />
              </li>
            )}
          </ul>
        </section>

        {/* 6 — Official portal + useful links */}
        <section className={cardCls}>
          <h2 className={h2Cls}>{t("chk.links.h2")}</h2>
          {c.portal && (
            <p className="mt-1 text-sm text-ink-800">
              {t("chk.portal")}{" "}
              <a href={c.portal.url} target="_blank" rel="nofollow noopener noreferrer" className="font-semibold text-saffron-700 hover:text-saffron-800">
                {c.portal.name} ↗
              </a>
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/exams/${exam.code}/updates`} className={linkCls}>
              {fillTemplate(t("chk.link.dates"), { exam: short })}
            </Link>
            {/* /syllabus 404s for exams with no subjects (12 on 16 Sep 2026). */}
            {gates.syllabus && (
              <Link href={`/exams/${exam.code}/syllabus`} className={linkCls}>
                {t("chk.link.syllabus")}
              </Link>
            )}
            {/* The system full-pattern paper follows the STORED pattern — hidden
                when the sitting in focus is another stage (SBI PO Mains on a
                Prelims record), so the page never contradicts its own warning. */}
            {facts.fullMockId && !c.pattern.stageMismatch && (
              <Link href={`/mocks/${facts.fullMockId}`} prefetch={false} className={linkCls}>
                📝 {t("ew.week.paper")}
              </Link>
            )}
            {facts.hasTricks && (
              <Link href={`/exams/${exam.code}/tricks`} className={linkCls}>
                {t("chk.link.tricks")}
              </Link>
            )}
            {gates.cutoff && (
              <Link href={`/exams/${exam.code}/cutoff`} className={linkCls}>
                🎯 {t("ew.post.cutoff")}
              </Link>
            )}
            <a href={`/exams/${exam.code}/exam-week.ics`} rel="nofollow" className={linkCls}>
              📅 {t("ew.ics.dates")}
            </a>
          </div>
        </section>

        {/* 7 — Things to keep: one-email alert + share */}
        <section className={cardCls}>
          <ExamAlertBox
            examCode={exam.code}
            signedIn={signedIn}
            compact
            phase={alertCopyPhase(alertPhase(c.state), c.state)}
            weekLabels={alert.weekLabels}
            labels={alert.labels}
          />
          <div className="mt-3">
            <ShareExamButton url={`/exams/${exam.code}/checklist`} message={shareMessage} surface="checklist" exam={exam.code} />
          </div>
        </section>

        {/* 8 — Optional: the compiled article, only when it is REAL */}
        {article && (
          <section className="mt-10">
            <h2 className="text-xl font-bold text-ink-900">{t("chk.article.h2")}</h2>
            <p className="mt-1 text-xs text-ink-500">
              {fillTemplate(t("chk.article.sub"), { when: formatRelativeTime(article.lastUpdatedAt, now, t) })}
            </p>
            <h3 className="mt-4 text-lg font-semibold text-ink-900">{article.title}</h3>
            <div className="prose prose-ink mt-4 max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(article.bodyMarkdown) }} />
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
              <ReactionButtons articleId={article.id} likes={likes} dislikes={dislikes} myReaction={myReaction?.reaction ?? null} />
              <ShareButtons articleId={article.id} url={pageUrl} title={article.title} />
            </div>
            {sources.length > 0 && (
              <div className="mt-6 rounded-lg border border-ink-100 bg-ink-50/40 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{t("chk.article.sources")}</p>
                <ul className="mt-2 space-y-1 text-xs text-ink-700">
                  {sources.map((src) => (
                    <li key={src.url}>
                      <a href={src.url} className="text-saffron-700 hover:underline" target="_blank" rel="noopener nofollow noreferrer">
                        {src.label ?? src.url}
                      </a>
                      {src.type && <span className="text-[10px] uppercase text-ink-400"> · {src.type}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        <section className="mt-10 rounded-xl border border-ink-200 bg-saffron-50/40 p-5">
          <h2 className="text-base font-semibold text-ink-900">{fillTemplate(t("chk.disc.h2"), { exam: short })}</h2>
          <p className="mt-1 text-sm text-ink-600">{t("chk.disc.body")}</p>
          <Link
            href={`/discussions?examCode=${exam.code}`}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-saffron-700 hover:underline"
          >
            {fillTemplate(t("chk.disc.cta"), { exam: short })} <span aria-hidden>→</span>
          </Link>
        </section>
      </article>
    </main>
  );
}

/** "5 min ago / 2 h ago / 3 d ago" — server-rendered, in the reader's language. */
function formatRelativeTime(date: Date | string, now: Date, t: (key: StringKey) => string): string {
  const ms = now.getTime() - new Date(date).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 1) return t("chk.rel.now");
  if (min < 60) return fillTemplate(t("chk.rel.min"), { n: min });
  const hr = Math.round(min / 60);
  if (hr < 24) return fillTemplate(t("chk.rel.hour"), { n: hr });
  return fillTemplate(t("chk.rel.day"), { n: Math.round(hr / 24) });
}
