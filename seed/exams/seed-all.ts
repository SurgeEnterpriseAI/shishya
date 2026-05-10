// Master orchestrator — seeds metadata for all 21 exams, then their syllabi.
// Idempotent. Safe to re-run.
//
// Usage: npx tsx seed/exams/seed-all.ts

import { PrismaClient } from "@prisma/client";
import { seedExams } from "./index";
import { seedSscCglSyllabus } from "./ssc-cgl-syllabus";
import { seedSscChslSyllabus } from "./ssc-chsl-syllabus";
import { seedSscMtsSyllabus } from "./ssc-mts-syllabus";
import { seedSscGdSyllabus } from "./ssc-gd-syllabus";
import { seedRrbNtpcSyllabus } from "./rrb-ntpc-syllabus";
import { seedRrbGroupDSyllabus } from "./rrb-group-d-syllabus";
import { seedRrbAlpSyllabus } from "./rrb-alp-syllabus";
import { seedNeetUgSyllabus } from "./neet-ug-syllabus";
import { seedJeeMainSyllabus } from "./jee-main-syllabus";
import { seedJeeAdvancedSyllabus } from "./jee-advanced-syllabus";
import { seedUpscPrelimsSyllabus } from "./upsc-prelims-syllabus";
import { seedGateCseSyllabus } from "./gate-cse-syllabus";
import { seedIbpsPoSyllabus } from "./ibps-po-syllabus";
import { seedIbpsClerkSyllabus } from "./ibps-clerk-syllabus";
import { seedSbiPoSyllabus } from "./sbi-po-syllabus";
import { seedSbiClerkSyllabus } from "./sbi-clerk-syllabus";
import { seedCtetSyllabus } from "./ctet-syllabus";
import { seedCdsSyllabus } from "./cds-syllabus";
import { seedNdaSyllabus } from "./nda-syllabus";
import { seedCatSyllabus } from "./cat-syllabus";
import { seedCuetUgSyllabus } from "./cuet-ug-syllabus";

const prisma = new PrismaClient();

async function main() {
  console.log("\n=== Step 1: Exam metadata ===");
  await seedExams();

  console.log("\n=== Step 2: Syllabi ===");
  const syllabi: Array<[string, () => Promise<void>]> = [
    ["SSC_CGL", seedSscCglSyllabus],
    ["SSC_CHSL", seedSscChslSyllabus],
    ["SSC_MTS", seedSscMtsSyllabus],
    ["SSC_GD", seedSscGdSyllabus],
    ["RRB_NTPC", seedRrbNtpcSyllabus],
    ["RRB_GROUP_D", seedRrbGroupDSyllabus],
    ["RRB_ALP", seedRrbAlpSyllabus],
    ["NEET_UG", seedNeetUgSyllabus],
    ["JEE_MAIN", seedJeeMainSyllabus],
    ["JEE_ADVANCED", seedJeeAdvancedSyllabus],
    ["UPSC_PRELIMS", seedUpscPrelimsSyllabus],
    ["GATE_CSE", seedGateCseSyllabus],
    ["IBPS_PO", seedIbpsPoSyllabus],
    ["IBPS_CLERK", seedIbpsClerkSyllabus],
    ["SBI_PO", seedSbiPoSyllabus],
    ["SBI_CLERK", seedSbiClerkSyllabus],
    ["CTET", seedCtetSyllabus],
    ["CDS", seedCdsSyllabus],
    ["NDA", seedNdaSyllabus],
    ["CAT", seedCatSyllabus],
    ["CUET_UG", seedCuetUgSyllabus],
  ];

  for (const [code, fn] of syllabi) {
    try {
      await fn();
    } catch (err: any) {
      console.error(`✗ ${code} syllabus failed: ${err?.message ?? err}`);
    }
  }

  console.log("\n=== Done ===");
  const counts = await prisma.exam.findMany({
    select: {
      code: true,
      _count: { select: { subjects: true } },
    },
    orderBy: { code: "asc" },
  });
  console.log("\nFinal coverage:");
  for (const c of counts) {
    console.log(`  ${c.code.padEnd(15)} ${c._count.subjects} subjects`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
