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
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));
  const syllabusUrls: MetadataRoute.Sitemap = exams.map((e) => ({
    url: `${base}/exams/${e.code}/syllabus`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.75,
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
    lastModified: new Date(),
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
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  // Per-exam archive aggregator. One URL per active exam. Index target:
  // "[exam] previous year notifications", "[exam] postponement history".
  // Each archive page links to every per-news permalink below, so Google
  // discovers the long-tail trail in one crawl.
  const examArchiveUrls: MetadataRoute.Sitemap = exams.map((e) => ({
    url: `${base}/exams/${e.code}/archive`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.55,
  }));

  // Per-news permalink. EVERY ExamNewsItem we've ever generated — both
  // active (archivedAt IS NULL) and archived (archivedAt IS NOT NULL).
  // Each gets its own NewsArticle JSON-LD page at /exams/[code]/news/[id].
  // This is the BIG SEO multiplier: every cron tick produces ~5-10 news
  // items per top-tier exam → the index grows by hundreds of long-tail
  // keyword pages per week, no manual authoring required.
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
  const phaseUrls: MetadataRoute.Sitemap = phaseArticles.map((a) => ({
    url: `${base}/exams/${a.exam.code}/${a.slug}`,
    lastModified: a.updatedAt,
    // CHECKLIST + LIVE refresh frequently during the active window.
    changeFrequency: "daily" as const,
    priority: 0.7,
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
    lastModified: new Date(),
    changeFrequency: "yearly" as const,
    priority: 0.6,
  }));

  // Persona landing pages — intent-based hubs ("/for/engineering-aspirant")
  // that curate exams + articles for a visitor archetype. Strong SEO for
  // "how to prepare for ..." style queries; statically defined in data.
  const personaUrls: MetadataRoute.Sitemap = PERSONAS.map((p) => ({
    url: `${base}/for/${p.slug}`,
    lastModified: new Date(),
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
    lastModified: new Date(),
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
    "/exams",
    "/exams/browse",
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
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  // Per-college URLs (Phase 2). Each NIRF-ranked college is a separate
  // indexable page targeting long-tail queries like "IIT Madras admission",
  // "NIRF rank AIIMS Delhi", etc.
  const collegeUrls: MetadataRoute.Sitemap = COLLEGES.map((c) => ({
    url: `${base}/colleges/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Per-stream college aggregator pages — head SEO targets:
  // "top engineering colleges India", "best medical colleges India NIRF",
  // "top NLU India law" etc.
  const streamUrls: MetadataRoute.Sitemap = ALL_STREAMS.map((s) => ({
    url: `${base}/colleges/stream/${s.value}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  // Per-board schooling pages.
  const boardUrls: MetadataRoute.Sitemap = BOARDS.map((b) => ({
    url: `${base}/schooling/${b.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Per-class schooling pages — one URL per (board, class) we've populated.
  // SEO targets: "CBSE Class 10 syllabus", "ICSE Class 12 subjects", etc.
  const classUrls: MetadataRoute.Sitemap = CLASS_SYLLABUS.map((c) => ({
    url: `${base}/schooling/${c.boardSlug}/class-${c.classNum}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  // Per-subject schooling pages — one URL per (board, class, subject).
  // Long-tail SEO: "CBSE Class 12 Physics chapters", "ICSE Class 10
  // Mathematics NCERT", etc.
  const subjectUrls: MetadataRoute.Sitemap = CLASS_SYLLABUS.flatMap((c) =>
    c.subjects.map((s) => ({
      url: `${base}/schooling/${c.boardSlug}/class-${c.classNum}/${s.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.65,
    })),
  );

  // Per-chapter schooling pages — only emitted for subjects that have
  // an authored chapter list. Highest-density long-tail SEO.
  const chapterUrls: MetadataRoute.Sitemap = allChapterPaths().map((p) => ({
    url: `${base}/schooling/${p.boardSlug}/class-${p.classNum}/${p.subjectSlug}/${p.chapterSlug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.55,
  }));

  // Per-scholarship pages — long-tail SEO ("Reliance Foundation UG
  // scholarship 2026", "AICTE Pragati eligibility", etc.)
  const scholarshipUrls: MetadataRoute.Sitemap = SCHOLARSHIPS.map((s) => ({
    url: `${base}/scholarships/${s.id}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.65,
  }));

  // Worldwide: country + per-university + test-prep URLs.
  const countryUrls: MetadataRoute.Sitemap = WORLDWIDE_COUNTRIES.map((c) => ({
    url: `${base}/worldwide/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));
  const universityUrls: MetadataRoute.Sitemap = WORLDWIDE_COUNTRIES.flatMap((c) =>
    c.universities.map((u) => ({
      url: `${base}/worldwide/${c.slug}/${u.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  );
  const testPrepUrls: MetadataRoute.Sitemap = TEST_PREP.map((t) => ({
    url: `${base}/worldwide/test-prep/${t.slug}`,
    lastModified: new Date(),
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
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  // Per-branch college pages — long-tail SEO for "[college] [branch]
  // cutoff/placement/salary" queries.
  const branchUrls: MetadataRoute.Sitemap = allBranchPaths().map((p) => ({
    url: `${base}/colleges/${p.collegeSlug}/${p.branchSlug}`,
    lastModified: new Date(),
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
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.85,
    }));

  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
    ...sectionLandings,
    ...stateUrls,
    ...examUrls,
    ...cutoffUrls,
    ...syllabusUrls,
    ...tricksUrls,
    ...guideUrls,
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
