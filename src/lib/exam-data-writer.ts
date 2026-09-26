// Shared writer for generated exam news + important dates (23 Aug 2026).
// Used by src/lib/exam-refresh-run.ts (the refresh-exam-data crons) and
// scripts/backfill-exam-news.ts so the two can't drift. Rules (all from
// the tracker honesty model):
//   • News keeps ONE permalink per story (13 Sep 2026, index shape). A new
//     generation that restates a live story UPDATES that row in place (word
//     for word → no write at all); a restatement of a story archived within
//     STORY_LOOKBACK_DAYS revives that row; only a genuinely new story
//     creates a row; only live rows the new generation no longer carries
//     are archived. Until then every run archived all live rows and
//     re-created them — 5,518 news URLs, ~84% restatements, every one a new
//     page for Bing. Matcher: src/lib/news-dedupe.ts. A WORDING-ONLY
//     restatement (same status, same years / numbers / months) keeps its
//     publishedAt and stored citation; a matched story whose status or
//     stated facts changed keeps its permalink but is re-dated like a new
//     row and carries only its own citation (review fix, 13 Sep 2026).
//   • ARCHIVE, don't delete, prior generated rows — but only when the new
//     generation actually returned rows of that type (an empty result must
//     never wipe a populated timeline).
//   • Never silently downgrade an OFFICIAL date to EXPECTED: a prior
//     official row (kind + calendar day) that the new run did not
//     re-confirm as official is KEPT live, and the new run's expected twin
//     for that same kind+day is dropped. A new OFFICIAL row for the same
//     kind+day supersedes the old one (archived like the rest).
//   • Absolute dates are stored at midnight UTC of the calendar day
//     (repo-wide convention: istDayNumber() maps that to the IST day).
//     Offset-only rows are ALSO stored at midnight UTC of the IST day
//     (istDayNumber(now) + offset) so their status/format agree across the
//     18:30–24:00 UTC window.
//   • News carries the cited URL in `url`; `source` stays the provenance
//     tag the cron keys staleness/archival on.
//   • A human beats the generator (16 Sep 2026). A generated story or
//     date matching one a human SUPPRESSED (archived as wrong, source
//     SUPPRESSED_SOURCE) is dropped, never re-created or revived. A
//     generated milestone near a curated row of the same kind (source not
//     generated — e.g. official-research rows read from the notice PDF) is
//     dropped: the curated row is the answer for that cycle. An "answer
//     key" row stored as OTHER is an ANSWER_KEY row and needs an official
//     citation like any other key date.
//   • IndexNow on fact changes (26 Sep 2026, G1): when a run changes the
//     exam's ANNOUNCED dates — a new official / reported date, a tier
//     upgrade, an announced date gone — the hub, tracker, exam calendar and
//     state page go to IndexNow for ANY exam, not only inside exam week.
//     Announced = sourceTier official or reported (src/lib/official-source.ts;
//     the stored confidence has no "reported" value, and a denylisted
//     citation is "expected"). The trigger is a DIFF of the announced fact set
//     (kind, IST day, tier) before and after the write — never "a date row was
//     written": every regeneration archives and re-creates its rows, so that
//     would ping unchanged pages on every refresh of every announced exam.

import type { PrismaClient } from "@prisma/client";
import type { DateKind, ExamInfoResult } from "@/lib/ai/exam-info";
import { ANSWER_KEY_LABEL, SUPPRESSED_SOURCE, resolveKind, rowCitation } from "@/lib/exam-timeline";
import { istDayNumber } from "@/lib/exam-phase";
import { examWeekUrls, factUrlsForExam, submitIndexNow } from "@/lib/indexnow";
import { sourceTier } from "@/lib/official-source";
import { STATES, stateSlug } from "@/lib/state-info";
import { planNewsWrites, sameStory, storyFeatures, STORY_LOOKBACK_DAYS, type NewsWritePlan } from "@/lib/news-dedupe";
import { gateTwinUrls, loadTwinVerdicts } from "@/lib/twin-localisation";

export const GEN_SOURCE = "ai-generated:claude";
export { SUPPRESSED_SOURCE };
// How close (days, either side) a generated milestone may sit to a curated
// row of the same kind before the curated row wins. EXAM stays tight so a
// later stage (Mains months after Prelims) is still written.
const CHANGE_NOTICE = /postpon|reschedul|revis|defer|corrigend|extend|new date|preponed/i;
const CURATED_WINDOW_DAYS: Partial<Record<DateKind, number>> = {
  NOTIFICATION: 60,
  APPLICATION_START: 60,
  APPLICATION_END: 60,
  ADMIT_CARD: 21,
  EXAM: 21,
  ANSWER_KEY: 30,
  RESULT: 30,
};
const MS_PER_DAY = 86_400_000;
// Exam Week Mode (6 Sep 2026): a write for an exam whose exam day is within
// this many days (either side) re-submits its hub / tracker / cutoff URLs
// to IndexNow immediately — the weekly sitemap ping is too slow that week.
const EXAM_WEEK_DAYS = 7;
// Archived rows (newest first) a restated story may revive.
const REVIVE_POOL = 200;

