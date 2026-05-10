// Haryana CET (Common Eligibility Test) — full syllabus tree.
// Conducted by Haryana Staff Selection Commission (HSSC).
// 100 MCQs × 1 mark = 100 marks in 105 minutes. No negative marking.
// Bilingual paper (English & Hindi), OMR-based. Used for Group C and Group D recruitment.
// Source: official HSSC CET notification & syllabus (hssc.gov.in),
// cross-checked with HSSC official advertisement.
//
// Run after seedExams: npx tsx seed/exams/hssc-cet-syllabus.ts

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

export const hsscCetSyllabus: SubjectSeed[] = [
  // ── GENERAL AWARENESS / GK ────────────────────────────────────────────
  {
    code: "GK",
    name: "General Awareness",
    weight: 1,
    topics: [
      {
        code: "gk.history",
        name: "History",
        description: "Indian history from ancient to modern times.",
        subtopics: [
          { code: "gk.history.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Mauryan and Gupta empires." },
          { code: "gk.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals and bhakti-sufi movements." },
          { code: "gk.history.modern", name: "Modern India", description: "British conquest, colonial rule and freedom struggle." },
          { code: "gk.history.freedom", name: "Indian National Movement", description: "1857 revolt, INC, Gandhian movements, Quit India and partition." },
        ],
      },
      {
        code: "gk.polity",
        name: "Indian Polity and Constitution",
        description: "Indian constitution and governance institutions.",
        subtopics: [
          { code: "gk.polity.constitution", name: "Indian Constitution", description: "Preamble, salient features and sources." },
          { code: "gk.polity.fr_dpsp", name: "Fundamental Rights and DPSPs", description: "Articles 12-51A — fundamental rights, duties and DPSPs." },
          { code: "gk.polity.union", name: "Union Government", description: "President, PM, Council of Ministers and Parliament." },
          { code: "gk.polity.state", name: "State Government", description: "Governor, CM, State Legislature and High Courts." },
          { code: "gk.polity.judiciary", name: "Judiciary", description: "Supreme Court, High Courts, judicial review and PIL." },
        ],
      },
      {
        code: "gk.geography",
        name: "Geography",
        description: "Indian and world geography.",
        subtopics: [
          { code: "gk.geography.india", name: "Indian Geography", description: "Physical features, climate, rivers, agriculture and resources." },
          { code: "gk.geography.world", name: "World Geography", description: "Continents, oceans and major physical features." },
          { code: "gk.geography.environment", name: "Environment", description: "Climate change, biodiversity, pollution and conservation." },
        ],
      },
      {
        code: "gk.economics",
        name: "Economics",
        description: "Indian economy basics.",
        subtopics: [
          { code: "gk.economics.basics", name: "Basics of Indian Economy", description: "Sectors, mixed economy and economic indicators." },
          { code: "gk.economics.budget", name: "Budget and Taxation", description: "Union Budget, GST and tax structure." },
          { code: "gk.economics.banking", name: "Banking", description: "RBI, commercial banks and monetary policy." },
        ],
      },
      {
        code: "gk.art_culture",
        name: "Art and Culture",
        description: "Indian art, culture and heritage.",
        subtopics: [
          { code: "gk.art_culture.dance", name: "Indian Classical Dance", description: "Bharatanatyam, Kathak, Odissi, Kuchipudi etc." },
          { code: "gk.art_culture.music", name: "Indian Music", description: "Hindustani and Carnatic music." },
          { code: "gk.art_culture.festivals", name: "Festivals and Heritage Sites", description: "Major festivals and UNESCO World Heritage Sites." },
        ],
      },
      {
        code: "gk.current",
        name: "Current Affairs",
        description: "National and international current events.",
        subtopics: [
          { code: "gk.current.national", name: "National Current Events", description: "Major national events, schemes and policies." },
          { code: "gk.current.international", name: "International Current Events", description: "Major international summits and treaties." },
          { code: "gk.current.sports", name: "Sports", description: "Major sports events, awards and tournaments." },
          { code: "gk.current.awards", name: "Awards and Honours", description: "National and international awards." },
          { code: "gk.current.books", name: "Books and Authors", description: "Recent notable books and their authors." },
        ],
      },
    ],
  },

  // ── REASONING ────────────────────────────────────────────────────────
  {
    code: "REASONING",
    name: "Reasoning Ability",
    weight: 1,
    topics: [
      { code: "reasoning.analogy", name: "Analogy", description: "Word, number and figure analogies." },
      { code: "reasoning.series", name: "Series Completion", description: "Number, letter and figure series — find the next term." },
      { code: "reasoning.coding", name: "Coding-Decoding", description: "Letter-letter, letter-number and number-number coding." },
      { code: "reasoning.blood_relation", name: "Blood Relations", description: "Family relationship problems and family-tree puzzles." },
      { code: "reasoning.direction", name: "Direction Sense", description: "Direction-and-distance problems and shortest path." },
      { code: "reasoning.syllogism", name: "Syllogism", description: "Statement-conclusion and statement-assumption problems." },
      { code: "reasoning.puzzle", name: "Puzzles", description: "Seating arrangement, scheduling and grouping puzzles." },
      { code: "reasoning.alphanumeric", name: "Alphanumeric Series", description: "Mixed letter-number-symbol series." },
      { code: "reasoning.classification", name: "Classification (Odd One Out)", description: "Identifying the odd member in a group." },
      { code: "reasoning.ranking", name: "Ranking and Order", description: "Position, rank and order arrangement." },
      { code: "reasoning.statement_arg", name: "Statement and Arguments", description: "Strong and weak arguments based on a statement." },
      { code: "reasoning.cause_effect", name: "Cause and Effect", description: "Cause-effect relationship problems." },
      { code: "reasoning.mirror_water", name: "Mirror and Water Image", description: "Mirror image, water image and reflection problems." },
      { code: "reasoning.paper_cut", name: "Paper Folding and Cutting", description: "Visual reasoning — paper-folding and cutting problems." },
      { code: "reasoning.cube_dice", name: "Cube and Dice", description: "Cube and dice problems — opposite faces and counting." },
      { code: "reasoning.venn", name: "Venn Diagrams", description: "Set-based Venn diagram questions." },
    ],
  },

  // ── MATHEMATICS / QUANTITATIVE ABILITY ────────────────────────────────
  {
    code: "MATH",
    name: "Quantitative Ability",
    weight: 1,
    topics: [
      { code: "math.numbers", name: "Number System", description: "Whole numbers, integers, divisibility and place value." },
      { code: "math.simplification", name: "Simplification", description: "BODMAS, fractions, decimals, square and cube roots." },
      { code: "math.lcm_hcf", name: "LCM and HCF", description: "Lowest common multiple and highest common factor." },
      { code: "math.percentage", name: "Percentage", description: "Percentage and applications." },
      { code: "math.ratio", name: "Ratio and Proportion", description: "Ratio, proportion and partnership." },
      { code: "math.average", name: "Average", description: "Simple average and weighted average." },
      { code: "math.profit_loss", name: "Profit, Loss and Discount", description: "Commercial mathematics and cost-price/selling-price problems." },
      { code: "math.simple_interest", name: "Simple and Compound Interest", description: "SI and CI calculations and applications." },
      { code: "math.time_work", name: "Time and Work", description: "Work efficiency, pipes-and-cisterns and group work." },
      { code: "math.time_distance", name: "Time and Distance", description: "Trains, boats, average speed and relative speed." },
      { code: "math.mensuration", name: "Mensuration", description: "Area, perimeter, surface area and volume of plane figures and solids." },
      { code: "math.algebra", name: "Algebra", description: "Algebraic expressions, identities and linear equations." },
      { code: "math.data_interpretation", name: "Data Interpretation", description: "Tables, bar/pie/line graphs — calculation-based questions." },
      { code: "math.geometry", name: "Geometry", description: "Lines, angles, triangles, quadrilaterals and circles." },
    ],
  },

  // ── LANGUAGE — Hindi & English ───────────────────────────────────────
  {
    code: "LANG",
    name: "Hindi and English Language",
    weight: 1,
    topics: [
      { code: "lang.eng_grammar", name: "English Grammar", description: "Parts of speech, tenses, voice, narration and articles." },
      { code: "lang.eng_vocab", name: "English Vocabulary", description: "Synonyms, antonyms, one-word substitution and idioms." },
      { code: "lang.eng_comprehension", name: "English Reading Comprehension", description: "Unseen passages with comprehension and inference questions." },
      { code: "lang.eng_sentence", name: "Sentence Structure (English)", description: "Sentence correction, sentence improvement and rearrangement." },
      { code: "lang.hindi_grammar", name: "Hindi Vyakaran", description: "Sangya, sarvanaam, visheshan, kriya, kaal and karak." },
      { code: "lang.hindi_vocab", name: "Hindi Vocabulary", description: "Paryayvachi, vilom, anekarthi and one-word substitution." },
      { code: "lang.hindi_idioms", name: "Hindi Muhavare and Lokoktiyan", description: "Hindi idioms and proverbs." },
      { code: "lang.hindi_sandhi_samas", name: "Sandhi and Samas", description: "Sandhi rules and types of samas." },
      { code: "lang.hindi_comprehension", name: "Hindi Reading Comprehension", description: "Hindi gadyansh-based comprehension questions." },
    ],
  },

  // ── HARYANA — STATE-SPECIFIC ──────────────────────────────────────────
  {
    code: "STATE_SPECIFIC",
    name: "Haryana — General Knowledge",
    weight: 1.4,
    topics: [
      { code: "hr.history", name: "History of Haryana", description: "Ancient Haryana, Battles of Tarain, Panipat and freedom struggle in Haryana." },
      { code: "hr.geography", name: "Geography of Haryana", description: "Physical features, rivers (Yamuna, Ghaggar), climate and agro-climatic zones." },
      { code: "hr.agriculture", name: "Agriculture of Haryana", description: "Major crops (wheat, paddy, mustard), Green Revolution and dairy farming." },
      { code: "hr.economy", name: "Economy of Haryana", description: "Industry, MSMEs, IT/auto hubs (Gurugram, Manesar) and economic indicators." },
      { code: "hr.administration", name: "Administrative Setup", description: "Districts, divisions and major administrative bodies of Haryana." },
      { code: "hr.culture", name: "Culture and Heritage of Haryana", description: "Folk dances (Ghoomar, Phag, Loor), folk music (Ragni), saang theatre and festivals." },
      { code: "hr.cuisine", name: "Cuisine and Customs", description: "Bajra-roti, Kadhi, churma and traditional Haryanvi customs." },
      { code: "hr.personalities", name: "Famous Personalities", description: "Sir Chhotu Ram, Lala Lajpat Rai, Bansi Lal, Chaudhary Devi Lal, P V Sindhu, Yogeshwar Dutt." },
      { code: "hr.sports", name: "Sports of Haryana", description: "Wrestling, kabaddi, boxing — Haryana's sports legacy and Olympic medallists." },
      { code: "hr.schemes", name: "Welfare Schemes of Haryana", description: "State-government schemes — Beti Bachao Beti Padhao, Saksham Yuva, Mukhyamantri schemes." },
      { code: "hr.tourism", name: "Tourist Places of Haryana", description: "Kurukshetra, Pinjore, Sultanpur Lake, Surajkund and other tourist spots." },
      { code: "hr.current", name: "Haryana Current Affairs", description: "Recent developments, government schemes and personalities of Haryana." },
    ],
  },

  // ── COMPUTER KNOWLEDGE ───────────────────────────────────────────────
  {
    code: "COMPUTER",
    name: "Computer Knowledge",
    weight: 1,
    topics: [
      { code: "comp.fundamentals", name: "Computer Fundamentals", description: "Hardware, software, operating systems and basic concepts." },
      { code: "comp.windows", name: "Windows Operating System", description: "Windows interface, file management and system tools." },
      { code: "comp.ms_word", name: "MS Word", description: "Document creation, formatting, tables and printing in MS Word." },
      { code: "comp.ms_excel", name: "MS Excel", description: "Spreadsheets, formulas, functions and charts in MS Excel." },
      { code: "comp.ms_powerpoint", name: "MS PowerPoint", description: "Slide creation, layouts, animations and presentations." },
      { code: "comp.internet", name: "Internet and Web Browsing", description: "Web browsers, search engines, downloading and uploading." },
      { code: "comp.email", name: "Email", description: "Managing an email account — inbox, attachments, signatures and folders." },
      { code: "comp.security", name: "Computer Security", description: "Antivirus, firewall, password security and cyber-safety basics." },
      { code: "comp.shortcuts", name: "Keyboard Shortcuts", description: "Common Windows and MS Office shortcuts." },
    ],
  },
];

export async function seedHsscCetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "HR_HSSC_CET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — HR_HSSC_CET exam not found.");
  }
  console.log(`Seeding HSSC CET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < hsscCetSyllabus.length; sIdx++) {
    const s = hsscCetSyllabus[sIdx];
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
  seedHsscCetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
