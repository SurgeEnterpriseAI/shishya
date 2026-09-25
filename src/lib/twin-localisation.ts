// Hindi / Telugu twin localisation gate (13 Sep 2026 — index shape that
// protects the Bing → ChatGPT channel).
//
// Audit (11 Sep 2026): the /hi and /te hub twins were 91-93% identical to
// the English page, every twin declared <html lang="en">, and IndexNow
// pushed all 1,154 twins to Bing every Monday. A page whose body is English
// inside a translated frame is a duplicate, not a Hindi page.
//
// ONE rule, one helper — the native-script share of what the twin's body
// renders:
//     share = native letters / (native letters + Latin letters)
// counted over
//   (a) the translated UI strings the surface's SERVER render prints —
//       TWIN_RENDERED_KEYS, measured in hi / te into TWIN_CHROME;
//   (b) the English copy hard-coded in the page, the components it renders
//       and the site footer — TWIN_CHROME.literalLatin + SITE_FRAME_LATIN;
//   (c) the database text the surface prints (news, tracker labels, cutoff
//       tables, syllabus and mock names, result headlines) — English for
//       every exam today, measured per exam from the DB.
//
// The native side may never be overstated — an overstated native count is
// a gate that fails OPEN (review fix, 13 Sep 2026: the first cut credited
// the union of every dictionary key named in the page source, including
// strings that are mutually exclusive, appear only after a click, or belong
// to the exam-week block, and let English trackers through in exam week).
// So, for (a):
//   • mutually exclusive strings are one slot credited at the variant with
//     the FEWEST native letters (and the MOST Latin letters);
//   • strings that render only in some data states are either a slot with
//     an empty variant (credited 0) or a `when` section credited only when
//     the exam's data says it renders (tracker rows, a cutoff table);
//   • strings that exist only after interaction (alert done / invalid /
//     error, the estimator result, the pulse prompt that mounts client-side)
//     are not listed at all;
//   • the ExamWeekBlock's translated strings are never credited — which of
//     them render depends on phase, tier and viewer, and an expected-tier
//     exam day after the eve renders nothing — only its Latin counts.
// Latin is counted generously (dictionary placeholders, every hard-coded
// English literal of the page and its components): an overstated Latin
// count only withholds a twin.
// The hub keeps its union-of-keys native count: that is an UPPER bound and
// the hub twin still fails with no DB text at all (19.3% / 18.2%), and DB
// text is English, so the hub verdict is "not localised" either way.
// (a) and (b) are pinned by tests/unit/index-shape-twins.test.ts, which
// recomputes (a) from src/lib/i18n.ts, checks every listed key is still
// rendered by the page, and fails when a page drifts.
// Exam names, codes and "Shishya" are stripped first: proper nouns stay in
// Latin script in every language, so they count for neither side.
//
//   share ≥ TWIN_MIN_SHARE (30%) → a real localised page: self-canonical,
//     hreflang-paired, in the sitemap, submitted to IndexNow.
//   below → canonical is the English URL; the twin leaves the sitemap, the
//     hreflang block and IndexNow. The URL still serves — the language
//     switcher and every human link keep working.
//
// Letters are Unicode code points: Devanagari U+0900–U+097F for hi, Telugu
// U+0C00–U+0C7F for te, A–Z / a–z for Latin. Digits and punctuation count
// for neither side.
//
// Pure functions first (unit-tested). The DB loaders at the bottom use
// dynamic imports so unit tests never load Prisma or next/cache.

import { NO_TWINS, type TwinVerdict, type UrlLocale } from "@/lib/seo-locale";

export const TWIN_MIN_SHARE = 0.3;

export type TwinSurface = "hub" | "updates" | "cutoff" | "score-estimate" | "exam-calendar";
export type ExamTwinSurface = Exclude<TwinSurface, "exam-calendar">;
export const EXAM_TWIN_SURFACES: readonly ExamTwinSurface[] = ["hub", "updates", "cutoff", "score-estimate"];

export interface Letters {
  native: number;
  latin: number;
}

