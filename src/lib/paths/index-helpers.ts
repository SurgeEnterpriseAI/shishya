// Shared helpers over the path registry (30 Sep 2026, P1 build 1).
//
// One place for what several P1 surfaces need from the registry — the pages
// (agent B), context.md / JSON-LD / sitemap / llms lines and the search index
// (agent C):
//   • paths and absolute URLs of the stage hubs and the stream pages;
//   • exam chips: a code links /exams/{code} only while the exam is live
//     (examHubHref over loadLiveExams' map, the /career-map pattern), else it
//     is a plain label — so no chip can 404;
//   • a node's page and label, for any PathNodeId;
//   • the search words for a stream page or a stage hub (aliases + the
//     phrases students type, in every script — PATH_SEARCH_TERMS), for
//     src/lib/search/index-core.ts to build its docs from (never typed there);
//   • de-duplicated source lists for the "Sources and last checked" block.
//
// Pure: no DB, clock or React (the caller passes the live-exam map).

import { ALL_STREAMS } from "@/lib/colleges-data";
import { findCareer, careerCategoryLabel } from "@/data/careers";
import { examHubHref } from "@/lib/section-seo";
import {
  findCourseFamily,
  findPathExam,
  findStage,
  findStreamOption,
  type PathFact,
  type PathNodeId,
  type PathSource,
  type PathStageId,
  type StreamOption,
  type StreamOptionSlug,
} from "@/data/paths";
import { PATH_SEARCH_TERMS, pathCopy } from "./copy";

export const SITE = "https://shishya.in";

/** Parent of the nine option pages (kept: its section anchors stay). */
export const STREAM_PAGE_ROOT = "/schooling/streams";

/** The live-exam lookup examHubHref accepts (loadLiveExams' map, or a set in tests). */
export type LiveExams = ReadonlySet<string> | ReadonlyMap<string, unknown>;

export function streamPagePath(slug: StreamOptionSlug): string {
  return `${STREAM_PAGE_ROOT}/${slug}`;
}

export function absoluteUrl(path: string): string {
  return path.startsWith("http") ? path : `${SITE}${path}`;
}

export function streamPageUrl(slug: StreamOptionSlug): string {
  return absoluteUrl(streamPagePath(slug));
}

export function stageHubPath(id: PathStageId): string {
  return findStage(id)?.hubPath ?? "/";
}

/** "MPC / PCM" — both vocabularies, for nav links, breadcrumbs and tutor seeds. */
export function streamShortLabel(slug: StreamOptionSlug, locale?: string | null): string {
  return pathCopy(locale).stream.short[slug];
}

// ── Exam chips ───────────────────────────────────────────────────────────

export interface ExamChip {
  /** Registry code, or null for a label-only exam (CourseFamily.examLabels). */
  code: string | null;
  label: string;
  /** /exams/{code} while the exam is live; null = print the label as text. */
  href: string | null;
}

export function examChip(code: string, live: LiveExams): ExamChip {
  return { code, label: findPathExam(code)?.label ?? code.replace(/_/g, " "), href: examHubHref(code, live) };
}

/** Chips for codes (linked while live) then plain labels, de-duplicated by label. */
export function examChips(codes: readonly string[], labels: readonly string[], live: LiveExams): ExamChip[] {
  const out: ExamChip[] = [];
  const seen = new Set<string>();
  const push = (c: ExamChip) => {
    const k = c.label.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(c);
  };
  for (const code of codes) push(examChip(code, live));
  for (const label of labels) push({ code: null, label, href: null });
  return out;
}

// ── Nodes ────────────────────────────────────────────────────────────────

/** The page a node opens, or null (an exam that is not live, an unknown id). */
export function pathNodeHref(id: PathNodeId | string, live: LiveExams): string | null {
  const [kind, ...rest] = id.split(":");
  const key = rest.join(":");
  switch (kind) {
    case "stage":
      return findStage(key)?.hubPath ?? null;
    case "stream":
      return findStreamOption(key) ? streamPagePath(key as StreamOptionSlug) : null;
    case "course":
      return findCourseFamily(key)?.links[0]?.href ?? null;
    case "exam":
      return examHubHref(key, live);
    case "college-stream":
      return ALL_STREAMS.some((s) => s.value === key) ? `/colleges/stream/${key}` : null;
    case "career":
      return findCareer(key) ? `/careers/${key}` : null;
    case "career-cat":
      return "/careers";
    default:
      return null;
  }
}

/** A node's printable name. */
export function pathNodeLabel(id: PathNodeId | string, locale?: string | null): string {
  const [kind, ...rest] = id.split(":");
  const key = rest.join(":");
  switch (kind) {
    case "stage":
      return findStage(key)?.label ?? key;
    case "stream":
      return findStreamOption(key) ? streamShortLabel(key as StreamOptionSlug, locale) : key;
    case "course":
      return findCourseFamily(key)?.name ?? key;
    case "exam":
      return findPathExam(key)?.label ?? key.replace(/_/g, " ");
    case "college-stream":
      return ALL_STREAMS.find((s) => s.value === key)?.label ?? key;
    case "career":
      return findCareer(key)?.name ?? key;
    case "career-cat":
      return careerCategoryLabel(key);
    default:
      return key;
  }
}

// ── Search words (for src/lib/search/index-core.ts) ─────────────────────

function uniq(xs: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of xs) {
    const k = x.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(x.trim());
  }
  return out;
}

/** A stream page's search words: its aliases, its short name, and the
 *  "which group after 10th" phrases in every script. */
export function streamSearchTerms(option: StreamOption): string[] {
  const t = PATH_SEARCH_TERMS;
  return uniq([
    ...option.aliases,
    streamShortLabel(option.slug),
    ...option.aliases.slice(0, 2).map((a) => `${a} after 10th`),
    ...t.en.streams,
    ...t.hi.streams,
    ...t.te.streams,
  ]);
}

/** A new stage hub's search words, in every script. */
export function stageSearchTerms(id: "after-10th" | "after-12th"): string[] {
  const t = PATH_SEARCH_TERMS;
  const stage = findStage(id);
  const key = id === "after-10th" ? "after10" : "after12";
  return uniq([...(stage ? [stage.label, stage.shortLabel] : []), ...t.en[key], ...t.hi[key], ...t.te[key]]);
}

// ── Sources ──────────────────────────────────────────────────────────────

/** Sources in first-seen order, one per URL. */
export function uniqueSources(list: readonly (PathSource | null | undefined)[]): PathSource[] {
  const seen = new Set<string>();
  const out: PathSource[] = [];
  for (const s of list) {
    if (!s || seen.has(s.url)) continue;
    seen.add(s.url);
    out.push(s);
  }
  return out;
}

/** The sources behind a list of facts (unconfirmed facts have none). */
export function factSources(facts: readonly PathFact[]): PathSource[] {
  return uniqueSources(facts.map((f) => (f.status === "confirmed" ? f.source : null)));
}

/** "2026-09-30" → "30 Sep 2026" (UTC, no clock). */
export function formatReadDay(day: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return day;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}`;
}
