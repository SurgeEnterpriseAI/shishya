// School board + class dataset — Phase 3 first cut.
//
// Hardcoded for the same reason as colleges-data.ts: this is reference
// information that changes once or twice a year when boards publish new
// syllabi or sample papers. Keeping it in source means updates ship via
// PR (visible diff, code review) rather than via an opaque DB seed.
//
// Sources for every board's syllabus / sample papers / blueprint are
// the board's own websites (links below). Shishya does NOT republish
// the syllabus PDFs — we link out so students always get the current
// version straight from the board.
//
// 25 Sep 2026: blurbs cut to what each board's own name says it runs. The
// May copy carried unsourced counts ("27,000 schools", "~250 IB schools")
// and admission claims that had gone stale (Tamil Nadu medical admissions go
// through NEET; TS EAMCET is now EAPCET). CBSE and CISCE URLs were
// re-checked that day; the state-board URLs were not (lastVerified 2026-05).

export const SCHOOLING_LAST_VERIFIED = "2026-05";

// 25 Sep 2026: every /schooling page is noindex (links still followed) until
// school content passes a content gate (K-12 plan, Step 0). The pages stay
// reachable by URL; nothing school-related goes into sitemap / llms.txt /
// robots / context.md in this phase. Pinned by tests/unit/schooling-honesty.test.ts.
export const SCHOOLING_ROBOTS = { index: false, follow: true } as const;

export type BoardType =
  | "national-public"   // CBSE, NIOS — central govt boards
  | "national-private"  // ICSE (CISCE) — national private
  | "state"             // state-government boards
  | "international";    // IB, Cambridge IGCSE/A-Levels

export interface Board {
  slug: string;
  name: string;
  shortName: string;
  type: BoardType;
  // The state code this board is primarily associated with; null for
  // pan-India boards. ISO state code matching state-info.ts.
  state: string | null;
  classes: number[]; // which classes (1-12) this board covers
  language: string[]; // primary languages of instruction available
  // Official URLs students need:
  websiteUrl: string;       // board home page
  syllabusUrl?: string;     // syllabus / curriculum page (optional — many state boards consolidate this on the home page)
  samplePaperUrl?: string;  // sample papers / past papers page
  // Per-class sample-paper pages where the board publishes them separately
  // (25 Sep 2026: CBSE Class X / XII 2026-27, CISCE ICSE / ISC specimen papers).
  samplePapersByClass?: Partial<Record<number, string>>;
  blurb: string;
  lastVerified: string;
}

