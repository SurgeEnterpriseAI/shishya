// The practice rule (27 Sep 2026, src/lib/exam-practice-state.ts): an exam
// HAS PRACTICE with one checked question or one shared mock. One rule for the
// hub, its title / description / keywords / Course JSON-LD, its FAQ, the
// practice boxes on /updates, /cutoff, /syllabus and /guide, the news
// permalink, the share card, context.md, llms-full.txt, the sitemap and the
// search — pinned here as pure checks plus source checks of the wiring (vitest
// here cannot import the pages). No DB, no network.
// Run: npx vitest run tests/unit/exam-practice-state.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  NO_PRACTICE,
  PRACTICE_KIN,
  practiceStateFromCounts,
  relatedPracticeExams,
  type PracticeCatalogRow,
} from "@/lib/exam-practice-state";

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8").replace(/\r\n/g, "\n");
/** Code only — comments quote the removed wording on purpose. */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

const row = (code: string, category: string, questions: number, candidatesPerYear: number, state: string | null = null, systemMocks = 0): PracticeCatalogRow => ({
  code,
  shortName: code.replace(/_/g, " "),
  category,
  state,
  candidatesPerYear,
  practice: practiceStateFromCounts({ questions, systemMocks }),
});

// The 27 Sep 2026 read-only probe's shape: 12 live exams and the 14 new
// national rows with no practice, beside exams that have it.
const CATALOG: PracticeCatalogRow[] = [
  row("SSC_CGL", "GOVT_JOBS", 595, 3_000_000),
  row("SSC_CHSL", "GOVT_JOBS", 327, 3_500_000),
  row("SSC_GD", "GOVT_JOBS", 305, 5_000_000),
  row("SSC_MTS", "GOVT_JOBS", 263, 4_000_000),
  row("SSC_CPO", "GOVT_JOBS", 0, 700_000),
  row("SSC_JE", "GOVT_JOBS", 0, 500_000),
  row("GATE_CSE", "ENGINEERING", 90, 150_000),
  row("GATE_ME", "ENGINEERING", 0, 100_000),
  row("JEE_MAIN", "ENGINEERING", 303, 1_400_000),
  row("JEE_ADVANCED", "ENGINEERING", 147, 180_000),
  row("BITSAT", "ENGINEERING", 0, 300_000),
  row("CTET", "TEACHING", 500, 2_000_000),
  row("UGC_NET", "TEACHING", 0, 1_000_000),
  row("CUET_UG", "UNIVERSITY", 461, 1_500_000),
  row("CUET_PG", "UNIVERSITY", 0, 600_000),
  row("NIFT", "UNIVERSITY", 0, 30_000),
  row("NEET_UG", "MEDICAL", 487, 2_300_000),
  row("NEET_PG", "MEDICAL", 0, 200_000),
  row("AILET", "LAW", 0, 20_000),
  row("CLAT", "LAW", 0, 75_000),
  row("MH_MAHCET_LAW", "STATE_LEVEL", 18, 40_000, "MH"),
  row("AP_LAWCET", "STATE_LEVEL", 19, 20_000, "AP"),
  row("TS_LAWCET", "STATE_LEVEL", 20, 30_000, "TS"),
  row("SBI_PO", "BANKING", 239, 1_000_000),
  row("IBPS_PO", "BANKING", 251, 900_000),
  row("RBI_GRADE_B", "BANKING", 0, 300_000),
  row("UP_POLICE_CONSTABLE", "STATE_LEVEL", 346, 5_000_000, "UP"),
  row("UP_UPSSSC_PET", "STATE_LEVEL", 439, 2_000_000, "UP"),
  row("UP_NEW_BOARD", "STATE_LEVEL", 0, 10_000, "UP"),
];

describe("practiceStateFromCounts — the one rule", () => {
  it("a checked question or a shared mock is practice; nothing is none", () => {
    expect(practiceStateFromCounts({ questions: 0, systemMocks: 0 })).toEqual({ hasPractice: false, questions: 0, systemMocks: 0 });
    expect(practiceStateFromCounts({ questions: 1, systemMocks: 0 }).hasPractice).toBe(true);
    expect(practiceStateFromCounts({ questions: 0, systemMocks: 1 }).hasPractice).toBe(true);
    expect(practiceStateFromCounts({ questions: 595, systemMocks: 22 })).toEqual({ hasPractice: true, questions: 595, systemMocks: 22 });
  });

  it("anything that is not a positive finite count is 0 (a failed or odd read claims none)", () => {
    for (const bad of [null, undefined, {}, { questions: -3 }, { questions: Number.NaN }, { questions: Infinity }, { systemMocks: -1 }]) {
      expect(practiceStateFromCounts(bad as never), JSON.stringify(bad)).toEqual(NO_PRACTICE);
    }
    // Raw SQL counts can arrive as strings or bigints-turned-numbers.
    expect(practiceStateFromCounts({ questions: "7" as unknown as number, systemMocks: 0 })).toEqual({ hasPractice: true, questions: 7, systemMocks: 0 });
    expect(practiceStateFromCounts({ questions: 2.9, systemMocks: 0 }).questions).toBe(2);
    expect(Object.isFrozen(NO_PRACTICE)).toBe(true);
  });
});

