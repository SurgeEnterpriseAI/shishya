// The rules behind Shishya's public numbers (27 Sep 2026) — pure half.
//
// Why: /shishya-in-numbers publishes every number the market (press,
// institutions, investors) might quote about Shishya, each with its exact
// definition and date. Founder strategy (27 Sep 2026): counters alone are not
// the story — the credible numbers are cohort return rates, 30-day actives,
// mocks per active account, the referrer-verified sign-up share and what the
// answer check changed. This file holds everything about those numbers that
// needs no database: the definitions (one sentence each, printed on the page
// and in context.md), which weeks each number covers, and the builders that
// turn raw grouped rows into PublicNumber objects. src/lib/public-numbers.ts
// runs the SQL and calls these builders; /press imports the result read-only.
//
// Rules this file keeps (tests/unit/public-numbers-rules.test.ts):
//   • every PublicNumber has a non-empty definition and an IST as-of day;
//   • only complete ISO weeks (IST, Monday–Sunday) are ever reported;
//   • a cohort is reported only once its whole window has passed;
//   • activity means a person did something: a signed-in analytics event not
//     tagged as a bot, a mock started, a mock submitted or auto-submitted, or
//     a question to the AI tutor. The nightly cleanup job stamps a finish
//     time on the ABANDONED attempts it closes — that is not activity (27 Sep
//     2026 probe: counting it put the 7-day return at ~45% instead of ~29%);
//   • team accounts (ADMIN_EMAILS) are left out of every per-account number,
//     and how many there are is never printed;
//   • no statistic is typed here — only the dates the data's rules changed.
//
// Pure: no DB, no Next imports.

import { DEFAULT_CONFIG } from "@/lib/ai/factory/types";
import { SITE_URL } from "@/lib/site-description";
import {
  type IsoWeek,
  addWeeks,
  compareWeeks,
  istDayLabel,
  istDayRangeLabel,
  istDayString,
  lastCompleteWeek,
  parseWeekSlug,
  weekFromMondayDay,
  weeksBack,
} from "@/lib/iso-week";
import {
  K_MIN,
  SUPPRESSED,
  formatInt,
  formatPct,
  mergeSmallBuckets,
  publishable,
  share,
  shareCell,
  subsetPublishable,
  type Bucket,
  type MergedBucket,
} from "@/lib/public-stats";
import { SOURCE_FAMILIES, SOURCE_FAMILY_LABEL, type SourceFamily } from "@/lib/source-family";

// ── Shape ─────────────────────────────────────────────────────────────

export interface PublicNumber<T> {
  /** Stable id — the page anchor (#came-back-7-days) and the context.md key. */
  id: string;
  /** Short plain label. */
  label: string;
  value: T;
  /** One honest sentence: exactly what is counted. */
  definition: string;
  /** IST calendar day the number was computed, "YYYY-MM-DD". */
  asOf: string;
  /** The period covered, in words ("sign-up weeks 17 Aug–13 Sep 2026", "all time"). */
  period: string;
  /** The tables read. */
  source: string;
}

export interface PooledShare {
  num: number;
  den: number;
  /** Week slugs pooled, oldest first. */
  weeks: string[];
}

export interface CountOf {
  num: number;
  den: number;
}

// ── Dates the data's rules changed (not statistics) ───────────────────

/** First week whose "people who came" is comparable with today's: the
 *  identity rules changed on 31 Jul and 16 Aug 2026 (the gap-era overlap
 *  in src/lib/live-counts-server.ts ends 16 Aug 17:00 UTC). */
export const PEOPLE_FIRST_WEEK = "2026-w34";

/** First week whose sign-ups carry a first-visit source for (nearly)
 *  everyone: before the 11 Sep 2026 attribution fix, 25–37% of each week's
 *  sign-ups had no recorded source. The week of 14 Sep 2026. */
export const SIGNUP_SOURCE_FIRST_WEEK = "2026-w38";

/** The day the analytics ingest began giving an identity to visitors who
 *  arrive on a tagged link (utm_source) — see HUMAN_RULE_HAVING. */
