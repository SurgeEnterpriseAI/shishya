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
//
// School age band (26 Sep 2026, student mode on Class 8-12 school pages):
//   GET  ?school=1            → { signedIn, band, classCodes } for the school
//                               page island (null band = the card is due);
//   POST { school: { band, examCode } } → the one-time self-declared band
//                               (13-17 student / 18+ student / parent /
//                               teacher) on the class container the student
//                               signed in on. Stored in the EXISTING fields
//                               — onbStage = the band in the wizard's
//                               vocabulary, onbPrepCodes += the container
//                               code (the marker) — and the account is
//                               enrolled on the container through the one
//                               door with the school flag. See
//                               src/lib/school/student-classes.ts for the
//                               encoding and src/lib/school/student-db.ts
//                               for the write. No new column, no migration.
//   The wizard's own POST keeps any school container code already in
//   onbPrepCodes (its exam validation would otherwise drop the marker).

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { NOT_SCHOOL_WHERE, notSchoolSql } from "@/lib/db/exam-scope";
import { ensureEnrollment } from "@/lib/db/enrollment";
import { STATES } from "@/lib/state-info";
import { recordEvent } from "@/lib/analytics";
import { isLanguageCode } from "@/lib/preferred-lang";
import { isSchoolBand, studentModeCodesOf } from "@/lib/school/student-classes";
import { declareSchoolBand, readSchoolProfile } from "@/lib/school/student-db";

const ALLOWED_STAGES = new Set([
  "CLASS_9_10",
  "CLASS_11_12",
  "UG",
  "PG",
  "WORKING",
  "OTHER",
]);

/** GET ?school=1 — the school band of the signed-in account, for the
 *  Class 8-12 page island. A guest gets { signedIn: false } (200, no
 *  redirect: the island decides what to show). Never cached. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("school") !== "1") return NextResponse.json({ error: "not found" }, { status: 404 });
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ signedIn: false, band: null, classCodes: [] }, { headers: { "cache-control": "no-store" } });
  const profile = await readSchoolProfile(session.user.id).catch(() => null);
  return NextResponse.json(
    { signedIn: true, band: profile?.band ?? null, classCodes: profile?.classCodes ?? [] },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { stage?: unknown; state?: unknown; prepCodes?: unknown; lang?: unknown; school?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 26 Sep 2026: the school age-band card. Its own branch — the wizard's
  // stage / state / prepCodes are not read, and nothing below runs.
  if (body.school !== undefined) {
    const s = body.school as { band?: unknown; examCode?: unknown } | null;
    const band = s && isSchoolBand(s.band) ? s.band : null;
    const examCode = s && typeof s.examCode === "string" ? s.examCode.trim().toUpperCase() : "";
    if (!band || !examCode) return NextResponse.json({ error: "Pick who you are" }, { status: 400 });
    const r = await declareSchoolBand(session.user.id, band, examCode);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    // The band and the class — never a name, school or any other detail.
    void recordEvent({
      kind: "CTA_CLICKED",
      userId: session.user.id,
      path: "/schooling",
      props: { kind: "school_band_declared", band, examCode },
    });
    return NextResponse.json({ ok: true, signedIn: true, band: r.profile.band, classCodes: r.profile.classCodes });
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
  // 25 Sep 2026: and be a real exam — onboarding enrolments feed every
  // exam mail loop, which a school class container must never join.
  const requestedCodes = Array.isArray(body.prepCodes)
    ? (body.prepCodes as unknown[]).filter((c): c is string => typeof c === "string").slice(0, 10)
    : [];
  let prepCodes: string[] = [];
  if (requestedCodes.length > 0) {
    const rows = await prisma.$queryRaw<{ code: string }[]>`
      SELECT "code" FROM "Exam" WHERE "code" = ANY(${requestedCodes}::text[]) AND "active" = TRUE AND ${notSchoolSql("")}
    `;
    prepCodes = rows.map((r) => r.code);
  }
  // 26 Sep 2026: a school account's confirmed class container(s) stay in
  // onbPrepCodes (they are the age-band marker; the validation above only
  // ever lists real exams). Read from the row, never from the request.
  const keptSchool = await prisma.$queryRaw<{ onbPrepCodes: string[] | null }[]>`
    SELECT "onbPrepCodes" FROM "User" WHERE "id" = ${session.user.id} LIMIT 1
  `
    .then((rows) => studentModeCodesOf(rows[0]?.onbPrepCodes))
    .catch(() => [] as string[]);
  const storedCodes = [...new Set([...prepCodes, ...keptSchool])];

  await prisma.$executeRaw`
    UPDATE "User"
    SET "onbStage" = ${stage},
        "onbState" = ${state},
        "onbPrepCodes" = ${storedCodes}::text[],
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
      where: { ...NOT_SCHOOL_WHERE, code: { in: prepCodes } },
      select: { id: true, category: true },
    });
    // 26 Sep 2026: through the one enrolment door (src/lib/db/enrollment.ts).
    for (const e of exams) {
      await ensureEnrollment(session.user.id, e, { active: true }).catch(() => {}); // enrollment failure must not break onboarding
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
