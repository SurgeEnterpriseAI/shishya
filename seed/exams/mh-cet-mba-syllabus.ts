// MAH MBA / MMS CET (Maharashtra Common Entrance Test for MBA / MMS) — full syllabus tree.
// Conducting body: State CET Cell, Maharashtra (cetcell.mahacet.org).
// Pattern: 200 MCQs in 150 minutes. Sections: Logical Reasoning (75 Qs), Abstract Reasoning (25 Qs),
// Quantitative Aptitude (50 Qs), Verbal Ability & Reading Comprehension (50 Qs). No negative marking.
//
// Run after seedExams: npx tsx seed/exams/mh-cet-mba-syllabus.ts

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

export const mhCetMbaSyllabus: SubjectSeed[] = [
  // ── LOGICAL REASONING (75 Qs) ────────────────────────────────────────
  {
    code: "LOGICAL_REASONING",
    name: "Logical Reasoning",
    weight: 1,
    topics: [
      { code: "lr.linear_arrangement", name: "Linear Arrangement", description: "Arranging persons or objects in a line based on given conditions." },
      { code: "lr.circular_arrangement", name: "Circular Arrangement", description: "Seating people around a round table with conditions." },
      { code: "lr.matrix_arrangement", name: "Matrix and Tabular Arrangement", description: "Mapping multiple attributes to entities based on conditions." },
      { code: "lr.blood_relations", name: "Blood Relations", description: "Family tree, coded relations, generational reasoning." },
      { code: "lr.coding_decoding", name: "Coding-Decoding", description: "Letter, number and symbol-based coding patterns." },
      { code: "lr.series", name: "Series — Number, Letter, Mixed", description: "Identifying patterns and missing terms in sequences." },
      { code: "lr.analogies", name: "Analogies", description: "Word, number, figural analogies based on relationships." },
      { code: "lr.syllogism", name: "Syllogism", description: "Categorical premises and valid conclusions." },
      { code: "lr.direction_sense", name: "Direction Sense", description: "Direction and distance problems, shortest path." },
      { code: "lr.ranking_ordering", name: "Ranking and Ordering", description: "Rank-based problems with conditions." },
      { code: "lr.venn_diagrams", name: "Venn Diagrams", description: "Set-based visual reasoning, region counting." },
      { code: "lr.clocks", name: "Clocks", description: "Angle between hands, time gain/loss, mirror images of clocks." },
      { code: "lr.calendars", name: "Calendars", description: "Day calculation, leap year, odd days." },
      { code: "lr.input_output", name: "Input-Output", description: "Step-wise transformation of given input to output." },
      { code: "lr.data_sufficiency", name: "Data Sufficiency", description: "Identifying minimum data required to answer a question." },
      { code: "lr.cause_effect", name: "Cause and Effect", description: "Identifying causal relationships between statements." },
      { code: "lr.statement_arguments", name: "Statement and Arguments", description: "Strong vs weak arguments, course of action." },
      { code: "lr.statement_assumptions", name: "Statement and Assumptions", description: "Identifying hidden assumptions behind statements." },
      { code: "lr.statement_conclusions", name: "Statement and Conclusions", description: "Determining valid conclusions from given statements." },
      { code: "lr.critical_reasoning", name: "Critical Reasoning", description: "Strengthen, weaken, inference, paradox-style questions." },
      { code: "lr.odd_one_out", name: "Odd One Out", description: "Identifying the element that does not fit the pattern." },
    ],
  },

  // ── ABSTRACT REASONING (25 Qs — part of LR section) ──────────────────
  {
    code: "ABSTRACT_REASONING",
    name: "Abstract Reasoning",
    weight: 1,
    topics: [
      { code: "ar.figure_series", name: "Figure Series", description: "Identifying the next or missing figure in a non-verbal sequence." },
      { code: "ar.figure_analogies", name: "Figure Analogies", description: "Pairs of figures with a relationship; finding the matching pair." },
      { code: "ar.figure_classification", name: "Figure Classification", description: "Identifying the figure that does not belong to a group." },
      { code: "ar.mirror_water_image", name: "Mirror and Water Images", description: "Visualising reflections of figures in mirror or water." },
      { code: "ar.paper_folding_cutting", name: "Paper Folding and Cutting", description: "Predicting the result of folding and cutting paper patterns." },
      { code: "ar.embedded_figures", name: "Embedded Figures", description: "Identifying a smaller figure hidden within a complex one." },
      { code: "ar.cube_dice", name: "Cubes and Dice", description: "Visualising sides of a cube or die from given views." },
    ],
  },

  // ── QUANTITATIVE APTITUDE (50 Qs) ─────────────────────────────────────
  {
    code: "QUANT",
    name: "Quantitative Aptitude",
    weight: 1,
    topics: [
      { code: "quant.percentages", name: "Percentages", description: "Conversion, percentage change, successive percentages." },
      { code: "quant.profit_loss", name: "Profit, Loss and Discount", description: "CP, SP, MP, discount, marked price, profit and loss percentages." },
      { code: "quant.simple_compound_interest", name: "Simple and Compound Interest", description: "Interest formulas, EMI calculation basics." },
      { code: "quant.ratio_proportion", name: "Ratio and Proportion", description: "Direct, inverse, compound proportion, partnership." },
      { code: "quant.averages", name: "Averages", description: "Simple average, weighted average, change in average." },
      { code: "quant.time_work", name: "Time and Work", description: "Work-time problems, pipes and cisterns." },
      { code: "quant.time_speed_distance", name: "Time, Speed and Distance", description: "Trains, boats and streams, average speed, races." },
      { code: "quant.mixtures_alligation", name: "Mixtures and Alligation", description: "Rule of alligation, mixture replacement problems." },
      { code: "quant.numbers", name: "Number System", description: "Divisibility, HCF, LCM, factors, remainders, base systems." },
      { code: "quant.algebra_equations", name: "Algebraic Equations", description: "Linear, quadratic equations, inequalities, simplification." },
      { code: "quant.geometry", name: "Geometry", description: "Triangles, quadrilaterals, circles, polygons, angles." },
      { code: "quant.mensuration", name: "Mensuration", description: "Areas and volumes of plane and solid figures." },
      { code: "quant.coordinate_geometry", name: "Coordinate Geometry", description: "Distance, slope, equation of line, basic conics." },
      { code: "quant.permutation_combination", name: "Permutations and Combinations", description: "Counting principles, arrangements and selections." },
      { code: "quant.probability", name: "Probability", description: "Classical probability, simple events, conditional basics." },
      { code: "quant.di_tables", name: "Data Interpretation — Tables", description: "Reading and analysing tabular data." },
      { code: "quant.di_bar_line", name: "Data Interpretation — Bar and Line Graphs", description: "Trend analysis, percentage and ratio computations." },
      { code: "quant.di_pie_charts", name: "Data Interpretation — Pie Charts", description: "Sector-based percentage and ratio interpretation." },
      { code: "quant.di_caselets", name: "Data Interpretation — Caselets", description: "Paragraph-based mixed quantitative reasoning." },
    ],
  },

  // ── VERBAL ABILITY & READING COMPREHENSION (50 Qs) ───────────────────
  {
    code: "VERBAL_ABILITY",
    name: "Verbal Ability and Reading Comprehension",
    weight: 1,
    topics: [
      { code: "va.reading_comprehension", name: "Reading Comprehension", description: "Passage-based questions on inference, tone, main idea, vocabulary." },
      { code: "va.synonyms", name: "Synonyms", description: "Words with similar meaning." },
      { code: "va.antonyms", name: "Antonyms", description: "Words with opposite meaning." },
      { code: "va.idioms_phrases", name: "Idioms and Phrases", description: "Common English idioms and phrasal verbs." },
      { code: "va.one_word_substitution", name: "One Word Substitution", description: "Single word replacing a longer phrase." },
      { code: "va.sentence_correction", name: "Sentence Correction", description: "Identifying and correcting grammatical errors." },
      { code: "va.fill_blanks", name: "Fill in the Blanks", description: "Single and double blanks based on grammar and vocabulary." },
      { code: "va.cloze_test", name: "Cloze Test", description: "Filling multiple blanks in a passage." },
      { code: "va.para_jumbles", name: "Para Jumbles", description: "Rearranging sentences into a coherent paragraph." },
      { code: "va.para_completion", name: "Para Completion", description: "Choosing the most appropriate concluding sentence for a paragraph." },
      { code: "va.error_spotting", name: "Error Spotting", description: "Finding grammatical errors in sentences." },
      { code: "va.sentence_arrangement", name: "Sentence Arrangement", description: "Arranging given sentences in logical order." },
      { code: "va.confusable_pairs", name: "Confusable Word Pairs", description: "Distinguishing commonly confused words (e.g., affect/effect)." },
    ],
  },
];

export async function seedMhCetMbaSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "MH_MAHCET_MBA" } });
  if (!exam) {
    throw new Error("Run seedExams() first — MH_MAHCET_MBA exam not found.");
  }
  console.log(`Seeding MAH MBA CET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < mhCetMbaSyllabus.length; sIdx++) {
    const s = mhCetMbaSyllabus[sIdx];
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
  console.log(`Seeded MAH MBA CET syllabus. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedMhCetMbaSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