export interface LocaleLetters {
  hi: Letters;
  te: Letters;
}

/** Data states that decide whether a section of a surface renders. */
export type ChromeCondition = "dates" | "cutoffTable";

export interface SurfaceChrome extends LocaleLetters {
  /** Latin letters of English copy hard-coded in the page + the components it imports. */
  literalLatin: number;
  /** Latin letters of English sentences the page prints from lib code. */
  libLatin?: number;
  /** Dictionary strings of sections that render only in a data state. */
  when?: Partial<Record<ChromeCondition, LocaleLetters>>;
}

/** One rendered dictionary-string slot: a key, or mutually exclusive
 *  variants (each the keys that render together; [] = nothing renders). */
export type ChromeSlot = string | { readonly oneOf: readonly (readonly string[])[] };

export interface SurfaceSpec {
  /** Rendered on every server render of the surface, whatever the data. */
  always: readonly ChromeSlot[];
  when?: Partial<Record<ChromeCondition, readonly ChromeSlot[]>>;
}

const FAQ_ANSWER: ChromeSlot = {
  oneOf: [
    ["tracker.faq.a.unknown"],
    ["tracker.faq.a.done"],
    ["tracker.faq.a.doneExpected"],
    ["tracker.faq.a.official"],
    ["tracker.faq.a.reported"],
    ["tracker.faq.a.expected"],
  ],
};
const KEY_DATE_CARD: ChromeSlot = { oneOf: [["tracker.notAnnounced"], ["tracker.official"], ["tracker.reported"], ["tracker.expected"]] };

/** What each surface's server render prints from src/lib/i18n.ts, for an
 *  anonymous visitor (a crawler). Per-row repeats (badges, status words,
 *  "Read full notice") are credited once or not at all. */
