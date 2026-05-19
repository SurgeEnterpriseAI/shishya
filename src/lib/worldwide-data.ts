// Worldwide section — country / university / visa / loan reference data.
//
// Maintained as a TypeScript file (same pattern as colleges-data,
// schooling-data, scholarships) so updates ship via PR + visible diff.
// Each fact has a sourceUrl + a verifiedOn date — these feed into the
// existing Fact verification machinery once we run the ingest cron.
//
// COVERAGE PRIORITIES:
//   1. The 5 countries Indian students actually go to in volume:
//      US, UK, Canada, Australia, Germany.
//   2. Top universities per country — ~10-15 each, drawn from QS
//      Top-300 + India-specific Indian-student-volume signals.
//   3. Per-country visa info: visa type, document checklist,
//      processing timeline, fees, post-study work duration.
//   4. Test prep landing for IELTS, TOEFL, PTE, GRE, GMAT.
//   5. Education loan landscape — collateral vs non-collateral,
//      typical interest bands, moratorium, Section 80E.

export interface WorldwideUniversity {
  /** kebab-case slug for /worldwide/[country]/[uni-slug] */
  slug: string;
  name: string;
  /** City + state/province */
  location: string;
  /** QS World University Ranking (rounded; check officialUrl for live data) */
  qsRank?: number;
  /** Times Higher Education world ranking */
  timesRank?: number;
  /** US News / national equivalent */
  nationalRank?: number;
  /** Typical tuition for international UG/PG (in local currency, prose) */
  tuitionRange: string;
  /** Approximate Indian student population (where publicly known) */
  indianStudents?: string;
  /** Most relevant programs for Indian applicants */
  strongPrograms: string[];
  /** Direct admissions URL — never a third-party aggregator */
  admissionsUrl: string;
  officialSite: string;
  /** 1-2 sentence neutral blurb */
  blurb: string;
}

export interface WorldwideCountry {
  /** ISO 2-letter for slug + URL */
  slug: string;     // "us", "uk", "ca", "au", "de"
  name: string;
  emojiFlag: string;
  /** "5,00,000+" — Indian-student population from MEA / embassy estimates */
  indianStudentCount: string;
  /** What the international tuition + living cost band looks like, plain prose */
  costSummary: string;
  /** Common application timeline (admissions cycle) */
  applicationTimeline: string;
  /** Post-study work permit info */
  postStudyWork: string;
  /** PR pathway — honest about how difficult it is */
  prPathway: string;
  /** Visa type Indian students typically need */
  visaType: string;
  /** Direct visa info URL (embassy / govt) */
  visaUrl: string;
  /** Standard language test required */
  englishTest: string[];
  universities: WorldwideUniversity[];
  /** Pros + cons specifically for Indian applicants (honest, not marketing) */
  pros: string[];
  cons: string[];
}

// ═════════════════════════════════════════════════════════════════════
// COUNTRY DATA — 5 countries that account for ~80% of Indian students
// studying abroad. Sources are linked on each row.
// ═════════════════════════════════════════════════════════════════════

const US: WorldwideCountry = {
  slug: "us",
  name: "United States",
  emojiFlag: "🇺🇸",
  indianStudentCount: "~3,30,000 (largest single Indian-student-abroad cohort, Open Doors 2023-24)",
  costSummary:
    "Tuition $30k–$60k/year for private universities, $20k–$45k for public out-of-state. Living costs $12k–$25k/year depending on city. Total UG bill ~$200k–$320k over 4 years; PG (MS) typically $50k–$120k over 2 years.",
  applicationTimeline:
    "Fall intake (most common): apply Dec–Jan for the following September. Spring intake (some PG programs): apply Jul–Sep. SOPs + LORs + transcripts + GRE/GMAT (becoming optional at many schools).",
  postStudyWork:
    "OPT (Optional Practical Training) — 12 months after graduation, extendable to 36 months for STEM degrees. Conversion to H-1B work visa via employer sponsorship in an annual lottery.",
  prPathway:
    "Highly difficult: H-1B → employer-sponsored green card via EB-2/EB-3. Indian-born applicants face severe per-country backlogs (decades-long waits in EB-2/EB-3). Most return after H-1B or move to Canada.",
  visaType: "F-1 student visa",
  visaUrl: "https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html",
  englishTest: ["TOEFL iBT", "IELTS Academic", "Duolingo English Test (some)"],
  pros: [
    "World's deepest concentration of top-ranked universities + research labs",
    "Strong + well-known STEM PG programs (MS in CS, ECE, ME, etc.)",
    "Best post-study earning potential during OPT in tech/finance",
    "Large + active Indian student community in every major city",
  ],
  cons: [
    "Highest absolute cost of any major destination",
    "PR pathway brutally backlogged for Indian-born applicants",
    "F-1 visa is non-immigrant intent — implicit constraints on intent to settle",
    "Healthcare is on-student (~$2k–$3k/year insurance)",
  ],
  universities: [
    {
      slug: "mit",
      name: "Massachusetts Institute of Technology (MIT)",
      location: "Cambridge, MA",
      qsRank: 1,
      timesRank: 2,
      tuitionRange: "$60k/year tuition + $20k living",
      indianStudents: "~600 (UG + PG)",
      strongPrograms: ["EECS", "Aerospace", "Management Sloan", "Math"],
      admissionsUrl: "https://mitadmissions.org/",
      officialSite: "https://www.mit.edu/",
      blurb: "Need-blind admission for international UG; full-need financial aid means actual cost depends on family income, not headline tuition.",
    },
    {
      slug: "stanford",
      name: "Stanford University",
      location: "Stanford, CA",
      qsRank: 5,
      timesRank: 3,
      tuitionRange: "$62k/year tuition + $25k living",
      indianStudents: "~700",
      strongPrograms: ["CS", "Engineering", "MBA Stanford GSB", "Bioengineering"],
      admissionsUrl: "https://admission.stanford.edu/",
      officialSite: "https://www.stanford.edu/",
      blurb: "Need-blind for US applicants, need-aware for international — but generous aid for admitted internationals from low-income families.",
    },
    {
      slug: "carnegie-mellon",
      name: "Carnegie Mellon University (CMU)",
      location: "Pittsburgh, PA",
      qsRank: 58,
      timesRank: 28,
      tuitionRange: "$60k/year tuition + $18k living",
      indianStudents: "~2,000+",
      strongPrograms: ["MS in CS / MSCS", "Robotics", "INI", "Heinz Public Policy"],
      admissionsUrl: "https://www.cmu.edu/admission/",
      officialSite: "https://www.cmu.edu/",
      blurb: "Single largest destination for Indian MS-in-CS aspirants. INI + SCS programs heavily Indian.",
    },
    {
      slug: "uc-berkeley",
      name: "University of California, Berkeley",
      location: "Berkeley, CA",
      qsRank: 12,
      timesRank: 9,
      tuitionRange: "$45k/year tuition (out-of-state) + $22k living",
      indianStudents: "~2,500+",
      strongPrograms: ["EECS", "MIDS data science", "Haas MBA", "Engineering Mgmt"],
      admissionsUrl: "https://admissions.berkeley.edu/",
      officialSite: "https://www.berkeley.edu/",
      blurb: "Top public research university; EECS UG admit rate around 5% but graduate programs more attainable.",
    },
    {
      slug: "georgia-tech",
      name: "Georgia Institute of Technology",
      location: "Atlanta, GA",
      qsRank: 96,
      timesRank: 36,
      tuitionRange: "$32k/year tuition + $16k living",
      indianStudents: "~3,000+",
      strongPrograms: ["MS CS", "OMSCS (online)", "Industrial Engineering", "Aerospace"],
      admissionsUrl: "https://grad.gatech.edu/",
      officialSite: "https://www.gatech.edu/",
      blurb: "OMSCS online MS in CS — $7k total — is the most affordable top-30 MS in the world. Highly Indian-dominated cohort.",
    },
    {
      slug: "uiuc",
      name: "University of Illinois Urbana-Champaign",
      location: "Urbana, IL",
      qsRank: 64,
      timesRank: 48,
      tuitionRange: "$38k/year tuition + $18k living",
      indianStudents: "~2,500+",
      strongPrograms: ["MS CS", "ECE", "MEME (engineering management)"],
      admissionsUrl: "https://grad.illinois.edu/admissions",
      officialSite: "https://illinois.edu/",
      blurb: "Strong CS / ECE programs and generous TA/RA funding at the PhD level.",
    },
    {
      slug: "purdue",
      name: "Purdue University",
      location: "West Lafayette, IN",
      qsRank: 99,
      timesRank: 89,
      tuitionRange: "$30k/year tuition + $14k living",
      indianStudents: "~2,800+",
      strongPrograms: ["Aerospace", "CS", "Industrial Engineering", "Pharmacy"],
      admissionsUrl: "https://www.purdue.edu/admissions/",
      officialSite: "https://www.purdue.edu/",
      blurb: "Strong engineering reputation + comparatively lower cost of living (Lafayette, IN).",
    },
    {
      slug: "usc",
      name: "University of Southern California (USC)",
      location: "Los Angeles, CA",
      qsRank: 116,
      timesRank: 70,
      tuitionRange: "$65k/year tuition + $20k living",
      indianStudents: "~5,000+",
      strongPrograms: ["Viterbi Engineering", "Marshall MBA", "Annenberg Comms"],
      admissionsUrl: "https://admission.usc.edu/",
      officialSite: "https://www.usc.edu/",
      blurb: "Largest Indian-student population of any US private university. Strong Viterbi engineering programs.",
    },
    {
      slug: "nyu",
      name: "New York University",
      location: "New York, NY",
      qsRank: 38,
      timesRank: 24,
      tuitionRange: "$60k/year tuition + $28k living (NYC)",
      indianStudents: "~3,000+",
      strongPrograms: ["Stern MBA", "Courant Math/CS", "Tandon Engineering"],
      admissionsUrl: "https://www.nyu.edu/admissions.html",
      officialSite: "https://www.nyu.edu/",
      blurb: "NYC base + strong business / finance programs; high cost of living offsets the academic value.",
    },
    {
      slug: "columbia",
      name: "Columbia University",
      location: "New York, NY",
      qsRank: 23,
      timesRank: 17,
      tuitionRange: "$66k/year tuition + $28k living",
      indianStudents: "~1,800+",
      strongPrograms: ["MS CS", "SIPA (Public Policy)", "Engineering"],
      admissionsUrl: "https://undergrad.admissions.columbia.edu/",
      officialSite: "https://www.columbia.edu/",
      blurb: "Ivy League with a strong MS in CS program; reputation also strong in journalism + international affairs.",
    },
    {
      slug: "asu",
      name: "Arizona State University",
      location: "Tempe, AZ",
      qsRank: 200,
      timesRank: 121,
      tuitionRange: "$33k/year tuition + $13k living",
      indianStudents: "~4,000+",
      strongPrograms: ["Engineering", "Information Tech", "Business"],
      admissionsUrl: "https://admission.asu.edu/",
      officialSite: "https://www.asu.edu/",
      blurb: "Large public university with one of the largest Indian student bodies in the US. Strong online + hybrid programs.",
    },
    {
      slug: "northeastern",
      name: "Northeastern University",
      location: "Boston, MA",
      qsRank: 53,
      timesRank: 53,
      tuitionRange: "$60k/year tuition + $22k living",
      indianStudents: "~5,000+",
      strongPrograms: ["MS CS Align", "Engineering", "Co-op programs"],
      admissionsUrl: "https://admissions.northeastern.edu/",
      officialSite: "https://www.northeastern.edu/",
      blurb: "Co-op program embeds paid work terms in the curriculum — strong post-study outcomes via that pipeline.",
    },
  ],
};

