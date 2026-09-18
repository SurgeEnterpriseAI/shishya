// Previous-year content carries BOTH names (15 Sep 2026).
//
// Students search "previous year paper", "previous year question paper" and
// "PYQ". On 11 Sep the search-facing copy dropped "previous year paper" for
// "PYQ-pattern paper" so no page claimed our generated questions were the
// real paper — and PYQ landings from ChatGPT fell from ~8 a day to ~3.
// This module is the one place that words it, honestly, both ways:
//   • "previous year paper" is the search phrase and the literal name of the
//     conducting body's own published paper, where we link one;
//   • "PYQ-pattern practice" is what Shishya's sets are — freshly worded in
//     the pattern of that year's paper, with the N-of-M depth when partial.
// Pure functions, no DB; the pages pass in whether an official question paper
// exists for the exam / year (src/lib/official-papers-db.ts).

import { fillPyq, pyqYearCopy, type PyqCopyLocale } from "@/lib/pyq-year-copy";

export interface PyqYearNaming {
  short: string;
  name: string;
  year: number | string;
  /** PYQ-pattern questions held for this year. */
  held: number;
  /** The real paper's question count. */
  total: number;
  /** True when the set holds under 80% of the real paper. */
  partial: boolean;
  /** Publisher of the official question paper for this year, if we link one. */
  officialPublisher: string | null;
}

/** Meta description, og/twitter description and JSON-LD description of a PYQ year page. */
export function pyqYearDescription(o: PyqYearNaming): string {
  const practice = o.partial
    ? `${o.held} PYQ-pattern practice questions modelled on it (the paper had ${o.total})`
    : `a full-length PYQ-pattern practice paper modelled on it (${o.held} questions)`;
  if (o.officialPublisher) {
    return (
      `${o.short} ${o.year} previous year paper: the official ${o.year} paper as ${o.officialPublisher} published it, ` +
      `plus ${practice} — freshly worded, not the original questions. ` +
      `Solve free on Shishya with instant scoring, solutions and topic-wise analysis.`
    );
  }
  const set = o.partial
    ? `${o.held} PYQ-pattern questions modelled on the ${o.name} ${o.year} paper (which had ${o.total})`
    : `a full-length PYQ-pattern paper modelled on the ${o.name} ${o.year} paper (${o.held} questions)`;
  return (
    `${o.short} ${o.year} previous year paper practice: ${set} — freshly worded in that paper's pattern, ` +
    `not the original questions. Solve ${o.partial ? "this set" : "it as a timed mock"} free on Shishya ` +
    `with instant scoring, solutions and topic-wise analysis.`
  );
}

/** Visible H1 of a PYQ year page. Localised for the /hi and /te twins
 *  (16 Sep 2026) — the copy carries both names and the "not the original
 *  questions" force in every language. English is the default and unchanged;
 *  the metadata helpers above stay English because the page canonicalises
 *  every locale to the English URL. */
export function pyqYearH1(
  short: string,
  year: number | string,
  hasOfficialPaper: boolean,
  locale: PyqCopyLocale = "en",
): string {
  const C = pyqYearCopy(locale);
  return fillPyq(hasOfficialPaper ? C.h1Official : C.h1Practice, { short, year });
}

/** JSON-LD headline of a PYQ year page. */
export function pyqYearHeadline(o: Omit<PyqYearNaming, "name" | "officialPublisher"> & { hasOfficialPaper: boolean }): string {
  const depth = o.partial ? `${o.held} of ${o.total} questions` : `${o.held} questions`;
  return o.hasOfficialPaper
    ? `${o.short} ${o.year} Previous Year Paper (Official) and PYQ-Pattern Practice (${depth})`
    : `${o.short} ${o.year} Previous Year Paper Practice — PYQ-Pattern ${o.partial ? "Questions" : "Paper"} (${depth})`;
}

/** Hub copy naming the PYQ section, for descriptions and JSON-LD. */
export function hubPyqPhrase(hasOfficialPapers: boolean): string {
  return hasOfficialPapers
    ? "official previous year papers (linked from the conducting body) and PYQ-pattern practice papers"
    : "previous year paper practice (PYQ-pattern papers)";
}

/** Site-wide phrase for descriptions that mention the product's PYQ content. */
export const SITE_PYQ_PHRASE = "previous year papers and PYQ-pattern practice";
