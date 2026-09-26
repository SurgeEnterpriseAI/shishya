// Subject hubs — one page per competitive-exam subject (27 Sep 2026,
// discoverability wave 2, group "subject-hubs").
//
// Why: generic subject searches — "reasoning questions", "quantitative
// aptitude", "gk questions" — had no page on Shishya. The resolver sent
// "reasoning questions" to a TNPSC Group II topic, "gk questions" to SOF
// IGKO#mocks and "quantitative aptitude" to NID DAT (COVERAGE G22), and no
// crawlable page mapped a subject across the exams that test it. The 4,345
// topic notes cover 1,743 distinct topic names with only 9–10% overlap, so a
// cross-exam view is new information, not a copy of any one exam page.
//
// What a hub is (/subjects/{slug}): every exam whose syllabus has a section
// dedicated to that subject, and every topic of those sections whose own
// page is study-ready — Shishya notes, or at least TOPIC_GOOGLE_MIN_QUESTIONS
// checked (validated) questions: exactly the rule that keeps a topic page
// indexable for Google (src/lib/page-gates-copy.ts topicGoogleIndexable, G3).
// Topics are grouped by a normalised name ("Coding-Decoding" = "Coding and
// Decoding"), and each group links the exam-scoped topic pages — never a
// per-topic cross-exam URL. Every number, name and claim on the page is
// computed here from the rows the loader reads (src/lib/db/subject-hubs-db.ts).
//
// Which sections count (subjectHubOf): a section counts for a hub only when
// its name is made of that hub's words alone — "General Intelligence and
// Reasoning", "Reasoning Ability", "Mental Aptitude / IQ / Reasoning" count
// for Reasoning; "Reasoning and Quantitative Aptitude", "General Studies and
// Mental Ability" or "Haryana General Knowledge" count for none, because a
// mixed section cannot be split honestly by name. Olympiads and professional
// exams are left out (their audience is not the competitive-exam searcher).
// Teacher eligibility tests count only for Child Development & Pedagogy:
// their language and mathematics papers are content-plus-pedagogy papers,
// not the aptitude sections a "quantitative aptitude" search means.
// "Mathematics" by itself counts for Quantitative Aptitude only on
// government recruitment exams (RRB NTPC, police, SSC GD …) — on JEE, the
// state CETs and NDA it is Class 11-12 mathematics. Pinned over the real
// 27 Sep 2026 section list in tests/unit/subject-hubs.test.ts.
//
// No Current Affairs hub: /current-affairs (daily pages and monthly
// capsules) already serves those searches, and the five "Current Affairs"
// syllabus sections count under General Awareness.
//
// Indexing (subjectHubRobots): a hub is indexable only above a data floor —
// study-ready topics in at least HUB_MIN_EXAMS exams, at least
// HUB_MIN_STUDY_READY study-ready topic pages, and at least
// HUB_MIN_SHARED_TOPICS topics listed for two or more exams (the cross-exam
// map is the hub's reason to exist). Below it: noindex, follow for every
// engine, and no context.md. A hub with nothing to link is a 404. On the
// 27 Sep 2026 data five hubs pass (Reasoning, Quantitative Aptitude,
// English, General Awareness, Child Development & Pedagogy); Computer
// Awareness (3 shared topics) and General Science (2) do not.
//
// The five "Current Affairs" sections: the exam topic pages of that name are
// study notes written once; the General Awareness hub points to the dated
// pages at /current-affairs beside them (SubjectHubDef.related).
//
// Pure: no DB, no Next runtime imports — safe in pages, route handlers and
// tests.

import type { MetadataRoute } from "next";
import { examKind } from "@/lib/exam-kind";
import { TOPIC_GOOGLE_MIN_QUESTIONS, topicGoogleIndexable, topicIndexable } from "@/lib/page-gates-copy";

export const SITE = "https://shishya.in";
export const SUBJECT_HUB_ROOT = "/subjects";

// ── The hubs ─────────────────────────────────────────────────────────────

export type SubjectHubSlug =
  | "reasoning"
  | "quantitative-aptitude"
  | "english"
  | "general-awareness"
  | "computer-awareness"
  | "child-development-pedagogy"
  | "general-science";