export const BOARDS: Board[] = [
  // ── National public ─────────────────────────────────────────────────
  {
    slug: "cbse",
    name: "Central Board of Secondary Education",
    shortName: "CBSE",
    type: "national-public",
    state: null,
    classes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    language: ["EN", "HI"],
    websiteUrl: "https://www.cbse.gov.in",
    // 25 Sep 2026: cbse.gov.in/cbsenew/SQP.html is a 404. The 2026-27
    // curriculum and sample papers live on cbseacademic.nic.in (all fetched
    // 200 that day). The blurb lost its school count and "February–March"
    // exam window: neither was sourced, and Class 10 now has two board exams.
    syllabusUrl: "https://cbseacademic.nic.in/curriculum_2027.html",
    samplePaperUrl: "https://cbseacademic.nic.in/",
    samplePapersByClass: {
      10: "https://cbseacademic.nic.in/SQP_CLASSX_2026-27.html",
      12: "https://cbseacademic.nic.in/SQP_CLASSXII_2026-27.html",
    },
    blurb: "Central board that runs the Class 10 and Class 12 board exams for its schools. For most subjects, CBSE's curriculum prescribes NCERT textbooks.",
    lastVerified: "2026-09",
  },
  {
    slug: "nios",
    name: "National Institute of Open Schooling",
    shortName: "NIOS",
    type: "national-public",
    state: null,
    classes: [9, 10, 11, 12],
    language: ["EN", "HI"],
    websiteUrl: "https://www.nios.ac.in",
    syllabusUrl: "https://nios.ac.in/online-course-material.aspx",
    samplePaperUrl: "https://www.nios.ac.in/online-course-material/question-papers.aspx",
    blurb: "India's open school: Secondary (Class 10) and Senior Secondary (Class 12) courses through open and distance learning.",
    lastVerified: "2026-05",
  },
  // ── National private ────────────────────────────────────────────────
  {
    slug: "icse-cisce",
    name: "Council for the Indian School Certificate Examinations",
    shortName: "ICSE / ISC",
    type: "national-private",
    state: null,
    classes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    language: ["EN"],
    websiteUrl: "https://www.cisce.org",
    // 25 Sep 2026: curriculum.aspx and specimen-question-papers.aspx are 404s
    // on the rebuilt cisce.org; these pages fetched 200 that day.
    syllabusUrl: "https://cisce.org/regulations-and-syllabuses-icse/",
    samplePaperUrl: "https://cisce.org/icse-specimen-question-papers/",
    samplePapersByClass: {
      10: "https://cisce.org/icse-specimen-question-papers/",
      12: "https://cisce.org/isc-specimen-question-papers/",
    },
    blurb: "Conducts the ICSE (Class 10) and ISC (Class 12) examinations.",
    lastVerified: "2026-09",
  },
  // ── International ───────────────────────────────────────────────────
  {
    slug: "ib",
    name: "International Baccalaureate",
    shortName: "IB",
    type: "international",
    state: null,
    classes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    language: ["EN"],
    websiteUrl: "https://www.ibo.org",
    syllabusUrl: "https://www.ibo.org/programmes",
    blurb: "International curriculum in three stages (PYP / MYP / DP). The Diploma Programme covers the last two school years.",
    lastVerified: "2026-05",
  },
  {
    slug: "cambridge-igcse",
    name: "Cambridge International Examinations",
    shortName: "Cambridge IGCSE / A-Levels",
    type: "international",
    state: null,
    classes: [9, 10, 11, 12],
    language: ["EN"],
    websiteUrl: "https://www.cambridgeinternational.org",
    syllabusUrl: "https://www.cambridgeinternational.org/programmes-and-qualifications",
    blurb: "UK-based international qualifications: IGCSE (around Class 10) and AS / A Levels (around Classes 11–12).",
    lastVerified: "2026-05",
  },
  // ── Major state boards ──────────────────────────────────────────────
  {
    slug: "tn-state-board",
    name: "Tamil Nadu State Board of School Examination",
    shortName: "TN State Board",
    type: "state",
    state: "TN",
    classes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    language: ["TA", "EN"],
    websiteUrl: "https://www.dge.tn.gov.in",
    syllabusUrl: "https://www.tnschools.gov.in",
    blurb: "Tamil Nadu's state board for school examinations.",
    lastVerified: "2026-05",
  },
  {
    slug: "mh-ssc-hsc",
    name: "Maharashtra State Board of Secondary and Higher Secondary Education",
    shortName: "Maharashtra SSC / HSC",
    type: "state",
    state: "MH",
    classes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    language: ["MR", "EN", "HI"],
    websiteUrl: "https://www.mahahsscboard.in",
    blurb: "Maharashtra's state board for the SSC (Class 10) and HSC (Class 12) examinations.",
    lastVerified: "2026-05",
  },
  {
    slug: "up-board",
    name: "Board of High School and Intermediate Education Uttar Pradesh",
    shortName: "UP Board",
    type: "state",
    state: "UP",
    classes: [9, 10, 11, 12],
    language: ["HI", "EN"],
    websiteUrl: "https://upmsp.edu.in",
    blurb: "Uttar Pradesh's board for the High School (Class 10) and Intermediate (Class 12) examinations.",
    lastVerified: "2026-05",
  },
  {
    slug: "ka-puc",
    name: "Karnataka Department of Pre-University Education",
    shortName: "Karnataka PUC",
    type: "state",
    state: "KA",
    classes: [11, 12],
    language: ["KN", "EN"],
    websiteUrl: "https://pue.karnataka.gov.in",
    blurb: "Karnataka's pre-university (Class 11–12) department. Class 11 is 1st PUC, Class 12 is 2nd PUC.",
    lastVerified: "2026-05",
  },
  {
    slug: "ka-sslc",
    name: "Karnataka Secondary Education Examination Board",
    shortName: "Karnataka SSLC",
    type: "state",
    state: "KA",
    classes: [9, 10],
    language: ["KN", "EN"],
    websiteUrl: "https://kseab.karnataka.gov.in",
    blurb: "Karnataka's board for the SSLC (Class 10) examination.",
    lastVerified: "2026-05",
  },
  {
    slug: "wb-wbbse",
    name: "West Bengal Board of Secondary Education",
    shortName: "WBBSE",
    type: "state",
    state: "WB",
    classes: [5, 6, 7, 8, 9, 10],
    language: ["BN", "EN", "HI"],
    websiteUrl: "https://wbbse.wb.gov.in",
    blurb: "West Bengal's board for the Madhyamik (Class 10) examination. Classes 11–12 are under WBCHSE.",
    lastVerified: "2026-05",
  },
  {
    slug: "wb-wbchse",
    name: "West Bengal Council of Higher Secondary Education",
    shortName: "WBCHSE",
    type: "state",
    state: "WB",
    classes: [11, 12],
    language: ["BN", "EN", "HI"],
    websiteUrl: "https://wbchse.wb.gov.in",
    blurb: "West Bengal's council for the Higher Secondary (Uchcha Madhyamik, Classes 11–12) examination.",
    lastVerified: "2026-05",
  },
  {
    slug: "ap-bie",
    name: "Andhra Pradesh Board of Intermediate Education",
    shortName: "AP BIE",
    type: "state",
    state: "AP",
    classes: [11, 12],
    language: ["TE", "EN"],
    websiteUrl: "https://bie.ap.gov.in",
    blurb: "Andhra Pradesh's board for the Intermediate (Classes 11–12) examinations.",
    lastVerified: "2026-05",
  },
  {
    slug: "ts-bie",
    name: "Telangana Board of Intermediate Education",
    shortName: "TS BIE",
    type: "state",
    state: "TS",
    classes: [11, 12],
    language: ["TE", "EN"],
    websiteUrl: "https://tsbie.cgg.gov.in",
    blurb: "Telangana's board for the Intermediate (Classes 11–12) examinations.",
    lastVerified: "2026-05",
  },
  {
    slug: "kl-dhse",
    name: "Kerala Directorate of Higher Secondary Education",
    shortName: "Kerala DHSE",
    type: "state",
    state: "KL",
    classes: [11, 12],
    language: ["ML", "EN"],
    websiteUrl: "https://dhsekerala.gov.in",
    blurb: "Kerala's directorate for Higher Secondary (Classes 11–12) education and examinations.",
    lastVerified: "2026-05",
  },
  {
    slug: "gj-gseb",
    name: "Gujarat Secondary and Higher Secondary Education Board",
    shortName: "GSEB",
    type: "state",
    state: "GJ",
    classes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    language: ["GU", "EN", "HI"],
    websiteUrl: "https://gseb.org",
    blurb: "Gujarat's state board for the SSC (Class 10) and HSC (Class 12) examinations.",
    lastVerified: "2026-05",
  },
  {
    slug: "rj-rbse",
    name: "Rajasthan Board of Secondary Education",
    shortName: "RBSE",
    type: "state",
    state: "RJ",
    classes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    language: ["HI", "EN"],
    websiteUrl: "https://rajeduboard.rajasthan.gov.in",
    blurb: "Rajasthan's board for the Secondary (Class 10) and Senior Secondary (Class 12) examinations.",
    lastVerified: "2026-05",
  },
  {
    slug: "mp-mpbse",
    name: "Madhya Pradesh Board of Secondary Education",
    shortName: "MP Board",
    type: "state",
    state: "MP",
    classes: [9, 10, 11, 12],
    language: ["HI", "EN"],
    websiteUrl: "https://mpbse.nic.in",
    blurb: "Madhya Pradesh's board for the High School (Class 10) and Higher Secondary (Class 12) examinations.",
    lastVerified: "2026-05",
  },
  {
    slug: "bihar-bseb",
    name: "Bihar School Examination Board",
    shortName: "BSEB",
    type: "state",
    state: "BR",
    classes: [9, 10, 11, 12],
    language: ["HI", "EN"],
    websiteUrl: "https://biharboardonline.bihar.gov.in",
    blurb: "Bihar's board for the Matric (Class 10) and Intermediate (Class 12) examinations.",
    lastVerified: "2026-05",
  },
  {
    slug: "pb-pseb",
    name: "Punjab School Education Board",
    shortName: "PSEB",
    type: "state",
    state: "PB",
    classes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    language: ["PA", "EN", "HI"],
    websiteUrl: "https://pseb.ac.in",
    blurb: "Punjab's state board for school examinations.",
    lastVerified: "2026-05",
  },
];

