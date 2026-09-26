"use client";

// "Build my own mock" — UI for the mock-generation power that existed
// only in the API (USER_REQUEST free-text mocks, ADAPTIVE with chosen
// size). A student types what they want ("hard questions on Percentage
// and Profit & Loss"), picks a size + difficulty, and gets a fresh mock
// built from the validated pool. Empty text → adaptive mock targeted at
// their weak topics. Anonymous users go to login with a callback so the
// intent isn't lost. Instrumented (surface=custom-mock).
//
// Honest size (25 Sep 2026): a free-text mock titled "25Q" held 3
// questions and the student found out inside the player. /api/mocks now
// titles it with the real number and returns requestedCount + shortLine;
// when the set holds fewer than asked we say so here, with a Start link and
// the topic builder as the alternative, instead of redirecting straight in.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const COUNTS = [10, 25, 50] as const;
const DIFFS = ["Mixed", "Easy", "Medium", "Hard"] as const;

function track(cta: string, extra?: Record<string, unknown>) {
  try {
    navigator.sendBeacon?.(
      "/api/analytics",
      new Blob(
        [JSON.stringify({
          kind: "CTA_CLICKED",
          path: typeof location !== "undefined" ? location.pathname : "/",
          props: { cta, surface: "custom-mock", ...extra },
        })],
        { type: "application/json" },
      ),
    );
  } catch { /* best-effort */ }
}

export function CustomMockBuilder({ examCode }: { examCode: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [count, setCount] = useState<number>(25);
  const [diff, setDiff] = useState<(typeof DIFFS)[number]>("Mixed");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Set when the mock holds fewer questions than asked.
  const [short, setShort] = useState<{ id: string; count: number; requested: number } | null>(null);

  async function build() {
    setBusy(true);
    setErr(null);
    setShort(null);
    const instruction = text.trim();
    track("custom-mock-build", { hasInstruction: instruction.length > 0, count, diff });
    // Free-text → USER_REQUEST (API cap 50); no text → ADAPTIVE sized as chosen.
    const request = instruction
      ? {
          type: "USER_REQUEST" as const,
          instruction:
            diff === "Mixed" ? instruction : `${instruction} — ${diff.toLowerCase()} difficulty`,
          questionCount: Math.min(count, 50),
        }
      : { type: "ADAPTIVE" as const, questionCount: count };
    try {
      const res = await fetch("/api/mocks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ examCode, request }),
      });
      if (res.status === 401) {
        window.location.href = `/login?callbackUrl=${encodeURIComponent(`/exams/${examCode}#custom-mock`)}`;
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.mock?.id) {
        setErr(data?.error ?? "Couldn't build that mock — try rephrasing or pick a smaller size.");
        setBusy(false);
        return;
      }
      const got = Number(data.mock.questionCount ?? 0);
      if (got > 0 && got < request.questionCount) {
        setShort({ id: data.mock.id, count: got, requested: request.questionCount });
        setBusy(false);
        return;
      }
      router.push(`/mocks/${data.mock.id}`);
    } catch {
      setErr("Network hiccup — try again.");
      setBusy(false);
    }
  }

  const chip = (on: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
      on ? "border-saffron-500 bg-saffron-500 text-white" : "border-ink-300 bg-white text-ink-700 hover:border-saffron-400"
    }`;

  return (
    <div className="rounded-xl border-2 border-saffron-200 bg-white p-4 sm:p-5">
      <input
        type="text"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setShort(null);
        }}
        maxLength={200}
        placeholder="What do you want to practice? e.g. 'Percentage and Profit & Loss' — or leave blank for your weak topics"
        className="w-full rounded-lg border border-ink-300 px-3 py-2.5 text-sm focus:border-saffron-500 focus:outline-none"
      />
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Questions</span>
          {COUNTS.map((c) => (
            <button key={c} type="button" onClick={() => { setCount(c); setShort(null); }} className={chip(count === c)}>{c}</button>
          ))}
        </div>
        {/* 26 Sep 2026: flex-wrap — at 360 px the label plus four chips ran
            10 px past the screen and widened the whole exam page on phones. */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Difficulty</span>
          {DIFFS.map((d) => (
            <button key={d} type="button" onClick={() => { setDiff(d); setShort(null); }} className={chip(diff === d)}>{d}</button>
          ))}
        </div>
      </div>
      {short ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-ink-800">
            Only {short.count} {short.count === 1 ? "question was" : "questions were"} found for this request, so this mock
            has {short.count}, not {short.requested}.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              href={`/mocks/${short.id}`}
              className="inline-flex items-center justify-center rounded-lg bg-saffron-500 px-4 py-2 text-sm font-bold text-white hover:bg-saffron-600"
            >
              Start the {short.count}-question mock →
            </Link>
            <Link href={`/exams/${examCode}/build-mock`} prefetch={false} className="text-xs font-medium text-saffron-700 hover:underline">
              Pick topics and see how many questions each has →
            </Link>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={build}
          disabled={busy}
          className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-saffron-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
        >
          {busy ? "Building your mock…" : "Generate my mock →"}
        </button>
      )}
      {err && <p className="mt-2 text-xs text-rose-700">{err}</p>}
    </div>
  );
}
