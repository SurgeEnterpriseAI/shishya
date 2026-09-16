// Exam Week Mode — shared state machine (6 Sep 2026).
//
// One pure function every exam-week surface reads (hub block, cutoff page,
// tracker, emails, context.md/llms lines), so all of them agree on WHICH
// exam day is in focus and WHAT phase today is in IST:
//
//   none      no exam day within [-7, +7] days
//   week      2..7 days before the (first) exam day
//   eve       the day before
//   today-am  exam day, before 18:00 IST (TODAY_PM_IST_HOUR)
//   today-pm  exam day, 18:00 IST onwards ("how was the paper?")
//   window    the exam is a multi-day/multi-shift window and today is inside it
//   post      1..7 days after the (last) exam day
//
// The poll itself opens EARLIER than today-pm (11 Sep 2026): NDA's second
// paper ends 16:30 IST and SBI PO Mains is a morning sitting, so a fixed
// 18:00 gate asked "how was the paper?" hours after students had left the
// hall. examDayPollOpen() below answers "may the block show the poll on
// today-am?" — from the END of the first shift when the EXAM row's label /
// notes name a time range (the start when they name only a start), else
// from noon IST — while the PHASE keeps flipping at 18:00 for everything
// else (mails, alert copy, cache keys). 16 Sep 2026: it used to open at the
// first shift's START (09:00 for MP RAEO's 09:00–12:00 shift, 10:30 for
// KSRP's 10:30–12:00), while every candidate was still in the hall, so the
// first "how was the paper?" answers could only come from people who had
// not sat it. Nobody has finished a paper before its first sitting ends.
//
// Honesty rules baked in: only TYPED rows count (kind set) — untyped legacy
// seed rows never open a phase; the focus row keeps its source tier
// (official / reported / expected) and callers must print it next to every
// date; answer-key / result rows are only ever what the tracker holds —
// callers print "not announced yet" when null, never a guessed date.
//
// Window semantics (review fix, 6 Sep): a window is a chain of exam-day rows
// no more than 14 days apart, built from ALL exam days (not just those near
// today), so a 12–25 Sep CBT window stays "window" on its 8th day instead of
// turning back into "week/eve" for the last row. Inside a window the FOCUS
// is the latest exam day on or before today — the day students can rate —
// never a future row.
//
// Deterministic rows (16 Sep 2026): two rows on one day used to be picked
// by whatever order the loader returned — the eve cron, the hub and the
// checklist each named a different KSRP sitting, and on exam day the
// reverse().find() handed the focus to the WORST tier (a time-less
// "reported" copy of two official sittings). Every row choice now goes
// through examRowOrder: day, then tier (official > reported > expected),
// then the earliest first-shift start its label / notes name, then id.
//
// Open-ended exams (16 Sep 2026): MP RAEO's only official exam row reads
// "Online exam begins — shifts … (end date not announced)". A one-row
// window used to turn "post" — "the paper was held" — the next morning
// while later shifts may still be running. When the window's last row
// says its end date is not announced (OPEN_END_RE, deliberately narrow),
// the NEAR_DAYS after it stay phase "window" with openEnded = true; the
// block and the checklist say "exam began {date}; end date not announced".

import { buildTimeline, type TimelineInput, type TimelineRow, type SourceTier } from "@/lib/exam-timeline";

export type ExamWeekPhase = "none" | "week" | "eve" | "today-am" | "today-pm" | "window" | "post";

