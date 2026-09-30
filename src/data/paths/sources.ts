// Official sources for the path registry (30 Sep 2026, P1 build 1).
//
// Honesty guard 5: a path fact or a board's subject list is printed only with
// a source on the body's OWN domain — a regulated Indian government or
// academic suffix (gov.in, nic.in, ac.in, edu.in, res.in) or a board /
// conducting body / regulator that sits on a commercial domain and is listed
// in BOARD_OWN_HOSTS below. Never an aggregator (AGGREGATOR_DENYLIST), and the
// denylist is checked first, so an aggregator can never pass as official.
//
// PATH_SOURCES: every document the stream researcher downloaded and read on
// 30 Sep 2026 (p1/stream-facts.json, raw texts kept in the P1 scratchpad).
// Titles are as printed on the document or page. One constant per document,
// so the facts and board rows that cite it cannot drift apart.
//
// Pure: no imports, no clock.

import type { PathSource } from "./types";

/** Regulated Indian suffixes only government / academic bodies can register. */
export const OFFICIAL_HOST_SUFFIXES: readonly string[] = ["gov.in", "nic.in", "ac.in", "edu.in", "res.in"];

/** Boards, regulators and conducting bodies on their own commercial domains.
 *  Each one is the body's own site (a subdomain counts). */
export const BOARD_OWN_HOSTS: readonly string[] = [
  "aicte-india.org", // All India Council for Technical Education (AICTE)
  "mahacet.org", // State Common Entrance Test Cell, Government of Maharashtra (cetcell.mahacet.org)
  "biharboardonline.com", // Bihar School Examination Board's intermediate registration portal
  "mahahsscboard.in", // Maharashtra State Board of Secondary and Higher Secondary Education
  "cisce.org", // CISCE (ICSE / ISC)
  "gseb.org", // Gujarat Secondary and Higher Secondary Education Board
  "nmc.org.in", // National Medical Commission
  "icai.org", // Institute of Chartered Accountants of India
  "icsi.edu", // Institute of Company Secretaries of India
  "barcouncilofindia.org", // Bar Council of India
  "comedk.org", // COMEDK
];

/** Discovery portals, coaching and job-alert sites: never a path source. */
export const AGGREGATOR_DENYLIST: readonly string[] = [
  "shiksha.com",
  "collegedunia.com",
  "careers360.com",
  "collegedekho.com",
  "getmyuni.com",
  "jagranjosh.com",
  "testbook.com",
  "adda247.com",
  "sarkariresult.com",
  "freejobalert.com",
  "buddy4study.com",
  "aglasem.com",
  "embibe.com",
  "byjus.com",
  "vedantu.com",
  "examsdaily.in",
  "successcds.net",
];

function hostOf(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  } catch {
    return null;
  }
}

const onDomain = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

/** True when `url` is an allowed path source: http(s), not an aggregator, on an
 *  official suffix or a listed board/body host. */
export function isAllowedSourceUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const host = hostOf(url);
  if (!host) return false;
  if (AGGREGATOR_DENYLIST.some((d) => onDomain(host, d))) return false;
  if (OFFICIAL_HOST_SUFFIXES.some((s) => onDomain(host, s))) return true;
  return BOARD_OWN_HOSTS.some((h) => onDomain(host, h));
}

/** The day the stream researcher read every document below. */
export const PATHS_READ_ON = "2026-09-30";

const src = (url: string, publisher: string, title: string): PathSource => ({
  url,
  publisher,
  title,
  checkedOn: PATHS_READ_ON,
  tier: "official",
});

