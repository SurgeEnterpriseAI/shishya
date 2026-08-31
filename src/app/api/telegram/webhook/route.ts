// POST /api/telegram/webhook — the Shishya Telegram bot (23 Aug 2026).
//
// Commands:
//   /start          what the bot does + buttons
//   /today          5 practice questions, answer inline, solution on tap
//   /exam <name>    exam tracker card: next key dates (official/expected),
//                   latest notice, links to tracker + free mock
//   /calendar       exam days in the next 30 days
//   /livetest       this Sunday's All-India Live Test
//   plain text      treated as an exam search ("ssc cgl date")
//
// Security: Telegram sends X-Telegram-Bot-Api-Secret-Token; we derive the
// expected value from NEXTAUTH_SECRET (src/lib/telegram.ts) and reject
// anything else. Always answers 200 quickly (Telegram retries otherwise);
// per-chat rate limit so a runaway client can't burn DB/AI.

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  answerCallback,
  editTelegramMessage,
  sendTelegramMessage,
  telegramBotConfigured,
  telegramWebhookSecret,
  tgEscape,
  tgUrl,
  type InlineButton,
} from "@/lib/telegram";
import { checkRateLimit } from "@/lib/rate-limit";
import { contextualExamFilter } from "@/lib/exam-aliases";
import { buildTimeline, fmtDay, stageOf, upcomingOfKind, latestOfKind } from "@/lib/exam-timeline";
import { sourceTier } from "@/lib/official-source";
import { liveTestEmailNotice } from "@/lib/live-test-today";

type Exam = { id: string; code: string; name: string; shortName: string; category: string; state: string | null; candidatesPerYear: number | null };

let examCache: { at: number; rows: Exam[] } | null = null;
async function activeExams(): Promise<Exam[]> {
  if (examCache && Date.now() - examCache.at < 10 * 60_000) return examCache.rows;
  const rows = await prisma.exam
    .findMany({
      where: { active: true },
      select: { id: true, code: true, name: true, shortName: true, category: true, state: true, candidatesPerYear: true },
      orderBy: { candidatesPerYear: "desc" },
    })
    .catch(() => [] as Exam[]);
  examCache = { at: Date.now(), rows: rows as Exam[] };
  return rows as Exam[];
}

const HELP = [
  `<b>Shishya</b> — free govt-exam prep for 177 exams. Try:`,
  `• /today — 5 practice questions, right here`,
  `• /exam SSC CGL — exam date, admit card, result (official / announced / expected)`,
  `• /calendar — exam days in the next 30 days`,
  `• /livetest — this Sunday's All-India Live Test`,
  `Or just type an exam name: <i>rrb ntpc date</i>`,
].join("\n");

function homeButtons(): InlineButton[][] {
  return [
    [{ text: "📝 Today's 5", callback_data: "cmd:today" }, { text: "📅 Exam calendar", url: tgUrl("/exam-calendar") }],
    [{ text: "🏆 Live test", url: tgUrl("/live-test") }, { text: "🌐 shishya.in", url: tgUrl("/") }],
  ];
}

async function sendToday(chatId: number | string) {
  // One question from each of the five biggest exams, validated MCQs only.
  const qs = await prisma
    .$queryRaw<{ id: string; body: string; options: any; answerKey: string; solution: string; short: string; code: string }[]>`
      SELECT q.id, q.body, q.options, q."answerKey", q.solution, e."shortName" AS short, e.code
      FROM (
        SELECT e2.id FROM "Exam" e2 WHERE e2.active = TRUE ORDER BY e2."candidatesPerYear" DESC NULLS LAST LIMIT 12
      ) top
      JOIN LATERAL (
        SELECT q2.* FROM "Question" q2
        WHERE q2."examId" = top.id AND q2.validated = TRUE AND q2.type = 'MCQ' AND q2.language = 'EN'
          AND length(q2.body) < 600
        ORDER BY random() LIMIT 1
      ) q ON TRUE
      JOIN "Exam" e ON e.id = top.id
      ORDER BY random() LIMIT 5`
    .catch(() => []);
  if (qs.length === 0) {
    await sendTelegramMessage({ chatId, text: `Questions are loading — try ${tgUrl("/")} meanwhile.` });
    return;
  }
  await sendTelegramMessage({ chatId, text: `<b>📝 Today's 5</b> — tap an option; the solution appears on the spot.`, disablePreview: true });
  let i = 0;
  for (const q of qs) {
    i++;
    const opts: { key: string; text: string }[] = Array.isArray(q.options) ? q.options : [];
    const lines = [`<b>Q${i} · ${tgEscape(q.short)}</b>`, tgEscape(q.body), ``];
    for (const o of opts) lines.push(`<b>${tgEscape(o.key)}.</b> ${tgEscape(String(o.text)).slice(0, 200)}`);
    const buttons: InlineButton[][] = [opts.slice(0, 4).map((o) => ({ text: o.key, callback_data: `ans:${q.id}:${o.key}` }))];
    await sendTelegramMessage({ chatId, text: lines.join("\n"), buttons, disablePreview: true });
  }
  await sendTelegramMessage({
    chatId,
    text: `Want these every morning with your weak topics tracked? Free on Shishya: ${tgUrl("/")}`,
    disablePreview: true,
  });
}

