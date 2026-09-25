// School build Step 0 (25 Sep 2026): pins the book, chapter and syllabus
// facts in src/lib/schooling-subjects.ts (and the CBSE / CISCE board links in
// src/lib/schooling-data.ts) to snapshots of the official pages fetched that
// day:
//   tests/fixtures/ncert-textbook-index-2026-09-25.json   https://ncert.nic.in/textbook.php
//   tests/fixtures/ncert-book-contents-2026-09-25.json    each book's prelims PDF (contents page)
//   tests/fixtures/school-official-sources-2026-09-25.json CBSE curriculum 2026-27 + CISCE pages
// When NCERT / CBSE / CISCE change a book or a link: re-fetch, refresh the
// snapshot, then the data file, in the same commit. A failure here means the
// data and the official source disagree — fix the data, never the snapshot.

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import {
  CLASS_SYLLABUS,
  NCERT_INDEX_URL,
  ICSE_REGULATIONS_URL,
  ISC_REGULATIONS_URL,
  allChapterPaths,
  findChapter,
  findSubject,
  mainBooks,
  ncertBookUrl,
  ncertClassUrl,
  officialClassSource,
  type NcertBook,
  type SchoolSubject,
} from "@/lib/schooling-subjects";
import { BOARDS, findBoard, samplePapersFor } from "@/lib/schooling-data";

const FIX = path.resolve(__dirname, "../fixtures");
const readJson = <T,>(f: string): T => JSON.parse(fs.readFileSync(path.join(FIX, f), "utf8")) as T;

interface IndexFixture {
  source: string;
  fetchedAt: string;
  sha256: string;
  shadowedDuplicateBlocks: unknown[];
  subjects: Array<{ class: number; subject: string; inDropdown: boolean; books: Array<[string, string]> }>;
}
interface ContentsFixture {
  books: Record<string, { pdf: string; edition: string | null; chapters: Record<string, string> }>;
}
interface SourcesFixture {
  cbseCurriculum2026_27: { page: string; sections: Record<"IX" | "X" | "XI-XII", Record<string, string>> };
  prescribedBooks: Record<string, string[]>;
  checked200: Array<{ url: string; title: string }>;
  dead: Array<{ url: string; status: number }>;
}

const INDEX = readJson<IndexFixture>("ncert-textbook-index-2026-09-25.json");
const CONTENTS = readJson<ContentsFixture>("ncert-book-contents-2026-09-25.json");
const SOURCES = readJson<SourcesFixture>("school-official-sources-2026-09-25.json");

const cbseClasses = CLASS_SYLLABUS.filter((c) => c.boardSlug === "cbse");
const code = (b: Pick<NcertBook, "query">) => b.query.split("=")[0];
const lastFile = (b: Pick<NcertBook, "query">) => Number(b.query.split("-").pop());

function indexBooks(classNum: number, ncertSubject: string): Array<[string, string]> {
  return INDEX.subjects.find((s) => s.class === classNum && s.subject === ncertSubject)?.books ?? [];
}

// Printed titles differ only in case and spacing ("Cell : The Unit of Life",
// "THE d-AND f-BLOCK ELEMENTS", "Light – Reflection").
function norm(t: string): string {
  return t
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+:/g, ":")
    .replace(/\s+/g, " ")
    .trim();
}

// The Part I prelims of these two books did not extract cleanly; the Part II
// prelims print the same Part I contents page, so read Part I from there.
const CONTENTS_SOURCE: Record<string, string> = { keph1: "keph2", leph1: "leph2" };

