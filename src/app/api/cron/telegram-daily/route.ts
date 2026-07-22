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
import { sendTelegramMessage, telegramConfigured, tgEscape } from "@/lib/telegram";

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

  const date = istDateStr();
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
  lines.push(``);
  lines.push(`🎯 <b>Free on Shishya:</b> mock tests, PYQs, syllabus, tricks & an AI tutor in 22 Indian languages for 177 govt exams — 100% free.`);
  lines.push(`Start: https://shishya.in`);
  lines.push(``);
  lines.push(`Forward this to your prep group 🙏`);

  const sent = await sendTelegramMessage({ text: lines.join("\n"), parseMode: "HTML", disablePreview: false });
  return Response.json({ ok: true, sent, date, items: items.length });
}
