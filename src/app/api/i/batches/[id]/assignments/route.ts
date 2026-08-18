// POST /api/i/batches/[id]/assignments — educator sets an instruction
// for the batch ("complete 1 SSC CGL mock by Sunday"). Institution-
// session gated + batch-ownership checked. Raw SQL (client predates
// BatchAssignment). Students see it on their dashboard immediately;
// completion is tracked via attempts on the exam since creation.

import { NextResponse } from "next/server";
import { z } from "zod";
import { after } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireInstitutionSession } from "@/lib/institution-auth";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

const Body = z.object({
  title: z.string().trim().min(3).max(200),
  instructions: z.string().trim().max(2000).optional().or(z.literal("")),
  examCode: z.string().trim().max(64).optional().or(z.literal("")),
  dueAt: z.string().datetime().optional().or(z.literal("")),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  let institution;
  try {
    ({ institution } = await requireInstitutionSession());
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const batch = await prisma.batch.findUnique({
    where: { id },
    select: { id: true, course: { select: { institutionId: true } } },
  });
  if (!batch || batch.course.institutionId !== institution.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Give the assignment a short title (3+ chars)." }, { status: 400 });
  }

  // Resolve a typed exam code (canonical) when one was given — accept
  // exact code or shortName, case-insensitive. Unresolvable → stored
  // null and the assignment is instruction-only (still fully valid).
  let examCode: string | null = null;
  if (body.examCode) {
    const q = body.examCode.trim();
    const exam = await prisma.exam
      .findFirst({
        where: {
          active: true,
          OR: [
            { code: { equals: q.toUpperCase().replace(/[\s-]+/g, "_") } },
            { shortName: { equals: q, mode: "insensitive" } },
          ],
        },
        select: { code: true },
      })
      .catch(() => null);
    examCode = exam?.code ?? null;
  }

  const aid = crypto.randomUUID();
  const ok = await prisma
    .$executeRaw`
      INSERT INTO "BatchAssignment" (id, "batchId", title, instructions, "examCode", "dueAt")
      VALUES (${aid}, ${id}, ${body.title}, ${body.instructions || null}, ${examCode},
              ${body.dueAt ? new Date(body.dueAt) : null})
    `
    .then(() => true)
    .catch((e) => {
      console.error("assignment create failed:", e);
      return false;
    });
  if (!ok) return NextResponse.json({ error: "Couldn't save — try again." }, { status: 500 });

  // Notify active batch members — an assignment used to reach only
  // students who happened to open their dashboard (audit 18 Aug 2026).
  // After the response so the educator isn't kept waiting on the fan-out.
  after(async () => {
    try {
      const members = await prisma.$queryRaw<{ id: string; email: string; name: string | null }[]>`
        SELECT u.id, u.email, u.name
        FROM "BatchEnrollment" be JOIN "User" u ON u.id = be."userId"
        WHERE be."batchId" = ${id} AND be.status = 'ACTIVE' AND u.email <> ''
        LIMIT 500`;
      const due = body.dueAt
        ? ` (due ${new Date(body.dueAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })})`
        : "";
      for (const m of members) {
        await sendEmail({
          to: m.email,
          unsubUserId: m.id,
          subject: `New task from your educator: ${body.title}`,
          html: `<p>Namaste ${(m.name ?? "").split(" ")[0] || "there"},</p>
<p>Your educator set a new task for your batch${due}:</p>
<p style="font-size:15px;font-weight:600">${body.title.replace(/</g, "&lt;")}</p>
${body.instructions ? `<p>${body.instructions.replace(/</g, "&lt;")}</p>` : ""}
${examCode ? `<p>Start here: <a href="https://shishya.in/exams/${examCode}">shishya.in/exams/${examCode}</a></p>` : ""}
<p>It's on your <a href="https://shishya.in/dashboard">dashboard</a> too.</p>
<p>— Shishya</p>`,
          tag: "batch-assignment",
        }).catch(() => {});
      }
    } catch (e) {
      console.error("[assignments] member notify failed (non-fatal):", e);
    }
  });

  return NextResponse.json({ ok: true, id: aid, examCode });
}
