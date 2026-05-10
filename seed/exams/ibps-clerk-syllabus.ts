// IBPS Clerk Prelims — full syllabus tree.
// 3 sections, 100 questions, 100 marks, 60 minutes (20 min/section).
// English (30Q/30M), Numerical Ability (35Q/35M), Reasoning Ability (35Q/35M).
// Scope: same topic-set as IBPS PO Prelims but slightly easier question difficulty
// (fewer mixed-DI sets, lighter puzzles, simpler arithmetic).
// Source: IBPS official notification (ibps.in) cross-checked with Adda247/Oliveboard.
//
// Run after seedExams: npx tsx seed/exams/ibps-clerk-syllabus.ts

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

export const ibpsClerkSyllabus: SubjectSeed[] = [
  // ── ENGLISH LANGUAGE ──────────────────────────────────────────────────
  {
    code: "ENGLISH",
    name: "English Language",
    weight: 1,
    topics: [
      { code: "eng.reading_comprehension", name: "Reading Comprehension", description: "Passage-based questions — easier passages than PO, focus on direct comprehension and vocabulary." },
      { code: "eng.cloze_test", name: "Cloze Test", description: "Fill blanks in a paragraph; single-fill format dominant at Clerk level." },
      { code: "eng.error_spotting", name: "Error Spotting", description: "Identify the part of a sentence with a grammatical error." },
      { code: "eng.sentence_improvement", name: "Sentence Improvement / Phrase Replacement", description: "Choose the best alternative for an underlined phrase." },
      { code: "eng.para_jumbles", name: "Para Jumbles", description: "Re-arrange 5–6 jumbled sentences into a coherent paragraph." },
      { code: "eng.fill_blanks", name: "Fill in the Blanks", description: "Single and double-blank sentence completion." },
      { code: "eng.sentence_rearrangement", name: "Sentence Rearrangement", description: "Re-order parts of one sentence into a meaningful order." },
      { code: "eng.synonyms_antonyms", name: "Synonyms and Antonyms", description: "Word-meaning questions, mostly within RC passages." },
      { code: "eng.spotting_errors_idioms", name: "Idioms, Phrases and Spelling", description: "Meaning of idioms; identify the correctly/incorrectly spelt word." },
      { code: "eng.word_usage", name: "Word Usage / One-word Substitution", description: "Choose the contextually correct word; replace a phrase with one word." },
    ],
  },

  // ── NUMERICAL ABILITY ─────────────────────────────────────────────────
  {
    code: "QUANT",
    name: "Numerical Ability",
    weight: 1,
    topics: [
      { code: "quant.simplification", name: "Simplification and Approximation", description: "BODMAS, fractions, decimals — highest-frequency Clerk topic (8–10 questions)." },
      { code: "quant.number_series", name: "Number Series", description: "Missing-term and wrong-term series at Clerk difficulty." },
      { code: "quant.quadratic_equations", name: "Quadratic Equations", description: "Compare two quadratic equations and decide x-y relation." },
      { code: "quant.data_interpretation", name: "Data Interpretation",
        subtopics: [
          { code: "quant.data_interpretation.tabular", name: "Tabular DI", description: "Direct calculation-based table interpretation." },
          { code: "quant.data_interpretation.bar", name: "Bar Graph DI", description: "Single-bar and double-bar charts." },
          { code: "quant.data_interpretation.pie", name: "Pie Chart DI", description: "Percentage and degree-based pie charts." },
          { code: "quant.data_interpretation.line", name: "Line Graph DI", description: "Trend-based line graph interpretation." },
        ],
      },
      { code: "quant.arithmetic", name: "Arithmetic",
        subtopics: [
          { code: "quant.arithmetic.percentage", name: "Percentage", description: "Basic percentage and percentage change." },
          { code: "quant.arithmetic.ratio_proportion", name: "Ratio and Proportion", description: "Simple compound ratio and proportion problems." },
          { code: "quant.arithmetic.average", name: "Average", description: "Average of numbers, ages, and scores." },
          { code: "quant.arithmetic.profit_loss", name: "Profit and Loss", description: "Direct CP/SP/MP and discount problems." },
          { code: "quant.arithmetic.si_ci", name: "Simple and Compound Interest", description: "SI and CI for 2–3 year periods." },
          { code: "quant.arithmetic.time_work", name: "Time and Work", description: "Work-efficiency and combined-work problems." },
          { code: "quant.arithmetic.time_speed_distance", name: "Time, Speed and Distance", description: "Trains, boats and streams at moderate difficulty." },
          { code: "quant.arithmetic.mixture", name: "Mixture and Alligation", description: "Two-component mixture problems." },
          { code: "quant.arithmetic.partnership", name: "Partnership", description: "Capital-and-time profit sharing." },
          { code: "quant.arithmetic.ages", name: "Problems on Ages", description: "Linear age relation problems." },
        ],
      },
      { code: "quant.permutation_combination", name: "Permutation and Combination", description: "Basic counting and arrangement problems." },
      { code: "quant.probability", name: "Probability", description: "Single-event probability with coins, dice, balls." },
      { code: "quant.mensuration", name: "Mensuration", description: "Area and volume of squares, rectangles, circles, cylinders." },
      { code: "quant.number_system", name: "Number System", description: "HCF/LCM, divisibility, factors and surds." },
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
          { code: "reason.puzzles.floor", name: "Floor Puzzle", description: "Arrange persons across floors — easier than PO, single-variable." },
          { code: "reason.puzzles.day_month", name: "Day / Month Scheduling", description: "Assign persons to days of the week or months." },
          { code: "reason.puzzles.box", name: "Box / Stack Puzzle", description: "Linear stack arrangement of boxes with simple constraints." },
        ],
      },
      { code: "reason.seating_arrangement", name: "Seating Arrangement",
        subtopics: [
          { code: "reason.seating_arrangement.linear", name: "Linear Arrangement", description: "Single-row seating, persons facing one direction." },
          { code: "reason.seating_arrangement.circular", name: "Circular Arrangement", description: "Persons seated around a round table." },
        ],
      },
      { code: "reason.syllogism", name: "Syllogism", description: "Two-statement deductions using all/some/no quantifiers." },
      { code: "reason.inequalities", name: "Inequalities", description: "Direct and coded inequalities between elements." },
      { code: "reason.coding_decoding", name: "Coding-Decoding", description: "Letter-shift, letter-number, and basic symbol coding." },
      { code: "reason.blood_relations", name: "Blood Relations", description: "Family-tree and pointing-style relation problems." },
      { code: "reason.direction_distance", name: "Direction and Distance", description: "Compass directions and shortest-distance problems." },
      { code: "reason.order_ranking", name: "Order and Ranking", description: "Position-based ranking from top, bottom, left, right." },
      { code: "reason.alphanumeric_series", name: "Alphanumeric / Number Series", description: "Letter, number, and symbol series." },
      { code: "reason.alphabet_test", name: "Alphabet Test", description: "Word-formation, letter pairs, and position questions." },
      { code: "reason.data_sufficiency", name: "Data Sufficiency", description: "Decide if statements are sufficient to answer." },
    ],
  },
];

export async function seedIbpsClerkSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "IBPS_CLERK" } });
  if (!exam) {
    throw new Error("Run seedExams() first — IBPS_CLERK exam not found.");
  }
  console.log(`Seeding IBPS Clerk syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < ibpsClerkSyllabus.length; sIdx++) {
    const s = ibpsClerkSyllabus[sIdx];
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
  seedIbpsClerkSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
