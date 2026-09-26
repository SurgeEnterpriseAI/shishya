// Exam category hubs (26 Sep 2026, G4): membership, the floor, date tiers,
// eligibility provenance and the sitemap. src/lib/exam-categories.ts over
// fixture rows shaped like src/lib/exam-list-rows.ts. No DB.
// Run: npx vitest run tests/unit/exam-categories.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  EXAM_CATEGORIES,
  EXAM_CATEGORY_MIN,
  categoryFaq,
  categoryHubSitemapEntriesFrom,
  categoryLead,
  eligibilityView,
  examsInCategory,
  findExamCategory,
  isCategoryLive,
  nextExamCell,
  soonestExam,
  type ExamLike,
} from "@/lib/exam-categories";
import { EXAM_STATIC_SEGMENTS } from "@/lib/url-normalize";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");
/** Source without comments (the header comments name what is left out). */
const code = (rel: string) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

function row(code: string, category: string, over: Partial<ExamLike> = {}): ExamLike {
  return {
    code,
    shortName: code.replace(/_/g, " "),
    name: code.replace(/_/g, " "),
    category,
    state: category === "STATE_LEVEL" ? code.slice(0, 2) : null,
    candidatesPerYear: null,
    updatedAt: "2026-09-20T00:00:00.000Z",
    mockCount: 3,
    eligibility: { minAge: 20, maxAge: 30, educationTags: ["GRADUATE", "ANY_STREAM"], educationNote: "Bachelor's degree in any discipline", officialUrl: "https://example.gov.in", officialName: "Board" },
    nextExam: null,
    ...over,
  };
}

// The catalogue's shape on 26 Sep 2026 (codes and categories as in the DB).
const ROWS: ExamLike[] = [
  ...["IBPS_CLERK", "IBPS_PO", "IBPS_RRB", "RBI_GRADE_B", "SBI_CLERK", "SBI_PO"].map((c) => row(c, "BANKING")),
  ...["RRB_ALP", "RRB_GROUP_D", "RRB_NTPC", "SSC_CGL", "SSC_CHSL", "SSC_GD", "SSC_MTS", "CDS", "NDA"].map((c) => row(c, "GOVT_JOBS")),
  ...["AP_POLICE_PC", "BR_POLICE_PC", "BR_POLICE_SI", "DL_POLICE_PC", "GJ_POLICE_PC"].map((c) => row(c, "STATE_LEVEL")),
  ...["AP_TET", "BR_TET", "CG_TET", "GJ_TET"].map((c) => row(c, "STATE_LEVEL")),
  row("CTET", "TEACHING"),
  row("KA_KPSC_KAS", "STATE_LEVEL", { name: "Karnataka Administrative Service (KAS) Prelims", shortName: "KPSC KAS" }),
  row("AP_APPSC_GROUP2", "STATE_LEVEL", { name: "APPSC Group II Services", shortName: "APPSC Group 2" }),
  row("TN_TNPSC_GROUP1", "STATE_LEVEL", { name: "TNPSC Group 1", shortName: "TNPSC Group 1" }),
  row("UP_UPPSC_PCS", "STATE_LEVEL", { name: "UPPSC PCS", shortName: "UPPSC PCS" }),
  row("BR_BPSC_CCE", "STATE_LEVEL", { name: "BPSC Combined Competitive Exam", shortName: "BPSC CCE" }),
  row("MP_MPESB", "STATE_LEVEL", { name: "MP Employees Selection Board Group 4", shortName: "MPESB" }),
  row("UPSC_PRELIMS", "CIVIL_SERVICES"),
  ...["JEE_MAIN", "JEE_ADVANCED", "GATE_CSE"].map((c) => row(c, "ENGINEERING")),
  ...["KA_KCET", "MH_MHTCET", "TS_EAMCET"].map((c) => row(c, "STATE_LEVEL")),
  ...["AILET", "LSAT_INDIA"].map((c) => row(c, "LAW")),
  ...["AP_LAWCET", "TS_LAWCET", "MH_MAHCET_LAW"].map((c) => row(c, "STATE_LEVEL")),
  ...["NEET_UG", "NEET_PG"].map((c) => row(c, "MEDICAL")),
  row("CAT", "MBA"),
  ...["NID_DAT", "NIFT", "UCEED"].map((c) => row(c, "UNIVERSITY")),
  ...["IOQM", "NSEP"].map((c) => row(c, "OLYMPIAD")),
];

