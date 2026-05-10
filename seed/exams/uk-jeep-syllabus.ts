// UBTER JEEP (Uttarakhand Joint Entrance Examination — Polytechnic) — full syllabus tree.
// Conducting body: Uttarakhand Board of Technical Education, Roorkee (ubter.in).
// Pattern: 100 MCQs. Mathematics 50 + Physics + Chemistry combined 50. No negative marking.
// Syllabus level: High School (Class 10) NCERT / Uttarakhand Board curriculum.
//
// Run after seedExams: npx tsx seed/exams/uk-jeep-syllabus.ts

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

export const ukJeepSyllabus: SubjectSeed[] = [
  // ── PHYSICS ──────────────────────────────────────────────────────────
  {
    code: "PHYSICS",
    name: "Physics",
    weight: 1,
    topics: [
      { code: "phy.measurement", name: "Measurement", description: "Fundamental and derived units, SI system, measurement of length, mass, time." },
      { code: "phy.motion", name: "Motion", description: "Distance and displacement, speed, velocity, acceleration, equations of motion, graphs." },
      { code: "phy.force_laws_motion", name: "Force and Laws of Motion", description: "Newton's laws, momentum, conservation of momentum." },
      { code: "phy.gravitation", name: "Gravitation", description: "Universal law of gravitation, free fall, weight, thrust and pressure, buoyancy." },
      { code: "phy.work_energy_power", name: "Work, Energy and Power", description: "Work, kinetic and potential energy, conservation of energy, power, commercial unit." },
      { code: "phy.sound", name: "Sound", description: "Waves, longitudinal and transverse, reflection of sound, echo, ultrasonic waves, SONAR." },
      { code: "phy.light_reflection_refraction", name: "Light — Reflection and Refraction", description: "Spherical mirrors, mirror formula, lenses, lens formula, magnification." },
      { code: "phy.human_eye", name: "Human Eye and Colourful World", description: "Defects of vision, dispersion, scattering, atmospheric refraction." },
      { code: "phy.electricity", name: "Electricity", description: "Electric current, Ohm's law, resistance, combinations, heating effect, electric power." },
      { code: "phy.magnetic_effects", name: "Magnetic Effects of Electric Current", description: "Magnetic field, force on conductor, EMI, motor and generator." },
      { code: "phy.sources_energy", name: "Sources of Energy", description: "Conventional and non-conventional sources, solar, wind, biomass, nuclear." },
    ],
  },

  // ── CHEMISTRY ────────────────────────────────────────────────────────
  {
    code: "CHEMISTRY",
    name: "Chemistry",
    weight: 1,
    topics: [
      { code: "chem.matter_surroundings", name: "Matter in Our Surroundings", description: "States of matter, change of state, evaporation, latent heat." },
      { code: "chem.is_matter_pure", name: "Is Matter Around Us Pure", description: "Mixtures, solutions, suspensions, colloids, separation techniques." },
      { code: "chem.atoms_molecules", name: "Atoms and Molecules", description: "Laws of chemical combination, atomic and molecular mass, mole concept." },
      { code: "chem.structure_atom", name: "Structure of the Atom", description: "Atomic models, Bohr's model, valence electrons, isotopes, isobars." },
      { code: "chem.chemical_reactions", name: "Chemical Reactions and Equations", description: "Types of reactions — combination, decomposition, displacement, redox." },
      { code: "chem.acids_bases_salts", name: "Acids, Bases and Salts", description: "pH scale, neutralisation, common salts (NaCl, Na2CO3, NaHCO3), plaster of Paris." },
      { code: "chem.metals_nonmetals", name: "Metals and Non-Metals", description: "Properties, reactivity series, ionic compounds, occurrence and extraction of metals." },
      { code: "chem.carbon_compounds", name: "Carbon and its Compounds", description: "Covalent bonding, allotropes, hydrocarbons, functional groups, ethanol, ethanoic acid." },
      { code: "chem.periodic_classification", name: "Periodic Classification of Elements", description: "Mendeleev's table, modern periodic table, periodic trends." },
    ],
  },

  // ── MATHEMATICS ──────────────────────────────────────────────────────
  {
    code: "MATHEMATICS",
    name: "Mathematics",
    weight: 1,
    topics: [
      { code: "math.real_numbers", name: "Real Numbers", description: "Euclid's division lemma, FTA, irrational numbers, decimal expansions." },
      { code: "math.polynomials", name: "Polynomials", description: "Zeroes of polynomials, division algorithm." },
      { code: "math.pair_linear_equations", name: "Pair of Linear Equations in Two Variables", description: "Graphical and algebraic solution, applications." },
      { code: "math.quadratic_equations", name: "Quadratic Equations", description: "Factorisation, formula method, discriminant, nature of roots." },
      { code: "math.arithmetic_progressions", name: "Arithmetic Progressions", description: "nth term and sum of n terms, real-life problems." },
      { code: "math.triangles", name: "Triangles", description: "Similarity, BPT, Pythagoras theorem, areas of similar triangles." },
      { code: "math.coordinate_geometry", name: "Coordinate Geometry", description: "Distance and section formulas, area of triangle, slope." },
      { code: "math.intro_trigonometry", name: "Introduction to Trigonometry", description: "Trigonometric ratios, identities, ratios of complementary angles." },
      { code: "math.applications_trig", name: "Applications of Trigonometry", description: "Heights and distances, elevation and depression angles." },
      { code: "math.circles", name: "Circles", description: "Tangent properties, length of tangent, number of tangents from point." },
      { code: "math.constructions", name: "Constructions", description: "Division of line segment, construction of triangles and tangents." },
      { code: "math.areas_circles", name: "Areas Related to Circles", description: "Sector and segment areas, areas of combinations of figures." },
      { code: "math.surface_areas_volumes", name: "Surface Areas and Volumes", description: "Cuboid, cylinder, cone, sphere, hemisphere, frustum, combinations." },
      { code: "math.statistics", name: "Statistics", description: "Mean, median, mode of grouped data, ogive curves." },
      { code: "math.probability", name: "Probability", description: "Classical definition, simple problems on coins, dice, cards." },
    ],
  },
];

export async function seedUkJeepSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "UK_POLYTECHNIC" } });
  if (!exam) {
    throw new Error("Run seedExams() first — UK_POLYTECHNIC exam not found.");
  }
  console.log(`Seeding Uttarakhand JEEP syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < ukJeepSyllabus.length; sIdx++) {
    const s = ukJeepSyllabus[sIdx];
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
  console.log(`Seeded Uttarakhand JEEP syllabus. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedUkJeepSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
