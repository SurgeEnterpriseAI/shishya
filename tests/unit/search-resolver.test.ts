// Site-wide search resolver (26 Sep 2026) — src/lib/search as tests.
//
// The index is built by the same pure builder the server uses
// (src/lib/search/index-core.ts) from a committed snapshot of the real inputs
// (tests/fixtures/search-inputs-2026-09-26.json: the 180 exams with their page
// gates and PYQ years, the school spine) plus the static data. No DB, no
// network, no model. Run: npx vitest run tests/unit/search-resolver.test.ts
//
// What is pinned:
//   1. real queries (the Ask log, the search-miss log, the design's goldens) —
//      English, romanised Hindi, Devanagari, Telugu; every section; every page
//      intent — to the page they open, or to "list" / "ai";
//   2. the logged misroutes of the old exam-only matchers stay fixed;
//   3. honesty: every URL any resolution emits is a page.tsx under src/app,
//      never a private / retired prefix, never an open redirect; exam
//      sub-pages only where their gate / year / block exists;
//   4. Class 1-7 never reaches the AI; typing never opens a page; the rotating
//      placeholder examples never ask the AI;
//   5. the parts: normaliser, letter-name decoder, TWIN_PUBLIC_RE copy vs the
//      middleware, pure imports, wire codec round-trip and size cap, speed.

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { describe, expect, it } from "vitest";
import { fixtureIndex, fixtureInputs } from "../fixtures/search-index-fixture";
import { resolveQuery } from "@/lib/search/resolve";
import { parseQuery } from "@/lib/search/parse";
import { decodeLetterNames, normaliseQuery } from "@/lib/search/normalize";
import { TWIN_PUBLIC_RE, examIntentUrl, isSafePath, knownUrl, localeTarget } from "@/lib/search/targets";
import { decodeIndex, encodeIndex } from "@/lib/search/index-codec";
import { buildSearchIndex, toLiteIndex } from "@/lib/search/index-core";
import { SEARCH_LANDINGS } from "@/lib/search/landings";
import { SUBJECT_TARGETS } from "@/lib/search/lexicon";
import { DIRECT_MIN, type Resolution, type SearchIndex } from "@/lib/search/types";
import { searchCopy } from "@/lib/search-copy";

const ROOT = process.cwd();
const deep = fixtureIndex("deep");
const lite = fixtureIndex("lite");
const res = (q: string, opts: Parameters<typeof resolveQuery>[2] = {}) => resolveQuery(q, deep, opts);

/** A path under src/app that renders (dynamic segments and route groups followed) — the home-doors test's rule.
 *  26 Sep 2026 (integrator): directory listings and answers are memoised. The
 *  uncached walk re-read src/app for every one of ~2,500 URLs and timed out
 *  (5 s) under the full suite's parallel load. Static segments now match by
 *  exact (case-sensitive) name, as on Vercel's Linux file system. */
