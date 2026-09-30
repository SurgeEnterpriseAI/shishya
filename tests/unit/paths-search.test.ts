// Search opens the life-stage pages (30 Sep 2026, P1 build 1, spec §2.6):
// src/lib/search/{landings,index-core,resolve}.ts, the tutor's site map
// (src/lib/ai/site-facts.ts) and the school next steps
// (src/lib/section-related.ts). The index is the committed 26 Sep 2026
// snapshot built by the server's own builder (tests/fixtures/search-index-fixture.ts).
// No DB, no network, no model.
//
// Pinned: "after 10th", "after 12th", "MPC", "BiPC", "PCM" and their Hindi /
// Telugu forms open the right page; a life-stage page never takes a word
// another page already answers to (checked mechanically at build time); the
// nine option pages are deep-only (the strip's download cap) and still open
// through /ask; an exams ask stays with the exam pages.
// Run: npx vitest run tests/unit/paths-search.test.ts

import { describe, expect, it } from "vitest";
import { fixtureIndex } from "../fixtures/search-index-fixture";
import { STREAM_OPTIONS, STREAM_OPTION_SLUGS } from "@/data/paths";
import { PATH_SEARCH_TERMS } from "@/lib/paths/copy";
import { streamPagePath } from "@/lib/paths/index-helpers";
import { LIFE_STAGE_PATHS, demoteLifeStageCollisions } from "@/lib/search/index-core";
import { SEARCH_LANDINGS } from "@/lib/search/landings";
import { normaliseTerm } from "@/lib/search/normalize";
import { resolveQuery } from "@/lib/search/resolve";
import type { SearchDoc } from "@/lib/search/types";
import { SITE_FEATURE_PATHS, siteFeaturesBlock } from "@/lib/ai/site-facts";
import { schoolNextSteps } from "@/lib/section-related";

const deep = fixtureIndex("deep");
const lite = fixtureIndex("lite");
const TIERS = [["deep", deep], ["lite", lite]] as const;
const open = (q: string, idx = deep) => {
  const r = resolveQuery(q, idx);
  return r.outcome === "direct" ? r.best?.url : `(${r.outcome})`;
};

describe("the hubs open from the words students type", () => {
  it.each([
    ["after 10th", "/after-10th"],
    ["after class 10", "/after-10th"],
    ["what to do after 10th", "/after-10th"],
    ["10th ke baad kya kare", "/after-10th"],
    ["10वीं के बाद क्या करें", "/after-10th"],
    ["mpc or bipc", "/after-10th"],
    ["after 12th", "/after-12th"],
    ["courses after 12th", "/after-12th"],
    ["12th ke baad kya kare", "/after-12th"],
    ["12वीं के बाद क्या करें", "/after-12th"],
    ["ఇంటర్ తర్వాత ఏమి చేయాలి", "/after-12th"],
  ])("%s → %s (strip and /ask)", (q, url) => {
    for (const [tier, idx] of TIERS) {
      const r = resolveQuery(q, idx);
      // "after class 10" also names the Class 10 page, so it lists — with the hub first.
      if (q === "after class 10") expect(r.hits[0]?.url, `${tier}: ${q}`).toBe(url);
      else expect(open(q, idx), `${tier}: ${q}`).toBe(url);
    }
  });

  it("'which group after 10th' is a real question (the AI answers) with the hub as its first page", () => {
    const r = resolveQuery("which group after 10th", deep);
    expect(r.hits[0]?.url).toBe("/after-10th");
  });

  it("the hubs are landings with a route of their own, in the section P1-D3 names", () => {
    const hubs = SEARCH_LANDINGS.filter((l) => l.path === "/after-10th" || l.path === "/after-12th");
    expect(hubs.map((l) => [l.path, l.section])).toEqual([
      ["/after-10th", "school"],
      ["/after-12th", "entrance"],
    ]);
    // The words come from the path copy, never typed twice.
    for (const t of [...PATH_SEARCH_TERMS.en.after10, ...PATH_SEARCH_TERMS.hi.after10, ...PATH_SEARCH_TERMS.te.after10]) expect(hubs[0].terms).toContain(t);
    for (const t of [...PATH_SEARCH_TERMS.en.after12, ...PATH_SEARCH_TERMS.hi.after12, ...PATH_SEARCH_TERMS.te.after12]) expect(hubs[1].terms).toContain(t);
  });
});

