// Search review fixes (26 Sep 2026) — the verified findings of the
// adversarial review of the site-wide search, pinned so they stay fixed.
//
//   1. matric / matriculation / sslc are Class 10 only beside a school word —
//      never beside a scholarship, job or exam-page word;
//   2. a school page never opens for a result / admit card / date / cutoff /
//      sample-paper search (list + "no-page-for-intent"; the board page leads
//      for paper words);
//   3. a bare "paper" beside an exam is its previous papers;
//   4. "ug" / "pg" inside an exam's name is not a degree (no "being built");
//   5. plural "colleges" never opens one college; degrees name their stream;
//      "in tamil nadu" is the state, not a language request;
//   6. category, filler and "level N" words never make a false
//      "not-in-catalogue"; "live test" lists the all-India live tests;
//   7. Hindi / Telugu qualifiers ("10वीं पास") and the exam finder;
//   8. topic notes never win over the page the query asked for, and a state
//      word alone does not name a topic note's exam;
//   9. an exam with no mock yet never offers "Mock tests" as a page;
//  10. pasted /exams/state and /exams/browse links; the alumni landing's
//      honest name;
//  11. the /ask page: one panel per search (key), one index load for the
//      directory; the loader shares one in-flight read;
//  12. a production-shaped topic set (every topic-note page, 26 Sep): 0 wrong
//      DIRECT against the reviewed real queries, and the same outcomes as the
//      3-exam snapshot (word weights ignore topic-note pages).
// Pure: the committed snapshots, no DB, no network, no model.
// Run: npx vitest run tests/unit/search-review-fixes.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fixtureIndex, fixtureInputs } from "../fixtures/search-index-fixture";
import { reviewedRows, reviewedTarget } from "../fixtures/search-reviewed";
import { resolveQuery } from "@/lib/search/resolve";
import { parseQuery, pastedShishyaPath } from "@/lib/search/parse";
import { examIntentUrl, examSiblingIntents, knownUrl } from "@/lib/search/targets";
import { buildSearchIndex } from "@/lib/search/index-core";
import { SEARCH_LANDINGS } from "@/lib/search/landings";
import { searchCopy } from "@/lib/search-copy";
import type { SearchIndex } from "@/lib/search/types";

const ROOT = process.cwd();
const deep = fixtureIndex("deep");
const lite = fixtureIndex("lite");
const res = (q: string, idx: SearchIndex = deep) => resolveQuery(q, idx);
const urls = (q: string, idx: SearchIndex = deep) => res(q, idx).hits.map((h) => h.url);

describe("1. matric / sslc", () => {
  it.each([
    ["post matric scholarship", "/scholarships/nsp-post-matric"],
    ["post-matric scholarship sc st", "/scholarships/nsp-post-matric"],
    ["post matric scholarship obc", "/scholarships/nsp-post-matric"],
    ["पोस्ट मैट्रिक छात्रवृत्ति", "/scholarships/nsp-post-matric"],
    ["pre matric scholarship", "/scholarships/nsp-pre-matric"],
  ])("%s → %s (never CBSE Class 10)", (q, url) => {
    for (const idx of [deep, lite]) {
      const r = res(q, idx);
      expect(r.outcome, q).toBe("direct");
      expect(r.best?.url).toBe(url);
      expect(r.parsed.cls).toBeNull();
    }
  });

  it("sslc / matric with a result, date or job word never opens a CBSE page", () => {
    for (const q of ["sslc result", "sslc exam date", "matric result 2026", "matric pass govt job", "post matric", "matric scholarship"]) {
      const r = res(q);
      expect(r.best?.url ?? "", q).not.toMatch(/^\/schooling\/cbse/);
    }
    expect(parseQuery("matric pass govt job").stage).toBe("after-10");
    expect(parseQuery("karnataka sslc").board).toBe("ka-sslc");
  });

  it("with a school word they are still Class 10", () => {
    expect(res("matric maths notes").best?.url).toBe("/schooling/cbse/class-10/mathematics");
    expect(parseQuery("sslc science").cls).toBe(10);
    expect(parseQuery("matric").cls).toBe(10);
  });
});

