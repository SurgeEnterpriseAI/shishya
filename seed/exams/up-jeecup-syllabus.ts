// JEECUP (UP Joint Entrance Examination — Council Polytechnic) — full syllabus tree.
// Conducting body: Joint Entrance Examination Council, Uttar Pradesh (jeecup.admissions.nic.in).
// Group A (Diploma in Engineering & Technology) — 100 MCQs in 2.5 hours.
// Sections: Mathematics 50 Qs + Physics 25 Qs + Chemistry 25 Qs.
// Marking: +4 for correct, 0 for incorrect (no negative marking from 2024 onwards).
// Syllabus level: Class 9 + Class 10 NCERT / UP Board.
//
// Run after seedExams: npx tsx seed/exams/up-jeecup-syllabus.ts

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

export const upJeecupSyllabus: SubjectSeed[] = [
  // ── MATHEMATICS (50 Qs) ───────────────────────────────────────────────
  {
    code: "MATHEMATICS",
    name: "Mathematics",
    weight: 1,
    topics: [
      { code: "math.real_numbers", name: "Real Numbers (Class 10)", description: "Euclid's division lemma, fundamental theorem of arithmetic, irrational numbers, decimal expansions." },
      { code: "math.polynomials", name: "Polynomials (Class 10)", description: "Zeroes of polynomials, relationship between zeroes and coefficients, division algorithm." },
      { code: "math.linear_equations_two", name: "Pair of Linear Equations in Two Variables (Class 10)", description: "Graphical and algebraic methods — substitution, elimination, cross-multiplication." },
      { code: "math.quadratic_equations", name: "Quadratic Equations (Class 10)", description: "Standard form, factorization, completing the square, quadratic formula, discriminant, nature of roots." },
      { code: "math.arithmetic_progressions", name: "Arithmetic Progressions (Class 10)", description: "nth term, sum of n terms, applications in real-life problems." },
      { code: "math.triangles", name: "Triangles (Class 10)", description: "Similar triangles, Basic Proportionality Theorem, Pythagoras theorem and converse, area ratios." },
      { code: "math.coordinate_geometry", name: "Coordinate Geometry (Class 10)", description: "Distance formula, section formula, area of triangle, slope of line." },
      { code: "math.intro_trigonometry", name: "Introduction to Trigonometry (Class 10)", description: "Trigonometric ratios, ratios of specific angles, ratios of complementary angles, identities." },
      { code: "math.applications_trig", name: "Applications of Trigonometry (Class 10)", description: "Heights and distances using angles of elevation and depression." },
      { code: "math.circles", name: "Circles (Class 10)", description: "Tangent to a circle, number of tangents from an external point, properties of tangents." },
      { code: "math.constructions", name: "Constructions (Class 10)", description: "Division of line segment, construction of triangles and tangents to a circle." },
      { code: "math.areas_circles", name: "Areas Related to Circles (Class 10)", description: "Area of sector and segment, areas of combinations of plane figures." },
      { code: "math.surface_areas_volumes", name: "Surface Areas and Volumes (Class 10)", description: "Cuboid, cylinder, cone, sphere, hemisphere, frustum — combinations and conversions." },
      { code: "math.statistics", name: "Statistics (Class 10)", description: "Mean, median, mode of grouped data, cumulative frequency curves (ogives)." },
      { code: "math.probability", name: "Probability (Class 10)", description: "Classical definition, simple problems on coins, dice, cards." },
      { code: "math.number_systems_9", name: "Number Systems (Class 9)", description: "Rational and irrational numbers, real numbers on number line, laws of exponents for real numbers." },
      { code: "math.polynomials_9", name: "Polynomials (Class 9)", description: "Remainder theorem, factor theorem, factorization, algebraic identities." },
      { code: "math.linear_eq_two_var_9", name: "Linear Equations in Two Variables (Class 9)", description: "Solution of linear equation, graph of linear equation, equations of lines parallel to axes." },
      { code: "math.coordinate_geom_9", name: "Coordinate Geometry — Basics (Class 9)", description: "Cartesian system, plotting points in plane." },
      { code: "math.lines_angles", name: "Lines and Angles (Class 9)", description: "Pairs of angles, parallel lines and transversal, angle sum property of triangle." },
      { code: "math.quadrilaterals", name: "Quadrilaterals (Class 9)", description: "Properties of parallelogram, mid-point theorem and converse." },
      { code: "math.areas_parallelograms", name: "Areas of Parallelograms and Triangles (Class 9)", description: "Figures on same base and between same parallels, area theorems." },
      { code: "math.circles_9", name: "Circles (Class 9)", description: "Equal chords, perpendicular from centre, angle subtended by arc, cyclic quadrilaterals." },
      { code: "math.heron_formula", name: "Heron's Formula (Class 9)", description: "Area of triangle using Heron's formula, application to quadrilaterals." },
      { code: "math.surface_volumes_9", name: "Surface Areas and Volumes (Class 9)", description: "Cuboid, cube, right circular cylinder, cone, sphere — formulas and applications." },
      { code: "math.statistics_9", name: "Statistics (Class 9)", description: "Collection and presentation of data, bar graph, histogram, frequency polygon, mean, median, mode." },
    ],
  },

  // ── PHYSICS (25 Qs) ──────────────────────────────────────────────────
  {
    code: "PHYSICS",
    name: "Physics",
    weight: 1,
    topics: [
      { code: "phy.light_reflection", name: "Light — Reflection and Refraction (Class 10)", description: "Spherical mirrors, mirror formula, refraction through lenses, lens formula, magnification." },
      { code: "phy.human_eye", name: "Human Eye and Colourful World (Class 10)", description: "Power of accommodation, defects of vision, dispersion through prism, atmospheric refraction, scattering." },
      { code: "phy.electricity", name: "Electricity (Class 10)", description: "Electric current, potential difference, Ohm's law, resistance, series/parallel combinations, heating effect." },
      { code: "phy.magnetic_effects", name: "Magnetic Effects of Electric Current (Class 10)", description: "Magnetic field of current, force on conductor, electromagnetic induction, electric motor and generator." },
      { code: "phy.sources_energy", name: "Sources of Energy (Class 10)", description: "Conventional and non-conventional sources, biomass, solar, wind, nuclear, environmental concerns." },
      { code: "phy.motion_9", name: "Motion (Class 9)", description: "Distance, displacement, speed, velocity, acceleration, equations of uniformly accelerated motion, graphs." },
      { code: "phy.force_laws_motion_9", name: "Force and Laws of Motion (Class 9)", description: "Newton's three laws of motion, momentum, conservation of momentum, action-reaction pairs." },
      { code: "phy.gravitation_9", name: "Gravitation (Class 9)", description: "Universal law of gravitation, free fall, mass and weight, thrust and pressure, buoyancy, Archimedes' principle." },
      { code: "phy.work_energy_9", name: "Work and Energy (Class 9)", description: "Work done by force, kinetic energy, potential energy, conservation of energy, power, commercial unit of energy." },
      { code: "phy.sound_9", name: "Sound (Class 9)", description: "Production and propagation of sound, longitudinal and transverse waves, reflection, echo, ultrasound, SONAR." },
    ],
  },

  // ── CHEMISTRY (25 Qs) ─────────────────────────────────────────────────
  {
    code: "CHEMISTRY",
    name: "Chemistry",
    weight: 1,
    topics: [
      { code: "chem.chemical_reactions", name: "Chemical Reactions and Equations (Class 10)", description: "Types of reactions — combination, decomposition, displacement, redox; oxidation and reduction." },
      { code: "chem.acids_bases_salts", name: "Acids, Bases and Salts (Class 10)", description: "Properties, pH scale, neutralisation, common salts (NaCl, Na2CO3, NaHCO3, plaster of Paris)." },
      { code: "chem.metals_nonmetals", name: "Metals and Non-Metals (Class 10)", description: "Physical and chemical properties, reactivity series, ionic compounds, occurrence and extraction." },
      { code: "chem.carbon_compounds", name: "Carbon and its Compounds (Class 10)", description: "Covalent bonding, allotropes, hydrocarbons, functional groups, soaps and detergents, ethanol, ethanoic acid." },
      { code: "chem.periodic_classification", name: "Periodic Classification of Elements (Class 10)", description: "Mendeleev's and modern periodic table, trends — atomic size, valency, metallic character." },
      { code: "chem.matter_surroundings_9", name: "Matter in Our Surroundings (Class 9)", description: "States of matter, change of state, latent heat, evaporation, factors affecting evaporation." },
      { code: "chem.is_matter_pure_9", name: "Is Matter Around Us Pure (Class 9)", description: "Mixtures, solutions, suspensions, colloids, separation techniques, physical and chemical changes." },
      { code: "chem.atoms_molecules_9", name: "Atoms and Molecules (Class 9)", description: "Laws of chemical combination, atomic and molecular mass, mole concept, formula writing." },
      { code: "chem.structure_atom_9", name: "Structure of the Atom (Class 9)", description: "Thomson, Rutherford, Bohr models, valence electrons, isotopes, isobars, electronic configuration." },
    ],
  },
];

export async function seedUpJeecupSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "UP_JEECUP" } });
  if (!exam) {
    throw new Error("Run seedExams() first — UP_JEECUP exam not found.");
  }
  console.log(`Seeding JEECUP syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < upJeecupSyllabus.length; sIdx++) {
    const s = upJeecupSyllabus[sIdx];
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
  console.log(`Seeded JEECUP syllabus. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedUpJeecupSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
