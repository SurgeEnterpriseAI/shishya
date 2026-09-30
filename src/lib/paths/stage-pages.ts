// /after-10th and /after-12th: the page models and their index gate
// (30 Sep 2026, P1 build 1, spec §2.2).
//
// Body order (the page follows the model): 1 lead with a computed count ·
// 2 options table · 3 decision facts (confirmed only) · 4 next links ·
// 5 tutor entry · 6 save slot (build 2) · 7 scholarships for the stage
// (computed, open schemes) · 8 "Exams after Class 10 / 12" (count passed in
// from levelCounts, never typed) · 9 sources.
//
// /after-10th lists the nine options after Class 10 (STREAM_OPTIONS, each
// linking its /schooling/streams/{option} page). /after-12th lists the course
// families after Class 12 (each linking its first existing page), then
// "Government jobs and exams after Class 12" (/exams/after/12th), open and
// distance learning and study abroad.
//
// Index gate: at least STAGE_HUB_MIN_LIVE_OPTIONS options with a page to open;
// below it the hub renders as noindex,follow. Every count on the page is the
// length of a computed list.
//
// Pure: no DB, clock or React. The caller passes loadLiveExams()' map and, if
// it has read them, the level totals (src/lib/exam-qualification.ts
// levelCounts) and a state for state scholarships.

import {
  COURSE_FAMILY_DETAILS,
  STAGE_HUB_FACTS,
  STREAM_OPTIONS,
  careersForFamily,
  courseFamiliesAfter,
  edgesTo,
  familiesFromStream,
  familyNameFrom,
  findStage,
  printableFacts,
  scholarshipsForStage,
  type PathFact,
  type PathSource,
  type PathStage,
  type StreamOptionSlug,
} from "@/data/paths";
import type { Scholarship } from "@/data/scholarships";
import { ALL_STREAMS } from "@/lib/colleges-data";
import { clipDescription, fitTitle } from "@/lib/section-seo";
import { fillCopy, pathCopy } from "./copy";
import {
  absoluteUrl,
  examChips,
  factSources,
  streamPagePath,
  streamShortLabel,
  uniqueSources,
  type ExamChip,
  type LiveExams,
} from "./index-helpers";
import { streamExamRefs, type LinkItem } from "./stream-pages";
import { stageTutorHref } from "./stage-tutor";

export type StageHubId = "after-10th" | "after-12th";

/** Options with a page to open that a hub needs to be indexed. */
export const STAGE_HUB_MIN_LIVE_OPTIONS = 5;

export interface StageOptionRow {
  /** stream slug, course family id, or a fixed id for the extra link rows. */
  id: string;
  kind: "stream" | "course" | "link";
  name: string;
  /** Short name for chips and mobile cards ("MPC / PCM"; a family's own name). */
  shortName: string;
  aliases: readonly string[];
  whatItIs: string | null;
  /** Printable duration (confirmed or estimate), else null. */
  duration: PathFact | null;
  suits: string | null;
  /** Course rows: the options after Class 10 a sourced rule keeps it open from
   *  (with the edge's narrowing label beside the option when the rule covers
   *  only part of the family). */
  from: LinkItem[];
  leadsTo: LinkItem[];
  exams: ExamChip[];
  /** The option's own page; null = nothing to open. */
  href: string | null;
}

export interface StageHubModel {
  stage: PathStage;
  path: string;
  canonical: string;
  h1: string;
  title: string;
  description: string;
  breadcrumb: ReadonlyArray<readonly [string, string]>;
  /** Filled with the computed option count. */
  lead: string;
  options: StageOptionRow[];
  facts: PathFact[];
  next: LinkItem[];
  tutorHref: string | null;
  /** Open schemes for the stage's levels (national, plus the state's when given). */
  scholarships: Scholarship[];
  examsAfter: { href: string; label: string; total: number | null };
  sources: PathSource[];
  indexable: boolean;
}

export interface StageHubOptions {
  /** Exams listed on /exams/after/{10th|12th} (levelCounts), when read. */
  examsAfterTotal?: number | null;
  /** ISO state code: adds that state's schemes to the national ones. */
  stateCode?: string | null;
  locale?: string | null;
}

/** Printable duration of a PathFact, or null. */
function printable(f: PathFact | undefined): PathFact | null {
  return f ? printableFacts([f])[0] ?? null : null;
}

function streamRows(live: LiveExams, locale?: string | null): StageOptionRow[] {
  return STREAM_OPTIONS.map((o) => {
    const { codes, labels } = streamExamRefs(o.slug);
    return {
      id: o.slug,
      kind: "stream" as const,
      name: o.title,
      shortName: streamShortLabel(o.slug, locale),
      aliases: o.aliases,
      whatItIs: o.whatItIs,
      duration: printable(o.duration),
      suits: o.suits,
      from: [],
      leadsTo: familiesFromStream(o.slug).map((f) => ({ href: f.links[0].href, label: familyNameFrom(o.slug, f) })),
      exams: examChips(codes, labels, live),
      href: streamPagePath(o.slug),
    };
  });
}

