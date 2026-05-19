// Government job catalogue — major recurring central + state recruitment.
// Each entry is the recruiting body + role + cadence + how to track + entry exam.
//
// We do NOT aggregate live notifications (changing daily; better done by
// official portals + RSS aggregators). We DO surface the recurring
// recruitments students should know exist + how to track them.

export interface GovtJobCategory {
  slug: string;
  label: string;
}

export const GOVT_JOB_CATEGORIES: GovtJobCategory[] = [
  { slug: "central-pcs",        label: "Central Govt — IAS/IPS/IFS + Group A/B" },
  { slug: "state-pcs",          label: "State Civil Services + State Govt" },
  { slug: "banking",            label: "Banking + Insurance" },
  { slug: "railway",            label: "Railway Recruitment" },
  { slug: "ssc-cgl-chsl-mts",   label: "SSC — CGL, CHSL, MTS, GD, Stenographer" },
  { slug: "defence",            label: "Defence + Paramilitary" },
  { slug: "psu-engineer",       label: "PSU Engineering (via GATE)" },
  { slug: "teaching",           label: "Teaching — CTET, KVS, NVS, State TETs" },
  { slug: "judicial",           label: "Judicial Services" },
  { slug: "rbi-sebi-nabard",    label: "Regulatory Bodies — RBI, SEBI, NABARD, IRDAI" },
];

export interface GovtJobOpening {
  slug: string;
  /** Display name */
  name: string;
  /** Recruiting body (e.g., UPSC, SSC, IBPS, RRB). */
  body: string;
  /** Category for grouping. */
  category: string;
  /** Recruitment cadence — yearly / twice yearly / on-demand. */
  cadence: string;
  /** Typical vacancies per cycle (rough number). */
  typicalVacancies: string;
  /** Eligibility prose. */
  eligibility: string;
  /** Typical exam pattern + selection stages. */
  pattern: string;
  /** Salary band at joining. */
  startingSalary: string;
  /** Official portal URL (no aggregator links). */
  officialPortal: string;
  /** Relevant exam code in our /exams catalogue, if any. */
  examCode?: string;
  /** Related career slug in /careers, if any. */
  careerSlug?: string;
  /** One-liner blurb. */
  dek: string;
}

