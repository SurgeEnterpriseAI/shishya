// Dynamic sitemap — Google + Bing discover all 163 exam pages plus the
// public marketing surfaces from one fetch. Refreshes daily via Next's
// revalidate (cheap because the underlying query is tiny).

import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db/prisma";
import { NOT_SCHOOL_WHERE, REAL_EXAM_SQL, REAL_EXAM_WHERE } from "@/lib/db/exam-scope";
import { SUPPRESSED_SOURCE } from "@/lib/exam-timeline";
import { loadExamWeekInputs } from "@/lib/exam-week-inputs";
import { standingSitting } from "@/lib/score-sitting";
import { STATES, stateSlug } from "@/lib/state-info";
import { COLLEGES, ALL_STREAMS } from "@/lib/colleges-data";
import { SCHOLARSHIPS } from "@/data/scholarships";
import { WORLDWIDE_COUNTRIES, TEST_PREP } from "@/lib/worldwide-data";
import { INSIGHTS_ARTICLES } from "@/data/insights-articles";
import { CAREERS } from "@/data/careers";
import { allBranchPaths } from "@/data/college-details";
import { PERSONAS } from "@/data/personas";
import { GATES_CLOSED, loadExamPageGates, type ExamPageGates } from "@/lib/exam-page-gates";

