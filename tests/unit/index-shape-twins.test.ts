// Index shape (13 Sep 2026): the Hindi / Telugu twin localisation gate —
// src/lib/twin-localisation.ts + the canonical / hreflang helpers in
// src/lib/seo-locale.ts. The DB loader runs against a mocked Prisma. The
// last block pins TWIN_CHROME to src/lib/i18n.ts and the page sources: when
// a twin page's rendered strings or hard-coded English drift, re-measure and
// update TWIN_RENDERED_KEYS / TWIN_CHROME.

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { dict } from "@/lib/i18n";
import { ALL_TWINS, NO_TWINS, languageAlternates, twinCanonical } from "@/lib/seo-locale";
import { markingSchemeVerdict, UNEQUAL_PAPER_EXAMS } from "@/lib/marking-scheme";
import {
  EXAM_WEEK_BLOCK_LATIN,
  SITE_FRAME_LATIN,
  TWIN_CHROME,
  TWIN_MIN_SHARE,
  TWIN_RENDERED_KEYS,
  calendarTwinTexts,
  examTwinTexts,
  examTwinVerdicts,
  gateTwinUrls,
  getTwinVerdict,
  loadTwinVerdicts,
  measureTwin,
  nativeShare,
  scriptLetters,
  stripNeutral,
  type ChromeSlot,
  type ExamTwinInput,
  type Letters,
  type TwinSurface,
} from "@/lib/twin-localisation";

const db = vi.hoisted(() => ({ failNews: false }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    exam: {
      findMany: async () => [{ id: "e1", code: "SSC_CGL", name: "SSC Combined Graduate Level", shortName: "SSC CGL", description: null }],
    },
    examNewsItem: {
      findMany: async () => {
        if (db.failNews) throw new Error("Neon timeout");
        return [];
      },
    },
    examImportantDate: { findMany: async () => [] },
    examRankBand: { findMany: async () => [] },
    subject: { findMany: async () => [] },
    mock: { findMany: async () => [] },
    $queryRaw: async () => [],
  },
}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

const DAY = 86_400_000;
const now = new Date("2026-09-13T06:00:00Z");
const SITE = "https://shishya.in";

describe("script share", () => {
  it("counts native letters per locale and Latin letters; digits count for neither", () => {
    expect(scriptLetters("SSC CGL परीक्षा 2026", "hi")).toEqual({ native: 7, latin: 6 });
    expect(scriptLetters("తేదీ date", "te")).toEqual({ native: 4, latin: 4 });
    expect(scriptLetters("परीक्षा", "te").native).toBe(0);
  });

  it("strips exam names (longest first), case-insensitively, and URLs", () => {
    const out = stripNeutral("ssc combined graduate level: SSC CGL tier 1 https://ssc.gov.in/x", ["SSC CGL", "SSC Combined Graduate Level"]);
    expect(out).not.toMatch(/ssc|combined|https/i);
    expect(out).toMatch(/tier 1/);
  });

  it("is 0 with no letters and exactly 0.3 at 3:7", () => {
    expect(nativeShare({ native: 0, latin: 0 })).toBe(0);
    expect(nativeShare({ native: 3, latin: 7 })).toBeCloseTo(TWIN_MIN_SHARE, 12);
  });

  it("flips at the 30% threshold", () => {
    const c = TWIN_CHROME.updates;
    const fixedLatin = c.hi.latin + c.literalLatin + SITE_FRAME_LATIN;
    const budget = Math.floor(c.hi.native / TWIN_MIN_SHARE - c.hi.native - fixedLatin);
    expect(measureTwin("updates", "hi", ["a".repeat(budget)]).localised).toBe(true);
    expect(measureTwin("updates", "hi", ["a".repeat(budget + 1)]).localised).toBe(false);
  });

  it("proper nouns count for neither side", () => {
    const base = measureTwin("updates", "hi", []);
    const named = measureTwin("updates", "hi", ["SSC CGL Shishya"], { neutral: ["SSC CGL"] });
    expect(named.latin).toBe(base.latin);
  });

  it("the hub twin is an English page with a translated frame even with no DB text; the calendar fails on its labels", () => {
    for (const lc of ["hi", "te"] as const) {
      expect(measureTwin("hub", lc, []).localised).toBe(false);
      expect(measureTwin("hub", lc, [], { examWeek: true }).localised).toBe(false);
      expect(measureTwin("exam-calendar", lc, Array.from({ length: 100 }, () => "Tier 1 exam (expected)")).localised).toBe(false);
    }
  });

  it("the exam-week block adds Latin, never native letters", () => {
    for (const lc of ["hi", "te"] as const) {
      const off = measureTwin("updates", lc, []);
      const on = measureTwin("updates", lc, [], { examWeek: true });
      expect(on.native).toBe(off.native);
      expect(on.latin).toBe(off.latin + EXAM_WEEK_BLOCK_LATIN[lc] + EXAM_WEEK_BLOCK_LATIN.literalLatin);
      // Not rendered on the cutoff / estimator surfaces at all.
      expect(measureTwin("cutoff", lc, [], { examWeek: true }).latin).toBe(measureTwin("cutoff", lc, []).latin);
    }
  });

  it("a `when` section is credited only when its data is present", () => {
    const off = measureTwin("updates", "hi", []);
    const on = measureTwin("updates", "hi", [], { present: { dates: true } });
    expect(on.native - off.native).toBe(TWIN_CHROME.updates.when!.dates!.hi.native);
    expect(measureTwin("updates", "hi", [], { present: { cutoffTable: true } }).native).toBe(off.native);
  });
});

