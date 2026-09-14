// /c/:token — a Challenge a friend link (14 Sep 2026).
//
// A friend opens it from WhatsApp: "Ravi scored 7/10 on 10 SSC GD
// questions — can you beat it?", plays the SAME questions (client-graded
// like the anonymous quiz, which it reuses), then chooses whether to send
// the score; the server grades it and tells the challenger. The
// challenger's own browser (creator key) or account sees every score here
// instead. Rules: src/lib/challenge.ts; storage: src/lib/challenge-db.ts.
//
// noindex, nofollow, not in the sitemap, robots untouched — like /share/, a
// per-person link is a social preview, never a search result. Middleware
// records the share utm on landing so a friend's signup is attributed.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { challengeHeadline, isChallengeExpired } from "@/lib/challenge";
import { challengeQuiz, loadChallenge } from "@/lib/challenge-db";
import { ChallengeLanding } from "./ChallengeLanding";

export const dynamic = "force-dynamic";

type Params = { token: string };

const ROBOTS = { index: false, follow: false };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { token } = await params;
  const ch = await loadChallenge(token).catch(() => null);
  if (!ch) return { title: "Challenge — Shishya", robots: ROBOTS };
  const headline = `${challengeHeadline({
    name: ch.creatorName,
    correct: ch.creatorCorrect,
    total: ch.questionCount,
    examShort: ch.examShort,
    fromMock: ch.source === "mock",
  })} — can you beat it?`;
  const description = `The same ${ch.questionCount} questions, free, no sign-in — instant scoring and solutions on Shishya.`;
  return {
    title: `${headline} | Shishya`,
    description,
    openGraph: {
      title: headline,
      description,
      url: `https://shishya.in/c/${token}`,
      siteName: "Shishya",
      locale: "en_IN",
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
  const [session, quiz] = await Promise.all([
    auth().catch(() => null),
    expired ? Promise.resolve(null) : challengeQuiz(ch).catch(() => null),
  ]);
  const isCreatorSession = !!session?.user?.id && session.user.id === ch.creatorUserId;

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header />
      <section className="container-prose py-8 sm:py-10">
        <p className="text-xs text-ink-500">
          <Link href={`/exams/${ch.examCode}`} className="hover:text-ink-800">
            {ch.examShort}
          </Link>{" "}
          · Challenge
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
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-ink-300 bg-white px-5 py-6">
              <p className="text-sm font-medium text-ink-800">
                {expired
                  ? "This challenge has ended — challenge links work for 30 days."
                  : "This challenge's questions have changed, so it can't be played fairly any more."}
              </p>
              <Link
                href={`/exams/${ch.examCode}/quiz`}
                className="mt-3 inline-block text-sm font-semibold text-saffron-700 hover:text-saffron-800"
              >
                Try a fresh {ch.examShort} quiz — free, no sign-in →
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