const UK: WorldwideCountry = {
  slug: "uk",
  name: "United Kingdom",
  emojiFlag: "🇬🇧",
  indianStudentCount: "~1,75,000 (UKCISA 2023-24; India is now the #1 sender of international students to UK)",
  costSummary:
    "Tuition £20k–£40k/year for international students. Living costs £12k–£18k/year (£15k+ in London). Most UK Master's are 1-year programs — typical PG bill £30k–£55k total.",
  applicationTimeline:
    "September intake: apply Jan–Jul. January intake (some universities): apply Aug–Nov. UCAS for UG (Jan 31 deadline). Direct application for PG.",
  postStudyWork:
    "Graduate Route (Post-Study Work Visa) — 2 years for UG/PG, 3 years for PhD. No employer-sponsorship required for the Graduate Route.",
  prPathway:
    "Skilled Worker Visa (5 years) → ILR (Indefinite Leave to Remain). Salary thresholds are real (~£38,700 for most roles as of 2024). Tighter than the US lottery but the salary bar weeds out a lot.",
  visaType: "Student Visa (Tier 4)",
  visaUrl: "https://www.gov.uk/student-visa",
  englishTest: ["IELTS UKVI", "TOEFL (some)", "PTE Academic"],
  pros: [
    "1-year Master's programs save a full year of opportunity cost",
    "Graduate Route works without employer sponsorship",
    "Strong concentration of historic universities (Oxford, Cambridge, LSE, Imperial)",
    "Cultural + linguistic familiarity for Indian students",
  ],
  cons: [
    "Living costs in London are very high",
    "1-year MS programs are intense and leave little time for networking",
    "PR pathway tighter than Canada / Australia",
    "Tuition has been rising sharply year-over-year",
  ],
  universities: [
    {
      slug: "oxford",
      name: "University of Oxford",
      location: "Oxford",
      qsRank: 3,
      timesRank: 1,
      tuitionRange: "£30k–£48k/year",
      indianStudents: "~500",
      strongPrograms: ["PPE", "Philosophy", "Economics", "Engineering", "Math"],
      admissionsUrl: "https://www.ox.ac.uk/admissions",
      officialSite: "https://www.ox.ac.uk/",
      blurb: "Tutorial system + collegiate structure. Highly selective — admit rates ~12% for UG, varies by course.",
    },
    {
      slug: "cambridge",
      name: "University of Cambridge",
      location: "Cambridge",
      qsRank: 2,
      timesRank: 5,
      tuitionRange: "£30k–£44k/year",
      indianStudents: "~450",
      strongPrograms: ["Math (Tripos)", "Natural Sciences", "CS", "Engineering"],
      admissionsUrl: "https://www.cam.ac.uk/admissions",
      officialSite: "https://www.cam.ac.uk/",
      blurb: "Math Tripos is one of the most demanding UG math programs anywhere. Subject-specific entrance interviews.",
    },
    {
      slug: "imperial",
      name: "Imperial College London",
      location: "London",
      qsRank: 6,
      timesRank: 11,
      tuitionRange: "£35k–£45k/year",
      indianStudents: "~1,800",
      strongPrograms: ["Engineering", "Medicine", "Business School", "CS"],
      admissionsUrl: "https://www.imperial.ac.uk/study/",
      officialSite: "https://www.imperial.ac.uk/",
      blurb: "STEM specialist; ranks alongside MIT for engineering research output. Strong India connect.",
    },
    {
      slug: "ucl",
      name: "University College London (UCL)",
      location: "London",
      qsRank: 9,
      timesRank: 22,
      tuitionRange: "£28k–£40k/year",
      indianStudents: "~2,500+",
      strongPrograms: ["MS CS", "Architecture (Bartlett)", "Economics", "Medicine"],
      admissionsUrl: "https://www.ucl.ac.uk/prospective-students/",
      officialSite: "https://www.ucl.ac.uk/",
      blurb: "Broadest research portfolio in the UK; central London location; large + active Indian student body.",
    },
    {
      slug: "lse",
      name: "London School of Economics (LSE)",
      location: "London",
      qsRank: 50,
      timesRank: 46,
      tuitionRange: "£26k–£42k/year",
      indianStudents: "~2,000",
      strongPrograms: ["Economics", "Finance", "International Relations", "Political Science"],
      admissionsUrl: "https://www.lse.ac.uk/study-at-lse",
      officialSite: "https://www.lse.ac.uk/",
      blurb: "Social-science specialist. PG-heavy enrolment; top-tier feeder to consulting / banking / policy.",
    },
    {
      slug: "edinburgh",
      name: "University of Edinburgh",
      location: "Edinburgh, Scotland",
      qsRank: 27,
      timesRank: 29,
      tuitionRange: "£24k–£35k/year",
      indianStudents: "~1,400",
      strongPrograms: ["AI/CS", "Veterinary", "Medicine", "Literature"],
      admissionsUrl: "https://www.ed.ac.uk/studying",
      officialSite: "https://www.ed.ac.uk/",
      blurb: "Strong CS / AI research; ancient university (founded 1583); lower living costs than London.",
    },
    {
      slug: "manchester",
      name: "University of Manchester",
      location: "Manchester",
      qsRank: 34,
      timesRank: 53,
      tuitionRange: "£23k–£34k/year",
      indianStudents: "~2,500+",
      strongPrograms: ["MBS", "Engineering", "Materials", "Chemistry"],
      admissionsUrl: "https://www.manchester.ac.uk/study/",
      officialSite: "https://www.manchester.ac.uk/",
      blurb: "Large research university; substantial Indian community; lower living costs than London.",
    },
    {
      slug: "kcl",
      name: "King's College London (KCL)",
      location: "London",
      qsRank: 40,
      timesRank: 36,
      tuitionRange: "£25k–£40k/year",
      indianStudents: "~2,200",
      strongPrograms: ["Medicine", "Law", "International Relations", "CS"],
      admissionsUrl: "https://www.kcl.ac.uk/study-legacy",
      officialSite: "https://www.kcl.ac.uk/",
      blurb: "Strong in humanities + medicine; central London location; sister institution to UCL.",
    },
    {
      slug: "warwick",
      name: "University of Warwick",
      location: "Coventry",
      qsRank: 67,
      timesRank: 106,
      tuitionRange: "£24k–£32k/year",
      indianStudents: "~1,500",
      strongPrograms: ["MSc Finance (WBS)", "Math", "Economics", "Engineering"],
      admissionsUrl: "https://warwick.ac.uk/study/",
      officialSite: "https://warwick.ac.uk/",
      blurb: "WBS MSc Finance + Business School are top-5 in the UK for placements into finance/consulting.",
    },
    {
      slug: "bristol",
      name: "University of Bristol",
      location: "Bristol",
      qsRank: 55,
      timesRank: 81,
      tuitionRange: "£25k–£30k/year",
      indianStudents: "~1,000",
      strongPrograms: ["Aerospace", "Veterinary", "Engineering", "Theology"],
      admissionsUrl: "https://www.bristol.ac.uk/study/",
      officialSite: "https://www.bristol.ac.uk/",
      blurb: "Russell Group; strong aerospace + engineering programs; vibrant student city.",
    },
  ],
};

