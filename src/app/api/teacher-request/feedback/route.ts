// POST /api/teacher-request/feedback — the student closes (or reopens)
// their own teacher-request loop with one tap.
//
//   { id, rating: GOT_HELP | NOT_YET | SOLVED | NEED_MORE_HELP }
//
//   GOT_HELP        "Yes, the teacher reached me & helped" → RESOLVED
//   NOT_YET         "No one reached me yet" → team re-nudged by email;
//                   student is promised the guaranteed chat answer
//   SOLVED          written answer worked → RESOLVED
//   NEED_MORE_HELP  written answer wasn't enough → reopened to PENDING,
//                   team nudged — goes back to the top of the queue
//
// Identity-checked against the same user/anon rule as creation, so a
// student can only rate their own requests. Every rating is logged as
// a TeacherRequestNote so the admin trail shows the student's side too.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { sendTeacherRequestEmail } from "@/lib/email";

export const runtime = "nodejs";

const ANON_COOKIE = "shishya_anon";

const Body = z.object({
  id: z.string().min(5).max(64),
  rating: z.enum(["GOT_HELP", "NOT_YET", "SOLVED", "NEED_MORE_HELP"]),
});

const RATING_LABEL: Record<string, string> = {
  GOT_HELP: "✅ Student confirms the teacher reached them and helped.",
  NOT_YET: "⚠️ STUDENT SAYS NO ONE HAS REACHED THEM YET — they were promised a callback shortly and a guaranteed written answer. Please work this one next.",
  SOLVED: "✅ Student rated the written answer SOLVED.",
  NEED_MORE_HELP: "🔁 REOPENED — student read the written answer and still needs more help. Back to the top of the queue.",
};

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;
  const anonId = req.cookies.get(ANON_COOKIE)?.value ?? null;

  const reqRow = await prisma.teacherRequest
    .findUnique({
      where: { id: body.id },
      select: { id: true, userId: true, anonId: true, examCode: true, surface: true, message: true, contactEmail: true, contactName: true, contactPhone: true },
    })
    .catch(() => null);
  if (!reqRow) return NextResponse.json({ error: "not found" }, { status: 404 });

  const owns =
    (reqRow.userId && reqRow.userId === userId) ||
    (!reqRow.userId && reqRow.anonId && reqRow.anonId === anonId);
  if (!owns) return NextResponse.json({ error: "not yours" }, { status: 403 });

  const closes = body.rating === "GOT_HELP" || body.rating === "SOLVED";
  await prisma.$executeRaw`
    UPDATE "TeacherRequest"
    SET "studentRating" = ${body.rating},
        "ratedAt" = NOW(),
        status = CASE
          WHEN ${closes} THEN 'RESOLVED'::"TeacherRequestStatus"
          WHEN ${body.rating === "NEED_MORE_HELP"} THEN 'PENDING'::"TeacherRequestStatus"
          ELSE status
        END,
        "updatedAt" = NOW()
    WHERE id = ${body.id}
  `;

  void prisma.teacherRequestNote
    .create({
      data: { requestId: body.id, kind: "FOLLOW_UP", note: RATING_LABEL[body.rating], byEmail: "student" },
    })
    .catch(() => {});

  // Nudge the team on the two ratings that mean "the student is still
  // waiting" — same inbox as new requests so nothing new to monitor.
  if (body.rating === "NOT_YET" || body.rating === "NEED_MORE_HELP") {
    const notifyTo =
      process.env.TEACHER_REQUEST_NOTIFY_EMAIL ??
      (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean)[0] ??
      null;
    if (notifyTo) {
      void sendTeacherRequestEmail({
        to: notifyTo,
        surface: reqRow.surface,
        examCode: reqRow.examCode,
        topicCode: null,
        studentName: reqRow.contactName,
        contactEmail: reqRow.contactEmail,
        contactPhone: reqRow.contactPhone,
        message: `${RATING_LABEL[body.rating]}\n\nOriginal request (${body.id}):\n${reqRow.message.slice(0, 500)}`,
        signedIn: Boolean(reqRow.userId),
      }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true, closed: closes });
}