describe("2. school pages and exam-page words", () => {
  it.each([
    ["cbse class 12 result", "/schooling/cbse/class-12"],
    ["cbse 10th result", "/schooling/cbse/class-10"],
    ["class 12 admit card", "/schooling/cbse/class-12"],
    // 27 Sep 2026 (wave 2 search): "cbse board exam date 2027" moved to the board-exam test below.
    ["class 12 physics cutoff", "/schooling/cbse/class-12/physics"],
  ])("%s → a list with %s and no-page-for-intent", (q, url) => {
    const r = res(q);
    expect(r.outcome).toBe("list");
    expect(r.notices).toContain("no-page-for-intent");
    expect(r.hits.map((h) => h.url)).toContain(url);
  });

  // 27 Sep 2026 (wave 2 search): CBSE's board-exam hub for the class (its own sample papers,
  // marking schemes and date-sheet status) opens, with the board and class pages as rows (was: a
  // list led by the board page); with no class named, both hubs lead a list.
  it("sample papers: the class's CBSE board-exam hub opens; the board page is a row", () => {
    const r = res("cbse class 10 sample paper");
    expect(r.outcome).toBe("direct");
    expect(r.best?.url).toBe("/schooling/cbse/class-10/board-exam");
    expect(r.hits.map((h) => h.url)).toEqual(expect.arrayContaining(["/schooling/cbse", "/schooling/cbse/class-10"]));
  });

  it("cbse board exam date 2027: a list led by the two board-exam hubs, the board page below", () => {
    const r = res("cbse board exam date 2027");
    expect(r.outcome).toBe("list");
    expect(r.hits.slice(0, 2).map((h) => h.url)).toEqual(["/schooling/cbse/class-10/board-exam", "/schooling/cbse/class-12/board-exam"]);
    expect(r.hits.map((h) => h.url)).toContain("/schooling/cbse");
  });

  it("practice, notes and syllabus words still open the school page", () => {
    expect(res("class 10 maths questions").best?.url).toBe("/schooling/cbse/class-10/mathematics");
    expect(res("cbse class 10 syllabus").best?.url).toBe("/schooling/cbse/class-10");
    expect(res("class 9 science chapter 3").best?.url).toBe("/schooling/cbse/class-9/science/tissues-in-action");
  });
});

describe("3. a bare 'paper' beside an exam is its previous papers", () => {
  it.each([
    ["hssc cet 2024 paper", "/exams/HR_HSSC_CET/pyq/2024"],
    ["ssc cgl 2024 paper", "/exams/SSC_CGL/pyq/2024"],
    ["ssc cgl paper 2024", "/exams/SSC_CGL/pyq/2024"],
    ["neet 2023 paper", "/exams/NEET_UG/pyq/2023"],
    ["upsc 2022 paper", "/exams/UPSC_PRELIMS/pyq/2022"],
    ["ctet 2024 paper", "/exams/CTET/pyq/2024"],
  ])("%s → %s", (q, url) => {
    const r = res(q);
    expect(r.outcome).toBe("direct");
    expect(r.best?.url).toBe(url);
  });

  it("beside a school word, or inside a page's name, it stays a word", () => {
    expect(res("class 3 paper boats").best?.url).toBe("/schooling/cbse/class-3/english/paper-boats");
    expect(res("descriptive paper").best?.url).toBe("/descriptive");
    expect(parseQuery("ssc cgl paper 2").intent).not.toBe("pyq"); // a sitting, not the papers
  });
});

describe("4. 'ug' / 'pg' in an exam's name is not a degree", () => {
  it.each(["neet ug syllabus", "cuet ug previous year question paper", "neet ug questions", "cuet ug syllabus", "neet ug notes"])("%s: no being-built", (q) => {
    const r = res(q);
    expect(r.parsed.beingBuilt).toBe(false);
    expect(r.notices).not.toContain("being-built");
    expect(r.hits[0]?.url ?? "").not.toBe("/post-graduation");
  });

  it("a degree's study words are still being built — and never open a state entrance page", () => {
    const r = res("bsc nursing syllabus");
    expect(r.outcome).not.toBe("direct");
    expect(r.notices).toContain("being-built");
    expect(res("pg notes").notices).toContain("being-built");
    expect(res("phd").notices).toContain("being-built");
  });
});

