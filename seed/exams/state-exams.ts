// State-level exam metadata seeder.
//
// Covers the most-popular recruitment exam for each Indian state + UT.
// Syllabi for these are filled in iteratively (separate seed files per
// exam) using the same SubjectSeed/TopicSeed pattern. Once a syllabus is
// added, plug its seedXxxSyllabus() into seed/exams/seed-all.ts.
//
// Sources cross-checked at write-time: each State PSC's official site
// (e.g. tnpsc.gov.in, kpsc.kar.nic.in, mpsc.gov.in, upsc.gov.in for some
// UTs, etc.). PSC marketing materials and Adda247/BYJU's Exam Prep used
// for cross-validation.

import { PrismaClient } from "@prisma/client";
import { INDIAN_STATES } from "../../src/lib/states";
export { INDIAN_STATES };

const prisma = new PrismaClient();

// State-level exam catalogue. ~45 entries — the most-attempted / most-
// requested exam for each state's PSC + a few of the bigger states' high-
// volume secondary exams (UPSSSC, MPSC TET, etc.).
//
// Code conventions:
//   <STATE_CODE>_<EXAM_SHORTCODE>  e.g. TN_TNPSC_GROUP2, UP_UPPSC_PCS
// Languages: include the state's primary language(s) wherever the PSC
// publishes the paper; English is always offered. Negative-mark and
// duration values reflect the published Prelims / Tier-1 of each.

