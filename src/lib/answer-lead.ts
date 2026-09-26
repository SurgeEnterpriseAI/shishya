// Answer-first leads (26 Sep 2026, discoverability wave 2 G3).
//
// The exam hub, /updates, /cutoff and /syllabus opened with the exam's name
// and a generic intro; the answer a searcher came for sat further down, and
// answer engines (ChatGPT via Bing, ~42% of new visitors) quote a page's
// first sentences. Each page now opens with ONE short paragraph — at most
// LEAD_MAX_WORDS words — that answers its query from stored rows only, and the
// same text heads the page's meta description (leadDescription, ~160 chars).
//
// Rules, pinned by tests/unit/answer-lead.test.ts:
//   • every sentence comes from a stored row; a missing piece is omitted,
//     never guessed. 27 Sep 2026 (repair, adversarial review): with no
//     announced row the lead said "{exam} exam date: not announced yet" —
//     a claim about the conducting body drawn from a gap in Shishya's
//     tracker, and false for 62 hubs (NTA had announced JEE Main 2027 on
//     16 Sep; UPSC's 2027 calendar, out since 20 May, dates Prelims and
//     CDS). The lead now states what Shishya knows — "Shishya's tracker has
//     no announced … date yet" (trackerNoDate); still no expected date
//     leads the hub (critic veto, 26 Sep);
//   • every date carries its tier: official / reported (with the host that
//     said it) / expected ("not announced");
//   • pattern numbers only from src/lib/pattern-verified.ts (verifiedPattern),
//     with the notice they were read from — the stored Exam tuple has no
//     source (critic veto, 26 Sep 2026);
//   • the hub's date sentence is the SAME decision as its <title>
//     (src/lib/hub-title.ts hubDateLead) — the two can never disagree;
//   • English only: the /hi and /te twins do not render these (their
//     native-script share is measured without lib text — critic veto).
// Pure: no DB, no dictionary, no clock except the rows' own daysFromToday.

import {
  clipDescription,
  heldDescriptionLead,
  heldVerb,
  heldYearDescriptionLead,
  hubTitleDay,
  stageMarkers,
  type HubDateLead,
  type HubTitleYear,
} from "@/lib/hub-title";
import type { SourceTier, TimelineRow } from "@/lib/exam-timeline";
import { isoDayText, patternSentence, type VerifiedPattern } from "@/lib/pattern-verified";
import type { CutoffHeadline } from "@/lib/official-cutoff-title";

export const LEAD_MAX_WORDS = 60;
/** Meta description length a lead heads (Google shows ~155–160). */
export const LEAD_META_MAX = 160;

const DAY_MS = 86_400_000;
/** How far after a "begins" row its "ends" row may sit to be one window. */
const WINDOW_MAX_DAYS = 60;

export function leadWords(s: string): number {
  return (s ?? "").trim().split(/\s+/).filter(Boolean).length;
}

/** "ssc.gov.in" from a URL; "" when it is not one. */
export function hostOf(url: string | null | undefined): string {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "") : "";
  } catch {
    return "";
  }
}

/** Sentences in priority order, joined; later ones are dropped until the
 *  lead fits LEAD_MAX_WORDS (a single long first sentence is cut at a word
 *  with "…"). Null when nothing is left. */
export function capLead(sentences: readonly (string | null | undefined | false)[]): string | null {
  const parts = sentences.map((s) => (s || "").trim()).filter(Boolean);
  while (parts.length > 1 && leadWords(parts.join(" ")) > LEAD_MAX_WORDS) parts.pop();
  let s = parts.join(" ").trim();
  if (!s) return null;
  if (leadWords(s) > LEAD_MAX_WORDS) {
    s = `${s.split(/\s+/).slice(0, LEAD_MAX_WORDS).join(" ").replace(/[\s,;:—–-]+$/u, "")}…`;
  }
  return s;
}

/** The tier words a date carries: "official — ssc.gov.in", "reported —
 *  adda247.com", "expected, not announced". */
export function tierNote(tier: SourceTier, url: string | null | undefined, labelSaysExpected = false): string {
  if (tier === "expected") return labelSaysExpected ? "not announced" : "expected, not announced";
  const host = hostOf(url);
  return host ? `${tier} — ${host}` : tier;
}

