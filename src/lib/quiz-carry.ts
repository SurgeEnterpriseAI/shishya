// The guest quiz result, carried into the account's weak topics at sign-in
// (30 Sep 2026) — the pure rules.
//
// Why: the guest quiz's sign-in button promised to "track your weak topics",
// but the result only lived in this browser (localStorage "shishya_anon_quiz",
// src/components/AnonQuizPlayer.tsx) and was shown back once on the hub — the
// account never learned it. Now the stash also keeps the question ids and the
// options the guest chose, and on the first signed-in page that mounts
// src/components/AnonQuizRecall.tsx (the hub, the dashboard, the mock page)
// the browser sends them ONCE to POST /api/quiz/import, which:
//   • needs a sign-in (nothing is stored for a guest);
//   • re-grades every answer against the stored answer key of the exam's own
//     checked MCQs — the client's score is never trusted; an id from another
//     exam, an unchecked or a withdrawn question is ignored, and a stash with
//     nothing left to grade stores nothing and is never called "saved";
//   • adds the result to WeaknessMap (the rows the exam tutor reads —
//     src/lib/db/student-state.ts, src/lib/ai/tools.ts get_my_mastery — and
//     the hub's weakness map): per topic, attempts and correct counts go up,
//     and masteryScore — the last set's accuracy, as the submit route keeps
//     it — becomes the quiz's own only when the quiz is the newer set
//     (mergeMastery);
//   • records the import in "QuizCarry" (source 'guest-quiz', one row per
//     account and stash — a second send of the same stash writes nothing).
// It is never an Attempt, a mock or a ProgressEvent, so no public counter
// ("mock exams taken", questions answered, learners) and no streak moves.
// Never on school pages: school chapter practice has its own player that
// stores nothing (src/components/school/SchoolChapterQuiz.tsx), and the
// import refuses any exam that is not a real one.
// Honest copy: "the {exam} tutor now sees these weak topics" — true once the
// rows exist. Daily 5 is NOT promised: it ranks topics with 3+ answers only
// (src/lib/study-day-five.ts), which a 5-question quiz rarely gives one topic.
//
// Pure — imported by the recall island, the import route and tests.
// DB: src/lib/db/quiz-carry.ts. Tests: tests/unit/quiz-carry.test.ts

import { pickCopy, type CopyLocale } from "@/lib/ui-locale-copy";

export const QUIZ_STASH_KEY = "shishya_anon_quiz";
/** A stash older than this is neither shown nor carried (the recall's own 7 days). */
export const QUIZ_CARRY_MAX_AGE_MS = 7 * 86_400_000;
/** At most this many questions in one carry (= the guest quiz's own maximum). */
export const QUIZ_CARRY_MAX_QUESTIONS = 20;
/** The source tag on every QuizCarry row. */
export const QUIZ_CARRY_SOURCE = "guest-quiz";
/** Missed topics named in the "saved" line. */
export const QUIZ_CARRY_TOPICS_SHOWN = 3;

const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const CHOICE_RE = /^[A-Za-z0-9]{1,4}$/;
const EXAM_CODE_RE = /^[A-Za-z0-9_-]{2,64}$/;

/** What the guest quiz leaves in localStorage (v2 adds questionIds, choices and the carry state). */
export interface QuizStash {
  examCode: string;
  examShort: string;
  topicCode: string | null;
  scopeLabel: string;
  score: number;
  total: number;
  missed: string[];
  at: number;
  /** v2 (30 Sep 2026): the questions, in order, and the option key chosen for each. */
  questionIds?: string[];
  choices?: string[];
  /** Set once the import answered: the missed topics it saved (possibly none). */
  carried?: { topics: string[] } | null;
  /** Set once the import answered for good (saved, already saved, or refused). */
  carryDone?: boolean;
}

