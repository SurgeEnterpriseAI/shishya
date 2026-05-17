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

export const SCHOOLING_LAST_VERIFIED = "2026-05";

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
    syllabusUrl: "https://www.cbse.gov.in/cbsenew/curriculum.html",
    samplePaperUrl: "https://www.cbse.gov.in/cbsenew/SQP.html",
    blurb: "India's largest school board — over 27,000 affiliated schools. NCERT books are the prescribed core curriculum; Class 10 and Class 12 board exams typically held February–March every year.",
    lastVerified: "2026-05",
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
    blurb: "India's open school for distance learning. Equivalent to CBSE / state-board Class 10 and Class 12. On-demand examinations available — particularly valuable for students who dropped out, are repeating, or studying alongside work.",
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
    syllabusUrl: "https://cisce.org/curriculum.aspx",
    samplePaperUrl: "https://cisce.org/specimen-question-papers.aspx",
    blurb: "Second-largest national board after CBSE. Class 10 is the ICSE exam; Class 12 is the ISC exam. Tends to weight English language and laboratory practice more heavily than CBSE.",
    lastVerified: "2026-05",
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
    blurb: "Three-stage international curriculum (PYP / MYP / DP). The Diploma Programme is the most familiar Class 11–12 track — recognised globally for university admissions. ~250 IB World Schools in India.",
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
    blurb: "UK-origin international qualifications widely offered in India. IGCSE (Class 10 equivalent), AS/A-Levels (Class 11/12 equivalent). Strong subject-specific depth, broadly accepted by Indian universities.",
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
    blurb: "Tamil Nadu's state board. Class 12 result is the basis for Tamil Nadu's medical / engineering / arts undergraduate admissions via the TNCAA process.",
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
    blurb: "Maharashtra state board running SSC (Class 10) and HSC (Class 12). One of India's largest state board systems by student count.",
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
    blurb: "Uttar Pradesh state board — the largest state board in India by registered student count. Class 10 (High School) and Class 12 (Intermediate) exams are major annual cycles.",
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
    blurb: "Karnataka's pre-university (Class 11–12) examining body. Class 11 is 1st PUC, Class 12 is 2nd PUC. The 2nd PUC result determines KCET counselling rank.",
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
    blurb: "Karnataka's Class 10 examining board (SSLC). Separate from the PUC board which handles Class 11-12.",
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
    blurb: "West Bengal's secondary (Class 10 'Madhyamik') board. Class 11–12 are handled by WBCHSE separately.",
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
    blurb: "West Bengal's higher-secondary (Class 11–12) examining body. The Class 12 'Uchcha Madhyamik' result determines WB college admission rankings.",
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
    blurb: "Andhra Pradesh's intermediate (Class 11–12) examining body. The Intermediate result is the basis for AP EAPCET and other state admissions.",
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
    blurb: "Telangana's intermediate examining body, split from united AP after state bifurcation in 2014. Intermediate result drives TS EAMCET admissions.",
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
    blurb: "Kerala's Class 11–12 examining body. Class 12 result feeds into Kerala's KEAM-based admissions.",
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
    blurb: "Gujarat's state board for SSC (Class 10) and HSC (Class 12). HSC Science Class 12 results feed into GUJCET counselling.",
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
    blurb: "Rajasthan's secondary and higher-secondary board. Particularly large student body given Rajasthan's population.",
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
    blurb: "Madhya Pradesh state board. The MP Board scholarship for Class 12 toppers (Pratibha Kiran etc.) is tied to this examination result.",
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
    blurb: "Bihar's state board running Matric (Class 10) and Intermediate (Class 12) examinations. One of the largest state boards by enrolment.",
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
    blurb: "Punjab's state board. Class 12 result feeds into Punjab CET counselling.",
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
