// The search strip's decisions, pure (26 Sep 2026) — what the dropdown shows
// and what Enter does, given the resolver's answer. Kept apart from the React
// component (src/components/search/SearchStrip.tsx) so the rules are unit
// tested (tests/unit/search-strip.test.ts) and stay client-safe: types and
// constants only from src/lib/search/types.ts, no data, no fetch, no model.
//
// The rules (founder brief: "every search takes them to the page we already
// have; if nothing is there, the AI answers and recommends a page"):
//   * direct — one clear page: Enter opens it; it heads the list as
//     "Best match" with its sibling exam pages as quick links;
//   * list   — several pages fit: rows grouped by section, then "See every
//     page for …" (Enter → /ask?q=, which lists them with no model call),
//     then "Ask Shishya's AI";
//   * ai     — no page fits, or a real doubt: "Ask Shishya's AI" comes first
//     and is what Enter does (/ask?q= — the answer panel runs for the person
//     who typed it), then the closest real pages;
//   * Class 1-7 school searches never offer the AI (pages only);
//   * an empty box shows one "Try" row per section and the viewer's own
//     recent searches.

import type { SearchCopy } from "@/lib/search-copy";
import type { Resolution, SearchHit, SearchSection } from "@/lib/search/types";
import { SECTION_ICON } from "@/lib/search/types";

export type StripResults = { typing: Resolution; submit: Resolution };
export type EngineState = "idle" | "loading" | "ready" | "error";

export type StripOpt =
  | { kind: "hit"; hit: SearchHit; rank: number; best?: boolean }
  | { kind: "all" }
  | { kind: "ask" }
  | { kind: "try"; q: string; section: SearchSection }
  | { kind: "recent"; q: string };

export type StripRow =
  | { type: "head"; key: string; label: string; icon?: string; clear?: boolean }
  | { type: "note"; key: string; text: string }
  | { type: "loading" }
  | { type: "quick"; hits: SearchHit[] }
  | { type: "opt"; opt: StripOpt; i: number };

export interface StripView {
  rows: StripRow[];
  opts: StripOpt[];
  /** The option Enter takes when none is highlighted (-1: the example on show). */
  def: number;
  chips: string[];
  notes: string[];
  aiMode: boolean;
}

/** The /ask page, the intent token and the resolver all read ≤ 200 characters. */
export const MAX_STRIP_QUERY = 200;

export function cleanQuery(s: string): string {
  return s.replace(/\s+/g, " ").trim().slice(0, MAX_STRIP_QUERY);
}

/** A same-site path with one leading "/" — never a protocol-relative or backslash URL. */
export function isSitePath(u: string): boolean {
  return u.startsWith("/") && !u.startsWith("//") && !u.startsWith("/\\");
}

export function askHref(askBase: string, q: string, ai: boolean): string {
  return `${askBase}?q=${encodeURIComponent(q)}${ai ? "&ai=1" : ""}`;
}

/** What Enter does with a submitted query. No engine yet → /ask, where the server resolves (and 307s a clear match). */
export function enterTarget(r: Resolution | null): { kind: "open"; hit: SearchHit } | { kind: "ask"; action: "list" | "ai" } {
  if (r?.outcome === "direct" && r.best && isSitePath(r.best.url)) return { kind: "open", hit: r.best };
  return { kind: "ask", action: r?.outcome === "ai" ? "ai" : "list" };
}

/** The dropdown, top to bottom, and the options ↑/↓ walk through. */
export function buildStripView(text: string, res: StripResults | null, engineState: EngineState, copy: SearchCopy, recent: string[]): StripView {
  const rows: StripRow[] = [];
  const opts: StripOpt[] = [];
  const add = (opt: StripOpt) => {
    rows.push({ type: "opt", opt, i: opts.length });
    opts.push(opt);
    return opts.length - 1;
  };

  if (!text) {
    rows.push({ type: "head", key: "try", label: copy.strip.tryTitle });
    for (const t of copy.tryRows) add({ kind: "try", q: t.q, section: t.section });
    if (recent.length) {
      rows.push({ type: "head", key: "recent", label: copy.strip.recentTitle, clear: true });
      for (const r of recent) add({ kind: "recent", q: r });
    }
    return { rows, opts, def: -1, chips: [], notes: [], aiMode: false };
  }

  if (!res) {
    // The index is still loading (or failed): Enter goes to /ask, where the server resolves.
    if (engineState !== "error") rows.push({ type: "loading" });
    const def = add({ kind: "all" });
    add({ kind: "ask" });
    return { rows, opts, def, chips: [], notes: [], aiMode: false };
  }

  const S = res.submit;
  const T = res.typing;
  const showAsk = S.schoolScope !== "class1to7"; // Class 1-7: pages only, never the AI
  const aiMode = S.outcome === "ai" && showAsk;
  const best = S.outcome === "direct" ? S.best : null;
  let def = -1;
  let rank = 0;

  if (aiMode) def = add({ kind: "ask" });

  if (best) {
    rows.push({ type: "head", key: "best", label: copy.bestMatch });
    def = add({ kind: "hit", hit: best, rank: rank++, best: true });
    const quick = S.quick.filter((h) => h.url !== best.url);
    if (quick.length) rows.push({ type: "quick", hits: quick });
  }

  const miss = S.hits.length === 0 && T.hits.length === 0;
  if (miss) {
    rows.push({ type: "note", key: "miss", text: copy.noResults });
    if (S.recommended.length) {
      rows.push({ type: "head", key: "closest", label: copy.closest });
      for (const h of S.recommended) add({ kind: "hit", hit: h, rank: rank++ });
    }
  } else {
    const seen = new Set(best ? [best.url] : []);
    const groups = T.hits.length ? T.groups : S.groups;
    for (const g of groups) {
      const hits = g.hits.filter((h) => !seen.has(h.url));
      if (!hits.length) continue;
      rows.push({ type: "head", key: `g-${g.section}`, label: copy.sections[g.section], icon: SECTION_ICON[g.section] });
      for (const h of hits) {
        seen.add(h.url);
        add({ kind: "hit", hit: h, rank: rank++ });
      }
    }
  }

  if (!best && !aiMode) def = add({ kind: "all" });
  if (!aiMode && showAsk) add({ kind: "ask" });

  const understood = S.understood.length ? S.understood : T.understood;
  return {
    rows,
    opts,
    def,
    chips: understood.map((u) => u.label),
    notes: S.notices.slice(0, 2).map((n) => copy.notices[n]),
    aiMode,
  };
}