export interface SubjectHubDef {
  slug: SubjectHubSlug;
  /** Display name — H1, title, breadcrumbs. */
  name: string;
  /** Lower-case form inside a sentence ("reasoning topics"). */
  lower: string;
  /** A section name must match this to be considered for the hub. */
  match: RegExp;
  /** Phrases (removed first) and words a section name may consist of. After
   *  removing them nothing but separators may remain — anything left over
   *  (another subject, a state name, a language) means the section is mixed
   *  or specific and does not count. */
  phrases: readonly string[];
  words: readonly string[];
  /** Search phrasing students use; used for keywords only. */
  keywords: readonly string[];
  /** Pages elsewhere on Shishya that serve part of the subject better (shown
   *  under the lead). */
  related?: readonly { href: string; label: string }[];
}

// Separator and filler tokens every hub accepts.
const COMMON_WORDS = ["and", "of", "the", "for", "test", "general", "basic"] as const;

export const SUBJECT_HUBS: readonly SubjectHubDef[] = [
  {
    slug: "reasoning",
    name: "Reasoning",
    lower: "reasoning",
    match: /reason|intelligence|mental abilit|mental aptitude|\blogic|analytical abilit|\biq\b/,
    phrases: ["mental aptitude", "problem solving", "intelligence test"],
    words: ["reasoning", "intelligence", "intellectual", "mental", "ability", "abilities", "logical", "logic", "analytical", "analysis", "abstract", "iq", "questions"],
    keywords: ["reasoning questions", "reasoning for competitive exams", "logical reasoning questions", "general intelligence and reasoning", "mental ability questions"],
  },
  {
    slug: "quantitative-aptitude",
    name: "Quantitative Aptitude",
    lower: "quantitative aptitude",
    match: /quantitative|numerical|arithmetic|numeracy|mathematical abilit|\bmath(ematics|s)?\b/,
    phrases: [],
    words: ["quantitative", "numerical", "arithmetic", "arithmetical", "mathematical", "mathematics", "maths", "math", "numeracy", "elementary", "aptitude", "ability", "skills", "analysis"],
    keywords: ["quantitative aptitude", "quantitative aptitude questions", "maths for competitive exams", "arithmetic questions", "numerical ability questions"],
  },
  {
    slug: "english",
    name: "English",
    lower: "English",
    match: /\benglish\b/,
    phrases: [],
    words: ["english", "language", "comprehension", "skills", "ability"],
    keywords: ["english for competitive exams", "english grammar questions", "english comprehension questions", "english language questions"],
  },
  {
    slug: "general-awareness",
    name: "General Awareness",
    lower: "general awareness",
    // "general …" so "Computer Knowledge" is not a General Awareness hit.
    match: /general awareness|general knowledge|current affairs|current events|\bgk\b/,
    phrases: ["current affairs", "current events"],
    words: ["awareness", "knowledge", "gk", "studies", "ability"],
    keywords: ["gk questions", "general knowledge questions", "general awareness questions", "gk for competitive exams", "static gk"],
    // The exam topic pages called "Current Affairs" are study notes written
    // once; the dated daily pages live at /current-affairs.
    related: [{ href: "/current-affairs", label: "Current affairs by date" }],
  },
  {
    slug: "computer-awareness",
    name: "Computer Awareness",
    lower: "computer awareness",
    match: /computer|\bict\b|digital literacy/,
    phrases: ["digital literacy"],
    words: ["computer", "knowledge", "awareness", "aptitude", "ict"],
    keywords: ["computer awareness questions", "computer knowledge questions", "computer gk", "computer awareness for competitive exams"],
  },
  {
    slug: "child-development-pedagogy",
    name: "Child Development & Pedagogy",
    lower: "child development and pedagogy",
    match: /child|pedagogy/,
    phrases: ["teaching methodology", "teaching methods"],
    words: ["child", "development", "pedagogy", "psychology"],
    keywords: ["child development and pedagogy", "cdp questions", "cdp for tet", "child development and pedagogy notes", "bal vikas"],
  },
  {
    slug: "general-science",
    name: "General Science",
    lower: "general science",
    match: /\bscience\b/,
    phrases: [],
    words: ["science"],
    keywords: ["general science questions", "general science for competitive exams", "science gk", "general science notes"],
  },
];

