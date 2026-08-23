// GET /api/cron/exam-alerts — daily (03:30 UTC = 9 AM IST, after
// refresh-exam-data 01:15 and extract-results 02:15) — emails exam-tracker
// subscribers when something MATERIAL changed for their exam in the last
// 24 h. "Material" (honest, not chatty):
//   • a new OFFICIAL timeline row (cited notice) created in the window —
//     notification / admit card / exam day / answer key / result / dates;
//   • a declared result (ExamResult row) created in the window;
//   • a fresh news item whose headline matches the material-news pattern
//     AND no similar headline existed in the prior 30 days (the refresh
//     cron re-inserts generic headlines every cycle — those don't count);
//   • exam day within 3 days (an official EXAM row) — one reminder.
// Caps: one email per subscriber-exam per 7 days (lastNotifiedAt), ≤400
// sends/run. Idempotent: lastNotifiedAt is stamped after a successful send.
// Auth: Bearer ${CRON_SECRET}.  ?dry=1 → compute, don't send.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";
import { sendExamAlertEmail } from "@/lib/email";
import { alertUnsubApiUrl, alertUnsubUrl } from "@/lib/exam-alerts";
import { MATERIAL_NEWS_RE, buildTimeline, fmtDay, stageOf } from "@/lib/exam-timeline";

const MAX_SENDS = 400;
const WINDOW_H = 26; // a little over a day so a late cron never skips a day
const RESEND_DAYS = 7;

type Change = { title: string; detail?: string | null; url?: string | null };

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const started = Date.now();
  const since = new Date(Date.now() - WINDOW_H * 3600_000);

  // Exams that have at least one live subscriber.
  const examRows = await prisma.$queryRaw<{ id: string; code: string; short: string; name: string }[]>`
    SELECT DISTINCT e.id, e.code, e."shortName" AS short, e.name
    FROM "ExamAlert" a JOIN "Exam" e ON e.id = a."examId"
    WHERE a."unsubscribedAt" IS NULL AND e.active = TRUE`.catch(() => []);

  const report: Array<{ code: string; subscribers: number; changes: number; sent: number; held: number }> = [];
  let totalSent = 0;

  for (const ex of examRows) {
    if (totalSent >= MAX_SENDS) break;
    if (Date.now() - started > (maxDuration - 30) * 1000) break;

    const changes: Change[] = [];

    // 1) New OFFICIAL timeline rows in the window.
    const newDates = await prisma.$queryRaw<{ label: string; date: Date; url: string | null; kind: string | null }[]>`
      SELECT label, date, url, kind FROM "ExamImportantDate"
      WHERE "examId" = ${ex.id} AND "archivedAt" IS NULL AND confidence = 'official'
        AND "createdAt" > ${since}
        AND NOT EXISTS (
          SELECT 1 FROM "ExamImportantDate" p
          WHERE p."examId" = ${ex.id} AND p.id <> "ExamImportantDate".id
            AND p.confidence = 'official' AND p."createdAt" <= ${since}
            AND p.date = "ExamImportantDate".date AND p.kind IS NOT DISTINCT FROM "ExamImportantDate".kind
        )
      ORDER BY date ASC LIMIT 4`.catch(() => []);
    for (const d of newDates) {
      changes.push({ title: `${d.label}: ${fmtDay(new Date(d.date))}`, detail: "official date", url: d.url });
    }

    // 2) Declared results in the window.
    const results = await prisma.$queryRaw<{ headline: string; stage: string; officialUrl: string | null; id: string }[]>`
      SELECT id, headline, stage, "officialUrl" FROM "ExamResult"
      WHERE "examId" = ${ex.id} AND "createdAt" > ${since} ORDER BY "createdAt" DESC LIMIT 2`.catch(() => []);
    for (const r of results) {
      changes.push({ title: `Result declared — ${r.stage}`, detail: r.headline, url: r.officialUrl ?? `https://shishya.in/exams/${ex.code}/results/${r.id}` });
    }

    // 3) Genuinely new material headlines (not a re-generated repeat).
    const news = await prisma.$queryRaw<{ id: string; title: string; url: string | null }[]>`
      SELECT n.id, n.title, n.url FROM "ExamNewsItem" n
      WHERE n."examId" = ${ex.id} AND n."archivedAt" IS NULL AND n."createdAt" > ${since}
        AND NOT EXISTS (
          SELECT 1 FROM "ExamNewsItem" p
          WHERE p."examId" = ${ex.id} AND p.id <> n.id AND p."createdAt" <= ${since}
            AND p."createdAt" > ${new Date(Date.now() - 30 * 86_400_000)}
            AND lower(left(p.title, 40)) = lower(left(n.title, 40))
        )
      ORDER BY n."publishedAt" DESC LIMIT 6`.catch(() => []);
    for (const n of news) {
      if (changes.length >= 4) break;
      if (MATERIAL_NEWS_RE.test(n.title)) changes.push({ title: n.title, url: n.url });
    }

    // 4) Exam within 3 days (official row) — one reminder line.
    const live = await prisma.$queryRaw<{ id: string; label: string; date: Date; isExamDay: boolean; kind: string | null; confidence: string | null; url: string | null; notes: string | null }[]>`
      SELECT id, label, date, "isExamDay", kind, confidence, url, notes FROM "ExamImportantDate"
      WHERE "examId" = ${ex.id} AND "archivedAt" IS NULL ORDER BY date ASC`.catch(() => []);
    const timeline = buildTimeline(live);
    const { nextExam } = stageOf(timeline);
    if (nextExam && nextExam.official && nextExam.daysFromToday >= 0 && nextExam.daysFromToday <= 3 && changes.length < 4) {
      changes.push({
        title: nextExam.daysFromToday === 0 ? `Exam is today — ${nextExam.label}` : `Exam in ${nextExam.daysFromToday} day${nextExam.daysFromToday === 1 ? "" : "s"} — ${nextExam.label}`,
        detail: fmtDay(nextExam.date),
        url: nextExam.url,
      });
    }

    if (changes.length === 0) {
      report.push({ code: ex.code, subscribers: 0, changes: 0, sent: 0, held: 0 });
      continue;
    }

    const subs = await prisma.$queryRaw<{ id: string; email: string; userId: string | null }[]>`
      SELECT id, email, "userId" FROM "ExamAlert"
      WHERE "examId" = ${ex.id} AND "unsubscribedAt" IS NULL
        AND ("lastNotifiedAt" IS NULL OR "lastNotifiedAt" < ${new Date(Date.now() - RESEND_DAYS * 86_400_000)})
      LIMIT ${MAX_SENDS}`.catch(() => []);

    let sent = 0;
    let held = 0;
    const next = stageOf(timeline).next;
    for (const s of subs) {
      if (totalSent >= MAX_SENDS) break;
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
        changes,
        nextDate: next ? { label: next.label, date: fmtDay(next.date), official: next.official } : null,
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