describe("the option pages after Class 10 open by their names (on /ask, the deep index)", () => {
  it.each([
    ["MPC", "mpc-pcm"],
    ["PCM", "mpc-pcm"],
    ["एमपीसी", "mpc-pcm"],
    ["ఎంపీసీ", "mpc-pcm"],
    ["BiPC", "bipc-pcb"],
    ["PCB", "bipc-pcb"],
    ["PCMB", "pcmb"],
    ["CEC", "commerce-cec-mec"],
    ["MEC", "commerce-cec-mec"],
    ["humanities", "arts-hec-humanities"],
    ["vocational", "vocational"],
    ["diploma after 10th", "diploma-polytechnic"],
    ["iti after 10th", "iti"],
    ["open schooling", "nios"],
  ])("%s → /schooling/streams/%s", (q, slug) => {
    expect(open(q)).toBe(`/schooling/streams/${slug}`);
  });

  it("every option has a doc built from the registry — one per STREAM_OPTIONS row, never typed", () => {
    const docs = deep.docs.filter((d) => d.path.startsWith("/schooling/streams/"));
    expect(docs.map((d) => d.path)).toEqual(STREAM_OPTIONS.map((o) => streamPagePath(o.slug)));
    for (const d of docs) {
      const o = STREAM_OPTIONS.find((x) => streamPagePath(x.slug) === d.path)!;
      expect(d.title).toBe(o.title);
      expect(d.section).toBe("school");
      // The generic phrases name the hub, not nine pages at once.
      for (const t of PATH_SEARCH_TERMS.en.streams) expect(d.terms).not.toContain(normaliseTerm(t));
    }
    expect(LIFE_STAGE_PATHS).toEqual(["/after-10th", "/after-12th", ...STREAM_OPTION_SLUGS.map((s) => `/schooling/streams/${s}`)]);
  });

  it("they are deep-only: the strip's lite index keeps the two hubs and none of the nine (download cap)", () => {
    expect(lite.docs.some((d) => d.path.startsWith("/schooling/streams/"))).toBe(false);
    expect(lite.docs.filter((d) => d.path === "/after-10th" || d.path === "/after-12th")).toHaveLength(2);
    // A strip search for MPC opens nothing locally; /ask resolves it on the deep index.
    expect(resolveQuery("MPC", lite).outcome).not.toBe("direct");
    expect(open("MPC")).toBe("/schooling/streams/mpc-pcm");
  });
});

