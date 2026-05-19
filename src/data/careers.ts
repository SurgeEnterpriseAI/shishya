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

  // ═══════════════════════════════════════════════════════════════════
  // EXPANSION BATCH — +60 careers to push catalogue to 100+
  // ═══════════════════════════════════════════════════════════════════

  // ─── Engineering & Tech (+12) ──────────────────────────────────────
  { slug: "ml-engineer", name: "ML / AI Engineer", category: "engineering", dek: "Build + deploy ML systems in production. Highest paying frontier-tech role in 2026.", whatTheyDo: "ML engineers operationalise machine learning — build training pipelines, serve models at scale, optimise inference cost. Bridge between data scientists (model design) + software engineers (production systems).", dayToDay: ["Build ML pipelines (Airflow, Kubeflow)", "Train + finetune models (PyTorch, JAX, HuggingFace)", "Deploy + serve models (NVIDIA Triton, Ray, vLLM)", "Optimise inference cost + latency", "Collaborate with DS on metric design"], entryRoutes: [{ title: "CS UG → MS ML/AI → Job", body: "Top route. CMU/Stanford/IIT-M/IIIT-H." }, { title: "SDE → Internal pivot to MLE", body: "Strong devs at FAANG-tier pivot internally." }], qualifications: ["BTech/MTech CS or ECE", "MS ML/AI preferred", "Strong systems engineering background"], skills: ["PyTorch, TensorFlow, JAX", "Distributed training (multi-GPU + multi-node)", "MLOps tools (MLflow, Weights+Biases)", "Systems + low-latency optimization", "Strong CS fundamentals"], salaryBands: [{ experience: "Fresher", band: "₹15 - ₹40 LPA", note: "Top product cos ₹30-40L; mid-tier ₹15-20L." }, { experience: "2-5 yr", band: "₹30 - ₹80 LPA" }, { experience: "Senior + Staff MLE", band: "₹80 LPA - ₹3 Cr+", note: "AI labs at OpenAI/Anthropic/Google DeepMind ₹3 Cr+." }], growthPath: "MLE → Senior MLE → Staff MLE → Principal AI Engineer / MLE Lead → Director AI", topEmployers: ["Google DeepMind India", "Microsoft Research", "Amazon AI", "Razorpay, PhonePe, Swiggy (Indian product AI)", "Sarvam, Krutrim, Yotta (Indian AI labs)"], pros: ["Highest-pay frontier tech role 2026+", "Field still expanding fast", "Foreign-payroll roles available"], cons: ["Field changes every 6 months — perpetual learning", "Strong math + CS prerequisites", "Compensation compressing slightly as supply grows"], related: ["data-scientist", "software-engineer"], examCodes: ["JEE_MAIN", "GATE_CSE"], outlook: "Strong. AI compute + model deployment demand growing 40%+ yearly.", keywords: ["ML engineer salary india", "AI engineer career", "MLE career"] },
  { slug: "devops-engineer", name: "DevOps / Site Reliability Engineer", category: "engineering", dek: "Keep production systems running. Cloud infra + CI/CD + monitoring + incident response.", whatTheyDo: "DevOps/SRE keeps systems reliable. Builds CI/CD pipelines, manages cloud infra (AWS/GCP/Azure), monitors + alerts, handles incidents, deploys + scales applications.", dayToDay: ["Maintain + tune CI/CD pipelines (Jenkins, GitHub Actions, ArgoCD)", "Cloud infra (AWS/GCP/Azure) via Terraform", "Kubernetes cluster management", "On-call rotation + incident response", "Cost optimisation"], entryRoutes: [{ title: "BTech CS/IT → DevOps role", body: "Some companies hire freshers; most prefer 1-2 year SDE → DevOps pivot." }], qualifications: ["BTech CS/IT (preferred)", "AWS / GCP / Azure certifications strong signal"], skills: ["Linux + scripting (Bash, Python, Go)", "AWS/GCP/Azure proficiency", "Kubernetes + Docker", "Terraform + Ansible", "Observability (Prometheus, Grafana, ELK)"], salaryBands: [{ experience: "Fresher", band: "₹4 - ₹10 LPA" }, { experience: "3-6 yr", band: "₹15 - ₹35 LPA" }, { experience: "Senior + Lead", band: "₹35 - ₹80 LPA" }], growthPath: "DevOps Engr → Sr DevOps → Lead → SRE Manager → Director Platform Engineering", pros: ["Stable, durable career", "On-call pays well at senior levels", "Cross-industry portable skill set"], cons: ["On-call burnout real", "Promotion path narrower than SDE", "Tools change frequently"], related: ["software-engineer", "ml-engineer"], examCodes: ["JEE_MAIN"], outlook: "Strong. Cloud adoption + Kubernetes proliferation expanding demand.", keywords: ["DevOps engineer career", "SRE salary india", "site reliability"] },
  { slug: "cybersecurity-analyst", name: "Cybersecurity Analyst / Engineer", category: "engineering", dek: "Defend systems against attacks. SOC analyst, penetration tester, security engineer paths.", whatTheyDo: "Security engineers identify + close vulnerabilities, monitor for attacks, respond to incidents. Specialisations: SOC analyst, penetration tester, application security, cloud security, identity + access.", dayToDay: ["Vulnerability scanning + reporting", "Penetration testing (ethical hacking)", "SOC alert triage + incident response", "Security policy + compliance audits", "Architecture security reviews"], entryRoutes: [{ title: "BTech CS → Cybersecurity cert + lab work → Job", body: "Common: OSCP/CEH/CompTIA Security+ certs + practical lab work via TryHackMe/HackTheBox." }, { title: "MS Cybersecurity (US/UK) → Specialist role", body: "Carnegie Mellon INI, Georgia Tech, NYU are top." }], qualifications: ["BTech CS / IT", "OSCP / CEH / CompTIA Security+ certs", "MS Cybersecurity for senior roles"], skills: ["Network + system fundamentals", "Linux + scripting (Python, Bash)", "Tools: Burp Suite, Metasploit, Wireshark, Nmap", "Cloud security (AWS / Azure)", "Communication for incident reporting"], salaryBands: [{ experience: "Fresher SOC", band: "₹3 - ₹7 LPA" }, { experience: "2-5 yr", band: "₹8 - ₹25 LPA" }, { experience: "Senior + Lead", band: "₹25 - ₹60 LPA" }, { experience: "CISO + Head of Security", band: "₹60 LPA - ₹2 Cr" }], growthPath: "SOC Analyst → Sr Analyst → Lead → Security Architect / CISO", topEmployers: ["KPMG, Deloitte, PwC (consulting)", "Razorpay, Flipkart, Zomato (in-house)", "Cisco, Palo Alto, CrowdStrike (vendors)", "Govt — CERT-In, NCIIPC, NTRO"], pros: ["High demand growing 30%+ yearly", "Foreign-market remote work common", "Senior CISO comp substantial"], cons: ["On-call + incident stress", "Specialisations niche; broad generalist plateaus", "Certification + continuous learning costly"], related: ["software-engineer", "devops-engineer"], examCodes: ["JEE_MAIN", "GATE_CSE"], outlook: "Strong demand + growing govt + private investment in security. Skills shortage acute.", keywords: ["cybersecurity career india", "ethical hacker salary", "SOC analyst", "penetration tester"] },
  { slug: "blockchain-engineer", name: "Blockchain / Web3 Engineer", category: "engineering", dek: "Build crypto + decentralised applications. Niche but well-compensated.", whatTheyDo: "Blockchain engineers build smart contracts, dApps, crypto wallets, layer-2 protocols. Day-to-day mixes Solidity/Rust + traditional web stack.", dayToDay: ["Solidity / Rust smart contract development", "Frontend dApp development (React + ethers/web3.js)", "Security audits + reentrancy review", "Protocol design", "Token economics + governance"], entryRoutes: [{ title: "Software engineering → Web3 transition", body: "Most blockchain engineers started as web devs + learned smart contracts via tutorials/bootcamps (Buildspace, LearnWeb3)." }], qualifications: ["BTech CS preferred", "Strong portfolio of smart-contract projects"], skills: ["Solidity (EVM chains) or Rust (Solana, Polkadot)", "Web3 frontend frameworks", "Cryptography basics", "Game theory + token economics"], salaryBands: [{ experience: "Fresher", band: "₹6 - ₹25 LPA" }, { experience: "2-5 yr", band: "₹20 - ₹60 LPA" }, { experience: "Senior (₹+ foreign payroll)", band: "₹50 LPA - ₹2 Cr+" }], growthPath: "Engineer → Senior → Protocol Lead → Founder/Tech Lead", topEmployers: ["Polygon, CoinDCX, CoinSwitch (India)", "Coinbase, Binance India operations", "Crypto-native startups + DAOs (often foreign payroll)"], pros: ["Foreign payroll + remote common", "Niche specialisation pays well", "Industry-defining work for early careers"], cons: ["Crypto cycles cause hiring freezes (2022-23 layoffs)", "Regulatory uncertainty (India crypto tax)", "Smart-contract bugs have catastrophic consequences"], related: ["software-engineer", "ml-engineer"], examCodes: ["JEE_MAIN"], outlook: "Cyclical but durable for top talent. Regulatory clarity in India still emerging.", keywords: ["blockchain engineer india", "web3 career", "solidity developer salary"] },
  { slug: "aerospace-engineer", name: "Aerospace Engineer", category: "engineering", dek: "Design + build aircraft, spacecraft, satellites. ISRO + private space-tech + civil aviation.", whatTheyDo: "Aerospace engineers design aircraft + spacecraft structures, propulsion systems, avionics, control systems. Work at ISRO, HAL, DRDO, Boeing/Airbus India, or private space-tech.", dayToDay: ["CAD + simulation (CATIA, ANSYS, MATLAB)", "Wind tunnel + structural testing", "Flight test campaigns", "Mission planning (space)", "Cross-functional design reviews"], entryRoutes: [{ title: "JEE → IIT Aerospace BTech → Job", body: "IIT-B, IIT-K, IIT-Madras are top." }, { title: "BTech Mech → MS/MTech Aero", body: "Specialisation via PG." }], qualifications: ["BTech Aerospace / Mechanical", "MTech / MS for R&D"], skills: ["Aerodynamics + propulsion", "CAD/CAE/CFD", "MATLAB + Simulink", "Flight dynamics"], salaryBands: [{ experience: "Fresh", band: "₹4 - ₹10 LPA" }, { experience: "5-10 yr", band: "₹10 - ₹25 LPA" }, { experience: "Senior + tech leadership", band: "₹25 - ₹60 LPA" }], growthPath: "Engineer → Sr Engineer → Project Lead → Mission Director", topEmployers: ["ISRO, DRDO, HAL, NAL (PSU)", "Boeing India, Airbus India (MNC)", "Skyroot, Agnikul, Pixxel (private space)", "Bombardier, GE Aviation (foreign)"], pros: ["Indian space-tech boom creating opportunities", "Public-sector stability + R&D depth", "Foreign mobility (US/EU/UK)"], cons: ["Pay below CS/IT at similar tenure", "Limited Indian private aviation R&D", "Long project cycles"], related: ["mechanical-engineer", "scientist"], examCodes: ["JEE_MAIN", "JEE_ADVANCED"], outlook: "Strong + growing. PLI for drones + space + aviation creating fresh demand.", keywords: ["aerospace engineer career", "ISRO scientist", "aerospace salary india"] },
  { slug: "electronics-engineer", name: "Electronics Engineer", category: "engineering", dek: "VLSI chips, embedded systems, PCB design, RF + comm. Manufacturing-renaissance driven.", whatTheyDo: "Electronics engineers design + test electronic systems — VLSI chips, embedded controllers, PCBs, RF + wireless. Indian PLI for semiconductors creating fresh demand at chip-design + manufacturing companies.", dayToDay: ["Circuit design + simulation (SPICE, Cadence)", "VLSI flow (synthesis, place + route)", "PCB layout + testing", "Embedded firmware (C, Embedded Linux)", "Hardware-software integration debugging"], entryRoutes: [{ title: "JEE → BTech ECE → Job", body: "NIT/IIIT for VLSI + chip-design + embedded roles." }], qualifications: ["BTech ECE / EEE", "MTech / MS for VLSI specialisation"], skills: ["VLSI EDA tools (Cadence, Synopsys, Mentor)", "Verilog / VHDL / SystemVerilog", "Embedded C, RTOS", "PCB design (Altium, KiCad)", "Communication systems"], salaryBands: [{ experience: "Fresh", band: "₹3.5 - ₹10 LPA" }, { experience: "5 yr", band: "₹8 - ₹25 LPA" }, { experience: "Senior + Lead", band: "₹25 - ₹60 LPA" }], growthPath: "Engr → Sr Engr → Lead → Engineering Manager → VP Engineering", topEmployers: ["Intel India, Qualcomm, Texas Instruments, NVIDIA India", "Mediatek, Marvell, AMD India", "Tata Electronics + Vedanta semiconductor", "ISRO + DRDO for govt R&D"], pros: ["PLI semiconductors + space-tech driving demand", "VLSI niche pays well", "Strong global mobility"], cons: ["Tier-3 ECE has high underemployment risk", "Chip-design cycles long (2-3 years per project)", "Field shifts with technology nodes"], related: ["software-engineer", "psu-engineer"], examCodes: ["JEE_MAIN", "GATE_CSE"], outlook: "Strong with PLI semiconductor manufacturing + Tata/Vedanta fabs.", keywords: ["VLSI engineer salary", "embedded engineer career", "electronics engineer india"] },
  { slug: "biotech-engineer", name: "Biotechnology Engineer / Scientist", category: "engineering", dek: "R&D in pharma, agri-biotech, vaccines, gene editing. India's emerging biopharma sector.", whatTheyDo: "Biotech engineers work in pharmaceutical R&D, agri-biotech, vaccine manufacturing, diagnostics. Roles span lab research, process development, regulatory, quality.", dayToDay: ["Lab experiments + assays", "Cell culture + bioreactor work", "Data analysis + reporting", "Regulatory documentation", "Cross-functional with chemistry + microbiology"], entryRoutes: [{ title: "BTech Biotech / BSc Bio → MSc / Job", body: "Tier-1 institutions: IIT-B Bioengineering, IIT-D Biochem, IISc." }, { title: "MSc → PhD → Senior R&D", body: "Long-horizon research path." }], qualifications: ["BTech Biotech / BSc Biology + MSc", "PhD for senior R&D"], skills: ["Cell + molecular biology", "Bioprocess engineering", "Quality systems + GMP", "Data analysis"], salaryBands: [{ experience: "Fresh", band: "₹3 - ₹6 LPA" }, { experience: "5-10 yr", band: "₹8 - ₹18 LPA" }, { experience: "Senior R&D + lead", band: "₹18 - ₹40 LPA" }], growthPath: "Research Associate → Scientist → Sr Scientist → Group Leader → Head of R&D", topEmployers: ["Bharat Biotech, Serum Institute, Cipla, Dr Reddy's, Sun Pharma", "Biocon, Syngene", "ICMR + ICAR institutes", "Foreign: GSK, Pfizer, Novartis India"], pros: ["Vaccine + biopharma boom in India", "Public-health impact direct", "Indian biotech IP rising"], cons: ["Entry pay below other engineering branches", "Lab work demands patience over decades", "Career hits ceiling without PhD"], related: ["pharmacist", "scientist", "doctor-mbbs"], examCodes: ["JEE_MAIN", "NEET_UG"], outlook: "Strong long-term. India's biopharma sector growing 12%+ yearly.", keywords: ["biotech engineer career", "biotechnology salary india", "pharma R&D career"] },
  { slug: "robotics-engineer", name: "Robotics Engineer", category: "engineering", dek: "Build robots — industrial automation, autonomous vehicles, drones, surgical robots.", whatTheyDo: "Robotics engineers design + build autonomous systems combining mechanical, electrical, and software engineering. Indian robotics market growing with Industry 4.0 + drone PLI.", dayToDay: ["CAD design + mechanism iteration", "Control system design (PID, MPC)", "ROS / ROS2 implementation", "Computer vision + sensor fusion", "Field testing + iteration"], entryRoutes: [{ title: "BTech Mech / EE / CS → MS Robotics", body: "CMU, GA Tech, IIT-B IDC, IISc are top." }], qualifications: ["BTech Mech / EE / CS", "MS / MTech Robotics for senior roles"], skills: ["ROS, ROS2", "Computer vision (OpenCV, PyTorch)", "Control systems", "Mechatronics + CAD", "C++ + Python"], salaryBands: [{ experience: "Fresh", band: "₹5 - ₹15 LPA" }, { experience: "5 yr", band: "₹12 - ₹30 LPA" }, { experience: "Senior", band: "₹30 - ₹70 LPA" }], growthPath: "Engineer → Senior → Lead → Director Robotics / CTO", topEmployers: ["GreyOrange, Asimov, Genrobotics, Botlab (Indian robotics)", "Boston Dynamics, ABB, Fanuc India", "ISRO + DRDO autonomous systems"], pros: ["Frontier tech with global parity", "Cross-disciplinary skill stack is valuable", "Strong startup ecosystem"], cons: ["India industry still small vs US/EU", "Hardware iteration is expensive + slow", "Limited senior roles compared to pure software"], related: ["ml-engineer", "mechanical-engineer", "electronics-engineer"], examCodes: ["JEE_MAIN", "JEE_ADVANCED", "GATE_CSE"], outlook: "Strong global; emerging India. Drone + autonomous vehicle PLI creating opportunities.", keywords: ["robotics engineer career", "robotics salary india", "drone engineer"] },
  { slug: "automotive-engineer", name: "Automotive Engineer (EV + ICE)", category: "engineering", dek: "Design + build cars + 2-wheelers. India's auto market is world's 3rd largest; EV transition accelerating.", whatTheyDo: "Automotive engineers work on vehicle design, powertrain (engine + battery), chassis, body, electronics. EV transition creating new battery + motor + power electronics specialisations.", dayToDay: ["CAD + simulation (CATIA, ANSYS, AVL)", "Powertrain calibration + testing", "EV battery + motor design", "Vehicle dynamics + crash testing", "Supplier coordination"], entryRoutes: [{ title: "BTech Mech / EE → Auto company", body: "Maruti, Tata, Mahindra, Bajaj recruit from BTech Mech + EE." }, { title: "MS Automotive in US/EU", body: "For senior + R&D roles." }], qualifications: ["BTech Mechanical / Electrical / Automotive", "MTech Automotive for specialisations"], skills: ["Engine + powertrain design", "EV systems (battery management, motor control)", "CAD + CAE", "Vehicle dynamics"], salaryBands: [{ experience: "Fresh", band: "₹4 - ₹10 LPA" }, { experience: "5-10 yr", band: "₹10 - ₹25 LPA" }, { experience: "Senior", band: "₹25 - ₹60 LPA" }], growthPath: "Engineer → Sr Engineer → Manager → Head of R&D / Plant Director", topEmployers: ["Maruti, Tata Motors, Mahindra, Bajaj, TVS, Hero", "Hyundai, Kia, Honda India", "Ola Electric, Ather, Ampere (EV startups)", "Bosch, Continental, ZF (suppliers)"], pros: ["India auto market 3rd largest globally", "EV transition opening new specialisations", "Strong stability in big-name OEMs"], cons: ["Pay below CS at similar tenure", "Industry cyclical with vehicle sales", "Plant postings can be remote"], related: ["mechanical-engineer", "electronics-engineer"], examCodes: ["JEE_MAIN", "GATE_CSE"], outlook: "Strong. EV transition + PLI for autos creating ~10% YoY engineering demand growth.", keywords: ["automotive engineer career", "EV engineer salary india", "automobile engineering"] },
  { slug: "chemical-engineer", name: "Chemical Engineer", category: "engineering", dek: "Process design at refineries, petrochemicals, pharma, food processing, FMCG.", whatTheyDo: "Chemical engineers design + operate processes for chemical + material transformation. Career split: refining + petrochem (Reliance, IOCL), pharma manufacturing, FMCG operations (HUL/P&G/ITC).", dayToDay: ["Process design + simulation (Aspen HYSYS)", "Plant operations + troubleshooting", "Quality + safety (HAZOP)", "Cost optimisation", "Cross-functional with maintenance + supply chain"], entryRoutes: [{ title: "JEE → BTech Chem → Job", body: "IIT-B, IIT-Madras, BITS, NIT-Trichy are top." }, { title: "BTech Chem → MBA / MS in US", body: "Half the cohort transitions to consulting / FMCG management." }], qualifications: ["BTech Chemical Engineering", "MS / MTech for R&D specialisation"], skills: ["Process design + thermodynamics", "Aspen HYSYS, MATLAB", "Heat + mass transfer", "Safety standards (HAZOP, LOPA)"], salaryBands: [{ experience: "Fresh", band: "₹4 - ₹12 LPA" }, { experience: "5-10 yr", band: "₹10 - ₹25 LPA" }, { experience: "Senior", band: "₹25 - ₹60 LPA" }], growthPath: "Engineer → Sr Engineer → Plant Manager → COO Operations / Head Engineering", topEmployers: ["Reliance Industries, ONGC, IOCL, BPCL, HPCL, GAIL", "Sun Pharma, Cipla, Dr Reddy's", "P&G, HUL, ITC, Nestlé (FMCG operations)"], pros: ["PSU stability + perks", "Multi-industry career options", "FMCG transition opens management track"], cons: ["Pay below CS/CSE", "Plant postings often remote", "Industry cyclical with oil prices"], related: ["mechanical-engineer", "biotech-engineer"], examCodes: ["JEE_MAIN", "GATE_CSE"], outlook: "Stable. Energy + petrochem + specialty chemicals expansion driving demand.", keywords: ["chemical engineer career", "chemical engineering salary india", "BTech chemical scope"] },
  { slug: "environmental-engineer", name: "Environmental + Climate Engineer", category: "engineering", dek: "Design solutions for pollution, water, waste, climate mitigation. Emerging high-impact field.", whatTheyDo: "Environmental engineers tackle water + air pollution, waste treatment, climate mitigation, EIA assessments. Work in consulting, govt agencies (CPCB, state PCBs), corporates' ESG/sustainability teams, climate-tech startups.", dayToDay: ["EIA studies + reports", "Water + air quality monitoring + analysis", "Waste treatment + recycling system design", "Sustainability reporting (GRI, BRSR)", "Field site visits"], entryRoutes: [{ title: "BTech Civil / Environmental / Chem → Job", body: "IIT/NIT Civil + Environmental specialisations preferred." }, { title: "MS Environmental Engg abroad", body: "US/UK/Australia have stronger environmental engineering programmes." }], qualifications: ["BTech Civil / Environmental / Chemical", "MTech / MS for specialist roles"], skills: ["Environmental modelling (water, air)", "GIS + remote sensing basics", "Indian environment laws (Air Act, Water Act, EIA)", "Sustainability reporting frameworks"], salaryBands: [{ experience: "Fresh", band: "₹3 - ₹7 LPA" }, { experience: "5-10 yr", band: "₹8 - ₹20 LPA" }, { experience: "Senior consultant", band: "₹20 - ₹50 LPA" }], growthPath: "Engineer → Sr Engineer → Project Manager → Director Sustainability", topEmployers: ["AECOM, ERM, WSP, Ramboll (consulting)", "Tata Sustainability, Mahindra ESG", "CPCB + state Pollution Control Boards", "Climate-tech startups (Geneabs, Carbon Mapper)"], pros: ["Mission-driven work + visible impact", "Sustainability + ESG growing demand", "Foreign opportunities strong"], cons: ["Pay below conventional engineering", "Career path narrower in India private sector", "Govt role bureaucracy"], related: ["civil-engineer", "chemical-engineer"], examCodes: ["JEE_MAIN", "GATE_CSE"], outlook: "Growing strong. India climate-tech + ESG markets expanding 25%+ yearly.", keywords: ["environmental engineer career", "climate engineer india", "sustainability career"] },
  { slug: "petroleum-engineer", name: "Petroleum Engineer", category: "engineering", dek: "Oil + gas exploration + production. ONGC + Reliance + foreign opportunities (Gulf + Africa).", whatTheyDo: "Petroleum engineers design + manage oil + gas extraction. Specialisations: reservoir, drilling, production, completion. Work at ONGC, Reliance, OIL, Cairn + foreign service companies (Schlumberger, Halliburton).", dayToDay: ["Reservoir simulation (Eclipse, CMG)", "Drilling operations supervision (offshore + onshore)", "Production optimisation", "Well testing + analysis", "HSE + safety compliance"], entryRoutes: [{ title: "JEE → BTech Petroleum (PDEU, ISM Dhanbad)", body: "Specialised programmes; smaller cohort, higher placement quality." }], qualifications: ["BTech Petroleum / Chemical Engineering", "MS Petroleum for R&D + reservoir specialisation"], skills: ["Reservoir engineering", "Drilling fluid + well-completion design", "Petroleum geology basics", "HSE protocols"], salaryBands: [{ experience: "Fresh", band: "₹6 - ₹15 LPA", note: "PSUs (ONGC, IOCL) ₹10-15L; private (Reliance, Cairn) ₹8-15L." }, { experience: "5-10 yr", band: "₹15 - ₹40 LPA" }, { experience: "Senior + Foreign", band: "₹40 LPA - ₹1.5 Cr+", note: "Offshore + Middle East rates substantial." }], growthPath: "Engineer → Sr Engineer → Operations Manager → Asset Manager → Head E&P", topEmployers: ["ONGC, Oil India, Cairn (India)", "Reliance, Vedanta", "Schlumberger, Halliburton, Baker Hughes (services)", "Saudi Aramco + ADNOC (foreign)"], pros: ["High pay for niche specialisation", "Foreign mobility (Middle East, Africa) strong", "PSU stability"], cons: ["Industry transition to renewables long-term threat", "Offshore postings demanding", "Specialisation narrow"], related: ["chemical-engineer", "psu-engineer"], examCodes: ["JEE_MAIN"], outlook: "Stable mid-term; transition pressure long-term. Specialist roles continue paying well.", keywords: ["petroleum engineer career", "ONGC engineer salary", "oil gas engineer india"] },
  { slug: "ux-researcher", name: "UX Researcher", category: "design", dek: "Conduct user research that informs product decisions. Specialist within design teams.", whatTheyDo: "UX researchers do interviews, usability tests, surveys, ethnography, diary studies. Translate raw observations into design + product decisions. Often part of design teams; senior UXRs work cross-functionally with PMs + engineering.", dayToDay: ["Plan + conduct user interviews (5-12/week typical)", "Design + analyse surveys", "Run usability tests on prototypes", "Synthesise findings into shareable artifacts (personas, journey maps)", "Present insights to product + leadership"], entryRoutes: [{ title: "BDes / MA Psych → UX Research", body: "Strongest backgrounds: HCI Master's, design schools, psychology PG." }], qualifications: ["Bachelor's (any) + UX cert / MA / MS HCI"], skills: ["Qualitative research methods", "Statistical literacy", "Interview + facilitation skills", "Tools: dscout, UserTesting, Lookback, Maze", "Synthesis + storytelling"], salaryBands: [{ experience: "Fresh", band: "₹5 - ₹15 LPA" }, { experience: "5-10 yr", band: "₹15 - ₹40 LPA" }, { experience: "Senior + Principal", band: "₹40 LPA - ₹1.2 Cr" }], growthPath: "Researcher → Sr Researcher → Lead Researcher → Principal UXR / Head of Research", topEmployers: ["Microsoft, Google, Atlassian (product MNCs)", "Razorpay, CRED, Swiggy, Flipkart (Indian product)", "Lollypop, Inkredible (design consultancies)"], pros: ["Specialist niche with senior paths", "Cross-functional + influential", "Foreign-remote work viable"], cons: ["Fresher market thin; harder entry than UX designer", "Research can feel slower than design IC work", "Hard-to-quantify impact at performance reviews"], related: ["ux-designer", "product-manager"], examCodes: [], outlook: "Strong. Indian product cos increasingly investing in research specialists.", keywords: ["UX researcher salary india", "UX research career", "user research"] },

  // ─── Medicine & Healthcare (+4) ────────────────────────────────────
  { slug: "psychologist", name: "Psychologist + Counsellor", category: "medicine", dek: "Clinical, counselling, school, organisational psychology. Mental health awareness driving demand.", whatTheyDo: "Psychologists assess + treat mental health issues. Specialisations: clinical (mental health), counselling (therapy), school (children), industrial-organisational (workplace), forensic.", dayToDay: ["Client sessions (5-8/day typical)", "Psychological assessments + tests", "Treatment plan documentation", "Group therapy / workshops", "Continuing education"], entryRoutes: [{ title: "BA Psych → MA Psych → MPhil Clinical", body: "MPhil Clinical Psychology gives RCI license for clinical practice." }, { title: "MA Psych → Counselling certifications", body: "Counselling track doesn't need MPhil but needs cert (REBT, CBT)." }], qualifications: ["BA Psych + MA Psych", "MPhil Clinical Psychology (RCI licensed)", "Counselling certifications (CBT, REBT, IPT)"], skills: ["Active listening + empathy", "Diagnostic + assessment tools", "Therapeutic techniques", "Documentation + ethics", "Self-care + boundaries"], salaryBands: [{ experience: "Fresh", band: "₹2 - ₹5 LPA" }, { experience: "5 yr", band: "₹5 - ₹12 LPA" }, { experience: "Senior + own practice", band: "₹10 - ₹40 LPA" }], growthPath: "Counsellor → Senior Counsellor → Lead Therapist → Own Practice", topEmployers: ["Hospitals (Fortis, Apollo, NIMHANS)", "Schools + universities", "Corporate EAP (YourDOST, BetterHelp India)", "NGOs + govt mental-health programmes"], pros: ["Growing demand + reduced stigma", "Own-practice path viable + scalable", "Cross-industry employability"], cons: ["Pay below MBBS at similar tenure", "Emotional labour real", "Specialisations matter for senior pay"], related: ["doctor-mbbs", "school-teacher"], examCodes: [], outlook: "Strong + growing. Mental-health awareness + corporate wellness driving demand.", keywords: ["psychologist career india", "clinical psychologist salary", "counsellor career"] },
  { slug: "nutritionist-dietitian", name: "Nutritionist / Dietitian", category: "medicine", dek: "Clinical, sports, corporate, public-health nutrition. Hospitals, wellness apps, own practice.", whatTheyDo: "Dietitians assess + design diets for medical conditions, sports performance, weight management. Work in hospitals, sports teams, corporate wellness, apps (HealthifyMe), own practice.", dayToDay: ["Client consultations + diet planning", "Body composition + assessments", "Follow-ups + progress tracking", "Workshops + content creation", "Cross-functional with doctors"], entryRoutes: [{ title: "BSc Food + Nutrition → MSc → RD cert", body: "Indian Dietetic Association registers RDs after MSc + internship." }], qualifications: ["BSc Food + Nutrition / Home Science", "MSc Dietetics + Nutrition", "RD (Registered Dietitian) cert"], skills: ["Medical nutrition therapy", "Sports nutrition", "Behavioural change techniques", "Public + community nutrition"], salaryBands: [{ experience: "Fresh", band: "₹2.5 - ₹5 LPA" }, { experience: "5 yr", band: "₹5 - ₹12 LPA" }, { experience: "Own practice + content", band: "₹10 - ₹30 LPA" }], growthPath: "Junior Dietitian → Senior → Chief Dietitian / Own Practice / Brand Partner", topEmployers: ["Hospitals (AIIMS, Apollo, Fortis)", "HealthifyMe, Cure.fit (apps)", "Corporate wellness programmes", "Sports teams + olympic-level athletes"], pros: ["Wellness boom creating private + freelance opportunities", "Own-practice + content monetisation viable", "Cross-sector demand"], cons: ["Pay below MBBS at similar tenure", "Crowded market; differentiation matters", "Regulatory landscape evolving"], related: ["doctor-mbbs", "physiotherapist"], examCodes: [], outlook: "Strong. Lifestyle disease + wellness market growing 15%+ yearly.", keywords: ["nutritionist career india", "dietitian salary", "RD career"] },
  { slug: "radiographer-radiologist-tech", name: "Radiographer / Radiology Technician", category: "medicine", dek: "Imaging technology — X-ray, CT, MRI, ultrasound. Hospital + diagnostic centres + tele-radiology.", whatTheyDo: "Radiographers operate imaging equipment, position patients, capture quality scans. Distinct from radiologists (MBBS+MD who interpret scans).", dayToDay: ["Patient positioning + scan acquisition", "Image quality review", "Radiation safety + dose monitoring", "Equipment QA + maintenance", "Liaison with radiologist + clinicians"], entryRoutes: [{ title: "Class 12 (PCB) → BSc Radiography / Diploma", body: "3-year BSc or 2-year Diploma. AIIMS, PGI, hospitals run programmes." }], qualifications: ["BSc Radiography (3 yr) or Diploma (2 yr)", "AERB radiation safety cert"], skills: ["Imaging modality operation", "Anatomy basics", "Radiation safety", "Patient communication + reassurance"], salaryBands: [{ experience: "Fresh", band: "₹2 - ₹4 LPA" }, { experience: "5-10 yr", band: "₹5 - ₹10 LPA" }, { experience: "Senior + Tele-radiology shifts", band: "₹10 - ₹20 LPA" }], growthPath: "Technician → Senior Technician → Chief Technologist / Department Head", topEmployers: ["AIIMS + govt hospitals", "Apollo, Fortis, Max + private chains", "Diagnostic chains (SRL, Metropolis, Thyrocare)", "Tele-radiology firms"], pros: ["Quick entry (2-3 yr diploma/BSc)", "Strong demand at hospitals + diagnostics", "Foreign opportunities (UK, US, Gulf)"], cons: ["Radiation exposure risk", "Shift work + night calls", "Less career ladder than MBBS"], related: ["doctor-mbbs", "nurse"], examCodes: ["NEET_UG"], outlook: "Strong. Diagnostic imaging growing with insurance + private hospital expansion.", keywords: ["radiographer career", "BSc radiography salary", "radiology technician"] },
  { slug: "occupational-therapist", name: "Occupational Therapist", category: "medicine", dek: "Help patients regain daily-living skills after injury, stroke, developmental disability.", whatTheyDo: "Occupational therapists work with patients (especially children with autism + developmental delays, stroke survivors, post-injury) to regain daily-living skills. Combines clinical + creative work.", dayToDay: ["Patient assessments + treatment plans", "Therapy sessions (often with kids — sensory + motor)", "Adaptive equipment recommendations", "Family education + home programme design", "Documentation"], entryRoutes: [{ title: "Class 12 (PCB) → BOT (4.5 yr inc. internship)", body: "Bachelor of Occupational Therapy." }, { title: "BOT → MOT specialisation", body: "Paediatric / Neuro / Mental Health specialisation." }], qualifications: ["BOT", "MOT for specialisation", "AIOTA registration"], skills: ["Sensory + motor assessment", "Therapy planning + adaptive techniques", "Patience + creativity", "Communication with families"], salaryBands: [{ experience: "Fresh", band: "₹2 - ₹5 LPA" }, { experience: "5-10 yr", band: "₹5 - ₹12 LPA" }, { experience: "Senior + own practice", band: "₹10 - ₹25 LPA" }], growthPath: "Junior OT → Senior OT → Specialist (Paeds, Neuro) → Own Practice", topEmployers: ["Special schools + autism centres", "Hospitals (AIIMS, NIMHANS, private chains)", "Rehab centres", "Foreign — UK NHS, US, Australia hire Indian OTs"], pros: ["Growing demand + autism + developmental awareness", "Foreign opportunities strong", "Mission-driven work"], cons: ["Pay below physiotherapy at similar tenure", "Emotional toll + slow patient progress", "Limited public-system recognition in India"], related: ["physiotherapist", "psychologist"], examCodes: ["NEET_UG"], outlook: "Strong. Special needs + elder care expanding.", keywords: ["occupational therapist career", "BOT salary india", "OT career"] },

  // ─── Finance, Banking, Accounting (+5) ─────────────────────────────
  { slug: "rbi-grade-b", name: "RBI Grade B Officer", category: "finance", dek: "India's central bank. Among most-prestigious + best-paying govt-equivalent roles.", whatTheyDo: "RBI Grade B officers work in banking regulation, monetary policy, foreign exchange, supervision of NBFCs, financial inclusion. Career path to Executive Director + above.", dayToDay: ["Bank supervision + audit visits", "Policy research + drafting", "Inter-departmental coordination", "Data analysis + reports", "Cross-functional with ministries"], entryRoutes: [{ title: "Bachelor's → RBI Grade B exam → Officer", body: "3-stage exam: Phase 1 (objective) + Phase 2 (English + Econ + Finance + Stats descriptive) + Interview." }], qualifications: ["Bachelor's with 60% (50% SC/ST/PwD)", "Age 21-30 (relaxations apply)"], skills: ["Economics + financial system depth", "Banking regulations + monetary policy", "Quantitative aptitude", "Communication for policy roles"], salaryBands: [{ experience: "Joining (Grade B)", band: "₹13 - ₹16 LPA inc. allowances" }, { experience: "Grade C (5+ yr)", band: "₹18 - ₹25 LPA" }, { experience: "Grade D - F (10-20 yr)", band: "₹25 - ₹50 LPA" }, { experience: "ED + Deputy Governor", band: "₹40 - ₹70 LPA+" }], growthPath: "Grade B → Grade C → Grade D → Grade E → Grade F → CGM → ED → Deputy Governor", pros: ["Among India's most prestigious civil roles", "Excellent perks (housing in Mumbai/Delhi)", "Strong post-retirement opportunities + board roles"], cons: ["Multi-year prep (~3 lakh applicants for ~250 seats)", "Bureaucracy + hierarchy real", "Transfers across cities"], related: ["bank-po", "investment-banker", "civil-services-prep"], examCodes: [], outlook: "Stable. ~250 vacancies/year; high competition continues.", keywords: ["RBI Grade B salary", "RBI officer career", "RBI Grade B exam"] },
  { slug: "sebi-officer", name: "SEBI Officer (Grade A)", category: "finance", dek: "Securities + financial markets regulator. Premium regulatory career.", whatTheyDo: "SEBI Grade A officers regulate Indian capital markets — mutual funds, listed companies, brokers, investment advisers, insider trading enforcement.", dayToDay: ["Market surveillance + investigation", "Listed-company disclosure review", "Policy drafting + amendments", "Industry stakeholder meetings", "Enforcement order writing"], entryRoutes: [{ title: "Bachelor's → SEBI Grade A exam → Officer", body: "Similar to RBI: Phase 1 + Phase 2 + Interview." }], qualifications: ["Bachelor's (Law/Finance/Engineering/CS preferred for specific streams)", "Age 21-30"], skills: ["Securities laws + financial markets", "Companies Act + SEBI regulations", "Analytical reasoning", "Communication for orders + policy"], salaryBands: [{ experience: "Joining (Grade A)", band: "₹15 - ₹18 LPA inc. allowances" }, { experience: "5 yr", band: "₹22 - ₹30 LPA" }, { experience: "Senior + Chief GM", band: "₹35 - ₹60 LPA+" }], growthPath: "Grade A → Grade B → Grade C → DGM → CGM → ED → Chairman", pros: ["Mumbai location + strong finance ecosystem", "Premium policy role", "Exit options into legal + advisory firms strong"], cons: ["High competition (~3 lakh applicants for ~100 seats)", "Specialisation depth (legal vs general)", "Senior promotion competitive"], related: ["rbi-grade-b", "chartered-accountant", "corporate-lawyer"], examCodes: [], outlook: "Stable + growing. SEBI's mandate expanding with capital market growth.", keywords: ["SEBI officer career", "SEBI Grade A salary", "SEBI exam"] },
  { slug: "equity-research-analyst", name: "Equity Research Analyst", category: "finance", dek: "Cover sectors + companies; write reports for buy-side investors. CFA path common.", whatTheyDo: "Equity research analysts cover specific sectors (IT, banks, pharma etc.) and write detailed reports on listed companies. Sell-side (IB-affiliated; reports for clients) + buy-side (mutual funds, hedge funds; reports for in-house PMs).", dayToDay: ["Financial modelling (DCF, comparable, sum-of-parts)", "Company + industry research", "Management interactions + earnings calls", "Report writing + recommendations", "Client / PM interactions"], entryRoutes: [{ title: "CA / CFA + MBA → ER analyst", body: "Top route: CFA Level 2+ + finance MBA or B.Com Hons + CA." }], qualifications: ["B.Com Hons / BTech + CFA / MBA Finance", "Strong financial modelling portfolio"], skills: ["Excel financial modelling", "DCF + relative valuation", "Industry depth (sector-specific)", "Writing skills for reports"], salaryBands: [{ experience: "Fresh (post-MBA / CFA)", band: "₹10 - ₹25 LPA" }, { experience: "5 yr Senior", band: "₹20 - ₹50 LPA" }, { experience: "Sector head + Buy-side senior", band: "₹50 LPA - ₹2 Cr+" }], growthPath: "Associate → Sr Associate → AVP → VP → Director / MD", topEmployers: ["Sell-side: Kotak, Motilal Oswal, Axis Capital, JM Financial, Edelweiss", "Buy-side: ICICI Pru AMC, HDFC AMC, SBI MF, Aditya Birla AMC", "Foreign — Goldman, Morgan Stanley, Macquarie India research"], pros: ["Strong learning curve + industry depth", "Buy-side senior comp substantial", "Career into PM / CIO possible"], cons: ["Long hours during earnings season", "Reporting cycles intense", "Buy-side roles limited in India"], related: ["investment-banker", "chartered-accountant"], examCodes: ["CAT"], outlook: "Strong + growing with Indian capital markets.", keywords: ["equity research analyst career", "ER analyst salary india", "CFA career"] },
  { slug: "financial-advisor", name: "Financial Advisor / Wealth Manager", category: "finance", dek: "Personal finance planning for clients. CFP cert + private banking + own practice paths.", whatTheyDo: "Financial advisors help clients plan investments, insurance, retirement, tax. Roles span banks (HNI desks), wealth-management firms (Edelweiss, IIFL Wealth, Anand Rathi), independent practice (RIAs).", dayToDay: ["Client meetings + financial-needs analysis", "Portfolio review + rebalancing", "Insurance + tax planning", "Estate + retirement planning", "Compliance + documentation"], entryRoutes: [{ title: "Bachelor's → CFP (Certified Financial Planner) → Job", body: "CFP is the global standard. NISM RIA cert for independent advisory." }, { title: "MBA Finance → Wealth Mgmt", body: "Big-firm route — Kotak Wealth, ICICI Pru Wealth, HDFC Wealth." }], qualifications: ["Bachelor's degree", "CFP cert (global) or NISM RIA cert (India regulatory)"], skills: ["Personal finance depth (tax + investment + insurance)", "Client relationship management", "Sales + cross-selling", "Compliance awareness"], salaryBands: [{ experience: "Fresh", band: "₹3 - ₹8 LPA + variable" }, { experience: "5-10 yr", band: "₹10 - ₹30 LPA + variable" }, { experience: "Senior RM / Own practice", band: "₹30 LPA - ₹2 Cr+" }], growthPath: "Junior Advisor → Sr Advisor → RM → Sr RM → Practice Head / Own Practice", topEmployers: ["Kotak, ICICI, HDFC, Axis Wealth", "IIFL Wealth, Edelweiss, Anand Rathi", "Independent RIA practices"], pros: ["Compounding career — book of business builds over time", "Independent practice viable", "Demand growing with India HNI base"], cons: ["Quota + sales pressure at firms", "Trust takes years to build", "Regulatory tightening (RIA vs distribution split)"], related: ["chartered-accountant", "bank-po", "actuary"], examCodes: ["CAT"], outlook: "Strong. India HNI population doubling by 2030.", keywords: ["financial advisor career india", "wealth manager salary", "CFP career"] },
  { slug: "auditor-internal", name: "Internal Auditor", category: "finance", dek: "Risk + control reviews inside companies. CA / CIA / CISA paths.", whatTheyDo: "Internal auditors review business processes for risk + control gaps + compliance. Different from external audit (statutory). Specialisations: IT audit (SOX, ITGC), operational audit, fraud, forensic.", dayToDay: ["Risk assessment + audit planning", "Walkthrough + testing of controls", "Data analytics on transactional data", "Drafting audit reports + recommendations", "Stakeholder meetings"], entryRoutes: [{ title: "CA / CMA → Internal audit role", body: "Big-4 internal audit teams; corporate in-house IA functions." }, { title: "CA + CISA → IT audit specialist", body: "Niche specialisation with strong pay growth." }], qualifications: ["CA / CMA / B.Com + CIA (US cert)", "CISA for IT audit"], skills: ["Risk + controls framework (COSO)", "Process mapping + walkthrough", "Data analytics (Excel, ACL, IDEA)", "Report writing"], salaryBands: [{ experience: "Fresh CA", band: "₹7 - ₹12 LPA" }, { experience: "5 yr", band: "₹15 - ₹30 LPA" }, { experience: "Senior + Audit Head", band: "₹30 - ₹70 LPA" }], growthPath: "Asst Manager → Manager → Sr Manager → AVP → Head Internal Audit / Chief Audit Exec", topEmployers: ["Big-4 (Deloitte, PwC, KPMG, EY)", "Corporate IA at Nifty-500 cos", "Banks (HDFC, ICICI, SBI IA teams)"], pros: ["Stable + recession-resistant", "Cross-functional business exposure", "Strong CFO/CRO exit path"], cons: ["Less prestigious than external audit early on", "Bureaucratic in corporate IA", "Travel during peak"], related: ["chartered-accountant", "cma"], examCodes: [], outlook: "Strong. Regulatory tightening + compliance complexity driving IA demand.", keywords: ["internal auditor career", "CIA audit india", "audit career"] },

  // ─── Civil Services + Govt (+5) ────────────────────────────────────
  { slug: "ifs-officer", name: "Indian Foreign Service (IFS) Officer", category: "civil-services", dek: "Diplomat — represents India abroad. Embassy + UN + multilateral postings. Cleared via UPSC CSE.", whatTheyDo: "IFS officers serve in embassies, consulates, UN, multilateral bodies. Career rotation between MEA Headquarters Delhi + foreign postings. Specialisations: bilateral relations, multilateral (UN/WTO), commerce, consular, protocol.", dayToDay: ["Bilateral + multilateral diplomatic engagement", "Reporting to MEA on host-country developments", "Indian community welfare in host country", "Cultural + commercial diplomacy events", "Foreign-language fluency development"], entryRoutes: [{ title: "Bachelor's → UPSC CSE → IFS", body: "Same CSE exam as IAS/IPS; allocation by rank + preference." }], qualifications: ["Bachelor's degree", "Age 21-32 (general)", "Indian citizen"], skills: ["Foreign language fluency (acquired during training)", "Cross-cultural communication", "Geopolitical depth + foreign policy", "Negotiation"], salaryBands: [{ experience: "Junior (0-4 yr)", band: "₹9 - ₹13 LPA inc. allowances + housing abroad" }, { experience: "Mid + Counsellor", band: "₹15 - ₹25 LPA" }, { experience: "Senior + Ambassador", band: "₹25 - ₹45 LPA + lifestyle perks" }], growthPath: "3rd Sec → 2nd Sec → 1st Sec → Counsellor → Min → Ambassador / High Commissioner / PR at UN", pros: ["Global postings + cross-cultural exposure", "Diplomatic immunity + perks substantial", "High-status role + post-retirement opportunities"], cons: ["Frequent international relocation strains family", "Career hierarchy slow + tightly controlled", "Political pressure on policy independence"], related: ["ias-officer", "ips-officer", "civil-services-prep"], examCodes: ["UPSC_PRELIMS"], outlook: "Stable. ~25-30 IFS officers selected yearly via CSE.", keywords: ["IFS officer career", "diplomat india salary", "Indian Foreign Service"] },
  { slug: "income-tax-officer", name: "Income Tax Officer (IRS)", category: "civil-services", dek: "Income tax administration via UPSC CSE → IRS allocation. Below-IAS but lifetime stability + perks.", whatTheyDo: "IRS officers administer + enforce Income Tax + Indirect Tax in India. Career rotation between field (assessing, collection, search + seizure) + headquarters policy roles.", dayToDay: ["Assessment of tax returns", "Investigation + search operations", "Litigation + appeals", "Policy formulation", "Inter-departmental coordination"], entryRoutes: [{ title: "Bachelor's → UPSC CSE → IRS (IT or C&CE)", body: "Same CSE exam; IRS-IT and IRS-Customs allocated based on rank + preference." }], qualifications: ["Bachelor's degree", "Age 21-32"], skills: ["Income Tax Act + GST depth", "Investigation + analytics", "Communication + court appearance", "Stakeholder management"], salaryBands: [{ experience: "Junior", band: "₹8 - ₹12 LPA", note: "Same scale as IAS at junior level." }, { experience: "Mid", band: "₹12 - ₹20 LPA" }, { experience: "Senior + CIT + CCIT", band: "₹25 - ₹45 LPA" }], growthPath: "Asst Comm → Dy Comm → Joint Comm → Comm → Chief Comm → Member CBDT/CBIC → Chairman", pros: ["Strong govt stability + pension", "Investigation work is high-impact", "Strong post-retirement opportunities in tax advisory"], cons: ["Promotion slower than IAS", "Political pressure on assessment work", "Frequent transfers"], related: ["ias-officer", "ips-officer"], examCodes: ["UPSC_PRELIMS"], outlook: "Stable. ~150 IRS-IT + ~70 IRS-C&CE selected yearly.", keywords: ["IRS officer career", "income tax officer salary", "IRS allocation"] },
  { slug: "rti-information-commissioner", name: "Information Commissioner / Public Information Officer", category: "civil-services", dek: "Public-information access + transparency roles. Central + state Information Commissions.", whatTheyDo: "Information Commissioners adjudicate RTI appeals + ensure compliance. Public Information Officers (PIOs) within govt departments respond to RTI requests. Career path typically requires experience first.", dayToDay: ["RTI appeal hearings", "Compliance audits", "Annual reports", "Awareness + capacity building", "Inter-departmental coordination"], entryRoutes: [{ title: "Career civil servant or eminent professional → IC appointment", body: "Information Commissioners are appointed (not exam-based). Typically retired civil servants, journalists, academics." }, { title: "Bachelor's + govt service → PIO role", body: "Internal designation within govt departments. Every dept has PIOs." }], qualifications: ["Senior govt service experience or eminence in field"], skills: ["RTI Act depth", "Adjudication + decision writing", "Transparency advocacy"], salaryBands: [{ experience: "PIO (designated role)", band: "₹8 - ₹20 LPA per existing govt scale" }, { experience: "State Information Commissioner", band: "₹2.5 - ₹3 LPA / month + housing" }, { experience: "Chief Information Commissioner", band: "Same as Supreme Court judge ~₹2.5L+/month" }], growthPath: "PIO → Senior PIO → Information Commissioner → Chief IC", topEmployers: ["Central Information Commission", "State Information Commissions (28 states)", "Govt departments as PIOs"], pros: ["Public-interest mission", "Strong post-retirement role for civil servants", "Significant influence on transparency"], cons: ["Political appointment (esp. ICs) creates instability", "Many vacant positions cause backlogs", "Limited entry for fresh candidates"], related: ["civil-services-prep", "ias-officer"], examCodes: [], outlook: "Stable demand; political appointment dynamics affect timing.", keywords: ["RTI Information Commissioner career", "PIO role india"] },
  { slug: "rural-development-officer", name: "Block Development Officer / Rural Development", category: "civil-services", dek: "Rural admin + welfare programmes at block level. State PCS entry route.", whatTheyDo: "BDOs administer rural development schemes (MGNREGA, PMAY, PMGSY etc.) at block level. Coordinate with Panchayats, social audit committees, line departments.", dayToDay: ["Field visits to villages + work sites", "MGNREGA + scheme implementation review", "Gram Panchayat coordination", "Beneficiary verification + grievances", "Reporting to district + state HQ"], entryRoutes: [{ title: "State PCS exam → BDO posting", body: "Most BDO posts are filled via state PSC exams (UPPSC, BPSC, MPPSC etc.)." }], qualifications: ["Bachelor's degree", "Age 21-35 (state-specific)"], skills: ["Rural development schemes depth", "Public administration", "Local language fluency", "Conflict resolution"], salaryBands: [{ experience: "Joining", band: "₹6 - ₹9 LPA" }, { experience: "10 yr", band: "₹10 - ₹14 LPA" }, { experience: "Senior", band: "₹15 - ₹25 LPA" }], growthPath: "BDO → ADO → Joint Director → Director Rural Development", pros: ["Direct impact on rural lives", "Stable govt job + pension", "Local-language postings reduce relocation"], cons: ["Rural remote postings sometimes hardship", "MGNREGA + scheme politics can be frustrating", "Career promotion slower than IAS"], related: ["state-civil-services", "civil-services-prep"], examCodes: ["UP_UPPSC_PCS", "BR_BPSC_CCE", "MP_MPPSC_SSE"], outlook: "Stable. Rural-development scheme volumes growing.", keywords: ["BDO career", "block development officer salary", "rural development officer"] },
  { slug: "election-commission-officer", name: "Election Commission Officer", category: "civil-services", dek: "Election administration roles. ECI Secretariat + state CEO offices.", whatTheyDo: "Election Commission staff plan + administer Indian elections. Roles span policy (ECI Secretariat Delhi), state-level (Chief Electoral Officers + Deputy CEOs), and field (Returning Officers during elections).", dayToDay: ["Electoral roll + polling station planning", "Polling personnel training", "Election compliance + Model Code enforcement", "Voter awareness (SVEEP)", "Reporting + analysis"], entryRoutes: [{ title: "Civil service (IAS/State) → ECI deputation", body: "Most senior ECI roles filled by IAS/state-service officers on deputation." }, { title: "ECI staff exam → Junior officer", body: "ECI Secretariat has its own clerical + officer-grade recruitments." }], qualifications: ["Bachelor's degree (entry)", "Senior posts: IAS / state service experience"], skills: ["Elections law (RoP Act) depth", "Public administration", "Discretion + neutrality", "Logistics coordination"], salaryBands: [{ experience: "Junior staff", band: "₹4 - ₹8 LPA" }, { experience: "Senior + Deputy CEO", band: "₹15 - ₹30 LPA" }, { experience: "CEO + ECI Secretary", band: "₹25 - ₹50 LPA" }], growthPath: "Staff roles → Senior administrators → Deputy CEO → CEO → Election Commissioner (constitutional appt)", pros: ["High-impact constitutional role", "Stable govt employment", "Inter-departmental visibility"], cons: ["Election cycle stress + long hours", "Limited direct-entry senior posts", "Political pressure during elections"], related: ["ias-officer", "civil-services-prep"], examCodes: [], outlook: "Stable. ECI workforce stable + state Election Commissions expanding.", keywords: ["election commission career", "ECI officer", "Chief Electoral Officer"] },

  // ─── Law (+3) ───────────────────────────────────────────────────────
  { slug: "in-house-counsel", name: "In-House Counsel (Corporate Legal)", category: "law", dek: "Lawyer inside a company. Lower hours than law firm; broader exposure to business decisions.", whatTheyDo: "In-house counsel handle contracts, regulatory compliance, litigation oversight, M&A support, IP, employment, data privacy. Sit between law firms (external counsel) + business stakeholders.", dayToDay: ["Contract review + drafting", "Regulatory + compliance advisory", "Coordinate external counsel on disputes", "Business team support", "Policy + risk frameworks"], entryRoutes: [{ title: "Law firm associate (3-5 yr) → In-house move", body: "Most direct path. Top in-house roles at MNCs hire from Tier-1 law firms." }], qualifications: ["BA LLB / LLB + AIBE", "Optional: LLM"], skills: ["Contract drafting + negotiation", "Corporate + commercial law", "Regulatory awareness", "Business + stakeholder communication"], salaryBands: [{ experience: "Junior (post-firm)", band: "₹12 - ₹25 LPA" }, { experience: "Manager (5-8 yr)", band: "₹25 - ₹60 LPA" }, { experience: "GC / VP Legal", band: "₹60 LPA - ₹2 Cr+" }], growthPath: "Counsel → Sr Counsel → Asst GC → DGC → General Counsel + VP Legal", topEmployers: ["Reliance, Tata, Adani (conglomerates)", "Flipkart, Swiggy, Zomato, Razorpay (unicorns)", "Microsoft, Google, Amazon India (MNC tech)", "HDFC, ICICI, Kotak (BFSI in-house)"], pros: ["Better hours than law firms", "Cross-functional + strategic business exposure", "GC roles among highest-paid corporate legal jobs"], cons: ["Less specialised work than firm", "Career path narrower in mid-tier companies", "Need firm experience first usually"], related: ["corporate-lawyer", "advocate-litigator"], examCodes: ["CLAT"], outlook: "Strong. Indian corporate legal teams expanding + GC roles becoming more strategic.", keywords: ["in-house counsel career", "GC salary india", "corporate legal"] },
  { slug: "patent-attorney", name: "Patent Attorney / IP Lawyer", category: "law", dek: "Patent drafting + prosecution + litigation. Tech + science background + law degree.", whatTheyDo: "Patent attorneys help inventors + companies obtain + defend patents. Career split: prosecution (drafting + filing) + litigation (infringement disputes). Tech/science UG + law degree is the typical entry.", dayToDay: ["Patent claim drafting", "Prior-art search + analysis", "Patent prosecution with patent offices", "Infringement + invalidation analysis", "Client + inventor meetings"], entryRoutes: [{ title: "BTech / BSc / MSc → LLB → Patent Agent exam → Patent attorney", body: "Patent Agent exam (qualifying for India patent practice) requires science/tech UG. LLB + Bar enrolment to also practice litigation." }], qualifications: ["BTech / BSc / MSc (science/engineering)", "LLB", "Patent Agent registration", "AIBE for litigation"], skills: ["Technical depth in your science/eng field", "Patent law + IP framework", "Claim drafting + technical writing", "Litigation skills for IP disputes"], salaryBands: [{ experience: "Fresh", band: "₹4 - ₹10 LPA" }, { experience: "5-10 yr", band: "₹10 - ₹25 LPA" }, { experience: "Senior + partnership", band: "₹25 - ₹70 LPA" }], growthPath: "Patent Agent → Senior Agent → Patent Attorney → Partner at IP firm", topEmployers: ["Anand & Anand, Remfry, KAN (IP boutiques)", "AZB, Khaitan IP teams", "Corporate in-house IP (Reliance, Tata)"], pros: ["Niche specialisation pays well", "Tech + law hybrid is rare", "Foreign opportunities (US, EU patent practice)"], cons: ["Smaller talent pool means slower career mobility", "Patent prosecution can be repetitive", "Most India patent applications are foreign (filed in India for protection)"], related: ["corporate-lawyer", "advocate-litigator"], examCodes: ["CLAT"], outlook: "Growing. Indian IP filings rising + tech company IP focus increasing.", keywords: ["patent attorney career", "IP lawyer salary india", "patent agent exam"] },
  { slug: "legal-aid-public-interest", name: "Legal Aid + Public Interest Lawyer", category: "law", dek: "Pro bono + low-pay practice for marginalised communities. Mission-driven legal career.", whatTheyDo: "Legal aid lawyers represent low-income clients in criminal defence, women's rights, labour, housing, environmental cases. Work at legal-aid societies, NGOs (HRLN, AALI, IDSN), or as independent advocates.", dayToDay: ["Client intake + case assessment", "Court appearances + drafting", "Community outreach + legal-literacy work", "Policy advocacy + research", "Coordination with paralegals + activists"], entryRoutes: [{ title: "LLB → Legal aid organisation / NGO", body: "Direct entry; most legal aid orgs hire fresh graduates committed to public interest." }], qualifications: ["BA LLB / LLB + AIBE", "Specialisation in human rights / criminal / labour law preferred"], skills: ["Litigation + court practice", "Public interest law depth", "Community engagement", "Research + writing", "Resilience to low pay + high volume"], salaryBands: [{ experience: "Fresh", band: "₹2 - ₹5 LPA" }, { experience: "5-10 yr", band: "₹4 - ₹10 LPA" }, { experience: "Senior + Direction", band: "₹10 - ₹25 LPA" }], growthPath: "Junior → Sr Lawyer → Programme Lead → Director (org)", topEmployers: ["Human Rights Law Network (HRLN)", "Lawyers Collective", "Centre for Constitutional Rights", "State legal services authorities", "Independent practice"], pros: ["Mission-driven impact", "Constitutional + public-interest cases", "Independence + diverse practice"], cons: ["Pay materially below corporate law", "Slower career progression", "Burnout + workload high"], related: ["advocate-litigator", "ips-officer"], examCodes: ["CLAT"], outlook: "Stable demand; constrained by funding cycles.", keywords: ["public interest lawyer", "legal aid career india", "human rights lawyer"] },

  // ─── Design + Creative (+4) ─────────────────────────────────────────
  { slug: "fashion-designer", name: "Fashion Designer", category: "design", dek: "Design garments + collections. NIFT + own-brand + buying-office paths.", whatTheyDo: "Fashion designers create garment collections — sketching, fabric selection, pattern making, production oversight. Career split: own brand, employed designer at fashion houses (Sabyasachi, Manish Malhotra), buying offices, e-commerce private labels.", dayToDay: ["Concept + mood-board development", "Fabric + trim sourcing", "Pattern making + sample fitting", "Production coordination", "Buyer + retail meetings"], entryRoutes: [{ title: "NIFT entrance → BDes Fashion → Job", body: "NIFT (15 campuses) is the dominant entry. NID + Pearl Academy are alternatives." }], qualifications: ["BDes (NIFT/NID/Pearl) preferred", "Portfolio + technical skills"], skills: ["Sketching + illustration", "Fabric + textile knowledge", "Pattern making + sewing", "Adobe Illustrator + InDesign", "Trend analysis"], salaryBands: [{ experience: "Fresh", band: "₹2.5 - ₹6 LPA" }, { experience: "5 yr", band: "₹6 - ₹15 LPA" }, { experience: "Senior + own brand", band: "₹15 - ₹50 LPA+", note: "Own brand can be substantially more but with risk." }], growthPath: "Junior Designer → Sr Designer → Head Designer → Creative Director / Own Brand", topEmployers: ["Fashion houses (Sabyasachi, Manish Malhotra, Anita Dongre)", "Fast fashion (Pantaloons, Westside, Zara India)", "E-commerce private labels (Myntra, Ajio)", "Buying offices (Li & Fung, MM Style)"], pros: ["Creative satisfaction", "Own-brand path scalable", "Indian fashion market growing 10%+ yearly"], cons: ["Pay slower to grow than tech", "Industry cyclical + competitive", "Own brand needs capital + market access"], related: ["graphic-designer", "ux-designer"], examCodes: [], outlook: "Strong with fashion-market growth + online retail expansion.", keywords: ["fashion designer career", "NIFT career", "fashion designer salary india"] },
  { slug: "animator-vfx-artist", name: "Animator / VFX Artist", category: "design", dek: "2D + 3D animation, VFX for films + games + advertising. Mumbai/Bengaluru/Hyderabad studios + freelance.", whatTheyDo: "Animators + VFX artists create motion graphics for films, web series, ads, games. Specialisations: 2D animation, 3D modelling, rigging, VFX compositing, motion design.", dayToDay: ["Storyboarding + animation", "3D modelling + texturing (Maya, Blender)", "VFX compositing (Nuke, After Effects)", "Render farm management", "Director + client reviews"], entryRoutes: [{ title: "BDes / Diploma Animation → Studio job", body: "Pearl Academy, NID, MAAC, ZICA, Arena are popular." }], qualifications: ["BDes / Diploma in Animation", "Strong demo reel"], skills: ["Maya, 3DS Max, Blender, ZBrush", "Nuke, After Effects (VFX)", "Cinema 4D, Houdini (advanced)", "Anatomy + motion + lighting principles", "Render pipeline knowledge"], salaryBands: [{ experience: "Fresh", band: "₹2.5 - ₹6 LPA" }, { experience: "5 yr", band: "₹6 - ₹15 LPA" }, { experience: "Senior + Lead Artist", band: "₹15 - ₹40 LPA" }], growthPath: "Junior Artist → Senior → Lead Artist → Supervisor → CG Director", topEmployers: ["DNEG Mumbai, Prime Focus, Red Chillies VFX", "Technicolor India, MPC India", "Rockstar India, Ubisoft India (game studios)", "Disney+Hotstar, Netflix India production"], pros: ["Global studios + foreign-film work in India", "Foreign opportunities (Vancouver, LA, London) common", "Indian VFX industry 25%+ YoY growth"], cons: ["Long hours during deadlines", "Tools + software change", "Junior pay lower than tech"], related: ["graphic-designer", "ux-designer"], examCodes: [], outlook: "Strong. Indian VFX/animation work for global films/shows expanding rapidly.", keywords: ["animator career india", "VFX artist salary", "3D artist career"] },
  { slug: "interior-designer", name: "Interior Designer", category: "design", dek: "Residential + commercial interiors. Own practice scaleable + strong real-estate driven demand.", whatTheyDo: "Interior designers design + execute interior spaces — residential, commercial, hospitality, retail. Career split: residential firms, large architecture firms with interior practice, own studio.", dayToDay: ["Client meetings + brief development", "Concept design + 3D visualisation", "Material + finish selection + sourcing", "Contractor + vendor coordination", "Site supervision"], entryRoutes: [{ title: "BDes Interior / B.Arch + Interior PG", body: "CEPT, NIFT Interior Design, NID, SPA, Pearl all offer interior design." }], qualifications: ["BDes Interior Design / B.Arch", "Portfolio essential"], skills: ["AutoCAD, Revit, SketchUp, 3DS Max", "Material + finish knowledge", "Lighting design", "Project management + execution"], salaryBands: [{ experience: "Fresh", band: "₹2.5 - ₹5 LPA" }, { experience: "5 yr", band: "₹6 - ₹15 LPA" }, { experience: "Senior + own studio", band: "₹15 - ₹60 LPA+" }], growthPath: "Junior → Senior → Project Lead → Design Director / Own Studio", topEmployers: ["Hipcouch, Livspace, Homelane (large home design)", "Renowned individual studios (Studio Lotus, Morphogenesis, Hafeez Contractor)", "Hospitality chains (Taj, Oberoi design teams)"], pros: ["Own-practice scalable + tangible work", "Real-estate growth drives demand", "Cross-disciplinary (architecture + product + lighting)"], cons: ["Project-based income inconsistent early on", "Long execution cycles", "Pay below architecture for similar tenure initially"], related: ["architect", "graphic-designer"], examCodes: [], outlook: "Strong. Housing + hospitality boom + home upgradation market growing.", keywords: ["interior designer career", "interior design salary india"] },
  { slug: "game-designer-developer", name: "Game Designer + Developer", category: "design", dek: "Build mobile + PC games. Studios + Indian publishers + indie + foreign work.", whatTheyDo: "Game designers create gameplay mechanics, levels, narratives, balance. Game developers implement them. Studios + indie + foreign-payroll roles all exist.", dayToDay: ["Game mechanics + system design", "Coding (Unity C#, Unreal C++)", "Asset integration + scripting", "Playtest analysis + iteration", "Cross-functional with art + sound"], entryRoutes: [{ title: "BSc / BTech + game dev portfolio → Studio job", body: "Game industry hires heavily on portfolio (Steam + itch.io projects, jam wins)." }], qualifications: ["BSc Game Design / BTech CS + game projects portfolio"], skills: ["Unity (C#) or Unreal (C++/Blueprint)", "Game design fundamentals", "Math + physics for games", "Version control + collaboration", "Mobile + PC platform basics"], salaryBands: [{ experience: "Fresh", band: "₹3 - ₹8 LPA" }, { experience: "5 yr", band: "₹8 - ₹20 LPA" }, { experience: "Senior + Lead", band: "₹20 - ₹50 LPA" }], growthPath: "Junior Dev → Sr Dev → Lead → Technical Director / Game Director", topEmployers: ["Ubisoft India, Electronic Arts India, Rockstar India", "Indian indie + mid-size: Lazy Eight Studios, Nodding Heads Games", "Mobile gaming: Dream11, Games24x7, MPL (gaming)"], pros: ["Creative + technical hybrid", "Foreign-payroll work via remote indie", "Indian gaming market growing 20%+ yearly"], cons: ["Crunch + long hours real", "Industry cyclical", "Tight margins at mid-tier studios"], related: ["software-engineer", "graphic-designer", "animator-vfx-artist"], examCodes: [], outlook: "Strong + growing. India gaming user base now 500M+; production catching up.", keywords: ["game designer career india", "game developer salary", "Unity Unreal career"] },

  // ─── Education + Research (+3) ─────────────────────────────────────
  { slug: "phd-researcher", name: "PhD Researcher / Scientist", category: "education-research", dek: "Doctoral research in academia or national labs. UGC-NET / CSIR / GATE entry. Long-horizon.", whatTheyDo: "PhD researchers spend 4-6 years on original research producing dissertations + papers. Post-PhD: academia (professor), industry R&D (pharma, AI, materials), or national labs.", dayToDay: ["Experiments + simulations", "Reading + writing papers", "Conference presentations", "Teaching + mentoring (academic track)", "Grant writing"], entryRoutes: [{ title: "UG → MSc/MTech → UGC NET-JRF / CSIR NET-JRF → PhD", body: "Standard route. NET-JRF gives stipend during PhD." }, { title: "BTech → PMRF (Prime Minister's Research Fellowship)", body: "Direct PhD entry at IIT / IISc with ₹70-80k/month stipend." }], qualifications: ["MSc / MTech + UGC NET-JRF or CSIR NET-JRF", "Or BTech + PMRF"], skills: ["Research methodology", "Field-specific technical depth", "Writing + publication", "Resilience for 4-6 year projects"], salaryBands: [{ experience: "Student (during PhD)", band: "₹4.5 - ₹5 LPA stipend (UGC NET-JRF rates)" }, { experience: "Postdoc", band: "₹6 - ₹12 LPA in India; abroad ₹25-50 LPA" }, { experience: "Assistant Professor / Research Scientist", band: "₹10 - ₹20 LPA in India; abroad ₹40-80 LPA+" }], growthPath: "PhD student → Postdoc → Asst Prof / Scientist → Sr Scientist → Tenured Prof / Group Leader", topEmployers: ["IITs, IISc, IISERs, ISI", "National labs (CSIR, DRDO, ICAR)", "Foreign R&D + tenure-track positions"], pros: ["Intellectual depth + freedom", "Strong stipend in India (NET-JRF rates)", "Foreign mobility unmatched"], cons: ["4-6 year opportunity cost", "Job market in some fields tight", "Industry PhD ROI field-specific"], related: ["scientist", "college-professor"], examCodes: [], outlook: "Strong in select fields (ML, biotech, materials); tight in humanities + social sciences.", keywords: ["PhD researcher career", "PhD stipend india", "PMRF career"] },
  { slug: "edtech-instructional-designer", name: "EdTech Instructional Designer", category: "education-research", dek: "Design online courses + curricula. Byju's/Vedantu/Coursera + corporate training paths.", whatTheyDo: "Instructional designers create learning experiences — courses, modules, assessments. Career split: K-12 edtech, higher-ed online, corporate training, ID consultancies.", dayToDay: ["Curriculum design + storyboarding", "Content writing + scripting", "Multimedia production coordination", "Learner assessment design", "Iterative testing + improvement"], entryRoutes: [{ title: "BEd / MEd + edtech experience", body: "Teachers transitioning to edtech with content-design portfolios." }, { title: "Master's Instructional Design / Educational Tech", body: "TISS, Azim Premji, IGNOU offer relevant PGs." }], qualifications: ["Bachelor's (any) + ID portfolio / cert", "BEd / MEd preferred for school content"], skills: ["Curriculum + pedagogy", "Articulate Storyline / Captivate / Rise", "LMS basics (Moodle, Canvas)", "Writing for learners", "Assessment design"], salaryBands: [{ experience: "Fresh", band: "₹3 - ₹7 LPA" }, { experience: "5 yr", band: "₹8 - ₹18 LPA" }, { experience: "Senior + Head Curriculum", band: "₹18 - ₹40 LPA" }], growthPath: "ID → Sr ID → Lead → Head Curriculum / Director Content", topEmployers: ["Byju's, Vedantu, Unacademy (K-12 edtech)", "upGrad, Coursera, Simplilearn (higher-ed)", "Corporate L&D at MNCs", "Edtech consultancies"], pros: ["Edtech expansion driving demand", "Hybrid creative + analytical work", "Remote-friendly"], cons: ["Edtech sector layoff cycles (2023-24)", "Pressure to over-produce vs over-design", "Compensation variable across firms"], related: ["school-teacher", "college-professor", "content-writer"], examCodes: [], outlook: "Mixed. K-12 edtech compressing; higher-ed + corporate training expanding.", keywords: ["instructional designer career", "edtech career india", "Byju's Vedantu career"] },
  { slug: "language-translator-interpreter", name: "Translator / Interpreter", category: "education-research", dek: "Foreign + Indian language translation. Govt + literary + business + interpreting routes.", whatTheyDo: "Translators convert written text between languages; interpreters do spoken/sign translation in real time. Career routes: govt (MEA, foreign service), literary (publishing), business (legal + commercial), conference interpreting.", dayToDay: ["Translation work (per project)", "Quality + style review", "Glossary building", "Interpreting (for spoken)", "Client + author meetings"], entryRoutes: [{ title: "Bachelor's + foreign language → Translation cert + portfolio", body: "JNU, BHU, Delhi University offer language MA. Goethe Institute / Alliance Francaise / Confucius Institute for proficiency." }], qualifications: ["Bachelor's + language proficiency (C1/C2)", "Translation cert (NTM, professional translator association)"], skills: ["Source + target language mastery", "Subject-domain depth", "CAT tools (Trados, MemoQ)", "Cultural translation", "Interpreting practice (consecutive + simultaneous)"], salaryBands: [{ experience: "Fresh", band: "₹2.5 - ₹5 LPA" }, { experience: "5 yr", band: "₹5 - ₹12 LPA" }, { experience: "Senior + conference interpreter", band: "₹15 - ₹40 LPA+" }], growthPath: "Junior Translator → Sr Translator → Editor / Lead Translator → Director Translation Services", topEmployers: ["MEA + foreign embassies", "Penguin, HarperCollins (literary)", "Translation agencies (TransPerfect, Lionbridge India)", "Corporate legal + business translation"], pros: ["Foreign language fluency opens unique careers", "Freelance + remote viable", "Conference interpreting + specialised technical translation pay well"], cons: ["AI translation creating entry-tier pressure", "Specialisation matters for higher pay", "Freelance income inconsistent"], related: ["journalist", "content-writer"], examCodes: [], outlook: "Mixed. AI disrupting entry-tier; specialist + interpreter roles continuing to grow.", keywords: ["translator career india", "interpreter salary", "foreign language career"] },

  // ─── Defence + Police (+3) ──────────────────────────────────────────
  { slug: "coast-guard-officer", name: "Indian Coast Guard Officer", category: "defence", dek: "Maritime + coastal protection. ICG officer entry via CDS + state officer entries.", whatTheyDo: "ICG officers protect Indian coastline + EEZ — anti-smuggling, search + rescue, fisheries protection, oil spill response, coastal security. Roles span ship + aviation + technical branches.", dayToDay: ["Ship-based operations (depends on posting)", "Search + rescue missions", "Maritime patrol + interdiction", "Aviation + helicopter ops (Aviation branch)", "Coastal security coordination"], entryRoutes: [{ title: "Bachelor's → ICG Assistant Commandant exam → Officer", body: "Direct entry via Stage I+II+III selection + interview." }, { title: "NDA → ICG via Navy stream", body: "Some NDA candidates branch into ICG." }], qualifications: ["Bachelor's degree (specific subjects per branch)", "Age 21-25 (varies)", "Physical + medical fitness"], skills: ["Maritime operations + navigation", "Physical fitness + endurance", "Leadership + command", "Crisis response"], salaryBands: [{ experience: "Asst Commandant", band: "₹10 - ₹14 LPA inc. allowances + free messing/housing" }, { experience: "Mid + Deputy IG", band: "₹15 - ₹22 LPA" }, { experience: "Senior + DG", band: "₹25 - ₹45 LPA" }], growthPath: "Asst Commandant → Dy Comdt → Comdt → Dy IG → IG → ADG → DG", topEmployers: ["Indian Coast Guard (single employer)"], pros: ["Maritime career uniqueness", "Strong govt benefits + pension", "Cross-postings on ships + aviation"], cons: ["Sea postings disrupt family life", "Smaller career ladder than Navy", "Hardship coastal postings"], related: ["armed-forces-officer", "merchant-navy-officer"], examCodes: ["CDS", "NDA"], outlook: "Stable. ~150-200 Asst Commandants recruited yearly.", keywords: ["coast guard officer career", "ICG salary", "Indian Coast Guard"] },
  { slug: "para-military-officer", name: "Paramilitary Officer (BSF/CRPF/ITBP/SSB/CISF)", category: "defence", dek: "Officer in central armed police forces. UPSC CAPF (Assistant Commandant) entry.", whatTheyDo: "Paramilitary officers (Assistant Commandants) command troops in border guarding (BSF/ITBP/SSB), counter-insurgency (CRPF), industrial security (CISF), customs (Customs Preventive). Field-heavy career.", dayToDay: ["Force command + patrolling (border/insurgency)", "Operations planning + intelligence", "Personnel + welfare", "Coordination with state police", "Training + drill"], entryRoutes: [{ title: "Bachelor's → UPSC CAPF (AC) exam → Officer", body: "UPSC conducts CAPF (AC) yearly for direct officer entry into BSF/CRPF/ITBP/SSB/CISF." }], qualifications: ["Bachelor's degree", "Age 20-25", "Physical standards strict"], skills: ["Tactical operations", "Physical fitness", "Leadership", "Crisis + insurgency response"], salaryBands: [{ experience: "AC (joining)", band: "₹9 - ₹13 LPA inc. allowances + free housing/messing" }, { experience: "DSP / Sr AC", band: "₹13 - ₹18 LPA" }, { experience: "Commandant + above", band: "₹20 - ₹40 LPA" }], growthPath: "AC → DC → 2-IC → Comdt → DIG → IG → ADG → DG", pros: ["Strong govt benefits + pension", "Direct officer entry", "Deputation to IB/RAW/NIA/CBI possible"], cons: ["Hardship + remote postings real", "Counter-insurgency operations carry risk", "Family relocations frequent"], related: ["ips-officer", "armed-forces-officer"], examCodes: [], outlook: "Stable. ~400-500 ACs selected yearly via UPSC CAPF.", keywords: ["paramilitary officer career", "CAPF AC salary", "BSF CRPF officer"] },
  { slug: "intelligence-officer", name: "Intelligence Officer (IB / RAW / NIA / CBI)", category: "defence", dek: "Intelligence + investigation. Indirect entry via UPSC CSE → IPS or direct exam.", whatTheyDo: "Intelligence officers gather + analyse intelligence + investigate. IB (internal), RAW (external), NIA (terrorism), CBI (federal investigation). Career mostly via deputation from IPS / Army / state services; some direct recruitment.", dayToDay: ["Intelligence collection + analysis (classified)", "Field operations + surveillance", "Investigation + arrest (NIA/CBI)", "Inter-agency coordination", "Reports to PMO / Home Ministry"], entryRoutes: [{ title: "UPSC CSE → IPS → IB/RAW/NIA/CBI deputation", body: "Most direct senior route." }, { title: "IB direct recruitment (ACIO, JIO)", body: "IB runs its own ACIO/JIO entrance exams for direct entry." }], qualifications: ["Bachelor's (for direct ACIO) OR UPSC CSE → IPS → deputation"], skills: ["Investigation + intelligence analysis", "Discretion + secrecy", "Foreign language fluency (RAW)", "Inter-agency communication"], salaryBands: [{ experience: "ACIO (IB direct)", band: "₹6 - ₹9 LPA" }, { experience: "Senior IB officer", band: "₹15 - ₹30 LPA" }, { experience: "DG IB / Director RAW", band: "₹50+ LPA, Cabinet Secretary equivalent" }], growthPath: "Officer entry → Deputy Director → Joint Director → Director → DG (specific to agency)", pros: ["High-impact work on national security", "Strong post-retirement opportunities (security advisor roles)", "Cabinet Sec-equivalent senior comp + perks"], cons: ["Secretive career — limited public profile", "Stress + workload high", "Family security considerations real"], related: ["ips-officer", "civil-services-prep"], examCodes: ["UPSC_PRELIMS"], outlook: "Stable + critical govt function. Direct IB ACIO recruitment continues yearly.", keywords: ["intelligence officer career", "IB RAW NIA CBI career", "intelligence bureau"] },

  // ─── Business + Management (+4) ─────────────────────────────────────
  { slug: "operations-manager", name: "Operations / Supply Chain Manager", category: "business-mgmt", dek: "Manufacturing + logistics + e-commerce ops. SCM career growing with ecomm + manufacturing PLI.", whatTheyDo: "Ops managers run production + supply chain. Specialisations: plant ops, supply chain planning, logistics, e-commerce ops, last-mile. Career across manufacturing + retail + ecomm + 3PL.", dayToDay: ["Production planning + scheduling", "Inventory + warehouse management", "Vendor + supplier coordination", "Cost + quality KPIs review", "Cross-functional with sales + finance"], entryRoutes: [{ title: "BTech / B.Com → MBA Operations → Job", body: "IIM-A/B/C/L Ops; ISCM Mumbai; SP Jain ops PG." }], qualifications: ["Bachelor's + MBA Operations / SCM", "APICS / CSCP certifications strong signal"], skills: ["SAP + ERP fluency", "Lean + Six Sigma (Green/Black Belt)", "Forecasting + inventory mgmt", "Negotiation + vendor mgmt"], salaryBands: [{ experience: "MBA Fresh", band: "₹10 - ₹25 LPA" }, { experience: "5-10 yr", band: "₹20 - ₹50 LPA" }, { experience: "Senior + COO Operations", band: "₹50 LPA - ₹2 Cr+" }], growthPath: "Ops Manager → Sr Manager → AVP Ops → VP → COO", topEmployers: ["HUL, ITC, Nestlé, P&G (FMCG manufacturing)", "Flipkart, Amazon India, Reliance Retail (ecomm)", "Maruti, Tata Motors, Mahindra (auto)", "Delhivery, BlueDart, Ekart (3PL)"], pros: ["Manufacturing renaissance + ecomm boom", "Cross-functional senior path", "Strong long-term career stability"], cons: ["Plant postings often remote", "High stress during peak seasons", "Pay below tech + finance MBA roles"], related: ["product-manager", "marketing-manager", "management-consultant"], examCodes: ["CAT"], outlook: "Strong + growing. PLI + ecomm + auto + retail expansion driving SCM demand.", keywords: ["operations manager career", "supply chain career india", "operations MBA salary"] },
  { slug: "hr-manager", name: "HR Manager + Talent Acquisition", category: "business-mgmt", dek: "People management + recruiting + culture. MBA HR or psychology-led paths.", whatTheyDo: "HR managers handle recruiting, employee relations, learning + development, compensation + benefits, organisational design, compliance. Strategic HR moves into culture + change leadership.", dayToDay: ["Recruiting + interview coordination", "Employee onboarding + offboarding", "Compensation + benefits administration", "Performance review cycles", "Policy + compliance"], entryRoutes: [{ title: "Bachelor's + MBA HR → HR role", body: "TISS, XLRI, MDI top HR programmes." }, { title: "Psychology / OB Master's → HR specialist", body: "Industrial-Organisational Psychology PG opens HR research + IO consulting." }], qualifications: ["Bachelor's + MBA HR", "TISS HR / XLRI HR for senior roles"], skills: ["Recruiting + interviewing", "Employment law + compliance", "Compensation design + analytics", "Conflict resolution + employee relations", "Change mgmt"], salaryBands: [{ experience: "MBA Fresh", band: "₹6 - ₹18 LPA" }, { experience: "5 yr", band: "₹15 - ₹30 LPA" }, { experience: "Senior + CHRO", band: "₹40 LPA - ₹2 Cr+" }], growthPath: "HR Exec → HR Manager → HRBP → Sr HRBP → CHRO / VP People", topEmployers: ["HUL, ITC, P&G (FMCG HR)", "Microsoft, Google, Amazon India (tech HR)", "Flipkart, Razorpay, CRED (Indian product HR)"], pros: ["People-leadership skill set", "Cross-industry portable", "CHRO roles + transition to GC/COO possible"], cons: ["Pay below product / finance MBA tracks", "Compliance work can feel transactional", "Layoffs hit HR teams disproportionately"], related: ["management-consultant", "marketing-manager"], examCodes: ["CAT"], outlook: "Stable. Strategic HR + IO Psych roles growing.", keywords: ["HR manager career", "HR MBA salary india", "talent acquisition career"] },
  { slug: "entrepreneur-founder", name: "Entrepreneur / Startup Founder", category: "business-mgmt", dek: "Build a company from scratch. High-risk, high-reward. Y Combinator, IIM incubator, bootstrap routes.", whatTheyDo: "Founders build companies. Day 1 to ~1000 employees involves selling, building, hiring, fundraising, customer support, operations — all of it personally early on.", dayToDay: ["Customer + market research", "Product + roadmap decisions", "Hiring + team building", "Fundraising + investor management", "Operations + customer support"], entryRoutes: [{ title: "Domain expertise + idea + co-founder → MVP", body: "No formal entry — most start while employed OR after a degree." }, { title: "Y Combinator / accelerators", body: "Bessemer, Sequoia Surge, Antler, YC India — formal acceleration." }], qualifications: ["No specific qualification needed", "Industry experience + customer insight"], skills: ["Resourcefulness + scrappy execution", "Sales + storytelling", "Hiring + team building", "Fundraising fluency", "Resilience + delayed gratification"], salaryBands: [{ experience: "Founding (0-1 yr)", band: "₹0 - ₹10 LPA, often own savings", note: "Most founders are unpaid for the first year+; pay-yourself comes after PMF + Series A" }, { experience: "Series A funded (2-4 yr)", band: "₹20 - ₹60 LPA cash + equity" }, { experience: "Successful exit", band: "₹0 LPA salary; ₹crore-class equity outcome", note: "Most startups don't exit; expected value is bimodal" }], growthPath: "Founder → Co-founder + Team → Series A → Series B+ → IPO / Acquisition / Continued growth", pros: ["Total ownership of trajectory", "Outsize financial outcomes possible (but rare)", "Skill compounding rate highest of any career"], cons: ["~90% startups fail; capital + time both lost", "Mental health + stress major risk", "No safety net; family/financial reliance on founder"], related: ["product-manager", "management-consultant", "investment-banker"], examCodes: [], outlook: "Cyclical. Funding winters reduce starting rate but increase quality. India startup ecosystem maturing.", keywords: ["startup founder india", "entrepreneur career", "Y Combinator india"] },
  { slug: "venture-capital-analyst", name: "Venture Capital + Private Equity Analyst", category: "business-mgmt", dek: "Invest other people's money in startups + private companies. Top-tier finance career.", whatTheyDo: "VCs (early-stage investors) + PE (later-stage + buyouts) source, evaluate, invest, and manage portfolio companies. Roles: Analyst → Associate → Principal → Partner.", dayToDay: ["Deal sourcing (founder + intermediary meetings)", "Market + competitive research", "Financial modelling + valuation", "Investment memos + IC meetings", "Portfolio company support"], entryRoutes: [{ title: "MBB consulting → VC associate", body: "Most common Indian VC entry." }, { title: "IB analyst → PE analyst", body: "PE prefers ex-bankers." }, { title: "Founder background → VC", body: "Some successful founders pivot to investing." }], qualifications: ["Top MBA / CA / CFA", "Pre-VC experience (consulting/IB/operating)"], skills: ["Financial modelling + valuation", "Industry analysis", "Founder + market judgement", "Communication + storytelling", "Network building"], salaryBands: [{ experience: "Analyst", band: "₹20 - ₹40 LPA + carry" }, { experience: "Associate", band: "₹35 - ₹70 LPA + carry" }, { experience: "Principal + Partner", band: "₹70 LPA - ₹5 Cr+ + significant carry" }], growthPath: "Analyst → Associate → Sr Associate → Principal → Partner → Managing Partner", topEmployers: ["VC: Sequoia (Peak XV), Accel, Lightspeed, Nexus, Elevation", "PE: KKR, Blackstone, Bain Capital, Temasek India", "Family offices + sovereign wealth funds"], pros: ["Among highest-paid finance roles at senior levels", "Industry network + influence substantial", "Founder-adjacent learning"], cons: ["Sub-30 entry roles limited; mostly post-MBA/MBB", "Carry takes 7-10 years to realise", "Slow learning curve vs operating roles"], related: ["investment-banker", "management-consultant", "entrepreneur-founder"], examCodes: ["CAT"], outlook: "Mixed. VC pullback in 2023-24; PE continuing to scale. Long-term India growing.", keywords: ["venture capital career india", "VC associate salary", "private equity india"] },

  // ─── Media + Communications (+3) ────────────────────────────────────
  { slug: "filmmaker-director", name: "Filmmaker / Director", category: "media-comms", dek: "Films, web series, ads, music videos. Mumbai/Hyderabad/Chennai industry + indie + ad world.", whatTheyDo: "Directors interpret screenplays into films/shows/ads. Career routes: assistant director → director (mainstream films), self-produced indie, OTT direct, ad film direction.", dayToDay: ["Pre-production (casting, location, storyboards)", "Production (shoot)", "Post-production (edit, sound, VFX, music)", "Pitching + selling projects", "Festival circuit + distribution"], entryRoutes: [{ title: "Film school (FTII, SRFTI, Whistling Woods) → Asst Director → Director", body: "Most credentialled route. AD years are non-negotiable apprenticeship." }, { title: "Self-taught + short films → Festival recognition", body: "Indie route; harder but possible." }], qualifications: ["FTII / SRFTI / Whistling Woods PG preferred", "Strong showreel + completed shorts"], skills: ["Visual storytelling + composition", "Working with actors", "Production management", "Editing + post fundamentals", "Resilience + persistence"], salaryBands: [{ experience: "Asst Director (4-7 yr)", band: "₹3 - ₹8 LPA" }, { experience: "First-feature director", band: "Variable — ₹5-30 LPA + share of profit" }, { experience: "Established director", band: "₹50 LPA - ₹10 Cr+ per film", note: "Highly bimodal; most don't reach establishment." }], growthPath: "AD → Sr AD → First-feature director → Established director", topEmployers: ["Yash Raj, Dharma, Excel Entertainment, Junglee Pictures (production houses)", "Ad film: Equinox, Nirvana Films, Chrome Pictures", "OTT: Netflix India, Amazon Prime, Hotstar Specials"], pros: ["Creative ownership", "Bollywood/OTT growth", "International festivals (Cannes, Sundance) open"], cons: ["Long, unpaid years as AD", "Industry highly relationship-driven", "Most don't make it past first feature"], related: ["animator-vfx-artist", "journalist"], examCodes: [], outlook: "Strong with OTT explosion + ad market growth.", keywords: ["filmmaker career india", "director career bollywood", "FTII career"] },
  { slug: "social-media-influencer", name: "Social Media Creator / Influencer", category: "media-comms", dek: "Build an audience on Instagram/YouTube/Twitter/LinkedIn. Brand deals + own products.", whatTheyDo: "Creators build audiences on platforms (Instagram, YouTube, Twitter/X, LinkedIn). Monetisation: brand deals (sponsored content), own products (courses, merch), ad revenue (YouTube), affiliate.", dayToDay: ["Content ideation + scripting", "Filming + editing", "Engagement + community management", "Brand negotiation + briefing", "Analytics review"], entryRoutes: [{ title: "Niche + skill + consistent output", body: "No formal entry — start posting + build audience + monetise. 1-3 years typical to ₹income." }], qualifications: ["None formal", "Strong niche + content output"], skills: ["Content production (video editing, photography, writing)", "Platform algorithm intuition", "Brand partnership negotiation", "Personal brand management", "Stamina for consistent output"], salaryBands: [{ experience: "First year (0-50k followers)", band: "₹0 - ₹3 LPA" }, { experience: "Established (100k-500k)", band: "₹6 - ₹30 LPA" }, { experience: "Large (1M+)", band: "₹30 LPA - ₹5 Cr+/year", note: "Highly variable + bimodal." }], growthPath: "Creator → Established creator → Multi-channel / own products / agency / merchandise", pros: ["Foreign-payroll brand deals common", "Own brand control", "Career flexibility unmatched"], cons: ["Income volatile + platform-dependent", "Burnout real — must produce constantly", "Algorithm changes can crater income overnight"], related: ["content-writer", "marketing-manager", "graphic-designer"], examCodes: [], outlook: "Growing but increasingly competitive. Niche specialisation + B2B creators are durable.", keywords: ["influencer career india", "content creator salary", "youtube creator career"] },
  { slug: "pr-communications", name: "PR + Communications Professional", category: "media-comms", dek: "Manage public image of companies + individuals. Agency + in-house corp comm paths.", whatTheyDo: "PR pros manage media relations, crisis communication, corporate reputation, internal comms. Career split: agency (Edelman, Genesis BCW, Adfactors) + in-house corporate comms.", dayToDay: ["Press release drafting + distribution", "Journalist + influencer relations", "Crisis communication", "Internal employee communications", "Brand + reputation tracking"], entryRoutes: [{ title: "Mass Comm / Journalism UG → Agency / In-house", body: "IIMC, Symbiosis Mass Comm common entries." }, { title: "MBA Marketing + PR focus", body: "MICA, NMIMS marketing comms." }], qualifications: ["Bachelor's + Mass Comm / Journalism PG preferred"], skills: ["Writing + media pitching", "Crisis comms", "Stakeholder management", "Social media + digital comms"], salaryBands: [{ experience: "Fresh", band: "₹3 - ₹6 LPA" }, { experience: "5 yr Sr Account Manager", band: "₹8 - ₹18 LPA" }, { experience: "Senior + Head Comms / CCO", band: "₹25 LPA - ₹1 Cr+" }], growthPath: "Exec → Sr Exec → Account Mgr → Sr Mgr → AVP → Head Communications / CCO", topEmployers: ["Adfactors PR, Genesis BCW, Edelman, Ogilvy PR (agencies)", "Reliance, Tata, Adani corporate comms", "Tech: Flipkart, Razorpay, CRED comms teams"], pros: ["Strategic role with senior visibility", "Cross-industry portable", "Senior comp substantial"], cons: ["Agency hours intense", "Reputation work is high-pressure", "Crisis cycles unpredictable"], related: ["journalist", "marketing-manager", "content-writer"], examCodes: [], outlook: "Strong. Brand reputation + crisis comms growing.", keywords: ["PR career india", "communications career", "corporate comms salary"] },

  // ─── Skilled Trades + Agri (+3) ─────────────────────────────────────
  { slug: "iti-plumber", name: "ITI Plumber", category: "skilled-trade", dek: "1-year ITI trade. Construction + maintenance + self-employed contracting.", whatTheyDo: "Plumbers install + maintain plumbing systems — pipes, fixtures, water + drainage. Real-estate construction boom + maintenance work in urban housing.", dayToDay: ["Pipe + fixture installation", "Leak diagnosis + repair", "New construction plumbing layouts", "Customer interactions (self-employed)", "Material sourcing + cost estimation"], entryRoutes: [{ title: "Class 10 → ITI Plumber (1 yr)", body: "NCVT cert; apprenticeship optional." }], qualifications: ["Class 10", "ITI Plumber"], skills: ["Pipework + fixtures knowledge", "Tool handling", "Customer + cost communication", "Math basics for estimation"], salaryBands: [{ experience: "Junior", band: "₹1.5 - ₹3 LPA" }, { experience: "5 yr", band: "₹3 - ₹8 LPA" }, { experience: "Senior + contractor", band: "₹6 - ₹20 LPA+" }], growthPath: "Apprentice → Plumber → Senior → Contractor with crew", topEmployers: ["Construction contractors (L&T, Shapoorji)", "Real estate developers", "Self-employed + contracting"], pros: ["Self-employment scalable", "Demand always present", "Quick entry (1 year)"], cons: ["Physical work + occasional rough sites", "Pay-ceiling without contracting", "Seasonal demand variation"], related: ["iti-electrician", "iti-fitter"], examCodes: [], outlook: "Strong with real estate + infrastructure growth.", keywords: ["ITI plumber career", "plumber salary india", "plumbing contractor"] },
  { slug: "agritech-entrepreneur", name: "Agritech Founder / Specialist", category: "agriculture", dek: "Build tech solutions for agriculture — DeHaat, AgroStar, Cropin etc. Growing sector.", whatTheyDo: "Agritech professionals build + sell technology solutions to farmers + agri supply chain. Hardware (sensors, drones), software (apps, analytics), input distribution, market linkage.", dayToDay: ["Field visits to farmers", "Product design + feedback loops", "Sales + supply chain coordination", "Field trial + data analysis", "Cross-functional with tech + ops teams"], entryRoutes: [{ title: "BSc Agri / Agri Engg → Agritech firm", body: "Direct entry as field officer / product specialist." }, { title: "BTech / MBA → Agritech founder / senior role", body: "Tech + business strategy + agri-domain combination strong." }], qualifications: ["BSc Agri or BTech + agri-domain interest", "MBA helpful for senior roles"], skills: ["Agri-domain depth", "Field-team management", "Tech literacy (data, apps, IoT basics)", "Hindi/regional language fluency"], salaryBands: [{ experience: "Fresh field officer", band: "₹3 - ₹6 LPA" }, { experience: "5 yr senior", band: "₹8 - ₹20 LPA" }, { experience: "Founder / Sr Mgmt", band: "₹20 LPA - ₹1 Cr+ + equity" }], growthPath: "Field officer → Manager → Senior → Director Agri Ops", topEmployers: ["DeHaat, AgroStar, Cropin, Ninjacart (Indian agritech)", "Bayer + Syngenta + Corteva (MNC R&D)", "Tata Trent + Reliance Retail (agri-retail backend)"], pros: ["Mission-driven impact + scale", "Sector growing 25%+ yearly", "Cross-discipline (tech + agri + business)"], cons: ["Rural postings + field work demanding", "Pay below tech roles at similar tenure", "Industry margins tight"], related: ["agriculture-officer", "product-manager"], examCodes: [], outlook: "Strong + growing. Indian agritech market expanding rapidly.", keywords: ["agritech career india", "agritech startup", "DeHaat AgroStar career"] },
  { slug: "food-technologist", name: "Food Technologist + Food Safety Officer", category: "agriculture", dek: "Product development, quality, food safety in food manufacturing + FSSAI roles.", whatTheyDo: "Food technologists develop + improve food products, ensure quality + safety. Career: FMCG product R&D, food safety regulators (FSSAI), QA at manufacturing plants, food-tech startups.", dayToDay: ["New product development + sensory testing", "Quality control + food safety audits", "Regulatory compliance (FSSAI)", "Process improvement at plant", "Vendor + ingredient evaluation"], entryRoutes: [{ title: "BTech Food Tech / BSc Food Science → Job", body: "IIT-Kharagpur Food Tech, CFTRI Mysore, NIFTEM Sonipat are top." }, { title: "FSSAI Food Safety Officer exam", body: "Govt FSSO recruitment via state PSC + UPSC for FSSAI." }], qualifications: ["BTech Food Tech / BSc Food Science", "MSc / MTech for R&D + Senior FSO roles"], skills: ["Food chemistry + microbiology", "Sensory evaluation", "FSSAI + Codex regulations", "HACCP + ISO 22000", "Process engineering"], salaryBands: [{ experience: "Fresh", band: "₹3 - ₹6 LPA" }, { experience: "5 yr", band: "₹6 - ₹15 LPA" }, { experience: "Senior + R&D Head", band: "₹15 - ₹40 LPA" }], growthPath: "Asst Food Tech → Food Tech → Sr → R&D Manager → Head R&D / Director Quality", topEmployers: ["HUL, Nestlé, ITC, Britannia, Parle (FMCG R&D)", "FSSAI + state food safety dept (govt)", "Food-tech: Licious, FreshToHome, MTR, ID Fresh"], pros: ["FMCG + food-tech sector growing", "Public-health impact direct", "Govt FSO career stable + pensioned"], cons: ["Plant-based postings common", "R&D innovation cycles long", "Pay below BTech at similar tenure"], related: ["agriculture-officer", "psu-engineer"], examCodes: [], outlook: "Strong + growing. Food-tech + processed food sector expanding rapidly.", keywords: ["food technologist career", "FSSAI food safety officer", "food science career india"] },

  // ─── Aviation + Maritime (+2) ───────────────────────────────────────
  { slug: "commercial-pilot", name: "Commercial Pilot (Airlines)", category: "defence", dek: "Fly commercial aircraft for airlines (IndiGo, Air India, Vistara). DGCA CPL + ATPL paths.", whatTheyDo: "Commercial pilots fly passengers + cargo aircraft. Career split: scheduled airlines (IndiGo, Air India), private charter, cargo + medevac, instructor.", dayToDay: ["Pre-flight checks + briefings", "Actual flying (3-8 hours per flight)", "Layovers + rest in destinations", "Continuing training + simulator sessions", "Medical fitness regimen"], entryRoutes: [{ title: "Class 12 (PCM) → CPL training (₹35-50L cost) → Type rating → Airline", body: "Most direct. Flight schools (IGRUA, BFTI) + DGCA exam + 200 flight hours minimum." }, { title: "Air Force / Navy fighter pilot → Airline pivot", body: "Senior military pilots transition to airlines after retirement." }], qualifications: ["Class 12 PCM", "Commercial Pilot Licence (CPL) — DGCA", "Type rating on specific aircraft (A320, B737, ATR)"], skills: ["Flying skills + flight school training", "Strong eyesight + medical fitness", "Decision-making under pressure", "Crew resource management"], salaryBands: [{ experience: "First Officer (entry)", band: "₹8 - ₹15 LPA + flying allowance" }, { experience: "Senior FO / Captain", band: "₹35 - ₹80 LPA + flying allowance" }, { experience: "Sr Capt + Instructor + Wide-body", band: "₹1 - ₹3 Cr+" }], growthPath: "Cadet Pilot → First Officer → Senior FO → Captain → Senior Capt → Examiner / Instructor", topEmployers: ["IndiGo, Air India, Vistara, SpiceJet, Akasa Air (airlines)", "Charter + corporate aviation", "Foreign airlines (Gulf carriers — Emirates, Qatar, Etihad)"], pros: ["High-paying once Captain (8-10 years)", "Travel + interesting work", "Strong demand with Indian aviation expansion"], cons: ["₹35-50L training cost (no scholarships)", "Medical fitness lifelong requirement", "Long irregular hours; family disruption"], related: ["armed-forces-officer", "merchant-navy-officer"], examCodes: [], outlook: "Very strong. Indian airline fleets doubling by 2030; severe pilot shortage.", keywords: ["commercial pilot career india", "pilot salary india", "CPL training career"] },
  { slug: "naval-architect-marine", name: "Naval Architect + Marine Engineer", category: "engineering", dek: "Design + build ships + offshore structures. IIT-M Naval Arch + DGS routes.", whatTheyDo: "Naval architects design ships, oil rigs, submarines, offshore structures. Marine engineers operate + maintain ship engine rooms. Career routes: shipyards, classification societies (DNV, ABS), oil + gas offshore, defence.", dayToDay: ["CAD + simulation (NAPA, ShipFlow)", "Stability + hydrodynamic analysis", "Shipyard supervision (build)", "Classification + survey", "Marine engineering operations (engine + cargo)"], entryRoutes: [{ title: "JEE → IIT-Madras Naval Architecture BTech", body: "India's only IIT Naval Arch programme." }, { title: "GME (Graduate Marine Engineering) → Marine Engineer", body: "1-year programme for BTech graduates; sea service then COC." }], qualifications: ["BTech Naval Architecture / Marine Engineering / Mechanical + GME"], skills: ["Naval architecture principles", "CAD + simulation tools", "Materials + ship structures", "Marine engines (for marine engineering)"], salaryBands: [{ experience: "Fresh shore", band: "₹5 - ₹10 LPA" }, { experience: "Sea-going Marine Engineer", band: "₹25 - ₹80 LPA tax-free (see merchant-navy)" }, { experience: "Senior NA / Chief Engineer", band: "₹40 LPA - ₹1.5 Cr+" }], growthPath: "Naval Arch → Sr Designer → Project Manager → Director Engineering. Marine Engr: see merchant-navy career.", topEmployers: ["L&T Shipbuilding, Cochin Shipyard, GRSE, Mazagon Dock", "DNV, ABS, Lloyd's (classification)", "Shell, BP, Reliance Offshore (oil + gas)"], pros: ["Strong global demand", "Foreign opportunities + tax-free sea-going pay", "Niche specialisation"], cons: ["Small India industry vs global", "Sea-going has same family-life issues as merchant navy", "Naval Arch jobs concentrated in few firms"], related: ["mechanical-engineer", "merchant-navy-officer"], examCodes: ["JEE_MAIN"], outlook: "Strong. Indian shipbuilding + offshore expanding.", keywords: ["naval architect career", "marine engineer salary", "IIT Madras naval arch"] },
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
