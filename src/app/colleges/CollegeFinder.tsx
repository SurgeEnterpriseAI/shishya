// The /colleges filter chips + result list (26 Sep 2026).
//
// Shared by the server page and the client island: /colleges used to read
// searchParams on the server, which made the whole route dynamic, so its
// <title>, meta description and rel=canonical streamed into <body> for
// Googlebot (next.config.ts leaves Googlebot out of htmlLimitedBots). The
// page is now static; this component renders the unfiltered list as the
// Suspense fallback (what crawlers and first paint get), and
// CollegeFinderFromQuery re-renders it with ?stream= / ?state= / ?type=
// after hydration. No hooks and no server-only imports here — the module
// runs on both sides. The filter links are unchanged, so old shared
// /colleges?stream=… URLs keep working.

import Link from "next/link";
import {
  COLLEGES,
  ALL_STREAMS,
  type CollegeStream,
  type CollegeType,
  statesWithColleges,
  typesWithCounts,
  formatNirfRanks,
} from "@/lib/colleges-data";
import { stateInfo } from "@/lib/state-info";

export interface CollegeFilters {
  stream?: CollegeStream;
  state?: string;
  type?: CollegeType;
}

/** Filters from query values; unknown values are dropped. */
export function parseCollegeFilters(q: { stream?: string | null; state?: string | null; type?: string | null }): CollegeFilters {
  const stream = ALL_STREAMS.some((s) => s.value === q.stream) ? (q.stream as CollegeStream) : undefined;
  const state = q.state ? q.state.toUpperCase() : undefined;
  const type = typesWithCounts().some((t) => t.type === q.type) ? (q.type as CollegeType) : undefined;
  return { stream, state, type };
}

function bestRank(c: (typeof COLLEGES)[number]): number {
  return Math.min(...Object.values(c.nirf).filter((x): x is number => typeof x === "number"), 999);
}

/** Best-rank-first, then alphabetical. */
export function filterColleges({ stream, state, type }: CollegeFilters) {
  return COLLEGES.filter((c) => {
    if (stream && !c.streams.includes(stream)) return false;
    if (state && c.state !== state) return false;
    if (type && c.type !== type) return false;
    return true;
  }).sort((a, b) => bestRank(a) - bestRank(b) || a.shortName.localeCompare(b.shortName));
}

function chipClass(active: boolean): string {
  return active
    ? "inline-flex items-center rounded-full bg-saffron-500 px-3 py-1 text-xs font-medium text-white shadow-sm"
    : "inline-flex items-center rounded-full border border-ink-200 bg-white px-3 py-1 text-xs text-ink-700 hover:border-saffron-400 hover:bg-saffron-50/30";
}

export function CollegeFinder({ stream, state, type }: CollegeFilters) {
  const filtered = filterColleges({ stream, state, type });

  function chipHref(patch: Partial<CollegeFilters>) {
    const next = new URLSearchParams();
    const merged: CollegeFilters = { stream, state, type, ...patch };
    if (merged.stream) next.set("stream", merged.stream);
    if (merged.state) next.set("state", merged.state);
    if (merged.type) next.set("type", merged.type);
    const qs = next.toString();
    return qs ? `/colleges?${qs}` : "/colleges";
  }

  const stateChips = statesWithColleges().sort((a, b) => {
    const an = COLLEGES.filter((c) => c.state === a).length;
    const bn = COLLEGES.filter((c) => c.state === b).length;
    return bn - an;
  });

  return (
    <>
      {/* Stream filter */}
      <div className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">By stream</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link href={chipHref({ stream: undefined })} className={chipClass(!stream)}>
            All streams
          </Link>
          {ALL_STREAMS.map((s) => {
            const n = COLLEGES.filter((c) => c.streams.includes(s.value)).length;
            if (n === 0) return null;
            return (
              <Link
                key={s.value}
                href={chipHref({ stream: stream === s.value ? undefined : s.value })}
                className={chipClass(stream === s.value)}
              >
                {s.label} <span className="ml-1 text-[10px] opacity-70">{n}</span>
              </Link>
            );
          })}
        </div>
        {stream && (
          <p className="mt-2 text-[11px] text-ink-500">
            Tip:{" "}
            <Link href={`/colleges/stream/${stream}`} className="text-saffron-700 underline">
              jump to the dedicated {ALL_STREAMS.find((s) => s.value === stream)?.label} page
            </Link>{" "}
            for a NIRF-ranked ordered list.
          </p>
        )}
      </div>

      {/* Type filter */}
      <div className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">By type</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link href={chipHref({ type: undefined })} className={chipClass(!type)}>All types</Link>
          {typesWithCounts().map((t) => (
            <Link
              key={t.type}
              href={chipHref({ type: type === t.type ? undefined : t.type })}
              className={chipClass(type === t.type)}
            >
              {t.type} <span className="ml-1 text-[10px] opacity-70">{t.n}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* State filter */}
      <div className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">By state</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link href={chipHref({ state: undefined })} className={chipClass(!state)}>All India</Link>
          {stateChips.map((c) => {
            const n = COLLEGES.filter((coll) => coll.state === c).length;
            const st = stateInfo(c);
            return (
              <Link
                key={c}
                href={chipHref({ state: state === c ? undefined : c })}
                className={chipClass(state === c)}
                title={st?.nativeName}
              >
                {st?.name ?? c} <span className="ml-1 text-[10px] opacity-70">{n}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Filter summary */}
      {(stream || state || type) && (
        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-md border border-saffron-200 bg-saffron-50/60 px-3 py-2 text-xs text-ink-700">
          <span className="font-medium">{filtered.length} match</span>
          {stream && <span className="rounded bg-white px-2 py-0.5">stream: {ALL_STREAMS.find((s) => s.value === stream)?.label}</span>}
          {type && <span className="rounded bg-white px-2 py-0.5">type: {type}</span>}
          {state && <span className="rounded bg-white px-2 py-0.5">state: {stateInfo(state)?.name ?? state}</span>}
          <Link href="/colleges" className="ml-auto text-saffron-700 underline hover:text-saffron-800">clear all</Link>
        </div>
      )}

      {/* Result list */}
      {filtered.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-ink-300 bg-white p-8 text-center">
          <p className="text-sm text-ink-700">
            No colleges match these filters. <Link href="/colleges" className="text-saffron-700 underline">Clear all</Link>.
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {filtered.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/colleges/${c.slug}`}
                className="block rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400 hover:bg-saffron-50/30"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-sm font-semibold text-ink-900">{c.shortName}</h2>
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium text-ink-600">
                    {c.type}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-ink-500 line-clamp-1">{c.name}</p>
                <p className="mt-1 text-[11px] text-ink-500">
                  {c.city} · {stateInfo(c.state)?.name ?? c.state} · est. {c.established}
                </p>
                <p className="mt-2 text-xs text-ink-700 line-clamp-2">{c.blurb}</p>
                <p className="mt-2 text-[10px] font-medium text-saffron-700">
                  {formatNirfRanks(c.nirf)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
