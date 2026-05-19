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

export const revalidate = 86_400; // 24h

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://shishya.in";

  const exams = await prisma.exam.findMany({
    where: { active: true },
    select: { code: true, state: true, updatedAt: true },
    orderBy: { candidatesPerYear: "desc" },
  });

  const topics = await prisma.topic.findMany({
    where: { notes: { not: null }, subject: { exam: { active: true } } },
    select: {
      code: true,
      createdAt: true,
      notesGeneratedAt: true,
      subject: { select: { exam: { select: { code: true } } } },
    },
    take: 2000,
  });

  const examUrls: MetadataRoute.Sitemap = exams.map((e) => ({
    url: `${base}/exams/${e.code}`,
    lastModified: e.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
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
    lastModified: t.notesGeneratedAt ?? t.createdAt,
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
    ...topicUrls,
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
    ...userProfileUrls,
  ];
}