async function handleAnswer(cb: any) {
  const [, qid, key] = String(cb.data).split(":");
  const q = await prisma
    .$queryRaw<{ answerKey: string; solution: string; body: string; options: any; code: string; short: string }[]>`
      SELECT q."answerKey", q.solution, q.body, q.options, e.code, e."shortName" AS short
      FROM "Question" q JOIN "Exam" e ON e.id = q."examId" WHERE q.id = ${qid} LIMIT 1`
    .catch(() => []);
  const row = q[0];
  if (!row) {
    await answerCallback(cb.id, "Question not found");
    return;
  }
  const correct = row.answerKey.split(",").map((s) => s.trim()).includes(key);
  await answerCallback(cb.id, correct ? "✅ Correct!" : `❌ Answer: ${row.answerKey}`);
  const opts: { key: string; text: string }[] = Array.isArray(row.options) ? row.options : [];
  const lines = [
    `<b>${tgEscape(row.short)}</b> — ${correct ? "✅ Correct" : `❌ You chose ${tgEscape(key)}, answer is <b>${tgEscape(row.answerKey)}</b>`}`,
    tgEscape(row.body),
    ``,
    ...opts.map((o) => `${o.key === row.answerKey ? "✅" : "▫️"} <b>${tgEscape(o.key)}.</b> ${tgEscape(String(o.text)).slice(0, 160)}`),
    ``,
    `<i>${tgEscape(String(row.solution).slice(0, 500))}${String(row.solution).length > 500 ? "…" : ""}</i>`,
    ``,
    `More ${tgEscape(row.short)} practice (free, with weak-topic tracking): ${tgUrl(`/exams/${row.code}`)}`,
  ];
  const chatId = cb.message?.chat?.id;
  const messageId = cb.message?.message_id;
  if (chatId && messageId) await editTelegramMessage({ chatId, messageId, text: lines.join("\n") });
}

async function examCard(exam: Exam): Promise<{ text: string; buttons: InlineButton[][] }> {
  const [rows, elig] = await Promise.all([
    prisma.examImportantDate
      .findMany({ where: { examId: exam.id, archivedAt: null }, orderBy: { date: "asc" }, take: 60 })
      .catch(() => []),
    prisma
      .$queryRaw<{ officialUrl: string | null }[]>`
        SELECT "officialUrl" FROM "ExamEligibility" WHERE "examId" = ${exam.id} LIMIT 1`
      .catch(() => [] as { officialUrl: string | null }[]),
  ]);
  const timeline = buildTimeline(rows, new Date(), elig[0]?.officialUrl ?? null);
  const { nextExam } = stageOf(timeline);
  const line = (label: string, kind: Parameters<typeof upcomingOfKind>[1]) => {
    const r = upcomingOfKind(timeline, kind) ?? latestOfKind(timeline, kind);
    if (!r) return `• ${label}: not announced yet`;
    // official = conducting-body notice · reported = announced via press ·
    // expected = estimate (the footer explains "expected").
    const tag = r.tier === "official" ? "official" : r.tier === "reported" ? "announced" : "expected";
    const when = r.status === "done" ? "done" : r.status === "today" ? "TODAY" : `in ${r.daysFromToday}d`;
    return `• ${label}: <b>${tgEscape(fmtDay(r.date))}</b> (${tag}, ${when})`;
  };
  const news = await prisma.examNewsItem
    .findFirst({ where: { examId: exam.id, archivedAt: null }, orderBy: { publishedAt: "desc" }, select: { title: true, url: true, id: true } })
    .catch(() => null);
  const head = nextExam
    ? nextExam.daysFromToday === 0
      ? `🎯 <b>Exam is TODAY</b>`
      : `🎯 <b>Exam ${nextExam.daysFromToday > 0 ? `in ${nextExam.daysFromToday} days` : "passed"}</b> — ${tgEscape(fmtDay(nextExam.date))}${nextExam.tier === "expected" ? " (expected)" : ""}`
    : `📅 No dates announced for the next cycle yet`;
  const text = [
    `<b>${tgEscape(exam.shortName)}</b> — ${tgEscape(exam.name)}`,
    head,
    line("Notification", "NOTIFICATION"),
    line("Last date to apply", "APPLICATION_END"),
    line("Admit card", "ADMIT_CARD"),
    line("Exam day", "EXAM"),
    line("Answer key", "ANSWER_KEY"),
    line("Result", "RESULT"),
    news ? `\n🆕 ${tgEscape(news.title)}${news.url ? ` — <a href="${news.url}">source</a>` : ""}` : "",
    `\n<i>Announced = per press reports · expected = estimate from previous cycles, not an announcement. Always confirm on the official site.</i>`,
  ]
    .filter(Boolean)
    .join("\n");
  const buttons: InlineButton[][] = [
    [{ text: "📅 Full tracker", url: tgUrl(`/exams/${exam.code}/updates`) }, { text: "🔔 Get alerts", url: tgUrl(`/exams/${exam.code}/updates#alerts`) }],
    [{ text: `📝 Free ${exam.shortName} mock`, url: tgUrl(`/exams/${exam.code}`) }, { text: "⚡ 5-Q quiz, no login", url: tgUrl(`/exams/${exam.code}/quiz`) }],
  ];
  return { text, buttons };
}

