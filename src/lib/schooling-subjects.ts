// NCERT / CISCE subject lists per (board, class).
//
// Hardcoded TS for the same reasons as colleges-data / schooling-data:
// reference data that only changes when a board revises its curriculum.
// Updates ship via PR (visible diff) instead of via DB seed.
//
// 25 Sep 2026 (school build, Step 0): rebuilt against the official sources,
// all fetched that day —
//   * NCERT's textbook index, https://ncert.nic.in/textbook.php. Every book
//     title and "code=first-last" query below is copied from it (snapshot:
//     tests/fixtures/ncert-textbook-index-2026-09-25.json).
//   * Each book's own contents page (its prelims PDF,
//     https://ncert.nic.in/textbook/pdf/<code>ps.pdf) — the only source for
//     chapter titles (snapshot: tests/fixtures/ncert-book-contents-2026-09-25.json).
//   * CBSE Curriculum 2026-27, https://cbseacademic.nic.in/curriculum_2027.html
//     — per-subject syllabus PDFs for Classes 9-12, and which NCERT books a
//     CBSE course uses (Hindi A / B, English) (snapshot:
//     tests/fixtures/school-official-sources-2026-09-25.json).
// Why: the May 2026 version described the NCERT books Classes 6-9 used
// before NCERT replaced them (6-8 are now Ganita Prakash / Curiosity /
// Poorvi / Malhar; 9 is Ganita Manjari / Exploration / Kaveri / Ganga),
// listed 22 chapters for Class 11 Biology (the book has 19), and linked
// book ranges that no longer match the books. The per-chapter blurbs were
// dropped: they were written from the pre-2023 books (Euclid's division
// lemma, cross-multiplication, ...) and nobody had checked them against
// today's books.
//
// Rules for this file:
//   * Book titles, codes and chapter titles are facts copied from NCERT's
//     own pages. Never textbook text: Shishya's own notes and questions are
//     written separately and live elsewhere.
//   * A chapter is listed only if it was read off that book's contents page.
//   * tests/unit/schooling-ncert-books.test.ts pins every book, chapter and
//     syllabus link here to the snapshots. When NCERT changes a book,
//     re-fetch, refresh the snapshot and this file in the same commit.

export const NCERT_INDEX_URL = "https://ncert.nic.in/textbook.php";
/** When the NCERT / CBSE / CISCE facts in this file were last read from the official pages. */
export const SCHOOL_SOURCES_CHECKED_ON = "25 Sep 2026";
export const CBSE_CURRICULUM_URL = "https://cbseacademic.nic.in/curriculum_2027.html";
export const ICSE_REGULATIONS_URL = "https://cisce.org/regulations-and-syllabuses-icse/";
export const ISC_REGULATIONS_URL = "https://cisce.org/regulations-and-syllabuses-isc/";
const CISCE_HOME_URL = "https://cisce.org/";

const cbseSyllabus = (file: string) => `https://cbseacademic.nic.in/web_material/CurriculumMain27/${file}`;

/** One NCERT textbook, exactly as NCERT's index lists it. */
export interface NcertBook {
  /** Title as NCERT's index spells it (typos included), e.g. "Ganita Prakash Part-I". */
  title: string;
  /** NCERT index query: book code "=" first-last chapter file, e.g. "hegp1=0-7". */
  query: string;
  /** Set on the Hindi- / Urdu-medium edition of a main book. Absent = the main book. */
  medium?: "hi" | "ur";
  /** The edition line on the book's imprint page, where we read the prelims. */
  edition?: string;
  /** One factual line shown under the book (e.g. "Part I"). */
  note?: string;
  /** Printed chapter titles read off the book's contents page: [url slug, title]. */
  chapters?: Array<[slug: string, title: string]>;
  /** Printed number of chapters[0]. Part II books continue the numbering (Physics Part II starts at 8). */
  firstChapter?: number;
}

export interface SchoolChapter {
  // URL slug for /schooling/[board]/class-[n]/[subject]/[chapter-slug]
  slug: string;
  // Title as printed on the book's contents page
  name: string;
  // Chapter number as printed in the book
  number: number;
  // The NCERT book the chapter is in
  book: NcertBook;
  // Position on NCERT's page for that book (a Part II book restarts at 1)
  numberInBook: number;
}

export interface SchoolSubject {
  // URL slug for /schooling/[board]/class-[n]/[subject-slug]
  slug: string;
  // Display name
  name: string;
  // Optional factual line for the subject tile; the tile falls back to the book titles
  blurb?: string;
  // Subject name on NCERT's index for this class (CBSE subjects taught from NCERT books)
  ncertSubject?: string;
  // NCERT books: main books first, then their Hindi / Urdu-medium editions
  books?: NcertBook[];
  // Official syllabus document for this subject + class
  syllabusUrl?: string;
  syllabusLabel?: string;
  // Entrance exams this subject leads into — drives the cross-link surface
  // on the subject page. Only codes that exist as live exam pages.
  feedsExams?: string[];
  // Chapter list, derived from the main books' contents pages (never hand-typed)
  chapters?: SchoolChapter[];
}

export interface ClassSyllabus {
  // ISO-style key: "cbse-class-10", "icse-class-12"
  key: string;
  boardSlug: string;          // matches schooling-data.ts board slugs
  classNum: number;
  subjects: SchoolSubject[];
}

export function ncertBookUrl(book: Pick<NcertBook, "query">): string {
  return `${NCERT_INDEX_URL}?${book.query}`;
}

/** Main books (not the Hindi / Urdu-medium editions). */
export function mainBooks(subject: SchoolSubject): NcertBook[] {
  return (subject.books ?? []).filter((b) => !b.medium);
}

export function booksInMedium(subject: SchoolSubject, medium: "hi" | "ur"): NcertBook[] {
  return (subject.books ?? []).filter((b) => b.medium === medium);
}

type BookExtra = Omit<NcertBook, "title" | "query" | "medium">;
const book = (title: string, query: string, extra: BookExtra = {}): NcertBook => ({ title, query, ...extra });
const hi = (title: string, query: string): NcertBook => ({ title, query, medium: "hi" });
const ur = (title: string, query: string): NcertBook => ({ title, query, medium: "ur" });