const HUB_BY_SLUG: ReadonlyMap<string, SubjectHubDef> = new Map(SUBJECT_HUBS.map((h) => [h.slug, h]));

export function subjectHubDef(slug: string): SubjectHubDef | null {
  return HUB_BY_SLUG.get(slug) ?? null;
}

export function subjectHubPath(slug: SubjectHubSlug): string {
  return `${SUBJECT_HUB_ROOT}/${slug}`;
}

// ── Which syllabus sections count ────────────────────────────────────────

export interface HubExamInfo {
  code: string;
  shortName: string;
  name: string;
  category: string;
}

/** A teacher eligibility test (CTET, the state TETs, REET). By name: every
 *  such row on 27 Sep 2026 says "Teacher Eligibility Test" or, for REET,
 *  "Eligibility Examination for Teachers". DSSSB TGT (a recruitment exam for
 *  teachers, with general sections like SSC's) is not one. */
export function isTeacherEligibilityTest(e: { name: string }): boolean {
  return /teacher eligibility|eligibility examination for teachers/i.test(e.name);
}

/** The comparable form of a section name: lower case, bracketed notes
 *  ("(Paper II)", "(Bal Vikas …)", "(SSC Standard)") and a leading
 *  "Section A —" / "Part B —" / "Paper I —" removed. */
export function sectionNameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/^\s*(section|part|paper)\s+[a-z0-9]+\s*[—–-]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** True when the (keyed) section name is made only of the hub's phrases and
 *  words plus separators. */
function onlyHubWords(key: string, def: SubjectHubDef): boolean {
  let rest = key;
  for (const p of def.phrases) rest = rest.replace(new RegExp(`\\b${escapeRe(p)}\\b`, "g"), " ");
  const allowed = new Set<string>([...def.words, ...COMMON_WORDS]);
  const tokens = rest.split(/[^a-z0-9]+/).filter(Boolean);
  return tokens.every((t) => allowed.has(t));
}

/** The hub a syllabus section counts for, or null (mixed, specific, not a
 *  hub subject, or an exam kind the hubs leave out). */
export function subjectHubOf(section: { name: string }, exam: HubExamInfo): SubjectHubSlug | null {
  const kind = examKind(exam);
  if (kind === "olympiad" || kind === "professional") return null;
  const key = sectionNameKey(section.name);
  const hits = SUBJECT_HUBS.filter((h) => h.match.test(key));
  if (hits.length !== 1) return null;
  const def = hits[0];
  if (!onlyHubWords(key, def)) return null;
  const tet = isTeacherEligibilityTest(exam);
  if (def.slug === "child-development-pedagogy") return def.slug;
  if (tet) return null;
  // "Mathematics" (the school subject word, not "mathematical ability") is
  // quantitative aptitude only on a government recruitment exam.
  if (def.slug === "quantitative-aptitude" && /\bmath(ematics|s)?\b/.test(key) && kind !== "government") return null;
  return def.slug;
}

// ── Topic grouping ───────────────────────────────────────────────────────

const GROUP_STOP = new Set(["and", "the", "of", "a", "an", "in", "on", "to", "for", "with"]);

/** The key topics are grouped by across exams: lower case, bracketed notes
 *  dropped, "&" = "and", punctuation and stop words dropped, a plural "s"
 *  dropped. "Coding-Decoding", "Coding and Decoding" and "Coding Decoding"
 *  share one key; so do "Blood Relations" and "Blood Relation". */
export function topicGroupKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/&/g, " and ")
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !GROUP_STOP.has(w))
    .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w))
    .join(" ");
}

// ── Building a hub ───────────────────────────────────────────────────────

export interface HubSectionRow {
  subjectId: string;
  subjectName: string;
  exam: HubExamInfo;
}

export interface HubTopicRow {
  id: string;
  subjectId: string;
  parentId: string | null;
  code: string;
  name: string;
  /** hasUsableNotes(TopicTeachingNote.content) — the topic page's own rule. */
  hasNotes: boolean;
  /** Validated questions on this topic itself (not its sub-topics). */
  checkedOwn: number;
}

