// Career path catalogue — the single most-searched surface in Indian
// education ("career after 12th science", "how to become an IAS officer",
// "salary of a software engineer"). Hand-authored TypeScript so updates
// ship via PR + visible diff. Each career page becomes its own SEO URL.
//
// Sources for salary bands (cited on each page, NOT inline so we can
// update yearly without retouching every entry):
//   - NASSCOM Indian IT salary report
//   - Naukri JobSpeak quarterly index
//   - 7th Pay Commission tables for govt roles
//   - PayScale + AmbitionBox aggregates for private
//   - Official salary structures published by ministries (UPSC, banks, defence)
//
// Salary bands are deliberately wide. Real salaries vary by city, employer,
// tier, performance. The point is to give a student a realistic anchor,
// not promise a number.

export interface CareerSalaryBand {
  /** Years of experience the band applies to. */
  experience: string;
  /** ₹ amount as a prose string, e.g., "₹3.5 - ₹6 LPA". */
  band: string;
  /** Note specific to this band (city tier, role variations). */
  note?: string;
}

export interface CareerEntryRoute {
  /** "Class 12 → Engineering UG → JEE Main" type title. */
  title: string;
  /** 1-2 sentence prose of the route. */
  body: string;
  /** Optional links to relevant shishya pages (exam, college, scholarship). */
  links?: Array<{ label: string; href: string }>;
}

export interface CareerCategory {
  slug: string;
  label: string;
}

export const CAREER_CATEGORIES: CareerCategory[] = [
  { slug: "engineering",       label: "Engineering & Tech" },
  { slug: "medicine",          label: "Medicine & Healthcare" },
  { slug: "finance",           label: "Finance, Accounting & Banking" },
  { slug: "civil-services",    label: "Civil Services & Government" },
  { slug: "law",               label: "Law" },
  { slug: "design",            label: "Design & Creative" },
  { slug: "education-research",label: "Education & Research" },
  { slug: "defence",           label: "Defence & Police" },
  { slug: "business-mgmt",     label: "Business & Management" },
  { slug: "media-comms",       label: "Media & Communications" },
  { slug: "skilled-trade",     label: "Skilled Trades & ITI" },
  { slug: "agriculture",       label: "Agriculture & Allied" },
];

export interface Career {
  slug: string;
  name: string;
  /** Category for grouping on /careers landing. */
  category: string;
  /** 1-sentence elevator pitch shown on tiles. */
  dek: string;
  /** Longer "what does this person actually do" prose. */
  whatTheyDo: string;
  /** 4-7 day-to-day responsibilities, bulleted. */
  dayToDay: string[];
  /** Entry routes from school onwards (multiple paths typical). */
  entryRoutes: CareerEntryRoute[];
  /** Qualifications (degrees, certifications, licenses). */
  qualifications: string[];
  /** Core skills (technical + soft). */
  skills: string[];
  /** Salary bands by experience. */
  salaryBands: CareerSalaryBand[];
  /** Career growth + typical progression. */
  growthPath: string;
  /** Top employers (informational, not endorsement). */
  topEmployers?: string[];
  /** Honest pros for this career. */
  pros: string[];
  /** Honest cons / failure modes. */
  cons: string[];
  /** Related careers (slugs in this file). */
  related?: string[];
  /** Most common related exam codes (in our Exam catalogue). */
  examCodes?: string[];
  /** Demand outlook in plain prose, sourced. */
  outlook: string;
  /** Search keywords for SEO metadata. */
  keywords: string[];
}

// ═════════════════════════════════════════════════════════════════════
// CAREER ENTRIES — alphabetical-ish within category for browsing.
// ═════════════════════════════════════════════════════════════════════

