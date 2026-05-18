// NCERT / ICSE / state-board subject lists per (board, class).
//
// Hardcoded TS for the same reasons as colleges-data / schooling-data:
// reference data that only changes when a board revises its curriculum.
// Updates ship via PR (visible diff) instead of via DB seed.
//
// Per the Phase 0 audit decision: subject TILES surface for Class 10
// and Class 12 across CBSE + ICSE first (Day 1 of the schooling
// build). Other class/board combos render an honest "subjects coming"
// stub until populated.
//
// Each subject entry includes the NCERT/ICSE official chapter URL
// where applicable, so even before our chapter pages exist, students
// see the authoritative source.

export interface SchoolSubject {
  // URL slug for /schooling/[board]/class-[n]/[subject-slug]
  slug: string;
  // Display name
  name: string;
  // Short blurb shown on the subject tile
  blurb: string;
  // Approximate chapter count (NCERT) — used for the tile metadata
  chapterCount?: number;
  // Direct link to NCERT/board chapter PDFs index for this subject + class
  officialChapterIndex?: string;
  // Tag indicating if this subject is foundational for a downstream
  // entrance exam — drives the cross-link surface on the subject page
  // (e.g., "This subject is foundational for JEE Main").
  feedsExams?: string[];
}

export interface ClassSyllabus {
  // ISO-style key: "cbse-class-10", "icse-class-12"
  key: string;
  boardSlug: string;          // matches schooling-data.ts board slugs
  classNum: number;
  subjects: SchoolSubject[];
}

// ─────────────────────────────────────────────────────────────────────
// CBSE Class 10  (per CBSE/NCERT 2024-25 curriculum)
// Source: https://www.cbse.gov.in/cbsenew/curriculum.html
// ─────────────────────────────────────────────────────────────────────
const CBSE_CLASS_10_SUBJECTS: SchoolSubject[] = [
  {
    slug: "mathematics",
    name: "Mathematics",
    blurb: "Real numbers, polynomials, linear equations, trigonometry, statistics. The foundation for every quantitative entrance exam.",
    chapterCount: 15,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?jemh1=0-15",
    feedsExams: ["JEE_MAIN"],
  },
  {
    slug: "science",
    name: "Science",
    blurb: "Light + electricity + chemical reactions + heredity + ecosystems. Combined physics, chemistry, biology — splits in Class 11.",
    chapterCount: 13,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?jesc1=0-13",
    feedsExams: ["JEE_MAIN", "NEET_UG"],
  },
  {
    slug: "social-science",
    name: "Social Science",
    blurb: "History, geography, civics, economics. Includes the rise of nationalism, agriculture, federalism, money + credit.",
    chapterCount: 18,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?jess1=0-18",
  },
  {
    slug: "english",
    name: "English (First Flight + Footprints)",
    blurb: "Prose, poetry, supplementary reading + grammar + writing skills. Two textbooks: First Flight (main) + Footprints Without Feet (supplementary).",
    chapterCount: 11,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?jeff1=0-12",
  },
  {
    slug: "hindi-a",
    name: "Hindi Course A (Kshitij + Kritika)",
    blurb: "हिंदी कोर्स A. क्षितिज (पद्य + गद्य) + कृतिका. CBSE Class 10 का मुख्य हिंदी पाठ्यक्रम.",
    chapterCount: 14,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?jhks1=0-13",
  },
  {
    slug: "hindi-b",
    name: "Hindi Course B (Sparsh + Sanchayan)",
    blurb: "हिंदी कोर्स B. स्पर्श + संचयन. हिंदी द्वितीय भाषा के रूप में पढ़ने वालों के लिए.",
    chapterCount: 13,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?jhsp1=0-13",
  },
  {
    slug: "computer-applications",
    name: "Computer Applications (Optional)",
    blurb: "Networking, HTML, cybersecurity, scratch programming. CBSE skill-subject taught alongside the 5 main subjects.",
    chapterCount: 7,
  },
];

