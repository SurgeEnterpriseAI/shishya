// scripts/apply-official-pattern-corrections.ts
//
// Founder-approved (29 Sep 2026, "yes"): correct 17 Exam rows whose stored pattern
// disagrees with the conducting body's own notice. Each figure was read twice from
// the official document (the second reader downloaded it again and confirmed it);
// sources are in src/data/official-readings.ts and src/lib/pattern-verified.ts.
//
// Mock scoring (src/lib/scoring.ts) reads Exam.marksPerQ and Exam.negativeMark, so
// this changes how FUTURE mock submissions are scored. Submitted attempts keep the
// score stored at submission (Attempt.scoreRaw / scoreMax / scorePct).
//
// Where a notice prints no rule for a wrong answer, the stored cut becomes 0
// (founder chose this over keeping an unsourced cut).
//
// USAGE
//   npx tsx --env-file=.env.local scripts/apply-official-pattern-corrections.ts             # dry run: shows every change
//   npx tsx --env-file=.env.local scripts/apply-official-pattern-corrections.ts --apply     # writes, after saving a backup
//   npx tsx --env-file=.env.local scripts/apply-official-pattern-corrections.ts --restore <backup.json>

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BACKUP_DIR = "D:/CodexProjects/shishya-data/exam-row-backups";

type Fields = { totalQuestions?: number; totalMarks?: number; durationMin?: number; marksPerQ?: number; negativeMark?: number };

/** Target values and the line each comes from. */
export const CORRECTIONS: Record<string, { set: Fields; source: string }> = {
  BR_BPSC_CCE: { set: { negativeMark: 1 / 3 }, source: "BPSC 72nd CCE advertisement, p.6 para I(iii): 1/3 per wrong answer" },
  UK_UKPSC_PCS: { set: { negativeMark: 0.25 }, source: "UKPSC advertisement 9 Sep 2026: one-fourth of the question's marks (1-mark GS paper)" },
  MH_MPSC_GROUP_C: { set: { negativeMark: 0.25 }, source: "MPSC revised scheme 20 May 2026, para 6.1.1: 25% or 1/4 per wrong answer" },
  MP_MPESB: { set: { negativeMark: 0.25 }, source: "MPESB Group-3 2026 rule book, rule 3.8(i): 0.25 per wrong answer, 1 mark per right answer" },
  TS_POLICE_SI: { set: { negativeMark: 0.2 }, source: "TSLPRB SI notification 2026, para 16(A) Note 3: 20% of full marks per wrong answer (200 Q / 200 marks)" },
  ML_MPSC: { set: { totalMarks: 200, marksPerQ: 2, negativeMark: 0 }, source: "Meghalaya notification PER.6/97/225 (11 Aug 2025): Paper I 200 marks, 2 marks each, no negative marking" },
  MZ_MPSC: { set: { totalMarks: 200, marksPerQ: 2, negativeMark: 2 / 3 }, source: "Mizoram CCE Rules 2025, Schedule-I: Paper-I 100 questions, 200 marks; one-third of the question's marks (2) cut per wrong answer" },
  GJ_GSSSB: { set: { totalQuestions: 150, totalMarks: 150, durationMin: 120, marksPerQ: 1 }, source: "GSSSB Advt 378/202526, para 21: Stage 1 prelim 150 Q, 150 marks, 120 min, 1 mark each" },
  TN_TNUSRB_SI: { set: { totalQuestions: 140, totalMarks: 70, durationMin: 150, marksPerQ: 0.5 }, source: "TNUSRB Notification 01/2025, para 16(A): Main written exam 140 Q, 70 marks, 2.5 h, 1/2 mark each" },
  NSTSE: { set: { totalQuestions: 60, totalMarks: 60, durationMin: 60, marksPerQ: 1 }, source: "Unified Council NSTSE: Classes 6-10 paper 60 Q, 60 marks, 60 min" },
  RJ_RSMSSB: { set: { durationMin: 180 }, source: "RSSB CET (Graduation) advertisement 1 Jul 2026: 3 hours" },
  RJ_REAP: { set: { totalQuestions: 75 }, source: "NTA JEE (Main) 2026 bulletin, Paper 1: 75 questions, 300 marks" },
  TS_TSPSC_GROUP3: { set: { durationMin: 150, negativeMark: 0 }, source: "TSPSC Group-III notification (30 Dec 2022): Paper-I 150 min; no wrong-answer rule printed" },
  TS_TSPSC_GROUP1: { set: { negativeMark: 0 }, source: "TSPSC Notification 02/2024: no wrong-answer rule printed" },
  UP_POLICE_SI: { set: { negativeMark: 0 }, source: "UPPRPB SI written-exam notice 14 Jan 2026: no wrong-answer rule printed" },
  UP_POLICE_CONSTABLE: { set: { negativeMark: 0 }, source: "UPPRPB constable written-exam notice 5 Feb 2026: no wrong-answer rule printed" },
  // IOQM: 10 questions × 2 + 10 × 3 + 10 × 5 = 100 marks. One stored mark per question cannot say that; 100/30
  // keeps a full paper's maximum at the real 100 until questions carry their own marks.
  IOQM: { set: { marksPerQ: 100 / 30 }, source: "HBCSE Mathematical Olympiads 2026-27 brochure: 30 questions, 100 marks (2/3/5 marks)" },
};