describe("exam surface texts + verdicts", () => {
  const exam = { code: "SSC_CGL", name: "SSC Combined Graduate Level", shortName: "SSC CGL", description: "Graduate-level recruitment." };
  const empty: ExamTwinInput = { exam, news: [], dates: [], results: [], cutoffContent: null, bands: [], syllabus: [], mockTitles: [] };

  it("mirrors the pages' reads: 5 news on the hub, 8 on the tracker; exam week from a typed row within ±7 IST days", () => {
    const news = Array.from({ length: 10 }, (_, i) => ({ title: `N${i}`, body: "b", publishedAt: new Date(now.getTime() - i * DAY) }));
    const t = examTwinTexts(
      { ...empty, news, dates: [{ label: "Tier 1", notes: null, kind: "EXAM", date: new Date(Date.UTC(2026, 8, 18)) }] },
      now,
    );
    expect(t.texts.hub.filter((x) => x.startsWith("N"))).toEqual(["N0 b", "N1 b", "N2 b", "N3 b", "N4 b"]);
    expect(t.texts.updates.filter((x) => x.startsWith("N"))).toHaveLength(8);
    expect(t.examWeek).toBe(true);
    expect(t.present).toEqual({ dates: true, cutoffTable: false });
    expect(t.neutral).toContain("SSC CGL");
    expect(examTwinTexts({ ...empty, dates: [{ label: "Tier 1", notes: null, kind: "EXAM", date: new Date(Date.UTC(2026, 9, 30)) }] }, now).examWeek).toBe(false);
  });

  it("the tracker repeats the 7 labels nearest today (FAQ answers + status chips)", () => {
    const dates = Array.from({ length: 10 }, (_, i) => ({ label: `L${i}`, notes: null, kind: "OTHER", date: new Date(Date.UTC(2026, 8, 10 + i)) }));
    const labels = examTwinTexts({ ...empty, dates }, now).texts.updates.filter((x) => /^L\d/.test(x.trim()));
    expect(labels.filter((x) => x.trim() === x)).toHaveLength(7); // the bare repeats
    expect(labels).toHaveLength(17); // 10 "label notes" rows + 7 repeats
  });

  it("a thin exam keeps its tracker twins; English news pushes them below 30%; the hub never passes", () => {
    const thin = examTwinVerdicts(empty, now);
    expect(thin.updates).toEqual(ALL_TWINS);
    expect(thin.hub).toEqual(NO_TWINS);
    const heavy = examTwinVerdicts(
      { ...empty, news: Array.from({ length: 8 }, (_, i) => ({ title: `Update ${i}`, body: "word ".repeat(125), publishedAt: now })) },
      now,
    );
    expect(heavy.updates).toEqual(NO_TWINS);
  });

  it("review case: an exam-week tracker with ~4,500 English letters of DB text is not a Hindi / Telugu page", () => {
    const words = (letters: number) => "abcde ".repeat(Math.ceil(letters / 5));
    const input: ExamTwinInput = {
      ...empty,
      news: Array.from({ length: 8 }, (_, i) => ({ title: `Tier 1 update ${i}`, body: words(330), publishedAt: new Date(now.getTime() - i * DAY) })),
      dates: [
        { label: "Tier 1 Exam", notes: null, kind: "EXAM", date: new Date(Date.UTC(2026, 8, 17)) },
        ...Array.from({ length: 19 }, (_, i) => ({ label: `Milestone ${i}`, notes: words(80), kind: "OTHER", date: new Date(Date.UTC(2026, 7, 1 + i)) })),
      ],
    };
    const t = examTwinTexts(input, now);
    expect(t.examWeek).toBe(true);
    const v = examTwinVerdicts(input, now);
    expect(v.updates).toEqual(NO_TWINS);
    expect(v.hub).toEqual(NO_TWINS);
    for (const lc of ["hi", "te"] as const) {
      expect(measureTwin("updates", lc, t.texts.updates, { neutral: t.neutral, examWeek: true, present: t.present }).share).toBeLessThan(0.2);
    }
  });

  it("calendar text: one label per exam day from today, week milestones only within 7 days, names stripped", () => {
    const row = (label: string, kind: string, isExamDay: boolean, daysFromToday: number, examId = "e1") => ({
      label,
      kind,
      isExamDay,
      date: new Date((Math.floor((now.getTime() + 5.5 * 3_600_000) / DAY) + daysFromToday) * DAY),
      examId,
      shortName: "SSC CGL",
    });
    const texts = calendarTwinTexts(
      [
        row("SSC CGL Tier 1", "EXAM", true, 3),
        row("SSC CGL Tier 1 again", "EXAM", true, 3),
        row("Past exam", "EXAM", true, -2),
        row("Admit card", "ADMIT_CARD", false, 5),
        row("Result", "RESULT", false, 20),
      ],
      [{ title: "SSC CGL admit card out", shortName: "SSC CGL" }],
      now,
    );
    expect(texts.map((t) => t.trim())).toEqual(["Tier 1", "Admit card", "admit card out"]);
  });
});

