// Hub <title> date lead — the pure decision behind generateMetadata in
// src/app/exams/[code]/page.tsx (16 Sep 2026). No DB, no i18n dictionary.
//
// Four answers, in this order:
//   announced — the next ANNOUNCED exam day (tier official or reported),
//               exactly the 11 Sep rule: "Exam Date 25 Sept 2026, …"
//   revision  — that next day has a same-stage announced row on another
//               day: "Exam Date Under Revision, …" — neither date is stated
//   held      — nothing announced ahead, but an announced written exam
//               day went by within HELD_WINDOW_DAYS: "Exam Held 6 Sept
//               2026 (reported), Next Exam Date Not Announced Yet, …"
//   none      — "Exam Date Not Announced Yet, …"
// Every lead keeps the "Exam Date … ," comma grammar that truth-lint's
// parseHubTitle reads (src/lib/truth-lint.ts); "Under Revision" parses as
// a warn, never a pass.
//
// Why "held" (16 Sep 2026 scout, dipfamily): 28 hubs said "Exam Date Not
// Announced Yet" days after their announced exam — IOQM (6 Sep), CDS
// (13 Sep, upsc.gov.in), NEET PG (30 Aug) — the weeks students search for
// the answer key and result. An EXPECTED row never leads a title, ahead or
// behind: a passed estimate is not a held exam. The held row must be the
// exam itself: a label naming a post, a special sitting, a region or an
// earlier CEN ("Special TET 2026 exam (In-Service Teachers)", "CEN 01/2025
// CBT 2 Exam") keeps "Not Announced Yet", and so does a postponed or
// tentative row or one whose notes give a date range the label does not
// place.
//
// Why "revision" (dipfamily.2, corrected fix): the refresh writer can leave
// a stage's other row in place — MPSC Group C Prelims 27 Sep (written 8
// Sep) beside "Preliminary Examination (revised)" 25 Oct (written 23 Aug),
// while secondary sources say 3 Jan 2027; SBI Clerk Prelims Day 1 26 Sep
// beside 27 Sep. Picking one by write time or by a "revised" label states a
// date nobody verified, so neither is stated. A worse-tier row never
// withholds a better-tier date, and rows from one refresh run are a
// multi-day window, not a revision.

import { titleCycleYear, type SourceTier, type TimelineRow } from "@/lib/exam-timeline";
import { istDayNumber } from "@/lib/exam-phase";

/** How far back an announced exam day still leads the title. */
export const HELD_WINDOW_DAYS = 60;
/** Two rows written this close together are one refresh, not a revision. */
export const SAME_WRITE_MS = 10 * 60 * 1000;
/** Same-stage rows further apart than this are different cycles. */
export const CONFLICT_WINDOW_DAYS = 120;
/** How far apart a row's notes window and a held day can sit. */
const NOTES_WINDOW_DAYS = 45;

export type HeldStage = "prelims" | "mains" | null;
/** "Held" for a one-day paper; "Began" / "Ended" when the label places the
 *  row at the start or end of a multi-day window. */
export type HeldVerb = "held" | "began" | "ended";

export interface HeldLead {
  row: TimelineRow;
  stage: HeldStage;
  verb: HeldVerb;
}

export type HubDateLead =
  | { kind: "announced"; row: TimelineRow }
  | { kind: "revision"; row: TimelineRow }
  | ({ kind: "held" } & HeldLead)
  | { kind: "none" };

export interface HubTitleExam {
  code: string;
  shortName: string;
  name: string;
}

type CreatedAt = ReadonlyMap<string, Date | string | null | undefined>;

const DAY_MS = 86_400_000;
const TIER_RANK: Record<SourceTier, number> = { official: 0, reported: 1, expected: 2 };

// ── Stage matching ───────────────────────────────────────────────────────

const ROMAN: Record<string, string> = { i: "1", ii: "2", iii: "3", iv: "4", v: "5" };
// "Tier 1", "Phase II", "Level-1", "Set A", "Day 2", "Group 3", "Paper 4",
// "CBT-2" (16 Sep 2026 review: "CBT-1 exam" never matches "CBT-2 exam").
const DISCRIMINATOR_RE =
  /\b(tier|phase|paper|day|group|set|date|option|level|stage|session|shift|part|scale|slot|batch|cbt)\s*[-:]?\s*(\d+|iv|v|i{1,3}|[a-z])(?![a-z])/g;