export interface HubTopicLink {
  examCode: string;
  examShort: string;
  topicCode: string;
  topicName: string;
  hasNotes: boolean;
  /** Checked questions the topic page practises from: its own plus its
   *  sub-topics' (the page's own count). */
  checked: number;
  href: string;
}

export interface HubTopicGroup {
  key: string;
  /** The most common topic name in the group (ties: shorter, then A–Z). */
  name: string;
  /** One link per exam — that exam's best page for the topic (A–Z by exam). */
  links: HubTopicLink[];
  /** The best of those links (notes first, then most checked questions). */
  best: HubTopicLink;
}

export interface HubExamRow {
  code: string;
  shortName: string;
  name: string;
  /** The section names this exam's syllabus uses for the subject. */
  sections: string[];
  /** Topics in those sections (the topic pages). */
  topics: number;
  /** Topics whose page is study-ready (listed on the hub). */
  studyReady: number;
  /** Topics with Shishya notes. */
  withNotes: number;
  /** Checked questions on those sections' topics. */
  checked: number;
  syllabusHref: string;
}

export interface SubjectHubTotals {
  /** Exams with a section dedicated to the subject. */
  exams: number;
  /** Exams with at least one study-ready topic in it. */
  examsWithStudyReady: number;
  /** Topics in the counted sections. */
  topics: number;
  /** Study-ready topic pages (the links on the hub). */
  studyReady: number;
  /** Topics with Shishya notes (all study-ready by definition). */
  withNotes: number;
  /** Checked questions across all topics of the counted sections. */
  checked: number;
  /** Topic groups listed. */
  groups: number;
  /** Topic groups listed for two or more exams. */
  sharedGroups: number;
}

export interface SubjectHub {
  def: SubjectHubDef;
  exams: HubExamRow[];
  groups: HubTopicGroup[];
  /** Section names as the exams write them, most used first. */
  sectionNames: { name: string; exams: number }[];
  totals: SubjectHubTotals;
}

export function topicHref(examCode: string, topicCode: string): string {
  return `/exams/${examCode}/topics/${topicCode}`;
}

/** A link is better when it has notes, then more checked questions, then a
 *  shorter (top-level-like) name, then A–Z by code — deterministic. */
function betterLink(a: HubTopicLink, b: HubTopicLink): number {
  if (a.hasNotes !== b.hasNotes) return a.hasNotes ? -1 : 1;
  if (a.checked !== b.checked) return b.checked - a.checked;
  if (a.topicName.length !== b.topicName.length) return a.topicName.length - b.topicName.length;
  return a.topicCode < b.topicCode ? -1 : a.topicCode > b.topicCode ? 1 : 0;
}

const byName = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Build every hub from the real-exam syllabus sections and their topics.
 *  `sections` may include sections of any subject (they are classified
 *  here); `topics` needs only the topics of sections that count. */