async function sendExamSearch(chatId: number | string, query: string) {
  const exams = await activeExams();
  const q = query.replace(/\b(date|dates|exam date|admit card|result|notification|kab|hai|ka|ki|tracker)\b/gi, " ").trim();
  const hits = contextualExamFilter(q || query, exams);
  if (hits.length === 0) {
    await sendTelegramMessage({
      chatId,
      text: `Couldn't find that exam. Try the exact name (e.g. <i>SSC CGL</i>, <i>RRB NTPC</i>, <i>UP Police</i>) or browse: ${tgUrl("/exam-calendar")}`,
      disablePreview: true,
    });
    return;
  }
  if (hits.length > 1 && !hits[0].shortName.toLowerCase().includes(q.toLowerCase()) && q.length < 4) {
    const buttons: InlineButton[][] = hits.slice(0, 6).map((e) => [{ text: e.shortName, callback_data: `exam:${e.code}` }]);
    await sendTelegramMessage({ chatId, text: `Which exam?`, buttons });
    return;
  }
  const card = await examCard(hits[0]);
  await sendTelegramMessage({ chatId, text: card.text, buttons: card.buttons, disablePreview: true });
  if (hits.length > 1) {
    const others = hits.slice(1, 5);
    await sendTelegramMessage({
      chatId,
      text: `Also matching: ${others.map((e) => tgEscape(e.shortName)).join(" · ")}`,
      buttons: [others.map((e) => ({ text: e.shortName, callback_data: `exam:${e.code}` }))],
      disablePreview: true,
    });
  }
}

