// POST /api/me/batches/leave  { batchId } — student leaves an educator's
// batch. The join page promises "you can leave any time from your
// dashboard" but no such path existed (audit 18 Aug 2026). Sets the
// student's OWN enrollment to LEFT — the educator stops seeing their
// progress. Idempotent and owner-scoped.

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

const Body = z.object({ batchId: z.string().min(1) });

export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "batchId required" }, { status: 400 });
  }

  await prisma.batchEnrollment
    .updateMany({
      where: { batchId: body.batchId, userId, status: "ACTIVE" },
      data: { status: "LEFT" },
    })
    .catch(() => {});

  return NextResponse.json({ ok: true });
}
