// RPSC RAS Prelims — full syllabus tree.
// Single GS paper, 150 MCQs in 3 hours, 200 marks.
// Source: rpsc.rajasthan.gov.in official syllabus PDF + Drishti IAS state-pcs page.
//
// Run after seedExams: npx tsx seed/exams/rpsc-ras-syllabus.ts

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

export const rpscRasSyllabus: SubjectSeed[] = [
  // ── HISTORY (India + Rajasthan) ────────────────────────────────────────
  {
    code: "HISTORY",
    name: "History of India and Rajasthan",
    weight: 1,
    topics: [
      { code: "gs.history.ancient_india", name: "Ancient India", description: "Indus Valley civilization, Vedic age, Mauryan and Gupta empires, Buddhism and Jainism." },
      { code: "gs.history.medieval_india", name: "Medieval India", description: "Delhi Sultanate, Mughal empire, Bhakti and Sufi movements, Vijayanagar." },
      { code: "gs.history.modern_india", name: "Modern India", description: "British colonial rule, social reform, freedom struggle from 1857 to 1947." },
      { code: "gs.history.national_movement", name: "Indian National Movement", description: "Indian National Congress, Gandhian movements, partition and independence." },
      { code: "rj.history.prehistoric", name: "Pre-historic Rajasthan", description: "Palaeolithic, Mesolithic and Chalcolithic sites — Kalibangan, Ahar, Ganeshwar, Bagor, Balathal." },
      { code: "rj.history.guhilas", name: "Guhilas of Mewar", description: "Bappa Rawal, Rana Kumbha, Rana Sanga, Maharana Pratap and Battle of Haldighati (1576)." },
      { code: "rj.history.rathores", name: "Rathores of Marwar", description: "Rao Jodha, Rao Maldeo, Veer Durgadas Rathore and the Marwar succession war." },
      { code: "rj.history.kachwahas", name: "Kachwahas of Amber and Jaipur", description: "Raja Bharmal, Raja Man Singh I, Sawai Jai Singh II — astronomy, Jaipur city planning." },
      { code: "rj.history.chauhans", name: "Chauhans of Sambhar and Ajmer", description: "Prithviraj Chauhan, Battles of Tarain (1191, 1192), Ajaypal." },
      { code: "rj.history.pratiharas", name: "Pratiharas and Parmars", description: "Gurjara-Pratiharas of Mandore, Parmars of Abu and Vagad — temple architecture." },
      { code: "rj.history.bhils_meenas", name: "Tribal kingdoms and uprisings", description: "Bhil and Meena chiefdoms, Govind Guru and the Bhagat movement, Mangarh massacre 1913." },
      { code: "rj.history.1857_revolt", name: "Revolt of 1857 in Rajasthan", description: "Auwa, Nasirabad, Neemuch and Erinpura uprisings; Thakur Kushal Singh of Auwa." },
      { code: "rj.history.praja_mandal", name: "Praja Mandal movements", description: "Bikaner, Jaipur, Mewar, Marwar, Shekhawati Praja Mandals; popular agitations 1938-47." },
      { code: "rj.history.peasant_movements", name: "Peasant and tribal movements", description: "Bijolia, Begun, Shekhawati and Marwar peasant satyagrahas; Eki movement." },
      { code: "rj.history.integration", name: "Integration of Rajasthan", description: "Seven-stage integration of 19 princely states into Greater Rajasthan, 1948-49." },
    ],
  },

  // ── ART, CULTURE, LITERATURE OF RAJASTHAN ──────────────────────────────
  {
    code: "RJ_CULTURE",
    name: "Art, Culture, Literature and Heritage of Rajasthan",
    weight: 1,
    topics: [
      { code: "rj.culture.architecture", name: "Architecture and monuments", description: "Forts of Chittor, Kumbhalgarh, Ranthambore, Amber, Jaisalmer; Dilwara temples; Hawa Mahal." },
      { code: "rj.culture.painting", name: "Schools of painting", description: "Mewar, Marwar, Bundi-Kota, Kishangarh, Jaipur and Nathdwara miniature schools." },
      { code: "rj.culture.handicrafts", name: "Handicrafts", description: "Blue pottery of Jaipur, Bandhej, Kota Doria, Molela terracotta, Thewa work, leather Jootis." },
      { code: "rj.culture.folk_dance", name: "Folk dances", description: "Ghoomar, Kalbeliya, Bhavai, Terah Taali, Chari, Gair — UNESCO listing of Kalbeliya." },
      { code: "rj.culture.folk_music", name: "Folk music and instruments", description: "Manganiars, Langas; Sarangi, Kamaicha, Algoza, Ravanhatta." },
      { code: "rj.culture.fairs", name: "Fairs and festivals", description: "Pushkar fair, Urs Ajmer, Teej, Gangaur, Mewar festival, Desert festival Jaisalmer." },
      { code: "rj.culture.saints", name: "Saints, Sects and Lok Devtas", description: "Dadu Panth, Nathdwara, Ramdevra; Pabuji, Gogaji, Tejaji, Ramdevji, Karni Mata." },
      { code: "rj.culture.literature", name: "Rajasthani literature and dialects", description: "Marwari, Mewari, Dhundhari, Hadauti, Mewati; works of Chand Bardai, Suryamal Mishran." },
      { code: "rj.culture.attire", name: "Attire, ornaments and customs", description: "Pagari, Angarkhi, Ghaghra-Choli; Rakhdi, Borla, Bajuband; tilak and tying-the-pagari rituals." },
    ],
  },

  // ── GEOGRAPHY (World, India, Rajasthan) ────────────────────────────────
  {
    code: "GEOGRAPHY",
    name: "Geography of World, India and Rajasthan",
    weight: 1,
    topics: [
      { code: "gs.geog.world", name: "World Geography", description: "Continents, oceans, climatic zones, world physical features and major industrial regions." },
      { code: "gs.geog.india_physical", name: "Physical Geography of India", description: "Himalayas, Peninsular plateau, Indo-Gangetic plain, coastal plains, monsoon system." },
      { code: "gs.geog.india_economic", name: "Economic Geography of India", description: "Agriculture, mineral and energy resources, industries, transport networks." },
      { code: "rj.geog.location", name: "Location and physiography of Rajasthan", description: "Largest state by area, divided by Aravalli range into arid west and semi-arid east." },
      { code: "rj.geog.aravalli", name: "Aravalli range", description: "One of the oldest fold mountain systems; Guru Shikhar (1722 m) — highest peak; ecological divide." },
      { code: "rj.geog.thar", name: "Thar desert", description: "Marusthali; sand dunes (barchans, longitudinal); Indira Gandhi Canal command area." },
      { code: "rj.geog.rivers", name: "Rivers of Rajasthan", description: "Chambal, Banas, Luni (saline inland river), Mahi, Sabarmati basins; absence of perennial north-flowing rivers." },
      { code: "rj.geog.lakes", name: "Lakes of Rajasthan", description: "Saline — Sambhar, Pachpadra, Didwana; freshwater — Pichola, Fateh Sagar, Jaisamand, Anasagar." },
      { code: "rj.geog.climate", name: "Climate of Rajasthan", description: "Hot arid in west, semi-arid in east; rainfall gradient from south-west monsoon." },
      { code: "rj.geog.minerals", name: "Mineral resources", description: "Marble (Makrana), zinc-lead (Zawar, Rampura-Agucha), copper (Khetri), sandstone, limestone, gypsum, rock-phosphate." },
      { code: "rj.geog.agriculture", name: "Agriculture and livestock", description: "Bajra, jowar, mustard, guar, opium; Tharparkar, Rathi, Gir cattle; sheep wool of Marwari breed." },
      { code: "rj.geog.wildlife", name: "Wildlife and protected areas", description: "Ranthambore, Sariska, Keoladeo Ghana (UNESCO), Desert NP, Mukundra Hills, Tal Chhapar." },
      { code: "rj.geog.tribes", name: "Tribes of Rajasthan", description: "Bhil, Meena, Garasia, Sahariya, Damor — distribution and socio-cultural features." },
    ],
  },

  // ── POLITY AND GOVERNANCE ──────────────────────────────────────────────
  {
    code: "POLITY",
    name: "Indian and Rajasthan Polity and Governance",
    weight: 1,
    topics: [
      { code: "gs.polity.constitution", name: "Indian Constitution", description: "Making, salient features, Preamble, basic structure doctrine." },
      { code: "gs.polity.fr_dpsp", name: "Fundamental Rights, DPSP and Duties", description: "Articles 12-51A; right to constitutional remedies; landmark cases." },
      { code: "gs.polity.union_govt", name: "Union Government", description: "President, PM, Council of Ministers, Parliament, Supreme Court." },
      { code: "gs.polity.state_govt", name: "State Government", description: "Governor, CM, State Legislature, High Court." },
      { code: "gs.polity.local_govt", name: "Panchayati Raj and Urban Local Bodies", description: "73rd and 74th amendments, three-tier system, financial powers." },
      { code: "gs.polity.cag_upsc", name: "Constitutional and statutory bodies", description: "ECI, UPSC, CAG, Finance Commission, NHRC, CIC, Lokpal." },
      { code: "rj.polity.rj_govt", name: "Rajasthan Government structure", description: "Rajasthan Legislative Assembly (200 seats), CM and Council of Ministers, Rajasthan High Court at Jodhpur." },
      { code: "rj.polity.rpsc", name: "Rajasthan Public Service Commission", description: "Composition, functions, role in state recruitment under Article 315." },
      { code: "rj.polity.local_admin", name: "Rajasthan local administration", description: "Zila Parishad, Panchayat Samiti, Gram Panchayat; municipal corporations of Jaipur, Jodhpur, Kota." },
      { code: "rj.polity.lokayukta", name: "Rajasthan Lokayukta and SHRC", description: "Anti-corruption ombudsman and State Human Rights Commission." },
    ],
  },

  // ── ECONOMY (India + Rajasthan) ────────────────────────────────────────
  {
    code: "ECONOMY",
    name: "Indian and Rajasthan Economy",
    weight: 1,
    topics: [
      { code: "gs.eco.basics", name: "Basic concepts", description: "GDP, GNP, NDP, NNP, inflation, fiscal vs monetary policy." },
      { code: "gs.eco.banking", name: "Banking and finance", description: "RBI, monetary policy, NPAs, financial inclusion, UPI." },
      { code: "gs.eco.budget", name: "Budget and taxation", description: "Union Budget, GST, direct and indirect taxes, fiscal deficit." },
      { code: "gs.eco.planning", name: "Planning and NITI Aayog", description: "Five Year Plans, replacement by NITI Aayog, SDGs in India." },
      { code: "gs.eco.agriculture", name: "Agriculture and food security", description: "MSP, PDS, ICAR, agricultural reforms, e-NAM." },
      { code: "rj.eco.rj_economy", name: "Rajasthan economy overview", description: "Sectoral GSDP composition, services-led growth, agrarian dependence." },
      { code: "rj.eco.industries", name: "Major industries", description: "Cement (largest producer), textiles (Bhilwara, Pali), marble, handicrafts, gems and jewellery (Jaipur)." },
      { code: "rj.eco.energy", name: "Energy sector", description: "Solar power leader (Bhadla Solar Park), wind power in Jaisalmer, Suratgarh thermal, Rawatbhata atomic." },
      { code: "rj.eco.schemes", name: "Rajasthan welfare schemes", description: "Mukhyamantri Chiranjeevi Health Insurance, Indira Gandhi Smartphone Yojana, Mukhyamantri Kisan Mitra Urja Yojana." },
      { code: "rj.eco.demography", name: "Demography of Rajasthan", description: "Census 2011 — population, sex ratio, literacy, urbanization, district-wise variations." },
    ],
  },

  // ── SCIENCE, TECHNOLOGY AND ENVIRONMENT ────────────────────────────────
  {
    code: "SCI_TECH",
    name: "Science, Technology and Environment",
    weight: 1,
    topics: [
      { code: "gs.sci.physics", name: "Physics in everyday life", description: "Force, motion, electricity, light, sound, modern physics applications." },
      { code: "gs.sci.chemistry", name: "Chemistry basics", description: "Matter, periodic table, acids/bases, polymers, drugs, fuels." },
      { code: "gs.sci.biology", name: "Human body and biology", description: "Cells, organ systems, nutrition, communicable and lifestyle diseases." },
      { code: "gs.sci.space", name: "Space and defence technology", description: "ISRO missions — Chandrayaan, Mangalyaan, Aditya-L1, Gaganyaan; DRDO." },
      { code: "gs.sci.it", name: "Information technology", description: "AI, blockchain, 5G, cybersecurity; Digital India and IndiaStack." },
      { code: "gs.sci.biotech", name: "Biotechnology and health", description: "Genetic engineering, vaccines, GM crops, IVF, stem cells." },
      { code: "gs.env.ecology", name: "Ecology and ecosystem", description: "Food chain, biodiversity hotspots, ecological pyramids." },
      { code: "gs.env.climate", name: "Climate change", description: "UNFCCC, Paris Agreement, IPCC, India's NDCs, Net Zero by 2070." },
      { code: "gs.env.pollution", name: "Pollution and waste", description: "Air, water, soil, noise, plastic waste; CPCB norms; NCAP." },
      { code: "rj.env.deserts", name: "Desert ecology of Rajasthan", description: "Khejri tree (state tree), Bishnoi conservation, Chinkara, GIB, Tal Chhapar." },
    ],
  },

  // ── REASONING, MENTAL ABILITY AND CURRENT AFFAIRS ──────────────────────
  {
    code: "REASONING_CA",
    name: "Reasoning, Mental Ability and Current Affairs",
    weight: 1,
    topics: [
      { code: "gs.reason.logical", name: "Logical reasoning", description: "Statement-conclusion, syllogism, analogy, classification." },
      { code: "gs.reason.numerical", name: "Numerical ability", description: "Number series, percentages, ratio, time-work, average, simple interest." },
      { code: "gs.reason.data", name: "Data interpretation", description: "Tables, bar/pie/line charts; basic statistical interpretation." },
      { code: "gs.reason.mental", name: "Mental ability", description: "Coding-decoding, blood relations, directions, ranking, calendar." },
      { code: "gs.ca.national", name: "National current affairs", description: "Government schemes, appointments, awards, sports — last 12 months." },
      { code: "gs.ca.international", name: "International affairs", description: "India's foreign relations, UN, BRICS, G20, recent treaties and summits." },
      { code: "rj.ca.state", name: "Rajasthan current affairs", description: "State schemes, budget, sports persons, awards, recent appointments and policies." },
    ],
  },
];

export async function seedRpscRasSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "RJ_RPSC_RAS" } });
  if (!exam) {
    throw new Error("Run seedExams() first — RJ_RPSC_RAS exam not found.");
  }
  console.log(`Seeding RPSC RAS syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < rpscRasSyllabus.length; sIdx++) {
    const s = rpscRasSyllabus[sIdx];
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
  seedRpscRasSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
