"use client";

// The mastery-loop panel on every topic page — makes the study→test→
// re-study cycle visible and resumable:
//   • auto-stamps "read" when a signed-in student opens the notes
//   • shows their mastery meter for THIS topic (from real test data)
//   • "Mark topic done" (explicit completion — endowed progress)
//   • "Test me (10 Qs)" → topic mock → weakness map updates → the meter
//     moves — the loop closes.
// Renders nothing for signed-out visitors (page stays clean + cached).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function TopicMasteryPanel({
  examCode,
  topicCode,
  topicName,
}: {
  examCode: string;
  topicCode: string;
  topicName: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<{ read: boolean; completed: boolean; mastery: number | null } | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState<"" | "complete" | "test">("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await fetch("/api/auth/session").then((r) => (r.ok ? r.json() : null));
        if (cancelled || !s?.user) return;
        setSignedIn(true);
        // Auto-stamp "read" — opening the notes IS studying; no extra tap.
        fetch("/api/me/topic-progress", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ examCode, topicCode, action: "read" }),
        }).catch(() => {});
        const p = await fetch(`/api/me/topic-progress?exam=${encodeURIComponent(examCode)}`).then((r) =>
          r.ok ? r.json() : null,
        );
        if (cancelled) return;
        const t = p?.topics?.[topicCode];
        setState({ read: true, completed: Boolean(t?.completed), mastery: t?.mastery ?? null });
      } catch {
        /* panel is best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examCode, topicCode]);

  if (!signedIn || !state) return null;

  const masteryPct = state.mastery != null ? Math.round(state.mastery * 100) : null;
  const mastered = masteryPct != null && masteryPct >= 70;

  async function markComplete() {
    setBusy("complete");
    try {
      await fetch("/api/me/topic-progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ examCode, topicCode, action: state!.completed ? "uncomplete" : "complete" }),
      });
      setState((s) => (s ? { ...s, completed: !s.completed } : s));
    } catch {
      /* ignore */
    }
    setBusy("");
  }

  async function testMe() {
    setBusy("test");
    setErr(null);
    try {
      const res = await fetch("/api/mocks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ examCode, request: { type: "TOPIC", topicCode, questionCount: 10 } }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.mock?.id) {
        setErr(data?.error ?? "Couldn't build the test — try again.");
        setBusy("");
        return;
      }
      router.push(`/mocks/${data.mock.id}`);
    } catch {
      setErr("Network hiccup — try again.");
      setBusy("");
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-ink-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-ink-900">
          {mastered ? "✅ Mastered" : masteryPct != null ? "📈 Your mastery" : "📖 Studying"} · {topicName}
        </p>
        {masteryPct != null && (
          <span className={`text-sm font-bold tabular-nums ${mastered ? "text-emerald-700" : "text-saffron-700"}`}>
            {masteryPct}%
          </span>
        )}
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-100">
        <div
          className={`h-full rounded-full transition-all ${mastered ? "bg-emerald-500" : "bg-saffron-400"}`}
          style={{ width: `${Math.max(3, masteryPct ?? 3)}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-ink-500">
        {masteryPct == null
          ? "Read the notes, then test yourself — your score here builds your mastery meter."
          : mastered
            ? "Strong. Retest occasionally so it stays sharp — spaced practice locks it in."
            : "Study the notes above, then retest — beat 70% and this topic turns green."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={testMe}
          disabled={busy !== ""}
          className="inline-flex items-center rounded-lg bg-saffron-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600 disabled:cursor-wait disabled:opacity-70"
        >
          {busy === "test" ? "Building…" : mastered ? "Retest me (10 Qs) →" : "Test me (10 Qs) →"}
        </button>
        <button
          type="button"
          onClick={markComplete}
          disabled={busy !== ""}
          className={`inline-flex items-center rounded-lg border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-70 ${
            state.completed
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-ink-300 bg-white text-ink-700 hover:border-saffron-400"
          }`}
        >
          {state.completed ? "✓ Marked done" : "Mark topic done"}
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-rose-700">{err}</p>}
    </div>
  );
}
