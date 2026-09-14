// /c/:token — a Challenge a friend link (14 Sep 2026).
//
// A friend opens it from WhatsApp: "Ravi scored 7/10 on 10 SSC GD
// questions — can you beat it?", plays the SAME questions (client-graded
// like the anonymous quiz, which it reuses), then chooses whether to send
// the score; the server grades it and tells the challenger. The
// challenger's own browser (creator key) or account sees every score here
// instead. Rules: src/lib/challenge.ts; storage: src/lib/challenge-db.ts.
//
// Language: the visitor's own choice (shishya-lang cookie) wins; otherwise
// the page speaks the language the challenge was made in — a WhatsApp
// lander carries no cookie, and the preview title follows the same rule.
// Questions get their cached translations, English one tap away.
//
// noindex, nofollow, not in the sitemap, robots untouched — like /share/, a
// per-person link is a social preview, never a search result. Middleware
// records the share utm on landing so a friend's signup is attributed.

import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import type { AnonQuizTranslationPack } from "@/components/AnonQuizPlayer";
import { auth } from "@/lib/auth";
import { fillTemplate, localeNames, locales, type Locale } from "@/lib/i18n";
import { tFor } from "@/lib/i18n-server";
import { cachedQuizTranslations } from "@/lib/anon-quiz-locale";
import { isChallengeExpired } from "@/lib/challenge";
import { challengeHeadlineText, challengeLabels, quizLabels } from "@/lib/challenge-copy";
import { challengeQuiz, loadChallenge, type LoadedChallenge } from "@/lib/challenge-db";
import { ChallengeLanding } from "./ChallengeLanding";

export const dynamic = "force-dynamic";

type Params = { token: string };

const ROBOTS = { index: false, follow: false };

function asLocale(v: string | null | undefined): Locale | null {
  return v && (locales as readonly string[]).includes(v) ? (v as Locale) : null;
}

/** The visitor's own language choice, else the language the challenge was made in. */
async function pageLocale(ch: Pick<LoadedChallenge, "locale">): Promise<Locale> {
  let fromCookie: Locale | null = null;
  try {
    fromCookie = asLocale((await cookies()).get("shishya-lang")?.value);
  } catch {
    /* no request scope */
  }
  return fromCookie ?? asLocale(ch.locale) ?? "en";
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { token } = await params;
  const ch = await loadChallenge(token).catch(() => null);
  if (!ch) return { title: "Challenge — Shishya", robots: ROBOTS };
  const locale = await pageLocale(ch);
  const L = challengeLabels(tFor(locale));
  const headline = challengeHeadlineText(L, {
    name: ch.creatorName,
    correct: ch.creatorCorrect,
    total: ch.questionCount,
    exam: ch.examShort,
    fromMock: ch.source === "mock",
  });
  const description = fillTemplate(L["challenge.meta.desc"], { n: ch.questionCount });
  return {
    title: `${headline} | Shishya`,
    description,
    openGraph: {
      title: headline,
      description,
      url: `https://shishya.in/c/${token}`,
      siteName: "Shishya",
      locale: locale === "hi" ? "hi_IN" : locale === "te" ? "te_IN" : "en_IN",
      type: "article",
    },
    twitter: { card: "summary_large_image", title: headline, description },
    robots: ROBOTS,
  };
}

export default async function ChallengePage({ params }: { params: Promise<Params> }) {
  const { token } = await params;
  const ch = await loadChallenge(token).catch(() => null);
  if (!ch) notFound();
  const expired = isChallengeExpired(ch.expiresAt);
  const [session, quiz, locale] = await Promise.all([
    auth().catch(() => null),
    expired ? Promise.resolve(null) : challengeQuiz(ch).catch(() => null),
    pageLocale(ch),
  ]);
  const isCreatorSession = !!session?.user?.id && session.user.id === ch.creatorUserId;
  const t = tFor(locale);
  const L = challengeLabels(t);

  // Cached question translations only (one indexed read, never the translator), as on the quiz page.
  const translatedById = quiz ? await cachedQuizTranslations(quiz, locale) : {};
  const translation: AnonQuizTranslationPack | undefined =
    quiz && Object.keys(translatedById).length > 0
      ? { locale, localeName: localeNames[locale], byId: translatedById, note: t("quiz.translated.note"), seeIn: t("quiz.seeIn") }
      : undefined;

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header />
      <section className="container-prose py-8 sm:py-10">
        <p className="text-xs text-ink-500">
          <Link href={`/exams/${ch.examCode}`} className="hover:text-ink-800">
            {ch.examShort}
          </Link>{" "}
          · {L["challenge.crumb"]}
        </p>
        <div className="mt-4 max-w-2xl">
          {quiz ? (
            <ChallengeLanding
              data={{
                token: ch.id,
                examCode: ch.examCode,
                examShort: ch.examShort,
                questionCount: ch.questionCount,
                creatorName: ch.creatorName,
                creatorCorrect: ch.creatorCorrect,
                fromMock: ch.source === "mock",
                expiresAt: new Date(ch.expiresAt).toISOString(),
              }}
              quiz={quiz}
              isCreatorSession={isCreatorSession}
              labels={L}
              quizLabels={quizLabels(t)}
              locale={locale}
              translation={translation}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-ink-300 bg-white px-5 py-6">
              <p className="text-sm font-medium text-ink-800">{expired ? L["challenge.ended"] : L["challenge.changed"]}</p>
              <Link
                href={`/exams/${ch.examCode}/quiz`}
                className="mt-3 inline-block text-sm font-semibold text-saffron-700 hover:text-saffron-800"
              >
                {fillTemplate(L["challenge.freshQuizLink"], { exam: ch.examShort })}
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
