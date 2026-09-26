// The "Doors" home page (26 Sep 2026) — pure helpers, the per-locale copy,
// and a source scan of src/app/page.tsx + src/components/home/**.
// No DB, no network. Run: npx vitest run tests/unit/home-doors.test.ts
//
// What this pins:
//   1. the helpers: class tiles, the most-taken chips, the retired-funnel
//      redirect;
//   2. en, hi and te carry exactly the same keys and {placeholders}, and
//      hi / te are actually translated;
//   3. HONESTY (founder, absolute): no "trusted by", no "AI-powered", no
//      nursery, no testimonial, no typed count — every number on the page
//      is a placeholder the page fills from data it loads; graduation / PG
//      / PhD appear only as "being built" and link nowhere;
//   4. INDEPENDENCE: nothing reads as a journey — no "then", "next step",
//      "after that", "step 1" between sections, in any locale;
//   5. every internal link the home components render resolves to a page
//      under src/app (a section shown as available must exist);
//   6. the page no longer imports the retired blocks, passes the live
//      counts (INDIAN_LANGUAGE_COUNT, CAREERS.length, portalStats) and
//      redirects the retired ?g= funnel.

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { CAREERS } from "@/data/careers";
import { BOARDS, findBoard } from "@/lib/schooling-data";
import { HOME_DOORS_COPY, homeDoorsCopy, type HomeDoorsCopy } from "@/lib/home-doors-copy";
import {
  ENTRANCE_DOOR_CODES,
  GOVERNMENT_DOOR_CODES,
  HOME_DOOR_IDS,
  cbseClassHref,
  cbseClassTiles,
  doorExamChips,
  legacyFunnelRedirect,
  mostTakenExams,
} from "@/lib/home-doors";
import type { ExamCard } from "@/components/ExamPicker";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const HOME_DIR = "src/components/home";
const homeFiles = () => fs.readdirSync(path.join(ROOT, HOME_DIR)).filter((f) => f.endsWith(".tsx")).map((f) => `${HOME_DIR}/${f}`);

type AnyCopy = Record<string, unknown>;
function leaves(o: AnyCopy, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out[key] = v;
    else if (v && typeof v === "object") Object.assign(out, leaves(v as AnyCopy, key));
  }
  return out;
}
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const devanagari = (s: string) => /[ऀ-ॿ]/.test(s);
const telugu = (s: string) => /[ఀ-౿]/.test(s);

const EN = leaves(HOME_DOORS_COPY.en as unknown as AnyCopy);
const HI = leaves(HOME_DOORS_COPY.hi as unknown as AnyCopy);
const TE = leaves(HOME_DOORS_COPY.te as unknown as AnyCopy);

/** Entries that stay Latin on purpose (proper nouns / acronyms). */
const LATIN_OK = new Set(["doors.school.icse"]);

// ── 1. helpers ─────────────────────────────────────────────────────────

const card = (code: string, tags: string[], candidatesPerYear: number | null): ExamCard => ({
  code,
  name: code,
  shortName: code,
  category: "GOVT_JOBS",
  candidatesPerYear,
  live: true,
  state: null,
  tags,
});

