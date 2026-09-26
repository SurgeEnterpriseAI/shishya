// CBSE board-exam hubs — official links only (26 Sep 2026, G4 honest page families).
//
// Why: "CBSE class 10 sample paper 2026-27", "CBSE class 12 marking scheme",
// "CBSE date sheet 2027" and "CBSE result" are among the largest school
// searches in India, and Shishya had no page for them — the class pages
// carried one link to CBSE's sample-paper page. This file is the data of
// /schooling/cbse/class-10/board-exam and /schooling/cbse/class-12/board-exam.
//
// Rules (founder honesty + NCERT/CBSE copyright):
//   • LINK ONLY — every URL is CBSE's own (cbseacademic.nic.in, cbse.gov.in,
//     cbseresults.nic.in) or DigiLocker's; no PDF is copied, summarised or
//     re-hosted, and no paper text appears on Shishya.
//   • Hand-verified 26 Sep 2026: the sample-paper rows were read off CBSE's
//     own tables (cbseacademic.nic.in/SQP_CLASSX_2026-27.html and
//     SQP_CLASSXII_2026-27.html, "Sample Question Paper & Marking Scheme for
//     Exam 2026-27") and every PDF was fetched with a HEAD request that day:
//     only rows whose question paper AND marking scheme answered HTTP 200 are
//     here. Left out that day: subjects CBSE lists with a placeholder
//     "error.pdf" (Bengali, Tamil, Telugu, Kannada, Malayalam and others),
//     rows whose files returned 404 (Class 10 Foundation of IT, ICT and the
//     two Mathematics papers for visually impaired candidates) and every
//     Hindi-medium "_hi" file (all 404 on 26 Sep 2026).
//   • Every entry carries checkedOn; the date sheet is "not announced" until
//     CBSE publishes it — then it becomes an official row with the notice URL.
// Tests: tests/unit/board-exams.test.ts (hosts, checkedOn, no duplicates).

export const BOARD_EXAMS_CHECKED_ON = "2026-09-26";
const CHECKED = BOARD_EXAMS_CHECKED_ON;

export type BoardExamClass = 10 | 12;

export interface OfficialLink {
  /** The document's title as CBSE prints it (or a plain description of a portal). */
  label: string;
  url: string;
  checkedOn: string;
}

export interface SamplePaper {
  /** Subject name exactly as CBSE's table prints it. */
  subject: string;
  /** Sample question paper PDF. */
  sqp: string;
  /** Marking scheme PDF. */
  ms: string;
  checkedOn: string;
}

export type DateSheetStatus =
  | { tier: "not-announced"; checkedOn: string; checkedUrl: string }
  | { tier: "official"; label: string; url: string; checkedOn: string };

export interface BoardExamHub {
  board: "cbse";
  cls: BoardExamClass;
  /** Academic session the papers are for, as CBSE names it. */
  session: "2026-27";
  /** Calendar year of that session's board examinations (CBSE's own naming:
   *  the 2025-26 session's exams were "Board Examinations 2026"). */
  examYear: 2027;
  samplePapers: { page: OfficialLink; papers: readonly SamplePaper[] };
  curriculum: { page: OfficialLink; documents: readonly OfficialLink[] };
  previousPapers: { page: OfficialLink; years: readonly string[]; note: string };
  results: readonly OfficialLink[];
  notices: readonly OfficialLink[];
  dateSheet: DateSheetStatus;
}

const SQP10 = "https://cbseacademic.nic.in/web_material/SQP/ClassX_2026_27/";
const SQP12 = "https://cbseacademic.nic.in/web_material/SQP/ClassXII_2026_27/";
const CUR = "https://cbseacademic.nic.in/web_material/CurriculumMain27/";

const sp10 = (subject: string, sqp: string, ms: string): SamplePaper => ({ subject, sqp: SQP10 + sqp, ms: SQP10 + ms, checkedOn: CHECKED });
const sp12 = (subject: string, sqp: string, ms: string): SamplePaper => ({ subject, sqp: SQP12 + sqp, ms: SQP12 + ms, checkedOn: CHECKED });
const link = (label: string, url: string): OfficialLink => ({ label, url, checkedOn: CHECKED });

