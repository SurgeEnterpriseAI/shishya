// Pure helpers for the life-stage page views (30 Sep 2026, P1 build 1 —
// agent B). The React views in this folder stay thin: every rule a view
// applies (what a duration cell prints, the "read on" line, how many
// scholarships show before the <details> fold, which aliases a card names)
// lives here, so tests/unit/paths-views.test.ts can pin it without a DOM.
//
// Honesty: a fact prints only when the model already cut it to confirmed or
// estimate (src/data/paths printableFacts); an estimate always carries the
// word "estimate"; a confirmed fact always names its source and the day it
// was read. Nothing here types a count.
//
// Pure: no React, no DB, no clock.

import type { BoardStreamCombination, PathFact, PathSource, PathStageId } from "@/data/paths";
import { fillCopy, pathCopy } from "@/lib/paths/copy";
import { formatReadDay, uniqueSources } from "@/lib/paths/index-helpers";

/** "read on 30 Sep 2026" for a source (the day the builder read it). */
export function readOnText(source: Pick<PathSource, "checkedOn">, locale?: string | null): string {
  return fillCopy(pathCopy(locale).sources.readOn, { day: formatReadDay(source.checkedOn) });
}

/** A duration cell: the fact's text, "(estimate)" after an estimate; null
 *  for no fact or an unconfirmed one (never printed). */
export function factCellText(fact: PathFact | null | undefined, locale?: string | null): string | null {
  if (!fact || !fact.text.trim()) return null;
  if (fact.status === "confirmed") return fact.source ? fact.text : null;
  if (fact.status === "estimate") return `${fact.text} (${pathCopy(locale).sources.estimate})`;
  return null;
}

/** Scholarships shown before the <details> fold on a stage hub. The rest are
 *  in the same server HTML inside <details> — nothing is gated or hidden
 *  from a crawler; the fold only keeps a phone screen short. */
export const SCHOLARSHIP_PREVIEW_MAX = 12;

export function previewSplit<T>(list: readonly T[], max: number = SCHOLARSHIP_PREVIEW_MAX): { shown: T[]; rest: T[] } {
  return { shown: list.slice(0, max), rest: list.slice(max) };
}

/** The full scholarship list a hub links to: the Class 11-12 list for
 *  /after-10th (its scholarship levels start at Class 11-12), the whole
 *  catalogue for /after-12th (no undergraduate list page exists). */
export function scholarshipsAllHref(stage: PathStageId): string {
  return stage === "after-10th" ? "/scholarships/for/class-11-12" : "/scholarships";
}

/** Latin-script aliases a card names under the option ("Also called …"):
 *  the other names students use, minus the words already in the short name.
 *  Native-script aliases stay search keys (the page is English in P1). */
export const ALIAS_PREVIEW_MAX = 4;

export function visibleAliases(aliases: readonly string[], shortName: string, max: number = ALIAS_PREVIEW_MAX): string[] {
  const inShort = new Set(
    shortName
      .toLowerCase()
      .split(/[^a-z0-9.]+/)
      .filter(Boolean),
  );
  const out: string[] = [];
  const seen = new Set<string>();
  for (const a of aliases) {
    if (!/^[\x20-\x7e]+$/.test(a)) continue; // Latin script only
    const k = a.toLowerCase();
    if (inShort.has(k) || seen.has(k)) continue;
    seen.add(k);
    out.push(a);
    if (out.length >= max) break;
  }
  return out;
}

/** A board's confirmed rows on a stream page, with the documents they cite. */
export interface BoardRowGroup {
  board: string;
  boardName: string;
  rows: BoardStreamCombination[];
  sources: PathSource[];
  /** Any row prints a group code (else the column is left out). */
  hasGroupCode: boolean;
}

/** Rows grouped by board, first-seen order (the registry's). Unconfirmed rows
 *  are dropped here too, as a second guard behind the model. */
export function groupRowsByBoard(rows: readonly BoardStreamCombination[]): BoardRowGroup[] {
  const out: BoardRowGroup[] = [];
  const at = new Map<string, BoardRowGroup>();
  for (const r of rows) {
    if (r.status !== "confirmed") continue;
    let g = at.get(r.board);
    if (!g) {
      g = { board: r.board, boardName: r.boardName, rows: [], sources: [], hasGroupCode: false };
      at.set(r.board, g);
      out.push(g);
    }
    g.rows.push(r);
    if (r.groupCode) g.hasGroupCode = true;
  }
  for (const g of out) g.sources = uniqueSources(g.rows.map((r) => r.source));
  return out;
}

/** A board's rows start open (in <details>) up to this many; a longer list
 *  starts folded so a phone reader can find their own board. Every row is in
 *  the server HTML either way. */
export const BOARD_OPEN_MAX = 3;

/** Breadcrumb trail with Home first (the model's crumbs are [name, path]). */
export function breadcrumbTrail(crumbs: ReadonlyArray<readonly [string, string]>, home: string): Array<{ label: string; href: string }> {
  return [{ label: home, href: "/" }, ...crumbs.map(([label, href]) => ({ label, href }))];
}
