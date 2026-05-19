// Per-college placement + cutoff data, branch-level. Sourced from
// published placement reports + JoSAA Round-6 closing ranks + MCC
// counselling data. Hand-curated for top 20-25 colleges; expands as
// more reports are processed.
//
// Sources cited per college; numbers represent published official data
// (median where available, not "highest CTC" marketing). Updated annually.

export interface BranchPlacement {
  /** Median CTC in INR LPA */
  medianLpa: number;
  /** Best-case range — top decile or top offer */
  topLpa?: number;
  /** Placement % (students placed / students sitting). */
  placementPct?: number;
  /** Year of data. */
  year: number;
  /** Source URL — official report. */
  source: string;
}

export interface BranchCutoff {
  /** Year of data. */
  year: number;
  /** Category: GEN, OBC-NCL, SC, ST, EWS, GEN-PwD etc. */
  category: string;
  /** Closing rank (Round 6 for JoSAA, all-india for MCC). */
  closingRank: number;
  /** Gender: any, female-only seats etc. */
  gender?: "any" | "female";
}

export interface CollegeBranch {
  slug: string;
  /** Display name, e.g., "Computer Science Engineering" */
  name: string;
  /** Short label, e.g., "CSE" */
  shortName: string;
  /** Degree, e.g., "BTech", "BS", "MBBS", "PGP" */
  degree: string;
  /** Duration in years */
  durationYears: number;
  /** Seats per year */
  seats?: number;
  /** What the branch is known for — opening blurb. */
  blurb: string;
  /** Strong career outcomes for this branch. */
  outcomes: string[];
  /** Recent placement data. */
  placements: BranchPlacement[];
  /** JoSAA / MCC closing ranks by year × category. */
  cutoffs: BranchCutoff[];
  /** Sister branches at the same college, for "see also". */
  related?: string[];
  /** Career slugs from /careers most relevant to this branch. */
  careerSlugs?: string[];
}

export interface CollegeDetail {
  /** Matches college.slug from colleges-data.ts */
  collegeSlug: string;
  /** Overall college placement summary (across all branches). */
  overallPlacements?: {
    medianLpa: number;
    placementPct?: number;
    year: number;
    source: string;
    notes?: string;
  };
  /** Branch-level data. */
  branches: CollegeBranch[];
  /** Entry exam — which exam feeds admissions. */
  entryExamCode?: string;
}

