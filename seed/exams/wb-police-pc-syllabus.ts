// West Bengal Police Constable (WBP) — full syllabus tree.
// Prelims: ~100 MCQs in 1 hour, 100 marks (Mains: 85 Qs / 85 marks bilingual Bengali/Nepali).
// 1/4 negative marking. Sections: General Awareness & GK (25), Elementary Math (25),
//                                 Reasoning & Logical Analysis (25), English (10) + Bengali.
// Source: prb.wb.gov.in / WBPRB notification + Oliveboard / Testbook cross-check.
//
// Run after seedExams: npx tsx seed/exams/wb-police-pc-syllabus.ts

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

export const wbPolicePcSyllabus: SubjectSeed[] = [
  // ── GENERAL AWARENESS & GENERAL KNOWLEDGE ──────────────────────────────
  {
    code: "GK",
    name: "General Awareness & General Knowledge",
    weight: 0.3,
    topics: [
      { code: "gk.history_india", name: "Indian History", description: "Ancient, medieval and modern Indian history." },
      { code: "gk.freedom_struggle", name: "Indian Freedom Struggle", description: "1857, INC, Gandhian movements, partition." },
      { code: "gk.geography_india", name: "Indian Geography", description: "Physical, economic and political geography." },
      { code: "gk.polity", name: "Indian Polity & Constitution", description: "Constitution, Parliament and judiciary basics." },
      { code: "gk.economy", name: "Indian Economy", description: "Plans, banking, GDP and budget." },
      { code: "gk.science", name: "General Science", description: "Physics, chemistry and biology fundamentals." },
      { code: "gk.tech", name: "Science & Technology", description: "Space, defence, IT and biotech." },
      { code: "gk.sports", name: "Sports", description: "National and international sports events and players." },
      { code: "gk.awards", name: "Awards & Honours", description: "Padma, Nobel and recent honours." },
      { code: "gk.inventions", name: "Inventions & Discoveries", description: "Major scientific inventions and discoverers." },
      { code: "gk.current_affairs", name: "Current Affairs", description: "National and international events of last 12-18 months." },
      { code: "gk.culture_india", name: "Indian Culture", description: "Art, architecture, music, dance and festivals of India." },
      { code: "gk.environment", name: "Environment & Ecology", description: "Climate change, biodiversity and conservation." },
      { code: "gk.wb_history", name: "West Bengal History", description: "Bengal Sultanate, Bengal Renaissance, Bengal in colonial era." },
      { code: "gk.wb_freedom", name: "Bengal in Freedom Struggle", description: "Subhas Bose, Aurobindo, Khudiram, Bagha Jatin and Bengal revolutionaries." },
      { code: "gk.wb_geography", name: "West Bengal Geography", description: "Districts, rivers (Hooghly, Teesta), Sundarbans, climate of WB." },
      { code: "gk.wb_polity", name: "WB Polity & Schemes", description: "State administration and welfare schemes — Kanyashree, Lakshmir Bhandar." },
      { code: "gk.wb_culture", name: "West Bengal Culture", description: "Durga Puja, Rabindra Sangeet, Baul, Tagore and Bengali literature." },
      { code: "gk.wb_personalities", name: "Famous Bengal Personalities", description: "Tagore, Vivekananda, Ramakrishna, Vidyasagar, Satyajit Ray." },
    ],
  },

  // ── ELEMENTARY MATHEMATICS ─────────────────────────────────────────────
  {
    code: "MATH",
    name: "Elementary Mathematics",
    weight: 0.3,
    topics: [
      { code: "math.number_system", name: "Number System", description: "Number properties and divisibility." },
      { code: "math.decimals_fractions", name: "Decimals & Fractions", description: "Operations on decimals and fractions." },
      { code: "math.simplification", name: "Simplification", description: "BODMAS and surds." },
      { code: "math.percentage", name: "Percentage", description: "Percentage applications." },
      { code: "math.profit_loss", name: "Profit & Loss", description: "CP, SP, MP and discount." },
      { code: "math.ratio_proportion", name: "Ratio & Proportion", description: "Compound ratio and partnership." },
      { code: "math.average", name: "Average", description: "Mean and weighted average." },
      { code: "math.interest", name: "Simple & Compound Interest", description: "SI, CI and applied interest problems." },
      { code: "math.time_work", name: "Time & Work", description: "Work efficiency and pipes/cisterns." },
      { code: "math.time_distance", name: "Time & Distance", description: "Speed, trains, boats and streams." },
      { code: "math.mensuration", name: "Mensuration", description: "Area, perimeter and volume — polygons, circles." },
      { code: "math.linear_equations", name: "Linear Equations", description: "One-variable and simultaneous linear equations." },
      { code: "math.quadratic_equations", name: "Quadratic Equations", description: "Roots, factorisation and applications." },
      { code: "math.identities", name: "Mathematical Identities", description: "Algebraic identities and applications." },
      { code: "math.square_root", name: "Square Root", description: "Square roots of numbers and decimals." },
      { code: "math.trigonometry", name: "Trigonometry", description: "Trig ratios and basic identities." },
      { code: "math.tables_graphs", name: "Tables & Graphs", description: "Interpretation of tables, bar charts and pie charts." },
    ],
  },

  // ── REASONING & LOGICAL ANALYSIS ───────────────────────────────────────
  {
    code: "REASONING",
    name: "Reasoning & Logical Analysis",
    weight: 0.3,
    topics: [
      { code: "reason.statement_conclusion", name: "Statements & Conclusions", description: "Inference and assumption analysis." },
      { code: "reason.directions", name: "Directions & Networks", description: "Cardinal directions and route networks." },
      { code: "reason.similarity_diff", name: "Similarities & Differences", description: "Comparing words, numbers and figures." },
      { code: "reason.semantic_analogy", name: "Semantic Analogy", description: "Word and meaning analogies." },
      { code: "reason.relationship", name: "Relationship Concepts", description: "Logical relationships between entities." },
      { code: "reason.ordering_sequencing", name: "Ordering & Sequencing", description: "Ranking, age and seating arrangement." },
      { code: "reason.spatial_visualization", name: "Spatial Visualization", description: "3-D rotation and visualisation." },
      { code: "reason.coding", name: "Coding & Decoding", description: "Letter, number and symbol coding patterns." },
      { code: "reason.classification", name: "Classification", description: "Odd one out across categories." },
      { code: "reason.embedded_figures", name: "Embedded Figures", description: "Hidden figure detection in larger patterns." },
      { code: "reason.series", name: "Series", description: "Letter, number and figural series — next/missing term." },
      { code: "reason.blood_relation", name: "Blood Relations", description: "Family-tree puzzles." },
      { code: "reason.syllogism", name: "Syllogism", description: "Logical conclusions from premises." },
      { code: "reason.venn", name: "Venn Diagrams", description: "Set relationships visualised." },
      { code: "reason.puzzles", name: "Puzzles", description: "Seating, ordering and grouping puzzles." },
    ],
  },

  // ── ENGLISH / BENGALI / HINDI LANGUAGE ─────────────────────────────────
  {
    code: "LANG",
    name: "English / Bengali / Hindi Language",
    weight: 0.1,
    topics: [
      { code: "english.vocabulary", name: "English Vocabulary", description: "Word meanings, synonyms and antonyms." },
      { code: "english.grammar", name: "English Grammar", description: "Tenses, articles, prepositions, voice and narration." },
      { code: "english.sentence_structure", name: "Sentence Structure", description: "Sentence correction and rearrangement." },
      { code: "english.idioms", name: "Idioms & Phrases", description: "English idioms and expressions in context." },
      { code: "english.comprehension", name: "Reading Comprehension", description: "Unseen English passage and questions." },
      { code: "bengali.grammar", name: "Bengali Grammar", description: "Bengali parts of speech, sandhi and samas basics." },
      { code: "bengali.synonyms_antonyms", name: "Bengali Synonyms & Antonyms", description: "Common Bengali word meanings and opposites." },
      { code: "bengali.idioms", name: "Bengali Idioms & Proverbs", description: "Common Bengali idiomatic expressions." },
      { code: "bengali.literature", name: "Bengali Literature", description: "Tagore, Sarat Chandra, Bankim Chandra and modern Bengali writers." },
      { code: "bengali.comprehension", name: "Bengali Comprehension", description: "Unseen Bengali passage with questions." },
      { code: "hindi.basics", name: "Hindi Basics", description: "Basic Hindi grammar, synonyms, antonyms and comprehension." },
    ],
  },
];

export async function seedWbPolicePcSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "WB_POLICE_PC" } });
  if (!exam) {
    throw new Error("Run seedExams() first — WB_POLICE_PC exam not found.");
  }
  console.log(`Seeding West Bengal Police Constable syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < wbPolicePcSyllabus.length; sIdx++) {
    const s = wbPolicePcSyllabus[sIdx];
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
  seedWbPolicePcSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
