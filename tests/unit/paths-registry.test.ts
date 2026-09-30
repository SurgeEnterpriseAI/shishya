// The life-stage path registry (30 Sep 2026, P1 build 1, spec §7).
// No DB, no network. Run: npx vitest run tests/unit/paths-registry.test.ts
//
// What this pins:
//   1. validatePathRegistry() finds nothing; ids are unique and in the
//      declared order; every edge endpoint is a known node;
//   2. every career slug is in CAREERS, every college stream in ALL_STREAMS,
//      every career category in CAREER_CATEGORIES, every exam code a real
//      Exam row in the 26 Sep 2026 snapshot (except the label-only three);
//   3. every stage hub and every existing page / family link resolves to a
//      page.tsx route, and the anchors they use exist on their pages; the
//      three routes build 1 adds (/after-10th, /after-12th,
//      /schooling/streams/[option]) are pinned in their own test;
//   4. honesty: every confirmed fact, board row and sourced edge cites an
//      allowed official host with a real read day; no aggregator; the
//      boards the researcher could NOT read (AP BIE, Karnataka PUE,
//      Maharashtra HSC, Bihar science) have no rows, only a link to their
//      own site; no digits in our own copy except class numbers; no salary,
//      no "best";
//   5. selectors compute (scholarships open only, careers by category).

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  BOARD_CHECK_LINKS,
  BOARD_STREAM_COMBINATIONS,
  COURSE_FAMILIES,
  COURSE_FAMILY_DETAILS,
  LABEL_ONLY_EXAM_CODES,
  PATH_EDGES,
  PATH_EXAMS,
  PATH_SOURCES,
  PATH_STAGES,
  PATH_STAGE_IDS,
  STAGE_HUB_FACTS,
  STREAM_OPTIONS,
  STREAM_OPTION_SLUGS,
  AGGREGATOR_DENYLIST,
  boardChecksFor,
  careersForFamily,
  combinationsFor,
  confirmedBoardCount,
  confirmedCount,
  courseFamiliesAfter,
  edgesFrom,
  familiesFromStream,
  findStage,
  findStreamOption,
  isAllowedSourceUrl,
  isYmdDay,
  knownNodeIds,
  printableFacts,
  scholarshipsForStage,
  strayDigits,
  validatePathRegistry,
  type PathFact,
} from "@/data/paths";
import { ALL_STREAMS } from "@/lib/colleges-data";
import { CAREERS, CAREER_CATEGORIES } from "@/data/careers";
import { BOARDS } from "@/lib/schooling-data";
import { STATES } from "@/lib/state-info";
import { ENTRANCE_GROUPS } from "@/lib/exam-kind";
import { SCHOLARSHIPS } from "@/data/scholarships";
import { PUBLISHED_LEVELS } from "@/lib/exam-qualification";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/** Next's app router does not backtrack: a static segment wins over a
 *  dynamic sibling, and if the static branch has no match the URL 404s. */
function routeExists(href: string): boolean {
  const clean = href.split(/[?#]/)[0];
  const segs = clean.split("/").filter(Boolean);
  const groups = (dir: string): string[] => {
    const out = [dir];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory() && /^\(.+\)$/.test(e.name)) out.push(...groups(path.join(dir, e.name)));
    }
    return out;
  };
  let dirs = groups(path.join(ROOT, "src/app"));
  for (const seg of segs) {
    const exact: string[] = [];
    const dynamic: string[] = [];
    for (const d of dirs) {
      const p = path.join(d, seg);
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) exact.push(...groups(p));
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.isDirectory() && /^\[.+\]$/.test(e.name)) dynamic.push(...groups(path.join(d, e.name)));
      }
    }
    dirs = exact.length > 0 ? exact : dynamic;
    if (dirs.length === 0) return false;
  }
  return dirs.some((d) => fs.existsSync(path.join(d, "page.tsx")));
}

