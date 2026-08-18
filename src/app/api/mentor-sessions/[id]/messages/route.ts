// POST /api/mentor-sessions/[id]/messages — one message into the
// session thread, from either side. Auth: the student who owns the
// request, or the approved mentor who took it (or any approved mentor
// while it's still NEW — so a mentor can ask a clarifying question
// before taking). The counterpart gets an email pointing at their
// surface (student → /me/report, mentor → /mentor/[id]).

import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ ok: false }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const text = typeof body?.body === "string" ? body.body.trim().slice(0, 1500) : "";
  if (text.length < 1) return Response.json({ ok: false, error: "empty" }, { status: 400 });

  const rows = await prisma.$queryRaw<any[]>`
    SELECT r.id, r."userId", r."mentorId", r."meetUrl", r."feeDue", r."paidAt",
           u.name AS student_name, u.email AS student_email,
           ma.name AS mentor_name, ma.email AS mentor_email, ma."userId" AS mentor_user_id
    FROM "MentorSessionRequest" r
    JOIN "User" u ON u.id = r."userId"
    LEFT JOIN "MentorApplication" ma ON ma.id = r."mentorId"
    WHERE r.id = ${id} LIMIT 1`;
  const r = rows[0];
  if (!r) return Response.json({ ok: false }, { status: 404 });

  const isStudent = r.userId === userId;
  let isMentor = false;
  if (!isStudent) {
    const m = await prisma.$queryRaw<any[]>`
      SELECT id FROM "MentorApplication"
      WHERE status = 'APPROVED' AND ("userId" = ${userId} OR (email IS NOT NULL AND email = ${session?.user?.email ?? null}))
        AND (${r.mentorId}::text IS NULL OR id = ${r.mentorId})
      LIMIT 1`;
    isMentor = Boolean(m[0]);
  }
  if (!isStudent && !isMentor) return Response.json({ ok: false }, { status: 403 });

  await prisma.$executeRaw`
    INSERT INTO "MentorSessionMessage" (id, "requestId", "from", body, "createdAt")
    VALUES (${randomUUID()}, ${id}, ${isStudent ? "STUDENT" : "MENTOR"}, ${text}, NOW())`;

  // Notify the other side by email — tiny volumes, always relevant.
  const to = isStudent ? (r.mentor_email as string | null) : (r.student_email as string | null);
  // The room link is a paid good once a fee is due: never put it in an
  // email to a student who hasn't paid (audit 18 Aug 2026 — this leaked
  // the Jitsi URL and bypassed the ₹9 gate entirely). Mentors always
  // get it; students get it only when nothing is owed.
  const roomVisible = isStudent || !(r.feeDue && !r.paidAt);
  if (to) {
    await sendEmail({
      to,
      subject: isStudent
        ? `${r.student_name ?? "Your student"} replied — Shishya mentor session`
        : `Your mentor ${r.mentor_name ?? ""} sent a message — Shishya`,
      html: `<p>${isStudent ? r.student_name ?? "Your student" : `Your mentor ${r.mentor_name ?? ""}`} says:</p>
<blockquote style="border-left:3px solid #f59e0b;padding-left:10px;color:#333">${text.replace(/</g, "&lt;")}</blockquote>
<p>Reply here: <a href="${isStudent ? `https://shishya.in/mentor/${id}` : "https://shishya.in/me/report"}">${isStudent ? "mentor desk" : "your report page"}</a>${r.meetUrl && roomVisible ? `<br/>Session room: <a href="${r.meetUrl}">${r.meetUrl}</a>` : ""}</p>
<p>— Shishya</p>`,
      tag: "mentor-session",
    }).catch(() => {});
  }
  return Response.json({ ok: true });
}