export function buildSubjectHubs(sections: readonly HubSectionRow[], topics: readonly HubTopicRow[]): Map<SubjectHubSlug, SubjectHub> {
  const hubOfSection = new Map<string, SubjectHubSlug>();
  const sectionById = new Map<string, HubSectionRow>();
  for (const s of sections) {
    const slug = subjectHubOf({ name: s.subjectName }, s.exam);
    if (!slug) continue;
    hubOfSection.set(s.subjectId, slug);
    sectionById.set(s.subjectId, s);
  }

  // Checked questions a topic page practises from = own + direct children
  // (topics are at most one level deep; children share the parent's section).
  const childChecked = new Map<string, number>();
  for (const t of topics) {
    if (t.parentId) childChecked.set(t.parentId, (childChecked.get(t.parentId) ?? 0) + t.checkedOwn);
  }

  const out = new Map<SubjectHubSlug, SubjectHub>();
  for (const def of SUBJECT_HUBS) {
    const examRows = new Map<string, HubExamRow>();
    const sectionCount = new Map<string, Set<string>>();
    for (const s of sections) {
      if (hubOfSection.get(s.subjectId) !== def.slug) continue;
      const row =
        examRows.get(s.exam.code) ??
        {
          code: s.exam.code,
          shortName: s.exam.shortName,
          name: s.exam.name,
          sections: [],
          topics: 0,
          studyReady: 0,
          withNotes: 0,
          checked: 0,
          syllabusHref: `/exams/${s.exam.code}/syllabus`,
        };
      if (!row.sections.includes(s.subjectName)) row.sections.push(s.subjectName);
      examRows.set(s.exam.code, row);
      const set = sectionCount.get(s.subjectName) ?? new Set<string>();
      set.add(s.exam.code);
      sectionCount.set(s.subjectName, set);
    }

    // Per exam and group key: the best study-ready page. A topic code that
    // appears twice in one exam (two sections) is skipped after the first —
    // the topic page resolves a code to one row.
    const perGroup = new Map<string, Map<string, HubTopicLink>>();
    const namesInGroup = new Map<string, Map<string, number>>();
    const seenCode = new Set<string>();
    let studyReady = 0;
    let withNotes = 0;
    let checked = 0;
    let topicCount = 0;
    for (const t of topics) {
      if (hubOfSection.get(t.subjectId) !== def.slug) continue;
      const s = sectionById.get(t.subjectId)!;
      const row = examRows.get(s.exam.code)!;
      topicCount++;
      row.topics++;
      checked += t.checkedOwn;
      row.checked += t.checkedOwn;
      const pageChecked = t.checkedOwn + (childChecked.get(t.id) ?? 0);
      const codeKey = `${s.exam.code}\u0000${t.code}`;
      if (seenCode.has(codeKey)) continue;
      seenCode.add(codeKey);
      // Study-ready = the topic page is indexable for Google too (G3 rule).
      if (!topicIndexable(t.hasNotes, pageChecked) || !topicGoogleIndexable(t.hasNotes, pageChecked)) continue;
      studyReady++;
      row.studyReady++;
      if (t.hasNotes) {
        withNotes++;
        row.withNotes++;
      }
      const key = topicGroupKey(t.name);
      if (!key) continue;
      const link: HubTopicLink = {
        examCode: s.exam.code,
        examShort: s.exam.shortName,
        topicCode: t.code,
        topicName: t.name,
        hasNotes: t.hasNotes,
        checked: pageChecked,
        href: topicHref(s.exam.code, t.code),
      };
      const byExam = perGroup.get(key) ?? new Map<string, HubTopicLink>();
      const prev = byExam.get(s.exam.code);
      if (!prev || betterLink(link, prev) < 0) byExam.set(s.exam.code, link);
      perGroup.set(key, byExam);
      const names = namesInGroup.get(key) ?? new Map<string, number>();
      names.set(t.name, (names.get(t.name) ?? 0) + 1);
      namesInGroup.set(key, names);
    }

    const groups: HubTopicGroup[] = [...perGroup.entries()].map(([key, byExam]) => {
      const names = [...(namesInGroup.get(key) ?? new Map<string, number>()).entries()].sort(
        (a, b) => b[1] - a[1] || a[0].length - b[0].length || byName(a[0], b[0]),
      );
      const links = [...byExam.values()].sort((a, b) => byName(a.examShort, b.examShort) || byName(a.examCode, b.examCode));
      const best = [...links].sort(betterLink)[0];
      return { key, name: names[0][0], links, best };
    });
    groups.sort((a, b) => {
      if (a.links.length !== b.links.length) return b.links.length - a.links.length;
      const an = a.links.filter((l) => l.hasNotes).length;
      const bn = b.links.filter((l) => l.hasNotes).length;
      if (an !== bn) return bn - an;
      const ac = a.links.reduce((x, l) => x + l.checked, 0);
      const bc = b.links.reduce((x, l) => x + l.checked, 0);
      if (ac !== bc) return bc - ac;
      return byName(a.name, b.name);
    });

    const exams = [...examRows.values()].sort(
      (a, b) => b.studyReady - a.studyReady || b.checked - a.checked || byName(a.shortName, b.shortName),
    );
    const sectionNames = [...sectionCount.entries()]
      .map(([name, set]) => ({ name, exams: set.size }))
      .sort((a, b) => b.exams - a.exams || byName(a.name, b.name));

    out.set(def.slug, {
      def,
      exams,
      groups,
      sectionNames,
      totals: {
        exams: exams.length,
        examsWithStudyReady: exams.filter((e) => e.studyReady > 0).length,
        topics: topicCount,
        studyReady,
        withNotes,
        checked,
        groups: groups.length,
        sharedGroups: groups.filter((g) => g.links.length >= 2).length,
      },
    });
  }
  return out;
}

