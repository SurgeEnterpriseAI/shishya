"use client";

// Mock player — the actual exam-taking UI.
//
// Features:
//  - Timer (isolated child, auto-submit when time runs out)
//  - Question palette (numbered grid) with status colours
//  - Mark-for-review toggle
//  - Autosave: every change is mirrored to localStorage on this device and
//    batched to /api/attempts/:id/answer with retry + backoff; the dirty set
//    is cleared only for versions the server acknowledged
//  - Submit: ONE batched payload (every answer + timing) that the server
//    re-grades from the answer key; retried across a network blink
//  - Honest inline save state (saving / saved / offline / retrying / error)
//
// Survives a 4G blink (audit 11 Sep 2026): before this the dirty set was
// cleared BEFORE the POST, failures were swallowed, nothing was kept on the
// device, and submit fanned out one POST per answered question — so a blink
// during the 700 ms debounce silently graded an answered question as skipped.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiPost } from "@/lib/api";
import { QuestionLangSwitcher } from "@/components/QuestionLangSwitcher";
import { MockTimer } from "@/components/mock-player/MockTimer";
import { SaveStatus, type SaveState } from "@/components/mock-player/SaveStatus";
import {
  backoffMs,
  clearMirror,
  mergeAnswers,
  mirrorKey,
  readMirror,
  reconcileAck,
  writeMirror,
  type AnswerRecord,
  type StorageLike,
} from "@/lib/attempts-sync";
import type { Locale } from "@/lib/i18n";

function safeStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // private mode / blocked storage — the mirror is simply off
  }
}

/** Server error code from /answer when the attempt is not IN_PROGRESS. */
const ATTEMPT_NOT_WRITABLE = "ATTEMPT_NOT_WRITABLE";
/** Server error code from /submit when an earlier submit already graded it. */
const ATTEMPT_ALREADY_GRADED = "ATTEMPT_ALREADY_GRADED";
/** Timed submit retries (capped backoff) before we wait for 'online' / a tap. */
const MAX_TIMED_SUBMIT_RETRIES = 5;
const OFFLINE_SUBMIT_NOTE =
  "No connection — your answers are kept on this device. We'll submit as soon as you're back online.";
const OFFLINE_SUBMIT_NOTE_NO_MIRROR =
  "No connection — and this device could not keep a copy of your answers. Keep this tab open; we'll submit as soon as you're back online.";
/** Once the timed retries are spent, keep trying every 30 s (plus 'online' / a tap). */
const SLOW_RETRY_MS = 30_000;
/** SaveStatus labels when localStorage refused the mirror (private mode, quota). */
const NO_MIRROR_LABELS = {
  offline: "offline — this device could not keep a copy; keep this tab open until it syncs",
  retrying: "couldn't reach the server — this device could not keep a copy; keep this tab open, retrying",
  error: "this attempt can no longer be saved on the server — and this device could not keep a copy; keep this tab open",
};

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

/** questionId, chosen, timeSec, marked, updatedAt? — see attempts-sync. */
type AnswerLocal = AnswerRecord;

