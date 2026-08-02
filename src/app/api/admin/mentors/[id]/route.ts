// POST /api/admin/mentors/[id] — approve/reject/note a mentor
// application. Session-admin gated. Raw SQL (client predates model).

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { isCurrentUserAdmin } from "@/lib/admin";

export const runtime = "nodejs";

const Body = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  note: z.string().trim().min(1).max(2000).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { isAdmin, email } = await isCurrentUserAdmin();
  if (!isAdmin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const rows = await prisma.$queryRaw<{ id: string; adminNotes: string | null }[]>`
    SELECT id, "adminNotes" FROM "MentorApplication" WHERE id = ${id}`;
  if (rows.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (body.status) {
    await prisma.$executeRaw`
      UPDATE "MentorApplication" SET status = ${body.status}, "updatedAt" = NOW() WHERE id = ${id}`;
  }
  if (body.note) {
    // Append with a stamp so the trail stays readable.
    const stamp = `[${new Date().toISOString().slice(0, 10)} ${email ?? "admin"}] ${body.note}`;
    const merged = rows[0].adminNotes ? `${rows[0].adminNotes}\n${stamp}` : stamp;
    await prisma.$executeRaw`
      UPDATE "MentorApplication" SET "adminNotes" = ${merged}, "updatedAt" = NOW() WHERE id = ${id}`;
  }

  return NextResponse.json({ ok: true });
}
