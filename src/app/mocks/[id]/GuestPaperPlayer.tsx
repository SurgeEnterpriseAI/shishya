"use client";

// The whole paper for a guest (27 Sep 2026, founder: content first).
//
// Same questions, timer and palette as the signed-in player (MockPlayer), in
// exam mode, with no sign-in and no server state: progress is kept in this
// browser only (src/lib/guest-paper.ts store key) so a reload resumes, and
// submit posts the answers to POST /api/guest-paper/grade, which grades the
// served paper and only then sends the keys and solutions. The result shows
// here — score, topics weakest first, every question with its answer — and
// only then offers sign-in, to keep FUTURE results (this one is not saved,
// and the page says so).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MockTimer } from "@/components/mock-player/MockTimer";
import { QuestionLangSwitcher } from "@/components/QuestionLangSwitcher";
import type { Locale } from "@/lib/i18n";
import {
  guestPaperStoreKey,
  readGuestPaperState,
  remainingSec,
  type GuestAnswer,
  type GuestGradeResult,
  type GuestPaperState,
} from "@/lib/guest-paper";
import type { GuestPaperCopy } from "@/lib/guest-paper-copy";
import { formatDisplayScorePct } from "@/lib/scoring";

export interface GuestPaperQuestionView {
  id: string;
  type: string;
  difficulty: string;
  body: string;
  options: { key: string; text: string }[];
  topic: { code: string; name: string };
}

export interface GuestPaperLabels {
  qOf: string;
  mark: string;
  marked: string;
  prev: string;
  saveNext: string;
  reviewSubmit: string;
  submitMock: string;
  sumAnswered: string;
  sumMarked: string;
  sumLeft: string;
  confirmTitle: string;
  confirmBodyPrefix: string;
  confirmBodyOf: string;
  confirmKeep: string;
  confirmSubmit: string;
  confirmSubmitting: string;
  marksPerQ: string;
  negativeNone: string;
}

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m));

function beacon(cta: string, props: Record<string, unknown>) {
  try {
    navigator.sendBeacon?.(
      "/api/analytics",
      new Blob([JSON.stringify({ kind: "CTA_CLICKED", path: location.pathname, props: { cta, surface: "guest-paper", ...props } })], {
        type: "application/json",
      }),
    );
  } catch {
    /* analytics is best-effort */
  }
}

function readStore(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStore(key: string, value: string | null) {
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* a private window may refuse storage — the paper still works in memory */
  }
}

