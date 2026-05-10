// Bihar Police Constable (CSBC) — full syllabus tree.
// 100 MCQs in 2 hours, 100 marks (no negative marking). Class-10 standard.
// Sections: General Knowledge & Current Affairs, Hindi/English, Mathematics,
//           General Science, Social Studies (History/Geography/Civics/Economics).
// Source: csbc.bih.nic.in notification + Career Power / Testbook cross-check.
//
// Run after seedExams: npx tsx seed/exams/br-police-pc-syllabus.ts

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

export const brPolicePcSyllabus: SubjectSeed[] = [
  // ── GENERAL KNOWLEDGE & CURRENT AFFAIRS ────────────────────────────────
  {
    code: "GK",
    name: "General Knowledge & Current Affairs",
    weight: 0.3,
    topics: [
      { code: "gk.countries_currencies", name: "Countries & Currencies", description: "World countries, capitals and currencies." },
      { code: "gk.national_intl", name: "National & International Affairs", description: "Major events at national and international level." },
      { code: "gk.personalities", name: "Famous Personalities", description: "Prominent personalities in politics, sports, arts and science." },
      { code: "gk.sports", name: "Sports", description: "National and international sports events and players." },
      { code: "gk.awards", name: "Awards & Honours", description: "Padma, Nobel, gallantry and recent recipients." },
      { code: "gk.books", name: "Books & Authors", description: "Notable books and their authors." },
      { code: "gk.current_affairs", name: "Current Affairs", description: "National and international events of last 12-18 months." },
      { code: "gk.bihar_specific", name: "Bihar GK", description: "Bihar geography, schemes, festivals, prominent personalities." },
      { code: "gk.bihar_freedom", name: "Bihar in Freedom Struggle", description: "Champaran Satyagraha, Bihar leaders in freedom movement." },
      { code: "gk.environment", name: "Environment & Ecology", description: "Climate change, biodiversity, pollution and conservation." },
    ],
  },

  // ── HISTORY (Social Science) ───────────────────────────────────────────
  {
    code: "HISTORY",
    name: "History",
    weight: 0.15,
    topics: [
      { code: "hist.prehistory", name: "Pre-history & Proto-history", description: "Stone age, copper age and Indus Valley Civilization." },
      { code: "hist.ancient", name: "Ancient India", description: "Vedic age, Mahajanapadas, Mauryas, Guptas." },
      { code: "hist.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals, regional kingdoms." },
      { code: "hist.modern", name: "Modern India", description: "British rule, social reforms and economic policies." },
      { code: "hist.revolt_1857", name: "Revolt of 1857", description: "Causes, course, consequences of First War of Independence." },
      { code: "hist.freedom_movement", name: "Freedom Movement", description: "INC, Gandhian movements, partition and independence." },
      { code: "hist.bihar_history", name: "Bihar History", description: "Magadha empire, Nalanda, Vikramshila and Bihar dynasties." },
      { code: "hist.world_history", name: "World History", description: "French Revolution, Industrial Revolution, world wars." },
    ],
  },

  // ── GEOGRAPHY ──────────────────────────────────────────────────────────
  {
    code: "GEOGRAPHY",
    name: "Geography",
    weight: 0.1,
    topics: [
      { code: "geo.physical_india", name: "Physical Geography of India", description: "Mountains, plains, plateaus, coasts and islands." },
      { code: "geo.climate", name: "Climate & Monsoon", description: "Indian monsoon system and climate types." },
      { code: "geo.rivers", name: "Rivers & Water Resources", description: "Major rivers, tributaries and irrigation projects." },
      { code: "geo.agriculture", name: "Agriculture", description: "Cropping pattern, soil types and Green Revolution." },
      { code: "geo.bihar", name: "Bihar Geography", description: "Districts, rivers (Ganga, Kosi), agriculture and climate of Bihar." },
      { code: "geo.world_physical", name: "World Physical Geography", description: "Continents, oceans, mountains, climate zones." },
      { code: "geo.economic", name: "Economic Geography", description: "Resources, industries and trade in India." },
    ],
  },

  // ── CIVICS & POLITY ────────────────────────────────────────────────────
  {
    code: "CIVICS",
    name: "Civics / Political Science",
    weight: 0.1,
    topics: [
      { code: "civ.constitution", name: "Constitution of India", description: "Preamble, salient features, FRs and DPSPs." },
      { code: "civ.union_govt", name: "Union Government", description: "President, PM, Parliament, Council of Ministers." },
      { code: "civ.state_govt", name: "State Government", description: "Governor, CM, State Legislature." },
      { code: "civ.judiciary", name: "Judiciary", description: "Supreme Court, High Courts and judicial review." },
      { code: "civ.elections", name: "Elections & Electoral System", description: "ECI, electoral reforms and political parties." },
      { code: "civ.local_govt", name: "Local Self Government", description: "Panchayati Raj and urban local bodies." },
      { code: "civ.foreign_policy", name: "India's Foreign Policy", description: "NAM, neighbour relations and bilateral ties." },
    ],
  },

  // ── ECONOMICS ──────────────────────────────────────────────────────────
  {
    code: "ECONOMICS",
    name: "Economics",
    weight: 0.07,
    topics: [
      { code: "econ.basics", name: "Basic Concepts", description: "Microeconomics and macroeconomics fundamentals." },
      { code: "econ.indian_economy", name: "Indian Economy", description: "Sectoral composition, planning and reforms." },
      { code: "econ.banking", name: "Banking & Finance", description: "RBI, commercial banks and financial inclusion." },
      { code: "econ.budget", name: "Budget & Taxation", description: "Union budget, fiscal policy and GST." },
      { code: "econ.development", name: "Development Policies", description: "Poverty alleviation, MNREGA, welfare schemes." },
    ],
  },

  // ── MATHEMATICS (Class 10 level) ───────────────────────────────────────
  {
    code: "MATH",
    name: "Mathematics",
    weight: 0.1,
    topics: [
      { code: "math.simplification", name: "Simplification", description: "BODMAS and arithmetic simplification." },
      { code: "math.percentage", name: "Percentage", description: "Percentage applications and word problems." },
      { code: "math.profit_loss", name: "Profit & Loss", description: "CP, SP, MP and discount problems." },
      { code: "math.ratio_proportion", name: "Ratio & Proportion", description: "Compound ratio and partnership." },
      { code: "math.average", name: "Average", description: "Mean and weighted average." },
      { code: "math.si_ci", name: "Simple & Compound Interest", description: "SI, CI compounded annually/half-yearly." },
      { code: "math.time_work", name: "Time & Work", description: "Work efficiency and pipes/cisterns." },
      { code: "math.time_distance", name: "Time & Distance", description: "Trains, boats and streams." },
      { code: "math.mensuration", name: "Mensuration", description: "Area, perimeter and volume." },
      { code: "math.algebra", name: "Algebra", description: "Linear and quadratic equations." },
      { code: "math.geometry", name: "Geometry", description: "Lines, angles, triangles and circles." },
      { code: "math.trigonometry", name: "Trigonometry", description: "Trig ratios and heights/distances." },
    ],
  },

  // ── GENERAL SCIENCE ────────────────────────────────────────────────────
  {
    code: "SCIENCE",
    name: "General Science",
    weight: 0.1,
    topics: [
      { code: "sci.physics_motion", name: "Motion & Energy", description: "Newton's laws, work, energy and power." },
      { code: "sci.physics_em", name: "Electricity & Magnetism", description: "Current electricity, magnetic effects." },
      { code: "sci.physics_light_sound", name: "Light & Sound", description: "Reflection, refraction, lenses and sound waves." },
      { code: "sci.chem_acids", name: "Acids, Bases & Salts", description: "pH, indicators and neutralisation reactions." },
      { code: "sci.chem_metals", name: "Metals & Non-metals", description: "Reactivity series, alloys and corrosion." },
      { code: "sci.chem_carbon", name: "Carbon & Compounds", description: "Hydrocarbons, functional groups and basic organic chemistry." },
      { code: "sci.bio_human_body", name: "Human Body", description: "Body systems, nutrition and diseases." },
      { code: "sci.bio_natural_resources", name: "Natural Resources", description: "Water, soil, forests and biodiversity." },
      { code: "sci.bio_environment", name: "Environmental Concerns", description: "Pollution, climate change and conservation." },
    ],
  },

  // ── HINDI & ENGLISH (Language) ─────────────────────────────────────────
  {
    code: "LANG",
    name: "Hindi & English Language",
    weight: 0.08,
    topics: [
      { code: "hindi.grammar", name: "Hindi Grammar", description: "Sangya, sarvanam, kriya, kaal, sandhi, samas." },
      { code: "hindi.synonyms_antonyms", name: "Hindi Synonyms & Antonyms", description: "Paryayvachi and vilom shabd." },
      { code: "hindi.idioms", name: "Hindi Muhavare & Lokoktiyan", description: "Hindi idioms and proverbs with meanings." },
      { code: "hindi.comprehension", name: "Hindi Comprehension", description: "Unseen Hindi passage." },
      { code: "english.grammar", name: "English Grammar", description: "Tenses, articles, prepositions, voice and narration." },
      { code: "english.vocabulary", name: "English Vocabulary", description: "Synonyms, antonyms and one-word substitution." },
      { code: "english.sentence_structure", name: "Sentence Structure", description: "Sentence correction and rearrangement." },
      { code: "english.comprehension", name: "English Comprehension", description: "Unseen English passage and questions." },
    ],
  },
];

export async function seedBrPolicePcSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "BR_POLICE_PC" } });
  if (!exam) {
    throw new Error("Run seedExams() first — BR_POLICE_PC exam not found.");
  }
  console.log(`Seeding Bihar Police Constable syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < brPolicePcSyllabus.length; sIdx++) {
    const s = brPolicePcSyllabus[sIdx];
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
  seedBrPolicePcSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
