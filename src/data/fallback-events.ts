// Hard-coded upcoming exam events used as fallback when the
// ExamImportantDate query is unreachable. Same rationale as
// src/data/fallback-exams.ts: when Vercel's iad1 ↔ Neon's
// ap-southeast-1 round-trip times out, the homepage's left rail
// would otherwise show "No upcoming dates announced." even though
// dozens of real dates exist in the DB.
//
// This list covers the next 6 months of major Indian exams,
// sourced from each exam body's official notification (same source
// policy as seed/exam-dates.ts). Refresh annually after the year
// roll-over — the seeded `examImportantDate` table is the live
// source; this file is the bus-stop placeholder.
//
// The dates here are CURRENT YEAR dates — they'll go stale as
// time passes. The fallback path filters to "today or later in
// IST" before rendering, so old dates auto-drop from view without
// a code change.

import type { UpcomingEvent } from "@/components/UpcomingExamsSidebar";

/** YYYY-MM-DD → ISO midnight UTC of that day. */
function iso(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toISOString();
}

interface FallbackRow {
  examCode: string;
  examShort: string;
  date: string; // YYYY-MM-DD
  label: string;
  isExamDay?: boolean;
}

const RAW: FallbackRow[] = [
  { examCode: "UPSC_PRELIMS", examShort: "UPSC Prelims",     date: "2026-05-24", label: "Civil Services Preliminary Examination", isExamDay: true },
  { examCode: "JEE_ADVANCED", examShort: "JEE Advanced",     date: "2026-05-25", label: "JEE Advanced 2026 — exam day",            isExamDay: true },
  { examCode: "AP_EAMCET",    examShort: "AP EAMCET",        date: "2026-05-25", label: "Objection window closes" },
  { examCode: "MH_MHTCET",    examShort: "MHT-CET",          date: "2026-05-25", label: "Admit card release" },
  { examCode: "BITSAT",       examShort: "BITSAT",           date: "2026-05-26", label: "BITSAT Session 1 — exam window opens",    isExamDay: true },
  { examCode: "CTET",         examShort: "CTET",             date: "2026-05-26", label: "Application portal opens" },
  { examCode: "TS_EAMCET",    examShort: "TS EAMCET",        date: "2026-06-02", label: "Final answer key release" },
  { examCode: "KL_KEAM",      examShort: "KEAM",             date: "2026-06-10", label: "Phase 2 counselling registration" },
  { examCode: "NATA",         examShort: "NATA",             date: "2026-06-14", label: "NATA Session 2 — exam day",                isExamDay: true },
  { examCode: "KA_KCET",      examShort: "KCET",             date: "2026-06-15", label: "Counselling registration opens" },
  { examCode: "MH_MPSC_RAJYASEVA", examShort: "MPSC Rajyaseva", date: "2026-06-15", label: "MPSC Rajyaseva Prelims",                isExamDay: true },
  { examCode: "SBI_CLERK",    examShort: "SBI Clerk",        date: "2026-06-21", label: "SBI Clerk Prelims (JA & SA)",              isExamDay: true },
  { examCode: "WB_WBJEE",     examShort: "WBJEE",            date: "2026-06-22", label: "Counselling Round 1 allotment" },
  { examCode: "UP_UPPSC_PCS", examShort: "UPPSC PCS",        date: "2026-06-22", label: "UPPSC PCS Prelims",                        isExamDay: true },
  { examCode: "BR_BPSC_CCE",  examShort: "BPSC CCE",         date: "2026-07-05", label: "70th BPSC CCE — Mains",                    isExamDay: true },
  { examCode: "SSC_GD",       examShort: "SSC GD",           date: "2026-07-13", label: "Constable GD — CBT window",                isExamDay: true },
  { examCode: "UP_UPTET",     examShort: "UPTET",            date: "2026-07-15", label: "UPTET — notification expected" },
  { examCode: "IBPS_RRB",     examShort: "IBPS RRB",         date: "2026-07-25", label: "IBPS RRB Officer + Asst Prelims",          isExamDay: true },
  { examCode: "NEET_PG",      examShort: "NEET PG",          date: "2026-08-03", label: "NEET PG 2026 — exam day",                  isExamDay: true },
  { examCode: "CAT",          examShort: "CAT",              date: "2026-08-02", label: "CAT 2026 — registration opens" },
  { examCode: "AILET",        examShort: "AILET",            date: "2026-08-04", label: "AILET 2027 — registration opens" },
  { examCode: "RRB_NTPC",     examShort: "RRB NTPC",         date: "2026-08-15", label: "RRB NTPC CBT 1 — exam window",             isExamDay: true },
  { examCode: "IBPS_PO",      examShort: "IBPS PO",          date: "2026-08-22", label: "IBPS PO Prelims",                          isExamDay: true },
  { examCode: "GATE_CSE",     examShort: "GATE CSE",         date: "2026-08-28", label: "GATE 2026 — registration opens" },
  { examCode: "RBI_GRADE_B",  examShort: "RBI Grade B",      date: "2026-08-30", label: "RBI Grade B Phase 1",                      isExamDay: true },
  { examCode: "CDS",          examShort: "CDS",              date: "2026-09-06", label: "CDS II 2026 — written exam",               isExamDay: true },
  { examCode: "SSC_CGL",      examShort: "SSC CGL",          date: "2026-09-12", label: "Tier 1 — CBT window opens",                isExamDay: true },
  { examCode: "NDA",          examShort: "NDA",              date: "2026-09-13", label: "NDA II 2026 — written exam",               isExamDay: true },
  { examCode: "IOQM",         examShort: "IOQM",             date: "2026-09-13", label: "IOQM 2026 — exam day",                     isExamDay: true },
  { examCode: "IBPS_CLERK",   examShort: "IBPS Clerk",       date: "2026-10-03", label: "IBPS Clerk Prelims",                       isExamDay: true },
  { examCode: "SSC_MTS",      examShort: "SSC MTS",          date: "2026-10-05", label: "Tier 1 — CBT window opens",                isExamDay: true },
  { examCode: "SBI_PO",       examShort: "SBI PO",           date: "2026-11-08", label: "SBI PO Prelims",                           isExamDay: true },
  { examCode: "NSEP",         examShort: "NSEP",             date: "2026-11-23", label: "NSEP 2026 — exam day",                     isExamDay: true },
  { examCode: "CLAT",         examShort: "CLAT",             date: "2026-07-01", label: "CLAT 2027 — application opens" },
];

/**
 * Returns the fallback events filtered to "within the next ~6 months
 * of now" so we don't show stale dates from previous calendar years.
 * Sorted ascending by date; capped at 30 entries to match the live
 * query's `take: 30`.
 */
export function getFallbackEvents(): UpcomingEvent[] {
  const now = Date.now();
  const horizon = now + 200 * 86_400_000; // 200 days lookahead
  const back   = now - 3.5 * 86_400_000;  // 3.5 days lookback (covers REACTIONS window)

  return RAW
    .filter((r) => {
      const t = new Date(`${r.date}T00:00:00.000Z`).getTime();
      if (t > horizon || t < back) return false;
      // Same rule as the live loader: future events of any kind are
      // kept; past events only if they're exam-day rows (so we can
      // surface a 📊 Reactions chip). Past non-exam-day rows like
      // "Admit card release on May 22" are noise once they're past.
      if (t >= now) return true;
      return !!r.isExamDay;
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 30)
    .map((r, i) => ({
      id: `fallback-${i}-${r.examCode}`,
      examCode: r.examCode,
      examShort: r.examShort,
      date: iso(r.date),
      label: r.label,
      isExamDay: !!r.isExamDay,
      phaseSnippet: null,
    }));
}