// ─────────────────────────────────────────────────────────────────────
// CBSE Class 12  (per CBSE/NCERT 2024-25 curriculum)
// Streams: Science (PCM / PCMB / PCB), Commerce, Humanities
// Source: https://www.cbse.gov.in/cbsenew/curriculum.html
// ─────────────────────────────────────────────────────────────────────
const CBSE_CLASS_12_SUBJECTS: SchoolSubject[] = [
  // Science stream
  {
    slug: "physics",
    name: "Physics",
    blurb: "Electrostatics, current electricity, magnetism, EMI, EM waves, optics, modern physics. The single most-tested subject for engineering entrances.",
    chapterCount: 15,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?leph1=0-8",
    feedsExams: ["JEE_MAIN", "JEE_ADVANCED", "NEET_UG"],
  },
  {
    slug: "chemistry",
    name: "Chemistry",
    blurb: "Solid state, solutions, electrochemistry, kinetics, coordination compounds, biomolecules. Critical for NEET, fundamental for JEE.",
    chapterCount: 16,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?lech1=0-9",
    feedsExams: ["JEE_MAIN", "JEE_ADVANCED", "NEET_UG"],
  },
  {
    slug: "mathematics",
    name: "Mathematics",
    blurb: "Relations + functions, calculus, vectors, 3-D geometry, linear programming, probability. The hardest of the three for JEE.",
    chapterCount: 13,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?lemh1=0-13",
    feedsExams: ["JEE_MAIN", "JEE_ADVANCED"],
  },
  {
    slug: "biology",
    name: "Biology",
    blurb: "Reproduction, genetics + evolution, biology + human welfare, biotechnology, ecology. The largest single-subject weight in NEET.",
    chapterCount: 13,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?lebo1=0-16",
    feedsExams: ["NEET_UG"],
  },
  // Commerce stream
  {
    slug: "accountancy",
    name: "Accountancy",
    blurb: "Partnership, financial statements, cash flow, ratio analysis. Single largest CA Foundation prep input.",
    chapterCount: 13,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?leac1=0-6",
  },
  {
    slug: "business-studies",
    name: "Business Studies",
    blurb: "Principles of management, business environment, marketing, consumer protection. Conceptual subject — strong reading + writing weight.",
    chapterCount: 12,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?lebs1=0-12",
  },
  {
    slug: "economics",
    name: "Economics",
    blurb: "Microeconomics (consumer behaviour, market structures) + macroeconomics (national income, money + banking, government budget).",
    chapterCount: 16,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?leie1=0-6",
    feedsExams: ["IPMAT"],
  },
  // Humanities
  {
    slug: "history",
    name: "History",
    blurb: "Themes in Indian history (3 volumes). Bricks, beads + bones; kings + chronicles; colonialism + countryside; Mahatma Gandhi; framing the constitution.",
    chapterCount: 15,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?lehs1=0-15",
    feedsExams: ["UPSC_PRELIMS"],
  },
  {
    slug: "political-science",
    name: "Political Science",
    blurb: "Contemporary world politics + politics in India since Independence. UPSC-relevant for Polity + International Relations.",
    chapterCount: 16,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?leps1=0-9",
    feedsExams: ["UPSC_PRELIMS"],
  },
  {
    slug: "geography",
    name: "Geography",
    blurb: "Fundamentals of human geography + India: people + economy. Strong UPSC overlap, especially for Indian geography paper.",
    chapterCount: 17,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?legy1=0-10",
    feedsExams: ["UPSC_PRELIMS"],
  },
  {
    slug: "english-core",
    name: "English Core (Flamingo + Vistas)",
    blurb: "Prose, poetry, supplementary (short stories). Required across all streams — counts toward best-of-5 percentage.",
    chapterCount: 12,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?lefl1=0-8",
  },
];

// ─────────────────────────────────────────────────────────────────────
// ICSE Class 10  (per CISCE 2024-25 curriculum)
// Source: https://cisce.org/curriculum.aspx
// ─────────────────────────────────────────────────────────────────────
const ICSE_CLASS_10_SUBJECTS: SchoolSubject[] = [
  { slug: "english-language",   name: "English I (Language)",      blurb: "Composition, comprehension, grammar.", chapterCount: 0 },
  { slug: "english-literature", name: "English II (Literature)",   blurb: "Treasure Chest, Merchant of Venice, poems.", chapterCount: 0 },
  { slug: "mathematics",        name: "Mathematics",               blurb: "ICSE Maths — wider arithmetic + commercial maths than CBSE.", chapterCount: 25, feedsExams: ["JEE_MAIN"] },
  { slug: "physics",            name: "Physics",                   blurb: "Force, energy, light, sound, current electricity, modern physics.", chapterCount: 11, feedsExams: ["JEE_MAIN", "NEET_UG"] },
  { slug: "chemistry",          name: "Chemistry",                 blurb: "Periodic properties, chemical bonding, analytical chemistry, acids + bases, ammonia.", chapterCount: 11, feedsExams: ["JEE_MAIN", "NEET_UG"] },
  { slug: "biology",            name: "Biology",                   blurb: "Cell + genetics + plant physiology + human anatomy + ecology.", chapterCount: 12, feedsExams: ["NEET_UG"] },
  { slug: "history-civics",     name: "History + Civics",          blurb: "Indian history (1857-1947) + Indian constitution + UN.", chapterCount: 0 },
  { slug: "geography",          name: "Geography",                 blurb: "Map work + agriculture + industry + India regional studies.", chapterCount: 0 },
  { slug: "computer-applications", name: "Computer Applications", blurb: "Java programming — classes, objects, arrays, strings.", chapterCount: 11 },
];

