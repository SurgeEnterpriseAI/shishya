// SSC CGL Tier 1 — full syllabus tree.
// 4 sections × 25 questions × 2 marks = 200 marks in 60 minutes.
//
// Run after seedExams: npx tsx seed/exams/ssc-cgl-syllabus.ts

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

export const sscCglSyllabus: SubjectSeed[] = [
  // ── REASONING ─────────────────────────────────────────────────────────
  {
    code: "REASONING",
    name: "General Intelligence and Reasoning",
    weight: 1,
    topics: [
      { code: "reason.analogy", name: "Analogy", description: "Verbal and figural analogy: word-pair, number-pair, letter-pair, figure-pair." },
      { code: "reason.classification", name: "Classification (Odd one out)", description: "Find the odd word/number/figure in a group." },
      { code: "reason.series", name: "Series", description: "Number, letter, alphanumeric, and figural series — find next term." },
      { code: "reason.coding", name: "Coding-Decoding", description: "Letter-letter, letter-number, and conditional coding patterns." },
      { code: "reason.ranking", name: "Ranking and Order", description: "Linear arrangement, ranks from top/bottom, age-based ranking." },
      { code: "reason.directions", name: "Directions and Distances", description: "Compass-based movement, shortest distance, final direction." },
      { code: "reason.blood_relations", name: "Blood Relations", description: "Family tree, generation-based and pointing-style problems." },
      { code: "reason.syllogism", name: "Syllogism", description: "Two/three statement deductions using all/some/no quantifiers." },
      { code: "reason.statement_conclusion", name: "Statement and Conclusion", description: "Logical conclusion-drawing from a given statement." },
      { code: "reason.venn", name: "Venn Diagrams", description: "Set relationships between 2–4 categories." },
      { code: "reason.cubes_dice", name: "Cubes and Dice", description: "Cube colouring, opposite faces, dice problems." },
      { code: "reason.paper_cutting", name: "Paper Folding and Cutting", description: "Visual problems on folded paper unfolded." },
      { code: "reason.mirror_water", name: "Mirror and Water Image", description: "Mirror image and water reflection of letters/figures." },
      { code: "reason.embedded_figures", name: "Embedded Figures", description: "Identify a smaller figure hidden in a complex one." },
      { code: "reason.figure_completion", name: "Figure Completion", description: "Complete missing parts of a pattern." },
      { code: "reason.matrix", name: "Matrix-based Coding", description: "Matrix-grid alphabet/number coding." },
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
          { code: "ga.history.ancient", name: "Ancient India", description: "Indus Valley to Gupta period." },
          { code: "ga.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals, Bhakti and Sufi movements." },
          { code: "ga.history.modern", name: "Modern India", description: "British rule, freedom struggle, post-independence." },
        ],
      },
      { code: "ga.geography", name: "Geography",
        subtopics: [
          { code: "ga.geography.india", name: "Indian Geography", description: "Physical, political, climate, rivers, agriculture." },
          { code: "ga.geography.world", name: "World Geography", description: "Continents, oceans, mountains, world economic geography." },
        ],
      },
      { code: "ga.polity", name: "Indian Polity", description: "Constitution, Fundamental Rights, Parliament, judiciary, panchayati raj." },
      { code: "ga.economy", name: "Indian Economy", description: "Five Year Plans, banking, taxation, budget, economic indicators." },
      { code: "ga.science", name: "General Science",
        subtopics: [
          { code: "ga.science.physics", name: "Physics", description: "Mechanics, electricity, optics, modern physics basics." },
          { code: "ga.science.chemistry", name: "Chemistry", description: "Periodic table, acids/bases, organic basics." },
          { code: "ga.science.biology", name: "Biology", description: "Cells, human body, plant biology, diseases." },
        ],
      },
      { code: "ga.current_affairs", name: "Current Affairs", description: "National, international, awards, sports, books, appointments — last 12 months." },
      { code: "ga.static_gk", name: "Static GK", description: "Important days, dance forms, classical music, national symbols." },
      { code: "ga.computer", name: "Computer Awareness", description: "Hardware, software, internet, MS Office basics, abbreviations." },
    ],
  },

  // ── QUANTITATIVE APTITUDE ─────────────────────────────────────────────
  {
    code: "QUANT",
    name: "Quantitative Aptitude",
    weight: 1,
    topics: [
      { code: "quant.number_system", name: "Number System", description: "Divisibility, HCF/LCM, factors, fractions, decimals, surds." },
      { code: "quant.simplification", name: "Simplification", description: "BODMAS, fractions, square/cube roots, simplifying expressions." },
      { code: "quant.percentage", name: "Percentage", description: "Percentage conversion, percentage change, applied percentage." },
      { code: "quant.profit_loss", name: "Profit, Loss and Discount", description: "CP/SP/MP, successive discounts, marked price, profit %." },
      { code: "quant.ratio_proportion", name: "Ratio and Proportion", description: "Compound ratio, partnership, mixture/alligation links." },
      { code: "quant.average", name: "Average", description: "Average of numbers, weighted average, age-related averages." },
      { code: "quant.si_ci", name: "Simple and Compound Interest", description: "SI, CI, half-yearly/quarterly compounding, installments." },
      { code: "quant.time_work", name: "Time and Work", description: "Work efficiency, pipes and cisterns, work done together." },
      { code: "quant.time_speed_distance", name: "Time, Speed and Distance", description: "Trains, boats and streams, relative speed, average speed." },
      { code: "quant.mixture", name: "Mixture and Alligation", description: "Two-component mixtures, replacement problems, alligation rule." },
      { code: "quant.algebra", name: "Algebra", description: "Linear equations, quadratic equations, polynomial identities." },
      { code: "quant.mensuration_2d", name: "Mensuration — 2D", description: "Triangles, quadrilaterals, circles — area and perimeter." },
      { code: "quant.mensuration_3d", name: "Mensuration — 3D", description: "Cube, cuboid, cylinder, cone, sphere, hemisphere — surface area and volume." },
      { code: "quant.geometry", name: "Geometry", description: "Lines, angles, triangles, circles, congruence, similarity." },
      { code: "quant.trigonometry", name: "Trigonometry", description: "Trigonometric ratios, identities, heights and distances." },
      { code: "quant.data_interpretation", name: "Data Interpretation", description: "Tables, bar/pie/line graphs — calculation-based questions." },
    ],
  },

  // ── ENGLISH COMPREHENSION ─────────────────────────────────────────────
  {
    code: "ENGLISH",
    name: "English Comprehension",
    weight: 1,
    topics: [
      { code: "eng.synonyms", name: "Synonyms", description: "Word meanings — closest in meaning." },
      { code: "eng.antonyms", name: "Antonyms", description: "Word meanings — opposite in meaning." },
      { code: "eng.spellings", name: "Spelling Correction", description: "Identify the correctly/incorrectly spelt word." },
      { code: "eng.idioms", name: "Idioms and Phrases", description: "Meaning of common English idioms." },
      { code: "eng.one_word", name: "One Word Substitution", description: "Replace a phrase with a single appropriate word." },
      { code: "eng.error_spotting", name: "Error Spotting", description: "Identify the part of a sentence with a grammatical error." },
      { code: "eng.sentence_improvement", name: "Sentence Improvement", description: "Choose the best alternative for an underlined part." },
      { code: "eng.fill_blanks", name: "Fill in the Blanks", description: "Single and double-blank sentence completion." },
      { code: "eng.active_passive", name: "Active and Passive Voice", description: "Convert sentences between voices." },
      { code: "eng.direct_indirect", name: "Direct and Indirect Speech", description: "Convert direct ↔ indirect narration." },
      { code: "eng.cloze", name: "Cloze Test", description: "Fill multiple blanks within a passage." },
      { code: "eng.comprehension", name: "Reading Comprehension", description: "Passage-based questions on main idea, vocab, inference." },
      { code: "eng.para_jumble", name: "Para Jumbles", description: "Reorder jumbled sentences into a coherent paragraph." },
    ],
  },
];

export async function seedSscCglSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "SSC_CGL" } });
  if (!exam) {
    throw new Error("Run seedExams() first — SSC_CGL exam not found.");
  }
  console.log(`Seeding SSC CGL syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < sscCglSyllabus.length; sIdx++) {
    const s = sscCglSyllabus[sIdx];
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
  seedSscCglSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
