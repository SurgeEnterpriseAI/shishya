// Dynamic sitemap — Google + Bing discover all 163 exam pages plus the
// public marketing surfaces from one fetch. Refreshes daily via Next's
// revalidate (cheap because the underlying query is tiny).

import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db/prisma";

export const revalidate = 86_400; // 24h

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://shishya.in";

  const exams = await prisma.exam.findMany({
    where: { active: true },
    select: { code: true, updatedAt: true },
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

  const topicUrls: MetadataRoute.Sitemap = topics.map((t) => ({
    url: `${base}/exams/${t.subject.exam.code}/topics/${t.code}`,
    lastModified: t.notesGeneratedAt ?? t.createdAt,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
    {
      url: `${base}/exams`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    ...examUrls,
    ...topicUrls,
  ];
}