type Db = Pick<PrismaClient, "examNewsItem" | "examImportantDate" | "exam">;

/** One tracker row as the announced-fact diff reads it. */
export interface FactRow {
  kind: string | null;
  label: string;
  date: Date;
  isExamDay?: boolean | null;
  confidence?: string | null;
  url?: string | null;
  source?: string | null;
}

/** The exam's announced facts: "KIND|YYYY-MM-DD|tier" for every row whose
 *  tier is official or reported (26 Sep 2026). Labels are left out on
 *  purpose — a reworded label is not a new fact. `officialUrl` = the exam's
 *  portal (ExamEligibility), the same widening every date surface uses. */
export function announcedFactKeys(rows: readonly FactRow[], officialUrl?: string | null): Set<string> {
  const out = new Set<string>();
  for (const r of rows) {
    const tier = sourceTier(r.confidence, rowCitation(r), officialUrl);
    if (tier === "expected") continue;
    const kind = resolveKind({ kind: r.kind, label: r.label, isExamDay: !!r.isExamDay });
    out.add(`${kind}|${r.date.toISOString().slice(0, 10)}|${tier}`);
  }
  return out;
}

/** True when the two announced-fact sets differ in any key. */
export function announcedFactsChanged(before: ReadonlySet<string>, after: ReadonlySet<string>): boolean {
  if (before.size !== after.size) return true;
  for (const k of after) if (!before.has(k)) return true;
  return false;
}

export interface WriteResult {
  /** Items the generation returned. */
  news: number;
  /** New permalinks — genuinely new stories. */
  newsCreated: number;
  /** Existing permalinks updated in place (restatements, revived rows included). */
  newsUpdated: number;
  /** Of those, updates whose status or stated facts changed (re-dated, own citation only). */
  newsRefreshed: number;
  /** Restated word for word — nothing written. */
  newsUnchanged: number;
  /** Live rows archived because the new generation no longer carries them. */
  newsArchived: number;
  dates: number;
  keptOfficial: number;
  /** Generated stories dropped because they restate a suppressed one. */
  newsSuppressed: number;
  /** Generated dates dropped: suppressed, beside a curated row, or an uncited answer key. */
  datesDropped: number;
  /** True when a URL set was handed to IndexNow — the exam-week set, the
   *  announced-fact set, or both (acceptance is not reported here). */
  indexNow?: boolean;
  /** True when this run changed the exam's announced dates (26 Sep 2026). */
  factsChanged?: boolean;
}

