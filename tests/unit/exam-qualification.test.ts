// "Exams after {level}" (26 Sep 2026, G4): grouped by the LOWEST listed
// qualification (the quality critic's rule), olympiads out, postgraduation
// held, the floor, computed copy. src/lib/exam-qualification.ts. No DB.
// Run: npx vitest run tests/unit/exam-qualification.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ExamLike } from "@/lib/exam-categories";
import { EXAM_DEEP_CONTENT } from "@/data/exam-deep-content";
import {
  PUBLISHED_LEVELS,
  QUALIFICATION_LEVELS,
  QUALIFICATION_MIN,
  deepLevelTag,
  examsAfter,
  findQualificationLevel,
  isGovernmentExam,
  isLevelIndexable,
  levelCount,
  levelCounts,
  levelOf,
  levelOfTags,
  levelVerdict,
  lowestLevelTag,
  needsTeacherTraining,
  qualificationFaq,
  qualificationLead,
  qualificationSitemapEntriesFrom,
  qualificationTitle,
} from "@/lib/exam-qualification";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");

function row(code: string, category: string, tags: string[], over: Partial<ExamLike> = {}): ExamLike {
  return {
    code,
    shortName: code.replace(/_/g, " "),
    name: code,
    category,
    state: category === "STATE_LEVEL" ? code.slice(0, 2) : null,
    candidatesPerYear: null,
    updatedAt: "2026-09-20T00:00:00.000Z",
    mockCount: 1,
    eligibility: { minAge: 18, maxAge: 30, educationTags: tags, educationNote: "rule", officialUrl: "https://example.gov.in", officialName: null },
    nextExam: null,
    ...over,
  };
}

// Tag sets as the DB holds them on 26 Sep 2026 (tmp-w2-g4-elig probe).
const ROWS: ExamLike[] = [
  row("SSC_GD", "GOVT_JOBS", ["10TH", "ANY_STREAM"]),
  row("SSC_MTS", "GOVT_JOBS", ["10TH", "ANY_STREAM"]),
  row("RRB_GROUP_D", "GOVT_JOBS", ["10TH", "ANY_STREAM", "ITI"]),
  row("RRB_ALP", "GOVT_JOBS", ["10TH", "ITI", "DIPLOMA", "ENGINEERING"]),
  row("HP_HPSSSB", "STATE_LEVEL", ["10TH", "12TH", "GRADUATE", "POSTGRADUATE", "ANY_STREAM"]),
  row("AP_POLYCET", "STATE_LEVEL", ["10TH", "ANY_STREAM"]),
  row("SSC_CHSL", "GOVT_JOBS", ["12TH", "ANY_STREAM"]),
  row("NDA", "GOVT_JOBS", ["12TH", "ANY_STREAM"]),
  row("JEE_MAIN", "ENGINEERING", ["12TH", "SCIENCE"]),
  row("NEET_UG", "MEDICAL", ["12TH", "SCIENCE"]),
  row("CUET_UG", "UNIVERSITY", ["12TH", "ANY_STREAM"]),
  row("HP_TET", "STATE_LEVEL", ["12TH", "DIPLOMA", "GRADUATE", "POSTGRADUATE", "ANY_STREAM"]),
  row("CMI_ADMISSION", "UNIVERSITY", ["12TH", "ANY_STREAM", "GRADUATE", "POSTGRADUATE"]),
  row("AP_AMVI", "STATE_LEVEL", ["DIPLOMA", "ENGINEERING"]),
  row("SSC_CGL", "GOVT_JOBS", ["GRADUATE", "ANY_STREAM"]),
  row("IBPS_PO", "BANKING", ["GRADUATE", "ANY_STREAM"]),
  row("CAT", "MBA", ["GRADUATE", "ANY_STREAM"]),
  row("NEET_PG", "MEDICAL", ["POSTGRADUATE", "MEDICAL", "SPECIFIC_DEGREE"]),
  row("NSEB", "OLYMPIAD", ["12TH", "SCIENCE"]),
  row("SOF_IMO", "OLYMPIAD", ["10TH", "12TH", "ANY_STREAM"]),
  row("LD_LAKSHADWEEP", "STATE_LEVEL", []),
];