describe("5. colleges", () => {
  it.each([
    ["law colleges in delhi", "/colleges/state/delhi", ["/colleges/stream/law"]],
    ["medical colleges in delhi", "/colleges/state/delhi", ["/colleges/stream/medical"]],
    ["engineering colleges in karnataka", "/colleges/state/karnataka", ["/colleges/stream/engineering"]],
    ["medical colleges in tamil nadu", "/colleges/state/tamil-nadu", ["/colleges/stream/medical"]],
    ["engineering colleges in tamil nadu", "/colleges/state/tamil-nadu", ["/colleges/stream/engineering"]],
  ] as [string, string, string[]][])("%s: a list led by %s, never one college", (q, first, also) => {
    for (const idx of [deep, lite]) {
      const r = res(q, idx);
      expect(r.outcome, q).toBe("list");
      expect(r.hits[0].url).toBe(first);
      for (const u of also) expect(r.hits.map((h) => h.url)).toContain(u);
    }
  });

  it("'in tamil nadu' is the state, not a request for Tamil", () => {
    const p = parseQuery("medical colleges in tamil nadu");
    expect(p.langRequest).toBeNull();
    expect(p.state).toBe("TN");
    expect(parseQuery("ssc cgl in tamil").langRequest).toBe("ta");
  });

  it("a plural colleges query never opens one college", () => {
    expect(res("management colleges in bangalore").outcome).not.toBe("direct");
    expect(res("iit madras placements").best?.url).toBe("/colleges/iit-madras"); // one college named: unchanged
    expect(res("colleges in karnataka").best?.url).toBe("/colleges/state/karnataka");
  });

  it.each([
    ["mba colleges", "/colleges/stream/management"],
    ["top mba colleges", "/colleges/stream/management"],
    ["mba colleges in india", "/colleges/stream/management"],
    ["mbbs colleges", "/colleges/stream/medical"],
    ["btech colleges", "/colleges/stream/engineering"],
  ])("a degree names its stream: %s → %s", (q, url) => {
    const r = res(q);
    expect(r.outcome).toBe("direct");
    expect(r.best?.url).toBe(url);
  });
});

describe("6. no false not-in-catalogue", () => {
  it.each([
    ["ssc cgl cutoff obc", "/exams/SSC_CGL/cutoff"],
    ["ssc cgl cutoff category wise", "/exams/SSC_CGL/cutoff"],
    ["ssc cgl cutoff marks", "/exams/SSC_CGL/cutoff"],
    ["ssc cgl expected cutoff", "/exams/SSC_CGL/cutoff"],
    ["neet ug cutoff for obc", "/exams/NEET_UG/cutoff"],
    ["reet level 2 syllabus", "/exams/RJ_REET/syllabus"],
    ["resume format for freshers", "/jobs/resume"],
  ])("%s → %s", (q, url) => {
    const r = res(q);
    expect(r.outcome).toBe("direct");
    expect(r.best?.url).toBe(url);
    expect(r.notices).not.toContain("not-in-catalogue");
  });

  it("ssc cgl live test: the exam's mocks and the all-India live tests side by side", () => {
    const r = res("ssc cgl live test");
    expect(r.notices).not.toContain("not-in-catalogue");
    expect(r.hits.map((h) => h.url)).toEqual(expect.arrayContaining(["/exams/SSC_CGL#mocks", "/live-test"]));
    expect(res("live test").best?.url).toBe("/live-test");
  });

  it("a word that names a different post still says so", () => {
    expect(res("rrb je").notices).toContain("not-in-catalogue");
  });
});

describe("7. qualifiers in every script", () => {
  it.each(["सरकारी नौकरी 10वीं पास", "12वीं पास सरकारी नौकरी", "दसवीं पास सरकारी नौकरी", "10th pass sarkari naukri", "12th pass govt job", "graduate govt jobs", "class 10 pass govt job"])(
    "%s → the exam finder",
    (q) => {
      const r = res(q);
      expect(r.outcome).toBe("direct");
      expect(r.best?.url).toBe("/find-your-exam");
      expect(r.parsed.cls).toBeNull();
    },
  );

  it("reads the stage from Hindi and Telugu ordinals", () => {
    expect(parseQuery("10वीं पास नौकरी").stage).toBe("after-10");
    expect(parseQuery("10వ తరగతి పాస్ ఉద్యోగాలు").stage).toBe("after-10");
    expect(res("10वीं पास नौकरी").hits[0].url).toBe("/find-your-exam");
  });

  it("career after 12th <stream>: the career pages, not Class 6 Science", () => {
    const top = urls("career after 12th science").slice(0, 3);
    expect(top).toEqual(expect.arrayContaining(["/careers", "/career-map"]));
    expect(top.join(" ")).not.toMatch(/schooling\/cbse\/class-6/);
  });
});

