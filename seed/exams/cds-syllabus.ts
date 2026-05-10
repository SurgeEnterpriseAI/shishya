// CDS (Combined Defence Services) — full syllabus tree.
// Three papers: English (100 marks, 2 hrs), General Knowledge (100 marks, 2 hrs),
// Elementary Mathematics (100 marks, 2 hrs). For OTA candidates only English + GK.
// Source: UPSC official notification (upsc.gov.in / CDS-I & CDS-II notifications).
// Mathematics is at Class-X (matriculation) level; English & GK at graduation level.
//
// Run after seedExams: npx tsx seed/exams/cds-syllabus.ts

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

export const cdsSyllabus: SubjectSeed[] = [
  // ── ENGLISH ───────────────────────────────────────────────────────────
  {
    code: "ENGLISH",
    name: "English",
    weight: 1,
    topics: [
      { code: "eng.spotting_errors", name: "Spotting Errors", description: "Identify the part of a sentence containing a grammatical or usage error — high-frequency CDS topic." },
      { code: "eng.sentence_improvement", name: "Sentence Improvement", description: "Choose the best alternative for an underlined part of the sentence." },
      { code: "eng.sentence_arrangement", name: "Ordering of Sentences / Para Jumbles", description: "Re-order jumbled sentences to form a coherent paragraph." },
      { code: "eng.sentence_completion", name: "Sentence Completion / Fill in the Blanks", description: "Complete sentences with appropriate words or phrases." },
      { code: "eng.synonyms", name: "Synonyms", description: "Word-meaning questions — closest in meaning to the underlined word." },
      { code: "eng.antonyms", name: "Antonyms", description: "Word-meaning questions — opposite in meaning to the underlined word." },
      { code: "eng.idioms_phrases", name: "Idioms and Phrases", description: "Meaning of idiomatic expressions and phrasal verbs." },
      { code: "eng.cloze_test", name: "Cloze Test / Comprehension", description: "Fill multiple blanks within a passage; reading comprehension on graduation-level texts." },
      { code: "eng.reading_comprehension", name: "Reading Comprehension", description: "Passage-based questions on main idea, vocabulary and inference." },
      { code: "eng.active_passive", name: "Active and Passive Voice", description: "Convert sentences between active and passive voice." },
      { code: "eng.direct_indirect", name: "Direct and Indirect Speech", description: "Convert sentences between direct and indirect narration." },
      { code: "eng.transformation", name: "Transformation of Sentences", description: "Simple-compound-complex, affirmative-negative, etc." },
      { code: "eng.spelling", name: "Spelling Check", description: "Identify the correctly or incorrectly spelt word." },
      { code: "eng.one_word", name: "One-Word Substitution", description: "Replace a phrase with a single word that has the same meaning." },
    ],
  },

  // ── GENERAL KNOWLEDGE ─────────────────────────────────────────────────
  {
    code: "GK",
    name: "General Knowledge",
    weight: 1,
    topics: [
      { code: "gk.history", name: "History",
        description: "Indian history from ancient to modern, with focus on freedom struggle.",
        subtopics: [
          { code: "gk.history.ancient", name: "Ancient India", description: "Indus Valley, Vedic Age, Mauryan and Gupta Empires." },
          { code: "gk.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughal Empire, Bhakti and Sufi movements." },
          { code: "gk.history.modern", name: "Modern India / Freedom Struggle", description: "British colonialism, 1857 revolt, Indian National Movement, key personalities." },
          { code: "gk.history.world", name: "World History", description: "Renaissance, World Wars and post-war world order." },
        ],
      },
      { code: "gk.geography", name: "Geography",
        description: "Physical, Indian and world geography.",
        subtopics: [
          { code: "gk.geography.physical", name: "Physical Geography", description: "Earth, atmosphere, climate, rivers, oceans, landforms." },
          { code: "gk.geography.india", name: "Indian Geography", description: "Mountains, rivers, plateaus, climate, monsoon, agriculture, minerals." },
          { code: "gk.geography.world", name: "World Geography", description: "Continents, oceans, straits, passes, important cities." },
          { code: "gk.geography.boundaries", name: "International Boundaries", description: "India's neighbours, international borders and important lines." },
        ],
      },
      { code: "gk.polity", name: "Indian Polity and Constitution",
        description: "Constitution, governance and defence-related polity.",
        subtopics: [
          { code: "gk.polity.preamble_rights", name: "Preamble, Fundamental Rights and Duties", description: "Preamble, Fundamental Rights, Directive Principles, Fundamental Duties." },
          { code: "gk.polity.parliament", name: "Parliament and Executive", description: "Lok Sabha, Rajya Sabha, President, PM, Council of Ministers." },
          { code: "gk.polity.judiciary", name: "Judiciary", description: "Supreme Court, High Courts, judicial review." },
          { code: "gk.polity.amendments", name: "Constitutional Amendments and Defence Provisions", description: "Important amendments and provisions related to armed forces." },
        ],
      },
      { code: "gk.economy", name: "Economics",
        description: "Indian economy, planning and economic policy.",
        subtopics: [
          { code: "gk.economy.basics", name: "GDP, GNP, NNP and National Income", description: "Concepts of national income and key economic indicators." },
          { code: "gk.economy.planning", name: "Planning and NITI Aayog", description: "Five-year plans, NITI Aayog and current development priorities." },
          { code: "gk.economy.policy", name: "Monetary and Fiscal Policy", description: "RBI, banking, taxation, budget and fiscal-monetary tools." },
          { code: "gk.economy.indices", name: "Economic Indicators", description: "Inflation, CPI, WPI, HDI and other economic indices." },
        ],
      },
      { code: "gk.science", name: "General Science",
        description: "Science of NCERT Class VIII–X level with defence applications.",
        subtopics: [
          { code: "gk.science.physics", name: "Physics", description: "Motion, energy, light, sound, electricity, magnetism." },
          { code: "gk.science.chemistry", name: "Chemistry", description: "Elements, compounds, acids/bases, metals/non-metals, carbon." },
          { code: "gk.science.biology", name: "Biology", description: "Cells, human physiology, nutrition, reproduction, ecology, diseases." },
          { code: "gk.science.defence_tech", name: "Defence-related Science", description: "Radar, missiles, satellites, nuclear energy and applications." },
        ],
      },
      { code: "gk.current_affairs", name: "Current Affairs",
        description: "National and international events of the last 12 months.",
        subtopics: [
          { code: "gk.current_affairs.national", name: "National Events", description: "Politics, government schemes, summits, awards within India." },
          { code: "gk.current_affairs.international", name: "International Events", description: "Major world events, summits, treaties, organisations." },
          { code: "gk.current_affairs.defence", name: "Defence and Security", description: "Indian armed-forces operations, exercises, defence deals and weapons." },
          { code: "gk.current_affairs.sports_awards", name: "Sports, Awards and Books", description: "Major awards, sports events, books and authors." },
        ],
      },
      { code: "gk.static", name: "Static GK", description: "Important days, national symbols, dance forms, classical music, monuments." },
    ],
  },

  // ── ELEMENTARY MATHEMATICS ────────────────────────────────────────────
  {
    code: "MATHS",
    name: "Elementary Mathematics",
    weight: 1,
    topics: [
      { code: "math.arithmetic", name: "Arithmetic",
        description: "Number theory, basic operations and applied arithmetic at Class-X level.",
        subtopics: [
          { code: "math.arithmetic.number_system", name: "Number System – Natural / Integers / Rational / Real", description: "Natural numbers, integers, rational and real numbers; fundamental operations." },
          { code: "math.arithmetic.unitary", name: "Unitary Method", description: "Time and distance, time and work, percentages, applications to simple and compound interest." },
          { code: "math.arithmetic.profit_loss", name: "Profit and Loss", description: "CP, SP, MP and discount problems." },
          { code: "math.arithmetic.ratio_proportion", name: "Ratio and Proportion", description: "Ratio, proportion and variations." },
          { code: "math.arithmetic.percentage", name: "Percentage", description: "Percentage change, applied percentage, compound problems." },
          { code: "math.arithmetic.average", name: "Average", description: "Average of numbers, weighted averages, ages." },
          { code: "math.arithmetic.elementary_number", name: "Elementary Number Theory", description: "Divisibility tests, prime/composite numbers, factorisation, HCF and LCM, Euclidean algorithm." },
          { code: "math.arithmetic.logarithms", name: "Logarithms", description: "Laws of logarithms, use of logarithmic tables." },
        ],
      },
      { code: "math.algebra", name: "Algebra",
        description: "School-level algebra of polynomials, equations and inequalities.",
        subtopics: [
          { code: "math.algebra.basic_operations", name: "Basic Operations", description: "Addition, subtraction, multiplication and division of algebraic expressions." },
          { code: "math.algebra.polynomials", name: "Polynomials and Factorisation", description: "Simple factors, remainder theorem, HCF and LCM of polynomials." },
          { code: "math.algebra.theory_polynomials", name: "Theory of Polynomials", description: "Solutions of quadratic equations, relation between roots and coefficients." },
          { code: "math.algebra.simultaneous_equations", name: "Simultaneous Linear Equations", description: "Linear equations in two unknowns — analytical and graphical solutions." },
          { code: "math.algebra.linear_inequalities", name: "Linear Inequalities", description: "Linear inequalities in one and two variables, graphical representation." },
          { code: "math.algebra.set_theory", name: "Set Theory", description: "Set language and operations, Venn diagrams." },
          { code: "math.algebra.indices", name: "Laws of Indices", description: "Rational exponents, surds and laws of indices." },
        ],
      },
      { code: "math.trigonometry", name: "Trigonometry",
        description: "Trigonometric ratios, identities and applications to heights and distances.",
        subtopics: [
          { code: "math.trigonometry.ratios", name: "Sine, Cosine, Tangent of Angles 0°–90°", description: "Trigonometric ratios for standard angles." },
          { code: "math.trigonometry.identities", name: "Simple Trigonometric Identities", description: "Basic identities and proofs at Class-X level." },
          { code: "math.trigonometry.tables", name: "Use of Trigonometric Tables", description: "Use of natural and logarithmic trigonometric tables." },
          { code: "math.trigonometry.heights_distances", name: "Heights and Distances", description: "Simple cases of heights and distances using trigonometry." },
        ],
      },
      { code: "math.geometry", name: "Geometry",
        description: "Lines, angles, triangles, quadrilaterals and circles.",
        subtopics: [
          { code: "math.geometry.lines_angles", name: "Lines and Angles", description: "Properties of parallel lines and transversals." },
          { code: "math.geometry.plane_figures", name: "Plane and Plane Figures", description: "Properties of plane figures." },
          { code: "math.geometry.triangles", name: "Properties of Triangles", description: "Sides, angles, congruency, similarity and Pythagoras theorem." },
          { code: "math.geometry.parallelograms", name: "Parallelograms and Rectangles", description: "Properties of parallelograms, rectangles, squares." },
          { code: "math.geometry.circles", name: "Circles and Tangents", description: "Properties of circles, chords, tangents and arcs." },
          { code: "math.geometry.loci", name: "Loci", description: "Simple cases of loci." },
        ],
      },
      { code: "math.mensuration", name: "Mensuration",
        description: "Areas, perimeters and volumes of standard 2D and 3D figures.",
        subtopics: [
          { code: "math.mensuration.2d", name: "Areas of Squares, Rectangles, Parallelograms, Triangles, Circles", description: "Formulas and applications for plane figures." },
          { code: "math.mensuration.surfaces", name: "Surface Area and Volume", description: "Surface area and volume of cuboids, cylinders, cones and spheres." },
          { code: "math.mensuration.combined", name: "Areas and Volumes of Combined Figures", description: "Area and volume of figures made by combining shapes." },
        ],
      },
      { code: "math.statistics", name: "Statistics",
        description: "Collection, representation and central tendency of statistical data.",
        subtopics: [
          { code: "math.statistics.collection", name: "Collection and Tabulation of Data", description: "Frequency distribution and tabulation methods." },
          { code: "math.statistics.graphs", name: "Graphical Representation", description: "Histograms, frequency polygons, bar charts and pie charts." },
          { code: "math.statistics.central_tendency", name: "Measures of Central Tendency", description: "Mean, median and mode for grouped and ungrouped data." },
        ],
      },
    ],
  },
];

export async function seedCdsSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "CDS" } });
  if (!exam) {
    throw new Error("Run seedExams() first — CDS exam not found.");
  }
  console.log(`Seeding CDS syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < cdsSyllabus.length; sIdx++) {
    const s = cdsSyllabus[sIdx];
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
    console.log(`  ✓ ${s.code} — ${s.topics.length} top-level topics`);
  }
  console.log(`Done. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedCdsSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
