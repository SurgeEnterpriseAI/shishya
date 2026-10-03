// context.md for the life-stage pages (30 Sep 2026, P1 build 1, spec §2.2 /
// §2.3): /after-10th/context.md, /after-12th/context.md and
// /schooling/streams/{option}/context.md. The routes (agent B) serve these
// with section-context.ts contextMarkdownHeaders(htmlUrl).
//
// A context file is the token-cheap copy of the page an AI answer engine
// fetches instead of the HTML, so it carries exactly what the page prints and
// nothing more:
//   • the platform one-liner and the page URL;
//   • hubs: one line per option (name · aliases · URL · what it leads to ·
//     exams), the confirmed decision facts each with its source and read day,
//     the open scholarships (section-context.ts scholarshipLine, the same line
//     /scholarships/context.md prints) and "not on Shishya yet";
//   • stream pages: what it is, duration and who it suits; the CONFIRMED board
//     rows only, each with its source and read day (a board whose document
//     could not be read appears only as "check {board}'s official site" with
//     the board's own link); what it keeps open or closes, with the rule's
//     source; exams; where it leads; the sources list.
// Unconfirmed facts are never in a model (src/lib/paths/stream-pages.ts,
// stage-pages.ts), so they can never reach this file. Every URL is absolute,
// every count is a list's length, and the tutor (/chat, robots-disallowed) is
// not linked — the page carries the seeded tutor button.
//
// Pure: no DB, no clock — the route passes the model and the IST as-of day.

import type { BoardStreamCombination, PathFact, PathSource, StreamOption } from "@/data/paths";
import { PLATFORM_ONE_LINE, scholarshipLine } from "@/lib/section-context";
import { fillCopy, pathCopy } from "./copy";
import { SITE, STREAM_PAGE_ROOT, factSources, uniqueSources, type ExamChip } from "./index-helpers";
import type { StageHubModel } from "./stage-pages";
import { streamPageModel, type LinkItem, type StreamPageModel } from "./stream-pages";

