// Andhra Pradesh Police Constable (APSLPRB) Preliminary Written Test — full syllabus tree.
// Conducted by AP State Level Police Recruitment Board.
// Preliminary Written Test: 200 MCQs in 3 hours, 200 marks. No negative marking.
// Available in English, Telugu and Urdu (except English language section).
// Source: slprb.ap.gov.in PC notification + Adda247/Careerpower cross-check.
//
// Run after seedExams: npx tsx seed/exams/ap-police-pc-syllabus.ts

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

export const apPolicePcSyllabus: SubjectSeed[] = [
  // ── REASONING & MENTAL ABILITY ────────────────────────────────────────
  {
    code: "REASONING",
    name: "Test of Reasoning and Mental Ability",
    weight: 1,
    topics: [
      { code: "ap.reason.analogy", name: "Analogies", description: "Word, number, letter and figural analogy pairs." },
      { code: "ap.reason.classification", name: "Classification", description: "Odd-one-out among words, numbers and figures." },
      { code: "ap.reason.series", name: "Series", description: "Number, letter, alphanumeric and figural series problems." },
      { code: "ap.reason.coding", name: "Coding and Decoding", description: "Letter-shift, number and symbol-based coding problems." },
      { code: "ap.reason.directions", name: "Direction and Distance", description: "Compass-direction and shortest-distance problems." },
      { code: "ap.reason.blood_relations", name: "Blood Relations", description: "Family-tree problems and pointing-style questions." },
      { code: "ap.reason.ranking", name: "Order and Ranking", description: "Linear arrangement and rank-from-top/bottom problems." },
      { code: "ap.reason.seating", name: "Seating Arrangement", description: "Linear and circular seating arrangement puzzles." },
      { code: "ap.reason.syllogism", name: "Syllogism", description: "Two-statement deductions using all/some/no quantifiers." },
      { code: "ap.reason.venn", name: "Venn Diagrams", description: "Two- and three-set logical relationships and inferences." },
      { code: "ap.reason.statement_conclusion", name: "Statements, Conclusions and Arguments", description: "Identify which conclusion or argument follows from a statement." },
      { code: "ap.reason.spatial", name: "Spatial Visualization and Orientation", description: "Mentally rotate and orient 2-D and 3-D shapes." },
      { code: "ap.reason.non_verbal", name: "Non-Verbal Reasoning", description: "Mirror image, water image, paper folding/cutting and embedded figures." },
      { code: "ap.reason.cubes_dice", name: "Cubes and Dice", description: "Surface counting on cubes and dice opposite-face problems." },
    ],
  },

  // ── ARITHMETIC (SSC standard) ─────────────────────────────────────────
  {
    code: "MATH",
    name: "Arithmetic (SSC Standard)",
    weight: 1,
    topics: [
      { code: "ap.math.number_system", name: "Number System", description: "Whole numbers, integers, divisibility, HCF and LCM." },
      { code: "ap.math.simplification", name: "Simplification", description: "BODMAS, fractions, decimals and surds." },
      { code: "ap.math.percentage", name: "Percentage", description: "Percentage conversion and applied percentage problems." },
      { code: "ap.math.ratio_proportion", name: "Ratio and Proportion", description: "Compound ratio, partnership and proportion problems." },
      { code: "ap.math.average", name: "Average", description: "Mean of numbers, weighted averages and age-related averages." },
      { code: "ap.math.profit_loss", name: "Profit and Loss", description: "CP/SP, marked price, discount and profit/loss percentage." },
      { code: "ap.math.simple_interest", name: "Simple Interest", description: "SI calculations and applied SI problems." },
      { code: "ap.math.compound_interest", name: "Compound Interest", description: "Annual, half-yearly and quarterly CI calculations." },
      { code: "ap.math.time_work", name: "Time and Work", description: "Work efficiency, joint work and pipes-and-cisterns." },
      { code: "ap.math.time_distance", name: "Time, Speed and Distance", description: "Trains, boats, average and relative speed problems." },
      { code: "ap.math.partnership", name: "Partnership", description: "Profit-sharing in partnerships with varying capital and time." },
      { code: "ap.math.mensuration", name: "Mensuration", description: "Area, perimeter, surface area and volume of standard figures." },
      { code: "ap.math.algebra", name: "Elementary Algebra", description: "Linear and quadratic equations, identities and basic algebra." },
      { code: "ap.math.geometry", name: "Geometry", description: "Triangles, circles, polygons and angle properties." },
      { code: "ap.math.data_interpretation", name: "Data Interpretation", description: "Tables, bar/pie/line graphs — calculation-based questions." },
    ],
  },

  // ── ENGLISH LANGUAGE ─────────────────────────────────────────────────
  {
    code: "LANG",
    name: "English Language",
    weight: 1,
    topics: [
      { code: "ap.eng.comprehension", name: "Reading Comprehension", description: "Unseen passages with inference, vocabulary and grammar questions." },
      { code: "ap.eng.grammar", name: "Grammar", description: "Tenses, articles, prepositions, voice and other grammatical rules." },
      { code: "ap.eng.vocabulary", name: "Vocabulary", description: "Synonyms, antonyms and one-word substitution." },
      { code: "ap.eng.sentence_correction", name: "Sentence Correction", description: "Spotting and correcting grammatical errors in sentences." },
      { code: "ap.eng.fill_blanks", name: "Fill in the Blanks", description: "Fill blanks with appropriate words, prepositions or articles." },
      { code: "ap.eng.idioms", name: "Idioms and Phrases", description: "Common English idioms, phrases and their meanings." },
      { code: "ap.eng.rearrangement", name: "Sentence Rearrangement", description: "Arrange jumbled sentences into a coherent paragraph." },
    ],
  },

  // ── GENERAL SCIENCE ───────────────────────────────────────────────────
  {
    code: "SCIENCE",
    name: "General Science",
    weight: 1,
    topics: [
      { code: "ap.sci.physics", name: "Physics", description: "Mechanics, heat, light, sound, electricity and magnetism." },
      { code: "ap.sci.chemistry", name: "Chemistry", description: "Elements, compounds, periodic table, acids/bases and chemical reactions." },
      { code: "ap.sci.biology", name: "Biology", description: "Cell biology, plants, animals, human body and diseases." },
      { code: "ap.sci.environment", name: "Environment and Ecology", description: "Ecosystems, biodiversity, climate change and pollution." },
      { code: "ap.sci.tech", name: "Science and Technology", description: "ISRO missions, IT, biotech, defence and recent tech developments." },
      { code: "ap.sci.health", name: "Health and Nutrition", description: "Common diseases, nutrition, vaccination and public health." },
    ],
  },

  // ── HISTORY, GEOGRAPHY, POLITY, ECONOMY ───────────────────────────────
  {
    code: "GK",
    name: "History, Indian Culture, Geography, Polity and Economy",
    weight: 1,
    topics: [
      { code: "ap.gk.history_india", name: "History of India",
        description: "Ancient, medieval and modern Indian history.",
        subtopics: [
          { code: "ap.gk.history_india.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Mauryan and Gupta empires." },
          { code: "ap.gk.history_india.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals, Marathas and regional kingdoms." },
          { code: "ap.gk.history_india.modern", name: "Modern India", description: "British rule, social reforms and constitutional developments." },
          { code: "ap.gk.history_india.culture", name: "Indian Culture", description: "Art, architecture, music, dance, festivals and heritage." },
        ],
      },
      { code: "ap.gk.freedom", name: "Indian National Movement",
        description: "Freedom struggle from 1857 to independence.",
        subtopics: [
          { code: "ap.gk.freedom.1857", name: "1857 Revolt and Early Resistance", description: "Causes, leaders and consequences of the Revolt of 1857." },
          { code: "ap.gk.freedom.congress", name: "Indian National Congress", description: "Foundation of INC, moderates, extremists and Surat split." },
          { code: "ap.gk.freedom.gandhian", name: "Gandhian Era", description: "Non-cooperation, Civil Disobedience and Quit India movements." },
          { code: "ap.gk.freedom.partition", name: "Partition and Independence", description: "Cabinet Mission, Mountbatten Plan and partition." },
        ],
      },
      { code: "ap.gk.geography", name: "Indian Geography", description: "Physical, social and economic geography of India." },
      { code: "ap.gk.polity", name: "Indian Polity and Constitution", description: "Constitution, fundamental rights, governance and constitutional bodies." },
      { code: "ap.gk.economy", name: "Indian Economy", description: "Banking, RBI, GST, schemes, planning and key economic indicators." },
    ],
  },

  // ── CURRENT EVENTS & ANDHRA PRADESH ──────────────────────────────────
  {
    code: "STATE_SPECIFIC",
    name: "Current Events and Andhra Pradesh Specific",
    weight: 1.4,
    topics: [
      { code: "ap.gk.current", name: "Current Events of National and International Importance", description: "Last 6-12 months major events at national and international level." },
      { code: "ap.state.history", name: "History of Andhra Pradesh",
        description: "Ancient, medieval and modern history of Andhra region.",
        subtopics: [
          { code: "ap.state.history.satavahanas", name: "Satavahanas and Ikshvakus", description: "Early Andhra dynasties, polity and culture." },
          { code: "ap.state.history.eastern_chalukyas", name: "Eastern Chalukyas and Cholas", description: "Vengi kingdom, Telugu Cholas and Kalyani Chalukyas." },
          { code: "ap.state.history.kakatiyas_vijayanagara", name: "Kakatiyas and Vijayanagara", description: "Kakatiyas of Warangal and Vijayanagara empire under Krishnadevaraya." },
          { code: "ap.state.history.modern", name: "Modern Andhra and State Formation", description: "Andhra movement, formation of AP state (1953) and bifurcation (2014)." },
        ],
      },
      { code: "ap.state.geography", name: "Geography of Andhra Pradesh", description: "Districts, rivers (Godavari, Krishna, Penna), coastline and climate." },
      { code: "ap.state.economy", name: "Economy of Andhra Pradesh", description: "Agriculture, fisheries, ports, industries and IT sector." },
      { code: "ap.state.administration", name: "AP Administration", description: "CM, Council of Ministers, Amaravati capital, districts (26) and divisions." },
      { code: "ap.state.culture", name: "Culture and Festivals of AP", description: "Kuchipudi dance, Carnatic music, Ugadi, Sankranti and Kalamkari art." },
      { code: "ap.state.literature", name: "Telugu Literature", description: "Nannayya, Tikkana, Yerrapragada (Kavi Trayam) and modern Telugu writers." },
      { code: "ap.state.tourism", name: "Tourism and Heritage of AP", description: "Tirupati, Amaravati, Lepakshi, Borra Caves and Visakhapatnam beaches." },
      { code: "ap.state.schemes", name: "Welfare Schemes of AP", description: "YSR Pension Kanuka, YSR Cheyutha, Amma Vodi and other state schemes." },
      { code: "ap.state.current", name: "Current Affairs of Andhra Pradesh", description: "Recent events, awards, sports and political developments in AP." },
    ],
  },
];

export async function seedApPolicePcSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "AP_POLICE_PC" } });
  if (!exam) {
    throw new Error("Run seedExams() first — AP_POLICE_PC exam not found.");
  }
  console.log(`Seeding AP Police Constable syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < apPolicePcSyllabus.length; sIdx++) {
    const s = apPolicePcSyllabus[sIdx];
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
  seedApPolicePcSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
