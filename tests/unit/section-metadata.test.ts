// Section pages — metadata, links and honesty (26 Sep 2026, every-education-
// search wave, group D: school, colleges, scholarships, careers and their
// satellite pages).
//
// Pins:
//   • the pure helpers (src/lib/section-seo.ts, src/lib/section-related.ts):
//     description clipping, title fitting, live-only exam links, related
//     scholarships, career → exams / college streams, salary band parsing,
//     school "Next steps";
//   • static source checks on the pages: no typed "40+", "~50", "170+" or
//     "160+"; no "Graduation" in the /colleges title and no searchParams on
//     that page (static, so its metadata renders in <head>); every card on
//     /scholarships links /scholarships/{id}; the school class and subject
//     pages declare their context.md as text/markdown; the career map links
//     no exam that has no page; every listed page has its own openGraph url;
//     no page in the group builds a raw /exams/{code} link.
//
// No DB, no network. Run: npx vitest run tests/unit/section-metadata.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SCHOLARSHIPS } from "@/data/scholarships";
import { CAREERS, findCareer } from "@/data/careers";
import { COLLEGES, NIRF_SOURCE_YEAR } from "@/lib/colleges-data";
import { DESCRIPTION_MAX, TITLE_MAX, clipDescription, examCodeLabel, examHubHref, fitTitle } from "@/lib/section-seo";
import {
  CAREER_EXTRA_EXAMS,
  careerCollegeStreams,
  careerExamCodes,
  relatedScholarships,
  salaryBandRange,
  schoolNextSteps,
} from "@/lib/section-related";

const ROOT = path.resolve(__dirname, "../..");
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");
/** Comments quote removed copy on purpose; check only what renders. */
const code = (f: string) =>
  read(f)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const CLASS_PAGE = "src/app/schooling/[slug]/[classSlug]/page.tsx";
const SUBJECT_PAGE = "src/app/schooling/[slug]/[classSlug]/[subject]/page.tsx";

