// The path registry and its selectors (30 Sep 2026, P1 build 1, spec §1.3).
//
// Everything the P1 pages, sitemap rows, context.md files, llms-full lines,
// JSON-LD and tutor seeds print is computed here from the data files beside
// this one. Counts are always `.length` of a selector — never typed.
//
// validatePathRegistry() is the registry's own honesty and integrity check:
// unique ids in the declared order, every edge endpoint a known node, every
// confirmed fact / board row / sourced edge on an allowed official host with a
// real read day, no aggregator, no digits in our own copy except class
// numbers. tests/unit/paths-registry.test.ts asserts it returns []. At
// runtime a caller may log its problems; it never throws.
//
// Pure: no DB, clock or React.

import { ALL_STREAMS, type CollegeStream } from "@/lib/colleges-data";
import { CAREERS, CAREER_CATEGORIES, type Career } from "@/data/careers";
import type { Scholarship, ScholarshipLevel } from "@/data/scholarships";
import { OFFERED_SCHEMES } from "@/lib/scholarship-schemes";
import { STATES } from "@/lib/state-info";
import type {
  BoardCheckLink,
  BoardStreamCombination,
  CourseFamily,
  PathEdge,
  PathExam,
  PathFact,
  PathNodeId,
  PathSource,
  PathStage,
  StreamOption,
  StreamOptionSlug,
} from "./types";
import { PATH_STAGE_IDS, STREAM_OPTION_SLUGS } from "./types";
import { PATH_STAGES, STAGE_HUB_FACTS } from "./stages";
import { STREAM_OPTIONS } from "./streams";
import { BOARD_CHECK_LINKS, BOARD_STREAM_COMBINATIONS } from "./board-streams";
import { COURSE_FAMILIES, COURSE_FAMILY_DETAILS } from "./course-families";
import { PATH_EDGES } from "./edges";
import { PATH_EXAMS } from "./exams";
import { isAllowedSourceUrl } from "./sources";

export * from "./types";
export { PATH_STAGES, STAGE_HUB_FACTS } from "./stages";
export { STREAM_OPTIONS } from "./streams";
export { BOARD_CHECK_LINKS, BOARD_STREAM_COMBINATIONS } from "./board-streams";
export { COURSE_FAMILIES, COURSE_FAMILY_DETAILS } from "./course-families";
export { PATH_EDGES, STREAM_EDGES } from "./edges";
export { PATH_EXAMS, LABEL_ONLY_EXAM_CODES } from "./exams";
export { AGGREGATOR_DENYLIST, BOARD_OWN_HOSTS, OFFICIAL_HOST_SUFFIXES, PATH_SOURCES, PATHS_READ_ON, isAllowedSourceUrl } from "./sources";

// ── Lookups ──────────────────────────────────────────────────────────────

export function findStage(id: string): PathStage | undefined {
  return PATH_STAGES.find((s) => s.id === id);
}

export function findStreamOption(slug: string): StreamOption | undefined {
  return STREAM_OPTIONS.find((o) => o.slug === slug);
}

export function findCourseFamily(id: string): CourseFamily | undefined {
  return COURSE_FAMILIES.find((f) => f.id === id);
}

export function findPathExam(code: string): PathExam | undefined {
  return PATH_EXAMS.find((e) => e.code === code);
}

/** True for a slug in STREAM_OPTION_SLUGS (a type guard for route params). */
export function isStreamOptionSlug(slug: string): slug is StreamOptionSlug {
  return (STREAM_OPTION_SLUGS as readonly string[]).includes(slug);
}

// ── Board combinations ───────────────────────────────────────────────────

/** Rows for one option, in registry order; `confirmedOnly` drops unconfirmed rows. */
export function combinationsFor(option: StreamOptionSlug, opts: { confirmedOnly?: boolean } = {}): BoardStreamCombination[] {
  return BOARD_STREAM_COMBINATIONS.filter((r) => r.option === option && (!opts.confirmedOnly || r.status === "confirmed"));
}

