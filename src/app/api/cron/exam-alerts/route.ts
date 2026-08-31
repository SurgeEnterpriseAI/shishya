// GET /api/cron/exam-alerts — daily (03:30 UTC = 9 AM IST, after
// refresh-exam-data 01:15 and extract-results 02:15) — emails exam-tracker
// subscribers when something MATERIAL changed for their exam. "Material"
// (honest, not chatty):
//   • a new OFFICIAL timeline row (cited notice) — notification / admit
//     card / exam day / answer key / result / dates;
//   • a declared result (ExamResult row);
//   • a genuinely new material headline WITH a cited URL (the refresh cron
//     re-inserts generic headlines every cycle — those don't count: a
//     headline is a repeat if a prior row in the last 30 days shares its
//     URL or its normalised title);
//   • exam day within 3 days (an official EXAM row) — one reminder.
// Each change carries the time it appeared; a subscriber only gets the
// changes newer than their last alert, so a result declared the day
// after an admit-card mail is NOT lost to the 7-day cap — it goes out
// when the cap lifts (review 23 Aug 2026). Caps: one email per
// subscriber-exam per 7 days (lastNotifiedAt), ≤400 sends/run.
// Auth: Bearer ${CRON_SECRET}.  ?dry=1 → compute, don't send.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";
import { sendExamAlertEmail } from "@/lib/email";
import { alertUnsubApiUrl, alertUnsubUrl } from "@/lib/exam-alerts";
import { MATERIAL_NEWS_RE, buildTimeline, fmtDay, stageOf } from "@/lib/exam-timeline";
import { sourceTier } from "@/lib/official-source";

const MAX_SENDS = 400;
const RESEND_DAYS = 7;
// Look back a little beyond the resend cap so nothing that appeared while a
// subscriber was capped is ever skipped.
const LOOKBACK_H = RESEND_DAYS * 24 + 26;