export const TAGGED_IDENTITY_FROM_DAY = "2026-09-18";

/** How many closed weeks the tables show. */
export const TABLE_WEEKS = 8;
/** How many weeks a pooled headline covers. */
export const POOLED_WEEKS = 4;

// ── The human rule, shared with the "people who came" counter ─────────

/** The uniqueVisitors HAVING clause of src/lib/live-counts-server.ts, word
 *  for word (whitespace aside). tests/unit/public-numbers-rules.test.ts
 *  fails the moment the counter's rule changes, so the weekly column can
 *  never drift from the all-time counter. When the counter gains the
 *  tagged-link clause (27 Sep 2026 recommendation), update this string and
 *  the tagged-link footnote disappears on its own. */
export const HUMAN_RULE_HAVING = `HAVING COUNT(*) >= 2 OR (bool_or("refHost" IS NOT NULL) AND COUNT(*) = 1) OR (COUNT(*) = 1 AND bool_or("utmSource" IS NOT NULL))`;

/** True while the counter's human rule leaves out single-page visitors who
 *  arrived on a tagged link with no referrer. */
export function humanRuleMissesTaggedSinglePage(rule: string = HUMAN_RULE_HAVING): boolean {
  return !/utmSource/.test(rule);
}

// ── Definitions (printed on the page and in context.md) ───────────────

const ACTIVITY =
  "signed-in activity (a signed-in analytics event not tagged as a bot, a mock started, a mock submitted or auto-submitted, or a question to the AI tutor; the nightly cleanup job's closing of abandoned mocks is not activity)";

export const DEFINITIONS = {
  cameBack7: `Of the accounts created in the sign-up weeks shown, the share with ${ACTIVITY} on any of the 7 IST days after their sign-up day. Team accounts are left out. It is a floor: someone who comes back signed out is not seen.`,
  cameBack8to30: `Of the accounts created in the sign-up weeks shown, the share with ${ACTIVITY} on IST days 8 to 30 after their sign-up day. Shown pooled only, because most single weeks have fewer than ${K_MIN} such returners. Team accounts are left out.`,
  cohortWeekly: `The 7-day rule above for each ISO sign-up week (IST, Monday to Sunday). A week appears once its last sign-up's 7 days have passed. A share is printed only when the returners and the sign-ups are both at least ${K_MIN}.`,
  // 27 Sep 2026 (fixer review): the headline is the strict figure. Creating an
  // account writes a signed-in SIGNUP event, so under the plain rule every
  // account created in the window counts as active just for signing up
  // (717 of the 821 on 27 Sep) — the vanity reading the founder's strategy
  // warns against.
  active30: `Accounts with ${ACTIVITY} on any of the last 30 IST days (today included), as a share of all accounts. Creating an account is itself a signed-in event, so an account created in those 30 days counts here just for signing up. Team accounts are left out.`,
  active30AfterSignup: `Accounts with ${ACTIVITY} on any of the last 30 IST days (today included) that is not the account's own sign-up day, as a share of all accounts. Signing up alone does not count. Team accounts are left out.`,
  mocksPerActive: `Mocks taken in the week (submitted or auto-submitted, by finish time) divided by the accounts with ${ACTIVITY} that week; the second figure divides by the accounts that took at least one mock. Team accounts are left out.`,
  signupSources: `For each account created in the weeks shown, the source of its browser's first page view on Shishya: the sign-up's browser id is linked to that browser's first page view; failing that, the sign-up event's own tag or referrer; failing that, the referrer stored on the account. A tracking tag (utm_source) wins over a referrer. 'Named source' means that first visit carried a tag or a referrer naming where it came from. Groups under ${K_MIN} are merged, and the 'Named source' and AI-assistant lines are left out when printing them would give back a merged group by subtraction. Team accounts are left out.`,
  newPeople: `People (an account, or a first-party browser id) whose first page view falls in the weeks shown and who meet the 'people who came' rule of the all-time counter, grouped by the tag or referrer of that first view. Visitors with one page, no referrer and no tag have no identity and are not included, so this is not everyone who came. Groups under ${K_MIN} are merged. Team accounts are left out.`,
  weekly:
    "Each column is an all-time counter's own definition, counted per ISO week (IST, Monday 00:00 to Sunday 23:59). Team accounts are left out. The week in progress is not shown.",
  answerCheck:
    "From the answer-check record stored on each question. Checked = every question the check has a verdict for. Accepted as written = the examiner agreed with the stored key and the question is live. Key corrected = the check replaced the key and the question is live. Withdrawn = the check failed the question, so no practice pool serves it; questions that were not yet live are counted here too, so only the 'live before the check' rows show what the check took out of use. 'Live before the check' = the question was already being served when it was checked.",
  uncheckedLive:
    "Questions being served (validated, not withdrawn, on a live exam or a school chapter) that carry no answer-check pass: they were validated at insert or in bulk before the check existed.",
  reports: `Question reports students sent with the Report button, all time, and how many are marked closed. Printed only when both are at least ${K_MIN}.`,
} as const;

