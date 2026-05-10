// WBPSC Clerkship — West Bengal Public Service Commission Clerkship Examination syllabus tree.
// Two-stage exam:
//   Part-I (Objective, 100 marks, 1 hr 30 min): English (30) + GS (40) + Arithmetic (30).
//   Part-II (Conventional, 100 marks, 1 hr): English (Group-A, 50) + Bengali/Hindi/Urdu/Nepali/Santali (Group-B, 50).
// Followed by Computer Operation and Typing Test (qualifying).
// Source: psc.wb.gov.in official Clerkship Examination notification & syllabus.
//
// Run after seedExams: npx tsx seed/exams/wbpsc-clerkship-syllabus.ts

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

export const wbpscClerkshipSyllabus: SubjectSeed[] = [
  // ── GENERAL STUDIES ──────────────────────────────────────────────────
  {
    code: "GK",
    name: "General Studies",
    weight: 1,
    topics: [
      { code: "gs.history_india", name: "Indian History", description: "Ancient (Indus, Vedic, Maurya, Gupta), medieval and modern India." },
      { code: "gs.freedom_struggle", name: "Indian Freedom Struggle", description: "1857 revolt, INC, Gandhi, Bose, Quit India and partition." },
      { code: "gs.geography_india", name: "Indian Geography", description: "Physical, climatic, economic and social geography of India." },
      { code: "gs.geography_world", name: "World Geography", description: "Continents, oceans, latitudes, longitudes and major countries." },
      { code: "gs.indian_polity", name: "Indian Polity and Constitution", description: "Constitution, fundamental rights, DPSPs, Parliament, judiciary." },
      { code: "gs.indian_economy", name: "Indian Economy", description: "Five-Year Plans, banking, GST, NITI Aayog, monetary policy." },
      { code: "gs.general_science", name: "General Science", description: "Physics, chemistry, biology fundamentals at HS standard." },
      { code: "gs.environment", name: "Environment and Ecology", description: "Ecosystems, biodiversity, climate change, conservation." },
      { code: "gs.science_tech", name: "Science and Technology", description: "IT, biotechnology, space, defence achievements of India." },
      { code: "gs.current_affairs", name: "Current Affairs", description: "National and international events, schemes, summits, awards." },
      { code: "gs.sports", name: "Sports", description: "International and national sports, players and tournaments." },
      { code: "gs.awards_books", name: "Awards, Books and Authors", description: "Notable awards, prize-winning books and their authors." },
      { code: "gs.intl_orgs", name: "International Organisations", description: "UN, WHO, IMF, World Bank, SAARC, BRICS, G20." },
    ],
  },

  // ── WEST BENGAL SPECIFIC ─────────────────────────────────────────────
  {
    code: "STATE_SPECIFIC",
    name: "West Bengal General Knowledge",
    weight: 1.2,
    topics: [
      { code: "wb.history", name: "History of West Bengal", description: "Ancient Bengal, Pala-Sena dynasties, Sultanate, Bengal Renaissance, freedom movement." },
      { code: "wb.geography", name: "Geography of West Bengal", description: "Physical features, rivers (Ganga, Hooghly, Teesta), climate, soil." },
      { code: "wb.culture", name: "Bengali Culture", description: "Literature, music (Rabindra Sangeet, Baul), dance, theatre, festivals." },
      { code: "wb.economy", name: "Economy of West Bengal", description: "Agriculture (rice, jute, tea), industry, port, IT and tourism." },
      { code: "wb.tourism", name: "Tourism in West Bengal", description: "Sundarbans, Darjeeling, Kalimpong, Digha, Bishnupur, Shantiniketan." },
      { code: "wb.administration", name: "WB Administration", description: "Districts, divisions, Governor, CM and secretariat structure." },
      { code: "wb.personalities", name: "Notable Bengali Personalities", description: "Tagore, Vivekananda, Bose, Ray, Vidyasagar, Bankim Chandra." },
      { code: "wb.govt_schemes", name: "Schemes of WB Government", description: "Kanyashree, Sabuj Sathi, Rupashree, Lakshmi Bhandar." },
      { code: "wb.current_affairs_wb", name: "Current Affairs of West Bengal", description: "Recent events, projects, appointments in West Bengal." },
    ],
  },

  // ── ARITHMETIC ───────────────────────────────────────────────────────
  {
    code: "MATH",
    name: "Arithmetic",
    weight: 1,
    topics: [
      { code: "ar.number_system", name: "Number System", description: "Whole numbers, integers, rational and irrational numbers, divisibility." },
      { code: "ar.fundamental_ops", name: "Fundamental Operations", description: "Addition, subtraction, multiplication, division and BODMAS." },
      { code: "ar.hcf_lcm", name: "HCF and LCM", description: "Computation and applied problems on HCF and LCM." },
      { code: "ar.simplification", name: "Simplification", description: "Fractions, decimals, square roots and cube roots." },
      { code: "ar.percentage", name: "Percentage", description: "Percentage calculation and applied problems." },
      { code: "ar.average", name: "Average", description: "Arithmetic mean and weighted averages." },
      { code: "ar.ratio_proportion", name: "Ratio and Proportion", description: "Direct, inverse and compound ratios." },
      { code: "ar.profit_loss", name: "Profit and Loss", description: "Cost price, selling price, discount, marked price." },
      { code: "ar.partnership", name: "Partnership", description: "Profit-sharing among partners with capital and time variations." },
      { code: "ar.si_ci", name: "Simple and Compound Interest", description: "Interest formulas and applied problems." },
      { code: "ar.time_work", name: "Time and Work", description: "Work efficiency, pipes and cisterns." },
      { code: "ar.time_distance", name: "Time and Distance", description: "Trains, boats and relative speed problems." },
      { code: "ar.mensuration", name: "Mensuration", description: "Area and perimeter of 2D figures, volume of 3D solids." },
      { code: "ar.algebra", name: "Algebraic Identities", description: "Basic algebraic identities and factorisation." },
      { code: "ar.statistics", name: "Statistics Basics", description: "Mean, median, mode and frequency distribution." },
    ],
  },

  // ── ENGLISH (PART-I OBJECTIVE + PART-II CONVENTIONAL) ────────────────
  {
    code: "LANG",
    name: "English Language",
    weight: 1,
    topics: [
      { code: "eng.grammar", name: "English Grammar", description: "Tenses, articles, prepositions, conjunctions, voice, narration." },
      { code: "eng.vocabulary", name: "Vocabulary", description: "Synonyms, antonyms, one-word substitution, homonyms." },
      { code: "eng.idioms", name: "Idioms and Phrases", description: "Common English idiomatic expressions." },
      { code: "eng.error_correction", name: "Spotting Errors / Sentence Correction", description: "Identifying grammatical errors in sentences." },
      { code: "eng.comprehension", name: "Reading Comprehension", description: "Unseen passage with inference and vocabulary questions." },
      { code: "eng.cloze", name: "Cloze Test / Fill in the Blanks", description: "Contextual word selection in passages." },
      { code: "eng.jumble", name: "Para-jumbles", description: "Restoring logical order of sentences." },
      { code: "eng.translation", name: "Translation (Bengali to English / English to Bengali)", description: "Conventional translation between English and Bengali." },
      { code: "eng.precis", name: "Precis Writing", description: "Summarising a passage in fewer words." },
      { code: "eng.composition", name: "Composition / Essay", description: "Short essay or composition on a given topic." },
      { code: "eng.letter_writing", name: "Letter Writing", description: "Formal and informal letter writing." },
      { code: "eng.report_writing", name: "Report Writing", description: "News/event report drafting in English." },
    ],
  },

  // ── BENGALI / HINDI / URDU / NEPALI / SANTALI (PART-II) ──────────────
  {
    code: "REGIONAL_LANG",
    name: "Regional Language (Bengali / Hindi / Urdu / Nepali / Santali)",
    weight: 1,
    topics: [
      { code: "rl.translation", name: "Translation (English to Regional)", description: "English passage translation into chosen regional language." },
      { code: "rl.composition", name: "Composition / Essay", description: "Short essay in the chosen regional language." },
      { code: "rl.letter", name: "Letter Writing", description: "Formal letter writing in the regional language." },
      { code: "rl.precis", name: "Precis Writing", description: "Summarising a passage in the regional language." },
      { code: "rl.grammar", name: "Grammar of the Regional Language", description: "Sandhi, samas, vakya shudhi, alankar in chosen language." },
      { code: "rl.report", name: "Report Writing", description: "Drafting a short report in the regional language." },
      { code: "rl.drafting", name: "Office Drafting", description: "Notice, circular, application drafting in regional language." },
    ],
  },

  // ── COMPUTER (QUALIFYING TYPING / OPERATION TEST) ────────────────────
  {
    code: "COMPUTER",
    name: "Computer Operation and Typing",
    weight: 1,
    topics: [
      { code: "comp.fundamentals", name: "Computer Fundamentals", description: "Hardware, software, OS, components." },
      { code: "comp.ms_office", name: "MS Office Basics", description: "Word, Excel, PowerPoint at office-clerical level." },
      { code: "comp.internet", name: "Internet and E-mail", description: "Browsers, search, e-mail composition and attachments." },
      { code: "comp.typing_english", name: "English Typing", description: "Typing test in English at prescribed speed." },
      { code: "comp.typing_regional", name: "Regional Language Typing", description: "Typing in Bengali/Hindi/Urdu/Nepali/Santali if opted." },
    ],
  },
];

export async function seedWbpscClerkshipSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "WB_PSC_CLERK" } });
  if (!exam) {
    throw new Error("Run seedExams() first — WB_PSC_CLERK exam not found.");
  }
  console.log(`Seeding WBPSC Clerkship syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < wbpscClerkshipSyllabus.length; sIdx++) {
    const s = wbpscClerkshipSyllabus[sIdx];
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
  console.log(`✓ Seeded WBPSC Clerkship syllabus. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedWbpscClerkshipSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