function subject(def: Omit<SchoolSubject, "chapters">): SchoolSubject {
  const chapters: SchoolChapter[] = [];
  for (const b of def.books ?? []) {
    if (b.medium || !b.chapters) continue;
    const first = b.firstChapter ?? 1;
    b.chapters.forEach(([slug, name], i) => {
      chapters.push({ slug, name, number: first + i, book: b, numberInBook: i + 1 });
    });
  }
  return chapters.length > 0 ? { ...def, chapters } : { ...def };
}

// ─────────────────────────────────────────────────────────────────────
// CBSE Classes 6-8 — NCERT's new books (NCERT index, 25 Sep 2026).
// No chapter lists yet: chapters get listed once read off each book.
// ─────────────────────────────────────────────────────────────────────
const CBSE_CLASS_6_SUBJECTS: SchoolSubject[] = [
  subject({
    slug: "mathematics", name: "Mathematics", ncertSubject: "Mathematics",
    books: [book("Ganita Prakash", "fegp1=0-10"), hi("Ganita Prakash (Hindi)", "fhgp1=0-10"), ur("Ganita Prakash (Urdu)", "fugp1=0-10")],
  }),
  subject({
    slug: "science", name: "Science", ncertSubject: "Science",
    books: [book("Curiosity", "fecu1=0-12"), hi("Jigyasa", "fhcu1=0-12"), ur("Tajassus", "fucu1=0-12")],
  }),
  subject({ slug: "english", name: "English", ncertSubject: "English", books: [book("Poorvi", "fepr1=0-5")] }),
  subject({ slug: "hindi", name: "Hindi", ncertSubject: "Hindi", books: [book("Malhar", "fhml1=0-13")] }),
  subject({
    slug: "social-science", name: "Social Science", ncertSubject: "Social Science",
    books: [
      book("Exploring Society India and Beyond", "fees1=0-14"),
      hi("Samaj Ka Aadhyan: Bharat or uske aage", "fhes1=0-14"),
      ur("Muashre Ki Daryaft Hindustan aur Us Se Aage (Urdu)", "fues1=0-14"),
    ],
  }),
];

const CBSE_CLASS_7_SUBJECTS: SchoolSubject[] = [
  subject({
    slug: "mathematics", name: "Mathematics", ncertSubject: "Mathematics",
    books: [
      book("Ganita Prakash", "gegp1=0-8"),
      book("Ganita Prakash-II", "gegp2=0-7"),
      hi("Ganita Prakash(Hindi)", "ghgp1=0-8"),
      hi("Ganita Prakash-II (Hindi)", "ghgp2=0-7"),
      ur("Ganita Prakash(Urdu)", "gugp1=0-8"),
    ],
  }),
  subject({
    slug: "science", name: "Science", ncertSubject: "Science",
    books: [book("Curiosity", "gecu1=0-12"), hi("Jigyasa", "ghcu1=0-12"), ur("Tajassus", "gucu1=0-12")],
  }),
  subject({ slug: "english", name: "English", ncertSubject: "English", books: [book("Poorvi", "gepr1=0-5")] }),
  subject({ slug: "hindi", name: "Hindi", ncertSubject: "Hindi", books: [book("Malhar", "ghml1=0-10")] }),
  subject({
    slug: "social-science", name: "Social Science", ncertSubject: "Social Science",
    books: [
      book("Exploring Society India and Beyond Part-I", "gees1=0-12"),
      book("Exploring Society India and Beyond Part-II", "gees2=0-8"),
      hi("Samaj Ka Aadhyan: Bharat or uske aage Part-I", "ghes1=0-12"),
      hi("Samaj Ka Aadhyan: Bharat or uske aage Part-II", "ghes2=0-8"),
      ur("Muashrey ki Daryaft - Hindustan aur Uske age Part-I", "gues1=0-12"),
      ur("Muashrey ki Daryaft - Hindustan aur Uske age Part-II", "gues2=0-8"),
    ],
  }),
];

const CBSE_CLASS_8_SUBJECTS: SchoolSubject[] = [
  subject({
    slug: "mathematics", name: "Mathematics", ncertSubject: "Mathematics",
    books: [
      book("Ganita Prakash Part-I", "hegp1=0-7"),
      book("Ganita Prakash Part-II", "hegp2=0-7"),
      hi("Ganita Prakash Part-I (Hindi)", "hhgp1=0-7"),
      ur("Ganita Prakash Part-I (Urdu)", "hugp1=0-7"),
    ],
  }),
  subject({
    slug: "science", name: "Science", ncertSubject: "Science",
    books: [book("Curiosity", "hecu1=0-13"), hi("Jigyasa", "hhcu1=0-13"), ur("Tajassus", "hucu1=0-13")],
  }),
  subject({ slug: "english", name: "English", ncertSubject: "English", books: [book("Poorvi", "hepr1=0-5")] }),
  subject({ slug: "hindi", name: "Hindi", ncertSubject: "Hindi", books: [book("Malhar", "hhml1=0-10")] }),
  subject({
    slug: "social-science", name: "Social Science", ncertSubject: "Social Science",
    books: [
      book("Exploring Society India and Beyond Part-I", "hees1=0-7"),
      book("Exploring Society India and Beyond Part-II", "hees2=0-8"),
      hi("Samaj Ka Aadhyan: Bharat or uske aage Part-I", "hhes1=0-7"),
      ur("Muashrey ki Daryaft - Hindustan Aur Uske Age Part-I", "hues1=0-7"),
    ],
  }),
];

