"use client";

// Mock player — the actual exam-taking UI.
//
// Features:
//  - Per-Q timer (total, with auto-submit when time runs out)
//  - Question palette (numbered grid) with status colours
//  - Mark-for-review toggle
//  - Autosave each answer to /api/attempts/:id/answer
//  - Submit confirmation + redirect to results

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiPost } from "@/lib/api";
import { QuestionLangSwitcher } from "@/components/QuestionLangSwitcher";
import type { Locale } from "@/lib/i18n";

interface QuestionVm {
  id: string;
  type: string;
  difficulty: string;
  body: string;
  options: { key: string; text: string }[];
  topic: { code: string; name: string };
  language: string;
}

interface MockMeta {
  id: string;
  title: string;
  rationale: string | null;
  examCode: string;
  examShort: string;
  durationMin: number;
  marksPerQ: number;
  negativeMark: number;
}

interface PlayerLabels {
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
  confirmBodyNote: string;
  confirmKeep: string;
  confirmSubmit: string;
  confirmSubmitting: string;
  submittingHint: string;
  marksPerQ: string;
  negativeNone: string;
}

interface AnswerLocal {
  questionId: string;
  chosen: string | null;
  timeSec: number;
  marked: boolean;
}

interface RevealFeedback {
  correct: boolean;
  answerKey: string;
  solution: string;
  topicName: string | null;
}