describe("DB loader fails closed", () => {
  beforeEach(() => {
    db.failNews = false;
  });

  it("a thin exam measured from successful reads keeps its tracker twins", async () => {
    const rows = await loadTwinVerdicts(["e1"], now);
    expect(rows[0].verdicts.updates).toEqual(ALL_TWINS);
    expect(await getTwinVerdict("updates", "e1")).toEqual(ALL_TWINS);
  });

  it("one failed read rejects the load — never an optimistic verdict from missing DB text — and pages get no twins", async () => {
    db.failNews = true;
    await expect(loadTwinVerdicts(["e1"], now)).rejects.toThrow("Neon timeout");
    expect(await getTwinVerdict("updates", "e1")).toEqual(NO_TWINS);
    expect(await getTwinVerdict("cutoff", "e1")).toEqual(NO_TWINS);
  });
});

describe("canonical + hreflang", () => {
  const p = "/exams/SSC_CGL/updates";

  it("declares only localised twins", () => {
    expect(Object.keys(languageAlternates(p))).toEqual(["en-IN", "hi-IN", "te-IN", "x-default"]);
    expect(languageAlternates(p, { hi: true, te: false })).toEqual({
      "en-IN": `${SITE}${p}`,
      "hi-IN": `${SITE}/hi${p}`,
      "x-default": `${SITE}${p}`,
    });
  });

  it("a twin below the threshold canonicalises to English; a localised twin stays self-canonical", () => {
    expect(twinCanonical(p, "hi", NO_TWINS)).toBe(`${SITE}${p}`);
    expect(twinCanonical(p, "hi", { hi: true, te: false })).toBe(`${SITE}/hi${p}`);
    expect(twinCanonical(p, "te", { hi: true, te: false })).toBe(`${SITE}${p}`);
    expect(twinCanonical(p, "en", NO_TWINS)).toBe(`${SITE}${p}`);
  });
});

