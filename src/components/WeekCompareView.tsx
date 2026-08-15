// This-week vs last-week — honest deltas from attempt history, plus the
// "what to change" read. Shared by /me/report and the print page.

import type { WeekCompare } from "@/lib/student-week-compare";

function delta(a: number | null, b: number | null): string {
  if (a == null || b == null) return "";
  const d = a - b;
  return d > 0 ? ` (▲ +${d})` : d < 0 ? ` (▼ ${d})` : " (=)";
}

export function WeekCompareView({ wk }: { wk: WeekCompare }) {
  const t = wk.thisWeek, l = wk.lastWeek;
  const hasAny = t.mocks > 0 || l.mocks > 0;
  if (!hasAny) return null;

  const improving = wk.subjects.filter((s) => s.thisPct != null && s.lastPct != null && s.thisPct > s.lastPct);
  const slipping = wk.subjects.filter((s) => s.thisPct != null && s.lastPct != null && s.thisPct < s.lastPct);
  const focus = wk.subjects.filter((s) => s.thisPct != null).slice(0, 2);

  return (
    <div>
      <p className="text-sm font-semibold text-ink-800">This week vs last week</p>
      <table className="mt-2 w-full text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-500">
            <th className="py-1.5"></th>
            <th className="py-1.5 text-right">This week</th>
            <th className="py-1.5 text-right">Last week</th>
          </tr>
        </thead>
        <tbody className="text-ink-700">
          <tr><td className="py-1">Tests completed</td><td className="text-right font-medium">{t.mocks}{delta(t.mocks, l.mocks)}</td><td className="text-right">{l.mocks}</td></tr>
          <tr><td className="py-1">Average score</td><td className="text-right font-medium">{t.avgPct != null ? `${t.avgPct}%` : "—"}{delta(t.avgPct, l.avgPct)}</td><td className="text-right">{l.avgPct != null ? `${l.avgPct}%` : "—"}</td></tr>
          <tr><td className="py-1">Days practised</td><td className="text-right font-medium">{t.activeDays}{delta(t.activeDays, l.activeDays)}</td><td className="text-right">{l.activeDays}</td></tr>
          <tr><td className="py-1">Study minutes</td><td className="text-right font-medium">{t.studyMinutes}{delta(t.studyMinutes, l.studyMinutes)}</td><td className="text-right">{l.studyMinutes}</td></tr>
          <tr><td className="py-1">Tutor questions</td><td className="text-right font-medium">{t.tutorQuestions}{delta(t.tutorQuestions, l.tutorQuestions)}</td><td className="text-right">{l.tutorQuestions}</td></tr>
        </tbody>
      </table>

      {wk.subjects.length > 0 && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Subject accuracy (this vs last week)</p>
            <ul className="mt-1 space-y-1 text-sm text-ink-700">
              {wk.subjects.slice(0, 6).map((s) => (
                <li key={s.name} className="flex justify-between gap-2">
                  <span className="truncate">{s.name}</span>
                  <span className="shrink-0 font-medium">
                    {s.thisPct != null ? `${s.thisPct}%` : "—"}
                    <span className="text-ink-400"> ← {s.lastPct != null ? `${s.lastPct}%` : "—"}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg bg-ink-50 p-3 text-sm text-ink-700">
            <p className="font-semibold text-ink-800">What to change next week</p>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              {focus.length > 0 && (
                <li>Give {focus.map((s) => s.name).join(" and ")} the first hour of each study day — {focus.length > 1 ? "they're" : "it's"} your lowest-accuracy area{focus.length > 1 ? "s" : ""} right now.</li>
              )}
              {slipping.length > 0 && <li>{slipping.map((s) => s.name).join(", ")} slipped vs last week — one revision test each brings them back.</li>}
              {improving.length > 0 && <li>Keep doing whatever you did for {improving.map((s) => s.name).join(", ")} — it's working.</li>}
              {t.activeDays < 5 && <li>Consistency beats volume: aim for {Math.min(7, t.activeDays + 2)} practice days next week.</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
