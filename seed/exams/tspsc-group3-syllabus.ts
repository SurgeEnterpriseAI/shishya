// TSPSC Group 3 (Telangana State Public Service Commission — Group-III Services) syllabus tree.
// Three-paper main exam: each paper 150 MCQs / 150 marks / 150 min. No negative marking.
// Conducted in Telugu, English and Urdu.
// Paper-I: General Studies & General Abilities.
// Paper-II: History, Polity & Society (India + Telangana focus).
// Paper-III: Economy and Development (India + Telangana focus).
// Source: tspsc.gov.in official Group-III scheme & syllabus PDF (Notification 2022/2023).
//
// Run after seedExams: npx tsx seed/exams/tspsc-group3-syllabus.ts

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

export const tspscGroup3Syllabus: SubjectSeed[] = [
  // ── PAPER I: GENERAL STUDIES & GENERAL ABILITIES ─────────────────────
  {
    code: "GK",
    name: "Paper I — General Studies and General Abilities",
    weight: 1,
    topics: [
      { code: "gs.current_affairs", name: "Current Affairs", description: "Regional, national and international current events; international relations." },
      { code: "gs.general_science", name: "General Science", description: "Physics, chemistry, biology fundamentals at HS standard." },
      { code: "gs.science_tech_india", name: "India's Achievements in Science and Technology", description: "Space (ISRO), nuclear, defence, IT, biotech achievements." },
      { code: "gs.environment", name: "Environmental Issues", description: "Climate change, biodiversity, pollution and conservation policy." },
      { code: "gs.disaster_mgmt", name: "Disaster Management", description: "Prevention and mitigation strategies; NDMA framework." },
      { code: "gs.world_geography", name: "World Geography", description: "Continents, oceans, climatic regions, world resources." },
      { code: "gs.india_geography", name: "Indian Geography", description: "Physical, economic and social geography of India." },
      { code: "gs.telangana_geography", name: "Geography of Telangana", description: "Physiography, rivers (Krishna, Godavari), climate, resources." },
      { code: "gs.history_india", name: "History of India", description: "Ancient, medieval and modern India and freedom struggle." },
      { code: "gs.cultural_heritage_india", name: "Cultural Heritage of India", description: "Art, architecture, music, dance, literature and festivals." },
      { code: "gs.telangana_culture", name: "Society, Culture, Heritage of Telangana", description: "Folk traditions, Bathukamma, Bonalu, Telangana literature." },
      { code: "gs.telangana_policies", name: "Policies of Telangana State", description: "Welfare and development policies of the Telangana government." },
      { code: "gs.social_inclusion", name: "Social Exclusion and Inclusive Policies", description: "Caste, tribe, gender, disability rights and inclusive policies." },
      { code: "gs.logical_reasoning", name: "Logical Reasoning", description: "Statement-conclusion, syllogism, analytical reasoning." },
      { code: "gs.analytical_ability", name: "Analytical Ability and Data Interpretation", description: "Tables, charts, graphs and arithmetic data interpretation." },
    ],
  },

  // ── PAPER II: HISTORY, POLITY & SOCIETY ──────────────────────────────
  {
    code: "STATE_SPECIFIC",
    name: "Paper II — History, Polity and Society (India and Telangana)",
    weight: 1.4,
    topics: [
      { code: "h.ancient_india", name: "Ancient and Medieval India", description: "Indus, Vedic, Maurya, Gupta, Delhi Sultanate, Mughal periods." },
      { code: "h.modern_india", name: "Modern India", description: "British rule, social reform movements and economic impact." },
      { code: "h.freedom_struggle", name: "Indian National Movement", description: "1857 revolt, INC, Gandhi, Bose, Quit India and partition." },
      { code: "h.telangana_ancient", name: "Ancient and Medieval Telangana", description: "Satavahanas, Ikshvakus, Kakatiyas, Bahmanis, Qutub Shahis." },
      { code: "h.asaf_jahi", name: "Asaf Jahi Dynasty (Hyderabad State)", description: "Nizam rule, society, economy and Salar Jung reforms." },
      { code: "h.telangana_movement", name: "Telangana Statehood Movement", description: "Mulki agitation 1969, Jai Telangana, KCR-led TRS movement, 2014 formation." },
      { code: "p.constitution", name: "Constitution of India", description: "Preamble, salient features, FR, FD, DPSPs, Parliament, judiciary." },
      { code: "p.federalism", name: "Federalism and Centre-State Relations", description: "Distribution of powers, finance commission, inter-state councils." },
      { code: "p.governance", name: "Public Administration and Governance", description: "Civil services, RTI, e-governance, public service ethics." },
      { code: "p.local_govt", name: "Local Self Government", description: "Panchayati Raj, urban local bodies, 73rd & 74th Amendments." },
      { code: "p.telangana_govt", name: "Telangana Government Structure", description: "Governor, CM, Legislature, secretariat and districts of TG." },
      { code: "s.indian_society", name: "Indian Society and Issues", description: "Caste, class, gender, communalism and regionalism in India." },
      { code: "s.telangana_society", name: "Society of Telangana", description: "Caste, tribes, social structure and reform movements in TG." },
      { code: "s.welfare_schemes", name: "Welfare Schemes (India + Telangana)", description: "Central and Telangana welfare schemes for SC, ST, OBC, women, minorities." },
    ],
  },

  // ── PAPER III: ECONOMY AND DEVELOPMENT ───────────────────────────────
  {
    code: "ECONOMY",
    name: "Paper III — Economy and Development",
    weight: 1.2,
    topics: [
      { code: "e.indian_economy_basics", name: "Basic Concepts of Economics", description: "National income, GDP, GNP, inflation, monetary and fiscal policy." },
      { code: "e.planning_india", name: "Planning in India", description: "Five-Year Plans, NITI Aayog, plan objectives and outcomes." },
      { code: "e.indian_economy_sectors", name: "Sectors of Indian Economy", description: "Agriculture, industry, services — composition and trends." },
      { code: "e.banking_finance", name: "Banking and Financial System", description: "RBI, commercial banks, NABARD, financial inclusion, GST." },
      { code: "e.trade_external", name: "External Sector", description: "Foreign trade, BoP, FDI, WTO and India's position." },
      { code: "e.poverty_unemployment", name: "Poverty, Employment and Inclusion", description: "Poverty alleviation, MNREGA, employment trends in India." },
      { code: "e.agri_india", name: "Agriculture in India", description: "Green revolution, MSP, PDS, agri-credit and reforms." },
      { code: "e.industry_india", name: "Industrial Growth in India", description: "Industrial policy, MSMEs, Make in India, PLI scheme." },
      { code: "e.telangana_economy", name: "Economy of Telangana", description: "Sectors, Bhagiratha, Mission Kakatiya, IT corridor." },
      { code: "e.telangana_agriculture", name: "Telangana Agriculture", description: "Rythu Bandhu, Rythu Bima, irrigation projects (Kaleshwaram)." },
      { code: "e.telangana_industries", name: "Telangana Industries and IT", description: "TS-iPASS, T-Hub, life sciences, IT-ITES sector." },
      { code: "e.telangana_planning", name: "Telangana Planning and Development", description: "State plans, finance commission devolution, special priority sectors." },
      { code: "e.global_economy", name: "Global Economic Changes", description: "Globalisation, trade wars, currency markets and India's response." },
      { code: "e.sustainable_dev_econ", name: "Sustainable Development and Economy", description: "SDGs, green economy, climate finance and renewable energy." },
    ],
  },

  // ── LANGUAGE & MENTAL ABILITY ────────────────────────────────────────
  {
    code: "LANG",
    name: "Language Ability (Telugu, Urdu, English)",
    weight: 1,
    topics: [
      { code: "tel.grammar", name: "Telugu Grammar", description: "Sandhi, samasa, alankaram and chhandassu in Telugu." },
      { code: "tel.literature", name: "Telugu Literature", description: "Major Telugu poets and modern Telangana writers." },
      { code: "urd.grammar", name: "Urdu Grammar (optional)", description: "Sarf, nahw, idioms in Urdu." },
      { code: "eng.grammar", name: "English Grammar", description: "Tenses, articles, prepositions, voice, narration." },
      { code: "eng.comprehension", name: "English Comprehension", description: "Unseen passage with vocabulary and inference questions." },
      { code: "eng.vocabulary", name: "English Vocabulary", description: "Synonyms, antonyms, one-word substitution, idioms." },
    ],
  },
];

export async function seedTspscGroup3Syllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "TS_TSPSC_GROUP3" } });
  if (!exam) {
    throw new Error("Run seedExams() first — TS_TSPSC_GROUP3 exam not found.");
  }
  console.log(`Seeding TSPSC Group 3 syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < tspscGroup3Syllabus.length; sIdx++) {
    const s = tspscGroup3Syllabus[sIdx];
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
  console.log(`✓ Seeded TSPSC Group 3 syllabus. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedTspscGroup3Syllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
