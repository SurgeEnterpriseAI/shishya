// State exam pages (26 Sep 2026): government recruitment vs admission tests,
// the state's own-script name, the "Also for {State} students" links and the
// context file header. Pure — data arrays only, no DB.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  hasNonLatinScript,
  splitStateExams,
  stateAlsoLinks,
  stateEntranceCount,
  stateJsonLd,
  stateNameWithNative,
} from "@/lib/state-exam-sections";
import { STATE_COPY, fillState } from "@/lib/state-exams-copy";
import { stateContextMarkdown, type StateExam } from "@/lib/state-exams";
import { STATES, stateSlug } from "@/lib/state-info";
import { COLLEGES } from "@/lib/colleges-data";
import { BOARDS } from "@/lib/schooling-data";
import { SCHOLARSHIPS } from "@/data/scholarships";

const exam = (code: string, shortName: string, name: string, type: StateExam["type"]): StateExam => ({
  code,
  shortName,
  name,
  type,
  updatedAt: "",
  officialUrl: null,
  officialName: null,
});

const KARNATAKA = [
  exam("KA_KPSC_KAS", "KPSC KAS", "Karnataka Administrative Service", "PSC"),
  exam("KA_KCET", "KCET", "Karnataka Common Entrance Test (KCET)", "Entrance"),
  exam("KA_POLICE_PC", "KSP Constable", "Karnataka State Police Constable", "Police"),
  exam("KA_COMEDK", "COMEDK UGET", "COMEDK UGET Karnataka", "Entrance"),
];

describe("splitStateExams / stateEntranceCount", () => {
  it("state CETs go to the admission group, the rest stay recruitment, order kept", () => {
    const { recruitment, admission } = splitStateExams(KARNATAKA);
    expect(recruitment.map((e) => e.code)).toEqual(["KA_KPSC_KAS", "KA_POLICE_PC"]);
    expect(admission.map((e) => e.code)).toEqual(["KA_KCET", "KA_COMEDK"]);
    expect(stateEntranceCount(KARNATAKA)).toBe(2);
  });

  it("HR_HSSC_CET is recruitment (Haryana staff selection), not an admission test", () => {
    const { recruitment, admission } = splitStateExams([exam("HR_HSSC_CET", "HSSC CET", "Haryana Staff Selection Common Eligibility Test", "Staff selection")]);
    expect(admission).toEqual([]);
    expect(recruitment.map((e) => e.code)).toEqual(["HR_HSSC_CET"]);
  });
});

describe("the state's own-script name", () => {
  it("joins the English name when it is in another script", () => {
    expect(stateNameWithNative(STATES.KA)).toBe("Karnataka (ಕರ್ನಾಟಕ)");
    expect(stateNameWithNative(STATES.TN)).toMatch(/^Tamil Nadu \(.+\)$/);
    expect(stateNameWithNative(STATES.MZ ?? { name: "Mizoram", nativeName: "Mizoram" })).toBe("Mizoram");
    expect(hasNonLatinScript("Dadra & Nagar Haveli")).toBe(false);
    expect(hasNonLatinScript("ಕರ್ನಾಟಕ")).toBe(true);
  });

  it("the JSON-LD State node carries the native and Hindi names as alternates, never the English name twice", () => {
    expect(stateJsonLd(STATES.KA)).toEqual({ "@type": "State", name: "Karnataka", alternateName: [STATES.KA.nativeName, STATES.KA.hindiName] });
    // Bihar: native name = Hindi name → one alternate.
    expect(stateJsonLd(STATES.BR).alternateName).toEqual([STATES.BR.hindiName]);
    for (const st of Object.values(STATES)) expect(stateJsonLd(st).alternateName).not.toContain(st.name);
  });
});

