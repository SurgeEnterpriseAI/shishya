// Dynamic sitemap — Google + Bing discover all 163 exam pages plus the
// public marketing surfaces from one fetch. Refreshes daily via Next's
// revalidate (cheap because the underlying query is tiny).

import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db/prisma";
import { STATES, stateSlug } from "@/lib/state-info";
import { COLLEGES, ALL_STREAMS } from "@/lib/colleges-data";
import { BOARDS } from "@/lib/schooling-data";
import { CLASS_SYLLABUS, allChapterPaths } from "@/lib/schooling-subjects";
import { SCHOLARSHIPS } from "@/data/scholarships";
import { WORLDWIDE_COUNTRIES, TEST_PREP } from "@/lib/worldwide-data";
import { INSIGHTS_ARTICLES } from "@/data/insights-articles";
import { CAREERS } from "@/data/careers";
import { allBranchPaths } from "@/data/college-details";
import { PERSONAS } from "@/data/personas";

export const revalidate = 86_400; // 24h

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://shishya.in";

  // Every DB query below is `.catch(() => [])`-guarded. The sitemap is
  // served to crawlers; if a transient Neon hiccup threw here the WHOLE
  // sitemap would 500 and Google would drop pages from its index. Better
  // to emit a slightly smaller sitemap than none at all — the static
  // section landings always render regardless.
  const exams = await prisma.exam
    .findMany({
      where: { active: true },
      select: { code: true, state: true, updatedAt: true },
      orderBy: { candidatesPerYear: "desc" },
    })
    .catch(() => [] as { code: string; state: string | null; updatedAt: Date }[]);

  const topics = await prisma.topic
    .findMany({
      where: { teachingNote: { isNot: null }, subject: { exam: { active: true } } },
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

  const examUrls: MetadataRoute.Sitemap = exams.map((e) => ({
    url: `${base}/exams/${e.code}`,
    lastModified: e.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Per-exam cutoff + syllabus landings — the two highest-volume query
  // patterns ("[exam] cutoff 2026", "[exam] syllabus 2026") we now own a
  // dedicated page for. Every active exam has rank bands + a syllabus tree.
  const cutoffUrls: MetadataRoute.Sitemap = exams.map((e) => ({
    url: `${base}/exams/${e.code}/cutoff`,
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));
  const syllabusUrls: MetadataRoute.Sitemap = exams.map((e) => ({
    url: `${base}/exams/${e.code}/syllabus`,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));
  // Score estimator (6 Sep 2026, Exam Week Mode) — the marking-scheme
  // calculator at /exams/[code]/score-estimate exists for every active
  // exam but is only worth a crawl around exam day: emit it for exams with
  // a TYPED exam-day row within ±30 days (untyped legacy rows never count).
  const estimatorExams = await prisma
    .$queryRaw<{ code: string }[]>`
      SELECT DISTINCT e.code FROM "Exam" e
      JOIN "ExamImportantDate" d ON d."examId" = e.id
      WHERE e.active = TRUE AND d."archivedAt" IS NULL AND d.kind = 'EXAM'
        AND d.date >= NOW() - INTERVAL '30 days' AND d.date <= NOW() + INTERVAL '30 days'
    `.catch(() => [] as { code: string }[]);
  const scoreEstimateUrls: MetadataRoute.Sitemap = estimatorExams.map((e) => ({
    url: `${base}/exams/${e.code}/score-estimate`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
  // Tricks & mnemonics landings — only exams that actually have generated
  // content (the page 404s otherwise, so the sitemap must not lead there).
  const tricksExams = await prisma
    .$queryRaw<{ code: string }[]>`
      SELECT e.code FROM "Exam" e
      JOIN "ExamTricks" t ON t."examId" = e.id
      WHERE e.active = TRUE
    `.catch(() => [] as { code: string }[]);
  const tricksUrls: MetadataRoute.Sitemap = tricksExams.map((e) => ({
    url: `${base}/exams/${e.code}/tricks`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));
  // "How to crack [exam]" guides — only exams with generated content.
  const guideExams = await prisma
    .$queryRaw<{ code: string }[]>`
      SELECT e.code FROM "Exam" e
      JOIN "ExamGuide" g ON g."examId" = e.id
      WHERE e.active = TRUE
    `.catch(() => [] as { code: string }[]);
  const guideUrls: MetadataRoute.Sitemap = guideExams.map((e) => ({
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
  // empty builder must never be a sitemap URL.
  const buildable = new Set(
    (
      await prisma
        .$queryRaw<{ code: string }[]>`
          SELECT DISTINCT e.code FROM "Exam" e
          JOIN "Subject" s ON s."examId" = e.id JOIN "Topic" t ON t."subjectId" = s.id
          JOIN "Question" q ON q."topicId" = t.id AND q.validated = TRUE
          WHERE e.active = TRUE GROUP BY e.code, t.id HAVING COUNT(q.id) >= 3`
        .catch(() => [] as { code: string }[])
    ).map((r) => r.code),
  );
  const builderUrls: MetadataRoute.Sitemap = exams
    .filter((e) => buildable.has(e.code))
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
  // ±30-day exam-day set as the English URL above. A failed measurement
  // lists no twins — a smaller sitemap beats a wrong one.
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
      ...(v.cutoff[lc] ? [{ url: `${base}/${lc}/exams/${e.code}/cutoff`, changeFrequency: "weekly" as const, priority: 0.65 }] : []),
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
      where: { exam: { active: true } },
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
      WHERE r.stage <> '__not_a_result__' AND e.active = TRUE
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
      where: { exam: { active: true }, archivedAt: null },
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
    .$queryRaw<{ code: string }[]>`SELECT code FROM "Exam" WHERE active = TRUE AND category::text <> 'SCHOOL_BOARD'`
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
      AND e.active = TRUE
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
  const stateUrls: MetadataRoute.Sitemap = Array.from(statesWithExams).map((code) => ({
    url: `${base}/exams/state/${stateSlug(code)}`,
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
      where: { locale: "hi", topic: { subject: { exam: { active: true } } } },
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
  const sectionLandings: MetadataRoute.Sitemap = [
    "/schooling",
    "/colleges",
    "/scholarships",
    // "/exams" is a permanent redirect to "/" — never list a redirect.
    "/exams/browse",
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
    "/schooling/streams",
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

  // Per-board schooling pages.
  const boardUrls: MetadataRoute.Sitemap = BOARDS.map((b) => ({
    url: `${base}/schooling/${b.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Per-class schooling pages — one URL per (board, class) we've populated.
  // SEO targets: "CBSE Class 10 syllabus", "ICSE Class 12 subjects", etc.
  const classUrls: MetadataRoute.Sitemap = CLASS_SYLLABUS.map((c) => ({
    url: `${base}/schooling/${c.boardSlug}/class-${c.classNum}`,
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  // Per-subject schooling pages — one URL per (board, class, subject).
  // Long-tail SEO: "CBSE Class 12 Physics chapters", "ICSE Class 10
  // Mathematics NCERT", etc.
  const subjectUrls: MetadataRoute.Sitemap = CLASS_SYLLABUS.flatMap((c) =>
    c.subjects.map((s) => ({
      url: `${base}/schooling/${c.boardSlug}/class-${c.classNum}/${s.slug}`,
        changeFrequency: "monthly" as const,
      priority: 0.65,
    })),
  );

  // Per-chapter schooling pages — only emitted for subjects that have
  // an authored chapter list. Highest-density long-tail SEO.
  const chapterUrls: MetadataRoute.Sitemap = allChapterPaths().map((p) => ({
    url: `${base}/schooling/${p.boardSlug}/class-${p.classNum}/${p.subjectSlug}/${p.chapterSlug}`,
    changeFrequency: "monthly" as const,
    priority: 0.55,
  }));

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
    ...boardUrls,
    ...classUrls,
    ...subjectUrls,
    ...chapterUrls,
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