export const CAREERS: Career[] = [
  // ─── ENGINEERING & TECH ────────────────────────────────────────────
  {
    slug: "software-engineer",
    name: "Software Engineer",
    category: "engineering",
    dek: "Build the systems people interact with daily — apps, websites, payment infra, AI products.",
    whatTheyDo:
      "Software engineers design, write, test, and maintain code that runs everything from your UPI app to airline booking systems. Day to day, this is solving structured problems in a programming language (Python, Java, JavaScript, Go, C++) and collaborating with product, design, and QA teammates. Modern software engineering is roughly 50% coding, 30% communication + reviews, 20% debugging + ops.",
    dayToDay: [
      "Write + review code, often working from a Jira/Linear ticket",
      "Stand-up meetings (15 min daily), planning meetings weekly",
      "Code reviews for teammates' changes",
      "Debug production issues, sometimes on call",
      "Pair with product manager + designer on new feature scoping",
      "Write tests (unit, integration) and CI/CD configurations",
      "Continuous learning — frameworks change every 2-3 years",
    ],
    entryRoutes: [
      {
        title: "Class 12 (PCM) → BTech CSE/IT → Job",
        body: "The classic path. JEE Main + JEE Advanced for IITs, state CETs for NITs/state colleges, BITSAT for BITS Pilani.",
        links: [
          { label: "JEE Main", href: "/exams/JEE_MAIN" },
          { label: "JEE Advanced", href: "/exams/JEE_ADVANCED" },
          { label: "Top engineering colleges", href: "/colleges/stream/engineering" },
        ],
      },
      {
        title: "Class 12 → BCA / BSc CS → Job",
        body: "Less competitive entry; BCA at Christ, Symbiosis, Manipal etc. produces strong software engineers. Often better ROI than mid-tier BTech.",
      },
      {
        title: "Non-CS background → coding bootcamp / self-taught → Job",
        body: "Realistic for non-CS engineering grads, commerce/arts grads with strong logical aptitude. Pay scale lags BTech-CS by 1-2 years typically.",
      },
    ],
    qualifications: [
      "Bachelor's degree (any discipline, CS preferred)",
      "Strong portfolio (GitHub, side projects, internships)",
      "AWS/GCP/Azure certifications help in cloud roles",
    ],
    skills: [
      "1-2 strong programming languages (start with Python or JavaScript)",
      "Data structures + algorithms (DSA) for interviews",
      "Git, Linux, SQL — non-negotiable basics",
      "System design (for senior roles)",
      "Communication — translating product asks into technical work",
    ],
    salaryBands: [
      { experience: "Fresher (0-1 yr)", band: "₹3.5 - ₹15 LPA", note: "Service vs Product is the biggest split — Infosys/TCS pay ~₹3.5L, Google/Microsoft/Atlassian ₹25L+, mid-tier product ₹10-15L." },
      { experience: "2-4 years",        band: "₹6 - ₹35 LPA",  note: "Tier-1 product companies + foreign-market remote pay top of band." },
      { experience: "5-8 years",        band: "₹15 - ₹70 LPA", note: "Senior IC or first-line manager. FAANG-tier offers in India can hit ₹70L+ TC." },
      { experience: "10+ years",        band: "₹40 LPA - ₹2+ Cr", note: "Staff/Principal engineer, Engineering Manager. Tech Lead roles at unicorns + foreign-payroll." },
    ],
    growthPath:
      "IC track: Junior → Engineer → Senior → Staff → Principal. Management track: Engineer → Tech Lead → Engineering Manager → Director → VP Engineering. Either route lets you reach a leadership ceiling within 10-15 years.",
    topEmployers: [
      "TCS, Infosys, Wipro, HCL (services)",
      "Microsoft, Google, Amazon, Meta India (product)",
      "Flipkart, Zomato, Swiggy, PhonePe, CRED, Razorpay (Indian product)",
      "Atlassian, Stripe, Cloudflare (remote-first global)",
    ],
    pros: [
      "Highest-leverage career for compounding skill into income in India",
      "Remote-friendly; foreign-payroll work without relocation is possible",
      "Strong demand across decades — every industry needs software",
      "Skill is portable; doesn't depend on city/employer",
    ],
    cons: [
      "Field changes every 3-5 years — perpetual learning isn't optional",
      "Service-company entry can stall at ₹6-8 LPA for years; product/foreign-payroll is the leap",
      "On-call + after-hours debugging is real",
      "Job market cyclical — 2022-24 had layoffs even at top firms",
    ],
    related: ["data-scientist", "devops-engineer", "product-manager", "ux-designer"],
    examCodes: ["JEE_MAIN", "JEE_ADVANCED", "GATE_CSE", "BITSAT"],
    outlook: "Strong long-term. NASSCOM projects Indian IT sector to double in size by 2030. AI is changing what individual engineers do but not reducing aggregate demand.",
    keywords: ["software engineer career", "software engineer salary india", "how to become software engineer", "software developer salary india", "CSE job"],
  },

  {
    slug: "data-scientist",
    name: "Data Scientist",
    category: "engineering",
    dek: "Turn data into decisions. Build ML/AI models that drive product behaviour at scale.",
    whatTheyDo:
      "Data scientists frame business problems as data problems, build models (statistical, ML, deep learning), and ship them into production. Day to day mixes coding, math/statistics, and business communication. The job is less about exotic algorithms and more about cleaning messy data, picking the right metric, and convincing non-technical stakeholders.",
    dayToDay: [
      "Pull and clean data from SQL/data warehouses",
      "Exploratory analysis in Python/R notebooks",
      "Train + evaluate models, run experiments (A/B tests)",
      "Build ML pipelines (often with engineering support)",
      "Present findings to product + business — clear visualisations matter",
    ],
    entryRoutes: [
      {
        title: "BTech (any branch) → MS Data Science → Job",
        body: "Strongest signal. IIIT Bangalore, IIT Madras Online Degree, ISI Kolkata, IISc are top India options.",
        links: [
          { label: "Top engineering colleges", href: "/colleges/stream/engineering" },
        ],
      },
      {
        title: "BSc/BTech → Specialisation via Coursera/Kaggle + Internships",
        body: "Realistic. Top performers self-teach + win Kaggle medals + land applied research internships at startups.",
      },
      {
        title: "Existing analyst/engineer → Internal transition",
        body: "Most data scientists in industry start as data/business analysts and move sideways.",
      },
    ],
    qualifications: [
      "Bachelor's in CS/Stats/Math/Engineering",
      "Master's (MS Data Science / MS Stats) strongly preferred",
      "PhD for research-heavy roles in FAANG, Microsoft Research, etc.",
    ],
    skills: [
      "Python (pandas, scikit-learn, PyTorch/TF)",
      "SQL — non-negotiable",
      "Statistics, hypothesis testing, experimentation",
      "ML fundamentals + recent deep-learning awareness",
      "Communication + product sense — under-rated, over-correlates with senior pay",
    ],
    salaryBands: [
      { experience: "Fresher (0-1 yr)", band: "₹6 - ₹20 LPA", note: "Top MS programmes + product companies; service firms much less." },
      { experience: "2-4 years",        band: "₹12 - ₹40 LPA" },
      { experience: "5-8 years",        band: "₹25 - ₹80 LPA", note: "Senior DS or DS Manager at top product/fintech companies." },
      { experience: "10+ years",        band: "₹50 LPA - ₹2 Cr+", note: "Principal DS, ML lead, head of DS." },
    ],
    growthPath:
      "Analyst → Data Scientist → Senior DS → Staff/Principal DS, OR DS Manager → Head of DS → VP Data.",
    pros: [
      "Among highest-paid technical roles in India for senior talent",
      "Cross-functional — gives broad business exposure beyond IC engineering",
      "Genuinely interesting problems if you like math + product",
    ],
    cons: [
      "Field saturated at entry level — Kaggle medal + side project is now table-stakes",
      "Job titles inflated; 'data scientist' often means 'SQL analyst' at mid-tier firms",
      "ML/AI hype-cycle layoffs affected DS roles disproportionately in 2023-24",
    ],
    related: ["software-engineer", "ml-engineer", "data-analyst", "ai-researcher"],
    examCodes: ["JEE_MAIN", "GATE_CSE", "CAT"],
    outlook: "Strong but bifurcating. Top tier (FAANG-equivalent) compensation continues to rise; mid-tier saturating as bootcamps flood the entry market.",
    keywords: ["data scientist career", "data scientist salary india", "how to become data scientist", "machine learning engineer career"],
  },

  {
    slug: "mechanical-engineer",
    name: "Mechanical Engineer",
    category: "engineering",
    dek: "Design and build physical systems — vehicles, factories, HVAC, aerospace, manufacturing.",
    whatTheyDo:
      "Mechanical engineers work on the design, analysis, and manufacturing of physical systems. From automotive engines to HVAC systems to aerospace components to consumer-product industrial design. The day-to-day depends heavily on whether you're in R&D (CAD, simulation), production (process improvement on a shop floor), or design (concept-to-prototype).",
    dayToDay: [
      "CAD modelling (SolidWorks, CATIA, ANSYS)",
      "Design reviews + technical documentation",
      "Production floor walks to debug + improve processes",
      "Vendor interactions for component sourcing",
      "FEA / CFD simulations for stress + flow analysis",
    ],
    entryRoutes: [
      {
        title: "Class 12 (PCM) → BTech Mech → Job",
        body: "JEE / state CETs to NITs / state-funded engineering colleges. Top-tier mech grads from IITs go into R&D or finance.",
        links: [
          { label: "JEE Main", href: "/exams/JEE_MAIN" },
        ],
      },
      {
        title: "BTech Mech → MTech (IIT) → Higher-end role",
        body: "GATE + IIT MTech opens R&D roles at L&T, Tata, ISRO, DRDO.",
        links: [
          { label: "GATE Mechanical", href: "/exams/GATE_CSE" },
        ],
      },
    ],
    qualifications: ["BTech Mechanical Engineering", "MTech for R&D roles", "PE (Professional Engineer) licensing for international work"],
    skills: ["CAD (SolidWorks, CATIA, NX)", "FEA/CFD (ANSYS, Abaqus)", "Materials science basics", "Manufacturing processes (machining, casting, sheet metal)", "Production engineering + Six Sigma for plant roles"],
    salaryBands: [
      { experience: "Fresher (0-1 yr)", band: "₹3 - ₹8 LPA", note: "IIT-Mech to top firms reaches ₹15L+; tier-3 colleges typically ₹3-4L." },
      { experience: "2-4 years",        band: "₹5 - ₹15 LPA" },
      { experience: "5-8 years",        band: "₹10 - ₹30 LPA" },
      { experience: "10+ years",        band: "₹20 - ₹60 LPA", note: "Plant head, VP Engineering roles at major manufacturers." },
    ],
    growthPath: "Design Engineer → Senior Engineer → Lead → Manager → Plant Manager → Head of Manufacturing/R&D",
    topEmployers: ["Tata Motors, Mahindra, Maruti, Bajaj (auto)", "L&T, Siemens, ABB, Bosch (industrial)", "ISRO, DRDO, HAL (defence/space)", "GE, Rolls-Royce India, P&G (FMCG industrial)"],
    pros: ["Core engineering identity; satisfying tangible work", "Strong PSU + govt employer base for stability", "Manufacturing renaissance in India (PLI schemes) creating fresh demand"],
    cons: ["Entry-level pay materially below CS/IT", "Tier-3 college Mech-BTech has high underemployment risk", "Career growth slower than software peers"],
    related: ["civil-engineer", "aerospace-engineer", "manufacturing-engineer"],
    examCodes: ["JEE_MAIN", "GATE_CSE"],
    outlook: "Stable but pay-suppressed at entry. Strong long-term as India industrialises. Foreign roles (Germany, US, Australia) significantly better paid.",
    keywords: ["mechanical engineer career", "mechanical engineer salary india", "BTech mechanical scope"],
  },

  {
    slug: "civil-engineer",
    name: "Civil Engineer",
    category: "engineering",
    dek: "Design and build the physical infrastructure of cities — roads, bridges, buildings, water.",
    whatTheyDo:
      "Civil engineers plan, design, supervise, and maintain construction projects: buildings, highways, bridges, dams, water systems, airports. Roles split between design (consultancies, RCC analysis, structural drafting) and execution (site engineering, project management, contractor supervision).",
    dayToDay: ["Site visits + supervision", "AutoCAD/STAAD-Pro/Revit modelling", "Quantity estimation + BOQ preparation", "Vendor + contractor meetings", "Quality + safety audits"],
    entryRoutes: [
      { title: "BTech Civil → Site/Design Job", body: "GATE Civil + L&T Build-India for top route, or direct campus placement.", links: [{ label: "L&T Build-India scholarship", href: "/scholarships/lt-build-india" }] },
      { title: "BTech Civil → MS Construction Mgmt abroad", body: "Strong outbound path; US/Australia/Canada actively hire Indian civil engineers." },
    ],
    qualifications: ["BTech/BE Civil Engineering", "PE/PMP for senior roles", "MTech Structural/Geotech for design specialisation"],
    skills: ["AutoCAD, Revit, STAAD-Pro, ETABS", "Concrete + steel design codes (IS 456, IS 800)", "Project management + contracts", "Site safety + quality QMS"],
    salaryBands: [
      { experience: "Fresher (0-1 yr)", band: "₹3 - ₹6 LPA" },
      { experience: "2-4 years",        band: "₹5 - ₹12 LPA" },
      { experience: "5-8 years",        band: "₹10 - ₹25 LPA" },
      { experience: "10+ years",        band: "₹20 - ₹60 LPA", note: "Project director, principal consultant. Govt PSU peaks at ~₹50L." },
    ],
    growthPath: "Site/Design Engineer → Sr Engineer → Project Manager → Project Director → COO Construction",
    topEmployers: ["L&T, Shapoorji Pallonji, Tata Projects (construction)", "AECOM, Arcadis, WSP India (consulting)", "CPWD, NHAI, RITES, BRO (PSU/govt)", "DLF, Godrej, Lodha (real estate)"],
    pros: ["Strong govt + PSU presence — stability", "International mobility strong (Middle East, Australia construction booms)", "Visible impact — you can point at a bridge"],
    cons: ["Site postings often remote, hardship-prone", "Pay flat at mid-career unless you reach PM roles", "Real estate cycle dependence"],
    related: ["mechanical-engineer", "architect"],
    examCodes: ["JEE_MAIN", "GATE_CSE"],
    outlook: "Strong with infrastructure spending. Smart-cities, highways, metros, airports all expanding. Climate-adaptation engineering is emerging high-pay niche.",
    keywords: ["civil engineer career", "civil engineer salary india", "BTech civil scope", "L&T civil engineer"],
  },

  // ─── MEDICINE & HEALTHCARE ─────────────────────────────────────────
  {
    slug: "doctor-mbbs",
    name: "Doctor (MBBS)",
    category: "medicine",
    dek: "Diagnose and treat patients. The most-respected, most-arduous professional path in India.",
    whatTheyDo:
      "MBBS doctors work in OPDs, wards, ERs, or private clinics. Post-MBBS, most pursue MD/MS specialisations (3 more years) before independent practice. Day to day depends entirely on speciality — surgeons in OT 4-8 hours, physicians on rounds + OPDs, ER docs on 24-hour shifts.",
    dayToDay: ["Patient consultations / OPD", "Ward rounds + case discussions", "Procedures (surgery, biopsies, scopes)", "Documentation + EMR", "On-call duties + emergencies"],
    entryRoutes: [
      { title: "Class 12 (PCB) → NEET UG → MBBS", body: "5.5 years MBBS (4.5 study + 1 internship). NEET UG is the single gateway.", links: [{ label: "NEET UG", href: "/exams/NEET_UG" }, { label: "Top medical colleges", href: "/colleges/stream/medical" }] },
      { title: "MBBS → NEET PG → MD/MS", body: "Most MBBS doctors do PG. NEET PG selects you into 3-year MD/MS programmes." },
    ],
    qualifications: ["MBBS (5.5 years)", "MD/MS for specialisation (3 years)", "DM/MCh for super-specialisation (3 more years)"],
    skills: ["Diagnostic reasoning + clinical examination", "Surgical skills (for surgical branches)", "Communication + bedside manner", "Endurance — 80-hour weeks in residency", "Continuous learning — guidelines update yearly"],
    salaryBands: [
      { experience: "Intern (MBBS yr 5.5)", band: "₹0 - ₹0.5 LPA stipend", note: "Govt internship stipend varies wildly by state." },
      { experience: "MBBS fresh out", band: "₹3 - ₹8 LPA", note: "Govt service ₹5-7L, private hospital RMO ₹3-6L." },
      { experience: "Post-MD General Med/Surgery", band: "₹10 - ₹25 LPA", note: "Junior consultant + govt post." },
      { experience: "Senior Consultant (15+ yr)", band: "₹25 LPA - ₹2 Cr+", note: "Specialist private practice + tier-1 hospital + surgical procedures." },
    ],
    growthPath: "MBBS → MD/MS → DM/MCh (optional) → Junior Consultant → Senior Consultant → HOD/Head Surgeon. Private practice owners earn more than salaried, with risk.",
    topEmployers: ["AIIMS, PGI, JIPMER (govt)", "Apollo, Fortis, Max, Manipal (private chains)", "Reliance, Tata, Birla hospitals (corporate)"],
    pros: ["Highest social trust + status in Indian society", "Stable demand across decades", "Senior consultant earnings substantial"],
    cons: ["10-15 years of training before independent practice", "MBBS to MD is brutally competitive (~1L MBBS seats, ~70k NEET-PG total seats)", "Burnout + work hours extreme through residency", "Litigation risk increasing"],
    related: ["dentist", "pharmacist", "ayush-doctor", "nurse"],
    examCodes: ["NEET_UG"],
    outlook: "Strong demand outpaces supply. India's doctor-to-patient ratio is 1:1,500 (WHO target 1:1,000). Specialist shortage acute.",
    keywords: ["MBBS career", "doctor salary india", "how to become doctor", "NEET UG MBBS"],
  },

  {
    slug: "dentist",
    name: "Dentist (BDS)",
    category: "medicine",
    dek: "Diagnose and treat oral health. 4-year BDS + 1-year internship; lower NEET cutoff than MBBS.",
    whatTheyDo: "Dentists do everything from routine cleanings + fillings to root canals, extractions, orthodontics, implants. Most dentists run private practices (own or partner clinic); some specialise via MDS (3 more years) into ortho, prosth, oral surgery, etc.",
    dayToDay: ["Patient consultations", "Cleaning, fillings, RCT, extractions", "Crown/bridge/implant planning", "X-ray review", "Lab work coordination for prosthetics"],
    entryRoutes: [
      { title: "Class 12 (PCB) → NEET UG → BDS", body: "4-year BDS + 1-year internship. NEET cutoff lower than MBBS — easier entry.", links: [{ label: "NEET UG", href: "/exams/NEET_UG" }] },
      { title: "BDS → MDS (NEET PG)", body: "3-year MDS for orthodontics, oral surgery, prosthodontics etc." },
    ],
    qualifications: ["BDS (5 years inc. internship)", "MDS for specialisation"],
    skills: ["Manual dexterity + precision", "Patient communication + chairside manner", "Business basics for clinic ownership", "Imaging interpretation"],
    salaryBands: [
      { experience: "Fresher (0-2 yr)", band: "₹2 - ₹5 LPA", note: "Salaried at private clinics; junior consultant at tier-1 hospitals." },
      { experience: "Own practice (3-5 yr)", band: "₹4 - ₹15 LPA", note: "Hugely variable; tier-2/3 city clinic can be lower; metro practice with referrals higher." },
      { experience: "Established (10+ yr)", band: "₹15 LPA - ₹1 Cr+", note: "Specialist orthodontist or implantologist in metro can clear ₹50L easily." },
    ],
    growthPath: "Salaried → Junior partner → Own clinic → Multi-clinic owner. Specialist MDS opens premium pricing.",
    topEmployers: ["Apollo White, Clove Dental, FMS Dental (chains)", "Independent practice", "Govt dental colleges + ESIC + railway hospitals"],
    pros: ["BDS easier entry than MBBS via NEET", "Practice ownership viable early", "Procedure-based work — clear outcomes"],
    cons: ["BDS oversupply — entry-level pay suppressed", "Practice setup investment ₹15-30L+", "Geographic constraint — clinic local"],
    related: ["doctor-mbbs", "physiotherapist"],
    examCodes: ["NEET_UG"],
    outlook: "Mixed. Urban demand strong but BDS seats expanded faster than market. Specialists + tier-1 city practices remain attractive.",
    keywords: ["BDS career", "dentist salary india", "how to become dentist"],
  },

  {
    slug: "pharmacist",
    name: "Pharmacist",
    category: "medicine",
    dek: "Dispensing meds in hospitals + retail, or R&D in pharma companies after MPharm.",
    whatTheyDo: "BPharm pharmacists work in pharma R&D, regulatory, production, marketing, retail (medical shops), and hospital pharmacy. MPharm specialisations open clinical pharmacy, pharmacology research, pharma regulatory roles.",
    dayToDay: ["Prescription review + dispensing (retail/hospital)", "Drug interaction + dosage verification", "Quality control + production in pharma", "Regulatory documentation (DCGI, FDA)", "Sales + medical-rep field work"],
    entryRoutes: [
      { title: "Class 12 (PCB/PCM) → DPharm/BPharm → Job", body: "2-year DPharm or 4-year BPharm. State-level PMET or NEET (some states)." },
      { title: "BPharm → MPharm (GPAT)", body: "GPAT for MPharm; opens pharmacology/clinical pharmacy roles." },
      { title: "BPharm → MBA → Pharma management", body: "Most pharma marketing managers + medical reps follow this route." },
    ],
    qualifications: ["DPharm or BPharm", "MPharm for R&D/specialist roles", "PharmD (6-yr) for clinical pharmacy"],
    skills: ["Pharmacology + drug interactions", "Quality systems + GMP", "Regulatory knowledge (DCGI, USFDA)", "Communication for medical-rep roles"],
    salaryBands: [
      { experience: "Fresher (0-2 yr)", band: "₹1.5 - ₹4 LPA", note: "Retail pharmacy bottom of band; pharma MNCs top." },
      { experience: "2-5 yr",            band: "₹3 - ₹8 LPA" },
      { experience: "5-10 yr",           band: "₹6 - ₹18 LPA", note: "Production/R&D managers." },
      { experience: "10+ yr",            band: "₹15 - ₹50 LPA", note: "VP Manufacturing, Head of R&D in MNC pharma." },
    ],
    growthPath: "Pharmacist → Senior Pharmacist → QC/QA Manager → Plant Head. Medical rep → Area sales manager → Brand manager → BU head.",
    topEmployers: ["Sun Pharma, Cipla, Dr Reddy's, Aurobindo (Indian pharma)", "Pfizer, GSK, Novartis (MNC)", "Apollo Pharmacy, MedPlus (retail chains)"],
    pros: ["Lower entry barrier than MBBS/BDS", "Diverse career paths post-degree", "Pharma is recession-resistant"],
    cons: ["Entry-level pay among lowest of healthcare", "Retail pharmacy can be repetitive", "BPharm oversupply in some states"],
    related: ["doctor-mbbs", "biotechnologist"],
    examCodes: ["NEET_UG"],
    outlook: "Strong for specialised + R&D roles; oversupplied at entry retail level. Pharma industry growing at 10-12% yearly.",
    keywords: ["pharmacist career", "pharmacist salary india", "BPharm scope", "GPAT MPharm"],
  },

  // ─── FINANCE & ACCOUNTING ──────────────────────────────────────────
  {
    slug: "chartered-accountant",
    name: "Chartered Accountant (CA)",
    category: "finance",
    dek: "India's premier finance qualification. 4.5-5 years to clear; high pay + status if completed.",
    whatTheyDo: "CAs handle audit, tax, financial reporting, advisory, forensic accounting, M&A, valuation. Roles span Big-4 audit firms (Deloitte/PwC/KPMG/EY), in-house at large companies (Tata, RIL, etc.), independent practice, banking, and startups (as CFOs).",
    dayToDay: ["Audit field work (large clients) or in-house close cycle", "Tax planning + GST/TDS filings", "Financial statement preparation under IndAS", "Advisory on M&A, valuations, transfer pricing", "Stakeholder reviews + reporting"],
    entryRoutes: [
      { title: "Class 12 → CA Foundation → Intermediate → Articleship → Final", body: "Most direct. 4.5 years from Class 12 if no attempts wasted (rare). Intermediate has 3 attempts/year." },
      { title: "Graduate → CA Direct Entry (skip Foundation)", body: "B.Com/BBA grads with required marks can skip Foundation. Common route." },
    ],
    qualifications: ["CA Final (ICAI)", "B.Com/BBA helpful but not mandatory"],
    skills: ["Accounting standards (IndAS, IFRS)", "Tax law (Income Tax, GST)", "Audit procedures", "Excel + accounting software (SAP, Tally, Oracle)", "Communication for client-facing audit work"],
    salaryBands: [
      { experience: "Fresh CA (0-1 yr)", band: "₹7 - ₹15 LPA", note: "Big-4 ₹9-11L; Indian firms ₹6-8L; in-house ₹8-12L. ICAI median ~₹8.5L." },
      { experience: "2-5 yr",            band: "₹12 - ₹30 LPA" },
      { experience: "5-10 yr",           band: "₹25 - ₹60 LPA", note: "Senior manager at Big-4, GM Finance at corporates." },
      { experience: "10+ yr",            band: "₹40 LPA - ₹3 Cr+", note: "Partner at Big-4, CFO of mid-large companies." },
    ],
    growthPath: "Audit Associate → Senior → Manager → Senior Manager → Director → Partner. In-house: Finance Exec → Manager → CFO.",
    topEmployers: ["Big-4: Deloitte, PwC, KPMG, EY", "Indian: Grant Thornton, BDO, RSM", "In-house at all Nifty-500 companies", "Independent practice + small firms"],
    pros: ["Highest-status non-engineering professional credential in India", "Multiple career paths post-CA — audit, in-house, advisory, banking, startups", "Independent practice option real (with 5+ years experience)"],
    cons: ["Attempt failure rates 80%+ on first attempt", "5-year articleship is brutal — long hours, low pay", "Burnout in audit common"],
    related: ["company-secretary", "cma", "investment-banker"],
    examCodes: [],
    outlook: "Strong forever. Every company needs CAs. Big-4 hiring grew through 2023-24 even in slow markets.",
    keywords: ["chartered accountant career", "CA salary india", "how to become CA", "CA articleship"],
  },

  {
    slug: "investment-banker",
    name: "Investment Banker / Equity Research",
    category: "finance",
    dek: "High-finance careers — M&A advisory, IPOs, equity research at investment banks.",
    whatTheyDo: "IBankers advise corporates on raising capital (IPO, debt) and on M&A transactions. ER analysts cover specific sectors and write reports for buy-side investors. Hours notorious — 80-100/week in first 2 years.",
    dayToDay: ["Building financial models (DCF, LBO, comparable)", "Drafting pitch decks + IM (information memos)", "Coordinating with legal/accounting on transactions", "Client meetings + due diligence calls", "Industry research + management interactions"],
    entryRoutes: [
      { title: "BCom/Eng → CFA + MBA (top 5 IIM) → IB analyst", body: "Most common. IB does on-campus at IIM-A/B/C/L. CFA + finance internships strengthen profile." },
      { title: "CA → IB associate", body: "CA + Big-4 audit + MBA combo opens IB associate roles." },
      { title: "Top engineering UG (IIT) → Direct IB analyst", body: "IITs feed IB on-campus directly into analyst roles." },
    ],
    qualifications: ["MBA (top-7 IIM) OR CA + relevant experience OR CFA Charter"],
    skills: ["Financial modelling (DCF, LBO, M&A models)", "Valuation techniques", "Accounting fluency", "Communication + presentation", "Excel + PowerPoint mastery"],
    salaryBands: [
      { experience: "Analyst (0-2 yr)", band: "₹20 - ₹40 LPA", note: "Bulge-bracket banks (Goldman, MS) ₹35-40L; Indian IB ₹20-25L." },
      { experience: "Associate (3-5 yr)", band: "₹35 - ₹80 LPA" },
      { experience: "VP (6-10 yr)",       band: "₹80 LPA - ₹2 Cr" },
      { experience: "Director / MD (10+ yr)", band: "₹2 Cr - ₹5 Cr+" },
    ],
    growthPath: "Analyst → Associate → VP → Director → MD → Partner",
    topEmployers: ["Goldman Sachs, Morgan Stanley, JP Morgan (BB)", "Kotak, Axis Capital, JM Financial (Indian)", "Avendus, MAPE, o3 Capital (boutique)"],
    pros: ["Among highest-paid careers in India early on", "Exit options into PE/VC/corporate dev are strong", "Skill set portable globally"],
    cons: ["100-hour weeks in first 2 years are common", "Burnout high — most leave within 4 years", "Heavily concentrated in Mumbai + a handful of firms"],
    related: ["chartered-accountant", "private-equity", "equity-research"],
    examCodes: ["CAT"],
    outlook: "Cyclical. IPO/M&A booms drive hiring; slow years see layoffs. Long-term stable for top performers.",
    keywords: ["investment banker india salary", "how to become investment banker", "IB analyst MBA"],
  },

  {
    slug: "bank-po",
    name: "Bank PO (Probationary Officer)",
    category: "finance",
    dek: "Public-sector bank officer track. Stable govt-equivalent role with clear growth + pension.",
    whatTheyDo: "Bank POs are entry-level officers at PSU banks (SBI, PNB, BoB, Canara etc.). Start in branch operations + retail banking, rotate through credit, treasury, forex, HR over a career. Promotion to Scale-II within 2 years, with 5 scales total.",
    dayToDay: ["Branch operations supervision", "Loan appraisal + sanctioning", "Customer service + complaint resolution", "KYC + AML compliance", "Cross-selling insurance + investment products"],
    entryRoutes: [
      { title: "Bachelor's (any) → IBPS PO / SBI PO → Officer", body: "Three-tier exam: Prelims → Mains → Interview. Most join 22-24 yr old.", links: [{ label: "IBPS PO", href: "/exams/IBPS_PO" }, { label: "SBI PO", href: "/exams/SBI_PO" }] },
    ],
    qualifications: ["Bachelor's degree (any discipline)", "Age 20-30 (relaxations apply)"],
    skills: ["Quant + reasoning + English (exam)", "Customer service + sales", "Compliance + risk awareness", "Computer literacy"],
    salaryBands: [
      { experience: "Joining (Scale-I)", band: "₹6 - ₹9 LPA", note: "Base + DA + HRA + perks. SBI slightly higher than PNB/BoB." },
      { experience: "Scale-II (3-5 yr)", band: "₹9 - ₹14 LPA" },
      { experience: "Scale-IV (10-15 yr)", band: "₹15 - ₹25 LPA" },
      { experience: "GM Scale (20+ yr)", band: "₹25 - ₹50 LPA+", note: "ED/Chairman levels with PSU board exposure." },
    ],
    growthPath: "Scale-I (PO) → Scale-II → Scale-III → Scale-IV (Sr Manager) → Scale-V (Chief Manager) → DGM → GM → ED → Chairman",
    topEmployers: ["SBI, PNB, BoB, Canara Bank, BoI, Union Bank, Indian Bank, IDBI Bank"],
    pros: ["Stable govt-equivalent employment with pension", "Predictable promotions every 3-5 years", "Geographic mobility (transfers paid)", "Allowances substantial (HRA, LFC, medical)"],
    cons: ["Branch posting may be rural for first 5 years", "Transfer frequency high — disruptive for families", "Customer-service intensity high in retail banking", "Pay below private banking + IT after 5 years"],
    related: ["bank-clerk", "rbi-grade-b", "civil-services"],
    examCodes: ["IBPS_PO", "SBI_PO"],
    outlook: "Stable + recession-proof. PSU consolidation has reduced PO intake slightly, but still 4-6k POs hired annually.",
    keywords: ["bank PO career", "IBPS PO salary", "SBI PO salary", "how to become bank PO"],
  },

  // ─── CIVIL SERVICES & GOVERNMENT ───────────────────────────────────
  {
    slug: "ias-officer",
    name: "IAS Officer",
    category: "civil-services",
    dek: "Indian Administrative Service — top-tier civil servant. Multi-year prep; 0.2% clear rate.",
    whatTheyDo: "IAS officers run district + state administration, then move up to secretary-level positions in central + state governments. From SDM (sub-divisional magistrate) at 24 to potentially Chief Secretary by 50-55. Roles span revenue, law-and-order, development, finance, foreign service, etc.",
    dayToDay: ["Public meetings + Janta Darshan", "Implementation review of govt schemes", "Coordination with departments + private sector", "Crisis management (during disasters, elections)", "Policy drafting + cabinet briefs (at secretariat levels)"],
    entryRoutes: [
      { title: "Bachelor's (any) → UPSC CSE (Prelims + Mains + Interview) → IAS", body: "3-stage exam. Prelims is one day, Mains is 9 papers over a week, Interview is 30-min personality test. Total time ~1 year per attempt.", links: [{ label: "UPSC Civil Services", href: "/exams/UPSC_PRELIMS" }] },
    ],
    qualifications: ["Bachelor's degree (any discipline, any year of passing)", "Age 21-32 (general; relaxations to 35 OBC, 37 SC/ST)", "Indian citizen"],
    skills: ["Vast general knowledge (history, polity, geography, economy, current affairs)", "Essay writing + analytical reasoning", "Interview presence — calm + clear", "Public speaking + Hindi/regional language fluency"],
    salaryBands: [
      { experience: "Junior Time Scale (0-4 yr)", band: "₹8 - ₹12 LPA", note: "7th CPC: ₹56,100 base + DA + HRA + transport. Plus official residence + vehicle + staff." },
      { experience: "Senior Time Scale (4-9 yr)", band: "₹12 - ₹18 LPA" },
      { experience: "Selection Grade (13-16 yr)", band: "₹18 - ₹25 LPA" },
      { experience: "Apex / Cabinet Secretary (30+ yr)", band: "₹30 - ₹45 LPA", note: "Plus perks worth several times the base. Real total value is in the role, not the salary." },
    ],
    growthPath: "SDM → Collector/DM → Joint Secretary → Secretary → Chief Secretary / Cabinet Secretary",
    pros: ["Highest-status civil service role in India", "Wide scope of impact — directly shapes governance", "Job security + pension + perks substantial", "Cabinet Secretary is one of India's most powerful positions"],
    cons: ["Multi-year prep with 0.2% success rate", "Age limit means failure costs years", "Politically-pressured environment", "Transferable role — family life disrupted", "Salary below private senior corporate (offset by perks)"],
    related: ["ips-officer", "ifs-officer", "state-civil-services"],
    examCodes: ["UPSC_PRELIMS"],
    outlook: "Stable demand. ~1000 vacancies/year across IAS/IPS/IFS/IRS combined. UPSC sees 10-12L applicants yearly.",
    keywords: ["IAS officer salary", "how to become IAS", "UPSC CSE prep", "IAS career"],
  },

  {
    slug: "ips-officer",
    name: "IPS Officer",
    category: "civil-services",
    dek: "Indian Police Service — heads police forces, intelligence, CBI. Cleared via UPSC CSE.",
    whatTheyDo: "IPS officers start as Assistant Superintendent of Police (ASP) at 24, move through SP/DCP, DIG, IG, ADG, DGP. Specialisations include law-and-order, crime branch, intelligence (IB, RAW), CBI, anti-corruption, traffic, etc.",
    dayToDay: ["Field supervision + crime scene visits", "Force command + briefings", "Coordination with district admin (IAS Collector)", "Investigation oversight on major cases", "VIP security + bandobast for events"],
    entryRoutes: [
      { title: "Bachelor's → UPSC CSE → IPS", body: "Same exam as IAS. IPS is roughly 2nd preference for most UPSC clearers (after IAS).", links: [{ label: "UPSC Civil Services", href: "/exams/UPSC_PRELIMS" }] },
    ],
    qualifications: ["Bachelor's degree (any)", "Age 21-32 (general)", "Physical standards: height 165cm M / 150cm F, chest 84cm, eyesight 6/6"],
    skills: ["Physical fitness + endurance", "Crime + criminology basics", "Forensic awareness", "Leadership under stress", "Public communication"],
    salaryBands: [
      { experience: "ASP (0-4 yr)", band: "₹8 - ₹12 LPA", note: "Same scale as IAS. Plus uniform allowance + ration money + risk allowance." },
      { experience: "SP/DCP (4-9 yr)", band: "₹12 - ₹18 LPA" },
      { experience: "IG (16+ yr)", band: "₹20 - ₹30 LPA" },
      { experience: "DGP (28+ yr)", band: "₹30 - ₹45 LPA" },
    ],
    growthPath: "ASP → SP/DCP → SSP → DIG → IG → ADGP → DGP. Optional secondments to IB/RAW/CBI/NIA at various levels.",
    pros: ["Direct command authority", "Specialisations into IB/RAW/CBI/SPG attractive for many", "Strong post-retirement positions (governors, advisors)"],
    cons: ["Physical + emotional toll real — long hours, irregular life", "VIP duties + political interference frustrating for many", "Family relocations frequent"],
    related: ["ias-officer", "armed-forces-officer"],
    examCodes: ["UPSC_PRELIMS"],
    outlook: "Stable. India has ~5k IPS officers; ~150 added yearly via UPSC.",
    keywords: ["IPS officer salary", "how to become IPS", "police officer career"],
  },

  {
    slug: "state-civil-services",
    name: "State Civil Services (PCS)",
    category: "civil-services",
    dek: "State-level equivalent of IAS. Easier entry; service confined to one state.",
    whatTheyDo: "PCS officers (UP PCS, MPPSC, BPSC, TNPSC etc.) run state-level + district administration similar to IAS but at state cadre. Promotional ceiling is typically Divisional Commissioner / Principal Secretary level.",
    dayToDay: ["District-level admin + revenue work", "Implementation of state schemes", "Election + disaster duties", "Court appearances (revenue tribunals)", "Coordination with elected reps + IAS officers"],
    entryRoutes: [
      { title: "Bachelor's → State PSC → PCS", body: "Each state has its own commission and exam pattern. UP PCS, BPSC, TNPSC, KPSC, MPPSC, RPSC etc.", links: [{ label: "UPPSC PCS", href: "/exams/UP_UPPSC_PCS" }, { label: "BPSC CCE", href: "/exams/BR_BPSC_CCE" }, { label: "MPPSC SSE", href: "/exams/MP_MPPSC_SSE" }] },
    ],
    qualifications: ["Bachelor's degree", "Age 21-40 (state-specific)", "Domicile of the state (some states only)"],
    skills: ["State-specific GS (history, geography, polity, current affairs)", "Regional language fluency (Hindi for UP/MP/BR/RJ etc.)", "Same admin skill base as IAS"],
    salaryBands: [
      { experience: "Joining (0-4 yr)", band: "₹6 - ₹9 LPA", note: "Similar to junior IAS scale. State-funded perks." },
      { experience: "10 yr",              band: "₹12 - ₹18 LPA" },
      { experience: "20 yr",              band: "₹18 - ₹30 LPA" },
    ],
    growthPath: "SDM/Deputy Collector → ADM → Joint Secretary → Special Secretary → Divisional Commissioner / Principal Secretary",
    pros: ["Easier entry than UPSC CSE", "Stay in your home state", "Same admin role as IAS at district level"],
    cons: ["Career ceiling below IAS (rare to promote into IAS via DPC after 8-15 years)", "Pay scales slightly behind IAS", "Cadre-bound — no central deputation typically"],
    related: ["ias-officer", "civil-services"],
    examCodes: ["UP_UPPSC_PCS", "BR_BPSC_CCE", "MP_MPPSC_SSE", "RJ_RPSC_RAS", "TN_TNPSC_GROUP1", "KA_KPSC_KAS"],
    outlook: "Stable. State-level recruitment continues yearly; each state hires 100-500 PCS officers per cycle.",
    keywords: ["state PCS career", "UPPSC PCS salary", "BPSC officer career", "MPPSC officer"],
  },

  // ─── LAW ───────────────────────────────────────────────────────────
  {
    slug: "advocate-litigator",
    name: "Advocate (Litigator)",
    category: "law",
    dek: "Court practice — civil, criminal, corporate. 5-year integrated BA-LLB or 3-year LLB.",
    whatTheyDo: "Litigators argue cases in courts (trial + appellate). Independent practice + chambers + senior counsel structure. Solo practice first 5 years is financially tough; senior advocates earn substantially.",
    dayToDay: ["Client consultations + case review", "Court appearances (sessions, high court, SC)", "Drafting petitions, plaints, replies", "Research on case law + statutes", "Negotiation + settlement discussions"],
    entryRoutes: [
      { title: "Class 12 → CLAT → 5-yr BA-LLB at NLU", body: "Top entry. CLAT cleared into NLSIU/NLU-Delhi/NALSAR etc. Strong placements but litigation is independent path.", links: [{ label: "CLAT", href: "/exams/CLAT" }, { label: "Top law colleges", href: "/colleges/stream/law" }] },
      { title: "Bachelor's → 3-yr LLB", body: "DU Faculty of Law, BHU, ILS Pune. Standard route for late-deciders." },
    ],
    qualifications: ["BA-LLB / LLB", "All India Bar Examination (AIBE)", "Bar Council of India enrolment"],
    skills: ["Legal research + case analysis", "Drafting + persuasion", "Court craft + oral advocacy", "Client management + business development"],
    salaryBands: [
      { experience: "Junior (0-3 yr)", band: "₹0.5 - ₹6 LPA", note: "Junior to senior advocate ₹15k-25k/month very common; tough first years. Tier-1 firms ₹15-20L." },
      { experience: "5-10 yr",          band: "₹6 - ₹40 LPA", note: "Wide variance — building practice vs salaried." },
      { experience: "15+ yr",           band: "₹20 LPA - ₹5 Cr+", note: "Senior counsel rates ₹1-25 lakh per hearing in SC. Most realistic outcome ₹50L-₹2 Cr." },
    ],
    growthPath: "Junior → Associate → Counsel → Senior Counsel / Designated Senior Advocate (SC/HC)",
    topEmployers: ["Khaitan, AZB, Cyril Amarchand, S&R, JSA (top law firms — corporate)", "Independent chambers under senior counsels", "Govt — Public Prosecutor, Solicitor General office"],
    pros: ["Independence + intellectual depth", "Senior counsel earnings substantial + recognition high", "Public-interest work option through pro-bono"],
    cons: ["First 5 years financially brutal", "Networks + family connections matter a lot", "Court adjournments + slow case progression frustrating"],
    related: ["corporate-lawyer", "judge-judicial-services"],
    examCodes: ["CLAT"],
    outlook: "Strong long-term for skilled litigators. Commercial litigation growing with corporate dispute volumes.",
    keywords: ["advocate career", "lawyer salary india", "how to become lawyer", "CLAT BA-LLB"],
  },

  {
    slug: "corporate-lawyer",
    name: "Corporate Lawyer (Law Firm)",
    category: "law",
    dek: "Transactional + advisory work at top law firms. M&A, capital markets, dispute resolution.",
    whatTheyDo: "Corporate lawyers at Tier-1 Indian firms (AZB, Khaitan, CAM, JSA, S&R) advise on M&A, IPOs, fund-raising, joint ventures, regulatory compliance, employment + competition law. Hours intense; pay among highest in legal profession.",
    dayToDay: ["Due diligence on transactions", "Drafting + reviewing contracts (SHA, SPA, JV agreements)", "Negotiation with opposite-side counsel", "Regulatory filings (SEBI, RBI, MCA, CCI)", "Client + partner meetings"],
    entryRoutes: [
      { title: "CLAT → NLU → Tier-1 firm placement", body: "Most direct. Top 50 in graduating class at NLSIU/NLUD/NALSAR get Tier-1 offers via campus.", links: [{ label: "CLAT", href: "/exams/CLAT" }] },
      { title: "Non-NLU → LLM (NLU/abroad) → Tier-1 firm", body: "Possible via LLM from top institute; harder route." },
    ],
    qualifications: ["BA-LLB or 3-yr LLB", "AIBE", "Optional: LLM (US/UK/India) for specialisations"],
    skills: ["Contract drafting", "Corporate law + securities regulation", "M&A process + valuation basics", "Stakeholder management", "Long-form writing under deadline"],
    salaryBands: [
      { experience: "Associate (0-2 yr)", band: "₹15 - ₹22 LPA", note: "Top-tier Indian firms ₹15-19L; foreign-firm Mumbai/Singapore ₹40L+." },
      { experience: "Senior Associate (3-5 yr)", band: "₹25 - ₹50 LPA" },
      { experience: "Principal Associate (6-8 yr)", band: "₹50 - ₹90 LPA" },
      { experience: "Partner (8-12 yr)", band: "₹1 Cr - ₹5 Cr+" },
    ],
    growthPath: "Associate → Senior Associate → Principal Associate → Partner → Equity Partner",
    topEmployers: ["AZB & Partners", "Khaitan & Co", "Cyril Amarchand Mangaldas", "S&R Associates", "Trilegal, JSA, Luthra"],
    pros: ["Highest-paid law track in India", "Cross-border transactions exposure", "Exit options into in-house at corporates + UN/multilateral roles"],
    cons: ["80+ hour weeks at junior level", "Attrition high — most leave within 5 years", "Mumbai/Delhi-concentrated"],
    related: ["advocate-litigator", "in-house-counsel"],
    examCodes: ["CLAT"],
    outlook: "Strong. M&A volumes growing; foreign-firm presence expanding post 2023 BCI changes.",
    keywords: ["corporate lawyer salary india", "law firm associate salary", "how to join AZB Khaitan"],
  },

  // ─── DESIGN ─────────────────────────────────────────────────────────
  {
    slug: "ux-designer",
    name: "UX / Product Designer",
    category: "design",
    dek: "Design user experiences for software products. Hybrid of design + psychology + research.",
    whatTheyDo: "UX designers research user behaviour, design wireframes + prototypes, run usability tests, and partner with PMs + engineers to ship products. Senior roles span design systems, design leadership, design strategy.",
    dayToDay: ["User interviews + usability tests", "Wireframing + prototyping (Figma)", "Design review with PMs + engineers", "Maintaining design system + component library", "Cross-team design crits"],
    entryRoutes: [
      { title: "Class 12 → NID/IIT Design (BDes) → Product designer", body: "NID Ahmedabad, IIT-B IDC, Srishti Bangalore are the top design schools. CEED + UCEED entrance exams.", links: [{ label: "Top design colleges", href: "/colleges/anna-university" }] },
      { title: "Non-design degree → Bootcamp + Portfolio", body: "Common — engineers + marketers transition into UX via 6-12 month bootcamps + portfolio building." },
    ],
    qualifications: ["BDes (preferred) or any bachelor's", "Portfolio (mandatory)", "Optional: MDes from IIT-B IDC, IIT-G, NID"],
    skills: ["Figma, Sketch, Adobe XD", "User research methods (interviews, surveys, usability testing)", "Visual + interaction design fundamentals", "Communication + presenting design decisions"],
    salaryBands: [
      { experience: "Fresher (0-1 yr)", band: "₹5 - ₹15 LPA", note: "NID/IIT-IDC ₹15L+; bootcamp grads ₹5-8L." },
      { experience: "2-4 yr",            band: "₹10 - ₹25 LPA" },
      { experience: "5-8 yr",            band: "₹20 - ₹50 LPA" },
      { experience: "10+ yr",            band: "₹40 LPA - ₹1.5 Cr+", note: "Design Lead, Principal Designer, Head of Design at unicorns/MNCs." },
    ],
    growthPath: "Designer → Senior Designer → Lead Designer → Design Manager → Principal Designer / Head of Design",
    topEmployers: ["Atlassian, Microsoft, Google India (product MNCs)", "Razorpay, CRED, Zomato, Swiggy (Indian product)", "ThoughtBot, Inkredible, Lollypop (design consultancies)"],
    pros: ["Career growing as Indian product companies mature", "Senior designers earn close to senior engineers", "Remote-friendly; foreign clients common"],
    cons: ["Junior pay below entry-level engineering at same companies", "Need strong portfolio — degree alone doesn't open doors", "Specialisations are real — UX research vs UI vs interaction"],
    related: ["graphic-designer", "product-manager", "software-engineer"],
    examCodes: [],
    outlook: "Strong. Indian product companies + global remote work expanding senior design demand.",
    keywords: ["UX designer career", "product designer salary india", "how to become UX designer"],
  },

  // ─── BUSINESS & MANAGEMENT ──────────────────────────────────────────
  {
    slug: "product-manager",
    name: "Product Manager",
    category: "business-mgmt",
    dek: "Own product outcomes. Sit between users, engineering, design, business. Career-of-careers.",
    whatTheyDo: "PMs decide what gets built, define success metrics, prioritise the backlog, and ship features. They're the connecting tissue between user research, engineering, design, marketing, sales. Not the boss of anyone, but accountable for outcomes.",
    dayToDay: ["User + data analysis", "Roadmap planning + sprint prioritisation", "PRD writing + stakeholder alignment", "Cross-functional meetings (design, eng, sales, support)", "Launch + post-launch retros"],
    entryRoutes: [
      { title: "BTech → MBA (top IIM) → Product role", body: "Most common. PMs at top Indian unicorns + MNCs come heavily from IIM-A/B/C/L/I.", links: [{ label: "CAT", href: "/exams/CAT" }] },
      { title: "Engineering → Internal transfer to PM", body: "Realistic for strong engineers at product companies. APM/Associate PM programs at Google, Microsoft, Atlassian, Razorpay, Atlassian India." },
      { title: "Consulting → PM", body: "Mckinsey/BCG analysts transition into PM 3-5 years in." },
    ],
    qualifications: ["Bachelor's degree (CS preferred but not mandatory)", "MBA (highly preferred for non-engineers)"],
    skills: ["Product sense + user empathy", "Data analysis (SQL, Excel, Mixpanel)", "Communication + persuasion", "Technical fluency (enough to spec with engineers)", "Business acumen"],
    salaryBands: [
      { experience: "APM/Fresher (0-1 yr)", band: "₹15 - ₹35 LPA", note: "IIM-A/B/C ₹30L+; lesser MBAs ₹15-20L." },
      { experience: "PM (2-5 yr)",          band: "₹25 - ₹60 LPA" },
      { experience: "Sr PM (5-8 yr)",       band: "₹50 - ₹1.2 Cr" },
      { experience: "Principal/Group PM (10+ yr)", band: "₹1 - ₹3 Cr+" },
    ],
    growthPath: "APM → PM → Senior PM → Group PM / Principal PM → Director Product → VP Product → CPO",
    topEmployers: ["Razorpay, CRED, Flipkart, Swiggy, Zomato, PhonePe (Indian product)", "Microsoft, Google, Amazon, Atlassian (MNC)"],
    pros: ["Among highest-paying non-CXO roles in product companies", "Exit options into VC, startup founding, executive roles", "Cross-functional exposure unmatched"],
    cons: ["Ambiguity high — no clear-cut deliverable", "Influence without authority — hard to manage", "Career path narrower outside product companies"],
    related: ["software-engineer", "ux-designer", "business-analyst"],
    examCodes: ["CAT"],
    outlook: "Strong. Senior PM compensation has compressed slightly in 2023-24 but long-term demand robust.",
    keywords: ["product manager career india", "product manager salary", "how to become PM"],
  },

  {
    slug: "management-consultant",
    name: "Management Consultant",
    category: "business-mgmt",
    dek: "Strategy advisory at McKinsey / BCG / Bain / Big-4. Premier career launch into senior roles.",
    whatTheyDo: "Consultants solve problems for client companies — market entry, M&A strategy, operations optimization, digital transformation. Travel-heavy at junior levels, partner roles based on relationships + sales.",
    dayToDay: ["Client interviews + workshops", "Excel modelling + data analysis", "Slide deck creation (PowerPoint excellence)", "Industry research + benchmarking", "Internal team huddles + partner reviews"],
    entryRoutes: [
      { title: "BTech (IIT) → Direct analyst at MBB", body: "MBB (McKinsey/BCG/Bain) hire from IIT campuses directly. ~30-50 hires/year." },
      { title: "MBA (top IIM/ISB) → Associate at MBB or Big-4", body: "Most common. IIM-A/B/C + ISB feed MBB heavily.", links: [{ label: "CAT", href: "/exams/CAT" }] },
    ],
    qualifications: ["Top-tier UG or MBA (IIT/IIM/ISB or foreign equivalent)"],
    skills: ["Excel + PowerPoint mastery", "Structured problem-solving (case method)", "Communication + executive presence", "Industry research speed", "Storytelling in slides"],
    salaryBands: [
      { experience: "Analyst (0-2 yr)", band: "₹18 - ₹35 LPA", note: "MBB ~₹25-30L base + signing + bonus." },
      { experience: "Associate (post-MBA, 0-2 yr)", band: "₹30 - ₹50 LPA" },
      { experience: "Engagement Manager (3-5 yr)", band: "₹50 LPA - ₹1 Cr" },
      { experience: "Principal/Partner (8+ yr)", band: "₹1.5 Cr - ₹5+ Cr" },
    ],
    growthPath: "Analyst → Senior Analyst → Engagement Manager → Associate Partner → Partner → Senior Partner",
    topEmployers: ["McKinsey, BCG, Bain (MBB)", "Deloitte S&O, EY-Parthenon, KPMG Strategy", "Kearney, Strategy&, Roland Berger"],
    pros: ["Premier exit options (CXO, PE, VC, startups, corporate strategy)", "Top training + network", "Senior pay among highest in any career"],
    cons: ["Heavy travel + 60-80 hour weeks", "Up-or-out culture — most leave within 2-4 years", "Limited deep expertise — generalist by design"],
    related: ["investment-banker", "product-manager", "private-equity"],
    examCodes: ["CAT"],
    outlook: "Strong. Consulting growing in India even as global firms see cyclicality.",
    keywords: ["management consultant career", "MBB India salary", "McKinsey associate salary"],
  },

  // ─── DEFENCE ────────────────────────────────────────────────────────
  {
    slug: "armed-forces-officer",
    name: "Armed Forces Officer",
    category: "defence",
    dek: "Army, Navy, Air Force commissioned officer. Multiple entry routes; service to nation.",
    whatTheyDo: "Commissioned officers (Lieutenant equivalent) command troops + units. Specialisations: combat arms (infantry, armoured), supporting arms (artillery, engineers, signals), services (logistics, medical). Posts rotate every 2-3 years across the country.",
    dayToDay: ["Troop leadership + training", "Operational duties at posting (border, base, headquarters)", "Physical training + readiness drills", "Administrative + welfare duties for unit", "Field exercises + war games"],
    entryRoutes: [
      { title: "Class 12 → NDA → 3-yr training → Officer", body: "Earliest entry. NDA exam after Class 12; admission to NDA Khadakwasla.", links: [{ label: "NDA", href: "/exams/NDA" }] },
      { title: "Bachelor's → CDS → IMA/AFA/INA → Officer", body: "Most common. CDS for graduates; Army/Navy/Air Force entry.", links: [{ label: "CDS", href: "/exams/CDS" }] },
      { title: "Bachelor's → SSB Direct (TES/TGC/SSC)", body: "Multiple direct-entry routes for engineering, technical, short-service commissions." },
    ],
    qualifications: ["NDA: Class 12 (PCM for Army/Air Force; PCB/PCM for Navy)", "CDS: Bachelor's degree", "Indian citizen, age 16.5-25", "Medical fitness — strict"],
    skills: ["Physical fitness (push-ups, running, swimming)", "Leadership + group dynamics", "Decision-making under stress", "Tactical + strategic thinking"],
    salaryBands: [
      { experience: "Lt/Capt (0-6 yr)", band: "₹9 - ₹15 LPA", note: "Pay + DA + MSP (₹15.5k) + risk/hardship allowances + free housing/messing." },
      { experience: "Major (6-13 yr)", band: "₹15 - ₹22 LPA" },
      { experience: "Lt Col (13-20 yr)", band: "₹22 - ₹35 LPA" },
      { experience: "Colonel + (20+ yr)", band: "₹30 - ₹50 LPA" },
      { experience: "Lt Gen / Vice Adm / Air Mshl", band: "₹45+ LPA" },
    ],
    growthPath: "Lt → Capt → Major → Lt Col → Col → Brig → Maj Gen → Lt Gen → Gen / Chief",
    pros: ["Highest non-corporate status in India", "Strong pension + healthcare post-retirement", "Generous perks: housing, schooling, CSD, healthcare lifelong"],
    cons: ["Postings remote + transferable", "Family disruption real", "Combat roles carry actual risk", "Medical/physical standards strict — ~30% rejection rate at SSB"],
    related: ["ips-officer", "civil-services"],
    examCodes: ["NDA", "CDS"],
    outlook: "Stable. ~10,000 officer vacancies/year across services.",
    keywords: ["armed forces officer career", "army officer salary", "how to become army officer", "NDA career"],
  },

  // ─── EDUCATION & RESEARCH ──────────────────────────────────────────
  {
    slug: "school-teacher",
    name: "School Teacher",
    category: "education-research",
    dek: "Teach Class 1-12 students at govt or private schools. CTET/TET qualification mandatory.",
    whatTheyDo: "Teach a subject (or be a primary class teacher) at a school. Govt school teachers have stronger job security but transferable postings; private school teachers have urban concentration but pay-rate variance.",
    dayToDay: ["Classroom teaching (5-6 periods/day)", "Lesson planning + assignment correction", "Parent-teacher meetings + reports", "Co-curricular activities + invigilation", "Continuous professional development (mandatory)"],
    entryRoutes: [
      { title: "Class 12 → BEd/DEd → CTET/TET → Govt school", body: "Most common for govt schools. CTET for central schools, state TETs for state schools.", links: [{ label: "CTET", href: "/exams/CTET" }, { label: "Various state TETs", href: "/exams" }] },
      { title: "Bachelor's + BEd → Private school", body: "Private schools hire on BEd + subject-specialist degrees; no TET requirement." },
      { title: "Postgrad → KVS/NVS PGT/TGT", body: "For Class 11-12 teaching (PGT) or Class 6-10 (TGT). Specific KVS/NVS recruitment exams." },
    ],
    qualifications: ["BEd (mandatory for govt schools)", "Bachelor's (subject) for secondary teaching", "Master's + BEd for PGT (Class 11-12)", "CTET / state TET (for govt jobs)"],
    skills: ["Subject mastery", "Classroom management", "Lesson design + pedagogy", "Patience + empathy", "Digital literacy (post-pandemic)"],
    salaryBands: [
      { experience: "Govt school (start)", band: "₹4 - ₹7 LPA", note: "7th CPC scale, state cadre. Plus DA + HRA. KVS PGT slightly higher." },
      { experience: "Private school (start)", band: "₹2 - ₹6 LPA", note: "Wide variance — tier-3 city ₹2-3L, top metro schools ₹6L+." },
      { experience: "10 yr govt", band: "₹8 - ₹13 LPA" },
      { experience: "Senior + private school principal", band: "₹15 - ₹40 LPA", note: "International school principals can hit ₹40L+." },
    ],
    growthPath: "Teacher → Senior Teacher → HOD/Subject Head → Vice Principal → Principal",
    topEmployers: ["KVS, NVS, Sainik Schools (central govt)", "State govt schools (UP, MH, KA, TN etc.)", "DPS, DAV, KV chains (large private)", "Cambridge/IB international schools"],
    pros: ["Strong job security in govt sector", "Pension + DA benefits substantial", "Holidays + summer break unlike most jobs", "Direct impact + societal respect"],
    cons: ["Mid-career pay flat in private sector", "Bureaucracy frustrating in govt", "Classroom strength 40+ stressful", "Salaries lag CS/finance heavily"],
    related: ["college-professor", "phd-researcher"],
    examCodes: ["CTET", "UP_UPTET", "TN_TET", "BR_TET", "MP_TET", "RJ_REET"],
    outlook: "Stable in govt; mixed in private. Govt school teacher shortage acute in many states.",
    keywords: ["teacher career", "school teacher salary india", "how to become teacher", "CTET TET teacher"],
  },

  {
    slug: "college-professor",
    name: "College Professor (Assistant Professor → Full Professor)",
    category: "education-research",
    dek: "Teach + research at undergraduate / postgraduate level. UGC NET-JRF or PhD entry.",
    whatTheyDo: "Assistant Professors teach UG/PG courses, run research, supervise students, publish papers, attend conferences. Promotion path to Associate then Full Professor based on research output + teaching scores.",
    dayToDay: ["Lectures + tutorials (8-12 hours/week)", "Research + writing papers", "Supervising MSc/MTech/PhD students", "Committee work (admissions, curriculum)", "Conferences + collaborations"],
    entryRoutes: [
      { title: "Bachelor's → Master's → UGC NET-JRF → PhD → Asst Prof", body: "Most common. NET-JRF gives stipend during PhD; PhD → Asst Prof at UGC-accredited institution.", links: [{ label: "UGC NET-JRF", href: "/scholarships/ugc-net-jrf" }] },
      { title: "Master's → CSIR NET (sciences) → PhD", body: "Sciences-specific equivalent.", links: [{ label: "CSIR NET-JRF", href: "/scholarships/ugc-net-jrf" }] },
      { title: "Master's → GATE → IIT MTech → IIT PhD → Asst Prof at IIT", body: "Most prestigious science/engineering academia route." },
    ],
    qualifications: ["PhD (mandatory at Asst Prof level for most universities post-2018)", "UGC NET / CSIR NET for entry-level", "Subject-specialisation Master's"],
    skills: ["Research methodology + publishing", "Teaching + pedagogy", "Grant writing", "Mentorship + supervision"],
    salaryBands: [
      { experience: "Assistant Professor (start)", band: "₹8 - ₹14 LPA", note: "7th CPC Academic Pay Level 10 = ₹57,700 base + DA + HRA + AGP." },
      { experience: "Associate Professor (8+ yr)", band: "₹15 - ₹22 LPA" },
      { experience: "Professor (15+ yr)", band: "₹20 - ₹35 LPA" },
      { experience: "HOD / Dean / Director", band: "₹35 - ₹60 LPA+" },
    ],
    growthPath: "Assistant Professor → Associate Professor → Professor → HOD → Dean → Vice Chancellor",
    topEmployers: ["IITs, NITs, IIITs, IISERs, IISc", "Central universities (JNU, DU, BHU, AMU)", "State universities", "Private universities (Ashoka, Azim Premji, Shiv Nadar)"],
    pros: ["Intellectual freedom + research ownership", "Pension + perks substantial post-retirement", "Sabbaticals + research travel funded", "Long-term societal contribution"],
    cons: ["PhD adds 5+ years to entry timeline", "Job market in some fields oversupplied", "Bureaucracy frustrating at govt universities"],
    related: ["school-teacher", "phd-researcher", "scientist"],
    examCodes: [],
    outlook: "Stable demand in well-funded institutions; tightening at state universities.",
    keywords: ["assistant professor salary india", "college professor career", "how to become professor", "UGC NET professor"],
  },

  // ─── MEDIA & COMMUNICATIONS ────────────────────────────────────────
  {
    slug: "journalist",
    name: "Journalist / Reporter",
    category: "media-comms",
    dek: "Report news, write features, investigate stories. Print, broadcast, digital.",
    whatTheyDo: "Journalists report from beats — politics, business, sports, technology, crime, courts. Day-to-day mix of source-cultivation, fact-checking, writing, editing. Digital-first newsrooms shifted hours later; print + TV still have early-evening deadlines.",
    dayToDay: ["Source meetings + interviews", "Story research + cross-verification", "Writing + editing copy", "Newsroom editorial meetings", "Social-media + reader interactions"],
    entryRoutes: [
      { title: "Bachelor's → MA Journalism / IIMC → Reporter", body: "IIMC Delhi, Asian College of Journalism Chennai, Symbiosis Pune, Xavier Mumbai are top routes." },
      { title: "Any bachelor's → Trainee Reporter → Reporter", body: "Many publications hire on talent + writing samples without journalism degree." },
    ],
    qualifications: ["Bachelor's degree", "MA Journalism / Mass Comm (preferred)"],
    skills: ["Writing — clear, fast, accurate", "Source cultivation", "News judgement", "Multilingual capability (English + Hindi/regional)", "Digital tools (CMS, social, video basics)"],
    salaryBands: [
      { experience: "Trainee (0-1 yr)", band: "₹2.5 - ₹6 LPA", note: "Wide variance. IIMC + Hindu/IE/HT graduates ₹5-6L; tier-2 papers ₹2.5-3L." },
      { experience: "Reporter (2-5 yr)", band: "₹4 - ₹12 LPA" },
      { experience: "Senior Reporter / Asst Editor (5-10 yr)", band: "₹10 - ₹25 LPA" },
      { experience: "Editor (10+ yr)", band: "₹25 LPA - ₹1 Cr+", note: "Editor-in-Chief at top mastheads can hit ₹50L-1Cr." },
    ],
    growthPath: "Trainee → Reporter → Senior Reporter → Asst Editor → Deputy Editor → Editor → Editor-in-Chief",
    topEmployers: ["The Hindu, Indian Express, HT, ToI, Mint, BS", "NDTV, Times Now, Republic, India Today TV", "Caravan, FactorDaily, The Wire (digital + magazine)"],
    pros: ["Front-row seat to history + public life", "Byline = personal brand-building", "Career into editor, author, public-policy possible"],
    cons: ["Pay lags most professions for decades", "Job insecurity in shrinking print + TV", "Long hours + irregular life"],
    related: ["content-writer", "media-anchor", "policy-analyst"],
    examCodes: [],
    outlook: "Mixed. Print + TV employment shrinking; digital + niche newsletters expanding. Top tier still pays well; mid-tier flat.",
    keywords: ["journalist career india", "journalist salary india", "how to become journalist", "IIMC career"],
  },

  // ─── SKILLED TRADES (ITI / Diploma) ──────────────────────────────
  {
    slug: "iti-electrician",
    name: "ITI Electrician",
    category: "skilled-trade",
    dek: "2-year ITI Electrician trade → wireman jobs, contractor work, or PSU/railway employment.",
    whatTheyDo: "Electricians install, maintain, repair electrical systems — residential wiring, commercial buildings, industrial plants, railways. Work spans both employee + self-employed contractor models. ITI is foundation; specialisation through apprenticeship + experience.",
    dayToDay: ["Wiring installation + maintenance", "Fault detection + repair", "Equipment + panel testing", "Safety compliance + documentation", "Customer interactions (for self-employed)"],
    entryRoutes: [
      { title: "Class 10 → ITI Electrician (2 yr)", body: "Direct ITI entry; NCVT/SCVT certification on completion. State-board scholarship may apply." },
      { title: "ITI → Apprenticeship (1 yr) → Job", body: "Apprenticeship at PSU/private firms pays modest stipend; converts to permanent + skilled cert." },
    ],
    qualifications: ["Class 10 pass", "ITI Electrician (NCVT/SCVT certified)", "Apprenticeship completion (preferred)"],
    skills: ["Electrical fundamentals + wiring practice", "Safety practices (insulation, earthing, protective gear)", "Reading wiring diagrams + blueprints", "Tool handling — multimeter, megger, megohm tester"],
    salaryBands: [
      { experience: "ITI fresh + apprentice", band: "₹1.2 - ₹2.4 LPA", note: "Apprentice stipend ₹6k-15k/month." },
      { experience: "Junior electrician (1-3 yr)", band: "₹1.8 - ₹3.5 LPA" },
      { experience: "Senior + self-employed (5-10 yr)", band: "₹3 - ₹8 LPA", note: "Contractor with own crew can earn substantially more." },
      { experience: "Railway/PSU senior tech (15+ yr)", band: "₹6 - ₹15 LPA" },
    ],
    growthPath: "Apprentice → Junior Electrician → Senior Electrician → Supervisor / Contractor / PSU Senior Tech",
    topEmployers: ["Railways, NTPC, PowerGrid, DISCOMs (PSU)", "L&T, Tata Projects, BHEL (contracts)", "Self-employed contracting", "Real-estate developers + maintenance firms"],
    pros: ["Short entry path (2 years post-Class 10)", "Self-employment viable + scalable", "Skill always in demand — recession-resistant"],
    cons: ["Physical work + risk (real electrical hazards)", "Pay-ceiling unless you transition to contractor", "Heat/site conditions can be tough"],
    related: ["iti-fitter", "iti-plumber", "diploma-engineering"],
    examCodes: [],
    outlook: "Strong. India's electrification + smart-city + EV-charging build-out creating sustained demand. Skilled electrician shortage in many cities.",
    keywords: ["ITI electrician career", "electrician salary india", "ITI scope", "wireman job"],
  },

  // ─── AGRICULTURE ────────────────────────────────────────────────────
  {
    slug: "agriculture-officer",
    name: "Agriculture Officer / Agronomist",
    category: "agriculture",
    dek: "BSc Agri + ICAR/state-PSC entry → govt extension officer or agribusiness role.",
    whatTheyDo: "Govt agriculture officers run state extension services — advise farmers on crop choice, fertilisers, irrigation, pest control, govt scheme enrolment. Private-sector agronomists work for seed/fertiliser/agritech companies on field trials, sales, R&D.",
    dayToDay: ["Field visits to farmer plots", "Demonstrating new agri techniques", "Scheme enrolment + subsidy paperwork", "Lab + soil testing coordination", "Reporting to district agri office"],
    entryRoutes: [
      { title: "Class 12 (PCB/PCM) → BSc Agri (ICAR AIEEA) → Job/MSc", body: "ICAR AIEEA for top agri universities (TNAU, GBPUAT, IARI). State agri university entrance for state universities." },
      { title: "BSc Agri → State Agri Department recruitment → Agri Officer", body: "Most direct govt route. Pay scale Level-7 (₹44,900 base)." },
      { title: "BSc Agri → Mahyco/Bayer/Syngenta → Agronomist", body: "Private sector — better pay early, less stability." },
    ],
    qualifications: ["BSc Agriculture / Horticulture", "MSc/MTech Agri for senior + research roles", "ICAR AICE for govt research"],
    skills: ["Crop science + soil fundamentals", "Pest + disease identification", "Field trial design", "Farmer + community communication", "Hindi/regional language fluency"],
    salaryBands: [
      { experience: "Govt fresh", band: "₹5 - ₹8 LPA", note: "State agri dept, Block Agri Officer." },
      { experience: "Private (start)", band: "₹3 - ₹6 LPA" },
      { experience: "Senior (10 yr)", band: "₹10 - ₹18 LPA" },
      { experience: "Director/AD level", band: "₹20 - ₹35 LPA" },
    ],
    growthPath: "BAO → ADO → DDA → JDA → DDA → Director Agriculture (state). In private: Field officer → Area manager → Regional manager → Country agronomy head.",
    topEmployers: ["State agriculture departments (every state)", "ICAR + state agri universities", "Mahyco, Bayer, Syngenta, Corteva (seeds)", "DCM Shriram, Coromandel (fertilisers)", "DeHaat, AgroStar, Cropin (agritech)"],
    pros: ["Public-sector stability + rural posting allowances", "Agritech is fast-growing private alternative", "Direct impact on farmer livelihoods"],
    cons: ["Rural postings tough on family life", "Pay below CS/engineering for similar tenure", "Bureaucracy in state govt frustrating"],
    related: ["food-technologist", "veterinary-doctor"],
    examCodes: [],
    outlook: "Strong. Agritech + climate-smart-agriculture creating new private demand. Govt extension roles stable.",
    keywords: ["agriculture officer career", "BSc agri salary", "ICAR AIEEA career", "agronomist salary india"],
  },

  // ─── More careers below — abbreviated to save space ───────────────
  {
    slug: "company-secretary",
    name: "Company Secretary (CS)",
    category: "finance",
    dek: "Corporate compliance officer. ICSI qualification; in-house or independent practice.",
    whatTheyDo: "CS manages corporate governance + statutory compliance — board meetings, ROC filings, SEBI compliance, contracts, secretarial audits. Listed companies legally must have a qualified CS.",
    dayToDay: ["Board meeting prep + minutes", "MCA/RoC filings", "SEBI compliance (listed cos)", "Contract review", "Director + shareholder communications"],
    entryRoutes: [
      { title: "Class 12 → CSEET → CS Executive → CS Professional", body: "ICSI path. 4-4.5 years if cleared on first attempts." },
      { title: "Graduate → Direct entry CS Executive", body: "B.Com/BBA grads skip CSEET." },
    ],
    qualifications: ["CS Professional (ICSI)", "Practical training 21 months"],
    skills: ["Companies Act + SEBI regs", "Contract drafting", "Corporate governance", "Meeting + minutes mastery"],
    salaryBands: [
      { experience: "Fresh CS", band: "₹4 - ₹8 LPA" },
      { experience: "Mid-career (5-10 yr)", band: "₹10 - ₹25 LPA" },
      { experience: "Senior (15+ yr)", band: "₹25 - ₹60 LPA" },
    ],
    growthPath: "Asst CS → CS → Senior Manager → AVP/VP Compliance → Company Secretary",
    pros: ["Statutorily-mandated role — every listed company needs CS", "Independent practice option", "Easier than CA"],
    cons: ["Pay below CA at similar experience", "Less broad than CA's accounting role"],
    related: ["chartered-accountant", "cma"],
    examCodes: [],
    outlook: "Stable. Increasing compliance complexity drives CS demand.",
    keywords: ["company secretary salary india", "CS career", "ICSI"],
  },

  {
    slug: "cma",
    name: "Cost Accountant (CMA)",
    category: "finance",
    dek: "Cost + management accounting. ICMAI qualification; manufacturing-heavy industries.",
    whatTheyDo: "CMAs do cost analysis, budgeting, internal audit, management reporting. Strong in manufacturing, energy, infrastructure where unit-cost discipline matters.",
    dayToDay: ["Cost audits + variance analysis", "Budgeting + forecasting", "Internal control + process reviews", "Management reporting", "GST + indirect tax planning"],
    entryRoutes: [
      { title: "Class 12 → CMA Foundation → Intermediate → Final", body: "ICMAI path; similar to CA structure." },
    ],
    qualifications: ["CMA Final (ICMAI)"],
    skills: ["Cost accounting standards", "Variance + budget analysis", "Process costing + activity-based costing", "ERP + Excel"],
    salaryBands: [
      { experience: "Fresh CMA", band: "₹4 - ₹8 LPA" },
      { experience: "5-10 yr", band: "₹10 - ₹20 LPA" },
      { experience: "Senior + GM Finance", band: "₹25 - ₹50 LPA" },
    ],
    growthPath: "Cost Accountant → Sr Manager → AGM → GM Finance → CFO",
    pros: ["In-demand at manufacturing PSUs + private", "Easier than CA", "Strong specialisation niche"],
    cons: ["Less brand recognition than CA", "Service-firm exit options weaker"],
    related: ["chartered-accountant", "company-secretary"],
    examCodes: [],
    outlook: "Stable. Manufacturing renaissance + PLI driving CMA demand.",
    keywords: ["CMA salary india", "cost accountant career", "ICMAI"],
  },

  {
    slug: "psu-engineer",
    name: "PSU Engineer (NTPC/ONGC/IOCL/BHEL/etc.)",
    category: "engineering",
    dek: "GATE → top PSUs. Stable govt-equivalent engineering job with strong perks.",
    whatTheyDo: "Engineers at central PSUs (NTPC, ONGC, IOCL, BHEL, GAIL, SAIL, PowerGrid) work on plant operations, project management, R&D, transmission, refining etc. Recruitment increasingly via GATE.",
    dayToDay: ["Plant/site engineering tasks", "Project planning + execution", "Maintenance + reliability", "Safety + audit", "Reports to senior engineers"],
    entryRoutes: [
      { title: "BTech → GATE → PSU recruitment", body: "Top PSUs select via GATE score + interview. Cutoffs vary by branch + category.", links: [{ label: "GATE", href: "/exams/GATE_CSE" }] },
    ],
    qualifications: ["BTech relevant discipline", "GATE score (most PSUs)", "ESE (UPSC Engineering Services) alternative"],
    skills: ["Engineering fundamentals (branch-specific)", "Project management", "Safety + compliance awareness"],
    salaryBands: [
      { experience: "GET (Graduate Engineer Trainee, 0-2 yr)", band: "₹10 - ₹15 LPA", note: "CTC inc. perks. Base salary ₹60k+." },
      { experience: "Engineer/Sr Engineer (3-8 yr)", band: "₹15 - ₹25 LPA" },
      { experience: "DGM/AGM (10-20 yr)", band: "₹25 - ₹50 LPA" },
      { experience: "Director (25+ yr)", band: "₹40+ LPA" },
    ],
    growthPath: "GET → Engineer → Sr Engineer → DGM → GM → ED → Director",
    topEmployers: ["NTPC, PowerGrid, NHPC (power)", "ONGC, OIL, IOCL, BPCL, HPCL, GAIL (oil & gas)", "BHEL, SAIL, NMDC (heavy industry)", "Coal India + subsidiaries"],
    pros: ["Strong job security + pension", "Excellent perks (housing, schooling, medical, LFC)", "Predictable promotions", "Foreign deputations possible (ONGC, IOCL overseas)"],
    cons: ["Remote postings at plants/sites", "Hierarchy + bureaucracy can be frustrating", "Pay slower to grow than private after 5-7 years"],
    related: ["psu-officer", "civil-services"],
    examCodes: ["GATE_CSE"],
    outlook: "Stable. PSU GET intake ~2000-3000/year across major firms.",
    keywords: ["PSU engineer salary", "NTPC GET salary", "ONGC engineer career", "GATE PSU"],
  },

  {
    slug: "veterinary-doctor",
    name: "Veterinary Doctor",
    category: "medicine",
    dek: "BVSc + AH for animal medicine. Govt vet hospitals, dairy, pet practice, exports.",
    whatTheyDo: "Vets treat animals — livestock (cattle, sheep, poultry), companion (dogs/cats), wildlife. Govt vet officers run state dairy + animal husbandry schemes. Private clinical practice in metros growing.",
    dayToDay: ["Animal consultations + procedures", "Vaccination + breeding camps", "Livestock disease surveillance", "AI (artificial insemination) + reproductive work", "Owner/farmer communication"],
    entryRoutes: [
      { title: "Class 12 (PCB) → NEET UG → BVSc + AH (5.5 yr)", body: "Most direct. NEET UG cutoff lower than MBBS by significant margin.", links: [{ label: "NEET UG", href: "/exams/NEET_UG" }] },
    ],
    qualifications: ["BVSc + AH (5.5 years)", "VCI registration", "MVSc for research/specialisation"],
    skills: ["Animal anatomy + pharmacology", "Surgical skills", "Diagnostic imaging", "Owner communication + restraint techniques"],
    salaryBands: [
      { experience: "Govt fresh", band: "₹5 - ₹8 LPA" },
      { experience: "Private clinic (1-5 yr)", band: "₹3 - ₹8 LPA" },
      { experience: "Senior (10+ yr) + own clinic", band: "₹10 - ₹30 LPA+" },
    ],
    growthPath: "Vet Officer → Sr Vet → Deputy Director → Director Animal Husbandry",
    topEmployers: ["State Animal Husbandry departments", "ICAR institutes (IVRI, NDRI)", "Mother Dairy, Amul, Hatsun (dairy)", "Pet clinic chains (Cessna, FurryCare)"],
    pros: ["Less competitive than MBBS at NEET", "Clinical practice viable in metros", "Govt service offers stable rural posting"],
    cons: ["Pay below MBBS at similar tenure", "Rural postings tough", "Companion-animal market still emerging — geography limits"],
    related: ["doctor-mbbs", "agriculture-officer"],
    examCodes: ["NEET_UG"],
    outlook: "Strong in dairy + livestock; emerging in companion animal in metros.",
    keywords: ["veterinary doctor career", "BVSc salary india", "how to become vet"],
  },

  {
    slug: "nurse",
    name: "Nurse (Registered Nurse / BSc Nursing)",
    category: "medicine",
    dek: "BSc Nursing (4 yr) or GNM (3 yr) → hospitals, abroad opportunities strong.",
    whatTheyDo: "Nurses provide direct patient care — medication admin, vital monitoring, wound care, post-op recovery, ICU/OT support. Career split between hospital nursing, ICU specialisation, midwifery, geriatric, public health.",
    dayToDay: ["Patient rounds + vitals", "Medication administration", "Wound care + IV management", "Documentation + handover", "Family education"],
    entryRoutes: [
      { title: "Class 12 (PCB) → BSc Nursing (4 yr)", body: "Best route. AIIMS Nursing, CMC Vellore, JIPMER recruit via own exams. State BSc Nursing via state CET." },
      { title: "Class 10/12 → GNM (3 yr)", body: "Older diploma path. Direct from Class 10 in many states." },
      { title: "BSc Nursing → MSc Nursing / Nurse Practitioner", body: "Specialisation route." },
    ],
    qualifications: ["BSc Nursing or GNM", "Indian Nursing Council registration", "NCLEX-RN (for US), HAAD/Prometric (for Middle East)"],
    skills: ["Clinical skills (IV, injections, wound care)", "Patient + family communication", "ICU equipment proficiency", "Multilingual ability"],
    salaryBands: [
      { experience: "Fresh BSc Nursing (India)", band: "₹2.5 - ₹5 LPA", note: "Govt hospitals ₹3-5L; private ₹2.5-4L; top metros + AIIMS ₹4-5L." },
      { experience: "5 yr senior nurse", band: "₹4 - ₹8 LPA" },
      { experience: "Senior + abroad", band: "₹20 - ₹60 LPA", note: "UK NHS / US / Gulf — Indian nurses exported widely. UK NHS pays £25-40k/year." },
    ],
    growthPath: "Nurse → Senior Nurse → Charge Nurse → Nursing Supervisor → Director of Nursing",
    topEmployers: ["AIIMS + central govt", "Apollo, Fortis, Manipal (Indian private)", "NHS UK, US hospitals, Gulf hospitals (overseas)"],
    pros: ["Strong overseas demand — UK, US, Australia, Middle East", "Public-service core", "Job security in healthcare"],
    cons: ["India pay among lowest in healthcare", "Shift work + physical strain", "Patient + family stress real"],
    related: ["doctor-mbbs", "physiotherapist"],
    examCodes: ["NEET_UG"],
    outlook: "Strong. India + global nurse shortage. Indian nurses are the largest overseas-export healthcare workforce.",
    keywords: ["BSc nursing career", "nurse salary india", "nurse abroad UK NHS"],
  },

  {
    slug: "graphic-designer",
    name: "Graphic Designer",
    category: "design",
    dek: "Visual design — branding, packaging, ads, social media. Portfolio-led career.",
    whatTheyDo: "Graphic designers create visuals — logos, brochures, social-media creative, packaging, ads, marketing collateral. Work split between in-house design teams, ad agencies, freelance.",
    dayToDay: ["Concept ideation + sketches", "Software work (Illustrator, Photoshop, InDesign)", "Client + stakeholder reviews", "Production-ready file delivery"],
    entryRoutes: [
      { title: "Class 12 → BDes Graphics → Job", body: "NID, NIFT, Srishti are top." },
      { title: "Any bachelor's + portfolio + bootcamp → Job", body: "Common. Portfolio + skills matter more than degree in design." },
    ],
    qualifications: ["BDes (preferred)", "Portfolio (mandatory)"],
    skills: ["Adobe Suite (Illustrator, Photoshop, InDesign)", "Typography + colour theory", "Brand thinking", "Client + brief interpretation"],
    salaryBands: [
      { experience: "Fresher", band: "₹2 - ₹5 LPA" },
      { experience: "Senior (5+ yr)", band: "₹6 - ₹15 LPA" },
      { experience: "Senior agency / freelance veteran", band: "₹12 - ₹40 LPA" },
    ],
    growthPath: "Designer → Sr Designer → Art Director → Creative Director / Head of Design",
    pros: ["Creative satisfaction", "Freelance + remote viable", "Skills age well"],
    cons: ["Mid-tier oversupplied", "Agency hours brutal during pitches", "Pay below UX/product designers at similar tenure"],
    related: ["ux-designer", "illustrator", "animator"],
    examCodes: [],
    outlook: "Stable for skilled designers; mid-tier saturating with bootcamp grads.",
    keywords: ["graphic designer career", "graphic designer salary india", "BDes career"],
  },

  {
    slug: "content-writer",
    name: "Content Writer / Copywriter",
    category: "media-comms",
    dek: "Write for brands, agencies, publications, in-house marketing. Digital-skewed career.",
    whatTheyDo: "Content writers produce blogs, landing pages, ads, social copy, email campaigns, white-papers, SEO content. Career spans agencies, in-house marketing teams, and freelance.",
    dayToDay: ["Writing + revising drafts", "Research + interviewing SMEs", "SEO optimisation + keyword work", "Editor reviews + revisions", "Content calendar planning"],
    entryRoutes: [
      { title: "Any bachelor's + portfolio → Job", body: "No degree gate. Strong writing samples + niche specialisation (fintech, SaaS, healthcare) matter." },
      { title: "Mass Comm / English Lit → Job", body: "Adds credibility; not mandatory." },
    ],
    qualifications: ["Bachelor's (any)", "Portfolio (4-10 published pieces)"],
    skills: ["Clear, persuasive writing", "SEO basics + keyword research", "CMS + WordPress basics", "Subject-matter research speed", "AI tool literacy (LLMs are now part of the workflow)"],
    salaryBands: [
      { experience: "Fresher", band: "₹2 - ₹5 LPA" },
      { experience: "Senior (5+ yr)", band: "₹6 - ₹18 LPA", note: "Niche specialists in SaaS/fintech ₹15L+." },
      { experience: "Senior + freelance / consulting", band: "₹15 - ₹40 LPA" },
    ],
    growthPath: "Writer → Senior Writer → Content Lead → Head of Content → Content Strategist / Director Content",
    pros: ["Remote-first reality; foreign clients viable", "Skill compounds with niche specialisation", "Low entry barrier — talent over credentials"],
    cons: ["AI disruption real at entry tier — must specialise", "Mid-tier oversupplied", "Freelance income inconsistent"],
    related: ["journalist", "marketing-manager"],
    examCodes: [],
    outlook: "Bifurcating. Generalist content writing under AI pressure; specialised technical/B2B writing growing.",
    keywords: ["content writer salary india", "copywriter career", "freelance writer india"],
  },

  {
    slug: "marketing-manager",
    name: "Marketing / Brand Manager",
    category: "business-mgmt",
    dek: "Plan + execute marketing for products. Brand management at FMCG/tech, digital marketing at agencies.",
    whatTheyDo: "Marketing managers own brand or product marketing P&L — strategy, campaign planning, agency management, budget allocation, performance tracking. Splits across FMCG (P&G, HUL, ITC), tech (B2B + consumer), agencies, and startups.",
    dayToDay: ["Campaign briefs + agency review", "Performance + spend analytics", "Cross-functional with product/sales", "Market research + competitive analysis", "Budget + roadmap planning"],
    entryRoutes: [
      { title: "BTech/BCom → MBA Marketing → Brand Mgr", body: "Most common. FMCG hires from IIMs + MICA + XLRI campus.", links: [{ label: "CAT", href: "/exams/CAT" }] },
      { title: "Any bachelor's → Digital marketing → Performance Marketer", body: "Tactical entry; specialise in Meta/Google ads, SEO, growth." },
    ],
    qualifications: ["MBA (Marketing) — for brand mgmt", "Bachelor's + digital cert — for digital mktg"],
    skills: ["Consumer insight + research", "Campaign planning + brand strategy", "Digital marketing tools (Google Ads, Meta, GA)", "Analytics + ROI tracking", "Communication + agency mgmt"],
    salaryBands: [
      { experience: "MBA Fresher", band: "₹15 - ₹35 LPA", note: "FMCG brand-mgr ₹20-30L; tech ₹25-35L." },
      { experience: "Brand Mgr (2-5 yr)", band: "₹25 - ₹60 LPA" },
      { experience: "Sr Mgr (5-10 yr)", band: "₹40 LPA - ₹1 Cr" },
      { experience: "VP/CMO (10+ yr)", band: "₹1 - ₹3 Cr+" },
    ],
    growthPath: "Asst Brand Mgr → Brand Mgr → Sr Brand Mgr → Marketing Mgr → Marketing Director → CMO",
    topEmployers: ["HUL, P&G, ITC, Nestle, Coca-Cola (FMCG)", "Razorpay, Flipkart, Swiggy, CRED (consumer tech)", "Microsoft, Google, Amazon (B2B tech)", "Ogilvy, JWT, Wunderman Thompson (agencies)"],
    pros: ["Cross-functional + business-leadership track", "Exit to product, consulting, founding", "Strong senior comp"],
    cons: ["FMCG brand mgr requires top MBA", "Digital marketing tactical entry can plateau without strategic depth", "Agency hours intense"],
    related: ["product-manager", "management-consultant"],
    examCodes: ["CAT"],
    outlook: "Strong. India advertising market growing 10%+ annually.",
    keywords: ["brand manager career", "marketing manager salary india", "FMCG brand manager"],
  },

  {
    slug: "data-analyst",
    name: "Data Analyst",
    category: "engineering",
    dek: "Pull insights from data. SQL + Excel + dashboards. Entry point into analytics careers.",
    whatTheyDo: "Data analysts query databases, build dashboards, write reports for business users. Less ML-heavy than data scientist; more day-to-day operational analytics. Strong entry-tier career into DS, BI, product analytics.",
    dayToDay: ["SQL queries + data extraction", "Tableau/Power BI dashboard building", "Ad-hoc analysis for business teams", "Weekly/monthly reporting", "Stakeholder presentations"],
    entryRoutes: [
      { title: "Any bachelor's → Bootcamp/cert → Job", body: "Common. Coursera Google DA, Microsoft PL-300 certificates help." },
      { title: "BTech/BSc Stats → Job", body: "Direct entry via campus." },
    ],
    qualifications: ["Bachelor's (any quantitative)", "SQL + Excel + Tableau/Power BI"],
    skills: ["SQL (advanced)", "Excel (pivot tables, lookups, basic stats)", "Tableau/Power BI/Looker", "Communication + storytelling", "Basic stats"],
    salaryBands: [
      { experience: "Fresher", band: "₹3.5 - ₹8 LPA" },
      { experience: "Mid (3-5 yr)", band: "₹8 - ₹18 LPA" },
      { experience: "Senior (5-8 yr)", band: "₹15 - ₹30 LPA" },
    ],
    growthPath: "Data Analyst → Senior Analyst → Analytics Manager → Director Analytics. Or pivot to DS, BI, Product Analytics.",
    pros: ["Lower entry barrier than DS/SDE", "Skill compounds across industries", "Strong pivot opportunities"],
    cons: ["Mid-career plateau if no specialisation", "Reporting work can feel repetitive", "Below DS pay at similar tenure"],
    related: ["data-scientist", "business-analyst"],
    examCodes: [],
    outlook: "Strong. Every company collecting data needs analysts. Entry-level a great launch.",
    keywords: ["data analyst career", "data analyst salary india", "SQL analyst salary"],
  },

  {
    slug: "civil-services-prep",
    name: "Civil Services Aspirant (UPSC Prep)",
    category: "civil-services",
    dek: "Active prep for UPSC CSE. Multi-year commitment; honest about what works.",
    whatTheyDo: "Full-time UPSC aspirants prep 8-12 hours/day for 1-3 years. Daily mix: NCERT + standard books, current affairs, answer writing, optional subject. Most are between 22-28 years old.",
    dayToDay: ["NCERT + standard book reading", "Daily newspaper (The Hindu, IE)", "Answer-writing practice", "Mock test review", "Discussion + group study"],
    entryRoutes: [
      { title: "Bachelor's → UPSC Prep → CSE", body: "Most attempt CSE during/after college.", links: [{ label: "UPSC CSE", href: "/exams/UPSC_PRELIMS" }] },
    ],
    qualifications: ["Bachelor's (any)", "Age 21-32 (general)"],
    skills: ["General studies depth across history, polity, geography, economy, science", "Answer writing", "Test temperament", "Discipline + endurance"],
    salaryBands: [
      { experience: "Aspirant", band: "₹0 (parental support / fellowship)", note: "Some states offer prep stipend (Delhi Jamia residential, UP SC/ST prep stipend)." },
      { experience: "Post-CSE clearance → IAS", band: "See IAS career", note: "Sub-0.2% clear rate; most don't." },
    ],
    growthPath: "Prep → CSE clearance → IAS/IPS/IFS/IRS (see those careers)",
    pros: ["High-status outcome if cleared", "Foundational study builds lifetime depth"],
    cons: ["Multi-year opportunity cost", "Sub-0.2% clear rate brutal", "Failure recovery requires plan B (NET, govt job entrance, MBA)"],
    related: ["ias-officer", "ips-officer", "state-civil-services"],
    examCodes: ["UPSC_PRELIMS"],
    outlook: "Stable applicant pool (~12L applicants for ~1000 vacancies). Pre-aspirant decision should weigh plan B.",
    keywords: ["UPSC aspirant career", "civil services prep india", "UPSC dropout backup"],
  },

  {
    slug: "scientist",
    name: "Scientist (ISRO/DRDO/CSIR Labs)",
    category: "engineering",
    dek: "R&D at India's national labs — space, defence, materials, biotech. Entry via ISRO/DRDO recruitment exams.",
    whatTheyDo: "Scientists at ISRO, DRDO, BARC, CSIR labs work on long-horizon R&D — satellites, missiles, nuclear materials, biotech, drugs. Career split between bench scientists and project managers.",
    dayToDay: ["Lab + simulation work", "Project reviews", "Conference + publication writing", "Inter-lab collaborations", "Trainee mentorship"],
    entryRoutes: [
      { title: "BTech/MTech → ISRO ICRB / DRDO SET / BARC OCES → Scientist", body: "Direct entry post-graduation via own recruitment exams. Highly competitive." },
      { title: "MSc → CSIR-NET → CSIR labs", body: "Sciences route. Each CSIR lab has its own opening cycle." },
    ],
    qualifications: ["MTech / MSc / PhD", "ISRO ICRB / DRDO SET / BARC OCES / CSIR-NET"],
    skills: ["Domain depth (varies by lab)", "Research methodology + publication", "Project management"],
    salaryBands: [
      { experience: "Scientist B (entry)", band: "₹10 - ₹14 LPA", note: "Plus housing + R&D allowance." },
      { experience: "Scientist D-E (10-15 yr)", band: "₹20 - ₹30 LPA" },
      { experience: "Outstanding/Distinguished Scientist", band: "₹35 - ₹60 LPA" },
    ],
    growthPath: "Scientist B → C → D → E → F → G → Outstanding Scientist → Distinguished Scientist → Director",
    topEmployers: ["ISRO + space subsidiaries", "DRDO + 50+ labs", "BARC + DAE", "CSIR (CDRI, NCL, IMTECH, etc.)", "BARC, IIT Delhi research"],
    pros: ["Long-horizon meaningful research", "Strong stability + perks (residential campus, schools)", "Foreign sabbaticals + collaborations"],
    cons: ["Pay below private R&D after 5-7 years", "Hierarchical govt-research culture", "Long publication cycles"],
    related: ["college-professor", "phd-researcher", "psu-engineer"],
    examCodes: ["GATE_CSE"],
    outlook: "Strong in space + defence with rising budgets. CSIR labs growing.",
    keywords: ["ISRO scientist salary", "DRDO scientist career", "BARC scientist", "CSIR scientist"],
  },

  {
    slug: "actuary",
    name: "Actuary",
    category: "finance",
    dek: "Insurance + pension risk modelling. ASI/IFOA path; small profession, high pay.",
    whatTheyDo: "Actuaries calculate insurance + pension risk, set premiums, design products, advise on investments. ~5000 qualified actuaries in India.",
    dayToDay: ["Statistical modelling (mortality, morbidity tables)", "Premium calculation", "Reserving + solvency", "Product design + pricing reviews", "Regulatory reporting (IRDAI)"],
    entryRoutes: [
      { title: "Bachelor's (math/stats/eng/CS) → ACET → IAI / IFoA → Actuary", body: "ACET = entry-test for Institute of Actuaries of India. 15-paper qualification over 4-8 years." },
    ],
    qualifications: ["Fellow of IAI (15 papers)", "Or FIA from IFoA (UK)"],
    skills: ["Probability + statistics", "Financial mathematics", "Excel + R/Python", "Patience + structured prep"],
    salaryBands: [
      { experience: "Student (mid-prep, 0-3 yr)", band: "₹4 - ₹10 LPA" },
      { experience: "Associate (~10 papers)", band: "₹10 - ₹25 LPA" },
      { experience: "Fellow", band: "₹25 - ₹80 LPA" },
      { experience: "Chief Actuary", band: "₹80 LPA - ₹3 Cr+" },
    ],
    growthPath: "Student → Associate → Fellow → Senior Actuary → Chief Actuary / Appointed Actuary",
    topEmployers: ["LIC, SBI Life, HDFC Life, ICICI Pru (life insurance)", "ICICI Lombard, Bajaj Allianz, Tata AIG (general)", "Munich Re, Swiss Re (reinsurance)", "Deloitte, EY, KPMG actuarial consulting"],
    pros: ["Among highest-paid in finance for fellows", "Small profession = strong demand", "Specialised — hard to replicate"],
    cons: ["8-year qualification timeline", "Attempt + clear rate brutal", "Career stalls if you don't qualify"],
    related: ["chartered-accountant", "data-scientist"],
    examCodes: [],
    outlook: "Strong. India insurance penetration rising; actuary shortage acute.",
    keywords: ["actuary career india", "actuary salary india", "IAI exams"],
  },

  {
    slug: "merchant-navy-officer",
    name: "Merchant Navy Officer",
    category: "defence",
    dek: "Deck/engine officer on commercial ships. Tax-free salary; 6-month-on/6-month-off lifestyle.",
    whatTheyDo: "Deck officers navigate the ship; engine officers run propulsion + machinery. Career on tankers, container ships, bulk carriers. Sail 6-9 months, home 3-6 months. Most start as cadets at 18-19.",
    dayToDay: ["Watchkeeping (4 hours on, 8 off)", "Navigation + cargo operations (deck)", "Engine room + machinery oversight (engine)", "Safety drills + port operations", "Maintenance + admin"],
    entryRoutes: [
      { title: "Class 12 (PCM) → IMU CET → BSc Nautical / Marine Eng → Cadet → Officer", body: "Most direct. IMU CET national entrance; 4-year BSc Nautical or BTech Marine Eng." },
      { title: "BTech Mechanical/Electrical → GME (Graduate Marine Engineering) → Engine Officer", body: "Lateral entry for mech/electrical engineers." },
    ],
    qualifications: ["BSc Nautical or BTech Marine Engineering or GME", "STCW certification", "DG Shipping COC (after sea time)"],
    skills: ["Maritime navigation / marine engineering", "Discipline + isolation tolerance", "Multilingual crew management", "English fluency mandatory"],
    salaryBands: [
      { experience: "Cadet (during training)", band: "$200-500/month USD", note: "Tax-free if NRI status maintained." },
      { experience: "3rd Officer / 4th Engineer", band: "$2,500-$4,500/month (₹25-45L/yr equivalent)" },
      { experience: "Chief Officer / 2nd Engineer", band: "$6,000-$10,000/month (₹60L-1Cr/yr)" },
      { experience: "Captain / Chief Engineer", band: "$10,000-$18,000/month (₹1-2 Cr/yr)" },
    ],
    growthPath: "Cadet → 3rd Officer → 2nd Officer → Chief Officer → Captain. Engine: 4th Engr → 3rd → 2nd → Chief Engr.",
    pros: ["Tax-free income (NRI maintained)", "Fast salary growth — Captain by 30-35", "6 months home each year"],
    cons: ["6+ months at sea, isolated", "Family life strain", "Health/sleep disruption real over decades"],
    related: ["armed-forces-officer", "mechanical-engineer"],
    examCodes: [],
    outlook: "Stable. ~10k Indian officers hired yearly. Indian merchant marine is world's #2 supplier.",
    keywords: ["merchant navy career", "merchant navy salary india", "marine engineer salary", "IMU CET career"],
  },

  {
    slug: "physiotherapist",
    name: "Physiotherapist (BPT/MPT)",
    category: "medicine",
    dek: "Rehabilitation + injury recovery. Hospital, sports, home-visit, own practice routes.",
    whatTheyDo: "Physiotherapists treat patients recovering from injury, surgery, stroke, chronic pain. Work in hospitals, sports teams, rehab centres, home visits.",
    dayToDay: ["Patient assessments + treatment planning", "Exercise + manual therapy sessions", "Modalities (TENS, ultrasound, traction)", "Progress reviews", "Patient + caregiver education"],
    entryRoutes: [
      { title: "Class 12 (PCB) → BPT (4.5 yr inc. internship)", body: "Direct entry via state CET or college admissions." },
      { title: "BPT → MPT (sports/ortho/neuro)", body: "Specialisation; 2 years." },
    ],
    qualifications: ["BPT (Bachelor of Physiotherapy)", "MPT for specialisation"],
    skills: ["Anatomy + biomechanics", "Manual + exercise therapy techniques", "Patient communication + motivation", "Modality equipment use"],
    salaryBands: [
      { experience: "Fresher (BPT)", band: "₹2 - ₹4 LPA" },
      { experience: "5 yr", band: "₹4 - ₹10 LPA" },
      { experience: "Own clinic / sports team", band: "₹10 - ₹30 LPA", note: "Sports team physios + senior consultant own-clinic can hit ₹20L+." },
    ],
    growthPath: "Junior PT → Senior PT → Specialist (Sports/Ortho/Neuro) → Own Practice / Team Physio",
    pros: ["Strong demand — ageing population + sports market growing", "Home-visit + own-practice flexible", "Foreign opportunities (UK, US, NZ)"],
    cons: ["Pay below MBBS/BDS", "BPT oversupplied in some metros", "Physically demanding"],
    related: ["doctor-mbbs", "nurse"],
    examCodes: [],
    outlook: "Strong. Sports medicine + elder care growing.",
    keywords: ["physiotherapist career", "BPT salary india", "physio salary india"],
  },

  {
    slug: "judge-judicial-services",
    name: "Judge (Judicial Services)",
    category: "law",
    dek: "Civil Judge entry via state Judicial Services Exam. District + Sessions Court path.",
    whatTheyDo: "Civil Judges (entry level) hear civil cases at sub-district courts. Promotion to District Judge + Sessions Judge over 15-20 years. Eligibility post-LLB + Judicial Services Exam.",
    dayToDay: ["Hearing cases + recording evidence", "Pronouncing judgments + orders", "Court administration", "Reading case files + judgments", "Continuing legal education"],
    entryRoutes: [
      { title: "LLB → State Judicial Services Exam → Civil Judge", body: "Most direct. Each state runs own JS exam; typically post-LLB + 7-year practice for Higher Judiciary." },
    ],
    qualifications: ["LLB", "Indian citizen", "Age limits state-specific (typically 21-35)"],
    skills: ["Legal knowledge breadth", "Judgment writing", "Patience + temperament", "Local language fluency"],
    salaryBands: [
      { experience: "Civil Judge Jr (start)", band: "₹8 - ₹12 LPA", note: "7th CPC + state allowances. Plus official housing + transport." },
      { experience: "Civil Judge Sr", band: "₹12 - ₹18 LPA" },
      { experience: "District Judge", band: "₹18 - ₹30 LPA" },
      { experience: "High Court Judge (elevation)", band: "₹30 - ₹45 LPA", note: "HC Judge appointed at ~50; tenure to 62." },
    ],
    growthPath: "Civil Judge Jr → Civil Judge Sr → ADJ → District + Sessions Judge → HC Judge → SC Judge",
    pros: ["Highest professional status in legal career", "Stable + pensioned + protected", "Lifetime official residence + perks"],
    cons: ["Multi-year prep; success rate ~1-2%", "Postings transferable across districts", "Caseload heavy + emotionally demanding"],
    related: ["advocate-litigator", "civil-services"],
    examCodes: [],
    outlook: "Stable. Vacancies in many states; HC judge appointments depend on collegium.",
    keywords: ["judge career india", "judicial services exam", "civil judge salary"],
  },

  {
    slug: "architect",
    name: "Architect",
    category: "design",
    dek: "BArch + COA registration. Practice routes: firms, in-house, independent practice.",
    whatTheyDo: "Architects design buildings — residential, commercial, institutional, urban planning. Work spans design firms, in-house roles at developers, independent practice (most successful long-term).",
    dayToDay: ["Concept + schematic design", "Drafting (AutoCAD, Revit)", "Client + contractor meetings", "Site visits + supervision", "BOQ + tender documentation"],
    entryRoutes: [
      { title: "Class 12 (PCM) → NATA / JEE Main Paper II → BArch (5 yr)", body: "NATA or JEE Main Paper II for admission. SPA Delhi, CEPT Ahmedabad, IIT Roorkee, IIT Kharagpur are top." },
      { title: "BArch → MArch (Urban Design / Landscape)", body: "Specialisation." },
    ],
    qualifications: ["BArch (5 years)", "Council of Architecture registration"],
    skills: ["Design fundamentals + 3D modelling", "AutoCAD, Revit, SketchUp", "Building codes + bye-laws", "Client + project management"],
    salaryBands: [
      { experience: "Fresher", band: "₹2.5 - ₹6 LPA" },
      { experience: "5-10 yr", band: "₹6 - ₹15 LPA" },
      { experience: "Senior + own practice", band: "₹15 - ₹60 LPA+", note: "Boutique practice partners in metros earn ₹40L+; volume practice less." },
    ],
    growthPath: "Junior Arch → Architect → Senior Architect → Principal Architect / Own Firm",
    pros: ["Creative + functional satisfaction", "Own practice viable + scalable", "Real estate boom benefit"],
    cons: ["Long 5-year degree", "Pay below engineering for first 5 years", "Real estate cyclicality"],
    related: ["civil-engineer", "interior-designer", "urban-planner"],
    examCodes: [],
    outlook: "Strong with urbanisation + smart-city + housing. Specialisations (urban design, sustainability, heritage) high-value.",
    keywords: ["architect career", "BArch salary india", "architect salary"],
  },

  {
    slug: "iti-fitter",
    name: "ITI Fitter / Machinist",
    category: "skilled-trade",
    dek: "2-year ITI trade in mechanical fitting. Factory + workshop jobs.",
    whatTheyDo: "Fitters assemble + maintain mechanical components — bearings, gears, valves, pipework. Work in manufacturing units, railways, refineries, ship yards.",
    dayToDay: ["Component fitting + assembly", "Maintenance + breakdown repair", "Reading drawings + tolerance work", "Quality + safety checks"],
    entryRoutes: [
      { title: "Class 10 → ITI Fitter / Turner / Machinist (2 yr)", body: "Direct ITI; NCVT/SCVT cert on completion." },
      { title: "ITI → Apprenticeship → Permanent", body: "Apprenticeship at PSU / private converts to permanent." },
    ],
    qualifications: ["Class 10", "ITI Fitter (NCVT)", "Apprenticeship completion"],
    skills: ["Tool + machine operation (lathe, milling)", "Drawing interpretation + tolerance", "Measurement instruments (vernier, micrometer)", "Safety + PPE"],
    salaryBands: [
      { experience: "Apprentice", band: "₹1 - ₹2 LPA stipend" },
      { experience: "Permanent worker", band: "₹2.5 - ₹5 LPA" },
      { experience: "Skilled senior + supervisor", band: "₹4 - ₹10 LPA" },
    ],
    growthPath: "Apprentice → Operator → Senior Operator → Foreman / Supervisor",
    topEmployers: ["Railways, BHEL, SAIL, HAL (PSU)", "Maruti, Tata Motors, Mahindra (auto)", "L&T Heavy Engineering, EID Parry, ISGEC (heavy)"],
    pros: ["Short entry path", "Manufacturing renaissance + PLI driving demand", "PSU recruitment via apprenticeship route"],
    cons: ["Physical work + shift hours", "Pay ceiling lower than diploma/BTech", "Some plants in remote locations"],
    related: ["iti-electrician", "diploma-engineering"],
    examCodes: [],
    outlook: "Strong. Manufacturing demand growing 8%+ yearly with PLI schemes.",
    keywords: ["ITI fitter career", "ITI machinist career", "fitter salary india"],
  },

  {
    slug: "police-constable",
    name: "Police Constable",
    category: "defence",
    dek: "State/UT police recruitment via state police exams. Stable govt job + pension.",
    whatTheyDo: "Constables form the bulk of state police. Beat duty, traffic, station work, bandobast (events), VIP duties. Promotion to Head Constable, ASI, SI over career.",
    dayToDay: ["Beat + patrol", "Station duty (writing FIRs, court attendance)", "Traffic + crowd management", "Investigation support", "Drill + physical training"],
    entryRoutes: [
      { title: "Class 10/12 → State Police Constable exam → Training → Posting", body: "State-specific exams. UP Police, Delhi Police, Maharashtra Police etc. each run own.", links: [{ label: "UP Police Constable", href: "/exams/UP_POLICE_CONSTABLE" }, { label: "Delhi Police Constable", href: "/exams/DL_POLICE_PC" }] },
    ],
    qualifications: ["Class 10 or 12 (state-specific)", "Physical standards (height, chest, running)", "Age 18-25 typically"],
    skills: ["Physical fitness", "Local language + Hindi", "Discipline + obedience", "Basic computer literacy"],
    salaryBands: [
      { experience: "Constable (start)", band: "₹3.5 - ₹5.5 LPA", note: "Pay scale state-specific. ₹21,700-69,100 base + DA + HRA + risk allowance." },
      { experience: "Head Constable", band: "₹5 - ₹8 LPA" },
      { experience: "ASI / SI", band: "₹6 - ₹12 LPA" },
    ],
    growthPath: "Constable → Head Constable → ASI → SI (some states promote via internal exam)",
    pros: ["Strong job security + pension + lifetime medical", "Direct govt employment", "Promotion possible to SI within 10-15 years"],
    cons: ["Long hours + irregular postings", "Political pressure + corruption challenges", "Physical + emotional toll"],
    related: ["ips-officer", "armed-forces-officer"],
    examCodes: ["UP_POLICE_CONSTABLE", "DL_POLICE_PC", "BR_POLICE_PC", "RJ_POLICE_PC", "MH_POLICE_BHARTI", "TN_POLICE_PC", "KA_POLICE_PC", "AP_POLICE_PC"],
    outlook: "Stable. ~50k constable vacancies/year across states.",
    keywords: ["police constable salary india", "UP police constable career", "Delhi police constable"],
  },
];

export function findCareer(slug: string): Career | undefined {
  return CAREERS.find((c) => c.slug === slug);
}

export function careersByCategory(catSlug: string): Career[] {
  return CAREERS.filter((c) => c.category === catSlug);
}

export function careerCategoryLabel(catSlug: string): string {
  return CAREER_CATEGORIES.find((c) => c.slug === catSlug)?.label ?? catSlug;
}