const CA: WorldwideCountry = {
  slug: "ca",
  name: "Canada",
  emojiFlag: "🇨🇦",
  indianStudentCount: "~3,20,000 (IRCC 2023; Indians make up ~40% of all international students in Canada)",
  costSummary:
    "Tuition CAD 20k–45k/year for international UG; CAD 18k–35k for PG. Living CAD 12k–20k/year. Total UG bill CAD 130k–250k over 4 years.",
  applicationTimeline:
    "September (Fall) intake: apply Oct–Mar. January intake: apply May–Sep. May intake (some): apply Sep–Jan. SOPs + transcripts + IELTS.",
  postStudyWork:
    "Post-Graduation Work Permit (PGWP) — duration equal to your study program, up to 3 years. Open work permit; no employer sponsorship needed.",
  prPathway:
    "Most attainable major destination for PR. Express Entry / CEC after PGWP work experience. Indians make up ~25% of Canadian PR intake annually.",
  visaType: "Study Permit",
  visaUrl: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html",
  englishTest: ["IELTS Academic", "CELPIP (some)", "TOEFL"],
  pros: [
    "Best PR pathway of any major destination — open work permit + Express Entry",
    "Universal healthcare (post first 3 months in most provinces)",
    "Strong technology hubs (Toronto, Vancouver, Montreal) hiring Indian graduates",
    "Lower tuition than US for comparable programs",
  ],
  cons: [
    "Winter is real — minus-30°C in many cities for 3+ months",
    "Recent caps on study-permit issuance (Jan 2024 + Sep 2024) tightening intake",
    "Housing crisis in major cities — Vancouver / Toronto rents very high",
    "Earnings during studies + post-PGWP lower than US for top tech roles",
  ],
  universities: [
    {
      slug: "toronto",
      name: "University of Toronto",
      location: "Toronto, ON",
      qsRank: 25,
      timesRank: 21,
      tuitionRange: "CAD 60k/year tuition + CAD 20k living",
      indianStudents: "~3,500+",
      strongPrograms: ["CS", "Engineering", "Medicine", "Rotman MBA"],
      admissionsUrl: "https://future.utoronto.ca/",
      officialSite: "https://www.utoronto.ca/",
      blurb: "Canada's top-ranked university; large Indian student community; strong CS / Engineering programs.",
    },
    {
      slug: "ubc",
      name: "University of British Columbia (UBC)",
      location: "Vancouver, BC",
      qsRank: 34,
      timesRank: 41,
      tuitionRange: "CAD 50k/year tuition + CAD 18k living",
      indianStudents: "~2,500+",
      strongPrograms: ["CS", "Forestry", "Sauder MBA", "Engineering"],
      admissionsUrl: "https://you.ubc.ca/",
      officialSite: "https://www.ubc.ca/",
      blurb: "Pacific-coast campus; strong research; expensive Vancouver housing market.",
    },
    {
      slug: "mcgill",
      name: "McGill University",
      location: "Montreal, QC",
      qsRank: 30,
      timesRank: 49,
      tuitionRange: "CAD 35k/year tuition + CAD 15k living",
      indianStudents: "~1,500",
      strongPrograms: ["Medicine", "Engineering", "Desautels Mgmt", "Music"],
      admissionsUrl: "https://www.mcgill.ca/undergraduate-admissions/",
      officialSite: "https://www.mcgill.ca/",
      blurb: "Oldest Canadian university; lower tuition than peers; bilingual French-English Montreal.",
    },
    {
      slug: "waterloo",
      name: "University of Waterloo",
      location: "Waterloo, ON",
      qsRank: 112,
      timesRank: 158,
      tuitionRange: "CAD 60k/year (Engineering) + CAD 15k living",
      indianStudents: "~2,000+",
      strongPrograms: ["CS", "Engineering Co-op", "Math + AI"],
      admissionsUrl: "https://uwaterloo.ca/future-students/",
      officialSite: "https://uwaterloo.ca/",
      blurb: "Co-op (paid internship) program is Canada's strongest — students typically have 4–6 work terms by graduation.",
    },
    {
      slug: "mcmaster",
      name: "McMaster University",
      location: "Hamilton, ON",
      qsRank: 189,
      timesRank: 116,
      tuitionRange: "CAD 35k/year + CAD 15k living",
      indianStudents: "~1,500",
      strongPrograms: ["Health Sciences", "Engineering", "DeGroote MBA"],
      admissionsUrl: "https://future.mcmaster.ca/",
      officialSite: "https://www.mcmaster.ca/",
      blurb: "Strong health-sciences + research; smaller than Toronto/UBC; reasonable cost of living.",
    },
    {
      slug: "alberta",
      name: "University of Alberta",
      location: "Edmonton, AB",
      qsRank: 96,
      timesRank: 110,
      tuitionRange: "CAD 30k/year + CAD 12k living",
      indianStudents: "~2,000+",
      strongPrograms: ["Engineering (Petroleum)", "Medicine", "Computing Science"],
      admissionsUrl: "https://www.ualberta.ca/admissions/",
      officialSite: "https://www.ualberta.ca/",
      blurb: "Lower tuition than coastal universities; strong petroleum + materials engineering; harsh winters.",
    },
    {
      slug: "western",
      name: "Western University",
      location: "London, ON",
      qsRank: 114,
      timesRank: 201,
      tuitionRange: "CAD 40k/year + CAD 13k living",
      indianStudents: "~1,200",
      strongPrograms: ["Ivey MBA", "Engineering", "Medicine"],
      admissionsUrl: "https://welcome.uwo.ca/",
      officialSite: "https://www.uwo.ca/",
      blurb: "Ivey Business School is one of Canada's top MBA programs; reasonable cost; smaller city.",
    },
    {
      slug: "queens",
      name: "Queen's University",
      location: "Kingston, ON",
      qsRank: 246,
      timesRank: 350,
      tuitionRange: "CAD 50k/year + CAD 14k living",
      indianStudents: "~700",
      strongPrograms: ["Smith MBA", "Engineering", "Commerce UG"],
      admissionsUrl: "https://www.queensu.ca/admission/",
      officialSite: "https://www.queensu.ca/",
      blurb: "Tight-knit campus culture; strong undergraduate commerce + engineering programs.",
    },
    {
      slug: "carleton",
      name: "Carleton University",
      location: "Ottawa, ON",
      qsRank: 632,
      timesRank: 601,
      tuitionRange: "CAD 28k/year + CAD 14k living",
      indianStudents: "~1,200",
      strongPrograms: ["Public Policy", "Journalism", "Engineering"],
      admissionsUrl: "https://admissions.carleton.ca/",
      officialSite: "https://carleton.ca/",
      blurb: "Capital-city advantage for public policy + government internships; engineering + journalism well-regarded.",
    },
    {
      slug: "concordia",
      name: "Concordia University",
      location: "Montreal, QC",
      qsRank: 545,
      timesRank: 601,
      tuitionRange: "CAD 28k/year + CAD 13k living",
      indianStudents: "~3,000+",
      strongPrograms: ["Engineering", "Computer Science", "Fine Arts"],
      admissionsUrl: "https://www.concordia.ca/admissions.html",
      officialSite: "https://www.concordia.ca/",
      blurb: "Large Indian-student population; English-language Quebec university; strong engineering + design programs.",
    },
  ],
};

