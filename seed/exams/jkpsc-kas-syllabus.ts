// J&K PSC — Combined Competitive Examination (KAS) Prelims syllabus.
// Two objective papers — Paper I General Studies (200 marks) + Paper II
// CSAT (200 marks, qualifying at 33%).
// Source: jkpsc.nic.in — Combined Competitive Examination notification.
//
// Run after seedExams: npx tsx seed/exams/jkpsc-kas-syllabus.ts

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

export const jkpscKasSyllabus: SubjectSeed[] = [
  // ── PAPER I — GENERAL STUDIES ────────────────────────────────────────
  {
    code: "GS_PAPER1",
    name: "General Studies (Paper I)",
    weight: 1,
    topics: [
      {
        code: "gs.current_affairs",
        name: "Current Events of National and International Importance",
        description: "Recent national and international current affairs.",
        subtopics: [
          { code: "gs.current_affairs.national", name: "National Affairs", description: "Recent political, economic and policy developments in India." },
          { code: "gs.current_affairs.international", name: "International Affairs", description: "Global summits, treaties and India's foreign relations." },
        ],
      },
      {
        code: "gs.history",
        name: "History of India and Indian National Movement",
        description: "Ancient, medieval and modern Indian history.",
        subtopics: [
          { code: "gs.history.ancient", name: "Ancient India", description: "IVC, Vedic age, Mauryas and Guptas." },
          { code: "gs.history.medieval", name: "Medieval India", description: "Sultanate, Mughal empire and regional powers." },
          { code: "gs.history.modern", name: "Modern India", description: "British rule, 1857 and reform movements." },
          { code: "gs.history.freedom", name: "Indian National Movement", description: "INC, Gandhian phase, revolutionaries and partition." },
        ],
      },
      {
        code: "gs.geography",
        name: "Indian and World Geography",
        description: "Physical, social and economic geography.",
        subtopics: [
          { code: "gs.geography.physical", name: "Physical Geography", description: "Earth, atmosphere, climate and landforms." },
          { code: "gs.geography.indian", name: "Geography of India", description: "Relief, climate, drainage, soils and resources." },
          { code: "gs.geography.world", name: "World Geography", description: "Continents and regional geography." },
        ],
      },
      {
        code: "gs.polity",
        name: "Indian Polity and Governance",
        description: "Constitution, political system, Panchayati Raj, public policy and rights.",
        subtopics: [
          { code: "gs.polity.constitution", name: "Constitution of India", description: "Preamble, fundamental rights, DPSP and amendments." },
          { code: "gs.polity.union_state", name: "Union and State Government", description: "Executive, legislature, judiciary." },
          { code: "gs.polity.local", name: "Panchayati Raj and ULBs", description: "Local self-government — 73rd and 74th Amendments." },
        ],
      },
      {
        code: "gs.economy",
        name: "Economic and Social Development",
        description: "Sustainable development, poverty, inclusion, demographics, social sector.",
        subtopics: [
          { code: "gs.economy.indian", name: "Indian Economy", description: "Planning, banking, fiscal and monetary policy." },
          { code: "gs.economy.poverty", name: "Poverty and Inclusion", description: "Welfare schemes and financial inclusion." },
          { code: "gs.economy.demographics", name: "Demographics", description: "Population, migration and demographic dividend." },
        ],
      },
      {
        code: "gs.environment",
        name: "Environmental Ecology, Biodiversity and Climate Change",
        description: "Non-technical environmental topics.",
        subtopics: [
          { code: "gs.environment.ecology", name: "Ecology and Biodiversity", description: "Ecosystems, biodiversity hotspots and conservation." },
          { code: "gs.environment.climate_change", name: "Climate Change", description: "UNFCCC and Paris Agreement." },
        ],
      },
      {
        code: "gs.science",
        name: "General Science",
        description: "Everyday science and recent developments.",
        subtopics: [
          { code: "gs.science.basic", name: "Basic Science", description: "Physics, chemistry and biology basics." },
          { code: "gs.science.tech", name: "Science and Technology", description: "Recent S&T developments and applications." },
        ],
      },
    ],
  },

  // ── J&K SPECIFIC ─────────────────────────────────────────────────────
  {
    code: "JK_SPECIFIC",
    name: "Jammu, Kashmir & Ladakh — History, Culture and Administration",
    weight: 1.5,
    topics: [
      {
        code: "jk.history",
        name: "History of Jammu & Kashmir",
        description: "Ancient to contemporary history of J&K.",
        subtopics: [
          { code: "jk.history.ancient", name: "Ancient and Medieval Kashmir", description: "Karkota, Utpala, Lohara dynasties; Sultanate of Kashmir under Shah Mir; Mughal rule." },
          { code: "jk.history.afghan_sikh", name: "Afghan and Sikh Rule", description: "Durrani Afghan rule (1752-1819) and Sikh rule under Ranjit Singh (1819-1846)." },
          { code: "jk.dogra_dynasty", name: "Dogra Dynasty", description: "Treaty of Amritsar 1846; Gulab Singh founds Dogra dynasty; Maharaja Hari Singh." },
          { code: "jk.history.accession", name: "Instrument of Accession 1947", description: "Maharaja Hari Singh signing Instrument of Accession on 26 October 1947 to India." },
          { code: "jk.history.wars", name: "Indo-Pak Wars and LoC", description: "1947-48, 1965, 1971, 1999 Kargil War and the Line of Control." },
          { code: "jk.history.insurgency", name: "Militancy and Pandit Exodus", description: "Onset of militancy in 1989 and exodus of Kashmiri Pandits in 1990." },
        ],
      },
      {
        code: "jk.constitutional",
        name: "Constitutional Status",
        description: "Article 370, 35A and 2019 reorganisation.",
        subtopics: [
          { code: "jk.article_370_35a", name: "Article 370 and 35A", description: "Article 370 (special status), Article 35A (permanent residents) and their abrogation on 5 August 2019." },
          { code: "jk.reorganisation_2019", name: "J&K Reorganisation Act 2019", description: "Jammu and Kashmir Reorganisation Act 2019 — bifurcation into UTs of J&K (with legislature) and Ladakh (without)." },
          { code: "jk.delimitation", name: "Delimitation Commission", description: "Delimitation Commission for J&K (2020-22) and assembly seat redistribution." },
          { code: "jk.domicile", name: "Domicile Rules", description: "J&K Reorganisation (Adaptation of State Laws) Order 2020 — new domicile criteria." },
        ],
      },
      {
        code: "jk.geography",
        name: "Geography of J&K and Ladakh",
        description: "Physical features and resources.",
        subtopics: [
          { code: "jk.geography.physical", name: "Physical Features", description: "Pir Panjal, Zanskar, Karakoram ranges; Kashmir, Jammu and Ladakh divisions." },
          { code: "jk.geography.rivers_lakes", name: "Rivers and Lakes", description: "Jhelum, Chenab, Indus rivers; Dal, Wular, Pangong Tso, Tso Moriri lakes." },
          { code: "jk.geography.glaciers", name: "Glaciers", description: "Siachen, Kolahoi and other major glaciers in J&K and Ladakh." },
          { code: "jk.geography.passes", name: "Mountain Passes", description: "Banihal, Zoji La, Khardung La, Chang La, Burzil and Pir Panjal passes." },
        ],
      },
      {
        code: "jk.kashmiri_culture",
        name: "Kashmiri Culture",
        description: "Kashmiriyat, Sufi tradition and arts.",
        subtopics: [
          { code: "jk.kashmiri_culture.kashmiriyat", name: "Kashmiriyat", description: "Kashmiriyat — syncretic ethos blending Hindu, Muslim, Buddhist and Sufi traditions." },
          { code: "jk.kashmiri_culture.sufi", name: "Sufism — Rishi Order", description: "Rishi order of Sheikh Noor-ud-din Wali (Nund Rishi); Lal Ded (Lalleshwari)." },
          { code: "jk.kashmiri_culture.arts", name: "Arts and Crafts", description: "Pashmina shawls, kani shawls, Kashmiri carpets, papier-mache, walnut wood carving." },
          { code: "jk.kashmiri_culture.languages", name: "Languages", description: "Kashmiri (Koshur), Dogri, Urdu, Hindi, English, Ladakhi — official languages of J&K UT." },
          { code: "jk.kashmiri_culture.cuisine", name: "Wazwan and Cuisine", description: "Wazwan — multi-course Kashmiri feast; rogan josh, gushtaba and kahwa." },
        ],
      },
      {
        code: "jk.ladakh",
        name: "Ladakh — Society, Culture and Polity",
        description: "Ladakh region and Tibetan Buddhist heritage.",
        subtopics: [
          { code: "jk.ladakh.geography", name: "Geography of Ladakh", description: "Leh, Kargil, Nubra Valley, Zanskar and Aksai Chin." },
          { code: "jk.ladakh.buddhism", name: "Tibetan Buddhism in Ladakh", description: "Gelug-pa and Drukpa orders; Hemis, Thiksey, Lamayuru and Diskit monasteries." },
          { code: "jk.ladakh.lahdc", name: "Ladakh Autonomous Hill Councils", description: "LAHDC Leh (1995) and LAHDC Kargil (2003) under the LAHDC Act." },
          { code: "jk.ladakh.ut", name: "Ladakh as Union Territory", description: "Ladakh becomes a Union Territory without legislature on 31 October 2019." },
          { code: "jk.ladakh.festivals", name: "Festivals of Ladakh", description: "Hemis Tsechu, Losar, Sindhu Darshan and Ladakh Festival." },
        ],
      },
      {
        code: "jk.economy",
        name: "Economy of J&K and Ladakh",
        description: "Agriculture, horticulture and tourism.",
        subtopics: [
          { code: "jk.economy.horticulture", name: "Horticulture", description: "Kashmir apples, saffron (Pampore), walnuts, almonds and cherries." },
          { code: "jk.economy.handicrafts", name: "Handicrafts", description: "Pashmina, kani shawls, carpets, papier-mache and Basohli paintings." },
          { code: "jk.economy.tourism", name: "Tourism", description: "Houseboats of Dal Lake, Gulmarg skiing, Pahalgam, Sonmarg and Amarnath Yatra." },
          { code: "jk.economy.hydropower", name: "Hydropower", description: "Salal, Baglihar, Uri, Kishenganga and Ratle hydropower projects." },
        ],
      },
    ],
  },

  // ── PAPER II — CSAT ──────────────────────────────────────────────────
  {
    code: "CSAT",
    name: "Civil Services Aptitude Test (Paper II)",
    weight: 0.5,
    topics: [
      { code: "csat.comprehension", name: "Comprehension", description: "Reading comprehension passages." },
      { code: "csat.interpersonal", name: "Interpersonal Skills including Communication", description: "Communication and interpersonal skills." },
      { code: "csat.logical_reasoning", name: "Logical Reasoning and Analytical Ability", description: "Syllogism, deductive reasoning and puzzles." },
      { code: "csat.decision_making", name: "Decision Making and Problem Solving", description: "Situational judgement and ethical decision making." },
      { code: "csat.mental_ability", name: "General Mental Ability", description: "Series, coding-decoding, blood relations." },
      { code: "csat.numeracy", name: "Basic Numeracy", description: "Numbers and their relations, magnitude (Class X level)." },
      { code: "csat.data_interpretation", name: "Data Interpretation", description: "Charts, graphs, tables, data sufficiency (Class X level)." },
    ],
  },
];

export async function seedJkpscKasSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "JK_JKPSC_KAS" } });
  if (!exam) {
    throw new Error("Run seedExams() first — JK_JKPSC_KAS exam not found.");
  }
  console.log(`Seeding JKPSC KAS syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < jkpscKasSyllabus.length; sIdx++) {
    const s = jkpscKasSyllabus[sIdx];
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
  seedJkpscKasSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
