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

// ── Email notice ─────────────────────────────────────────────────────
// One computation per cron run, embedded in every nudge email that day:
//   Sunday morning  → "LIVE today: N papers … open till X"
//   Saturday evening → "Tomorrow is All-India Live Test Sunday …"
// Saturday caveat: the live-test-create cron runs 21:30 IST, AFTER the
// 20:30 IST evening nudge — so Saturday's notice is day-of-week based
// (every Sunday has tests) and uses names only when rows already exist.

export interface LiveTestNotice {
  when: "today" | "tomorrow";
  text: string;
  html: string;
}

export async function liveTestEmailNotice(now = new Date()): Promise<LiveTestNotice | null> {
  try {
    const rows = await prisma.$queryRaw<{ short: string; closesAt: Date }[]>`
      SELECT e."shortName" AS short, lt."closesAt"
      FROM "LiveTest" lt JOIN "Exam" e ON e.id = lt."examId"
      WHERE lt."opensAt" <= NOW() + INTERVAL '2 hours' AND lt."closesAt" > NOW()
      ORDER BY e."shortName" ASC
    `;
    if (rows.length > 0) {
      const names = rows.slice(0, 4).map((r) => r.short).join(", ") + (rows.length > 4 ? ` +${rows.length - 4} more` : "");
      const latestClose = rows.reduce((m, r) => (r.closesAt > m ? r.closesAt : m), rows[0].closesAt);
      const h = new Date(latestClose.getTime() + 5.5 * 3600_000).getUTCHours();
      const till = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
      return {
        when: "today",
        text: `🔴 LIVE today on Shishya: ${rows.length} All-India Live Tests (${names}) — free, with your All-India rank the moment you submit. Open till ${till}: https://shishya.in/live-test`,
        html: `<div style="border:1px solid #fecdd3;background:#fff1f2;border-radius:10px;padding:12px 14px;margin:16px 0 0;">
      <p style="font-size:13px;font-weight:700;margin:0 0 4px;color:#0f172a;">🔴 LIVE today: ${rows.length} All-India Live Tests</p>
      <p style="font-size:12px;line-height:1.55;margin:0 0 8px;color:#334155;">${names} — free, and you see your <strong>All-India rank</strong> the moment you submit. Open till ${till}.</p>
      <a href="https://shishya.in/live-test" style="font-size:12px;font-weight:600;color:#be123c;text-decoration:none;">Enter the test hall →</a>
    </div>`,
      };
    }
  } catch {
    /* fall through to the day-of-week notice */
  }

  const istDow = new Date(now.getTime() + 5.5 * 3600_000).getUTCDay();
  if (istDow === 6) {
    return {
      when: "tomorrow",
      text: `🏆 Tomorrow is All-India Live Test Sunday — free papers with your All-India rank the moment you submit, open 6 AM–11 PM: https://shishya.in/live-test`,
      html: `<div style="border:1px solid #fecdd3;background:#fff1f2;border-radius:10px;padding:12px 14px;margin:16px 0 0;">
      <p style="font-size:13px;font-weight:700;margin:0 0 4px;color:#0f172a;">🏆 Tomorrow is All-India Live Test Sunday</p>
      <p style="font-size:12px;line-height:1.55;margin:0 0 8px;color:#334155;">Free papers, and you see your <strong>All-India rank</strong> the moment you submit. Open 6 AM–11 PM — set your alarm.</p>
      <a href="https://shishya.in/live-test" style="font-size:12px;font-weight:600;color:#be123c;text-decoration:none;">See Sunday's papers →</a>
    </div>`,
    };
  }
  return null;
}

// ── The week-long "This Sunday" announcement ─────────────────────────
// Live tests are created a full week ahead (daily idempotent cron), so
// the whole week can advertise Sunday's papers and collect reminder
// sign-ups. Cached 10 min; catch outside the cache (never cache a blip).

export interface UpcomingSunday {
  /** ISO date (YYYY-MM-DD) of the Sunday, IST. */
  sundayDate: string;
  /** Human label, e.g. "Sunday, 9 Aug". */
  label: string;
  /** Whole days until it opens (0 = today). */
  daysAway: number;
  exams: { code: string; short: string }[];
}

async function loadUpcomingRaw(): Promise<UpcomingSunday | null> {
  const rows = await prisma.$queryRaw<{ code: string; short: string; opensAt: Date }[]>`
    SELECT e.code, e."shortName" AS short, lt."opensAt"
    FROM "LiveTest" lt JOIN "Exam" e ON e.id = lt."examId"
    WHERE lt."opensAt" > NOW()
    ORDER BY lt."opensAt" ASC, e."shortName" ASC
  `;
  if (rows.length === 0) return null;
  const first = rows[0].opensAt;
  // Only the nearest Sunday's batch (all share the same opensAt).
  const batch = rows.filter((r) => r.opensAt.getTime() === first.getTime());
  const ist = new Date(first.getTime() + 5.5 * 3600_000);
  const sundayDate = ist.toISOString().slice(0, 10);
  const label = ist.toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "short", timeZone: "UTC",
  });
  const daysAway = Math.max(
    0,
    Math.ceil((first.getTime() - Date.now()) / 86_400_000),
  );
  return {
    sundayDate,
    label,
    daysAway,
    exams: batch.map((r) => ({ code: r.code, short: r.short })),
  };
}

const loadUpcomingCached = unstable_cache(loadUpcomingRaw, ["live-test-upcoming-v1"], {
  revalidate: 600,
});

export async function loadUpcomingSunday(): Promise<UpcomingSunday | null> {
  try {
    return await loadUpcomingCached();
  } catch {
    return null;
  }
}
