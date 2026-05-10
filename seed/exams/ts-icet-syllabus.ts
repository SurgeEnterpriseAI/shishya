// TS ICET (Telangana State Integrated Common Entrance Test) — full syllabus tree.
// Conducting body: TSCHE / Kakatiya University (icet.tsche.ac.in).
// Pattern: 200 MCQs in 150 minutes. Sections: Analytical Ability (75 Qs — Data Sufficiency 20 +
// Problem Solving 55), Mathematical Ability (75 Qs), Communication Ability (50 Qs).
// 1 mark each. No negative marking.
// For MBA and MCA admissions in Telangana universities.
//
// Run after seedExams: npx tsx seed/exams/ts-icet-syllabus.ts

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

export const tsIcetSyllabus: SubjectSeed[] = [
  // ── ANALYTICAL ABILITY (75 Qs) ───────────────────────────────────────
  {
    code: "LOGICAL_REASONING",
    name: "Analytical Ability",
    weight: 1,
    topics: [
      { code: "lr.data_sufficiency", name: "Data Sufficiency (20 Qs)", description: "Determining if given statements together provide sufficient information." },
      { code: "lr.problem_solving", name: "Problem Solving (55 Qs)", description: "Mixed analytical and reasoning problems across multiple types." },
      { code: "lr.sequences_series", name: "Sequences and Series", description: "Number, letter and figural series — finding missing terms." },
      { code: "lr.coding_decoding", name: "Coding and Decoding", description: "Letter, number and symbol-based coding patterns." },
      { code: "lr.data_interpretation", name: "Data Interpretation", description: "Tables, pie charts, bar graphs, line graphs." },
      { code: "lr.venn_diagrams", name: "Venn Diagrams", description: "Set-based visual reasoning, region counting." },
      { code: "lr.pie_chart", name: "Pie Chart Analysis", description: "Sector-based percentage and ratio interpretation." },
      { code: "lr.date_time_arrangement", name: "Date, Time and Arrangement", description: "Calendar problems, clock problems, scheduling reasoning." },
      { code: "lr.linear_arrangement", name: "Linear Arrangement", description: "Arranging persons or objects in a line based on conditions." },
      { code: "lr.circular_arrangement", name: "Circular Arrangement", description: "Round-table seating with conditions." },
      { code: "lr.blood_relations", name: "Blood Relations", description: "Family tree and coded relationship problems." },
      { code: "lr.direction_sense", name: "Direction Sense", description: "Direction and distance-based problems." },
      { code: "lr.symbols_notations", name: "Symbols and Notations", description: "Mathematical operations replaced by symbols." },
      { code: "lr.passage_reasoning", name: "Passage-based Reasoning", description: "Drawing logical conclusions from short passages." },
    ],
  },

  // ── MATHEMATICAL ABILITY (75 Qs) ─────────────────────────────────────
  {
    code: "QUANT",
    name: "Mathematical Ability",
    weight: 1,
    topics: [
      { code: "quant.laws_indices", name: "Laws of Indices", description: "Rules for exponents and powers, simplification." },
      { code: "quant.ratio_proportion", name: "Ratios and Proportions", description: "Direct, inverse, compound proportion, partnership problems." },
      { code: "quant.percentages", name: "Percentages", description: "Conversions, successive percentage change, applications." },
      { code: "quant.profit_loss", name: "Profit and Loss", description: "CP, SP, MP, discount, profit and loss percentages." },
      { code: "quant.simple_compound_interest", name: "Simple and Compound Interest", description: "Interest formulas and applications." },
      { code: "quant.time_work", name: "Time and Work Problems", description: "Work-time problems, pipes and cisterns." },
      { code: "quant.time_distance", name: "Time, Speed and Distance", description: "Trains, boats and streams, average speed." },
      { code: "quant.numbers", name: "Number System", description: "Divisibility, HCF and LCM, factors, prime numbers." },
      { code: "quant.sets_polynomials", name: "Sets and Polynomials", description: "Set theory, polynomial operations, factor and remainder theorem." },
      { code: "quant.linear_equations", name: "Linear Equations", description: "One and two variable linear equations and applications." },
      { code: "quant.quadratic_equations", name: "Quadratic Equations", description: "Solution methods, nature of roots, applications." },
      { code: "quant.progressions", name: "Progressions", description: "Arithmetic and geometric progressions, sum formulas." },
      { code: "quant.binomial_theorem", name: "Binomial Theorem", description: "Expansion, general term, applications." },
      { code: "quant.matrices", name: "Matrices", description: "Operations, determinants, inverse, system of equations." },
      { code: "quant.notion_numbers", name: "Notion of Numbers", description: "Real, rational, irrational, complex numbers — basic concepts." },
      { code: "quant.trigonometric_ratios", name: "Trigonometric Ratios", description: "Ratios, identities, heights and distances." },
      { code: "quant.plane_geometry", name: "Plane Geometry", description: "Triangles, circles, quadrilaterals, polygons, angles." },
      { code: "quant.coordinate_geometry", name: "Coordinate Geometry", description: "Distance, section formula, slope, equation of line." },
      { code: "quant.areas_volumes", name: "Areas and Volumes", description: "Mensuration of plane and solid figures." },
      { code: "quant.statistical_ability", name: "Statistical Ability", description: "Mean, median, mode, variance, standard deviation, frequency distribution." },
      { code: "quant.probability", name: "Probability", description: "Classical probability and elementary conditional probability." },
    ],
  },

  // ── COMMUNICATION ABILITY (50 Qs) ────────────────────────────────────
  {
    code: "COMMUNICATION",
    name: "Communication Ability",
    weight: 1,
    topics: [
      { code: "comm.meanings_dashes", name: "Meanings — Sentences with Dashes", description: "Choosing appropriate words to fit dashes in sentences." },
      { code: "comm.verb_tense_voice", name: "Verb — Tense and Voice", description: "Identifying correct tense and active/passive voice usage." },
      { code: "comm.phrasal_verbs", name: "Phrasal Verbs", description: "Common phrasal verbs and their meanings." },
      { code: "comm.idioms", name: "Idioms", description: "Common English idioms and their meanings." },
      { code: "comm.articles", name: "Articles", description: "Correct usage of definite and indefinite articles." },
      { code: "comm.prepositions", name: "Prepositions", description: "Correct prepositions in different sentence contexts." },
      { code: "comm.computer_terminology", name: "Computer Terminology", description: "Basic IT and computer-related terms." },
      { code: "comm.business_terminology", name: "Business Terminology", description: "Common business and management vocabulary." },
      { code: "comm.reading_comprehension", name: "Reading Comprehension", description: "Passage-based questions on inference, vocabulary and main idea." },
      { code: "comm.synonyms_antonyms", name: "Synonyms and Antonyms", description: "Words with similar and opposite meanings." },
      { code: "comm.error_correction", name: "Error Correction", description: "Identifying and correcting grammatical errors in sentences." },
    ],
  },
];

export async function seedTsIcetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "TS_ICET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — TS_ICET exam not found.");
  }
  console.log(`Seeding TS ICET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < tsIcetSyllabus.length; sIdx++) {
    const s = tsIcetSyllabus[sIdx];
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
    console.log(`  ${s.code} — ${s.topics.length} topics`);
  }
  console.log(`Seeded TS ICET syllabus. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedTsIcetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
