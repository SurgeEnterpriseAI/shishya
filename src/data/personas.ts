// Persona data — drives the homepage picker + the /for/[persona]
// landing pages.
//
// Each persona represents a discrete student-intent at a stage of the
// journey: "I'm a Class 12 medical aspirant", "I want a banking job",
// etc. Picking a persona routes the visitor away from the
// overwhelming "163 exams catalogue" view and into a curated set
// (3-5 exams + 2-3 relevant articles + next-step bullets).
//
// Authoring principles:
//   - Cover the top 8 student-intent buckets — broad enough that
//     every visitor sees themselves in one chip; narrow enough that
//     each persona's curated set isn't itself overwhelming.
//   - `examCodes` MUST exist in the live Exam catalogue (verified
//     during the build smoke test).
//   - `articleSlugs` MUST exist in src/data/insights-articles.ts.
//   - `nextSteps` are concrete, action-oriented bullets — what this
//     specific persona should do this week / month.

export interface Persona {
  /** URL slug — used at /for/[slug]. Stable; don't rename casually. */
  slug: string;
  /** Card title on the homepage picker. */
  label: string;
  /** Larger heading on the landing page. */
  pageTitle: string;
  /** Short blurb on the homepage card. */
  blurb: string;
  /** Longer paragraph on the landing page hero. */
  description: string;
  /** Numeric badge for the homepage card (no emoji — keeps the
   *  visual tight and matches the rest of the site's styling). */
  badge: string;
  /** Onboarding stage this persona maps to (User.onbStage). Drives the
   *  1-click onboarding flow when a new user signs up from a persona
   *  tile — we pre-set this stage instead of asking again. */
  stage: "CLASS_9_10" | "CLASS_11_12" | "UG" | "PG" | "WORKING" | "OTHER";
  /** Exam codes (must exist in DB) — rendered as rich cards on the
   *  landing page. Order matters — first is most relevant. Also
   *  pre-fills User.onbPrepCodes during persona-aware onboarding. */
  examCodes: string[];
  /** Insight article slugs — rendered below the exam cards. */
  articleSlugs: string[];
  /** Step-by-step plan for this persona. 3-6 concrete bullets. */
  nextSteps: string[];
}

