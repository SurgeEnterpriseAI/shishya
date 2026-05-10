// Bihar Police Sub-Inspector (BPSSC) — full syllabus tree.
// Prelims: 100 MCQs in 2 hours, 200 marks. Mains: 200 Qs in 2 hours per paper × 2 papers.
// Sections covered: General Knowledge & Current Affairs, Mathematics, Reasoning,
//                   General Hindi, General Studies (History/Geography/Polity/Economy/Science).
// Source: bpssc.bih.nic.in notification + Adda247 / Testbook cross-check.
//
// Run after seedExams: npx tsx seed/exams/br-police-si-syllabus.ts

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

export const brPoliceSiSyllabus: SubjectSeed[] = [
  // ── GENERAL KNOWLEDGE & CURRENT AFFAIRS ────────────────────────────────
  {
    code: "GK",
    name: "General Knowledge & Current Affairs",
    weight: 0.3,
    topics: [
      { code: "gk.history_india", name: "Indian History", description: "Ancient, medieval and modern Indian history." },
      { code: "gk.freedom_struggle", name: "Indian Freedom Struggle", description: "1857, INC, Gandhian movements, partition." },
      { code: "gk.geography_india", name: "Indian Geography", description: "Physical, economic and political geography." },
      { code: "gk.geography_world", name: "World Geography", description: "Continents, oceans, climate and major countries." },
      { code: "gk.polity", name: "Indian Polity & Constitution", description: "Constitution, Parliament, judiciary and DPSPs." },
      { code: "gk.economy", name: "Indian Economy", description: "Plans, banking, GDP and budget." },
      { code: "gk.science_tech", name: "Science & Technology", description: "Space, defence, IT, biotech." },
      { code: "gk.sports", name: "Sports", description: "National and international sports events." },
      { code: "gk.awards", name: "Awards & Honours", description: "Padma, Nobel, gallantry and recent honours." },
      { code: "gk.books", name: "Books & Authors", description: "Notable books, authors and recent literary releases." },
      { code: "gk.current_affairs", name: "Current Affairs", description: "National and international events of last 12-18 months." },
      { code: "gk.bihar_history", name: "Bihar History", description: "Magadha empire, Nalanda, Vikramshila and Bihar dynasties." },
      { code: "gk.bihar_freedom", name: "Bihar in Freedom Struggle", description: "Champaran Satyagraha, Rajendra Prasad, Bihar leaders." },
      { code: "gk.bihar_geography", name: "Bihar Geography", description: "Districts, rivers (Ganga, Kosi, Gandak), agriculture, climate." },
      { code: "gk.bihar_polity", name: "Bihar Polity & Schemes", description: "State administration, welfare schemes, prominent personalities." },
      { code: "gk.bihar_culture", name: "Bihar Culture & Festivals", description: "Chhath, Madhubani art, Bihula, Bihar literature and traditions." },
    ],
  },

  // ── GENERAL STUDIES (History, Geography, Polity, Economy, Science) ────
  {
    code: "GENERAL_STUDIES",
    name: "General Studies",
    weight: 0.2,
    topics: [
      { code: "gs.ancient_india", name: "Ancient India", description: "Vedic age, Mahajanapadas, Mauryas, Guptas." },
      { code: "gs.medieval_india", name: "Medieval India", description: "Delhi Sultanate, Mughals, regional kingdoms." },
      { code: "gs.constitution", name: "Constitution of India", description: "Preamble, FRs, DPSPs, amendments." },
      { code: "gs.governance", name: "Governance & Public Administration", description: "Bureaucracy, public service and accountability." },
      { code: "gs.indian_economy", name: "Indian Economy Structure", description: "Sectoral composition, reforms and indicators." },
      { code: "gs.environment", name: "Environment & Ecology", description: "Climate change, biodiversity and conservation." },
      { code: "gs.physics", name: "Physics", description: "Mechanics, electricity, magnetism, optics and modern physics basics." },
      { code: "gs.chemistry", name: "Chemistry", description: "Atomic structure, periodic table, acids/bases, organic basics." },
      { code: "gs.biology", name: "Biology", description: "Cell, genetics, human body, plant physiology and ecology." },
      { code: "gs.disasters", name: "Disaster Management", description: "Natural and man-made disasters, NDMA framework." },
    ],
  },

  // ── MATHEMATICS ────────────────────────────────────────────────────────
  {
    code: "MATH",
    name: "Mathematics",
    weight: 0.2,
    topics: [
      { code: "math.number_system", name: "Number System", description: "Number properties and divisibility tests." },
      { code: "math.simplification", name: "Simplification", description: "BODMAS, fractions, decimals and surds." },
      { code: "math.percentage", name: "Percentage", description: "Percentage applications." },
      { code: "math.profit_loss", name: "Profit & Loss", description: "CP, SP, MP and discount." },
      { code: "math.ratio_proportion", name: "Ratio & Proportion", description: "Compound ratio and partnership." },
      { code: "math.average", name: "Average", description: "Mean and weighted average." },
      { code: "math.si_ci", name: "Simple & Compound Interest", description: "SI, CI compounded annually/half-yearly." },
      { code: "math.time_work", name: "Time & Work", description: "Work efficiency and pipes/cisterns." },
      { code: "math.time_distance", name: "Time & Distance", description: "Trains, boats and streams." },
      { code: "math.mensuration", name: "Mensuration", description: "Area, perimeter and volume." },
      { code: "math.algebra", name: "Algebra", description: "Linear and quadratic equations." },
      { code: "math.geometry", name: "Geometry", description: "Lines, angles, triangles, circles." },
      { code: "math.trigonometry", name: "Trigonometry", description: "Trig ratios, identities, heights and distances." },
      { code: "math.data_interpretation", name: "Data Interpretation", description: "Tables, bar/pie/line graphs." },
      { code: "math.statistics", name: "Elementary Statistics", description: "Mean, median, mode and range." },
    ],
  },

  // ── REASONING ──────────────────────────────────────────────────────────
  {
    code: "REASONING",
    name: "Reasoning",
    weight: 0.15,
    topics: [
      { code: "reason.analogy", name: "Analogies", description: "Word, number and figural analogies." },
      { code: "reason.classification", name: "Classification", description: "Odd one out across categories." },
      { code: "reason.series", name: "Series", description: "Letter, number and figural series." },
      { code: "reason.coding", name: "Coding-Decoding", description: "Letter/number/symbol coding patterns." },
      { code: "reason.blood_relation", name: "Blood Relations", description: "Family-tree puzzles." },
      { code: "reason.direction", name: "Direction Sense", description: "Cardinal directions and final-position." },
      { code: "reason.ranking", name: "Ranking & Order", description: "Top/bottom rank and seating order." },
      { code: "reason.syllogism", name: "Syllogism", description: "Logical conclusions from premises." },
      { code: "reason.venn", name: "Venn Diagrams", description: "Set relationships visualised." },
      { code: "reason.statement_conclusion", name: "Statement & Conclusion", description: "Inference and assumption analysis." },
      { code: "reason.statement_argument", name: "Statement & Argument", description: "Strong/weak argument evaluation." },
      { code: "reason.problem_solving", name: "Problem Solving", description: "Seating, ordering and grouping puzzles." },
      { code: "reason.non_verbal", name: "Non-Verbal Reasoning", description: "Mirror image, paper folding and embedded figures." },
    ],
  },

  // ── GENERAL HINDI ──────────────────────────────────────────────────────
  {
    code: "HINDI",
    name: "General Hindi (सामान्य हिंदी)",
    weight: 0.15,
    topics: [
      { code: "hindi.varnamala", name: "Varnamala", description: "Hindi alphabet — vowels and consonants." },
      { code: "hindi.sandhi_samas", name: "Sandhi & Samas", description: "Sandhi types and compound word formation." },
      { code: "hindi.upsarg_pratyay", name: "Upsarg & Pratyay", description: "Prefixes and suffixes." },
      { code: "hindi.synonyms_antonyms", name: "Paryayvachi & Vilom", description: "Synonyms and antonyms." },
      { code: "hindi.idioms_proverbs", name: "Muhavare & Lokoktiyan", description: "Hindi idioms and proverbs." },
      { code: "hindi.tatsam_tadbhav", name: "Tatsam-Tadbhav", description: "Sanskrit-origin and derived words." },
      { code: "hindi.ling_vachan_karak", name: "Ling, Vachan, Karak", description: "Gender, number and case." },
      { code: "hindi.kriya_kaal_vachya", name: "Kriya, Kaal, Vachya", description: "Verbs, tenses and voice." },
      { code: "hindi.vakya_shuddhi", name: "Vakya Shuddhi", description: "Sentence correction." },
      { code: "hindi.gadyansh", name: "Gadyansh / Comprehension", description: "Unseen Hindi passage." },
      { code: "hindi.lekhak", name: "Lekhak & Krityan", description: "Famous Hindi authors and their works." },
      { code: "hindi.alankar", name: "Alankar, Ras, Chhand", description: "Figures of speech, sentiments and metres." },
    ],
  },
];

export async function seedBrPoliceSiSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "BR_POLICE_SI" } });
  if (!exam) {
    throw new Error("Run seedExams() first — BR_POLICE_SI exam not found.");
  }
  console.log(`Seeding Bihar Police SI syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < brPoliceSiSyllabus.length; sIdx++) {
    const s = brPoliceSiSyllabus[sIdx];
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
  seedBrPoliceSiSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