export const TWIN_RENDERED_KEYS: Record<Exclude<TwinSurface, "hub">, SurfaceSpec> = {
  updates: {
    always: [
      "tracker.title",
      "tracker.h1",
      "tracker.intro",
      { oneOf: [[], ["tracker.status.examToday"], ["tracker.status.examTomorrow"], ["tracker.status.examIn"], ["tracker.status.none"]] },
      { oneOf: [[], ["tracker.status.next"]] },
      { oneOf: [[], ["tracker.status.last"]] },
      // ExamAlertBox server render: title (phase-dependent), body, button.
      { oneOf: [["tracker.alert.title"], ["ew.alert.cta"]] },
      "tracker.alert.body",
      { oneOf: [["tracker.alert.btn"], ["tracker.alert.btnSigned"]] },
      "tracker.updates",
      "tracker.archive",
      { oneOf: [["tracker.updates.empty"], ["tracker.readMore"]] },
      { oneOf: [[], ["tracker.results"]] },
      "tracker.cutoff",
      "tracker.cutoff.link",
      "tracker.officialSite",
      "tracker.verify",
      "tracker.practice.title",
      "tracker.practice.body",
      "tracker.practice.mock",
      "tracker.practice.quiz",
      { oneOf: [[], ["tracker.practice.pyq"]] },
      "tracker.faq.title",
      "tracker.faq.q.examDate",
      "tracker.faq.q.notification",
      "tracker.faq.q.apply",
      "tracker.faq.q.admit",
      "tracker.faq.q.result",
      FAQ_ANSWER,
      FAQ_ANSWER,
      FAQ_ANSWER,
      FAQ_ANSWER,
      FAQ_ANSWER,
      "calendar.title",
    ],
    when: {
      // Key-dates strip + full timeline (timeline.length > 0).
      dates: [
        "tracker.keyDates",
        "tracker.kind.NOTIFICATION",
        "tracker.kind.APPLICATION_END",
        "tracker.kind.ADMIT_CARD",
        "tracker.kind.EXAM",
        "tracker.kind.ANSWER_KEY",
        "tracker.kind.RESULT",
        KEY_DATE_CARD,
        KEY_DATE_CARD,
        KEY_DATE_CARD,
        KEY_DATE_CARD,
        KEY_DATE_CARD,
        KEY_DATE_CARD,
        "tracker.expected.note",
        { oneOf: [[], ["tracker.updated"]] },
        "tracker.timeline",
        "tracker.col.event",
        "tracker.col.date",
        "tracker.col.status",
      ],
    },
  },
  cutoff: {
    always: [
      "tracker.cutoff",
      "cutoff.h1",
      // Exam-week block: D-1 .. D+7 on an announced exam day only.
      {
        oneOf: [
          [],
          [
            "ew.cutoff.title",
            "ew.cutoff.lead",
            "ew.post.notAnnounced",
            "ew.date.overdue",
            "ew.cutoff.mockAvg",
            "ew.verdict.tally",
            "ew.today.pm",
            "ew.verdict.easy",
            "ew.verdict.moderate",
            "ew.verdict.tough",
            "ew.verdict.section",
            "ew.verdict.few",
            "ew.score.cta",
            "ew.ics.cta",
            "ew.ics.note",
            "tracker.alert.title",
            "tracker.alert.btn",
          ],
        ],
      },
      "cutoff.disclaimer",
      "cutoff.intro",
      "cutoff.shareLabel",
      "cutoff.askExpert",
      "cutoff.askExpertLink",
      // After the paper the hub link replaces the (English) CoachEntry line.
      { oneOf: [[], ["ew.post.title"]] },
      "cutoff.bands",
      "cutoff.land.title",
      "cutoff.land.body",
      "cutoff.land.cta",
      "tracker.practice.quiz",
    ],
    when: {
      cutoffTable: [{ oneOf: [["cutoff.category"], ["ew.cutoff.lastCycle"]] }],
    },
  },
  "score-estimate": {
    always: [
      "ew.score.cta",
      // Statable: title, lead, marking line, the three input labels. Not
      // statable: the refusal title + body + tracker pill (plus the verdict's
      // English reason — libLatin).
      {
        oneOf: [
          ["ew.score.title", "ew.score.lead", "ew.score.marking", "ew.score.attempted", "ew.score.correct", "ew.score.wrong"],
          ["ew.score.mixed.title", "ew.score.mixed.body", "tracker.title"],
        ],
      },
      { oneOf: [[], ["tracker.officialSite"]] },
      // Answer key / result status + alert box: exam week, announced day only.
      { oneOf: [[], ["ew.post.key", "ew.post.result", "ew.post.notAnnounced", "ew.date.overdue", "tracker.alert.title", "tracker.alert.btn", "tracker.alert.body"]] },
      // 14 Sep 2026 — "N candidates have added a score" (only while a sitting
      // is open and someone has added one) and the pointer to published
      // cutoffs (only for exams that have them): data states, credited 0.
      { oneOf: [[], ["ew.score.stand.already"]] },
      { oneOf: [[], ["ew.score.published.title", "ew.score.published.note", "ew.score.published.more"]] },
      "ew.post.cutoff",
      "tracker.title",
    ],
    when: {
      cutoffTable: ["ew.cutoff.lastCycle", "ew.score.compare"],
    },
  },
  "exam-calendar": {
    always: [
      "calendar.title",
      "calendar.h1",
      "calendar.intro",
      "calendar.count",
      "tracker.expected.note",
      { oneOf: [[], ["calendar.thisWeek"]] },
      { oneOf: [["calendar.empty"], ["tracker.col.date", "tracker.col.event"]] },
      { oneOf: [[], ["calendar.news"]] },
      "tracker.verify",
    ],
  },
};

