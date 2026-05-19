// POST /api/me/onboarding-profile — saves the 3-question wizard.
//
// Body: { stage: string, state: string, prepCodes: string[] }
//
// Validations:
//   - stage must be one of the allowed enum-like strings
//   - state must be a valid Indian state code (or empty string)
//   - prepCodes must be exam codes that exist in the Exam table
//
// Writes to User.onbStage / onbState / onbPrepCodes / onbCompletedAt.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { STATES } from "@/lib/state-info";
import { recordEvent } from "@/lib/analytics";

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

  let body: { stage?: unknown; state?: unknown; prepCodes?: unknown };
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

  // Track completion as an analytics event so we can see funnel.
  void recordEvent({
    kind: "CTA_CLICKED",
    userId: session.user.id,
    path: "/onboarding",
    props: { kind: "onboarding_completed", stage, state, prepCodes },
  });

  return NextResponse.json({ ok: true });
}
