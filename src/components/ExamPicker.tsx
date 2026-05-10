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
  /** ISO state code for STATE_LEVEL exams ("TN", "KA", ...); null otherwise. */
  state?: string | null;
  /** Curated tags driving the homepage chip filter. Computed server-side. */
  tags: string[];
}

export interface StateInfo {
  code: string;
  name: string;
  type: "state" | "ut";
  native?: string;
  examCount: number;
}

interface Labels {
  searchPlaceholder: string;
  searchLabel: string;
  noResults: string;
  catAll: string;
  /** Map of tag id → translated chip label. Missing keys fall back to the id. */
  tagLabels: Record<string, string>;
  /** Ordered list of tags to render as chips. */
  tagOrder: string[];
  /** Map of category enum → translated label (used for the small subtitle on each card). */
  catLabels: Record<string, string>;
  statusLive: string;
  statusComing: string;
  candidatesPerYear: string;
  pickState: string;
  pickStateBack: string;
  examsConductedBy: string;
}

export function ExamPicker({
  exams,
  states,
  labels,
  signedIn,
}: {
  exams: ExamCard[];
  states?: StateInfo[];
  labels: Labels;
  signedIn: boolean;
}) {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [pickedState, setPickedState] = useState<string | null>(null);

  // Only render chips for tags that actually appear in the data — otherwise
  // we'd show empty chips like "Polytechnic" on a homepage that has no
  // polytechnic exams seeded yet.
  const visibleTags = useMemo(() => {
    const present = new Set<string>();
    for (const e of exams) for (const t of e.tags ?? []) present.add(t);
    return labels.tagOrder.filter((t) => present.has(t));
  }, [exams, labels.tagOrder]);

  const inStateFlow = tag === "state";
  const showStateGrid = inStateFlow && !pickedState;

  // Reset state pick when leaving the State tag
  if (!inStateFlow && pickedState) setPickedState(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return exams.filter((e) => {
      if (tag && !(e.tags ?? []).includes(tag)) return false;
      if (inStateFlow && pickedState && e.state !== pickedState) return false;
      if (!needle) return true;
      const hay = `${e.name} ${e.shortName} ${e.code} ${e.category} ${e.state ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [exams, q, tag, inStateFlow, pickedState]);

  const filteredStates = useMemo(() => {
    if (!states) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return states;
    return states.filter((s) => `${s.name} ${s.native ?? ""} ${s.code}`.toLowerCase().includes(needle));
  }, [states, q]);

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

      {/* ── Tag chips ───────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Chip selected={tag === null} onClick={() => { setTag(null); setPickedState(null); }}>
          {labels.catAll}
        </Chip>
        {visibleTags.map((t) => (
          <Chip key={t} selected={tag === t} onClick={() => { setTag(tag === t ? null : t); setPickedState(null); }}>
            {labels.tagLabels[t] ?? t}
          </Chip>
        ))}
      </div>

      {/* ── State flow: state grid (level 1 of state navigation) ─────── */}
      {showStateGrid && states && states.length > 0 ? (
        <>
          <p className="mt-8 text-center text-sm font-medium text-ink-700">{labels.pickState}</p>
          {filteredStates.length === 0 ? (
            <p className="mt-6 text-center text-sm text-ink-500">{labels.noResults}</p>
          ) : (
            <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {filteredStates.map((s) => (
                <li key={s.code}>
                  <button
                    type="button"
                    onClick={() => setPickedState(s.code)}
                    disabled={s.examCount === 0}
                    className="group flex w-full items-start justify-between gap-2 rounded-lg border border-ink-200 bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-saffron-400 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:border-ink-200 disabled:hover:shadow-none"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-900">{s.name}</p>
                      {s.native && (
                        <p className="mt-0.5 truncate text-xs text-ink-500">{s.native}</p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium tabular-nums text-ink-700">
                      {s.examCount}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}

      {/* ── State flow: exam list for picked state (level 2) ─────────── */}
      {inStateFlow && pickedState ? (
        <div className="mt-8 mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPickedState(null)}
            className="text-xs font-medium text-saffron-700 hover:text-saffron-800"
          >
            ← {labels.pickStateBack}
          </button>
          <p className="text-xs text-ink-500">
            {labels.examsConductedBy}{" "}
            <span className="font-medium text-ink-800">
              {states?.find((s) => s.code === pickedState)?.name ?? pickedState}
            </span>
          </p>
        </div>
      ) : null}

      {/* ── Result grid ─────────────────────────────────────────────── */}
      {showStateGrid ? null : filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-ink-500">{labels.noResults}</p>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => {
            const href = signedIn
              ? `/exams/${e.code}`
              : `/login?callbackUrl=${encodeURIComponent(`/exams/${e.code}`)}`;
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
