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

  // ════════════════════════════════════════════════════════════════
  // BATCH 2 — Banking, Teaching, remaining SSC
  // ════════════════════════════════════════════════════════════════

  // ─── SBI PO — State Bank of India Probationary Officer ──────────
  {
    examCode: "SBI_PO",
    oneLiner:
      "Recruitment to Probationary Officer in State Bank of India — the largest public-sector bank in India by branch network and assets.",
    eligibility: {
      ageMin: 21,
      ageMax: 30,
      ageNotes: "Reference date is 1 April of the exam year. Relaxation: OBC +3, SC/ST +5, PwBD +10.",
      education: "Bachelor's degree in any discipline from a recognised university.",
      educationDetails: [
        "Final-year students CAN appear, but must submit proof of graduation before the date specified in the call letter.",
        "Integrated dual-degree (5-year) candidates are eligible as long as they meet the cut-off date.",
      ],
      attempts:
        "General: 4 attempts. OBC: 7 attempts. SC/ST/PwBD: no limit (within upper age).",
      nationality:
        "Indian citizen (or specified categories — Nepal/Bhutan subjects, Tibetan refugees pre-1962, PIOs with eligibility certificate).",
      source: "https://sbi.co.in/web/careers/current-openings",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Prelims cutoff — overall (qualifying for Mains)",
        outOf: "100 marks",
        rows: [
          { year: 2024, category: "General", cutoff: "55.0 – 58.5" },
          { year: 2024, category: "OBC", cutoff: "52.5 – 55.75" },
          { year: 2024, category: "EWS", cutoff: "54.75 – 57.5" },
          { year: 2024, category: "SC", cutoff: "46.0 – 50.25" },
          { year: 2024, category: "ST", cutoff: "39.5 – 47.0" },
        ],
        notes:
          "SBI doesn't publish sectional cutoffs the way IBPS does — only an overall cutoff. Range shown is regional variation.",
        source: "https://sbi.co.in/web/careers",
        verifiedAt: "2026-05",
      },
    ],
    paperAnalysis: {
      title: "Prelims paper analysis",
      yearsAnalyzed: "2022-2024",
      totalMarks: 100,
      topics: [
        { subject: "English Language", topic: "Reading Comprehension (2 passages)", recentMarksAvg: 12, recentMarksMax: 14 },
        { subject: "English Language", topic: "Cloze Test + Error Spotting + Para Jumble", recentMarksAvg: 11, recentMarksMax: 14 },
        { subject: "English Language", topic: "Vocabulary + Sentence Improvement", recentMarksAvg: 7, recentMarksMax: 10 },
        { subject: "Quantitative Aptitude", topic: "Data Interpretation (2-3 sets)", recentMarksAvg: 14, recentMarksMax: 20 },
        { subject: "Quantitative Aptitude", topic: "Arithmetic word problems", recentMarksAvg: 10, recentMarksMax: 14 },
        { subject: "Quantitative Aptitude", topic: "Simplification + Approximation + Number Series", recentMarksAvg: 11, recentMarksMax: 15 },
        { subject: "Reasoning Ability", topic: "Puzzles + Seating Arrangements", recentMarksAvg: 15, recentMarksMax: 20 },
        { subject: "Reasoning Ability", topic: "Inequality + Syllogism + Coding-Decoding", recentMarksAvg: 10, recentMarksMax: 14 },
        { subject: "Reasoning Ability", topic: "Blood Relations + Direction + Order", recentMarksAvg: 6, recentMarksMax: 10 },
      ],
      takeaways: [
        "SBI Prelims is typically harder than IBPS — expect 1-2 difficulty levels above IBPS PO in the same year.",
        "Puzzles + DI together carry ~30% of the paper. Most rank improvement happens here.",
        "Speed reading is non-negotiable for the English RC passages — practise 2-3 RCs daily.",
      ],
      source: "https://sbi.co.in/web/careers",
      verifiedAt: "2026-05",
    },
    salaryBands: [
      {
        postName: "Probationary Officer (Junior Management Grade Scale 1)",
        basicPay: "₹48,480",
        grossPayApprox: "₹65,000 – ₹73,000 (metro, after probation, including DA + HRA + special allowance)",
        perks: [
          "DA (revised quarterly)",
          "HRA / leased accommodation in metro",
          "Medical reimbursement for self + family",
          "Pension under NPS",
          "Concessional rate housing loan + car loan + personal loan",
          "Newspaper, mobile, briefcase allowances",
        ],
        source: "https://www.iba.org.in/iba/news/16659.html",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ─── SBI Clerk — Junior Associate (Customer Support & Sales) ────
  {
    examCode: "SBI_CLERK",
    oneLiner:
      "Recruitment to Junior Associate (Customer Support & Sales) — clerical cadre at State Bank of India branches across India.",
    eligibility: {
      ageMin: 20,
      ageMax: 28,
      ageNotes: "Reference date is 1 April of the exam year. OBC +3, SC/ST +5, PwBD +10.",
      education: "Bachelor's degree in any discipline from a recognised university.",
      educationDetails: [
        "Candidates appearing in the final year/semester can also apply but must produce proof of passing before joining.",
        "Knowledge of the local language of the state applied for is mandatory (tested separately if not part of the qualifying degree).",
      ],
      attempts: "No formal attempt limit other than the upper age cap.",
      nationality:
        "Indian citizen (or specified categories — Nepal/Bhutan subjects, Tibetan refugees pre-1962, PIOs).",
      source: "https://sbi.co.in/web/careers/current-openings",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Prelims cutoff — overall (state-wise variation)",
        outOf: "100 marks",
        rows: [
          { year: 2024, category: "General (typical range)", cutoff: "70 – 87" },
          { year: 2024, category: "OBC", cutoff: "65 – 82" },
          { year: 2024, category: "EWS", cutoff: "68 – 84" },
          { year: 2024, category: "SC", cutoff: "55 – 75" },
          { year: 2024, category: "ST", cutoff: "45 – 70" },
        ],
        notes:
          "SBI Clerk cutoffs vary heavily by state. The lower end is typical for less-populated states; the upper end for Maharashtra, UP, TN, Delhi.",
        source: "https://sbi.co.in/web/careers",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [
      {
        postName: "Junior Associate (Clerk)",
        basicPay: "₹26,730 (revised under 12th BPS w.e.f. 2022)",
        grossPayApprox: "₹36,000 – ₹46,000 (metro, including DA + HRA + transport + special allowance)",
        perks: [
          "DA revised quarterly",
          "HRA / quarters",
          "Medical reimbursement",
          "Pension under NPS",
          "Travel concession every 2 years",
        ],
        source: "https://www.iba.org.in/iba/news/16659.html",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ─── IBPS Clerk — CRP Clerk ─────────────────────────────────────
  {
    examCode: "IBPS_CLERK",
    oneLiner:
      "Common Recruitment Process for Clerical Cadre at 11 participating public-sector banks under IBPS (excluding SBI).",
    eligibility: {
      ageMin: 20,
      ageMax: 28,
      ageNotes: "Reference date is 1 August of the exam year. OBC +3, SC/ST +5, PwBD +10.",
      education: "Bachelor's degree (any discipline) from a recognised university.",
      educationDetails: [
        "Computer literacy is essential — Class X with computer as a subject, or a certificate/diploma in computer applications.",
        "Knowledge of the local language of the state opted for is required; verified through a separate language test if not part of the qualifying degree.",
      ],
      attempts: "No attempt limit other than the upper age cap.",
      nationality:
        "Indian citizen, Nepal/Bhutan subject, Tibetan refugee (pre-1962), or PIO with eligibility certificate.",
      source: "https://www.ibps.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Prelims cutoff — overall (qualifying for Mains)",
        outOf: "100 marks",
        rows: [
          { year: 2024, category: "General (state-wise range)", cutoff: "70 – 79" },
          { year: 2024, category: "OBC", cutoff: "65 – 76" },
          { year: 2024, category: "EWS", cutoff: "68 – 78" },
          { year: 2024, category: "SC", cutoff: "55 – 70" },
          { year: 2024, category: "ST", cutoff: "45 – 65" },
        ],
        notes:
          "Different states have different cutoffs — high-population states (UP, Maharashtra, Bihar) have the highest cutoffs because of competition density.",
        source: "https://www.ibps.in/",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [
      {
        postName: "Clerk (Single Window Operator)",
        basicPay: "₹26,730 (12th BPS w.e.f. 2022)",
        grossPayApprox: "₹32,000 – ₹40,000 (metro, including DA + HRA + transport)",
        perks: ["DA", "HRA", "Medical", "Pension under NPS", "LFC every 2 years"],
        source: "https://www.iba.org.in/iba/news/16659.html",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ─── IBPS RRB — Regional Rural Banks ────────────────────────────
  // Note: this exam isn't seeded in the Exam DB table yet. The deep
  // content sits here ready; once the exam is added to the catalogue
  // the /exams/IBPS_RRB page will automatically pick it up.
  {
    examCode: "IBPS_RRB",
    oneLiner:
      "Common Recruitment Process for Officer Scale I / II / III and Office Assistant posts at 43 Regional Rural Banks across India.",
    eligibility: {
      ageMin: 18,
      ageMax: 40,
      ageNotes:
        "Office Assistant + Officer Scale I: 18-30 (Scale I has min age 20). Officer Scale II: 21-32. Officer Scale III: 21-40.",
      education:
        "Office Assistant: Bachelor's, any discipline. Officer Scale I: Bachelor's. Officer Scale II/III: Bachelor's + experience in banking / finance / agriculture.",
      educationDetails: [
        "Proficiency in the local language of the state opted for is mandatory.",
        "Officer Scale II Specialist Officer cadre needs the specific professional qualification (CA, MBA, etc.) for the role.",
      ],
      attempts: "No attempt limit other than the upper age cap.",
      nationality: "Indian citizen (or specified categories per IBPS rules).",
      source: "https://www.ibps.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Officer Scale I — Prelims cutoff (state-wise range, 2024)",
        outOf: "80 marks",
        rows: [
          { year: 2024, category: "General", cutoff: "52 – 67" },
          { year: 2024, category: "OBC", cutoff: "48 – 64" },
          { year: 2024, category: "SC", cutoff: "42 – 56" },
          { year: 2024, category: "ST", cutoff: "32 – 50" },
        ],
        notes:
          "RRB cutoffs vary widely by state — Kerala, TN and Maharashtra usually see the highest cutoffs; J&K, North-East states the lowest.",
        source: "https://www.ibps.in/",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [
      {
        postName: "Officer Scale I",
        basicPay: "₹36,000 – ₹38,500 (typical starting basic under 12th BPS)",
        grossPayApprox: "₹45,000 – ₹55,000 (metro, including DA + HRA + special allowance)",
        perks: ["DA", "HRA / quarters", "Medical", "Pension under NPS", "Two-wheeler / four-wheeler allowance in some RRBs"],
        source: "https://www.iba.org.in/",
        verifiedAt: "2026-05",
      },
      {
        postName: "Office Assistant (Multipurpose)",
        basicPay: "₹17,900 – ₹19,700 (typical starting basic)",
        grossPayApprox: "₹25,000 – ₹32,000",
        source: "https://www.iba.org.in/",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ─── RBI Grade B — Reserve Bank of India Officer ────────────────
  // Note: this exam isn't seeded in the Exam DB table yet. The deep
  // content sits here ready; once the exam is added to the catalogue
  // the /exams/RBI_GRADE_B page will automatically pick it up.
  {
    examCode: "RBI_GRADE_B",
    oneLiner:
      "Recruitment to Officer in Grade B (DR) — General + DEPR + DSIM streams — at the Reserve Bank of India, India's central bank.",
    eligibility: {
      ageMin: 21,
      ageMax: 30,
      ageNotes:
        "Reference date is 1 July of the exam year. M.Phil holders: +2 years; Ph.D: +4 years; experience in central / state govt or PSB: +3 to 5 years.",
      education:
        "General stream: Bachelor's with 60% (50% for SC/ST/PwBD), OR Master's with 55% (50% reserved). DEPR / DSIM streams need specific Economics / Statistics master's qualifications.",
      educationDetails: [
        "DEPR: Master's in Economics / Econometrics / Quantitative Economics / Math Economics / Integrated Economics with 55%.",
        "DSIM: Master's in Statistics / Math Statistics / Math Economics / Econometrics / Statistics + a quantitative discipline.",
      ],
      attempts: "General: 6 attempts. SC/ST/PwBD: unlimited within upper age.",
      nationality: "Indian citizen (or specified categories).",
      source: "https://opportunities.rbi.org.in/Scripts/bs_viewcontent.aspx?Id=4519",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Phase 1 cutoff (qualifying for Phase 2)",
        outOf: "200 marks",
        rows: [
          { year: 2024, category: "General", cutoff: "~110 – 118" },
          { year: 2024, category: "OBC", cutoff: "~105 – 113" },
          { year: 2024, category: "EWS", cutoff: "~107 – 115" },
          { year: 2024, category: "SC", cutoff: "~95 – 105" },
          { year: 2024, category: "ST", cutoff: "~88 – 100" },
        ],
        notes:
          "RBI publishes cutoffs after each cycle. Sectional cutoffs apply (GA, English, Quant, Reasoning) — typically 40% each section, 50% aggregate.",
        source: "https://opportunities.rbi.org.in/",
        verifiedAt: "2026-05",
      },
    ],
    paperAnalysis: {
      title: "Phase 1 paper analysis",
      yearsAnalyzed: "2022-2024",
      totalMarks: 200,
      topics: [
        { subject: "General Awareness", topic: "Banking + Financial Awareness (RBI functions, monetary policy)", recentMarksAvg: 40, recentMarksMax: 50 },
        { subject: "General Awareness", topic: "Current Affairs (national + international, 12 months)", recentMarksAvg: 30, recentMarksMax: 40 },
        { subject: "General Awareness", topic: "Static GK + Indian Polity + Economic Survey", recentMarksAvg: 10, recentMarksMax: 16 },
        { subject: "Quantitative Aptitude", topic: "Data Interpretation + Arithmetic", recentMarksAvg: 22, recentMarksMax: 28 },
        { subject: "Quantitative Aptitude", topic: "Number Series + Simplification + Algebra basics", recentMarksAvg: 8, recentMarksMax: 12 },
        { subject: "English Language", topic: "Reading Comprehension + Cloze Test + Error Spotting", recentMarksAvg: 20, recentMarksMax: 26 },
        { subject: "English Language", topic: "Para Jumble + Sentence Improvement + Vocabulary", recentMarksAvg: 10, recentMarksMax: 14 },
        { subject: "Reasoning Ability", topic: "Puzzles + Seating Arrangements", recentMarksAvg: 35, recentMarksMax: 45 },
        { subject: "Reasoning Ability", topic: "Critical Reasoning + Input-Output + Coding", recentMarksAvg: 25, recentMarksMax: 35 },
      ],
      takeaways: [
        "General Awareness — with strong focus on Banking & Finance — is the section that decides who clears RBI Phase 1. The static + dynamic split here is wider than any other banking exam.",
        "Phase 2 (descriptive Economic & Social Issues + Finance & Management) is the actual differentiator — Phase 1 is a high cut-off filter.",
        "RBI Grade B reading list (Economic Survey, RBI Annual Report, PIB Finance) is non-negotiable. Most clearers report 4-6 months of dedicated current-affairs reading.",
      ],
      source: "https://opportunities.rbi.org.in/",
      verifiedAt: "2026-05",
    },
    salaryBands: [
      {
        postName: "Officer in Grade B (DR) — entry",
        basicPay: "₹55,200",
        grossPayApprox: "₹1,16,000 – ₹1,25,000 (metro, including DA + HRA + transport + grade allowance + special allowance)",
        perks: [
          "DA (revised quarterly)",
          "HRA / Bank quarters",
          "Medical for self + family + dependent parents",
          "Education allowance",
          "Pension under NPS",
          "Concessional housing + car + personal loans",
          "Group savings linked insurance",
        ],
        source: "https://opportunities.rbi.org.in/",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ─── SSC CHSL — Combined Higher Secondary Level ─────────────────
  {
    examCode: "SSC_CHSL",
    oneLiner:
      "12th-pass-level recruitment to Lower Division Clerk, Junior Secretariat Assistant, Postal Assistant and Data Entry Operator posts across central government departments.",
    eligibility: {
      ageMin: 18,
      ageMax: 27,
      ageNotes: "Reference date is 1 January of the exam year. OBC +3, SC/ST +5, PwBD +10.",
      education: "Class 12 (10+2) pass or equivalent from a recognised board.",
      educationDetails: [
        "For DEO post in O/o C&AG: 12th must include Mathematics + Science as core subjects.",
        "Typing speed of 35 wpm English / 30 wpm Hindi is required for DEO + LDC posts — tested at Tier 2.",
      ],
      attempts: "No formal attempt limit.",
      nationality: "Indian citizen (or specified categories per SSC rules).",
      source: "https://ssc.nic.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Tier 1 cutoff (final qualification post Tier 2 + skill test)",
        outOf: "200 marks",
        rows: [
          { year: 2024, category: "General — LDC/JSA", cutoff: "151 – 158" },
          { year: 2024, category: "General — Postal Assistant", cutoff: "152 – 160" },
          { year: 2024, category: "General — DEO", cutoff: "165 – 172" },
          { year: 2024, category: "OBC", cutoff: "143 – 152" },
          { year: 2024, category: "EWS", cutoff: "140 – 150" },
          { year: 2024, category: "SC", cutoff: "130 – 140" },
          { year: 2024, category: "ST", cutoff: "120 – 132" },
        ],
        notes:
          "CHSL cutoffs vary by post — DEO consistently has the highest cutoff because of fewer vacancies + typing speed requirement.",
        source: "https://ssc.nic.in/Portal/Notices",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [
      {
        postName: "Data Entry Operator (DEO) Grade C — C&AG",
        payLevel: "Pay Level 4 / 5",
        basicPay: "₹25,500 – ₹29,200",
        grossPayApprox: "₹37,000 – ₹46,000 (X-class city, including DA + HRA + TA)",
        source: "https://doe.gov.in/order-circular/order-implementation-recommendations-7th-cpc-pay",
        verifiedAt: "2026-05",
      },
      {
        postName: "Lower Division Clerk (LDC) / Junior Secretariat Assistant",
        payLevel: "Pay Level 2",
        basicPay: "₹19,900",
        grossPayApprox: "₹29,000 – ₹36,000 (X-class city)",
        source: "https://doe.gov.in/order-circular/order-implementation-recommendations-7th-cpc-pay",
        verifiedAt: "2026-05",
      },
      {
        postName: "Postal Assistant / Sorting Assistant",
        payLevel: "Pay Level 4",
        basicPay: "₹25,500",
        grossPayApprox: "₹37,000 – ₹45,000 (X-class city)",
        source: "https://doe.gov.in/order-circular/order-implementation-recommendations-7th-cpc-pay",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ─── SSC MTS — Multi-Tasking Staff ──────────────────────────────
  {
    examCode: "SSC_MTS",
    oneLiner:
      "10th-pass-level recruitment to Multi-Tasking (Non-Technical) Staff and Havaldar (in CBIC + CBN) posts across central departments.",
    eligibility: {
      ageMin: 18,
      ageMax: 25,
      ageNotes:
        "MTS: 18-25 (some posts up to 27). Havaldar in CBIC/CBN: 18-27. OBC +3, SC/ST +5, PwBD +10.",
      education: "Class 10 (Matriculation) pass from a recognised board.",
      educationDetails: [
        "Havaldar posts have physical standards (height, chest, walking, cycling tests) over and above the written exam.",
      ],
      attempts: "No formal attempt limit.",
      nationality: "Indian citizen (or specified categories).",
      source: "https://ssc.nic.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Tier 1 cutoff (qualifying for Tier 2 / PET)",
        outOf: "270 marks",
        rows: [
          { year: 2024, category: "General — MTS", cutoff: "150 – 175 (region-wise)" },
          { year: 2024, category: "General — Havaldar", cutoff: "175 – 200" },
          { year: 2024, category: "OBC — MTS", cutoff: "140 – 165" },
          { year: 2024, category: "SC — MTS", cutoff: "125 – 150" },
          { year: 2024, category: "ST — MTS", cutoff: "115 – 145" },
        ],
        notes:
          "MTS is region-specific; cutoffs vary by zone. Havaldar uses the same paper but has an additional Physical Efficiency Test (PET).",
        source: "https://ssc.nic.in/Portal/Notices",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [
      {
        postName: "Multi-Tasking Staff (Non-Technical)",
        payLevel: "Pay Level 1",
        basicPay: "₹18,000",
        grossPayApprox: "₹25,000 – ₹32,000 (X-class city)",
        perks: ["DA, HRA, TA", "Medical (CGHS)", "Pension under NPS"],
        source: "https://doe.gov.in/order-circular/order-implementation-recommendations-7th-cpc-pay",
        verifiedAt: "2026-05",
      },
      {
        postName: "Havaldar (CBIC / CBN)",
        payLevel: "Pay Level 1",
        basicPay: "₹18,000",
        grossPayApprox: "₹28,000 – ₹35,000 (X-class city, includes departmental allowance)",
        source: "https://www.cbic.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ─── SSC GD — General Duty Constable ────────────────────────────
  {
    examCode: "SSC_GD",
    oneLiner:
      "Constable (General Duty) recruitment to BSF, CISF, CRPF, ITBP, SSB, AR (Assam Rifles) and SSF — paramilitary and border forces.",
    eligibility: {
      ageMin: 18,
      ageMax: 23,
      ageNotes: "Reference date is 1 January of the exam year. OBC +3, SC/ST +5.",
      education: "Class 10 (Matriculation) pass from a recognised board.",
      educationDetails: [
        "Physical Standards: minimum height 170 cm (males general, with relaxations for hill / North-East / specific tribes), 157 cm (females general).",
        "Physical Efficiency Test (PET): 5 km run in 24 min (males) / 1.6 km run in 8.5 min (females).",
        "Medical examination follows PET — all standard CAPF medical norms apply.",
      ],
      attempts: "No formal attempt limit.",
      nationality: "Indian citizen.",
      source: "https://ssc.nic.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "CBE cutoff (qualifying for PET/PST/Medical)",
        outOf: "160 marks",
        rows: [
          { year: 2024, category: "General — BSF Male", cutoff: "102 – 110" },
          { year: 2024, category: "General — CRPF Male", cutoff: "100 – 108" },
          { year: 2024, category: "General — CISF Male", cutoff: "95 – 104" },
          { year: 2024, category: "General — Female (all forces avg)", cutoff: "92 – 100" },
          { year: 2024, category: "OBC", cutoff: "92 – 102" },
          { year: 2024, category: "SC", cutoff: "82 – 95" },
          { year: 2024, category: "ST", cutoff: "75 – 90" },
        ],
        notes:
          "Cutoffs vary by force AND state — high-altitude / border postings often have separate quotas.",
        source: "https://ssc.nic.in/Portal/Notices",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [
      {
        postName: "Constable (General Duty) — BSF / CISF / CRPF / ITBP / SSB",
        payLevel: "Pay Level 3",
        basicPay: "₹21,700",
        grossPayApprox: "₹33,000 – ₹42,000 (depending on posting — field area gets additional allowances)",
        perks: [
          "Free rations + uniform",
          "Free accommodation in barracks / family quarters",
          "Risk + Hardship allowance for field postings",
          "Medical for self + family",
          "Pension under NPS",
          "LTC every 2 years",
          "Group insurance",
        ],
        source: "https://www.bsf.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ─── CTET — Central Teacher Eligibility Test ────────────────────
  {
    examCode: "CTET",
    oneLiner:
      "Mandatory eligibility certification under the Right to Education Act for teaching Class 1-8 in central government schools (KVS, NVS, EMRS) and Delhi NCT schools.",
    eligibility: {
      ageNotes:
        "No upper or lower age limit — CTET is a qualifying exam, not a recruitment exam. Age requirements apply only when applying for specific teaching jobs.",
      education:
        "Paper 1 (Class 1-5): 12th pass (50%) + D.El.Ed. OR Bachelor's + D.El.Ed. OR Bachelor's + B.Ed. (special). Paper 2 (Class 6-8): Bachelor's + B.Ed. OR specific equivalents.",
      educationDetails: [
        "D.El.Ed. = Diploma in Elementary Education (2 years).",
        "B.Ed. = Bachelor of Education (2 years post-graduation).",
        "Final-year B.Ed. / D.El.Ed. students may appear for CTET.",
        "Different concessions for SC/ST/OBC/PwBD — typically 5% relaxation in qualifying degree marks.",
      ],
      attempts: "Unlimited.",
      nationality: "Indian citizen.",
      source: "https://ctet.nic.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Qualifying marks (CTET certificate validity)",
        outOf: "150 marks per paper",
        rows: [
          { year: 2024, category: "General — Paper 1 (Class 1-5)", cutoff: "90/150 (60%)" },
          { year: 2024, category: "General — Paper 2 (Class 6-8)", cutoff: "90/150 (60%)" },
          { year: 2024, category: "SC / ST / OBC / PwBD", cutoff: "82-83/150 (55%)" },
        ],
        notes:
          "CTET certificate is valid for life (per 2021 NCTE notification — earlier 7-year validity has been removed).",
        source: "https://ctet.nic.in/",
        verifiedAt: "2026-05",
      },
    ],
    paperAnalysis: {
      title: "CTET Paper 1 (Class 1-5) — section weightage",
      yearsAnalyzed: "2022-2024",
      totalMarks: 150,
      topics: [
        { subject: "Child Development & Pedagogy", topic: "Concept of development + learning + theories (Piaget, Vygotsky, etc.)", recentMarksAvg: 16, recentMarksMax: 18 },
        { subject: "Child Development & Pedagogy", topic: "Inclusive education + special needs", recentMarksAvg: 8, recentMarksMax: 12 },
        { subject: "Child Development & Pedagogy", topic: "Pedagogy + Assessment", recentMarksAvg: 6, recentMarksMax: 10 },
        { subject: "Language I", topic: "Comprehension + Pedagogy of language development", recentMarksAvg: 30, recentMarksMax: 30 },
        { subject: "Language II", topic: "Comprehension + Pedagogy of language development", recentMarksAvg: 30, recentMarksMax: 30 },
        { subject: "Mathematics", topic: "Number system + Geometry + Measurement + Data handling", recentMarksAvg: 20, recentMarksMax: 24 },
        { subject: "Mathematics", topic: "Pedagogical issues in teaching maths to Class 1-5", recentMarksAvg: 10, recentMarksMax: 12 },
        { subject: "Environmental Studies", topic: "Family + Friends, Food, Shelter, Water, Travel, Things we make", recentMarksAvg: 20, recentMarksMax: 24 },
        { subject: "Environmental Studies", topic: "EVS pedagogy", recentMarksAvg: 10, recentMarksMax: 12 },
      ],
      takeaways: [
        "Child Development & Pedagogy is the highest-leverage section — strong CDP can offset a weaker subject paper.",
        "Both Language papers are independent — pick one as Language I (must score in pedagogy + comprehension) and a different one as Language II.",
        "EVS questions at the primary level draw heavily from NCERT Class 3-5 Looking Around / Aas-Paas books — direct reading pays off.",
      ],
      source: "https://ctet.nic.in/",
      verifiedAt: "2026-05",
    },
    salaryBands: [
      {
        postName: "PRT (Primary Teacher) in KVS / NVS / Delhi schools (post recruitment)",
        payLevel: "Pay Level 6",
        basicPay: "₹35,400",
        grossPayApprox: "₹52,000 – ₹61,000 (X-class city, including DA + HRA + TA)",
        perks: ["DA", "HRA", "Education concession for own children", "Medical (CGHS)", "Pension under NPS"],
        source: "https://kvsangathan.nic.in/",
        verifiedAt: "2026-05",
      },
      {
        postName: "TGT (Trained Graduate Teacher) — for Paper 2 qualifiers + degree",
        payLevel: "Pay Level 7",
        basicPay: "₹44,900",
        grossPayApprox: "₹62,000 – ₹74,000 (X-class city)",
        source: "https://kvsangathan.nic.in/",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ─── UPTET — UP Teacher Eligibility Test ────────────────────────
  // Note: DB exam code is UP_UPTET (the state-prefixed convention used
  // throughout the catalogue). We match that here.
  {
    examCode: "UP_UPTET",
    oneLiner:
      "Teacher Eligibility Test conducted by UPBEB for primary (Class 1-5) and upper-primary (Class 6-8) teacher recruitment in Uttar Pradesh government and aided schools.",
    eligibility: {
      ageNotes: "No upper age limit for UPTET itself (qualifying exam). Recruitment exams have separate age limits.",
      education:
        "Paper 1 (Class 1-5): 12th 50% + D.El.Ed. (BTC) OR Bachelor's + 2-year D.El.Ed. Paper 2 (Class 6-8): Bachelor's + B.Ed. OR equivalent.",
      educationDetails: [
        "Candidates must have Hindi as a compulsory subject for both papers.",
        "Final-year B.Ed./D.El.Ed. candidates may appear.",
      ],
      attempts: "Unlimited.",
      nationality: "Indian citizen; UP-domicile preferred for subsequent recruitment but UPTET itself open to all.",
      source: "https://updeled.gov.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Qualifying marks (UPTET certificate)",
        outOf: "150 marks per paper",
        rows: [
          { year: 2024, category: "General", cutoff: "90/150 (60%)" },
          { year: 2024, category: "OBC / SC / ST / PwBD", cutoff: "82-83/150 (55%)" },
        ],
        notes:
          "Validity of UPTET certificate is lifelong (aligned with the 2021 NCTE change for CTET).",
        source: "https://updeled.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [
      {
        postName: "Assistant Teacher — Primary (Class 1-5) in UP Basic Education",
        basicPay: "₹35,400 (entry, Pay Level 6 equivalent under UP pay matrix)",
        grossPayApprox: "₹45,000 – ₹52,000 (depending on posting)",
        perks: ["DA as per UP govt", "HRA", "Medical reimbursement", "Pension under UP State NPS"],
        source: "https://updeled.gov.in/",
        verifiedAt: "2026-05",
      },
      {
        postName: "Assistant Teacher — Upper Primary (Class 6-8)",
        basicPay: "₹44,900 (entry, Pay Level 7 equivalent)",
        grossPayApprox: "₹56,000 – ₹65,000",
        source: "https://updeled.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // BATCH 3 — State Public Service Commissions
  // ════════════════════════════════════════════════════════════════

  // ─── MPSC Rajyaseva — Maharashtra State Service Exam ────────────
  {
    examCode: "MH_MPSC_RAJYASEVA",
    oneLiner:
      "Maharashtra PSC State Service Examination — gateway to Deputy Collector (DyC), Deputy Superintendent of Police (DySP), Tahsildar, BDO and 25+ other Class A/B posts in the Maharashtra government.",
    eligibility: {
      ageMin: 19,
      ageMax: 38,
      ageNotes:
        "19-38 for General. Upper age relaxed: OBC +3, SC/ST/NT/SBC +5, PwBD +10, ex-servicemen 3 yrs after service deduction. Reference date is 1 April of the exam year.",
      education: "Bachelor's degree (any discipline) from a recognised university. Final-year graduating students can apply for Prelims but must produce the degree before Mains.",
      attempts:
        "General: 6 attempts. OBC: 9 attempts. SC/ST/PwBD: unlimited within upper age.",
      nationality: "Indian citizen.",
      specialConstraints: [
        "Marathi-language proficiency is required for certain interview-stage posts. Hindi knowledge is also assessed for some posts.",
        "Domicile of Maharashtra preferred for reservation benefits; open-merit posts are open to all Indians.",
      ],
      source: "https://mpsc.gov.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Prelims cutoff (qualifying for Mains)",
        outOf: "400 marks (Paper 1 + Paper 2 combined; Paper 2 / CSAT is qualifying at 33%)",
        rows: [
          { year: 2023, category: "General", cutoff: "~218 – 224 (open merit, post-wise)" },
          { year: 2023, category: "OBC", cutoff: "~210 – 218" },
          { year: 2023, category: "EWS", cutoff: "~206 – 215" },
          { year: 2023, category: "SC", cutoff: "~196 – 206" },
          { year: 2023, category: "ST", cutoff: "~188 – 200" },
          { year: 2022, category: "General", cutoff: "~225 – 232" },
          { year: 2022, category: "OBC", cutoff: "~218 – 226" },
        ],
        notes:
          "MPSC publishes post-wise cutoffs (DyC, DySP, Tahsildar each different). Range shown spans those posts.",
        source: "https://mpsc.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [
      {
        postName: "Deputy Collector / DySP / DCT (Class I — entry)",
        payLevel: "Pay Level S-20 (Maharashtra)",
        basicPay: "₹56,100",
        grossPayApprox: "₹93,000 – ₹1,05,000 (X-class city, after probation)",
        perks: [
          "Government accommodation (entitled type)",
          "Official vehicle for DyC/DySP posts",
          "Medical for self + family",
          "Maharashtra State NPS",
          "LTC",
        ],
        source: "https://mpsc.gov.in/",
        verifiedAt: "2026-05",
      },
      {
        postName: "Tahsildar / Block Development Officer / Class II posts",
        payLevel: "Pay Level S-17 (Maharashtra)",
        basicPay: "₹47,600",
        grossPayApprox: "₹74,000 – ₹85,000",
        source: "https://mpsc.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ─── TNPSC Group 1 — Tamil Nadu top-tier ────────────────────────
  {
    examCode: "TN_TNPSC_GROUP1",
    oneLiner:
      "Tamil Nadu PSC Group 1 services — Deputy Collector, Deputy Superintendent of Police (DySP), Assistant Commissioner (Commercial Taxes) and 30+ other state services posts.",
    eligibility: {
      ageMin: 21,
      ageMax: 32,
      ageNotes:
        "21-32 for General (no upper limit for SC/ST/SCA/MBC/BC). Reference date is 1 July of the exam year.",
      education: "Bachelor's degree (any discipline) from a recognised university.",
      educationDetails: [
        "Knowledge of Tamil is mandatory — verified via the Tamil Eligibility Test, the qualifying paper.",
        "Final-year graduating students can apply.",
      ],
      attempts:
        "Unlimited attempts (within upper age cap for General; no upper age for SC/ST/SCA/MBC/BC).",
      nationality: "Indian citizen.",
      source: "https://www.tnpsc.gov.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Prelims cutoff (qualifying for Mains)",
        outOf: "300 marks (Paper 1 — GS)",
        rows: [
          { year: 2023, category: "General", cutoff: "~195 – 205" },
          { year: 2023, category: "BC", cutoff: "~185 – 195" },
          { year: 2023, category: "MBC / DC", cutoff: "~175 – 188" },
          { year: 2023, category: "SC", cutoff: "~160 – 175" },
          { year: 2023, category: "ST", cutoff: "~140 – 160" },
        ],
        notes:
          "TNPSC publishes minimum qualifying marks rather than precise cutoffs in some cycles; ranges here are inferred from notifications + topper interviews.",
        source: "https://www.tnpsc.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [
      {
        postName: "Deputy Collector (TN State Service)",
        payLevel: "Pay Level 22 (Tamil Nadu)",
        basicPay: "₹56,100",
        grossPayApprox: "₹93,000 – ₹1,05,000 (Chennai, after probation)",
        perks: ["Government quarters", "Vehicle", "Medical", "TN State NPS", "LTC"],
        source: "https://www.tnpsc.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ─── TNPSC Group 2 — Tamil Nadu mid-tier ────────────────────────
  {
    examCode: "TN_TNPSC_GROUP2",
    oneLiner:
      "Tamil Nadu PSC Group 2 services — Assistant Section Officer, Sub-Registrar, Inspector (various departments), Assistant Inspector of Labour and other Class II/III posts.",
    eligibility: {
      ageMin: 18,
      ageMax: 32,
      ageNotes:
        "18-32 for General (no upper limit for SC/ST/SCA/MBC/BC). 21-32 for posts requiring graduation. Reference date is 1 July of the exam year.",
      education:
        "Bachelor's degree for Group 2 (interview-mandatory posts). Class 12 / equivalent for Group 2A (non-interview posts) in some recruitment cycles.",
      attempts: "Unlimited attempts (within upper age cap for General; unlimited for reserved categories).",
      nationality: "Indian citizen.",
      source: "https://www.tnpsc.gov.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Prelims cutoff (qualifying for Mains, Group 2 interview post)",
        outOf: "300 marks",
        rows: [
          { year: 2023, category: "General", cutoff: "~180 – 195" },
          { year: 2023, category: "BC", cutoff: "~170 – 185" },
          { year: 2023, category: "MBC", cutoff: "~160 – 175" },
          { year: 2023, category: "SC", cutoff: "~145 – 160" },
          { year: 2023, category: "ST", cutoff: "~125 – 145" },
        ],
        source: "https://www.tnpsc.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [
      {
        postName: "Assistant Section Officer / Sub-Registrar / Inspector (Group 2)",
        payLevel: "Pay Level 16 – 19 (Tamil Nadu)",
        basicPay: "₹36,400 – ₹47,600",
        grossPayApprox: "₹55,000 – ₹75,000 (Chennai)",
        source: "https://www.tnpsc.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ─── UPPSC PCS — UP Provincial Civil Services ───────────────────
  {
    examCode: "UP_UPPSC_PCS",
    oneLiner:
      "Uttar Pradesh PCS — Combined State Civil Services Examination for Deputy Collector (SDM), DySP, Block Development Officer, Treasury Officer and 30+ other state-cadre posts.",
    eligibility: {
      ageMin: 21,
      ageMax: 40,
      ageNotes:
        "21-40 for General (raised from 35 to 40 in 2022). OBC: 21-43. SC/ST: 21-45. PwBD: +15 years. Reference date is 1 July of the exam year.",
      education: "Bachelor's degree (any discipline) from a recognised university. Final-year graduating students can apply for Prelims.",
      attempts: "No formal attempt limit — limited only by upper age cap.",
      nationality: "Indian citizen.",
      source: "https://uppsc.up.nic.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Prelims GS Paper 1 cutoff (qualifying for Mains)",
        outOf: "200 marks (Paper 1 — Paper 2 / CSAT is qualifying at 33%)",
        rows: [
          { year: 2023, category: "General", cutoff: "118.5" },
          { year: 2023, category: "OBC", cutoff: "117.5" },
          { year: 2023, category: "EWS", cutoff: "115.5" },
          { year: 2023, category: "SC", cutoff: "108.5" },
          { year: 2023, category: "ST", cutoff: "95.5" },
          { year: 2022, category: "General", cutoff: "127.5" },
          { year: 2022, category: "OBC", cutoff: "125.5" },
          { year: 2022, category: "SC", cutoff: "115.5" },
          { year: 2022, category: "ST", cutoff: "98.0" },
        ],
        source: "https://uppsc.up.nic.in/",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [
      {
        postName: "Deputy Collector / SDM (UP PCS)",
        payLevel: "Pay Level 10 (UP)",
        basicPay: "₹56,100",
        grossPayApprox: "₹85,000 – ₹95,000 (Lucknow/metro, after probation)",
        perks: ["Government accommodation (entitled)", "Official vehicle", "Medical", "UP State NPS", "LTC"],
        source: "https://uppsc.up.nic.in/",
        verifiedAt: "2026-05",
      },
      {
        postName: "Block Development Officer / Treasury Officer (PCS)",
        payLevel: "Pay Level 9",
        basicPay: "₹53,100",
        grossPayApprox: "₹78,000 – ₹88,000",
        source: "https://uppsc.up.nic.in/",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ─── BPSC CCE — Bihar PSC Combined Competitive Exam ─────────────
  {
    examCode: "BR_BPSC_CCE",
    oneLiner:
      "Bihar PSC Combined Competitive Examination — recruitment to SDM, DySP, BDO, Revenue Officer and other Class A/B services across Bihar.",
    eligibility: {
      ageMin: 22,
      ageMax: 37,
      ageNotes:
        "22-37 for General Male (upper limit relaxed to 40 for General Female / BC / EWS, 42 for BC/EBC Female, 42 for SC/ST). Reference date varies — see latest notification.",
      education: "Bachelor's degree (any discipline) from a recognised university.",
      attempts: "No formal attempt limit other than the upper age cap.",
      nationality: "Indian citizen.",
      specialConstraints: [
        "Domicile of Bihar required for state-specific posts (most posts).",
        "Hindi knowledge tested at the interview stage for certain posts.",
      ],
      source: "https://www.bpsc.bih.nic.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Prelims cutoff (qualifying for Mains)",
        outOf: "150 marks",
        rows: [
          { year: 2024, category: "General — 70th BPSC", cutoff: "~85 – 92" },
          { year: 2024, category: "BC", cutoff: "~80 – 88" },
          { year: 2024, category: "EBC", cutoff: "~78 – 85" },
          { year: 2024, category: "SC", cutoff: "~65 – 75" },
          { year: 2024, category: "ST", cutoff: "~60 – 70" },
          { year: 2023, category: "General — 68th/69th BPSC", cutoff: "~95 – 100" },
          { year: 2023, category: "BC", cutoff: "~88 – 95" },
        ],
        source: "https://www.bpsc.bih.nic.in/",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [
      {
        postName: "SDM / DCLR / Senior Class A officer",
        payLevel: "Pay Level 9 (Bihar)",
        basicPay: "₹53,100",
        grossPayApprox: "₹78,000 – ₹90,000 (Patna, after probation)",
        source: "https://www.bpsc.bih.nic.in/",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ─── RPSC RAS — Rajasthan Administrative Service ────────────────
  {
    examCode: "RJ_RPSC_RAS",
    oneLiner:
      "Rajasthan PSC Combined State + Subordinate Services Examination — RAS (Rajasthan Administrative Service), RPS (Police Service), RFS (Forest Service) and 25+ other state-cadre posts.",
    eligibility: {
      ageMin: 21,
      ageMax: 40,
      ageNotes:
        "21-40 for General. Age relaxation: OBC/SC/ST/Women — varies (max 45 for state govt employees, women, SC/ST). Reference date is 1 January of the year next to exam year.",
      education: "Bachelor's degree (any discipline) from a recognised university.",
      attempts: "No formal attempt limit other than the upper age cap.",
      nationality: "Indian citizen.",
      specialConstraints: ["Devnagri (Hindi) proficiency required at the Mains stage."],
      source: "https://rpsc.rajasthan.gov.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Prelims cutoff (qualifying for Mains)",
        outOf: "200 marks",
        rows: [
          { year: 2023, category: "General", cutoff: "78 – 82" },
          { year: 2023, category: "OBC", cutoff: "76 – 80" },
          { year: 2023, category: "EWS", cutoff: "74 – 78" },
          { year: 2023, category: "SC", cutoff: "68 – 72" },
          { year: 2023, category: "ST", cutoff: "62 – 68" },
          { year: 2021, category: "General", cutoff: "87.8" },
          { year: 2021, category: "OBC", cutoff: "85.3" },
        ],
        source: "https://rpsc.rajasthan.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [
      {
        postName: "RAS — Sub-Divisional Officer (Revenue) / Tehsildar (entry)",
        payLevel: "Pay Level L-14 (Rajasthan)",
        basicPay: "₹56,100",
        grossPayApprox: "₹85,000 – ₹95,000 (Jaipur, after probation)",
        source: "https://rpsc.rajasthan.gov.in/",
        verifiedAt: "2026-05",
      },
      {
        postName: "RPS (Rajasthan Police Service) / DySP",
        payLevel: "Pay Level L-14",
        basicPay: "₹56,100",
        grossPayApprox: "₹85,000 – ₹95,000",
        source: "https://rpsc.rajasthan.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ─── WBCS — West Bengal Civil Service ───────────────────────────
  {
    examCode: "WB_WBCS",
    oneLiner:
      "West Bengal Civil Service (Executive) and allied services — gateway to WBCS (Exe), WBPS (West Bengal Police Service), Joint BDO, Sub-Registrar and other Class A/B posts.",
    eligibility: {
      ageMin: 21,
      ageMax: 36,
      ageNotes:
        "21-36 for Group A & B (General). 21-39 for Group C and D (lower-level). Upper age relaxed: OBC +3, SC/ST +5, PwBD +8, Ex-servicemen 3 years after service deduction.",
      education: "Bachelor's degree (any discipline) from a recognised university.",
      educationDetails: [
        "Bengali language paper (compulsory Bengali) at Mains stage. Candidates who studied Bengali up to Class 8 or beyond are eligible.",
        "Candidates not having Bengali as a language paper at school can apply but must qualify the Bengali Mains paper.",
      ],
      attempts: "No formal attempt limit other than the upper age cap.",
      nationality: "Indian citizen.",
      source: "https://wbpsc.gov.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Prelims cutoff (qualifying for Mains, Group A & B)",
        outOf: "200 marks",
        rows: [
          { year: 2023, category: "General", cutoff: "~143 – 150" },
          { year: 2023, category: "OBC-A", cutoff: "~135 – 142" },
          { year: 2023, category: "OBC-B", cutoff: "~132 – 140" },
          { year: 2023, category: "SC", cutoff: "~115 – 125" },
          { year: 2023, category: "ST", cutoff: "~105 – 115" },
        ],
        source: "https://wbpsc.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [
      {
        postName: "WBCS Group A — Deputy Magistrate / SDO (entry)",
        payLevel: "Pay Level 16 (West Bengal ROPA 2019)",
        basicPay: "₹56,100",
        grossPayApprox: "₹85,000 – ₹95,000 (Kolkata, after probation)",
        source: "https://wbpsc.gov.in/",
        verifiedAt: "2026-05",
      },
      {
        postName: "WBCS Group B — Deputy Superintendent of Police (WBPS)",
        payLevel: "Pay Level 16",
        basicPay: "₹56,100",
        grossPayApprox: "₹85,000 – ₹95,000",
        source: "https://wbpsc.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ─── KPSC KAS — Karnataka Administrative Service ────────────────
  {
    examCode: "KA_KPSC_KAS",
    oneLiner:
      "Karnataka PSC Gazetted Probationers (KAS) — Group A and B services across Karnataka government: Asst Commissioner, Tahsildar, Asst Director, Treasury Officer.",
    eligibility: {
      ageMin: 21,
      ageMax: 35,
      ageNotes:
        "21-35 for General. OBC: +3, SC/ST/Category-1: +5. Reference date varies.",
      education: "Bachelor's degree (any discipline) from a recognised university.",
      attempts: "No formal attempt limit other than the upper age cap.",
      nationality: "Indian citizen.",
      specialConstraints: [
        "Kannada knowledge is mandatory — verified via a qualifying Kannada language paper at Mains.",
      ],
      source: "https://kpsc.kar.nic.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Prelims cutoff (qualifying for Mains, KAS Group A)",
        outOf: "400 marks (Paper 1 + Paper 2 combined; Paper 2 / CSAT qualifying at 33%)",
        rows: [
          { year: 2023, category: "General", cutoff: "~225 – 240" },
          { year: 2023, category: "OBC (II A / II B / III A / III B)", cutoff: "~215 – 232" },
          { year: 2023, category: "SC", cutoff: "~205 – 220" },
          { year: 2023, category: "ST", cutoff: "~190 – 205" },
        ],
        notes:
          "KPSC KAS uses a complex category-wise reservation matrix. The ranges above are based on the most recent published cycle.",
        source: "https://kpsc.kar.nic.in/",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [
      {
        postName: "Assistant Commissioner / KAS Group A Probationer (entry)",
        payLevel: "Pay Level 23 (Karnataka)",
        basicPay: "₹56,100",
        grossPayApprox: "₹85,000 – ₹95,000 (Bangalore, after probation)",
        source: "https://kpsc.kar.nic.in/",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ─── MPPSC SSE — Madhya Pradesh State Service Exam ──────────────
  {
    examCode: "MP_MPPSC_SSE",
    oneLiner:
      "Madhya Pradesh PSC State Service Examination — Deputy Collector, DySP, Naib Tahsildar, Assistant Registrar, Block Development Officer and other state-cadre posts.",
    eligibility: {
      ageMin: 21,
      ageMax: 40,
      ageNotes:
        "21-40 for General. MP-domicile candidates and reserved categories often get 45. Reference date is 1 January of the exam year.",
      education: "Bachelor's degree (any discipline) from a recognised university.",
      attempts: "No formal attempt limit other than the upper age cap.",
      nationality: "Indian citizen.",
      specialConstraints: [
        "Hindi proficiency tested at Mains. Domicile required for state-specific reserved posts.",
      ],
      source: "https://www.mppsc.mp.gov.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Prelims cutoff (qualifying for Mains)",
        outOf: "200 marks (Paper 1; Paper 2 / CSAT qualifying)",
        rows: [
          { year: 2023, category: "General", cutoff: "~115 – 122" },
          { year: 2023, category: "OBC", cutoff: "~108 – 115" },
          { year: 2023, category: "EWS", cutoff: "~104 – 112" },
          { year: 2023, category: "SC", cutoff: "~95 – 105" },
          { year: 2023, category: "ST", cutoff: "~85 – 95" },
        ],
        source: "https://www.mppsc.mp.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [
      {
        postName: "Deputy Collector / DySP (MPPSC SSE)",
        payLevel: "Pay Level 12 (MP)",
        basicPay: "₹56,100",
        grossPayApprox: "₹82,000 – ₹93,000 (Bhopal/Indore, after probation)",
        source: "https://www.mppsc.mp.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ─── APPSC Group 1 — Andhra Pradesh top-tier ────────────────────
  {
    examCode: "AP_APPSC_GROUP1",
    oneLiner:
      "Andhra Pradesh PSC Group 1 services — Deputy Collector, DySP, District Tribal Welfare Officer, Commercial Tax Officer, District Registrar and other top state-cadre posts.",
    eligibility: {
      ageMin: 18,
      ageMax: 42,
      ageNotes:
        "18-42 for General (upper limit relaxed by the AP government from earlier 34). Reference date is 1 July of the exam year. OBC/SC/ST/PwBD: further relaxations per AP rules.",
      education: "Bachelor's degree (any discipline) from a recognised university.",
      attempts: "No formal attempt limit other than the upper age cap.",
      nationality: "Indian citizen.",
      specialConstraints: [
        "Telugu language proficiency required for some posts at Mains/Interview stage.",
        "Domicile of Andhra Pradesh preferred but not strictly required for all posts.",
      ],
      source: "https://psc.ap.gov.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Screening Test cutoff (Prelims — qualifying for Mains)",
        outOf: "240 marks (Paper 1 + Paper 2)",
        rows: [
          { year: 2023, category: "General", cutoff: "~150 – 165" },
          { year: 2023, category: "BC", cutoff: "~140 – 158" },
          { year: 2023, category: "SC", cutoff: "~120 – 138" },
          { year: 2023, category: "ST", cutoff: "~110 – 128" },
        ],
        notes:
          "APPSC Group 1 cutoffs vary by post and year; this is a representative range from the most recent published cycle.",
        source: "https://psc.ap.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [
      {
        postName: "Deputy Collector / Commercial Tax Officer / DySP (Group 1)",
        payLevel: "Pay Level 26 (AP)",
        basicPay: "₹56,870",
        grossPayApprox: "₹88,000 – ₹1,00,000 (Vijayawada/Vizag, after probation)",
        source: "https://psc.ap.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // BATCH 4 — Engineering state entrances + CUET UG
  // ════════════════════════════════════════════════════════════════

  // ─── JEE Advanced — Joint Entrance Examination (Advanced) ───────
  {
    examCode: "JEE_ADVANCED",
    oneLiner:
      "Gateway to admissions across all 23 IITs — Bachelor's, Integrated Master's and Dual Degree programmes in Engineering, Science, Architecture and select interdisciplinary programmes.",
    eligibility: {
      ageNotes:
        "Born on or after 1 October 2000 (with 5-year relaxation for SC/ST/PwD). Reference date varies — see latest IIT brochure.",
      education:
        "Must have appeared in Class 12 (or equivalent) for the first time in the previous year OR the current year. Top 2,50,000 successful JEE Main candidates qualify.",
      educationDetails: [
        "Class 12 PCM mandatory.",
        "Maximum 2 attempts in consecutive years.",
        "Candidates who have accepted an IIT seat in any previous year (and not subsequently surrendered before the start of joining formalities) are NOT eligible.",
      ],
      attempts: "Maximum 2 attempts in consecutive years.",
      nationality: "Open to Indian and foreign nationals (limited seats for foreign nationals).",
      source: "https://jeeadv.ac.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "JoSAA closing ranks — CSE at top IITs (Round 6, Open, 2024)",
        rows: [
          { year: 2024, category: "IIT Bombay CSE (4-yr)", cutoff: "Rank ~60 – 67" },
          { year: 2024, category: "IIT Delhi CSE (4-yr)", cutoff: "Rank ~110 – 117" },
          { year: 2024, category: "IIT Madras CSE (4-yr)", cutoff: "Rank ~158 – 168" },
          { year: 2024, category: "IIT Kanpur CSE (4-yr)", cutoff: "Rank ~218 – 235" },
          { year: 2024, category: "IIT Kharagpur CSE (4-yr)", cutoff: "Rank ~245 – 262" },
          { year: 2024, category: "IIT Roorkee CSE (4-yr)", cutoff: "Rank ~280 – 305" },
          { year: 2024, category: "IIT Hyderabad CSE (4-yr)", cutoff: "Rank ~280 – 310" },
          { year: 2024, category: "IIT BHU CSE", cutoff: "Rank ~350 – 410" },
          { year: 2024, category: "IIT Guwahati CSE", cutoff: "Rank ~400 – 460" },
        ],
        notes:
          "Closing ranks shown are for Open category, home state quota where applicable. Female-only, OBC, SC/ST closing ranks are much higher (i.e., more accessible).",
        source: "https://josaa.nic.in/",
        verifiedAt: "2026-05",
      },
      {
        title: "Qualifying cutoffs — JEE Advanced rank list (Open category)",
        rows: [
          { year: 2024, category: "Subject-wise (each subject)", cutoff: "≥ 10% / 360" },
          { year: 2024, category: "Aggregate", cutoff: "≥ 35% / 360" },
          { year: 2023, category: "Subject-wise", cutoff: "≥ 10% / 360" },
          { year: 2023, category: "Aggregate", cutoff: "≥ 35.4% / 360" },
        ],
        notes:
          "Open candidates need subject-wise AND aggregate minimums. SC/ST/PwD: 5% subject-wise and 17.5% aggregate.",
        source: "https://jeeadv.ac.in/",
        verifiedAt: "2026-05",
      },
    ],
    paperAnalysis: {
      title: "JEE Advanced paper analysis",
      yearsAnalyzed: "2022-2024",
      totalMarks: 360,
      topics: [
        { subject: "Mathematics (120 marks across Paper 1 + 2)", topic: "Calculus (Limits, Continuity, Differentiation, Integration, ODE)", recentMarksAvg: 38, recentMarksMax: 44 },
        { subject: "Mathematics (120 marks across Paper 1 + 2)", topic: "Coordinate Geometry + Vectors + 3D", recentMarksAvg: 28, recentMarksMax: 34 },
        { subject: "Mathematics (120 marks across Paper 1 + 2)", topic: "Algebra (Quadratic, Complex Numbers, Matrices, P&C, Probability)", recentMarksAvg: 36, recentMarksMax: 42 },
        { subject: "Mathematics (120 marks across Paper 1 + 2)", topic: "Trigonometry + Sequences", recentMarksAvg: 18, recentMarksMax: 24 },
        { subject: "Physics (120 marks across Paper 1 + 2)", topic: "Mechanics + Rotation + SHM + Waves", recentMarksAvg: 38, recentMarksMax: 46 },
        { subject: "Physics (120 marks across Paper 1 + 2)", topic: "Electrodynamics + EM Waves", recentMarksAvg: 38, recentMarksMax: 44 },
        { subject: "Physics (120 marks across Paper 1 + 2)", topic: "Optics + Modern Physics + Thermodynamics", recentMarksAvg: 44, recentMarksMax: 52 },
        { subject: "Chemistry (120 marks across Paper 1 + 2)", topic: "Physical Chemistry (Thermo, Equilibria, Electrochem, Kinetics, Solutions)", recentMarksAvg: 42, recentMarksMax: 50 },
        { subject: "Chemistry (120 marks across Paper 1 + 2)", topic: "Organic Chemistry (Reaction Mech, GOC, Stereochemistry, Named Reactions)", recentMarksAvg: 42, recentMarksMax: 50 },
        { subject: "Chemistry (120 marks across Paper 1 + 2)", topic: "Inorganic Chemistry (Periodic Properties, Coordination, p-block, Qualitative Analysis)", recentMarksAvg: 36, recentMarksMax: 42 },
      ],
      takeaways: [
        "JEE Advanced rewards depth of understanding over breadth — every subject's syllabus is finite but problems are multi-concept.",
        "Most rank movement at the top happens through Chemistry — Math and Physics top scorers are common; Chemistry full-marks scorers are rare.",
        "Inorganic Chemistry — particularly the qualitative analysis and coordination chapters — produces predictable marks for candidates who memorise the standard salt + colour + reaction tables.",
      ],
      source: "https://jeeadv.ac.in/",
      verifiedAt: "2026-05",
    },
  },

  // ─── AP EAMCET — Andhra Pradesh Engineering/Agriculture ─────────
  {
    examCode: "AP_EAMCET",
    oneLiner:
      "Andhra Pradesh Engineering, Agriculture & Medical Common Entrance Test (now AP EAPCET) — gate to engineering, agriculture and pharmacy UG seats in Andhra Pradesh universities and affiliated colleges.",
    eligibility: {
      ageMin: 16,
      ageNotes:
        "Minimum 16 years as of 31 December of the exam year. No upper age limit for engineering stream; 22 years for agriculture/pharmacy (relaxed for reserved categories).",
      education:
        "Class 12 with Physics + Mathematics + (Chemistry / Biology / Biotechnology) for Engineering stream. Class 12 with Physics + Chemistry + Biology for Agriculture / Pharmacy stream.",
      educationDetails: [
        "Class 12 aggregate: 45% in PCM/PCB (40% for SC/ST/OBC).",
        "Candidates appearing in Class 12 in the current year can apply.",
      ],
      attempts: "No formal attempt limit.",
      nationality: "Indian citizen. AP / Telangana state quota applies as per local rules.",
      specialConstraints: [
        "AP domicile required for 85% state-quota seats. 15% remain in convener quota (open to non-locals).",
      ],
      source: "https://cets.apsche.ap.gov.in/EAPCET/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Engineering stream closing ranks (top colleges, Open category, 2024)",
        rows: [
          { year: 2024, category: "JNTU Anantapur CSE", cutoff: "Rank ~3,500" },
          { year: 2024, category: "JNTU Kakinada CSE", cutoff: "Rank ~5,200" },
          { year: 2024, category: "Andhra University CSE", cutoff: "Rank ~6,800" },
          { year: 2024, category: "Sri Venkateswara University Tirupati CSE", cutoff: "Rank ~7,500" },
          { year: 2024, category: "RGUKT Nuzvid (IIIT) CSE", cutoff: "Rank ~3,800" },
        ],
        notes:
          "Top private colleges (CBIT, GITAM, VRSEC, KL Univ) close even higher up; counselling cutoffs vary by year and quota.",
        source: "https://cets.apsche.ap.gov.in/EAPCET/",
        verifiedAt: "2026-05",
      },
    ],
    paperAnalysis: {
      title: "AP EAMCET (Engineering) paper analysis",
      yearsAnalyzed: "2022-2024",
      totalMarks: 160,
      topics: [
        { subject: "Mathematics (80 marks)", topic: "Calculus + Coordinate Geometry + Vectors + 3D", recentMarksAvg: 32, recentMarksMax: 38 },
        { subject: "Mathematics (80 marks)", topic: "Algebra + Trigonometry", recentMarksAvg: 22, recentMarksMax: 28 },
        { subject: "Mathematics (80 marks)", topic: "Probability + Statistics", recentMarksAvg: 8, recentMarksMax: 12 },
        { subject: "Physics (40 marks)", topic: "Mechanics + Waves + Thermodynamics", recentMarksAvg: 16, recentMarksMax: 22 },
        { subject: "Physics (40 marks)", topic: "Electrodynamics + Optics + Modern Physics", recentMarksAvg: 18, recentMarksMax: 24 },
        { subject: "Chemistry (40 marks)", topic: "Physical Chemistry", recentMarksAvg: 14, recentMarksMax: 20 },
        { subject: "Chemistry (40 marks)", topic: "Organic + Inorganic Chemistry", recentMarksAvg: 14, recentMarksMax: 20 },
      ],
      takeaways: [
        "Mathematics carries 50% of total marks — strong Math alone can secure a state-quota seat in a tier-2 college.",
        "AP EAMCET is faster-paced than JEE Main: 160 questions in 180 min = ~67 sec per question. Speed matters.",
        "Intermediate (AP) textbooks cover ~95% of the paper. NCERT supplementary practice helps but isn't strictly necessary.",
      ],
      source: "https://cets.apsche.ap.gov.in/EAPCET/",
      verifiedAt: "2026-05",
    },
  },

  // ─── TS EAMCET — Telangana Engineering/Agriculture ──────────────
  {
    examCode: "TS_EAMCET",
    oneLiner:
      "Telangana State Engineering, Agriculture & Medical Common Entrance Test (now TS EAPCET) — gate to engineering, agriculture and pharmacy UG seats in Telangana.",
    eligibility: {
      ageMin: 16,
      ageNotes: "Minimum 16 years on 31 December of the exam year. No upper age limit for engineering.",
      education:
        "Class 12 with PCM (engineering) or PCB (agriculture). 45% aggregate (40% for reserved categories).",
      attempts: "No formal attempt limit.",
      nationality: "Indian citizen.",
      specialConstraints: [
        "Telangana domicile required for 85% state-quota seats.",
        "Local-area reservation (OU / KU area) applies within Telangana convener quota.",
      ],
      source: "https://eapcet.tsche.ac.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Engineering stream closing ranks (top colleges, Open Convener, 2024)",
        rows: [
          { year: 2024, category: "JNTU Hyderabad CSE", cutoff: "Rank ~2,200" },
          { year: 2024, category: "Osmania University CSE", cutoff: "Rank ~2,800" },
          { year: 2024, category: "CBIT Hyderabad CSE", cutoff: "Rank ~3,500" },
          { year: 2024, category: "Vasavi College of Engineering CSE", cutoff: "Rank ~4,500" },
          { year: 2024, category: "VNR VJIET CSE", cutoff: "Rank ~5,500" },
        ],
        source: "https://tgeapcet.nic.in/",
        verifiedAt: "2026-05",
      },
    ],
    paperAnalysis: {
      title: "TS EAMCET (Engineering) paper analysis",
      yearsAnalyzed: "2022-2024",
      totalMarks: 160,
      topics: [
        { subject: "Mathematics (80 marks)", topic: "Calculus + Coordinate Geometry + Vectors", recentMarksAvg: 30, recentMarksMax: 38 },
        { subject: "Mathematics (80 marks)", topic: "Algebra + Trigonometry", recentMarksAvg: 24, recentMarksMax: 30 },
        { subject: "Mathematics (80 marks)", topic: "Probability + Statistics + Matrices", recentMarksAvg: 8, recentMarksMax: 12 },
        { subject: "Physics (40 marks)", topic: "Mechanics + Waves + Thermodynamics", recentMarksAvg: 16, recentMarksMax: 22 },
        { subject: "Physics (40 marks)", topic: "Electrodynamics + Optics + Modern Physics", recentMarksAvg: 18, recentMarksMax: 24 },
        { subject: "Chemistry (40 marks)", topic: "Physical + Organic + Inorganic", recentMarksAvg: 28, recentMarksMax: 38 },
      ],
      takeaways: [
        "TS EAMCET is closely aligned with the Telangana State Intermediate (TSBIE) syllabus — direct textbook practice is the highest-yield prep.",
        "Top Telangana ranks come from heavy mock practice — past TS EAMCET papers are the best resource.",
        "Math is the biggest differentiator at the top — Mech engineering, Aero, EEE cut-offs are decided here.",
      ],
      source: "https://eapcet.tsche.ac.in/",
      verifiedAt: "2026-05",
    },
  },

  // ─── KCET — Karnataka Common Entrance Test ──────────────────────
  {
    examCode: "KA_KCET",
    oneLiner:
      "Karnataka Common Entrance Test — gate to government, aided and select private engineering, pharmacy, agricultural, veterinary and naturopathy programmes in Karnataka.",
    eligibility: {
      ageNotes:
        "No upper age limit. Minimum age — must have passed / be appearing in Class 12.",
      education:
        "Class 12 with PCM (engineering) or PCB (medical / agri streams). 45% aggregate in PCM (40% for SC/ST/Cat I).",
      educationDetails: [
        "Engineering applicants need PCM + at least one of: Biology / Computer Science / Electronics.",
        "Class 12 must be from a Karnataka-recognised board OR a board recognised by CBSE/ICSE — outside-Karnataka candidates need a Karnataka-domicile certificate.",
      ],
      attempts: "No formal attempt limit.",
      nationality: "Indian citizen.",
      specialConstraints: [
        "Karnataka domicile (10-year clause) required for the state's Article 371-J Hyderabad-Karnataka reservation and certain state-quota seats.",
        "Class 12 marks contribute 50% to the final composite rank (the other 50% being KCET score) — Class 12 performance still matters.",
      ],
      source: "https://cetonline.karnataka.gov.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Closing ranks — CSE at top Karnataka colleges (General Merit, 2024)",
        rows: [
          { year: 2024, category: "UVCE Bangalore CSE", cutoff: "Rank ~250 – 450" },
          { year: 2024, category: "RV College of Engineering CSE", cutoff: "Rank ~600 – 800" },
          { year: 2024, category: "BMS College of Engineering CSE", cutoff: "Rank ~1,200 – 1,500" },
          { year: 2024, category: "PES University EC Campus CSE", cutoff: "Rank ~1,800 – 2,400" },
          { year: 2024, category: "Sir MV College of Engineering CSE", cutoff: "Rank ~3,500 – 4,500" },
        ],
        source: "https://cetonline.karnataka.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
    paperAnalysis: {
      title: "KCET paper analysis",
      yearsAnalyzed: "2022-2024",
      totalMarks: 180,
      topics: [
        { subject: "Mathematics (60 Qs / 60 marks)", topic: "Calculus + Algebra + Probability", recentMarksAvg: 35, recentMarksMax: 42 },
        { subject: "Mathematics", topic: "Coordinate Geometry + Vectors + 3D + Trigonometry", recentMarksAvg: 25, recentMarksMax: 32 },
        { subject: "Physics (60 Qs / 60 marks)", topic: "Mechanics + Waves + Thermo", recentMarksAvg: 22, recentMarksMax: 28 },
        { subject: "Physics", topic: "Electrodynamics + Optics + Modern Physics", recentMarksAvg: 38, recentMarksMax: 46 },
        { subject: "Chemistry (60 Qs / 60 marks)", topic: "Physical + Organic + Inorganic", recentMarksAvg: 58, recentMarksMax: 60 },
      ],
      takeaways: [
        "KCET is easier than JEE Main but rewards careful question-reading — typos and ambiguous options have historically caused complaints.",
        "Karnataka 2nd PUC textbooks cover ~98% of the paper. NCERT alone is INSUFFICIENT for KCET — use the PUC textbooks.",
        "Composite ranking with 50% Class-12 weightage means consistent Class 12 board prep + KCET-specific practice are both required.",
      ],
      source: "https://cetonline.karnataka.gov.in/",
      verifiedAt: "2026-05",
    },
  },

  // ─── COMEDK UGET — Karnataka private engineering ────────────────
  {
    examCode: "KA_COMEDK",
    oneLiner:
      "Consortium of Medical, Engineering & Dental Colleges of Karnataka — single entrance for engineering and architecture admissions to ~190 private engineering colleges in Karnataka.",
    eligibility: {
      ageNotes: "No upper age limit. Minimum: must have passed Class 12 (or be appearing).",
      education: "Class 12 with PCM. 45% aggregate (40% for SC/ST/OBC).",
      educationDetails: [
        "B.Arch additionally requires Class 12 Mathematics + NATA / JEE Paper 2 score.",
      ],
      attempts: "No formal attempt limit.",
      nationality: "Indian citizen, NRI, OCI, PIO. Foreign nationals — separate quota.",
      specialConstraints: [
        "COMEDK is for private/deemed Karnataka colleges only — government seats use KCET.",
        "No domicile restriction; open to candidates from any state.",
      ],
      source: "https://www.comedk.org/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Closing ranks — CSE at top COMEDK colleges (Open category, 2024)",
        rows: [
          { year: 2024, category: "MS Ramaiah Institute of Technology CSE", cutoff: "Rank ~450 – 700" },
          { year: 2024, category: "Dayananda Sagar College of Engineering CSE", cutoff: "Rank ~1,200 – 1,800" },
          { year: 2024, category: "BMS Institute of Tech CSE", cutoff: "Rank ~1,800 – 2,500" },
          { year: 2024, category: "RNS Institute of Technology CSE", cutoff: "Rank ~2,500 – 3,500" },
        ],
        notes: "COMEDK fees are significantly higher than KCET government colleges — usually ₹2-5 lakh per year.",
        source: "https://www.comedk.org/",
        verifiedAt: "2026-05",
      },
    ],
    paperAnalysis: {
      title: "COMEDK UGET paper analysis",
      yearsAnalyzed: "2022-2024",
      totalMarks: 180,
      topics: [
        { subject: "Mathematics (60 marks)", topic: "Calculus + Algebra + Coordinate Geometry + Vectors", recentMarksAvg: 42, recentMarksMax: 50 },
        { subject: "Mathematics", topic: "Probability + Statistics + Trigonometry", recentMarksAvg: 18, recentMarksMax: 24 },
        { subject: "Physics (60 marks)", topic: "Mechanics + Waves + Thermo + Properties of Matter", recentMarksAvg: 22, recentMarksMax: 28 },
        { subject: "Physics", topic: "Electrodynamics + Optics + Modern Physics", recentMarksAvg: 38, recentMarksMax: 44 },
        { subject: "Chemistry (60 marks)", topic: "Physical + Organic + Inorganic", recentMarksAvg: 58, recentMarksMax: 60 },
      ],
      takeaways: [
        "COMEDK papers are typically 1-2 difficulty levels easier than JEE Main but rely on careful problem-reading.",
        "180 questions in 180 minutes means time management is the biggest skill — many students lose marks not to difficulty but to leaving questions blank.",
        "CBSE Class 12 NCERT covers ~85% of the paper. Adding state-level PCM practice is helpful but not essential.",
      ],
      source: "https://www.comedk.org/",
      verifiedAt: "2026-05",
    },
  },

  // ─── MHT CET — Maharashtra Common Entrance Test ─────────────────
  {
    examCode: "MH_MHTCET",
    oneLiner:
      "Maharashtra Common Entrance Test — engineering, pharmacy and agriculture UG admissions across Maharashtra government, aided and private colleges.",
    eligibility: {
      ageNotes: "No upper age limit. Minimum age — must be eligible for Class 12.",
      education:
        "Class 12 with PCM (engineering / pharmacy / agriculture) — minimum 50% aggregate (45% for reserved categories).",
      educationDetails: [
        "For B.Pharm: PCM + Biology (45% reserved).",
        "Candidates from Maharashtra board enjoy easier domicile-based reservation; out-of-state candidates compete in the 15% All-India quota.",
      ],
      attempts: "No formal attempt limit.",
      nationality: "Indian citizen.",
      specialConstraints: [
        "Maharashtra domicile required for 85% state-quota seats.",
        "Score is percentile-normalised across 3 shifts — equating differences in shift difficulty.",
      ],
      source: "https://cetcell.mahacet.org/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Closing percentiles — CSE at top Maharashtra colleges (Home State, Open, 2024)",
        rows: [
          { year: 2024, category: "COEP Pune CSE", cutoff: "99.7+ percentile" },
          { year: 2024, category: "VJTI Mumbai CSE", cutoff: "99.5+ percentile" },
          { year: 2024, category: "ICT Mumbai CSE", cutoff: "99.6+ percentile" },
          { year: 2024, category: "PICT Pune CSE", cutoff: "99+ percentile" },
          { year: 2024, category: "VIT Pune CSE", cutoff: "98.5+ percentile" },
          { year: 2024, category: "MIT WPU CSE", cutoff: "97+ percentile" },
        ],
        notes:
          "MHT CET uses percentile (not raw marks) for ranking. Closing percentile slightly varies between counselling rounds.",
        source: "https://fe2024.mahacet.org/",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [],
  },

  // ─── WBJEE — West Bengal Joint Entrance Examination ─────────────
  {
    examCode: "WB_WBJEE",
    oneLiner:
      "West Bengal Joint Entrance Examination — engineering, technology, pharmacy and architecture admissions to government and government-aided colleges in West Bengal.",
    eligibility: {
      ageMin: 17,
      ageNotes:
        "Minimum 17 years as of 31 December of the exam year. No upper age limit for engineering (5-year cap for marine engineering posts).",
      education:
        "Class 12 with PCM (engineering / pharmacy). 45% in PCM (40% for SC/ST/OBC-A/OBC-B/PwD). English at qualifying level.",
      educationDetails: [
        "Candidates from outside West Bengal can apply — but state-quota seats favour WB domiciles.",
      ],
      attempts: "No formal attempt limit.",
      nationality: "Indian citizen, NRI, OCI, PIO.",
      source: "https://wbjeeb.nic.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Closing ranks — CSE at top WB colleges (Home State, Open, 2024)",
        rows: [
          { year: 2024, category: "IIEST Shibpur CSE", cutoff: "Rank ~600 – 800" },
          { year: 2024, category: "Jadavpur University CSE", cutoff: "Rank ~120 – 200" },
          { year: 2024, category: "Kalyani Govt Engg College CSE", cutoff: "Rank ~3,000 – 4,500" },
          { year: 2024, category: "Govt College of Engg & Ceramic Tech CSE", cutoff: "Rank ~4,000 – 5,500" },
          { year: 2024, category: "Haldia Institute of Tech CSE (Private)", cutoff: "Rank ~8,000 – 15,000" },
        ],
        notes: "Jadavpur is the standout — closing rank lower than most NITs.",
        source: "https://wbjeeb.nic.in/",
        verifiedAt: "2026-05",
      },
    ],
    paperAnalysis: {
      title: "WBJEE paper analysis",
      yearsAnalyzed: "2022-2024",
      totalMarks: 200,
      topics: [
        { subject: "Mathematics (100 marks)", topic: "Calculus + Coordinate Geometry + Vectors + 3D", recentMarksAvg: 40, recentMarksMax: 48 },
        { subject: "Mathematics", topic: "Algebra + Trigonometry + Probability + Statistics", recentMarksAvg: 35, recentMarksMax: 42 },
        { subject: "Mathematics", topic: "Multi-correct + Matrix-match questions (negative marking heavier)", recentMarksAvg: 25, recentMarksMax: 30 },
        { subject: "Physics (50 marks)", topic: "Mechanics + Waves + Thermodynamics + Properties of Matter", recentMarksAvg: 22, recentMarksMax: 28 },
        { subject: "Physics", topic: "Electrodynamics + Optics + Modern Physics", recentMarksAvg: 25, recentMarksMax: 30 },
        { subject: "Chemistry (50 marks)", topic: "Physical + Organic + Inorganic", recentMarksAvg: 48, recentMarksMax: 50 },
      ],
      takeaways: [
        "WBJEE has Maths weighted at 100/200 — twice the marks of either Physics or Chemistry. Math-strong candidates have a real edge.",
        "Multi-correct and matrix-match questions carry double the marks but also double the negative penalty — selective attempting is critical.",
        "WB HS Council textbooks cover the paper directly — that's the highest-yield source.",
      ],
      source: "https://wbjeeb.nic.in/",
      verifiedAt: "2026-05",
    },
  },

  // ─── KEAM — Kerala Engineering Architecture Medical ─────────────
  {
    examCode: "KL_KEAM",
    oneLiner:
      "Kerala Engineering Architecture Medical entrance — engineering, pharmacy, architecture and (formerly) medical admissions in Kerala colleges.",
    eligibility: {
      ageMin: 17,
      ageNotes:
        "Minimum 17 years on 31 December of the exam year. No upper age limit for engineering.",
      education: "Class 12 with PCM (engineering / pharmacy). 50% aggregate in PCM (45% for SC/ST/OEC).",
      educationDetails: [
        "Architecture: NATA or JEE Paper 2 score required in addition to KEAM Paper 1 (Math).",
        "Pharmacy: Class 12 PCM OR PCB (with 50%).",
      ],
      attempts: "No formal attempt limit.",
      nationality: "Indian citizen.",
      specialConstraints: [
        "Kerala domicile required for state merit seats (85%). 15% are All-India seats.",
        "KEAM has two papers: Paper 1 (Physics + Chemistry) and Paper 2 (Mathematics). Engineering rank uses both.",
      ],
      source: "https://www.cee.kerala.gov.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Closing ranks — CSE at top Kerala colleges (State Merit, Open, 2024)",
        rows: [
          { year: 2024, category: "Govt Engg College Thrissur CSE", cutoff: "Rank ~300 – 500" },
          { year: 2024, category: "CET Trivandrum CSE", cutoff: "Rank ~100 – 200" },
          { year: 2024, category: "Govt Engg College Barton Hill (Trivandrum) CSE", cutoff: "Rank ~700 – 1,100" },
          { year: 2024, category: "Model Engg College Thrikkakara CSE", cutoff: "Rank ~250 – 450" },
          { year: 2024, category: "TKM College of Engg Kollam CSE", cutoff: "Rank ~500 – 850" },
        ],
        notes: "Closing ranks shown for Kerala home-state quota, General category, round 6 / final round.",
        source: "https://www.cee.kerala.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [],
  },

  // ─── UP UPCET — UP Combined Entrance Test ───────────────────────
  {
    examCode: "UP_UPCET",
    oneLiner:
      "UP Combined Entrance Test — admissions to UG engineering, agriculture, pharmacy and management programmes at AKTU-affiliated colleges in UP.",
    eligibility: {
      ageNotes: "No upper age limit (varies by programme).",
      education:
        "Class 12 with PCM (engineering / pharmacy). 45% aggregate (40% for reserved categories).",
      attempts: "No formal attempt limit.",
      nationality: "Indian citizen.",
      specialConstraints: [
        "UP domicile required for state-quota seats. NTA conducts the exam; AKTU handles counselling.",
      ],
      source: "https://upcet.nta.nic.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Closing ranks — CSE at top AKTU colleges (Home State, Open, 2024)",
        rows: [
          { year: 2024, category: "HBTU Kanpur CSE", cutoff: "Rank ~500 – 800" },
          { year: 2024, category: "MMMUT Gorakhpur CSE", cutoff: "Rank ~900 – 1,400" },
          { year: 2024, category: "IET Lucknow CSE", cutoff: "Rank ~400 – 700" },
          { year: 2024, category: "JSS Noida CSE", cutoff: "Rank ~2,500 – 4,000" },
        ],
        source: "https://upcet.nta.nic.in/",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [],
  },

  // ─── CUET UG — Common University Entrance Test (UG) ─────────────
  {
    examCode: "CUET_UG",
    oneLiner:
      "Common Universities Entrance Test (UG) — single entrance for undergraduate admissions to 45+ central universities (DU, JNU, BHU, etc.) and 100+ state and private universities.",
    eligibility: {
      ageNotes: "No upper age limit.",
      education:
        "Class 12 pass from a recognised board. Each university sets its own subject-specific eligibility (e.g., DU BA Hons Economics needs Maths).",
      educationDetails: [
        "Candidates can choose up to 6 subjects (changed in some cycles).",
        "Domain subjects (33 to choose from), General Test, and up to 13 languages.",
        "Each university then sets its own subject-combination + cut-off using CUET percentile.",
      ],
      attempts: "No formal attempt limit.",
      nationality: "Indian citizen, OCI, PIO. Foreign nationals — supernumerary seats at participating universities.",
      source: "https://cuet.nta.nic.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "DU College closing percentiles — popular UG programmes (Open category, 2024)",
        rows: [
          { year: 2024, category: "St Stephen's BA Hons Economics", cutoff: "99.5+ percentile composite" },
          { year: 2024, category: "Hindu College BA Hons Economics", cutoff: "99+ percentile" },
          { year: 2024, category: "SRCC B.Com Hons", cutoff: "99+ percentile" },
          { year: 2024, category: "LSR BA Hons Psychology", cutoff: "98+ percentile" },
          { year: 2024, category: "Hansraj BSc Hons Computer Science", cutoff: "98.5+ percentile" },
          { year: 2024, category: "Miranda House BA Hons English", cutoff: "97.5+ percentile" },
        ],
        notes:
          "DU uses the CUET UG composite score (sum of the relevant domain subjects + general test or languages). Each college + course combination has its own closing cut-off.",
        source: "https://www.du.ac.in/",
        verifiedAt: "2026-05",
      },
    ],
    paperAnalysis: {
      title: "CUET UG paper structure",
      yearsAnalyzed: "2022-2024",
      totalMarks: 250,
      topics: [
        { subject: "Section 1A (Languages)", topic: "Comprehension + Vocabulary + Grammar (13 languages to choose)", recentMarksAvg: 50, recentMarksMax: 50, notes: "40 of 50 questions to be answered." },
        { subject: "Section 2 (Domain Subject)", topic: "Class 12 NCERT-based domain test (Math / Phy / Chem / Bio / Eco / Polity / History / Psychology / etc.)", recentMarksAvg: 50, recentMarksMax: 50, notes: "Each domain is 50 marks. Students choose 2-6 domains based on target college." },
        { subject: "Section 3 (General Test)", topic: "GK + Current Affairs + Mental Ability + Quant + Logical Reasoning", recentMarksAvg: 60, recentMarksMax: 60, notes: "Not all universities require it. DU requires it for some courses." },
      ],
      takeaways: [
        "CUET is fundamentally a Class 12 NCERT-mastery test — every domain question is from the Class 12 syllabus of that subject.",
        "The 'composite percentile' DU uses sums up domain + language + general test percentile-equated scores. A high single-domain score doesn't help if other selected subjects underperform.",
        "Choosing 2-3 strong subjects + 1 backup is more rank-effective than spreading across 5-6 subjects with mediocre prep.",
      ],
      source: "https://cuet.nta.nic.in/",
      verifiedAt: "2026-05",
    },
  },

  // ─── APSC CCE — Assam PSC Combined Competitive Exam ─────────────
  {
    examCode: "AS_APSC_CCE",
    oneLiner:
      "Assam PSC Combined Competitive Examination — Assam Civil Service (Junior Grade), Assam Police Service, and other Group A/B state-cadre posts.",
    eligibility: {
      ageMin: 21,
      ageMax: 38,
      ageNotes:
        "21-38 for General. Age relaxation: OBC/MOBC +3, SC/ST(P)/ST(H) +5, PwBD +10. Reference date is 1 January of the exam year.",
      education: "Bachelor's degree (any discipline) from a recognised university.",
      attempts: "No formal attempt limit other than the upper age cap.",
      nationality: "Indian citizen.",
      specialConstraints: [
        "Assamese / Bengali / Bodo language proficiency required for certain posts.",
        "Assam domicile preferred for state-specific reservation benefits.",
      ],
      source: "https://apsc.nic.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Prelims cutoff (qualifying for Mains)",
        outOf: "200 marks (Paper 1; Paper 2 / CSAT qualifying)",
        rows: [
          { year: 2023, category: "General", cutoff: "~120 – 130" },
          { year: 2023, category: "OBC / MOBC", cutoff: "~112 – 122" },
          { year: 2023, category: "SC", cutoff: "~100 – 112" },
          { year: 2023, category: "ST(P) / ST(H)", cutoff: "~92 – 105" },
        ],
        source: "https://apsc.nic.in/",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [
      {
        postName: "Assam Civil Service (Junior Grade) — entry post",
        payLevel: "Pay Level 17 (Assam ROP 2017)",
        basicPay: "₹56,100",
        grossPayApprox: "₹82,000 – ₹92,000 (Guwahati, after probation)",
        source: "https://apsc.nic.in/",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // BATCH 5 — Defence officer entry + state police constable / SI
  // ════════════════════════════════════════════════════════════════

  // ─── CDS — Combined Defence Services Examination ────────────────
  {
    examCode: "CDS",
    oneLiner:
      "UPSC Combined Defence Services Examination — officer-cadre entry to IMA (Army), INA (Navy), AFA (Air Force) and OTA (Short Service Commission, both genders) after graduation.",
    eligibility: {
      ageMin: 19,
      ageMax: 25,
      ageNotes:
        "Range varies by academy: IMA 19-24, INA 19-24, AFA 20-24, OTA 19-25. Date of birth bounds revised every cycle — see latest notification.",
      education:
        "IMA / OTA: Bachelor's (any discipline). INA: Bachelor's in Engineering. AFA: Bachelor's with Physics + Maths at 10+2 OR Bachelor's in Engineering.",
      educationDetails: [
        "Final-year graduates can appear if results are out before the academy commencement date.",
        "Engineering degree mandatory for the Naval Academy.",
      ],
      attempts: "No formal attempt limit other than the upper age cap.",
      nationality: "Indian citizen (or Nepal/Bhutan subject for IMA & OTA; specific certificate norms apply).",
      specialConstraints: [
        "Unmarried male candidates for IMA / INA / AFA. OTA admits both unmarried males and females (and married males in special quotas).",
        "Physical + medical standards as per Service Selection Board (SSB) — vision, height, chest, BMI, etc.",
        "All shortlisted candidates undergo a 5-day SSB interview after the written exam.",
      ],
      reservations: ["No reservation in the CDS written exam itself; representation goes through different academy intakes."],
      source: "https://www.upsc.gov.in/examinations/Combined%20Defence%20Services%20Examination",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Written cutoff (qualifying for SSB interview)",
        outOf: "300 marks (IMA/INA/AFA — 3 papers) · 200 marks (OTA — 2 papers)",
        rows: [
          { year: 2023, category: "IMA — written cutoff", cutoff: "112 (written) · 297 (final, with SSB out of 600)" },
          { year: 2023, category: "INA — written", cutoff: "108 · 308 final" },
          { year: 2023, category: "AFA — written", cutoff: "126 · 309 final" },
          { year: 2023, category: "OTA (men) — written", cutoff: "97 · 257 final" },
          { year: 2023, category: "OTA (women) — written", cutoff: "97 · 257 final" },
          { year: 2022, category: "IMA", cutoff: "137 · 318 final" },
          { year: 2022, category: "INA", cutoff: "131 · 314 final" },
          { year: 2022, category: "AFA", cutoff: "144 · 327 final" },
          { year: 2022, category: "OTA (men)", cutoff: "112 · 264 final" },
        ],
        source: "https://www.upsc.gov.in/examinations/Combined%20Defence%20Services%20Examination",
        verifiedAt: "2026-05",
      },
    ],
    paperAnalysis: {
      title: "CDS (IMA/INA/AFA) paper analysis",
      yearsAnalyzed: "2022-2024",
      totalMarks: 300,
      topics: [
        { subject: "English (100 marks)", topic: "Reading Comprehension + Cloze Test", recentMarksAvg: 30, recentMarksMax: 36 },
        { subject: "English (100 marks)", topic: "Grammar + Sentence Improvement + Synonyms/Antonyms", recentMarksAvg: 40, recentMarksMax: 48 },
        { subject: "English (100 marks)", topic: "Para Jumble + Sentence Completion + Spotting Errors", recentMarksAvg: 30, recentMarksMax: 36 },
        { subject: "General Knowledge (100 marks)", topic: "Indian Polity + History + Geography", recentMarksAvg: 40, recentMarksMax: 50 },
        { subject: "General Knowledge (100 marks)", topic: "Current Affairs + Defence + Sci-Tech", recentMarksAvg: 30, recentMarksMax: 40 },
        { subject: "General Knowledge (100 marks)", topic: "Economy + Environment + Sports + Culture", recentMarksAvg: 30, recentMarksMax: 38 },
        { subject: "Elementary Mathematics (100 marks, IMA/INA/AFA only)", topic: "Arithmetic + Algebra", recentMarksAvg: 35, recentMarksMax: 45 },
        { subject: "Elementary Mathematics", topic: "Geometry + Mensuration + Trigonometry", recentMarksAvg: 35, recentMarksMax: 45 },
        { subject: "Elementary Mathematics", topic: "Statistics + Probability", recentMarksAvg: 12, recentMarksMax: 18 },
      ],
      takeaways: [
        "OTA candidates skip Maths — only English + GK count. That makes OTA the lowest-bar academy in terms of written cutoff.",
        "GK is the highest-variance section; static GK + current affairs of the 6 months before the paper carry the bulk.",
        "Most candidates clear the written but fail SSB — focus on personality + group tasks at least as hard as the written prep.",
      ],
      source: "https://www.upsc.gov.in/examinations/Combined%20Defence%20Services%20Examination",
      verifiedAt: "2026-05",
    },
    salaryBands: [
      {
        postName: "Lieutenant on commissioning (IMA / OTA) / equivalent in Navy & Air Force",
        payLevel: "Pay Level 10",
        basicPay: "₹56,100",
        grossPayApprox: "₹85,000 – ₹1,00,000+ (after commission, including MSP ₹15,500 + Kit + Transport allowance)",
        perks: [
          "Free accommodation in officer quarters",
          "Free ration + uniform allowance",
          "Free medical for self + dependants (lifelong)",
          "Concessional travel (railway / air)",
          "Pension under NPS + service pension",
          "AGIF / CSD canteen access",
        ],
        source: "https://www.joinindianarmy.nic.in/",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ─── UP Police Constable ────────────────────────────────────────
  {
    examCode: "UP_POLICE_CONSTABLE",
    oneLiner:
      "UP Police Constable (Civil Police + PAC) — entry-level Constable recruitment in Uttar Pradesh Police, the largest state police force in India.",
    eligibility: {
      ageMin: 18,
      ageMax: 22,
      ageNotes:
        "18-22 for male General (women 18-25). UP-domicile reserved categories get further age relaxations (OBC +3, SC/ST +5, ex-servicemen 3 yrs after service).",
      education: "Intermediate (Class 12) pass from a recognised board, OR equivalent qualification.",
      educationDetails: [
        "Candidates must be physically fit and meet UP Police's standards for height, chest, and weight.",
        "Married candidates allowed; no marital status bar.",
      ],
      attempts: "No formal attempt limit other than the upper age cap.",
      nationality: "Indian citizen with UP domicile preferred (open vacancies have minor non-domicile allocation).",
      specialConstraints: [
        "Physical Standards: Male — height 168 cm general (160 cm SC/ST), chest 79-84 cm. Female — height 152 cm (147 cm SC/ST).",
        "Physical Efficiency Test (PET): 4.8 km run in 25 min (male), 2.4 km run in 14 min (female).",
        "Document verification + medical follow PET.",
      ],
      source: "https://uppbpb.gov.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Written cutoff (qualifying for PET/PST/Document Verification)",
        outOf: "300 marks",
        rows: [
          { year: 2024, category: "General Male", cutoff: "~175 – 195" },
          { year: 2024, category: "General Female", cutoff: "~160 – 180" },
          { year: 2024, category: "OBC", cutoff: "~165 – 185" },
          { year: 2024, category: "SC", cutoff: "~140 – 165" },
          { year: 2024, category: "ST", cutoff: "~120 – 145" },
        ],
        notes:
          "Range shown reflects variation across zones / categories. Final selection is based on written + PET + document verification.",
        source: "https://uppbpb.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [
      {
        postName: "Constable (Civil Police / Provincial Armed Constabulary)",
        payLevel: "Pay Level 3 (UP State Pay Matrix)",
        basicPay: "₹21,700",
        grossPayApprox: "₹32,000 – ₹40,000 (including DA + HRA + uniform + transport allowance)",
        perks: [
          "Free uniform + ration in barracks",
          "Government accommodation / quarters",
          "Medical for self + family",
          "Risk + Hardship allowance for field posts",
          "Pension under UP State NPS",
          "Concessional LTC every 2 years",
        ],
        source: "https://uppolice.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ─── UP Police SI (Sub-Inspector) ───────────────────────────────
  {
    examCode: "UP_POLICE_SI",
    oneLiner:
      "UP Police Sub-Inspector (Civil Police) + Platoon Commander (PAC) + Fire Officer — officer-cadre recruitment in UP Police.",
    eligibility: {
      ageMin: 21,
      ageMax: 28,
      ageNotes:
        "21-28 for General. OBC +3, SC/ST +5, ex-servicemen 3 yrs after service. Reference date is 1 July of the exam year.",
      education: "Bachelor's degree (any discipline) from a recognised university.",
      educationDetails: [
        "Computer Operator certification or equivalent computer knowledge typically required.",
        "Physical and medical standards align with UP Police norms — same height/chest/weight criteria as Constable, slightly stricter.",
      ],
      attempts: "No formal attempt limit other than the upper age cap.",
      nationality: "Indian citizen with UP domicile preferred for reserved-category benefits.",
      specialConstraints: [
        "Physical Standards: Male — height 168 cm general (160 cm SC/ST), chest 79-84 cm. Female — height 152 cm (147 cm SC/ST).",
        "PET: 4.8 km run in 25 min (male), 2.4 km run in 14 min (female). Document verification + medical thereafter.",
      ],
      source: "https://uppbpb.gov.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Written cutoff (qualifying for PET/Document Verification)",
        outOf: "400 marks",
        rows: [
          { year: 2024, category: "General Male", cutoff: "~244 – 264" },
          { year: 2024, category: "OBC", cutoff: "~230 – 252" },
          { year: 2024, category: "SC", cutoff: "~205 – 228" },
          { year: 2024, category: "ST", cutoff: "~175 – 200" },
        ],
        source: "https://uppbpb.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [
      {
        postName: "Sub-Inspector (Civil Police) / Platoon Commander (PAC)",
        payLevel: "Pay Level 6 (UP State Pay Matrix)",
        basicPay: "₹35,400",
        grossPayApprox: "₹52,000 – ₹64,000 (including DA + HRA + uniform + special allowance)",
        perks: [
          "Free uniform + accommodation entitlement (officer quarters)",
          "Medical for self + family",
          "Risk + Field-area allowance",
          "Pension under UP State NPS",
          "Career progression to Inspector → Deputy SP",
        ],
        source: "https://uppolice.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ─── Maharashtra Police Bharti ──────────────────────────────────
  {
    examCode: "MH_POLICE_BHARTI",
    oneLiner:
      "Maharashtra Police Constable + Driver-Constable recruitment (Bharti) — direct state-level recruitment, conducted by the Maharashtra Home Department.",
    eligibility: {
      ageMin: 18,
      ageMax: 28,
      ageNotes:
        "18-28 for General. Age relaxation: OBC/SBC +3, SC/ST +5, ex-servicemen 3 yrs after service.",
      education: "Class 12 (HSC) pass from a recognised board.",
      educationDetails: [
        "Driver-Constable additionally needs a valid commercial driving licence (LMV + HMV) with 3+ years of experience.",
        "Marathi reading-writing-speaking mandatory.",
      ],
      attempts: "No formal attempt limit.",
      nationality: "Indian citizen, Maharashtra domicile.",
      specialConstraints: [
        "Physical Standards: Male — height 165 cm, chest 79-84 cm. Female — height 155 cm. Weight as per standard tables.",
        "PET: 1.6 km run in 6 min 30 sec (male); 800 m run in 4 min (female); long jump, shot put events.",
        "Marathi language test at recruitment stage.",
      ],
      source: "https://mahapolice.gov.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Written cutoff (final selection score, district-wise variation)",
        outOf: "100 marks (written) + 50 marks (PET)",
        rows: [
          { year: 2024, category: "General — Mumbai/Pune (high demand)", cutoff: "Final score ~135 – 145 / 150" },
          { year: 2024, category: "General — rural districts", cutoff: "Final score ~115 – 130" },
          { year: 2024, category: "OBC", cutoff: "Final score ~110 – 138 (district-wise)" },
          { year: 2024, category: "SC", cutoff: "Final score ~95 – 122" },
          { year: 2024, category: "ST", cutoff: "Final score ~80 – 110" },
        ],
        notes: "Maharashtra Police Bharti is district-specific — cutoff varies sharply by recruitment district.",
        source: "https://mahapolice.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [
      {
        postName: "Constable (Maharashtra Police)",
        payLevel: "S-8 (Maharashtra State Pay Matrix)",
        basicPay: "₹21,700",
        grossPayApprox: "₹33,000 – ₹40,000 (including DA + HRA + uniform allowance)",
        perks: [
          "Free uniform + accommodation in barracks",
          "Medical for self + family",
          "Risk + Field-area allowance",
          "Pension under Maharashtra State NPS",
        ],
        source: "https://mahapolice.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ─── Delhi Police Constable ─────────────────────────────────────
  {
    examCode: "DL_POLICE_PC",
    oneLiner:
      "Delhi Police Constable (Executive) recruitment — conducted by SSC on behalf of the Delhi Police (a centrally-administered force).",
    eligibility: {
      ageMin: 18,
      ageMax: 25,
      ageNotes:
        "18-25 for General. OBC +3, SC/ST +5, ex-servicemen 3 yrs after service. Reference date is 1 July of the exam year.",
      education: "Class 12 (Senior Secondary) pass from a recognised board.",
      educationDetails: [
        "Driving licence for LMV (Light Motor Vehicle) is mandatory at the document-verification stage — candidates must obtain it before applying.",
      ],
      attempts: "No formal attempt limit.",
      nationality: "Indian citizen.",
      specialConstraints: [
        "Physical Standards: Male — height 170 cm general (165 cm Garhwali/Kumaoni/Dogra/Marathas), chest 81-85 cm. Female — height 157 cm (155 cm for the same hill/martial categories).",
        "PET: 1.6 km race in 6 min (male) / 18-yr olds; varies by age. 800 m race in 4 min (female).",
        "PMT (Physical Measurement Test) precedes PET.",
      ],
      source: "https://ssc.nic.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Computer-Based Exam cutoff (qualifying for PET/PMT)",
        outOf: "100 marks",
        rows: [
          { year: 2023, category: "General Male", cutoff: "67 – 72" },
          { year: 2023, category: "General Female", cutoff: "63 – 68" },
          { year: 2023, category: "OBC", cutoff: "62 – 68" },
          { year: 2023, category: "EWS", cutoff: "60 – 66" },
          { year: 2023, category: "SC", cutoff: "52 – 58" },
          { year: 2023, category: "ST", cutoff: "45 – 52" },
        ],
        notes:
          "Delhi Police Constable runs through SSC; final selection requires clearing PMT + PET + medical + driving test.",
        source: "https://ssc.nic.in/",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [
      {
        postName: "Constable (Executive) — Delhi Police",
        payLevel: "Pay Level 3",
        basicPay: "₹21,700",
        grossPayApprox: "₹35,000 – ₹42,000 (X-class city Delhi, including DA + HRA + transport + special allowance)",
        perks: [
          "Free uniform + accommodation",
          "Risk + Hardship allowance for special duties",
          "Medical (CGHS)",
          "Pension under NPS",
          "LTC every 2 years",
        ],
        source: "https://www.delhipolice.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ─── Rajasthan Police Constable ─────────────────────────────────
  {
    examCode: "RJ_POLICE_PC",
    oneLiner:
      "Rajasthan Police Constable (Civil + Mounted + Telecom + Band) recruitment — conducted by the Rajasthan Police Recruitment Board.",
    eligibility: {
      ageMin: 18,
      ageMax: 23,
      ageNotes:
        "18-23 for General. Relaxation: OBC +3, SC/ST +5 (women extra +5 across categories).",
      education: "Class 10 / 12 depending on post (Class 12 for Telecom post; Class 10 for Civil/Band).",
      educationDetails: [
        "Telecom and IT-aware posts may need additional computer / Hindi-typing qualification.",
        "Rajasthan-language (Hindi) proficiency essential.",
      ],
      attempts: "No formal attempt limit.",
      nationality: "Indian citizen, Rajasthan domicile preferred.",
      specialConstraints: [
        "Physical Standards: Male — height 168 cm general (160 cm tribal/SC/ST), chest 81-86 cm. Female — height 152 cm.",
        "PET: 5 km run in 25 min (male); 5 km run in 35 min (female).",
        "Document verification + medical follow PET.",
      ],
      source: "https://police.rajasthan.gov.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Written cutoff (district-wise selection score)",
        outOf: "150 marks (written) + 30 marks (PET) + 20 marks (special qualifications)",
        rows: [
          { year: 2024, category: "General Male — Jaipur/Jodhpur (high demand)", cutoff: "~138 – 148" },
          { year: 2024, category: "General Male — rural districts", cutoff: "~115 – 130" },
          { year: 2024, category: "Female (avg)", cutoff: "~105 – 130" },
          { year: 2024, category: "OBC", cutoff: "~110 – 132" },
          { year: 2024, category: "SC / ST", cutoff: "~95 – 115" },
        ],
        notes: "Rajasthan Police is district-specific. Cutoffs published per-district per-category.",
        source: "https://police.rajasthan.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [
      {
        postName: "Constable (Rajasthan Police)",
        payLevel: "Pay Level L-5 (Rajasthan State Pay Matrix)",
        basicPay: "₹20,800",
        grossPayApprox: "₹30,000 – ₹37,000 (including DA + HRA + uniform allowance)",
        perks: [
          "Free uniform + accommodation in barracks",
          "Medical for self + family",
          "Risk + Field allowance",
          "Pension under Rajasthan State NPS",
        ],
        source: "https://police.rajasthan.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ─── Bihar Police Constable ─────────────────────────────────────
  {
    examCode: "BR_POLICE_PC",
    oneLiner:
      "Bihar Police Constable + Driver-Constable recruitment — conducted by the Central Selection Board of Constable (CSBC), Bihar Police.",
    eligibility: {
      ageMin: 18,
      ageMax: 25,
      ageNotes:
        "18-25 for General Male, 18-28 for General Female. EBC +2 (male) +3 (female); OBC +3; SC/ST +5.",
      education: "Class 12 pass (Senior Secondary) from a recognised board.",
      educationDetails: [
        "Driver-Constable additionally needs LMV/HMV driving licence with 1+ years of experience.",
        "Knowledge of Hindi mandatory.",
      ],
      attempts: "No formal attempt limit.",
      nationality: "Indian citizen, Bihar domicile.",
      specialConstraints: [
        "Physical Standards: Male — height 165 cm general (160 cm EBC/SC/ST), chest 81-86 cm. Female — height 155 cm (150 cm for EBC/SC/ST).",
        "PET: 1.6 km run in 6 min (male); 1 km run in 5 min (female).",
        "Document verification + medical follow PET.",
      ],
      source: "https://csbc.bihar.gov.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Written cutoff (qualifying for PET)",
        outOf: "100 marks",
        rows: [
          { year: 2024, category: "General Male", cutoff: "~50 – 60" },
          { year: 2024, category: "OBC / EBC", cutoff: "~48 – 55" },
          { year: 2024, category: "SC", cutoff: "~40 – 48" },
          { year: 2024, category: "ST", cutoff: "~35 – 42" },
        ],
        notes:
          "Written is qualifying (>30/100) — final merit comes from PET marks (100) alone. So PET performance is the actual selector.",
        source: "https://csbc.bihar.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [
      {
        postName: "Constable (Bihar Police)",
        payLevel: "Pay Level 3 (Bihar)",
        basicPay: "₹21,700",
        grossPayApprox: "₹29,000 – ₹35,000 (including DA + HRA + uniform allowance)",
        perks: ["Free uniform + ration in barracks", "Quarters in district HQ", "Medical for self + family", "Pension under Bihar State NPS"],
        source: "https://www.biharpolice.bih.nic.in/",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ─── Bihar Police SI ────────────────────────────────────────────
  {
    examCode: "BR_POLICE_SI",
    oneLiner:
      "Bihar Police Sub-Inspector (Daroga) recruitment — direct officer-cadre entry via the Bihar Police Subordinate Services Commission (BPSSC).",
    eligibility: {
      ageMin: 20,
      ageMax: 25,
      ageNotes:
        "20-25 for General Male, 20-28 for General Female. EBC +2 (male) +3 (female); OBC +3 (male) +5 (female); SC/ST +5 (male) +7 (female).",
      education: "Bachelor's degree (any discipline) from a recognised university.",
      attempts: "No formal attempt limit.",
      nationality: "Indian citizen, Bihar domicile.",
      specialConstraints: [
        "Physical Standards: Male — height 165 cm general (160 cm EBC/SC/ST), chest 81-86 cm. Female — height 155 cm.",
        "PET: 1 mile run in 6 min 30 sec (male); 1 km run in 6 min (female). Long jump + shot-put events.",
      ],
      source: "https://bpssc.bih.nic.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Prelims + Mains cutoff (qualifying for PET)",
        outOf: "200 marks (Prelims qualifying); 200 marks (Mains final-merit)",
        rows: [
          { year: 2023, category: "General Male — Prelims", cutoff: "~150 – 165" },
          { year: 2023, category: "OBC / EBC — Prelims", cutoff: "~140 – 158" },
          { year: 2023, category: "SC — Prelims", cutoff: "~120 – 140" },
          { year: 2023, category: "ST — Prelims", cutoff: "~110 – 130" },
        ],
        notes: "Mains marks (out of 200) + PET (out of 100) form the final merit list.",
        source: "https://bpssc.bih.nic.in/",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [
      {
        postName: "Sub-Inspector (Daroga) — Bihar Police",
        payLevel: "Pay Level 6 (Bihar)",
        basicPay: "₹35,400",
        grossPayApprox: "₹50,000 – ₹62,000 (including DA + HRA + uniform + special allowance)",
        perks: [
          "Officer quarters / lodging",
          "Free uniform + accommodation entitlement",
          "Medical for self + family",
          "Risk + Field-area allowance",
          "Career progression to Inspector → DySP",
          "Pension under Bihar State NPS",
        ],
        source: "https://bpssc.bih.nic.in/",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ─── Karnataka Police Constable ─────────────────────────────────
  {
    examCode: "KA_POLICE_PC",
    oneLiner:
      "Karnataka State Police Constable + Armed Reserve Constable recruitment — conducted by the Karnataka State Police Recruitment Board.",
    eligibility: {
      ageMin: 19,
      ageMax: 25,
      ageNotes:
        "19-25 for General. Relaxation: OBC +2-5 (category-wise: II A/II B/III A/III B); SC/ST +5; ex-servicemen 3 yrs after service.",
      education: "Class 12 (PUC II) pass from a Karnataka-recognised board or equivalent.",
      educationDetails: [
        "Kannada knowledge mandatory — verified via a separate qualifying language test.",
      ],
      attempts: "No formal attempt limit.",
      nationality: "Indian citizen, Karnataka domicile.",
      specialConstraints: [
        "Physical Standards: Male — height 168 cm general (160 cm Cat I/SC/ST), chest 86-91 cm. Female — height 157 cm (150 cm reserved).",
        "Endurance Test: 1.6 km run in 6 min 25 sec (male); 400 m run in 2 min (female). Long jump + shot-put events.",
      ],
      source: "https://ksp.karnataka.gov.in/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Written cutoff (qualifying for ET + PMT + medical)",
        outOf: "100 marks",
        rows: [
          { year: 2024, category: "General — Civil Constable", cutoff: "~63 – 72" },
          { year: 2024, category: "OBC II A / II B", cutoff: "~58 – 68" },
          { year: 2024, category: "SC", cutoff: "~50 – 60" },
          { year: 2024, category: "ST", cutoff: "~45 – 55" },
        ],
        notes: "Final selection score combines written + ET + PMT marks. Cutoff varies by district / battalion.",
        source: "https://ksp.karnataka.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [
      {
        postName: "Police Constable (Karnataka Police)",
        payLevel: "Pay Level 4 (Karnataka)",
        basicPay: "₹23,500",
        grossPayApprox: "₹33,000 – ₹40,000 (including DA + HRA + uniform allowance)",
        perks: [
          "Free uniform + ration",
          "Medical for self + family",
          "Risk + Field-area allowance",
          "Pension under Karnataka State NPS",
        ],
        source: "https://ksp.karnataka.gov.in/",
        verifiedAt: "2026-05",
      },
    ],
  },

  // ─── Tamil Nadu Police Constable ────────────────────────────────
  {
    examCode: "TN_POLICE_PC",
    oneLiner:
      "Tamil Nadu Police Constable (Grade II — Police, Jail, Fire) recruitment — conducted by the Tamil Nadu Uniformed Services Recruitment Board (TNUSRB).",
    eligibility: {
      ageMin: 18,
      ageMax: 24,
      ageNotes:
        "18-24 for General. Relaxation: BC/MBC +3, SC/ST/SCA +5 (and no upper limit for SC/ST/SCA/MBC/BC in some recent cycles).",
      education: "Class 12 (Higher Secondary, +2) pass from a recognised board.",
      educationDetails: [
        "Tamil reading-writing-speaking mandatory — verified via a separate qualifying language test.",
      ],
      attempts: "No formal attempt limit (within upper age cap).",
      nationality: "Indian citizen, Tamil Nadu domicile.",
      specialConstraints: [
        "Physical Standards: Male — height 170 cm general (167 cm reserved), chest 81-86 cm. Female — height 159 cm (157 cm reserved).",
        "Endurance Test (ET): 1500 m run in 7 min (male); 400 m run in 2 min 20 sec (female). Long jump + shot-put + high jump events.",
      ],
      source: "https://tnusrbonline.org/",
      verifiedAt: "2026-05",
    },
    cutoffs: [
      {
        title: "Final selection score cutoff (Written + Physical + Endurance)",
        outOf: "100 marks (Written) + 15 marks (Physical) + 10 marks (Special qualifications)",
        rows: [
          { year: 2024, category: "General Male", cutoff: "Final score ~70 – 80 / 125" },
          { year: 2024, category: "BC", cutoff: "Final score ~65 – 75" },
          { year: 2024, category: "MBC / DC", cutoff: "Final score ~60 – 72" },
          { year: 2024, category: "SC / SCA", cutoff: "Final score ~55 – 67" },
          { year: 2024, category: "ST", cutoff: "Final score ~50 – 62" },
        ],
        source: "https://tnusrbonline.org/",
        verifiedAt: "2026-05",
      },
    ],
    salaryBands: [
      {
        postName: "Grade II Police Constable (Tamil Nadu Police)",
        payLevel: "Pay Level 8 (Tamil Nadu State)",
        basicPay: "₹20,600",
        grossPayApprox: "₹32,000 – ₹38,000 (including DA + HRA + uniform allowance)",
        perks: [
          "Free uniform + accommodation in barracks",
          "Medical for self + family",
          "Risk + Hardship allowance for field/border posts",
          "Pension under TN State NPS",
        ],
        source: "https://tnusrbonline.org/",
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
