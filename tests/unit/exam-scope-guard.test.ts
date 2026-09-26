// Exam scope guard (25 Sep 2026) — src/lib/db/exam-scope.ts as tests.
//
// School content is going into the Exam table as SCHOOL_BOARD (curriculum,
// class) containers. Every reader that means "real recruitment / entrance
// exams" must say so through the scope helpers, or the first NCERT_C09 row
// lands in the AI news / rank-band crons, /api/exams, /ask, the sitemap,
// llms-full.txt, Telegram and the exam mail loops.
//
// Two parts:
//  1. the helpers: shapes, raw-SQL text, alias validation, Prisma.sql merging;
//  2. a SOURCE SCAN of src/: every exam list query must carry a helper —
//       prisma `.exam.findMany / findFirst / count / groupBy / aggregate(...)`,
//       raw SQL `FROM "Exam"` / `JOIN "Exam"` (the whole tagged template),
//       nested relation filters `exam: { active: true ... }`.
//     findUnique is exempt (one row by a unique key). Anything else that
//     deliberately reads without a helper is listed in UNSCOPED below with
//     its exact count and the reason — a new unscoped query fails here
//     until it uses a helper or is added to the list with a reason.
//     Plus (25 Sep 2026, fixer review) the cron mail audiences that reach
//     Exam through Prisma's Enrollment relation (scanEnrollmentSource).
//  3. (26 Sep 2026) KEYED lookups — `.exam.findUnique / findFirst(...)` by
//     a client-supplied code or id. These were exempt, so a school container
//     (active or not) was served by every /exams/[code]/* loader, the tutor,
//     enrolment, coach, mocks and alerts. Every keyed site must now use
//     realExamKey() (or a helper constant); the two that deliberately read
//     the category themselves are allow-listed. Plus: every Enrollment write
//     goes through src/lib/db/enrollment.ts, the named routes reference the
//     helper, and the home / admin counters join the exam category.
// No DB, no network. Run: npx vitest run tests/unit/exam-scope-guard.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import {
  NOT_SCHOOL_SQL,
  NOT_SCHOOL_WHERE,
  REAL_EXAM_SQL,
  REAL_EXAM_WHERE,
  SCHOOL_CATEGORY,
  SCHOOL_SQL,
  SCHOOL_WHERE,
  isSchoolCategory,
  notSchoolSql,
  notSchoolSqlText,
  realExamKey,
  realExamOrNull,
} from "@/lib/db/exam-scope";

describe("exam-scope helpers", () => {
  it("REAL_EXAM_WHERE = active and not a school container; SCHOOL_WHERE is its school twin", () => {
    expect(SCHOOL_CATEGORY).toBe("SCHOOL_BOARD");
    expect(REAL_EXAM_WHERE).toEqual({ active: true, category: { not: "SCHOOL_BOARD" } });
    expect(NOT_SCHOOL_WHERE).toEqual({ category: { not: "SCHOOL_BOARD" } });
    expect(SCHOOL_WHERE).toEqual({ active: true, category: "SCHOOL_BOARD" });
  });

  it("raw fragments carry no bind values and read the aliased columns", () => {
    expect(REAL_EXAM_SQL.values).toEqual([]);
    expect(REAL_EXAM_SQL.sql).toBe(`e."active" = TRUE AND e."category"::text <> 'SCHOOL_BOARD'`);
    expect(NOT_SCHOOL_SQL.sql).toBe(`e."category"::text <> 'SCHOOL_BOARD'`);
    expect(SCHOOL_SQL.sql).toBe(`e."active" = TRUE AND e."category"::text = 'SCHOOL_BOARD'`);
    expect(notSchoolSql("e2").sql).toBe(`e2."category"::text <> 'SCHOOL_BOARD'`);
    expect(notSchoolSqlText("")).toBe(`"category"::text <> 'SCHOOL_BOARD'`);
  });

  it("rejects an alias that is not a bare identifier (the alias is inlined, never bound)", () => {
    for (const bad of ["e; DROP TABLE x", "e.x", "1e", "e ", '"e"']) expect(() => notSchoolSql(bad)).toThrow(/bad SQL alias/);
  });

  it("merges into a tagged query with its bind values intact", () => {
    const q = Prisma.sql`SELECT e.code FROM "Exam" e WHERE ${REAL_EXAM_SQL} AND e.state = ${"TN"} LIMIT ${5}`;
    expect(q.sql).toBe(`SELECT e.code FROM "Exam" e WHERE e."active" = TRUE AND e."category"::text <> 'SCHOOL_BOARD' AND e.state = ? LIMIT ?`);
    expect(q.values).toEqual(["TN", 5]);
  });

  it("isSchoolCategory", () => {
    expect(isSchoolCategory("SCHOOL_BOARD")).toBe(true);
    expect(isSchoolCategory("school_board")).toBe(true);
    for (const c of ["GOVT_JOBS", "OLYMPIAD", "", null, undefined]) expect(isSchoolCategory(c)).toBe(false);
  });

  it("realExamKey = the unique key plus `not a school container`, for findUnique's extended where", () => {
    expect(realExamKey({ code: "SSC_CGL" })).toEqual({ code: "SSC_CGL", category: { not: "SCHOOL_BOARD" } });
    expect(realExamKey({ id: "e1" })).toEqual({ id: "e1", category: { not: "SCHOOL_BOARD" } });
    // No `active` test: the callers keep their own `!exam.active` rule, so an
    // inactive real exam behaves exactly as it did (404 on public pages).
    expect(realExamKey({ code: "X" })).not.toHaveProperty("active");
  });

  it("realExamOrNull drops a school row that arrived through a relation", () => {
    const real = { id: "e1", category: "GOVT_JOBS" };
    expect(realExamOrNull(real)).toBe(real);
    expect(realExamOrNull({ id: "s1", category: "SCHOOL_BOARD" })).toBeNull();
    expect(realExamOrNull({ id: "s1", category: "school_board" })).toBeNull();
    expect(realExamOrNull(null)).toBeNull();
    expect(realExamOrNull(undefined)).toBeNull();
  });
});

