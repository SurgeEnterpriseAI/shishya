// GET /api/admin/anon-tutor-logs — recent anonymous tutor turns, grouped
// into conversations by anonId, so the ungated-tutor experience can be
// analysed (what signed-out users ask, follow-up depth). Bearer ${CRON_SECRET}.
//
//   curl -H "Authorization: Bearer $CRON_SECRET" \
//        "https://shishya.in/api/admin/anon-tutor-logs?limit=200"

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${expected}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const limit = Math.min(Math.max(Number(new URL(req.url).searchParams.get("limit")) || 200, 1), 1000);

  const logs = await prisma.anonTutorLog.findMany({
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { anonId: true, examCode: true, userMessage: true, replyChars: true, createdAt: true },
  });

  // Group into conversations by anonId.
  const convos = new Map<string, { anonId: string | null; turns: { q: string; replyChars: number | null; at: Date }[] }>();
  for (const l of logs) {
    const key = l.anonId ?? `null:${l.createdAt.getTime()}`;
    if (!convos.has(key)) convos.set(key, { anonId: l.anonId, turns: [] });
    convos.get(key)!.turns.push({ q: l.userMessage, replyChars: l.replyChars, at: l.createdAt });
  }
  const conversations = [...convos.values()].map((c) => ({
    anonId: c.anonId ? c.anonId.slice(0, 8) : null,
    turns: c.turns.length,
    exam: undefined as string | undefined,
    messages: c.turns.map((t) => t.q),
  }));

  return Response.json({
    ok: true,
    totalTurns: logs.length,
    conversations: conversations.length,
    multiTurn: conversations.filter((c) => c.turns > 1).length,
    detail: conversations,
  });
}
