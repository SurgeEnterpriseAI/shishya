// SSC GD Constable CBE — full syllabus tree.
// 4 sections × 20 questions × 2 marks = 160 marks in 60 minutes.
// Negative marking: 0.50 per wrong answer.
// Difficulty level: Matriculation (10th).
// Source: ssc.gov.in GD Constable notification (5 Sep 2024) + Careerpower/Adda247 cross-check.
//
// Run after seedExams: npx tsx seed/exams/ssc-gd-syllabus.ts

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

export const sscGdSyllabus: SubjectSeed[] = [
  // ── GENERAL INTELLIGENCE & REASONING ──────────────────────────────────
  {
    code: "REASONING",
    name: "General Intelligence and Reasoning",
    weight: 1,
    topics: [
      { code: "gd.reason.analogy", name: "Analogies", description: "Word, number and figural analogy pairs." },
      { code: "gd.reason.similarities_differences", name: "Similarities and Differences", description: "Identify common and odd elements between items." },
      { code: "gd.reason.spatial_visualization", name: "Spatial Visualization", description: "Mentally manipulate 2-D and 3-D shapes and patterns." },
      { code: "gd.reason.spatial_orientation", name: "Spatial Orientation", description: "Determine orientation of figures after rotation or movement." },
      { code: "gd.reason.visual_memory", name: "Visual Memory", description: "Recall and recognise figures shown briefly." },
      { code: "gd.reason.discrimination", name: "Discrimination", description: "Distinguish between closely similar figures or patterns." },
      { code: "gd.reason.observation", name: "Observation", description: "Notice and recall fine details in visual stimuli." },
      { code: "gd.reason.relationships", name: "Relationship Concepts", description: "Blood relations, family trees and pointing-style problems." },
      { code: "gd.reason.arithmetic_reasoning", name: "Arithmetical Reasoning", description: "Logical word problems involving simple arithmetic." },
      { code: "gd.reason.figural_classification", name: "Figural Classification", description: "Pick the odd figure or group similar figures." },
      { code: "gd.reason.arithmetic_series", name: "Arithmetic Number Series", description: "Find the next term in a numeric series." },
      { code: "gd.reason.non_verbal_series", name: "Non-Verbal Series", description: "Continue a figural pattern in a series." },
      { code: "gd.reason.coding_decoding", name: "Coding and Decoding", description: "Letter, number and symbol-based coding." },
      { code: "gd.reason.directions", name: "Direction and Distance", description: "Compass-based movement and final-direction problems." },
      { code: "gd.reason.ranking", name: "Order and Ranking", description: "Linear arrangement and rank from top/bottom." },
      { code: "gd.reason.venn", name: "Venn Diagrams", description: "Set relationships between two to three categories." },
      { code: "gd.reason.syllogism", name: "Syllogism", description: "Two-statement deductions using all/some/no quantifiers." },
    ],
  },

  // ── GENERAL KNOWLEDGE & GENERAL AWARENESS ─────────────────────────────
  {
    code: "GK",
    name: "General Knowledge and General Awareness",
    weight: 1,
    topics: [
      { code: "gd.gk.history", name: "History", description: "Ancient, medieval and modern Indian history; freedom struggle." },
      { code: "gd.gk.geography", name: "Geography", description: "Physical and political geography of India and neighbouring countries." },
      { code: "gd.gk.polity", name: "Indian Polity and Constitution", description: "Indian political system, governance and constitutional bodies." },
      { code: "gd.gk.economy", name: "Indian Economy", description: "Economic scene, banking, schemes and key economic indicators." },
      { code: "gd.gk.science", name: "General Science",
        subtopics: [
          { code: "gd.gk.science.physics", name: "Physics", description: "Mechanics, electricity, optics and basic physics concepts." },
          { code: "gd.gk.science.chemistry", name: "Chemistry", description: "Periodic table, acids, bases, salts and chemical reactions." },
          { code: "gd.gk.science.biology", name: "Biology", description: "Cells, human body, plants and common diseases." },
        ],
      },
      { code: "gd.gk.scientific_research", name: "Scientific Research", description: "ISRO, DRDO and major Indian scientific missions." },
      { code: "gd.gk.sports", name: "Sports", description: "Cups, trophies, players and recent national/international winners." },
      { code: "gd.gk.culture", name: "Culture", description: "Indian festivals, dances, music and monuments." },
      { code: "gd.gk.books_authors", name: "Books and Authors", description: "Notable books and their Indian/international authors." },
      { code: "gd.gk.awards", name: "Awards and Honours", description: "Padma awards, Bharat Ratna, gallantry awards and Nobel laureates." },
      { code: "gd.gk.current_affairs", name: "Current Affairs", description: "National and international events of the last 6–12 months." },
      { code: "gd.gk.static", name: "Static GK", description: "Important days, national symbols, capitals and currencies." },
    ],
  },

  // ── ELEMENTARY MATHEMATICS ────────────────────────────────────────────
  {
    code: "MATH",
    name: "Elementary Mathematics",
    weight: 1,
    topics: [
      { code: "gd.math.number_system", name: "Number System", description: "Whole numbers, integers, divisibility rules and place value." },
      { code: "gd.math.computation", name: "Computation of Whole Numbers", description: "Addition, subtraction, multiplication and division of whole numbers." },
      { code: "gd.math.decimals_fractions", name: "Decimals and Fractions", description: "Operations on and conversions between decimals and fractions." },
      { code: "gd.math.relationship_numbers", name: "Relationship Between Numbers", description: "Comparing, ordering and finding relations among numbers." },
      { code: "gd.math.fundamental_ops", name: "Fundamental Arithmetical Operations", description: "BODMAS, simplification and basic arithmetic." },
      { code: "gd.math.percentage", name: "Percentage", description: "Percentage conversion and applied percentage change problems." },
      { code: "gd.math.ratio_proportion", name: "Ratio and Proportion", description: "Compound ratio, partnership and proportion problems." },
      { code: "gd.math.average", name: "Average", description: "Mean of numbers, weighted averages and age-related averages." },
      { code: "gd.math.interest", name: "Interest", description: "Simple Interest and Compound Interest at matriculation level." },
      { code: "gd.math.profit_loss", name: "Profit and Loss", description: "CP/SP, marked price, discount and profit/loss percentage." },
      { code: "gd.math.discount", name: "Discount", description: "Single and successive discounts on marked price." },
      { code: "gd.math.mensuration", name: "Mensuration", description: "Areas, perimeters, surface areas and volumes of standard figures." },
      { code: "gd.math.time_distance", name: "Time and Distance", description: "Speed, average speed, trains, boats and streams." },
      { code: "gd.math.time_work", name: "Time and Work", description: "Work efficiency, joint work and pipes-and-cisterns." },
      { code: "gd.math.simplification", name: "Simplification", description: "BODMAS, surds, square and cube roots." },
    ],
  },

  // ── ENGLISH / HINDI ───────────────────────────────────────────────────
  {
    code: "LANG",
    name: "English / Hindi",
    weight: 1,
    topics: [
      { code: "gd.eng", name: "English Language",
        subtopics: [
          { code: "gd.eng.fill_blanks", name: "Fill in the Blanks", description: "Sentence completion using appropriate words." },
          { code: "gd.eng.error_spotting", name: "Error Spotting", description: "Identify the grammatical error in a sentence." },
          { code: "gd.eng.phrase_replacement", name: "Phrase Replacement", description: "Replace an underlined phrase with the best alternative." },
          { code: "gd.eng.synonyms_antonyms", name: "Synonyms and Antonyms", description: "Words closest and opposite in meaning." },
          { code: "gd.eng.cloze", name: "Cloze Test", description: "Fill multiple contextual blanks within a passage." },
          { code: "gd.eng.idioms", name: "Idioms and Phrases", description: "Meaning of common English idioms in context." },
          { code: "gd.eng.spellings", name: "Spellings", description: "Identify correctly or incorrectly spelt words." },
          { code: "gd.eng.one_word", name: "One Word Substitution", description: "Replace a phrase with a single appropriate word." },
          { code: "gd.eng.comprehension", name: "Reading Comprehension", description: "Passage-based questions on meaning and inference." },
        ],
      },
      { code: "gd.hin", name: "Hindi Language",
        subtopics: [
          { code: "gd.hin.sandhi", name: "Sandhi (संधि)", description: "Joining of two letters/words and basic sandhi rules." },
          { code: "gd.hin.upsarg_pratyay", name: "Upsarg / Pratyay (उपसर्ग व प्रत्यय)", description: "Prefixes and suffixes in Hindi word formation." },
          { code: "gd.hin.paryayvachi", name: "Paryayvachi (पर्यायवाची)", description: "Synonyms in Hindi." },
          { code: "gd.hin.viparitarthak", name: "Vilom / Viparitarthak (विलोम)", description: "Antonyms in Hindi." },
          { code: "gd.hin.muhavare", name: "Muhavare evam Lokoktiyan (मुहावरे और लोकोक्तियाँ)", description: "Hindi idioms and proverbs and their meanings." },
          { code: "gd.hin.samas", name: "Samas (समास)", description: "Compound words and types of Hindi samas." },
          { code: "gd.hin.vakya_shuddhi", name: "Vakya Shuddhi (वाक्य शुद्धि)", description: "Sentence correction and grammatical errors." },
          { code: "gd.hin.vyakaran", name: "Vyakaran (व्याकरण)", description: "Hindi grammar — gender, number, case, tense." },
          { code: "gd.hin.karyalayi", name: "Karyalayi Hindi (कार्यालयी हिंदी)", description: "Office correspondence terms and formal Hindi." },
        ],
      },
    ],
  },
];

export async function seedSscGdSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "SSC_GD" } });
  if (!exam) {
    throw new Error("Run seedExams() first — SSC_GD exam not found.");
  }
  console.log(`Seeding SSC GD syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < sscGdSyllabus.length; sIdx++) {
    const s = sscGdSyllabus[sIdx];
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
  seedSscGdSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
