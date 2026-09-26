// Shishya Pulse — the rules (27 Sep 2026).
//
// Why: the founder asked for Shishya to be recognised by the market slowly
// and honestly. Counters alone are divided away by press, institutions and
// investors; a weekly, dated, reproducible note on what students practised
// ("Shishya Pulse", /pulse and /pulse/{yyyy}-w{ww}) is a data hook that
// reporters can cite, with students as the subject and every number
// defined. This module is the pure half: IST ISO-week maths, the privacy
// gates every table passes through, the landing-page → section map, the
// exam-kind SQL twin and the archive list. No DB, no Next imports — safe in
// pages, route handlers, the sitemap and tests (tests/unit/pulse-rules.test.ts).
//
// Privacy (founder rule, 27 Sep 2026): aggregates only; no printed cell
// counts fewer than 20 mocks, answers, questions or sign-ups; exam and tutor
// rows also need at least 10 different people (a gate, never printed) so a
// row never describes a handful of people; smaller groups are merged or left
// out; only IST dates and week ranges, never times. Team accounts
// (ADMIN_EMAILS) are left out by the loader (src/lib/pulse.ts) and their
// number is never printed.
//
// The week helpers overlap src/lib/iso-week.ts and the gates overlap
// src/lib/public-stats.ts — both written in parallel on 27 Sep 2026 for
// /shishya-in-numbers. Bounds, slugs and labels are the same (Monday 00:00
// IST, "2026-w38", "31 Aug–6 Sep 2026"); Pulse keeps its own copy so neither
// page breaks while the other changes, and can re-export from them later.

import { ENTRANCE_EXCEPTION_CODES, STATE_CET_CODES, examKind, type ExamKind } from "@/lib/exam-kind";

// ── IST ISO weeks ─────────────────────────────────────────────────────

export const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** One ISO week in India time: Monday 00:00 IST to the next Monday 00:00 IST.
 *  Plain strings and numbers only, so it survives unstable_cache and JSON. */
export interface PulseWeek {
  /** ISO week-numbering year (the year of the week's Thursday). */
  year: number;
  /** ISO week number, 1-53. */
  week: number;
  /** URL slug, "2026-w38". */
  slug: string;
  /** Monday 00:00 IST as an instant (Sunday 18:30Z), ISO string. */
  startIso: string;
  /** The next Monday 00:00 IST (exclusive end), ISO string. */
  endIso: string;
  /** IST calendar day of the Monday, YYYY-MM-DD. */
  startDay: string;
  /** IST calendar day of the Sunday, YYYY-MM-DD. */
  endDay: string;
  /** "14–20 Sep 2026" / "28 Sep–4 Oct 2026" / "28 Dec 2026–3 Jan 2027". */
  label: string;
}

/** IST calendar-day number (days since 1970-01-01 in IST) of an instant. */
export function istDayNum(ms: number): number {
  return Math.floor((ms + IST_OFFSET_MS) / DAY_MS);
}

/** ISO weekday of a day number: Monday = 1 … Sunday = 7 (day 0 was a Thursday). */
function isoWeekday(dayNum: number): number {
  return ((((dayNum + 3) % 7) + 7) % 7) + 1;
}

/** YYYY-MM-DD of a day number. */
export function dayNumToIso(dayNum: number): string {
  return new Date(dayNum * DAY_MS).toISOString().slice(0, 10);
}

