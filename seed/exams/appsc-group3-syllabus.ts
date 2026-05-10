// APPSC Group 3 (Andhra Pradesh Public Service Commission — Panchayat Secretary etc.) syllabus tree.
// Two-stage: Screening Test (Paper-I, 150 Qs/150 marks/150 min, 1/3 negative) + Mains.
// Mains: Paper-I General Studies, Mental Ability & Language; Paper-II Rural Development & Panchayat Raj.
// Source: psc.ap.gov.in official Group III scheme & syllabus.
//
// Run after seedExams: npx tsx seed/exams/appsc-group3-syllabus.ts

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

export const appscGroup3Syllabus: SubjectSeed[] = [
  // ── GENERAL STUDIES (PAPER I) ────────────────────────────────────────
  {
    code: "GK",
    name: "General Studies and Mental Ability",
    weight: 1,
    topics: [
      { code: "gs.current_affairs", name: "Current Affairs", description: "Events of national and international importance — last 18 months." },
      { code: "gs.history_india", name: "History of India", description: "Ancient (Indus, Vedic, Maurya, Gupta), medieval, and modern India." },
      { code: "gs.freedom_struggle", name: "Indian National Movement", description: "1857 revolt, INC, Gandhi, Bose, Quit India and partition." },
      { code: "gs.geography_india", name: "Geography of India", description: "Physical, economic and social geography of India." },
      { code: "gs.geography_world", name: "World Geography", description: "Continents, oceans, climatic regions and cartography." },
      { code: "gs.indian_polity", name: "Indian Polity and Constitution", description: "Constitution, FR, DPSPs, Parliament, judiciary, federalism." },
      { code: "gs.indian_economy", name: "Indian Economy", description: "Five-Year Plans, banking, GST, NITI Aayog, monetary policy." },
      { code: "gs.science_tech", name: "Science and Technology", description: "IT, biotech, space, nuclear and defence advances." },
      { code: "gs.environment", name: "Environment and Ecology", description: "Ecosystems, biodiversity, climate change and conservation." },
      { code: "gs.disaster_mgmt", name: "Disaster Management", description: "NDMA, types of disasters, mitigation and preparedness." },
      { code: "gs.sustainable_dev", name: "Sustainable Development", description: "SDGs, environmental policy, renewable energy." },
      { code: "gs.intl_orgs", name: "International Organisations", description: "UN, WHO, IMF, World Bank, BRICS, G20, SAARC." },
      { code: "gs.logical_reasoning", name: "Logical Reasoning", description: "Statement-conclusion, syllogism, assumption, argument analysis." },
      { code: "gs.analytical_ability", name: "Analytical Ability and Data Interpretation", description: "Tables, graphs, charts and arithmetic data analysis." },
      { code: "gs.mental_ability", name: "Mental Ability", description: "Series, coding, blood relations, direction, calendar, clock." },
    ],
  },

  // ── ANDHRA PRADESH SPECIFIC ──────────────────────────────────────────
  {
    code: "STATE_SPECIFIC",
    name: "Andhra Pradesh Specific Studies",
    weight: 1.4,
    topics: [
      { code: "ap.history", name: "History of Andhra Pradesh", description: "Satavahanas, Ikshvakus, Pallavas, Eastern Chalukyas, Kakatiyas, Vijayanagara, Qutub Shahi, Nizam." },
      { code: "ap.bifurcation", name: "Bifurcation of AP (2014)", description: "AP Reorganisation Act 2014 — features, capital issues, special status." },
      { code: "ap.geography", name: "Geography of Andhra Pradesh", description: "Physical features, climate, rivers (Krishna, Godavari, Pennar), soils." },
      { code: "ap.economy", name: "Economy of AP", description: "Agriculture, industries, ports, fisheries, IT and tourism." },
      { code: "ap.culture", name: "Culture and Heritage of AP", description: "Telugu literature, Kuchipudi, Kalamkari, fairs and festivals." },
      { code: "ap.administration", name: "Administration of AP", description: "Districts, divisions, Governor, CM, secretariat — three-capital model debate." },
      { code: "ap.govt_schemes", name: "AP Government Schemes", description: "YSR welfare schemes, Amma Vodi, Rythu Bharosa, Cheyutha." },
      { code: "ap.personalities", name: "Notable Personalities of AP", description: "Tanguturi Prakasam, NTR, NT Rama Rao, P.V. Narasimha Rao, Sri Krishnadevaraya." },
      { code: "ap.current_affairs_ap", name: "Current Affairs of AP", description: "Recent appointments, schemes, projects in Andhra Pradesh." },
      { code: "ap.social_movements", name: "Social Movements of AP", description: "Anti-Brahmin, social reform and Telugu Desam movement." },
    ],
  },

  // ── PANCHAYAT RAJ & RURAL DEVELOPMENT (PAPER II) ─────────────────────
  {
    code: "RURAL_DEV",
    name: "Rural Development and Panchayat Raj",
    weight: 1.2,
    topics: [
      { code: "rd.evolution_pri", name: "Evolution of Panchayat Raj in India", description: "Constitutional amendments and committee reports — Balwantrai Mehta, Ashok Mehta, L.M. Singhvi." },
      { code: "rd.73rd_amendment", name: "73rd Constitutional Amendment", description: "Three-tier system, reservations, finance, gram sabha." },
      { code: "rd.pri_ap", name: "Panchayat Raj in Andhra Pradesh", description: "AP Panchayat Raj Act 1994, gram, mandal and zilla parishads." },
      { code: "rd.rural_problems", name: "Rural Development Problems in AP", description: "Poverty, unemployment, migration, indebtedness, water scarcity." },
      { code: "rd.rural_sociology", name: "Rural Sociology", description: "History and evolution of rural welfare schemes for the poor." },
      { code: "rd.panchayat_secretary", name: "Roles of Panchayat Secretary", description: "Duties, responsibilities, powers and accountability of secretary." },
      { code: "rd.flagship_central", name: "Flagship Rural Schemes (Central)", description: "MGNREGA, PMAY-G, PMGSY, NRLM, SBM, JJM, DAY-NRLM." },
      { code: "rd.flagship_ap", name: "Flagship Rural Schemes (AP)", description: "AP RD Department schemes, Rythu Bharosa Kendras, Volunteers system." },
      { code: "rd.land_revenue", name: "Land Revenue Administration", description: "Land records, mutations, surveys, AP Webland portal." },
      { code: "rd.cooperatives", name: "Cooperatives and SHGs", description: "Cooperative movement, DWCRA, SHG structure and federations." },
      { code: "rd.finance_pri", name: "Finance of Panchayats", description: "Sources, finance commissions, grants and own revenue." },
      { code: "rd.e_governance_rural", name: "e-Governance in Rural Areas", description: "Mee Seva, Digital India, common service centres in AP villages." },
    ],
  },

  // ── LANGUAGE ABILITY (TELUGU + ENGLISH) ──────────────────────────────
  {
    code: "LANG",
    name: "Language Ability (Telugu and English)",
    weight: 1,
    topics: [
      { code: "tel.grammar", name: "Telugu Grammar", description: "Sandhi, samasa, alankaram and chhandassu in Telugu." },
      { code: "tel.literature", name: "Telugu Literature", description: "Major Telugu poets — Nannaya, Tikkana, Yerrapragada, Pothana." },
      { code: "tel.comprehension", name: "Telugu Comprehension", description: "Unseen Telugu prose passage with inference and vocabulary." },
      { code: "eng.grammar", name: "English Grammar", description: "Tenses, articles, prepositions, voice, narration." },
      { code: "eng.vocabulary", name: "English Vocabulary", description: "Synonyms, antonyms, one-word substitution, idioms." },
      { code: "eng.comprehension", name: "English Comprehension", description: "Unseen passage with inference and vocabulary questions." },
      { code: "eng.error_correction", name: "Error Correction", description: "Spotting grammatical errors in sentences." },
    ],
  },
];

export async function seedAppscGroup3Syllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "AP_APPSC_GROUP3" } });
  if (!exam) {
    throw new Error("Run seedExams() first — AP_APPSC_GROUP3 exam not found.");
  }
  console.log(`Seeding APPSC Group 3 syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < appscGroup3Syllabus.length; sIdx++) {
    const s = appscGroup3Syllabus[sIdx];
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
  console.log(`✓ Seeded APPSC Group 3 syllabus. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedAppscGroup3Syllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
