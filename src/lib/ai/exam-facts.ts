// Per-exam facts the tutor states as fact (24 Sep 2026).
//
// The September read of signed-in tutor chats found the tutor answering
// pattern and date questions from its own memory, and getting them wrong:
//   - it told a TS Police PC student the prelims is not 200 questions (the
//     Exam row says 200 in 180 minutes);
//   - it gave an SSC GD student three different totals — 45/180, 80/160 and
//     "25% is scaled" — for a paper stored as 80 questions / 160 marks;
//   - asked for SOF IMO dates on 4 Sep it said it had none, while the
//     tracker held the official 23 Oct / 26 Nov / 10 Dec exam days.
// The tutor was never shown the Exam row or the tracker. This module turns
// both into one block that goes in the per-exam system prompt, right after
// the syllabus block (its own 5-minute cache segment, so the shared 1-hour
// prefix is untouched).
//
// Honesty rules, the same ones every tracker surface follows:
//   - Dates go through buildTimeline (src/lib/exam-timeline.ts), so the tier
//     is the site's own (src/lib/official-source.ts) and an unannounced
//     answer-key row is already gone.
//   - EXPECTED-tier rows (typical-cycle estimates, passed estimates) are
//     dropped entirely — the tutor never sees an estimate, so it cannot
//     state one as a date.
//   - REPORTED rows (announced, cited via a secondary site) carry that
//     site's name and the instruction to say so.
//   - A per-question mark is printed only when src/lib/marking-scheme.ts can
//     state one scheme for the sitting in focus; otherwise its reason is.
//
// Review fixes (24 Sep 2026):
//   - "Not listed" is not "not announced". The first cut showed only the
//     last 60 days to the next 12 months, capped at 12, yet told the tutor
//     to say "no officially announced date" for anything unlisted — while
//     /updates showed the official rows it left out (GATE 2027 notification
//     20 Jul, UPSC prelims result 15 Jun, RRB NTPC CBT-1 results cut by the
//     cap). Now every kind's latest past and next upcoming announced row is
//     always listed whatever its age, the cap applies only to the rest, the
//     "(N more …)" count covers the whole tracker, and "not announced on the
//     tracker" is said only for a kind with no announced row anywhere on it.
//   - Nothing date-relative is cached. The source (src/lib/db/syllabus.ts)
//     sits in unstable_cache, which Next serves stale after an idle gap; a
//     cached "upcoming" on the morning of an exam told the student it was
//     tomorrow. buildTutorExamFacts runs when the prompt is built.
//   - The pattern is "Shishya's exam record", not unarguable: some rows
//     are still unchecked against the notification, which is final.
//
// Pure: no DB. src/lib/db/syllabus.ts loads the date-free source;
// src/lib/ai/tutor.ts calls buildTutorExamFacts and renders examFactsBlock.

import { buildTimeline, focusExamRow, type DateKind, type TimelineInput, type TimelineRow } from "@/lib/exam-timeline";
import { istDay } from "@/lib/exam-week";
import { markingSchemeVerdict } from "@/lib/marking-scheme";
import { sourceHostLabel } from "@/lib/official-source";
import type { TutorExamFacts, TutorExamFactsSource, TutorTrackerDate } from "./types";

/** Recent announced rows from this many IST days back … */
export const TRACKER_PAST_DAYS = 60;
/** … to this many days ahead fill the list after the pinned rows. */
export const TRACKER_AHEAD_DAYS = 365;
/** At most this many rows reach the prompt — unless the pinned rows alone
 *  are more (at most two per kind). */
export const TRACKER_DATE_CAP = 12;
/** Past rows kept even when the upcoming ones could fill the cap. */
export const TRACKER_PAST_RESERVE = 4;
/** The window the marking-scheme sitting is picked from — the same one
 *  context.md reads, so both name the same sitting. */
const SITTING_PAST_DAYS = 120;

/** Kinds whose latest past and next upcoming announced row are always
 *  listed, whatever their age or the cap. OTHER is a grab-bag (PET, DV,
 *  counselling …), so "the newest OTHER row" means nothing. */
export const PINNED_KINDS: readonly DateKind[] = [
  "NOTIFICATION",
  "APPLICATION_START",
  "CORRECTION_WINDOW",
  "APPLICATION_END",
  "ADMIT_CARD",
  "EXAM",
  "ANSWER_KEY",
  "QUESTION_PAPER",
  "RESULT",
  "INTERVIEW",
];

/** Kinds students ask "when is …?" about — the only ones the block may
 *  name as "not announced on the tracker". */
