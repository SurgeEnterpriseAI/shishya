// Board-wise subject combinations for each option (30 Sep 2026, P1 build 1).
//
// Why: "which subjects are in MPC / BiPC / CEC on my board" is the question a
// Class 10 student asks, and every board names its groups differently (a group
// code in Tamil Nadu, a course code in Kerala, a Set in West Bengal, free
// electives in CBSE and UP). Each row below is one combination AS THE BOARD
// PRINTS IT — subject names only, never syllabus or textbook text — with the
// document it was read in.
//
// Status (founder rule, 30 Sep 2026, superseding spec F5): a row read on the
// board's own document on 30 Sep 2026 is "confirmed". The stream researcher
// read CBSE, Tamil Nadu (DGE), Kerala (HSCAP), West Bengal (WBCHSE), UP
// (UPMSP), Bihar (arts and commerce only), Telangana (through SCERT's
// booklet, not TGBIE itself) and NIOS. Tamil Nadu's group table was re-read
// from its ruled grid (pdfplumber), because the plain-text extraction
// misaligns the rows. AP BIE, Karnataka PUE, Maharashtra HSC and Bihar's
// science faculty could not be read: they have NO rows — the pages show them
// only as "check {board}'s official site" links (BOARD_CHECK_LINKS).
//
// Honest labels: SCERT Telangana's booklet prints subject lists, not the
// acronyms MPC / BiPC / CEC / MEC / HEC, and lists the commerce combinations
// under "Humanities" — the localName says so. 30 Sep 2026 (review fix): a row
// that shows part of a longer list says "for example" (WBCHSE Sets II and
// III; SCERT's vocational list, which runs past the page read); the NIOS
// Groups B-F row carries every subject stream-facts.json records. Kerala course 7 (Physics,
// Chemistry, Computer Science, Geology) fits no option here and is left out;
// Tamil Nadu's vocational groups 2961-2962 are commerce-based and filed under
// "vocational" only.
//
// Pure data (BOARDS is a plain constant): no DB, clock or React.

import { BOARDS } from "@/lib/schooling-data";
import type { BoardCheckLink, BoardStreamCombination, PathSource, StreamOptionSlug } from "./types";
import { PATH_SOURCES as S } from "./sources";

interface BoardMeta {
  board: string;
  boardName: string;
  stateCode: string | null;
}

const CBSE: BoardMeta = { board: "cbse", boardName: "CBSE", stateCode: null };
const TN: BoardMeta = { board: "tn-state-board", boardName: "Tamil Nadu State Board (Higher Secondary)", stateCode: "TN" };
const TS: BoardMeta = { board: "ts-bie", boardName: "Telangana Board of Intermediate Education", stateCode: "TS" };
const KL: BoardMeta = { board: "kl-dhse", boardName: "Kerala Higher Secondary (DHSE)", stateCode: "KL" };
const WB: BoardMeta = { board: "wb-wbchse", boardName: "West Bengal Council of Higher Secondary Education (WBCHSE)", stateCode: "WB" };
const UP: BoardMeta = { board: "up-board", boardName: "UP Board (UPMSP)", stateCode: "UP" };
const BR: BoardMeta = { board: "bihar-bseb", boardName: "Bihar School Examination Board (BSEB)", stateCode: "BR" };
const NIOS: BoardMeta = { board: "nios", boardName: "NIOS", stateCode: null };

function row(
  meta: BoardMeta,
  option: StreamOptionSlug,
  localName: string,
  groupCode: string | null,
  subjects: readonly string[],
  source: PathSource,
): BoardStreamCombination {
  return { ...meta, option, localName, groupCode, subjects, source, status: "confirmed" };
}

/** Tamil Nadu DGE, Annexure I "List of groups for school students (new syllabus)". */
const tn = (option: StreamOptionSlug, code: string, subjects: readonly string[]) =>
  row(TN, option, `Group ${code}`, code, subjects, S.tnHse);