describe("clipDescription", () => {
  it("returns short text whole, whitespace-normalised", () => {
    expect(clipDescription("  A  short\n line. ")).toBe("A short line.");
  });

  it("cuts at the last sentence end within the limit", () => {
    const s = `${"First sentence has some words in it. ".repeat(3)}Then a long tail that runs well past the limit of one hundred and sixty characters for sure.`;
    const out = clipDescription(s);
    expect(out.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(out.endsWith("in it.")).toBe(true);
  });

  it("otherwise cuts at a word boundary with an ellipsis — never inside a word or '#1'", () => {
    const s = `IIT Madras, Chennai (Tamil Nadu). NIRF Overall #1, Engineering #1, Management #4 (2024) and a very long blurb without full stops that keeps going and going past the limit`;
    for (const max of [40, 60, 90, 120, 160]) {
      const out = clipDescription(s, max);
      expect(out.length, `max ${max}`).toBeLessThanOrEqual(max);
      expect(out, `max ${max}`).not.toMatch(/#$/);
      const body = out.replace(/…$/, "");
      // the cut lands on a whole token of the source
      expect(s.startsWith(body)).toBe(true);
      // …and the next source character is a space or punctuation (or the end)
      expect(s[body.length] === undefined || /[\s.,;:)]/.test(s[body.length]), `max ${max}: ${out}`).toBe(true);
    }
  });

  it("never treats a decimal or an abbreviation mid-token as a sentence end", () => {
    const s = "Band ₹3.5 - ₹6 LPA for freshers in metro cities with some variation by employer and role plus a long enough tail to force a cut here and there";
    const out = clipDescription(s, 60);
    expect(out).not.toBe("Band ₹3.");
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("fitTitle", () => {
  it("uses the first tail that fits with the brand", () => {
    expect(fitTitle("CBSE Class 10", ["a very long tail that will never fit inside seventy characters at all", "NCERT chapters and a free AI tutor"])).toBe(
      "CBSE Class 10 — NCERT chapters and a free AI tutor | Shishya",
    );
  });
  it("drops the brand before the tail, then the tail; never shortens the core", () => {
    const core = "CBSE Class 6 Maths Chapter 1: Patterns in Mathematics";
    expect(fitTitle(core, ["notes and practice"])).toBe(`${core} | Shishya`);
    expect(fitTitle(core, ["notes and practice"], { keepTail: true })).toBe(`${core} — notes and practice`);
    const longCore = "X".repeat(TITLE_MAX + 5);
    expect(fitTitle(longCore, ["tail"])).toBe(longCore);
  });
});

describe("exam links go only to live exams", () => {
  const live = new Map([["JEE_MAIN", "JEE Main"], ["NATA", "NATA"]]);
  it("examHubHref", () => {
    expect(examHubHref("JEE_MAIN", live)).toBe("/exams/JEE_MAIN");
    expect(examHubHref("CLAT", live)).toBeNull();
    expect(examHubHref("BITSAT", new Set(["JEE_MAIN"]))).toBeNull();
    expect(examCodeLabel("GATE_CSE")).toBe("GATE CSE");
  });

  it("no page in the group builds a raw /exams/{code} link", () => {
    const files = [
      "src/app/scholarships/[id]/page.tsx",
      "src/app/careers/[slug]/page.tsx",
      "src/app/career-map/page.tsx",
      "src/app/colleges/[slug]/page.tsx",
      "src/app/colleges/[slug]/[branch]/page.tsx",
      CLASS_PAGE,
      SUBJECT_PAGE,
    ];
    for (const f of files) {
      const src = code(f);
      expect(src, f).not.toMatch(/href=\{`\/exams\/\$\{/);
      expect(src, f).not.toMatch(/href: "\/exams\/[A-Z]/);
      expect(src, f).not.toMatch(/href="\/exams\/[A-Z]/);
    }
  });

  it("the career map links no exam without a page and never the bare /exams (a 308 to home)", () => {
    const src = code("src/app/career-map/page.tsx");
    expect(src).not.toMatch(/\/exams\/CLAT|\/exams\/BITSAT/);
    expect(src).not.toMatch(/href: "\/exams"/);
    expect(src).toMatch(/exam: "CLAT"/);
    expect(src).toMatch(/href: "\/exams\/browse"/);
  });
});

describe("no typed counts", () => {
  it.each([
    ["src/app/careers/page.tsx", /40\+/],
    ["src/app/worldwide/page.tsx", /~50|5 countries|~95%/],
    ["src/app/career-map/page.tsx", /170\+|Top 77|42 careers/],
    ["src/data/insights-articles.ts", /160\+ exams/],
    ["src/app/distance-learning/page.tsx", /4M\+|~4-5M|undercovered/i],
    ["src/app/colleges/iti-diploma/page.tsx", /6\.5M/],
    ["src/app/colleges/page.tsx", /6\.5M|every Indian\s+student/],
    ["src/app/scholarships/page.tsx", /every Indian student can apply|Free forever/i],
    ["src/app/coach/page.tsx", /\b177\b/],
    ["src/app/worldwide/loans/page.tsx", /comparison of 8 /],
    ["src/app/worldwide/compare/page.tsx", /Compare 10 /],
  ])("%s", (f, re) => {
    expect(code(f)).not.toMatch(re);
  });

  it("the counts that stay are computed", () => {
    expect(code("src/app/careers/page.tsx")).toMatch(/\$\{CAREERS\.length\} career guides/);
    // 26 Sep 2026 (repair): the schemes, not the raw catalogue (it holds one aggregator).
    expect(code("src/app/scholarships/page.tsx")).toMatch(/\$\{SCHOLARSHIP_SCHEMES\.length\} central, state and private/);
    expect(code("src/app/worldwide/page.tsx")).toMatch(/\$\{WORLDWIDE_COUNTRIES\.length\} countries, \$\{UNIVERSITY_COUNT\} universities/);
  });
});

describe("/colleges", () => {
  const src = code("src/app/colleges/page.tsx");
  it("title names NIRF's year, not 'Graduation'", () => {
    expect(src).toMatch(/const TITLE = `Colleges in India — NIRF \$\{NIRF_SOURCE_YEAR\} ranked colleges by stream and state`;/);
    expect(src).not.toMatch(/Graduation/);
    expect(NIRF_SOURCE_YEAR).toBeGreaterThan(2000);
  });
  it("is static: no searchParams; the URL filters run in a Suspense'd client island over a server-rendered full list", () => {
    expect(src).not.toMatch(/searchParams/);
    expect(src).toMatch(/<Suspense fallback=\{<CollegeFinder \/>\}>\s*<CollegeFinderFromQuery \/>\s*<\/Suspense>/);
    const island = read("src/app/colleges/CollegeFinderFromQuery.tsx");
    expect(island).toMatch(/^"use client";/);
    expect(island).toMatch(/useSearchParams\(\)/);
    expect(read("src/app/colleges/CollegeFinder.tsx")).not.toMatch(/"use client"|useState|useEffect|from "@\/lib\/db/);
  });
  it("every college is CollegeOrUniversity; CLAT is not linked; AILET only for NLU Delhi", () => {
    const college = code("src/app/colleges/[slug]/page.tsx");
    expect(college).toMatch(/"@type": "CollegeOrUniversity"/);
    expect(college).not.toMatch(/c\.streams\.includes\("university"\) \? "CollegeOrUniversity"/);
    expect(college).toMatch(/if \(c\.slug === "nlu-delhi"\) relevantExams\.push\(\{ shortName: "AILET"/);
    expect(COLLEGES.some((c) => c.slug === "nlu-delhi")).toBe(true);
    expect(college).not.toMatch(/\.slice\(0, 300\)/);
    expect(college).not.toMatch(/verified info/);
  });
});

describe("/scholarships", () => {
  it("every card title links its own page by s.id (the [id] route's param)", () => {
    const browser = code("src/app/scholarships/ScholarshipBrowser.tsx");
    expect(browser).toMatch(/<Link href=\{`\/scholarships\/\$\{s\.id\}`\}/);
    expect(code("src/app/scholarships/[id]/page.tsx")).toMatch(/SCHOLARSHIP_SCHEMES\.map\(\(s\) => \(\{ id: s\.id \}\)\)/);
    expect(new Set(SCHOLARSHIPS.map((s) => s.id)).size).toBe(SCHOLARSHIPS.length);
  });
  it("detail page: MonetaryGrant with the awarding body as funder and the amount as text only", () => {
    const src = code("src/app/scholarships/[id]/page.tsx");
    expect(src).toMatch(/"@type": "MonetaryGrant"/);
    expect(src).toMatch(/funder: \{\s*"@type": "Organization",\s*name: s\.awardingBody/);
    expect(src).toMatch(/amount: \{ "@type": "MonetaryAmount", description: s\.amount \}/);
    expect(src).not.toMatch(/\.slice\(0, (200|280)\)/);
    for (const href of ["/scholarships/match", "/colleges", "/schooling/streams"]) expect(src).toContain(`href="${href}"`);
  });
  it("relatedScholarships: ≤ 6, never itself, same state first, then a shared level", () => {
    for (const s of SCHOLARSHIPS) {
      const r = relatedScholarships(s, SCHOLARSHIPS);
      expect(r.length).toBeLessThanOrEqual(6);
      expect(r.some((x) => x.id === s.id)).toBe(false);
    }
    const stateOne = SCHOLARSHIPS.find((s) => s.state && SCHOLARSHIPS.filter((x) => x.state === s.state).length >= 3)!;
    const r = relatedScholarships(stateOne, SCHOLARSHIPS);
    expect(r[0].state).toBe(stateOne.state);
    // A scholarship with nothing in common is never related.
    const lone = { ...stateOne, id: "lone", state: "ZZ", levels: [], type: "RESEARCH", eligibility: {} } as unknown as (typeof SCHOLARSHIPS)[number];
    expect(relatedScholarships(lone, SCHOLARSHIPS.filter((s) => s.type !== "RESEARCH"))).toEqual([]);
  });
});

describe("/careers", () => {
  it("career exams add the degree route's entrance exam where the data named none", () => {
    expect(careerExamCodes(findCareer("architect")!)).toContain("NATA");
    for (const slug of Object.keys(CAREER_EXTRA_EXAMS)) expect(findCareer(slug), slug).toBeTruthy();
    const se = findCareer("software-engineer")!;
    expect(careerExamCodes(se)).toEqual([...new Set(se.examCodes ?? [])]);
  });
  it("college streams exist and match the career", () => {
    expect(careerCollegeStreams(findCareer("architect")!).map((s) => s.value)).toEqual(["architecture"]);
    expect(careerCollegeStreams(findCareer("software-engineer")!).map((s) => s.value)).toEqual(["engineering"]);
    expect(careerCollegeStreams(findCareer("doctor-mbbs")!).map((s) => s.value)).toEqual(["medical"]);
    expect(careerCollegeStreams(findCareer("journalist")!)).toEqual([]);
    for (const c of CAREERS) for (const s of careerCollegeStreams(c)) expect(COLLEGES.some((x) => x.streams.includes(s.value))).toBe(true);
  });
  it("salary bands: only a plain '₹a - ₹b LPA / Cr' band gives numbers — the band's own", () => {
    expect(salaryBandRange("₹3.5 - ₹6 LPA")).toEqual([350_000, 600_000]);
    expect(salaryBandRange("₹1 Cr - ₹5 Cr")).toEqual([10_000_000, 50_000_000]);
    expect(salaryBandRange("₹15 LPA - ₹1 Cr")).toEqual([1_500_000, 10_000_000]);
    for (const b of ["₹10 - ₹30 LPA+", "₹2.5 - ₹3 LPA / month + housing", "$200-500/month USD", "See IAS career", "Variable — ₹5-30 LPA + share of profit", "₹1 - ₹3 Cr+"]) {
      expect(salaryBandRange(b), b).toBeNull();
    }
  });
  it("detail page: Occupation JSON-LD with indicative MonetaryAmountDistribution bands and the cited sources", () => {
    const src = code("src/app/careers/[slug]/page.tsx");
    expect(src).toMatch(/"@type": "Occupation"/);
    expect(src).toMatch(/occupationLocation: \{ "@type": "Country", name: "India" \}/);
    expect(src).toMatch(/"@type": "MonetaryAmountDistribution"/);
    expect(src).toMatch(/name: `\$\{b\.experience\} \(indicative\)`/);
    expect(src).toMatch(/Sources: \$\{CAREER_SALARY_SOURCES\}/);
    expect(src).not.toMatch(/\.slice\(0, 280\)/);
  });
});

describe("school pages", () => {
  it("class and subject pages declare their context.md as text/markdown", () => {
    for (const f of [CLASS_PAGE, SUBJECT_PAGE]) {
      expect(code(f), f).toMatch(/types: \{ "text\/markdown": `\$\{SCHOOL_SITE\}\$\{path\}\/context\.md` \}/);
    }
  });
  it("CollectionPage JSON-LD with the class level and the board; the subject list holds only indexable chapters", () => {
    for (const f of [CLASS_PAGE, SUBJECT_PAGE]) {
      const src = code(f);
      expect(src, f).toMatch(/"@type": "CollectionPage"/);
      expect(src, f).toMatch(/educationalLevel: `Class \$\{cls\}`/);
      expect(src, f).toMatch(/about: \{ "@type": "Organization", name: board\.name/);
    }
    expect(code(SUBJECT_PAGE)).toMatch(/const indexableChapters = chapters\.filter\(\(ch\) => ch\.indexable\);/);
  });
  it("subject H1 is board + class + subject; board H1 names the class range", () => {
    expect(code(SUBJECT_PAGE)).toMatch(/\{board\.shortName\} Class \{cls\} \{subject\.name\}/);
    expect(code("src/app/schooling/[slug]/page.tsx")).toMatch(/\{b\.shortName\} — Class \{live\.length > 0 \? live\[0\]\.cls : b\.classes\[0\]\} to/);
  });
  it("the tutor is named only on Class 8-12 NCERT pages with chapters (it is opened from a chapter)", () => {
    for (const f of [CLASS_PAGE, SUBJECT_PAGE]) {
      expect(code(f), f).toMatch(/const tutor = isStudentModeClass\(cls\) && isNcert && (totals|counts)\.chapters > 0;/);
    }
  });
  it("Next steps: olympiads and the stream guide on 9-10; entrance exams, colleges, scholarships, careers on 11-12", () => {
    const hrefs = (cls: number, subject?: string) => schoolNextSteps(cls, subject).map((s) => s.exam ?? s.href);
    expect(hrefs(6)).toEqual([]);
    expect(hrefs(8)).toEqual([]);
    for (const cls of [9, 10]) {
      expect(hrefs(cls)).toEqual(["IOQM", "NSEJS", "SOF_NSO", "SOF_IMO", "/schooling/streams", "/for/class-10-student", "/career-map", "/scholarships"]);
    }
    for (const cls of [11, 12]) {
      expect(hrefs(cls)).toEqual(["JEE_MAIN", "NEET_UG", "CUET_UG", "/exams/entrance", "/colleges", "/scholarships", "/careers"]);
      expect(hrefs(cls, "Biology")).toContain("NEET_UG");
      expect(hrefs(cls, "Biology")).not.toContain("JEE_MAIN");
      expect(hrefs(cls, "Mathematics")).not.toContain("NEET_UG");
      expect(hrefs(cls, "English")).toEqual([]);
    }
    expect(hrefs(10, "Mathematics")).toEqual([]);
  });
});

describe("own openGraph on every section page", () => {
  it.each([
    "src/app/scholarships/page.tsx",
    "src/app/career-map/page.tsx",
    "src/app/colleges/page.tsx",
    "src/app/colleges/cutoffs/page.tsx",
    "src/app/colleges/placements/page.tsx",
    "src/app/colleges/iti-diploma/page.tsx",
    "src/app/distance-learning/page.tsx",
    "src/app/worldwide/loans/page.tsx",
    "src/app/worldwide/compare/page.tsx",
    "src/app/jobs/govt-jobs/page.tsx",
    "src/app/jobs/internships/page.tsx",
    "src/app/jobs/resume/page.tsx",
    "src/app/jobs/skill-careers/page.tsx",
  ])("%s", (f) => {
    expect(code(f)).toMatch(/openGraph: \{ title: TITLE, description: DESCRIPTION, url: PAGE_URL|openGraph: \{\s*title: TITLE,\s*description: DESCRIPTION,\s*url: PAGE_URL|openGraph: \{ title: TITLE, description: DESCRIPTION, url: "https:\/\/shishya\.in\//);
  });
  it.each([
    "src/app/colleges/[slug]/[branch]/page.tsx",
    "src/app/worldwide/[country]/[university]/page.tsx",
    "src/app/worldwide/test-prep/[slug]/page.tsx",
  ])("%s", (f) => {
    expect(code(f)).toMatch(/openGraph: \{ title, description, url, siteName: "Shishya"/);
  });
});
