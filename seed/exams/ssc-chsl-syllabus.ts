// SSC CHSL Tier 1 — full syllabus tree.
// 4 sections × 25 questions × 2 marks = 200 marks in 60 minutes.
// Negative marking: 0.50 per wrong answer.
// Source: ssc.gov.in CHSL notification + Adda247/Careerpower cross-check.
//
// Run after seedExams: npx tsx seed/exams/ssc-chsl-syllabus.ts

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

export const sscChslSyllabus: SubjectSeed[] = [
  // ── GENERAL INTELLIGENCE & REASONING ──────────────────────────────────
  {
    code: "REASONING",
    name: "General Intelligence and Reasoning",
    weight: 1,
    topics: [
      { code: "reason.analogy", name: "Semantic & Figural Analogy", description: "Word, number, letter and figural analogy pairs." },
      { code: "reason.classification", name: "Classification", description: "Pick the odd word, number or figure from a group." },
      { code: "reason.series", name: "Series", description: "Number, alphabet, alphanumeric and figural series — find the next term." },
      { code: "reason.coding_decoding", name: "Coding-Decoding", description: "Letter shifting, number coding, conditional and matrix-based coding." },
      { code: "reason.matrix", name: "Matrix", description: "Identify a letter/number using row–column matrix coordinates." },
      { code: "reason.word_formation", name: "Word Formation", description: "Form a meaningful word using given letters or letters of another word." },
      { code: "reason.venn", name: "Venn Diagrams", description: "Set relationships between two to four overlapping categories." },
      { code: "reason.directions", name: "Direction and Distance", description: "Compass-based movement, shortest distance, final direction." },
      { code: "reason.blood_relations", name: "Blood Relations", description: "Family-tree, generation and pointing-style relationship problems." },
      { code: "reason.ranking", name: "Order and Ranking", description: "Linear arrangement, rank from top/bottom, age-based ranking." },
      { code: "reason.seating", name: "Seating Arrangement", description: "Linear, circular and square seating with direction-facing rules." },
      { code: "reason.puzzle", name: "Puzzles", description: "Box-based, floor-based and scheduling puzzles." },
      { code: "reason.syllogism", name: "Syllogism", description: "Two/three statement deductions using all/some/no quantifiers." },
      { code: "reason.statement_conclusion", name: "Statement and Conclusion", description: "Logical conclusion-drawing from a given statement." },
      { code: "reason.paper_folding", name: "Paper Folding and Cutting", description: "Visual problems on paper folded then cut and unfolded." },
      { code: "reason.mirror_water", name: "Mirror and Water Image", description: "Mirror image and water reflection of letters, numbers and figures." },
      { code: "reason.embedded", name: "Embedded Figures", description: "Identify a smaller figure hidden inside a complex one." },
      { code: "reason.figure_completion", name: "Figure Completion", description: "Choose the option that completes a missing part of a pattern." },
      { code: "reason.cubes_dice", name: "Cubes and Dice", description: "Cube colouring, opposite faces, dice probability problems." },
      { code: "reason.non_verbal", name: "Non-Verbal Reasoning", description: "Pattern completion, mirror images and figural series in pictures." },
    ],
  },

  // ── GENERAL AWARENESS ─────────────────────────────────────────────────
  {
    code: "GA",
    name: "General Awareness",
    weight: 1,
    topics: [
      { code: "ga.history", name: "History",
        subtopics: [
          { code: "ga.history.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Mauryan and Gupta empires." },
          { code: "ga.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals, Bhakti and Sufi movements." },
          { code: "ga.history.modern", name: "Modern India", description: "British rule, freedom struggle, post-1947 events." },
        ],
      },
      { code: "ga.geography", name: "Geography",
        subtopics: [
          { code: "ga.geography.india", name: "Indian Geography", description: "Physical features, climate, rivers, soils, agriculture." },
          { code: "ga.geography.world", name: "World Geography", description: "Continents, oceans, mountains, world economic geography." },
        ],
      },
      { code: "ga.polity", name: "Indian Polity", description: "Constitution, Fundamental Rights, Parliament, judiciary, Panchayati Raj." },
      { code: "ga.economy", name: "Indian Economy", description: "Banking, taxation, Union Budget, schemes, economic indicators." },
      { code: "ga.science", name: "General Science",
        subtopics: [
          { code: "ga.science.physics", name: "Physics", description: "Mechanics, electricity, optics, modern physics basics." },
          { code: "ga.science.chemistry", name: "Chemistry", description: "Periodic table, acids, bases, salts and organic basics." },
          { code: "ga.science.biology", name: "Biology", description: "Cells, human body systems, plant biology, common diseases." },
        ],
      },
      { code: "ga.current_affairs", name: "Current Affairs", description: "National and international events of the last 12 months." },
      { code: "ga.sports", name: "Sports", description: "Cups, trophies, players, recent winners and venues." },
      { code: "ga.books_authors", name: "Books and Authors", description: "Notable books and their Indian/international authors." },
      { code: "ga.awards", name: "Awards and Honours", description: "Padma awards, Bharat Ratna, Nobel, civilian and military honours." },
      { code: "ga.schemes", name: "Government Schemes", description: "Central and state flagship schemes and their target groups." },
      { code: "ga.appointments", name: "Appointments and People in News", description: "Recent appointments to key constitutional and corporate posts." },
      { code: "ga.static_gk", name: "Static GK", description: "Important days, dance forms, classical music, national symbols." },
      { code: "ga.culture", name: "Indian Culture", description: "Festivals, art forms, monuments and cultural heritage." },
    ],
  },

  // ── QUANTITATIVE APTITUDE ─────────────────────────────────────────────
  {
    code: "QUANT",
    name: "Quantitative Aptitude (Basic Arithmetic Skill)",
    weight: 1,
    topics: [
      { code: "quant.number_system", name: "Number System", description: "Divisibility, HCF/LCM, factors, fractions, decimals, surds." },
      { code: "quant.simplification", name: "Simplification", description: "BODMAS, fractions, square/cube roots, simplifying expressions." },
      { code: "quant.arithmetic", name: "Arithmetic",
        subtopics: [
          { code: "quant.arithmetic.percentage", name: "Percentage", description: "Percentage conversion and applied percentage change." },
          { code: "quant.arithmetic.profit_loss", name: "Profit, Loss and Discount", description: "CP/SP/MP, successive discounts, marked price." },
          { code: "quant.arithmetic.ratio_proportion", name: "Ratio and Proportion", description: "Compound ratio, partnership, mean proportion." },
          { code: "quant.arithmetic.average", name: "Average", description: "Mean, weighted average, age-based averages." },
          { code: "quant.arithmetic.si_ci", name: "Simple and Compound Interest", description: "SI, CI half-yearly/quarterly, instalments." },
          { code: "quant.arithmetic.time_work", name: "Time and Work", description: "Work efficiency, pipes and cisterns, joint work." },
          { code: "quant.arithmetic.time_speed", name: "Time, Speed and Distance", description: "Trains, boats and streams, relative and average speed." },
          { code: "quant.arithmetic.mixture", name: "Mixture and Allegation", description: "Two-component mixtures, replacement, allegation rule." },
          { code: "quant.arithmetic.ages", name: "Problems on Ages", description: "Past, present and future age-relation problems." },
        ],
      },
      { code: "quant.algebra", name: "Algebra", description: "Linear and quadratic equations, polynomial identities, factorisation." },
      { code: "quant.geometry", name: "Geometry", description: "Lines, angles, triangles, circles, congruence, similarity, tangents." },
      { code: "quant.mensuration", name: "Mensuration",
        subtopics: [
          { code: "quant.mensuration.2d", name: "2-D Mensuration", description: "Area and perimeter of triangles, quadrilaterals, circles." },
          { code: "quant.mensuration.3d", name: "3-D Mensuration", description: "Surface area and volume of cubes, cuboids, cylinders, cones, spheres." },
        ],
      },
      { code: "quant.trigonometry", name: "Trigonometry", description: "Trigonometric ratios, identities, heights and distances." },
      { code: "quant.data_interpretation", name: "Data Interpretation", description: "Tables, bar/pie/line graphs — calculation-based questions." },
    ],
  },

  // ── ENGLISH LANGUAGE ──────────────────────────────────────────────────
  {
    code: "ENGLISH",
    name: "English Language",
    weight: 1,
    topics: [
      { code: "eng.synonyms", name: "Synonyms", description: "Word meanings — closest in meaning." },
      { code: "eng.antonyms", name: "Antonyms", description: "Word meanings — opposite in meaning." },
      { code: "eng.spellings", name: "Spelling Correction", description: "Identify the correctly or incorrectly spelt word." },
      { code: "eng.idioms", name: "Idioms and Phrases", description: "Meaning of common English idioms in context." },
      { code: "eng.one_word", name: "One Word Substitution", description: "Replace a phrase with a single appropriate word." },
      { code: "eng.error_spotting", name: "Error Spotting", description: "Identify the part of a sentence with a grammatical error." },
      { code: "eng.sentence_correction", name: "Sentence Correction / Improvement", description: "Choose the best alternative for an underlined part." },
      { code: "eng.fill_blanks", name: "Fill in the Blanks", description: "Single and double-blank sentence completion." },
      { code: "eng.active_passive", name: "Active and Passive Voice", description: "Convert sentences between active and passive voices." },
      { code: "eng.narration", name: "Direct and Indirect Narration", description: "Convert direct ↔ indirect speech." },
      { code: "eng.cloze", name: "Cloze Test", description: "Fill multiple contextual blanks within a passage." },
      { code: "eng.comprehension", name: "Reading Comprehension", description: "Passage-based questions on main idea, vocabulary, inference." },
      { code: "eng.para_jumble", name: "Para Jumbles", description: "Reorder jumbled sentences into a coherent paragraph." },
    ],
  },
];

export async function seedSscChslSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "SSC_CHSL" } });
  if (!exam) {
    throw new Error("Run seedExams() first — SSC_CHSL exam not found.");
  }
  console.log(`Seeding SSC CHSL syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < sscChslSyllabus.length; sIdx++) {
    const s = sscChslSyllabus[sIdx];
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
  seedSscChslSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
