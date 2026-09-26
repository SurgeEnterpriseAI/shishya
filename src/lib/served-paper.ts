// The paper a mock SERVES (26 Sep 2026).
//
// Mock.questionIds is an ordered id list, and until today the player, the
// guest gate, the short-or-full choice and submit all read it as-is: a
// question was served and graded whether or not it was still validated.
// The bank answer check (scripts/verify-question-bank.ts) is writing its
// verdicts today: questions with a wrong or ambiguous key lose validated
// (2,876 so far) and sit in ~9,000 slots of the site's own mocks and of
// students' personal mocks. A student starting one of those mocks got a
// question the site knows is broken, scored against a key it knows is wrong.
//
// One rule, used at every place a paper is served or graded:
//   servedPaperIds(mock, questionsById) — the mock's ids, in order, kept
//   only when the question exists, is validated and is not tagged
//   "rejected" (withdrawn by an admin or a data fix; the answer check
//   itself leaves validated:false and no tag, src/lib/question-withdrawn.ts).
//
// What the student sees is what they get:
//   • the pre-start card (guest gate, short-or-full choice) and the player
//     show the served count, and one plain line says how many were
//     withdrawn (servedPaperCopy); a title that states the count
//     ("… (119 of 200 questions)") is shown with the served count
//     (honestMockTitle);
//   • a paper with fewer than MIN_SERVED_QUESTIONS is not started — the
//     page shows "This mock is being rebuilt" instead;
//   • the paper is PERSISTED on the attempt when it starts, as a skeleton
//     answers list (paperSkeleton: one row per served question with its
//     slot), so a resume serves exactly the paper the attempt began with,
//     whatever was withdrawn since, and submit grades that same list
//     (persistedPaperIds; src/lib/attempt-paper.ts reads it). Attempt has
//     no free column and prisma migrate is not allowed; the skeleton rides
//     in Attempt.answers, and /api/attempts/[id]/answer merges saves into
//     the existing rows (keeping their slot and order) instead of dropping
//     and appending. An attempt started before this shipped (672
//     IN_PROGRESS on 26 Sep) has no skeleton: the page adopts today's served
//     list on its next resume (adoptPaper) and submit grades the served
//     list, never a withdrawn question.
//
// Two things a resumed attempt and a ranked live test need (26 Sep 2026,
// review fixes):
//   • an attempt already IN_PROGRESS on a mock that now serves under
//     MIN_SERVED_QUESTIONS is never stranded behind "being rebuilt": the
//     notice carries the same two exits the expired gate has — submit the
//     answers saved on questions that passed the check (answeredInPaper;
//     /submit grades that same list) or discard it (93 such attempts on the
//     day, 88 with saved answers, none with a persisted paper);
//   • a live test's rank note says papers differed in length only when the
//     ranked papers really do (liveTestPapersDiffer over their scoreMax) —
//     a question withdrawn before anyone started shortens every paper the
//     same and needs no note.
//
// Pure — no DB. Tests: tests/unit/served-paper.test.ts

import { WITHDRAWN_TAG } from "@/lib/question-withdrawn";
import { pickCopy, type CopyLocale } from "@/lib/ui-locale-copy";

/** What servedPaperIds needs to know about a question. */
export interface ServableQuestion {
  validated: boolean;
  tags?: readonly string[] | null;
}

/** A paper shorter than this is not started (the page shows "being rebuilt"). */
export const MIN_SERVED_QUESTIONS = 5;

/** True when this question may be put in front of a student. */
export function isServable(q: ServableQuestion | null | undefined): boolean {
  return !!q && q.validated === true && !(q.tags ?? []).includes(WITHDRAWN_TAG);
}

/**
 * The ids a mock serves, in the mock's order: questions that exist, are
 * validated and are not tagged "rejected". A duplicate id is served once.
 */