describe("grouping by the lowest listed qualification", () => {
  it("lowestLevelTag and levelCount read only the level tags", () => {
    expect(lowestLevelTag(["GRADUATE", "10TH", "ANY_STREAM"])).toBe("10TH");
    expect(lowestLevelTag(["12TH", "ITI"])).toBe("ITI");
    expect(lowestLevelTag(["ANY_STREAM", "SCIENCE"])).toBeNull();
    expect(levelCount(["10TH", "12TH", "GRADUATE", "POSTGRADUATE", "ANY_STREAM"])).toBe(4);
  });

  it("an exam open to 10th never lands on a higher page (the HP HPSSSB case)", () => {
    const hp = ROWS.find((e) => e.code === "HP_HPSSSB")!;
    expect(levelOf(hp)?.slug).toBe("10th");
    const cmi = ROWS.find((e) => e.code === "CMI_ADMISSION")!;
    expect(levelOf(cmi)?.slug).toBe("12th");
    // 27 Sep 2026: NEET PG's checked rule names an MBBS (a bachelor's) while
    // its tags say POSTGRADUATE — on no level page until reconciled.
    expect(levelVerdict(ROWS.find((e) => e.code === "NEET_PG")!)).toEqual({ kind: "disagree", checked: "GRADUATE", tags: "POSTGRADUATE" });
    expect(levelOf(ROWS.find((e) => e.code === "NEET_PG")!)).toBeNull();
    expect(levelOfTags("MEDICAL", ["POSTGRADUATE"])?.slug).toBe("postgraduation");
  });

  it("olympiads and exams with no level tag are on no page", () => {
    for (const code of ["NSEB", "SOF_IMO", "LD_LAKSHADWEEP"]) expect(levelOf(ROWS.find((e) => e.code === code)!), code).toBeNull();
    expect(levelOfTags("OLYMPIAD", ["10TH"])).toBeNull();
  });

  it("government recruitment / eligibility tests are split from entrance / admission tests", () => {
    const g10 = examsAfter(findQualificationLevel("10th")!, ROWS);
    expect(g10.government.map((e) => e.code)).toEqual(["SSC_GD", "SSC_MTS", "RRB_GROUP_D", "RRB_ALP", "HP_HPSSSB"]);
    expect(g10.entrance.map((e) => e.code)).toEqual(["AP_POLYCET"]);
    const g12 = examsAfter(findQualificationLevel("12th")!, ROWS);
    expect(g12.government.map((e) => e.code)).toEqual(["SSC_CHSL", "NDA", "HP_TET"]);
    expect(g12.entrance.map((e) => e.code)).toEqual(["JEE_MAIN", "NEET_UG", "CUET_UG", "CMI_ADMISSION"]);
    expect(isGovernmentExam(ROWS.find((e) => e.code === "JEE_MAIN")!)).toBe(false);
    expect(isGovernmentExam(ROWS.find((e) => e.code === "IBPS_PO")!)).toBe(true);
  });
});