const FIELDS = ["totalQuestions", "totalMarks", "durationMin", "marksPerQ", "negativeMark"] as const;
const same = (a: number, b: number) => Math.abs(Number(a) - Number(b)) < 1e-6;

async function main() {
  const restore = process.argv.indexOf("--restore");
  if (restore >= 0) {
    const rows: any[] = JSON.parse(fs.readFileSync(process.argv[restore + 1], "utf8"));
    for (const r of rows) {
      const { code, ...fields } = r;
      await prisma.exam.update({ where: { code }, data: fields });
      console.log("restored", code, JSON.stringify(fields));
    }
    return;
  }
  const apply = process.argv.includes("--apply");
  const rows = await prisma.exam.findMany({
    where: { code: { in: Object.keys(CORRECTIONS) } },
    select: { code: true, totalQuestions: true, totalMarks: true, durationMin: true, marksPerQ: true, negativeMark: true },
  });
  const missing = Object.keys(CORRECTIONS).filter((c) => !rows.some((r) => r.code === c));
  if (missing.length) throw new Error(`exam rows not found: ${missing.join(", ")}`);

  const plan: { code: string; data: Fields; before: Record<string, number> }[] = [];
  for (const r of rows) {
    const want = CORRECTIONS[r.code].set;
    const data: Fields = {};
    const before: Record<string, number> = {};
    for (const f of FIELDS) {
      if (want[f] === undefined) continue;
      if (!same((r as any)[f], want[f]!)) {
        (data as any)[f] = want[f];
        before[f] = Number((r as any)[f]);
      }
    }
    if (Object.keys(data).length) plan.push({ code: r.code, data, before });
    console.log(r.code.padEnd(20), Object.keys(data).length ? FIELDS.filter((f) => f in data).map((f) => `${f} ${before[f]} → ${Math.round((data as any)[f] * 10000) / 10000}`).join(" | ") : "already correct");
  }
  if (!apply) { console.log(`\ndry run: ${plan.length} rows would change. Re-run with --apply.`); return; }

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const backup = path.join(BACKUP_DIR, `exam-rows-before-official-corrections-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(backup, JSON.stringify(rows.map((r) => ({ ...r, marksPerQ: Number(r.marksPerQ), negativeMark: Number(r.negativeMark) })), null, 1));
  console.log("\nbackup written:", backup);
  await prisma.$transaction(plan.map((p) => prisma.exam.update({ where: { code: p.code }, data: p.data })));
  console.log(`applied ${plan.length} rows in one transaction`);
}

main().finally(() => prisma.$disconnect());
