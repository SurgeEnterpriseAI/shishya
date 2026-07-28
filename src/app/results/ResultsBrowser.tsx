"use client";

// Client browser for /results — instant search by exam name + one-tap
// category chips. All filtering is local (rows already loaded), so it
// feels instant on any connection.

import { useMemo, useState } from "react";
import Link from "next/link";

export interface ResultRow {
  id: string;
  stage: string;
  headline: string;
  declaredOn: string; // ISO
  officialUrl: string | null;
  officialName: string | null;
  cutoffNote: string | null;
  nextSteps: { step: string; note: string }[] | null;
  code: string;
  short: string;
  category: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  GOVT_JOBS: "Govt jobs",
  BANKING: "Banking",
  CIVIL_SERVICES: "Civil services",
  TEACHING: "Teaching",
  STATE_LEVEL: "State exams",
  ENGINEERING: "Engineering",
  MEDICAL: "Medical",
  UNIVERSITY: "University",
  MBA: "MBA",
  LAW: "Law",
  OLYMPIAD: "Olympiad",
};

export function ResultsBrowser({ rows }: { rows: ResultRow[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  const cats = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.category, (m.get(r.category) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!cat || r.category === cat) &&
        (!needle ||
          r.short.toLowerCase().includes(needle) ||
          r.code.toLowerCase().includes(needle) ||
          r.headline.toLowerCase().includes(needle) ||
          r.stage.toLowerCase().includes(needle)),
    );
  }, [rows, q, cat]);

  const weekAgo = Date.now() - 7 * 86_400_000;
  const thisWeek = filtered.filter((r) => new Date(r.declaredOn).getTime() >= weekAgo);
  const earlier = filtered.filter((r) => new Date(r.declaredOn).getTime() < weekAgo);

  const card = (r: ResultRow) => (
    <div key={r.id} id={r.id} className="scroll-mt-24 rounded-xl border border-ink-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-base font-bold text-ink-900">
          <Link href={`/exams/${r.code}`} className="hover:text-saffron-700">
            {r.short}
          </Link>{" "}
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-800">
            🎉 {r.stage} declared
          </span>
        </p>
        <span className="text-xs tabular-nums text-ink-500">
          {new Date(r.declaredOn).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>
      <Link
        href={`/exams/${r.code}/results/${r.id}`}
        className="mt-1.5 block text-sm leading-relaxed text-ink-700 hover:text-saffron-800"
      >
        {r.headline}
      </Link>

      {r.cutoffNote && (
        <p className="mt-3 rounded-lg bg-saffron-50/70 px-3 py-2 text-sm leading-relaxed text-ink-800">
          <span className="font-semibold text-saffron-800">Cutoff read:</span> {r.cutoffNote}
        </p>
      )}

      {Array.isArray(r.nextSteps) && r.nextSteps.length > 0 && (
        <details className="group mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-saffron-700 hover:underline">
            Your next steps ({r.nextSteps.length}) ↓
          </summary>
          <ol className="mt-2 space-y-2 border-l-2 border-saffron-200 pl-4">
            {r.nextSteps.map((s, i) => (
              <li key={i} className="text-sm leading-relaxed">
                <span className="font-semibold text-ink-900">{s.step}</span>
                {s.note && <span className="text-ink-600"> — {s.note}</span>}
              </li>
            ))}
          </ol>
        </details>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {r.officialUrl && (
          <a
            href={r.officialUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="rounded-lg bg-ink-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-ink-900"
          >
            Official portal ↗
          </a>
        )}
        <Link
          href={`/exams/${r.code}/results/${r.id}`}
          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
        >
          Full details &amp; next steps →
        </Link>
        <Link
          href={`/exams/${r.code}/cutoff`}
          className="rounded-lg border border-ink-300 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:border-saffron-400"
        >
          Category-wise cutoffs
        </Link>
        <Link
          href={`/exams/${r.code}`}
          className="rounded-lg border border-saffron-300 bg-saffron-50 px-3 py-1.5 text-xs font-semibold text-saffron-800 hover:bg-saffron-100"
        >
          Prepare free →
        </Link>
      </div>
      <p className="mt-2 text-[11px] text-ink-400">
        Always verify on the official portal{r.officialName ? ` (${r.officialName})` : ""} before
        acting.
      </p>
    </div>
  );

  return (
    <div className="mt-5">
      {/* Search + category filter */}
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search your exam — SSC, NEET, Police, TET…"
        className="w-full max-w-md rounded-lg border border-ink-300 bg-white px-4 py-2.5 text-sm text-ink-900 outline-none focus:border-emerald-400"
      />
      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setCat(null)}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            cat === null ? "bg-emerald-500 text-white" : "border border-ink-300 bg-white text-ink-600 hover:border-emerald-400"
          }`}
        >
          All ({rows.length})
        </button>
        {cats.map(([c, n]) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(cat === c ? null : c)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              cat === c ? "bg-emerald-500 text-white" : "border border-ink-300 bg-white text-ink-600 hover:border-emerald-400"
            }`}
          >
            {CATEGORY_LABELS[c] ?? c} ({n})
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-ink-300 bg-white px-4 py-10 text-center text-sm text-ink-500">
          No results match — try a shorter search, or check back tomorrow morning.
        </div>
      )}

      {thisWeek.length > 0 && (
        <>
          <h2 className="mt-6 text-base font-bold text-ink-900">This week</h2>
          <div className="mt-3 space-y-4">{thisWeek.map(card)}</div>
        </>
      )}
      {earlier.length > 0 && (
        <>
          <h2 className="mt-8 text-base font-bold text-ink-900">Earlier</h2>
          <div className="mt-3 space-y-4">{earlier.map(card)}</div>
        </>
      )}
    </div>
  );
}