// Test types that are never the same sitting as a written paper ("Written
// exam" vs "PET/PST", "Online exam" vs "Typing test").
const TEST_TYPE_RE = /\b(pet|pst|pmt|pe\s*&\s*mt|skill|typing|cbtst|physical|interview|medical|dv|verification|walk-in)\b/g;
// The end of a window: "CBT Exam concludes", "CBT Exam (Phase 1) - End",
// "AP TET Exam last day" — but not "(end date not announced)".
const END_RE_G = /\bconclud(?:e|es|ed|ing)\b|\bends?\b(?!\s+date)|\blast day\b|\bfinal day\b/g;
const END_RE = /\bconclud(?:e|es|ed|ing)\b|\bends?\b(?!\s+date)|\blast day\b|\bfinal day\b/i;
// Words that do not tell two exam-day rows apart.
const NOISE = new Set([
  "exam", "exams", "examination", "examinations", "test", "written", "begins", "begin", "starts", "start",
  "commences", "commence", "revised", "rescheduled", "postponed", "new", "schedule", "mode", "cbt", "omr",
  "online", "offline", "the", "of", "for", "and", "to", "in", "on", "at", "held", "conducted", "tentative",
  "expected", "official",
]);

interface StageKey {
  disc: Set<string>;
  content: Set<string>;
}

function stageKey(label: string): StageKey {
  let l = label.toLowerCase();
  l = l.replace(/\bprelim(?:inary|s)?\b/g, " @prelims ").replace(/\bmains?\b/g, " @mains ");
  l = l.replace(END_RE_G, " @end ");
  const disc = new Set<string>();
  for (const m of l.matchAll(/@(prelims|mains|end)\b/g)) disc.add(m[1]);
  l = l.replace(/@(prelims|mains|end)\b/g, " ");
  for (const m of l.matchAll(TEST_TYPE_RE)) disc.add(`@${m[1].replace(/\s+/g, "")}`);
  l = l.replace(TEST_TYPE_RE, " ");
  for (const m of l.matchAll(DISCRIMINATOR_RE)) disc.add(`${m[1]} ${ROMAN[m[2]] ?? m[2]}`);
  l = l.replace(DISCRIMINATOR_RE, " ");
  const content = new Set((l.match(/[a-z]{2,}/g) ?? []).filter((w) => !NOISE.has(w)));
  return { disc, content };
}