/** Every official document the registry cites, read on 30 Sep 2026. */
export const PATH_SOURCES = {
  cbseScheme: src(
    "https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/Curriculum_SecP2_2026-27.pdf",
    "Central Board of Secondary Education (CBSE)",
    "Introduction to Secondary Curriculum: Part - 2 (XI-XII), 2026-27",
  ),
  tnHse: src(
    "https://dge.tn.gov.in/docs/examina/HSE_E.pdf",
    "Directorate of Government Examinations, Tamil Nadu",
    "Higher Secondary First Year / Second Year Examinations",
  ),
  tsIntermediate: src(
    "https://scert.telangana.gov.in/pdf/publication/others/1-intermediate%20courses.pdf",
    "SCERT Telangana",
    "What Next? After 10th Class: Intermediate Courses offered by Telangana State Board of Intermediate Education",
  ),
  tsVocational: src(
    "https://scert.telangana.gov.in/pdf/publication/others/6%20-%20list%20of%20voctional%20courses.pdf",
    "SCERT Telangana",
    "What Next? After 10th Class: List of Vocational Courses offered by State Institution of Vocational Education",
  ),
  klHscap: src(
    "https://www.hscap.kerala.gov.in/course.php",
    "Higher Secondary Centralised Allotment Process (HSCAP), Kerala",
    "List of Courses",
  ),
  wbSubjects: src(
    "https://wbchse.wb.gov.in/subjects/",
    "West Bengal Council of Higher Secondary Education",
    "Subjects: Subject Combination offered by the Council",
  ),
  upSubjects: src(
    "https://examreg.upmsp.edu.in/Downloads/SubjectDirectoryClass11th.pdf",
    "Board of High School and Intermediate Education, Uttar Pradesh",
    "Subject Directory of class 11th 2024-25 and for Intermediate Examination-2025",
  ),
  brArtsCommerce: src(
    "https://intermediate.biharboardonline.com/2026-28/assets/Notifications/Arts%20&%20Commerce%20pvt%20Registration%20Form%20session%202026-28.pdf",
    "Bihar School Examination Board",
    "Registration Form, Intermediate Examination 2028, Session 2026-28 (Arts and Commerce, private candidates)",
  ),
  niosSeniorSecondary: src(
    "https://rckolkata.nios.ac.in/sr-secondary.html",
    "National Institute of Open Schooling, Regional Centre Kolkata",
    "Sr. Secondary",
  ),
  dgtNiosFaq: src(
    "https://dgt.gov.in/sites/default/files/2026-07/FAQ-NIOS-DGT-scheme.pdf",
    "Directorate General of Training (DGT)",
    "NIOS-DGT Integrated Academic Certification Scheme: Frequently Asked Questions (FAQ) for ITI Learners",
  ),
  aicteAph: src(
    "https://aicte-india.org/sites/default/files/approval/APH%20Final.pdf",
    "All India Council for Technical Education (AICTE)",
    "Approval Process Handbook 2024-25 to 2026-27",
  ),
  jeeMainBulletin: src(
    "https://cdnbbsr.s3waas.gov.in/s3f8e59f4b2fe7c5705bf878bbd494ccdf/uploads/2025/11/202511021649722475.pdf",
    "National Testing Agency (NTA)",
    "JEE (Main) 2026 Information Bulletin",
  ),
  jeeAdvancedEligibility: src(
    "https://jeeadv.ac.in/eligibility.html",
    "JEE (Advanced) 2026",
    "Eligibility criteria",
  ),
  neetBulletin: src(
    "https://cdnbbsr.s3waas.gov.in/s37bc1ec1d9c3426357e69acd5bf320061/uploads/2026/02/202602231394640855.pdf",
    "National Testing Agency (NTA)",
    "Information Bulletin NEET (UG)-2026",
  ),
  cuetBulletin: src(
    "https://cdnbbsr.s3waas.gov.in/s3d1a21da7bca4abff8b0b61b87597de73/uploads/2026/01/202601031633478370.pdf",
    "National Testing Agency (NTA)",
    "CUET (UG) 2026 Information Bulletin",
  ),
  clatEligibility: src(
    "https://consortiumofnlus.ac.in/clat-2027/ug-eligibility.html",
    "Consortium of National Law Universities",
    "CLAT 2027 UG Exam Eligibility, CLAT 2027 Age Limit",
  ),
  ndaNotice: src(
    "https://www.upsc.gov.in/sites/default/files/Notif-NDA-II-2026-Engl-200526.pdf",
    "Union Public Service Commission (UPSC)",
    "National Defence Academy and Naval Academy Examination (II), 2026: Examination Notice No. 10/2026-NDA-II",
  ),
  mhtCetBrochure: src(
    "https://cetcell.mahacet.org/wp-content/uploads/2023/12/MHT-CET-2026-Information-Brochure-Updated-on-10.02.2026.pdf",
    "State Common Entrance Test Cell, Government of Maharashtra",
    "Information Brochure MHT-CET 2026",
  ),
  apEapcetAgriPharma: src(
    "https://cets.apsche.ap.gov.in/EAPCET25/PDF/APEAPCET2025_Instruction_Booklet_Agriculture_Pharmacy.pdf",
    "Andhra Pradesh State Council of Higher Education (APSCHE)",
    "AP EAPCET 2025 Instruction Booklet: Agriculture, Pharmacy",
  ),
} as const satisfies Record<string, PathSource>;

export type PathSourceKey = keyof typeof PATH_SOURCES;