/** The routes build 1 creates in other agents' files (spec §9 agent B). */
const BUILD_ONE_NEW = new Set(["/after-10th", "/after-12th"]);
const isNewStreamPage = (href: string) => /^\/schooling\/streams\/[a-z0-9-]+$/.test(href.split(/[?#]/)[0]);

/** Every href the registry itself names (stages, options, families). */
function registryHrefs(): string[] {
  return [
    ...PATH_STAGES.map((s) => s.hubPath),
    ...STREAM_OPTIONS.flatMap((o) => o.existingPages.map((p) => p.href)),
    ...COURSE_FAMILIES.flatMap((f) => f.links.map((l) => l.href)),
  ];
}

const allFacts = (): Array<{ where: string; fact: PathFact }> => [
  ...STREAM_OPTIONS.flatMap((o) => [
    { where: `${o.slug} duration`, fact: o.duration },
    ...o.facts.map((fact, i) => ({ where: `${o.slug} fact ${i}`, fact })),
  ]),
  ...Object.entries(STAGE_HUB_FACTS).flatMap(([id, facts]) => (facts ?? []).map((fact, i) => ({ where: `${id} fact ${i}`, fact }))),
  ...Object.entries(COURSE_FAMILY_DETAILS).map(([id, d]) => ({ where: `${id} duration`, fact: d.duration })),
];

// ── 1. integrity ─────────────────────────────────────────────────────────

describe("path registry — integrity", () => {
  it("validatePathRegistry() finds no problem", () => {
    expect(validatePathRegistry()).toEqual([]);
  });

  it("stages are the seven PATH_STAGE_IDS in life order; only 'school' may include children", () => {
    expect(PATH_STAGES.map((s) => s.id)).toEqual([...PATH_STAGE_IDS]);
    expect(PATH_STAGE_IDS).toEqual(["school", "after-10th", "after-12th", "college", "after-graduation", "govt-job-prep", "working"]);
    expect(PATH_STAGES.filter((s) => s.mayIncludeChildren).map((s) => s.id)).toEqual(["school"]);
    expect(findStage("school")?.onbStage).toBeNull();
  });

  it("stream options are the nine STREAM_OPTION_SLUGS in order; legacy anchors keep the five /schooling/streams sections", () => {
    expect(STREAM_OPTIONS.map((o) => o.slug)).toEqual([...STREAM_OPTION_SLUGS]);
    expect(STREAM_OPTIONS.map((o) => o.legacyAnchor).filter(Boolean)).toEqual(["pcm", "pcb", "pcmb", "commerce", "humanities"]);
  });

  it("ids are unique everywhere", () => {
    const uniq = (xs: string[]) => new Set(xs).size === xs.length;
    expect(uniq(PATH_STAGES.map((s) => s.id))).toBe(true);
    expect(uniq(STREAM_OPTIONS.map((o) => o.slug))).toBe(true);
    expect(uniq(COURSE_FAMILIES.map((f) => f.id))).toBe(true);
    expect(uniq(PATH_EXAMS.map((e) => e.code))).toBe(true);
  });

  it("every edge endpoint is a known node", () => {
    const known = knownNodeIds();
    const bad = PATH_EDGES.filter((e) => !known.has(e.from) || !known.has(e.to));
    expect(bad).toEqual([]);
  });

  it("the stage chain runs in life order and /after-10th leads to all nine options", () => {
    expect(edgesFrom("stage:school").map((e) => e.to)).toContain("stage:after-10th");
    expect(edgesFrom("stage:after-10th").filter((e) => e.to.startsWith("stream:")).map((e) => e.to)).toEqual(STREAM_OPTION_SLUGS.map((s) => `stream:${s}`));
    expect(edgesFrom("stage:after-12th").filter((e) => e.to.startsWith("course:")).map((e) => e.to)).toEqual(courseFamiliesAfter("12th").map((f) => `course:${f.id}`));
  });
});

// ── 2. references into the existing data ────────────────────────────────

describe("path registry — references resolve", () => {
  it("career, career-category and college-stream nodes exist in careers.ts / colleges-data", () => {
    const careerSlugs = new Set(CAREERS.map((c) => c.slug));
    const cats = new Set(CAREER_CATEGORIES.map((c) => c.slug));
    const streams = new Set(ALL_STREAMS.map((s) => s.value as string));
    for (const e of PATH_EDGES) {
      for (const id of [e.from, e.to]) {
        if (id.startsWith("career:")) expect(careerSlugs.has(id.slice(7)), id).toBe(true);
        if (id.startsWith("career-cat:")) expect(cats.has(id.slice(11)), id).toBe(true);
        if (id.startsWith("college-stream:")) expect(streams.has(id.slice(15)), id).toBe(true);
      }
    }
    for (const f of COURSE_FAMILIES) {
      if (f.collegeStream) expect(streams.has(f.collegeStream), f.id).toBe(true);
      for (const c of f.careerCategories) expect(cats.has(c), `${f.id} ${c}`).toBe(true);
    }
  });

  it("every exam code was a real Exam row on 26 Sep 2026, except the label-only three", () => {
    const fx = JSON.parse(read("tests/fixtures/search-inputs-2026-09-26.json")) as { exams: [string, ...unknown[]][] };
    const real = new Set(fx.exams.map((e) => e[0]));
    for (const e of PATH_EXAMS) {
      if (LABEL_ONLY_EXAM_CODES.includes(e.code)) expect(real.has(e.code), `${e.code} now has a row: move it out of LABEL_ONLY_EXAM_CODES`).toBe(false);
      else expect(real.has(e.code), `${e.code} is not a real exam code`).toBe(true);
    }
    for (const f of COURSE_FAMILIES) for (const c of f.examCodes) expect(PATH_EXAMS.some((e) => e.code === c), `${f.id} ${c}`).toBe(true);
  });

  it("board rows name a /schooling board slug and a real state; check links point at that board's own site", () => {
    const boards = new Map(BOARDS.map((b) => [b.slug, b]));
    for (const r of BOARD_STREAM_COMBINATIONS) {
      expect(boards.has(r.board), r.board).toBe(true);
      if (r.stateCode) expect(STATES[r.stateCode], r.stateCode).toBeTruthy();
      expect(boards.get(r.board)?.state ?? null).toBe(r.stateCode);
    }
    // 30 Sep 2026 (review fix): Kerala's vocational higher secondary wing has
    // no BOARDS entry, so its check link carries its own official portal.
    const NOT_IN_BOARDS = new Set(["kl-vhse"]);
    for (const b of BOARD_CHECK_LINKS) {
      if (NOT_IN_BOARDS.has(b.board)) {
        expect(boards.has(b.board), b.board).toBe(false);
        expect(isAllowedSourceUrl(b.url), b.url).toBe(true);
        expect(STATES[b.stateCode ?? ""], b.board).toBeTruthy();
        continue;
      }
      expect(boards.get(b.board)?.websiteUrl, b.board).toBe(b.url);
      expect(boards.get(b.board)?.state ?? null).toBe(b.stateCode);
    }
  });

  it("Kerala's vocational course list was not read: the vocational page gets only a link to the VHSE portal (review fix, 30 Sep 2026)", () => {
    const kl = boardChecksFor("vocational").find((b) => b.board === "kl-vhse");
    expect(kl?.url).toBe("https://vhseportal.kerala.gov.in/");
    expect(kl?.options).toEqual(["vocational"]);
    expect(BOARD_STREAM_COMBINATIONS.some((r) => r.option === "vocational" && r.stateCode === "KL")).toBe(false);
  });

  it("a row that shows part of a board's list says so: WBCHSE Sets II and III and SCERT's vocational list read 'for example'; NIOS Groups B-F is whole (review fix)", () => {
    const wb = BOARD_STREAM_COMBINATIONS.filter((r) => r.board === "wb-wbchse" && (r.groupCode === "Set II" || r.groupCode === "Set III"));
    expect(wb.map((r) => r.localName).sort()).toEqual(["Set II, for example", "Set III, for example"]);
    const tsVoc = BOARD_STREAM_COMBINATIONS.find((r) => r.board === "ts-bie" && r.option === "vocational")!;
    expect(tsVoc.localName).toMatch(/for example$/);
    expect(tsVoc.subjects).toContain("Office Assistantship");
    const nios = BOARD_STREAM_COMBINATIONS.find((r) => r.board === "nios" && /Groups B to F/.test(r.localName))!;
    for (const s of ["Painting (332)", "Data Entry Operations (336)", "Physical Education and Yog (373)", "Indian Knowledge Tradition (345-348, Sanskrit medium)"]) {
      expect(nios.subjects, s).toContain(s);
    }
  });
});

// ── 3. routes and anchors ────────────────────────────────────────────────

describe("path registry — every page it names exists", () => {
  it("existing pages and family links resolve to a page.tsx route", () => {
    const missing = registryHrefs().filter((h) => !BUILD_ONE_NEW.has(h) && !isNewStreamPage(h) && !routeExists(h));
    expect(missing).toEqual([]);
  });

  it("dynamic-route hrefs name real data: /careers/{slug} in CAREERS, /colleges/stream/{x} in ALL_STREAMS, /exams/after/{level} published", () => {
    const careerSlugs = new Set(CAREERS.map((c) => c.slug));
    const streams = new Set(ALL_STREAMS.map((s) => s.value as string));
    for (const h of registryHrefs()) {
      const p = h.split("#")[0];
      let m = /^\/careers\/([^/]+)$/.exec(p);
      if (m) expect(careerSlugs.has(m[1]), h).toBe(true);
      m = /^\/colleges\/stream\/([^/]+)$/.exec(p);
      if (m) expect(streams.has(m[1]), h).toBe(true);
      m = /^\/exams\/after\/([^/]+)$/.exec(p);
      if (m) expect(PUBLISHED_LEVELS.map((l) => l.slug as string), h).toContain(m[1]);
    }
  });

  it("build 1's new routes exist: /after-10th, /after-12th and /schooling/streams/[option] (agent B's files)", () => {
    const why = "agent B (build 1) creates src/app/after-10th, src/app/after-12th and src/app/schooling/streams/[option]";
    expect(routeExists("/after-10th"), why).toBe(true);
    expect(routeExists("/after-12th"), why).toBe(true);
    for (const s of STREAM_OPTION_SLUGS) expect(routeExists(`/schooling/streams/${s}`), `${why}: ${s}`).toBe(true);
  });

  it("the anchors used exist: /schooling/streams#{pcm…}, /exams/entrance#entrance-{group}", () => {
    const streamsPage = read("src/app/schooling/streams/page.tsx");
    expect(streamsPage).toMatch(/id=\{s\.slug\}/);
    const entrance = read("src/app/exams/entrance/page.tsx");
    expect(entrance).toMatch(/id=\{`entrance-\$\{g\.key\}`\}/);
    const groupKeys = new Set(ENTRANCE_GROUPS.map((g) => g.key as string));
    for (const h of registryHrefs()) {
      const [p, anchor] = h.split("#");
      if (!anchor) continue;
      if (p === "/schooling/streams") expect(streamsPage, h).toContain(`slug: "${anchor}"`);
      else if (p === "/exams/entrance") expect(groupKeys.has(anchor.replace(/^entrance-/, "")), h).toBe(true);
      else throw new Error(`unchecked anchor ${h}: add its page to this test`);
    }
  });
});

// ── 4. honesty ───────────────────────────────────────────────────────────

describe("path registry — honesty", () => {
  it("isAllowedSourceUrl: official suffixes and listed bodies pass; aggregators and lookalikes fail", () => {
    for (const u of [
      "https://cbseacademic.nic.in/x.pdf",
      "https://dge.tn.gov.in/docs/examina/HSE_E.pdf",
      "https://jeeadv.ac.in/eligibility.html",
      "https://examreg.upmsp.edu.in/x.pdf",
      "https://aicte-india.org/x.pdf",
      "https://cetcell.mahacet.org/x.pdf",
    ]) expect(isAllowedSourceUrl(u), u).toBe(true);
    for (const u of [
      "https://www.shiksha.com/engineering",
      "https://collegedunia.com/x",
      "https://www.careers360.com/x",
      "https://gov.in.example.com/x",
      "https://notnic.in/x",
      "ftp://dge.tn.gov.in/x",
      "",
    ]) expect(isAllowedSourceUrl(u), u).toBe(false);
    for (const d of AGGREGATOR_DENYLIST) expect(isAllowedSourceUrl(`https://${d}/`), d).toBe(false);
  });

  it("every PATH_SOURCES entry is official, read on 30 Sep 2026, with publisher and title", () => {
    for (const [k, s] of Object.entries(PATH_SOURCES)) {
      expect(isAllowedSourceUrl(s.url), k).toBe(true);
      expect(s.checkedOn, k).toBe("2026-09-30");
      expect(isYmdDay(s.checkedOn)).toBe(true);
      expect(s.tier, k).toBe("official");
      expect(s.publisher.trim().length > 0 && s.title.trim().length > 0, k).toBe(true);
    }
  });

  it("every confirmed fact, board row and sourced edge cites a PATH_SOURCES document; unconfirmed facts carry none", () => {
    const urls = new Set(Object.values(PATH_SOURCES).map((s) => s.url));
    for (const { where, fact } of allFacts()) {
      if (fact.status === "confirmed") expect(fact.source && urls.has(fact.source.url), where).toBe(true);
      if (fact.status === "unconfirmed") expect(fact.source, where).toBeNull();
    }
    for (const r of BOARD_STREAM_COMBINATIONS) {
      expect(r.status).toBe("confirmed");
      expect(urls.has(r.source.url), `${r.board} ${r.localName}`).toBe(true);
    }
    for (const e of PATH_EDGES) {
      if (e.kind === "closes") expect(e.source, `${e.from}>${e.to}`).toBeTruthy();
      if (e.note && (e.kind === "keeps-open" || e.kind === "closes")) expect(e.source && urls.has(e.source.url), `${e.from}>${e.to}`).toBe(true);
    }
  });

  it("printableFacts never returns an unconfirmed fact", () => {
    for (const o of STREAM_OPTIONS) {
      const p = printableFacts(o.facts);
      expect(p.every((f) => f.status !== "unconfirmed")).toBe(true);
      expect(p.length).toBe(o.facts.filter((f) => f.status === "confirmed").length);
    }
    expect(printableFacts([{ text: "x", status: "unconfirmed", source: null }])).toEqual([]);
    expect(printableFacts([{ text: "x", status: "confirmed", source: null }])).toEqual([]);
  });

  it("the boards not read on their own site have no rows — only a check link (AP BIE, Karnataka PUE, Maharashtra HSC, Bihar science)", () => {
    for (const b of ["ap-bie", "ka-puc", "mh-ssc-hsc"]) {
      expect(BOARD_STREAM_COMBINATIONS.filter((r) => r.board === b), b).toEqual([]);
      expect(BOARD_CHECK_LINKS.some((c) => c.board === b), b).toBe(true);
    }
    const bihar = BOARD_STREAM_COMBINATIONS.filter((r) => r.board === "bihar-bseb").map((r) => r.option);
    expect([...new Set(bihar)].sort()).toEqual(["arts-hec-humanities", "commerce-cec-mec"]);
    expect(boardChecksFor("mpc-pcm").map((b) => b.board)).toContain("bihar-bseb");
    expect(boardChecksFor("commerce-cec-mec").map((b) => b.board)).not.toContain("bihar-bseb");
  });

  it("the boards read on 30 Sep 2026 all have rows: CBSE, Tamil Nadu, Telangana (SCERT), Kerala, West Bengal, UP, Bihar, NIOS", () => {
    const boards = new Set(BOARD_STREAM_COMBINATIONS.map((r) => r.board));
    expect([...boards].sort()).toEqual(["bihar-bseb", "cbse", "kl-dhse", "nios", "tn-state-board", "ts-bie", "up-board", "wb-wbchse"]);
  });

  it("Telangana rows print SCERT's subject lists, never an acronym it does not print; commerce is filed under Humanities", () => {
    for (const r of BOARD_STREAM_COMBINATIONS.filter((x) => x.board === "ts-bie" && x.option !== "vocational")) {
      expect(r.localName).not.toMatch(/\b(MPC|BiPC|MEC|CEC|HEC)\b/);
      expect(r.groupCode).toBeNull();
      if (r.option === "commerce-cec-mec") expect(r.localName.startsWith("Humanities:")).toBe(true);
    }
  });

  it("no digits in our own copy except class numbers", () => {
    expect(strayDigits("Class 10")).toBe("");
    expect(strayDigits("Class 11-12 / After 12th")).toBe("");
    expect(strayDigits("In school (Class 1-10)")).toBe("");
    expect(strayDigits("10+2 pattern")).toBe("");
    expect(strayDigits("after Class VIII")).toBe("");
    expect(strayDigits("75% of seats")).toBe("75");
    expect(strayDigits("5-year LLB")).toBe("5");
    const copy = [
      ...PATH_STAGES.flatMap((s) => [s.label, s.shortLabel]),
      ...STREAM_OPTIONS.flatMap((o) => [o.title, o.whatItIs, o.suits, ...o.existingPages.map((p) => p.label)]),
      ...COURSE_FAMILIES.flatMap((f) => [f.name, ...f.links.map((l) => l.label)]),
      ...Object.values(COURSE_FAMILY_DETAILS).map((d) => d.whatItIs),
      ...PATH_EDGES.map((e) => e.note ?? ""),
      ...PATH_EDGES.map((e) => e.label ?? ""),
    ];
    expect(copy.filter((t) => strayDigits(t) !== "")).toEqual([]);
  });

  it("no salary, no 'best' / '#1' / 'biggest' / 'largest' anywhere in the registry's text", () => {
    const text = JSON.stringify({ STREAM_OPTIONS, COURSE_FAMILIES, COURSE_FAMILY_DETAILS, STAGE_HUB_FACTS, PATH_EDGES, BOARD_STREAM_COMBINATIONS });
    expect(text).not.toMatch(/salary|starting salary|\bLPA\b|₹/i);
    expect(text).not.toMatch(/\bbest\b|#1\b|\bbiggest\b|\blargest\b|number one/i);
  });

  // 30 Sep 2026 (review fix): CLAT asks for "10+2 or an equivalent
  // examination" and names neither NIOS nor the HSC Vocational examination,
  // so both are treated alike: neither is linked to law.
  it("law is kept open from neither NIOS nor vocational (CLAT's page names neither)", () => {
    const law = COURSE_FAMILIES.find((f) => f.id === "law")!;
    expect(law.fromStreams).not.toContain("nios");
    expect(law.fromStreams).not.toContain("vocational");
    for (const s of ["nios", "vocational"] as const) {
      expect(edgesFrom(`stream:${s}`).filter((e) => e.to === "course:law" || e.to === "exam:CLAT"), s).toEqual([]);
    }
  });

  it("a narrowing label always sits on a sourced keeps-open / closes line, and names less than the family", () => {
    const labelled = PATH_EDGES.filter((e) => e.label !== undefined);
    expect(labelled.length).toBeGreaterThan(0);
    for (const e of labelled) {
      expect(["keeps-open", "closes"], `${e.from} ${e.to}`).toContain(e.kind);
      expect(e.note && e.source && isAllowedSourceUrl(e.source.url), `${e.from} ${e.to}`).toBeTruthy();
      const fam = COURSE_FAMILIES.find((f) => `course:${f.id}` === e.to);
      if (fam) expect(e.label, `${e.from} ${e.to}`).not.toBe(fam.name);
    }
    for (const e of PATH_EDGES.filter((x) => x.kind === "closes" && x.to.startsWith("course:"))) expect(e.label, `${e.from} ${e.to}`).toBeTruthy();
  });

  it("no 'closes' edge to NEET: NMC's additional-subject route keeps it reachable", () => {
    expect(PATH_EDGES.filter((e) => e.kind === "closes" && (e.to === "exam:NEET_UG" || e.to === "course:medical"))).toEqual([]);
  });

  it("the duration of NIOS is not printed (unconfirmed); Class 11-12, diploma and ITI durations are confirmed", () => {
    expect(findStreamOption("nios")?.duration.status).toBe("unconfirmed");
    for (const s of ["mpc-pcm", "vocational", "diploma-polytechnic", "iti"]) expect(findStreamOption(s)?.duration.status, s).toBe("confirmed");
  });
});

// ── 5. selectors ─────────────────────────────────────────────────────────

describe("path registry — selectors compute", () => {
  it("combinationsFor / confirmedCount / confirmedBoardCount agree with the rows", () => {
    for (const s of STREAM_OPTION_SLUGS) {
      const rows = BOARD_STREAM_COMBINATIONS.filter((r) => r.option === s);
      expect(combinationsFor(s)).toEqual(rows);
      expect(confirmedCount(s)).toBe(rows.filter((r) => r.status === "confirmed").length);
      expect(confirmedBoardCount(s)).toBe(new Set(rows.map((r) => r.board)).size);
    }
  });

  it("familiesFromStream / courseFamiliesAfter follow the family data", () => {
    expect(familiesFromStream("mpc-pcm").map((f) => f.id)).toContain("engineering");
    expect(familiesFromStream("bipc-pcb").map((f) => f.id)).not.toContain("engineering");
    expect(courseFamiliesAfter("12th").every((f) => f.after === "12th")).toBe(true);
    expect(courseFamiliesAfter("10th").map((f) => f.id)).toEqual(["diploma-lateral"]);
  });

  // 30 Sep 2026 (review fix): a family with its own careerSlugs list returns
  // exactly that list; the others stay CAREERS by category (computed).
  it("careersForFamily: the family's careerSlugs when set, else CAREERS by its categories (computed, never typed)", () => {
    for (const f of COURSE_FAMILIES) {
      const own = COURSE_FAMILY_DETAILS[f.id]?.careerSlugs;
      const cats = new Set(f.careerCategories);
      const want = own ? [...own] : CAREERS.filter((c) => cats.has(c.category)).map((c) => c.slug);
      expect(careersForFamily(f).map((c) => c.slug), f.id).toEqual(want);
    }
  });

  it("families whose category is too broad carry their own list: defence, architecture, design and the engineering diploma", () => {
    const slugs = (id: string) => careersForFamily(COURSE_FAMILIES.find((f) => f.id === id)!).map((c) => c.slug);
    expect(slugs("defence")).toEqual(["armed-forces-officer"]);
    expect(slugs("architecture")).toEqual(["architect"]);
    expect(slugs("design")).toEqual(CAREERS.filter((c) => c.category === "design" && c.slug !== "architect").map((c) => c.slug));
    expect(slugs("design").length).toBeGreaterThan(0);
    expect(slugs("diploma-lateral")).toEqual(CAREERS.filter((c) => c.category === "skilled-trade").map((c) => c.slug));
    for (const bad of ["merchant-navy-officer", "commercial-pilot", "police-constable"]) expect(slugs("defence")).not.toContain(bad);
    // The edges follow the list: a family with its own list points at careers, not a category.
    for (const f of COURSE_FAMILIES) {
      const out = edgesFrom(`course:${f.id}`).filter((e) => e.to.startsWith("career"));
      if (COURSE_FAMILY_DETAILS[f.id]?.careerSlugs) expect(out.every((e) => e.to.startsWith("career:")), f.id).toBe(true);
      else expect(out.every((e) => e.to.startsWith("career-cat:")), f.id).toBe(true);
    }
  });

  it("scholarshipsForStage: open schemes at the stage's levels only; national without a state, plus the state's with one", () => {
    const stage = findStage("after-12th")!;
    const list = scholarshipsForStage(stage);
    expect(list.length).toBeGreaterThan(0);
    for (const s of list) {
      expect(s.closed, s.id).toBeFalsy();
      expect(s.unlisted, s.id).toBeFalsy();
      expect(s.tags.includes("aggregator"), s.id).toBe(false);
      expect(s.levels.includes("UG"), s.id).toBe(true);
      expect(s.state, s.id).toBeNull();
    }
    const withState = scholarshipsForStage(stage, "MH");
    expect(withState.length).toBeGreaterThanOrEqual(list.length);
    expect(withState.every((s) => s.state === null || s.state === "MH")).toBe(true);
    const closedUg = SCHOLARSHIPS.filter((s) => s.closed && s.levels.includes("UG") && s.state === null).map((s) => s.id);
    for (const id of closedUg) expect(list.some((s) => s.id === id), id).toBe(false);
    expect(scholarshipsForStage(findStage("working")!)).toEqual([]);
  });
});
