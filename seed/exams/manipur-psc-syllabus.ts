// Manipur PSC — Manipur Civil Services Combined Competitive Exam (MCSCCE)
// Prelims syllabus. Two objective papers — Paper-I General Studies (200
// marks) + Paper-II CSAT (200 marks, qualifying at 33%).
// Source: mpscmanipur.gov.in — Syllabi of MCSCCE (SyllabiOf_MCSCCE2022.pdf).
//
// Run after seedExams: npx tsx seed/exams/manipur-psc-syllabus.ts

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

export const manipurPscSyllabus: SubjectSeed[] = [
  // ── PAPER I — GENERAL STUDIES ────────────────────────────────────────
  {
    code: "GS_PAPER1",
    name: "General Studies (Paper I)",
    weight: 1,
    topics: [
      {
        code: "gs.current_affairs",
        name: "Current Events",
        description: "Current events of national and international importance.",
        subtopics: [
          { code: "gs.current_affairs.national", name: "National Events", description: "Major political, economic and policy developments in India." },
          { code: "gs.current_affairs.international", name: "International Events", description: "Global summits, treaties and India's foreign relations." },
          { code: "gs.current_affairs.awards", name: "Awards, Sports and Persons", description: "National/international awards, sports and notable personalities." },
        ],
      },
      {
        code: "gs.history",
        name: "History of India and Indian National Movement",
        description: "Ancient, medieval and modern Indian history with focus on freedom struggle.",
        subtopics: [
          { code: "gs.history.ancient", name: "Ancient India", description: "IVC, Vedic period, Mauryas, Guptas and post-Gupta era." },
          { code: "gs.history.medieval", name: "Medieval India", description: "Sultanate, Mughal empire and regional powers." },
          { code: "gs.history.modern", name: "Modern India", description: "British rule, social reform and economic policies." },
          { code: "gs.history.freedom", name: "Indian National Movement", description: "INC, Gandhian movements, revolutionary activities and partition." },
        ],
      },
      {
        code: "gs.geography",
        name: "Indian and World Geography",
        description: "Physical, social and economic geography of India and the world.",
        subtopics: [
          { code: "gs.geography.physical", name: "Physical Geography", description: "Earth, atmosphere, oceans, climate zones and landforms." },
          { code: "gs.geography.indian", name: "Geography of India", description: "Relief, drainage, climate, vegetation and resources." },
          { code: "gs.geography.economic", name: "Economic Geography", description: "Agriculture, minerals, industries and transport." },
          { code: "gs.geography.world", name: "World Geography", description: "Continents, major regions and economic zones." },
        ],
      },
      {
        code: "gs.polity",
        name: "Indian Polity and Governance",
        description: "Constitution, political system, Panchayati Raj, public policy, rights issues.",
        subtopics: [
          { code: "gs.polity.constitution", name: "Constitution of India", description: "Preamble, fundamental rights, duties and DPSP." },
          { code: "gs.polity.union_state", name: "Union and State Government", description: "Executive, legislature and judiciary at union and state levels." },
          { code: "gs.polity.local", name: "Panchayati Raj and ULBs", description: "73rd and 74th Amendments — local self-government." },
          { code: "gs.polity.public_policy", name: "Public Policy and Rights", description: "Policy formulation, RTI, NHRC and welfare measures." },
        ],
      },
      {
        code: "gs.economy",
        name: "Economic and Social Development",
        description: "Sustainable development, poverty, inclusion, demographics and social sector.",
        subtopics: [
          { code: "gs.economy.sustainable", name: "Sustainable Development", description: "SDGs, green economy and inclusive growth." },
          { code: "gs.economy.poverty", name: "Poverty and Inclusion", description: "Poverty estimation, social protection and financial inclusion." },
          { code: "gs.economy.demographics", name: "Demographics", description: "Population, migration and demographic dividend." },
          { code: "gs.economy.social_sector", name: "Social Sector Initiatives", description: "Health, education and welfare schemes." },
        ],
      },
      {
        code: "gs.environment",
        name: "Environmental Ecology, Biodiversity and Climate Change",
        description: "General issues — non-technical orientation.",
        subtopics: [
          { code: "gs.environment.ecology", name: "Ecology and Ecosystems", description: "Ecosystems, food chains and ecological balance." },
          { code: "gs.environment.biodiversity", name: "Biodiversity and Conservation", description: "Wildlife, protected areas and conservation efforts." },
          { code: "gs.environment.climate_change", name: "Climate Change", description: "IPCC, UNFCCC, Paris Agreement and India's commitments." },
        ],
      },
      {
        code: "gs.science",
        name: "General Science",
        description: "Everyday science and recent developments.",
        subtopics: [
          { code: "gs.science.basic", name: "Basic Science", description: "Physics, chemistry and biology basics relevant to everyday life." },
          { code: "gs.science.tech", name: "Science and Technology", description: "Space, IT, biotech and recent S&T developments in India." },
        ],
      },
    ],
  },

  // ── MANIPUR-SPECIFIC ─────────────────────────────────────────────────
  {
    code: "MN_SPECIFIC",
    name: "Manipur — History, Culture, Geography & Administration",
    weight: 1.4,
    topics: [
      {
        code: "mn.history",
        name: "History of Manipur",
        description: "History of Manipur from ancient kingdom to integration with India.",
        subtopics: [
          { code: "mn.history.ancient", name: "Ancient Manipur and Cheitharol Kumbaba", description: "Cheitharol Kumbaba — royal chronicle of Manipur kings since 33 CE." },
          { code: "mn.history.ningthouja", name: "Ningthouja Dynasty", description: "Pakhangba and the Ningthouja royal lineage of Kangleipak." },
          { code: "mn.history.bhagyachandra", name: "Bhagyachandra and Vaishnavism", description: "King Bhagyachandra (Jai Singh), introduction of Vaishnavism and Ras Leela." },
          { code: "mn.history.anglo_manipur", name: "Anglo-Manipur War 1891", description: "Anglo-Manipur War, Tikendrajit, Khongjom battle and British annexation." },
          { code: "mn.history.merger", name: "Merger Agreement 1949", description: "Manipur Merger Agreement of 21 September 1949 with the Indian Union." },
          { code: "mn.history.statehood", name: "Statehood 1972", description: "Manipur attaining full statehood under the North-Eastern Areas (Reorganisation) Act 1971." },
        ],
      },
      {
        code: "mn.geography",
        name: "Geography of Manipur",
        description: "Physical and economic geography of Manipur.",
        subtopics: [
          { code: "mn.geography.physical", name: "Physical Features", description: "Imphal valley, surrounding hill ranges and Loktak Lake." },
          { code: "mn.geography.loktak", name: "Loktak Lake and Phumdis", description: "Loktak — largest freshwater lake in NE India, floating phumdis and Keibul Lamjao." },
          { code: "mn.geography.districts", name: "Districts of Manipur", description: "Imphal East/West, Bishnupur, Thoubal, Churachandpur, Ukhrul and others." },
          { code: "mn.geography.flora_fauna", name: "Flora and Fauna", description: "Sangai (brow-antlered deer) — state animal, Shiroy lily and Keibul Lamjao National Park." },
        ],
      },
      {
        code: "mn.culture",
        name: "Culture of Manipur",
        description: "Meiteilon, classical dance, sports and traditions.",
        subtopics: [
          { code: "mn.meiteilon_culture", name: "Meiteilon (Manipuri) Language and Meetei Mayek", description: "Meiteilon — Eighth Schedule language, Meetei Mayek script and literature." },
          { code: "mn.culture.dance", name: "Manipuri Classical Dance", description: "Manipuri Ras Leela — one of eight classical Indian dance forms." },
          { code: "mn.culture.polo", name: "Polo — Sagol Kangjei", description: "Polo (Sagol Kangjei) — origin of modern polo in Manipur, Imphal Polo Ground." },
          { code: "mn.culture.festivals", name: "Festivals of Manipur", description: "Yaoshang, Lai Haraoba, Cheiraoba, Kut, Ningol Chakouba, Gaan-Ngai." },
          { code: "mn.culture.thang_ta", name: "Thang-Ta and Martial Arts", description: "Thang-Ta — traditional Meitei martial art of sword and spear." },
          { code: "mn.culture.tribes", name: "Naga and Kuki-Chin-Mizo Tribes", description: "Tangkhul, Mao, Maram, Thadou, Hmar and other hill tribes of Manipur." },
        ],
      },
      {
        code: "mn.polity",
        name: "Manipur Polity and Special Provisions",
        description: "Administrative structure, AFSPA and ILP.",
        subtopics: [
          { code: "mn.polity.assembly", name: "Manipur Legislative Assembly", description: "60-member Manipur Legislative Assembly and Hill Areas Committee." },
          { code: "mn.polity.afspa", name: "AFSPA in Manipur", description: "Armed Forces (Special Powers) Act 1958, Irom Sharmila's protest and partial repeal." },
          { code: "mn.polity.ilp", name: "Inner Line Permit (ILP)", description: "Extension of ILP regime to Manipur in 2019 under Bengal Eastern Frontier Regulation 1873." },
          { code: "mn.polity.adc", name: "Autonomous District Councils", description: "Six Autonomous District Councils in Manipur's hill districts." },
        ],
      },
      {
        code: "mn.economy",
        name: "Economy of Manipur",
        description: "Agriculture, handlooms and trade with Southeast Asia.",
        subtopics: [
          { code: "mn.economy.agriculture", name: "Agriculture and Horticulture", description: "Rice cultivation in Imphal valley, jhum cultivation in hills, pineapple and citrus." },
          { code: "mn.economy.handloom", name: "Handloom and Handicraft", description: "Moirang Phee, Phanek, Wangkhei Phee — Manipuri handlooms and weaving traditions." },
          { code: "mn.economy.act_east", name: "Act East Policy and Border Trade", description: "Moreh-Tamu border trade with Myanmar; India's Act East gateway." },
        ],
      },
    ],
  },

  // ── PAPER II — CSAT ──────────────────────────────────────────────────
  {
    code: "CSAT",
    name: "Civil Services Aptitude Test (Paper II)",
    weight: 0.5,
    topics: [
      { code: "csat.comprehension", name: "Comprehension", description: "Reading comprehension passages from contemporary topics." },
      { code: "csat.interpersonal", name: "Interpersonal Skills including Communication", description: "Communication and interpersonal skills." },
      { code: "csat.logical_reasoning", name: "Logical Reasoning and Analytical Ability", description: "Syllogism, deductive reasoning and analytical puzzles." },
      { code: "csat.decision_making", name: "Decision Making and Problem Solving", description: "Situational judgement and ethical decision making." },
      { code: "csat.mental_ability", name: "General Mental Ability", description: "Number series, coding-decoding, direction sense, blood relations." },
      { code: "csat.numeracy", name: "Basic Numeracy", description: "Numbers, magnitude, percentage, ratio (Class X level)." },
      { code: "csat.data_interpretation", name: "Data Interpretation", description: "Charts, graphs, tables and data sufficiency (Class X level)." },
    ],
  },
];

export async function seedManipurPscSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "MN_MPSC" } });
  if (!exam) {
    throw new Error("Run seedExams() first — MN_MPSC exam not found.");
  }
  console.log(`Seeding Manipur PSC syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < manipurPscSyllabus.length; sIdx++) {
    const s = manipurPscSyllabus[sIdx];
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
  seedManipurPscSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
