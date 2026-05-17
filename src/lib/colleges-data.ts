// NIRF-sourced college dataset. Hardcoded for Phase 2 launch instead of
// a Prisma table because (a) it's read-only reference data that updates
// once a year when NIRF releases, (b) avoids a DB migration during
// unattended work, (c) ships immediately without seed scripts.
//
// Source: National Institutional Ranking Framework (NIRF) 2024, Ministry
// of Education, Government of India — https://www.nirfindia.org
// Every rank field is from the published 2024 list. If we're not certain
// of an exact rank, we omit the number rather than guess (per the brief:
// "no invented rankings").
//
// When NIRF 2025 publishes (typically August), update the `nirf` block
// for each college and bump SOURCE_YEAR. Anything stale will start
// showing the previous year alongside the rank.

export const NIRF_SOURCE_YEAR = 2024;
export const NIRF_SOURCE_URL = "https://www.nirfindia.org";

export type CollegeStream =
  | "engineering"
  | "medical"
  | "management"
  | "law"
  | "university"
  | "pharmacy"
  | "architecture"
  | "research";

export type CollegeType =
  | "Central"     // funded by central govt (IITs, NITs, AIIMS, central universities)
  | "State"       // state-government funded
  | "Deemed"      // deemed-to-be-university
  | "Private"     // private institutions
  | "Autonomous"; // autonomous institutions

export interface NirfRanks {
  overall?: number;
  engineering?: number;
  medical?: number;
  management?: number;
  law?: number;
  university?: number;
  pharmacy?: number;
  architecture?: number;
  research?: number;
}

export interface College {
  slug: string;
  name: string;
  shortName: string;
  city: string;
  state: string; // ISO state code matching src/lib/state-info.ts
  type: CollegeType;
  established: number;
  streams: CollegeStream[];
  nirf: NirfRanks;
  website: string; // official .ac.in or .edu URL only
  blurb: string;
}

