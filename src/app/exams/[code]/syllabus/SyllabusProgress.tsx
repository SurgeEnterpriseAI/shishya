"use client";

// Syllabus checkmarks — progressive enhancement over the server-rendered
// (ISR-cached, SEO-indexed) topic list. For a signed-in student this
// fetches their per-topic state once and:
//   • renders a summary bar ("You've studied X of Y · N mastered")
//   • stamps a status badge onto each topic card via its
//     data-syllabus-topic attribute (✅ mastered · ✓ done · ● studying)
// Signed-out or JS-off: the plain list renders untouched.

import { useEffect, useState } from "react";

type TState = { read: boolean; completed: boolean; mastery: number | null };

export function SyllabusProgress({ examCode, totalTopics }: { examCode: string; totalTopics: number }) {
  const [summary, setSummary] = useState<{ studied: number; done: number; mastered: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await fetch("/api/auth/session").then((r) => (r.ok ? r.json() : null));
        if (cancelled || !s?.user) return;
        const p = await fetch(`/api/me/topic-progress?exam=${encodeURIComponent(examCode)}`).then((r) =>
          r.ok ? r.json() : null,
        );
        if (cancelled || !p?.topics) return;
        const topics = p.topics as Record<string, TState>;
        let studied = 0, done = 0, mastered = 0;
        for (const [code, st] of Object.entries(topics)) {
          const isMastered = st.mastery != null && st.mastery >= 0.7;
          if (st.read || st.mastery != null) studied++;
          if (st.completed) done++;
          if (isMastered) mastered++;
          const el = document.querySelector(`[data-syllabus-topic="${CSS.escape(code)}"]`);
          if (el && !el.querySelector(".syl-badge")) {
            const badge = document.createElement("span");
            badge.className = "syl-badge";
            badge.style.cssText = "margin-left:6px;font-size:11px;font-weight:600;";
            if (isMastered) {
              badge.textContent = "✅ mastered";
              badge.style.color = "#059669";
            } else if (st.completed) {
              badge.textContent = "✓ done";
              badge.style.color = "#0f766e";
            } else if (st.read) {
              badge.textContent = "● studying";
              badge.style.color = "#d97706";
            }
            if (badge.textContent) el.appendChild(badge);
          }
        }
        setSummary({ studied, done, mastered });
      } catch {
        /* enhancement only */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examCode]);

  if (!summary || summary.studied === 0) return null;
  const pct = totalTopics > 0 ? Math.round((summary.studied / totalTopics) * 100) : 0;
  return (
    <div className="mt-4 rounded-lg border border-saffron-200 bg-saffron-50/60 px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold text-ink-900">
          Your progress: {summary.studied}/{totalTopics} topics studied
          {summary.mastered > 0 && <span className="ml-1.5 text-emerald-700">· {summary.mastered} mastered ✅</span>}
        </span>
        <span className="tabular-nums font-bold text-saffron-700">{pct}%</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-saffron-400" style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
    </div>
  );
}
