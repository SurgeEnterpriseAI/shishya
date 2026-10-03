// The site description's question count belongs to the exams (3 Oct 2026,
// crawl-audit fix C3).
//
// /about, /press, /context.md and the first line of /llms-full.txt say
// "192 entrance and government exams with 41,700+ practice questions
// answer-checked by AI". 41,777 counted the 6,881 school-chapter questions
// too; the exams' own figure is 34,896. The sentence (src/lib/site-description.ts,
// src/lib/section-context.ts) is unchanged — it becomes true through the
// count alone:
//   • countCheckedQuestions(scope) in src/lib/site-description-counts.ts:
//     "site" (the default, kept by /shishya-in-numbers, whose row says
//     "on live exams and school chapters") or "exams" (REAL_EXAM_SQL alone);
//     loadSiteDescriptionCounts() passes "exams";
//   • loadCheckedQuestionCount() in src/lib/platform-counts.ts (context.md,
//     llms-full.txt) counts live real exams only.
// Source reads only. No DB, no network.
// Run: npx vitest run tests/unit/question-count-scope.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/** Code only: comments name the old rule on purpose. */
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

/** The body of `export async function <name>(` up to the next top-level `export`. */
function fnBody(src: string, name: string): string {
  const start = src.indexOf(`export async function ${name}(`);
  expect(start, name).toBeGreaterThanOrEqual(0);
  const next = src.indexOf("\nexport ", start + 1);
  return src.slice(start, next === -1 ? undefined : next);
}

describe("site-description-counts.ts: the description's count is exam-only", () => {
  const src = code("src/lib/site-description-counts.ts");

  it("countCheckedQuestions takes a scope, 'site' by default", () => {
    expect(src).toContain('export async function countCheckedQuestions(scope: "site" | "exams" = "site"): Promise<number>');
  });

  it("the 'exams' query is REAL_EXAM_SQL alone; the 'site' query also counts school chapters", () => {
    const body = fnBody(src, "countCheckedQuestions");
    const [examsQuery, siteQuery] = body.split(/:\s*await prisma\.\$queryRaw/);
    expect(examsQuery).toContain('scope === "exams"');
    expect(examsQuery).toMatch(/AND \$\{REAL_EXAM_SQL\}\n/);
    expect(examsQuery).not.toContain("SCHOOL_CATEGORY");
    expect(siteQuery).toContain('(${REAL_EXAM_SQL} OR e."category"::text = ${SCHOOL_CATEGORY})');
  });

  it("loadSiteDescriptionCounts passes 'exams'", () => {
    const body = fnBody(src, "loadSiteDescriptionCounts");
    expect(body).toContain('countCheckedQuestions("exams")');
    expect(body).not.toMatch(/countCheckedQuestions\(\)/);
  });

  it("/shishya-in-numbers keeps the site-wide count (its row names school chapters)", () => {
    const numbers = code("src/lib/public-numbers.ts");
    expect(numbers).toMatch(/countCheckedQuestions\(\)/);
    expect(numbers).not.toContain('countCheckedQuestions("exams")');
  });
});

describe("platform-counts.ts: the machine files' count is exam-only", () => {
  const src = code("src/lib/platform-counts.ts");

  it("loadCheckedQuestionCount holds REAL_EXAM_SQL and no SCHOOL_CATEGORY", () => {
    const body = fnBody(src, "loadCheckedQuestionCount");
    expect(body).toMatch(/AND \$\{REAL_EXAM_SQL\}\n/);
    expect(body).not.toContain("SCHOOL_CATEGORY");
    expect(src).not.toContain("SCHOOL_CATEGORY");
  });
});