describe("gateTwinUrls (sitemap / IndexNow)", () => {
  it("keeps English URLs, keeps a twin only on a localised verdict, drops unmeasured twins", () => {
    const urls = [
      `${SITE}/exams/SSC_CGL`,
      `${SITE}/exams/SSC_CGL/updates`,
      `${SITE}/exams/SSC_CGL/checklist`,
      `${SITE}/hi/exams/SSC_CGL`,
      `${SITE}/te/exams/SSC_CGL`,
      `${SITE}/hi/exams/SSC_CGL/updates`,
      `${SITE}/te/exams/SSC_CGL/updates`,
      `${SITE}/hi/exams/SSC_CGL/cutoff`,
      `${SITE}/hi/exam-calendar`,
      `${SITE}/hi/current-affairs`,
      `${SITE}/history`,
    ];
    const verdicts = new Map([["SSC_CGL", { hub: NO_TWINS, updates: { hi: true, te: false } }]]);
    expect(gateTwinUrls(urls, verdicts)).toEqual([
      `${SITE}/exams/SSC_CGL`,
      `${SITE}/exams/SSC_CGL/updates`,
      `${SITE}/exams/SSC_CGL/checklist`,
      `${SITE}/hi/exams/SSC_CGL/updates`,
      `${SITE}/history`,
    ]);
    expect(gateTwinUrls([`${SITE}/te/exam-calendar`], new Map(), { hi: false, te: true })).toEqual([`${SITE}/te/exam-calendar`]);
  });
});

// ── TWIN_CHROME calibration guard ──────────────────────────────────────
// Dictionary letters (non-hub surfaces) are EXACT: TWIN_RENDERED_KEYS summed
// over src/lib/i18n.ts in hi / te (English fallback when untranslated), a
// oneOf slot at its fewest native / most Latin letters. Every listed key must
// still be named by the page (or a component / helper it renders), and no
// interaction-only string may be listed.
// literalLatin = Latin letters of JSX text and ≥4-word string literals in the
// page and the @/components it imports (ExamWeekBlock and LangTwinLinks
// measured separately / excluded) — a heuristic, so the guard allows
// max(35%, 300 letters) of drift. The hub's dictionary letters stay the
// union-of-keys upper bound under the same tolerance.

const ROOT = process.cwd();
const en = dict.en as Record<string, string>;
const enKeys = Object.keys(en);
const latinCount = (s: string) => (s.match(/[A-Za-z]/g) ?? []).length;
const nativeCount = (s: string, lc: "hi" | "te") => (s.match(lc === "hi" ? /[ऀ-ॿ]/g : /[ఀ-౿]/g) ?? []).length;
const localeDict = (lc: "hi" | "te") => (dict as unknown as Record<string, Record<string, string>>)[lc];

function keyLetters(keys: readonly string[], lc: "hi" | "te"): Letters {
  let native = 0;
  let latin = 0;
  for (const k of keys) {
    const v = localeDict(lc)[k] ?? en[k];
    native += nativeCount(v, lc);
    latin += latinCount(v);
  }
  return { native, latin };
}

function slotsLetters(slots: readonly ChromeSlot[], lc: "hi" | "te"): Letters {
  const out = { native: 0, latin: 0 };
  for (const s of slots) {
    if (typeof s === "string") {
      const l = keyLetters([s], lc);
      out.native += l.native;
      out.latin += l.latin;
    } else {
      const vs = s.oneOf.map((v) => keyLetters(v, lc));
      out.native += Math.min(...vs.map((v) => v.native));
      out.latin += Math.max(...vs.map((v) => v.latin));
    }
  }
  return out;
}

const slotKeys = (slots: readonly ChromeSlot[]) => slots.flatMap((s) => (typeof s === "string" ? [s] : s.oneOf.flat()));

