// Madhya Pradesh Police Constable — full syllabus tree.
// 100 MCQs in 2 hours, 100 marks (no negative marking). MPPEB / MP ESB conducts.
// Paper 1: General Knowledge & Reasoning (40), Intellectual & Mental Ability (30),
//          Science & Simple Arithmetic (30).
// Source: mppolice.gov.in / esb.mp.gov.in notification + Career Power / Khan Global cross-check.
//
// Run after seedExams: npx tsx seed/exams/mp-police-pc-syllabus.ts

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

interface TopicSeed {
  code: string;
  name: string;
  description?: string;
  weight?: number;
  subtopics?: TopicSeed[];
}

interface SubjectSeed {
  code: string;
  name: string;
  weight: number;
  topics: TopicSeed[];
}

export const mpPolicePcSyllabus: SubjectSeed[] = [
  // ── GENERAL KNOWLEDGE & REASONING (40 Qs) ──────────────────────────────
  {
    code: "GK",
    name: "General Knowledge & Reasoning",
    weight: 0.4,
    topics: [
      { code: "gk.history_india", name: "Indian History", description: "Ancient, medieval and modern Indian history." },
      { code: "gk.freedom_struggle", name: "Indian Freedom Struggle", description: "1857, INC, Gandhian movements." },
      { code: "gk.geography_india", name: "Indian Geography", description: "Physical, economic and political geography of India." },
      { code: "gk.polity", name: "Indian Polity & Constitution", description: "Constitution, Parliament, judiciary basics." },
      { code: "gk.economy", name: "Indian Economy", description: "Plans, banking, GDP and budget." },
      { code: "gk.tech", name: "Science & Technology", description: "Space, defence, IT and biotech." },
      { code: "gk.sports", name: "Sports", description: "National and international sports events and players." },
      { code: "gk.awards", name: "Awards & Honours", description: "Padma, Nobel and recent honours." },
      { code: "gk.current_affairs", name: "Current Affairs", description: "National and international events of last 12-18 months." },
      { code: "gk.computer", name: "Computer Knowledge", description: "Hardware, software and internet basics." },
      { code: "gk.mp_history", name: "MP History", description: "Paramaras, Chandelas, Bundelas, Holkar and Scindia dynasties." },
      { code: "gk.mp_freedom", name: "MP in Freedom Struggle", description: "Tantya Tope, Rani Avantibai, Chandrashekhar Azad and tribal revolts." },
      { code: "gk.mp_geography", name: "MP Geography", description: "Districts, rivers (Narmada, Tapti, Chambal, Betwa), Vindhya range, climate." },
      { code: "gk.mp_polity", name: "MP Polity & Schemes", description: "MP government structure, welfare schemes — Ladli Behna, etc." },
      { code: "gk.mp_culture", name: "MP Culture & Festivals", description: "Khajuraho, Ujjain Kumbh, tribal art, Gond and Bhil folk traditions." },
      { code: "gk.mp_personalities", name: "MP Famous Personalities", description: "Political leaders, sportspersons, artists, administrators of MP." },
      { code: "reason.analogy", name: "Analogies", description: "Word, number and figural analogies." },
      { code: "reason.series", name: "Series", description: "Letter, number and figural series." },
      { code: "reason.coding", name: "Coding-Decoding", description: "Letter/number/symbol coding patterns." },
      { code: "reason.blood_relation", name: "Blood Relations", description: "Family-tree puzzles." },
      { code: "reason.direction", name: "Direction Sense", description: "Cardinal directions and final-position." },
      { code: "reason.syllogism", name: "Syllogism", description: "Logical conclusions from premises." },
    ],
  },

  // ── INTELLECTUAL & MENTAL ABILITY (30 Qs) ──────────────────────────────
  {
    code: "MENTAL_ABILITY",
    name: "Intellectual & Mental Ability",
    weight: 0.3,
    topics: [
      { code: "ma.classification", name: "Classification", description: "Odd one out — verbal, numerical and figural." },
      { code: "ma.ranking", name: "Ranking & Order", description: "Top/bottom rank and seating order." },
      { code: "ma.alphabet", name: "Alphabet Test", description: "Alphabet position and dictionary order." },
      { code: "ma.venn", name: "Venn Diagrams", description: "Set relationships visualised." },
      { code: "ma.statement_conclusion", name: "Statement & Conclusion", description: "Inference and assumption analysis." },
      { code: "ma.statement_argument", name: "Statement & Argument", description: "Strong/weak argument evaluation." },
      { code: "ma.assertion_reason", name: "Assertion & Reason", description: "Cause-effect verification problems." },
      { code: "ma.cause_effect", name: "Cause & Effect", description: "Identifying cause-effect from given events." },
      { code: "ma.problem_solving", name: "Problem Solving", description: "Seating, ordering and grouping puzzles." },
      { code: "ma.mirror_water", name: "Mirror & Water Image", description: "Reflection-based visual reasoning." },
      { code: "ma.paper_folding", name: "Paper Folding & Cutting", description: "Visualisation of folded paper." },
      { code: "ma.embedded_figures", name: "Embedded Figures", description: "Hidden figure detection." },
      { code: "ma.cube_dice", name: "Cube & Dice", description: "Dice rotation and cube counting." },
      { code: "ma.visual_memory", name: "Visual Memory & Discrimination", description: "Retention and differentiation of visual stimuli." },
      { code: "ma.observation", name: "Observation", description: "Counting figures and detail observation." },
      { code: "ma.social_intelligence", name: "Social Intelligence", description: "Situational and interpersonal reasoning." },
      { code: "ma.data_interpretation", name: "Data Interpretation", description: "Tables, bar/pie/line graphs." },
      { code: "ma.syllogistic_reasoning", name: "Syllogistic Reasoning", description: "Advanced syllogism puzzles." },
    ],
  },

  // ── SCIENCE & SIMPLE ARITHMETIC (30 Qs) ────────────────────────────────
  {
    code: "SCIENCE_MATH",
    name: "Science & Simple Arithmetic",
    weight: 0.3,
    topics: [
      { code: "sci.physics", name: "Physics Basics", description: "Mechanics, force, energy, electricity and magnetism." },
      { code: "sci.chemistry", name: "Chemistry Basics", description: "Acids, bases, salts, metals and non-metals." },
      { code: "sci.biology_human", name: "Human Body & Health", description: "Body systems, nutrition and disease awareness." },
      { code: "sci.bacteria_diseases", name: "Bacteria & Diseases", description: "Common bacterial/viral diseases and their symptoms." },
      { code: "sci.environment", name: "Environment & Ecology", description: "Pollution, climate change and conservation." },
      { code: "sci.tech", name: "Science & Technology Applications", description: "Recent tech, space, IT and biotech advances." },
      { code: "math.simplification", name: "Simplification", description: "BODMAS and arithmetic simplification." },
      { code: "math.percentage", name: "Percentage", description: "Percentage applications." },
      { code: "math.profit_loss", name: "Profit & Loss", description: "CP, SP, MP and discount." },
      { code: "math.ratio_proportion", name: "Ratio & Proportion", description: "Compound ratio and partnership." },
      { code: "math.average", name: "Average", description: "Mean and weighted average." },
      { code: "math.si_ci", name: "Simple & Compound Interest", description: "SI and CI calculations." },
      { code: "math.time_work", name: "Time & Work", description: "Work efficiency and pipes/cisterns." },
      { code: "math.time_distance", name: "Time & Distance", description: "Speed, trains, boats." },
      { code: "math.mensuration", name: "Mensuration", description: "Area, perimeter and volume." },
      { code: "math.number_system", name: "Number System", description: "Number properties and divisibility." },
      { code: "math.lcm_hcf", name: "LCM & HCF", description: "Highest common factor and lowest common multiple." },
      { code: "math.data_interpretation", name: "Data Interpretation", description: "Pie chart, bar and line graph problems." },
    ],
  },
];

