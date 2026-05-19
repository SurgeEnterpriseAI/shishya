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

  // ─── PHASE 2.2 EXPANSION: more states, sports, defence variants,
  //     private foundations, community-specific, professional societies.

  // ── More state schemes ────────────────────────────────────────────
  {
    id: "bihar-mukhyamantri-medha",
    name: "Mukhyamantri Medhavi Yojana (Bihar)",
    awardingBody: "Government of Bihar, Education Department",
    type: "STATE",
    state: "BR",
    levels: ["CLASS_11_12", "UG"],
    eligibility: {
      gender: "F",
      categories: ["GEN", "OBC", "SC", "ST", "EWS", "MIN"],
      note: "Bihar domicile, girls passing Class 12 in 1st division from BSEB schools. Unmarried.",
    },
    amount: "₹25,000 one-time on Class 12 pass + ₹10,000 on Class 10",
    applyUrl: "https://medhasoft.bih.nic.in/",
    description: "Bihar girls who pass Class 12 in 1st division get a ₹25k one-time grant. Ties to the conditional cash-transfer goal of keeping girls enrolled through Class 12.",
    deadline: "Apply after board results, Jun-Oct",
    tags: ["bihar", "br", "girls", "medhavi"],
  },
  {
    id: "jharkhand-mukhyamantri-merit",
    name: "Jharkhand Mukhyamantri Medha Chhatravriti",
    awardingBody: "Government of Jharkhand, School Education Department",
    type: "STATE",
    state: "JH",
    levels: ["CLASS_9_10", "CLASS_11_12"],
    eligibility: {
      incomeMaxLakhs: 1.5,
      minMarksPct: 60,
      note: "Jharkhand domicile, JAC board students.",
    },
    amount: "₹1,500-₹3,000/year",
    applyUrl: "https://jharkhandscholarship.com/",
    description: "Jharkhand state scheme for high-scoring school students with family income up to ₹1.5L/year.",
    deadline: "Sep-Nov each year",
    tags: ["jharkhand", "jh"],
  },
  {
    id: "chhattisgarh-prayas",
    name: "Mukhyamantri Gyan Protsahan Yojana (Chhattisgarh)",
    awardingBody: "Government of Chhattisgarh, School Education Department",
    type: "STATE",
    state: "CG",
    levels: ["CLASS_9_10", "CLASS_11_12"],
    eligibility: {
      categories: ["SC", "ST"],
      minMarksPct: 75,
      note: "Chhattisgarh domicile. SC/ST students with 75%+ in Class 10.",
    },
    amount: "₹15,000/year",
    applyUrl: "https://cg.nic.in/",
    description: "Chhattisgarh's incentive for SC/ST students scoring 75%+ in Class 10 to continue into Class 11-12 instead of dropping out.",
    deadline: "After Class 10 results",
    tags: ["chhattisgarh", "cg", "sc", "st"],
  },
  {
    id: "gujarat-mysy",
    name: "Mukhyamantri Yuva Swavalamban Yojana (MYSY)",
    awardingBody: "Government of Gujarat, Education Department",
    type: "STATE",
    state: "GJ",
    levels: ["UG"],
    eligibility: {
      incomeMaxLakhs: 6,
      minMarksPct: 80,
      note: "Gujarat domicile. 80%+ in Class 12 (state board) or top 5 percentile (CBSE/ICSE). Pursuing UG in Gujarat.",
    },
    amount: "50% tuition reimbursement (up to ₹2L) + book grant + hostel allowance",
    applyUrl: "https://mysy.guj.nic.in/",
    description: "Gujarat's flagship UG fee-reimbursement for high-scoring Class 12 students from middle-income families. Renewable yearly subject to SGPA.",
    deadline: "Jul-Nov each year",
    tags: ["gujarat", "gj", "mysy", "merit"],
  },
  {
    id: "goa-cm-merit",
    name: "Goa CM's Higher Education Scholarship",
    awardingBody: "Directorate of Higher Education, Government of Goa",
    type: "STATE",
    state: "GA",
    levels: ["UG"],
    eligibility: {
      minMarksPct: 60,
      incomeMaxLakhs: 8,
      note: "Goa domicile. UG in any recognised Indian college.",
    },
    amount: "₹25,000-₹50,000/year",
    applyUrl: "https://dhe.goa.gov.in/",
    description: "Goa's broad-coverage UG scholarship — modest income gate, modest marks gate, applies to Goans studying anywhere in India.",
    deadline: "Aug-Nov each year",
    tags: ["goa", "ga", "ug merit"],
  },
  {
    id: "assam-anundoram",
    name: "Anundoram Borooah Award (Assam)",
    awardingBody: "Government of Assam, Education Department",
    type: "STATE",
    state: "AS",
    levels: ["CLASS_9_10"],
    eligibility: {
      minMarksPct: 75,
      note: "Assam domicile, HSLC (Class 10) passed with letter marks in 4+ subjects.",
    },
    amount: "₹15,000-₹20,000 one-time + laptop (some years)",
    applyUrl: "https://sebaonline.org/",
    description: "Assam's incentive for high-scoring Class 10 students. Some cycles include a laptop in the award.",
    deadline: "Post Class 10 results",
    tags: ["assam", "as", "borooah"],
  },
  {
    id: "tripura-merit-cm",
    name: "Tripura CM's Merit Scholarship",
    awardingBody: "Government of Tripura, Higher Education Department",
    type: "STATE",
    state: "TR",
    levels: ["UG", "PG"],
    eligibility: {
      minMarksPct: 60,
      incomeMaxLakhs: 3,
      note: "Tripura domicile. UG/PG at recognised institution.",
    },
    amount: "₹10,000-₹25,000/year",
    applyUrl: "https://highereducation.tripura.gov.in/",
    description: "Tripura's general merit-cum-means scholarship for UG/PG students. State allocation supplements central NSP rates.",
    deadline: "Sep-Nov each year",
    tags: ["tripura", "tr", "north east"],
  },
  {
    id: "sikkim-cm-merit",
    name: "Sikkim CM's Merit-cum-Means Scholarship",
    awardingBody: "HRD Department, Government of Sikkim",
    type: "STATE",
    state: "SK",
    levels: ["UG", "PG"],
    eligibility: {
      incomeMaxLakhs: 5,
      minMarksPct: 60,
      note: "Sikkim domicile. Indian citizen.",
    },
    amount: "Tuition + ₹10,000-₹25,000/year stipend",
    applyUrl: "https://www.sikkimhrdd.org/",
    description: "Sikkim's merit-cum-means UG/PG scholarship — covers tuition for Sikkimese students attending recognised Indian institutions.",
    deadline: "Aug-Oct each year",
    tags: ["sikkim", "sk", "north east"],
  },
  {
    id: "manipur-cm-merit",
    name: "Manipur CM's Scholarship Scheme",
    awardingBody: "Manipur Directorate of Education (S)",
    type: "STATE",
    state: "MN",
    levels: ["CLASS_11_12", "UG"],
    eligibility: {
      minMarksPct: 60,
      note: "Manipur domicile. Indian citizen. Pursuing Class 11-12 or UG.",
    },
    amount: "₹5,000-₹15,000/year",
    applyUrl: "https://www.manipureducation.gov.in/",
    description: "Manipur state-allocation scholarship supplementing central schemes for general-category students from the state.",
    deadline: "Aug-Oct each year",
    tags: ["manipur", "mn", "north east"],
  },
  {
    id: "mizoram-meritcum",
    name: "Mizoram State Merit-cum-Means Scholarship",
    awardingBody: "Higher & Technical Education Department, Mizoram",
    type: "STATE",
    state: "MZ",
    levels: ["UG", "PG"],
    eligibility: {
      minMarksPct: 60,
      incomeMaxLakhs: 2.5,
      note: "Mizoram domicile, ST students included with adjusted income gate.",
    },
    amount: "₹10,000-₹20,000/year",
    applyUrl: "https://highereduhmiz.nic.in/",
    description: "Mizoram allocation for UG/PG students. ST students from Mizoram are eligible for the larger amount under the ST sub-scheme.",
    deadline: "Sep-Nov each year",
    tags: ["mizoram", "mz", "north east"],
  },
  {
    id: "nagaland-merit",
    name: "Nagaland State Merit Scholarship",
    awardingBody: "Higher Education Department, Nagaland",
    type: "STATE",
    state: "NL",
    levels: ["UG"],
    eligibility: {
      minMarksPct: 60,
      note: "Nagaland domicile. UG enrolment.",
    },
    amount: "₹10,000-₹15,000/year",
    applyUrl: "https://highereducation.nagaland.gov.in/",
    description: "Nagaland state's annual merit scholarship for UG students. Modest amount but eligibility is broad.",
    deadline: "Yearly cycle",
    tags: ["nagaland", "nl", "north east"],
  },
  {
    id: "ar-merit-arunachal",
    name: "Arunachal Pradesh CM Scholarship for Higher Studies",
    awardingBody: "Higher & Technical Education Department, Arunachal Pradesh",
    type: "STATE",
    state: "AR",
    levels: ["UG", "PG"],
    eligibility: {
      minMarksPct: 60,
      incomeMaxLakhs: 3,
      note: "Arunachal Pradesh domicile, UG/PG enrolment.",
    },
    amount: "Tuition reimbursement + ₹15,000-₹25,000/year",
    applyUrl: "https://education.arunachal.gov.in/",
    description: "Arunachal's broad UG/PG scholarship — tuition reimbursement + stipend for state-domicile students.",
    deadline: "Aug-Oct each year",
    tags: ["arunachal", "ar", "north east"],
  },
  {
    id: "meghalaya-pmrf",
    name: "Meghalaya CM's Merit-cum-Means",
    awardingBody: "Directorate of Higher Technical Education, Meghalaya",
    type: "STATE",
    state: "ML",
    levels: ["UG", "PG"],
    eligibility: {
      incomeMaxLakhs: 3,
      minMarksPct: 50,
      note: "Meghalaya domicile.",
    },
    amount: "₹8,000-₹20,000/year",
    applyUrl: "https://meghedu.gov.in/",
    description: "Meghalaya's general merit-cum-means scholarship. Income gate is lower than most states, eligibility broader.",
    deadline: "Sep-Nov each year",
    tags: ["meghalaya", "ml", "north east"],
  },
  {
    id: "uk-nandadevi",
    name: "Nanda Devi Kanya Yojana (Uttarakhand)",
    awardingBody: "Government of Uttarakhand, Department of Women Empowerment",
    type: "STATE",
    state: "UK",
    levels: ["CLASS_11_12"],
    eligibility: {
      gender: "F",
      note: "Uttarakhand domicile, girls born after 2019. Cumulative payouts across Class 6 → Class 12.",
    },
    amount: "₹51,000 cumulative across milestones",
    applyUrl: "https://wecd.uk.gov.in/",
    description: "Uttarakhand's girls'-education conditional-cash-transfer. Stagger-paid across Class 6, 8, 10, 12 to keep girls in school.",
    deadline: "Birth-time + milestone-based",
    tags: ["uttarakhand", "uk", "girls"],
  },
  {
    id: "hp-medhavi",
    name: "Himachal Mukhyamantri Medhavi Chhatra Vidya Yojana",
    awardingBody: "Higher Education Department, HP",
    type: "STATE",
    state: "HP",
    levels: ["UG"],
    eligibility: {
      minMarksPct: 75,
      incomeMaxLakhs: 4,
      note: "HP domicile. 75%+ in Class 12. Pursuing UG (any stream) in HP.",
    },
    amount: "Interest-free education loan up to ₹1 lakh/year",
    applyUrl: "https://himachal.nic.in/",
    description: "HP's interest-free education loan (not a grant) for high-scoring students from middle-income HP families. Repayable after employment.",
    deadline: "Yearly cycle, Aug-Oct",
    tags: ["himachal", "hp", "loan", "merit"],
  },
  {
    id: "jk-pmss",
    name: "PMSS for J&K and Ladakh",
    awardingBody: "AICTE on behalf of MHRD",
    type: "CENTRAL",
    state: "JK",
    levels: ["UG"],
    eligibility: {
      incomeMaxLakhs: 8,
      note: "J&K or Ladakh domicile. Pursuing UG in recognised institution outside J&K/Ladakh.",
    },
    amount: "Up to ₹1.25 lakh/year (tuition) + ₹1 lakh/year (maintenance for outside-state)",
    applyUrl: "https://www.aicte-india.org/schemes/students-development-schemes",
    description: "PM Special Scholarship Scheme for J&K + Ladakh students pursuing UG outside the union territories. Pays full tuition + maintenance.",
    deadline: "Apply early Jun-Aug each cycle",
    tags: ["jk", "ladakh", "pmss"],
  },

  // ── Defence + Sports + Arts ───────────────────────────────────────
  {
    id: "csbc-defence-dependants",
    name: "Defence Dependants Education Concession (CBSE / KVS)",
    awardingBody: "Kendriya Sainik Board",
    type: "CENTRAL",
    state: null,
    levels: ["CLASS_9_10", "CLASS_11_12"],
    eligibility: {
      note: "Wards/widows of armed forces (Army/Navy/Air Force) personnel and ex-servicemen.",
    },
    amount: "Tuition concession + book grant + hostel fee waiver",
    applyUrl: "https://ksb.gov.in/",
    description: "School-level fee concessions for defence families through KSB. Often combined with KV/Sainik schools' internal waivers.",
    deadline: "Yearly cycle",
    tags: ["defence", "armed forces", "ksb", "school"],
  },
  {
    id: "khelo-india-stipend",
    name: "Khelo India Talent Identification + Stipend",
    awardingBody: "Sports Authority of India, Ministry of Youth Affairs & Sports",
    type: "CENTRAL",
    state: null,
    levels: ["CLASS_9_10", "CLASS_11_12", "UG"],
    eligibility: {
      note: "Identified through Khelo India Games / state-level talent identification. Athletes age 14-25 in priority sports.",
    },
    amount: "₹6.28 lakh/year (₹1.2L stipend + training + nutrition + tournament expenses)",
    applyUrl: "https://kheloindia.gov.in/",
    description: "Government scheme for promising athletes — 8-year sponsorship with stipend, coaching, equipment, tournament expenses. Identified through Khelo India and state events.",
    deadline: "Identified via Khelo India Youth Games / SAI talent search",
    tags: ["sports", "khelo india", "athlete", "sai"],
  },
  {
    id: "gmsb-target-olympic",
    name: "TOPS (Target Olympic Podium Scheme)",
    awardingBody: "Mission Olympic Cell, Ministry of Youth Affairs & Sports",
    type: "CENTRAL",
    state: null,
    levels: ["UG", "PG"],
    eligibility: {
      note: "World-class Indian athletes in Olympic + Paralympic disciplines. Selected by Mission Olympic Cell.",
    },
    amount: "₹50,000/month + customised training + travel + nutrition + equipment",
    applyUrl: "https://yas.nic.in/sports/tops",
    description: "India's top-tier athlete sponsorship for Olympic/Paralympic medal candidates. Comprehensive support package; selection by Mission Olympic Cell.",
    deadline: "Selected from existing athlete pool",
    tags: ["sports", "olympic", "tops", "athlete"],
  },
  {
    id: "ccrt-cultural",
    name: "CCRT Junior + Senior Fellowships (Performing/Visual Arts)",
    awardingBody: "Centre for Cultural Resources and Training, Ministry of Culture",
    type: "RESEARCH",
    state: null,
    levels: ["UG", "PG", "PHD"],
    eligibility: {
      note: "Practitioners or researchers in classical music, dance, theatre, visual arts, folk arts. Age 18-40 for Junior, 40+ for Senior.",
    },
    amount: "₹10,000-₹20,000/month for 2 years",
    applyUrl: "https://ccrtindia.gov.in/",
    description: "Ministry of Culture fellowship for serious practitioners + researchers in traditional Indian arts. Junior (developing artist) or Senior (established).",
    deadline: "Annual cycle, usually Apr-Jul",
    tags: ["culture", "arts", "music", "dance", "fellowship"],
  },
  {
    id: "ust-cultural-young",
    name: "Cultural Talent Search Scholarship",
    awardingBody: "CCRT, Ministry of Culture",
    type: "MERIT",
    state: null,
    levels: ["CLASS_9_10", "CLASS_11_12"],
    eligibility: {
      note: "Children aged 10-14 with demonstrated talent in traditional Indian art forms. Family income below ₹4L/year.",
    },
    amount: "₹3,600/year tuition + ₹9,000/year maintenance",
    applyUrl: "https://ccrtindia.gov.in/",
    description: "School-level scholarship for children with talent in classical music/dance/theatre/visual arts. Runs through Class 10-12.",
    deadline: "Aug-Oct each year",
    tags: ["culture", "arts", "child", "ccrt"],
  },

  // ── Professional society + tech ───────────────────────────────────
  {
    id: "ieee-india-merit",
    name: "IEEE India Council Merit Scholarship",
    awardingBody: "IEEE India Council",
    type: "PRIVATE",
    state: null,
    levels: ["UG", "PG"],
    eligibility: {
      note: "Active IEEE student member. Pursuing engineering UG/PG in India. Demonstrated technical contributions / IEEE involvement.",
    },
    amount: "₹15,000-₹50,000 (varies by award)",
    applyUrl: "https://ieeeindiacouncil.org/",
    description: "Award + scholarship streams from IEEE India for student members with demonstrated engagement (papers, projects, society leadership).",
    deadline: "Per award — check council site",
    tags: ["ieee", "engineering", "professional society"],
  },
  {
    id: "csi-student",
    name: "Computer Society of India Student Scholarship",
    awardingBody: "Computer Society of India",
    type: "PRIVATE",
    state: null,
    levels: ["UG", "PG"],
    eligibility: {
      note: "CSI student member. Pursuing CS / IT / Software UG or PG.",
    },
    amount: "₹10,000-₹25,000/year (variable)",
    applyUrl: "https://www.csi-india.org/",
    description: "CSI's annual student scholarships + project funding. Member-driven; volume varies by year.",
    deadline: "Yearly cycle",
    tags: ["csi", "computer science", "professional society"],
  },
  {
    id: "iei-young-engineer",
    name: "IEI Young Engineer Awards + Scholarships",
    awardingBody: "Institution of Engineers (India)",
    type: "PRIVATE",
    state: null,
    levels: ["UG", "PG"],
    eligibility: {
      note: "Student member of IEI. Engineering UG/PG. Demonstrated technical contributions.",
    },
    amount: "₹10,000-₹30,000",
    applyUrl: "https://www.ieindia.org/",
    description: "Institution of Engineers (India) — student awards + scholarships for active members. Local-chapter discretion on award amount.",
    deadline: "Yearly cycle",
    tags: ["iei", "engineering", "professional society"],
  },

  // ── Corporate + private foundations ──────────────────────────────
  {
    id: "hdfc-badhte-kadam",
    name: "HDFC Bank Parivartan Badhte Kadam Scholarship",
    awardingBody: "HDFC Bank Parivartan",
    type: "PRIVATE",
    state: null,
    levels: ["CLASS_11_12", "DIPLOMA", "UG", "PG"],
    eligibility: {
      incomeMaxLakhs: 2.5,
      minMarksPct: 55,
      note: "Indian student with family income below ₹2.5L hit by life event (illness, natural calamity, family loss).",
    },
    amount: "₹15,000-₹75,000 (slabbed by level)",
    applyUrl: "https://www.hdfcbankparivartan.com/",
    description: "HDFC Bank Parivartan's badhte-kadam program — targeted at students from families hit by adverse life events. Single-cycle award.",
    deadline: "Aug-Nov each year",
    tags: ["hdfc", "private", "low income", "life event"],
  },
  {
    id: "axis-bank-foundation",
    name: "Axis Bank Foundation Scholarship",
    awardingBody: "Axis Bank Foundation",
    type: "PRIVATE",
    state: null,
    levels: ["UG"],
    eligibility: {
      incomeMaxLakhs: 4,
      minMarksPct: 60,
      note: "Indian student admitted to a recognised UG program. Below ₹4L family income.",
    },
    amount: "Up to ₹40,000/year",
    applyUrl: "https://www.axisbankfoundation.org/",
    description: "Axis Bank Foundation's UG support program. Renewable subject to academic progress.",
    deadline: "Aug-Oct each year",
    tags: ["axis bank", "private", "ug"],
  },
  {
    id: "bharti-foundation",
    name: "Bharti Foundation — Higher Education Scholarship",
    awardingBody: "Bharti Foundation",
    type: "PRIVATE",
    state: null,
    levels: ["UG"],
    eligibility: {
      incomeMaxLakhs: 3,
      minMarksPct: 70,
      note: "Need-based selection. Pursuing UG in India.",
    },
    amount: "Up to ₹50,000/year tuition + book grant",
    applyUrl: "https://www.bhartifoundation.org/",
    description: "Bharti (Airtel) Foundation's higher-ed scholarship. Need + merit blend. Renewable subject to UG performance.",
    deadline: "Mar-May each year",
    tags: ["bharti", "airtel", "private", "ug"],
  },
  {
    id: "wipro-stem-girls",
    name: "Wipro Earthian + Wipro Cares Scholarships",
    awardingBody: "Wipro Foundation",
    type: "PRIVATE",
    state: null,
    levels: ["CLASS_11_12", "UG"],
    eligibility: {
      note: "Indian student demonstrating sustainability + STEM engagement. Wipro Earthian is project-based, Wipro Cares is need-based.",
    },
    amount: "₹50,000-₹2,00,000",
    applyUrl: "https://www.wipro.org/",
    description: "Wipro Foundation runs both project-based (Earthian) + need-based (Cares) student support programs.",
    deadline: "Annual cycle",
    tags: ["wipro", "private", "stem", "sustainability"],
  },
  {
    id: "op-jindal-engg",
    name: "O.P. Jindal Engineering & Management Scholarship (OPJEMS)",
    awardingBody: "O.P. Jindal Group",
    type: "PRIVATE",
    state: null,
    levels: ["UG", "PG"],
    eligibility: {
      minMarksPct: 70,
      note: "UG/PG students in engineering/management at IITs/NITs/IIMs and select institutions. Selection via written test + interview.",
    },
    amount: "₹70,000-₹2,00,000/year (renewable)",
    applyUrl: "https://opjems.com/",
    description: "O.P. Jindal Group's flagship merit + leadership scholarship for engineering + management students at top Indian institutions.",
    deadline: "Yearly cycle, usually Aug-Oct",
    tags: ["jindal", "opjems", "engineering", "management"],
  },
  {
    id: "jsw-foundation",
    name: "JSW Foundation Scholarships",
    awardingBody: "JSW Foundation",
    type: "PRIVATE",
    state: null,
    levels: ["UG", "PG"],
    eligibility: {
      incomeMaxLakhs: 6,
      note: "Indian student in UG/PG at recognised institution. JSW has both general + employee-family streams.",
    },
    amount: "₹25,000-₹2,00,000/year (program-dependent)",
    applyUrl: "https://www.jsw.in/foundation",
    description: "JSW Foundation runs multiple scholarship programs across STEM, arts, and sports. Some restricted to plant-area communities; others national.",
    deadline: "Program-dependent",
    tags: ["jsw", "private foundation"],
  },
  {
    id: "vedanta-girl-child",
    name: "Vedanta Cairn Pink Scholarships for Girls in STEM",
    awardingBody: "Vedanta Cairn Oil & Gas",
    type: "PRIVATE",
    state: null,
    levels: ["UG"],
    eligibility: {
      gender: "F",
      incomeMaxLakhs: 4,
      note: "Girl students from low-income families pursuing STEM UG. Selection via essay + interview.",
    },
    amount: "₹1.5 lakh/year (renewable for 4 years)",
    applyUrl: "https://www.vedantalimited.com/",
    description: "Vedanta's girls-in-STEM scholarship — renewable for the full UG duration. National coverage; weighted toward operational regions.",
    deadline: "Annual cycle",
    tags: ["vedanta", "girls", "stem", "private"],
  },
  {
    id: "murugappa-merit",
    name: "Murugappa Group Engineering Scholarship",
    awardingBody: "Murugappa Group",
    type: "PRIVATE",
    state: null,
    levels: ["UG"],
    eligibility: {
      minMarksPct: 75,
      note: "Engineering UG in a recognised institution. Need + merit selection.",
    },
    amount: "₹25,000-₹75,000/year",
    applyUrl: "https://www.murugappa.com/",
    description: "Chennai-based Murugappa Group's engineering scholarship. Annual cycle; renewal subject to performance.",
    deadline: "Apr-Jul each year",
    tags: ["murugappa", "private", "engineering"],
  },
  {
    id: "suzlon-girls-engg",
    name: "Suzlon Tushti Scholarship for Girls in Engineering",
    awardingBody: "Suzlon Foundation",
    type: "PRIVATE",
    state: null,
    levels: ["UG"],
    eligibility: {
      gender: "F",
      incomeMaxLakhs: 6,
      note: "Girl engineering UG students. Need + merit.",
    },
    amount: "₹30,000-₹50,000/year",
    applyUrl: "https://www.suzlon.com/",
    description: "Suzlon Foundation's girls-in-engineering award. Focused on renewable-energy and core engineering disciplines.",
    deadline: "Yearly cycle",
    tags: ["suzlon", "girls", "engineering"],
  },
  {
    id: "lt-build-india",
    name: "L&T Build-India Scholarship",
    awardingBody: "Larsen & Toubro",
    type: "MERIT",
    state: null,
    levels: ["PG"],
    eligibility: {
      note: "Top GATE rankers in civil/mechanical/electrical engineering. Admitted to IIT Madras MTech in Construction Tech & Management.",
    },
    amount: "Full tuition + ₹40,000/month stipend + L&T job offer",
    applyUrl: "https://www.larsentoubro.com/",
    description: "L&T's elite MTech (CTM) program at IIT Madras — full sponsorship + stipend + guaranteed L&T job. ~30-40 selected annually from top GATE ranks.",
    deadline: "After GATE results, Apr-May",
    tags: ["lt", "iit madras", "gate", "construction"],
    relevantExamCodes: ["GATE"],
  },
  {
    id: "tata-capital-pankh",
    name: "Tata Capital Pankh Scholarship",
    awardingBody: "Tata Capital Limited",
    type: "PRIVATE",
    state: null,
    levels: ["CLASS_11_12", "UG"],
    eligibility: {
      incomeMaxLakhs: 2.5,
      minMarksPct: 60,
      note: "Indian student, family income below ₹2.5L. Pursuing Class 11-12 or UG.",
    },
    amount: "₹10,000-₹25,000/year",
    applyUrl: "https://www.tatacapital.com/csr/pankh.html",
    description: "Tata Capital's CSR scholarship — annual awards for low-income students at school + UG level.",
    deadline: "Annual cycle",
    tags: ["tata capital", "private", "low income"],
  },
  {
    id: "tcs-iontheme",
    name: "TCS iON Empowers Scholarship",
    awardingBody: "Tata Consultancy Services iON",
    type: "PRIVATE",
    state: null,
    levels: ["UG"],
    eligibility: {
      note: "Engineering/IT UG students. Demonstrated learning on TCS iON platform.",
    },
    amount: "₹50,000-₹1,00,000",
    applyUrl: "https://www.tcsion.com/",
    description: "TCS iON's UG scholarship program tied to its online learning platform. Hybrid certification + financial-aid award.",
    deadline: "Annual cycle",
    tags: ["tcs", "ion", "engineering", "it"],
  },
  {
    id: "deshpande-foundation",
    name: "Deshpande Foundation Sandbox Fellowship",
    awardingBody: "Deshpande Foundation",
    type: "PRIVATE",
    state: null,
    levels: ["UG", "PG"],
    eligibility: {
      note: "Indian student-entrepreneurs aged 18-35 building social-impact ventures. Founder-grade application + interview.",
    },
    amount: "₹50,000-₹3,00,000 + mentorship",
    applyUrl: "https://deshpandefoundation.org/",
    description: "Hubli-based Deshpande Foundation's flagship program for young entrepreneurs in social-impact verticals. Money + mentorship.",
    deadline: "Yearly cohorts",
    tags: ["deshpande", "entrepreneurship", "fellowship"],
  },

  // ── Community-specific ────────────────────────────────────────────
  {
    id: "parsi-charity-zoroastrian",
    name: "Parsi Zoroastrian Trust Funds Scholarship",
    awardingBody: "Bombay Parsi Punchayet + multiple BPP Trust Funds",
    type: "PRIVATE",
    state: null,
    levels: ["CLASS_9_10", "CLASS_11_12", "UG", "PG"],
    eligibility: {
      note: "Parsi Zoroastrian community members. Pursuing recognised study. Verified through BPP records.",
    },
    amount: "Varies by trust — typically ₹10,000-₹1,00,000/year",
    applyUrl: "https://www.bombayparsipanchayat.com/",
    description: "Umbrella for ~100+ trust funds administered by Bombay Parsi Punchayet, each scholarship-funding Parsi students. Apply through BPP's central form.",
    deadline: "Yearly cycle",
    tags: ["parsi", "zoroastrian", "minority", "community"],
  },
  {
    id: "sikh-foundation-scholarship",
    name: "Sikh Foundation Scholarship",
    awardingBody: "Sikh Foundation International / DGPC Education Wing",
    type: "PRIVATE",
    state: null,
    levels: ["UG", "PG"],
    eligibility: {
      note: "Sikh community members pursuing recognised UG/PG. Need + merit blend.",
    },
    amount: "₹25,000-₹1,50,000",
    applyUrl: "https://www.sikhfoundation.org/",
    description: "Community-funded education support for Sikh students. Multiple sub-grants administered by gurdwara committees + the international foundation.",
    deadline: "Yearly cycle",
    tags: ["sikh", "minority", "community"],
  },
  {
    id: "muslim-educational-society",
    name: "MESCO + Muslim Educational Society Scholarships",
    awardingBody: "Multiple regional MES bodies",
    type: "PRIVATE",
    state: null,
    levels: ["CLASS_11_12", "UG", "PG"],
    eligibility: {
      categories: ["MIN"],
      incomeMaxLakhs: 4,
      note: "Muslim community members from low-income families. State-specific MES bodies (Kerala MES, Mumbai MESCO, etc.) administer separately.",
    },
    amount: "₹10,000-₹50,000/year (varies by body)",
    applyUrl: "https://mescotrust.org/",
    description: "Network of regional Muslim Educational Society bodies funding education for Muslim students. Kerala MES + Mumbai MESCO are the largest.",
    deadline: "Yearly cycle",
    tags: ["muslim", "minority", "mesco", "mes"],
  },

  // ── Skill development + free coaching ────────────────────────────
  {
    id: "nsdc-pmkvy",
    name: "PMKVY 4.0 (Pradhan Mantri Kaushal Vikas Yojana)",
    awardingBody: "National Skill Development Corporation",
    type: "CENTRAL",
    state: null,
    levels: ["CLASS_9_10", "DIPLOMA"],
    eligibility: {
      note: "Indian citizen aged 15-45. Class 8+ pass for short-term skilling, more for advanced courses.",
    },
    amount: "Free training + ₹500-₹8,000 monetary reward on certification",
    applyUrl: "https://www.pmkvyofficial.org/",
    description: "Flagship skill-development scheme. Free vocational training across 300+ courses + monetary reward on certification. Strong placement linkage.",
    deadline: "Rolling enrolment",
    tags: ["nsdc", "pmkvy", "skill", "vocational"],
  },
  {
    id: "super30-anand-kumar",
    name: "Super 30 — Free JEE Coaching (Anand Kumar)",
    awardingBody: "Ramanujan School of Mathematics, Patna",
    type: "PRIVATE",
    state: "BR",
    levels: ["CLASS_11_12"],
    eligibility: {
      incomeMaxLakhs: 1.5,
      minMarksPct: 80,
      note: "Selection via Super-30 entrance test. Targeted at financially weak students from across India.",
    },
    amount: "Free year-long JEE coaching + food + lodging at Patna campus",
    applyUrl: "https://super30.org/",
    description: "Anand Kumar's iconic free-coaching program. Selects 30 financially-weak students per year for full-board JEE prep. Featured in 2019 biopic.",
    deadline: "Selection test held annually",
    tags: ["super 30", "jee", "free coaching", "bihar"],
    relevantExamCodes: ["JEE_MAIN", "JEE_ADVANCED"],
  },
  {
    id: "fitjee-talent-scholarship",
    name: "FIITJEE Talent Reward Exam (FTRE)",
    awardingBody: "FIITJEE Limited",
    type: "EXAM_SPECIFIC",
    state: null,
    levels: ["CLASS_9_10", "CLASS_11_12"],
    eligibility: {
      note: "Class 6-12 students. FTRE entrance — better score = larger tuition waiver on FIITJEE coaching.",
    },
    amount: "Up to 100% tuition waiver on FIITJEE coaching",
    applyUrl: "https://www.fiitjee.com/",
    description: "Coaching-tied scholarship. Score well on FTRE → free or heavily-subsidised FIITJEE classroom coaching for JEE prep.",
    deadline: "Multiple FTRE sittings yearly",
    tags: ["fiitjee", "coaching", "jee"],
    relevantExamCodes: ["JEE_MAIN", "JEE_ADVANCED"],
  },
  {
    id: "allen-tallentex",
    name: "Allen TALLENTEX Scholarship Exam",
    awardingBody: "Allen Career Institute",
    type: "EXAM_SPECIFIC",
    state: null,
    levels: ["CLASS_9_10", "CLASS_11_12"],
    eligibility: {
      note: "Class 5-12 students. TALLENTEX entrance. Coaching-tied tuition waiver based on score.",
    },
    amount: "₹50 lakh prize money pool + up to 90% Allen coaching waiver",
    applyUrl: "https://www.allen.ac.in/tallentex/",
    description: "Allen's annual scholarship-test brand. Cash prizes for top ranks + heavily-subsidised classroom coaching for high scorers.",
    deadline: "Annual cycle (Oct-Nov sittings)",
    tags: ["allen", "tallentex", "jee", "neet"],
    relevantExamCodes: ["JEE_MAIN", "NEET_UG"],
  },

  // ── More merit / institute-specific ──────────────────────────────
  {
    id: "iit-madras-merit-cum-means",
    name: "IIT Madras Merit-cum-Means Scholarship",
    awardingBody: "IIT Madras",
    type: "MERIT",
    state: "TN",
    levels: ["UG"],
    eligibility: {
      incomeMaxLakhs: 4.5,
      note: "IIT Madras BTech students. Family income below ₹4.5L/year. CGPA threshold maintained.",
    },
    amount: "Full tuition + ₹1,000/month + free hostel + mess subsidy",
    applyUrl: "https://www.iitm.ac.in/",
    description: "IITM's institute MCM. Free tuition + token stipend for low-income UG students. Auto-renewable subject to CGPA.",
    deadline: "Apply at admission + renewal yearly",
    tags: ["iit madras", "mcm", "merit cum means"],
  },
  {
    id: "iit-bombay-mcm",
    name: "IIT Bombay Merit-cum-Means + Institute Top Award",
    awardingBody: "IIT Bombay",
    type: "MERIT",
    state: "MH",
    levels: ["UG"],
    eligibility: {
      incomeMaxLakhs: 4.5,
      note: "IIT Bombay BTech. Income below ₹4.5L. Class 9+ CGPA preferred.",
    },
    amount: "Full tuition waiver + monthly stipend ₹1,000",
    applyUrl: "https://www.iitb.ac.in/",
    description: "IITB institute MCM. Full tuition + token stipend. Top-academic-prize streams (Institute Silver Medal etc.) layered on top.",
    deadline: "At admission + yearly renewal",
    tags: ["iit bombay", "mcm", "merit cum means"],
  },
  {
    id: "iim-need-based",
    name: "IIM Need-Based Scholarship (NBS)",
    awardingBody: "Individual IIMs + IIM Alumni Trust funds",
    type: "MERIT",
    state: null,
    levels: ["PG"],
    eligibility: {
      incomeMaxLakhs: 10,
      note: "IIM PGP/MBA students. Family income below ₹10L. Each IIM publishes its own NBS slabs and trust-fund-sourced waivers.",
    },
    amount: "₹2-25 lakh tuition reduction (slab-based)",
    applyUrl: "https://www.iimahd.ernet.in/",
    description: "Each IIM publishes its own need-based fee-waiver matrix. IIM-A, B, C, L all have multi-lakh waivers for students from sub-₹10L families.",
    deadline: "At admission + each year",
    tags: ["iim", "mba", "pg", "need based"],
  },
  {
    id: "iit-pdpu-merit-petroleum",
    name: "PDEU/PDPU Merit Scholarship",
    awardingBody: "Pandit Deendayal Energy University, Gujarat",
    type: "MERIT",
    state: "GJ",
    levels: ["UG", "PG"],
    eligibility: {
      minMarksPct: 80,
      note: "PDEU admission + Class 12 / GATE / CUET score above threshold.",
    },
    amount: "Up to 100% tuition waiver",
    applyUrl: "https://pdpu.ac.in/",
    description: "PDEU/PDPU's tiered scholarship for high entrance scores. Useful for energy/petroleum specialisation seekers.",
    deadline: "At admission",
    tags: ["pdeu", "pdpu", "energy", "merit"],
  },
  {
    id: "nls-bangalore-need-aid",
    name: "NLSIU Bangalore Need-Based Financial Aid",
    awardingBody: "National Law School of India University",
    type: "MERIT",
    state: "KA",
    levels: ["UG", "PG"],
    eligibility: {
      incomeMaxLakhs: 8,
      note: "NLSIU students. Family income below ₹8L. Renewable annually based on academic performance.",
    },
    amount: "Up to 100% tuition waiver + hostel + book grant",
    applyUrl: "https://www.nls.ac.in/",
    description: "NLSIU Bangalore's published need-based aid matrix — covers up to full tuition for low-income BA-LLB / LLM students.",
    deadline: "Apply each year",
    tags: ["nlsiu", "law", "nlu", "bangalore"],
  },
  {
    id: "nujs-merit-cum-means",
    name: "NUJS Kolkata Merit-cum-Means",
    awardingBody: "West Bengal National University of Juridical Sciences",
    type: "MERIT",
    state: "WB",
    levels: ["UG", "PG"],
    eligibility: {
      incomeMaxLakhs: 6,
      note: "NUJS Kolkata BA-LLB or LLM students. Family income below ₹6L.",
    },
    amount: "Up to 75% tuition waiver",
    applyUrl: "https://nujs.edu/",
    description: "NUJS Kolkata's MCM aid scheme for low-income law students. Renewal subject to CGPA.",
    deadline: "Yearly cycle",
    tags: ["nujs", "law", "nlu", "kolkata"],
  },

  // ── Pre-matric central + niche ────────────────────────────────────
  {
    id: "nsp-pre-matric",
    name: "Pre-Matric Scholarship for SC/ST/OBC/Minority Students",
    awardingBody: "Ministry of Social Justice & Empowerment / Tribal Affairs / Minority Affairs",
    type: "CENTRAL",
    state: null,
    levels: ["CLASS_9_10"],
    eligibility: {
      categories: ["SC", "ST", "OBC", "MIN"],
      incomeMaxLakhs: 2.5,
      note: "Class 9-10 students from SC/ST/OBC/Minority families. Income ceiling varies by category and is lower than post-matric.",
    },
    amount: "₹150-₹525/month + ₹1,000-₹1,750 books/annum",
    applyUrl: "https://scholarships.gov.in/",
    description: "Pre-matric counterpart of the post-matric scheme. Applied via NSP. Catches the highest-dropout-risk years (Class 9-10).",
    deadline: "Aligned with NSP cycle",
    tags: ["pre matric", "nsp", "sc", "st", "obc", "minority"],
  },
  {
    id: "indian-oil-merit",
    name: "IndianOil Academic Scholarship",
    awardingBody: "Indian Oil Corporation Limited",
    type: "PRIVATE",
    state: null,
    levels: ["CLASS_11_12", "UG", "PG"],
    eligibility: {
      incomeMaxLakhs: 1,
      minMarksPct: 65,
      note: "Indian student from low-income family. Studying Class 11-12 / UG (10+2/ITI/Engineering/MBBS) / PG. Different sub-schemes for each level.",
    },
    amount: "₹1,000-₹4,000/month based on level",
    applyUrl: "https://iocl.com/",
    description: "Indian Oil's published academic scholarships — annual cohort across school, UG, PG. ~2,600 awarded each year nationally.",
    deadline: "Aug-Oct each year",
    tags: ["indian oil", "iocl", "psu"],
  },
  {
    id: "ongc-scholarship",
    name: "ONGC Scholarship",
    awardingBody: "Oil and Natural Gas Corporation",
    type: "PRIVATE",
    state: null,
    levels: ["UG"],
    eligibility: {
      categories: ["SC", "ST", "OBC", "MIN"],
      incomeMaxLakhs: 2,
      minMarksPct: 60,
      note: "SC/ST/OBC/Minority. UG in MBBS / engineering / MBA / geology / geophysics.",
    },
    amount: "₹48,000/year",
    applyUrl: "https://www.ongcindia.com/",
    description: "ONGC's UG scholarship for reserved-category students in specific high-demand disciplines. Annual cohort ~1,000.",
    deadline: "Aug-Oct each year",
    tags: ["ongc", "psu", "sc", "st", "obc", "minority"],
  },
  {
    id: "ntpc-scholarship",
    name: "NTPC Scholarship Scheme",
    awardingBody: "NTPC Limited",
    type: "PRIVATE",
    state: null,
    levels: ["UG"],
    eligibility: {
      incomeMaxLakhs: 3,
      minMarksPct: 65,
      note: "UG in engineering. NTPC plant-area communities + national pool.",
    },
    amount: "₹15,000-₹40,000/year",
    applyUrl: "https://www.ntpc.co.in/",
    description: "NTPC's engineering-UG scholarship. Roughly split between plant-area beneficiaries and a national open pool.",
    deadline: "Aug-Oct each year",
    tags: ["ntpc", "psu", "engineering"],
  },
  {
    id: "tata-pankh-pg",
    name: "Tata Trusts SDTT Scholarship",
    awardingBody: "Sir Dorabji Tata Trust",
    type: "PRIVATE",
    state: null,
    levels: ["PG", "PHD"],
    eligibility: {
      incomeMaxLakhs: 10,
      note: "Indian student accepted to ranked overseas PG/PhD in select fields. Partly interest-free loan, partly grant.",
    },
    amount: "Up to ₹10 lakh — partly grant, partly loan",
    applyUrl: "https://www.dorabjitatatrust.org/",
    description: "Dorabji Tata Trust's overseas-study program. Highly selective; awarded a few dozen times per year.",
    deadline: "Mar-Apr",
    tags: ["tata", "overseas", "pg", "loan"],
  },
  {
    id: "central-overseas-min",
    name: "Padho Pardesh + National Overseas Scholarship",
    awardingBody: "Ministry of Minority Affairs + MoSJE",
    type: "CENTRAL",
    state: null,
    levels: ["PG", "PHD"],
    eligibility: {
      categories: ["SC", "ST", "MIN"],
      incomeMaxLakhs: 8,
      note: "SC/ST/Minority student accepted to a ranked overseas PG/PhD. National Overseas (SC/ST) + Padho Pardesh (Minority interest subsidy).",
    },
    amount: "Tuition + maintenance + 1-time air travel (NOS); interest subsidy on loan (Padho Pardesh)",
    applyUrl: "https://scholarships.gov.in/",
    description: "Central schemes for SC/ST/Minority students pursuing overseas PG/PhD. Two parallel schemes — full sponsorship (NOS) + interest-subsidy on bank education loan (Padho Pardesh).",
    deadline: "Annual cycle",
    tags: ["overseas", "sc", "st", "minority", "padho pardesh"],
  },

  // ── Sport/Special talent + niche ─────────────────────────────────
  {
    id: "rgvn-women-startups",
    name: "Stree Shakti (Women Entrepreneurs Education Support)",
    awardingBody: "RGVN North East",
    type: "PRIVATE",
    state: "AS",
    levels: ["UG"],
    eligibility: {
      gender: "F",
      note: "Women UG students in NE India with entrepreneurial intent.",
    },
    amount: "₹25,000-₹75,000",
    applyUrl: "https://www.rgvn.in/",
    description: "RGVN North East's UG support for women planning to enter entrepreneurship after graduation. Pairs with their startup mentorship program.",
    deadline: "Annual cycle",
    tags: ["women", "north east", "entrepreneur"],
  },
  {
    id: "young-india-fellowship",
    name: "Young India Fellowship (Ashoka)",
    awardingBody: "Ashoka University",
    type: "MERIT",
    state: "HR",
    levels: ["PG"],
    eligibility: {
      note: "Indian / global UG graduate below 28 years. One-year post-grad diploma + meritorious selection.",
    },
    amount: "Up to 100% tuition waiver (₹9.5 lakh) + ₹40,000/year living stipend",
    applyUrl: "https://www.ashoka.edu.in/yif",
    description: "Ashoka's 1-year postgraduate-diploma fellowship for fresh UG graduates. Multidisciplinary; selective (~250/year).",
    deadline: "Apr-Jul",
    tags: ["ashoka", "yif", "postgrad", "fellowship"],
  },
  {
    id: "young-india-azim-premji",
    name: "Azim Premji University Need-Based Financial Aid",
    awardingBody: "Azim Premji University",
    type: "MERIT",
    state: "KA",
    levels: ["UG", "PG"],
    eligibility: {
      incomeMaxLakhs: 10,
      note: "APU students. Family income below ₹10L. Slabbed fee waiver based on income band.",
    },
    amount: "Up to 100% tuition + hostel + living stipend",
    applyUrl: "https://azimpremjiuniversity.edu.in/",
    description: "APU's published need-based aid matrix. Generous slabbing — covers full tuition + hostel for sub-₹2L families.",
    deadline: "At admission + yearly",
    tags: ["azim premji", "apu", "need based"],
  },
  {
    id: "shiv-nadar-foundation",
    name: "Shiv Nadar Foundation Scholarship (SSN/SNU)",
    awardingBody: "Shiv Nadar Foundation",
    type: "PRIVATE",
    state: null,
    levels: ["UG", "PG"],
    eligibility: {
      incomeMaxLakhs: 6,
      minMarksPct: 75,
      note: "Admitted to Shiv Nadar University / SSN College. Family income below ₹6L.",
    },
    amount: "Up to 100% tuition + hostel waiver",
    applyUrl: "https://snu.edu.in/",
    description: "Shiv Nadar Foundation's institute-specific aid for SNU + SSN College students. Generous waiver for low-income high-scorers.",
    deadline: "At admission",
    tags: ["shiv nadar", "snu", "ssn", "private university"],
  },
  {
    id: "bits-merit-scholarship",
    name: "BITS Pilani Merit-cum-Need Financial Aid",
    awardingBody: "BITS Pilani",
    type: "MERIT",
    state: null,
    levels: ["UG"],
    eligibility: {
      incomeMaxLakhs: 8,
      note: "BITS Pilani / Goa / Hyderabad UG students. Family income below ₹8L. Slabbed by income + BITSAT score.",
    },
    amount: "25%-90% tuition waiver",
    applyUrl: "https://www.bits-pilani.ac.in/",
    description: "BITS Pilani's published aid matrix — slabbed by BITSAT score and family income. Covers UG students across all three campuses.",
    deadline: "At admission",
    tags: ["bits pilani", "private university", "merit"],
  },
  {
    id: "manipal-akademia-aid",
    name: "Manipal Academy of Higher Education Aid",
    awardingBody: "Manipal Academy of Higher Education",
    type: "MERIT",
    state: "KA",
    levels: ["UG", "PG"],
    eligibility: {
      minMarksPct: 60,
      note: "MAHE admission. Need + merit blend. Multiple sub-schemes including MET-rank-based + sports scholarships.",
    },
    amount: "10%-100% tuition waiver (slab-based)",
    applyUrl: "https://manipal.edu/",
    description: "Manipal's institute aid matrix. Covers UG + PG students; separate sports scholarship slab; MET rank tier for tuition reduction.",
    deadline: "At admission",
    tags: ["manipal", "mahe", "private university"],
  },

  // ── Architecture + design + niche ────────────────────────────────
  {
    id: "nid-foundation",
    name: "NID Foundation Programme Aid",
    awardingBody: "National Institute of Design",
    type: "MERIT",
    state: "GJ",
    levels: ["UG"],
    eligibility: {
      incomeMaxLakhs: 6,
      note: "NID Ahmedabad admission. Family income below ₹6L.",
    },
    amount: "Tuition reduction (up to 100% for sub-₹2L)",
    applyUrl: "https://www.nid.edu/",
    description: "NID Ahmedabad's institute-specific tuition-reduction matrix. Critical for sub-₹2L families since NID UG tuition is steep.",
    deadline: "At admission",
    tags: ["nid", "design", "ahmedabad"],
  },
  {
    id: "cept-design",
    name: "CEPT Need-Based Financial Aid",
    awardingBody: "CEPT University, Ahmedabad",
    type: "MERIT",
    state: "GJ",
    levels: ["UG"],
    eligibility: {
      incomeMaxLakhs: 8,
      note: "CEPT admission (architecture / planning / design). Family income below ₹8L.",
    },
    amount: "Tuition reduction (10%-80%)",
    applyUrl: "https://cept.ac.in/",
    description: "CEPT's institute aid for architecture + planning UG students. Covers a meaningful slice of CEPT's relatively high tuition.",
    deadline: "At admission",
    tags: ["cept", "architecture", "design"],
  },

  // ── Top-up / professional ─────────────────────────────────────────
  {
    id: "ca-icai-scholarship",
    name: "ICAI Merit + Merit-cum-Need Scholarships",
    awardingBody: "Institute of Chartered Accountants of India",
    type: "PRIVATE",
    state: null,
    levels: ["UG", "PG"],
    eligibility: {
      note: "CA Foundation / Intermediate / Final registered students. Multiple slabs — Merit-cum-Need has income cap ₹3L.",
    },
    amount: "₹1,500-₹2,500/month based on slab",
    applyUrl: "https://www.icai.org/",
    description: "ICAI's published scholarship for CA aspirants. Covers Foundation through Final. Modest monthly stipend over 1-2 years.",
    deadline: "Yearly cycle",
    tags: ["ca", "icai", "professional"],
  },
  {
    id: "icsi-scholarship",
    name: "ICSI Scholarship for CS Students",
    awardingBody: "Institute of Company Secretaries of India",
    type: "PRIVATE",
    state: null,
    levels: ["UG", "PG"],
    eligibility: {
      note: "ICSI-registered students at Executive / Professional level. Merit + need blend.",
    },
    amount: "₹1,000-₹5,000/month",
    applyUrl: "https://www.icsi.edu/",
    description: "ICSI's published support for Company Secretary aspirants. Covers exam-fee waivers + monthly stipend at selected slabs.",
    deadline: "Yearly cycle",
    tags: ["cs", "icsi", "company secretary", "professional"],
  },

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 2.3 EXPANSION — +85 entries to reach 200+
  // Coverage: remaining states, more state govt schemes, private trusts,
  // niche communities, sport / disability / minority funds.
  // ═══════════════════════════════════════════════════════════════════

  // ─── Remaining state schemes ───────────────────────────────────────
  { id: "as-prakalpa-anundoram", name: "Anundoram Borooah Laptop + Award (Assam)", awardingBody: "Government of Assam", type: "STATE", state: "AS", levels: ["CLASS_9_10", "CLASS_11_12"], eligibility: { minMarksPct: 60, note: "Assam HSLC + HS examinees with letter marks in 4+ subjects" }, amount: "Free laptop + ₹15-25k cash", applyUrl: "https://sebaonline.org/", description: "Assam's continuing programme to reward HSLC + HS achievers.", deadline: "Yearly", tags: ["assam", "as", "boards merit"] },
  { id: "wb-yuvashree-arpan", name: "Yuvashree Arpan (West Bengal)", awardingBody: "Govt of West Bengal Labour Department", type: "STATE", state: "WB", levels: ["DIPLOMA", "UG"], eligibility: { categories: ["GEN", "OBC", "SC", "ST", "EWS"], incomeMaxLakhs: 2.5, note: "Skilled but unemployed youth aged 18-45" }, amount: "₹1500/month unemployment allowance + skill training", applyUrl: "https://wbyouthservices.gov.in/", description: "WB unemployment allowance + skill-training programme.", deadline: "Rolling", tags: ["west bengal", "wb", "youth", "unemployment"] },
  { id: "pb-puniti-tagore-pb", name: "Punjab Aatmnirbhar Bharat Scholarship", awardingBody: "Punjab Higher Education Department", type: "STATE", state: "PB", levels: ["UG", "PG"], eligibility: { categories: ["GEN", "OBC", "SC"], incomeMaxLakhs: 3, minMarksPct: 75 }, amount: "₹5000-₹20000/year", applyUrl: "https://punjab.gov.in/", description: "Punjab merit-cum-means scholarship for college students.", deadline: "Aug-Oct yearly", tags: ["punjab", "pb", "merit cum means"] },
  { id: "rj-jan-aadhaar-rj", name: "Rajasthan Mukhyamantri Uchch Shiksha Chhatravriti", awardingBody: "Rajasthan Higher Education Department", type: "STATE", state: "RJ", levels: ["UG", "PG"], eligibility: { categories: ["GEN", "OBC", "SC", "ST", "EWS"], incomeMaxLakhs: 2.5, minMarksPct: 80 }, amount: "Free tuition + ₹10-30k/year stipend", applyUrl: "https://sso.rajasthan.gov.in/", description: "Rajasthan UG/PG fee + stipend for state-domicile students.", deadline: "Sep-Nov", tags: ["rajasthan", "rj"] },
  { id: "hr-meritorious-hr", name: "Haryana Indira Gandhi Sambal Yojana", awardingBody: "Govt of Haryana", type: "STATE", state: "HR", levels: ["UG"], eligibility: { categories: ["SC", "OBC", "GEN", "EWS"], incomeMaxLakhs: 1.8, minMarksPct: 60 }, amount: "₹12,000-₹25,000/year + uniform + book grant", applyUrl: "https://highereduhry.ac.in/", description: "Haryana state UG support for low-income meritorious students.", deadline: "Aug-Oct", tags: ["haryana", "hr"] },
  { id: "od-medha-od", name: "Odisha Medhabruti Scholarship", awardingBody: "Govt of Odisha Higher Education Department", type: "STATE", state: "OD", levels: ["UG", "PG"], eligibility: { minMarksPct: 60, incomeMaxLakhs: 6 }, amount: "₹6000-₹26000/year", applyUrl: "https://scholarship.odisha.gov.in/", description: "Odisha state merit scholarship — UG + PG.", deadline: "Sep-Oct", tags: ["odisha", "od", "medha"] },
  { id: "mp-pratibha-kiran-mp", name: "MP Pratibha Kiran Scholarship", awardingBody: "MP Government", type: "STATE", state: "MP", levels: ["UG"], eligibility: { gender: "F", incomeMaxLakhs: 1, minMarksPct: 60, note: "Girl BPL student admitted to UG course in MP" }, amount: "₹5,000/year", applyUrl: "https://scholarshipportal.mp.nic.in/", description: "MP girls' UG scholarship targeting BPL families.", deadline: "Aug-Oct", tags: ["madhya pradesh", "mp", "girls", "bpl"] },
  { id: "mp-laptop-vidya-yojana", name: "MP Vidya Vikas Laptop Yojana", awardingBody: "Govt of MP", type: "STATE", state: "MP", levels: ["CLASS_11_12"], eligibility: { minMarksPct: 75, note: "Class 12 toppers from MP Board" }, amount: "₹25,000 for laptop", applyUrl: "https://shikshaportal.mp.gov.in/", description: "MP laptop scheme for state-board Class 12 high scorers.", deadline: "Post Class 12 results", tags: ["madhya pradesh", "mp", "laptop", "merit"] },
  { id: "tn-kalaignar-meritorious", name: "Tamil Nadu Kalaignar Meritorious", awardingBody: "TN Government", type: "STATE", state: "TN", levels: ["UG"], eligibility: { categories: ["SC", "ST", "OBC"], incomeMaxLakhs: 2, minMarksPct: 75 }, amount: "Tuition + book grant", applyUrl: "https://tn.gov.in/", description: "TN state scholarship for SC/ST/OBC meritorious students.", deadline: "Aug-Oct", tags: ["tamil nadu", "tn"] },
  { id: "kl-mukhyamantri-kl", name: "Kerala CMSPS — CM's Scholarship", awardingBody: "Govt of Kerala", type: "STATE", state: "KL", levels: ["UG", "PG"], eligibility: { categories: ["GEN", "OBC", "EWS"], incomeMaxLakhs: 4, minMarksPct: 60 }, amount: "₹12,000-₹40,000/year", applyUrl: "https://cmss.scholarship.gov.in/", description: "Kerala CM's UG/PG scholarship for general + EWS students.", deadline: "Sep-Nov", tags: ["kerala", "kl"] },
  { id: "ts-overseas-bc", name: "Telangana CM Overseas Scholarship (BC)", awardingBody: "Telangana BC Welfare Dept", type: "STATE", state: "TS", levels: ["PG"], eligibility: { categories: ["OBC"], incomeMaxLakhs: 5, note: "BC student admitted to ranked overseas PG" }, amount: "Up to ₹20 lakh", applyUrl: "https://telanganaepass.cgg.gov.in/", description: "TS BC welfare's overseas scholarship for PG abroad.", deadline: "Twice yearly", tags: ["telangana", "ts", "obc", "overseas"] },
  { id: "ka-cipriani", name: "Karnataka CIET / Vidyasiri Continuance", awardingBody: "Karnataka SC/ST Welfare", type: "STATE", state: "KA", levels: ["UG", "PG"], eligibility: { categories: ["SC", "ST"], incomeMaxLakhs: 2.5 }, amount: "Tuition + stipend ₹2,500-₹15,000/month", applyUrl: "https://ssp.karnataka.gov.in/", description: "Karnataka SC/ST UG/PG fee + stipend scheme.", deadline: "Sep-Nov", tags: ["karnataka", "ka", "sc", "st"] },
  { id: "bihar-mukhyamantri-cycle", name: "Bihar Mukhyamantri Balika Cycle Yojana", awardingBody: "Govt of Bihar", type: "STATE", state: "BR", levels: ["CLASS_9_10"], eligibility: { gender: "F", note: "Bihar girls in Class 9-10 of govt schools" }, amount: "₹2,500 for bicycle", applyUrl: "https://educationbihar.gov.in/", description: "Bihar girls' bicycle scheme for school transport.", deadline: "Yearly cycle", tags: ["bihar", "br", "girls", "school"] },
  { id: "bihar-mukhyamantri-poshak", name: "Bihar Mukhyamantri Poshak Yojana", awardingBody: "Govt of Bihar", type: "STATE", state: "BR", levels: ["CLASS_9_10", "CLASS_11_12"], eligibility: { categories: ["SC", "ST", "OBC"], note: "Bihar Class 1-12 students; uniform support" }, amount: "₹400-₹1500/year for uniforms", applyUrl: "https://educationbihar.gov.in/", description: "Bihar uniform support scheme.", deadline: "Yearly", tags: ["bihar", "br", "uniform"] },
  { id: "gj-mysy-fees", name: "Gujarat Mukhyamantri Yuva Swavalamban Yojana (Fees)", awardingBody: "Govt of Gujarat", type: "STATE", state: "GJ", levels: ["UG"], eligibility: { minMarksPct: 80, incomeMaxLakhs: 6, note: "Gujarat domicile UG students in eligible courses" }, amount: "50% tuition fee waiver", applyUrl: "https://mysy.guj.nic.in/", description: "Gujarat 50% tuition support for top Class 12 performers.", deadline: "Aug-Oct", tags: ["gujarat", "gj", "mysy", "merit"] },
  { id: "up-savitribai-girls", name: "UP Savitribai Phule Balika Shiksha", awardingBody: "Govt of UP", type: "STATE", state: "UP", levels: ["CLASS_9_10", "CLASS_11_12"], eligibility: { gender: "F", note: "UP Class 9-12 girls in govt schools" }, amount: "₹2000/year + book + dress", applyUrl: "https://scholarship.up.gov.in/", description: "UP girls' Class 9-12 retention scholarship.", deadline: "Yearly", tags: ["uttar pradesh", "up", "girls"] },
  { id: "mh-ekatma-yojana", name: "Maharashtra Mukhyamantri Vishesh Sahayata", awardingBody: "Govt of Maharashtra Social Justice", type: "STATE", state: "MH", levels: ["UG", "PG"], eligibility: { categories: ["SC", "ST", "OBC", "MIN"], incomeMaxLakhs: 2.5 }, amount: "Fee reimbursement + maintenance", applyUrl: "https://mahadbt.maharashtra.gov.in/", description: "Maharashtra welfare dept UG/PG scholarship.", deadline: "Sep-Nov", tags: ["maharashtra", "mh"] },
  { id: "mh-rajashree-shahu-girls", name: "Maharashtra Rajashree Shahu Maharaj Merit Scholarship", awardingBody: "Govt of Maharashtra", type: "STATE", state: "MH", levels: ["UG"], eligibility: { gender: "F", incomeMaxLakhs: 8, minMarksPct: 60, note: "Maharashtra girl UG students" }, amount: "₹3000-₹10000/year", applyUrl: "https://mahadbt.maharashtra.gov.in/", description: "MH girls' UG merit scholarship.", deadline: "Aug-Oct", tags: ["maharashtra", "mh", "girls"] },
  { id: "ts-fellowship-min", name: "Telangana Minority Overseas Scholarship", awardingBody: "TS Minority Welfare", type: "STATE", state: "TS", levels: ["PG"], eligibility: { categories: ["MIN"], incomeMaxLakhs: 5 }, amount: "Up to ₹20 lakh", applyUrl: "https://telanganaepass.cgg.gov.in/", description: "TS Minority's overseas PG scholarship.", deadline: "Twice yearly", tags: ["telangana", "ts", "minority", "overseas"] },
  { id: "ap-vidya-deevena-pg", name: "AP Jagananna Vasathi Deevena (Hostel)", awardingBody: "Govt of Andhra Pradesh", type: "STATE", state: "AP", levels: ["UG", "PG"], eligibility: { categories: ["SC", "ST", "OBC", "EWS", "MIN"], incomeMaxLakhs: 1.5 }, amount: "₹20,000/year for hostel/food", applyUrl: "https://jaganannavasathideevena.ap.gov.in/", description: "AP hostel + mess subsidy.", deadline: "Each semester", tags: ["andhra pradesh", "ap", "hostel"] },
  { id: "uk-mukhyamantri-uk", name: "Uttarakhand Mukhyamantri Sukanya Samriddhi", awardingBody: "Govt of Uttarakhand", type: "STATE", state: "UK", levels: ["CLASS_11_12", "UG"], eligibility: { gender: "F", note: "UK domicile girl students from BPL families" }, amount: "Cumulative milestone payouts ₹15-30k", applyUrl: "https://socialwelfare.uk.gov.in/", description: "Uttarakhand girls' education scheme.", deadline: "Yearly", tags: ["uttarakhand", "uk", "girls"] },
  { id: "cg-shaheed-cm", name: "Chhattisgarh Shaheed Mahendra Karma Scholarship", awardingBody: "Govt of Chhattisgarh", type: "STATE", state: "CG", levels: ["UG"], eligibility: { incomeMaxLakhs: 1.5, note: "Children of martyrs + affected families" }, amount: "Free education + monthly stipend", applyUrl: "https://cg.nic.in/", description: "CG state scheme for children of martyrs (security forces).", deadline: "Yearly", tags: ["chhattisgarh", "cg", "martyrs"] },
  { id: "jh-mukhyamantri-jharia", name: "Jharkhand Mukhyamantri Pratibha Vistar Yojana", awardingBody: "Govt of Jharkhand", type: "STATE", state: "JH", levels: ["UG"], eligibility: { categories: ["SC", "ST", "OBC", "MIN"], incomeMaxLakhs: 3, minMarksPct: 60 }, amount: "₹15,000-₹30,000/year + tuition", applyUrl: "https://jharkhandscholarship.com/", description: "Jharkhand UG merit-cum-means for reserved categories.", deadline: "Sep-Nov", tags: ["jharkhand", "jh"] },
  { id: "an-andaman-merit-an", name: "Andaman + Nicobar Education Scholarship", awardingBody: "A&N Administration", type: "STATE", state: "AN", levels: ["UG", "PG"], eligibility: { incomeMaxLakhs: 4, note: "A&N domicile UG/PG students" }, amount: "₹10,000-₹40,000/year", applyUrl: "https://andaman.gov.in/", description: "A&N education scholarship for state-domicile students.", deadline: "Aug-Oct", tags: ["andaman", "an"] },
  { id: "py-merit", name: "Puducherry Higher Education Scholarship", awardingBody: "Govt of Puducherry", type: "STATE", state: "PY", levels: ["UG", "PG"], eligibility: { categories: ["GEN", "OBC", "SC", "ST", "EWS"], incomeMaxLakhs: 3 }, amount: "₹8,000-₹25,000/year", applyUrl: "https://education.puducherry.gov.in/", description: "Puducherry UT scholarship for domicile UG/PG students.", deadline: "Aug-Oct", tags: ["puducherry", "py"] },
  { id: "ch-chandigarh-merit", name: "Chandigarh Merit Scholarship", awardingBody: "Chandigarh Administration", type: "STATE", state: "CH", levels: ["UG", "PG"], eligibility: { minMarksPct: 75, incomeMaxLakhs: 8 }, amount: "₹5,000-₹15,000/year", applyUrl: "https://chandigarh.gov.in/", description: "Chandigarh UT scholarship for residents.", deadline: "Yearly", tags: ["chandigarh", "ch"] },
  { id: "dn-merit-dn", name: "Dadra Nagar Haveli + Daman Diu Merit", awardingBody: "DNH&DD UT Admin", type: "STATE", state: "DN", levels: ["UG"], eligibility: { minMarksPct: 60, incomeMaxLakhs: 4 }, amount: "₹6,000-₹20,000/year", applyUrl: "https://dnh.dadra.gov.in/", description: "DNH&DD UT scholarship for residents.", deadline: "Yearly", tags: ["dn", "dadra", "daman"] },
  { id: "sk-merit-sk", name: "Sikkim Merit-cum-Means Scholarship", awardingBody: "Govt of Sikkim", type: "STATE", state: "SK", levels: ["UG", "PG"], eligibility: { incomeMaxLakhs: 5, minMarksPct: 60 }, amount: "Tuition + ₹10-25k/year", applyUrl: "https://www.sikkimhrdd.org/", description: "Sikkim UG/PG merit-cum-means.", deadline: "Aug-Oct", tags: ["sikkim", "sk"] },
  { id: "ld-lakshadweep-merit", name: "Lakshadweep Merit Scholarship", awardingBody: "Lakshadweep Administration", type: "STATE", state: "LD", levels: ["UG", "PG"], eligibility: { incomeMaxLakhs: 5, minMarksPct: 60 }, amount: "₹8,000-₹35,000/year", applyUrl: "https://lakshadweep.gov.in/", description: "Lakshadweep UT scholarship for domicile students.", deadline: "Yearly", tags: ["lakshadweep", "ld"] },

  // ─── Disability / PwD ──────────────────────────────────────────────
  { id: "natt-pwd", name: "National Award for PwD Scholarship", awardingBody: "Department of Empowerment of PwD, MoSJE", type: "CENTRAL", state: null, levels: ["CLASS_9_10", "CLASS_11_12", "UG", "PG"], eligibility: { incomeMaxLakhs: 2.5, note: "40%+ disability cert, full-time studies post Class 9" }, amount: "Tuition + ₹500-₹2,500/month + reader/escort allowance + book grant", applyUrl: "https://scholarships.gov.in/", description: "PwD students scholarship — full disability spectrum.", deadline: "Aligned with NSP", tags: ["pwd", "disability"] },
  { id: "iim-pwd", name: "Top-Class for PwD (Higher Education)", awardingBody: "MoSJE", type: "CENTRAL", state: null, levels: ["UG", "PG"], eligibility: { categories: ["GEN", "OBC", "SC", "ST", "EWS"], incomeMaxLakhs: 8, note: "PwD students at notified institutions (IITs, NLU, IIMs etc.)" }, amount: "Full tuition + maintenance + book + computer support", applyUrl: "https://scholarships.gov.in/", description: "Centre scheme for PwD students at premier institutions.", deadline: "Yearly via NSP", tags: ["pwd", "disability", "premier"] },
  { id: "free-coaching-pwd", name: "Free Coaching for PwD (UPSC/SSC/Banking)", awardingBody: "DEPwD", type: "CENTRAL", state: null, levels: ["UG", "PG"], eligibility: { incomeMaxLakhs: 8, note: "PwD students preparing for UPSC, SSC, banking exams" }, amount: "Free coaching at empanelled institutes", applyUrl: "https://disabilityaffairs.gov.in/", description: "Free coaching cover for PwD aspirants.", deadline: "Notified yearly", tags: ["pwd", "disability", "coaching"] },

  // ─── Sports + Cultural (additional) ────────────────────────────────
  { id: "ncpedp-mphasis", name: "NCPEDP-Mphasis Universal Design Awards", awardingBody: "NCPEDP + Mphasis", type: "PRIVATE", state: null, levels: ["UG", "PG"], eligibility: { note: "Persons with disabilities + accessibility champions" }, amount: "₹1 lakh + recognition", applyUrl: "https://www.ncpedp.org/", description: "Universal design + accessibility champion awards.", deadline: "Yearly", tags: ["disability", "design", "award"] },
  { id: "khelo-india-tops-individual", name: "Khelo India Athlete Stipend (Individual Sport)", awardingBody: "SAI + Ministry of Youth Affairs", type: "CENTRAL", state: null, levels: ["CLASS_9_10", "CLASS_11_12", "UG"], eligibility: { note: "Selected via Khelo India Games + state events. Individual + team sport athletes." }, amount: "₹1.2L/year stipend + training + nutrition + tournament expenses", applyUrl: "https://kheloindia.gov.in/", description: "Khelo India ongoing athlete stipend programme.", deadline: "Selected via Games", tags: ["sports", "athlete", "khelo india"] },
  { id: "tata-football-academy", name: "Tata Football Academy (Jamshedpur)", awardingBody: "Tata Football Academy", type: "PRIVATE", state: "JH", levels: ["CLASS_9_10", "CLASS_11_12"], eligibility: { gender: "M", note: "Boys 14-16 selected via tryouts. Full residential football training." }, amount: "Full scholarship — boarding + training + education", applyUrl: "https://www.tatafootballacademy.com/", description: "India's premier residential football academy.", deadline: "Annual tryouts", tags: ["sports", "football", "tata"] },

  // ─── Additional private foundations ────────────────────────────────
  { id: "csir-ugc-jrf-net", name: "CSIR-UGC JRF (Junior Research Fellowship)", awardingBody: "CSIR", type: "RESEARCH", state: null, levels: ["PG", "PHD"], eligibility: { note: "Cleared CSIR-NET JRF; MSc/MTech in sciences" }, amount: "₹37,000/month for 2 years + ₹42,000/month for 3 years", applyUrl: "https://csirhrdg.res.in/", description: "CSIR's parallel to UGC NET-JRF for sciences PhD.", deadline: "CSIR NET twice yearly", tags: ["csir", "jrf", "phd", "research"] },
  { id: "dst-inspire-shey", name: "DST INSPIRE-MANAK (Million Minds Augmenting National Aspirations)", awardingBody: "DST", type: "MERIT", state: null, levels: ["CLASS_9_10"], eligibility: { note: "Class 6-10 students with science aptitude. Selection via school nominations." }, amount: "₹10,000 prize + recognition", applyUrl: "https://www.inspireawards-dst.gov.in/", description: "DST early-school innovation award.", deadline: "Yearly", tags: ["dst", "inspire", "school", "innovation"] },
  { id: "dst-mansamandap-innovate", name: "DST Manak (Awards for Innovation)", awardingBody: "DST", type: "MERIT", state: null, levels: ["CLASS_9_10", "CLASS_11_12"], eligibility: { note: "Class 6-12 students with innovation project" }, amount: "Up to ₹50,000 + national exhibition entry", applyUrl: "https://www.inspireawards-dst.gov.in/", description: "DST INSPIRE-MANAK extended for innovation projects.", deadline: "Yearly", tags: ["dst", "manak", "innovation"] },
  { id: "ratan-tata-trust-merit", name: "Ratan Tata Trust Scholarship (Higher Studies)", awardingBody: "Ratan Tata Trust", type: "PRIVATE", state: null, levels: ["UG", "PG"], eligibility: { incomeMaxLakhs: 4 }, amount: "₹30,000-₹2 lakh/year", applyUrl: "https://www.tatatrusts.org/", description: "RTT individual + institutional grants.", deadline: "Yearly", tags: ["tata", "ratan tata", "private"] },
  { id: "indrani-balan-foundation", name: "Indrani Balan Foundation Scholarship", awardingBody: "Indrani Balan Foundation", type: "PRIVATE", state: null, levels: ["UG", "PG"], eligibility: { incomeMaxLakhs: 4, gender: "F" }, amount: "₹30,000-₹1 lakh/year", applyUrl: "https://www.indranibalanfoundation.org/", description: "Women in STEM + arts; merit + need.", deadline: "Yearly", tags: ["women", "private", "stem"] },
  { id: "siemens-india-scholarship", name: "Siemens Scholarship Program", awardingBody: "Siemens India Foundation", type: "PRIVATE", state: null, levels: ["UG"], eligibility: { incomeMaxLakhs: 3, minMarksPct: 75 }, amount: "₹50,000-₹1 lakh/year + Siemens internship", applyUrl: "https://new.siemens.com/in/en/company/sustainability/scholarship.html", description: "Engineering UG support + Siemens internship pipeline.", deadline: "Apr-Jul", tags: ["siemens", "engineering", "private"] },
  { id: "schlumberger-faculty-future", name: "Schlumberger Faculty for the Future", awardingBody: "Schlumberger Foundation", type: "PRIVATE", state: null, levels: ["PG", "PHD"], eligibility: { gender: "F", note: "Women in STEM PhD/PG abroad. Strong career-return-to-India commitment preferred." }, amount: "Up to USD 50k/year", applyUrl: "https://www.facultyforthefuture.com/", description: "Foreign PG/PhD scholarship for women in STEM.", deadline: "Sep-Nov", tags: ["women", "stem", "phd", "overseas", "private"] },
  { id: "tata-trusts-overseas-phd", name: "Tata Trusts Overseas PhD Scholarship", awardingBody: "Sir Dorabji Tata Trust", type: "PRIVATE", state: null, levels: ["PHD"], eligibility: { incomeMaxLakhs: 10, note: "Top universities' overseas PhD admits" }, amount: "Up to ₹10 lakh (partial loan, partial grant)", applyUrl: "https://www.dorabjitatatrust.org/", description: "Tata Trusts overseas PhD support.", deadline: "Annual", tags: ["tata", "overseas", "phd"] },
  { id: "lr-pasrich-foundation", name: "LR Pasrich Foundation Scholarship", awardingBody: "LR Pasrich Foundation", type: "PRIVATE", state: null, levels: ["UG", "PG"], eligibility: { incomeMaxLakhs: 5, note: "Indian student in UG/PG at recognised institution" }, amount: "₹50,000-₹2 lakh/year", applyUrl: "https://www.lrpasrich.com/", description: "Private foundation general scholarship.", deadline: "Yearly", tags: ["private", "foundation"] },
  { id: "mukhyamantri-shri-yodha", name: "Veer Bal Pradhan Mantri Yodha Yojana", awardingBody: "Ministry of Home Affairs", type: "CENTRAL", state: null, levels: ["UG"], eligibility: { note: "Wards of CAPF martyrs + state police martyrs" }, amount: "Free tuition + maintenance up to ₹3,000/month", applyUrl: "https://www.mha.gov.in/", description: "Centre scheme for CAPF + state police martyrs' wards.", deadline: "Yearly", tags: ["defence", "martyrs", "caps"] },
  { id: "lichfl-shilavati", name: "LICHFL Shilavati Award", awardingBody: "LIC Housing Finance Ltd", type: "PRIVATE", state: null, levels: ["UG", "PG"], eligibility: { gender: "F", incomeMaxLakhs: 5 }, amount: "₹30,000-₹1.5 lakh/year", applyUrl: "https://www.lichousing.com/", description: "LIC HFL girls' UG/PG scholarship.", deadline: "Yearly", tags: ["lic", "girls", "private"] },
  { id: "intel-india-scholar", name: "Intel India AI Scholar Program", awardingBody: "Intel India + AICTE", type: "PRIVATE", state: null, levels: ["UG"], eligibility: { note: "BTech CS/IT/AI/ECE; demonstrated ML interest" }, amount: "₹25,000 + Intel internship + ML cert", applyUrl: "https://www.intel.com/", description: "Intel India AI talent pipeline.", deadline: "Yearly", tags: ["intel", "AI", "ML"] },
  { id: "ibm-skills-build-women", name: "IBM SkillsBuild Women in Tech", awardingBody: "IBM India", type: "PRIVATE", state: null, levels: ["UG", "PG"], eligibility: { gender: "F", note: "Indian women pursuing tech UG/PG" }, amount: "Free certifications + ₹50,000/year stipend + IBM mentorship", applyUrl: "https://www.ibm.com/training/skillsbuild", description: "IBM SkillsBuild women's programme.", deadline: "Yearly cohorts", tags: ["women", "tech", "IBM"] },
  { id: "google-stem-cs", name: "Google CS Research Mentorship", awardingBody: "Google Research India", type: "PRIVATE", state: null, levels: ["UG", "PG"], eligibility: { note: "Indian student pursuing CS/AI; from underrepresented groups" }, amount: "$1,000 + Google Research mentorship + community", applyUrl: "https://research.google/programs-and-events/", description: "Google's CS research mentorship for underrepresented groups.", deadline: "Yearly", tags: ["google", "cs", "research", "mentorship"] },
  { id: "amazon-future-engineer", name: "Amazon Future Engineer", awardingBody: "Amazon India", type: "PRIVATE", state: null, levels: ["UG"], eligibility: { incomeMaxLakhs: 5, note: "BTech CS at AICTE-accredited college" }, amount: "₹40,000/year + Amazon internship + mentorship", applyUrl: "https://www.amazonfutureengineer.in/", description: "Amazon's CS UG scholarship + internship pipeline.", deadline: "Yearly", tags: ["amazon", "cs", "internship"] },
  { id: "qualcomm-innovation-fellowship", name: "Qualcomm Innovation Fellowship India", awardingBody: "Qualcomm India", type: "RESEARCH", state: null, levels: ["PG", "PHD"], eligibility: { note: "PhD candidates at IIT/IISc working on EE/wireless research" }, amount: "USD 40,000/year for 2 years + Qualcomm mentor", applyUrl: "https://www.qualcomm.com/research/university-relations", description: "Qualcomm research fellowship for top IIT/IISc PhDs.", deadline: "Yearly", tags: ["qualcomm", "phd", "research", "wireless"] },
  { id: "sap-young-thinkers", name: "SAP Young Thinkers Scholarship", awardingBody: "SAP India", type: "PRIVATE", state: null, levels: ["UG"], eligibility: { note: "BTech with SAP technologies focus" }, amount: "Free SAP certifications + ₹50,000 cash + internship", applyUrl: "https://www.sap.com/india/", description: "SAP's ERP-tech UG talent programme.", deadline: "Yearly", tags: ["sap", "tech", "ERP"] },

  // ─── Community-specific (additional) ────────────────────────────────
  { id: "bharti-jain-vaishno-devi", name: "Mata Vaishno Devi Shrine Board Scholarship", awardingBody: "Mata Vaishno Devi Shrine Board", type: "PRIVATE", state: "JK", levels: ["UG"], eligibility: { incomeMaxLakhs: 3, note: "Indian students from disadvantaged backgrounds" }, amount: "₹25,000-₹1 lakh/year", applyUrl: "https://www.maavaishnodevi.org/", description: "Mata Vaishno Devi Shrine Board's charity scholarship.", deadline: "Yearly", tags: ["religious", "shrine", "general"] },
  { id: "indian-jain-foundation", name: "Indian Jain Charity Trust Education Scholarship", awardingBody: "Indian Jain Charity Trust", type: "PRIVATE", state: null, levels: ["UG", "PG"], eligibility: { categories: ["MIN"], note: "Jain community students" }, amount: "₹10,000-₹50,000/year", applyUrl: "https://www.jainsamaj.org/", description: "Jain community education trust.", deadline: "Yearly", tags: ["jain", "minority", "community"] },
  { id: "christian-students-india", name: "Christian Student Education Trust", awardingBody: "Christian Charity Bodies (Cath + Prot)", type: "PRIVATE", state: null, levels: ["UG", "PG"], eligibility: { categories: ["MIN"], incomeMaxLakhs: 4 }, amount: "₹15,000-₹75,000/year", applyUrl: "https://www.cbci.in/", description: "Catholic + Protestant education trusts (CBCI etc.).", deadline: "Yearly", tags: ["christian", "minority", "community"] },
  { id: "buddhist-students-fund", name: "Buddhist Foundation India Scholarship", awardingBody: "Mahabodhi Society + Buddhist trusts", type: "PRIVATE", state: null, levels: ["UG", "PG"], eligibility: { categories: ["MIN"] }, amount: "Variable; ₹15,000-₹75,000/year", applyUrl: "https://www.mahabodhi.com/", description: "Buddhist community education fund.", deadline: "Yearly", tags: ["buddhist", "minority", "community"] },

  // ─── Profession-specific + niche ───────────────────────────────────
  { id: "icmr-mtech-bme", name: "ICMR MTech BME Fellowship", awardingBody: "ICMR", type: "RESEARCH", state: null, levels: ["PG"], eligibility: { note: "MTech Biomedical Engineering at IIT" }, amount: "₹20,000/month + ₹2 lakh/year contingency", applyUrl: "https://icmr.nic.in/", description: "ICMR funding for BME MTech research.", deadline: "Yearly", tags: ["icmr", "biomedical", "research"] },
  { id: "icmr-jrf-pre-doctoral", name: "ICMR Pre-Doctoral Fellowship", awardingBody: "ICMR", type: "RESEARCH", state: null, levels: ["PG"], eligibility: { note: "MSc/MTech graduates pursuing PhD in medical research" }, amount: "₹37,000/month + HRA + contingency", applyUrl: "https://icmr.nic.in/", description: "ICMR's bridge for MSc → PhD in medical sciences.", deadline: "Annual exam", tags: ["icmr", "pre-doctoral", "medical"] },
  { id: "ncbs-research-stipend", name: "NCBS Research Stipend (TIFR)", awardingBody: "Tata Institute of Fundamental Research", type: "RESEARCH", state: "KA", levels: ["PG", "PHD"], eligibility: { note: "MSc/MTech graduates joining NCBS PhD" }, amount: "₹37,000-₹42,000/month + contingency", applyUrl: "https://www.ncbs.res.in/", description: "NCBS PhD stipend matching UGC NET-JRF rates.", deadline: "Yearly", tags: ["ncbs", "tifr", "phd"] },
  { id: "iitm-online-bsc-bs-data", name: "IIT Madras BSc/BS Online Degree (Data Science)", awardingBody: "IIT Madras Online", type: "PRIVATE", state: "TN", levels: ["UG"], eligibility: { incomeMaxLakhs: 6, minMarksPct: 60, note: "Class 12 PCM (any board); foundation course entrance" }, amount: "Fee waiver based on income band (₹1,000-₹4L total instead of ₹2.5L)", applyUrl: "https://study.iitm.ac.in/", description: "IIT Madras online BSc + BS Data Science scholarship slabs.", deadline: "Yearly cohorts", tags: ["iit madras", "online", "data science"] },
  { id: "azim-premji-pratham", name: "Pratham Open School / Azim Premji Foundation Stipend", awardingBody: "Azim Premji Foundation + Pratham", type: "PRIVATE", state: null, levels: ["DIPLOMA", "UG"], eligibility: { incomeMaxLakhs: 2, note: "First-generation learners from rural India" }, amount: "Stipend + skill courses + placement support", applyUrl: "https://www.pratham.org/", description: "Pratham + Azim Premji rural first-gen learner support.", deadline: "Yearly", tags: ["pratham", "azim premji", "rural", "first gen"] },
  { id: "isf-young-scholars", name: "ISF Young Scholars Programme", awardingBody: "Indian Scholars Foundation", type: "PRIVATE", state: null, levels: ["UG"], eligibility: { incomeMaxLakhs: 4, minMarksPct: 80 }, amount: "₹30,000-₹1 lakh/year + mentorship", applyUrl: "https://www.indianscholarsfoundation.org/", description: "ISF's UG mentorship + financial support.", deadline: "Yearly", tags: ["isf", "mentorship", "merit"] },
  { id: "rishihood-scholar-program", name: "Rishihood University Scholar Programme", awardingBody: "Rishihood University", type: "PRIVATE", state: "HR", levels: ["UG"], eligibility: { incomeMaxLakhs: 5, minMarksPct: 80 }, amount: "Up to 100% tuition + boarding waiver", applyUrl: "https://rishihood.edu.in/", description: "Rishihood UG full scholarship for entrepreneurial-track students.", deadline: "At admission", tags: ["rishihood", "private", "entrepreneurship"] },
  { id: "ashoka-young-india-fellowship-tuition", name: "Ashoka Young India Fellowship — Tuition Subsidy", awardingBody: "Ashoka University", type: "MERIT", state: "HR", levels: ["PG"], eligibility: { incomeMaxLakhs: 8 }, amount: "Up to 100% tuition waiver", applyUrl: "https://www.ashoka.edu.in/yif", description: "Ashoka YIF (1-year postgrad) financial support.", deadline: "Apr-Jul", tags: ["ashoka", "yif", "private"] },
  { id: "krea-univ-need", name: "Krea University Need-Based Aid", awardingBody: "Krea University", type: "PRIVATE", state: "AP", levels: ["UG"], eligibility: { incomeMaxLakhs: 12 }, amount: "10%-100% tuition reduction", applyUrl: "https://krea.edu.in/", description: "Krea University need-based UG aid.", deadline: "At admission", tags: ["krea", "private", "liberal arts"] },
  { id: "snu-cumulative-academic", name: "Shiv Nadar University Academic Excellence", awardingBody: "Shiv Nadar University", type: "MERIT", state: "UP", levels: ["UG"], eligibility: { minMarksPct: 90, note: "Top 1% Class 12 + SNU entrance" }, amount: "Up to 100% tuition + hostel", applyUrl: "https://snu.edu.in/", description: "SNU's pure-merit Class 12 toppers scholarship.", deadline: "At admission", tags: ["snu", "shiv nadar", "merit"] },
  { id: "mahindra-academy-merit", name: "Mahindra Foundation Education Support", awardingBody: "Mahindra Foundation", type: "PRIVATE", state: null, levels: ["UG"], eligibility: { incomeMaxLakhs: 3, minMarksPct: 70 }, amount: "₹30,000-₹1.5 lakh/year", applyUrl: "https://www.mahindra.com/", description: "Mahindra Group employees' children + general scholarships.", deadline: "Yearly", tags: ["mahindra", "private"] },
  { id: "godrej-education-fund", name: "Godrej Education Fund", awardingBody: "Godrej Foundation", type: "PRIVATE", state: null, levels: ["UG"], eligibility: { incomeMaxLakhs: 5 }, amount: "₹25,000-₹75,000/year", applyUrl: "https://www.godrej.com/", description: "Godrej Group philanthropy for education.", deadline: "Yearly", tags: ["godrej", "private"] },

  // ─── Sport, Arts (more) ─────────────────────────────────────────────
  { id: "sport-authority-individual", name: "SAI Khel Pratibha Award", awardingBody: "Sports Authority of India", type: "CENTRAL", state: null, levels: ["CLASS_9_10", "CLASS_11_12", "UG"], eligibility: { note: "National-level sport medallists" }, amount: "₹50,000-₹2 lakh + training scholarship", applyUrl: "https://sportsauthorityofindia.nic.in/", description: "SAI's recognition awards for promising athletes.", deadline: "Yearly", tags: ["sports", "sai", "merit"] },
  { id: "ncpa-music-fund", name: "NCPA Music + Performing Arts Fund", awardingBody: "National Centre for Performing Arts (NCPA)", type: "PRIVATE", state: "MH", levels: ["UG", "PG"], eligibility: { note: "Classical music/dance/theatre students" }, amount: "₹50,000-₹3 lakh/year + training opportunities", applyUrl: "https://www.ncpamumbai.com/", description: "NCPA Mumbai's performing arts support.", deadline: "Annual cycle", tags: ["arts", "music", "ncpa"] },
  { id: "dhruv-pathak-ipts", name: "Dhruv Pathak IPTA Foundation", awardingBody: "Indian People's Theatre Association", type: "PRIVATE", state: null, levels: ["UG"], eligibility: { note: "Theatre + cinema students from low-income backgrounds" }, amount: "₹40,000-₹1.5 lakh/year", applyUrl: "https://www.ipta.org/", description: "Theatre + cinema education support.", deadline: "Yearly", tags: ["arts", "theatre", "cinema"] },

  // ─── Disability + Special needs (more) ──────────────────────────────
  { id: "ncpedp-stem", name: "NCPEDP-Javed Abidi Stipend (Disability)", awardingBody: "NCPEDP", type: "CENTRAL", state: null, levels: ["UG", "PG"], eligibility: { incomeMaxLakhs: 5, note: "Persons with disabilities + STEM focus" }, amount: "₹50,000-₹3 lakh + assistive tech", applyUrl: "https://www.ncpedp.org/", description: "NCPEDP disability + STEM stipend.", deadline: "Yearly", tags: ["disability", "pwd", "stem"] },

  // ─── More state schemes — second batch ─────────────────────────────
  { id: "tn-puratchi-mt", name: "TN Mukhyamantri Puratchi Thalaivar Award", awardingBody: "TN Government", type: "STATE", state: "TN", levels: ["UG"], eligibility: { categories: ["SC", "ST", "OBC"], incomeMaxLakhs: 2.5 }, amount: "Free tuition + free boarding + book grant", applyUrl: "https://tn.gov.in/", description: "TN's MGR-named welfare scholarship for SC/ST/OBC UG students.", deadline: "Yearly", tags: ["tamil nadu", "tn"] },
  { id: "tn-anna-girls", name: "TN Anna Centenary Girls Scholarship", awardingBody: "TN Government", type: "STATE", state: "TN", levels: ["UG"], eligibility: { gender: "F", categories: ["SC", "ST", "OBC", "EWS"], incomeMaxLakhs: 3 }, amount: "₹15,000-₹50,000/year", applyUrl: "https://tn.gov.in/", description: "TN girls' UG support across reserved + EWS categories.", deadline: "Yearly", tags: ["tamil nadu", "tn", "girls"] },
  { id: "kl-sajeshmt-women", name: "Kerala Vidya Jyoti for Women", awardingBody: "Govt of Kerala", type: "STATE", state: "KL", levels: ["UG", "PG"], eligibility: { gender: "F", categories: ["GEN", "OBC", "MIN", "EWS"], incomeMaxLakhs: 4 }, amount: "₹20,000-₹50,000/year", applyUrl: "https://egrantz.kerala.gov.in/", description: "Kerala girls' UG/PG support.", deadline: "Yearly", tags: ["kerala", "kl", "girls"] },
  { id: "ap-cbpetbg-mt", name: "AP CBSE Group Scholarship", awardingBody: "Govt of Andhra Pradesh", type: "STATE", state: "AP", levels: ["CLASS_11_12"], eligibility: { categories: ["SC", "ST", "OBC", "MIN"], incomeMaxLakhs: 2 }, amount: "₹10,000-₹25,000/year", applyUrl: "https://education.ap.gov.in/", description: "AP reserved-category Class 11-12 support.", deadline: "Yearly", tags: ["andhra pradesh", "ap"] },
  { id: "ts-tribal-overseas", name: "TS Tribal Welfare Overseas Scholarship", awardingBody: "TS Tribal Welfare Dept", type: "STATE", state: "TS", levels: ["PG"], eligibility: { categories: ["ST"], incomeMaxLakhs: 5 }, amount: "Up to ₹20 lakh", applyUrl: "https://www.tribalwelfare.telangana.gov.in/", description: "TS tribal welfare overseas PG scholarship.", deadline: "Twice yearly", tags: ["telangana", "ts", "tribal", "overseas"] },
  { id: "gj-saksham", name: "Gujarat Saksham Scholarship for Disabled Students", awardingBody: "Govt of Gujarat", type: "STATE", state: "GJ", levels: ["UG", "PG"], eligibility: { incomeMaxLakhs: 2.5, note: "PwD students in Gujarat-domicile" }, amount: "Tuition + ₹5,000-₹20,000/year", applyUrl: "https://socialjustice.gujarat.gov.in/", description: "GJ state PwD support.", deadline: "Yearly", tags: ["gujarat", "gj", "pwd", "disability"] },
  { id: "rj-balika-protsahan", name: "Rajasthan Balika Protsahan Yojana", awardingBody: "Govt of Rajasthan Department of Education", type: "STATE", state: "RJ", levels: ["CLASS_9_10", "CLASS_11_12"], eligibility: { gender: "F", note: "Rajasthan girl students" }, amount: "₹5,000-₹40,000 over school years", applyUrl: "https://sso.rajasthan.gov.in/", description: "Rajasthan girls' Class 9-12 milestone payouts.", deadline: "Yearly", tags: ["rajasthan", "rj", "girls"] },
  { id: "wb-aikyashree-min", name: "WB Aikyashree Pre-Matric for Minorities", awardingBody: "Govt of West Bengal Minority Affairs", type: "STATE", state: "WB", levels: ["CLASS_9_10"], eligibility: { categories: ["MIN"], incomeMaxLakhs: 1 }, amount: "₹2,000-₹3,000/year + book grant", applyUrl: "https://wbmdfcscholarship.gov.in/", description: "WB minority pre-matric scholarship.", deadline: "Yearly", tags: ["west bengal", "wb", "minority"] },
  { id: "wb-aikyashree-post-matric", name: "WB Aikyashree Post-Matric Minorities", awardingBody: "Govt of West Bengal Minority Affairs", type: "STATE", state: "WB", levels: ["CLASS_11_12", "UG", "PG"], eligibility: { categories: ["MIN"], incomeMaxLakhs: 2 }, amount: "Tuition + maintenance up to ₹13,500/year", applyUrl: "https://wbmdfcscholarship.gov.in/", description: "WB minority post-matric scholarship.", deadline: "Sep-Nov", tags: ["west bengal", "wb", "minority"] },

  // ─── Defence + Veteran families (extras) ───────────────────────────
  { id: "param-vir-chakra-fund", name: "Param Vir Chakra Awardee Wards Fund", awardingBody: "Ministry of Defence", type: "CENTRAL", state: null, levels: ["UG"], eligibility: { note: "Wards of Param Vir Chakra recipients" }, amount: "Full tuition + maintenance", applyUrl: "https://ksb.gov.in/", description: "PVC awardee family education support.", deadline: "Yearly", tags: ["defence", "pvc"] },
  { id: "war-widow-scholarship", name: "War Widow / Disabled War Veteran Children", awardingBody: "Ministry of Defence + KSB", type: "CENTRAL", state: null, levels: ["UG"], eligibility: { note: "Wards of war widows + disabled war veterans" }, amount: "Full tuition + ₹3,000/month maintenance", applyUrl: "https://ksb.gov.in/", description: "Children of war widows + disabled veterans support.", deadline: "Yearly", tags: ["defence", "war widow", "veterans"] },
  { id: "armed-forces-flag-fund", name: "Armed Forces Flag Day Fund Education", awardingBody: "KSB + Indian Ex-Servicemen League", type: "CENTRAL", state: null, levels: ["UG"], eligibility: { note: "Wards of ex-servicemen + serving personnel; need-based" }, amount: "₹20,000-₹1 lakh/year", applyUrl: "https://ksb.gov.in/", description: "AFFD education welfare for ex-servicemen families.", deadline: "Yearly", tags: ["defence", "ex-servicemen", "flag day"] },

  // ─── Additional first-generation + low-income ──────────────────────
  { id: "first-gen-tata-trust", name: "Tata First-Generation Learner Scholarship", awardingBody: "Tata Trusts", type: "PRIVATE", state: null, levels: ["UG"], eligibility: { incomeMaxLakhs: 2.5, note: "First-generation learner; parents didn't complete college" }, amount: "₹30,000-₹2 lakh/year + mentorship", applyUrl: "https://www.tatatrusts.org/", description: "Tata Trusts first-gen UG support.", deadline: "Yearly", tags: ["tata", "first gen", "low income"] },
  { id: "feeding-india-stipend", name: "Feeding India Education Stipend", awardingBody: "Feeding India + Zomato Foundation", type: "PRIVATE", state: null, levels: ["UG"], eligibility: { incomeMaxLakhs: 3, note: "Underprivileged UG students with strong academic track" }, amount: "₹15,000-₹50,000/year + mentorship + Zomato internship", applyUrl: "https://feedingindia.org/", description: "Feeding India + Zomato Foundation UG support.", deadline: "Yearly", tags: ["zomato", "feeding india", "private"] },

  // ─── Foreign mobility (more) ────────────────────────────────────────
  { id: "rhodes-india", name: "Rhodes Scholarship (Oxford, India region)", awardingBody: "Rhodes Trust", type: "MERIT", state: null, levels: ["PG", "PHD"], eligibility: { incomeMaxLakhs: 99, minMarksPct: 80, note: "Top Indian students for Oxford PG/PhD. Age 18-28." }, amount: "Full tuition + £18,000+/year stipend (~₹20+ lakh/year)", applyUrl: "https://www.rhodeshouse.ox.ac.uk/", description: "Rhodes Trust Oxford scholarship — among most prestigious globally. 5 from India yearly.", deadline: "Aug 1", tags: ["rhodes", "oxford", "overseas", "phd"] },
  { id: "fulbright-nehru-india", name: "Fulbright-Nehru Scholarships", awardingBody: "USIEF / United States-India Educational Foundation", type: "MERIT", state: null, levels: ["PG", "PHD"], eligibility: { note: "Indian academics + students pursuing research / PG in US" }, amount: "Tuition + stipend + travel + health (US-funded)", applyUrl: "https://www.usief.org.in/", description: "USIEF Fulbright-Nehru research + study fellowships.", deadline: "Spring (May/Jun)", tags: ["fulbright", "us", "research", "overseas"] },
  { id: "chevening-india", name: "Chevening Scholarship", awardingBody: "UK Foreign + Commonwealth Office", type: "MERIT", state: null, levels: ["PG"], eligibility: { note: "UK Master's; demonstrated leadership; 2+ years work" }, amount: "Full tuition + ₹15,000+ GBP living + travel + health", applyUrl: "https://www.chevening.org/", description: "Chevening 1-year UK Master's scholarship.", deadline: "Aug-Nov", tags: ["chevening", "uk", "overseas"] },
  { id: "endeavour-australia", name: "Endeavour Leadership Programme (Australia)", awardingBody: "Govt of Australia", type: "MERIT", state: null, levels: ["PG", "PHD"], eligibility: { note: "PG/PhD in Australia for international students" }, amount: "Tuition + stipend + travel + health (AUD)", applyUrl: "https://internationaleducation.gov.au/", description: "Australian Govt overseas PG/PhD funding.", deadline: "Yearly", tags: ["endeavour", "australia", "overseas"] },
  { id: "mexico-fund-india", name: "MEXT Scholarship (Japan Govt)", awardingBody: "Govt of Japan", type: "MERIT", state: null, levels: ["UG", "PG", "PHD"], eligibility: { note: "Indian students for Japanese universities" }, amount: "Full tuition + ₹1.4-1.7 lakh/month JPY equivalent + travel + airfare", applyUrl: "https://www.in.emb-japan.go.jp/itpr_en/00_000007.html", description: "Japanese Government education scholarship.", deadline: "Yearly cycle", tags: ["japan", "MEXT", "overseas"] },
  { id: "daad-india", name: "DAAD Scholarship — Indian Students", awardingBody: "DAAD (German Academic Exchange Service)", type: "MERIT", state: null, levels: ["PG", "PHD"], eligibility: { note: "Indian students pursuing Master's/PhD in Germany" }, amount: "€934-€1200/month stipend + tuition coverage + insurance", applyUrl: "https://www.daad.in/", description: "DAAD's broad scholarship portfolio for Indians studying in Germany.", deadline: "Variable by programme", tags: ["daad", "germany", "overseas"] },
  { id: "khorana-program", name: "Khorana Programme for Scholars (US-India)", awardingBody: "Indo-US Science + Tech Forum", type: "RESEARCH", state: null, levels: ["UG"], eligibility: { note: "BSc/BTech students in life sciences for 10-12 week US research internship" }, amount: "Travel + stipend ~USD 4,500 for 12 weeks", applyUrl: "https://www.iusstf.org/khorana-program-for-scholars", description: "US-India undergrad research exchange.", deadline: "Sep-Nov", tags: ["khorana", "us", "internship", "research"] },
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