export const SOURCES = {
  activity: "User, AnalyticsEvent, Attempt, ChatMessage, ChatSession",
  signups: "User, AnalyticsEvent (SIGNUP and PAGE_VIEW)",
  newPeople: "AnalyticsEvent (PAGE_VIEW)",
  weekly: "User, Attempt, ChatMessage, ChatSession, AnonTutorLog, AnalyticsEvent",
  answerCheck: "Question (metadata.factoryVerify)",
  reports: "QuestionReport",
  counters: "src/lib/live-counts-server.ts (getLiveCounts)",
  coverage: "Exam, Question, TopicTeachingNote, OfficialPaper, OfficialCutoff, ExamImportantDate, the school surface and the data files",
} as const;

// ── Windows ───────────────────────────────────────────────────────────

/** "YYYY-MM-DD" plus n days. */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + n * 86_400_000).toISOString().slice(0, 10);
}

/** The latest sign-up week whose every member's `windowDays`-day window has
 *  fully passed by `now` (that week's Sunday + windowDays is before today, IST). */
export function lastClosedCohortWeek(now: Date, windowDays: number): IsoWeek {
  const today = istDayString(now);
  let w = lastCompleteWeek(now);
  while (!(addDays(w.endDay, windowDays) < today)) w = addWeeks(w, -1);
  return w;
}

/** A period label for consecutive weeks: "17 Aug–13 Sep 2026". */
export function weeksPeriod(weeks: readonly IsoWeek[]): string {
  if (!weeks.length) return "";
  if (weeks.length === 1) return weeks[0].label;
  const first = weeks[0];
  const last = weeks[weeks.length - 1];
  const sameYear = first.startDay.slice(0, 4) === last.endDay.slice(0, 4);
  const start = istDayLabel(first.startDay);
  return `${sameYear ? start.replace(/ \d{4}$/, "") : start}–${istDayLabel(last.endDay)}`;
}

export interface NumbersWindows {
  today: string;
  /** Last TABLE_WEEKS complete weeks (the weekly usage table). */
  usageWeeks: IsoWeek[];
  /** Last TABLE_WEEKS sign-up weeks whose 7-day window has closed. */
  cohortWeeks: IsoWeek[];
  /** The last POOLED_WEEKS of those. */
  pooled7Weeks: IsoWeek[];
  /** Last POOLED_WEEKS sign-up weeks whose 30-day window has closed. */
  pooled30Weeks: IsoWeek[];
  /** Last POOLED_WEEKS complete weeks, never before SIGNUP_SOURCE_FIRST_WEEK. */
  signupSourceWeeks: IsoWeek[];
  /** Last POOLED_WEEKS complete weeks, never before PEOPLE_FIRST_WEEK. */
  newPeopleWeeks: IsoWeek[];
}

function notBefore(weeks: IsoWeek[], firstSlug: string): IsoWeek[] {
  const first = parseWeekSlug(firstSlug);
  return first ? weeks.filter((w) => compareWeeks(w, first) >= 0) : weeks;
}

