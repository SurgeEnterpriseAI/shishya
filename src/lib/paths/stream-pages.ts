// /schooling/streams/{option}: the page model and its index gate
// (30 Sep 2026, P1 build 1, spec §2.3).
//
// Nine pages, one per option after Class 10. Every block is computed from the
// registry (src/data/paths): the lead from the option's own copy and its
// duration fact; the board table from CONFIRMED rows only (an unconfirmed
// board appears only as a "check {board}'s official site" link); what the
// option keeps open or closes from its sourced edges (one line per fact: an
// exam line that a course-family line restates from the same document is
// folded into it as its chip, 1 Oct 2026); exam chips linked only
// while the exam is live; next links through the course families to college
// streams and careers; the tutor entry; and one "Sources and last checked"
// list. Nothing unconfirmed is ever in the model.
//
// Index gate (the sitemap uses the same function):
//   • a Class 11-12 group (MPC, BiPC, PCMB, Commerce, Arts) is indexable with
//     confirmed rows from at least STREAM_INDEX_MIN_CONFIRMED boards —
//     distinct boards, so one board's many group codes do not count as
//     breadth;
//   • vocational, the diploma, ITI and NIOS (spec §2.4) need at least one
//     confirmed fact on an official source (a board, AICTE, DGT, NIOS) — NIOS
//     is one national board, so a two-board floor could never apply to it;
//   • and every exam chip has a label (a chip either links a live hub or is a
//     plain label — it can never 404).
// A page below the gate still renders, as noindex,follow (schoolRobots).
//
// Pure: no DB, clock or React. The caller passes loadLiveExams()' map.

import {
  STREAM_OPTIONS,
  STREAM_OPTION_SLUGS,
  boardChecksFor,
  careersForFamily,
  combinationsFor,
  confirmedBoardCount,
  edgesFrom,
  familiesFromStream,
  familyNameFrom,
  findCourseFamily,
  findStreamOption,
  isStreamOptionSlug,
  printableFacts,
  type BoardCheckLink,
  type BoardStreamCombination,
  type PathFact,
  type PathNodeId,
  type PathSource,
  type StreamOption,
  type StreamOptionSlug,
} from "@/data/paths";
import { familyRuleExam } from "@/data/paths/edges";
import { ALL_STREAMS } from "@/lib/colleges-data";
import { clipDescription, fitTitle } from "@/lib/section-seo";
import { fillCopy, pathCopy } from "./copy";
import {
  STREAM_PAGE_ROOT,
  absoluteUrl,
  examChip,
  examChips,
  factSources,
  pathNodeHref,
  pathNodeLabel,
  streamPagePath,
  streamShortLabel,
  uniqueSources,
  type ExamChip,
  type LiveExams,
} from "./index-helpers";
import { stageTutorHref } from "./stage-tutor";

/** Distinct boards with confirmed rows a Class 11-12 option needs to be indexed. */
export const STREAM_INDEX_MIN_CONFIRMED = 2;

/** Options whose page carries a board-by-board subject table. */
export function hasBoardTable(option: Pick<StreamOption, "kind">): boolean {
  return option.kind === "class-11-12" || option.kind === "vocational-11-12" || option.kind === "open-school";
}

/** Exam codes and labels on an option's page: its sourced keeps-open exam edges,
 *  then the exams of the course families it keeps open (or leads to). */
export function streamExamRefs(slug: StreamOptionSlug): { codes: string[]; labels: string[] } {
  const codes: string[] = [];
  const labels: string[] = [];
  for (const e of edgesFrom(`stream:${slug}`)) {
    if (e.kind === "keeps-open" && e.to.startsWith("exam:")) codes.push(e.to.slice("exam:".length));
  }
  for (const f of familiesFromStream(slug)) {
    codes.push(...f.examCodes);
    labels.push(...f.examLabels);
  }
  return { codes: [...new Set(codes)], labels: [...new Set(labels)] };
}

/** The gate's rule on its inputs (tests feed it counts below the floor). */
export function streamIndexVerdict(input: {
  option: Pick<StreamOption, "kind">;
  /** Distinct boards with confirmed rows. */
  confirmedBoards: number;
  /** Confirmed facts on an official source. */
  officialFacts: number;
  /** Exam chips that would render with an empty label. */
  unlabelledChips: number;
}): boolean {
  if (input.unlabelledChips > 0) return false;
  return input.option.kind === "class-11-12"
    ? input.confirmedBoards >= STREAM_INDEX_MIN_CONFIRMED
    : input.officialFacts >= 1;
}

/** The index gate (page robots and sitemap share it). */
export function isStreamPageIndexable(slug: string): boolean {
  if (!isStreamOptionSlug(slug)) return false;
  const option = findStreamOption(slug);
  if (!option) return false;
  const { codes, labels } = streamExamRefs(slug);
  return streamIndexVerdict({
    option,
    confirmedBoards: confirmedBoardCount(slug),
    officialFacts: printableFacts(option.facts).filter((f) => f.status === "confirmed" && f.source?.tier === "official").length,
    // A chip either links a live hub or prints its label; it must never be empty.
    unlabelledChips: examChips(codes, labels, new Set<string>()).filter((c) => !c.label.trim()).length,
  });
}