function dictKeysIn(src: string): Set<string> {
  const out = new Set<string>();
  for (const m of src.matchAll(/["'`]([a-zA-Z][\w-]*(?:\.[\w-]+)+)["'`]/g)) if (m[1] in en) out.add(m[1]);
  for (const m of src.matchAll(/`([a-zA-Z][\w-]*(?:\.[\w-]+)*\.)\$\{/g)) for (const k of enKeys) if (k.startsWith(m[1])) out.add(k);
  return out;
}

function literalLatin(src: string): number {
  const s = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1")
    .replace(/className=("[^"]*"|\{`[^`]*`\})/g, "");
  let n = 0;
  for (const m of s.matchAll(/[>}]([^<>{}]+)(?=[<{])/g)) {
    const t = m[1].trim();
    if (/[A-Za-z]{2}/.test(t) && !/[;=()]|=>|&&|\|\|/.test(t) && (/\s/.test(t) || /^[A-Z]/.test(t))) n += latinCount(t);
  }
  for (const m of s.matchAll(/"([^"\n]{12,})"/g)) {
    const words = m[1].split(/\s+/);
    if (words.length >= 4 && words.filter((w) => /[-:/]/.test(w)).length < words.length / 3 && !(m[1] in en)) n += latinCount(m[1]);
  }
  return n;
}

const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const readComponent = (name: string) => {
  for (const ext of [".tsx", ".ts", "/index.tsx"]) {
    const f = path.join(ROOT, "src/components", name + ext);
    if (fs.existsSync(f)) return fs.readFileSync(f, "utf8");
  }
  return "";
};

/** The page + the @/components it imports (ExamWeekBlock / LangTwinLinks excluded). */
function pageBundle(pageRel: string): string {
  const page = read(pageRel);
  const comps = [...page.matchAll(/from\s+"@\/components\/([\w/-]+)"/g)].map((m) => m[1]).filter((c) => !/ExamWeekBlock|LangTwinLinks/.test(c));
  return [page, ...comps.map(readComponent)].join("\n");
}

const within = (measured: number, pinned: number) => Math.abs(measured - pinned) <= Math.max(0.35 * pinned, 300);

const PAGES: Record<TwinSurface, string> = {
  hub: "src/app/exams/[code]/page.tsx",
  updates: "src/app/exams/[code]/updates/page.tsx",
  cutoff: "src/app/exams/[code]/cutoff/page.tsx",
  "score-estimate": "src/app/exams/[code]/score-estimate/page.tsx",
  "exam-calendar": "src/app/exam-calendar/page.tsx",
};
/** Label helpers a page renders strings through. */
const HELPERS = ["src/lib/exam-week-inputs.ts"];

/** Strings that exist only after interaction or mount client-side. */
const INTERACTION_ONLY = [
  "tracker.alert.done",
  "tracker.alert.invalid",
  "tracker.alert.err",
  "tracker.alert.email",
  "ew.alert.done",
  "ew.verdict.thanks",
  "ew.signup.nudge",
  "ew.share.copied",
  "ew.score.result",
  "ew.score.pct",
  "ew.score.invalid",
  "pulse.updates.prompt",
  "pulse.updates.c1",
  "pulse.updates.c2",
  "pulse.updates.c3",
  "cutoff.nudge.title",
  "cutoff.nudge.body",
  "cutoff.nudge.cta",
];

describe("TWIN_CHROME matches src/lib/i18n.ts and the page sources", () => {
  for (const [surface, spec] of Object.entries(TWIN_RENDERED_KEYS) as [Exclude<TwinSurface, "hub">, (typeof TWIN_RENDERED_KEYS)["updates"]][]) {
    it(`${surface}: rendered-key letters are exact`, () => {
      const pinned = TWIN_CHROME[surface];
      for (const lc of ["hi", "te"] as const) {
        expect(pinned[lc]).toEqual(slotsLetters(spec.always, lc));
        for (const [cond, slots] of Object.entries(spec.when ?? {})) {
          expect(pinned.when?.[cond as "dates"]?.[lc]).toEqual(slotsLetters(slots!, lc));
        }
      }
      expect(Object.keys(pinned.when ?? {}).sort()).toEqual(Object.keys(spec.when ?? {}).sort());
    });

    it(`${surface}: every listed key is rendered by the page; no interaction-only string is listed`, () => {
      const named = dictKeysIn([pageBundle(PAGES[surface]), ...HELPERS.map(read)].join("\n"));
      const listed = [...slotKeys(spec.always), ...Object.values(spec.when ?? {}).flatMap((s) => slotKeys(s!))];
      for (const k of listed) {
        expect(k in en, `${k} is not a dictionary key`).toBe(true);
        expect(named.has(k), `${k} is no longer named by ${PAGES[surface]}`).toBe(true);
      }
      expect(listed.filter((k) => INTERACTION_ONLY.includes(k))).toEqual([]);
    });
  }

  for (const [surface, rel] of Object.entries(PAGES) as [TwinSurface, string][]) {
    it(`${surface}: hard-coded English (${rel})`, () => {
      const measured = literalLatin(pageBundle(rel));
      expect(within(measured, TWIN_CHROME[surface].literalLatin), JSON.stringify({ measured, pinned: TWIN_CHROME[surface].literalLatin })).toBe(true);
    });
  }

  it("hub: union-of-keys dictionary letters (upper bound)", () => {
    const keys = [...dictKeysIn(pageBundle(PAGES.hub))];
    for (const lc of ["hi", "te"] as const) {
      const m = keyLetters(keys, lc);
      const report = JSON.stringify({ measured: m, pinned: TWIN_CHROME.hub[lc] });
      expect(within(m.native, TWIN_CHROME.hub[lc].native), report).toBe(true);
      expect(within(m.latin, TWIN_CHROME.hub[lc].latin), report).toBe(true);
    }
  });

  it("score-estimate libLatin covers the marking-scheme refusal reasons", () => {
    const reasons = [
      ...Object.values(UNEQUAL_PAPER_EXAMS),
      markingSchemeVerdict(
        { code: "SBI_PO", name: "SBI Probationary Officer (Prelims)", shortName: "SBI PO", totalQuestions: 100, scoredQuestions: null, totalMarks: 100, marksPerQ: 1, description: "" },
        { rowLabel: "Mains Exam", rowDate: new Date("2026-09-12T00:00:00Z") },
      ).reason,
      markingSchemeVerdict({ code: "X", name: "N", shortName: "SSC CGL", totalQuestions: 150, scoredQuestions: 120, totalMarks: 300, marksPerQ: 1.37, description: "" }).reason,
      markingSchemeVerdict({
        code: "X",
        name: "N",
        shortName: "SSC CGL",
        totalQuestions: 100,
        scoredQuestions: null,
        totalMarks: 200,
        marksPerQ: 2,
        description: "Paper 1 100 marks, Paper 2 60 marks, Paper 3 40 marks",
      }).reason,
    ].map((r) => r ?? "");
    for (const r of reasons) expect(latinCount(r), r).toBeLessThanOrEqual(TWIN_CHROME["score-estimate"].libLatin ?? 0);
  });

  it("ExamWeekBlock Latin and the site footer", () => {
    const src = read("src/components/ExamWeekBlock.tsx");
    const keys = [...dictKeysIn(src)];
    const report = JSON.stringify({ hi: keyLetters(keys, "hi").latin, te: keyLetters(keys, "te").latin, literal: literalLatin(src), pinned: EXAM_WEEK_BLOCK_LATIN });
    expect(within(keyLetters(keys, "hi").latin, EXAM_WEEK_BLOCK_LATIN.hi), report).toBe(true);
    expect(within(keyLetters(keys, "te").latin, EXAM_WEEK_BLOCK_LATIN.te), report).toBe(true);
    expect(within(literalLatin(src), EXAM_WEEK_BLOCK_LATIN.literalLatin), report).toBe(true);
    expect(within(literalLatin(read("src/components/SiteFooter.tsx")), SITE_FRAME_LATIN)).toBe(true);
  });
});