const members = (slug: string) => examsInCategory(findExamCategory(slug)!, ROWS).map((e) => e.code);

describe("membership", () => {
  it("each category holds the exams its rule names — tags, code prefixes, PSC type", () => {
    expect(members("banking")).toEqual(["IBPS_CLERK", "IBPS_PO", "IBPS_RRB", "RBI_GRADE_B", "SBI_CLERK", "SBI_PO"]);
    expect(members("railway")).toEqual(["RRB_ALP", "RRB_GROUP_D", "RRB_NTPC"]);
    expect(members("ssc")).toEqual(["SSC_CGL", "SSC_CHSL", "SSC_GD", "SSC_MTS"]);
    expect(members("police")).toEqual(["AP_POLICE_PC", "BR_POLICE_PC", "BR_POLICE_SI", "DL_POLICE_PC", "GJ_POLICE_PC"]);
    expect(members("teaching")).toEqual(["AP_TET", "BR_TET", "CG_TET", "GJ_TET", "CTET"]);
    expect(members("defence")).toEqual(["CDS", "NDA"]);
    expect(members("state-psc")).toEqual(["KA_KPSC_KAS", "AP_APPSC_GROUP2", "TN_TNPSC_GROUP1", "UP_UPPSC_PCS", "BR_BPSC_CCE"]);
    expect(members("state-psc")).not.toContain("MP_MPESB"); // a staff-selection board, not a PSC
    expect(members("upsc-civil-services")).toEqual(["UPSC_PRELIMS"]);
    expect(members("engineering-entrance")).toEqual(["JEE_MAIN", "JEE_ADVANCED", "GATE_CSE", "KA_KCET", "MH_MHTCET", "TS_EAMCET"]);
    expect(members("law-entrance")).toEqual(["AILET", "LSAT_INDIA", "AP_LAWCET", "TS_LAWCET", "MH_MAHCET_LAW"]);
    expect(members("medical-entrance")).toEqual(["NEET_UG", "NEET_PG"]);
    expect(members("management-entrance")).toEqual(["CAT"]);
    expect(members("design-entrance")).toEqual(["NID_DAT", "NIFT", "UCEED"]);
  });

  it("no olympiad is ever in a category", () => {
    for (const c of EXAM_CATEGORIES) for (const code of members(c.slug)) expect(code === "IOQM" || code === "NSEP", `${c.slug} ${code}`).toBe(false);
  });

  it("the floor: a category renders (and is in the sitemap) only with at least EXAM_CATEGORY_MIN exams", () => {
    expect(EXAM_CATEGORY_MIN).toBe(5);
    const live = EXAM_CATEGORIES.filter((c) => isCategoryLive(examsInCategory(c, ROWS))).map((c) => c.slug);
    expect(live).toEqual(["banking", "police", "teaching", "state-psc", "engineering-entrance", "law-entrance"]);
    const entries = categoryHubSitemapEntriesFrom("https://shishya.in", ROWS);
    expect(entries.map((e) => e.url)).toEqual(live.map((s) => `https://shishya.in/exams/category/${s}`));
    for (const e of entries) expect(e.lastModified).toBeUndefined(); // Exam.updatedAt is not a content date
  });

  it("slugs are lower-case, unique, and 'category' is a static sibling of [code] in the URL normaliser", () => {
    const slugs = EXAM_CATEGORIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z-]+$/);
    expect(EXAM_STATIC_SEGMENTS.has("category")).toBe(true);
    expect(EXAM_STATIC_SEGMENTS.has("after")).toBe(true);
  });
});