export const ASKED_KINDS: readonly DateKind[] = [
  "NOTIFICATION",
  "APPLICATION_START",
  "APPLICATION_END",
  "ADMIT_CARD",
  "EXAM",
  "ANSWER_KEY",
  "RESULT",
];

/** The word each kind is shown with, on every date line and in the
 *  "not announced" line, so the tutor can tell the kinds apart. */
export const KIND_WORD: Record<DateKind, string> = {
  NOTIFICATION: "notification",
  APPLICATION_START: "application opens",
  CORRECTION_WINDOW: "correction window",
  APPLICATION_END: "application closes",
  ADMIT_CARD: "admit card",
  EXAM: "exam",
  ANSWER_KEY: "answer key",
  QUESTION_PAPER: "question paper",
  RESULT: "result",
  INTERVIEW: "interview",
  OTHER: "other",
};

export type ExamFactsExam = TutorExamFactsSource["exam"];

export interface ExamFactsInput extends Omit<TutorExamFactsSource, "rows"> {
  /** Non-archived tracker rows, every one (any window) — a stored row or
   *  its cached JSON form. */
  rows: TimelineInput[];
  /** The moment the prompt is built. */
  now?: Date;
}

const LANGUAGE_NAMES: Record<string, string> = {
  EN: "English",
  HI: "Hindi",
  TE: "Telugu",
  TA: "Tamil",
  KN: "Kannada",
  ML: "Malayalam",
  MR: "Marathi",
  BN: "Bengali",
  GU: "Gujarati",
  PA: "Punjabi",
};

/** One-line label: tracker labels are free text. */
function cleanLabel(s: string): string {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > 140 ? `${one.slice(0, 137)}…` : one;
}

/** Which announced rows the prompt lists. Pure; `announced` in timeline
 *  (date) order. Exported for tests. */
export function pickTrackerRows(announced: TimelineRow[]): TimelineRow[] {
  const pinned = new Set<TimelineRow>();
  for (const kind of PINNED_KINDS) {
    const ofKind = announced.filter((r) => r.kind === kind);
    const past = ofKind.filter((r) => r.status === "done");
    const next = ofKind.find((r) => r.status !== "done");
    // Same-day rows come best tier first (buildTimeline's sort), so the
    // latest day's official row wins over a reported copy of it.
    if (past.length) {
      const lastDay = past[past.length - 1].day;
      pinned.add(past.find((r) => r.day === lastDay)!);
    }
    if (next) pinned.add(next);
  }
  const cap = Math.max(TRACKER_DATE_CAP, pinned.size);
  const room = cap - pinned.size;
  const inWindow = (r: TimelineRow) => r.daysFromToday >= -TRACKER_PAST_DAYS && r.daysFromToday <= TRACKER_AHEAD_DAYS;
  const extraPast = announced.filter((r) => !pinned.has(r) && r.status === "done" && inWindow(r));
  const extraAhead = announced.filter((r) => !pinned.has(r) && r.status !== "done" && inWindow(r));
  const pinnedPast = [...pinned].filter((r) => r.status === "done").length;
  const pinnedAhead = pinned.size - pinnedPast;
  // Upcoming rows are what students ask about; keep a few recent past rows
  // as context ("the application closed on …") — the pinned ones count.
  const pastWanted = Math.max(TRACKER_PAST_RESERVE, cap - pinnedAhead - extraAhead.length) - pinnedPast;
  let pastSlots = Math.max(0, Math.min(extraPast.length, pastWanted, room));
  const aheadSlots = Math.min(extraAhead.length, room - pastSlots);
  pastSlots = Math.min(extraPast.length, room - aheadSlots);
  const keep = new Set<TimelineRow>([
    ...pinned,
    ...extraPast.slice(extraPast.length - pastSlots),
    ...extraAhead.slice(0, aheadSlots),
  ]);
  return announced.filter((r) => keep.has(r));
}

