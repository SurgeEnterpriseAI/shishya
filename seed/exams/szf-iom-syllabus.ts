// Silverzone International Olympiad of Mathematics (iOM) — Class 9-10 syllabus.
// Source: silverzone.org official syllabus + Silverzone sample papers.
// 50 questions × 60 minutes for Class 9-12 paper. Class 9-10 used as canonical level.
//
// Run after seedExams: npx tsx seed/exams/szf-iom-syllabus.ts

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

export const szfIomSyllabus: SubjectSeed[] = [
  // ── MATHEMATICS ───────────────────────────────────────────────────────
  {
    code: "MATH",
    name: "Mathematics",
    weight: 0.7,
    topics: [
      { code: "math.number_system", name: "Number System", description: "Real numbers, irrationals, decimal expansions, laws of exponents and surds." },
      { code: "math.polynomials", name: "Polynomials", description: "Degrees, zeroes, remainder & factor theorem, algebraic identities, polynomial division." },
      { code: "math.linear_eqs", name: "Linear Equations in Two Variables", description: "Solving pairs of linear equations by substitution, elimination and graphical methods." },
      { code: "math.quadratic_eqs", name: "Quadratic Equations", description: "Standard form, factorisation, quadratic formula, nature of roots, word problems." },
      { code: "math.ap", name: "Arithmetic Progression", description: "nth term, sum of n terms, applications to real-life problems." },
      { code: "math.sequence_series", name: "Sequence and Series", description: "Geometric progression, special series — sum of natural numbers, squares, cubes." },
      { code: "math.coordinate_geometry", name: "Coordinate Geometry", description: "Distance formula, section formula, area of triangle, slope and line equations." },
      { code: "math.lines_angles", name: "Lines and Angles", description: "Angle relations on intersecting/parallel lines, transversal, angle sum properties." },
      { code: "math.triangles", name: "Triangles", description: "Congruence, similarity, Pythagoras theorem, basic proportionality theorem." },
      { code: "math.quadrilaterals", name: "Quadrilaterals", description: "Properties of parallelograms, rhombus, rectangle, trapezium, kite." },
      { code: "math.circles", name: "Circles", description: "Chords, arcs, cyclic quadrilaterals, tangent properties, angle subtended at centre." },
      { code: "math.areas", name: "Area of Triangles, Parallelograms and Circles", description: "Heron's formula, areas between same parallels, sector/segment of a circle." },
      { code: "math.mensuration", name: "Mensuration", description: "Surface area and volume of cube, cuboid, cylinder, cone, sphere, hemisphere, frustum." },
      { code: "math.trigonometry", name: "Trigonometry", description: "Trig ratios, complementary angles, identities, heights and distances." },
      { code: "math.statistics", name: "Statistics", description: "Mean, median, mode of grouped/ungrouped data, cumulative frequency, ogives." },
      { code: "math.probability", name: "Probability", description: "Empirical and classical probability of simple events, dice/cards/coins." },
      { code: "math.logarithms", name: "Logarithms", description: "Laws of logarithms, change of base, common and natural log basics." },
      { code: "math.applied_math", name: "Applied Mathematics", description: "Profit/loss, simple and compound interest, taxation and real-life maths modelling." },
    ],
  },

  // ── LOGICAL & MENTAL REASONING ────────────────────────────────────────
  {
    code: "REASONING",
    name: "Logical and Mental Reasoning",
    weight: 0.2,
    topics: [
      { code: "reason.verbal", name: "Verbal Reasoning", description: "Series, analogy, classification, coding-decoding, blood relations, direction sense." },
      { code: "reason.non_verbal", name: "Non-Verbal Reasoning", description: "Figural series, mirror/water images, pattern completion, embedded figures." },
      { code: "reason.spatial", name: "Spatial and Visual Reasoning", description: "Cubes, dice, paper folding/cutting, 2D-to-3D visualisation — Silverzone emphasis." },
      { code: "reason.mathematical", name: "Mathematical Reasoning", description: "Statements, validity, logical connectives, simple deductive reasoning." },
      { code: "reason.mental_aptitude", name: "Mental Aptitude", description: "Quick mental arithmetic, number puzzles, logical sequencing, odd-one-out." },
    ],
  },

  // ── ACHIEVERS / SCHOLARS SECTION ──────────────────────────────────────
  {
    code: "ACHIEVERS",
    name: "Achievers Section",
    weight: 0.1,
    topics: [
      { code: "ach.hots", name: "Higher Order Thinking", description: "Multi-concept problems combining algebra, geometry and reasoning." },
      { code: "ach.advanced_geometry", name: "Advanced Geometry", description: "Tougher cyclic quadrilateral, similar triangle and circle theorem applications." },
      { code: "ach.advanced_algebra", name: "Advanced Algebra", description: "Polynomial systems, quadratic-with-parameter, advanced word problems." },
      { code: "ach.case_study", name: "Case Study and Application", description: "Real-life data interpretation and modelling problems requiring multi-step reasoning." },
    ],
  },
];

export async function seedSzfIomSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "SZF_IOM" } });
  if (!exam) {
    throw new Error("Run seedExams() first — SZF_IOM exam not found.");
  }
  console.log(`Seeding SZF iOM syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < szfIomSyllabus.length; sIdx++) {
    const s = szfIomSyllabus[sIdx];
    const subject = await prisma.subject.upsert({
      where: { examId_code: { examId: exam.id, code: s.code } },
      update: { name: s.name, weight: s.weight, orderIdx: sIdx },
      create: { examId: exam.id, code: s.code, name: s.name, weight: s.weight, orderIdx: sIdx },
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
  seedSzfIomSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
