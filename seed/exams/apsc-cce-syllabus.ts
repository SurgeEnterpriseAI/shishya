// APSC CCE Prelims — full syllabus tree.
// Single GS paper, 100 MCQs, 200 marks; ~30-35% Assam-specific.
// Source: apsc.nic.in CCE notification + Drishti IAS state-pcs page.
//
// Run after seedExams: npx tsx seed/exams/apsc-cce-syllabus.ts

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

export const apscCceSyllabus: SubjectSeed[] = [
  // ── HISTORY (India + Assam) ────────────────────────────────────────────
  {
    code: "HISTORY",
    name: "History of India and Assam",
    weight: 1,
    topics: [
      { code: "gs.history.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Mauryas, Guptas, Buddhism and Jainism." },
      { code: "gs.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals, Bhakti and Sufi movements, Vijayanagar." },
      { code: "gs.history.modern", name: "Modern India and freedom struggle", description: "1857, INC, Gandhian movements, partition and independence." },
      { code: "as.history.ancient", name: "Ancient Assam — Kamarupa", description: "Varman dynasty (Bhaskaravarman), Salasthamba, Pala dynasties of Pragjyotishpura." },
      { code: "as.history.ahom", name: "Ahom kingdom (1228-1826)", description: "Chaolung Sukapha founded Ahom dynasty; Paik system; 600-year unbroken rule." },
      { code: "as.history.koch", name: "Koch dynasty", description: "Biswa Singha and Naranarayan; Koch Hajo and Koch Bihar; cultural flowering under Sankaradeva." },
      { code: "as.history.lachit", name: "Lachit Borphukan and Battle of Saraighat (1671)", description: "Naval battle on Brahmaputra defeated Mughal Ramsingh I; preserved Ahom independence." },
      { code: "as.history.moamoria", name: "Moamoria rebellion (1769-1805)", description: "Vaishnavite Moamoria sect uprising weakening Ahom kingdom; led to Burmese invasion." },
      { code: "as.history.burmese", name: "Burmese invasion and Treaty of Yandabo (1826)", description: "Three Burmese invasions; ceded Assam to British under Treaty of Yandabo ending First Anglo-Burmese war." },
      { code: "as.history.peasant_revolts", name: "Peasant revolts in colonial Assam", description: "Phulaguri Dhewa 1861 — first peasant uprising; Patharughat 1894 against land revenue." },
      { code: "as.history.freedom", name: "Assam in freedom movement", description: "Kanaklata Barua, Kushal Konwar, Maniram Dewan, Piyali Barua; Quit India in Assam." },
      { code: "as.history.bodo", name: "Bodo movement and Assam Accord", description: "All Bodo Students Union, BTAD; Assam Movement 1979-85; Assam Accord 1985 against illegal migration." },
    ],
  },

  // ── GEOGRAPHY (India + Assam) ──────────────────────────────────────────
  {
    code: "GEOGRAPHY",
    name: "Geography of India and Assam",
    weight: 1,
    topics: [
      { code: "gs.geog.world", name: "World geography", description: "Continents, oceans, climatic zones, world physical features." },
      { code: "gs.geog.india", name: "Indian geography", description: "Himalayas, peninsular plateau, rivers, monsoon, agriculture." },
      { code: "as.geog.location", name: "Location and physiography of Assam", description: "Northeast India; Brahmaputra and Barak valleys; Karbi-Anglong and N.C. Hills plateau." },
      { code: "as.geog.brahmaputra", name: "Brahmaputra river system", description: "Source in Tibet (Tsangpo); enters India at Kobo; tributaries — Subansiri, Manas, Dhansiri, Lohit." },
      { code: "as.geog.barak", name: "Barak valley", description: "Southern Assam; Cachar, Karimganj, Hailakandi districts; predominantly Bengali-speaking." },
      { code: "as.geog.climate", name: "Climate and rainfall", description: "Tropical monsoon; heavy SW monsoon; Cherrapunji-Mawsynram nearby; floods every year." },
      { code: "as.geog.parks", name: "National parks and wildlife", description: "Kaziranga (UNESCO, one-horned rhino), Manas (UNESCO), Nameri, Dibru-Saikhowa, Orang." },
      { code: "as.geog.minerals", name: "Mineral and energy resources", description: "Crude oil and natural gas (Digboi 1889 — first oil refinery of Asia), coal, limestone." },
      { code: "as.geog.tea", name: "Tea industry of Assam", description: "Largest tea-producing state in India; British plantations from 1830s; CTC and Orthodox tea; Assam tea GI tag." },
      { code: "as.geog.agriculture", name: "Agriculture and crops", description: "Rice (Sali, Ahu, Boro), jute, sugarcane, mustard; Muga silk (GI), Eri and Pat silk." },
      { code: "as.geog.tribes", name: "Tribes of Assam", description: "Bodo, Mishing, Karbi, Dimasa, Tiwa, Rabha, Sonowal Kachari — major plains and hills tribes." },
    ],
  },

  // ── POLITY, ECONOMY, ENVIRONMENT, SCIENCE ──────────────────────────────
  {
    code: "POLITY_ECO",
    name: "Polity, Economy, Environment and Science",
    weight: 1,
    topics: [
      { code: "gs.polity.constitution", name: "Indian Constitution", description: "Preamble, Fundamental Rights, DPSPs, basic structure, amendments." },
      { code: "gs.polity.union", name: "Union Government", description: "President, PM, Parliament, Supreme Court." },
      { code: "gs.polity.state", name: "State Government and panchayati raj", description: "Governor, CM, State Legislature, 73rd-74th amendments." },
      { code: "as.polity.assembly", name: "Assam Legislative Assembly", description: "126-seat unicameral assembly; CM, Council of Ministers; Gauhati HC at Guwahati." },
      { code: "as.polity.6th_schedule", name: "Sixth Schedule autonomous councils", description: "Bodoland Territorial Council (BTC), Karbi Anglong, Dima Hasao Autonomous Councils." },
      { code: "gs.eco.basics", name: "Indian economy basics", description: "GDP, banking, RBI, GST, Union Budget, NITI Aayog." },
      { code: "gs.eco.development", name: "Economic and social development", description: "Sustainable development, poverty, inclusion, demographics." },
      { code: "as.eco.industries", name: "Industries of Assam", description: "Tea, oil refining (Digboi, Numaligarh, Bongaigaon, Guwahati), petrochemicals, plywood, silk." },
      { code: "as.eco.schemes", name: "Assam state schemes", description: "Orunodoi, Mukhya Mantrir Mahila Udyamita Abhijan, Arunodoi 2.0, Assam Career Skill University." },
      { code: "as.eco.demography", name: "Demography of Assam", description: "Census 2011 — population, sex ratio, literacy; NRC process; Bengali-Assamese-Bodo linguistic mix." },
      { code: "gs.env.ecology", name: "Environment and ecology", description: "Ecosystems, biodiversity hotspots, conservation laws." },
      { code: "gs.env.climate", name: "Climate change", description: "UNFCCC, Paris Agreement, IPCC, India's NDCs and Net Zero by 2070." },
      { code: "as.env.floods", name: "Brahmaputra floods and erosion", description: "Annual flooding; Majuli erosion (world's largest river island); embankment management." },
      { code: "as.env.biodiversity", name: "Biodiversity hotspot", description: "Indo-Burma hotspot; Hoollongapar Gibbon Sanctuary, Hollock Gibbon (only ape in India)." },
      { code: "gs.science.physics", name: "Physics in everyday life", description: "Force, motion, electricity, light, sound." },
      { code: "gs.science.chemistry", name: "Chemistry basics", description: "Periodic table, acids/bases, polymers, fertilizers." },
      { code: "gs.science.biology", name: "Biology and human body", description: "Cells, organ systems, nutrition, diseases." },
      { code: "gs.science.tech", name: "Science and technology", description: "ISRO, AI, biotechnology, IT — recent advances." },
    ],
  },

  // ── ASSAM CULTURE AND CURRENT AFFAIRS ──────────────────────────────────
  {
    code: "AS_CULTURE_CA",
    name: "Assam Culture, Current Affairs and Aptitude",
    weight: 1,
    topics: [
      { code: "as.culture.sankaradeva", name: "Sankaradeva and Neo-Vaishnavism", description: "15th-16th century saint; Ek Sarana Naam Dharma; Borgeet, Bhaona, Ankiya Naat; Sattras and Namghars." },
      { code: "as.culture.bihu", name: "Bihu festival", description: "Three Bihus — Rongali (Bohag), Kongali (Kati), Bhogali (Magh); Bihu dance; Husori." },
      { code: "as.culture.dances", name: "Folk and classical dances", description: "Sattriya (one of 8 classical), Bihu, Bagurumba (Bodo), Jhumur (tea-tribes), Deodhani." },
      { code: "as.culture.music", name: "Folk music and instruments", description: "Borgeet, Tokari geet, Lokageet; Dhol, Pepa, Gogona, Khol, Taal." },
      { code: "as.culture.silk", name: "Silk and crafts", description: "Sualkuchi 'Manchester of East'; Muga (golden, GI), Eri, Pat silk; bell metal of Sarthebari." },
      { code: "as.culture.literature", name: "Assamese literature and personalities", description: "Lakshminath Bezbaroa, Hem Barua, Bhupen Hazarika, Mamoni Raisom Goswami, Padmanath Gohain Baruah." },
      { code: "as.culture.architecture", name: "Architecture and monuments", description: "Kamakhya temple, Sivasagar's Rang Ghar (Asia's first amphitheatre), Talatal Ghar, Kareng Ghar." },
      { code: "as.ca.state", name: "Assam current affairs", description: "State schemes, budget, sports, awards, recent appointments and policies." },
      { code: "gs.ca.national", name: "National current affairs", description: "Government schemes, awards, sports, appointments — last 12-18 months." },
      { code: "gs.ca.international", name: "International affairs", description: "India's foreign relations, Act East policy, BIMSTEC, ASEAN." },
      { code: "gs.reasoning.logical", name: "Logical reasoning and mental ability", description: "Series, analogy, coding-decoding, syllogism, blood relations." },
      { code: "gs.reasoning.numeracy", name: "Basic numeracy and data interpretation", description: "Numbers, percentages, ratios, charts and graphs — Class X level." },
    ],
  },
];

export async function seedApscCceSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "AS_APSC_CCE" } });
  if (!exam) {
    throw new Error("Run seedExams() first — AS_APSC_CCE exam not found.");
  }
  console.log(`Seeding APSC CCE syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < apscCceSyllabus.length; sIdx++) {
    const s = apscCceSyllabus[sIdx];
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
  seedApscCceSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
