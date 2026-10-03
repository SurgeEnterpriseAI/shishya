// A URL is never followed directly by "." or "," (3 Oct 2026, fix plan C7,
// PTF-2A).
//
// The crawl audit fetched https://shishya.in/exams/SSC_CGL/cutoff. (404),
// https://shishya.in/coach, (404) and https://shishya.in/exams/SSC_CGL. (404):
// a crawler or an answer engine that lifts a URL out of page text takes the
// stop or comma with it. Every builder below printed a URL followed by one;
// the sentence is now worded so the URL ends it, or a space and a word
// follow it. A ")" after a URL is left as it is (hub-faq.ts syllabus and
// tricks offers, state pages).
// Pure builders over fixtures; Prisma and next/cache are mocked for the
// school surface import. No DB, no network.
// Run: npx vitest run tests/unit/url-punctuation.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

import { hubFaqExtraItems, type HubFaqInput } from "@/lib/hub-faq";
import { pyqFaqItems, pyqModelledEn } from "@/lib/pyq-faq";
import { fullMockFaqNote, officialYearFaqNote } from "@/lib/pyq-full-paper";
import { verifiedPattern } from "@/lib/pattern-verified";
import { OTHER_INDIAN_LANGUAGE_COUNT, INDIAN_LANGUAGE_COUNT } from "@/lib/languages";
import { citationLine } from "@/lib/public-numbers-rules";
import { pulseCitation } from "@/lib/pulse-view";
import { parsePulseSlug } from "@/lib/pulse-rules";
import { scholarshipFaq } from "@/lib/scholarship-lists";
import { SCHOLARSHIP_SCHEMES } from "@/lib/scholarship-schemes";
import { sourceText } from "@/lib/paths/path-context";
import { schoolClassContextMarkdown, schoolClassIdentity } from "@/lib/school/context";
import { schoolLlmsFullLines, type SchoolSurfaceClass } from "@/lib/school/surface";
import { G3_EXAMS } from "../fixtures/g3-exams";

/** A URL (or a shishya.in path) that runs straight into "." or ",". A ")"
 *  ends the URL: "(…/syllabus)," is a bracketed URL, left as it is. */