/** CBSE's previous-years page lists main-examination papers for these years
 *  for both classes (read 26 Sep 2026: folders 2022 … 2026). */
const PYQ_YEARS = ["2022", "2023", "2024", "2025", "2026"] as const;

const RESULTS: readonly OfficialLink[] = [
  link("CBSE results portal (cbseresults.nic.in)", "https://cbseresults.nic.in/"),
  link("Results on DigiLocker — the \"Results\" link on cbse.gov.in", "https://results.digilocker.gov.in/"),
  link("DigiLocker — digital marksheets and certificates", "https://www.digilocker.gov.in/"),
];

const SQP_NOTICE = link(
  "Sample Question Papers for Classes X & XII for the current Academic Session 2026-27 – reg. (CBSE notification 132/2026)",
  "https://cbseacademic.nic.in/web_material/Notifications/2026/132_Notification_2026.pdf",
);
const LOC_NOTICE = link(
  "Submission of List of Candidates (LOC) for Class X and Class XII Main Examinations- 2026-27 - reg. (21 Sep 2026)",
  "https://www.cbse.gov.in/cbsenew/documents/LOC_2627_21092026.pdf",
);

const DATE_SHEET_NOT_ANNOUNCED: DateSheetStatus = {
  tier: "not-announced",
  checkedOn: CHECKED,
  checkedUrl: "https://www.cbse.gov.in/cbsenew/cbse.html",
};

