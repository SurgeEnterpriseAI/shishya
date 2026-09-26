// /mock-tests (26 Sep 2026) — src/lib/mock-catalogue.ts as tests.
//
// The page lists every active real exam with a shared mock, grouped by
// category and state, with computed counts, written languages and the next
// exam date with its tier. These tests pin:
//   • the hub's mock list, mirrored exactly (40 by createdAt + the
//     full-pattern paper; live-test papers and question-less mocks never
//     counted);
//   • the next-exam cell: the hub title's decision (announced / revision /
//     held), then an expected month only for the exam's own written paper,
//     else "not announced yet" — and every dated branch carries its tier;
//   • grouping, totals and every sentence (title, H1, lead, description,
//     FAQ) over a matrix of totals, so the copy is true on every render;
//   • the JSON-LD (valid shapes, absolute URLs, FAQ word for word);
//   • the sitemap entry (lastmod only from a real Date);
//   • robots: "/mock-tests" is fetchable by every crawler group and does not
//     match the "/mocks/" disallow prefix (the real robots() rules, through
//     an RFC 9309 evaluator).
// The copy was also run over the production rows (read-only,
// scripts/tmp-w2-mocktests-page.ts, 26 Sep 2026): 168 exams, 1,030 mocks,
// matching a direct SQL count.
// Pure: no DB, no network.

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import robots from "@/app/robots";
import { hubTitleDay } from "@/lib/hub-title";
import { INDIAN_LANGUAGE_COUNT } from "@/lib/languages";
import {
  CATEGORY_GROUPS,
  FULL_PATTERN_GENERATOR,
  HUB_MOCK_LIST_CAP,
  LIVE_TEST_GENERATOR,
  MOCK_TESTS_PATH,
  buildMockCatalogue,
  catalogueRows,
  countedMockIds,
  countedMocksByExam,
  examMocksHref,
  hubListedMocks,
  jsonLdText,
  languagesText,
  mockCatalogueDescription,
  mockCatalogueFaq,
  mockCatalogueHeading,
  mockCatalogueJsonLd,
  mockCatalogueLead,
  mockCatalogueTitle,
  mockTestsSitemapEntries,
  monthLabel,
  nextExamOf,
  nextExamParts,
  nextExamText,
  stateExamsHref,
  type CatalogueDateRow,
  type CatalogueExam,
  type CatalogueMock,
  type MockCatalogueInput,
  type MockCatalogueTotals,
  type NextExam,
} from "@/lib/mock-catalogue";

const NOW = new Date("2026-09-26T06:00:00.000Z"); // 11:30 IST, 26 Sep 2026
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function mock(id: string, examId: string, createdAt: string, over: Partial<CatalogueMock> = {}): CatalogueMock {
  return { id, examId, generatedBy: "system:full-mock:1", createdAt: new Date(createdAt), questionCount: 25, ...over };
}

// ── The hub's mock list ──────────────────────────────────────────────────

