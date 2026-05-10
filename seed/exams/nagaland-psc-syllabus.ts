// Nagaland PSC — Civil Services (NCS, NPS, NSS & Allied) Prelims syllabus.
// Single objective paper of 200 marks covering GS (India + Nagaland) and
// General Mental Ability.
// Source: npsc.nagaland.gov.in — Prelims Syllabus official notification.
//
// Run after seedExams: npx tsx seed/exams/nagaland-psc-syllabus.ts

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

export const nagalandPscSyllabus: SubjectSeed[] = [
  // ── GENERAL STUDIES ──────────────────────────────────────────────────
  {
    code: "GS_PAPER1",
    name: "General Studies",
    weight: 1,
    topics: [
      {
        code: "gs.current_affairs",
        name: "Current Events",
        description: "Latest developments at national and international levels including S&T and environment.",
        subtopics: [
          { code: "gs.current_affairs.national", name: "National Current Affairs", description: "Major national political, economic and social developments." },
          { code: "gs.current_affairs.international", name: "International Current Affairs", description: "Global events, summits, treaties and India's external relations." },
          { code: "gs.current_affairs.science", name: "Science and Tech Updates", description: "Recent S&T developments, ISRO missions and innovations." },
        ],
      },
      {
        code: "gs.history",
        name: "History of India and Indian National Movement",
        description: "Ancient, medieval, modern Indian history with the freedom struggle.",
        subtopics: [
          { code: "gs.history.ancient", name: "Ancient India", description: "IVC, Vedic age, Mauryas and Guptas." },
          { code: "gs.history.medieval", name: "Medieval India", description: "Sultanate, Mughal empire and regional kingdoms." },
          { code: "gs.history.modern", name: "Modern India", description: "British rule, 1857 revolt and social reform." },
          { code: "gs.history.freedom", name: "Indian National Movement", description: "INC, Gandhian movement and independence." },
        ],
      },
      {
        code: "gs.geography",
        name: "Geography of India and the World",
        description: "Physical, economic and social geography.",
        subtopics: [
          { code: "gs.geography.physical", name: "Physical Geography", description: "Earth, atmosphere, oceans and climate." },
          { code: "gs.geography.indian", name: "Geography of India", description: "Relief, drainage, climate, soils and natural vegetation." },
          { code: "gs.geography.economic", name: "Economic Geography", description: "Agriculture, minerals, industries." },
        ],
      },
      {
        code: "gs.polity",
        name: "Indian Polity and Economy",
        description: "Constitution, governance and economic structure.",
        subtopics: [
          { code: "gs.polity.constitution", name: "Constitution of India", description: "Preamble, fundamental rights, DPSP." },
          { code: "gs.polity.governance", name: "Government and Governance", description: "Union, state and local government." },
          { code: "gs.polity.economy", name: "Indian Economy", description: "Planning, banking, budget and reforms." },
        ],
      },
      {
        code: "gs.science",
        name: "General Science",
        description: "Everyday science and environmental awareness.",
        subtopics: [
          { code: "gs.science.basic", name: "Basic Science", description: "Physics, chemistry and biology basics." },
          { code: "gs.science.environment", name: "Environment", description: "Ecology, biodiversity and climate change." },
        ],
      },
    ],
  },

  // ── NAGALAND-SPECIFIC ────────────────────────────────────────────────
  {
    code: "NL_SPECIFIC",
    name: "Nagaland — History, Society, Culture and Heritage",
    weight: 1.5,
    topics: [
      {
        code: "nl.history",
        name: "History of Nagaland",
        description: "Naga history from pre-British era to statehood.",
        subtopics: [
          { code: "nl.history.naga_society", name: "Pre-Colonial Naga Society", description: "Traditional Naga village republics, morungs and tribal councils." },
          { code: "nl.history.british", name: "British Annexation", description: "Anglo-Naga encounters, Battle of Khonoma (1879) and annexation." },
          { code: "nl.history.naga_movement", name: "Naga National Movement", description: "Naga Club (1918), Naga National Council, A.Z. Phizo and Naga plebiscite (1951)." },
          { code: "nl.history.16_point", name: "16-Point Agreement 1960", description: "16-Point Agreement between Government of India and Naga People's Convention." },
          { code: "nl.history.statehood", name: "Statehood 1963", description: "Nagaland becomes 16th state of India on 1 December 1963." },
          { code: "nl.history.shillong_accord", name: "Shillong Accord and Insurgency", description: "Shillong Accord (1975) and continued NSCN insurgency." },
        ],
      },
      {
        code: "nl.tribes",
        name: "Naga Tribes",
        description: "Major tribes of Nagaland and their culture.",
        subtopics: [
          { code: "nl.tribes.major", name: "Major Naga Tribes", description: "Angami, Ao, Sumi (Sema), Lotha, Konyak, Chakhesang, Rengma, Phom and Yimchunger." },
          { code: "nl.tribes.morung", name: "Morung System", description: "Morung — traditional bachelors' dormitory, learning institution and warriors' barracks." },
          { code: "nl.tribes.headhunting", name: "Headhunting Tradition", description: "Historical headhunting practice (especially Konyaks) and its cessation." },
          { code: "nl.tribes.feast_of_merit", name: "Feasts of Merit", description: "Mithun-based Feasts of Merit for social status across Naga tribes." },
        ],
      },
      {
        code: "nl.culture",
        name: "Culture and Heritage",
        description: "Festivals, languages and traditions.",
        subtopics: [
          { code: "nl.hornbill_festival", name: "Hornbill Festival", description: "Hornbill Festival of Nagaland — annual 1-10 December at Kisama Heritage Village." },
          { code: "nl.culture.festivals", name: "Tribal Festivals", description: "Sekrenyi (Angami), Moatsu and Tsungremmong (Ao), Tokhu Emong (Lotha), Aoleang (Konyak)." },
          { code: "nl.culture.languages", name: "Languages of Nagaland", description: "Nagamese (lingua franca), English (official), and tribal languages." },
          { code: "nl.culture.christianity", name: "Christianity in Nagaland", description: "American Baptist mission since 1872; ~88% Christian population." },
          { code: "nl.culture.music", name: "Naga Music and Dance", description: "Folk songs, log drum, Bamboo dance and modern Naga gospel/rock music." },
        ],
      },
      {
        code: "nl.polity",
        name: "Nagaland Polity and Special Provisions",
        description: "Special constitutional provisions and administration.",
        subtopics: [
          { code: "nl.article_371a", name: "Article 371A", description: "Special provisions for Nagaland — protects Naga customary law, land and religious practices." },
          { code: "nl.nscn", name: "NSCN and Peace Process", description: "NSCN-IM, NSCN-K, ceasefire of 1997 and Naga Framework Agreement (2015)." },
          { code: "nl.polity.assembly", name: "Nagaland Legislative Assembly", description: "60-member Nagaland Legislative Assembly." },
          { code: "nl.polity.village_councils", name: "Village Councils and Tribal Councils", description: "Village Councils, Area Councils and the Nagaland Tribal Council Act." },
          { code: "nl.polity.afspa", name: "AFSPA in Nagaland", description: "Armed Forces (Special Powers) Act 1958 and ongoing debate over its withdrawal." },
        ],
      },
      {
        code: "nl.geography_economy",
        name: "Geography and Economy of Nagaland",
        description: "Physical features and economic profile.",
        subtopics: [
          { code: "nl.geography.physical", name: "Physical Features", description: "Naga Hills, Mount Saramati (highest peak), Doyang and Dhansiri rivers." },
          { code: "nl.geography.districts", name: "Districts of Nagaland", description: "Kohima, Dimapur, Mokokchung, Mon, Tuensang, Wokha, Zunheboto and others." },
          { code: "nl.economy.agriculture", name: "Agriculture", description: "Jhum cultivation, terrace farming (Khonoma), Naga king chilli, Mithun rearing." },
          { code: "nl.economy.industry", name: "Bamboo, Handloom and Tourism", description: "Bamboo industry, Naga shawls and tourism around Hornbill Festival." },
        ],
      },
    ],
  },

  // ── MENTAL ABILITY ───────────────────────────────────────────────────
  {
    code: "APTITUDE",
    name: "General Mental Ability Test",
    weight: 0.6,
    topics: [
      { code: "apt.numerical", name: "Numerical Ability", description: "Basic arithmetic, percentages, ratio, time/work." },
      { code: "apt.reasoning", name: "Logical Reasoning", description: "Series, coding, blood relations, syllogism." },
      { code: "apt.analytical", name: "Analytical Ability", description: "Puzzles, statement-conclusion." },
      { code: "apt.data_interpretation", name: "Data Interpretation", description: "Tables, bar/line/pie charts." },
    ],
  },
];

export async function seedNagalandPscSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "NL_NPSC" } });
  if (!exam) {
    throw new Error("Run seedExams() first — NL_NPSC exam not found.");
  }
  console.log(`Seeding Nagaland PSC syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < nagalandPscSyllabus.length; sIdx++) {
    const s = nagalandPscSyllabus[sIdx];
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
  seedNagalandPscSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
