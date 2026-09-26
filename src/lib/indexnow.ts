// IndexNow — instant "this URL changed" pings to Bing/Yandex/etc. (Bing
// feeds ChatGPT search and Copilot). One shared helper (23 Aug 2026)
// replacing the three inline copies (results-extract, the weekly cron,
// the CLI). The key is public by design — it lives at /<key>.txt.
//
// 6 Sep 2026 (Exam Week Mode): event-driven submissions. The weekly
// sitemap re-submission is too slow for exam week, when /updates, /cutoff
// and the hub change daily and a phase article appears the same day —
// so the exam-data writer, the phase-article cron and the daily
// ?scope=examweek cron submit the exam-week URL set directly.

import type { ExamPageGates } from "@/lib/exam-page-gates";
import { SCHOOL_HUB_PATH, SCHOOL_STREAMS_PATH } from "@/lib/school/landings";
import {
  SCHOOL_BOARDS,
  isSchoolChapterIndexable,
  schoolBoardPath,
  schoolChapterPath,
  schoolClassPath,
  schoolSubjectPath,
  type SchoolSurface,
} from "@/lib/school/surface";

const INDEXNOW_HOST = "shishya.in";
export const INDEXNOW_KEY = "7e0b8421fc95cdb98187e2b89a6e2437";
export const SITE_ORIGIN = `https://${INDEXNOW_HOST}`;
const CHUNK = 10_000;
// A hanging api.indexnow.org must never hold a cron / writer open.
const FETCH_TIMEOUT_MS = 10_000;

/** Best-effort; never throws. Returns the number of chunks accepted. */
export async function pingIndexNow(urls: string[]): Promise<number> {
  const list = [...new Set(urls.filter((u) => typeof u === "string" && u.startsWith("https://")))];
  if (!list.length) return 0;
  let ok = 0;
  for (let i = 0; i < list.length; i += CHUNK) {
    try {
      const res = await fetch("https://api.indexnow.org/IndexNow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          host: INDEXNOW_HOST,
          key: INDEXNOW_KEY,
          keyLocation: `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`,
          urlList: list.slice(i, i + CHUNK),
        }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (res.ok || res.status === 202) ok++;
    } catch {
      /* best-effort — the weekly cron re-submits the whole sitemap anyway */
    }
  }
  return ok;
}

/** Fire-and-forget form for write paths: `void submitIndexNow(urls)`.
 *  Never rejects, never throws; resolves to the number of chunks accepted
 *  so callers that do await it can report the count. */
export function submitIndexNow(urls: string[]): Promise<number> {
  return pingIndexNow(urls).catch(() => 0);
}

/** The exam-week URL set for one exam: hub, tracker, cutoff, the
 *  fact-built checklist / exam-day / after-the-paper pages (13 Sep 2026),
 *  plus the Hindi/Telugu hub + tracker twins. Callers MUST pass the result
 *  through gateTwinUrls (src/lib/twin-localisation.ts): a twin that is not
 *  localised canonicalises to English and is never submitted.
 *  /cutoff only when the page renders (16 Sep 2026, src/lib/exam-page-gates.ts):
 *  MP_RAEO/cutoff and KA_KSRP/cutoff (no rank bands, 404) were in this set
 *  for their whole exam week. Callers on a failed gate read pass GATES_CLOSED. */
export function examWeekUrls(code: string, gates: Pick<ExamPageGates, "cutoff">): string[] {
  const b = SITE_ORIGIN;
  return [
    `${b}/exams/${code}`,
    `${b}/exams/${code}/updates`,
    ...(gates.cutoff ? [`${b}/exams/${code}/cutoff`] : []),
    `${b}/exams/${code}/checklist`,
    `${b}/exams/${code}/live`,
    `${b}/exams/${code}/reactions`,
    `${b}/hi/exams/${code}`,
    `${b}/te/exams/${code}`,
    `${b}/hi/exams/${code}/updates`,
    `${b}/te/exams/${code}/updates`,
  ];
}

