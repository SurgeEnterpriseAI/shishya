// MPESB (Madhya Pradesh Employees Selection Board, formerly MPPEB / Vyapam) — Group 4 / Group 5 syllabus tree.
// 100 MCQs / 100 marks / 2 hours / no negative marking.
// Six broad sections: General Knowledge (with MP focus), General Hindi, General English,
// Mathematics, Reasoning & Aptitude, Computer Knowledge.
// Source: esb.mp.gov.in official Group 4 (Stenographer / Asst Grade-3 / Steno-Typist / Typist) notification.
//
// Run after seedExams: npx tsx seed/exams/mpesb-syllabus.ts

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

export const mpesbSyllabus: SubjectSeed[] = [
  // ── GENERAL KNOWLEDGE ────────────────────────────────────────────────
  {
    code: "GK",
    name: "General Knowledge",
    weight: 1,
    topics: [
      { code: "gk.history_india", name: "Indian History", description: "Ancient, medieval and modern India and freedom struggle." },
      { code: "gk.geography_india", name: "Indian Geography", description: "Physical, economic and political geography of India." },
      { code: "gk.indian_polity", name: "Indian Polity", description: "Constitution, Parliament, judiciary, federalism, fundamental rights." },
      { code: "gk.indian_economy", name: "Indian Economy", description: "Banking, GST, planning, NITI Aayog, fiscal-monetary policy." },
      { code: "gk.general_science", name: "General Science", description: "Physics, chemistry, biology fundamentals." },
      { code: "gk.environment", name: "Environment", description: "Ecology, biodiversity, climate change and pollution." },
      { code: "gk.current_affairs", name: "Current Affairs", description: "National and international events and government schemes." },
      { code: "gk.awards_sports", name: "Awards and Sports", description: "Notable awards, sports tournaments, players." },
      { code: "gk.books_authors", name: "Books and Authors", description: "Recent notable books and their authors." },
      { code: "gk.intl_orgs", name: "International Organizations", description: "UN, WHO, IMF, World Bank, SAARC, BRICS." },
    ],
  },

  // ── MADHYA PRADESH SPECIFIC ──────────────────────────────────────────
  {
    code: "STATE_SPECIFIC",
    name: "Madhya Pradesh General Knowledge",
    weight: 1.4,
    topics: [
      { code: "mp.history", name: "History of Madhya Pradesh", description: "Mauryan, Gupta, Paramara, Chandela, Holkar, Scindia and freedom movement." },
      { code: "mp.geography", name: "Geography of MP", description: "Physical features — Malwa Plateau, Vindhya, Satpura ranges; climate." },
      { code: "mp.rivers", name: "Rivers of MP", description: "Narmada, Tapti, Chambal, Betwa, Son, Kshipra and major dams." },
      { code: "mp.flora_fauna", name: "Flora and Fauna of MP", description: "Forests, state animal (barasingha), state bird, state flower." },
      { code: "mp.np_sanctuaries", name: "National Parks and Sanctuaries", description: "Kanha, Bandhavgarh, Pench, Satpura, Panna, Madhav." },
      { code: "mp.tribes", name: "Tribes of MP", description: "Gond, Bhil, Baiga, Sahariya — culture, customs, socioeconomics." },
      { code: "mp.economy", name: "Economy of MP", description: "Agriculture, minerals (diamond, coal), industries, tourism." },
      { code: "mp.culture", name: "Art, Culture and Heritage", description: "Folk dances (Matki, Gangaur), music, paintings, fairs." },
      { code: "mp.tourism", name: "Tourism in MP", description: "Khajuraho, Sanchi, Gwalior, Mandu, Ujjain, Orchha, Bhimbetka." },
      { code: "mp.administration", name: "Administration of MP", description: "Districts, divisions, Governor, CM, secretariat structure." },
      { code: "mp.personalities", name: "Notable Personalities of MP", description: "Tantia Tope, Rani Avantibai, Atal Bihari Vajpayee, Kishore Kumar." },
      { code: "mp.govt_schemes", name: "Schemes of MP Government", description: "Ladli Behna, Mukhyamantri Kanyadan, Sambal, Kisan Kalyan." },
      { code: "mp.current_affairs_mp", name: "Current Affairs of MP", description: "Recent events, projects, sports and appointments in MP." },
    ],
  },

  // ── GENERAL HINDI ────────────────────────────────────────────────────
  {
    code: "LANG_HINDI",
    name: "General Hindi",
    weight: 1,
    topics: [
      { code: "hin.varnamala", name: "Varnamala", description: "Hindi alphabet — swar, vyanjan, classification." },
      { code: "hin.sandhi", name: "Sandhi", description: "Swar, vyanjan, visarg sandhi rules." },
      { code: "hin.samas", name: "Samas", description: "Tatpurush, dvandva, bahuvrihi, karmadharaya samas." },
      { code: "hin.upsarg_pratyay", name: "Upsarg and Pratyay", description: "Prefixes and suffixes in Hindi." },
      { code: "hin.paryayvachi", name: "Paryayvachi Shabd", description: "Hindi synonyms." },
      { code: "hin.vilom", name: "Vilom Shabd", description: "Hindi antonyms." },
      { code: "hin.muhavare", name: "Muhavare aur Lokoktiyan", description: "Hindi idioms and proverbs." },
      { code: "hin.vakya_shudhi", name: "Vakya Shudhi", description: "Sentence correction in Hindi." },
      { code: "hin.alankar", name: "Alankar", description: "Hindi figures of speech." },
      { code: "hin.ras_chhand", name: "Ras and Chhand", description: "Hindi rasas and metres." },
      { code: "hin.apathit", name: "Apathit Gadyansh", description: "Unseen Hindi prose passage with comprehension." },
      { code: "hin.vartani", name: "Hindi Vartani", description: "Correct spelling rules in Hindi." },
    ],
  },

  // ── GENERAL ENGLISH ──────────────────────────────────────────────────
  {
    code: "LANG_ENGLISH",
    name: "General English",
    weight: 1,
    topics: [
      { code: "eng.grammar", name: "English Grammar", description: "Tenses, articles, prepositions, voice, narration, modals." },
      { code: "eng.vocabulary", name: "Vocabulary", description: "Synonyms, antonyms, one-word substitution." },
      { code: "eng.idioms", name: "Idioms and Phrases", description: "Common English idiomatic expressions." },
      { code: "eng.error_correction", name: "Error Spotting and Correction", description: "Identifying grammatical errors in sentences." },
      { code: "eng.comprehension", name: "Reading Comprehension", description: "Unseen passage with inference and vocabulary questions." },
      { code: "eng.fill_blanks", name: "Fill in the Blanks", description: "Contextual word selection." },
      { code: "eng.cloze", name: "Cloze Test", description: "Passage-based fill-in-the-blank." },
      { code: "eng.sentence_formation", name: "Sentence Formation", description: "Restoring sentences and phrasing." },
    ],
  },

  // ── MATHEMATICS ──────────────────────────────────────────────────────
  {
    code: "MATH",
    name: "Mathematics",
    weight: 1,
    topics: [
      { code: "ma.number_system", name: "Number System", description: "Whole, rational, irrational numbers; LCM, HCF; divisibility." },
      { code: "ma.simplification", name: "Simplification", description: "BODMAS, fractions, decimals, surds." },
      { code: "ma.percentage", name: "Percentage", description: "Percentage calculations and applications." },
      { code: "ma.ratio_proportion", name: "Ratio and Proportion", description: "Direct, inverse and compound ratios." },
      { code: "ma.average", name: "Average", description: "Arithmetic mean, weighted average problems." },
      { code: "ma.profit_loss", name: "Profit and Loss", description: "CP, SP, discount and marked price problems." },
      { code: "ma.si_ci", name: "Simple and Compound Interest", description: "Interest formulas and applied problems." },
      { code: "ma.time_work", name: "Time and Work", description: "Work efficiency and pipes-cisterns." },
      { code: "ma.time_distance", name: "Time and Distance", description: "Trains, boats and average/relative speed." },
      { code: "ma.mensuration", name: "Mensuration", description: "Area and volume of 2D and 3D figures." },
      { code: "ma.statistics", name: "Statistics", description: "Mean, median, mode, frequency distribution." },
      { code: "ma.di", name: "Data Interpretation", description: "Tables, bar/pie/line graphs based questions." },
    ],
  },

  // ── REASONING ────────────────────────────────────────────────────────
  {
    code: "REASONING",
    name: "Reasoning and Aptitude",
    weight: 1,
    topics: [
      { code: "rea.coding", name: "Coding-Decoding", description: "Letter, number and substitution coding." },
      { code: "rea.series", name: "Number and Letter Series", description: "Find next/missing/wrong term in a series." },
      { code: "rea.analogy", name: "Analogy", description: "Word, number and figure analogy." },
      { code: "rea.classification", name: "Classification", description: "Identifying odd one out from a group." },
      { code: "rea.puzzles", name: "Puzzles", description: "Seating arrangement, scheduling, grouping puzzles." },
      { code: "rea.blood_relations", name: "Blood Relations", description: "Family tree problems." },
      { code: "rea.directions", name: "Direction Sense", description: "Direction-based path problems." },
      { code: "rea.syllogism", name: "Syllogism", description: "Statement-conclusion and Venn diagrams." },
      { code: "rea.calendar_clock", name: "Calendar and Clock", description: "Day-of-week and clock-angle problems." },
      { code: "rea.statement_arg", name: "Statement-Argument / Assumption", description: "Reasoning with statements, arguments and assumptions." },
    ],
  },

  // ── COMPUTER KNOWLEDGE ───────────────────────────────────────────────
  {
    code: "COMPUTER",
    name: "Computer Knowledge",
    weight: 1,
    topics: [
      { code: "comp.basics", name: "Computer Basics", description: "Generations, components, hardware-software, types." },
      { code: "comp.os", name: "Operating Systems", description: "Windows, file management, basic OS commands." },
      { code: "comp.ms_office", name: "MS Office", description: "Word, Excel, PowerPoint, Access basics." },
      { code: "comp.internet", name: "Internet and Networking", description: "Browsers, search, e-mail, LAN/WAN basics." },
      { code: "comp.security", name: "Cyber Security", description: "Viruses, antivirus, firewalls, phishing, password hygiene." },
      { code: "comp.digital_tools", name: "Digital Tools", description: "Cloud storage, online forms, e-Governance portals." },
    ],
  },
];

export async function seedMpesbSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "MP_MPESB" } });
  if (!exam) {
    throw new Error("Run seedExams() first — MP_MPESB exam not found.");
  }
  console.log(`Seeding MPESB syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < mpesbSyllabus.length; sIdx++) {
    const s = mpesbSyllabus[sIdx];
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
  console.log(`✓ Seeded MPESB syllabus. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedMpesbSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