/** schema.org timeToComplete for the option, only when its duration fact is
 *  confirmed and fixed: "P2Y" for Class 11-12 (incl. vocational), "P3Y" for
 *  the AICTE diploma; null for ITI (one or two years by trade) and NIOS
 *  (not read). Spec §2.3. */
export function streamDurationIso(option: Pick<StreamOption, "kind" | "duration">): string | null {
  if (option.duration.status !== "confirmed" || !option.duration.source) return null;
  if (option.kind === "class-11-12" || option.kind === "vocational-11-12") return "P2Y";
  if (option.kind === "diploma") return "P3Y";
  return null;
}

/** The indexable option slugs, registry order (sitemap, llms-full). */
export function indexableStreamSlugs(): StreamOptionSlug[] {
  return STREAM_OPTION_SLUGS.filter((s) => isStreamPageIndexable(s));
}

export interface StreamEdgeLine {
  kind: "keeps-open" | "closes";
  to: PathNodeId;
  label: string;
  href: string | null;
  note: string | null;
  source: PathSource | null;
  /** The exam whose own rule this course-family line quotes, folded in from
   *  the option's line to that exam (same rule, same document) — printed as
   *  the line's chip. Empty on an exam's own line and on a family line whose
   *  rule is no exam's (architecture, the AICTE diploma). 1 Oct 2026 fix. */
  exams: ExamChip[];
}

export interface LinkItem {
  href: string;
  label: string;
}

export interface StreamPageModel {
  /** The option with its facts cut to the printable ones (an unconfirmed
   *  duration keeps its status but loses its text), so a page that reads
   *  `option` directly still cannot print an unconfirmed fact. */
  option: StreamOption;
  slug: StreamOptionSlug;
  path: string;
  canonical: string;
  h1: string;
  /** <title> via fitTitle. */
  title: string;
  description: string;
  shortLabel: string;
  breadcrumb: ReadonlyArray<readonly [string, string]>;
  lead: { whatItIs: string; duration: PathFact | null; suits: string };
  boardTable: {
    applies: boolean;
    /** Confirmed rows only. */
    rows: BoardStreamCombination[];
    /** Set when the table applies and no row is confirmed. */
    pendingMessage: string | null;
    /** Boards not read: a link to their own site, nothing else. */
    checks: Array<BoardCheckLink & { linkText: string }>;
  };
  keepsOpen: StreamEdgeLine[];
  closes: StreamEdgeLine[];
  exams: ExamChip[];
  /** Printable decision facts (confirmed / estimate), registry order. */
  facts: PathFact[];
  existingPages: readonly LinkItem[];
  next: {
    families: Array<{ id: string; name: string; href: string }>;
    collegeStreams: LinkItem[];
    careers: LinkItem[];
  };
  tutorHref: string | null;
  /** Every source the page prints, first-seen order, one per URL. */
  sources: PathSource[];
  indexable: boolean;
}

/** The option's lines to an exam that a course-family line of the same kind
 *  restates: the family's rule quotes that exam's own rule (familyRuleExam)
 *  and both cite the same document. Map: exam node → the family node it
 *  folds into. A line on a different document is a different read and stays. */
export function foldedExamLines(slug: StreamOptionSlug, kind: "keeps-open" | "closes"): Map<PathNodeId, PathNodeId> {
  const edges = edgesFrom(`stream:${slug}`).filter((e) => e.kind === kind);
  const folded = new Map<PathNodeId, PathNodeId>();
  for (const e of edges) {
    if (!e.to.startsWith("course:") || !e.source) continue;
    const code = familyRuleExam(e.to.slice("course:".length), slug);
    if (!code) continue;
    const twin = edges.find((x) => x.to === `exam:${code}` && x.source?.url === e.source!.url);
    if (twin && !folded.has(twin.to)) folded.set(twin.to, e.to);
  }
  return folded;
}

function edgeLines(slug: StreamOptionSlug, kind: "keeps-open" | "closes", live: LiveExams): StreamEdgeLine[] {
  // 1 Oct 2026 (fix): "What it keeps open" printed CLAT, NDA, CUET UG, NEET UG
  // and JEE Main twice — once as the exam's line, once inside the course
  // family whose rule is that exam's rule, same document ("CLAT — No stream
  // is named…" beside "Law … — CLAT names no stream…"). The family line
  // stays, with the exam as its chip, and the exam's own line goes; the
  // family note carries every fact the exam line held (src/data/paths/edges.ts
  // familyRule), and the source is the same one, so nothing is lost.
  const folded = foldedExamLines(slug, kind);
  return edgesFrom(`stream:${slug}`)
    .filter((e) => e.kind === kind && !folded.has(e.to))
    .map((e) => ({
      kind,
      to: e.to,
      // 30 Sep 2026 (review fix): an edge whose note covers only part of the
      // course family carries a narrowing label; print that, never the whole family.
      label: e.label ?? pathNodeLabel(e.to),
      href: pathNodeHref(e.to, live),
      note: e.note ?? null,
      // A note that states a rule carries its source; a plain path has none.
      source: e.source ?? null,
      exams: [...folded].filter(([, family]) => family === e.to).map(([exam]) => examChip(exam.slice("exam:".length), live)),
    }));
}