export function servedPaperIds(
  mock: { questionIds: readonly string[] },
  questionsById: { get(id: string): ServableQuestion | undefined },
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of mock.questionIds) {
    if (typeof id !== "string" || seen.has(id)) continue;
    if (!isServable(questionsById.get(id))) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** True when a paper this long may be started. */
export function canServePaper(paperIds: readonly string[]): boolean {
  return paperIds.length >= MIN_SERVED_QUESTIONS;
}

/** How many of the mock's slots are not served ("K questions were withdrawn"). */
export function withdrawnCount(mock: { questionIds: readonly string[] }, paperIds: readonly string[]): number {
  const served = new Set(paperIds);
  let k = 0;
  for (const id of new Set(mock.questionIds)) if (!served.has(id)) k += 1;
  return k;
}

// ── The paper persisted on an attempt ────────────────────────────────────

/** The key each skeleton row carries: its 0-based position in the paper. */
export const PAPER_SLOT_KEY = "slot";

export interface PaperAnswerRow {
  questionId: string;
  chosen: string | null;
  timeSec: number;
  marked: boolean;
  updatedAt?: number;
  /** 0-based position in the paper this attempt was served. */
  slot: number;
}

/** One empty row per served question, in paper order, each with its slot. */
export function paperSkeleton(paperIds: readonly string[]): PaperAnswerRow[] {
  return paperIds.map((questionId, slot) => ({ questionId, chosen: null, timeSec: 0, marked: false, slot }));
}

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function slotOf(row: unknown): number | null {
  if (!isObj(row) || typeof row.questionId !== "string" || row.questionId === "") return null;
  const s = row[PAPER_SLOT_KEY];
  return typeof s === "number" && Number.isInteger(s) && s >= 0 ? s : null;
}

/**
 * The paper persisted on an attempt: the ids of its rows that carry a slot,
 * in slot order (the array itself may be in any order — a legacy save
 * appended rows). A row without a slot is not in the paper. Returns null
 * when no row carries one — an attempt started before 26 Sep 2026.
 */
export function persistedPaperIds(answers: unknown): string[] | null {
  if (!Array.isArray(answers)) return null;
  const rows: { id: string; slot: number }[] = [];
  for (const r of answers) {
    const slot = slotOf(r);
    if (slot == null) continue;
    rows.push({ id: (r as { questionId: string }).questionId, slot });
  }
  if (rows.length === 0) return null;
  rows.sort((a, b) => a.slot - b.slot);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r.id);
  }
  return out;
}

/**
 * Give an attempt started without a persisted paper (before 26 Sep 2026)
 * today's served list: a skeleton over `paperIds` that keeps what the
 * student already saved (chosen, time, mark, stamp) for each of those
 * questions. Saved rows for questions outside the paper are dropped — they
 * are withdrawn questions, which submit would not grade.
 */
export function adoptPaper(existingAnswers: unknown, paperIds: readonly string[]): PaperAnswerRow[] {
  const byId = new Map<string, Record<string, unknown>>();
  if (Array.isArray(existingAnswers)) {
    for (const r of existingAnswers) {
      if (isObj(r) && typeof r.questionId === "string") byId.set(r.questionId, r);
    }
  }
  return paperIds.map((questionId, slot) => {
    const prev = byId.get(questionId);
    const chosen = typeof prev?.chosen === "string" && prev.chosen.trim() !== "" ? prev.chosen : null;
    const timeSec = typeof prev?.timeSec === "number" && Number.isFinite(prev.timeSec) && prev.timeSec > 0 ? prev.timeSec : 0;
    const row: PaperAnswerRow = { questionId, chosen, timeSec, marked: prev?.marked === true, slot };
    if (typeof prev?.updatedAt === "number" && Number.isFinite(prev.updatedAt)) row.updatedAt = prev.updatedAt;
    return row;
  });
}

/**
 * How many of the attempt's saved answers are on questions of THIS paper
 * (a chosen option, not blank), each question counted once — the
 * "answered of total" the expired gate and the rebuilt notice show. An
 * answer saved on a question withdrawn since (outside the paper) is not
 * counted: submit will not grade it.
 */
export function answeredInPaper(answers: unknown, paperIds: readonly string[]): number {
  if (!Array.isArray(answers)) return 0;
  const inPaper = new Set(paperIds);
  const counted = new Set<string>();
  for (const r of answers) {
    if (!isObj(r) || typeof r.questionId !== "string" || !inPaper.has(r.questionId)) continue;
    if (typeof r.chosen !== "string" || r.chosen.trim() === "") continue;
    counted.add(r.questionId);
  }
  return counted.size;
}

// ── Honest title ─────────────────────────────────────────────────────────

/**
 * A title that states the mock's size ("… (119 of 200 questions)", "100
 * questions") shown with the SERVED size when some are withdrawn. Only the
 * number equal to the mock's own slot count is rewritten, and only where
 * it is followed by "of …", "questions" or "Q"; any other title is returned
 * as it is.
 */
