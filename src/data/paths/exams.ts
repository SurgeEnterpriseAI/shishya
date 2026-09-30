// Exam nodes of the path graph (30 Sep 2026, P1 build 1).
//
// An exam is named by its code. A page links /exams/{code} only while the
// code is a live exam (loadLiveExams + examHubHref, the /career-map pattern);
// otherwise it prints `label` as plain text. Every code except the three
// label-only ones was an Exam row in the 26 Sep 2026 search snapshot
// (tests/fixtures/search-inputs-2026-09-26.json — tests/unit/paths-registry
// pins it). CLAT, BITSAT and IPMAT had no Exam row that day: they are labels
// until a row goes live, and then link by themselves.
//
// Pure data.

import type { PathExam } from "./types";

export const PATH_EXAMS: readonly PathExam[] = [
  { code: "JEE_MAIN", label: "JEE Main" },
  { code: "JEE_ADVANCED", label: "JEE Advanced" },
  { code: "NEET_UG", label: "NEET UG" },
  { code: "CUET_UG", label: "CUET UG" },
  { code: "NDA", label: "NDA" },
  { code: "NATA", label: "NATA" },
  { code: "AILET", label: "AILET" },
  { code: "NID_DAT", label: "NID DAT" },
  { code: "NIFT", label: "NIFT entrance" },
  { code: "UCEED", label: "UCEED" },
  { code: "UPSC_PRELIMS", label: "UPSC Prelims (after graduation)" },
  { code: "CA_FOUNDATION", label: "CA Foundation" },
  // State entrance tests (the /exams/entrance "State CETs" group).
  { code: "MH_MHTCET", label: "MHT-CET" },
  { code: "KA_KCET", label: "KCET" },
  { code: "KA_COMEDK", label: "COMEDK UGET" },
  { code: "AP_EAMCET", label: "AP EAPCET" },
  { code: "TS_EAMCET", label: "TS EAPCET" },
  { code: "WB_WBJEE", label: "WBJEE" },
  { code: "KL_KEAM", label: "KEAM" },
  // Polytechnic entrance tests (src/data/iti-diploma.ts POLYTECHNIC_ENTRY_EXAMS).
  { code: "UP_JEECUP", label: "UP JEECUP" },
  { code: "AP_POLYCET", label: "AP POLYCET" },
  { code: "TS_POLYCET", label: "TS POLYCET" },
  { code: "BR_DCECE", label: "Bihar DCECE" },
  { code: "UK_POLYTECHNIC", label: "Uttarakhand Polytechnic (JEEP)" },
  { code: "HP_POLYTECHNIC", label: "HP Polytechnic (PAT)" },
  // No Exam row on 26 Sep 2026: plain labels until one goes live.
  { code: "CLAT", label: "CLAT" },
  { code: "BITSAT", label: "BITSAT" },
  { code: "IPMAT", label: "IPMAT" },
];

/** Codes that had no Exam row on 26 Sep 2026 (labels only today). */
export const LABEL_ONLY_EXAM_CODES: readonly string[] = ["CLAT", "BITSAT", "IPMAT"];
