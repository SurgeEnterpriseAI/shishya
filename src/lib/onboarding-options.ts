// Stage + suggested-exam options for the 3-question onboarding wizard.
// Pure data; no DB calls. The exam codes here must match Exam.code in
// the database; the wizard API validates them before persisting.

import { STATES } from "./state-info";

export interface StageOption {
  value: string;
  label: string;
  /** 1-line description shown under the label */
  description: string;
  /** Exam codes most relevant for this stage — populates step 3 by default */
  suggestedPrepCodes: string[];
}

export const STAGE_OPTIONS: StageOption[] = [
  {
    value: "CLASS_9_10",
    label: "Class 9–10",
    description: "Building up to boards. Maybe NTSE / Olympiad. Years away from entrance exams.",
    suggestedPrepCodes: ["NTSE", "NSEJS", "RMO", "NSO"],
  },
  {
    value: "CLASS_11_12",
    label: "Class 11–12",
    description: "Board prep + JEE / NEET / CUET / CLAT. The high-stakes years.",
    suggestedPrepCodes: ["JEE_MAIN", "JEE_ADVANCED", "NEET_UG", "CUET_UG", "CLAT", "BITSAT"],
  },
  {
    value: "UG",
    label: "Undergraduate",
    description: "In a UG course. Eyes on PG entrance / govt jobs / placements.",
    suggestedPrepCodes: ["GATE", "CAT", "CSIR_NET", "UGC_NET", "UPSC_PRELIMS", "SSC_CGL", "IBPS_PO"],
  },
  {
    value: "PG",
    label: "Postgraduate / PhD aspirant",
    description: "PG / PhD. UGC NET, CSIR NET, GATE for higher PG, research.",
    suggestedPrepCodes: ["UGC_NET", "CSIR_NET", "GATE", "UPSC_PRELIMS"],
  },
  {
    value: "WORKING",
    label: "Working professional",
    description: "Already employed. Looking for govt-job switch, MBA, or upskilling.",
    suggestedPrepCodes: ["CAT", "UPSC_PRELIMS", "SSC_CGL", "IBPS_PO", "RBI_GRADE_B"],
  },
  {
    value: "OTHER",
    label: "Something else",
    description: "Different journey. Skip personalisation; browse freely.",
    suggestedPrepCodes: [],
  },
];

/** Sorted, India-only state list for the wizard's step 2. */
export function statesForWizard(): Array<{ value: string; label: string }> {
  return Object.values(STATES)
    .map((s) => ({ value: s.code, label: s.name }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