describe("NCERT textbook index snapshot", () => {
  it("is the official index, fetched 25 Sep 2026", () => {
    expect(INDEX.source).toBe("https://ncert.nic.in/textbook.php");
    expect(INDEX.fetchedAt.startsWith("2026-09-25")).toBe(true);
    expect(NCERT_INDEX_URL).toBe(INDEX.source);
  });

  it("every CBSE book on /schooling is listed by NCERT under that class and subject, title and range exact", () => {
    let checked = 0;
    for (const cls of cbseClasses) {
      for (const s of cls.subjects) {
        if (!s.books) continue;
        expect(s.ncertSubject, `${cls.key}/${s.slug} needs ncertSubject`).toBeTruthy();
        const listed = indexBooks(cls.classNum, s.ncertSubject!).map(([t, q]) => `${t}|${q}`);
        for (const b of s.books) {
          expect(listed, `${cls.key}/${s.slug}: ${b.title} (${b.query})`).toContain(`${b.title}|${b.query}`);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it("every CBSE subject with NCERT books has at least one main (non Hindi/Urdu-medium) book", () => {
    for (const cls of cbseClasses) {
      for (const s of cls.subjects) {
        if (!s.ncertSubject) continue;
        expect(mainBooks(s).length, `${cls.key}/${s.slug}`).toBeGreaterThan(0);
      }
    }
  });

  // The corrected facts, spelled out: Classes 6-8 moved to Ganita Prakash /
  // Curiosity / Poorvi / Malhar / Exploring Society; Class 9 to Ganita
  // Manjari / Exploration / Kaveri / Ganga (NCERT index, 25 Sep 2026).
  const EXPECTED_MAIN_BOOKS: Record<string, string[]> = {
    "6/mathematics": ["Ganita Prakash|fegp1=0-10"],
    "6/science": ["Curiosity|fecu1=0-12"],
    "6/english": ["Poorvi|fepr1=0-5"],
    "6/hindi": ["Malhar|fhml1=0-13"],
    "6/social-science": ["Exploring Society India and Beyond|fees1=0-14"],
    "7/mathematics": ["Ganita Prakash|gegp1=0-8", "Ganita Prakash-II|gegp2=0-7"],
    "7/science": ["Curiosity|gecu1=0-12"],
    "7/english": ["Poorvi|gepr1=0-5"],
    "7/hindi": ["Malhar|ghml1=0-10"],
    "7/social-science": ["Exploring Society India and Beyond Part-I|gees1=0-12", "Exploring Society India and Beyond Part-II|gees2=0-8"],
    "8/mathematics": ["Ganita Prakash Part-I|hegp1=0-7", "Ganita Prakash Part-II|hegp2=0-7"],
    "8/science": ["Curiosity|hecu1=0-13"],
    "8/english": ["Poorvi|hepr1=0-5"],
    "8/hindi": ["Malhar|hhml1=0-10"],
    "8/social-science": ["Exploring Society India and Beyond Part-I|hees1=0-7", "Exploring Society India and Beyond Part-II|hees2=0-8"],
    "9/mathematics": ["Ganita Manjari|iemh1=0-8"],
    "9/science": ["Exploration|iesc1=0-13"],
    "9/english": ["Kaveri|iebe1=0-8"],
    "9/hindi": ["Ganga|ihga1=0-12"],
    "9/social-science": ["Understanding Society India and Beyond PART-I|iest1=0-9"],
    "10/mathematics": ["Mathematics|jemh1=0-14"],
    "10/science": ["Science|jesc1=0-13"],
    "10/hindi-a": ["Kshitij-2|jhks1=0-12", "Kritika|jhkr1=0-3"],
    "10/hindi-b": ["Sparsh|jhsp1=0-14", "Sanchayan Bhag-2|jhsy1=0-3"],
    "11/physics": ["Physics Part-I|keph1=0-7", "Physics Part-II|keph2=0-7"],
    "11/chemistry": ["Chemistry Part-I|kech1=0-6", "Chemistry Part II|kech2=0-3"],
    "11/mathematics": ["Mathematics|kemh1=0-14"],
    "11/biology": ["Biology|kebo1=0-19"],
    "11/english-core": ["Hornbill|kehb1=0-14", "Snapshots Suppl.Reader English|kesp1=0-5"],
    "12/physics": ["Physics Part-I|leph1=0-8", "Physics Part-II|leph2=0-6"],
    "12/chemistry": ["Chemistry-I|lech1=0-5", "Chemistry-II|lech2=0-5"],
    "12/mathematics": ["Mathematics Part-I|lemh1=0-6", "Mathematics Part-II|lemh2=0-7"],
    "12/biology": ["Biology|lebo1=0-13"],
    "12/english-core": ["Flamingo|lefl1=0-13", "Vistas|levt1=0-6"],
  };
  it.each(Object.entries(EXPECTED_MAIN_BOOKS))("CBSE %s main books", (key, expected) => {
    const [cls, slug] = key.split("/");
    const s = findSubject("cbse", Number(cls), slug);
    expect(s, key).toBeDefined();
    expect(mainBooks(s!).map((b) => `${b.title}|${b.query}`)).toEqual(expected);
  });

  it("none of the replaced May-2026 book codes survives", () => {
    const stale = [
      "femh1", "fesc1", "fehs1", "fhvs1", "fesp1", // Class 6 old Maths/Science/English/Hindi/SS
      "gemh1", "gesc1", "gehc1", "ghvs1", "gesp1",
      "hemh1", "hesc1", "hehd1", "hhvs1", "hesp1",
      "iess1", "ihks1", "ihsp1", // Class 9 old SS / Hindi A / Hindi B
      "fec1", "leie1",
    ];
    const all = CLASS_SYLLABUS.flatMap((c) => c.subjects.flatMap((s) => (s.books ?? []).map(code)));
    for (const c of stale) expect(all, c).not.toContain(c);
    // Class 9 Maths / Science are the new books, not the old 0-15 / 0-12 ranges.
    expect(mainBooks(findSubject("cbse", 9, "mathematics")!)[0].query).toBe("iemh1=0-8");
    expect(mainBooks(findSubject("cbse", 9, "science")!)[0].query).toBe("iesc1=0-13");
    // Class 9 Hindi A / B are gone (CBSE 2026-27 has one Class IX Hindi syllabus).
    expect(findSubject("cbse", 9, "hindi-a")).toBeUndefined();
    expect(findSubject("cbse", 9, "hindi-b")).toBeUndefined();
  });

  it("links a book to NCERT's own book page", () => {
    expect(ncertBookUrl({ query: "iemh1=0-8" })).toBe("https://ncert.nic.in/textbook.php?iemh1=0-8");
  });

  it("every NCERT subject /schooling uses is offered in that class's subject dropdown", () => {
    for (const cls of cbseClasses) {
      for (const s of cls.subjects) {
        if (!s.ncertSubject) continue;
        const entry = INDEX.subjects.find((x) => x.class === cls.classNum && x.subject === s.ncertSubject);
        expect(entry?.inDropdown, `${cls.key}/${s.slug} (${s.ncertSubject})`).toBe(true);
      }
    }
  });
});

// 26 Sep 2026 (fixer): the first snapshot parser skipped only `//` lines, so
// books NCERT keeps inside /* ... */ blocks on textbook.php were recorded as
// live and the live Class 3-5 blocks were filed as "shadowed duplicates".
// The snapshot is now parsed with every JS comment blanked (same page, same
// sha256; re-fetched 26 Sep 00:02 IST, unchanged). These pin the Class 1-5
// facts the next build step (CBSE Class 1-5 data) will lean on.
describe("NCERT index snapshot honours the page's commented-out code", () => {
  const books = (cls: number, subject: string) => indexBooks(cls, subject).map(([t, q]) => `${t}|${q}`);

  it("is the same page the first snapshot came from", () => {
    expect(INDEX.sha256).toBe("f22b184dce0e02298d571a49ea768dd0809c146c540a77f6f23fdfbdc0c4ec29");
  });

  it("Class 3 lists the new books (Santoor, Veena, Maths Mela, Sitar), not the commented-out old ones", () => {
    expect(books(3, "English")).toEqual(["Santoor|cesa1=0-12"]);
    expect(books(3, "Hindi")).toEqual(["Veena|chve1=0-18"]);
    expect(books(3, "Mathematics").slice(0, 3)).toEqual(["Maths Mela|cemm1=0-14", "Ganit Mela|chmm1=0-14", "Riyazi Mela|cumm1=0-14"]);
    expect(books(3, "Urdu")).toEqual(["Sitar|cust1=0-19"]);
    expect(books(3, "The World Around Us")[0]).toBe("Our Wondrous World|ceev1=0-12");
    expect(books(4, "Urdu")).toEqual(["Sitaar|dust1=0-14"]);
  });

  it("no book from a commented-out block survives", () => {
    const all = INDEX.subjects.flatMap((s) => s.books.map(([, q]) => q.split("=")[0]));
    for (const c of ["ceen1", "chhn1", "cemh1", "chmh1", "curi1", "culb1", "dulb1", "ceap1", "chap1", "deap1", "dhap1", "eeap1", "ehap1", "fkannada1", "fpunjabi1", "ftami1", "class4"]) {
      expect(all, c).not.toContain(c);
    }
    for (const n of [3, 4, 5]) expect(indexBooks(n, "Environmental Studies"), `Class ${n} EVS`).toEqual([]);
    for (const lang of ["Kannada", "Malayalam", "Marathi", "Nepali", "Punjabi", "Santhali", "Tamil"]) {
      expect(indexBooks(6, lang), `Class 6 ${lang}`).toEqual([]);
    }
    expect(indexBooks(8, "Class 8")).toEqual([]);
  });

  it("each (class, subject) appears once, and no live block is shadowed", () => {
    const keys = INDEX.subjects.map((s) => `${s.class}|${s.subject}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(INDEX.shadowedDuplicateBlocks).toEqual([]);
  });
});

describe("chapters come from each book's own contents page", () => {
  const withChapters = cbseClasses.flatMap((cls) =>
    cls.subjects.flatMap((s) => mainBooks(s).filter((b) => b.chapters).map((b) => ({ cls: cls.classNum, s, b }))),
  );

  it("covers exactly the Maths / Science books we list chapters for", () => {
    expect(withChapters.map(({ b }) => code(b)).sort()).toEqual(
      ["iemh1", "iesc1", "jemh1", "jesc1", "keph1", "keph2", "kech1", "kech2", "kemh1", "kebo1", "leph1", "leph2", "lech1", "lech2", "lemh1", "lemh2", "lebo1"].sort(),
    );
  });

  it.each(withChapters.map((x) => [`${x.cls}/${x.s.slug} ${x.b.title}`, x] as const))("%s matches the printed contents", (_label, { b }) => {
    const src = CONTENTS.books[CONTENTS_SOURCE[code(b)] ?? code(b)];
    expect(src, code(b)).toBeDefined();
    const first = b.firstChapter ?? 1;
    // One chapter file per chapter: NCERT's "0-N" range ends at the chapter count.
    expect(b.chapters!.length).toBe(lastFile(b));
    b.chapters!.forEach(([, title], i) => {
      const printed = src.chapters[String(first + i)];
      expect(printed, `${code(b)} chapter ${first + i}`).toBeDefined();
      expect(norm(title)).toBe(norm(printed));
    });
    const own = CONTENTS.books[code(b)];
    if (b.edition) expect(own?.edition).toBe(b.edition);
  });

  it("Part II books continue the Part I numbering and no chapter is missing", () => {
    for (const cls of cbseClasses) {
      for (const s of cls.subjects) {
        if (!s.chapters) continue;
        expect(s.chapters.map((c) => c.number)).toEqual(s.chapters.map((_, i) => i + 1));
        const slugs = s.chapters.map((c) => c.slug);
        expect(new Set(slugs).size).toBe(slugs.length);
        for (const sl of slugs) expect(sl).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      }
    }
  });

  it("chapter counts per book (Class 11 Biology has 19, not 22)", () => {
    const count = (cls: number, slug: string) => findSubject("cbse", cls, slug)?.chapters?.length ?? 0;
    expect([count(9, "mathematics"), count(9, "science")]).toEqual([8, 13]);
    expect([count(10, "mathematics"), count(10, "science")]).toEqual([14, 13]);
    expect([count(11, "physics"), count(11, "chemistry"), count(11, "mathematics"), count(11, "biology")]).toEqual([14, 9, 14, 19]);
    expect([count(12, "physics"), count(12, "chemistry"), count(12, "mathematics"), count(12, "biology")]).toEqual([14, 10, 13, 13]);
    for (const gone of ["transport-plants", "mineral-nutrition", "digestion-absorption"]) {
      expect(findChapter("cbse", 11, "biology", gone)).toBeUndefined();
    }
    expect(findChapter("cbse", 9, "mathematics", "number-systems-9")).toBeUndefined();
    expect(findChapter("cbse", 9, "science", "matter-surroundings-9")).toBeUndefined();
    expect(allChapterPaths()).toHaveLength(154);
  });

  it("a Part II chapter knows where NCERT's book page lists it", () => {
    const ch = findChapter("cbse", 12, "physics", "ray-optics-and-optical-instruments")!;
    expect([ch.number, ch.numberInBook, ch.book.query]).toEqual([9, 1, "leph2=0-6"]);
    const ch8 = findChapter("cbse", 11, "physics", "mechanical-properties-of-solids")!;
    expect([ch8.number, ch8.numberInBook, ch8.book.query]).toEqual([8, 1, "keph2=0-7"]);
  });

  it("the Class 9 books are the April 2026 first editions", () => {
    expect(CONTENTS.books.iemh1.edition).toBe("First Edition April 2026");
    expect(CONTENTS.books.iesc1.edition).toBe("First Edition April 2026");
    expect(mainBooks(findSubject("cbse", 9, "mathematics")!)[0].edition).toBe("First Edition April 2026");
  });
});

describe("CBSE 2026-27 syllabus links", () => {
  const section = (cls: number) => (cls === 9 ? "IX" : cls === 10 ? "X" : "XI-XII");

  it("every CBSE subject's syllabus PDF is the one CBSE's curriculum page lists for that class", () => {
    let n = 0;
    for (const cls of cbseClasses) {
      for (const s of cls.subjects) {
        if (!s.syllabusUrl) continue;
        expect(cls.classNum, `${cls.key}/${s.slug}: CBSE publishes subject syllabi from Class 9`).toBeGreaterThanOrEqual(9);
        expect(Object.values(SOURCES.cbseCurriculum2026_27.sections[section(cls.classNum)])).toContain(s.syllabusUrl);
        n++;
      }
    }
    expect(n).toBeGreaterThanOrEqual(30);
  });

  it("Hindi Course A / B and English use the books CBSE's 2026-27 syllabus names", () => {
    const titles = (cls: number, slug: string) => mainBooks(findSubject("cbse", cls, slug)!).map((b) => b.title);
    expect(titles(10, "hindi-a")).toEqual(SOURCES.prescribedBooks["X/Hindi Course-A"]);
    expect(titles(10, "hindi-b")).toEqual(SOURCES.prescribedBooks["X/Hindi Course-B"]);
    expect(titles(10, "english")).toEqual(SOURCES.prescribedBooks["X/English - Language and Literature"]);
    expect(titles(11, "english-core")).toEqual(SOURCES.prescribedBooks["XI/English Core"]);
    expect(titles(12, "english-core")).toEqual(SOURCES.prescribedBooks["XII/English Core"]);
  });
});

describe("class-level official source (ncertClassUrl)", () => {
  const ok = new Set(SOURCES.checked200.map((c) => c.url));

  it("CBSE classes link to NCERT's index, never the old non-existent fec1 code", () => {
    for (let n = 1; n <= 12; n++) {
      expect(ncertClassUrl("cbse", n)).toBe(NCERT_INDEX_URL);
      expect(officialClassSource("cbse", n)!.label).toContain(`Class ${n}`);
    }
    expect(ncertClassUrl("cbse", 9)).not.toMatch(/fec1/);
  });

  it("CISCE classes link to the live ICSE / ISC regulations pages", () => {
    expect(ncertClassUrl("icse-cisce", 10)).toBe(ICSE_REGULATIONS_URL);
    expect(ncertClassUrl("icse-cisce", 9)).toBe(ICSE_REGULATIONS_URL);
    expect(ncertClassUrl("icse-cisce", 11)).toBe(ISC_REGULATIONS_URL);
    expect(ncertClassUrl("icse-cisce", 12)).toBe(ISC_REGULATIONS_URL);
    expect(ncertClassUrl("icse-cisce", 4)).toBe("https://cisce.org/");
    for (const n of [4, 9, 10, 11, 12]) expect(ok.has(ncertClassUrl("icse-cisce", n)!)).toBe(true);
  });

  it("returns null where there is no single official source", () => {
    expect(ncertClassUrl("up-board", 10)).toBeNull();
    expect(ncertClassUrl("cbse", 0)).toBeNull();
    expect(ncertClassUrl("cbse", 13)).toBeNull();
    expect(ncertClassUrl("cbse", Number.NaN)).toBeNull();
  });

  it("every CISCE subject tile points at a live CISCE regulations page", () => {
    for (const cls of CLASS_SYLLABUS.filter((c) => c.boardSlug === "icse-cisce")) {
      for (const s of cls.subjects as SchoolSubject[]) {
        expect(s.books).toBeUndefined();
        expect(s.syllabusUrl).toBe(cls.classNum >= 11 ? ISC_REGULATIONS_URL : ICSE_REGULATIONS_URL);
      }
    }
  });
});

describe("CBSE / CISCE board links", () => {
  const ok = new Set(SOURCES.checked200.map((c) => c.url));
  const dead = new Set(SOURCES.dead.map((d) => d.url));

  it("CBSE and CISCE links were all fetched 200 on 25 Sep 2026", () => {
    for (const slug of ["cbse", "icse-cisce"]) {
      const b = findBoard(slug)!;
      const urls = [b.websiteUrl, b.syllabusUrl, b.samplePaperUrl, ...Object.values(b.samplePapersByClass ?? {})];
      for (const u of urls) expect(ok.has(u!), `${slug}: ${u}`).toBe(true);
      expect(b.lastVerified).toBe("2026-09");
    }
  });

  it("no board links a URL known to be dead", () => {
    for (const b of BOARDS) {
      for (const u of [b.websiteUrl, b.syllabusUrl, b.samplePaperUrl, ...Object.values(b.samplePapersByClass ?? {})]) {
        if (u) expect(dead.has(u), `${b.slug}: ${u}`).toBe(false);
      }
    }
  });

  it("per-class sample papers fall back to the board's general page", () => {
    const cbse = findBoard("cbse")!;
    expect(samplePapersFor(cbse, 10)).toBe("https://cbseacademic.nic.in/SQP_CLASSX_2026-27.html");
    expect(samplePapersFor(cbse, 12)).toBe("https://cbseacademic.nic.in/SQP_CLASSXII_2026-27.html");
    expect(samplePapersFor(cbse, 9)).toBe(cbse.samplePaperUrl);
    expect(samplePapersFor(findBoard("icse-cisce")!, 12)).toBe("https://cisce.org/isc-specimen-question-papers/");
    expect(samplePapersFor(findBoard("up-board")!, 10)).toBeUndefined();
  });
});
