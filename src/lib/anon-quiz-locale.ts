// Anonymous quiz in the visitor's language — CACHE ONLY (12 Sep 2026).
//
// The audit found 29,779 Hindi question translations (83% of the bank)
// sitting in QuestionTranslation while every guest quiz rendered English.
// This helper overlays ONLY rows that already exist in that table — one
// indexed SELECT per non-English quiz load, never the translator, never a
// model call. A question with no cached row stays English (honest: the
// page is a mix rather than a live translation), and a question already
// written in the target script is left alone — a paper authored natively
// in Hindi must never be "translated" into Hindi again.
//
// The caller (exams/[code]/quiz/page.tsx) passes the result to
// <AnonQuizPlayer />, which shows the "Shishya-translated — cross-check the
// English" label beside every overlaid question and keeps a one-tap
// "See in English" toggle — the English source is never discarded.
//
// SERVER-ONLY (imports the DB repository).

import type { AnonQuiz } from "@/lib/anon-quiz";
import type { Locale } from "@/lib/i18n";
import { findTranslations, type CachedTranslation } from "@/lib/db/questionTranslations";
import { looksNativelyIn } from "@/lib/preferred-lang";

export interface AnonQuizTranslation {
  body: string;
  options: { key: string; text: string }[];
  solution: string;
}

/** Cached translations for the quiz's questions in `locale`, keyed by
 *  question id. Empty for "en", when nothing is cached, or on a DB hiccup
 *  (the quiz still renders in English). */
export async function cachedQuizTranslations(
  quiz: AnonQuiz,
  locale: Locale,
): Promise<Record<string, AnonQuizTranslation>> {
  const out: Record<string, AnonQuizTranslation> = {};
  if (locale === "en" || quiz.questions.length === 0) return out;

  const cached = await findTranslations(
    quiz.questions.map((q) => q.id),
    locale,
  ).catch((err): Map<string, CachedTranslation> => {
    console.error("[anon-quiz-locale] translation lookup failed, serving English:", err);
    return new Map();
  });

  for (const q of quiz.questions) {
    const tr = cached.get(q.id);
    if (!tr || !tr.body) continue;
    // Identity row (translator returned the source unchanged) — nothing to
    // show, and no label to earn.
    if (tr.body.trim() === q.body.trim()) continue;
    // Native-medium guard: authored in this script already → never overlay.
    if (looksNativelyIn(q.body, locale)) continue;
    out[q.id] = {
      body: tr.body,
      // Options must line up with the source keys; otherwise keep English.
      options:
        tr.options.length === q.options.length && tr.options.every((o) => typeof o?.text === "string")
          ? tr.options
          : q.options,
      solution: tr.solution || q.solution,
    };
  }
  return out;
}
