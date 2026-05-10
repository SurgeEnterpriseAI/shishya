// Sikkim PSC — Sikkim State Civil Service (SSCS / SCS) Prelims syllabus.
// Two objective papers (200 marks each, 2 hours) — Paper I General Studies
// and Paper II Aptitude. 0.33 negative marking per wrong answer.
// Source: spscskm.gov.in (also referenced as spsc.sikkim.gov.in).
//
// Run after seedExams: npx tsx seed/exams/sikkim-psc-syllabus.ts

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

export const sikkimPscSyllabus: SubjectSeed[] = [
  // ── GENERAL STUDIES ──────────────────────────────────────────────────
  {
    code: "GS_PAPER1",
    name: "General Studies (Paper I)",
    weight: 1,
    topics: [
      {
        code: "gs.history",
        name: "History",
        description: "Ancient, medieval and modern Indian history.",
        subtopics: [
          { code: "gs.history.ancient", name: "Ancient India", description: "IVC, Vedic age, Mauryas and Guptas." },
          { code: "gs.history.medieval", name: "Medieval India", description: "Sultanate, Mughal empire and regional powers." },
          { code: "gs.history.modern", name: "Modern India", description: "British rule, 1857 and social reform." },
          { code: "gs.history.freedom", name: "Indian National Movement", description: "INC, Gandhian phase and revolutionary movements." },
        ],
      },
      {
        code: "gs.polity",
        name: "Indian Polity",
        description: "Constitution, political system and governance.",
        subtopics: [
          { code: "gs.polity.constitution", name: "Constitution of India", description: "Preamble, fundamental rights, DPSP, amendments." },
          { code: "gs.polity.union_state", name: "Union and State Government", description: "Executive, legislature, judiciary." },
          { code: "gs.polity.local", name: "Panchayati Raj and ULBs", description: "73rd and 74th Amendments." },
        ],
      },
      {
        code: "gs.geography",
        name: "Geography",
        description: "Indian and world geography.",
        subtopics: [
          { code: "gs.geography.physical", name: "Physical Geography", description: "Earth, atmosphere, oceans and climate." },
          { code: "gs.geography.indian", name: "Geography of India", description: "Relief, climate, drainage and resources." },
          { code: "gs.geography.world", name: "World Geography", description: "Continents, major regions and economic zones." },
        ],
      },
      {
        code: "gs.economy",
        name: "Economics",
        description: "Indian economy and global economic trends.",
        subtopics: [
          { code: "gs.economy.indian", name: "Indian Economy", description: "Planning, NITI Aayog, banking, fiscal and monetary policy." },
          { code: "gs.economy.global", name: "Global Economic Trends", description: "WTO, IMF, World Bank and global economic indicators." },
          { code: "gs.economy.development", name: "Development Indicators", description: "GDP, HDI, poverty and SDGs." },
        ],
      },
      {
        code: "gs.science",
        name: "Science and Technology",
        description: "General science and recent developments.",
        subtopics: [
          { code: "gs.science.basic", name: "Basic Science", description: "Physics, chemistry, biology basics." },
          { code: "gs.science.tech", name: "Science and Technology", description: "Space, IT, biotech and recent innovations." },
          { code: "gs.environment.ecology", name: "Environment and Ecology", description: "Biodiversity, climate change and conservation." },
        ],
      },
      {
        code: "gs.current_affairs",
        name: "Current Affairs",
        description: "National and international events of recent importance.",
        subtopics: [
          { code: "gs.current_affairs.national", name: "National Affairs", description: "Recent political, economic and policy developments." },
          { code: "gs.current_affairs.international", name: "International Affairs", description: "Global events, summits and India's relations." },
        ],
      },
    ],
  },

  // ── SIKKIM-SPECIFIC ──────────────────────────────────────────────────
  {
    code: "SK_SPECIFIC",
    name: "Sikkim — History, Culture, Geography & Administration",
    weight: 1.5,
    topics: [
      {
        code: "sk.history",
        name: "History of Sikkim",
        description: "Sikkim history from Namgyal dynasty to merger with India.",
        subtopics: [
          { code: "sk.chogyal_dynasty", name: "Chogyal Dynasty", description: "Namgyal/Chogyal dynasty founded 1642 with Phuntsog Namgyal — 'Dharma Raja' lineage." },
          { code: "sk.history.padmasambhava", name: "Guru Padmasambhava and Buddhism", description: "Arrival of Guru Padmasambhava in 8th century — introduction of Buddhism to Sikkim." },
          { code: "sk.history.british", name: "British Influence", description: "Treaty of Titalia (1817), British protectorate and Younghusband mission." },
          { code: "sk.history.protectorate", name: "Indian Protectorate Era", description: "India-Sikkim Treaty 1950 — Sikkim as Indian protectorate, Chogyal as constitutional head." },
          { code: "sk.history.kazi", name: "Kazi Lhendup Dorjee and SSC", description: "Sikkim State Congress, Kazi Lhendup Dorjee and democratic movement." },
          { code: "sk.history.merger_1975", name: "Sikkim Merger 1975", description: "Referendum of 14 April 1975, 36th Constitutional Amendment — Sikkim becomes 22nd state of India." },
        ],
      },
      {
        code: "sk.geography",
        name: "Geography of Sikkim",
        description: "Physical features, glaciers and biodiversity.",
        subtopics: [
          { code: "sk.geography.physical", name: "Physical Features", description: "Eastern Himalayas, Kanchenjunga (3rd highest peak), Teesta and Rangit rivers." },
          { code: "sk.geography.districts", name: "Districts of Sikkim", description: "Six districts — Gangtok, Mangan (North), Namchi, Gyalshing, Soreng, Pakyong." },
          { code: "sk.geography.glaciers", name: "Glaciers and Lakes", description: "Zemu glacier, Tsomgo (Changu) Lake, Gurudongmar Lake, Khecheopalri Lake." },
          { code: "sk.geography.biosphere", name: "Khangchendzonga Biosphere Reserve", description: "Khangchendzonga National Park — UNESCO World Heritage Mixed Site (2016)." },
        ],
      },
      {
        code: "sk.culture",
        name: "Culture and Religion of Sikkim",
        description: "Buddhism, Lepcha-Bhutia-Nepali culture.",
        subtopics: [
          { code: "sk.buddhism", name: "Buddhism in Sikkim", description: "Vajrayana Buddhism, monasteries — Rumtek, Pemayangtse, Tashiding, Enchey." },
          { code: "sk.culture.lepcha", name: "Lepcha Community", description: "Lepchas — original inhabitants ('Rongkup'), Mutanchi Rongkup language, Mun-Bongthing animism." },
          { code: "sk.culture.bhutia", name: "Bhutia Community", description: "Bhutia of Tibetan origin, Sikkimese (Bhotia) language and Buddhist traditions." },
          { code: "sk.culture.nepali", name: "Nepali Community", description: "Nepali-speaking majority, Limboo, Tamang, Rai, Gurung subgroups." },
          { code: "sk.culture.festivals", name: "Festivals", description: "Losar, Saga Dawa, Pang Lhabsol, Bhumchu, Maghe Sankranti and Tihar." },
          { code: "sk.culture.languages", name: "Languages", description: "Eleven official languages — Nepali, Bhutia, Lepcha, Limboo, Newari, Gurung, Magar, Sherpa, Tamang, Rai, Sunwar." },
        ],
      },
      {
        code: "sk.economy",
        name: "Economy of Sikkim",
        description: "Organic farming, hydropower and tourism.",
        subtopics: [
          { code: "sk.organic_farming", name: "Organic Farming", description: "Sikkim — first fully organic state of India (declared January 2016), FAO Future Policy Gold Award 2018." },
          { code: "sk.economy.hydropower", name: "Hydropower", description: "Teesta hydropower projects — major hydroelectric resource of Sikkim." },
          { code: "sk.economy.tourism", name: "Tourism", description: "Eco-tourism, Nathula pass, Yumthang Valley and adventure tourism." },
          { code: "sk.economy.cardamom", name: "Cardamom and Horticulture", description: "Sikkim — largest producer of large cardamom; flowers, fruits and tea." },
          { code: "sk.economy.pharma", name: "Pharmaceuticals", description: "Pharmaceutical hub at Sikkim — fiscal incentives and major pharma units." },
        ],
      },
      {
        code: "sk.polity",
        name: "Sikkim Polity and Special Provisions",
        description: "Article 371F and administrative framework.",
        subtopics: [
          { code: "sk.article_371f", name: "Article 371F", description: "Special provisions for Sikkim — protects pre-merger laws, land rights and Sikkim Subject Regulation 1961." },
          { code: "sk.polity.assembly", name: "Sikkim Legislative Assembly", description: "32-member Sikkim Legislative Assembly with reservation for Sangha and BL/Lepcha-Bhutia seats." },
          { code: "sk.polity.subject", name: "Sikkim Subject and Old Settlers", description: "Sikkim Subject Regulation 1961 — defines Sikkimese identity for revenue and tax purposes." },
        ],
      },
    ],
  },

  // ── PAPER II — APTITUDE ──────────────────────────────────────────────
  {
    code: "APTITUDE",
    name: "Aptitude (Paper II)",
    weight: 0.5,
    topics: [
      { code: "apt.numerical", name: "Numerical Aptitude", description: "Arithmetic — percentages, ratio, time/work, profit/loss, SI/CI." },
      { code: "apt.reasoning_logical", name: "Logical Reasoning", description: "Series, coding-decoding, blood relations, syllogism." },
      { code: "apt.reasoning_analytical", name: "Analytical Ability", description: "Statement-conclusion, cause-effect, puzzles, seating arrangement." },
      { code: "apt.comprehension", name: "Reading Comprehension", description: "Reading comprehension passages and inferential questions." },
      { code: "apt.data_interpretation", name: "Data Interpretation", description: "Tables, bar/line/pie charts and data sufficiency." },
    ],
  },
];

export async function seedSikkimPscSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "SK_SPSC" } });
  if (!exam) {
    throw new Error("Run seedExams() first — SK_SPSC exam not found.");
  }
  console.log(`Seeding Sikkim PSC syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < sikkimPscSyllabus.length; sIdx++) {
    const s = sikkimPscSyllabus[sIdx];
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
  seedSikkimPscSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
