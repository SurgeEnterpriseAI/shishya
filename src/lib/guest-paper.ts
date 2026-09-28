// A whole mock paper for a guest, with no sign-in (27 Sep 2026).
//
// Founder direction (content first): a visitor gets the content they came
// for immediately — a whole mock or a whole previous-year-pattern set, not a
// 5-question taste and then a sign-in card. Sign-in is offered AFTER the
// result, only to keep future results.
//
// How it works (src/app/mocks/[id]/GuestPaperPlayer.tsx):
//   • the page sends the guest the SAME question fields the signed-in player
//     gets (body, options, topic, type, difficulty) — never answerKey or
//     solution;
//   • progress lives only in this browser (localStorage, this module's
//     store key), so a reload resumes; nothing about a guest is written on
//     the server;
//   • submit posts the answers to POST /api/guest-paper/grade, which grades
//     the served paper with the same pure grader as a signed-in submit
//     (src/lib/attempts-submit.ts gradeSubmission) and only then returns the
//     keys and solutions. No Attempt or Mock row is created.
// Live tests keep their sign-in (a rank needs an account); a user's own
// generated mock stays theirs.
//
// Pure and import-free: used by the client player and the grade route.
//
// 28 Sep 2026 (founder: "the sign-up has to be there, the way it was"): the
// guest whole paper is CLOSED. In its two days open, 5 guest papers were
// graded while sign-ups that began on a mock or past-year page went from
// about 3.5 a day to 0 and all sign-ups from about 25 a day to 10. A whole
// mock or past-year set needs the free sign-in again (the sign-in card on
// /mocks/{id}); the 5-question guest quiz, the 10-question past-year
// practice, notes, cutoffs and the tutor stay open with no sign-in. The
// player and the grade route stay in the code behind this one switch.
export const GUEST_WHOLE_PAPER_OPEN: boolean = false;

export interface GuestAnswer {
  questionId: string;
  chosen: string | null;
  timeSec: number;
  marked: boolean;
}

export interface GuestPaperState {
  v: 1;
  /** epoch ms when this device started the paper */
  startedAt: number;
  idx: number;
  answers: GuestAnswer[];
}

export const GUEST_PAPER_STORE_PREFIX = "shishya_guest_paper:";
/** A stored paper older than this starts fresh (a paper is never longer than a day). */
export const GUEST_PAPER_MAX_AGE_MS = 24 * 3600 * 1000;

export function guestPaperStoreKey(mockId: string): string {
  return GUEST_PAPER_STORE_PREFIX + mockId;
}

/** The stored state for this paper, keeping only answers to served questions; null when absent, stale or malformed. */
export function readGuestPaperState(raw: string | null | undefined, paperIds: readonly string[], nowMs: number): GuestPaperState | null {
  if (!raw) return null;
  let o: unknown;
  try {
    o = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!o || typeof o !== "object") return null;
  const s = o as Partial<GuestPaperState>;
  if (s.v !== 1 || typeof s.startedAt !== "number" || !Number.isFinite(s.startedAt)) return null;
  if (s.startedAt > nowMs + 60_000 || nowMs - s.startedAt > GUEST_PAPER_MAX_AGE_MS) return null;
  const inPaper = new Set(paperIds);
  const answers: GuestAnswer[] = [];
  for (const a of Array.isArray(s.answers) ? s.answers : []) {
    if (!a || typeof a.questionId !== "string" || !inPaper.has(a.questionId)) continue;
    answers.push({
      questionId: a.questionId,
      chosen: typeof a.chosen === "string" && a.chosen.trim() ? a.chosen.trim().slice(0, 40) : null,
      timeSec: Number.isFinite(a.timeSec) && a.timeSec > 0 ? Math.min(a.timeSec, 86_400) : 0,
      marked: a.marked === true,
    });
  }
  const idx = Number.isInteger(s.idx) && (s.idx as number) >= 0 && (s.idx as number) < paperIds.length ? (s.idx as number) : 0;
  return { v: 1, startedAt: s.startedAt, idx, answers };
}

/** Seconds left on the paper's clock (never negative). */
export function remainingSec(startedAtMs: number, durationMin: number, nowMs: number): number {
  const total = Math.max(1, durationMin) * 60;
  return Math.max(0, Math.round(total - (nowMs - startedAtMs) / 1000));
}

// ── The grade response (POST /api/guest-paper/grade) ─────────────────────

export interface GuestGradedQuestion {
  id: string;
  body: string;
  options: { key: string; text: string }[];
  answerKey: string;
  solution: string;
  topic: { code: string; name: string };
  chosen: string | null;
  correct: boolean;
}

export interface GuestGradeResult {
  scoreRaw: number;
  scoreMax: number;
  scorePct: number;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  negativeMark: number;
  /** weakest first */
  topics: { code: string; name: string; correct: number; total: number }[];
  questions: GuestGradedQuestion[];
}

/** Topics weakest first: lowest share correct, then more questions first, then name. */
export function weakestFirst<T extends { name: string; correct: number; total: number }>(topics: T[]): T[] {
  return [...topics].sort((a, b) => {
    const ra = a.total > 0 ? a.correct / a.total : 1;
    const rb = b.total > 0 ? b.correct / b.total : 1;
    if (ra !== rb) return ra - rb;
    if (a.total !== b.total) return b.total - a.total;
    return a.name.localeCompare(b.name);
  });
}

/** A mock a guest may take whole: a shared site mock (no owner) that is not a live test. */
export function isGuestPaperMock(m: { userId: string | null; generatedBy: string | null }): boolean {
  return m.userId == null && m.generatedBy !== "live-test";
}