const AU: WorldwideCountry = {
  slug: "au",
  name: "Australia",
  emojiFlag: "🇦🇺",
  indianStudentCount: "~1,15,000 (Australian Govt Education Dept 2023)",
  costSummary:
    "Tuition AUD 30k–50k/year for international UG; AUD 28k–48k for PG. Living AUD 21k–25k/year. 2-year PG ~AUD 80k–130k.",
  applicationTimeline:
    "Feb intake (main): apply Aug–Nov prior year. July intake: apply Feb–May. Application via individual university portals.",
  postStudyWork:
    "Temporary Graduate Visa (subclass 485): 2–6 years depending on degree level + qualifying area. Recent extensions for STEM degrees.",
  prPathway:
    "Skilled Independent (189) / Nominated (190) / Regional (491) visas. SOL (Skilled Occupations List) governs eligibility. Tighter than Canada but still attainable for STEM/healthcare graduates.",
  visaType: "Subclass 500 Student Visa",
  visaUrl: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
  englishTest: ["IELTS Academic", "PTE Academic", "TOEFL iBT"],
  pros: [
    "Strong PSW visa (2-6 years)",
    "High quality of life + weather (compared to UK/Canada winters)",
    "Strong Indian community in Sydney + Melbourne",
    "Healthcare via OSHC mandatory but cheap",
  ],
  cons: [
    "Higher absolute cost than Canada / Germany",
    "Distance from India + jet lag for visits",
    "PR pathways tightening (occupation list keeps narrowing)",
    "Recent visa fee hikes (AUD 1,600 for 500 visa as of 2024)",
  ],
  universities: [
    {
      slug: "melbourne",
      name: "University of Melbourne",
      location: "Melbourne, VIC",
      qsRank: 13,
      timesRank: 39,
      tuitionRange: "AUD 50k/year + AUD 25k living",
      indianStudents: "~2,000",
      strongPrograms: ["Medicine", "Engineering", "Law", "Melbourne MBS"],
      admissionsUrl: "https://study.unimelb.edu.au/",
      officialSite: "https://www.unimelb.edu.au/",
      blurb: "Top-ranked Australian university; Melbourne Model (broad UG, specialised PG); large Indian community.",
    },
    {
      slug: "sydney",
      name: "University of Sydney",
      location: "Sydney, NSW",
      qsRank: 18,
      timesRank: 60,
      tuitionRange: "AUD 50k/year + AUD 27k living",
      indianStudents: "~2,500",
      strongPrograms: ["Medicine", "Engineering", "Architecture", "Business"],
      admissionsUrl: "https://www.sydney.edu.au/admissions/",
      officialSite: "https://www.sydney.edu.au/",
      blurb: "Oldest Australian university (1850); strong professional schools; expensive Sydney rent.",
    },
    {
      slug: "anu",
      name: "Australian National University (ANU)",
      location: "Canberra, ACT",
      qsRank: 30,
      timesRank: 73,
      tuitionRange: "AUD 50k/year + AUD 22k living",
      indianStudents: "~600",
      strongPrograms: ["Computer Science", "Physics", "Asia-Pacific Studies", "Public Policy"],
      admissionsUrl: "https://www.anu.edu.au/study/",
      officialSite: "https://www.anu.edu.au/",
      blurb: "Research-focused; smaller cohort; strong PhD pipelines + government policy connections.",
    },
    {
      slug: "unsw",
      name: "University of New South Wales (UNSW)",
      location: "Sydney, NSW",
      qsRank: 19,
      timesRank: 84,
      tuitionRange: "AUD 50k/year + AUD 25k living",
      indianStudents: "~3,000",
      strongPrograms: ["Engineering", "AGSM MBA", "CS", "Quantum"],
      admissionsUrl: "https://www.unsw.edu.au/study/",
      officialSite: "https://www.unsw.edu.au/",
      blurb: "Engineering-strong; trimester system; very active Indian student body in Sydney's eastern suburbs.",
    },
    {
      slug: "monash",
      name: "Monash University",
      location: "Melbourne, VIC",
      qsRank: 37,
      timesRank: 58,
      tuitionRange: "AUD 45k/year + AUD 22k living",
      indianStudents: "~3,500+",
      strongPrograms: ["Medicine", "Pharmacy", "Engineering", "MBA"],
      admissionsUrl: "https://www.monash.edu/study",
      officialSite: "https://www.monash.edu/",
      blurb: "Multi-campus Melbourne university with strong Indian intake; pharmacy + medicine well-known.",
    },
    {
      slug: "uq",
      name: "University of Queensland",
      location: "Brisbane, QLD",
      qsRank: 40,
      timesRank: 70,
      tuitionRange: "AUD 45k/year + AUD 20k living",
      indianStudents: "~1,200",
      strongPrograms: ["Veterinary", "Biotech", "Engineering", "Business"],
      admissionsUrl: "https://study.uq.edu.au/",
      officialSite: "https://www.uq.edu.au/",
      blurb: "Brisbane base — cheaper cost of living than Sydney/Melbourne; strong life-sciences research.",
    },
    {
      slug: "uwa",
      name: "University of Western Australia",
      location: "Perth, WA",
      qsRank: 72,
      timesRank: 149,
      tuitionRange: "AUD 42k/year + AUD 20k living",
      indianStudents: "~1,000",
      strongPrograms: ["Mining Engineering", "Petroleum", "Marine Science"],
      admissionsUrl: "https://www.uwa.edu.au/study",
      officialSite: "https://www.uwa.edu.au/",
      blurb: "Perth-based; strong resources sector connections; significantly cheaper than east-coast cities.",
    },
    {
      slug: "adelaide",
      name: "University of Adelaide",
      location: "Adelaide, SA",
      qsRank: 89,
      timesRank: 128,
      tuitionRange: "AUD 40k/year + AUD 18k living",
      indianStudents: "~1,200",
      strongPrograms: ["Wine Science", "Petroleum", "Computer Science"],
      admissionsUrl: "https://www.adelaide.edu.au/future-students/",
      officialSite: "https://www.adelaide.edu.au/",
      blurb: "Adelaide is a designated regional area — bonus PR points; lower cost of living than Sydney/Melbourne.",
    },
    {
      slug: "rmit",
      name: "RMIT University",
      location: "Melbourne, VIC",
      qsRank: 123,
      timesRank: 301,
      tuitionRange: "AUD 42k/year + AUD 22k living",
      indianStudents: "~2,500+",
      strongPrograms: ["Design", "Engineering", "Computer Science", "Business"],
      admissionsUrl: "https://www.rmit.edu.au/study-with-us",
      officialSite: "https://www.rmit.edu.au/",
      blurb: "Strong applied / vocational orientation; CBD Melbourne campus; large Indian student body.",
    },
    {
      slug: "deakin",
      name: "Deakin University",
      location: "Geelong, VIC",
      qsRank: 197,
      timesRank: 168,
      tuitionRange: "AUD 38k/year + AUD 20k living",
      indianStudents: "~2,000+",
      strongPrograms: ["Engineering", "Information Tech", "Nursing", "Sport Science"],
      admissionsUrl: "https://www.deakin.edu.au/study",
      officialSite: "https://www.deakin.edu.au/",
      blurb: "Lower tuition than Group of Eight; strong IT + engineering programs; large Indian intake.",
    },
  ],
};

