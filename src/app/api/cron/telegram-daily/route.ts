// GET /api/cron/telegram-daily — post the day's digest to the Shishya
// Telegram channel: top current-affairs headlines + a practice nudge,
// each linking back to shishya.in. This is the forward-and-join growth
// loop — aspirants forward the post into their prep groups.
//
// No-ops safely (sent:false) until TELEGRAM_BOT_TOKEN + TELEGRAM_CHANNEL_ID
// are configured, so it's safe to ship before the channel exists.
// Auth: Bearer ${CRON_SECRET}. Scheduled in vercel.json.

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";
import { sendTelegramMessage, telegramConfigured, tgEscape, tgUrl, ensureTelegramWebhook } from "@/lib/telegram";
import { liveTestEmailNotice } from "@/lib/live-test-today";
import { buildTimeline, fmtDay } from "@/lib/exam-timeline";

function istDateStr(now = new Date()): string {
  return new Date(now.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
}
function prettyDate(d: string): string {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!telegramConfigured()) {
    return Response.json({ ok: true, sent: false, reason: "telegram not configured" });
  }
  // Self-registering bot webhook (idempotent; no manual curl for the operator).
  const webhook = await ensureTelegramWebhook().catch(() => ({ ok: false, changed: false }));

  const date = istDateStr();
  const now = new Date();

  // Exam tracker signals for the channel (23 Aug 2026): exam days in the
  // next 7 days (official first) and official dates/results that appeared
  // in the last 24 h — the lines aspirants forward into their groups.
  const weekRows = await prisma.examImportantDate
    .findMany({
      where: { archivedAt: null, isExamDay: true, date: { gte: new Date(now.getTime() - 86_400_000), lte: new Date(now.getTime() + 7 * 86_400_000) }, exam: { active: true } },
      orderBy: { date: "asc" },
      take: 60,
      include: { exam: { select: { shortName: true, code: true } } },
    })
    .catch(() => []);
  const weekTl = buildTimeline(weekRows, now).filter((r) => r.status !== "done");
  const seenWeek = new Set<string>();
  const weekLines: string[] = [];
  for (const r of weekTl) {
    const src = weekRows.find((x) => x.id === r.id)!;
    const key = `${src.exam.code}:${r.day}`;
    if (seenWeek.has(key)) continue;
    seenWeek.add(key);
    weekLines.push(`${r.official ? "✅" : "🟡"} ${tgEscape(fmtDay(r.date))} — <a href="${tgUrl(`/exams/${src.exam.code}/updates`, "channel")}">${tgEscape(src.exam.shortName)}</a>${r.official ? "" : " (expected)"}`);
    if (weekLines.length >= 6) break;
  }
  const fresh = await prisma
    .$queryRaw<{ label: string; date: Date; short: string; code: string; url: string | null }[]>`
      SELECT d.label, d.date, e."shortName" AS short, e.code, d.url
      FROM "ExamImportantDate" d JOIN "Exam" e ON e.id = d."examId"
      WHERE d."archivedAt" IS NULL AND d.confidence = 'official' AND e.active = TRUE
        AND d."createdAt" > NOW() - INTERVAL '26 hours' AND d.date >= NOW() - INTERVAL '1 day'
      ORDER BY d.date ASC LIMIT 4`
    .catch(() => []);
  const items = await prisma
    .$queryRawUnsafe<{ title: string; category: string }[]>(
      `SELECT title, category FROM "CurrentAffair" WHERE date = $1::date ORDER BY category, title LIMIT 6`,
      date,
    )
    .catch(() => [] as { title: string; category: string }[]);

  const caUrl = `https://shishya.in/current-affairs/${date}`;
  const lines: string[] = [
    `<b>📰 Current Affairs — ${tgEscape(prettyDate(date))}</b>`,
    ``,
  ];
  if (items.length > 0) {
    for (const it of items) {
      lines.push(`• <b>${tgEscape(it.category)}:</b> ${tgEscape(it.title)}`);
    }
    lines.push(``);
    lines.push(`👉 Full digest + why each matters: ${caUrl}`);
  } else {
    lines.push(`Today's digest is being prepared — check ${caUrl}`);
  }
  // Sunday: lead the digest with the live-test call — the channel's
  // most forwardable line ("free All-India rank today").
  const live = await liveTestEmailNotice().catch(() => null);
  if (live?.when === "today") {
    lines.push(``);
    lines.push(`🔴 <b>LIVE today:</b> ${tgEscape(live.text.replace(/^🔴 /, "").replace(/https?:\S+/g, "").trim())}`);
    lines.push(`Enter the test hall: https://shishya.in/live-test`);
  }
  if (weekLines.length > 0) {
    lines.push(``);
    lines.push(`<b>📅 Exam days this week</b> (✅ official · 🟡 expected)`);
    lines.push(...weekLines);
    lines.push(`All dates: ${tgUrl("/exam-calendar", "channel")}`);
  }
  if (fresh.length > 0) {
    lines.push(``);
    lines.push(`<b>🆕 Official dates announced</b>`);
    for (const f of fresh) {
      lines.push(`• ${tgEscape(f.short)} — ${tgEscape(f.label)}: <b>${tgEscape(fmtDay(new Date(f.date)))}</b>${f.url ? ` · <a href="${f.url}">notice</a>` : ""} · <a href="${tgUrl(`/exams/${f.code}/updates`, "channel")}">tracker</a>`);
    }
  }
  lines.push(``);
  lines.push(`🗺 <b>New:</b> India's Government Jobs Map — every path from UPSC Group A to state police, with live vacancies: ${tgUrl("/jobs-map", "channel")}`);
  lines.push(``);
  lines.push(`🎯 <b>Free on Shishya:</b> mock tests, PYQs, syllabus, tricks & an AI tutor in 22 Indian languages for 177 govt exams — 100% free.`);
  lines.push(`Start: https://shishya.in`);
  lines.push(``);
  lines.push(`Forward this to your prep group 🙏`);

  const sent = await sendTelegramMessage({ text: lines.join("\n"), parseMode: "HTML", disablePreview: false });
  return Response.json({ ok: true, sent, date, items: items.length, examDays: weekLines.length, fresh: fresh.length, webhook });
}
