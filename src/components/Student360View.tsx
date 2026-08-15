// Shared Student-360 renderer — the whole aspirant on one screen.
// Server component; consumed by /me/report (self), the mentor screen
// (consent-gated), and future educator drill-downs. Audience-aware copy:
// `viewer="self"` speaks to the aspirant, `viewer="mentor"` about them.

import type { Student360 } from "@/lib/student-360";

function Bar({ v }: { v: number }) {
  const pct = Math.round(v * 100);
  const tone = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="h-2 w-full rounded-full bg-ink-100">
      <div className={`h-2 rounded-full ${tone}`} style={{ width: `${Math.max(4, pct)}%` }} />
    </div>
  );
}

export function Student360View({ p, viewer = "self" }: { p: Student360; viewer?: "self" | "mentor" }) {
  const you = viewer === "self";
  const name = you ? "You" : p.name.split(" ")[0];
  const hours = p.studyHours;
  const peak = Object.entries(hours).sort((a, b) => b[1] - a[1])[0];
  const peakLabel =
    peak && peak[1] > 0
      ? { morning: "mornings (5–11 AM)", afternoon: "afternoons (12–4 PM)", evening: "evenings (5–9 PM)", night: "late nights (10 PM–5 AM)" }[peak[0]]
      : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-ink-900">
            {you ? "Your preparation report" : `${p.name} — preparation report`}
          </h2>
          <p className="mt-0.5 text-sm text-ink-600">
            {p.exam ? `${p.exam.short}` : "No exam picked yet"}
            {p.daysToExam != null && ` · ${p.daysToExam} days to exam`}
            {p.plan && ` · plan day ${p.plan.dayNumber}`}
            {` · on Shishya ${p.joinedDaysAgo} days`}
          </p>
        </div>
        {p.lastActiveDaysAgo != null && p.lastActiveDaysAgo > 3 && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            last active {p.lastActiveDaysAgo} days ago
          </span>
        )}
      </div>

      {p.coachRead && (
        <div className="rounded-lg border border-saffron-200 bg-saffron-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
            {you ? "Your coach's read" : "Coach's read (AI, from the data below)"}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-800">{p.coachRead}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { l: "Tests taken", v: p.totals.submitted },
          { l: "Average score", v: p.totals.avgPct != null ? `${p.totals.avgPct}%` : "—" },
          { l: "Study time", v: `${Math.round(p.totals.studyMinutes / 60)}h ${p.totals.studyMinutes % 60}m` },
          { l: "Active days (30d)", v: `${p.totals.activeDaysLast30}/30` },
        ].map((c) => (
          <div key={c.l} className="rounded-lg border border-ink-100 bg-white p-3">
            <p className="text-xs text-ink-500">{c.l}</p>
            <p className="mt-0.5 text-xl font-bold text-ink-900">{c.v}</p>
          </div>
        ))}
      </div>

      {p.scoreTrend.length > 1 && (
        <div>
          <p className="text-sm font-semibold text-ink-800">Score trend (last {p.scoreTrend.length} tests)</p>
          <div className="mt-2 flex items-end gap-1.5" style={{ height: 72 }}>
            {p.scoreTrend.map((s, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1" title={`${s.d} · ${s.exam} · ${s.pct}%`}>
                <div
                  className={`w-full rounded-t ${s.pct >= 60 ? "bg-emerald-400" : s.pct >= 35 ? "bg-amber-400" : "bg-red-300"}`}
                  style={{ height: `${Math.max(6, s.pct * 0.6)}px` }}
                />
                <span className="text-[9px] text-ink-400">{s.pct}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {p.subjects.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-ink-800">Subject mastery</p>
          <div className="mt-2 space-y-2">
            {p.subjects.map((s) => (
              <div key={s.name} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-sm text-ink-700">{s.name}</span>
                <Bar v={s.mastery} />
                <span className="w-10 shrink-0 text-right text-xs font-medium text-ink-600">
                  {Math.round(s.mastery * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {p.weakTopics.length > 0 && (
          <div className="rounded-lg border border-red-100 bg-red-50/50 p-4">
            <p className="text-sm font-semibold text-ink-800">
              {you ? "Your biggest opportunities" : "Biggest opportunities"}
            </p>
            <ul className="mt-2 space-y-1.5">
              {p.weakTopics.map((t) => (
                <li key={t.name} className="flex justify-between gap-2 text-sm">
                  <span className="text-ink-700">{t.name}</span>
                  <span className="shrink-0 text-xs font-medium text-red-600">{Math.round(t.mastery * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {p.strongTopics.length > 0 && (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4">
            <p className="text-sm font-semibold text-ink-800">Strengths to bank on</p>
            <ul className="mt-2 space-y-1.5">
              {p.strongTopics.map((t) => (
                <li key={t.name} className="flex justify-between gap-2 text-sm">
                  <span className="text-ink-700">{t.name}</span>
                  <span className="shrink-0 text-xs font-medium text-emerald-700">{Math.round(t.mastery * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-ink-100 bg-white p-4">
          <p className="text-sm font-semibold text-ink-800">Study rhythm (30 days)</p>
          <p className="mt-1 text-sm text-ink-600">
            {peakLabel
              ? `${name} ${you ? "study" : "studies"} mostly in ${peakLabel}.`
              : "Not enough activity yet to see a rhythm."}
          </p>
          {p.revisionDue > 0 && (
            <p className="mt-2 text-sm text-ink-600">
              <span className="font-semibold text-amber-700">{p.revisionDue} topics</span> due for revision in the mistake notebook.
            </p>
          )}
          {p.plan && (
            <p className="mt-2 text-sm text-ink-600">
              Coach plan: {p.plan.dailyMinutes} min/day commitment · {p.plan.briefsRead7d}/7 daily briefs this week.
            </p>
          )}
        </div>
        {p.tutorThemes.length > 0 && (
          <div className="rounded-lg border border-ink-100 bg-white p-4">
            <p className="text-sm font-semibold text-ink-800">
              {you ? "What you've been asking the tutor" : "Recent tutor questions"}
            </p>
            <ul className="mt-2 space-y-1.5">
              {p.tutorThemes.slice(0, 4).map((q, i) => (
                <li key={i} className="truncate text-sm text-ink-600">“{q}”</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