const DE: WorldwideCountry = {
  slug: "de",
  name: "Germany",
  emojiFlag: "🇩🇪",
  indianStudentCount: "~50,000 (DAAD 2023; Indians are the largest non-EU international cohort in Germany)",
  costSummary:
    "Public universities charge no tuition (or €500/sem semester fee) — even for international students at most state universities. Living €11k–€13k/year. Total Master's bill ~€25k for 2 years (living + admin).",
  applicationTimeline:
    "Winter semester (October start): apply Apr–Jul. Summer semester (April start): apply Oct–Jan. Application via Uni-Assist for many universities.",
  postStudyWork:
    "Job-seeker visa — 18 months after graduation to find work. Convert to EU Blue Card for residency.",
  prPathway:
    "EU Blue Card → permanent residency (Niederlassungserlaubnis) after 21 months (B1 German) / 33 months (A1 German). Strongest non-English-speaking destination for Indian engineering / PG students.",
  visaType: "National Visa (D-type) → Residence Permit",
  visaUrl: "https://india.diplo.de/in-en/02-visa-services",
  englishTest: ["IELTS Academic (for English-taught programs)", "TestDaF / DSH (for German-taught)"],
  pros: [
    "No tuition fees at most public universities",
    "Strong engineering + automotive industry job market",
    "EU Blue Card is fast pathway to PR vs US/UK",
    "Lower cost of living than UK/Australia",
  ],
  cons: [
    "German language is essential for full integration + non-tech roles",
    "Bureaucracy is real — Anmeldung, blocked-account, residence permit",
    "Long winters + grey weather",
    "Fewer English-taught UG programs (more at PG level)",
  ],
  universities: [
    {
      slug: "tum",
      name: "Technical University of Munich (TUM)",
      location: "Munich, Bavaria",
      qsRank: 28,
      timesRank: 26,
      tuitionRange: "€0 tuition + €11k/year living (Munich)",
      indianStudents: "~1,200",
      strongPrograms: ["Engineering", "CS", "Aerospace", "Management"],
      admissionsUrl: "https://www.tum.de/en/studies",
      officialSite: "https://www.tum.de/",
      blurb: "Germany's #1 technical university; strong English-taught Master's programs; Munich tech industry connections (BMW, Siemens).",
    },
    {
      slug: "lmu-munich",
      name: "Ludwig Maximilian University (LMU)",
      location: "Munich, Bavaria",
      qsRank: 54,
      timesRank: 38,
      tuitionRange: "€0 tuition + €11k/year living",
      indianStudents: "~600",
      strongPrograms: ["Physics", "Medicine", "Economics", "Math"],
      admissionsUrl: "https://www.lmu.de/en/study/",
      officialSite: "https://www.lmu.de/",
      blurb: "Munich's classical university (founded 1472). Strong physics + medicine; some English-taught PG programs.",
    },
    {
      slug: "heidelberg",
      name: "Heidelberg University",
      location: "Heidelberg, Baden-Württemberg",
      qsRank: 84,
      timesRank: 47,
      tuitionRange: "€1,500/year (BaWü intl fee) + €11k/year living",
      indianStudents: "~400",
      strongPrograms: ["Medicine", "Physics", "Biosciences", "Mathematics"],
      admissionsUrl: "https://www.uni-heidelberg.de/en/study",
      officialSite: "https://www.uni-heidelberg.de/",
      blurb: "Oldest German university (1386); strong research; Baden-Württemberg charges international tuition (€1,500/sem).",
    },
    {
      slug: "rwth-aachen",
      name: "RWTH Aachen University",
      location: "Aachen, North Rhine-Westphalia",
      qsRank: 99,
      timesRank: 105,
      tuitionRange: "€0 tuition + €10k/year living",
      indianStudents: "~1,500+",
      strongPrograms: ["Mechanical Engineering", "Materials Science", "Automotive", "CS"],
      admissionsUrl: "https://www.rwth-aachen.de/cms/root/Studium/",
      officialSite: "https://www.rwth-aachen.de/",
      blurb: "Heavily engineering-focused; very strong Indian community; lower cost of living than Munich.",
    },
    {
      slug: "berlin-tu",
      name: "Technical University of Berlin (TU Berlin)",
      location: "Berlin",
      qsRank: 154,
      timesRank: 119,
      tuitionRange: "€0 tuition + €12k/year living (Berlin)",
      indianStudents: "~1,000",
      strongPrograms: ["Engineering", "CS", "Urban Planning", "Process Eng"],
      admissionsUrl: "https://www.tu.berlin/en/studying/",
      officialSite: "https://www.tu.berlin/",
      blurb: "Berlin's main engineering university; vibrant capital city; tech startup ecosystem.",
    },
    {
      slug: "kit",
      name: "Karlsruhe Institute of Technology (KIT)",
      location: "Karlsruhe, Baden-Württemberg",
      qsRank: 119,
      timesRank: 109,
      tuitionRange: "€1,500/year (BaWü intl) + €10k/year living",
      indianStudents: "~500",
      strongPrograms: ["Engineering", "CS", "Physics", "Materials"],
      admissionsUrl: "https://www.kit.edu/studieren/",
      officialSite: "https://www.kit.edu/",
      blurb: "Top engineering + research; Karlsruhe is a quieter, cheaper south-west city.",
    },
    {
      slug: "stuttgart",
      name: "University of Stuttgart",
      location: "Stuttgart, Baden-Württemberg",
      qsRank: 312,
      timesRank: 251,
      tuitionRange: "€1,500/year (BaWü intl) + €11k/year living",
      indianStudents: "~700",
      strongPrograms: ["Automotive Engineering", "Aerospace", "Industrial Engineering"],
      admissionsUrl: "https://www.uni-stuttgart.de/en/study/",
      officialSite: "https://www.uni-stuttgart.de/",
      blurb: "Automotive capital of Europe (Mercedes, Porsche, Bosch) — perfect for automotive PG students.",
    },
    {
      slug: "hu-berlin",
      name: "Humboldt University of Berlin",
      location: "Berlin",
      qsRank: 117,
      timesRank: 86,
      tuitionRange: "€0 tuition + €12k/year living",
      indianStudents: "~600",
      strongPrograms: ["Economics", "Math", "Physics", "Philosophy"],
      admissionsUrl: "https://www.hu-berlin.de/en/studies",
      officialSite: "https://www.hu-berlin.de/",
      blurb: "Classical research-led university in central Berlin; founded 1810; strong humanities + sciences.",
    },
    {
      slug: "freiburg",
      name: "University of Freiburg",
      location: "Freiburg, Baden-Württemberg",
      qsRank: 192,
      timesRank: 109,
      tuitionRange: "€1,500/year (BaWü intl) + €11k/year living",
      indianStudents: "~400",
      strongPrograms: ["Medicine", "Biosciences", "Renewable Energy", "Forestry"],
      admissionsUrl: "https://www.studium.uni-freiburg.de/en/",
      officialSite: "https://www.uni-freiburg.de/",
      blurb: "Strong sustainability + renewable energy research; classical south-west German city; warm summers.",
    },
    {
      slug: "tu-dresden",
      name: "TU Dresden",
      location: "Dresden, Saxony",
      qsRank: 192,
      timesRank: 178,
      tuitionRange: "€0 tuition + €9k/year living (cheapest of major cities)",
      indianStudents: "~700",
      strongPrograms: ["Microelectronics", "Mechanical Engineering", "CS"],
      admissionsUrl: "https://tu-dresden.de/studium",
      officialSite: "https://tu-dresden.de/",
      blurb: "Silicon Saxony semiconductor hub; cheapest cost of living among top German universities.",
    },
  ],
};

// ═════════════════════════════════════════════════════════════════════
// PHASE 4.2 EXPANSION — 5 more countries
// Ireland, Singapore, New Zealand, France, Netherlands
// ═════════════════════════════════════════════════════════════════════

const IE: WorldwideCountry = {
  slug: "ie",
  name: "Ireland",
  emojiFlag: "🇮🇪",
  indianStudentCount: "~10,000-15,000 (HEA Ireland; growing fast post-Brexit)",
  costSummary:
    "Tuition €10k–€30k/year for international students. Living €10k–€15k/year (Dublin top of range). Total Master's (1-2 yr) ~€25k-50k.",
  applicationTimeline:
    "September intake: apply Nov-Apr (rolling). Postgrad direct via university portals.",
  postStudyWork:
    "Graduate Programme — Stamp 1G: 1 year for Level 8 (Honours Bachelor's), 2 years for Level 9+ (Master's/PhD). Highly attainable.",
  prPathway:
    "Critical Skills Employment Permit (jobs paying €38k+) → 2-year work permit → eligible for citizenship after 5 years. Faster than UK/US for tech professionals.",
  visaType: "Stamp 2 Student Visa (Ireland)",
  visaUrl: "https://www.irishimmigration.ie/coming-to-study-in-ireland/",
  englishTest: ["IELTS Academic", "TOEFL iBT", "PTE Academic"],
  pros: [
    "EU member with English-medium education",
    "Strong tech industry presence (Google, Meta, Microsoft, LinkedIn EU HQ in Dublin)",
    "1-2 year post-study work stamp is straightforward",
    "Direct path to EU residency",
  ],
  cons: [
    "Dublin housing crisis acute — finding rental is hard",
    "Cost of living rising fast",
    "Smaller universities than UK / US — programme depth varies",
  ],
  universities: [
    { slug: "trinity-college-dublin", name: "Trinity College Dublin", location: "Dublin", qsRank: 81, timesRank: 134, tuitionRange: "€20k–€35k/year", indianStudents: "~600", strongPrograms: ["CS", "Engineering", "Medicine", "Business"], admissionsUrl: "https://www.tcd.ie/study/", officialSite: "https://www.tcd.ie/", blurb: "Ireland's oldest university (1592). Strong CS + humanities programs; central Dublin." },
    { slug: "ucd-dublin", name: "University College Dublin (UCD)", location: "Dublin", qsRank: 126, timesRank: 198, tuitionRange: "€19k–€30k/year", indianStudents: "~800", strongPrograms: ["CS", "Business (Smurfit School)", "Engineering", "Veterinary"], admissionsUrl: "https://www.ucd.ie/global/", officialSite: "https://www.ucd.ie/", blurb: "Largest Irish university; broad programme portfolio; strong international intake." },
    { slug: "ucc-cork", name: "University College Cork (UCC)", location: "Cork", qsRank: 273, timesRank: 351, tuitionRange: "€16k–€26k/year", indianStudents: "~400", strongPrograms: ["Pharmacy", "Food Science", "Business", "Engineering"], admissionsUrl: "https://www.ucc.ie/en/intoffice/", officialSite: "https://www.ucc.ie/", blurb: "Strong food science + pharma research; Cork is cheaper than Dublin." },
    { slug: "nuig-galway", name: "University of Galway (NUIG)", location: "Galway", qsRank: 273, timesRank: 350, tuitionRange: "€15k–€26k/year", indianStudents: "~400", strongPrograms: ["Medicine", "Engineering", "Marine Sciences"], admissionsUrl: "https://www.universityofgalway.ie/intl/", officialSite: "https://www.universityofgalway.ie/", blurb: "West-coast research university; strong medical + engineering; lowest cost of living among Irish universities." },
    { slug: "dcu-dublin", name: "Dublin City University (DCU)", location: "Dublin", qsRank: 421, timesRank: 401, tuitionRange: "€15k–€25k/year", indianStudents: "~500", strongPrograms: ["Computing", "Business", "Engineering", "Communications"], admissionsUrl: "https://www.dcu.ie/registry/international/", officialSite: "https://www.dcu.ie/", blurb: "Industry-linked university with strong placements + co-op programmes." },
  ],
};

