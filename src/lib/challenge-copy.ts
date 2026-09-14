// Challenge a friend and the anonymous quiz player in the student's language
// (14 Sep 2026). The strings live in src/lib/i18n.ts — en + hi + te; every
// other locale falls back to English. This module only assembles them.
//
// No runtime import of the dictionary: the quiz player and the challenge
// card are client islands, so server pages call challengeLabels(t) /
// quizLabels(t) and pass plain strings down (the study-day-copy.ts pattern).
// fillTemplate is dict-free.
//
// English output is byte-identical to the English-only builders in
// src/lib/challenge.ts, which the challenger's email and the unit tests use.

import { fillTemplate, type StringKey } from "@/lib/i18n";
import { challengeVerdict } from "@/lib/challenge";

export type Translate = (key: StringKey) => string;

export const CHALLENGE_I18N_KEYS = [
  "challenge.kicker",
  "challenge.card.headingQuiz",
  "challenge.card.headingChain",
  "challenge.card.headingMock",
  "challenge.card.noteMock",
  "challenge.card.name",
  "challenge.card.make",
  "challenge.card.making",
  "challenge.card.fine",
  "challenge.card.fineName",
  "challenge.card.error",
  "challenge.card.errorNet",
  "challenge.share.ready",
  "challenge.share.again",
  "challenge.share.desc",
  "challenge.share.whatsapp",
  "challenge.share.copy",
  "challenge.share.copied",
  "challenge.share.more",
  "challenge.share.seeScores",
  "challenge.share.title",
  "challenge.text.quiz",
  "challenge.text.mock",
  "challenge.watch.button",
  "challenge.watch.busy",
  "challenge.watch.on",
  "challenge.watch.denied",
  "challenge.watch.error",
  "challenge.you",
  "challenge.yourFriend",
  "challenge.aFriend",
  "challenge.cmp.ahead",
  "challenge.cmp.aheadFriend",
  "challenge.cmp.tied",
  "challenge.cmp.tiedFriend",
  "challenge.cmp.behind",
  "challenge.cmp.behindFriend",
  "challenge.intro.kicker",
  "challenge.head.quiz",
  "challenge.head.quizFriend",
  "challenge.head.mock",
  "challenge.head.mockFriend",
  "challenge.intro.desc",
  "challenge.intro.choice",
  "challenge.intro.start",
  "challenge.meta.desc",
  "challenge.crumb",
  "challenge.ended",
  "challenge.changed",
  "challenge.freshQuizLink",
  "challenge.creator.kicker",
  "challenge.creator.h1",
  "challenge.creator.h1Mock",
  "challenge.creator.loading",
  "challenge.creator.none",
  "challenge.creator.error",
  "challenge.chip.ahead",
  "challenge.chip.tied",
  "challenge.chip.behind",
  "challenge.ago.now",
  "challenge.ago.min",
  "challenge.ago.hour",
  "challenge.ago.dayOne",
  "challenge.ago.day",
  "challenge.creator.footer",
  "challenge.played.kicker",
  "challenge.played.signIn",
  "challenge.played.fresh",
  "challenge.send.kicker",
  "challenge.send.ask",
  "challenge.send.askFriend",
  "challenge.send.note",
  "challenge.send.noteName",
  "challenge.send.send",
  "challenge.send.sending",
  "challenge.send.keep",
  "challenge.send.self",
  "challenge.send.error",
  "challenge.send.errorNet",
] as const satisfies readonly StringKey[];

/** Server-side only (push notifications); kept out of the labels sent to the browser. */
export const CHALLENGE_PUSH_I18N_KEYS = [
  "challenge.push.title",
  "challenge.push.titleFriend",
  "challenge.push.body",
  "challenge.push.bodyFriend",
  "challenge.push.welcomeTitle",
  "challenge.push.welcomeBody",
] as const satisfies readonly StringKey[];