export interface ExamWeekState {
  phase: ExamWeekPhase;
  /** The exam-day row in focus (null when phase === "none"). Before the
   *  window: its first day. Inside/after: the latest exam day ≤ today. */
  focus: TimelineRow | null;
  /** IST calendar date of the focus row, "YYYY-MM-DD" — the poll's key. */
  focusDay: string | null;
  tier: SourceTier | null;
  /** Days from today (IST) to the FOCUS day: positive = upcoming, negative
   *  = past. Always describes `focusDay`, so a caller can print the two
   *  together — inside a long window that is the day students just sat,
   *  not the day the window opened. */
  daysTo: number | null;
  /** Last exam-day row of the window (same as focus for single-day exams). */
  windowEnd: TimelineRow | null;
  /** All exam-day rows that form the window, earliest first. */
  windowDays: TimelineRow[];
  /** Nearest ANSWER_KEY row on/after the window's first day, if the tracker has one. */
  answerKey: TimelineRow | null;
  /** Nearest RESULT row on/after the window's first day, if the tracker has one. */
  result: TimelineRow | null;
  /** Next exam-day row for this exam after the window (e.g. Tier 2 / Mains). */
  nextStage: TimelineRow | null;
  /** The window's last announced row says its end date is not announced
   *  (isOpenEndedRow) and today is 1..NEAR_DAYS after it: phase is
   *  "window", never "post" — nobody told us the exam is over. Surfaces
   *  print "exam began {date}; end date not announced", not a window end. */
  openEnded: boolean;
}

const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;
const WINDOW_GAP_DAYS = 14;
const NEAR_DAYS = 7;
/** Exam day flips from today-am to today-pm at this IST hour. */
export const TODAY_PM_IST_HOUR = 18;
/** With no timing on the EXAM row, "done with your paper?" is first asked
 *  from this IST hour on exam day — a single morning sitting is over by then. */
export const POLL_DEFAULT_OPEN_IST_HOUR = 12;

