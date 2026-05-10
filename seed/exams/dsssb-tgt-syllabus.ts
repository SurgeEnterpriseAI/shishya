// Delhi DSSSB Trained Graduate Teacher (TGT) — full syllabus tree.
// One-tier CBT: 200 MCQs / 200 marks / 2 hours.
//   Section A (100 marks) — General Awareness, General Intelligence &
//                            Reasoning, Arithmetic, Hindi & English.
//   Section B (100 marks) — Subject-specific (graduation-level) + Teaching
//                            Methodology / Pedagogy.
// Negative marking: 0.25.
// Source: dsssb.delhi.gov.in TGT syllabus PDFs.
//
// Run after seedExams: npx tsx seed/exams/dsssb-tgt-syllabus.ts

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

export const dsssbTgtSyllabus: SubjectSeed[] = [
  // ── SECTION A — GENERAL ────────────────────────────────────────────────
  {
    code: "SECTION_A_GA",
    name: "Section A — General Awareness",
    weight: 1,
    topics: [
      {
        code: "ga.events",
        name: "Current Events",
        description: "National and international current events.",
        subtopics: [
          { code: "ga.events.national", name: "National Events", description: "Government schemes, polity and major events in India." },
          { code: "ga.events.intl", name: "International Events", description: "Summits, organisations and major world events." },
          { code: "ga.events.delhi", name: "Delhi Current Affairs", description: "Delhi government schemes, education department and local events." },
        ],
      },
      {
        code: "ga.everyday",
        name: "Everyday Matter Observation",
        description: "Matters of everyday observation and experience.",
      },
      {
        code: "ga.history",
        name: "History",
        description: "Indian history from ancient to modern.",
        subtopics: [
          { code: "ga.hist.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Mauryas, Guptas." },
          { code: "ga.hist.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals and regional kingdoms." },
          { code: "ga.hist.modern", name: "Modern India and Freedom Struggle", description: "British rule, INC, Gandhian movements and partition." },
          { code: "ga.hist.delhi", name: "History of Delhi", description: "Delhi Sultanate seat, Mughal capital, 1857 and modern New Delhi." },
        ],
      },
      {
        code: "ga.polity",
        name: "Polity and Constitution",
        description: "Indian Constitution and political institutions.",
        subtopics: [
          { code: "ga.pol.constitution", name: "Constitution", description: "Preamble, salient features and historical evolution." },
          { code: "ga.pol.fr", name: "Fundamental Rights and Duties", description: "Articles 12-51A — rights, duties, DPSP." },
          { code: "ga.pol.union_state", name: "Union and State Government", description: "President, PM, Parliament, Governor, CM and state legislature." },
          { code: "ga.pol.delhi_govt", name: "Delhi Government", description: "NCT of Delhi Act 1991, LG, CM and Delhi Legislative Assembly." },
        ],
      },
      { code: "ga.sports", name: "Sports", description: "International and national sports events, awards and tournaments." },
      { code: "ga.art_culture", name: "Art and Culture", description: "Indian art, architecture, dance, music and festivals." },
      { code: "ga.geography", name: "Geography", description: "Physical and economic geography of India and the world." },
      { code: "ga.economics", name: "Economics", description: "Indian economy basics — GDP, inflation, banking, schemes." },
      { code: "ga.everyday_science", name: "Everyday Science", description: "General appreciation of science of everyday observation." },
      { code: "ga.scientific_research", name: "Scientific Research", description: "Recent scientific developments, ISRO, DRDO and biotech." },
      { code: "ga.organisations", name: "National & International Organisations", description: "UN, WHO, World Bank, IMF, SAARC, BRICS and key Indian institutions." },
    ],
  },

  // ── SECTION A — REASONING ──────────────────────────────────────────────
  {
    code: "SECTION_A_GI",
    name: "Section A — General Intelligence and Reasoning",
    weight: 1,
    topics: [
      { code: "gi.analogy", name: "Analogies", description: "Verbal, number and figure analogy questions." },
      { code: "gi.similarities", name: "Similarities and Differences", description: "Spot similarities/differences in words, numbers, figures." },
      { code: "gi.spatial", name: "Spatial Visualization", description: "Visualisation in 2D/3D and spatial relations." },
      { code: "gi.spatial_orient", name: "Spatial Orientation", description: "Orientation problems for figures and objects." },
      { code: "gi.problem_solving", name: "Problem Solving", description: "Mathematical and logical problem solving." },
      { code: "gi.analysis", name: "Analysis and Judgement", description: "Analysing situations and making sound judgement." },
      { code: "gi.dm", name: "Decision Making", description: "Selecting best course from given alternatives." },
      { code: "gi.visual_memory", name: "Visual Memory", description: "Memory for figures and visual patterns." },
      { code: "gi.discrimination", name: "Discrimination", description: "Distinguishing among similar items, words or figures." },
      { code: "gi.observation", name: "Observation", description: "Detail observation skills tested via figures and patterns." },
      { code: "gi.relationship", name: "Relationship Concepts", description: "Blood relations and family-tree problems." },
      { code: "gi.arithmetic_reasoning", name: "Arithmetical Reasoning", description: "Word problems with arithmetic logic." },
      { code: "gi.verbal_classification", name: "Verbal and Figure Classification", description: "Odd-one-out for words, numbers, figures." },
      { code: "gi.series", name: "Arithmetic Number Series", description: "Number, alphabet and figure series." },
      { code: "gi.coding", name: "Coding and Decoding", description: "Letter, number and symbol coding-decoding." },
    ],
  },

  // ── SECTION A — ARITHMETIC ────────────────────────────────────────────
  {
    code: "SECTION_A_ARITH",
    name: "Section A — Arithmetical and Numerical Ability",
    weight: 1,
    topics: [
      { code: "ari.simplification", name: "Simplification", description: "BODMAS, fractions, decimals, square roots." },
      { code: "ari.numbers", name: "Number System", description: "Place value, divisibility, factors and multiples." },
      { code: "ari.percentage", name: "Percentage", description: "Percentage, profit, loss and discount." },
      { code: "ari.ratio", name: "Ratio and Proportion", description: "Direct, inverse and compound ratio." },
      { code: "ari.average", name: "Average", description: "Average of numbers, ages, marks and money." },
      { code: "ari.si_ci", name: "Simple and Compound Interest", description: "Interest, principal, rate, time problems." },
      { code: "ari.time_work", name: "Time and Work", description: "Pipes, cisterns and combined work problems." },
      { code: "ari.time_distance", name: "Time, Speed and Distance", description: "Trains, boats and relative speed." },
      { code: "ari.mensuration", name: "Mensuration", description: "Area, perimeter and volume of basic shapes." },
      { code: "ari.di", name: "Data Interpretation", description: "Tables, bar, pie and line graph based questions." },
    ],
  },

  // ── SECTION A — HINDI ─────────────────────────────────────────────────
  {
    code: "SECTION_A_HINDI",
    name: "Section A — Hindi Language",
    weight: 1,
    topics: [
      { code: "hin.vyakaran", name: "Hindi Vyakaran", description: "Sangya, sarvanam, kriya, kaal, vachya, sandhi." },
      { code: "hin.shabd", name: "Shabd Bhandar", description: "Paryayvachi, vilom, anekarthi shabd." },
      { code: "hin.muhavare", name: "Muhavare and Lokoktiyan", description: "Hindi idioms and proverbs." },
      { code: "hin.error", name: "Vakya Shuddhi", description: "Error spotting and sentence correction in Hindi." },
      { code: "hin.comprehension", name: "Hindi Gadyansh", description: "Unseen Hindi passage based questions." },
      { code: "hin.literature", name: "Hindi Sahitya", description: "Major poets, writers and works of Hindi literature." },
    ],
  },

  // ── SECTION A — ENGLISH ───────────────────────────────────────────────
  {
    code: "SECTION_A_ENG",
    name: "Section A — English Language",
    weight: 1,
    topics: [
      { code: "eng.grammar", name: "English Grammar", description: "Tenses, articles, prepositions, voice, narration." },
      { code: "eng.vocab", name: "Vocabulary", description: "Synonyms, antonyms and one-word substitution." },
      { code: "eng.idioms", name: "Idioms and Phrases", description: "Common idioms and their meanings." },
      { code: "eng.error", name: "Error Spotting", description: "Spotting grammatical errors in sentences." },
      { code: "eng.fillers", name: "Fill in the Blanks", description: "Cloze-test style word and phrase fillers." },
      { code: "eng.comprehension", name: "Reading Comprehension", description: "Unseen passage based questions." },
      { code: "eng.literature", name: "English Literature", description: "Major writers and works of English literature." },
    ],
  },

  // ── SECTION B — SUBJECT KNOWLEDGE ──────────────────────────────────────
  {
    code: "SECTION_B_SUBJECT",
    name: "Section B — Subject Knowledge (Graduation Level)",
    weight: 1.4,
    topics: [
      {
        code: "sub.maths",
        name: "Mathematics (TGT Maths)",
        description: "Graduation-level mathematics for TGT Maths post.",
        subtopics: [
          { code: "sub.math.algebra", name: "Algebra", description: "Polynomials, equations, sequences, sets and relations." },
          { code: "sub.math.geometry", name: "Geometry", description: "Euclidean geometry, triangles, circles and constructions." },
          { code: "sub.math.trigonometry", name: "Trigonometry", description: "Trigonometric ratios, identities and heights & distances." },
          { code: "sub.math.calculus", name: "Calculus", description: "Limits, continuity, differentiation and integration basics." },
          { code: "sub.math.statistics", name: "Statistics and Probability", description: "Mean, median, mode, dispersion and probability." },
          { code: "sub.math.coordinate", name: "Coordinate Geometry", description: "Cartesian coordinates, lines, circles and conics." },
        ],
      },
      {
        code: "sub.science",
        name: "Science (TGT Natural/Physical Science)",
        description: "Graduation-level science for TGT Science post.",
        subtopics: [
          { code: "sub.sci.physics", name: "Physics", description: "Mechanics, thermodynamics, optics, electricity and modern physics." },
          { code: "sub.sci.chemistry", name: "Chemistry", description: "Atomic structure, periodic table, organic and inorganic chemistry." },
          { code: "sub.sci.biology", name: "Biology", description: "Cell biology, genetics, evolution, plant and animal physiology." },
        ],
      },
      {
        code: "sub.social",
        name: "Social Science (TGT Social Science)",
        description: "Graduation-level history, geography, polity and economics.",
        subtopics: [
          { code: "sub.ss.history", name: "History", description: "Indian and world history at graduation level." },
          { code: "sub.ss.geography", name: "Geography", description: "Physical, human and economic geography." },
          { code: "sub.ss.polity", name: "Political Science", description: "Indian polity, political theory and international relations." },
          { code: "sub.ss.economics", name: "Economics", description: "Microeconomics, macroeconomics and Indian economy." },
        ],
      },
      {
        code: "sub.english",
        name: "English (TGT English)",
        description: "English literature and language at graduation level.",
        subtopics: [
          { code: "sub.eng.literature", name: "English Literature", description: "Major writers, periods and literary movements." },
          { code: "sub.eng.grammar", name: "Advanced English Grammar", description: "Advanced grammar, syntax and figures of speech." },
          { code: "sub.eng.criticism", name: "Literary Criticism", description: "Schools of literary criticism and key critics." },
        ],
      },
      {
        code: "sub.hindi",
        name: "Hindi (TGT Hindi)",
        description: "Hindi sahitya and vyakaran at graduation level.",
        subtopics: [
          { code: "sub.hin.kavya", name: "Hindi Kavya", description: "Adikaal, Bhaktikaal, Reetikaal, Aadhunik Kaal poets and works." },
          { code: "sub.hin.gadya", name: "Hindi Gadya", description: "Major prose writers and works of Hindi literature." },
          { code: "sub.hin.vyakaran", name: "Hindi Vyakaran", description: "Advanced grammar, alankar, chhand and ras." },
        ],
      },
      {
        code: "sub.sanskrit",
        name: "Sanskrit (TGT Sanskrit)",
        description: "Sanskrit literature and grammar at graduation level.",
        subtopics: [
          { code: "sub.skt.literature", name: "Sanskrit Literature", description: "Veda, Upanishad, Ramayana, Mahabharata, Kalidasa and major poets." },
          { code: "sub.skt.grammar", name: "Sanskrit Grammar", description: "Panini, sandhi, samasa, dhatu and karaka." },
        ],
      },
      {
        code: "sub.punjabi",
        name: "Punjabi (TGT Punjabi)",
        description: "Punjabi sahitya and vyakaran at graduation level.",
      },
      {
        code: "sub.urdu",
        name: "Urdu (TGT Urdu)",
        description: "Urdu adab and grammar at graduation level.",
      },
    ],
  },

  // ── SECTION B — TEACHING METHODOLOGY ───────────────────────────────────
  {
    code: "SECTION_B_PEDAGOGY",
    name: "Section B — Teaching Methodology and Pedagogy",
    weight: 1.2,
    topics: [
      { code: "ped.development", name: "Child Development", description: "Concept of growth and development, factors and stages." },
      { code: "ped.learning", name: "Learning Theories", description: "Behaviourist, cognitive and constructivist learning theories." },
      { code: "ped.individual", name: "Individual Differences", description: "Intelligence, personality and learning styles." },
      { code: "ped.special", name: "Special Needs Education", description: "Children with special needs, inclusive education." },
      { code: "ped.evaluation", name: "Evaluation and Assessment", description: "Formative, summative and continuous comprehensive evaluation." },
      { code: "ped.methods", name: "Teaching Methods", description: "Lecture, discussion, project, problem-solving and inquiry methods." },
      { code: "ped.tlm", name: "Teaching Learning Material", description: "Use of TLM, audio-visual aids and ICT in teaching." },
      { code: "ped.classroom", name: "Classroom Management", description: "Organisation, discipline and inclusive classroom practices." },
      { code: "ped.curriculum", name: "Curriculum and Pedagogy", description: "Curriculum design, NCF and pedagogy of school subjects." },
    ],
  },
];

export async function seedDsssbTgtSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "DL_DSSSB_TGT" } });
  if (!exam) {
    throw new Error("Run seedExams() first — DL_DSSSB_TGT exam not found.");
  }
  console.log(`Seeding DSSSB TGT syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < dsssbTgtSyllabus.length; sIdx++) {
    const s = dsssbTgtSyllabus[sIdx];
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
  seedDsssbTgtSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
