// HPSSSB / HPSSC (Himachal Pradesh Subordinate Services Selection Board, Hamirpur) — JOA(IT) / Clerk syllabus tree.
// Screening Test (CBT/Offline) — 100 MCQs / 100 marks / 1 hour with negative marking.
// Heavy emphasis on Himachal Pradesh GK, plus National & International Affairs, Hindi, English.
// Source: hpsssb.hp.gov.in official notifications (JOA-IT, Clerk and similar Class-III posts).
//
// Run after seedExams: npx tsx seed/exams/hpsssb-syllabus.ts

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

export const hpsssbSyllabus: SubjectSeed[] = [
  // ── GENERAL KNOWLEDGE (NATIONAL/INTL) ────────────────────────────────
  {
    code: "GK",
    name: "General Knowledge (National & International)",
    weight: 1,
    topics: [
      { code: "gk.history_india", name: "History of India", description: "Ancient, medieval, modern India and freedom struggle." },
      { code: "gk.geography_india", name: "Geography of India", description: "Physical, economic and social geography of India." },
      { code: "gk.indian_polity", name: "Indian Polity and Constitution", description: "Constitution, Parliament, judiciary and federalism." },
      { code: "gk.indian_economy", name: "Indian Economy", description: "Banking, GST, Five-Year Plans, NITI Aayog." },
      { code: "gk.science_tech", name: "Science and Technology", description: "IT, biotech, space, defence and recent achievements." },
      { code: "gk.environment", name: "Environment and Ecology", description: "Ecosystems, biodiversity, climate change and conservation." },
      { code: "gk.current_affairs_natl", name: "National Current Affairs", description: "Government schemes, appointments, summits, awards." },
      { code: "gk.current_affairs_intl", name: "International Affairs", description: "Global summits, treaties, organisations and conflicts." },
      { code: "gk.sports", name: "Sports", description: "Olympics, Asian Games, cricket, hockey, awards." },
      { code: "gk.books_authors", name: "Books and Authors", description: "Recent notable books and their authors." },
      { code: "gk.social_events", name: "Social Events related to India", description: "Reform movements, social legislation, contemporary issues." },
    ],
  },

  // ── HIMACHAL PRADESH SPECIFIC ────────────────────────────────────────
  {
    code: "STATE_SPECIFIC",
    name: "Himachal Pradesh General Knowledge",
    weight: 1.4,
    topics: [
      { code: "hp.history", name: "History of Himachal Pradesh", description: "Ancient janapadas, Rajput hill states, British paramountcy and Praja Mandals." },
      { code: "hp.formation", name: "Formation of Himachal Pradesh", description: "Stages of formation: 1948 chief commissioner's province to full statehood in 1971." },
      { code: "hp.geography", name: "Geography of HP", description: "Physiographic divisions — Shivaliks, Lesser Himalayas, Greater Himalayas, Trans-Himalayas." },
      { code: "hp.rivers", name: "Rivers of Himachal Pradesh", description: "Sutlej, Beas, Ravi, Chenab, Yamuna — origin and tributaries." },
      { code: "hp.lakes", name: "Lakes of HP", description: "Renuka, Rewalsar, Suraj Tal, Chandra Tal, Manimahesh, Khajjiar." },
      { code: "hp.passes_glaciers", name: "Passes and Glaciers", description: "Rohtang, Baralacha, Kunzum, Shipki La; Bara Shigri, Sonapani glaciers." },
      { code: "hp.climate", name: "Climate of HP", description: "Climatic zones — sub-tropical, temperate, alpine, cold desert." },
      { code: "hp.flora_fauna", name: "Flora and Fauna", description: "Forest types, state animal (snow leopard), state bird (jujurana)." },
      { code: "hp.economy", name: "Economy of Himachal Pradesh", description: "Agriculture, horticulture (apple), hydropower, tourism, handicrafts." },
      { code: "hp.culture", name: "Art, Culture and Heritage", description: "Folk dances (Nati), music, painting (Kangra, Basohli, Chamba)." },
      { code: "hp.fairs_festivals", name: "Fairs and Festivals", description: "Kullu Dussehra, Mandi Shivratri, Minjar, Lavi, Renuka, Lohri." },
      { code: "hp.languages", name: "Languages and Dialects", description: "Pahari dialects — Kangri, Mandyali, Kullvi, Kinnauri, Bhoti." },
      { code: "hp.tourism", name: "Tourism of HP", description: "Shimla, Manali, Dharamshala, Dalhousie, Spiti, Kasol, Kinnaur." },
      { code: "hp.administration", name: "HP Administration", description: "Districts, divisions, Governor, CM, secretariat structure." },
      { code: "hp.govt_schemes", name: "HP Government Schemes", description: "Welfare schemes, women, youth and farmer schemes by HP government." },
      { code: "hp.personalities", name: "Notable Personalities of HP", description: "Y.S. Parmar, Padma Sachdev, freedom fighters, sportspersons, scientists." },
      { code: "hp.np_sanctuaries", name: "National Parks and Sanctuaries", description: "Great Himalayan, Pin Valley, Inderkilla, Khirganga, Simbalbara." },
      { code: "hp.current_affairs_hp", name: "Current Affairs of HP", description: "Recent events, schemes and developments in Himachal Pradesh." },
    ],
  },

  // ── HINDI ────────────────────────────────────────────────────────────
  {
    code: "LANG",
    name: "Hindi and English Language",
    weight: 1,
    topics: [
      { code: "hin.varnamala", name: "Varnamala (वर्णमाला)", description: "Hindi alphabet — swar and vyanjan." },
      { code: "hin.sandhi_samas", name: "Sandhi and Samas", description: "Sandhi rules and types of samas in Hindi." },
      { code: "hin.shabd_rachna", name: "Shabd Rachna (शब्द रचना)", description: "Upsarg, pratyay, paryayvachi, vilom shabd." },
      { code: "hin.muhavare_lokoktiyan", name: "Muhavare aur Lokoktiyan", description: "Hindi idioms and proverbs." },
      { code: "hin.vakya_shudhi", name: "Vakya Shudhi", description: "Sentence correction in Hindi." },
      { code: "hin.alankar_ras", name: "Alankar and Ras", description: "Hindi figures of speech and rasas." },
      { code: "hin.apathit", name: "Apathit Gadyansh / Padyansh", description: "Unseen Hindi prose/verse comprehension." },
      { code: "eng.grammar", name: "English Grammar", description: "Tenses, articles, prepositions, conjunctions, modals." },
      { code: "eng.vocabulary", name: "English Vocabulary", description: "Synonyms, antonyms, one-word substitution." },
      { code: "eng.idioms", name: "English Idioms and Phrases", description: "Common idiomatic expressions." },
      { code: "eng.error_correction", name: "Error Spotting and Correction", description: "Identifying grammatical errors in sentences." },
      { code: "eng.comprehension", name: "Reading Comprehension", description: "Unseen passage with vocabulary and inference questions." },
      { code: "eng.cloze", name: "Cloze Test and Fill in the Blanks", description: "Contextual word selection." },
    ],
  },

  // ── REASONING & NUMERICAL ABILITY ────────────────────────────────────
  {
    code: "REASONING",
    name: "Reasoning and Numerical Ability",
    weight: 1,
    topics: [
      { code: "ma.number_system", name: "Number System", description: "Whole, rational, irrational numbers; LCM and HCF; divisibility." },
      { code: "ma.simplification", name: "Simplification", description: "BODMAS, fractions, decimals." },
      { code: "ma.percentage", name: "Percentage", description: "Percentage calculations and applications." },
      { code: "ma.ratio_proportion", name: "Ratio and Proportion", description: "Direct, inverse and compound ratios." },
      { code: "ma.average", name: "Average", description: "Arithmetic mean and weighted averages." },
      { code: "ma.profit_loss", name: "Profit and Loss", description: "Cost, sale, discount, marked price problems." },
      { code: "ma.si_ci", name: "Simple and Compound Interest", description: "Interest formulas and applied problems." },
      { code: "ma.time_work", name: "Time and Work", description: "Work efficiency and pipes-cisterns." },
      { code: "ma.time_distance", name: "Time and Distance", description: "Trains, boats and average speed." },
      { code: "ma.mensuration", name: "Mensuration", description: "Area and volume of 2D and 3D figures." },
      { code: "rea.series", name: "Series", description: "Number, alphabet and figure series." },
      { code: "rea.coding", name: "Coding-Decoding", description: "Letter, number and substitution coding." },
      { code: "rea.blood_relations", name: "Blood Relations", description: "Relationship-based reasoning." },
      { code: "rea.direction", name: "Direction Sense", description: "Direction-based path problems." },
      { code: "rea.analogy_class", name: "Analogy and Classification", description: "Word, number, figure analogy and odd-one-out." },
      { code: "rea.syllogism", name: "Syllogism", description: "Statement-conclusion logical reasoning." },
      { code: "rea.seating", name: "Seating Arrangement", description: "Linear and circular seating puzzles." },
      { code: "rea.calendar_clock", name: "Calendar and Clock", description: "Date, day, leap year, clock angle problems." },
      { code: "rea.di", name: "Data Interpretation", description: "Tables, bar/pie/line graphs based questions." },
    ],
  },

  // ── COMPUTER ─────────────────────────────────────────────────────────
  {
    code: "COMPUTER",
    name: "Computer Knowledge",
    weight: 1,
    topics: [
      { code: "comp.fundamentals", name: "Computer Fundamentals", description: "Generations, types, hardware-software, components." },
      { code: "comp.os", name: "Operating Systems", description: "Windows, Linux basics; file management." },
      { code: "comp.ms_office", name: "MS Office", description: "Word, Excel, PowerPoint, Access basics." },
      { code: "comp.internet", name: "Internet and E-mail", description: "Browsers, search engines, e-mail clients, attachments." },
      { code: "comp.networking", name: "Networking Basics", description: "LAN, WAN, MAN, internet protocols." },
      { code: "comp.security", name: "Cyber Security", description: "Viruses, antivirus, firewalls, phishing." },
      { code: "comp.dbms", name: "DBMS Basics", description: "Database concepts, RDBMS, SQL basics." },
      { code: "comp.programming", name: "Programming Basics", description: "Algorithm, flowchart, programming languages." },
    ],
  },
];

export async function seedHpsssbSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "HP_HPSSSB" } });
  if (!exam) {
    throw new Error("Run seedExams() first — HP_HPSSSB exam not found.");
  }
  console.log(`Seeding HPSSSB syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < hpsssbSyllabus.length; sIdx++) {
    const s = hpsssbSyllabus[sIdx];
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
  console.log(`✓ Seeded HPSSSB syllabus. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedHpsssbSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
