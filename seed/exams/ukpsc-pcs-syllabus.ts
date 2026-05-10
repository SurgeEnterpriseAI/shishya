// UKPSC PCS Prelims — full syllabus tree.
// Single GS paper, 150 MCQs, 150 marks. At least 1/3 questions Uttarakhand-specific.
// Source: ukpsc.gov.in PCS notification + Drishti IAS state-pcs page.
//
// Run after seedExams: npx tsx seed/exams/ukpsc-pcs-syllabus.ts

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

export const ukpscPcsSyllabus: SubjectSeed[] = [
  // ── HISTORY (India + Uttarakhand) ──────────────────────────────────────
  {
    code: "HISTORY",
    name: "History of India and Uttarakhand",
    weight: 1,
    topics: [
      { code: "gs.history.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Mauryas, Guptas, Buddhism and Jainism." },
      { code: "gs.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals, Bhakti and Sufi movements, Vijayanagar." },
      { code: "gs.history.modern", name: "Modern India and freedom struggle", description: "1857, INC, Gandhian movements, partition and independence." },
      { code: "uk.history.prehistoric", name: "Pre-historic and proto-historic Uttarakhand", description: "Painted grey ware sites; ancient tribes — Kunindas, Yaudheyas, Kiratas, Tanganas." },
      { code: "uk.history.katyuri", name: "Katyuri dynasty (7th-11th century)", description: "Ruled Kumaon and Garhwal from Kartikeyapura (Baijnath); temple architecture at Jageshwar, Baijnath." },
      { code: "uk.history.parmar_garhwal", name: "Parmar dynasty of Garhwal", description: "Founded by Kanak Pal at Chandpur Garhi; ruled till 1949; capital Srinagar Garhwal." },
      { code: "uk.history.chand_kumaon", name: "Chand dynasty of Kumaon (10th-18th c.)", description: "Capital at Champawat then Almora; Som Chand to Kalyan Chand; replaced Katyuris in Kumaon." },
      { code: "uk.history.gorkha", name: "Gorkha invasion (1791-1815)", description: "Gorkha rule over Kumaon and Garhwal till Anglo-Gorkha war and Treaty of Sugauli 1816." },
      { code: "uk.history.british", name: "British rule in Uttarakhand", description: "Annexation of Kumaon 1815; commissioner system; Kumaon scheme of land revenue; forest laws." },
      { code: "uk.history.tehri_riyasat", name: "Tehri princely state and Praja Mandal", description: "Sudarshan Shah to Manabendra Shah; Tehri Praja Mandal; Sridev Suman martyrdom 1944." },
      { code: "uk.history.movements", name: "Popular movements and freedom fighters", description: "Coolie Begar movement, Salt satyagraha at Sirsi-Ramnagar, Kumaon Parishad; Govind Ballabh Pant, Hargovind Pant." },
      { code: "uk.history.statehood", name: "Uttarakhand statehood movement", description: "Uttarakhand Kranti Dal; Rampur Tiraha firing 1994; statehood on 9 November 2000 as 27th state." },
    ],
  },

  // ── GEOGRAPHY (World, India, Uttarakhand) ──────────────────────────────
  {
    code: "GEOGRAPHY",
    name: "Geography of World, India and Uttarakhand",
    weight: 1,
    topics: [
      { code: "gs.geog.world", name: "World geography", description: "Continents, oceans, climatic zones, world physical features." },
      { code: "gs.geog.india", name: "Indian geography", description: "Himalayas, peninsular plateau, rivers, agriculture, monsoon." },
      { code: "uk.geog.location", name: "Location and physiography of Uttarakhand", description: "Two divisions — Garhwal and Kumaon; bordered by China and Nepal; 13 districts." },
      { code: "uk.geog.himalayas", name: "Himalayan ranges of Uttarakhand", description: "Greater Himalayas (Nanda Devi, Trishul, Kamet), Lesser Himalayas, Shivaliks; Doon valley." },
      { code: "uk.geog.glaciers", name: "Glaciers and lakes", description: "Gangotri, Yamunotri, Pindari, Milam glaciers; Roopkund, Hemkund, Naukuchiyatal lakes." },
      { code: "uk.geog.rivers", name: "Rivers of Uttarakhand", description: "Ganga (Bhagirathi-Alaknanda), Yamuna, Sharda (Kali), Ramganga, Tons, Pinder, Mandakini." },
      { code: "uk.geog.confluences", name: "Panch Prayag and Char Dham", description: "Vishnuprayag, Nandprayag, Karnaprayag, Rudraprayag, Devprayag; Yamunotri, Gangotri, Kedarnath, Badrinath." },
      { code: "uk.geog.parks", name: "National parks of Uttarakhand", description: "Jim Corbett (1936 — first NP of India), Nanda Devi NP & BR (UNESCO), Valley of Flowers, Rajaji NP, Govind NP." },
      { code: "uk.geog.tehri_dam", name: "Tehri Dam and hydel projects", description: "Tehri Dam — tallest in India on Bhagirathi; Tapovan-Vishnugad, Srinagar HEP, Maneri Bhali." },
      { code: "uk.geog.disasters", name: "Natural disasters and ecology", description: "Kedarnath floods 2013, Chamoli flash flood 2021; landslides and seismic Zone IV-V." },
      { code: "uk.geog.tribes", name: "Tribes of Uttarakhand", description: "Tharu, Buksa, Bhotia (Jad, Marchha, Tolchha), Jaunsari, Raji — distribution in Tarai-Bhabar and high Himalayas." },
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
      { code: "gs.polity.state", name: "State Government and Panchayati Raj", description: "Governor, CM, State Legislature, 73rd-74th amendments." },
      { code: "uk.polity.assembly", name: "Uttarakhand Legislative Assembly", description: "70-seat unicameral assembly; CM, Council of Ministers; Uttarakhand HC at Nainital." },
      { code: "uk.polity.special", name: "Special administrative provisions", description: "Two divisional commissionerates (Kumaon, Garhwal); MDDA; UCC implementation 2024." },
      { code: "gs.eco.basics", name: "Indian economy basics", description: "GDP, inflation, banking, RBI, GST, Union Budget, NITI Aayog." },
      { code: "gs.eco.development", name: "Economic and social development", description: "Sustainable development, poverty, inclusion, demographics." },
      { code: "uk.eco.economy", name: "Uttarakhand economy", description: "Service-led GSDP; tourism, hydropower and IT-based industry; SIDCUL Haridwar-Pantnagar." },
      { code: "uk.eco.tourism", name: "Tourism — pilgrimage and adventure", description: "Char Dham Yatra, Hemkund Sahib, Auli skiing, Mussoorie, Nainital, Jim Corbett." },
      { code: "uk.eco.hydel", name: "Hydropower and energy", description: "Tehri HEP, Srinagar HEP, Tapovan-Vishnugad; renewable energy potential of state." },
      { code: "uk.eco.schemes", name: "Uttarakhand state schemes", description: "Mukhyamantri Swarozgar Yojana, Veer Chandra Singh Garhwali Yojana, House of Himalayas brand." },
      { code: "uk.eco.demography", name: "Demography of Uttarakhand", description: "Census 2011 — population, sex ratio, literacy, hill-vs-plain divide; outmigration from villages." },
      { code: "gs.env.ecology", name: "Environment and ecology", description: "Ecosystems, biodiversity hotspots, conservation laws." },
      { code: "gs.env.climate", name: "Climate change", description: "UNFCCC, Paris Agreement, IPCC, India's NDCs and Net Zero by 2070." },
      { code: "uk.env.chipko", name: "Chipko movement", description: "1973 Reni village led by Gaura Devi, Sunderlal Bahuguna, Chandi Prasad Bhatt — non-violent forest conservation." },
      { code: "uk.env.glaciers", name: "Himalayan ecology and glacier melt", description: "Glacier retreat, GLOFs, Hindu Kush Himalayan ecosystem stress." },
      { code: "gs.science.physics", name: "Physics in everyday life", description: "Force, motion, electricity, light, sound." },
      { code: "gs.science.chemistry", name: "Chemistry basics", description: "Periodic table, acids/bases, polymers, fertilizers." },
      { code: "gs.science.biology", name: "Biology and human body", description: "Cells, organ systems, nutrition, diseases." },
      { code: "gs.science.tech", name: "Science and technology", description: "ISRO, AI, biotechnology, IT — recent advances." },
    ],
  },

  // ── UTTARAKHAND CULTURE AND CURRENT AFFAIRS ────────────────────────────
  {
    code: "UK_CULTURE_CA",
    name: "Uttarakhand Culture, Current Affairs and Aptitude",
    weight: 1,
    topics: [
      { code: "uk.culture.languages", name: "Languages and dialects", description: "Garhwali, Kumaoni, Jaunsari; Hindi and Sanskrit (second official language)." },
      { code: "uk.culture.dance", name: "Folk dances of Uttarakhand", description: "Langvir Nritya, Barada Nati, Choliya, Jhora, Chanchari, Pandav Nritya." },
      { code: "uk.culture.music", name: "Folk music", description: "Mangal geet, Jagar, Khuded, Basanti; instruments — Dhol, Damau, Hudka, Ransingha." },
      { code: "uk.culture.fairs", name: "Fairs and festivals", description: "Kumbh Mela Haridwar, Nanda Devi Raj Jat, Jauljibi, Magh Mela, Phool Dei, Harela." },
      { code: "uk.culture.cuisine", name: "Cuisine and crafts", description: "Mandua, Jhangora, Kafuli, Bal Mithai; ringaal craft, copper-work of Almora." },
      { code: "uk.culture.literature", name: "Literature and personalities", description: "Sumitranandan Pant, Shivani, Manohar Shyam Joshi; Govind Ballabh Pant, Bahuguna." },
      { code: "uk.ca.state", name: "Uttarakhand current affairs", description: "State schemes, budget, sports, awards, recent appointments and policies." },
      { code: "gs.ca.national", name: "National current affairs", description: "Government schemes, awards, sports, appointments — last 12-18 months." },
      { code: "gs.ca.international", name: "International affairs", description: "India's foreign relations, UN, BRICS, G20, climate summits." },
      { code: "gs.reasoning.logical", name: "Logical reasoning and mental ability", description: "Series, analogy, coding-decoding, syllogism, blood relations." },
      { code: "gs.reasoning.numeracy", name: "Basic numeracy and data interpretation", description: "Numbers, percentages, ratios, charts and graphs — Class X level." },
    ],
  },
];

export async function seedUkpscPcsSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "UK_UKPSC_PCS" } });
  if (!exam) {
    throw new Error("Run seedExams() first — UK_UKPSC_PCS exam not found.");
  }
  console.log(`Seeding UKPSC PCS syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < ukpscPcsSyllabus.length; sIdx++) {
    const s = ukpscPcsSyllabus[sIdx];
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
  seedUkpscPcsSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
