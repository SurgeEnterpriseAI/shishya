// Peer proof — "people preparing for YOUR exam are working today".
//
// The Wall of Grinders motivates on the homepage; this is its
// contextual sibling for the rest of the journey. Generic platform
// counts are weak ("500 students!"); cohort counts are strong ("12 SSC
// CGL aspirants practised today") because the aspirant recognises them
// as competition AND company.
//
// Same rules as the wall: effort only, never names, never scores, and
// it hides itself when the number is too small to inspire (a lonely
// "1 aspirant" is demotivating — silence is better).

import { prisma } from "@/lib/db/prisma";

export interface PeerProof {
  students: number;
  sets: number;
  /** true when the signed-in student is one of the counted students. */
  includesYou: boolean;
}

const MIN_STUDENTS = 3;

function istDayStartUtc(now = new Date()): Date {
  return new Date(
    Math.floor((now.getTime() + 5.5 * 3600_000) / 86_400_000) * 86_400_000 - 5.5 * 3600_000,
  );
}

/** Today's effort by everyone preparing for one exam. Returns null when
 *  the cohort is too thin to be motivating. */
export async function examPeerProof(
  examId: string,
  viewerId?: string | null,
): Promise<PeerProof | null> {
  const day = istDayStartUtc();
  try {
    const rows = await prisma.$queryRaw<{ students: bigint; sets: bigint; you: bigint }[]>`
      SELECT COUNT(DISTINCT a."userId") students,
             COUNT(*) sets,
             COUNT(*) FILTER (WHERE a."userId" = ${viewerId ?? null}) you
      FROM "Attempt" a JOIN "Mock" m ON m.id = a."mockId"
      WHERE m."examId" = ${examId} AND a."finishedAt" >= ${day}
        AND a.status IN ('SUBMITTED','AUTO_SUBMITTED') AND a."userId" IS NOT NULL`;
    const r = rows[0];
    if (!r) return null;
    const students = Number(r.students);
    if (students < MIN_STUDENTS) return null;
    return { students, sets: Number(r.sets), includesYou: Number(r.you) > 0 };
  } catch {
    return null;
  }
}

/** Platform-wide effort today — for emails, where we may not want to
 *  bind the message to a single exam. */
export async function platformProofToday(): Promise<{ students: number; sets: number } | null> {
  const day = istDayStartUtc();
  try {
    const rows = await prisma.$queryRaw<{ students: bigint; sets: bigint }[]>`
      SELECT COUNT(DISTINCT "userId") students, COUNT(*) sets FROM "Attempt"
      WHERE "finishedAt" >= ${day} AND status IN ('SUBMITTED','AUTO_SUBMITTED')
        AND "userId" IS NOT NULL`;
    const r = rows[0];
    if (!r || Number(r.students) < MIN_STUDENTS) return null;
    return { students: Number(r.students), sets: Number(r.sets) };
  } catch {
    return null;
  }
}