const dirCache = new Map<string, fs.Dirent[]>();
function listDir(dir: string): fs.Dirent[] {
  let v = dirCache.get(dir);
  if (!v) {
    v = fs.readdirSync(dir, { withFileTypes: true });
    dirCache.set(dir, v);
  }
  return v;
}
const routeCache = new Map<string, boolean>();
function routeExists(href: string): boolean {
  const clean = href.split(/[?#]/)[0];
  const cached = routeCache.get(clean);
  if (cached !== undefined) return cached;
  const segs = clean.split("/").filter(Boolean);
  const expand = (dir: string): string[] => {
    const out = [dir];
    for (const e of listDir(dir)) {
      if (e.isDirectory() && /^\(.+\)$/.test(e.name)) out.push(...expand(path.join(dir, e.name)));
    }
    return out;
  };
  let dirs = expand(path.join(ROOT, "src/app"));
  for (const seg of segs) {
    const next: string[] = [];
    for (const d of dirs) {
      for (const e of listDir(d)) {
        if (!e.isDirectory()) continue;
        if (e.name === seg || /^\[.+\]$/.test(e.name)) next.push(...expand(path.join(d, e.name)));
      }
    }
    dirs = next;
    if (dirs.length === 0) {
      routeCache.set(clean, false);
      return false;
    }
  }
  const ok = dirs.some((d) => listDir(d).some((e) => e.isFile() && e.name === "page.tsx"));
  routeCache.set(clean, ok);
  return ok;
}

/** 26 Sep 2026 (G2): the reviewed rows recorded /exams/X/pyq, which 308s to the hub's #pyqs —
 *  the search now links the section itself, so the recorded page is compared in that form. */
function reviewedUrl(url: string | undefined): string | undefined {
  if (url && url.startsWith("/exams/") && url.endsWith("/pyq") && url.split("/").length === 4) return `${url.slice(0, -4)}#pyqs`;
  return url;
}

const FORBIDDEN = /^\/(api|me|dashboard|today|aptitude|chat|mocks|attempts|admin|login\/institution)(\/|$|\?|#)/;

/** Every URL a resolution can send a student to. */
function urlsOf(r: Resolution): string[] {
  return [...(r.best ? [r.best.url] : []), ...r.hits.map((h) => h.url), ...r.quick.map((h) => h.url), ...r.recommended.map((h) => h.url), r.fallback.url];
}

/** A URL is honest when it is a safe site path, not private, and (without its /hi or /te prefix) a real page. */
function assertHonestUrl(u: string, from: string) {
  expect(isSafePath(u), `${from}: ${u} is not a single-slash site path`).toBe(true);
  const twin = /^\/(hi|te)(\/.*)?$/.exec(u);
  const bare = twin ? twin[2] || "/" : u;
  if (twin) expect(bare === "/" || TWIN_PUBLIC_RE.test(bare.split(/[?#]/)[0]), `${from}: ${u} has no /${twin[1]} twin`).toBe(true);
  expect(FORBIDDEN.test(bare), `${from}: ${u} is a private or retired surface`).toBe(false);
  expect(routeExists(bare), `${from}: ${u} has no page.tsx under src/app`).toBe(true);
}

// ── 1. Real queries pinned to the page they open ─────────────────────────

const DIRECT: [q: string, url: string][] = [
  // Government exams — names, typos, board acronyms, posts (Ask log).
  ["ssc cgl", "/exams/SSC_CGL"],
  ["SSC CGL cutoff", "/exams/SSC_CGL/cutoff"],
  ["mpsc group c", "/exams/MH_MPSC_GROUP_C"],
  ["uksssc junior assistant", "/exams/UK_UKSSSC"],
  ["ukssc", "/exams/UK_UKSSSC"],
  ["ts pc", "/exams/TS_POLICE_PC"],
  ["ap police", "/exams/AP_POLICE_PC"],
  ["ksp", "/exams/KA_POLICE_PC"],
  ["mpesb", "/exams/MP_MPESB"],
  ["mp esb group 2", "/exams/MP_MPESB"],
  ["upp constable", "/exams/UP_POLICE_CONSTABLE"],
  ["gtnpsc group 4", "/exams/TN_TNPSC_GROUP4"],
  ["bihar police", "/exams/BR_POLICE_PC"],
  ["group2 tamilnadu", "/exams/TN_TNPSC_GROUP2"],
  // Exam pages (intents): dates, PYQ year, cutoff, salary, mocks, subject tests, topic-wise builder.
  ["appsc group 2 pyq 2024", "/exams/AP_APPSC_GROUP2/pyq/2024"],
  // 26 Sep 2026 (G2): the hub's Previous Papers section itself — /pyq only 308s there.
  ["pyqs of tspsc group 1", "/exams/TS_TSPSC_GROUP1#pyqs"],
  ["appsc group 2 prelims qualifying marks ?", "/exams/AP_APPSC_GROUP2/cutoff"],
  ["when is the ssc cgl 2026 tier 1 exam?", "/exams/SSC_CGL/updates"],
  ["what is the salary of ssc cgl", "/exams/SSC_CGL#salary"],
  ["utet free mock", "/exams/UK_TET#mocks"],
  ["muje ibps clerk math ke questions do", "/exams/IBPS_CLERK#subject-tests"],
  ["cds english", "/exams/CDS#subject-tests"],
  ["rrb ntpc chapter test", "/exams/RRB_NTPC/build-mock"],
  ["can i get subject wise and topic wise mock tests for ssc cgl?", "/exams/SSC_CGL/build-mock"],
  // Topic notes (server index): the exam and the topic together.
  ["ssc cgl algebra", "/exams/SSC_CGL/topics/quant.algebra"],
  ["ctet notes", "/exams/CTET/topics"],
  // Hindi / Telugu scripts: letter-name acronyms, native role and page words.
  ["एसएससी सीजीएल कटऑफ", "/exams/SSC_CGL/cutoff"],
  ["తెలంగాణ పోలీస్ కానిస్టేబుల్ హాల్ టికెట్", "/exams/TS_POLICE_PC/updates"],
  ["ssc cgl in hindi", "/hi/exams/SSC_CGL"],
  ["करंट अफेयर्स", "/current-affairs"],
  ["आईबीपीएस क्लर्क", "/exams/IBPS_CLERK"],
  ["टीएसपीएससी ग्रुप 2", "/exams/TS_TSPSC_GROUP2"],
  ["नीट परीक्षा तिथि", "/exams/NEET_UG/updates"],
  ["राजस्थान पटवारी", "/exams/RJ_RSMSSB"],
  ["सरकारी नौकरी उत्तर प्रदेश", "/exams/state/uttar-pradesh"],
  ["ssc cgl ki salary kitni hai", "/exams/SSC_CGL#salary"],
  ["ఏపీ పోలీస్", "/exams/AP_POLICE_PC"],
  ["తెలంగాణ టెట్", "/exams/TS_TET"],
  ["10వ తరగతి సైన్స్ అధ్యాయం 2", "/schooling/cbse/class-10/science/acids-bases-and-salts"],
  ["ఇంజనీరింగ్ కాలేజీలు", "/colleges/stream/engineering"],
  // Entrance exams: the default family, and the explicit one always wins.
  ["neet syllabus", "/exams/NEET_UG/syllabus"],
  ["neet pg", "/exams/NEET_PG"],
  ["jee", "/exams/JEE_MAIN"],
  ["jee advanced", "/exams/JEE_ADVANCED"],
  ["upsc", "/exams/UPSC_PRELIMS"],
  ["gate", "/exams/GATE_CSE"],
  // School: class, subject, chapter by number or name, board, native scripts.
  ["class 9 science chapter 3", "/schooling/cbse/class-9/science/tissues-in-action"],
  ["10th maths chapter 3", "/schooling/cbse/class-10/mathematics/pair-of-linear-equations-in-two-variables"],
  ["कक्षा 6 गणित", "/schooling/cbse/class-6/mathematics"],
  ["10వ తరగతి గణితం", "/schooling/cbse/class-10/mathematics"],
  ["icse class 10 maths", "/schooling/icse-cisce/class-10/mathematics"],
  ["class 7 science light", "/schooling/cbse/class-7/science/light-shadows-and-reflections"],
  ["photosynthesis class 11", "/schooling/cbse/class-11/biology/photosynthesis-in-higher-plants"],
  ["class 11 physics", "/schooling/cbse/class-11/physics"],
  ["class 12", "/schooling/cbse/class-12"],
  // College & scholarships.
  ["iit madras placements", "/colleges/iit-madras"],
  ["iit madras cse", "/colleges/iit-madras/cse"],
  ["iit bombay", "/colleges/iit-bombay"],
  ["colleges cutoff", "/colleges/cutoffs"],
  ["colleges in karnataka", "/colleges/state/karnataka"],
  ["pm yasasvi", "/scholarships/pm-yasasvi"],
  // Careers.
  ["how to become a pilot", "/careers/commercial-pilot"],
  ["software engineer salary", "/careers/software-engineer"],
  ["pharmacist", "/careers/pharmacist"],
  ["indian coast guard", "/careers/coast-guard-officer"],
  // State, category, landing and tool pages.
  ["sarkari naukri bihar", "/exams/state/bihar"],
  ["telangana", "/exams/state/telangana"],
  ["banking", "/exams/browse?category=BANKING"],
  ["results", "/results"],
  ["typing test", "/typing"],
  ["current affairs", "/current-affairs"],
  ["ielts", "/worldwide/test-prep/ielts"],
  ["sign up kese kre", "/login"],
  // A pasted Shishya link.
  ["https://shishya.in/exams/mp_tet", "/exams/MP_TET"],
];

describe("real queries open the page Shishya already has", () => {
  it.each(DIRECT)("%s → %s", (q, url) => {
    const r = res(q);
    expect(r.outcome, `${q}: ${JSON.stringify(r.hits.slice(0, 3).map((h) => [h.url, h.score]))}`).toBe("direct");
    expect(r.best?.url).toBe(url);
    expect(r.best!.score).toBeGreaterThanOrEqual(DIRECT_MIN - 0.2);
  });
});

describe("several pages fit: a list, never a guess", () => {
  it.each([
    ["kas", ["/exams/KA_KPSC_KAS", "/exams/JK_JKPSC_KAS"]],
    ["up police admit card", ["/exams/UP_POLICE_CONSTABLE/updates", "/exams/UP_POLICE_SI/updates"]],
    ["physics", ["/exams/NSEP", "/schooling/cbse/class-11/physics", "/schooling/cbse/class-12/physics"]],
    ["iit", ["/colleges/iit-madras", "/exams/JEE_ADVANCED"]],
    ["ssc", ["/exams/SSC_GD", "/exams/SSC_CHSL"]],
    ["tnpsc", ["/exams/TN_TNPSC_GROUP4", "/exams/TN_TNPSC_GROUP2"]],
    ["railway", ["/exams/RRB_NTPC", "/exams/RRB_GROUP_D", "/exams/RRB_ALP"]],
    ["group 2", ["/exams/AP_APPSC_GROUP2", "/exams/TS_TSPSC_GROUP2", "/exams/TN_TNPSC_GROUP2"]],
  ] as [string, string[]][])("%s", (q, urls) => {
    const r = res(q);
    expect(r.outcome).toBe("list");
    const got = r.hits.map((h) => h.url);
    for (const u of urls) expect(got, `${q} lists ${u}`).toContain(u);
  });

  it("scholarships for girls: the matcher first, then girls-only scholarships from data", () => {
    const r = res("scholarship for girls");
    expect(r.outcome).toBe("list");
    expect(r.hits[0].url).toBe("/scholarships/match");
    const girls = r.hits.filter((h) => h.kind === "scholarship");
    expect(girls.length).toBeGreaterThan(0);
    for (const h of girls) expect(h.sub).toMatch(/girls only/);
  });

  it("rrb je: the family is there, the post is not — list + not-in-catalogue, logged as a miss", () => {
    const r = res("rrb je");
    expect(r.outcome).toBe("list");
    expect(r.notices).toContain("not-in-catalogue");
    expect(r.logMiss).toBe(true);
    expect(r.hits.map((h) => h.url)).toContain("/exams/RRB_NTPC");
  });

  it("phd: study help is being built — the PG page and PhD scholarships, never a direct open", () => {
    const r = res("phd");
    expect(r.outcome).toBe("list");
    expect(r.notices).toContain("being-built");
    expect(r.hits.map((h) => h.url)).toContain("/post-graduation");
  });

  it("chapter N in more than one book: chapter-ambiguous; old cumulative numbering is offered", () => {
    const amb = res("class 10 english chapter 1");
    expect(amb.outcome).toBe("list");
    expect(amb.notices).toContain("chapter-ambiguous");
    expect(amb.hits.map((h) => h.url)).toEqual(expect.arrayContaining(["/schooling/cbse/class-10/english/a-letter-to-god-jeff1", "/schooling/cbse/class-10/english/a-triumph-of-surgery"]));
    const cum = res("class 11 physics chapter 9");
    expect(cum.outcome).toBe("list");
    expect(cum.notices).toContain("no-page-for-intent");
    expect(cum.hits.map((h) => h.url)).toContain("/schooling/cbse/class-11/physics/mechanical-properties-of-fluids");
  });

  it("a subject the class does not teach lists the class and the nearest subject", () => {
    const r = res("class 6 physics");
    expect(r.outcome).toBe("list");
    expect(r.hits.map((h) => h.url)).toEqual(expect.arrayContaining(["/schooling/cbse/class-6", "/schooling/cbse/class-6/science"]));
  });
});

describe("no page fits, or a real doubt: the AI answers with real pages beside it", () => {
  it.each([
    ["what is photosynthesis", "/schooling/cbse/class-11/biology/photosynthesis-in-higher-plants"],
    ["tspsc group 2 age limit", "/exams/TS_TSPSC_GROUP2"],
    ["uksssc kanishk sayhak", "/exams/UK_UKSSSC"],
    ["uttrakhand sub inspector", "/exams/state/uttarakhand"],
  ])("%s → ai, recommending %s", (q, url) => {
    const r = res(q);
    expect(r.outcome).toBe("ai");
    expect(r.best).toBeNull();
    expect(r.recommended.map((h) => h.url)).toContain(url);
  });

  it.each(["i am 26 years old", "bank of baroda lbo", "what model of llm are you!?", "lab assistant"])("%s → ai", (q) => {
    expect(res(q).outcome).toBe("ai");
  });

  it("a greeting or an empty box asks nothing of the AI", () => {
    for (const q of ["", "   ", "hi", "hello", "please"]) expect(res(q).outcome).toBe("list");
  });

  it("an exam question answered by a page is not a doubt (salary block present); without the block it is", () => {
    expect(res("what is the starting salary in ssc cgl posts?").outcome).toBe("direct");
    const facts = deep.exams.TS_TSPSC_GROUP2;
    expect(facts.deep.eligibility).toBe(false);
    expect(res("tspsc group 2 age limit").outcome).toBe("ai");
  });
});

// ── 2. The logged misroutes stay fixed ───────────────────────────────────

describe("the old exam-only matchers' misroutes (Ask log, 26 Sep 2026)", () => {
  it("appsc group 2 → APPSC Group II, not AP AMVI / Punjab PCS", () => {
    expect(res("appsc group 2").best?.url).toBe("/exams/AP_APPSC_GROUP2");
    expect(res("groups appsc").hits[0].url).toMatch(/^\/exams\/AP_APPSC_GROUP/);
  });
  it("uksssc junior assistant → UKSSSC, not TS / TN Group 4", () => {
    expect(res("uksssc junior assistant").best?.url).toBe("/exams/UK_UKSSSC");
  });
  it("mp esb group 2 → MPESB, not the AP / TS / TN Group 2", () => {
    expect(res("mp esb group 2").best?.url).toBe("/exams/MP_MPESB");
    expect(res("mpesb group 2 or 4").best?.url).toBe("/exams/MP_MPESB");
  });
  it("class 11 physics never goes to the NSEP olympiad", () => {
    const r = res("class 11 physics");
    expect(r.best?.url).not.toMatch(/NSEP/);
  });
  it("iit madras placements never goes to JEE", () => {
    expect(res("iit madras placements").best?.url).toBe("/colleges/iit-madras");
  });
  it("ssc cgl in hindi never adds NSEP ('in' is not a word of the exam)", () => {
    const r = res("ssc cgl in hindi");
    expect(r.parsed.langRequest).toBe("hi");
    expect(r.hits.map((h) => h.url).join(" ")).not.toMatch(/NSEP/);
  });
  it("sign up stays two words — 'up' is Uttar Pradesh only beside a role word", () => {
    expect(parseQuery("sign up").state).toBeNull();
    expect(parseQuery("up police").state).toBe("UP");
    expect(parseQuery("primary teacher ka test dijiye").state).toBeNull();
  });
});

describe("every query students typed (Ask log + search-miss log)", () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, "tests/fixtures/search-real-queries.json"), "utf8")) as {
    rows: { q: string; src: string; outcome: "direct" | "list" | "ai"; url?: string }[];
  };

  it("no wrong DIRECT, and at least 85% agree with the reviewed outcome", () => {
    let agree = 0;
    const wrongDirect: string[] = [];
    for (const row of fixture.rows) {
      const r = res(row.q);
      const want = reviewedUrl(row.url);
      if (r.outcome === "direct" && (row.outcome !== "direct" || r.best?.url !== want)) wrongDirect.push(`${row.q} → ${r.best?.url} (expected ${row.outcome} ${row.url ?? ""})`);
      if (r.outcome === row.outcome && (row.outcome !== "direct" || r.best?.url === want)) agree++;
    }
    expect(wrongDirect).toEqual([]);
    expect(agree / fixture.rows.length).toBeGreaterThanOrEqual(0.85);
    expect(fixture.rows.length).toBeGreaterThanOrEqual(200);
  });
});

// ── 3. Honesty: every URL is a page that renders ─────────────────────────

describe("honest URLs", () => {
  const queries = [
    ...DIRECT.map(([q]) => q),
    ...(JSON.parse(fs.readFileSync(path.join(ROOT, "tests/fixtures/search-real-queries.json"), "utf8")).rows as { q: string }[]).map((r) => r.q),
    "class 10 english chapter 1", "class 6 physics", "phd", "scholarship for girls", "colleges in karnataka",
  ];

  it("every URL any resolution emits (best, rows, quick links, AI pages, fallback) is a real page", () => {
    const seen = new Set<string>();
    for (const q of queries) for (const locale of ["en", "hi"] as const) for (const u of urlsOf(res(q, { pageLocale: locale }))) seen.add(u);
    for (const u of seen) assertHonestUrl(u, "resolution");
  });

  it("every page in the index is a real route and never a private one", () => {
    const paths = new Set(deep.docs.map((d) => d.path));
    for (const p of paths) assertHonestUrl(p, "index doc");
    for (const l of SEARCH_LANDINGS) expect(routeExists(l.path), l.path).toBe(true);
  });

  it("exam sub-pages only where their page renders (gates, PYQ years, deep blocks)", () => {
    const facts = deep.exams;
    const noCutoff = Object.entries(facts).find(([, f]) => !f.gates.cutoff)?.[0];
    expect(noCutoff, "the snapshot has an exam without a cutoff page").toBeTruthy();
    const t = examIntentUrl(noCutoff!, "cutoff", facts[noCutoff!]);
    expect(t.downgraded).toBe(true);
    expect(t.url).toBe(`/exams/${noCutoff}`);
    expect(t.notice).toBe("no-page-for-intent");
    const cgl = facts.SSC_CGL;
    expect(examIntentUrl("SSC_CGL", "pyq", cgl, 2024).url).toBe("/exams/SSC_CGL/pyq/2024");
    expect(examIntentUrl("SSC_CGL", "pyq", cgl, 2019)).toMatchObject({ url: "/exams/SSC_CGL#pyqs", downgraded: true });
    expect(examIntentUrl("SSC_CGL", "pyq", cgl)).toMatchObject({ url: "/exams/SSC_CGL#pyqs", downgraded: false });
    expect(examIntentUrl("SSC_CGL", "salary", cgl).url).toBe("/exams/SSC_CGL#salary");
    expect(examIntentUrl("SSC_CGL", "build-mock", cgl)).toMatchObject({ url: "/exams/SSC_CGL/build-mock", status: "sign-in" });
    expect(examIntentUrl("X_UNKNOWN", "syllabus", undefined)).toMatchObject({ url: "/exams/X_UNKNOWN", downgraded: true });
    // A downgraded intent is never a direct open.
    const r = res(`${deep.docs.find((d) => d.examCode === noCutoff)!.title} cutoff`);
    expect(r.outcome).not.toBe("direct");
  });

  it("knownUrl accepts only pages the index vouches for — and no open redirect", () => {
    expect(knownUrl("https://shishya.in/exams/SSC_CGL/cutoff", deep)).toBe("/exams/SSC_CGL/cutoff");
    expect(knownUrl("/hi/exams/ssc_cgl", deep)).toBe("/exams/SSC_CGL");
    expect(knownUrl("/exams/SSC_CGL/pyq/2024", deep)).toBe("/exams/SSC_CGL/pyq/2024");
    expect(knownUrl("/exams/SSC_CGL/pyq/1999", deep)).toBeNull();
    expect(knownUrl("/exams/SSC_CGL/topics/NOT_A_TOPIC", deep)).toBeNull();
    expect(knownUrl("/exams/NOT_AN_EXAM", deep)).toBeNull();
    expect(knownUrl("/schooling/cbse/class-9/science/tissues-in-action", deep)).toBe("/schooling/cbse/class-9/science/tissues-in-action");
    expect(knownUrl("/exams/SSC_CGL/build-mock?pyq=1", deep)).toBe("/exams/SSC_CGL/build-mock?pyq=1");
    for (const bad of ["//evil.example/x", "/\\evil.example", "https://evil.example/exams/SSC_CGL", "javascript:alert(1)", "/exams/SSC_CGL\"><script>"]) {
      expect(knownUrl(bad, deep), bad).toBeNull();
      expect(isSafePath(bad), bad).toBe(false);
    }
  });

  it("a pasted Shishya URL opens only a page the index knows", () => {
    expect(res("https://shishya.in/exams/mp_mpesb/pyq/2024").best?.url).toBe("/exams/MP_MPESB/pyq/2024");
    expect(res("https://shishya.in/exams/NOT_REAL").outcome).not.toBe("direct");
  });
});

// ── 4. The AI never runs where it must not ───────────────────────────────

describe("AI guard rails in the resolver", () => {
  it("Class 1-7 never gets outcome ai — a list with no-ai-young-class", () => {
    for (const q of ["class 6 science what is a magnet explain", "कक्षा 5 गणित समझाओ", "class 3 evs explain plants", "class 7 maths chapter 2 solve"]) {
      const r = res(q);
      expect(r.schoolScope, q).toBe("class1to7");
      expect(r.outcome, q).not.toBe("ai");
      if (r.outcome === "list") expect(r.notices, q).toContain("no-ai-young-class");
    }
  });

  it("Class 8-12 doubts reach the AI in route-only mode", () => {
    const r = res("class 9 science explain tissues");
    expect(r.outcome).toBe("ai");
    expect(r.schoolScope).toBe("class8to12");
    expect(r.notices).toContain("school-route-only");
  });

  it("while typing nothing opens by itself, and a half-typed word is not held against the pages", () => {
    for (const q of ["ssc cgl", "class 9 science chapter 3", "iit madras cse", "neet sy", "ssc cg"]) expect(res(q, { typing: true }).outcome, q).not.toBe("direct");
    expect(res("ssc cg", { typing: true }).hits[0].url).toBe("/exams/SSC_CGL");
    expect(res("ssc cg", { typing: true }).parsed.state).toBeNull();
    expect(res("neet sy", { typing: true }).hits[0].url).toBe("/exams/NEET_UG");
  });

  it("the strip's rotating examples (en / hi / te) resolve as promised — never to the AI", () => {
    for (const locale of ["en", "hi", "te"] as const) {
      for (const ex of searchCopy(locale).placeholder) {
        const r = res(ex.text, { pageLocale: locale });
        expect(r.outcome, `${locale}: ${ex.text}`).toBe(ex.expect);
        expect(r.outcome).not.toBe("ai");
      }
      for (const d of searchCopy(locale).directory) for (const ex of d.examples) expect(res(ex, { pageLocale: locale }).outcome, ex).toBe("direct");
    }
  });
});

// ── 5. The parts ─────────────────────────────────────────────────────────

describe("normaliser and parser", () => {
  it("folds case, Indic digits, roman numerals after numbering words, and joined numbers", () => {
    expect(normaliseQuery("APPSC Group-II").norm).toBe("appsc group 2");
    expect(normaliseQuery("कक्षा १०").norm).toBe("कक्षा 10");
    expect(normaliseQuery("class10 ch3").norm).toBe("class 10 ch 3");
    expect(normaliseQuery("i want group2").norm).toBe("i want group 2");
    expect(normaliseQuery("B.Tech in U.P.").norm).toBe("btech in up");
    expect(normaliseQuery("10+2 pass").norm).toBe("12th pass");
    expect(normaliseQuery("తెలంగాణ").script).toBe("telu");
    expect(normaliseQuery("एसएससी").script).toBe("deva");
  });

  it("reads slots: class, chapter, qualifier, year, intent, state, language", () => {
    const p = parseQuery("10th maths chapter 3");
    expect([p.cls, p.subject, p.chapterNo]).toEqual([10, "mathematics", 3]);
    expect(parseQuery("jobs after 12th").stage).toBe("after-12");
    expect(parseQuery("12th pass").cls).toBeNull();
    expect(parseQuery("second puc physics").cls).toBe(12);
    const q = parseQuery("appsc group 2 pyq 2024");
    expect([q.intent, q.year, q.hard.join(" ")]).toEqual(["pyq", 2024, "appsc group 2"]);
    expect(parseQuery("ssc cgl hall ticket").dateKind).toBe("ADMIT_CARD");
    expect(parseQuery("telugu lo ts police").langRequest).toBe("te");
    expect(parseQuery("హిందీ").langRequest).toBeNull();
    expect(parseQuery("what is photosynthesis").doubtVerb).toBe(true);
    expect(parseQuery("physics").subject).toBeNull(); // no school cue: stays a search word
  });

  it("the letter-name decoder accepts only whole words that the index already holds", () => {
    const vocab = new Set(["ssc", "cgl", "upsc", "tspsc", "ctet"]);
    expect(decodeLetterNames("एसएससी", vocab)).toBe("ssc");
    expect(decodeLetterNames("सीजीएल", vocab)).toBe("cgl");
    expect(decodeLetterNames("यूपीएससी", vocab)).toBe("upsc");
    expect(decodeLetterNames("టీఎస్పీఎస్సీ", vocab)).toBe("tspsc");
    expect(decodeLetterNames("सीटीईटी", vocab)).toBe("ctet");
    expect(decodeLetterNames("एसएससी", new Set(["cgl"]))).toBeNull(); // decodes, but not an index word
    expect(decodeLetterNames("पुलिस", vocab)).toBeNull(); // not letter names
    expect(decodeLetterNames("ए", vocab)).toBeNull(); // one letter
  });

  it("a cross-script CANON word is never a word of a lexicon phrase (it would be rewritten before the phrase is read)", async () => {
    const L = await import("@/lib/search/lexicon");
    const canon = new Set(Object.keys(L.CANON).map((k) => normaliseQuery(k).norm));
    const phrases = [...L.LANG_REQUEST, ...L.CLASS_PHRASES, ...L.BOARD_PHRASES, ...L.SUBJECT_PHRASES, ...L.INTENT_PHRASES, ...L.SECTION_PHRASES, ...L.STAGE_PHRASES].map(([p]) => p);
    for (const p of phrases) {
      const toks = normaliseQuery(p).tokens;
      if (toks.length < 1) continue;
      for (const w of toks) expect(canon.has(w), `"${p}" contains CANON word "${w}"`).toBe(false);
    }
  });

  it("each canonical school subject lands on a real subject of the spine", () => {
    const subjects = new Set(fixtureInputs().school.classes.flatMap((c) => c.subjects.map((s) => normaliseQuery(s.name).norm)));
    for (const [canon, targets] of Object.entries(SUBJECT_TARGETS)) {
      const hit = targets.some((t) => [...subjects].some((s) => s === t || s.startsWith(`${t} `)));
      expect(hit, `${canon} → ${targets.join(" | ")}`).toBe(true);
    }
  });
});

describe("locale twins", () => {
  it("the TWIN_PUBLIC_RE copy equals the middleware's", () => {
    const src = fs.readFileSync(path.join(ROOT, "src/middleware.ts"), "utf8");
    const m = /const TWIN_PUBLIC_RE =\s*(\/\^.*\/);/.exec(src);
    expect(m, "TWIN_PUBLIC_RE in src/middleware.ts").toBeTruthy();
    expect(TWIN_PUBLIC_RE.source).toBe(new RegExp(m![1].slice(1, -1)).source);
  });

  it("the /hi and /te prefix goes only on pages that have a twin", () => {
    expect(localeTarget("/exams/SSC_CGL/cutoff", "hi")).toBe("/hi/exams/SSC_CGL/cutoff");
    expect(localeTarget("/current-affairs", "te")).toBe("/te/current-affairs");
    expect(localeTarget("/schooling/cbse/class-9", "hi")).toBe("/schooling/cbse/class-9");
    expect(localeTarget("/colleges/iit-madras", "te")).toBe("/colleges/iit-madras");
    expect(localeTarget("/", "hi")).toBe("/hi");
    // The query's script never switches the locale; the page the search started on does.
    expect(res("एसएससी सीजीएल कटऑफ").best?.url).toBe("/exams/SSC_CGL/cutoff");
    expect(res("एसएससी सीजीएल कटऑफ", { pageLocale: "hi" }).best?.url).toBe("/hi/exams/SSC_CGL/cutoff");
    expect(res("कक्षा 6 गणित", { pageLocale: "hi" }).best?.url).toBe("/schooling/cbse/class-6/mathematics");
  });
});

describe("pure, portable modules", () => {
  it("the client-side search code imports no prisma, next or data loader", () => {
    const files = ["types", "normalize", "lexicon", "parse", "targets", "resolve", "index-codec", "labels", "landings"];
    for (const f of files) {
      const src = fs.readFileSync(path.join(ROOT, `src/lib/search/${f}.ts`), "utf8");
      const imports = [...src.matchAll(/^import\s+(?!type\b)[^;]*?from\s+"([^"]+)"/gm)].map((m) => m[1]);
      for (const i of imports) {
        expect(i, `${f}.ts imports ${i}`).not.toMatch(/prisma|^next(\/|$)|server-only|db\/|exam-page-gates|school\/surface|school\/db/);
      }
      expect(src, `${f}.ts calls fetch`).not.toMatch(/\bfetch\(/);
      // The query is data: no RegExp is ever built from it (only from the normaliser's constant word list).
      for (const line of src.split("\n").filter((l) => l.includes("new RegExp("))) {
        expect(f === "normalize" && line.includes("NUMBERED_WORDS"), `${f}.ts: ${line.trim()}`).toBe(true);
      }
    }
  });

  it("the server loader is the only search module that reads the DB, and uses the real-exam scope", () => {
    const src = fs.readFileSync(path.join(ROOT, "src/lib/search/index-build.ts"), "utf8");
    expect(src).toMatch(/^import "server-only";/m);
    expect(src).toMatch(/where: REAL_EXAM_WHERE/);
    expect((src.match(/\$\{REAL_EXAM_SQL\}/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(src).not.toMatch(/anthropic|runAsk|ask-engine/i);
  });
});

describe("wire codec and size", () => {
  const canon = (i: SearchIndex) =>
    [...i.docs]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((d) => JSON.stringify(Object.fromEntries(Object.entries({ ...d, terms: [...d.terms].sort() }).sort())));

  it("decodeIndex(encodeIndex(x)) is x, for both tiers", () => {
    for (const idx of [lite, deep]) {
      const back = decodeIndex(JSON.parse(JSON.stringify(encodeIndex(idx))));
      expect(canon(back)).toEqual(canon(idx));
      expect(back.exams).toEqual(idx.exams);
      expect(back.tier).toBe(idx.tier);
    }
  });

  it("the lite index the strip downloads stays small: ≤ 200 KB raw and ≤ 45 KB gzipped", () => {
    const wire = JSON.stringify(encodeIndex(lite));
    expect(wire.length).toBeLessThanOrEqual(200 * 1024);
    expect(zlib.gzipSync(wire).length).toBeLessThanOrEqual(45 * 1024);
    expect(lite.docs.some((d) => d.kind === "topic-note")).toBe(false);
    expect(lite.docs.filter((d) => d.kind === "school-chapter").length).toBe(deep.docs.filter((d) => d.kind === "school-chapter").length);
  });

  it("the client resolves the same pages as the server for what it holds", () => {
    const decoded = decodeIndex(JSON.parse(JSON.stringify(encodeIndex(lite))));
    for (const [q, url] of DIRECT.filter(([q]) => !/^https?:/.test(q))) {
      const r = resolveQuery(q, decoded);
      if (r.outcome === "direct") expect(r.best?.url, q).toBe(url);
    }
    expect(resolveQuery("class 9 science chapter 3", decoded).best?.url).toBe("/schooling/cbse/class-9/science/tissues-in-action");
    expect(resolveQuery("ssc cgl", decoded).needsServer).toBe(false);
    expect(resolveQuery("rrb je", decoded).needsServer).toBe(true);
    // The client has no topic-note pages: it lists, never claims "not in the catalogue", and the server opens the topic.
    const onClient = resolveQuery("ssc cgl algebra", decoded);
    expect(onClient.outcome).not.toBe("direct");
    expect(onClient.notices).not.toContain("not-in-catalogue");
    expect(onClient.needsServer).toBe(true);
  });

  it("with the DB down the index still builds from static data, every gate closed", () => {
    const idx = toLiteIndex(
      buildSearchIndex({ builtAt: "x", exams: [], gates: null, pyqYears: {}, topicNoteExams: [], topics: [], school: { classes: [] } }, "deep"),
    );
    expect(idx.docs.some((d) => d.kind === "college")).toBe(true);
    expect(resolveQuery("iit madras cse", idx).best?.url).toBe("/colleges/iit-madras/cse");
    expect(resolveQuery("how to become a pilot", idx).best?.url).toBe("/careers/commercial-pilot");
  });
});

describe("speed", () => {
  it("resolves in well under 10 ms a query over the deep index", () => {
    const qs = DIRECT.map(([q]) => q);
    res("warm up");
    const t0 = performance.now();
    for (let k = 0; k < 3; k++) for (const q of qs) res(q);
    const per = (performance.now() - t0) / (3 * qs.length);
    expect(per).toBeLessThan(10);
  });
});

// ── 6. Discoverability G2 fixes (26 Sep 2026) ────────────────────────────

describe("G2: the resolver opens the right page", () => {
  const withCapsules = buildSearchIndex({ ...fixtureInputs(), capsuleMonths: ["2025-09", "2026-07", "2026-08", "2026-09", "bad", "2026-13"] }, "deep");
  const withCapsulesLite = toLiteIndex(withCapsules);
  const capsulePaths = (i: SearchIndex) => i.docs.filter((d) => d.path.startsWith("/current-affairs/capsule/")).map((d) => [d.path, d.title]);

  it("(a) a family acronym + qualifier the catalogue lacks never direct-opens a partial-token match", () => {
    for (const idx of [deep, lite]) {
      for (const q of ["cuet pg", "cuet pg 2025", "CUET PG"]) {
        const r = resolveQuery(q, idx);
        expect(r.outcome, q).toBe("list");
        expect(r.best, q).toBeNull();
      }
    }
    const d = res("cuet pg");
    expect(d.notices).toContain("not-in-catalogue");
    expect(d.logMiss).toBe(true);
    // Still opens where the top exam owns a typed word, or the name is its own.
    expect(res("delhi police ssc").best?.url).toBe("/exams/DL_POLICE_PC");
    expect(res("cuet ug").best?.url).toBe("/exams/CUET_UG");
    expect(res("neet pg").best?.url).toBe("/exams/NEET_PG");
    expect(res("upcet").best?.url).toBe("/exams/UP_UPCET");
  });

  it("(b) a scholarship word + a class opens the scholarships, not the school class page", () => {
    for (const idx of [deep, lite]) {
      for (const q of ["scholarship for class 10 students", "class 10 scholarship", "scholarships for class 12", "class 9 scholarships", "scholarship for class 5"]) {
        const r = resolveQuery(q, idx);
        expect(r.outcome, q).toBe("direct");
        expect(r.best?.url, q).toBe("/scholarships");
        expect(r.hits.some((h) => h.url.startsWith("/schooling")), q).toBe(false);
      }
    }
    // The rows under it are schemes whose own levels cover that class.
    const levels = new Map(deep.docs.filter((d) => d.kind === "scholarship").map((d) => [d.path, d.scholarship?.levels ?? []]));
    const rows = res("scholarship for class 10 students").hits.filter((h) => h.kind === "scholarship");
    expect(rows.length).toBeGreaterThan(0);
    for (const h of rows) expect(levels.get(h.url), h.url).toContain("CLASS_9_10");
    // A school subject is still a school ask; girls-only filters still list the matcher first.
    expect(res("class 10 science").best?.url).toBe("/schooling/cbse/class-10/science");
    expect(res("scholarship for girls").hits[0].url).toBe("/scholarships/match");
  });

  it("(c) current affairs today and the exam calendar open their pages", () => {
    for (const idx of [deep, lite, withCapsules, withCapsulesLite]) {
      for (const q of ["current affairs today", "today current affairs", "today's current affairs", "aaj ka current affairs"]) {
        const r = resolveQuery(q, idx);
        expect(r.outcome, q).toBe("direct");
        expect(r.best?.url, q).toBe("/current-affairs");
      }
      for (const q of ["upcoming government exams 2026", "upcoming govt exams", "exam calendar 2026", "upsc calendar 2026", "ssc calendar 2026", "ssc exam calendar", "upsc calendar"]) {
        const r = resolveQuery(q, idx);
        expect(r.outcome, q).toBe("direct");
        expect(r.best?.url, q).toBe("/exam-calendar");
      }
    }
    // Other words beside "calendar" are not a calendar ask.
    expect(res("class 4 calendar").best?.url ?? "").not.toBe("/exam-calendar");
  });

  it("(c) a month's capsule opens only when the index holds that month", () => {
    for (const idx of [withCapsules, withCapsulesLite]) {
      expect(resolveQuery("current affairs september 2026", idx).best?.url).toBe("/current-affairs/capsule/2026-09");
      expect(resolveQuery("september 2026 current affairs", idx).best?.url).toBe("/current-affairs/capsule/2026-09");
      expect(resolveQuery("current affairs capsule august 2026", idx).best?.url).toBe("/current-affairs/capsule/2026-08");
      expect(resolveQuery("current affairs sept 2025", idx).best?.url).toBe("/current-affairs/capsule/2025-09");
      // No year: the latest capsule of that month.
      expect(resolveQuery("current affairs september", idx).best?.url).toBe("/current-affairs/capsule/2026-09");
      // A month with no capsule is never opened as the daily page.
      expect(resolveQuery("current affairs may 2026", idx).outcome).not.toBe("direct");
    }
    // The fixture index has no capsule months (as production until the loader passes them): no capsule URL is ever made up.
    for (const q of ["current affairs september 2026", "current affairs may 2026"]) {
      const r = res(q);
      expect(r.outcome, q).not.toBe("direct");
      for (const u of urlsOf(r)) expect(u, q).not.toContain("/capsule/");
    }
    // Only well-formed months become pages; each is a real route; the wire codec round-trips them.
    expect(capsulePaths(withCapsules).map(([p]) => p)).toEqual([
      "/current-affairs/capsule/2025-09",
      "/current-affairs/capsule/2026-07",
      "/current-affairs/capsule/2026-08",
      "/current-affairs/capsule/2026-09",
    ]);
    for (const [p] of capsulePaths(withCapsules)) assertHonestUrl(p, "capsule doc");
    const back = decodeIndex(JSON.parse(JSON.stringify(encodeIndex(withCapsulesLite))));
    expect(capsulePaths(back)).toEqual(capsulePaths(withCapsulesLite));
  });

  it("(d) an exact career name beats careers that share one of its words", () => {
    for (const idx of [deep, lite]) {
      for (const q of ["data scientist career", "data scientist"]) {
        const r = resolveQuery(q, idx);
        expect(r.outcome, q).toBe("direct");
        expect(r.best?.url, q).toBe("/careers/data-scientist");
      }
    }
  });

  it("(e) PYQ asks land on the hub's #pyqs, never on the /pyq redirect", () => {
    expect(res("pyqs of tspsc group 1").best?.url).toBe("/exams/TS_TSPSC_GROUP1#pyqs");
    expect(res("ssc cgl pyq").best?.url).toBe("/exams/SSC_CGL#pyqs");
    for (const q of ["ssc cgl pyq", "mpesb pyqs", "ssc cgl previous papers", "ssc cgl 2019 paper", "pyqs of tspsc group 1"]) {
      for (const u of urlsOf(res(q))) expect(u.split("#")[0].endsWith("/pyq"), `${q}: ${u}`).toBe(false);
    }
    expect(res("https://shishya.in/exams/ssc_cgl/pyq").best?.url).toBe("/exams/SSC_CGL#pyqs");
  });

  it("pasted links are read in the middleware's canonical form", () => {
    expect(res("https://shishya.in/exams/neet").best?.url).toBe("/exams/NEET_UG");
    expect(res("https://shishya.in/exams/entrance").best?.url).toBe("/exams/entrance");
    expect(res("shishya.in/schooling/cbse/10").best?.url).toBe("/schooling/cbse/class-10");
  });

  it("the Entrance section has its own hub: its landing and its fallback", () => {
    expect(res("entrance exams").best?.url).toBe("/exams/entrance");
    expect(res("entrance exams in india").best?.url).toBe("/exams/entrance");
    expect(res("jee").fallback.url).toBe("/exams/entrance");
  });
});
