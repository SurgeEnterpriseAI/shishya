// GET /api/teacher-request/mine — the student's own open teacher
// requests, for the follow-up card (closure-guarantee loop).
//
// Identity = session user OR the pseudonymous anon cookie — same rule
// as request creation, so guests get the loop too with zero friction.
// Returns at most 3 recent requests still needing student action:
//   • awaiting  — no answer yet, student hasn't confirmed help
//   • answered  — written answer waiting for a Solved / Need-more-help
// Fully-closed requests (RESOLVED/CLOSED or rated SOLVED/GOT_HELP)
// are excluded — the card disappears when the loop is closed.
//
// New follow-up columns are raw-SQL: the generated client predates
// them (established pattern — regenerate is flaky on this machine).

import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ANON_COOKIE = "shishya_anon";

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;
  const anonId = req.cookies.get(ANON_COOKIE)?.value ?? null;
  if (!userId && !anonId) return NextResponse.json({ requests: [] });

  const rows = await prisma
    .$queryRaw<
      {
        id: string;
        examCode: string | null;
        message: string;
        status: string;
        createdAt: Date;
        answerText: string | null;
        answeredAt: Date | null;
        answeredBy: string | null;
        studentRating: string | null;
      }[]
    >`
      SELECT id, "examCode", message, status::text AS status, "createdAt",
             "answerText", "answeredAt", "answeredBy", "studentRating"
      FROM "TeacherRequest"
      WHERE ${userId ? Prisma.sql`"userId" = ${userId}` : Prisma.sql`"anonId" = ${anonId}`}
        AND "createdAt" > NOW() - INTERVAL '14 days'
        AND status NOT IN ('RESOLVED', 'CLOSED')
        AND ("studentRating" IS NULL OR "studentRating" = 'NOT_YET'
             OR ("studentRating" = 'NEED_MORE_HELP' AND "answeredAt" > "ratedAt"))
      ORDER BY "createdAt" DESC
      LIMIT 3
    `
    .catch(() => []);

  // Mark answered ones as seen (best-effort) so the SLA cron and admin
  // queue know the student has laid eyes on the answer.
  const unseen = rows.filter((r) => r.answerText && !r.studentRating).map((r) => r.id);
  if (unseen.length) {
    void prisma
      .$executeRaw`UPDATE "TeacherRequest" SET "seenAt" = COALESCE("seenAt", NOW()) WHERE id = ANY(${unseen})`
      .catch(() => {});
  }

  return NextResponse.json({
    requests: rows.map((r) => ({
      id: r.id,
      examCode: r.examCode,
      // The tap-log wrapper is internal phrasing — show the student a
      // clean subject line instead.
      subject: r.message.replace(/^\[(WHATSAPP|CALL) tap\]\s*/i, "").slice(0, 140),
      createdAt: r.createdAt,
      stage: r.answerText && r.studentRating !== "SOLVED" ? "answered" : "awaiting",
      answerText: r.answerText,
      answeredBy: r.answeredBy,
      studentRating: r.studentRating,
    })),
  });
}
