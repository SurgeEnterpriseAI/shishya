// /share/:id — public share landing for a mock attempt.
//
// The personalised destination that lands when a student shares their
// score on WhatsApp / Twitter / Telegram. Shows:
//   - exam name + their score
//   - a one-line "join Shishya" CTA → free signup with the same exam
//     pre-pinned via onbPrepCodes hint in URL
//   - per-category theme wash so it visually ties to the exam
//
// PRIVACY
// We expose ONLY exam shortname + score percentage + the student's
// first name (or "A student" if they're nameless). No email, no
// userId, no per-question detail. Safe to make public.
//
// Sister files in this directory:
//   opengraph-image.tsx — the dynamic OG card embedded in WhatsApp
//                          previews (built via next/og ImageResponse)
//   twitter-image.tsx   — uses the same component, served as the
//                          Twitter card.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { getExamTheme } from "@/lib/exam-theme";
import { formatDisplayScorePct } from "@/lib/scoring";

interface RouteParams {
  id: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { id } = await params;
  const attempt = await prisma.attempt.findUnique({
    where: { id },
    select: {
      scorePct: true,
      mock: { select: { exam: { select: { shortName: true, name: true } } } },
    },
  });
  if (!attempt?.mock) return { title: "Mock result — Shishya" };

  const score = formatDisplayScorePct(attempt.scorePct);
  const exam = attempt.mock.exam.shortName;
  return {
    title: `Scored ${score} on ${exam} — try Shishya free | Shishya`,
    description: `A student just attempted ${attempt.mock.exam.name} on Shishya and scored ${score}. Free mocks, PYQ, AI tutor — pick your exam and start in 60 seconds.`,
    alternates: { canonical: `https://shishya.in/share/${id}` },
    openGraph: {
      title: `Scored ${score} on ${exam} — try Shishya free`,
      description: `Real Indian exam prep. Free mocks, PYQ, AI tutor. Verified by students who cleared the same paper.`,
      url: `https://shishya.in/share/${id}`,
      siteName: "Shishya",
      locale: "en_IN",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `Scored ${score} on ${exam} — try Shishya free`,
      description: `Real Indian exam prep. Free mocks, PYQ, AI tutor.`,
    },
    robots: { index: true, follow: true },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { id } = await params;
  const attempt = await prisma.attempt.findUnique({
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
  });
  if (!attempt || !attempt.mock) notFound();

  const theme = getExamTheme(attempt.mock.exam.category);
  const score = formatDisplayScorePct(attempt.scorePct);
  const studentName =
    attempt.user?.name?.trim().split(/\s+/)[0] ?? "A student";

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
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink-900 sm:text-5xl">
            {studentName} scored{" "}
            <span className="text-saffron-600">{score}</span>
          </h1>
          <p className="mt-2 text-base text-ink-700 sm:text-lg">
            on a{" "}
            <Link
              href={`/exams/${attempt.mock.exam.code}`}
              className="font-semibold text-ink-900 hover:underline"
            >
              {attempt.mock.exam.shortName}
            </Link>{" "}
            mock at Shishya
          </p>
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
              Take your own mock — free
            </p>
            <h2 className="mt-2 text-xl font-bold text-ink-900">
              Where do YOU stand on {attempt.mock.exam.shortName}?
            </h2>
            <p className="mt-2 text-sm text-ink-600">
              90 seconds. 5 questions. Shishya spots your weak topics →
              every next mock targets exactly those. Free, in your
              language.
            </p>
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(`/exams/${attempt.mock.exam.code}`)}`}
              className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-saffron-500 px-5 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-saffron-600"
            >
              Try {attempt.mock.exam.shortName} free →
            </Link>
            <p className="mt-3 text-[11px] text-ink-500">
              Free · No credit card · 19 Indian languages
            </p>
          </div>

          <p className="mt-10 text-xs text-ink-500">
            <Link
              href="/"
              className="font-medium text-saffron-700 hover:underline"
            >
              Explore all 163 exams →
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