// ─────────────────────────────────────────────────────────────────────
// CBSE Class 9 — NCERT's new books for 2026-27 (first edition, April 2026).
// CBSE 2026-27 has a single Hindi syllabus for Class IX (no Course A / B),
// so the old hindi-a / hindi-b pages were folded into "hindi".
// ─────────────────────────────────────────────────────────────────────
const CBSE_CLASS_9_SUBJECTS: SchoolSubject[] = [
  subject({
    slug: "mathematics", name: "Mathematics", ncertSubject: "Mathematics",
    syllabusUrl: cbseSyllabus("SecPart1/Maths_SecP1IX_2026-27.pdf"),
    books: [
      book("Ganita Manjari", "iemh1=0-8", {
        edition: "First Edition April 2026",
        note: "Part I. NCERT's index lists no Part II yet.",
        chapters: [
          ["orienting-yourself-the-use-of-coordinates", "Orienting Yourself: The Use of Coordinates"],
          ["introduction-to-linear-polynomials", "Introduction to Linear Polynomials"],
          ["the-world-of-numbers", "The World of Numbers"],
          ["exploring-algebraic-identities", "Exploring Algebraic Identities"],
          ["im-up-and-down-and-round-and-round", "I’m Up and Down, and Round and Round"],
          ["measuring-space-perimeter-and-area", "Measuring Space: Perimeter and Area"],
          ["the-mathematics-of-maybe-introduction-to-probability", "The Mathematics of Maybe: Introduction to Probability"],
          ["predicting-what-comes-next-exploring-sequences-and-progressions", "Predicting What Comes Next: Exploring Sequences and Progressions"],
        ],
      }),
      hi("Ganita Manjari (Hindi)", "ihmh1=0-8"),
      ur("Ganit Manjari (Urdu)", "iumh1=0-8"),
    ],
  }),
  subject({
    slug: "science", name: "Science", ncertSubject: "Science",
    syllabusUrl: cbseSyllabus("SecPart1/ScienceSt_SecP1_2026-27.pdf"),
    books: [
      book("Exploration", "iesc1=0-13", {
        edition: "First Edition April 2026",
        chapters: [
          ["exploration-entering-the-world-of-secondary-science", "Exploration: Entering the World of Secondary Science"],
          ["cell-the-building-block-of-life", "Cell: The Building Block of Life"],
          ["tissues-in-action", "Tissues in Action"],
          ["describing-motion-around-us", "Describing Motion Around Us"],
          ["exploring-mixtures-and-their-separation", "Exploring Mixtures and their Separation"],
          ["how-forces-affect-motion", "How Forces Affect Motion"],
          ["work-energy-and-simple-machines", "Work, Energy, and Simple Machines"],
          ["journey-inside-the-atom", "Journey Inside the Atom"],
          ["atomic-foundations-of-matter", "Atomic Foundations of Matter"],
          ["sound-waves-characteristics-and-applications", "Sound Waves: Characteristics and Applications"],
          ["reproduction-how-life-continues", "Reproduction: How Life Continues"],
          ["patterns-in-life-diversity-and-classification", "Patterns in Life: Diversity and Classification"],
          ["earth-as-a-system-energy-matter-and-life", "Earth as a System: Energy, Matter, and Life"],
        ],
      }),
      hi("Anveshan", "ihsc1=0-13"),
    ],
  }),
  subject({
    slug: "english", name: "English", ncertSubject: "English",
    syllabusUrl: cbseSyllabus("SecPart1/English_LL_SecP1IX_2026-27.pdf"),
    books: [book("Kaveri", "iebe1=0-8")],
  }),
  subject({
    slug: "hindi", name: "Hindi", ncertSubject: "Hindi",
    syllabusUrl: cbseSyllabus("SecPart1/Hindi_SecP1IX_2026-27.pdf"),
    books: [book("Ganga", "ihga1=0-12")],
  }),
  subject({
    slug: "social-science", name: "Social Science", ncertSubject: "Social Science",
    syllabusUrl: cbseSyllabus("SecPart1/SocialScience_SecP1IX_2026-27.pdf"),
    books: [book("Understanding Society India and Beyond PART-I", "iest1=0-9")],
  }),
];

// ─────────────────────────────────────────────────────────────────────
// CBSE Class 10 — NCERT books, Reprint 2026-27.
// ─────────────────────────────────────────────────────────────────────
const CBSE_CLASS_10_SUBJECTS: SchoolSubject[] = [
  subject({
    slug: "mathematics", name: "Mathematics", ncertSubject: "Mathematics",
    syllabusUrl: cbseSyllabus("SecPart1/Maths_SecP1X_2026-27.pdf"),
    feedsExams: ["JEE_MAIN"],
    books: [
      book("Mathematics", "jemh1=0-14", {
        edition: "Reprint 2026-27",
        chapters: [
          ["real-numbers", "Real Numbers"],
          ["polynomials", "Polynomials"],
          ["pair-of-linear-equations", "Pair of Linear Equations in Two Variables"],
          ["quadratic-equations", "Quadratic Equations"],
          ["arithmetic-progressions", "Arithmetic Progressions"],
          ["triangles", "Triangles"],
          ["coordinate-geometry", "Coordinate Geometry"],
          ["introduction-to-trigonometry", "Introduction to Trigonometry"],
          ["applications-of-trigonometry", "Some Applications of Trigonometry"],
          ["circles", "Circles"],
          ["areas-related-to-circles", "Areas Related to Circles"],
          ["surface-areas-and-volumes", "Surface Areas and Volumes"],
          ["statistics", "Statistics"],
          ["probability", "Probability"],
        ],
      }),
      hi("Ganit", "jhmh1=0-14"),
      ur("Riyazi", "jumh1=0-15"),
    ],
  }),
  subject({
    slug: "science", name: "Science", ncertSubject: "Science",
    syllabusUrl: cbseSyllabus("SecPart1/Science_SecP1_2026-27.pdf"),
    feedsExams: ["JEE_MAIN", "NEET_UG"],
    books: [
      book("Science", "jesc1=0-13", {
        edition: "Reprint 2026-27",
        chapters: [
          ["chemical-reactions-and-equations", "Chemical Reactions and Equations"],
          ["acids-bases-and-salts", "Acids, Bases and Salts"],
          ["metals-and-non-metals", "Metals and Non-metals"],
          ["carbon-and-its-compounds", "Carbon and its Compounds"],
          ["life-processes", "Life Processes"],
          ["control-and-coordination", "Control and Coordination"],
          ["how-do-organisms-reproduce", "How do Organisms Reproduce?"],
          ["heredity", "Heredity"],
          ["light-reflection-and-refraction", "Light – Reflection and Refraction"],
          ["human-eye-and-colourful-world", "The Human Eye and the Colourful World"],
          ["electricity", "Electricity"],
          ["magnetic-effects-of-current", "Magnetic Effects of Electric Current"],
          ["our-environment", "Our Environment"],
        ],
      }),
      hi("Vigyan", "jhsc1=0-13"),
      ur("Science(Urdu)", "jusc1=0-16"),
    ],
  }),
  subject({
    slug: "social-science", name: "Social Science", ncertSubject: "Social Science",
    syllabusUrl: cbseSyllabus("SecPart1/SocialScience_SecP1X_2026-27.pdf"),
    books: [
      book("Contemporary India", "jess1=0-7"),
      book("Understanding Economic Development", "jess2=0-5"),
      book("India and the Contemporary World-II", "jess3=0-5"),
      book("Democratic Politics", "jess4=0-5"),
      hi("Samkalin Bharat", "jhss1=0-7"),
      hi("Arthik Vikas ki Samajh", "jhss2=0-5"),
      hi("Bharat Aur Samakalin Vishav-2", "jhss3=0-5"),
      hi("Loktantrik Rajniti", "jhss4=0-5"),
      ur("Aasri Hindustan-II", "juss1=0-7"),
      ur("Maashi Taraqqui Ki Samajh", "juss2=0-5"),
      ur("Hindustan Aur Asri Duniya", "juss3=0-5"),
      ur("Jamhuri Siyasat-II", "juss4=0-8"),
    ],
  }),
  subject({
    slug: "english", name: "English (Language and Literature)", ncertSubject: "English",
    syllabusUrl: cbseSyllabus("SecPart1/English_LL_SecP1_2026-27.pdf"),
    books: [book("First Flight", "jeff1=0-9"), book("Foot Prints Without feet Supp. Reader", "jefp1=0-9")],
  }),
  subject({
    slug: "hindi-a", name: "Hindi Course A", ncertSubject: "Hindi",
    syllabusUrl: cbseSyllabus("SecPart1/Hindi_A_SecP1_2026-27.pdf"),
    books: [book("Kshitij-2", "jhks1=0-12"), book("Kritika", "jhkr1=0-3")],
  }),
  subject({
    slug: "hindi-b", name: "Hindi Course B", ncertSubject: "Hindi",
    syllabusUrl: cbseSyllabus("SecPart1/Hindi_B_SecP1_2026-27.pdf"),
    books: [book("Sparsh", "jhsp1=0-14"), book("Sanchayan Bhag-2", "jhsy1=0-3")],
  }),
  subject({
    slug: "computer-applications", name: "Computer Applications (optional)",
    blurb: "An optional subject in CBSE's Class 10 curriculum. NCERT's index has no textbook for it; the syllabus is CBSE's own.",
    syllabusUrl: cbseSyllabus("SecPart1/Computer_Applications_SecP1X_2026-27.pdf"),
  }),
];

