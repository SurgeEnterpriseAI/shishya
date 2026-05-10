// Kerala PSC Lower Division Clerk (LDC) — full syllabus tree.
// 100 MCQs in 1 hour 15 minutes (100 marks). Single objective paper.
// Sections: General Knowledge & Current Affairs, Simple Arithmetic & Mental
// Ability, General Science, General English, and Regional Language
// (Malayalam/Tamil/Kannada — Malayalam modelled here).
// Source: keralapsc.gov.in LD Clerks syllabus PDF.
//
// Run after seedExams: npx tsx seed/exams/kerala-ldc-syllabus.ts

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

export const keralaLdcSyllabus: SubjectSeed[] = [
  // ── GENERAL KNOWLEDGE & CURRENT AFFAIRS ──────────────────────────────
  {
    code: "GK_CA",
    name: "General Knowledge and Current Affairs",
    weight: 1.4,
    topics: [
      {
        code: "gk.kerala_history",
        name: "History of Kerala",
        description: "Pre-colonial to post-Independence history of Kerala.",
        subtopics: [
          { code: "gk.kerala.early_kerala", name: "Early Kerala", description: "Sangam age Cheras, Sangam literature references to Kerala." },
          { code: "gk.kerala.european", name: "Arrival of Europeans", description: "Portuguese, Dutch, French and English in Kerala — trade and conflict." },
          { code: "gk.kerala.travancore", name: "Travancore and Cochin", description: "Marthandavarma to Sri Chithira Tirunal — administration and reforms." },
          { code: "gk.kerala.malabar", name: "Malabar under British", description: "Mysorean invasions, British rule and Mappila uprisings." },
          { code: "gk.kerala.reform", name: "Social and Religious Reform Movements", description: "Sree Narayana Guru, Ayyankali, Chattampi Swamikal, Vakkom Moulavi." },
          { code: "gk.kerala.nationalism", name: "Nationalist Movement in Kerala", description: "Vaikom Satyagraha, Guruvayoor Satyagraha, Salt Satyagraha and Punnapra-Vayalar." },
          { code: "gk.kerala.formation", name: "Formation of Kerala State", description: "Aikya Kerala movement, States Reorganisation Act and post-1956 politics." },
        ],
      },
      {
        code: "gk.kerala_geography",
        name: "Geography of Kerala",
        description: "Physical and economic geography of Kerala.",
        subtopics: [
          { code: "gk.geo.physical", name: "Physical Features", description: "Highland, midland, lowland — Western Ghats, backwaters and lakes." },
          { code: "gk.geo.rivers", name: "Rivers of Kerala", description: "44 rivers including Periyar, Bharathapuzha, Pamba and Chaliyar." },
          { code: "gk.geo.agriculture", name: "Agriculture and Plantations", description: "Coconut, rubber, tea, coffee, cardamom and spice cultivation." },
          { code: "gk.geo.industry", name: "Industries and Resources", description: "Coir, cashew, fisheries, IT and mineral resources of Kerala." },
        ],
      },
      {
        code: "gk.indian_history",
        name: "History of India",
        description: "Outline of Indian history from ancient to modern times.",
        subtopics: [
          { code: "gk.indian.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Mauryas, Guptas." },
          { code: "gk.indian.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals and regional kingdoms." },
          { code: "gk.indian.freedom", name: "Indian Freedom Struggle", description: "1857 to 1947 — leaders, events and movements." },
        ],
      },
      {
        code: "gk.constitution",
        name: "Indian Constitution and Polity",
        description: "Salient features of the Indian Constitution.",
        subtopics: [
          { code: "gk.const.preamble", name: "Preamble and Features", description: "Federal structure, parliamentary system, secularism." },
          { code: "gk.const.fr", name: "Fundamental Rights and Duties", description: "Articles 12-35 and Article 51A duties." },
          { code: "gk.const.dpsp", name: "Directive Principles", description: "Articles 36-51 — guidelines for state policy." },
          { code: "gk.const.union_state", name: "Union and State Government", description: "President, PM, Governor, CM and legislatures." },
        ],
      },
      {
        code: "gk.current_affairs",
        name: "Current Affairs",
        description: "National, international and Kerala current events.",
        subtopics: [
          { code: "gk.ca.national", name: "National Current Affairs", description: "Government schemes, polity, economy and major events." },
          { code: "gk.ca.intl", name: "International Affairs", description: "World events, summits, organisations and India's relations." },
          { code: "gk.ca.kerala", name: "Kerala Current Affairs", description: "State government schemes, leaders and recent developments." },
          { code: "gk.ca.awards", name: "Awards and Honours", description: "National and international awards including literary and sports." },
          { code: "gk.ca.sports", name: "Sports", description: "Olympics, Asian Games, Commonwealth, cricket and Kerala sports." },
          { code: "gk.ca.books", name: "Books and Authors", description: "Recent notable books, Malayalam literature and authors." },
        ],
      },
      {
        code: "gk.facts_india",
        name: "Facts about India",
        description: "Symbols, geography and statistics about India.",
        subtopics: [
          { code: "gk.facts.symbols", name: "National Symbols", description: "National flag, emblem, anthem and other symbols." },
          { code: "gk.facts.states", name: "States and Capitals", description: "States, UTs, capitals, languages and recent reorganisation." },
          { code: "gk.facts.first", name: "First in India", description: "First persons, places, events in various fields." },
        ],
      },
    ],
  },

  // ── SIMPLE ARITHMETIC & MENTAL ABILITY ──────────────────────────────
  {
    code: "ARITH_MA",
    name: "Simple Arithmetic and Mental Ability",
    weight: 1,
    topics: [
      { code: "math.numbers", name: "Numbers", description: "Number system, place value, divisibility, factors and multiples." },
      { code: "math.fractions", name: "Fractions and Decimals", description: "Operations on fractions and decimal numbers." },
      { code: "math.percentage", name: "Percentage", description: "Percentage, profit, loss and discount calculations." },
      { code: "math.ratio", name: "Ratio and Proportion", description: "Simple, compound ratio and proportion problems." },
      { code: "math.si_ci", name: "Simple and Compound Interest", description: "Interest, principal, rate and time." },
      { code: "math.time_work", name: "Time and Work", description: "Work efficiency and combined work problems." },
      { code: "math.time_distance", name: "Time and Distance", description: "Speed, distance, trains and boats." },
      { code: "math.average", name: "Average", description: "Average of numbers, ages, marks and money." },
      { code: "math.mensuration", name: "Mensuration", description: "Area and perimeter of basic 2D figures, volume of cuboids." },
      { code: "math.lcm_hcf", name: "LCM and HCF", description: "LCM, HCF and applications." },
      { code: "ma.series", name: "Number Series", description: "Find next/missing number in a series." },
      { code: "ma.coding", name: "Coding and Decoding", description: "Letter, number and symbol coding." },
      { code: "ma.analogy", name: "Analogy and Classification", description: "Verbal and number analogy, odd-one-out." },
      { code: "ma.direction", name: "Direction Sense", description: "Direction-distance puzzles." },
      { code: "ma.blood_relation", name: "Blood Relations", description: "Family tree and relation puzzles." },
      { code: "ma.calendar_clock", name: "Calendar and Clock", description: "Day-finding and clock-angle problems." },
    ],
  },

  // ── GENERAL SCIENCE ──────────────────────────────────────────────────
  {
    code: "GENERAL_SCIENCE",
    name: "General Science",
    weight: 1,
    topics: [
      { code: "sci.physics", name: "Physics", description: "Force, motion, light, sound, electricity, magnetism." },
      { code: "sci.chemistry", name: "Chemistry", description: "Elements, compounds, acids, bases, salts and chemical changes." },
      { code: "sci.biology", name: "Biology", description: "Plant and animal kingdom, human body and diseases." },
      { code: "sci.environment", name: "Environment", description: "Ecosystem, biodiversity, pollution and conservation." },
      { code: "sci.health", name: "Health and Hygiene", description: "Nutrition, vitamins, common diseases and public health." },
      { code: "sci.tech", name: "Science and Technology", description: "Space, defence, biotechnology and IT in India." },
    ],
  },

  // ── GENERAL ENGLISH ──────────────────────────────────────────────────
  {
    code: "GENERAL_ENGLISH",
    name: "General English",
    weight: 1,
    topics: [
      { code: "eng.grammar", name: "English Grammar", description: "Tenses, articles, prepositions, voice, narration." },
      { code: "eng.vocab", name: "Vocabulary", description: "Synonyms, antonyms, one-word substitution, spellings." },
      { code: "eng.idioms", name: "Idioms and Phrases", description: "Common idioms, phrases and their meanings." },
      { code: "eng.sentence", name: "Sentence Correction", description: "Spotting errors, sentence improvement." },
      { code: "eng.fillers", name: "Fill in the Blanks", description: "Cloze-test style word and phrase fillers." },
      { code: "eng.comprehension", name: "Reading Comprehension", description: "Unseen passage based questions." },
    ],
  },

  // ── REGIONAL LANGUAGE — MALAYALAM ────────────────────────────────────
  {
    code: "MALAYALAM",
    name: "Malayalam (Regional Language)",
    weight: 1,
    topics: [
      { code: "mal.grammar", name: "Malayalam Grammar (Vyakaranam)", description: "Letters, words, sandhi and parts of speech in Malayalam." },
      { code: "mal.vocab", name: "Malayalam Vocabulary", description: "Synonyms, antonyms, idioms and proverbs in Malayalam." },
      { code: "mal.translation", name: "Translation", description: "English to Malayalam and Malayalam to English translation." },
      { code: "mal.literature", name: "Malayalam Literature", description: "Major poets, novelists and works including Adhyatma Ramayanam, Krishnagatha." },
      { code: "mal.comprehension", name: "Comprehension", description: "Unseen Malayalam passage based questions." },
    ],
  },
];

export async function seedKeralaLdcSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "KL_KPSC_LDC" } });
  if (!exam) {
    throw new Error("Run seedExams() first — KL_KPSC_LDC exam not found.");
  }
  console.log(`Seeding Kerala PSC LDC syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < keralaLdcSyllabus.length; sIdx++) {
    const s = keralaLdcSyllabus[sIdx];
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
  seedKeralaLdcSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
