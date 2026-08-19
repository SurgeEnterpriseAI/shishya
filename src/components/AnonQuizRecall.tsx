"use client";

// Post-signup recall of a guest quiz result (audit 18 Aug 2026). The
// anon quiz stashes {examCode, score, total, missed} in localStorage;
// the anon signup CTA promises to "track your weak topics". This mounts
// on the exam hub, and if a stashed result matches THIS exam, it
// surfaces it once (so the promise is kept), links the student straight
// to fixing a missed area, then clears it. Renders nothing otherwise —
// invisible to the 99% of visitors with no stashed quiz.

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stashed {
  examCode: string;
  examShort: string;
  topicCode: string | null;
  scopeLabel: string;
  score: number;
  total: number;
  missed: string[];
  at: number;
}

export function AnonQuizRecall({ examCode }: { examCode: string }) {
  const [data, setData] = useState<Stashed | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("shishya_anon_quiz");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Stashed;
      // Only for this exam, and only recent (7 days) so a stale guest
      // result doesn't resurface weeks later.
      if (parsed.examCode === examCode && Date.now() - parsed.at < 7 * 864e5) {
        setData(parsed);
      }
    } catch {
      /* ignore malformed / unavailable storage */
    }
  }, [examCode]);

  if (!data) return null;

  const clear = () => {
    try {
      localStorage.removeItem("shishya_anon_quiz");
    } catch {
      /* non-fatal */
    }
    setData(null);
  };

  const topicHref = data.topicCode
    ? `/exams/${examCode}/topics/${encodeURIComponent(data.topicCode)}`
    : `/exams/${examCode}`;

  return (
    <div className="mb-4 rounded-xl border border-saffron-200 bg-saffron-50/70 p-4">
      <p className="text-sm text-ink-800">
        👋 Welcome in — we kept your guest quiz. You scored{" "}
        <span className="font-semibold">
          {data.score}/{data.total}
        </span>{" "}
        on {data.scopeLabel}. {data.total - data.score > 0
          ? "Let's turn those misses into marks — start with the topic you're weakest on."
          : "Strong start — keep the momentum with a full mock."}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link
          href={topicHref}
          onClick={clear}
          className="rounded-lg bg-saffron-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-saffron-600"
        >
          {data.total - data.score > 0 ? "Fix my weak area →" : "Take a full mock →"}
        </Link>
        <button onClick={clear} className="text-sm text-ink-500 hover:text-ink-700">
          Dismiss
        </button>
      </div>
    </div>
  );
}