export function numbersWindows(now: Date): NumbersWindows {
  const last = lastCompleteWeek(now);
  const closed7 = lastClosedCohortWeek(now, 7);
  const closed30 = lastClosedCohortWeek(now, 30);
  return {
    today: istDayString(now),
    usageWeeks: weeksBack(last, TABLE_WEEKS),
    cohortWeeks: weeksBack(closed7, TABLE_WEEKS),
    pooled7Weeks: weeksBack(closed7, POOLED_WEEKS),
    pooled30Weeks: weeksBack(closed30, POOLED_WEEKS),
    signupSourceWeeks: notBefore(weeksBack(last, POOLED_WEEKS), SIGNUP_SOURCE_FIRST_WEEK),
    newPeopleWeeks: notBefore(weeksBack(last, POOLED_WEEKS), PEOPLE_FIRST_WEEK),
  };
}

// ── Builders: cohort returns ──────────────────────────────────────────

/** One grouped row per sign-up week: the IST Monday ("YYYY-MM-DD"), the
 *  cohort size and its returners in each window. */
export interface CohortRow {
  wk: string;
  cohort: number;
  ret7: number;
  ret30: number;
}

export interface CohortWeek {
  week: string;
  label: string;
  cohort: number;
  returned: number;
}

export interface CohortReturns {
  within7: PublicNumber<PooledShare>;
  days8to30: PublicNumber<PooledShare>;
  weekly: PublicNumber<CohortWeek[]>;
}

function rowFor<T extends { wk: string }>(rows: readonly T[], w: IsoWeek): T | undefined {
  return rows.find((r) => weekFromMondayDay(r.wk).slug === w.slug);
}

function pool(rows: readonly CohortRow[], weeks: readonly IsoWeek[], pick: (r: CohortRow) => number): PooledShare {
  let num = 0;
  let den = 0;
  for (const w of weeks) {
    const r = rowFor(rows, w);
    if (!r) continue;
    num += pick(r);
    den += r.cohort;
  }
  return { num, den, weeks: weeks.map((w) => w.slug) };
}

export function buildCohortReturns(rows: readonly CohortRow[], win: NumbersWindows): CohortReturns {
  return {
    within7: {
      id: "came-back-7-days",
      label: "Came back within 7 days of signing up",
      value: pool(rows, win.pooled7Weeks, (r) => r.ret7),
      definition: DEFINITIONS.cameBack7,
      asOf: win.today,
      period: `sign-up weeks ${weeksPeriod(win.pooled7Weeks)}`,
      source: SOURCES.activity,
    },
    days8to30: {
      id: "came-back-8-30-days",
      label: "Came back on days 8 to 30",
      value: pool(rows, win.pooled30Weeks, (r) => r.ret30),
      definition: DEFINITIONS.cameBack8to30,
      asOf: win.today,
      period: `sign-up weeks ${weeksPeriod(win.pooled30Weeks)}`,
      source: SOURCES.activity,
    },
    weekly: {
      id: "came-back-by-week",
      label: "Came back within 7 days, by sign-up week",
      value: win.cohortWeeks.map((w) => {
        const r = rowFor(rows, w);
        return { week: w.slug, label: w.label, cohort: r?.cohort ?? 0, returned: r?.ret7 ?? 0 };
      }),
      definition: DEFINITIONS.cohortWeekly,
      asOf: win.today,
      period: `sign-up weeks ${weeksPeriod(win.cohortWeeks)}`,
      source: SOURCES.activity,
    },
  };
}

// ── Builders: 30-day actives ──────────────────────────────────────────

export interface ActivesRow {
  accounts: number;
  active30: number;
  active30After: number;
}

export interface Actives30 {
  all: PublicNumber<CountOf>;
  afterSignupDay: PublicNumber<CountOf>;
}

