"use client";

// /c/{token} in the browser (14 Sep 2026). What this browser sees:
//   • the challenger (this browser made it, or the signed-in account did):
//     every score friends chose to send, newest first, and the share
//     buttons again;
//   • a friend who already sent a score: both scores side by side;
//   • anyone else: the challenge, then the questions in challenge mode.
// localStorage is read after mount, so the server render is the intro.
// Every string arrives as labels in the page's language (the visitor's own
// language choice, else the language the challenge was made in).

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AnonQuiz } from "@/lib/anon-quiz";
import { fillTemplate } from "@/lib/i18n";
import { AnonQuizPlayer, type AnonQuizTranslationPack } from "@/components/AnonQuizPlayer";
import { ChallengeCard, ChallengeScores, ChallengeShare } from "@/components/ChallengeCard";
import { challengeVerdict } from "@/lib/challenge";
import {
  challengeAgo,
  challengeDateLocale,
  challengeHeadlineText,
  type ChallengeLabels,
  type QuizLabels,
} from "@/lib/challenge-copy";
import { madeChallengeKey, playedChallenge, type PlayedChallenge } from "@/lib/challenge-local";

export interface ChallengeLandingData {
  token: string;
  examCode: string;
  examShort: string;
  questionCount: number;
  creatorName: string | null;
  creatorCorrect: number;
  fromMock: boolean;
  expiresAt: string;
}

interface Play {
  name: string | null;
  correct: number;
  at: string;
}