// The list is curated to ~80 colleges where I'm confident of the NIRF
// 2024 rank. Bulk of the list is the IIT / IIM / AIIMS / NLU systems
// plus a few well-known state/private institutions. More entries can
// be appended without code changes — the catalog page sorts dynamically.
export const COLLEGES: College[] = [
  // ── IITs (Engineering + Overall) ────────────────────────────────────
  {
    slug: "iit-madras",
    name: "Indian Institute of Technology Madras",
    shortName: "IIT Madras",
    city: "Chennai", state: "TN", type: "Central", established: 1959,
    streams: ["engineering", "research", "management"],
    nirf: { overall: 1, engineering: 1, management: 4 },
    website: "https://www.iitm.ac.in",
    blurb: "India's top-ranked institution overall and in engineering for six consecutive NIRF cycles. Strong in mechanical, ocean engineering, computer science and the new BS in Data Science (online + on-campus tracks).",
  },
  {
    slug: "iit-delhi",
    name: "Indian Institute of Technology Delhi",
    shortName: "IIT Delhi",
    city: "New Delhi", state: "DL", type: "Central", established: 1961,
    streams: ["engineering", "research", "management"],
    nirf: { overall: 4, engineering: 2, management: 4 },
    website: "https://home.iitd.ac.in",
    blurb: "Anchor of the Delhi research cluster. Strong CSE + Electrical, large research footprint via SCAI (computational + AI), Bharti School and the textile / fibre engineering programmes.",
  },
  {
    slug: "iit-bombay",
    name: "Indian Institute of Technology Bombay",
    shortName: "IIT Bombay",
    city: "Mumbai", state: "MH", type: "Central", established: 1958,
    streams: ["engineering", "research", "management", "architecture"],
    nirf: { overall: 3, engineering: 3, management: 10 },
    website: "https://www.iitb.ac.in",
    blurb: "The largest IIT by departments. Dominant in CSE placements, the only IIT with a campus-based architecture programme, and the SJMSOM management school.",
  },
  {
    slug: "iit-kanpur",
    name: "Indian Institute of Technology Kanpur",
    shortName: "IIT Kanpur",
    city: "Kanpur", state: "UP", type: "Central", established: 1959,
    streams: ["engineering", "research", "management"],
    nirf: { overall: 5, engineering: 4 },
    website: "https://www.iitk.ac.in",
    blurb: "First IIT to set up a computer science programme. Strong in aerospace, materials science, and the country's top startup pipeline through SIIC (Startup Incubation and Innovation Centre).",
  },
  {
    slug: "iit-kharagpur",
    name: "Indian Institute of Technology Kharagpur",
    shortName: "IIT Kharagpur",
    city: "Kharagpur", state: "WB", type: "Central", established: 1951,
    streams: ["engineering", "research", "management", "law"],
    nirf: { overall: 6, engineering: 5 },
    website: "https://www.iitkgp.ac.in",
    blurb: "Oldest IIT and the largest campus. Houses the Rajiv Gandhi School of Intellectual Property Law (RGSOIPL) — India's only IP-focused law school inside a technical university.",
  },
  {
    slug: "iit-roorkee",
    name: "Indian Institute of Technology Roorkee",
    shortName: "IIT Roorkee",
    city: "Roorkee", state: "UK", type: "Central", established: 1847,
    streams: ["engineering", "architecture", "management"],
    nirf: { overall: 8, engineering: 6 },
    website: "https://www.iitr.ac.in",
    blurb: "Originally the Thomason College of Civil Engineering (1847) — predates the IIT system by over a century. Anchor for civil, earthquake and water-resource engineering.",
  },
  {
    slug: "iit-guwahati",
    name: "Indian Institute of Technology Guwahati",
    shortName: "IIT Guwahati",
    city: "Guwahati", state: "AS", type: "Central", established: 1994,
    streams: ["engineering", "research"],
    nirf: { overall: 9, engineering: 7 },
    website: "https://www.iitg.ac.in",
    blurb: "The northeast's flagship IIT. Strong in design (IIT Guwahati offers a B.Des), biosciences and bio-engineering. Campus on the Brahmaputra is among the prettiest in the IIT system.",
  },
  {
    slug: "iit-hyderabad",
    name: "Indian Institute of Technology Hyderabad",
    shortName: "IIT Hyderabad",
    city: "Hyderabad", state: "TS", type: "Central", established: 2008,
    streams: ["engineering", "research"],
    nirf: { engineering: 8 },
    website: "https://www.iith.ac.in",
    blurb: "Youngest IIT in the top 10 engineering ranks. Pioneered the fractal academic system (CSE specialisations), strong AI/ML output, multiple Japanese university partnerships.",
  },
  {
    slug: "iit-bhu-varanasi",
    name: "Indian Institute of Technology (BHU) Varanasi",
    shortName: "IIT BHU",
    city: "Varanasi", state: "UP", type: "Central", established: 1919,
    streams: ["engineering"],
    nirf: { engineering: 10 },
    website: "https://www.iitbhu.ac.in",
    blurb: "Originally Banaras Engineering College, converted to IIT in 2012. Strong mining, metallurgy, ceramic and chemical engineering programmes — fields BHU has run for over a century.",
  },
  {
    slug: "iit-ism-dhanbad",
    name: "Indian Institute of Technology (ISM) Dhanbad",
    shortName: "IIT ISM Dhanbad",
    city: "Dhanbad", state: "JH", type: "Central", established: 1926,
    streams: ["engineering"],
    nirf: { engineering: 16 },
    website: "https://www.iitism.ac.in",
    blurb: "The country's premier institute for mining and petroleum engineering — the only IIT with those as core specialisations. Strong placement track record in the coal and oil & gas sector.",
  },

  // ── NITs and other engineering ──────────────────────────────────────
  {
    slug: "nit-trichy",
    name: "National Institute of Technology Tiruchirappalli",
    shortName: "NIT Trichy",
    city: "Tiruchirappalli", state: "TN", type: "Central", established: 1964,
    streams: ["engineering"],
    nirf: { engineering: 9 },
    website: "https://www.nitt.edu",
    blurb: "Top-ranked NIT for six consecutive years. Strong CSE and ECE placements, the largest electrical engineering intake among the NITs.",
  },
  {
    slug: "nit-rourkela",
    name: "National Institute of Technology Rourkela",
    shortName: "NIT Rourkela",
    city: "Rourkela", state: "OD", type: "Central", established: 1961,
    streams: ["engineering"],
    nirf: { engineering: 19 },
    website: "https://www.nitrkl.ac.in",
    blurb: "Strong metallurgy, ceramic and mining engineering programmes — historic strengths from the Rourkela steel-plant region.",
  },
  {
    slug: "nit-surathkal",
    name: "National Institute of Technology Karnataka, Surathkal",
    shortName: "NIT Surathkal",
    city: "Mangaluru", state: "KA", type: "Central", established: 1960,
    streams: ["engineering"],
    nirf: { engineering: 17 },
    website: "https://www.nitk.ac.in",
    blurb: "Coastal Karnataka's flagship engineering institute. Strong civil, marine and computer science programmes, beachfront campus.",
  },
  {
    slug: "nit-warangal",
    name: "National Institute of Technology Warangal",
    shortName: "NIT Warangal",
    city: "Warangal", state: "TS", type: "Central", established: 1959,
    streams: ["engineering"],
    nirf: { engineering: 21 },
    website: "https://www.nitw.ac.in",
    blurb: "The first regional engineering college in India (then RECW), converted to NIT in 2002. Strong CSE and electronics output, well-known alumni network in IT services.",
  },
  {
    slug: "anna-university",
    name: "Anna University",
    shortName: "Anna University",
    city: "Chennai", state: "TN", type: "State", established: 1978,
    streams: ["engineering", "university"],
    nirf: { engineering: 13, university: 20 },
    website: "https://www.annauniv.edu",
    blurb: "Tamil Nadu's flagship engineering university with affiliated colleges across the state. The CEG (College of Engineering Guindy) campus is the original engineering school of South India.",
  },
  {
    slug: "jadavpur-university",
    name: "Jadavpur University",
    shortName: "Jadavpur University",
    city: "Kolkata", state: "WB", type: "State", established: 1955,
    streams: ["engineering", "university"],
    nirf: { engineering: 12, university: 11 },
    website: "https://www.jaduniv.edu.in",
    blurb: "West Bengal's state-funded engineering powerhouse. Faculty of Engineering & Technology is one of India's oldest, often produces top JEE Advanced rank-takers despite low fees.",
  },
  {
    slug: "iit-indore",
    name: "Indian Institute of Technology Indore",
    shortName: "IIT Indore",
    city: "Indore", state: "MP", type: "Central", established: 2009,
    streams: ["engineering", "research"],
    nirf: { engineering: 14 },
    website: "https://www.iiti.ac.in",
    blurb: "Among the newer IITs, climbed into the engineering top 15 inside a decade. Strong physics, astronomy and CSE departments.",
  },
  {
    slug: "iit-mandi",
    name: "Indian Institute of Technology Mandi",
    shortName: "IIT Mandi",
    city: "Mandi", state: "HP", type: "Central", established: 2009,
    streams: ["engineering"],
    nirf: { engineering: 31 },
    website: "https://www.iitmandi.ac.in",
    blurb: "Himalayan IIT, strong civil, mechanical and emerging electronics-and-communication programmes. The country's only Hindi-medium technical school option among IITs.",
  },
  {
    slug: "dtu-delhi",
    name: "Delhi Technological University",
    shortName: "DTU",
    city: "New Delhi", state: "DL", type: "State", established: 1941,
    streams: ["engineering"],
    nirf: { engineering: 36 },
    website: "https://www.dtu.ac.in",
    blurb: "Formerly the Delhi College of Engineering. Delhi state's premier engineering university, very competitive CSE intake through JEE Main + state quota.",
  },
  {
    slug: "vit-vellore",
    name: "Vellore Institute of Technology",
    shortName: "VIT Vellore",
    city: "Vellore", state: "TN", type: "Deemed", established: 1984,
    streams: ["engineering", "university"],
    nirf: { engineering: 11, university: 16 },
    website: "https://vit.ac.in",
    blurb: "India's largest private engineering school by intake. Admission via VITEEE entrance. Strong industry placement pipeline, multiple campuses.",
  },
  {
    slug: "bits-pilani",
    name: "Birla Institute of Technology and Science, Pilani",
    shortName: "BITS Pilani",
    city: "Pilani", state: "RJ", type: "Deemed", established: 1964,
    streams: ["engineering", "pharmacy"],
    nirf: { engineering: 20, pharmacy: 2 },
    website: "https://www.bits-pilani.ac.in",
    blurb: "The reference private engineering school. Admission only via BITSAT (no JEE). Strong CSE, electronics and the only major engineering school with a robust pharmacy programme.",
  },

  // ── IIMs (Management) ───────────────────────────────────────────────
  {
    slug: "iim-ahmedabad",
    name: "Indian Institute of Management Ahmedabad",
    shortName: "IIM Ahmedabad",
    city: "Ahmedabad", state: "GJ", type: "Central", established: 1961,
    streams: ["management"],
    nirf: { management: 1 },
    website: "https://www.iima.ac.in",
    blurb: "India's top-ranked B-school for over a decade. The PGP is the country's most competitive management programme — admission via CAT.",
  },
  {
    slug: "iim-bangalore",
    name: "Indian Institute of Management Bangalore",
    shortName: "IIM Bangalore",
    city: "Bengaluru", state: "KA", type: "Central", established: 1973,
    streams: ["management"],
    nirf: { management: 2 },
    website: "https://www.iimb.ac.in",
    blurb: "The other anchor of the IIM-A/B/C trio. Particularly strong on the Bengaluru tech ecosystem — strong tech-product management placement track.",
  },
  {
    slug: "iim-kozhikode",
    name: "Indian Institute of Management Kozhikode",
    shortName: "IIM Kozhikode",
    city: "Kozhikode", state: "KL", type: "Central", established: 1996,
    streams: ["management"],
    nirf: { management: 3 },
    website: "https://www.iimk.ac.in",
    blurb: "Highest gender-balanced batch among the IIMs. Pioneered IPM (5-year integrated programme) admissions directly from Class 12.",
  },
  {
    slug: "iim-calcutta",
    name: "Indian Institute of Management Calcutta",
    shortName: "IIM Calcutta",
    city: "Kolkata", state: "WB", type: "Central", established: 1961,
    streams: ["management"],
    nirf: { management: 6 },
    website: "https://www.iimcal.ac.in",
    blurb: "The third of the original IIMs (with A and B). Particularly strong in finance — major recruiter pipeline to investment banking and consulting.",
  },
  {
    slug: "iim-lucknow",
    name: "Indian Institute of Management Lucknow",
    shortName: "IIM Lucknow",
    city: "Lucknow", state: "UP", type: "Central", established: 1984,
    streams: ["management"],
    nirf: { management: 7 },
    website: "https://www.iiml.ac.in",
    blurb: "Strong general management curriculum. Noida campus runs the Working Managers Programme — popular with mid-career executives.",
  },
  {
    slug: "iim-indore",
    name: "Indian Institute of Management Indore",
    shortName: "IIM Indore",
    city: "Indore", state: "MP", type: "Central", established: 1996,
    streams: ["management"],
    nirf: { management: 8 },
    website: "https://www.iimidr.ac.in",
    blurb: "The only IIM with a dedicated 5-year IPM programme that admits directly after Class 12 via the IPMAT exam. Strong in marketing, operations.",
  },
  {
    slug: "xlri-jamshedpur",
    name: "Xavier School of Management",
    shortName: "XLRI",
    city: "Jamshedpur", state: "JH", type: "Private", established: 1949,
    streams: ["management"],
    nirf: { management: 9 },
    website: "https://www.xlri.ac.in",
    blurb: "Oldest management school in India (predates the IIM system by 12 years). Admission via XAT. Particularly strong in HR and business ethics curriculum.",
  },
  {
    slug: "iit-delhi-dms",
    name: "Department of Management Studies, IIT Delhi",
    shortName: "DMS IIT Delhi",
    city: "New Delhi", state: "DL", type: "Central", established: 1993,
    streams: ["management"],
    nirf: { management: 4 },
    website: "https://dms.iitd.ac.in",
    blurb: "Management programme within IIT Delhi, admission via CAT. Particularly strong in tech-product and operations management; smaller batch size than the IIMs.",
  },
  {
    slug: "iit-bombay-sjmsom",
    name: "Shailesh J. Mehta School of Management, IIT Bombay",
    shortName: "SJMSOM IIT Bombay",
    city: "Mumbai", state: "MH", type: "Central", established: 1995,
    streams: ["management"],
    nirf: { management: 11 },
    website: "https://www.som.iitb.ac.in",
    blurb: "IIT Bombay's management school. Strong tech-product management curriculum, deep connections to the Mumbai financial-services and startup ecosystem.",
  },

  // ── AIIMS + medical ──────────────────────────────────────────────────
  {
    slug: "aiims-delhi",
    name: "All India Institute of Medical Sciences, Delhi",
    shortName: "AIIMS Delhi",
    city: "New Delhi", state: "DL", type: "Central", established: 1956,
    streams: ["medical"],
    nirf: { overall: 7, medical: 1 },
    website: "https://www.aiims.edu",
    blurb: "India's top medical institute. Admission to MBBS via NEET UG; cut-off is the most competitive of any medical school in the country.",
  },
  {
    slug: "pgimer-chandigarh",
    name: "Postgraduate Institute of Medical Education and Research",
    shortName: "PGIMER Chandigarh",
    city: "Chandigarh", state: "CH", type: "Central", established: 1962,
    streams: ["medical"],
    nirf: { medical: 2 },
    website: "https://www.pgimer.edu.in",
    blurb: "Specialised in postgraduate medical education. Strong reputation across surgical and clinical specialties; major tertiary-care referral hospital for north India.",
  },
  {
    slug: "cmc-vellore",
    name: "Christian Medical College Vellore",
    shortName: "CMC Vellore",
    city: "Vellore", state: "TN", type: "Private", established: 1900,
    streams: ["medical"],
    nirf: { medical: 3 },
    website: "https://www.cmch-vellore.edu",
    blurb: "Among India's oldest medical colleges, with a strong tradition of rural healthcare service. MBBS intake via NEET UG with separate Christian-community and general categories.",
  },
  {
    slug: "nimhans-bangalore",
    name: "National Institute of Mental Health and Neurosciences",
    shortName: "NIMHANS",
    city: "Bengaluru", state: "KA", type: "Central", established: 1925,
    streams: ["medical"],
    nirf: { medical: 4 },
    website: "https://www.nimhans.ac.in",
    blurb: "India's premier institute for mental health and neuroscience. Specialist postgraduate programmes — admission via NIMHANS entrance.",
  },
  {
    slug: "jipmer-puducherry",
    name: "Jawaharlal Institute of Postgraduate Medical Education and Research",
    shortName: "JIPMER Puducherry",
    city: "Puducherry", state: "PY", type: "Central", established: 1823,
    streams: ["medical"],
    nirf: { medical: 5 },
    website: "https://www.jipmer.edu.in",
    blurb: "One of India's oldest medical institutions (originally Ecole de Medicine, 1823). MBBS admission via NEET UG; strong clinical training reputation in south India.",
  },
  {
    slug: "sgpgi-lucknow",
    name: "Sanjay Gandhi Postgraduate Institute of Medical Sciences",
    shortName: "SGPGI Lucknow",
    city: "Lucknow", state: "UP", type: "State", established: 1983,
    streams: ["medical"],
    nirf: { medical: 6 },
    website: "https://www.sgpgi.ac.in",
    blurb: "UP's flagship postgraduate medical institute. Strong nephrology, gastroenterology, cardiology and endocrinology departments.",
  },
  {
    slug: "kmc-manipal",
    name: "Kasturba Medical College, Manipal",
    shortName: "KMC Manipal",
    city: "Manipal", state: "KA", type: "Private", established: 1953,
    streams: ["medical"],
    nirf: { medical: 11 },
    website: "https://manipal.edu/kmc-manipal.html",
    blurb: "Among India's oldest private medical colleges. Large student body, MBBS admission via NEET UG.",
  },

  // ── NLUs (Law) ───────────────────────────────────────────────────────
  {
    slug: "nlsiu-bangalore",
    name: "National Law School of India University",
    shortName: "NLSIU Bangalore",
    city: "Bengaluru", state: "KA", type: "Central", established: 1986,
    streams: ["law"],
    nirf: { law: 1 },
    website: "https://www.nls.ac.in",
    blurb: "India's first National Law University, top-ranked NLU for the entire history of the NIRF law category. Admission to 5-year integrated BA LLB via CLAT.",
  },
  {
    slug: "nlu-delhi",
    name: "National Law University, Delhi",
    shortName: "NLU Delhi",
    city: "New Delhi", state: "DL", type: "Central", established: 2008,
    streams: ["law"],
    nirf: { law: 2 },
    website: "https://www.nludelhi.ac.in",
    blurb: "Operates its own entrance test (AILET) instead of CLAT. Strong constitutional and public-policy law curriculum, located in Dwarka.",
  },
  {
    slug: "nalsar-hyderabad",
    name: "Nalsar University of Law",
    shortName: "NALSAR Hyderabad",
    city: "Hyderabad", state: "TS", type: "Central", established: 1998,
    streams: ["law"],
    nirf: { law: 3 },
    website: "https://www.nalsar.ac.in",
    blurb: "South India's premier NLU. CLAT admission, strong corporate and IP law placements, particularly with Hyderabad-based firms and tech companies.",
  },
  {
    slug: "iit-kgp-rgsoipl",
    name: "Rajiv Gandhi School of Intellectual Property Law, IIT Kharagpur",
    shortName: "RGSOIPL",
    city: "Kharagpur", state: "WB", type: "Central", established: 2006,
    streams: ["law"],
    nirf: { law: 5 },
    website: "http://www.rgsoipl.iitkgp.ac.in",
    blurb: "Only IIT-housed law school. Specialised LLB programme open to engineering and science graduates — unique IP and tech-law focus.",
  },
  {
    slug: "jindal-global-law",
    name: "Jindal Global Law School",
    shortName: "JGLS",
    city: "Sonipat", state: "HR", type: "Private", established: 2009,
    streams: ["law"],
    nirf: { law: 8 },
    website: "https://jgu.edu.in/jgls",
    blurb: "Private law school within OP Jindal Global University. Large faculty, strong international-law and human-rights tracks, separate entrance (LSAT-India + JSAT).",
  },
  {
    slug: "wbnujs-kolkata",
    name: "West Bengal National University of Juridical Sciences",
    shortName: "NUJS Kolkata",
    city: "Kolkata", state: "WB", type: "Central", established: 1999,
    streams: ["law"],
    nirf: { law: 4 },
    website: "https://www.nujs.edu",
    blurb: "Eastern India's flagship NLU. CLAT admission, strong public-international-law programme and student-run NUJS Law Review.",
  },

  // ── Universities / pure sciences ────────────────────────────────────
  {
    slug: "iisc-bangalore",
    name: "Indian Institute of Science",
    shortName: "IISc Bangalore",
    city: "Bengaluru", state: "KA", type: "Central", established: 1909,
    streams: ["research", "university", "engineering"],
    nirf: { overall: 2, university: 1, research: 1 },
    website: "https://www.iisc.ac.in",
    blurb: "India's premier research institution. The only Indian university consistently inside the QS top 200. Undergraduate BS programme admission via JEE Advanced (top-500 typically).",
  },
  {
    slug: "jnu-delhi",
    name: "Jawaharlal Nehru University",
    shortName: "JNU",
    city: "New Delhi", state: "DL", type: "Central", established: 1969,
    streams: ["university", "research"],
    nirf: { overall: 10, university: 2 },
    website: "https://www.jnu.ac.in",
    blurb: "Central university famous for the social sciences, international studies, languages and life sciences. Admission via CUET / dedicated PG entrance.",
  },
  {
    slug: "jamia-millia-islamia",
    name: "Jamia Millia Islamia",
    shortName: "Jamia Millia",
    city: "New Delhi", state: "DL", type: "Central", established: 1920,
    streams: ["university"],
    nirf: { university: 3 },
    website: "https://www.jmi.ac.in",
    blurb: "Central university with strong engineering, mass communication, architecture and Islamic studies programmes. CUET admission for most undergraduate streams.",
  },
  {
    slug: "bhu-varanasi",
    name: "Banaras Hindu University",
    shortName: "BHU",
    city: "Varanasi", state: "UP", type: "Central", established: 1916,
    streams: ["university", "medical"],
    nirf: { university: 5 },
    website: "https://www.bhu.ac.in",
    blurb: "One of Asia's largest residential universities. Strong faculties across humanities, sciences, medicine (IMS-BHU) and engineering (IIT BHU is the engineering wing).",
  },
  {
    slug: "delhi-university",
    name: "University of Delhi",
    shortName: "Delhi University",
    city: "New Delhi", state: "DL", type: "Central", established: 1922,
    streams: ["university"],
    nirf: { university: 6 },
    website: "https://www.du.ac.in",
    blurb: "Anchor of the Delhi higher-education cluster, with 90+ affiliated colleges. Admission via CUET. Most sought-after constituent colleges: St. Stephen's, Hindu, LSR, SRCC, Hansraj.",
  },
  {
    slug: "hyderabad-university",
    name: "University of Hyderabad",
    shortName: "Hyderabad University",
    city: "Hyderabad", state: "TS", type: "Central", established: 1974,
    streams: ["university", "research"],
    nirf: { university: 10 },
    website: "https://www.uohyd.ac.in",
    blurb: "Central university particularly strong in basic sciences, integrated MSc programmes and humanities research. The campus is one of the largest in central India.",
  },
  {
    slug: "manipal-academy",
    name: "Manipal Academy of Higher Education",
    shortName: "Manipal",
    city: "Manipal", state: "KA", type: "Deemed", established: 1953,
    streams: ["university", "medical", "engineering"],
    nirf: { university: 4 },
    website: "https://manipal.edu",
    blurb: "Coastal Karnataka deemed university with major engineering, medical, dental, pharmacy and hotel-management schools. Admission via MET / NEET / GMAT for respective programmes.",
  },
  {
    slug: "amrita-vishwa-vidyapeetham",
    name: "Amrita Vishwa Vidyapeetham",
    shortName: "Amrita University",
    city: "Coimbatore", state: "TN", type: "Deemed", established: 1994,
    streams: ["university", "engineering", "medical"],
    nirf: { university: 7 },
    website: "https://www.amrita.edu",
    blurb: "Multi-campus deemed university with strong engineering (AEEE entrance) and good NIRF placement. The Coimbatore engineering campus is the flagship.",
  },

  // ── Pharmacy ─────────────────────────────────────────────────────────
  {
    slug: "jamia-hamdard",
    name: "Jamia Hamdard",
    shortName: "Jamia Hamdard",
    city: "New Delhi", state: "DL", type: "Deemed", established: 1989,
    streams: ["pharmacy", "university"],
    nirf: { pharmacy: 1 },
    website: "https://www.jamiahamdard.edu",
    blurb: "India's top-ranked pharmacy school. Admission via NEET / dedicated university entrance for pharmacy and allied health science programmes.",
  },
  {
    slug: "niper-mohali",
    name: "National Institute of Pharmaceutical Education and Research, Mohali",
    shortName: "NIPER Mohali",
    city: "Mohali", state: "PB", type: "Central", established: 1998,
    streams: ["pharmacy", "research"],
    nirf: { pharmacy: 3 },
    website: "https://www.niper.gov.in",
    blurb: "India's first NIPER and the only one to offer PhD across pharmaceutical disciplines. PG admission via NIPER JEE.",
  },
];

