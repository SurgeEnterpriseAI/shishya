// SBI Clerk (Junior Associate) Prelims — full syllabus tree.
// 3 sections, 100 questions, 100 marks, 60 minutes (20 min/section).
// English (30Q/30M), Numerical Ability (35Q/35M), Reasoning Ability (35Q/35M).
// Source: SBI official notification (sbi.co.in/careers) cross-checked with
// Adda247/Oliveboard/Bankersadda. Difficulty is moderate — easier than SBI PO,
// comparable to IBPS Clerk but with more new-pattern English questions.
//
// Run after seedExams: npx tsx seed/exams/sbi-clerk-syllabus.ts

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

export const sbiClerkSyllabus: SubjectSeed[] = [
  // ── ENGLISH LANGUAGE ──────────────────────────────────────────────────
  {
    code: "ENGLISH",
    name: "English Language",
    weight: 1,
    topics: [
      { code: "eng.reading_comprehension", name: "Reading Comprehension", description: "Moderate-length passages with direct comprehension and basic inference questions." },
      { code: "eng.cloze_test", name: "Cloze Test", description: "Single-fill cloze passage at SBI Clerk level." },
      { code: "eng.error_spotting", name: "Error Spotting", description: "Identify the part of a sentence with a grammatical error." },
      { code: "eng.sentence_improvement", name: "Sentence Improvement / Phrase Replacement", description: "Replace an underlined phrase with the best alternative." },
      { code: "eng.para_jumbles", name: "Para Jumbles", description: "Re-arrange jumbled sentences into a coherent paragraph." },
      { code: "eng.sentence_rearrangement", name: "Sentence Rearrangement", description: "Reorder parts of a single sentence." },
      { code: "eng.fill_blanks", name: "Fill in the Blanks", description: "Single and double-blank vocabulary completion." },
      { code: "eng.word_swap", name: "Word Swap", description: "Identify two words to swap so the sentence becomes grammatically correct." },
      { code: "eng.synonyms_antonyms", name: "Synonyms and Antonyms", description: "Word-meaning questions usually within RC." },
      { code: "eng.idioms_phrases", name: "Idioms and Phrases", description: "Meaning of common English idioms in context." },
      { code: "eng.spelling", name: "Spelling Check", description: "Identify the correctly or incorrectly spelt word." },
    ],
  },

  // ── NUMERICAL ABILITY ─────────────────────────────────────────────────
  {
    code: "QUANT",
    name: "Numerical Ability",
    weight: 1,
    topics: [
      { code: "quant.simplification", name: "Simplification and Approximation", description: "BODMAS-based simplification — large-share topic in SBI Clerk Prelims." },
      { code: "quant.number_series", name: "Number Series", description: "Missing-term and wrong-term series at Clerk level." },
      { code: "quant.quadratic_equations", name: "Quadratic Equations", description: "Comparison of two quadratic equations." },
      { code: "quant.data_interpretation", name: "Data Interpretation",
        subtopics: [
          { code: "quant.data_interpretation.tabular", name: "Tabular DI", description: "Direct calculation-based table interpretation." },
          { code: "quant.data_interpretation.bar", name: "Bar Graph DI", description: "Single and double bar charts." },
          { code: "quant.data_interpretation.pie", name: "Pie Chart DI", description: "Percentage-based pie charts." },
          { code: "quant.data_interpretation.line", name: "Line Graph DI", description: "Trend-based line graph DI." },
          { code: "quant.data_interpretation.caselet", name: "Caselet DI", description: "Word-problem based DI sets." },
        ],
      },
      { code: "quant.arithmetic", name: "Arithmetic",
        subtopics: [
          { code: "quant.arithmetic.percentage", name: "Percentage", description: "Percentage change and applied percentage." },
          { code: "quant.arithmetic.ratio_proportion", name: "Ratio and Proportion", description: "Compound ratio and proportion problems." },
          { code: "quant.arithmetic.average", name: "Average", description: "Average of numbers, scores, ages." },
          { code: "quant.arithmetic.profit_loss", name: "Profit and Loss", description: "CP/SP/MP and discount problems." },
          { code: "quant.arithmetic.si_ci", name: "Simple and Compound Interest", description: "Two/three-year SI and CI problems." },
          { code: "quant.arithmetic.time_work", name: "Time and Work", description: "Work-efficiency and combined work." },
          { code: "quant.arithmetic.time_speed_distance", name: "Time, Speed and Distance", description: "Trains, boats and streams." },
          { code: "quant.arithmetic.mixture", name: "Mixture and Alligation", description: "Two-component mixture problems." },
          { code: "quant.arithmetic.partnership", name: "Partnership", description: "Profit-sharing based on capital-time." },
          { code: "quant.arithmetic.ages", name: "Problems on Ages", description: "Linear age relation problems." },
        ],
      },
      { code: "quant.permutation_combination", name: "Permutation and Combination", description: "Basic counting and arrangement problems." },
      { code: "quant.probability", name: "Probability", description: "Single-event probability with coins, dice, balls." },
      { code: "quant.mensuration", name: "Mensuration", description: "2D and basic 3D mensuration." },
      { code: "quant.number_system", name: "Number System", description: "HCF/LCM, divisibility, fractions and decimals." },
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
          { code: "reason.puzzles.floor", name: "Floor Puzzle", description: "Single-variable floor arrangement problems." },
          { code: "reason.puzzles.day_month", name: "Day / Month Scheduling", description: "Assign persons to days of the week or months." },
          { code: "reason.puzzles.box", name: "Box / Stack Puzzle", description: "Linear stack of boxes with simple constraints." },
          { code: "reason.puzzles.comparison", name: "Comparison Puzzle", description: "Compare ages, marks, heights using inequalities." },
        ],
      },
      { code: "reason.seating_arrangement", name: "Seating Arrangement",
        subtopics: [
          { code: "reason.seating_arrangement.linear", name: "Linear Arrangement", description: "Single-row seating with persons facing one direction." },
          { code: "reason.seating_arrangement.circular", name: "Circular Arrangement", description: "Persons seated around a round table." },
        ],
      },
      { code: "reason.syllogism", name: "Syllogism", description: "Two-statement deductions using all/some/no/only quantifiers." },
      { code: "reason.inequalities", name: "Inequalities", description: "Direct and coded inequalities." },
      { code: "reason.coding_decoding", name: "Coding-Decoding", description: "Letter, number, and symbol-based coding patterns." },
      { code: "reason.blood_relations", name: "Blood Relations", description: "Family tree and pointing-style problems." },
      { code: "reason.direction_distance", name: "Direction and Distance", description: "Compass-direction and shortest-distance problems." },
      { code: "reason.order_ranking", name: "Order and Ranking", description: "Position-based and rank-from-top/bottom problems." },
      { code: "reason.alphanumeric_series", name: "Alphanumeric / Number Series", description: "Letter, number, and symbol series." },
      { code: "reason.alphabet_test", name: "Alphabet Test / Word Formation", description: "Letter-pair counting and word formation." },
      { code: "reason.data_sufficiency", name: "Data Sufficiency", description: "Decide whether statements suffice to answer." },
    ],
  },
];

export async function seedSbiClerkSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "SBI_CLERK" } });
  if (!exam) {
    throw new Error("Run seedExams() first — SBI_CLERK exam not found.");
  }
  console.log(`Seeding SBI Clerk syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < sbiClerkSyllabus.length; sIdx++) {
    const s = sbiClerkSyllabus[sIdx];
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
  seedSbiClerkSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