function familyRows(live: LiveExams, locale?: string | null): StageOptionRow[] {
  return courseFamiliesAfter("12th").map((f) => {
    const detail = COURSE_FAMILY_DETAILS[f.id];
    // Only rule-backed ("keeps-open") option → family edges, never a plain path.
    // 30 Sep 2026 (review fix): an edge whose rule covers only part of the
    // family (the diploma: B.Arch only; no Mathematics: the NDA Army wing
    // only) prints its narrowing label beside the option, so the column never
    // claims the whole family for it.
    const from = edgesTo(`course:${f.id}`)
      .filter((e) => e.kind === "keeps-open" && e.from.startsWith("stream:"))
      .map((e) => {
        const slug = e.from.slice("stream:".length) as StreamOptionSlug;
        const short = streamShortLabel(slug, locale);
        return { href: streamPagePath(slug), label: e.label ? `${short} (${e.label})` : short };
      });
    const leadsTo: LinkItem[] = [];
    if (f.collegeStream) {
      leadsTo.push({ href: `/colleges/stream/${f.collegeStream}`, label: ALL_STREAMS.find((s) => s.value === f.collegeStream)?.label ?? f.collegeStream });
    }
    for (const c of careersForFamily(f).slice(0, 3)) leadsTo.push({ href: `/careers/${c.slug}`, label: c.name });
    return {
      id: f.id,
      kind: "course" as const,
      name: f.name,
      shortName: f.name,
      aliases: f.aliases,
      whatItIs: detail?.whatItIs ?? null,
      duration: printable(detail?.duration),
      suits: null,
      from,
      leadsTo,
      exams: examChips(f.examCodes, f.examLabels, live),
      href: f.links[0]?.href ?? null,
    };
  });
}

function linkRow(id: string, name: string, whatItIs: string, href: string): StageOptionRow {
  return { id, kind: "link", name, shortName: name, aliases: [], whatItIs, duration: null, suits: null, from: [], leadsTo: [], exams: [], href };
}

/** Indexable with at least STAGE_HUB_MIN_LIVE_OPTIONS options that open a page. */
export function isStageHubIndexable(model: Pick<StageHubModel, "options">): boolean {
  return model.options.filter((o) => !!o.href).length >= STAGE_HUB_MIN_LIVE_OPTIONS;
}

function hubModel(id: StageHubId, options: StageOptionRow[], opts: StageHubOptions): StageHubModel {
  const stage = findStage(id);
  if (!stage) throw new Error(`[paths] unknown stage hub ${id}`);
  const copy = pathCopy(opts.locale);
  const c = id === "after-10th" ? copy.after10 : copy.after12;
  const n = options.length;
  const facts = printableFacts(STAGE_HUB_FACTS[id] ?? []);
  const sources = uniqueSources([
    ...factSources(facts),
    ...options.map((o) => (o.duration?.status === "confirmed" ? o.duration.source : null)),
  ]);
  const model: StageHubModel = {
    stage,
    path: stage.hubPath,
    canonical: absoluteUrl(stage.hubPath),
    h1: c.h1,
    title: fitTitle(c.titleCore, []),
    description: clipDescription(fillCopy(c.description, { n })),
    breadcrumb: [[c.breadcrumb, stage.hubPath]],
    lead: fillCopy(c.lead, { n }),
    options,
    facts,
    next: c.next.map((l) => ({ href: l.href, label: l.label })),
    tutorHref: stageTutorHref(`stage:${id}`, { locale: opts.locale }),
    scholarships: scholarshipsForStage(stage, opts.stateCode ?? null),
    examsAfter: {
      href: id === "after-10th" ? "/exams/after/10th" : "/exams/after/12th",
      label: c.examsAfterLabel,
      total: typeof opts.examsAfterTotal === "number" ? opts.examsAfterTotal : null,
    },
    sources,
    indexable: false,
  };
  model.indexable = isStageHubIndexable(model);
  return model;
}

/** /after-10th: the nine options after Class 10. */
export function afterTenthModel(live: LiveExams, opts: StageHubOptions = {}): StageHubModel {
  return hubModel("after-10th", streamRows(live, opts.locale), opts);
}

/** /after-12th: the course families after Class 12, then jobs, open learning, abroad. */
export function afterTwelfthModel(live: LiveExams, opts: StageHubOptions = {}): StageHubModel {
  const c = pathCopy(opts.locale).after12;
  const rows = [
    ...familyRows(live, opts.locale),
    linkRow("govt-jobs-after-12th", c.govtJobsName, c.govtJobsWhat, "/exams/after/12th"),
    linkRow("open-learning", c.openLearningName, c.openLearningWhat, "/distance-learning"),
    linkRow("study-abroad", c.abroadName, c.abroadWhat, "/worldwide"),
  ];
  return hubModel("after-12th", rows, opts);
}

/** Either hub by id. */
export function stageHubModel(id: StageHubId, live: LiveExams, opts: StageHubOptions = {}): StageHubModel {
  return id === "after-10th" ? afterTenthModel(live, opts) : afterTwelfthModel(live, opts);
}
