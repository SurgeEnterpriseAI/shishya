// The home doors' data-driven links and the /schooling board-exam block
// (26 Sep 2026, entry points). No DB, no network.
// Run: npx vitest run tests/unit/home-door-links.test.ts
//
// What this pins:
//   1. each link renders exactly while its target clears that page's OWN
//      floor (category hub live, qualification page indexable, closing-soon
//      floor, board-exam hub floor), and drops out when the exam rows cannot
//      be read — nothing is guessed;
//   2. the PG entrance count counts only admission tests for a master's
//      programme, among the rows passed in (never typed, never UPSC / NET);
//   3. every href the lib can produce resolves to a page under src/app, and
//      the two anchors (#entrance-olympiad, #pg-entrances) exist on their pages;
//   4. no home component links a robots-blocked /exams/browse?… filter URL;
//   5. /schooling links the board-exam hubs through the floor, titled by
//      the hub's own computed title, and "Past Class 12?" links the hubs.

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import type { ExamLike } from "@/lib/exam-categories";
import { EXAM_CATEGORY_MIN } from "@/lib/exam-categories";
import { QUALIFICATION_MIN, findQualificationLevel } from "@/lib/exam-qualification";
import { CLOSING_SOON_MIN, addDays, closingSoon } from "@/lib/scholarship-lists";
import { ENTRANCE_GROUPS } from "@/lib/exam-kind";
import { BOARD_EXAM_HUBS } from "@/data/board-exams";
import { isBoardExamIndexable } from "@/lib/board-exams";
import { PG_ENTRANCE_CODES, pgEntranceCount, pgEntranceRows } from "@/lib/pg-entrances";
import {
  CLOSING_SOON_HREF,
  HOME_AFTER_LEVELS,
  OLYMPIADS_HREF,
  PG_ENTRANCES_HREF,
  boardExamHubLinks,
  closingSoonHref,
  homeDoorLinks,
  indexableAfterLinks,
  liveCategoryHref,
  pgEntrancesLink,
} from "@/lib/home-door-links";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/** Does an app-router path exist under src/app? (as tests/unit/home-doors.test.ts) */
function routeExists(href: string): boolean {
  const clean = href.split(/[?#]/)[0];
  const segs = clean.split("/").filter(Boolean);
  const expand = (dir: string): string[] => {
    const out = [dir];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory() && /^\(.+\)$/.test(e.name)) out.push(...expand(path.join(dir, e.name)));
    }
    return out;
  };
  let dirs = expand(path.join(ROOT, "src/app"));
  for (const seg of segs) {
    const next: string[] = [];
    for (const d of dirs) {
      const exact = path.join(d, seg);
      if (fs.existsSync(exact) && fs.statSync(exact).isDirectory()) next.push(...expand(exact));
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.isDirectory() && /^\[.+\]$/.test(e.name)) next.push(...expand(path.join(d, e.name)));
      }
    }
    dirs = next;
    if (dirs.length === 0) return false;
  }
  return dirs.some((d) => fs.existsSync(path.join(d, "page.tsx")));
}

let seq = 0;
function row(p: Partial<ExamLike> & { category: string; tags?: string[] }): ExamLike {
  seq++;
  return {
    code: p.code ?? `X_${seq}`,
    shortName: p.shortName ?? `X ${seq}`,
    name: p.name ?? `Exam ${seq}`,
    category: p.category,
    state: p.state ?? null,
    candidatesPerYear: p.candidatesPerYear ?? null,
    updatedAt: "2026-09-26T00:00:00.000Z",
    mockCount: 0,
    eligibility: p.tags
      ? { minAge: null, maxAge: null, educationTags: p.tags, educationNote: null, officialUrl: null, officialName: null }
      : null,
    nextExam: null,
  };
}
const many = (n: number, p: Parameters<typeof row>[0]) => Array.from({ length: n }, () => row(p));

// ── 1. floors ────────────────────────────────────────────────────────────

