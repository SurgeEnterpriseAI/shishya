// Section context files and the whole-platform machine files (26 Sep 2026,
// B-machine-crawl).
//
// Shishya became one smart place to study — school, entrance and government
// exams, colleges, scholarships, careers — while every machine file an AI
// crawler reads first still said "India's end-to-end free government exam
// preparation platform … 170+ exams … 29,000+ questions". This pins:
//   1. the pure builders in src/lib/section-context.ts (no DB): every count
//      equals the .length of the data it was given, no typed count, no "#1";
//   2. the route handlers' headers: markdown + an HTTP canonical link back to
//      the HTML page, and no noindex (AI search must fetch the file);
//   3. public/llms.txt: the canonical summary, the new sections, no stale
//      typed count, /ask (not the robots-disallowed /chat) as the tutor link,
//      the honest mentor wording, the School section untouched;
//   4. the llms-full.txt and exam context.md route sources.
// Prisma and next/cache are mocked; nothing here reads the DB.

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

import { ALL_STREAMS, COLLEGES, NIRF_SOURCE_URL, NIRF_SOURCE_YEAR } from "@/lib/colleges-data";
import { STATE_CET_CODES } from "@/lib/exam-kind";
// 26 Sep 2026 (repair): every scholarship surface lists the schemes, never the
// catalogue's one outside aggregator (src/lib/scholarship-schemes.ts).
import { SCHOLARSHIP_SCHEMES as SCHOLARSHIPS } from "@/lib/scholarship-schemes";
import { CAREERS, CAREER_CATEGORIES } from "@/data/careers";
import { TEST_PREP, WORLDWIDE_COUNTRIES } from "@/lib/worldwide-data";
import { PERSONAS } from "@/data/personas";
import { INSIGHTS_ARTICLES } from "@/data/insights-articles";
import { locales } from "@/lib/i18n";
import { INDIAN_LANGUAGE_COUNT } from "@/lib/languages";
import { SCHOOL_CHILDREN_LINE, schoolSurfaceCounts, type SchoolSurface, type SchoolSurfaceChapter } from "@/lib/school/surface";
import {
  PLATFORM_ONE_LINE,
  SECTION_CONTEXT_FILES,
  careersContextMarkdown,
  careersLlmsFullLines,
  collegesContextMarkdown,
  collegesLlmsFullLines,
  contextMarkdownHeaders,
  examGroupLabel,
  examSection,
  STATE_CET_GROUP_LABEL,
  flooredCount,
  groupColleges,
  guidesLlmsFullLines,
  languagesLine,
  ncertChapterCount,
  platformContextMarkdown,
  platformDescription,
  platformDescriptionComputed,
  platformDescriptionStatic,
  scholarshipsContextMarkdown,
  scholarshipsLlmsFullLines,
  schoolSectionContextMarkdown,
  studyAbroadLlmsFullLines,
  type PlatformCounts,
} from "@/lib/section-context";

const ROOT = path.resolve(__dirname, "../..");
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const SITE = "https://shishya.in";
const AS_OF = "2026-09-26";
const SRC = { year: NIRF_SOURCE_YEAR, url: NIRF_SOURCE_URL };