export const BOARD_EXAM_HUBS: readonly BoardExamHub[] = [
  {
    board: "cbse",
    cls: 10,
    session: "2026-27",
    examYear: 2027,
    samplePapers: {
      page: link("Class X Sample Question Paper & Marking Scheme for Exam 2026-27", "https://cbseacademic.nic.in/SQP_CLASSX_2026-27.html"),
      papers: [
        sp10("Science", "Science-SQP.pdf", "Science-MS.pdf"),
        sp10("Elements of Book Keeping and Accountancy", "ElementsBookKeepingAccountancy-SQP.pdf", "ElementsBookKeepingAccountancy-MS.pdf"),
        sp10("Elements of Business", "ElementsBusiness-SQP.pdf", "ElementsBusiness-MS.pdf"),
        sp10("English (Language & Literature)", "EnglishL-SQP.pdf", "EnglishL-MS.pdf"),
        sp10("English (Communicative)", "EnglishComm-SQP.pdf", "EnglishComm-MS.pdf"),
        sp10("Hindi A", "HindiCourseA-SQP.pdf", "HindiCourseA-MS.pdf"),
        sp10("Hindi B", "HindiCourseB-SQP.pdf", "HindiCourseB-MS.pdf"),
        sp10("Home Science", "HomeScience-SQP.pdf", "HomeScience-MS.pdf"),
        sp10("Computer Application", "ComputerApplication-SQP.pdf", "ComputerApplication-MS.pdf"),
        sp10("Mathematics (Basic)", "MathsBasic-SQP.pdf", "MathsBasic-MS.pdf"),
        sp10("Mathematics (Standard)", "MathsStandard-SQP.pdf", "MathsStandard-MS.pdf"),
        sp10("Social Science", "SocialScience-SQP.pdf", "SocialScience-MS.pdf"),
        sp10("NCC", "NCC-SQP.pdf", "NCC-MS.pdf"),
        sp10("Hindustani Music (Melodic)", "HindustaniMelodic-SQP.pdf", "HindustaniMelodic-MS.pdf"),
        sp10("Hindustani Music (Percussion)", "HindustaniMusicPercussion-SQP.pdf", "HindustaniMusicPercussion-MS.pdf"),
        sp10("Hindustani Music (Vocal)", "HindustaniVocal-SQP.pdf", "HindustaniVocal-MS.pdf"),
        sp10("Carnatic Music-Melodic Instruments", "CarnaticMelodicInstrument-SQP.pdf", "CarnaticMelodicInstrument-MS.pdf"),
        sp10("Carnatic Music-Percussion Instruments", "CarnaticMusicPercussion-SQP.pdf", "CarnaticMusicPercussion-MS.pdf"),
        sp10("Carnatic Music-Vocal", "CarnaticMusicVocal-SQP.pdf", "CarnaticMusicVocal-MS.pdf"),
        sp10("Painting", "Painting-SQP.pdf", "Painting-MS.pdf"),
        sp10("Arabic", "Arabic-SQP.pdf", "Arabic-MS.pdf"),
        sp10("Assamese", "Assamese-SQP.pdf", "Assamese-MS.pdf"),
        sp10("Bahasa Melayu", "BhashaMalyeu-SQP.pdf", "BhashaMalyeu-MS.pdf"),
        sp10("Bhoti", "Bhoti-SQP.pdf", "Bhoti-MS.pdf"),
        sp10("Bodo", "Bodo-SQP.pdf", "Bodo-MS.pdf"),
        sp10("French", "French-SQP.pdf", "French-MS.pdf"),
        sp10("German", "German-SQP.pdf", "German-MS.pdf"),
        sp10("Gurung", "Gurung-SQP.pdf", "Gurung-MS.pdf"),
        sp10("Japanese", "Japanese-SQP.pdf", "Japanese-MS.pdf"),
        sp10("Kashmiri", "Kashmiri-SQP.pdf", "Kashmiri-MS.pdf"),
        sp10("Kokborok", "Kokborok-SQP.pdf", "Kokborok-MS.pdf"),
        sp10("Manipuri", "Manipuri-SQP.pdf", "Manipuri-MS.pdf"),
        sp10("Marathi", "Marathi-SQP.pdf", "Marathi-MS.pdf"),
        sp10("Nepali", "Nepali-SQP.pdf", "Nepali-MS.pdf"),
        sp10("Odia", "Odia-SQP.pdf", "Odia-MS.pdf"),
        sp10("Persian", "Persian-SQP.pdf", "Persian-MS.pdf"),
        sp10("Punjabi", "Punjabi-SQP.pdf", "Punjabi-MS.pdf"),
        sp10("Rai", "RAI-SQP.pdf", "RAI-MS.pdf"),
        sp10("Russian", "Russian-SQP.pdf", "Russian-MS.pdf"),
        sp10("Sanskrit", "Sanskrit-SQP.pdf", "Sanskrit-MS.pdf"),
        sp10("Sanskrit Communicative", "Sanskrit-Comm-SQP.pdf", "Sanskrit-Comm-MS.pdf"),
        sp10("Spanish", "Spanish-SQP.pdf", "Spanish-MS.pdf"),
        sp10("Tamang", "Tamang-SQP.pdf", "Tamang-MS.pdf"),
        sp10("Thai", "Thai-SQP.pdf", "Thai-MS.pdf"),
        sp10("Urdu A", "UrduA-SQP.pdf", "UrduA-MS.pdf"),
        sp10("Urdu B", "UrduB-SQP.pdf", "UrduB-MS.pdf"),
      ],
    },
    curriculum: {
      page: link("Curriculum 2026-27 (CBSE Academic)", "https://cbseacademic.nic.in/curriculum_2027.html"),
      documents: [
        link("Introduction to Secondary Curriculum: Part - 1", CUR + "SecPart1/Curriculum_SecP1_2026-27.pdf"),
        link("Mathematics (Class X)", CUR + "SecPart1/Maths_SecP1X_2026-27.pdf"),
        link("Science (Class X)", CUR + "SecPart1/Science_SecP1_2026-27.pdf"),
        link("Social Science (Class X)", CUR + "SecPart1/SocialScience_SecP1X_2026-27.pdf"),
        link("English - Language and Literature (Class X)", CUR + "SecPart1/English_LL_SecP1_2026-27.pdf"),
        link("English Communicative (Class X)", CUR + "SecPart1/English_Communicative_SecP1_2026-27.pdf"),
        link("Hindi Course-A (Class X)", CUR + "SecPart1/Hindi_A_SecP1_2026-27.pdf"),
        link("Hindi Course-B (Class X)", CUR + "SecPart1/Hindi_B_SecP1_2026-27.pdf"),
      ],
    },
    previousPapers: {
      page: link("Previous Years' Question Papers (CBSE)", "https://www.cbse.gov.in/cbsenew/question-paper.html"),
      years: PYQ_YEARS,
      note: "The same page also has the Class X supplementary (compartment) papers for 2022-2025 and the 2026 Class X second board examination papers.",
    },
    results: RESULTS,
    notices: [
      SQP_NOTICE,
      LOC_NOTICE,
      link("Two Board Examinations in Class X from 2026 - Clarification reg. (14 Feb 2026)", "https://www.cbse.gov.in/cbsenew/documents/Notification_Two_Board_Examinations_Class_X_14022026.pdf"),
    ],
    dateSheet: DATE_SHEET_NOT_ANNOUNCED,
  },
  {
    board: "cbse",
    cls: 12,
    session: "2026-27",
    examYear: 2027,
    samplePapers: {
      page: link("Class XII Sample Question Paper & Marking Scheme for Exam 2026-27", "https://cbseacademic.nic.in/SQP_CLASSXII_2026-27.html"),
      papers: [
        sp12("Accountancy", "Accountancy-SQP.pdf", "Accountancy-MS.pdf"),
        sp12("Arabic", "Arabic-SQP.pdf", "Arabic-MS.pdf"),
        sp12("Assamese", "Assamese-SQP.pdf", "Assamese-MS.pdf"),
        sp12("Bharatanatyam", "Bharatnatyam-SQP.pdf", "Bharatnatyam-MS.pdf"),
        sp12("Biology", "Biology-SQP.pdf", "Biology-MS.pdf"),
        sp12("Biotechnology", "Biotechnology-SQP.pdf", "Biotechnology-MS.pdf"),
        sp12("Bhoti", "Bhoti-SQP.pdf", "Bhoti-MS.pdf"),
        sp12("Bodo", "Bodo-SQP.pdf", "Bodo-MS.pdf"),
        sp12("Business Studies", "BusinessStudies-SQP.pdf", "BusinessStudies-MS.pdf"),
        sp12("Carnatic Melodic", "CarnaticMusicMelodicInstrument-SQP.pdf", "CarnaticMusicMelodicInstrument-MS.pdf"),
        sp12("Carnatic Percussion", "CarnaticMusicPercussion-SQP.pdf", "CarnaticMusicPercussion-MS.pdf"),
        sp12("Carnatic Vocal", "CarnaticMusicVocal-SQP.pdf", "CarnaticMusicVocal-MS.pdf"),
        sp12("Chemistry", "Chemistry-SQP.pdf", "Chemistry-MS.pdf"),
        sp12("Computer Science", "ComputerScience-SQP.pdf", "ComputerScience-MS.pdf"),
        sp12("Dance Manipuri", "ManipuriDance-SQP.pdf", "ManipuriDance-MS.pdf"),
        sp12("Dance Odissi", "Odissi-SQP.pdf", "Odissi-MS.pdf"),
        sp12("Economics", "Economics-SQP.pdf", "Economics-MS.pdf"),
        sp12("Engg. Graphic", "EnggGraphics-SQP.pdf", "EnggGraphics-MS.pdf"),
        sp12("English Core", "EnglishCore-SQP.pdf", "EnglishCore-MS.pdf"),
        sp12("English Elective", "EnglishElective-SQP.pdf", "EnglishElective-MS.pdf"),
        sp12("Entrepreneurship", "Entrepreneurship-SQP.pdf", "Entrepreneurship-MS.pdf"),
        sp12("French", "French-SQP.pdf", "French-MS.pdf"),
        sp12("Geography", "Geography-SQP.pdf", "Geography-MS.pdf"),
        sp12("German", "German-SQP.pdf", "German-MS.pdf"),
        sp12("Hindi Elective", "HindiElective-SQP.pdf", "HindiElective-MS.pdf"),
        sp12("Hindi Core", "HindiCore-SQP.pdf", "HindiCore-MS.pdf"),
        sp12("History", "History-SQP.pdf", "History-MS.pdf"),
        sp12("Hindustani Music (Melodic)", "HindustaniMelodic-SQP.pdf", "HindustaniMelodic-MS.pdf"),
        sp12("Hindustani Music (Percussion)", "HindustaniPercussion-SQP.pdf", "HindustaniPercussion-MS.pdf"),
        sp12("Hindustani Music (Vocal)", "HindustaniVocal-SQP.pdf", "HindustaniVocal-MS.pdf"),
        sp12("Home Science", "HomeScience-SQP.pdf", "HomeScience-MS.pdf"),
        sp12("Informatics Practices", "InformaticsPractices-SQP.pdf", "InformaticsPractices-MS.pdf"),
        sp12("Japanese", "Japanese-SQP.pdf", "Japanese-MS.pdf"),
        sp12("Kashmiri", "Kashmiri-SQP.pdf", "Kashmiri-MS.pdf"),
        sp12("Kathak", "Kathak-SQP.pdf", "Kathak-MS.pdf"),
        sp12("Kathakali", "Kathakali-SQP.pdf", "Kathakali-MS.pdf"),
        sp12("Kuchipudi", "Kuchipudi-SQP.pdf", "Kuchipudi-MS.pdf"),
        sp12("Legal Studies", "LegalStudies-SQP.pdf", "LegalStudies-MS.pdf"),
        sp12("Limboo", "Limboo-SQP.pdf", "Limboo-MS.pdf"),
        sp12("Marathi", "Marathi-SQP.pdf", "Marathi-MS.pdf"),
        sp12("Applied Arts (Commercial Art)", "Applied_Arts-SQP.pdf", "Applied_Arts-MS.pdf"),
        sp12("Applied Mathematics", "Applied-Maths-SQP.pdf", "Applied-Maths-MS.pdf"),
        sp12("Mathematics", "Maths-SQP.pdf", "Maths-MS.pdf"),
        sp12("NCC", "NCC-SQP.pdf", "NCC-MS.pdf"),
        sp12("Kokborok", "Kokborok-SQP.pdf", "Kokborok-MS.pdf"),
        sp12("Odia", "ODIA-SQP.pdf", "ODIA-MS.pdf"),
        sp12("Painting", "Painting-SQP.pdf", "Painting-MS.pdf"),
        sp12("Graphic", "Graphic-SQP.pdf", "Graphic-MS.pdf"),
        sp12("Sculpture", "Sculpture-SQP.pdf", "Sculpture-MS.pdf"),
        sp12("Persian", "Persian-SQP.pdf", "Persian-MS.pdf"),
        sp12("Physical Education", "PhysicalEducation-SQP.pdf", "PhysicalEducation-MS.pdf"),
        sp12("Physics", "Physics-SQP.pdf", "Physics-MS.pdf"),
        sp12("Political Science", "PolSci-SQP.pdf", "PolSci-MS.pdf"),
        sp12("Psychology", "Psychology-SQP.pdf", "Psychology-MS.pdf"),
        sp12("Punjabi", "Punjabi-SQP.pdf", "Punjabi-MS.pdf"),
        sp12("Russian", "Russian-SQP.pdf", "Russian-MS.pdf"),
        sp12("Sociology", "Sociology-SQP.pdf", "Sociology-MS.pdf"),
        sp12("Spanish", "Spanish-SQP.pdf", "Spanish-MS.pdf"),
        sp12("Sanskrit Core", "SanskritCore-SQP.pdf", "SanskritCore-MS.pdf"),
        sp12("Sanskrit Elective", "SanskritElective-SQP.pdf", "SanskritElective-MS.pdf"),
        sp12("Telugu (Telangana)", "TeluguTL-SQP.pdf", "TeluguTL-MS.pdf"),
        sp12("Tibetan", "Tibetan-SQP.pdf", "Tibetan-MS.pdf"),
        sp12("Urdu Core", "UrduCore-SQP.pdf", "UrduCore-MS.pdf"),
        sp12("Urdu Elective", "UrduElective-SQP.pdf", "UrduElective-MS.pdf"),
      ],
    },
    curriculum: {
      page: link("Curriculum 2026-27 (CBSE Academic)", "https://cbseacademic.nic.in/curriculum_2027.html"),
      documents: [
        link("Introduction to Secondary Curriculum: Part - 2 (Classes XI-XII)", CUR + "SecPart2/Curriculum_SecP2_2026-27.pdf"),
        link("Physics (Classes XI-XII)", CUR + "SecPart2/Physics_SecP2_2026-27.pdf"),
        link("Chemistry (Classes XI-XII)", CUR + "SecPart2/Chemistry_SecP2_2026-27.pdf"),
        link("Mathematics (Classes XI-XII)", CUR + "SecPart2/Maths_SecP2_2026-27.pdf"),
        link("Applied Mathematics (Classes XI-XII)", CUR + "SecPart2/Applied_Mathematics_SecP2_2026-27.pdf"),
        link("Biology (Classes XI-XII)", CUR + "SecPart2/Biology_SecP2_2026-27.pdf"),
        link("Accountancy (Classes XI-XII)", CUR + "SecPart2/Accountancy_SecP2_2026-27.pdf"),
        link("Business Studies (Classes XI-XII)", CUR + "SecPart2/BusinessStudies_SecP2_2026-27.pdf"),
        link("Economics (Classes XI-XII)", CUR + "SecPart2/Economics_SecP2_2026-27.pdf"),
        link("English Core (Classes XI-XII)", CUR + "SecPart2/English_core_SecP2_2026-27.pdf"),
        link("Hindi Core (Classes XI-XII)", CUR + "SecPart2/Hindi_Core_SecP2_2026-27.pdf"),
        link("History (Classes XI-XII)", CUR + "SecPart2/History_SecP2_2026-27.pdf"),
        link("Geography (Classes XI-XII)", CUR + "SecPart2/Geography_SecP2_2026-27.pdf"),
        link("Political Science (Classes XI-XII)", CUR + "SecPart2/PoliticalScience_SecP2_2026-27.pdf"),
        link("Computer Science (Classes XI-XII)", CUR + "SecPart2/Computer_Science_SecP2_2026-27.pdf"),
        link("Psychology (Classes XI-XII)", CUR + "SecPart2/Psychology_SecP2_2026-27.pdf"),
        link("Sociology (Classes XI-XII)", CUR + "SecPart2/Sociology_SecP2_2026-27.pdf"),
      ],
    },
    previousPapers: {
      page: link("Previous Years' Question Papers (CBSE)", "https://www.cbse.gov.in/cbsenew/question-paper.html"),
      years: PYQ_YEARS,
      note: "The same page also has each year's supplementary (compartment) papers.",
    },
    results: RESULTS,
    notices: [SQP_NOTICE, LOC_NOTICE],
    dateSheet: DATE_SHEET_NOT_ANNOUNCED,
  },
];

/** The hub for (board, class), or undefined — only CBSE Class 10 and 12 exist. */
export function findBoardExamHub(boardSlug: string, cls: number): BoardExamHub | undefined {
  return BOARD_EXAM_HUBS.find((h) => h.board === boardSlug && h.cls === cls);
}

/** Every official URL a hub links, in page order (sample papers, curriculum,
 *  previous papers, results, notices, the date-sheet notice when official). */
export function boardExamLinks(h: BoardExamHub): OfficialLink[] {
  return [
    h.samplePapers.page,
    ...h.samplePapers.papers.flatMap((p) => [
      { label: `${p.subject} — sample question paper`, url: p.sqp, checkedOn: p.checkedOn },
      { label: `${p.subject} — marking scheme`, url: p.ms, checkedOn: p.checkedOn },
    ]),
    h.curriculum.page,
    ...h.curriculum.documents,
    h.previousPapers.page,
    ...h.results,
    ...h.notices,
    ...(h.dateSheet.tier === "official" ? [{ label: h.dateSheet.label, url: h.dateSheet.url, checkedOn: h.dateSheet.checkedOn }] : []),
  ];
}
