// URL normalisation (26 Sep 2026, discoverability G2) — src/lib/url-normalize.ts.
//
// Every plausible URL a student or an LLM types reaches the canonical page
// with ONE 308; canonical paths never redirect; codes with no hub stay honest
// 404s. The hand-kept lists (static /exams folders, exam aliases, board /
// subject / college aliases, dead section paths) are pinned to the real
// routes and data here: the src/app tree, the committed 26 Sep 2026 snapshot
// of the 180 real exams (tests/fixtures/search-inputs-2026-09-26.json), the
// fallback exam list, BOARDS and COLLEGES. Pure: no DB, no network.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  COLLEGE_SLUG_ALIASES,
  DEAD_PATHS,
  EXAM_PATH_ALIASES,
  EXAM_STATIC_SEGMENTS,
  SCHOOL_BOARD_ALIASES,
  SCHOOL_SUBJECT_ALIASES,
  canonicalExamSegment,
  canonicalPath,
  normalizeExamPath,
} from "@/lib/url-normalize";
import { FALLBACK_EXAMS } from "@/data/fallback-exams";
import { BOARDS } from "@/lib/schooling-data";
import { COLLEGES } from "@/lib/colleges-data";
import { fixtureInputs } from "../fixtures/search-index-fixture";

const ROOT = process.cwd();
const APP = path.join(ROOT, "src/app");
const REAL_CODES = fixtureInputs().exams.map((e) => e.code);

