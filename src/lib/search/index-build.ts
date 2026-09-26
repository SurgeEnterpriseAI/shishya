// Server loader for the site-wide search index (26 Sep 2026). SERVER ONLY.
//
// Reads what the index needs from the DB — the real exams (REAL_EXAM_WHERE),
// the years with validated PYQ rows and the topics with usable notes
// (REAL_EXAM_SQL), the page gates (loadExamPageGates, the sitemap's own rule)
// and the school surface (loadSchoolSurface) — in one unstable_cache entry
// (1 hour, tag "search-index"), then builds the pure index
// (src/lib/search/index-core.ts) once per cached read. No model is ever
// called; no query text reaches SQL.
//
// Never throws: a failed read degrades to what renders without the DB —
// FALLBACK_EXAMS with every gate closed and no PYQ / topic links, no school
// rows, and all the static pages (colleges, scholarships, careers, study
// abroad, landings). That smaller index is not cached for the hour; it is
// rebuilt at most once a minute until the DB answers again.

import "server-only";
import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { REAL_EXAM_SQL, REAL_EXAM_WHERE } from "@/lib/db/exam-scope";
import { loadExamPageGates } from "@/lib/exam-page-gates";
import { loadSchoolSurface } from "@/lib/school/surface";
import { usableNotesSql } from "@/lib/topic-notes";
import { FALLBACK_EXAMS } from "@/data/fallback-exams";
import { buildSearchIndex, toLiteIndex, type SearchExamRow, type SearchIndexInputs, type SearchTopicRow } from "./index-core";
import { resolveQuery } from "./resolve";
import type { ExamGatesLike, Resolution, SearchIndex } from "./types";

export const SEARCH_INDEX_REVALIDATE = 3600;

async function readExams(): Promise<SearchExamRow[]> {
  const rows = await prisma.exam.findMany({
    where: REAL_EXAM_WHERE,
    orderBy: [{ candidatesPerYear: "desc" }, { code: "asc" }],
    select: {
      code: true,
      name: true,
      shortName: true,
      category: true,
      state: true,
      candidatesPerYear: true,
      _count: { select: { questions: { where: { validated: true } }, mocks: { where: { userId: null } } } },
    },
  });
  return rows.map((e) => ({
    code: e.code,
    name: e.name,
    shortName: e.shortName,
    category: String(e.category),
    state: e.state ?? null,
    candidatesPerYear: e.candidatesPerYear ?? null,
    // The hub's practice sections render for an exam with checked questions or a system mock (page.tsx loadExamsRaw).
    live: (e._count?.questions ?? 0) > 0 || (e._count?.mocks ?? 0) > 0,
  }));
}

async function readPyqYears(): Promise<Record<string, number[]>> {
  // The same (exam, year) set the sitemap lists as /exams/{code}/pyq/{year}.
  const rows = await prisma.$queryRaw<{ code: string; year: number }[]>`
    SELECT DISTINCT e."code" AS code, q."pyqYear" AS year
    FROM "Question" q
    JOIN "Exam" e ON e.id = q."examId"
    WHERE q.source = 'PYQ' AND q."pyqYear" IS NOT NULL AND q.validated = TRUE AND ${REAL_EXAM_SQL}`;
  const out: Record<string, number[]> = {};
  for (const r of rows) (out[r.code] ??= []).push(Number(r.year));
  for (const k of Object.keys(out)) out[k].sort((a, b) => a - b);
  return out;
}

async function readTopics(): Promise<SearchTopicRow[]> {
  // Topic pages with usable notes (the sitemap's topic family). Names and codes only — never note text.
  return prisma.$queryRaw<SearchTopicRow[]>`
    SELECT e.code AS "examCode", t.code, t.name
    FROM "Topic" t
    JOIN "Subject" s ON s.id = t."subjectId"
    JOIN "Exam" e ON e.id = s."examId"
    JOIN "TopicTeachingNote" tn ON tn."topicId" = t.id
    WHERE ${REAL_EXAM_SQL} AND ${usableNotesSql(Prisma.sql`tn.content`)}
    ORDER BY e.code, t.code`;
}

