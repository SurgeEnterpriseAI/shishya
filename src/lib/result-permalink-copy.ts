// /exams/[code]/results/[id] — the words a result permalink may say about
// itself (26 Sep 2026, G1 index hygiene).
//
// Why: every result permalink's <title> said "declared, cutoff & next steps"
// and its description "Expected cutoff analysis and the candidate's exact
// next steps", but only 9 of the 52 result rows carry a cutoffNote (probe
// scripts/tmp-w2-g1-probe.ts, 26 Sep 2026) — 43 pages promised a cutoff they
// do not show. The title and description now name only what the page
// renders: "cutoff" only with a cutoffNote, "next steps" only with steps.
//
// The FAQPage JSON-LD had the same fault the other way: its questions were
// never printed on the page (Google's structured-data rule — marked-up Q&A
// must be visible). resultFaq() is now the one list both the JSON-LD and the
// page's visible question headings come from.
//
// Index: a row without an officialUrl (50 of 52 on 26 Sep 2026 — the
// extractor copies a link only when the source text holds one) is a
// model-extracted "result declared" claim with nothing to verify it against.
// resultRobots() keeps those pages out of Google only (noindex,follow for
// Googlebot; Bing and ChatGPT search keep index,follow, as for the other
// Google-only families) and src/app/sitemap.ts leaves them out.
//
// Pure: no DB, no Next imports.

import { GOOGLE_ONLY_NOINDEX } from "@/lib/news-index-policy";

export interface ResultCopyInput {
  short: string;
  stage: string;
  /** The year the result was declared (declaredOn). */
  year: number;
  headline: string;
  cutoffNote: string | null;
  nextSteps: readonly { step: string; note?: string | null }[] | null | undefined;
  officialName?: string | null;
  /** "26 September 2026" — the page's own en-IN rendering of declaredOn. */
  declaredLabel: string;
}

const hasCutoff = (r: Pick<ResultCopyInput, "cutoffNote">): boolean => !!r.cutoffNote && r.cutoffNote.trim().length > 0;
const hasSteps = (r: Pick<ResultCopyInput, "nextSteps">): boolean => Array.isArray(r.nextSteps) && r.nextSteps.length > 0;

/** "declared", "declared & cutoff", "declared & next steps", "declared, cutoff & next steps". */
function coverList(r: Pick<ResultCopyInput, "cutoffNote" | "nextSteps">): string {
  const parts = ["declared", ...(hasCutoff(r) ? ["cutoff"] : []), ...(hasSteps(r) ? ["next steps"] : [])];
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} & ${parts[parts.length - 1]}`;
}

export function resultPermalinkTitle(r: ResultCopyInput): string {
  return `${r.short} ${r.stage} Result ${r.year} — ${coverList(r)} | Shishya`;
}

export function resultPermalinkDescription(r: ResultCopyInput): string {
  const head = r.headline.trim();
  const cutoff = hasCutoff(r);
  const steps = hasSteps(r);
  const tail =
    cutoff && steps
      ? `The expected cutoff read and the next steps in the ${r.short} selection process — free on Shishya.`
      : cutoff
        ? `The expected cutoff read — free on Shishya. Verify on the official portal.`
        : steps
          ? `The next steps in the ${r.short} selection process — free on Shishya.`
          : `Verify on the official portal — free on Shishya.`;
  return head ? `${head} ${tail}` : tail;
}

export interface ResultFaqItem {
  question: string;
  answer: string;
}

/** The questions the page prints (each as a visible heading with its
 *  answer) and the FAQPage JSON-LD carries — one list, so they cannot drift. */
export function resultFaq(r: ResultCopyInput): ResultFaqItem[] {
  const out: ResultFaqItem[] = [
    {
      question: `Has the ${r.short} ${r.stage} result been declared?`,
      answer: `Yes — declared on ${r.declaredLabel}. ${r.headline.trim()} Verify on the official portal${r.officialName ? ` (${r.officialName})` : ""}.`,
    },
  ];
  if (hasCutoff(r)) {
    out.push({ question: `What is the expected cutoff for the ${r.short} ${r.stage}?`, answer: r.cutoffNote!.trim() });
  }
  if (hasSteps(r)) {
    out.push({
      question: `What happens after the ${r.short} ${r.stage} result?`,
      answer: r.nextSteps!.map((s, i) => `${i + 1}. ${s.step}${s.note ? ` — ${s.note}` : ""}`).join(" "),
    });
  }
  return out;
}

/** robots of a result permalink: the site default with an official link,
 *  Google-only noindex,follow without one. */
export function resultRobots(officialUrl: string | null | undefined): typeof GOOGLE_ONLY_NOINDEX | { index: true; follow: true } {
  return officialUrl && /^https?:\/\//i.test(officialUrl) ? { index: true, follow: true } : GOOGLE_ONLY_NOINDEX;
}

/** Whether the sitemap (which Google reads) lists the permalink — the same test. */
export function resultInSitemap(officialUrl: string | null | undefined): boolean {
  return !!officialUrl && /^https?:\/\//i.test(officialUrl);
}
