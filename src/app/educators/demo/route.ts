// GET /educators/demo — stable redirect to the live demo batch's join
// link. The demo institution (slug "shishya-demo") is created once on
// prod; educators tap this from outreach messages and experience the
// student side with their own Google account. If the demo batch is
// ever missing, fall back to self-serve creation so the link never
// dead-ends.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const base = new URL(req.url).origin;
  const batch = await prisma.batch
    .findFirst({
      where: { archived: false, course: { institution: { slug: "shishya-demo" } } },
      orderBy: { createdAt: "asc" },
      select: { inviteCode: true },
    })
    .catch(() => null);
  return NextResponse.redirect(
    batch ? `${base}/join/${batch.inviteCode}` : `${base}/institutions/new`,
    { status: 307 },
  );
}