describe("dates carry their tier; an estimate is called one", () => {
  const banking = findExamCategory("banking")!;
  const list = examsInCategory(banking, ROWS);

  it("lead: the soonest announced exam, else the nearest estimate, else none", () => {
    expect(categoryLead(banking, list)).toBe("6 banking exams on Shishya; no upcoming exam day is on Shishya's tracker for them yet.");
    const withDates = list.map((e) =>
      e.code === "SBI_PO"
        ? { ...e, nextExam: { day: "2026-11-02", tier: "official" as const, label: "Prelims" } }
        : e.code === "IBPS_PO"
          ? { ...e, nextExam: { day: "2026-10-10", tier: "expected" as const, label: "Prelims" } }
          : e,
    );
    expect(soonestExam(withDates)?.code).toBe("SBI_PO"); // announced beats an earlier estimate
    expect(categoryLead(banking, withDates)).toBe("6 banking exams on Shishya; next exam: SBI PO on 2 Nov 2026 (official).");
    const estimatesOnly = list.map((e) => (e.code === "IBPS_PO" ? { ...e, nextExam: { day: "2026-10-10", tier: "expected" as const, label: "Prelims" } } : e));
    expect(categoryLead(banking, estimatesOnly)).toContain("the nearest estimate is IBPS PO around 10 Oct 2026 (expected — an estimate, not announced)");
    expect(nextExamCell({ nextExam: { day: "2026-10-10", tier: "expected", label: "x" } })).toBe("10 Oct 2026 (expected — an estimate)");
    expect(nextExamCell({ nextExam: null })).toBe("Not on the tracker yet");
  });

  it("the FAQ names only announced dates", () => {
    expect(categoryFaq(banking, list).a).toMatch(/^None of the 6 banking exams on Shishya has an upcoming exam day announced/);
    const withDates = list.map((e) => (e.code === "SBI_PO" ? { ...e, nextExam: { day: "2026-11-02", tier: "reported" as const, label: "Prelims" } } : e));
    expect(categoryFaq(banking, withDates)).toEqual({
      q: "When is the next banking exam?",
      a: "Announced on Shishya's tracker: SBI PO — 2 Nov 2026 (reported). Official dates come from the conducting body's own site; reported ones from a cited secondary source.",
    });
  });
});

describe("eligibility provenance", () => {
  it("hand-checked deep content first (with its month and source), else the AI summary labelled indicative", () => {
    const cgl = eligibilityView(row("SSC_CGL", "GOVT_JOBS"))!;
    expect(cgl.basis).toBe("checked");
    expect(cgl.checkedMonth).toMatch(/^\d{4}-\d{2}$/);
    expect(cgl.sourceUrl).toMatch(/^https?:\/\//);
    const other = eligibilityView(row("AP_TET", "STATE_LEVEL"))!;
    expect(other).toEqual({ age: "20–30 years", qualification: "Bachelor's degree in any discipline", basis: "indicative", sourceUrl: "https://example.gov.in", checkedMonth: null });
    expect(eligibilityView(row("X_NONE", "STATE_LEVEL", { eligibility: null }))).toBeNull();
    expect(eligibilityView(row("X_AGE", "STATE_LEVEL", { eligibility: { ...row("A", "X").eligibility!, minAge: null, maxAge: 25 } }))!.age).toBe("Up to 25 years");
  });

  it("the table shows no vacancies and no paper pattern", () => {
    const table = code("src/components/ExamCompareTable.tsx");
    expect(table).not.toMatch(/vacanc/i);
    expect(table).not.toMatch(/totalQuestions|totalMarks|durationMin|negativeMark/);
    expect(code("src/lib/exam-list-rows.ts")).not.toMatch(/vacancies/i);
  });
});

describe("the route", () => {
  it("404s any other slug and below the floor; the browse and entrance pages link only live hubs", () => {
    const page = read("src/app/exams/category/[slug]/page.tsx");
    expect(page).toContain("export const dynamicParams = false;");
    expect(page).toContain("if (!isCategoryLive(list)) return null;");
    expect(read("src/app/exams/browse/page.tsx")).toContain("isCategoryLive(examsInCategory(x.c, listRows))");
    expect(read("src/app/exams/entrance/page.tsx")).toContain('c.slug.endsWith("-entrance") && isCategoryLive(examsInCategory(c, listRows))');
  });
});
