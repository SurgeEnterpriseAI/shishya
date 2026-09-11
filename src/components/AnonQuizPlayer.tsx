"use client";

// Growth lever #2 — the anonymous "taste" quiz UI.
//
// Plays a short MCQ set with instant client-side grading and solution
// reveal (no login, no persistence), then converts on the results screen:
// sign in to save + take full mocks, or discuss the ones you missed with
// the free AI tutor. Deliberately frictionless — the whole point is that a
// signed-out visitor experiences the product before hitting any gate.

import { useState } from "react";
import Link from "next/link";
import type { AnonQuiz } from "@/lib/anon-quiz";
import type { ExamWeekPhase } from "@/lib/exam-week";
import { TalkToTeacher } from "@/components/TalkToTeacher";
import { ExamAlertBox, type ExamAlertLabels, type ExamAlertWeekLabels } from "@/components/ExamAlertBox";
import { inlineMd } from "@/components/NotesMarkdown";

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

// First-party analytics beacon (same shape as ShareExamButton) — the
// WhatsApp share is counted as CTA_CLICKED cta 'share', surface 'anon-quiz'.
function beacon(props: Record<string, unknown>) {
  try {
    navigator.sendBeacon?.(
      "/api/analytics",
      new Blob(
        [
          JSON.stringify({
            kind: "CTA_CLICKED",
            path: typeof location !== "undefined" ? location.pathname : "/",
            props,
          }),
        ],
        { type: "application/json" },
      ),
    );
  } catch {
    /* analytics is best-effort */
  }
}

