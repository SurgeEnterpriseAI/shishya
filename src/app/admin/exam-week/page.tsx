// /admin/exam-week — Exam Week Mode readout (6 Sep 2026, wave 2).
//
// No cron, no cache: the founder opens it and the numbers are computed
// then (src/lib/exam-week-stats.ts, sequential raw SQL). Two plain tables:
//   1. every exam the shared state machine has in phase week…post right
//      now — phase, tier, people on its pages per day D-7..D+3, cutoff
//      landers on D0, verdict taps + tally, alert sign-ups, enrolments,
//      shift dates set, eve / day-after / result-day sends, D+1 return;
//   2. the same columns for every exam day 8–30 days ago, so the curve of
//      finished exam days is visible next to the live ones.
// Every date carries its tier word; the tally is printed only from n >= 10
// and is a mood reading, never a prediction. Admin-only, English, no JS.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { isCurrentUserAdmin } from "@/lib/admin";
import { VERDICT_MIN_N, tallyPercents } from "@/lib/exam-verdict";
import { DAY_OFFSETS, loadExamWeekStats, type ExamWeekStatRow } from "@/lib/exam-week-stats";

export const dynamic = "force-dynamic";

const PHASE_LABEL: Record<ExamWeekStatRow["phase"], string> = {
  none: "—",
  week: "week",
  eve: "eve",
  "today-am": "today (am)",
  "today-pm": "today (pm)",
  window: "window",
  post: "post",
  past: "past",
};

function fmtDay(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}

function num(n: number | null): string {
  return n == null ? "–" : n.toLocaleString("en-IN");
}

function offsetLabel(off: number): string {
  return off === 0 ? "D0" : off > 0 ? `D+${off}` : `D${off}`;
}

function tally(r: ExamWeekStatRow): string {
  const v = r.verdicts;
  if (v.n === 0) return "–";
  if (v.n < VERDICT_MIN_N) return `${v.n} (n<${VERDICT_MIN_N})`;
  const p = tallyPercents({ ...v, sections: [] });
  return `${v.n} · ${p.easy}/${p.moderate}/${p.tough}`;
}

