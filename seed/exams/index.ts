// Top 10 Indian entrance exams — metadata seed.
// Run: npx tsx seed/exams/index.ts
//
// This seeds the Exam table only. Subjects/topics come from per-exam
// syllabus files (e.g. ssc-cgl-syllabus.ts). Questions come from per-exam
// question seed files. We do this in three layers so each can be iterated
// independently as content matures.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const examsSeed = [
  {
    code: "SSC_CGL",
    name: "SSC Combined Graduate Level (Tier 1)",
    shortName: "SSC CGL",
    category: "GOVT_JOBS" as const,
    description:
      "Staff Selection Commission Combined Graduate Level Exam — Tier 1 is a 60-minute objective test with 100 questions across Reasoning, GK, Quant, and English.",
    durationMin: 60,
    totalQuestions: 100,
    totalMarks: 200,
    marksPerQ: 2,
    negativeMark: 0.5,
    languages: ["EN", "HI"] as const,
    candidatesPerYear: 3_000_000,
  },
  {
    code: "RRB_NTPC",
    name: "Railway Recruitment Board NTPC",
    shortName: "RRB NTPC",
    category: "GOVT_JOBS" as const,
    description:
      "RRB Non-Technical Popular Categories. Tier 1 (CBT) has 100 questions in 90 minutes covering Math, Reasoning, and General Awareness.",
    durationMin: 90,
    totalQuestions: 100,
    totalMarks: 100,
    marksPerQ: 1,
    negativeMark: 1 / 3,
    languages: ["EN", "HI", "TE", "TA", "KN", "ML", "MR", "BN", "GU", "PA"] as const,
    candidatesPerYear: 12_500_000,
  },
  {
    code: "IBPS_PO",
    name: "IBPS Probationary Officer (Prelims)",
    shortName: "IBPS PO",
    category: "BANKING" as const,
    description:
      "Institute of Banking Personnel Selection PO Prelims — 100 questions in 60 minutes on Reasoning, Quant, and English.",
    durationMin: 60,
    totalQuestions: 100,
    totalMarks: 100,
    marksPerQ: 1,
    negativeMark: 0.25,
    languages: ["EN", "HI"] as const,
    candidatesPerYear: 1_500_000,
  },
  {
    code: "NEET_UG",
    name: "National Eligibility cum Entrance Test (UG)",
    shortName: "NEET UG",
    category: "MEDICAL" as const,
    description:
      "Single national medical entrance test. 200 questions (180 to attempt) in 200 minutes covering Physics, Chemistry, and Biology.",
    durationMin: 200,
    totalQuestions: 200,
    totalMarks: 720,
    marksPerQ: 4,
    negativeMark: 1,
    languages: ["EN", "HI", "TE", "TA", "KN", "ML", "MR", "BN", "GU", "PA"] as const,
    candidatesPerYear: 2_400_000,
  },
  {
    code: "JEE_MAIN",
    name: "Joint Entrance Examination — Main",
    shortName: "JEE Main",
    category: "ENGINEERING" as const,
    description:
      "Engineering entrance test. 90 questions (75 to attempt) in 180 minutes across Physics, Chemistry, and Mathematics.",
    durationMin: 180,
    totalQuestions: 75,
    totalMarks: 300,
    marksPerQ: 4,
    negativeMark: 1,
    languages: ["EN", "HI", "TE", "TA", "KN", "ML", "MR", "BN", "GU", "PA"] as const,
    candidatesPerYear: 1_400_000,
  },
  {
    code: "UPSC_PRELIMS",
    name: "UPSC Civil Services Examination — Prelims",
    shortName: "UPSC Prelims",
    category: "CIVIL_SERVICES" as const,
    description:
      "UPSC CSE Prelims. Two papers: GS Paper 1 (100 Qs, 200 marks, 2 hours) and CSAT (80 Qs, 200 marks, qualifying).",
    durationMin: 120,
    totalQuestions: 100,
    totalMarks: 200,
    marksPerQ: 2,
    negativeMark: 2 / 3,
    languages: ["EN", "HI"] as const,
    candidatesPerYear: 1_100_000,
  },
  {
    code: "CUET_UG",
    name: "Common University Entrance Test (UG)",
    shortName: "CUET UG",
    category: "UNIVERSITY" as const,
    description:
      "Common entrance for central universities. CBT format with domain subjects, language, and general test sections.",
    durationMin: 195,
    totalQuestions: 175,
    totalMarks: 700,
    marksPerQ: 5,
    negativeMark: 1,
    languages: ["EN", "HI", "TE", "TA", "KN", "ML", "MR", "BN", "GU", "PA"] as const,
    candidatesPerYear: 1_400_000,
  },
  {
    code: "CTET",
    name: "Central Teacher Eligibility Test",
    shortName: "CTET",
    category: "TEACHING" as const,
    description:
      "Eligibility test for teaching positions in central government schools. Paper I (Class 1–5) and Paper II (Class 6–8).",
    durationMin: 150,
    totalQuestions: 150,
    totalMarks: 150,
    marksPerQ: 1,
    negativeMark: 0,
    languages: ["EN", "HI"] as const,
    candidatesPerYear: 3_000_000,
  },
  {
    code: "GATE_CSE",
    name: "Graduate Aptitude Test in Engineering — Computer Science",
    shortName: "GATE CSE",
    category: "ENGINEERING" as const,
    description:
      "Postgraduate engineering admission + PSU recruitment. CSE paper has 65 questions in 180 minutes covering core CS topics + Aptitude + Engineering Math.",
    durationMin: 180,
    totalQuestions: 65,
    totalMarks: 100,
    marksPerQ: 1.5,
    negativeMark: 1 / 3,
    languages: ["EN"] as const,
    candidatesPerYear: 100_000,
  },
  {
    code: "CAT",
    name: "Common Admission Test",
    shortName: "CAT",
    category: "MBA" as const,
    description:
      "MBA entrance for IIMs and other top business schools. 66 questions in 120 minutes across VARC, DILR, and Quant.",
    durationMin: 120,
    totalQuestions: 66,
    totalMarks: 198,
    marksPerQ: 3,
    negativeMark: 1,
    languages: ["EN"] as const,
    candidatesPerYear: 350_000,
  },
];

export async function seedExams() {
  console.log(`Seeding ${examsSeed.length} exams...`);
  for (const e of examsSeed) {
    await prisma.exam.upsert({
      where: { code: e.code },
      update: {
        name: e.name,
        shortName: e.shortName,
        category: e.category,
        description: e.description,
        durationMin: e.durationMin,
        totalQuestions: e.totalQuestions,
        totalMarks: e.totalMarks,
        marksPerQ: e.marksPerQ,
        negativeMark: e.negativeMark,
        languages: [...e.languages],
        candidatesPerYear: e.candidatesPerYear,
      },
      create: {
        code: e.code,
        name: e.name,
        shortName: e.shortName,
        category: e.category,
        description: e.description,
        durationMin: e.durationMin,
        totalQuestions: e.totalQuestions,
        totalMarks: e.totalMarks,
        marksPerQ: e.marksPerQ,
        negativeMark: e.negativeMark,
        languages: [...e.languages],
        candidatesPerYear: e.candidatesPerYear,
      },
    });
    console.log(`  ✓ ${e.code} — ${e.shortName}`);
  }
  console.log("Done.");
}

if (require.main === module) {
  seedExams()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
