// POST /api/teacher-request — "Talk to a real teacher" (human-connection pilot).
//
// Captures a student's request for 1:1 help from a real teacher and routes it
// to the team (email + /admin/teacher-requests). Works for signed-in AND
// anonymous visitors — the whole point is to measure demand at the highest-
// intent moments before we invest in teacher supply/scheduling. Nothing here
// is gated; there is no teacher marketplace yet.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { sendTeacherRequestEmail } from "@/lib/email";

export const runtime = "nodejs";

const ANON_COOKIE = "shishya_anon";

const Body = z.object({
  message: z.string().trim().min(5).max(2000),
  surface: z.enum(["results", "topic", "chat", "onboarding", "nav", "exam"]).default("nav"),
  examCode: z.string().max(64).optional(),
  topicCode: z.string().max(128).optional(),
  attemptId: z.string().max(64).optional(),
  contactEmail: z.string().email().max(200).optional(),
  contactName: z.string().max(120).optional(),
  contactPhone: z.string().max(40).optional(),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json(
      { error: "Please add a short note (5+ chars) about what you need help with." },
      { status: 400 },
    );
  }

  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;
  const anonId = req.cookies.get(ANON_COOKIE)?.value ?? null;

  // Light anti-spam: cap open requests per identity per day.
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const recent = await prisma.teacherRequest
    .count({
      where: {
        createdAt: { gte: since },
        ...(userId ? { userId } : anonId ? { anonId } : {}),
      },
    })
    .catch(() => 0);
  if (recent >= 5) {
    return NextResponse.json(
      { error: "You've already sent a few requests — our team will reach out soon." },
      { status: 429 },
    );
  }

  // Fall back to the signed-in user's own email/name when the form is blank.
  const contactEmail = body.contactEmail ?? session?.user?.email ?? null;
  const contactName = body.contactName ?? session?.user?.name ?? null;

  const created = await prisma.teacherRequest
    .create({
      data: {
        userId,
        anonId: userId ? null : anonId,
        examCode: body.examCode ?? null,
        topicCode: body.topicCode ?? null,
        attemptId: body.attemptId ?? null,
        surface: body.surface,
        message: body.message,
        contactEmail,
        contactName,
        contactPhone: body.contactPhone ?? null,
      },
      select: { id: true },
    })
    .catch((e) => {
      console.error("teacher-request create failed:", e);
      return null;
    });

  if (!created) {
    return NextResponse.json({ error: "Couldn't save that — please try again." }, { status: 500 });
  }

  // Notify the team (best-effort — never block the response on email).
  const notifyTo =
    process.env.TEACHER_REQUEST_NOTIFY_EMAIL ??
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)[0] ??
    null;
  if (notifyTo) {
    void sendTeacherRequestEmail({
      to: notifyTo,
      surface: body.surface,
      examCode: body.examCode ?? null,
      topicCode: body.topicCode ?? null,
      studentName: contactName,
      contactEmail,
      contactPhone: body.contactPhone ?? null,
      message: body.message,
      signedIn: Boolean(userId),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, id: created.id });
}