// ─────────────────────────────────────────────────────────────────────
// CBSE Class 11 — NCERT books, Reprint 2026-27. Part I / Part II books
// share one chapter numbering (Physics Part II starts at Chapter 8).
// ─────────────────────────────────────────────────────────────────────
const CBSE_CLASS_11_SUBJECTS: SchoolSubject[] = [
  subject({
    slug: "physics", name: "Physics", ncertSubject: "Physics",
    syllabusUrl: cbseSyllabus("SecPart2/Physics_SecP2_2026-27.pdf"),
    feedsExams: ["JEE_MAIN", "JEE_ADVANCED", "NEET_UG"],
    books: [
      book("Physics Part-I", "keph1=0-7", {
        edition: "Reprint 2026-27",
        chapters: [
          ["units-and-measurements", "Units and Measurements"],
          ["motion-in-a-straight-line", "Motion in a Straight Line"],
          ["motion-in-a-plane", "Motion in a Plane"],
          ["laws-of-motion", "Laws of Motion"],
          ["work-energy-power", "Work, Energy and Power"],
          ["system-of-particles-rotational-motion", "System of Particles and Rotational Motion"],
          ["gravitation", "Gravitation"],
        ],
      }),
      book("Physics Part-II", "keph2=0-7", {
        edition: "Reprint 2026-27",
        firstChapter: 8,
        chapters: [
          ["mechanical-properties-of-solids", "Mechanical Properties of Solids"],
          ["mechanical-properties-of-fluids", "Mechanical Properties of Fluids"],
          ["thermal-properties-of-matter", "Thermal Properties of Matter"],
          ["thermodynamics", "Thermodynamics"],
          ["kinetic-theory", "Kinetic Theory"],
          ["oscillations", "Oscillations"],
          ["waves", "Waves"],
        ],
      }),
      hi("Bhautiki-I", "khph1=0-7"),
      hi("Bhautiki-II", "khph2=0-7"),
      ur("Tabiyaat-I", "kuph1=0-8"),
      ur("Tabiyaat-II", "kuph2=0-7"),
    ],
  }),
  subject({
    slug: "chemistry", name: "Chemistry", ncertSubject: "Chemistry",
    syllabusUrl: cbseSyllabus("SecPart2/Chemistry_SecP2_2026-27.pdf"),
    feedsExams: ["JEE_MAIN", "JEE_ADVANCED", "NEET_UG"],
    books: [
      book("Chemistry Part-I", "kech1=0-6", {
        edition: "Reprint 2026-27",
        chapters: [
          ["some-basic-concepts-of-chemistry", "Some Basic Concepts of Chemistry"],
          ["structure-of-atom", "Structure of Atom"],
          ["classification-of-elements-periodicity", "Classification of Elements and Periodicity in Properties"],
          ["chemical-bonding-molecular-structure", "Chemical Bonding and Molecular Structure"],
          ["thermodynamics-chem", "Thermodynamics"],
          ["equilibrium", "Equilibrium"],
        ],
      }),
      book("Chemistry Part II", "kech2=0-3", {
        edition: "Reprint 2026-27",
        firstChapter: 7,
        chapters: [
          ["redox-reactions", "Redox Reactions"],
          ["organic-chemistry-basic-principles", "Organic Chemistry – Some Basic Principles and Techniques"],
          ["hydrocarbons", "Hydrocarbons"],
        ],
      }),
      hi("Rasayan Vigyan bhag-I", "khch1=0-6"),
      hi("Rasayan Vigyan bhag-II", "khch2=0-3"),
      ur("Keemiya I", "kuch1=0-7"),
      ur("Keemiya II", "kuch2=0-7"),
    ],
  }),
  subject({
    slug: "mathematics", name: "Mathematics", ncertSubject: "Mathematics",
    syllabusUrl: cbseSyllabus("SecPart2/Maths_SecP2_2026-27.pdf"),
    feedsExams: ["JEE_MAIN", "JEE_ADVANCED"],
    books: [
      book("Mathematics", "kemh1=0-14", {
        edition: "Reprint 2026-27",
        chapters: [
          ["sets", "Sets"],
          ["relations-and-functions", "Relations and Functions"],
          ["trigonometric-functions", "Trigonometric Functions"],
          ["complex-numbers", "Complex Numbers and Quadratic Equations"],
          ["linear-inequalities", "Linear Inequalities"],
          ["permutations-combinations", "Permutations and Combinations"],
          ["binomial-theorem", "Binomial Theorem"],
          ["sequences-and-series", "Sequences and Series"],
          ["straight-lines", "Straight Lines"],
          ["conic-sections", "Conic Sections"],
          ["introduction-three-dim-geometry", "Introduction to Three Dimensional Geometry"],
          ["limits-and-derivatives", "Limits and Derivatives"],
          ["statistics-11", "Statistics"],
          ["probability-11", "Probability"],
        ],
      }),
      hi("Ganit", "khmh1=0-14"),
      ur("Riyazi I", "kumh1=0-16"),
    ],
  }),
  subject({
    slug: "biology", name: "Biology", ncertSubject: "Biology",
    syllabusUrl: cbseSyllabus("SecPart2/Biology_SecP2_2026-27.pdf"),
    feedsExams: ["NEET_UG"],
    books: [
      book("Biology", "kebo1=0-19", {
        edition: "Reprint 2026-27",
        chapters: [
          ["living-world", "The Living World"],
          ["biological-classification", "Biological Classification"],
          ["plant-kingdom", "Plant Kingdom"],
          ["animal-kingdom", "Animal Kingdom"],
          ["morphology-flowering-plants", "Morphology of Flowering Plants"],
          ["anatomy-flowering-plants", "Anatomy of Flowering Plants"],
          ["structural-organisation-animals", "Structural Organisation in Animals"],
          ["cell-unit-of-life", "Cell: The Unit of Life"],
          ["biomolecules-11", "Biomolecules"],
          ["cell-cycle-division", "Cell Cycle and Cell Division"],
          ["photosynthesis", "Photosynthesis in Higher Plants"],
          ["respiration-plants", "Respiration in Plants"],
          ["plant-growth-development", "Plant Growth and Development"],
          ["breathing-exchange-gases", "Breathing and Exchange of Gases"],
          ["body-fluids-circulation", "Body Fluids and Circulation"],
          ["excretory-products", "Excretory Products and their Elimination"],
          ["locomotion-movement", "Locomotion and Movement"],
          ["neural-control-coordination", "Neural Control and Coordination"],
          ["chemical-coordination-integration", "Chemical Coordination and Integration"],
        ],
      }),
      hi("Jeev Vigyan", "khbo1=0-19"),
      ur("Hayatiyaat", "kubo1=0-22"),
    ],
  }),
  subject({
    slug: "english-core", name: "English Core", ncertSubject: "English",
    syllabusUrl: cbseSyllabus("SecPart2/English_core_SecP2_2026-27.pdf"),
    books: [book("Hornbill", "kehb1=0-14"), book("Snapshots Suppl.Reader English", "kesp1=0-5")],
  }),
  subject({
    slug: "accountancy", name: "Accountancy", ncertSubject: "Accountancy",
    syllabusUrl: cbseSyllabus("SecPart2/Accountancy_SecP2_2026-27.pdf"),
    books: [
      book("Financial Accounting-I", "keac1=0-7"),
      book("Accountancy-II", "keac2=0-2"),
      hi("Lekhashastra-I", "khac1=0-7"),
      hi("Lekhashastra-II", "khac2=0-2"),
    ],
  }),
  subject({
    slug: "business-studies", name: "Business Studies", ncertSubject: "Business Studies",
    syllabusUrl: cbseSyllabus("SecPart2/BusinessStudies_SecP2_2026-27.pdf"),
    books: [book("Business Studies", "kebs1=0-11"), hi("Vyavsay Adhyanan", "khbs1=0-11")],
  }),
  subject({
    slug: "economics", name: "Economics", ncertSubject: "Economics",
    syllabusUrl: cbseSyllabus("SecPart2/Economics_SecP2_2026-27.pdf"),
    books: [
      book("Statistics for Economics", "kest1=0-8"),
      book("Indian Economic Development", "keec1=0-8"),
      hi("Sankhyiki", "khst1=0-8"),
      hi("Bhartiya Airthryavstha Ka Vikas", "khec1=0-8"),
    ],
  }),
  subject({
    slug: "history", name: "History", ncertSubject: "History",
    syllabusUrl: cbseSyllabus("SecPart2/History_SecP2_2026-27.pdf"),
    feedsExams: ["UPSC_PRELIMS"],
    books: [book("Themes in World History", "kehs1=0-7"), hi("Vishwa Itihas Ke Kuch Vishay", "khhs1=0-7")],
  }),
  subject({
    slug: "political-science", name: "Political Science", ncertSubject: "Political Science",
    syllabusUrl: cbseSyllabus("SecPart2/PoliticalScience_SecP2_2026-27.pdf"),
    feedsExams: ["UPSC_PRELIMS"],
    books: [
      book("Political Theory", "keps1=0-8"),
      book("India Constitution at Work", "keps2=0-10"),
      hi("Raajneeti Sidhant", "khps1=0-8"),
      hi("Bharat ka Samvidhan Sidhant aur Vyavhar", "khps2=0-10"),
    ],
  }),
  subject({
    slug: "geography", name: "Geography", ncertSubject: "Geography",
    syllabusUrl: cbseSyllabus("SecPart2/Geography_SecP2_2026-27.pdf"),
    feedsExams: ["UPSC_PRELIMS"],
    books: [
      book("Fundamental of Physical Geography", "kegy2=0-14"),
      book("India Physical Environment", "kegy1=0-6"),
      book("Pratical Work in Geography", "kegy3=0-6"),
      hi("Bhautique Bhugol ke Mool Sidhant", "khgy2=0-14"),
      hi("Bhart Bhautik Paryabaran", "khgy1=0-6"),
      hi("Bhugol Main Prayogatmak Karya", "khgy3=0-6"),
    ],
  }),
];