describe("home door links — each renders only while its page clears its own floor", () => {
  it("Banking → /exams/category/banking at EXAM_CATEGORY_MIN banking exams, none below", () => {
    expect(liveCategoryHref("banking", many(EXAM_CATEGORY_MIN, { category: "BANKING" }))).toBe("/exams/category/banking");
    expect(liveCategoryHref("banking", many(EXAM_CATEGORY_MIN - 1, { category: "BANKING" }))).toBeNull();
    expect(liveCategoryHref("banking", [])).toBeNull();
  });

  it("Exams after 12th / graduation → /exams/after/{level} only while indexable; postgraduation never", () => {
    expect([...HOME_AFTER_LEVELS]).toEqual(["12th", "graduation"]);
    for (const l of HOME_AFTER_LEVELS) expect(findQualificationLevel(l)?.held, l).toBeUndefined();
    const rows = [
      ...many(QUALIFICATION_MIN, { category: "ENGINEERING", tags: ["12TH"] }),
      ...many(QUALIFICATION_MIN - 1, { category: "STATE_LEVEL", tags: ["GRADUATE"] }),
      ...many(QUALIFICATION_MIN + 3, { category: "MEDICAL", tags: ["POSTGRADUATE"] }),
    ];
    expect(indexableAfterLinks(rows)).toEqual([{ level: "12th", href: "/exams/after/12th" }]);
    const more = [...rows, row({ category: "STATE_LEVEL", tags: ["GRADUATE", "POSTGRADUATE"] })];
    expect(indexableAfterLinks(more).map((a) => a.href)).toEqual(["/exams/after/12th", "/exams/after/graduation"]);
    // An exam listing 10TH and GRADUATE belongs after 10th (lowest level), not after graduation.
    const low = many(QUALIFICATION_MIN, { category: "STATE_LEVEL", tags: ["10TH", "GRADUATE"] });
    expect(indexableAfterLinks(low)).toEqual([]);
  });

  it("Scholarships closing soon → the page only while CLOSING_SOON_MIN schemes close in the window (real catalogue, every day of a year)", () => {
    for (let i = 0; i < 366; i++) {
      const day = addDays("2026-01-01", i);
      const n = closingSoon(day).length;
      expect(closingSoonHref(day), day).toBe(n >= CLOSING_SOON_MIN ? CLOSING_SOON_HREF : null);
    }
    // 26 Sep 2026 itself: 3 schemes close by 26 Oct (probe) — below the floor.
    expect(closingSoon("2026-09-26").length).toBeLessThan(CLOSING_SOON_MIN);
    expect(closingSoonHref("2026-09-26")).toBeNull();
  });

  it("CBSE board exam chips = the hubs that clear BOARD_EXAM_MIN_LINKS, as /schooling/cbse/class-N/board-exam", () => {
    const links = boardExamHubLinks();
    expect(links).toEqual(BOARD_EXAM_HUBS.filter(isBoardExamIndexable).map((h) => ({ cls: h.cls, href: `/schooling/${h.board}/class-${h.cls}/board-exam` })));
    expect(links.map((l) => l.cls)).toEqual([10, 12]);
  });

  it("DB down (rows null): the DB-derived links drop out; the static-data ones and the entrance hub stay", () => {
    const l = homeDoorLinks(null, "2026-09-26");
    expect(l.banking).toBeNull();
    expect(l.after).toEqual([]);
    expect(l.pgEntrances).toBeNull();
    expect(l.olympiads).toBe(OLYMPIADS_HREF);
    expect(l.boardExams).toEqual(boardExamHubLinks());
    expect(l.closingSoon).toBe(closingSoonHref("2026-09-26"));
  });

  it("Olympiads chip: shown while the rows hold an olympiad (or are unknown), hidden when they hold none", () => {
    expect(homeDoorLinks([row({ category: "OLYMPIAD" })], "2026-09-26").olympiads).toBe(OLYMPIADS_HREF);
    expect(homeDoorLinks([row({ category: "BANKING" })], "2026-09-26").olympiads).toBeNull();
  });
});

// ── 2. PG entrance count ────────────────────────────────────────────────

describe("PG entrance exams — counted from the rows, admission tests for a master's only", () => {
  it("the list holds admission tests for a master's programme, never a recruitment or post-PG test", () => {
    for (const c of ["UPSC_PRELIMS", "UGC_NET", "CSIR_NET", "CMI_ADMISSION", "SSC_CGL"]) expect(PG_ENTRANCE_CODES as readonly string[], c).not.toContain(c);
    for (const c of ["GATE_CSE", "CAT", "NEET_PG"]) expect(PG_ENTRANCE_CODES as readonly string[], c).toContain(c);
    expect(new Set(PG_ENTRANCE_CODES).size).toBe(PG_ENTRANCE_CODES.length);
  });

  it("counts only the rows passed in (the active ones) — a code with no row does not count", () => {
    // 26 Sep 2026 probe: active were CAT, GATE_CSE, NEET_PG (+ UPSC Prelims, not a PG entrance).
    const active = ["UPSC_PRELIMS", "CAT", "GATE_CSE", "NEET_PG", "SSC_CGL"].map((code) => ({ code }));
    expect(pgEntranceCount(active)).toBe(3);
    expect(pgEntranceRows(active).map((r) => r.code)).toEqual(["CAT", "GATE_CSE", "NEET_PG"]);
    expect(pgEntrancesLink(active)).toEqual({ href: PG_ENTRANCES_HREF, n: 3 });
    expect(pgEntrancesLink([{ code: "UPSC_PRELIMS" }])).toBeNull();
    expect(pgEntrancesLink([])).toBeNull();
  });
});

// ── 3. targets exist ────────────────────────────────────────────────────