function subset(a: Set<string>, b: Set<string>): boolean {
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

/** True when two exam-day labels name the same stage: the same
 *  prelims/mains/tier/phase/day/CBT-n/test-type markers, and one label's
 *  other words contained in the other's ("Prelims exam (CBT mode)" ~
 *  "Preliminary Examination (revised)"; "Day 1" never ~ "Day 2"). Labels
 *  with no words of their own match only on a shared stage marker, so
 *  "Written exam" never matches "PET/PST" or another bare "Exam". */
export function sameStage(a: string, b: string): boolean {
  const ka = stageKey(a);
  const kb = stageKey(b);
  if (ka.disc.size !== kb.disc.size || !subset(ka.disc, kb.disc)) return false;
  if (ka.content.size === 0 || kb.content.size === 0) {
    return ka.content.size === kb.content.size && ka.disc.size > 0;
  }
  return subset(ka.content, kb.content) || subset(kb.content, ka.content);
}

/** The stage markers of one label — the half of sameStage's key that tells
 *  sittings apart: "prelims" / "mains", "end" for a window's last day, test
 *  types ("@pet", "@interview") and numbered parts ("tier 1", "phase 2",
 *  "part 2"). src/lib/official-source.ts passedEstimateView (24 Sep 2026)
 *  compares these across kinds, where labels share no other words ("Prelims
 *  admit card (expected)" vs "APPSC CCE Prelims Exam"). */
export function stageMarkers(label: string): Set<string> {
  return new Set(stageKey(label).disc);
}

function createdMs(createdAt: CreatedAt | undefined, id: string): number | null {
  const v = createdAt?.get(id);
  if (!v) return null;
  const ms = (v instanceof Date ? v : new Date(v)).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function writtenTogether(a: TimelineRow, b: TimelineRow, createdAt: CreatedAt | undefined): boolean {
  const ca = createdMs(createdAt, a.id);
  const cb = createdMs(createdAt, b.id);
  return ca !== null && cb !== null && Math.abs(ca - cb) <= SAME_WRITE_MS;
}

/** Announced exam-day rows that contradict `row`'s date: same stage, a
 *  different day within CONFLICT_WINDOW_DAYS, a tier at least as good, and
 *  not written in the same refresh run. Write time never picks a winner —
 *  it only tells a multi-day window from a revision. */
export function conflictingRows(row: TimelineRow, announced: TimelineRow[], createdAt?: CreatedAt): TimelineRow[] {
  return announced.filter(
    (b) =>
      b.id !== row.id &&
      b.day !== row.day &&
      TIER_RANK[b.tier] <= TIER_RANK[row.tier] &&
      Math.abs(b.date.getTime() - row.date.getTime()) <= CONFLICT_WINDOW_DAYS * DAY_MS &&
      !writtenTogether(row, b, createdAt) &&
      sameStage(row.label, b.label),
  );
}

// ── Held-row eligibility ─────────────────────────────────────────────────

// A physical test, interview or verification stored as an exam day is not
// the paper a student means by "exam held" (kindFromLabel's INTERVIEW
// words, plus the physical-test spellings the tracker uses: "Havaldar
// PET/PST", "PE&MT", "Guest Lecturer Walk-in Interview").
const NON_WRITTEN_RE =
  /\binterview|document verification|\bdv\b|\bpet\b|\bpst\b|\bpmt\b|pe\s*&\s*mt|physical (?:test|efficiency|standard|measurement|endurance)|\bmedical (?:test|exam|examination|board)\b|skill test|typing test|\bcbtst\b|\bcpt\b|\bdest\b|walk-in/i;
// Conducting-body acronyms. A label naming one the exam itself does not
// ("UPSC CSE 2026 Mains Exam" filed under Puducherry PSC) is another
// exam's day.
const BODY_RE = /\b([A-Z]{1,6}PSC|[A-Z]{0,4}SSS?C|[A-Z]{0,4}SSB|IBPS|RRB|SBI|RBI|NTA|CBSE|NDA|CDS|JEE|NEET|GATE|CLAT)\b/g;
// Not held on that date: "Junior Assistant/Stenographer exam (postponed)",
// notes "new date to be announced". "Postponed from 6 Sept" is the new date.
const CALLED_OFF_RE =
  /\b(?:postponed|cancelled|canceled|deferred|called off|withdrawn)\b(?!\s+from\b)|\bnew date (?:to be|will be|yet to be|not yet) announced\b/i;
// The label places the row at the START of a window: "Online exam begins
// … (end date not announced)", "Mains exam (3 days)", "Mains Exam (Day 1-6)".
const BEGAN_RE =
  /\b(?:begins?|starts?|commences?|commencing|onwards|ongoing)\b|end date not announced|over multiple days|multi-?day|\(\s*\d+\s*days?\s*\)|\bday\s*1\s*[-–]\s*\d+/i;
// "Day 2", "Shift 1", "Session II" — one part of a multi-day sitting; also
// the olympiads' "Level 1 exam — Date 3" / "(Option 3)" (one digit, so
// "date 12 Sept" or "Date 2 Nov" is a date, not a part).
const DAY_PART_RE =
  /\b(?:day|shift|session)\s*[-:]?\s*(\d+|iv|v|i{1,3})\b|\b(?:date|option)\s*[-:]?\s*([1-9])(?![\d/.:])(?!\s*(?:st|nd|rd|th)\b)(?!\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))/i;
// The label hedges its own date: "KAS Prelims Exam (tentative)" (reported
// tier) is never stated as held.
const TENTATIVE_RE = /\b(?:tentative(?:ly)?|provisional(?:ly)?|probable|likely|expected|tbc|to be confirmed)\b/i;
// Notes giving a multi-day window ("conducted from September 7-11", "held
// on September 2, 5, 7, and 9", "3-6, 9-14, 17-21, 25 Aug") — clock times
// ("9-11 AM", "10:00–12:30") and single dates ("December 22, 2025") do not.
// Whole month names or their abbreviations only: "marks", "decision" and
// "separate" are not months ("2 marks, 1 hour" is not a window).
const MON =
  "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?(?![a-z])";
const NUM = "\\d{1,2}(?:st|nd|rd|th)?";
const JOIN = "(?:\\s*[-–,&]\\s*|\\s+(?:to|and|till|until)\\s+)";
const MULTI_DAY_NOTES_RE = new RegExp(
  `\\b${MON}\\s+${NUM}${JOIN}(?:${MON}\\s+)?${NUM}\\b|\\b${NUM}${JOIN}${NUM}\\s+${MON}(?![a-z])|\\b${NUM}\\s+${MON}${JOIN}${NUM}\\b|over multiple days|multi-?day|\\bonwards\\b|continues? (?:till|until)|\\b\\d+\\s+(?:exam\\s+)?days\\b`,
  "i",
);
// Words a held label may carry beyond the exam's own name and stage
// markers without naming a post, sitting or cycle of its own.
const HELD_NOISE = new Set([
  ...NOISE,
  "day", "days", "session", "sessions", "shift", "shifts", "final", "last", "end", "ends", "concludes",
  "concluded", "date", "not", "announced", "over", "multiple", "multi", "ongoing", "onwards", "commencing",
  "computer", "based", "pen", "cce", "ii", "iii", "iv", "vi",
  "january", "february", "march", "april", "may", "june", "july", "august", "september", "october",
  "november", "december", "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "sept", "oct", "nov", "dec",
]);

function examWords(exam: HubTitleExam): Set<string> {
  return new Set(`${exam.code.replace(/_/g, " ")} ${exam.shortName} ${exam.name}`.toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean));
}

