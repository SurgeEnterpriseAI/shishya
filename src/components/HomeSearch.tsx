"use client";

// Search-as-you-type widget for the homepage funnel. Lets visitors
// who already know the exam name jump straight to /exams/<code>
// without going through the goal-card → national/state flow.
//
// All matching happens client-side against the exam list passed
// from the parent server component — no network round-trip per
// keystroke. The exam list is small (~165 rows) so even a naive
// .filter() over every keystroke is well under 1 ms.
//
// Match rules: case-insensitive substring against shortName and
// code (so both "ssc cgl" and "SSC_CGL" find the same row). State
// rows also match on their state prefix ("Maharashtra MHT CET"
// surfaces when the user types "maharashtra").
//
// Result list shows the top 8 matches as cards. Each is a real
// <Link>, so keyboard nav (Tab + Enter) works without JS too —
// progressive enhancement.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { ExamCard } from "./ExamPicker";
import { contextualExamFilter } from "@/lib/exam-aliases";
import { nearestExams } from "@/lib/exam-nearest";

const MAX_RESULTS = 8;

export function HomeSearch({ exams }: { exams: ExamCard[] }) {
  const [q, setQ] = useState("");
  const trimmed = q.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!trimmed) return [];
    // Contextual: "daroga"/"steno"/"sipahi" reach the right exams even
    // though no exam name contains those words. Lexical hits keep their
    // popularity order; pure-alias hits keep the filter's intent order.
    const hits = contextualExamFilter(q, exams);
    const lexical = new Set(
      hits.filter((e) => `${e.shortName} ${e.name} ${e.code}`.toLowerCase().includes(trimmed)).map((e) => e.code),
    );
    return hits
      .sort((a, b) => {
        const al = lexical.has(a.code) ? 1 : 0;
        const bl = lexical.has(b.code) ? 1 : 0;
        if (al !== bl) return bl - al;
        return (b.candidatesPerYear ?? 0) - (a.candidatesPerYear ?? 0);
      })
      .slice(0, MAX_RESULTS);
  }, [exams, q, trimmed]);

  // Closest exams when nothing matched — deterministic, no model call.
  const nearest = useMemo(
    () => (trimmed && matches.length === 0 ? nearestExams(q, exams, 4) : []),
    [exams, q, trimmed, matches.length],
  );

  // Log the miss once the typing settles, once per distinct query. A
  // search that matched nothing was invisible before this: the only way
  // we learned a name was unreachable was a student emailing in.
  const loggedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!trimmed || trimmed.length < 3 || matches.length > 0) return;
    const id = window.setTimeout(() => {
      if (loggedRef.current.has(trimmed)) return;
      loggedRef.current.add(trimmed);
      try {
        window.shishyaTrack?.("SEARCH_MISS", {
          q: trimmed.slice(0, 120),
          surface: "home-search",
          nearest: nearest.map((n) => n.exam.code).slice(0, 3),
        });
      } catch {
        /* analytics is best-effort */
      }
    }, 900);
    return () => window.clearTimeout(id);
  }, [trimmed, matches.length, nearest]);

  return (
    <div className="mx-auto mt-10 max-w-2xl">
      <label className="sr-only" htmlFor="home-search">
        Search exams by name
      </label>
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.34-4.34M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
        </svg>
        <input
          id="home-search"
          type="search"
          autoComplete="off"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Already know your exam? Type SSC CGL, NEET, UPSC, JEE…"
          className="w-full rounded-xl border-2 border-ink-200 bg-white py-3.5 pl-12 pr-4 text-base text-ink-900 shadow-sm placeholder:text-ink-400 focus:border-saffron-500 focus:outline-none focus:ring-4 focus:ring-saffron-200/60"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-ink-500 hover:bg-ink-100"
            aria-label="Clear search"
          >
            Clear
          </button>
        )}
      </div>

      {trimmed && (
        <div className="mt-3 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-sm">
          {matches.length === 0 ? (
            <div className="px-4 py-4">
              {nearest.length > 0 ? (
                <>
                  <p className="text-sm text-ink-700">
                    Nothing is named “{q}” on Shishya. The closest we have:
                  </p>
                  <ul className="mt-2 divide-y divide-ink-100">
                    {nearest.map((n) => (
                      <li key={n.exam.code}>
                        <Link
                          href={`/exams/${n.exam.code}`}
                          prefetch={false}
                          className="flex items-start justify-between gap-3 py-2 transition-colors hover:bg-saffron-50/60"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink-900">{n.exam.shortName}</p>
                            <p className="mt-0.5 truncate text-xs text-ink-600">{n.exam.name}</p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-ink-700">
                  Nothing on Shishya is named “{q}” — and nothing close either.
                </p>
              )}
              {/* The loop that was missing until 10 Sep 2026: a search we
                  cannot answer used to end here, telling the aspirant to
                  "try a shorter query". Now it offers the finder, and the
                  miss itself is logged so the gap reaches us without
                  anyone having to write in. */}
              <p className="mt-3 border-t border-ink-100 pt-3 text-xs text-ink-600">
                Not what you meant?{" "}
                <Link href="/find-your-exam" className="font-semibold text-saffron-700 hover:text-saffron-800">
                  Tell us what you are preparing for →
                </Link>
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {matches.map((e) => (
                <li key={e.code}>
                  <Link
                    href={`/exams/${e.code}`}
                    prefetch={false}
                    className="flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-saffron-50/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-900">
                        {e.shortName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-ink-600">{e.name}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        e.live
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-ink-100 text-ink-600"
                      }`}
                    >
                      {e.live ? "Live" : "Coming"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
