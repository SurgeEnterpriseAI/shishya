// Arunachal Pradesh PSC — APPSC Combined Competitive Examination
// (APPSCCE) Prelims syllabus. Two objective papers — Paper I General
// Studies (200 marks) + Paper II CSAT (200 marks, qualifying at 33%).
// Source: appsc.gov.in — APPSCCE-NEW-SYLLABI gazette notification.
//
// Run after seedExams: npx tsx seed/exams/arunachal-psc-syllabus.ts

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

export const arunachalPscSyllabus: SubjectSeed[] = [
  // ── PAPER I — GENERAL STUDIES ────────────────────────────────────────
  {
    code: "GS_PAPER1",
    name: "General Studies (Paper I)",
    weight: 1,
    topics: [
      {
        code: "gs.current_affairs",
        name: "Current Events of National and International Importance",
        description: "Recent national and international affairs.",
        subtopics: [
          { code: "gs.current_affairs.national", name: "National Affairs", description: "Recent political, economic and policy developments in India." },
          { code: "gs.current_affairs.international", name: "International Affairs", description: "World summits, treaties and India's foreign policy." },
        ],
      },
      {
        code: "gs.history",
        name: "History of India and Indian National Movement",
        description: "Ancient, medieval and modern Indian history.",
        subtopics: [
          { code: "gs.history.ancient", name: "Ancient India", description: "IVC, Vedic age, Mauryas, Guptas." },
          { code: "gs.history.medieval", name: "Medieval India", description: "Sultanate, Mughal empire and regional powers." },
          { code: "gs.history.modern", name: "Modern India", description: "British rule, 1857 and reform movements." },
          { code: "gs.history.freedom", name: "Indian National Movement", description: "INC, Gandhian phase and revolutionary movements." },
        ],
      },
      {
        code: "gs.geography",
        name: "Indian and World Geography",
        description: "Physical, social and economic geography with reference to Arunachal Pradesh.",
        subtopics: [
          { code: "gs.geography.physical", name: "Physical Geography", description: "Earth, atmosphere, climate and landforms." },
          { code: "gs.geography.indian", name: "Geography of India", description: "Relief, drainage, climate and resources." },
          { code: "gs.geography.world", name: "World Geography", description: "Continents and regional geography." },
        ],
      },
      {
        code: "gs.polity",
        name: "Indian Polity and Governance",
        description: "Constitution, political system, Panchayati Raj, public policy and rights.",
        subtopics: [
          { code: "gs.polity.constitution", name: "Constitution of India", description: "Preamble, fundamental rights, DPSP, amendments." },
          { code: "gs.polity.union_state", name: "Union and State Government", description: "Executive, legislature, judiciary." },
          { code: "gs.polity.local", name: "Panchayati Raj and ULBs", description: "Local self-government — 73rd and 74th Amendments." },
        ],
      },
      {
        code: "gs.economy",
        name: "Economic and Social Development",
        description: "Sustainable development, poverty, inclusion, demographics, social sector.",
        subtopics: [
          { code: "gs.economy.indian", name: "Indian Economy", description: "Planning, NITI Aayog, banking and budget." },
          { code: "gs.economy.poverty", name: "Poverty and Inclusion", description: "Welfare schemes, financial inclusion." },
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
          { code: "gs.science.tech", name: "Science and Technology", description: "Recent innovations and applications." },
        ],
      },
    ],
  },

  // ── ARUNACHAL-SPECIFIC ───────────────────────────────────────────────
  {
    code: "AR_SPECIFIC",
    name: "Arunachal Pradesh — Tribes, Culture, Geography & Administration",
    weight: 1.5,
    topics: [
      {
        code: "ar.geography",
        name: "Geography of Arunachal Pradesh",
        description: "Physical features and frontier geography.",
        subtopics: [
          { code: "ar.mcmahon_line", name: "McMahon Line", description: "McMahon Line — boundary between Tibet/China and British India fixed at Simla Convention 1914." },
          { code: "ar.geography.physical", name: "Physical Features", description: "Eastern Himalayas, Patkai range, Brahmaputra (Siang), Lohit and Subansiri rivers." },
          { code: "ar.geography.districts", name: "Districts of Arunachal Pradesh", description: "25 districts — Tawang, West Kameng, Papum Pare, Tirap, Anjaw and others." },
          { code: "ar.geography.biodiversity", name: "Biodiversity", description: "Namdapha National Park, Mouling NP and Eastern Himalaya biodiversity hotspot." },
        ],
      },
      {
        code: "ar.tribes",
        name: "Tribes of Arunachal Pradesh",
        description: "Major tribal communities and their cultures.",
        subtopics: [
          { code: "ar.tribes.adi", name: "Adi Tribe", description: "Adi — major tribe of Siang valley; Solung festival, Galo and Minyong sub-groups." },
          { code: "ar.tribes.apatani", name: "Apatani Tribe", description: "Apatanis of Ziro Valley — UNESCO tentative heritage site, wet-rice cultivation, Myoko festival." },
          { code: "ar.tribes.nyishi", name: "Nyishi Tribe", description: "Nyishi — largest tribe of Arunachal Pradesh, Nyokum festival." },
          { code: "ar.tribes.monpa", name: "Monpa Tribe", description: "Monpas of Tawang and West Kameng — Tibetan Buddhist culture, Losar festival." },
          { code: "ar.tribes.galo_tagin", name: "Galo, Tagin and Mishmi", description: "Galo, Tagin, Idu Mishmi, Digaru Mishmi and Miju Mishmi communities." },
          { code: "ar.tribes.wancho_nocte", name: "Wancho, Nocte and Tutsa", description: "Tirap and Longding tribes — Wancho, Nocte and Tutsa." },
        ],
      },
      {
        code: "ar.culture",
        name: "Culture and Religion of Arunachal Pradesh",
        description: "Festivals, languages and indigenous faiths.",
        subtopics: [
          { code: "ar.donyi_polo", name: "Donyi-Polo Faith", description: "Donyi-Polo — indigenous Sun-Moon religion of the Tani tribes (Adi, Nyishi, Apatani, Galo, Tagin)." },
          { code: "ar.tawang_buddhism", name: "Tibetan Buddhism and Tawang", description: "Tawang Monastery — largest in India, second largest in the world; 6th Dalai Lama Tsangyang Gyatso." },
          { code: "ar.culture.festivals", name: "Tribal Festivals", description: "Solung (Adi), Nyokum (Nyishi), Myoko (Apatani), Losar (Monpa), Reh (Idu Mishmi), Mopin (Galo)." },
          { code: "ar.culture.languages", name: "Languages", description: "Tibeto-Burman tribal languages; English as official language; Hindi as link language." },
          { code: "ar.culture.handloom", name: "Handloom and Handicrafts", description: "Apatani shawls, carpets of Tawang, cane and bamboo crafts." },
        ],
      },
      {
        code: "ar.history",
        name: "History of Arunachal Pradesh",
        description: "From NEFA to statehood and contemporary issues.",
        subtopics: [
          { code: "ar.history.nefa", name: "NEFA and Inner Line", description: "North-East Frontier Agency (NEFA), Inner Line Permit under Bengal Eastern Frontier Regulation 1873." },
          { code: "ar.history.1962_war", name: "1962 Sino-Indian War", description: "Sino-Indian War of 1962 — battles in Tawang, Bomdila and Walong sectors." },
          { code: "ar.history.statehood", name: "Statehood 1987", description: "Arunachal Pradesh becomes 24th state of India on 20 February 1987." },
          { code: "ar.history.china_claim", name: "China's Claim on Arunachal", description: "China's claim on Arunachal as 'South Tibet'; LAC and standoffs." },
        ],
      },
      {
        code: "ar.economy",
        name: "Economy of Arunachal Pradesh",
        description: "Agriculture, hydropower and tourism.",
        subtopics: [
          { code: "ar.economy.agriculture", name: "Agriculture and Horticulture", description: "Jhum cultivation, terrace cultivation in Apatani plateau, oranges and apples." },
          { code: "ar.economy.hydropower", name: "Hydropower Potential", description: "~50,000 MW hydropower potential — largest in India; Subansiri Lower project." },
          { code: "ar.economy.tourism", name: "Tourism", description: "Tawang, Ziro Music Festival, Mechuka, Sela Pass." },
          { code: "ar.economy.forest", name: "Forests and Resources", description: "82% forest cover, rich timber, medicinal plants and orchids." },
        ],
      },
      {
        code: "ar.polity",
        name: "Polity and Administration",
        description: "Special provisions and tribal governance.",
        subtopics: [
          { code: "ar.article_371h", name: "Article 371H", description: "Special provisions for Arunachal Pradesh — Governor's special responsibility for law and order." },
          { code: "ar.polity.assembly", name: "Arunachal Pradesh Legislative Assembly", description: "60-member Arunachal Pradesh Legislative Assembly." },
          { code: "ar.polity.ilp", name: "Inner Line Permit System", description: "ILP regime continues to regulate entry of non-residents." },
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
      { code: "csat.interpersonal", name: "Interpersonal Skills and Communication", description: "Communication and interpersonal skills." },
      { code: "csat.logical_reasoning", name: "Logical Reasoning and Analytical Ability", description: "Syllogism, deductive reasoning, puzzles." },
      { code: "csat.decision_making", name: "Decision Making and Problem Solving", description: "Situational judgement and ethical decisions." },
      { code: "csat.mental_ability", name: "General Mental Ability", description: "Series, coding-decoding, blood relations." },
      { code: "csat.numeracy", name: "Basic Numeracy", description: "Numbers, percentages, ratio (Class X level)." },
      { code: "csat.data_interpretation", name: "Data Interpretation", description: "Tables, charts and data sufficiency (Class X level)." },
    ],
  },
];

export async function seedArunachalPscSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "AR_APPSC_AR" } });
  if (!exam) {
    throw new Error("Run seedExams() first — AR_APPSC_AR exam not found.");
  }
  console.log(`Seeding Arunachal Pradesh PSC syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < arunachalPscSyllabus.length; sIdx++) {
    const s = arunachalPscSyllabus[sIdx];
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
  seedArunachalPscSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
