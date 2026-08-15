// PATCH /api/mentor-sessions/[id] — mentor actions on a request.
//   { action: "take" }                       NEW → TAKEN (claims the student,
//                                            mints the meeting room, emails them)
//   { action: "done", sessionNote: "..." }   TAKEN → DONE (next-steps note)
//
// Auth: caller must hold an APPROVED MentorApplication (matched by
// userId or email). "done" additionally requires being the mentor who
// took the request.

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function approvedMentor(userId: string, email: string | null) {
  const rows = await prisma.$queryRaw<any[]>`
    SELECT id, name FROM "MentorApplication"
    WHERE status = 'APPROVED' AND ("userId" = ${userId} OR (email IS NOT NULL AND email = ${email}))
    LIMIT 1`;
  return rows[0] ?? null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ ok: false }, { status: 401 });
  const mentor = await approvedMentor(userId, session?.user?.email ?? null);
  if (!mentor) return Response.json({ ok: false, error: "not-a-mentor" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const rows = await prisma.$queryRaw<any[]>`
    SELECT r.id, r.status, r."mentorId", r."userId", u.name AS student_name, u.email AS student_email
    FROM "MentorSessionRequest" r JOIN "User" u ON u.id = r."userId"
    WHERE r.id = ${id} LIMIT 1`;
  const reqRow = rows[0];
  if (!reqRow) return Response.json({ ok: false }, { status: 404 });

  if (body?.action === "take") {
    if (reqRow.status !== "NEW") return Response.json({ ok: false, error: "already-taken" }, { status: 409 });
    const meetUrl = `https://meet.jit.si/ShishyaMentor-${id.slice(0, 12)}`;
    await prisma.$executeRaw`
      UPDATE "MentorSessionRequest"
      SET status = 'TAKEN', "mentorId" = ${mentor.id}, "meetUrl" = ${meetUrl},
          "takenAt" = NOW(), "updatedAt" = NOW()
      WHERE id = ${id} AND status = 'NEW'`;
    if (reqRow.student_email) {
      await sendEmail({
        to: reqRow.student_email,
        subject: `Your Shishya mentor is ready — ${mentor.name}`,
        html: `<p>Namaste ${reqRow.student_name ?? ""},</p>
<p><b>${mentor.name}</b> — who has cleared this path before — has picked up your request and can see your preparation report.</p>
<p>Join your session room here (works in any browser, no install):<br/>
<a href="${meetUrl}">${meetUrl}</a></p>
<p>Also visible any time on your report page: https://shishya.in/me/report</p>
<p>— Shishya</p>`,
        tag: "mentor-session",
      }).catch(() => {});
    }
    return Response.json({ ok: true, meetUrl });
  }

  if (body?.action === "done") {
    if (reqRow.mentorId !== mentor.id) return Response.json({ ok: false }, { status: 403 });
    const note = typeof body?.sessionNote === "string" ? body.sessionNote.slice(0, 2000) : null;
    await prisma.$executeRaw`
      UPDATE "MentorSessionRequest"
      SET status = 'DONE', "sessionNote" = ${note}, "updatedAt" = NOW()
      WHERE id = ${id}`;
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false, error: "unknown-action" }, { status: 400 });
}
