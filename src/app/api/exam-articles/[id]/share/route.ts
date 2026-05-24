// POST /api/exam-articles/[id]/share — record that a user clicked a
// share button on an article.
//
// Body: { channel: ShareChannel }
//   TWITTER | WHATSAPP | TELEGRAM | LINKEDIN | FACEBOOK | COPY_LINK
//
// Tracker-only: never blocks the user's share action. The ShareButtons
// client component fires this in the background with keepalive: true
// so it survives even if the user navigates away to the share dialog.

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import type { ShareChannel } from "@prisma/client";

export const runtime = "nodejs";

const ANON_COOKIE = "shishya_anon";
const VALID: Set<ShareChannel> = new Set([
  "TWITTER",
  "WHATSAPP",
  "TELEGRAM",
  "LINKEDIN",
  "FACEBOOK",
  "COPY_LINK",
] as const);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: articleId } = await params;

  let body: { channel?: string };
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const channel = body.channel;
  if (typeof channel !== "string" || !VALID.has(channel as ShareChannel)) {
    return new NextResponse(null, { status: 204 });
  }

  // Don't verify article existence with a SELECT — adds latency to
  // a fire-and-forget tracker. If the FK breaks, the INSERT fails
  // gracefully (caught below).
  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;
  const anonId = userId ? null : req.cookies.get(ANON_COOKIE)?.value ?? null;

  try {
    await prisma.examArticleShare.create({
      data: {
        articleId,
        channel: channel as ShareChannel,
        userId,
        anonId,
      },
    });
  } catch {
    // swallow — share tracking failure must not break the user's flow
  }

  return new NextResponse(null, { status: 204 });
}