describe("8. topic notes", () => {
  it("never open instead of the cutoff / mock / PYQ page the query asked for", () => {
    for (const q of ["ssc cgl algebra cutoff", "ssc cgl algebra mock test", "ssc cgl algebra previous year questions", "ctet child development mock test"]) {
      expect(res(q).outcome, q).not.toBe("direct");
    }
    expect(res("ssc cgl algebra").best?.url).toBe("/exams/SSC_CGL/topics/quant.algebra"); // topic named with its exam: still opens
  });

  it("a state word alone does not name a topic note's exam", () => {
    expect(res("uttrakhand geopgraphy").outcome).not.toBe("direct");
  });
});

describe("9. an exam with no mock yet", () => {
  const notLive = Object.entries(deep.exams).filter(([, f]) => !f.live).map(([c]) => c);

  it("the snapshot has exams with no mock and no checked question", () => {
    expect(notLive).toEqual(expect.arrayContaining(["NEET_PG", "NATA", "RBI_GRADE_B"]));
  });

  it("mocks / subject tests / own mock: the hub, marked Coming, never a direct open", () => {
    for (const code of notLive) {
      for (const intent of ["mocks", "subject-tests", "build-mock"] as const) {
        const t = examIntentUrl(code, intent, deep.exams[code]);
        expect(t, `${code} ${intent}`).toMatchObject({ url: `/exams/${code}`, downgraded: true, status: "coming" });
      }
      expect(examSiblingIntents(deep.exams[code])).not.toContain("mocks");
    }
    for (const q of ["neet pg mock test", "nata mock test", "rbi grade b mock"]) {
      const r = res(q);
      expect(r.outcome, q).not.toBe("direct");
      expect(r.notices).toContain("no-page-for-intent");
      expect(r.hits[0].status).toBe("coming");
    }
    expect(res("neet pg").quick.map((h) => h.url).join(" ")).not.toMatch(/#mocks/);
    expect(res("ssc gd mock test").best?.url).toBe("/exams/SSC_GD#mocks"); // live exams unchanged
  });
});

describe("10. pasted links and landings", () => {
  it("knownUrl and a pasted link know the state and browse pages", () => {
    expect(knownUrl("/exams/state/bihar", deep)).toBe("/exams/state/bihar");
    expect(knownUrl("https://shishya.in/exams/browse?category=BANKING", deep)).toBe("/exams/browse?category=BANKING");
    expect(knownUrl("/exams/state/not-a-state", deep)).toBeNull();
    expect(knownUrl("/exams/NOT_AN_EXAM", deep)).toBeNull();
    expect(pastedShishyaPath("https://shishya.in/exams/state/bihar")).toBe("/exams/state/bihar");
    expect(pastedShishyaPath("https://shishya.in/exams/browse?category=banking")).toBe("/exams/browse?category=BANKING");
    expect(pastedShishyaPath("https://shishya.in/exams/mp_tet")).toBe("/exams/MP_TET");
    for (const [q, url] of [
      ["https://shishya.in/exams/state/bihar", "/exams/state/bihar"],
      ["shishya.in/exams/state/uttar-pradesh", "/exams/state/uttar-pradesh"],
      ["https://shishya.in/exams/browse?category=BANKING", "/exams/browse?category=BANKING"],
    ]) {
      for (const idx of [deep, lite]) {
        const r = res(q, idx);
        expect(r.outcome, q).toBe("direct");
        expect(r.best?.url).toBe(url);
      }
    }
  });

  it("the alumni landing says what the page is: composite examples, not testimonials", () => {
    const l = SEARCH_LANDINGS.find((x) => x.path === "/alumni-stories")!;
    expect(`${l.title} ${l.sub}`).toMatch(/composite/i);
    expect(`${l.title} ${l.sub}`).not.toMatch(/used Shishya|success|topper/i);
    expect(l.terms.join(" ")).not.toMatch(/success|topper/);
    for (const q of ["success stories", "toppers stories"]) expect(res(q).outcome, q).not.toBe("direct");
  });
});

describe("11. the /ask page and the index loader", () => {
  const page = fs.readFileSync(path.join(ROOT, "src/app/ask/page.tsx"), "utf8");
  const loader = fs.readFileSync(path.join(ROOT, "src/lib/search/index-build.ts"), "utf8");

  it("one AI panel per search: keyed by the query and the ai flag", () => {
    expect(page).toMatch(/<AskAnswer\s+key=\{`\$\{q\}\|\$\{forceAi \? 1 : 0\}`\}/);
  });

  it("the landing directory loads the index once and resolves each example in memory", () => {
    const dir = page.slice(page.indexOf("async function Directory"), page.indexOf("export default async function AskPage"));
    expect((dir.match(/loadSearchIndex\(/g) ?? []).length).toBe(1);
    expect(dir).not.toMatch(/resolveQueryServer\(/);
    expect(dir).toMatch(/resolveQuery\(ex, index/);
  });

  it("concurrent callers share one DB read, and a failed read waits before the next try", () => {
    expect(loader).toMatch(/let inflight: Promise<SearchIndexInputs \| null> \| null = null;/);
    expect(loader).toMatch(/inflight \?\?= cachedInputs\(\)/);
    expect(loader).toMatch(/FAILED_READ_TTL_MS = 60_000/);
    expect(loader).toMatch(/Date\.now\(\) - failedAt < FAILED_READ_TTL_MS/);
  });
});

describe("12. production-shaped topic notes (every topic-note page, 26 Sep 2026)", () => {
  const snap = JSON.parse(fs.readFileSync(path.join(ROOT, "tests/fixtures/search-topics-2026-09-26.json"), "utf8")) as {
    count: number;
    topics: Record<string, [string, string][]>;
  };
  const topics = Object.entries(snap.topics).flatMap(([examCode, rows]) => rows.map(([code, name]) => ({ examCode, code, name })));
  const base = fixtureInputs();
  const prod = buildSearchIndex({ ...base, topics, topicNoteExams: Object.keys(snap.topics) }, "deep");

  it("holds the whole set", () => {
    expect(topics.length).toBe(snap.count);
    expect(topics.length).toBeGreaterThan(4000);
    expect(prod.docs.filter((d) => d.kind === "topic-note").length).toBeGreaterThan(4000);
  });

  it("no wrong DIRECT against the reviewed real queries, and ≥ 85% agree", () => {
    const rows = reviewedRows();
    const wrong: string[] = [];
    let agree = 0;
    // 27 Sep 2026: each row's reviewed outcome in today's page form — /pyq as the hub's #pyqs
    // (26 Sep, G2), a covered category filter as its hub, /mock-tests (tests/fixtures/search-reviewed.ts).
    for (const row of rows) {
      const r = resolveQuery(row.q, prod);
      const want = reviewedTarget(row, prod);
      if (r.outcome === "direct" && (want.outcome !== "direct" || r.best?.url !== want.url)) wrong.push(`${row.q} → ${r.best?.url}`);
      if (r.outcome === want.outcome && (want.outcome !== "direct" || r.best?.url === want.url)) agree++;
    }
    expect(wrong).toEqual([]);
    expect(agree / rows.length).toBeGreaterThanOrEqual(0.85);
  });

  it("the copy's examples and the review's probes resolve the same as on the 3-exam snapshot", () => {
    const qs = new Set<string>(["mp patwari", "sub engineer", "uttrakhand geopgraphy", "telugu tet paper iia for ap mock test full", "ssc cgl algebra", "ssc cgl algebra cutoff"]);
    for (const loc of ["en", "hi", "te"] as const) {
      const c = searchCopy(loc);
      for (const p of c.placeholder) qs.add(p.text);
      for (const t of c.tryRows) qs.add(t.q);
      for (const d of c.directory) for (const e of d.examples) qs.add(e);
    }
    const flips: string[] = [];
    for (const q of qs) {
      const a = resolveQuery(q, deep);
      const b = resolveQuery(q, prod);
      const ka = `${a.outcome} ${a.best?.url ?? ""}`;
      const kb = `${b.outcome} ${b.best?.url ?? ""}`;
      if (ka !== kb) flips.push(`${q}: ${ka} → ${kb}`);
    }
    expect(flips).toEqual([]);
  });
});