export function buildActives30(row: ActivesRow, win: NumbersWindows): Actives30 {
  const period = istDayRangeLabel(addDays(win.today, -29), win.today);
  return {
    // 27 Sep 2026 (fixer review): the ids are unchanged (page anchors); the
    // labels say which figure counts the sign-up day.
    all: {
      id: "active-30-days",
      label: "Active in the last 30 days, sign-up day included",
      value: { num: row.active30, den: row.accounts },
      definition: DEFINITIONS.active30,
      asOf: win.today,
      period,
      source: SOURCES.activity,
    },
    afterSignupDay: {
      id: "active-30-days-after-signup-day",
      label: "Active in the last 30 days, on a day after signing up",
      value: { num: row.active30After, den: row.accounts },
      definition: DEFINITIONS.active30AfterSignup,
      asOf: win.today,
      period,
      source: SOURCES.activity,
    },
  };
}

// ── Builders: weekly usage ────────────────────────────────────────────

export interface WeeklyUsageRow {
  week: string;
  label: string;
  signups: number;
  /** null before PEOPLE_FIRST_WEEK (not comparable). */
  peopleWhoCame: number | null;
  mocks: number;
  tutorQuestions: number;
  activeAccounts: number;
  mockTakers: number;
}

export type WeeklyColumn = "signups" | "peopleWhoCame" | "mocks" | "tutorQuestions" | "activeAccounts" | "mocksPerActive";

export const WEEKLY_COLUMNS: readonly { key: WeeklyColumn; label: string; definition: string }[] = [
  { key: "signups", label: "Sign-ups", definition: "Accounts created in the week." },
  {
    key: "peopleWhoCame",
    label: "People who came",
    definition:
      "People with a page view that week (not tagged as a bot) who meet the all-time counter's rule — an identity seen on 2 or more page views, or on one view with a referrer — plus page views by verified browsers that carry no identity. Proves a visit, not learning. The home page strip calls this counter 'learners'.",
  },
  { key: "mocks", label: "Mocks taken", definition: "Mocks submitted or auto-submitted, by finish time." },
  {
    key: "tutorQuestions",
    label: "AI tutor questions",
    definition:
      "Questions students sent to the AI tutor: members' messages (guest-import copies left out) plus guest questions that carry a browser cookie.",
  },
  { key: "activeAccounts", label: "Active accounts", definition: `Accounts with ${ACTIVITY} that week.` },
  { key: "mocksPerActive", label: "Mocks per active account", definition: "Mocks taken ÷ active accounts." },
];

export interface MocksPerActive {
  week: string;
  label: string;
  mocks: number;
  actives: number;
  mockTakers: number;
}

export interface WeeklyUsage {
  weeks: PublicNumber<WeeklyUsageRow[]>;
  mocksPerActive: PublicNumber<MocksPerActive>;
}

export interface WeeklyRaw {
  signups: { wk: string; n: number }[];
  mocks: { wk: string; n: number; takers: number }[];
  tutor: { wk: string; n: number }[];
  actives: { wk: string; n: number }[];
  people: { wk: string; n: number }[];
}

export function buildWeeklyUsage(raw: WeeklyRaw, win: NumbersWindows): WeeklyUsage {
  const first = parseWeekSlug(PEOPLE_FIRST_WEEK);
  const rows: WeeklyUsageRow[] = win.usageWeeks.map((w) => {
    const m = rowFor(raw.mocks, w);
    return {
      week: w.slug,
      label: w.label,
      signups: rowFor(raw.signups, w)?.n ?? 0,
      peopleWhoCame: first && compareWeeks(w, first) >= 0 ? (rowFor(raw.people, w)?.n ?? 0) : null,
      mocks: m?.n ?? 0,
      tutorQuestions: rowFor(raw.tutor, w)?.n ?? 0,
      activeAccounts: rowFor(raw.actives, w)?.n ?? 0,
      mockTakers: m?.takers ?? 0,
    };
  });
  const last = rows[rows.length - 1];
  return {
    weeks: {
      id: "week-by-week",
      label: "Week by week",
      value: rows,
      definition: DEFINITIONS.weekly,
      asOf: win.today,
      period: weeksPeriod(win.usageWeeks),
      source: SOURCES.weekly,
    },
    mocksPerActive: {
      id: "mocks-per-active-account",
      label: "Mocks per weekly active account",
      value: {
        week: last?.week ?? "",
        label: last?.label ?? "",
        mocks: last?.mocks ?? 0,
        actives: last?.activeAccounts ?? 0,
        mockTakers: last?.mockTakers ?? 0,
      },
      definition: DEFINITIONS.mocksPerActive,
      asOf: win.today,
      period: last?.label ?? "",
      source: SOURCES.activity,
    },
  };
}