// Measured 13 Sep 2026: the non-hub dictionary letters are TWIN_RENDERED_KEYS
// summed over src/lib/i18n.ts (exact — the test recomputes them); literalLatin
// from the page sources (heuristic, test tolerance max(35%, 300)). hub: the
// union of every dictionary key in the page source — an upper bound (above).
export const TWIN_CHROME: Record<TwinSurface, SurfaceChrome> = {
  hub: { hi: { native: 1412, latin: 31 }, te: { native: 1373, latin: 304 }, literalLatin: 5755 },
  updates: {
    hi: { native: 781, latin: 112 },
    te: { native: 882, latin: 112 },
    literalLatin: 1092,
    when: { dates: { hi: { native: 255, latin: 4 }, te: { native: 238, latin: 4 } } },
  },
  cutoff: {
    hi: { native: 505, latin: 69 },
    te: { native: 550, latin: 69 },
    literalLatin: 1648,
    when: { cutoffTable: { hi: { native: 29, latin: 0 }, te: { native: 31, latin: 0 } } },
  },
  // Re-measured 14 Sep 2026: longer lead (score kept only if added), the
  // "N candidates have added a score" line and the published-cutoffs pointer.
  "score-estimate": {
    hi: { native: 294, latin: 51 },
    te: { native: 349, latin: 51 },
    literalLatin: 438,
    // markingSchemeVerdict's English refusal reason (longest measured: 148).
    libLatin: 180,
    when: { cutoffTable: { hi: { native: 115, latin: 0 }, te: { native: 127, latin: 0 } } },
  },
  "exam-calendar": { hi: { native: 394, latin: 13 }, te: { native: 386, latin: 13 }, literalLatin: 696 },
};

/** ExamWeekBlock (hub + tracker, exam week only): Latin only. `hi` / `te` =
 *  the Latin letters of every dictionary string it can print (placeholders
 *  included), literalLatin = its hard-coded English — an upper bound that
 *  also covers the ≤ 6 subject chips and repeated admit-card notes. */
export const EXAM_WEEK_BLOCK_LATIN: { hi: number; te: number; literalLatin: number } = { hi: 153, te: 151, literalLatin: 196 };
const EXAM_WEEK_BLOCK_SURFACES: ReadonlySet<TwinSurface> = new Set<TwinSurface>(["hub", "updates"]);

/** English copy in the root layout's SiteFooter (every page). */
export const SITE_FRAME_LATIN = 124;

const NATIVE_RE: Record<UrlLocale, RegExp> = { hi: /[ऀ-ॿ]/g, te: /[ఀ-౿]/g };

export function scriptLetters(text: string, locale: UrlLocale): Letters {
  const s = text ?? "";
  return { native: (s.match(NATIVE_RE[locale]) ?? []).length, latin: (s.match(/[A-Za-z]/g) ?? []).length };
}

/** Remove proper nouns that are Latin in every language (case-insensitive,
 *  longest first so "SSC Combined Graduate Level" goes before "SSC"). */
export function stripNeutral(text: string, neutral: readonly string[]): string {
  let out = text ?? "";
  const names = [...new Set(neutral.map((n) => (n ?? "").trim()).filter((n) => n.length >= 2))].sort((a, b) => b.length - a.length);
  for (const n of names) out = out.replace(new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), " ");
  return out.replace(/https?:\/\/\S+/g, " ");
}

export function nativeShare(l: Letters): number {
  const total = l.native + l.latin;
  return total === 0 ? 0 : l.native / total;
}

export interface TwinMeasure extends Letters {
  share: number;
  localised: boolean;
}

export interface TwinMeasureOptions {
  neutral?: readonly string[];
  /** A typed exam-day row within ±7 IST days (ExamWeekBlock may render). */
  examWeek?: boolean;
  /** Data states present for this exam — `when` sections are credited only then. */
  present?: Partial<Record<ChromeCondition, boolean>>;
}

/** The shared helper: native-script share of a twin surface's body. */
export function measureTwin(
  surface: TwinSurface,
  locale: UrlLocale,
  dynamicTexts: readonly string[],
  opts: TwinMeasureOptions = {},
): TwinMeasure {
  const chrome = TWIN_CHROME[surface];
  let native = chrome[locale].native;
  let latin = chrome[locale].latin + chrome.literalLatin + (chrome.libLatin ?? 0) + SITE_FRAME_LATIN;
  for (const cond of Object.keys(chrome.when ?? {}) as ChromeCondition[]) {
    const part = chrome.when?.[cond];
    if (part && opts.present?.[cond]) {
      native += part[locale].native;
      latin += part[locale].latin;
    }
  }
  if (opts.examWeek && EXAM_WEEK_BLOCK_SURFACES.has(surface)) {
    latin += EXAM_WEEK_BLOCK_LATIN[locale] + EXAM_WEEK_BLOCK_LATIN.literalLatin;
  }
  const neutral = [...(opts.neutral ?? []), "Shishya"];
  for (const t of dynamicTexts) {
    const l = scriptLetters(stripNeutral(t, neutral), locale);
    native += l.native;
    latin += l.latin;
  }
  const share = nativeShare({ native, latin });
  return { native, latin, share, localised: share >= TWIN_MIN_SHARE };
}

