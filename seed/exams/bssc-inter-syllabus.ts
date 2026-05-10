// Bihar SSC Inter Level (BSSC 10+2 / Combined Inter Level) — full syllabus tree.
// Conducted by Bihar Staff Selection Commission (BSSC), Patna.
// Prelims: 150 MCQs × 4 marks = 600 marks in 2 hours 15 minutes. 1 mark negative per wrong answer.
// Source: official BSSC notification & syllabus (bssc.bihar.gov.in),
// cross-checked with BSSC official advertisement.
//
// Run after seedExams: npx tsx seed/exams/bssc-inter-syllabus.ts

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

export const bsscInterSyllabus: SubjectSeed[] = [
  // ── GENERAL KNOWLEDGE / GENERAL STUDIES ───────────────────────────────
  {
    code: "GK",
    name: "General Studies and General Awareness",
    weight: 1,
    topics: [
      {
        code: "gk.history",
        name: "History",
        description: "Indian history from ancient to modern times.",
        subtopics: [
          { code: "gk.history.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Mauryan and Gupta empires." },
          { code: "gk.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals and bhakti-sufi movements." },
          { code: "gk.history.modern", name: "Modern India", description: "British conquest, colonial rule and freedom struggle." },
          { code: "gk.history.freedom", name: "Indian National Movement", description: "1857 revolt, INC, Gandhian phase and Quit India." },
          { code: "gk.history.bihar", name: "History of Bihar", description: "Magadh, Nalanda, Champaran Satyagraha and freedom struggle in Bihar." },
        ],
      },
      {
        code: "gk.geography",
        name: "Geography",
        description: "Indian and world geography.",
        subtopics: [
          { code: "gk.geography.india", name: "Indian Geography", description: "Physical features, climate, rivers, agriculture and resources." },
          { code: "gk.geography.world", name: "World Geography", description: "Continents, oceans and major physical features." },
          { code: "gk.geography.bihar", name: "Geography of Bihar", description: "Rivers (Ganga, Kosi, Bagmati), agro-climatic zones, floods and resources of Bihar." },
          { code: "gk.geography.environment", name: "Environment and Ecology", description: "Climate change, biodiversity, pollution and conservation." },
        ],
      },
      {
        code: "gk.polity",
        name: "Indian Polity",
        description: "Constitution and governance.",
        subtopics: [
          { code: "gk.polity.constitution", name: "Indian Constitution", description: "Preamble, salient features and historical evolution." },
          { code: "gk.polity.fr_dpsp", name: "Fundamental Rights and DPSPs", description: "Articles 12-51A — fundamental rights, duties and DPSPs." },
          { code: "gk.polity.government", name: "Union and State Government", description: "President, PM, Parliament; Governor, CM, State Legislature." },
          { code: "gk.polity.judiciary", name: "Judiciary", description: "Supreme Court, High Courts and judicial review." },
          { code: "gk.polity.local", name: "Panchayati Raj and Local Bodies", description: "73rd & 74th Amendments and PRIs in Bihar." },
        ],
      },
      {
        code: "gk.economy",
        name: "Indian Economy",
        description: "Economy and recent developments.",
        subtopics: [
          { code: "gk.economy.basics", name: "Basics of Indian Economy", description: "Sectors, mixed economy and economic indicators." },
          { code: "gk.economy.budget", name: "Budget and Taxation", description: "Union Budget, GST and tax structure." },
          { code: "gk.economy.banking", name: "Banking and Finance", description: "RBI, commercial banks and monetary policy." },
          { code: "gk.economy.bihar", name: "Economy of Bihar", description: "Agriculture, industry, MSMEs and welfare schemes of Bihar." },
        ],
      },
      {
        code: "gk.bihar_specific",
        name: "Bihar — Specific GK",
        description: "Bihar-specific facts, schemes and culture.",
        subtopics: [
          { code: "gk.bihar_specific.welfare", name: "Welfare Schemes of Bihar", description: "State schemes — Saat Nishchay, Mukhyamantri schemes and beneficiaries." },
          { code: "gk.bihar_specific.culture", name: "Art and Culture of Bihar", description: "Madhubani art, Bhojpuri/Maithili/Magahi traditions, Chhath festival and folk dances." },
          { code: "gk.bihar_specific.tourism", name: "Tourism of Bihar", description: "Bodh Gaya, Nalanda, Vaishali, Rajgir and other heritage sites." },
          { code: "gk.bihar_specific.personalities", name: "Famous Personalities", description: "Aryabhatta, Chanakya, Ashoka, Rajendra Prasad, JP, Karpoori Thakur." },
        ],
      },
      {
        code: "gk.current",
        name: "Current Affairs",
        description: "National, international and Bihar-specific current events.",
        subtopics: [
          { code: "gk.current.national", name: "National Current Events", description: "Major national events, schemes and policies." },
          { code: "gk.current.international", name: "International Current Events", description: "Major international summits, treaties and global events." },
          { code: "gk.current.bihar", name: "Bihar Current Events", description: "Recent developments, schemes and personalities of Bihar." },
          { code: "gk.current.sports", name: "Sports", description: "Major sports events, awards and tournaments." },
          { code: "gk.current.awards", name: "Awards and Honours", description: "National and international awards." },
        ],
      },
    ],
  },

  // ── GENERAL SCIENCE ───────────────────────────────────────────────────
  {
    code: "STATE_SPECIFIC",
    name: "General Science",
    weight: 1,
    topics: [
      { code: "sci.physics.mechanics", name: "Mechanics", description: "Force, motion, work, energy and Newton's laws." },
      { code: "sci.physics.heat", name: "Heat and Thermodynamics", description: "Heat, temperature and heat transfer." },
      { code: "sci.physics.light", name: "Light and Optics", description: "Reflection, refraction, lenses and optical instruments." },
      { code: "sci.physics.sound", name: "Sound and Waves", description: "Sound waves, frequency, wavelength and applications." },
      { code: "sci.physics.electricity", name: "Electricity and Magnetism", description: "Current, circuits, magnets and electromagnetic effects." },
      { code: "sci.chemistry.matter", name: "Matter and its Nature", description: "Atoms, molecules, elements, compounds and mixtures." },
      { code: "sci.chemistry.acids", name: "Acids, Bases and Salts", description: "Properties of acids, bases, salts and pH scale." },
      { code: "sci.chemistry.metals", name: "Metals and Non-Metals", description: "Properties and reactions of metals and non-metals." },
      { code: "sci.chemistry.daily", name: "Chemistry in Daily Life", description: "Fertilizers, pesticides, soaps, detergents and food chemistry." },
      { code: "sci.biology.living", name: "Living World", description: "Characteristics of living things and basic classification." },
      { code: "sci.biology.cell", name: "Cell — Structure and Function", description: "Cell structure, organelles and division." },
      { code: "sci.biology.human", name: "Human Body", description: "Digestive, respiratory, circulatory, nervous and reproductive systems." },
      { code: "sci.biology.plants", name: "Plant Physiology", description: "Photosynthesis, transpiration, plant nutrition and reproduction." },
      { code: "sci.biology.diseases", name: "Diseases and Health", description: "Communicable and non-communicable diseases; vaccinations." },
      { code: "sci.biology.environment", name: "Environment and Ecology", description: "Ecosystem, food chains, biodiversity and pollution." },
      { code: "sci.tech.computer", name: "Computer Basics", description: "Hardware, software and basic computer concepts." },
      { code: "sci.tech.space", name: "Space and Defence", description: "ISRO missions, satellites and Indian defence technology." },
    ],
  },

  // ── MATHEMATICS ───────────────────────────────────────────────────────
  {
    code: "MATH",
    name: "General Mathematics",
    weight: 1,
    topics: [
      { code: "math.numbers", name: "Number System", description: "Whole numbers, integers, divisibility and place value." },
      { code: "math.simplification", name: "Simplification", description: "BODMAS, fractions, decimals, square and cube roots." },
      { code: "math.lcm_hcf", name: "LCM and HCF", description: "Lowest common multiple and highest common factor." },
      { code: "math.percentage", name: "Percentage", description: "Percentage and applications." },
      { code: "math.ratio", name: "Ratio and Proportion", description: "Ratio, proportion and partnership." },
      { code: "math.average", name: "Average", description: "Simple and weighted average." },
      { code: "math.profit_loss", name: "Profit, Loss and Discount", description: "Cost-price, selling-price and discount problems." },
      { code: "math.simple_interest", name: "Simple and Compound Interest", description: "SI and CI calculations." },
      { code: "math.time_work", name: "Time and Work", description: "Work efficiency and pipes-and-cisterns problems." },
      { code: "math.time_distance", name: "Time and Distance", description: "Trains, boats, average speed and relative speed." },
      { code: "math.algebra", name: "Algebra", description: "Algebraic expressions, identities and linear equations." },
      { code: "math.geometry", name: "Geometry", description: "Lines, angles, triangles, quadrilaterals and circles." },
      { code: "math.mensuration", name: "Mensuration", description: "Area, perimeter, surface area and volume of plane figures and solids." },
      { code: "math.statistics", name: "Statistics", description: "Mean, median, mode, frequency tables and graphs." },
      { code: "math.data_interpretation", name: "Data Interpretation", description: "Tables, bar/pie/line graphs — calculation-based questions." },
      { code: "math.trigonometry", name: "Trigonometry (Basics)", description: "Trigonometric ratios and basic identities." },
    ],
  },

  // ── REASONING / MENTAL ABILITY ───────────────────────────────────────
  {
    code: "REASONING",
    name: "Mental Ability and Logical Reasoning",
    weight: 1,
    topics: [
      { code: "reasoning.analogy", name: "Analogy", description: "Word, number and figure analogies." },
      { code: "reasoning.classification", name: "Classification", description: "Identifying the odd one out in a group." },
      { code: "reasoning.series", name: "Series", description: "Number, letter and figure series." },
      { code: "reasoning.coding", name: "Coding-Decoding", description: "Letter-letter, letter-number and number-number coding." },
      { code: "reasoning.blood_relation", name: "Blood Relations", description: "Family relationship problems." },
      { code: "reasoning.direction", name: "Direction Sense", description: "Direction-and-distance problems." },
      { code: "reasoning.syllogism", name: "Syllogism", description: "Statement-conclusion problems." },
      { code: "reasoning.puzzle", name: "Puzzles", description: "Seating arrangement and grouping puzzles." },
      { code: "reasoning.alphanumeric", name: "Alphanumeric Series", description: "Mixed letter-number-symbol series." },
      { code: "reasoning.ranking", name: "Ranking and Order", description: "Position and rank arrangement problems." },
      { code: "reasoning.statement_arg", name: "Statement and Arguments", description: "Strong and weak arguments." },
      { code: "reasoning.cause_effect", name: "Cause and Effect", description: "Cause-effect relationship problems." },
      { code: "reasoning.mirror_water", name: "Mirror and Water Image", description: "Mirror and water image problems." },
      { code: "reasoning.cube_dice", name: "Cube and Dice", description: "Cube and dice problems." },
      { code: "reasoning.venn", name: "Venn Diagrams", description: "Set-based Venn diagram problems." },
      { code: "reasoning.calendar", name: "Calendar and Clock", description: "Day, date and clock-hand problems." },
    ],
  },

  // ── HINDI LANGUAGE ────────────────────────────────────────────────────
  {
    code: "LANG",
    name: "Hindi Language",
    weight: 1,
    topics: [
      { code: "lang.grammar", name: "Hindi Vyakaran", description: "Sangya, sarvanaam, visheshan, kriya, kriya-visheshan, samuchchaya, vismayadi." },
      { code: "lang.tense", name: "Kaal", description: "Vartman, bhutkaal and bhavishyat kaal." },
      { code: "lang.gender_number", name: "Ling aur Vachan", description: "Gender and number in Hindi." },
      { code: "lang.case", name: "Karak", description: "Eight karaks in Hindi." },
      { code: "lang.sandhi", name: "Sandhi", description: "Swar, vyanjan and visarg sandhi." },
      { code: "lang.samas", name: "Samas", description: "Six types of samas." },
      { code: "lang.upsarg_pratyay", name: "Upsarg aur Pratyay", description: "Prefixes and suffixes." },
      { code: "lang.synonyms", name: "Paryayvachi", description: "Synonyms in Hindi." },
      { code: "lang.antonyms", name: "Vilom Shabd", description: "Antonyms in Hindi." },
      { code: "lang.one_word", name: "Anek Shabdon ke liye Ek Shabd", description: "One-word substitutions in Hindi." },
      { code: "lang.idioms", name: "Muhavare aur Lokoktiyan", description: "Hindi idioms and proverbs." },
      { code: "lang.alankar", name: "Alankar", description: "Figures of speech in Hindi." },
      { code: "lang.spelling", name: "Shabd Shudhi", description: "Identifying correctly spelled Hindi words." },
      { code: "lang.sentence_correction", name: "Vakya Shudhi", description: "Correcting grammatically wrong Hindi sentences." },
      { code: "lang.comprehension", name: "Apathit Gadyansh", description: "Hindi unseen passage comprehension." },
      { code: "lang.literature", name: "Hindi Literature", description: "Major writers — Tulsidas, Surdas, Kabir, Premchand, Mahadevi Verma." },
    ],
  },

  // ── COMPUTER ──────────────────────────────────────────────────────────
  {
    code: "COMPUTER",
    name: "Computer Knowledge",
    weight: 1,
    topics: [
      { code: "comp.fundamentals", name: "Computer Fundamentals", description: "Hardware, software and operating systems basics." },
      { code: "comp.ms_office", name: "MS Office", description: "MS Word, Excel and PowerPoint basics." },
      { code: "comp.internet", name: "Internet and Email", description: "Web browsing, email basics and online safety." },
      { code: "comp.shortcuts", name: "Common Shortcuts", description: "Common Windows and MS Office keyboard shortcuts." },
    ],
  },
];

export async function seedBsscInterSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "BR_BSSC_INTER" } });
  if (!exam) {
    throw new Error("Run seedExams() first — BR_BSSC_INTER exam not found.");
  }
  console.log(`Seeding BSSC Inter syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < bsscInterSyllabus.length; sIdx++) {
    const s = bsscInterSyllabus[sIdx];
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
  seedBsscInterSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