const URL_THEN_STOP = /(https?:\/\/|shishya\.in\/)[^\s"<>)]*[.,](\s|$)/;

function expectClean(text: string, where: string) {
  const m = URL_THEN_STOP.exec(text);
  expect(m ? `${where}: …${text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 20)}…` : null, where).toBeNull();
}

const hub: HubFaqInput = {
  code: "SSC_CGL",
  short: "SSC CGL",
  name: "SSC Combined Graduate Level (Tier 1)",
  pattern: verifiedPattern(G3_EXAMS.SSC_CGL),
  cutoffPage: true,
  cutoffOfficial: null,
  realPatternMock: true,
  buildMock: true,
  hasContent: true,
  hasPyqSets: true,
  hasOfficialPapers: false,
  syllabus: true,
  notes: true,
  tricks: true,
  otherLanguageCount: OTHER_INDIAN_LANGUAGE_COUNT,
  tutorLanguageCount: INDIAN_LANGUAGE_COUNT,
};

describe("no URL followed by '.' or ','", () => {
  it("the hub FAQ (expected-cutoff answer, build-mock answer, official-cutoff answer)", () => {
    const items = [
      ...hubFaqExtraItems(hub),
      ...hubFaqExtraItems({ ...hub, cutoffOfficial: "The latest official SSC CGL cutoff is in the published table." }),
    ];
    expect(items.some((f) => f.a.includes("/cutoff"))).toBe(true);
    expect(items.some((f) => f.a.includes("/build-mock"))).toBe(true);
    for (const f of items) expectClean(f.a, f.q);
    const buildMock = items.find((f) => f.a.includes("/build-mock"))!;
    expect(buildMock.a).toContain("https://shishya.in/exams/SSC_CGL/build-mock — questions can be read");
  });

  it("the PYQ page FAQ, with and without the official paper and the full-length mock notes", () => {
    const fullMock = fullMockFaqNote({ id: "m1", questions: 100, minutes: 60 }, "SSC_CGL");
    expectClean(fullMock, "fullMockFaqNote");
    const official = officialYearFaqNote(
      [{ kind: "question paper", publisher: "Staff Selection Commission", url: "https://ssc.gov.in/paper-2024.pdf" } as never],
      2024,
    );
    for (const [officialPaperNote, fullMockNote] of [
      ["", ""],
      [official, fullMock],
    ]) {
      const items = pyqFaqItems({
        short: "SSC CGL",
        year: 2024,
        pageUrl: "https://shishya.in/exams/SSC_CGL/pyq/2024",
        modelledEn: pyqModelledEn(23, 2024),
        partial: true,
        held: 23,
        officialPaperNote,
        fullMockNote,
      });
      for (const f of items) expectClean(f.a, f.q);
      expect(items.some((f) => f.a.includes("https://shishya.in/coach and sit"))).toBe(true);
    }
  });

  it("the numbers and Pulse citation lines end on their URL", () => {
    expectClean(citationLine("2026-09-27"), "citationLine");
    expect(citationLine("2026-09-27").endsWith("https://shishya.in/shishya-in-numbers")).toBe(true);
    const w = parsePulseSlug("2026-w38")!;
    expectClean(pulseCitation(w, "2026-09-27"), "pulseCitation");
    expect(pulseCitation(w, "2026-09-27").endsWith("https://shishya.in/pulse/2026-w38")).toBe(true);
  });

  it("every scholarship FAQ answer", () => {
    expect(SCHOLARSHIP_SCHEMES.length).toBeGreaterThan(0);
    for (const s of SCHOLARSHIP_SCHEMES) for (const f of scholarshipFaq(s, "2026-10-03")) expectClean(f.a, `${s.id}: ${f.q}`);
  });

  it("a life-stage source line (official and reported)", () => {
    const src = { url: "https://jeemain.nta.nic.in/bulletin.pdf", publisher: "National Testing Agency (NTA)", title: "JEE (Main) 2026 Information Bulletin", checkedOn: "2026-09-30" };
    for (const tier of ["official", "reported"] as const) {
      const line = sourceText({ ...src, tier } as never);
      expectClean(line, `sourceText ${tier}`);
      expect(line.endsWith(": https://jeemain.nta.nic.in/bulletin.pdf")).toBe(true);
    }
  });

  it("the fixed strings in the exam context.md route and the about, educators, jobs-map and typing pages (source scan)", () => {
    // The source holds the text as a string or template literal, so the URL may be "${SITE}/…" and the
    // stop may be followed by the closing quote. Each of these files printed one at HEAD 7037f1e.
    const SOURCE_URL_THEN_STOP = /(https?:\/\/|shishya\.in\/|\$\{SITE\})[^\s"'<>)`]*[.,](\s|$|[`"'])/;
    for (const file of [
      "src/app/exams/[code]/context.md/route.ts",
      "src/app/about/page.tsx",
      "src/app/educators/page.tsx",
      "src/app/jobs-map/page.tsx",
      "src/app/typing/page.tsx",
    ]) {
      const src = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      const m = SOURCE_URL_THEN_STOP.exec(src);
      expect(m ? `${file}: …${src.slice(Math.max(0, m.index - 40), m.index + m[0].length + 20)}…` : null, file).toBeNull();
    }
    expect(SOURCE_URL_THEN_STOP.test("link back to ${SITE}/exams/${exam.code}. Human page")).toBe(true);
    expect(SOURCE_URL_THEN_STOP.test('or https://shishya.in/contact.";')).toBe(true);
  });

  it("the class context header (NCERT and CISCE) and the llms-full school block", () => {
    const klass = (curriculum: "NCERT" | "CISCE", boardSlug: string, cls: number): SchoolSurfaceClass => ({
      examCode: `${curriculum}_C${String(cls).padStart(2, "0")}`,
      curriculum,
      boardSlug,
      cls,
      name: `${curriculum} Class ${cls}`,
      updatedAt: "2026-09-26T00:00:00.000Z",
      subjects: [],
      lastModified: null,
    });
    const ncert = schoolClassContextMarkdown(klass("NCERT", "cbse", 6), schoolClassIdentity("NCERT", 6), "2026-10-03");
    expect(ncert).toContain("What this file is");
    expectClean(ncert.split("\n").find((l) => l.startsWith("> What this file is"))!, "NCERT class header");
    for (const cls of [3, 10]) {
      const cisce = schoolClassContextMarkdown(klass("CISCE", "icse-cisce", cls), schoolClassIdentity("CISCE", cls), "2026-10-03");
      expectClean(cisce.split("\n").find((l) => l.startsWith("> What this file is"))!, `CISCE class ${cls} header`);
    }
    const llms = schoolLlmsFullLines({ classes: [klass("NCERT", "cbse", 6)] }, "https://shishya.in");
    const live = llms.find((l) => l.startsWith("> Live now"))!;
    expect(live).toContain("Board pages:");
    expectClean(live, "llms-full school block");
  });
});
