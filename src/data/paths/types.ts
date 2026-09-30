// The life-stage path graph: types (30 Sep 2026, P1 build 1, spec §1.2).
//
// Why: Shishya's sections (school, streams, exams, colleges, careers,
// scholarships) were separate islands. P1 adds one typed registry that says
// where a learner is (a stage), what they can pick next (a stream option or a
// course family) and what each pick keeps open or closes (typed edges). Every
// page, sitemap row, context.md, llms-full line, JSON-LD block and tutor seed
// of the P1 pages is computed from it — no count is typed anywhere.
//
// Honesty: a fact is printed only when it is `confirmed` with an official
// source and the day it was read; `unconfirmed` is kept for the audit trail and
// never printed. The §1.2 definitions below are copied exactly from the spec;
// the three additions at the end (PathExam, BoardCheckLink, CourseFamilyDetail)
// are marked as such.

import type { CollegeStream } from "@/lib/colleges-data";
import type { ScholarshipLevel } from "@/data/scholarships";

/** Life order. "school" covers Class 1-10 and is never stored or beaconed. */
export const PATH_STAGE_IDS = [
  "school",            // In school (Class 1-10) → /schooling. child-capable: never stored
  "after-10th",        // → /after-10th (new)
  "after-12th",        // Class 11-12 / After 12th → /after-12th (new)
  "college",           // → /colleges
  "after-graduation",  // → /post-graduation (kept; label "After graduation")
  "govt-job-prep",     // → /exams/browse
  "working",           // Working / learning anything → /careers
] as const;
export type PathStageId = (typeof PATH_STAGE_IDS)[number];

export type YmdDay = string; // "YYYY-MM-DD", checked by validatePathRegistry

export interface PathSource {
  /** Official only: gov.in / nic.in / ac.in / edu.in / res.in, or a host in BOARD_OWN_HOSTS
   *  (a board's or conducting body's own domain). Never an aggregator. */
  url: string;
  /** Body that published it, as it names itself. */
  publisher: string;
  /** Document or page title as printed. */
  title: string;
  /** Day the builder read it. */
  checkedOn: YmdDay;
  /** "reported" = a secondary source naming the official one; printed as "reported". */
  tier: "official" | "reported";
}

/** One printable fact. Pages print `confirmed` with its source and date,
 *  `estimate` with the word "estimate", and never print `unconfirmed`. */
export interface PathFact {
  text: string;
  status: "confirmed" | "estimate" | "unconfirmed";
  source: PathSource | null; // required when status === "confirmed"
}

export interface PathStage {
  id: PathStageId;
  /** "Class 11-12 / After 12th" */
  label: string;
  /** "After 12th" (chips, "Continue: …") */
  shortLabel: string;
  /** Existing or new page. Must be a page.tsx route (test). */
  hubPath: string;
  /** true = the stage may include Class 1-8 or under-13 readers: never stored on the
   *  device or account, no stage beacon, no tutor entry. */
  mayIncludeChildren: boolean;
  /** User.onbStage value this stage may fill (only when onbStage IS NULL), or null. */
  onbStage: "CLASS_9_10" | "CLASS_11_12" | "UG" | "WORKING" | null;
  /** Scholarship levels shown on the stage page (computed list, open schemes only). */
  scholarshipLevels: readonly ScholarshipLevel[];
}

export const STREAM_OPTION_SLUGS = [
  "mpc-pcm", "bipc-pcb", "pcmb", "commerce-cec-mec", "arts-hec-humanities",
  "vocational", "diploma-polytechnic", "iti", "nios",
] as const;
export type StreamOptionSlug = (typeof STREAM_OPTION_SLUGS)[number];

export interface StreamOption {
  slug: StreamOptionSlug;
  kind: "class-11-12" | "vocational-11-12" | "diploma" | "iti" | "open-school";
  /** H1 / title words; both vocabularies, e.g. "MPC or PCM: Maths, Physics, Chemistry". */
  title: string;
  /** Every name students search, any script: ["MPC", "PCM", "M.P.C.", "Science with Maths"]. */
  aliases: readonly string[];
  /** One plain sentence, our own words. */
  whatItIs: string;
  /** "2 years (Class 11 and 12)"; a PathFact because it varies (diploma, ITI trades). */
  duration: PathFact;
  /** Who it suits, our own words, no claims. */
  suits: string;
  /** Section id on /schooling/streams that this option continues (kept, never renamed). */
  legacyAnchor: "pcm" | "pcb" | "pcmb" | "commerce" | "humanities" | null;
  /** Existing Shishya pages this option gathers (route-checked). */
  existingPages: readonly { href: string; label: string }[];
  /** P1 honesty: facts printed in the "Decision facts" block. */
  facts: readonly PathFact[];
}

