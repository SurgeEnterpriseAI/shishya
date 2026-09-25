"use client";

// Growth lever #2 — the anonymous "taste" quiz UI.
//
// Plays a short MCQ set with instant client-side grading and solution
// reveal (no login, no persistence), then converts on the results screen:
// sign in to save + take full mocks, or discuss the ones you missed with
// the free AI tutor. Deliberately frictionless — the whole point is that a
// signed-out visitor experiences the product before hitting any gate.
//
// Language (14 Sep 2026): the player's own words arrive as `labels` and
// `challengeLabels` from the server page (src/lib/challenge-copy.ts), so a
// Hindi or Telugu quiz or challenge speaks the reader's language around the
// questions (which carry their own cached translations).

import { useState, type ReactNode } from "react";
import Link from "next/link";
import type { AnonQuiz } from "@/lib/anon-quiz";
import { fillTemplate, type Locale } from "@/lib/i18n";
import type { ExamWeekPhase } from "@/lib/exam-week";
import { TalkToTeacher } from "@/components/TalkToTeacher";
import { ExamAlertBox, type ExamAlertLabels, type ExamAlertWeekLabels } from "@/components/ExamAlertBox";
import { ChallengeCard, ChallengeScores } from "@/components/ChallengeCard";
import { inlineMd } from "@/components/NotesMarkdown";
import { CHALLENGE_MIN_QUESTIONS } from "@/lib/challenge";
import { quizDifficultyLabel, type ChallengeLabels, type QuizLabels } from "@/lib/challenge-copy";
import { challengePlayerKey, rememberPlayedChallenge } from "@/lib/challenge-local";

/** Exam Week Mode (6 Sep 2026): the server page that renders the player
 *  computes the exam's phase (computeExamWeekState) and passes the
 *  translated alert labels; the result screen then offers the one-email
 *  alert capture. Absent = the result screen is unchanged. */
export interface AnonQuizExamWeek {
  phase: ExamWeekPhase;
  signedIn?: boolean;
  labels: ExamAlertLabels;
  weekLabels?: ExamAlertWeekLabels;
  note?: string;
}

/** Phases where a guest who just tried 5 questions is worth one alert tap. */
const ALERT_PHASES: ReadonlySet<ExamWeekPhase> = new Set<ExamWeekPhase>(["week", "eve", "post"]);

/** Cutoff-page arrivals (?from=cutoff, 11 Sep 2026): the category cutoff
 *  table the visitor just read, rendered under the score with its source
 *  tier word and the page's own disclaimer. Absent = no block. */
export interface AnonQuizCutoff {
  /** Section heading, e.g. "Indicative cutoff (estimate, not official)". */
  heading: string;
  /** Source tier word for these figures, e.g. "expected". */
  tier: string;
  /** Header row first, headers already translated. */
  table: string[][];
  /** The generator's source / guidance bullets (inline markdown). */
  notes: string[];
  /** The /cutoff page's honesty line. */
  disclaimer: string;
}

/** Student's language (12 Sep 2026): cached QuestionTranslation rows for
 *  this quiz in the page's locale, overlaid CLIENT-SIDE with the English
 *  source kept, so "See in English" is one tap and never a fetch. The
 *  server passes only rows that already exist (src/lib/anon-quiz-locale.ts)
 *  — nothing in this component translates. Absent = English quiz, no
 *  label. Every overlaid question carries the honesty note. */
export interface AnonQuizTranslationPack {
  locale: Locale;
  /** Native name of the locale ("हिन्दी"), for the "See in {lang}" toggle. */
  localeName: string;
  byId: Record<string, { body: string; options: { key: string; text: string }[]; solution: string }>;
  /** "Shishya-translated — cross-check the English." */
  note: string;
  /** "See in {lang}" */
  seeIn: string;
}

/** Challenge a friend (14 Sep 2026): this quiz IS a friend's challenge
 *  (/c/{token}). After the last question the player sees their score and
 *  chooses whether to send it to the challenger (graded again on the
 *  server); the result then leads with both scores side by side and offers
 *  the same questions to their own friends. Absent = the plain quiz, whose
 *  result offers the challenge card. */
export interface AnonQuizChallenge {
  token: string;
  creatorName: string | null;
  creatorCorrect: number;
}