/** The label with the exam's own name tokens removed — UPSSSC PET's
 *  "PET 2026 exam - Day 1" is its written paper, not a physical test. */
function ownTokensRemoved(label: string, exam: HubTitleExam): string {
  const own = examWords(exam);
  return label
    .split(/(\s+|[/(),–—-])/)
    .filter((w) => !own.has(w.toUpperCase()))
    .join("");
}

export function labelNamesOtherExam(label: string, exam: HubTitleExam): boolean {
  const own = examWords(exam);
  for (const m of label.matchAll(BODY_RE)) if (!own.has(m[1])) return true;
  return false;
}

export function isNonWrittenStage(label: string, exam: HubTitleExam): boolean {
  return NON_WRITTEN_RE.test(ownTokensRemoved(label, exam));
}

export function isCalledOff(row: { label: string; notes?: string | null }): boolean {
  return CALLED_OFF_RE.test(row.label) || CALLED_OFF_RE.test(row.notes ?? "");
}

export function isTentativeLabel(label: string): boolean {
  return TENTATIVE_RE.test(label);
}

/** True when the label, less the exam's own name, stage and part markers,
 *  names nothing else — "IOQM 2026 exam day", "Mains exam (Phase II)",
 *  "CBT Exam concludes" — so "Exam Held" is about the exam as a whole.
 *  "Special TET 2026 exam (In-Service Teachers)", "Livestock Extension
 *  Officer exam", "CEN 01/2025 CBT 2 Exam", "Written test — Kalyana
 *  Karnataka (859 posts)" name a sitting, post or cycle: false. */
export function labelNamesWholeExam(label: string, exam: HubTitleExam): boolean {
  const l = ownTokensRemoved(label, exam)
    .toLowerCase()
    .replace(/\bprelim(?:inary|s)?\b|\bmains?\b/g, " ")
    .replace(DISCRIMINATOR_RE, " ");
  return (l.match(/[a-z]{2,}/g) ?? []).every((w) => HELD_NOISE.has(w));
}

export function heldStage(label: string): HeldStage {
  const p = /\bprelim(?:inary|s)?\b/i.test(label);
  const m = /\bmains?\b/i.test(label);
  return p && !m ? "prelims" : m && !p ? "mains" : null;
}

/** True when an announced exam-day row of the same stage, near `row`,
 *  describes a multi-day window in its notes that never names `row`'s day
 *  of month — AP TET "Exam last day" 21 Aug beside "CBT conducted from
 *  August 5-16, 2026": the tracker contradicts itself, so no held date is
 *  stated. RRB Group D "CBT Exam concludes" 25 Aug beside "3-6, 9-14, 17-21,
 *  25 Aug" agrees. */
