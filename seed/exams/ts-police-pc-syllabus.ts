// Telangana Police Constable (TSLPRB / TGPRB) Preliminary Written Test — full syllabus tree.
// Conducted by Telangana State Level Police Recruitment Board.
// Preliminary Written Test: 200 MCQs in 3 hours, 200 marks. No negative marking.
// Two objective papers: Reasoning/Mental Ability and General Studies (combined as PWT).
// Source: tgprb.in (formerly tslprb.in) PC notification + careerpower/Adda247 cross-check.
//
// Run after seedExams: npx tsx seed/exams/ts-police-pc-syllabus.ts

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

export const tsPolicePcSyllabus: SubjectSeed[] = [
  // ── REASONING & MENTAL ABILITY ────────────────────────────────────────
  {
    code: "REASONING",
    name: "Reasoning and Mental Ability",
    weight: 1,
    topics: [
      { code: "ts.reason.analogy", name: "Analogies", description: "Word, number, letter and figural analogy pairs." },
      { code: "ts.reason.similarities_differences", name: "Similarities and Differences", description: "Identify common and odd elements between items." },
      { code: "ts.reason.spatial_visualization", name: "Spatial Visualization", description: "Mentally manipulate 2-D and 3-D shapes and patterns." },
      { code: "ts.reason.spatial_orientation", name: "Spatial Orientation", description: "Determine orientation of figures after rotation or movement." },
      { code: "ts.reason.observation", name: "Observation", description: "Notice and recall fine details in visual stimuli." },
      { code: "ts.reason.relationship", name: "Relationship Concepts", description: "Blood relations, family trees and pointing-style problems." },
      { code: "ts.reason.arithmetic_reasoning", name: "Arithmetical Reasoning", description: "Logical word problems involving simple arithmetic." },
      { code: "ts.reason.classification", name: "Verbal and Figural Classification", description: "Pick the odd word or figure from a group." },
      { code: "ts.reason.series", name: "Arithmetic and Non-Verbal Series", description: "Find next/missing term in numeric and figural series." },
      { code: "ts.reason.coding", name: "Coding and Decoding", description: "Letter-shift, number and symbol-based coding problems." },
      { code: "ts.reason.directions", name: "Direction and Distance", description: "Compass-direction and shortest-distance problems." },
      { code: "ts.reason.ranking", name: "Order and Ranking", description: "Linear arrangement and rank-from-top/bottom problems." },
      { code: "ts.reason.syllogism", name: "Syllogism", description: "Two-statement deductions using all/some/no quantifiers." },
      { code: "ts.reason.venn", name: "Venn Diagrams", description: "Two- and three-set logical relationships and inferences." },
      { code: "ts.reason.statement_conclusion", name: "Statement and Conclusion", description: "Identify which conclusion follows from given statements." },
      { code: "ts.reason.non_verbal", name: "Non-Verbal Reasoning", description: "Mirror image, water image, paper folding/cutting and embedded figures." },
    ],
  },

  // ── ARITHMETIC & QUANTITATIVE APTITUDE ────────────────────────────────
  {
    code: "MATH",
    name: "Arithmetic and Quantitative Aptitude",
    weight: 1,
    topics: [
      { code: "ts.math.number_system", name: "Number System", description: "Whole numbers, integers, divisibility, HCF and LCM." },
      { code: "ts.math.simplification", name: "Simplification", description: "BODMAS, fractions and decimals." },
      { code: "ts.math.percentage", name: "Percentage", description: "Percentage conversion and applied percentage problems." },
      { code: "ts.math.ratio_proportion", name: "Ratio and Proportion", description: "Compound ratio, partnership and proportion problems." },
      { code: "ts.math.average", name: "Average", description: "Mean of numbers, weighted averages and age-related averages." },
      { code: "ts.math.profit_loss", name: "Profit and Loss", description: "CP/SP, marked price, discount and profit/loss percentage." },
      { code: "ts.math.simple_interest", name: "Simple Interest", description: "SI calculations and applied SI problems." },
      { code: "ts.math.compound_interest", name: "Compound Interest", description: "Annual, half-yearly and quarterly CI calculations." },
      { code: "ts.math.time_work", name: "Time and Work", description: "Work efficiency, joint work and pipes-and-cisterns." },
      { code: "ts.math.time_distance", name: "Time, Speed and Distance", description: "Trains, boats, average and relative speed problems." },
      { code: "ts.math.partnership", name: "Partnership", description: "Profit-sharing in partnerships with varying capital and time." },
      { code: "ts.math.mensuration", name: "Mensuration", description: "Area, perimeter, surface area and volume of standard figures." },
      { code: "ts.math.algebra", name: "Elementary Algebra", description: "Linear and quadratic equations and basic algebraic identities." },
      { code: "ts.math.data_interpretation", name: "Data Interpretation", description: "Tables, bar/pie/line graphs — calculation-based questions." },
    ],
  },

  // ── GENERAL SCIENCE ───────────────────────────────────────────────────
  {
    code: "SCIENCE",
    name: "General Science",
    weight: 1,
    topics: [
      { code: "ts.sci.physics", name: "Physics", description: "Mechanics, heat, light, sound, electricity and magnetism." },
      { code: "ts.sci.chemistry", name: "Chemistry", description: "Elements, compounds, periodic table, acids/bases and chemical reactions." },
      { code: "ts.sci.biology", name: "Biology", description: "Cell biology, plants, animals, human body and diseases." },
      { code: "ts.sci.environment", name: "Environment and Ecology", description: "Ecosystems, biodiversity, climate change and pollution." },
      { code: "ts.sci.tech", name: "Science and Technology", description: "ISRO missions, IT, biotech, defence and recent tech developments." },
      { code: "ts.sci.health", name: "Health and Nutrition", description: "Common diseases, nutrition, vaccination and public health." },
    ],
  },

  // ── INDIAN HISTORY, POLITY & ECONOMY ──────────────────────────────────
  {
    code: "GK",
    name: "Indian History, Polity, Geography and Economy",
    weight: 1,
    topics: [
      { code: "ts.gk.history_india", name: "History of India",
        description: "Ancient, medieval, modern Indian history and freedom struggle.",
        subtopics: [
          { code: "ts.gk.history_india.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Mauryan and Gupta empires." },
          { code: "ts.gk.history_india.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals, Marathas and regional kingdoms." },
          { code: "ts.gk.history_india.modern", name: "Modern India and Freedom Struggle", description: "British rule, 1857, INC, Gandhian movement and partition." },
          { code: "ts.gk.history_india.culture", name: "Indian Culture and Heritage", description: "Art, architecture, music, dance and literature of India." },
        ],
      },
      { code: "ts.gk.geography", name: "Indian Geography",
        description: "Physical, social and economic geography of India.",
        subtopics: [
          { code: "ts.gk.geography.physical", name: "Physical Geography", description: "Mountains, plains, plateaus, coasts, islands and rivers." },
          { code: "ts.gk.geography.climate", name: "Climate and Monsoon", description: "Indian monsoon system, climate types and rainfall pattern." },
          { code: "ts.gk.geography.resources", name: "Natural Resources", description: "Minerals, forests, wildlife and conservation efforts." },
          { code: "ts.gk.geography.principles", name: "Principles of Geography", description: "Solar system, latitudes, longitudes and earth movements." },
        ],
      },
      { code: "ts.gk.polity", name: "Indian Polity and Constitution", description: "Constitution, fundamental rights, governance and constitutional bodies." },
      { code: "ts.gk.economy", name: "Indian Economy", description: "Banking, RBI, GST, schemes, planning and key economic indicators." },
      { code: "ts.gk.current_affairs", name: "Current Events of National and International Importance", description: "Last 6-12 months major events at national and international level." },
      { code: "ts.gk.sports_awards", name: "Sports, Awards and Books", description: "Major tournaments, Padma awards, gallantry awards, books and authors." },
    ],
  },

  // ── TELANGANA STATE SPECIFIC ──────────────────────────────────────────
  {
    code: "STATE_SPECIFIC",
    name: "Telangana State Specific",
    weight: 1.5,
    topics: [
      { code: "ts.state.history", name: "History of Telangana",
        description: "Ancient, medieval and modern history of Telangana region.",
        subtopics: [
          { code: "ts.state.history.satavahanas", name: "Satavahanas and Ikshvakus", description: "Early Telugu dynasties, polity and culture." },
          { code: "ts.state.history.kakatiyas", name: "Kakatiyas of Warangal", description: "Rudrama Devi, Prataparudra and Kakatiya art and architecture." },
          { code: "ts.state.history.qutb_shahis", name: "Qutb Shahis and Asaf Jahis", description: "Golconda, founding of Hyderabad and Nizams' rule." },
          { code: "ts.state.history.movement", name: "Telangana Armed Struggle and Statehood", description: "1946-51 peasant movement, Telangana statehood movement, 2014 formation." },
        ],
      },
      { code: "ts.state.geography", name: "Geography of Telangana", description: "Districts, rivers (Godavari, Krishna), climate, soils and physiography." },
      { code: "ts.state.economy", name: "Economy of Telangana", description: "Agriculture, IT industry, mining and economic profile of the state." },
      { code: "ts.state.administration", name: "Telangana Administration", description: "CM, Council of Ministers, districts (33), Secretariat and divisions." },
      { code: "ts.state.culture", name: "Culture and Festivals", description: "Bonalu, Bathukamma, Sammakka-Saralamma Jatara and traditional crafts." },
      { code: "ts.state.literature", name: "Telangana Literature", description: "Palkuriki Somanatha, Kaloji Narayana Rao, Dasarathi and major writers." },
      { code: "ts.state.tourism", name: "Tourism and Heritage", description: "Charminar, Golconda Fort, Ramappa Temple, Bhadrachalam and Yadagirigutta." },
      { code: "ts.state.schemes", name: "Welfare Schemes of Telangana", description: "Rythu Bandhu, KCR Kit, Aasara pensions, Mission Bhagiratha and others." },
      { code: "ts.state.current", name: "Current Affairs of Telangana", description: "Recent events, awards, sports and political developments in Telangana." },
    ],
  },

  // ── ENGLISH LANGUAGE (basic comprehension) ───────────────────────────
  {
    code: "LANG",
    name: "English Language (Basic Skills)",
    weight: 0.6,
    topics: [
      { code: "ts.eng.comprehension", name: "Reading Comprehension", description: "Unseen passages with inference and vocabulary questions." },
      { code: "ts.eng.grammar", name: "Grammar", description: "Tenses, articles, prepositions, voice and basic grammatical rules." },
      { code: "ts.eng.vocabulary", name: "Vocabulary", description: "Synonyms, antonyms and one-word substitution." },
      { code: "ts.eng.sentence", name: "Sentence Correction", description: "Spotting and correcting grammatical errors in sentences." },
    ],
  },
];

export async function seedTsPolicePcSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "TS_POLICE_PC" } });
  if (!exam) {
    throw new Error("Run seedExams() first — TS_POLICE_PC exam not found.");
  }
  console.log(`Seeding Telangana Police Constable syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < tsPolicePcSyllabus.length; sIdx++) {
    const s = tsPolicePcSyllabus[sIdx];
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
  seedTsPolicePcSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