describe("every link the lib can produce resolves, and its anchor exists", () => {
  it("routes", () => {
    const all = [
      "/exams/category/banking",
      ...HOME_AFTER_LEVELS.map((l) => `/exams/after/${l}`),
      CLOSING_SOON_HREF,
      OLYMPIADS_HREF,
      PG_ENTRANCES_HREF,
      ...BOARD_EXAM_HUBS.map((h) => `/schooling/${h.board}/class-${h.cls}/board-exam`),
      "/exams/entrance",
    ];
    for (const h of all) expect(routeExists(h), h).toBe(true);
  });

  it("the category and qualification pages build their slugs statically (a live link is never a dynamic 404)", () => {
    const cat = read("src/app/exams/category/[slug]/page.tsx");
    expect(cat).toMatch(/return EXAM_CATEGORIES\.map\(\(c\) => \(\{ slug: c\.slug \}\)\)/);
    expect(read("src/lib/exam-categories.ts")).toMatch(/slug: "banking"/);
    const after = read("src/app/exams/after/[level]/page.tsx");
    expect(after).toMatch(/return PUBLISHED_LEVELS\.map\(\(l\) => \(\{ level: l\.slug \}\)\)/);
  });

  it("#entrance-olympiad is the entrance hub's olympiad heading; #pg-entrances is the post-graduation section", () => {
    expect(ENTRANCE_GROUPS.map((g) => g.key)).toContain("olympiad");
    expect(OLYMPIADS_HREF).toBe("/exams/entrance#entrance-olympiad");
    expect(read("src/app/exams/entrance/page.tsx")).toMatch(/id=\{`entrance-\$\{g\.key\}`\}/);
    expect(PG_ENTRANCES_HREF).toBe("/post-graduation#pg-entrances");
    expect(read("src/app/post-graduation/page.tsx")).toMatch(/id="pg-entrances"/);
  });
});

// ── 4. no robots-blocked links on the home page ─────────────────────────

/** Source without comments: the dated comments quote the removed URLs on purpose. */
function stripComments(src: string): string {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

describe("home doors — no robots-blocked filter URL", () => {
  const doors = stripComments(read("src/components/home/HomeDoors.tsx"));

  it("HomeDoors.tsx links no /exams/browse?… URL (robots.txt disallows '/exams/browse?*')", () => {
    expect(doors).not.toMatch(/\/exams\/browse\?/);
    expect(doors).not.toMatch(/category=/);
    expect(stripComments(read("src/lib/home-door-links.ts"))).not.toMatch(/\/exams\/browse\?/);
  });

  it("the data-driven chips render only through the links object (no literal fallback to a filter URL)", () => {
    expect(doors).toMatch(/\{links\.banking && <Chip href=\{links\.banking\}/);
    expect(doors).toMatch(/\{links\.olympiads && <Chip href=\{links\.olympiads\}/);
    expect(doors).toMatch(/\{links\.closingSoon && <Chip href=\{links\.closingSoon\}/);
    expect(doors).toMatch(/links\.after\.map\(/);
    expect(doors).toMatch(/links\.boardExams\.map\(/);
    expect(doors).toMatch(/\{links\.pgEntrances && \(/);
    expect(doors).toMatch(/fillHome\(D\.soon\.pgExams, \{ n: links\.pgEntrances\.n \}\)/);
    // The async wrapper loads the links; the page's props are unchanged.
    expect(doors).toMatch(/export async function HomeDoors\(props: HomeDoorsProps\)/);
    expect(doors).toMatch(/const links = await loadHomeDoorLinks\(\);/);
  });
});

// ── 5. /schooling ───────────────────────────────────────────────────────

describe("/schooling links the CBSE board-exam hubs", () => {
  const src = read("src/app/schooling/page.tsx");

  it("through the floor, titled by the hub's own computed title", () => {
    expect(src).toMatch(/BOARD_EXAM_HUBS\.filter\(\(h\) => h\.board === "cbse" && isBoardExamIndexable\(h\)\)/);
    expect(src).toMatch(/href=\{boardExamPath\(h\)\}/);
    expect(src).toMatch(/\{boardExamTitle\(h\)\} →/);
  });

  it("'Past Class 12?' links the entrance hub and the government-exams catalogue, not the home page", () => {
    // The rendered line (the header comment quotes it first).
    const i = src.lastIndexOf("Past Class 12?");
    expect(i).toBeGreaterThan(0);
    const tail = src.slice(i, i + 500);
    expect(tail).toMatch(/href="\/exams\/entrance"/);
    expect(tail).toMatch(/href="\/exams\/browse"/);
    expect(tail).not.toMatch(/href="\/"/);
  });

  it("keeps CRLF line endings", () => {
    expect(src.includes("\r\n")).toBe(true);
    expect(/[^\r]\n/.test(src)).toBe(false);
  });
});