export function GuestPaperPlayer({
  mock,
  questions,
  labels,
  copy,
  initialLocale,
  signInHref,
}: {
  mock: { id: string; title: string; examCode: string; examShort: string; durationMin: number; marksPerQ: number; negativeMark: number };
  questions: GuestPaperQuestionView[];
  labels: GuestPaperLabels;
  copy: GuestPaperCopy;
  initialLocale: Locale;
  signInHref: string;
}) {
  const storeKey = guestPaperStoreKey(mock.id);
  const paperIds = useMemo(() => questions.map((q) => q.id), [questions]);

  const [ready, setReady] = useState(false);
  const [startedAt, setStartedAt] = useState<number>(0);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Map<string, GuestAnswer>>(new Map());
  const [expiredOnLoad, setExpiredOnLoad] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GuestGradeResult | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [locale, setLocale] = useState<Locale>("en");
  const [translations, setTranslations] = useState<Map<string, { body: string; options: { key: string; text: string }[] }>>(new Map());
  const [translating, setTranslating] = useState(false);
  const shownAt = useRef<number>(Date.now());
  const submittedRef = useRef(false);
  // One source of truth, updated synchronously by every tap (27 Sep 2026
  // headless check: an option tap followed at once by "Save & next" read a
  // stale copy of the answers and lost the first answer). The state copies
  // only drive the re-render.
  const answersRef = useRef<Map<string, GuestAnswer>>(new Map());
  const idxRef = useRef(0);
  const startedRef = useRef(0);

  // Resume from this device, or start the clock now.
  useEffect(() => {
    const now = Date.now();
    const saved = readGuestPaperState(readStore(storeKey), paperIds, now);
    if (saved) {
      const restored = new Map(saved.answers.map((a) => [a.questionId, a]));
      startedRef.current = saved.startedAt;
      answersRef.current = restored;
      idxRef.current = saved.idx;
      setStartedAt(saved.startedAt);
      setIdx(saved.idx);
      setAnswers(restored);
      if (remainingSec(saved.startedAt, mock.durationMin, now) <= 0) setExpiredOnLoad(true);
    } else {
      startedRef.current = now;
      setStartedAt(now);
      writeStore(storeKey, JSON.stringify({ v: 1, startedAt: now, idx: 0, answers: [] } satisfies GuestPaperState));
    }
    shownAt.current = now;
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Applies a change: refs first (the next tap reads them), then state, then this device's copy. */
  const commit = useCallback(
    (nextAnswers: Map<string, GuestAnswer>, nextIdx: number) => {
      answersRef.current = nextAnswers;
      idxRef.current = nextIdx;
      setAnswers(nextAnswers);
      setIdx(nextIdx);
      if (startedRef.current) {
        writeStore(storeKey, JSON.stringify({ v: 1, startedAt: startedRef.current, idx: nextIdx, answers: [...nextAnswers.values()] } satisfies GuestPaperState));
      }
    },
    [storeKey],
  );

  /** Adds the time spent on the current question since it was shown. */
  const withTimeOnCurrent = useCallback(
    (base: Map<string, GuestAnswer>): Map<string, GuestAnswer> => {
      const q = questions[idxRef.current];
      if (!q) return base;
      const secs = Math.max(0, Math.round((Date.now() - shownAt.current) / 1000));
      shownAt.current = Date.now();
      if (secs === 0) return base;
      const next = new Map(base);
      const cur = next.get(q.id) ?? { questionId: q.id, chosen: null, timeSec: 0, marked: false };
      next.set(q.id, { ...cur, timeSec: Math.min(86_400, cur.timeSec + secs) });
      return next;
    },
    [questions],
  );

  function goTo(nextIdx: number) {
    if (nextIdx < 0 || nextIdx >= questions.length) return;
    commit(withTimeOnCurrent(answersRef.current), nextIdx);
  }

  function choose(key: string) {
    const q = questions[idxRef.current];
    const next = new Map(answersRef.current);
    const cur = next.get(q.id) ?? { questionId: q.id, chosen: null, timeSec: 0, marked: false };
    next.set(q.id, { ...cur, chosen: cur.chosen === key ? null : key });
    commit(next, idxRef.current);
  }

  function toggleMark() {
    const q = questions[idxRef.current];
    const next = new Map(answersRef.current);
    const cur = next.get(q.id) ?? { questionId: q.id, chosen: null, timeSec: 0, marked: false };
    next.set(q.id, { ...cur, marked: !cur.marked });
    commit(next, idxRef.current);
  }

  const grade = useCallback(
    async (auto: boolean, from?: Map<string, GuestAnswer>) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      setError(null);
      const finalAnswers = withTimeOnCurrent(from ?? answersRef.current);
      const list = [...finalAnswers.values()];
      try {
        const res = await fetch("/api/guest-paper/grade", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mockId: mock.id, answers: list }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as GuestGradeResult;
        setResult(data);
        writeStore(storeKey, null);
        beacon("guest-paper-submit", {
          examCode: mock.examCode,
          total: questions.length,
          answered: list.filter((a) => a.chosen != null).length,
          auto,
        });
        window.scrollTo({ top: 0 });
      } catch {
        submittedRef.current = false;
        setError(copy.gradeFailed);
      } finally {
        setSubmitting(false);
        setConfirmOpen(false);
      }
    },
    [copy.gradeFailed, mock.examCode, mock.id, questions.length, storeKey, withTimeOnCurrent],
  );

  function startAgain() {
    const now = Date.now();
    writeStore(storeKey, JSON.stringify({ v: 1, startedAt: now, idx: 0, answers: [] } satisfies GuestPaperState));
    startedRef.current = now;
    answersRef.current = new Map();
    idxRef.current = 0;
    setStartedAt(now);
    setIdx(0);
    setAnswers(new Map());
    setExpiredOnLoad(false);
    submittedRef.current = false;
    shownAt.current = now;
  }

  // Question language: the public translate route (body and options only).
  const ensureTranslations = useCallback(
    async (target: Locale, around: number) => {
      if (target === "en") return;
      const ids = paperIds.slice(around, around + 10).filter((id) => !translations.has(id));
      if (ids.length === 0) return;
      setTranslating(true);
      try {
        const res = await fetch(`/api/mocks/${mock.id}/translate`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ locale: target, questionIds: ids }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { questions?: { id: string; body: string; options: { key: string; text: string }[] }[] };
        setTranslations((prev) => {
          const next = new Map(prev);
          for (const t of data.questions ?? []) next.set(t.id, { body: t.body, options: t.options });
          return next;
        });
      } catch {
        /* the English question stays on screen */
      } finally {
        setTranslating(false);
      }
    },
    [mock.id, paperIds, translations],
  );
  useEffect(() => {
    if (locale !== "en") void ensureTranslations(locale, idx);
  }, [locale, idx, ensureTranslations]);

  if (!ready) return <main className="min-h-screen bg-ink-50/60" />;

  // ── Result ──────────────────────────────────────────────────────────
  if (result) {
    const reviewList = showAll ? result.questions : result.questions.slice(0, 20);
    return (
      <main className="min-h-screen bg-ink-50/60">
        <section className="container-prose py-8">
          <p className="text-xs text-ink-500">
            <Link href={`/exams/${mock.examCode}`} className="hover:text-ink-800">{fill(copy.backToExam, { exam: mock.examShort })}</Link>
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink-900">{mock.title}</h1>

          <div className="mt-5 rounded-xl border border-ink-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">{copy.scoreTitle}</p>
            <p className="mt-1 text-4xl font-bold text-ink-900">
              {Math.round(result.scoreRaw * 100) / 100} <span className="text-lg font-medium text-ink-500">/ {result.scoreMax} · {formatDisplayScorePct(result.scorePct)}</span>
            </p>
            <p className="mt-2 text-sm text-ink-700">
              <span className="font-semibold text-emerald-700">{result.correct} {copy.correct}</span> ·{" "}
              <span className="font-semibold text-rose-700">{result.wrong} {copy.wrong}</span> · {result.skipped} {copy.skipped}
            </p>
            {result.negativeMark > 0 && <p className="mt-1 text-xs text-ink-500">{fill(copy.negativeNote, { neg: result.negativeMark })}</p>}
            <div className="mt-4 rounded-lg border border-saffron-200 bg-saffron-50/70 p-3">
              <p className="text-xs text-ink-600">{copy.notSaved}</p>
              <Link
                href={signInHref}
                onClick={() => beacon("guest-paper-signin-click", { examCode: mock.examCode })}
                className="mt-2 inline-block rounded-md bg-saffron-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-saffron-600"
              >
                {copy.signIn}
              </Link>
              <p className="mt-1.5 text-[11px] text-ink-500">{copy.signInNote}</p>
            </div>
          </div>

          {result.topics.length > 0 && (
            <div className="mt-6 rounded-xl border border-ink-200 bg-white p-5">
              <h2 className="text-base font-semibold text-ink-900">{copy.topicsTitle}</h2>
              <ul className="mt-3 divide-y divide-ink-100">
                {result.topics.map((t) => (
                  <li key={t.code} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <span className="text-ink-800">{t.name}</span>
                    <span className="flex items-center gap-3">
                      <span className="tabular-nums text-ink-600">{t.correct}/{t.total}</span>
                      <Link
                        href={`/chat?examCode=${encodeURIComponent(mock.examCode)}&topicCode=${encodeURIComponent(t.code)}&seed=${encodeURIComponent(`I got ${t.correct} of ${t.total} right on ${t.name} in a ${mock.examShort} mock. Explain the key ideas of this topic and give me one practice question.`)}`}
                        className="text-xs font-medium text-saffron-700 hover:underline"
                      >
                        {copy.practiseTopic} →
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6">
            <h2 className="text-base font-semibold text-ink-900">{copy.reviewTitle}</h2>
            <ol className="mt-3 space-y-4">
              {reviewList.map((q, i) => {
                const keys = q.answerKey.toUpperCase().split(",").map((k) => k.trim());
                return (
                  <li key={q.id} className="rounded-xl border border-ink-200 bg-white p-4">
                    <p className="text-xs font-medium text-ink-500">
                      Q {i + 1} · {q.topic.name} · {q.chosen == null ? copy.notAnswered : q.correct ? `✓ ${copy.correct}` : `✗ ${copy.wrong}`}
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-900">{q.body}</p>
                    <ul className="mt-3 space-y-1.5">
                      {q.options.map((o) => {
                        const isKey = keys.includes(o.key.toUpperCase());
                        const isChosen = q.chosen === o.key;
                        const cls = isKey
                          ? "border-emerald-400 bg-emerald-50"
                          : isChosen
                            ? "border-rose-300 bg-rose-50"
                            : "border-ink-200 bg-white";
                        return (
                          <li key={o.key} className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${cls}`}>
                            <span className="font-semibold text-ink-700">{o.key}</span>
                            <span className="text-ink-800">{o.text}</span>
                            {isKey && <span className="ml-auto shrink-0 text-xs font-semibold text-emerald-700">{copy.rightAnswer}</span>}
                            {isChosen && !isKey && <span className="ml-auto shrink-0 text-xs font-semibold text-rose-700">{copy.yourAnswer}</span>}
                          </li>
                        );
                      })}
                    </ul>
                    {q.solution && (
                      <details className="mt-3 text-sm">
                        <summary className="cursor-pointer font-medium text-ink-700">{copy.explanation}</summary>
                        <p className="mt-2 whitespace-pre-line text-ink-700">{q.solution}</p>
                      </details>
                    )}
                    <Link
                      href={`/chat?examCode=${encodeURIComponent(mock.examCode)}&topicCode=${encodeURIComponent(q.topic.code)}&seed=${encodeURIComponent(`Explain this ${mock.examShort} question step by step: ${q.body.slice(0, 400)}`)}`}
                      className="mt-2 inline-block text-xs font-medium text-saffron-700 hover:underline"
                    >
                      {copy.askTutor}
                    </Link>
                  </li>
                );
              })}
            </ol>
            {!showAll && result.questions.length > reviewList.length && (
              <button type="button" onClick={() => setShowAll(true)} className="btn-secondary mt-4 !py-2 !px-4 text-sm">
                {fill(copy.showAll, { n: result.questions.length })}
              </button>
            )}
          </div>
        </section>
      </main>
    );
  }

  // ── Time ran out while the tab was closed ───────────────────────────
  if (expiredOnLoad) {
    const answered = [...answers.values()].filter((a) => a.chosen != null).length;
    return (
      <main className="min-h-screen bg-ink-50/60">
        <section className="container-prose max-w-xl py-12">
          <h1 className="text-xl font-bold text-ink-900">{copy.timeUpTitle}</h1>
          <p className="mt-2 text-sm text-ink-700">{fill(copy.timeUpBody, { n: answered, total: questions.length })}</p>
          {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" disabled={submitting} onClick={() => void grade(true)} className="btn-primary !py-2 !px-4 text-sm">
              {submitting ? labels.confirmSubmitting : copy.seeScore}
            </button>
            <button type="button" onClick={startAgain} className="btn-secondary !py-2 !px-4 text-sm">
              {copy.startAgain}
            </button>
          </div>
        </section>
      </main>
    );
  }

  // ── The paper ───────────────────────────────────────────────────────
  const q = questions[idx];
  const mine = answers.get(q.id);
  const tr = locale !== "en" ? translations.get(q.id) : undefined;
  const body = tr?.body ?? q.body;
  const options = tr && tr.options.length === q.options.length ? tr.options : q.options;
  const answeredCount = [...answers.values()].filter((a) => a.chosen != null).length;
  const markedCount = [...answers.values()].filter((a) => a.marked).length;

  return (
    <main className="min-h-screen bg-ink-50/60">
      {submitting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white/80 backdrop-blur-sm" role="status" aria-live="polite">
          <span className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-saffron-200 border-t-saffron-500" />
          <p className="text-base font-semibold text-ink-900">{labels.confirmSubmitting}</p>
        </div>
      )}

      <header className="sticky top-0 z-10 border-b border-ink-200 bg-white">
        <div className="container-prose flex h-14 items-center justify-between gap-3">
          <Link href={`/exams/${mock.examCode}`} className="flex items-center gap-2 text-sm">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-saffron-500 font-sans text-xs font-bold text-white">शि</span>
            <span className="hidden font-semibold text-ink-900 sm:inline">{mock.examShort}</span>
          </Link>
          <p className="hidden truncate text-sm font-medium text-ink-700 md:block">{mock.title}</p>
          {startedAt > 0 && (
            <MockTimer startedAt={new Date(startedAt).toISOString()} durationMin={mock.durationMin} onTimeUp={() => void grade(true)} />
          )}
        </div>
        {error && (
          <div className="border-t border-rose-200 bg-rose-50">
            <div className="container-prose flex flex-wrap items-center justify-between gap-2 py-2">
              <p role="alert" className="text-xs text-rose-800">{error}</p>
              <button type="button" onClick={() => void grade(false)} className="btn-secondary !py-1.5 !px-3 text-xs">
                {copy.retry}
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="container-prose grid grid-cols-1 gap-6 py-6 lg:grid-cols-[1fr_280px]">
        <article className="rounded-md border border-ink-200 bg-white p-6">
          {idx === 0 && answeredCount === 0 && (
            <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">{copy.guestLine}</p>
          )}
          {locale === "en" && (initialLocale === "hi" || initialLocale === "te") && (
            <button
              type="button"
              onClick={() => setLocale(initialLocale)}
              className="mb-3 rounded-md bg-sky-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-sky-700"
            >
              {initialLocale === "hi" ? "यह पेपर हिंदी में पढ़ें" : "ఈ పేపర్‌ను తెలుగులో చదవండి"}
            </button>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-ink-500">
              Q {idx + 1} {labels.qOf} {questions.length} · {q.topic.name} · {q.difficulty}
            </p>
            <div className="flex items-center gap-2">
              <QuestionLangSwitcher current={locale} onChange={(l) => setLocale(l)} pending={translating} label="Translate this question" persist={false} />
              <button
                type="button"
                onClick={toggleMark}
                className={
                  mine?.marked
                    ? "rounded-md bg-amber-500 px-2.5 py-1 text-xs font-medium text-white"
                    : "rounded-md border border-ink-300 px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-ink-50"
                }
              >
                {mine?.marked ? labels.marked : labels.mark}
              </button>
            </div>
          </div>

          <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-ink-900">{body}</p>

          <ul className="mt-6 space-y-2">
            {options.map((opt) => {
              const selected = mine?.chosen === opt.key;
              return (
                <li key={opt.key}>
                  <button
                    type="button"
                    onClick={() => choose(opt.key)}
                    className={
                      selected
                        ? "flex w-full items-start gap-3 rounded-md border-2 border-saffron-500 bg-saffron-50 px-4 py-3 text-left"
                        : "flex w-full items-start gap-3 rounded-md border border-ink-300 bg-white px-4 py-3 text-left hover:bg-ink-50"
                    }
                  >
                    <span className="font-semibold text-ink-700">{opt.key}</span>
                    <span className="text-ink-900">{opt.text}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button type="button" onClick={() => goTo(idx - 1)} disabled={idx === 0} className="btn-secondary !py-2 !px-4 text-sm disabled:opacity-40">
              {labels.prev}
            </button>
            {idx < questions.length - 1 ? (
              <button type="button" onClick={() => goTo(idx + 1)} className="btn-primary !py-2 !px-4 text-sm">
                {labels.saveNext}
              </button>
            ) : (
              <button type="button" onClick={() => setConfirmOpen(true)} className="btn-primary !py-2 !px-4 text-sm">
                {labels.reviewSubmit}
              </button>
            )}
          </div>
          <p className="mt-4 text-[11px] text-ink-500">
            +{mock.marksPerQ} {labels.marksPerQ} · {mock.negativeMark > 0 ? `−${mock.negativeMark}` : labels.negativeNone}
          </p>
        </article>

        <aside className="rounded-md border border-ink-200 bg-white p-4">
          <p className="text-xs text-ink-600">
            {answeredCount} {labels.sumAnswered} · {markedCount} {labels.sumMarked} · {questions.length - answeredCount} {labels.sumLeft}
          </p>
          <div className="mt-3 grid grid-cols-8 gap-1.5 lg:grid-cols-6">
            {questions.map((qq, i) => {
              const a = answers.get(qq.id);
              const cls = i === idx
                ? "ring-2 ring-saffron-500"
                : "";
              const bg = a?.marked ? "bg-amber-400 text-white" : a?.chosen != null ? "bg-saffron-500 text-white" : "bg-ink-100 text-ink-700";
              return (
                <button key={qq.id} type="button" onClick={() => goTo(i)} className={`h-8 rounded text-xs font-semibold ${bg} ${cls}`}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => setConfirmOpen(true)} className="btn-primary mt-4 w-full !py-2 text-sm">
            {labels.submitMock}
          </button>
        </aside>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink-900/40 p-4 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold text-ink-900">{labels.confirmTitle}</h2>
            <p className="mt-2 text-sm text-ink-700">
              {labels.confirmBodyPrefix} {answeredCount} {labels.confirmBodyOf} {questions.length}.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmOpen(false)} className="btn-secondary !py-2 !px-4 text-sm">
                {labels.confirmKeep}
              </button>
              <button type="button" onClick={() => void grade(false)} disabled={submitting} className="btn-primary !py-2 !px-4 text-sm">
                {labels.confirmSubmit}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