/** "20 Sep 2026" of a day number. */
function dayNumLabel(dayNum: number, withYear: boolean): string {
  const d = new Date(dayNum * DAY_MS);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}${withYear ? ` ${d.getUTCFullYear()}` : ""}`;
}

/** "27 Sep 2026" — an IST calendar day (YYYY-MM-DD) in words. */
export function istDayLabel(isoDay: string): string {
  const [y, m, d] = isoDay.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** YYYY-MM-DD of the IST calendar day of an instant. */
export function istIsoDay(at: Date): string {
  return dayNumToIso(istDayNum(at.getTime()));
}

/** "14–20 Sep 2026" / "28 Sep–4 Oct 2026" / "28 Dec 2026–3 Jan 2027" for
 *  the IST days `fromNum` to `toNum` (inclusive) — the same form as
 *  src/lib/iso-week.ts, so both public pages print a week alike. */
export function dayRangeLabel(fromNum: number, toNum: number): string {
  const a = new Date(fromNum * DAY_MS);
  const b = new Date(toNum * DAY_MS);
  if (a.getUTCFullYear() !== b.getUTCFullYear()) return `${dayNumLabel(fromNum, true)}–${dayNumLabel(toNum, true)}`;
  if (a.getUTCMonth() !== b.getUTCMonth()) return `${dayNumLabel(fromNum, false)}–${dayNumLabel(toNum, true)}`;
  return `${a.getUTCDate()}–${dayNumLabel(toNum, true)}`;
}

/** The week label from its Monday. */
export function weekRangeLabel(mondayNum: number): string {
  return dayRangeLabel(mondayNum, mondayNum + 6);
}

export function pulseWeekSlug(year: number, week: number): string {
  return `${year}-w${String(week).padStart(2, "0")}`;
}

function weekFromMonday(mondayNum: number): PulseWeek {
  const thursday = mondayNum + 3;
  const year = new Date(thursday * DAY_MS).getUTCFullYear();
  const jan1 = Date.UTC(year, 0, 1) / DAY_MS;
  const week = Math.floor((thursday - jan1) / 7) + 1;
  return {
    year,
    week,
    slug: pulseWeekSlug(year, week),
    startIso: new Date(mondayNum * DAY_MS - IST_OFFSET_MS).toISOString(),
    endIso: new Date((mondayNum + 7) * DAY_MS - IST_OFFSET_MS).toISOString(),
    startDay: dayNumToIso(mondayNum),
    endDay: dayNumToIso(mondayNum + 6),
    label: weekRangeLabel(mondayNum),
  };
}

function mondayNumOf(w: PulseWeek): number {
  return Date.parse(`${w.startDay}T00:00:00Z`) / DAY_MS;
}

/** "24 Aug–20 Sep 2026": the days from the Monday of `from` to the Sunday of `to`. */
export function pulseWeeksLabel(from: PulseWeek, to: PulseWeek): string {
  return dayRangeLabel(mondayNumOf(from), mondayNumOf(to) + 6);
}

/** The IST ISO week containing an instant. */
export function pulseWeekOf(at: Date): PulseWeek {
  const day = istDayNum(at.getTime());
  return weekFromMonday(day - (isoWeekday(day) - 1));
}

/** The week `n` weeks after (negative: before) `w`. */
export function shiftPulseWeek(w: PulseWeek, n: number): PulseWeek {
  return weekFromMonday(mondayNumOf(w) + 7 * n);
}

/** Week `week` of ISO year `year`, or null when that week does not exist
 *  (week 53 of a 52-week year, week 0, …). */
export function pulseWeekFromParts(year: number, week: number): PulseWeek | null {
  if (!Number.isInteger(year) || !Number.isInteger(week) || week < 1 || week > 53) return null;
  const jan4 = Date.UTC(year, 0, 4) / DAY_MS;
  const monday1 = jan4 - (isoWeekday(jan4) - 1);
  const w = weekFromMonday(monday1 + 7 * (week - 1));
  return w.year === year && w.week === week ? w : null;
}

/** Strict slug parser: "2026-w38" only (lower-case w, two-digit week). */
export function parsePulseSlug(slug: string): PulseWeek | null {
  const m = /^(\d{4})-w(\d{2})$/.exec(slug);
  if (!m) return null;
  const year = Number(m[1]);
  if (year < 2000 || year > 2100) return null;
  return pulseWeekFromParts(year, Number(m[2]));
}

/** The last week that has fully ended at `now` (the week before the current one). */
export function lastCompletePulseWeek(now: Date): PulseWeek {
  return shiftPulseWeek(pulseWeekOf(now), -1);
}

/** Pulse starts with the week of 14-20 Sep 2026: the first week every
 *  section was measured (sign-up sources were fixed on 11 Sep; the exam
 *  kinds and the answer check landed 25-26 Sep and are read back). */
export const PULSE_FIRST_WEEK_SLUG = "2026-w38";

const FIRST = parsePulseSlug(PULSE_FIRST_WEEK_SLUG)!;
export const PULSE_FIRST_WEEK: PulseWeek = FIRST;

/** The published week for a slug, or null (malformed, before the first
 *  week, the current week or the future) — the page answers 404. */
export function resolvePulseWeek(slug: string, now: Date): PulseWeek | null {
  const w = parsePulseSlug(slug);
  if (!w) return null;
  if (w.startIso < FIRST.startIso) return null;
  if (Date.parse(w.endIso) > now.getTime()) return null;
  return w;
}

/** Every published week, newest first (empty before the first week ends). */
export function pulseArchiveWeeks(now: Date): PulseWeek[] {
  const out: PulseWeek[] = [];
  let w = lastCompletePulseWeek(now);
  while (w.startIso >= FIRST.startIso && out.length < 1000) {
    out.push(w);
    w = shiftPulseWeek(w, -1);
  }
  return out;
}

/** 27 Sep 2026 (integrator): the sitemap rows for every published week.
 *  `now` only decides which weeks exist; lastModified is the fixed Monday
 *  00:00 IST the week was published, never the crawl time. It lives here so
 *  src/app/sitemap.ts keeps no clock read (tests/unit/school-surface.test.ts
 *  pins that). */
export function pulseSitemapEntries(
  base: string,
  now: Date = new Date(),
): { url: string; lastModified: Date; changeFrequency: "yearly"; priority: number }[] {
  return pulseArchiveWeeks(now).map((w) => ({
    url: `${base}/pulse/${w.slug}`,
    lastModified: new Date(w.endIso),
    changeFrequency: "yearly" as const,
    priority: 0.5,
  }));
}

/** The latest published week, or null before the first one has ended. */
export function latestPulseWeek(now: Date): PulseWeek | null {
  return pulseArchiveWeeks(now)[0] ?? null;
}

// ── Gates ─────────────────────────────────────────────────────────────

/** No printed count is below this (mocks, answers, questions, sign-ups). */
export const PULSE_K = 20;
/** An exam or tutor row also needs this many different people (never printed). */
export const PULSE_MIN_PEOPLE = 10;
/** A topic needs this many different people. */
export const PULSE_TOPIC_MIN_PEOPLE = 20;
/** A "hardest topic" needs this many answers. */
export const PULSE_HARD_MIN_ANSWERS = 200;
/** The hardest-topics table is printed only when at least this many topics
 *  pass the gate. 27 Sep 2026 (fixer review): week 38's window had one
 *  (Geography of India, 78.7% correct) — calling the only qualifying topic
 *  "the hardest" is not a finding, and week pages are permanent. */
export const PULSE_HARD_MIN_TOPICS = 3;
/** Topic and tutor tables read this many weeks, ending with the Pulse week:
 *  no topic reaches 20 different people in a single week at today's scale. */
export const PULSE_WINDOW_WEEKS = 4;
/** The week line's sparklines cover this many weeks, ending with the Pulse week. */
export const PULSE_SPARK_WEEKS = 8;
/** Longest tables. */
export const PULSE_TOPIC_ROWS = 12;
export const PULSE_HARD_ROWS = 8;
export const PULSE_EXAM_ROWS = 15;

/** A count as printed: the number, or null ("fewer than 20"). */
export function gatedCount(n: number | null | undefined): number | null {
  return typeof n === "number" && Number.isFinite(n) && n >= PULSE_K ? n : null;
}

export interface ExamMockRaw {
  code: string;
  name: string;
  /** ExamCategory (for the kind table's differencing guard; never printed). */
  category?: string;
  mocks: number;
  people: number;
  prevMocks: number;
  prevPeople: number;
}
export interface ExamMockRow {
  code: string;
  name: string;
  mocks: number;
  /** The week before, printed only when that week also passed the gate. */
  prevMocks: number | null;
}

const passesExamGate = (mocks: number, people: number) => mocks >= PULSE_K && people >= PULSE_MIN_PEOPLE;

/** Most-taken mocks: exams with 20+ mocks from 10+ people; people never leave. */
export function gateExamMocks(rows: readonly ExamMockRaw[]): ExamMockRow[] {
  return rows
    .filter((r) => passesExamGate(r.mocks, r.people))
    .map((r) => ({ code: r.code, name: r.name, mocks: r.mocks, prevMocks: passesExamGate(r.prevMocks, r.prevPeople) ? r.prevMocks : null }))
    .sort((a, b) => b.mocks - a.mocks || a.code.localeCompare(b.code))
    .slice(0, PULSE_EXAM_ROWS);
}

export interface GroupRaw {
  key: string;
  label: string;
  n: number;
  /** Distinct people in the group (a gate; never printed). Omit for groups
   *  whose unit already is a person (sign-ups). */
  people?: number;
}
export interface GroupRow {
  /** Keys of the groups inside, bigger groups first. */
  keys: string[];
  /** Labels of the groups inside, bigger groups first. */
  labels: string[];
  n: number;
  merged: boolean;
}

interface Part {
  key: string;
  label: string;
  n: number;
}
interface Working {
  parts: Part[];
  n: number;
  people: number;
}

function toRow(w: Working): GroupRow {
  const parts = [...w.parts].sort((a, b) => b.n - a.n || a.key.localeCompare(b.key));
  return { keys: parts.map((p) => p.key), labels: parts.map((p) => p.label), n: w.n, merged: parts.length > 1 };
}

/** Exact distinct people of a set of group keys, when the caller counted it
 *  (undefined = not known). */
export type PeopleOfKeys = (keys: readonly string[]) => number | undefined;

/** A stable key for a set of group keys ("entrance+olympiad"). */
export function keySetId(keys: readonly string[]): string {
  return [...keys].sort().join("+");
}

function mergeTwo(a: Working, b: Working, peopleOf?: PeopleOfKeys): Working {
  const parts = [...a.parts, ...b.parts];
  const exact = peopleOf?.(parts.map((p) => p.key));
  return {
    parts,
    n: a.n + b.n,
    // Without an exact count, the distinct people of a union is at least the
    // larger side: a lower bound, so a merged group never looks more
    // populous than it is.
    people: typeof exact === "number" && Number.isFinite(exact) ? exact : Math.max(a.people, b.people),
  };
}

const byRowOrder = (a: GroupRow, b: GroupRow) => b.n - a.n || a.keys[0].localeCompare(b.keys[0]);

/** Merge the smallest failing group into the next-smallest until every group
 *  has at least `minN` (and `minPeople` people). A lone failing group is
 *  dropped: nothing under the floor is printed. Bigger groups first.
 *  `peopleOf` gives the exact people of a merged set when the caller has it. */
export function mergeSmallGroups(groups: readonly GroupRaw[], minN: number = PULSE_K, minPeople = 0, peopleOf?: PeopleOfKeys): GroupRow[] {
  let work: Working[] = groups
    .filter((g) => g.n > 0)
    .map((g) => ({ parts: [{ key: g.key, label: g.label, n: g.n }], n: g.n, people: g.people ?? g.n }));
  const fails = (g: Working) => g.n < minN || g.people < minPeople;
  for (let guard = 0; guard < 1000; guard++) {
    work.sort((a, b) => a.n - b.n || a.people - b.people || a.parts[0].key.localeCompare(b.parts[0].key));
    const i = work.findIndex(fails);
    if (i < 0) break;
    if (work.length === 1) return [];
    const j = i === 0 ? 1 : 0;
    const merged = mergeTwo(work[i], work[j], peopleOf);
    work = work.filter((_, k) => k !== i && k !== j);
    work.push(merged);
  }
  return work.map(toRow).sort(byRowOrder);
}

/** Differencing guard: when rows of another printed table fall inside a
 *  group (exam rows inside an exam-kind group), the rest of the group —
 *  group total minus those rows — must be 0 or at least 20, or it could be
 *  read off as a small count. A failing group is merged with the next
 *  smallest; when one group is left the table is dropped (the week's total
 *  is printed elsewhere). `sizeByKey` gives each key's own size so merged
 *  labels keep bigger groups first. */
export function guardResiduals(
  groups: readonly GroupRow[],
  printedByKey: Readonly<Record<string, number>>,
  sizeByKey: Readonly<Record<string, number>> = {},
): GroupRow[] {
  let work: Working[] = groups.map((g) => ({
    parts: g.keys.map((k, i) => ({ key: k, label: g.labels[i], n: sizeByKey[k] ?? 0 })),
    n: g.n,
    people: 0,
  }));
  const residual = (g: Working) => g.n - g.parts.reduce((s, p) => s + (printedByKey[p.key] ?? 0), 0);
  const bad = (g: Working) => {
    const r = residual(g);
    return r > 0 && r < PULSE_K;
  };
  for (let guard = 0; guard < 1000; guard++) {
    const i = work.findIndex(bad);
    if (i < 0) break;
    if (work.length === 1) return [];
    const j = work
      .map((g, k) => ({ g, k }))
      .filter((x) => x.k !== i)
      .sort((a, b) => a.g.n - b.g.n)[0].k;
    const merged = mergeTwo(work[i], work[j]);
    work = work.filter((_, k) => k !== i && k !== j);
    work.push(merged);
  }
  return work.length > 1 ? work.map(toRow).sort(byRowOrder) : [];
}

// ── Exam kinds (mocks by kind) ────────────────────────────────────────

export type PulseKind = ExamKind | "school";

export const PULSE_KIND_LABEL: Record<PulseKind, string> = {
  government: "Government recruitment exams",
  entrance: "Entrance exams",
  olympiad: "Olympiads",
  professional: "Professional exams (CA, CS)",
  school: "School chapters",
};

/** ExamCategory values examKind() files as entrance (src/lib/exam-kind.ts;
 *  the test pins this list against examKind for every category). */
export const ENTRANCE_CATEGORY_VALUES: readonly string[] = ["ENGINEERING", "MEDICAL", "LAW", "MBA", "UNIVERSITY"];

const SQL_CODE = /^[A-Z0-9_]+$/;
const sqlList = (codes: readonly string[]) => {
  for (const c of codes) if (!SQL_CODE.test(c)) throw new Error(`pulse-rules: bad code ${JSON.stringify(c)}`);
  return codes.map((c) => `'${c}'`).join(", ");
};

/** The SQL twin of examKind() (plus "school" for SCHOOL_BOARD) over the
 *  exam aliased `alias`, built from exam-kind.ts's own lists. */
export function examKindSqlCase(alias = "e"): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(alias)) throw new Error(`pulse-rules: bad alias ${JSON.stringify(alias)}`);
  const code = `${alias}."code"`;
  const cat = `${alias}."category"::text`;
  return [
    "CASE",
    `WHEN ${cat} = 'SCHOOL_BOARD' THEN 'school'`,
    `WHEN ${code} IN (${sqlList([...ENTRANCE_EXCEPTION_CODES, ...STATE_CET_CODES])}) THEN 'entrance'`,
    `WHEN ${cat} IN (${sqlList(ENTRANCE_CATEGORY_VALUES)}) THEN 'entrance'`,
    `WHEN ${cat} = 'OLYMPIAD' THEN 'olympiad'`,
    `WHEN ${cat} = 'OTHER' THEN 'professional'`,
    "ELSE 'government' END",
  ].join(" ");
}

/** The JS mirror of examKindSqlCase (tests compare both with examKind). */
export function pulseKindOf(e: { code: string; category?: string | null }): PulseKind {
  return String(e.category ?? "").toUpperCase() === "SCHOOL_BOARD" ? "school" : examKind(e);
}

// ── Topics ────────────────────────────────────────────────────────────

export interface TopicRaw {
  examCode: string;
  examName: string;
  topicCode: string;
  topicName: string;
  answers: number;
  correct: number;
  people: number;
}
export interface TopicRow {
  examCode: string;
  examName: string;
  topicCode: string;
  topicName: string;
  answers: number;
  /** Share of answers correct, 0-100, one decimal (hardest table only). */
  sharePct: number | null;
}

const topicKey = (r: TopicRaw) => `${r.examCode}\u0000${r.topicCode}`;

/** Most-practised topics: 20+ different people and 20+ answers; by answers. */
export function gatePractisedTopics(rows: readonly TopicRaw[]): TopicRow[] {
  return rows
    .filter((r) => r.people >= PULSE_TOPIC_MIN_PEOPLE && r.answers >= PULSE_K)
    .sort((a, b) => b.answers - a.answers || topicKey(a).localeCompare(topicKey(b)))
    .slice(0, PULSE_TOPIC_ROWS)
    .map((r) => ({ examCode: r.examCode, examName: r.examName, topicCode: r.topicCode, topicName: r.topicName, answers: r.answers, sharePct: null }));
}

/** Hardest topics: 200+ answers from 20+ people; lowest share correct first.
 *  Empty unless at least PULSE_HARD_MIN_TOPICS topics pass (27 Sep 2026). */
export function gateHardestTopics(rows: readonly TopicRaw[]): TopicRow[] {
  const passing = rows.filter(
    (r) => r.people >= PULSE_TOPIC_MIN_PEOPLE && r.answers >= PULSE_HARD_MIN_ANSWERS && r.correct >= 0 && r.correct <= r.answers,
  );
  if (passing.length < PULSE_HARD_MIN_TOPICS) return [];
  return passing
    .map((r) => ({ r, share: r.correct / r.answers }))
    .sort((a, b) => a.share - b.share || b.r.answers - a.r.answers || topicKey(a.r).localeCompare(topicKey(b.r)))
    .slice(0, PULSE_HARD_ROWS)
    .map(({ r, share }) => ({
      examCode: r.examCode,
      examName: r.examName,
      topicCode: r.topicCode,
      topicName: r.topicName,
      answers: r.answers,
      sharePct: Math.round(share * 1000) / 10,
    }));
}

// ── AI tutor by exam ──────────────────────────────────────────────────

/** Bucket names the tutor query uses for questions without a real exam. */
export const TUTOR_GENERAL_BUCKET = "(general)";
export const TUTOR_SCHOOL_BUCKET = "(school)";
export const TUTOR_OTHER_BUCKET = "(other)";

export interface TutorRaw {
  bucket: string;
  name: string | null;
  questions: number;
  people: number;
}
export interface TutorRow {
  /** Exam code, or null for the general / school rows. */
  code: string | null;
  label: string;
  questions: number;
}

/** Tutor questions by exam scope: 20+ questions from 10+ people. The
 *  "(other)" bucket (an exam no longer listed) is never printed. */
export function gateTutorByExam(rows: readonly TutorRaw[]): TutorRow[] {
  return rows
    .filter((r) => r.bucket !== TUTOR_OTHER_BUCKET && r.questions >= PULSE_K && r.people >= PULSE_MIN_PEOPLE)
    .map((r) => ({
      code: r.bucket === TUTOR_GENERAL_BUCKET || r.bucket === TUTOR_SCHOOL_BUCKET ? null : r.bucket,
      label:
        r.bucket === TUTOR_GENERAL_BUCKET
          ? "No exam chosen (general questions)"
          : r.bucket === TUTOR_SCHOOL_BUCKET
            ? "School chapters (all classes)"
            : r.name ?? r.bucket,
      questions: r.questions,
    }))
    .sort((a, b) => b.questions - a.questions || a.label.localeCompare(b.label))
    .slice(0, PULSE_EXAM_ROWS);
}

// ── Sign-ups by section of the first page ─────────────────────────────

export type PulseSection = "school" | "entrance" | "government" | "exams-general" | "colleges" | "careers" | "other";

export const PULSE_SECTION_LABEL: Record<PulseSection, string> = {
  school: "School pages",
  entrance: "Entrance exam and olympiad pages",
  government: "Government exam pages",
  "exams-general": "Exam lists, calendar and mock-test pages",
  colleges: "Colleges and scholarships",
  careers: "Careers and jobs",
  other: "Home, sign-in, AI tutor and other pages",
};

/** The section of a first landing path. `categoryByCode` maps exam codes to
 *  their ExamCategory, so /exams/{CODE}/… splits by examKind. A missing
 *  path (no first page view on record) is "other". */
export function pulseSectionOfPath(path: string | null | undefined, categoryByCode: ReadonlyMap<string, string>): PulseSection {
  if (!path) return "other";
  const clean = path.split("?")[0].split("#")[0];
  const bare = clean.replace(/^\/(hi|te)(?=\/|$)/, "") || "/";
  const seg = bare.split("/").filter(Boolean);
  const first = seg[0] ?? "";
  if (first === "schooling") return "school";
  if (first === "colleges" || first === "scholarships" || first === "post-graduation" || first === "distance-learning" || first === "worldwide") return "colleges";
  if (first === "careers" || first === "career-map" || first === "jobs" || first === "jobs-map" || first === "soft-skills") return "careers";
  if (first === "exams") {
    const second = seg[1] ?? "";
    if (second === "entrance") return "entrance";
    if (second === "state") return "government";
    if (!second || second === "browse" || second === "category" || second === "after") return "exams-general";
    const cat = categoryByCode.get(second) ?? categoryByCode.get(second.toUpperCase());
    if (!cat) return "exams-general";
    const kind = pulseKindOf({ code: second.toUpperCase(), category: cat });
    if (kind === "entrance" || kind === "olympiad") return "entrance";
    if (kind === "government") return "government";
    if (kind === "school") return "school";
    return "exams-general";
  }
  if (first === "current-affairs") return "government";
  if (
    first === "exam-calendar" ||
    first === "find-your-exam" ||
    first === "mocks" ||
    first === "mock-tests" ||
    first === "live-test" ||
    first === "subjects" ||
    first === "results" ||
    first === "c" ||
    first === "g"
  )
    return "exams-general";
  return "other";
}

/** Sign-ups by section, merged so every printed group has 20+. */
export function gateSignupSections(counts: readonly { section: PulseSection; n: number }[]): GroupRow[] {
  const bySection = new Map<PulseSection, number>();
  for (const c of counts) bySection.set(c.section, (bySection.get(c.section) ?? 0) + c.n);
  return mergeSmallGroups(
    [...bySection].map(([section, n]) => ({ key: section, label: PULSE_SECTION_LABEL[section], n })),
    PULSE_K,
  );
}

// ── Official exam dates ───────────────────────────────────────────────

/** A tracker row whose own label says "expected" is not printed as
 *  official, whatever its stored confidence (27 Sep 2026: RRB NTPC
 *  "CBTST exam (CEN 06/2025, expected)" and "UCEED 2027 Notification
 *  (expected)" were stored as official). */
export function labelSaysExpected(label: string): boolean {
  return /\bexpected\b|\btentative\b|\blikely\b/i.test(label);
}