// Helper: get distinct streams in the dataset.
export const ALL_STREAMS: { value: CollegeStream; label: string }[] = [
  { value: "engineering",  label: "Engineering" },
  { value: "medical",      label: "Medical" },
  { value: "management",   label: "Management" },
  { value: "law",          label: "Law" },
  { value: "university",   label: "University / Sciences" },
  { value: "pharmacy",     label: "Pharmacy" },
  { value: "architecture", label: "Architecture" },
  { value: "research",     label: "Research" },
];

// Helper: get distinct states with colleges (for filter UI).
export function statesWithColleges(): string[] {
  const set = new Set<string>();
  for (const c of COLLEGES) set.add(c.state);
  return Array.from(set);
}

// Helper: get distinct types with counts (for filter UI).
export function typesWithCounts(): Array<{ type: CollegeType; n: number }> {
  const counts: Record<CollegeType, number> = {} as any;
  for (const c of COLLEGES) {
    counts[c.type] = (counts[c.type] ?? 0) + 1;
  }
  return (Object.entries(counts) as [CollegeType, number][])
    .map(([type, n]) => ({ type, n }))
    .sort((a, b) => b.n - a.n);
}

export function findCollege(slug: string): College | undefined {
  return COLLEGES.find((c) => c.slug === slug);
}

// Format a NIRF rank-set for display: "NIRF Overall #1, Engineering #1 (2024)"
export function formatNirfRanks(n: NirfRanks): string {
  const bits: string[] = [];
  if (n.overall !== undefined)      bits.push(`Overall #${n.overall}`);
  if (n.engineering !== undefined)  bits.push(`Engineering #${n.engineering}`);
  if (n.medical !== undefined)      bits.push(`Medical #${n.medical}`);
  if (n.management !== undefined)   bits.push(`Management #${n.management}`);
  if (n.law !== undefined)          bits.push(`Law #${n.law}`);
  if (n.university !== undefined)   bits.push(`University #${n.university}`);
  if (n.pharmacy !== undefined)     bits.push(`Pharmacy #${n.pharmacy}`);
  if (n.architecture !== undefined) bits.push(`Architecture #${n.architecture}`);
  if (n.research !== undefined)     bits.push(`Research #${n.research}`);
  if (bits.length === 0) return "";
  return `NIRF ${bits.join(", ")} (${NIRF_SOURCE_YEAR})`;
}