/** "YYYY-MM-DD" of an instant in IST. */
export function istDay(d: Date): string {
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Hour of day (0-23) in IST. */
export function istHour(d: Date): number {
  return new Date(d.getTime() + IST_OFFSET_MS).getUTCHours();
}

/** Fractional hour of day in IST (10.5 = 10:30). */
function istHourFrac(d: Date): number {
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  return ist.getUTCHours() + ist.getUTCMinutes() / 60;
}

/**
 * Earliest clock time named in a tracker row's label / notes, as a
 * fractional IST hour — the first shift's start. Reads "10:00 AM to
 * 12:30 PM", "9 am", "10.30 AM", "Shift 1: 09:00", "14:00 hrs", "12 noon"
 * and a range whose start borrows the end's am/pm ("9-11 AM", "2:30-4:30
 * PM"). Returns null when the text names no time (dates, years and marks
 * never match).
 */
export function firstShiftStartIst(text: string | null | undefined): number | null {
  if (!text) return null;
  const times = clockTimes(text);
  return times.length ? Math.min(...times.map((t) => t.h)) : null;
}

/** A "from–to" separator between two clock times. */
const RANGE_SEP_RE = /^\s*(?:[-–—]|to|till|until)\s*$/i;
/** Longest gap a start borrowing the end's am/pm may span — a sitting, not
 *  "Paper 2 - 10 AM" read as 2 AM to 10 AM. */
const BORROWED_RANGE_MAX_HOURS = 6;
/** A numbering word right before a bare number — "Shift 3 - 9 AM", "Day 5 –
 *  10 AM": the number names the shift / day, it is not a start hour. */
const NUMBERING_WORD_BEFORE_RE =
  /\b(?:shift|slot|session|batch|day|paper|tier|phase|stage|part|group|round|sitting|cbt|no|number)\s*[:#.-]?\s*$|#\s*$/i;

/** Clock times with their position in the text, in order of appearance:
 *  12-hour with am/pm, "noon" / "12 noon", 24-hour "14:00", and a bare
 *  start hour right before "- {time with am/pm}".
 *
 *  16 Sep 2026 (review): "Paper I: 10 AM - 12 noon, Paper II: 2 PM - 4 PM"
 *  (ML MPSC) skipped the noon end, "English (9-11 AM)" (CDS) skipped the 9,
 *  and "GS-I (9:30-11:30 AM) and GS-II (2:30-4:30 PM)" (UPPSC PCS) read
 *  "2:30" as 02:30 — each moved the first sitting's end to the afternoon
 *  paper. A start without am/pm now borrows the end's when the pair is one
 *  range of at most BORROWED_RANGE_MAX_HOURS ("11-1 PM" → 11:00–13:00). */
function clockTimes(text: string): { h: number; start: number; end: number }[] {
  type Tok = { h: number; start: number; end: number; pm: boolean | null; hour: number; min: number; bare: boolean };
  const toks: Tok[] = [];
  const re =
    /\b(?:12(?:[:.]00)?\s*)?noon\b|\b(\d{1,2})(?:[:.](\d{2}))?\s*([ap])\.?m\.?(?![a-z])|\b(\d{1,2}):(\d{2})\b|\b(\d{1,2})(?=\s*(?:[-–—]|to\b|till\b|until\b)\s*(?:\d{1,2}(?:[:.]\d{2})?\s*[ap]\.?m\.?(?![a-z])|(?:12(?:[:.]00)?\s*)?noon\b))/gi;
  for (const m of text.matchAll(re)) {
    const at = m.index ?? 0;
    const span = { start: at, end: at + m[0].length };
    if (m[3]) {
      const hour = Number(m[1]);
      const min = m[2] ? Number(m[2]) : 0;
      const pm = m[3].toLowerCase() === "p";
      if (hour >= 1 && hour <= 12 && min <= 59) toks.push({ ...span, h: (hour % 12) + (pm ? 12 : 0) + min / 60, pm, hour, min, bare: false });
    } else if (m[4] !== undefined) {
      const hour = Number(m[4]);
      const min = Number(m[5]);
      if (hour <= 23 && min <= 59) toks.push({ ...span, h: hour + min / 60, pm: null, hour, min, bare: false });
    } else if (m[6] !== undefined) {
      toks.push({ ...span, h: Number(m[6]), pm: null, hour: Number(m[6]), min: 0, bare: true });
    } else {
      toks.push({ ...span, h: 12, pm: true, hour: 12, min: 0, bare: false });
    }
  }
  const out: { h: number; start: number; end: number }[] = [];
  toks.forEach((a, i) => {
    const b = toks[i + 1];
    if (
      a.pm === null &&
      a.hour >= 1 &&
      a.hour <= 12 &&
      b &&
      b.pm !== null &&
      RANGE_SEP_RE.test(text.slice(a.end, b.start)) &&
      !(a.bare && NUMBERING_WORD_BEFORE_RE.test(text.slice(Math.max(0, a.start - 16), a.start)))
    ) {
      let h = (a.hour % 12) + a.min / 60 + (b.pm ? 12 : 0);
      if (h >= b.h) h -= 12;
      if (h >= 0 && b.h - h <= BORROWED_RANGE_MAX_HOURS) {
        out.push({ h, start: a.start, end: a.end });
        return;
      }
    }
    if (!a.bare) out.push({ h: a.h, start: a.start, end: a.end });
  });
  return out;
}

/**
 * When the first sitting a row names is OVER, as a fractional IST hour
 * (16 Sep 2026): the end of the earliest-starting "from–to" range in the
 * label / notes ("09:00–12:00 and 14:30–17:30" → 12, "10:00 AM to 12:30 PM"
 * → 12.5). A row that names only a start falls back to that start
 * (firstShiftStartIst); no time at all → null.
 */
export function firstShiftEndIst(text: string | null | undefined): number | null {
  if (!text) return null;
  const times = clockTimes(text);
  let best: { from: number; to: number } | null = null;
  for (let i = 0; i + 1 < times.length; i++) {
    const a = times[i];
    const b = times[i + 1];
    if (!RANGE_SEP_RE.test(text.slice(a.end, b.start))) continue;
    if (b.h <= a.h) continue;
    if (!best || a.h < best.from) best = { from: a.h, to: b.h };
  }
  return best ? best.to : firstShiftStartIst(text);
}

/**
 * May the exam-day block show "done with your paper?" now? True from
 * TODAY_PM_IST_HOUR regardless; earlier on exam day once the first sitting
 * is over — the earliest firstShiftEndIst the focus day's EXAM rows name in
 * their label / notes, else POLL_DEFAULT_OPEN_IST_HOUR. Reads only the
 * clock: the caller still gates on an ANNOUNCED tier.
 */
export function examDayPollOpen(
  state: Pick<ExamWeekState, "focus" | "focusDay" | "windowDays">,
  now: Date = new Date(),
): boolean {
  const h = istHourFrac(now);
  if (h >= TODAY_PM_IST_HOUR) return true;
  const rows = [state.focus, ...state.windowDays].filter(
    (r): r is TimelineRow => !!r && (!state.focusDay || istDay(r.date) === state.focusDay),
  );
  const ends = rows.map((r) => firstShiftEndIst(`${r.label ?? ""}\n${r.notes ?? ""}`)).filter((x): x is number => x !== null);
  const opensAt = ends.length ? Math.min(...ends) : POLL_DEFAULT_OPEN_IST_HOUR;
  return h >= opensAt;
}

function dayDiff(fromDay: string, toDay: string): number {
  return Math.round((Date.parse(toDay + "T00:00:00Z") - Date.parse(fromDay + "T00:00:00Z")) / DAY_MS);
}

const TIER_RANK: Record<SourceTier, number> = { official: 0, reported: 1, expected: 2 };

/**
 * The one order every exam-day row choice uses (16 Sep 2026): IST day,
 * then tier (official > reported > expected), then the earliest first-shift
 * start the label / notes name (a row naming no time goes after one that
 * does), then id — so the cron, the hub and the checklist can never pick
 * different rows out of the same tracker.
 */
export function examRowOrder(
  a: Pick<TimelineRow, "id" | "date" | "tier" | "label" | "notes">,
  b: Pick<TimelineRow, "id" | "date" | "tier" | "label" | "notes">,
): number {
  const byDay = istDay(a.date).localeCompare(istDay(b.date));
  if (byDay !== 0) return byDay;
  const byTier = TIER_RANK[a.tier] - TIER_RANK[b.tier];
  if (byTier !== 0) return byTier;
  const sa = firstShiftStartIst(`${a.label ?? ""}\n${a.notes ?? ""}`);
  const sb = firstShiftStartIst(`${b.label ?? ""}\n${b.notes ?? ""}`);
  if (sa !== sb) return sa === null ? 1 : sb === null ? -1 : sa - sb;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Every sitting on one IST day: the EXAM rows of that day at the best tier
 * the day holds (a "reported" copy never sits beside official rows),
 * one per label, in examRowOrder. KSRP on 20 Sep 2026 has two official
 * sittings — 10:30–12:00 outside Kalyana Karnataka and 15:00–16:30 in it —
 * and a surface that prints only the focus row hides one of them.
 */
export function sittingsOn(rows: readonly TimelineRow[], day: string | null | undefined): TimelineRow[] {
  if (!day) return [];
  const onDay = rows.filter((r) => r.kind === "EXAM" && istDay(r.date) === day).sort(examRowOrder);
  if (onDay.length === 0) return [];
  const best = onDay[0].tier;
  const seen = new Set<string>();
  return onDay.filter((r) => {
    if (r.tier !== best) return false;
    const key = r.label.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** "End date not announced" (also "not yet announced" / "to be announced" /
 *  TBA / TBD). Deliberately narrow (16 Sep 2026): "begins", "starts" and
 *  "onwards" also read as open windows, but they match rows whose end IS
 *  on record (JKSSB "Exam begins … continues till 15 November", UPSC "Mains
 *  exam begins" with its five days listed). Today it matches MP RAEO only. */
export const OPEN_END_RE = /\bend\s+date\s+(?:is\s+)?(?:not\s+(?:yet\s+)?announced|to\s+be\s+announced|tba|tbd)\b/i;

/** An exam-day row that names a start and says its end is not announced. */
export function isOpenEndedRow(r: Pick<TimelineRow, "label" | "notes"> | null | undefined): boolean {
  return !!r && OPEN_END_RE.test(`${r.label ?? ""}\n${r.notes ?? ""}`);
}

/** Reporting-instruction wording in an admit-card note. */
const REPORTING_WORDS_RE =
  /\breport(?:ing)?\b|\bgates?\s+(?:close[sd]?|closing|open(?:s|ed|ing)?|shuts?)\b|\bentry\b|\breach\b/i;
/** Release wording — a note about when / where the card comes out. */
const RELEASE_WORDS_RE = /\b(?:available|release[sd]?|releasing|download(?:s|ed|able)?|issued?)\b/i;

/** Do an admit-card row's notes read as reporting instructions — reporting,
 *  gate or entry wording, and no release wording? Only then may a surface
 *  print them as "Reporting: …" (16 Sep 2026: MP RAEO's admit row note "Test
 *  admit card available for download from MPESB portal" was printed as
 *  reporting instructions). Otherwise the release-date line is used.
 *  A clock time alone does not count (review, 16 Sep 2026): "Available from
 *  5:00 PM onwards via OTR portal" (JPSC) is a release time, and "GATE"
 *  is an exam's name, not a gate. */
export function admitNotesAreReporting(notes: string | null | undefined): boolean {
  const text = notes?.trim();
  if (!text) return false;
  return REPORTING_WORDS_RE.test(text) && !RELEASE_WORDS_RE.test(text);
}

/** The phase an alert box's COPY follows (16 Sep 2026, review). An
 *  open-ended window (MP RAEO the week after its start row) has had a
 *  paper, so the box makes the answer-key / result promise the post week
 *  made before; the state's own phase stays "window". */
export function alertCopyPhase(phase: ExamWeekPhase, state: Pick<ExamWeekState, "openEnded">): ExamWeekPhase {
  return phase === "window" && state.openEnded ? "post" : phase;
}

const NONE: ExamWeekState = {
  phase: "none", focus: null, focusDay: null, tier: null, daysTo: null,
  windowEnd: null, windowDays: [], answerKey: null, result: null, nextStage: null,
  openEnded: false,
};

/**
 * Compute the exam-week state from the exam's tracker rows.
 * @param rows        ExamImportantDate rows (archived rows must already be excluded;
 *                    untyped legacy rows are ignored here)
 * @param officialUrl the exam's conducting-body URL (ExamEligibility.officialUrl) — drives the tier
 * @param now         instant to evaluate at (tests pass a fixed date)
 */
export function computeExamWeekState(
  rows: TimelineInput[],
  officialUrl?: string | null,
  now: Date = new Date(),
): ExamWeekState {
  // Typed rows only: the May-2026 seed left untyped rows (kind null) that
  // buildTimeline would otherwise promote to EXAM via isExamDay.
  const typed = rows.filter((r) => typeof r.kind === "string" && r.kind.length > 0);
  const timeline = buildTimeline(typed, now, officialUrl);
  const today = istDay(now);
  // examRowOrder: day, tier, earliest shift, id — the loaders' row order
  // (cron ORDER BY date, hub orderBy date) can no longer move the focus.
  const examDays = timeline
    .filter((r) => r.kind === "EXAM")
    .sort(examRowOrder)
    .map((r) => ({ row: r, day: istDay(r.date) }));
  if (examDays.length === 0) return NONE;

  // Chains: consecutive exam days ≤ 14 days apart form one window.
  const chains: (typeof examDays)[] = [];
  for (const e of examDays) {
    const cur = chains[chains.length - 1];
    if (cur && dayDiff(cur[cur.length - 1].day, e.day) <= WINDOW_GAP_DAYS) cur.push(e);
    else chains.push([e]);
  }

  // The relevant chain: one with any day within [-7, +7] of today. If several
  // qualify (rare), prefer the one whose nearest day is best-tier, then nearest.
  const scored = chains
    .map((c) => {
      const near = c
        .map((e) => ({ e, diff: dayDiff(today, e.day) }))
        .filter((x) => x.diff >= -NEAR_DAYS && x.diff <= NEAR_DAYS)
        .sort((a, b) => TIER_RANK[a.e.row.tier] - TIER_RANK[b.e.row.tier] || Math.abs(a.diff) - Math.abs(b.diff) || b.diff - a.diff);
      return { c, near: near[0] ?? null };
    })
    .filter((x) => x.near);
  if (scored.length === 0) return NONE;
  scored.sort((a, b) => TIER_RANK[a.near!.e.row.tier] - TIER_RANK[b.near!.e.row.tier] || Math.abs(a.near!.diff) - Math.abs(b.near!.diff));
  const chain = scored[0].c;
  // The chain is in examRowOrder, so the FIRST row of a day is that day's
  // best row (16 Sep 2026: chain[chain.length - 1] was the last day's
  // WORST-tier row, and reverse().find() below did the same inside the
  // window — the time-less "reported" KSRP copy took the exam-day focus).
  const bestOn = (day: string) => chain.find((e) => e.day === day) ?? chain[0];
  const first = chain[0];
  const last = bestOn(chain[chain.length - 1].day);
  // Distance to the window's FIRST day — this is what decides the phase
  // (week / eve / inside / post). The value REPORTED as daysTo is
  // re-based on the focus row further down, so daysTo and focusDay always
  // describe the same day; applyShiftDay does the same for a shift day.
  const daysToFirst = dayDiff(today, first.day);
  const daysAfterLast = dayDiff(last.day, today);

  // Open-ended: an ANNOUNCED row on the window's last day says the end date
  // is not announced. An estimate never keeps a window open.
  const lastDayOpen = chain.some((e) => e.day === last.day && e.row.tier !== "expected" && isOpenEndedRow(e.row));

  let phase: ExamWeekPhase = "none";
  let focus = first;
  let openEnded = false;
  if (daysToFirst >= 2 && daysToFirst <= NEAR_DAYS) phase = "week";
  else if (daysToFirst === 1) phase = "eve";
  else if (daysToFirst <= 0 && today <= last.day) {
    // Inside the window: focus = the best row of the latest exam day on or
    // before today.
    const latestDay = [...chain].reverse().find((e) => e.day <= today)?.day ?? first.day;
    focus = bestOn(latestDay);
    phase = focus.day === today ? (istHour(now) >= TODAY_PM_IST_HOUR ? "today-pm" : "today-am") : "window";
  } else if (daysAfterLast >= 1 && daysAfterLast <= NEAR_DAYS) {
    // An open-ended start row does not end the exam the next morning: the
    // shifts may still be running, and "the paper was held" is unknown.
    phase = lastDayOpen ? "window" : "post";
    openEnded = lastDayOpen;
    focus = last;
  }
  if (phase === "none") return NONE;

  const after = (kind: string) =>
    timeline
      .filter((r) => r.kind === kind && istDay(r.date) >= first.day)
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null;
  const nextStage = examDays.find((e) => dayDiff(last.day, e.day) > WINDOW_GAP_DAYS)?.row ?? null;

  return {
    phase,
    focus: focus.row,
    focusDay: focus.day,
    tier: focus.row.tier,
    daysTo: dayDiff(today, focus.day),
    windowEnd: last.row,
    windowDays: chain.map((w) => w.row),
    answerKey: after("ANSWER_KEY"),
    result: after("RESULT"),
    nextStage,
    openEnded,
  };
}

/** Human "date (tier)" fragment, e.g. "13 Sep (official)". Caller supplies the localised tier word. */
export function dateWithTier(row: TimelineRow, tierWord: string, locale: string = "en"): string {
  const d = new Date(row.date.getTime() + IST_OFFSET_MS);
  const day = d.toLocaleDateString(locale === "hi" ? "hi-IN" : locale === "te" ? "te-IN" : "en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${day} (${tierWord})`;
}