// ── Indexing ─────────────────────────────────────────────────────────────

/** Exams with at least one study-ready topic a hub needs to be indexable. */
export const HUB_MIN_EXAMS = 5;
/** Study-ready topic pages a hub needs to be indexable. */
export const HUB_MIN_STUDY_READY = 20;
/** Topics listed for at least two exams — the cross-exam map no single exam
 *  page gives. Below this a hub is a concatenation of exam syllabus pages
 *  (on 27 Sep 2026: Computer Awareness 3, General Science 2), which is the
 *  scaled-content pattern the hubs must not add. */
export const HUB_MIN_SHARED_TOPICS = 5;

/** True when the hub has anything to list (else the route 404s). */
export function subjectHubRenderable(t: SubjectHubTotals): boolean {
  return t.studyReady > 0 && t.groups > 0;
}

/** True above the data floor. */
export function subjectHubIndexable(t: SubjectHubTotals): boolean {
  return t.examsWithStudyReady >= HUB_MIN_EXAMS && t.studyReady >= HUB_MIN_STUDY_READY && t.sharedGroups >= HUB_MIN_SHARED_TOPICS;
}

/** Robots metadata: {} (default index, follow) above the floor, else
 *  noindex, follow for every engine. */
export function subjectHubRobots(t: SubjectHubTotals): { robots?: { index: false; follow: true } } {
  return subjectHubIndexable(t) ? {} : { robots: { index: false, follow: true } };
}

// ── Copy (every clause true for the hub it renders on) ───────────────────

export function fmt(n: number): string {
  return n.toLocaleString("en-IN");
}

function plural(n: number, one: string, many: string): string {
  return `${fmt(n)} ${n === 1 ? one : many}`;
}