export const revalidate = 86_400; // 24h

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

  const examUrls: MetadataRoute.Sitemap = exams.map((e) => ({
    url: `${base}/exams/${e.code}`,
    lastModified: e.updatedAt,
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
  // Score estimator (6 Sep 2026, Exam Week Mode) — the marking-scheme
  // calculator at /exams/[code]/score-estimate exists for every active
  // exam but is only worth a crawl around exam day: emit it for exams with
  // a TYPED exam-day row within ±30 days (untyped legacy rows never count),
  // or (14 Sep 2026) while a sitting is open for comparison after its answer
  // key — answer-key time, often weeks after the exam, is when candidates
  // count. That second set is exactly the page's own "where do I stand?"
  // gate (standingSitting): an answer key on the conducting body's host
  // (tier "official"; a row marked official but linked to a coaching or
  // jobs site is "reported" and does not count), on or after the last held
  // exam day, under 45 days old, on a paper whose marking scheme can be
  // stated. The SQL only narrows the candidates; the tracker rows are read
  // uncached so this route keeps its 24h revalidate.
  const examDayEstimators = await prisma
    .$queryRaw<{ code: string }[]>`
      SELECT DISTINCT e.code FROM "Exam" e
      JOIN "ExamImportantDate" d ON d."examId" = e.id
      WHERE ${REAL_EXAM_SQL} AND d."archivedAt" IS NULL
        AND d.kind = 'EXAM' AND d.date >= NOW() - INTERVAL '30 days' AND d.date <= NOW() + INTERVAL '30 days'
    `.catch(() => [] as { code: string }[]);
  const answerKeyCandidates = await prisma
    .$queryRaw<{ id: string }[]>`
      SELECT DISTINCT e.id FROM "Exam" e
      JOIN "ExamImportantDate" d ON d."examId" = e.id
      WHERE ${REAL_EXAM_SQL} AND d."archivedAt" IS NULL
        AND d.kind = 'ANSWER_KEY' AND d.confidence = 'official'
        AND d.date >= NOW() - INTERVAL '45 days' AND d.date <= NOW()
    `.catch(() => [] as { id: string }[]);
  const answerKeyExams = answerKeyCandidates.length
    ? await prisma.exam
        .findMany({
          where: { ...NOT_SCHOOL_WHERE, id: { in: answerKeyCandidates.map((r) => r.id) } },
          select: {
            id: true,
            code: true,
            shortName: true,
            name: true,
            active: true,
            description: true,
            totalQuestions: true,
            scoredQuestions: true,
            totalMarks: true,
            marksPerQ: true,
            negativeMark: true,
          },
        })
        .catch(() => [])
    : [];
  const answerKeyOpen = (
    await Promise.all(answerKeyExams.map(async (e) => (standingSitting(e, await loadExamWeekInputs(e.id)) ? e.code : null))).catch(
      () => [] as (string | null)[],
    )
  ).filter((c): c is string => c !== null);
  const estimatorExams = [...new Set([...examDayEstimators.map((e) => e.code), ...answerKeyOpen])].map((code) => ({ code }));
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
  const updatesUrls: MetadataRoute.Sitemap = exams.map((e) => ({
    url: `${base}/exams/${e.code}/updates`,
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
  // set as the English URL above (exam day ±30 days, or a sitting open
  // after its answer key). A failed measurement lists no twins — a smaller
  // sitemap beats a wrong one.
  const { loadTwinVerdicts, loadCalendarTwinVerdict } = await import("@/lib/twin-localisation");
  const twinVerdicts = new Map((await loadTwinVerdicts("all").catch(() => [])).map((r) => [r.code, r.verdicts]));
  const calendarTwins = await loadCalendarTwinVerdict().catch(() => ({ hi: false, te: false }));
  const estimatorCodes = new Set(estimatorExams.map((e) => e.code));
  const localeTwinUrls: MetadataRoute.Sitemap = exams.flatMap((e) => {
    const v = twinVerdicts.get(e.code);
    if (!v) return [];
    return (["hi", "te"] as const).flatMap((lc) => [
      ...(v.hub[lc] ? [{ url: `${base}/${lc}/exams/${e.code}`, lastModified: e.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 }] : []),
      ...(v.updates[lc] ? [{ url: `${base}/${lc}/exams/${e.code}/updates`, changeFrequency: "daily" as const, priority: 0.7 }] : []),
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
  const capsuleMonths = [...new Set(caDates.map((r) => r.d.toISOString().slice(0, 7)))];
  const capsuleUrls: MetadataRoute.Sitemap = capsuleMonths.map((month) => ({
    url: `${base}/current-affairs/capsule/${month}`,
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
  const examArchiveUrls: MetadataRoute.Sitemap = exams.map((e) => ({
    url: `${base}/exams/${e.code}/archive`,
    lastModified: e.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.55,
  }));

  // Per-news permalink. EVERY ExamNewsItem we've ever generated — both
  // active (archivedAt IS NULL) and archived (archivedAt IS NOT NULL).
  // Each gets its own NewsArticle JSON-LD page at /exams/[code]/news/[id].
  // 13 Sep 2026 (index shape): the writer no longer mints a permalink per
  // restatement — a restated story updates its existing row in place
  // (src/lib/news-dedupe.ts), so this family now grows only by genuinely
  // new stories. Archived rows stay listed (noindex decision pending).
  const newsItems = await prisma.examNewsItem
    .findMany({
      where: { exam: REAL_EXAM_WHERE, OR: [{ source: null }, { source: { not: SUPPRESSED_SOURCE } }] },
      select: {
        id: true,
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
    .catch(() => []);
  const newsUrls: MetadataRoute.Sitemap = newsItems.map((n) => ({
    url: `${base}/exams/${n.exam.code}/news/${n.id}`,
    lastModified: n.archivedAt ?? n.publishedAt ?? n.createdAt,
    // Active items: weekly. Archived: yearly (content is immutable
    // after archival, so Google can crawl rarely).
    changeFrequency: (n.archivedAt ? "yearly" : "weekly") as
      | "yearly"
      | "weekly",
    priority: n.archivedAt ? 0.35 : 0.6,
  }));

  // Per-result permalink — "{exam} {stage} result {year}" is the largest
  // query family in this category. One URL per declared result.
  const resultRows = await prisma
    .$queryRaw<{ id: string; code: string; declaredOn: Date }[]>`
      SELECT r.id, e.code, r."declaredOn"
      FROM "ExamResult" r JOIN "Exam" e ON e.id = r."examId"
      WHERE r.stage <> '__not_a_result__' AND ${REAL_EXAM_SQL}
      ORDER BY r."declaredOn" DESC LIMIT 5000
    `.catch(() => [] as { id: string; code: string; declaredOn: Date }[]);
  newsUrls.push(
    ...resultRows.map((r) => ({
      url: `${base}/exams/${r.code}/results/${r.id}`,
      lastModified: r.declaredOn,
      changeFrequency: "weekly" as const,
      priority: 0.65,
    })),
  );

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
  // /checklist is listed for every exam below (checklistUrls), so only the
  // LIVE / REACTIONS article URLs come from here.
  // One entry per URL (13 Sep 2026): an exam can hold more than one active
  // row for a phase (two REACTIONS rows each for SSC CHSL and MHT CET), and
  // the sitemap listed those URLs twice. Keep the newest row's date.
  const phaseByUrl = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const a of phaseArticles) {
    if (a.slug === "checklist") continue;
    const url = `${base}/exams/${a.exam.code}/${a.slug}`;
    const prev = phaseByUrl.get(url);
    if (prev?.lastModified && new Date(prev.lastModified) >= a.updatedAt) continue;
    // LIVE refreshes frequently during the active window.
    phaseByUrl.set(url, { url, lastModified: a.updatedAt, changeFrequency: "daily" as const, priority: 0.7 });
  }
  const phaseUrls: MetadataRoute.Sitemap = [...phaseByUrl.values()];
  // Exam-day + after-the-paper pages (13 Sep 2026) lead with first-party
  // facts (src/lib/exam-night-facts.ts) whether or not an article exists —
  // list both for every exam inside exam week, once.
  const { loadExamWeekExams } = await import("@/lib/exam-week-aeo");
  const weekCodes = (await loadExamWeekExams().catch(() => [])).map((e) => e.code);
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
  const checklistExams = await prisma
    .$queryRaw<{ code: string }[]>`SELECT e.code FROM "Exam" e WHERE ${REAL_EXAM_SQL}`
    .catch(() => [] as { code: string }[]);
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
  const pyqSets = await prisma.$queryRaw<{ code: string; year: number }[]>`
    SELECT DISTINCT e."code" AS code, q."pyqYear" AS year
    FROM "Question" q
    JOIN "Exam" e ON e.id = q."examId"
    WHERE q.source = 'PYQ'
      AND q."pyqYear" IS NOT NULL
      AND q.validated = TRUE
      AND ${REAL_EXAM_SQL}
  `.catch(() => [] as { code: string; year: number }[]);
  const pyqUrls: MetadataRoute.Sitemap = pyqSets.map((p) => ({
    url: `${base}/exams/${p.code}/pyq/${Number(p.year)}`,
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
  // the rest of the school URLs (see "School pages" further down).
  const sectionLandings: MetadataRoute.Sitemap = [
    "/colleges",
    "/scholarships",
    // "/exams" is a permanent redirect to "/" — never list a redirect.
    "/exams/browse",
    // Government exams by state — the index every state page hangs under (15 Sep 2026).
    "/exams/state",
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
  ].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

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
  // 20 boards, 10 classes, 77 subjects, 154 chapters = 263 URLs) is out of
  // the sitemap. The school build made the whole section noindex
  // (SCHOOLING_ROBOTS, src/app/schooling/layout.tsx) until content passes a
  // gate, and a noindex URL in the sitemap is a "Submitted URL marked
  // noindex" error in Search Console (the 17 Sep not-indexed clean-up).
  // They come back per page, with the content gate, not before.

  // Per-scholarship pages — long-tail SEO ("Reliance Foundation UG
  // scholarship 2026", "AICTE Pragati eligibility", etc.)
  const scholarshipUrls: MetadataRoute.Sitemap = SCHOLARSHIPS.map((s) => ({
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

  return [
    {
      url: base,
      // The one honest new Date(): the homepage genuinely changes daily
      // (live counters, calendar, current affairs).
        changeFrequency: "daily" as const,
      priority: 1.0,
    },
    ...sectionLandings,
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
    ...topicUrls,
    ...hindiTopicUrls,
    ...streamUrls,
    ...collegeStateUrls,
    ...collegeUrls,
    ...scholarshipUrls,
    ...countryUrls,
    ...universityUrls,
    ...testPrepUrls,
    ...insightUrls,
    ...careerUrls,
    ...branchUrls,
    ...userProfileUrls,
  ];
}
