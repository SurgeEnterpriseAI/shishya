// Exam scope — which "Exam" rows a query may see (25 Sep 2026).
//
// Why: school content (NCERT Class 6-10 first, then CISCE and the state
// boards) is going into the same Exam → Subject → Topic → Question tree as
// one Exam row per (curriculum, class) with category SCHOOL_BOARD. That
// reuses the tutor, notes, factory and mocks — but ~30 readers under src/
// listed "every active exam" with `where: { active: true }` and nothing
// else. The day the first NCERT_C09 row lands, the news refresher and the
// rank-band generator would spend AI calls writing "news" and "rank bands"
// for a school class, /api/exams, /ask, the sitemap, llms-full.txt, the
// jobs map, Telegram and the exam-eve / winback mail would all list it,
// and a child's class could reach a marketing mail audience.
//
// So every reader that means "a real recruitment / entrance exam" goes
// through the helpers below; a school surface asks for SCHOOL_WHERE. The
// static guard in tests/unit/exam-scope-guard.test.ts fails on any new
// exam query under src/ that uses neither (lookups by one code / id, or of
// the viewer's own rows, are allow-listed there with a reason).
//
// On 25 Sep 2026 there are 0 SCHOOL_BOARD rows, so every scoped query returns
// exactly what it returned before (checked per site, before vs after, by a
// read-only probe that day). Exam.category is NOT NULL, so `<> 'SCHOOL_BOARD'`
// never drops a row the way it would on a nullable column. The raw fragments
// test only the category unless named REAL_/SCHOOL_ — a join that deliberately
// keeps retired exams (declared results, a user's own rows) stays as it was.

import { Prisma } from "@prisma/client";

/** The ExamCategory value of a (curriculum, class) school container. */
export const SCHOOL_CATEGORY = "SCHOOL_BOARD" as const;

/** True for a school (curriculum, class) container — not a real exam. */
export function isSchoolCategory(category: string | null | undefined): boolean {
  return String(category ?? "").toUpperCase() === SCHOOL_CATEGORY;
}

// ── Prisma ────────────────────────────────────────────────────────────

/** Every live real exam: active and not a school container. The default for
 *  any catalog, cron, mail audience or search surface. */
export const REAL_EXAM_WHERE = {
  active: true,
  category: { not: SCHOOL_CATEGORY },
} satisfies Prisma.ExamWhereInput;

/** Not a school container, whatever `active` is — for readers that already
 *  pin their own rows (`id: { in: ids }`) or deliberately include retired
 *  exams. */
export const NOT_SCHOOL_WHERE = {
  category: { not: SCHOOL_CATEGORY },
} satisfies Prisma.ExamWhereInput;

/** Live school (curriculum, class) containers — the school surfaces only. */
export const SCHOOL_WHERE = {
  active: true,
  category: SCHOOL_CATEGORY,
} satisfies Prisma.ExamWhereInput;

// ── Keyed lookups (26 Sep 2026) ───────────────────────────────────────
// The list queries above were scoped on 25 Sep; the ~70 lookups of ONE exam
// by a client-supplied code or id (the /exams/[code]/* loaders, the tutor,
// enrolment, coach, mocks, alerts, the anonymous quiz …) still accepted a
// school code, so the day NCERT_C09 was seeded — even inactive — a request
// with that code reached the paid tutor with the exam-prep persona and
// enrolled the student. Every such lookup now goes through realExamKey():
// Prisma 5's extended where-unique takes the category filter beside the
// unique key, so a SCHOOL_BOARD row simply does not match and the caller's
// existing "unknown exam" branch (notFound(), 404, null) runs — exactly as
// for a code that does not exist, active or not. The static guard flags any
// exam.findUnique / findFirst under src/ that uses neither this nor a
// helper constant.

/** The `where` for a lookup of ONE real exam by its unique key. */
export function realExamKey(key: { code: string } | { id: string }): Prisma.ExamWhereUniqueInput {
  return { ...key, ...NOT_SCHOOL_WHERE };
}

/** Row-level twin for an exam that arrived through a relation (a mock's or
 *  an enrolment's exam): null when it is a school container. */
export function realExamOrNull<T extends { category: string }>(exam: T | null | undefined): T | null {
  return exam && !isSchoolCategory(exam.category) ? exam : null;
}

// ── Raw SQL ───────────────────────────────────────────────────────────
// Postgres enum → text compare, the idiom sitemap.ts / onboarding already
// used. The constants assume the "Exam" row is aliased `e` (as almost every
// raw query here does); notSchoolSql() takes any other alias.

const SQL_ALIAS = /^[A-Za-z_][A-Za-z0-9_]*$/;

function column(alias: string, name: string): string {
  if (alias === "") return `"${name}"`;
  if (!SQL_ALIAS.test(alias)) throw new Error(`exam-scope: bad SQL alias ${JSON.stringify(alias)}`);
  return `${alias}."${name}"`;
}

/** `<alias>.category <> SCHOOL_BOARD` as text, for $queryRawUnsafe callers.
 *  alias "" = an unaliased FROM "Exam". */
export function notSchoolSqlText(alias = "e"): string {
  return `${column(alias, "category")}::text <> '${SCHOOL_CATEGORY}'`;
}

/** `<alias>.category <> SCHOOL_BOARD` as a Prisma.sql fragment. */
export function notSchoolSql(alias = "e"): Prisma.Sql {
  return Prisma.raw(notSchoolSqlText(alias));
}

/** Raw twin of NOT_SCHOOL_WHERE for "Exam" e (no `active` test: for joins
 *  that deliberately keep retired exams, e.g. declared results). */
export const NOT_SCHOOL_SQL: Prisma.Sql = notSchoolSql("e");

/** Raw twin of REAL_EXAM_WHERE for "Exam" e: `e.active = TRUE AND <not school>`. */
export const REAL_EXAM_SQL: Prisma.Sql = Prisma.raw(`${column("e", "active")} = TRUE AND ${notSchoolSqlText("e")}`);

/** Raw twin of SCHOOL_WHERE for "Exam" e. */
export const SCHOOL_SQL: Prisma.Sql = Prisma.raw(`${column("e", "active")} = TRUE AND ${column("e", "category")}::text = '${SCHOOL_CATEGORY}'`);
