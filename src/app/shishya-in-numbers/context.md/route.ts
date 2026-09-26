// GET /shishya-in-numbers/context.md — every public number about Shishya as
// markdown, with its definition, period and as-of day (27 Sep 2026).
//
// Why: answer engines asked "how big / how good is Shishya" should quote a
// number with its definition, not a guess. This file carries exactly what
// /shishya-in-numbers prints — the same loaders (src/lib/public-numbers.ts)
// and the same cell text and privacy gate (src/lib/public-numbers-view.ts) —
// plus the citation line. A part whose read failed says "could not be
// computed right now", never 0. Headers as the other context files (HTTP
// canonical to the HTML page, no noindex).

import { loadPublicNumbers } from "@/lib/public-numbers";
import { NUMBERS_URL } from "@/lib/public-numbers-rules";
import { numbersMarkdown } from "@/lib/public-numbers-view";
import { contextMarkdownHeaders } from "@/lib/section-context";

export const revalidate = 3600;

export async function GET() {
  const p = await loadPublicNumbers();
  return new Response(numbersMarkdown(p), { headers: contextMarkdownHeaders(NUMBERS_URL) });
}
