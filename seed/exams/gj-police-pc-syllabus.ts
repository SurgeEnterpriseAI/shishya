// Gujarat Police Constable (Lokrakshak / LRD) — full syllabus tree.
// Conducted by Gujarat Police Recruitment Board (LRB), Gandhinagar.
// Common written exam for Unarmed/Armed Constable + SRPF + Jail Sepoy.
// 100 MCQs in 60 minutes (1 hour). Negative marking 0.25 per wrong answer.
// Source: gprb.gujarat.gov.in official syllabus + LRB Lokrakshak notification 2024,
// cross-checked with MaruGujarat/Testbook coverage of the latest published pattern.
//
// Run after seedExams: npx tsx seed/exams/gj-police-pc-syllabus.ts

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

export const gjPolicePcSyllabus: SubjectSeed[] = [
  // ── REASONING & MENTAL ABILITY ────────────────────────────────────────
  {
    code: "REASONING",
    name: "Reasoning and Mental Ability",
    weight: 1,
    topics: [
      { code: "gj.reason.series", name: "Number and Letter Series", description: "Find the next/missing term in numeric, alphabetic and alphanumeric series." },
      { code: "gj.reason.coding", name: "Coding and Decoding", description: "Letter-shift, number-letter and symbol-based coding problems." },
      { code: "gj.reason.analogy", name: "Analogies and Classification", description: "Word, number, letter and figural analogy plus odd-one-out." },
      { code: "gj.reason.blood_relations", name: "Blood Relations", description: "Family-tree problems, pointing-style and generation-based questions." },
      { code: "gj.reason.directions", name: "Direction and Distance", description: "Compass-direction problems and shortest-distance calculation." },
      { code: "gj.reason.ranking", name: "Order and Ranking", description: "Linear arrangement and rank-from-top/bottom problems." },
      { code: "gj.reason.seating", name: "Seating Arrangement", description: "Linear and circular seating arrangement puzzles." },
      { code: "gj.reason.syllogism", name: "Syllogism", description: "Two/three statement deductions using all/some/no quantifiers." },
      { code: "gj.reason.venn", name: "Venn Diagrams", description: "Two- and three-set logical relationships and inferences." },
      { code: "gj.reason.statement_conclusion", name: "Statement and Conclusion", description: "Identify which conclusion follows from given statements." },
      { code: "gj.reason.data_sufficiency", name: "Data Sufficiency", description: "Decide whether the given data is sufficient to answer the question." },
      { code: "gj.reason.non_verbal", name: "Non-Verbal Reasoning", description: "Mirror/water images, paper folding/cutting and embedded figures." },
      { code: "gj.reason.input_output", name: "Input-Output", description: "Machine input arrangement and step-based problems." },
      { code: "gj.reason.cubes_dice", name: "Cubes and Dice", description: "Surface counting on cubes and dice opposite-face problems." },
    ],
  },

  // ── QUANTITATIVE APTITUDE ─────────────────────────────────────────────
  {
    code: "MATH",
    name: "Quantitative Aptitude",
    weight: 1,
    topics: [
      { code: "gj.math.number_system", name: "Number System", description: "Whole numbers, integers, divisibility, HCF and LCM." },
      { code: "gj.math.simplification", name: "Simplification and Approximation", description: "BODMAS, surds, indices and approximate value calculations." },
      { code: "gj.math.percentage", name: "Percentage", description: "Percentage conversion and applied percentage-change problems." },
      { code: "gj.math.ratio_proportion", name: "Ratio and Proportion", description: "Compound ratio, partnership and proportion problems." },
      { code: "gj.math.average", name: "Average", description: "Mean of numbers, weighted averages and age-related averages." },
      { code: "gj.math.profit_loss", name: "Profit, Loss and Discount", description: "CP/SP, marked price, single and successive discounts." },
      { code: "gj.math.interest", name: "Simple and Compound Interest", description: "SI, CI and applied interest calculations." },
      { code: "gj.math.time_work", name: "Time and Work", description: "Work efficiency, joint work and pipes-and-cisterns." },
      { code: "gj.math.time_distance", name: "Time, Speed and Distance", description: "Trains, boats, average speed and relative speed problems." },
      { code: "gj.math.mensuration", name: "Mensuration", description: "Areas, perimeters, surface areas and volumes of standard 2D/3D figures." },
      { code: "gj.math.algebra", name: "Algebra", description: "Linear and quadratic equations, identities and basic algebraic manipulation." },
      { code: "gj.math.geometry", name: "Geometry", description: "Triangles, circles, polygons and angle properties." },
      { code: "gj.math.data_interpretation", name: "Data Interpretation", description: "Tables, bar/pie/line graphs — calculation-based questions." },
    ],
  },

  // ── GENERAL KNOWLEDGE & CURRENT AFFAIRS ───────────────────────────────
  {
    code: "GK",
    name: "General Knowledge and Current Affairs",
    weight: 1.2,
    topics: [
      { code: "gj.gk.history_india", name: "History of India",
        description: "Ancient, medieval and modern Indian history and freedom struggle.",
        subtopics: [
          { code: "gj.gk.history_india.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Mauryan and Gupta empires." },
          { code: "gj.gk.history_india.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals, Marathas and regional powers." },
          { code: "gj.gk.history_india.modern", name: "Modern India and Freedom Struggle", description: "British rule, 1857 revolt, Gandhian movement, partition." },
        ],
      },
      { code: "gj.gk.geography", name: "Indian Geography", description: "Physical features, climate, rivers, agriculture, minerals and demography of India." },
      { code: "gj.gk.polity", name: "Indian Polity and Constitution",
        description: "Indian Constitution, governance and constitutional bodies.",
        subtopics: [
          { code: "gj.gk.polity.constitution", name: "Constitution of India", description: "Preamble, salient features, fundamental rights and duties." },
          { code: "gj.gk.polity.union_state", name: "Union and State Government", description: "President, PM, Parliament, Governor, CM and State Legislature." },
          { code: "gj.gk.polity.judiciary", name: "Judiciary and Local Self-Government", description: "Supreme Court, High Courts, Panchayati Raj and urban local bodies." },
        ],
      },
      { code: "gj.gk.economy", name: "Indian Economy", description: "Banking, RBI, budget, GST, taxation and major economic schemes." },
      { code: "gj.gk.science", name: "General Science",
        description: "Day-to-day science applicable in policing and general awareness.",
        subtopics: [
          { code: "gj.gk.science.physics", name: "Physics", description: "Mechanics, light, sound, electricity and basic physics concepts." },
          { code: "gj.gk.science.chemistry", name: "Chemistry", description: "Acids, bases, salts, common chemicals and chemical reactions." },
          { code: "gj.gk.science.biology", name: "Biology", description: "Human body, plants, animals, diseases and nutrition." },
          { code: "gj.gk.science.tech", name: "Science and Technology", description: "ISRO, DRDO, IT, biotechnology, space and defence developments." },
        ],
      },
      { code: "gj.gk.environment", name: "Environment and Ecology", description: "Ecosystems, biodiversity, climate change, pollution and conservation." },
      { code: "gj.gk.current_affairs", name: "Current Affairs", description: "National and international events of the last 6-12 months." },
      { code: "gj.gk.sports", name: "Sports", description: "Cups, trophies, national/international tournaments and recent winners." },
      { code: "gj.gk.awards", name: "Awards and Honours", description: "Padma awards, gallantry awards and Nobel laureates." },
      { code: "gj.gk.books_authors", name: "Books and Authors", description: "Notable books and their Indian and international authors." },
      { code: "gj.gk.static_gk", name: "Static GK", description: "Important days, national symbols, capitals, currencies and dance forms." },
    ],
  },

  // ── GUJARATI LANGUAGE ─────────────────────────────────────────────────
  {
    code: "LANG",
    name: "Gujarati Language",
    weight: 1,
    topics: [
      { code: "gj.lang.grammar", name: "Gujarati Grammar (Vyakaran)", description: "Sandhi, samas, alankar, chand and basic grammatical rules." },
      { code: "gj.lang.vocabulary", name: "Vocabulary", description: "Synonyms (paryayvachi), antonyms (vipritarthi) and one-word substitution." },
      { code: "gj.lang.idioms", name: "Idioms and Phrases (Rudhi Prayog/Kahevat)", description: "Common Gujarati idioms, proverbs and their meanings." },
      { code: "gj.lang.sentence", name: "Sentence Correction", description: "Spotting and correcting grammatical errors in Gujarati sentences." },
      { code: "gj.lang.comprehension", name: "Reading Comprehension", description: "Unseen passages with inference and vocabulary questions." },
      { code: "gj.lang.literature", name: "Famous Gujarati Writers", description: "Narsinh Mehta, Premanand, Govardhanram, Umashankar Joshi and others." },
    ],
  },

  // ── GUJARAT-SPECIFIC ──────────────────────────────────────────────────
  {
    code: "STATE_SPECIFIC",
    name: "Gujarat State Specific",
    weight: 1.4,
    topics: [
      { code: "gj.state.history", name: "History of Gujarat", description: "Solanki, Vaghela, Sultanate and Maratha rule; Gujarat in freedom movement." },
      { code: "gj.state.geography", name: "Geography of Gujarat", description: "Districts, rivers, climate, coastline, Rann of Kutch and Saurashtra." },
      { code: "gj.state.economy", name: "Economy of Gujarat", description: "Industries, ports, agriculture, dairy and Vibrant Gujarat summits." },
      { code: "gj.state.administration", name: "Gujarat Administration", description: "CM, Council of Ministers, Secretariat, districts and revenue divisions." },
      { code: "gj.state.culture", name: "Culture and Festivals", description: "Garba, Navratri, Uttarayan, Rann Utsav and traditional crafts." },
      { code: "gj.state.tourism", name: "Tourism and Heritage", description: "Statue of Unity, Somnath, Dwarka, Gir, Sabarmati Ashram and UNESCO sites." },
      { code: "gj.state.freedom_fighters", name: "Gujarat Freedom Fighters", description: "Mahatma Gandhi, Sardar Patel, Morarji Desai and Dadabhai Naoroji." },
      { code: "gj.state.schemes", name: "Welfare Schemes of Gujarat", description: "Mukhyamantri Yuva Swavalamban Yojana, MA Amrutam, Gujarat-specific schemes." },
      { code: "gj.state.current", name: "Gujarat Current Affairs", description: "Recent events, awards, sports and policies relating to Gujarat." },
    ],
  },
];

export async function seedGjPolicePcSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "GJ_POLICE_PC" } });
  if (!exam) {
    throw new Error("Run seedExams() first — GJ_POLICE_PC exam not found.");
  }
  console.log(`Seeding Gujarat Police Constable syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < gjPolicePcSyllabus.length; sIdx++) {
    const s = gjPolicePcSyllabus[sIdx];
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
  seedGjPolicePcSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