type Change = { title: string; detail?: string | null; url?: string | null; linkLabel?: string; at: Date };

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const started = Date.now();
  const now = new Date();
  const since = new Date(now.getTime() - LOOKBACK_H * 3600_000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);

  // Exams that have at least one live subscriber. officialUrl widens the
  // gold source tier to conducting bodies on commercial TLDs (NABARD,
  // LIC, …) so their own notices are never mailed as "press reports".
  const examRows = await prisma.$queryRaw<{ id: string; code: string; short: string; name: string; officialUrl: string | null }[]>`
    SELECT DISTINCT e.id, e.code, e."shortName" AS short, e.name, el."officialUrl"
    FROM "ExamAlert" a JOIN "Exam" e ON e.id = a."examId"
    LEFT JOIN "ExamEligibility" el ON el."examId" = e.id
    WHERE a."unsubscribedAt" IS NULL AND e.active = TRUE`.catch(() => []);

  const report: Array<{ code: string; subscribers: number; changes: number; sent: number; held: number }> = [];
  let totalSent = 0;

  for (const ex of examRows) {
    if (totalSent >= MAX_SENDS) break;
    if (Date.now() - started > (maxDuration - 30) * 1000) break;

    const changes: Change[] = [];

    // 1) New OFFICIAL timeline rows in the window (same kind + calendar day
    //    already official before the window = not new).
    const newDates = await prisma.$queryRaw<{ label: string; date: Date; url: string | null; kind: string | null; createdAt: Date }[]>`
      SELECT label, date, url, kind, "createdAt" FROM "ExamImportantDate" d
      WHERE d."examId" = ${ex.id} AND d."archivedAt" IS NULL AND d.confidence = 'official'
        AND d."createdAt" > ${since}
        AND NOT EXISTS (
          SELECT 1 FROM "ExamImportantDate" p
          WHERE p."examId" = ${ex.id} AND p.id <> d.id
            AND p.confidence = 'official' AND p."createdAt" <= d."createdAt" - interval '1 minute'
            AND p.date::date = d.date::date AND p.kind IS NOT DISTINCT FROM d.kind
        )
      ORDER BY date ASC LIMIT 4`.catch(() => []);
    for (const d of newDates) {
      // Tier honesty (29 Aug 2026): only conducting-body citations may be
      // called "official" in the mail; press/coaching citations are real
      // announcements but say so — in the detail AND the link label.
      const gold = sourceTier("official", d.url, ex.officialUrl) === "official";
      changes.push({
        title: `${d.label}: ${fmtDay(new Date(d.date))}`,
        detail: gold ? "official date" : "announced date (via press reports)",
        url: d.url,
        linkLabel: gold ? "official notice" : "source",
        at: new Date(d.createdAt),
      });
    }

    // 2) Declared results in the window.
    const results = await prisma.$queryRaw<{ headline: string; stage: string; officialUrl: string | null; id: string; createdAt: Date }[]>`
      SELECT id, headline, stage, "officialUrl", "createdAt" FROM "ExamResult"
      WHERE "examId" = ${ex.id} AND "createdAt" > ${since} ORDER BY "createdAt" DESC LIMIT 2`.catch(() => []);
    for (const r of results) {
      const url = r.officialUrl ?? `https://shishya.in/exams/${ex.code}/results/${r.id}`;
      changes.push({
        title: `Result declared — ${r.stage}`,
        detail: r.headline,
        url,
        linkLabel: r.officialUrl && sourceTier("official", url, ex.officialUrl) === "official" ? "official notice" : "details",
        at: new Date(r.createdAt),
      });
    }

    // 3) Genuinely new material headlines WITH a cited URL.
    const news = await prisma.$queryRaw<{ id: string; title: string; url: string | null; createdAt: Date }[]>`
      SELECT n.id, n.title, n.url, n."createdAt" FROM "ExamNewsItem" n
      WHERE n."examId" = ${ex.id} AND n."archivedAt" IS NULL AND n."createdAt" > ${since} AND n.url IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "ExamNewsItem" p
          WHERE p."examId" = ${ex.id} AND p.id <> n.id
            AND p."createdAt" <= n."createdAt" - interval '1 minute' AND p."createdAt" > ${thirtyDaysAgo}
            AND (p.url = n.url OR regexp_replace(lower(p.title), '[^a-z0-9]', '', 'g') = regexp_replace(lower(n.title), '[^a-z0-9]', '', 'g'))
        )
      ORDER BY n."publishedAt" DESC LIMIT 6`.catch(() => []);
    for (const n of news) {
      if (changes.length >= 4) break;
      if (MATERIAL_NEWS_RE.test(n.title)) changes.push({ title: n.title, url: n.url, at: new Date(n.createdAt) });
    }

    // 4) Exam within 3 days (official row) — one reminder line, stamped
    //    "now" so it only reaches subscribers whose last mail predates it.
    const live = await prisma.$queryRaw<{ id: string; label: string; date: Date; isExamDay: boolean; kind: string | null; confidence: string | null; url: string | null; notes: string | null }[]>`
      SELECT id, label, date, "isExamDay", kind, confidence, url, notes FROM "ExamImportantDate"
      WHERE "examId" = ${ex.id} AND "archivedAt" IS NULL ORDER BY date ASC`.catch(() => []);
    const timeline = buildTimeline(live, now, ex.officialUrl);
    const { nextExam, next } = stageOf(timeline);
    // Any ANNOUNCED exam day (official or reported tier) within 3 days
    // deserves the reminder — only estimates are excluded.
    if (nextExam && nextExam.tier !== "expected" && nextExam.daysFromToday >= 0 && nextExam.daysFromToday <= 3 && changes.length < 4) {
      changes.push({
        title:
          nextExam.daysFromToday === 0
            ? `Exam is today — ${nextExam.label}`
            : `Exam in ${nextExam.daysFromToday} day${nextExam.daysFromToday === 1 ? "" : "s"} — ${nextExam.label}`,
        detail: fmtDay(nextExam.date),
        url: nextExam.url,
        linkLabel: nextExam.tier === "official" ? "official notice" : "source",
        at: now,
      });
    }

    if (changes.length === 0) {
      report.push({ code: ex.code, subscribers: 0, changes: 0, sent: 0, held: 0 });
      continue;
    }

    const subs = await prisma.$queryRaw<{ id: string; email: string; userId: string | null; lastNotifiedAt: Date | null }[]>`
      SELECT id, email, "userId", "lastNotifiedAt" FROM "ExamAlert"
      WHERE "examId" = ${ex.id} AND "unsubscribedAt" IS NULL
        AND ("lastNotifiedAt" IS NULL OR "lastNotifiedAt" < ${new Date(now.getTime() - RESEND_DAYS * 86_400_000)})
      LIMIT ${MAX_SENDS}`.catch(() => []);

    let sent = 0;
    let held = 0;
    for (const s of subs) {
      if (totalSent >= MAX_SENDS) break;
      // Only what appeared after this subscriber's last alert.
      const mine = s.lastNotifiedAt ? changes.filter((c) => c.at > new Date(s.lastNotifiedAt as Date)) : changes;
      if (mine.length === 0) continue;
      if (dry) {
        sent++;
        continue;
      }
      const ok = await sendExamAlertEmail({
        to: s.email,
        userId: s.userId,
        examCode: ex.code,
        examShort: ex.short,
        examName: ex.name,
        changes: mine.map(({ title, detail, url }) => ({ title, detail, url })),
        // The template's `official` flag gates "(expected, not yet
        // announced)" — semantically it means ANNOUNCED, so reported
        // (press-cited) dates must pass it too.
        nextDate: next ? { label: next.label, date: fmtDay(next.date), official: next.tier !== "expected" } : null,
        unsubscribeUrl: alertUnsubUrl(s.email, ex.id, ex.code),
        unsubscribeApiUrl: alertUnsubApiUrl(s.email, ex.id),
      }).catch(() => false);
      if (ok) {
        sent++;
        totalSent++;
        await prisma.$executeRaw`UPDATE "ExamAlert" SET "lastNotifiedAt" = NOW() WHERE id = ${s.id}`.catch(() => {});
      } else {
        held++;
      }
    }
    report.push({ code: ex.code, subscribers: subs.length, changes: changes.length, sent, held });
  }

  return Response.json({ ok: true, dry, exams: examRows.length, totalSent, elapsedMs: Date.now() - started, report });
}
