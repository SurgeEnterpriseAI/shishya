// GET /api/search/index — the client search index (26 Sep 2026).
//
// The home search strip fetches this on first focus (never on page load, so
// the home page's first-load weight does not change) and resolves as the
// student types, in the browser. It is the lite tier of the site-wide index
// (src/lib/search/index-build.ts) in its compact wire form
// (src/lib/search/index-codec.ts): page names, paths and facts only — no
// chapter text, no user data. Public, CDN-cached; /api/ is disallowed in
// robots.txt. No model call, ever.

import { isFallbackIndex, loadSearchIndex, SEARCH_INDEX_REVALIDATE } from "@/lib/search/index-build";
import { encodeIndex } from "@/lib/search/index-codec";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const index = await loadSearchIndex("lite");
  // 26 Sep 2026 (integrator): the DB-down static index goes out uncached —
  // the next request after the DB recovers gets the real one.
  const cacheControl = isFallbackIndex(index)
    ? "no-store"
    : `public, s-maxage=${SEARCH_INDEX_REVALIDATE}, stale-while-revalidate=86400`;
  return new Response(JSON.stringify(encodeIndex(index)), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControl,
      "x-search-index-built-at": index.builtAt,
    },
  });
}
