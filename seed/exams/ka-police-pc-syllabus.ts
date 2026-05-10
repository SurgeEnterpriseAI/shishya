// Karnataka Police Constable (KSP Civil/Armed PC) — full syllabus tree.
// 100 MCQs in 90 minutes (some posts 150 marks). Bilingual Kannada/English.
// 0.25 negative marking. Sections: General Knowledge, Mental Ability/Reasoning,
//                                   Mathematics, Kannada Language.
// Source: ksp.karnataka.gov.in recruitment notification + Oliveboard / Testbook cross-check.
//
// Run after seedExams: npx tsx seed/exams/ka-police-pc-syllabus.ts

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

export const kaPolicePcSyllabus: SubjectSeed[] = [
  // ── GENERAL KNOWLEDGE ──────────────────────────────────────────────────
  {
    code: "GK",
    name: "General Knowledge",
    weight: 0.4,
    topics: [
      { code: "gk.history_india", name: "Indian History", description: "Ancient, medieval and modern Indian history with major dynasties." },
      { code: "gk.freedom_struggle", name: "Indian National Movement", description: "1857 revolt, INC, Gandhian and revolutionary phase." },
      { code: "gk.geography_india", name: "Indian Geography", description: "Physical, economic and political geography of India." },
      { code: "gk.geography_world", name: "World Geography", description: "Continents, oceans, climate and major countries." },
      { code: "gk.polity", name: "Indian Polity & Constitution", description: "Constitution, Parliament, judiciary, FRs and DPSPs." },
      { code: "gk.economy", name: "Indian Economy", description: "Plans, banking, GDP, inflation and budget." },
      { code: "gk.science", name: "General Science", description: "Physics, chemistry, biology and applications." },
      { code: "gk.tech", name: "Science & Technology", description: "Space, defence, IT, biotech and recent innovations." },
      { code: "gk.sports", name: "Sports", description: "National and international sports events and players." },
      { code: "gk.awards", name: "Awards & Honours", description: "Padma, Nobel, gallantry and recent honours." },
      { code: "gk.current_affairs", name: "Current Affairs", description: "National and international events of last 12-18 months." },
      { code: "gk.computer", name: "Computer Knowledge", description: "Hardware, software, MS Office and internet basics." },
      { code: "gk.environment", name: "Environment & Ecology", description: "Climate change, biodiversity and conservation." },
      { code: "gk.culture", name: "Indian Cultural Heritage", description: "Art, architecture, music, dance and festivals of India." },
      { code: "gk.moral_education", name: "Moral & Civic Education", description: "Civic values, ethics and citizenship duties." },
      { code: "gk.ka_history", name: "Karnataka History", description: "Kadambas, Chalukyas, Hoysalas, Vijayanagar, Mysore Wodeyars and Tipu Sultan." },
      { code: "gk.ka_freedom", name: "Karnataka & Freedom Struggle", description: "Karnataka's role in independence movement and unification." },
      { code: "gk.ka_unification", name: "Karnataka Unification", description: "Ekikarana movement, formation of Karnataka state in 1956." },
      { code: "gk.ka_geography", name: "Karnataka Geography", description: "Districts, rivers, Western Ghats, climate and crops of Karnataka." },
      { code: "gk.ka_polity", name: "Karnataka Polity & Governance", description: "State administration, schemes and welfare programmes." },
      { code: "gk.ka_culture", name: "Karnataka Culture & Festivals", description: "Yakshagana, Dollu Kunitha, Dasara, Karaga and Kannada literature." },
      { code: "gk.ka_personalities", name: "Karnataka Personalities", description: "Basavanna, Kuvempu, Kannada Jnanpith awardees, sports figures." },
    ],
  },

  // ── MENTAL ABILITY / REASONING ─────────────────────────────────────────
  {
    code: "REASONING",
    name: "Mental Ability & Reasoning",
    weight: 0.25,
    topics: [
      { code: "reason.analogy", name: "Analogies", description: "Word, number and figural analogies." },
      { code: "reason.classification", name: "Classification", description: "Odd one out across categories." },
      { code: "reason.series", name: "Series", description: "Letter, number and figural series — next/missing term." },
      { code: "reason.coding", name: "Coding-Decoding", description: "Letter/number/symbol coding patterns." },
      { code: "reason.blood_relation", name: "Blood Relations", description: "Family-tree puzzles." },
      { code: "reason.direction", name: "Direction Sense", description: "Cardinal directions and final-position problems." },
      { code: "reason.ranking", name: "Ranking & Order", description: "Top/bottom rank, age and seating order." },
      { code: "reason.venn", name: "Venn Diagrams", description: "Set relationships visualised through Venn diagrams." },
      { code: "reason.syllogism", name: "Syllogism", description: "Logical conclusions from premises." },
      { code: "reason.spatial", name: "Spatial Visualization & Orientation", description: "3-D rotation, mirror image and spatial relations." },
      { code: "reason.figure_classification", name: "Figural Classification", description: "Odd figure out and visual pattern matching." },
      { code: "reason.non_verbal_series", name: "Non-Verbal Series", description: "Figural series and pattern continuation." },
      { code: "reason.visual_memory", name: "Visual Memory & Discrimination", description: "Recall and differentiation of visual stimuli." },
      { code: "reason.observation", name: "Observation", description: "Counting figures and detail observation." },
      { code: "reason.arithmetic_reasoning", name: "Arithmetical Reasoning", description: "Reasoning involving arithmetic operations and word problems." },
      { code: "reason.relationship", name: "Relationship Concepts", description: "Logical relationships between entities." },
    ],
  },

  // ── MATHEMATICS ────────────────────────────────────────────────────────
  {
    code: "MATH",
    name: "Mathematics",
    weight: 0.2,
    topics: [
      { code: "math.number_system", name: "Number System", description: "Number properties, divisibility and classifications." },
      { code: "math.simplification", name: "Simplification", description: "BODMAS and arithmetic simplification." },
      { code: "math.percentage", name: "Percentage", description: "Percentage applications." },
      { code: "math.profit_loss", name: "Profit & Loss", description: "CP, SP, MP and discount." },
      { code: "math.ratio_proportion", name: "Ratio & Proportion", description: "Compound ratio and partnership." },
      { code: "math.average", name: "Average", description: "Mean and weighted average problems." },
      { code: "math.si_ci", name: "Simple & Compound Interest", description: "SI, CI and applied interest calculations." },
      { code: "math.time_work", name: "Time & Work", description: "Work efficiency, pipes and cisterns." },
      { code: "math.time_distance", name: "Time & Distance", description: "Trains, boats and streams." },
      { code: "math.mensuration", name: "Mensuration", description: "Area, perimeter and volume." },
      { code: "math.permutation_combination", name: "Permutations & Combinations", description: "Basic counting principles and arrangements." },
      { code: "math.probability", name: "Probability", description: "Basic probability concepts and problems." },
      { code: "math.squares_cubes", name: "Squares & Cubes", description: "Square roots, cube roots and related computations." },
      { code: "math.algebra", name: "Algebra", description: "Linear equations and basic identities." },
    ],
  },

  // ── KANNADA LANGUAGE ───────────────────────────────────────────────────
  {
    code: "LANG",
    name: "Kannada Language (ಕನ್ನಡ)",
    weight: 0.15,
    topics: [
      { code: "kan.varnamala", name: "Kannada Varnamala", description: "Kannada alphabet — vowels and consonants." },
      { code: "kan.grammar", name: "Kannada Grammar (Vyakarana)", description: "Parts of speech, gender, number, case in Kannada." },
      { code: "kan.synonyms", name: "Samanarthaka Padagalu (Synonyms)", description: "Kannada synonyms for common words." },
      { code: "kan.antonyms", name: "Virudharthaka Padagalu (Antonyms)", description: "Kannada antonyms for common words." },
      { code: "kan.idioms", name: "Kannada Gadegalu & Idioms", description: "Kannada proverbs and idiomatic phrases." },
      { code: "kan.sandhi_samasa", name: "Sandhi & Samasa", description: "Kannada sandhi and compound word formation." },
      { code: "kan.tenses", name: "Tenses (Kala)", description: "Past, present, future tenses in Kannada." },
      { code: "kan.literature", name: "Kannada Literature", description: "Major Kannada poets, writers and Jnanpith awardees." },
      { code: "kan.comprehension", name: "Kannada Comprehension", description: "Unseen Kannada passage with questions." },
      { code: "kan.translation", name: "Kannada-English Translation", description: "Basic translation between Kannada and English." },
    ],
  },
];

export async function seedKaPolicePcSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "KA_POLICE_PC" } });
  if (!exam) {
    throw new Error("Run seedExams() first — KA_POLICE_PC exam not found.");
  }
  console.log(`Seeding Karnataka Police Constable syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < kaPolicePcSyllabus.length; sIdx++) {
    const s = kaPolicePcSyllabus[sIdx];
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
  seedKaPolicePcSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