/** Canonical URL of a phase article (/checklist, /live, /reactions). */
export function phaseArticleUrl(code: string, slug: string): string {
  return `${SITE_ORIGIN}/exams/${code}/${slug}`;
}

// ── Fact changes (26 Sep 2026, G1 index hygiene) ─────────────────────────
// Until today only an exam INSIDE its exam week pinged IndexNow when the
// refresh writer changed it; a notification or exam date announced months
// ahead waited for the weekly sitemap re-submission, while Bing — and
// ChatGPT search on top of it — kept serving the old "not announced yet".
// The writer (src/lib/exam-data-writer.ts) now calls these when the set of
// ANNOUNCED dates changed (a new official / reported date, or a tier
// upgrade), for any exam; the official-data import scripts call
// officialDataUrls after --apply --indexnow.

/** The pages that print an exam's announced dates: the hub, the tracker,
 *  the all-exam calendar and (for a state exam) its state page, plus the
 *  hub / tracker twins. Callers MUST pass the result through gateTwinUrls
 *  (src/lib/twin-localisation.ts) — a twin that is not localised is never
 *  submitted. `stateSlug` = src/lib/state-info.ts stateSlug(Exam.state), or
 *  null for a national exam. */
export function factUrlsForExam(code: string, stateSlug: string | null | undefined): string[] {
  const b = SITE_ORIGIN;
  return [
    `${b}/exams/${code}`,
    `${b}/exams/${code}/updates`,
    `${b}/exam-calendar`,
    ...(stateSlug ? [`${b}/exams/state/${stateSlug}`] : []),
    `${b}/hi/exams/${code}`,
    `${b}/te/exams/${code}`,
    `${b}/hi/exams/${code}/updates`,
    `${b}/te/exams/${code}/updates`,
  ];
}

/** The pages an official-data import changes: the hub (official papers and
 *  published cutoffs are summarised there), /cutoff when cutoff rows were
 *  written AND the page renders (it 404s without rank bands), and each
 *  /pyq/{year} that is indexable (a year with validated PYQ questions — an
 *  official-paper-only year renders noindex and is never submitted). */
export function officialDataUrls(
  code: string,
  opts: { cutoff?: boolean; pyqYears?: readonly (number | string)[] } = {},
): string[] {
  const b = SITE_ORIGIN;
  const years = [...new Set((opts.pyqYears ?? []).map((y) => String(y).trim()).filter((y) => /^(19|20)\d{2}$/.test(y)))].sort();
  return [
    `${b}/exams/${code}`,
    ...(opts.cutoff ? [`${b}/exams/${code}/cutoff`] : []),
    ...years.map((y) => `${b}/exams/${code}/pyq/${y}`),
  ];
}

// ── Whole-education sections (26 Sep 2026, B-machine-crawl) ─────────────
// Until today nothing submitted a school, section or current-affairs URL:
// the weekly news scope sends news permalinks only, and the school pages
// went live the same day. Pure builders — the callers (the news cron, the
// post-deploy submit) decide when to send them. The school set reuses the
// surface's slug helpers and the chapter page's own indexable rule
// (isSchoolChapterIndexable): a chapter without Shishya's content is
// noindex and is never submitted.

/** Every school URL worth submitting: the section hub, the streams
 *  article, each board with a seeded class, every class page, and each
 *  chapter that passes the indexable rule together with its subject page.
 *  Empty on an empty surface (a failed read submits nothing). */