describe("Also for {State} students — every link resolves", () => {
  const labels = { colleges: STATE_COPY.en.alsoColleges, board: STATE_COPY.en.alsoBoard, scholarshipMatch: STATE_COPY.en.alsoScholarshipMatch };
  const collegeStates = new Set(COLLEGES.map((c) => stateSlug(c.state)));
  const boardSlugs = new Set(BOARDS.map((b) => b.slug));
  const scholarshipIds = new Set(SCHOLARSHIPS.map((s) => s.id));

  it("for every state, each href is an existing college state, board slug, scholarship id or the finder", () => {
    for (const code of Object.keys(STATES)) {
      for (const l of stateAlsoLinks(code, STATES[code].name, labels)) {
        const m = /^\/(colleges\/state|schooling|scholarships)\/([a-z0-9-]+)$/.exec(l.href);
        expect(m, `${code}: ${l.href}`).not.toBeNull();
        const [, family, slug] = m!;
        if (family === "colleges/state") expect(collegeStates.has(slug), `${code}: ${l.href}`).toBe(true);
        else if (family === "schooling") expect(boardSlugs.has(slug), `${code}: ${l.href}`).toBe(true);
        else expect(slug === "match" || scholarshipIds.has(slug), `${code}: ${l.href}`).toBe(true);
        expect(l.label.length).toBeGreaterThan(0);
      }
    }
  });

  it("Karnataka: its colleges, both boards, at most four scholarships and the finder; a board is never said to have notes", () => {
    const links = stateAlsoLinks("KA", "Karnataka", labels);
    const hrefs = links.map((l) => l.href);
    expect(hrefs[0]).toBe("/colleges/state/karnataka");
    expect(links[0].label).toMatch(/^Colleges in Karnataka — NIRF \d{4} rankings$/);
    expect(hrefs).toContain("/schooling/ka-puc");
    expect(hrefs).toContain("/schooling/ka-sslc");
    expect(hrefs.filter((h) => /^\/scholarships\/(?!match$)/.test(h)).length).toBeLessThanOrEqual(4);
    expect(hrefs[hrefs.length - 1]).toBe("/scholarships/match");
    for (const l of links.filter((x) => x.href.startsWith("/schooling/"))) {
      expect(l.label).toMatch(/ — official board links$/);
      expect(l.label).not.toMatch(/notes|practice/i);
    }
    const scholarshipLinks = links.filter((x) => /^\/scholarships\/(?!match$)/.test(x.href));
    for (const l of scholarshipLinks) {
      const s = SCHOLARSHIPS.find((x) => `/scholarships/${x.id}` === l.href)!;
      expect(s.state).toBe("KA");
    }
  });

  it("a state with no listed college gets no colleges link", () => {
    const none = Object.keys(STATES).find((c) => !COLLEGES.some((x) => x.state === c));
    if (none) expect(stateAlsoLinks(none, STATES[none].name, labels).some((l) => l.href.startsWith("/colleges/"))).toBe(false);
  });
});

describe("state copy — government and entrance", () => {
  it("the entrance heading, groups and index lines in English", () => {
    const C = STATE_COPY.en;
    expect(fillState(C.h1Entrance, { state: "Karnataka", year: 2026 })).toBe("Karnataka Government and Entrance Exams 2026");
    expect(fillState(C.h1, { state: "Bihar", year: 2026 })).toBe("Bihar Government Exams 2026");
    expect(C.recruitmentHeading).toBe("Government recruitment exams");
    expect(C.admissionHeading).toBe("Admission tests (state CETs)");
    expect(C.indexH1).toBe("Government and entrance exams by state");
    expect(fillState(C.indexIntro, { govCount: 103, entCount: 25, stateCount: 36 }).startsWith(
      "103 state government exams and 25 state entrance tests across 36 states and union territories.",
    )).toBe(true);
    expect(fillState(C.alsoHeading, { state: "Karnataka" })).toBe("Also for Karnataka students");
  });

  it("Hindi and Telugu say both kinds too", () => {
    expect(STATE_COPY.hi.h1Entrance).toContain("प्रवेश");
    expect(STATE_COPY.te.h1Entrance).toContain("ప్రవేశ");
    expect(STATE_COPY.hi.indexH1).toContain("प्रवेश");
    expect(STATE_COPY.te.indexH1).toContain("ప్రవేశ");
    for (const lc of ["hi", "te"] as const) {
      expect(STATE_COPY[lc].indexIntro).toContain("{govCount}");
      expect(STATE_COPY[lc].indexIntro).toContain("{entCount}");
      expect(STATE_COPY[lc].alsoBoard).toContain("{board}");
    }
  });
});

describe("state context.md header", () => {
  const base = { code: "KA", slug: "karnataka", name: "Karnataka", nativeName: "ಕರ್ನಾಟಕ", hindiName: "कर्नाटक" };
  it("'government and entrance exams' when the state has an admission test", () => {
    const md = stateContextMarkdown({ ...base, exams: KARNATAKA }, [], 120, "2026-09-26");
    expect(md.startsWith("# Karnataka government and entrance exams — Shishya context file")).toBe(true);
  });
  it("unchanged without one", () => {
    const md = stateContextMarkdown({ ...base, exams: KARNATAKA.filter((e) => e.type !== "Entrance") }, [], 120, "2026-09-26");
    expect(md.startsWith("# Karnataka government exams — Shishya context file")).toBe(true);
  });
});

describe("the state pages use the split", () => {
  const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");
  it("[slug] titles by kind, lists both groups, and emits the State node", () => {
    const src = read("src/app/exams/state/[slug]/page.tsx");
    expect(src).toContain("splitStateExams(exams)");
    expect(src).toContain("C.h1Entrance");
    expect(src).toContain("C.admissionHeading");
    expect(src).toContain("about: stateJsonLd(st)");
    expect(src).toContain("stateNameWithNative(st)");
    expect(src).toContain("stateAlsoLinks(code, stateName");
  });
  it("the index counts both kinds", () => {
    const src = read("src/app/exams/state/page.tsx");
    expect(src).toContain("state government exams and ${ent} state entrance tests across ${dir.length} states and UTs");
    expect(src).toContain("C.indexH1");
  });
});