// ── Builders: sources ─────────────────────────────────────────────────

export interface FamilyRow {
  fam: string;
  n: number;
}

export interface SourceSplit {
  total: number;
  /** Groups after mergeSmallBuckets(K_MIN), largest first. */
  groups: MergedBucket[];
  /** A tag or referrer named the source (every family but Direct or unknown). */
  named: number;
  ai: number;
  weeks: string[];
}

function asFamily(f: string): SourceFamily {
  return (SOURCE_FAMILIES as readonly string[]).includes(f) ? (f as SourceFamily) : "direct";
}

/** The count of the families `fams` in a split, or null when printing it
 *  next to the table would reveal a group under K_MIN.
 *  27 Sep 2026 (fixer review): the table merges small families ("Search
 *  engines + Direct or unknown + Other websites" 37), and the line "Named
 *  source: 128 of 143" then gave back Direct or unknown = 15 by subtraction.
 *  A subset is printable only when it is exactly a union of the printed
 *  groups (every group wholly in or wholly out), so it adds nothing the
 *  table and the total do not already show — and it, and the rest of the
 *  total, must each be 0 or at least K_MIN (subsetPublishable). */
export function sourceSubsetCount(v: SourceSplit, fams: readonly SourceFamily[]): number | null {
  const inSet = new Set<string>(fams);
  for (const g of v.groups) {
    const inside = g.keys.filter((k) => inSet.has(k)).length;
    if (inside !== 0 && inside !== g.keys.length) return null;
  }
  let n = 0;
  for (const g of v.groups) if (g.keys.every((k) => inSet.has(k))) n += g.n;
  return subsetPublishable(n, v.total) ? n : null;
}

/** "Named source" (every family but Direct or unknown), gated. */
export function namedSourceCount(v: SourceSplit): number | null {
  return sourceSubsetCount(
    v,
    SOURCE_FAMILIES.filter((f) => f !== "direct"),
  );
}

/** "From AI assistants", gated. */
export function aiSourceCount(v: SourceSplit): number | null {
  return sourceSubsetCount(v, ["ai"]);
}

export function splitSources(rows: readonly FamilyRow[], weeks: readonly IsoWeek[]): SourceSplit {
  const byFam = new Map<SourceFamily, number>();
  for (const r of rows) {
    const f = asFamily(r.fam);
    byFam.set(f, (byFam.get(f) ?? 0) + Number(r.n));
  }
  const buckets: Bucket[] = SOURCE_FAMILIES.map((f) => ({ key: f, label: SOURCE_FAMILY_LABEL[f], n: byFam.get(f) ?? 0 }));
  const total = buckets.reduce((s, b) => s + b.n, 0);
  return {
    total,
    groups: mergeSmallBuckets(buckets, K_MIN),
    named: total - (byFam.get("direct") ?? 0),
    ai: byFam.get("ai") ?? 0,
    weeks: weeks.map((w) => w.slug),
  };
}

export function buildSignupSources(rows: readonly FamilyRow[], win: NumbersWindows): PublicNumber<SourceSplit> | null {
  if (!win.signupSourceWeeks.length) return null;
  return {
    id: "signup-sources",
    label: "Where new accounts arrive from",
    value: splitSources(rows, win.signupSourceWeeks),
    definition: DEFINITIONS.signupSources,
    asOf: win.today,
    period: weeksPeriod(win.signupSourceWeeks),
    source: SOURCES.signups,
  };
}

export function buildNewPeopleSources(rows: readonly FamilyRow[], win: NumbersWindows): PublicNumber<SourceSplit> | null {
  if (!win.newPeopleWeeks.length) return null;
  return {
    id: "new-people-sources",
    label: "Where new people arrive from",
    value: splitSources(rows, win.newPeopleWeeks),
    definition: DEFINITIONS.newPeople,
    asOf: win.today,
    period: weeksPeriod(win.newPeopleWeeks),
    source: SOURCES.newPeople,
  };
}