/** The positioning and typed counts that must never come back. */
const STALE = [/170\+/, /government exam preparation platform/i, /end-to-end/i, /29,000/, /3,700/, /\b100\+/, /all 28 states/i, /admin-validated/i];
/** Self-claims the founder forbids on machine files. */
const CLAIMS = [/#1\b/, /\bbest\b/i, /\btrusted\b/i, /verified by students/i, /expert-curated/i];
const expectClean = (text: string) => {
  for (const re of [...STALE, ...CLAIMS]) expect(text, String(re)).not.toMatch(re);
};

const AT = "2026-09-26T03:17:57.452Z";
function ch(code: string, name: string, slug: string, hasNotes: boolean, q: number): SchoolSurfaceChapter {
  return { code, name, orderIdx: 1, slug, bookCode: "fegp1", hasNotes, validatedQuestions: q, noteUpdatedAt: hasNotes ? AT : null, questionsUpdatedAt: q ? AT : null, indexable: hasNotes || q >= 5, lastModified: hasNotes || q ? AT : null };
}
const SURFACE: SchoolSurface = {
  readAt: AT,
  classes: [
    {
      examCode: "NCERT_C06",
      curriculum: "NCERT",
      boardSlug: "cbse",
      cls: 6,
      name: "NCERT Class 6",
      updatedAt: AT,
      lastModified: AT,
      subjects: [
        {
          code: "MATHEMATICS",
          name: "Mathematics",
          slug: "mathematics",
          orderIdx: 1,
          lastModified: AT,
          chapters: [ch("fegp1.ch01", "Patterns in Mathematics", "patterns-in-mathematics", true, 12), ch("fegp1.ch02", "Lines and Angles", "lines-and-angles", false, 0)],
        },
      ],
    },
    {
      examCode: "CISCE_C10",
      curriculum: "CISCE",
      boardSlug: "icse-cisce",
      cls: 10,
      name: "CISCE Class 10",
      updatedAt: AT,
      lastModified: null,
      subjects: [{ code: "ENGLISH", name: "English", slug: "english", orderIdx: 1, lastModified: null, chapters: [] }],
    },
  ],
};

const COUNTS: PlatformCounts = {
  exams: 180,
  checkedQuestions: 34_543,
  ncertChapters: 1_146,
  chaptersWithOurContent: 5,
  chaptersWithNotes: 5,
  chaptersWithPractice: 5,
  colleges: COLLEGES.length,
  nirfYear: NIRF_SOURCE_YEAR,
  scholarships: SCHOLARSHIPS.length,
  careers: CAREERS.length,
  indianLanguages: INDIAN_LANGUAGE_COUNT,
};

// ── 1. Pure builders ──────────────────────────────────────────────────

describe("the platform description", () => {
  it("computed form: every number from its input; Q floored to hundreds", () => {
    const t = platformDescriptionComputed(COUNTS);
    expect(t).toMatch(/^Shishya \(https:\/\/shishya\.in\) is one smart place to study for students in India: a free, AI-supported practice platform with independent sections for school/);
    expect(t).toContain("It covers 180 entrance and government exams with 34,500+ practice questions answer-checked by AI before they are shown");
    expect(t).toContain("1,146 NCERT chapters linked to the official books, 5 of them with Shishya's own notes and checked practice");
    expect(t).toContain(`${COLLEGES.length} colleges from NIRF ${NIRF_SOURCE_YEAR} rankings, ${SCHOLARSHIPS.length} scholarships and ${CAREERS.length} career guides`);
    expect(t).toContain(`an AI tutor in English and ${INDIAN_LANGUAGE_COUNT} Indian languages — every study feature is free, with no paywall.`);
    expect(t).not.toMatch(/CLAT|\ball\b/);
    expectClean(t);
  });
  it("'notes and checked practice' only when every such chapter has both", () => {
    expect(platformDescriptionComputed({ ...COUNTS, chaptersWithOurContent: 7, chaptersWithNotes: 7, chaptersWithPractice: 5 })).toContain("7 of them with Shishya's own notes or checked practice");
  });
  it("flooredCount", () => {
    expect(flooredCount(34_543)).toBe("34,500+");
    expect(flooredCount(100)).toBe("100+");
    expect(flooredCount(99)).toBe("99");
    expect(flooredCount(1_23_456)).toBe("1,23,400+");
  });
  it("static form: no number but the language constant; used when a count is missing", () => {
    const s = platformDescriptionStatic(INDIAN_LANGUAGE_COUNT);
    expect(s.replace(String(INDIAN_LANGUAGE_COUNT), "").replace("1-12", "")).not.toMatch(/\d/);
    expect(platformDescription(null, INDIAN_LANGUAGE_COUNT)).toBe(s);
    expect(s).toContain("school pages link the official books instead of copying them");
    expectClean(s);
  });
  it("the one-line clause", () => {
    expect(PLATFORM_ONE_LINE).toBe("Shishya (https://shishya.in) — one smart, free place to study for students in India: school, entrance and government exams, colleges, scholarships and careers.");
  });
});

describe("entrance vs government", () => {
  it("entrance categories plus the Entrance-door codes (NDA); the rest government or other", () => {
    expect(examSection({ code: "JEE_MAIN", category: "ENGINEERING" })).toBe("entrance");
    expect(examSection({ code: "IOQM", category: "OLYMPIAD" })).toBe("entrance");
    expect(examSection({ code: "NDA", category: "GOVT_JOBS" })).toBe("entrance");
    expect(examSection({ code: "SSC_CGL", category: "GOVT_JOBS" })).toBe("government");
    expect(examSection({ code: "KA_KSRP", category: "STATE_LEVEL" })).toBe("government");
    expect(examSection({ code: "CA_FOUNDATION", category: "OTHER" })).toBe("other");
    expect(examGroupLabel({ code: "NDA", category: "GOVT_JOBS" })).toBe("Other entrance exams (after Class 12)");
    expect(examGroupLabel({ code: "SSC_CGL", category: "GOVT_JOBS" })).toBe("Central government jobs");
    expect(examGroupLabel({ code: "X", category: "NEW_THING" })).toBe("New thing");
    // 26 Sep 2026 (repair): one rule with src/lib/exam-kind.ts — state CETs are
    // entrance (as on /exams/entrance and their hubs' JSON-LD); HR_HSSC_CET, a
    // recruitment eligibility test, stays government; an unknown category is Other.
    expect(examSection({ code: "KA_KCET", category: "STATE_LEVEL" })).toBe("entrance");
    expect(examSection({ code: "WB_WBJEE", category: "STATE_LEVEL" })).toBe("entrance");
    expect(examGroupLabel({ code: "KA_KCET", category: "STATE_LEVEL" })).toBe(STATE_CET_GROUP_LABEL);
    expect(examSection({ code: "HR_HSSC_CET", category: "STATE_LEVEL" })).toBe("government");
    expect(examSection({ code: "X", category: "NEW_THING" })).toBe("other");
    for (const code of STATE_CET_CODES) expect(examSection({ code, category: "STATE_LEVEL" }), code).toBe("entrance");
  });
});

describe("languagesLine", () => {
  it("computed from the locale list", () => {
    const l = languagesLine(locales);
    expect(l).toContain(`English and ${locales.length - 1} Indian languages (`);
    expect(l).toMatch(/Hindi/);
    expect(l).toMatch(/Telugu/);
    expect(l).toMatch(/Bengali/);
    expect(locales.length - 1).toBe(INDIAN_LANGUAGE_COUNT);
  });
});

describe("/colleges/context.md", () => {
  const md = collegesContextMarkdown(COLLEGES, ALL_STREAMS, SRC, AS_OF);
  const { byStream, byState } = groupColleges(COLLEGES, ALL_STREAMS);
  it("counts are the data's own lengths", () => {
    expect(md).toContain(`- ${COLLEGES.length} colleges · ${byStream.length} streams · ${byState.length} states and union territories`);
    for (const g of byStream) expect(md).toContain(`### ${g.stream.label} — ${SITE}/colleges/stream/${g.stream.value} (${g.colleges.length})`);
    expect(byState.reduce((n, g) => n + g.colleges.length, 0)).toBe(COLLEGES.length);
  });
  it("every college's URL; the NIRF source as the data file states it", () => {
    for (const c of COLLEGES) expect(md).toContain(`${SITE}/colleges/${c.slug}`);
    expect(md).toContain(`Source: National Institutional Ranking Framework (NIRF) ${NIRF_SOURCE_YEAR}, Ministry of Education, Government of India — ${NIRF_SOURCE_URL}`);
    expect(md).toContain(PLATFORM_ONE_LINE);
  });
  it("NIRF ranks print as 'rank N', never as a badge; no stale positioning", () => {
    expect(md).toMatch(/Overall rank \d+/);
    expectClean(md);
  });
});

describe("/scholarships/context.md", () => {
  const md = scholarshipsContextMarkdown(SCHOLARSHIPS, AS_OF);
  it("26 Sep 2026 (repair): no aggregator line, and no 'never an aggregator' promise", () => {
    expect(SCHOLARSHIPS.some((s) => s.tags.includes("aggregator"))).toBe(false);
    expect(md).not.toMatch(/buddy4study/i);
    expect(md).not.toMatch(/never an aggregator/);
    expect(md).toContain("outside aggregators are not listed");
    const route = fs.readFileSync(path.join(process.cwd(), "src/app/scholarships/context.md/route.ts"), "utf8");
    expect(route).toContain("scholarshipsContextMarkdown(SCHOLARSHIP_SCHEMES,");
  });
  it("one line per scholarship with its page and official link", () => {
    expect(md).toContain(`- ${SCHOLARSHIPS.length} scholarships · ${SCHOLARSHIPS.filter((s) => !s.state).length} all-India`);
    const lines = md.split("\n").filter((l) => l.startsWith("- ") && l.includes(`${SITE}/scholarships/`) && l.includes(" — official: "));
    expect(lines.length).toBe(SCHOLARSHIPS.length);
    for (const s of SCHOLARSHIPS) expect(md).toContain(`${SITE}/scholarships/${s.id} — official: ${s.officialSite ?? s.applyUrl}`);
    expectClean(md);
  });
});

describe("/careers/context.md", () => {
  const md = careersContextMarkdown(CAREERS, CAREER_CATEGORIES, AS_OF);
  it("every career by category, the career map and the jobs pages", () => {
    expect(md).toContain(`- ${CAREERS.length} career guides`);
    for (const c of CAREERS) expect(md).toContain(`${SITE}/careers/${c.slug}`);
    for (const p of ["/career-map", "/jobs", "/jobs/govt-jobs", "/jobs/internships", "/jobs/resume", "/jobs/skill-careers", "/post-graduation"]) expect(md).toContain(`${SITE}${p}`);
    expect(md).toContain("a Graduation / PG / PhD section is being built");
    expectClean(md);
  });
});

describe("/schooling/context.md", () => {
  const md = schoolSectionContextMarkdown(SURFACE, AS_OF);
  const n = schoolSurfaceCounts(SURFACE);
  it("computed counts, every class with its context file", () => {
    expect(md).toContain(`- Boards: ${n.boards} · class pages: ${n.classes} · subjects: ${n.subjects} · chapters listed: ${n.chapters} · with Shishya notes: ${n.chaptersWithNotes}`);
    expect(md).toContain(`- Class 6 — ${SITE}/schooling/cbse/class-6 (context: ${SITE}/schooling/cbse/class-6/context.md) — 1 subjects · 2 chapters · 1 with Shishya notes or practice`);
    expect(md).toContain(`- Class 10 — ${SITE}/schooling/icse-cisce/class-10 (context: ${SITE}/schooling/icse-cisce/class-10/context.md) — 1 subjects`);
  });
  it("only chapters with Shishya's content are linked; the link-don't-copy and children lines", () => {
    expect(md).toContain(`${SITE}/schooling/cbse/class-6/mathematics/patterns-in-mathematics`);
    expect(md).not.toContain("/lines-and-angles");
    expect(md).toMatch(/Shishya never reproduces, summarises or translates textbook text/);
    expect(md).toContain(SCHOOL_CHILDREN_LINE);
    expectClean(md);
  });
  it("an empty surface says so instead of printing zeros", () => {
    const e = schoolSectionContextMarkdown({ classes: [] }, AS_OF);
    expect(e).toContain("could not be read just now");
    expect(e).not.toMatch(/class pages: 0/);
  });
});

describe("/context.md (the platform file)", () => {
  const exams = [
    { code: "JEE_MAIN", category: "ENGINEERING", state: null },
    { code: "NEET_UG", category: "MEDICAL", state: null },
    { code: "NDA", category: "GOVT_JOBS", state: null },
    { code: "SSC_CGL", category: "GOVT_JOBS", state: null },
    { code: "KA_KSRP", category: "STATE_LEVEL", state: "KA" },
    { code: "TN_TNPSC_G4", category: "STATE_LEVEL", state: "TN" },
    { code: "CA_FOUNDATION", category: "OTHER", state: null },
  ];
  const input = {
    counts: { ...COUNTS, exams: exams.length, ncertChapters: ncertChapterCount(SURFACE) },
    indianLanguages: INDIAN_LANGUAGE_COUNT,
    exams,
    school: SURFACE,
    colleges: COLLEGES,
    streams: ALL_STREAMS,
    nirfYear: NIRF_SOURCE_YEAR,
    scholarships: SCHOLARSHIPS,
    careers: CAREERS,
    countries: WORLDWIDE_COUNTRIES,
    testPrep: TEST_PREP,
    personas: PERSONAS,
    insights: INSIGHTS_ARTICLES,
    languages: languagesLine(locales),
  };
  const md = platformContextMarkdown(input, AS_OF);
  it("opens with the computed description", () => {
    expect(md.split("\n")[2]).toBe(`> ${platformDescriptionComputed(input.counts)}`);
  });
  it("one block per section with computed counts", () => {
    for (const h of ["## School", "## Entrance exams", "## Government exams", "## Colleges & scholarships", "## Careers", "## Study abroad", "## Guides for students", "## Machine-readable files"]) expect(md).toContain(h);
    expect(md).toContain("- 3 exams: Engineering entrance 1 · Medical entrance 1 · Other entrance exams (after Class 12) 1.");
    expect(md).toContain("- 3 exams: Central government jobs 1 · State-level exams 2; state exams in 2 states and union territories.");
    expect(md).toContain("- 1 other exam: Other exams 1.");
    expect(md).toContain(`- ${COLLEGES.length} colleges from NIRF ${NIRF_SOURCE_YEAR} rankings`);
    expect(md).toContain(`- ${SCHOLARSHIPS.length} scholarships, each linking the awarding body`);
    expect(md).toContain(`- ${CAREERS.length} career guides`);
    const unis = WORLDWIDE_COUNTRIES.reduce((n, c) => n + c.universities.length, 0);
    expect(md).toContain(`- ${WORLDWIDE_COUNTRIES.length} countries, ${unis} universities, ${TEST_PREP.length} test-prep guides`);
    expect(md).toContain(`- ${PERSONAS.length} guides by stage`);
    expect(md).toContain(`- ${INSIGHTS_ARTICLES.length} articles`);
  });
  it("lists every context file, the five new ones included", () => {
    expect(SECTION_CONTEXT_FILES.map((f) => f.path)).toEqual(["/context.md", "/schooling/context.md", "/colleges/context.md", "/scholarships/context.md", "/careers/context.md"]);
    for (const f of SECTION_CONTEXT_FILES) expect(md).toContain(`${SITE}${f.path}`);
    expect(md).toContain(`${SITE}/exams/{CODE}/context.md`);
    expect(md).toContain(`${SITE}/exams/state/{slug}/context.md`);
  });
  it("links /ask as the tutor, never /chat; Graduation/PG/PhD only as 'being built'", () => {
    expect(md).toContain(`${SITE}/ask`);
    expect(md).not.toContain("/chat");
    expect(md).toContain("a Graduation / PG / PhD section is being built");
    expectClean(md);
  });
  it("a failed count read prints the static description and no exam counts", () => {
    const f = platformContextMarkdown({ ...input, counts: null, exams: null, school: null }, AS_OF);
    expect(f.split("\n")[2]).toBe(`> ${platformDescriptionStatic(INDIAN_LANGUAGE_COUNT)}`);
    expect(f).not.toMatch(/- \d+ exams:/);
    expectClean(f);
  });
});

describe("llms-full.txt blocks", () => {
  it("colleges, scholarships, careers, study abroad and guides — counts from the data", () => {
    const text = [
      ...collegesLlmsFullLines(COLLEGES, ALL_STREAMS, SRC),
      ...scholarshipsLlmsFullLines(SCHOLARSHIPS),
      ...careersLlmsFullLines(CAREERS, CAREER_CATEGORIES),
      ...studyAbroadLlmsFullLines(WORLDWIDE_COUNTRIES, TEST_PREP),
      ...guidesLlmsFullLines(PERSONAS, INSIGHTS_ARTICLES),
    ].join("\n");
    expect(text).toContain(`## Colleges — ${COLLEGES.length} colleges from NIRF ${NIRF_SOURCE_YEAR} rankings`);
    expect(text).toContain(`## Scholarships — ${SCHOLARSHIPS.length} scholarships`);
    for (const s of SCHOLARSHIPS) expect(text).toContain(`${SITE}/scholarships/${s.id}`);
    expect(text).toContain(`## Careers — ${CAREERS.length} career guides`);
    expect(text).toContain(`## Study abroad — ${WORLDWIDE_COUNTRIES.length} countries`);
    expect(text).toContain(`## Guides for students — ${PERSONAS.length} guides by stage, ${INSIGHTS_ARTICLES.length} articles`);
    for (const p of PERSONAS) expect(text).toContain(`${SITE}/for/${p.slug}`);
    expectClean(text);
  });
});

// ── 2. Route handler headers ──────────────────────────────────────────

describe("context.md route headers: markdown + HTTP canonical to the HTML page, no noindex", () => {
  it("the header helper", () => {
    expect(contextMarkdownHeaders(`${SITE}/colleges`)).toEqual({
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=900, s-maxage=3600, stale-while-revalidate=86400",
      link: `<${SITE}/colleges>; rel="canonical"`,
    });
  });
  it.each([
    ["@/app/colleges/context.md/route", `${SITE}/colleges`, "# Colleges on Shishya"],
    ["@/app/scholarships/context.md/route", `${SITE}/scholarships`, "# Scholarships on Shishya"],
    ["@/app/careers/context.md/route", `${SITE}/careers`, "# Careers on Shishya"],
  ])("%s", async (mod, html, h1) => {
    const { GET, revalidate } = (await import(/* @vite-ignore */ mod)) as { GET: () => Promise<Response>; revalidate: number };
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(res.headers.get("link")).toBe(`<${html}>; rel="canonical"`);
    expect(res.headers.get("x-robots-tag")).toBeNull();
    expect(revalidate).toBe(3600);
    expect((await res.text()).startsWith(h1)).toBe(true);
  });
  it("the DB-backed routes use the same helper with their own HTML page", () => {
    expect(stripComments(read("src/app/context.md/route.ts"))).toMatch(/contextMarkdownHeaders\(`\$\{SITE\}\/`\)/);
    expect(stripComments(read("src/app/schooling/context.md/route.ts"))).toMatch(/contextMarkdownHeaders\(`\$\{SITE\}\$\{SCHOOL_HUB_PATH\}`\)/);
  });
  it("the exam context file links its hub as canonical and describes the whole platform", () => {
    const src = stripComments(read("src/app/exams/[code]/context.md/route.ts"));
    expect(src).toMatch(/link: `<\$\{SITE\}\/exams\/\$\{exam\.code\}>; rel="canonical"`/);
    expect(src).not.toMatch(/x-robots-tag|noindex/i);
    expect(src).toContain("one smart, free place to study for students in India: school, entrance and government exams, colleges, scholarships and careers.");
    expect(src).toContain("- Ask Shishya (free answers, no sign-in): ${SITE}/ask");
    expectClean(src);
  });
});

// ── 3. public/llms.txt ────────────────────────────────────────────────

describe("public/llms.txt", () => {
  const txt = read("public/llms.txt");
  it("opens with the canonical, number-free summary and points at the computed counts", () => {
    const summary = txt.split("\n").find((l) => l.startsWith("> "))!;
    expect(summary).toMatch(/^> Shishya \(https:\/\/shishya\.in\) is one smart place to study for students in India: a free, AI-supported practice platform with independent sections for school/);
    expect(summary).toContain("Current counts are computed in https://shishya.in/llms-full.txt and https://shishya.in/context.md");
    expect(summary.replace("1-12", "")).not.toMatch(/\d/);
  });
  it("no stale typed count or positioning anywhere", () => {
    expectClean(txt);
    for (const re of [/\b\d[\d,]*\+/, /\b1[89] (Indian )?languages/i, /\b17 other Indian languages/i, /every state (TET|Teacher)/i, /for every major state/i, /Newly (added|deepened) \(Aug 2026\)/]) {
      expect(txt, String(re)).not.toMatch(re);
    }
  });
  it("has every section, each with its hub", () => {
    for (const h of [
      "## Government exams by state",
      "## School — CBSE",
      "## Entrance exams",
      "## Colleges & scholarships",
      "## Careers",
      "## Study abroad",
      "## Guides for students",
      "## Popular exams",
      "## Exam tools and languages",
      "## Key links",
    ]) {
      expect(txt, h).toContain(`\n${h}`);
    }
    for (const u of [
      "https://shishya.in/exams/entrance",
      "https://shishya.in/colleges/context.md",
      "https://shishya.in/scholarships/context.md",
      "https://shishya.in/careers/context.md",
      "https://shishya.in/context.md",
      "https://shishya.in/schooling/context.md",
      "https://shishya.in/scholarships/match",
      "https://shishya.in/distance-learning",
      "https://shishya.in/career-map",
      "https://shishya.in/jobs/govt-jobs",
      "https://shishya.in/post-graduation",
      "https://shishya.in/worldwide",
      "https://shishya.in/insights",
    ]) {
      expect(txt, u).toContain(u);
    }
  });
  it("the Entrance section links the verified exam hubs (probed 26 Sep 2026) and not CLAT", () => {
    const start = txt.indexOf("## Entrance exams");
    const section = txt.slice(start, txt.indexOf("\n## ", start + 1));
    for (const code of ["JEE_MAIN", "JEE_ADVANCED", "NEET_UG", "NEET_PG", "CUET_UG", "NDA", "GATE_CSE", "CAT", "AILET", "NATA", "NIFT", "NID_DAT", "UCEED", "IOQM"]) {
      expect(section).toContain(`(https://shishya.in/exams/${code})`);
    }
    expect(section).not.toMatch(/CLAT/);
  });
  it("the tutor key link is /ask; /chat is never a markdown link", () => {
    expect(txt).toContain("- [Ask Shishya — free AI tutor, no sign-in](https://shishya.in/ask)");
    expect(txt).not.toContain("](https://shishya.in/chat)");
  });
  it("mentors: no 'verified' profile or mentor promise, the small-network line, the ₹9 sentence kept", () => {
    expect(txt).not.toMatch(/verified public teaching profile|verified mentor who has CLEARED|talk to someone who cleared/);
    expect(txt).toContain("the mentor network is new and small, so a request may wait for a mentor of that exam");
    expect(txt).toContain("**Pricing: the first session is free; from the second session it costs ₹9 (inclusive of GST) — this pays ONLY for the mentor's personal time, never for the platform.**");
  });
  it("'admin-validated' became the answer-check wording — claimed for most, never for every question or topic", () => {
    // 26 Sep 2026 (repair): 157 validated questions carry no answer-check
    // record and about half of all syllabus topics have no question yet.
    expect(txt).toContain("most have passed an automated answer check, and any question a student reports is re-checked");
    expect(txt).toContain("(not every topic has questions yet)");
    expect(txt).not.toMatch(/checked before they go live|EVERY individual topic|for each topic of the official syllabus|10-question test/);
  });
});

// ── 4. The llms-full.txt route source ─────────────────────────────────

describe("src/app/llms-full.txt/route.ts", () => {
  const src = stripComments(read("src/app/llms-full.txt/route.ts"));
  it("retitled, computed description first, languages and context files", () => {
    expect(src).toContain('"# Shishya — full index (llms-full.txt)"');
    expect(src).toMatch(/`> \$\{description\}`/);
    expect(src).toMatch(/const description = platformDescription\(/);
    expect(src).toMatch(/languagesLine\(locales\)/);
    expect(src).toMatch(/\.\.\.contextFileLines\(SITE\)/);
  });
  it("exams under Entrance / Government / Other with human labels, not bare enums", () => {
    expect(src).toContain('entrance: "Entrance exams", government: "Government exams", other: "Other exams"');
    expect(src).toMatch(/examGroupLabel\(x\)/);
    expect(src).not.toMatch(/lines\.push\(`## \$\{currentCategory\}`\)/);
  });
  it("adds the section blocks after the School block, which is unchanged", () => {
    expect(src).toMatch(/lines\.push\(\.\.\.schoolLlmsFullLines\(await loadSchoolSurface\(\)\.catch\(\(\) => EMPTY_SCHOOL_SURFACE\), SITE, schoolClassIdentity\)\);\n\n\s*lines\.push\(\.\.\.collegesLlmsFullLines\(/);
    for (const f of ["scholarshipsLlmsFullLines", "careersLlmsFullLines", "studyAbroadLlmsFullLines", "guidesLlmsFullLines"]) expect(src).toContain(`lines.push(...${f}(`);
  });
  it("/chat appears once, as the chat tutor beside the /ask link", () => {
    expect(src.match(/\$\{SITE\}\/chat\b/g)?.length).toBe(1);
    expect(src).toMatch(/- AI tutor — \$\{SITE\}\/ask — free answers with no sign-in/);
    expect(src).toMatch(/Free AI answers in English and \$\{INDIAN_LANGUAGE_COUNT\} Indian languages, no sign-in: \$\{SITE\}\/ask/);
  });
  it("mentor line: no verified profile, the small-network line", () => {
    expect(src).not.toMatch(/verified public profile/);
    expect(src).toContain("the mentor network is new and small, so a request may wait for a mentor of that exam");
  });
});