export async function seedMpPolicePcSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "MP_POLICE_PC" } });
  if (!exam) {
    throw new Error("Run seedExams() first — MP_POLICE_PC exam not found.");
  }
  console.log(`Seeding MP Police Constable syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < mpPolicePcSyllabus.length; sIdx++) {
    const s = mpPolicePcSyllabus[sIdx];
    const subject = await prisma.subject.upsert({
      where: { examId_code: { examId: exam.id, code: s.code } },
      update: { name: s.name, weight: s.weight, orderIdx: sIdx },
      create: {
        examId: exam.id,
        code: s.code,
        name: s.name,
        weight: s.weight,
        orderIdx: sIdx,
      },
    });

    for (let tIdx = 0; tIdx < s.topics.length; tIdx++) {
      const t = s.topics[tIdx];
      const topic = await prisma.topic.upsert({
        where: { subjectId_code: { subjectId: subject.id, code: t.code } },
        update: {
          name: t.name,
          description: t.description ?? null,
          syllabusText: t.description ?? null,
          weight: t.weight ?? 1,
          orderIdx: tIdx,
          parentId: null,
        },
        create: {
          subjectId: subject.id,
          code: t.code,
          name: t.name,
          description: t.description ?? null,
          syllabusText: t.description ?? null,
          weight: t.weight ?? 1,
          orderIdx: tIdx,
        },
      });
      topicCount++;

      if (t.subtopics?.length) {
        for (let stIdx = 0; stIdx < t.subtopics.length; stIdx++) {
          const st = t.subtopics[stIdx];
          await prisma.topic.upsert({
            where: { subjectId_code: { subjectId: subject.id, code: st.code } },
            update: {
              name: st.name,
              description: st.description ?? null,
              syllabusText: st.description ?? null,
              parentId: topic.id,
              orderIdx: stIdx,
            },
            create: {
              subjectId: subject.id,
              parentId: topic.id,
              code: st.code,
              name: st.name,
              description: st.description ?? null,
              syllabusText: st.description ?? null,
              orderIdx: stIdx,
            },
          });
          topicCount++;
        }
      }
    }
    console.log(`  ✓ ${s.code} — ${s.topics.length} topics`);
  }
  console.log(`Done. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedMpPolicePcSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