describe("no life-stage page takes a word another page answers to", () => {
  it.each([
    ["commerce", "/schooling/icse-cisce/class-12/commerce"],
    ["iti", "/colleges/iti-diploma"],
    ["diploma", "/colleges/iti-diploma"],
    ["nios", "/schooling/nios"],
    ["stream selection", "/schooling/streams"],
    ["streams", "/schooling/streams"],
    ["ap polycet", "/exams/AP_POLYCET"],
    ["exams after 12th", "/exams/after/12th"],
    ["entrance exams after 12th", "/exams/after/12th"],
    ["exams after iti", "/exams/after/diploma-iti"],
  ])("%s still opens %s", (q, url) => {
    for (const [tier, idx] of TIERS) expect(open(q, idx), `${tier}: ${q}`).toBe(url);
  });

  it("the collision rule, on its own: another page's key, an exam-name word, an exams ask or a two-letter key turns weak", () => {
    const doc = (path: string, kind: SearchDoc["kind"], terms: string[]): SearchDoc => ({ id: `${kind}:${path}`, kind, section: "school", title: path, sub: "", path, terms, weight: 0.5 });
    const docs = [
      doc("/colleges/iti-diploma", "landing", ["iti"]),
      doc("/exams/AP_POLYCET", "exam", ["ap polycet"]),
      doc("/schooling/streams/iti", "landing", ["iti", "ncvt", "polycet", "iti exam", "ia"]),
    ];
    demoteLifeStageCollisions(docs);
    expect(docs[2].terms).toEqual(["ncvt"]);
    expect(docs[2].soft).toEqual(["iti", "polycet", "iti exam", "ia"]);
    // Other pages are never touched.
    expect(docs[0].terms).toEqual(["iti"]);
    expect(docs[1].terms).toEqual(["ap polycet"]);
  });

  it("a polycet search lists the exams, with the diploma page at most a row under them", () => {
    const r = resolveQuery("polycet exam", deep);
    const urls = r.hits.map((h) => h.url);
    expect(urls[0]).toMatch(/^\/exams\/[A-Z]/);
    const at = urls.indexOf("/schooling/streams/diploma-polytechnic");
    if (at >= 0) expect(at).toBeGreaterThan(0);
  });
});

describe("stage lists name the hub (resolve.ts)", () => {
  it("'after 12th arts' still leads with the careers pages, then the hub", () => {
    const urls = resolveQuery("after 12th arts", deep).hits.map((h) => h.url);
    expect(urls.slice(0, 3)).toEqual(["/careers", "/career-map", "/after-12th"]);
  });

  it("'after 10th science' lists /after-10th before the streams article; a stream word adds its option page", () => {
    const urls = resolveQuery("after 10th science", deep).hits.map((h) => h.url);
    expect(urls.indexOf("/after-10th")).toBeGreaterThan(-1);
    expect(urls.indexOf("/after-10th")).toBeLessThan(urls.indexOf("/schooling/streams"));
    expect(resolveQuery("after 10th commerce", deep).hits.map((h) => h.url)).toContain("/schooling/streams/commerce-cec-mec");
  });

  it("a jobs or exams ask beside the stage does not list the hub; '12th exam' stays led by CBSE's board-exam hub", () => {
    for (const q of ["10th pass jobs", "12th ke baad naukri", "12th exam", "10th exam"]) {
      const urls = resolveQuery(q, deep).hits.map((h) => h.url);
      expect(urls, q).not.toContain("/after-10th");
      expect(urls, q).not.toContain("/after-12th");
    }
    expect(resolveQuery("12th exam", deep).hits[0].url).toBe("/schooling/cbse/class-12/board-exam");
  });
});

describe("the tutor's site map and the school next steps", () => {
  it("SITE_FEATURES names the two hubs and the option pattern, with the slugs listed and no salary", () => {
    for (const p of ["/after-10th", "/after-12th", "/schooling/streams/{OPTION}"]) expect(SITE_FEATURE_PATHS).toContain(p);
    const block = siteFeaturesBlock();
    const line = block.split("\n").find((l) => l.startsWith("- One option after Class 10 — https://shishya.in/schooling/streams/{OPTION}:"));
    expect(line).toBeTruthy();
    expect(line).toContain(`{OPTION} is one of ${STREAM_OPTION_SLUGS.join(", ")}`);
    const hubs = block.split("\n").filter((l) => l.includes("https://shishya.in/after-1"));
    expect(hubs).toHaveLength(2);
    for (const l of hubs) expect(l).not.toMatch(/salar|₹|\bbest\b|#1/i);
    expect(block).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("a Class 9-10 page links /after-10th beside the streams article; Class 1-8 pages link nothing", () => {
    for (const cls of [9, 10]) {
      const hrefs = schoolNextSteps(cls).map((s) => s.href);
      expect(hrefs.indexOf("/after-10th")).toBe(hrefs.indexOf("/schooling/streams") + 1);
    }
    for (const cls of [1, 5, 8]) expect(schoolNextSteps(cls)).toEqual([]);
  });
});
