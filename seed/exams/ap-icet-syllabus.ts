// AP ICET (Andhra Pradesh Integrated Common Entrance Test) — full syllabus tree.
// Conducting body: APSCHE / Andhra University (cets.apsche.ap.gov.in/ICET).
// Pattern: 200 MCQs in 150 minutes. Sections: Analytical Ability (75 Qs), Mathematical Ability (55 Qs),
// Communication Ability (70 Qs). 1 mark each. No negative marking.
// For MBA and MCA admissions in AP universities.
//
// Run after seedExams: npx tsx seed/exams/ap-icet-syllabus.ts

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

export const apIcetSyllabus: SubjectSeed[] = [
  // ── LOGICAL REASONING / ANALYTICAL ABILITY (75 Qs) ───────────────────
  {
    code: "LOGICAL_REASONING",
    name: "Analytical Ability",
    weight: 1,
    topics: [
      { code: "lr.data_sufficiency", name: "Data Sufficiency", description: "Determining whether given statements provide sufficient information to answer." },
      { code: "lr.problem_solving", name: "Problem Solving", description: "Mixed analytical reasoning with multiple sub-types." },
      { code: "lr.sequences_series", name: "Sequences and Series", description: "Number, letter and figural series with missing terms." },
      { code: "lr.data_analysis", name: "Data Analysis", description: "Tables, bar charts, pie charts, line graphs and combined data sets." },
      { code: "lr.coding_decoding", name: "Coding and Decoding", description: "Letter, number, and symbol-based coding schemes." },
      { code: "lr.date_time_arrangement", name: "Date, Time and Arrangement Problems", description: "Calendar, clocks, time-based scheduling problems." },
      { code: "lr.linear_arrangement", name: "Linear and Circular Arrangement", description: "Seating, ordering and ranking based on conditions." },
      { code: "lr.blood_relations", name: "Blood Relations", description: "Family relationships and coded relations." },
      { code: "lr.direction_distance", name: "Direction and Distance", description: "Direction sense, shortest path, displacement." },
      { code: "lr.venn_diagrams", name: "Venn Diagrams", description: "Set-based reasoning and region counting." },
      { code: "lr.symbols_notations", name: "Symbols and Notations", description: "Mathematical operations replaced by symbols." },
      { code: "lr.passage_analysis", name: "Passage Conclusions", description: "Drawing conclusions from short passages with logical premises." },
      { code: "lr.fill_blanks_seq", name: "Complete the Blank Spaces / Pattern", description: "Identifying missing elements in a logical pattern." },
    ],
  },

  // ── MATHEMATICAL ABILITY (55 Qs) ─────────────────────────────────────
  {
    code: "QUANT",
    name: "Mathematical Ability",
    weight: 1,
    topics: [
      { code: "quant.laws_indices", name: "Laws of Indices", description: "Rules for exponents and powers, simplification." },
      { code: "quant.ratio_proportion", name: "Ratio and Proportion", description: "Direct, inverse, compound proportion, partnership problems." },
      { code: "quant.percentages", name: "Percentages", description: "Conversions, successive percentage change, applications." },
      { code: "quant.profit_loss", name: "Profit and Loss", description: "Cost price, selling price, marked price, discount." },
      { code: "quant.simple_compound_interest", name: "Simple and Compound Interest", description: "Interest formulas and applications." },
      { code: "quant.time_work", name: "Time and Work", description: "Work-time problems, pipes and cisterns." },
      { code: "quant.time_distance", name: "Time, Distance and Speed", description: "Trains, boats and streams, average speed problems." },
      { code: "quant.mixtures_alligation", name: "Mixtures and Alligation", description: "Rule of alligation, replacement problems." },
      { code: "quant.numbers", name: "Number System", description: "Divisibility, HCF and LCM, factors, prime numbers." },
      { code: "quant.sets", name: "Sets and Operations", description: "Set theory, union, intersection, Venn-based problems." },
      { code: "quant.polynomials", name: "Polynomials", description: "Polynomial operations, factorisation, remainder theorem." },
      { code: "quant.linear_quadratic_eq", name: "Linear and Quadratic Equations", description: "Solving and applications, nature of roots." },
      { code: "quant.progressions", name: "Progressions", description: "Arithmetic and geometric progressions, sum formulas." },
      { code: "quant.binomial_theorem", name: "Binomial Theorem", description: "Expansion, general term, applications." },
      { code: "quant.matrices", name: "Matrices", description: "Operations, determinants, inverse, system of equations." },
      { code: "quant.trigonometric_ratios", name: "Trigonometric Ratios", description: "Basic ratios, identities, heights and distances." },
      { code: "quant.plane_geometry", name: "Plane Geometry", description: "Triangles, circles, quadrilaterals, polygons." },
      { code: "quant.coordinate_geometry", name: "Coordinate Geometry", description: "Distance, section formula, slope, equation of line." },
      { code: "quant.mensuration", name: "Mensuration", description: "Areas and volumes of standard plane and solid figures." },
      { code: "quant.statistics", name: "Statistics", description: "Mean, median, mode, range, standard deviation basics." },
      { code: "quant.probability", name: "Probability", description: "Classical probability and basic conditional probability." },
    ],
  },

  // ── COMMUNICATION ABILITY (70 Qs) ────────────────────────────────────
  {
    code: "COMMUNICATION",
    name: "Communication Ability",
    weight: 1,
    topics: [
      { code: "comm.vocabulary", name: "Vocabulary", description: "Synonyms, antonyms, one-word substitution, words in context." },
      { code: "comm.functional_grammar", name: "Functional Grammar", description: "Tenses, voice, articles, prepositions, modals, sentence correction." },
      { code: "comm.business_terminology", name: "Business Terminology", description: "Common business and management vocabulary." },
      { code: "comm.computer_terminology", name: "Computer Terminology", description: "Basic IT and computer-related terms and abbreviations." },
      { code: "comm.reading_comprehension", name: "Reading Comprehension", description: "Paragraph-based questions on inference, vocabulary and main idea." },
      { code: "comm.idioms_phrases", name: "Idioms and Phrases", description: "Meaning and usage of common idioms and phrases." },
      { code: "comm.sentence_completion", name: "Sentence Completion", description: "Filling blanks with appropriate words." },
      { code: "comm.error_correction", name: "Error Correction", description: "Identifying and correcting grammatical errors." },
      { code: "comm.dialogue_writing", name: "Dialogue and Conversation", description: "Choosing appropriate responses in everyday dialogue contexts." },
      { code: "comm.phrasal_verbs", name: "Phrasal Verbs", description: "Common phrasal verbs and their meanings." },
    ],
  },
];

export async function seedApIcetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "AP_ICET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — AP_ICET exam not found.");
  }
  console.log(`Seeding AP ICET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < apIcetSyllabus.length; sIdx++) {
    const s = apIcetSyllabus[sIdx];
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
    console.log(`  ${s.code} — ${s.topics.length} topics`);
  }
  console.log(`Seeded AP ICET syllabus. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedApIcetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