/** The whole page, or null for an unknown slug (the route 404s). */
export function streamPageModel(slug: string, live: LiveExams, locale?: string | null): StreamPageModel | null {
  if (!isStreamOptionSlug(slug)) return null;
  const option = findStreamOption(slug);
  if (!option) return null;
  const copy = pathCopy(locale);
  const path = streamPagePath(slug);
  const short = streamShortLabel(slug, locale);

  const duration = printableFacts([option.duration])[0] ?? null;
  const applies = hasBoardTable(option);
  const rows = applies ? combinationsFor(slug, { confirmedOnly: true }) : [];
  const checks = applies
    ? boardChecksFor(slug).map((b) => ({ ...b, linkText: fillCopy(copy.boards.checkSite, { board: b.boardName }) }))
    : [];

  const keepsOpen = edgeLines(slug, "keeps-open", live);
  const closes = edgeLines(slug, "closes", live);
  const { codes, labels } = streamExamRefs(slug);
  const exams = examChips(codes, labels, live);
  const facts = printableFacts(option.facts);

  const families = familiesFromStream(slug);
  const collegeStreamSeen = new Set<string>();
  const collegeStreams: LinkItem[] = [];
  // 30 Sep 2026 (review fix): a career reached through a family this option
  // closes (the engineering careers, the architect on BiPC / Commerce / Arts)
  // is never listed, even if another family's list holds it.
  const careerSeen = new Set<string>(
    closes
      .filter((l) => l.to.startsWith("course:"))
      .flatMap((l) => {
        const f = findCourseFamily(l.to.slice("course:".length));
        return f ? careersForFamily(f).map((c) => c.slug) : [];
      }),
  );
  const careers: LinkItem[] = [];
  for (const f of families) {
    if (f.collegeStream && !collegeStreamSeen.has(f.collegeStream)) {
      collegeStreamSeen.add(f.collegeStream);
      const label = ALL_STREAMS.find((s) => s.value === f.collegeStream)?.label ?? f.collegeStream;
      collegeStreams.push({ href: `/colleges/stream/${f.collegeStream}`, label });
    }
    for (const c of careersForFamily(f)) {
      if (careerSeen.has(c.slug)) continue;
      careerSeen.add(c.slug);
      careers.push({ href: `/careers/${c.slug}`, label: c.name });
    }
  }

  const sources = uniqueSources([
    ...(duration?.status === "confirmed" ? [duration.source] : []),
    ...rows.map((r) => r.source),
    ...keepsOpen.map((l) => l.source),
    ...closes.map((l) => l.source),
    ...factSources(facts),
  ]);

  // 30 Sep 2026 (review fix): the diploma and ITI pages have no board subject
  // table, so their title does not promise "Subjects".
  const title = fitTitle(fillCopy(copy.stream.titleCore, { short }), applies ? copy.stream.titleTails : copy.stream.titleTailsNoBoardTable);
  const description = clipDescription(fillCopy(copy.stream.description, { title: option.title, what: option.whatItIs }));

  const safeOption: StreamOption = {
    ...option,
    duration: duration ?? { text: "", status: "unconfirmed", source: null },
    facts,
  };

  return {
    option: safeOption,
    slug,
    path,
    canonical: absoluteUrl(path),
    h1: option.title,
    title,
    description,
    shortLabel: short,
    breadcrumb: [
      [copy.stream.breadcrumbSchooling, "/schooling"],
      [copy.stream.breadcrumbStreams, STREAM_PAGE_ROOT],
      [short, path],
    ],
    lead: { whatItIs: option.whatItIs, duration, suits: option.suits },
    boardTable: {
      applies,
      rows,
      pendingMessage: applies && rows.length === 0 ? copy.boards.pending : null,
      checks,
    },
    keepsOpen,
    closes,
    exams,
    facts,
    existingPages: option.existingPages,
    next: {
      families: families.map((f) => ({ id: f.id, name: familyNameFrom(slug, f), href: f.links[0].href })),
      collegeStreams,
      careers,
    },
    tutorHref: stageTutorHref(`stream:${slug}`, { locale }),
    sources,
    indexable: isStreamPageIndexable(slug),
  };
}

/** All nine page models, registry order (context.md, llms-full, tests). */
export function allStreamPageModels(live: LiveExams, locale?: string | null): StreamPageModel[] {
  return STREAM_OPTIONS.map((o) => streamPageModel(o.slug, live, locale)).filter((m): m is StreamPageModel => m !== null);
}