/** Confirmed rows for one option. */
export function confirmedCount(option: StreamOptionSlug): number {
  return combinationsFor(option, { confirmedOnly: true }).length;
}

/** Distinct boards with at least one confirmed row for the option. */
export function confirmedBoardCount(option: StreamOptionSlug): number {
  return new Set(combinationsFor(option, { confirmedOnly: true }).map((r) => r.board)).size;
}

/** Boards whose lists for this option could not be read: link-only. */
export function boardChecksFor(option: StreamOptionSlug): BoardCheckLink[] {
  return BOARD_CHECK_LINKS.filter((b) => b.options.includes(option));
}

// ── Facts ────────────────────────────────────────────────────────────────

/** A fact a page may print: confirmed with a source, or an estimate. */
export function isPrintableFact(f: PathFact): boolean {
  if (f.status === "confirmed") return !!f.source && isAllowedSourceUrl(f.source.url);
  return f.status === "estimate";
}

/** The printable facts of a list (confirmed + estimates), in order; never an unconfirmed one. */
export function printableFacts(facts: readonly PathFact[]): PathFact[] {
  return facts.filter(isPrintableFact);
}

// ── Edges ────────────────────────────────────────────────────────────────

export function edgesFrom(id: PathNodeId): PathEdge[] {
  return PATH_EDGES.filter((e) => e.from === id);
}

export function edgesTo(id: PathNodeId): PathEdge[] {
  return PATH_EDGES.filter((e) => e.to === id);
}

// ── Course families ──────────────────────────────────────────────────────

export function courseFamiliesAfter(level: "10th" | "12th" | "graduation"): CourseFamily[] {
  return COURSE_FAMILIES.filter((f) => f.after === level);
}

export function familiesFromStream(option: StreamOptionSlug): CourseFamily[] {
  return COURSE_FAMILIES.filter((f) => f.fromStreams.includes(option));
}

/** The name to print for a family reached from an option: the narrowing label
 *  of the option → family edge when its rule covers only part of the family
 *  (the diploma: B.Arch only; no Mathematics: the NDA Army wing only), else
 *  the family's own name. 30 Sep 2026 review fix — a "leads to" or "courses"
 *  list must not claim more than the edge's sourced note. */
export function familyNameFrom(option: StreamOptionSlug, f: CourseFamily): string {
  const e = PATH_EDGES.find((x) => x.from === `stream:${option}` && x.to === `course:${f.id}` && x.kind !== "closes");
  return e?.label ?? f.name;
}

/** The careers a family leads to: its own careerSlugs list when it has one
 *  (COURSE_FAMILY_DETAILS, 30 Sep 2026 review fix — a whole category can hold
 *  careers the family does not lead to), else CAREERS filtered by the family's
 *  careerCategories (computed; the 94-vs-109 discrepancy settles itself). */
export function careersForFamily(f: CourseFamily): Career[] {
  const slugs = COURSE_FAMILY_DETAILS[f.id]?.careerSlugs;
  if (slugs) return slugs.map((slug) => CAREERS.find((c) => c.slug === slug)).filter((c): c is Career => !!c);
  const cats = new Set(f.careerCategories);
  return CAREERS.filter((c) => cats.has(c.category));
}

// ── Scholarships ─────────────────────────────────────────────────────────

/** Schemes for the stage's levels, open only (OFFERED_SCHEMES: presented, not
 *  discontinued, no aggregator, no unlisted row). With a state: national schemes
 *  plus that state's; without one: national schemes only. */
export function scholarshipsForStage(stage: PathStage, stateCode?: string | null): Scholarship[] {
  if (stage.scholarshipLevels.length === 0) return [];
  const levels = new Set<ScholarshipLevel>(stage.scholarshipLevels);
  return OFFERED_SCHEMES.filter(
    (s) => s.levels.some((l) => levels.has(l)) && (s.state === null || (stateCode != null && s.state === stateCode)),
  );
}

