// Curated catalogue of Indian scholarships students preparing for any
// entrance exam can apply to. Maintained as a TypeScript file (not DB)
// so updates ship via PR + Vercel deploy — simpler than a DB seed for
// the launch. Migrate to a Prisma model when we add features that need
// per-row analytics (view counts, save-for-later, etc.).
//
// COVERAGE PRIORITIES (in order):
//   1. Central government umbrella schemes (NSP, INSPIRE, CSSS) —
//      apply to the largest number of students.
//   2. AICTE / UGC schemes — technical + general higher ed.
//   3. State-government portals — one per major state where we know
//      a real scholarship exists (Maharashtra, Tamil Nadu, etc).
//   4. Private foundations with national scope and real amounts —
//      Tata, Reliance, Aditya Birla, Adani, Mahindra, Sitaram Jindal.
//   5. Exam-specific — what JEE/NEET/UPSC toppers can apply for.
//
// SOURCES: Each entry was cross-checked against the official site at
// time of writing. URLs go to the awarding body / portal directly so
// students never land on a third-party aggregator. Where amounts vary
// by year/category we describe the typical band rather than a fixed
// number.

export type ScholarshipCategory = "GEN" | "OBC" | "SC" | "ST" | "EWS" | "MIN";
export type ScholarshipGender = "F" | "M" | null;
export type ScholarshipLevel =
  | "CLASS_9_10"
  | "CLASS_11_12"
  | "DIPLOMA"
  | "UG"
  | "PG"
  | "PHD";
export type ScholarshipType =
  | "CENTRAL"          // central govt scheme (NSP, MoE, DST, MSJE etc.)
  | "STATE"            // state-government scheme
  | "PRIVATE"          // corporate / foundation scholarship
  | "EXAM_SPECIFIC"    // tied to a specific entrance exam result
  | "MERIT"            // pure merit award (NTSE legacy etc.)
  | "RESEARCH";        // fellowships, PhD, INSPIRE-SHE etc.

export interface Scholarship {
  /** kebab-case slug, used in URLs and as the React key. */
  id: string;
  name: string;
  awardingBody: string;
  type: ScholarshipType;
  /** Two-letter Indian state code (e.g. "MH", "TN") or null for national/all-India. */
  state: string | null;
  /** Education levels this scholarship serves. */
  levels: ScholarshipLevel[];
  eligibility: {
    /** If present, ONLY these categories qualify. Omit for general/all. */
    categories?: ScholarshipCategory[];
    /** F = girls-only. M = boys-only. null/omit = any. */
    gender?: ScholarshipGender;
    /** Annual family income ceiling, in lakhs ₹. */
    incomeMaxLakhs?: number;
    /** Specific exam IDs that gate eligibility (e.g. NEET_UG, JEE_MAIN). */
    requiresExam?: string[];
    /** Minimum percentage (board / qualifying exam). */
    minMarksPct?: number;
    /** Other conditions in plain prose. Shown verbatim to the student. */
    note?: string;
  };
  /** Human-readable amount string — we don't compute or compare numerically. */
  amount: string;
  applyUrl: string;
  officialSite?: string;
  /** 1-2 sentences. Avoid marketing tone — be specific about what it pays for. */
  description: string;
  /** "Usually Oct-Nov" or "Rolling" or "Check portal" — exact dates change yearly. */
  deadline: string;
  /** Exam codes from prisma.exam where this scholarship is particularly relevant.
   *  Used for the per-exam-page section. */
  relevantExamCodes?: string[];
  /** Free-text tags for search and the AI tutor's matching. */
  tags: string[];
}

