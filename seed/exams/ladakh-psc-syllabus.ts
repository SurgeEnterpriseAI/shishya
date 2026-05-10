// Ladakh UT PSC Civil Services Prelims — full syllabus tree.
// Ladakh became a UT on 31 October 2019 (post Article 370 abrogation).
// A dedicated Ladakh Public Service Commission has been notified;
// recruitment of UT civil services follows a UPSC-style GS paper.
// Ladakh-specific content: Buddhism, Indus civilisation, recent UT formation,
// India-China and India-Pakistan border issues, high-altitude ecology.
// Sources: lpsc.ladakh.gov.in, ladakh.gov.in.
//
// Run after seedExams: npx tsx seed/exams/ladakh-psc-syllabus.ts

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

export const ladakhPscSyllabus: SubjectSeed[] = [
  {
    code: "GS",
    name: "General Studies",
    weight: 1.2,
    topics: [
      {
        code: "gs.science",
        name: "General Science",
        description: "Everyday science and recent S&T developments.",
        subtopics: [
          { code: "gs.sci.physics", name: "Physics", description: "Force, motion, heat, light, sound, electricity, magnetism." },
          { code: "gs.sci.chemistry", name: "Chemistry", description: "Elements, compounds, acids, bases, salts and reactions." },
          { code: "gs.sci.biology", name: "Biology", description: "Plants, animals, human body and diseases." },
          { code: "gs.sci.environment", name: "Environment and Ecology", description: "Ecosystem, biodiversity, climate change and pollution." },
          { code: "gs.sci.tech", name: "Science and Technology", description: "Space, defence, IT, biotech and recent S&T in India." },
        ],
      },
      {
        code: "gs.current",
        name: "Current Events",
        description: "Recent national, international and Ladakh-specific events.",
        subtopics: [
          { code: "gs.cur.national", name: "National Current Affairs", description: "Government schemes, polity, economy and major events." },
          { code: "gs.cur.intl", name: "International Affairs", description: "Summits, organisations and India's foreign relations." },
          { code: "gs.cur.ladakh", name: "Ladakh Current Affairs", description: "UT government decisions, statehood demand and 6th Schedule debate." },
          { code: "gs.cur.border", name: "Border Affairs", description: "Galwan clash, LAC standoff and recent India-China-Pakistan border developments." },
        ],
      },
      {
        code: "gs.history",
        name: "History of India",
        description: "Ancient, medieval and modern Indian history with Ladakh context.",
        subtopics: [
          { code: "gs.hist.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Mauryas, Guptas and Buddhist spread." },
          { code: "gs.hist.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals and regional kingdoms." },
          { code: "gs.hist.modern", name: "Modern India", description: "British rule, social reforms and freedom struggle." },
        ],
      },
      {
        code: "gs.geography",
        name: "Geography",
        description: "Physical, economic and Himalayan geography.",
        subtopics: [
          { code: "gs.geo.physical", name: "Physical Geography of India", description: "Relief, climate, monsoon, soils and rivers." },
          { code: "gs.geo.world", name: "World Geography", description: "Continents, oceans and physical features." },
          { code: "gs.geo.himalaya", name: "Himalayan Geography", description: "Trans-Himalayan ranges — Karakoram, Ladakh, Zanskar ranges." },
          { code: "gs.geo.disaster", name: "Disaster Management", description: "Cloudbursts, glacial-lake outbursts, earthquakes and NDMA." },
        ],
      },
      {
        code: "gs.polity",
        name: "Indian Polity",
        description: "Constitution and governance, with focus on UT administration.",
        subtopics: [
          { code: "gs.pol.constitution", name: "Constitution of India", description: "Preamble, salient features and historical evolution." },
          { code: "gs.pol.fr_dpsp", name: "Fundamental Rights, Duties and DPSP", description: "Articles 12-51A — rights, duties, DPSP." },
          { code: "gs.pol.union", name: "Union and State Government", description: "President, PM, Parliament; Governor, CM and state legislature." },
          { code: "gs.pol.ut", name: "Union Territories", description: "UT administration, Lieutenant Governor and UT Acts." },
          { code: "gs.pol.6th_schedule", name: "6th Schedule and Tribal Areas", description: "Autonomous councils, tribal area protections under 6th Schedule." },
        ],
      },
      {
        code: "gs.economy",
        name: "Indian Economy",
        description: "Indian economic structure and policies.",
        subtopics: [
          { code: "gs.eco.nature", name: "Nature of Indian Economy", description: "Mixed economy, sectoral composition and trends." },
          { code: "gs.eco.banking", name: "Banking and Finance", description: "RBI, banks, GST and monetary policy." },
          { code: "gs.eco.welfare", name: "Welfare Schemes", description: "Central schemes for poverty, rural and tribal development." },
        ],
      },
      {
        code: "gs.ladakh",
        name: "Ladakh — History, Society, Culture, Polity",
        description: "Ladakh-specific knowledge: history, society, ecology and recent UT formation.",
        subtopics: [
          { code: "gs.la.indus", name: "Indus and Ancient Ladakh", description: "Indus river basin, Silk Route caravan trade and ancient Ladakh." },
          { code: "gs.la.namgyal", name: "Namgyal Dynasty", description: "Ladakhi kingdom under the Namgyals — Sengge Namgyal and Leh Palace." },
          { code: "gs.la.dogra", name: "Dogra Conquest", description: "Zorawar Singh's campaigns and incorporation into Jammu & Kashmir state." },
          { code: "gs.la.buddhism", name: "Buddhism in Ladakh", description: "Tibetan Buddhism, monastic orders and major monasteries (Hemis, Thiksey, Diskit, Lamayuru)." },
          { code: "gs.la.shia_muslim", name: "Shia Muslim Community", description: "Kargil and Nubra Shia Muslims, Imambaras and cultural traditions." },
          { code: "gs.la.geography", name: "Geography of Ladakh", description: "Trans-Himalayan cold desert, Pangong, Tso Moriri, Nubra and Indus valleys." },
          { code: "gs.la.ecology", name: "High-Altitude Ecology", description: "Snow leopard, Himalayan ibex, kiang, marmot and fragile cold-desert flora." },
          { code: "gs.la.ut_formation", name: "UT Formation 2019", description: "Article 370 abrogation, J&K Reorganisation Act 2019 and Ladakh as UT without legislature." },
          { code: "gs.la.lahdc", name: "LAHDC and Hill Councils", description: "Ladakh Autonomous Hill Development Councils of Leh and Kargil." },
          { code: "gs.la.border", name: "Border Issues", description: "LAC with China, Aksai Chin, Galwan, Pangong Tso and Siachen with Pakistan." },
          { code: "gs.la.culture", name: "Ladakhi Culture", description: "Festivals (Hemis, Losar), Ladakhi language, attire, polo and traditional cuisine." },
          { code: "gs.la.economy", name: "Economy of Ladakh", description: "Tourism, pashmina, handicrafts, apricot and high-altitude agriculture." },
          { code: "gs.la.statehood", name: "Statehood Demand", description: "6th Schedule inclusion demand, Sonam Wangchuk and Apex Body movement." },
        ],
      },
      {
        code: "gs.aptitude",
        name: "General Aptitude and Reasoning",
        description: "Class X level numerical and logical reasoning.",
        subtopics: [
          { code: "gs.apt.numerical", name: "Numerical Aptitude", description: "Percentage, ratio, average, time-work, time-distance." },
          { code: "gs.apt.reasoning", name: "Logical Reasoning", description: "Series, coding-decoding, blood relation, direction sense." },
          { code: "gs.apt.di", name: "Data Interpretation", description: "Tables, bar, pie and line graph based questions." },
        ],
      },
    ],
  },
];

export async function seedLadakhPscSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "LA_LPSC" } });
  if (!exam) {
    throw new Error("Run seedExams() first — LA_LPSC exam not found.");
  }
  console.log(`Seeding Ladakh PSC syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < ladakhPscSyllabus.length; sIdx++) {
    const s = ladakhPscSyllabus[sIdx];
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
  seedLadakhPscSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
