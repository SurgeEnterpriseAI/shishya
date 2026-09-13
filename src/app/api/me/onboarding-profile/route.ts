// POST /api/me/onboarding-profile — saves the 4-question wizard.
//
// Body: { stage: string, state: string, prepCodes: string[], lang?: string }
//
// Validations:
//   - stage must be one of the allowed enum-like strings
//   - state must be a valid Indian state code (or empty string)
//   - prepCodes must be exam codes that exist in the Exam table
//   - lang (12 Sep 2026) must be a Language enum code ("HI"); anything
//     else is ignored and preferredLang is left untouched
//
// Writes to User.onbStage / onbState / onbPrepCodes / onbCompletedAt, and
// User.preferredLang when the wizard's language step was answered.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { STATES } from "@/lib/state-info";
import { recordEvent } from "@/lib/analytics";
import { isLanguageCode } from "@/lib/preferred-lang";

const ALLOWED_STAGES = new Set([
  "CLASS_9_10",
  "CLASS_11_12",
  "UG",
  "PG",
  "WORKING",
  "OTHER",
]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { stage?: unknown; state?: unknown; prepCodes?: unknown; lang?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const stage = typeof body.stage === "string" && ALLOWED_STAGES.has(body.stage) ? body.stage : null;
  const state =
    typeof body.state === "string" && (body.state === "" || body.state in STATES)
      ? body.state || null
      : null;
  // The medium the student confirmed on the language step. Only the ten
  // enum values are storable; skip()/persona confirm send nothing here.
  const langUp = typeof body.lang === "string" ? body.lang.trim().toUpperCase() : "";
  const lang = isLanguageCode(langUp) ? langUp : null;

  if (!stage) {
    return NextResponse.json({ error: "Pick a stage" }, { status: 400 });
  }

  // Validate exam codes — must each exist in the Exam table.
  const requestedCodes = Array.isArray(body.prepCodes)
    ? (body.prepCodes as unknown[]).filter((c): c is string => typeof c === "string").slice(0, 10)
    : [];
  let prepCodes: string[] = [];
  if (requestedCodes.length > 0) {
    const rows = await prisma.$queryRaw<{ code: string }[]>`
      SELECT "code" FROM "Exam" WHERE "code" = ANY(${requestedCodes}::text[]) AND "active" = TRUE
    `;
    prepCodes = rows.map((r) => r.code);
  }

  await prisma.$executeRaw`
    UPDATE "User"
    SET "onbStage" = ${stage},
        "onbState" = ${state},
        "onbPrepCodes" = ${prepCodes}::text[],
        "onbCompletedAt" = NOW(),
        "updatedAt" = NOW()
    WHERE "id" = ${session.user.id}
  `;

  // Language step (12 Sep 2026): a second, separate statement so the
  // profile UPDATE above stays byte-identical. Explicit enum cast — same
  // pattern as /api/me/preferences and /api/facts/[id]/verify.
  if (lang) {
    await prisma.$executeRaw`
      UPDATE "User" SET "preferredLang" = ${lang}::"Language" WHERE "id" = ${session.user.id}
    `;
  }

  // The declared exams must become Enrollments — every outbound loop
  // (Daily-5, live-test invite, exam-eve, winback) keys on Enrollment.
  // Without this, an aspirant who tells us their exam here and then only
  // browses is invisible to every email we send (audit, 18 Aug 2026).
  if (prepCodes.length > 0) {
    const exams = await prisma.exam.findMany({
      where: { code: { in: prepCodes } },
      select: { id: true },
    });
    for (const e of exams) {
      await prisma.enrollment
        .upsert({
          where: { userId_examId: { userId: session.user.id, examId: e.id } },
          update: { active: true },
          create: { userId: session.user.id, examId: e.id },
        })
        .catch(() => {}); // enrollment failure must not break onboarding
    }
  }

  // Track completion as an analytics event so we can see funnel.
  void recordEvent({
    kind: "CTA_CLICKED",
    userId: session.user.id,
    path: "/onboarding",
    props: { kind: "onboarding_completed", stage, state, prepCodes, lang },
  });

  return NextResponse.json({ ok: true });
}