// ── Source scan ───────────────────────────────────────────────────────

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");

/** Files allowed to read Exam rows without a scope helper: exact count of
 *  unscoped sites + why. KEYED = one row by id / code / token; OWN = the
 *  viewer's (or a named user's) own rows; ADMIN = operator pages that must
 *  see school rows too; CREATED = rows this path itself created from a
 *  scoped pick; SCHOOL = a school surface reading SCHOOL_BOARD containers by
 *  category (they are inactive by design, 26 Sep 2026). */
const UNSCOPED: Record<string, { n: number; why: string }> = {
  // ADMIN
  "src/app/admin/coverage/page.tsx": { n: 1, why: "ADMIN: coverage per exam, school containers included" },
  "src/app/admin/insights/page.tsx": { n: 3, why: "KEYED: names for exam ids already counted (id IN ...)" },
  "src/app/admin/page.tsx": { n: 1, why: "ADMIN: exam list with question counts" },
  "src/app/admin/questions/page.tsx": { n: 1, why: "ADMIN: exam filter for the question review queue" },
  "src/app/admin/sme-stats/page.tsx": { n: 1, why: "ADMIN: exam filter for SME stats" },
  "src/lib/demand-mine.ts": { n: 1, why: "ADMIN: /admin/demand mines chat asks; LEFT JOIN only names the exam" },
  // KEYED
  "src/app/api/telegram/webhook/route.ts": { n: 1, why: "KEYED: one question by id (from a scoped /today message)" },
  "src/app/i/batches/[id]/page.tsx": { n: 1, why: "KEYED: one assignment's exam code, the batch's own attempts" },
  "src/app/me/report/pack/page.tsx": { n: 3, why: "KEYED: the report's own exam code" },
  "src/lib/challenge-db.ts": { n: 1, why: "KEYED: one challenge by token" },
  "src/lib/question-sweep.ts": { n: 1, why: "KEYED: reporters of one question id" },
  // KEYED by id, reading the category themselves (26 Sep 2026)
  "src/lib/exam-week-mail.ts": { n: 1, why: "KEYED: reads the exam's own category to pick the checklist link" },
  "src/lib/exam-data-writer.ts": { n: 1, why: "KEYED: id → code for the IndexNow ping of a row the scoped refresher wrote" },
  // OWN
  "src/app/api/bookmarks/route.ts": { n: 1, why: "OWN: the viewer's bookmarks for one exam code" },
  "src/app/dashboard/page.tsx": { n: 2, why: "OWN: the viewer's own study state and open attempts" },
  "src/lib/coach-done.ts": { n: 2, why: "OWN: the viewer's own work today" },
  "src/lib/coach-plan.ts": { n: 1, why: "OWN: the viewer's own coach plan" },
  "src/lib/student-360.ts": { n: 3, why: "OWN: one student's own plan and attempts (mentor view)" },
  // CREATED
  "src/app/api/cron/live-test-close/route.ts": { n: 1, why: "CREATED: closes LiveTest rows the scoped scheduler made" },
  "src/lib/live-test.ts": { n: 1, why: "CREATED: this Sunday's frozen roster, made by the scoped pick below it" },
  // SCHOOL (26 Sep 2026, go-live): the school surfaces read SCHOOL_BOARD
  // containers by CATEGORY (src/lib/school/scope.ts SCHOOL_CONTAINER_WHERE),
  // never by `active` — every school row was seeded inactive and stays so, so
  // SCHOOL_WHERE would list none of them. Category-pinned, they can never
  // return a real exam.
  "src/lib/school/surface.ts": { n: 3, why: "SCHOOL: sitemap / llms-full / context.md loader over SCHOOL_BOARD containers by category (inactive by design)" },
  "src/lib/school/db.ts": { n: 1, why: "SCHOOL: page loader — one school container by its NCERT_Cnn / CISCE_Cnn code, category pinned (inactive by design)" },
};

