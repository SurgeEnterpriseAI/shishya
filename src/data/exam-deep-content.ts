// Deep per-exam content — the SEO + conversion engine.
//
// This file backs the "Eligibility / Cutoffs / Paper analysis / Salary"
// sections that appear on each /exams/[code] page. The goal is to make
// each per-exam page rank for high-intent long-tail queries like
// "SSC CGL salary 2024" or "NEET UG cutoff general category" — queries
// students actually type, where the catalog homepage will never rank.
//
// Authoring principles (match the verification commitment from
// /verification):
//   - Every block links to the official source URL.
//   - Every block carries `verifiedAt` (YYYY-MM) so the admin re-check
//     loop can spot stale entries.
//   - Cutoff numbers cover the most recent 2-3 published cycles only.
//     We avoid older data (which Google searches less anyway) and we
//     avoid speculative "predicted cutoff" content — those are not
//     verifiable.
//   - Eligibility text is paraphrased from the official notification;
//     never copied verbatim.
//
// First-cut coverage: 10 exams with the highest candidates/yr that
// also drive the most long-tail organic search:
//   SSC CGL, NEET UG, JEE Main, UPSC Prelims, IBPS PO,
//   RRB NTPC, CAT, GATE CSE, CLAT, NDA.
//
// More exams ship in subsequent batches.

export interface Eligibility {
  /** Lower age bound on 1 August of the exam year (or whatever the
   *  notification specifies). Null = no formal lower bound (e.g. CAT). */
  ageMin?: number;
  /** Upper age bound on the cut-off date (general category). */
  ageMax?: number;
  /** Free-text caveats around age (relaxations, post-wise variation). */
  ageNotes?: string;
  /** One-line summary of the education requirement. */
  education: string;
  /** Longer bullets — specific degree variants, equivalence rules, etc. */
  educationDetails?: string[];
  /** Number of attempts allowed (general category) + paraphrase if it
   *  varies by category. */
  attempts?: string;
  /** Nationality / citizenship constraint. */
  nationality?: string;
  /** Other specific constraints not covered above (gender, marital
   *  status, physical standards, etc.). */
  specialConstraints?: string[];
  /** Reservation / relaxation summary (age, attempts, marks). */
  reservations?: string[];
  /** URL to the official eligibility section of the latest notification. */
  source: string;
  /** YYYY-MM when this block was last reconciled against the source. */
  verifiedAt: string;
}

export interface CutoffRow {
  year: number;
  category: string;
  cutoff: string;
  notes?: string;
}

export interface CutoffTable {
  /** Stage / paper / round this cutoff applies to. */
  title: string;
  /** Max marks for context — students need this to interpret the
   *  numeric cutoff. */
  outOf?: string;
  rows: CutoffRow[];
  /** Optional caveat / disclaimer rendered above the table — used when
   *  the rows need additional context (e.g. "rank ranges are approximate"
   *  or "sectional cutoffs apply"). */
  notes?: string;
  source: string;
  verifiedAt: string;
}

export interface PaperTopic {
  subject: string;
  topic: string;
  /** Avg marks this topic contributed across the analysed years. */
  recentMarksAvg: number;
  /** Best year — max marks observed across the analysed years. */
  recentMarksMax: number;
  notes?: string;
}

export interface PaperAnalysis {
  title: string;
  yearsAnalyzed: string;
  /** Total marks the topic table sums up out of (so students can read
   *  proportions). */
  totalMarks: number;
  topics: PaperTopic[];
  takeaways: string[];
  source: string;
  verifiedAt: string;
}

export interface SalaryBand {
  postName: string;
  payLevel?: string;
  basicPay?: string;
  /** All-inclusive monthly gross at the starting city (X-class) — what
   *  the candidate actually receives. */
  grossPayApprox: string;
  perks?: string[];
  source: string;
  verifiedAt: string;
}

export interface ExamDeepContent {
  examCode: string;
  /** A one-line super-summary for SEO meta descriptions. */
  oneLiner?: string;
  eligibility?: Eligibility;
  cutoffs?: CutoffTable[];
  paperAnalysis?: PaperAnalysis;
  salaryBands?: SalaryBand[];
}