// Common subjects per stream at Class 11-12 level. Used to scaffold the
// subject pages without enumerating every state board's exact paper list.
export const CLASS_11_12_STREAMS: Record<string, { label: string; subjects: string[] }> = {
  science: {
    label: "Science (PCM / PCB)",
    subjects: ["Physics", "Chemistry", "Mathematics", "Biology", "Computer Science", "English"],
  },
  commerce: {
    label: "Commerce",
    subjects: ["Accountancy", "Business Studies", "Economics", "Mathematics", "Statistics", "English"],
  },
  humanities: {
    label: "Humanities / Arts",
    subjects: ["History", "Geography", "Political Science", "Sociology", "Psychology", "English", "Languages"],
  },
};

// Helper: get all boards available in a given state (state's own + national).
export function boardsForState(stateCode: string): Board[] {
  return BOARDS.filter((b) => b.state === stateCode || b.state === null);
}

export function findBoard(slug: string): Board | undefined {
  return BOARDS.find((b) => b.slug === slug);
}

/** The board's own sample-paper page for one class, else its general one. */
export function samplePapersFor(board: Board, classNum: number): string | undefined {
  return board.samplePapersByClass?.[classNum] ?? board.samplePaperUrl;
}

/** Which official pages a board's page actually links (the website always). */
export function boardLinks(board: Board): { syllabus: boolean; samplePapers: boolean } {
  return {
    syllabus: Boolean(board.syllabusUrl),
    samplePapers: Boolean(board.samplePaperUrl) || Object.values(board.samplePapersByClass ?? {}).some(Boolean),
  };
}