describe("hubListedMocks mirrors getExamShared's list", () => {
  const many = Array.from({ length: 45 }, (_, i) =>
    mock(`m${String(i).padStart(2, "0")}`, "e1", `2026-01-${String((i % 28) + 1).padStart(2, "0")}T0${i % 10}:00:00Z`),
  );

  it("takes the first HUB_MOCK_LIST_CAP by createdAt, ties broken by id", () => {
    const listed = hubListedMocks([...many].reverse());
    expect(HUB_MOCK_LIST_CAP).toBe(40);
    expect(listed).toHaveLength(40);
    const times = listed.map((m) => new Date(m.createdAt).getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it("adds the full-pattern paper when the cap dropped it, first — and never twice", () => {
    const newest = mock("fp", "e1", "2026-09-01T00:00:00Z", { generatedBy: FULL_PATTERN_GENERATOR });
    const listed = hubListedMocks([...many, newest]);
    expect(listed).toHaveLength(41);
    expect(listed[0].id).toBe("fp");
    const early = mock("fp", "e1", "2025-01-01T00:00:00Z", { generatedBy: FULL_PATTERN_GENERATOR });
    const listed2 = hubListedMocks([...many, early]);
    expect(listed2).toHaveLength(40);
    expect(listed2.filter((m) => m.id === "fp")).toHaveLength(1);
  });

  it("counts no live-test paper and no mock whose questions are gone; an exam left with none is absent", () => {
    const byExam = countedMocksByExam([
      mock("a", "e1", "2026-01-01T00:00:00Z"),
      mock("b", "e1", "2026-01-02T00:00:00Z", { generatedBy: LIVE_TEST_GENERATOR }),
      mock("c", "e1", "2026-01-03T00:00:00Z", { questionCount: 0 }),
      mock("d", "e2", "2026-01-01T00:00:00Z", { questionCount: 0 }),
    ]);
    expect(byExam.get("e1")?.map((m) => m.id)).toEqual(["a"]);
    expect(byExam.has("e2")).toBe(false);
    expect(countedMockIds([mock("a", "e1", "2026-01-01T00:00:00Z"), mock("z", "e3", "2026-01-01T00:00:00Z", { questionCount: 0 })])).toEqual(["a"]);
  });
});

// ── Next exam ────────────────────────────────────────────────────────────

const EXAM = { code: "SSC_TEST", shortName: "SSC Test", name: "SSC Test Exam" };
let rid = 0;
function row(iso: string, over: Partial<CatalogueDateRow> = {}): CatalogueDateRow {
  rid += 1;
  return {
    id: `r${String(rid).padStart(3, "0")}`,
    examId: "e1",
    label: "Written exam",
    date: day(iso),
    isExamDay: true,
    kind: "EXAM",
    confidence: "official",
    url: "https://ssc.gov.in/notice.pdf",
    notes: null,
    source: null,
    createdAt: new Date("2026-08-01T00:00:00Z"),
    ...over,
  };
}

describe("nextExamOf — the hub title's decision, then an expected month", () => {
  it("an announced next day on the conducting body's site is official", () => {
    const n = nextExamOf([row("2026-09-30")], EXAM, null, NOW);
    expect(n).toEqual({ kind: "announced", date: day("2026-09-30"), tier: "official" });
  });

  it("an announced day cited from a news site is reported", () => {
    const n = nextExamOf([row("2026-10-04", { url: "https://www.jagranjosh.com/news/x" })], EXAM, null, NOW);
    expect(n).toMatchObject({ kind: "announced", tier: "reported" });
  });

  it("the exam's own portal (ExamEligibility.officialUrl) widens the official tier", () => {
    const n = nextExamOf([row("2026-10-04", { url: "https://sscportal.example.com/n.pdf" })], EXAM, "https://sscportal.example.com", NOW);
    expect(n).toMatchObject({ kind: "announced", tier: "official" });
  });

  it("two announced days for the same stage, written in different refreshes, are 'under revision'", () => {
    const n = nextExamOf(
      [
        row("2026-10-10", { label: "Prelims exam", createdAt: new Date("2026-08-01T00:00:00Z") }),
        row("2026-11-05", { label: "Prelims exam (revised)", createdAt: new Date("2026-09-10T00:00:00Z") }),
      ],
      EXAM,
      null,
      NOW,
    );
    expect(n).toEqual({ kind: "revision" });
  });

  it("an announced sitting held in the last 60 days, with nothing ahead, is 'held'", () => {
    const n = nextExamOf([row("2026-09-13")], EXAM, null, NOW);
    expect(n).toMatchObject({ kind: "held", tier: "official", verb: "held", stage: null });
  });

  it("with nothing announced, the earliest upcoming expected exam day gives its month only", () => {
    const n = nextExamOf(
      [row("2027-01-20", { confidence: "expected", url: null }), row("2026-12-14", { confidence: "expected", url: null, label: "Exam (expected)" })],
      EXAM,
      null,
      NOW,
    );
    expect(n).toEqual({ kind: "expected", month: "2026-12" });
  });

  it("an announced day beats an earlier expected one", () => {
    const n = nextExamOf([row("2026-10-01", { confidence: "expected", url: null }), row("2026-11-15")], EXAM, null, NOW);
    expect(n).toMatchObject({ kind: "announced", date: day("2026-11-15") });
  });

  it("no estimate for another body's exam, a physical test, a called-off sitting or a passed date", () => {
    const est = { confidence: "expected", url: null } as const;
    for (const r of [
      row("2026-12-01", { ...est, label: "UPSC CSE Prelims exam" }),
      row("2026-12-01", { ...est, label: "PET/PST" }),
      row("2026-12-01", { ...est, label: "Written exam (postponed)" }),
      row("2026-09-01", { ...est }),
      row("2026-12-01", { ...est, kind: "RESULT", isExamDay: false, label: "Result" }),
    ]) {
      expect(nextExamOf([r], EXAM, null, NOW)).toEqual({ kind: "none" });
    }
    expect(nextExamOf([], EXAM, null, NOW)).toEqual({ kind: "none" });
  });
});

describe("nextExamParts / nextExamText — every date carries its tier", () => {
  const cases: NextExam[] = [
    { kind: "announced", date: day("2026-09-30"), tier: "official" },
    { kind: "announced", date: day("2026-10-04"), tier: "reported" },
    { kind: "revision" },
    { kind: "held", date: day("2026-09-13"), tier: "reported", verb: "held", stage: "prelims" },
    { kind: "held", date: day("2026-08-21"), tier: "official", verb: "began", stage: "mains" },
    { kind: "expected", month: "2026-12" },
    { kind: "none" },
  ];

  it("a printed date always has a tier; the expected branch says it is not announced", () => {
    for (const n of cases) {
      const p = nextExamParts(n);
      if (p.date) expect(p.tier).not.toBeNull();
      if (p.tier === "expected") expect(p.tail).toBe("not announced yet");
      expect(nextExamText(n)).not.toMatch(/undefined|null|\{/);
    }
  });

  it("the exact wording", () => {
    expect(nextExamText(cases[0])).toBe(`Next exam: ${hubTitleDay(day("2026-09-30"))} (official)`);
    expect(nextExamText(cases[2])).toBe("Next exam date under revision — see the exam page");
    expect(nextExamText(cases[3])).toBe(`Prelims held ${hubTitleDay(day("2026-09-13"))} (reported) — next date not announced yet`);
    expect(nextExamText(cases[4])).toMatch(/^Mains began .*2026 \(official\) — next date not announced yet$/);
    expect(nextExamText(cases[5])).toBe(`Next exam expected around ${monthLabel("2026-12")} (expected) — not announced yet`);
    expect(monthLabel("2026-12")).toMatch(/^Dec\w* 2026$/);
    expect(nextExamText(cases[6])).toBe("Next exam date not announced yet");
  });
});

// ── The catalogue ────────────────────────────────────────────────────────

function exam(id: string, code: string, category: string, state: string | null = null): CatalogueExam {
  return { id, code, shortName: code.replace(/_/g, " "), name: `${code} full name`, category, state };
}

function input(over: Partial<MockCatalogueInput> = {}): MockCatalogueInput {
  const exams = [
    exam("e1", "SSC_CGL", "GOVT_JOBS"),
    exam("e2", "IBPS_PO", "BANKING"),
    exam("e3", "MP_TET", "STATE_LEVEL", "MP"),
    exam("e4", "AP_EAMCET", "STATE_LEVEL", "AP"),
    exam("e5", "DL_DSSSB", "STATE_LEVEL", "DL"),
    exam("e6", "XX_ODD", "STATE_LEVEL", null),
    exam("e7", "NCERT_C09", "SCHOOL_BOARD"),
    exam("e8", "NO_MOCKS", "BANKING"),
    exam("e9", "NEW_KIND", "FUTURE_CATEGORY"),
    exam("e10", "SBI_PO", "BANKING"),
  ];
  const mocks = [
    mock("m1", "e1", "2026-01-01T00:00:00Z"),
    mock("m2", "e1", "2026-01-02T00:00:00Z"),
    mock("m3", "e2", "2026-01-01T00:00:00Z"),
    mock("m4", "e3", "2026-01-01T00:00:00Z"),
    mock("m5", "e4", "2026-01-01T00:00:00Z"),
    mock("m6", "e5", "2026-01-01T00:00:00Z"),
    mock("m7", "e6", "2026-01-01T00:00:00Z"),
    mock("m8", "e7", "2026-01-01T00:00:00Z"),
    mock("m9", "e9", "2026-01-01T00:00:00Z"),
    mock("m10", "e1", "2026-01-03T00:00:00Z", { generatedBy: LIVE_TEST_GENERATOR }),
    mock("m11", "e10", "2026-01-01T00:00:00Z"),
  ];
  const questionStats = ["e1", "e2", "e3", "e4", "e5", "e6", "e7", "e9", "e10"].map((id, i) => ({
    examId: id,
    questions: 10 * (i + 1),
    languages: id === "e3" ? ["HI", "EN"] : ["EN"],
  }));
  return { exams, mocks, questionStats, dateRows: [row("2026-09-30", { examId: "e1" })], officialUrls: new Map(), ...over };
}

describe("buildMockCatalogue", () => {
  const c = buildMockCatalogue(input(), NOW);
  const rows = catalogueRows(c);

  it("lists only real exams with a counted mock; never a school container", () => {
    expect(rows.map((r) => r.code).sort()).toEqual(["AP_EAMCET", "DL_DSSSB", "IBPS_PO", "MP_TET", "NEW_KIND", "SBI_PO", "SSC_CGL", "XX_ODD"]);
  });

  it("national groups in the fixed order (unknown categories after), then states by name, then the stateless", () => {
    expect(c.groups.map((g) => g.key)).toEqual(["govt-jobs", "banking", "future-category", "state-ap", "state-dl", "state-mp", "state-other"]);
    expect(c.groups.map((g) => g.label)).toEqual(["Central government exams", "Banking", "Future category", "Andhra Pradesh", "Delhi", "Madhya Pradesh", "Other state exams"]);
    expect(c.groups.find((g) => g.key === "banking")!.rows.map((r) => r.code)).toEqual(["IBPS_PO", "SBI_PO"]);
    for (const g of CATEGORY_GROUPS) expect(g.label).not.toMatch(/\{|undefined/);
  });

  it("row counts: the hub's mocks (no live-test paper), the question stat, English first", () => {
    const cgl = rows.find((r) => r.code === "SSC_CGL")!;
    expect(cgl.mocks).toBe(2);
    expect(cgl.questions).toBe(10);
    expect(cgl.next).toMatchObject({ kind: "announced", tier: "official" });
    const tet = rows.find((r) => r.code === "MP_TET")!;
    expect(tet.languages).toEqual(["EN", "HI"]);
    expect(languagesText(tet.languages)).toBe("English, Hindi");
    expect(rows.find((r) => r.code === "IBPS_PO")!.next).toEqual({ kind: "none" });
  });

  it("totals are the sums of the listed rows; union territories are counted apart", () => {
    const t = c.totals;
    expect(t.exams).toBe(rows.length);
    expect(t.mocks).toBe(rows.reduce((a, r) => a + r.mocks, 0));
    expect(t.questions).toBe(rows.reduce((a, r) => a + r.questions, 0));
    expect(t.nationalExams + t.stateExams).toBe(t.exams);
    expect(t.nationalExams).toBe(4);
    expect(t.stateExams).toBe(4);
    expect(t.states).toBe(2); // AP, MP
    expect(t.unionTerritories).toBe(1); // DL
  });

  it("links: each row to its hub's #mocks, each state group to its state index", () => {
    expect(examMocksHref("MP_TET")).toBe("/exams/MP_TET#mocks");
    expect(stateExamsHref("MP")).toBe("/exams/state/madhya-pradesh");
    expect(stateExamsHref(null)).toBeNull();
    expect(stateExamsHref("ZZ")).toBeNull();
  });
});

// ── Copy over a matrix of totals ─────────────────────────────────────────

const TOTALS: MockCatalogueTotals[] = [
  { exams: 168, mocks: 1030, questions: 30173, nationalExams: 40, stateExams: 128, states: 28, unionTerritories: 8 },
  { exams: 1, mocks: 1, questions: 1, nationalExams: 1, stateExams: 0, states: 0, unionTerritories: 0 },
  { exams: 3, mocks: 7, questions: 250, nationalExams: 0, stateExams: 3, states: 1, unionTerritories: 0 },
  { exams: 2, mocks: 2, questions: 40, nationalExams: 0, stateExams: 2, states: 0, unionTerritories: 1 },
  { exams: 2, mocks: 5, questions: 100000, nationalExams: 1, stateExams: 1, states: 0, unionTerritories: 0 },
  { exams: 0, mocks: 0, questions: 0, nationalExams: 0, stateExams: 0, states: 0, unionTerritories: 0 },
];

describe("title, H1, lead, description and FAQ are true for every totals shape", () => {
  it("the production totals read as expected", () => {
    const t = TOTALS[0];
    expect(mockCatalogueTitle(t)).toBe("Free mock tests for 168 exams in India — by category and state | Shishya");
    expect(mockCatalogueHeading(t)).toBe("Free mock tests for 168 exams in India");
    expect(mockCatalogueLead(t)).toBe(
      "Shishya has 1,030 free mock tests for 168 exams in India — 40 national-level exams and 128 state exams from 28 states and 8 union territories — " +
        "with 30,173 practice questions across them. Where an exam's next date is known, it is marked official, reported or expected.",
    );
  });

  it("singulars, missing parts and Indian digit grouping", () => {
    expect(mockCatalogueLead(TOTALS[1])).toMatch(/^Shishya has 1 free mock test for 1 exam in India — 1 national-level exam — with 1 practice question across them\./);
    expect(mockCatalogueLead(TOTALS[2])).toContain("— 3 state exams from 1 state —");
    expect(mockCatalogueLead(TOTALS[3])).toContain("— 2 state exams from 1 union territory —");
    expect(mockCatalogueLead(TOTALS[4])).toContain("— 1 national-level exam and 1 state exam —");
    expect(mockCatalogueLead(TOTALS[4])).toContain("1,00,000 practice questions");
    expect(mockCatalogueTitle(TOTALS[1])).toContain("for 1 exam in India");
  });

  it("no placeholder, no NaN, no typed count; the description fits and ends a sentence", () => {
    for (const t of TOTALS) {
      for (const s of [mockCatalogueTitle(t), mockCatalogueHeading(t), mockCatalogueLead(t), mockCatalogueDescription(t), mockCatalogueFaq(t).answer]) {
        expect(s).not.toMatch(/\{|\}|NaN|undefined|null|\s{2}/);
      }
      const d = mockCatalogueDescription(t);
      expect(d.length).toBeLessThanOrEqual(300);
      expect(d).toMatch(/[.…]$/);
      // Every number in the lead is one of the totals (Indian grouping).
      const allowed = new Set(Object.values(t).map((n) => n.toLocaleString("en-IN")));
      for (const n of mockCatalogueLead(t).match(/\d[\d,]*/g) ?? []) expect(allowed.has(n)).toBe(true);
    }
  });

  it("the FAQ states the computed mock count and the computed language count, and makes no pattern claim", () => {
    const f = mockCatalogueFaq(TOTALS[0]);
    expect(f.question).toBe("Are the mock tests on Shishya free?");
    expect(f.answer).toContain("All 1,030 mock tests listed on this page are free");
    expect(f.answer).toContain(`into ${INDIAN_LANGUAGE_COUNT} Indian languages`);
    expect(f.answer).toContain("not the real exam papers");
    expect(f.answer).not.toMatch(/\bmarks\b|\bminutes\b|negative|answer check|verified/i);
    expect(mockCatalogueFaq(TOTALS[1]).answer).toContain("All 1 mock test listed");
  });
});

// ── JSON-LD ──────────────────────────────────────────────────────────────

describe("mockCatalogueJsonLd", () => {
  const c = buildMockCatalogue(input(), NOW);
  const ld = mockCatalogueJsonLd(c);
  const byType = (t: string) => ld.find((d) => d["@type"] === t) as Record<string, any>;

  it("CollectionPage, ItemList, FAQPage and BreadcrumbList, each with a schema.org context", () => {
    expect(ld.map((d) => d["@type"])).toEqual(["CollectionPage", "ItemList", "FAQPage", "BreadcrumbList"]);
    for (const d of ld) expect(d["@context"]).toBe("https://schema.org");
    expect(byType("CollectionPage").url).toBe(`https://shishya.in${MOCK_TESTS_PATH}`);
    expect(byType("CollectionPage").mainEntity["@id"]).toBe(byType("ItemList")["@id"]);
    expect(byType("CollectionPage").description).toBe(mockCatalogueDescription(c.totals));
  });

  it("the ItemList: one item per listed exam, positions 1..n, absolute hub URLs, in display order", () => {
    const list = byType("ItemList");
    const rows = catalogueRows(c);
    expect(list.numberOfItems).toBe(rows.length);
    expect(list.itemListElement).toHaveLength(rows.length);
    list.itemListElement.forEach((it: any, i: number) => {
      expect(it["@type"]).toBe("ListItem");
      expect(it.position).toBe(i + 1);
      expect(it.url).toBe(`https://shishya.in/exams/${rows[i].code}`);
      expect(it.name).toBe(`${rows[i].shortName} mock tests`);
    });
  });

  it("the FAQPage is the visible FAQ, word for word", () => {
    const f = mockCatalogueFaq(c.totals);
    const q = byType("FAQPage").mainEntity;
    expect(q).toHaveLength(1);
    expect(q[0]).toEqual({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } });
  });

  it("an empty catalogue carries only the breadcrumb (no list, no FAQ the page does not show)", () => {
    const empty = buildMockCatalogue(input({ mocks: [] }), NOW);
    expect(empty.totals.exams).toBe(0);
    expect(mockCatalogueJsonLd(empty).map((d) => d["@type"])).toEqual(["BreadcrumbList"]);
  });

  it("serialises safely inside a <script> tag", () => {
    const s = jsonLdText({ a: "</script><b>&" });
    expect(s).not.toContain("<");
    expect(s).not.toContain(">");
    expect(JSON.parse(s)).toEqual({ a: "</script><b>&" });
    for (const d of ld) expect(() => JSON.parse(jsonLdText(d))).not.toThrow();
  });
});

// ── Sitemap entry ────────────────────────────────────────────────────────

describe("mockTestsSitemapEntries", () => {
  it("one absolute URL; lastmod only from a real Date", () => {
    const at = new Date("2026-09-20T10:00:00Z");
    expect(mockTestsSitemapEntries("https://shishya.in", at)).toEqual([
      { url: "https://shishya.in/mock-tests", changeFrequency: "daily", priority: 0.9, lastModified: at },
    ]);
    for (const bad of [null, undefined, new Date("nope")]) {
      const [e] = mockTestsSitemapEntries("https://shishya.in", bad);
      expect(e).not.toHaveProperty("lastModified");
      expect(e.url).toBe("https://shishya.in/mock-tests");
    }
  });
});

// ── robots: /mock-tests is fetchable, /mocks/ stays private ───────────────

type Rule = { userAgent?: string | string[]; allow?: string | string[]; disallow?: string | string[] };
const list = (x: string | string[] | undefined): string[] => ([] as string[]).concat(x ?? []);

/** RFC 9309 path pattern: "*" any run, trailing "$" end anchor, a prefix match otherwise. */
function patternRe(p: string): RegExp {
  const anchored = p.endsWith("$");
  const body = (anchored ? p.slice(0, -1) : p)
    .split("*")
    .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`);
}

function groupFor(rules: Rule[], ua: string): Rule[] {
  const named = rules.filter((r) => list(r.userAgent).some((a) => a.toLowerCase() === ua.toLowerCase()));
  return named.length ? named : rules.filter((r) => list(r.userAgent).includes("*"));
}

/** Longest matching rule wins; allow wins a tie; no match = allowed. */
function allowed(rules: Rule[], ua: string, p: string): boolean {
  let best: { len: number; allow: boolean } | null = null;
  for (const r of groupFor(rules, ua)) {
    for (const [pats, allow] of [
      [list(r.allow), true],
      [list(r.disallow), false],
    ] as const) {
      for (const pat of pats) {
        if (!pat || !patternRe(pat).test(p)) continue;
        if (!best || pat.length > best.len || (pat.length === best.len && allow && !best.allow)) best = { len: pat.length, allow };
      }
    }
  }
  return best ? best.allow : true;
}

describe("robots.txt: /mock-tests is public, /mocks/ is not", () => {
  const r = robots();
  const RULES = (Array.isArray(r.rules) ? r.rules : [r.rules]) as Rule[];
  const AGENTS = ["Googlebot", "Bingbot", "OAI-SearchBot", "ChatGPT-User", "GPTBot", "PerplexityBot", "ClaudeBot", "Claude-SearchBot", "Applebot", "CCBot", "DuckAssistBot"];

  it("'/mock-tests' does not match the '/mocks/' disallow prefix", () => {
    expect(patternRe("/mocks/").test(MOCK_TESTS_PATH)).toBe(false);
    for (const rule of RULES) for (const d of list(rule.disallow)) expect(patternRe(d).test(MOCK_TESTS_PATH)).toBe(false);
  });

  it("every crawler group may fetch /mock-tests (and its jump anchors) but not a mock itself", () => {
    for (const ua of AGENTS) {
      expect(allowed(RULES, ua, MOCK_TESTS_PATH)).toBe(true);
      expect(allowed(RULES, ua, "/exams/SSC_CGL")).toBe(true);
      expect(allowed(RULES, ua, "/mocks/abc123")).toBe(false);
    }
  });
});

// ── Source checks on the page ────────────────────────────────────────────

describe("the /mock-tests page file", () => {
  const src = fs.readFileSync(path.join(process.cwd(), "src/app/mock-tests/page.tsx"), "utf8");

  it("is one static ISR page — no per-exam route family, no cookie / header / session read", () => {
    const dir = path.join(process.cwd(), "src/app/mock-tests");
    expect(fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)).toEqual([]);
    expect(src).toMatch(/export const revalidate = \d+/);
    expect(src).not.toMatch(/\bcookies\(|\bheaders\(|\bauth\(|getServerSession/);
  });

  it("renders the computed copy and the hub links from the lib, never typed counts", () => {
    for (const fn of ["mockCatalogueHeading", "mockCatalogueLead", "mockCatalogueFaq", "mockCatalogueJsonLd", "examMocksHref", "nextExamParts"]) {
      expect(src).toContain(fn);
    }
    expect(src).not.toMatch(/\b\d{3,}\s+(?:mock|exam|question)/i);
  });
});
