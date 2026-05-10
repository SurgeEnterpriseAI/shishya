// Mizoram PSC — Mizoram Civil Services (MCS) Prelims syllabus.
// Single GS objective paper + Aptitude paper (qualifying).
// Source: mpsc.mizoram.gov.in — Direct Recruitment Syllabus pages.
//
// Run after seedExams: npx tsx seed/exams/mizoram-psc-syllabus.ts

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

export const mizoramPscSyllabus: SubjectSeed[] = [
  // ── GENERAL STUDIES ──────────────────────────────────────────────────
  {
    code: "GS_PAPER1",
    name: "General Studies",
    weight: 1,
    topics: [
      {
        code: "gs.current_affairs",
        name: "Current Events of National and International Importance",
        description: "Recent national and international affairs.",
        subtopics: [
          { code: "gs.current_affairs.national", name: "National Affairs", description: "Recent political, economic and policy developments in India." },
          { code: "gs.current_affairs.international", name: "International Affairs", description: "Global summits, treaties and India's foreign policy." },
        ],
      },
      {
        code: "gs.history",
        name: "History of India and Indian National Movement",
        description: "Ancient to modern India and the freedom struggle.",
        subtopics: [
          { code: "gs.history.ancient", name: "Ancient India", description: "IVC, Vedic age, Mauryas and Guptas." },
          { code: "gs.history.medieval", name: "Medieval India", description: "Sultanate, Mughal empire and regional powers." },
          { code: "gs.history.modern", name: "Modern India", description: "British rule, 1857 revolt and social reform." },
          { code: "gs.history.freedom", name: "Indian National Movement", description: "INC, Gandhian phase and independence." },
        ],
      },
      {
        code: "gs.geography",
        name: "Indian and World Geography",
        description: "Physical, social and economic geography of India and the world.",
        subtopics: [
          { code: "gs.geography.physical", name: "Physical Geography", description: "Earth, atmosphere, climate and landforms." },
          { code: "gs.geography.indian", name: "Geography of India", description: "Relief, drainage, climate, soils and resources." },
          { code: "gs.geography.economic", name: "Economic Geography", description: "Agriculture, minerals, industries and transport." },
        ],
      },
      {
        code: "gs.polity",
        name: "Indian Polity and Governance",
        description: "Constitution, political system, Panchayati Raj, public policy and rights.",
        subtopics: [
          { code: "gs.polity.constitution", name: "Constitution of India", description: "Preamble, fundamental rights, DPSP and amendments." },
          { code: "gs.polity.union_state", name: "Union and State Government", description: "Executive, legislature, judiciary." },
          { code: "gs.polity.local", name: "Panchayati Raj and ULBs", description: "Local self-government — 73rd and 74th Amendments." },
        ],
      },
      {
        code: "gs.economy",
        name: "Economic and Social Development",
        description: "Sustainable development, poverty, inclusion, demographics, social sector.",
        subtopics: [
          { code: "gs.economy.indian", name: "Indian Economy", description: "Planning, NITI Aayog, banking and budget." },
          { code: "gs.economy.poverty", name: "Poverty and Inclusion", description: "Poverty alleviation and welfare schemes." },
          { code: "gs.economy.sustainable", name: "Sustainable Development", description: "SDGs and inclusive growth." },
        ],
      },
      {
        code: "gs.environment",
        name: "Environmental Ecology, Biodiversity and Climate Change",
        description: "General environmental issues.",
        subtopics: [
          { code: "gs.environment.ecology", name: "Ecology", description: "Ecosystems and food chains." },
          { code: "gs.environment.biodiversity", name: "Biodiversity", description: "Wildlife, hotspots and conservation." },
          { code: "gs.environment.climate_change", name: "Climate Change", description: "UNFCCC and Paris Agreement." },
        ],
      },
      {
        code: "gs.science",
        name: "General Science",
        description: "Everyday science and recent developments.",
        subtopics: [
          { code: "gs.science.basic", name: "Basic Science", description: "Physics, chemistry and biology basics." },
          { code: "gs.science.tech", name: "Science and Technology", description: "Recent S&T developments and applications." },
        ],
      },
    ],
  },

  // ── MIZORAM-SPECIFIC ─────────────────────────────────────────────────
  {
    code: "MZ_SPECIFIC",
    name: "Mizoram — Society, Culture and Heritage",
    weight: 1.4,
    topics: [
      {
        code: "mz.history",
        name: "History of Mizoram",
        description: "History of the Mizo people from migration to statehood.",
        subtopics: [
          { code: "mz.history.migration", name: "Mizo Migration and Chieftainship", description: "Mizo migration from Chin Hills, traditional chieftainship system." },
          { code: "mz.history.british", name: "British Annexation", description: "Lushai Expedition (1871-72), annexation of Lushai Hills District." },
          { code: "mz.history.mautam", name: "Mautam Famine and MNF", description: "Bamboo flowering Mautam (1959), famine and birth of Mizo National Front under Laldenga." },
          { code: "mz.history.insurgency", name: "Mizo Insurgency 1966-86", description: "MNF declaration of independence in 1966 and 20-year insurgency." },
          { code: "mz.history.mizo_accord", name: "Mizo Accord 1986", description: "Mizo Peace Accord signed on 30 June 1986 between Government of India, Mizoram and MNF." },
          { code: "mz.history.statehood", name: "Statehood 1987", description: "Mizoram attaining full statehood on 20 February 1987 — 23rd state of India." },
        ],
      },
      {
        code: "mz.geography",
        name: "Geography of Mizoram",
        description: "Physical features and natural resources of Mizoram.",
        subtopics: [
          { code: "mz.geography.physical", name: "Physical Features", description: "Lushai Hills, Blue Mountain (Phawngpui — highest peak), Tlawng and Tuirial rivers." },
          { code: "mz.geography.climate", name: "Climate and Rainfall", description: "Tropical monsoon climate and high rainfall." },
          { code: "mz.geography.districts", name: "Districts of Mizoram", description: "Aizawl, Lunglei, Champhai, Kolasib, Mamit, Saiha, Lawngtlai, Serchhip and others." },
          { code: "mz.geography.flora_fauna", name: "Flora and Fauna", description: "Phawngpui National Park, Dampa Tiger Reserve, hoolock gibbon and serow." },
        ],
      },
      {
        code: "mz.culture",
        name: "Culture and Heritage of Mizoram",
        description: "Mizo society, customs, festivals and language.",
        subtopics: [
          { code: "mz.culture.mizo_society", name: "Mizo Society and Tlawmngaihna", description: "Tlawmngaihna — Mizo code of selfless conduct and community ethic." },
          { code: "mz.culture.zawlbuk", name: "Zawlbuk — Bachelors' Dormitory", description: "Zawlbuk — traditional Mizo youth dormitory and centre of social learning." },
          { code: "mz.culture.festivals", name: "Festivals", description: "Chapchar Kut, Mim Kut and Pawl Kut — three major Mizo festivals." },
          { code: "mz.culture.dance", name: "Cheraw and Folk Dances", description: "Cheraw (bamboo dance), Khuallam, Chheihlam — Mizo folk dances." },
          { code: "mz.culture.language", name: "Mizo Language and Literature", description: "Mizo (Duhlian) language, Lalvunga and modern Mizo literature." },
          { code: "mz.culture.christianity", name: "Christianity in Mizoram", description: "Welsh Presbyterian missionaries (1894 onward) and ~87% Christian population." },
        ],
      },
      {
        code: "mz.economy",
        name: "Economy of Mizoram",
        description: "Bamboo, agriculture and handloom-based economy.",
        subtopics: [
          { code: "mz.bamboo_economy", name: "Bamboo Economy", description: "Bamboo cultivation, Mautam policy, bamboo handicrafts and Bamboo Mission." },
          { code: "mz.economy.jhum", name: "Jhum Cultivation and NLUP", description: "Shifting (jhum) cultivation; New Land Use Policy (NLUP) for settled agriculture." },
          { code: "mz.economy.handloom", name: "Handloom and Puan", description: "Mizo Puan, traditional handloom weaving and Puanchei textiles." },
          { code: "mz.economy.act_east", name: "Act East and Border Trade", description: "Zokhawthar (India-Myanmar) and Kaladan multi-modal transit project." },
        ],
      },
      {
        code: "mz.polity",
        name: "Mizoram Polity",
        description: "Special provisions and administration.",
        subtopics: [
          { code: "mz.polity.article_371g", name: "Article 371G", description: "Special constitutional provisions for Mizoram protecting Mizo customary law and land ownership." },
          { code: "mz.polity.assembly", name: "Mizoram Legislative Assembly", description: "40-member Mizoram Legislative Assembly." },
          { code: "mz.polity.adcs", name: "Autonomous District Councils", description: "Chakma, Lai and Mara Autonomous District Councils under Sixth Schedule." },
        ],
      },
    ],
  },

  // ── APTITUDE (Paper II — qualifying) ─────────────────────────────────
  {
    code: "APTITUDE",
    name: "Aptitude Test",
    weight: 0.5,
    topics: [
      { code: "apt.reasoning", name: "Reasoning", description: "Verbal and non-verbal reasoning, logical sequencing." },
      { code: "apt.analytical", name: "Analytical Ability", description: "Statement-conclusion, syllogism, cause-effect." },
      { code: "apt.numerical", name: "Numerical Ability", description: "Basic arithmetic at Class X level." },
      { code: "apt.problem_solving", name: "Problem Solving", description: "Decision making and situational problems." },
    ],
  },
];

export async function seedMizoramPscSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "MZ_MPSC" } });
  if (!exam) {
    throw new Error("Run seedExams() first — MZ_MPSC exam not found.");
  }
  console.log(`Seeding Mizoram PSC syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < mizoramPscSyllabus.length; sIdx++) {
    const s = mizoramPscSyllabus[sIdx];
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
  seedMizoramPscSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
