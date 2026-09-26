// POST /api/enrollment/shift { examCode, shiftDate: "YYYY-MM-DD" }
//   → 200 { ok: true, shiftDate }
//
// Exam Week Mode wave 2 (6 Sep 2026): a signed-in, enrolled student inside
// a multi-day CBT window records their OWN shift day. The hub / tracker
// block, the verdict poll and the exam-eve / day-after mails key off it
// instead of the window's first day. Rules:
//   • auth required (no anonymous shift days — nothing to attach them to)
//   • the day must be one of the exam's TYPED (kind = 'EXAM') announced
//     exam days — an "expected" estimate is never a shift a student can
//     book, and a free-text date would let the block claim a paper that
//     never happened
//   • upserts Enrollment.shiftDate; re-picking overwrites
//   • rate-limited on the shared "verdict" bucket (12 taps / hour)

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { realExamKey } from "@/lib/db/exam-scope";
import { ensureEnrollment } from "@/lib/db/enrollment";
import { auth } from "@/lib/auth";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";
import { buildTimeline } from "@/lib/exam-timeline";
import { istDay } from "@/lib/exam-week";
import { examDateFromIso } from "@/lib/exam-verdict";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXAM_CODE_RE = /^[A-Z0-9_]{2,40}$/;

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;
  if (!userId) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  let body: { examCode?: unknown; shiftDate?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const examCode = typeof body.examCode === "string" ? body.examCode : "";
  const shiftDate = typeof body.shiftDate === "string" ? body.shiftDate : "";
  const shiftAt = examDateFromIso(shiftDate);
  if (!EXAM_CODE_RE.test(examCode) || !shiftAt) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const rl = await checkRateLimit("verdict", `shift:${userId}`);
  if (!rl.ok) return rateLimited(rl);

  const exam = await prisma.exam
    .findUnique({ where: realExamKey({ code: examCode }), select: { id: true, active: true, category: true } })
    .catch(() => null);
  if (!exam || !exam.active) return NextResponse.json({ error: "unknown exam" }, { status: 404 });

  // Typed exam-day rows only, tiered exactly like the tracker (the exam's
  // own portal widens the official tier).
  const [rows, elig] = await Promise.all([
    prisma.examImportantDate
      .findMany({
        where: { examId: exam.id, archivedAt: null, kind: "EXAM" },
        select: { id: true, label: true, date: true, isExamDay: true, kind: true, confidence: true, url: true, source: true, notes: true },
      })
      .catch(() => []),
    prisma
      .$queryRaw<{ officialUrl: string | null }[]>`
        SELECT "officialUrl" FROM "ExamEligibility" WHERE "examId" = ${exam.id} LIMIT 1`
      .catch(() => [] as { officialUrl: string | null }[]),
  ]);
  const timeline = buildTimeline(rows, new Date(), elig[0]?.officialUrl ?? null);
  const valid = timeline.some((r) => r.kind === "EXAM" && r.tier !== "expected" && istDay(r.date) === shiftDate);
  if (!valid) return NextResponse.json({ error: "not an announced exam day" }, { status: 400 });

  try {
    await ensureEnrollment(userId, exam, { shiftDate: shiftAt });
  } catch (err) {
    console.error("[enrollment-shift] upsert failed:", err);
    return NextResponse.json({ error: "could not save" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, shiftDate });
}
