// Dynamic sitemap — Google + Bing discover every exam page, the school,
// college, scholarship and career sections and the other public surfaces
// from one fetch (26 Sep 2026: the typed "163 exam pages" was stale).
// Refreshes daily via Next's revalidate (cheap because the underlying query
// is tiny).
//
// 26 Sep 2026 (G1 index hygiene): this is the sitemap GOOGLE reads, so it
// lists only pages Google may index —
//   • news permalinks leave it while NEWS_GOOGLE_NOINDEX is on (founder
//     flag, src/lib/news-index-policy.ts); Bing gets them from
//     /sitemap-news.xml, which robots.txt does not name;
//   • /checklist, /live, /reactions and /score-estimate (and the estimator's
//     /hi /te twins) only inside their windows (src/lib/exam-week-gates.ts,
//     the same verdict the pages' Google-only robots read);
//   • result permalinks only with an official link (resultInSitemap);
//   • school subject pages only with a chapter list (isSchoolSubjectIndexable).

import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db/prisma";
import { REAL_EXAM_SQL, REAL_EXAM_WHERE } from "@/lib/db/exam-scope";
import { SUPPRESSED_SOURCE, type TimelineInput } from "@/lib/exam-timeline";
import { GATE_ROWS_AHEAD_DAYS, GATE_ROWS_PAST_DAYS, NO_GATES_OPEN, examPageIndexGates, groupGateRows, type ExamPageIndexGates } from "@/lib/exam-week-gates";
import { newsInMainSitemap, selfCanonicalNewsRows } from "@/lib/news-index-policy";
import { resultInSitemap } from "@/lib/result-permalink-copy";
import { dedupeSitemap, extraSitemapEntries } from "@/lib/sitemap-sections";
import { STATES, stateSlug } from "@/lib/state-info";
import { COLLEGES, ALL_STREAMS } from "@/lib/colleges-data";
// 26 Sep 2026 (repair): the schemes, never the one outside aggregator
// (Buddy4Study) the raw catalogue holds — src/lib/scholarship-schemes.ts.
import { SCHOLARSHIP_SCHEMES } from "@/lib/scholarship-schemes";
import { isOpenScheme } from "@/lib/scholarship-lists";
import { WORLDWIDE_COUNTRIES, TEST_PREP } from "@/lib/worldwide-data";
import { INSIGHTS_ARTICLES } from "@/data/insights-articles";
import { CAREERS } from "@/data/careers";
import { allBranchPaths } from "@/data/college-details";
import { PERSONAS } from "@/data/personas";
import { GATES_CLOSED, loadExamPageGates, type ExamPageGates } from "@/lib/exam-page-gates";
import { schoolClassIdentity } from "@/lib/school/context";
import { schoolLandingSitemapEntries } from "@/lib/school/landings";
import { EMPTY_SCHOOL_SURFACE, loadSchoolSurface, schoolSitemapEntries } from "@/lib/school/surface";
import { capsuleLastmods, examPageLastmods, lastModifiedField, type ExamFreshnessRow } from "@/lib/sitemap-lastmod";
import { pulseSitemapEntries } from "@/lib/pulse-rules";

export const revalidate = 86_400; // 24h

/** The hand-listed section landings (priority 0.9). Every path here is a
 *  public page robots.txt lets every crawler fetch
 *  (tests/unit/robots-sections.test.ts). School URLs are never listed here:
 *  they come from the live surface (pinned by the schooling-honesty test). */
