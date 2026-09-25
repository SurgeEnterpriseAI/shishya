// The PYQ year page's "whole paper" links (25 Sep 2026): which full-length
// mock and which official papers a year page links, and the copy that
// labels them. Pure — no DB, no network.
// Run: npx vitest run tests/unit/pyq-full-paper.test.ts

import { describe, it, expect } from "vitest";
import {
  FULL_LENGTH_RATIO,
  HUB_FULL_PATTERN,
  OTHER_YEAR_PAPERS_MAX,
  PLAYER_DEFAULT_MIN,
  PYQ_FULL_PAPER_COPY,
  fullMockFaqNote,
  hasWholePaperLinks,
  isQuestionPaper,
  mockMinutes,
  officialYearFaqNote,
  pickFullPatternMock,
  pickOfficialPaperLinks,
  publishersOf,
  pyqFullPaperCopy,
  type FullPatternCandidate,
} from "@/lib/pyq-full-paper";
import type { OfficialPaperRow } from "@/lib/official-papers";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `q${i}`);

const mock = (over: Partial<FullPatternCandidate>): FullPatternCandidate => ({
  id: "m-fp",
  generatedBy: HUB_FULL_PATTERN,
  questionIds: ids(200),
  config: { pattern: "real", count: 200, durationMin: 180 },
  createdAt: new Date("2026-09-01T00:00:00Z"),
  ...over,
});

const TS_PC = { totalQuestions: 200 };

const paper = (over: Partial<OfficialPaperRow>): OfficialPaperRow => ({
  year: "2024",
  paper: "General Studies",
  kind: "question paper",
  language: "English",
  url: `https://www.tnpsc.gov.in/${over.year ?? "2024"}/${over.paper ?? "gs"}-${over.kind ?? "qp"}.pdf`,
  listingUrl: "https://www.tnpsc.gov.in/english/previous-questions.html",
  publisher: "Tamil Nadu Public Service Commission",
  bytes: 2_000_000,
  pages: 40,
  scan: false,
  ...over,
});

describe("pickFullPatternMock", () => {
  it("links the hub's real-pattern paper with the mock's own size and timer", () => {
    expect(pickFullPatternMock([mock({})], TS_PC)).toEqual({ id: "m-fp", questions: 200, minutes: 180 });
  });

  it("uses the mock's question count, not the exam's paper size", () => {
    const got = pickFullPatternMock([mock({ questionIds: ids(190) })], TS_PC);
    expect(got?.questions).toBe(190);
  });

  it("links nothing when the exam has no full-pattern mock", () => {
    expect(pickFullPatternMock([], TS_PC)).toBeNull();
    // A PYQ year set or a user-built mock is never offered as the full paper.
    expect(pickFullPatternMock([mock({ generatedBy: "system:pyq:TS_POLICE_PC:2024" })], TS_PC)).toBeNull();
    expect(pickFullPatternMock([mock({ generatedBy: null })], TS_PC)).toBeNull();
    expect(pickFullPatternMock([mock({ generatedBy: "user-request" })], TS_PC)).toBeNull();
  });

  it("calls it full-length only at ≥80% of the real paper", () => {
    expect(FULL_LENGTH_RATIO).toBe(0.8);
    expect(pickFullPatternMock([mock({ questionIds: ids(160) })], TS_PC)?.questions).toBe(160);
    expect(pickFullPatternMock([mock({ questionIds: ids(159) })], TS_PC)).toBeNull();
    expect(pickFullPatternMock([mock({ questionIds: [] })], TS_PC)).toBeNull();
  });

  it("links nothing when the real paper's size is unknown — full-length cannot be checked", () => {
    expect(pickFullPatternMock([mock({})], { totalQuestions: 0 })).toBeNull();
  });

  it("prefers the hub's v1 paper, then the newest, then a stable id", () => {
    const v1 = mock({ id: "v1", createdAt: new Date("2026-09-01T00:00:00Z") });
    const v2 = mock({ id: "v2", generatedBy: "system:full-pattern-v2", createdAt: new Date("2026-09-20T00:00:00Z") });
    expect(pickFullPatternMock([v2, v1], TS_PC)?.id).toBe("v1");

    const older = mock({ id: "b-old", generatedBy: "system:full-pattern-v2", createdAt: "2026-09-02T00:00:00Z" });
    const newer = mock({ id: "c-new", generatedBy: "system:full-pattern-v3", createdAt: "2026-09-10T00:00:00Z" });
    expect(pickFullPatternMock([older, newer], TS_PC)?.id).toBe("c-new");

    const twinA = mock({ id: "a", generatedBy: "system:full-pattern-v2" });
    const twinB = mock({ id: "b", generatedBy: "system:full-pattern-v2" });
    expect(pickFullPatternMock([twinB, twinA], TS_PC)?.id).toBe("a");
  });

  it("skips a too-short v1 for a full-length later version", () => {
    const shortV1 = mock({ id: "v1", questionIds: ids(100) });
    const v2 = mock({ id: "v2", generatedBy: "system:full-pattern-v2" });
    expect(pickFullPatternMock([shortV1, v2], TS_PC)?.id).toBe("v2");
  });
});

