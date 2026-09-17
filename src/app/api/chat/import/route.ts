// POST /api/chat/import — keep the guest tutor conversation at sign-in
// (16 Sep 2026). The guest chat card promised "Save this conversation… sign
// in, free", but guest turns lived only in React state and login returned
// to a blank chat (74 guest chats and 16 save cards in the 14 days to
// 16 Sep; nothing was ever saved).
//
// Body: { examCode: string | null, turns: [{ role, content }] } — the guest
// transcript ChatInterface kept in localStorage when the guest tapped the
// save card (for 30 minutes; nothing is kept without that tap).
//
// Safety:
//   • signed-in only; the conversation always becomes a NEW ChatSession of
//     the signed-in user — never appended to an existing one;
//   • nothing is taken on the client's word: each user→assistant pair must
//     match an AnonTutorLog row the chat route itself wrote for THIS
//     browser's shishya_anon cookie, same exam scope, in the last 6 hours
//     (user text exact; reply's first 1,500 chars + full length). Pairs
//     that do not match are dropped, so a fabricated "assistant" turn can
//     never enter the tutor's history;
//   • a guest log row is imported once, by one account;
//   • size-capped (12 pairs, 8,000 chars a turn), rate-limited per user,
//     and at most 3 imports per user per 24 hours;
//   • timestamps are the logged ones, so the chat's study day is the day it
//     happened.
// No model call.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";

const Body = z.object({
  examCode: z.string().min(1).max(40).nullable(),
  turns: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(8000) }))
    .min(2)
    .max(24),
});

type LogRow = { id: string; userMessage: string; reply: string | null; replyChars: number | null; createdAt: Date };

const WINDOW_MS = 6 * 3600_000;
const MAX_IMPORTS_PER_DAY = 3;
const IMPORT_SOURCE = "guest-import";

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (!userId) return Response.json({ error: "sign in first" }, { status: 401 });

  // Its own bucket under the chat limit (30 a minute), keyed apart from chat turns.
  const rl = await checkRateLimit("chat", `import:${userId}`);
  if (!rl.ok) return rateLimited(rl);

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const anonId = (req.headers.get("cookie") || "").match(/(?:^|;\s*)shishya_anon=([^;]+)/)?.[1] ?? null;
  if (!anonId) return Response.json({ imported: 0, reason: "no-guest-log" });

  let examId: string | null = null;
  if (body.examCode) {
    const exam = await prisma.exam.findUnique({ where: { code: body.examCode }, select: { id: true, active: true } });
    if (!exam || !exam.active) return Response.json({ imported: 0, reason: "exam" });
    examId = exam.id;
  }

  const since = new Date(Date.now() - WINDOW_MS);
  const logs = await prisma.anonTutorLog.findMany({
    where: { anonId, examCode: body.examCode ?? null, createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
    take: 60,
    select: { id: true, userMessage: true, reply: true, replyChars: true, createdAt: true },
  });
  if (logs.length === 0) return Response.json({ imported: 0, reason: "no-guest-log" });

  // Walk the transcript as user→assistant pairs, in order; each pair must
  // match a later log row than the previous match.
  const matched: { user: string; assistant: string; log: LogRow }[] = [];
  let from = 0;
  for (let i = 0; i + 1 < body.turns.length && matched.length < 12; i++) {
    const u = body.turns[i];
    const a = body.turns[i + 1];
    if (u.role !== "user" || a.role !== "assistant") continue;
    const idx = logs.findIndex((l, k) => k >= from && logMatches(l, u.content, a.content));
    if (idx < 0) continue;
    matched.push({ user: u.content, assistant: a.content, log: logs[idx] });
    from = idx + 1;
    i++;
  }
  if (matched.length === 0) return Response.json({ imported: 0, reason: "not-verified" });

  // One import per guest conversation (keyed on its first logged turn), and
  // a daily cap per account. contextSnapshot->>'importedAt' is the import
  // time; createdAt is back-dated to the chat itself.
  const firstLogId = matched[0].log.id;
  const [taken, recent] = await Promise.all([
    prisma.$queryRaw<{ id: string; userId: string }[]>`
      SELECT id, "userId" FROM "ChatSession"
      WHERE "contextSnapshot"->>'source' = ${IMPORT_SOURCE} AND "contextSnapshot"->>'firstLogId' = ${firstLogId}
      LIMIT 1`,
    prisma.$queryRaw<{ n: number }[]>`
      SELECT COUNT(*)::int AS n FROM "ChatSession"
      WHERE "userId" = ${userId} AND "contextSnapshot"->>'source' = ${IMPORT_SOURCE}
        AND ("contextSnapshot"->>'importedAt')::timestamptz > NOW() - INTERVAL '24 hours'`,
  ]);
  if (taken[0]) {
    return taken[0].userId === userId
      ? Response.json({ imported: 0, reason: "already-imported", sessionId: taken[0].id })
      : Response.json({ imported: 0, reason: "not-verified" });
  }
  if ((recent[0]?.n ?? 0) >= MAX_IMPORTS_PER_DAY) return Response.json({ imported: 0, reason: "limit" });

  const sessionId = randomUUID();
  const startedAt = new Date(matched[0].log.createdAt.getTime() - 1);
  const rows: Prisma.ChatMessageCreateManyInput[] = [];
  for (const m of matched) {
    const t = m.log.createdAt.getTime();
    rows.push({ sessionId, role: "USER", content: m.user, createdAt: new Date(t - 1) });
    rows.push({ sessionId, role: "ASSISTANT", content: m.assistant, createdAt: new Date(t) });
  }
  try {
    await prisma.$transaction([
      prisma.chatSession.create({
        data: {
          id: sessionId,
          userId,
          examId,
          createdAt: startedAt,
          contextSnapshot: {
            source: IMPORT_SOURCE,
            firstLogId,
            pairs: matched.length,
            importedAt: new Date().toISOString(),
          },
        },
      }),
      prisma.chatMessage.createMany({ data: rows }),
    ]);
  } catch (err) {
    console.error("[chat/import] write failed:", err);
    return Response.json({ error: "could not save" }, { status: 500 });
  }

  return Response.json({
    imported: matched.length,
    sessionId,
    turns: matched.flatMap((m) => [
      { role: "user", content: m.user },
      { role: "assistant", content: m.assistant },
    ]),
  });
}

/** The chat route logs userMessage.slice(0, 2000), reply.slice(0, 1500)
 *  and the full reply length (src/app/api/chat/route.ts). */
function logMatches(l: LogRow, user: string, assistant: string): boolean {
  if (l.reply == null || l.userMessage !== user.slice(0, 2000)) return false;
  if (l.replyChars != null && l.replyChars !== assistant.length) return false;
  return assistant.slice(0, 1500) === l.reply;
}