/** Build the facts for one moment from the date-free source. Pure. */
export function buildTutorExamFacts(input: ExamFactsInput): TutorExamFacts {
  const now = input.now ?? new Date();
  const { exam, officialUrl } = input;
  const timeline = buildTimeline(input.rows, now, officialUrl);

  // Marking scheme for the sitting in focus — typed rows from −120 to +365
  // days only, as the exam-week state machine and context.md pick it.
  const sitting = focusExamRow(
    buildTimeline(
      input.rows.filter((r) => typeof r.kind === "string" && r.kind.length > 0),
      now,
      officialUrl,
    ).filter((r) => r.daysFromToday >= -SITTING_PAST_DAYS && r.daysFromToday <= TRACKER_AHEAD_DAYS),
  );
  const scheme = markingSchemeVerdict(exam, { rowLabel: sitting?.label, rowDate: sitting?.date });

  // Announced rows only: an expected-tier row never reaches the tutor.
  const announced = timeline.filter((r) => r.tier !== "expected");
  const kept = pickTrackerRows(announced);

  const dates: TutorTrackerDate[] = kept.map((r) => ({
    day: r.day,
    kind: r.kind,
    label: cleanLabel(r.label),
    tier: r.tier === "official" ? "official" : "reported",
    host: sourceHostLabel(r.url ?? ""),
    status: r.status === "done" ? "past" : r.status,
  }));

  return {
    asOfDay: istDay(now),
    pattern: {
      totalQuestions: exam.totalQuestions,
      scoredQuestions:
        exam.scoredQuestions != null && exam.scoredQuestions > 0 && exam.scoredQuestions < exam.totalQuestions
          ? exam.scoredQuestions
          : null,
      totalMarks: exam.totalMarks,
      marksPerQ: scheme.ok ? exam.marksPerQ : null,
      markingNote: scheme.ok ? null : scheme.reason,
      durationMin: exam.durationMin,
      negativeMark: exam.negativeMark,
      languages: [...exam.languages],
    },
    officialPortal: officialUrl ? { url: officialUrl, name: input.officialName } : null,
    dates,
    datesOmitted: announced.length - kept.length,
    notAnnouncedKinds: input.rowsComplete ? ASKED_KINDS.filter((k) => !announced.some((r) => r.kind === k)) : null,
    pages: input.pages,
    fullPatternMock: input.fullPatternMock,
    pyqYears: [...input.pyqYears].sort((a, b) => b - a),
    officialPaperYears: [...new Set(input.officialPaperYears)].sort((a, b) => b.localeCompare(a)),
  };
}

/** "0.5" / "1/3 (0.33)" — the fractions exam notices print. */
export function formatMark(n: number): string {
  const fractions: Array<[number, string]> = [
    [1 / 3, "1/3"],
    [2 / 3, "2/3"],
    [1 / 4, "1/4"],
    [3 / 4, "3/4"],
  ];
  for (const [v, f] of fractions) if (Math.abs(n - v) < 1e-6) return `${f} (${Number(n.toFixed(2))})`;
  return String(Number(n.toFixed(2)));
}

/** The pattern lines the tutor uses. Exported for tests. */
export function patternLines(p: TutorExamFacts["pattern"]): string[] {
  const questions = p.scoredQuestions != null
    ? `${p.totalQuestions} questions asked, ${p.scoredQuestions} of them scored`
    : `${p.totalQuestions} questions`;
  const perQ = p.marksPerQ != null ? ` · ${formatMark(p.marksPerQ)} mark${p.marksPerQ === 1 ? "" : "s"} per question` : "";
  const lines = [`- ${questions} · ${formatMark(p.totalMarks)} marks in total${perQ} · ${p.durationMin} minutes`];
  lines.push(
    `- Negative marking: ${p.negativeMark > 0 ? `−${formatMark(p.negativeMark)} mark${p.negativeMark === 1 ? "" : "s"} per wrong answer` : "none"}`,
  );
  if (p.markingNote) {
    lines.push(`- Marks per question: not stated — ${p.markingNote} Do not work one out from the totals.`);
  }
  if (p.languages.length) {
    lines.push(`- Paper offered in: ${p.languages.map((c) => LANGUAGE_NAMES[c] ?? c).join(", ")}`);
  }
  return lines;
}

function kindWord(kind: string): string {
  return KIND_WORD[kind as DateKind] ?? kind.toLowerCase();
}

function dateLine(d: TutorTrackerDate): string {
  const source =
    d.tier === "official"
      ? `OFFICIAL (notice on ${d.host})`
      : `REPORTED by ${d.host} — a secondary source, not the conducting body`;
  return `- ${d.day} · ${kindWord(d.kind)} · ${d.label} · ${d.status} · ${source}`;
}

/**
 * The per-exam block. Deterministic for a given facts object, so it caches
 * as one segment for every student of the exam until the facts (or the
 * IST day) change.
 */
