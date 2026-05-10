// OPSC OAS Prelims — full syllabus tree.
// Two papers: Paper 1 (GS, 100 Qs, 200 marks) + Paper 2 (CSAT, 100 Qs, 200 marks, qualifying 33%).
// Source: opsc.gov.in OAS notification + Drishti IAS state-pcs page.
//
// Run after seedExams: npx tsx seed/exams/opsc-oas-syllabus.ts

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

export const opscOasSyllabus: SubjectSeed[] = [
  // ── PAPER 1: GENERAL STUDIES ───────────────────────────────────────────
  {
    code: "GS_PAPER1",
    name: "General Studies (Paper I)",
    weight: 1,
    topics: [
      { code: "gs.current_affairs", name: "Current events of national and international importance", description: "Government schemes, geopolitics, sports, awards — last 12-18 months." },
      { code: "gs.history.indian", name: "History of India", description: "Ancient, medieval and modern India; Indus Valley, Mauryas, Guptas, Mughals, British rule." },
      { code: "gs.history.national_movement", name: "Indian National Movement", description: "1857 revolt, INC, moderates and extremists, Gandhian phase, Quit India, partition." },
      { code: "gs.history.world", name: "World History", description: "Industrial Revolution, World Wars, Cold War, decolonization." },
      { code: "od.history.kalinga", name: "Kalinga and ancient Odisha", description: "Kalinga War (261 BCE), Ashoka's Dhauli and Jaugada edicts, Kharavela's Hathigumpha inscription." },
      { code: "od.history.dynasties", name: "Dynastic history of Odisha", description: "Mahameghavahanas, Bhauma-Karas, Somavamsis, Eastern Gangas, Suryavamsi Gajapatis." },
      { code: "od.history.medieval", name: "Medieval Odisha", description: "Mukunda Deva, Afghan and Mughal conquests, Maratha and British control of Odisha." },
      { code: "od.history.paika", name: "Paika Rebellion (1817)", description: "Buxi Jagabandhu Bidyadhara led armed revolt against British in Khurda — early uprising before 1857." },
      { code: "od.history.surendra_sai", name: "Veer Surendra Sai and 1857", description: "Sambalpur uprising; resistance till 1862; imprisonment at Asirgarh." },
      { code: "od.history.odia_movement", name: "Odia Language and nationalism movement", description: "Madhusudan Das, Utkal Sammilani 1903, formation of Odisha province on 1 April 1936." },
      { code: "gs.geog.physical", name: "Physical geography of India and World", description: "Landforms, climatic regions, ocean currents, monsoon system." },
      { code: "gs.geog.economic", name: "Economic geography of India", description: "Agriculture, mineral and energy resources, industrial regions." },
      { code: "gs.geog.social", name: "Social geography", description: "Demography, urbanization, migration, tribal distribution." },
      { code: "od.geog.location", name: "Location and physiography of Odisha", description: "Eastern coastal state on Bay of Bengal; Eastern Ghats; coastal plains, central highlands, plateaus." },
      { code: "od.geog.rivers", name: "Rivers of Odisha", description: "Mahanadi, Brahmani, Baitarani, Subarnarekha, Rushikulya, Vansadhara — Hirakud dam on Mahanadi." },
      { code: "od.geog.coastline", name: "Odisha coastline and Chilika", description: "480 km coastline; Chilika — Asia's largest brackish-water lake; Bhitarkanika mangroves." },
      { code: "od.geog.minerals", name: "Mineral resources of Odisha", description: "Largest reserves of bauxite, chromite, iron ore, manganese, nickel; coal in Talcher, Ib valley." },
      { code: "od.geog.cyclones", name: "Cyclones and disaster management", description: "Super cyclone 1999, Phailin 2013, Fani 2019; OSDMA model of disaster preparedness." },
      { code: "od.geog.tribes", name: "Tribes of Odisha", description: "62 tribes including Santhal, Kondh, Saora, Bonda, Juang, Munda, Paroja, Bondas of Malkangiri." },
      { code: "gs.polity.constitution", name: "Indian Constitution", description: "Making, Preamble, salient features, Fundamental Rights and Duties, DPSP." },
      { code: "gs.polity.union", name: "Union Government and Parliament", description: "President, PM, Lok Sabha, Rajya Sabha, Supreme Court." },
      { code: "gs.polity.state", name: "State Government", description: "Governor, CM, State Legislature, High Court, panchayati raj." },
      { code: "gs.polity.bodies", name: "Constitutional and statutory bodies", description: "ECI, UPSC, CAG, Finance Commission, NHRC, Lokpal." },
      { code: "od.polity.assembly", name: "Odisha Legislative Assembly", description: "147-seat unicameral assembly, CM, Council of Ministers, Odisha High Court at Cuttack." },
      { code: "gs.eco.development", name: "Economic and social development", description: "Sustainable development, poverty, inclusion, demographics." },
      { code: "gs.eco.budget", name: "Budget, banking and taxation", description: "GST, RBI, fiscal deficit, monetary policy, financial inclusion." },
      { code: "gs.eco.agriculture", name: "Agriculture and food security", description: "MSP, PDS, farm laws, ICAR, e-NAM, irrigation." },
      { code: "od.eco.industries", name: "Odisha industries and economy", description: "Steel (Rourkela, Kalinganagar), aluminium (NALCO), Paradip Port, MSME, KALIA scheme." },
      { code: "od.eco.schemes", name: "Odisha government schemes", description: "KALIA, BSKY (Biju Swasthya Kalyan Yojana), Mission Shakti, Mo Sarkar, 5T governance." },
      { code: "gs.env.ecology", name: "Environmental ecology and biodiversity", description: "Ecosystems, food chain, biodiversity hotspots, conservation." },
      { code: "gs.env.climate", name: "Climate change", description: "UNFCCC, Paris Agreement, IPCC, India's NDCs, Net Zero by 2070." },
      { code: "od.env.parks", name: "Protected areas of Odisha", description: "Simlipal Tiger Reserve, Bhitarkanika NP, Nandankanan, Satkosia, Chilika sanctuary, Gahirmatha turtles." },
      { code: "gs.science.physics", name: "General Science — Physics", description: "Mechanics, electricity, optics, modern physics applications." },
      { code: "gs.science.chemistry", name: "General Science — Chemistry", description: "Periodic table, acids/bases, fertilizers, polymers." },
      { code: "gs.science.biology", name: "General Science — Biology", description: "Cells, human body, diseases, plant biology." },
      { code: "gs.science.tech", name: "Science and technology", description: "ISRO missions, AI, biotechnology, IT — applications and recent advances." },
      { code: "od.culture.jagannath", name: "Jagannath cult and Puri Rath Yatra", description: "Lord Jagannath, Balabhadra, Subhadra; annual Rath Yatra; Sri Mandir built by Anantavarman Chodaganga." },
      { code: "od.culture.konark", name: "Konark Sun Temple", description: "13th-century Sun temple by Narasimhadeva I — UNESCO World Heritage; chariot of 24 wheels and 7 horses." },
      { code: "od.culture.dance", name: "Odissi and folk dances", description: "Odissi (one of 8 classical), Chhau (Mayurbhanj), Ghumura, Ranapa, Sambalpuri folk dance." },
      { code: "od.culture.festivals", name: "Festivals and fairs of Odisha", description: "Rath Yatra, Bali Yatra, Konark Festival, Raja Parba, Nuakhai, Chhau festival." },
    ],
  },

  // ── PAPER 2: CSAT ─────────────────────────────────────────────────────
  {
    code: "CSAT",
    name: "Civil Services Aptitude Test (Paper II — Qualifying)",
    weight: 1,
    topics: [
      { code: "csat.comprehension", name: "Reading comprehension", description: "English passages — main idea, inference, vocabulary, tone." },
      { code: "csat.interpersonal", name: "Interpersonal and communication skills", description: "Effective communication, listening, persuasion, group behaviour." },
      { code: "csat.logical", name: "Logical reasoning and analytical ability", description: "Statement-conclusion, syllogism, deductive reasoning, assumption." },
      { code: "csat.decision", name: "Decision-making and problem-solving", description: "Ethical and managerial decision-making situations — non-negative scoring." },
      { code: "csat.mental", name: "General mental ability", description: "Series, analogy, coding-decoding, blood relations, directions, ranking." },
      { code: "csat.numeracy", name: "Basic numeracy", description: "Numbers and their relations, orders of magnitude — Class X level." },
      { code: "csat.data", name: "Data interpretation", description: "Charts, graphs, tables, data sufficiency — Class X level." },
    ],
  },
];

export async function seedOpscOasSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "OD_OPSC_OAS" } });
  if (!exam) {
    throw new Error("Run seedExams() first — OD_OPSC_OAS exam not found.");
  }
  console.log(`Seeding OPSC OAS syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < opscOasSyllabus.length; sIdx++) {
    const s = opscOasSyllabus[sIdx];
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
  seedOpscOasSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