async function sendCalendar(chatId: number | string) {
  const now = new Date();
  const rows = await prisma.examImportantDate
    .findMany({
      where: { archivedAt: null, isExamDay: true, date: { gte: new Date(now.getTime() - 86_400_000), lte: new Date(now.getTime() + 30 * 86_400_000) }, exam: { active: true } },
      orderBy: { date: "asc" },
      take: 120,
      include: { exam: { select: { shortName: true, code: true, eligibility: { select: { officialUrl: true } } } } },
    })
    .catch(() => []);
  const tl = buildTimeline(rows, now);
  const seen = new Set<string>();
  const lines: string[] = [`<b>📅 Exam days — next 30 days</b>`, ``];
  for (const r of tl) {
    if (r.status === "done") continue;
    const src = rows.find((x) => x.id === r.id)!;
    const key = `${src.exam.code}:${r.day}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // ✅ official · 📌 reported (announced via press) · 🟡 expected.
    // Tier per row: each exam's own portal widens its gold tier.
    const tier = sourceTier(src.confidence, r.url, src.exam.eligibility?.officialUrl);
    const mark = tier === "official" ? "✅" : tier === "reported" ? "📌" : "🟡";
    lines.push(`${mark} <b>${tgEscape(fmtDay(r.date))}</b> — ${tgEscape(src.exam.shortName)}${tier === "expected" ? " (expected)" : ""}`);
    if (lines.length > 16) break;
  }
  if (lines.length === 2) lines.push(`No dated exams in this window.`);
  lines.push(``, `✅ official · 📌 reported · 🟡 expected. Full calendar: ${tgUrl("/exam-calendar")}`);
  await sendTelegramMessage({ chatId, text: lines.join("\n"), disablePreview: true });
}

async function sendLiveTest(chatId: number | string) {
  const live = await liveTestEmailNotice().catch(() => null);
  const text = live
    ? `${tgEscape(live.text.replace(/https?:\S+/g, "").trim())}\n\nEnter the test hall: ${tgUrl("/live-test")}`
    : `🏆 All-India Live Tests run every Sunday (6 AM–11 PM IST): a real national rank the moment you submit. Free. ${tgUrl("/live-test")}`;
  await sendTelegramMessage({ chatId, text, disablePreview: true });
}

// GET — idempotent webhook (re)registration + status. Unauthenticated on
// purpose: it can only point Telegram at THIS url with OUR secret, so a
// stranger calling it changes nothing; it lets the operator (or a cron)
// register right after the token is set, without the CRON secret.
export async function GET(req: NextRequest) {
  if (!telegramBotConfigured()) return NextResponse.json({ ok: false, reason: "TELEGRAM_BOT_TOKEN not set" });
  const rl = await checkRateLimit("examAlert", `tg-register:${req.headers.get("x-forwarded-for") ?? "ip"}`);
  if (!rl.ok) return NextResponse.json({ error: "slow down" }, { status: 429 });
  const { ensureTelegramWebhook } = await import("@/lib/telegram");
  const r = await ensureTelegramWebhook();
  return NextResponse.json(r);
}

export async function POST(req: NextRequest) {
  if (!telegramBotConfigured()) return NextResponse.json({ ok: true, ignored: "not configured" });
  if ((req.headers.get("x-telegram-bot-api-secret-token") ?? "") !== telegramWebhookSecret()) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  let update: any;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  try {
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message?.chat?.id;
      const rl = await checkRateLimit("aptitude", `tg:${cb.from?.id ?? chatId}`);
      if (!rl.ok) {
        await answerCallback(cb.id, "Slow down a little 🙂");
        return NextResponse.json({ ok: true });
      }
      const data = String(cb.data ?? "");
      if (data.startsWith("ans:")) await handleAnswer(cb);
      else if (data === "cmd:today") {
        await answerCallback(cb.id);
        if (chatId) await sendToday(chatId);
      } else if (data.startsWith("exam:")) {
        await answerCallback(cb.id);
        const exams = await activeExams();
        const ex = exams.find((e) => e.code === data.slice(5));
        if (ex && chatId) {
          const card = await examCard(ex);
          await sendTelegramMessage({ chatId, text: card.text, buttons: card.buttons, disablePreview: true });
        }
      } else await answerCallback(cb.id);
      return NextResponse.json({ ok: true });
    }

    const msg = update.message ?? update.edited_message;
    const chatId = msg?.chat?.id;
    const text: string = String(msg?.text ?? "").trim();
    if (!chatId || !text) return NextResponse.json({ ok: true });
    const rl = await checkRateLimit("aptitude", `tg:${msg.from?.id ?? chatId}`);
    if (!rl.ok) return NextResponse.json({ ok: true });

    const [cmdRaw, ...rest] = text.split(/\s+/);
    const cmd = cmdRaw.toLowerCase().replace(/@\w+$/, "");
    const arg = rest.join(" ").trim();
    if (cmd === "/start" || cmd === "/help") {
      await sendTelegramMessage({ chatId, text: HELP, buttons: homeButtons(), disablePreview: true });
    } else if (cmd === "/today" || cmd === "/daily5") {
      await sendToday(chatId);
    } else if (cmd === "/exam" || cmd === "/dates" || cmd === "/tracker") {
      if (!arg) await sendTelegramMessage({ chatId, text: `Which exam? e.g. <i>/exam SSC CGL</i>`, disablePreview: true });
      else await sendExamSearch(chatId, arg);
    } else if (cmd === "/calendar" || cmd === "/upcoming") {
      await sendCalendar(chatId);
    } else if (cmd === "/livetest" || cmd === "/live") {
      await sendLiveTest(chatId);
    } else if (cmd.startsWith("/")) {
      await sendTelegramMessage({ chatId, text: HELP, buttons: homeButtons(), disablePreview: true });
    } else if (msg.chat?.type === "private" || /@\w*shishya\w*bot/i.test(text)) {
      // Plain text in a DM (or an @mention in a group) = exam search.
      await sendExamSearch(chatId, text.replace(/@\w+/g, "").trim());
    }
  } catch (err) {
    console.error("[telegram webhook]", (err as Error)?.message);
  }
  return NextResponse.json({ ok: true });
}