/** localStorage JSON → a stash, or null when it is not one. */
export function parseQuizStash(raw: unknown): QuizStash | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.examCode !== "string" || !s.examCode) return null;
  if (typeof s.score !== "number" || typeof s.total !== "number" || typeof s.at !== "number") return null;
  const strings = (v: unknown) => (Array.isArray(v) && v.every((x) => typeof x === "string") ? (v as string[]) : undefined);
  const carried =
    s.carried && typeof s.carried === "object" && Array.isArray((s.carried as { topics?: unknown }).topics)
      ? { topics: ((s.carried as { topics: unknown[] }).topics.filter((x) => typeof x === "string") as string[]).slice(0, QUIZ_CARRY_TOPICS_SHOWN) }
      : null;
  return {
    examCode: s.examCode,
    examShort: typeof s.examShort === "string" ? s.examShort : s.examCode,
    topicCode: typeof s.topicCode === "string" ? s.topicCode : null,
    scopeLabel: typeof s.scopeLabel === "string" ? s.scopeLabel : "",
    score: s.score,
    total: s.total,
    missed: strings(s.missed) ?? [],
    at: s.at,
    questionIds: strings(s.questionIds),
    choices: strings(s.choices),
    carried,
    carryDone: s.carryDone === true,
  };
}

/** The request body of POST /api/quiz/import. */
export interface QuizCarryBody {
  examCode: string;
  questionIds: string[];
  choices: string[];
  /** The stash's own time (ms) — part of its identity. */
  at: number;
}

/** Whether a stash's time is usable: not older than the max age, not in the future (1 h of clock skew allowed). */
export function isFreshStashTime(at: number, nowMs: number): boolean {
  return Number.isFinite(at) && at <= nowMs + 3600_000 && nowMs - at < QUIZ_CARRY_MAX_AGE_MS;
}

/** A stash → the import body, or null: a v1 stash (no ids), a carried one,
 *  a stale one, or one whose ids and choices do not line up. */
export function carryBodyOf(stash: QuizStash | null, nowMs: number): QuizCarryBody | null {
  if (!stash || stash.carryDone) return null;
  const ids = stash.questionIds ?? [];
  const choices = stash.choices ?? [];
  if (ids.length === 0 || ids.length !== choices.length || ids.length > QUIZ_CARRY_MAX_QUESTIONS) return null;
  if (!EXAM_CODE_RE.test(stash.examCode) || !isFreshStashTime(stash.at, nowMs)) return null;
  if (!ids.every((id) => ID_RE.test(id)) || !choices.every((c) => CHOICE_RE.test(c))) return null;
  return { examCode: stash.examCode, questionIds: ids, choices, at: stash.at };
}

/** Server-side check of a parsed body (the route's zod shape plus these rules), or an error word. */
export function checkCarryBody(b: QuizCarryBody, nowMs: number): "ok" | "shape" | "stale" {
  if (!EXAM_CODE_RE.test(b.examCode)) return "shape";
  if (b.questionIds.length === 0 || b.questionIds.length > QUIZ_CARRY_MAX_QUESTIONS || b.questionIds.length !== b.choices.length) return "shape";
  if (!b.questionIds.every((id) => ID_RE.test(id)) || !b.choices.every((c) => CHOICE_RE.test(c))) return "shape";
  if (!isFreshStashTime(b.at, nowMs)) return "stale";
  return "ok";
}

/** The identity of one stash for one account: same exam, time, questions and choices = the same carry. */
export function stashFingerprint(userId: string, b: QuizCarryBody): string {
  return [userId, b.examCode, String(b.at), b.questionIds.join(","), b.choices.join(",")].join("|");
}

/** A checked question of the exam, as the route reads it. */
export interface CarryQuestion {
  id: string;
  answerKey: string;
  topicId: string;
  topicName: string;
}

export interface CarryTopic {
  topicId: string;
  topicName: string;
  correct: number;
  total: number;
}

/** Re-grade the stash against the stored keys: one count per question id
 *  (a repeated id counts once, the first choice wins); ids not among
 *  `questions` (another exam, unchecked, unknown) are ignored. */
