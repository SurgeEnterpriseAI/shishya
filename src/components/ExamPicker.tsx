"use client";

// Search-driven exam picker. Single client component that owns:
//   - the search input (filters by name/shortName/code)
//   - the category chip row (filters by category)
//   - the filtered grid of exam cards
//
// All data is passed in as props (server-rendered list) so the page works
// even when JS is slow to hydrate.

import Link from "next/link";
import { useMemo, useState } from "react";

export interface ExamCard {
  code: string;
  name: string;
  shortName: string;
  category: string;
  candidatesPerYear?: number | null;
  /** True when there's at least 1 validated question for this exam in the DB. */
  live: boolean;
}

interface Labels {
  searchPlaceholder: string;
  searchLabel: string;
  noResults: string;
  catAll: string;
  /** Map of category enum → translated chip label. Missing keys fall back to enum value. */
  catLabels: Record<string, string>;
  statusLive: string;
  statusComing: string;
  candidatesPerYear: string;
}

export function ExamPicker({
  exams,
  labels,
  signedIn,
}: {
  exams: ExamCard[];
  labels: Labels;
  signedIn: boolean;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  // Build distinct category list from input data — preserves natural ordering of the source.
  const categories = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const e of exams) {
      if (!seen.has(e.category)) {
        seen.add(e.category);
        out.push(e.category);
      }
    }
    return out;
  }, [exams]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return exams.filter((e) => {
      if (cat && e.category !== cat) return false;
      if (!needle) return true;
      const hay = `${e.name} ${e.shortName} ${e.code} ${e.category}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [exams, q, cat]);

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* ── Search input ─────────────────────────────────────────────── */}
      <label className="sr-only" htmlFor="exam-search">
        {labels.searchLabel}
      </label>
      <div className="relative">
        <SearchIcon />
        <input
          id="exam-search"
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={labels.searchPlaceholder}
          autoComplete="off"
          className="w-full rounded-xl border border-ink-300 bg-white py-4 pl-12 pr-4 text-base shadow-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200 sm:text-lg"
        />
      </div>

      {/* ── Category chips ──────────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Chip selected={cat === null} onClick={() => setCat(null)}>
          {labels.catAll}
        </Chip>
        {categories.map((c) => (
          <Chip key={c} selected={cat === c} onClick={() => setCat(cat === c ? null : c)}>
            {labels.catLabels[c] ?? c}
          </Chip>
        ))}
      </div>

      {/* ── Result grid ─────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-ink-500">{labels.noResults}</p>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => {
            const href = signedIn
              ? `/exams/${e.code}`
              : `/api/auth/signin/google?callbackUrl=${encodeURIComponent(`/exams/${e.code}`)}`;
            return (
              <li key={e.code}>
                <Link
                  href={href}
                  className="group flex h-full items-start justify-between rounded-lg border border-ink-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-saffron-400 hover:shadow-md"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-900">{e.shortName}</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {labels.catLabels[e.category] ?? e.category}
                      {e.candidatesPerYear ? ` · ${formatVolume(e.candidatesPerYear)} ${labels.candidatesPerYear}` : ""}
                    </p>
                  </div>
                  <span
                    className={
                      e.live
                        ? "shrink-0 rounded-full bg-saffron-100 px-2 py-0.5 text-xs font-medium text-saffron-800"
                        : "shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-600"
                    }
                  >
                    {e.live ? labels.statusLive : labels.statusComing}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Bits & pieces
// ─────────────────────────────────────────────────────────────────────────
function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        selected
          ? "rounded-full bg-saffron-500 px-4 py-1.5 text-xs font-medium text-white shadow-sm"
          : "rounded-full border border-ink-200 bg-white px-4 py-1.5 text-xs font-medium text-ink-700 hover:border-saffron-400 hover:text-saffron-700"
      }
    >
      {children}
    </button>
  );
}

function SearchIcon() {
  return (
    <svg
      className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.2-5.2M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
    </svg>
  );
}

function formatVolume(n: number): string {
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(n % 10_000_000 === 0 ? 0 : 1)}Cr`;
  if (n >= 100_000) return `${Math.round(n / 100_000)}L`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}
