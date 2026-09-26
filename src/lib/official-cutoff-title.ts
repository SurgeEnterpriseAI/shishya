// The cutoff page's official headline (26 Sep 2026, discoverability wave 2 G3).
//
// When OfficialCutoff rows exist, /exams/[code]/cutoff opens with the
// published figure and its title says so: "{exam} Cutoff {year} (Official) —
// Category-wise {noun}". Two things must be true for that title:
//   • the headline table (the page's first table: latest cycle, smallest —
//     src/lib/official-cutoffs.ts groupCutoffTables) comes ONLY from the
//     conducting body's own site. UP_POLICE_CONSTABLE's rows are "as
//     reproduced by Amar Ujala" — reported, never "(Official)";
//   • the noun matches what the figures are. scoreType on prod (26 Sep): SSC
//     prints marks; RRB Group D mixes "Normalized Marks" with "Percentile
//     Score"; RRB NTPC mixes "cut-off marks" with "cut-off merit index";
//     Punjab Police prints "cut off score". Percentile / rank figures are not
//     marks, so the noun is read from scoreType: one kind across every shown
//     table → that kind; a mix → "scores".
// Pure (tests/unit/official-cutoffs-display.test.ts).

import type { CutoffTable } from "@/lib/official-cutoffs";
import { sourceTier } from "@/lib/official-source";

export type CutoffNoun = "marks" | "percentile" | "rank" | "score";

/** What one scoreType's figures are. Percentile is read first ("Percentile
 *  Score"), then rank, then marks ("normalised scores (cut-off marks)"). */
export function scoreTypeNoun(scoreType: string): CutoffNoun {
  const s = (scoreType ?? "").toLowerCase();
  if (/percentile/.test(s)) return "percentile";
  if (/\brank/.test(s)) return "rank";
  if (/\bmarks?\b|अंक/.test(s)) return "marks";
  return "score";
}

/** The page's noun: one kind across every table, else "score". */
export function cutoffNoun(tables: readonly Pick<CutoffTable, "scoreType">[]): CutoffNoun {
  const kinds = new Set(tables.map((t) => scoreTypeNoun(t.scoreType)));
  return kinds.size === 1 ? [...kinds][0] : "score";
}

export interface CutoffHeadline {
  cycle: string;
  stage: string;
  /** The row's post / region, "" when the table is not split. */
  post: string;
  region: string;
  /** Category column as the page heads it. */
  category: string;
  /** The figure exactly as published. */
  marks: string;
  maxMarks: string;
  scoreType: string;
  publisher: string;
  /** YYYY-MM-DD or null. */
  publishedOn: string | null;
  url: string;
  /** This row's document: the body's own site, or reported elsewhere. */
  tier: "official" | "reported";
  /** Every document behind the headline table is on the body's own site. */
  tableOfficial: boolean;
}

const tierOf = (url: string, officialUrl: string | null | undefined): "official" | "reported" =>
  sourceTier("official", url, officialUrl) === "official" ? "official" : "reported";

/** The first figure of the page's first table: its first category column
 *  (reservation order — UR first) in the first row that prints it. */
export function pickCutoffHeadline(tables: readonly CutoffTable[], officialUrl: string | null | undefined): CutoffHeadline | null {
  const t = tables[0];
  if (!t) return null;
  for (const category of t.categories) {
    const row = t.rows.find((r) => (r.cells[category] ?? "").trim() !== "");
    if (!row) continue;
    const src = t.sources[row.source];
    if (!src) continue;
    return {
      cycle: t.cycle,
      stage: t.stage,
      post: row.post || t.post,
      region: row.region || t.region,
      category,
      marks: row.cells[category].trim(),
      maxMarks: t.maxMarks,
      scoreType: t.scoreType,
      publisher: src.publisher,
      publishedOn: src.publishedOn,
      url: src.url,
      tier: tierOf(src.url, officialUrl),
      tableOfficial: t.sources.length > 0 && t.sources.every((s) => tierOf(s.url, officialUrl) === "official"),
    };
  }
  return null;
}

/** The "(Official)" title and H1 are used only for an all-official headline table. */
export function officialCutoffTitle(h: CutoffHeadline | null): boolean {
  return !!h && h.tier === "official" && h.tableOfficial;
}