export const QUIZ_I18N_KEYS = [
  "quiz.questionOf",
  "quiz.diff.EASY",
  "quiz.diff.MEDIUM",
  "quiz.diff.HARD",
  "quiz.correct",
  "quiz.answer",
  "quiz.next",
  "quiz.seeScore",
  "quiz.yourScore",
  "quiz.strong",
  "quiz.needsWork",
  "quiz.signIn",
  "quiz.askTutor",
  "quiz.stuck",
  "quiz.expert",
  "quiz.sample",
  "quiz.sampleNote",
] as const satisfies readonly StringKey[];

export type ChallengeLabels = Record<(typeof CHALLENGE_I18N_KEYS)[number], string>;
export type QuizLabels = Record<(typeof QUIZ_I18N_KEYS)[number], string>;

export function challengeLabels(t: Translate): ChallengeLabels {
  return Object.fromEntries(CHALLENGE_I18N_KEYS.map((k) => [k, t(k)])) as ChallengeLabels;
}

export function quizLabels(t: Translate): QuizLabels {
  return Object.fromEntries(QUIZ_I18N_KEYS.map((k) => [k, t(k)])) as QuizLabels;
}

/** The one line under both scores — the verdict picks the sentence; a missing name picks the "your friend" form. */
export function challengeCompareText(L: ChallengeLabels, p: { mine: number; theirs: number; total: number; name: string | null }): string {
  const verdict = challengeVerdict(p.mine, p.theirs);
  const key =
    verdict === "ahead"
      ? p.name
        ? "challenge.cmp.ahead"
        : "challenge.cmp.aheadFriend"
      : verdict === "tied"
        ? p.name
          ? "challenge.cmp.tied"
          : "challenge.cmp.tiedFriend"
        : p.name
          ? "challenge.cmp.behind"
          : "challenge.cmp.behindFriend";
  return fillTemplate(L[key], { name: p.name ?? "", n: Math.abs(p.mine - p.theirs), total: p.total });
}

/** Landing headline, ending "— can you beat it?". */
export function challengeHeadlineText(
  L: ChallengeLabels,
  p: { name: string | null; correct: number; total: number; exam: string; fromMock: boolean },
): string {
  const key = p.fromMock
    ? p.name
      ? "challenge.head.mock"
      : "challenge.head.mockFriend"
    : p.name
      ? "challenge.head.quiz"
      : "challenge.head.quizFriend";
  return fillTemplate(L[key], { name: p.name ?? "", correct: p.correct, total: p.total, exam: p.exam });
}

/** WhatsApp / copy message for a new challenge. */
export function challengeShareMessage(
  L: ChallengeLabels,
  p: { correct: number; total: number; exam: string; fromMock: boolean; url: string },
): string {
  return fillTemplate(L[p.fromMock ? "challenge.text.mock" : "challenge.text.quiz"], {
    correct: p.correct,
    total: p.total,
    exam: p.exam,
    url: p.url,
  });
}

/** "12 min ago" / "3 h ago" / "2 days ago" in the page's language. */
export function challengeAgo(L: ChallengeLabels, iso: string, now: number): string {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return L["challenge.ago.now"];
  if (mins < 60) return fillTemplate(L["challenge.ago.min"], { n: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return fillTemplate(L["challenge.ago.hour"], { n: hours });
  const days = Math.round(hours / 24);
  return days === 1 ? L["challenge.ago.dayOne"] : fillTemplate(L["challenge.ago.day"], { n: days });
}

/** Difficulty chip — the enum value when a translation is missing. */
export function quizDifficultyLabel(L: QuizLabels, difficulty: string): string {
  return (L as Record<string, string>)[`quiz.diff.${difficulty}`] ?? difficulty;
}

/** BCP 47 tag for dates on challenge pages. */
export function challengeDateLocale(locale: string): string {
  return locale === "hi" ? "hi-IN" : locale === "te" ? "te-IN" : "en-IN";
}