export function twinVerdict(surface: TwinSurface, dynamicTexts: readonly string[], opts: TwinMeasureOptions = {}): TwinVerdict {
  return {
    hi: measureTwin(surface, "hi", dynamicTexts, opts).localised,
    te: measureTwin(surface, "te", dynamicTexts, opts).localised,
  };
}

// ── what each exam surface prints from the DB ───────────────────────────

export interface ExamTwinInput {
  exam: { code: string; name: string; shortName: string; description: string | null };
  /** Active news rows (any order). */
  news: { title: string; body: string; publishedAt: Date | string }[];
  /** Active tracker rows (any order). */
  dates: { label: string; notes: string | null; kind: string | null; date: Date | string }[];
  /** Result headlines, newest first. */
  results: { headline: string; stage: string }[];
  cutoffContent: string | null;
  bands: { label: string; outcomes: string }[];
  /** Subject names + top-level topic names. */
  syllabus: string[];
  mockTitles: string[];
}

const DAY_MS = 86_400_000;
const IST_OFFSET_MS = 5.5 * 3_600_000;
const EXAM_WEEK_DAYS = 7;
const SCORE_ESTIMATE_KINDS = new Set(["EXAM", "ANSWER_KEY", "RESULT"]);
/** Tracker labels the tracker prints a second time: 5 FAQ answers + the
 *  "next" and "last" status chips. */
const TRACKER_REPEATED_LABELS = 7;

const toMs = (d: Date | string) => new Date(d).getTime();
const istDay = (now: Date) => Math.floor((now.getTime() + IST_OFFSET_MS) / DAY_MS);
/** Tracker dates are stored at midnight UTC of the IST day. */
const storedDay = (d: Date | string) => Math.floor(toMs(d) / DAY_MS);

/**
 * The DB text each exam surface renders, mirroring the pages' own reads:
 *   hub            — 5 newest news (title + body), the 12 tracker rows
 *                    nearest today, description, syllabus, ≤40 mock titles,
 *                    rank bands
 *   updates        — 8 newest news, ≤60 tracker rows (label + notes), the 7
 *                    labels nearest today again (FAQ answers + status
 *                    chips), 5 results
 *   cutoff         — category-cutoff table, rank bands
 *   score-estimate — category-cutoff table, exam / answer-key / result labels
 * examWeek = a typed exam-day row within ±7 IST days (ExamWeekBlock renders).
 * present  = the data states that switch on a surface's `when` sections.
 */