// 26 Sep 2026: the board page's title and description said "Official
// Syllabus and Sample Paper Links" for all 20 boards, but 14 link neither
// page (only the board website) and 17 link no sample papers. Title and
// description now name only the links the page has.
export function boardLinkCopy(board: Board): { title: string; phrase: string } {
  const { syllabus, samplePapers } = boardLinks(board);
  if (syllabus && samplePapers) {
    return { title: "Official Syllabus and Sample Paper Links", phrase: "the board's own website, syllabus page and sample-paper pages" };
  }
  if (syllabus) return { title: "Official Website and Syllabus Links", phrase: "the board's own website and syllabus page" };
  if (samplePapers) return { title: "Official Website and Sample Paper Links", phrase: "the board's own website and sample-paper page" };
  return { title: "Official Website Link", phrase: "the board's own website" };
}

// 26 Sep 2026: the class page's "Class 10/12 board exam" card said every
// board publishes sample papers "on its own site", for all 20 boards,
// including IB (no Class 10 board exam) and state boards whose sites were
// never checked. It now shows only where we hold the board's own
// question-paper link (CBSE, CISCE, NIOS) and only for Class 10 / 12.
/** The board's own question-paper page for its Class 10 / 12 exam, else undefined. */
export function boardExamPapersFor(board: Board, classNum: number): string | undefined {
  if (classNum !== 10 && classNum !== 12) return undefined;
  return samplePapersFor(board, classNum);
}
