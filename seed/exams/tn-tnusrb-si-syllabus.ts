// TNUSRB Sub-Inspector (Tamil Nadu Police SI) — full syllabus tree.
// Conducted by Tamil Nadu Uniformed Services Recruitment Board.
// Written exam: 200 MCQs in 3 hours, with Tamil Language Eligibility Test
// (qualifying) + Main Written Exam covering Part A (GK) + Part B (Aptitude/
// Reasoning/Communication/Information Handling).
// Source: tnusrb.tn.gov.in si_exam_syllabus.pdf — official Tamil Nadu police SI
// notification cross-checked with Toppersexam / Inspire IAS Academy coverage.
//
// Run after seedExams: npx tsx seed/exams/tn-tnusrb-si-syllabus.ts

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

export const tnTnusrbSiSyllabus: SubjectSeed[] = [
  // ── TAMIL LANGUAGE (Eligibility / Qualifying) ─────────────────────────
  {
    code: "LANG",
    name: "Tamil Language (Eligibility Test)",
    weight: 0.6,
    topics: [
      { code: "tn.tamil.grammar", name: "Tamil Grammar (Ilakkanam)", description: "Eluttu, sol, porul, yaapu and ani — basic Tamil grammar." },
      { code: "tn.tamil.vocabulary", name: "Vocabulary", description: "Synonyms, antonyms and one-word substitution in Tamil." },
      { code: "tn.tamil.idioms", name: "Idioms and Proverbs (Pazhamozhi)", description: "Common Tamil idioms and proverbs with meanings." },
      { code: "tn.tamil.literature", name: "Tamil Literature",
        description: "Classical to modern Tamil literature and famous works.",
        subtopics: [
          { code: "tn.tamil.literature.sangam", name: "Sangam Literature", description: "Tolkappiyam, Ettuthogai, Pathupattu and Sangam society." },
          { code: "tn.tamil.literature.thirukkural", name: "Thirukkural", description: "Thiruvalluvar's Kural — secular ethics and global relevance." },
          { code: "tn.tamil.literature.bhakti", name: "Bhakti Literature", description: "Alvars, Nayanars, Periyapuranam and Divya Prabandham." },
          { code: "tn.tamil.literature.epics", name: "Tamil Epics", description: "Silappathikaram, Manimekalai and Cheevaka Chinthamani." },
          { code: "tn.tamil.literature.modern", name: "Modern Tamil Literature", description: "Bharathiyar, Bharathidasan and contemporary writers." },
        ],
      },
      { code: "tn.tamil.comprehension", name: "Tamil Comprehension", description: "Unseen Tamil passages with comprehension and inference questions." },
      { code: "tn.tamil.translation", name: "Translation", description: "Translate sentences from English to Tamil and vice versa." },
    ],
  },

  // ── PART A: GENERAL KNOWLEDGE (80 Qs) ─────────────────────────────────
  {
    code: "GK",
    name: "Part A — General Knowledge and Current Affairs",
    weight: 1.2,
    topics: [
      { code: "tn.gk.science_tech", name: "Latest Developments in Science and Technology", description: "Recent breakthroughs, ISRO missions, IT and biotech developments." },
      { code: "tn.gk.political_dev", name: "Political Developments in India", description: "Recent national political events, elections and policy decisions." },
      { code: "tn.gk.arts_culture", name: "Arts and Culture of India and Tamil Nadu",
        description: "Indian and Tamil cultural heritage and arts.",
        subtopics: [
          { code: "tn.gk.arts_culture.india", name: "Arts and Culture of India", description: "Indian art, architecture, classical music, dance and festivals." },
          { code: "tn.gk.arts_culture.tn", name: "Arts and Culture of Tamil Nadu", description: "Bharatanatyam, Carnatic music, Tamil festivals and folk traditions." },
        ],
      },
      { code: "tn.gk.games_sports", name: "Games and Sports", description: "National/international tournaments, cups, awards and recent winners." },
      { code: "tn.gk.awards", name: "National and International Awards", description: "Padma awards, gallantry awards, Nobel Prize and major literary/sports awards." },
      { code: "tn.gk.books_authors", name: "Books and Authors", description: "Notable books and their Indian and international authors." },
      { code: "tn.gk.history", name: "History of India", description: "Ancient, medieval, modern Indian history and freedom struggle." },
      { code: "tn.gk.polity", name: "Indian Polity and Constitution", description: "Constitution, fundamental rights, governance and constitutional bodies." },
      { code: "tn.gk.economy", name: "Indian Economy", description: "Banking, RBI, GST, schemes and key economic indicators." },
      { code: "tn.gk.geography", name: "Indian Geography", description: "Physical, social and economic geography of India." },
      { code: "tn.gk.tn_specific", name: "Tamil Nadu Specific GK",
        description: "Tamil Nadu history, geography, polity and welfare schemes.",
        subtopics: [
          { code: "tn.gk.tn_specific.history", name: "History of Tamil Nadu", description: "Sangam age, Pallavas, Cholas, Pandyas, Vijayanagar and Nayak rule." },
          { code: "tn.gk.tn_specific.geography", name: "Geography of Tamil Nadu", description: "Districts, rivers, climate, agriculture and Cauvery delta." },
          { code: "tn.gk.tn_specific.administration", name: "Tamil Nadu Administration", description: "CM, Secretariat, districts, divisions and welfare schemes." },
          { code: "tn.gk.tn_specific.movements", name: "Dravidian and Self-Respect Movements", description: "Justice Party, Periyar, Dravidian movement and social reformers." },
        ],
      },
      { code: "tn.gk.current", name: "Current Affairs", description: "National and international events of the last 6-12 months." },
    ],
  },

  // ── PART B (140 Qs): LOGICAL ANALYSIS ─────────────────────────────────
  {
    code: "REASONING",
    name: "Part B — Logical Analysis and Reasoning",
    weight: 1,
    topics: [
      { code: "tn.reason.analogy", name: "Analogies", description: "Word, number and figural analogy pairs." },
      { code: "tn.reason.classification", name: "Classification", description: "Odd-one-out among words, numbers and figures." },
      { code: "tn.reason.series", name: "Series", description: "Number, letter, alphanumeric and figural series problems." },
      { code: "tn.reason.coding", name: "Coding and Decoding", description: "Letter-shift, number and symbol-based coding problems." },
      { code: "tn.reason.blood_relations", name: "Blood Relations", description: "Family-tree problems and pointing-style questions." },
      { code: "tn.reason.directions", name: "Direction and Distance", description: "Compass-direction and shortest-distance problems." },
      { code: "tn.reason.ranking", name: "Order and Ranking", description: "Linear arrangement and rank-from-top/bottom problems." },
      { code: "tn.reason.seating", name: "Seating Arrangement", description: "Linear and circular seating arrangement puzzles." },
      { code: "tn.reason.syllogism", name: "Syllogism", description: "Two-statement deductions using all/some/no quantifiers." },
      { code: "tn.reason.venn", name: "Venn Diagrams", description: "Two- and three-set logical relationships and inferences." },
      { code: "tn.reason.statement_conclusion", name: "Statements and Conclusions", description: "Identify which conclusion logically follows from given statements." },
      { code: "tn.reason.statement_argument", name: "Statements and Arguments", description: "Strong vs weak arguments based on a given statement." },
      { code: "tn.reason.cause_effect", name: "Cause and Effect", description: "Identify cause-effect relationships in given statements." },
      { code: "tn.reason.assumption", name: "Statements and Assumptions", description: "Identify which assumption is implicit in a statement." },
      { code: "tn.reason.non_verbal", name: "Non-Verbal Reasoning", description: "Mirror image, water image, paper folding/cutting and embedded figures." },
    ],
  },

  // ── NUMERICAL ANALYSIS ────────────────────────────────────────────────
  {
    code: "MATH",
    name: "Part B — Numerical Analysis and Aptitude",
    weight: 1,
    topics: [
      { code: "tn.math.simplification", name: "Simplification", description: "BODMAS, fractions, decimals and surds." },
      { code: "tn.math.percentage", name: "Percentage", description: "Percentage conversion and applied percentage problems." },
      { code: "tn.math.ratio_proportion", name: "Ratio and Proportion", description: "Compound ratio, partnership and proportion problems." },
      { code: "tn.math.average", name: "Average", description: "Mean of numbers, weighted averages and age-related averages." },
      { code: "tn.math.profit_loss", name: "Profit and Loss", description: "CP/SP, marked price, discount and profit/loss percentage." },
      { code: "tn.math.interest", name: "Simple and Compound Interest", description: "SI, CI and applied interest calculations." },
      { code: "tn.math.time_work", name: "Time and Work", description: "Work efficiency, joint work and pipes-and-cisterns." },
      { code: "tn.math.time_distance", name: "Time, Speed and Distance", description: "Trains, boats, average and relative speed problems." },
      { code: "tn.math.mensuration", name: "Mensuration", description: "Area, perimeter, surface area and volume of standard figures." },
      { code: "tn.math.algebra", name: "Algebra", description: "Linear and quadratic equations and basic algebraic identities." },
      { code: "tn.math.geometry", name: "Geometry", description: "Triangles, circles, polygons and angle properties." },
      { code: "tn.math.data_interpretation", name: "Data Interpretation", description: "Tables, bar/pie/line graphs — calculation-based questions." },
      { code: "tn.math.probability", name: "Probability", description: "Basic probability of events involving dice, cards and coins." },
    ],
  },

  // ── COMMUNICATION SKILLS (Tamil and English) ─────────────────────────
  {
    code: "COMMUNICATION",
    name: "Part B — Communication Skills (Tamil and English)",
    weight: 1,
    topics: [
      { code: "tn.comm.eng_grammar", name: "English Grammar", description: "Tenses, articles, prepositions, voice and other grammatical rules." },
      { code: "tn.comm.eng_vocab", name: "English Vocabulary", description: "Synonyms, antonyms and one-word substitution in English." },
      { code: "tn.comm.eng_comprehension", name: "English Comprehension", description: "Unseen passages with inference and vocabulary questions." },
      { code: "tn.comm.eng_correction", name: "English Sentence Correction", description: "Spotting and correcting grammatical errors in sentences." },
      { code: "tn.comm.tamil_grammar", name: "Tamil Grammar", description: "Tamil sentence structure, tenses and grammatical accuracy." },
      { code: "tn.comm.tamil_comprehension", name: "Tamil Comprehension", description: "Unseen Tamil passages with comprehension questions." },
      { code: "tn.comm.bilingual_translation", name: "Bilingual Translation", description: "Translate between Tamil and English sentences." },
      { code: "tn.comm.idioms", name: "Idioms and Phrases", description: "Common idioms and phrases in both Tamil and English." },
    ],
  },

  // ── INFORMATION HANDLING ABILITY ──────────────────────────────────────
  {
    code: "INFORMATION_HANDLING",
    name: "Part B — Information Handling Ability",
    weight: 0.8,
    topics: [
      { code: "tn.info.tables", name: "Tables and Charts", description: "Reading and interpreting tabular and chart-based data." },
      { code: "tn.info.bar_pie", name: "Bar Graph and Pie Chart", description: "Calculation-based questions on bar graphs and pie charts." },
      { code: "tn.info.line_graph", name: "Line Graph", description: "Trend interpretation and calculations from line graphs." },
      { code: "tn.info.case_study", name: "Case Study Analysis", description: "Information extraction and reasoning from a given case scenario." },
      { code: "tn.info.diagram", name: "Diagrammatic Information", description: "Interpreting flow charts, organisational charts and diagrams." },
      { code: "tn.info.data_sufficiency", name: "Data Sufficiency", description: "Decide whether the given data is sufficient to answer the question." },
    ],
  },

  // ── MENTAL ABILITY ────────────────────────────────────────────────────
  {
    code: "MENTAL_ABILITY",
    name: "Part B — Mental Ability and Psychological Aptitude",
    weight: 0.8,
    topics: [
      { code: "tn.mental.spatial", name: "Spatial Visualization", description: "Mentally rotate and orient 2-D and 3-D shapes." },
      { code: "tn.mental.observation", name: "Observation and Visual Memory", description: "Notice and recall fine details in visual stimuli." },
      { code: "tn.mental.discrimination", name: "Discrimination", description: "Distinguish between closely similar figures or patterns." },
      { code: "tn.mental.judgement", name: "Judgement and Decision Making", description: "Choose the best response in scenario-based decision questions." },
      { code: "tn.mental.problem_solving", name: "Problem Solving", description: "Apply logical thinking to solve real-world style problems." },
      { code: "tn.mental.aptitude", name: "Police Aptitude", description: "Situational aptitude relevant to law-enforcement roles." },
    ],
  },
];

export async function seedTnTnusrbSiSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "TN_TNUSRB_SI" } });
  if (!exam) {
    throw new Error("Run seedExams() first — TN_TNUSRB_SI exam not found.");
  }
  console.log(`Seeding TNUSRB SI syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < tnTnusrbSiSyllabus.length; sIdx++) {
    const s = tnTnusrbSiSyllabus[sIdx];
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
  seedTnTnusrbSiSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
