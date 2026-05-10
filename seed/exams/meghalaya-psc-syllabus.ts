// Meghalaya PSC — Meghalaya Civil Services (MCS) Prelims syllabus.
// Single GS objective paper covering Indian + Meghalaya specific topics.
// Source: mpsc.meghalaya.gov.in — MCS Syllabus 2025 PDF + MPSC official syllabus page.
//
// Run after seedExams: npx tsx seed/exams/meghalaya-psc-syllabus.ts

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

export const meghalayaPscSyllabus: SubjectSeed[] = [
  // ── GENERAL STUDIES ──────────────────────────────────────────────────
  {
    code: "GS_PAPER1",
    name: "General Studies",
    weight: 1,
    topics: [
      {
        code: "gs.current_affairs",
        name: "Current Events",
        description: "National and international current events of contemporary importance.",
        subtopics: [
          { code: "gs.current_affairs.national", name: "National Affairs", description: "Recent political, economic and policy developments in India." },
          { code: "gs.current_affairs.international", name: "International Affairs", description: "Major world events, summits and India's foreign relations." },
        ],
      },
      {
        code: "gs.history",
        name: "History of India and Indian National Movement",
        description: "Ancient to modern Indian history including the freedom struggle.",
        subtopics: [
          { code: "gs.history.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Mauryas, Guptas and post-Gupta period." },
          { code: "gs.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals, Marathas and regional kingdoms." },
          { code: "gs.history.modern", name: "Modern India", description: "British rule, 1857, social reform movements." },
          { code: "gs.history.freedom", name: "Indian National Movement", description: "INC, Gandhian phase, revolutionary movements and independence." },
        ],
      },
      {
        code: "gs.geography",
        name: "Indian and World Geography",
        description: "Physical, social and economic geography of India and the world.",
        subtopics: [
          { code: "gs.geography.physical", name: "Physical Geography", description: "Earth, atmosphere, climate, oceans and landforms." },
          { code: "gs.geography.indian", name: "Geography of India", description: "Relief, climate, drainage, soils and natural vegetation." },
          { code: "gs.geography.economic", name: "Economic Geography", description: "Agriculture, mineral and industrial distribution." },
        ],
      },
      {
        code: "gs.polity",
        name: "Indian Polity and Governance",
        description: "Constitution, political system, Panchayati Raj, public policy and rights.",
        subtopics: [
          { code: "gs.polity.constitution", name: "Constitution of India", description: "Preamble, fundamental rights, duties, DPSP and amendments." },
          { code: "gs.polity.union_state", name: "Union and State Government", description: "Executive, legislature, judiciary at union and state levels." },
          { code: "gs.polity.local", name: "Panchayati Raj and Local Bodies", description: "73rd and 74th Amendments — local self-government." },
        ],
      },
      {
        code: "gs.economy",
        name: "Economic and Social Development",
        description: "Sustainable development, poverty, inclusion, demographics, social sector.",
        subtopics: [
          { code: "gs.economy.macro", name: "Indian Economy", description: "Planning, NITI Aayog, monetary and fiscal policy." },
          { code: "gs.economy.poverty", name: "Poverty and Inclusion", description: "Poverty alleviation, financial inclusion and welfare schemes." },
          { code: "gs.economy.demographics", name: "Demographics and Human Development", description: "Population, HDI, education and health indicators." },
        ],
      },
      {
        code: "gs.environment",
        name: "Environmental Ecology, Biodiversity and Climate Change",
        description: "General issues — non-technical.",
        subtopics: [
          { code: "gs.environment.ecology", name: "Ecology and Biodiversity", description: "Ecosystems, biodiversity hotspots and conservation." },
          { code: "gs.environment.climate_change", name: "Climate Change", description: "UNFCCC, Paris Agreement and India's NDCs." },
        ],
      },
      {
        code: "gs.science",
        name: "General Science",
        description: "Everyday science and recent developments.",
        subtopics: [
          { code: "gs.science.basic", name: "Basic Science", description: "Basic concepts in physics, chemistry, biology." },
          { code: "gs.science.tech", name: "Science and Technology", description: "Space, IT, biotech and recent innovations." },
        ],
      },
    ],
  },

  // ── MEGHALAYA-SPECIFIC ───────────────────────────────────────────────
  {
    code: "ML_SPECIFIC",
    name: "Meghalaya — History, Culture, Geography & Administration",
    weight: 1.4,
    topics: [
      {
        code: "ml.history",
        name: "History of Meghalaya",
        description: "Pre-British, British and post-Independence history of Meghalaya.",
        subtopics: [
          { code: "ml.history.tribal_states", name: "Khasi, Jaintia and Garo Pre-British States", description: "Khasi syiemships, Jaintia kingdom and Garo A·king system before British rule." },
          { code: "ml.history.british", name: "British Annexation", description: "Anglo-Khasi War (1829-33) led by U Tirot Sing and British annexation." },
          { code: "ml.history.tirot_sing", name: "U Tirot Sing and Early Resistance", description: "Tirot Sing Syiem, Pa Togan Sangma and Khasi-Jaintia resistance." },
          { code: "ml.history.statehood", name: "Statehood of Meghalaya 1972", description: "Autonomous state in 1970, full statehood on 21 January 1972." },
        ],
      },
      {
        code: "ml.geography",
        name: "Geography of Meghalaya",
        description: "Physical and economic geography of Meghalaya.",
        subtopics: [
          { code: "ml.geography.physical", name: "Physical Features", description: "Khasi, Jaintia and Garo Hills — Meghalaya plateau." },
          { code: "ml.geography.rainfall", name: "Cherrapunji and Mawsynram", description: "Mawsynram and Cherrapunji (Sohra) — wettest places on earth." },
          { code: "ml.geography.caves_rivers", name: "Caves and Rivers", description: "Mawsmai, Krem Liat Prah caves; Umiam, Myntdu and Simsang rivers." },
          { code: "ml.geography.biodiversity", name: "Biodiversity", description: "Nokrek Biosphere Reserve, Balpakram National Park and sacred groves." },
        ],
      },
      {
        code: "ml.culture",
        name: "Culture of Meghalaya",
        description: "Khasi, Jaintia and Garo culture, festivals and matrilineal society.",
        subtopics: [
          { code: "ml.khasi_culture", name: "Khasi Culture", description: "Khasi language, Ka Pomblang Nongkrem, Shad Suk Mynsiem and Niam Khasi religion." },
          { code: "ml.jaintia_culture", name: "Jaintia (Pnar) Culture", description: "Pnar language, Behdienkhlam festival and Jaintia traditions." },
          { code: "ml.garo_culture", name: "Garo Culture", description: "Garo language (A·chik), Wangala (100 Drums) festival and Songsarek faith." },
          { code: "ml.matrilineal", name: "Matrilineal Society", description: "Khasi and Garo matrilineal kinship — Ka Khaduh, mahari clan system." },
          { code: "ml.music_dance", name: "Music and Dance", description: "Shad Suk Mynsiem, Wangala and Behdienkhlam dances." },
          { code: "ml.cuisine", name: "Cuisine of Meghalaya", description: "Jadoh, Dohneiiong, Pukhlein, Tungrymbai and Nakham bitchi." },
        ],
      },
      {
        code: "ml.economy",
        name: "Economy of Meghalaya",
        description: "Agriculture, mining and tourism.",
        subtopics: [
          { code: "ml.economy.agriculture", name: "Agriculture and Horticulture", description: "Jhum cultivation, Khasi mandarin, ginger, turmeric and pineapple." },
          { code: "ml.economy.coal_mining", name: "Coal Mining and Rat-hole Mining", description: "Coal mining in Jaintia Hills, NGT ban on rat-hole mining (2014)." },
          { code: "ml.economy.limestone", name: "Limestone and Cement", description: "Limestone deposits and cement industries in East Jaintia Hills." },
          { code: "ml.economy.tourism", name: "Tourism", description: "Living root bridges, Dawki river, Shillong Cherry Blossom Festival." },
        ],
      },
      {
        code: "ml.polity",
        name: "Meghalaya Polity and 6th Schedule",
        description: "Administrative structure and tribal autonomy.",
        subtopics: [
          { code: "ml.polity.6th_schedule", name: "Sixth Schedule and ADCs", description: "KHADC, JHADC and GHADC — Autonomous District Councils under Sixth Schedule." },
          { code: "ml.polity.assembly", name: "Meghalaya Legislative Assembly", description: "60-member Meghalaya Legislative Assembly and political evolution." },
          { code: "ml.polity.land_laws", name: "Land Laws and Customary Practices", description: "Customary land tenure — Ri-Raid, Ri-Kynti and clan ownership." },
        ],
      },
    ],
  },

  // ── REASONING & APTITUDE ─────────────────────────────────────────────
  {
    code: "APTITUDE",
    name: "Mental Ability and Aptitude",
    weight: 0.5,
    topics: [
      { code: "apt.numerical", name: "Numerical Aptitude", description: "Arithmetic — percentages, ratio, time/work, profit/loss." },
      { code: "apt.reasoning", name: "Logical and Analytical Reasoning", description: "Series, coding-decoding, blood relations, syllogism." },
      { code: "apt.data_interpretation", name: "Data Interpretation", description: "Tables, bar/line/pie charts." },
    ],
  },
];

export async function seedMeghalayaPscSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "ML_MPSC" } });
  if (!exam) {
    throw new Error("Run seedExams() first — ML_MPSC exam not found.");
  }
  console.log(`Seeding Meghalaya PSC syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < meghalayaPscSyllabus.length; sIdx++) {
    const s = meghalayaPscSyllabus[sIdx];
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
  seedMeghalayaPscSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