const HELPER_WHERE = /(?:\.\.\.|:|\?|,|\(|\[)\s*(?:REAL_EXAM_WHERE|NOT_SCHOOL_WHERE|SCHOOL_WHERE)\b/;
const HELPER_SQL = /\$\{\s*(?:REAL_EXAM_SQL|NOT_SCHOOL_SQL|SCHOOL_SQL|notSchoolSql\(|notSchoolSqlText\()/;
/** 26 Sep 2026: a keyed lookup's where — `where: realExamKey({ code })`. */
const HELPER_KEY = /\bwhere:\s*realExamKey\s*\(/;
const HELPER_VAR = (name: string) =>
  new RegExp(`(?:const|let)\\s+${name}\\b[^=;]*=\\s*(?:\\{\\s*\\.\\.\\.\\s*)?(?:REAL_EXAM_WHERE|NOT_SCHOOL_WHERE|SCHOOL_WHERE)\\b`);

interface Site {
  file: string;
  line: number;
  kind: "prisma" | "keyed" | "sql" | "nested" | "enrollment";
  scoped: boolean;
  text: string;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(d.name)) out.push(p);
  }
  return out;
}

const lineOf = (s: string, i: number) => s.slice(0, i).split("\n").length;

/** A match on a comment line (// …, * …, /* …) is prose, not a query. */
function inComment(s: string, i: number): boolean {
  const lineStart = s.lastIndexOf("\n", i - 1) + 1;
  const before = s.slice(lineStart, i);
  return /^\s*(\/\/|\*|\/\*)/.test(before) || /(^|[^:"'`])\/\//.test(before);
}

/** The text of a balanced (...) starting at s[open] === "(". */
function balancedParens(s: string, open: number): string {
  return balanced(s, open, "(", ")");
}
function balanced(s: string, open: number, o: string, c: string): string {
  let depth = 0;
  for (let j = open; j < s.length; j++) {
    if (s[j] === o) depth++;
    else if (s[j] === c && --depth === 0) return s.slice(open, j + 1);
  }
  return s.slice(open);
}

/** End index (exclusive) of the template literal whose opening backtick is
 *  at s[start]; follows ${ … } expressions, strings and nested templates. */
function templateEnd(s: string, start: number): number {
  let i = start + 1;
  while (i < s.length) {
    const c = s[i];
    if (c === "\\") { i += 2; continue; }
    if (c === "`") return i + 1;
    if (c === "$" && s[i + 1] === "{") { i = exprEnd(s, i + 2); continue; }
    i++;
  }
  return s.length;
}
function exprEnd(s: string, i: number): number {
  let depth = 1;
  while (i < s.length) {
    const c = s[i];
    if (c === "`") { i = templateEnd(s, i); continue; }
    if (c === '"' || c === "'") {
      i++;
      while (i < s.length && s[i] !== c) i += s[i] === "\\" ? 2 : 1;
      i++;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return i + 1;
    i++;
  }
  return s.length;
}

/** Outermost raw-SQL template spans: tagged $queryRaw / $executeRaw /
 *  Prisma.sql templates and the string argument of the *Unsafe variants. */
function sqlSpans(s: string): [number, number][] {
  const spans: [number, number][] = [];
  const re = /(?:\$queryRaw|\$executeRaw|\$queryRawUnsafe|\$executeRawUnsafe|Prisma\.sql)\s*(?:<[^`]*?>)?\s*\(?\s*`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const start = m.index + m[0].length - 1;
    const end = templateEnd(s, start);
    if (!spans.some(([a, b]) => start >= a && start < b)) spans.push([start, end]);
    re.lastIndex = end;
  }
  return spans;
}

function scanFile(abs: string): Site[] {
  return scanSource(fs.readFileSync(abs, "utf8"), path.relative(ROOT, abs).split(path.sep).join("/"));
}

function scanSource(src: string, file: string): Site[] {
  const s = src.replace(/\r\n/g, "\n");
  const sites: Site[] = [];

  // findUnique / findFirst by one key are "keyed" (26 Sep 2026): scoped by
  // realExamKey() or a helper constant in the where, never exempt.
  const prismaRe = /\.exam\s*\.\s*(findMany|findFirst|findFirstOrThrow|findUnique|findUniqueOrThrow|count|groupBy|aggregate)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = prismaRe.exec(s))) {
    if (inComment(s, m.index)) continue;
    const args = balancedParens(s, m.index + m[0].length - 1);
    const whereVar = /\bwhere\s*(?:,|\})/.test(args) ? "where" : /\bwhere:\s*([A-Za-z_$][\w$]*)\s*[,}]/.exec(args)?.[1];
    const scoped =
      HELPER_WHERE.test(args) ||
      HELPER_KEY.test(args) ||
      (!!whereVar && !/^(?:REAL_EXAM_WHERE|NOT_SCHOOL_WHERE|SCHOOL_WHERE)$/.test(whereVar) && HELPER_VAR(whereVar).test(s));
    const kind = /^find(?:Unique|First)/.test(m[1]) ? "keyed" : "prisma";
    sites.push({ file, line: lineOf(s, m.index), kind, scoped, text: args.replace(/\s+/g, " ").slice(0, 160) });
  }

  const spans = sqlSpans(s);
  const sqlRe = /\b(?:FROM|JOIN)\s+"Exam"/gi;
  while ((m = sqlRe.exec(s))) {
    if (inComment(s, m.index)) continue;
    const span = spans.find(([a, b]) => m!.index > a && m!.index < b);
    const text = span ? s.slice(span[0], span[1]) : "";
    // Outside any recognised SQL template = unparsed: counted as unscoped so
    // the guard is updated rather than silently skipping a new query shape.
    sites.push({ file, line: lineOf(s, m.index), kind: "sql", scoped: !!span && HELPER_SQL.test(text), text: s.slice(m.index, m.index + 120).replace(/\s+/g, " ") });
  }

  const nestedRe = /\bexam:\s*\{[^{}]*\bactive:\s*true\b/g;
  while ((m = nestedRe.exec(s))) {
    if (inComment(s, m.index)) continue;
    sites.push({ file, line: lineOf(s, m.index), kind: "nested", scoped: false, text: m[0].replace(/\s+/g, " ") });
  }
  return sites;
}

/** Mail audiences (25 Sep 2026, fixer review): the crons that pick who gets
 *  a mail, and which exam it names, through Prisma's Enrollment relation —
 *  `enrollments: { ... }` on a user query, or `.enrollment.findMany(...)`.
 *  The Exam scan above cannot see these (no FROM "Exam", no exam.findMany),
 *  and evening-nudge / daily-five named the newest enrolment as "your exam"
 *  this way. Every such read under src/app/api/cron must carry a helper
 *  (usually `exam: NOT_SCHOOL_WHERE`). Raw-SQL "Enrollment" reads there are
 *  keyed on exam ids from an already-scoped pick and are not scanned. */
function scanEnrollmentSource(src: string, file: string): Site[] {
  const s = src.replace(/\r\n/g, "\n");
  const sites: Site[] = [];
  const re = /\benrollments:\s*\{|\.enrollment\s*\.\s*(?:findMany|findFirst|findFirstOrThrow|count|groupBy|aggregate)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (inComment(s, m.index)) continue;
    const open = m.index + m[0].length - 1;
    const body = s[open] === "{" ? balanced(s, open, "{", "}") : balancedParens(s, open);
    sites.push({ file, line: lineOf(s, m.index), kind: "enrollment", scoped: HELPER_WHERE.test(body), text: body.replace(/\s+/g, " ").slice(0, 160) });
  }
  return sites;
}

const ALL_SITES = walk(SRC).flatMap(scanFile);
const CRON_DIR = path.join(SRC, "app", "api", "cron");
const CRON_ENROLLMENT_SITES = walk(CRON_DIR).flatMap((abs) =>
  scanEnrollmentSource(fs.readFileSync(abs, "utf8"), path.relative(ROOT, abs).split(path.sep).join("/")),
);

describe("every exam list query under src/ is scoped (src/lib/db/exam-scope.ts)", () => {
  it("the scan sees the query sites (a broken detector must not pass vacuously)", () => {
    expect(ALL_SITES.filter((x) => x.kind === "prisma").length).toBeGreaterThanOrEqual(35);
    // 70 keyed lookups on 26 Sep 2026 (68 through realExamKey, 2 allow-listed).
    expect(ALL_SITES.filter((x) => x.kind === "keyed").length).toBeGreaterThanOrEqual(60);
    expect(ALL_SITES.filter((x) => x.kind === "sql").length).toBeGreaterThanOrEqual(80);
    expect(ALL_SITES.filter((x) => x.scoped).length).toBeGreaterThanOrEqual(150);
  });

  it("no unscoped exam query outside the reasoned allow-list, and the list is exact", () => {
    const unscoped = new Map<string, Site[]>();
    for (const x of ALL_SITES.filter((x) => !x.scoped)) unscoped.set(x.file, [...(unscoped.get(x.file) ?? []), x]);
    const problems: string[] = [];
    for (const [file, list] of unscoped) {
      const allowed = UNSCOPED[file]?.n ?? 0;
      if (list.length !== allowed) {
        problems.push(
          `${file}: ${list.length} unscoped exam quer${list.length === 1 ? "y" : "ies"} (allow-listed: ${allowed}) — use REAL_EXAM_WHERE / REAL_EXAM_SQL (or NOT_SCHOOL_* / SCHOOL_*), or add a reasoned UNSCOPED entry:\n` +
            list.map((x) => `    L${x.line} [${x.kind}] ${x.text}`).join("\n"),
        );
      }
    }
    for (const [file, { n }] of Object.entries(UNSCOPED)) {
      if (!unscoped.has(file)) problems.push(`${file}: allow-listed for ${n} but has none — drop the UNSCOPED entry`);
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });

  it("every allow-list entry names an existing file and a reason", () => {
    for (const [file, { n, why }] of Object.entries(UNSCOPED)) {
      expect(fs.existsSync(path.join(ROOT, file)), file).toBe(true);
      expect(n).toBeGreaterThan(0);
      expect(why).toMatch(/^(KEYED|OWN|ADMIN|CREATED|SCHOOL): \S/);
    }
  });

  it("cron mail audiences read through the Enrollment relation are scoped too", () => {
    // daily-five and evening-nudge (audience + named exam), daily-brief.
    expect(CRON_ENROLLMENT_SITES.length).toBeGreaterThanOrEqual(5);
    const unscoped = CRON_ENROLLMENT_SITES.filter((x) => !x.scoped).map((x) => `${x.file}:L${x.line} ${x.text}`);
    expect(unscoped, `add exam: NOT_SCHOOL_WHERE (or REAL_EXAM_WHERE):\n${unscoped.join("\n")}`).toEqual([]);
  });
});

// ── Keyed lookups, the enrolment door and the counters (26 Sep 2026) ──

const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8").replace(/\r\n/g, "\n");

/** Every surface a client-supplied exam code or id reaches. Each must look
 *  the exam up with realExamKey() (Prisma) — a school container then behaves
 *  exactly like an unknown code: notFound(), 404, null. */
const KEYED_PRISMA_FILES = [
  // shared loaders
  "src/lib/db/exam-cache.ts", // getExamShared: /exams/[code] + cutoff
  "src/lib/db/syllabus.ts", // getSyllabusContext: tutor, /api/exams/[code]/syllabus, mocks, adaptive quiz
  "src/lib/exam-night-facts.ts", // loadExamNightExam: /live, /reactions
  "src/lib/exam-week-inputs.ts", // getExamWeekStateByCode: quiz pages
  "src/lib/anon-quiz.ts", // getAnonQuiz: /quiz, topic quiz, challenge
  "src/components/exam-phase/PhaseArticleView.tsx", // /checklist, /live, /reactions article
  "src/components/ExamWeekBlock.tsx",
  // tutor
  "src/app/api/chat/route.ts",
  "src/app/api/chat/import/route.ts",
  "src/app/api/chat-route/route.ts",
  "src/app/chat/page.tsx",
  "src/lib/ai/tools.ts",
  "src/lib/ai/adaptive-quiz.ts",
  "src/lib/db/student-journey.ts",
  // enrolment, coach, mocks
  "src/app/api/exams/[code]/enroll/route.ts",
  "src/app/api/enrollment/shift/route.ts",
  "src/app/api/coach/route.ts",
  "src/app/api/coach/today/drill/route.ts",
  "src/app/coach/page.tsx",
  "src/app/api/mocks/route.ts",
  "src/app/api/mocks/custom/route.ts",
  "src/app/api/mocks/fresh/route.ts",
  "src/lib/focus-topics.ts",
  // alerts, verdicts, standings, discussions, institutions
  "src/app/api/exam-alerts/route.ts",
  "src/app/api/exam-verdict/route.ts",
  "src/app/api/push/subscribe/route.ts",
  "src/lib/score-standing-db.ts",
  "src/lib/challenge-db.ts",
  "src/app/api/discussions/route.ts",
  "src/app/api/i/batches/route.ts",
  // crons that name one exam by id
  "src/app/api/cron/exam-eve/route.ts",
  "src/app/api/cron/exam-day-after/route.ts",
  // /exams/[code]/* loaders with their own query
  "src/app/exams/[code]/archive/page.tsx",
  "src/app/exams/[code]/attempts/page.tsx",
  "src/app/exams/[code]/build-mock/page.tsx",
  "src/app/exams/[code]/checklist/page.tsx",
  "src/app/exams/[code]/context.md/route.ts",
  "src/app/exams/[code]/cutoff/page.tsx",
  "src/app/exams/[code]/exam-week.ics/route.ts",
  "src/app/exams/[code]/guide/page.tsx",
  "src/app/exams/[code]/opengraph-image.tsx",
  "src/app/exams/[code]/pyq/page.tsx",
  "src/app/exams/[code]/pyq/[year]/page.tsx",
  "src/app/exams/[code]/score-estimate/page.tsx",
  "src/app/exams/[code]/syllabus/page.tsx",
  "src/app/exams/[code]/topics/page.tsx",
  "src/app/exams/[code]/topics/[topicCode]/page.tsx",
  "src/app/exams/[code]/topics/[topicCode]/hi/page.tsx",
  "src/app/exams/[code]/tricks/page.tsx",
  "src/app/exams/[code]/updates/page.tsx",
];

/** Raw-SQL lookups by a client code: `e.code = ${code}` must sit beside a
 *  category fragment. */
const KEYED_SQL_FILES = [
  "src/app/api/study-room/route.ts",
  "src/app/api/me/topic-progress/route.ts",
  "src/app/exams/[code]/results/[id]/page.tsx",
  "src/lib/anon-quiz.ts",
];

describe("keyed exam lookups (26 Sep 2026): a school container is an unknown exam everywhere", () => {
  it("every keyed lookup under src/ is scoped or allow-listed (the scan above), and none is exempt", () => {
    const keyed = ALL_SITES.filter((x) => x.kind === "keyed");
    const unscoped = keyed.filter((x) => !x.scoped && !UNSCOPED[x.file]).map((x) => `${x.file}:L${x.line} ${x.text}`);
    expect(unscoped, `use where: realExamKey({ code }) / realExamKey({ id }):\n${unscoped.join("\n")}`).toEqual([]);
  });

  it("every listed route and loader references realExamKey (and none of them a bare where: { code })", () => {
    const problems: string[] = [];
    for (const file of KEYED_PRISMA_FILES) {
      expect(fs.existsSync(path.join(ROOT, file)), file).toBe(true);
      const src = read(file);
      if (!/\bwhere:\s*realExamKey\s*\(/.test(src)) problems.push(`${file}: no where: realExamKey(...)`);
      if (!/import \{[^}]*\brealExamKey\b[^}]*\} from "(?:@\/lib\/db\/exam-scope|\.\/exam-scope)"/.test(src)) problems.push(`${file}: realExamKey not imported from exam-scope`);
      const bare = scanSource(src, file).filter((x) => x.kind === "keyed" && !x.scoped);
      for (const x of bare) problems.push(`${file}:L${x.line} bare keyed lookup ${x.text}`);
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });

  it("every raw-SQL lookup by exam code carries the category fragment", () => {
    const problems: string[] = [];
    for (const file of KEYED_SQL_FILES) {
      const src = read(file);
      const re = /e\.code = \$\{[^}]+\}([^\n]*)/g;
      let m: RegExpExecArray | null;
      let n = 0;
      while ((m = re.exec(src))) {
        n++;
        // The fragment sits on the same line or the JOIN line just above it.
        const lineStart = src.lastIndexOf("\n", m.index - 1) + 1;
        const prevStart = src.lastIndexOf("\n", lineStart - 2) + 1;
        const window = src.slice(prevStart, m.index + m[0].length);
        if (!/\$\{(?:NOT_SCHOOL_SQL|REAL_EXAM_SQL)\}/.test(window)) problems.push(`${file}: ${m[0].trim().slice(0, 90)}`);
      }
      if (n === 0) problems.push(`${file}: no e.code = \${…} lookup found (update KEYED_SQL_FILES)`);
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });

  it("the shared loaders carry the dated why", () => {
    for (const file of ["src/lib/db/exam-cache.ts", "src/lib/db/syllabus.ts", "src/app/api/chat/route.ts"]) {
      expect(read(file), file).toMatch(/26 Sep 2026: (?:realExamKey|`exam` came through realExamKey)/);
    }
  });
});

describe("the one enrolment door (src/lib/db/enrollment.ts, 26 Sep 2026)", () => {
  const DOOR = "src/lib/db/enrollment.ts";

  it("refuses a school container before touching the table", () => {
    const src = read(DOOR);
    expect(src).toMatch(/isSchoolCategory\(exam\.category\)/);
    expect(src.indexOf("isSchoolCategory(exam.category)")).toBeLessThan(src.indexOf("prisma.enrollment.upsert("));
  });

  it("no other Enrollment write exists under src/", () => {
    const re = /\.enrollment\s*\.\s*(?:upsert|create|createMany)\s*\(|INSERT INTO "Enrollment"/g;
    const offenders: string[] = [];
    for (const abs of walk(SRC)) {
      const file = path.relative(ROOT, abs).split(path.sep).join("/");
      if (file === DOOR) continue;
      const s = fs.readFileSync(abs, "utf8").replace(/\r\n/g, "\n");
      let m: RegExpExecArray | null;
      while ((m = re.exec(s))) if (!inComment(s, m.index)) offenders.push(`${file}:L${lineOf(s, m.index)}`);
    }
    expect(offenders, `route Enrollment writes through ensureEnrollment():\n${offenders.join("\n")}`).toEqual([]);
  });

  it("the ten writers go through ensureEnrollment", () => {
    for (const file of [
      "src/app/api/chat/route.ts",
      "src/app/api/exams/[code]/enroll/route.ts",
      "src/app/api/coach/route.ts",
      "src/app/api/mocks/route.ts",
      "src/lib/ai/adaptive-quiz.ts",
      "src/app/chat/page.tsx",
      "src/app/api/attempts/route.ts",
      "src/app/api/enrollment/shift/route.ts",
      "src/app/mocks/[id]/page.tsx",
      "src/app/api/me/onboarding-profile/route.ts",
    ]) {
      const src = read(file);
      expect(src, file).toMatch(/\bensureEnrollment\(/);
      expect(src, file).toMatch(/import \{ ensureEnrollment \} from "@\/lib\/db\/enrollment"/);
    }
  });
});

describe("the counters count real exams' content (26 Sep 2026)", () => {
  it("home 'at a glance': questions and notes join the exam category", () => {
    const src = read("src/app/page.tsx");
    const band = src.slice(src.indexOf("async function loadPortalStatsRaw"), src.indexOf("const loadPortalStats ="));
    expect(band).toMatch(/prisma\.question\.count\(\{ where: \{ exam: NOT_SCHOOL_WHERE \} \}\)/);
    expect(band).toMatch(/FROM "TopicTeachingNote" n[\s\S]*JOIN "Exam" e ON e\.id = s\."examId"[\s\S]*WHERE \$\{NOT_SCHOOL_SQL\}/);
    expect(band).not.toMatch(/prisma\.question\.count\(\)/);
  });

  it("admin insights: question and topic totals join the exam category", () => {
    const src = read("src/lib/db/insights-cache.ts");
    expect(src).not.toMatch(/prisma\.question\.count\(\)/);
    expect(src).not.toMatch(/prisma\.topic\.count\(\)/);
    expect(src.match(/prisma\.question\.count\(\{ where: \{[^\n]*exam: NOT_SCHOOL_WHERE \}/g)?.length ?? 0).toBe(3);
    expect(src.match(/prisma\.topic\.count\(\{ where: \{[^\n]*subject: \{ exam: NOT_SCHOOL_WHERE \}/g)?.length ?? 0).toBe(2);
  });
});

// ── School surfaces (26 Sep 2026, go-live) ──────────────────────────────
// The school pages and their guest quiz read SCHOOL_BOARD containers by
// CATEGORY (src/lib/school/scope.ts SCHOOL_CONTAINER_WHERE) — never by
// `active` (every container is inactive by design) and never through the
// real-exam helpers, which would turn a school code into an unknown exam.
describe("school loaders read school containers by category only (src/lib/school/scope.ts)", () => {
  const SCHOOL_FILES = ["src/lib/school/db.ts", "src/lib/school/surface.ts"];

  it("every exam site in the school loaders carries SCHOOL_CONTAINER_WHERE, and none a real-exam helper", () => {
    for (const file of SCHOOL_FILES) {
      const src = read(file);
      const importLine = src.split("\n").find((l) => /^import \{[^}]*\bSCHOOL_CONTAINER_WHERE\b[^}]*\} from "(?:@\/lib\/school\/scope|\.\/scope)";/.test(l));
      expect(importLine, `${file}: SCHOOL_CONTAINER_WHERE not imported from school/scope`).toBeTruthy();
      expect(src, file).not.toMatch(/\b(?:realExamKey|REAL_EXAM_WHERE|REAL_EXAM_SQL|NOT_SCHOOL_WHERE|NOT_SCHOOL_SQL)\b/);
      const sites = scanSource(src, file).filter((x) => x.kind === "prisma" || x.kind === "keyed" || x.kind === "sql");
      expect(sites.length, `${file}: no exam site found`).toBeGreaterThan(0);
      for (const x of sites) {
        // A Prisma site's args carry the constant; a raw template's category
        // fragment sits in the SQL (the scan's text window is the FROM only).
        const text = x.kind === "sql" ? src : x.text;
        expect(text, `${file}:L${x.line}`).toMatch(/SCHOOL_CONTAINER_WHERE|SCHOOL_CONTAINER_SQL|SCHOOL_CATEGORY/);
      }
    }
  });

  it("the school guest quiz never looks a school container up as an exam", () => {
    const src = read("src/lib/anon-quiz.ts");
    const start = src.indexOf("export async function getSchoolGuestQuiz(");
    expect(start).toBeGreaterThan(0);
    const body = src.slice(start);
    expect(body).not.toContain("prisma.exam.");
    expect(body).not.toMatch(/\brealExamKey\b|\bREAL_EXAM_WHERE\b|\bSCHOOL_WHERE\b/);
    expect(body).toContain("subject: { exam: { ...SCHOOL_CONTAINER_WHERE, code: opts.examCode } }");
    expect(body).toContain("...SCHOOL_SERVABLE_QUESTION_WHERE, topicId: { in: topicIds }, exam: SCHOOL_CONTAINER_WHERE");
    expect(body).toContain("if (pool.length < SCHOOL_GUEST_QUIZ_MIN) return null;");
  });

  it("SCHOOL_CONTAINER_WHERE pins the category and reads no active flag", () => {
    const src = read("src/lib/school/scope.ts");
    expect(src).toContain("export const SCHOOL_CONTAINER_WHERE = { category: SCHOOL_CATEGORY } satisfies Prisma.ExamWhereInput;");
    expect(src).not.toMatch(/\bactive:\s*(?:true|false)\b/);
  });
});

describe("the detector itself", () => {
  const scan = (src: string) => scanSource(src, "fixture.ts");

  it("flags the unscoped shapes", () => {
    const sites = scan(
      [
        "await prisma.exam.findMany({ where: { active: true } });",
        "await prisma.exam\n  .count({ where: { active: true } });",
        'await prisma.$queryRaw`SELECT e.code FROM "Exam" e WHERE e.active = TRUE`;',
        "await prisma.examNewsItem.findMany({ where: { exam: { active: true } } });",
        'await prisma.$queryRawUnsafe(`SELECT 1 FROM "ExamEligibility" x JOIN "Exam" e ON e.id = x."examId"`);',
      ].join("\n"),
    );
    expect(sites.map((x) => [x.kind, x.scoped])).toEqual([
      ["prisma", false],
      ["prisma", false],
      ["sql", false],
      ["sql", false],
      ["nested", false],
    ]);
  });

  it("accepts the helper forms, a helper-initialised where variable, and skips comments", () => {
    const sites = scan(
      [
        "await prisma.exam.findMany({ where: REAL_EXAM_WHERE });",
        "await prisma.exam.count({ where: { ...REAL_EXAM_WHERE, state } });",
        "const where: Prisma.ExamWhereInput = { ...REAL_EXAM_WHERE };",
        "await prisma.exam.findMany({ where, select: { code: true } });",
        "// prisma.exam.findMany() in prose",
        'await prisma.$queryRaw`SELECT e.code FROM "Exam" e WHERE ${REAL_EXAM_SQL} AND ${fn(Prisma.sql`x`)}`;',
        'await prisma.$queryRaw`SELECT 1 FROM "Exam" e2 WHERE e2.active = TRUE AND ${notSchoolSql("e2")}`;',
        "await prisma.examNewsItem.findMany({ where: { exam: REAL_EXAM_WHERE } });",
      ].join("\n"),
    );
    expect(sites.map((x) => [x.kind, x.scoped])).toEqual([
      ["prisma", true],
      ["prisma", true],
      ["prisma", true],
      ["sql", true],
      ["sql", true],
    ]);
  });

  it("keyed lookups (26 Sep 2026): a bare findUnique / findFirst by code or id is flagged, realExamKey() accepted", () => {
    const sites = scan(
      [
        "await prisma.exam.findUnique({ where: { code } });",
        "await prisma.exam\n  .findUnique({ where: { id: examId }, select: { code: true } })\n  .catch(() => null);",
        "await prisma.exam.findFirst({ where: { code: body.examCode, active: true } });",
        "await prisma.exam.findUnique({ where: realExamKey({ code }) });",
        "await prisma.exam.findUnique({\n  where: realExamKey({ id: meta.examId }),\n  select: { code: true },\n});",
        "await prisma.exam.findFirst({ where: { ...REAL_EXAM_WHERE, code } });",
        "// prisma.exam.findUnique({ where: { code } }) in prose",
      ].join("\n"),
    );
    expect(sites.map((x) => [x.kind, x.scoped])).toEqual([
      ["keyed", false],
      ["keyed", false],
      ["keyed", false],
      ["keyed", true],
      ["keyed", true],
      ["keyed", true],
    ]);
  });

  it("the cron Enrollment scan flags an unscoped relation read and accepts the helper", () => {
    const sites = scanEnrollmentSource(
      [
        "await prisma.user.findMany({ where: { enrollments: { some: { active: true } } },",
        "  select: { enrollments: { where: { active: true }, select: { exam: { select: { shortName: true } } } } } });",
        "await prisma.enrollment.findMany({ where: { active: true }, include: { exam: true } });",
        "await prisma.user.findMany({ where: { enrollments: { some: { active: true, exam: NOT_SCHOOL_WHERE } } } });",
        "await prisma.enrollment.findMany({ where: { active: true, exam: NOT_SCHOOL_WHERE } });",
        "// enrollments: { some: { active: true } } in prose",
      ].join("\n"),
      "fixture.ts",
    );
    expect(sites.map((x) => [x.kind, x.scoped])).toEqual([
      ["enrollment", false],
      ["enrollment", false],
      ["enrollment", false],
      ["enrollment", true],
      ["enrollment", true],
    ]);
  });
});
