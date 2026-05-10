// IBPS PO Prelims — full syllabus tree.
// 3 sections, 100 questions, 100 marks, 60 minutes (20 min/section).
// English (30Q/30M), Quantitative Aptitude (35Q/35M), Reasoning Ability (35Q/35M).
// Source: IBPS official notification (ibps.in) cross-checked with Adda247/Bankersadda/Oliveboard.
//
// Run after seedExams: npx tsx seed/exams/ibps-po-syllabus.ts

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

export const ibpsPoSyllabus: SubjectSeed[] = [
  // ── ENGLISH LANGUAGE ──────────────────────────────────────────────────
  {
    code: "ENGLISH",
    name: "English Language",
    weight: 1,
    topics: [
      { code: "eng.reading_comprehension", name: "Reading Comprehension", description: "Passage-based questions on banking, economy, and social topics — main idea, inference, vocabulary, and tone." },
      { code: "eng.cloze_test", name: "Cloze Test", description: "Fill multiple blanks within a passage — single and double-fill variants used in IBPS PO Prelims." },
      { code: "eng.error_spotting", name: "Error Spotting", description: "Identify the part of a sentence with a grammatical error — typical IBPS PO sentence-correction style." },
      { code: "eng.sentence_improvement", name: "Sentence Improvement", description: "Choose the best alternative for an underlined part of the sentence." },
      { code: "eng.para_jumbles", name: "Para Jumbles", description: "Re-arrange jumbled sentences into a coherent paragraph; identify the correct opening or closing sentence." },
      { code: "eng.fill_blanks", name: "Fill in the Blanks", description: "Single and double-blank sentence completion testing vocabulary and grammar." },
      { code: "eng.sentence_rearrangement", name: "Sentence Rearrangement", description: "Re-order parts of a single sentence into the most logical sequence." },
      { code: "eng.word_swap", name: "Word Swap / Word Usage", description: "Swap incorrectly placed words in a sentence; identify the right word from a set." },
      { code: "eng.match_columns", name: "Match the Columns / Sentence Connector", description: "Connect two sentence halves using the correct connector or phrase." },
      { code: "eng.synonyms_antonyms", name: "Synonyms and Antonyms", description: "Word-meaning questions, often appearing within reading comprehension passages." },
      { code: "eng.idioms_phrases", name: "Idioms and Phrases", description: "Meaning of common English idioms and phrasal verbs in context." },
    ],
  },

  // ── QUANTITATIVE APTITUDE ─────────────────────────────────────────────
  {
    code: "QUANT",
    name: "Quantitative Aptitude",
    weight: 1,
    topics: [
      { code: "quant.simplification", name: "Simplification and Approximation", description: "BODMAS, fractions, decimals, square/cube roots — core 5-mark scoring topic in IBPS PO." },
      { code: "quant.number_series", name: "Number Series", description: "Missing-number and wrong-term series — arithmetic, geometric, and mixed patterns." },
      { code: "quant.quadratic_equations", name: "Quadratic Equations", description: "Compare two quadratic equations; relation between x and y." },
      { code: "quant.data_interpretation", name: "Data Interpretation",
        subtopics: [
          { code: "quant.data_interpretation.tabular", name: "Tabular DI", description: "Interpret data presented in a table — typically 5 questions per set." },
          { code: "quant.data_interpretation.bar", name: "Bar Graph DI", description: "Single and double bar-chart interpretation." },
          { code: "quant.data_interpretation.line", name: "Line Graph DI", description: "Trend-based questions on line graphs." },
          { code: "quant.data_interpretation.pie", name: "Pie Chart DI", description: "Percentage-based pie chart interpretation." },
          { code: "quant.data_interpretation.caselet", name: "Caselet DI", description: "Word-problem based DI requiring data extraction from a paragraph." },
          { code: "quant.data_interpretation.missing", name: "Missing DI", description: "Tables with missing values that must be deduced before answering." },
        ],
      },
      { code: "quant.arithmetic", name: "Arithmetic",
        subtopics: [
          { code: "quant.arithmetic.percentage", name: "Percentage", description: "Percentage change, percentage applied to ratios and word problems." },
          { code: "quant.arithmetic.ratio_proportion", name: "Ratio and Proportion", description: "Compound ratio, partnership, age ratios." },
          { code: "quant.arithmetic.average", name: "Average", description: "Average of numbers, weighted average, age-based averages." },
          { code: "quant.arithmetic.profit_loss", name: "Profit, Loss and Discount", description: "CP/SP/MP, successive discounts, marked price." },
          { code: "quant.arithmetic.si_ci", name: "Simple and Compound Interest", description: "SI, CI (annual/half-yearly), difference between SI and CI." },
          { code: "quant.arithmetic.time_work", name: "Time and Work", description: "Work-efficiency, pipes and cisterns." },
          { code: "quant.arithmetic.time_speed_distance", name: "Time, Speed and Distance", description: "Trains, boats and streams, relative speed." },
          { code: "quant.arithmetic.mixture_alligation", name: "Mixture and Alligation", description: "Two/three component mixtures and replacement problems." },
          { code: "quant.arithmetic.partnership", name: "Partnership", description: "Profit-sharing based on capital and time invested." },
          { code: "quant.arithmetic.ages", name: "Problems on Ages", description: "Age-based linear equations and ratio problems." },
        ],
      },
      { code: "quant.permutation_combination", name: "Permutation and Combination", description: "Basic counting, arrangement, and selection problems." },
      { code: "quant.probability", name: "Probability", description: "Single-event probability — coins, dice, cards, balls in a bag." },
      { code: "quant.mensuration", name: "Mensuration", description: "Areas and volumes — rectangles, circles, cylinders, cones, spheres." },
      { code: "quant.number_system", name: "Number System", description: "HCF/LCM, divisibility, factors, fractions and decimals." },
    ],
  },

  // ── REASONING ABILITY ─────────────────────────────────────────────────
  {
    code: "REASONING",
    name: "Reasoning Ability",
    weight: 1,
    topics: [
      { code: "reason.puzzles", name: "Puzzles",
        subtopics: [
          { code: "reason.puzzles.floor", name: "Floor / Building Puzzle", description: "Arrange persons across floors of a building with given conditions." },
          { code: "reason.puzzles.box", name: "Box-based Puzzle", description: "Stacked boxes with colour, size, or content constraints." },
          { code: "reason.puzzles.scheduling", name: "Day / Month Scheduling", description: "Assign persons to days, months, or years based on clues." },
          { code: "reason.puzzles.classification", name: "Classification-based Puzzle", description: "Group persons into categories with multiple variables." },
        ],
      },
      { code: "reason.seating_arrangement", name: "Seating Arrangement",
        subtopics: [
          { code: "reason.seating_arrangement.linear", name: "Linear Arrangement", description: "Single-row and double-row seating, persons facing same/opposite directions." },
          { code: "reason.seating_arrangement.circular", name: "Circular Arrangement", description: "Persons sitting around a circular table, facing centre or outside." },
          { code: "reason.seating_arrangement.square", name: "Square / Rectangular Arrangement", description: "Persons seated at corners and middles of a square or rectangle." },
        ],
      },
      { code: "reason.syllogism", name: "Syllogism", description: "Two- and three-statement deductions using all/some/no/only quantifiers; reverse syllogism." },
      { code: "reason.inequalities", name: "Inequalities", description: "Direct and coded inequalities — relation between A, B, C, D using >, <, =." },
      { code: "reason.coding_decoding", name: "Coding-Decoding", description: "Letter-letter, letter-number, and new-pattern symbol-based coding." },
      { code: "reason.blood_relations", name: "Blood Relations", description: "Family-tree, generation-based, and pointing-style relation problems." },
      { code: "reason.direction_distance", name: "Direction and Distance", description: "Compass-based movement and shortest-distance calculations." },
      { code: "reason.order_ranking", name: "Order and Ranking", description: "Ranking from top/bottom, position-based, age-based ordering." },
      { code: "reason.alphanumeric_series", name: "Alphanumeric / Number Series", description: "Letter, number, and symbol series with operations applied." },
      { code: "reason.data_sufficiency", name: "Data Sufficiency", description: "Decide whether the given statements are sufficient to answer the question." },
      { code: "reason.input_output", name: "Machine Input-Output", description: "Step-by-step word/number rearrangement following a hidden rule." },
      { code: "reason.statement_assumption", name: "Statement and Assumption / Conclusion", description: "Logical inference from a given statement — IBPS-style critical reasoning." },
      { code: "reason.alphabet_test", name: "Alphabet Test", description: "Word-formation, letter-pair counting, position-based questions." },
    ],
  },
];

export async function seedIbpsPoSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "IBPS_PO" } });
  if (!exam) {
    throw new Error("Run seedExams() first — IBPS_PO exam not found.");
  }
  console.log(`Seeding IBPS PO syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < ibpsPoSyllabus.length; sIdx++) {
    const s = ibpsPoSyllabus[sIdx];
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
    console.log(`  ✓ ${s.code} — ${s.topics.length} top-level topics`);
  }
  console.log(`Done. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedIbpsPoSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