/** Kerala HSCAP "List of Courses": the course code is the Part III combination. */
const kl = (option: StreamOptionSlug, code: string, subjects: readonly string[]) =>
  row(KL, option, `Course code ${code}`, code, subjects, S.klHscap);

/** SCERT Telangana's intermediate list: printed as a subject list, no acronym. */
const ts = (option: StreamOptionSlug, heading: "Sciences" | "Humanities", subjects: readonly string[]) =>
  row(TS, option, `${heading}: ${subjects.join(" – ")}`, null, subjects, S.tsIntermediate);

export const BOARD_STREAM_COMBINATIONS: readonly BoardStreamCombination[] = [
  // ── MPC / PCM ───────────────────────────────────────────────────────────
  row(CBSE, "mpc-pcm", "Electives from Group A (no fixed stream)", null, ["Physics (042)", "Chemistry (043)", "Mathematics (041)"], S.cbseScheme),
  tn("mpc-pcm", "2501", ["Physics", "Chemistry", "Statistics", "Mathematics"]),
  tn("mpc-pcm", "2502", ["Physics", "Chemistry", "Computer Science", "Mathematics"]),
  tn("mpc-pcm", "2504", ["Physics", "Chemistry", "Bio-Chemistry", "Mathematics"]),
  tn("mpc-pcm", "2505", ["Physics", "Chemistry", "Communicative English", "Mathematics"]),
  tn("mpc-pcm", "2506", ["Physics", "Chemistry", "Mathematics", "Home Science"]),
  ts("mpc-pcm", "Sciences", ["Mathematics", "Physics", "Chemistry"]),
  kl("mpc-pcm", "3", ["Physics", "Chemistry", "Home Science", "Mathematics"]),
  kl("mpc-pcm", "4", ["Physics", "Chemistry", "Geology", "Mathematics"]),
  kl("mpc-pcm", "5", ["Physics", "Chemistry", "Mathematics", "Computer Science"]),
  kl("mpc-pcm", "6", ["Physics", "Chemistry", "Mathematics", "Electronics"]),
  kl("mpc-pcm", "8", ["Physics", "Chemistry", "Mathematics", "Statistics"]),
  kl("mpc-pcm", "40", ["Physics", "Chemistry", "Mathematics", "Electronic Systems"]),
  row(WB, "mpc-pcm", "Set I", "Set I", ["Physics (PHYS)", "Chemistry (CHEM)", "Mathematics (MATH)"], S.wbSubjects),
  row(UP, "mpc-pcm", "Science group subjects, with Mathematics", null, ["Physics (151)", "Chemistry (152)", "Mathematics (131)"], S.upSubjects),

  // ── BiPC / PCB ──────────────────────────────────────────────────────────
  row(CBSE, "bipc-pcb", "Electives from Group A (no fixed stream)", null, ["Physics (042)", "Chemistry (043)", "Biology (044) or Biotechnology (045)"], S.cbseScheme),
  tn("bipc-pcb", "2601", ["Physics", "Chemistry", "Biology", "Computer Science"]),
  tn("bipc-pcb", "2602", ["Physics", "Chemistry", "Biology", "Micro-Biology"]),
  tn("bipc-pcb", "2603", ["Physics", "Chemistry", "Biology", "Bio-Chemistry"]),
  tn("bipc-pcb", "2604", ["Physics", "Chemistry", "Biology", "General Nursing"]),
  tn("bipc-pcb", "2605", ["Physics", "Chemistry", "Biology", "Nutrition and Dietetics"]),
  tn("bipc-pcb", "2606", ["Physics", "Chemistry", "Biology", "Communicative English"]),
  tn("bipc-pcb", "2607", ["Physics", "Chemistry", "Biology", "Home Science"]),
  tn("bipc-pcb", "2608", ["Physics", "Chemistry", "Botany", "Zoology"]),
  ts("bipc-pcb", "Sciences", ["Botany", "Zoology", "Physics", "Chemistry"]),
  kl("bipc-pcb", "2", ["Physics", "Chemistry", "Biology", "Home Science"]),
  kl("bipc-pcb", "9", ["Physics", "Chemistry", "Biology", "Psychology"]),
  row(WB, "bipc-pcb", "Set I", "Set I", ["Physics (PHYS)", "Chemistry (CHEM)", "Biological Science (BIOS)"], S.wbSubjects),
  row(UP, "bipc-pcb", "Science group subjects", null, ["Physics (151)", "Chemistry (152)", "Biology (153)"], S.upSubjects),

  // ── PCMB ────────────────────────────────────────────────────────────────
  row(CBSE, "pcmb", "Electives from Group A (no fixed stream)", null, ["Physics (042)", "Chemistry (043)", "Mathematics (041)", "Biology (044)"], S.cbseScheme),
  tn("pcmb", "2503", ["Physics", "Chemistry", "Biology", "Mathematics"]),
  kl("pcmb", "1", ["Physics", "Chemistry", "Biology", "Mathematics"]),
  row(WB, "pcmb", "Set I", "Set I", ["Physics (PHYS)", "Chemistry (CHEM)", "Mathematics (MATH)", "Biological Science (BIOS)"], S.wbSubjects),

  // ── Commerce (CEC / MEC) ────────────────────────────────────────────────
  row(CBSE, "commerce-cec-mec", "Electives from Group A (no fixed stream)", null, ["Accountancy", "Business Studies (054)", "Economics (030)"], S.cbseScheme),
  tn("commerce-cec-mec", "2701", ["Statistics", "Economics", "Commerce", "Accountancy"]),
  tn("commerce-cec-mec", "2702", ["Economics", "Commerce", "Accountancy", "Computer Applications"]),
  tn("commerce-cec-mec", "2703", ["Communicative English", "Economics", "Commerce", "Accountancy"]),
  tn("commerce-cec-mec", "2704", ["History", "Economics", "Commerce", "Accountancy"]),
  tn("commerce-cec-mec", "2705", ["Economics", "Political Science", "Commerce", "Accountancy"]),
  tn("commerce-cec-mec", "2706", ["Economics", "Commerce", "Accountancy", "Ethics and Indian Culture"]),
  tn("commerce-cec-mec", "2707", ["Economics", "Commerce", "Accountancy", "Advanced Language (Tamil)"]),
  tn("commerce-cec-mec", "2708", ["Economics", "Commerce", "Accountancy", "Business Mathematics and Statistics"]),
  ts("commerce-cec-mec", "Humanities", ["Mathematics", "Economics", "Commerce"]),
  ts("commerce-cec-mec", "Humanities", ["Commerce", "Economics", "Civics"]),
  ts("commerce-cec-mec", "Humanities", ["Commerce", "Economics", "Geography"]),
  ts("commerce-cec-mec", "Humanities", ["Commerce", "Economics", "History"]),
  ts("commerce-cec-mec", "Humanities", ["Modern Language", "Economics", "Commerce"]),
  ts("commerce-cec-mec", "Humanities", ["Public Administration", "Commerce", "Civics"]),
  ts("commerce-cec-mec", "Humanities", ["Public Administration", "Economics", "Commerce"]),
  kl("commerce-cec-mec", "36", ["Business Studies", "Accountancy", "Economics", "Mathematics"]),
  kl("commerce-cec-mec", "37", ["Business Studies", "Accountancy", "Economics", "Statistics"]),
  kl("commerce-cec-mec", "38", ["Business Studies", "Accountancy", "Economics", "Political Science"]),
  kl("commerce-cec-mec", "39", ["Business Studies", "Accountancy", "Economics", "Computer Applications"]),
  row(WB, "commerce-cec-mec", "Set II, for example", "Set II", [
    "Accountancy (ACCT)",
    "Business Studies (BSTD)",
    "Commercial Law and Preliminaries of Auditing (CLPA)",
    "Costing and Taxation (CSTX)",
    "Economics (ECON)",
    "Business Mathematics and Basic Statistics (BMBS)",
  ], S.wbSubjects),
  row(UP, "commerce-cec-mec", "Commerce group subjects", null, ["Accountancy (156)", "Business Studies (157)"], S.upSubjects),
  row(BR, "commerce-cec-mec", "Commerce faculty: choose three electives", null, ["Business Studies (217)", "Entrepreneurship (218)", "Economics (219)", "Accountancy (220)"], S.brArtsCommerce),

  // ── Arts / Humanities (HEC) ─────────────────────────────────────────────
  row(CBSE, "arts-hec-humanities", "Electives from Group A (no fixed stream), for example", null, [
    "History (027)",
    "Political Science (028)",
    "Geography (029)",
    "Economics (030)",
    "Psychology (037)",
    "Sociology (039)",
  ], S.cbseScheme),
  tn("arts-hec-humanities", "2801", ["Statistics", "Geography", "History", "Economics"]),
  tn("arts-hec-humanities", "2802", ["Geography", "History", "Economics", "Computer Applications"]),
  tn("arts-hec-humanities", "2803", ["Geography", "Communicative English", "History", "Economics"]),
  tn("arts-hec-humanities", "2804", ["Geography", "History", "Economics", "Political Science"]),
  tn("arts-hec-humanities", "2805", ["Geography", "History", "Economics", "Ethics and Indian Culture"]),
  tn("arts-hec-humanities", "2806", ["Geography", "History", "Economics", "Advanced Language (Tamil)"]),
  ts("arts-hec-humanities", "Humanities", ["History", "Economics", "Civics"]),
  ts("arts-hec-humanities", "Humanities", ["History", "Geography", "Economics"]),
  ts("arts-hec-humanities", "Humanities", ["Modern Language", "History", "Civics"]),
  ts("arts-hec-humanities", "Humanities", ["Classical Language", "History", "Civics"]),
  ts("arts-hec-humanities", "Humanities", ["Classical Language", "Modern Language", "History"]),
  ts("arts-hec-humanities", "Humanities", ["Modern Language", "Economics", "History"]),
  ts("arts-hec-humanities", "Humanities", ["Geography", "History", "Civics"]),
  ts("arts-hec-humanities", "Humanities", ["Public Administration", "Economics", "Civics"]),
  ts("arts-hec-humanities", "Humanities", ["Public Administration", "History", "Civics"]),
  ts("arts-hec-humanities", "Humanities", ["Psychology", "Economics", "History"]),
  ts("arts-hec-humanities", "Humanities", ["History", "Geography", "Public Administration"]),
  kl("arts-hec-humanities", "10", ["History", "Economics", "Political Science", "Geography"]),
  kl("arts-hec-humanities", "11", ["History", "Economics", "Political Science", "Sociology"]),
  kl("arts-hec-humanities", "12", ["History", "Economics", "Political Science", "Geology"]),
  kl("arts-hec-humanities", "13", ["History", "Economics", "Political Science", "Music"]),
  kl("arts-hec-humanities", "14", ["History", "Economics", "Political Science", "Gandhian Studies"]),
  kl("arts-hec-humanities", "15", ["History", "Economics", "Political Science", "Philosophy"]),
  kl("arts-hec-humanities", "16", ["History", "Economics", "Political Science", "Social Work"]),
  kl("arts-hec-humanities", "17", ["Islamic History", "Economics", "Political Science", "Geography"]),
  kl("arts-hec-humanities", "18", ["Islamic History", "Economics", "Political Science", "Sociology"]),
  kl("arts-hec-humanities", "19", ["Sociology", "Social Work", "Psychology", "Gandhian Studies"]),
  kl("arts-hec-humanities", "20", ["History", "Economics", "Political Science", "Psychology"]),
  kl("arts-hec-humanities", "21", ["History", "Economics", "Political Science", "Anthropology"]),
  kl("arts-hec-humanities", "22", ["History", "Economics", "Geography", "Malayalam"]),
  kl("arts-hec-humanities", "23", ["History", "Economics", "Geography", "Hindi"]),
  kl("arts-hec-humanities", "24", ["History", "Economics", "Geography", "Arabic"]),
  kl("arts-hec-humanities", "25", ["History", "Economics", "Geography", "Urdu"]),
  kl("arts-hec-humanities", "26", ["History", "Economics", "Geography", "Kannada"]),
  kl("arts-hec-humanities", "27", ["History", "Economics", "Geography", "Tamil"]),
  kl("arts-hec-humanities", "28", ["History", "Economics", "Sanskrit Sahitya", "Sanskrit Sastra"]),
  kl("arts-hec-humanities", "29", ["History", "Philosophy", "Sanskrit Sahitya", "Sanskrit Sastra"]),
  kl("arts-hec-humanities", "30", ["History", "Economics", "Political Science", "Statistics"]),
  kl("arts-hec-humanities", "31", ["Sociology", "Social Work", "Psychology", "Statistics"]),
  kl("arts-hec-humanities", "32", ["Economics", "Statistics", "Anthropology", "Social Work"]),
  kl("arts-hec-humanities", "33", ["Economics", "Gandhian Studies", "Communicative English", "Computer Applications"]),
  kl("arts-hec-humanities", "34", ["Sociology", "Journalism", "Communicative English", "Computer Applications"]),
  kl("arts-hec-humanities", "35", ["Journalism", "English Literature", "Communicative English", "Psychology"]),
  kl("arts-hec-humanities", "41", ["History", "Economics", "Sociology", "Malayalam"]),
  kl("arts-hec-humanities", "42", ["History", "Economics", "Political Science", "Malayalam"]),
  kl("arts-hec-humanities", "43", ["History", "Economics", "Gandhian Studies", "Malayalam"]),
  kl("arts-hec-humanities", "44", ["Social Work", "Journalism", "Communicative English", "Computer Applications"]),
  kl("arts-hec-humanities", "45", ["History", "Economics", "Sociology", "Hindi"]),
  kl("arts-hec-humanities", "46", ["History", "Economics", "Sociology", "Arabic"]),
  row(WB, "arts-hec-humanities", "Set III, for example", "Set III", [
    "Political Science (POLS)",
    "Education (EDCN)",
    "Philosophy (PHIL)",
    "Economics (ECON)",
    "Sociology (SOCG)",
    "History (HIST)",
    "Psychology (PSYC)",
    "Geography (GEGR)",
    "Journalism & Mass Communication (JMCN)",
    "Sanskrit (SNSK)",
  ], S.wbSubjects),
  row(UP, "arts-hec-humanities", "Humanities group subjects, for example", null, [
    "Hindi (101)",
    "General Hindi (102)",
    "History (128)",
    "Geography (129)",
    "Civics (130)",
    "Mathematics (131)",
    "Psychology (133)",
    "Education (134)",
    "Home Science (135)",
    "Economics (136)",
    "Sociology (142)",
  ], S.upSubjects),
  row(BR, "arts-hec-humanities", "Arts faculty: choose three electives", null, [
    "Music",
    "Home Science",
    "Philosophy",
    "History",
    "Political Science",
    "Geography",
    "Psychology",
    "Sociology",
    "Economics",
    "Mathematics",
  ], S.brArtsCommerce),

  // ── Vocational Class 11-12 ──────────────────────────────────────────────
  tn("vocational", "2921", ["Mathematics", "Basic Mechanical Engineering - Theory", "Computer Technology", "Basic Mechanical Engineering - Practical"]),
  tn("vocational", "2922", ["Mathematics", "Basic Electrical Engineering - Theory", "Computer Technology", "Basic Electrical Engineering - Practical"]),
  tn("vocational", "2923", ["Mathematics", "Basic Electronics Engineering - Theory", "Computer Technology", "Basic Electronics Engineering - Practical"]),
  tn("vocational", "2924", ["Mathematics", "Basic Civil Engineering - Theory", "Computer Technology", "Basic Civil Engineering - Practical"]),
  tn("vocational", "2925", ["Mathematics", "Basic Automobile Engineering - Theory", "Computer Technology", "Basic Automobile Engineering - Practical"]),
  tn("vocational", "2926", ["Mathematics", "Textile Technology - Theory", "Computer Technology", "Textile Technology - Practical"]),
  tn("vocational", "2931", ["Biology", "Nursing (Vocational) - Theory", "Computer Technology", "Nursing (Vocational) - Practical"]),
  tn("vocational", "2941", ["Home Science", "Textile and Dress Designing - Theory", "Computer Technology", "Textile and Dress Designing - Practical"]),
  tn("vocational", "2942", ["Home Science", "Food Service Management - Theory", "Computer Technology", "Food Service Management - Practical"]),
  tn("vocational", "2951", ["Biology", "Agricultural Science - Theory", "Computer Technology", "Agricultural Science - Practical"]),
  tn("vocational", "2961", ["Commerce", "Accountancy (Theory)", "Office Management and Secretaryship - Theory", "Typography and Computer Applications - Practical"]),
  tn("vocational", "2962", ["Commerce", "Accountancy (Theory)", "Computer Applications", "Auditing - Practical"]),
  row(
    { ...TS, boardName: "Telangana Intermediate Vocational (State Institution of Vocational Education)" },
    "vocational",
    "Vocational courses (State Institution of Vocational Education), for example",
    null,
    [
      "Agricultural Crop Production",
      "Live Stock Management & Dairy Technology",
      "Fisheries",
      "Sericulture",
      "Accounting & Taxation",
      "Office Assistantship",
      "Insurance & Marketing",
      "Retail Management",
      "Automobile Engineering Technician",
      "Construction Technology",
      "Computer Science",
      "Electronics and Communication Technician",
      "Electrical Technology",
      "Mechanical Technology",
      "Commercial Garment Technology",
      "Pre-School Teacher Training",
      "Tourism & Hospitality Management",
      "Medical Lab Technician",
      "Physiotherapy",
      "Multipurpose Health Worker (F)",
      "Pharma Technology",
    ],
    S.tsVocational,
  ),
  row(WB, "vocational", "Vocational subjects (any Set, in approved schools)", null, [
    "IT & ITeS (ITEV)",
    "Automobile (ATMV)",
    "Organised Retailing (ORTV)",
    "Security (SEUV)",
    "Health Care (HLCV)",
    "Electronics (ELTV)",
    "Tourism & Hospitality (THLV)",
    "Plumbing (PLBV)",
    "Construction (CNSV)",
    "Apparel (APLV)",
    "Beauty & Wellness (BWLV)",
    "Agriculture (AGLV)",
    "Power (POWV)",
    "Banking Financial Services & Insurance (BFIV)",
    "Food Processing (FDPV)",
    "Telecom (TELV)",
  ], S.wbSubjects),
  row(UP, "vocational", "Vocational group: the foundation subject and one trade, for example", null, [
    "General Foundation Subject (201)",
    "Automobile (214)",
    "Retail Trading (240)",
    "Security (241)",
    "Tourism & Hospitality (243)",
    "IT/ITeS (244)",
    "Health Care (245)",
  ], S.upSubjects),

  // ── NIOS Senior Secondary ───────────────────────────────────────────────
  row(NIOS, "nios", "Group A languages (one or two)", null, [
    "Hindi (301)",
    "English (302)",
    "Bengali (303)",
    "Tamil (304)",
    "Odia (305)",
    "Urdu (306)",
    "Gujarati (307)",
    "Sanskrit (309)",
    "Punjabi (310)",
    "Arabic (341)",
    "Persian (342)",
    "Malayalam (343)",
  ], S.niosSeniorSecondary),
  row(NIOS, "nios", "Subjects of Groups B to F", null, [
    "Mathematics (311)",
    "Physics (312)",
    "Chemistry (313)",
    "Biology (314)",
    "History (315)",
    "Geography (316)",
    "Political Science (317)",
    "Economics (318)",
    "Business Studies (319)",
    "Accountancy (320)",
    "Home Science (321)",
    "Psychology (328)",
    "Computer Science (330)",
    "Sociology (331)",
    "Painting (332)",
    "Environmental Science (333)",
    "Mass Communication (335)",
    "Data Entry Operations (336)",
    "Tourism (337)",
    "Introduction to Law (338)",
    "Library and Information Science (339)",
    "Physical Education and Yog (373)",
    "Military Studies (374)",
    "Military History (375)",
    "Indian Knowledge Tradition (345-348, Sanskrit medium)",
  ], S.niosSeniorSecondary),
];

