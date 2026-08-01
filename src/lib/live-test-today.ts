// Today's All-India Live Tests — the data behind the awareness banner.
//
// Discovery gap found 2 Aug 2026 (first live-test Sunday): /live-test
// was linked only from exam hubs, attempt results and the sitemap — an
// aspirant on the homepage or dashboard had NO way to know tests were
// open that day. This loader powers a banner on both.
//
// Cache 5 min; the catch lives OUTSIDE the cache so an error is never
// cached (lesson from the vacancy-explorer poisoning, same day).

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";

export interface LiveTestToday {
  count: number;
  /** true = at least one test is open right now */
  openNow: boolean;
  /** IST hour string like "11 PM" for the latest close */
  tillIst: string;
  exams: { code: string; short: string }[];
}

async function loadRaw(): Promise<LiveTestToday | null> {
  // "Today-ish": anything still open, or opening within the next 18h
  // (so the banner also teases tonight → tomorrow-morning opens).
  const rows = await prisma.$queryRaw<
    { code: string; short: string; opensAt: Date; closesAt: Date }[]
  >`
    SELECT e.code, e."shortName" AS short, lt."opensAt", lt."closesAt"
    FROM "LiveTest" lt JOIN "Exam" e ON e.id = lt."examId"
    WHERE lt."closesAt" > NOW() AND lt."opensAt" < NOW() + INTERVAL '18 hours'
    ORDER BY lt."opensAt" ASC, e."shortName" ASC
  `;
  if (rows.length === 0) return null;

  const now = Date.now();
  const openNow = rows.some((r) => r.opensAt.getTime() <= now && r.closesAt.getTime() > now);
  const latestClose = rows.reduce((m, r) => (r.closesAt > m ? r.closesAt : m), rows[0].closesAt);
  const istH = new Date(latestClose.getTime() + 5.5 * 3600_000).getUTCHours();
  const tillIst = istH === 0 ? "12 AM" : istH < 12 ? `${istH} AM` : istH === 12 ? "12 PM" : `${istH - 12} PM`;

  return {
    count: rows.length,
    openNow,
    tillIst,
    exams: rows.map((r) => ({ code: r.code, short: r.short })),
  };
}

const loadCached = unstable_cache(loadRaw, ["live-test-today-v1"], { revalidate: 300 });

export async function loadTodaysLiveTests(): Promise<LiveTestToday | null> {
  try {
    return await loadCached();
  } catch {
    return null; // per-request degradation only — never cached
  }
}
