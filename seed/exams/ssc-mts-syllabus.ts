// SSC MTS Paper 1 — full syllabus tree.
// CBE conducted in two sessions:
//   Session 1 (45 min, no negative marking):
//     Numerical & Mathematical Ability (20 Qs × 3 marks = 60)
//     Reasoning Ability & Problem Solving (20 Qs × 3 marks = 60)
//   Session 2 (45 min, −1 per wrong answer):
//     General Awareness (25 Qs × 3 marks = 75)
//     English Language & Comprehension (25 Qs × 3 marks = 75)
// Source: ssc.gov.in MTS notification + Adda247 cross-check.
//
// Run after seedExams: npx tsx seed/exams/ssc-mts-syllabus.ts

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

export const sscMtsSyllabus: SubjectSeed[] = [
  // ── NUMERICAL & MATHEMATICAL ABILITY (Session 1) ──────────────────────
  {
    code: "QUANT",
    name: "Numerical and Mathematical Ability",
    weight: 1,
    topics: [
      { code: "mts.quant.number_system", name: "Number System", description: "Integers, fractions, divisibility rules and basic number properties." },
      { code: "mts.quant.hcf_lcm", name: "HCF and LCM", description: "HCF/LCM of numbers, fractions and decimals; word problems." },
      { code: "mts.quant.simplification", name: "Simplification", description: "BODMAS rule, simplification of fractions, surds and exponents." },
      { code: "mts.quant.percentage", name: "Percentage", description: "Percentage conversion, percentage change and applied problems." },
      { code: "mts.quant.average", name: "Average", description: "Average of numbers, weighted averages and age-related averages." },
      { code: "mts.quant.ratio_proportion", name: "Ratio and Proportion", description: "Compound ratio, partnership and proportion-based problems." },
      { code: "mts.quant.profit_loss", name: "Profit and Loss", description: "Cost price, selling price, marked price, discount and profit %." },
      { code: "mts.quant.mixture", name: "Mixture and Allegation", description: "Two-component mixtures, replacement and allegation rule." },
      { code: "mts.quant.time_work", name: "Time and Work", description: "Work efficiency, pipes and cisterns, joint work." },
      { code: "mts.quant.time_speed", name: "Time, Speed and Distance", description: "Trains, boats and streams, relative and average speed." },
      { code: "mts.quant.si_ci", name: "Simple and Compound Interest", description: "SI, CI annual/half-yearly compounding, instalments." },
      { code: "mts.quant.algebra", name: "Algebra", description: "Linear and basic quadratic equations, algebraic identities." },
      { code: "mts.quant.geometry", name: "Geometry", description: "Lines, angles, triangles and circles — basic theorems." },
      { code: "mts.quant.mensuration", name: "Mensuration", description: "Area and perimeter of 2-D figures; surface area and volume of 3-D solids." },
      { code: "mts.quant.trigonometry", name: "Trigonometry", description: "Trigonometric ratios and basic identities." },
      { code: "mts.quant.di", name: "Data Interpretation", description: "Tables, bar graphs, pie charts — calculation-based questions." },
    ],
  },

  // ── REASONING ABILITY & PROBLEM SOLVING (Session 1) ───────────────────
  {
    code: "REASONING",
    name: "Reasoning Ability and Problem Solving",
    weight: 1,
    topics: [
      { code: "mts.reason.series", name: "Number and Alphabet Series", description: "Numerical, alphabetical and alphanumeric series." },
      { code: "mts.reason.coding_decoding", name: "Coding-Decoding", description: "Letter, number and conditional coding patterns." },
      { code: "mts.reason.analogy", name: "Analogy", description: "Word, number and figural analogy pairs." },
      { code: "mts.reason.odd_one_out", name: "Odd One Out", description: "Classification — find the dissimilar item in a group." },
      { code: "mts.reason.syllogism", name: "Syllogism", description: "Logical deductions from given statements." },
      { code: "mts.reason.directions", name: "Direction Sense", description: "Compass-based movement and shortest-distance problems." },
      { code: "mts.reason.ranking", name: "Ranking and Order", description: "Linear arrangement, ranks from top/bottom." },
      { code: "mts.reason.blood_relations", name: "Blood Relations", description: "Family-tree and pointing-style relationship problems." },
      { code: "mts.reason.matrix", name: "Matrix-based Coding", description: "Matrix-grid alphabet/number coding." },
      { code: "mts.reason.math_calculations", name: "Mathematical Operations", description: "Symbol substitution, balancing equations." },
      { code: "mts.reason.dictionary", name: "Word Order in Dictionary", description: "Arrange given words in dictionary/alphabetical order." },
      { code: "mts.reason.non_verbal",
        name: "Non-Verbal Reasoning",
        subtopics: [
          { code: "mts.reason.non_verbal.paper_folding", name: "Paper Folding and Cutting", description: "Visual problems on folded then cut paper." },
          { code: "mts.reason.non_verbal.mirror_image", name: "Mirror Image", description: "Mirror reflection of letters, numbers and figures." },
          { code: "mts.reason.non_verbal.embedded", name: "Embedded / Completing the Image", description: "Identify a hidden figure or complete a pattern." },
          { code: "mts.reason.non_verbal.counting_figures", name: "Counting Figures", description: "Count triangles, squares or rectangles in a complex figure." },
        ],
      },
    ],
  },

  // ── GENERAL AWARENESS (Session 2) ─────────────────────────────────────
  {
    code: "GA",
    name: "General Awareness",
    weight: 1,
    topics: [
      { code: "mts.ga.history", name: "Indian History and Culture", description: "Ancient, medieval and modern India; cultural heritage." },
      { code: "mts.ga.polity", name: "Indian Polity and Constitution", description: "Constitution, Fundamental Rights, Parliament and judiciary." },
      { code: "mts.ga.economy", name: "Indian Economy", description: "Banking, taxation, Union Budget, schemes and economic indicators." },
      { code: "mts.ga.geography", name: "Geography", description: "Indian and world physical and economic geography." },
      { code: "mts.ga.science", name: "Science: Inventions and Discoveries", description: "Major inventions, discoveries and scientists." },
      { code: "mts.ga.financial", name: "Financial Awareness", description: "RBI, banks, financial schemes and basic banking terms." },
      { code: "mts.ga.awards", name: "Awards and Honours", description: "Padma awards, Bharat Ratna, Nobel and other honours." },
      { code: "mts.ga.books", name: "Award-Winning Books", description: "Major literary award-winning books and their authors." },
      { code: "mts.ga.current_affairs", name: "Current Affairs", description: "National and international events of the last 12 months." },
      { code: "mts.ga.sports", name: "Sports", description: "Cups, trophies, players, recent winners and venues." },
      { code: "mts.ga.static_gk", name: "Static GK", description: "Important days, dances, music, national symbols." },
    ],
  },

  // ── ENGLISH LANGUAGE & COMPREHENSION (Session 2) ──────────────────────
  {
    code: "ENGLISH",
    name: "English Language and Comprehension",
    weight: 1,
    topics: [
      { code: "mts.eng.error_spotting", name: "Spot the Error", description: "Identify the part of a sentence with a grammatical error." },
      { code: "mts.eng.fill_blanks", name: "Fill in the Blanks", description: "Single and double-blank sentence completion." },
      { code: "mts.eng.synonyms", name: "Synonyms", description: "Word meanings — closest in meaning." },
      { code: "mts.eng.antonyms", name: "Antonyms", description: "Word meanings — opposite in meaning." },
      { code: "mts.eng.spellings", name: "Spelling / Misspelt Words", description: "Identify correctly or incorrectly spelt words." },
      { code: "mts.eng.idioms", name: "Idioms and Phrases", description: "Meaning of common English idioms in context." },
      { code: "mts.eng.one_word", name: "One Word Substitution", description: "Replace a phrase with a single appropriate word." },
      { code: "mts.eng.sentence_improvement", name: "Sentence Improvement", description: "Choose the best alternative for an underlined part." },
      { code: "mts.eng.comprehension", name: "Reading Comprehension", description: "Passage-based questions on main idea, vocabulary, inference." },
    ],
  },
];

export async function seedSscMtsSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "SSC_MTS" } });
  if (!exam) {
    throw new Error("Run seedExams() first — SSC_MTS exam not found.");
  }
  console.log(`Seeding SSC MTS syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < sscMtsSyllabus.length; sIdx++) {
    const s = sscMtsSyllabus[sIdx];
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
  seedSscMtsSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
