// One-shot seed for Telangana Police Sub-Inspector (TSLPRB SI).
//
// Demand signal (8 Aug 2026 Ask log): "telangana SI, COnstable mock
// exam" — we had TS Police Constable but not SI. SI Preliminary:
// 200 Qs / 200 marks / 3 hours (Arithmetic, Reasoning, General
// Studies); Mains follows for qualifiers. We model the Preliminary
// (the mass stage aspirants practise for).
//
// Idempotent — same pattern as seed-ap-amvi.ts.
// Usage: npx tsx --env-file=.env.local scripts/seed-ts-police-si.ts

import { prisma } from "../src/lib/db/prisma";

const EXAM_CODE = "TS_POLICE_SI";

const EXAM_INFO = {
  code: EXAM_CODE,
  name: "Telangana Police Sub-Inspector (Preliminary)",
  shortName: "TS Police SI",
  category: "STATE_LEVEL" as const,
  state: "TS",
  description:
    "Telangana State Level Police Recruitment Board (TSLPRB) Sub-Inspector of Police recruitment. Preliminary written test: 200 questions, 200 marks, 3 hours — Arithmetic, Test of Reasoning/Mental Ability, and General Studies (Telangana-specific GK, Indian polity, history, geography, science, current affairs). Qualifiers proceed to Physical Efficiency Tests and the Final Written Examination. Graduate eligibility; papers are set in English, Telugu and Urdu.",
  durationMin: 180,
  totalQuestions: 200,
  totalMarks: 200,
  marksPerQ: 1,
  negativeMark: 0,
  candidatesPerYear: 250_000,
  languages: ["EN", "TE"] as Array<"EN" | "TE">,
  active: true,
};

interface SubjectSpec {
  code: string;
  name: string;
  weight: number;
  topics: Array<{ code: string; name: string; description: string }>;
}

const SUBJECTS: SubjectSpec[] = [
  {
    code: "arith",
    name: "Arithmetic",
    weight: 0.3,
    topics: [
      { code: "arith.number-system", name: "Number System & Simplification", description: "HCF/LCM, fractions, decimals, surds, BODMAS, approximation." },
      { code: "arith.percentage", name: "Percentage, Profit & Loss", description: "Percentages, profit-loss, discount, simple and compound interest." },
      { code: "arith.ratio", name: "Ratio, Proportion & Partnership", description: "Ratios, proportions, mixtures and alligation, partnership shares." },
      { code: "arith.time", name: "Time, Speed, Work & Distance", description: "Time & work, pipes & cisterns, speed-distance-time, trains, boats & streams." },
      { code: "arith.mensuration", name: "Mensuration & Data Interpretation", description: "Areas, volumes, averages, tables, bar/pie charts." },
    ],
  },
  {
    code: "reasoning",
    name: "Reasoning & Mental Ability",
    weight: 0.3,
    topics: [
      { code: "reasoning.series", name: "Series & Analogy", description: "Number/letter series, analogies, odd-one-out, classification." },
      { code: "reasoning.coding", name: "Coding-Decoding & Blood Relations", description: "Letter-number coding, symbolic coding, family-tree problems." },
      { code: "reasoning.direction", name: "Direction, Ranking & Arrangement", description: "Direction sense, seating arrangement, ranking and ordering puzzles." },
      { code: "reasoning.logic", name: "Syllogism & Logical Deduction", description: "Statement-conclusion, syllogisms, assertions, Venn diagrams." },
      { code: "reasoning.nonverbal", name: "Non-verbal & Visual Reasoning", description: "Figure series, mirror images, embedded figures, paper folding." },
    ],
  },
  {
    code: "gs",
    name: "General Studies",
    weight: 0.4,
    topics: [
      { code: "gs.telangana", name: "Telangana History, Movement & Culture", description: "Telangana statehood movement, dynasties, culture, festivals, geography of Telangana." },
      { code: "gs.polity", name: "Indian Polity & Constitution", description: "Constitution, fundamental rights, Parliament, judiciary, local governance, police organisation." },
      { code: "gs.history", name: "Indian History & National Movement", description: "Ancient to modern Indian history, freedom struggle." },
      { code: "gs.geography", name: "Geography & Economy", description: "Indian and Telangana geography, agriculture, industries, budgets and schemes." },
      { code: "gs.science", name: "General Science & Technology", description: "Physics, chemistry, biology basics; science & tech in daily life." },
      { code: "gs.current", name: "Current Affairs", description: "National, international and Telangana current events, sports, awards." },
    ],
  },
];

async function main() {
  console.log(`Seeding ${EXAM_CODE}...`);
  await prisma.$transaction(async (tx) => {
    const exam = await tx.exam.upsert({ where: { code: EXAM_CODE }, create: EXAM_INFO, update: EXAM_INFO });
    console.log(`  exam upserted: ${exam.id}`);
    await tx.subject.deleteMany({ where: { examId: exam.id } });
    for (let i = 0; i < SUBJECTS.length; i++) {
      const s = SUBJECTS[i];
      const subj = await tx.subject.create({
        data: { examId: exam.id, code: s.code, name: s.name, weight: s.weight, orderIdx: i },
      });
      for (let j = 0; j < s.topics.length; j++) {
        const t = s.topics[j];
        await tx.topic.create({
          data: { subjectId: subj.id, code: t.code, name: t.name, description: t.description, orderIdx: j },
        });
      }
      console.log(`  + ${s.code} (${s.topics.length} topics)`);
    }
  });
  console.log("\nDone. Live at https://shishya.in/exams/TS_POLICE_SI");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