const abs = (href: string, site: string) => (/^https?:\/\//.test(href) ? href : `${site}${href.startsWith("/") ? href : `/${href}`}`);

/** "read on 2026-09-30" (ISO day: a machine file never localises a date). */
function readOn(day: string): string {
  return fillCopy(pathCopy().sources.readOn, { day });
}

/** "National Testing Agency (NTA), "JEE (Main) 2026 Information Bulletin", read on 2026-09-30: https://…" — the URL ends the line (3 Oct 2026: never a comma or stop after it). */
export function sourceText(s: PathSource): string {
  return `${s.publisher}, "${s.title}", ${readOn(s.checkedOn)}${s.tier === "reported" ? ` (${pathCopy().sources.reported})` : ""}: ${s.url}`;
}

/** A printable fact with its source (confirmed) or the word "estimate". */
export function factLine(f: PathFact): string {
  if (f.status === "confirmed" && f.source) return `- ${f.text} — source: ${sourceText(f.source)}`;
  return `- ${f.text} (${pathCopy().sources.estimate})`;
}

/** "JEE Main https://shishya.in/exams/JEE_MAIN" while live, else "CLAT (no Shishya page yet)". */
function chipText(c: ExamChip, site: string): string {
  return c.href ? `${c.label} ${abs(c.href, site)}` : `${c.label} (${pathCopy().blocks.examNoPage})`;
}

function links(list: readonly LinkItem[], site: string): string {
  return list.map((l) => `${l.label} ${abs(l.href, site)}`).join(" · ");
}

function sourcesBlock(sources: readonly PathSource[]): string[] {
  const c = pathCopy().sources;
  const L = [`## ${c.heading} (${sources.length})`];
  if (sources.length === 0) L.push("- No rule on this page yet; nothing is stated without an official source.");
  for (const s of sources) L.push(`- ${sourceText(s)}`);
  return L;
}

function moreBlock(site: string): string[] {
  return [
    "## More on Shishya",
    `- Every stage, from school to work: ${site}/career-map · platform context: ${site}/context.md · full index for LLMs: ${site}/llms-full.txt`,
  ];
}

// ── Stage hubs ──────────────────────────────────────────────────────────

/** /after-10th/context.md and /after-12th/context.md. */
export function stageHubContextMarkdown(model: StageHubModel, asOf: string, site: string = SITE): string {
  const copy = pathCopy();
  const pageUrl = abs(model.path, site);
  const L: string[] = [];
  L.push(`# ${model.h1} — Shishya life-stage context`);
  L.push("");
  L.push(`> Page: ${pageUrl} · data as of ${asOf} (IST). Free to cite; link back to the page. ${PLATFORM_ONE_LINE}`);
  L.push(
    "> Honesty: every rule below is quoted from an official page, with its source and the day it was read; a rule that could not be read on an official page is left out, never guessed. No count here is typed — each is the length of a list.",
  );
  L.push(`> ${model.lead}`);
  L.push("");

  L.push(`## ${copy.table.heading} (${model.options.length})`);
  for (const o of model.options) {
    const bits = [
      `- ${o.name}`,
      o.aliases.length ? `also called ${o.aliases.join(", ")}` : "",
      o.href ? abs(o.href, site) : "no page to open yet",
      o.whatItIs ?? "",
      o.duration ? `how long: ${o.duration.text}${o.duration.status === "confirmed" && o.duration.source ? ` (${o.duration.source.publisher}, ${readOn(o.duration.source.checkedOn)})` : ` (${copy.sources.estimate})`}` : "",
      // 30 Sep 2026 (review fix): lower-case the first letter only, so "Class 10" keeps its capital.
      o.from.length ? `${copy.table.from.charAt(0).toLowerCase()}${copy.table.from.slice(1)}: ${links(o.from, site)}` : "",
      o.leadsTo.length ? `leads to: ${links(o.leadsTo, site)}` : "",
      o.exams.length ? `exams: ${o.exams.map((c) => chipText(c, site)).join(" · ")}` : "",
    ].filter(Boolean);
    L.push(bits.join(" — "));
  }
  L.push("");

  L.push(`## ${copy.blocks.facts} (${model.facts.length})`);
  if (model.facts.length === 0) L.push("- None printed yet: no rule has been read on an official page for this stage.");
  L.push(...model.facts.map(factLine));
  L.push("");

  L.push(`## ${copy.blocks.scholarships} (${model.scholarships.length})`);
  L.push("> Open schemes only (a discontinued scheme is never listed). Amounts and deadlines change every year — confirm on the official link.");
  if (model.scholarships.length === 0) L.push("- None open for this stage right now.");
  for (const s of model.scholarships) L.push(scholarshipLine(s, site));
  L.push("");

  L.push(`## ${model.examsAfter.label}`);
  L.push(`- ${abs(model.examsAfter.href, site)}${model.examsAfter.total != null ? ` (${model.examsAfter.total} exams)` : ""} — government and entrance exams grouped by the lowest qualification each lists`);
  L.push("");

  L.push(`## ${copy.blocks.next}`);
  for (const n of model.next) L.push(`- ${n.label}: ${abs(n.href, site)}`);
  L.push("");

  L.push("## Not on Shishya yet");
  L.push("- A page for each course (degree by degree). Until then each option links its colleges, entrance exams and careers pages.");
  L.push("");

  L.push(...sourcesBlock(model.sources));
  L.push("");
  L.push(...moreBlock(site));
  L.push("");
  return L.join("\n");
}

// ── Stream pages ────────────────────────────────────────────────────────

function boardRowLine(r: BoardStreamCombination): string {
  const code = r.groupCode ? ` (group code ${r.groupCode})` : "";
  return `- ${r.boardName} — ${r.localName}${code} — subjects as printed: ${r.subjects.join(", ")} — source (${readOn(r.source.checkedOn)}): ${r.source.url}`;
}

function streamMarkdown(model: StreamPageModel, asOf: string, site: string): string {
  const copy = pathCopy();
  const o = model.option;
  const pageUrl = abs(model.path, site);
  const parent = `${site}${STREAM_PAGE_ROOT}${o.legacyAnchor ? `#${o.legacyAnchor}` : ""}`;
  const L: string[] = [];
  L.push(`# ${model.h1} — Shishya stream context`);
  L.push("");
  L.push(`> Page: ${pageUrl} · all options after Class 10: ${site}/after-10th · streams compared: ${parent} · data as of ${asOf} (IST). Free to cite; link back to the page. ${PLATFORM_ONE_LINE}`);
  L.push(
    "> Honesty: subjects are printed as each board prints them, from the board's own document with the day it was read; a board whose document could not be read is only linked. Every rule is quoted from an official page with its source. Shishya never copies textbook text.",
  );
  L.push("");

  L.push("## What it is");
  L.push(`- ${model.lead.whatItIs}`);
  if (model.lead.duration) {
    const d = model.lead.duration;
    L.push(`- ${copy.table.duration}: ${d.text}${d.status === "confirmed" && d.source ? ` — source: ${sourceText(d.source)}` : ` (${copy.sources.estimate})`}`);
  }
  L.push(`- ${copy.table.suits}: ${model.lead.suits}`);
  L.push(`- Also called: ${o.aliases.join(", ")}`);
  L.push("");

  if (model.boardTable.applies) {
    const rows = model.boardTable.rows;
    const boards = new Set(rows.map((r) => r.board)).size;
    L.push(`## ${copy.boards.heading} (${rows.length} ${rows.length === 1 ? "list" : "lists"} from ${boards} ${boards === 1 ? "board" : "boards"})`);
    if (model.boardTable.pendingMessage) L.push(`- ${model.boardTable.pendingMessage}`);
    L.push(...rows.map(boardRowLine));
    for (const c of model.boardTable.checks) L.push(`- ${c.linkText}: ${c.url}`);
    L.push("");
  }

  for (const [heading, lines] of [
    [copy.blocks.keepsOpen, model.keepsOpen],
    [copy.blocks.closes, model.closes],
  ] as const) {
    if (lines.length === 0) continue;
    L.push(`## ${heading} (${lines.length})`);
    for (const e of lines) {
      // 1 Oct 2026: a family line names the exam whose rule it quotes (the
      // exam's own line, same rule and source, is folded into it — one fact, one line).
      const exams = e.exams.length ? `${e.exams.length === 1 ? "exam" : "exams"}: ${e.exams.map((c) => chipText(c, site)).join(" · ")}` : "";
      const bits = [`- ${e.label}`, e.href ? abs(e.href, site) : "", exams, e.note ?? "", e.source ? `source: ${sourceText(e.source)}` : ""].filter(Boolean);
      L.push(bits.join(" — "));
    }
    L.push("");
  }

  if (model.exams.length) {
    L.push(`## ${copy.blocks.exams} (${model.exams.length})`);
    L.push(`- ${model.exams.map((c) => chipText(c, site)).join(" · ")}`);
    L.push("- Each exam's own eligibility rule is on its page and on the conducting body's site; confirm there before applying.");
    L.push("");
  }

  L.push(`## ${copy.blocks.facts} (${model.facts.length})`);
  if (model.facts.length === 0) L.push("- None printed yet: no rule has been read on an official page for this option.");
  L.push(...model.facts.map(factLine));
  L.push("");

  L.push(`## ${copy.blocks.next}`);
  if (model.next.families.length) L.push(`- ${copy.blocks.families}: ${model.next.families.map((f) => `${f.name} ${abs(f.href, site)}`).join(" · ")}`);
  if (model.next.collegeStreams.length) L.push(`- ${copy.blocks.collegeStreams}: ${links(model.next.collegeStreams, site)}`);
  if (model.next.careers.length) L.push(`- ${copy.blocks.careers} (${model.next.careers.length}): ${links(model.next.careers, site)}`);
  if (model.existingPages.length) L.push(`- More on Shishya for this option: ${links(model.existingPages, site)}`);
  L.push("");

  L.push(...sourcesBlock(model.sources));
  L.push("");
  L.push(...moreBlock(site));
  L.push("");
  return L.join("\n");
}

/**
 * /schooling/streams/{option}/context.md. Takes the page model (preferred:
 * the route builds it with loadLiveExams(), so exam chips link live hubs),
 * or — the spec §2.3 shape — the option and its board rows, in which case the
 * model is rebuilt with no live exams (exams print as labels) and only the
 * CONFIRMED rows passed are printed.
 */
export function streamOptionContextMarkdown(model: StreamPageModel, asOf: string, site?: string): string;
export function streamOptionContextMarkdown(option: Pick<StreamOption, "slug">, combos: readonly BoardStreamCombination[], asOf: string, site?: string): string;
export function streamOptionContextMarkdown(
  a: StreamPageModel | Pick<StreamOption, "slug">,
  b: string | readonly BoardStreamCombination[],
  c?: string,
  d?: string,
): string {
  if (typeof b === "string") return streamMarkdown(a as StreamPageModel, b, c ?? SITE);
  const model = streamPageModel(a.slug, new Set<string>());
  if (!model) throw new Error(`[paths] unknown stream option ${a.slug}`);
  const rows = model.boardTable.applies ? b.filter((r) => r.option === model.slug && r.status === "confirmed") : [];
  const d0 = model.lead.duration;
  // The sources list is rebuilt the way stream-pages.ts builds it, over the rows printed here.
  const sources = uniqueSources([
    ...(d0?.status === "confirmed" ? [d0.source] : []),
    ...rows.map((r) => r.source),
    ...model.keepsOpen.map((l) => l.source),
    ...model.closes.map((l) => l.source),
    ...factSources(model.facts),
  ]);
  const pendingMessage = model.boardTable.applies && rows.length === 0 ? pathCopy().boards.pending : null;
  return streamMarkdown({ ...model, sources, boardTable: { ...model.boardTable, rows, pendingMessage } }, c ?? "", d ?? SITE);
}
