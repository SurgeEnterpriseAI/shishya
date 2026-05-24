// Per-exam scraping source map.
//
// For each exam (by its `code` in the Exam table), this file enumerates
// the public sources where students discuss it. The refresh-phase-
// articles cron pulls from these every 2 hours during the exam's
// phase window (±3 days), feeds the result to Claude, and rewrites
// the phase article.
//
// Three kinds of sources:
//   - `subreddits` — fetched from /r/<sub>/new.json
//   - `redditSearchTerms` — fetched from /search.json?q=<term>
//     (catches discussion outside the canonical subs)
//   - `rssFeeds` — news / education sections on India's major outlets
//
// FALLBACK_SOURCES is used when an exam isn't listed below. It uses
// generic subreddits + search terms with the exam's shortName.
//
// As we grow we'll add more exams here — but the system gracefully
// falls back so we never block an article waiting for a config row.

export interface ExamSources {
  subreddits?: string[];
  redditSearchTerms?: string[];
  rssFeeds?: string[];
}

export const FALLBACK_SOURCES: ExamSources = {
  subreddits: ["IndianAcademia", "developersIndia", "JEENEETards"],
  rssFeeds: [
    "https://indianexpress.com/section/education/feed/",
    "https://www.thehindu.com/education/feeder/default.rss",
  ],
};