const saysExpected = (label: string) => /\bexpected\b/i.test(label);

/** "Tier 1 exam begins: 30 Sept 2026 (official — ssc.gov.in)". */
function datedLabel(r: TimelineRow): string {
  return `${r.label}: ${hubTitleDay(r.date)} (${tierNote(r.tier, r.url, saysExpected(r.label))})`;
}

const markerKey = (label: string) =>
  [...stageMarkers(label)]
    .filter((m) => m !== "end")
    .sort()
    .join("|");

/** The announced "ends" row of the window a "begins" row opens — SSC CGL's
 *  "Tier 1 exam begins" 30 Sep and "Tier 1 exam ends" 30 Oct (same stage
 *  markers, within WINDOW_MAX_DAYS). Null for a one-day paper. */
export function windowEnd(row: TimelineRow, timeline: readonly TimelineRow[]): TimelineRow | null {
  if (heldVerb(row) !== "began") return null;
  const key = markerKey(row.label);
  return (
    timeline.find(
      (r) =>
        r.id !== row.id &&
        r.kind === "EXAM" &&
        r.tier !== "expected" &&
        r.date.getTime() > row.date.getTime() &&
        r.date.getTime() - row.date.getTime() <= WINDOW_MAX_DAYS * DAY_MS &&
        heldVerb(r) === "ended" &&
        markerKey(r.label) === key,
    ) ?? null
  );
}

/** "SSC CGL — " unless the label already names the exam. */
function examPrefix(short: string, label: string): string {
  return label.toLowerCase().includes(short.toLowerCase()) ? "" : `${short} — `;
}

// ── "No date" in Shishya's words ─────────────────────────────────────────

/** The English held leads (src/lib/hub-title.ts) end with this claim. */
export const HELD_NEXT_NONE_EN = "; next exam date: not announced yet.";

/** "Shishya's tracker has no announced JEE Main exam date yet." */
export function trackerNoDate(what: string): string {
  return `Shishya's tracker has no announced ${what} exam date yet.`;
}

/** A held lead with its "next exam date: not announced yet" claim restated
 *  as what the tracker holds. */
export function heldLeadInTrackerWords(heldLead: string): string {
  const t = heldLead.trim();
  return t.endsWith(HELD_NEXT_NONE_EN) ? `${t.slice(0, -HELD_NEXT_NONE_EN.length)}; Shishya's tracker has no announced date for the next exam yet.` : t;
}

// ── Hub ──────────────────────────────────────────────────────────────────

export interface HubLeadInput {
  short: string;
  /** hubDateLead's decision — the one the <title> printed. */
  dateLead: HubDateLead;
  titleYear: HubTitleYear;
  /** The timeline the decision was made on (for the window's end row). */
  timeline: readonly TimelineRow[];
  pattern: VerifiedPattern | null;
  officialUrl: string | null;
}

export function hubLead(i: HubLeadInput): string | null {
  let date: string;
  const lead = i.dateLead;
  if (lead.kind === "announced") {
    const end = windowEnd(lead.row, i.timeline);
    date = `${examPrefix(i.short, lead.row.label)}${datedLabel(lead.row)}${end ? `; ${datedLabel(end)}` : ""}.`;
  } else if (lead.kind === "revision") {
    date = `${i.short} exam date: under revision — two announced dates for the same stage disagree, so neither is stated here.`;
  } else if (lead.kind === "held") {
    date = heldLeadInTrackerWords(heldDescriptionLead("en", i.short, lead, lead.row.tier === "official" ? null : "reported"));
  } else if (i.titleYear.kind === "held-year") {
    date = heldLeadInTrackerWords(heldYearDescriptionLead("en", i.short, i.titleYear.year));
  } else {
    date = trackerNoDate(i.short);
  }
  const host = hostOf(i.officialUrl);
  return capLead([date, i.pattern ? `${i.short} ${patternSentence(i.pattern)}` : null, host ? `Official site: ${host}.` : null]);
}

// ── /updates ─────────────────────────────────────────────────────────────

export interface UpdatesLeadInput {
  short: string;
  year: number;
  /** stageOf(shown): the next exam day, the next row of any kind, the last done row. */
  nextExam: TimelineRow | null;
  next: TimelineRow | null;
  last: TimelineRow | null;
}

