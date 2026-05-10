// HPPSC HPAS Prelims — full syllabus tree.
// Two papers: Paper 1 (GS, 100 Qs, 200 marks) + Paper 2 (Aptitude, 100 Qs, 200 marks).
// Source: hppsc.hp.gov.in HPAS notification + Drishti IAS / BYJU's state-pcs page.
//
// Run after seedExams: npx tsx seed/exams/hpas-syllabus.ts

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

export const hpasSyllabus: SubjectSeed[] = [
  // ── PAPER 1: GENERAL STUDIES ───────────────────────────────────────────
  {
    code: "GS_PAPER1",
    name: "General Studies (Paper I)",
    weight: 1,
    topics: [
      { code: "gs.history.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Mauryas, Guptas, Buddhism and Jainism." },
      { code: "gs.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals, Bhakti and Sufi movements, Vijayanagar." },
      { code: "gs.history.modern", name: "Modern India and freedom struggle", description: "1857, INC, Gandhian movements, partition and independence." },
      { code: "hp.history.ancient", name: "Ancient Himachal — Janapadas", description: "Audumbaras, Trigarta, Kuluta, Kulindas; references in Mahabharata and Puranas." },
      { code: "hp.history.katoch", name: "Katoch dynasty of Kangra", description: "One of oldest surviving Rajput dynasties; Kangra fort; Maharaja Sansar Chand II — golden age (1775-1823)." },
      { code: "hp.history.bushahr", name: "Bushahr state", description: "Erstwhile princely state of Kinnaur-Shimla region; only HP ruler hostile to British in 1857; capital Sarahan/Rampur." },
      { code: "hp.history.bilaspur", name: "Bilaspur (Kahlur) state", description: "Founded by Bir Chand; merged with India 1948; later submerged by Bhakra dam reservoir." },
      { code: "hp.history.chamba", name: "Chamba and Mandi states", description: "Chamba — founded by Sahil Varman c. 920 CE; Bhuri Singh Museum; Mandi 'Kashi of the Hills'." },
      { code: "hp.history.suket_kullu", name: "Suket, Kullu and Sirmaur", description: "Suket and Kullu Pal dynasties; Sirmaur of Nahan; Raja Shamsher Prakash." },
      { code: "hp.history.gorkha", name: "Gorkha invasion (1803-15)", description: "Gorkhas under Amar Singh Thapa; defeat by British in Anglo-Gorkha war; Treaty of Sugauli 1816." },
      { code: "hp.history.anglo_sikh", name: "Anglo-Sikh wars and British rule", description: "Maharaja Ranjit Singh's annexation of Kangra 1809; British takeover after First Anglo-Sikh war 1846." },
      { code: "hp.history.praja_mandal", name: "Praja Mandal and freedom movement", description: "Dhami firing 1939, Pajhota agitation 1942; Yashwant Singh Parmar; Suket satyagraha 1948." },
      { code: "hp.history.statehood", name: "Formation and statehood of HP", description: "Part C state 1948 from 30 hill states; reorganisation 1966 (Punjab hill areas); full statehood 25 January 1971 — 18th state." },
      { code: "gs.geog.world", name: "World geography", description: "Continents, oceans, climatic zones, world physical features." },
      { code: "gs.geog.india", name: "Indian geography", description: "Himalayas, peninsular plateau, rivers, monsoon, agriculture." },
      { code: "hp.geog.location", name: "Location and physiography of HP", description: "Western Himalayas; bordered by China (Tibet); 12 districts; three altitudinal zones — Shivalik, Inner, Greater Himalayas." },
      { code: "hp.geog.rivers", name: "Rivers of Himachal Pradesh", description: "Five perennial — Chenab, Ravi, Beas, Sutlej, Yamuna; tributaries Spiti, Parbati, Tons, Pabbar." },
      { code: "hp.geog.climate", name: "Climate and rainfall", description: "Sub-tropical to alpine; Dharamshala among wettest; Spiti-Lahaul cold desert in rain shadow." },
      { code: "hp.geog.parks", name: "National parks and wildlife", description: "Great Himalayan NP (UNESCO), Pin Valley NP, Inderkilla, Khirganga, Simbalbara; snow leopard, Western Tragopan (state bird)." },
      { code: "hp.geog.glaciers", name: "Glaciers and lakes", description: "Bara Shigri, Beas Kund, Chandra; lakes — Chandratal, Suraj Tal, Renuka, Khajjiar, Manimahesh." },
      { code: "hp.geog.tribes", name: "Tribes of Himachal Pradesh", description: "Gaddi, Gujjar, Kinnaura, Lahaula, Pangwala, Bhot, Swangla — distribution in tribal districts." },
      { code: "gs.polity.constitution", name: "Indian Constitution", description: "Preamble, Fundamental Rights, DPSPs, basic structure, amendments." },
      { code: "gs.polity.governance", name: "Indian polity and governance", description: "Union, state and local government; panchayati raj; constitutional bodies." },
      { code: "hp.polity.assembly", name: "HP Legislative Assembly", description: "68-seat unicameral assembly; CM, Council of Ministers; HP HC at Shimla." },
      { code: "hp.polity.special", name: "Special provisions and panchayati raj", description: "HP Land Reforms and Tenancy Act; Section 118 restricting non-Himachali land purchase; PRI structure." },
      { code: "gs.eco.basics", name: "Indian economy", description: "GDP, banking, RBI, GST, Union Budget, NITI Aayog." },
      { code: "gs.eco.development", name: "Economic and social development", description: "Sustainable development, poverty, inclusion, demographics." },
      { code: "hp.eco.economy", name: "HP economy overview", description: "Hydropower, tourism, horticulture (apple), pharma cluster of Baddi-Barotiwala-Nalagarh." },
      { code: "hp.eco.hydel", name: "Hydroelectric power", description: "27,000 MW potential; Bhakra-Nangal, Pong, Nathpa Jhakri (1500 MW), Karcham Wangtoo, Parbati, Koldam." },
      { code: "hp.eco.tourism", name: "Tourism and hill stations", description: "Shimla (summer capital of British India), Manali, Dharamshala, Dalhousie, Kullu, Khajjiar, Spiti." },
      { code: "hp.eco.horticulture", name: "Horticulture — apple state", description: "Apple bowl of India (Shimla, Kinnaur, Kullu); Y.S. Parmar — Father of Green Revolution in HP apples; cherry, plum, kiwi." },
      { code: "hp.eco.schemes", name: "HP state schemes", description: "Mukhya Mantri Sukh Ashraya Yojana, HIMCARE, Mukhya Mantri Swavalamban Yojana, Indira Gandhi Pyari Behna Sukh Samman Nidhi." },
      { code: "gs.env.ecology", name: "Environment and ecology", description: "Ecosystems, biodiversity, conservation, environmental laws." },
      { code: "gs.env.climate", name: "Climate change", description: "UNFCCC, Paris Agreement, IPCC, India's NDCs and Net Zero by 2070." },
      { code: "hp.env.glacial", name: "Himalayan ecology and glacier melt", description: "Glacier retreat in Lahaul-Spiti; cloudbursts and flash floods; HP State Disaster Management Authority." },
      { code: "gs.science.physics", name: "Physics in everyday life", description: "Force, motion, electricity, light, sound." },
      { code: "gs.science.chemistry", name: "Chemistry basics", description: "Periodic table, acids/bases, polymers, fertilizers." },
      { code: "gs.science.biology", name: "Biology and human body", description: "Cells, organ systems, nutrition, diseases." },
      { code: "gs.science.tech", name: "Science and technology", description: "ISRO, AI, biotechnology, IT — recent advances." },
      { code: "hp.culture.dance", name: "Folk dances of Himachal Pradesh", description: "Nati (Sirmauri Nati — Guinness record 2016), Chham (Lahaul), Kayang (Kinnaur), Dangi (Chamba), Losar Shona Chuksam." },
      { code: "hp.culture.fairs", name: "Fairs and festivals", description: "Kullu Dussehra (international), Minjar (Chamba), Lavi (Rampur), Shivratri (Mandi), Phulaich (Kinnaur), Halda." },
      { code: "hp.culture.temples", name: "Temples and monasteries", description: "Hidimba Devi (Manali), Jwalamukhi, Chamunda Devi, Naina Devi, Baijnath; Tabo, Key, Dhankar monasteries." },
      { code: "hp.culture.crafts", name: "Crafts and shawls", description: "Kullu and Kinnauri shawls (GI), Chamba rumal (GI), Kangra miniature painting, Pashmina, woollens." },
      { code: "hp.ca.state", name: "HP current affairs", description: "State schemes, budget, sports, awards, recent appointments and policies." },
      { code: "gs.ca.national", name: "National current affairs", description: "Government schemes, awards, sports, appointments — last 12-18 months." },
    ],
  },

  // ── PAPER 2: APTITUDE TEST ─────────────────────────────────────────────
  {
    code: "CSAT",
    name: "Aptitude Test (Paper II)",
    weight: 1,
    topics: [
      { code: "csat.comprehension", name: "Reading comprehension", description: "Passage-based questions on inference, vocabulary, main idea." },
      { code: "csat.interpersonal", name: "Interpersonal and communication skills", description: "Effective communication and group behaviour." },
      { code: "csat.logical", name: "Logical reasoning and analytical ability", description: "Statement-conclusion, syllogism, deductive reasoning." },
      { code: "csat.decision", name: "Decision-making and problem-solving", description: "Ethical and managerial decision-making situations." },
      { code: "csat.mental", name: "General mental ability", description: "Series, analogy, coding-decoding, blood relations, directions." },
      { code: "csat.numeracy", name: "Basic numeracy", description: "Numbers and orders of magnitude — Class X level." },
      { code: "csat.data", name: "Data interpretation", description: "Charts, graphs, tables, data sufficiency — Class X level." },
    ],
  },
];

export async function seedHpasSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "HP_HPAS" } });
  if (!exam) {
    throw new Error("Run seedExams() first — HP_HPAS exam not found.");
  }
  console.log(`Seeding HPAS syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < hpasSyllabus.length; sIdx++) {
    const s = hpasSyllabus[sIdx];
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
  seedHpasSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
