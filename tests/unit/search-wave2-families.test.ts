// Search opens the organic wave 2 page families (27 Sep 2026, wave 2 search).
//
// Wave 2 (a685688) added pages built for how Indian students search — the
// exam category hubs, "exams after {level}", CBSE's board-exam hubs, the
// subject hubs, the scholarship lists and /mock-tests — and the search knew
// none of them: "banking" opened the robots-blocked
// /exams/browse?category=BANKING. This pins, on the browser's lite index and
// the server's deep index built from the committed snapshots
// (tests/fixtures/search-index-fixture.ts):
//   1. the words students type for each family open its page (English,
//      romanised Hindi, Devanagari, Telugu);
//   2. each family's search pages are exactly its own route list — the live
//      category hubs, the published levels, the hubs the data file holds, the
//      subject hubs that render, every scholarship list — each a page.tsx;
//   3. no page a typed search can open is one robots.txt keeps crawlers out
//      of, beyond the two kinds named (sign-in, and a category filter no live
//      hub covers) — the real robots() rules through tests/fixtures/robots-eval.ts;
//   4. with the DB down (no hub inputs) nothing is made up;
//   5. the lexicon's tables name only real slugs.
// No DB, no network, no model. Run: npx vitest run tests/unit/search-wave2-families.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import { fixtureIndex, fixtureInputs } from "../fixtures/search-index-fixture";
import { allowed, type Rule } from "../fixtures/robots-eval";
import { resolveQuery } from "@/lib/search/resolve";
import { parseQuery } from "@/lib/search/parse";
import { knownUrl } from "@/lib/search/targets";
import { CATEGORY_HUB, buildSearchIndex, toLiteIndex } from "@/lib/search/index-core";
import { SEARCH_LANDINGS } from "@/lib/search/landings";
import {
  SCHOLARSHIP_LIST_BY_CATEGORIES,
  SCHOLARSHIP_LIST_BY_CLASS,
  SCHOLARSHIP_LIST_BY_GENDER,
  SCHOLARSHIP_LIST_BY_LEVEL,
  STAGE_LEVEL_SLUG,
} from "@/lib/search/lexicon";
import { EXAM_CATEGORIES, liveExamCategories } from "@/lib/exam-categories";
import { PUBLISHED_LEVELS } from "@/lib/exam-qualification";
import { BOARD_EXAM_HUBS } from "@/data/board-exams";
import { boardExamPath } from "@/lib/board-exams";
import { CLOSING_SOON_DAYS, SCHOLARSHIP_FILTERS } from "@/lib/scholarship-lists";
import { SUBJECT_HUBS, SUBJECT_HUB_ROOT, subjectHubPath } from "@/lib/subject-hubs";
import { MOCK_TESTS_PATH } from "@/lib/mock-catalogue";
import type { SearchIndex } from "@/lib/search/types";

const ROOT = process.cwd();
const deep = fixtureIndex("deep");
const lite = fixtureIndex("lite");
const TIERS = [["deep", deep], ["lite", lite]] as const;

