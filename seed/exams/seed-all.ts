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
import { seedIoqmSyllabus } from "./ioqm-syllabus";
import { seedNsepSyllabus } from "./nsep-syllabus";
import { seedNsecSyllabus } from "./nsec-syllabus";
import { seedNsebSyllabus } from "./nseb-syllabus";
import { seedNseaSyllabus } from "./nsea-syllabus";
import { seedNsejsSyllabus } from "./nsejs-syllabus";
import { seedSofNsoSyllabus } from "./sof-nso-syllabus";
import { seedSofImoSyllabus } from "./sof-imo-syllabus";
import { seedSofIeoSyllabus } from "./sof-ieo-syllabus";
import { seedSofIgkoSyllabus } from "./sof-igko-syllabus";
import { seedSofIcoSyllabus } from "./sof-ico-syllabus";
import { seedSofIhoSyllabus } from "./sof-iho-syllabus";
import { seedSzfIomSyllabus } from "./szf-iom-syllabus";
import { seedSzfIosSyllabus } from "./szf-ios-syllabus";
import { seedSzfIoelSyllabus } from "./szf-ioel-syllabus";
import { seedNstseSyllabus } from "./nstse-syllabus";
import { seedZioSyllabus } from "./zio-syllabus";
import { seedPrilSyllabus } from "./pril-syllabus";
import { seedStateExams } from "./state-exams";
// State engineering / medical entrance
import { seedMhtCetSyllabus } from "./mht-cet-syllabus";
import { seedKcetSyllabus } from "./kcet-syllabus";
import { seedKeamSyllabus } from "./keam-syllabus";
import { seedApEamcetSyllabus } from "./ap-eamcet-syllabus";
import { seedTsEamcetSyllabus } from "./ts-eamcet-syllabus";
import { seedWbjeeSyllabus } from "./wbjee-syllabus";
import { seedComedkSyllabus } from "./comedk-syllabus";
import { seedGujcetSyllabus } from "./gujcet-syllabus";
import { seedBceceSyllabus } from "./bcece-syllabus";
import { seedOjeeSyllabus } from "./ojee-syllabus";
// State PSCs
import { seedTnpscGroup1Syllabus } from "./tnpsc-group1-syllabus";
import { seedTnpscGroup2Syllabus } from "./tnpsc-group2-syllabus";
import { seedMpscRajyasevaSyllabus } from "./mpsc-rajyaseva-syllabus";
import { seedKpscKasSyllabus } from "./kpsc-kas-syllabus";
import { seedUppscPcsSyllabus } from "./uppsc-pcs-syllabus";
import { seedUpssscPetSyllabus } from "./upsssc-pet-syllabus";
import { seedBpscCceSyllabus } from "./bpsc-cce-syllabus";
import { seedMppscSseSyllabus } from "./mppsc-sse-syllabus";
// State TETs
import { seedUptetSyllabus } from "./uptet-syllabus";
import { seedReetSyllabus } from "./reet-syllabus";
import { seedMahatetSyllabus } from "./mahatet-syllabus";
import { seedWbTetSyllabus } from "./wb-tet-syllabus";
import { seedKartetSyllabus } from "./kartet-syllabus";

const prisma = new PrismaClient();

async function main() {
  console.log("\n=== Step 1: Exam metadata ===");
  await seedExams();

  console.log("\n=== Step 1b: State-level exam metadata ===");
  await seedStateExams();

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
    // ── Olympiads ────────────────────────────────────────────────────
    ["IOQM", seedIoqmSyllabus],
    ["NSEP", seedNsepSyllabus],
    ["NSEC", seedNsecSyllabus],
    ["NSEB", seedNsebSyllabus],
    ["NSEA", seedNseaSyllabus],
    ["NSEJS", seedNsejsSyllabus],
    ["SOF_NSO", seedSofNsoSyllabus],
    ["SOF_IMO", seedSofImoSyllabus],
    ["SOF_IEO", seedSofIeoSyllabus],
    ["SOF_IGKO", seedSofIgkoSyllabus],
    ["SOF_ICO", seedSofIcoSyllabus],
    ["SOF_IHO", seedSofIhoSyllabus],
    ["SZF_IOM", seedSzfIomSyllabus],
    ["SZF_IOS", seedSzfIosSyllabus],
    ["SZF_IOEL", seedSzfIoelSyllabus],
    ["NSTSE", seedNstseSyllabus],
    ["ZIO", seedZioSyllabus],
    ["PRIL", seedPrilSyllabus],
    // ── State engineering / medical entrance ─────────────────────────
    ["MH_MHTCET", seedMhtCetSyllabus],
    ["KA_KCET", seedKcetSyllabus],
    ["KL_KEAM", seedKeamSyllabus],
    ["AP_EAMCET", seedApEamcetSyllabus],
    ["TS_EAMCET", seedTsEamcetSyllabus],
    ["WB_WBJEE", seedWbjeeSyllabus],
    ["KA_COMEDK", seedComedkSyllabus],
    ["GJ_GUJCET", seedGujcetSyllabus],
    ["BR_BCECE", seedBceceSyllabus],
    ["OD_OJEE", seedOjeeSyllabus],
    // ── State PSCs ───────────────────────────────────────────────────
    ["TN_TNPSC_GROUP1", seedTnpscGroup1Syllabus],
    ["TN_TNPSC_GROUP2", seedTnpscGroup2Syllabus],
    ["MH_MPSC_RAJYASEVA", seedMpscRajyasevaSyllabus],
    ["KA_KPSC_KAS", seedKpscKasSyllabus],
    ["UP_UPPSC_PCS", seedUppscPcsSyllabus],
    ["UP_UPSSSC_PET", seedUpssscPetSyllabus],
    ["BR_BPSC_CCE", seedBpscCceSyllabus],
    ["MP_MPPSC_SSE", seedMppscSseSyllabus],
    // ── State TETs ───────────────────────────────────────────────────
    ["UP_UPTET", seedUptetSyllabus],
    ["RJ_REET", seedReetSyllabus],
    ["MH_MAHATET", seedMahatetSyllabus],
    ["WB_TET", seedWbTetSyllabus],
    ["KA_KARTET", seedKartetSyllabus],
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
