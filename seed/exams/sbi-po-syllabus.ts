// SBI PO Prelims — full syllabus tree.
// 3 sections, 100 questions, 100 marks, 60 minutes (20 min/section).
// English (30Q/30M), Quantitative Aptitude (35Q/35M), Reasoning Ability (35Q/35M).
// Source: SBI official notification (sbi.co.in/careers) cross-checked with
// Adda247/Oliveboard/Bankersadda. SBI PO is widely regarded as the toughest
// banking prelim — high-difficulty puzzles and new-pattern English questions are typical.
//
// Run after seedExams: npx tsx seed/exams/sbi-po-syllabus.ts

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

export const sbiPoSyllabus: SubjectSeed[] = [
  // ── ENGLISH LANGUAGE ──────────────────────────────────────────────────
  {
    code: "ENGLISH",
    name: "English Language",
    weight: 1,
    topics: [
      { code: "eng.reading_comprehension", name: "Reading Comprehension", description: "Long passages on banking, economy, social issues — high-difficulty inference and tone questions typical of SBI PO." },
      { code: "eng.cloze_test", name: "Cloze Test", description: "Multi-blank cloze, including new-pattern variants where each blank has its own option set." },
      { code: "eng.error_spotting", name: "Error Spotting / Error Detection", description: "Identify the grammatically incorrect part — multi-error new-pattern format common in SBI PO." },
      { code: "eng.para_jumbles", name: "Sentence Rearrangement / Para Jumbles", description: "Re-order jumbled sentences; SBI uses both classic and new-pattern jumble variants." },
      { code: "eng.sentence_improvement", name: "Sentence Improvement / Phrase Replacement", description: "Choose the best replacement for an underlined phrase." },
      { code: "eng.fill_blanks", name: "Fill in the Blanks", description: "Single, double, and triple-blank vocabulary-based completion." },
      { code: "eng.word_swap", name: "Word Swap", description: "Identify which two words in a sentence must be swapped for it to be grammatically correct." },
      { code: "eng.word_usage", name: "Word Usage", description: "Identify the sentence(s) in which a given word is used correctly." },
      { code: "eng.match_columns", name: "Match the Columns / Connectors", description: "Connect sentence halves or phrases using the right linker." },
      { code: "eng.idioms_phrases", name: "Idioms and Phrases", description: "Meaning of idioms tested both directly and within passages." },
      { code: "eng.synonyms_antonyms", name: "Synonyms and Antonyms", description: "Word-meaning questions — usually nested within RC passages." },
      { code: "eng.theme_identification", name: "Theme / Inference Detection", description: "Identify the underlying theme or correct inference of a short paragraph." },
    ],
  },

  // ── QUANTITATIVE APTITUDE ─────────────────────────────────────────────
  {
    code: "QUANT",
    name: "Quantitative Aptitude",
    weight: 1,
    topics: [
      { code: "quant.simplification", name: "Simplification and Approximation", description: "BODMAS, fractions, decimals — quick-scoring topic in SBI PO Prelims." },
      { code: "quant.number_series", name: "Number Series", description: "Missing-term and wrong-term series with multi-step patterns." },
      { code: "quant.quadratic_equations", name: "Quadratic Equations", description: "Compare two quadratic equations and decide x-y relation." },
      { code: "quant.data_interpretation", name: "Data Interpretation",
        subtopics: [
          { code: "quant.data_interpretation.tabular", name: "Tabular DI", description: "Direct table-based DI sets." },
          { code: "quant.data_interpretation.bar", name: "Bar Graph DI", description: "Single, double, and stacked bar charts." },
          { code: "quant.data_interpretation.line", name: "Line Graph DI", description: "Single and double line-graph trends." },
          { code: "quant.data_interpretation.pie", name: "Pie Chart DI", description: "Percentage and degree-based pie chart sets." },
          { code: "quant.data_interpretation.caselet", name: "Caselet DI", description: "Paragraph-based DI requiring extraction of figures." },
          { code: "quant.data_interpretation.missing", name: "Missing DI", description: "Tables with missing entries to be deduced first." },
          { code: "quant.data_interpretation.mixed", name: "Mixed / Combined DI", description: "Combination of two chart types in a single set — SBI PO favourite." },
        ],
      },
      { code: "quant.arithmetic", name: "Arithmetic",
        subtopics: [
          { code: "quant.arithmetic.percentage", name: "Percentage", description: "Percentage change, applied percentage." },
          { code: "quant.arithmetic.ratio_proportion", name: "Ratio and Proportion", description: "Compound ratio, partnership-linked ratios." },
          { code: "quant.arithmetic.average", name: "Average", description: "Average of numbers, weighted average, ages." },
          { code: "quant.arithmetic.profit_loss", name: "Profit, Loss and Discount", description: "CP/SP/MP, successive discounts, dishonest dealer." },
          { code: "quant.arithmetic.si_ci", name: "Simple and Compound Interest", description: "SI, CI (annual / half-yearly / quarterly)." },
          { code: "quant.arithmetic.time_work", name: "Time and Work", description: "Work-efficiency, alternate-day, and pipes & cisterns." },
          { code: "quant.arithmetic.time_speed_distance", name: "Time, Speed and Distance", description: "Trains, boats & streams, relative motion." },
          { code: "quant.arithmetic.mixture", name: "Mixture and Alligation", description: "Two/three component and successive replacement." },
          { code: "quant.arithmetic.partnership", name: "Partnership", description: "Capital-and-time profit-share problems." },
          { code: "quant.arithmetic.ages", name: "Problems on Ages", description: "Age ratios and linear-age equations." },
          { code: "quant.arithmetic.boat_stream", name: "Boats and Streams", description: "Upstream/downstream speed problems." },
        ],
      },
      { code: "quant.permutation_combination", name: "Permutation and Combination", description: "Counting, arrangements, selections — basic level for Prelims." },
      { code: "quant.probability", name: "Probability", description: "Single-event probability — coins, dice, cards, balls." },
      { code: "quant.mensuration", name: "Mensuration", description: "Area, perimeter, surface area, volume of 2D and 3D shapes." },
      { code: "quant.number_system", name: "Number System", description: "HCF/LCM, divisibility, factors, surds." },
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
          { code: "reason.puzzles.floor", name: "Floor / Flat Puzzle", description: "Multi-floor, multi-flat arrangements with several variables — high-difficulty in SBI PO." },
          { code: "reason.puzzles.scheduling", name: "Day / Month / Year Scheduling", description: "Assign persons to days, months, or years with multiple constraints." },
          { code: "reason.puzzles.box", name: "Box-based Puzzle", description: "Stacked boxes with size, colour, and content variables." },
          { code: "reason.puzzles.classification", name: "Classification Puzzle", description: "Group persons across categories like profession, city, hobby." },
          { code: "reason.puzzles.comparison", name: "Comparison Puzzle", description: "Order persons by age, weight, marks with chained inequalities." },
        ],
      },
      { code: "reason.seating_arrangement", name: "Seating Arrangement",
        subtopics: [
          { code: "reason.seating_arrangement.linear", name: "Linear Arrangement", description: "Single-row and double-row linear seating." },
          { code: "reason.seating_arrangement.circular", name: "Circular Arrangement", description: "Persons seated around a circular table facing centre/outside." },
          { code: "reason.seating_arrangement.square", name: "Square / Rectangular Arrangement", description: "Persons at corners and middles of a square or rectangle." },
          { code: "reason.seating_arrangement.triangular", name: "Triangular / Hexagonal Arrangement", description: "Persons seated at vertices of polygonal tables." },
        ],
      },
      { code: "reason.syllogism", name: "Syllogism", description: "Three-statement and reverse syllogism using all/some/no/only quantifiers." },
      { code: "reason.inequalities", name: "Inequalities", description: "Direct, coded, and implicit inequalities." },
      { code: "reason.coding_decoding", name: "Coding-Decoding", description: "New-pattern coding using sentence and symbolic logic." },
      { code: "reason.blood_relations", name: "Blood Relations", description: "Family tree and coded blood-relation problems." },
      { code: "reason.direction_distance", name: "Direction and Distance", description: "Compass-direction movement and shortest-path problems." },
      { code: "reason.order_ranking", name: "Order and Ranking", description: "Top/bottom and position-based ranking with conditions." },
      { code: "reason.alphanumeric_series", name: "Alphanumeric / Symbol Series", description: "Letter, number, and symbol series with operations." },
      { code: "reason.data_sufficiency", name: "Data Sufficiency", description: "Decide whether statements suffice to answer the question." },
      { code: "reason.input_output", name: "Machine Input-Output", description: "Step-by-step rearrangement following a hidden rule." },
      { code: "reason.statement_assumption", name: "Statement-Assumption / Conclusion", description: "Critical-reasoning style inference questions." },
      { code: "reason.alphabet_test", name: "Alphabet / Word Formation", description: "Letter-pair counting and word-formation from a given word." },
    ],
  },
];

export async function seedSbiPoSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "SBI_PO" } });
  if (!exam) {
    throw new Error("Run seedExams() first — SBI_PO exam not found.");
  }
  console.log(`Seeding SBI PO syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < sbiPoSyllabus.length; sIdx++) {
    const s = sbiPoSyllabus[sIdx];
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
  seedSbiPoSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