function toWire(a: AnswerLocal) {
  return {
    questionId: a.questionId,
    chosen: a.chosen,
    timeSec: a.timeSec,
    marked: a.marked,
    ...(a.updatedAt != null ? { updatedAt: a.updatedAt } : {}),
  };
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
  userId = null,
}: {
  mock: MockMeta;
  attemptId: string;
  startedAt: string;
  questions: QuestionVm[];
  existingAnswers: AnswerLocal[];
  labels: PlayerLabels;
  initialLocale?: Locale;
  /** Namespaces the on-device answer mirror. Optional — attempt ids are
   *  already unique per user, so the key works without it. */
  userId?: string | null;
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
  //
  // 1 Sep 2026 (mined demand): Hindi-medium students never found the
  // picker — they went to the tutor and typed "mock test only hindi
  // language". Opt-in stays, but when the SITE language is non-English
  // we show a one-tap hint strip until they choose either way.
  const [locale, setLocale] = useState<Locale>("en");
  const [langHint, setLangHint] = useState(initialLocale !== "en");
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

  // ── Timer lives in <MockTimer> (src/components/mock-player/MockTimer.tsx)
  // so the once-a-second tick never re-renders the palette. The player only
  // hears about it once, through handleTimeUp below.

  // ── Per-question timing — track time spent on the current Q
  const lastSwitchRef = useRef<number>(Date.now());
  useEffect(() => {
    lastSwitchRef.current = Date.now();
  }, [idx]);

  // ── On-device mirror + acknowledged saves ───────────────────────────
  //
  // BUG FIX (May 2026): we used to read `answers` directly inside the
  // flush. React state updates are async + batched, so the closure
  // captured by setTimeout pointed to the answers map from BEFORE the
  // click. The save then sent the pre-click value (chosen: null), and
  // submit later scored that question as skipped — even though the UI
  // showed it as answered. The fix is to read via a ref that we keep in
  // sync with state, so the flush always sees the latest map.
  //
  // 11 Sep 2026: three more guarantees on top of that.
  //  1. Every change is written to localStorage (keyed by user + attempt)
  //     and merged back on mount — server wins only where its per-question
  //     stamp is strictly newer. Cleared only after a confirmed submit.
  //  2. The dirty set is NOT cleared when a save is sent. It shrinks only
  //     by what the server acknowledged (reconcileAck compares the acked
  //     updatedAt with the version still held here), so a question edited
  //     again mid-flight stays dirty. Failures retry with capped backoff
  //     (≤ 30 s, one request in flight per tab) and again on 'online'.
  //  3. Any 4xx stops retrying — the answers stay on the device and the
  //     student sees the server's reason, never a spinner.
  const storageKey = mirrorKey(attemptId, userId);
  const dirtyRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef(false);
  const retryRef = useRef(0);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mergedRef = useRef(false);
  // The timer mounts only after the mount-merge ran, so a time-up on a
  // resumed attempt never auto-submits before the device's mirrored answers
  // are back in state.
  const [mirrorMerged, setMirrorMerged] = useState(false);
  // localStorage can refuse the mirror (private mode, quota); the copy must
  // then stop claiming "answers kept on this device".
  const [mirrorOk, setMirrorOk] = useState(true);
  const mirrorOkRef = useRef(true);
  const mirror = (data: Parameters<typeof writeMirror>[2]) => {
    const ok = writeMirror(safeStorage(), storageKey, data);
    if (!ok && mirrorOkRef.current) {
      mirrorOkRef.current = false;
      setMirrorOk(false);
    }
    return ok;
  };
  const kept = () => (mirrorOkRef.current ? "answers kept on this device" : "this device could not keep a copy — keep this tab open");
  const Kept = () => (mirrorOkRef.current ? "Your answers are kept on this device" : "This device could not keep a copy of your answers — keep this tab open");
  const unmountedRef = useRef(false);
  const submittingRef = useRef(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [unsynced, setUnsynced] = useState(0);

  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
    // Mirror every real change on this device. Guarded so the server seed
    // cannot overwrite an unread mirror on the very first commit — the
    // mount-merge effect below reads it first and then flips mergedRef.
    if (!mergedRef.current) return;
    mirror({
      attemptId,
      userId: userId ?? null,
      answers: answers.values(),
    });
  }, [answers, attemptId, userId, storageKey]);

  function syncUnsynced() {
    const n = dirtyRef.current.size;
    setUnsynced((prev) => (prev === n ? prev : n));
  }

  function scheduleFlush(delayMs = 700) {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null;
      void flush();
    }, delayMs);
  }

  function markDirty(qid: string) {
    dirtyRef.current.add(qid);
    syncUnsynced();
    scheduleFlush(700);
  }

  async function flush() {
    if (unmountedRef.current || submittingRef.current) return; // submit carries everything
    if (inFlightRef.current) return; // the ack handler reschedules if anything is still dirty
    const sent = [...dirtyRef.current]
      .map((id) => answersRef.current.get(id))
      .filter((a): a is AnswerLocal => Boolean(a));
    if (sent.length === 0) {
      syncUnsynced();
      setSaveState((s) => (s === "idle" || s === "error" ? s : "saved"));
      return;
    }
    inFlightRef.current = true;
    setSaveState("saving");
    let outcome: "ok" | "fatal" | "retry" = "retry";
    try {
      const res = await fetch(`/api/attempts/${attemptId}/answer`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers: sent.map(toWire) }),
      });
      if (res.ok) {
        const json = (await res.json().catch(() => null)) as {
          acked?: Array<{ questionId: string; updatedAt?: number }>;
        } | null;
        const acked = Array.isArray(json?.acked)
          ? json!.acked!
          : sent.map((a) => ({ questionId: a.questionId, updatedAt: a.updatedAt }));
        dirtyRef.current = reconcileAck(dirtyRef.current, acked, answersRef.current);
        retryRef.current = 0;
        outcome = "ok";
      } else if (res.status >= 400 && res.status < 500) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        const code = json?.error ?? `HTTP ${res.status}`;
        setSaveMessage(
          code === ATTEMPT_NOT_WRITABLE
            ? `this attempt can no longer be saved on the server (it may have been submitted or closed) — ${kept()}`
            : res.status === 401
              ? `your sign-in expired — ${kept()}; sign in again in a new tab, then continue`
              : `could not save (${code}) — ${kept()}`,
        );
        outcome = "fatal";
      }
      // 5xx falls through as "retry"
    } catch {
      /* network — retry below */
    } finally {
      inFlightRef.current = false;
    }
    if (unmountedRef.current) return;
    syncUnsynced();
    if (outcome === "ok") {
      setSaveMessage(null);
      if (dirtyRef.current.size > 0) scheduleFlush(0); // changed while in flight
      else setSaveState("saved");
    } else if (outcome === "fatal") {
      setSaveState("error"); // no retry loop on a 4xx; next change or 'online' tries once more
    } else {
      retryRef.current += 1;
      setSaveState(typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "retrying");
      scheduleFlush(backoffMs(retryRef.current, 1000, 30000, 0.2));
    }
  }

  // Mount: merge what this device kept with what the server sent. Guarded
  // by mergedRef so React StrictMode's double-invoke (dev) is a no-op.
  useEffect(() => {
    if (mergedRef.current) return;
    const local = readMirror(safeStorage(), storageKey, attemptId);
    const { merged, dirty } = mergeAnswers(
      existingAnswers,
      local,
      questions.map((q) => q.id),
    );
    mergedRef.current = true;
    answersRef.current = merged;
    setAnswers(merged);
    setMirrorMerged(true);
    for (const id of dirty) dirtyRef.current.add(id);
    syncUnsynced();
    if (dirty.size > 0) scheduleFlush(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lifecycle: stop timers on unmount; re-arm a pending flush after a
  // StrictMode remount (its cleanup cleared the timer the merge scheduled).
  useEffect(() => {
    unmountedRef.current = false;
    if (dirtyRef.current.size > 0 && !flushTimerRef.current && !inFlightRef.current) scheduleFlush(0);
    return () => {
      unmountedRef.current = true;
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Connectivity: retry the moment the browser says we are back; say so
  // the moment it says we are not.
  useEffect(() => {
    const onOnline = () => {
      retryRef.current = 0;
      if (dirtyRef.current.size > 0 && !submittingRef.current) scheduleFlush(0);
    };
    const onOffline = () => {
      if (dirtyRef.current.size > 0 && !submittingRef.current) setSaveState("offline");
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function trackTimeOnSwitch(fromIdx: number) {
    const fromQ = questions[fromIdx];
    if (!fromQ) return;
    const elapsedOnQ = Math.max(0, Math.floor((Date.now() - lastSwitchRef.current) / 1000));
    if (elapsedOnQ === 0) return;
    setAnswers((prev) => {
      const next = new Map(prev);
      const a = next.get(fromQ.id) ?? { questionId: fromQ.id, chosen: null, timeSec: 0, marked: false };
      next.set(fromQ.id, { ...a, timeSec: a.timeSec + elapsedOnQ, updatedAt: Date.now() });
      return next;
    });
    markDirty(fromQ.id);
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
      next.set(q.id, { ...a, chosen: newChosen, updatedAt: Date.now() });
      return next;
    });
    markDirty(q.id);
    if (practice && instantOn && newChosen) void revealNow(q.id, newChosen);
  }

  function toggleMark() {
    const q = questions[idx];
    setAnswers((prev) => {
      const next = new Map(prev);
      const a = next.get(q.id) ?? { questionId: q.id, chosen: null, timeSec: 0, marked: false };
      next.set(q.id, { ...a, marked: !a.marked, updatedAt: Date.now() });
      return next;
    });
    markDirty(q.id);
  }

  // ── Submit: ONE batched payload, retried across a blink ─────────────
  // The overlay's text while waiting, and a hook for its "Retry now" tap.
  const [submitNote, setSubmitNote] = useState<string | null>(null);
  const [submitWaiting, setSubmitWaiting] = useState(false);
  const retryNowRef = useRef<(() => void) | null>(null);

  /** Resolves after `ms` (null = never on its own), or when the browser
   *  fires 'online', or when the student taps "Retry now". */
  function waitForRetry(ms: number | null): Promise<void> {
    return new Promise((resolve) => {
      let done = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const finish = () => {
        if (done) return;
        done = true;
        if (timer) clearTimeout(timer);
        window.removeEventListener("online", finish);
        retryNowRef.current = null;
        resolve();
      };
      if (ms != null) timer = setTimeout(finish, ms);
      window.addEventListener("online", finish);
      retryNowRef.current = finish;
    });
  }

  async function submit(auto = false) {
    if (submittingRef.current) return; // double tap / second timer tick
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    setSubmitNote(null);
    setSubmitWaiting(false);
    trackTimeOnSwitch(idx);
    // Autosave stands down — the submit payload carries everything, and
    // one in-flight request per tab is the rule.
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    // We pull from the LIVE setAnswers callback rather than the ref so
    // any state update queued moments ago (e.g. trackTimeOnSwitch's
    // setAnswers from this same tick) is captured before we send.
    const latestAnswers: AnswerLocal[] = await new Promise((resolve) => {
      setAnswers((current) => {
        resolve([...current.values()]);
        return current;
      });
    });
    // Before this (11 Sep 2026) submit fanned out one POST per answered
    // question — up to 100 lambdas each rewriting the whole answers jsonb —
    // then posted a bare submit that scored ONLY what had reached the DB.
    // Now the payload itself is authoritative: the server replaces its
    // autosaved rows with these, re-grades from the answer key, and grades
    // exactly once (409 if an earlier submit already did).
    const payload = latestAnswers
      .filter((a) => a.chosen != null || a.marked || a.timeSec > 0)
      .map(toWire);
    mirror({ attemptId, userId: userId ?? null, answers: latestAnswers });
    const body = JSON.stringify({ auto, answers: payload });

    let tries = 0;
    for (;;) {
      if (unmountedRef.current) return;
      let res: Response | null = null;
      try {
        res = await fetch(`/api/attempts/${attemptId}/submit`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
        });
      } catch {
        res = null; // network
      }

      let code: string | null = null;
      if (res && !res.ok && res.status < 500) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        code = json?.error ?? `HTTP ${res.status}`;
      }

      if (res && (res.ok || (res.status === 409 && code === ATTEMPT_ALREADY_GRADED))) {
        // 200: graded from this payload. 409: the server already graded an
        // earlier submit (a retry whose response was lost, a second tab, a
        // double tap) and this payload differs — nothing is re-scored, the
        // results page shows the persisted truth. Either way the attempt
        // is closed on the server, so the on-device copy has done its job.
        clearMirror(safeStorage(), storageKey);
        dirtyRef.current = new Set();
        syncUnsynced();
        router.replace(`/attempts/${attemptId}/results`);
        return; // overlay stays up until the results page takes over
      }

      if (res && res.status >= 400 && res.status < 500) {
        // Not retryable. Say why, keep the answers on the device, and hand
        // control back — the confirm dialog shows the message.
        setError(
          res.status === 401
            ? `Your sign-in expired. ${Kept()} — sign in again in a new tab, then submit.`
            : `Could not submit (${code}). ${Kept()}.`,
        );
        submittingRef.current = false;
        setSubmitting(false);
        setConfirmOpen(true);
        // On a failed auto-submit, re-arm so a later retry (or the user's
        // own submit tap) can fire again instead of being stuck.
        if (auto) autoSubmittedRef.current = false;
        if (dirtyRef.current.size > 0) scheduleFlush(0);
        return;
      }

      // Network error or 5xx: keep the overlay, say exactly what is true,
      // and try again — capped backoff (≤ 30 s) for the first few tries,
      // then every 30 s, plus the moment the browser reports 'online' or the student taps.
      tries += 1;
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      const timed = tries <= MAX_TIMED_SUBMIT_RETRIES;
      setSubmitNote(
        offline
          ? (mirrorOkRef.current ? OFFLINE_SUBMIT_NOTE : OFFLINE_SUBMIT_NOTE_NO_MIRROR)
          : timed
            ? `Couldn't reach the server — ${kept()}. Retrying.`
            : `Still can't reach the server — ${kept()}. Retrying every 30 seconds and the moment your connection is back — or tap Retry now.`,
      );
      setSubmitWaiting(true);
      await waitForRetry(timed ? backoffMs(tries, 1000, 30000, 0.2) : SLOW_RETRY_MS);
      setSubmitWaiting(false);
    }
  }

  // Auto-submit when time runs out (fired once by <MockTimer>).
  const autoSubmittedRef = useRef(false);
  function handleTimeUp() {
    if (autoSubmittedRef.current || submittingRef.current) return;
    autoSubmittedRef.current = true;
    void submit(true);
  }

  // Save dirty answers on tab close. A normal fetch is aborted when the
  // page unloads, so the LAST answers before closing were silently
  // dropped (audit 18 Aug 2026). navigator.sendBeacon survives unload.
  // It is best-effort and unacknowledged, so the dirty set is left alone:
  // a reopened tab re-sends the same rows from the mirror (one idempotent
  // UPDATE on the server).
  useEffect(() => {
    const flushViaBeacon = () => {
      if (dirtyRef.current.size === 0) return;
      const sent = [...dirtyRef.current]
        .map((qid) => answersRef.current.get(qid))
        .filter((a): a is AnswerLocal => Boolean(a))
        .map(toWire);
      if (sent.length === 0) return;
      const payload = JSON.stringify({ answers: sent });
      const ok =
        typeof navigator !== "undefined" &&
        typeof navigator.sendBeacon === "function" &&
        navigator.sendBeacon(
          `/api/attempts/${attemptId}/answer`,
          new Blob([payload], { type: "application/json" }),
        );
      if (!ok) {
        // Fallback: keepalive fetch also survives unload in modern browsers.
        fetch(`/api/attempts/${attemptId}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    };
    window.addEventListener("beforeunload", flushViaBeacon);
    window.addEventListener("pagehide", flushViaBeacon);
    return () => {
      window.removeEventListener("beforeunload", flushViaBeacon);
      window.removeEventListener("pagehide", flushViaBeacon);
    };
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
          {/* The spinner means a request is actually in flight. While we
              wait between retries there is nothing spinning — no fake
              progress. */}
          {submitWaiting ? (
            <span className="inline-block h-12 w-12 rounded-full border-4 border-amber-200" />
          ) : (
            <span className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-saffron-200 border-t-saffron-500" />
          )}
          <p className="text-base font-semibold text-ink-900">
            {submitWaiting ? "Not submitted yet" : labels.confirmSubmitting}
          </p>
          <p className="max-w-xs text-center text-xs text-ink-500">
            {submitNote ?? labels.submittingHint}
          </p>
          {submitWaiting && (
            <button
              type="button"
              onClick={() => retryNowRef.current?.()}
              className="btn-secondary !py-2 !px-4 text-sm"
            >
              Retry now
            </button>
          )}
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
            {mirrorMerged && (
              <MockTimer startedAt={startedAt} durationMin={mock.durationMin} onTimeUp={handleTimeUp} />
            )}
          </div>
        </div>
        {translateErr && (
          <p className="container-prose pb-1 text-[11px] text-rose-700">{translateErr}</p>
        )}
      </header>

      <div className="container-prose grid grid-cols-1 gap-6 py-6 lg:grid-cols-[1fr_280px]">
        {/* Question */}
        <article className="rounded-md border border-ink-200 bg-white p-6">
          {langHint && locale === "en" && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2">
              <p className="text-xs font-medium text-sky-900">
                {initialLocale === "hi"
                  ? "यह मॉक हिंदी में पढ़ना चाहेंगे? एक टैप में।"
                  : initialLocale === "te"
                    ? "ఈ మాక్‌ను తెలుగులో చదవాలనుకుంటున్నారా? ఒక్క ట్యాప్."
                    : "Read this mock in your language? One tap."}
              </p>
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setLangHint(false);
                    void changeLocale(initialLocale);
                  }}
                  className="rounded-md bg-sky-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-sky-700"
                >
                  {initialLocale === "hi" ? "हिंदी में" : initialLocale === "te" ? "తెలుగులో" : "Translate"}
                </button>
                <button
                  type="button"
                  onClick={() => setLangHint(false)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100"
                >
                  English ✓
                </button>
              </div>
            </div>
          )}
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
            <SaveStatus state={saveState} unsynced={unsynced} message={saveMessage} labels={mirrorOk ? undefined : NO_MIRROR_LABELS} className="mt-1" />
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
            {unsynced > 0 && !submitting && (
              <p className="mt-2 text-xs text-ink-600">
                {unsynced} {unsynced === 1 ? "answer is" : "answers are"} not yet confirmed by the server — they
                will be sent with your submission.
              </p>
            )}
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
                onClick={() => submit(false)}
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
