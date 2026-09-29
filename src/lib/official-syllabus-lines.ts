// Where the conducting body's own syllabus names a Shishya topic (29 Sep 2026).
//
// Why: a topic page said nothing about the exam that a reader could check.
// Shishya's topic tree is its own outline (for long-tail exams it was
// drafted by AI from the exam's name), not the official syllabus. For the
// exams read so far, the page now points at the place in the body's own
// document where the topic is named, with the link and the day it was read.
//
// How each entry was made: the document was downloaded from the body's own
// site and read twice, the second reading made without trusting the first
// (session folder official-reading/, 29 Sep 2026). Only topics BOTH readings
// found are listed. Left out on purpose: IOQM "Permutations and
// Combinations" (the olympiad syllabus does not print those words) and APPSC
// Group II "Governance and Administrative Structure" (the name is not
// printed; the nearest line needs a person's decision).
//
// The page shows the place, not the syllabus text. Key: "{EXAM}/{topic.code}".

import { READ_DOCUMENTS, READ_PLACES } from "@/data/official-readings";

export interface SyllabusDocument {
  publisherShort: string;
  /** The document's name as the page prints it. */
  name: string;
  url: string;
  /** YYYY-MM-DD (IST) the document was read. */
  readOn: string;
  /** The PDF is an image with no text layer: read by AI, twice. */
  scanned?: boolean;
  /** Something the reader must know about this document's reach. */
  caveat?: string;
}

const TNPSC_G1: SyllabusDocument = {
  publisherShort: "TNPSC",
  name: "Group I Preliminary Examination syllabus (Code 497)",
  url: "https://tnpsc.gov.in/static_pdf/syllabus/497_group%201%20preliminary%20syllabus.pdf",
  readOn: "2026-09-29",
};
const UPSSSC_PET: SyllabusDocument = {
  publisherShort: "UPSSSC",
  name: "PET-2026 advertisement (No. 16-Exam/2026), para 10: scheme and syllabus",
  url: "https://upsssc.gov.in/ViewPdf.aspx?tOQhA8AoFpUkdSk5J2hr0lU0H14+rIaUtQroTArbIsw=",
  readOn: "2026-09-29",
  scanned: true,
};
const APPSC_G2: SyllabusDocument = {
  publisherShort: "APPSC",
  name: "Syllabus for Group-II Services (27 April 2023)",
  url: "https://psc.ap.gov.in/Documents/NotificationDocuments/Syllabus%20for%20GROUP%20II%20Services_01052023.pdf",
  readOn: "2026-09-29",
};
const OLYMPIAD: SyllabusDocument = {
  publisherShort: "MTA(I) and HBCSE",
  name: "Syllabus for Mathematical Olympiad",
  url: "https://ioqm.mtai.org.in/documents/Syllabus%20for%20Mathematical%20Olympiad.pdf",
  readOn: "2026-09-29",
  caveat: "The syllabus is written for the Mathematical Olympiad as a whole and says its list of topics is not exhaustive.",
};

export interface SyllabusPlace {
  doc: SyllabusDocument;
  /** Paper, part and unit, as the document prints them. */
  where: string;
}

const UNIT_III = "Part A: General Studies, Unit III: History, Culture of India, and Indian National Movement";
const UNIT_IV = "Part A: General Studies, Unit IV: Indian Polity";
const UNIT_V = "Part A: General Studies, Unit V: Indian Economy and Development Administration in Tamil Nadu";
const UNIT_VI = "Part A: General Studies, Unit VI: History, Culture, Heritage, and Socio-Political Movements in Tamil Nadu";
const APT_I = "Part B: Aptitude and Mental Ability, Unit I: Aptitude";
const APT_II = "Part B: Aptitude and Mental Ability, Unit II: Reasoning";
const AP_SCREEN = "Screening Test, General Studies and Mental Ability";
const AP_MAIN_1A = "Main Examination, Paper-I, Section A: Social and Cultural History of Andhra Pradesh";

