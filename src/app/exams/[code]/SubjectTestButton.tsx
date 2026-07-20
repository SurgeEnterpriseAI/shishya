"use client";

// Gap-fill #1 — subject-wise tests. Users asked for this verbatim
// ("Instead of these 5-question quizzes, try a 25-question English test,
// 25-question GK test", "Plz give me computer quiz") and the backend has
// supported SUBJECT mocks (10–100 Q) since day one — there was simply no
// button. One tap creates the subject test from the validated pool and
// drops the student into the player. Anonymous users go to login with a
// callback so the intent isn't lost.

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  examCode: string;
  subjectCode: string;
  subjectName: string;
  /** Validated questions available in this subject. */
  available: number;
}

export function SubjectTestButton({ examCode, subjectCode, subjectName, available }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // 25 questions when the pool allows; otherwise the biggest test the pool
  // supports (API floor is 10).
  const qCount = Math.max(10, Math.min(25, available));

  async function start() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/mocks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          examCode,
          request: { type: "SUBJECT", subjectCode, questionCount: qCount },
        }),
      });
      if (res.status === 401) {
        window.location.href = `/login?callbackUrl=${encodeURIComponent(`/exams/${examCode}#subject-tests`)}`;
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error ?? "Couldn't build the test — try again.");
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
    <div>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="inline-flex w-full items-center justify-center rounded-md bg-saffron-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600 disabled:cursor-wait disabled:opacity-70"
      >
        {busy ? "Building your test…" : `${qCount}-question ${subjectName} test →`}
      </button>
      {err && <p className="mt-1 text-xs text-rose-700">{err}</p>}
    </div>
  );
}
