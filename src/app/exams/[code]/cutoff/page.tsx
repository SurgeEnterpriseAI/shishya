// /exams/:code/cutoff — programmatic SEO landing for "[exam] cutoff" /
// "[exam] expected cutoff 2026" queries (among the highest-volume exam
// search patterns we didn't own a page for). Data: ExamRankBand — the same
// AI-curated, source-annotated score→rank→outcome bands that power the
// post-mock RankCard. PUBLIC; honest disclaimer built in.
//
// Exam Week Mode (6 Sep 2026). This is the one page with a measured
// exam-day spike (39 landers on exam day across events; 41 of IOQM's 136
// first landings) and it was phase-blind — it ended with a coach pitch for
// the exam that had just finished. From D-1 to D+7 it now opens with what
// that lander wants: when the official cutoff arrives (result / answer-key
// status straight from the tracker — every date with its tier word,
// "not announced yet" when the tracker holds nothing), last cycle's table,
// where Shishya mock-takers scored (n>=10, and the copy says it is not a
// prediction), the paper-difficulty tally (n>=10, counts only), a
// one-email alert, the calendar file and — after the paper — the score
// estimator.
//
// Wave 2 (6 Sep 2026): the whole body is served in the page's language
// (cookie / /hi / /te header), not just the exam-week block, so the page
// now reads the locale on every request like the hub and the tracker.
// The tracker rows behind the phase still come from the shared 15-minute
// cache (src/lib/exam-week-inputs.ts).
//
// Searchability (7 Sep 2026): wave 2 localised the body but left the
// <title>, description, canonical and og:locale English on every twin —
// /hi and /te read as duplicates of the English page. They now follow the
// URL locale, declare hreflang alternates, carry the language-twin links
// and are listed (hi + te) in src/app/sitemap.ts.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { getVerdictTally, VERDICT_MIN_N } from "@/lib/exam-verdict";
import { auth } from "@/lib/auth";
import { getExamShared } from "@/lib/db/exam-cache";
import { getT, getUrlLocale, tFor } from "@/lib/i18n-server";
import type { Locale, StringKey } from "@/lib/i18n";
import { inLanguage, languageAlternates, localizedPath, localizedUrl, ogLocale, twinCanonical } from "@/lib/seo-locale";
import { getTwinVerdict } from "@/lib/twin-localisation";
import { computeExamWeekState, dateWithTier, istDay, type ExamWeekPhase, type ExamWeekState } from "@/lib/exam-week";
import type { SourceTier, TimelineRow } from "@/lib/exam-timeline";
import { examAlertLabels, getExamWeekInputs } from "@/lib/exam-week-inputs";
import { categoryHeaderKey, parseCategoryCutoff } from "@/lib/category-cutoff";
import { cutoffCategoryRowsHtml, cutoffRowsHtml, groupCutoffTables, type CutoffSource, type OfficialCutoffRow } from "@/lib/official-cutoffs";
import { sourceTier } from "@/lib/official-source";
import { markingSchemeStatable } from "@/lib/marking-scheme";
import { ExamVerdictPoll } from "@/components/ExamVerdictPoll";
import { ShareExamButton } from "@/components/ShareExamButton";
import { TalkToTeacher } from "@/components/TalkToTeacher";
import { AnonExamNudge } from "@/components/AnonExamNudge";
import { CoachEntry } from "@/components/CoachEntry";
import { ExamAlertBox } from "@/components/ExamAlertBox";
import { LangTwinLinks } from "@/components/LangTwinLinks";
import { StateExamsLink } from "@/components/StateExamsLink";
import { inlineMd } from "@/components/NotesMarkdown";

// 900: the exam-week boundaries (D-1 in, D+7 out) must show up within 15
// minutes. The page reads the locale (and, inside exam week, the session),
// so it renders per request like /updates and the hub; this governs the
// data caches underneath.
export const revalidate = 900;

const YEAR = new Date().getFullYear();

type TFn = (key: StringKey) => string;

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const TIER_KEY: Record<SourceTier, StringKey> = {
  official: "ew.tier.official",
  reported: "ew.tier.reported",
  expected: "ew.tier.expected",
};

