// Haryana Civil Services (HCS) Prelims — full syllabus tree.
// Single objective Paper I (General Studies) — 100 MCQs, 100 marks, 2 hours.
// Negative marking: 1/4. (Note: HPSC also conducts a CSAT Paper II; modelled
// here is the GS paper that drives the prelims merit list.)
// Haryana-specific: history, agriculture, society, schemes.
// Source: hpsc.gov.in HCS notification + HCSE Rules.
//
// Run after seedExams: npx tsx seed/exams/hcs-haryana-syllabus.ts

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

export const hcsHaryanaSyllabus: SubjectSeed[] = [
  // ── GENERAL STUDIES (single objective paper) ────────────────────────────
  {
    code: "GS",
    name: "General Studies (Paper I)",
    weight: 1.2,
    topics: [
      {
        code: "gs.science",
        name: "General Science",
        description: "General appreciation and understanding of science of everyday observation.",
        subtopics: [
          { code: "gs.sci.physics", name: "Physics", description: "Force, motion, work, energy, heat, light, sound, electricity." },
          { code: "gs.sci.chemistry", name: "Chemistry", description: "Elements, compounds, acids, bases, salts and chemical change." },
          { code: "gs.sci.biology", name: "Biology", description: "Plants, animals, human body, nutrition, diseases and health." },
          { code: "gs.sci.environment", name: "Environment and Ecology", description: "Ecosystems, biodiversity, climate change and pollution." },
          { code: "gs.sci.tech", name: "Science and Technology", description: "Space, defence, IT, biotechnology and recent S&T developments." },
        ],
      },
      {
        code: "gs.current",
        name: "Current Events of National and International Importance",
        description: "Recent current affairs at national and international level.",
        subtopics: [
          { code: "gs.cur.national", name: "National Current Affairs", description: "Government schemes, polity, economy and major events in India." },
          { code: "gs.cur.intl", name: "International Current Affairs", description: "Global summits, organisations and major world events." },
          { code: "gs.cur.haryana", name: "Haryana Current Affairs", description: "Schemes, policies and developmental events in Haryana." },
          { code: "gs.cur.awards", name: "Awards, Sports and Books", description: "National and international awards, sports and notable books." },
        ],
      },
      {
        code: "gs.history",
        name: "History of India and Indian National Movement",
        description: "Broad understanding of Indian history in social, economic and political aspects.",
        subtopics: [
          { code: "gs.hist.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Mauryas, Guptas and Harshavardhana." },
          { code: "gs.hist.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals and regional kingdoms." },
          { code: "gs.hist.modern", name: "Modern India", description: "British rule, social reforms and economic policies." },
          { code: "gs.hist.freedom", name: "Indian National Movement", description: "1857 to 1947 — INC, revolutionaries, Gandhian movements and partition." },
          { code: "gs.hist.culture", name: "Indian Culture", description: "Art, architecture, literature, music, dance and festivals." },
        ],
      },
      {
        code: "gs.geography",
        name: "Indian and World Geography",
        description: "Physical, social and economic geography of India and the world.",
        subtopics: [
          { code: "gs.geo.physical", name: "Physical Geography of India", description: "Relief, climate, soils, vegetation and rivers." },
          { code: "gs.geo.economic", name: "Economic Geography of India", description: "Agriculture, industries, transport and resources." },
          { code: "gs.geo.world", name: "World Geography", description: "Continents, oceans, climate zones and major countries." },
          { code: "gs.geo.disaster", name: "Disaster Management", description: "Floods, droughts, earthquakes, cyclones and NDMA." },
        ],
      },
      {
        code: "gs.polity",
        name: "Indian Polity and Governance",
        description: "Constitution, political system and rights issues of India.",
        subtopics: [
          { code: "gs.pol.constitution", name: "Constitution of India", description: "Preamble, salient features and amendments." },
          { code: "gs.pol.fr_dpsp", name: "Fundamental Rights, Duties and DPSP", description: "Articles 12-51A — rights, duties and directive principles." },
          { code: "gs.pol.union", name: "Union Government", description: "President, PM, Council of Ministers and Parliament." },
          { code: "gs.pol.state", name: "State Government", description: "Governor, CM, State Legislature and High Courts." },
          { code: "gs.pol.local", name: "Local Self Government", description: "Panchayati Raj, ULBs, 73rd-74th amendments." },
          { code: "gs.pol.bodies", name: "Constitutional and Statutory Bodies", description: "ECI, UPSC, CAG, NHRC, Finance Commission." },
        ],
      },
      {
        code: "gs.economy",
        name: "Economic and Social Development",
        description: "Sustainable development, poverty, demographics, inclusion.",
        subtopics: [
          { code: "gs.eco.nature", name: "Nature of Indian Economy", description: "Sectoral composition, mixed economy and recent reforms." },
          { code: "gs.eco.planning", name: "Planning and NITI Aayog", description: "Plans, NITI Aayog and developmental priorities." },
          { code: "gs.eco.banking", name: "Banking and Finance", description: "RBI, banks, GST and fiscal-monetary policy." },
          { code: "gs.eco.poverty", name: "Poverty and Inclusion", description: "Poverty alleviation, employment and social inclusion." },
          { code: "gs.eco.demography", name: "Demographics and SDG", description: "Population, HDI, SDG and demographic dividend." },
        ],
      },
      {
        code: "gs.haryana",
        name: "Haryana — History, Geography, Economy and Society",
        description: "Haryana specific knowledge: history, geography, economy, polity and culture.",
        subtopics: [
          { code: "gs.hr.history", name: "History of Haryana", description: "Harappan sites, Kurukshetra in Mahabharata, medieval and modern Haryana." },
          { code: "gs.hr.freedom", name: "Haryana in Freedom Struggle", description: "1857 in Haryana, Rao Tula Ram, Lala Lajpat Rai and Sir Chhotu Ram." },
          { code: "gs.hr.formation", name: "Formation of Haryana", description: "Carving from Punjab on 1 November 1966 and political reorganisation." },
          { code: "gs.hr.geography", name: "Geography of Haryana", description: "Districts, rivers, canals, soils and agro-climatic regions." },
          { code: "gs.hr.agriculture", name: "Agriculture of Haryana", description: "Wheat-paddy, milk production, horticulture and Green Revolution." },
          { code: "gs.hr.economy", name: "Economy of Haryana", description: "Industrial corridors, IT, automobile sector and Maruti hub." },
          { code: "gs.hr.schemes", name: "Welfare Schemes of Haryana", description: "BBBP, Mahila Samridhi Yojana, Atal Kisan Mazdoor Canteen and others." },
          { code: "gs.hr.culture", name: "Haryanvi Culture", description: "Folk dances (Phag, Saang, Ghoomar), festivals and Haryanvi cuisine." },
          { code: "gs.hr.sports", name: "Sports in Haryana", description: "Sportspersons of Haryana — wrestling, boxing, hockey and Olympics medallists." },
        ],
      },
    ],
  },

  // ── CSAT (qualifying paper, 33% to qualify) ────────────────────────────
  {
    code: "CSAT",
    name: "Civil Services Aptitude Test (Paper II — Qualifying)",
    weight: 0.5,
    topics: [
      { code: "csat.rc", name: "Reading Comprehension", description: "Comprehension passages from English and Hindi." },
      { code: "csat.interpersonal", name: "Interpersonal Skills", description: "Communication and interpersonal effectiveness." },
      { code: "csat.logical", name: "Logical Reasoning and Analytical Ability", description: "Syllogism, statement-conclusion, arguments and reasoning." },
      { code: "csat.dm", name: "Decision Making and Problem Solving", description: "Situational judgement and ethical reasoning." },
      { code: "csat.mental", name: "General Mental Ability", description: "Direction sense, blood relations, ranking and arrangement." },
      { code: "csat.numeracy", name: "Basic Numeracy (Class X level)", description: "Numbers, magnitudes, percentages, ratios." },
      { code: "csat.di", name: "Data Interpretation", description: "Charts, graphs, tables and data sufficiency." },
      { code: "csat.english", name: "English Language Comprehension", description: "Class X level English comprehension and grammar." },
    ],
  },
];

export async function seedHcsHaryanaSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "HR_HCS" } });
  if (!exam) {
    throw new Error("Run seedExams() first — HR_HCS exam not found.");
  }
  console.log(`Seeding HCS Haryana syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < hcsHaryanaSyllabus.length; sIdx++) {
    const s = hcsHaryanaSyllabus[sIdx];
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
  seedHcsHaryanaSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