/** A page.tsx exists for this URL path (dynamic segments and route groups followed). */
function hasPage(href: string): boolean {
  const segs = href.split(/[?#]/)[0].split("/").filter(Boolean);
  const expand = (dir: string): string[] => {
    const out = [dir];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) if (e.isDirectory() && /^\(.+\)$/.test(e.name)) out.push(...expand(path.join(dir, e.name)));
    return out;
  };
  let dirs = expand(APP);
  for (const seg of segs) {
    const next: string[] = [];
    for (const d of dirs) for (const e of fs.readdirSync(d, { withFileTypes: true })) if (e.isDirectory() && (e.name === seg || /^\[.+\]$/.test(e.name))) next.push(...expand(path.join(d, e.name)));
    dirs = next;
    if (!dirs.length) return false;
  }
  return dirs.some((d) => fs.existsSync(path.join(d, "page.tsx")));
}

/** A page.tsx exists for this path through STATIC folders only (no [param] stand-in). */
function hasStaticPage(href: string): boolean {
  return fs.existsSync(path.join(APP, ...href.split("/").filter(Boolean), "page.tsx"));
}

describe("the lists are pinned to the routes and the data", () => {
  it("EXAM_STATIC_SEGMENTS holds every static folder beside src/app/exams/[code] (category and after are G4's)", () => {
    const dirs = fs
      .readdirSync(path.join(APP, "exams"), { withFileTypes: true })
      .filter((e) => e.isDirectory() && !/^\[.+\]$/.test(e.name))
      .map((e) => e.name);
    for (const d of dirs) expect(EXAM_STATIC_SEGMENTS.has(d), `src/app/exams/${d} is missing from EXAM_STATIC_SEGMENTS`).toBe(true);
    for (const s of EXAM_STATIC_SEGMENTS) expect(dirs.includes(s) || ["category", "after"].includes(s), s).toBe(true);
  });

  it("every real exam code (180-exam snapshot and the fallback list) is ^[A-Z0-9_]+$ and never a static folder", () => {
    const codes = [...new Set([...REAL_CODES, ...FALLBACK_EXAMS.map((e) => e.code)])];
    expect(REAL_CODES.length).toBeGreaterThanOrEqual(180);
    for (const c of codes) {
      expect(c, c).toMatch(/^[A-Z0-9_]+$/);
      expect(EXAM_STATIC_SEGMENTS.has(c.toLowerCase()), c).toBe(false);
    }
  });

  it("a canonical code never redirects — hub or sub-page, English or twin", () => {
    for (const c of REAL_CODES) {
      expect(canonicalExamSegment(c), c).toBe(c);
      for (const p of [`/exams/${c}`, `/exams/${c}/syllabus`, `/hi/exams/${c}/cutoff`, `/te/exams/${c}/updates`]) {
        expect(normalizeExamPath(p), p).toBeNull();
        expect(canonicalPath(p), p).toBeNull();
      }
    }
  });

  it("every alias targets a real, active exam; no alias re-points another real code", () => {
    for (const [k, code] of Object.entries(EXAM_PATH_ALIASES)) {
      expect(REAL_CODES, `${k} → ${code}`).toContain(code);
      expect(k, k).toMatch(/^[a-z0-9-]+$/);
    }
    for (const c of REAL_CODES) {
      const hit = EXAM_PATH_ALIASES[c.toLowerCase().replace(/_/g, "-")];
      if (hit) expect(hit, c).toBe(c);
    }
  });

  it("codes with no equivalent hub are never aliased (honest 404 until the hub exists)", () => {
    for (const k of ["clat", "gate", "bitsat", "iit-jam", "cuet-pg", "iit_jam", "cuet_pg"]) {
      expect(EXAM_PATH_ALIASES[k], k).toBeUndefined();
    }
    for (const c of ["CLAT", "GATE", "BITSAT", "IIT_JAM", "CUET_PG"]) {
      expect(REAL_CODES, `${c} now exists — add its alias or drop this line`).not.toContain(c);
      expect(normalizeExamPath(`/exams/${c}`), c).toBeNull();
    }
  });

  it("school aliases land on a real board and on a subject every class has", () => {
    const boards = new Set(BOARDS.map((b) => b.slug));
    for (const [k, v] of Object.entries(SCHOOL_BOARD_ALIASES)) {
      expect(boards.has(v), `${k} → ${v}`).toBe(true);
      expect(boards.has(k), `${k} is itself a board slug`).toBe(false);
    }
    const classes = fixtureInputs().school.classes;
    for (const [k, v] of Object.entries(SCHOOL_SUBJECT_ALIASES)) {
      for (const c of classes) expect(c.subjects.some((s) => s.slug === v), `${c.boardSlug} class ${c.cls} has ${v} (${k})`).toBe(true);
    }
  });

  it("college aliases land on a real college and never shadow one", () => {
    const slugs = new Set(COLLEGES.map((c) => c.slug));
    for (const [k, v] of Object.entries(COLLEGE_SLUG_ALIASES)) {
      expect(slugs.has(v), `${k} → ${v}`).toBe(true);
      expect(slugs.has(k), `${k} is itself a college slug`).toBe(false);
    }
  });

  it("dead paths have no page of their own; their targets do", () => {
    for (const [from, to] of Object.entries(DEAD_PATHS)) {
      expect(hasStaticPage(from), `${from} has a page.tsx now — drop it from DEAD_PATHS`).toBe(false);
      expect(hasPage(to), to).toBe(true);
    }
    for (const sub of ["news", "results"]) expect(fs.existsSync(path.join(APP, "exams", "[code]", sub, "page.tsx")), sub).toBe(false);
    for (const sub of ["archive", "updates"]) expect(fs.existsSync(path.join(APP, "exams", "[code]", sub, "page.tsx")), sub).toBe(true);
  });
});

// Input → canonical path (null = no redirect). The middleware 308s to it.
const TABLE: [input: string, out: string | null][] = [
  // Exam codes: case, hyphens, aliases, the /Exams first segment, twins.
  ["/exams/ssc_cgl", "/exams/SSC_CGL"],
  ["/exams/ssc-cgl", "/exams/SSC_CGL"],
  ["/exams/Ssc_Cgl/cutoff", "/exams/SSC_CGL/cutoff"],
  ["/exams/neet", "/exams/NEET_UG"],
  ["/exams/NEET", "/exams/NEET_UG"],
  ["/exams/neet/syllabus", "/exams/NEET_UG/syllabus"],
  ["/exams/jee-main", "/exams/JEE_MAIN"],
  ["/exams/jeemain", "/exams/JEE_MAIN"],
  ["/exams/jee-advanced", "/exams/JEE_ADVANCED"],
  ["/exams/upsc", "/exams/UPSC_PRELIMS"],
  ["/exams/ias", "/exams/UPSC_PRELIMS"],
  ["/exams/upsc-cse", "/exams/UPSC_PRELIMS"],
  ["/exams/cuet", "/exams/CUET_UG"],
  ["/exams/cuet-ug", "/exams/CUET_UG"],
  ["/exams/ctet", "/exams/CTET"],
  ["/Exams/SSC_CGL", "/exams/SSC_CGL"],
  ["/EXAMS/neet", "/exams/NEET_UG"],
  ["/hi/exams/ssc_cgl/updates", "/hi/exams/SSC_CGL/updates"],
  ["/te/Exams/neet", "/te/exams/NEET_UG"],
  ["/exams/ssc_cgl/", "/exams/SSC_CGL"],
  // Dead exam sub-paths.
  ["/exams/SSC_CGL/news", "/exams/SSC_CGL/archive"],
  ["/exams/ssc_cgl/news", "/exams/SSC_CGL/archive"],
  ["/exams/SSC_CGL/results", "/exams/SSC_CGL/updates"],
  ["/hi/exams/SSC_CGL/results", "/hi/exams/SSC_CGL/updates"],
  // Canonical and static paths: untouched.
  ["/exams/SSC_CGL", null],
  ["/exams/SSC_CGL/news/abc123", null],
  ["/exams/SSC_CGL/results/abc123", null],
  ["/exams/SSC_CGL/topics/quant.percentage", null],
  ["/exams/SSC_CGL/topics/quant.percentage/hi", null],
  ["/exams/entrance", null],
  ["/exams/browse", null],
  ["/exams/state", null],
  ["/exams/state/x", null],
  ["/exams/state/bihar", null],
  ["/exams/after/12th", null],
  ["/exams/category/railway", null],
  ["/exams/Browse", "/exams/browse"],
  ["/exams", null],
  ["/exams/ssc%20cgl", null],
  // No equivalent hub: no alias (CLAT stays a 404; a lower-case one only gets its case fixed).
  ["/exams/CLAT", null],
  ["/exams/GATE", null],
  ["/exams/IIT_JAM", null],
  ["/exams/clat", "/exams/CLAT"],
  ["/exams/cuet-pg", "/exams/CUET_PG"],
  // School.
  ["/schooling/CBSE/Class-10", "/schooling/cbse/class-10"],
  ["/schooling/cbse/10", "/schooling/cbse/class-10"],
  ["/schooling/cbse/10th/maths", "/schooling/cbse/class-10/mathematics"],
  ["/schooling/cbse/class10/Maths", "/schooling/cbse/class-10/mathematics"],
  ["/schooling/icse/class-9", "/schooling/icse-cisce/class-9"],
  ["/schooling/cbse/class-10/mathematics", null],
  ["/schooling/cbse/class-10/mathematics/real-numbers", null],
  ["/schooling/cbse/class-10/context.md", null],
  ["/schooling/streams", null],
  ["/schooling/cbse/13", null],
  ["/hi/schooling/cbse/10", "/schooling/cbse/class-10"],
  // Colleges, careers, scholarships.
  ["/colleges/IIT-Bombay", "/colleges/iit-bombay"],
  ["/colleges/iitb", "/colleges/iit-bombay"],
  ["/colleges/iitb/cse", "/colleges/iit-bombay/cse"],
  ["/careers/Data-Scientist", "/careers/data-scientist"],
  ["/scholarships/PM-Yasasvi", "/scholarships/pm-yasasvi"],
  ["/colleges/iit-bombay", null],
  ["/colleges/cutoffs", null],
  ["/colleges/context.md", null],
  // Dead section paths.
  ["/current-affairs/capsule", "/current-affairs"],
  ["/current-affairs/capsule/", "/current-affairs"],
  ["/hi/current-affairs/capsule", "/hi/current-affairs"],
  ["/current-affairs/capsule/2026-09", null],
  ["/colleges/stream", "/colleges"],
  ["/colleges/state", "/colleges"],
  ["/colleges/stream/engineering", null],
  ["/for", "/"],
  ["/hi/for", "/hi"],
  ["/for/class-10-student", null],
  ["/worldwide/test-prep", "/worldwide"],
  ["/worldwide/test-prep/ielts", null],
  // Everything else.
  ["/", null],
  ["/hi", null],
  ["/current-affairs", null],
  ["/login", null],
];

describe("canonicalPath: one hop to the canonical page", () => {
  it.each(TABLE)("%s → %s", (input, out) => {
    expect(canonicalPath(input)).toBe(out);
  });

  it("is idempotent: the target of a redirect never redirects again", () => {
    for (const [input, out] of TABLE) if (out) expect(canonicalPath(out), `${input} → ${out}`).toBeNull();
  });

  it("every redirect target that should render has a page.tsx", () => {
    for (const [input, out] of TABLE) {
      if (!out || /CLAT|CUET_PG/.test(out)) continue;
      const bare = out.replace(/^\/(hi|te)(?=\/|$)/, "") || "/";
      expect(hasPage(bare), `${input} → ${out}`).toBe(true);
    }
  });

  it("normalizeExamPath only ever answers for /exams paths", () => {
    expect(normalizeExamPath("/exams/ssc_cgl")).toBe("/exams/SSC_CGL");
    expect(normalizeExamPath("/schooling/CBSE")).toBeNull();
    expect(normalizeExamPath("/colleges/iitb")).toBeNull();
    expect(normalizeExamPath("/exams/SSC_CGL")).toBeNull();
  });
});
