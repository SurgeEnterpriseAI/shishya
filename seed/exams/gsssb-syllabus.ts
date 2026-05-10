// GSSSB (Gaun Seva Pasandgi Mandal — Gujarat Subordinate Service Selection Board) Bin Sachivalay Clerk / CCE syllabus tree.
// Prelims: 100 MCQs / 100 marks (Reasoning, Aptitude, English, Gujarati + GK).
// Mains for Group A includes Gujarati Language Skills + English Language Skills + General Studies (350 marks).
// Computer Practical: 60 marks; English typing 20 + Gujarati typing 20.
// Source: gsssb.gujarat.gov.in official Bin Sachivalay Clerk / CCE notifications.
//
// Run after seedExams: npx tsx seed/exams/gsssb-syllabus.ts

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

export const gsssbSyllabus: SubjectSeed[] = [
  // ── GENERAL KNOWLEDGE / EVERYDAY SCIENCE / BANKING / CONSTITUTION ────
  {
    code: "GK",
    name: "General Knowledge",
    weight: 1,
    topics: [
      { code: "gk.everyday_science", name: "Everyday Science", description: "Physics, chemistry, biology applications in daily life." },
      { code: "gk.history_india", name: "Indian History", description: "Ancient, medieval, modern India and freedom struggle." },
      { code: "gk.geography_india", name: "Indian Geography", description: "Physical, economic and social geography of India." },
      { code: "gk.indian_polity", name: "Indian Constitution", description: "Constitutional provisions, FR, DPSPs, federalism, judiciary." },
      { code: "gk.indian_economy", name: "Indian Economy", description: "Banking, planning, GST, NITI Aayog, monetary policy." },
      { code: "gk.general_banking", name: "General Banking", description: "RBI, scheduled commercial banks, NABARD, NPA, KYC, CRR/SLR." },
      { code: "gk.jaher_vahivat", name: "Jaher Vahivat (Public Administration)", description: "Concepts of public administration in India and Gujarat." },
      { code: "gk.environment", name: "Environment and Ecology", description: "Ecosystems, biodiversity, climate change and pollution." },
      { code: "gk.science_tech", name: "Science and Technology", description: "Recent IT, biotech, space and defence achievements." },
      { code: "gk.current_affairs", name: "Current Affairs", description: "National and international events, awards, sports, books." },
      { code: "gk.intl_orgs", name: "International Organisations", description: "UN, WHO, IMF, World Bank, SAARC, BRICS, G20." },
    ],
  },

  // ── GUJARAT SPECIFIC ─────────────────────────────────────────────────
  {
    code: "STATE_SPECIFIC",
    name: "Gujarat General Knowledge",
    weight: 1.4,
    topics: [
      { code: "gj.history", name: "History of Gujarat", description: "Ancient (Indus, Mauryan, Solanki), medieval Sultans, Maratha and British era." },
      { code: "gj.freedom", name: "Gujarat in the Freedom Struggle", description: "Salt Satyagraha (Dandi), Bardoli Satyagraha, leaders from Gujarat." },
      { code: "gj.geography", name: "Geography of Gujarat", description: "Physical features, Saurashtra, Kachchh, Gulf of Khambhat, climate." },
      { code: "gj.rivers", name: "Rivers and Dams of Gujarat", description: "Sabarmati, Mahi, Narmada, Tapti, Sardar Sarovar, Ukai." },
      { code: "gj.economy", name: "Economy of Gujarat", description: "Industry, agriculture (cotton, groundnut), ports, GIDC, GIFT City." },
      { code: "gj.culture", name: "Culture and Art of Gujarat", description: "Folk dances (Garba, Dandiya), music, painting, embroidery." },
      { code: "gj.fairs_festivals", name: "Fairs and Festivals", description: "Navratri, Tarnetar, Rann Utsav, Modhera Dance Festival." },
      { code: "gj.tourism", name: "Tourism in Gujarat", description: "Statue of Unity, Somnath, Dwarka, Gir, Rann of Kutch, Ahmedabad heritage." },
      { code: "gj.administration", name: "Administration of Gujarat", description: "Districts, divisions, Governor, CM, secretariat structure." },
      { code: "gj.personalities", name: "Notable Personalities of Gujarat", description: "Mahatma Gandhi, Sardar Patel, Morarji Desai, Vikram Sarabhai." },
      { code: "gj.govt_schemes", name: "Schemes of Gujarat Government", description: "Vatsalya, Mukhyamantri Yuva Swavalamban, Vahli Dikri." },
      { code: "gj.current_affairs_gj", name: "Current Affairs of Gujarat", description: "Recent events, projects and appointments in Gujarat." },
    ],
  },

  // ── GUJARATI LANGUAGE ────────────────────────────────────────────────
  {
    code: "LANG_GUJARATI",
    name: "Gujarati Language Skills",
    weight: 1,
    topics: [
      { code: "guj.varnamala", name: "Varnamala (વર્ણમાલા)", description: "Gujarati alphabet — swar, vyanjan." },
      { code: "guj.sandhi", name: "Sandhi (સંધિ)", description: "Sandhi rules in Gujarati." },
      { code: "guj.samas", name: "Samas (સમાસ)", description: "Types of compound words in Gujarati." },
      { code: "guj.shabd_bhandol", name: "Shabd Bhandol", description: "Synonyms, antonyms, paryayvachi shabd in Gujarati." },
      { code: "guj.idioms", name: "Idioms and Phrases (ruda prayog)", description: "Common Gujarati idioms and proverbs." },
      { code: "guj.vakya_shudhi", name: "Vakya Shudhi", description: "Sentence correction in Gujarati." },
      { code: "guj.alankar", name: "Alankar (અલંકાર)", description: "Gujarati figures of speech." },
      { code: "guj.chhand", name: "Chhand (છંદ)", description: "Gujarati metres." },
      { code: "guj.literature", name: "Gujarati Literature", description: "Major Gujarati poets and writers — Narsinh Mehta, Premanand, Govardhanram." },
      { code: "guj.apathit", name: "Apathit Gadyansh / Padyansh", description: "Unseen Gujarati prose/verse comprehension." },
      { code: "guj.translation", name: "Translation (English to Gujarati)", description: "English-to-Gujarati translation in conventional paper." },
    ],
  },

  // ── ENGLISH LANGUAGE ─────────────────────────────────────────────────
  {
    code: "LANG_ENGLISH",
    name: "English Language Skills",
    weight: 1,
    topics: [
      { code: "eng.grammar", name: "English Grammar", description: "Tenses, articles, prepositions, modals, voice, narration." },
      { code: "eng.vocabulary", name: "Vocabulary", description: "Synonyms, antonyms, one-word substitution, homonyms." },
      { code: "eng.idioms", name: "Idioms and Phrases", description: "Common English idiomatic expressions." },
      { code: "eng.error_correction", name: "Error Spotting and Correction", description: "Spotting grammatical errors in sentences." },
      { code: "eng.comprehension", name: "Reading Comprehension", description: "Unseen passage with vocabulary and inference questions." },
      { code: "eng.cloze", name: "Cloze Test / Fill in the Blanks", description: "Contextual word selection in passages." },
      { code: "eng.translation", name: "Translation (Gujarati to English)", description: "Gujarati-to-English translation in conventional paper." },
      { code: "eng.composition", name: "Composition / Essay Writing", description: "Short essay on given topic in English." },
      { code: "eng.letter", name: "Letter / Application Writing", description: "Formal letter and application drafting." },
    ],
  },

  // ── REASONING & APTITUDE ─────────────────────────────────────────────
  {
    code: "REASONING",
    name: "Reasoning and Quantitative Aptitude",
    weight: 1,
    topics: [
      { code: "qa.number_system", name: "Number System", description: "Whole, rational and irrational numbers; HCF and LCM." },
      { code: "qa.simplification", name: "Simplification", description: "BODMAS, fractions, decimals, surds." },
      { code: "qa.percentage", name: "Percentage", description: "Percentage calculations and applications." },
      { code: "qa.ratio", name: "Ratio and Proportion", description: "Direct, inverse and compound ratios." },
      { code: "qa.average", name: "Average", description: "Arithmetic mean and weighted averages." },
      { code: "qa.profit_loss", name: "Profit and Loss", description: "CP, SP, discount and marked price." },
      { code: "qa.si_ci", name: "Simple and Compound Interest", description: "Interest formulas and applied problems." },
      { code: "qa.time_work", name: "Time and Work", description: "Work efficiency and pipes-cisterns." },
      { code: "qa.time_distance", name: "Time and Distance", description: "Trains, boats, relative speed." },
      { code: "qa.mensuration", name: "Mensuration", description: "Area and volume of 2D and 3D figures." },
      { code: "qa.di", name: "Data Interpretation", description: "Tables, bar/pie/line graphs based questions." },
      { code: "rea.series", name: "Number and Letter Series", description: "Find next/missing term in a series." },
      { code: "rea.coding", name: "Coding-Decoding", description: "Letter, number and substitution coding." },
      { code: "rea.analogy", name: "Analogy and Classification", description: "Word, number, figure analogy and odd-one-out." },
      { code: "rea.blood_relations", name: "Blood Relations", description: "Family tree problems." },
      { code: "rea.directions", name: "Direction Sense", description: "Direction-based path problems." },
      { code: "rea.syllogism", name: "Syllogism", description: "Statement-conclusion logic." },
      { code: "rea.calendar_clock", name: "Calendar and Clock", description: "Day-of-week and clock-angle problems." },
      { code: "rea.seating", name: "Seating Arrangement", description: "Linear and circular seating puzzles." },
    ],
  },

  // ── COMPUTER ─────────────────────────────────────────────────────────
  {
    code: "COMPUTER",
    name: "Computer Aptitude",
    weight: 1,
    topics: [
      { code: "comp.basics", name: "Computer Basics", description: "Generations, types, components, hardware-software." },
      { code: "comp.os", name: "Operating System", description: "Windows basics, file management, common commands." },
      { code: "comp.ms_office", name: "MS Office", description: "Word, Excel, PowerPoint, Access basics." },
      { code: "comp.internet", name: "Internet and E-mail", description: "Browsers, search, e-mail, attachments and security." },
      { code: "comp.security", name: "Cyber Security", description: "Viruses, antivirus, firewalls, phishing." },
      { code: "comp.typing_eng", name: "English Typing", description: "Computer-based English typing test." },
      { code: "comp.typing_guj", name: "Gujarati Typing", description: "Computer-based Gujarati typing test." },
    ],
  },
];

export async function seedGsssbSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "GJ_GSSSB" } });
  if (!exam) {
    throw new Error("Run seedExams() first — GJ_GSSSB exam not found.");
  }
  console.log(`Seeding GSSSB syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < gsssbSyllabus.length; sIdx++) {
    const s = gsssbSyllabus[sIdx];
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
  console.log(`✓ Seeded GSSSB syllabus. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedGsssbSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