/** A path with a page.tsx under src/app (route groups and dynamic segments followed). */
function routeExists(href: string): boolean {
  const segs = href.split(/[?#]/)[0].split("/").filter(Boolean);
  const expand = (dir: string): string[] => [
    dir,
    ...fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && /^\(.+\)$/.test(e.name))
      .flatMap((e) => expand(path.join(dir, e.name))),
  ];
  let dirs = expand(path.join(ROOT, "src/app"));
  for (const seg of segs) {
    dirs = dirs.flatMap((d) =>
      fs
        .readdirSync(d, { withFileTypes: true })
        .filter((e) => e.isDirectory() && (e.name === seg || /^\[.+\]$/.test(e.name)))
        .flatMap((e) => expand(path.join(d, e.name))),
    );
    if (dirs.length === 0) return false;
  }
  return dirs.some((d) => fs.existsSync(path.join(d, "page.tsx")));
}

const docPaths = (idx: SearchIndex, re: RegExp) =>
  idx.docs
    .filter((d) => re.test(d.path))
    .map((d) => d.path)
    .sort();

// ── 1. The words students type open the family's page ────────────────────

const QUERIES: [q: string, url: string][] = [
  // Exam category hubs (the covered filters' own words moved to their hub).
  ["banking", "/exams/category/banking"],
  ["bank exams", "/exams/category/banking"],
  ["banking exams in india", "/exams/category/banking"],
  ["बैंक परीक्षा", "/exams/category/banking"],
  ["police exams", "/exams/category/police"],
  ["पुलिस भर्ती", "/exams/category/police"],
  ["teaching exams", "/exams/category/teaching"],
  ["teacher", "/exams/category/teaching"],
  ["primary teacher ka test dijiye", "/exams/category/teaching"],
  ["state psc", "/exams/category/state-psc"],
  ["state psc exams", "/exams/category/state-psc"],
  ["engineering entrance exams", "/exams/category/engineering-entrance"],
  ["law entrance exams", "/exams/category/law-entrance"],
  // The free mock-test catalogue.
  ["free mock test", "/mock-tests"],
  ["mock tests", "/mock-tests"],
  ["online mock test", "/mock-tests"],
  ["मॉक टेस्ट", "/mock-tests"],
  ["మాక్ టెస్ట్", "/mock-tests"],
  // Exams after a qualification.
  ["exams after 12th", "/exams/after/12th"],
  ["exams after 10th", "/exams/after/10th"],
  ["exams after graduation", "/exams/after/graduation"],
  ["exams after iti", "/exams/after/diploma-iti"],
  ["12th ke baad exam", "/exams/after/12th"],
  ["12th pass exams", "/exams/after/12th"],
  ["government exams after 12th", "/exams/after/12th"],
  ["entrance exams after 12th", "/exams/after/12th"],
  ["12वीं के बाद परीक्षा", "/exams/after/12th"],
  ["ఇంటర్ తర్వాత పరీక్షలు", "/exams/after/12th"],
  // 27 Sep 2026 (wave 2 fixer): a government word, the student's stream or a Hinglish "kaun sa"
  // beside the named stage — these listed the GOVT_JOBS filter, the General Science hub, or asked the AI.
  ["graduation ke baad government exam", "/exams/after/graduation"],
  ["competitive exams after 12th science", "/exams/after/12th"],
  ["exams after 12th science", "/exams/after/12th"],
  ["10th ke baad kaun sa exam de", "/exams/after/10th"],
  // CBSE's board-exam hubs.
  ["cbse sample paper class 10", "/schooling/cbse/class-10/board-exam"],
  ["cbse class 12 sample paper", "/schooling/cbse/class-12/board-exam"],
  ["class 10 sample paper", "/schooling/cbse/class-10/board-exam"],
  ["class 12 board exam", "/schooling/cbse/class-12/board-exam"],
  ["सीबीएसई कक्षा 10 सैंपल पेपर", "/schooling/cbse/class-10/board-exam"],
  // Subject hubs.
  ["reasoning questions", "/subjects/reasoning"],
  ["reasoning", "/subjects/reasoning"],
  ["रीजनिंग", "/subjects/reasoning"],
  ["quantitative aptitude", "/subjects/quantitative-aptitude"],
  ["gk questions", "/subjects/general-awareness"],
  ["child development and pedagogy", "/subjects/child-development-pedagogy"],
  ["बाल विकास", "/subjects/child-development-pedagogy"],
  // Scholarship lists (the real slugs: girls, sc-st-obc, minority, class-9-10, class-11-12, phd).
  ["scholarship for girls", "/scholarships/for/girls"],
  ["लड़कियों के लिए छात्रवृत्ति", "/scholarships/for/girls"],
  ["sc st scholarship", "/scholarships/for/sc-st-obc"],
  ["minority scholarship", "/scholarships/for/minority"],
  ["phd scholarship", "/scholarships/for/phd"],
  ["scholarship for class 10 students", "/scholarships/for/class-9-10"],
  ["scholarships closing soon", "/scholarships/closing-soon"],
];

describe("1. the words students type open the family's page", () => {
  it.each(QUERIES)("%s → %s (lite and deep)", (q, url) => {
    for (const [tier, idx] of TIERS) {
      const r = resolveQuery(q, idx);
      expect(r.outcome, `${tier}: ${q}`).toBe("direct");
      expect(r.best?.url, `${tier}: ${q}`).toBe(url);
    }
  });

  it("pins at least 30 queries, with Hindi and Telugu among them", () => {
    expect(QUERIES.length).toBeGreaterThanOrEqual(30);
    expect(QUERIES.filter(([q]) => /[ऀ-ॿ]/.test(q)).length).toBeGreaterThanOrEqual(5);
    expect(QUERIES.filter(([q]) => /[ఀ-౿]/.test(q)).length).toBeGreaterThanOrEqual(2);
  });

  it("a pasted link to a family page opens it; a hub that does not render is never opened", () => {
    for (const [tier, idx] of TIERS) {
      for (const [q, url] of [
        ["https://shishya.in/exams/category/banking", "/exams/category/banking"],
        ["shishya.in/exams/after/12th", "/exams/after/12th"],
        ["https://shishya.in/mock-tests", "/mock-tests"],
        ["https://shishya.in/subjects/reasoning", "/subjects/reasoning"],
        ["https://shishya.in/scholarships/for/girls", "/scholarships/for/girls"],
        ["https://shishya.in/schooling/cbse/class-10/board-exam", "/schooling/cbse/class-10/board-exam"],
      ]) {
        const r = resolveQuery(q, idx);
        expect(r.outcome, `${tier}: ${q}`).toBe("direct");
        expect(r.best?.url, `${tier}: ${q}`).toBe(url);
      }
      const live = new Set<string>(liveExamCategories(fixtureInputs().exams).map((c) => c.slug));
      const dead = EXAM_CATEGORIES.find((c) => !live.has(c.slug))!;
      expect(resolveQuery(`https://shishya.in/exams/category/${dead.slug}`, idx).best?.url ?? "").not.toContain(`/exams/category/${dead.slug}`);
    }
  });

  // 27 Sep 2026 (wave 2 fixer): "cbse sample paper" (the largest ask this family exists for),
  // "cbse sample papers", "cbse model paper" and "cbse sample paper 2027" opened Class 10's hub.
  it("a board-exam ask with no class named: both hubs lead a list, in class order", () => {
    for (const [tier, idx] of TIERS) {
      for (const q of ["cbse date sheet 2027", "cbse marking scheme", "cbse board exam 2027", "cbse sample paper", "cbse sample papers", "cbse model paper", "cbse sample paper 2027"]) {
        const r = resolveQuery(q, idx);
        expect(r.outcome, `${tier}: ${q}`).toBe("list");
        expect(r.hits.slice(0, 2).map((h) => h.url), `${tier}: ${q}`).toEqual(["/schooling/cbse/class-10/board-exam", "/schooling/cbse/class-12/board-exam"]);
      }
    }
  });

  // 27 Sep 2026 (wave 2 fixer): these opened (or led with) CBSE's board-exam hub; each was a list with
  // the exam's own row before wave 2, and is again.
  it("an exam named beside a class or CBSE is that exam's ask, never CBSE's board-exam hub", () => {
    for (const [tier, idx] of TIERS) {
      for (const q of [
        "neet pyq class 12", "jee main class 12 pyq", "cuet class 12 previous year paper", "ntse class 10 previous year paper",
        "class 12 neet sample paper", "cbse ctet sample paper", "cbse ugc net sample paper",
      ]) {
        const r = resolveQuery(q, idx);
        expect(r.outcome, `${tier}: ${q}`).not.toBe("direct");
        for (const u of r.hits.map((h) => h.url)) expect(u, `${tier}: ${q}`).not.toMatch(/\/board-exam$/);
      }
      expect(resolveQuery("neet pyq class 12", idx).hits.slice(0, 3).map((h) => h.url), tier).toContain("/exams/NEET_UG#pyqs");
      expect(resolveQuery("jee main class 12 pyq", idx).hits.slice(0, 3).map((h) => h.url), tier).toContain("/exams/JEE_MAIN#pyqs");
      expect(resolveQuery("cbse ctet sample paper", idx).hits.slice(0, 3).map((h) => h.url), tier).toContain("/exams/CTET#mocks");
    }
  });

  // 27 Sep 2026 (wave 2 fixer): a bare "10th" / "12th" beside an exam word is often the board exam
  // itself — these opened "Exams after 10th/12th" (government and entrance exams). They list, led by
  // CBSE's hub for that class, with the finder and the exams after that level as rows.
  it("a bare '12th exam' is a list — never the exams after 12th opened", () => {
    for (const [tier, idx] of TIERS) {
      for (const [q, n] of [["12th exam", 12], ["10th exam", 10], ["12th exam 2027", 12], ["10th pariksha", 10], ["12th ka exam", 12]] as const) {
        const r = resolveQuery(q, idx);
        expect(r.outcome, `${tier}: ${q}`).not.toBe("direct");
        const urls = r.hits.map((h) => h.url);
        expect(urls[0], `${tier}: ${q}`).toBe(`/schooling/cbse/class-${n}/board-exam`);
        expect(urls, `${tier}: ${q}`).toContain(`/exams/after/${n}th`);
      }
    }
    expect(parseQuery("12th exam").stageExplicit).toBe(false);
    for (const q of ["exams after 12th", "12th pass exams", "12th ke baad exam", "graduate level exams", "graduation ke baad government exam"]) {
      expect(parseQuery(q).stageExplicit, q).toBe(true);
    }
  });

  // 27 Sep 2026 (wave 2 fixer): a stream alone beside the stage asks what to study next — it listed
  // the Class 3-5 Arts and Class 6-8 Science pages first.
  it("'after 12th arts' lists the career pages, never a school subject page", () => {
    for (const [tier, idx] of TIERS) {
      for (const q of ["after 12th arts", "after 10th science", "after 12th commerce"]) {
        const r = resolveQuery(q, idx);
        expect(r.outcome, `${tier}: ${q}`).toBe("list");
        expect(r.hits[0]?.url, `${tier}: ${q}`).toBe("/careers");
        for (const h of r.hits) expect(h.url, `${tier}: ${q}`).not.toMatch(/^\/schooling\/cbse\/class-/);
      }
    }
  });

  it("never CBSE's hub for another board, a state board's class name or a subject", () => {
    for (const q of ["up board class 10 sample paper", "sslc sample paper", "icse class 10 sample paper", "cbse class 10 science sample paper"]) {
      for (const u of resolveQuery(q, deep).hits.map((h) => h.url)) expect(u, q).not.toMatch(/\/board-exam$/);
    }
  });

  it("a scholarship ask with a state lists the matcher and that state's schemes — never the state's exam page", () => {
    // It opened /exams/state/bihar before 27 Sep 2026; the lists are all-India, so none opens either.
    for (const [tier, idx] of TIERS) {
      for (const q of ["scholarship for girls in bihar", "bihar scholarship"]) {
        const r = resolveQuery(q, idx);
        expect(r.outcome, `${tier}: ${q}`).toBe("list");
        expect(r.hits[0].url, `${tier}: ${q}`).toBe("/scholarships/match");
        expect(r.hits.map((h) => h.url), `${tier}: ${q}`).not.toContain("/exams/state/bihar");
        expect(r.hits.some((h) => h.kind === "scholarship" && h.url.includes("bihar")), `${tier}: ${q}`).toBe(true);
      }
    }
  });

  it("what already worked still does: a state's police exam, the finder for a jobs ask, a bare 'after 12th' lists", () => {
    expect(resolveQuery("ap police", deep).best?.url).toBe("/exams/AP_POLICE_PC");
    expect(resolveQuery("bihar police", deep).best?.url).toBe("/exams/BR_POLICE_PC");
    expect(resolveQuery("govt jobs after 12th", deep).best?.url).toBe("/find-your-exam");
    expect(resolveQuery("govt jobs after 12th", deep).hits.map((h) => h.url)).toContain("/exams/after/12th");
    const after = resolveQuery("after 12th", deep);
    expect(after.outcome).toBe("list");
    expect(after.hits.map((h) => h.url)).toContain("/exams/after/12th");
    expect(resolveQuery("10वीं पास नौकरी", deep).hits[0].url).toBe("/find-your-exam");
    expect(resolveQuery("live test", deep).best?.url).toBe("/live-test");
    // 27 Sep 2026 (wave 2 fixer): the all-India mock is the scheduled live test (it listed only /mock-tests).
    for (const [tier, idx] of TIERS) {
      for (const q of ["all india mock test", "all india mock tests", "all india test series"]) expect(resolveQuery(q, idx).best?.url, `${tier}: ${q}`).toBe("/live-test");
    }
    // A bare practice word lists the mock-test catalogue first (was the live tests).
    expect(resolveQuery("practice", deep).hits[0].url).toBe("/mock-tests");
  });
});

// ── 2. Each family is exactly its own route list ─────────────────────────

describe("2. each family's search pages are its own route list, and each is a page", () => {
  const inputs = fixtureInputs();

  it("category hubs: exactly the categories whose hub renders on these exams", () => {
    const live = liveExamCategories(inputs.exams)
      .map((c) => `/exams/category/${c.slug}`)
      .sort();
    expect(live).toEqual(expect.arrayContaining(["/exams/category/banking", "/exams/category/police", "/exams/category/teaching", "/exams/category/state-psc"]));
    for (const [, idx] of TIERS) expect(docPaths(idx, /^\/exams\/category\//)).toEqual(live);
  });

  it("exams after a level: every published level, never the held one", () => {
    const want = PUBLISHED_LEVELS.map((l) => `/exams/after/${l.slug}`).sort();
    for (const [, idx] of TIERS) expect(docPaths(idx, /^\/exams\/after\//)).toEqual(want);
    expect(want).not.toContain("/exams/after/postgraduation");
  });

  it("board-exam hubs: one per hub the data file holds", () => {
    const want = BOARD_EXAM_HUBS.map(boardExamPath).sort();
    for (const [, idx] of TIERS) expect(docPaths(idx, /\/board-exam$/)).toEqual(want);
  });

  it("subject hubs: the ones that render on the 27 Sep 2026 data, and the /subjects index beside them", () => {
    const want = SUBJECT_HUBS.filter((d) => (inputs.subjectHubs ?? []).includes(d.slug)).map((d) => subjectHubPath(d.slug));
    expect(want.length).toBeGreaterThan(0);
    for (const [, idx] of TIERS) {
      expect(docPaths(idx, /^\/subjects\//)).toEqual([...want].sort());
      expect(idx.docs.some((d) => d.path === SUBJECT_HUB_ROOT)).toBe(true);
    }
  });

  it("scholarship lists: every filter, plus closing soon", () => {
    const want = [...SCHOLARSHIP_FILTERS.map((f) => `/scholarships/for/${f.slug}`), "/scholarships/closing-soon"].sort();
    for (const [, idx] of TIERS) expect(docPaths(idx, /^\/scholarships\/(for\/|closing-soon$)/)).toEqual(want);
  });

  it("the mock-test catalogue is a landing", () => {
    expect(SEARCH_LANDINGS.some((l) => l.path === MOCK_TESTS_PATH)).toBe(true);
  });

  it("every one of them is a page.tsx under src/app", () => {
    const fam = /^\/(exams\/(category|after)\/|subjects(\/|$)|scholarships\/(for\/|closing-soon$)|mock-tests$)|\/board-exam$/;
    const all = new Set(deep.docs.filter((d) => fam.test(d.path)).map((d) => d.path));
    expect(all.size).toBeGreaterThanOrEqual(20);
    for (const p of all) expect(routeExists(p), p).toBe(true);
  });

  it("titles and lines state no count; the closing-soon line takes its window from the list's own constant", () => {
    const noCount = /^\/(exams\/category\/|subjects(\/|$)|mock-tests$)/;
    for (const d of deep.docs.filter((x) => noCount.test(x.path))) expect(`${d.title} ${d.sub}`, d.path).not.toMatch(/\d/);
    // A list's title is its filter's own audience ("Class 9 and 10 Students" names classes, not a count).
    for (const f of SCHOLARSHIP_FILTERS) {
      const d = deep.docs.find((x) => x.path === `/scholarships/for/${f.slug}`);
      expect(d?.title).toBe(`Scholarships for ${f.audienceTitle}`);
      expect(d?.sub, f.slug).not.toMatch(/\d/);
    }
    expect(deep.docs.find((d) => d.path === "/scholarships/closing-soon")?.sub).toContain(`${CLOSING_SOON_DAYS} days`);
  });
});

// ── 3. robots.txt ────────────────────────────────────────────────────────

describe("3. no page a typed search opens is one robots.txt keeps crawlers out of", () => {
  const r = robots();
  const RULES = (Array.isArray(r.rules) ? r.rules : [r.rules]) as Rule[];
  const CRAWLERS = ["*", "Googlebot", "bingbot", "GPTBot", "OAI-SearchBot", "ClaudeBot", "PerplexityBot"];
  // /login: robots keeps crawlers off the sign-in flow, and a person typing "sign in" must still reach it.
  const PEOPLE_ONLY = new Set(["/login"]);
  const blocked = (p: string) => CRAWLERS.some((ua) => !allowed(RULES, ua, p));

  it("the evaluator reads the real rules: the category filter is blocked, its hub is not", () => {
    expect(blocked("/exams/browse?category=BANKING")).toBe(true);
    expect(blocked("/exams/category/banking")).toBe(false);
    expect(blocked("/login")).toBe(true);
  });

  it("every landing (both tiers, capsule months included) is open to every crawler, sign-in aside", () => {
    const withCapsules = buildSearchIndex({ ...fixtureInputs(), capsuleMonths: ["2026-08", "2026-09"] }, "deep");
    for (const idx of [deep, lite, withCapsules, toLiteIndex(withCapsules)]) {
      const bad = idx.docs.filter((d) => d.kind === "landing" && !PEOPLE_ONLY.has(d.path) && blocked(d.path.split("#")[0])).map((d) => d.path);
      expect(bad).toEqual([]);
    }
    for (const l of SEARCH_LANDINGS) if (!PEOPLE_ONLY.has(l.path)) expect(blocked(l.path), l.path).toBe(false);
  });

  it("the only blocked pages typed words can open are sign-in and category filters no live hub covers", () => {
    const hubs = new Set<string>(liveExamCategories(fixtureInputs().exams).map((c) => c.slug));
    for (const [tier, idx] of TIERS) {
      for (const d of idx.docs.filter((x) => x.terms.length > 0 && blocked(x.path.split("#")[0]))) {
        if (PEOPLE_ONLY.has(d.path)) continue;
        const cat = /^\/exams\/browse\?category=([A-Z_]+)$/.exec(d.path)?.[1];
        expect(cat, `${tier}: ${d.path}`).toBeDefined();
        expect(hubs.has(CATEGORY_HUB[cat ?? ""] ?? ""), `${tier}: ${d.path} is covered by a live hub`).toBe(false);
      }
      // A covered filter keeps no words: only a pasted or AI-written link reaches it.
      for (const cat of Object.keys(CATEGORY_HUB).filter((c) => hubs.has(CATEGORY_HUB[c]))) {
        const doc = idx.docs.find((d) => d.path === `/exams/browse?category=${cat}`);
        if (!doc) continue;
        expect(doc.terms, `${tier}: ${cat}`).toEqual([]);
        expect(knownUrl(`https://shishya.in/exams/browse?category=${cat}`, idx)).toBe(`/exams/browse?category=${cat}`);
      }
    }
  });
});

// ── 4. With the DB down nothing is made up ───────────────────────────────

describe("4. no hub inputs (the DB-down fallback): no hub page, the filter as before", () => {
  const rest = { ...fixtureInputs(), categoryHubs: undefined, subjectHubs: undefined };
  const noHubs = buildSearchIndex(rest, "deep");

  it("no category or subject hub, and the category words open the filter again", () => {
    expect(noHubs.docs.some((d) => d.path.startsWith("/exams/category/") || d.path.startsWith(SUBJECT_HUB_ROOT))).toBe(false);
    expect(resolveQuery("banking", noHubs).best?.url).toBe("/exams/browse?category=BANKING");
    expect(resolveQuery("reasoning questions", noHubs).best?.url ?? "").not.toMatch(/^\/subjects/);
    // The families that need no DB read are still there.
    expect(resolveQuery("exams after 12th", noHubs).best?.url).toBe("/exams/after/12th");
    expect(resolveQuery("scholarship for girls", noHubs).best?.url).toBe("/scholarships/for/girls");
  });

  it("a malformed hub slug from the loader never becomes a page", () => {
    const idx = buildSearchIndex(
      { ...rest, categoryHubs: [{ slug: "../admin", noun: "x" }, { slug: "Banking", noun: "banking exams" }], subjectHubs: ["not-a-hub"] },
      "deep",
    );
    expect(idx.docs.some((d) => d.path.startsWith("/exams/category/") || d.path.startsWith("/subjects/"))).toBe(false);
  });
});

// ── 5. The lexicon's tables name real slugs ──────────────────────────────

describe("5. the tables name only real pages", () => {
  it("stage → a published /exams/after level", () => {
    for (const slug of Object.values(STAGE_LEVEL_SLUG)) expect(PUBLISHED_LEVELS.map((l) => l.slug as string), slug).toContain(slug);
  });
  it("filters → a /scholarships/for list", () => {
    const slugs = SCHOLARSHIP_FILTERS.map((f) => f.slug as string);
    const named = [
      ...Object.values(SCHOLARSHIP_LIST_BY_GENDER),
      ...SCHOLARSHIP_LIST_BY_CATEGORIES.map(([, s]) => s),
      ...Object.values(SCHOLARSHIP_LIST_BY_LEVEL),
      ...Object.values(SCHOLARSHIP_LIST_BY_CLASS),
    ];
    for (const s of named) expect(slugs, s).toContain(s);
  });
  it("category → a defined hub", () => {
    for (const slug of Object.values(CATEGORY_HUB)) expect(EXAM_CATEGORIES.map((c) => c.slug as string), slug).toContain(slug);
  });
});