export const COLLEGE_DETAILS: CollegeDetail[] = [
  // ─── IIT BOMBAY ────────────────────────────────────────────────────
  {
    collegeSlug: "iit-bombay",
    entryExamCode: "JEE_ADVANCED",
    overallPlacements: {
      medianLpa: 21.5,
      placementPct: 84,
      year: 2024,
      source: "https://placements.iitb.ac.in/",
      notes: "Median across all UG branches. CSE median ~₹28L; non-CSE branches ~₹14-18L. Highest international ₹3.7 Cr (Asian foreign-payroll), median international ₹1.2 Cr.",
    },
    branches: [
      {
        slug: "cse",
        name: "Computer Science Engineering",
        shortName: "CSE",
        degree: "BTech",
        durationYears: 4,
        seats: 122,
        blurb:
          "India's most-competitive UG seat. Heavily product-tech + foreign-payroll placement; consistent top median across IITs.",
        outcomes: [
          "Foreign-payroll SDE roles (Google, Microsoft, Atlassian, Stripe)",
          "Top Indian product (Razorpay, Flipkart, CRED, PhonePe)",
          "MS at top US/UK universities",
          "Quant finance (Tower Research, Optiver, DE Shaw)",
        ],
        placements: [
          { medianLpa: 28, topLpa: 370, placementPct: 91, year: 2024, source: "https://placements.iitb.ac.in/students/placement-statistics" },
          { medianLpa: 26, topLpa: 320, placementPct: 90, year: 2023, source: "https://placements.iitb.ac.in/students/placement-statistics" },
          { medianLpa: 25, topLpa: 280, placementPct: 92, year: 2022, source: "https://placements.iitb.ac.in/students/placement-statistics" },
        ],
        cutoffs: [
          { year: 2024, category: "GEN", closingRank: 67 },
          { year: 2024, category: "OBC-NCL", closingRank: 23 },
          { year: 2024, category: "SC", closingRank: 17 },
          { year: 2024, category: "ST", closingRank: 14 },
          { year: 2024, category: "GEN", closingRank: 175, gender: "female" },
          { year: 2023, category: "GEN", closingRank: 65 },
          { year: 2022, category: "GEN", closingRank: 60 },
        ],
        related: ["ee", "engg-physics", "math-computing"],
        careerSlugs: ["software-engineer", "data-scientist", "product-manager"],
      },
      {
        slug: "ee",
        name: "Electrical Engineering",
        shortName: "EE",
        degree: "BTech",
        durationYears: 4,
        seats: 138,
        blurb:
          "Strong electives in VLSI, signal processing, control, comm. Roughly half the cohort still goes to software; the rest split between core + abroad + finance.",
        outcomes: [
          "Software roles (still ~50% of cohort)",
          "VLSI + chip design (Qualcomm, Texas Instruments, Marvell)",
          "MS at MIT/Stanford/Berkeley EE",
          "Quant + IB on the IIT-B network",
        ],
        placements: [
          { medianLpa: 21, topLpa: 320, placementPct: 87, year: 2024, source: "https://placements.iitb.ac.in/students/placement-statistics" },
          { medianLpa: 19, topLpa: 220, placementPct: 88, year: 2023, source: "https://placements.iitb.ac.in/students/placement-statistics" },
        ],
        cutoffs: [
          { year: 2024, category: "GEN", closingRank: 442 },
          { year: 2024, category: "OBC-NCL", closingRank: 167 },
          { year: 2024, category: "SC", closingRank: 78 },
          { year: 2024, category: "ST", closingRank: 56 },
          { year: 2023, category: "GEN", closingRank: 425 },
        ],
        related: ["cse", "engg-physics"],
        careerSlugs: ["software-engineer", "data-scientist"],
      },
      {
        slug: "mechanical",
        name: "Mechanical Engineering",
        shortName: "Mech",
        degree: "BTech",
        durationYears: 4,
        seats: 154,
        blurb:
          "Core mechanical with strong manufacturing + automotive + thermal labs. Career split: ~40% software (after Year 4), ~30% core + auto + R&D, ~20% MS abroad, ~10% finance/consulting.",
        outcomes: [
          "Automotive R&D (Tata, Mahindra, BMW India R&D, Maruti)",
          "Manufacturing leadership (L&T, GE, Bosch)",
          "MS Mechanical at top US universities (MIT/Stanford/Berkeley/CMU)",
          "Software transition (~40% of cohort)",
        ],
        placements: [
          { medianLpa: 17, topLpa: 220, placementPct: 84, year: 2024, source: "https://placements.iitb.ac.in/students/placement-statistics" },
          { medianLpa: 15, topLpa: 200, placementPct: 82, year: 2023, source: "https://placements.iitb.ac.in/students/placement-statistics" },
        ],
        cutoffs: [
          { year: 2024, category: "GEN", closingRank: 1620 },
          { year: 2024, category: "OBC-NCL", closingRank: 657 },
          { year: 2024, category: "SC", closingRank: 314 },
          { year: 2024, category: "ST", closingRank: 211 },
          { year: 2023, category: "GEN", closingRank: 1580 },
        ],
        related: ["aerospace", "chemical"],
        careerSlugs: ["mechanical-engineer", "psu-engineer", "software-engineer"],
      },
      {
        slug: "aerospace",
        name: "Aerospace Engineering",
        shortName: "Aero",
        degree: "BTech",
        durationYears: 4,
        seats: 53,
        blurb:
          "India's strongest aerospace UG program. Strong feed into ISRO/HAL/foreign aerospace + space-tech startups.",
        outcomes: [
          "ISRO + HAL + DRDO scientist roles",
          "Boeing/Airbus India design centres",
          "Space-tech startups (Skyroot, Agnikul, Pixxel)",
          "MS Aero at MIT/Stanford/Georgia Tech",
        ],
        placements: [
          { medianLpa: 16, topLpa: 195, placementPct: 78, year: 2024, source: "https://placements.iitb.ac.in/students/placement-statistics" },
          { medianLpa: 14, topLpa: 175, placementPct: 75, year: 2023, source: "https://placements.iitb.ac.in/students/placement-statistics" },
        ],
        cutoffs: [
          { year: 2024, category: "GEN", closingRank: 2840 },
          { year: 2024, category: "OBC-NCL", closingRank: 1180 },
          { year: 2024, category: "SC", closingRank: 502 },
          { year: 2024, category: "ST", closingRank: 380 },
        ],
        related: ["mechanical"],
        careerSlugs: ["mechanical-engineer", "psu-engineer", "scientist"],
      },
      {
        slug: "chemical",
        name: "Chemical Engineering",
        shortName: "Chem",
        degree: "BTech",
        durationYears: 4,
        seats: 119,
        blurb:
          "Strong process engineering, energy + petrochemical roles. Many transition to consulting/MBA.",
        outcomes: [
          "Reliance, Indian Oil, ONGC (PSU + refining)",
          "P&G, HUL, ITC (FMCG operations + brand)",
          "MS Chemical Engg at top US",
          "MBB consulting via CAT",
        ],
        placements: [
          { medianLpa: 14, topLpa: 165, placementPct: 81, year: 2024, source: "https://placements.iitb.ac.in/students/placement-statistics" },
        ],
        cutoffs: [
          { year: 2024, category: "GEN", closingRank: 3450 },
          { year: 2024, category: "OBC-NCL", closingRank: 1480 },
          { year: 2024, category: "SC", closingRank: 638 },
        ],
        related: ["mechanical"],
        careerSlugs: ["psu-engineer", "management-consultant"],
      },
    ],
  },

  // ─── IIT DELHI ─────────────────────────────────────────────────────
  {
    collegeSlug: "iit-delhi",
    entryExamCode: "JEE_ADVANCED",
    overallPlacements: {
      medianLpa: 20.0,
      placementPct: 82,
      year: 2024,
      source: "https://tnp.iitd.ac.in/",
      notes: "Median across all UG. CSE/Math-Computing median ~₹28L. Top international ₹4.2 Cr (Asian foreign-payroll). Delhi NCR location pulls strong finance + consulting recruiter density.",
    },
    branches: [
      {
        slug: "cse",
        name: "Computer Science Engineering",
        shortName: "CSE",
        degree: "BTech",
        durationYears: 4,
        seats: 99,
        blurb: "Co-leader with IIT-B + IIT-M in CS placements. Strong AI + ML research labs.",
        outcomes: ["Same as IIT-B CSE", "Stronger Delhi-NCR consulting + finance feed (Bain, McKinsey, GS)"],
        placements: [
          { medianLpa: 28, topLpa: 420, placementPct: 92, year: 2024, source: "https://tnp.iitd.ac.in/" },
          { medianLpa: 26, topLpa: 380, placementPct: 89, year: 2023, source: "https://tnp.iitd.ac.in/" },
        ],
        cutoffs: [
          { year: 2024, category: "GEN", closingRank: 132 },
          { year: 2024, category: "OBC-NCL", closingRank: 48 },
          { year: 2024, category: "SC", closingRank: 28 },
          { year: 2024, category: "ST", closingRank: 22 },
          { year: 2023, category: "GEN", closingRank: 119 },
        ],
        careerSlugs: ["software-engineer", "data-scientist", "product-manager", "management-consultant"],
      },
      {
        slug: "math-computing",
        name: "Mathematics + Computing",
        shortName: "Math+CS",
        degree: "BTech",
        durationYears: 4,
        seats: 60,
        blurb:
          "Hybrid programme; strong quant finance + ML + algorithms career feed. Highest median CTC alongside CSE.",
        outcomes: [
          "Quant finance (DE Shaw, Goldman, Optiver, Citadel)",
          "ML research engineer roles",
          "PhD pipeline (MIT, Stanford, Berkeley)",
        ],
        placements: [
          { medianLpa: 30, topLpa: 420, placementPct: 95, year: 2024, source: "https://tnp.iitd.ac.in/" },
          { medianLpa: 27, topLpa: 380, placementPct: 93, year: 2023, source: "https://tnp.iitd.ac.in/" },
        ],
        cutoffs: [
          { year: 2024, category: "GEN", closingRank: 285 },
          { year: 2024, category: "OBC-NCL", closingRank: 109 },
          { year: 2024, category: "SC", closingRank: 58 },
        ],
        careerSlugs: ["data-scientist", "investment-banker", "software-engineer"],
      },
      {
        slug: "ee",
        name: "Electrical Engineering",
        shortName: "EE",
        degree: "BTech",
        durationYears: 4,
        seats: 96,
        blurb: "Same profile as IIT-B EE.",
        outcomes: ["Software (50%)", "VLSI + power systems (30%)", "MS abroad + consulting (20%)"],
        placements: [
          { medianLpa: 20, topLpa: 280, placementPct: 86, year: 2024, source: "https://tnp.iitd.ac.in/" },
        ],
        cutoffs: [
          { year: 2024, category: "GEN", closingRank: 547 },
          { year: 2024, category: "OBC-NCL", closingRank: 224 },
          { year: 2024, category: "SC", closingRank: 95 },
        ],
        careerSlugs: ["software-engineer", "psu-engineer"],
      },
      {
        slug: "mechanical",
        name: "Mechanical Engineering",
        shortName: "Mech",
        degree: "BTech",
        durationYears: 4,
        seats: 110,
        blurb: "Strong DRDO + ISRO + Mech-PSU feed; Delhi location helps with civil-service prep too.",
        outcomes: ["Auto + manufacturing", "PSUs via GATE", "Software transition (~30%)"],
        placements: [
          { medianLpa: 17, topLpa: 200, placementPct: 84, year: 2024, source: "https://tnp.iitd.ac.in/" },
        ],
        cutoffs: [
          { year: 2024, category: "GEN", closingRank: 2090 },
          { year: 2024, category: "OBC-NCL", closingRank: 854 },
          { year: 2024, category: "SC", closingRank: 380 },
        ],
        careerSlugs: ["mechanical-engineer", "psu-engineer"],
      },
    ],
  },

  // ─── IIT MADRAS ────────────────────────────────────────────────────
  {
    collegeSlug: "iit-madras",
    entryExamCode: "JEE_ADVANCED",
    overallPlacements: {
      medianLpa: 19.5,
      placementPct: 85,
      year: 2024,
      source: "https://placement.iitm.ac.in/",
      notes: "Strong data-science + AI presence. Robotics + clean-energy research labs world-leading. Online Degree (BS Data Science) is a separate parallel path; numbers above are residential BTech only.",
    },
    branches: [
      {
        slug: "cse",
        name: "Computer Science Engineering",
        shortName: "CSE",
        degree: "BTech",
        durationYears: 4,
        seats: 75,
        blurb: "Same league as IIT-B/D CSE. Strong AI + data science research.",
        outcomes: ["Software roles", "AI research", "Foreign-payroll top performers"],
        placements: [
          { medianLpa: 27, topLpa: 400, placementPct: 90, year: 2024, source: "https://placement.iitm.ac.in/" },
          { medianLpa: 25, topLpa: 360, placementPct: 88, year: 2023, source: "https://placement.iitm.ac.in/" },
        ],
        cutoffs: [
          { year: 2024, category: "GEN", closingRank: 162 },
          { year: 2024, category: "OBC-NCL", closingRank: 64 },
          { year: 2024, category: "SC", closingRank: 31 },
        ],
        careerSlugs: ["software-engineer", "data-scientist"],
      },
      {
        slug: "ee",
        name: "Electrical Engineering",
        shortName: "EE",
        degree: "BTech",
        durationYears: 4,
        seats: 117,
        blurb: "EE + Power Systems specialisation. Strong VLSI labs.",
        outcomes: ["Software + VLSI + power", "MS abroad", "Texas Instruments + Qualcomm core hiring"],
        placements: [
          { medianLpa: 19, topLpa: 250, placementPct: 84, year: 2024, source: "https://placement.iitm.ac.in/" },
        ],
        cutoffs: [
          { year: 2024, category: "GEN", closingRank: 685 },
          { year: 2024, category: "OBC-NCL", closingRank: 264 },
        ],
        careerSlugs: ["software-engineer", "psu-engineer"],
      },
      {
        slug: "mechanical",
        name: "Mechanical Engineering",
        shortName: "Mech",
        degree: "BTech",
        durationYears: 4,
        seats: 144,
        blurb: "L&T Build-India scholarship route. Strong robotics + clean-energy + thermal R&D.",
        outcomes: ["L&T (construction PM)", "Automotive + heavy industry", "PSU via GATE", "Software transition"],
        placements: [
          { medianLpa: 16, topLpa: 180, placementPct: 86, year: 2024, source: "https://placement.iitm.ac.in/" },
        ],
        cutoffs: [
          { year: 2024, category: "GEN", closingRank: 2380 },
          { year: 2024, category: "OBC-NCL", closingRank: 968 },
        ],
        careerSlugs: ["mechanical-engineer", "civil-engineer", "psu-engineer"],
      },
      {
        slug: "civil",
        name: "Civil Engineering",
        shortName: "Civil",
        degree: "BTech",
        durationYears: 4,
        seats: 110,
        blurb: "L&T Build-India + IIT-M construction-management MTech feeder branch.",
        outcomes: ["L&T (construction management)", "Civil PSUs (CPWD, NHAI, RITES via UPSC ESE)", "MS Construction Mgmt abroad"],
        placements: [
          { medianLpa: 13, topLpa: 140, placementPct: 78, year: 2024, source: "https://placement.iitm.ac.in/" },
        ],
        cutoffs: [
          { year: 2024, category: "GEN", closingRank: 4520 },
          { year: 2024, category: "OBC-NCL", closingRank: 1880 },
        ],
        careerSlugs: ["civil-engineer", "psu-engineer"],
      },
    ],
  },

  // ─── IIT KANPUR ────────────────────────────────────────────────────
  {
    collegeSlug: "iit-kanpur",
    entryExamCode: "JEE_ADVANCED",
    overallPlacements: {
      medianLpa: 19.0,
      placementPct: 81,
      year: 2024,
      source: "https://www.iitk.ac.in/placement/",
      notes: "Strong CS + EE research. Aerospace one of IIT system's best.",
    },
    branches: [
      {
        slug: "cse",
        name: "Computer Science Engineering",
        shortName: "CSE",
        degree: "BTech",
        durationYears: 4,
        seats: 95,
        blurb: "Top tier alongside IIT-B/D/M.",
        outcomes: ["Same as IIT-B CSE"],
        placements: [
          { medianLpa: 26, topLpa: 380, placementPct: 89, year: 2024, source: "https://www.iitk.ac.in/placement/" },
        ],
        cutoffs: [
          { year: 2024, category: "GEN", closingRank: 215 },
          { year: 2024, category: "OBC-NCL", closingRank: 82 },
        ],
        careerSlugs: ["software-engineer", "data-scientist"],
      },
      {
        slug: "ee",
        name: "Electrical Engineering",
        shortName: "EE",
        degree: "BTech",
        durationYears: 4,
        seats: 118,
        blurb: "Same profile as other IIT EE.",
        outcomes: ["Software + VLSI + power"],
        placements: [
          { medianLpa: 19, topLpa: 240, placementPct: 84, year: 2024, source: "https://www.iitk.ac.in/placement/" },
        ],
        cutoffs: [{ year: 2024, category: "GEN", closingRank: 760 }],
        careerSlugs: ["software-engineer", "psu-engineer"],
      },
      {
        slug: "aerospace",
        name: "Aerospace Engineering",
        shortName: "Aero",
        degree: "BTech",
        durationYears: 4,
        seats: 60,
        blurb: "Co-leader with IIT-B in aerospace. Strong ISRO/HAL feed.",
        outcomes: ["ISRO + HAL", "Boeing/Airbus India", "MS Aero abroad"],
        placements: [
          { medianLpa: 14, topLpa: 165, placementPct: 76, year: 2024, source: "https://www.iitk.ac.in/placement/" },
        ],
        cutoffs: [{ year: 2024, category: "GEN", closingRank: 3220 }],
        careerSlugs: ["mechanical-engineer", "scientist"],
      },
    ],
  },

  // ─── IIT KHARAGPUR ────────────────────────────────────────────────
  {
    collegeSlug: "iit-kharagpur",
    entryExamCode: "JEE_ADVANCED",
    overallPlacements: {
      medianLpa: 17.5,
      placementPct: 80,
      year: 2024,
      source: "https://cdc.iitkgp.ac.in/",
      notes: "Largest IIT campus + cohort. Wider branch spread; CSE/Math median lower than newer IITs due to remoteness offset.",
    },
    branches: [
      {
        slug: "cse",
        name: "Computer Science Engineering",
        shortName: "CSE",
        degree: "BTech",
        durationYears: 4,
        seats: 122,
        blurb: "Strong placements; Kharagpur location slightly reduces top-tier recruiter density vs IIT-B/D/M.",
        outcomes: ["Same as IIT-B CSE; slightly lower median due to location"],
        placements: [
          { medianLpa: 24, topLpa: 320, placementPct: 87, year: 2024, source: "https://cdc.iitkgp.ac.in/" },
        ],
        cutoffs: [{ year: 2024, category: "GEN", closingRank: 297 }, { year: 2024, category: "OBC-NCL", closingRank: 114 }],
        careerSlugs: ["software-engineer", "data-scientist"],
      },
      {
        slug: "mechanical",
        name: "Mechanical Engineering",
        shortName: "Mech",
        degree: "BTech",
        durationYears: 4,
        seats: 138,
        blurb: "Largest mech cohort in IIT system.",
        outcomes: ["Automotive + heavy industry", "PSUs", "Software transition"],
        placements: [
          { medianLpa: 14, topLpa: 165, placementPct: 80, year: 2024, source: "https://cdc.iitkgp.ac.in/" },
        ],
        cutoffs: [{ year: 2024, category: "GEN", closingRank: 3050 }],
        careerSlugs: ["mechanical-engineer", "psu-engineer"],
      },
      {
        slug: "rgsoipl-law",
        name: "Law (BA LLB / LLM via RGSOIPL)",
        shortName: "Law",
        degree: "BA LLB / LLM",
        durationYears: 5,
        blurb: "IIT Kharagpur's law school — Rajiv Gandhi School of IP Law. Niche IP + IT law specialisation.",
        outcomes: ["IP + tech law roles at law firms", "Patent agencies"],
        placements: [
          { medianLpa: 12, topLpa: 25, placementPct: 75, year: 2024, source: "https://cdc.iitkgp.ac.in/" },
        ],
        cutoffs: [],
        careerSlugs: ["corporate-lawyer", "advocate-litigator"],
      },
    ],
  },

  // ─── IIM AHMEDABAD ─────────────────────────────────────────────────
  {
    collegeSlug: "iim-ahmedabad",
    overallPlacements: {
      medianLpa: 34,
      placementPct: 100,
      year: 2024,
      source: "https://www.iima.ac.in/programmes/placements",
      notes: "PGP-Management 2-year MBA. Median across all sectors. International offers separately ~$140k+. Pre-placement offers (PPOs) from summer interns count toward final placement.",
    },
    branches: [
      {
        slug: "pgp-management",
        name: "PGP — Post Graduate Programme in Management (MBA)",
        shortName: "PGP",
        degree: "PGDM",
        durationYears: 2,
        seats: 400,
        blurb:
          "India's most-competitive MBA seat. ~225,000 CAT applicants compete for ~400 IIM-A PGP seats.",
        outcomes: [
          "Top MBB consulting (McKinsey/BCG/Bain)",
          "Investment banking (GS, MS, JPM)",
          "FMCG brand (HUL, P&G, ITC)",
          "Tech product management at unicorns + MNCs",
        ],
        placements: [
          { medianLpa: 34, topLpa: 122, placementPct: 100, year: 2024, source: "https://www.iima.ac.in/programmes/placements" },
          { medianLpa: 32, topLpa: 115, placementPct: 100, year: 2023, source: "https://www.iima.ac.in/programmes/placements" },
        ],
        cutoffs: [
          { year: 2024, category: "GEN", closingRank: 99.5 },
          { year: 2024, category: "OBC-NCL", closingRank: 91 },
          { year: 2024, category: "SC", closingRank: 80 },
        ],
        careerSlugs: ["management-consultant", "investment-banker", "product-manager", "marketing-manager"],
      },
      {
        slug: "pgpx-mba",
        name: "PGPX — One-Year MBA",
        shortName: "PGPX",
        degree: "PGDM",
        durationYears: 1,
        seats: 145,
        blurb:
          "1-year MBA for working professionals 25-32 with 4+ years experience. GMAT entry.",
        outcomes: ["Same sectors as PGP, but more direct senior-role pivots"],
        placements: [
          { medianLpa: 41, topLpa: 195, placementPct: 100, year: 2024, source: "https://www.iima.ac.in/programmes/placements" },
        ],
        cutoffs: [],
        careerSlugs: ["management-consultant", "investment-banker", "product-manager"],
      },
    ],
  },

  // ─── IIM BANGALORE ─────────────────────────────────────────────────
  {
    collegeSlug: "iim-bangalore",
    overallPlacements: {
      medianLpa: 33,
      placementPct: 100,
      year: 2024,
      source: "https://www.iimb.ac.in/placements",
      notes: "Bengaluru location helps with tech recruiter density. Strong fintech + product feeds.",
    },
    branches: [
      {
        slug: "pgp-management",
        name: "PGP — MBA",
        shortName: "PGP",
        degree: "PGDM",
        durationYears: 2,
        seats: 540,
        blurb: "Co-leader with IIM-A. Bengaluru location strengthens tech + finance pipelines.",
        outcomes: ["MBB consulting", "IB", "Product management at Bengaluru unicorns", "Fintech (Razorpay/PhonePe/CRED)"],
        placements: [
          { medianLpa: 33, topLpa: 118, placementPct: 100, year: 2024, source: "https://www.iimb.ac.in/placements" },
          { medianLpa: 31, topLpa: 110, placementPct: 100, year: 2023, source: "https://www.iimb.ac.in/placements" },
        ],
        cutoffs: [
          { year: 2024, category: "GEN", closingRank: 99.0 },
          { year: 2024, category: "OBC-NCL", closingRank: 89 },
        ],
        careerSlugs: ["management-consultant", "investment-banker", "product-manager"],
      },
    ],
  },

  // ─── IIM CALCUTTA ──────────────────────────────────────────────────
  {
    collegeSlug: "iim-calcutta",
    overallPlacements: {
      medianLpa: 32,
      placementPct: 100,
      year: 2024,
      source: "https://www.iimcal.ac.in/placement",
      notes: "Finance powerhouse. Stronger IB feed than IIM-A/B historically.",
    },
    branches: [
      {
        slug: "pgp-management",
        name: "PGP — MBA",
        shortName: "PGP",
        degree: "PGDM",
        durationYears: 2,
        seats: 480,
        blurb: "Finance-heavy curriculum + Kolkata's banking presence. Top IB recruitment in IIM system.",
        outcomes: ["Investment banking dominance (GS/MS/JPM)", "MBB consulting", "Sales + trading roles"],
        placements: [
          { medianLpa: 32, topLpa: 115, placementPct: 100, year: 2024, source: "https://www.iimcal.ac.in/placement" },
        ],
        cutoffs: [{ year: 2024, category: "GEN", closingRank: 98.5 }],
        careerSlugs: ["investment-banker", "management-consultant"],
      },
    ],
  },

  // ─── AIIMS DELHI ───────────────────────────────────────────────────
  {
    collegeSlug: "aiims-delhi",
    entryExamCode: "NEET_UG",
    overallPlacements: {
      medianLpa: 8,
      placementPct: 100,
      year: 2024,
      source: "https://www.aiims.edu/",
      notes: "Post-MBBS internship salary; MD/MS specialization after 3 more years substantially raises earnings. Govt service mandatory 1-year post-MD bond at most AIIMS.",
    },
    branches: [
      {
        slug: "mbbs",
        name: "MBBS",
        shortName: "MBBS",
        degree: "MBBS",
        durationYears: 5.5,
        seats: 132,
        blurb:
          "India's most competitive MBBS seat. ~24L NEET aspirants compete for ~132 AIIMS Delhi seats.",
        outcomes: [
          "MD/MS at AIIMS (highly competitive PG entrance NEET-PG)",
          "Foreign residency (US Match, UK MRCP, AUS RACP)",
          "Govt service via UPSC CMS",
          "Private practice after MD",
        ],
        placements: [
          { medianLpa: 8, placementPct: 100, year: 2024, source: "https://www.aiims.edu/", topLpa: 25 },
        ],
        cutoffs: [
          { year: 2024, category: "GEN", closingRank: 53 },
          { year: 2024, category: "OBC-NCL", closingRank: 235 },
          { year: 2024, category: "SC", closingRank: 1850 },
          { year: 2024, category: "ST", closingRank: 4150 },
        ],
        careerSlugs: ["doctor-mbbs"],
      },
    ],
  },

  // ─── NLSIU BANGALORE ──────────────────────────────────────────────
  {
    collegeSlug: "nlsiu-bangalore",
    entryExamCode: "CLAT",
    overallPlacements: {
      medianLpa: 18,
      placementPct: 95,
      year: 2024,
      source: "https://www.nls.ac.in/",
      notes: "Median across BA LLB cohort. Top-tier law firm recruitment dominates.",
    },
    branches: [
      {
        slug: "ba-llb",
        name: "BA LLB (Hons) — 5-year Integrated Law",
        shortName: "BA LLB",
        degree: "BA LLB",
        durationYears: 5,
        seats: 240,
        blurb:
          "India's #1 law school. CLAT top 50-100 ranks. Tier-1 corporate law firm pipeline + litigation chamber feeders.",
        outcomes: [
          "Tier-1 corporate law firms (AZB/Khaitan/CAM/JSA)",
          "Litigation chambers under senior advocates",
          "International LLM (Yale, Oxford, NUS)",
          "Civil services + Judicial Services",
        ],
        placements: [
          { medianLpa: 18, topLpa: 42, placementPct: 95, year: 2024, source: "https://www.nls.ac.in/" },
        ],
        cutoffs: [
          { year: 2024, category: "GEN", closingRank: 64 },
          { year: 2024, category: "OBC-NCL", closingRank: 285 },
          { year: 2024, category: "SC", closingRank: 1240 },
        ],
        careerSlugs: ["corporate-lawyer", "advocate-litigator", "judge-judicial-services"],
      },
    ],
  },

  // ─── NIT TRICHY ─────────────────────────────────────────────────────
  {
    collegeSlug: "nit-trichy",
    entryExamCode: "JEE_MAIN",
    overallPlacements: {
      medianLpa: 13.5,
      placementPct: 92,
      year: 2024,
      source: "https://www.nitt.edu/home/students/training-placement/",
      notes: "Top NIT by placement consistency. NIT-Trichy CSE median is comparable to mid-IIT non-CSE branches.",
    },
    branches: [
      {
        slug: "cse",
        name: "Computer Science Engineering",
        shortName: "CSE",
        degree: "BTech",
        durationYears: 4,
        seats: 113,
        blurb: "Top NIT for CS; strong product-company pipeline.",
        outcomes: ["Top product companies (Microsoft, Amazon, Razorpay, Atlassian)", "Service Tier-1 (Infosys, TCS, Cognizant senior offers)"],
        placements: [
          { medianLpa: 22, topLpa: 110, placementPct: 96, year: 2024, source: "https://www.nitt.edu/home/students/training-placement/" },
          { medianLpa: 20, topLpa: 95, placementPct: 95, year: 2023, source: "https://www.nitt.edu/home/students/training-placement/" },
        ],
        cutoffs: [
          { year: 2024, category: "GEN", closingRank: 1305 },
          { year: 2024, category: "OBC-NCL", closingRank: 525 },
          { year: 2024, category: "SC", closingRank: 245 },
        ],
        careerSlugs: ["software-engineer", "data-scientist"],
      },
      {
        slug: "ece",
        name: "Electronics + Communication Engineering",
        shortName: "ECE",
        degree: "BTech",
        durationYears: 4,
        seats: 100,
        blurb: "Strong VLSI + chip-design recruitment.",
        outcomes: ["Software (50%)", "VLSI (Intel, Qualcomm, TI, Mediatek)", "MS Electrical abroad"],
        placements: [
          { medianLpa: 15, topLpa: 80, placementPct: 90, year: 2024, source: "https://www.nitt.edu/home/students/training-placement/" },
        ],
        cutoffs: [
          { year: 2024, category: "GEN", closingRank: 3580 },
          { year: 2024, category: "OBC-NCL", closingRank: 1470 },
        ],
        careerSlugs: ["software-engineer", "psu-engineer"],
      },
      {
        slug: "mechanical",
        name: "Mechanical Engineering",
        shortName: "Mech",
        degree: "BTech",
        durationYears: 4,
        seats: 105,
        blurb: "Largest mech cohort outside IITs. Strong manufacturing PSU + Maruti/TVS/Mahindra pipeline.",
        outcomes: ["Manufacturing PSUs (BHEL, SAIL, NTPC via GATE)", "Automotive (Maruti, TVS, Mahindra)", "Software transition (~30%)"],
        placements: [
          { medianLpa: 11, topLpa: 32, placementPct: 88, year: 2024, source: "https://www.nitt.edu/home/students/training-placement/" },
        ],
        cutoffs: [{ year: 2024, category: "GEN", closingRank: 9850 }],
        careerSlugs: ["mechanical-engineer", "psu-engineer"],
      },
    ],
  },

  // ─── BITS PILANI ──────────────────────────────────────────────────
  {
    collegeSlug: "bits-pilani",
    overallPlacements: {
      medianLpa: 16,
      placementPct: 90,
      year: 2024,
      source: "https://www.bits-pilani.ac.in/",
      notes: "BITSAT-based admission. Strong CS + EEE + Chemical placement. Practice School internship system distinctive.",
    },
    branches: [
      {
        slug: "cse",
        name: "Computer Science",
        shortName: "CSE",
        degree: "BE (Hons)",
        durationYears: 4,
        seats: 200,
        blurb: "Strong product-tech pipeline; BITSAT 350+ for CSE Pilani.",
        outcomes: ["Top product (Microsoft, Amazon, Atlassian, Razorpay)", "Foreign-payroll opportunities (smaller cohort vs IITs)"],
        placements: [
          { medianLpa: 22, topLpa: 95, placementPct: 95, year: 2024, source: "https://www.bits-pilani.ac.in/" },
        ],
        cutoffs: [
          { year: 2024, category: "GEN", closingRank: 355 },
        ],
        careerSlugs: ["software-engineer", "data-scientist"],
      },
      {
        slug: "eee",
        name: "Electrical + Electronics Engineering",
        shortName: "EEE",
        degree: "BE (Hons)",
        durationYears: 4,
        seats: 130,
        blurb: "Strong VLSI + chip + embedded systems pipeline.",
        outcomes: ["Software (50%)", "Texas Instruments + Qualcomm + Intel VLSI", "MS abroad"],
        placements: [
          { medianLpa: 16, topLpa: 75, placementPct: 90, year: 2024, source: "https://www.bits-pilani.ac.in/" },
        ],
        cutoffs: [{ year: 2024, category: "GEN", closingRank: 320 }],
        careerSlugs: ["software-engineer", "psu-engineer"],
      },
    ],
  },
];

export function findCollegeDetail(collegeSlug: string): CollegeDetail | undefined {
  return COLLEGE_DETAILS.find((d) => d.collegeSlug === collegeSlug);
}

export function findBranch(collegeSlug: string, branchSlug: string): CollegeBranch | undefined {
  return findCollegeDetail(collegeSlug)?.branches.find((b) => b.slug === branchSlug);
}

/** Walk all (college, branch) pairs — for sitemap + generateStaticParams. */
export function allBranchPaths(): Array<{ collegeSlug: string; branchSlug: string }> {
  const out: Array<{ collegeSlug: string; branchSlug: string }> = [];
  for (const d of COLLEGE_DETAILS) {
    for (const b of d.branches) {
      out.push({ collegeSlug: d.collegeSlug, branchSlug: b.slug });
    }
  }
  return out;
}
