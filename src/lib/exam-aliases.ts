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

// ── State-name bridge ──
// The long tail rotates daily (PSSSB one day, Meghalaya PSC the next).
// A state's name — in English or its own script — must reach that
// state's exams even when the board's acronym never appears in the
// query. Keys are matched like alias keys (substring; ≤3 chars get
// word-boundary padding). Values are Exam.state codes.
const STATE_WORDS: Record<string, string> = {
  "andhra": "AP", "ఆంధ్ర": "AP",
  "arunachal": "AR",
  "assam": "AS", "অসম": "AS",
  "bihar": "BR", "बिहार": "BR",
  "chhattisgarh": "CG", "chattisgarh": "CG",
  "chandigarh": "CH",
  "delhi": "DL", "दिल्ली": "DL",
  "goa": "GA",
  "gujarat": "GJ", "ગુજરાત": "GJ",
  "himachal": "HP", "हिमाचल": "HP",
  "haryana": "HR", "हरियाणा": "HR",
  "jharkhand": "JH", "झारखंड": "JH",
  "kashmir": "JK", "jammu": "JK", "کشمیر": "JK",
  "karnataka": "KA", "ಕರ್ನಾಟಕ": "KA",
  "kerala": "KL", "കേരളം": "KL", "കേരള": "KL",
  "ladakh": "LA",
  "lakshadweep": "LD",
  "maharashtra": "MH", "महाराष्ट्र": "MH",
  "meghalaya": "ML",
  "manipur": "MN",
  "madhya pradesh": "MP", "मध्य प्रदेश": "MP",
  "mizoram": "MZ",
  "nagaland": "NL",
  "odisha": "OD", "orissa": "OD", "ଓଡ଼ିଶା": "OD",
  "punjab": "PB", "ਪੰਜਾਬ": "PB",
  "puducherry": "PY", "pondicherry": "PY",
  "rajasthan": "RJ", "राजस्थान": "RJ",
  "sikkim": "SK",
  "tamil nadu": "TN", "tamilnadu": "TN", "தமிழ்நாடு": "TN",
  "tripura": "TR",
  "telangana": "TS", "తెలంగాణ": "TS",
  "uttarakhand": "UK", "uttaranchal": "UK",
  "uttar pradesh": "UP", "उत्तर प्रदेश": "UP",
  "west bengal": "WB", "bengal": "WB", "পশ্চিমবঙ্গ": "WB",
  "andaman": "AN", "nicobar": "AN",
};

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

  // ── Native-script role words (pair with STATE_WORDS for "తెలంగాణ
  //    పోలీస్"-style queries) ──
  "पुलिस": { expand: ["police"] },
  "पोलीस": { expand: ["police"] },
  "పోలీస్": { expand: ["police"] },
  "పోలీసు": { expand: ["police"] },
  "போலீஸ்": { expand: ["police"] },
  "ಪೊಲೀಸ್": { expand: ["police"] },
  "পুলিশ": { expand: ["police"] },
  "ਪੁਲਿਸ": { expand: ["police"] },
  "પોલીસ": { expand: ["police"] },
  "టీచర్": { expand: ["tet"], category: "TEACHING" },
  "ஆசிரியர்": { expand: ["tet"], category: "TEACHING" },
  "ಶಿಕ್ಷಕ": { expand: ["tet"], category: "TEACHING" },
  "শিক্ষক": { expand: ["tet"], category: "TEACHING" },

  // ── Exam-name bridge (10 Sep 2026) ──
  // The official designation a notification uses, the board acronym
  // students read on it, the post name they actually search for, and
  // the state-script spelling. Added after a Telangana aspirant
  // searched "SCT PC" — the TSLPRB designation — found nothing, and
  // enrolled in TAMIL NADU Police Constable by mistake. Anything
  // already inside an exam name/code is deliberately absent: the
  // lexical pass in contextualExamFilter already covers it.

  appsc: { codes: ["AP_AMVI"] },

  dsp: { codes: ["AP_APPSC_GROUP1", "TS_TSPSC_GROUP1", "TN_TNPSC_GROUP1"] },
  "group 1": { codes: ["AP_APPSC_GROUP1", "TS_TSPSC_GROUP1", "TN_TNPSC_GROUP1"] },
  "గ్రూప్": { codes: ["AP_APPSC_GROUP1", "AP_APPSC_GROUP2", "AP_APPSC_GROUP3", "TS_TSPSC_GROUP1", "TS_TSPSC_GROUP2", "TS_TSPSC_GROUP3", "TS_TSPSC_GROUP4"] },

  "assistant section officer": { codes: ["AP_APPSC_GROUP2", "TS_TSPSC_GROUP2"] },
  "group 2": { codes: ["AP_APPSC_GROUP2", "TS_TSPSC_GROUP2", "TN_TNPSC_GROUP2"] },
  tahsildar: { codes: ["AP_APPSC_GROUP2", "TS_TSPSC_GROUP2"] },

  "group 3": { codes: ["AP_APPSC_GROUP3", "TS_TSPSC_GROUP3"] },

  apeamcet: { codes: ["AP_EAMCET"] },
  eapcet: { codes: ["AP_EAMCET", "TS_EAMCET"] },

  apicet: { codes: ["AP_ICET"] },

  aplawcet: { codes: ["AP_LAWCET"] },

  sct: { codes: ["AP_POLICE_PC", "TS_POLICE_PC", "TS_POLICE_SI"] },
  "sct pc": { codes: ["AP_POLICE_PC", "TS_POLICE_PC"] },
  stipendiary: { codes: ["AP_POLICE_PC", "TS_POLICE_PC", "TS_POLICE_SI"] },
  "కానిస్టేబుల్": { codes: ["AP_POLICE_PC", "TS_POLICE_PC"] },

  appolycet: { codes: ["AP_POLYCET"] },

  aptet: { codes: ["AP_TET"] },
  "ఉపాధ్యాయ": { codes: ["AP_TET", "TS_TET"] },

  appscce: { codes: ["AR_APPSC_AR"] },

  acs: { codes: ["AS_APSC_CCE"] },
  "assam civil service": { codes: ["AS_APSC_CCE"] },

  "bihar pcs": { codes: ["BR_BPSC_CCE"] },
  "bpsc pt": { codes: ["BR_BPSC_CCE"] },

  "bihar ssc": { codes: ["BR_BSSC_INTER"] },
  "इंटर स्तरीय": { codes: ["BR_BSSC_INTER"] },

  "bihar polytechnic": { codes: ["BR_DCECE"] },

  "chartered accountant": { codes: ["CA_FOUNDATION"] },

  iim: { codes: ["CAT"] },

  defense: { codes: ["CDS", "NDA"] },
  ima: { codes: ["CDS"] },
  "indian military academy": { codes: ["CDS"] },
  "officers training academy": { codes: ["CDS"] },
  ota: { codes: ["CDS"] },

  "cg psc": { codes: ["CG_CGPSC_SSE"] },

  "cg vyapam": { codes: ["CG_TET"] },
  cgtet: { codes: ["CG_TET"] },

  "chennai mathematical institute": { codes: ["CMI_ADMISSION"] },

  "company secretary": { codes: ["CS_FOUNDATION"] },
  "executive entrance test": { codes: ["CS_FOUNDATION"] },

  "central university": { codes: ["CUET_UG"] },
  cucet: { codes: ["CUET_UG"] },

  silvassa: { codes: ["DN_DDPSC"] },

  "m.tech": { codes: ["GATE_CSE"] },
  mtech: { codes: ["GATE_CSE"] },

  "class 1/2": { codes: ["GJ_GPSC_CLASS12"] },
  "gujarat administrative service": { codes: ["GJ_GPSC_CLASS12"] },
  mamlatdar: { codes: ["GJ_GPSC_CLASS12"] },

  "bin sachivalay": { codes: ["GJ_GSSSB"] },
  "gaun seva": { codes: ["GJ_GSSSB"] },
  "ગૌણ સેવા": { codes: ["GJ_GSSSB"] },
  "બિન સચિવાલય": { codes: ["GJ_GSSSB"] },

  "gujarat cet": { codes: ["GJ_GUJCET"] },

  "lok rakshak": { codes: ["GJ_POLICE_PC"] },
  lrd: { codes: ["GJ_POLICE_PC"] },
  "લોકરક્ષક": { codes: ["GJ_POLICE_PC"] },

  vidyasahayak: { codes: ["GJ_TET"] },

  "combined competitive": { codes: ["HP_HPAS", "JK_JKPSC_KAS"] },
  "himachal administrative": { codes: ["HP_HPAS"] },
  "himachal pcs": { codes: ["HP_HPAS"] },
  "hp pcs": { codes: ["HP_HPAS"] },

  hamirpur: { codes: ["HP_HPSSSB"] },
  hprca: { codes: ["HP_HPSSSB"] },
  hpssc: { codes: ["HP_HPSSSB"] },
  "joa it": { codes: ["HP_HPSSSB"] },
  "rajya chayan": { codes: ["HP_HPSSSB"] },

  hptsb: { codes: ["HP_POLYTECHNIC"] },

  hpbose: { codes: ["HP_TET"] },
  hptet: { codes: ["HP_TET"] },

  "haryana pcs": { codes: ["HR_HCS"] },
  hpsc: { codes: ["HR_HCS"] },

  "haryana cet": { codes: ["HR_HSSC_CET"] },
  "haryana group c": { codes: ["HR_HSSC_CET"] },
  "haryana group d": { codes: ["HR_HSSC_CET"] },

  bseh: { codes: ["HR_TET"] },

  "management trainee": { codes: ["IBPS_PO"] },
  "बैंक": { codes: ["IBPS_PO", "IBPS_CLERK", "IBPS_RRB", "SBI_PO", "SBI_CLERK", "RBI_GRADE_B"] },

  "gramin bank": { codes: ["IBPS_RRB"] },
  "ग्रामीण बैंक": { codes: ["IBPS_RRB"] },

  hbcse: { codes: ["IOQM", "NSEA", "NSEB", "NSEC", "NSEJS", "NSEP"] },
  "math olympiad": { codes: ["IOQM", "SOF_IMO", "SZF_IOM"] },
  "maths olympiad": { codes: ["IOQM", "SOF_IMO", "SZF_IOM"] },
  prmo: { codes: ["IOQM"] },
  rmo: { codes: ["IOQM"] },

  "indian statistical institute": { codes: ["ISI_BSTAT"] },

  iit: { codes: ["JEE_ADVANCED", "JEE_MAIN"] },
  iitjee: { codes: ["JEE_ADVANCED", "JEE_MAIN"] },

  "jee mains": { codes: ["JEE_MAIN"] },

  "jharkhand pcs": { codes: ["JH_JPSC_CCE"] },
  "jpsc pt": { codes: ["JH_JPSC_CCE"] },

  bopee: { codes: ["JK_JKCET"] },

  jkas: { codes: ["JK_JKPSC_KAS"] },
  "kashmir administrative": { codes: ["JK_JKPSC_KAS"] },

  jkbose: { codes: ["JK_KASHMIR_TET"] },

  "uni gauge": { codes: ["KA_COMEDK"] },
  unigauge: { codes: ["KA_COMEDK"] },

  ugcet: { codes: ["KA_KCET"] },

  "gazetted probationer": { codes: ["KA_KPSC_KAS"] },

  // KSRP (15 Sep 2026): "ksrp" was a search miss on 12 Sep. SRPC is the
  // notification's own designation; KSISF posts share the Kalyana Karnataka test.
  ksrp: { codes: ["KA_KSRP"] },
  srpc: { codes: ["KA_KSRP"] },
  "special reserve police": { codes: ["KA_KSRP"] },
  ksisf: { codes: ["KA_KSRP"] },

  "10th level": { codes: ["KL_KPSC_LDC"] },

  "law school admission test": { codes: ["LSAT_INDIA"] },

  "law cet": { codes: ["MH_MAHCET_LAW"] },
  llb: { codes: ["MH_MAHCET_LAW"] },
  "mah cet": { codes: ["MH_MAHCET_LAW", "MH_MAHCET_MBA"] },

  "mh cet": { codes: ["MH_MHTCET", "MH_MAHCET_LAW", "MH_MAHCET_MBA"] },
  mhcet: { codes: ["MH_MHTCET", "MH_MAHCET_LAW", "MH_MAHCET_MBA"] },

  "kar sahayak": { codes: ["MH_MPSC_GROUP_C"] },
  tanklekhak: { codes: ["MH_MPSC_GROUP_C"] },
  "गट-क": { codes: ["MH_MPSC_GROUP_C"] },

  "rajya seva": { codes: ["MH_MPSC_RAJYASEVA", "MP_MPPSC_SSE", "CG_CGPSC_SSE"] },
  "एमपीएससी": { codes: ["MH_MPSC_RAJYASEVA", "MH_MPSC_GROUP_C"] },
  "राज्यसेवा": { codes: ["MH_MPSC_RAJYASEVA"] },

  "bsc nursing": { codes: ["MH_NURSING_CET"] },

  srpf: { codes: ["MH_POLICE_BHARTI"] },
  "पोलीस भरती": { codes: ["MH_POLICE_BHARTI"] },
  "पोलीस शिपाई": { codes: ["MH_POLICE_BHARTI"] },

  "mp vyapam": { codes: ["MP_MPESB", "MP_POLICE_PC"] },
  mppeb: { codes: ["MP_MPESB", "MP_POLICE_PC"] },
  vyapam: { codes: ["MP_MPESB", "MP_POLICE_PC", "CG_TET"] },

  "mp psc": { codes: ["MP_MPPSC_SSE"] },
  "राज्य सेवा": { codes: ["MP_MPPSC_SSE", "CG_CGPSC_SSE", "MH_MPSC_RAJYASEVA"] },

  arakshak: { codes: ["MP_POLICE_PC"] },
  "आरक्षक": { codes: ["MP_POLICE_PC"] },

  // MP RAEO (15 Sep 2026): a student searched "mpreao", "reao", "mpre" on
  // 11 Sep and found nothing. The 2026 post is Krishi Vistar Adhikari.
  raeo: { codes: ["MP_RAEO"] },
  reao: { codes: ["MP_RAEO"] },
  mpraeo: { codes: ["MP_RAEO"] },
  mpreao: { codes: ["MP_RAEO"] },
  "krishi vistar": { codes: ["MP_RAEO"] },
  "कृषि विस्तार": { codes: ["MP_RAEO"] },

  mptet: { codes: ["MP_TET"] },
  "samvida shikshak": { codes: ["MP_TET"] },
  "varg 2": { codes: ["MP_TET"] },
  "varg 3": { codes: ["MP_TET"] },

  "b.arch": { codes: ["NATA"] },
  barch: { codes: ["NATA"] },

  "air force": { codes: ["NDA", "CDS"] },
  airforce: { codes: ["NDA", "CDS"] },
  navy: { codes: ["NDA", "CDS"] },
  "ssb interview": { codes: ["NDA", "CDS"] },
  "सेना": { codes: ["NDA", "CDS"] },

  bds: { codes: ["NEET_UG"] },
  mbbs: { codes: ["NEET_UG"] },
  "medical entrance": { codes: ["NEET_UG", "NEET_PG"] },

  "national institute of design": { codes: ["NID_DAT"] },

  fashion: { codes: ["NIFT"] },
  "national institute of fashion technology": { codes: ["NIFT"] },

  "astronomy olympiad": { codes: ["NSEA"] },
  iapt: { codes: ["NSEA", "NSEB", "NSEC", "NSEJS", "NSEP"] },

  "biology olympiad": { codes: ["NSEB"] },

  "chemistry olympiad": { codes: ["NSEC"] },

  "junior science olympiad": { codes: ["NSEJS"] },

  "unified council": { codes: ["NSTSE"] },

  "ପୋଲିସ": { codes: ["OD_POLICE_PC"] },

  "ଶିକ୍ଷକ": { codes: ["OD_TET"] },

  ppsc: { codes: ["PB_PCS"] },

  pseb: { codes: ["PB_TET"] },

  plo: { codes: ["PRIL"] },

  "reserve bank": { codes: ["RBI_GRADE_B"] },

  "rajasthan tet": { codes: ["RJ_REET"] },

  patwari: { codes: ["RJ_RSMSSB", "PB_PSSSB"] },
  "rajasthan cet": { codes: ["RJ_RSMSSB"] },
  "rajasthan staff selection": { codes: ["RJ_RSMSSB"] },
  rssb: { codes: ["RJ_RSMSSB"] },
  "पटवारी": { codes: ["RJ_RSMSSB", "PB_PSSSB"] },

  "train driver": { codes: ["RRB_ALP"] },

  khalasi: { codes: ["RRB_GROUP_D"] },
  pointsman: { codes: ["RRB_GROUP_D"] },
  "track maintainer": { codes: ["RRB_GROUP_D"] },
  trackman: { codes: ["RRB_GROUP_D"] },

  asm: { codes: ["RRB_NTPC"] },
  "goods guard": { codes: ["RRB_NTPC"] },
  "non technical popular": { codes: ["RRB_NTPC"] },
  "station master": { codes: ["RRB_NTPC"] },
  "ticket collector": { codes: ["RRB_NTPC"] },
  "train manager": { codes: ["RRB_NTPC"] },
  "రైల్వే": { codes: ["RRB_NTPC", "RRB_GROUP_D", "RRB_ALP"] },

  "junior associate": { codes: ["SBI_CLERK"] },
  "state bank": { codes: ["SBI_CLERK", "SBI_PO"] },

  "science olympiad foundation": { codes: ["SOF_"] },

  "english olympiad": { codes: ["SOF_IEO", "SZF_IOEL"] },

  "gk olympiad": { codes: ["SOF_IGKO"] },

  "science olympiad": { codes: ["SOF_NSO", "SZF_IOS"] },

  "assistant audit officer": { codes: ["SSC_CGL"] },
  cbi: { codes: ["SSC_CGL"] },
  cgle: { codes: ["SSC_CGL"] },
  "excise inspector": { codes: ["SSC_CGL"] },
  "income tax": { codes: ["SSC_CGL"] },
  "एसएससी": { codes: ["SSC_CGL", "SSC_CHSL", "SSC_GD", "SSC_MTS"] },

  "10+2": { codes: ["SSC_CHSL"] },
  chsle: { codes: ["SSC_CHSL"] },
  "data entry operator": { codes: ["SSC_CHSL"] },
  deo: { codes: ["SSC_CHSL"] },
  "postal assistant": { codes: ["SSC_CHSL"] },

  "assam rifles": { codes: ["SSC_GD"] },
  bsf: { codes: ["SSC_GD"] },
  capf: { codes: ["SSC_GD"] },
  cisf: { codes: ["SSC_GD"] },
  crpf: { codes: ["SSC_GD"] },
  "gd constable": { codes: ["SSC_GD"] },
  itbp: { codes: ["SSC_GD"] },
  paramilitary: { codes: ["SSC_GD"] },
  "sashastra seema bal": { codes: ["SSC_GD"] },

  chaprasi: { codes: ["SSC_MTS"] },
  havaldar: { codes: ["SSC_MTS"] },
  havildar: { codes: ["SSC_MTS"] },
  peon: { codes: ["SSC_MTS"] },

  "silver zone": { codes: ["SZF_"] },

  "grade 2 police": { codes: ["TN_POLICE_PC"] },
  "காவலர்": { codes: ["TN_POLICE_PC"] },

  tntet: { codes: ["TN_TET"] },
  trb: { codes: ["TN_TET"] },

  ccse: { codes: ["TN_TNPSC_GROUP1", "TN_TNPSC_GROUP2", "TN_TNPSC_GROUP4"] },

  "group 2a": { codes: ["TN_TNPSC_GROUP2"] },

  vao: { codes: ["TN_TNPSC_GROUP4"] },
  "village administrative officer": { codes: ["TN_TNPSC_GROUP4"] },

  tgeamcet: { codes: ["TS_EAMCET"] },
  tseamcet: { codes: ["TS_EAMCET"] },

  tgicet: { codes: ["TS_ICET"] },
  tsicet: { codes: ["TS_ICET"] },

  tglawcet: { codes: ["TS_LAWCET"] },
  tslawcet: { codes: ["TS_LAWCET"] },

  tglprb: { codes: ["TS_POLICE_PC", "TS_POLICE_SI"] },

  "sct si": { codes: ["TS_POLICE_SI"] },
  tslprb: { codes: ["TS_POLICE_SI"] },

  tgpolycet: { codes: ["TS_POLYCET"] },
  tspolycet: { codes: ["TS_POLYCET"] },

  tgtet: { codes: ["TS_TET"] },
  tstet: { codes: ["TS_TET"] },

  tgpsc: { codes: ["TS_TSPSC_GROUP1", "TS_TSPSC_GROUP2", "TS_TSPSC_GROUP3", "TS_TSPSC_GROUP4"] },

  "group 4": { codes: ["TS_TSPSC_GROUP4", "TN_TNPSC_GROUP4"] },
  "junior assistant": { codes: ["TS_TSPSC_GROUP4", "TN_TNPSC_GROUP4"] },

  "b.des": { codes: ["UCEED", "NID_DAT", "NIFT"] },
  bdes: { codes: ["UCEED", "NID_DAT", "NIFT"] },

  ubter: { codes: ["UK_POLYTECHNIC"] },

  ubse: { codes: ["UK_TET"] },

  ukpcs: { codes: ["UK_UKPSC_PCS"] },
  "uttarakhand pcs": { codes: ["UK_UKPSC_PCS"] },

  ukssc: { codes: ["UK_UKSSSC"] },
  "uttarakhand group c": { codes: ["UK_UKSSSC"] },

  "up polytechnic": { codes: ["UP_JEECUP"] },

  arakshi: { codes: ["UP_POLICE_CONSTABLE"] },
  upprpb: { codes: ["UP_POLICE_CONSTABLE", "UP_POLICE_SI"] },
  "आरक्षी": { codes: ["UP_POLICE_CONSTABLE"] },

  upsi: { codes: ["UP_POLICE_SI"] },

  upsee: { codes: ["UP_UPCET"] },

  "up pcs": { codes: ["UP_UPPSC_PCS"] },
  uppcs: { codes: ["UP_UPPSC_PCS"] },

  "assistant review officer": { codes: ["UP_UPPSC_RO_ARO"] },
  "ro aro": { codes: ["UP_UPPSC_RO_ARO"] },
  samiksha: { codes: ["UP_UPPSC_RO_ARO"] },
  "समीक्षा अधिकारी": { codes: ["UP_UPPSC_RO_ARO"] },

  "gram panchayat adhikari": { codes: ["UP_UPSSSC_PET"] },
  lekhpal: { codes: ["UP_UPSSSC_PET"] },
  "up pet": { codes: ["UP_UPSSSC_PET"] },
  "लेखपाल": { codes: ["UP_UPSSSC_PET"] },

  "up tet": { codes: ["UP_UPTET"] },
  upbeb: { codes: ["UP_UPTET"] },

  csat: { codes: ["UPSC_PRELIMS"] },
  irs: { codes: ["UPSC_PRELIMS"] },
  "upsc cse": { codes: ["UPSC_PRELIMS"] },

  wbprb: { codes: ["WB_POLICE_PC"] },

  wbbpe: { codes: ["WB_TET"] },
  wbtet: { codes: ["WB_TET"] },

  "wbcs executive": { codes: ["WB_WBCS"] },

  "computing olympiad": { codes: ["ZIO"] },
  iarcs: { codes: ["ZIO"] },
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
  const roleHit = new Set<string>();
  for (const e of exams) {
    const hay = `${e.name} ${e.shortName} ${e.code} ${e.category ?? ""} ${e.state ?? ""}`.toLowerCase();
    const role =
      codes.some((c) => e.code.startsWith(c)) ||
      expands.some((x) => hay.includes(x)) ||
      (alias.category != null && e.category === alias.category);
    if (role) roleHit.add(e.code);
    if (hay.includes(needle)) { lex.push(e); continue; }
    if (codes.some((c) => e.code.startsWith(c))) { byCode.push(e); continue; }
    if (role || (alias.state != null && e.state === alias.state)) byMeaning.push(e);
  }
  const ordered = [...lex, ...byCode, ...byMeaning];
  // A state in the query is the strongest intent signal: that state's
  // exams lead ("kashmir teacher" → JK TET before CTET), and within
  // the state, exams that ALSO match the role word come first
  // ("తెలంగాణ పోలీస్" → TS Police above TS EAMCET).
  if (alias.state != null) {
    const inState = ordered.filter((e) => e.state === alias.state);
    return [
      ...inState.filter((e) => roleHit.has(e.code)),
      ...inState.filter((e) => !roleHit.has(e.code)),
      ...ordered.filter((e) => e.state !== alias.state),
    ];
  }
  return ordered;
}

/** Resolve a free-text keyword/query fragment to alias hits.
 *  Substring match over the lowercased input; longer keys win first so
 *  "bank po" beats "bank". */
export function resolveAliases(text: string): { codes: Set<string>; expands: Set<string>; category: string | null; state: string | null } {
  const q = ` ${text.toLowerCase().trim()} `;
  const codes = new Set<string>();
  const expands = new Set<string>();
  let category: string | null = null;
  let state: string | null = null;
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
  for (const w of Object.keys(STATE_WORDS)) {
    const needle = w.length <= 3 ? ` ${w} ` : w;
    if (q.includes(needle)) { state = STATE_WORDS[w]; break; }
  }
  return { codes, expands, category, state };
}
