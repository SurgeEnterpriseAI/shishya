// Official watch — the DB layer (30 Sep 2026). The rules live in
// src/lib/answer-key-watch.ts (pure); this file only reads and writes.
//
//   • ensureOfficialWatchTables — CREATE TABLE IF NOT EXISTS for
//     "OfficialWatch" and "OfficialWatchHit" (the repo's raw-SQL ensure
//     pattern, as "OfficialPaper"; never prisma migrate / db push on the live
//     DB). Called by the first non-dry run and the crawl's --apply. Every
//     reader tolerates the tables not existing yet (a dry run before the
//     first apply reads none).
//   • loadDueInputs — real exams (REAL_EXAM_SQL) with an exam day in the last
//     180 days or an answer-key / result row near today, with their live rows
//     and the last cycle's result lag.
//   • loadWatches / loadKnownLinks — the listing pages and every link already
//     known for the exam (baselines, earlier hits, official-watch and
//     human-suppressed rows, live or archived).
//   • writeRelease — one verified release: the ExamImportantDate row
//     (confidence 'official', source OFFICIAL_WATCH_SOURCE, url = the body's
//     file), the generated rows of the same kind within ±30 days archived
//     (expected → official upgrade) when they name the same stage / sitting
//     and version (isTwinOfRelease), the OfficialWatchHit log (answer-key
//     PDFs queued for the local importer), and IndexNow for the pages that
//     changed. A human-suppressed row for the same day or link blocks it.

import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { REAL_EXAM_SQL } from "@/lib/db/exam-scope";
import { GEN_SOURCE } from "@/lib/exam-data-writer";
import { OFFICIAL_WATCH_SOURCE, SUPPRESSED_SOURCE, resolveKind } from "@/lib/exam-timeline";
import { istDayNumber } from "@/lib/exam-phase";
import { examFamilyMarkers, familyOf, hasFamily, markerConflict, releaseVersion, sittingMarkers, sittingMarkersOf } from "@/lib/sitting-markers";
import {
  RESULT_DUE_EXAM_DAYS,
  ROW_DUE_AHEAD_DAYS,
  ROW_DUE_BACK_DAYS,
  TWIN_ARCHIVE_DAYS,
  dayToDate,
  normLink,
  type DueExamInput,
  type FetchMode,
  type VerifiedRelease,
  type WatchKind,
} from "@/lib/answer-key-watch";

const DAY_MS = 86_400_000;

export const ENSURE_OFFICIAL_WATCH_SQL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS "OfficialWatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "listingUrl" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "fetchMode" TEXT NOT NULL DEFAULT 'html',
    "singleExam" BOOLEAN NOT NULL DEFAULT false,
    "heading" TEXT NOT NULL DEFAULT '',
    "examTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "baselineLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastCycle" JSONB,
    "lagDays" INTEGER,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3)
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "OfficialWatch_examId_kind_listingUrl_key" ON "OfficialWatch"("examId", "kind", "listingUrl")`,
  `CREATE INDEX IF NOT EXISTS "OfficialWatch_examId_idx" ON "OfficialWatch"("examId")`,
  `CREATE TABLE IF NOT EXISTS "OfficialWatchHit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examId" TEXT NOT NULL,
    "watchId" TEXT,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "listingUrl" TEXT NOT NULL DEFAULT '',
    "host" TEXT NOT NULL,
    "anchorText" TEXT NOT NULL DEFAULT '',
    "releasedOn" TIMESTAMP(3) NOT NULL,
    "dateSource" TEXT NOT NULL,
    "via" TEXT NOT NULL,
    "dateRowId" TEXT,
    "isPdf" BOOLEAN NOT NULL DEFAULT false,
    "cycleYear" TEXT NOT NULL DEFAULT '',
    "stage" TEXT NOT NULL DEFAULT '',
    "importStatus" TEXT NOT NULL DEFAULT 'n/a',
    "importNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "OfficialWatchHit_examId_url_key" ON "OfficialWatchHit"("examId", "url")`,
  `CREATE INDEX IF NOT EXISTS "OfficialWatchHit_importStatus_idx" ON "OfficialWatchHit"("importStatus")`,
];

type RawDb = Pick<PrismaClient, "$executeRawUnsafe" | "$queryRaw" | "$executeRaw">;
export type WatchDb = RawDb & Pick<PrismaClient, "examImportantDate">;

export async function ensureOfficialWatchTables(db: Pick<PrismaClient, "$executeRawUnsafe">): Promise<void> {
  for (const sql of ENSURE_OFFICIAL_WATCH_SQL) await db.$executeRawUnsafe(sql);
}