function Table({ rows, emptyText }: { rows: ExamWeekStatRow[]; emptyText: string }) {
  if (rows.length === 0) {
    return (
      <p className="mt-3 rounded-md border border-dashed border-ink-300 bg-white px-4 py-5 text-sm text-ink-500">{emptyText}</p>
    );
  }
  const th = "px-2 py-1.5 text-right font-medium whitespace-nowrap";
  const td = "px-2 py-1 text-right tabular-nums whitespace-nowrap";
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-ink-200 bg-white">
      <table className="w-full min-w-[1400px] text-xs">
        <thead>
          <tr className="border-b border-ink-200 bg-ink-50/60 text-ink-500">
            <th className="px-2 py-1.5 text-left font-medium">Exam</th>
            <th className="px-2 py-1.5 text-left font-medium">Phase</th>
            <th className="px-2 py-1.5 text-left font-medium">Tier</th>
            <th className="px-2 py-1.5 text-left font-medium whitespace-nowrap">D0 (window)</th>
            {DAY_OFFSETS.map((off) => (
              <th key={off} className={`${th} ${off === 0 ? "bg-saffron-50 text-saffron-900" : ""}`}>
                {offsetLabel(off)}
              </th>
            ))}
            <th className={th} title="People on /exams/{code}/cutoff on D0">
              Cutoff D0
            </th>
            <th className={th} title="Of those, people whose first exam-page view on D0 was the cutoff page">
              Landers
            </th>
            <th className={th} title="Verdict taps · easy/moderate/tough % (from n >= 10)">
              Verdicts
            </th>
            <th className={th} title="ExamAlert sign-ups created D-7..D+3">
              Alerts
            </th>
            <th className={th} title="Active enrolments">
              Enrolled
            </th>
            <th className={th} title="Active enrolments with a shift date set">
              Shift set
            </th>
            <th className={th} title="'sent:exam-eve' on the eve (via enrolment)">
              Eve
            </th>
            <th className={th} title="'sent:exam-day-after' on D+1 (via enrolment)">
              Day-after
            </th>
            <th className={th} title="'sent:result-day-*' on/after D0 (via enrolment)">
              Result
            </th>
            <th className={th} title="People on the exam's pages on D0 who had any page view on D+1">
              D+1 return
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const multi = r.windowFirst !== r.windowLast;
            const d0 = r.people[DAY_OFFSETS.indexOf(0)];
            return (
              <tr key={`${r.examId}|${r.d0}`} className="border-b border-ink-100 last:border-0">
                <td className="px-2 py-1 whitespace-nowrap">
                  <Link href={`/exams/${r.code}`} className="font-medium text-ink-900 hover:text-saffron-700">
                    {r.short}
                  </Link>
                  <span className="ml-1 text-ink-400">{r.code}</span>
                </td>
                <td className="px-2 py-1 whitespace-nowrap text-ink-700">
                  {PHASE_LABEL[r.phase]}
                  <span className="ml-1 text-ink-400">
                    ({r.daysTo === 0 ? "D0" : r.daysTo > 0 ? `in ${r.daysTo}d` : `${-r.daysTo}d ago`})
                  </span>
                </td>
                <td className={`px-2 py-1 whitespace-nowrap ${r.tier === "expected" ? "text-amber-700" : "text-ink-700"}`}>{r.tier}</td>
                <td className="px-2 py-1 whitespace-nowrap text-ink-700">
                  {fmtDay(r.d0)}
                  {multi && (
                    <span className="ml-1 text-ink-400">
                      ({fmtDay(r.windowFirst)}–{fmtDay(r.windowLast)})
                    </span>
                  )}
                </td>
                {r.people.map((n, i) => (
                  <td key={DAY_OFFSETS[i]} className={`${td} ${DAY_OFFSETS[i] === 0 ? "bg-saffron-50 font-semibold text-ink-900" : "text-ink-800"}`}>
                    {num(n)}
                  </td>
                ))}
                <td className={`${td} text-ink-800`}>{num(r.cutoffD0)}</td>
                <td className={`${td} text-ink-800`}>{num(r.cutoffLandersD0)}</td>
                <td className={`${td} text-ink-800`}>{tally(r)}</td>
                <td className={`${td} text-ink-800`}>{num(r.alerts)}</td>
                <td className={`${td} text-ink-800`}>{num(r.enrolled)}</td>
                <td className={`${td} text-ink-800`}>{num(r.shiftSet)}</td>
                <td className={`${td} text-ink-800`}>{num(r.eveSends)}</td>
                <td className={`${td} text-ink-800`}>{num(r.dayAfterSends)}</td>
                <td className={`${td} text-ink-800`}>{num(r.resultSends)}</td>
                <td className={`${td} text-ink-800`}>
                  {num(r.d1Return)}
                  {r.d1Return != null && d0 != null && d0 > 0 && (
                    <span className="ml-1 text-ink-400">({Math.round((r.d1Return / d0) * 100)}%)</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminExamWeekPage() {
  const { isAdmin } = await isCurrentUserAdmin();
  if (!isAdmin) redirect("/");

  const stats = await loadExamWeekStats();

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header admin />
      <section className="container-prose py-8">
        <p className="text-xs text-ink-500">
          <Link href="/admin" className="hover:text-ink-800">← Admin</Link> · Exam week
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900">Exam Week Mode — readout</h1>
        <p className="mt-1 text-sm text-ink-600">
          Today {fmtDay(stats.today)} (IST). Computed on open — no cron, no cache. People = identified humans
          (userId or anon cookie, bots excluded) on <code>/exams/{"{code}"}</code> and below, incl. the /hi and /te twins,
          per IST day. Tally = taps · easy/moderate/tough %, printed only from n ≥ {VERDICT_MIN_N} — a mood reading,
          not a prediction. Mail columns attribute a send to every exam the user is enrolled in that week (approximate).
        </p>

        <h2 className="mt-8 text-base font-semibold text-ink-800">
          In exam week now <span className="font-normal text-ink-500">— typed exam day within ±7 days ({stats.current.length})</span>
        </h2>
        <Table rows={stats.current} emptyText="No exam has a typed exam-day row within ±7 days of today." />

        <h2 className="mt-8 text-base font-semibold text-ink-800">
          Past exam days{" "}
          <span className="font-normal text-ink-500">
            — {fmtDay(stats.pastFromDay)} to {fmtDay(stats.pastToDay)}, one row per exam day ({stats.past.length})
          </span>
        </h2>
        <Table rows={stats.past} emptyText="No typed exam day between 8 and 30 days ago." />

        <p className="mt-4 text-xs text-ink-500">
          Tier words: official = conducting body&apos;s notice linked · reported = announced via a secondary source ·
          expected = estimate, not announced (student surfaces never treat an expected day as held). D0 for an exam inside a
          multi-day window is the state machine&apos;s focus day (latest exam day ≤ today); the window span is in brackets.
          &ldquo;–&rdquo; = that day has not started yet.
        </p>
      </section>
    </main>
  );
}
