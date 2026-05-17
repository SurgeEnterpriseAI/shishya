// Dynamic sitemap — Google + Bing discover all 163 exam pages plus the
// public marketing surfaces from one fetch. Refreshes daily via Next's
// revalidate (cheap because the underlying query is tiny).

import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db/prisma";
import { STATES, stateSlug } from "@/lib/state-info";

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
    "/exams",
    "/exams/browse",
    "/post-graduation",
    "/jobs",
    "/worldwide",
    "/insights",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
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
  ];
}