export const GOVT_JOBS: GovtJobOpening[] = [
  // ── Central Govt ─────────────────────────────────────────────────
  {
    slug: "upsc-civil-services",
    name: "UPSC Civil Services Examination (CSE)",
    body: "Union Public Service Commission",
    category: "central-pcs",
    cadence: "Annual — Notification Feb, Prelims May, Mains Sep, Interview Mar",
    typicalVacancies: "~1000 (IAS ~180, IPS ~200, IFS ~30, IRS + Group B services ~600)",
    eligibility: "Bachelor's degree, age 21-32 (Gen; relaxations 35 OBC, 37 SC/ST, 40+ PwD), Indian citizen for IAS/IPS",
    pattern: "Prelims (objective, 1 day) → Mains (9 papers over 5-6 days) → Interview (personality test ~30 min)",
    startingSalary: "₹56,100 base + DA + HRA = ~₹8-12 LPA inc. perks (housing, vehicle, staff)",
    officialPortal: "https://www.upsc.gov.in/",
    examCode: "UPSC_PRELIMS",
    careerSlug: "ias-officer",
    dek: "The IAS / IPS / IFS / IRS gateway. 10-12 lakh applicants for ~1000 vacancies.",
  },
  {
    slug: "upsc-ese-engineering",
    name: "UPSC Engineering Services (ESE / IES)",
    body: "Union Public Service Commission",
    category: "central-pcs",
    cadence: "Annual — typically Feb notification, exam June",
    typicalVacancies: "~500 (Civil + Mech + Elec + E&T combined)",
    eligibility: "BTech / BE in Civil / Mech / Elec / E&T, age 21-30",
    pattern: "Prelims (objective) → Mains (conventional) → Interview",
    startingSalary: "~₹56,100 base + DA + HRA (Group A officer scale)",
    officialPortal: "https://www.upsc.gov.in/",
    careerSlug: "psu-engineer",
    dek: "Group A engineering officer in CPWD, Railways, MES, BRO, Indian Naval Armament Service, etc.",
  },
  {
    slug: "ssc-cgl",
    name: "SSC CGL — Combined Graduate Level",
    body: "Staff Selection Commission",
    category: "ssc-cgl-chsl-mts",
    cadence: "Annual",
    typicalVacancies: "~17,000 (Group B + C posts across central ministries)",
    eligibility: "Bachelor's degree, age 18-30 (post-specific)",
    pattern: "Tier 1 (objective) → Tier 2 (objective) → Tier 3 (descriptive) → Skill/CPT",
    startingSalary: "₹4-7 LPA (post-specific Level 4-7)",
    officialPortal: "https://ssc.gov.in/",
    examCode: "SSC_CGL",
    dek: "Income Tax Inspector, Assistant Audit Officer, Excise Inspector, Asst Section Officer in CSS etc. ~30L applicants/year.",
  },
  {
    slug: "ssc-chsl",
    name: "SSC CHSL — 10+2 Level",
    body: "Staff Selection Commission",
    category: "ssc-cgl-chsl-mts",
    cadence: "Annual",
    typicalVacancies: "~5,000 (LDC, JSA, DEO posts)",
    eligibility: "Class 12 pass, age 18-27",
    pattern: "Tier 1 (objective) → Tier 2 (descriptive + skill)",
    startingSalary: "₹3-5 LPA (Level 2-4)",
    officialPortal: "https://ssc.gov.in/",
    examCode: "SSC_CHSL",
    dek: "Lower Division Clerk, Junior Secretariat Assistant, Data Entry Operator in central ministries.",
  },
  {
    slug: "ssc-gd",
    name: "SSC GD Constable",
    body: "Staff Selection Commission",
    category: "defence",
    cadence: "Annual",
    typicalVacancies: "~50,000 (CRPF, BSF, CISF, ITBP, SSB, NIA, SSF)",
    eligibility: "Class 10 pass, age 18-23, physical standards",
    pattern: "CBT → PET/PST (physical) → Medical",
    startingSalary: "₹3-4 LPA (Pay Level 3)",
    officialPortal: "https://ssc.gov.in/",
    examCode: "SSC_GD",
    careerSlug: "police-constable",
    dek: "Constable in central paramilitary forces. Largest annual govt recruitment by volume.",
  },
  {
    slug: "ssc-mts",
    name: "SSC MTS + Havaldar (CBIC/CBN)",
    body: "Staff Selection Commission",
    category: "ssc-cgl-chsl-mts",
    cadence: "Annual",
    typicalVacancies: "~7,000",
    eligibility: "Class 10 pass, age 18-25",
    pattern: "CBT → PET (for Havaldar) → Document verification",
    startingSalary: "₹2.5-4 LPA (Level 1)",
    officialPortal: "https://ssc.gov.in/",
    examCode: "SSC_MTS",
    dek: "Multi-Tasking Staff in ministries + departments. Lowest qualification entry into central govt.",
  },

  // ── Banking ────────────────────────────────────────────────────────
  {
    slug: "ibps-po",
    name: "IBPS PO — Probationary Officer",
    body: "Institute of Banking Personnel Selection",
    category: "banking",
    cadence: "Annual",
    typicalVacancies: "~4,000 (across 11 PSU banks)",
    eligibility: "Bachelor's degree, age 20-30",
    pattern: "Prelims → Mains → Interview",
    startingSalary: "₹6-8 LPA (Scale-I officer)",
    officialPortal: "https://www.ibps.in/",
    examCode: "IBPS_PO",
    careerSlug: "bank-po",
    dek: "Officer scale-I entry into PNB, BoB, Canara, Indian Bank, Union Bank etc.",
  },
  {
    slug: "sbi-po",
    name: "SBI PO — Probationary Officer",
    body: "State Bank of India",
    category: "banking",
    cadence: "Annual",
    typicalVacancies: "~2,000",
    eligibility: "Bachelor's degree, age 21-30",
    pattern: "Prelims → Mains → Group Exercise + Interview",
    startingSalary: "₹7-9 LPA (Scale-I, SBI slightly higher than IBPS)",
    officialPortal: "https://sbi.co.in/web/careers",
    examCode: "SBI_PO",
    careerSlug: "bank-po",
    dek: "Officer entry into India's largest bank. Slightly higher pay + posting flexibility than IBPS PO.",
  },
  {
    slug: "ibps-clerk",
    name: "IBPS Clerk",
    body: "Institute of Banking Personnel Selection",
    category: "banking",
    cadence: "Annual",
    typicalVacancies: "~6,000",
    eligibility: "Bachelor's degree, age 20-28",
    pattern: "Prelims → Mains",
    startingSalary: "₹2.5-3.5 LPA",
    officialPortal: "https://www.ibps.in/",
    examCode: "IBPS_CLERK",
    dek: "Clerical cadre in PSU banks. Promotion to officer possible via internal exam after 2 years.",
  },
  {
    slug: "sbi-clerk",
    name: "SBI Clerk (Junior Associate)",
    body: "State Bank of India",
    category: "banking",
    cadence: "Annual",
    typicalVacancies: "~8,000",
    eligibility: "Bachelor's degree, age 20-28",
    pattern: "Prelims → Mains",
    startingSalary: "₹2.5-3.5 LPA",
    officialPortal: "https://sbi.co.in/web/careers",
    examCode: "SBI_CLERK",
    dek: "Largest bank, largest clerical recruitment in India.",
  },

  // ── RBI / SEBI / Regulatory ────────────────────────────────────────
  {
    slug: "rbi-grade-b",
    name: "RBI Grade B Officer",
    body: "Reserve Bank of India",
    category: "rbi-sebi-nabard",
    cadence: "Annual",
    typicalVacancies: "~250",
    eligibility: "Bachelor's with 60% (50% SC/ST/PwD), age 21-30",
    pattern: "Phase 1 (objective) → Phase 2 (English + Economics + Finance + Statistics descriptive) → Interview",
    startingSalary: "₹13-16 LPA inc. allowances",
    officialPortal: "https://opportunities.rbi.org.in/",
    dek: "India's central bank. Strong compensation + career path; intensely competitive (~3 lakh applicants).",
  },
  {
    slug: "sebi-grade-a",
    name: "SEBI Grade A Officer",
    body: "Securities and Exchange Board of India",
    category: "rbi-sebi-nabard",
    cadence: "Annual",
    typicalVacancies: "~100",
    eligibility: "Bachelor's degree, age 21-30 (Gen)",
    pattern: "Phase 1 (objective) → Phase 2 (descriptive) → Interview",
    startingSalary: "₹15-18 LPA inc. allowances",
    officialPortal: "https://www.sebi.gov.in/careers.html",
    dek: "Securities + financial markets regulator. Among most prestigious regulatory roles.",
  },
  {
    slug: "nabard-grade-a",
    name: "NABARD Grade A Officer",
    body: "National Bank for Agriculture and Rural Development",
    category: "rbi-sebi-nabard",
    cadence: "Annual",
    typicalVacancies: "~150",
    eligibility: "Bachelor's degree (Agri + Allied for some posts), age 21-30",
    pattern: "Prelims → Mains → Interview",
    startingSalary: "₹13-16 LPA inc. allowances",
    officialPortal: "https://www.nabard.org/",
    dek: "Rural + agri development banking apex. Strong career path with good work-life balance reputation.",
  },

  // ── Railway ────────────────────────────────────────────────────────
  {
    slug: "rrb-ntpc",
    name: "RRB NTPC — Non-Technical Popular Categories",
    body: "Railway Recruitment Board",
    category: "railway",
    cadence: "Irregular (2018, 2021, 2024 cycles)",
    typicalVacancies: "~10,000-35,000 per cycle",
    eligibility: "Class 12 (some posts) or Graduate, age varies by post",
    pattern: "CBT-1 → CBT-2 → Skill / Aptitude (post-dependent) → Medical",
    startingSalary: "₹3-7 LPA (Level 2-6)",
    officialPortal: "https://www.rrbcdg.gov.in/",
    examCode: "RRB_NTPC",
    dek: "Station Master, Goods Guard, Junior Clerk, Senior Clerk, Junior Account Asst etc.",
  },
  {
    slug: "rrb-group-d",
    name: "RRB Group D — Level 1",
    body: "Railway Recruitment Board",
    category: "railway",
    cadence: "Irregular (2018, 2022 cycles; 2024 cycle ongoing)",
    typicalVacancies: "~1,00,000+ per cycle",
    eligibility: "Class 10 + ITI (for some posts), age 18-33",
    pattern: "CBT → PET (physical) → Medical",
    startingSalary: "₹2.5-3.5 LPA (Level 1)",
    officialPortal: "https://www.rrbcdg.gov.in/",
    examCode: "RRB_GROUP_D",
    dek: "Track maintainer, Pointsman, Helper, Asst Loco Pilot, Tech Helper. Largest govt recruitment in India by volume.",
  },
  {
    slug: "rrb-alp",
    name: "RRB ALP — Assistant Loco Pilot + Technician",
    body: "Railway Recruitment Board",
    category: "railway",
    cadence: "Irregular",
    typicalVacancies: "~15,000-30,000 per cycle",
    eligibility: "Class 10 + ITI / Diploma in relevant trade, age 18-30",
    pattern: "CBT-1 → CBT-2 → CBAT (computer-based aptitude) → Medical",
    startingSalary: "₹3-5 LPA (Level 2)",
    officialPortal: "https://www.rrbcdg.gov.in/",
    examCode: "RRB_ALP",
    dek: "Path to becoming a Loco Pilot (train driver). Technician roles run in parallel.",
  },

  // ── Defence ────────────────────────────────────────────────────────
  {
    slug: "upsc-nda",
    name: "NDA — National Defence Academy",
    body: "Union Public Service Commission",
    category: "defence",
    cadence: "Twice yearly (NDA-I + NDA-II)",
    typicalVacancies: "~400 (per cycle; ~800/year total)",
    eligibility: "Class 12 pass (PCM for Army/Air Force; PCB/PCM for Navy), unmarried, age 16.5-19.5",
    pattern: "Written (Maths + GAT) → SSB Interview (5 days) → Medical",
    startingSalary: "Cadets get stipend ₹56,100 during 3-year training; commissioned officers ₹56,100+",
    officialPortal: "https://www.upsc.gov.in/",
    examCode: "NDA",
    careerSlug: "armed-forces-officer",
    dek: "Direct Class 12 entry into Army, Navy, Air Force as cadet. 3-year training → IMA/AFA/INA.",
  },
  {
    slug: "upsc-cds",
    name: "CDS — Combined Defence Services",
    body: "Union Public Service Commission",
    category: "defence",
    cadence: "Twice yearly",
    typicalVacancies: "~400 (per cycle)",
    eligibility: "Bachelor's degree (specific for Air Force / Navy), age 19-24 (varies by service)",
    pattern: "Written → SSB Interview → Medical",
    startingSalary: "₹56,100+ on commissioning",
    officialPortal: "https://www.upsc.gov.in/",
    examCode: "CDS",
    careerSlug: "armed-forces-officer",
    dek: "Graduate entry to IMA/INA/AFA + OTA (Officers Training Academy). Most common defence-officer entry.",
  },
  {
    slug: "afcat",
    name: "AFCAT — Air Force Common Admission Test",
    body: "Indian Air Force",
    category: "defence",
    cadence: "Twice yearly",
    typicalVacancies: "~200-300 per cycle",
    eligibility: "Bachelor's degree (specific subjects for technical branches), age 20-26",
    pattern: "AFCAT written → AFSB Interview → Medical",
    startingSalary: "₹56,100+ on commissioning",
    officialPortal: "https://afcat.cdac.in/",
    careerSlug: "armed-forces-officer",
    dek: "Indian Air Force flying + ground branches. Includes both technical + non-technical entries.",
  },

  // ── PSU ────────────────────────────────────────────────────────────
  {
    slug: "psu-via-gate",
    name: "PSU Engineering Recruitment (via GATE)",
    body: "NTPC, PowerGrid, ONGC, IOCL, BHEL, GAIL etc. (each separately)",
    category: "psu-engineer",
    cadence: "Yearly (most major PSUs)",
    typicalVacancies: "~2,000-3,000 GETs total across major PSUs",
    eligibility: "BTech relevant branch + GATE score within PSU-specific cutoff",
    pattern: "GATE score → Shortlist → Group Discussion + Interview → Medical",
    startingSalary: "₹10-15 LPA inc. perks",
    officialPortal: "https://gate2025.iitr.ac.in/ + individual PSU websites",
    examCode: "GATE_CSE",
    careerSlug: "psu-engineer",
    dek: "GATE clear cut score is the common selection for top PSUs. Each PSU has its own merit list.",
  },

  // ── Teaching ───────────────────────────────────────────────────────
  {
    slug: "ctet",
    name: "CTET — Central Teacher Eligibility",
    body: "Central Board of Secondary Education",
    category: "teaching",
    cadence: "Twice yearly",
    typicalVacancies: "Eligibility cert (not vacancies); enables KVS/NVS/CBSE schools",
    eligibility: "Class 12 + DEd (for Paper I primary), Bachelor's + BEd (for Paper II upper-primary)",
    pattern: "Paper I (Class 1-5 teachers) and/or Paper II (Class 6-8 teachers), 150 MCQs each",
    startingSalary: "After clearance: KVS PGT ₹56-60k base; NVS TGT ₹56-60k base. ~₹8-11 LPA inc allowances.",
    officialPortal: "https://ctet.nic.in/",
    examCode: "CTET",
    careerSlug: "school-teacher",
    dek: "Mandatory cert for teaching in central govt schools (KVS, NVS) + many state cadres.",
  },
  {
    slug: "kvs-pgt-tgt",
    name: "KVS PGT/TGT — Kendriya Vidyalaya Recruitment",
    body: "Kendriya Vidyalaya Sangathan",
    category: "teaching",
    cadence: "Irregular (last full cycle 2022-23)",
    typicalVacancies: "~13,000-15,000 per cycle (combined PGT/TGT/PRT)",
    eligibility: "PGT: PG + BEd; TGT: Bachelor's + BEd + CTET; PRT: DEd + CTET",
    pattern: "Written (objective + descriptive) → Interview",
    startingSalary: "PGT ₹56-65k base; TGT ₹44-48k base; PRT ₹35-40k base + DA + HRA",
    officialPortal: "https://kvsangathan.nic.in/",
    careerSlug: "school-teacher",
    dek: "Central govt school teacher. Strong job security + central scale pay + national mobility.",
  },

  // ── Judicial ───────────────────────────────────────────────────────
  {
    slug: "state-judicial-services",
    name: "State Judicial Services (Civil Judge / Magistrate)",
    body: "Various state High Courts",
    category: "judicial",
    cadence: "State-specific; annual or biennial",
    typicalVacancies: "Varies by state, 50-300 typically",
    eligibility: "LLB + AIBE + age 21-35 (state-specific); 7 yr practice for Higher Judicial Service",
    pattern: "Prelims → Mains (descriptive + drafting) → Viva-voce",
    startingSalary: "₹8-12 LPA inc. allowances + official residence",
    officialPortal: "Each state High Court website",
    careerSlug: "judge-judicial-services",
    dek: "Civil Judge / Judicial Magistrate at sub-district + district courts. Path to District Judge + HC elevation.",
  },

  // ── State PCS ──────────────────────────────────────────────────────
  {
    slug: "uppsc-pcs",
    name: "UPPSC PCS — UP Public Service Commission",
    body: "Uttar Pradesh PSC",
    category: "state-pcs",
    cadence: "Annual",
    typicalVacancies: "~400-600",
    eligibility: "Bachelor's, age 21-40 (Gen), domicile preferred but not always required",
    pattern: "Prelims → Mains → Interview (similar to UPSC)",
    startingSalary: "₹6-9 LPA (Junior Time Scale; same as UPSC Group A entry)",
    officialPortal: "https://uppsc.up.nic.in/",
    examCode: "UP_UPPSC_PCS",
    careerSlug: "state-civil-services",
    dek: "Deputy Collector, DSP, Block Development Officer entry in UP. Easier than UPSC; cadre confined to UP.",
  },
  {
    slug: "bpsc-cce",
    name: "BPSC CCE — Bihar PSC",
    body: "Bihar Public Service Commission",
    category: "state-pcs",
    cadence: "Annual",
    typicalVacancies: "~500-1000",
    eligibility: "Bachelor's, age 22-37 (Gen), Bihar domicile preferred",
    pattern: "Prelims → Mains → Interview",
    startingSalary: "₹7-10 LPA",
    officialPortal: "https://www.bpsc.bih.nic.in/",
    examCode: "BR_BPSC_CCE",
    careerSlug: "state-civil-services",
    dek: "Deputy Collector, Asst Commissioner of State Tax, BDO entry. Highest applicant volume after UPPSC.",
  },
];

export function findGovtJob(slug: string): GovtJobOpening | undefined {
  return GOVT_JOBS.find((j) => j.slug === slug);
}

export function govtJobsByCategory(catSlug: string): GovtJobOpening[] {
  return GOVT_JOBS.filter((j) => j.category === catSlug);
}

export function govtJobCategoryLabel(catSlug: string): string {
  return GOVT_JOB_CATEGORIES.find((c) => c.slug === catSlug)?.label ?? catSlug;
}