describe("mockMinutes — the timer /mocks/{id} runs", () => {
  it("reads config.durationMin", () => {
    expect(mockMinutes({ durationMin: 150 })).toBe(150);
  });
  it("falls back to the player's default when config names no duration", () => {
    expect(PLAYER_DEFAULT_MIN).toBe(30);
    expect(mockMinutes({})).toBe(30);
    expect(mockMinutes(null)).toBe(30);
  });
  it("states no minutes when the stored value is unusable", () => {
    expect(mockMinutes({ durationMin: "180" })).toBeNull();
    expect(mockMinutes({ durationMin: 0 })).toBeNull();
    expect(mockMinutes({ durationMin: Number.NaN })).toBeNull();
  });
  it("a full-pattern mock without a usable timer still links, without minutes", () => {
    expect(pickFullPatternMock([mock({ config: { durationMin: -1 } })], TS_PC)).toEqual({
      id: "m-fp",
      questions: 200,
      minutes: null,
    });
  });
});

describe("pickOfficialPaperLinks", () => {
  const g4 = [
    paper({ year: "2025", paper: "General English", kind: "question paper with answer key" }),
    paper({ year: "2025", paper: "Tamil Eligibility", kind: "question paper with answer key" }),
    paper({ year: "2025", paper: "Final answer key", kind: "answer key" }),
    paper({ year: "2024", paper: "General English", kind: "question paper with answer key" }),
    paper({ year: "2024", paper: "Final answer key", kind: "answer key" }),
    paper({ year: "2022", paper: "General Tamil", kind: "question paper with answer key" }),
    paper({ year: "2019", paper: "General Studies", kind: "question paper with answer key" }),
  ];

  it("a year with its own paper links that year only, and points to the hub for the rest", () => {
    const got = pickOfficialPaperLinks(g4, 2024);
    expect(got.sameYear.map((r) => r.paper)).toEqual(["General English", "Final answer key"]);
    expect(got.sameYearHasPaper).toBe(true);
    expect(got.otherYears).toEqual([]);
    expect(got.listings).toEqual([]);
    expect(got.moreOnHub).toBe(true);
  });

  it("a year with no official paper links other years' papers, latest first, capped", () => {
    const got = pickOfficialPaperLinks(g4, 2021);
    expect(got.sameYear).toEqual([]);
    expect(got.sameYearHasPaper).toBe(false);
    expect(OTHER_YEAR_PAPERS_MAX).toBe(3);
    expect(got.otherYears.map((r) => `${r.year} ${r.paper}`)).toEqual([
      "2025 General English",
      "2025 Tamil Eligibility",
      "2024 General English",
    ]);
    // 5 question papers on the hub, 3 here.
    expect(got.moreOnHub).toBe(true);
  });

  it("never offers an answer key as another year's paper", () => {
    const got = pickOfficialPaperLinks(g4, 2021, 10);
    expect(got.otherYears.every(isQuestionPaper)).toBe(true);
    expect(got.otherYears).toHaveLength(5);
    expect(got.moreOnHub).toBe(false);
  });

  it("a year with only an answer key still gets other years' papers", () => {
    const rows = [
      paper({ year: "2023", paper: "Answer key", kind: "answer key" }),
      paper({ year: "2024", paper: "Paper I", kind: "question paper" }),
    ];
    const got = pickOfficialPaperLinks(rows, 2023);
    expect(got.sameYear.map((r) => r.kind)).toEqual(["answer key"]);
    expect(got.sameYearHasPaper).toBe(false);
    expect(got.otherYears.map((r) => r.paper)).toEqual(["Paper I"]);
    expect(got.moreOnHub).toBe(false);
  });

  it("an exam with answer keys only (CTET) links nothing extra", () => {
    const ctet = [
      paper({ year: "2026", paper: "Feb26 Answer Key P1", kind: "answer key", publisher: "CBSE" }),
      paper({ year: "2024", paper: "Dec24 Answer Key P1", kind: "answer key", publisher: "CBSE" }),
    ];
    const got = pickOfficialPaperLinks(ctet, 2025);
    expect(got.sameYear).toEqual([]);
    expect(got.otherYears).toEqual([]);
    expect(got.listings).toEqual([]);
    expect(got.moreOnHub).toBe(false);
    expect(hasWholePaperLinks(null, got)).toBe(false);
  });

  it("links the body's listing page when there is no paper file to link", () => {
    const listing = paper({ year: "", paper: "previous question papers", kind: "listing page", url: "https://uppsc.up.nic.in/papers" });
    const got = pickOfficialPaperLinks([listing], 2024);
    expect(got.listings.map((r) => r.url)).toEqual(["https://uppsc.up.nic.in/papers"]);
    expect(got.sameYear).toEqual([]);
    // Not when a real file is linked.
    expect(pickOfficialPaperLinks([listing, ...g4], 2024).listings).toEqual([]);
    expect(pickOfficialPaperLinks([listing, ...g4], 2021).listings).toEqual([]);
  });

  it("a '2024-25' label belongs to the 2024 page, like papersForYear", () => {
    const rows = [paper({ year: "2024-25", paper: "Paper I" })];
    expect(pickOfficialPaperLinks(rows, 2024).sameYear).toHaveLength(1);
    expect(pickOfficialPaperLinks(rows, 2025).otherYears.map((r) => r.year)).toEqual(["2024-25"]);
  });

  it("no rows → nothing", () => {
    const got = pickOfficialPaperLinks([], 2024);
    expect(got).toEqual({ sameYear: [], sameYearHasPaper: false, otherYears: [], moreOnHub: false, listings: [] });
    expect(hasWholePaperLinks(null, got)).toBe(false);
  });
});

