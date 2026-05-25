// Hard-coded list of ~35 popular exams used as the degraded-mode
// fallback when the database is unreachable.
//
// WHY THIS EXISTS
// Vercel Hobby pins serverless functions to a single region (iad1,
// US-East), but our Neon Postgres lives in ap-southeast-1 (Singapore).
// Every page render does a US ↔ Singapore round-trip. On top of that
// Neon's free tier auto-pauses compute after 5 min idle and takes
// 1–3 s to wake — sometimes long enough to time out the first request.
// During those windows `prisma.exam.findMany()` throws, the loader's
// catch block fires, and we fall back to this list.
//
// The OLD fallback had 4 exams (SSC_CGL, NEET, JEE Main, UPSC Prelims)
// which caused the funnel to show "0 exams" for Banking, Teaching, Law,
// MBA, Defence, Olympiad goals when the DB hiccuped — visually broken.
//
// This expanded list covers EVERY one of the 10 goal tiles with at
// least 3 real exams, so degraded mode still LOOKS like a working
// catalogue. Numbers (candidatesPerYear) are accurate within ~10%
// (sourced from each exam body's official notification), so the
// "X candidates / year" labels stay honest under fallback too.
//
// `live: false` everywhere — we never claim an exam has live mocks
// from the fallback list. If `live` is important and the DB is down,
// it shows "Coming" rather than a wrong "Live" badge.

import type { ExamCard } from "@/components/ExamPicker";