export function ChallengeLanding({
  data,
  quiz,
  isCreatorSession,
  labels,
  quizLabels,
  locale,
  translation,
}: {
  data: ChallengeLandingData;
  quiz: AnonQuiz;
  isCreatorSession: boolean;
  labels: ChallengeLabels;
  quizLabels: QuizLabels;
  locale: string;
  translation?: AnonQuizTranslationPack;
}) {
  const L = labels;
  const [mode, setMode] = useState<"intro" | "playing" | "creator" | "played">("intro");
  const [creatorKey, setCreatorKey] = useState<string | null>(null);
  const [plays, setPlays] = useState<Play[] | null>(null);
  const [playsFailed, setPlaysFailed] = useState(false);
  const [played, setPlayed] = useState<PlayedChallenge | null>(null);
  const n = data.questionCount;

  useEffect(() => {
    const key = madeChallengeKey(data.token);
    if (key || isCreatorSession) {
      setCreatorKey(key);
      setMode("creator");
      fetch(`/api/challenge/${data.token}/plays`, { headers: key ? { "x-challenge-key": key } : {}, cache: "no-store" })
        .then(async (res) => {
          const j = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(String(res.status));
          setPlays(Array.isArray(j.plays) ? j.plays : []);
        })
        .catch(() => setPlaysFailed(true));
      return;
    }
    const p = playedChallenge(data.token);
    if (p) {
      setPlayed(p);
      setMode("played");
    }
  }, [data.token, isCreatorSession]);

  if (mode === "playing") {
    return (
      <AnonQuizPlayer
        quiz={quiz}
        translation={translation}
        labels={quizLabels}
        challengeLabels={L}
        locale={locale}
        challenge={{ token: data.token, creatorName: data.creatorName, creatorCorrect: data.creatorCorrect }}
      />
    );
  }

  if (mode === "creator") {
    const now = Date.now();
    return (
      <>
        <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
            {fillTemplate(L["challenge.creator.kicker"], { exam: data.examShort })}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink-900">
            {fillTemplate(L[data.fromMock ? "challenge.creator.h1Mock" : "challenge.creator.h1"], { correct: data.creatorCorrect, n })}
          </h1>
          {playsFailed ? (
            <p className="mt-3 text-sm text-rose-700">{L["challenge.creator.error"]}</p>
          ) : plays === null ? (
            <p className="mt-3 text-sm text-ink-500">{L["challenge.creator.loading"]}</p>
          ) : plays.length === 0 ? (
            <p className="mt-3 text-sm text-ink-600">{L["challenge.creator.none"]}</p>
          ) : (
            <ul className="mt-4 divide-y divide-ink-100">
              {plays.map((p, i) => {
                const v = challengeVerdict(p.correct, data.creatorCorrect);
                return (
                  <li key={`${p.at}-${i}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 truncate text-ink-800">{p.name ?? L["challenge.aFriend"]}</span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          v === "ahead" ? "bg-emerald-100 text-emerald-800" : v === "tied" ? "bg-ink-100 text-ink-700" : "bg-saffron-100 text-saffron-800"
                        }`}
                      >
                        {v === "ahead" ? L["challenge.chip.ahead"] : v === "tied" ? L["challenge.chip.tied"] : L["challenge.chip.behind"]}
                      </span>
                      <span className="font-semibold tabular-nums text-ink-900">
                        {p.correct}/{n}
                      </span>
                      <span className="w-24 text-right text-xs text-ink-500">{challengeAgo(L, p.at, now)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-ink-500">
            {fillTemplate(L["challenge.creator.footer"], {
              date: new Date(data.expiresAt).toLocaleDateString(challengeDateLocale(locale), { day: "numeric", month: "long" }),
            })}
          </p>
        </div>
        <div className="mt-4 rounded-xl border-2 border-saffron-300 bg-saffron-50/60 p-4 sm:p-5">
          <ChallengeShare
            token={data.token}
            creatorKey={creatorKey}
            examCode={data.examCode}
            examShort={data.examShort}
            correct={data.creatorCorrect}
            total={n}
            fromMock={data.fromMock}
            title={L["challenge.share.again"]}
            labels={L}
            showScoresLink={false}
          />
        </div>
      </>
    );
  }

  if (mode === "played" && played) {
    return (
      <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">{L["challenge.played.kicker"]}</p>
        <div className="mt-3">
          <ChallengeScores mine={played.correct} theirs={played.creatorCorrect} total={played.total} name={data.creatorName} labels={L} />
        </div>
        {played.choices.length === n && (
          <ChallengeCard
            from={{ source: "challenge", parentToken: data.token, choices: played.choices }}
            examCode={data.examCode}
            examShort={data.examShort}
            surface="challenge"
            heading={fillTemplate(L["challenge.card.headingChain"], { n })}
            labels={L}
            locale={locale}
          />
        )}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(`/exams/${data.examCode}`)}`}
            className="inline-flex flex-1 items-center justify-center rounded-lg bg-saffron-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600"
          >
            {fillTemplate(L["challenge.played.signIn"], { exam: data.examShort })}
          </Link>
          <Link
            href={`/exams/${data.examCode}/quiz`}
            className="inline-flex flex-1 items-center justify-center rounded-lg border border-ink-300 bg-white px-5 py-3 text-sm font-semibold text-ink-800 transition-colors hover:bg-ink-50"
          >
            {fillTemplate(L["challenge.played.fresh"], { exam: data.examShort })}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">{L["challenge.intro.kicker"]}</p>
      <h1 className="mt-2 text-2xl font-bold leading-tight text-ink-900 sm:text-3xl">
        {challengeHeadlineText(L, {
          name: data.creatorName,
          correct: data.creatorCorrect,
          total: n,
          exam: data.examShort,
          fromMock: data.fromMock,
        })}
      </h1>
      <p className="mt-3 text-sm text-ink-600">{fillTemplate(L["challenge.intro.desc"], { n })}</p>
      <p className="mt-1 text-xs text-ink-500">{L["challenge.intro.choice"]}</p>
      <button
        type="button"
        onClick={() => setMode("playing")}
        className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-saffron-500 px-5 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-300 sm:w-auto"
      >
        {fillTemplate(L["challenge.intro.start"], { n })}
      </button>
    </div>
  );
}