// ─────────────────────────────────────────────────────────────────────
// CBSE Class 12 — NCERT books, Reprint 2026-27 (Physics Part-II's
// prelims carry no reprint line, so no edition is shown for it).
// ─────────────────────────────────────────────────────────────────────
const CBSE_CLASS_12_SUBJECTS: SchoolSubject[] = [
  subject({
    slug: "physics", name: "Physics", ncertSubject: "Physics",
    syllabusUrl: cbseSyllabus("SecPart2/Physics_SecP2_2026-27.pdf"),
    feedsExams: ["JEE_MAIN", "JEE_ADVANCED", "NEET_UG"],
    books: [
      book("Physics Part-I", "leph1=0-8", {
        edition: "Reprint 2026-27",
        chapters: [
          ["electric-charges-and-fields", "Electric Charges and Fields"],
          ["electrostatic-potential-capacitance", "Electrostatic Potential and Capacitance"],
          ["current-electricity", "Current Electricity"],
          ["moving-charges-and-magnetism", "Moving Charges and Magnetism"],
          ["magnetism-and-matter", "Magnetism and Matter"],
          ["electromagnetic-induction", "Electromagnetic Induction"],
          ["alternating-current", "Alternating Current"],
          ["electromagnetic-waves", "Electromagnetic Waves"],
        ],
      }),
      book("Physics Part-II", "leph2=0-6", {
        firstChapter: 9,
        chapters: [
          ["ray-optics-and-optical-instruments", "Ray Optics and Optical Instruments"],
          ["wave-optics", "Wave Optics"],
          ["dual-nature-of-radiation-and-matter", "Dual Nature of Radiation and Matter"],
          ["atoms", "Atoms"],
          ["nuclei", "Nuclei"],
          ["semiconductor-electronics", "Semiconductor Electronics: Materials, Devices and Simple Circuits"],
        ],
      }),
      hi("Bhautiki-I", "lhph1=0-8"),
      hi("Bhautiki-II", "lhph2=0-6"),
      ur("Tabiyaat-I", "luph1=0-8"),
      ur("Tabiyaat-II", "luph2=0-6"),
    ],
  }),
  subject({
    slug: "chemistry", name: "Chemistry", ncertSubject: "Chemistry",
    syllabusUrl: cbseSyllabus("SecPart2/Chemistry_SecP2_2026-27.pdf"),
    feedsExams: ["JEE_MAIN", "JEE_ADVANCED", "NEET_UG"],
    books: [
      book("Chemistry-I", "lech1=0-5", {
        edition: "Reprint 2026-27",
        chapters: [
          ["solutions", "Solutions"],
          ["electrochemistry", "Electrochemistry"],
          ["chemical-kinetics", "Chemical Kinetics"],
          ["the-d-and-f-block-elements", "The d- and f-Block Elements"],
          ["coordination-compounds", "Coordination Compounds"],
        ],
      }),
      book("Chemistry-II", "lech2=0-5", {
        edition: "Reprint 2026-27",
        firstChapter: 6,
        chapters: [
          ["haloalkanes-and-haloarenes", "Haloalkanes and Haloarenes"],
          ["alcohols-phenols-and-ethers", "Alcohols, Phenols and Ethers"],
          ["aldehydes-ketones-carboxylic-acids", "Aldehydes, Ketones and Carboxylic Acids"],
          ["amines", "Amines"],
          ["biomolecules", "Biomolecules"],
        ],
      }),
      hi("Rasayan vigyan bhag I", "lhch1=0-5"),
      hi("Rasayan vigyan bhag II", "lhch2=0-5"),
      ur("Keemiya-I", "luch1=0-9"),
      ur("Keemiya-II", "luch2=0-7"),
    ],
  }),
  subject({
    slug: "mathematics", name: "Mathematics", ncertSubject: "Mathematics",
    syllabusUrl: cbseSyllabus("SecPart2/Maths_SecP2_2026-27.pdf"),
    feedsExams: ["JEE_MAIN", "JEE_ADVANCED"],
    books: [
      book("Mathematics Part-I", "lemh1=0-6", {
        edition: "Reprint 2026-27",
        chapters: [
          ["relations-and-functions", "Relations and Functions"],
          ["inverse-trigonometric-functions", "Inverse Trigonometric Functions"],
          ["matrices", "Matrices"],
          ["determinants", "Determinants"],
          ["continuity-and-differentiability", "Continuity and Differentiability"],
          ["applications-of-derivatives", "Application of Derivatives"],
        ],
      }),
      book("Mathematics Part-II", "lemh2=0-7", {
        edition: "Reprint 2026-27",
        firstChapter: 7,
        chapters: [
          ["integrals", "Integrals"],
          ["applications-of-integrals", "Application of Integrals"],
          ["differential-equations", "Differential Equations"],
          ["vector-algebra", "Vector Algebra"],
          ["three-dimensional-geometry", "Three Dimensional Geometry"],
          ["linear-programming", "Linear Programming"],
          ["probability", "Probability"],
        ],
      }),
      hi("Ganit-I", "lhmh1=0-6"),
      hi("Ganit-II", "lhmh2=0-7"),
      ur("Riyazi-I", "lumh1=0-6"),
      ur("Riyazi-II", "lumh2=0-7"),
    ],
  }),
  subject({
    slug: "biology", name: "Biology", ncertSubject: "Biology",
    syllabusUrl: cbseSyllabus("SecPart2/Biology_SecP2_2026-27.pdf"),
    feedsExams: ["NEET_UG"],
    books: [
      book("Biology", "lebo1=0-13", {
        edition: "Reprint 2026-27",
        chapters: [
          ["sexual-reproduction-flowering-plants", "Sexual Reproduction in Flowering Plants"],
          ["human-reproduction", "Human Reproduction"],
          ["reproductive-health", "Reproductive Health"],
          ["principles-of-inheritance", "Principles of Inheritance and Variation"],
          ["molecular-basis-of-inheritance", "Molecular Basis of Inheritance"],
          ["evolution", "Evolution"],
          ["human-health-and-disease", "Human Health and Disease"],
          ["microbes-in-human-welfare", "Microbes in Human Welfare"],
          ["biotechnology-principles-and-processes", "Biotechnology: Principles and Processes"],
          ["biotechnology-and-its-applications", "Biotechnology and its Applications"],
          ["organisms-and-populations", "Organisms and Populations"],
          ["ecosystem", "Ecosystem"],
          ["biodiversity-and-conservation", "Biodiversity and Conservation"],
        ],
      }),
      hi("Jeev Vigyan", "lhbo1=0-13"),
      ur("Hayatiyaat", "lubo1=0-16"),
    ],
  }),
  subject({
    slug: "accountancy", name: "Accountancy", ncertSubject: "Accountancy",
    syllabusUrl: cbseSyllabus("SecPart2/Accountancy_SecP2_2026-27.pdf"),
    books: [
      book("Accountancy-I", "leac1=0-4"),
      book("Accountancy Part-II", "leac2=0-6"),
      book("Computerised Accounting System", "leca1=0-4"),
      hi("Lekhashastra Part-I", "lhac1=0-4"),
      hi("Lekhashastra Part-II", "lhac2=0-5"),
    ],
  }),
  subject({
    slug: "business-studies", name: "Business Studies", ncertSubject: "Business Studies",
    syllabusUrl: cbseSyllabus("SecPart2/BusinessStudies_SecP2_2026-27.pdf"),
    books: [
      book("Business Studies-I", "lebs1=0-8"),
      book("Business Studies-II", "lebs2=0-3"),
      hi("Vyavasai Adhyan-I", "lhbs1=0-8"),
      hi("Vyavasai Adhyan-II", "lhbs2=0-3"),
    ],
  }),
  subject({
    slug: "economics", name: "Economics", ncertSubject: "Economics",
    syllabusUrl: cbseSyllabus("SecPart2/Economics_SecP2_2026-27.pdf"),
    books: [
      book("Introductory Microeconomics", "leec2=0-5"),
      book("Introductory Macroeconomics", "leec1=0-6"),
      hi("Vyashthi Arthshasrta", "lhec2=0-5"),
      hi("Samashty Arthshastra Ek Parichay", "lhec1=0-6"),
    ],
  }),
  subject({
    slug: "history", name: "History", ncertSubject: "History",
    syllabusUrl: cbseSyllabus("SecPart2/History_SecP2_2026-27.pdf"),
    feedsExams: ["UPSC_PRELIMS"],
    books: [
      book("Themes in Indian History-I", "lehs1=0-4"),
      book("Themes in Indian History-II", "lehs2=0-4"),
      book("Themes in Indian History-III", "lehs3=0-4"),
      hi("Bharatiya Itihas ke kuchh Vishay-I", "lhhs1=0-4"),
      hi("Bharatiya Itihas ke kuchh Vishay-II", "lhhs2=0-4"),
      hi("Bharatiya Itihas ke kuchh Vishay-III", "lhhs3=0-4"),
    ],
  }),
  subject({
    slug: "political-science", name: "Political Science", ncertSubject: "Political Science",
    syllabusUrl: cbseSyllabus("SecPart2/PoliticalScience_SecP2_2026-27.pdf"),
    feedsExams: ["UPSC_PRELIMS"],
    books: [
      book("Contemporary World Politics", "leps1=0-7"),
      book("Politics in India Since Independence", "leps2=0-8"),
      hi("Samkalin Vishwa Rajniti", "lhps1=0-7"),
      hi("Swatantra Bharat Mein Rajniti-II", "lhps2=0-8"),
    ],
  }),
  subject({
    slug: "geography", name: "Geography", ncertSubject: "Geography",
    syllabusUrl: cbseSyllabus("SecPart2/Geography_SecP2_2026-27.pdf"),
    feedsExams: ["UPSC_PRELIMS"],
    books: [
      book("Fundamentals of Human Geography", "legy1=0-8"),
      book("India -People And Economy", "legy2=0-9"),
      book("Practical Work in Geography Part II", "legy3=0-4"),
      hi("Manav Bhugol Ke Mool Sidhant", "lhgy1=0-8"),
      hi("Bharat log aur arthvyasastha(Bhugol)", "lhgy2=0-9"),
      hi("Bhugol main peryojnatmak pryogatmak karye", "lhgy3=0-4"),
    ],
  }),
  subject({
    slug: "english-core", name: "English Core", ncertSubject: "English",
    syllabusUrl: cbseSyllabus("SecPart2/English_core_SecP2_2026-27.pdf"),
    books: [book("Flamingo", "lefl1=0-13"), book("Vistas", "levt1=0-6")],
  }),
];

