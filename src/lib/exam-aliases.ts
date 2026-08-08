// Colloquial / vernacular / role-word → exam bridge.
//
// Founder rule (9 Aug 2026): search must work at the CONTEXTUAL level
// of the query reaching Shishya, not exact words. Google and LLMs
// already match semantically; this file gives our OWN tools the same
// power — an aspirant who types "daroga", "steno job", "fauj bharti"
// or "typing wali sarkari naukri" must land on the right exams even
// though no exam NAME contains those words.
//
// Keys are matched as substrings of the lowercased query/keyword.
// Values are exam-code prefixes/exact codes to surface (checked with
// startsWith so "POLICE_SI" catches TS/BR/UP variants) plus optional
// category hints. Deliberately curated, not exhaustive — extend as the
// Ask gap-log teaches us new words.

export interface AliasHit {
  /** Exam-code prefixes or exact codes to surface. */
  codes?: string[];
  /** Category filter to widen with. */
  category?: string;
  /** Free-text to ALSO try against exam names. */
  expand?: string[];
}

const ALIASES: Record<string, AliasHit> = {
  // ── Police / uniformed (Hindi + Telugu + colloquial) ──
  daroga: { expand: ["police si", "sub-inspector"], codes: ["TS_POLICE_SI", "BR_POLICE_SI", "UP_POLICE_SI", "TN_TNUSRB_SI"] },
  darogha: { expand: ["police si"], codes: ["TS_POLICE_SI", "BR_POLICE_SI", "UP_POLICE_SI"] },
  sipahi: { expand: ["constable", "police"] },
  सिपाही: { expand: ["constable", "police"] },
  दरोगा: { expand: ["police si", "sub-inspector"], codes: ["UP_POLICE_SI", "BR_POLICE_SI"] },
  constable: { expand: ["police"] },
  "sub inspector": { expand: ["police si"], codes: ["TS_POLICE_SI", "BR_POLICE_SI", "UP_POLICE_SI", "TN_TNUSRB_SI"] },
  si: { codes: ["TS_POLICE_SI", "BR_POLICE_SI", "UP_POLICE_SI", "TN_TNUSRB_SI"] },
  fauj: { expand: ["defence", "army"], codes: ["NDA", "CDS"] },
  army: { codes: ["NDA", "CDS"] },
  "agniveer": { codes: ["NDA", "CDS"], expand: ["defence"] },

  // ── Clerical / typing / steno ──
  steno: { codes: ["MP_MPESB", "SSC_CHSL"], expand: ["stenographer"] },
  stenographer: { codes: ["MP_MPESB", "SSC_CHSL"] },
  typist: { codes: ["SSC_CHSL", "MP_MPESB"], expand: ["clerk"] },
  typing: { codes: ["SSC_CHSL", "SSC_CGL", "RRB_NTPC"], expand: ["clerk"] },
  clerk: { expand: ["clerk", "chsl"], codes: ["IBPS_CLERK", "SBI_CLERK", "SSC_CHSL"] },
  babu: { expand: ["clerk"], codes: ["SSC_CHSL", "SSC_CGL"] },
  ldc: { codes: ["SSC_CHSL", "KL_KPSC_LDC"] },

  // ── Teaching ──
  teacher: { expand: ["tet", "teacher"], category: "TEACHING" },
  shikshak: { expand: ["tet"], category: "TEACHING" },
  शिक्षक: { expand: ["tet"], category: "TEACHING" },
  "टीचर": { expand: ["tet"], category: "TEACHING" },
  upadhyayudu: { expand: ["tet"], codes: ["AP_TET", "TS_TET"] },

  // ── Banking ──
  bank: { category: "BANKING" },
  "bank po": { codes: ["IBPS_PO", "SBI_PO"] },
  "bank clerk": { codes: ["IBPS_CLERK", "SBI_CLERK"] },

  // ── Railways ──
  railway: { codes: ["RRB_NTPC", "RRB_GROUP_D", "RRB_ALP"] },
  "rail": { codes: ["RRB_NTPC", "RRB_GROUP_D", "RRB_ALP"] },
  रेलवे: { codes: ["RRB_NTPC", "RRB_GROUP_D", "RRB_ALP"] },
  loco: { codes: ["RRB_ALP"] },

  // ── Civil services / officer words ──
  collector: { codes: ["UPSC_PRELIMS"], expand: ["civil services", "pcs", "kas"] },
  ias: { codes: ["UPSC_PRELIMS"] },
  ips: { codes: ["UPSC_PRELIMS"] },
  tehsildar: { expand: ["group 2", "pcs"] },
  deputy: { expand: ["group 1", "pcs", "kas"] },

  // ── Sub-group / granular MPESB ──
  "subgroup 4": { codes: ["MP_MPESB"] },
  "sub group 4": { codes: ["MP_MPESB"] },
  "group 2 sub": { codes: ["MP_MPESB"] },

  // ── Olympiads ──
  olympiad: { category: "OLYMPIAD" },
  physics: { codes: ["NSEP"], expand: ["physics"] },
  ioqm: { codes: ["IOQM"] },
  nsep: { codes: ["NSEP"] },

  // ── Aspirational phrases ──
  "sarkari naukri": { expand: ["govt"], category: "GOVT_JOBS" },
  "government job": { category: "GOVT_JOBS" },
};

export interface ExamLike {
  code: string;
  name: string;
  shortName: string;
  category?: string | null;
  state?: string | null;
}

/** Client-safe contextual filter for exam-picker search boxes: lexical
 *  match OR alias resolution ("daroga" → police SI exams). When the
 *  query has no literal hit, alias-code matches surface first as the
 *  most intentional; original order is otherwise preserved. */
export function contextualExamFilter<T extends ExamLike>(query: string, exams: T[]): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return exams;
  const alias = resolveAliases(needle);
  const codes = [...alias.codes];
  const expands = [...alias.expands].map((e) => e.toLowerCase());
  const lex: T[] = [];
  const byCode: T[] = [];
  const byMeaning: T[] = [];
  for (const e of exams) {
    const hay = `${e.name} ${e.shortName} ${e.code} ${e.category ?? ""} ${e.state ?? ""}`.toLowerCase();
    if (hay.includes(needle)) { lex.push(e); continue; }
    if (codes.some((c) => e.code.startsWith(c))) { byCode.push(e); continue; }
    if (expands.some((x) => hay.includes(x)) || (alias.category != null && e.category === alias.category)) {
      byMeaning.push(e);
    }
  }
  return [...lex, ...byCode, ...byMeaning];
}

/** Resolve a free-text keyword/query fragment to alias hits.
 *  Substring match over the lowercased input; longer keys win first so
 *  "bank po" beats "bank". */
export function resolveAliases(text: string): { codes: Set<string>; expands: Set<string>; category: string | null } {
  const q = ` ${text.toLowerCase().trim()} `;
  const codes = new Set<string>();
  const expands = new Set<string>();
  let category: string | null = null;
  const keys = Object.keys(ALIASES).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    // Word-boundary-ish containment: avoid "si" matching inside "basic".
    const needle = k.length <= 3 ? ` ${k} ` : k;
    if (!q.includes(needle)) continue;
    const hit = ALIASES[k];
    for (const c of hit.codes ?? []) codes.add(c);
    for (const e of hit.expand ?? []) expands.add(e);
    if (!category && hit.category) category = hit.category;
  }
  return { codes, expands, category };
}
