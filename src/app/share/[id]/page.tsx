// /share/:id — public share landing for a mock attempt.
//
// The personalised destination that lands when a student shares their
// score on WhatsApp / Twitter / Telegram. Shows:
//   - exam name + their score (when the sharer has a name on their account)
//   - ONE CTA → the anonymous 5-question quiz for the same exam
//     (/exams/:code/quiz — no sign-in; the quiz itself ends on the
//     sign-in offer). Until 11 Sep 2026 the only button was /login,
//     i.e. a friend tapping a WhatsApp forward hit a login wall first.
//   - per-category theme wash so it visually ties to the exam
//
// PRIVACY
// We expose ONLY exam shortname + score percentage + the student's
// first name. No email, no userId, no per-question detail. Safe to make
// public. A sharer with NO name on their account gets no score shown
// either — "A student scored 72%" is a number with nobody attached, and
// reads like synthetic social proof, which Shishya never shows.
//
// ATTRIBUTION
// The quiz CTA is utm-tagged (src/lib/share-url.ts, campaign
// share-landing) and forwards the inbound channel (utm_source) so the
// quiz visit keeps its WhatsApp / Telegram origin. Canonical stays bare.
//
// LANGUAGE (16 Sep 2026)
// /share is not a locale twin, so there is no URL locale. The body asks
// getLocale() — the call <Header /> on this page and the quiz behind the CTA
// both make (shishya-lang cookie, else User.preferredLang) — so header, body
// and quiz agree. A friend with no language of their own (first visit,
// signed out) follows the link instead: a share sent in Hindi or Telugu
// carries ?lang=hi|te (src/lib/share-landing-copy.ts), the hand-off
// /c/[token] makes from the challenger's locale. Their own choice always
// wins over the link. In hi/te the CTA opens the quiz's /hi|/te twin, where
// the middleware sets the friend's language cookie if they have none, so the
// quiz and the next clicks stay in that language. The metadata, the OG card
// and the Twitter card stay English on purpose: the preview is rendered for
// a social crawler that carries no cookie and no account, and the page is
// noindex with a bare canonical, so a translated title would reach nobody.
//
// Sister file in this directory:
//   opengraph-image.tsx — the dynamic OG card embedded in WhatsApp
//                          previews (built via next/og ImageResponse)

import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { REAL_EXAM_WHERE } from "@/lib/db/exam-scope";
import { getExamTheme } from "@/lib/exam-theme";
import { formatDisplayScorePct } from "@/lib/scoring";
import { fillTemplate, locales } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import {
  resolveShareLandingLocale,
  shareLandingCopy,
  shareLinkLocale,
  shareQuizPath,
  SHARE_LANG_PARAM,
} from "@/lib/share-landing-copy";
import { isShareChannel, sharePath } from "@/lib/share-url";

interface RouteParams {
  id: string;
}

function firstNameOf(name: string | null | undefined): string | null {
  const first = name?.trim().split(/\s+/)[0];
  return first ? first : null;
}

/** The visitor's own language (getLocale(), as the Header and the quiz use),
 *  else the language the share was sent in, else en. Best-effort — a failed
 *  read falls through; the landing never fails over a language lookup. */
async function visitorLocale(linkLang: ReturnType<typeof shareLinkLocale>): Promise<string> {
  const [own, cookie] = await Promise.all([
    getLocale().catch(() => "en"),
    cookies()
      .then((c) => c.get("shishya-lang")?.value ?? null)
      .catch(() => null),
  ]);
  return resolveShareLandingLocale({ own, cookie, link: linkLang });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { id } = await params;
  const attempt = await prisma.attempt
    .findUnique({
      where: { id },
      select: {
        scorePct: true,
        user: { select: { name: true } },
        mock: { select: { exam: { select: { shortName: true, name: true } } } },
      },
    })
    .catch(() => null);
  if (!attempt?.mock) return { title: "Mock result — Shishya" };

  const exam = attempt.mock.exam.shortName;
  const showScore = !!firstNameOf(attempt.user?.name) && attempt.scorePct != null;
  const score = formatDisplayScorePct(attempt.scorePct);
  const headline = showScore
    ? `Scored ${score} on ${exam} — try 5 questions free`
    : `${exam} mock on Shishya — try 5 questions free`;
  const description = showScore
    ? `A friend scored ${score} on a ${attempt.mock.exam.name} mock on Shishya. Check your own 5 questions — free, no sign-in.`
    : `A friend took a ${attempt.mock.exam.name} mock on Shishya. Check your own 5 questions — free, no sign-in.`;
  return {
    title: `${headline} | Shishya`,
    description,
    alternates: { canonical: `https://shishya.in/share/${id}` },
    openGraph: {
      title: headline,
      description: `Real Indian exam prep. Free mocks, PYQ, AI tutor — no paywall, no sign-in to try.`,
      url: `https://shishya.in/share/${id}`,
      siteName: "Shishya",
      locale: "en_IN",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: headline,
      description: `Real Indian exam prep. Free mocks, PYQ, AI tutor.`,
    },
    // A per-attempt landing is a social preview, never a search result
    // (13 Sep 2026, index shape): thousands of near-identical "a friend
    // scored X%" pages would only dilute the index Bing / ChatGPT ground on.
    // The OG card still unfurls. robots.ts deliberately leaves /share/
    // crawlable — a disallowed URL could never show this noindex.
    robots: { index: false, follow: false },
  };
}