// ─────────────────────────────────────────────────────────────────────
// CISCE (ICSE Class 10, ISC Classes 11-12). CISCE prescribes syllabuses,
// not one textbook, so these tiles only point at CISCE's own
// regulations-and-syllabuses pages. 25 Sep 2026: the old chapter counts
// and set-text / "wider than CBSE" blurbs were unsourced and are gone.
// ─────────────────────────────────────────────────────────────────────
const icse = (slug: string, name: string, feedsExams?: string[]): SchoolSubject =>
  subject({ slug, name, syllabusUrl: ICSE_REGULATIONS_URL, syllabusLabel: "CISCE: ICSE regulations and syllabuses", ...(feedsExams ? { feedsExams } : {}) });
const isc = (slug: string, name: string, feedsExams?: string[]): SchoolSubject =>
  subject({ slug, name, syllabusUrl: ISC_REGULATIONS_URL, syllabusLabel: "CISCE: ISC regulations and syllabuses", ...(feedsExams ? { feedsExams } : {}) });

const ICSE_CLASS_10_SUBJECTS: SchoolSubject[] = [
  icse("english-language", "English I (Language)"),
  icse("english-literature", "English II (Literature)"),
  icse("mathematics", "Mathematics", ["JEE_MAIN"]),
  icse("physics", "Physics", ["JEE_MAIN", "NEET_UG"]),
  icse("chemistry", "Chemistry", ["JEE_MAIN", "NEET_UG"]),
  icse("biology", "Biology", ["NEET_UG"]),
  icse("history-civics", "History + Civics"),
  icse("geography", "Geography"),
  icse("computer-applications", "Computer Applications"),
];