export function gradeCarry(
  b: Pick<QuizCarryBody, "questionIds" | "choices">,
  questions: readonly CarryQuestion[],
): { graded: number; correct: number; topics: CarryTopic[] } {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const seen = new Set<string>();
  const topics = new Map<string, CarryTopic>();
  let graded = 0;
  let correct = 0;
  b.questionIds.forEach((id, i) => {
    if (seen.has(id)) return;
    seen.add(id);
    const q = byId.get(id);
    if (!q) return;
    const ok = (b.choices[i] ?? "").trim().toUpperCase() === q.answerKey.trim().toUpperCase();
    graded += 1;
    if (ok) correct += 1;
    const t = topics.get(q.topicId) ?? { topicId: q.topicId, topicName: q.topicName, correct: 0, total: 0 };
    t.total += 1;
    if (ok) t.correct += 1;
    topics.set(q.topicId, t);
  });
  return { graded, correct, topics: [...topics.values()] };
}

/** The missed topics to name, most missed first. */
export function missedTopicNames(topics: readonly CarryTopic[], limit = QUIZ_CARRY_TOPICS_SHOWN): string[] {
  return topics
    .filter((t) => t.correct < t.total)
    .sort((a, b) => b.total - b.correct - (a.total - a.correct) || a.correct / a.total - b.correct / b.total || a.topicName.localeCompare(b.topicName))
    .slice(0, limit)
    .map((t) => t.topicName);
}

/** The quiz's own accuracy on one topic, 0..1. */
export function quizMastery(t: { correct: number; total: number }): number {
  return t.total > 0 ? Math.min(1, Math.max(0, t.correct / t.total)) : 0;
}

/** A topic row after the carry — the SQL in src/lib/db/quiz-carry.ts does the
 *  same. Counts add up (the running record). 30 Sep 2026 (review): masteryScore
 *  keeps the one meaning it has everywhere else — the LAST set's accuracy on
 *  the topic (the submit route overwrites it; the daily brief says so) — so
 *  the quiz sets it only when the quiz is the newer set (its time is not
 *  before the row's lastSeenAt), else it stays; lastSeenAt becomes the later
 *  of the two. It used to blend the quiz in as if masteryScore were a running
 *  average, which matched neither meaning. A new row takes the quiz's own. */
export function mergeMastery(
  existing: { masteryScore: number; attemptsCount: number; correctCount: number; lastSeenAt: Date } | null,
  add: { correct: number; total: number; at: Date },
): { masteryScore: number; attemptsCount: number; correctCount: number; lastSeenAt: Date } {
  if (!existing) return { masteryScore: quizMastery(add), attemptsCount: add.total, correctCount: add.correct, lastSeenAt: add.at };
  const newer = add.at.getTime() >= existing.lastSeenAt.getTime();
  return {
    masteryScore: newer ? quizMastery(add) : existing.masteryScore,
    attemptsCount: existing.attemptsCount + add.total,
    correctCount: existing.correctCount + add.correct,
    lastSeenAt: newer ? add.at : existing.lastSeenAt,
  };
}

/** What the recall does with the import's answer: keep the result shown as
 *  saved, stop trying (refused — never retried), or try again on a later page
 *  (signed out after all, rate-limited, a server or network failure).
 *  30 Sep 2026 (review): a 200 that stored nothing (`saved: false`, or no
 *  question left to grade) is "stop", never "saved" — the card must not say
 *  "Saved to your Shishya" when nothing was. */
export function carryOutcome(status: number, body: unknown): { kind: "saved"; topics: string[] } | { kind: "stop" } | { kind: "retry" } {
  if (status === 200) {
    const j = (body ?? {}) as { ok?: unknown; topics?: unknown; saved?: unknown; graded?: unknown };
    if (j.ok !== true) return { kind: "retry" };
    if (j.saved === false || j.graded === 0) return { kind: "stop" };
    const topics = Array.isArray(j.topics) ? (j.topics.filter((x) => typeof x === "string") as string[]).slice(0, QUIZ_CARRY_TOPICS_SHOWN) : [];
    return { kind: "saved", topics };
  }
  if (status === 400 || status === 404 || status === 409 || status === 410 || status === 422) return { kind: "stop" };
  return { kind: "retry" };
}