export function schoolIndexableUrls(surface: Pick<SchoolSurface, "classes">, base: string = SITE_ORIGIN): string[] {
  if (surface.classes.length === 0) return [];
  const out = new Set<string>([`${base}${SCHOOL_HUB_PATH}`, `${base}${SCHOOL_STREAMS_PATH}`]);
  for (const b of SCHOOL_BOARDS) {
    if (surface.classes.some((c) => c.boardSlug === b.slug)) out.add(`${base}${schoolBoardPath(b.slug)}`);
  }
  for (const c of surface.classes) {
    out.add(`${base}${schoolClassPath(c.boardSlug, c.cls)}`);
    for (const s of c.subjects) {
      for (const ch of s.chapters) {
        if (!isSchoolChapterIndexable(ch)) continue;
        out.add(`${base}${schoolSubjectPath(c.boardSlug, c.cls, s.slug)}`);
        out.add(`${base}${schoolChapterPath(c.boardSlug, c.cls, s.slug, ch.slug)}`);
      }
    }
  }
  return [...out];
}

/** Key of one school chapter for schoolChapterUpdateUrls: container code +
 *  chapter (top-level Topic) code, e.g. "NCERT_C06|fegp1.ch01". */
export function schoolChapterKey(examCode: string, topicCode: string): string {
  return `${examCode}|${topicCode}`;
}

/** The pages that change when a chapter gains Shishya content: the chapter,
 *  its subject page and its class page — only for chapters that now pass the
 *  indexable rule. */
export function schoolChapterUpdateUrls(surface: Pick<SchoolSurface, "classes">, keys: ReadonlySet<string>, base: string = SITE_ORIGIN): string[] {
  const out = new Set<string>();
  if (keys.size === 0) return [];
  for (const c of surface.classes) {
    for (const s of c.subjects) {
      for (const ch of s.chapters) {
        if (!keys.has(schoolChapterKey(c.examCode, ch.code)) || !isSchoolChapterIndexable(ch)) continue;
        out.add(`${base}${schoolChapterPath(c.boardSlug, c.cls, s.slug, ch.slug)}`);
        out.add(`${base}${schoolSubjectPath(c.boardSlug, c.cls, s.slug)}`);
        out.add(`${base}${schoolClassPath(c.boardSlug, c.cls)}`);
      }
    }
  }
  return [...out];
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Each current-affairs day URL plus its month capsule (deduplicated, in
 *  input order). Accepts DB Dates (@db.Date = UTC midnight) or YYYY-MM-DD. */
export function currentAffairsUrls(dates: readonly (Date | string)[], base: string = SITE_ORIGIN): string[] {
  const out = new Set<string>();
  for (const d of dates) {
    const day = d instanceof Date ? (Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10)) : String(d).slice(0, 10);
    if (!ISO_DAY.test(day)) continue;
    out.add(`${base}/current-affairs/${day}`);
    out.add(`${base}/current-affairs/capsule/${day.slice(0, 7)}`);
  }
  return [...out];
}

/** The section hubs of the whole-education platform. /exams/entrance is
 *  built by the sections workflow (26 Sep 2026) — check it renders before
 *  submitting. */
export const SECTION_HUB_PATHS: readonly string[] = [
  "/",
  SCHOOL_HUB_PATH,
  "/exams/entrance",
  "/exams/browse",
  "/exams/state",
  "/colleges",
  "/scholarships",
  "/distance-learning",
  "/careers",
  "/career-map",
  "/jobs",
  "/post-graduation",
  "/worldwide",
  "/insights",
  "/current-affairs",
  "/exam-calendar",
  "/ask",
];

export function sectionHubUrls(base: string = SITE_ORIGIN): string[] {
  return SECTION_HUB_PATHS.map((p) => (p === "/" ? base : `${base}${p}`));
}

/** The machine files an AI crawler reads first (llms*, the platform and
 *  section context files). */
export const MACHINE_FILE_PATHS: readonly string[] = [
  "/llms.txt",
  "/llms-full.txt",
  "/context.md",
  `${SCHOOL_HUB_PATH}/context.md`,
  "/colleges/context.md",
  "/scholarships/context.md",
  "/careers/context.md",
];

export function machineFileUrls(base: string = SITE_ORIGIN): string[] {
  return MACHINE_FILE_PATHS.map((p) => `${base}${p}`);
}
