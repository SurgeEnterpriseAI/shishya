// ISO weeks in India Standard Time (27 Sep 2026).
//
// Why: the transparency pages (/shishya-in-numbers, /pulse) report by week,
// and Shishya's students live on IST. A week here is an ISO-8601 week of the
// IST calendar: Monday 00:00 IST (Sunday 18:30 UTC) to the next Monday
// 00:00 IST. Postgres buckets the same way with
// date_trunc('week', ts + interval '330 minutes') — ISO weeks start on
// Monday — so a SQL bucket's Monday date maps to exactly one IsoWeek here
// (weekFromMondayDay).
//
// Slugs look like "2026-w39"; labels like "14–20 Sep 2026". Only complete
// weeks are ever published (lastCompleteWeek): a week still in progress
// would print a number that is about to change.
//
// Every field is a string or a number (no Date), so an IsoWeek survives
// unstable_cache's JSON round trip unchanged.
//
// Pure: no DB, no Next imports (tests/unit/iso-week.test.ts).

export const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;

/** Fixed English month abbreviations — Intl's en-GB prints "Sept" on newer ICU. */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export interface IsoWeek {
  /** ISO week-numbering year (can differ from the calendar year at New Year). */
  year: number;
  /** 1-53. */
  week: number;
  /** "2026-w39" (week zero-padded to two digits). */
  slug: string;
  /** Monday 00:00 IST as an ISO instant ("2026-09-20T18:30:00.000Z"). */
  start: string;
  /** The next Monday 00:00 IST (exclusive end), ISO instant. */
  end: string;
  /** Monday's IST calendar day, "YYYY-MM-DD". */
  startDay: string;
  /** Sunday's IST calendar day, "YYYY-MM-DD". */
  endDay: string;
  /** "21–27 Sep 2026", "31 Aug–6 Sep 2026", "29 Dec 2025–4 Jan 2026". */
  label: string;
}

/** "YYYY-MM-DD" of an instant in IST. */
export function istDayString(d: Date): string {
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** "2026-09-27" → "27 Sep 2026"; anything that is not a "YYYY-MM-DD" day
 *  comes back unchanged. */
export function istDayLabel(day: string): string {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(day)) return day;
  const [y, m, d] = day.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** "29 Aug–27 Sep 2026" (year once when both days share it). */
export function istDayRangeLabel(from: string, to: string): string {
  const a = istDayLabel(from);
  const b = istDayLabel(to);
  return from.slice(0, 4) === to.slice(0, 4) ? `${a.replace(/ [0-9]{4}$/, "")}–${b}` : `${a}–${b}`;
}

/** UTC-midnight Date of a "YYYY-MM-DD" calendar day (the day's own number line). */
function dayDate(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function dayOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The ISO (year, week) of a calendar day. */
function isoYearWeekOfDay(day: string): { year: number; week: number } {
  const date = dayDate(day);
  const dow = (date.getUTCDay() + 6) % 7; // Monday = 0
  const thursday = new Date(date.getTime() + (3 - dow) * DAY_MS);
  const year = thursday.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week1Monday = jan4.getTime() - ((jan4.getUTCDay() + 6) % 7) * DAY_MS;
  const week = 1 + Math.floor((thursday.getTime() - week1Monday) / (7 * DAY_MS));
  return { year, week };
}

/** Monday (calendar day) of ISO week (year, week). */
function mondayOf(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week1Monday = jan4.getTime() - ((jan4.getUTCDay() + 6) % 7) * DAY_MS;
  return new Date(week1Monday + (week - 1) * 7 * DAY_MS);
}

/** 52 or 53. */
export function weeksInIsoYear(year: number): number {
  return isoYearWeekOfDay(`${year}-12-28`).week;
}

function label(monday: Date, sunday: Date): string {
  const d1 = monday.getUTCDate();
  const d2 = sunday.getUTCDate();
  const m1 = MONTHS[monday.getUTCMonth()];
  const m2 = MONTHS[sunday.getUTCMonth()];
  const y1 = monday.getUTCFullYear();
  const y2 = sunday.getUTCFullYear();
  if (y1 !== y2) return `${d1} ${m1} ${y1}–${d2} ${m2} ${y2}`;
  if (m1 !== m2) return `${d1} ${m1}–${d2} ${m2} ${y2}`;
  return `${d1}–${d2} ${m2} ${y2}`;
}

/** The IsoWeek (year, week). Throws on an impossible week number. */
export function isoWeek(year: number, week: number): IsoWeek {
  if (!Number.isInteger(year) || !Number.isInteger(week) || week < 1 || week > weeksInIsoYear(year)) {
    throw new Error(`iso-week: no week ${week} in ${year}`);
  }
  const monday = mondayOf(year, week);
  const sunday = new Date(monday.getTime() + 6 * DAY_MS);
  const startMs = monday.getTime() - IST_OFFSET_MS;
  return {
    year,
    week,
    slug: `${year}-w${String(week).padStart(2, "0")}`,
    start: new Date(startMs).toISOString(),
    end: new Date(startMs + 7 * DAY_MS).toISOString(),
    startDay: dayOf(monday),
    endDay: dayOf(sunday),
    label: label(monday, sunday),
  };
}

/** The week an instant falls in (IST). */
export function weekOf(d: Date): IsoWeek {
  const { year, week } = isoYearWeekOfDay(istDayString(d));
  return isoWeek(year, week);
}

/** The week whose Monday is this IST calendar day — the Postgres bucket
 *  date_trunc('week', ts + interval '330 minutes')::date maps here. A day
 *  that is not a Monday maps to its own week. */
export function weekFromMondayDay(day: string | Date): IsoWeek {
  const s = typeof day === "string" ? day.slice(0, 10) : dayOf(day);
  const { year, week } = isoYearWeekOfDay(s);
  return isoWeek(year, week);
}

/** "2026-w39" → the week; null when malformed or impossible (w00, w54). */
export function parseWeekSlug(slug: string): IsoWeek | null {
  const m = /^(\d{4})-w(\d{2})$/.exec(slug);
  if (!m) return null;
  const year = Number(m[1]);
  const week = Number(m[2]);
  if (week < 1 || week > weeksInIsoYear(year)) return null;
  return isoWeek(year, week);
}

/** The week `delta` weeks after (negative: before) `w`. */
export function addWeeks(w: IsoWeek, delta: number): IsoWeek {
  const monday = dayDate(w.startDay).getTime() + delta * 7 * DAY_MS;
  return weekFromMondayDay(dayOf(new Date(monday)));
}

/** Negative when a is before b, 0 when equal. */
export function compareWeeks(a: IsoWeek, b: IsoWeek): number {
  return a.startDay < b.startDay ? -1 : a.startDay > b.startDay ? 1 : 0;
}

/** The last week that has fully ended by `now` (IST): the week before the
 *  one `now` falls in. */
export function lastCompleteWeek(now: Date = new Date()): IsoWeek {
  return addWeeks(weekOf(now), -1);
}

/** `n` consecutive weeks ending with `last` (inclusive), oldest first. */
export function weeksBack(last: IsoWeek, n: number): IsoWeek[] {
  const out: IsoWeek[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addWeeks(last, -i));
  return out;
}

/** Every week from `first` to `last` inclusive, oldest first (empty when
 *  first is after last). */
export function weeksBetween(first: IsoWeek, last: IsoWeek): IsoWeek[] {
  const out: IsoWeek[] = [];
  for (let w = first; compareWeeks(w, last) <= 0; w = addWeeks(w, 1)) out.push(w);
  return out;
}
