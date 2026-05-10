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

// ── State-level syllabi (auto-wired second batch — 96 syllabi drafted in parallel) ──
import { seedAnPoliceSyllabus } from "./an-police-syllabus";
import { seedApIcetSyllabus } from "./ap-icet-syllabus";
import { seedApLawcetSyllabus } from "./ap-lawcet-syllabus";
import { seedApPolicePcSyllabus } from "./ap-police-pc-syllabus";
import { seedApPolycetSyllabus } from "./ap-polycet-syllabus";
import { seedAppscGroup3Syllabus } from "./appsc-group3-syllabus";
import { seedApscCceSyllabus } from "./apsc-cce-syllabus";
import { seedApTetSyllabus } from "./ap-tet-syllabus";
import { seedArunachalPscSyllabus } from "./arunachal-psc-syllabus";
import { seedAssamCeeSyllabus } from "./assam-cee-syllabus";
import { seedAsTetSyllabus } from "./as-tet-syllabus";
import { seedBiharDceceSyllabus } from "./bihar-dcece-syllabus";
import { seedBrPolicePcSyllabus } from "./br-police-pc-syllabus";
import { seedBrPoliceSiSyllabus } from "./br-police-si-syllabus";
import { seedBrTetSyllabus } from "./br-tet-syllabus";
import { seedBsscInterSyllabus } from "./bssc-inter-syllabus";
import { seedCgpscSseSyllabus } from "./cgpsc-sse-syllabus";
import { seedCgTetSyllabus } from "./cg-tet-syllabus";
import { seedChandigarhPcsSyllabus } from "./chandigarh-pcs-syllabus";
import { seedDlPolicePcSyllabus } from "./dl-police-pc-syllabus";
import { seedDnRecruitmentSyllabus } from "./dn-recruitment-syllabus";
import { seedDsssbTgtSyllabus } from "./dsssb-tgt-syllabus";
import { seedGjPolicePcSyllabus } from "./gj-police-pc-syllabus";
import { seedGjTetSyllabus } from "./gj-tet-syllabus";
import { seedGoaPscSyllabus } from "./goa-psc-syllabus";
import { seedGpscClass12Syllabus } from "./gpsc-class12-syllabus";
import { seedGsssbSyllabus } from "./gsssb-syllabus";
import { seedHcsHaryanaSyllabus } from "./hcs-haryana-syllabus";
import { seedHpasSyllabus } from "./hpas-syllabus";
import { seedHpPatSyllabus } from "./hp-pat-syllabus";
import { seedHpsssbSyllabus } from "./hpsssb-syllabus";
import { seedHpTetSyllabus } from "./hp-tet-syllabus";
import { seedHrPolicePcSyllabus } from "./hr-police-pc-syllabus";
import { seedHrTetSyllabus } from "./hr-tet-syllabus";
import { seedHsscCetSyllabus } from "./hssc-cet-syllabus";
import { seedJhTetSyllabus } from "./jh-tet-syllabus";
import { seedJkcetSyllabus } from "./jkcet-syllabus";
import { seedJkpscKasSyllabus } from "./jkpsc-kas-syllabus";
import { seedJkssbSyllabus } from "./jkssb-syllabus";
import { seedJkTetSyllabus } from "./jk-tet-syllabus";
import { seedJpscCceSyllabus } from "./jpsc-cce-syllabus";
import { seedKaPolicePcSyllabus } from "./ka-police-pc-syllabus";
import { seedKeralaLdcSyllabus } from "./kerala-ldc-syllabus";
import { seedKpscGroupCSyllabus } from "./kpsc-group-c-syllabus";
import { seedKtetSyllabus } from "./ktet-syllabus";
import { seedLadakhPscSyllabus } from "./ladakh-psc-syllabus";
import { seedLakshadweepPscSyllabus } from "./lakshadweep-psc-syllabus";
import { seedManipurPscSyllabus } from "./manipur-psc-syllabus";
import { seedMeghalayaPscSyllabus } from "./meghalaya-psc-syllabus";
import { seedMhCetLawSyllabus } from "./mh-cet-law-syllabus";
import { seedMhCetMbaSyllabus } from "./mh-cet-mba-syllabus";
import { seedMhNursingCetSyllabus } from "./mh-nursing-cet-syllabus";
import { seedMhPoliceBhartiSyllabus } from "./mh-police-bharti-syllabus";
import { seedMizoramPscSyllabus } from "./mizoram-psc-syllabus";
import { seedMpesbSyllabus } from "./mpesb-syllabus";
import { seedMpPolicePcSyllabus } from "./mp-police-pc-syllabus";
import { seedMpscGroupCSyllabus } from "./mpsc-group-c-syllabus";
import { seedMpTetSyllabus } from "./mp-tet-syllabus";
import { seedNagalandPscSyllabus } from "./nagaland-psc-syllabus";
import { seedOdPolicePcSyllabus } from "./od-police-pc-syllabus";
import { seedOdTetSyllabus } from "./od-tet-syllabus";
import { seedOpscOasSyllabus } from "./opsc-oas-syllabus";
import { seedPbPolicePcSyllabus } from "./pb-police-pc-syllabus";
import { seedPbTetSyllabus } from "./pb-tet-syllabus";
import { seedPsssbSyllabus } from "./psssb-syllabus";
import { seedPuducherryPscSyllabus } from "./puducherry-psc-syllabus";
import { seedPunjabCetSyllabus } from "./punjab-cet-syllabus";
import { seedPunjabPcsSyllabus } from "./punjab-pcs-syllabus";
import { seedReapSyllabus } from "./reap-syllabus";
import { seedRjPolicePcSyllabus } from "./rj-police-pc-syllabus";
import { seedRpscRasSyllabus } from "./rpsc-ras-syllabus";
import { seedRsmssbSyllabus } from "./rsmssb-syllabus";
import { seedSikkimPscSyllabus } from "./sikkim-psc-syllabus";
import { seedTnPolicePcSyllabus } from "./tn-police-pc-syllabus";
import { seedTnpscGroup4Syllabus } from "./tnpsc-group4-syllabus";
import { seedTnTetSyllabus } from "./tn-tet-syllabus";
import { seedTnTnusrbSiSyllabus } from "./tn-tnusrb-si-syllabus";
import { seedTripuraPscSyllabus } from "./tripura-psc-syllabus";
import { seedTsIcetSyllabus } from "./ts-icet-syllabus";
import { seedTsLawcetSyllabus } from "./ts-lawcet-syllabus";
import { seedTsPolicePcSyllabus } from "./ts-police-pc-syllabus";
import { seedTsPolycetSyllabus } from "./ts-polycet-syllabus";
import { seedTspscGroup3Syllabus } from "./tspsc-group3-syllabus";
import { seedTspscGroup4Syllabus } from "./tspsc-group4-syllabus";
import { seedTsTetSyllabus } from "./ts-tet-syllabus";
import { seedUkJeepSyllabus } from "./uk-jeep-syllabus";
import { seedUkpscPcsSyllabus } from "./ukpsc-pcs-syllabus";
import { seedUkssscSyllabus } from "./uksssc-syllabus";
import { seedUkTetSyllabus } from "./uk-tet-syllabus";
import { seedUpcetSyllabus } from "./upcet-syllabus";
import { seedUpJeecupSyllabus } from "./up-jeecup-syllabus";
import { seedUpPolicePcSyllabus } from "./up-police-pc-syllabus";
import { seedUpPoliceSiSyllabus } from "./up-police-si-syllabus";
import { seedUppscRoAroSyllabus } from "./uppsc-ro-aro-syllabus";
import { seedWbPolicePcSyllabus } from "./wb-police-pc-syllabus";
import { seedWbpscClerkshipSyllabus } from "./wbpsc-clerkship-syllabus";

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
    // ── Auto-wired second batch (96 syllabi: PSCs, Police, TETs, SSCs, Polytechnic, Law, MBA) ──
    ["AN_ANIIPS", seedAnPoliceSyllabus],
    ["AP_ICET", seedApIcetSyllabus],
    ["AP_LAWCET", seedApLawcetSyllabus],
    ["AP_POLICE_PC", seedApPolicePcSyllabus],
    ["AP_POLYCET", seedApPolycetSyllabus],
    ["AP_APPSC_GROUP3", seedAppscGroup3Syllabus],
    ["AS_APSC_CCE", seedApscCceSyllabus],
    ["AP_TET", seedApTetSyllabus],
    ["AR_APPSC_AR", seedArunachalPscSyllabus],
    ["AS_ASSAMCEE", seedAssamCeeSyllabus],
    ["AS_TET", seedAsTetSyllabus],
    ["BR_DCECE", seedBiharDceceSyllabus],
    ["BR_POLICE_PC", seedBrPolicePcSyllabus],
    ["BR_POLICE_SI", seedBrPoliceSiSyllabus],
    ["BR_TET", seedBrTetSyllabus],
    ["BR_BSSC_INTER", seedBsscInterSyllabus],
    ["CG_CGPSC_SSE", seedCgpscSseSyllabus],
    ["CG_TET", seedCgTetSyllabus],
    ["CH_CHANDIGARH_PCS", seedChandigarhPcsSyllabus],
    ["DL_POLICE_PC", seedDlPolicePcSyllabus],
    ["DN_DDPSC", seedDnRecruitmentSyllabus],
    ["DL_DSSSB_TGT", seedDsssbTgtSyllabus],
    ["GJ_POLICE_PC", seedGjPolicePcSyllabus],
    ["GJ_TET", seedGjTetSyllabus],
    ["GA_GPSC", seedGoaPscSyllabus],
    ["GJ_GPSC_CLASS12", seedGpscClass12Syllabus],
    ["GJ_GSSSB", seedGsssbSyllabus],
    ["HR_HCS", seedHcsHaryanaSyllabus],
    ["HP_HPAS", seedHpasSyllabus],
    ["HP_POLYTECHNIC", seedHpPatSyllabus],
    ["HP_HPSSSB", seedHpsssbSyllabus],
    ["HP_TET", seedHpTetSyllabus],
    ["HR_POLICE_PC", seedHrPolicePcSyllabus],
    ["HR_TET", seedHrTetSyllabus],
    ["HR_HSSC_CET", seedHsscCetSyllabus],
    ["JH_TET", seedJhTetSyllabus],
    ["JK_JKCET", seedJkcetSyllabus],
    ["JK_JKPSC_KAS", seedJkpscKasSyllabus],
    ["JK_JKSSB", seedJkssbSyllabus],
    ["JK_KASHMIR_TET", seedJkTetSyllabus],
    ["JH_JPSC_CCE", seedJpscCceSyllabus],
    ["KA_POLICE_PC", seedKaPolicePcSyllabus],
    ["KL_KPSC_LDC", seedKeralaLdcSyllabus],
    ["KA_KPSC_GROUP_C", seedKpscGroupCSyllabus],
    ["KL_KTET", seedKtetSyllabus],
    ["LA_LPSC", seedLadakhPscSyllabus],
    ["LD_LAKSHADWEEP", seedLakshadweepPscSyllabus],
    ["MN_MPSC", seedManipurPscSyllabus],
    ["ML_MPSC", seedMeghalayaPscSyllabus],
    ["MH_MAHCET_LAW", seedMhCetLawSyllabus],
    ["MH_MAHCET_MBA", seedMhCetMbaSyllabus],
    ["MH_NURSING_CET", seedMhNursingCetSyllabus],
    ["MH_POLICE_BHARTI", seedMhPoliceBhartiSyllabus],
    ["MZ_MPSC", seedMizoramPscSyllabus],
    ["MP_MPESB", seedMpesbSyllabus],
    ["MP_POLICE_PC", seedMpPolicePcSyllabus],
    ["MH_MPSC_GROUP_C", seedMpscGroupCSyllabus],
    ["MP_TET", seedMpTetSyllabus],
    ["NL_NPSC", seedNagalandPscSyllabus],
    ["OD_POLICE_PC", seedOdPolicePcSyllabus],
    ["OD_TET", seedOdTetSyllabus],
    ["OD_OPSC_OAS", seedOpscOasSyllabus],
    ["PB_POLICE_PC", seedPbPolicePcSyllabus],
    ["PB_TET", seedPbTetSyllabus],
    ["PB_PSSSB", seedPsssbSyllabus],
    ["PY_PPSC", seedPuducherryPscSyllabus],
    ["PB_PUNJABCET", seedPunjabCetSyllabus],
    ["PB_PCS", seedPunjabPcsSyllabus],
    ["RJ_REAP", seedReapSyllabus],
    ["RJ_POLICE_PC", seedRjPolicePcSyllabus],
    ["RJ_RPSC_RAS", seedRpscRasSyllabus],
    ["RJ_RSMSSB", seedRsmssbSyllabus],
    ["SK_SPSC", seedSikkimPscSyllabus],
    ["TN_POLICE_PC", seedTnPolicePcSyllabus],
    ["TN_TNPSC_GROUP4", seedTnpscGroup4Syllabus],
    ["TN_TET", seedTnTetSyllabus],
    ["TN_TNUSRB_SI", seedTnTnusrbSiSyllabus],
    ["TR_TPSC", seedTripuraPscSyllabus],
    ["TS_ICET", seedTsIcetSyllabus],
    ["TS_LAWCET", seedTsLawcetSyllabus],
    ["TS_POLICE_PC", seedTsPolicePcSyllabus],
    ["TS_POLYCET", seedTsPolycetSyllabus],
    ["TS_TSPSC_GROUP3", seedTspscGroup3Syllabus],
    ["TS_TSPSC_GROUP4", seedTspscGroup4Syllabus],
    ["TS_TET", seedTsTetSyllabus],
    ["UK_POLYTECHNIC", seedUkJeepSyllabus],
    ["UK_UKPSC_PCS", seedUkpscPcsSyllabus],
    ["UK_UKSSSC", seedUkssscSyllabus],
    ["UK_TET", seedUkTetSyllabus],
    ["UP_UPCET", seedUpcetSyllabus],
    ["UP_JEECUP", seedUpJeecupSyllabus],
    ["UP_POLICE_CONSTABLE", seedUpPolicePcSyllabus],
    ["UP_POLICE_SI", seedUpPoliceSiSyllabus],
    ["UP_UPPSC_RO_ARO", seedUppscRoAroSyllabus],
    ["WB_POLICE_PC", seedWbPolicePcSyllabus],
    ["WB_PSC_CLERK", seedWbpscClerkshipSyllabus],
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