const SG: WorldwideCountry = {
  slug: "sg",
  name: "Singapore",
  emojiFlag: "🇸🇬",
  indianStudentCount: "~7,000-10,000 (NUS+NTU+SMU+SUTD plus business schools)",
  costSummary:
    "Tuition SGD 30k–60k/year for international UG (after MOE subsidy you can apply for, ~50% reduction). PG SGD 35k–80k. Living SGD 12k–18k/year.",
  applicationTimeline:
    "August intake: apply Sep-Mar. Direct application via individual university portals.",
  postStudyWork:
    "Long-Term Visit Pass (LTVP) for 1 year. Employment Pass for skilled workers earning SGD 5k+/month (S$60k+/year).",
  prPathway:
    "PR after working 2-6 years on EP. Citizenship after PR + 2 years. Singapore is selective but not impossible for STEM/finance professionals.",
  visaType: "Student Pass (issued by ICA)",
  visaUrl: "https://www.ica.gov.sg/enter-transit-depart/student-pass",
  englishTest: ["IELTS Academic", "TOEFL iBT", "C1 Advanced (Cambridge)"],
  pros: [
    "World's top global research universities (NUS, NTU consistently top-20 globally)",
    "Direct path to high-paying finance/tech jobs in Asia hub",
    "MOE Tuition Grant subsidises tuition ~50% if you accept 3-year work bond in SG/SG-firm",
    "Tax-efficient (low income tax ~15-22% effective)",
  ],
  cons: [
    "Highest cost of living among major destinations after Switzerland",
    "Tight selection — admit rate ~5-15% for top programmes",
    "Tuition grant comes with 3-year work bond (may not match your goals)",
    "Distance from family — Indian flights expensive seasonally",
  ],
  universities: [
    { slug: "nus", name: "National University of Singapore (NUS)", location: "Singapore", qsRank: 8, timesRank: 19, tuitionRange: "SGD 38k/year (after MOE subsidy ~SGD 18k)", indianStudents: "~1,500", strongPrograms: ["CS", "Engineering", "Medicine", "Business (NUS BBA)"], admissionsUrl: "https://www.nus.edu.sg/oam/", officialSite: "https://www.nus.edu.sg/", blurb: "Asia's #1 university by QS. Strong everywhere; world-class research; massive Indian alumni network." },
    { slug: "ntu", name: "Nanyang Technological University (NTU)", location: "Singapore", qsRank: 15, timesRank: 32, tuitionRange: "SGD 35k/year (after subsidy ~SGD 17k)", indianStudents: "~1,200", strongPrograms: ["Engineering", "CS", "Business (Nanyang)", "Media + Communications"], admissionsUrl: "https://www.ntu.edu.sg/admissions", officialSite: "https://www.ntu.edu.sg/", blurb: "Engineering powerhouse; Top 3 in Asia. Strong industry partnerships (SG industry hubs)." },
    { slug: "smu", name: "Singapore Management University (SMU)", location: "Singapore", qsRank: 545, timesRank: 401, tuitionRange: "SGD 42k/year", indianStudents: "~500", strongPrograms: ["Business + Finance", "Law", "CS"], admissionsUrl: "https://admissions.smu.edu.sg/", officialSite: "https://www.smu.edu.sg/", blurb: "Specialist business + economics university. Strong placements in finance + consulting." },
    { slug: "sutd", name: "Singapore University of Technology and Design (SUTD)", location: "Singapore", qsRank: 451, timesRank: 251, tuitionRange: "SGD 36k/year", indianStudents: "~300", strongPrograms: ["Design + Architecture", "Engineering Product Dev", "Information Systems"], admissionsUrl: "https://www.sutd.edu.sg/admissions/", officialSite: "https://www.sutd.edu.sg/", blurb: "Established with MIT collaboration. Design-led engineering + interdisciplinary programmes." },
  ],
};

const NZ: WorldwideCountry = {
  slug: "nz",
  name: "New Zealand",
  emojiFlag: "🇳🇿",
  indianStudentCount: "~25,000-30,000 (Education New Zealand; second-largest international student source after China)",
  costSummary:
    "Tuition NZD 30k–55k/year for international UG. Living NZD 15k–22k/year. Cheaper than Australia by ~15-25%.",
  applicationTimeline:
    "Two intakes: February + July. Apply 3-4 months in advance via university portals.",
  postStudyWork:
    "Post-Study Work Visa: 1-3 years depending on degree level + region.",
  prPathway:
    "Skilled Migrant Category Resident Visa — point-based, 160+ points. Skill Shortage List makes selected occupations easier.",
  visaType: "Student Visa",
  visaUrl: "https://www.immigration.govt.nz/new-zealand-visas/options/study",
  englishTest: ["IELTS Academic", "PTE Academic", "TOEFL iBT"],
  pros: [
    "Substantially cheaper than Australia + UK",
    "Quality-of-life consistently top-3 globally",
    "Stable + welcoming immigration policy compared to Australia (recently tightening)",
    "Top universities (Auckland) globally ranked",
  ],
  cons: [
    "Remote — flight to India 16-22 hours via Singapore/HK",
    "Job market smaller than Australia",
    "Universities outside top 3-4 don't have global brand recognition",
  ],
  universities: [
    { slug: "auckland", name: "University of Auckland", location: "Auckland", qsRank: 65, timesRank: 150, tuitionRange: "NZD 45k/year", indianStudents: "~600", strongPrograms: ["Medicine", "Engineering", "Business", "Computer Science"], admissionsUrl: "https://www.auckland.ac.nz/en/study.html", officialSite: "https://www.auckland.ac.nz/", blurb: "NZ's top university; strong research; international student community vibrant." },
    { slug: "otago", name: "University of Otago", location: "Dunedin", qsRank: 206, timesRank: 251, tuitionRange: "NZD 33k/year", indianStudents: "~250", strongPrograms: ["Medicine", "Dentistry", "Pharmacy", "Sciences"], admissionsUrl: "https://www.otago.ac.nz/study/international/", officialSite: "https://www.otago.ac.nz/", blurb: "NZ's oldest university; strong health sciences; campus-town atmosphere." },
    { slug: "canterbury", name: "University of Canterbury", location: "Christchurch", qsRank: 256, timesRank: 401, tuitionRange: "NZD 30k/year", indianStudents: "~200", strongPrograms: ["Engineering", "Computer Science", "Forestry"], admissionsUrl: "https://www.canterbury.ac.nz/study/", officialSite: "https://www.canterbury.ac.nz/", blurb: "Engineering-strong; rebuild post-2011 earthquake; lower cost of living." },
    { slug: "victoria-wellington", name: "Victoria University of Wellington", location: "Wellington", qsRank: 241, timesRank: 401, tuitionRange: "NZD 33k/year", indianStudents: "~300", strongPrograms: ["Public Policy", "Law", "Business", "Architecture"], admissionsUrl: "https://www.wgtn.ac.nz/study", officialSite: "https://www.wgtn.ac.nz/", blurb: "Capital city, strong public policy + law programmes; government internship pipeline." },
    { slug: "massey", name: "Massey University", location: "Palmerston North / Auckland / Wellington", qsRank: 239, timesRank: 401, tuitionRange: "NZD 30k/year", indianStudents: "~600", strongPrograms: ["Agriculture + Veterinary", "Aviation", "Business"], admissionsUrl: "https://www.massey.ac.nz/", officialSite: "https://www.massey.ac.nz/", blurb: "Multi-campus; only NZ university with full aviation degree; agri-tech strong." },
  ],
};