export async function writeExamInfo(db: Db, examId: string, info: ExamInfoResult, now: Date = new Date()): Promise<WriteResult> {
  // ── news ────────────────────────────────────────────────────────────
  let plan: NewsWritePlan | null = null;
  let newsSuppressed = 0;
  if (info.news.length > 0) {
    const select = { id: true, title: true, body: true, url: true, archivedAt: true } as const;
    const [live, recentlyArchived, suppressed] = await Promise.all([
      db.examNewsItem.findMany({
        where: { examId, source: GEN_SOURCE, archivedAt: null },
        select,
        orderBy: { publishedAt: "desc" },
      }),
      db.examNewsItem.findMany({
        where: { examId, source: GEN_SOURCE, archivedAt: { gte: new Date(now.getTime() - STORY_LOOKBACK_DAYS * MS_PER_DAY) } },
        select,
        orderBy: { archivedAt: "desc" },
        take: REVIVE_POOL,
      }),
      db.examNewsItem.findMany({ where: { examId, source: SUPPRESSED_SOURCE }, select: { title: true }, take: REVIVE_POOL }),
    ]);
    // A restatement is suppressed only when it repeats every stated fact of
    // the suppressed headline (its numbers, months, years): an undated
    // "exam date postponed" may be a real new postponement.
    const suppressedStories = suppressed.map((s) => storyFeatures(s.title));
    const repeatsSuppressed = (title: string) => {
      const f = storyFeatures(title);
      return suppressedStories.some(
        (s) => sameStory(s, f) && [...s.details].every((x) => f.details.has(x)) && [...s.years].every((y) => f.years.has(y)),
      );
    };
    const incomingNews = info.news.filter((n) => !repeatsSuppressed(n.title));
    newsSuppressed = info.news.length - incomingNews.length;
    // Nothing left to write → nothing to archive either (an empty
    // generation must never wipe the live stories).
    if (incomingNews.length > 0) {
      plan = planNewsWrites([...live, ...recentlyArchived], incomingNews, now);
      for (const u of plan.update) {
        await db.examNewsItem.update({ where: { id: u.id }, data: u.data });
      }
      for (const c of plan.create) {
        await db.examNewsItem.create({ data: { examId, source: GEN_SOURCE, ...c } });
      }
      if (plan.archive.length > 0) {
        await db.examNewsItem.updateMany({
          where: { id: { in: plan.archive }, archivedAt: null },
          data: { archivedAt: now },
        });
      }
    }
  }

  // ── dates ───────────────────────────────────────────────────────────
  let keptOfficial = 0;
  let datesDropped = 0;
  let datesWritten = false;
  // Announced-fact diff inputs (26 Sep 2026): the live rows the run can
  // change, before and after it. Curated rows are never touched, so they sit
  // on both sides.
  const factsBefore: FactRow[] = [];
  const factsAfter: FactRow[] = [];
  if (info.dates.length > 0) {
    const todayIst = istDayNumber(now);
    const [curated, suppressedDates] = await Promise.all([
      // Curated = a human-verified OFFICIAL row with a kind (the 15 official-
      // research rows today) — not the untyped seed rows from launch.
      db.examImportantDate.findMany({
        where: {
          examId,
          archivedAt: null,
          confidence: "official",
          kind: { not: null },
          OR: [{ source: null }, { NOT: { source: { startsWith: "ai-generated" } } }],
        },
        select: { kind: true, label: true, date: true, isExamDay: true, confidence: true, url: true, source: true },
      }),
      db.examImportantDate.findMany({
        where: { examId, source: SUPPRESSED_SOURCE },
        select: { kind: true, label: true, date: true, isExamDay: true },
      }),
    ]);
    const dayKey = (kind: string, date: Date) => `${kind}|${date.toISOString().slice(0, 10)}`;
    const dayNo = (date: Date) => Math.floor(date.getTime() / MS_PER_DAY);
    const suppressedKeys = new Set(suppressedDates.map((s) => dayKey(resolveKind(s), s.date)));
    const generated = info.dates.map((d) => {
      const date = d.date ? new Date(`${d.date}T00:00:00Z`) : new Date((todayIst + d.daysFromNow) * MS_PER_DAY);
      const kind: DateKind = d.kind === "OTHER" && ANSWER_KEY_LABEL.test(d.label) ? "ANSWER_KEY" : d.kind;
      return { d, kind, date, key: dayKey(kind, date) };
    });
    const incoming = generated.filter(({ d, kind, date, key }) => {
      if (kind === "ANSWER_KEY" && !(d.confidence === "official" && d.source)) return false;
      if (suppressedKeys.has(key)) return false;
      const window = CURATED_WINDOW_DAYS[kind];
      if (window === undefined) return true;
      const near = curated.filter((c) => resolveKind(c) === kind && Math.abs(dayNo(c.date) - dayNo(date)) <= window);
      if (near.length === 0) return true;
      // An officially cited change must get through: a postponement or
      // corrigendum notice, or a cited date later than every curated row of
      // that kind. A same-day or earlier generated copy (the 15 Sep MP RAEO
      // rows) is still dropped.
      if (d.confidence === "official" && d.source) {
        if (CHANGE_NOTICE.test(`${d.label} ${d.notes ?? ""}`)) return true;
        if (near.every((c) => dayNo(date) > dayNo(c.date))) return true;
      }
      return false;
    });
    datesDropped = generated.length - incoming.length;
    const incomingOfficialKeys = new Set(incoming.filter((x) => x.d.confidence === "official").map((x) => x.key));

    // Prior official rows the new run did NOT re-confirm as official stay live.
    const prior = await db.examImportantDate.findMany({
      where: { examId, source: GEN_SOURCE, archivedAt: null },
      select: { id: true, kind: true, label: true, date: true, confidence: true, url: true, isExamDay: true },
    });
    factsBefore.push(...curated, ...prior);
    const keepIds: string[] = [];
    const keptKeys = new Set<string>();
    for (const p of prior) {
      if (p.confidence !== "official" || !p.url || !p.kind) continue;
      const key = dayKey(p.kind === "OTHER" && ANSWER_KEY_LABEL.test(p.label) ? "ANSWER_KEY" : p.kind, p.date);
      if (!incomingOfficialKeys.has(key)) {
        keepIds.push(p.id);
        keptKeys.add(key);
      }
    }
    keptOfficial = keepIds.length;

    // Everything the run returned was dropped → keep the live generation.
    if (incoming.length > 0) {
    datesWritten = true;
    factsAfter.push(...curated, ...prior.filter((p) => keepIds.includes(p.id)));
    await db.examImportantDate.updateMany({
      where: { examId, source: GEN_SOURCE, archivedAt: null, ...(keepIds.length ? { id: { notIn: keepIds } } : {}) },
      data: { archivedAt: now },
    });
    for (const { d, date, key } of incoming) {
      // The expected twin of a kept official row would contradict it — drop.
      if (d.confidence !== "official" && keptKeys.has(key)) continue;
      await db.examImportantDate.create({
        data: {
          examId,
          label: d.label,
          date,
          isExamDay: d.isExamDay,
          notes: d.notes,
          source: GEN_SOURCE,
          // The stored kind stays as generated: readers resolve an answer-key
          // label on OTHER, and exam-alerts compares stored kinds.
          kind: d.kind,
          confidence: d.confidence,
          url: d.source ?? null,
        },
      });
      factsAfter.push({ kind: d.kind, label: d.label, date, isExamDay: d.isExamDay, confidence: d.confidence, url: d.source ?? null, source: GEN_SOURCE });
    }
    }
  }

  // ── IndexNow: exam week, and announced-fact changes ─────────────────
  // Exam week: only when the exam's pages actually changed — a new story, a
  // story that came back or left, a story whose status or stated facts
  // changed, or a new tracker generation; a wording-only restatement is not
  // a change (13 Sep 2026) — and only for an exam with a live TYPED
  // exam-day row within ±7 days (legacy untyped rows never trigger).
  // Fact changes (26 Sep 2026): for ANY exam whose announced-date set
  // (announcedFactKeys) differs after this run — hub, tracker, exam
  // calendar, state page (factUrlsForExam). Both sets are merged,
  // de-duplicated and sent in ONE submission. Hindi / Telugu twins go only
  // when localised (src/lib/twin-localisation.ts); a failed measurement
  // withholds them. The daily indexnow-examweek cron is the safety net for
  // the last exam of a run.
  let indexNow = false;
  let factsChanged = false;
  const newsChanged = plan !== null && plan.create.length + plan.archive.length + plan.revived + plan.refreshed > 0;
  if (newsChanged || datesWritten) {
    const todayIst = istDayNumber(now);
    const from = new Date((todayIst - EXAM_WEEK_DAYS) * MS_PER_DAY);
    const to = new Date((todayIst + EXAM_WEEK_DAYS + 1) * MS_PER_DAY);
    const near = await db.examImportantDate
      .findFirst({
        where: { examId, archivedAt: null, kind: "EXAM", date: { gte: from, lt: to } },
        select: { id: true },
      })
      .catch(() => null);
    if (near || datesWritten) {
      const exam = await db.exam
        .findUnique({ where: { id: examId }, select: { code: true, state: true, eligibility: { select: { officialUrl: true } } } })
        .catch(() => null);
      if (exam?.code) {
        const officialUrl = exam.eligibility?.officialUrl ?? null;
        factsChanged = datesWritten && announcedFactsChanged(announcedFactKeys(factsBefore, officialUrl), announcedFactKeys(factsAfter, officialUrl));
        const urls: string[] = [];
        if (factsChanged) urls.push(...factUrlsForExam(exam.code, exam.state && exam.state in STATES ? stateSlug(exam.state) : null));
        if (near) {
          // /cutoff only when the page renders; a failed gate read withholds it
          // (16 Sep 2026, src/lib/exam-page-gates.ts).
          const { examPageGates, GATES_CLOSED } = await import("@/lib/exam-page-gates");
          const pageGates = await examPageGates(exam.code, GATES_CLOSED);
          urls.push(...examWeekUrls(exam.code, pageGates));
        }
        if (urls.length > 0) {
          indexNow = true;
          // Awaited (10 s cap inside submitIndexNow): a detached fetch can be
          // dropped when the cron's function returns right after the last exam.
          const twins = await loadTwinVerdicts([examId], now).catch(() => []);
          await submitIndexNow(gateTwinUrls([...new Set(urls)], new Map(twins.map((t) => [t.code, t.verdicts]))));
        }
      }
    }
  }

  return {
    news: info.news.length,
    newsCreated: plan?.create.length ?? 0,
    newsUpdated: plan?.update.length ?? 0,
    newsRefreshed: plan?.refreshed ?? 0,
    newsUnchanged: plan?.unchanged.length ?? 0,
    newsArchived: plan?.archive.length ?? 0,
    dates: info.dates.length,
    keptOfficial,
    newsSuppressed,
    datesDropped,
    indexNow,
    factsChanged,
  };
}
