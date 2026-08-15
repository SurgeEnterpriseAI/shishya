// POST /api/mentor-sessions — the aspirant's "talk to a mentor" ask,
// fired from the Student-360 report. Consent is REQUIRED: it's the
// privacy gate that lets a verified mentor see their behavioural 360.
// One open request per student — a repeat POST returns the existing one.

import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ ok: false, error: "signin" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (body?.consent !== true) {
    return Response.json({ ok: false, error: "consent-required" }, { status: 400 });
  }
  const note = typeof body?.note === "string" ? body.note.slice(0, 1000) : null;
  const examCode = typeof body?.examCode === "string" ? body.examCode.slice(0, 40) : null;

  const open = await prisma.$queryRaw<any[]>`
    SELECT id, status FROM "MentorSessionRequest"
    WHERE "userId" = ${userId} AND status IN ('NEW','TAKEN')
    ORDER BY "createdAt" DESC LIMIT 1`;
  if (open[0]) return Response.json({ ok: true, id: open[0].id, status: open[0].status, existing: true });

  const id = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "MentorSessionRequest" (id, "userId", "examCode", note, consent, status, "createdAt", "updatedAt")
    VALUES (${id}, ${userId}, ${examCode}, ${note}, TRUE, 'NEW', NOW(), NOW())`;

  const admin =
    (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean)[0] ?? null;
  if (admin) {
    const u = await prisma.$queryRaw<any[]>`SELECT name, email FROM "User" WHERE id = ${userId}`;
    await sendEmail({
      to: admin,
      subject: `Mentor session request — ${u[0]?.name ?? "aspirant"}${examCode ? ` (${examCode})` : ""}`,
      html: `<p><b>${u[0]?.name ?? "An aspirant"}</b> (${u[0]?.email ?? "no email"}) asked to talk to a mentor.</p>
<p>Exam: ${examCode ?? "—"}<br/>Note: ${note ?? "—"}</p>
<p>Their full 360 is on the mentor screen: https://shishya.in/mentor</p>`,
      tag: "mentor-session",
    }).catch(() => {});
  }
  return Response.json({ ok: true, id, status: "NEW" });
}