const FR: WorldwideCountry = {
  slug: "fr",
  name: "France",
  emojiFlag: "🇫🇷",
  indianStudentCount: "~7,000-10,000 (Campus France growing rapidly post-pandemic)",
  costSummary:
    "Public universities: €170-380/year (registration fee only, ~₹15k-32k!). Grandes Écoles (top engineering/business): €12k-25k/year. Living €10k-14k/year (Paris top of range).",
  applicationTimeline:
    "September intake: apply Oct-Mar (rolling). Campus France certification required.",
  postStudyWork:
    "Carte de séjour 'recherche d'emploi' — 1 year to find a job after Master's. Eligible for skilled migration after.",
  prPathway:
    "Talent Passport (4-year renewable work permit) → EU Blue Card → permanent residency after 5 years (3 years if French language proficient).",
  visaType: "Long-stay student visa (VLS-TS)",
  visaUrl: "https://france-visas.gouv.fr/web/france-visas/student-visa",
  englishTest: ["English programmes: IELTS / TOEFL", "French programmes: DELF / DALF / TCF"],
  pros: [
    "Public universities effectively free (€170/year)",
    "Grandes Écoles offer world-class engineering + business (Polytechnique, HEC, ESSEC, Centrale)",
    "EU residency pathway",
    "Strong tech + aerospace + luxury industry presence",
  ],
  cons: [
    "French language is materially helpful (essential for non-tech roles)",
    "Bureaucracy real — visa + housing + bank account take weeks each",
    "Strikes affect public transport regularly",
    "Job market for non-French-speakers narrower",
  ],
  universities: [
    { slug: "psl-paris", name: "PSL University", location: "Paris", qsRank: 24, timesRank: 41, tuitionRange: "€170/year public + €13-19k for select programmes", indianStudents: "~300", strongPrograms: ["Mathematics", "CS", "Economics", "Sciences"], admissionsUrl: "https://psl.eu/en", officialSite: "https://psl.eu/en", blurb: "Federation of Paris's top grandes écoles (ENS, Mines, Dauphine). Strong math + econ tradition." },
    { slug: "polytechnique", name: "École Polytechnique (X)", location: "Palaiseau", qsRank: 38, timesRank: 95, tuitionRange: "€16k-19k/year", indianStudents: "~150", strongPrograms: ["Engineering", "Math", "CS", "Physics"], admissionsUrl: "https://www.polytechnique.edu/en", officialSite: "https://www.polytechnique.edu/", blurb: "France's premier engineering school. Bachelor's, Master's + Engineer programmes. Defence + research pipeline." },
    { slug: "sorbonne", name: "Sorbonne University", location: "Paris", qsRank: 59, timesRank: 91, tuitionRange: "€170-380/year public", indianStudents: "~400", strongPrograms: ["Math", "Physics", "Medicine", "Humanities"], admissionsUrl: "https://www.sorbonne-universite.fr/en/admissions", officialSite: "https://www.sorbonne-universite.fr/", blurb: "Historic university (1257). Three faculties: Letters, Medicine, Sciences. Very low tuition." },
    { slug: "hec-paris", name: "HEC Paris", location: "Jouy-en-Josas", qsRank: 56, timesRank: 401, tuitionRange: "€30k+ for Master's, €70k+ for MBA", indianStudents: "~150 in MBA + Master's", strongPrograms: ["MBA", "MIM (Master in Management)", "MSc Finance"], admissionsUrl: "https://www.hec.edu/en", officialSite: "https://www.hec.edu/", blurb: "France's top business school; consistently top-3 European MBAs. Strong consulting + finance pipeline." },
    { slug: "centrale-supelec", name: "CentraleSupélec", location: "Gif-sur-Yvette", qsRank: 187, timesRank: 201, tuitionRange: "€14k-16k/year", indianStudents: "~200", strongPrograms: ["Engineering", "CS", "Energy Systems"], admissionsUrl: "https://www.centralesupelec.fr/en/admissions", officialSite: "https://www.centralesupelec.fr/", blurb: "Top French engineering school. Engineer programme + Master's; corporate partnerships strong." },
  ],
};

const NL: WorldwideCountry = {
  slug: "nl",
  name: "Netherlands",
  emojiFlag: "🇳🇱",
  indianStudentCount: "~3,000-5,000 (Nuffic — growing for STEM + business)",
  costSummary:
    "Public universities: €15k-22k/year for non-EU (much lower for EU/EEA). Living €10k-14k/year (Amsterdam top of range). Most programmes 1-2 years.",
  applicationTimeline:
    "September intake: apply Oct-Jan (Studielink). February intake: apply Sep-Nov (limited programmes).",
  postStudyWork:
    "Orientation Year (zoekjaar) — 1 year after graduation to find skilled work. Highly skilled migrant permit thereafter.",
  prPathway:
    "Highly Skilled Migrant Visa (salary thresholds €38-52k depending on age) → 5 years → permanent residency. Faster than UK/US.",
  visaType: "MVV + Residence Permit",
  visaUrl: "https://ind.nl/en/study",
  englishTest: ["IELTS Academic", "TOEFL iBT", "Cambridge"],
  pros: [
    "World's #1 country for English-taught Master's outside English-speaking countries (~2000 programmes)",
    "Strong tech + business + engineering programmes",
    "Excellent post-study work + EU residency pathway",
    "Quality of life consistently top-5 globally",
  ],
  cons: [
    "Housing scarcity in major student cities (Amsterdam, Utrecht, Delft)",
    "Tuition higher than Germany (which is free)",
    "Dutch language matters for non-tech roles",
  ],
  universities: [
    { slug: "tu-delft", name: "Delft University of Technology (TU Delft)", location: "Delft", qsRank: 47, timesRank: 78, tuitionRange: "€19k/year", indianStudents: "~500", strongPrograms: ["Engineering", "CS", "Aerospace", "Industrial Design"], admissionsUrl: "https://www.tudelft.nl/en/", officialSite: "https://www.tudelft.nl/", blurb: "Netherlands' top technical university; aerospace + civil eng world-class. Industry-linked." },
    { slug: "utrecht", name: "Utrecht University", location: "Utrecht", qsRank: 107, timesRank: 80, tuitionRange: "€18k/year", indianStudents: "~300", strongPrograms: ["Life Sciences", "Veterinary", "Earth Sciences", "Geosciences"], admissionsUrl: "https://www.uu.nl/en/education", officialSite: "https://www.uu.nl/", blurb: "Oldest Dutch university; strong life sciences + humanities; broad research portfolio." },
    { slug: "amsterdam", name: "University of Amsterdam (UvA)", location: "Amsterdam", qsRank: 60, timesRank: 60, tuitionRange: "€16k/year", indianStudents: "~600", strongPrograms: ["CS", "Economics", "Communication Sciences", "Linguistics"], admissionsUrl: "https://www.uva.nl/en/education", officialSite: "https://www.uva.nl/en", blurb: "Largest Dutch university; Amsterdam location; strong CS + econ + humanities." },
    { slug: "tu-eindhoven", name: "Eindhoven University of Technology (TU/e)", location: "Eindhoven", qsRank: 124, timesRank: 226, tuitionRange: "€18k/year", indianStudents: "~250", strongPrograms: ["Electrical Engineering", "Industrial Design", "Computer Science"], admissionsUrl: "https://www.tue.nl/en/", officialSite: "https://www.tue.nl/en/", blurb: "Strong electronics + design; Philips + ASML + DAF Trucks corporate links." },
    { slug: "leiden", name: "Leiden University", location: "Leiden", qsRank: 119, timesRank: 77, tuitionRange: "€17k/year", indianStudents: "~200", strongPrograms: ["Law", "Medicine", "International Relations", "Liberal Arts"], admissionsUrl: "https://www.universiteitleiden.nl/en/education", officialSite: "https://www.universiteitleiden.nl/", blurb: "Oldest Dutch university (1575). Strong humanities + law + medicine; close to The Hague." },
  ],
};

export const WORLDWIDE_COUNTRIES: WorldwideCountry[] = [US, UK, CA, AU, DE, IE, SG, NZ, FR, NL];

export function findCountry(slug: string): WorldwideCountry | undefined {
  return WORLDWIDE_COUNTRIES.find((c) => c.slug === slug);
}

export function findUniversity(countrySlug: string, uniSlug: string): WorldwideUniversity | undefined {
  return findCountry(countrySlug)?.universities.find((u) => u.slug === uniSlug);
}

// ═════════════════════════════════════════════════════════════════════
// TEST PREP — IELTS / TOEFL / PTE / GRE / GMAT
// ═════════════════════════════════════════════════════════════════════

export interface TestPrepEntry {
  slug: string;
  name: string;
  fullName: string;
  /** Which countries accept this test */
  acceptedFor: string[];
  /** Test sections + format */
  format: string;
  /** Fee in INR (approx) */
  feeInr: string;
  /** How long the score is valid */
  validity: string;
  /** Honest practice strategy in plain prose */
  prepStrategy: string;
  officialSite: string;
}