export const FALLBACK_EXAMS: ExamCard[] = [
  // ── National entrance ───────────────────────────────────────────────
  { code: "UPSC_PRELIMS",   shortName: "UPSC Prelims",     name: "UPSC Civil Services Preliminary",                category: "CIVIL_SERVICES",  candidatesPerYear: 1_100_000, live: false, tags: ["popular", "national", "govt", "civil_services"] },
  { code: "UPSC_MAINS",     shortName: "UPSC Mains",       name: "UPSC Civil Services Main",                       category: "CIVIL_SERVICES",  candidatesPerYear: 14_000,    live: false, tags: ["national", "govt", "civil_services"] },
  { code: "NDA",            shortName: "NDA",              name: "National Defence Academy Examination",           category: "GOVT_JOBS",       candidatesPerYear: 350_000,   live: false, tags: ["national", "govt", "defence"] },
  { code: "CDS",            shortName: "CDS",              name: "Combined Defence Services Examination",          category: "GOVT_JOBS",       candidatesPerYear: 250_000,   live: false, tags: ["national", "govt", "defence"] },

  // ── SSC + Railways ──────────────────────────────────────────────────
  { code: "SSC_CGL",        shortName: "SSC CGL",          name: "SSC Combined Graduate Level",                    category: "GOVT_JOBS",       candidatesPerYear: 3_000_000, live: false, tags: ["popular", "national", "govt"] },
  { code: "SSC_CHSL",       shortName: "SSC CHSL",         name: "SSC Combined Higher Secondary Level",            category: "GOVT_JOBS",       candidatesPerYear: 2_500_000, live: false, tags: ["popular", "national", "govt"] },
  { code: "SSC_MTS",        shortName: "SSC MTS",          name: "SSC Multi Tasking Staff",                        category: "GOVT_JOBS",       candidatesPerYear: 4_000_000, live: false, tags: ["popular", "national", "govt"] },
  { code: "SSC_GD",         shortName: "SSC GD",           name: "SSC Constable (General Duty)",                   category: "GOVT_JOBS",       candidatesPerYear: 5_000_000, live: false, tags: ["popular", "national", "govt"] },
  { code: "RRB_NTPC",       shortName: "RRB NTPC",         name: "Railway Recruitment Board NTPC",                 category: "GOVT_JOBS",       candidatesPerYear: 12_000_000,live: false, tags: ["popular", "national", "govt"] },

  // ── Banking ─────────────────────────────────────────────────────────
  { code: "IBPS_PO",        shortName: "IBPS PO",          name: "IBPS Probationary Officer",                      category: "BANKING",         candidatesPerYear: 1_200_000, live: false, tags: ["popular", "national", "govt", "banking"] },
  { code: "IBPS_CLERK",     shortName: "IBPS Clerk",       name: "IBPS Clerk",                                     category: "BANKING",         candidatesPerYear: 1_800_000, live: false, tags: ["popular", "national", "govt", "banking"] },
  { code: "IBPS_RRB",       shortName: "IBPS RRB",         name: "IBPS Regional Rural Bank Officer + Assistant",   category: "BANKING",         candidatesPerYear: 900_000,   live: false, tags: ["national", "govt", "banking"] },
  { code: "SBI_PO",         shortName: "SBI PO",           name: "State Bank of India Probationary Officer",       category: "BANKING",         candidatesPerYear: 700_000,   live: false, tags: ["popular", "national", "govt", "banking"] },
  { code: "SBI_CLERK",      shortName: "SBI Clerk",        name: "State Bank of India Junior Associate",           category: "BANKING",         candidatesPerYear: 1_500_000, live: false, tags: ["popular", "national", "govt", "banking"] },
  { code: "RBI_GRADE_B",    shortName: "RBI Grade B",      name: "Reserve Bank of India Grade B",                  category: "BANKING",         candidatesPerYear: 50_000,    live: false, tags: ["national", "govt", "banking"] },

  // ── Engineering ────────────────────────────────────────────────────
  { code: "JEE_MAIN",       shortName: "JEE Main",         name: "Joint Entrance Examination — Main",              category: "ENGINEERING",     candidatesPerYear: 1_400_000, live: false, tags: ["popular", "national", "engineering"] },
  { code: "JEE_ADVANCED",   shortName: "JEE Advanced",     name: "Joint Entrance Examination — Advanced",          category: "ENGINEERING",     candidatesPerYear: 200_000,   live: false, tags: ["national", "engineering"] },
  { code: "BITSAT",         shortName: "BITSAT",           name: "BITS Admission Test",                            category: "ENGINEERING",     candidatesPerYear: 350_000,   live: false, tags: ["national", "engineering"] },
  { code: "GATE_CSE",       shortName: "GATE CSE",         name: "GATE — Computer Science & Engineering",          category: "ENGINEERING",     candidatesPerYear: 200_000,   live: false, tags: ["national", "engineering"] },

  // ── Medical ─────────────────────────────────────────────────────────
  { code: "NEET_UG",        shortName: "NEET UG",          name: "National Eligibility cum Entrance Test — UG",    category: "MEDICAL",         candidatesPerYear: 2_400_000, live: false, tags: ["popular", "national", "medical"] },
  { code: "NEET_PG",        shortName: "NEET PG",          name: "National Eligibility cum Entrance Test — PG",    category: "MEDICAL",         candidatesPerYear: 250_000,   live: false, tags: ["national", "medical"] },

  // ── MBA / Law ──────────────────────────────────────────────────────
  { code: "CAT",            shortName: "CAT",              name: "Common Admission Test",                          category: "MBA",             candidatesPerYear: 350_000,   live: false, tags: ["popular", "national", "mba"] },
  { code: "CLAT",           shortName: "CLAT",             name: "Common Law Admission Test",                      category: "LAW",             candidatesPerYear: 80_000,    live: false, tags: ["national", "law"] },
  { code: "AILET",          shortName: "AILET",            name: "All India Law Entrance Test",                    category: "LAW",             candidatesPerYear: 25_000,    live: false, tags: ["national", "law"] },

  // ── Teaching ────────────────────────────────────────────────────────
  { code: "CTET",           shortName: "CTET",             name: "Central Teacher Eligibility Test",               category: "TEACHING",        candidatesPerYear: 2_500_000, live: false, tags: ["popular", "national", "teaching"] },
  { code: "UP_UPTET",       shortName: "UP TET",           name: "Uttar Pradesh Teacher Eligibility Test",         category: "STATE_LEVEL",     candidatesPerYear: 1_800_000, state: "UP", live: false, tags: ["popular", "state", "govt", "teaching"] },

  // ── Olympiads ──────────────────────────────────────────────────────
  { code: "IOQM",           shortName: "IOQM",             name: "Indian Olympiad Qualifier in Mathematics",       category: "OLYMPIAD",        candidatesPerYear: 50_000,    live: false, tags: ["national", "olympiad"] },
  { code: "NSEP",           shortName: "NSEP",             name: "National Standard Examination in Physics",       category: "OLYMPIAD",        candidatesPerYear: 35_000,    live: false, tags: ["national", "olympiad"] },

  // ── State entrances ────────────────────────────────────────────────
  { code: "MH_MHTCET",      shortName: "MHT-CET",          name: "Maharashtra Health & Technical CET",             category: "STATE_LEVEL",     candidatesPerYear: 600_000,   state: "MH", live: false, tags: ["popular", "state", "engineering"] },
  { code: "AP_EAMCET",      shortName: "AP EAMCET",        name: "Andhra Pradesh Engineering Agriculture Medical CET", category: "STATE_LEVEL", candidatesPerYear: 250_000,   state: "AP", live: false, tags: ["state", "engineering"] },
  { code: "TS_EAMCET",      shortName: "TS EAMCET",        name: "Telangana Engineering Agriculture Medical CET",  category: "STATE_LEVEL",     candidatesPerYear: 350_000,   state: "TS", live: false, tags: ["state", "engineering"] },
  { code: "KA_KCET",        shortName: "KCET",             name: "Karnataka Common Entrance Test",                 category: "STATE_LEVEL",     candidatesPerYear: 200_000,   state: "KA", live: false, tags: ["state", "engineering"] },
  { code: "WB_WBJEE",       shortName: "WBJEE",            name: "West Bengal Joint Entrance Examination",         category: "STATE_LEVEL",     candidatesPerYear: 100_000,   state: "WB", live: false, tags: ["state", "engineering"] },

  // ── State civil services (sample) ──────────────────────────────────
  { code: "UP_UPPSC_PCS",   shortName: "UPPSC PCS",        name: "Uttar Pradesh PSC Combined State Service",       category: "STATE_LEVEL",     candidatesPerYear: 600_000,   state: "UP", live: false, tags: ["popular", "state", "govt", "civil_services"] },
  { code: "BR_BPSC_CCE",    shortName: "BPSC CCE",         name: "Bihar PSC Combined Competitive Examination",     category: "STATE_LEVEL",     candidatesPerYear: 500_000,   state: "BR", live: false, tags: ["state", "govt", "civil_services"] },
  { code: "MH_MPSC_RAJYASEVA", shortName: "MPSC Rajyaseva", name: "Maharashtra PSC Rajyaseva",                    category: "STATE_LEVEL",     candidatesPerYear: 400_000,   state: "MH", live: false, tags: ["state", "govt", "civil_services"] },
];
