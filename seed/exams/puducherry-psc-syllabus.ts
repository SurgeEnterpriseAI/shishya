// Puducherry PSC Civil Services Prelims — full syllabus tree.
// Note: Puducherry does not have an independent state PSC for civil services;
// recruitment is conducted by the Department of Personnel & Administrative
// Reforms (DPAR), Puducherry through its recruitment portal — this seed
// captures the GS Prelims-style paper as used in DPAR direct recruitment for
// gazetted posts (single GS paper, MCQ, 100 questions). Puducherry-specific
// content (French heritage, Aurobindo Ashram, fishing economy) included.
// Sources: dpar.py.gov.in, recruitment.py.gov.in, puducherry.gov.in.
//
// Run after seedExams: npx tsx seed/exams/puducherry-psc-syllabus.ts

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

export const puducherryPscSyllabus: SubjectSeed[] = [
  {
    code: "GS",
    name: "General Studies",
    weight: 1.2,
    topics: [
      {
        code: "gs.science",
        name: "General Science",
        description: "Everyday science and scientific developments.",
        subtopics: [
          { code: "gs.sci.physics", name: "Physics", description: "Force, motion, heat, light, sound, electricity and magnetism." },
          { code: "gs.sci.chemistry", name: "Chemistry", description: "Elements, compounds, acids, bases, salts and reactions." },
          { code: "gs.sci.biology", name: "Biology", description: "Plant and animal kingdom, human body, nutrition, diseases." },
          { code: "gs.sci.environment", name: "Environment and Ecology", description: "Ecosystems, biodiversity, climate change and pollution." },
          { code: "gs.sci.tech", name: "Science & Technology", description: "Space, defence, IT and biotechnology in India." },
        ],
      },
      {
        code: "gs.current",
        name: "Current Events",
        description: "National, international and Puducherry current affairs.",
        subtopics: [
          { code: "gs.cur.national", name: "National", description: "Schemes, polity, economy and major events." },
          { code: "gs.cur.intl", name: "International", description: "Summits, organisations and India's foreign relations." },
          { code: "gs.cur.py", name: "Puducherry Current Affairs", description: "UT government schemes, events and developments." },
          { code: "gs.cur.awards", name: "Awards, Sports, Books", description: "National/international awards, sports events and notable books." },
        ],
      },
      {
        code: "gs.history",
        name: "History of India",
        description: "Ancient, medieval and modern Indian history.",
        subtopics: [
          { code: "gs.hist.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Mauryas, Guptas." },
          { code: "gs.hist.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals and regional kingdoms." },
          { code: "gs.hist.modern", name: "Modern India", description: "British rule, social reforms and economic policies." },
          { code: "gs.hist.freedom", name: "Indian National Movement", description: "1857 to 1947, INC, revolutionaries and Gandhian movements." },
        ],
      },
      {
        code: "gs.geography",
        name: "Geography",
        description: "Physical and economic geography of India and the world.",
        subtopics: [
          { code: "gs.geo.physical", name: "Physical Geography of India", description: "Relief, climate, monsoon, soils and rivers." },
          { code: "gs.geo.economic", name: "Economic Geography", description: "Agriculture, industry, transport and resources of India." },
          { code: "gs.geo.world", name: "World Geography", description: "Continents, oceans, climate zones and major countries." },
        ],
      },
      {
        code: "gs.polity",
        name: "Indian Polity",
        description: "Constitution and governance of India.",
        subtopics: [
          { code: "gs.pol.constitution", name: "Constitution of India", description: "Preamble, salient features and historical evolution." },
          { code: "gs.pol.fr_dpsp", name: "Fundamental Rights, Duties and DPSP", description: "Articles 12-51A — rights, duties and DPSP." },
          { code: "gs.pol.union", name: "Union Government", description: "President, PM, Council of Ministers, Parliament." },
          { code: "gs.pol.ut", name: "Union Territory Administration", description: "Lieutenant Governor, UT legislatures and special status of Puducherry." },
          { code: "gs.pol.judiciary", name: "Judiciary", description: "Supreme Court, High Courts and judicial review." },
        ],
      },
      {
        code: "gs.economy",
        name: "Indian Economy",
        description: "Economic structure, planning and reforms.",
        subtopics: [
          { code: "gs.eco.nature", name: "Nature of Indian Economy", description: "Sectoral composition and recent trends." },
          { code: "gs.eco.banking", name: "Banking and Finance", description: "RBI, banks, GST and fiscal-monetary policy." },
          { code: "gs.eco.welfare", name: "Welfare Schemes", description: "Major Central and UT schemes for poverty and employment." },
        ],
      },
      {
        code: "gs.puducherry",
        name: "Puducherry — History, Society, Economy",
        description: "Puducherry UT specific knowledge — French heritage to today.",
        subtopics: [
          { code: "gs.py.early_history", name: "Early History", description: "Ancient port of Poduke (Arikamedu), Roman trade and Chola-Pandya rule." },
          { code: "gs.py.french_period", name: "French Period", description: "French East India Company, Dupleix, Carnatic Wars and French India." },
          { code: "gs.py.de_jure", name: "Liberation and De-Jure Merger", description: "1954 de-facto transfer and 1962 de-jure merger with India." },
          { code: "gs.py.geography", name: "Geography of Puducherry", description: "Four enclaves — Puducherry, Karaikal, Mahe, Yanam — coast and rivers." },
          { code: "gs.py.aurobindo", name: "Sri Aurobindo and Auroville", description: "Aurobindo Ashram, The Mother and Auroville township founded 1968." },
          { code: "gs.py.bharathi", name: "Bharathiyar in Puducherry", description: "Subramania Bharathi's exile in Puducherry and revolutionary writings." },
          { code: "gs.py.economy", name: "Puducherry Economy", description: "Tourism, fisheries, small industries and trade." },
          { code: "gs.py.fisheries", name: "Fisheries and Coast", description: "Marine and inland fishing, fishing harbours and coastal economy." },
          { code: "gs.py.culture", name: "Culture of Puducherry", description: "Tamil-French fusion, festivals like Masi Magam and Bastille Day." },
          { code: "gs.py.administration", name: "Administration of Puducherry", description: "UT with legislature, Lieutenant Governor and Government of UT of Puducherry Act 1963." },
        ],
      },
      {
        code: "gs.aptitude",
        name: "General Aptitude and Reasoning",
        description: "Numerical and logical reasoning at Class X level.",
        subtopics: [
          { code: "gs.apt.numerical", name: "Numerical Aptitude", description: "Percentage, ratio, average, time-work, time-distance." },
          { code: "gs.apt.reasoning", name: "Logical Reasoning", description: "Series, coding-decoding, blood relation, direction sense." },
          { code: "gs.apt.di", name: "Data Interpretation", description: "Tables, bar, pie and line graph based questions." },
        ],
      },
    ],
  },
];

export async function seedPuducherryPscSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "PY_PPSC" } });
  if (!exam) {
    throw new Error("Run seedExams() first — PY_PPSC exam not found.");
  }
  console.log(`Seeding Puducherry PSC syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < puducherryPscSyllabus.length; sIdx++) {
    const s = puducherryPscSyllabus[sIdx];
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
  seedPuducherryPscSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