export function notesWindowOmitsDay(row: TimelineRow, announced: TimelineRow[], exam: HubTitleExam): boolean {
  const dayRe = new RegExp(`(?<![\\d:])0?${Number(row.day.slice(8))}(?:st|nd|rd|th)?(?![\\d:])`);
  const stage = heldStage(row.label);
  return announced.some((b) => {
    const notes = b.notes ?? "";
    return (
      Math.abs(b.date.getTime() - row.date.getTime()) <= NOTES_WINDOW_DAYS * DAY_MS &&
      heldStage(b.label) === stage &&
      !labelNamesOtherExam(b.label, exam) &&
      !isNonWrittenStage(b.label, exam) &&
      MULTI_DAY_NOTES_RE.test(notes) &&
      !dayRe.test(notes)
    );
  });
}

/** Which verb the row supports, or null when its notes give a multi-day
 *  window the label does not place the row in (neither "held" on that day
 *  nor "began"/"ended" would be sure). */
export function heldVerb(row: { label: string; notes?: string | null }): HeldVerb | null {
  if (END_RE.test(row.label)) return "ended";
  if (BEGAN_RE.test(row.label)) return "began";
  const part = DAY_PART_RE.exec(row.label);
  if (part) {
    const n = (part[1] ?? part[2]).toLowerCase();
    return (ROMAN[n] ?? n) === "1" ? "began" : "ended";
  }
  if (MULTI_DAY_NOTES_RE.test(row.notes ?? "")) return null;
  return "held";
}

// ── The decision ─────────────────────────────────────────────────────────

/** What the hub title leads with. `timeline` is buildTimeline's output
 *  for the hub's rows (date order, best tier first within a day);
 *  `createdAt` maps row id → when the row was written (cache hits hand
 *  back strings). */
export function hubDateLead(timeline: TimelineRow[], exam: HubTitleExam, createdAt?: CreatedAt): HubDateLead {
  const announcedDays = timeline.filter((r) => r.kind === "EXAM" && r.tier !== "expected");
  const next = announcedDays.find((r) => r.daysFromToday >= 0) ?? null;
  if (next) {
    // Only the next day is checked: a later stage (MPSC Group C Mains
    // 27 Dec) never takes the lead while the Prelims date is in question.
    // A passed row still counts against it: the 27 Sep row going by does
    // not confirm the 25 Oct one.
    return conflictingRows(next, announcedDays, createdAt).length ? { kind: "revision", row: next } : { kind: "announced", row: next };
  }
  const held = announcedDays.filter(
    (r) =>
      r.daysFromToday >= -HELD_WINDOW_DAYS &&
      !labelNamesOtherExam(r.label, exam) &&
      !isNonWrittenStage(r.label, exam) &&
      !isCalledOff(r) &&
      !isTentativeLabel(r.label),
  );
  if (!held.length) return { kind: "none" };
  // The latest held day; on it, the best-tier row that is the exam itself.
  const lastDay = held[held.length - 1].day;
  const row = held.find((r) => r.day === lastDay && labelNamesWholeExam(r.label, exam)) ?? null;
  if (!row) return { kind: "none" };
  const verb = heldVerb(row);
  if (!verb || conflictingRows(row, announcedDays, createdAt).length || notesWindowOmitsDay(row, announcedDays, exam)) {
    return { kind: "none" };
  }
  return { kind: "held", row, stage: heldStage(row.label), verb };
}

// ── The year beside the exam's name (26 Sep 2026) ────────────────────────
//
// The title used to print the calendar year ("JEE Main 2026 — Exam Date Not
// Announced Yet" in September 2026, when JEE Main 2026 was long over and the
// tracker already held the 2027 rows). Now:
//   cycle     — "{Exam} {year} — {lead}": the held row's year for a held
//               lead, else titleCycleYear (src/lib/exam-timeline.ts);
//   held-year — nothing ahead names a year, but an announced written sitting
//               of the whole exam went by: "{Exam} — 2026 Exam Held; Next
//               Exam Date Not Announced Yet" (the year stated as held);
//   none      — no year at all: "{Exam} — Exam Date Not Announced Yet".
// A held year never sits beside "Not Announced Yet" as if it were the cycle
// to come, and no future year is invented.