export function AnonQuizPlayer({
  quiz,
  examWeek,
  cutoff,
}: {
  quiz: AnonQuiz;
  examWeek?: AnonQuizExamWeek;
  cutoff?: AnonQuizCutoff;
}) {
  const qs = quiz.questions;
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [answers, setAnswers] = useState<{ key: string; correct: boolean }[]>([]);
  const [done, setDone] = useState(false);

  const q = qs[idx];
  const answered = picked !== null;

  function choose(key: string) {
    if (answered) return;
    setPicked(key);
  }
  function next() {
    const correct = picked === q.answerKey;
    const nextAnswers = [...answers, { key: picked as string, correct }];
    setAnswers(nextAnswers);
    if (idx + 1 >= qs.length) {
      setDone(true);
      // Preserve the guest result across the signup wall (audit 18 Aug
      // 2026) — the CTA promises to "track your weak topics", so stash
      // score + the questions they missed. A post-signup recall on the
      // exam hub reads and clears this.
      try {
        const missed = qs
          .filter((_, i) => !nextAnswers[i]?.correct)
          .map((qq) => qq.body.slice(0, 200));
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

  if (done) {
    const score = answers.filter((a) => a.correct).length;
    const pct = Math.round((score / qs.length) * 100);
    const loginHref = `/login?callbackUrl=${encodeURIComponent(`/exams/${quiz.examCode}`)}`;
    // Give the tutor the ACTUAL questions the student missed so it can
    // explain them, instead of a vague "the ones I got wrong" (audit
    // 18 Aug 2026).
    const missedBodies = qs.filter((_, i) => !answers[i]?.correct).map((qq) => `• ${qq.body}`);
    const tutorSeed =
      `I just took a quick ${quiz.scopeLabel} quiz for ${quiz.examShort} and scored ${score}/${qs.length}.` +
      (missedBodies.length
        ? ` Explain these questions I got wrong and how to approach them:\n${missedBodies.join("\n")}`
        : ` Give me the next things to study.`);
    const tutorHref = `/chat?examCode=${quiz.examCode}&seed=${encodeURIComponent(tutorSeed)}`;
    const good = pct >= 60;
    // "Same N questions" challenge (11 Sep 2026): a replay link to THESE
    // questions in THIS order (?set=), built here rather than via
    // src/lib/share-url.ts (in flight elsewhere). The path is the page
    // the student is on (exam or topic quiz, /hi and /te twins included),
    // so a shared topic quiz lands back on the topic quiz. No counters,
    // no urgency — just the score and the link.
    const origin = typeof location !== "undefined" ? location.origin : "https://shishya.in";
    const pathnameNow =
      typeof location !== "undefined" ? location.pathname : `/exams/${quiz.examCode}/quiz`;
    const shareUrl =
      `${origin}${pathnameNow}?set=${qs.map((qq) => qq.id).join(",")}` +
      `&utm_source=whatsapp&utm_medium=share&utm_campaign=anon-quiz&utm_content=${encodeURIComponent(quiz.examCode)}`;
    const shareText = `I got ${score}/${qs.length} on these ${quiz.examShort} questions — try the same ${qs.length}:\n${shareUrl}`;
    const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    return (
      <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">Your score</p>
        <p className="mt-1 text-4xl font-extrabold text-ink-900">
          {score}<span className="text-2xl text-ink-400">/{qs.length}</span>
        </p>
        <p className="mt-1 text-sm text-ink-600">
          {good
            ? `Strong start on ${quiz.scopeLabel} — now go deeper.`
            : `${quiz.scopeLabel} needs some work — that's exactly what Shishya's built for.`}
        </p>

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
            <p className="mt-1 text-sm text-ink-800">
              Your sample score: <span className="font-semibold">{pct}%</span> ({score}/{qs.length}).
            </p>
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
            <p className="mt-2 text-xs font-medium text-ink-700">
              This is a {qs.length}-question sample scored against last cycle&apos;s cutoff bands — not a prediction.
            </p>
            <p className="mt-1 text-xs text-ink-500">{cutoff.disclaimer}</p>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link
            href={loginHref}
            className="inline-flex flex-1 items-center justify-center rounded-lg bg-saffron-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-300"
          >
            Sign in free — take the full mock &amp; track your weak topics →
          </Link>
          <Link
            href={tutorHref}
            className="inline-flex flex-1 items-center justify-center rounded-lg border border-ink-300 bg-white px-5 py-3 text-sm font-semibold text-ink-800 transition-colors hover:bg-ink-50"
          >
            Ask Shishya to explain these
          </Link>
        </div>

        {/* Same-questions challenge: one tap to a WhatsApp group with the
            score and a replay link. Indian aspirants organise prep in
            WhatsApp groups; a peer opening the same 5 is the cheapest
            honest growth loop this page has. */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-ink-600">Challenge a friend with the same {qs.length}:</span>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => beacon({ cta: "share", surface: "anon-quiz", via: "whatsapp", exam: quiz.examCode, score, total: qs.length })}
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            WhatsApp
          </a>
        </div>

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
            Feeling stuck?{" "}
            <TalkToTeacher
              surface="exam"
              examCode={quiz.examCode}
              variant="link"
              contextLabel={`Scored ${score}/${qs.length} on a ${quiz.examShort} ${quiz.scopeLabel} quiz — need guidance`}
              linkLabel="Talk to a real subject expert — free"
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
              <span className="line-clamp-1 text-ink-800">{qs[i].body}</span>
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
          Question {idx + 1} of {qs.length}
        </p>
        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-600">
          {q.difficulty}
        </span>
      </div>
      {/* progress bar */}
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
        <div
          className="h-full rounded-full bg-saffron-400 transition-all"
          style={{ width: `${((idx + (answered ? 1 : 0)) / qs.length) * 100}%` }}
        />
      </div>

      <p className="mt-4 text-base font-medium leading-relaxed text-ink-900">{q.body}</p>

      <div className="mt-4 flex flex-col gap-2">
        {q.options.map((o) => {
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
            {picked === q.answerKey ? "Correct ✓" : `Answer: ${q.answerKey}`}
          </p>
          {q.solution && <p className="mt-1 leading-relaxed">{q.solution}</p>}
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={next}
          disabled={!answered}
          className="inline-flex items-center justify-center rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-ink-800 focus:outline-none focus:ring-2 focus:ring-ink-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {idx + 1 >= qs.length ? "See my score →" : "Next question →"}
        </button>
      </div>
    </div>
  );
}
