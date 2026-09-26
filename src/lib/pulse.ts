// Shishya Pulse — the reads (27 Sep 2026). One cached loader per published
// week (unstable_cache, revalidate 3600, tag "pulse", keyed by the week
// slug) behind /pulse, /pulse/{yyyy}-w{ww} and /pulse/context.md.
//
// Every table is gated in src/lib/pulse-rules.ts BEFORE it is cached or
// returned, so what leaves this module has no count under 20 and no people
// counts. SELECT only; no writes, no AI calls. Definitions follow the live
// counters (src/lib/live-counts-server.ts), sliced by IST ISO week:
//   • mocks taken — Attempt SUBMITTED / AUTO_SUBMITTED by finishedAt (the
//     nightly cron's ABANDONED rows never count);
//   • tutor questions — ChatMessage role USER (guest-import copies left out)
//     plus AnonTutorLog rows with a shishya_anon cookie;
//   • sign-ups — User.createdAt.
// Team accounts (ADMIN_EMAILS) are left out of every member read; how many
// there are is never printed. Message text is never selected: the tutor
// table groups by the exam the tutor was set to, nothing else
// (tests/unit/pulse-view.test.ts scans this file for that).
//
// A section whose read fails is null and the page prints "could not be
// computed right now" — never 0.

import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { NOT_SCHOOL_WHERE, REAL_EXAM_SQL, REAL_EXAM_WHERE } from "@/lib/db/exam-scope";
import { buildTimeline } from "@/lib/exam-timeline";
import { GUEST_IMPORT_SOURCE } from "@/lib/live-counts-server";
import { citableSourceUrl } from "@/lib/official-source";
import {
  PULSE_K,
  PULSE_KIND_LABEL,
  PULSE_MIN_PEOPLE,
  PULSE_SPARK_WEEKS,
  PULSE_TOPIC_MIN_PEOPLE,
  PULSE_WINDOW_WEEKS,
  TUTOR_GENERAL_BUCKET,
  TUTOR_OTHER_BUCKET,
  TUTOR_SCHOOL_BUCKET,
  examKindSqlCase,
  gateExamMocks,
  gateHardestTopics,
  gatePractisedTopics,
  gateSignupSections,
  gateTutorByExam,
  gatedCount,
  guardResiduals,
  istIsoDay,
  keySetId,
  labelSaysExpected,
  mergeSmallGroups,
  parsePulseSlug,
  pulseKindOf,
  pulseSectionOfPath,
  pulseWeeksLabel,
  shiftPulseWeek,
  type ExamMockRaw,
  type PulseKind,
  type PulseSection,
  type PulseWeek,
  type TopicRaw,
  type TutorRaw,
} from "@/lib/pulse-rules";
import type { PulseOfficialDate, PulseSeriesPoint, PulseView, PulseWeekLine } from "@/lib/pulse-view";

export const PULSE_REVALIDATE = 3600;
export const PULSE_CACHE_TAG = "pulse";

const SUBMITTED = Prisma.sql`('SUBMITTED', 'AUTO_SUBMITTED')`;

const num = (v: unknown): number => (typeof v === "bigint" ? Number(v) : typeof v === "number" ? v : Number(v ?? 0));