// ── Copy (the recall card) ─────────────────────────────────────────────

export interface QuizRecallCopy {
  /** {score} is rendered bold; {scope} = the quiz's scope label. */
  welcome: string;
  missTail: string;
  fullTail: string;
  fixCta: string;
  mockCta: string;
  dismiss: string;
  /** {topics} {exam} */
  saved: string;
  /** {exam} */
  savedAll: string;
}

const COPY: Readonly<Record<CopyLocale, QuizRecallCopy>> = {
  en: {
    welcome: "👋 Welcome in — we kept your guest quiz. You scored {score} on {scope}.",
    missTail: "Let's turn those misses into marks — start with the topic you're weakest on.",
    fullTail: "Strong start — keep the momentum with a full mock.",
    fixCta: "Fix my weak area →",
    mockCta: "Take a full mock →",
    dismiss: "Dismiss",
    saved: "✓ Saved to your Shishya: {topics} — the {exam} tutor now sees these weak topics.",
    savedAll: "✓ Saved to your Shishya — the {exam} tutor now sees this result.",
  },
  hi: {
    welcome: "👋 स्वागत है — आपका गेस्ट क्विज़ हमने रखा है। {scope} पर आपका स्कोर {score} रहा।",
    missTail: "चलिए, गलतियों को अंकों में बदलें — अपने सबसे कमज़ोर टॉपिक से शुरू करें।",
    fullTail: "बढ़िया शुरुआत — अब एक पूरा मॉक देकर रफ़्तार बनाए रखें।",
    fixCta: "मेरा कमज़ोर हिस्सा सुधारें →",
    mockCta: "पूरा मॉक दें →",
    dismiss: "बंद करें",
    saved: "✓ आपके Shishya में सेव हो गया: {topics} — {exam} ट्यूटर अब ये कमज़ोर टॉपिक देखता है।",
    savedAll: "✓ आपके Shishya में सेव हो गया — {exam} ट्यूटर अब यह परिणाम देखता है।",
  },
  te: {
    welcome: "👋 స్వాగతం — మీ గెస్ట్ క్విజ్‌ను మేము ఉంచాము. {scope}లో మీ స్కోర్ {score}.",
    missTail: "తప్పులను మార్కులుగా మార్చుకుందాం — మీ బలహీన టాపిక్‌తో మొదలుపెట్టండి.",
    fullTail: "మంచి ఆరంభం — పూర్తి మాక్ రాసి ఈ జోరు కొనసాగించండి.",
    fixCta: "నా బలహీన భాగాన్ని సరిచేయండి →",
    mockCta: "పూర్తి మాక్ రాయండి →",
    dismiss: "మూసివేయండి",
    saved: "✓ మీ Shishya లో సేవ్ అయింది: {topics} — {exam} ట్యూటర్ ఇప్పుడు ఈ బలహీన టాపిక్‌లను చూస్తుంది.",
    savedAll: "✓ మీ Shishya లో సేవ్ అయింది — {exam} ట్యూటర్ ఇప్పుడు ఈ ఫలితాన్ని చూస్తుంది.",
  },
};

export function quizRecallCopy(locale: string | null | undefined): QuizRecallCopy {
  return pickCopy(COPY, locale);
}

/** The "saved" line for a carried stash. */
export function savedLine(copy: QuizRecallCopy, stash: Pick<QuizStash, "examShort">, topics: readonly string[]): string {
  const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (m, k: string) => v[k] ?? m);
  return topics.length > 0
    ? fill(copy.saved, { topics: topics.join(", "), exam: stash.examShort })
    : fill(copy.savedAll, { exam: stash.examShort });
}

/** The welcome line split around its bold score: [before, after]. */
export function welcomeParts(copy: QuizRecallCopy, scope: string): [string, string] {
  const text = copy.welcome.replace("{scope}", scope);
  const i = text.indexOf("{score}");
  return i < 0 ? [text, ""] : [text.slice(0, i), text.slice(i + "{score}".length)];
}