export default async function SharePage({
  params,
  searchParams,
}: {
  params: Promise<RouteParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [attempt, activeExams, locale] = await Promise.all([
    prisma.attempt.findUnique({
      where: { id },
      select: {
        id: true,
        scorePct: true,
        finishedAt: true,
        user: { select: { name: true } },
        mock: {
          select: {
            exam: {
              select: {
                code: true,
                name: true,
                shortName: true,
                category: true,
              },
            },
          },
        },
      },
    }),
    // Honest count at render time — the old "all 163 exams" was a number
    // frozen in copy while the catalogue kept growing. 25 Sep 2026: real
    // exams only — school class containers are not exams to explore.
    prisma.exam.count({ where: REAL_EXAM_WHERE }).catch(() => null),
    // The visitor's own language, else the one the share was sent in.
    visitorLocale(shareLinkLocale(sp[SHARE_LANG_PARAM])),
  ]);
  if (!attempt || !attempt.mock) notFound();

  const exam = attempt.mock.exam;
  const theme = getExamTheme(exam.category);
  const firstName = firstNameOf(attempt.user?.name);
  const showScore = !!firstName && attempt.scorePct != null;
  const score = formatDisplayScorePct(attempt.scorePct);

  // Keep the inbound channel on the CTA (a WhatsApp arrival stays a
  // WhatsApp arrival on the quiz); a bare link counts as a copied one.
  const inbound = Array.isArray(sp.utm_source) ? sp.utm_source[0] : sp.utm_source;
  const quizHref = sharePath(shareQuizPath(exam.code, locale), {
    surface: "share-landing",
    channel: isShareChannel(inbound) ? inbound : "copy",
    exam: exam.code,
  });
  const languageCount = locales.length; // English + the scheduled Indian languages the translator serves
  const C = shareLandingCopy(locale);

  return (
    <main className={`min-h-screen ${theme.pageBg}`}>
      <div className={`h-1.5 w-full ${theme.ribbon}`} aria-hidden />
      <Header />
      <section className="container-prose py-12">
        <div className="mx-auto max-w-2xl text-center">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${theme.badge}`}
          >
            <span aria-hidden>{theme.icon}</span>
            {theme.label}
          </span>
          {showScore ? (
            <>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink-900 sm:text-5xl">
                {fillTemplate(C.scoredBefore, { name: firstName ?? "" })}
                <span className="text-saffron-600">{score}</span>
                {C.scoredAfter}
              </h1>
              <p className="mt-2 text-base text-ink-700 sm:text-lg">
                {C.onMockBefore}
                <Link href={`/exams/${exam.code}`} className="font-semibold text-ink-900 hover:underline">
                  {exam.shortName}
                </Link>
                {C.onMockAfter}
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink-900 sm:text-5xl">
                {C.sentBefore}
                <Link href={`/exams/${exam.code}`} className="text-saffron-600 hover:underline">
                  {exam.shortName}
                </Link>
                {C.sentAfter}
              </h1>
              <p className="mt-2 text-base text-ink-700 sm:text-lg">
                {fillTemplate(C.fromShishya, { exam: exam.name })}
              </p>
            </>
          )}
          {attempt.finishedAt && (
            <p className="mt-1 text-xs text-ink-500">
              {new Date(attempt.finishedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}

          <div className="mx-auto mt-10 max-w-md rounded-2xl border-2 border-saffron-300 bg-white p-6 shadow-md sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
              {C.freeNoSignIn}
            </p>
            <h2 className="mt-2 text-xl font-bold text-ink-900">
              {showScore
                ? fillTemplate(C.ctaHeadingScore, { score })
                : fillTemplate(C.ctaHeadingPlain, { exam: exam.shortName })}
            </h2>
            <p className="mt-2 text-sm text-ink-600">
              {fillTemplate(C.ctaSub, { exam: exam.shortName })}
            </p>
            <Link
              href={quizHref}
              prefetch={false}
              className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-saffron-500 px-5 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-saffron-600"
            >
              {fillTemplate(C.ctaButton, { exam: exam.shortName })}
            </Link>
            <p className="mt-3 text-[11px] text-ink-500">
              {fillTemplate(C.fineprint, { n: languageCount })}
            </p>
          </div>

          <p className="mt-10 text-xs text-ink-500">
            <Link href="/" className="font-medium text-saffron-700 hover:underline">
              {activeExams ? fillTemplate(C.exploreCount, { n: activeExams }) : C.exploreAll}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
