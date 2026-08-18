// Deliver a teacher-request answer to the student by email.
//
// Before this (audit 18 Aug 2026) an answer only landed on an in-app
// follow-up card the student had to happen to revisit — the "24h
// closure guarantee" delivered into a surface they might never see
// again. Now the answer is emailed the moment it's written (team route
// or the SLA cron), so the loop actually reaches the human who asked.
//
// This is transactional (a direct reply to the student's own ask), so
// it always sends — no opt-out gate.

import { prisma } from "./db/prisma";
import { sendEmail } from "./email";

export async function emailTeacherRequestAnswer(requestId: string): Promise<void> {
  const rows = await prisma.$queryRaw<
    Array<{ answerText: string | null; contactEmail: string | null; contactName: string | null; userEmail: string | null; userName: string | null; examCode: string | null }>
  >`
    SELECT tr."answerText", tr."contactEmail", tr."contactName", tr."examCode",
           u.email AS "userEmail", u.name AS "userName"
    FROM "TeacherRequest" tr
    LEFT JOIN "User" u ON u.id = tr."userId"
    WHERE tr.id = ${requestId} LIMIT 1`;
  const r = rows[0];
  if (!r || !r.answerText) return;

  const to = r.userEmail ?? r.contactEmail;
  if (!to) return; // no way to reach this student (anon, no email left)

  const name = (r.userName ?? r.contactName ?? "").split(" ")[0] || "there";
  const examBit = r.examCode ? ` about ${r.examCode}` : "";
  const safe = r.answerText.replace(/</g, "&lt;");

  await sendEmail({
    to,
    subject: `Your Shishya answer is ready${examBit}`,
    html: `<p>Namaste ${name},</p>
<p>You asked us a question${examBit} — here's your answer:</p>
<blockquote style="border-left:3px solid #f59e0b;margin:12px 0;padding:10px 14px;background:#fffbeb;white-space:pre-wrap">${safe}</blockquote>
<p>It's also on your follow-up card at <a href="https://shishya.in/dashboard">shishya.in</a>, where you can tell us if it helped or ask for more.</p>
<p>— Shishya</p>`,
    tag: "teacher-request-answer",
  }).catch(() => {});
}