export const SECTION_LANDING_PATHS: readonly string[] = [
  "/colleges",
  "/scholarships",
  // "/exams" is a permanent redirect to "/" — never list a redirect.
  "/exams/browse",
  // Government exams by state — the index every state page hangs under (15 Sep 2026).
  "/exams/state",
  // 26 Sep 2026: the Entrance-exams section hub (JEE, NEET, CUET, NDA,
  // olympiads) — built by the sections workflow; the integrator checks the
  // page renders before this ships.
  "/exams/entrance",
  "/current-affairs",
  "/find-your-exam",
  "/typing",
  "/descriptive",
  "/live-test",
  "/exam-calendar",
  "/editorial-policy",
  "/results",
  "/coach",
  "/ask",
  "/jobs-map",
  "/mentors",
  // Student feature requests + what the team built from them (13 Sep 2026).
  "/ideas",
  "/educators",
  "/about",
  "/pricing",
  "/contact",
  "/terms",
  "/privacy",
  "/refunds",
  "/revision",
  "/post-graduation",
  "/jobs",
  "/worldwide",
  "/insights",
  "/verification",
  // 27 Sep 2026: public transparency pages — every number with its definition
  // (/shishya-in-numbers), the weekly Shishya Pulse note, the press kit.
  "/shishya-in-numbers",
  "/pulse",
  "/press",
  "/recognition",
  "/scholarships/match",
  "/worldwide/loans",
  "/careers",
  "/jobs/govt-jobs",
  "/jobs/internships",
  "/jobs/resume",
  "/jobs/skill-careers",
  "/colleges/cutoffs",
  "/colleges/placements",
  "/colleges/iti-diploma",
  "/worldwide/compare",
  "/distance-learning",
  "/alumni-stories",
  "/soft-skills",
  "/career-map",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://shishya.in";

  // Every DB query below is `.catch(() => [])`-guarded. The sitemap is
  // served to crawlers; if a transient Neon hiccup threw here the WHOLE
  // sitemap would 500 and Google would drop pages from its index. Better
  // to emit a slightly smaller sitemap than none at all — the static
  // section landings always render regardless.
  // 25 Sep 2026: every exam-keyed family below reads real exams only
  // (src/lib/db/exam-scope.ts) — no school class container gets an
  // /exams/... URL here while the school pages are built hidden.
  const exams = await prisma.exam
    .findMany({
      where: REAL_EXAM_WHERE,
      select: { code: true, state: true, updatedAt: true },
      orderBy: { candidatesPerYear: "desc" },
    })
    .catch(() => [] as { code: string; state: string | null; updatedAt: Date }[]);

  const topics = await prisma.topic
    .findMany({
      where: { teachingNote: { isNot: null }, subject: { exam: REAL_EXAM_WHERE } },
      select: {
        code: true,
        createdAt: true,
        teachingNote: { select: { generatedAt: true } },
        subject: { select: { exam: { select: { code: true } } } },
      },
      // Cap high enough to include EVERY topic we've authored notes for —
      // the old take:2000 silently dropped ~1k freshly-generated pages from
      // the sitemap (wasted generation cost). Total sitemap is well under
      // the 50k/file protocol cap. Order freshest-first so that if we ever
      // do exceed the cap, the newest content is the content that ships.
      orderBy: { teachingNote: { generatedAt: "desc" } },
      take: 20000,
    })
    .catch(() => []);

  // Which exam sub-pages render (16 Sep 2026, src/lib/exam-page-gates.ts) —
  // /cutoff, /syllabus, /tricks, /guide and /build-mock are listed only for
  // exams whose page does not 404 / render empty. A failed read lists none of
  // them (GATES_CLOSED): a smaller sitemap beats one full of 404s.
  const pageGates = await loadExamPageGates().catch(() => new Map<string, ExamPageGates>());
  const gate = (code: string): ExamPageGates => pageGates.get(code) ?? GATES_CLOSED;

  // Honest per-page lastmod (26 Sep 2026, B-machine-crawl; the combiners and
  // why are in src/lib/sitemap-lastmod.ts): one grouped SELECT gives each
  // real exam its tracker change (ExamImportantDate has no updatedAt — rows
  // are archived and re-inserted, so createdAt and archivedAt both count)
  // and its newest non-suppressed news row. A failed read falls back to
  // Exam.updatedAt for the hub and archive (what they carried before) and no
  // lastmod for /updates.
  const freshness = await prisma
    .$queryRaw<(ExamFreshnessRow & { code: string })[]>`
      WITH d AS (
        SELECT "examId",
          MAX(GREATEST("createdAt", COALESCE("archivedAt", "createdAt"))) AS "trackerAt",
          MAX("archivedAt") AS "trackerArchivedAt"
        FROM "ExamImportantDate" GROUP BY 1
      ), n AS (
        SELECT "examId", MAX("publishedAt") AS "newsAt", MAX("archivedAt") AS "newsArchivedAt"
        FROM "ExamNewsItem" WHERE source IS NULL OR source <> ${SUPPRESSED_SOURCE}
        GROUP BY 1
      )
      SELECT e.code, e."updatedAt", d."trackerAt", d."trackerArchivedAt", n."newsAt", n."newsArchivedAt"
      FROM "Exam" e LEFT JOIN d ON d."examId" = e.id LEFT JOIN n ON n."examId" = e.id
      WHERE ${REAL_EXAM_SQL}
    `.catch(() => [] as (ExamFreshnessRow & { code: string })[]);
  const lastmodByCode = new Map(freshness.map((r) => [r.code, examPageLastmods(r)]));

  const examUrls: MetadataRoute.Sitemap = exams.map((e) => ({
    url: `${base}/exams/${e.code}`,
    lastModified: lastmodByCode.get(e.code)?.hub ?? e.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Per-exam cutoff + syllabus landings — the two highest-volume query
  // patterns ("[exam] cutoff 2026", "[exam] syllabus 2026") we now own a
  // dedicated page for. NOT every active exam has them (16 Sep 2026): the
  // cutoff page needs live rank bands (MP_RAEO and KA_KSRP have none) and
  // the syllabus page a Subject row (12 exams have none) — both 404
  // otherwise, and all 14 were sitemap URLs.
  const cutoffUrls: MetadataRoute.Sitemap = exams
    .filter((e) => gate(e.code).cutoff)
    .map((e) => ({
      url: `${base}/exams/${e.code}/cutoff`,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    }));
  const syllabusUrls: MetadataRoute.Sitemap = exams
    .filter((e) => gate(e.code).syllabus)
    .map((e) => ({
      url: `${base}/exams/${e.code}/syllabus`,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    }));
  // Exam-day pages (26 Sep 2026, G1 index hygiene): /checklist, /live,
  // /reactions and /score-estimate are listed only inside their windows —
  // src/lib/exam-week-gates.ts, the same verdict each page's Google-only
  // robots read, so a listed page is never noindex for Google:
  //   live / reactions  an announced (official / reported) typed exam day
  //                     from 3 days ahead to 30 days back;
  //   checklist         an announced typed exam day in the next 21 days or
  //                     the last 3;
  //   score-estimate    the live / reactions window AND an official answer
  //                     key out (not a future date).
  // One read of every real exam's live typed tracker rows in the range the
  // windows look at (plus a day of slack), uncached so this route keeps its
  // 24h revalidate. A failed read lists none of these pages — a smaller
  // sitemap beats one that lists noindex pages. Until today /checklist was
  // listed for every real exam all year, and the other three around exam
  // days of any tier (an expected date included).
  const gateRows = await prisma
    .$queryRaw<(TimelineInput & { code: string; officialUrl: string | null })[]>`
      SELECT e.code, d.id, d.label, d.date, d."isExamDay", d.kind, d.confidence, d.url, d.notes, d.source, el."officialUrl"
      FROM "ExamImportantDate" d
      JOIN "Exam" e ON e.id = d."examId"
      LEFT JOIN "ExamEligibility" el ON el."examId" = e.id
      WHERE ${REAL_EXAM_SQL} AND d."archivedAt" IS NULL AND d.kind IS NOT NULL
        AND d.date >= NOW() - make_interval(days => ${GATE_ROWS_PAST_DAYS}::int)
        AND d.date <= NOW() + make_interval(days => ${GATE_ROWS_AHEAD_DAYS}::int)
    `.catch(() => [] as (TimelineInput & { code: string; officialUrl: string | null })[]);
  const gateRowsByCode = groupGateRows(gateRows);
  const indexGates = new Map<string, ExamPageIndexGates>(
    [...gateRowsByCode].map(([code, rows]) => [code, examPageIndexGates(rows, rows[0]?.officialUrl ?? null)]),
  );
  const seasonGate = (code: string): ExamPageIndexGates => indexGates.get(code) ?? NO_GATES_OPEN;
  const estimatorExams = exams.filter((e) => seasonGate(e.code).scoreEstimate);
  const scoreEstimateUrls: MetadataRoute.Sitemap = estimatorExams.map((e) => ({
    url: `${base}/exams/${e.code}/score-estimate`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
  // Tricks & mnemonics landings — only exams that actually have generated
  // content (the page 404s otherwise, so the sitemap must not lead there).
  // The rule now lives in exam-page-gates (a row WITH content, 16 Sep 2026).
  const tricksUrls: MetadataRoute.Sitemap = exams.filter((e) => gate(e.code).tricks).map((e) => ({
    url: `${base}/exams/${e.code}/tricks`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));
  // "How to crack [exam]" guides — only exams with generated content.
  const guideUrls: MetadataRoute.Sitemap = exams.filter((e) => gate(e.code).guide).map((e) => ({
    url: `${base}/exams/${e.code}/guide`,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));
  // Exam tracker pages (23 Aug 2026) — "[exam] exam date / admit card /
  // result / notification" is the largest query class in this niche;
  // every active exam has a tracker. The Hindi/Telugu twins are listed
  // separately below, only when localised (localeTwinUrls).
  // 26 Sep 2026: lastmod = the tracker's own newest change (none on a failed read).
  const updatesUrls: MetadataRoute.Sitemap = exams.map((e) => ({
    url: `${base}/exams/${e.code}/updates`,
    ...lastModifiedField(lastmodByCode.get(e.code)?.updates),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));
  // Custom mock builder (1 Sep 2026) — "[exam] topic wise mock test" is
  // a real query class and each page carries unique content (that
  // exam's topic list with live question counts). Only exams whose bank
  // has at least one buildable topic (≥3 validated questions) — an
  // empty builder must never be a sitemap URL. (The buildable rule moved to
  // exam-page-gates on 16 Sep 2026, where the page's noindex reads it too.)
  const builderUrls: MetadataRoute.Sitemap = exams
    .filter((e) => gate(e.code).buildMock)
    .map((e) => ({
      url: `${base}/exams/${e.code}/build-mock`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  // Hindi/Telugu URL twins — ONLY the localised ones (13 Sep 2026, index
  // shape). A twin is listed when the native-script share of its rendered
  // body is ≥ 30% (src/lib/twin-localisation.ts) — the same verdict the
  // page's canonical + hreflang use, so the sitemap never lists a twin that
  // canonicalises to the English URL. Until then every active exam's hub,
  // tracker and cutoff twin was listed (+ estimator + calendar = 1,154 URLs)
  // although the hub twins were 91-93% English. Score estimator: the same
  // set as the English URL above (26 Sep 2026: its exam-week-gates window).
  // A failed measurement lists no twins — a smaller sitemap beats a wrong one.
  const { loadTwinVerdicts, loadCalendarTwinVerdict } = await import("@/lib/twin-localisation");
  const twinVerdicts = new Map((await loadTwinVerdicts("all").catch(() => [])).map((r) => [r.code, r.verdicts]));
  const calendarTwins = await loadCalendarTwinVerdict().catch(() => ({ hi: false, te: false }));
  const estimatorCodes = new Set(estimatorExams.map((e) => e.code));
  const localeTwinUrls: MetadataRoute.Sitemap = exams.flatMap((e) => {
    const v = twinVerdicts.get(e.code);
    if (!v) return [];
    return (["hi", "te"] as const).flatMap((lc) => [
      ...(v.hub[lc] ? [{ url: `${base}/${lc}/exams/${e.code}`, lastModified: lastmodByCode.get(e.code)?.hub ?? e.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 }] : []),
      ...(v.updates[lc] ? [{ url: `${base}/${lc}/exams/${e.code}/updates`, ...lastModifiedField(lastmodByCode.get(e.code)?.updates), changeFrequency: "daily" as const, priority: 0.7 }] : []),
      ...(gate(e.code).cutoff && v.cutoff[lc] ? [{ url: `${base}/${lc}/exams/${e.code}/cutoff`, changeFrequency: "weekly" as const, priority: 0.65 }] : []),
      ...(estimatorCodes.has(e.code) && v["score-estimate"][lc]
        ? [{ url: `${base}/${lc}/exams/${e.code}/score-estimate`, changeFrequency: "weekly" as const, priority: 0.5 }]
        : []),
    ]);
  });
  for (const lc of ["hi", "te"] as const) {
    if (calendarTwins[lc]) localeTwinUrls.push({ url: `${base}/${lc}/exam-calendar`, changeFrequency: "daily" as const, priority: 0.7 });
  }
  // Daily current-affairs pages — every date that has content.
  const caDates = await prisma
    .$queryRaw<{ d: Date }[]>`SELECT DISTINCT date AS d FROM "CurrentAffair" ORDER BY date DESC LIMIT 400`
    .catch(() => [] as { d: Date }[]);
  const currentAffairsUrls: MetadataRoute.Sitemap = caDates.map((r) => {
    const iso = r.d.toISOString().slice(0, 10);
    return {
      url: `${base}/current-affairs/${iso}`,
      lastModified: r.d,
      changeFrequency: "daily" as const,
      priority: 0.6,
    };
  });
  // Monthly capsule pages — one per month that has content.
  // 26 Sep 2026: lastmod = the newest current-affairs date in that month.
  const capsuleMonthMods = capsuleLastmods(caDates.map((r) => r.d));
  const capsuleUrls: MetadataRoute.Sitemap = [...capsuleMonthMods].map(([month, newestDay]) => ({
    url: `${base}/current-affairs/capsule/${month}`,
    lastModified: newestDay,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));
  currentAffairsUrls.push(...capsuleUrls);

  // Per-exam archive aggregator. One URL per active exam. Index target:
  // "[exam] previous year notifications", "[exam] postponement history".
  // Each archive page links to every per-news permalink below, so Google
  // discovers the long-tail trail in one crawl.
  // lastModified is the exam row's real timestamp (the 27 Aug revert had
  // re-introduced `new Date()` here — 178 URLs claiming "changed today"
  // every day, the spam signal the 25 Aug honesty pass removed elsewhere).
  // 26 Sep 2026: plus the newest archived tracker / news row the page lists.
  const examArchiveUrls: MetadataRoute.Sitemap = exams.map((e) => ({
    url: `${base}/exams/${e.code}/archive`,
    lastModified: lastmodByCode.get(e.code)?.archive ?? e.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.55,
  }));

  // Per-news permalink. EVERY ExamNewsItem we've ever generated — both
  // active (archivedAt IS NULL) and archived (archivedAt IS NOT NULL).
  // Each gets its own Article JSON-LD page at /exams/[code]/news/[id].
  // 13 Sep 2026 (index shape): the writer no longer mints a permalink per
  // restatement — a restated story updates its existing row in place
  // (src/lib/news-dedupe.ts), so this family now grows only by genuinely
  // new stories.
  // 26 Sep 2026 (G1): listed here only while the founder flag
  // NEWS_GOOGLE_NOINDEX is off (src/lib/news-index-policy.ts); with it on,
  // the permalinks are Google-only noindex and live in /sitemap-news.xml
  // for Bing. lastmod = publishedAt, never archivedAt — archiving is a
  // status change, not an edit (5,462 archived stories claimed an edit on
  // the day they were archived).
  const newsItems = newsInMainSitemap()
    ? await prisma.examNewsItem
        .findMany({
          where: { exam: REAL_EXAM_WHERE, OR: [{ source: null }, { source: { not: SUPPRESSED_SOURCE } }] },
          select: {
            id: true,
            examId: true,
            title: true,
            url: true,
            publishedAt: true,
            archivedAt: true,
            createdAt: true,
            exam: { select: { code: true } },
          },
          orderBy: { publishedAt: "desc" },
          // Sitemap protocol caps URLs per file at 50k. We over-provision a
          // limit here so a single exam catastrophe (50k news items somehow)
          // can't blow past the cap. Realistic ceiling is ~10-20k entries.
          take: 30_000,
        })
        .catch(() => [])
    : [];
  // 27 Sep 2026 (integration): canonical permalinks only — a duplicate-title
  // copy carries rel=canonical to another row (news-index-policy
  // selfCanonicalNewsRows, the /sitemap-news.xml rule). A failed eligibility
  // read lists every row, the page's own fallback.
  const newsOfficialUrls = newsItems.length
    ? await prisma.examEligibility
        .findMany({ where: { examId: { in: [...new Set(newsItems.map((n) => n.examId))] } }, select: { examId: true, officialUrl: true } })
        .then((es) => new Map(es.map((e) => [e.examId, e.officialUrl] as const)))
        .catch(() => null)
    : null;
  const newsListed = newsOfficialUrls ? selfCanonicalNewsRows(newsItems, newsOfficialUrls) : newsItems;
  const newsUrls: MetadataRoute.Sitemap = newsListed.map((n) => ({
    url: `${base}/exams/${n.exam.code}/news/${n.id}`,
    lastModified: n.publishedAt ?? n.createdAt,
    // Active items: weekly. Archived: yearly (content is immutable
    // after archival, so Google can crawl rarely).
    changeFrequency: (n.archivedAt ? "yearly" : "weekly") as
      | "yearly"
      | "weekly",
    priority: n.archivedAt ? 0.35 : 0.6,
  }));

  // Per-result permalink — "{exam} {stage} result {year}" is the largest
  // query family in this category. One URL per declared result.
  // 26 Sep 2026 (G1): only a result with an official link
  // (src/lib/result-permalink-copy.ts resultInSitemap — the page's own
  // Google robots rule); 50 of 52 rows had none. Its own family now, so the
  // news flag never takes results out.
  const resultRows = await prisma
    .$queryRaw<{ id: string; code: string; declaredOn: Date; officialUrl: string | null }[]>`
      SELECT r.id, e.code, r."declaredOn", r."officialUrl"
      FROM "ExamResult" r JOIN "Exam" e ON e.id = r."examId"
      WHERE r.stage <> '__not_a_result__' AND ${REAL_EXAM_SQL}
      ORDER BY r."declaredOn" DESC LIMIT 5000
    `.catch(() => [] as { id: string; code: string; declaredOn: Date; officialUrl: string | null }[]);
  const resultUrls: MetadataRoute.Sitemap = resultRows
    .filter((r) => resultInSitemap(r.officialUrl))
    .map((r) => ({
      url: `${base}/exams/${r.code}/results/${r.id}`,
      lastModified: r.declaredOn,
      changeFrequency: "weekly" as const,
      priority: 0.65,
    }));

  // Phase articles — the three time-sensitive long-form pieces per exam
  // (CHECKLIST / LIVE / REACTIONS). Each is a Claude-summarised, source-
  // cited article that lives at /exams/[code]/{checklist,live,reactions}.
  // Highest SEO leverage during the T-7 → T+3 window around exam day.
  const phaseArticles = await prisma.examPhaseArticle
    .findMany({
      // archivedAt: null — archived versions share the same /checklist
      // etc URL as their live successor, so only emit the active one to
      // avoid duplicate sitemap entries.
      where: { exam: REAL_EXAM_WHERE, archivedAt: null },
      select: {
        phase: true,
        slug: true,
        updatedAt: true,
        exam: { select: { code: true } },
      },
    })
    .catch(() => []);
  // /checklist has its own family below (checklistUrls), so only the
  // LIVE / REACTIONS article URLs come from here.
  // One entry per URL (13 Sep 2026): an exam can hold more than one active
  // row for a phase (two REACTIONS rows each for SSC CHSL and MHT CET), and
  // the sitemap listed those URLs twice. Keep the newest row's date.
  // 26 Sep 2026 (G1): an article URL is listed only inside its exam's
  // live / reactions window (exam-week-gates); the article's date is then
  // that URL's lastmod.
  const phaseByUrl = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const a of phaseArticles) {
    if (a.slug !== "live" && a.slug !== "reactions") continue;
    if (!seasonGate(a.exam.code).examWeek) continue;
    const url = `${base}/exams/${a.exam.code}/${a.slug}`;
    const prev = phaseByUrl.get(url);
    if (prev?.lastModified && new Date(prev.lastModified) >= a.updatedAt) continue;
    // LIVE refreshes frequently during the active window.
    phaseByUrl.set(url, { url, lastModified: a.updatedAt, changeFrequency: "daily" as const, priority: 0.7 });
  }
  const phaseUrls: MetadataRoute.Sitemap = [...phaseByUrl.values()];
  // Exam-day + after-the-paper pages (13 Sep 2026) lead with first-party
  // facts (src/lib/exam-night-facts.ts) whether or not an article exists —
  // list both for every exam inside its window (26 Sep 2026: the
  // exam-week-gates window, was loadExamWeekExams' ±7 days of any tier), once.
  const weekCodes = exams.filter((e) => seasonGate(e.code).examWeek).map((e) => e.code);
  const phaseListed = new Set(phaseUrls.map((u) => u.url));
  for (const code of weekCodes) {
    for (const slug of ["live", "reactions"]) {
      const url = `${base}/exams/${code}/${slug}`;
      if (phaseListed.has(url)) continue;
      phaseListed.add(url);
      phaseUrls.push({ url, changeFrequency: "daily" as const, priority: 0.7 });
    }
  }
  // Last-minute checklist (13 Sep 2026) — built from stored facts for every
  // exam (src/lib/exam-checklist.ts). SCHOOL_BOARD containers have no page.
  // 26 Sep 2026 (G1): listed only with an announced exam day in the next 21
  // days or the last 3 (exam-week-gates) — out of season it is a list of
  // "not announced yet" lines, Google-only noindex.
  const checklistExams = exams.filter((e) => seasonGate(e.code).checklist);
  const checklistUrls: MetadataRoute.Sitemap = checklistExams.map((e) => ({
    url: `${base}/exams/${e.code}/checklist`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // Previous-year-paper landing pages — one URL per (exam, year) for which
  // we have validated PYQ questions. These are extremely high-value
  // long-tail SEO targets ("CAT 2023 questions", "JEE Advanced 2024 paper")
  // and the content is immutable once published, hence changeFrequency
  // yearly. Distinct query keeps it to one URL per paper, not per question.
  // 26 Sep 2026: grouped per (exam, year) with lastmod = the newest question
  // on the set — created, or validated later (a question joins the page when
  // it is validated, not when it is written).
  const pyqSets = await prisma.$queryRaw<{ code: string; year: number; lastmod: Date | null }[]>`
    SELECT e."code" AS code, q."pyqYear" AS year,
      MAX(GREATEST(q."createdAt", COALESCE(q."validatedAt", q."createdAt"))) AS lastmod
    FROM "Question" q
    JOIN "Exam" e ON e.id = q."examId"
    WHERE q.source = 'PYQ'
      AND q."pyqYear" IS NOT NULL
      AND q.validated = TRUE
      AND ${REAL_EXAM_SQL}
    GROUP BY e."code", q."pyqYear"
  `.catch(() => [] as { code: string; year: number; lastmod: Date | null }[]);
  const pyqUrls: MetadataRoute.Sitemap = pyqSets.map((p) => ({
    url: `${base}/exams/${p.code}/pyq/${Number(p.year)}`,
    ...lastModifiedField(p.lastmod),
    changeFrequency: "yearly" as const,
    priority: 0.6,
  }));

  // Persona landing pages — intent-based hubs ("/for/engineering-aspirant")
  // that curate exams + articles for a visitor archetype. Strong SEO for
  // "how to prepare for ..." style queries; statically defined in data.
  const personaUrls: MetadataRoute.Sitemap = PERSONAS.map((p) => ({
    url: `${base}/for/${p.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // One URL per state we actually have exams for. Highest-priority SEO
  // surface for state-specific queries — these pages should rank for
  // "Tamil Nadu entrance exams", "Bihar government exams", etc.
  const statesWithExams = new Set(
    exams
      .map((e) => e.state)
      .filter((s): s is string => Boolean(s) && (s as string) in STATES),
  );
  // lastModified = the newest exam update in the state (15 Sep 2026).
  const stateLastMod = new Map<string, Date>();
  for (const e of exams) {
    if (!e.state) continue;
    const prev = stateLastMod.get(e.state);
    if (!prev || e.updatedAt > prev) stateLastMod.set(e.state, e.updatedAt);
  }
  const stateUrls: MetadataRoute.Sitemap = Array.from(statesWithExams).map((code) => ({
    url: `${base}/exams/state/${stateSlug(code)}`,
    lastModified: stateLastMod.get(code),
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  const topicUrls: MetadataRoute.Sitemap = topics.map((t) => ({
    url: `${base}/exams/${t.subject.exam.code}/topics/${t.code}`,
    lastModified: t.teachingNote?.generatedAt ?? t.createdAt,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Hindi twins (gap-fill #3) — one /hi URL per topic with a Hindi
  // translation, hreflang-paired in page metadata.
  const hindiTopics = await prisma.topicNoteTranslation
    .findMany({
      where: { locale: "hi", topic: { subject: { exam: REAL_EXAM_WHERE } } },
      select: {
        generatedAt: true,
        topic: { select: { code: true, subject: { select: { exam: { select: { code: true } } } } } },
      },
      take: 20000,
    })
    .catch(() => []);
  const hindiTopicUrls: MetadataRoute.Sitemap = hindiTopics.map((t) => ({
    url: `${base}/exams/${t.topic.subject.exam.code}/topics/${t.topic.code}/hi`,
    lastModified: t.generatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Lifecycle section landings — same depth and priority as /exams so
  // Google understands the homepage is a hub, not a single-purpose page.
  // 25 Sep 2026: "/schooling" and "/schooling/streams" left this list with
  // the rest of the school URLs; 26 Sep 2026: the live school pages are
  // listed from the DB (see "School pages" further down).
  // 26 Sep 2026 (B-machine-crawl): the list is the module-level
  // SECTION_LANDING_PATHS above, exported so tests/unit/robots-sections.test.ts
  // can prove robots.txt lets every crawler fetch each one.
  const sectionLandings: MetadataRoute.Sitemap = SECTION_LANDING_PATHS.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  // 27 Sep 2026: one permanent page per published Shishya Pulse week;
  // lastmod is the fixed Monday 00:00 IST it was published (the rows and
  // the clock read live in src/lib/pulse-rules.ts).
  const pulseUrls: MetadataRoute.Sitemap = pulseSitemapEntries(base);

  // Per-college URLs (Phase 2). Each NIRF-ranked college is a separate
  // indexable page targeting long-tail queries like "IIT Madras admission",
  // "NIRF rank AIIMS Delhi", etc.
  const collegeUrls: MetadataRoute.Sitemap = COLLEGES.map((c) => ({
    url: `${base}/colleges/${c.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Per-stream college aggregator pages — head SEO targets:
  // "top engineering colleges India", "best medical colleges India NIRF",
  // "top NLU India law" etc.
  const streamUrls: MetadataRoute.Sitemap = ALL_STREAMS.map((s) => ({
    url: `${base}/colleges/stream/${s.value}`,
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  // School pages (25 Sep 2026): every /schooling URL (landing, streams,
  // 20 boards, 10 classes, 77 subjects, 154 chapters = 263 URLs) left the
  // sitemap while the section was noindex — a noindex URL in the sitemap is
  // a "Submitted URL marked noindex" error in Search Console (the 17 Sep
  // not-indexed clean-up).
  // 26 Sep 2026 (school go-live): the school section is listed from the DB
  // rows through src/lib/school/surface.ts — the CBSE (NCERT) and CISCE
  // board pages, every seeded class (SCHOOL_BOARD containers by category:
  // they are inactive by design, src/lib/school/scope.ts), every subject,
  // and only the chapters that carry Shishya's own notes or >= 5
  // answer-checked questions (the chapter page's own indexable rule, so a
  // listed chapter is never noindex). lastmod comes from the note / question
  // timestamps or the Exam row's updatedAt, never new Date(). A failed read
  // lists no school URL. 26 Sep 2026 (fixer): the spine identity keeps a
  // subject with no book and no chapter (NCERT Class 9 ICT, "Coming Soon" in
  // NCERT's index — a page of one sentence) off the list.
  // 26 Sep 2026 (integrator): the section hub, the streams article and the
  // board pages without a seeded tree are listed by the board page's own
  // rule (src/lib/school/landings.ts, isSchoolBoardIndexable) — before this
  // the section's entry page and five indexable pages were unsubmitted.
  const schoolSurface = await loadSchoolSurface().catch(() => EMPTY_SCHOOL_SURFACE);
  const schoolUrls: MetadataRoute.Sitemap = [...schoolLandingSitemapEntries(schoolSurface, base), ...schoolSitemapEntries(schoolSurface, base, schoolClassIdentity)];

  // Per-scholarship pages — long-tail SEO ("Reliance Foundation UG
  // scholarship 2026", "AICTE Pragati eligibility", etc.)
  // 27 Sep 2026 (integration): open schemes only — a discontinued scheme's
  // page is noindex,follow (scholarships/[id], isOpenScheme), and a URL in
  // the sitemap Google reads is never a noindex page.
  const scholarshipUrls: MetadataRoute.Sitemap = SCHOLARSHIP_SCHEMES.filter(isOpenScheme).map((s) => ({
    url: `${base}/scholarships/${s.id}`,
    changeFrequency: "monthly" as const,
    priority: 0.65,
  }));

  // Worldwide: country + per-university + test-prep URLs.
  const countryUrls: MetadataRoute.Sitemap = WORLDWIDE_COUNTRIES.map((c) => ({
    url: `${base}/worldwide/${c.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));
  const universityUrls: MetadataRoute.Sitemap = WORLDWIDE_COUNTRIES.flatMap((c) =>
    c.universities.map((u) => ({
      url: `${base}/worldwide/${c.slug}/${u.slug}`,
        changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  );
  const testPrepUrls: MetadataRoute.Sitemap = TEST_PREP.map((t) => ({
    url: `${base}/worldwide/test-prep/${t.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.65,
  }));

  // Insights editorial articles.
  const insightUrls: MetadataRoute.Sitemap = INSIGHTS_ARTICLES.map((a) => ({
    url: `${base}/insights/${a.slug}`,
    lastModified: new Date(a.publishedOn),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Career path pages — high-volume long-tail SEO ("software engineer
  // salary india", "how to become IAS", etc.)
  const careerUrls: MetadataRoute.Sitemap = CAREERS.map((c) => ({
    url: `${base}/careers/${c.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  // Per-branch college pages — long-tail SEO for "[college] [branch]
  // cutoff/placement/salary" queries.
  const branchUrls: MetadataRoute.Sitemap = allBranchPaths().map((p) => ({
    url: `${base}/colleges/${p.collegeSlug}/${p.branchSlug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Public user profiles — only users who opted in via /me/settings.
  // Raw SQL avoids the typed client (Windows file-lock workaround for
  // newly-added User.handle / User.profilePublic fields).
  const publicProfiles = await prisma.$queryRaw<{ handle: string; updatedAt: Date }[]>`
    SELECT "handle", "updatedAt"
    FROM "User"
    WHERE "profilePublic" = TRUE AND "handle" IS NOT NULL
    LIMIT 5000
  `.catch(() => [] as { handle: string; updatedAt: Date }[]);
  const userProfileUrls: MetadataRoute.Sitemap = publicProfiles.map((u) => ({
    url: `${base}/u/${u.handle}`,
    lastModified: u.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.4,
  }));

  // Per-state college aggregator pages — "top colleges in Tamil Nadu",
  // "best colleges in UP", etc.
  const collegeStateUrls: MetadataRoute.Sitemap = Array.from(
    new Set(COLLEGES.map((c) => c.state)),
  )
    .filter((code): code is string => Boolean(code) && code in STATES)
    .map((code) => ({
      url: `${base}/colleges/state/${stateSlug(code)}`,
        changeFrequency: "weekly" as const,
      priority: 0.85,
    }));

  // Families built by other groups (26 Sep 2026): the main session registers
  // their providers in src/lib/sitemap-sections.ts EXTRA_SITEMAP_PROVIDERS
  // (each guarded — a failing provider lists nothing).
  const extraUrls: MetadataRoute.Sitemap = await extraSitemapEntries(base);

  // One entry per URL (26 Sep 2026): the first family to list a URL keeps it.
  return dedupeSitemap([
    {
      url: base,
      // The one honest new Date(): the homepage genuinely changes daily
      // (live counters, calendar, current affairs).
        changeFrequency: "daily" as const,
      priority: 1.0,
    },
    ...sectionLandings,
    ...pulseUrls,
    ...stateUrls,
    ...examUrls,
    ...cutoffUrls,
    ...syllabusUrls,
    ...scoreEstimateUrls,
    ...tricksUrls,
    ...guideUrls,
    ...updatesUrls,
    ...checklistUrls,
    ...builderUrls,
    ...localeTwinUrls,
    ...currentAffairsUrls,
    ...examArchiveUrls,
    ...phaseUrls,
    ...pyqUrls,
    ...personaUrls,
    ...newsUrls,
    ...resultUrls,
    ...topicUrls,
    ...hindiTopicUrls,
    ...streamUrls,
    ...collegeStateUrls,
    ...collegeUrls,
    ...schoolUrls,
    ...scholarshipUrls,
    ...countryUrls,
    ...universityUrls,
    ...testPrepUrls,
    ...insightUrls,
    ...careerUrls,
    ...branchUrls,
    ...userProfileUrls,
    ...extraUrls,
  ]);
}