// 27 Sep 2026 (repair, adversarial review): the checked rule and the tags
// must agree, and teacher-training exams are on no level page.
describe("the hand-checked rule and the tags must agree", () => {
  it("deepLevelTag reads the lowest level each checked line names", () => {
    const deep = (code: string) => deepLevelTag(EXAM_DEEP_CONTENT.find((c) => c.examCode === code)!.eligibility!.education);
    expect(deep("SSC_MTS")).toBe("10TH");
    expect(deep("RJ_POLICE_PC")).toBe("10TH"); // "Class 10 / 12 depending on post"
    expect(deep("TN_POLICE_PC")).toBe("12TH");
    expect(deep("RRB_NTPC")).toBe("12TH"); // Class 12 for under-graduate-level posts
    expect(deep("UP_UPCET")).toBe("12TH");
    expect(deep("NATA")).toBe("12TH");
    expect(deep("JEE_ADVANCED")).toBe("12TH");
    expect(deep("CDS")).toBe("GRADUATE"); // "Physics + Maths at 10+2" is a subject rule
    expect(deep("GATE_CSE")).toBe("GRADUATE");
    expect(deep("NEET_PG")).toBe("GRADUATE"); // MBBS
    expect(deep("RBI_GRADE_B")).toBe("GRADUATE");
    expect(deepLevelTag("No formal qualification listed.")).toBeNull();
    // Every checked line of a non-olympiad exam names a level.
    for (const c of EXAM_DEEP_CONTENT) {
      if (!c.eligibility || /^(IOQM|NSE[PCBA])$/.test(c.examCode)) continue;
      expect(deepLevelTag(c.eligibility.education), c.examCode).not.toBeNull();
    }
  });

  it("an exam whose checked rule and tags name different levels is on no page (the review's cases)", () => {
    const tn = row("TN_POLICE_PC", "STATE_LEVEL", ["10TH", "ANY_STREAM"]);
    expect(levelVerdict(tn)).toEqual({ kind: "disagree", checked: "12TH", tags: "10TH" });
    const ntpc = row("RRB_NTPC", "GOVT_JOBS", ["GRADUATE", "ANY_STREAM"]);
    expect(levelOf(ntpc)).toBeNull();
    // Once the tags list 12TH as well, the checked rule agrees: after 12th.
    expect(levelVerdict(row("RRB_NTPC", "GOVT_JOBS", ["12TH", "GRADUATE", "ANY_STREAM"]))).toMatchObject({ kind: "level", basis: "checked", level: { slug: "12th" } });
    expect(levelOf(row("UP_UPCET", "STATE_LEVEL", ["GRADUATE", "ANY_STREAM"]))).toBeNull();
    const g10 = examsAfter(findQualificationLevel("10th")!, [...ROWS, tn]);
    expect(g10.government.map((e) => e.code)).not.toContain("TN_POLICE_PC");
    const gG = examsAfter(findQualificationLevel("graduation")!, [...ROWS, ntpc]);
    expect(gG.government.map((e) => e.code)).not.toContain("RRB_NTPC");
    // An exam with no checked rule keeps the tag rule; with one, "checked".
    expect(levelVerdict(ROWS.find((e) => e.code === "AP_POLYCET")!)).toMatchObject({ kind: "level", basis: "tags" });
    expect(levelVerdict(ROWS.find((e) => e.code === "SSC_GD")!)).toMatchObject({ kind: "level", basis: "checked" });
  });

  it("teaching exams that also need a D.El.Ed. or B.Ed. are counted in the lead, never listed", () => {
    const note = (code: string, category: string, tags: string[], educationNote: string) =>
      row(code, category, tags, { eligibility: { minAge: 18, maxAge: 40, educationTags: tags, educationNote, officialUrl: null, officialName: null } });
    const ctet = row("CTET", "TEACHING", ["12TH", "DIPLOMA", "ANY_STREAM"]); // checked rule names D.El.Ed.
    const reet = note("RJ_REET", "STATE_LEVEL", ["12TH", "DIPLOMA", "ANY_STREAM"], "Senior Secondary (12th) with 50% marks and 2-year Diploma in Elementary Education (D.El.Ed) or B.Ed for Level 1");
    const hpTet = note("HP_TET", "STATE_LEVEL", ["12TH", "DIPLOMA", "GRADUATE", "ANY_STREAM"], "12th with 50% plus B.Ed/Diploma in Education; varies by post");
    const tgt = note("DL_DSSSB_TGT", "STATE_LEVEL", ["GRADUATE", "SPECIFIC_DEGREE"], "Bachelor's degree (45% marks) in relevant subject plus B.Ed degree and CTET Paper II qualification required");
    for (const e of [ctet, reet, hpTet, tgt]) {
      expect(needsTeacherTraining(e), e.code).toBe(true);
      expect(levelOf(e), e.code).toBeNull();
    }
    // Not a teaching exam: a PSC that mentions B.Ed. for some posts stays.
    const ddpsc = note("DN_DDPSC", "STATE_LEVEL", ["GRADUATE", "ANY_STREAM"], "Varies by post; teaching posts require graduation with B.Ed., clerical posts require graduation");
    expect(needsTeacherTraining(ddpsc)).toBe(false);
    expect(levelOf(ddpsc)?.slug).toBe("graduation");

    const l12 = findQualificationLevel("12th")!;
    const rows = [...ROWS.filter((e) => e.code !== "HP_TET"), ctet, reet, hpTet];
    const g = examsAfter(l12, rows);
    for (const code of ["CTET", "RJ_REET", "HP_TET"]) expect([...g.government, ...g.entrance].map((e) => e.code)).not.toContain(code);
    expect(g.teacherTraining!.map((e) => e.code)).toEqual(["CTET", "RJ_REET", "HP_TET"]);
    expect(qualificationLead(l12, g)).toContain(" 3 teacher eligibility tests that also need a teacher-training qualification (D.El.Ed. or B.Ed.) are not listed here.");
    expect(qualificationFaq(l12, g).a).not.toMatch(/CTET|REET|HP TET/);
    expect(examsAfter(findQualificationLevel("graduation")!, [...ROWS, tgt]).teacherTraining!.map((e) => e.code)).toEqual(["DL_DSSSB_TGT"]);
    expect(qualificationLead(l12, { government: [], entrance: [] })).not.toContain("teacher-training");
  });

  it("the level page links the teaching hub only while it is live and only when it left exams out", () => {
    const src = read("src/app/exams/after/[level]/page.tsx");
    expect(src).toContain('{teachingLive && (groups.teacherTraining?.length ?? 0) > 0 && (');
    expect(src).toContain('href="/exams/category/teaching"');
  });
});

