// Server-rendered search results for /ask?q= (26 Sep 2026): what Shishya read
// from the query, plain notices, the best match, the exam's sibling pages,
// and the pages grouped by section. Plain <a href> links to real pages only —
// every URL comes from the index (src/lib/search), never from the query.
// No model call happens here; the AI panel (src/app/ask/AskAnswer.tsx) sits
// below this and runs only on a human action.

import type { Resolution, SearchHit } from "@/lib/search/types";
import { DIRECT_MIN, SECTION_ICON } from "@/lib/search/types";
import type { SearchCopy } from "@/lib/search-copy";

function Row({ hit, copy, big = false }: { hit: SearchHit; copy: SearchCopy; big?: boolean }) {
  return (
    <li>
      <a
        href={hit.url}
        className={`group flex items-start gap-3 rounded-xl border border-ink-200 bg-white px-4 ${big ? "py-4" : "py-3"} transition-colors hover:border-saffron-400 hover:bg-saffron-50/40`}
        data-search-row={hit.docId}
      >
        <span aria-hidden className={`${big ? "text-2xl" : "text-lg"} leading-none`}>
          {SECTION_ICON[hit.section]}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block font-semibold text-ink-900 group-hover:text-saffron-800 ${big ? "text-base" : "text-sm"}`}>{hit.label}</span>
          {hit.sub && hit.sub !== hit.label && <span className="mt-0.5 block text-xs text-ink-500">{hit.sub}</span>}
        </span>
        {hit.status && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${hit.status === "ready" ? "bg-emerald-50 text-emerald-800" : "bg-ink-100 text-ink-600"}`}
          >
            {copy.badges[hit.status]}
          </span>
        )}
        <span aria-hidden className="shrink-0 self-center text-ink-400 group-hover:text-saffron-600">
          →
        </span>
      </a>
    </li>
  );
}

export function SearchResults({ resolution: r, copy }: { resolution: Resolution; copy: SearchCopy }) {
  const top = r.hits[0];
  // "Best match" only when one page clearly leads; a tie ("kas": Karnataka and J&K) is a plain list.
  const lead = top ? top.score - Math.max(0, ...r.hits.slice(1).map((h) => h.score)) : 0;
  const showBest = r.outcome !== "ai" && !!top && top.score >= DIRECT_MIN - 0.15 && lead >= 0.05;
  const rest = showBest ? r.groups.map((g) => ({ ...g, hits: g.hits.filter((h) => h.docId !== top.docId) })).filter((g) => g.hits.length) : r.groups;
  // 26 Sep 2026 (integrator): on an AI outcome these rows can score below
  // LIST_MIN (recommended goes down to RECOMMEND_MIN), so they are headed
  // "Closest pages", never "Pages on Shishya for this".
  const aiRows = r.outcome === "ai" ? (r.recommended.length ? r.recommended : r.hits.slice(0, 3)) : [];

  return (
    <div className="mt-5 space-y-6">
      {r.understood.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs" aria-label={copy.understood}>
          <span className="font-semibold uppercase tracking-wide text-ink-500">{copy.understood}:</span>
          {r.understood.map((u) => (
            <span key={`${u.slot}:${u.label}`} className="rounded-full bg-ink-100 px-2.5 py-0.5 text-ink-700">
              {u.label}
            </span>
          ))}
        </div>
      )}

      {r.notices.length > 0 && (
        <ul className="space-y-1.5">
          {r.notices.map((n) => (
            <li key={n} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {copy.notices[n]}
            </li>
          ))}
        </ul>
      )}

      {r.outcome === "ai" ? (
        aiRows.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-500">{copy.closest}</h2>
            <ul className="mt-2 space-y-2">
              {aiRows.map((h) => (
                <Row key={h.docId} hit={h} copy={copy} />
              ))}
            </ul>
          </section>
        )
      ) : (
        <>
          {showBest && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-500">{copy.bestMatch}</h2>
              <ul className="mt-2">
                <Row hit={top} copy={copy} big />
              </ul>
            </section>
          )}

          {r.quick.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-500">{copy.quickLinks}</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {r.quick.map((h) => (
                  <a
                    key={h.url}
                    href={h.url}
                    className="rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-medium text-ink-700 hover:border-saffron-400 hover:text-saffron-800"
                  >
                    {h.label.split(" · ").pop()}
                  </a>
                ))}
              </div>
            </section>
          )}

          {rest.map((g) => (
            <section key={g.section}>
              <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                <span aria-hidden>{SECTION_ICON[g.section]}</span>
                {copy.sections[g.section]}
              </h2>
              <ul className="mt-2 space-y-2">
                {g.hits.map((h) => (
                  <Row key={h.docId} hit={h} copy={copy} />
                ))}
              </ul>
            </section>
          ))}

          {r.hits.length === 0 && <p className="text-sm text-ink-600">{copy.noResults}</p>}
        </>
      )}

      <p className="text-sm">
        <a href={r.fallback.url} className="font-medium text-saffron-700 hover:text-saffron-800">
          {copy.browseSection}: {r.fallback.title} →
        </a>
      </p>
    </div>
  );
}