export const SCHOLARSHIPS: Scholarship[] = [
  // ─── CENTRAL / NATIONAL ───────────────────────────────────────────
  {
    id: "nsp-post-matric",
    name: "Post-Matric Scholarship (NSP)",
    awardingBody: "Ministry of Social Justice & Empowerment / Tribal Affairs / Minority Affairs",
    type: "CENTRAL",
    state: null,
    levels: ["CLASS_11_12", "DIPLOMA", "UG", "PG"],
    eligibility: {
      categories: ["SC", "ST", "OBC", "MIN"],
      incomeMaxLakhs: 2.5,
      note: "Family income ceiling varies by category (₹2.5L SC, ₹1L ST, ₹1.5L OBC). Indian citizen, regular full-time student in a recognised institution.",
    },
    amount: "Tuition fees + maintenance allowance ₹230–₹1,200/month + book grant. Total ₹4,000–₹13,500/year depending on hostel/day-scholar status.",
    applyUrl: "https://scholarships.gov.in/",
    officialSite: "https://scholarships.gov.in/",
    description:
      "Largest central scheme for SC/ST/OBC/Minority students in post-class-10 education. Covers tuition + monthly stipend + book grant. Applied through the National Scholarship Portal (NSP).",
    deadline: "Usually Oct–Dec each year (check NSP)",
    tags: ["sc", "st", "obc", "minority", "nsp", "post-matric"],
  },
  {
    id: "inspire-she",
    name: "INSPIRE-SHE",
    awardingBody: "Department of Science & Technology (DST), Govt. of India",
    type: "RESEARCH",
    state: null,
    levels: ["UG", "PG"],
    eligibility: {
      minMarksPct: 90,
      note: "Top 1% in class 12 boards OR top 10,000 in JEE/NEET ranks. Must enroll in a Natural / Basic Sciences UG/PG programme (BSc/MSc, integrated M.Sc., BS-MS).",
    },
    amount: "₹80,000/year (₹60,000 scholarship + ₹20,000 summer mentorship grant) for 5 years.",
    applyUrl: "https://online-inspire.gov.in/",
    officialSite: "https://www.online-inspire.gov.in/",
    description:
      "Five-year scholarship to draw top board / JEE / NEET performers into pure science research careers. Covers BSc, integrated MSc, and BS-MS programmes at any approved institution.",
    deadline: "Usually July–Aug, post board results",
    relevantExamCodes: ["JEE_MAIN", "JEE_ADVANCED", "NEET_UG"],
    tags: ["science", "research", "jee", "neet", "inspire", "dst", "merit"],
  },
  {
    id: "csss",
    name: "Central Sector Scholarship Scheme (CSSS)",
    awardingBody: "Ministry of Education, Govt. of India",
    type: "MERIT",
    state: null,
    levels: ["UG", "PG"],
    eligibility: {
      minMarksPct: 80,
      incomeMaxLakhs: 4.5,
      note: "Top 20 percentile in your state's class 12 board (subject to ~₹4.5L family income).",
    },
    amount: "₹12,000/year for UG (3 years) + ₹20,000/year for PG (2 years). Total up to ₹76,000.",
    applyUrl: "https://scholarships.gov.in/",
    description:
      "Awarded to ~82,000 fresh class-12 students annually for college and PG study. Pure merit + means; no caste restriction. Applied via NSP.",
    deadline: "Usually Oct–Nov on NSP",
    tags: ["nsp", "merit", "ug", "pg", "central", "general"],
  },
  {
    id: "pm-yasasvi",
    name: "PM YASASVI Scholarship",
    awardingBody: "Ministry of Social Justice & Empowerment",
    type: "CENTRAL",
    state: null,
    levels: ["CLASS_9_10", "CLASS_11_12"],
    eligibility: {
      categories: ["OBC", "EWS"],
      incomeMaxLakhs: 2.5,
      note: "Class 9 or 11 students from OBC / EBC / DNT communities. Selected via YASASVI Entrance Test (YET).",
    },
    amount: "Class 9: ₹75,000/year. Class 11: ₹1,25,000/year. Covers tuition, books, hostel.",
    applyUrl: "https://yet.nta.ac.in/",
    officialSite: "https://www.socialjustice.gov.in/",
    description:
      "Pre-Matric and Post-Matric merit scholarship for OBC, EBC, and Denotified-Tribe students. Funds top schools and PUC colleges.",
    deadline: "YET usually held Sep–Oct",
    tags: ["obc", "ebc", "yasasvi", "school", "puc", "yet"],
  },
  {
    id: "pragati-aicte",
    name: "Pragati Scholarship (AICTE)",
    awardingBody: "All India Council for Technical Education",
    type: "CENTRAL",
    state: null,
    levels: ["DIPLOMA", "UG"],
    eligibility: {
      gender: "F",
      incomeMaxLakhs: 8,
      note: "Girls admitted to first year of AICTE-approved Diploma or Degree (engineering/technical). 2 girls per family limit.",
    },
    amount: "₹50,000/year (tuition reimbursement + incidentals). 10,000 girls/year.",
    applyUrl: "https://www.aicte-india.org/schemes/students-development-schemes/Pragati",
    description:
      "Encourages girls to take up technical education. Covers tuition fees + ₹30,000 for books / lab / hostel. Renewable each year.",
    deadline: "Sep–Nov",
    relevantExamCodes: ["JEE_MAIN", "MH_MHTCET", "AP_EAMCET", "TS_EAMCET", "KA_KCET", "WB_WBJEE", "KL_KEAM"],
    tags: ["aicte", "girls", "engineering", "technical", "pragati"],
  },
  {
    id: "saksham-aicte",
    name: "Saksham Scholarship (AICTE)",
    awardingBody: "All India Council for Technical Education",
    type: "CENTRAL",
    state: null,
    levels: ["DIPLOMA", "UG"],
    eligibility: {
      incomeMaxLakhs: 8,
      note: "≥40% disability. Admitted to first year of AICTE-approved diploma or degree.",
    },
    amount: "₹50,000/year. 1,000 scholarships annually.",
    applyUrl: "https://www.aicte-india.org/schemes/students-development-schemes/Saksham",
    description:
      "Specially-abled students in AICTE-approved technical courses. Same value as Pragati. Disability certificate required.",
    deadline: "Sep–Nov",
    relevantExamCodes: ["JEE_MAIN", "MH_MHTCET", "AP_EAMCET", "TS_EAMCET", "KA_KCET"],
    tags: ["aicte", "disability", "specially-abled", "technical", "saksham"],
  },
  {
    id: "cbse-single-girl",
    name: "CBSE Merit Scholarship for Single Girl Child",
    awardingBody: "Central Board of Secondary Education",
    type: "MERIT",
    state: null,
    levels: ["CLASS_11_12"],
    eligibility: {
      gender: "F",
      minMarksPct: 60,
      note: "Only-girl-child in family. CBSE class-10 with ≥60% in 5 subjects. Studying class-11/12 in a CBSE-affiliated school with tuition ≤₹1,500/month.",
    },
    amount: "₹500/month for 2 years (class 11 + 12).",
    applyUrl: "https://www.cbse.gov.in/cbsenew/scholarship.html",
    description:
      "Small but symbolic merit award for only-daughters who clear CBSE class-10 well. Auto-renewed if class-11 results stay above 50%.",
    deadline: "Usually Aug–Sep after class-10 results",
    tags: ["cbse", "girls", "single-girl-child", "merit"],
  },
  {
    id: "nmmss",
    name: "National Means-cum-Merit Scholarship (NMMSS)",
    awardingBody: "Ministry of Education",
    type: "MERIT",
    state: null,
    levels: ["CLASS_9_10", "CLASS_11_12"],
    eligibility: {
      incomeMaxLakhs: 3.5,
      note: "Class 8 students from govt / aided schools. Cleared state NMMSS exam. Continued in classes 9–12 in govt / aided / local-body schools.",
    },
    amount: "₹12,000/year from class 9 through class 12.",
    applyUrl: "https://scholarships.gov.in/",
    description:
      "Stops bright kids from poor families dropping out of secondary school. ~1L scholarships awarded each year via state-wise selection exam.",
    deadline: "State NMMSS exam usually Nov; NSP application after results",
    tags: ["nsp", "school", "class-9", "class-10", "merit", "means"],
  },
  {
    id: "begum-hazrat-mahal",
    name: "Begum Hazrat Mahal Scholarship for Girls",
    awardingBody: "Maulana Azad Education Foundation, Min. of Minority Affairs",
    type: "CENTRAL",
    state: null,
    levels: ["CLASS_9_10", "CLASS_11_12"],
    eligibility: {
      gender: "F",
      categories: ["MIN"],
      minMarksPct: 50,
      incomeMaxLakhs: 2,
      note: "Girls from Muslim, Christian, Sikh, Buddhist, Jain, Parsi families. Class 9-12 in any recognised school.",
    },
    amount: "Class 9-10: ₹5,000/year. Class 11-12: ₹6,000/year.",
    applyUrl: "https://maef.nic.in/",
    description:
      "Helps girls from minority communities complete secondary education. Renewable if marks stay ≥50%.",
    deadline: "Aug–Oct",
    tags: ["minority", "muslim", "christian", "sikh", "girls", "school"],
  },
  {
    id: "pm-special-jk",
    name: "PM Special Scholarship Scheme for J&K and Ladakh",
    awardingBody: "AICTE, Govt. of India",
    type: "CENTRAL",
    state: "JK",
    levels: ["UG"],
    eligibility: {
      note: "Domicile of J&K or Ladakh. Cleared class 12 from J&K/Ladakh state board or CBSE. Admitted to recognised college OUTSIDE J&K/Ladakh.",
    },
    amount: "Up to ₹1.25 lakh/year for general UG + ₹1.5 lakh/year for B.Tech + ₹3 lakh/year for medical.",
    applyUrl: "https://www.aicte-india.org/bureaus/jk",
    description:
      "Covers tuition + maintenance for J&K and Ladakh students pursuing UG outside their home state — engineering, medical, or general degree.",
    deadline: "Apr–Aug",
    relevantExamCodes: ["JEE_MAIN", "NEET_UG", "JK_JKCET", "JK_JKPSC_KAS"],
    tags: ["jk", "ladakh", "engineering", "medical", "aicte"],
  },

  // ─── STATE GOVERNMENT ─────────────────────────────────────────────
  {
    id: "mahadbt",
    name: "MahaDBT Scholarships (Maharashtra)",
    awardingBody: "Government of Maharashtra",
    type: "STATE",
    state: "MH",
    levels: ["CLASS_11_12", "DIPLOMA", "UG", "PG"],
    eligibility: {
      note: "Maharashtra domicile. Multiple sub-schemes for SC/ST/OBC/EBC/NT/SBC/Minority/Open. Income caps vary by scheme (typically ₹8 lakh).",
    },
    amount: "Tuition reimbursement + ₹500–₹1,000/month maintenance, varies by scheme.",
    applyUrl: "https://mahadbt.maharashtra.gov.in/",
    description:
      "Single portal for ~38 Maharashtra government scholarships across welfare departments. Post-Matric Open Category, SBC, EBC, OBC, SC, ST, NT-A/B/C/D all live here.",
    deadline: "Each scheme has its own window — usually Jul–Dec",
    tags: ["maharashtra", "state", "mahadbt"],
  },
  {
    id: "tn-medical-free",
    name: "Tamil Nadu Government Medical Free Tuition (NEET)",
    awardingBody: "Govt. of Tamil Nadu — Health and Family Welfare Dept.",
    type: "STATE",
    state: "TN",
    levels: ["UG"],
    eligibility: {
      requiresExam: ["NEET_UG"],
      note: "Tamil Nadu domicile + NEET-qualified + admitted to a TN govt medical college under TN state quota.",
    },
    amount: "Full tuition fees (~₹3.5L/year for MBBS) waived for govt-quota seats.",
    applyUrl: "https://tnhealth.tn.gov.in/",
    description:
      "TN govt covers full tuition for state-quota MBBS/BDS seats at government medical colleges. Effectively makes medical education free for TN residents.",
    deadline: "At time of counselling (Jul–Sep)",
    relevantExamCodes: ["NEET_UG"],
    tags: ["tamil-nadu", "neet", "medical", "mbbs", "free-education"],
  },
  {
    id: "ts-epaas",
    name: "Telangana ePass Post-Matric Scholarship",
    awardingBody: "Government of Telangana",
    type: "STATE",
    state: "TS",
    levels: ["CLASS_11_12", "DIPLOMA", "UG", "PG"],
    eligibility: {
      categories: ["SC", "ST", "OBC", "EWS", "MIN"],
      incomeMaxLakhs: 2,
      note: "Telangana domicile. Income ≤₹2L (SC/ST), ≤₹1L (BC/EBC/Minorities/EWS).",
    },
    amount: "Full tuition reimbursement + ₹240–₹570/month maintenance.",
    applyUrl: "https://telanganaepass.cgg.gov.in/",
    description:
      "Telangana's flagship Post-Matric scheme. Covers tuition + maintenance for SC, ST, OBC, EBC, EWS, and minority students in approved courses.",
    deadline: "Aug–Dec each year",
    tags: ["telangana", "state", "epass"],
  },
  {
    id: "ap-jagananna-vidya",
    name: "Jagananna Vidya Deevena (Andhra Pradesh)",
    awardingBody: "Government of Andhra Pradesh",
    type: "STATE",
    state: "AP",
    levels: ["DIPLOMA", "UG", "PG"],
    eligibility: {
      incomeMaxLakhs: 2.5,
      note: "AP domicile, ration card mandatory. ITI / Polytechnic / Degree / Engineering / Medical etc.",
    },
    amount: "Full tuition reimbursement, paid directly to mother's bank account quarterly.",
    applyUrl: "https://jaganannavidyadeevena.ap.gov.in/",
    description:
      "AP's full-tuition-fee reimbursement scheme. Covers actual tuition fees of every eligible student in any recognised post-matric course.",
    deadline: "Rolling (per academic term)",
    tags: ["andhra-pradesh", "state", "jagananna", "vidya-deevena"],
  },
  {
    id: "ka-vidyasiri",
    name: "Karnataka Vidyasiri Scholarship",
    awardingBody: "Government of Karnataka",
    type: "STATE",
    state: "KA",
    levels: ["CLASS_11_12", "DIPLOMA", "UG", "PG"],
    eligibility: {
      categories: ["OBC", "MIN", "EWS"],
      incomeMaxLakhs: 1,
      note: "Karnataka domicile. Family income ≤₹1L (or ₹2L for minorities).",
    },
    amount: "Up to ₹1,500/month for hostellers + tuition fee reimbursement.",
    applyUrl: "https://ssp.karnataka.gov.in/",
    description:
      "Maintenance + fees scholarship for OBC, minority, and EWS students. Combined with the Karnataka State Scholarship Portal (SSP).",
    deadline: "Sep–Dec",
    tags: ["karnataka", "state", "ssp", "vidyasiri"],
  },

  // ─── PRIVATE / FOUNDATION ─────────────────────────────────────────
  {
    id: "reliance-ug",
    name: "Reliance Foundation Undergraduate Scholarship",
    awardingBody: "Reliance Foundation",
    type: "PRIVATE",
    state: null,
    levels: ["UG"],
    eligibility: {
      incomeMaxLakhs: 15,
      minMarksPct: 60,
      note: "First-year UG students from any recognised university in India. ≥60% in class 12.",
    },
    amount: "Up to ₹2 lakh over the course duration. 5,000 scholarships awarded annually.",
    applyUrl: "https://www.scholarships.reliancefoundation.org/",
    officialSite: "https://www.reliancefoundation.org/",
    description:
      "Need-cum-merit support for first-year UG students. Selection includes online aptitude test + interview. Open to all streams.",
    deadline: "Application window usually Aug–Sep",
    tags: ["reliance", "private", "ug", "need-merit"],
  },
  {
    id: "aditya-birla-capital",
    name: "Aditya Birla Capital Scholarship",
    awardingBody: "Aditya Birla Capital Foundation",
    type: "PRIVATE",
    state: null,
    levels: ["UG", "PG"],
    eligibility: {
      minMarksPct: 70,
      note: "Selected institutes only (IIT/IIM/BITS/ISB/etc.). Income ≤₹6L. Mix of merit + need.",
    },
    amount: "₹1.8 lakh/year for B.Tech (4 years) or ₹3.5 lakh/year for MBA (2 years).",
    applyUrl: "https://www.adityabirlacapital.com/abc-scholarship-program",
    description:
      "Targeted at students at top-tier institutions (all IITs, ISB, IIMs A/B/C, BITS Pilani). Very competitive, pays full institute fees in most cases.",
    deadline: "Sep–Nov each year",
    relevantExamCodes: ["JEE_ADVANCED", "CAT"],
    tags: ["aditya-birla", "private", "iit", "iim", "isb", "bits"],
  },
  {
    id: "tata-trusts",
    name: "Tata Trusts Scholarships",
    awardingBody: "Sir Ratan Tata Trust / J.N. Tata Endowment",
    type: "PRIVATE",
    state: null,
    levels: ["UG", "PG"],
    eligibility: {
      note: "Various sub-schemes: Tata Steel Scholarships, Lady Meherbai Tata Education Trust (women PG abroad), J.N. Tata Endowment (loan-scholarship for higher ed abroad). Each has its own eligibility.",
    },
    amount: "Varies from ₹50,000 to full course funding for overseas study.",
    applyUrl: "https://www.tatatrusts.org/our-work/individual-grants-programme",
    officialSite: "https://www.tatatrusts.org/",
    description:
      "Umbrella covering several Tata-supported scholarships. Most well-known: J.N. Tata Endowment loan-scholarship for postgraduate study abroad.",
    deadline: "Each sub-scheme has its own window — check portal",
    tags: ["tata", "private", "abroad", "pg"],
  },
  {
    id: "mahindra-maits",
    name: "Mahindra All India Talent Scholarship (MAITS)",
    awardingBody: "K.C. Mahindra Education Trust",
    type: "PRIVATE",
    state: null,
    levels: ["DIPLOMA", "UG"],
    eligibility: {
      incomeMaxLakhs: 1.2,
      minMarksPct: 60,
      note: "First-year students at recognised govt polytechnic / engineering / vocational colleges. ≥60% in class 12.",
    },
    amount: "₹10,000/year for 3-4 years.",
    applyUrl: "https://www.mahindrafoundation.org/scholarships",
    description:
      "Aimed at meritorious students from economically weaker backgrounds entering diploma / engineering / vocational courses.",
    deadline: "Aug–Oct",
    tags: ["mahindra", "private", "diploma", "engineering"],
  },
  {
    id: "sitaram-jindal",
    name: "Sitaram Jindal Foundation Scholarship",
    awardingBody: "Sitaram Jindal Foundation",
    type: "PRIVATE",
    state: null,
    levels: ["CLASS_11_12", "DIPLOMA", "UG", "PG"],
    eligibility: {
      incomeMaxLakhs: 3.5,
      minMarksPct: 60,
      note: "Indian citizens. Marks bar varies by stream (60% general, 65% engineering, 70% medical). 14 categories from class 11 to PhD.",
    },
    amount: "₹500–₹3,200/month, depending on course and stream.",
    applyUrl: "https://www.sitaramjindalfoundation.org/",
    description:
      "Broad-coverage private scholarship that funds students from class 11 through PG and PhD across most streams. Notable for being well-funded and accepting applications year-round.",
    deadline: "Rolling (apply any time of the year)",
    tags: ["sitaram-jindal", "private", "broad-coverage"],
  },
  {
    id: "adani-foundation",
    name: "Adani Foundation Scholarship",
    awardingBody: "Adani Foundation",
    type: "PRIVATE",
    state: null,
    levels: ["UG", "PG"],
    eligibility: {
      incomeMaxLakhs: 8,
      minMarksPct: 65,
      note: "Indian nationals, age ≤25, admitted to UG/PG at recognised institutes (priority for engineering/medical/management).",
    },
    amount: "₹50,000–₹1.5 lakh/year, depending on stream and need.",
    applyUrl: "https://www.adanifoundation.org/initiatives/quality-education/scholarships",
    description:
      "Need-cum-merit programme for UG/PG students from middle-class and lower-income families. Several streams supported including engineering, medical, MBA.",
    deadline: "Aug–Oct",
    tags: ["adani", "private", "need-merit"],
  },

  // ─── EXAM-SPECIFIC / MERIT ────────────────────────────────────────
  {
    id: "kvpy-legacy-inspire",
    name: "INSPIRE-MANAK / Top-1% Board Awards",
    awardingBody: "Department of Science & Technology",
    type: "MERIT",
    state: null,
    levels: ["CLASS_11_12", "UG"],
    eligibility: {
      minMarksPct: 90,
      note: "Top-1% in your state's class 12 board. Replacing the discontinued KVPY scheme as the merit gateway to INSPIRE-SHE.",
    },
    amount: "Lump-sum ₹10,000 award + automatic eligibility for INSPIRE-SHE worth ₹80,000/year if you join basic sciences UG.",
    applyUrl: "https://www.online-inspire.gov.in/",
    description:
      "Awarded by DST to top 1% of class-12 board pass-outs. Acts as a feeder to INSPIRE-SHE and earlier KVPY-style mentorship.",
    deadline: "Auto-nominated by your board",
    relevantExamCodes: ["JEE_MAIN", "JEE_ADVANCED", "NEET_UG"],
    tags: ["inspire", "dst", "merit", "top-1-percent", "science"],
  },
  {
    id: "ntse-state-legacy",
    name: "State Govt Merit Scholarships (post-NTSE)",
    awardingBody: "Various State Governments",
    type: "STATE",
    state: null,
    levels: ["CLASS_11_12", "UG"],
    eligibility: {
      minMarksPct: 85,
      note: "NTSE was discontinued centrally in 2021 but ~15 state boards continue similar talent search exams (e.g., Maharashtra Scholarship, MP MMVY, UP Pratibha). Check your state's school education department.",
    },
    amount: "Typically ₹1,250–₹2,000/month from class 11 through PG.",
    applyUrl: "https://ncert.nic.in/",
    description:
      "Post-NTSE legacy: even though the central NTSE was wound down, multiple state boards run continuation/replacement merit scholarships for class-10 toppers.",
    deadline: "Varies by state",
    tags: ["ntse", "merit", "state-talent-search", "school"],
  },
  {
    id: "buddy4study-aggregator",
    name: "Buddy4Study Scholarships Portal",
    awardingBody: "Buddy4Study (aggregator)",
    type: "PRIVATE",
    state: null,
    levels: ["CLASS_9_10", "CLASS_11_12", "DIPLOMA", "UG", "PG"],
    eligibility: {
      note: "Aggregator listing 800+ active scholarships. Each underlying scholarship has its own eligibility — use it to discover schemes not listed here.",
    },
    amount: "Varies — ranges from ₹5,000 to full course funding.",
    applyUrl: "https://www.buddy4study.com/scholarships",
    description:
      "Single largest aggregator of Indian scholarships. Useful as a second pass after the shortlist on this page — search by state, level, category, gender, exam.",
    deadline: "Each underlying scholarship has its own deadline",
    tags: ["aggregator", "buddy4study", "discovery"],
  },

  // ─── PHASE 2 BATCH: state schemes, girls-only, minority, defence,
  //     PwD, EWS, more private foundations.

  {
    id: "kanyashree-prakalpa-wb",
    name: "Kanyashree Prakalpa K1 + K2",
    awardingBody: "Government of West Bengal, Department of Women & Child Development",
    type: "STATE",
    state: "WB",
    levels: ["CLASS_11_12", "DIPLOMA", "UG"],
    eligibility: {
      gender: "F",
      incomeMaxLakhs: 1.2,
      note: "Unmarried girls aged 13-19 (K1) or 18-19 (K2). Studying in Classes 8-12 (K1) or pursuing UG/voc course (K2). UN award-winning conditional cash transfer.",
    },
    amount: "K1: ₹1,000 annual; K2: ₹25,000 one-time on turning 18.",
    applyUrl: "https://wbkanyashree.gov.in/",
    officialSite: "https://wbkanyashree.gov.in/",
    description:
      "Conditional cash transfer for girls to delay marriage and stay in school. UN Public Service Award 2017. State-funded and runs entirely via schools.",
    deadline: "Apply through school — rolling enrolment",
    tags: ["girls", "west bengal", "marriage delay", "wb"],
  },

  {
    id: "ladli-laxmi-mp",
    name: "Mukhyamantri Ladli Laxmi Yojana",
    awardingBody: "Madhya Pradesh Department of Women & Child Development",
    type: "STATE",
    state: "MP",
    levels: ["CLASS_11_12", "UG"],
    eligibility: {
      gender: "F",
      note: "Girls born in MP after Jan 2006. Parents must be Indian citizen residents of MP. Family with 2 or fewer children. Cumulative payouts at multiple milestones — Class 6, 9, 11, 12 + after Class 12.",
    },
    amount: "₹1,18,000 cumulative across Class 6 → Class 12 → after Class 12 milestones, plus ₹25k on marriage after 21.",
    applyUrl: "https://ladlilaxmi.mp.gov.in/",
    description:
      "Long-running MP state scheme to improve girl-child education + delay marriage. Payouts staged across Classes 6, 9, 11, 12 + post-Class 12 to disincentivise dropout.",
    deadline: "Apply at birth or in early childhood",
    tags: ["girls", "madhya pradesh", "mp"],
  },

  {
    id: "kalpana-chawla-hr",
    name: "Kalpana Chawla Scholarship for Girls (Haryana)",
    awardingBody: "Government of Haryana, Department of Higher Education",
    type: "STATE",
    state: "HR",
    levels: ["UG", "PG"],
    eligibility: {
      gender: "F",
      categories: ["GEN", "EWS", "OBC", "SC", "ST", "MIN"],
      note: "Domicile of Haryana. Girl student pursuing PG (MA / MSc / MTech / MBA). 60%+ in Class 12 + UG. Family income within prescribed slab.",
    },
    amount: "₹31,000 (one-time per year of PG course)",
    applyUrl: "https://highereduhry.ac.in/scholarship/",
    description:
      "Named after India's first woman in space. Annual grant for Haryana-domicile girls pursuing PG. Auto-renewed each year subject to academic progress.",
    deadline: "Usually Aug-Nov each academic year",
    tags: ["girls", "haryana", "pg", "kalpana chawla"],
  },

  {
    id: "ed-cell-up",
    name: "UP Scholarship (Sashakta Abhibhavak Yojna + Post-Matric)",
    awardingBody: "Government of Uttar Pradesh, Social Welfare Department",
    type: "STATE",
    state: "UP",
    levels: ["CLASS_11_12", "DIPLOMA", "UG", "PG"],
    eligibility: {
      categories: ["SC", "ST", "OBC", "MIN", "GEN"],
      incomeMaxLakhs: 2,
      note: "UP domicile. Income slab varies by category. Multiple sub-schemes through scholarship.up.gov.in.",
    },
    amount: "Tuition fees + maintenance ₹2,500-₹13,500 per year",
    applyUrl: "https://scholarship.up.gov.in/",
    description:
      "UP state portal aggregating pre-matric and post-matric scholarships for all categories. Largest state-level disbursement network in India.",
    deadline: "Usually Sep-Dec each year",
    tags: ["uttar pradesh", "up", "post matric"],
  },

  {
    id: "biju-saksham-od",
    name: "Biju Krushak Kalyan Yojana (Scholarship Component)",
    awardingBody: "Government of Odisha, Department of Cooperation",
    type: "STATE",
    state: "OD",
    levels: ["UG", "PG"],
    eligibility: {
      incomeMaxLakhs: 1.5,
      note: "Children of small/marginal farmers in Odisha. Pursuing professional UG/PG (engineering, medicine, agriculture, fisheries).",
    },
    amount: "₹10,000-₹50,000 per year",
    applyUrl: "https://scholarship.odisha.gov.in/",
    description:
      "Odisha state scheme for children of small/marginal farmers entering professional higher ed. Targets engineering, medical, agriculture, fisheries.",
    deadline: "Apply through state portal yearly",
    tags: ["odisha", "od", "farmer family", "agriculture"],
  },

  {
    id: "kerala-mathrubhumi-merit",
    name: "Kerala State Scholarships (e-Grantz)",
    awardingBody: "Government of Kerala, Department of Higher Education",
    type: "STATE",
    state: "KL",
    levels: ["CLASS_11_12", "UG", "PG"],
    eligibility: {
      categories: ["SC", "ST", "OBC"],
      incomeMaxLakhs: 1,
      note: "Kerala domicile. Multiple sub-schemes through e-Grantz: post-matric, central-sector-merit-cum-means, top-class. Detailed eligibility per sub-scheme.",
    },
    amount: "Tuition + maintenance varies by sub-scheme",
    applyUrl: "https://egrantz.kerala.gov.in/",
    description:
      "Kerala's unified scholarship portal. Covers central + state sub-schemes for SC/ST/OBC students at all levels post-matric. Strict income gating.",
    deadline: "Aug-Oct each academic cycle",
    tags: ["kerala", "kl", "e-grantz"],
  },

  {
    id: "maulana-azad-fellowship",
    name: "Maulana Azad National Fellowship",
    awardingBody: "Ministry of Minority Affairs",
    type: "RESEARCH",
    state: null,
    levels: ["PHD"],
    eligibility: {
      categories: ["MIN"],
      incomeMaxLakhs: 6,
      note: "5-year MPhil/PhD fellowship for minority students. Cleared NET-JRF or equivalent. Indian citizen of notified minority community.",
    },
    amount: "₹31,000-₹35,000/month + HRA + contingency.",
    applyUrl: "https://maef.nic.in/",
    description:
      "5-year doctoral fellowship for students from notified religious minorities. Stipend matches UGC-NET-JRF rates. Awarded by Ministry of Minority Affairs.",
    deadline: "Usually called via UGC/MAEF — check portal",
    tags: ["minority", "phd", "research", "fellowship", "maulana azad"],
  },

  {
    id: "ugc-net-jrf",
    name: "UGC NET Junior Research Fellowship",
    awardingBody: "University Grants Commission",
    type: "RESEARCH",
    state: null,
    levels: ["PG", "PHD"],
    eligibility: {
      requiresExam: ["UGC_NET"],
      note: "Cleared UGC NET-JRF in current/recent attempt. PG degree in qualifying subject with 55% (50% reserved). Indian citizen. Age limit varies.",
    },
    amount: "₹37,000/month for 2 years + ₹42,000/month for next 3 years + HRA + contingency.",
    applyUrl: "https://ugcnet.nta.ac.in/",
    description:
      "The single most-tested PhD funding gateway in India. JRF for 2 years then auto-converts to SRF for 3 more. Stipend has been revised upward periodically.",
    deadline: "NET held twice yearly (Jun + Dec)",
    tags: ["phd", "research", "ugc", "net jrf"],
    relevantExamCodes: ["UGC_NET"],
  },

  {
    id: "icmr-jrf-srf",
    name: "ICMR Junior Research Fellowship",
    awardingBody: "Indian Council of Medical Research",
    type: "RESEARCH",
    state: null,
    levels: ["PG", "PHD"],
    eligibility: {
      note: "MSc / MTech / MVSc / MPharm / MD in biomedical/life sciences with 55%. Cleared ICMR JRF entrance. Below 28 years (relaxations apply).",
    },
    amount: "₹37,000/month + HRA + contingency for first 2 years; ₹42,000/month + HRA for next 3.",
    applyUrl: "https://icmr.nic.in/career/jrf",
    description:
      "ICMR's parallel to CSIR-NET-JRF for biomedical research. Cleared candidates can pursue PhD at any ICMR institute or recognised university.",
    deadline: "Annual exam — usually July",
    tags: ["icmr", "phd", "biomedical", "research"],
  },

  {
    id: "lpu-nest-scholarship",
    name: "LPU NEST Scholarship",
    awardingBody: "Lovely Professional University",
    type: "EXAM_SPECIFIC",
    state: null,
    levels: ["UG", "PG"],
    eligibility: {
      requiresExam: ["LPUNEST"],
      note: "Cleared LPUNEST + admission to LPU. Scholarship slab depends on LPUNEST score, Class 12 board %, JEE Main rank, or NEET rank.",
    },
    amount: "10%-100% tuition waiver based on score slab",
    applyUrl: "https://nest.lpu.in/",
    description:
      "LPU's entrance-tied scholarship: better LPUNEST/JEE/NEET score → larger tuition waiver. Applied at admission time; renewable subject to CGPA.",
    deadline: "Around admission cycles, Apr-Jul",
    tags: ["lpu", "private university", "merit"],
  },

  {
    id: "amity-merit-50",
    name: "Amity University Merit Scholarship",
    awardingBody: "Amity University",
    type: "PRIVATE",
    state: null,
    levels: ["UG", "PG"],
    eligibility: {
      minMarksPct: 60,
      note: "Admission to Amity + Class 12 board % above threshold. Slabs based on board %, JEE/NEET rank, or Amity JEE rank.",
    },
    amount: "25%-100% tuition waiver",
    applyUrl: "https://www.amity.edu/scholarship",
    description:
      "Amity's published-rate merit scholarship across all campuses. Bands tied to board %, entrance ranks. Renewal subject to maintaining CGPA.",
    deadline: "At admission, May-Aug",
    tags: ["amity", "private university", "merit"],
  },

  {
    id: "kerala-merit-csss-state",
    name: "Central Sector Scheme of Scholarship (Kerala State Allocation)",
    awardingBody: "Government of Kerala (administered via DCE)",
    type: "MERIT",
    state: "KL",
    levels: ["UG"],
    eligibility: {
      categories: ["GEN", "OBC", "MIN", "EWS"],
      incomeMaxLakhs: 8,
      minMarksPct: 80,
      note: "Top 80th percentile in Class 12 Kerala State Board. Pursuing UG in recognised college. State allocation under the Central CSSS scheme.",
    },
    amount: "₹12,000-₹20,000 per year",
    applyUrl: "https://www.dcescholarship.kerala.gov.in/",
    description:
      "Kerala's allocation under the central CSSS. Better-targeted than NSP for high-scoring state-board students. Renewed yearly subject to UG performance.",
    deadline: "Sep-Nov each year",
    tags: ["kerala", "kl", "csss", "merit"],
  },

  {
    id: "pwd-trust-scholarship",
    name: "Scholarship for Students with Disabilities",
    awardingBody: "Department of Empowerment of Persons with Disabilities, MoSJE",
    type: "CENTRAL",
    state: null,
    levels: ["CLASS_11_12", "DIPLOMA", "UG", "PG"],
    eligibility: {
      incomeMaxLakhs: 2.5,
      note: "Indian citizen with 40%+ disability (PwD certificate). Pursuing post-matric / professional / technical course. Income ceiling ₹2.5L/year.",
    },
    amount: "Tuition + maintenance ₹500-₹2,500/month + escort/reader allowance",
    applyUrl: "https://scholarships.gov.in/",
    description:
      "Central scheme via NSP for PwD students. Covers tuition + monthly maintenance + reader/escort allowance for students with severe disabilities.",
    deadline: "Aligned with NSP cycle (Oct-Dec)",
    tags: ["disability", "pwd", "nsp", "depwd"],
  },

  {
    id: "df-jawan-scholarship",
    name: "Prime Minister's Scholarship for Wards of Defence Personnel",
    awardingBody: "Kendriya Sainik Board, Ministry of Defence",
    type: "CENTRAL",
    state: null,
    levels: ["UG"],
    eligibility: {
      minMarksPct: 60,
      note: "Wards/widows of armed forces personnel killed/disabled in action, ex-servicemen + their wards. Pursuing professional UG (engineering, medicine, MBA, law) recognised by AICTE/UGC/MCI.",
    },
    amount: "₹30,000/year for boys + ₹36,000/year for girls (up to 5 years)",
    applyUrl: "https://ksb.gov.in/",
    description:
      "PM Scholarship for wards of jawans / officers / ex-servicemen. Pays through the duration of professional UG. Administered by Kendriya Sainik Board.",
    deadline: "Usually Sep-Nov each year",
    tags: ["defence", "armed forces", "jawan", "ksb"],
  },

  {
    id: "rajasthan-medhavi-rj",
    name: "Devnarayan Scholarship for Girls + Medhavi Chhatra",
    awardingBody: "Government of Rajasthan, Social Justice & Empowerment Department",
    type: "STATE",
    state: "RJ",
    levels: ["CLASS_11_12", "UG", "PG"],
    eligibility: {
      gender: "F",
      categories: ["OBC", "GEN"],
      note: "Rajasthan domicile. Specific OBC sub-communities (Gurjar/Banjara/Gadia Lohar/Raika-Rebari) plus high-scoring girls from any community in Class 10/12 boards.",
    },
    amount: "Scooty + ₹50,000 + tuition reimbursement for top-bracket",
    applyUrl: "https://sso.rajasthan.gov.in/",
    description:
      "Rajasthan's flagship girls' scholarship — pays high-scoring girls a scooty + cash + reimburses tuition. Class 10/12 board topper variant + community-specific variant.",
    deadline: "Usually Aug-Nov each year",
    tags: ["rajasthan", "rj", "girls", "obc", "medhavi"],
  },

  {
    id: "punjab-aashirwad-pb",
    name: "Ashirwad Scheme (Punjab)",
    awardingBody: "Department of Welfare of SCs and BCs, Government of Punjab",
    type: "STATE",
    state: "PB",
    levels: ["CLASS_11_12", "UG"],
    eligibility: {
      categories: ["SC", "OBC"],
      incomeMaxLakhs: 2.5,
      note: "Punjab domicile. SC/BC students in classes 9-12 + UG. Family income ceiling ₹2.5L/year.",
    },
    amount: "₹3,000-₹6,000 + tuition fee waiver at govt colleges",
    applyUrl: "https://welfarepunjab.gov.in/",
    description:
      "Punjab state scheme for SC/BC students from low-income families. Tuition + cash component. Easier income gating than NSP.",
    deadline: "Aug-Nov each year",
    tags: ["punjab", "pb", "sc", "obc"],
  },

  {
    id: "swami-vivekananda-wb",
    name: "Swami Vivekananda Merit-cum-Means Scholarship",
    awardingBody: "Government of West Bengal, Higher Education Department",
    type: "STATE",
    state: "WB",
    levels: ["CLASS_11_12", "UG", "PG"],
    eligibility: {
      categories: ["GEN", "OBC"],
      incomeMaxLakhs: 2.5,
      minMarksPct: 60,
      note: "West Bengal domicile. Non-SC/ST students. 60%+ in last board exam. Family income ceiling ₹2.5L/year.",
    },
    amount: "₹1,000-₹5,000/month + book grant",
    applyUrl: "https://svmcm.wbhed.gov.in/",
    description:
      "West Bengal's largest merit-cum-means scheme for general + OBC categories (SC/ST get other schemes). Renewed annually subject to performance.",
    deadline: "Usually Jul-Oct each year",
    tags: ["west bengal", "wb", "merit cum means", "svmcm"],
  },

  {
    id: "telangana-overseas-min",
    name: "Telangana Overseas Scholarship (Minorities + SC/ST/BC)",
    awardingBody: "Telangana Minorities Welfare Department",
    type: "STATE",
    state: "TS",
    levels: ["PG", "PHD"],
    eligibility: {
      categories: ["SC", "ST", "OBC", "MIN"],
      incomeMaxLakhs: 5,
      note: "Telangana domicile. Admitted to a recognised overseas university for PG/PhD. Family income ceiling ₹5L/year. Below 35 years.",
    },
    amount: "Up to ₹20 lakh (one-time) for overseas studies",
    applyUrl: "https://telanganaepass.cgg.gov.in/",
    description:
      "Telangana's flagship overseas scholarship — pays up to ₹20L for SC/ST/OBC/Minority students admitted to ranked overseas universities for PG/PhD.",
    deadline: "Apply after overseas admission, twice yearly",
    tags: ["telangana", "ts", "overseas", "minority", "abroad"],
  },

  {
    id: "ap-jagannanna-vidya-deevena",
    name: "Jagananna Vidya Deevena (Fee Reimbursement)",
    awardingBody: "Government of Andhra Pradesh",
    type: "STATE",
    state: "AP",
    levels: ["UG", "PG"],
    eligibility: {
      categories: ["SC", "ST", "OBC", "MIN", "EWS"],
      incomeMaxLakhs: 1,
      note: "AP domicile. Family income ceiling ₹1L. Recognised UG/PG course. White ration card.",
    },
    amount: "100% tuition fee reimbursement (varies by course)",
    applyUrl: "https://jaganannavidyadeevena.ap.gov.in/",
    description:
      "AP's full tuition reimbursement scheme — replaces tuition fees for low-income SC/ST/OBC/Minority/EWS students at recognised UG/PG institutions in AP.",
    deadline: "Each academic semester",
    tags: ["andhra pradesh", "ap", "fee reimbursement", "jagananna"],
  },

  {
    id: "google-india-scholarship",
    name: "Generation Google Scholarship for Women in CS",
    awardingBody: "Google + EdCast (admin)",
    type: "PRIVATE",
    state: null,
    levels: ["UG"],
    eligibility: {
      gender: "F",
      note: "Female student pursuing a CS-related UG in India. Demonstrated leadership + academic strength. Must be enrolled in an accredited Indian institution.",
    },
    amount: "$1,000 (~₹85,000) one-time",
    applyUrl: "https://buildyourfuture.withgoogle.com/scholarships/generation-google-scholarship",
    description:
      "Google's APAC scholarship program for women in computer science. Year-cycle application; selected awardees also get invited to Google APAC dev events.",
    deadline: "Usually Dec-Feb",
    tags: ["google", "women", "cs", "engineering", "stem"],
  },

  {
    id: "kc-mahindra-india-edu",
    name: "K.C. Mahindra Scholarship for Post-Graduate Studies Abroad",
    awardingBody: "K.C. Mahindra Education Trust",
    type: "PRIVATE",
    state: null,
    levels: ["PG"],
    eligibility: {
      note: "Indian citizen accepted to a recognised overseas PG program. First-class UG. Below 38 years. Demonstrated need + merit.",
    },
    amount: "Up to ₹10 lakh (interest-free loan / grant)",
    applyUrl: "https://www.kcmet.org/",
    description:
      "K.C. Mahindra Trust's overseas PG scholarship — partly grant, partly interest-free loan repayable after employment. Highly selective, ~50 awardees/year.",
    deadline: "Usually Mar-Apr",
    tags: ["mahindra", "abroad", "pg", "overseas", "loan"],
  },

  {
    id: "lila-poonawalla-girls",
    name: "Lila Poonawalla Foundation Scholarship",
    awardingBody: "Lila Poonawalla Foundation",
    type: "PRIVATE",
    state: null,
    levels: ["UG", "PG"],
    eligibility: {
      gender: "F",
      categories: ["GEN", "OBC", "SC", "ST", "EWS", "MIN"],
      incomeMaxLakhs: 6,
      note: "Girls pursuing engineering, science, IT, or biotech UG/PG. Pune/Maharashtra preferred but national admissions accepted.",
    },
    amount: "Tuition fees + ₹15,000-₹30,000/year stipend",
    applyUrl: "https://lilapoonawallafoundation.com/",
    description:
      "Pune-based Lila Poonawalla Foundation pays tuition + a yearly stipend for girls in STEM UG/PG. Selection by interview + academic record.",
    deadline: "Mar-Jul each year",
    tags: ["girls", "stem", "engineering", "private foundation", "poonawalla"],
  },

  {
    id: "narotam-sekhsaria-pg",
    name: "Narotam Sekhsaria Foundation Loan Scholarship",
    awardingBody: "Narotam Sekhsaria Foundation",
    type: "PRIVATE",
    state: null,
    levels: ["PG"],
    eligibility: {
      note: "Indian citizen accepted to a recognised PG program in India or abroad. Below 30 years. First class in UG.",
    },
    amount: "Interest-free loan up to ₹20 lakh",
    applyUrl: "https://www.nsfoundation.co.in/",
    description:
      "Interest-free loan (not grant) for high-merit Indian students pursuing PG in or out of India. Repayment after employment. Cement-industry-funded.",
    deadline: "Annual cycle, Apr-May",
    tags: ["narotam sekhsaria", "loan", "pg", "abroad", "private foundation"],
  },

  {
    id: "ts-cm-overseas",
    name: "Telangana CM Overseas Scholarship (BC)",
    awardingBody: "Telangana BC Welfare Department",
    type: "STATE",
    state: "TS",
    levels: ["PG"],
    eligibility: {
      categories: ["OBC"],
      incomeMaxLakhs: 5,
      note: "Telangana domicile + OBC (BC) category. Admitted to ranked overseas PG program. Below 35 years.",
    },
    amount: "Up to ₹20 lakh (one-time)",
    applyUrl: "https://www.bcwelfare.telangana.gov.in/",
    description:
      "Telangana BC Welfare's overseas scheme — counterpart of the MWD overseas scheme but for OBC/BC students. Highly competitive shortlist.",
    deadline: "Twice yearly",
    tags: ["telangana", "ts", "overseas", "obc", "abroad"],
  },

  {
    id: "infosys-foundation-rural",
    name: "Infosys Foundation Aarohan Social Innovation Scholarship",
    awardingBody: "Infosys Foundation",
    type: "PRIVATE",
    state: null,
    levels: ["UG", "PG"],
    eligibility: {
      note: "Indian individual / NGO / student team building a social-impact tech solution. Application via competitive submission of project.",
    },
    amount: "₹50 lakh grants distributed across selected projects",
    applyUrl: "https://www.infosys.com/infosys-foundation/initiatives/aarohan.html",
    description:
      "Infosys Foundation's social-innovation grant program. Not a traditional academic scholarship — funds students/teams building tech-for-good solutions.",
    deadline: "Annual cycle",
    tags: ["infosys", "innovation", "grant", "social impact"],
  },
];

