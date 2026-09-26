// When the exam-day pages are worth Google's index (26 Sep 2026, G1 index
// hygiene) — src/lib/exam-week-gates.ts, and the pages and sitemap that read
// it. Pure helper + source pins; no DB.

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import {
  CHECKLIST_INDEX_AFTER_DAYS,
  CHECKLIST_INDEX_AHEAD_DAYS,
  EXAM_DAY_INDEX_AFTER_DAYS,
  EXAM_DAY_INDEX_BEFORE_DAYS,
  GATE_ROWS_AHEAD_DAYS,
  GATE_ROWS_PAST_DAYS,
  NO_GATES_OPEN,
  examPageIndexGates,
  examPageRobots,
  groupGateRows,
} from "@/lib/exam-week-gates";
import { GOOGLE_ONLY_NOINDEX } from "@/lib/news-index-policy";
import type { TimelineInput } from "@/lib/exam-timeline";

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
function stripComments(src: string): string {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

// 11:30 IST on 26 Sep 2026. Rows are stored at midnight UTC of their IST day.
const NOW = new Date("2026-09-26T06:00:00Z");
const DAY = 86_400_000;
const dayAt = (offset: number) => new Date(Date.parse("2026-09-26T00:00:00Z") + offset * DAY);
const OFFICIAL = "https://ssc.gov.in/notice.pdf";
const REPORTED = "https://testbook.com/ssc-cgl";
let n = 0;
function r(kind: string | null, offset: number, o: { confidence?: string; url?: string | null; label?: string; isExamDay?: boolean } = {}): TimelineInput {
  return {
    id: `r${++n}`,
    kind,
    label: o.label ?? (kind === "EXAM" ? "Tier 1 exam" : kind === "ANSWER_KEY" ? "Tier 1 answer key" : "Row"),
    date: dayAt(offset),
    isExamDay: o.isExamDay ?? kind === "EXAM",
    confidence: o.confidence ?? "official",
    url: o.url === undefined ? OFFICIAL : o.url,
  };
}
const gates = (rows: TimelineInput[], officialUrl?: string | null) => examPageIndexGates(rows, officialUrl, NOW);

describe("the windows", () => {
  it("constants: 3 days before to 30 after (live / reactions / estimator), next 21 or last 3 (checklist)", () => {
    expect([EXAM_DAY_INDEX_BEFORE_DAYS, EXAM_DAY_INDEX_AFTER_DAYS, CHECKLIST_INDEX_AHEAD_DAYS, CHECKLIST_INDEX_AFTER_DAYS]).toEqual([3, 30, 21, 3]);
    // The sitemap's SQL range holds every row a window can read, with slack.
    expect(GATE_ROWS_PAST_DAYS).toBeGreaterThan(EXAM_DAY_INDEX_AFTER_DAYS);
    expect(GATE_ROWS_AHEAD_DAYS).toBeGreaterThan(Math.max(EXAM_DAY_INDEX_BEFORE_DAYS, CHECKLIST_INDEX_AHEAD_DAYS));
  });

  it("live / reactions: an announced typed exam day from 3 days ahead to 30 days back, inclusive", () => {
    for (const d of [3, 1, 0, -1, -30]) expect(gates([r("EXAM", d)]).examWeek, `day ${d}`).toBe(true);
    for (const d of [4, 21, -31, -60]) expect(gates([r("EXAM", d)]).examWeek, `day ${d}`).toBe(false);
    expect(gates([r("EXAM", -10, { url: REPORTED })]).examWeek).toBe(true); // reported counts
  });

  it("checklist: an announced typed exam day in the next 21 days or the last 3, inclusive", () => {
    for (const d of [21, 7, 0, -3]) expect(gates([r("EXAM", d)]).checklist, `day ${d}`).toBe(true);
    for (const d of [22, 60, -4, -30]) expect(gates([r("EXAM", d)]).checklist, `day ${d}`).toBe(false);
    expect(gates([r("EXAM", 10, { url: REPORTED })]).checklist).toBe(true);
  });

  it("an estimate never opens a window — nor a row cited only to a denylisted copycat, nor an untyped legacy row", () => {
    expect(gates([r("EXAM", 0, { confidence: "expected", url: null })])).toEqual(NO_GATES_OPEN);
    expect(gates([r("EXAM", 0, { confidence: "official", url: null })])).toEqual(NO_GATES_OPEN); // announced needs a citation
    expect(gates([r("EXAM", 0, { url: "https://sarkariresult.com.cm/ssc-cgl" })])).toEqual(NO_GATES_OPEN);
    expect(gates([r("EXAM", 0, { url: "https://www.fastjobsearchers.com/x" })])).toEqual(NO_GATES_OPEN);
    expect(gates([r(null, 0, { label: "Tier 1 exam date", isExamDay: true })])).toEqual(NO_GATES_OPEN);
    expect(gates([r("ADMIT_CARD", 0), r("RESULT", -2)])).toEqual(NO_GATES_OPEN);
    expect(gates([])).toEqual(NO_GATES_OPEN);
  });
});

describe("score-estimate: the window AND an official answer key out", () => {
  it("an official typed key on or after the window's exam day, not in the future", () => {
    expect(gates([r("EXAM", -5), r("ANSWER_KEY", -2)]).scoreEstimate).toBe(true);
    expect(gates([r("EXAM", -5), r("ANSWER_KEY", 0)]).scoreEstimate).toBe(true);
    expect(gates([r("EXAM", -5), r("ANSWER_KEY", -5)]).scoreEstimate).toBe(true);
    // An "answer key" row stored as OTHER is an answer-key row (declared).
    expect(gates([r("EXAM", -5), r("OTHER", -1, { label: "Provisional answer key released" })]).scoreEstimate).toBe(true);
  });

  it("no key, a future key, a reported key, a key from before the paper, or a paper outside the window: not indexable", () => {
    expect(gates([r("EXAM", -5)]).scoreEstimate).toBe(false);
    expect(gates([r("EXAM", -5), r("ANSWER_KEY", 2)]).scoreEstimate).toBe(false);
    expect(gates([r("EXAM", -5), r("ANSWER_KEY", -2, { url: REPORTED })]).scoreEstimate).toBe(false);
    expect(gates([r("EXAM", -5), r("ANSWER_KEY", -6)]).scoreEstimate).toBe(false);
    expect(gates([r("EXAM", -31), r("ANSWER_KEY", -2)]).scoreEstimate).toBe(false);
    expect(gates([r("EXAM", -5, { confidence: "expected", url: null }), r("ANSWER_KEY", -2)]).scoreEstimate).toBe(false);
    // An untyped legacy key never counts.
    expect(gates([r("EXAM", -5), r(null, -2, { label: "Answer key released" })]).scoreEstimate).toBe(false);
  });

  it("the exam's own portal makes a commercial-TLD key official", () => {
    const portal = "https://www.ibps.example.org/";
    const rows = [r("EXAM", -5, { url: REPORTED }), r("ANSWER_KEY", -1, { url: "https://ibps.example.org/key.pdf" })];
    expect(gates(rows).scoreEstimate).toBe(false);
    expect(gates(rows, portal).scoreEstimate).toBe(true);
  });

  it("the CTET case (26 Sep 2026: paper 12 Dec, no key out) is out of every window", () => {
    const d = Math.round((Date.parse("2026-12-12T00:00:00Z") - Date.parse("2026-09-26T00:00:00Z")) / DAY);
    expect(gates([r("EXAM", d)])).toEqual(NO_GATES_OPEN);
  });
});

describe("robots and grouping", () => {
  it("in season: the site default; out of season: Google-only noindex,follow (Bing and ChatGPT search keep index,follow)", () => {
    expect(examPageRobots(true)).toBeUndefined();
    expect(examPageRobots(false)).toBe(GOOGLE_ONLY_NOINDEX);
    expect(examPageRobots(false)).toEqual({ index: true, follow: true, googleBot: { index: false, follow: true } });
  });

  it("groupGateRows keys the sitemap's flat read by exam code", () => {
    const rows = [{ ...r("EXAM", 0), code: "A" }, { ...r("EXAM", 1), code: "B" }, { ...r("ANSWER_KEY", 0), code: "A" }];
    const g = groupGateRows(rows);
    expect([...g.keys()]).toEqual(["A", "B"]);
    expect(g.get("A")).toHaveLength(2);
  });
});

describe("the pages and the sitemap read the one rule", () => {
  it("/live and /reactions: examWeek, Google-only robots, no all-engine noindex helper", () => {
    for (const rel of ["src/app/exams/[code]/live/page.tsx", "src/app/exams/[code]/reactions/page.tsx"]) {
      const src = stripComments(read(rel));
      expect(src, rel).toMatch(/const indexable = examPageIndexGates\(inputs\.rows, inputs\.officialUrl\)\.examWeek;/);
      expect(src, rel).toMatch(/robots: examPageRobots\(indexable\),/);
      expect(src, rel).not.toMatch(/exam-phase-indexable|examDayRobots|loadExamWeekExams/);
    }
  });

  it("/score-estimate: scoreEstimate, Google-only robots; its /cutoff links render only when that page does", () => {
    const src = stripComments(read("src/app/exams/[code]/score-estimate/page.tsx"));
    expect(src).toMatch(/const indexable = examPageIndexGates\(inputs\.rows, inputs\.officialUrl\)\.scoreEstimate;/);
    expect(src).toMatch(/robots: examPageRobots\(indexable\),/);
    expect(src).not.toMatch(/exam-phase-indexable|examDayRobots/);
    const cutoffLinks = [...src.matchAll(/\/cutoff`/g)].length;
    expect(cutoffLinks).toBe(2);
    expect(src).toMatch(/\{publishedCount > 0 && gates\.cutoff && \(/);
    expect(src).toMatch(/\{gates\.cutoff && \(\s*<Link href=\{p\(`\/exams\/\$\{exam\.code\}\/cutoff`\)\}/);
  });

  it("/checklist: checklist, Google-only robots", () => {
    const src = stripComments(read("src/app/exams/[code]/checklist/page.tsx"));
    expect(src).toMatch(/const indexable = examPageIndexGates\(loaded\.rows, loaded\.officialUrl\)\.checklist;/);
    expect(src).toMatch(/robots: examPageRobots\(indexable\),/);
  });

  it("sitemap.ts lists the four families from the same verdict, and no longer lists every checklist", () => {
    const src = stripComments(read("src/app/sitemap.ts"));
    expect(src).toMatch(/examPageIndexGates\(rows, rows\[0\]\?\.officialUrl \?\? null\)/);
    expect(src).toMatch(/const estimatorExams = exams\.filter\(\(e\) => seasonGate\(e\.code\)\.scoreEstimate\);/);
    expect(src).toMatch(/const checklistExams = exams\.filter\(\(e\) => seasonGate\(e\.code\)\.checklist\);/);
    expect(src).toMatch(/const weekCodes = exams\.filter\(\(e\) => seasonGate\(e\.code\)\.examWeek\)/);
    expect(src).toMatch(/if \(!seasonGate\(a\.exam\.code\)\.examWeek\) continue;/);
    expect(src).toMatch(/d\.kind IS NOT NULL/);
    expect(src).not.toMatch(/loadExamWeekExams|standingSitting|SELECT e\.code FROM "Exam" e WHERE/);
    // The score-estimate twins follow the English set.
    expect(src).toMatch(/const estimatorCodes = new Set\(estimatorExams\.map\(\(e\) => e\.code\)\);/);
  });
});