/** "A, B and C" */
export function andList(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Names followed by "and more" when the list is longer than shown:
 *  "A, B, C and more"; otherwise "A, B and C". */
export function namesWithMore(names: readonly string[], total: number): string {
  return total > names.length ? `${names.join(", ")} and more` : andList(names);
}

/** What the listed topic pages offer. Notes only when a listed page has
 *  notes; practice questions only when a listed page has checked ones. */
export function subjectHubOffer(hub: SubjectHub): { title: string; lower: string } {
  const notes = hub.totals.withNotes > 0;
  const questions = hub.groups.some((g) => g.links.some((l) => l.checked > 0));
  if (notes && questions) return { title: "Topic-wise Notes & Practice Questions", lower: "topic-wise notes and practice questions" };
  if (notes) return { title: "Topic-wise Study Notes", lower: "topic-wise study notes" };
  return { title: "Topic-wise Practice Questions", lower: "topic-wise practice questions" };
}

/** Why a listed page is listed — the study-ready rule, said for what the
 *  listed pages actually have. */
export function readyClause(t: SubjectHubTotals): string {
  if (t.withNotes > 0 && t.withNotes === t.studyReady) return "with Shishya study notes";
  if (t.withNotes > 0) return `with Shishya study notes or at least ${TOPIC_GOOGLE_MIN_QUESTIONS} checked practice questions`;
  return `with at least ${TOPIC_GOOGLE_MIN_QUESTIONS} checked practice questions`;
}

/** Exams named first: most study-ready topics, then most checked questions. */
export function leadExams(hub: SubjectHub, n: number): HubExamRow[] {
  return hub.exams.filter((e) => e.studyReady > 0).slice(0, n);
}

/** Topics listed for two or more exams, most exams first. */
export function sharedGroups(hub: SubjectHub): HubTopicGroup[] {
  return hub.groups.filter((g) => g.links.length >= 2);
}

export function subjectHubTitle(hub: SubjectHub): string {
  return `${hub.def.name}: ${subjectHubOffer(hub).title} for ${plural(hub.totals.examsWithStudyReady, "Exam", "Exams")} | Shishya`;
}

export function subjectHubHeading(hub: SubjectHub): string {
  return `${hub.def.name} — ${subjectHubOffer(hub).lower} for ${plural(hub.totals.examsWithStudyReady, "exam", "exams")}`;
}

export function subjectHubDescription(hub: SubjectHub): string {
  const t = hub.totals;
  const top = leadExams(hub, 3).map((e) => e.shortName);
  return (
    `${plural(t.groups, `${hub.def.lower} topic`, `${hub.def.lower} topics`)} across ${plural(t.studyReady, "exam topic page", "exam topic pages")} ` +
    `${readyClause(t)}, for ${plural(t.examsWithStudyReady, "exam", "exams")}: ${namesWithMore(top, t.examsWithStudyReady)}.`
  ).slice(0, 300);
}

/** The answer-style lead paragraph. */
export function subjectHubLead(hub: SubjectHub): string {
  const t = hub.totals;
  const top = leadExams(hub, 5).map((e) => e.shortName);
  const names = hub.sectionNames.slice(0, 3).map((s) => `“${s.name}” (${plural(s.exams, "exam", "exams")})`);
  const most = sharedGroups(hub)
    .slice(0, 3)
    .map((g) => `${g.name} (${plural(g.links.length, "exam", "exams")})`);
  const parts = [
    `${hub.def.name} has its own section in the syllabus of ${plural(t.exams, "exam", "exams")} on Shishya` +
      (top.length ? `, among them ${andList(top)}.` : "."),
    names.length ? `The syllabi call it ${andList(names)}.` : "",
    `Below, ${plural(t.studyReady, "topic page", "topic pages")} ${readyClause(t)} are grouped into ` +
      `${plural(t.groups, "topic", "topics")}; each topic links those exams' own pages.`,
    most.length ? `Topics with such pages for the most exams: ${andList(most)}.` : "",
  ];
  return parts.filter(Boolean).join(" ");
}

export function subjectHubKeywords(hub: SubjectHub): string[] {
  return [...hub.def.keywords, ...leadExams(hub, 5).map((e) => `${e.shortName} ${hub.def.lower}`)];
}

// ── JSON-LD ──────────────────────────────────────────────────────────────

/** Groups carried in the ItemList (the page lists them all). */
export const HUB_JSONLD_ITEMS = 30;

export function subjectHubJsonLd(hub: SubjectHub): object[] {
  const url = `${SITE}${subjectHubPath(hub.def.slug)}`;
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Subjects", item: `${SITE}${SUBJECT_HUB_ROOT}` },
      { "@type": "ListItem", position: 3, name: hub.def.name, item: url },
    ],
  };
  const page = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: subjectHubTitle(hub).replace(/ \| Shishya$/, ""),
    description: subjectHubDescription(hub),
    url,
    inLanguage: "en-IN",
    isPartOf: { "@type": "WebSite", name: "Shishya", url: `${SITE}/` },
    about: { "@type": "Thing", name: hub.def.name },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: hub.groups.length,
      itemListElement: hub.groups.slice(0, HUB_JSONLD_ITEMS).map((g, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: g.name,
        url: `${SITE}${g.best.href}`,
      })),
    },
  };
  return [breadcrumb, page];
}

