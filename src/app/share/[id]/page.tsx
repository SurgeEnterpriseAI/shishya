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
// Sister file in this directory:
//   opengraph-image.tsx — the dynamic OG card embedded in WhatsApp
//                          previews (built via next/og ImageResponse)

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { getExamTheme } from "@/lib/exam-theme";
import { formatDisplayScorePct } from "@/lib/scoring";
import { locales } from "@/lib/i18n";
import { isShareChannel, sharePath } from "@/lib/share-url";

interface RouteParams {
  id: string;
}

function firstNameOf(name: string | null | undefined): string | null {
  const first = name?.trim().split(/\s+/)[0];
  return first ? first : null;
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
    robots: { index: true, follow: true },
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
  const [attempt, activeExams] = await Promise.all([
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
    // frozen in copy while the catalogue kept growing.
    prisma.exam.count({ where: { active: true } }).catch(() => null),
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
  const quizHref = sharePath(`/exams/${exam.code}/quiz`, {
    surface: "share-landing",
    channel: isShareChannel(inbound) ? inbound : "copy",
    exam: exam.code,
  });
  const languageCount = locales.length; // English + the scheduled Indian languages the translator serves

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
                {firstName} scored{" "}
                <span className="text-saffron-600">{score}</span>
              </h1>
              <p className="mt-2 text-base text-ink-700 sm:text-lg">
                on a{" "}
                <Link href={`/exams/${exam.code}`} className="font-semibold text-ink-900 hover:underline">
                  {exam.shortName}
                </Link>{" "}
                mock at Shishya
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink-900 sm:text-5xl">
                A friend sent you a{" "}
                <Link href={`/exams/${exam.code}`} className="text-saffron-600 hover:underline">
                  {exam.shortName}
                </Link>{" "}
                mock
              </h1>
              <p className="mt-2 text-base text-ink-700 sm:text-lg">
                from Shishya — free mocks, previous-year papers and exam dates for {exam.name}
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
              Free · no sign-in
            </p>
            <h2 className="mt-2 text-xl font-bold text-ink-900">
              {showScore
                ? `Your friend scored ${score} — check your own 5 questions`
                : `Check your own 5 ${exam.shortName} questions`}
            </h2>
            <p className="mt-2 text-sm text-ink-600">
              About 90 seconds: 5 {exam.shortName}-level questions, graded instantly, with the
              answers. No account, no app.
            </p>
            <Link
              href={quizHref}
              prefetch={false}
              className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-saffron-500 px-5 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-saffron-600"
            >
              Try 5 {exam.shortName} questions — no sign-in →
            </Link>
            <p className="mt-3 text-[11px] text-ink-500">
              Free · No credit card · {languageCount} languages
            </p>
          </div>

          <p className="mt-10 text-xs text-ink-500">
            <Link href="/" className="font-medium text-saffron-700 hover:underline">
              {activeExams ? `Explore all ${activeExams} exams →` : "Explore all exams →"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