/** Account ids of the team (ADMIN_EMAILS), left out of every member read. */
async function staffIds(): Promise<string[]> {
  const emails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (emails.length === 0) return [];
  const rows = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "User" WHERE lower(email) = ANY(${emails}::text[])`;
  return rows.map((r) => r.id);
}

interface Bounds {
  start: Date;
  end: Date;
  prevStart: Date;
  windowStart: Date;
  sparkStart: Date;
}

function boundsOf(w: PulseWeek): Bounds {
  return {
    start: new Date(w.startIso),
    end: new Date(w.endIso),
    prevStart: new Date(shiftPulseWeek(w, -1).startIso),
    windowStart: new Date(shiftPulseWeek(w, -(PULSE_WINDOW_WEEKS - 1)).startIso),
    sparkStart: new Date(shiftPulseWeek(w, -(PULSE_SPARK_WEEKS - 1)).startIso),
  };
}

// ── The week in numbers (+ 8-week series) ─────────────────────────────

async function readWeekLine(w: PulseWeek, b: Bounds, staff: string[]): Promise<PulseWeekLine> {
  const rows = await prisma.$queryRaw<{ metric: string; wk: string; n: bigint | number }[]>`
    WITH signups AS (
      SELECT to_char(date_trunc('week', u."createdAt" + interval '330 minutes'), 'YYYY-MM-DD') AS wk, COUNT(*) AS n
      FROM "User" u
      WHERE u."createdAt" >= ${b.sparkStart} AND u."createdAt" < ${b.end} AND u.id <> ALL(${staff}::text[])
      GROUP BY 1
    ), mocks AS (
      SELECT to_char(date_trunc('week', a."finishedAt" + interval '330 minutes'), 'YYYY-MM-DD') AS wk, COUNT(*) AS n
      FROM "Attempt" a
      WHERE a.status IN ${SUBMITTED} AND a."finishedAt" >= ${b.sparkStart} AND a."finishedAt" < ${b.end}
        AND a."userId" <> ALL(${staff}::text[])
      GROUP BY 1
    ), tutor AS (
      SELECT wk, SUM(n)::bigint AS n FROM (
        SELECT to_char(date_trunc('week', cm."createdAt" + interval '330 minutes'), 'YYYY-MM-DD') AS wk, COUNT(*) AS n
        FROM "ChatMessage" cm JOIN "ChatSession" cs ON cs.id = cm."sessionId"
        WHERE cm.role = 'USER' AND cm."createdAt" >= ${b.sparkStart} AND cm."createdAt" < ${b.end}
          AND COALESCE(cs."contextSnapshot"->>'source', '') <> ${GUEST_IMPORT_SOURCE}
          AND cs."userId" <> ALL(${staff}::text[])
        GROUP BY 1
        UNION ALL
        SELECT to_char(date_trunc('week', l."createdAt" + interval '330 minutes'), 'YYYY-MM-DD'), COUNT(*)
        FROM "AnonTutorLog" l
        WHERE l."anonId" IS NOT NULL AND l."createdAt" >= ${b.sparkStart} AND l."createdAt" < ${b.end}
        GROUP BY 1
      ) x GROUP BY wk
    )
    SELECT 'signups' AS metric, wk, n FROM signups
    UNION ALL SELECT 'mocks', wk, n FROM mocks
    UNION ALL SELECT 'tutor', wk, n FROM tutor
  `;
  const get = (metric: string, day: string) => {
    const r = rows.find((x) => x.metric === metric && x.wk === day);
    return r ? num(r.n) : 0;
  };
  const series: PulseSeriesPoint[] = [];
  for (let i = PULSE_SPARK_WEEKS - 1; i >= 0; i--) {
    const sw = shiftPulseWeek(w, -i);
    series.push({
      slug: sw.slug,
      label: sw.label,
      signups: gatedCount(get("signups", sw.startDay)),
      mocks: gatedCount(get("mocks", sw.startDay)),
      tutor: gatedCount(get("tutor", sw.startDay)),
    });
  }
  const cur = series[series.length - 1];
  const prev = series[series.length - 2];
  return {
    signups: cur.signups,
    mocks: cur.mocks,
    tutor: cur.tutor,
    prevSignups: prev?.signups ?? null,
    prevMocks: prev?.mocks ?? null,
    prevTutor: prev?.tutor ?? null,
    series,
  };
}

// ── Mocks by exam and by kind ─────────────────────────────────────────

async function readExamMocks(b: Bounds, staff: string[]): Promise<ExamMockRaw[]> {
  const rows = await prisma.$queryRaw<
    { code: string; name: string; category: string; mocks: bigint; people: bigint; prev_mocks: bigint; prev_people: bigint }[]
  >`
    SELECT e.code, e."shortName" AS name, e."category"::text AS category,
      COUNT(*) FILTER (WHERE a."finishedAt" >= ${b.start}) AS mocks,
      COUNT(DISTINCT a."userId") FILTER (WHERE a."finishedAt" >= ${b.start}) AS people,
      COUNT(*) FILTER (WHERE a."finishedAt" < ${b.start}) AS prev_mocks,
      COUNT(DISTINCT a."userId") FILTER (WHERE a."finishedAt" < ${b.start}) AS prev_people
    FROM "Attempt" a
    JOIN "Mock" m ON m.id = a."mockId"
    JOIN "Exam" e ON e.id = m."examId"
    WHERE a.status IN ${SUBMITTED} AND a."finishedAt" >= ${b.prevStart} AND a."finishedAt" < ${b.end}
      AND ${REAL_EXAM_SQL} AND a."userId" <> ALL(${staff}::text[])
    GROUP BY e.code, e."shortName", e."category"
    HAVING COUNT(*) FILTER (WHERE a."finishedAt" >= ${b.start}) >= ${PULSE_K}
      AND COUNT(DISTINCT a."userId") FILTER (WHERE a."finishedAt" >= ${b.start}) >= ${PULSE_MIN_PEOPLE}
  `;
  return rows.map((r) => ({
    code: r.code,
    name: r.name,
    category: r.category,
    mocks: num(r.mocks),
    people: num(r.people),
    prevMocks: num(r.prev_mocks),
    prevPeople: num(r.prev_people),
  }));
}

const ALL_KINDS = Object.keys(PULSE_KIND_LABEL) as PulseKind[];

/** Every non-empty set of kinds, for exact distinct-people counts of any
 *  merged group (5 kinds → 31 sets, one COUNT DISTINCT FILTER each). */
function kindSubsets(): PulseKind[][] {
  const out: PulseKind[][] = [];
  for (let mask = 1; mask < 1 << ALL_KINDS.length; mask++) out.push(ALL_KINDS.filter((_, i) => mask & (1 << i)));
  return out;
}

interface KindMocks {
  rows: { kind: PulseKind; mocks: number; people: number }[];
  /** keySetId(kinds) → distinct people across those kinds (never printed). */
  peopleBySet: Record<string, number>;
}

async function readKindMocks(b: Bounds, staff: string[]): Promise<KindMocks> {
  const kindCase = Prisma.raw(examKindSqlCase("e"));
  const subsets = kindSubsets();
  // Kind names are this module's constants (a-z only), inlined, never bound.
  const filters = Prisma.raw(
    subsets.map((set, i) => `COUNT(DISTINCT u) FILTER (WHERE kind IN (${set.map((k) => `'${k}'`).join(", ")})) AS s${i}`).join(", "),
  );
  const [rows, sets] = await Promise.all([
    prisma.$queryRaw<{ kind: string; mocks: bigint; people: bigint }[]>`
      SELECT ${kindCase} AS kind, COUNT(*) AS mocks, COUNT(DISTINCT a."userId") AS people
      FROM "Attempt" a
      JOIN "Mock" m ON m.id = a."mockId"
      JOIN "Exam" e ON e.id = m."examId"
      WHERE a.status IN ${SUBMITTED} AND a."finishedAt" >= ${b.start} AND a."finishedAt" < ${b.end}
        AND (${REAL_EXAM_SQL} OR e."category"::text = 'SCHOOL_BOARD')
        AND a."userId" <> ALL(${staff}::text[])
      GROUP BY 1
    `,
    prisma.$queryRaw<Record<string, bigint>[]>`
      WITH k AS (
        SELECT ${kindCase} AS kind, a."userId" AS u
        FROM "Attempt" a
        JOIN "Mock" m ON m.id = a."mockId"
        JOIN "Exam" e ON e.id = m."examId"
        WHERE a.status IN ${SUBMITTED} AND a."finishedAt" >= ${b.start} AND a."finishedAt" < ${b.end}
          AND (${REAL_EXAM_SQL} OR e."category"::text = 'SCHOOL_BOARD')
          AND a."userId" <> ALL(${staff}::text[])
      )
      SELECT ${filters} FROM k
    `,
  ]);
  const peopleBySet: Record<string, number> = {};
  subsets.forEach((set, i) => {
    peopleBySet[keySetId(set)] = num(sets[0]?.[`s${i}`]);
  });
  return {
    rows: rows.filter((r) => r.kind in PULSE_KIND_LABEL).map((r) => ({ kind: r.kind as PulseKind, mocks: num(r.mocks), people: num(r.people) })),
    peopleBySet,
  };
}

// ── Topics (4 weeks) ──────────────────────────────────────────────────

async function readTopics(b: Bounds, staff: string[]): Promise<TopicRaw[]> {
  const rows = await prisma.$queryRaw<
    { exam_code: string; exam_name: string; topic_code: string; topic_name: string; answers: bigint; correct: bigint; people: bigint }[]
  >`
    WITH ans AS (
      SELECT a."userId" AS u, el->>'questionId' AS qid, (el->>'correct') = 'true' AS ok
      FROM "Attempt" a
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(a."answers") = 'array' THEN a."answers" ELSE '[]'::jsonb END
      ) el
      WHERE a.status IN ${SUBMITTED} AND a."finishedAt" >= ${b.windowStart} AND a."finishedAt" < ${b.end}
        AND a."userId" <> ALL(${staff}::text[])
        AND el->>'chosen' IS NOT NULL AND el->>'chosen' <> ''
    )
    SELECT e.code AS exam_code, e."shortName" AS exam_name, t.code AS topic_code, t.name AS topic_name,
      COUNT(*) AS answers, COUNT(*) FILTER (WHERE ans.ok) AS correct, COUNT(DISTINCT ans.u) AS people
    FROM ans
    JOIN "Question" q ON q.id = ans.qid
    JOIN "Topic" t ON t.id = q."topicId"
    JOIN "Subject" s ON s.id = t."subjectId"
    JOIN "Exam" e ON e.id = s."examId"
    WHERE ${REAL_EXAM_SQL}
    GROUP BY e.code, e."shortName", t.id, t.code, t.name
    HAVING COUNT(DISTINCT ans.u) >= ${PULSE_TOPIC_MIN_PEOPLE}
    ORDER BY answers DESC
    LIMIT 500
  `;
  return rows.map((r) => ({
    examCode: r.exam_code,
    examName: r.exam_name,
    topicCode: r.topic_code,
    topicName: r.topic_name,
    answers: num(r.answers),
    correct: num(r.correct),
    people: num(r.people),
  }));
}

// ── AI tutor by exam scope (4 weeks) ──────────────────────────────────

async function readTutorByExam(b: Bounds, staff: string[]): Promise<TutorRaw[]> {
  // Counts and the exam scope only — no message column is selected.
  const rows = await prisma.$queryRaw<{ bucket: string; name: string | null; questions: bigint; people: bigint }[]>`
    WITH t AS (
      SELECT cs."examId" AS exam_id, NULL::text AS exam_code, cs."userId" AS who
      FROM "ChatMessage" cm JOIN "ChatSession" cs ON cs.id = cm."sessionId"
      WHERE cm.role = 'USER' AND cm."createdAt" >= ${b.windowStart} AND cm."createdAt" < ${b.end}
        AND COALESCE(cs."contextSnapshot"->>'source', '') <> ${GUEST_IMPORT_SOURCE}
        AND cs."userId" <> ALL(${staff}::text[])
      UNION ALL
      SELECT NULL::text, l."examCode", l."anonId"
      FROM "AnonTutorLog" l
      WHERE l."anonId" IS NOT NULL AND l."createdAt" >= ${b.windowStart} AND l."createdAt" < ${b.end}
    ), k AS (
      SELECT CASE
          WHEN t.exam_id IS NULL AND t.exam_code IS NULL THEN ${TUTOR_GENERAL_BUCKET}::text
          WHEN e.id IS NULL THEN ${TUTOR_OTHER_BUCKET}::text
          WHEN e."category"::text = 'SCHOOL_BOARD' THEN ${TUTOR_SCHOOL_BUCKET}::text
          WHEN ${REAL_EXAM_SQL} THEN e.code
          ELSE ${TUTOR_OTHER_BUCKET}::text
        END AS bucket,
        CASE WHEN e.id IS NOT NULL AND ${REAL_EXAM_SQL} THEN e."shortName" END AS name,
        t.who
      FROM t
      LEFT JOIN "Exam" e ON e.id = t.exam_id OR (t.exam_id IS NULL AND e.code = t.exam_code)
    )
    SELECT bucket, MAX(name) AS name, COUNT(*) AS questions, COUNT(DISTINCT who) AS people
    FROM k
    GROUP BY bucket
    HAVING COUNT(*) >= ${PULSE_K} AND COUNT(DISTINCT who) >= ${PULSE_MIN_PEOPLE}
  `;
  return rows.map((r) => ({ bucket: r.bucket, name: r.name, questions: num(r.questions), people: num(r.people) }));
}

// ── Sign-ups by section of the first page ─────────────────────────────

async function readSignupSections(b: Bounds, staff: string[]): Promise<{ section: PulseSection; n: number }[]> {
  const [rows, exams] = await Promise.all([
    prisma.$queryRaw<{ path: string | null; n: bigint }[]>`
      WITH u AS (
        SELECT id FROM "User"
        WHERE "createdAt" >= ${b.start} AND "createdAt" < ${b.end} AND id <> ALL(${staff}::text[])
      ), s AS (
        SELECT DISTINCT ON (ev."userId") ev."userId", ev."anonId"
        FROM "AnalyticsEvent" ev JOIN u ON u.id = ev."userId"
        WHERE ev.kind = 'SIGNUP'
        ORDER BY ev."userId", ev."createdAt"
      ), fa AS (
        SELECT DISTINCT ON (pv."anonId") pv."anonId", pv.path
        FROM "AnalyticsEvent" pv
        WHERE pv.kind = 'PAGE_VIEW' AND pv."anonId" IN (SELECT "anonId" FROM s WHERE "anonId" IS NOT NULL)
        ORDER BY pv."anonId", pv."createdAt"
      )
      SELECT fa.path, COUNT(*) AS n
      FROM u LEFT JOIN s ON s."userId" = u.id LEFT JOIN fa ON fa."anonId" = s."anonId"
      GROUP BY fa.path
    `,
    // Every non-school exam, listed or not: a first landing on a retired
    // exam's page is still an exam page of its kind.
    prisma.exam.findMany({ where: NOT_SCHOOL_WHERE, select: { code: true, category: true } }),
  ]);
  const categoryByCode = new Map<string, string>(exams.map((e) => [e.code, String(e.category)]));
  // Paths are grouped here and never leave this function: only the section
  // totals are returned.
  const bySection = new Map<PulseSection, number>();
  for (const r of rows) {
    const section = pulseSectionOfPath(r.path, categoryByCode);
    bySection.set(section, (bySection.get(section) ?? 0) + num(r.n));
  }
  return [...bySection].map(([section, n]) => ({ section, n }));
}

// ── Official exam dates in the week ───────────────────────────────────

async function readOfficialDates(w: PulseWeek, now: Date): Promise<PulseOfficialDate[]> {
  // Tracker dates are stored as midnight UTC of the IST calendar day
  // (src/lib/exam-timeline.ts isoDay), so the week is [Monday, next Monday)
  // in UTC days.
  const from = new Date(`${w.startDay}T00:00:00Z`);
  const to = new Date(Date.parse(from.toISOString()) + 7 * 86_400_000);
  const rows = await prisma.examImportantDate.findMany({
    where: { date: { gte: from, lt: to }, archivedAt: null, exam: REAL_EXAM_WHERE },
    orderBy: { date: "asc" },
    take: 600,
    select: {
      id: true,
      label: true,
      date: true,
      isExamDay: true,
      kind: true,
      confidence: true,
      url: true,
      source: true,
      exam: { select: { code: true, shortName: true, eligibility: { select: { officialUrl: true } } } },
    },
  });
  const byExam = new Map<string, typeof rows>();
  for (const r of rows) byExam.set(r.exam.code, [...(byExam.get(r.exam.code) ?? []), r]);
  const out: PulseOfficialDate[] = [];
  const seen = new Set<string>();
  for (const [code, list] of byExam) {
    const exam = list[0].exam;
    for (const t of buildTimeline(list, now, exam.eligibility?.officialUrl ?? null)) {
      if (!t.official || labelSaysExpected(t.label)) continue;
      const url = citableSourceUrl(t.url);
      if (!url) continue;
      const key = `${code}|${t.day}|${t.label.trim().toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ day: t.day, examCode: code, examName: exam.shortName, label: t.label, url });
    }
  }
  return out.sort((a, b) => a.day.localeCompare(b.day) || a.examName.localeCompare(b.examName) || a.label.localeCompare(b.label));
}

