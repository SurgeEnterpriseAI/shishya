// POST /api/ops/bot-hit — sink for AI-crawler visit logging.
//
// Edge middleware detects known AI-bot user agents and fires this
// endpoint fire-and-forget (waitUntil), since Prisma can't run at the
// edge. Raw SQL insert so it works without a client regen. Observability
// only — a spoofed POST costs us one harmless row, so no auth beyond
// basic input caps.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";

export async function POST(req: Request) {
  try {
    const { bot, path } = (await req.json()) as { bot?: string; path?: string };
    if (!bot || typeof bot !== "string" || bot.length > 40) {
      return Response.json({ ok: false }, { status: 400 });
    }
    await prisma.$executeRawUnsafe(
      `INSERT INTO "BotVisit" (id, bot, path, at) VALUES (gen_random_uuid()::text, $1, $2, NOW())`,
      bot.slice(0, 40),
      (typeof path === "string" ? path : "/").slice(0, 300),
    );
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
