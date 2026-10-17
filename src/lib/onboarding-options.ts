// Stage + suggested-exam options for the 3-question onboarding wizard.
// Pure data; no DB calls. The exam codes here must match Exam.code in
// the database; the wizard API validates them before persisting.

import { STATES } from "./state-info";
import { under13ExamGuard } from "./signin-cta";

export interface StageOption {
  value: string;
  label: string;
  /** 1-line description shown under the label */
  description: string;
  /** Exam codes most relevant for this stage — populates step 3 by default */
  suggestedPrepCodes: string[];
}

export const STAGE_OPTIONS: StageOption[] = [
  // 27 Sep 2026: Class 8 had no card although Class 8 has chapter notes,
  // checked practice and the AI tutor (13 and above). No exam suggestions:
  // the finish sends school stages to /schooling (OnboardingWizard submit).
  {
    value: "CLASS_8",
    label: "Class 8",
    description: "Class 8 chapters with notes, practice questions and the AI tutor — free.",
    suggestedPrepCodes: [],
  },
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

/** The exams the wizard may tick by ITSELF — a persona's pre-pinned set (the
 *  1-click confirm writes them without a separate pick) and a stage's
 *  suggestions (17 Oct 2026, under-13 safety). Never a kids' exam
 *  (src/lib/signin-cta.ts under13ExamGuard: SOF, Silverzone, NSTSE, PRIL,
 *  ZIO, JNVST — the "I'm in Class 10" persona pre-pinned SOF_NSO and
 *  SOF_IMO): a kids' exam is never set for a student automatically. The
 *  chips on the exam step still list every active exam, so a student can
 *  pick one themselves. Order kept. */
export function autoPrepCodes(codes: readonly string[]): string[] {
  return codes.filter((c) => !under13ExamGuard(c));
}