const CLASS_11_12_OPTIONS: readonly StreamOptionSlug[] = ["mpc-pcm", "bipc-pcb", "pcmb", "commerce-cec-mec", "arts-hec-humanities"];

function boardSite(slug: string): string {
  const b = BOARDS.find((x) => x.slug === slug);
  if (!b) throw new Error(`[paths] BOARD_CHECK_LINKS names an unknown board: ${slug}`);
  return b.websiteUrl;
}

/** Boards whose lists could not be read on 30 Sep 2026: link only, never subjects. */
export const BOARD_CHECK_LINKS: readonly BoardCheckLink[] = [
  {
    board: "ap-bie",
    boardName: "Andhra Pradesh Board of Intermediate Education",
    stateCode: "AP",
    url: boardSite("ap-bie"),
    options: [...CLASS_11_12_OPTIONS, "vocational"],
    reason: "bie.ap.gov.in and the January 2025 reform note returned only a script shell on 30 Sep 2026.",
  },
  {
    board: "ka-puc",
    boardName: "Karnataka Department of Pre-University Education",
    stateCode: "KA",
    url: boardSite("ka-puc"),
    options: [...CLASS_11_12_OPTIONS, "vocational"],
    reason: "The 2026-27 PU guidelines PDF is scanned Kannada text; combination codes could not be extracted.",
  },
  {
    board: "mh-ssc-hsc",
    boardName: "Maharashtra State Board (HSC)",
    stateCode: "MH",
    url: boardSite("mh-ssc-hsc"),
    options: [...CLASS_11_12_OPTIONS, "vocational"],
    reason: "The board's subjects page renders only with scripts; the scheme was not read.",
  },
  {
    // 30 Sep 2026 (review fix): Kerala's vocational higher secondary course
    // list was not read (stream-facts.json unconfirmed[]); a Kerala reader of
    // the vocational page gets the wing's own portal and nothing else. Not a
    // schooling-data BOARDS entry, so the URL is given here; the page title
    // read on 30 Sep 2026 is "Vocational Higher Secondary Education Portal -
    // Directorate of General Education, Government of Kerala".
    board: "kl-vhse",
    boardName: "Kerala Vocational Higher Secondary Education (VHSE)",
    stateCode: "KL",
    url: "https://vhseportal.kerala.gov.in/",
    options: ["vocational"],
    reason: "The VHSE course list on vhseportal.kerala.gov.in was not read on 30 Sep 2026.",
  },
  {
    board: "bihar-bseb",
    boardName: "Bihar School Examination Board (science faculty)",
    stateCode: "BR",
    url: boardSite("bihar-bseb"),
    options: ["mpc-pcm", "bipc-pcb", "pcmb"],
    reason: "Only the 2026-28 arts and commerce registration forms were read; the science faculty form was not.",
  },
];