export function updatesLead(i: UpdatesLeadInput): string | null {
  const live = (r: TimelineRow | null) => (r && !r.passedEstimate ? r : null);
  const nextExam = live(i.nextExam);
  const next = live(i.next);
  // A "Last:" row is something that happened: never an estimate that went by.
  const last = i.last && i.last.tier !== "expected" && !i.last.passedEstimate ? i.last : null;
  const first = nextExam
    ? `${examPrefix(`${i.short} ${i.year}`, nextExam.label)}${datedLabel(nextExam)}.`
    : trackerNoDate(`${i.short} ${i.year}`);
  return capLead([
    first,
    next && next.id !== nextExam?.id ? `Next: ${datedLabel(next)}.` : null,
    last ? `Last: ${datedLabel(last)}.` : null,
  ]);
}

// ── /cutoff ──────────────────────────────────────────────────────────────

export interface CutoffLeadInput {
  short: string;
  /** The newest cycle year the page shows (src/lib/cutoff-label-year.ts). */
  year: number | null;
  headline: CutoffHeadline | null;
  officialUrl: string | null;
}

/** The headline figure and who published it, as two sentences: "SSC CGL
 *  cutoff 2025: UR 54.00000 (Cut-off Marks in Section-I) — Tier-II …, All
 *  posts. Published by Staff Selection Commission on 1 Jan 2026 (official —
 *  ssc.gov.in)." The hub FAQ quotes the same two. */
export function cutoffHeadlineSentences(short: string, year: number | null, h: CutoffHeadline): [string, string] {
  const where = [h.stage, h.post, h.region].filter(Boolean).join(", ");
  const figure = `${h.category} ${h.marks}${h.maxMarks ? ` out of ${h.maxMarks}` : ""}${h.scoreType ? ` (${h.scoreType})` : ""}`;
  return [
    `${short} cutoff${year !== null ? ` ${year}` : ""}: ${figure}${where ? ` — ${where}` : ""}.`,
    `Published by ${h.publisher || hostOf(h.url) || "the conducting body"}${h.publishedOn ? ` on ${isoDayText(h.publishedOn)}` : ""} (${tierNote(h.tier, h.url)}).`,
  ];
}

/** The published figure the page opens with, or — with no published row —
 *  the plain statement that the bands are indicative, and where the body
 *  publishes its cutoffs. */
export function cutoffLead(i: CutoffLeadInput): string | null {
  const h = i.headline;
  const host = hostOf(i.officialUrl);
  if (!h) {
    return capLead([
      `No official ${i.short} cutoff is published on Shishya yet — the score bands below are indicative, not official.`,
      host ? `Official cutoffs are published at ${host}.` : null,
    ]);
  }
  return capLead([...cutoffHeadlineSentences(i.short, i.year, h), "The score bands further down are indicative, not official."]);
}

// ── /syllabus ────────────────────────────────────────────────────────────

export interface SyllabusLeadInput {
  short: string;
  subjects: readonly string[];
  topicCount: number;
  pattern: VerifiedPattern | null;
  officialUrl: string | null;
}

const SUBJECTS_NAMED = 6;

export function syllabusLead(i: SyllabusLeadInput): string | null {
  const n = i.subjects.length;
  if (n === 0) return null;
  const named =
    n <= SUBJECTS_NAMED
      ? i.subjects.join(", ")
      : `${i.subjects.slice(0, SUBJECTS_NAMED - 1).join(", ")} and ${n - (SUBJECTS_NAMED - 1)} more`;
  const host = hostOf(i.officialUrl);
  return capLead([
    `${i.short} syllabus: ${n} ${n === 1 ? "subject" : "subjects"} (${named}) and ${i.topicCount} ${i.topicCount === 1 ? "topic" : "topics"}.`,
    i.pattern ? `${i.short} ${patternSentence(i.pattern)}` : null,
    host ? `Official syllabus and notification: ${host}.` : null,
  ]);
}

// ── Meta description ─────────────────────────────────────────────────────

/** The lead heads the meta description; the page's own description follows,
 *  and the whole is cut at a sentence or word boundary at `max`. */
export function leadDescription(lead: string | null, rest: string, max = LEAD_META_MAX): string {
  return clipDescription(lead ? `${lead} ${rest}` : rest, max);
}