export const stateExamsSeed = [
  // ── Tamil Nadu ─────────────────────────────────────────────────────────
  { code: "TN_TNPSC_GROUP1", state: "TN", name: "TNPSC Group I (Combined Civil Services - I, Prelims)", shortName: "TNPSC Group I",
    description: "Tamil Nadu Public Service Commission Group I Prelims — single GS paper, 200 MCQs in 3 hours, for Deputy Collector / DSP / Asst Commissioner posts.",
    durationMin: 180, totalQuestions: 200, totalMarks: 300, marksPerQ: 1.5, negativeMark: 1 / 3,
    languages: ["EN", "TA"] as const, candidatesPerYear: 600_000 },
  { code: "TN_TNPSC_GROUP2", state: "TN", name: "TNPSC Group II/IIA (Combined Civil Services - II, Prelims)", shortName: "TNPSC Group II",
    description: "TNPSC Group II/IIA Prelims — single GS paper, 200 MCQs in 3 hours, for Sub-Registrar, Assistant Inspector etc.",
    durationMin: 180, totalQuestions: 200, totalMarks: 300, marksPerQ: 1.5, negativeMark: 1 / 3,
    languages: ["EN", "TA"] as const, candidatesPerYear: 1_500_000 },
  { code: "TN_TNPSC_GROUP4", state: "TN", name: "TNPSC Group IV", shortName: "TNPSC Group IV",
    description: "TNPSC Group IV — VAO + Junior Assistant + Typist combined exam. 200 MCQs in 3 hours covering GS, Aptitude, and General Tamil.",
    durationMin: 180, totalQuestions: 200, totalMarks: 300, marksPerQ: 1.5, negativeMark: 1 / 3,
    languages: ["EN", "TA"] as const, candidatesPerYear: 2_500_000 },
  // ── Karnataka ──────────────────────────────────────────────────────────
  { code: "KA_KPSC_KAS", state: "KA", name: "Karnataka Administrative Service (KAS) Prelims", shortName: "KPSC KAS",
    description: "KPSC KAS Prelims — two papers (GS Paper 1, CSAT-style Paper 2). 200 MCQs each, 2 hours each.",
    durationMin: 240, totalQuestions: 400, totalMarks: 400, marksPerQ: 1, negativeMark: 0.25,
    languages: ["EN", "KN"] as const, candidatesPerYear: 350_000 },
  // ── Maharashtra ────────────────────────────────────────────────────────
  { code: "MH_MPSC_RAJYASEVA", state: "MH", name: "MPSC Rajyaseva (State Service) Prelims", shortName: "MPSC Rajyaseva",
    description: "Maharashtra PSC State Service Prelims — Paper 1 (GS, 100 Qs) + Paper 2 (CSAT, 80 Qs). 200 marks each, 2 hours each.",
    durationMin: 240, totalQuestions: 180, totalMarks: 400, marksPerQ: 2, negativeMark: 0.5,
    languages: ["EN", "MR"] as const, candidatesPerYear: 700_000 },
  { code: "MH_MAHATET", state: "MH", name: "Maharashtra Teacher Eligibility Test (MAHA TET)", shortName: "MAHA TET",
    description: "Maharashtra TET Paper I (Class 1-5) and Paper II (Class 6-8). 150 MCQs in 2.5 hours.",
    durationMin: 150, totalQuestions: 150, totalMarks: 150, marksPerQ: 1, negativeMark: 0,
    languages: ["EN", "MR"] as const, candidatesPerYear: 800_000 },
  // ── Uttar Pradesh ──────────────────────────────────────────────────────
  { code: "UP_UPPSC_PCS", state: "UP", name: "UPPSC Combined State Service (PCS) Prelims", shortName: "UPPSC PCS",
    description: "UP PSC PCS Prelims — Paper 1 (GS, 150 Qs, 2 hr) + Paper 2 (CSAT, 100 Qs, 2 hr).",
    durationMin: 240, totalQuestions: 250, totalMarks: 400, marksPerQ: 2, negativeMark: 1 / 3,
    languages: ["EN", "HI"] as const, candidatesPerYear: 600_000 },
  { code: "UP_UPSSSC_PET", state: "UP", name: "UPSSSC Preliminary Eligibility Test (PET)", shortName: "UPSSSC PET",
    description: "UPSSSC PET — common Prelim for all Group C posts in UP. 100 MCQs in 2 hours covering GS, history, geography, science, math, Hindi, English, current affairs.",
    durationMin: 120, totalQuestions: 100, totalMarks: 100, marksPerQ: 1, negativeMark: 0.25,
    languages: ["EN", "HI"] as const, candidatesPerYear: 4_000_000 },
  { code: "UP_UPTET", state: "UP", name: "Uttar Pradesh Teacher Eligibility Test (UPTET)", shortName: "UPTET",
    description: "UP TET Paper I (Class 1-5) + Paper II (Class 6-8). 150 MCQs in 2.5 hours.",
    durationMin: 150, totalQuestions: 150, totalMarks: 150, marksPerQ: 1, negativeMark: 0,
    languages: ["EN", "HI"] as const, candidatesPerYear: 1_500_000 },
  // ── Bihar ──────────────────────────────────────────────────────────────
  { code: "BR_BPSC_CCE", state: "BR", name: "BPSC Combined Competitive Exam (CCE) Prelims", shortName: "BPSC CCE",
    description: "Bihar PSC CCE Prelims — single GS paper, 150 MCQs in 2 hours, for Deputy SP / DSP / Block Development Officer posts.",
    durationMin: 120, totalQuestions: 150, totalMarks: 150, marksPerQ: 1, negativeMark: 0.25,
    languages: ["EN", "HI"] as const, candidatesPerYear: 500_000 },
  // ── West Bengal ────────────────────────────────────────────────────────
  { code: "WB_WBCS", state: "WB", name: "West Bengal Civil Service (Exec) Prelims", shortName: "WBCS",
    description: "West Bengal PSC WBCS Prelims — single GS paper, 200 MCQs in 2.5 hours.",
    durationMin: 150, totalQuestions: 200, totalMarks: 200, marksPerQ: 1, negativeMark: 1 / 3,
    languages: ["EN", "BN"] as const, candidatesPerYear: 250_000 },
  // ── Rajasthan ──────────────────────────────────────────────────────────
  { code: "RJ_RPSC_RAS", state: "RJ", name: "Rajasthan Administrative Service (RAS) Prelims", shortName: "RPSC RAS",
    description: "Rajasthan PSC RAS Prelims — single GS paper, 150 MCQs in 3 hours, for State Civil/Police services.",
    durationMin: 180, totalQuestions: 150, totalMarks: 200, marksPerQ: 1.33, negativeMark: 1 / 3,
    languages: ["EN", "HI"] as const, candidatesPerYear: 600_000 },
  // ── Madhya Pradesh ─────────────────────────────────────────────────────
  { code: "MP_MPPSC_SSE", state: "MP", name: "MPPSC State Service Exam (SSE) Prelims", shortName: "MPPSC SSE",
    description: "MP PSC State Service Prelims — Paper 1 (GS, 100 Qs, 200 marks) + Paper 2 (CSAT, 100 Qs, 200 marks). 2 hours each.",
    durationMin: 240, totalQuestions: 200, totalMarks: 400, marksPerQ: 2, negativeMark: 0,
    languages: ["EN", "HI"] as const, candidatesPerYear: 350_000 },
  // ── Andhra Pradesh ─────────────────────────────────────────────────────
  { code: "AP_APPSC_GROUP1", state: "AP", name: "APPSC Group I Services Prelims", shortName: "APPSC Group I",
    description: "Andhra Pradesh PSC Group I Prelims — Paper 1 + Paper 2 (CSAT) screening test for Deputy Collector / DSP posts.",
    durationMin: 240, totalQuestions: 240, totalMarks: 240, marksPerQ: 1, negativeMark: 1 / 3,
    languages: ["EN", "TE"] as const, candidatesPerYear: 200_000 },
  { code: "AP_APPSC_GROUP2", state: "AP", name: "APPSC Group II Services Prelims", shortName: "APPSC Group II",
    description: "APPSC Group II Prelims — single GS paper, 150 MCQs in 2.5 hours for non-gazetted Group II posts.",
    durationMin: 150, totalQuestions: 150, totalMarks: 150, marksPerQ: 1, negativeMark: 1 / 3,
    languages: ["EN", "TE"] as const, candidatesPerYear: 700_000 },
  // ── Telangana ──────────────────────────────────────────────────────────
  { code: "TS_TSPSC_GROUP1", state: "TS", name: "TSPSC Group I Services Prelims", shortName: "TSPSC Group I",
    description: "Telangana PSC Group I Prelims — single GS paper, 150 MCQs in 2.5 hours.",
    durationMin: 150, totalQuestions: 150, totalMarks: 150, marksPerQ: 1, negativeMark: 1 / 3,
    languages: ["EN", "TE"] as const, candidatesPerYear: 300_000 },
  { code: "TS_TSPSC_GROUP2", state: "TS", name: "TSPSC Group II Services", shortName: "TSPSC Group II",
    description: "TSPSC Group II — 4-paper objective exam (GS, History/Polity/Society, Economy & Development, Telangana Movement & State Formation). 150 Qs each.",
    durationMin: 600, totalQuestions: 600, totalMarks: 600, marksPerQ: 1, negativeMark: 0,
    languages: ["EN", "TE"] as const, candidatesPerYear: 800_000 },
  // ── Kerala ─────────────────────────────────────────────────────────────
  { code: "KL_KPSC_LDC", state: "KL", name: "Kerala PSC Lower Division Clerk (LDC)", shortName: "Kerala LDC",
    description: "Kerala Public Service Commission LDC — 100 MCQs in 1.25 hours covering GK, GS, Maths, Mental Ability, Malayalam/English.",
    durationMin: 75, totalQuestions: 100, totalMarks: 100, marksPerQ: 1, negativeMark: 1 / 3,
    languages: ["EN", "ML"] as const, candidatesPerYear: 1_200_000 },
  // ── Gujarat ────────────────────────────────────────────────────────────
  { code: "GJ_GPSC_CLASS12", state: "GJ", name: "GPSC Class 1-2 Prelims", shortName: "GPSC Class 1-2",
    description: "Gujarat PSC State Service Class 1-2 Prelims — 200 MCQs in 3 hours covering GS + GK + Aptitude.",
    durationMin: 180, totalQuestions: 200, totalMarks: 200, marksPerQ: 1, negativeMark: 1 / 3,
    languages: ["EN", "GU"] as const, candidatesPerYear: 250_000 },
  // ── Haryana ────────────────────────────────────────────────────────────
  { code: "HR_HCS", state: "HR", name: "Haryana Civil Services (HCS) Prelims", shortName: "HCS",
    description: "Haryana PSC HCS Prelims — single objective paper, 100 MCQs in 2 hours.",
    durationMin: 120, totalQuestions: 100, totalMarks: 100, marksPerQ: 1, negativeMark: 0.25,
    languages: ["EN", "HI"] as const, candidatesPerYear: 200_000 },
  // ── Himachal Pradesh ───────────────────────────────────────────────────
  { code: "HP_HPAS", state: "HP", name: "HPPSC HP Administrative Service (HPAS) Prelims", shortName: "HPAS",
    description: "Himachal PSC HPAS Prelims — Paper 1 (GS) + Paper 2 (CSAT). 200 MCQs each, 2 hours each.",
    durationMin: 240, totalQuestions: 200, totalMarks: 400, marksPerQ: 2, negativeMark: 0,
    languages: ["EN", "HI"] as const, candidatesPerYear: 80_000 },
  // ── Punjab ─────────────────────────────────────────────────────────────
  { code: "PB_PCS", state: "PB", name: "Punjab Civil Service (PCS) Prelims", shortName: "Punjab PCS",
    description: "Punjab PSC PCS Prelims — Paper 1 (GS) + Paper 2 (CSAT). 100 MCQs each, 2 hours each.",
    durationMin: 240, totalQuestions: 200, totalMarks: 400, marksPerQ: 2, negativeMark: 0.25,
    languages: ["EN", "PA"] as const, candidatesPerYear: 150_000 },
  // ── Odisha ─────────────────────────────────────────────────────────────
  { code: "OD_OPSC_OAS", state: "OD", name: "Odisha PSC Civil Services (OAS) Prelims", shortName: "OPSC OAS",
    description: "Odisha PSC OAS Prelims — Paper 1 (GS) + Paper 2 (CSAT). 100 MCQs each, 2 hours each.",
    durationMin: 240, totalQuestions: 200, totalMarks: 400, marksPerQ: 2, negativeMark: 1 / 3,
    languages: ["EN"] as const, candidatesPerYear: 200_000 },
  // ── Jharkhand ──────────────────────────────────────────────────────────
  { code: "JH_JPSC_CCE", state: "JH", name: "JPSC Combined Civil Service Prelims", shortName: "JPSC CCE",
    description: "Jharkhand PSC CCE Prelims — Paper 1 (GS) + Paper 2 (Jharkhand-specific). 100 Qs each, 2 hours each.",
    durationMin: 240, totalQuestions: 200, totalMarks: 400, marksPerQ: 2, negativeMark: 0,
    languages: ["EN", "HI"] as const, candidatesPerYear: 250_000 },
  // ── Chhattisgarh ───────────────────────────────────────────────────────
  { code: "CG_CGPSC_SSE", state: "CG", name: "CGPSC State Service Exam (SSE) Prelims", shortName: "CGPSC SSE",
    description: "Chhattisgarh PSC SSE Prelims — Paper 1 (GS) + Paper 2 (CSAT). 100 Qs each, 2 hours each.",
    durationMin: 240, totalQuestions: 200, totalMarks: 400, marksPerQ: 2, negativeMark: 1 / 3,
    languages: ["EN", "HI"] as const, candidatesPerYear: 220_000 },
  // ── Uttarakhand ────────────────────────────────────────────────────────
  { code: "UK_UKPSC_PCS", state: "UK", name: "Uttarakhand PSC Prelims", shortName: "UKPSC PCS",
    description: "Uttarakhand PCS Prelims — single objective paper, 150 MCQs in 2 hours.",
    durationMin: 120, totalQuestions: 150, totalMarks: 150, marksPerQ: 1, negativeMark: 1 / 3,
    languages: ["EN", "HI"] as const, candidatesPerYear: 90_000 },
  // ── Assam ──────────────────────────────────────────────────────────────
  { code: "AS_APSC_CCE", state: "AS", name: "APSC Combined Competitive Exam (CCE) Prelims", shortName: "APSC CCE",
    description: "Assam PSC CCE Prelims — single GS paper, 200 MCQs in 2 hours.",
    durationMin: 120, totalQuestions: 200, totalMarks: 200, marksPerQ: 1, negativeMark: 0.25,
    languages: ["EN"] as const, candidatesPerYear: 80_000 },
  // ── Goa ────────────────────────────────────────────────────────────────
  { code: "GA_GPSC", state: "GA", name: "Goa PSC State Service Prelims", shortName: "Goa PSC",
    description: "Goa PSC State Service Prelims — single objective paper covering GS + Goa-specific knowledge.",
    durationMin: 120, totalQuestions: 100, totalMarks: 100, marksPerQ: 1, negativeMark: 0.25,
    languages: ["EN"] as const, candidatesPerYear: 15_000 },
  // ── Manipur ────────────────────────────────────────────────────────────
  { code: "MN_MPSC", state: "MN", name: "Manipur PSC Civil Services Prelims", shortName: "Manipur PSC",
    description: "Manipur PSC Civil Services Prelims — Paper 1 (GS) + Paper 2 (CSAT). 100 Qs each, 2 hours each.",
    durationMin: 240, totalQuestions: 200, totalMarks: 400, marksPerQ: 2, negativeMark: 0.25,
    languages: ["EN"] as const, candidatesPerYear: 25_000 },
  // ── Meghalaya ──────────────────────────────────────────────────────────
  { code: "ML_MPSC", state: "ML", name: "Meghalaya PSC Civil Services Prelims", shortName: "Meghalaya PSC",
    description: "Meghalaya PSC Civil Services Prelims — single GS paper.",
    durationMin: 120, totalQuestions: 100, totalMarks: 100, marksPerQ: 1, negativeMark: 0.25,
    languages: ["EN"] as const, candidatesPerYear: 20_000 },
  // ── Mizoram ────────────────────────────────────────────────────────────
  { code: "MZ_MPSC", state: "MZ", name: "Mizoram PSC Civil Services Prelims", shortName: "Mizoram PSC",
    description: "Mizoram PSC Civil Services Prelims — single GS paper.",
    durationMin: 120, totalQuestions: 100, totalMarks: 100, marksPerQ: 1, negativeMark: 0.25,
    languages: ["EN"] as const, candidatesPerYear: 18_000 },
  // ── Nagaland ───────────────────────────────────────────────────────────
  { code: "NL_NPSC", state: "NL", name: "Nagaland PSC Civil Services Prelims", shortName: "Nagaland PSC",
    description: "Nagaland PSC Civil Services Prelims — single GS paper.",
    durationMin: 120, totalQuestions: 100, totalMarks: 100, marksPerQ: 1, negativeMark: 0.25,
    languages: ["EN"] as const, candidatesPerYear: 20_000 },
  // ── Tripura ────────────────────────────────────────────────────────────
  { code: "TR_TPSC", state: "TR", name: "Tripura PSC Civil Services Prelims", shortName: "Tripura PSC",
    description: "Tripura PSC Civil Services Prelims — single GS paper.",
    durationMin: 120, totalQuestions: 100, totalMarks: 100, marksPerQ: 1, negativeMark: 0.25,
    languages: ["EN", "BN"] as const, candidatesPerYear: 30_000 },
  // ── Sikkim ─────────────────────────────────────────────────────────────
  { code: "SK_SPSC", state: "SK", name: "Sikkim PSC Civil Services Prelims", shortName: "Sikkim PSC",
    description: "Sikkim PSC Civil Services Prelims — single GS paper.",
    durationMin: 120, totalQuestions: 100, totalMarks: 100, marksPerQ: 1, negativeMark: 0.25,
    languages: ["EN"] as const, candidatesPerYear: 12_000 },
  // ── Arunachal Pradesh ──────────────────────────────────────────────────
  { code: "AR_APPSC_AR", state: "AR", name: "Arunachal Pradesh PSC Civil Services Prelims", shortName: "APPSC (AR)",
    description: "Arunachal Pradesh PSC Civil Services Prelims — single GS paper.",
    durationMin: 120, totalQuestions: 200, totalMarks: 200, marksPerQ: 1, negativeMark: 0.25,
    languages: ["EN"] as const, candidatesPerYear: 22_000 },
  // ── Union Territories ─────────────────────────────────────────────────
  { code: "DL_DSSSB_TGT", state: "DL", name: "Delhi DSSSB Trained Graduate Teacher (TGT)", shortName: "DSSSB TGT",
    description: "Delhi Subordinate Services Selection Board TGT — Tier 1 + Tier 2. 200 MCQs in 2 hours covering GA, GI, Reasoning, Math, Hindi/English, Subject knowledge.",
    durationMin: 120, totalQuestions: 200, totalMarks: 200, marksPerQ: 1, negativeMark: 0.25,
    languages: ["EN", "HI"] as const, candidatesPerYear: 600_000 },
  { code: "JK_JKPSC_KAS", state: "JK", name: "J&K PSC Combined Competitive Exam (KAS) Prelims", shortName: "JKPSC KAS",
    description: "J&K PSC KAS Prelims — Paper 1 (GS) + Paper 2 (CSAT). 200 MCQs each, 2 hours each.",
    durationMin: 240, totalQuestions: 200, totalMarks: 400, marksPerQ: 2, negativeMark: 0.25,
    languages: ["EN"] as const, candidatesPerYear: 100_000 },
  { code: "CH_CHANDIGARH_PCS", state: "CH", name: "Chandigarh UT Civil Services Prelims", shortName: "Chandigarh PCS",
    description: "Chandigarh UT Public Service Commission Prelims — single GS paper.",
    durationMin: 120, totalQuestions: 100, totalMarks: 100, marksPerQ: 1, negativeMark: 0.25,
    languages: ["EN"] as const, candidatesPerYear: 15_000 },
  { code: "PY_PPSC", state: "PY", name: "Puducherry PSC Civil Services Prelims", shortName: "Puducherry PSC",
    description: "Puducherry PSC Civil Services Prelims — single GS paper.",
    durationMin: 120, totalQuestions: 100, totalMarks: 100, marksPerQ: 1, negativeMark: 0.25,
    languages: ["EN", "TA"] as const, candidatesPerYear: 18_000 },
  { code: "LA_LPSC", state: "LA", name: "Ladakh UT Civil Services Prelims", shortName: "Ladakh PSC",
    description: "Ladakh UT Public Service Commission Prelims — single GS paper.",
    durationMin: 120, totalQuestions: 100, totalMarks: 100, marksPerQ: 1, negativeMark: 0.25,
    languages: ["EN"] as const, candidatesPerYear: 8_000 },
  { code: "AN_ANIIPS", state: "AN", name: "Andaman & Nicobar Islands Police Constable", shortName: "AN Police",
    description: "Andaman & Nicobar Police Constable recruitment exam — General Awareness, Reasoning, Math, English/Hindi.",
    durationMin: 120, totalQuestions: 100, totalMarks: 100, marksPerQ: 1, negativeMark: 0.25,
    languages: ["EN", "HI"] as const, candidatesPerYear: 20_000 },
  { code: "DN_DDPSC", state: "DN", name: "Dadra & Nagar Haveli + Daman & Diu UT Recruitment", shortName: "DD&DNH Recruitment",
    description: "DD & DNH UT recruitment screening — General Awareness, Reasoning, Math, English.",
    durationMin: 120, totalQuestions: 100, totalMarks: 100, marksPerQ: 1, negativeMark: 0.25,
    languages: ["EN"] as const, candidatesPerYear: 12_000 },
  { code: "LD_LAKSHADWEEP", state: "LD", name: "Lakshadweep UT Civil Services Prelims", shortName: "Lakshadweep PSC",
    description: "Lakshadweep UT Civil Services Prelims — single GS paper.",
    durationMin: 120, totalQuestions: 100, totalMarks: 100, marksPerQ: 1, negativeMark: 0.25,
    languages: ["EN"] as const, candidatesPerYear: 5_000 },
];

export async function seedStateExams() {
  console.log(`Seeding ${stateExamsSeed.length} state-level exams...`);
  for (const e of stateExamsSeed) {
    const data = {
      name: e.name,
      shortName: e.shortName,
      category: "STATE_LEVEL" as const,
      description: e.description,
      durationMin: e.durationMin,
      totalQuestions: e.totalQuestions,
      totalMarks: e.totalMarks,
      marksPerQ: e.marksPerQ,
      negativeMark: e.negativeMark,
      languages: [...e.languages],
      candidatesPerYear: e.candidatesPerYear,
      state: e.state,
    };
    await prisma.exam.upsert({
      where: { code: e.code },
      update: data,
      create: { code: e.code, ...data },
    });
    console.log(`  ✓ ${e.code.padEnd(20)} ${e.shortName} [${e.state}]`);
  }
  console.log(`Done. Seeded ${stateExamsSeed.length} state exams across ${INDIAN_STATES.length} states/UTs.`);
}

if (require.main === module) {
  seedStateExams()
    .catch((err) => { console.error(err); process.exit(1); })
    .finally(() => prisma.$disconnect());
}
