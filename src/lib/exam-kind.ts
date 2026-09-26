// What kind of exam a row is — entrance, olympiad, government or
// professional (26 Sep 2026).
//
// Why: on 26 Sep 2026 Shishya became one smart place to study with
// independent sections (school, entrance exams, government exams, colleges
// and scholarships, careers). The exam pages still spoke only of
// "government exams" and every hub's Course JSON-LD said
// educationalLevel "Entrance Exam" — for SSC GD and KCET alike. The
// ExamCategory enum is close but not exact: NDA is filed under GOVT_JOBS
// though students sit it straight after Class 12 for admission to the
// National Defence Academy (the home page's Entrance door already lists it,
// src/lib/home-doors.ts ENTRANCE_DOOR_CODES), and 28 of the 128 STATE_LEVEL
// rows are state admission tests (KCET, MHT-CET, EAMCET, KEAM, WBJEE,
// POLYCETs, BCECE …), not recruitment.
//
// STATE_CET_CODES is an explicit list, confirmed against the prod DB on
// 26 Sep 2026: code ~* 'CET|POLYCET|KEAM|WBJEE|OJEE|COMEDK|JEECUP|REAP|
// POLYTECHNIC' on active STATE_LEVEL rows returned 26, all but HR_HSSC_CET
// admission tests (scripts/tmp-disc-cexam.ts); a second read of the names
// (entrance|admission|polytechnic|diploma … — scripts/tmp-disc-cexam4.ts)
// found three more the code pattern misses: AS_ASSAMCEE (Assam Combined
// Entrance Examination), BR_BCECE (Bihar Combined Entrance Competitive
// Examination) and BR_DCECE (Bihar Diploma Combined Entrance Competitive
// Examination). A pattern match is not used on purpose: HR_HSSC_CET — the
// Haryana Staff Selection Commission's Common Eligibility Test — matches
// /CET/ but is a recruitment test. A new state CET joins this list by hand,
// with a DB check.
//
// Pure: no DB, no Next imports — safe in pages, route handlers and tests
// (tests/unit/exam-kind.test.ts).

export type ExamKind = "entrance" | "olympiad" | "government" | "professional";

/** Active STATE_LEVEL admission tests (26 Sep 2026, prod DB). Not
 *  HR_HSSC_CET: that is a recruitment eligibility test. */
export const STATE_CET_CODES: readonly string[] = [
  "AP_EAMCET",
  "AP_ICET",
  "AP_LAWCET",
  "AP_POLYCET",
  "AS_ASSAMCEE",
  "BR_BCECE",
  "BR_DCECE",
  "GJ_GUJCET",
  "HP_POLYTECHNIC",
  "JK_JKCET",
  "KA_COMEDK",
  "KA_KCET",
  "KL_KEAM",
  "MH_MAHCET_LAW",
  "MH_MAHCET_MBA",
  "MH_MHTCET",
  "MH_NURSING_CET",
  "OD_OJEE",
  "PB_PUNJABCET",
  "RJ_REAP",
  "TS_EAMCET",
  "TS_ICET",
  "TS_LAWCET",
  "TS_POLYCET",
  "UK_POLYTECHNIC",
  "UP_JEECUP",
  "UP_UPCET",
  "WB_WBJEE",
];

const STATE_CET_SET: ReadonlySet<string> = new Set(STATE_CET_CODES);

/** Exams the ExamCategory enum files elsewhere that students sit for
 *  admission (NDA: GOVT_JOBS in the DB, the Entrance door on the home page). */
export const ENTRANCE_EXCEPTION_CODES: readonly string[] = ["NDA"];

const ENTRANCE_CATEGORIES: ReadonlySet<string> = new Set(["ENGINEERING", "MEDICAL", "LAW", "MBA", "UNIVERSITY"]);

/** True for a state admission test (KCET, MHT-CET, EAMCET …). */
export function isStateCetCode(code: string): boolean {
  return STATE_CET_SET.has(code);
}

/** The kind of one exam from its code and ExamCategory. */
export function examKind(e: { code: string; category?: string | null }): ExamKind {
  if (ENTRANCE_EXCEPTION_CODES.includes(e.code) || STATE_CET_SET.has(e.code)) return "entrance";
  const cat = String(e.category ?? "").toUpperCase();
  if (ENTRANCE_CATEGORIES.has(cat)) return "entrance";
  if (cat === "OLYMPIAD") return "olympiad";
  // CA_FOUNDATION and CS_FOUNDATION are the only OTHER rows (26 Sep 2026).
  if (cat === "OTHER") return "professional";
  return "government";
}

export type ExamKindLabel = "Government recruitment exam" | "Entrance exam" | "Olympiad" | "Professional exam";

const KIND_LABEL: Record<ExamKind, ExamKindLabel> = {
  government: "Government recruitment exam",
  entrance: "Entrance exam",
  olympiad: "Olympiad",
  professional: "Professional exam",
};

/** The honest one-phrase label of an exam's kind (hub Course JSON-LD
 *  educationalLevel, the social card chip). */
export function examKindLabel(e: { code: string; category?: string | null }): ExamKindLabel {
  return KIND_LABEL[examKind(e)];
}

// ── The /exams/entrance landing's groups ──────────────────────────────

export type EntranceGroupKey = "engineering" | "medical" | "university" | "law" | "management" | "defence" | "olympiad" | "state-cet";

export interface EntranceGroup {
  key: EntranceGroupKey;
  label: string;
}

/** Display order of the groups on /exams/entrance. */
export const ENTRANCE_GROUPS: readonly EntranceGroup[] = [
  { key: "engineering", label: "Engineering" },
  { key: "medical", label: "Medical" },
  { key: "university", label: "University & design" },
  { key: "law", label: "Law" },
  { key: "management", label: "Management" },
  { key: "defence", label: "Defence (NDA)" },
  { key: "olympiad", label: "Olympiads" },
  { key: "state-cet", label: "State CETs" },
];

/** Which /exams/entrance group an exam belongs to; null for a government or
 *  professional exam (it is not listed there). */
export function entranceGroupOf(e: { code: string; category?: string | null }): EntranceGroupKey | null {
  if (STATE_CET_SET.has(e.code)) return "state-cet";
  if (ENTRANCE_EXCEPTION_CODES.includes(e.code)) return "defence";
  const cat = String(e.category ?? "").toUpperCase();
  if (cat === "ENGINEERING") return "engineering";
  if (cat === "MEDICAL") return "medical";
  if (cat === "UNIVERSITY") return "university";
  if (cat === "LAW") return "law";
  if (cat === "MBA") return "management";
  if (cat === "OLYMPIAD") return "olympiad";
  return null;
}
