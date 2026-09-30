// The "By life stage" blocks of the machine files (30 Sep 2026, P1 build 1,
// spec §2.6).
//
// Why: an AI crawler reads /llms-full.txt and /context.md first. Until P1
// they described Shishya section by section (school, entrance, government,
// colleges, careers) and said nothing about where a learner stands. These
// lines put the life-stage spine first: one line per stage with its hub, the
// two decision pages (after Class 10, after Class 12) with their context
// files, and one line per option page after Class 10.
//
// Honesty (standing rules): every URL is a page whose own robots let Google
// index it — a new hub only while isStageHubIndexable holds, a stream page
// only while isStreamPageIndexable holds (the sitemap's gates,
// src/lib/paths/path-sitemap.ts); every count is the length of a computed
// list; no "best / #1 / biggest"; no salary; the tutor is never linked here
// (/chat is robots-disallowed — the pages carry the seeded tutor link).
//
// Pure: no DB, no clock. Deliberately does not import
// src/lib/section-context.ts (which imports this file).

import { PATH_STAGES, confirmedBoardCount, findStreamOption, type PathStage, type StreamOptionSlug } from "@/data/paths";
import { SITE, streamPagePath, streamShortLabel } from "./index-helpers";
import { STAGE_HUB_IDS, indexableStageHubs } from "./path-sitemap";
import type { StageHubModel } from "./stage-pages";
import { indexableStreamSlugs } from "./stream-pages";

/** The hubs of PATH_STAGES that are new in P1 (they carry a context file). */
function newHubModels(): Map<string, StageHubModel> {
  return new Map(indexableStageHubs().map((m) => [m.stage.id, m]));
}

/** A stage's line target: its hub, or null when it is a new hub that is not
 *  indexable (a noindex page is never named in a machine file). */
function stageTarget(stage: PathStage, hubs: ReadonlyMap<string, StageHubModel>): { url: string; context: string | null; hub: StageHubModel | null } | null {
  const isNew = (STAGE_HUB_IDS as readonly string[]).includes(stage.id);
  if (!isNew) return { url: `${SITE}${stage.hubPath}`, context: null, hub: null };
  const hub = hubs.get(stage.id) ?? null;
  return hub ? { url: `${SITE}${hub.path}`, context: `${SITE}${hub.path}/context.md`, hub } : null;
}

/** "9 options compared: MPC / PCM · BiPC / PCB · …" — the count is the list's length. */
function optionsSummary(hub: StageHubModel): string {
  const noun = hub.stage.id === "after-10th" ? "options" : "paths";
  return `${hub.options.length} ${noun} compared side by side: ${hub.options.map((o) => o.shortName).join(" · ")}`;
}

/** One line per indexable option page after Class 10. */
function streamLines(slugs: readonly StreamOptionSlug[], site: string, withAliases: boolean): string[] {
  return slugs.map((slug) => {
    const o = findStreamOption(slug)!;
    const url = `${site}${streamPagePath(slug)}`;
    const boards = confirmedBoardCount(slug);
    const bits = [
      `- ${streamShortLabel(slug)} — ${o.title}: ${url} (context file: ${url}/context.md)`,
      withAliases ? `also searched as ${o.aliases.join(", ")}` : "",
      boards > 0 ? `subjects as printed by ${boards} ${boards === 1 ? "board" : "boards"}, each with its source` : "",
    ].filter(Boolean);
    return bits.join(" — ");
  });
}

/** The "## By life stage" block of /llms-full.txt. */
export function pathLlmsFullLines(site: string = SITE): string[] {
  const hubs = newHubModels();
  const slugs = indexableStreamSlugs();
  const L: string[] = [];
  L.push("## By life stage — from school to work");
  L.push(
    `> Start where you are: one hub for each stage of life, in order. The two decision points — after Class 10 and after Class 12 — each have a page that compares every option side by side; every rule on them is quoted from an official page with the day it was read, subject lists are printed board by board from each board's own document, and a board whose document could not be read is only linked, never summarised. Every stage on one page: ${site}/career-map`,
  );
  for (const stage of PATH_STAGES) {
    const t = stageTarget(stage, hubs);
    if (!t) continue;
    const ctx = t.context ? ` (context file: ${t.context})` : "";
    L.push(`- ${stage.label}: ${t.url}${ctx}${t.hub ? ` — ${optionsSummary(t.hub)}` : ""}`);
  }
  if (slugs.length > 0) {
    L.push(`### Options after Class 10 — one page each (${slugs.length})`);
    L.push(...streamLines(slugs, site, true));
  }
  L.push("");
  return L;
}

/** The "## By life stage" block of /context.md (shorter: no aliases). */
export function lifeStageContextLines(site: string = SITE): string[] {
  const hubs = newHubModels();
  const slugs = indexableStreamSlugs();
  const L: string[] = ["## By life stage — start where you are"];
  for (const stage of PATH_STAGES) {
    const t = stageTarget(stage, hubs);
    if (!t) continue;
    L.push(`- ${stage.label}: ${t.url}${t.context ? ` (context: ${t.context})` : ""}${t.hub ? ` — ${optionsSummary(t.hub)}` : ""}`);
  }
  if (slugs.length > 0) {
    L.push(`- Options after Class 10, one page each (${slugs.length}): ${slugs.map((s) => `${streamShortLabel(s)} ${site}${streamPagePath(s)}`).join(" · ")}; each has a context file (pattern under "Machine-readable files" below)`);
  }
  L.push(`- Career map, every stage on one page: ${site}/career-map`);
  L.push("");
  return L;
}
