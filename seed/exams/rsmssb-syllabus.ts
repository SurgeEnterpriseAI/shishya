// RSMSSB (Rajasthan Subordinate & Ministerial Services Selection Board) — full syllabus tree.
// Canonical syllabus modelled on the Patwari / clerk-grade pattern (Patwari Mains pattern).
// 150 MCQs × 2 marks = 300 marks in 3 hours. Negative marking 1/3 marks per wrong answer.
// Source: official RSMSSB Patwari notification & syllabus (rsmssb.rajasthan.gov.in),
// cross-checked with RSMSSB official advertisement.
// Five sections: General Knowledge, Math & Reasoning, General Hindi & English,
// Rajasthan General Knowledge, General Computer.
//
// Run after seedExams: npx tsx seed/exams/rsmssb-syllabus.ts

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

export const rsmssbSyllabus: SubjectSeed[] = [
  // ── GENERAL KNOWLEDGE / GENERAL SCIENCE ───────────────────────────────
  {
    code: "GK",
    name: "General Knowledge and General Science",
    weight: 1,
    topics: [
      {
        code: "gk.history",
        name: "History",
        description: "Indian history with focus on freedom struggle.",
        subtopics: [
          { code: "gk.history.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Mauryan and Gupta empires." },
          { code: "gk.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals and bhakti-sufi movements." },
          { code: "gk.history.modern", name: "Modern India", description: "British conquest, colonial rule and freedom struggle." },
          { code: "gk.history.freedom", name: "Indian National Movement", description: "1857 revolt, INC, Gandhian movements and Quit India." },
        ],
      },
      {
        code: "gk.geography",
        name: "Indian and World Geography",
        description: "Physical, economic and political geography.",
        subtopics: [
          { code: "gk.geography.india", name: "Indian Geography", description: "Physical features, climate, rivers and resources." },
          { code: "gk.geography.world", name: "World Geography", description: "Continents, oceans and major physical features." },
          { code: "gk.geography.environment", name: "Environment and Ecology", description: "Climate change, biodiversity, pollution and conservation." },
        ],
      },
      {
        code: "gk.polity",
        name: "Indian Polity and Constitution",
        description: "Constitution and governance structures.",
        subtopics: [
          { code: "gk.polity.constitution", name: "Indian Constitution", description: "Preamble, salient features and historical evolution." },
          { code: "gk.polity.fr_dpsp", name: "Fundamental Rights and DPSPs", description: "Articles 12-51A — fundamental rights, duties and DPSPs." },
          { code: "gk.polity.government", name: "Union and State Government", description: "President, PM, Parliament; Governor, CM, State Legislature." },
          { code: "gk.polity.judiciary", name: "Judiciary", description: "Supreme Court, High Courts and judicial review." },
          { code: "gk.polity.local", name: "Panchayati Raj", description: "73rd & 74th Amendments and PRIs." },
        ],
      },
      {
        code: "gk.economy",
        name: "Indian Economy",
        description: "Economy, planning and current schemes.",
        subtopics: [
          { code: "gk.economy.basics", name: "Basics of Indian Economy", description: "Sectors, mixed economy and economic indicators." },
          { code: "gk.economy.budget", name: "Budget and Taxation", description: "Union Budget, GST and tax structure." },
          { code: "gk.economy.banking", name: "Banking", description: "RBI, commercial banks and monetary policy." },
        ],
      },
      {
        code: "gk.science.physics",
        name: "Physics",
        description: "General physics topics for Patwari level.",
        subtopics: [
          { code: "gk.science.physics.mechanics", name: "Mechanics", description: "Force, motion, work, energy and Newton's laws." },
          { code: "gk.science.physics.heat_light_sound", name: "Heat, Light and Sound", description: "Heat transfer, optics and sound waves." },
          { code: "gk.science.physics.electricity", name: "Electricity and Magnetism", description: "Current, circuits, magnets and electromagnetic effects." },
        ],
      },
      {
        code: "gk.science.chemistry",
        name: "Chemistry",
        description: "General chemistry topics.",
        subtopics: [
          { code: "gk.science.chemistry.matter", name: "Matter and its Nature", description: "Atoms, molecules, elements and compounds." },
          { code: "gk.science.chemistry.acids", name: "Acids, Bases and Salts", description: "Properties of acids, bases and salts." },
          { code: "gk.science.chemistry.daily", name: "Chemistry in Daily Life", description: "Fertilizers, pesticides and chemicals in daily use." },
        ],
      },
      {
        code: "gk.science.biology",
        name: "Biology",
        description: "General biology topics.",
        subtopics: [
          { code: "gk.science.biology.living", name: "Living World", description: "Characteristics of living things and classification." },
          { code: "gk.science.biology.human", name: "Human Body", description: "Body systems, nutrition and diseases." },
          { code: "gk.science.biology.plants", name: "Plant Life", description: "Plant structure, function and reproduction." },
          { code: "gk.science.biology.environment", name: "Environment and Ecosystem", description: "Ecosystem, food chains and biodiversity." },
        ],
      },
      {
        code: "gk.current",
        name: "Current Affairs",
        description: "National, international and state current events.",
        subtopics: [
          { code: "gk.current.national", name: "National Current Events", description: "Major national events, schemes and policies." },
          { code: "gk.current.international", name: "International Current Events", description: "Major international summits and treaties." },
          { code: "gk.current.sports", name: "Sports", description: "Major sports events and tournaments." },
          { code: "gk.current.awards", name: "Awards and Honours", description: "National and international awards." },
        ],
      },
    ],
  },

  // ── MATHEMATICS ───────────────────────────────────────────────────────
  {
    code: "MATH",
    name: "Mathematics",
    weight: 1,
    topics: [
      { code: "math.numbers", name: "Number System", description: "Whole numbers, integers, divisibility and place value." },
      { code: "math.simplification", name: "Simplification", description: "BODMAS, fractions, decimals, square and cube roots." },
      { code: "math.lcm_hcf", name: "LCM and HCF", description: "Lowest common multiple and highest common factor." },
      { code: "math.percentage", name: "Percentage", description: "Percentage and applications." },
      { code: "math.ratio", name: "Ratio and Proportion", description: "Ratio, proportion and partnership." },
      { code: "math.average", name: "Average", description: "Simple and weighted average." },
      { code: "math.profit_loss", name: "Profit, Loss and Discount", description: "Cost-price, selling-price, discount and applied problems." },
      { code: "math.simple_interest", name: "Simple and Compound Interest", description: "SI and CI calculations." },
      { code: "math.time_work", name: "Time and Work", description: "Work efficiency and pipes-and-cisterns problems." },
      { code: "math.time_distance", name: "Time and Distance", description: "Trains, boats, average speed and relative speed." },
      { code: "math.algebra", name: "Algebra", description: "Algebraic expressions and linear equations." },
      { code: "math.geometry", name: "Geometry", description: "Lines, angles, triangles, quadrilaterals and circles." },
      { code: "math.mensuration", name: "Mensuration", description: "Area, perimeter, surface area and volume." },
      { code: "math.statistics", name: "Statistics", description: "Mean, median, mode and frequency tables." },
      { code: "math.data_interpretation", name: "Data Interpretation", description: "Tables, bar/pie/line graphs." },
      { code: "math.trigonometry", name: "Trigonometry (Basics)", description: "Trigonometric ratios and basic identities." },
    ],
  },

  // ── REASONING ────────────────────────────────────────────────────────
  {
    code: "REASONING",
    name: "Logical Reasoning and Mental Ability",
    weight: 1,
    topics: [
      { code: "reasoning.analogy", name: "Analogy", description: "Word, number and figure analogies." },
      { code: "reasoning.classification", name: "Classification", description: "Identifying the odd one out." },
      { code: "reasoning.series", name: "Series Completion", description: "Number, letter and figure series." },
      { code: "reasoning.coding", name: "Coding-Decoding", description: "Letter-letter, letter-number and number-number coding." },
      { code: "reasoning.blood_relation", name: "Blood Relations", description: "Family relationship problems." },
      { code: "reasoning.direction", name: "Direction Sense", description: "Direction-and-distance problems." },
      { code: "reasoning.syllogism", name: "Syllogism", description: "Statement-conclusion problems." },
      { code: "reasoning.puzzle", name: "Puzzles", description: "Seating arrangement and grouping puzzles." },
      { code: "reasoning.alphanumeric", name: "Alphanumeric Series", description: "Mixed letter-number-symbol series." },
      { code: "reasoning.ranking", name: "Ranking and Order", description: "Position and rank arrangement." },
      { code: "reasoning.cube_dice", name: "Cube and Dice", description: "Cube and dice problems." },
      { code: "reasoning.venn", name: "Venn Diagrams", description: "Set-based Venn diagram problems." },
      { code: "reasoning.calendar", name: "Calendar and Clock", description: "Day, date and clock problems." },
      { code: "reasoning.statement", name: "Statement and Argument", description: "Strong and weak arguments based on statements." },
    ],
  },

  // ── LANGUAGE — Hindi & English ───────────────────────────────────────
  {
    code: "LANG",
    name: "General Hindi and English",
    weight: 1,
    topics: [
      { code: "lang.hindi_grammar", name: "Hindi Vyakaran", description: "Sangya, sarvanaam, visheshan, kriya, kaal and karak." },
      { code: "lang.hindi_sandhi", name: "Sandhi", description: "Swar, vyanjan and visarg sandhi." },
      { code: "lang.hindi_samas", name: "Samas", description: "Six types of samas." },
      { code: "lang.hindi_upsarg_pratyay", name: "Upsarg aur Pratyay", description: "Prefixes and suffixes in Hindi." },
      { code: "lang.hindi_synonyms", name: "Paryayvachi aur Vilom", description: "Synonyms and antonyms in Hindi." },
      { code: "lang.hindi_idioms", name: "Muhavare aur Lokoktiyan", description: "Hindi idioms and proverbs." },
      { code: "lang.hindi_one_word", name: "Anek Shabdon ke liye Ek Shabd", description: "One-word substitutions in Hindi." },
      { code: "lang.hindi_spelling", name: "Shabd Shudhi", description: "Identifying correctly spelled Hindi words." },
      { code: "lang.hindi_sentence", name: "Vakya Shudhi", description: "Correcting grammatically wrong Hindi sentences." },
      { code: "lang.hindi_alankar", name: "Alankar aur Ras", description: "Figures of speech and ras in Hindi." },
      { code: "lang.eng_grammar", name: "English Grammar", description: "Parts of speech, tenses, voice, narration and articles." },
      { code: "lang.eng_vocab", name: "English Vocabulary", description: "Synonyms, antonyms, one-word substitution." },
      { code: "lang.eng_idioms", name: "English Idioms and Phrases", description: "Common idioms and phrasal verbs." },
      { code: "lang.eng_comprehension", name: "Reading Comprehension", description: "Unseen passage with comprehension questions." },
      { code: "lang.eng_sentence", name: "Sentence Improvement", description: "Sentence correction, rearrangement and improvement." },
      { code: "lang.eng_spotting", name: "Spotting Errors", description: "Identifying grammatical errors in English sentences." },
    ],
  },

  // ── RAJASTHAN — STATE-SPECIFIC GK ────────────────────────────────────
  {
    code: "STATE_SPECIFIC",
    name: "Rajasthan — General Knowledge",
    weight: 1.4,
    topics: [
      {
        code: "rj.history",
        name: "History of Rajasthan",
        description: "Rajputana history and freedom struggle in Rajasthan.",
        subtopics: [
          { code: "rj.history.ancient", name: "Ancient Rajasthan", description: "Pre-historic sites — Kalibangan, Ahar, Bagor — and early Rajput emergence." },
          { code: "rj.history.rajput", name: "Rajput Dynasties", description: "Chauhans, Sisodias, Rathores, Kachwahas — major rulers and battles." },
          { code: "rj.history.maharanas", name: "Maharana Pratap and Battle of Haldighati", description: "Maharana Pratap, Battle of Haldighati, resistance to Mughal rule." },
          { code: "rj.history.princely", name: "Princely States and British Era", description: "Treaties with British, integration of Rajasthan after 1947." },
          { code: "rj.history.freedom", name: "Freedom Struggle in Rajasthan", description: "Praja Mandal movements, Bijolia movement, Vijay Singh Pathik, Kesari Singh Barhath." },
          { code: "rj.history.unification", name: "Unification of Rajasthan", description: "Seven stages of unification of Rajasthan after independence." },
        ],
      },
      {
        code: "rj.geography",
        name: "Geography of Rajasthan",
        description: "Physical, climatic and economic geography of Rajasthan.",
        subtopics: [
          { code: "rj.geography.location", name: "Location and Physical Features", description: "Location, area, Aravalli range, Thar desert, plateaus and plains." },
          { code: "rj.geography.climate", name: "Climate", description: "Climate types, monsoon, drought patterns and seasonal variations." },
          { code: "rj.geography.rivers", name: "Rivers and Lakes", description: "Chambal, Banas, Luni, Mahi rivers; Pushkar, Sambhar, Pichola lakes." },
          { code: "rj.geography.soil_agri", name: "Soil and Agriculture", description: "Soil types, major crops (bajra, wheat, mustard) and agricultural patterns." },
          { code: "rj.geography.minerals", name: "Minerals and Mining", description: "Marble, zinc, copper, lignite — major mineral deposits of Rajasthan." },
          { code: "rj.geography.wildlife", name: "Wildlife and National Parks", description: "Ranthambore, Sariska, Keoladeo, Desert National Park and wildlife conservation." },
          { code: "rj.geography.population", name: "Population and Demography", description: "Population distribution, density, sex ratio and tribal areas." },
        ],
      },
      {
        code: "rj.polity",
        name: "Polity and Administration",
        description: "Administration and governance of Rajasthan.",
        subtopics: [
          { code: "rj.polity.governor_cm", name: "Governor and Chief Minister", description: "Role, powers and current Governor and CM of Rajasthan." },
          { code: "rj.polity.assembly", name: "Rajasthan Legislative Assembly", description: "Composition and functioning of the State Assembly." },
          { code: "rj.polity.districts", name: "Districts and Divisions", description: "Districts, divisions and major administrative bodies." },
          { code: "rj.polity.panchayati", name: "Panchayati Raj in Rajasthan", description: "First state to implement Panchayati Raj (1959); three-tier system in Rajasthan." },
          { code: "rj.polity.high_court", name: "Rajasthan High Court", description: "Rajasthan High Court at Jodhpur and benches." },
          { code: "rj.polity.commissions", name: "State Commissions", description: "RSMSSB, RPSC, State Information Commission and other bodies." },
        ],
      },
      {
        code: "rj.culture",
        name: "Culture and Heritage of Rajasthan",
        description: "Folk culture, art and traditions of Rajasthan.",
        subtopics: [
          { code: "rj.culture.dances", name: "Folk Dances", description: "Ghoomar, Kalbeliya, Bhavai, Chari, Terah Taali — folk dances of Rajasthan." },
          { code: "rj.culture.music", name: "Folk Music", description: "Manganiyars, Langas — folk music traditions and instruments." },
          { code: "rj.culture.painting", name: "Painting and Art", description: "Mewar, Marwar, Kishangarh, Bundi and Jaipur schools of painting; Pichwai art." },
          { code: "rj.culture.handicrafts", name: "Handicrafts", description: "Blue pottery, bandhej, leheriya, meenakari, kundan and traditional crafts." },
          { code: "rj.culture.fairs_festivals", name: "Fairs and Festivals", description: "Pushkar Fair, Teej, Gangaur, Camel Festival and other Rajasthani festivals." },
          { code: "rj.culture.cuisine", name: "Cuisine", description: "Dal-baati-churma, gatte ki sabzi, ker-sangri and Rajasthani cuisine." },
          { code: "rj.culture.architecture", name: "Architecture", description: "Forts (Mehrangarh, Amber, Chittor) and palaces of Rajasthan." },
          { code: "rj.culture.tribes", name: "Tribes of Rajasthan", description: "Bhils, Meenas, Garasias, Sahariyas — tribal customs and traditions." },
          { code: "rj.culture.saints", name: "Saints and Reformers", description: "Mirabai, Dadu Dayal, Pabuji, Tejaji and folk deities of Rajasthan." },
        ],
      },
      {
        code: "rj.economy",
        name: "Economy of Rajasthan",
        description: "Economic structure and welfare schemes.",
        subtopics: [
          { code: "rj.economy.agriculture", name: "Agriculture and Animal Husbandry", description: "Major crops, irrigation, dairy and animal husbandry." },
          { code: "rj.economy.industry", name: "Industries", description: "Textile, cement, marble, handicrafts and tourism industries." },
          { code: "rj.economy.tourism", name: "Tourism", description: "Tourism circuits, heritage tourism and Rajasthan Tourism Department." },
          { code: "rj.economy.schemes", name: "Welfare Schemes", description: "Mukhyamantri Chiranjeevi, Indira Rasoi, Mukhyamantri Kanyadan and other state schemes." },
          { code: "rj.economy.budget", name: "Rajasthan Budget", description: "Recent state budget highlights and allocations." },
        ],
      },
      {
        code: "rj.current",
        name: "Rajasthan Current Affairs",
        description: "Recent developments in Rajasthan.",
        subtopics: [
          { code: "rj.current.events", name: "Recent Events", description: "Recent developments, schemes and personalities of Rajasthan." },
          { code: "rj.current.sports", name: "Sports of Rajasthan", description: "Sports policy, achievements and athletes from Rajasthan." },
        ],
      },
    ],
  },

  // ── COMPUTER ──────────────────────────────────────────────────────────
  {
    code: "COMPUTER",
    name: "General Computer",
    weight: 1,
    topics: [
      { code: "comp.fundamentals", name: "Computer Fundamentals", description: "Characteristics of computers, hardware, software and operating systems." },
      { code: "comp.os", name: "Operating System", description: "Windows OS basics, file management and system tools." },
      { code: "comp.ms_word", name: "MS Word", description: "Document creation, formatting, tables and printing." },
      { code: "comp.ms_excel", name: "MS Excel / Spreadsheet", description: "Spreadsheets, formulas, functions and charts." },
      { code: "comp.ms_powerpoint", name: "MS PowerPoint", description: "Slide creation, layouts and presentations." },
      { code: "comp.internet", name: "Internet", description: "Web browsing, search engines, downloading and uploading." },
      { code: "comp.email", name: "Email", description: "Email basics — inbox, attachments and folders." },
      { code: "comp.security", name: "Computer Security", description: "Antivirus, firewall and password security." },
    ],
  },
];

export async function seedRsmssbSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "RJ_RSMSSB" } });
  if (!exam) {
    throw new Error("Run seedExams() first — RJ_RSMSSB exam not found.");
  }
  console.log(`Seeding RSMSSB syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < rsmssbSyllabus.length; sIdx++) {
    const s = rsmssbSyllabus[sIdx];
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
  seedRsmssbSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