// ─────────────────────────────────────────────────────────────────────
// ICSE Class 12 (ISC) (per CISCE 2024-25 curriculum)
// ─────────────────────────────────────────────────────────────────────
const ICSE_CLASS_12_SUBJECTS: SchoolSubject[] = [
  { slug: "english",      name: "English",      blurb: "Compulsory paper across all streams.", chapterCount: 0 },
  { slug: "mathematics",  name: "Mathematics",  blurb: "Calculus, probability, vectors, 3-D geometry, linear programming.", chapterCount: 16, feedsExams: ["JEE_MAIN", "JEE_ADVANCED"] },
  { slug: "physics",      name: "Physics",      blurb: "Electrostatics, current electricity, magnetism, EM waves, modern physics, communication.", chapterCount: 11, feedsExams: ["JEE_MAIN", "JEE_ADVANCED", "NEET_UG"] },
  { slug: "chemistry",    name: "Chemistry",    blurb: "Physical, inorganic + organic. Slightly broader scope than CBSE.", chapterCount: 11, feedsExams: ["JEE_MAIN", "JEE_ADVANCED", "NEET_UG"] },
  { slug: "biology",      name: "Biology",      blurb: "Reproduction, genetics, evolution, biotechnology, ecology.", chapterCount: 14, feedsExams: ["NEET_UG"] },
  { slug: "accounts",     name: "Accounts",     blurb: "Partnership accounts, company accounts, financial statement analysis, ratio + cash flow.", chapterCount: 0 },
  { slug: "commerce",     name: "Commerce",     blurb: "Forms of business, management, trade, finance, leadership.", chapterCount: 0 },
  { slug: "economics",    name: "Economics",    blurb: "Micro + macro + Indian economic problems. Slightly heavier theory than CBSE.", chapterCount: 0, feedsExams: ["IPMAT"] },
  { slug: "history",      name: "History",      blurb: "World history + Indian history post-1857.", chapterCount: 0 },
  { slug: "psychology",   name: "Psychology",   blurb: "ISC offers a full psychology paper (CBSE has it too but lighter coverage).", chapterCount: 0 },
];

// ─────────────────────────────────────────────────────────────────────
// Public lookup table.
// ─────────────────────────────────────────────────────────────────────

export const CLASS_SYLLABUS: ClassSyllabus[] = [
  { key: "cbse-class-10", boardSlug: "cbse",       classNum: 10, subjects: CBSE_CLASS_10_SUBJECTS },
  { key: "cbse-class-12", boardSlug: "cbse",       classNum: 12, subjects: CBSE_CLASS_12_SUBJECTS },
  { key: "icse-class-10", boardSlug: "icse-cisce", classNum: 10, subjects: ICSE_CLASS_10_SUBJECTS },
  { key: "icse-class-12", boardSlug: "icse-cisce", classNum: 12, subjects: ICSE_CLASS_12_SUBJECTS },
];

export function findClassSyllabus(boardSlug: string, classNum: number): ClassSyllabus | undefined {
  return CLASS_SYLLABUS.find((c) => c.boardSlug === boardSlug && c.classNum === classNum);
}

export function findSubject(boardSlug: string, classNum: number, subjectSlug: string): SchoolSubject | undefined {
  return findClassSyllabus(boardSlug, classNum)?.subjects.find((s) => s.slug === subjectSlug);
}

/** Class-level NCERT URL for the "official syllabus" link on a class page. */
export function ncertClassUrl(boardSlug: string, classNum: number): string | null {
  // NCERT hosts CBSE chapter PDFs at well-known per-class paths.
  if (boardSlug === "cbse") {
    return `https://ncert.nic.in/textbook.php?fec1=${classNum}-12`;
  }
  if (boardSlug === "icse-cisce") {
    return "https://cisce.org/curriculum.aspx";
  }
  return null;
}
