// Wall of Grinders — today's effort, anonymised.
//
// Social proof that motivates without exposing anyone: we show WHAT was
// done and for WHICH exam, never who did it and never a score. A new
// visitor sees a hall full of people working right now; no student is
// named, ranked publicly by ability, or made to feel last.
//
// Rules (deliberate, do not relax):
//   • no names, no user ids, no avatars
//   • no scores, percentages or ranks — effort only
//   • today only (IST), so it always reads as "right now"

import { prisma } from "@/lib/db/prisma";

export interface GrinderEntry {
  icon: string;
  /** e.g. "An APPSC Group II aspirant" */
  who: string;
  /** e.g. "35 practice sets today" */
  what: string;
  /** sort weight (not displayed) */
  effort: number;
}

/** "a" vs "an" by SOUND, not spelling. Exam names are mostly acronyms
 *  read letter-by-letter — "an SSC CGL aspirant" (ess), "an HSSC CET"
 *  (aitch), "an MPSC" (em) — so acronyms use the letter-name rule and
 *  ordinary words use the vowel rule. */
function article(name: string): string {
  const first = name.trim().charAt(0).toUpperCase();
  const isAcronym = /^[A-Z]{2}/.test(name.trim());
  const vowelSoundLetters = new Set(["A", "E", "F", "H", "I", "L", "M", "N", "O", "R", "S", "X"]);
  const needsAn = isAcronym ? vowelSoundLetters.has(first) : "AEIOU".includes(first);
  return needsAn ? "An" : "A";
}

function istDayStartUtc(now = new Date()): Date {
  return new Date(
    Math.floor((now.getTime() + 5.5 * 3600_000) / 86_400_000) * 86_400_000 - 5.5 * 3600_000,
  );
}

export async function loadWallOfGrinders(limit = 10): Promise<GrinderEntry[]> {
  const day = istDayStartUtc();

  const [mocks, topics, tutor] = await Promise.all([
    prisma.$queryRaw<{ uid: string; short: string; n: bigint }[]>`
      SELECT a."userId" uid, e."shortName" short, COUNT(*) n
      FROM "Attempt" a JOIN "Mock" m ON m.id = a."mockId" JOIN "Exam" e ON e.id = m."examId"
      WHERE a."finishedAt" >= ${day} AND a.status IN ('SUBMITTED','AUTO_SUBMITTED')
        AND a."userId" IS NOT NULL
      GROUP BY 1, 2`.catch(() => []),
    prisma.$queryRaw<{ uid: string; short: string; n: bigint }[]>`
      SELECT ts."userId" uid, e."shortName" short, COUNT(*) n
      FROM "TopicStudyState" ts
      JOIN "Topic" t ON t.id = ts."topicId"
      JOIN "Subject" s ON s.id = t."subjectId"
      JOIN "Exam" e ON e.id = s."examId"
      WHERE ts."readAt" >= ${day}
      GROUP BY 1, 2`.catch(() => []),
    prisma.$queryRaw<{ uid: string; n: bigint }[]>`
      SELECT cs."userId" uid, COUNT(*) n
      FROM "ChatMessage" cm JOIN "ChatSession" cs ON cs.id = cm."sessionId"
      WHERE cm."createdAt" >= ${day} AND cm.role::text ILIKE 'user' AND cs."userId" IS NOT NULL
      GROUP BY 1`.catch(() => []),
  ]);

  // Merge per (user, exam) — identity is used ONLY to group, never emitted.
  type Row = { exam: string; mocks: number; topics: number; asks: number };
  const byUser = new Map<string, Row>();
  const bump = (uid: string, exam: string, field: keyof Omit<Row, "exam">, n: number) => {
    const cur = byUser.get(uid) ?? { exam, mocks: 0, topics: 0, asks: 0 };
    cur[field] += n;
    if (!cur.exam) cur.exam = exam;
    byUser.set(uid, cur);
  };
  for (const m of mocks) bump(m.uid, m.short, "mocks", Number(m.n));
  for (const t of topics) bump(t.uid, t.short, "topics", Number(t.n));
  for (const c of tutor) {
    const cur = byUser.get(c.uid);
    if (cur) cur.asks += Number(c.n); // only counted for students already studying today
  }

  const entries: GrinderEntry[] = [];
  for (const r of byUser.values()) {
    const effort = r.mocks * 3 + r.topics * 2 + r.asks;
    if (effort <= 0) continue;
    const bits: string[] = [];
    if (r.mocks > 0) bits.push(`${r.mocks} practice set${r.mocks === 1 ? "" : "s"}`);
    if (r.topics > 0) bits.push(`${r.topics} topic${r.topics === 1 ? "" : "s"} studied`);
    if (r.asks > 0) bits.push(`${r.asks} doubt${r.asks === 1 ? "" : "s"} asked`);
    entries.push({
      icon: r.mocks >= 10 ? "🔥" : r.mocks >= 4 ? "⚡" : "📖",
      who: `${article(r.exam)} ${r.exam} aspirant`,
      what: `${bits.join(" · ")} today`,
      effort,
    });
  }
  entries.sort((a, b) => b.effort - a.effort);
  return entries.slice(0, limit);
}