describe("home doors helpers", () => {
  it("cbseClassHref builds the class page route the schooling router parses (class-N)", () => {
    expect(cbseClassHref(1)).toBe("/schooling/cbse/class-1");
    expect(cbseClassHref(12)).toBe("/schooling/cbse/class-12");
    expect(cbseClassHref(10)).toMatch(/^\/schooling\/cbse\/class-(?:[1-9]|1[0-2])$/);
  });

  it("cbseClassTiles: the board's classes, 1..12 only, sorted and deduped; 1..12 when the list is unusable", () => {
    expect(cbseClassTiles([3, 1, 2, 2, 0, 13, 12])).toEqual([1, 2, 3, 12]);
    expect(cbseClassTiles(undefined)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(cbseClassTiles([])).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    // The live board data is what the page passes.
    expect(cbseClassTiles(findBoard("cbse")?.classes)).toEqual(findBoard("cbse")?.classes);
    expect(BOARDS.some((b) => b.slug === "icse-cisce"), "the ICSE / ISC chip's board slug").toBe(true);
  });

  it("mostTakenExams: curated popular first, then the rest, each by candidates per year, capped", () => {
    const exams = [
      card("SMALL_POP", ["popular"], 1_000),
      card("BIG", [], 9_000_000),
      card("BIG_POP", ["popular"], 5_000_000),
      card("MID", [], 50_000),
      card("NOVOL_POP", ["popular"], null),
    ];
    expect(mostTakenExams(exams, 8).map((e) => e.code)).toEqual(["BIG_POP", "SMALL_POP", "NOVOL_POP", "BIG", "MID"]);
    expect(mostTakenExams(exams, 2).map((e) => e.code)).toEqual(["BIG_POP", "SMALL_POP"]);
    expect(mostTakenExams(exams, 0)).toEqual([]);
    expect(mostTakenExams([], 8)).toEqual([]);
  });

  it("doorExamChips: the wanted codes in order, only those present in the loaded catalogue, labelled by its shortName", () => {
    const loaded = [card("NEET_UG", ["popular"], 2_400_000), card("JEE_MAIN", ["popular"], 1_400_000), card("SSC_CGL", ["popular"], 3_000_000)];
    expect(doorExamChips(loaded, ENTRANCE_DOOR_CODES).map((e) => e.code)).toEqual(["JEE_MAIN", "NEET_UG"]);
    expect(doorExamChips(loaded, GOVERNMENT_DOOR_CODES).map((e) => e.code)).toEqual(["SSC_CGL"]);
    expect(doorExamChips([], ENTRANCE_DOOR_CODES)).toEqual([]);
    // CLAT has no exam row (26 Sep 2026 probe): never a door code.
    expect([...ENTRANCE_DOOR_CODES, ...GOVERNMENT_DOOR_CODES]).not.toContain("CLAT");
    expect(new Set([...ENTRANCE_DOOR_CODES, ...GOVERNMENT_DOOR_CODES]).size).toBe(ENTRANCE_DOOR_CODES.length + GOVERNMENT_DOOR_CODES.length);
  });

  it("legacyFunnelRedirect: no ?g= renders the page; every goal goes to its catalogue category; state scope to /exams/state", () => {
    expect(legacyFunnelRedirect({})).toBeNull();
    expect(legacyFunnelRedirect({ s: "state" })).toBeNull();
    expect(legacyFunnelRedirect({ g: "engineering" })).toBe("/exams/browse?category=ENGINEERING");
    expect(legacyFunnelRedirect({ g: "government-jobs", s: "national" })).toBe("/exams/browse?category=GOVT_JOBS");
    expect(legacyFunnelRedirect({ g: "defence" })).toBe("/exams/browse?category=GOVT_JOBS");
    expect(legacyFunnelRedirect({ g: "engineering", s: "state", st: "MH" })).toBe("/exams/state");
    expect(legacyFunnelRedirect({ g: "no-such-goal" })).toBe("/exams/browse");
    for (const g of ["engineering", "medical", "government-jobs", "banking", "civil-services", "teaching", "law", "mba", "defence", "olympiad"]) {
      expect(legacyFunnelRedirect({ g })).toMatch(/^\/exams\/browse\?category=[A-Z_]+$/);
    }
  });

  it("the five doors keep their grid order and ids", () => {
    expect([...HOME_DOOR_IDS]).toEqual(["school", "entrance", "government", "college", "careers"]);
  });
});

// ── 2. locale parity ───────────────────────────────────────────────────

describe("home doors copy — en / hi / te parity", () => {
  it("hi and te carry exactly the English keys", () => {
    expect(Object.keys(HI).sort()).toEqual(Object.keys(EN).sort());
    expect(Object.keys(TE).sort()).toEqual(Object.keys(EN).sort());
  });

  it("every {placeholder} survives translation", () => {
    for (const [k, en] of Object.entries(EN)) {
      expect(placeholders(HI[k]), `hi ${k}`).toEqual(placeholders(en));
      expect(placeholders(TE[k]), `te ${k}`).toEqual(placeholders(en));
    }
  });

  it("hi and te are translated (native script), except the proper nouns", () => {
    for (const [k, v] of Object.entries(HI)) if (!LATIN_OK.has(k)) expect(devanagari(v), `hi ${k}: ${v}`).toBe(true);
    for (const [k, v] of Object.entries(TE)) if (!LATIN_OK.has(k)) expect(telugu(v), `te ${k}: ${v}`).toBe(true);
    for (const k of LATIN_OK) expect(HI[k]).toBe(EN[k]);
  });

  it("homeDoorsCopy falls back to English for every other locale", () => {
    expect(homeDoorsCopy("hi")).toBe(HOME_DOORS_COPY.hi);
    expect(homeDoorsCopy("te")).toBe(HOME_DOORS_COPY.te);
    for (const l of ["en", "ta", "mr", "xx", null, undefined]) expect(homeDoorsCopy(l)).toBe(HOME_DOORS_COPY.en);
  });

  it("no string is empty and none carries stray whitespace", () => {
    for (const L of [EN, HI, TE]) {
      for (const [k, v] of Object.entries(L)) {
        expect(v.trim(), k).toBe(v);
        expect(v.length, k).toBeGreaterThan(0);
      }
    }
  });
});

// ── 3. honesty ─────────────────────────────────────────────────────────

const BANNED_EN: [RegExp, string][] = [
  [/trusted by/i, "no 'trusted by'"],
  [/AI[- ]powered/i, "no 'AI-powered' slogan"],
  [/nursery|kindergarten|pre-?school/i, "no nursery / pre-school claim"],
  [/testimonial|\bsays\b.*—|"[^"]{20,}"\s*—\s*[A-Z]/, "no testimonial"],
  [/\b(lakh|crore|million)\b/i, "no headline volume claim"],
  [/\b#\s?1\b|\bbest\b|\bIndia's (largest|biggest|top)\b/i, "no superlative"],
  [/\bfor free\b.*\bworth\b|₹/i, "no rupee pitch"],
];

/** A typed count: digits followed by a countable noun. Placeholders ({n})
 *  are what the page fills from data it loads. "Class 10 or 12" and
 *  "2 minutes" are not counts of content. */
const TYPED_COUNT = /\d[\d,]*\s*\+?\s*(exams?|questions?|students?|aspirants?|languages?|notes?|paths?|chapters?|colleges?|users?|mocks?|papers?|boards?|careers?|scholarships?|topics?|videos?|teachers?|mentors?)\b/i;

describe("home doors copy — honesty (founder, absolute)", () => {
  it("English carries none of the banned claims", () => {
    for (const [k, v] of Object.entries(EN)) for (const [re, why] of BANNED_EN) expect(re.test(v), `${k}: ${why} — "${v}"`).toBe(false);
  });

  it("no typed count in any locale — numbers are placeholders the page fills", () => {
    for (const [name, L] of [["en", EN], ["hi", HI], ["te", TE]] as const) {
      for (const [k, v] of Object.entries(L)) {
        expect(TYPED_COUNT.test(v), `${name} ${k}: "${v}"`).toBe(false);
        // No number of three or more digits anywhere (no "170+", no "30,000").
        expect(/\d{3,}|\d,\d{3}/.test(v), `${name} ${k}: "${v}"`).toBe(false);
      }
    }
    // The counts the page renders are placeholders, filled from data.
    for (const k of ["doors.careers.count", "how.ask", "doors.school.classTile", "finder.browse"]) expect(placeholders(EN[k])).toEqual(["n"]);
    // Review, 26 Sep 2026: the Government door carries no count — the
    // catalogue count is government AND entrance exams.
    expect(EN["doors.government.count"]).toBeUndefined();
  });

  it("graduation, PG and PhD appear only in the 'being built' cell, which says it is not open", () => {
    for (const [k, v] of Object.entries(EN)) {
      if (/\bPhD\b|post-?graduation|\bPG\b|graduation/i.test(v)) expect(k, v).toMatch(/^doors\.soon\./);
    }
    expect(EN["doors.soon.tag"]).toBe("Being built");
    expect(EN["doors.soon.body"]).toMatch(/Not open yet/);
    expect(EN["doors.soon.body"]).toMatch(/nothing to click/);
    // The cell links nowhere: its copy carries no arrow.
    expect(EN["doors.soon.body"]).not.toMatch(/→/);
    expect(EN["doors.soon.title"]).not.toMatch(/→/);
  });

  it("the School door claims no notes or practice — they are being written", () => {
    expect(EN["doors.school.being"]).toBe("Notes and practice: being written.");
    expect(EN["doors.school.body"]).not.toMatch(/notes|practice|quiz/i);
  });

  it("the finder's chips are 'Most taken' — not 'most popular this week', which nothing measures", () => {
    expect(EN["finder.mostTaken"]).toBe("Most taken");
    for (const [k, v] of Object.entries(EN)) expect(/this week/i.test(v), k).toBe(false);
  });
});

// ── 4. independence ────────────────────────────────────────────────────

const SEQUENCE_EN = /\b(then|next step|after that|after which|step [1-9]|finally|once you|and then|journey)\b|\bfirst,/i;
const SEQUENCE_HI = /उसके बाद|अगला कदम|फिर |पहला कदम|आख़िर में/;
const SEQUENCE_TE = /ఆ తర్వాత|తదుపరి దశ|మొదటి దశ|ఆపై|చివరగా/;

describe("home doors copy — independence (no section reads as a step)", () => {
  it("no journey / sequence wording in any locale", () => {
    for (const [k, v] of Object.entries(EN)) expect(SEQUENCE_EN.test(v), `en ${k}: "${v}"`).toBe(false);
    for (const [k, v] of Object.entries(HI)) expect(SEQUENCE_HI.test(v), `hi ${k}: "${v}"`).toBe(false);
    for (const [k, v] of Object.entries(TE)) expect(SEQUENCE_TE.test(v), `te ${k}: "${v}"`).toBe(false);
  });

  it("the kicker states independence in plain words", () => {
    expect(EN["kicker.line"]).toBe("Use any one, any time. There is no order.");
    expect(EN["hero.h1"]).toBe("One smart place to study");
  });

  it("'How Shishya works' holds for any section: opens a section, says Shishya is beside the teaching, and names where practice lives", () => {
    expect(EN["how.s1t"]).toMatch(/open your section/i);
    expect(EN["how.s1b"]).toMatch(/not a replacement/i);
    expect(EN["how.lead"]).toMatch(/every section/i);
    // Review, 26 Sep 2026: College and Careers have no chapters, questions
    // or plans, and school practice is being written — so no step promises
    // checked questions or a plan in every section; practice is scoped to
    // exam pages and the school line matches the School door.
    for (const k of ["how.lead", "how.s1b", "how.s2b", "how.s3b"]) expect(/checked|weak topic|day-by-day/i.test(EN[k]), k).toBe(false);
    expect(EN["how.s4b"]).toMatch(/^Exam pages carry/);
    expect(EN["how.s4b"]).toMatch(/School practice: being written\.$/);
    expect(EN["how.s2b"]).not.toMatch(/chapter|question|practice/i);
    // No block keeps the old government-exams-only framing.
    for (const k of ["hero.h1", "how.h2", "how.lead", "signin.line"]) expect(/crack|government job|govt job/i.test(EN[k]), k).toBe(false);
    // 26 Sep 2026 (founder): the tagline names both halves — Indian education
    // and government jobs — and says it is free.
    expect(EN["hero.tagline"]).toMatch(/free/i);
    expect(EN["hero.tagline"]).toMatch(/school/i);
    expect(EN["hero.tagline"]).toMatch(/government jobs/i);
    expect(EN["hero.tagline"]).not.toMatch(/PhD|graduation/i);
  });
});

// ── 5. links resolve ───────────────────────────────────────────────────

/** Does an app-router path exist under src/app? Dynamic segments ([x]) and
 *  route groups ((x)) are followed; the leaf must hold page.tsx. */
function routeExists(href: string): boolean {
  const clean = href.split(/[?#]/)[0];
  const segs = clean.split("/").filter(Boolean);
  const expand = (dir: string): string[] => {
    // A route group is transparent: its children are this dir's children.
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

function staticHrefs(src: string): string[] {
  // href="/x", href={"/x"}, href={`/x`} — literal paths only; a template
  // with ${…} is a data-driven exam link, covered by the exam route below.
  return [...src.matchAll(/href=\{?["'`](\/[^"'`{}]*)["'`]\}?/g)].map((m) => m[1]);
}

describe("every link the home page renders resolves to a page under src/app", () => {
  it("home components + page", () => {
    const files = [...homeFiles(), "src/app/page.tsx"];
    const seen = new Set<string>();
    for (const f of files) for (const h of staticHrefs(read(f))) seen.add(h);
    expect(seen.size).toBeGreaterThan(15);
    for (const h of seen) expect(routeExists(h), `${h} has no page.tsx under src/app`).toBe(true);
  });

  it("the doors' one-tap links", () => {
    for (const h of [
      "/schooling",
      "/schooling/cbse",
      "/schooling/icse-cisce",
      cbseClassHref(1),
      cbseClassHref(12),
      "/exams/browse",
      "/exams/browse?category=OLYMPIAD",
      "/exams/browse?category=BANKING",
      "/exams/state",
      ...[...ENTRANCE_DOOR_CODES, ...GOVERNMENT_DOOR_CODES].map((c) => `/exams/${c}`),
      "/colleges",
      "/scholarships",
      "/distance-learning",
      "/careers",
      "/jobs-map",
      "/jobs/internships",
      "/find-your-exam",
      "/exam-calendar",
      "/chat?general=1",
      "/login?callbackUrl=%2Fdashboard",
      "/today",
      "/mentors",
    ]) expect(routeExists(h), h).toBe(true);
  });

  it("the door chips come from the loaded catalogue, so the DB-down fallback list still renders the core ones", async () => {
    const { FALLBACK_EXAMS } = await import("@/data/fallback-exams");
    const codes = new Set(FALLBACK_EXAMS.map((e) => e.code));
    // CUET UG is live in the catalogue (26 Sep 2026 probe) but not in the
    // ~36-row fallback list: its chip simply drops out when the DB is down.
    for (const c of ["JEE_MAIN", "NEET_UG", "NDA", "SSC_CGL", "UPSC_PRELIMS"]) expect(codes.has(c), c).toBe(true);
    expect(doorExamChips(FALLBACK_EXAMS, ENTRANCE_DOOR_CODES).map((e) => e.code)).toEqual(
      ENTRANCE_DOOR_CODES.filter((c) => codes.has(c)),
    );
    expect(doorExamChips(FALLBACK_EXAMS, GOVERNMENT_DOOR_CODES).map((e) => e.code)).toEqual([...GOVERNMENT_DOOR_CODES]);
    expect(doorExamChips(FALLBACK_EXAMS, ENTRANCE_DOOR_CODES).length).toBeGreaterThanOrEqual(3);
  });

  it("the doors component uses no typed count: CAREERS.length is passed in; the catalogue count lives on the finder's browse link", () => {
    const doors = read(`${HOME_DIR}/HomeDoors.tsx`);
    expect(doors).toMatch(/careersCount: number/);
    expect(doors).not.toMatch(/examCount/);
    expect(doors).not.toMatch(new RegExp(`\\b${CAREERS.length}\\b`));
    expect(doors).not.toMatch(/\b1[0-9]{2}\+?\s*exams/);
    expect(CAREERS.length).toBeGreaterThan(0);
    const finder = read(`${HOME_DIR}/HomeFinder.tsx`);
    expect(finder).toMatch(/examCount: string/);
    expect(finder).toMatch(/fillHome\(F\.browse, \{ n: examCount \}\)/);
  });
});

// ── 5b. the exam doors' destinations match what they promise ───────────
// Review, 26 Sep 2026 (read-only probe scripts/tmp-home-fixer-probe.ts):
// the catalogue held 180 exams — ?category=GOVT_JOBS is SSC / RRB only
// (9), unfiltered it leads with the 128 state-level government exams, and
// CLAT has no exam row. /find-your-exam matches government-job exams only.

const doorTag = (src: string, id: string) => src.match(new RegExp(`<Door\\b[^>]*\\bid="${id}"[^>]*>`))?.[0] ?? "";

describe("exam doors — destinations", () => {
  const doors = read(`${HOME_DIR}/HomeDoors.tsx`);

  it("the Government door opens the whole catalogue, never one ?category= filter, and carries no count", () => {
    const tag = doorTag(doors, "government");
    expect(tag).toMatch(/href="\/exams\/browse"/);
    expect(tag).not.toMatch(/category=/);
    expect(tag).not.toMatch(/badge=/);
  });

  it("the Entrance door has no whole-card link (no page lists admission tests alone); its chips are the section", () => {
    const tag = doorTag(doors, "entrance");
    expect(tag).not.toMatch(/href=/);
    expect(doors).toMatch(/entranceChips\.map/);
    expect(doors).toMatch(/href="\/exams\/browse\?category=OLYMPIAD"/);
    // The body tells the reader what to do instead of a card tap.
    expect(EN["doors.entrance.body"]).toMatch(/Tap your exam:$/);
  });

  it("no door names CLAT (no exam page) and the finder line names the government-job finder", () => {
    for (const L of [EN, HI, TE]) for (const [k, v] of Object.entries(L)) expect(/\bCLAT\b/.test(v), k).toBe(false);
    // No link or label — the header comment may explain why it is absent.
    expect(doors).not.toMatch(/href="\/exams\/CLAT"|>\s*CLAT\s*</);
    expect(EN["finder.finder"]).toMatch(/government exam/i);
  });

  it("the finder's sub-line claims nothing for every exam page (12 pages have no mock yet, 139 no notes)", () => {
    expect(EN["finder.sub"]).not.toMatch(/\bevery\b|\ball\b/i);
    expect(EN["finder.sub"]).toMatch(/notes where written/);
    expect(HI["finder.sub"]).not.toMatch(/^हर /);
    expect(TE["finder.sub"]).not.toMatch(/^ప్రతి /);
  });
});

// ── 6. the page ────────────────────────────────────────────────────────

const RETIRED = [
  "AskSearchBar",
  "VacancyFinderCard",
  "PortalStatsBand",
  "WallOfGrinders",
  "PersonalSystemStrip",
  "InspirationCarousel",
  "HomeFeatureCards",
  "HomeChatRouter",
  "PageTour",
  "SundayLiveTestBanner",
  "VacancyExplorerSidebar",
  "UpcomingExamsSidebar events=",
  "EXAM_GOALS",
  "StepGoals",
  "StepScope",
  "StepStatePicker",
  "StepExamList",
  "Breadcrumbs",
  "MobileInlineRails",
  "/for/",
  "lg:pl-80",
  "fixed bottom-0",
];

describe("src/app/page.tsx — the Doors page", () => {
  const src = read("src/app/page.tsx");

  it("keeps CRLF line endings (the file is patched, never re-ended)", () => {
    const raw = fs.readFileSync(path.join(ROOT, "src/app/page.tsx"), "utf8");
    expect(raw.includes("\r\n")).toBe(true);
    expect(/[^\r]\n/.test(raw)).toBe(false);
  });

  it("renders the home components in the Doors order and no retired block", () => {
    for (const name of ["HomeHero", "HomeDoors", "HomeFinder", "HomeRails", "HomeHowItWorks", "HomeSignIn", "HomeBeacons"]) {
      expect(src).toMatch(new RegExp(`import \\{ ${name} \\} from "@/components/home/${name}"`));
      expect(src).toMatch(new RegExp(`<${name}\\b`));
    }
    // 26 Sep 2026: the whole-platform search strip rides in the hero's slot
    // (under the H1 and tagline), before the doors; the exam finder below
    // keeps its own box (tests/unit/search-strip.test.ts pins the strip).
    const order = ["<HomeHero", "<SearchStrip", "<HomeDoors", "<LiveTestTodayBanner", "<ExamsTodayStrip", "<HomeFinder", "<HomeRails", "<HomeHowItWorks", "<HomeSignIn"].map((m) => src.indexOf(m));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    for (const r of RETIRED) expect(src.includes(r), `retired block still present: ${r}`).toBe(false);
  });

  it("the header is untouched and rendered first", () => {
    expect(src).toMatch(/import \{ Header \} from "@\/components\/Header"/);
    expect(src.indexOf("<Header />")).toBeLessThan(src.indexOf("<HomeHero"));
  });

  it("counts come from data, never typed: INDIAN_LANGUAGE_COUNT, CAREERS.length, portalStats.examCount", () => {
    expect(src).toMatch(/languageCount=\{INDIAN_LANGUAGE_COUNT\}/);
    expect(src).toMatch(/careersCount=\{CAREERS\.length\}/);
    expect(src).toMatch(/examCount=\{portalStats\.examCount\}/);
    expect(src).toMatch(/\$\{INDIAN_LANGUAGE_COUNT\} Indian languages/);
    const jsx = src.slice(src.indexOf("export default async function"));
    expect(/\b1[0-9] Indian languages|\b4[0-9] (career )?paths|\b1[0-9]{2}\+? exams/.test(jsx)).toBe(false);
    for (const re of [/trusted by/i, /AI[- ]powered/i, /testimonial/i]) expect(re.test(src), String(re)).toBe(false);
  });

  it("the retired ?g= funnel 308s to the catalogue instead of rendering", () => {
    expect(src).toMatch(/import \{ permanentRedirect \} from "next\/navigation"/);
    expect(src).toMatch(/const legacy = legacyFunnelRedirect\(sp\);\r?\n\s*if \(legacy\) permanentRedirect\(legacy\);/);
  });

  it("stays a server component that loads what it needs in parallel, keeps the JSON-LD event list and the locale copy", () => {
    expect(src.startsWith('"use client"')).toBe(false);
    expect(src).toMatch(/const \[signedIn, exams, calendar, vacancy, portalStats, liveToday\] = await Promise\.all\(\[/);
    expect(src).toMatch(/application\/ld\+json/);
    expect(src).toMatch(/const copy = homeDoorsCopy\(locale\)/);
    expect(src).toMatch(/labels=\{calendarRailLabels\(locale\)\}/);
    // The proven paths stay one tap away.
    expect(read(`${HOME_DIR}/HomeFinder.tsx`)).toMatch(/import \{ HomeSearch \} from "@\/components\/HomeSearch"/);
    expect(read(`${HOME_DIR}/HomeRails.tsx`)).toMatch(/VacancyExplorerPanel/);
  });

  it("the kept islands keep their beacons; the new ones share one delegated CTA beacon", () => {
    expect(read("src/components/HomeSearch.tsx")).toMatch(/SEARCH_MISS/);
    expect(read("src/components/VacancyExplorer.tsx")).toMatch(/explorer-nudge-click/);
    const beacons = read(`${HOME_DIR}/HomeBeacons.tsx`);
    expect(beacons).toMatch(/CTA_CLICKED/);
    expect(beacons).toMatch(/data-home-cta/);
    let tagged = 0;
    for (const f of homeFiles()) tagged += (read(f).match(/data-home-cta=/g) ?? []).length;
    // One per element family: hero line, pills, doors, class tiles, chips,
    // finder, browse, tutor line, sign-in, welcome, mentor.
    expect(tagged).toBeGreaterThanOrEqual(10);
  });

  it("every home component is honest in source: no typed language or exam count, no banned slogan", () => {
    for (const f of homeFiles()) {
      const s = read(f);
      for (const re of [/trusted by/i, /AI[- ]powered/i, /\b1[0-9] Indian languages/, /\b1[0-9]{2}\+? exams/, /\b4[0-9] paths/]) expect(re.test(s), `${f}: ${re}`).toBe(false);
    }
  });
});

// The copy type is exported for the components; keep a compile-time use so
// an unused-import lint never removes the shape from this file's checks.
const _shape: keyof HomeDoorsCopy = "doors";
void _shape;