export interface BoardStreamCombination {
  /** schooling-data BOARDS slug where the board has one; else a stable new id (e.g. "bieap"). */
  board: string;
  boardName: string;
  stateCode: string | null; // ISO code from src/lib/state-info.ts, null = national board
  option: StreamOptionSlug;
  /** The board's own name for it, as printed ("M.P.C.", "Group 1"). */
  localName: string;
  groupCode: string | null; // as printed, or null
  /** Subject names as printed. Names only, never textbook text. */
  subjects: readonly string[];
  source: PathSource;
  status: "confirmed" | "unconfirmed";
}

export interface CourseFamily {
  id: string; // "engineering", "medical", "law", "design", "commerce-pro", "university", "defence", "architecture", "diploma-lateral"
  name: string;
  aliases: readonly string[];
  after: "10th" | "12th" | "graduation";
  /** Existing Shishya pages only in P1 (/courses is P4). */
  links: readonly { href: string; label: string }[];
  /** Exam codes: linked only while live (examHubHref), else plain label. */
  examCodes: readonly string[];
  /** Exams with no Exam row (CLAT, BITSAT, IPMAT, CA Foundation): plain labels. */
  examLabels: readonly string[];
  collegeStream: CollegeStream | null;
  /** careers.ts CAREER_CATEGORIES slugs (the /careers?category= filter). */
  careerCategories: readonly string[];
  /** Stream options that keep this family open (the MPC → engineering edge). */
  fromStreams: readonly StreamOptionSlug[];
}

export type PathNodeId =
  | `stage:${PathStageId}`
  | `stream:${StreamOptionSlug}`
  | `course:${string}`
  | `exam:${string}`
  | `college-stream:${CollegeStream}`
  | `career:${string}`       // careers.ts slug
  | `career-cat:${string}`;  // careers.ts category slug

export interface PathEdge {
  from: PathNodeId;
  to: PathNodeId;
  kind: "leads-to" | "keeps-open" | "closes" | "entrance-for" | "studied-at";
  /** Our own words; no numbers unless in a sourced PathFact. */
  note?: string;
  source?: PathSource; // required when the note states a rule (eligibility, subjects)
}

// ── Additions beyond §1.2 (30 Sep 2026, build 1) ─────────────────────────

/** An exam node: its code and the label printed when the code has no live
 *  hub (the page links /exams/{code} only while the exam is live). Codes with
 *  no Exam row today (CLAT, BITSAT, IPMAT) are listed too — they turn into
 *  links by themselves the day a row goes live. */
export interface PathExam {
  code: string;
  label: string;
}

/** A board whose stream subject lists could NOT be read on its own site
 *  (AP BIE, Karnataka PUE, Maharashtra HSC; Bihar's science faculty; Kerala
 *  VHSE's vocational courses). Pages
 *  show only "check {board}'s official site" with this link — never subjects. */
export interface BoardCheckLink {
  /** schooling-data BOARDS slug; a stable new id only for a body BOARDS does
   *  not list (30 Sep 2026: "kl-vhse", Kerala's vocational higher secondary wing). */
  board: string;
  boardName: string;
  stateCode: string | null;
  /** The board's own site (BOARDS.websiteUrl; for a non-BOARDS id, its own official host). */
  url: string;
  /** The options this board's lists were not confirmed for. */
  options: readonly StreamOptionSlug[];
  /** Why it is unconfirmed (audit trail; not printed). */
  reason: string;
}

/** The /after-12th options table needs "what it is" and "duration" for a
 *  course family; CourseFamily (§1.2) has neither, so they live beside it. */
export interface CourseFamilyDetail {
  whatItIs: string;
  duration: PathFact;
  /** 30 Sep 2026 (review fix): the careers this family leads to, when a whole
   *  careers.ts category is too broad (the "defence" category also holds
   *  merchant navy and commercial pilot, whose routes ask for PCM; "design"
   *  holds the architect). Set → careersForFamily returns exactly these, in
   *  this order; unset → the family's careerCategories. */
  careerSlugs?: readonly string[];
}

/** 30 Sep 2026 (review fix), merged into the §1.2 PathEdge above so that block
 *  stays verbatim: the printed name of a keeps-open / closes line when the
 *  sourced note covers only part of the target course family (BiPC closes
 *  B.E./B.Tech at the NIT-system institutes, not every B.Tech — AP EAPCET
 *  takes BiPC for B.Tech Biotechnology). Absent → the node's own name. Our own
 *  words, no digits (validatePathRegistry checks it like a note). */
export interface PathEdge {
  label?: string;
}