async function readInputs(): Promise<SearchIndexInputs> {
  const [exams, pyqYears, topics, gates, school] = await Promise.all([
    readExams(),
    readPyqYears(),
    readTopics(),
    loadExamPageGates(),
    loadSchoolSurface(),
  ]);
  const gateRecord: Record<string, ExamGatesLike> = {};
  for (const [code, g] of gates) gateRecord[code] = { cutoff: g.cutoff, syllabus: g.syllabus, tricks: g.tricks, guide: g.guide, buildMock: g.buildMock };
  return {
    builtAt: new Date().toISOString(),
    exams,
    gates: gateRecord,
    pyqYears,
    topicNoteExams: [...new Set(topics.map((t) => t.examCode))],
    topics,
    school: {
      classes: school.classes.map((c) => ({
        boardSlug: c.boardSlug,
        cls: c.cls,
        subjects: c.subjects.map((s) => ({
          code: s.code,
          name: s.name,
          slug: s.slug,
          chapters: s.chapters.map((ch) => ({
            code: ch.code,
            name: ch.name,
            orderIdx: ch.orderIdx,
            slug: ch.slug,
            hasNotes: ch.hasNotes,
            validatedQuestions: ch.validatedQuestions,
            indexable: ch.indexable,
          })),
        })),
      })),
    },
  };
}

// Throws on a failed read, so a DB hiccup is never cached for the hour.
const cachedInputs = unstable_cache(readInputs, ["search-index-inputs-v1"], {
  revalidate: SEARCH_INDEX_REVALIDATE,
  tags: ["search-index"],
});

/** What renders with no DB: the fallback exam list, every gate closed, no school rows. */
function fallbackInputs(): SearchIndexInputs {
  return {
    builtAt: new Date().toISOString(),
    exams: FALLBACK_EXAMS.map((e) => ({
      code: e.code,
      name: e.name,
      shortName: e.shortName,
      category: e.category,
      state: e.state ?? null,
      candidatesPerYear: e.candidatesPerYear ?? null,
      live: false,
    })),
    gates: null,
    pyqYears: {},
    topicNoteExams: [],
    topics: [],
    school: { classes: [] },
  };
}

let memo: { builtAt: string; deep: SearchIndex; lite: SearchIndex } | null = null;
let fallbackMemo: { at: number; deep: SearchIndex; lite: SearchIndex } | null = null;

// 26 Sep 2026 (search fixer): unstable_cache does not merge concurrent misses —
// every caller of a cold entry runs readInputs (5 DB reads) itself. One
// in-flight read per instance is shared by every concurrent caller, and a
// failed read is not retried for FAILED_READ_TTL_MS, so a DB outage costs one
// attempt a minute instead of one per request.
const FAILED_READ_TTL_MS = 60_000;
let inflight: Promise<SearchIndexInputs | null> | null = null;
let failedAt = 0;

function readInputsShared(): Promise<SearchIndexInputs | null> {
  if (failedAt && Date.now() - failedAt < FAILED_READ_TTL_MS) return Promise.resolve(null);
  inflight ??= cachedInputs()
    .then(
      (v) => {
        failedAt = 0;
        return v;
      },
      (err) => {
        failedAt = Date.now();
        console.error("[search-index] DB read failed, serving the static index:", err instanceof Error ? err.message : err);
        return null;
      },
    )
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * The search index: "deep" (every page, topic notes included) for the server
 * resolver and the AI's link check; "lite" (what GET /api/search/index sends)
 * for the home strip. Never throws.
 */
export async function loadSearchIndex(tier: "lite" | "deep" = "deep"): Promise<SearchIndex> {
  const inputs = await readInputsShared();
  if (inputs) {
    if (!memo || memo.builtAt !== inputs.builtAt) {
      const deep = buildSearchIndex(inputs, "deep");
      memo = { builtAt: inputs.builtAt, deep, lite: toLiteIndex(deep) };
    }
    return memo[tier];
  }
  if (!fallbackMemo || Date.now() - fallbackMemo.at > 60_000) {
    const deep = buildSearchIndex(fallbackInputs(), "deep");
    fallbackMemo = { at: Date.now(), deep, lite: toLiteIndex(deep) };
  }
  return fallbackMemo[tier];
}

/**
 * 26 Sep 2026 (integrator): true when `index` is the DB-down static index
 * (every exam gate closed, no school pages). GET /api/search/index serves
 * that one uncached, so the CDN never keeps a degraded index for an hour.
 */
export function isFallbackIndex(index: SearchIndex): boolean {
  return !!fallbackMemo && (fallbackMemo.deep === index || fallbackMemo.lite === index);
}

/** resolveQuery over the deep index — what /ask and POST /api/ask run. */
export async function resolveQueryServer(q: string, pageLocale: "en" | "hi" | "te" = "en"): Promise<Resolution> {
  return resolveQuery(q, await loadSearchIndex("deep"), { pageLocale });
}