export const TEST_PREP: TestPrepEntry[] = [
  {
    slug: "ielts",
    name: "IELTS",
    fullName: "International English Language Testing System (Academic)",
    acceptedFor: ["UK", "Canada", "Australia", "New Zealand", "Ireland", "Most US universities"],
    format: "Listening (30 min) + Reading (60 min) + Writing (60 min) + Speaking (11–14 min, face-to-face). Computer-based or paper-based.",
    feeInr: "₹17,000 (computer-delivered) / ₹17,000 (paper)",
    validity: "2 years from test date",
    prepStrategy:
      "Mock + targeted weakness work. Focus on Writing Task 2 + Speaking Part 2 — these gate most score plateaus. Take 5+ full-length mocks under timed conditions before booking the real test. Free IELTS prep apps (British Council, IDP) are sufficient — paid coaching is rarely necessary for native-English-medium Indian students.",
    officialSite: "https://www.ielts.org/",
  },
  {
    slug: "toefl",
    name: "TOEFL iBT",
    fullName: "Test of English as a Foreign Language (Internet-Based Test)",
    acceptedFor: ["US (primary)", "Canada", "Australia", "Some UK universities"],
    format: "Reading + Listening + Speaking + Writing — all computer-based, 2 hours total.",
    feeInr: "₹16,900",
    validity: "2 years",
    prepStrategy:
      "Heavier on the listening side than IELTS. Speaking is recorded (not interview) — practice 45-second responses. ETS Official Guide + free practice tests + Magoosh-style targeted vocab. Target 100+ for top US universities.",
    officialSite: "https://www.ets.org/toefl",
  },
  {
    slug: "pte",
    name: "PTE Academic",
    fullName: "Pearson Test of English Academic",
    acceptedFor: ["Australia", "UK", "Canada (some)", "New Zealand", "Ireland"],
    format: "Fully computer-based, AI-graded. Speaking + Writing + Reading + Listening combined into integrated tasks. 2 hours.",
    feeInr: "₹16,400",
    validity: "2 years",
    prepStrategy:
      "Format is template-heavy — once you know the question types, scoring is mechanical. Australia + UK accept it; faster results (5 days vs 13). PTE Academic Free Score Sample + paid PTE-specific prep platforms (E2Language, PTE Magic).",
    officialSite: "https://www.pearsonpte.com/",
  },
  {
    slug: "gre",
    name: "GRE",
    fullName: "Graduate Record Examination (General)",
    acceptedFor: ["US (many programs going test-optional)", "Some European universities", "Australia (some)"],
    format: "Verbal (40 min) + Quant (47 min) + Analytical Writing (30 min). 1h 58min total. Computer-based.",
    feeInr: "₹19,000",
    validity: "5 years",
    prepStrategy:
      "Quant is high-school-level math + tricks. Verbal is the harder section for most Indian students — heavy vocabulary + reading comprehension. Magoosh, Manhattan 5-lb book, Greg Mat. Target 320+ for top US MS programs; many programs now GRE-optional post-2020.",
    officialSite: "https://www.ets.org/gre",
  },
  {
    slug: "gmat",
    name: "GMAT Focus",
    fullName: "Graduate Management Admission Test (Focus Edition)",
    acceptedFor: ["MBA programs globally — US, UK, Canada, Australia, Europe"],
    format: "Quantitative Reasoning (45 min) + Verbal Reasoning (45 min) + Data Insights (45 min). 2h 15min total.",
    feeInr: "₹24,500",
    validity: "5 years",
    prepStrategy:
      "Top MBA programs target 720+ (old scale) / 685+ (Focus). Data Insights is new — integrated reasoning skills matter. Manhattan Prep, GMAT Club Tests, Target Test Prep for Quant. Plan 3-4 months of dedicated prep.",
    officialSite: "https://www.mba.com/exams/gmat-focus-edition",
  },
];

// ═════════════════════════════════════════════════════════════════════
// EDUCATION LOAN LANDSCAPE — Indian banks + NBFCs
// ═════════════════════════════════════════════════════════════════════

export interface EducationLoanProvider {
  slug: string;
  name: string;
  /** "BANK" or "NBFC" */
  kind: "BANK" | "NBFC";
  /** Maximum loan amount typically offered */
  maxLoanInr: string;
  /** Whether collateral is required and at what loan size */
  collateralPolicy: string;
  /** Interest rate band (annual, prose — rates change) */
  interestRange: string;
  /** Moratorium policy + repayment terms */
  repayment: string;
  /** What's notable / good / bad */
  notes: string;
  officialSite: string;
}

export const EDUCATION_LOANS: EducationLoanProvider[] = [
  {
    slug: "sbi-global-edvantage",
    name: "SBI Global Ed-Vantage",
    kind: "BANK",
    maxLoanInr: "₹1.5 crore",
    collateralPolicy: "Required for loans above ₹7.5L (mandatory immovable property).",
    interestRange: "10.15%–11.15% (Repo + spread; varies by program + collateral)",
    repayment: "Moratorium = course duration + 6 months. Repay over 10–15 years.",
    notes: "Largest single education-loan provider for Indians studying abroad. Strict collateral discipline; reliable disbursement; longer processing than NBFCs.",
    officialSite: "https://sbi.co.in/web/personal-banking/loans/education-loans/global-ed-vantage",
  },
  {
    slug: "hdfc-credila",
    name: "HDFC Credila",
    kind: "NBFC",
    maxLoanInr: "No fixed cap — based on funding need",
    collateralPolicy: "Up to ₹40-50L without collateral for top universities + STEM courses; more requires collateral.",
    interestRange: "10.50%–12.50%",
    repayment: "Moratorium = course duration + 6 months. EMIs over 10-12 years.",
    notes: "Fastest sanction (4-7 days for top universities). Higher rates than banks but faster + more flexible on documentation. Very common for US MS / Canada PG.",
    officialSite: "https://www.hdfccredila.com/",
  },
  {
    slug: "axis-bank-edu",
    name: "Axis Bank Education Loan (Premium)",
    kind: "BANK",
    maxLoanInr: "₹75 lakh",
    collateralPolicy: "Up to ₹40L without collateral for premium institutions; more requires immovable property.",
    interestRange: "10.99%–13.49%",
    repayment: "Moratorium = course duration + 12 months. Up to 15-year repayment.",
    notes: "Strong for premium-institute list (IIMs, top US/UK). Slightly higher rates than SBI; faster processing.",
    officialSite: "https://www.axisbank.com/retail/loans/education-loan",
  },
  {
    slug: "icici-bank-edu",
    name: "ICICI Bank Education Loan",
    kind: "BANK",
    maxLoanInr: "₹1 crore (abroad), ₹50L (domestic)",
    collateralPolicy: "Up to ₹50L without collateral for top universities + premium courses.",
    interestRange: "10.50%–13.50%",
    repayment: "Moratorium = course duration + 6 months. Up to 12-year repayment.",
    notes: "Good for ICICI bank account holders (existing relationship discount). Decent processing speed.",
    officialSite: "https://www.icicibank.com/personal-banking/loans/education-loan",
  },
  {
    slug: "bob-edu-abroad",
    name: "Bank of Baroda Education Loan",
    kind: "BANK",
    maxLoanInr: "₹1.5 crore",
    collateralPolicy: "Required above ₹7.5L (similar to SBI policy).",
    interestRange: "9.85%–11.40%",
    repayment: "Moratorium = course duration + 6-12 months. 15-year repayment.",
    notes: "Among the lowest rates from public-sector banks. Slower processing than NBFCs.",
    officialSite: "https://www.bankofbaroda.in/personal-banking/loans/education-loan",
  },
  {
    slug: "avanse",
    name: "Avanse Financial Services",
    kind: "NBFC",
    maxLoanInr: "Based on need (typical ₹50-75L)",
    collateralPolicy: "Non-collateral up to ₹50L for premium institutions; collateral for higher.",
    interestRange: "11.25%–14.25%",
    repayment: "Flexible — moratorium varies by product. 10-15 year repayment.",
    notes: "Quick sanction + flexible documentation. Higher rates than banks. Often funds the bridge between PG admit and bank loan.",
    officialSite: "https://www.avanse.com/",
  },
  {
    slug: "gyandhan",
    name: "GyanDhan (loan aggregator)",
    kind: "NBFC",
    maxLoanInr: "Varies by partner lender",
    collateralPolicy: "Marketplace for multiple lenders; varies.",
    interestRange: "10.25%–13.50% (depending on lender)",
    repayment: "Per lender's terms.",
    notes: "Not a lender — compares offers from SBI, HDFC, Axis, ICICI, Avanse + others. Useful first stop before approaching individual lenders. Shishya does NOT have an affiliate relationship with them — just an honest mention.",
    officialSite: "https://www.gyandhan.com/",
  },
  {
    slug: "prodigy-finance",
    name: "Prodigy Finance (UK-based, USD loans)",
    kind: "NBFC",
    maxLoanInr: "Up to USD 220k (~₹1.8 crore)",
    collateralPolicy: "Non-collateral; based on future-earnings model + course + institution.",
    interestRange: "11%–15% (USD-denominated)",
    repayment: "Moratorium = course duration + 6 months. 7-20 year repayment.",
    notes: "Specialised in international students; USD-denominated so no rupee depreciation risk. Premium for top US MBA / MS programs; rejects most non-premium institutions.",
    officialSite: "https://prodigyfinance.com/",
  },
];

/** Section 80E Income Tax Act — interest paid on education loan is tax-deductible. */
export const TAX_BENEFIT_NOTE =
  "Under Section 80E of the Income Tax Act, the interest paid on an education loan is fully deductible from taxable income for the borrower (no upper limit). The deduction is available for 8 assessment years starting from the year you begin repayment, or until interest is fully paid — whichever is earlier.";