describe("hasWholePaperLinks", () => {
  const none = pickOfficialPaperLinks([], 2024);
  it("shows the block for a full-length mock alone", () => {
    expect(hasWholePaperLinks({ id: "m", questions: 200, minutes: 180 }, none)).toBe(true);
  });
  it("shows the block for other years' papers or a hub link alone", () => {
    const rows = [paper({ year: "2022" })];
    expect(hasWholePaperLinks(null, pickOfficialPaperLinks(rows, 2024))).toBe(true);
    expect(hasWholePaperLinks(null, pickOfficialPaperLinks([paper({ year: "2024" }), paper({ year: "2022" })], 2024))).toBe(
      true,
    );
  });
  it("a year whose own paper is its only official file needs no extra block", () => {
    expect(hasWholePaperLinks(null, pickOfficialPaperLinks([paper({ year: "2024" })], 2024))).toBe(false);
  });
});

describe("publishersOf", () => {
  it("names each publisher once, in order", () => {
    expect(
      publishersOf([{ publisher: "APPSC" }, { publisher: "APPSC" }, { publisher: "" }, { publisher: "TSPSC" }]),
    ).toBe("APPSC · TSPSC");
  });
});

describe("fullMockFaqNote (English structured data)", () => {
  it("states the mock's own size and points to the hub tile, not /mocks/", () => {
    const note = fullMockFaqNote({ id: "m1", questions: 200, minutes: 180 }, "TS_POLICE_PC");
    expect(note).toBe(
      ' For a whole paper in one sitting, Shishya has a free full-length mock in the real pattern (200 questions, 180 minutes): the "Full-Length Mock (Real Pattern)" tile at https://shishya.in/exams/TS_POLICE_PC.',
    );
    expect(note).not.toContain("/mocks/");
  });
  it("drops the minutes it cannot state, and says nothing without a mock", () => {
    expect(fullMockFaqNote({ id: "m1", questions: 150, minutes: null }, "CTET")).toContain("(150 questions)");
    expect(fullMockFaqNote(null, "CTET")).toBe("");
  });
});