const ICSE_CLASS_11_SUBJECTS: SchoolSubject[] = [
  isc("english", "English"),
  isc("mathematics", "Mathematics", ["JEE_MAIN", "JEE_ADVANCED"]),
  isc("physics", "Physics", ["JEE_MAIN", "JEE_ADVANCED", "NEET_UG"]),
  isc("chemistry", "Chemistry", ["JEE_MAIN", "JEE_ADVANCED", "NEET_UG"]),
  isc("biology", "Biology", ["NEET_UG"]),
  isc("accounts", "Accounts"),
  isc("commerce", "Commerce"),
  isc("economics", "Economics"),
  isc("history", "History"),
];

const ICSE_CLASS_12_SUBJECTS: SchoolSubject[] = [
  isc("english", "English"),
  isc("mathematics", "Mathematics", ["JEE_MAIN", "JEE_ADVANCED"]),
  isc("physics", "Physics", ["JEE_MAIN", "JEE_ADVANCED", "NEET_UG"]),
  isc("chemistry", "Chemistry", ["JEE_MAIN", "JEE_ADVANCED", "NEET_UG"]),
  isc("biology", "Biology", ["NEET_UG"]),
  isc("accounts", "Accounts"),
  isc("commerce", "Commerce"),
  isc("economics", "Economics"),
  isc("history", "History"),
  isc("psychology", "Psychology"),
];