/** Has the ensure run? Read from the catalog, so a dry run before the first
 *  apply reads no watch tables and logs no "relation does not exist". */
export async function watchTablesExist(db: Pick<PrismaClient, "$queryRaw">): Promise<boolean> {
  const r = await db
    .$queryRaw<{ ok: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = current_schema() AND table_name = 'OfficialWatchHit'
      ) AS ok`
    .catch(() => [] as { ok: boolean }[]);
  return r[0]?.ok === true;
}

// ── reads ────────────────────────────────────────────────────────────────

export interface LastCycle {
  examDay: string | null;
  releasedOn: string | null;
  url: string | null;
  /** "printed" = read beside the link on the official page; "research" =
   *  the crawl's research only (drives the expected window, nothing else). */
  dateSource?: "printed" | "research";
}

export interface WatchRow {
  id: string;
  examId: string;
  kind: WatchKind;
  listingUrl: string;
  host: string;
  fetchMode: FetchMode;
  singleExam: boolean;
  heading: string;
  examTerms: string[];
  baselineLinks: string[];
  lastCycle: LastCycle | null;
  lagDays: number | null;
}

export interface DueExamRecord extends DueExamInput {
  state: string | null;
}

/** Real exams with an exam day in the last RESULT_DUE_EXAM_DAYS days, or an
 *  answer-key / result row dated today-21..today+7, with their live rows
 *  (−200 d … +30 d) and the last cycle's result lag. */
export async function loadDueInputs(db: WatchDb, now: Date, only?: readonly string[]): Promise<DueExamRecord[]> {
  const today = istDayNumber(now);
  const examFrom = dayToDate(today - RESULT_DUE_EXAM_DAYS);
  const examTo = dayToDate(today);
  const rowFrom = dayToDate(today - ROW_DUE_BACK_DAYS);
  const rowTo = dayToDate(today + ROW_DUE_AHEAD_DAYS);
  const onlyCodes = only && only.length ? [...only] : null;
  const exams = await db.$queryRaw<{ id: string; code: string; shortName: string; name: string; state: string | null; officialUrl: string | null }[]>`
    SELECT e.id, e.code, e."shortName", e.name, e.state, el."officialUrl"
    FROM "Exam" e
    LEFT JOIN "ExamEligibility" el ON el."examId" = e.id
    WHERE ${REAL_EXAM_SQL}
      AND (${onlyCodes}::text[] IS NULL OR e.code = ANY(${onlyCodes}::text[]))
      AND EXISTS (
        SELECT 1 FROM "ExamImportantDate" d
        WHERE d."examId" = e.id AND d."archivedAt" IS NULL AND (
          ((d.kind = 'EXAM' OR (d.kind IS NULL AND d."isExamDay" = TRUE)) AND d.date >= ${examFrom} AND d.date <= ${examTo})
          OR (d.date >= ${rowFrom} AND d.date <= ${rowTo}
              AND (d.kind IN ('ANSWER_KEY', 'RESULT') OR d.label ~* 'answer[[:space:]-]*key|result'))
        )
      )
    ORDER BY e.code`;
  if (exams.length === 0) return [];
  const ids = exams.map((e) => e.id);
  const rows = await db.$queryRaw<
    { id: string; examId: string; label: string; date: Date; isExamDay: boolean; kind: string | null; confidence: string | null; url: string | null; source: string | null; notes: string | null }[]
  >`
    SELECT id, "examId", label, date, "isExamDay", kind, confidence, url, source, notes
    FROM "ExamImportantDate"
    WHERE "archivedAt" IS NULL AND "examId" IN (${Prisma.join(ids)})
      AND date >= ${dayToDate(today - RESULT_DUE_EXAM_DAYS - 20)} AND date <= ${dayToDate(today + 30)}
    ORDER BY date ASC, id ASC`;
  const lags = (await watchTablesExist(db))
    ? await db
        .$queryRaw<{ examId: string; kind: string; lagDays: number | null }[]>`
          SELECT "examId", kind, "lagDays" FROM "OfficialWatch"
          WHERE "archivedAt" IS NULL AND "lagDays" IS NOT NULL AND "examId" IN (${Prisma.join(ids)})`
        .catch(() => [] as { examId: string; kind: string; lagDays: number | null }[])
    : [];
  const byExam = new Map<string, DueExamRecord>();
  for (const e of exams) {
    byExam.set(e.id, { examId: e.id, code: e.code, shortName: e.shortName, name: e.name, portalUrl: e.officialUrl, state: e.state, rows: [], lagDays: {} });
  }
  for (const r of rows) byExam.get(r.examId)?.rows.push(r);
  for (const l of lags) {
    const rec = byExam.get(l.examId);
    if (rec && (l.kind === "ANSWER_KEY" || l.kind === "RESULT") && typeof l.lagDays === "number") {
      const cur = rec.lagDays![l.kind];
      rec.lagDays![l.kind] = typeof cur === "number" ? Math.min(cur, l.lagDays) : l.lagDays;
    }
  }
  return [...byExam.values()];
}

/** Live watch pages of these exams; none when the table does not exist yet. */
export async function loadWatches(db: RawDb, examIds: readonly string[]): Promise<WatchRow[]> {
  if (examIds.length === 0 || !(await watchTablesExist(db))) return [];
  const rows = await db
    .$queryRaw<WatchRow[]>`
      SELECT id, "examId", kind, "listingUrl", host, "fetchMode", "singleExam", heading,
             COALESCE("examTerms", ARRAY[]::TEXT[]) AS "examTerms", COALESCE("baselineLinks", ARRAY[]::TEXT[]) AS "baselineLinks",
             "lastCycle", "lagDays"
      FROM "OfficialWatch"
      WHERE "archivedAt" IS NULL AND "examId" IN (${Prisma.join([...examIds])})
      ORDER BY "examId", kind, "listingUrl"`
    .catch(() => [] as WatchRow[]);
  return rows.map((r) => ({ ...r, examTerms: r.examTerms ?? [], baselineLinks: r.baselineLinks ?? [] }));
}

/** Every link already known per exam (normLink'd): the watch pages'
 *  baselines, earlier hits, and the links of official-watch and suppressed
 *  rows (live or archived). */
export async function loadKnownLinks(db: RawDb, examIds: readonly string[], watches: readonly WatchRow[]): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>();
  const add = (examId: string, url: string | null | undefined) => {
    if (!url) return;
    const set = out.get(examId) ?? new Set<string>();
    set.add(normLink(url));
    out.set(examId, set);
  };
  for (const id of examIds) out.set(id, new Set());
  for (const w of watches) for (const l of w.baselineLinks) add(w.examId, l);
  if (examIds.length === 0) return out;
  const ids = Prisma.join([...examIds]);
  const hasTables = await watchTablesExist(db);
  const [hits, rows] = await Promise.all([
    hasTables
      ? db.$queryRaw<{ examId: string; url: string }[]>`SELECT "examId", url FROM "OfficialWatchHit" WHERE "examId" IN (${ids})`.catch(
          () => [] as { examId: string; url: string }[],
        )
      : Promise.resolve([] as { examId: string; url: string }[]),
    db.$queryRaw<{ examId: string; url: string | null }[]>`
      SELECT "examId", url FROM "ExamImportantDate"
      WHERE "examId" IN (${ids}) AND url IS NOT NULL AND source IN (${OFFICIAL_WATCH_SOURCE}, ${SUPPRESSED_SOURCE})`.catch(
      () => [] as { examId: string; url: string | null }[],
    ),
  ]);
  for (const h of hits) add(h.examId, h.url);
  for (const r of rows) add(r.examId, r.url);
  return out;
}

// ── writes ───────────────────────────────────────────────────────────────

export interface WriteReleaseArgs {
  /** shortName: the exam's printed sitting ordinal ("NDA 2") for the twin
   *  filter; optional (the code stands in). */
  exam: { id: string; code: string; state: string | null; shortName?: string };
  release: VerifiedRelease;
  label: string;
  /** The VERIFIED stage (VerifiedRelease.stage — what the body printed), for
   *  the hit log and the twin filter. 1 Oct 2026: it was the tracker's latest
   *  sitting, so a PCB result carried "PCM Group Second Attempt exam" and
   *  would have archived the PCM estimate row. release.stage wins when set. */
  stage: string;
  cycleYear: string;
  watchId: string | null;
  /** Other verified links of the same release seen in the same run (a
   *  response-sheet link beside the key): logged as hits so they are never
   *  taken for a new release, never written as rows of their own. */
  siblings?: readonly VerifiedRelease[];
  now: Date;
  dry: boolean;
  indexNow: boolean;
  /** "crawl" when the one-time crawl wrote it. */
  via?: "html" | "ai" | "crawl";
}

export interface WriteReleaseResult {
  status: "written" | "dry-run" | "skipped";
  reason?: string;
  rowId?: string;
  archivedTwins: number;
  indexNowUrls: number;
}

/** Is a generated row the same event as the release? Review, 30 Sep 2026:
 *  every generated row of the kind within ±30 days was archived, so a
 *  provisional key archived the "Final answer key (expected)" row and a Tier 1
 *  result archived the row announcing another stage's result — information
 *  lost, not the planned upgrade. Now a twin must name no other stage /
 *  sitting than the release (its text + the VERIFIED stage — 1 Oct 2026:
 *  never the tracker's latest sitting, which let a PCB result's "PCM Group
 *  Second Attempt exam" archive the PCM estimate; src/lib/sitting-markers.ts)
 *  and no other version (provisional vs final key, written vs final result).
 *  Any tier: a same-stage AI row citing a coaching site IS the row the
 *  official one replaces. 1 Oct 2026 (independent review of the gate fix): a
 *  row naming a family the release does not name at all ("Tier 2 result
 *  (expected)" beside SSC's FRTA shortlist, whose row and verified stage name
 *  no tier) is kept — never archived on a guess. */
export function isTwinOfRelease(
  row: { label: string },
  release: Pick<VerifiedRelease, "kind" | "text">,
  stage: string,
  names: readonly string[],
): boolean {
  const mine = sittingMarkersOf([release.text, stage], names);
  for (const m of examFamilyMarkers(names)) mine.add(m);
  const its = sittingMarkers(row.label, names);
  if (markerConflict(mine, its)) return false;
  if ([...its].some((m) => !hasFamily(mine, familyOf(m)))) return false;
  const a = releaseVersion(release.kind, release.text);
  const b = releaseVersion(release.kind, row.label);
  return !(a && b && a !== b);
}

/** Ids of live generated rows of this kind within ±TWIN_ARCHIVE_DAYS of the
 *  release day that are the same event (isTwinOfRelease) — the estimates the
 *  release replaces. */
async function twinIds(db: WatchDb, a: WriteReleaseArgs): Promise<string[]> {
  const { release } = a;
  const day = release.releasedOn;
  const from = new Date(day.getTime() - TWIN_ARCHIVE_DAYS * DAY_MS);
  const to = new Date(day.getTime() + TWIN_ARCHIVE_DAYS * DAY_MS);
  const gen = await db.examImportantDate.findMany({
    where: { examId: a.exam.id, source: GEN_SOURCE, archivedAt: null, date: { gte: from, lte: to } },
    select: { id: true, kind: true, label: true, isExamDay: true },
  });
  const names = [a.exam.shortName ?? a.exam.code.replace(/_/g, " ")];
  const stage = verifiedStageOf(a);
  return gen.filter((g) => resolveKind(g) === release.kind && isTwinOfRelease(g, release, stage, names)).map((g) => g.id);
}

/** The stage a write may use: the gate's verified one when the release
 *  carries it (1 Oct 2026), else the caller's. */
function verifiedStageOf(a: WriteReleaseArgs): string {
  return typeof a.release.stage === "string" ? a.release.stage : a.stage;
}

export async function writeRelease(db: WatchDb, a: WriteReleaseArgs): Promise<WriteReleaseResult> {
  const { exam, release } = a;
  const releaseDay = istDayNumber(release.releasedOn);
  // A human beats the machine: a suppressed row of this kind on this day,
  // or with this link, blocks the write.
  const suppressed = await db.examImportantDate.findMany({
    where: { examId: exam.id, source: SUPPRESSED_SOURCE },
    select: { kind: true, label: true, isExamDay: true, date: true, url: true },
  });
  if (
    suppressed.some(
      (s) => (s.url && normLink(s.url) === normLink(release.url)) || (resolveKind(s) === release.kind && istDayNumber(s.date) === releaseDay),
    )
  ) {
    return { status: "skipped", reason: "a human suppressed this release (same day or link)", archivedTwins: 0, indexNowUrls: 0 };
  }
  const existing = await db.examImportantDate.findFirst({
    where: { examId: exam.id, source: OFFICIAL_WATCH_SOURCE, url: release.url, archivedAt: null },
    select: { id: true },
  });
  if (existing) return { status: "skipped", reason: "already written", rowId: existing.id, archivedTwins: 0, indexNowUrls: 0 };
  const twins = await twinIds(db, a);
  if (a.dry) return { status: "dry-run", archivedTwins: twins.length, indexNowUrls: 0 };

  const row = await db.examImportantDate.create({
    data: {
      examId: exam.id,
      label: a.label,
      date: release.releasedOn,
      isExamDay: false,
      kind: release.kind,
      confidence: "official",
      url: release.url,
      source: OFFICIAL_WATCH_SOURCE,
      notes: release.note.slice(0, 600),
    },
    select: { id: true },
  });
  if (twins.length) {
    await db.examImportantDate.updateMany({ where: { id: { in: twins }, archivedAt: null }, data: { archivedAt: a.now } });
  }
  const via = a.via ?? release.via;
  for (const [i, r] of [release, ...(a.siblings ?? [])].entries()) {
    const needsImport = r.kind === "ANSWER_KEY" && r.isPdf;
    await db.$executeRaw`
      INSERT INTO "OfficialWatchHit" (id, "examId", "watchId", kind, url, "listingUrl", host, "anchorText", "releasedOn", "dateSource", via,
        "dateRowId", "isPdf", "cycleYear", stage, "importStatus", "importNote", "createdAt")
      VALUES (${crypto.randomUUID()}, ${exam.id}, ${a.watchId}, ${r.kind}, ${r.url}, ${r.listingUrl ?? ""}, ${r.host}, ${r.text || r.anchorText},
        ${r.releasedOn}, ${r.dateSource}, ${via}, ${row.id}, ${r.isPdf}, ${a.cycleYear}, ${verifiedStageOf(a)},
        ${needsImport ? "needs-import" : "n/a"}, ${i === 0 ? null : "sibling link of the same release"}, ${a.now})
      ON CONFLICT ("examId", url) DO NOTHING`;
  }

  let indexNowUrls = 0;
  if (a.indexNow) {
    const [{ officialReleaseUrls, submitIndexNow }, { examPageGates, GATES_CLOSED }, { gateTwinUrls, loadTwinVerdicts }, { STATES, stateSlug }] =
      await Promise.all([import("@/lib/indexnow"), import("@/lib/exam-page-gates"), import("@/lib/twin-localisation"), import("@/lib/state-info")]);
    // /cutoff only when it renders; a failed gate read withholds it. Twins
    // only when localised (gateTwinUrls); a failed measurement withholds them.
    const gates = await examPageGates(exam.code, GATES_CLOSED).catch(() => GATES_CLOSED);
    const urls = officialReleaseUrls(exam.code, exam.state && exam.state in STATES ? stateSlug(exam.state) : null, gates);
    const twinsV = await loadTwinVerdicts([exam.id], a.now).catch(() => []);
    const list = gateTwinUrls(urls, new Map(twinsV.map((t) => [t.code, t.verdicts])));
    indexNowUrls = list.length;
    await submitIndexNow(list);
  }
  return { status: "written", rowId: row.id, archivedTwins: twins.length, indexNowUrls };
}

export async function markWatchChecked(db: RawDb, watchId: string, status: string, now: Date): Promise<void> {
  await db.$executeRaw`UPDATE "OfficialWatch" SET "lastCheckedAt" = ${now}, "lastStatus" = ${status.slice(0, 300)} WHERE id = ${watchId}`.catch(() => 0);
}

export interface UpsertWatchArgs {
  examId: string;
  kind: WatchKind;
  listingUrl: string;
  host: string;
  fetchMode: FetchMode;
  singleExam: boolean;
  heading: string;
  examTerms: readonly string[];
  baselineLinks: readonly string[];
  lastCycle: LastCycle | null;
  lagDays: number | null;
  now: Date;
}

/** The crawl's write of one listing page (idempotent on exam + kind + URL). */
export async function upsertWatch(db: RawDb, w: UpsertWatchArgs): Promise<void> {
  await db.$executeRaw`
    INSERT INTO "OfficialWatch" (id, "examId", kind, "listingUrl", host, "fetchMode", "singleExam", heading, "examTerms", "baselineLinks",
      "lastCycle", "lagDays", "verifiedAt", "createdAt")
    VALUES (${crypto.randomUUID()}, ${w.examId}, ${w.kind}, ${w.listingUrl}, ${w.host}, ${w.fetchMode}, ${w.singleExam}, ${w.heading.slice(0, 600)},
      ${[...w.examTerms]}::text[], ${[...w.baselineLinks]}::text[], ${w.lastCycle ? JSON.stringify(w.lastCycle) : null}::jsonb, ${w.lagDays},
      ${w.now}, ${w.now})
    ON CONFLICT ("examId", kind, "listingUrl") DO UPDATE SET
      host = EXCLUDED.host, "fetchMode" = EXCLUDED."fetchMode", "singleExam" = EXCLUDED."singleExam", heading = EXCLUDED.heading,
      "examTerms" = EXCLUDED."examTerms", "baselineLinks" = EXCLUDED."baselineLinks", "lastCycle" = EXCLUDED."lastCycle",
      "lagDays" = EXCLUDED."lagDays", "verifiedAt" = EXCLUDED."verifiedAt", "archivedAt" = NULL`;
}