function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/** Phases the cutoff block covers: D-1 .. D+7 (not the run-up week). */
const CUTOFF_PHASES: ReadonlySet<ExamWeekPhase> = new Set<ExamWeekPhase>(["eve", "today-am", "today-pm", "window", "post"]);

// Paper-difficulty poll counts come from the shared helper in
// src/lib/exam-verdict.ts so the hub, tracker, API and this page agree.
// Two minutes is fresh enough for a count that only shows from n>=10, and
// keeps exam-day landers from each hitting the poll table.
const getVerdictTallyCached = unstable_cache(
  (examId: string, day: string) => getVerdictTally(examId, day).catch(() => null),
  ["cutoff-verdict-tally-v1"],
  { revalidate: 120 },
);

/** Everything the exam-week block renders, resolved server-side in the
 *  page's language. Only called for D-1 .. D+7 — this is where the
 *  session read lives. */
async function loadExamWeekView(
  exam: {
    id: string; code: string; shortName: string; name: string;
    totalQuestions: number; scoredQuestions: number | null; totalMarks: number; marksPerQ: number; description: string;
  },
  ew: ExamWeekState,
  t: TFn,
  locale: Locale,
) {
  const [session, shared, tally, subjects] = await Promise.all([
    auth().catch(() => null),
    // Cohort stats the hub already computes (10-min cache); cold cache
    // pays the hub payload once, which exam-day traffic keeps warm anyway.
    getExamShared(exam.code).catch(() => null),
    ew.focusDay ? getVerdictTallyCached(exam.id, ew.focusDay) : Promise.resolve(null),
    // Section chips for the poll — the same six the hub block offers.
    prisma.subject
      .findMany({ where: { examId: exam.id }, orderBy: { orderIdx: "asc" }, select: { name: true }, take: 6 })
      .then((rows) => rows.map((r) => r.name.trim()).filter(Boolean))
      .catch(() => [] as string[]),
  ]);
  const short = exam.shortName;
  // Every date carries its tier word; a missing tracker row is said plainly.
  //
  // An EXPECTED date that has already gone by must not read as the thing
  // still to come: on 7 Sep this page told students who had just sat IOQM
  // that the answer key was "expected 6 Sept" — a date already behind them.
  // Past estimates say so; official and reported rows keep their date.
  const todayIst = istDay(new Date());
  const status = (row: TimelineRow | null) => {
    if (!row) return t("ew.post.notAnnounced");
    const dated = dateWithTier(row, t(TIER_KEY[row.tier]), locale);
    return row.tier === "expected" && istDay(row.date) < todayIst
      ? fill(t("ew.date.overdue"), { date: dated })
      : dated;
  };
  const stats = shared?.examStats ?? null;
  const pct = (part: number, whole: number) => Math.round((part / whole) * 100);

  return {
    phase: ew.phase,
    signedIn: !!session?.user?.id,
    title: fill(t("ew.cutoff.title"), { exam: short }),
    lead: fill(t("ew.cutoff.lead"), { result: status(ew.result), key: status(ew.answerKey) }),
    lastCycle: t("ew.cutoff.lastCycle"),
    // Cohort line from 10 students only; the copy itself says it is where
    // mock-takers scored, not a prediction.
    mockAvg:
      stats && stats.students >= 10 && stats.avgPct != null
        ? fill(t("ew.cutoff.mockAvg"), { n: stats.students.toLocaleString("en-IN"), pct: Math.round(stats.avgPct), exam: short })
        : null,
    // Verdict tally from VERDICT_MIN_N ratings only — counts and shares,
    // never a prediction. The floor is the shared constant, so the hub,
    // tracker, API and this page can never drift apart.
    tally:
      tally && tally.n >= VERDICT_MIN_N
        ? fill(t("ew.verdict.tally"), {
            n: tally.n,
            easy: pct(tally.easy, tally.n),
            moderate: pct(tally.moderate, tally.n),
            tough: pct(tally.tough, tally.n),
          })
        : null,
    // The estimator is only a destination when we can state ONE marking
    // scheme for this paper. IOQM cannot be stated (30 questions, 100 marks,
    // tiered 2/3/5) and is the biggest cutoff lander on the site, so the pill
    // was sending its post-exam arrivals to a page that refuses them.
    // The sitting in focus decides: a Prelims entity on a "Mains" row (SBI PO
    // 12 Sep 2026) must refuse, so the pill only shows when the verdict is ok.
    canEstimate: markingSchemeStatable(exam, { rowLabel: ew.focus?.label, rowDate: ew.focus?.date }),
    // The poll is the one action a post-exam lander can take without an
    // account: one tap, and it is what fills the tally the next visitor
    // reads. 40 of 47 cutoff landers today read one page and left.
    poll:
      ew.focusDay && (ew.phase === "today-pm" || ew.phase === "post" || ew.phase === "window")
        ? {
            examDate: ew.focusDay,
            sections: subjects,
            initialTally: tally && tally.n >= VERDICT_MIN_N ? tally : tally ? { ...tally, easy: 0, moderate: 0, tough: 0, sections: [] } : null,
            labels: {
              prompt: t("ew.today.pm"),
              easy: t("ew.verdict.easy"),
              moderate: t("ew.verdict.moderate"),
              tough: t("ew.verdict.tough"),
              section: t("ew.verdict.section"),
              thanks: t("ew.verdict.thanks"),
              tally: t("ew.verdict.tally"),
              few: t("ew.verdict.few"),
              err: t("tracker.alert.err"),
              nudge: t("ew.signup.nudge"),
              shareTally: t("ew.share.tally"),
              shareCta: t("ew.share.cta"),
            },
          }
        : null,
    hubLink: fill(t("ew.post.title"), { exam: short }),
    icsCta: t("ew.ics.cta"),
    icsNote: t("ew.ics.note"),
    scoreCta: t("ew.score.cta"),
    alert: examAlertLabels(t, short),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const exam = await prisma.exam.findUnique({
    where: { code },
    select: { id: true, code: true, shortName: true, name: true },
  });
  if (!exam) return { title: "Exam cutoff — Shishya" };
  // Wave 2 serves the body in the URL's language but still emitted an
  // English title/description, an English canonical on every twin and no
  // hreflang — the /hi and /te cutoff pages looked like duplicates of the
  // English one. Same shape as score-estimate/page.tsx now.
  const urlLocale = await getUrlLocale();
  const tt = tFor(urlLocale) as TFn;
  const title = `${fill(tt("cutoff.metaTitle"), { exam: exam.shortName, year: YEAR })} | Shishya`;
  const description = fill(tt("cutoff.metaDescription"), { exam: exam.shortName, name: exam.name, year: YEAR });
  const path = `/exams/${exam.code}/cutoff`;
  const url = localizedUrl(path, urlLocale);
  const image = `https://shishya.in/exams/${exam.code}/opengraph-image`;
  // Index shape (13 Sep 2026): a twin is self-canonical + hreflang-declared
  // only when its rendered body is ≥ 30% native script; otherwise its
  // canonical is the English cutoff page (src/lib/twin-localisation.ts).
  const twins = await getTwinVerdict("cutoff", exam.id);
  return {
    title,
    description,
    alternates: { canonical: twinCanonical(path, urlLocale, twins), languages: languageAlternates(path, twins) },
    keywords: [
      `${exam.shortName} cutoff ${YEAR}`,
      `${exam.shortName} expected cutoff`,
      `${exam.shortName} cutoff marks`,
      `${exam.shortName} safe score`,
      `${exam.shortName} rank predictor`,
      `${exam.shortName} previous year cutoff`,
    ],
    // Explicit og:image — a child segment's openGraph block replaces the
    // parent's, so /exams/[code]/opengraph-image was not inherited here.
    openGraph: {
      title,
      description,
      url,
      siteName: "Shishya",
      locale: ogLocale(urlLocale),
      type: "article",
      images: [{ url: image, width: 1200, height: 630, alt: `${exam.shortName} — Shishya` }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function CutoffPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const exam = await prisma.exam.findUnique({
    where: { code },
    select: {
      id: true, code: true, shortName: true, name: true, active: true, state: true,
      // The marking-scheme test decides whether the estimator pill is a real
      // destination for this exam or a page that refuses (see below).
      totalMarks: true, totalQuestions: true, scoredQuestions: true, marksPerQ: true, description: true,
    },
  });
  if (!exam || !exam.active) notFound();

  const [bands, { rows: dateRows, officialUrl }, catRows, { t: tRaw, locale }, urlLocale, publishedRows] = await Promise.all([
    prisma.examRankBand.findMany({
      where: { examId: exam.id, archivedAt: null },
      orderBy: { orderIdx: "asc" },
      select: {
        label: true,
        scorePctMin: true,
        scorePctMax: true,
        rankMin: true,
        rankMax: true,
        outcomes: true,
        source: true,
      },
    }),
    // Exam Week Mode: phase from the cached tracker reads.
    getExamWeekInputs(exam.id),
    // Category-wise expected cutoffs (gap-fill #4 — "is 95 safe for OBC?"
    // is how aspirants actually frame the question). Raw SQL keeps this
    // independent of client typegen; renders when generated.
    prisma
      .$queryRaw<{ content: string }[]>`
        SELECT content FROM "ExamCategoryCutoff" WHERE "examId" = ${exam.id} LIMIT 1
      `.catch(() => [] as { content: string }[]),
    getT(),
    getUrlLocale(),
    // Published previous-recruitment cutoffs (13 Sep 2026): only rows whose
    // figure was verified verbatim in the published document
    // (scripts/import-official-cutoffs.ts). Raw SQL, like the table above.
    prisma
      .$queryRaw<OfficialCutoffRow[]>`
        SELECT cycle, stage, post, region, gender, category, "categoryLabel", marks, "maxMarks", "scoreType",
               "sourceUrl", "sourceTitle", publisher, "publishedOn"
        FROM "OfficialCutoff" WHERE "examId" = ${exam.id} AND "archivedAt" IS NULL
      `.catch(() => [] as OfficialCutoffRow[]),
  ]);
  if (bands.length === 0) notFound();
  const t = tRaw as TFn;
  const p = (rel: string) => localizedPath(rel, urlLocale);
  const short = exam.shortName;
  const published = groupCutoffTables(publishedRows);

  const ew = computeExamWeekState(dateRows, officialUrl);
  const view = CUTOFF_PHASES.has(ew.phase) && ew.tier !== "expected" ? await loadExamWeekView(exam, ew, t, locale) : null;

  // Self-canonical per twin: on /hi and /te the page describes ITSELF (the
  // canonical + hreflang in generateMetadata say the same), so the share
  // link and the JSON-LD must not point at the English URL either.
  const path = `/exams/${exam.code}/cutoff`;
  const url = localizedUrl(path, urlLocale);
  // Structured data follows the URL locale, exactly like the canonical and
  // the metadata above — the body follows the reader's cookie, but a
  // crawler has none, so on /hi and /te the two agree.
  const tUrl = tFor(urlLocale) as TFn;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: fill(tUrl("cutoff.metaTitle"), { exam: exam.shortName, year: YEAR }),
    description: fill(tUrl("cutoff.metaDescription"), { exam: exam.shortName, name: exam.name, year: YEAR }),
    url,
    inLanguage: inLanguage(urlLocale),
    isAccessibleForFree: true,
    // In exam-week mode the page's lead really does change day by day.
    ...(view ? { dateModified: istDay(new Date()) } : {}),
    about: [{ "@type": "Thing", name: exam.name }, { "@type": "Thing", name: `${exam.shortName} cutoff` }],
    publisher: { "@type": "Organization", name: "Shishya", url: "https://shishya.in" },
    isPartOf: { "@type": "Course", name: `${exam.shortName} preparation`, url: `https://shishya.in/exams/${exam.code}` },
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: exam.shortName, item: `https://shishya.in/exams/${exam.code}` },
      { "@type": "ListItem", position: 3, name: "Cutoff", item: url },
    ],
  };

  const outcomesList = (md: string) =>
    md
      .split("\n")
      .map((l) => l.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean);

  // Parse the strict markdown the generator emits: a pipe table + bullets.
  const cat = parseCategoryCutoff(catRows[0]?.content);
  // The generator's two fixed column headers translate; anything else renders as-is.
  const th = (h: string) => {
    const k = categoryHeaderKey(h);
    return k ? t(k) : h;
  };

  const pill =
    "inline-flex items-center gap-1 rounded-full border border-saffron-300 bg-white px-3 py-1 text-xs font-semibold text-saffron-800 hover:bg-saffron-100";

  return (
    <main className="min-h-screen bg-ink-50/40">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <Header />
      <section className="container-prose py-8 sm:py-10">
        <p className="text-xs text-ink-500">
          <Link href={p(`/exams/${exam.code}`)} className="hover:text-ink-800">
            {short}
          </Link>{" "}
          · {t("tracker.cutoff")}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900 sm:text-3xl">{fill(t("cutoff.h1"), { exam: short, year: YEAR })}</h1>

        {/* Language twins — real links for humans AND the crawl graph, the
            same pair the hreflang block in generateMetadata declares. */}
        <LangTwinLinks path={path} current={urlLocale} />
        {/* State page link (15 Sep 2026, SEO wave 3) — English URL only: the /hi and
            /te twins are measured by src/lib/twin-localisation.ts, which does not
            count this line. */}
        {urlLocale === "en" && (
          <StateExamsLink state={exam.state} label={t("exam.state.more")} locale={locale} />
        )}

        {/* Exam-week block (D-1 .. D+7): the answer the exam-day lander
            came for — when the official cutoff arrives — before the
            historic bands. Dates carry their tier; nothing is guessed. */}
        {view && (
          <section className="mt-4 rounded-xl border border-saffron-300 bg-white p-5">
            <h2 className="text-base font-bold text-ink-900">{view.title}</h2>
            <p className="mt-1 text-sm text-ink-700">{view.lead}</p>
            {view.mockAvg && <p className="mt-2 text-sm text-ink-700">{view.mockAvg}</p>}
            {view.tally && <p className="mt-1 text-sm text-ink-700">{view.tally}</p>}
            {/* After the paper: the marking-scheme estimator. From today-pm,
                not only "post" — the evening the paper is sat is exactly when
                students start counting marks against a coaching key. Always:
                the calendar file — a plain anchor (no prefetch), path fixed at
                /exams/{code}/exam-week.ics (the hub links the same URL), and
                rel="nofollow" because the .ics is a companion download, not a
                page that should compete with the tracker in the index. */}
            {view.poll && (
              <div className="mt-3 border-t border-saffron-200 pt-3">
                <ExamVerdictPoll
                  examCode={exam.code}
                  examDate={view.poll.examDate}
                  labels={view.poll.labels}
                  sections={view.poll.sections}
                  initialTally={view.poll.initialTally}
                  minN={VERDICT_MIN_N}
                  signedIn={view.signedIn}
                  examShort={short}
                  shareUrl={url}
                />
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {(view.phase === "today-pm" || view.phase === "post") && view.canEstimate && (
                <Link href={p(`/exams/${exam.code}/score-estimate`)} className={pill}>
                  🧮 {view.scoreCta}
                </Link>
              )}
              <a href={`/exams/${exam.code}/exam-week.ics`} rel="nofollow" className={pill}>
                📅 {view.icsCta}
              </a>
            </div>
            <p className="mt-1 text-xs text-ink-600">{view.icsNote}</p>
            <div className="mt-3">
              <ExamAlertBox
                examCode={exam.code}
                compact
                signedIn={view.signedIn}
                labels={view.alert.labels}
                phase={view.phase}
                weekLabels={view.alert.weekLabels}
                note={view.alert.note}
              />
            </div>
          </section>
        )}

        {/* Published cutoffs first (13 Sep 2026): the figure a searcher
            wants is the one the conducting body published. One table per
            cycle + stage; its rows are what the figures split by (zone /
            state, post), and every figure keeps its document link and tier
            word (official = the conducting body's own site; anything else =
            reported). The latest, smallest table opens when it is short; long
            state- and post-wise lists fold, still in the HTML for readers and
            crawlers.
            Never mixed with the indicative estimates below. */}
        {published.length > 0 && (
          <section id="published" className="mt-6 scroll-mt-24">
            <h2 className="text-base font-semibold text-ink-900">{fill(t("cutoff.published.title"), { exam: short })}</h2>
            <p className="mt-1 max-w-3xl text-xs text-ink-600">{t("cutoff.published.note")}</p>
            {published.map((tb, i) => {
              const tiers: SourceTier[] = tb.sources.map((s) => (sourceTier("official", s.url, officialUrl) === "official" ? "official" : "reported"));
              const oneTier = tiers.every((x) => x === tiers[0]);
              const perRow = tb.sources.length > 1;
              const simple = tb.rows.length === 1 && tb.rows[0].label === "";
              const rowHead = [tb.splitBy.region ? t("cutoff.published.region") : "", tb.splitBy.post ? t("cutoff.published.post") : ""]
                .filter(Boolean)
                .join(" · ");
              const scale = [tb.scoreType, tb.maxMarks ? fill(t("cutoff.published.outOf"), { max: tb.maxMarks }) : ""].filter(Boolean).join(" · ");
              const docLink = (s: CutoffSource, full: boolean) => (
                <a href={s.url} target="_blank" rel="noopener nofollow" className="font-medium text-saffron-800 underline">
                  {s.publisher || hostOf(s.url)}
                  {full && s.title ? ` — ${s.title}` : ""} ↗
                </a>
              );
              return (
                // Only a short headline table opens by itself; a 300-row
                // state-wise list stays folded behind its summary line.
                <details key={tb.key} open={i === 0 && tb.rows.length <= 60} className="mt-3 rounded-lg border border-ink-200 bg-white">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-ink-800">
                    {[tb.cycle, tb.stage, tb.post, tb.region, tb.gender].filter(Boolean).join(" · ")}
                    {!simple && <span className="ml-1 font-normal text-ink-500">({tb.rows.length})</span>}
                  </summary>
                  <div className="overflow-x-auto border-t border-ink-200">
                    <table className="w-full text-sm [&_td]:px-3 [&_td]:py-1.5 [&_td]:tabular-nums [&_td]:text-ink-700 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-ink-800 [&_tbody_tr]:border-b [&_tbody_tr]:border-ink-100">
                      {simple ? (
                        <>
                          <thead>
                            <tr className="border-b border-ink-200 bg-ink-50/60">
                              <th>{t("cutoff.published.category")}</th>
                              <th>{t("cutoff.published.marks")}</th>
                            </tr>
                          </thead>
                          {/* Rows as one HTML string (cutoffRowsHtml, 14 Sep 2026): a
                              300-row table as React elements costs its size again,
                              several times over, in the RSC payload. Escaped there. */}
                          <tbody dangerouslySetInnerHTML={{ __html: cutoffCategoryRowsHtml(tb) }} />
                        </>
                      ) : (
                        <>
                          <thead>
                            <tr className="border-b border-ink-200 bg-ink-50/60">
                              <th>{rowHead || t("cutoff.published.source")}</th>
                              {tb.categories.map((c) => (
                                <th key={c}>{c}</th>
                              ))}
                              {perRow && <th>{t("cutoff.published.source")}</th>}
                            </tr>
                          </thead>
                          <tbody
                            dangerouslySetInnerHTML={{
                              __html: cutoffRowsHtml(tb, {
                                sourceColumn: perRow,
                                sourceText: (s) => tb.sources[s].publisher || hostOf(tb.sources[s].url),
                                sourceSuffix: (s) => (oneTier ? "" : ` (${t(TIER_KEY[tiers[s]])})`),
                                linkClass: "font-medium text-saffron-800 underline",
                              }),
                            }}
                          />
                        </>
                      )}
                    </table>
                  </div>
                  <p className="px-3 py-2 text-xs text-ink-600">
                    {scale}
                    {scale ? " · " : ""}
                    {t("cutoff.published.source")}
                    {oneTier ? ` (${t(TIER_KEY[tiers[0]])})` : ""}:{" "}
                    {perRow ? t("cutoff.published.perRow") : docLink(tb.sources[0], true)}
                  </p>
                </details>
              );
            })}
          </section>
        )}

        {/* The number the search brought them for comes FIRST (7 Sep
            2026): 40 of 47 cutoff landers read this page and nothing
            else, and the category table used to sit below the intro,
            the disclaimer and the share row. The honesty line stays
            attached to the figure it qualifies; the prose and the share
            row move under the table. */}
        <p className="mt-2 max-w-3xl rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
          {t("cutoff.disclaimer")}
        </p>

        {/* Category-wise table — the way aspirants actually ask the
            question ("safe for OBC?"). In exam-week mode it is framed as
            last cycle's figure; the source bullets below it are kept. */}
        {cat.table.length > 1 && (
          <section className="mt-6">
            <h2 className="text-base font-semibold text-ink-900">{view ? view.lastCycle : t("cutoff.category")}</h2>
            <div className="mt-3 overflow-x-auto rounded-lg border border-ink-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-200 bg-ink-50/60 text-left">
                    {cat.table[0].map((h, i) => (
                      <th key={i} className="px-4 py-2 font-semibold text-ink-800">
                        {th(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cat.table.slice(1).map((row, i) => (
                    <tr key={i} className="border-b border-ink-100 last:border-0">
                      {row.map((c, j) => (
                        <td key={j} className={`px-4 py-2 ${j === 0 ? "font-medium text-ink-900" : "tabular-nums text-ink-700"}`}>
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {cat.notes.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-ink-600">
                {cat.notes.map((n, i) => (
                  <li key={i}>{inlineMd(n)}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        <p className="mt-2 max-w-3xl text-sm text-ink-700">{fill(t("cutoff.intro"), { exam: exam.name })}</p>

        <div className="mt-4">
          <ShareExamButton
            url={url}
            message={fill(t("cutoff.share"), { exam: short, year: YEAR })}
            label={t("cutoff.shareLabel")}
            surface="cutoff"
            exam={exam.code}
          />
        </div>

        {/* Cutoff anxiety is the single most expert-worthy moment — surface
            the human option right where the doubt forms. */}
        <p className="mt-3 text-sm text-ink-600">
          {t("cutoff.askExpert")}{" "}
          <TalkToTeacher
            surface="exam"
            examCode={exam.code}
            variant="link"
            contextLabel={`${short} cutoff — am I safe for my category?`}
            linkLabel={t("cutoff.askExpertLink")}
          />
        </p>

        {/* Signup nudge for anonymous SEO landers at the same anxiety
            moment — session checked client-side; content is never gated. */}
        <AnonExamNudge
          examCode={exam.code}
          headline={fill(t("cutoff.nudge.title"), { exam: short })}
          body={t("cutoff.nudge.body")}
          cta={t("cutoff.nudge.cta")}
          signInLabel={t("cutoff.nudge.signin")}
          surface="cutoff-nudge"
        />

        {/* Knowing the target score is step one; the plan to reach it is
            step two — the coach's most natural handoff on the site. After
            the exam that pitch is wrong; the hub's "what next" block is
            the door instead. */}
        {view?.phase === "post" ? (
          <Link
            href={p(`/exams/${exam.code}`)}
            className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-saffron-300 bg-saffron-50/70 px-4 py-3 transition-colors hover:border-saffron-400 hover:bg-saffron-50"
          >
            <span className="min-w-0 text-sm font-semibold text-ink-800">{view.hubLink}</span>
            <span className="shrink-0 text-sm font-bold text-saffron-700">→</span>
          </Link>
        ) : (
          <CoachEntry examCode={exam.code} examShort={short} variant="cutoff" />
        )}

        <h2 className="mt-8 text-base font-semibold text-ink-900">{t("cutoff.bands")}</h2>
        <ul className="mt-3 space-y-3">
          {bands.map((b, i) => (
            <li key={i} className="rounded-lg border border-ink-200 bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-bold text-ink-900">{b.label}</p>
                <p className="text-xs font-semibold tabular-nums text-saffron-700">
                  {Math.round(b.scorePctMin)}–{Math.round(b.scorePctMax)}%
                  {b.rankMin != null && b.rankMax != null && (
                    <span className="ml-2 text-ink-500">
                      {fill(t("cutoff.rank"), { from: b.rankMin.toLocaleString("en-IN"), to: b.rankMax.toLocaleString("en-IN") })}
                    </span>
                  )}
                </p>
              </div>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-ink-700">
                {outcomesList(b.outcomes).slice(0, 6).map((o, j) => (
                  <li key={j}>{o}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-xl border-2 border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 p-5">
          <p className="text-base font-bold text-ink-900">{t("cutoff.land.title")}</p>
          <p className="mt-1 text-sm text-ink-600">{fill(t("cutoff.land.body"), { exam: short })}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href={p(`/exams/${exam.code}`)} className="btn-primary !py-2 !px-4 text-sm">
              {t("cutoff.land.cta")}
            </Link>
            <Link
              href={`/exams/${exam.code}/quiz`}
              className="inline-flex items-center rounded-md border-2 border-saffron-500 bg-white px-4 py-2 text-sm font-bold text-saffron-700 hover:bg-saffron-50"
            >
              {t("tracker.practice.quiz")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