/**
 * Filter scholarships for a specific exam page. Combines:
 *   - explicit `relevantExamCodes` matches
 *   - eligibility.requiresExam matches
 *   - exam category heuristic (e.g. all engineering exams get AICTE Pragati/Saksham)
 */
export function scholarshipsForExam(
  examCode: string,
  examCategory: string,
): Scholarship[] {
  return SCHOLARSHIPS.filter((s) => {
    if (s.relevantExamCodes?.includes(examCode)) return true;
    if (s.eligibility.requiresExam?.includes(examCode)) return true;

    // Category heuristics — surface broad scholarships on the right pages.
    if (examCategory === "ENGINEERING" && /aicte|engineering|technical/.test(s.tags.join(","))) return true;
    if (examCategory === "MEDICAL" && /medical|neet/.test(s.tags.join(","))) return true;
    if (examCategory === "STATE_LEVEL" && s.type === "STATE") return false; // handled per-state below
    // Always surface the broadest umbrella schemes regardless of category.
    if (["nsp-post-matric", "csss", "nmmss", "sitaram-jindal", "reliance-ug", "buddy4study-aggregator"].includes(s.id)) {
      return true;
    }
    return false;
  });
}

/**
 * Filter by an Indian state code so the exam-page section for a
 * state-level exam can surface that state's scholarships.
 */
export function scholarshipsForState(stateCode: string): Scholarship[] {
  return SCHOLARSHIPS.filter((s) => s.state === stateCode || s.state === null);
}