export type HubTitleYear = { kind: "cycle"; year: number } | { kind: "held-year"; year: number } | { kind: "none" };

/** The year of the latest announced, past, written exam day that names the
 *  whole exam (the held lead's eligibility rules, without its 60-day window
 *  and date checks — only the year is stated). Null when there is none. */
export function lastHeldExamYear(timeline: readonly TimelineRow[], exam: HubTitleExam, now: Date = new Date()): number | null {
  const today = istDayNumber(now);
  const held = timeline.filter(
    (r) =>
      r.kind === "EXAM" &&
      r.tier !== "expected" &&
      istDayNumber(r.date) < today &&
      !labelNamesOtherExam(r.label, exam) &&
      !isNonWrittenStage(r.label, exam) &&
      !isCalledOff(r) &&
      !isTentativeLabel(r.label) &&
      labelNamesWholeExam(r.label, exam),
  );
  return held.length ? held[held.length - 1].date.getUTCFullYear() : null;
}

/** Which year the hub title prints, and how (see the section header). */
export function hubTitleYear(lead: HubDateLead, timeline: readonly TimelineRow[], exam: HubTitleExam, now: Date = new Date()): HubTitleYear {
  if (lead.kind === "held") return { kind: "cycle", year: lead.row.date.getUTCFullYear() };
  const year = titleCycleYear(timeline, now);
  if (year !== null) return { kind: "cycle", year };
  const heldYear = lastHeldExamYear(timeline, exam, now);
  return heldYear !== null ? { kind: "held-year", year: heldYear } : { kind: "none" };
}

// ── Wording ──────────────────────────────────────────────────────────────

export type HubTitleLocale = "en" | "hi" | "te";