describe("pages, the hold and the floor", () => {
  it("postgraduation is held: no page, no link, no sitemap row", () => {
    const pg = findQualificationLevel("postgraduation")!;
    expect(pg.held).toBeTruthy();
    expect(PUBLISHED_LEVELS.map((l) => l.slug)).toEqual(["10th", "12th", "diploma-iti", "graduation"]);
    expect(isLevelIndexable(pg, examsAfter(pg, ROWS))).toBe(false);
    expect(levelCounts(ROWS).map((c) => c.level.slug)).not.toContain("postgraduation");
    expect(read("src/app/exams/after/[level]/page.tsx")).toContain("if (!level || level.held) return null;");
  });

  it("indexable only with at least QUALIFICATION_MIN exams", () => {
    expect(QUALIFICATION_MIN).toBe(5);
    const counts = Object.fromEntries(levelCounts(ROWS).map((c) => [c.level.slug, [c.total, c.indexable]]));
    expect(counts).toEqual({ "10th": [6, true], "12th": [7, true], "diploma-iti": [1, false], graduation: [3, false] });
    expect(qualificationSitemapEntriesFrom("https://shishya.in", ROWS).map((e) => e.url)).toEqual([
      "https://shishya.in/exams/after/10th",
      "https://shishya.in/exams/after/12th",
    ]);
    for (const e of qualificationSitemapEntriesFrom("https://shishya.in", ROWS)) expect(e.lastModified).toBeUndefined();
  });

  it("title, lead and FAQ are computed and true for the rows", () => {
    const l12 = findQualificationLevel("12th")!;
    const g = examsAfter(l12, ROWS);
    expect(qualificationTitle(l12, g)).toBe("Exams After 12th in India: 7 Government and Entrance Exams Compared");
    expect(qualificationLead(l12, g)).toMatch(/^7 exams on Shishya list Class 12 as the lowest qualification: 3 government recruitment or eligibility tests and 4 entrance or admission tests\. /);
    expect(qualificationLead(l12, g)).toContain("Olympiads, which are for students still in school, are not listed.");
    expect(qualificationFaq(l12, g).q).toBe("Which exams can I take after 12th?");
    expect(qualificationFaq(l12, g).a).toContain("government: SSC CHSL, NDA, HP TET; entrance: JEE MAIN, NEET UG, CUET UG, CMI ADMISSION");
    const lDip = findQualificationLevel("diploma-iti")!;
    expect(qualificationTitle(lDip, examsAfter(lDip, ROWS))).toBe("Exams After Diploma or ITI in India: 1 Government Exam Compared");
    const empty = { government: [], entrance: [] };
    expect(qualificationFaq(l12, empty).a).toBe("No exam on Shishya lists Class 12 as its lowest qualification yet.");
  });

  it("every level slug is lower-case and unique", () => {
    const slugs = QUALIFICATION_LEVELS.map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/);
  });
});

describe("where the pages are linked", () => {
  it("/find-your-exam links the indexable levels, counted by the same rule", () => {
    const src = read("src/app/find-your-exam/page.tsx");
    expect(src).toContain(
      "levelOf({ code: r.code, category: r.category, state: r.state, eligibility: { educationTags: r.educationTags ?? [], educationNote: r.educationNote } })?.slug === level.slug",
    );
    expect(src).toContain(".filter((x) => x.count >= QUALIFICATION_MIN)");
  });
  it("the state page groups its own exams with the same helper, on the same URL", () => {
    const src = read("src/app/exams/state/[slug]/page.tsx");
    expect(src).toContain("mine.filter((e) => levelOf(e)?.slug === level.slug)");
    expect(src).not.toMatch(/\/exams\/state\/\$\{[^}]+\}\/after/);
  });
  it("no vacancy figure on the level page", () => {
    const src = read("src/app/exams/after/[level]/page.tsx").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    expect(src).not.toMatch(/vacanc/i);
  });
});