export function examTwinTexts(input: ExamTwinInput, now: Date = new Date()): {
  texts: Record<ExamTwinSurface, string[]>;
  examWeek: boolean;
  neutral: string[];
  present: Record<ChromeCondition, boolean>;
} {
  const news = [...input.news].sort((a, b) => toMs(b.publishedAt) - toMs(a.publishedAt));
  const dates = [...input.dates].sort((a, b) => toMs(a.date) - toMs(b.date));
  const today = istDay(now);
  const nearest = [...dates].sort((a, b) => Math.abs(storedDay(a.date) - today) - Math.abs(storedDay(b.date) - today));
  const newsText = (n: { title: string; body: string }) => `${n.title} ${n.body}`;
  const dateText = (d: { label: string; notes: string | null }) => `${d.label} ${d.notes ?? ""}`;
  const bands = input.bands.map((b) => `${b.label} ${b.outcomes}`);
  const cutoff = input.cutoffContent ? [input.cutoffContent] : [];
  const examWeek = dates.some((d) => d.kind === "EXAM" && Math.abs(storedDay(d.date) - today) <= EXAM_WEEK_DAYS);
  return {
    texts: {
      hub: [
        ...news.slice(0, 5).map(newsText),
        ...nearest.slice(0, 12).map(dateText),
        input.exam.description ?? "",
        ...input.syllabus,
        ...input.mockTitles.slice(0, 40),
        ...bands,
      ],
      updates: [
        ...news.slice(0, 8).map(newsText),
        ...dates.slice(0, 60).map(dateText),
        ...nearest.slice(0, TRACKER_REPEATED_LABELS).map((d) => d.label),
        ...input.results.slice(0, 5).map((r) => `${r.stage} ${r.headline}`),
      ],
      cutoff: [...cutoff, ...bands],
      "score-estimate": [...cutoff, ...dates.filter((d) => SCORE_ESTIMATE_KINDS.has(d.kind ?? "")).slice(0, 6).map((d) => d.label)],
    },
    examWeek,
    neutral: [input.exam.name, input.exam.shortName, input.exam.code, input.exam.code.replace(/_/g, " ")],
    present: { dates: dates.length > 0, cutoffTable: !!input.cutoffContent && input.cutoffContent.includes("|") },
  };
}

export type ExamTwinVerdicts = Record<ExamTwinSurface, TwinVerdict>;

export function examTwinVerdicts(input: ExamTwinInput, now: Date = new Date()): ExamTwinVerdicts {
  const { texts, examWeek, neutral, present } = examTwinTexts(input, now);
  const out = {} as ExamTwinVerdicts;
  for (const s of EXAM_TWIN_SURFACES) out[s] = twinVerdict(s, texts[s], { neutral, examWeek, present });
  return out;
}

export interface CalendarTwinRow {
  label: string;
  kind: string | null;
  isExamDay: boolean;
  date: Date | string;
  examId: string;
  shortName: string;
}

const CALENDAR_WEEK_KINDS = new Set(["NOTIFICATION", "APPLICATION_START", "APPLICATION_END", "ADMIT_CARD", "ANSWER_KEY", "RESULT"]);

/** /exam-calendar body text: one label per (exam, exam day) from today on,
 *  ≤30 non-exam milestones within 7 days, ≤20 material headlines — exam
 *  short names stripped per row. */
export function calendarTwinTexts(
  rows: readonly CalendarTwinRow[],
  newsTitles: readonly { title: string; shortName: string }[],
  now: Date = new Date(),
): string[] {
  const today = istDay(now);
  const examDays = new Map<string, string>();
  const week: string[] = [];
  for (const r of rows) {
    const day = storedDay(r.date);
    if (day < today) continue;
    const label = stripNeutral(r.label, [r.shortName]);
    if (r.isExamDay) {
      const key = `${r.examId}:${day}`;
      if (!examDays.has(key)) examDays.set(key, label);
    } else if (day - today <= 7 && CALENDAR_WEEK_KINDS.has(r.kind ?? "") && week.length < 30) {
      week.push(label);
    }
  }
  return [...examDays.values(), ...week, ...newsTitles.slice(0, 20).map((n) => stripNeutral(n.title, [n.shortName]))];
}

// ── URL gating (sitemap / IndexNow) ─────────────────────────────────────

/**
 * Keep every non-twin URL; keep a /hi or /te twin only when its surface's
 * verdict for that exam (keyed by exam CODE) says it is localised. A twin
 * of a surface this gate does not measure is dropped — never submit an
 * unmeasured twin.
 */
