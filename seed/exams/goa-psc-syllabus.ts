// Goa PSC — Civil Services / Junior Scale Officer (JSO) Pre-Screening syllabus.
// Single objective paper covering General Knowledge (India + Goa), General
// Intelligence & Reasoning, Numerical Aptitude and English Comprehension.
// Source: gpsc.goa.gov.in — Syllabus for Junior Scale Officer of Goa Civil
// Service (JSO_CWE_2024 PDF) and GPSC Scheme of Examinations.
//
// Run after seedExams: npx tsx seed/exams/goa-psc-syllabus.ts

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

export const goaPscSyllabus: SubjectSeed[] = [
  // ── GENERAL STUDIES (India) ──────────────────────────────────────────
  {
    code: "GS_PAPER1",
    name: "General Knowledge & Current Affairs",
    weight: 1,
    topics: [
      {
        code: "gs.history",
        name: "History of India",
        description: "Indian history from ancient to modern, with focus on the freedom struggle.",
        subtopics: [
          { code: "gs.history.ancient", name: "Ancient India", description: "Indus Valley, Vedic period, Mauryan and Gupta empires." },
          { code: "gs.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals, Marathas and regional powers." },
          { code: "gs.history.modern", name: "Modern India", description: "British rule, social reform movements and 1857 revolt." },
          { code: "gs.history.freedom", name: "India's Freedom Struggle", description: "INC, Gandhian movements, revolutionaries and independence." },
        ],
      },
      {
        code: "gs.geography",
        name: "Geography of India",
        description: "Physical, economic and social geography of India.",
        subtopics: [
          { code: "gs.geography.physical", name: "Physical Features", description: "Mountains, rivers, plateaus, coasts and islands of India." },
          { code: "gs.geography.climate", name: "Climate and Monsoon", description: "Indian monsoon, climatic regions, rainfall distribution." },
          { code: "gs.geography.economic", name: "Economic Geography", description: "Agriculture, minerals, industries and trade." },
          { code: "gs.geography.social", name: "Social Geography", description: "Population, urbanisation and demographic patterns." },
        ],
      },
      {
        code: "gs.polity",
        name: "Indian Polity and Constitution",
        description: "Indian Constitution, governance and political institutions.",
        subtopics: [
          { code: "gs.polity.constitution", name: "Constitution of India", description: "Preamble, salient features, fundamental rights and duties." },
          { code: "gs.polity.union", name: "Union Government", description: "President, Parliament, PM and Council of Ministers." },
          { code: "gs.polity.state", name: "State and Local Government", description: "Governor, State Legislature, Panchayati Raj and ULBs." },
          { code: "gs.polity.judiciary", name: "Judiciary", description: "Supreme Court, High Courts and judicial review." },
        ],
      },
      {
        code: "gs.economy",
        name: "Indian Economy",
        description: "Indian economic structure, planning and current reforms.",
        subtopics: [
          { code: "gs.economy.planning", name: "Planning and NITI Aayog", description: "Five-year plans, NITI Aayog and policy framework." },
          { code: "gs.economy.banking", name: "Banking and Finance", description: "RBI, banking system, fiscal and monetary policy." },
          { code: "gs.economy.budget", name: "Budget and Taxation", description: "Union Budget, GST and direct/indirect taxes." },
          { code: "gs.economy.development", name: "Development Indicators", description: "GDP, HDI, poverty and unemployment." },
        ],
      },
      {
        code: "gs.science",
        name: "General Science and Technology",
        description: "Everyday science and recent scientific developments.",
        subtopics: [
          { code: "gs.science.physics", name: "Physics and Chemistry", description: "Basic concepts, applications and everyday phenomena." },
          { code: "gs.science.biology", name: "Biology and Health", description: "Human body, nutrition and common diseases." },
          { code: "gs.science.tech", name: "Science and Technology", description: "Space, IT, biotechnology and recent innovations." },
          { code: "gs.science.environment", name: "Environment and Ecology", description: "Biodiversity, climate change and conservation." },
        ],
      },
      {
        code: "gs.current_affairs",
        name: "Current Events",
        description: "National and international current affairs of contemporary importance.",
        subtopics: [
          { code: "gs.current_affairs.national", name: "National Affairs", description: "Schemes, policies and political developments in India." },
          { code: "gs.current_affairs.international", name: "International Affairs", description: "World politics, treaties, summits and India's foreign relations." },
          { code: "gs.current_affairs.sports_awards", name: "Sports, Awards and Honours", description: "Major sporting events, awards and notable achievements." },
        ],
      },
    ],
  },

  // ── GOA-SPECIFIC ─────────────────────────────────────────────────────
  {
    code: "GOA_SPECIFIC",
    name: "Goa — History, Culture, Geography & Administration",
    weight: 1.4,
    topics: [
      {
        code: "ga.history",
        name: "History of Goa",
        description: "History of Goa from Kadamba period to liberation.",
        subtopics: [
          { code: "ga.history.kadamba", name: "Kadamba and Vijayanagar Rule", description: "Pre-Portuguese rulers — Kadambas, Bahmanis and Vijayanagar empire." },
          { code: "ga.history.portuguese", name: "Portuguese Conquest of Goa", description: "Afonso de Albuquerque's conquest of Goa in 1510 and Estado da India." },
          { code: "ga.history.inquisition", name: "Goa Inquisition", description: "Goa Inquisition (1560-1812) and religious conversions under Portuguese rule." },
          { code: "ga.history.freedom", name: "Goa's Freedom Struggle", description: "Tristao de Braganza Cunha, satyagraha movements and the Goa Liberation Movement." },
          { code: "ga.history.liberation", name: "Liberation of Goa 1961", description: "Operation Vijay and liberation of Goa, Daman and Diu on 19 December 1961." },
          { code: "ga.history.opinion_poll", name: "Opinion Poll 1967 and Statehood 1987", description: "Goa's Opinion Poll of 1967 against merger with Maharashtra and statehood in 1987." },
        ],
      },
      {
        code: "ga.geography",
        name: "Geography of Goa",
        description: "Physical and economic geography of Goa.",
        subtopics: [
          { code: "ga.geography.physical", name: "Physical Features of Goa", description: "Western Ghats (Sahyadris), Mandovi and Zuari rivers, Konkan coast." },
          { code: "ga.geography.climate", name: "Climate of Goa", description: "Tropical monsoon climate, rainfall patterns and seasons." },
          { code: "ga.geography.districts", name: "Districts and Talukas", description: "North Goa and South Goa districts — administrative geography." },
          { code: "ga.geography.biodiversity", name: "Biodiversity and Sanctuaries", description: "Bhagwan Mahaveer, Mhadei, Cotigao and Bondla wildlife sanctuaries." },
        ],
      },
      {
        code: "ga.economy",
        name: "Economy of Goa",
        description: "Economic structure of Goa with focus on tourism and mining.",
        subtopics: [
          { code: "ga.economy.tourism", name: "Tourism Industry", description: "Tourism as a backbone of Goa's economy — beaches, heritage and MICE." },
          { code: "ga.economy.mining", name: "Iron Ore Mining", description: "Iron ore mining in Goa, Shah Commission, mining bans and environmental impact." },
          { code: "ga.economy.fisheries", name: "Fisheries and Agriculture", description: "Marine fisheries, rice cultivation, cashew and coconut plantations." },
          { code: "ga.economy.industry", name: "Industry and Pharmaceuticals", description: "Pharmaceutical industry, Verna and Pilerne industrial estates." },
        ],
      },
      {
        code: "ga.culture",
        name: "Culture and Heritage of Goa",
        description: "Konkani language, festivals and Indo-Portuguese heritage.",
        subtopics: [
          { code: "ga.culture.konkani", name: "Konkani Language and Literature", description: "Konkani — official language of Goa, Konkani writers and Sahitya Akademi recognition." },
          { code: "ga.culture.festivals", name: "Festivals of Goa", description: "Carnival, Shigmo, Sao Joao, Ganesh Chaturthi and Feast of St. Francis Xavier." },
          { code: "ga.culture.music_dance", name: "Music and Dance", description: "Mando, Dekhni, Fugdi, Dhalo — folk music and dance forms of Goa." },
          { code: "ga.culture.architecture", name: "Indo-Portuguese Architecture", description: "Churches and Convents of Old Goa (UNESCO), Basilica of Bom Jesus, Se Cathedral." },
          { code: "ga.culture.cuisine", name: "Goan Cuisine", description: "Vindaloo, Xacuti, Bebinca and Indo-Portuguese culinary heritage." },
        ],
      },
      {
        code: "ga.polity",
        name: "Goa Administration",
        description: "Governance and administrative structure of Goa.",
        subtopics: [
          { code: "ga.polity.statehood", name: "Goa, Daman and Diu Reorganisation Act 1987", description: "Statehood of Goa under the Goa, Daman and Diu Reorganisation Act, 1987." },
          { code: "ga.polity.assembly", name: "Goa Legislative Assembly", description: "40-member Goa Legislative Assembly and political history." },
          { code: "ga.polity.opl", name: "Official Language Act 1987", description: "Goa Official Language Act recognising Konkani; status of Marathi." },
          { code: "ga.polity.panchayati_raj", name: "Panchayati Raj in Goa", description: "Two-tier Panchayati Raj — Village Panchayats and Zilla Panchayats." },
        ],
      },
    ],
  },

  // ── REASONING & APTITUDE ─────────────────────────────────────────────
  {
    code: "APTITUDE",
    name: "General Intelligence, Reasoning & Numerical Aptitude",
    weight: 0.8,
    topics: [
      { code: "apt.numerical", name: "Numerical Aptitude", description: "Arithmetic — percentages, ratios, time/work, profit/loss, SI/CI." },
      { code: "apt.reasoning_verbal", name: "Verbal Reasoning", description: "Analogies, classification, series, coding-decoding, blood relations." },
      { code: "apt.reasoning_nonverbal", name: "Non-verbal Reasoning", description: "Mirror images, paper folding, embedded figures, pattern completion." },
      { code: "apt.logical", name: "Logical Reasoning", description: "Syllogism, statement-conclusion, cause-effect, assumptions." },
      { code: "apt.data_interpretation", name: "Data Interpretation", description: "Tables, bar/pie/line charts and data sufficiency." },
    ],
  },

  // ── ENGLISH COMPREHENSION ────────────────────────────────────────────
  {
    code: "ENGLISH",
    name: "English Comprehension",
    weight: 0.6,
    topics: [
      { code: "eng.comprehension", name: "Reading Comprehension", description: "Comprehension passages with inferential and vocabulary questions." },
      { code: "eng.grammar", name: "Grammar and Usage", description: "Tenses, articles, prepositions, subject-verb agreement, error spotting." },
      { code: "eng.vocabulary", name: "Vocabulary", description: "Synonyms, antonyms, idioms, phrases and one-word substitution." },
      { code: "eng.sentence", name: "Sentence Construction", description: "Sentence rearrangement, fill in the blanks, cloze test." },
    ],
  },
];

export async function seedGoaPscSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "GA_GPSC" } });
  if (!exam) {
    throw new Error("Run seedExams() first — GA_GPSC exam not found.");
  }
  console.log(`Seeding Goa PSC syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < goaPscSyllabus.length; sIdx++) {
    const s = goaPscSyllabus[sIdx];
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
  seedGoaPscSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