// Per-exam source map. Keys are exam.code values.
export const EXAM_SOURCES: Record<string, ExamSources> = {
  // ── Civil services ──────────────────────────────────────────────
  UPSC_PRELIMS: {
    subreddits: ["UPSC", "IndianAcademia"],
    redditSearchTerms: ["UPSC prelims", "UPSC CSE 2026", "UPSC GS paper"],
    rssFeeds: [
      "https://indianexpress.com/section/upsc-current-affairs/feed/",
      "https://www.thehindu.com/education/competitive-exams/feeder/default.rss",
    ],
  },
  UPSC_MAINS: {
    subreddits: ["UPSC"],
    redditSearchTerms: ["UPSC mains", "UPSC GS paper mains", "UPSC essay 2026"],
    rssFeeds: ["https://indianexpress.com/section/upsc-current-affairs/feed/"],
  },

  // ── Engineering ─────────────────────────────────────────────────
  JEE_MAIN: {
    subreddits: ["JEE", "JEENEETards", "Indian_Academia"],
    redditSearchTerms: ["JEE Main 2026", "JEE Mains shift", "JEE answer key"],
    rssFeeds: ["https://indianexpress.com/section/education/feed/"],
  },
  JEE_ADVANCED: {
    subreddits: ["JEE", "JEENEETards"],
    redditSearchTerms: ["JEE Advanced 2026", "JEE Adv paper 1", "JEE Adv paper 2", "JEE Adv cutoff"],
    rssFeeds: ["https://indianexpress.com/section/education/feed/"],
  },
  BITSAT: {
    subreddits: ["JEE", "JEENEETards", "BITSPilani"],
    redditSearchTerms: ["BITSAT 2026", "BITSAT analysis", "BITSAT cutoff"],
  },

  // ── State engineering CETs ──────────────────────────────────────
  MH_MHTCET: {
    redditSearchTerms: ["MHT CET 2026", "MHT-CET analysis", "MHT CET cutoff Maharashtra"],
    rssFeeds: ["https://indianexpress.com/section/cities/mumbai/feed/"],
  },
  AP_EAMCET: {
    redditSearchTerms: ["AP EAMCET 2026", "AP EAPCET analysis"],
  },
  TS_EAMCET: {
    redditSearchTerms: ["TS EAMCET 2026", "Telangana EAMCET"],
  },
  KA_KCET: {
    redditSearchTerms: ["Karnataka CET 2026", "KCET analysis", "KCET cutoff"],
  },
  WB_WBJEE: {
    redditSearchTerms: ["WBJEE 2026", "WBJEE analysis"],
  },
  KL_KEAM: {
    redditSearchTerms: ["KEAM 2026", "Kerala KEAM analysis"],
  },

  // ── Medical ─────────────────────────────────────────────────────
  NEET_UG: {
    subreddits: ["NEET", "JEENEETards", "MedicosIndia"],
    redditSearchTerms: ["NEET UG 2026", "NEET difficulty", "NEET answer key 2026", "NEET cutoff"],
    rssFeeds: ["https://indianexpress.com/section/education/feed/"],
  },
  NEET_PG: {
    subreddits: ["MedicosIndia", "Residency"],
    redditSearchTerms: ["NEET PG 2026", "NEET PG analysis", "NEET PG cutoff"],
  },

  // ── SSC + Railways ──────────────────────────────────────────────
  SSC_CGL: {
    subreddits: ["SSC", "govtjobsIndia"],
    redditSearchTerms: ["SSC CGL 2026", "SSC CGL Tier 1", "SSC CGL answer key", "SSC CGL cutoff"],
  },
  SSC_CHSL: {
    subreddits: ["SSC"],
    redditSearchTerms: ["SSC CHSL 2026", "SSC CHSL analysis"],
  },
  SSC_MTS: {
    subreddits: ["SSC"],
    redditSearchTerms: ["SSC MTS 2026", "SSC MTS analysis"],
  },
  SSC_GD: {
    subreddits: ["SSC"],
    redditSearchTerms: ["SSC GD constable 2026", "SSC GD analysis"],
  },
  RRB_NTPC: {
    subreddits: ["RailwayJobs", "govtjobsIndia", "SSC"],
    redditSearchTerms: ["RRB NTPC 2026", "RRB NTPC CBT", "RRB NTPC answer key"],
  },

  // ── Banking ─────────────────────────────────────────────────────
  IBPS_PO: {
    subreddits: ["IndianBanks", "BankingExams", "SSC"],
    redditSearchTerms: ["IBPS PO 2026", "IBPS PO prelims", "IBPS PO cutoff"],
  },
  IBPS_CLERK: {
    subreddits: ["IndianBanks", "BankingExams"],
    redditSearchTerms: ["IBPS Clerk 2026", "IBPS Clerk prelims", "IBPS Clerk cutoff"],
  },
  IBPS_RRB: {
    subreddits: ["IndianBanks", "BankingExams"],
    redditSearchTerms: ["IBPS RRB 2026", "IBPS RRB officer assistant"],
  },
  SBI_PO: {
    subreddits: ["IndianBanks", "BankingExams"],
    redditSearchTerms: ["SBI PO 2026", "SBI PO prelims", "SBI PO cutoff"],
  },
  SBI_CLERK: {
    subreddits: ["IndianBanks", "BankingExams"],
    redditSearchTerms: ["SBI Clerk 2026", "SBI JA SA prelims"],
  },
  RBI_GRADE_B: {
    subreddits: ["IndianBanks", "BankingExams"],
    redditSearchTerms: ["RBI Grade B 2026", "RBI Grade B Phase 1"],
  },

  // ── MBA / Law ───────────────────────────────────────────────────
  CAT: {
    subreddits: ["cat", "MBA", "IndianAcademia"],
    redditSearchTerms: ["CAT 2026", "CAT exam analysis", "CAT percentile", "CAT cutoff"],
  },
  CLAT: {
    subreddits: ["CLAT", "LawSchoolIndia"],
    redditSearchTerms: ["CLAT 2027", "CLAT analysis", "CLAT cutoff"],
  },
  AILET: {
    subreddits: ["CLAT", "LawSchoolIndia"],
    redditSearchTerms: ["AILET 2027", "NLU Delhi entrance"],
  },

  // ── Teaching ────────────────────────────────────────────────────
  CTET: {
    subreddits: ["IndianTeachers", "govtjobsIndia"],
    redditSearchTerms: ["CTET 2026", "CTET paper 1", "CTET paper 2", "CTET answer key"],
  },

  // ── Defence ─────────────────────────────────────────────────────
  NDA: {
    subreddits: ["NDA", "IndianDefence"],
    redditSearchTerms: ["NDA 2026", "NDA written exam", "NDA cutoff"],
  },
  CDS: {
    subreddits: ["IndianDefence"],
    redditSearchTerms: ["CDS 2026", "CDS exam analysis"],
  },

  // ── Engineering PG ──────────────────────────────────────────────
  GATE_CSE: {
    subreddits: ["GATEtard", "Indian_Academia"],
    redditSearchTerms: ["GATE 2026 CSE", "GATE cutoff", "GATE answer key"],
  },

  // ── Olympiads ───────────────────────────────────────────────────
  IOQM: {
    subreddits: ["IndianOlympiad", "math", "JEE"],
    redditSearchTerms: ["IOQM 2026", "Indian olympiad mathematics 2026"],
  },

  // ── State PSCs ──────────────────────────────────────────────────
  UP_UPPSC_PCS: {
    subreddits: ["UPSC", "IndianAcademia"],
    redditSearchTerms: ["UPPSC PCS 2026", "UPPSC prelims", "UPPSC cutoff"],
  },
  BR_BPSC_CCE: {
    subreddits: ["UPSC", "Bihar"],
    redditSearchTerms: ["BPSC CCE 2026", "BPSC 70th cutoff"],
  },
  MH_MPSC_RAJYASEVA: {
    subreddits: ["UPSC", "mumbai"],
    redditSearchTerms: ["MPSC Rajyaseva 2026", "Maharashtra PSC"],
  },
};

export function getSourcesFor(examCode: string): ExamSources {
  const cfg = EXAM_SOURCES[examCode];
  if (!cfg) return FALLBACK_SOURCES;
  // Merge with fallback so generic feeds are always tried — gives us a
  // chance to surface mainstream-news coverage even on niche exams.
  return {
    subreddits: dedupe([...(cfg.subreddits ?? []), ...(FALLBACK_SOURCES.subreddits ?? [])]),
    redditSearchTerms: cfg.redditSearchTerms ?? [],
    rssFeeds: dedupe([...(cfg.rssFeeds ?? []), ...(FALLBACK_SOURCES.rssFeeds ?? [])]),
  };
}

function dedupe<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}
