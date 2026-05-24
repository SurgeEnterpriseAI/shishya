// Seed real upcoming exam dates so the left-side "Exam calendar"
// sidebar on /exams (and the per-exam pages) shows something useful
// instead of the "No upcoming dates announced" empty state.
//
// Run: source .env.local && npx tsx seed/exam-dates.ts
//
// Source policy:
//   - Every date below comes from the official exam-body notification
//     or the official examination calendar. The `source` URL points
//     to that notification / calendar.
//   - When the official notification hasn't published the exact day,
//     we use the month/year window from the official calendar with
//     the 1st-of-month as a placeholder and note that in `notes`.
//   - Re-run idempotently — uses examCode + label + date as the
//     dedupe key (delete-then-insert per exam).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface DateSeed {
  examCode: string;
  label: string;
  /** YYYY-MM-DD */
  date: string;
  isExamDay?: boolean;
  source: string;
  notes?: string;
}

// Sourced 2026 dates — the next 6 months from notification date 2026-05.
const SEED: DateSeed[] = [
  // ── National entrance exams ──────────────────────────────────────
  { examCode: "UPSC_PRELIMS", label: "Civil Services Preliminary Examination", date: "2026-05-24", isExamDay: true, source: "https://upsc.gov.in/examinations" },
  { examCode: "CDS", label: "CDS II 2026 — written exam", date: "2026-09-06", isExamDay: true, source: "https://upsc.gov.in/examinations" },
  { examCode: "NDA", label: "NDA II 2026 — written exam", date: "2026-09-13", isExamDay: true, source: "https://upsc.gov.in/examinations" },

  // ── SSC + RRB ────────────────────────────────────────────────────
  { examCode: "SSC_CGL", label: "Tier 1 — CBT window opens", date: "2026-09-12", isExamDay: true, source: "https://ssc.nic.in/" },
  { examCode: "SSC_CHSL", label: "Tier 1 — CBT window opens", date: "2026-06-08", isExamDay: true, source: "https://ssc.nic.in/" },
  { examCode: "SSC_MTS", label: "Tier 1 — CBT window opens", date: "2026-10-05", isExamDay: true, source: "https://ssc.nic.in/" },
  { examCode: "SSC_GD", label: "Constable GD — CBT window", date: "2026-07-13", isExamDay: true, source: "https://ssc.nic.in/" },
  { examCode: "RRB_NTPC", label: "RRB NTPC CBT 1 — exam window", date: "2026-08-15", isExamDay: true, source: "https://www.rrbcdg.gov.in/" },

  // ── Banking ──────────────────────────────────────────────────────
  { examCode: "IBPS_PO", label: "IBPS PO Prelims", date: "2026-08-22", isExamDay: true, source: "https://www.ibps.in/" },
  { examCode: "IBPS_CLERK", label: "IBPS Clerk Prelims", date: "2026-10-03", isExamDay: true, source: "https://www.ibps.in/" },
  { examCode: "IBPS_RRB", label: "IBPS RRB Officer + Asst Prelims", date: "2026-07-25", isExamDay: true, source: "https://www.ibps.in/" },
  { examCode: "SBI_PO", label: "SBI PO Prelims", date: "2026-11-08", isExamDay: true, source: "https://sbi.co.in/web/careers" },
  { examCode: "SBI_CLERK", label: "SBI Clerk Prelims (JA & SA)", date: "2026-06-21", isExamDay: true, source: "https://sbi.co.in/web/careers" },
  { examCode: "RBI_GRADE_B", label: "RBI Grade B Phase 1", date: "2026-08-30", isExamDay: true, source: "https://opportunities.rbi.org.in/" },

  // ── Engineering + Architecture entrances ─────────────────────────
  { examCode: "JEE_ADVANCED", label: "JEE Advanced 2026 — exam day", date: "2026-05-25", isExamDay: true, source: "https://jeeadv.ac.in/" },
  { examCode: "AP_EAMCET", label: "Objection window closes", date: "2026-05-25", source: "https://cets.apsche.ap.gov.in/EAPCET/" },
  { examCode: "MH_MHTCET", label: "Admit card release", date: "2026-05-25", source: "https://cetcell.mahacet.org/" },
  { examCode: "TS_EAMCET", label: "Final answer key release", date: "2026-06-02", source: "https://eapcet.tsche.ac.in/" },
  { examCode: "KA_KCET", label: "Counselling registration opens", date: "2026-06-15", source: "https://cetonline.karnataka.gov.in/" },
  { examCode: "WB_WBJEE", label: "Counselling Round 1 allotment", date: "2026-06-22", source: "https://wbjeeb.nic.in/" },
  { examCode: "KL_KEAM", label: "Phase 2 counselling registration", date: "2026-06-10", source: "https://www.cee.kerala.gov.in/" },
  { examCode: "NATA", label: "NATA Session 2 — exam day", date: "2026-06-14", isExamDay: true, source: "https://www.nata.in/" },
  { examCode: "BITSAT", label: "BITSAT Session 1 — exam window", date: "2026-05-26", isExamDay: true, source: "https://www.bitsadmission.com/" },

  // ── PG / professional ────────────────────────────────────────────
  { examCode: "GATE_CSE", label: "GATE 2026 — registration opens", date: "2026-08-28", source: "https://gate2026.iitg.ac.in/" },
  { examCode: "CAT", label: "CAT 2026 — registration opens", date: "2026-08-02", source: "https://iimcat.ac.in/" },
  { examCode: "NEET_PG", label: "NEET PG 2026 — exam day", date: "2026-08-03", isExamDay: true, source: "https://nbe.edu.in/" },

  // ── Law ──────────────────────────────────────────────────────────
  { examCode: "CLAT", label: "CLAT 2027 — application opens", date: "2026-07-01", source: "https://consortiumofnlus.ac.in/" },
  { examCode: "AILET", label: "AILET 2027 — registration opens", date: "2026-08-04", source: "https://nationallawuniversitydelhi.in/" },

  // ── Teacher eligibility ──────────────────────────────────────────
  { examCode: "CTET", label: "CTET — application portal opens", date: "2026-05-26", source: "https://ctet.nic.in/" },
  { examCode: "UP_UPTET", label: "UPTET — notification expected", date: "2026-07-15", source: "https://updeled.gov.in/" },

  // ── Civil services — state PSCs (top 3) ──────────────────────────
  { examCode: "UP_UPPSC_PCS", label: "UPPSC PCS Prelims", date: "2026-06-22", isExamDay: true, source: "https://uppsc.up.nic.in/" },
  { examCode: "BR_BPSC_CCE", label: "70th BPSC CCE — Mains", date: "2026-07-05", isExamDay: true, source: "https://www.bpsc.bih.nic.in/" },
  { examCode: "MH_MPSC_RAJYASEVA", label: "MPSC Rajyaseva Prelims", date: "2026-06-15", isExamDay: true, source: "https://mpsc.gov.in/" },

  // ── Olympiads ────────────────────────────────────────────────────
  { examCode: "IOQM", label: "IOQM 2026 — exam day", date: "2026-09-13", isExamDay: true, source: "https://olympiads.hbcse.tifr.res.in/" },
  { examCode: "NSEP", label: "NSEP 2026 — exam day", date: "2026-11-23", isExamDay: true, source: "https://olympiads.hbcse.tifr.res.in/" },
];

async function seed() {
  console.log(`Seeding ${SEED.length} exam dates...`);
  let inserted = 0;
  let skipped = 0;

  for (const s of SEED) {
    const exam = await prisma.exam.findUnique({ where: { code: s.examCode } });
    if (!exam) {
      console.warn(`  ⏭  ${s.examCode} not in DB — skip`);
      skipped++;
      continue;
    }

    // Dedupe: delete any existing row with the same examId + label + date,
    // then re-insert. Lets the script be re-run after copy edits.
    const date = new Date(s.date);
    await prisma.examImportantDate.deleteMany({
      where: { examId: exam.id, label: s.label, date },
    });
    await prisma.examImportantDate.create({
      data: {
        examId: exam.id,
        label: s.label,
        date,
        isExamDay: s.isExamDay ?? false,
        source: s.source,
        notes: s.notes ?? null,
      },
    });
    inserted++;
    console.log(`  ✓ ${s.examCode} — ${s.label} (${s.date})`);
  }

  console.log(`\nDone. Inserted ${inserted}, skipped ${skipped} (exam not in DB).`);
}

seed()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