export function AnonQuizPlayer({
  quiz,
  examWeek,
  cutoff,
  translation,
  challenge,
  labels,
  challengeLabels,
  locale,
  signInSlot,
  onFinish,
}: {
  quiz: AnonQuiz;
  examWeek?: AnonQuizExamWeek;
  cutoff?: AnonQuizCutoff;
  translation?: AnonQuizTranslationPack;
  challenge?: AnonQuizChallenge;
  labels: QuizLabels;
  challengeLabels: ChallengeLabels;
  /** Page language — stored on a challenge made from this result. */
  locale: string;
  /** Mock gate (25 Sep 2026): replaces the result screen's /login link to
   *  the exam hub — the signed-out /mocks/[id] and /build-mock pages pass a
   *  Google sign-in button that returns to the page the guest came from.
   *  Absent = the link, as before. */
  signInSlot?: ReactNode;
  /** Called once when the last answer is in, with the score — the gate's
   *  quiz-done beacon. Absent = nothing extra fires. */
  onFinish?: (score: number, total: number) => void;
}) {
  const QL = labels;
  const CL = challengeLabels;
  const qs = quiz.questions;
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [answers, setAnswers] = useState<{ key: string; correct: boolean }[]>([]);
  const [done, setDone] = useState(false);
  // Challenge mode: the "send my score?" step between the last question and
  // the result, and the server-graded comparison once the score is sent.
  const [askToSend, setAskToSend] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const [compare, setCompare] = useState<{ mine: number; theirs: number } | null>(null);
  // "See in English" — quiz-wide, instant, no fetch (the English source is
  // always in `quiz`; the translation pack is an overlay).
  const [englishMode, setEnglishMode] = useState(false);

  const q = qs[idx];
  const answered = picked !== null;

  /** What the student sees for a question: the cached translation unless
   *  they switched to English, else the English source. Options are
   *  matched by key so a translated row can never re-letter the answer. */
  function view(qq: AnonQuiz["questions"][number]) {
    const tr = translation?.byId[qq.id];
    if (!tr || englishMode) {
      return { body: qq.body, options: qq.options, solution: qq.solution, translated: false, hasTranslation: !!tr };
    }
    return {
      body: tr.body,
      options: qq.options.map((o) => ({ key: o.key, text: tr.options.find((x) => x.key === o.key)?.text ?? o.text })),
      solution: tr.solution,
      translated: true,
      hasTranslation: true,
    };
  }
  const qv = view(q);

  function choose(key: string) {
    if (answered) return;
    setPicked(key);
  }
  function next() {
    const correct = picked === q.answerKey;
    const nextAnswers = [...answers, { key: picked as string, correct }];
    setAnswers(nextAnswers);
    if (idx + 1 >= qs.length) {
      // A challenge first asks whether to send the score to the challenger.
      if (challenge) setAskToSend(true);
      else setDone(true);
      // Preserve the guest result across the signup wall (audit 18 Aug
      // 2026) — the CTA promises to "track your weak topics", so stash
      // score + the questions they missed. A post-signup recall on the
      // exam hub reads and clears this.
      try {
        const missed = qs
          .filter((_, i) => !nextAnswers[i]?.correct)
          .map((qq) => view(qq).body.slice(0, 200));
        localStorage.setItem(
          "shishya_anon_quiz",
          JSON.stringify({
            examCode: quiz.examCode,
            examShort: quiz.examShort,
            topicCode: quiz.topicCode,
            scopeLabel: quiz.scopeLabel,
            score: nextAnswers.filter((a) => a.correct).length,
            total: qs.length,
            missed,
            at: Date.now(),
          }),
        );
      } catch {
        /* localStorage may be unavailable (private mode) — non-fatal */
      }
      try {
        onFinish?.(nextAnswers.filter((a) => a.correct).length, qs.length);
      } catch {
        /* a caller's beacon must never block the result */
      }
      // Fire-and-forget completion signal so the funnel report sees it.
      try {
        navigator.sendBeacon?.(
          "/api/analytics",
          new Blob(
            [
              JSON.stringify({
                kind: "QUIZ_ATTEMPTED",
                path: typeof location !== "undefined" ? location.pathname : undefined,
                props: {
                  anon: true,
                  exam: quiz.examCode,
                  topic: quiz.topicCode,
                  score: nextAnswers.filter((a) => a.correct).length,
                  total: qs.length,
                  // 11 Sep 2026: split shared-set replays and cutoff-page
                  // arrivals from the plain hub quiz.
                  replay: quiz.replay,
                  fromCutoff: !!cutoff,
                  // 14 Sep 2026: a friend playing a challenge link.
                  challenge: !!challenge,
                },
              }),
            ],
            { type: "application/json" },
          ),
        );
      } catch {
        /* analytics is best-effort */
      }
    } else {
      setIdx(idx + 1);
      setPicked(null);
    }
  }

  async function sendScore() {
    if (!challenge) return;
    setSending(true);
    setSendErr(null);
    const choices = answers.map((a) => a.key);
    try {
      const res = await fetch(`/api/challenge/${challenge.token}/play`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ playerKey: challengePlayerKey(), choices, name: playerName }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || typeof j?.correct !== "number") {
        setSendErr(j?.self ? CL["challenge.send.self"] : CL["challenge.send.error"]);
        return;
      }
      const theirs = Number(j.creatorCorrect);
      rememberPlayedChallenge(challenge.token, { correct: j.correct, total: Number(j.total) || qs.length, creatorCorrect: theirs, choices });
      setCompare({ mine: j.correct, theirs });
      setDone(true);
    } catch {
      setSendErr(CL["challenge.send.errorNet"]);
    } finally {
      setSending(false);
    }
  }

  if (askToSend && !done && challenge) {
    const score = answers.filter((a) => a.correct).length;
    return (
      <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
          {fillTemplate(CL["challenge.send.kicker"], { n: qs.length })}
        </p>
        <p className="mt-1 text-4xl font-extrabold text-ink-900">
          {score}
          <span className="text-2xl text-ink-400">/{qs.length}</span>
        </p>
        <p className="mt-2 text-sm text-ink-700">
          {challenge.creatorName
            ? fillTemplate(CL["challenge.send.ask"], { name: challenge.creatorName })
            : CL["challenge.send.askFriend"]}
        </p>
        <p className="mt-1 text-xs text-ink-500">
          {playerName.trim() ? CL["challenge.send.noteName"] : CL["challenge.send.note"]}
        </p>
        <label htmlFor="challenge-player-name" className="mt-4 block text-xs font-medium text-ink-700">
          {CL["challenge.card.name"]}
        </label>
        <input
          id="challenge-player-name"
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          maxLength={24}
          autoComplete="given-name"
          className="mt-1 w-full rounded-lg border border-ink-300 bg-white px-3 py-2.5 text-sm text-ink-900 focus:border-saffron-400 focus:outline-none focus:ring-2 focus:ring-saffron-200 sm:max-w-xs"
        />
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={sendScore}
            disabled={sending}
            className="inline-flex flex-1 items-center justify-center rounded-lg bg-saffron-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-300 disabled:opacity-60"
          >
            {sending ? CL["challenge.send.sending"] : CL["challenge.send.send"]}
          </button>
          <button
            type="button"
            onClick={() => setDone(true)}
            disabled={sending}
            className="inline-flex flex-1 items-center justify-center rounded-lg border border-ink-300 bg-white px-5 py-3 text-sm font-semibold text-ink-800 transition-colors hover:bg-ink-50 disabled:opacity-60"
          >
            {CL["challenge.send.keep"]}
          </button>
        </div>
        {sendErr && <p className="mt-2 text-xs text-rose-700">{sendErr}</p>}
      </div>
    );
  }

  if (done) {
    const score = answers.filter((a) => a.correct).length;
    const pct = Math.round((score / qs.length) * 100);
    const loginHref = `/login?callbackUrl=${encodeURIComponent(`/exams/${quiz.examCode}`)}`;
    // Give the tutor the ACTUAL questions the student missed so it can
    // explain them, instead of a vague "the ones I got wrong" (audit
    // 18 Aug 2026).
    const missedBodies = qs.filter((_, i) => !answers[i]?.correct).map((qq) => `• ${view(qq).body}`);
    const tutorSeed =
      `I just took a quick ${quiz.scopeLabel} quiz for ${quiz.examShort} and scored ${score}/${qs.length}.` +
      (missedBodies.length
        ? ` Explain these questions I got wrong and how to approach them:\n${missedBodies.join("\n")}`
        : ` Give me the next things to study.`);
    const tutorHref = `/chat?examCode=${quiz.examCode}&seed=${encodeURIComponent(tutorSeed)}`;
    const good = pct >= 60;
    const verdict = fillTemplate(QL[good ? "quiz.strong" : "quiz.needsWork"], { scope: quiz.scopeLabel });
    const choices = answers.map((a) => a.key);
    return (
      <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
        {compare && challenge ? (
          <>
            <ChallengeScores mine={compare.mine} theirs={compare.theirs} total={qs.length} name={challenge.creatorName} labels={CL} />
            <p className="mt-3 text-sm text-ink-600">{verdict}</p>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">{QL["quiz.yourScore"]}</p>
            <p className="mt-1 text-4xl font-extrabold text-ink-900">
              {score}<span className="text-2xl text-ink-400">/{qs.length}</span>
            </p>
            <p className="mt-1 text-sm text-ink-600">{verdict}</p>
          </>
        )}

        {/* Cutoff-page arrivals: the rows they came from, right under the
            score. The figures keep their tier word and the cutoff page's
            disclaimer; the sample line says what this is and isn't. No
            verdict is computed — the bands are marks in free text and a
            10-question sample can't be mapped onto them honestly. */}
        {cutoff && (
          <div className="mt-5 rounded-lg border border-ink-200 bg-ink-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              {cutoff.heading} · <span className="normal-case text-ink-600">{cutoff.tier}</span>
            </p>
            <p className="mt-1 text-sm text-ink-800">{fillTemplate(QL["quiz.sample"], { pct, score, n: qs.length })}</p>
            <div className="mt-2 overflow-x-auto rounded-md border border-ink-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-200 bg-ink-50/60 text-left">
                    {cutoff.table[0].map((h, i) => (
                      <th key={i} className="px-3 py-1.5 font-semibold text-ink-800">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cutoff.table.slice(1).map((row, i) => (
                    <tr key={i} className="border-b border-ink-100 last:border-0">
                      {row.map((c, j) => (
                        <td key={j} className={`px-3 py-1.5 ${j === 0 ? "font-medium text-ink-900" : "tabular-nums text-ink-700"}`}>
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {cutoff.notes.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-ink-600">
                {cutoff.notes.map((n, i) => (
                  <li key={i}>{inlineMd(n)}</li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs font-medium text-ink-700">{fillTemplate(QL["quiz.sampleNote"], { n: qs.length })}</p>
            <p className="mt-1 text-xs text-ink-500">{cutoff.disclaimer}</p>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          {signInSlot ? (
            <div className="flex flex-1 flex-col">{signInSlot}</div>
          ) : (
            <Link
              href={loginHref}
              className="inline-flex flex-1 items-center justify-center rounded-lg bg-saffron-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-300"
            >
              {QL["quiz.signIn"]}
            </Link>
          )}
          <Link
            href={tutorHref}
            className="inline-flex flex-1 items-center justify-center rounded-lg border border-ink-300 bg-white px-5 py-3 text-sm font-semibold text-ink-800 transition-colors hover:bg-ink-50"
          >
            {QL["quiz.askTutor"]}
          </Link>
        </div>

        {/* Challenge a friend (14 Sep 2026): replaces the 11 Sep "same N
            questions" WhatsApp replay link, which gave a friend no score to
            beat and told the sharer nothing back (0 taps in 14 days). A
            friend who played a challenge gets the same card for their own
            friends — the chain. A topic with a small pool can serve fewer
            questions than a challenge needs; the card would only end in a
            refusal there. */}
        {qs.length >= CHALLENGE_MIN_QUESTIONS && (
          <ChallengeCard
            from={
              challenge
                ? { source: "challenge", parentToken: challenge.token, choices }
                : { source: quiz.topicCode ? "topic" : "quiz", questionIds: qs.map((qq) => qq.id), choices }
            }
            examCode={quiz.examCode}
            examShort={quiz.examShort}
            surface={challenge ? "challenge" : quiz.topicCode ? "topic-quiz" : "anon-quiz"}
            heading={fillTemplate(CL[challenge ? "challenge.card.headingChain" : "challenge.card.headingQuiz"], { n: qs.length })}
            labels={CL}
            locale={locale}
          />
        )}

        {/* Exam week: the guest is here because the exam is days away or
            just happened — one tap for the answer-key / result email. */}
        {examWeek && ALERT_PHASES.has(examWeek.phase) && (
          <div className="mt-4">
            <ExamAlertBox
              examCode={quiz.examCode}
              compact
              signedIn={examWeek.signedIn ?? false}
              labels={examWeek.labels}
              phase={examWeek.phase}
              weekLabels={examWeek.weekLabels}
              note={examWeek.note}
            />
          </div>
        )}

        {/* Low score + anonymous = peak discouragement; a human offer
            here retains aspirants the signup CTA alone would lose. */}
        {!good && (
          <p className="mt-3 text-sm text-ink-600">
            {QL["quiz.stuck"]}{" "}
            <TalkToTeacher
              surface="exam"
              examCode={quiz.examCode}
              variant="link"
              contextLabel={`Scored ${score}/${qs.length} on a ${quiz.examShort} ${quiz.scopeLabel} quiz — need guidance`}
              linkLabel={QL["quiz.expert"]}
            />
          </p>
        )}

        {/* Per-question recap */}
        <ul className="mt-6 space-y-1.5">
          {answers.map((a, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                  a.correct ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                }`}
              >
                {a.correct ? "✓" : "✕"}
              </span>
              <span className="text-ink-600">Q{i + 1}</span>
              <span className="line-clamp-1 text-ink-800">{view(qs[i]).body}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
          {fillTemplate(QL["quiz.questionOf"], { i: idx + 1, n: qs.length })}
        </p>
        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-600">
          {quizDifficultyLabel(QL, q.difficulty)}
        </span>
      </div>
      {/* progress bar */}
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
        <div
          className="h-full rounded-full bg-saffron-400 transition-all"
          style={{ width: `${((idx + (answered ? 1 : 0)) / qs.length) * 100}%` }}
        />
      </div>

      <p className="mt-4 text-base font-medium leading-relaxed text-ink-900">{qv.body}</p>
      {/* Honesty label beside every overlaid question, with English one
          tap away; in English mode the same line offers the way back. */}
      {translation && qv.hasTranslation && (
        <p className="mt-1 text-[11px] text-ink-500">
          {qv.translated ? (
            <>
              {translation.note}
              {" · "}
              <button
                type="button"
                onClick={() => setEnglishMode(true)}
                className="underline underline-offset-2 hover:text-ink-800"
              >
                {translation.seeIn.replace("{lang}", "English")}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setEnglishMode(false)}
              className="underline underline-offset-2 hover:text-ink-800"
            >
              {translation.seeIn.replace("{lang}", translation.localeName)}
            </button>
          )}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {qv.options.map((o) => {
          const isPicked = picked === o.key;
          const isAnswer = o.key === q.answerKey;
          let cls = "border-ink-200 bg-white hover:border-saffron-400";
          if (answered) {
            if (isAnswer) cls = "border-emerald-400 bg-emerald-50";
            else if (isPicked) cls = "border-rose-400 bg-rose-50";
            else cls = "border-ink-200 bg-white opacity-70";
          }
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => choose(o.key)}
              disabled={answered}
              className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-saffron-300 ${cls}`}
            >
              <span className="mt-0.5 font-semibold text-ink-500">{o.key}</span>
              <span className="text-ink-800">{o.text}</span>
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-4 rounded-lg bg-ink-50 p-3 text-sm text-ink-700">
          <p className="font-semibold text-ink-900">
            {picked === q.answerKey ? QL["quiz.correct"] : fillTemplate(QL["quiz.answer"], { key: q.answerKey })}
          </p>
          {qv.solution && <p className="mt-1 leading-relaxed">{qv.solution}</p>}
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={next}
          disabled={!answered}
          className="inline-flex items-center justify-center rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-ink-800 focus:outline-none focus:ring-2 focus:ring-ink-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {idx + 1 >= qs.length ? QL["quiz.seeScore"] : QL["quiz.next"]}
        </button>
      </div>
    </div>
  );
}
