// Curated exam tags. An exam can carry multiple tags (e.g. JEE Main is
// both "engineering" and "popular"; SBI PO is "banking", "national",
// "popular", "govt"). The homepage chip row filters by tag membership,
// not by enum category — that lets students browse the way they think
// ("show me popular exams", "show me state govt exams") rather than how
// our DB schema happens to slice things.
//
// Single source of truth: this file. ExamPicker just renders chips.

export type ExamTag =
  | "popular"        // very high candidate volume (≥ 1M / year)
  | "national"       // non-state, central conducting body
  | "state"          // STATE_LEVEL — triggers the state-picker flow
  | "govt"           // any government recruitment / civil-service / police
  | "engineering"    // JEE / GATE + state CETs (MHT-CET, KCET, ...)
  | "medical"        // NEET + state nursing
  | "teaching"       // CTET + all state TETs
  | "banking"        // IBPS, SBI
  | "olympiad"       // HBCSE / SOF / Silverzone / NSTSE / ZIO / PRIL
  | "civil_services" // UPSC + state PSC civil-service streams
  | "mba"            // CAT + state ICET / MBA-CET
  | "law"            // CLAT + state LAWCET / MH-CET Law
  | "police"         // state police constable / SI
  | "university"     // CUET
  | "polytechnic"    // state polytechnic entrance
  | "defence";       // NDA / CDS / Agniveer

/** Order matters — chips render in this order. Most-used filters first. */
export const TAG_ORDER: ExamTag[] = [
  "popular",
  "national",
  "state",
  "govt",
  "engineering",
  "medical",
  "teaching",
  "banking",
  "olympiad",
  "civil_services",
  "mba",
  "law",
  "police",
  "university",
  "polytechnic",
  "defence",
];

interface ExamForTagging {
  code: string;
  category: string;
  state?: string | null;
  candidatesPerYear?: number | null;
}

/**
 * Compute the curated tag list for an exam from its category + code.
 * The code is used to refine state-level entries since STATE_LEVEL covers
 * very different exam types (PSC vs Police vs TET vs Engineering).
 */
export function computeExamTags(exam: ExamForTagging): ExamTag[] {
  const tags = new Set<ExamTag>();
  const cat = exam.category;
  const code = exam.code;

  // ── Popular ─────────────────────────────────────────────────────────
  if ((exam.candidatesPerYear ?? 0) >= 1_000_000) tags.add("popular");

  // ── National vs State ────────────────────────────────────────────────
  if (cat === "STATE_LEVEL") tags.add("state");
  else tags.add("national");

  // ── Code-suffix matchers (used multiple places below) ────────────────
  const isStateEngineering =
    /(_EAMCET|_KCET|_KEAM|_MHTCET|_WBJEE|_COMEDK|_GUJCET|_BCECE|_OJEE|_JKCET|_PUNJABCET|_REAP|_ASSAMCEE|_UPCET)$/.test(code);
  const isStatePolytechnic =
    /(_JEECUP|_POLYCET|_JEEP|_POLYTECHNIC|_PAT|_DCECE)$/.test(code);
  const isStateMedicalNursing = /(_NURSING_CET|_DCECE)$/.test(code);
  const isStateLaw = /(_LAW|_LAWCET)$/.test(code);
  const isStateMba = /(_MBA|_ICET)$/.test(code);
  const isStateTet =
    /(_TET|_TGT|_KASHMIR_TET|_MAHATET|_UPTET|_REET|_KARTET|_KTET)$/.test(code);
  const isStatePolice =
    /(POLICE_PC|POLICE_SI|POLICE_BHARTI|TNUSRB|BPSSC|ANIIPS)/.test(code);
  const isStatePscCivil =
    /(_PSC|_PCS|_KAS|_RAS|_OAS|_HCS|_HPAS|_CCE|_SSE|_RAJYASEVA|_PPSC|_LPSC|_GROUP1|_GROUP2|_GROUP3|_GROUP4|_GROUP_C|_LDC|_CLASS12|_RO_ARO|_DSSSB_TGT|_PET|_CLERKSHIP|_NPSC|_TPSC|_SPSC|_APPSC_AR|_LAKSHADWEEP|_DDPSC|_DSSSB|_HSSC_CET|_BSSC_INTER|_RSMSSB|_PSSSB|_JKSSB|_UKSSSC|_HPSSSB|_MPESB|_GSSSB|_CHANDIGARH_PCS|_MPSC_GROUP_C|_KPSC_GROUP_C)/.test(code);

  // ── Govt umbrella ────────────────────────────────────────────────────
  // National: GOVT_JOBS, BANKING, CIVIL_SERVICES are all government roles.
  if (["GOVT_JOBS", "BANKING", "CIVIL_SERVICES"].includes(cat)) tags.add("govt");
  // State: PSCs, Police, SSCs are govt; State engineering / medical /
  // polytechnic / law / MBA are NOT govt-job exams (they're admission tests).
  if (
    cat === "STATE_LEVEL" &&
    !(isStateEngineering || isStatePolytechnic || isStateMedicalNursing || isStateLaw || isStateMba)
  ) {
    tags.add("govt");
  }

  // ── Subject-area tags (cross-cut national + state) ───────────────────
  if (cat === "ENGINEERING" || isStateEngineering) tags.add("engineering");
  if (cat === "MEDICAL" || isStateMedicalNursing) tags.add("medical");
  if (cat === "TEACHING" || isStateTet) tags.add("teaching");
  if (cat === "BANKING") tags.add("banking");
  if (cat === "OLYMPIAD") tags.add("olympiad");
  if (cat === "MBA" || isStateMba) tags.add("mba");
  if (cat === "LAW" || isStateLaw) tags.add("law");
  if (cat === "UNIVERSITY") tags.add("university");
  if (isStatePolytechnic) tags.add("polytechnic");
  if (isStatePolice) tags.add("police");

  // Civil services umbrella: UPSC + every state PSC civil-service stream.
  if (cat === "CIVIL_SERVICES" || (cat === "STATE_LEVEL" && isStatePscCivil)) {
    tags.add("civil_services");
  }

  // Defence: NDA, CDS (currently classified as GOVT_JOBS for category).
  if (/^(NDA|CDS|AGNIVEER)$/.test(code)) tags.add("defence");

  return [...tags];
}
