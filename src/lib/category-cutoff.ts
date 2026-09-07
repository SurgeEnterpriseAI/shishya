// ExamCategoryCutoff parser (shared by /cutoff and /score-estimate).
//
// scripts/generate-category-cutoffs.ts asks for STRICT markdown: one pipe
// table with the columns "| Category | Expected cutoff (indicative) |"
// (rows General / EWS / OBC / SC / ST, sometimes PwD) followed by 2-3
// bullet lines of guidance. This turns that text into a header + rows +
// notes so both pages render the same table and translate the two known
// headers. Pure, no DB.

import type { StringKey } from "@/lib/i18n";

export interface CategoryCutoff {
  /** Table rows, header first. Empty when the content has no table. */
  table: string[][];
  /** Bullet guidance lines under the table (markdown inline kept). */
  notes: string[];
}

export function parseCategoryCutoff(md: string | null | undefined): CategoryCutoff {
  const table: string[][] = [];
  const notes: string[] = [];
  if (!md) return { table, notes };
  for (const raw of md.split("\n")) {
    const line = raw.trim();
    if (/^\|/.test(line)) {
      // Separator row: only pipes, dashes, colons and spaces.
      if (/^\|[\s:|-]+\|$/.test(line) && /---/.test(line)) continue;
      const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
      if (cells.length) table.push(cells);
    } else if (/^[-*•]\s+/.test(line)) {
      notes.push(line.replace(/^[-*•]\s+/, ""));
    }
  }
  return { table, notes };
}

/** Dictionary key for one of the generator's two fixed column headers, or
 *  null for anything else (rendered as-is). */
export function categoryHeaderKey(header: string): StringKey | null {
  const n = header.toLowerCase().replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  if (n === "category") return "cutoff.th.category";
  if (/^expected cut ?off/.test(n)) return "cutoff.th.expected";
  return null;
}