export const PERSONAS: Persona[] = [
  // ── 1. Class 10 student ────────────────────────────────────────
  {
    slug: "class-10-student",
    label: "I'm in Class 10",
    pageTitle: "Class 10 student — what to focus on right now",
    blurb:
      "Boards, stream selection, early olympiad exposure. The decisions you make this year shape every exam you'll write later.",
    description:
      "Class 10 is the year you'll be told to 'just focus on boards' — and you should, but only as much as you actually need. The bigger decision is what stream you pick for Class 11. Engineering? Medicine? Commerce? Humanities? The stream choice eliminates entire entrance-exam pathways. We make the trade-offs visible.",
    badge: "1",
    stage: "CLASS_9_10",
    examCodes: ["IOQM", "NSTSE", "SOF_NSO", "SOF_IMO"],
    articleSlugs: [
      "why-tier-3-engineering-isnt-end",
      "coaching-industry-actual-cost",
    ],
    nextSteps: [
      "Master your Class 10 NCERT (Math + Science especially) — every entrance exam later builds on these chapters.",
      "Try the IOQM (Math) or NSEP-Junior (Physics) — even attempting builds the muscle for IIT-level prep two years later.",
      "Pick your Class 11 stream BEFORE June — read the trade-off article above before deciding.",
      "Don't start coaching-class JEE/NEET prep in Class 10. Olympiads + strong foundations beat early specialisation.",
    ],
  },

  // ── 2. Class 11-12 PCM (engineering target) ────────────────────
  {
    slug: "engineering-aspirant",
    label: "Engineering aspirant (PCM)",
    pageTitle: "Class 11-12 PCM — engineering entrance pathway",
    blurb:
      "JEE Main + Advanced for IITs/NITs, state CETs for regional engineering colleges, COMEDK and BITSAT as parallel options.",
    description:
      "You're prepping for engineering. The realistic ladder is JEE Main → JoSAA counselling for NITs/IIITs/GFTIs, plus JEE Advanced for IITs. State CETs (KCET, MHT CET, WBJEE, KEAM, AP/TS EAMCET) are not 'backups' — they're legitimate parallel paths. Most aspirants over-index on JEE and under-prep state CETs; the marginal effort to write both is small.",
    badge: "2",
    stage: "CLASS_11_12",
    examCodes: ["JEE_MAIN", "JEE_ADVANCED", "MH_MHTCET", "KA_KCET", "WB_WBJEE"],
    articleSlugs: [
      "jee-main-january-vs-april-strategy",
      "why-tier-3-engineering-isnt-end",
    ],
    nextSteps: [
      "Complete NCERT Class 11 Physics, Chemistry, Math by end of Class 11 — JEE syllabus is 70% NCERT-derived.",
      "Write JEE Main Session 1 (January) and Session 2 (April) — the better score counts.",
      "Pick ONE state CET that matches your domicile + write it. Don't skip — state-quota seats are often easier than All-India.",
      "If your JEE Main is 93+ percentile, prep specifically for JEE Advanced — different paper character, different prep.",
      "Class 12 board marks matter for NIT/IIIT admission (75% / top 20 percentile). Don't ignore boards while chasing JEE.",
    ],
  },

  // ── 3. Class 11-12 PCB (medical target) ────────────────────────
  {
    slug: "medical-aspirant",
    label: "Medical aspirant (PCB)",
    pageTitle: "Class 11-12 PCB — NEET UG and the medical pathway",
    blurb:
      "NEET UG is the single gate to MBBS, BDS, AYUSH, Veterinary and most medical UG seats in India. Pre-PG-medical careers all converge here.",
    description:
      "NEET UG decides ~1.1 lakh MBBS seats and ~30,000 BDS seats from 24+ lakh candidates. The competition is brutal. Strong Biology + average Physics still wins most seats — but most rank movement comes from improving Physics, not refining Bio. State-quota MBBS seats are often more accessible than All-India seats; check your state quota carefully.",
    badge: "3",
    stage: "CLASS_11_12",
    examCodes: ["NEET_UG", "AILET", "NEET_PG"],
    articleSlugs: [
      "neet-mbbs-vs-bds-when-to-choose",
      "mbbs-abroad-vs-indian-honest-comparison",
    ],
    nextSteps: [
      "NCERT Class 11 + 12 Biology cover ~92% of NEET Bio. Master this BEFORE moving to coaching reference books.",
      "Physics is the highest-variance subject — most rank improvement on a fresh attempt comes from Physics, not Bio.",
      "Write 50+ full-length NEET mocks before the real exam. Speed + accuracy under fatigue is the differentiator at 700+.",
      "If you're below AIR 15,000 in your first attempt, the drop-year economics often favour re-attempting (see the MBBS vs BDS article).",
      "MBBS abroad is a legitimate path for some — but FMGE pass rates are 17-24%. Don't choose it as a 'shortcut' without reading the costs article.",
    ],
  },

  // ── 4. Class 12 Commerce / Humanities ──────────────────────────
  {
    slug: "commerce-humanities-after-class-12",
    label: "Commerce / Humanities after Class 12",
    pageTitle: "Class 12 Commerce / Humanities — UG admissions + CA/CS path",
    blurb:
      "CUET UG for DU and central universities, CLAT for law, CA Foundation for chartered accountancy, IPMAT for early-MBA. Multiple parallel paths.",
    description:
      "Commerce and Humanities students after Class 12 have more options than they're usually told. CUET UG opens 45+ central universities (DU, JNU, BHU, Allahabad, etc.). CLAT opens 24 National Law Universities. CA Foundation starts the chartered accountancy path. IPMAT (IIM Indore, Rohtak, Jammu, Bodh Gaya) opens a 5-year integrated MBA without waiting for graduation.",
    badge: "4",
    stage: "CLASS_11_12",
    examCodes: ["CUET_UG", "CLAT", "AILET", "CA_FOUNDATION", "CS_FOUNDATION"],
    articleSlugs: [
      "coaching-industry-actual-cost",
      "education-loan-trap",
    ],
    nextSteps: [
      "Decide your priority — UG admission (CUET), law (CLAT/AILET), or CA — and prep for one as primary, others as backups.",
      "CUET UG: pick 3-4 strong domain subjects + General Test if your target college requires it (e.g., DU SRCC).",
      "If aiming at NLSIU / NALSAR / NUJS via CLAT, write AILET as well — separate exam, NLU Delhi seat parallel.",
      "CA Foundation is cleared by ~20-25% of attempters per cycle. Use ICAI's own study material; private coaching is supplementary.",
      "IPMAT at IIM Indore is open to 17-20 year olds — most candidates don't realise this until too late.",
    ],
  },

  // ── 5. Graduate / final-year — Government jobs ─────────────────
  {
    slug: "government-job-aspirant",
    label: "Government job (SSC / RRB)",
    pageTitle: "Government jobs — SSC, RRB, central recruitments",
    blurb:
      "SSC CGL/CHSL/MTS/GD for central department jobs; RRB NTPC/Group D for railway recruitment. The highest-volume government job pathways in India.",
    description:
      "If you're a graduate (or final-year), SSC CGL is the most impactful government recruitment exam — Inspectors, ASOs, Auditors with Pay Level 7. SSC CHSL is the Class-12-level alternative. RRB NTPC handles railway recruitment. The realistic timeline from notification to joining is 18-24 months, so plan multiple cycles in parallel.",
    badge: "5",
    stage: "UG",
    examCodes: ["SSC_CGL", "SSC_CHSL", "SSC_MTS", "RRB_NTPC", "SSC_GD"],
    articleSlugs: [
      "ssc-cgl-vs-chsl-salary-and-career",
      "up-government-jobs-after-class-12",
    ],
    nextSteps: [
      "Pick your primary target (CGL if graduate; CHSL if 12th-pass) — but write at least one secondary as a fallback.",
      "Quantitative Aptitude + Verbal Reasoning together carry ~40-45 marks of every SSC Tier 1 paper. Master these first.",
      "Current affairs of the 6 months BEFORE the paper carry the bulk of GA marks. Focused last-mile prep here pays off.",
      "RRB NTPC takes longer (~2-3 years per cycle) but offers free railway pass for life + family — a unique perk worth considering.",
      "Apply for every SSC / RRB cycle that opens — don't wait 'until you're ready'. Every attempt is real-exam practice.",
    ],
  },

  // ── 6. Graduate / final-year — Banking ─────────────────────────
  {
    slug: "banking-aspirant",
    label: "Banking (IBPS / SBI)",
    pageTitle: "Banking — IBPS PO / Clerk, SBI PO / Clerk, RBI Grade B",
    blurb:
      "Officer-cadre and clerical-cadre recruitment to 11 PSU banks + SBI + RBI. Stable career, good metro pay, structured progression.",
    description:
      "Banking offers a stable, well-paying government-sector career without the political volatility of state services. SBI PO and IBPS PO are the two main officer-cadre routes; SBI Clerk and IBPS Clerk are clerical-cadre. RBI Grade B is the apex bank role — significantly harder but with the best pay + perks of any banking exam. Most aspirants should write both SBI + IBPS in parallel.",
    badge: "6",
    stage: "UG",
    examCodes: ["IBPS_PO", "SBI_PO", "IBPS_CLERK", "SBI_CLERK", "RBI_GRADE_B"],
    articleSlugs: [
      "sbi-po-vs-ibps-po-salary-prestige-effort",
    ],
    nextSteps: [
      "SBI and IBPS Prelims don't clash on the calendar — write both. Salary differential is modest (~₹8-10k); cracking either is the priority.",
      "Speed is the differentiator at banking Prelims — daily mock-test practice is non-negotiable.",
      "Sectional cutoffs apply (Reasoning + Quant + English) — balanced prep is mandatory; you can't trade off sections.",
      "RBI Grade B Phase 2 is where the real differentiator is (descriptive Economic & Social Issues, Finance & Management). Plan 6+ months for it specifically.",
      "Banking probation is rotational — be ready for transfers across India in the first 5-7 years.",
    ],
  },

  // ── 7. Graduate — Civil Services (UPSC + State PSC) ────────────
  {
    slug: "civil-services-aspirant",
    label: "Civil Services (UPSC / State PSC)",
    pageTitle: "Civil Services — UPSC CSE and the state PCS pathway",
    blurb:
      "UPSC for IAS / IPS / IFS / IRS, state PSCs for SDM / DySP / Deputy Collector posts. The most-respected career path in Indian government.",
    description:
      "UPSC CSE is India's most-celebrated exam — and its hardest (0.1% conversion). State PSCs are not 'consolation prizes' — they offer the same Pay Level 10 entry post (Deputy Collector / DySP) in your home state with 30x higher conversion rates for similarly-prepared candidates. The 'both in parallel' strategy works because the prep overlap is ~70%.",
    badge: "7",
    stage: "UG",
    examCodes: [
      "UPSC_PRELIMS",
      "UP_UPPSC_PCS",
      "BR_BPSC_CCE",
      "MH_MPSC_RAJYASEVA",
      "TN_TNPSC_GROUP1",
    ],
    articleSlugs: [
      "uppsc-pcs-vs-upsc-cse-which-to-target-first",
    ],
    nextSteps: [
      "Start with NCERT Class 6-12 (Polity, History, Geography, Economy, Environment). 80% of Prelims comes from these.",
      "Read The Hindu / Indian Express daily. Note key issues, not every news item. Current affairs is woven INTO static topics, not separate.",
      "Write your state PSC in parallel with UPSC CSE — the schedule doesn't clash, the prep overlap is huge, the conversion math favours you.",
      "Decide your Optional for UPSC Mains in Year 1 itself — switching later loses 4-6 months. Most-attempted optionals: Public Administration, Sociology, Geography, History.",
      "CSAT (Paper 2) is qualifying — but candidates fail UPSC because of CSAT every year. Don't ignore it.",
    ],
  },

  // ── 8. After UG — MBA / GATE / Higher studies ──────────────────
  {
    slug: "after-graduation-pg-options",
    label: "After graduation — PG options",
    pageTitle: "After your Bachelor's — CAT, GATE, NEET PG, and beyond",
    blurb:
      "CAT for IIM MBA, GATE for IIT M.Tech or PSU recruitment, NEET PG for medical specialisation, CSIR-NET for research. Pick the path that matches your UG stream.",
    description:
      "Post-graduation matters most for fields where the UG degree alone isn't enough for the career you want. CAT → IIM MBA → corporate management. GATE → IIT M.Tech (R&D / academia) OR PSU recruitment (Government Engineer). NEET PG → MD/MS specialisation. CSIR-NET → research lecturer + PhD funding. Your UG stream dictates the realistic next step.",
    badge: "8",
    stage: "UG",
    examCodes: ["CAT", "GATE_CSE", "NEET_PG", "UGC_NET", "ISI_BSTAT"],
    articleSlugs: [
      "gate-for-iit-mtech-vs-psu-recruitment",
    ],
    nextSteps: [
      "Identify the SPECIFIC outcome you want — not 'PG', but 'IIT M.Tech for research' OR 'PSU for stability' OR 'IIM for corporate MBA'.",
      "CAT prep: ~6-8 months of mock-test-heavy practice. VARC + DILR + QA each independently weighted.",
      "GATE prep: 9-12 months for tier-1 score (top 1%). Your B.Tech curriculum is ~70% of GATE syllabus — but depth differs.",
      "NEET PG: speciality choice matters more than score for many candidates. A 600+ score with poor counselling strategy ends up regrettable.",
      "If you're undecided, write CAT this cycle (lowest opportunity cost) — the percentile is valid for 1 year and gives optionality.",
    ],
  },
];

export function findPersona(slug: string): Persona | undefined {
  return PERSONAS.find((p) => p.slug === slug);
}
