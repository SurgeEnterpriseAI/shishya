// The search strip's engine (26 Sep 2026, founder brief: "whatever they
// search, take them to the page we already have").
//
// Loaded lazily by src/components/search/SearchStrip.tsx — a dynamic
// import() on first focus or when the browser is idle a few seconds after the
// page loads — so the resolver and the index never weigh on the home page's
// first load. It fetches the lite site-wide index once per tab
// (GET /api/search/index: page names, paths and facts only; CDN-cached; no
// model, no user data) and resolves in the browser with the same pure
// resolveQuery the server runs for /ask.
//
// Never calls /api/ask and never a model: the AI runs only from the /ask
// page's answer panel, for a person.

import { resolveQuery } from "@/lib/search/resolve";
import { decodeIndex } from "@/lib/search/index-codec";
import type { SearchIndex } from "@/lib/search/types";

export { resolveQuery };

export const SEARCH_INDEX_URL = "/api/search/index";

let pending: Promise<SearchIndex> | null = null;

/** The lite index, fetched once per tab; a failed fetch is forgotten so the next focus retries. */
export function loadSearchIndexClient(): Promise<SearchIndex> {
  if (!pending) {
    pending = fetch(SEARCH_INDEX_URL, { credentials: "same-origin" })
      .then((res) => {
        if (!res.ok) throw new Error(`search index ${res.status}`);
        return res.json() as Promise<unknown>;
      })
      .then((wire) => decodeIndex(wire))
      .catch((err: unknown) => {
        pending = null;
        throw err;
      });
  }
  return pending;
}