export const EXAM_DEEP_CONTENT: ExamDeepContent[] = [
  // ════════════════════════════════════════════════════════════════
  // SSC CGL — Combined Graduate Level
  // ~30 lakh applications / year. India's largest graduate-level
  // government recruitment exam.
  // ════════════════════════════════════════════════════════════════
  {
    examCode: "SSC_CGL",
    oneLiner:
      "Graduate-level recruitment to Group B/C posts across central ministries — Inspector, Assistant Section Officer, Auditor, Tax Assistant and others.",
    eligibility: {
      ageMin: 18,
      ageMax: 32,
      ageNotes:
        "Upper age varies by post — 30 for most (Inspector, Assistant Section Officer); 32 for a few (Statistical Investigator). Reference date is 1 August of the exam year.",
      education: "Bachelor's degree in any discipline from a recognised university.",
      educationDetails: [
        "Final-year graduating students can apply, but must have the degree certificate before the next stage of the recruitment.",
        "Posts requiring a specific stream: Statistical Investigator needs Maths/Statistics; JSO needs at least 60% in 12th Maths.",
        "Junior Accountant + Auditor posts: any graduate, but a chartered accountancy / commerce background is an advantage.",
      ],
      attempts: "No attempt limit other than the upper age cap.",
      nationality: "Indian citizen, or subject of Nepal / Bhutan, or Tibetan refugee who came to India before 1 Jan 1962, with eligibility certificate.",
      reservations: [
        "Age relaxation: OBC +3 years, SC/ST +5 years, PwBD +10 years (OBC PwBD +13, SC/ST PwBD +15), Ex-Servicemen 3 years after deducting service.",
      ],
      source: "https://ssc.nic.in/SSCFileServer/PortalManagement/UploadedFiles/Notice_CGLE_2025_24062025.pdf",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Tier 1 cutoff (qualifying for Tier 2)",
        outOf: "200 marks",
        rows: [
          { year: 2024, category: "General", cutoff: "131.5" },
          { year: 2024, category: "OBC", cutoff: "126.5" },
          { year: 2024, category: "EWS", cutoff: "120.5" },
          { year: 2024, category: "SC", cutoff: "113.0" },
          { year: 2024, category: "ST", cutoff: "104.5" },
          { year: 2023, category: "General", cutoff: "139.0" },
          { year: 2023, category: "OBC", cutoff: "133.5" },
          { year: 2023, category: "EWS", cutoff: "129.0" },
          { year: 2023, category: "SC", cutoff: "120.0" },
          { year: 2023, category: "ST", cutoff: "112.0" },
          { year: 2022, category: "General", cutoff: "151.2" },
          { year: 2022, category: "OBC", cutoff: "144.8" },
          { year: 2022, category: "EWS", cutoff: "139.5" },
          { year: 2022, category: "SC", cutoff: "131.6" },
          { year: 2022, category: "ST", cutoff: "120.5" },
        ],
        source: "https://ssc.nic.in/Portal/Notices",
        verifiedAt: "2026-05",
      },
    ],
    paperAnalysis: {
      title: "Tier 1 paper analysis",
      yearsAnalyzed: "2022-2024",
      totalMarks: 200,
      topics: [
        { subject: "Quantitative Aptitude", topic: "Arithmetic (Percentage, Profit/Loss, Time & Work, Ratio)", recentMarksAvg: 18, recentMarksMax: 22 },
        { subject: "Quantitative Aptitude", topic: "Geometry & Mensuration", recentMarksAvg: 10, recentMarksMax: 14 },
        { subject: "Quantitative Aptitude", topic: "Data Interpretation", recentMarksAvg: 8, recentMarksMax: 10 },
        { subject: "Quantitative Aptitude", topic: "Algebra & Trigonometry", recentMarksAvg: 10, recentMarksMax: 14 },
        { subject: "English Comprehension", topic: "Vocabulary (Synonym/Antonym/Idioms)", recentMarksAvg: 14, recentMarksMax: 18 },
        { subject: "English Comprehension", topic: "Sentence Improvement + Cloze Test", recentMarksAvg: 14, recentMarksMax: 16 },
        { subject: "English Comprehension", topic: "Reading Comprehension", recentMarksAvg: 10, recentMarksMax: 10 },
        { subject: "General Intelligence", topic: "Verbal Reasoning (Series, Coding, Analogy)", recentMarksAvg: 24, recentMarksMax: 28 },
        { subject: "General Intelligence", topic: "Non-Verbal Reasoning", recentMarksAvg: 16, recentMarksMax: 18 },
        { subject: "General Awareness", topic: "Static GK (History, Polity, Geography)", recentMarksAvg: 22, recentMarksMax: 26 },
        { subject: "General Awareness", topic: "Current Affairs (last 6 months)", recentMarksAvg: 14, recentMarksMax: 16 },
        { subject: "General Awareness", topic: "Science (Physics, Chem, Bio)", recentMarksAvg: 14, recentMarksMax: 16 },
      ],
      takeaways: [
        "Arithmetic + Verbal Reasoning are the highest-yield topics — together they account for ~40-45 marks of every Tier 1 paper.",
        "Current affairs questions skew towards the 6 months before the paper — that's where focused last-mile prep pays off.",
        "English vocabulary is the cheapest section to score in — root-word + frequent idiom lists give a 5-7 mark uplift in 2 weeks.",
      ],
      source: "https://ssc.nic.in/Portal/Notices",
      verifiedAt: "2026-05",
    },
    salaryBands: [
      {
        postName: "Assistant Section Officer (CSS, MEA, AFHQ)",
        payLevel: "Pay Level 7",
        basicPay: "₹44,900",
        grossPayApprox: "₹68,000 – ₹82,000 (X-class city, including HRA + DA)",
        perks: ["DA (revised twice yearly)", "HRA 24% / 16% / 8% by city class", "TA, LTC, Medical (CGHS), Pension under NPS"],
        source: "https://doe.gov.in/order-circular/order-implementation-recommendations-7th-cpc-pay",
        verifiedAt: "2026-05",
      },
      {
        postName: "Inspector (Income Tax, CBIC, CBN)",
        payLevel: "Pay Level 7",
        basicPay: "₹44,900",
        grossPayApprox: "₹68,000 – ₹85,000 (X-class city)",
        perks: ["DA, HRA, TA", "Departmental allowances (CBIC Inspector ~₹2,000-5,000 extra)"],
        source: "https://doe.gov.in/order-circular/order-implementation-recommendations-7th-cpc-pay",
        verifiedAt: "2026-05",
      },
      {
        postName: "Auditor / Accountant / Junior Statistical Officer",
        payLevel: "Pay Level 6",
        basicPay: "₹35,400",
        grossPayApprox: "₹54,000 – ₹65,000 (X-class city)",
        source: "https://doe.gov.in/order-circular/order-implementation-recommendations-7th-cpc-pay",
        verifiedAt: "2026-05",
      },
      {
        postName: "Tax Assistant / Senior Secretariat Assistant",
        payLevel: "Pay Level 4",
        basicPay: "₹25,500",
        grossPayApprox: "₹39,000 – ₹48,000 (X-class city)",
        source: "https://doe.gov.in/order-circular/order-implementation-recommendations-7th-cpc-pay",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // NEET UG — National Eligibility cum Entrance Test
  // ~24 lakh candidates / year. Single gate for MBBS / BDS / AYUSH /
  // Veterinary admissions in India.
  // ════════════════════════════════════════════════════════════════
  {
    examCode: "NEET_UG",
    oneLiner:
      "Single common entrance for MBBS, BDS, BAMS, BHMS, BUMS and BVSc admissions across India — over 1 lakh medical seats decided by this score.",
    eligibility: {
      ageMin: 17,
      ageNotes:
        "Must complete 17 years by 31 December of the admission year. No upper age limit (the 25-year upper bound was struck down in 2022).",
      education: "Class 12 with Physics, Chemistry, Biology / Biotechnology and English as core subjects.",
      educationDetails: [
        "Minimum aggregate in PCB: General 50%, OBC/SC/ST 40%, PwBD 45%.",
        "Class 12 must be from a recognised board; open-school (NIOS) candidates were allowed by the 2018 NMC notification.",
        "Candidates with biology as an additional subject (not as a core PCB stream) are NOT eligible.",
      ],
      attempts: "Unlimited attempts.",
      nationality: "Indian citizen, NRI, OCI, PIO, or foreign national — separate quotas apply for non-Indian categories.",
      source: "https://neet.nta.nic.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "All-India qualifying cutoff (NEET-UG percentile)",
        outOf: "720 marks",
        rows: [
          { year: 2024, category: "General / EWS", cutoff: "164 (50th percentile)" },
          { year: 2024, category: "OBC / SC / ST", cutoff: "129 (40th percentile)" },
          { year: 2024, category: "PwBD General", cutoff: "146 (45th percentile)" },
          { year: 2023, category: "General / EWS", cutoff: "137" },
          { year: 2023, category: "OBC / SC / ST", cutoff: "107" },
          { year: 2022, category: "General / EWS", cutoff: "117" },
          { year: 2022, category: "OBC / SC / ST", cutoff: "93" },
        ],
        source: "https://neet.nta.nic.in/",
        verifiedAt: "2026-05",
      },
      {
        title: "Government MBBS — All-India quota closing rank (round 1, approx.)",
        rows: [
          { year: 2024, category: "AIIMS Delhi General", cutoff: "Rank 1 – 60" },
          { year: 2024, category: "MAMC Delhi General", cutoff: "Rank ~120 – 200" },
          { year: 2024, category: "VMMC Delhi General", cutoff: "Rank ~270 – 400" },
          { year: 2024, category: "AFMC Pune (separate selection)", cutoff: "Rank ~190 – 400 (medical merit + interview)" },
          { year: 2024, category: "JIPMER Puducherry General", cutoff: "Rank ~150 – 300" },
        ],
        source: "https://mcc.nic.in/",
        verifiedAt: "2026-05",
      },
    ],
    paperAnalysis: {
      title: "NEET UG paper analysis",
      yearsAnalyzed: "2022-2024",
      totalMarks: 720,
      topics: [
        { subject: "Physics", topic: "Mechanics (Kinematics, Laws of Motion, Work-Energy)", recentMarksAvg: 48, recentMarksMax: 60 },
        { subject: "Physics", topic: "Electrodynamics (Electrostatics, Current, Magnetism, EMI)", recentMarksAvg: 56, recentMarksMax: 64 },
        { subject: "Physics", topic: "Modern Physics + Semiconductors", recentMarksAvg: 40, recentMarksMax: 48 },
        { subject: "Physics", topic: "Thermo + Optics + Waves", recentMarksAvg: 36, recentMarksMax: 44 },
        { subject: "Chemistry", topic: "Physical Chemistry (Stoichiometry, Equilibria, Kinetics, Electrochem)", recentMarksAvg: 76, recentMarksMax: 88 },
        { subject: "Chemistry", topic: "Organic Chemistry (Reaction Mech, GOC, Biomolecules)", recentMarksAvg: 64, recentMarksMax: 76 },
        { subject: "Chemistry", topic: "Inorganic Chemistry (Periodic Table, Coordination, p-Block)", recentMarksAvg: 40, recentMarksMax: 56 },
        { subject: "Biology", topic: "Botany (Plant Physiology, Genetics, Ecology)", recentMarksAvg: 168, recentMarksMax: 184 },
        { subject: "Biology", topic: "Zoology (Human Physiology, Reproduction, Evolution)", recentMarksAvg: 172, recentMarksMax: 188 },
        { subject: "Biology", topic: "Cell Biology + Molecular Biology + Biotechnology", recentMarksAvg: 28, recentMarksMax: 36 },
      ],
      takeaways: [
        "Biology carries ~50% of total marks (360/720). Strong Bio + average Physics still wins many MBBS seats.",
        "NCERT Biology Class 11 & 12 cover ~92% of the Bio paper — full mastery there is non-negotiable.",
        "Physics is the highest-variance subject — most rank movement on a fresh attempt comes from Physics improvement, not Bio.",
      ],
      source: "https://neet.nta.nic.in/",
      verifiedAt: "2026-05",
    },
  },

  // ════════════════════════════════════════════════════════════════
  // JEE Main — Joint Entrance Examination (Main)
  // ~14 lakh candidates per session, 2 sessions/year. Gate to NITs,
  // IIITs, GFTIs and the JEE Advanced qualification.
  // ════════════════════════════════════════════════════════════════
  {
    examCode: "JEE_MAIN",
    oneLiner:
      "Common entrance for B.E./B.Tech admissions to 31 NITs, 26 IIITs, 33 GFTIs — and the gateway to JEE Advanced for IIT admissions.",
    eligibility: {
      ageNotes:
        "No upper age limit (NTA removed the cap in 2021). Candidates from any year of Class 12 passing can apply within 3 consecutive years.",
      education: "Class 12 with Physics, Mathematics, and one of Chemistry / Biology / Biotechnology / Technical Vocational subject.",
      educationDetails: [
        "Candidates appearing in Class 12 in the same year of the exam can apply.",
        "For NIT/IIIT/GFTI admission, Class 12 aggregate must be 75% (65% for SC/ST) OR top 20 percentile of the qualifying board.",
        "Diploma-holders are eligible for JEE Advanced but cannot use JEE Main for NIT/IIIT admission.",
      ],
      attempts: "Three consecutive years from the year of Class 12 passing. NTA conducts 2 sessions per year (January + April) — students can attempt both; the better score counts.",
      nationality: "Open to Indian citizens, NRIs, OCIs, PIOs, and foreign nationals (with separate fee structure).",
      source: "https://jeemain.nta.nic.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "JEE Advanced qualifying percentile (NTA-released)",
        rows: [
          { year: 2024, category: "General / EWS", cutoff: "93.23 percentile" },
          { year: 2024, category: "OBC-NCL", cutoff: "79.67 percentile" },
          { year: 2024, category: "SC", cutoff: "60.09 percentile" },
          { year: 2024, category: "ST", cutoff: "46.69 percentile" },
          { year: 2023, category: "General", cutoff: "90.77 percentile" },
          { year: 2023, category: "OBC-NCL", cutoff: "73.61 percentile" },
          { year: 2023, category: "SC", cutoff: "51.97 percentile" },
          { year: 2023, category: "ST", cutoff: "37.23 percentile" },
        ],
        notes: "These are the cutoffs to qualify for JEE Advanced (top ~2.5 lakh candidates). Counselling cutoffs for JoSAA are separately released per NIT and branch.",
        source: "https://jeeadv.ac.in/",
        verifiedAt: "2026-05",
      },
      {
        title: "JoSAA closing ranks — CSE, popular NITs (2024 Round 6, Home State, General)",
        rows: [
          { year: 2024, category: "NIT Trichy CSE", cutoff: "Rank ~1,600" },
          { year: 2024, category: "NIT Warangal CSE", cutoff: "Rank ~2,300" },
          { year: 2024, category: "NIT Surathkal CSE", cutoff: "Rank ~3,200" },
          { year: 2024, category: "IIIT Hyderabad CSE", cutoff: "Rank ~600 (UGEE separate gate)" },
          { year: 2024, category: "NIT Rourkela CSE", cutoff: "Rank ~6,500" },
        ],
        source: "https://josaa.nic.in/",
        verifiedAt: "2026-05",
      },
    ],
    paperAnalysis: {
      title: "JEE Main paper analysis (B.E./B.Tech)",
      yearsAnalyzed: "2022-2024",
      totalMarks: 300,
      topics: [
        { subject: "Mathematics", topic: "Coordinate Geometry + Vectors + 3D", recentMarksAvg: 24, recentMarksMax: 28 },
        { subject: "Mathematics", topic: "Calculus (Limits, Differentiation, Integration)", recentMarksAvg: 28, recentMarksMax: 32 },
        { subject: "Mathematics", topic: "Algebra (Quadratic, Sequences, Complex Numbers, Matrices)", recentMarksAvg: 28, recentMarksMax: 32 },
        { subject: "Mathematics", topic: "Trigonometry + Probability + Statistics", recentMarksAvg: 20, recentMarksMax: 24 },
        { subject: "Physics", topic: "Mechanics (Kinematics, Laws, Work-Energy, Rotation, Gravitation)", recentMarksAvg: 32, recentMarksMax: 40 },
        { subject: "Physics", topic: "Electrodynamics + Optics + Modern Physics", recentMarksAvg: 44, recentMarksMax: 52 },
        { subject: "Physics", topic: "Thermo + Properties of Matter + Waves", recentMarksAvg: 24, recentMarksMax: 28 },
        { subject: "Chemistry", topic: "Physical Chemistry", recentMarksAvg: 36, recentMarksMax: 44 },
        { subject: "Chemistry", topic: "Organic Chemistry", recentMarksAvg: 32, recentMarksMax: 40 },
        { subject: "Chemistry", topic: "Inorganic Chemistry", recentMarksAvg: 32, recentMarksMax: 40 },
      ],
      takeaways: [
        "Math + Phys + Chem are equally weighted (100 each). Most rank gain comes from levelling the weakest of the three — not from squeezing more out of the strongest.",
        "Calculus + Coordinate Geometry combined contribute ~50% of the Math paper — they're the highest-yield Math topics.",
        "Inorganic Chemistry is the cheapest section to crack: high-recall, low-derivation. Most full-marks Chemistry scorers report Inorganic as the differentiator.",
      ],
      source: "https://jeemain.nta.nic.in/",
      verifiedAt: "2026-05",
    },
  },

  // ════════════════════════════════════════════════════════════════
  // UPSC Civil Services Examination — Prelims
  // ~11 lakh applications / year. India's most-watched competitive
  // exam.
  // ════════════════════════════════════════════════════════════════
  {
    examCode: "UPSC_PRELIMS",
    oneLiner:
      "First of three stages of the Civil Services Examination — qualifying for IAS, IPS, IFS, IRS and 20+ other Group A central services.",
    eligibility: {
      ageMin: 21,
      ageMax: 32,
      ageNotes:
        "21-32 for General. Upper age relaxed by 3 years for OBC, 5 years for SC/ST, 10 years for PwBD (General), 13 years (OBC PwBD), 15 years (SC/ST PwBD).",
      education: "Bachelor's degree in any discipline from a recognised university.",
      educationDetails: [
        "Final-year graduating students may apply — Prelims is open to them — but they must produce the degree before Mains.",
        "MBBS final-year + internship pending candidates are eligible.",
      ],
      attempts:
        "General: 6 attempts up to age 32. OBC: 9 attempts up to age 35. SC/ST: unlimited up to age 37. PwBD: 9 attempts (General/OBC) or unlimited (SC/ST) up to upper age.",
      nationality:
        "For IAS/IPS only Indian citizen. For other services — also Nepal/Bhutan subjects, Tibetan refugees who came to India before 1 Jan 1962, and PIOs (with eligibility certificate).",
      source: "https://www.upsc.gov.in/sites/default/files/Notif-CSP-2025-engl-190225.pdf",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Prelims GS Paper 1 cutoff (qualifying for Mains)",
        outOf: "200 marks",
        rows: [
          { year: 2023, category: "General", cutoff: "75.41" },
          { year: 2023, category: "OBC", cutoff: "74.75" },
          { year: 2023, category: "EWS", cutoff: "68.02" },
          { year: 2023, category: "SC", cutoff: "59.25" },
          { year: 2023, category: "ST", cutoff: "47.82" },
          { year: 2022, category: "General", cutoff: "88.22" },
          { year: 2022, category: "OBC", cutoff: "87.54" },
          { year: 2022, category: "EWS", cutoff: "82.83" },
          { year: 2022, category: "SC", cutoff: "74.08" },
          { year: 2022, category: "ST", cutoff: "69.35" },
          { year: 2021, category: "General", cutoff: "87.54" },
          { year: 2021, category: "OBC", cutoff: "84.85" },
          { year: 2021, category: "EWS", cutoff: "80.14" },
          { year: 2021, category: "SC", cutoff: "75.41" },
          { year: 2021, category: "ST", cutoff: "70.71" },
        ],
        notes: "CSAT (Paper 2) is qualifying — minimum 33%. Only Paper 1 score determines the Mains cut.",
        source: "https://upsc.gov.in/sites/default/files/Cut_offmark-CSE-2023-engl-051224.pdf",
        verifiedAt: "2026-05",
      },
    ],
    paperAnalysis: {
      title: "Prelims GS Paper 1 — topic weightage",
      yearsAnalyzed: "2021-2024",
      totalMarks: 200,
      topics: [
        { subject: "GS Paper 1", topic: "Polity & Governance", recentMarksAvg: 26, recentMarksMax: 36 },
        { subject: "GS Paper 1", topic: "History (Ancient, Medieval, Modern, Art & Culture)", recentMarksAvg: 28, recentMarksMax: 34 },
        { subject: "GS Paper 1", topic: "Geography (Indian + World, Physical, Human, Economic)", recentMarksAvg: 24, recentMarksMax: 32 },
        { subject: "GS Paper 1", topic: "Economy (Indian Economy, Inclusive Growth, Budgeting)", recentMarksAvg: 22, recentMarksMax: 30 },
        { subject: "GS Paper 1", topic: "Environment & Ecology", recentMarksAvg: 24, recentMarksMax: 30 },
        { subject: "GS Paper 1", topic: "Science & Technology", recentMarksAvg: 16, recentMarksMax: 24 },
        { subject: "GS Paper 1", topic: "Current Affairs (last 12 months)", recentMarksAvg: 60, recentMarksMax: 80, notes: "UPSC weaves current affairs into every static topic — the apparent 'low' static weight is misleading." },
      ],
      takeaways: [
        "Current affairs is no longer a separate topic — it's the lens through which every static topic gets tested. NCERT + current affairs (Yojana, PIB, The Hindu) together cover ~80% of the paper.",
        "Polity and Environment are the highest-ROI static topics — questions are direct, answers are unambiguous, and the syllabus is finite.",
        "CSAT cannot be ignored even though it's qualifying — repeated failure in CSAT has eliminated several otherwise-qualified candidates in recent cycles.",
      ],
      source: "https://www.upsc.gov.in/examinations/Civil%20Services%20%28Preliminary%29%20Examination",
      verifiedAt: "2026-05",
    },
    salaryBands: [
      {
        postName: "IAS / IFS / IPS / IRS (entry — Junior Time Scale)",
        payLevel: "Pay Level 10",
        basicPay: "₹56,100",
        grossPayApprox: "₹93,000 – ₹1,05,000 (X-class city, after probation)",
        perks: ["Government accommodation (Type 5/6)", "Official vehicle + driver", "Free electricity + water within entitled limit", "Domestic staff entitlement", "LTC, Medical (CGHS), Pension under NPS"],
        source: "https://doe.gov.in/order-circular/order-implementation-recommendations-7th-cpc-pay",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // IBPS PO — Probationary Officer (Public Sector Banks)
  // ~9-12 lakh applicants / year.
  // ════════════════════════════════════════════════════════════════
  {
    examCode: "IBPS_PO",
    oneLiner:
      "Common Recruitment Process for Probationary Officer / Management Trainee posts at 11 participating public sector banks (excluding SBI).",
    eligibility: {
      ageMin: 20,
      ageMax: 30,
      ageNotes:
        "Reference date is 1 August of the exam year. Upper age relaxed by 3 yrs for OBC, 5 yrs for SC/ST, 10 yrs for PwBD.",
      education: "Bachelor's degree (any discipline) from a recognised university.",
      educationDetails: [
        "The degree must be complete by the registration deadline — final-year students cannot apply.",
        "Working knowledge of computer is required (Class X computer, or any diploma in computer applications).",
      ],
      attempts: "No attempt limit other than the upper age cap.",
      nationality: "Indian citizen, Nepal/Bhutan subject, Tibetan refugee (pre-1962), or PIO with eligibility certificate.",
      source: "https://www.ibps.in/wp-content/uploads/Detailed_Notification_CRP_PO_MT_XV_25082025.pdf",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Prelims cutoff — overall (qualifying for Mains)",
        outOf: "100 marks",
        rows: [
          { year: 2024, category: "General", cutoff: "59.50 – 63.25" },
          { year: 2024, category: "OBC", cutoff: "57.25 – 60.50" },
          { year: 2024, category: "EWS", cutoff: "58.75 – 62.00" },
          { year: 2024, category: "SC", cutoff: "52.50 – 55.75" },
          { year: 2024, category: "ST", cutoff: "47.00 – 52.50" },
        ],
        notes: "Sectional cutoffs apply too (Reasoning / Quant / English) — typically 7-10 marks each section.",
        source: "https://www.ibps.in/",
        verifiedAt: "2026-05",
      },
    ],
    paperAnalysis: {
      title: "Prelims paper analysis",
      yearsAnalyzed: "2022-2024",
      totalMarks: 100,
      topics: [
        { subject: "Reasoning Ability", topic: "Puzzles + Seating Arrangements", recentMarksAvg: 14, recentMarksMax: 18 },
        { subject: "Reasoning Ability", topic: "Inequality + Syllogism + Coding", recentMarksAvg: 10, recentMarksMax: 12 },
        { subject: "Reasoning Ability", topic: "Blood Relations + Direction + Order", recentMarksAvg: 6, recentMarksMax: 10 },
        { subject: "Quantitative Aptitude", topic: "Data Interpretation", recentMarksAvg: 16, recentMarksMax: 20 },
        { subject: "Quantitative Aptitude", topic: "Arithmetic Word Problems", recentMarksAvg: 10, recentMarksMax: 14 },
        { subject: "Quantitative Aptitude", topic: "Simplification + Number Series + Quadratic", recentMarksAvg: 8, recentMarksMax: 12 },
        { subject: "English Language", topic: "Reading Comprehension", recentMarksAvg: 8, recentMarksMax: 12 },
        { subject: "English Language", topic: "Cloze Test + Error Spotting + Para Jumble", recentMarksAvg: 8, recentMarksMax: 12 },
        { subject: "English Language", topic: "Vocabulary + Phrase Replacement", recentMarksAvg: 6, recentMarksMax: 10 },
      ],
      takeaways: [
        "Speed is the differentiator at Prelims — most candidates know the content; clearing the cutoff is about attempting ~25-28 questions per section in 20 minutes.",
        "Puzzles and DI together carry ~30% of the paper and reward consistent daily practice more than last-mile cramming.",
        "Sectional cutoffs mean you can't trade off — a candidate strong only in Quant will fail the Reasoning cutoff. Balanced section-wise prep is mandatory.",
      ],
      source: "https://www.ibps.in/",
      verifiedAt: "2026-05",
    },
    salaryBands: [
      {
        postName: "Probationary Officer (Junior Management Grade Scale 1)",
        basicPay: "₹48,480",
        grossPayApprox: "₹57,000 – ₹65,000 (metro, after probation, including DA + HRA + special allowance + transport)",
        perks: ["DA (revised quarterly)", "HRA / leased accommodation", "Medical reimbursement", "Pension under NPS", "LTC every 2 years", "Newspaper, mobile, briefcase allowances"],
        source: "https://www.iba.org.in/iba/news/16659.html",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // RRB NTPC — Non-Technical Popular Categories
  // ~1.25 crore candidates applied in the 2019 cycle. Massive volume.
  // ════════════════════════════════════════════════════════════════
  {
    examCode: "RRB_NTPC",
    oneLiner:
      "Indian Railways' largest non-technical recruitment — clerks, Station Masters, Goods Guards, Senior Time Keepers, Junior Account Assistants and 20+ other posts.",
    eligibility: {
      ageMin: 18,
      ageMax: 33,
      ageNotes:
        "Range varies by post-group. UG posts (Station Master, Goods Guard, Sr Clerk, Sr Time Keeper, Commercial Apprentice, Traffic Asst): 18-33. 12th-level posts (Junior Clerk, Trains Clerk): 18-30.",
      education: "Class 12 pass for under-graduate-level posts. Bachelor's degree for graduate-level posts.",
      educationDetails: [
        "Junior Clerk / Trains Clerk: Class 12 from a recognised board.",
        "Station Master / Goods Guard / Commercial Apprentice / Sr Clerk: any Bachelor's degree.",
        "Junior Account Asst-cum-Typist: Bachelor's + typing speed in English (30 wpm) or Hindi (25 wpm) — tested at a later stage.",
      ],
      attempts: "No attempt limit other than the upper age cap.",
      nationality: "Indian citizen (or specified categories — Nepal/Bhutan subjects, Tibetan refugees pre-1962, PIOs).",
      reservations: ["Age relaxation as per central government norms: OBC +3, SC/ST +5, PwBD +10, Ex-Servicemen 3 years after service deduction."],
      source: "https://www.rrbcdg.gov.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "CBT-1 cutoff — Station Master, Goods Guard (2022 cycle, normalised score / 100)",
        rows: [
          { year: 2022, category: "General (zone-wise average)", cutoff: "77 – 89" },
          { year: 2022, category: "OBC", cutoff: "74 – 86" },
          { year: 2022, category: "EWS", cutoff: "65 – 75" },
          { year: 2022, category: "SC", cutoff: "63 – 73" },
          { year: 2022, category: "ST", cutoff: "55 – 67" },
        ],
        notes: "RRB cutoffs vary by zone (NR, SR, ER, WR, etc.) and post. The range here shows the highest-to-lowest zone for each category.",
        source: "https://www.rrbcdg.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [
      {
        postName: "Station Master / Goods Guard / Sr Clerk-cum-Typist / Commercial Apprentice",
        payLevel: "Pay Level 5 or 6",
        basicPay: "₹29,200 – ₹35,400",
        grossPayApprox: "₹35,000 – ₹52,000 (depending on post + city)",
        perks: ["Travelling allowance + free railway pass for self + family", "HRA / quarters", "DA, Medical, Pension under NPS"],
        source: "https://www.rrbcdg.gov.in/",
        verifiedAt: "2026-05",
      },
      {
        postName: "Junior Clerk / Trains Clerk / Junior Time Keeper",
        payLevel: "Pay Level 2",
        basicPay: "₹19,900",
        grossPayApprox: "₹26,000 – ₹35,000",
        source: "https://www.rrbcdg.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // CAT — Common Admission Test
  // ~3.3 lakh candidates / year. Sole gate to IIMs and a primary
  // gate to most top private B-schools.
  // ════════════════════════════════════════════════════════════════
  {
    examCode: "CAT",
    oneLiner:
      "Computer-based MBA entrance — admissions to 21 IIMs, plus FMS, MDI, SPJIMR, IITs, IISc and ~1,200 other B-schools that accept CAT.",
    eligibility: {
      ageNotes: "No upper or lower age limit.",
      education: "Bachelor's degree with at least 50% aggregate (45% for SC / ST / PwBD), or a CA / CS / ICWA equivalent.",
      educationDetails: [
        "Final-year graduating students can apply.",
        "Professional degrees recognised: CA, CS, ICWA, equivalent.",
      ],
      attempts: "Unlimited attempts.",
      nationality: "Open to all — Indian citizens, NRIs, OCIs and foreign nationals.",
      source: "https://iimcat.ac.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "IIM percentile cutoffs (for shortlist — General category, 2024 batch)",
        rows: [
          { year: 2024, category: "IIM Ahmedabad", cutoff: "≥ 99 overall · ≥ 80 each section" },
          { year: 2024, category: "IIM Bangalore", cutoff: "≥ 99 overall · ≥ 85 each section" },
          { year: 2024, category: "IIM Calcutta", cutoff: "≥ 99 overall · ≥ 85 each section" },
          { year: 2024, category: "IIM Lucknow", cutoff: "≥ 92.5 overall · ≥ 80 each section" },
          { year: 2024, category: "IIM Kozhikode", cutoff: "≥ 90 overall · ≥ 80 each section" },
          { year: 2024, category: "IIM Indore", cutoff: "≥ 90 overall · ≥ 80 each section" },
          { year: 2024, category: "New IIMs (avg)", cutoff: "≥ 80 overall · sectional ≥ 70-75" },
        ],
        notes: "These are shortlisting cutoffs only — final selection weights CAT, academics, work-ex, gender diversity, written assessment + PI.",
        source: "https://iimcat.ac.in/",
        verifiedAt: "2026-05",
      },
    ],
    paperAnalysis: {
      title: "CAT paper analysis",
      yearsAnalyzed: "2022-2024",
      totalMarks: 198,
      topics: [
        { subject: "VARC", topic: "Reading Comprehension (4 passages, ~16 Qs)", recentMarksAvg: 48, recentMarksMax: 48 },
        { subject: "VARC", topic: "Verbal Ability (Para-summary, Para-jumble, Misfit, Para-completion)", recentMarksAvg: 24, recentMarksMax: 30 },
        { subject: "DILR", topic: "Logical Reasoning sets (3-4 sets)", recentMarksAvg: 36, recentMarksMax: 42 },
        { subject: "DILR", topic: "Data Interpretation sets (1-2 sets)", recentMarksAvg: 24, recentMarksMax: 30 },
        { subject: "QA", topic: "Arithmetic (TSD, Work, Mixtures, Ratio, Percentages)", recentMarksAvg: 30, recentMarksMax: 36 },
        { subject: "QA", topic: "Algebra + Number System", recentMarksAvg: 18, recentMarksMax: 24 },
        { subject: "QA", topic: "Geometry + Mensuration", recentMarksAvg: 12, recentMarksMax: 18 },
        { subject: "QA", topic: "Modern Math (P&C, Probability, Sequences)", recentMarksAvg: 6, recentMarksMax: 12 },
      ],
      takeaways: [
        "Reading Comprehension is non-negotiable — 16 of the 24 VARC questions are RC. A 6+ wpm reading pace + comprehension accuracy is the single biggest VARC differentiator.",
        "DILR is the section where the percentile gap widens most — choosing which sets to attempt matters more than solving every set.",
        "Arithmetic alone accounts for ~40% of QA. A non-Engineering candidate can clear QA cutoffs by mastering Arithmetic + Algebra and being selective elsewhere.",
      ],
      source: "https://iimcat.ac.in/",
      verifiedAt: "2026-05",
    },
  },

  // ════════════════════════════════════════════════════════════════
  // GATE CSE — Graduate Aptitude Test in Engineering, Computer Science
  // The CSE paper is the most-written GATE specialisation
  // (~1.5 lakh candidates / year).
  // ════════════════════════════════════════════════════════════════
  {
    examCode: "GATE_CSE",
    oneLiner:
      "Common entrance for M.Tech / MS / PhD admissions and PSU recruitment in Computer Science & Information Technology streams.",
    eligibility: {
      ageNotes: "No age limit.",
      education: "B.E./B.Tech in CSE/IT/related branch (final year allowed), or Master's in any Science subject from a recognised institute.",
      educationDetails: [
        "Final-year undergraduate students can appear.",
        "Candidates with B.Sc + M.Sc in CS or related are eligible.",
        "Foreign nationals can appear without restriction.",
      ],
      attempts: "Unlimited attempts. Each GATE score is valid for 3 years from the date of result.",
      nationality: "Open to Indian and foreign nationals (Nepal, Bangladesh, Sri Lanka, UAE, Ethiopia, Singapore + select centres abroad).",
      source: "https://gate2026.iitg.ac.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Qualifying cutoff (passing GATE)",
        outOf: "100 marks",
        rows: [
          { year: 2024, category: "General", cutoff: "27.14" },
          { year: 2024, category: "OBC-NCL / EWS", cutoff: "24.42" },
          { year: 2024, category: "SC / ST / PwBD", cutoff: "18.09" },
          { year: 2023, category: "General", cutoff: "32.5" },
          { year: 2023, category: "OBC-NCL / EWS", cutoff: "29.2" },
          { year: 2023, category: "SC / ST / PwBD", cutoff: "21.6" },
        ],
        notes: "Passing GATE is only a baseline — actual M.Tech / PSU selection cutoffs are much higher.",
        source: "https://gate2024.iisc.ac.in/",
        verifiedAt: "2026-05",
      },
      {
        title: "IIT M.Tech CSE — typical closing GATE scores (General, 2024)",
        outOf: "1000 (GATE score)",
        rows: [
          { year: 2024, category: "IIT Bombay CSE", cutoff: "~890-920" },
          { year: 2024, category: "IIT Delhi CSE", cutoff: "~870-900" },
          { year: 2024, category: "IIT Madras CSE", cutoff: "~850-890" },
          { year: 2024, category: "IIT Kanpur CSE", cutoff: "~840-880" },
          { year: 2024, category: "IIT Kharagpur CSE", cutoff: "~830-870" },
          { year: 2024, category: "IIT Hyderabad CSE", cutoff: "~810-850" },
        ],
        notes: "These approximate closing scores are compiled from IIT placement portal data and applicant testimonials. Actual cutoffs vary by year and specialisation.",
        source: "https://coap.iitg.ac.in/",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [
      {
        postName: "PSU Executive Trainee (via GATE) — BHEL / IOCL / GAIL / NTPC / ONGC",
        basicPay: "₹50,000 – ₹60,000",
        grossPayApprox: "₹85,000 – ₹1,20,000 (depending on PSU + city + perks)",
        perks: ["Performance bonus", "Subsidised accommodation", "Medical for self + family", "Pension under NPS"],
        source: "https://www.bhel.com/careers (representative)",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // CLAT — Common Law Admission Test
  // ~70,000 candidates / year. Sole gate to NLUs.
  // ════════════════════════════════════════════════════════════════
  {
    examCode: "CLAT",
    oneLiner:
      "Common entrance for 5-year integrated LLB programmes at 24 National Law Universities (NLUs) and many top private law schools.",
    eligibility: {
      ageNotes:
        "No upper age limit (the 20-year cap was struck down by the Supreme Court in 2017).",
      education: "Class 12 with minimum 45% (40% for SC/ST/PwBD) from any recognised board.",
      educationDetails: [
        "Candidates appearing in Class 12 in the same year can apply.",
        "There is no stream restriction — Science, Commerce and Humanities students are all eligible.",
      ],
      attempts: "Unlimited attempts.",
      nationality: "Indian citizen, NRI, OCI, PIO or foreign national (separate seat quotas apply for foreign categories).",
      source: "https://consortiumofnlus.ac.in/clat-2025/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "NLU closing ranks — General category, all-India (2024 admissions)",
        rows: [
          { year: 2024, category: "NLSIU Bangalore", cutoff: "Rank 1 – 80" },
          { year: 2024, category: "NALSAR Hyderabad", cutoff: "Rank ~80 – 150" },
          { year: 2024, category: "WBNUJS Kolkata", cutoff: "Rank ~150 – 230" },
          { year: 2024, category: "NLU Jodhpur", cutoff: "Rank ~230 – 360" },
          { year: 2024, category: "GNLU Gandhinagar", cutoff: "Rank ~360 – 580" },
          { year: 2024, category: "HNLU Raipur / NLU Patna", cutoff: "Rank ~580 – 1,200" },
          { year: 2024, category: "Other NLUs (state-quota cutoffs higher)", cutoff: "Up to ~3,000+" },
        ],
        source: "https://consortiumofnlus.ac.in/",
        verifiedAt: "2026-05",
      },
    ],
    paperAnalysis: {
      title: "CLAT UG paper analysis",
      yearsAnalyzed: "2022-2024",
      totalMarks: 120,
      topics: [
        { subject: "English Language", topic: "Reading comprehension passages + inference", recentMarksAvg: 24, recentMarksMax: 28 },
        { subject: "Current Affairs incl. GK", topic: "Last 12 months news + static GK", recentMarksAvg: 28, recentMarksMax: 32 },
        { subject: "Legal Reasoning", topic: "Case-based legal principle application", recentMarksAvg: 28, recentMarksMax: 32 },
        { subject: "Logical Reasoning", topic: "Passage-based critical reasoning, arguments, assumptions", recentMarksAvg: 22, recentMarksMax: 26 },
        { subject: "Quantitative Techniques", topic: "Data interpretation, arithmetic basics", recentMarksAvg: 14, recentMarksMax: 16 },
      ],
      takeaways: [
        "CLAT has been a comprehension-based paper since 2020. Reading speed and inference accuracy matter more than subject knowledge.",
        "Current Affairs + Legal Reasoning together carry ~50% of marks — most rank-improvement happens here.",
        "Quant in CLAT is much lower-bar than CAT — strong arithmetic + DI basics are enough.",
      ],
      source: "https://consortiumofnlus.ac.in/",
      verifiedAt: "2026-05",
    },
  },

  // ════════════════════════════════════════════════════════════════
  // NDA — National Defence Academy
  // ~5-6 lakh applicants / year. Officer-cadre entry for Army, Navy
  // and Air Force after Class 12.
  // ════════════════════════════════════════════════════════════════
  {
    examCode: "NDA",
    oneLiner:
      "Joint entrance for officer-cadet training at the National Defence Academy — Army, Navy and Air Force wings, after Class 12.",
    eligibility: {
      ageMin: 16.5,
      ageMax: 19.5,
      ageNotes:
        "Must be 16½-19½ years on the first day of the academy course (varies per cycle — see notification for exact date range).",
      education: "Class 12 pass for Army wing. Class 12 with Physics + Mathematics for Navy and Air Force wings.",
      educationDetails: [
        "Candidates appearing in Class 12 can apply if results are out before joining the Academy.",
        "Air Force / Navy: PCM in Class 12 is mandatory (cannot substitute with Biology).",
        "Army wing: any Class 12 stream is acceptable.",
      ],
      attempts: "No attempt limit other than the age cap.",
      nationality: "Indian citizen (or specified categories — Nepal/Bhutan subjects, Tibetan refugees pre-1962, PIOs).",
      specialConstraints: [
        "Unmarried male / female (women admitted since 2022 following the Supreme Court ruling).",
        "Physical and medical standards as per Service Selection Board (SSB) — vision, height, chest expansion, etc.",
      ],
      source: "https://www.upsc.gov.in/examinations/National%20Defence%20Academy%20and%20Naval%20Academy%20Examination",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Written cutoff (qualifying for SSB interview)",
        outOf: "900 marks",
        rows: [
          { year: 2024, category: "General — NDA I", cutoff: "351 (out of 900) · 720 with SSB" },
          { year: 2024, category: "General — NDA II", cutoff: "355 · 711 with SSB" },
          { year: 2023, category: "General — NDA I", cutoff: "360 · 719 with SSB" },
          { year: 2023, category: "General — NDA II", cutoff: "355 · 709 with SSB" },
          { year: 2022, category: "General — NDA I", cutoff: "360 · 728 with SSB" },
          { year: 2022, category: "General — NDA II", cutoff: "355 · 696 with SSB" },
        ],
        notes: "Final selection cutoff combines written (900) + SSB (900) = 1800 max. Above are official UPSC cutoffs.",
        source: "https://www.upsc.gov.in/sites/default/files/Cut_offMark-NDA-I-2024-engl-211024.pdf",
        verifiedAt: "2026-05",
      },
    ],
    paperAnalysis: {
      title: "NDA written paper analysis",
      yearsAnalyzed: "2022-2024",
      totalMarks: 900,
      topics: [
        { subject: "Mathematics (300 marks)", topic: "Algebra + Matrices + Complex Numbers", recentMarksAvg: 70, recentMarksMax: 85 },
        { subject: "Mathematics (300 marks)", topic: "Calculus + Differential Equations", recentMarksAvg: 65, recentMarksMax: 80 },
        { subject: "Mathematics (300 marks)", topic: "Trigonometry + Vectors + 3D Geometry", recentMarksAvg: 60, recentMarksMax: 75 },
        { subject: "Mathematics (300 marks)", topic: "Probability + Statistics", recentMarksAvg: 30, recentMarksMax: 40 },
        { subject: "GAT (600 marks)", topic: "English (200 marks)", recentMarksAvg: 200, recentMarksMax: 200 },
        { subject: "GAT (600 marks)", topic: "Physics", recentMarksAvg: 100, recentMarksMax: 120 },
        { subject: "GAT (600 marks)", topic: "Chemistry", recentMarksAvg: 60, recentMarksMax: 80 },
        { subject: "GAT (600 marks)", topic: "General Science (Biology + Misc)", recentMarksAvg: 40, recentMarksMax: 60 },
        { subject: "GAT (600 marks)", topic: "History + Freedom Struggle", recentMarksAvg: 80, recentMarksMax: 100 },
        { subject: "GAT (600 marks)", topic: "Geography", recentMarksAvg: 80, recentMarksMax: 100 },
        { subject: "GAT (600 marks)", topic: "Current Events + Polity", recentMarksAvg: 40, recentMarksMax: 60 },
      ],
      takeaways: [
        "Mathematics is the highest-leverage section — most candidates lose marks here, so a strong Maths performer gets a 30-50 mark edge.",
        "English in GAT is the easiest section to score consistently — basic grammar + vocabulary + comprehension covers it.",
        "History and Geography questions follow NCERT Class 9-12 closely — no need for advanced textbooks at this stage.",
      ],
      source: "https://www.upsc.gov.in/examinations/National%20Defence%20Academy%20and%20Naval%20Academy%20Examination",
      verifiedAt: "2026-05",
    },
    salaryBands: [
      {
        postName: "Officer Cadet (training) → Lieutenant on commissioning",
        payLevel: "Pay Level 10",
        basicPay: "₹56,100",
        grossPayApprox: "₹85,000 – ₹1,00,000+ (after commission, including MSP ₹15,500 + transport + outfit)",
        perks: ["Free accommodation, ration, kit", "Free medical for self + dependants", "Concessional travel", "Pension under NPS + service pension", "Subsidised mess + canteen"],
        source: "https://www.joinindianarmy.nic.in/",
        verifiedAt: "2026-05",
      },
    ],
  },
];

export function findDeepContent(examCode: string): ExamDeepContent | undefined {
  return EXAM_DEEP_CONTENT.find((c) => c.examCode === examCode);
}

/** True when there's at least one populated section to render on the
 *  per-exam page. Lets the renderer cleanly skip the whole "Deep
 *  content" block for exams we haven't authored yet. */
export function hasDeepContent(c: ExamDeepContent | undefined): boolean {
  if (!c) return false;
  return Boolean(
    c.eligibility ||
      (c.cutoffs && c.cutoffs.length > 0) ||
      c.paperAnalysis ||
      (c.salaryBands && c.salaryBands.length > 0),
  );
}