describe("relatedPracticeExams — only exams that have practice, most relevant first", () => {
  const rel = (code: string) => relatedPracticeExams(code, CATALOG).map((r) => r.code);

  it("the code family first: SSC JE → the SSC exams with practice, biggest first; GATE ME → GATE CSE", () => {
    expect(rel("SSC_JE")).toEqual(["SSC_GD", "SSC_MTS", "SSC_CHSL", "SSC_CGL"]);
    expect(rel("SSC_CPO")).not.toContain("SSC_JE");
    expect(rel("GATE_ME")).toEqual(["GATE_CSE"]);
    expect(rel("CUET_PG")).toEqual(["CUET_UG"]);
  });

  it("hand-picked kin where the family and category hold nothing honest", () => {
    expect(rel("CLAT")).toEqual(["MH_MAHCET_LAW", "AP_LAWCET", "TS_LAWCET"]);
    expect(rel("AILET")).toEqual(["MH_MAHCET_LAW", "AP_LAWCET", "TS_LAWCET"]);
    expect(rel("BITSAT")).toEqual(["JEE_MAIN", "JEE_ADVANCED"]);
    expect(rel("RBI_GRADE_B")).toEqual(["SBI_PO", "IBPS_PO"]);
  });

  it("an empty kin list means no links — never an unrelated exam", () => {
    for (const c of ["NEET_PG", "NIFT", "CA_FOUNDATION", "JNVST", "CSIR_NET"]) expect(PRACTICE_KIN[c], c).toEqual([]);
    expect(rel("NEET_PG")).toEqual([]); // not NEET UG
    expect(rel("NIFT")).toEqual([]); // not CUET UG
  });

  it("otherwise the same category, the same state first for a state exam", () => {
    expect(rel("UGC_NET")).toEqual(["CTET"]);
    expect(rel("UP_NEW_BOARD")).toEqual(["UP_POLICE_CONSTABLE", "UP_UPSSSC_PET", "MH_MAHCET_LAW", "TS_LAWCET"]);
  });

  it("never the exam itself, never one without practice, at most `max`", () => {
    for (const r of CATALOG) {
      const out = relatedPracticeExams(r.code, CATALOG);
      expect(out.length).toBeLessThanOrEqual(4);
      for (const o of out) {
        expect(o.code).not.toBe(r.code);
        expect(o.practice.hasPractice, `${r.code} → ${o.code}`).toBe(true);
      }
    }
    expect(relatedPracticeExams("SSC_JE", CATALOG, 2)).toHaveLength(2);
    expect(relatedPracticeExams("UNKNOWN", CATALOG)).toEqual([]);
  });
});

describe("wiring — every surface reads the one rule", () => {
  it("the cached reader: real exams, validated questions, shared mocks without live-test papers", () => {
    const db = code("src/lib/db/exam-practice.ts");
    expect(db).toContain("WHERE ${REAL_EXAM_SQL}");
    expect(db).toContain(`FROM "Question" WHERE validated = TRUE`);
    expect(db).toContain(`WHERE "userId" IS NULL AND "generatedBy" IS DISTINCT FROM 'live-test'`);
    expect(db).toContain("practiceStateFromCounts({ questions: Number(r.questions), systemMocks: Number(r.systemMocks) })");
    // A failed read claims no practice by default.
    expect(db).toMatch(/examPracticeState\(code: string, onError: ExamPracticeState = NO_PRACTICE\)/);
  });

  it("the hub applies it to its own cached counts, in the metadata and the body", () => {
    const hub = code("src/app/exams/[code]/page.tsx");
    expect(hub).toContain("practiceStateFromCounts({ questions: shared.validatedQuestionCount, systemMocks: shared.systemMocks.length })");
    expect(hub).toContain("practiceStateFromCounts({ questions: validatedQuestionCount, systemMocks: systemMocks.length })");
  });

  it("the sub-pages, the machine files, the share card and the search read the cached state", () => {
    for (const f of [
      "src/app/exams/[code]/updates/page.tsx",
      "src/app/exams/[code]/cutoff/page.tsx",
      "src/app/exams/[code]/syllabus/page.tsx",
      "src/app/exams/[code]/guide/page.tsx",
      "src/app/exams/[code]/news/[id]/page.tsx",
      "src/app/exams/[code]/opengraph-image.tsx",
      "src/app/exams/[code]/context.md/route.ts",
    ]) {
      expect(code(f), f).toMatch(/examPracticeState\((exam|row\.exam)\.code\)/);
    }
    for (const f of ["src/app/llms-full.txt/route.ts", "src/app/sitemap.ts"]) {
      expect(code(f), f).toContain("await loadExamPracticeStates().catch(() => new Map<string, PracticeCatalogRow>())");
    }
    const search = code("src/lib/search/index-build.ts");
    expect(search).toContain("live: practiceStateFromCounts({ questions: e._count?.questions, systemMocks: e._count?.mocks }).hasPractice,");
    expect(search).toContain('mocks: { where: { userId: null, NOT: { generatedBy: "live-test" } } }');
  });

  it("the sitemap lists the builder only with practice; the hub stays listed", () => {
    const s = code("src/app/sitemap.ts");
    expect(s).toContain(".filter((e) => gate(e.code).buildMock && hasPractice(e.code))");
    expect(s).toMatch(/const examUrls: MetadataRoute\.Sitemap = exams\.map\(/);
  });
});
