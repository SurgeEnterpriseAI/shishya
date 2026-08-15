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
import { createMentorFeeLink } from "@/lib/razorpay";

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

    // Founder policy: first session free forever; from the second, ₹9
    // incl. GST — asked only now that a mentor has actually accepted.
    const prior = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*)::int AS n FROM "MentorSessionRequest"
      WHERE "userId" = ${reqRow.userId} AND status = 'DONE' AND id <> ${id}`;
    let feeDue = (prior[0]?.n ?? 0) >= 1;
    let payLink: { id: string; shortUrl: string } | null = null;
    if (feeDue) {
      payLink = await createMentorFeeLink({
        requestId: id,
        studentName: reqRow.student_name ?? null,
        studentEmail: reqRow.student_email ?? null,
      });
      // Gateway unavailable/misconfigured → never block a mentor's
      // accept over ₹9: fall back to free.
      if (!payLink) feeDue = false;
    }

    await prisma.$executeRaw`
      UPDATE "MentorSessionRequest"
      SET status = 'TAKEN', "mentorId" = ${mentor.id}, "meetUrl" = ${meetUrl},
          "feeDue" = ${feeDue}, "paymentLinkId" = ${payLink?.id ?? null},
          "paymentLink" = ${payLink?.shortUrl ?? null},
          "takenAt" = NOW(), "updatedAt" = NOW()
      WHERE id = ${id} AND status = 'NEW'`;

    if (reqRow.student_email) {
      const html = feeDue && payLink
        ? `<p>Namaste ${reqRow.student_name ?? ""},</p>
<p><b>${mentor.name}</b> — who has cleared this path before — has accepted your session request and can see your preparation report.</p>
<p>Since this is not your first session, there's a small fee that honours your mentor's time: <b>₹9 (inclusive of GST)</b>. The platform itself stays free, always.</p>
<p><a href="${payLink.shortUrl}">Pay ₹9 and unlock your session room →</a></p>
<p>The room link appears on your report page the moment payment completes: https://shishya.in/me/report</p>
<p>— Shishya</p>`
        : `<p>Namaste ${reqRow.student_name ?? ""},</p>
<p><b>${mentor.name}</b> — who has cleared this path before — has picked up your request and can see your preparation report.</p>
<p>Join your session room here (works in any browser, no install):<br/>
<a href="${meetUrl}">${meetUrl}</a></p>
<p>Also visible any time on your report page: https://shishya.in/me/report</p>
<p>— Shishya</p>`;
      await sendEmail({
        to: reqRow.student_email,
        subject: feeDue
          ? `Your Shishya mentor accepted — one step to unlock the room`
          : `Your Shishya mentor is ready — ${mentor.name}`,
        html,
        tag: "mentor-session",
      }).catch(() => {});
    }
    return Response.json({ ok: true, meetUrl, feeDue });
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