// ── Validation ───────────────────────────────────────────────────────────

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar day "YYYY-MM-DD". */
export function isYmdDay(d: string): boolean {
  if (!YMD.test(d)) return false;
  const t = new Date(`${d}T00:00:00Z`);
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d;
}

/** Class numbers and the school-system shorthands our copy may carry:
 *  "Class 10", "Class 11-12", "Class 1-10", "Class VIII", "10+2", "10th", "12th". */
const CLASS_NUMBER_RE = /\bClass(?:es)?\s+(?:\d{1,2}(?:\s*(?:-|–|to|and)\s*\d{1,2})?|[IVX]+)\b|\b10\+2\b|\b(?:[1-9]|1[0-2])(?:st|nd|rd|th)\b/gi;

/** Digits left in `text` once class numbers are removed ("" when none). */
export function strayDigits(text: string): string {
  return text.replace(CLASS_NUMBER_RE, "").replace(/[^0-9]/g, "");
}

function checkSource(where: string, s: PathSource | null | undefined, problems: string[]) {
  if (!s) {
    problems.push(`${where}: no source`);
    return;
  }
  if (!isAllowedSourceUrl(s.url)) problems.push(`${where}: source host not allowed (${s.url})`);
  if (!isYmdDay(s.checkedOn)) problems.push(`${where}: checkedOn is not a real day (${s.checkedOn})`);
  if (!s.publisher.trim() || !s.title.trim()) problems.push(`${where}: source needs publisher and title`);
}

function checkFact(where: string, f: PathFact, problems: string[]) {
  if (!f.text.trim()) problems.push(`${where}: empty fact text`);
  if (f.status === "confirmed") checkSource(where, f.source, problems);
  if (f.status === "unconfirmed" && f.source) problems.push(`${where}: an unconfirmed fact carries a source (mark it confirmed or drop the source)`);
}

