// Tripura PSC — Tripura Civil Services (TCS) Combined Competitive
// Examination Prelims syllabus. Single objective General Studies paper
// of 200 marks (2.5 hours) covering India + Tripura/NE specific topics.
// Source: tpsc.tripura.gov.in — Syllabus and Schemes (TCS notification).
//
// Run after seedExams: npx tsx seed/exams/tripura-psc-syllabus.ts

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

export const tripuraPscSyllabus: SubjectSeed[] = [
  // ── GENERAL STUDIES ──────────────────────────────────────────────────
  {
    code: "GS_PAPER1",
    name: "General Studies",
    weight: 1,
    topics: [
      {
        code: "gs.history",
        name: "History",
        description: "Ancient, medieval and modern Indian history.",
        subtopics: [
          { code: "gs.history.ancient", name: "Ancient India", description: "IVC, Vedic period, Mauryas, Guptas." },
          { code: "gs.history.medieval", name: "Medieval India", description: "Sultanate, Mughal empire and regional powers." },
          { code: "gs.history.modern", name: "Modern India", description: "British rule, 1857 and reform movements." },
          { code: "gs.history.freedom", name: "Indian Freedom Struggle", description: "INC, Gandhi, revolutionaries and Partition." },
        ],
      },
      {
        code: "gs.polity",
        name: "Polity",
        description: "Indian Constitution, governance and political institutions.",
        subtopics: [
          { code: "gs.polity.constitution", name: "Constitution of India", description: "Preamble, fundamental rights, DPSP, amendments." },
          { code: "gs.polity.union_state", name: "Union and State Government", description: "Executive, legislature, judiciary." },
          { code: "gs.polity.local", name: "Local Self-Government", description: "Panchayati Raj, ULBs and Sixth Schedule." },
        ],
      },
      {
        code: "gs.geography",
        name: "Geography",
        description: "Indian and world geography — physical and economic.",
        subtopics: [
          { code: "gs.geography.physical", name: "Physical Geography", description: "Earth, atmosphere, climate and landforms." },
          { code: "gs.geography.indian", name: "Geography of India", description: "Relief, drainage, climate, soils." },
          { code: "gs.geography.economic", name: "Economic Geography", description: "Agriculture, minerals, industry." },
        ],
      },
      {
        code: "gs.economy",
        name: "Economy",
        description: "Indian economy and current developments.",
        subtopics: [
          { code: "gs.economy.indian", name: "Indian Economy", description: "Planning, NITI Aayog, banking and budget." },
          { code: "gs.economy.poverty", name: "Poverty and Inclusion", description: "Poverty alleviation, welfare schemes." },
          { code: "gs.economy.external", name: "External Sector", description: "Trade, FDI, BoP and forex." },
        ],
      },
      {
        code: "gs.science_environment",
        name: "General Science and Environment",
        description: "Everyday science and environmental issues.",
        subtopics: [
          { code: "gs.science.basic", name: "Basic Science", description: "Physics, chemistry, biology basics." },
          { code: "gs.science.tech", name: "Science and Technology", description: "Recent S&T developments." },
          { code: "gs.environment.ecology", name: "Environment and Ecology", description: "Ecosystems, biodiversity, climate change." },
        ],
      },
      {
        code: "gs.current_affairs",
        name: "Current Affairs",
        description: "National and international current affairs.",
        subtopics: [
          { code: "gs.current_affairs.national", name: "National Affairs", description: "Recent political, economic, policy developments." },
          { code: "gs.current_affairs.international", name: "International Affairs", description: "Global events and India's foreign policy." },
        ],
      },
    ],
  },

  // ── TRIPURA / NORTH-EAST SPECIFIC ────────────────────────────────────
  {
    code: "TR_SPECIFIC",
    name: "Tripura and North-Eastern States",
    weight: 1.4,
    topics: [
      {
        code: "tr.history",
        name: "History of Tripura",
        description: "From Twipra Kingdom to integration with India.",
        subtopics: [
          { code: "tr.manikya_dynasty", name: "Manikya Dynasty", description: "Manikya dynasty (c. 1400-1949) — Maha Manikya, Bir Bikram and the Twipra Kingdom." },
          { code: "tr.history.bengal_relations", name: "Tripura-Bengal Relations", description: "Cultural acculturation with Bengali Hindus, court adopting Bengali." },
          { code: "tr.history.british", name: "British Paramountcy", description: "Tripura as a princely state under British paramountcy." },
          { code: "tr.history.uprisings", name: "Tribal Uprisings", description: "Reang Uprising, Jamatia Uprising and Janashiksha Movement." },
          { code: "tr.history.merger", name: "Merger with India 1949", description: "Tripura Merger Agreement of 9 September 1949 signed by Maharani Kanchan Prabha Devi." },
          { code: "tr.history.statehood", name: "Statehood 1972", description: "Tripura full statehood on 21 January 1972 under NE Reorganisation Act 1971." },
        ],
      },
      {
        code: "tr.geography",
        name: "Geography of Tripura",
        description: "Physical features and natural resources.",
        subtopics: [
          { code: "tr.geography.physical", name: "Physical Features", description: "Hill ranges (Jampui, Atharamura, Longtharai), Gomati and Khowai rivers." },
          { code: "tr.geography.districts", name: "Districts of Tripura", description: "West, South, North, Dhalai, Khowai, Sepahijala, Gomati, Unakoti." },
          { code: "tr.geography.flora_fauna", name: "Flora and Fauna", description: "Sepahijala, Trishna and Rowa wildlife sanctuaries; Phayre's leaf monkey." },
          { code: "tr.geography.borders", name: "International Border", description: "856 km border with Bangladesh — third longest international border for an Indian state." },
        ],
      },
      {
        code: "tr.culture",
        name: "Culture of Tripura",
        description: "Multi-ethnic culture — Bengali, Tripuri, Bishnupriya Manipuri.",
        subtopics: [
          { code: "tr.bengali_culture", name: "Bengali Culture in Tripura", description: "Bengali-speaking majority, Tagore connection with Tripura royalty." },
          { code: "tr.bishnupriya_culture", name: "Bishnupriya Manipuri Culture", description: "Bishnupriya Manipuri community — language, Raas Leela and Bishnupriya Manipuri Day." },
          { code: "tr.kokborok_culture", name: "Kokborok Language and Culture", description: "Kokborok — Tibeto-Burman language of Tripuri tribes; recognised in 1979." },
          { code: "tr.culture.tribes", name: "Tribes of Tripura", description: "Tripuri, Reang (Bru), Jamatia, Chakma, Halam, Mog, Garo and others." },
          { code: "tr.culture.festivals", name: "Festivals", description: "Garia Puja, Kharchi Puja, Ker Puja, Hojagiri dance and Durga Puja." },
          { code: "tr.culture.dance", name: "Hojagiri and Folk Dances", description: "Hojagiri (Reang), Garia, Lebang Boomani — folk dances of Tripura." },
        ],
      },
      {
        code: "tr.economy",
        name: "Economy of Tripura",
        description: "Agriculture, plantation and bamboo economy.",
        subtopics: [
          { code: "tr.economy.tea", name: "Tea Industry", description: "Tripura tea — fifth largest tea producing state, ~54 tea estates." },
          { code: "tr.bamboo_economy", name: "Bamboo Economy", description: "Bamboo and cane handicrafts — 19 species of bamboo, Bamboo Mission." },
          { code: "tr.economy.rubber", name: "Rubber Plantation", description: "Tripura — second largest natural rubber producer after Kerala." },
          { code: "tr.economy.agriculture", name: "Agriculture", description: "Rice, jhum cultivation, pineapple (Queen variety) and Tripura's GI-tagged products." },
          { code: "tr.economy.gas", name: "Natural Gas", description: "Natural gas reserves — ONGC operations, gas-based power generation." },
        ],
      },
      {
        code: "tr.polity",
        name: "Tripura Polity",
        description: "Administrative structure and tribal autonomy.",
        subtopics: [
          { code: "tr.polity.assembly", name: "Tripura Legislative Assembly", description: "60-member Tripura Legislative Assembly." },
          { code: "tr.polity.ttaadc", name: "TTAADC — 6th Schedule Council", description: "Tripura Tribal Areas Autonomous District Council under Sixth Schedule." },
          { code: "tr.polity.bru_settlement", name: "Bru-Reang Resettlement", description: "Bru (Reang) refugee resettlement agreement of January 2020." },
        ],
      },
      {
        code: "tr.ne_states",
        name: "North-Eastern States Awareness",
        description: "Geography, culture and current affairs of NE states.",
        subtopics: [
          { code: "tr.ne.geography", name: "NE Geography and Connectivity", description: "Eight Sister states, Siliguri Corridor and connectivity initiatives." },
          { code: "tr.ne.act_east", name: "Act East Policy", description: "India's Act East Policy and NE region's role." },
          { code: "tr.ne.donor", name: "DoNER and NE Schemes", description: "Ministry of DoNER, NEC and NE-specific development schemes." },
        ],
      },
    ],
  },

  // ── ENGLISH, MENTAL ABILITY & NUMERICAL ──────────────────────────────
  {
    code: "ENGLISH_APTITUDE",
    name: "English, Mental Ability & Numerical Ability",
    weight: 0.6,
    topics: [
      { code: "eng.composition", name: "English Composition", description: "Synonyms, antonyms, phrases, idioms, prepositions, articles." },
      { code: "eng.comprehension", name: "Comprehension and Sentence Order", description: "Reading comprehension, sentence ordering, error spotting." },
      { code: "apt.mental_ability", name: "General Mental Ability", description: "Logical reasoning, series, coding-decoding, blood relations." },
      { code: "apt.numerical_ability", name: "Numerical Ability", description: "Arithmetic — percentages, ratio, time/work, profit/loss." },
      { code: "apt.data_interpretation", name: "Data Interpretation", description: "Tables, bar/line/pie charts." },
    ],
  },
];

export async function seedTripuraPscSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "TR_TPSC" } });
  if (!exam) {
    throw new Error("Run seedExams() first — TR_TPSC exam not found.");
  }
  console.log(`Seeding Tripura PSC syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < tripuraPscSyllabus.length; sIdx++) {
    const s = tripuraPscSyllabus[sIdx];
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
  seedTripuraPscSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