describe("officialYearFaqNote (English structured data)", () => {
  const CBSE = "Central Board of Secondary Education (CBSE)";
  const key = paper({ year: "2024", paper: "Dec24 Answer Key P1", kind: "answer key", publisher: CBSE, url: "https://ctet.nic.in/key.pdf" });

  it("names the original paper only when the year has a question paper", () => {
    const qp = paper({ year: "2024", kind: "question paper with answer key", url: "https://www.tnpsc.gov.in/qp.pdf" });
    // papersForYear order puts question papers first, but the note must not depend on it.
    expect(officialYearFaqNote([key, qp], 2024)).toBe(
      " The original 2024 paper is published by Tamil Nadu Public Service Commission: https://www.tnpsc.gov.in/qp.pdf",
    );
  });

  it("a key-only year (CTET 2024) is named as the answer key, never the paper", () => {
    const note = officialYearFaqNote([key], 2024);
    expect(note).toBe(` The official 2024 answer key is published by ${CBSE}: https://ctet.nic.in/key.pdf`);
    expect(note).not.toMatch(/paper/i);
    // What the page passes in: pickOfficialPaperLinks' same-year rows.
    expect(officialYearFaqNote(pickOfficialPaperLinks([key], 2024).sameYear, 2024)).toBe(note);
  });

  it("says nothing when the year has no official file", () => {
    expect(officialYearFaqNote([], 2024)).toBe("");
    expect(officialYearFaqNote(pickOfficialPaperLinks([key], 2025).sameYear, 2025)).toBe("");
  });
});

describe("copy", () => {
  const placeholders = (s: string) => [...new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort();

  it("every locale carries every string with the same placeholders", () => {
    const en = PYQ_FULL_PAPER_COPY.en;
    for (const lc of ["hi", "te"] as const) {
      const c = PYQ_FULL_PAPER_COPY[lc];
      expect(Object.keys(c).sort()).toEqual(Object.keys(en).sort());
      for (const k of Object.keys(en) as (keyof typeof en)[]) {
        expect(placeholders(c[k]), `${lc}.${k}`).toEqual(placeholders(en[k]));
        expect(c[k], `${lc}.${k}`).not.toBe("");
      }
    }
  });

  it("the mock line states its size; the note never calls it the original paper", () => {
    expect(placeholders(PYQ_FULL_PAPER_COPY.en.fullMock)).toEqual(["m", "n"]);
    expect(PYQ_FULL_PAPER_COPY.en.fullMock).toContain("real pattern");
    expect(PYQ_FULL_PAPER_COPY.en.fullMockNote).toContain("not the original paper");
    expect(PYQ_FULL_PAPER_COPY.hi.fullMockNote).toContain("नहीं");
    expect(PYQ_FULL_PAPER_COPY.te.fullMockNote).toContain("కాదు");
  });

  it("official files are named with their publisher; a key-only year is headed as the key", () => {
    for (const lc of ["en", "hi", "te"] as const) {
      expect(PYQ_FULL_PAPER_COPY[lc].otherYearsHeading).toContain("{publisher}");
      expect(PYQ_FULL_PAPER_COPY[lc].officialKeyHeading).toContain("{publisher}");
    }
    expect(PYQ_FULL_PAPER_COPY.en.officialKeyHeading).toContain("answer key");
    expect(PYQ_FULL_PAPER_COPY.en.officialKeyHeading).not.toMatch(/paper/i);
  });

  it("falls back to English for other locales", () => {
    expect(pyqFullPaperCopy("bn")).toBe(PYQ_FULL_PAPER_COPY.en);
    expect(pyqFullPaperCopy(undefined)).toBe(PYQ_FULL_PAPER_COPY.en);
    expect(pyqFullPaperCopy("te")).toBe(PYQ_FULL_PAPER_COPY.te);
  });
});
