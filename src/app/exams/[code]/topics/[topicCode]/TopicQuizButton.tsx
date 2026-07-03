"use client";

// Growth lever #1 — turn topic-notes readers into the mock loop.
//
// The behavioural data was stark: topic-notes pages pull lots of SEO
// visitors but ~20s dwell each, and they almost never enter the mock loop
// (the product's real engagement engine: 55% of all time-on-site). This
// one-tap CTA creates a 5-question TOPIC mock from the EXISTING validated
// pool (instant + free — no Claude call) and drops the reader straight into
// the player. Anonymous readers get bounced to login with a callback so the
// intent isn't lost (lever #2 will let them taste it before the gate).

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  examCode: string;
  topicCode: string;
  topicName: string;
  examShort: string;
}

export function TopicQuizButton({ examCode, topicCode, topicName, examShort }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/mocks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          examCode,
          request: { type: "TOPIC", topicCode, questionCount: 5 },
        }),
      });
      if (res.status === 401) {
        // Not signed in — keep the intent: return them here after login.
        const cb = `/exams/${examCode}/topics/${topicCode}`;
        window.location.href = `/login?callbackUrl=${encodeURIComponent(cb)}`;
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error ?? "Couldn't start the quiz — please try again.");
        setBusy(false);
        return;
      }
      router.push(`/mocks/${data.mock.id}`);
    } catch {
      setErr("Network hiccup — try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 rounded-lg border border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-ink-900">Test yourself on {topicName}</p>
          <p className="mt-0.5 text-xs text-ink-600">
            5 quick {examShort} questions with instant scoring — see where you stand in ~3 minutes.
          </p>
          {err && <p className="mt-1 text-xs text-rose-700">{err}</p>}
        </div>
        <button
          type="button"
          onClick={start}
          disabled={busy}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-saffron-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-300 disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Starting…
            </>
          ) : (
            <>Take the 5-question quiz →</>
          )}
        </button>
      </div>
    </div>
  );
}