export function honestMockTitle(title: string, mockCount: number, servedCount: number): string {
  if (!(mockCount > 0) || servedCount >= mockCount || servedCount < 0) return title;
  const re = new RegExp(`(^|[^0-9])${mockCount}(?=\\s+(?:of\\s+\\d+\\s+questions|questions|Qs?)\\b)`, "gi");
  return title.replace(re, (_m, pre: string) => `${pre}${servedCount}`);
}

// ── Live tests ───────────────────────────────────────────────────────────

/**
 * True when the ranked papers of a live test differ in length: the ranked
 * attempts (each student's first in-window attempt, src/lib/live-test.ts
 * liveTestRank) carry more than one distinct scoreMax. scoreMax is the
 * graded paper's length × the exam's marks per question, so on one mock it
 * varies only with the paper's length. That happens when the answer check
 * withdrew questions while the test was open, so a later starter got a
 * shorter paper; the rank compares scorePct, which stays comparable, and
 * the results page says so. A test whose ranked papers are all the same
 * length — nothing withdrawn, or withdrawn before anyone started — shows
 * nothing: "not everyone had the same number of questions" would be false
 * for that cohort. (Replaces a check of this one attempt's paper against
 * the mock's list, which said so for everyone when a question was withdrawn
 * before the window opened.)
 */
export function liveTestPapersDiffer(rankedScoreMax: readonly (number | null | undefined)[]): boolean {
  const seen = new Set<number>();
  for (const v of rankedScoreMax) if (typeof v === "number" && Number.isFinite(v)) seen.add(v);
  return seen.size > 1;
}

// ── Words (en, hi, te — English for any other locale) ────────────────────

export interface ServedPaperCopy {
  /** "1 question was withdrawn after an answer check and is not served." */
  withdrawnOne: string;
  /** "{k} questions were withdrawn after an answer check and are not served." */
  withdrawnMany: string;
  rebuildTitle: string;
  /** "{exam}" */
  rebuildBody: string;
  /** "{exam}" — the way back to the hub. */
  rebuildBack: string;
  /** On the notice when an attempt is IN_PROGRESS with {answered} answers on cleared questions. */
  rebuildAttemptAnswered: string;
  /** On the notice when an attempt is IN_PROGRESS with nothing left to grade. */
  rebuildAttemptEmpty: string;
  /** "Submit my {answered} answers & see the result" */
  rebuildSubmit: string;
  /** "Discard this attempt" */
  rebuildDiscard: string;
  /** While a submit or discard is in flight. */
  rebuildBusy: string;
  /** Under a live-test rank when the ranked papers differ in length (liveTestPapersDiffer). */
  livePapersDiffer: string;
}

