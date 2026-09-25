// The exam's guest quiz, loaded for embedding on a sign-in gate (25 Sep 2026).
//
// The signed-out /mocks/[id] gate and the signed-out /build-mock page show
// the SAME 5-question guest quiz /exams/[code]/quiz serves (getAnonQuiz:
// validated MCQs of the exam, client-graded, no persistence), with the same
// cache-only translation overlay (cachedQuizTranslations: an indexed SELECT on
// a non-English page, never the translator) and the same player labels.
// Nothing new is generated and no model is called.
//
// SERVER-ONLY (DB). Null when the exam has no quiz questions or the read
// fails — the gate then shows sign-in alone, as the page did before.

import { getAnonQuiz, ANON_QUIZ_MIN, type AnonQuiz } from "@/lib/anon-quiz";
import { cachedQuizTranslations } from "@/lib/anon-quiz-locale";
import { challengeLabels, quizLabels, type ChallengeLabels, type QuizLabels, type Translate } from "@/lib/challenge-copy";
import { localeNames, type Locale } from "@/lib/i18n";
import type { AnonQuizTranslationPack } from "@/components/AnonQuizPlayer";

export interface GuestQuizEmbed {
  quiz: AnonQuiz;
  translation?: AnonQuizTranslationPack;
  labels: QuizLabels;
  challengeLabels: ChallengeLabels;
  locale: Locale;
}

export async function loadGuestQuizEmbed(examCode: string, t: Translate, locale: Locale): Promise<GuestQuizEmbed | null> {
  const quiz = await getAnonQuiz({ examCode, count: ANON_QUIZ_MIN }).catch(() => null);
  if (!quiz || quiz.questions.length === 0) return null;
  const byId = await cachedQuizTranslations(quiz, locale).catch(() => ({}));
  const translation: AnonQuizTranslationPack | undefined =
    Object.keys(byId).length > 0
      ? { locale, localeName: localeNames[locale], byId, note: t("quiz.translated.note"), seeIn: t("quiz.seeIn") }
      : undefined;
  return { quiz, translation, labels: quizLabels(t), challengeLabels: challengeLabels(t), locale };
}