// ── Builders: answer check ────────────────────────────────────────────

export interface AnswerCheckRow {
  checked: number;
  accepted: number;
  keyCorrected: number;
  withdrawn: number;
  liveBefore: number;
  liveKept: number;
  liveCorrected: number;
  liveWithdrawn: number;
  lastCheckDay: string | null;
  uncheckedLive: number;
  uncheckedExams: number;
}

export interface AnswerCheck extends AnswerCheckRow {
  /** Checked questions in none of the three outcomes (changed by hand after the check). */
  other: number;
}

export function buildAnswerCheck(row: AnswerCheckRow, today: string): PublicNumber<AnswerCheck> {
  const other = Math.max(0, row.checked - row.accepted - row.keyCorrected - row.withdrawn);
  return {
    id: "answer-check",
    label: "What the answer check found",
    value: { ...row, other },
    definition: DEFINITIONS.answerCheck,
    asOf: today,
    period: row.lastCheckDay ? `every check up to ${istDayLabel(row.lastCheckDay)}` : "every check",
    source: SOURCES.answerCheck,
  };
}

export function buildReports(received: number, closed: number, today: string): PublicNumber<CountOf> {
  return {
    id: "question-reports",
    label: "Question reports",
    value: { num: closed, den: received },
    definition: DEFINITIONS.reports,
    asOf: today,
    period: "all time",
    source: SOURCES.reports,
  };
}

/** How many of the solves must agree — DEFAULT_CONFIG.minAgreement of
 *  solveRuns, rounded up ("2 of 3"). */
export function solvesNeeded(cfg: { solveRuns: number; minAgreement: number } = DEFAULT_CONFIG): number {
  return Math.ceil(cfg.minAgreement * cfg.solveRuns - 1e-9);
}

/** The method paragraph; every number comes from the answer check's own
 *  config (src/lib/ai/factory/types.ts DEFAULT_CONFIG, the one
 *  scripts/verify-question-bank.ts gates with). */
export function answerCheckMethod(cfg: { solveRuns: number; minAgreement: number; minVerifyConfidence: number } = DEFAULT_CONFIG): string {
  const need = solvesNeeded(cfg);
  const conf = Math.round(cfg.minVerifyConfidence * 100);
  return (
    `Each question is solved ${cfg.solveRuns} times by an AI model that is not shown the stored answer key; an AI examiner then compares the key, the solves and the question. ` +
    `A question passes when the examiner judges the stored key correct with at least ${conf}% confidence and at least ${need} of the ${cfg.solveRuns} solves reach that same answer. ` +
    `When the examiner and at least ${need} solves agree on a different option, the key is corrected and the solution is replaced by the solve that reached it. ` +
    "Anything else — two defensible answers, low agreement, a broken question — is withdrawn from every practice pool. " +
    "The check is automated, not a human audit, and it can be wrong; every question keeps its Report button."
  );
}

// ── Citation and FAQ ──────────────────────────────────────────────────

export const NUMBERS_PATH = "/shishya-in-numbers";
export const NUMBERS_URL = `${SITE_URL}${NUMBERS_PATH}`;

export function citationLine(today: string): string {
  return `Shishya, “Shishya in numbers”, ${NUMBERS_URL}, as of ${istDayLabel(today)}.`;
}

/** "28.7% (213 of 742)" — or null when either side, or the rest (den − num),
 *  is under K_MIN (subsetPublishable, 27 Sep 2026). */
export function pooledPhrase(v: { num: number; den: number }): string | null {
  if (!subsetPublishable(v.num, v.den)) return null;
  return `${formatPct(share(v.num, v.den))} (${formatInt(v.num)} of ${formatInt(v.den)})`;
}

export interface FaqInputs {
  today: string;
  /** The all-time accounts counter (getLiveCounts().totalSignups). */
  accounts: number | null;
  cohorts: CohortReturns | null;
  actives: Actives30 | null;
  signupSources: PublicNumber<SourceSplit> | null;
  answerCheck: PublicNumber<AnswerCheck> | null;
}

