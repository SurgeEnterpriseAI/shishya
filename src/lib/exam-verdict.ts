// Exam-day verdict poll — shared reads/writes over ExamVerdict (6 Sep 2026,
// Exam Week Mode).
//
// One row per identity per (exam, exam day): "How was the paper?" Easy /
// Moderate / Tough plus an optional hardest-section label. Anonymous
// students vote with the shishya_anon cookie as identityKey; signed-in
// students with their userId. Re-voting upserts (changing your mind is
// allowed); the tally is counts only — the UI shows it from n >= 10 and
// never calls it a prediction.
//
// Consumers: POST/GET /api/exam-verdict, ExamWeekBlock (hub + tracker),
// the cutoff page's exam-week mode and the day-after mail. Every one of
// them reads the tally through getVerdictTally so the numbers agree.

import { prisma } from "@/lib/db/prisma";

export const VERDICTS = ["EASY", "MODERATE", "TOUGH"] as const;
export type Verdict = (typeof VERDICTS)[number];

/** Tally shown from n >= 10 — below that the UI prints ew.verdict.few. */
export const VERDICT_MIN_N = 10;

export const SECTION_MAX_LEN = 40;

export interface VerdictTally {
  n: number;
  easy: number;
  moderate: number;
  tough: number;
  /** Hardest-section votes, most-voted first (max 6). */
  sections: { label: string; n: number }[];
}

export function isVerdict(x: unknown): x is Verdict {
  return typeof x === "string" && (VERDICTS as readonly string[]).includes(x);
}

export const ISO_DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "YYYY-MM-DD" → the value stored in ExamVerdict.examDate (@db.Date).
 *  Midnight UTC of that calendar day — the repo-wide convention for
 *  date-only rows (ExamImportantDate stores the IST day the same way),
 *  so the date column never shifts with the session time zone. Returns
 *  null for a malformed or impossible day. */
export function examDateFromIso(iso: string): Date | null {
  if (!ISO_DAY_RE.test(iso)) return null;
  const d = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) return null;
  return d;
}

const EMPTY: VerdictTally = { n: 0, easy: 0, moderate: 0, tough: 0, sections: [] };

/** Counts for one (exam, exam day). Never throws — a DB hiccup returns
 *  the empty tally so the page/poll still renders. */
export async function getVerdictTally(examId: string, examDateIso: string): Promise<VerdictTally> {
  const examDate = examDateFromIso(examDateIso);
  if (!examDate) return EMPTY;
  try {
    const [byVerdict, bySection] = await Promise.all([
      prisma.examVerdict.groupBy({
        by: ["verdict"],
        where: { examId, examDate },
        _count: { _all: true },
      }),
      prisma.examVerdict.groupBy({
        by: ["section"],
        where: { examId, examDate, section: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { section: "desc" } },
        take: 6,
      }),
    ]);
    const count = (v: Verdict) => byVerdict.find((r) => r.verdict === v)?._count._all ?? 0;
    const easy = count("EASY");
    const moderate = count("MODERATE");
    const tough = count("TOUGH");
    return {
      n: easy + moderate + tough,
      easy,
      moderate,
      tough,
      sections: bySection
        .filter((r): r is typeof r & { section: string } => typeof r.section === "string" && r.section.length > 0)
        .map((r) => ({ label: r.section, n: r._count._all })),
    };
  } catch (err) {
    console.error("[exam-verdict] tally failed (non-fatal):", err);
    return EMPTY;
  }
}

/** Record (or change) one identity's verdict for an exam day. */
export async function upsertVerdict(input: {
  examId: string;
  examDateIso: string;
  identityKey: string;
  verdict: Verdict;
  /** undefined = leave the stored section untouched; null = clear it. */
  section?: string | null;
}): Promise<boolean> {
  const examDate = examDateFromIso(input.examDateIso);
  if (!examDate) return false;
  const section =
    input.section === undefined ? undefined : input.section ? input.section.trim().slice(0, SECTION_MAX_LEN) || null : null;
  await prisma.examVerdict.upsert({
    where: { examId_examDate_identityKey: { examId: input.examId, examDate, identityKey: input.identityKey } },
    create: { examId: input.examId, examDate, identityKey: input.identityKey, verdict: input.verdict, section: section ?? null },
    update: { verdict: input.verdict, ...(section !== undefined ? { section } : {}) },
  });
  return true;
}

/** What leaves the server below the floor (wave 2, 6 Sep 2026): only n
 *  is public while n < VERDICT_MIN_N — the split (and the hardest-section
 *  votes) would otherwise be readable from the API / RSC payload and
 *  quoted as a "prediction" from three votes. */
export function publicTally(t: VerdictTally): VerdictTally {
  return t.n >= VERDICT_MIN_N ? t : { n: t.n, easy: 0, moderate: 0, tough: 0, sections: [] };
}

/** Percentages (rounded, summing to ~100) for a tally — the shape
 *  ew.verdict.tally interpolates. */
export function tallyPercents(t: VerdictTally): { easy: number; moderate: number; tough: number } {
  if (t.n === 0) return { easy: 0, moderate: 0, tough: 0 };
  return {
    easy: Math.round((t.easy / t.n) * 100),
    moderate: Math.round((t.moderate / t.n) * 100),
    tough: Math.round((t.tough / t.n) * 100),
  };
}