/** "6 Sept 2026" — the title's date format (en-IN digits in every locale). */
export function hubTitleDay(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

const STAGE_WORD: Record<HubTitleLocale, Record<"prelims" | "mains", string>> = {
  en: { prelims: "Prelims ", mains: "Mains " },
  hi: { prelims: "प्रीलिम्स ", mains: "मेन्स " },
  te: { prelims: "ప్రిలిమ్స్ ", mains: "మెయిన్స్ " },
};

const VERB: Record<HubTitleLocale, Record<HeldVerb, string>> = {
  en: { held: "Held", began: "Began", ended: "Ended" },
  hi: { held: "हुई", began: "शुरू हुई", ended: "समाप्त हुई" },
  te: { held: "జరిగింది", began: "ప్రారంభమైంది", ended: "ముగిసింది" },
};

/** The held lead for the title, e.g. "Mains Exam Held 12 Sept 2026
 *  (reported), Next Exam Date Not Announced Yet". `tierWord` is the
 *  localised "reported" (null for an official row). */
export function heldTitleLead(locale: HubTitleLocale, lead: HeldLead, tierWord: string | null): string {
  const date = hubTitleDay(lead.row.date);
  const tier = tierWord ? ` (${tierWord})` : "";
  const stage = lead.stage ? STAGE_WORD[locale][lead.stage] : "";
  const verb = VERB[locale][lead.verb];
  // hi/te put the tier word after the verb, as ew.post.next does ("{date} को ({tier})").
  if (locale === "hi") return `${stage}परीक्षा ${date} को ${verb}${tier}, अगली परीक्षा तिथि अभी घोषित नहीं`;
  if (locale === "te") return `${stage}పరీక్ష ${date}న ${verb}${tier}, తదుపరి పరీక్ష తేదీ ఇంకా ప్రకటించలేదు`;
  return `${stage}Exam ${verb} ${date}${tier}, Next Exam Date Not Announced Yet`;
}

/** The held answer that opens the description, e.g. "SBI PO Mains exam
 *  held 12 Sept 2026 (reported); next exam date: not announced yet. " —
 *  it keeps the "exam date: not announced yet" words the line had. */
export function heldDescriptionLead(locale: HubTitleLocale, shortName: string, lead: HeldLead, tierWord: string | null): string {
  const date = hubTitleDay(lead.row.date);
  const tier = tierWord ? ` (${tierWord})` : "";
  const stage = lead.stage ? STAGE_WORD[locale][lead.stage] : "";
  const verb = VERB[locale][lead.verb];
  if (locale === "hi") return `${shortName} ${stage}परीक्षा ${date} को ${verb}${tier}; अगली परीक्षा तिथि: अभी घोषित नहीं. `;
  if (locale === "te") return `${shortName} ${stage}పరీక్ష ${date}న ${verb}${tier}; తదుపరి పరీక్ష తేదీ: ఇంకా ప్రకటించలేదు. `;
  return `${shortName} ${stage}exam ${verb.toLowerCase()} ${date}${tier}; next exam date: not announced yet. `;
}

/** The start of the hub title up to its date lead, for every year shape:
 *  "SSC CGL 2027 — {dateBit}", "CDS — 2026 Exam Held; Next Exam Date Not
 *  Announced Yet, ", "X — {dateBit}". `name` is the short name plus any
 *  state bit; `dateBit` is the date lead WITH its trailing ", " (unused for
 *  held-year, which is its own lead). */
export function hubTitlePrefix(locale: HubTitleLocale, name: string, y: HubTitleYear, dateBit: string): string {
  if (y.kind === "cycle") return `${name} ${y.year} — ${dateBit}`;
  if (y.kind === "held-year") return `${name} — ${heldYearTitleLead(locale, y.year)}, `;
  return `${name} — ${dateBit}`;
}

/** The held-year lead for the title: nothing ahead names a year, an
 *  announced sitting went by in `year`. Keeps the "Exam Date … ," words
 *  truth-lint's parseHubTitle reads, as "not announced". */
export function heldYearTitleLead(locale: HubTitleLocale, year: number): string {
  if (locale === "hi") return `${year} की परीक्षा हो चुकी है; अगली परीक्षा तिथि अभी घोषित नहीं`;
  if (locale === "te") return `${year} పరీక్ష జరిగింది; తదుపరి పరీక్ష తేదీ ఇంకా ప్రకటించలేదు`;
  return `${year} Exam Held; Next Exam Date Not Announced Yet`;
}

/** The held-year answer that opens the description. */
export function heldYearDescriptionLead(locale: HubTitleLocale, shortName: string, year: number): string {
  if (locale === "hi") return `${shortName} की ${year} परीक्षा हो चुकी है; अगली परीक्षा तिथि: अभी घोषित नहीं. `;
  if (locale === "te") return `${shortName} ${year} పరీక్ష జరిగింది; తదుపరి పరీక్ష తేదీ: ఇంకా ప్రకటించలేదు. `;
  return `${shortName} ${year} exam held; next exam date: not announced yet. `;
}

/** A meta description cut to `max` characters at the last sentence end
 *  (kept whole) or, when that would drop more than half, at the last word
 *  boundary with "…" (26 Sep 2026: the hub sliced at exactly 300 characters,
 *  mid-word — "…checked against the offic"). Whitespace is collapsed. */
export function clipDescription(text: string, max = 300): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  let lastEnd = -1;
  for (const m of t.slice(0, max + 1).matchAll(/[.!?।](?=\s|$)/g)) {
    if (m.index !== undefined && m.index < max) lastEnd = m.index;
  }
  if (lastEnd >= Math.floor(max / 2)) return t.slice(0, lastEnd + 1);
  const sp = t.lastIndexOf(" ", max - 1);
  const head = (sp > 0 ? t.slice(0, sp) : t.slice(0, max - 1)).replace(/[\s,;:—–-]+$/u, "");
  return `${head}…`;
}

/** The revision lead for the title: no date is stated. */
export function revisionTitleLead(locale: HubTitleLocale): string {
  if (locale === "hi") return "परीक्षा तिथि संशोधनाधीन";
  if (locale === "te") return "పరీక్ష తేదీ సవరణలో ఉంది";
  return "Exam Date Under Revision";
}

/** The revision answer that opens the description. */
export function revisionDescriptionLead(locale: HubTitleLocale, shortName: string): string {
  if (locale === "hi") return `${shortName} परीक्षा तिथि: संशोधनाधीन. `;
  if (locale === "te") return `${shortName} పరీక్ష తేదీ: సవరణలో ఉంది. `;
  return `${shortName} exam date: under revision. `;
}