/** The three computed answers of the page's FAQPage JSON-LD. A sentence
 *  whose number could not be read, or is under K_MIN, is left out. The
 *  30-day active sentence prints the share, never the team-free account
 *  total (it would reveal how many team accounts there are). */
export function numbersFaq(i: FaqInputs): [string, string][] {
  const usage: string[] = [];
  if (i.accounts !== null) usage.push(`${formatInt(i.accounts)} accounts had been created on Shishya by ${istDayLabel(i.today)}.`);
  const r7 = i.cohorts ? pooledPhrase(i.cohorts.within7.value) : null;
  if (i.cohorts && r7) {
    usage.push(`Of the accounts created in the ${i.cohorts.within7.period}, ${r7} used Shishya again, signed in, within 7 days of signing up.`);
  }
  // 27 Sep 2026 (fixer review): the strict figure leads — signing up alone
  // is not activity. The sign-up-day-included share follows as a share only
  // (its count next to the strict count would pin the team-free total).
  if (i.actives) {
    const a = i.actives.all.value;
    const b = i.actives.afterSignupDay.value;
    const aPct = shareCell(a.num, a.den);
    const bPct = shareCell(b.num, b.den);
    if (bPct !== SUPPRESSED) {
      usage.push(
        `${formatInt(b.num)} accounts (${bPct} of all accounts) used Shishya, signed in, in the last 30 days on a day after the day they signed up` +
          (aPct !== SUPPRESSED ? `; counting the sign-up day too (signing up is itself a signed-in event, so an account created in those 30 days counts just for signing up), the share is ${aPct}.` : "."),
      );
    }
  }
  usage.push("An account is not a unique student, and people who study signed out are not seen, so these are floors.");

  const check: string[] = [answerCheckMethod()];
  if (i.answerCheck) {
    const c = i.answerCheck.value;
    check.push(
      `By ${istDayLabel(i.answerCheck.asOf)}, ${formatInt(c.checked)} questions had been checked: ${formatInt(c.accepted)} accepted as written, ${formatInt(c.keyCorrected)} with a corrected key and ${formatInt(c.withdrawn)} withdrawn.`,
    );
    if (publishable(c.liveBefore)) {
      check.push(
        `Of the ${formatInt(c.liveBefore)} questions that were already live when checked, ${formatPct(share(c.liveCorrected, c.liveBefore))} had their key corrected and ${formatPct(share(c.liveWithdrawn, c.liveBefore))} were withdrawn.`,
      );
    }
  }

  const src: string[] = [];
  const s = i.signupSources;
  if (s) {
    const v = s.value;
    // 27 Sep 2026 (fixer review): through the same union-of-groups gate as
    // the page's lines, so the answer never gives back a merged-away group.
    const aiN = aiSourceCount(v);
    const namedN = namedSourceCount(v);
    const ai = aiN === null ? SUPPRESSED : shareCell(aiN, v.total);
    const named = namedN === null ? SUPPRESSED : shareCell(namedN, v.total);
    const totalPrinted = publishable(v.total);
    if (named !== SUPPRESSED) {
      src.push(`Of the ${formatInt(v.total)} accounts created in ${s.period}, ${named} arrived on a first visit whose tag or referrer named its source.`);
    }
    if (ai !== SUPPRESSED) {
      src.push(
        `${named === SUPPRESSED && totalPrinted ? `Of the ${formatInt(v.total)} accounts created in ${s.period}, ` : ""}${ai} arrived from AI assistants such as ChatGPT, which tags its links utm_source=chatgpt.com and sends no referrer.`,
      );
    }
    src.push("Some apps strip both the referrer and the tag, so the AI-assistant share is a floor.");
  } else {
    src.push("The sign-up source split could not be computed right now.");
  }

  return [
    ["How many people use Shishya?", usage.join(" ")],
    ["How are Shishya's answer keys checked?", check.join(" ")],
    ["Where do Shishya's students come from?", src.join(" ")],
  ];
}
