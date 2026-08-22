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
import { createMentorFeeLink, cancelLink } from "@/lib/razorpay";

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
    SELECT r.id, r.status, r."mentorId", r."userId", r."feeDue", r."paidAt", r."paymentLinkId",
           u.name AS student_name, u.email AS student_email
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
<p>One small step before the room opens: <b>₹9 (inclusive of GST)</b> — and we want to be clear about what it is. <b>This is only for your mentor's personal time</b> — a real person who cleared your exam, sitting down just for you. Everything else on Shishya — every mock, note, plan and report — is free and stays free forever. Less than a cup of chai, for a conversation that can reshape your preparation.</p>
<p><a href="${payLink.shortUrl}">Honour your mentor's time — pay ₹9 and unlock the room →</a></p>
<p>The room link appears on your report page the moment payment completes: https://shishya.in/me/report</p>
<p>— Shishya</p>`
        : `<p>Namaste ${reqRow.student_name ?? ""},</p>
<p><b>${mentor.name}</b> — who has cleared this path before — has picked up your request and can see your preparation report.</p>
<p>Join your session room here (works in any browser, no install):<br/>
<a href="${meetUrl}">${meetUrl}</a></p>
<p><b>When you enter the room</b>, tap "🎥 I'm in the room — ping my mentor" on your <a href="https://shishya.in/me/report">report page</a> — your mentor gets an instant email and joins you. You can also message them there to fix a better time.</p>
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
    // If a fee was due but never paid, cancel the link so the student
    // can't pay for a session that's now over (audit 18 Aug 2026).
    if (reqRow.feeDue && !reqRow.paidAt && reqRow.paymentLinkId) {
      await cancelLink(reqRow.paymentLinkId).catch(() => {});
    }
    const doneChanged = await prisma.$executeRaw`
      UPDATE "MentorSessionRequest"
      SET status = 'DONE', "sessionNote" = ${note}, "updatedAt" = NOW()
      WHERE id = ${id} AND status = 'TAKEN'`;
    // Rowcount guard (review 22 Aug 2026): a double submit must not
    // re-write DONE and re-send the next-steps email.
    if (Number(doneChanged) === 0) {
      return Response.json({ ok: false, error: "already-closed" }, { status: 409 });
    }
    // Two-actor rule: the note must REACH the student, not sit in the DB
    // until they happen to revisit — email it the moment the mentor closes.
    if (reqRow.student_email && note) {
      await sendEmail({
        to: reqRow.student_email,
        subject: `Your next steps from ${mentor.name} — Shishya mentor session`,
        html: `<p>Namaste ${reqRow.student_name ?? ""},</p>
<p>Your mentor <b>${mentor.name}</b> wrapped up your session and wrote down your next steps:</p>
<blockquote style="border-left:3px solid #f59e0b;margin:12px 0;padding:8px 12px;background:#fffbeb">${note.replace(/</g, "&lt;")}</blockquote>
<p>It stays on your <a href="https://shishya.in/me/report">report page</a> too. Work the plan a little every day — and when you want the next conversation, request a session from the same page.</p>
<p>— Shishya</p>`,
        tag: "mentor-session",
      }).catch(() => {});
    }
    return Response.json({ ok: true });
  }

  // The call never happened — hand the student back to the waiting list.
  // Before this existed, the only exit from TAKEN was a "done" with a
  // note, which burned the student's free first session and told them a
  // session had occurred (audit 18 Aug 2026).
  if (body?.action === "release") {
    if (reqRow.mentorId !== mentor.id) return Response.json({ ok: false }, { status: 403 });
    // MONEY SAFETY (review 22 Aug 2026): the DB's paidAt can lag Razorpay
    // (payment is only reconciled when the student's report page loads).
    // Before wiping a fee-due session, ask Razorpay directly — a paid
    // session must NEVER be released (that would lose the student's ₹9
    // with no trace). If paid: record it and refuse the release.
    if (reqRow.feeDue && !reqRow.paidAt && reqRow.paymentLinkId) {
      const { isLinkPaid } = await import("@/lib/razorpay");
      if (await isLinkPaid(reqRow.paymentLinkId).catch(() => false)) {
        await prisma.$executeRaw`
          UPDATE "MentorSessionRequest" SET "paidAt" = NOW(), "updatedAt" = NOW()
          WHERE id = ${id} AND "paidAt" IS NULL`;
        return Response.json(
          { ok: false, error: "student-has-paid", message: "This student has already paid for the session — it can't be released. Please hold the session or complete it." },
          { status: 409 },
        );
      }
      await cancelLink(reqRow.paymentLinkId).catch(() => {});
    }
    const changed = await prisma.$executeRaw`
      UPDATE "MentorSessionRequest"
      SET status = 'NEW', "mentorId" = NULL, "meetUrl" = NULL, "takenAt" = NULL,
          "feeDue" = FALSE, "paymentLinkId" = NULL, "paymentLink" = NULL,
          "updatedAt" = NOW()
      WHERE id = ${id} AND status = 'TAKEN' AND "paidAt" IS NULL`;
    // Rowcount guard: if nothing changed (paid in the meantime, or already
    // closed), say so — don't email the student a "couldn't happen" note
    // for a session that's actually live.
    if (Number(changed) === 0) {
      return Response.json({ ok: false, error: "not-released", message: "Nothing to release — the session is paid or already closed. Refresh the desk." }, { status: 409 });
    }
    if (reqRow.student_email) {
      await sendEmail({
        to: reqRow.student_email,
        subject: `Your Shishya mentor session — let's find you another time`,
        html: `<p>Namaste ${reqRow.student_name ?? ""},</p>
<p>That session couldn't happen, so we've put your request back at the front of the queue — <b>your free session is still yours</b>, nothing was used up.</p>
<p>A mentor will pick it up again shortly. You can also add a line about when you're usually free on your <a href="https://shishya.in/me/report">report page</a> — it helps them reach you at the right time.</p>
<p>Meanwhile your mocks, plan and daily study pack are all where you left them.</p>
<p>— Shishya</p>`,
        tag: "mentor-session",
      }).catch(() => {});
    }
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false, error: "unknown-action" }, { status: 400 });
}