// ─────────────────────────────────────────────────────────────────────
// Public lookup table.
// ─────────────────────────────────────────────────────────────────────

export const CLASS_SYLLABUS: ClassSyllabus[] = [
  { key: "cbse-class-6",  boardSlug: "cbse",       classNum: 6,  subjects: CBSE_CLASS_6_SUBJECTS },
  { key: "cbse-class-7",  boardSlug: "cbse",       classNum: 7,  subjects: CBSE_CLASS_7_SUBJECTS },
  { key: "cbse-class-8",  boardSlug: "cbse",       classNum: 8,  subjects: CBSE_CLASS_8_SUBJECTS },
  { key: "cbse-class-9",  boardSlug: "cbse",       classNum: 9,  subjects: CBSE_CLASS_9_SUBJECTS },
  { key: "cbse-class-10", boardSlug: "cbse",       classNum: 10, subjects: CBSE_CLASS_10_SUBJECTS },
  { key: "cbse-class-11", boardSlug: "cbse",       classNum: 11, subjects: CBSE_CLASS_11_SUBJECTS },
  { key: "cbse-class-12", boardSlug: "cbse",       classNum: 12, subjects: CBSE_CLASS_12_SUBJECTS },
  { key: "icse-class-10", boardSlug: "icse-cisce", classNum: 10, subjects: ICSE_CLASS_10_SUBJECTS },
  { key: "icse-class-11", boardSlug: "icse-cisce", classNum: 11, subjects: ICSE_CLASS_11_SUBJECTS },
  { key: "icse-class-12", boardSlug: "icse-cisce", classNum: 12, subjects: ICSE_CLASS_12_SUBJECTS },
];

export function findClassSyllabus(boardSlug: string, classNum: number): ClassSyllabus | undefined {
  return CLASS_SYLLABUS.find((c) => c.boardSlug === boardSlug && c.classNum === classNum);
}

export function findSubject(boardSlug: string, classNum: number, subjectSlug: string): SchoolSubject | undefined {
  return findClassSyllabus(boardSlug, classNum)?.subjects.find((s) => s.slug === subjectSlug);
}

export function findChapter(boardSlug: string, classNum: number, subjectSlug: string, chapterSlug: string): SchoolChapter | undefined {
  return findSubject(boardSlug, classNum, subjectSlug)?.chapters?.find((c) => c.slug === chapterSlug);
}

/**
 * Walk every (board, class, subject) tuple that has a chapter list,
 * yielding one entry per chapter. Used by generateStaticParams (and, until
 * the school pages leave the sitemap, by sitemap.ts).
 */
export function allChapterPaths(): Array<{
  boardSlug: string;
  classNum: number;
  subjectSlug: string;
  chapterSlug: string;
}> {
  const out: Array<{ boardSlug: string; classNum: number; subjectSlug: string; chapterSlug: string }> = [];
  for (const cls of CLASS_SYLLABUS) {
    for (const subject of cls.subjects) {
      if (!subject.chapters) continue;
      for (const ch of subject.chapters) {
        out.push({
          boardSlug: cls.boardSlug,
          classNum: cls.classNum,
          subjectSlug: subject.slug,
          chapterSlug: ch.slug,
        });
      }
    }
  }
  return out;
}

/**
 * Class-level official source for the "official textbooks / syllabus" link
 * on a class page.
 *
 * 25 Sep 2026: this built `textbook.php?fec1={n}-12` — no NCERT book has
 * that code, so every CBSE class page linked to a dead book. NCERT's index
 * has no per-class deep link (the class is picked in a dropdown), so CBSE
 * classes link to the index itself. CISCE classes link to CISCE's ICSE
 * (Classes 9-10) or ISC (11-12) regulations-and-syllabuses page, and to
 * cisce.org for Classes 1-8; the old cisce.org/curriculum.aspx is a 404.
 */
export function officialClassSource(boardSlug: string, classNum: number): { url: string; label: string } | null {
  if (!Number.isInteger(classNum) || classNum < 1 || classNum > 12) return null;
  if (boardSlug === "cbse") {
    return { url: NCERT_INDEX_URL, label: `NCERT textbooks (official index: choose Class ${classNum})` };
  }
  if (boardSlug === "icse-cisce") {
    if (classNum >= 11) return { url: ISC_REGULATIONS_URL, label: "CISCE: ISC regulations and syllabuses" };
    if (classNum >= 9) return { url: ICSE_REGULATIONS_URL, label: "CISCE: ICSE regulations and syllabuses" };
    return { url: CISCE_HOME_URL, label: "CISCE official website" };
  }
  return null;
}

/** URL half of officialClassSource (kept under its old name for callers). */
export function ncertClassUrl(boardSlug: string, classNum: number): string | null {
  return officialClassSource(boardSlug, classNum)?.url ?? null;
}
