// HP PAT (Himachal Pradesh Polytechnic Admission Test) — full syllabus tree.
// Conducting body: Himachal Pradesh Takniki Shiksha Board, Dharamshala (hptechboard.com).
// Pattern: 150 MCQs in 3 hours. Mathematics + Physics + Chemistry across Class 10 syllabus.
// Marking: +4 for correct, -1 for incorrect.
// Syllabus level: Class 10 NCERT / HP Board curriculum.
//
// Run after seedExams: npx tsx seed/exams/hp-pat-syllabus.ts

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

export const hpPatSyllabus: SubjectSeed[] = [
  // ── MATHEMATICS ──────────────────────────────────────────────────────
  {
    code: "MATHEMATICS",
    name: "Mathematics",
    weight: 1,
    topics: [
      { code: "math.real_numbers", name: "Real Numbers", description: "Euclid's division lemma, fundamental theorem of arithmetic, irrational numbers." },
      { code: "math.polynomials", name: "Polynomials", description: "Zeroes, geometrical meaning, division algorithm." },
      { code: "math.linear_equations_two_var", name: "Pair of Linear Equations in Two Variables", description: "Graphical and algebraic methods, consistency, applications." },
      { code: "math.quadratic_equations", name: "Quadratic Equations", description: "Standard form, factorisation, formula method, discriminant." },
      { code: "math.arithmetic_progressions", name: "Arithmetic Progressions", description: "nth term, sum of n terms, applications." },
      { code: "math.triangles", name: "Triangles", description: "Similarity, BPT, areas, Pythagoras theorem and converse." },
      { code: "math.coordinate_geometry", name: "Coordinate Geometry", description: "Distance, section, mid-point formulas, area of triangle." },
      { code: "math.intro_trigonometry", name: "Introduction to Trigonometry", description: "Ratios, identities, complementary angles, specific angles." },
      { code: "math.applications_trig", name: "Some Applications of Trigonometry", description: "Heights and distances using elevation and depression." },
      { code: "math.circles", name: "Circles", description: "Tangent properties, number of tangents from external point." },
      { code: "math.constructions", name: "Constructions", description: "Division of segment, construction of similar triangles and tangents." },
      { code: "math.areas_circles", name: "Areas Related to Circles", description: "Sectors, segments, combinations of plane figures." },
      { code: "math.surface_areas_volumes", name: "Surface Areas and Volumes", description: "Cuboid, cylinder, cone, sphere, hemisphere, frustum and combinations." },
      { code: "math.statistics", name: "Statistics", description: "Mean, median, mode of grouped data, ogives." },
      { code: "math.probability", name: "Probability", description: "Theoretical probability, simple problems on coins, dice and cards." },
    ],
  },

  // ── PHYSICS ──────────────────────────────────────────────────────────
  {
    code: "PHYSICS",
    name: "Physics",
    weight: 1,
    topics: [
      { code: "phy.light_reflection", name: "Light — Reflection and Refraction", description: "Spherical mirrors, mirror formula, lenses, refraction, magnification." },
      { code: "phy.human_eye", name: "Human Eye and Colourful World", description: "Defects of vision, dispersion, scattering, atmospheric refraction." },
      { code: "phy.electricity", name: "Electricity", description: "Ohm's law, resistance, series and parallel circuits, heating effect, power." },
      { code: "phy.magnetic_effects", name: "Magnetic Effects of Electric Current", description: "Magnetic field of current, EMI, motor and generator principles." },
      { code: "phy.sources_energy", name: "Sources of Energy and the Environment", description: "Conventional and non-conventional sources, environmental concerns." },
      { code: "phy.motion", name: "Motion", description: "Distance, displacement, velocity, acceleration, equations of motion." },
      { code: "phy.force_laws_motion", name: "Force and Laws of Motion", description: "Newton's three laws, momentum, conservation." },
      { code: "phy.gravitation", name: "Gravitation", description: "Universal law of gravitation, weight, free fall, pressure, buoyancy." },
      { code: "phy.work_energy_power", name: "Work and Energy", description: "Work-energy theorem, KE and PE, conservation of energy, power." },
      { code: "phy.sound", name: "Sound", description: "Wave nature of sound, reflection, echo, ultrasonic, SONAR." },
    ],
  },

  // ── CHEMISTRY ────────────────────────────────────────────────────────
  {
    code: "CHEMISTRY",
    name: "Chemistry",
    weight: 1,
    topics: [
      { code: "chem.atomic_structure", name: "Atomic Structure", description: "Sub-atomic particles, atomic models, electronic configuration, isotopes." },
      { code: "chem.metals_nonmetals", name: "Metals and Non-Metals", description: "Properties, reactivity series, ionic compounds, extraction of metals." },
      { code: "chem.chemical_reactions", name: "Chemical Reactions and Equations", description: "Types of reactions — combination, decomposition, displacement, redox." },
      { code: "chem.acids_bases_salts", name: "Acids, Bases and Salts", description: "Properties, indicators, pH, neutralisation, common salts." },
      { code: "chem.carbon_compounds", name: "Carbon and its Compounds", description: "Covalent bonding, allotropes, hydrocarbons, ethanol, ethanoic acid." },
      { code: "chem.periodic_table", name: "Periodic Classification of Elements", description: "Mendeleev's table, modern periodic law, periodic trends." },
      { code: "chem.matter_surroundings", name: "Matter in Our Surroundings", description: "States of matter, change of state, evaporation, diffusion." },
      { code: "chem.is_matter_pure", name: "Is Matter Around Us Pure", description: "Mixtures, solutions, colloids, separation techniques." },
      { code: "chem.atoms_molecules", name: "Atoms and Molecules", description: "Laws of chemical combination, atomic and molecular masses, mole concept." },
    ],
  },
];

export async function seedHpPatSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "HP_POLYTECHNIC" } });
  if (!exam) {
    throw new Error("Run seedExams() first — HP_POLYTECHNIC exam not found.");
  }
  console.log(`Seeding HP PAT syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < hpPatSyllabus.length; sIdx++) {
    const s = hpPatSyllabus[sIdx];
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
  console.log(`Seeded HP PAT syllabus. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedHpPatSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
