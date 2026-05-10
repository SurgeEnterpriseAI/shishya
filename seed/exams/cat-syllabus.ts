// CAT (Common Admission Test) — full syllabus tree.
// Conducted by IIMs (rotating; CAT 2025 conducted by IIM Kozhikode).
// 3 sections × 40 minutes each = 120 minutes total.
// VARC (24 Q), DILR (22 Q), QA (22 Q).
//
// IIMs do NOT publish a strict syllabus. The list below reflects the
// de-facto syllabus inferred from 5+ years of CAT papers and the consensus
// across IMS, T.I.M.E., Career Launcher, 2IIM, and MBAUniverse.
//
// Run after seedExams: npx tsx seed/exams/cat-syllabus.ts

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

export const catSyllabus: SubjectSeed[] = [
  // ── VARC ──────────────────────────────────────────────────────────────
  {
    code: "VARC",
    name: "Verbal Ability & Reading Comprehension",
    weight: 1,
    topics: [
      { code: "varc.reading_comprehension", name: "Reading Comprehension",
        description: "4 long passages with 4 questions each — main idea, inference, tone, vocab in context, author's purpose.",
        subtopics: [
          { code: "varc.rc.main_idea", name: "Main Idea / Central Theme", description: "Identify the primary argument or theme of a passage." },
          { code: "varc.rc.inference", name: "Inference", description: "Deduce conclusions not stated explicitly in the passage." },
          { code: "varc.rc.tone_attitude", name: "Tone & Attitude", description: "Author's tone — critical, neutral, sarcastic, appreciative, etc." },
          { code: "varc.rc.vocab_in_context", name: "Vocabulary in Context", description: "Meaning of a word as used in the passage." },
          { code: "varc.rc.author_purpose", name: "Author's Purpose", description: "Why the author wrote the passage or a specific paragraph." },
          { code: "varc.rc.detail", name: "Detail / Fact-based", description: "Direct retrieval of facts stated in the passage." },
          { code: "varc.rc.structure", name: "Logical Structure", description: "How paragraphs relate and how the argument is built." },
        ],
      },
      { code: "varc.para_jumbles", name: "Para Jumbles",
        description: "TITA-format: arrange 4–5 jumbled sentences into a coherent paragraph." },
      { code: "varc.para_summary", name: "Para Summary",
        description: "Choose the option that best summarises a 4–6 sentence paragraph." },
      { code: "varc.odd_sentence", name: "Odd Sentence Out",
        description: "Identify the sentence that does not fit the paragraph (TITA)." },
      { code: "varc.para_completion", name: "Para Completion",
        description: "Choose the sentence that best completes a paragraph." },
      { code: "varc.sentence_correction", name: "Sentence Correction",
        description: "Identify and fix grammatical / structural errors in a sentence." },
      { code: "varc.critical_reasoning", name: "Critical Reasoning",
        description: "Strengthen, weaken, assumption, inference questions on short arguments." },
      { code: "varc.analogies", name: "Word Analogies",
        description: "Identify the relationship between word pairs." },
    ],
  },

  // ── DILR ──────────────────────────────────────────────────────────────
  {
    code: "DILR",
    name: "Data Interpretation & Logical Reasoning",
    weight: 1,
    topics: [
      { code: "dilr.tables", name: "Tables-based DI",
        description: "Single and multi-table data — percentages, averages, comparison." },
      { code: "dilr.bar_charts", name: "Bar Charts",
        description: "Simple, stacked, and grouped bar graphs — calculation and comparison." },
      { code: "dilr.line_charts", name: "Line Charts",
        description: "Trend interpretation, growth rates, multiple-line comparisons." },
      { code: "dilr.pie_charts", name: "Pie Charts",
        description: "Single and double pie charts — share, percentage and combination problems." },
      { code: "dilr.scatter_radar", name: "Scatter & Radar Charts",
        description: "Interpretation of scatter plots, bubble charts, radar / spider charts." },
      { code: "dilr.caselets", name: "Caselets",
        description: "Paragraph-based DI sets without graphical aids — pure data extraction." },
      { code: "dilr.mixed_di", name: "Mixed / Combined DI",
        description: "Sets combining tables, charts and text in a single problem." },
      { code: "dilr.venn_diagrams", name: "Venn Diagrams",
        description: "2-set and 3-set Venn problems — overlaps, exclusive regions." },
      { code: "dilr.puzzles", name: "Logical Puzzles",
        description: "Grid-based puzzles, distribution puzzles, conditions-based reasoning." },
      { code: "dilr.seating_arrangement", name: "Seating Arrangement",
        description: "Linear, circular and rectangular arrangements with conditions." },
      { code: "dilr.blood_relations", name: "Blood Relations",
        description: "Family-tree problems, generation tracking, pointing-style relations." },
      { code: "dilr.direction_sense", name: "Direction Sense",
        description: "Compass-based movement, final position and shortest distance." },
      { code: "dilr.syllogism", name: "Syllogism",
        description: "Two- and three-statement deductions using all/some/no quantifiers." },
      { code: "dilr.coding_decoding", name: "Coding-Decoding",
        description: "Letter-letter, letter-number and conditional coding patterns." },
      { code: "dilr.series", name: "Number / Letter Series",
        description: "Identify next term or missing term in a sequence." },
      { code: "dilr.clocks_calendars", name: "Clocks & Calendars",
        description: "Angle between hands, day-of-week calculation, leap-year logic." },
      { code: "dilr.games_tournaments", name: "Games & Tournaments",
        description: "League/knockout scheduling, points-table-based reasoning." },
      { code: "dilr.routes_networks", name: "Routes & Networks",
        description: "Shortest path, network flow, connectivity puzzles." },
      { code: "dilr.cubes", name: "Cubes",
        description: "Cube cutting, painting, and counting problems." },
      { code: "dilr.binary_logic", name: "Binary Logic / Truth-Tellers",
        description: "Truth-teller, liar and alternator problems." },
    ],
  },

  // ── QA ────────────────────────────────────────────────────────────────
  {
    code: "QA",
    name: "Quantitative Aptitude",
    weight: 1,
    topics: [
      // Arithmetic
      { code: "qa.arithmetic", name: "Arithmetic",
        description: "~40% of QA. The highest-weightage area in CAT.",
        subtopics: [
          { code: "qa.arithmetic.percentage", name: "Percentage", description: "Percentage change, successive percentages, applied percentage problems." },
          { code: "qa.arithmetic.profit_loss", name: "Profit, Loss & Discount", description: "CP/SP/MP, successive discounts, false weights, dishonest dealers." },
          { code: "qa.arithmetic.ratio_proportion", name: "Ratio & Proportion", description: "Compound ratio, componendo-dividendo, partnership profit-sharing." },
          { code: "qa.arithmetic.averages", name: "Averages", description: "Simple, weighted and moving averages; age-based and replacement problems." },
          { code: "qa.arithmetic.mixtures_alligation", name: "Mixtures & Alligation", description: "Two- and three-component mixtures, replacement, alligation rule." },
          { code: "qa.arithmetic.si_ci", name: "Simple & Compound Interest", description: "SI, CI, half-yearly/quarterly compounding, instalments." },
          { code: "qa.arithmetic.time_work", name: "Time & Work", description: "Work-rate, efficiency, alternate-day problems, MDH-type." },
          { code: "qa.arithmetic.pipes_cisterns", name: "Pipes & Cisterns", description: "Inlet/outlet pipes, leakage problems." },
          { code: "qa.arithmetic.time_speed_distance", name: "Time, Speed & Distance", description: "Relative speed, average speed, races, circular tracks." },
          { code: "qa.arithmetic.boats_streams", name: "Boats & Streams", description: "Upstream / downstream speed, still-water speed problems." },
          { code: "qa.arithmetic.trains", name: "Trains", description: "Train crossing pole / platform / another train problems." },
        ],
      },

      // Algebra
      { code: "qa.algebra", name: "Algebra",
        description: "~30% of QA. Linear & quadratic equations, functions and progressions dominate.",
        subtopics: [
          { code: "qa.algebra.linear_equations", name: "Linear Equations", description: "Equations in 1, 2 and 3 variables; consistent / inconsistent systems." },
          { code: "qa.algebra.quadratic", name: "Quadratic Equations", description: "Roots, discriminant, sum-product of roots, max-min of quadratics." },
          { code: "qa.algebra.inequalities", name: "Inequalities", description: "Linear, quadratic and modulus inequalities; AM-GM-HM inequality." },
          { code: "qa.algebra.functions", name: "Functions & Graphs", description: "Domain, range, composition; modulus, greatest-integer and piecewise functions." },
          { code: "qa.algebra.logarithms", name: "Logarithms", description: "Properties of logs, log inequalities, log-based equations." },
          { code: "qa.algebra.progressions", name: "Progressions (AP, GP, HP)", description: "AP, GP, HP, AGP — sum, mean and special-series problems." },
          { code: "qa.algebra.polynomials", name: "Polynomials", description: "Factor and remainder theorem, polynomial identities, roots." },
          { code: "qa.algebra.maxima_minima", name: "Maxima & Minima", description: "Max-min via AM-GM, completing the square, calculus-free techniques." },
        ],
      },

      // Geometry & Mensuration
      { code: "qa.geometry", name: "Geometry & Mensuration",
        description: "~15% of QA. Triangles, circles and 2D/3D mensuration are most frequent.",
        subtopics: [
          { code: "qa.geometry.lines_angles", name: "Lines & Angles", description: "Parallel-line angle relations, intersecting lines, transversals." },
          { code: "qa.geometry.triangles", name: "Triangles", description: "Congruence, similarity, area, special triangles, Pythagoras." },
          { code: "qa.geometry.circles", name: "Circles", description: "Tangents, chords, arcs, cyclic quadrilaterals, inscribed angles." },
          { code: "qa.geometry.quadrilaterals", name: "Quadrilaterals & Polygons", description: "Parallelogram, rhombus, trapezium, regular polygon properties." },
          { code: "qa.geometry.mensuration_2d", name: "Mensuration — 2D", description: "Area and perimeter of plane figures, sectors, segments." },
          { code: "qa.geometry.mensuration_3d", name: "Mensuration — 3D", description: "Cube, cuboid, cylinder, cone, sphere, hemisphere — surface area & volume." },
          { code: "qa.geometry.coordinate", name: "Coordinate Geometry", description: "Distance, section, slope, line and circle equations, locus." },
          { code: "qa.geometry.trigonometry", name: "Trigonometry", description: "Trig ratios, identities, heights and distances." },
        ],
      },

      // Number Systems
      { code: "qa.number_systems", name: "Number Systems",
        description: "~5–7% of QA. Divisibility and remainders are most-asked.",
        subtopics: [
          { code: "qa.number.divisibility_remainders", name: "Divisibility & Remainders", description: "Divisibility rules, remainder theorem, cyclicity." },
          { code: "qa.number.factors_multiples", name: "Factors, HCF & LCM", description: "Number of factors, sum of factors, HCF/LCM applications." },
          { code: "qa.number.base_system", name: "Base Systems", description: "Conversion between binary, octal, decimal, hex; arithmetic in other bases." },
          { code: "qa.number.indices_surds", name: "Indices & Surds", description: "Laws of indices, surd simplification, rationalisation." },
        ],
      },

      // Modern Math
      { code: "qa.modern_math", name: "Modern Math",
        description: "~5–7% of QA. P&C and probability lead this area.",
        subtopics: [
          { code: "qa.modern.permutations_combinations", name: "Permutations & Combinations", description: "Arrangements, selections, distribution, circular permutations." },
          { code: "qa.modern.probability", name: "Probability", description: "Classical probability, conditional probability, dependent / independent events." },
          { code: "qa.modern.set_theory", name: "Set Theory", description: "Set operations, cardinality, Venn-based problems." },
          { code: "qa.modern.binomial_theorem", name: "Binomial Theorem", description: "Expansion, general term, middle term, coefficient problems." },
        ],
      },
    ],
  },
];

export async function seedCatSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "CAT" } });
  if (!exam) {
    throw new Error("Run seedExams() first — CAT exam not found.");
  }
  console.log(`Seeding CAT syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < catSyllabus.length; sIdx++) {
    const s = catSyllabus[sIdx];
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
  seedCatSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