export function MockPlayer({
  mock,
  attemptId,
  startedAt,
  questions,
  existingAnswers,
  labels,
  initialLocale = "en",
  practice = false,
}: {
  mock: MockMeta;
  attemptId: string;
  startedAt: string;
  questions: QuestionVm[];
  existingAnswers: AnswerLocal[];
  labels: PlayerLabels;
  initialLocale?: Locale;
  /** Practice mocks (TOPIC/SUBJECT/REVISION/ADAPTIVE, never live tests)
   *  get opt-out instant per-question feedback — student-requested. */
  practice?: boolean;
}) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Instant feedback (practice mocks only) ──────────────────────────
  // After the student commits an answer, the server reveals
  // correct/wrong + solution + topic, and the choice locks (no
  // change-after-reveal score inflation). Weak areas accumulate into a
  // running tally. Toggleable — some students want exam-style silence.
  const [instantOn, setInstantOn] = useState(true);
  const [feedback, setFeedback] = useState<Map<string, RevealFeedback>>(new Map());
  async function revealNow(questionId: string, chosen: string) {
    try {
      const res = await fetch(`/api/attempts/${attemptId}/reveal`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId, chosen }),
      });
      if (!res.ok) return;
      const fb = (await res.json()) as RevealFeedback;
      setFeedback((prev) => new Map(prev).set(questionId, fb));
    } catch {
      /* feedback is best-effort — the mock itself is unaffected */
    }
  }
  const weakTally = (() => {
    const m = new Map<string, number>();
    for (const fb of feedback.values()) {
      if (!fb.correct && fb.topicName) m.set(fb.topicName, (m.get(fb.topicName) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  })();

  // ── On-demand question translation ────────────────────────────────────
  // The questions prop holds the source (usually English). When the
  // student picks another language, we ask the server for a translated
  // copy and overlay the body/options. Cached on the server per
  // (questionId, locale), so a different student picking the same
  // language a second time gets it instantly.
  //
  // We ALWAYS start at English regardless of the site UI cookie
  // (initialLocale). The per-question picker is intentionally
  // decoupled from the global header LangSwitcher — students often
  // want the SITE in Hindi but the question in English (or vice
  // versa) for practice in their target language. They opt in to
  // question translation via this picker explicitly per mock.
  void initialLocale;
  const [locale, setLocale] = useState<Locale>("en");
  const [translations, setTranslations] = useState<Map<string, { body: string; options: { key: string; text: string }[] }>>(new Map());
  const [translating, setTranslating] = useState(false);
  const [translateErr, setTranslateErr] = useState<string | null>(null);

  // Translate a specific batch of question IDs. The server caps uncached
  // translations at 8 per request (PER_REQUEST_MISS_CAP), so sending more
  // IDs just means more of them come back from cache. Initial window is
  // 8 to match the miss cap — student sees their current screen
  // translated as fast as possible, then we top-up around them as they
  // navigate via ensureTranslationsAround().
  async function fetchTranslationBatch(target: Locale, ids: string[]) {
    if (target === "en" || ids.length === 0) return;
    const res = await apiPost<{
      locale: Locale;
      questions: { id: string; body: string; options: { key: string; text: string }[]; solution: string }[];
    }>(`/api/mocks/${mock.id}/translate`, { locale: target, questionIds: ids });
    setTranslations((prev) => {
      const next = new Map(prev);
      for (const t of res.questions) {
        next.set(t.id, { body: t.body, options: t.options });
      }
      return next;
    });
  }

  // Initial translation entry point: fetch a window around the student's
  // current question (current + next 19) so the first thing they see is
  // translated almost instantly even on a 100-question mock. Subsequent
  // navigations top up via ensureTranslationsAround().
  async function fetchTranslations(target: Locale) {
    if (target === "en") {
      setTranslations(new Map());
      return;
    }
    setTranslating(true);
    setTranslateErr(null);
    try {
      const ids = questions.slice(idx, idx + 8).map((q) => q.id);
      await fetchTranslationBatch(target, ids);
    } catch (e: any) {
      setTranslateErr(e?.message ?? "Translation failed; showing original.");
    } finally {
      setTranslating(false);
    }
  }

  // Top-up: ensure questions around `centerIdx` are translated. Called
  // when the student navigates. No-op if already cached client-side.
  async function ensureTranslationsAround(target: Locale, centerIdx: number) {
    if (target === "en") return;
    const window = questions.slice(centerIdx, centerIdx + 8);
    const missing = window
      .filter((q) => !translations.has(q.id))
      .map((q) => q.id);
    if (missing.length === 0) return;
    setTranslating(true);
    try {
      await fetchTranslationBatch(target, missing);
    } catch {
      /* keep going; the next nav will retry */
    } finally {
      setTranslating(false);
    }
  }

  async function changeLocale(next: Locale) {
    if (next === locale) return;
    setLocale(next);
    // Wipe stale translations from the previous locale BEFORE fetching
    // the new ones. If we didn't, a Hindi → Telugu switch where the
    // Telugu fetch fails (rate limit, malformed JSON) would silently
    // leave the user staring at Hindi text under a Telugu dropdown.
    // Also clear any prior error so the new attempt gets a clean banner.
    setTranslations(new Map());
    setTranslateErr(null);
    // Per-question translation is intentionally NOT persisted to the
    // shishya-lang cookie. That cookie controls the SITE UI language
    // (top-right LangSwitcher on the dashboard / exam pages). The
    // mock's question picker only affects the current mock's question
    // bodies / options / solution — students can take a mock in Hindi
    // while keeping the dashboard in English.
    if (next === "en") return; // English = identity; nothing to fetch.
    await fetchTranslations(next);
  }

  // No auto-translate on mount — locale always starts at "en" and the
  // student opts in explicitly via the per-question picker.

  // ── State for answers, keyed by questionId
  const seedMap = useMemo(() => {
    const m = new Map<string, AnswerLocal>();
    for (const a of existingAnswers) m.set(a.questionId, { ...a });
    for (const q of questions) {
      if (!m.has(q.id)) m.set(q.id, { questionId: q.id, chosen: null, timeSec: 0, marked: false });
    }
    return m;
  }, [existingAnswers, questions]);
  const [answers, setAnswers] = useState<Map<string, AnswerLocal>>(seedMap);

  // ── Timer
  const totalSec = mock.durationMin * 60;
  const startMs = new Date(startedAt).getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsedSec = Math.floor((now - startMs) / 1000);
  const remainingSec = Math.max(0, totalSec - elapsedSec);
  const timeUp = remainingSec === 0;

  // ── Per-question timing — track time spent on the current Q
  const lastSwitchRef = useRef<number>(now);
  useEffect(() => {
    lastSwitchRef.current = Date.now();
  }, [idx]);

  // ── Save current answer to backend (debounced via dirty flag).
  //
  // BUG FIX (May 2026): we used to read `answers` directly inside
  // flushSaves. React state updates are async + batched, so the closure
  // captured by setTimeout pointed to the answers map from BEFORE the
  // click. The save then sent the pre-click value (chosen: null), and
  // submit later scored that question as skipped — even though the UI
  // showed it as answered. Students saw "I clicked all options but it
  // says 5 skipped". The fix is to read via a ref that we keep in sync
  // with state on every render, so flushSaves always sees the latest map.
  const dirtyRef = useRef<Set<string>>(new Set());
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  function scheduleSave(qid: string) {
    dirtyRef.current.add(qid);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(flushSaves, 700);
  }
  async function flushSaves() {
    const ids = [...dirtyRef.current];
    dirtyRef.current.clear();
    for (const qid of ids) {
      const a = answersRef.current.get(qid);
      if (!a) continue;
      try {
        await apiPost(`/api/attempts/${attemptId}/answer`, {
          questionId: a.questionId,
          chosen: a.chosen,
          timeSec: a.timeSec,
          marked: a.marked,
        });
      } catch {
        /* keep going; visual indicator could be added */
      }
    }
  }

  function trackTimeOnSwitch(fromIdx: number) {
    const fromQ = questions[fromIdx];
    if (!fromQ) return;
    const elapsedOnQ = Math.max(0, Math.floor((Date.now() - lastSwitchRef.current) / 1000));
    if (elapsedOnQ === 0) return;
    setAnswers((prev) => {
      const next = new Map(prev);
      const a = next.get(fromQ.id) ?? { questionId: fromQ.id, chosen: null, timeSec: 0, marked: false };
      next.set(fromQ.id, { ...a, timeSec: a.timeSec + elapsedOnQ });
      return next;
    });
    scheduleSave(fromQ.id);
  }

  function jumpTo(newIdx: number) {
    if (newIdx < 0 || newIdx >= questions.length || newIdx === idx) return;
    trackTimeOnSwitch(idx);
    setIdx(newIdx);
    // Lazy-translate a window around the new index so the next 20
    // questions are pre-warmed by the time the student gets to them.
    // No-op when the cache already has those IDs, so this is cheap.
    if (locale !== "en") {
      void ensureTranslationsAround(locale, newIdx);
    }
  }

  function chooseOption(key: string) {
    const q = questions[idx];
    // Once instant feedback has revealed the answer, the choice is
    // locked — changing after seeing the key would inflate the score.
    if (feedback.has(q.id)) return;
    // Toggle off if same key tapped again (allow clearing). Computed
    // OUTSIDE the updater so the reveal call sees a deterministic value.
    const newChosen = (answers.get(q.id)?.chosen ?? null) === key ? null : key;
    setAnswers((prev) => {
      const next = new Map(prev);
      const a = next.get(q.id) ?? { questionId: q.id, chosen: null, timeSec: 0, marked: false };
      next.set(q.id, { ...a, chosen: newChosen });
      return next;
    });
    scheduleSave(q.id);
    if (practice && instantOn && newChosen) void revealNow(q.id, newChosen);
  }

  function toggleMark() {
    const q = questions[idx];
    setAnswers((prev) => {
      const next = new Map(prev);
      const a = next.get(q.id) ?? { questionId: q.id, chosen: null, timeSec: 0, marked: false };
      next.set(q.id, { ...a, marked: !a.marked });
      return next;
    });
    scheduleSave(q.id);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    trackTimeOnSwitch(idx);

    // Belt-and-suspenders: even with the answersRef closure fix above,
    // students were occasionally seeing N/15 questions marked "skipped"
    // when they swore they answered all of them. Race conditions
    // between the debounced timer, the trackTimeOnSwitch setAnswers,
    // and an immediate submit click can still drop a save. Cheapest
    // reliable fix is to force-resave EVERY non-empty answer here
    // before posting submit. ~N small writes, all parallel, ~100ms
    // for a 100-question mock. The submit handler is already
    // idempotent so a duplicate save is harmless.
    //
    // We pull from the LIVE setAnswers callback rather than the ref so
    // any state update queued moments ago (e.g. trackTimeOnSwitch's
    // setAnswers from this same tick) is captured before we send.
    const latestAnswers: AnswerLocal[] = await new Promise((resolve) => {
      setAnswers((current) => {
        resolve([...current.values()]);
        return current;
      });
    });
    const dirtyOrAnswered = latestAnswers.filter(
      (a) => a.chosen != null || a.marked || a.timeSec > 0,
    );
    await Promise.all(
      dirtyOrAnswered.map((a) =>
        apiPost(`/api/attempts/${attemptId}/answer`, {
          questionId: a.questionId,
          chosen: a.chosen,
          timeSec: a.timeSec,
          marked: a.marked,
        }).catch(() => {
          /* keep going; the submit will still proceed with whatever
             reached the server. */
        }),
      ),
    );
    // Belt #2 — also run the standard flushSaves so the dirty set is
    // drained (harmless if everything was already saved above).
    await flushSaves();

    try {
      await apiPost(`/api/attempts/${attemptId}/submit`);
      router.replace(`/attempts/${attemptId}/results`);
    } catch (e: any) {
      setError(e.message ?? "Could not submit");
      setSubmitting(false);
    }
  }

  // Auto-submit when time runs out
  const autoSubmittedRef = useRef(false);
  useEffect(() => {
    if (timeUp && !autoSubmittedRef.current && !submitting) {
      autoSubmittedRef.current = true;
      submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp]);

  // Save dirty answers on tab close
  useEffect(() => {
    const onBeforeUnload = () => {
      if (dirtyRef.current.size > 0) flushSaves();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = questions[idx];
  const localAnswer = answers.get(q.id);
  const answeredCount = [...answers.values()].filter((a) => a.chosen != null).length;
  const markedCount = [...answers.values()].filter((a) => a.marked).length;

  // Resolve display text — translation if we have one, otherwise source.
  const tr = translations.get(q.id);
  const displayBody = tr?.body ?? q.body;
  const displayOptions = tr && tr.options.length === q.options.length
    ? tr.options
    : q.options;

  return (
    <main className="min-h-screen bg-ink-50/60">
      {/* Full-screen submit overlay — without this the screen looked frozen
          for the ~1-2s the server takes to score, update WeaknessMap, and
          create the progress event. The button label change alone wasn't
          enough of a signal that something was happening. */}
      {submitting && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white/80 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <span className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-saffron-200 border-t-saffron-500" />
          <p className="text-base font-semibold text-ink-900">
            {labels.confirmSubmitting}
          </p>
          <p className="max-w-xs text-center text-xs text-ink-500">
            {labels.submittingHint}
          </p>
        </div>
      )}

      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-ink-200 bg-white">
        <div className="container-prose flex h-14 items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-saffron-500 text-xs font-bold text-white">
              शि
            </span>
            <span className="hidden font-semibold text-ink-900 sm:inline">{mock.examShort}</span>
          </Link>
          <p className="hidden truncate text-sm font-medium text-ink-700 md:block">{mock.title}</p>
          <div className="flex items-center gap-2">
            {practice && (
              <button
                type="button"
                onClick={() => setInstantOn((v) => !v)}
                title="Instant feedback after each answer (practice mocks only)"
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  instantOn ? "bg-emerald-100 text-emerald-800" : "bg-ink-100 text-ink-500"
                }`}
              >
                ⚡ Feedback {instantOn ? "ON" : "OFF"}
              </button>
            )}
            <Timer remainingSec={remainingSec} totalSec={totalSec} />
          </div>
        </div>
        {translateErr && (
          <p className="container-prose pb-1 text-[11px] text-rose-700">{translateErr}</p>
        )}
      </header>

      <div className="container-prose grid grid-cols-1 gap-6 py-6 lg:grid-cols-[1fr_280px]">
        {/* Question */}
        <article className="rounded-md border border-ink-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-ink-500">
              Q {idx + 1} {labels.qOf} {questions.length} · {q.topic.name} · {q.difficulty}
            </p>
            {/* Per-question controls — language picker right next to
                "Mark for review" so the student sees both options
                exactly where they're reading. Top-bar language picker
                was too disconnected from the question. */}
            <div className="flex items-center gap-2">
              <QuestionLangSwitcher
                current={locale}
                onChange={changeLocale}
                pending={translating}
                label="Translate this question"
              />
              <button
                onClick={toggleMark}
                className={
                  localAnswer?.marked
                    ? "rounded-md bg-amber-500 px-2.5 py-1 text-xs font-medium text-white"
                    : "rounded-md border border-ink-300 px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-ink-50"
                }
              >
                {localAnswer?.marked ? labels.marked : labels.mark}
              </button>
            </div>
          </div>

          <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-ink-900">{displayBody}</p>

          <ul className="mt-6 space-y-2">
            {displayOptions.map((opt) => {
              const selected = localAnswer?.chosen === opt.key;
              const fb = feedback.get(q.id);
              const isKey = fb ? fb.answerKey.toUpperCase().split(",").map((k) => k.trim()).includes(opt.key.toUpperCase()) : false;
              const rowCls = fb
                ? isKey
                  ? "flex w-full items-start gap-3 rounded-md border-2 border-emerald-500 bg-emerald-50 px-4 py-3 text-left"
                  : selected
                    ? "flex w-full items-start gap-3 rounded-md border-2 border-rose-400 bg-rose-50 px-4 py-3 text-left"
                    : "flex w-full items-start gap-3 rounded-md border border-ink-200 bg-white px-4 py-3 text-left opacity-60"
                : selected
                  ? "flex w-full items-start gap-3 rounded-md border-2 border-saffron-500 bg-saffron-50 px-4 py-3 text-left"
                  : "flex w-full items-start gap-3 rounded-md border border-ink-300 bg-white px-4 py-3 text-left hover:bg-ink-50";
              const badgeCls = fb
                ? isKey
                  ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-500 text-sm font-semibold text-white"
                  : selected
                    ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-rose-400 text-sm font-semibold text-white"
                    : "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-ink-300 text-sm font-medium text-ink-700"
                : selected
                  ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-saffron-500 text-sm font-semibold text-white"
                  : "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-ink-300 text-sm font-medium text-ink-700";
              return (
                <li key={opt.key}>
                  <button onClick={() => chooseOption(opt.key)} disabled={Boolean(fb)} className={rowCls}>
                    <span className={badgeCls}>{opt.key}</span>
                    <span className="text-sm text-ink-800">{opt.text}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Instant-feedback strip (practice mocks) */}
          {(() => {
            const fb = feedback.get(q.id);
            if (!fb) return null;
            return (
              <div
                className={`mt-4 rounded-lg border p-4 ${
                  fb.correct ? "border-emerald-300 bg-emerald-50/60" : "border-rose-200 bg-rose-50/50"
                }`}
              >
                <p className={`text-sm font-bold ${fb.correct ? "text-emerald-800" : "text-rose-800"}`}>
                  {fb.correct ? "✓ Correct!" : `✗ Not quite — correct answer: ${fb.answerKey}`}
                  {fb.topicName && (
                    <span className="ml-2 rounded bg-white px-1.5 py-0.5 text-[11px] font-semibold text-ink-600">
                      {fb.topicName}
                    </span>
                  )}
                </p>
                {fb.solution && (
                  <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink-700">
                    {fb.solution}
                  </p>
                )}
                <p className="mt-1.5 text-[11px] text-ink-400">Answer locked for this question.</p>
              </div>
            );
          })()}

          {/* Running weak-areas tally — the student's request, verbatim:
              "let me find my weak areas after every mcq". */}
          {weakTally.length > 0 && (
            <p className="mt-3 text-xs text-ink-600">
              <span className="font-semibold text-rose-700">Weak so far:</span>{" "}
              {weakTally.map(([name, n]) => `${name}${n > 1 ? ` ×${n}` : ""}`).join(" · ")}
            </p>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => jumpTo(idx - 1)}
              disabled={idx === 0}
              className="btn-secondary !py-2 !px-4 text-sm disabled:opacity-40"
            >
              {labels.prev}
            </button>
            {idx < questions.length - 1 ? (
              <button
                onClick={() => jumpTo(idx + 1)}
                className="btn-primary !py-2 !px-4 text-sm"
              >
                {labels.saveNext}
              </button>
            ) : (
              <button
                onClick={() => setConfirmOpen(true)}
                className="btn-primary !py-2 !px-4 text-sm"
              >
                {labels.reviewSubmit}
              </button>
            )}
          </div>
        </article>

        {/* Palette + summary */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-md border border-ink-200 bg-white p-4">
            <p className="text-xs text-ink-500">
              <span className="font-medium text-ink-800">{answeredCount}</span> {labels.sumAnswered} ·{" "}
              <span className="font-medium text-ink-800">{markedCount}</span> {labels.sumMarked} ·{" "}
              <span className="font-medium text-ink-800">{questions.length - answeredCount}</span> {labels.sumLeft}
            </p>
            <div className="mt-3 grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:grid-cols-5">
              {questions.map((qq, i) => {
                const a = answers.get(qq.id);
                const status = a?.marked
                  ? "marked"
                  : a?.chosen
                  ? "answered"
                  : "unseen";
                const colour =
                  status === "answered"
                    ? "bg-emerald-500 text-white"
                    : status === "marked"
                    ? "bg-amber-500 text-white"
                    : "bg-ink-100 text-ink-700";
                return (
                  <button
                    key={qq.id}
                    onClick={() => jumpTo(i)}
                    className={
                      i === idx
                        ? `relative h-9 w-9 rounded-md border-2 border-saffron-600 text-xs font-semibold ${colour}`
                        : `h-9 w-9 rounded-md text-xs font-semibold ${colour}`
                    }
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => setConfirmOpen(true)}
            className="btn-primary w-full !py-2.5 text-sm"
          >
            {labels.submitMock}
          </button>
          <p className="text-center text-[11px] text-ink-500">
            +{mock.marksPerQ} {labels.marksPerQ} · {mock.negativeMark > 0 ? `−${mock.negativeMark}` : labels.negativeNone}
          </p>
        </aside>
      </div>

      {/* Submit confirmation */}
      {confirmOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-ink-900/60 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-ink-900">{labels.confirmTitle}</h3>
            <p className="mt-2 text-sm text-ink-600">
              {labels.confirmBodyPrefix} <strong>{answeredCount}</strong> {labels.confirmBodyOf}{" "}
              <strong>{questions.length}</strong>.
              {questions.length - answeredCount > 0 && (
                <> {labels.confirmBodyNote}</>
              )}
            </p>
            {error && <p className="mt-3 text-xs text-rose-700">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
                className="btn-secondary !py-2 !px-4 text-sm"
              >
                {labels.confirmKeep}
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="btn-primary !py-2 !px-4 text-sm"
              >
                {submitting ? labels.confirmSubmitting : labels.confirmSubmit}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Timer({ remainingSec, totalSec }: { remainingSec: number; totalSec: number }) {
  const m = Math.floor(remainingSec / 60);
  const s = remainingSec % 60;
  const fraction = totalSec === 0 ? 0 : remainingSec / totalSec;
  const colour = fraction < 0.1 ? "bg-rose-500" : fraction < 0.25 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2 rounded-md border border-ink-200 bg-white px-3 py-1.5">
      <span className={`h-2 w-2 rounded-full ${colour}`} />
      <span className="font-mono text-sm tabular-nums text-ink-900">
        {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
      </span>
    </div>
  );
}