export function gateTwinUrls(
  urls: readonly string[],
  examVerdicts: ReadonlyMap<string, Partial<ExamTwinVerdicts>>,
  calendar: TwinVerdict = NO_TWINS,
): string[] {
  return urls.filter((u) => {
    const m = u.match(/^https?:\/\/[^/]+\/(hi|te)(\/[^?#]*)?(?:[?#].*)?$/);
    if (!m) return true;
    const lc = m[1] as UrlLocale;
    const path = m[2] ?? "/";
    if (path === "/exam-calendar") return calendar[lc];
    const e = path.match(/^\/exams\/([^/]+)(?:\/(updates|cutoff|score-estimate))?\/?$/);
    if (!e) return false;
    const surface = (e[2] ?? "hub") as ExamTwinSurface;
    return examVerdicts.get(decodeURIComponent(e[1]))?.[surface]?.[lc] === true;
  });
}

// ── DB loaders (server only) ────────────────────────────────────────────

export interface ExamTwinRow {
  id: string;
  code: string;
  verdicts: ExamTwinVerdicts;
}

function groupByExam<T extends { examId: string }>(rows: readonly T[]): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const r of rows) {
    const list = out.get(r.examId);
    if (list) list.push(r);
    else out.set(r.examId, [r]);
  }
  return out;
}

/** Verdicts for the given exams (or every active exam) — a handful of
 *  batched reads; call once per sitemap build / cron run, never per exam in
 *  a loop. REJECTS when any read fails: a read that silently returned
 *  nothing would measure an exam as having no English DB text and declare
 *  its twins localised, so every caller treats a rejection as "no twins"
 *  (sitemap, IndexNow, the writer, getTwinVerdict). */
export async function loadTwinVerdicts(examIds: readonly string[] | "all", now: Date = new Date()): Promise<ExamTwinRow[]> {
  const [{ prisma }, { REAL_EXAM_WHERE }] = await Promise.all([import("@/lib/db/prisma"), import("@/lib/db/exam-scope")]);
  const exams = await prisma.exam.findMany({
    // 25 Sep 2026: "all" = real exams only (school class containers have no twins).
    where: examIds === "all" ? REAL_EXAM_WHERE : { id: { in: [...examIds] } },
    select: { id: true, code: true, name: true, shortName: true, description: true },
  });
  if (exams.length === 0) return [];
  const ids = exams.map((e) => e.id);
  const [news, dates, bands, subjects, mocks, results, cutoffs] = await Promise.all([
    prisma.examNewsItem.findMany({
      where: { examId: { in: ids }, archivedAt: null },
      select: { examId: true, title: true, body: true, publishedAt: true },
    }),
    prisma.examImportantDate.findMany({
      where: { examId: { in: ids }, archivedAt: null },
      select: { examId: true, label: true, notes: true, kind: true, date: true },
    }),
    prisma.examRankBand.findMany({
      where: { examId: { in: ids }, archivedAt: null },
      select: { examId: true, label: true, outcomes: true },
    }),
    prisma.subject.findMany({
      where: { examId: { in: ids } },
      select: { examId: true, name: true, topics: { where: { parentId: null }, select: { name: true } } },
    }),
    prisma.mock.findMany({
      where: { examId: { in: ids }, userId: null, generatedBy: { not: "live-test" } },
      select: { examId: true, title: true },
    }),
    prisma.$queryRaw<{ examId: string; headline: string; stage: string }[]>`
      SELECT "examId", headline, stage FROM "ExamResult"
      WHERE "examId" = ANY(${ids}::text[]) ORDER BY "declaredOn" DESC`,
    prisma.$queryRaw<{ examId: string; content: string }[]>`
      SELECT "examId", content FROM "ExamCategoryCutoff" WHERE "examId" = ANY(${ids}::text[])`,
  ]);
  const newsBy = groupByExam(news);
  const datesBy = groupByExam(dates);
  const bandsBy = groupByExam(bands);
  const subjectsBy = groupByExam(subjects);
  const mocksBy = groupByExam(mocks);
  const resultsBy = groupByExam(results);
  const cutoffBy = new Map(cutoffs.map((c) => [c.examId, c.content]));
  return exams.map((e) => ({
    id: e.id,
    code: e.code,
    verdicts: examTwinVerdicts(
      {
        exam: e,
        news: newsBy.get(e.id) ?? [],
        dates: datesBy.get(e.id) ?? [],
        results: resultsBy.get(e.id) ?? [],
        cutoffContent: cutoffBy.get(e.id) ?? null,
        bands: bandsBy.get(e.id) ?? [],
        syllabus: (subjectsBy.get(e.id) ?? []).flatMap((s) => [s.name, ...s.topics.map((t) => t.name)]),
        mockTitles: (mocksBy.get(e.id) ?? []).map((m) => m.title),
      },
      now,
    ),
  }));
}

const CALENDAR_HORIZON_DAYS = 120;

/** Verdict for /hi/exam-calendar and /te/exam-calendar — same reads as the
 *  page. Rejects when a read fails (callers treat that as no twins). */
export async function loadCalendarTwinVerdict(now: Date = new Date()): Promise<TwinVerdict> {
  const [{ prisma }, { MATERIAL_NEWS_RE }, { REAL_EXAM_WHERE }] = await Promise.all([
    import("@/lib/db/prisma"),
    import("@/lib/exam-timeline"),
    import("@/lib/db/exam-scope"),
  ]);
  const [rows, news] = await Promise.all([
    prisma.examImportantDate.findMany({
      where: {
        date: { gte: new Date(now.getTime() - 1.5 * DAY_MS), lte: new Date(now.getTime() + CALENDAR_HORIZON_DAYS * DAY_MS) },
        archivedAt: null,
        // 25 Sep 2026: real exams only, as on the calendar page itself.
        exam: REAL_EXAM_WHERE,
      },
      orderBy: { date: "asc" },
      take: 800,
      select: { label: true, kind: true, isExamDay: true, date: true, examId: true, exam: { select: { shortName: true } } },
    }),
    prisma.examNewsItem.findMany({
      where: { archivedAt: null, createdAt: { gte: new Date(now.getTime() - 14 * DAY_MS) }, exam: REAL_EXAM_WHERE },
      orderBy: { publishedAt: "desc" },
      take: 200,
      select: { title: true, examId: true, exam: { select: { shortName: true } } },
    }),
  ]);
  const seen = new Set<string>();
  const material = news.filter((n) => MATERIAL_NEWS_RE.test(n.title) && !seen.has(n.examId) && seen.add(n.examId));
  const texts = calendarTwinTexts(
    rows.map((r) => ({ label: r.label, kind: r.kind, isExamDay: r.isExamDay, date: r.date, examId: r.examId, shortName: r.exam.shortName })),
    material.map((n) => ({ title: n.title, shortName: n.exam.shortName })),
    now,
  );
  return twinVerdict("exam-calendar", texts);
}

// Page metadata runs per request: one cached read per exam (all four
// surfaces at once), 30 minutes, busted with the exam payload's tag.
const CACHE_SECONDS = 1800;
let examVerdictCache: ((examId: string) => Promise<ExamTwinVerdicts | null>) | null = null;
let calendarVerdictCache: (() => Promise<TwinVerdict>) | null = null;

/** Cached verdict for one exam surface. Any failure → not localised (never
 *  claim a Hindi / Telugu page we could not measure). A rejected load is
 *  never cached (unstable_cache stores resolved values only). */
export async function getTwinVerdict(surface: ExamTwinSurface, examId: string): Promise<TwinVerdict> {
  try {
    if (!examVerdictCache) {
      const { unstable_cache } = await import("next/cache");
      examVerdictCache = unstable_cache(
        async (id: string) => (await loadTwinVerdicts([id]))[0]?.verdicts ?? null,
        ["twin-verdicts-v2"],
        { revalidate: CACHE_SECONDS, tags: ["exam-shared"] },
      );
    }
    return (await examVerdictCache(examId))?.[surface] ?? NO_TWINS;
  } catch {
    return NO_TWINS;
  }
}

/** Cached verdict for the exam calendar twins. */
export async function getCalendarTwinVerdict(): Promise<TwinVerdict> {
  try {
    if (!calendarVerdictCache) {
      const { unstable_cache } = await import("next/cache");
      calendarVerdictCache = unstable_cache(() => loadCalendarTwinVerdict(), ["twin-verdict-calendar-v2"], { revalidate: CACHE_SECONDS });
    }
    return await calendarVerdictCache();
  } catch {
    return NO_TWINS;
  }
}