const COPY: Readonly<Record<CopyLocale, ServedPaperCopy>> = {
  en: {
    withdrawnOne: "1 question was withdrawn after an answer check and is not served.",
    withdrawnMany: "{k} questions were withdrawn after an answer check and are not served.",
    rebuildTitle: "This mock is being rebuilt",
    rebuildBody:
      "Its questions are going through an answer check, and too few are cleared to serve right now. Please try another {exam} mock for now.",
    rebuildBack: "{exam} mocks →",
    rebuildAttemptAnswered:
      "You have an unfinished attempt on this mock with {answered} answers saved on questions that passed the check. Submit them for a result, or discard the attempt.",
    rebuildAttemptEmpty:
      "You have an unfinished attempt on this mock with nothing left to grade. Discard it to clear it from your dashboard.",
    rebuildSubmit: "Submit my {answered} answers & see the result",
    rebuildDiscard: "Discard this attempt",
    rebuildBusy: "Please wait…",
    livePapersDiffer:
      "Not everyone in this test had the same number of questions — some were withdrawn after an answer check. Ranks compare percentage scores.",
  },
  hi: {
    withdrawnOne: "उत्तर-जाँच के बाद 1 प्रश्न वापस ले लिया गया है और इस मॉक में नहीं दिया जा रहा।",
    withdrawnMany: "उत्तर-जाँच के बाद {k} प्रश्न वापस ले लिए गए हैं और इस मॉक में नहीं दिए जा रहे।",
    rebuildTitle: "यह मॉक फिर से बनाया जा रहा है",
    rebuildBody:
      "इसके प्रश्नों की उत्तर-जाँच चल रही है और अभी इतने कम प्रश्न पास हुए हैं कि मॉक नहीं दिया जा सकता। फ़िलहाल {exam} का कोई और मॉक आज़माएँ।",
    rebuildBack: "{exam} के मॉक →",
    rebuildAttemptAnswered:
      "इस मॉक पर आपका एक अधूरा प्रयास है, जिसमें जाँच में पास हुए प्रश्नों पर {answered} उत्तर सहेजे हैं। उन्हें जमा करके परिणाम देखें, या प्रयास हटा दें।",
    rebuildAttemptEmpty:
      "इस मॉक पर आपका एक अधूरा प्रयास है, जिसमें जाँचने के लिए कुछ नहीं बचा। इसे डैशबोर्ड से हटाने के लिए प्रयास हटा दें।",
    rebuildSubmit: "मेरे {answered} उत्तर जमा करें और परिणाम देखें",
    rebuildDiscard: "यह प्रयास हटाएँ",
    rebuildBusy: "कृपया प्रतीक्षा करें…",
    livePapersDiffer:
      "इस टेस्ट में सबके पास प्रश्नों की संख्या एक जैसी नहीं थी — उत्तर-जाँच के बाद कुछ प्रश्न वापस ले लिए गए। रैंक प्रतिशत स्कोर की तुलना से बनती है।",
  },
  te: {
    withdrawnOne: "జవాబు తనిఖీ తర్వాత 1 ప్రశ్న ఉపసంహరించబడింది, ఈ మాక్‌లో ఇవ్వడం లేదు.",
    withdrawnMany: "జవాబు తనిఖీ తర్వాత {k} ప్రశ్నలు ఉపసంహరించబడ్డాయి, ఈ మాక్‌లో ఇవ్వడం లేదు.",
    rebuildTitle: "ఈ మాక్ మళ్ళీ తయారవుతోంది",
    rebuildBody:
      "దీని ప్రశ్నలు జవాబు తనిఖీలో ఉన్నాయి, ఇప్పుడు ఇవ్వడానికి సరిపడా ప్రశ్నలు క్లియర్ కాలేదు. ప్రస్తుతానికి మరో {exam} మాక్ ప్రయత్నించండి.",
    rebuildBack: "{exam} మాక్‌లు →",
    rebuildAttemptAnswered:
      "ఈ మాక్‌పై మీకు ఒక అసంపూర్ణ ప్రయత్నం ఉంది; తనిఖీలో పాస్ అయిన ప్రశ్నలపై {answered} జవాబులు సేవ్ అయ్యాయి. వాటిని సమర్పించి ఫలితం చూడండి, లేదా ప్రయత్నాన్ని తొలగించండి.",
    rebuildAttemptEmpty:
      "ఈ మాక్‌పై మీకు ఒక అసంపూర్ణ ప్రయత్నం ఉంది; గ్రేడ్ చేయడానికి ఏమీ మిగలలేదు. డాష్‌బోర్డ్ నుండి తీసేయడానికి దీన్ని తొలగించండి.",
    rebuildSubmit: "నా {answered} జవాబులు సమర్పించి ఫలితం చూడండి",
    rebuildDiscard: "ఈ ప్రయత్నాన్ని తొలగించండి",
    rebuildBusy: "దయచేసి వేచి ఉండండి…",
    livePapersDiffer:
      "ఈ టెస్ట్‌లో అందరికీ ఒకే సంఖ్యలో ప్రశ్నలు రాలేదు — జవాబు తనిఖీ తర్వాత కొన్ని ప్రశ్నలు ఉపసంహరించబడ్డాయి. ర్యాంకులు శాతం స్కోర్లను పోలుస్తాయి.",
  },
};

export function servedPaperCopy(locale: string | null | undefined): ServedPaperCopy {
  return pickCopy(COPY, locale);
}

/** The one honest line for K withdrawn questions, or null when none are. */
export function withdrawnLine(copy: ServedPaperCopy, k: number): string | null {
  if (!(k > 0)) return null;
  return k === 1 ? copy.withdrawnOne : copy.withdrawnMany.replace("{k}", String(k));
}

/** For tests: every locale's map. */
export const SERVED_PAPER_COPY = COPY;