// ── The view ──────────────────────────────────────────────────────────

async function settle<T>(what: string, slug: string, p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (err) {
    console.error(`[pulse] ${what} for ${slug} could not be read`, err);
    return null;
  }
}

/** The uncached view of one week (any parseable slug; callers decide
 *  whether it is published). Exported for read-only probes; pages go
 *  through loadPulseView. */
export async function computePulseView(slug: string): Promise<PulseView> {
  const w = parsePulseSlug(slug);
  if (!w) throw new Error(`pulse: bad week slug ${JSON.stringify(slug)}`);
  const now = new Date();
  const b = boundsOf(w);
  const staff = await staffIds();
  const [weekLine, examRaw, kindRaw, topicRaw, tutorRaw, sectionRaw, officialDates] = await Promise.all([
    settle("week line", slug, readWeekLine(w, b, staff)),
    settle("mocks by exam", slug, readExamMocks(b, staff)),
    settle("mocks by kind", slug, readKindMocks(b, staff)),
    settle("topics", slug, readTopics(b, staff)),
    settle("tutor by exam", slug, readTutorByExam(b, staff)),
    settle("sign-up sections", slug, readSignupSections(b, staff)),
    settle("official dates", slug, readOfficialDates(w, now)),
  ]);

  const examMocks = examRaw ? gateExamMocks(examRaw) : null;

  // Kinds: merged to 20+ mocks and 10+ people, then guarded against reading
  // a small remainder off the exam rows printed above (only when those rows
  // were read — without them there is nothing to subtract from).
  let kindMocks: PulseView["kindMocks"] = null;
  if (kindRaw && examRaw && examMocks) {
    const merged = mergeSmallGroups(
      kindRaw.rows.map((k) => ({ key: k.kind, label: PULSE_KIND_LABEL[k.kind], n: k.mocks, people: k.people })),
      PULSE_K,
      PULSE_MIN_PEOPLE,
      (keys) => kindRaw.peopleBySet[keySetId(keys)],
    );
    const printed = new Set(examMocks.map((r) => r.code));
    const printedByKind: Record<string, number> = {};
    for (const r of examRaw) {
      if (!printed.has(r.code)) continue;
      const kind = pulseKindOf({ code: r.code, category: r.category ?? null });
      printedByKind[kind] = (printedByKind[kind] ?? 0) + r.mocks;
    }
    const sizeByKind: Record<string, number> = {};
    for (const k of kindRaw.rows) sizeByKind[k.kind] = k.mocks;
    kindMocks = guardResiduals(merged, printedByKind, sizeByKind);
  }

  let signupSections: PulseView["signupSections"] = null;
  if (sectionRaw) {
    const rows = gateSignupSections(sectionRaw);
    const nonEmpty = sectionRaw.filter((s) => s.n > 0).length;
    signupSections =
      rows.length === 1 && nonEmpty > 1 ? { rows: [], onlySection: rows[0].labels[0] ?? null } : { rows, onlySection: null };
  }

  return {
    week: w,
    windowLabel: pulseWeeksLabel(shiftPulseWeek(w, -(PULSE_WINDOW_WEEKS - 1)), w),
    computedDay: istIsoDay(now),
    weekLine,
    examMocks,
    kindMocks,
    practisedTopics: topicRaw ? gatePractisedTopics(topicRaw) : null,
    hardestTopics: topicRaw ? gateHardestTopics(topicRaw) : null,
    officialDates,
    tutorByExam: tutorRaw ? gateTutorByExam(tutorRaw) : null,
    signupSections,
  };
}

const cachedPulseView = unstable_cache(async (slug: string) => computePulseView(slug), ["pulse-view-v1"], {
  revalidate: PULSE_REVALIDATE,
  tags: [PULSE_CACHE_TAG],
});

/** The gated view of one published week, or null when nothing could be
 *  read. Callers resolve and validate the week first (resolvePulseWeek). */
export async function loadPulseView(w: PulseWeek): Promise<PulseView | null> {
  try {
    return await cachedPulseView(w.slug);
  } catch (err) {
    console.error(`[pulse] view for ${w.slug} unavailable`, err);
    return null;
  }
}
