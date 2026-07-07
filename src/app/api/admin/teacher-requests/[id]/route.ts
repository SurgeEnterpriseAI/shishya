// POST /api/admin/teacher-requests/[id] — work an expert enquiry.
// Session-admin gated. One endpoint, three optional actions per call:
//   { status?: PENDING|CONTACTED|RESOLVED|CLOSED,   ← advance the loop
//     referredTo?: string,                          ← coaching centre / expert routed to
//     note?: string, noteKind?: NOTE|CALL|FOLLOW_UP|REFERRAL }  ← log the interaction
// Every note is stamped with the admin's email so the follow-up trail is
// attributable — this is the record-keeping that closes the enquiry loop.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { isCurrentUserAdmin } from "@/lib/admin";

export const runtime = "nodejs";

const Body = z.object({
  status: z.enum(["PENDING", "CONTACTED", "RESOLVED", "CLOSED"]).optional(),
  referredTo: z.string().max(300).optional(),
  note: z.string().trim().min(1).max(4000).optional(),
  noteKind: z.enum(["NOTE", "CALL", "FOLLOW_UP", "REFERRAL"]).default("NOTE"),
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

  const existing = await prisma.teacherRequest.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (body.status || body.referredTo !== undefined) {
    await prisma.teacherRequest.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.referredTo !== undefined ? { referredTo: body.referredTo || null } : {}),
      },
    });
  }

  if (body.note) {
    await prisma.teacherRequestNote.create({
      data: { requestId: id, note: body.note, kind: body.noteKind, byEmail: email ?? null },
    });
  }

  return NextResponse.json({ ok: true });
}