function checkCopy(where: string, text: string, problems: string[]) {
  const d = strayDigits(text);
  if (d) problems.push(`${where}: digits in our own copy ("${text}")`);
  if (/\b(best|#1|number one|biggest|largest|top-ranked)\b|starting salary|salary/i.test(text)) {
    problems.push(`${where}: forbidden word in our own copy ("${text}")`);
  }
}

/** Every node id the registry knows. */
export function knownNodeIds(): Set<string> {
  const ids = new Set<string>();
  for (const s of PATH_STAGES) ids.add(`stage:${s.id}`);
  for (const o of STREAM_OPTIONS) ids.add(`stream:${o.slug}`);
  for (const f of COURSE_FAMILIES) ids.add(`course:${f.id}`);
  for (const e of PATH_EXAMS) ids.add(`exam:${e.code}`);
  for (const s of ALL_STREAMS) ids.add(`college-stream:${s.value}`);
  for (const c of CAREERS) ids.add(`career:${c.slug}`);
  for (const c of CAREER_CATEGORIES) ids.add(`career-cat:${c.slug}`);
  return ids;
}

/** Problems found in the registry; [] when it is sound. */
export function validatePathRegistry(): string[] {
  const problems: string[] = [];

  // Stages: exactly the declared ids, in life order.
  const stageIds = PATH_STAGES.map((s) => s.id);
  if (stageIds.join("|") !== PATH_STAGE_IDS.join("|")) problems.push(`stages: order/ids differ from PATH_STAGE_IDS (${stageIds.join(", ")})`);
  for (const s of PATH_STAGES) {
    checkCopy(`stage ${s.id} label`, s.label, problems);
    checkCopy(`stage ${s.id} shortLabel`, s.shortLabel, problems);
    if (!s.hubPath.startsWith("/")) problems.push(`stage ${s.id}: hubPath must be site-relative`);
    if (s.mayIncludeChildren && s.onbStage !== null) problems.push(`stage ${s.id}: a child-capable stage must never fill onbStage`);
  }
  for (const [id, facts] of Object.entries(STAGE_HUB_FACTS)) {
    if (!(PATH_STAGE_IDS as readonly string[]).includes(id)) problems.push(`STAGE_HUB_FACTS: unknown stage ${id}`);
    (facts ?? []).forEach((f, i) => checkFact(`stage ${id} fact ${i}`, f, problems));
  }

  // Stream options: exactly the declared slugs, in order.
  const slugs = STREAM_OPTIONS.map((o) => o.slug);
  if (slugs.join("|") !== STREAM_OPTION_SLUGS.join("|")) problems.push(`streams: order/slugs differ from STREAM_OPTION_SLUGS (${slugs.join(", ")})`);
  const anchors = new Set<string>();
  for (const o of STREAM_OPTIONS) {
    checkCopy(`stream ${o.slug} title`, o.title, problems);
    checkCopy(`stream ${o.slug} whatItIs`, o.whatItIs, problems);
    checkCopy(`stream ${o.slug} suits`, o.suits, problems);
    if (o.aliases.length === 0) problems.push(`stream ${o.slug}: no aliases`);
    if (new Set(o.aliases.map((a) => a.toLowerCase())).size !== o.aliases.length) problems.push(`stream ${o.slug}: duplicate alias`);
    checkFact(`stream ${o.slug} duration`, o.duration, problems);
    o.facts.forEach((f, i) => checkFact(`stream ${o.slug} fact ${i}`, f, problems));
    if (o.legacyAnchor) {
      if (anchors.has(o.legacyAnchor)) problems.push(`stream ${o.slug}: legacy anchor #${o.legacyAnchor} used twice`);
      anchors.add(o.legacyAnchor);
    }
    for (const p of o.existingPages) {
      if (!p.href.startsWith("/")) problems.push(`stream ${o.slug}: existing page ${p.href} must be site-relative`);
      checkCopy(`stream ${o.slug} page label`, p.label, problems);
    }
  }

  // Board rows.
  for (const [i, r] of BOARD_STREAM_COMBINATIONS.entries()) {
    const where = `board row ${i} (${r.board} ${r.option} ${r.groupCode ?? r.localName})`;
    if (!isStreamOptionSlug(r.option)) problems.push(`${where}: unknown option`);
    if (r.stateCode !== null && !STATES[r.stateCode]) problems.push(`${where}: unknown state ${r.stateCode}`);
    if (r.subjects.length === 0) problems.push(`${where}: no subjects`);
    if (!r.localName.trim()) problems.push(`${where}: no local name`);
    if (r.status === "confirmed") checkSource(where, r.source, problems);
  }
  const rowKeys = BOARD_STREAM_COMBINATIONS.map((r) => `${r.board}|${r.option}|${r.groupCode ?? ""}|${r.subjects.join(",")}`);
  if (new Set(rowKeys).size !== rowKeys.length) problems.push("board rows: duplicate row");
  for (const b of BOARD_CHECK_LINKS) {
    if (!isAllowedSourceUrl(b.url)) problems.push(`board check ${b.board}: site not an allowed official host (${b.url})`);
    if (b.stateCode !== null && !STATES[b.stateCode]) problems.push(`board check ${b.board}: unknown state ${b.stateCode}`);
    for (const o of b.options) {
      if (!isStreamOptionSlug(o)) problems.push(`board check ${b.board}: unknown option ${o}`);
      if (BOARD_STREAM_COMBINATIONS.some((r) => r.board === b.board && r.option === o && r.status === "confirmed")) {
        problems.push(`board check ${b.board}: ${o} has confirmed rows, so it cannot also be "check the site"`);
      }
    }
  }

  // Course families.
  const familyIds = COURSE_FAMILIES.map((f) => f.id);
  if (new Set(familyIds).size !== familyIds.length) problems.push("course families: duplicate id");
  const streamValues = new Set<CollegeStream>(ALL_STREAMS.map((s) => s.value));
  const catSlugs = new Set(CAREER_CATEGORIES.map((c) => c.slug));
  const examCodes = new Set(PATH_EXAMS.map((e) => e.code));
  for (const f of COURSE_FAMILIES) {
    checkCopy(`family ${f.id} name`, f.name, problems);
    if (f.collegeStream && !streamValues.has(f.collegeStream)) problems.push(`family ${f.id}: unknown college stream ${f.collegeStream}`);
    for (const c of f.careerCategories) if (!catSlugs.has(c)) problems.push(`family ${f.id}: unknown career category ${c}`);
    for (const s of f.fromStreams) if (!isStreamOptionSlug(s)) problems.push(`family ${f.id}: unknown stream ${s}`);
    for (const c of f.examCodes) if (!examCodes.has(c)) problems.push(`family ${f.id}: exam code ${c} is not in PATH_EXAMS`);
    for (const l of f.links) {
      if (!l.href.startsWith("/")) problems.push(`family ${f.id}: link ${l.href} must be site-relative`);
      checkCopy(`family ${f.id} link label`, l.label, problems);
    }
    if (f.links.length === 0) problems.push(`family ${f.id}: needs at least one existing page`);
    const d = COURSE_FAMILY_DETAILS[f.id];
    if (!d) problems.push(`family ${f.id}: no COURSE_FAMILY_DETAILS entry`);
    else {
      checkCopy(`family ${f.id} whatItIs`, d.whatItIs, problems);
      checkFact(`family ${f.id} duration`, d.duration, problems);
      if (d.careerSlugs) {
        if (d.careerSlugs.length === 0) problems.push(`family ${f.id}: careerSlugs is set but empty`);
        const careerSlugs = new Set(CAREERS.map((c) => c.slug));
        for (const slug of d.careerSlugs) if (!careerSlugs.has(slug)) problems.push(`family ${f.id}: unknown career ${slug}`);
      }
    }
  }
  for (const id of Object.keys(COURSE_FAMILY_DETAILS)) if (!familyIds.includes(id)) problems.push(`COURSE_FAMILY_DETAILS: unknown family ${id}`);

  // Exams.
  const codes = PATH_EXAMS.map((e) => e.code);
  if (new Set(codes).size !== codes.length) problems.push("exams: duplicate code");
  for (const e of PATH_EXAMS) if (!/^[A-Z0-9_]+$/.test(e.code) || !e.label.trim()) problems.push(`exam ${e.code}: bad code or empty label`);

  // Edges.
  const known = knownNodeIds();
  const pairKinds = new Map<string, Set<string>>();
  for (const [i, e] of PATH_EDGES.entries()) {
    const where = `edge ${i} (${e.from} ${e.kind} ${e.to})`;
    if (!known.has(e.from)) problems.push(`${where}: unknown from-node`);
    if (!known.has(e.to)) problems.push(`${where}: unknown to-node`);
    if (e.from === e.to) problems.push(`${where}: self edge`);
    if (e.note !== undefined) {
      checkCopy(`${where} note`, e.note, problems);
      if (e.kind === "keeps-open" || e.kind === "closes") checkSource(where, e.source, problems);
    }
    if (e.label !== undefined) {
      checkCopy(`${where} label`, e.label, problems);
      if (!e.label.trim()) problems.push(`${where}: empty label`);
      // A narrowing label says what a sourced note covers; it never stands alone.
      if (!e.note || !e.source) problems.push(`${where}: a label narrows a sourced note, so it needs both`);
    }
    if (e.kind === "closes" && !e.source) problems.push(`${where}: a "closes" edge states a rule and needs a source`);
    if (e.source) checkSource(where, e.source, problems);
    const pk = `${e.from}>${e.to}`;
    const kinds = pairKinds.get(pk) ?? new Set<string>();
    if (kinds.has(e.kind)) problems.push(`${where}: duplicate edge`);
    kinds.add(e.kind);
    pairKinds.set(pk, kinds);
  }
  for (const [pk, kinds] of pairKinds) {
    if (kinds.has("keeps-open") && kinds.has("closes")) problems.push(`edges ${pk}: both keeps-open and closes`);
  }
  return problems;
}
