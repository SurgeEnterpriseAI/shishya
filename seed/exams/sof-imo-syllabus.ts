// SOF IMO — International Mathematics Olympiad (Class 9-10 canonical syllabus).
// 4 sections × ~50 questions: Logical Reasoning, Mathematical Reasoning, Everyday Mathematics, Achievers.
// Source: sofworld.org official Class 9-10 IMO syllabus.
//
// Run after seedExams: npx tsx seed/exams/sof-imo-syllabus.ts

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

export const sofImoSyllabus: SubjectSeed[] = [
  // ── LOGICAL REASONING ─────────────────────────────────────────────────
  {
    code: "LOGICAL_REASONING",
    name: "Logical Reasoning",
    weight: 1,
    topics: [
      { code: "lr.verbal_non_verbal", name: "Verbal and Non-Verbal Reasoning", description: "Mixed verbal and figure-based reasoning patterns." },
      { code: "lr.series", name: "Number and Alphabet Series", description: "Find the next or missing term in a number or alphabet series." },
      { code: "lr.analogy_classification", name: "Analogy and Classification", description: "Identify the matching pair or odd one out among words, numbers and figures." },
      { code: "lr.coding_decoding", name: "Coding-Decoding", description: "Encrypt or decode words and numbers using a given rule." },
      { code: "lr.mathematical_operations", name: "Mathematical Operations", description: "Symbol substitution, BODMAS and operator-based logic problems." },
      { code: "lr.direction_sense", name: "Direction Sense Test", description: "Compass-based movement and final position/distance problems." },
      { code: "lr.blood_relations", name: "Blood Relations", description: "Family tree and pointing-style relationship problems." },
      { code: "lr.ranking", name: "Ranking and Arrangement", description: "Linear seating, ranks from top/bottom and order-of-arrangement problems." },
      { code: "lr.embedded_figures", name: "Embedded and Hidden Figures", description: "Spot a smaller figure embedded in a complex one." },
      { code: "lr.mirror_water_images", name: "Mirror and Water Images", description: "Mirror and water reflections of letters, numbers and figures." },
      { code: "lr.paper_folding", name: "Paper Folding and Cutting", description: "Predict appearance of paper after folding, punching and unfolding." },
      { code: "lr.cubes_dice", name: "Cubes and Dice", description: "Cube colouring, opposite faces of dice and counting cubes." },
      { code: "lr.matrix_patterns", name: "Matrix and Pattern Completion", description: "Complete a 3×3 matrix or repeating pattern with the right element." },
    ],
  },

  // ── MATHEMATICS ───────────────────────────────────────────────────────
  {
    code: "MATH",
    name: "Mathematical Reasoning",
    weight: 1,
    topics: [
      { code: "math.number_systems", name: "Number Systems", description: "Real numbers, rational/irrational numbers, decimal expansions and laws of exponents for real numbers." },
      { code: "math.polynomials", name: "Polynomials", description: "Zeroes, remainder theorem, factor theorem and algebraic identities." },
      { code: "math.coordinate_geometry", name: "Coordinate Geometry", description: "Cartesian plane, plotting points, distance formula and section formula." },
      { code: "math.linear_eq_2var", name: "Linear Equations in Two Variables", description: "Solution graphs, substitution, elimination and cross-multiplication methods." },
      { code: "math.euclid_geometry", name: "Introduction to Euclid's Geometry", description: "Euclid's axioms, postulates and basic geometrical proofs." },
      { code: "math.lines_angles", name: "Lines and Angles", description: "Pairs of angles, parallel lines, transversals and angle sum properties." },
      { code: "math.triangles", name: "Triangles", description: "Congruence criteria, properties of isosceles triangles and inequalities in a triangle." },
      { code: "math.quadrilaterals", name: "Quadrilaterals", description: "Properties of parallelograms, rhombus, rectangle, square and mid-point theorem." },
      { code: "math.areas_parallelograms", name: "Areas of Parallelograms and Triangles", description: "Figures on the same base and between same parallels — equal-area theorems." },
      { code: "math.circles", name: "Circles", description: "Chords, arcs, angles subtended, cyclic quadrilaterals and tangent properties." },
      { code: "math.constructions", name: "Constructions", description: "Compass and straight-edge constructions of bisectors, triangles and tangents." },
      { code: "math.herons_formula", name: "Heron's Formula", description: "Area of a triangle from its three sides and applications to quadrilaterals." },
      { code: "math.surface_areas_volumes", name: "Surface Areas and Volumes", description: "Cuboid, cube, cylinder, cone, sphere and hemisphere — surface area and volume." },
      { code: "math.statistics", name: "Statistics", description: "Mean, median, mode of grouped/ungrouped data and graphical representation." },
      { code: "math.probability", name: "Probability", description: "Experimental and theoretical probability of simple events." },
      { code: "math.real_numbers_10", name: "Real Numbers (Class 10)", description: "Euclid's division lemma, fundamental theorem of arithmetic and irrational numbers." },
      { code: "math.quadratic_equations", name: "Quadratic Equations (Class 10)", description: "Solution by factorization, completing the square, quadratic formula and discriminant." },
      { code: "math.arithmetic_progressions", name: "Arithmetic Progressions (Class 10)", description: "nth term, sum of n terms and word problems on APs." },
      { code: "math.trigonometry", name: "Introduction to Trigonometry (Class 10)", description: "Trigonometric ratios, complementary angles, identities and heights and distances." },
    ],
  },

  // ── EVERYDAY MATHEMATICS ──────────────────────────────────────────────
  {
    code: "EVERYDAY_MATH",
    name: "Everyday Mathematics",
    weight: 1,
    topics: [
      { code: "em.word_problems", name: "Word Problems Application", description: "Real-life word problems based on the math syllabus." },
      { code: "em.percentage_profit_loss", name: "Percentage, Profit and Loss", description: "Applied percentage, profit/loss, discount and successive percentages." },
      { code: "em.time_speed_distance", name: "Time, Speed and Distance", description: "Trains, boats and streams and average-speed problems." },
      { code: "em.time_work", name: "Time and Work", description: "Work efficiency, pipes-and-cisterns and joint-work problems." },
      { code: "em.simple_compound_interest", name: "Simple and Compound Interest", description: "SI/CI computations and instalment-based problems." },
    ],
  },

  // ── ACHIEVERS SECTION ─────────────────────────────────────────────────
  {
    code: "ACHIEVERS",
    name: "Achievers Section",
    weight: 1,
    topics: [
      { code: "ach.higher_order_math", name: "Higher Order Mathematical Thinking", description: "HOTS questions extending IMO math topics into multi-step proofs." },
      { code: "ach.problem_solving", name: "Problem Solving", description: "Mixed-topic numerical problems that combine reasoning and math." },
      { code: "ach.applied_geometry", name: "Applied Geometry and Mensuration", description: "Multi-shape area/volume problems from real-life contexts." },
      { code: "ach.data_handling", name: "Data Handling and Statistics", description: "Interpret tables, graphs and probability scenarios." },
    ],
  },
];

export async function seedSofImoSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "SOF_IMO" } });
  if (!exam) {
    throw new Error("Run seedExams() first — SOF_IMO exam not found.");
  }
  console.log(`Seeding SOF IMO syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < sofImoSyllabus.length; sIdx++) {
    const s = sofImoSyllabus[sIdx];
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
  seedSofImoSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
