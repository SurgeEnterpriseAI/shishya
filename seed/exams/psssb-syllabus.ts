// PSSSB (Punjab Subordinate Services Selection Board) — full syllabus tree.
// Canonical syllabus for Clerk / Group-C posts. Conducted by PSSSB, Mohali.
// 100 MCQs × 1 mark = 100 marks in 90 minutes. Negative marking 1/4 mark per wrong answer in Part B.
// Two parts: Part A — Punjabi (qualifying, 10th standard, 50% to pass);
// Part B — General Knowledge & Current Affairs, Punjab History & Culture, Logical Reasoning,
// Punjabi, English, ICT.
// Source: official PSSSB Clerk notification & syllabus (sssb.punjab.gov.in),
// cross-checked with PSSSB official advertisement.
//
// Run after seedExams: npx tsx seed/exams/psssb-syllabus.ts

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

export const psssbSyllabus: SubjectSeed[] = [
  // ── GENERAL KNOWLEDGE / GENERAL AWARENESS ─────────────────────────────
  {
    code: "GK",
    name: "General Knowledge and Current Affairs",
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
        description: "Physical and economic geography.",
        subtopics: [
          { code: "gk.geography.india", name: "Indian Geography", description: "Physical features, climate, rivers and resources." },
          { code: "gk.geography.world", name: "World Geography", description: "Continents, oceans and major physical features." },
          { code: "gk.geography.environment", name: "Environment and Ecology", description: "Climate change, biodiversity and conservation." },
        ],
      },
      {
        code: "gk.polity",
        name: "Indian Polity and Constitution",
        description: "Constitution and governance.",
        subtopics: [
          { code: "gk.polity.constitution", name: "Indian Constitution", description: "Preamble, salient features and historical evolution." },
          { code: "gk.polity.fr_dpsp", name: "Fundamental Rights and DPSPs", description: "Articles 12-51A — fundamental rights, duties and DPSPs." },
          { code: "gk.polity.government", name: "Union and State Government", description: "President, PM, Parliament; Governor, CM, State Legislature." },
          { code: "gk.polity.judiciary", name: "Judiciary", description: "Supreme Court, High Courts and judicial review." },
        ],
      },
      {
        code: "gk.economy",
        name: "Indian Economy",
        description: "Economy and recent developments.",
        subtopics: [
          { code: "gk.economy.basics", name: "Basics of Indian Economy", description: "Sectors and economic indicators." },
          { code: "gk.economy.budget", name: "Budget and Taxation", description: "Union Budget, GST and tax structure." },
          { code: "gk.economy.banking", name: "Banking", description: "RBI, commercial banks and monetary policy." },
        ],
      },
      {
        code: "gk.science",
        name: "General Science",
        description: "General physics, chemistry and biology.",
        subtopics: [
          { code: "gk.science.physics", name: "Physics", description: "Mechanics, heat, light, sound, electricity and magnetism." },
          { code: "gk.science.chemistry", name: "Chemistry", description: "Atoms, elements, compounds, acids, bases and salts." },
          { code: "gk.science.biology", name: "Biology", description: "Living world, human body, plants and ecosystem." },
        ],
      },
      {
        code: "gk.current",
        name: "Current Affairs",
        description: "National, international and Punjab-specific current events.",
        subtopics: [
          { code: "gk.current.national", name: "National Current Events", description: "Major national events, schemes and policies." },
          { code: "gk.current.international", name: "International Current Events", description: "Major international summits and treaties." },
          { code: "gk.current.punjab", name: "Punjab Current Events", description: "Recent developments, schemes and personalities of Punjab." },
          { code: "gk.current.sports", name: "Sports", description: "Major sports events and tournaments." },
          { code: "gk.current.awards", name: "Awards and Honours", description: "National and international awards." },
        ],
      },
    ],
  },

  // ── MATHEMATICS / NUMERICAL ABILITY ───────────────────────────────────
  {
    code: "MATH",
    name: "Numerical Ability",
    weight: 1,
    topics: [
      { code: "math.numbers", name: "Number System", description: "Whole numbers, integers, divisibility and place value." },
      { code: "math.simplification", name: "Simplification", description: "BODMAS, fractions, decimals, square and cube roots." },
      { code: "math.lcm_hcf", name: "HCF and LCM", description: "Highest common factor and lowest common multiple." },
      { code: "math.percentage", name: "Percentage", description: "Percentage and applications." },
      { code: "math.ratio", name: "Ratio and Proportion", description: "Ratio, proportion and partnership." },
      { code: "math.average", name: "Average", description: "Simple and weighted average." },
      { code: "math.profit_loss", name: "Profit, Loss and Discount", description: "Cost-price, selling-price and discount." },
      { code: "math.simple_interest", name: "Simple and Compound Interest", description: "SI and CI calculations." },
      { code: "math.time_work", name: "Time and Work", description: "Work efficiency and pipes-and-cisterns." },
      { code: "math.time_distance", name: "Time and Distance", description: "Trains, boats and average speed." },
      { code: "math.algebra", name: "Algebra", description: "Algebraic expressions and linear equations." },
      { code: "math.geometry", name: "Geometry", description: "Lines, angles and basic shapes." },
      { code: "math.mensuration", name: "Mensuration", description: "Area, perimeter, surface area and volume." },
      { code: "math.statistics", name: "Statistics", description: "Mean, median, mode and frequency tables." },
      { code: "math.data_interpretation", name: "Data Interpretation", description: "Tables, bar/pie/line graphs." },
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
      { code: "reasoning.series", name: "Series", description: "Number, letter and figure series." },
      { code: "reasoning.coding", name: "Coding-Decoding", description: "Letter-letter, letter-number and number-number coding." },
      { code: "reasoning.blood_relation", name: "Blood Relations", description: "Family relationship problems." },
      { code: "reasoning.direction", name: "Direction Sense", description: "Direction-and-distance problems." },
      { code: "reasoning.syllogism", name: "Syllogism", description: "Statement-conclusion problems." },
      { code: "reasoning.puzzle", name: "Puzzles", description: "Seating arrangement and grouping puzzles." },
      { code: "reasoning.alphanumeric", name: "Alphanumeric Series", description: "Mixed letter-number-symbol series." },
      { code: "reasoning.ranking", name: "Ranking and Order", description: "Position and rank arrangement." },
      { code: "reasoning.cube_dice", name: "Cube and Dice", description: "Cube and dice problems." },
      { code: "reasoning.calendar", name: "Calendar and Clock", description: "Day, date and clock problems." },
      { code: "reasoning.statement", name: "Statement and Argument", description: "Strong and weak arguments." },
    ],
  },

  // ── LANGUAGE — Punjabi & English ─────────────────────────────────────
  {
    code: "LANG",
    name: "Punjabi and English Language",
    weight: 1,
    topics: [
      { code: "lang.punjabi_grammar", name: "Punjabi Grammar (Vyakaran)", description: "Naun, pranaun, visheshan, kiriya — parts of speech in Punjabi." },
      { code: "lang.punjabi_tense", name: "Punjabi Tense (Kal)", description: "Vartman, bhoot and bhavishya kal in Punjabi." },
      { code: "lang.punjabi_gender_number", name: "Ling and Vachan", description: "Gender and number in Punjabi nouns and verbs." },
      { code: "lang.punjabi_synonyms", name: "Samanarthak (Synonyms)", description: "Synonyms in Punjabi." },
      { code: "lang.punjabi_antonyms", name: "Virodhi Shabd (Antonyms)", description: "Antonyms in Punjabi." },
      { code: "lang.punjabi_idioms", name: "Punjabi Muhavare", description: "Punjabi idioms and proverbs." },
      { code: "lang.punjabi_one_word", name: "One-Word Substitution (Punjabi)", description: "One-word substitutions in Punjabi." },
      { code: "lang.punjabi_spelling", name: "Punjabi Spelling Shudhi", description: "Identifying correctly spelled Punjabi words." },
      { code: "lang.punjabi_sentence", name: "Punjabi Sentence Correction", description: "Correcting grammatically wrong Punjabi sentences." },
      { code: "lang.punjabi_comprehension", name: "Punjabi Reading Comprehension", description: "Punjabi unseen passage with comprehension questions." },
      { code: "lang.punjabi_literature", name: "Punjabi Literature", description: "Major Punjabi writers — Bhai Vir Singh, Amrita Pritam, Shiv Kumar Batalvi, Waris Shah." },
      { code: "lang.punjabi_gurmukhi", name: "Gurmukhi Script", description: "Gurmukhi alphabet and basic script knowledge." },
      { code: "lang.eng_grammar", name: "English Grammar", description: "Parts of speech, tenses, voice, narration and articles." },
      { code: "lang.eng_vocab", name: "English Vocabulary", description: "Synonyms, antonyms, one-word substitution." },
      { code: "lang.eng_idioms", name: "English Idioms and Phrases", description: "Common idioms and phrasal verbs." },
      { code: "lang.eng_comprehension", name: "Reading Comprehension", description: "Unseen passage with comprehension questions." },
      { code: "lang.eng_sentence", name: "Sentence Improvement", description: "Sentence correction, rearrangement and improvement." },
      { code: "lang.eng_spotting", name: "Spotting Errors", description: "Identifying grammatical errors in English sentences." },
    ],
  },

  // ── PUNJAB — STATE-SPECIFIC ──────────────────────────────────────────
  {
    code: "STATE_SPECIFIC",
    name: "Punjab — History, Culture and Geography",
    weight: 1.4,
    topics: [
      {
        code: "pb.history",
        name: "History of Punjab",
        description: "Punjab's history from ancient times to the present.",
        subtopics: [
          { code: "pb.history.ancient", name: "Ancient Punjab", description: "Indus Valley sites in Punjab, Vedic age and Alexander's invasion." },
          { code: "pb.history.medieval", name: "Medieval Punjab", description: "Mughal rule, rise of Sikhism and Sikh Gurus." },
          { code: "pb.history.gurus", name: "Sikh Gurus", description: "Ten Sikh Gurus — life, teachings and contributions from Guru Nanak to Guru Gobind Singh." },
          { code: "pb.history.misls", name: "Sikh Misls", description: "Twelve Sikh misls and their evolution into the Sikh Empire." },
          { code: "pb.history.ranjit_singh", name: "Maharaja Ranjit Singh", description: "Maharaja Ranjit Singh, formation of Sikh Empire and Anglo-Sikh wars." },
          { code: "pb.history.british", name: "British Punjab", description: "Annexation of Punjab and colonial era." },
          { code: "pb.history.freedom", name: "Freedom Struggle in Punjab", description: "Jallianwala Bagh, Bhagat Singh, Lala Lajpat Rai, Kuka movement and Ghadar Party." },
          { code: "pb.history.partition", name: "Partition of Punjab (1947)", description: "Partition of Punjab and its impact." },
          { code: "pb.history.reorganisation", name: "Reorganisation of Punjab (1966)", description: "Punjab Reorganisation Act 1966 and creation of Haryana and Himachal Pradesh." },
        ],
      },
      {
        code: "pb.geography",
        name: "Geography of Punjab",
        description: "Physical and economic geography of Punjab.",
        subtopics: [
          { code: "pb.geography.location", name: "Location and Physical Features", description: "Location, area, plains and Shivalik foothills." },
          { code: "pb.geography.rivers", name: "Rivers of Punjab", description: "Sutlej, Beas, Ravi — three major rivers and tributaries." },
          { code: "pb.geography.climate", name: "Climate", description: "Climate types, monsoon and seasonal variations." },
          { code: "pb.geography.soil_agri", name: "Soil and Agriculture", description: "Soil types, Green Revolution, wheat and paddy cultivation." },
          { code: "pb.geography.canal", name: "Canal Irrigation", description: "Canal network of Punjab — Bhakra, Sirhind and Bist Doab canals." },
          { code: "pb.geography.industry", name: "Industries", description: "Bicycle (Ludhiana), hosiery, textiles, sports goods (Jalandhar) and food processing." },
          { code: "pb.geography.population", name: "Population and Demography", description: "Population distribution, density and sex ratio." },
        ],
      },
      {
        code: "pb.culture",
        name: "Culture and Heritage of Punjab",
        description: "Folk culture, religion and traditions of Punjab.",
        subtopics: [
          { code: "pb.culture.dances", name: "Folk Dances", description: "Bhangra, Giddha, Jhumar, Sammi, Luddi — folk dances of Punjab." },
          { code: "pb.culture.music", name: "Folk Music", description: "Heer, Mirza, Sufi music and Punjabi folk traditions." },
          { code: "pb.culture.festivals", name: "Festivals", description: "Baisakhi, Lohri, Hola Mohalla, Gurpurabs and Maghi." },
          { code: "pb.culture.cuisine", name: "Cuisine", description: "Sarson da saag, makki di roti, Amritsari kulcha and Punjabi cuisine." },
          { code: "pb.culture.attire", name: "Attire and Traditions", description: "Patiala salwar, kurta-pyjama, phulkari embroidery and turban." },
          { code: "pb.culture.gurudwaras", name: "Gurudwaras and Religious Sites", description: "Golden Temple, Anandpur Sahib, Damdama Sahib and Hemkund Sahib." },
          { code: "pb.culture.fairs", name: "Fairs and Melas", description: "Hola Mohalla mela, Chhapar mela, Roshni mela and Jor mela." },
          { code: "pb.culture.literature", name: "Punjabi Literature", description: "Sufi literature, Bhai Gurdas, Bhai Vir Singh, Amrita Pritam, Shiv Kumar Batalvi." },
        ],
      },
      {
        code: "pb.polity",
        name: "Polity and Administration",
        description: "Punjab administration and welfare schemes.",
        subtopics: [
          { code: "pb.polity.governor_cm", name: "Governor and Chief Minister", description: "Role and current Governor and CM of Punjab." },
          { code: "pb.polity.assembly", name: "Punjab Legislative Assembly", description: "Composition and functioning of the State Assembly." },
          { code: "pb.polity.districts", name: "Districts and Divisions", description: "22 districts and 5 divisions of Punjab." },
          { code: "pb.polity.high_court", name: "Punjab and Haryana High Court", description: "Punjab and Haryana High Court at Chandigarh." },
          { code: "pb.polity.schemes", name: "Welfare Schemes", description: "State government schemes — Aam Aadmi Clinic, Mukhyamantri Tirth Yatra and others." },
        ],
      },
    ],
  },

  // ── COMPUTER / ICT ───────────────────────────────────────────────────
  {
    code: "COMPUTER",
    name: "ICT (Information & Communication Technology)",
    weight: 1,
    topics: [
      { code: "comp.fundamentals", name: "Computer Fundamentals", description: "Hardware, software and operating systems basics." },
      { code: "comp.os", name: "Operating System", description: "Windows OS basics and file management." },
      { code: "comp.ms_word", name: "MS Word", description: "Document creation, formatting and printing." },
      { code: "comp.ms_excel", name: "MS Excel", description: "Spreadsheets, formulas and basic functions." },
      { code: "comp.ms_powerpoint", name: "MS PowerPoint", description: "Slide creation and presentations." },
      { code: "comp.internet", name: "Internet and Email", description: "Web browsing, search engines and email basics." },
      { code: "comp.security", name: "Computer Security", description: "Antivirus, firewall and password security." },
      { code: "comp.shortcuts", name: "Keyboard Shortcuts", description: "Common Windows and MS Office shortcuts." },
    ],
  },
];

export async function seedPsssbSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "PB_PSSSB" } });
  if (!exam) {
    throw new Error("Run seedExams() first — PB_PSSSB exam not found.");
  }
  console.log(`Seeding PSSSB syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < psssbSyllabus.length; sIdx++) {
    const s = psssbSyllabus[sIdx];
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
  seedPsssbSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