/** Read and typed by hand. An entry here wins over a generated one. */
const HAND_READ_PLACES: Readonly<Record<string, SyllabusPlace>> = {
  "TN_TNPSC_GROUP1/apt.si_ci": { doc: TNPSC_G1, where: APT_I },
  "TN_TNPSC_GROUP1/apt.dice": { doc: TNPSC_G1, where: APT_II },
  "TN_TNPSC_GROUP1/gs.freedom.leaders": { doc: TNPSC_G1, where: UNIT_III },
  "TN_TNPSC_GROUP1/gs.polity.fr_dpsp": { doc: TNPSC_G1, where: UNIT_IV },
  "TN_TNPSC_GROUP1/gs.economy.nature": { doc: TNPSC_G1, where: UNIT_V },
  "TN_TNPSC_GROUP1/gs.economy.fiscal": { doc: TNPSC_G1, where: UNIT_V },
  "TN_TNPSC_GROUP1/gs.economy.poverty": { doc: TNPSC_G1, where: UNIT_V },
  "TN_TNPSC_GROUP1/tn.administration.e_gov": { doc: TNPSC_G1, where: UNIT_V },
  "TN_TNPSC_GROUP1/tn.movements.justice": { doc: TNPSC_G1, where: UNIT_VI },
  "TN_TNPSC_GROUP1/tn.history.archaeology": { doc: TNPSC_G1, where: UNIT_VI },
  "TN_TNPSC_GROUP1/tn.freedom.early_uprisings": { doc: TNPSC_G1, where: UNIT_VI },

  "UP_UPSSSC_PET/history.indus_valley": { doc: UPSSSC_PET, where: "Serial 1: Indian History" },
  "UP_UPSSSC_PET/geo.deserts": { doc: UPSSSC_PET, where: "Serial 3: Geography" },
  "UP_UPSSSC_PET/sci.physics": { doc: UPSSSC_PET, where: "Serial 6: General Science" },
  "UP_UPSSSC_PET/hindi.paryayvachi": { doc: UPSSSC_PET, where: "Serial 8: General Hindi" },
  "UP_UPSSSC_PET/hindi.samshrut": { doc: UPSSSC_PET, where: "Serial 8: General Hindi" },
  "UP_UPSSSC_PET/hindi.muhavare": { doc: UPSSSC_PET, where: "Serial 8: General Hindi" },
  "UP_UPSSSC_PET/hindi.lekhak_rachana": { doc: UPSSSC_PET, where: "Serial 8: General Hindi" },
  "UP_UPSSSC_PET/ga.neighbours": { doc: UPSSSC_PET, where: "Serial 12: General Awareness" },
  "UP_UPSSSC_PET/ga.awards": { doc: UPSSSC_PET, where: "Serial 12: General Awareness" },
  "UP_UPSSSC_PET/hpa.passage2": { doc: UPSSSC_PET, where: "Serial 13: Unseen Hindi passage" },

  "AP_APPSC_GROUP2/gs.geography": { doc: APPSC_G2, where: `${AP_SCREEN}: Geography` },
  "AP_APPSC_GROUP2/gs.geography.physical": { doc: APPSC_G2, where: `${AP_SCREEN}: Geography, General and Physical Geography` },
  "AP_APPSC_GROUP2/gs.indian_history.ancient": { doc: APPSC_G2, where: `${AP_SCREEN}: Indian History, Ancient History` },
  "AP_APPSC_GROUP2/gs.indian_history.medieval": { doc: APPSC_G2, where: `${AP_SCREEN}: Indian History, Medieval History` },
  "AP_APPSC_GROUP2/ap_history.ancient_medieval": { doc: APPSC_G2, where: AP_MAIN_1A },
  "AP_APPSC_GROUP2/ap_history.modern": { doc: APPSC_G2, where: AP_MAIN_1A },

  "IOQM/math.combinatorics": { doc: OLYMPIAD, where: "Combinatorics" },
  "IOQM/math.geometry.triangles": { doc: OLYMPIAD, where: "Plane Geometry" },
  "IOQM/math.algebra.sequences": { doc: OLYMPIAD, where: "Algebra" },
};

const generatedPlaces: Record<string, SyllabusPlace> = {};
for (const [key, place] of Object.entries(READ_PLACES)) {
  const doc = READ_DOCUMENTS[place.doc];
  if (doc) generatedPlaces[key] = { doc, where: place.where };
}

/** Every topic page with a place in its exam's official syllabus: the
 *  generated readings (src/data/official-readings.ts) and the hand-read ones. */
export const OFFICIAL_SYLLABUS_PLACES: Readonly<Record<string, SyllabusPlace>> = { ...generatedPlaces, ...HAND_READ_PLACES };

export function officialSyllabusPlace(examCode: string, topicCode: string): SyllabusPlace | null {
  return OFFICIAL_SYLLABUS_PLACES[`${examCode}/${topicCode}`] ?? null;
}

export interface SyllabusPlaceCopy {
  label: string;
  /** {date} */
  readOn: string;
  scanned: string;
}

const COPY: Record<"en" | "hi" | "te", SyllabusPlaceCopy> = {
  en: { label: "In the official syllabus", readOn: "read {date}", scanned: "a scanned PDF, read by AI twice" },
  hi: { label: "आधिकारिक पाठ्यक्रम में", readOn: "{date} को पढ़ा गया", scanned: "स्कैन की गई PDF, AI ने दो बार पढ़ी" },
  te: { label: "అధికారిక సిలబస్‌లో", readOn: "{date}న చదివాం", scanned: "స్కాన్ చేసిన PDF, AI రెండుసార్లు చదివింది" },
};

export function syllabusPlaceCopy(locale: string | null | undefined): SyllabusPlaceCopy {
  return locale === "hi" || locale === "te" ? COPY[locale] : COPY.en;
}