export function examFactsBlock(facts: TutorExamFacts, exam: { code: string; name: string }): string {
  const site = `https://shishya.in/exams/${exam.code}`;
  const portal = facts.officialPortal
    ? `the official site ${facts.officialPortal.url}${facts.officialPortal.name ? ` (${facts.officialPortal.name})` : ""}`
    : "the conducting body's official website";
  const L: string[] = [];
  L.push(`# Exam facts — ${exam.name} (${exam.code}) · as of ${facts.asOfDay} (IST)`);

  L.push(
    `\n## Pattern — Shishya's exam record for ${exam.name}. Use these numbers for any question about the paper's size, marks, time or negative marking; never replace them with figures from memory or from another exam. The official notification is final: if the student quotes different numbers from the notification, tell them to go by the notification.`,
  );
  L.push(...patternLines(facts.pattern));
  L.push(
    `A mock the student took may be shorter than the real paper (a subject test, a short set, a PYQ year set) — say so; never treat its size or total as the exam's. For a stage or paper this record does not describe, say Shishya's record covers ${exam.name} only and point to the official notification.`,
  );

  L.push(`\n## Announced dates on Shishya's tracker — official and reported only; estimates are left out`);
  const noneAtAll = facts.dates.length === 0 && facts.datesOmitted === 0 && facts.notAnnouncedKinds != null;
  if (noneAtAll) {
    L.push(`- None: Shishya's tracker has no officially announced or reported date of any kind for ${exam.code} yet.`);
  } else {
    L.push(...facts.dates.map(dateLine));
    if (facts.dates.length === 0) L.push(`- None listed here — the tracker's dates are on ${site}/updates.`);
    if (facts.datesOmitted > 0) {
      L.push(`- (${facts.datesOmitted} more announced dates on the tracker are not listed here — other days, older cycles: ${site}/updates)`);
    }
    if (facts.notAnnouncedKinds?.length) {
      L.push(`- Not announced on Shishya's tracker yet (no official or reported date at all): ${facts.notAnnouncedKinds.map(kindWord).join(", ")}`);
    }
  }
  L.push(`How to use these dates:`);
  L.push(`- OFFICIAL rows are facts: give the date and name the source.`);
  L.push(`- REPORTED rows: always say which site reported it and that it is not yet confirmed on the official site.`);
  if (noneAtAll) {
    L.push(`- For any date the student asks about, say no official date has been announced on Shishya's tracker yet.`);
  } else {
    L.push(
      `- For every kind of date except "other", this list holds the tracker's latest one that has passed and its next one still to come. So when a kind's newest row here is in the past, the tracker has nothing newer of that kind yet: say so, and say which cycle or year that past date belongs to.`,
    );
    if (facts.notAnnouncedKinds?.length) {
      L.push(`- For a kind under "Not announced", say no official date for it has been announced on Shishya's tracker yet.`);
    }
    L.push(
      `- Any other date not listed here (another exam day or shift, an older cycle): do not state one from memory — say it isn't among the dates you have and send the student to the full tracker ${site}/updates.`,
    );
  }
  L.push(`- Always point to ${portal} to confirm. Never guess or estimate a date, and never give a "usually in <month>" timing.`);

  L.push(`\n## What exists for ${exam.code}`);
  if (facts.pages) {
    const gated: Array<[keyof NonNullable<TutorExamFacts["pages"]>, string]> = [
      ["syllabus", "/syllabus"],
      ["cutoff", "/cutoff"],
      ["tricks", "/tricks"],
      ["guide", "/guide"],
      ["buildMock", "/build-mock"],
    ];
    const open = gated.filter(([k]) => facts.pages![k]).map(([, p]) => `${site}${p}`);
    const shut = gated.filter(([k]) => !facts.pages![k]).map(([, p]) => `${site}${p}`);
    if (open.length) L.push(`- Pages that exist: ${open.join(", ")}`);
    if (shut.length) L.push(`- NOT available for this exam (never link them): ${shut.join(", ")}`);
  }
  if (facts.fullPatternMock === true) {
    L.push(`- Full-length real-pattern mock: yes — the "Full-Length Mock (Real Pattern)" tile on ${site}`);
  } else if (facts.fullPatternMock === false) {
    L.push(`- Full-length real-pattern mock: not built for this exam yet — the mocks that exist are in "Mock tests" on ${site}`);
  }
  L.push(
    facts.pyqYears.length
      ? `- PYQ-pattern practice sets (modelled on that year's paper, not the paper itself, usually far fewer questions): ${facts.pyqYears.join(", ")} — ${site}/pyq/{YEAR}`
      : `- PYQ-pattern practice sets: none for this exam yet.`,
  );
  L.push(
    facts.officialPaperYears.length
      ? `- Official question papers as the conducting body published them ("Official papers" block on ${site}): ${facts.officialPaperYears.join(", ")}`
      : `- Official question papers: none on Shishya for this exam yet.`,
  );
  return L.join("\n");
}
