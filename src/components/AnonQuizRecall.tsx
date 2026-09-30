"use client";

// Post-signup recall of a guest quiz result (audit 18 Aug 2026). The
// anon quiz stashes {examCode, score, total, missed} in localStorage;
// the anon signup CTA promises to "track your weak topics". This mounts
// on the exam hub, and if a stashed result matches THIS exam, it
// surfaces it once (so the promise is kept), links the student straight
// to fixing a missed area, then clears it. Renders nothing otherwise —
// invisible to the 99% of visitors with no stashed quiz.
//
// 30 Sep 2026 (quiz carry — src/lib/quiz-carry.ts): the promise is now kept
// in the account too. For a signed-in member (`signedIn`) a stash that
// carries its question ids and chosen options is sent ONCE to POST
// /api/quiz/import, which re-grades it against the stored answer keys and
// adds it to the account's weak topics; the card then says "Saved to your
// Shishya: {topics} — the {exam} tutor now sees these weak topics" (Daily 5
// is not promised — it ranks topics with 3+ answers). The stash remembers
// the carry, so a later page never sends it again (the server also keeps one
// carry per stash). Mounted on the hub (any visitor — a guest sees the recall
// as before and nothing is sent), the dashboard (any exam's stash), and the
// signed-in mock page with `silent` (the carry only, nothing drawn over a
// paper). Never on school pages: school practice stashes nothing. Words in
// en / hi / te (English unchanged).

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  QUIZ_CARRY_MAX_AGE_MS,
  QUIZ_STASH_KEY,
  carryBodyOf,
  carryOutcome,
  parseQuizStash,
  quizRecallCopy,
  savedLine,
  welcomeParts,
  type QuizStash,
} from "@/lib/quiz-carry";
import { clientUiLocale } from "@/lib/ui-locale-copy";

function readStash(): QuizStash | null {
  try {
    const raw = localStorage.getItem(QUIZ_STASH_KEY);
    return raw ? parseQuizStash(JSON.parse(raw)) : null;
  } catch {
    return null; /* malformed / unavailable storage */
  }
}

function writeStash(s: QuizStash): void {
  try {
    localStorage.setItem(QUIZ_STASH_KEY, JSON.stringify(s));
  } catch {
    /* non-fatal: the server keeps one carry per stash anyway */
  }
}

export function AnonQuizRecall({
  examCode,
  signedIn = false,
  silent = false,
  locale,
}: {
  /** Show only a stash of this exam (the hub); omitted = any exam (the dashboard). */
  examCode?: string;
  /** The page knows the visitor is signed in: carry the stash into the account. */
  signedIn?: boolean;
  /** Carry only, draw nothing (the mock page). */
  silent?: boolean;
  /** The page's language when the server knows it; else the visitor's cookie, after mount. */
  locale?: string;
}) {
  const [data, setData] = useState<QuizStash | null>(null);
  const [saved, setSaved] = useState<string[] | null>(null);
  const [lang, setLang] = useState<string>(locale ?? "en");

  useEffect(() => {
    if (!locale) setLang(clientUiLocale());
    const stash = readStash();
    // Only recent (7 days) so a stale guest result doesn't resurface weeks later.
    if (!stash || Date.now() - stash.at >= QUIZ_CARRY_MAX_AGE_MS) return;
    const show = !silent && (!examCode || stash.examCode === examCode);
    if (show) setData(stash);
    if (stash.carried) {
      if (show) setSaved(stash.carried.topics);
      return;
    }
    if (!signedIn) return;
    const body = carryBodyOf(stash, Date.now());
    if (!body) return;
    let alive = true;
    fetch("/api/quiz/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    })
      .then(async (r) => {
        const outcome = carryOutcome(r.status, await r.json().catch(() => null));
        if (outcome.kind === "retry") return; // a later signed-in page tries again
        const latest = readStash() ?? stash;
        writeStash({ ...latest, carryDone: true, carried: outcome.kind === "saved" ? { topics: outcome.topics } : null });
        if (alive && show && outcome.kind === "saved") setSaved(outcome.topics);
      })
      .catch(() => {
        /* network: a later signed-in page tries again */
      });
    return () => {
      alive = false;
    };
  }, [examCode, signedIn, silent, locale]);

  if (!data) return null;
  const c = quizRecallCopy(lang);

  const clear = () => {
    try {
      localStorage.removeItem(QUIZ_STASH_KEY);
    } catch {
      /* non-fatal */
    }
    setData(null);
  };

  const topicHref = data.topicCode
    ? `/exams/${data.examCode}/topics/${encodeURIComponent(data.topicCode)}`
    : `/exams/${data.examCode}`;
  const [before, after] = welcomeParts(c, data.scopeLabel);
  const missed = data.total - data.score > 0;

  return (
    <div className="mb-4 rounded-xl border border-saffron-200 bg-saffron-50/70 p-4">
      <p className="text-sm text-ink-800">
        {before}
        <span className="font-semibold">
          {data.score}/{data.total}
        </span>
        {after} {missed ? c.missTail : c.fullTail}
      </p>
      {saved && <p className="mt-1 text-xs font-medium text-emerald-800">{savedLine(c, data, saved)}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        <Link
          href={topicHref}
          onClick={clear}
          className="rounded-lg bg-saffron-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-saffron-600"
        >
          {missed ? c.fixCta : c.mockCta}
        </Link>
        <button onClick={clear} className="text-sm text-ink-500 hover:text-ink-700">
          {c.dismiss}
        </button>
      </div>
    </div>
  );
}
