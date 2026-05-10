// Chandigarh UT — Civil Services Prelims syllabus.
// Single GS objective paper covering India + Chandigarh-specific topics.
// Note: Chandigarh UT does not have its own dedicated PSC; recruitment to
// Chandigarh Civil Services follows the AGMUT/UPSC pattern with UT-specific
// content. References — chandigarh.gov.in (Planning & Architecture) and
// UPSC CSE syllabus framework adapted for UT.
//
// Run after seedExams: npx tsx seed/exams/chandigarh-pcs-syllabus.ts

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

export const chandigarhPcsSyllabus: SubjectSeed[] = [
  // ── GENERAL STUDIES ──────────────────────────────────────────────────
  {
    code: "GS_PAPER1",
    name: "General Studies",
    weight: 1,
    topics: [
      {
        code: "gs.current_affairs",
        name: "Current Events",
        description: "Current events of national and international importance.",
        subtopics: [
          { code: "gs.current_affairs.national", name: "National Affairs", description: "Recent political, economic and policy developments in India." },
          { code: "gs.current_affairs.international", name: "International Affairs", description: "Global summits, treaties and India's foreign policy." },
        ],
      },
      {
        code: "gs.history",
        name: "History of India and Indian National Movement",
        description: "Ancient, medieval and modern Indian history.",
        subtopics: [
          { code: "gs.history.ancient", name: "Ancient India", description: "IVC, Vedic age, Mauryas and Guptas." },
          { code: "gs.history.medieval", name: "Medieval India", description: "Sultanate, Mughal empire and regional powers." },
          { code: "gs.history.modern", name: "Modern India", description: "British rule, 1857 revolt and reform movements." },
          { code: "gs.history.freedom", name: "Indian National Movement", description: "INC, Gandhian phase and partition." },
        ],
      },
      {
        code: "gs.geography",
        name: "Indian and World Geography",
        description: "Physical, social and economic geography.",
        subtopics: [
          { code: "gs.geography.physical", name: "Physical Geography", description: "Earth, atmosphere, climate and landforms." },
          { code: "gs.geography.indian", name: "Geography of India", description: "Relief, drainage, climate and resources." },
          { code: "gs.geography.world", name: "World Geography", description: "Continents and regional geography." },
        ],
      },
      {
        code: "gs.polity",
        name: "Indian Polity and Governance",
        description: "Constitution, political system, Panchayati Raj and rights.",
        subtopics: [
          { code: "gs.polity.constitution", name: "Constitution of India", description: "Preamble, fundamental rights, DPSP and amendments." },
          { code: "gs.polity.union_state", name: "Union and State Government", description: "Executive, legislature and judiciary." },
          { code: "gs.polity.local", name: "Panchayati Raj and ULBs", description: "73rd and 74th Amendments." },
        ],
      },
      {
        code: "gs.economy",
        name: "Economic and Social Development",
        description: "Sustainable development, poverty, inclusion, demographics.",
        subtopics: [
          { code: "gs.economy.indian", name: "Indian Economy", description: "Planning, NITI Aayog, banking and budget." },
          { code: "gs.economy.poverty", name: "Poverty and Inclusion", description: "Welfare schemes and financial inclusion." },
          { code: "gs.economy.development", name: "Development Indicators", description: "GDP, HDI and SDGs." },
        ],
      },
      {
        code: "gs.environment",
        name: "Environmental Ecology, Biodiversity and Climate Change",
        description: "Non-technical environmental issues.",
        subtopics: [
          { code: "gs.environment.ecology", name: "Ecology and Biodiversity", description: "Ecosystems, biodiversity and conservation." },
          { code: "gs.environment.climate_change", name: "Climate Change", description: "UNFCCC and Paris Agreement." },
        ],
      },
      {
        code: "gs.science",
        name: "General Science",
        description: "Everyday science and recent developments.",
        subtopics: [
          { code: "gs.science.basic", name: "Basic Science", description: "Physics, chemistry and biology basics." },
          { code: "gs.science.tech", name: "Science and Technology", description: "Recent S&T innovations." },
        ],
      },
    ],
  },

  // ── CHANDIGARH-SPECIFIC ──────────────────────────────────────────────
  {
    code: "CH_SPECIFIC",
    name: "Chandigarh — Planning, Heritage and Administration",
    weight: 1.5,
    topics: [
      {
        code: "ch.planning",
        name: "Chandigarh City Planning",
        description: "Origins of Chandigarh as planned capital city.",
        subtopics: [
          { code: "ch.le_corbusier", name: "Le Corbusier and Master Plan", description: "Le Corbusier — Swiss-French architect commissioned 1950, designed city master plan and Capitol Complex." },
          { code: "ch.planning.foundation_1953", name: "Foundation of Chandigarh 1953", description: "Foundation of Chandigarh in 1953 as planned capital after Punjab partition; Pt. Nehru's vision." },
          { code: "ch.planning.team", name: "Pierre Jeanneret and Team", description: "Pierre Jeanneret, Maxwell Fry, Jane Drew — architectural team that worked with Le Corbusier." },
          { code: "ch.planning.body_analogy", name: "Human Body Analogy", description: "Master plan analogous to human body — head (Capitol), heart (Sector 17), lungs (Leisure Valley)." },
          { code: "ch.planning.7vs", name: "7Vs Road Hierarchy", description: "Le Corbusier's 7Vs (Voies) — seven categories of road circulation system." },
          { code: "ch.planning.sectors", name: "Sector System", description: "Self-contained 800m x 1200m sectors as basic neighbourhood units." },
        ],
      },
      {
        code: "ch.architecture",
        name: "Architecture and Heritage",
        description: "Capitol Complex and modernist architecture.",
        subtopics: [
          { code: "ch.capitol_complex", name: "Capitol Complex (UNESCO Heritage)", description: "Capitol Complex (Sector 1) — UNESCO World Heritage Site (2016) under 'Architectural Work of Le Corbusier'." },
          { code: "ch.architecture.high_court", name: "High Court Building", description: "Punjab and Haryana High Court — designed by Le Corbusier with parasol roof." },
          { code: "ch.architecture.secretariat", name: "Secretariat and Assembly", description: "Vidhan Sabha and Secretariat buildings of the Capitol Complex." },
          { code: "ch.architecture.open_hand", name: "Open Hand Monument", description: "Open Hand — official emblem of Chandigarh, symbol of 'open to give and receive'." },
          { code: "ch.architecture.rock_garden", name: "Rock Garden of Nek Chand", description: "Rock Garden created by Nek Chand from industrial and urban waste from 1957." },
          { code: "ch.architecture.sukhna", name: "Sukhna Lake", description: "Sukhna Lake — man-made reservoir at the foothills of Shivaliks, designed by Le Corbusier." },
        ],
      },
      {
        code: "ch.administration",
        name: "Chandigarh as a Union Territory",
        description: "Governance structure as a UT and dual capital status.",
        subtopics: [
          { code: "ch.ut_governance", name: "UT Governance Structure", description: "Chandigarh declared UT under the Punjab Reorganisation Act 1966; Administrator (Punjab Governor) as head." },
          { code: "ch.dual_capital", name: "Capital of Punjab and Haryana", description: "Chandigarh serves as joint capital of Punjab and Haryana along with being a UT." },
          { code: "ch.administration.rajiv_longowal", name: "Rajiv-Longowal Accord 1985", description: "Rajiv-Longowal Accord proposing transfer of Chandigarh to Punjab — never implemented." },
          { code: "ch.administration.no_assembly", name: "No Legislative Assembly", description: "Chandigarh UT has no Legislative Assembly; one Lok Sabha seat." },
          { code: "ch.administration.municipal", name: "Municipal Corporation", description: "Chandigarh Municipal Corporation established 1994 — civic governance body." },
        ],
      },
      {
        code: "ch.geography_demography",
        name: "Geography and Demography",
        description: "Physical setting and population profile.",
        subtopics: [
          { code: "ch.geography.location", name: "Location and Setting", description: "Chandigarh at foothills of Shivalik range; bordered by Punjab and Haryana." },
          { code: "ch.geography.area", name: "Area and Sectors", description: "~114 sq km area with 56 sectors; Sector 13 omitted as unlucky." },
          { code: "ch.demography", name: "Demography", description: "Population ~10.5 lakh (2011); among highest literacy and per-capita income in India." },
          { code: "ch.geography.environment", name: "Green Cover and Environment", description: "Sukhna Wildlife Sanctuary, Leisure Valley, urban forests and over 35% green cover." },
        ],
      },
      {
        code: "ch.economy",
        name: "Economy of Chandigarh",
        description: "Service-based economy and IT industry.",
        subtopics: [
          { code: "ch.economy.it", name: "IT Park and Services", description: "Rajiv Gandhi Chandigarh Technology Park (RGCTP) — Infosys, TCS, Wipro and IT-BPO sector." },
          { code: "ch.economy.education", name: "Education Hub", description: "Panjab University, PGIMER, IIT Ropar (nearby) — education and medical hub." },
          { code: "ch.economy.tourism", name: "Tourism and Heritage", description: "Capitol Complex, Rock Garden, Sukhna Lake — major heritage tourism." },
        ],
      },
    ],
  },

  // ── REASONING & APTITUDE ─────────────────────────────────────────────
  {
    code: "APTITUDE",
    name: "General Mental Ability and Aptitude",
    weight: 0.6,
    topics: [
      { code: "apt.numerical", name: "Numerical Ability", description: "Arithmetic — percentages, ratio, time/work, profit/loss." },
      { code: "apt.reasoning", name: "Logical Reasoning", description: "Series, coding-decoding, blood relations, syllogism." },
      { code: "apt.analytical", name: "Analytical Ability", description: "Statement-conclusion, cause-effect, puzzles." },
      { code: "apt.data_interpretation", name: "Data Interpretation", description: "Tables, bar/line/pie charts." },
      { code: "apt.english", name: "English Comprehension", description: "Reading comprehension, grammar, vocabulary." },
    ],
  },
];

export async function seedChandigarhPcsSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "CH_CHANDIGARH_PCS" } });
  if (!exam) {
    throw new Error("Run seedExams() first — CH_CHANDIGARH_PCS exam not found.");
  }
  console.log(`Seeding Chandigarh PCS syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < chandigarhPcsSyllabus.length; sIdx++) {
    const s = chandigarhPcsSyllabus[sIdx];
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
  seedChandigarhPcsSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
