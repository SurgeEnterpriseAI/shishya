// POST /api/admin/mentors/[id] — approve/reject/note a mentor
// application. Session-admin gated. Raw SQL (client predates model).

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { isCurrentUserAdmin } from "@/lib/admin";
import { sendEmail } from "@/lib/email";

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

  const rows = await prisma.$queryRaw<
    { id: string; adminNotes: string | null; status: string; name: string; email: string | null; examCode: string }[]
  >`
    SELECT id, "adminNotes", status, name, email, "examCode" FROM "MentorApplication" WHERE id = ${id}`;
  if (rows.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (body.status) {
    await prisma.$executeRaw`
      UPDATE "MentorApplication" SET status = ${body.status}, "updatedAt" = NOW() WHERE id = ${id}`;

    // Tell the applicant the outcome — approval was silent before (audit
    // 18 Aug 2026), so approved mentors never learned they could start,
    // nor where the desk was. Only on an actual status change, and only
    // if we have an email to reach them.
    const app = rows[0];
    // Escape applicant-supplied name/examCode before HTML (review 22 Aug 2026).
    const esc = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const firstName = esc((app.name ?? "").split(" ")[0] || "there");
    const examSafe = esc((app.examCode ?? "").replace(/[^A-Za-z0-9_ -]/g, "").slice(0, 40));
    if (app.email && body.status !== app.status) {
      if (body.status === "APPROVED") {
        await sendEmail({
          to: app.email,
          subject: `You're now a Shishya mentor 🎓`,
          html: `<p>Namaste ${firstName},</p>
<p>Your application to mentor ${examSafe} aspirants has been <b>approved</b>. Thank you for giving your time to people walking the path you've already cleared.</p>
<p>Your mentor desk is here: <a href="https://shishya.in/mentor">shishya.in/mentor</a> — <b>sign in with this same email address</b> (Google sign-in) to see students who've asked to talk and shared their preparation report.</p>
<p>First session with any student is free. From their second, it's ₹9 for your time — paid to you, never to the platform.</p>
<p>— Shishya</p>`,
          tag: "mentor-approval",
        }).catch(() => {});
      } else if (body.status === "REJECTED") {
        await sendEmail({
          to: app.email,
          subject: `Your Shishya mentor application`,
          html: `<p>Namaste ${firstName},</p>
<p>Thank you for applying to mentor on Shishya. We're not able to take your application forward right now — often it's simply that we need clearer proof of clearing the exam, or we're not yet onboarding for ${examSafe}.</p>
<p>You're welcome to apply again with more detail any time at <a href="https://shishya.in/mentors">shishya.in/mentors</a>. And everything on Shishya stays free for your own preparation.</p>
<p>— Shishya</p>`,
          tag: "mentor-rejection",
        }).catch(() => {});
      }
    }
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