/** JSON for a <script type="application/ld+json">: <, > and & escaped. */
export function jsonLdText(d: object): string {
  return JSON.stringify(d).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

// ── Sitemap (for the main session to add to src/app/sitemap.ts) ──────────

/** Sitemap entries for the indexable hubs only. No lastModified: the rows
 *  carry no trustworthy change date (Topic has no updatedAt; notes and
 *  question validation times move on regeneration), so none is claimed. */
export function subjectHubSitemapEntries(hubs: ReadonlyMap<SubjectHubSlug, SubjectHub>, base = SITE): MetadataRoute.Sitemap {
  return SUBJECT_HUBS.filter((d) => {
    const h = hubs.get(d.slug);
    return !!h && subjectHubRenderable(h.totals) && subjectHubIndexable(h.totals);
  }).map((d) => ({ url: `${base}${subjectHubPath(d.slug)}`, changeFrequency: "weekly" as const, priority: 0.7 }));
}

// ── context.md (the hub's machine brief for answer engines) ─────────────

/** /subjects/{slug}/context.md — served for indexable hubs only. */
export function subjectHubContextPath(slug: SubjectHubSlug): string {
  return `${subjectHubPath(slug)}/context.md`;
}

/** The hub as Markdown: the lead, every listed topic with each exam's page,
 *  and every exam with the section. Same data and rules as the HTML page;
 *  `platformLine` is the shared one-line self-description. */
export function subjectHubContextMarkdown(hub: SubjectHub, asOf: string, platformLine: string, site: string = SITE): string {
  const t = hub.totals;
  const url = `${site}${subjectHubPath(hub.def.slug)}`;
  const note = (l: HubTopicLink) => (l.hasNotes ? "notes" : `${fmt(l.checked)} checked questions`);
  const L: string[] = [];
  L.push(`# ${hub.def.name} on Shishya — subject context`);
  L.push("");
  L.push(`> Page: ${url} · data as of ${asOf} (IST). Free to cite; link to the exam's own topic page. ${platformLine}`);
  L.push(
    `> A topic page is listed when it has Shishya study notes or at least ${TOPIC_GOOGLE_MIN_QUESTIONS} checked practice questions. ` +
      "Only syllabus sections dedicated to this subject are counted; mixed sections are on each exam's syllabus page.",
  );
  L.push("");
  L.push("## Summary");
  L.push(subjectHubLead(hub));
  for (const r of hub.def.related ?? []) L.push(`- Also: ${r.label}: ${site}${r.href}`);
  L.push("");
  L.push(`## ${hub.def.name} topics (${fmt(t.groups)})`);
  for (const g of hub.groups) {
    L.push(`- ${g.name} (${plural(g.links.length, "exam", "exams")}): ${g.links.map((l) => `${l.examShort} ${site}${l.href} (${note(l)})`).join("; ")}`);
  }
  L.push("");
  L.push(`## Exams with a ${hub.def.lower} section (${fmt(t.exams)})`);
  for (const e of hub.exams) {
    L.push(
      `- ${e.shortName} — ${e.sections.join(" / ")}: ${fmt(e.studyReady)} of ${plural(e.topics, "topic", "topics")} listed` +
        `${e.withNotes > 0 ? `, ${fmt(e.withNotes)} with notes` : ""}, ${plural(e.checked, "checked question", "checked questions")} · syllabus: ${site}${e.syllabusHref}`,
    );
  }
  L.push("");
  L.push("## More on Shishya");
  L.push(`- Platform context: ${site}/context.md · full index: ${site}/llms-full.txt`);
  L.push("");
  return L.join("\n");
}

// ── /subjects (the index of the hubs) ───────────────────────────────────
// 27 Sep 2026: every hub's "← Back" parent (src/lib/url-normalize.ts
// inferParent strips the last segment) must be a page that renders
// (tests/unit/backlink-parent.test.ts), and the hubs need one place that
// lists them. The index is a directory — its value is in the hubs — so it
// is noindex, follow: crawlers follow it to the hubs, and no thin page is
// added to the index.

/** The hubs the index lists, in SUBJECT_HUBS order: every renderable one. */
export function subjectHubIndexRows(hubs: ReadonlyMap<SubjectHubSlug, SubjectHub>): SubjectHub[] {
  return SUBJECT_HUBS.map((d) => hubs.get(d.slug)).filter((h): h is SubjectHub => !!h && subjectHubRenderable(h.totals));
}

export function subjectHubIndexTitle(rows: readonly SubjectHub[]): string {
  return rows.length ? `Subjects Across Exams: ${andList(rows.map((h) => h.def.name))} | Shishya` : "Subjects Across Exams | Shishya";
}

export function subjectHubIndexDescription(rows: readonly SubjectHub[]): string {
  if (!rows.length) return "Competitive-exam subjects on Shishya, each mapped to the exams that test it.";
  return (
    `${andList(rows.map((h) => h.def.name))}: each subject's topics on Shishya, grouped by topic and mapped to the exams that test them, ` +
    `with each exam's own notes and checked practice questions.`
  ).slice(0, 300);
}

/** One line per hub card: exams, topic pages, notes. */
export function subjectHubCardLine(hub: SubjectHub): string {
  const t = hub.totals;
  return (
    `${plural(t.examsWithStudyReady, "exam", "exams")} · ${plural(t.studyReady, "topic page", "topic pages")}` +
    (t.withNotes > 0 ? ` · ${fmt(t.withNotes)} with notes` : "")
  );
}
