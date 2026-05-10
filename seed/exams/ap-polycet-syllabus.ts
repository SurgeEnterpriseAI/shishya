// AP POLYCET (Andhra Pradesh Polytechnic Common Entrance Test) — full syllabus tree.
// Conducting body: State Board of Technical Education and Training, AP (polycetap.nic.in).
// Pattern: 120 MCQs in 2 hours. Mathematics 50 + Physics 40 + Chemistry 30. +1 / 0 (no negative).
// Syllabus level: Andhra Pradesh SSC (Class 10) curriculum.
//
// Run after seedExams: npx tsx seed/exams/ap-polycet-syllabus.ts

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

export const apPolycetSyllabus: SubjectSeed[] = [
  // ── MATHEMATICS (50 Qs) ──────────────────────────────────────────────
  {
    code: "MATHEMATICS",
    name: "Mathematics",
    weight: 1,
    topics: [
      { code: "math.real_numbers", name: "Real Numbers", description: "Euclid's division lemma, fundamental theorem of arithmetic, irrational numbers, decimal expansions." },
      { code: "math.sets", name: "Sets", description: "Roster and set-builder forms, types of sets, set operations, Venn diagrams." },
      { code: "math.polynomials", name: "Polynomials", description: "Zeroes of polynomials, division algorithm, geometrical meaning of zeroes." },
      { code: "math.pair_linear_equations", name: "Pair of Linear Equations in Two Variables", description: "Graphical and algebraic methods, consistency, applications." },
      { code: "math.quadratic_equations", name: "Quadratic Equations", description: "Solution by factorisation, completing the square, quadratic formula, discriminant." },
      { code: "math.progressions", name: "Progressions", description: "Arithmetic and geometric progressions, nth term and sum formulas." },
      { code: "math.coordinate_geometry", name: "Coordinate Geometry", description: "Distance, section, mid-point and centroid formulas, area of triangle, slope of line." },
      { code: "math.similar_triangles", name: "Similar Triangles", description: "Basic proportionality theorem, criteria for similarity, areas of similar triangles, Pythagoras theorem." },
      { code: "math.tangents_secants", name: "Tangents and Secants to a Circle", description: "Tangent properties, length of tangent from external point, segments and sectors." },
      { code: "math.mensuration", name: "Mensuration", description: "Surface areas and volumes of cuboid, cylinder, cone, sphere, hemisphere, frustum and combinations." },
      { code: "math.trigonometry", name: "Trigonometry", description: "Trigonometric ratios, identities, ratios of complementary angles, specific angle values." },
      { code: "math.applications_trig", name: "Applications of Trigonometry", description: "Heights and distances, angles of elevation and depression." },
      { code: "math.probability", name: "Probability", description: "Classical definition, simple events, problems on coins, dice, playing cards." },
      { code: "math.statistics", name: "Statistics", description: "Mean, median, mode for grouped data, cumulative frequency, ogive curves." },
      { code: "math.mathematical_modelling", name: "Mathematical Modelling", description: "Translating real-life situations into mathematical equations and solving." },
    ],
  },

  // ── PHYSICS (40 Qs) ──────────────────────────────────────────────────
  {
    code: "PHYSICS",
    name: "Physics",
    weight: 1,
    topics: [
      { code: "phy.heat", name: "Heat", description: "Thermal equilibrium, specific heat, latent heat, evaporation and condensation, humidity." },
      { code: "phy.reflection_light", name: "Reflection of Light by Different Surfaces", description: "Plane and spherical mirrors, mirror formula, magnification, image formation." },
      { code: "phy.refraction_light_plane", name: "Refraction of Light at Plane Surfaces", description: "Laws of refraction, refractive index, total internal reflection, optical fibres." },
      { code: "phy.refraction_curved", name: "Refraction of Light at Curved Surfaces", description: "Lens formula, image formation by convex and concave lenses, magnification." },
      { code: "phy.human_eye", name: "Human Eye and Colourful World", description: "Eye structure, defects of vision, dispersion through prism, scattering of light, rainbow." },
      { code: "phy.electric_current", name: "Electric Current", description: "Ohm's law, resistance, series and parallel circuits, heating effect, electric power." },
      { code: "phy.magnetic_effects", name: "Electromagnetism", description: "Magnetic field of current, force on conductor, electromagnetic induction, electric motor and generator." },
      { code: "phy.units_dimensions", name: "Units and Dimensions", description: "Fundamental and derived units, SI system, dimensional analysis." },
      { code: "phy.elements_vectors", name: "Elements of Vectors", description: "Scalars vs vectors, addition, subtraction, resolution of vectors, dot and cross products." },
      { code: "phy.kinematics", name: "Kinematics", description: "Distance and displacement, speed and velocity, equations of uniformly accelerated motion." },
      { code: "phy.dynamics", name: "Dynamics", description: "Newton's laws of motion, momentum and impulse, conservation of momentum, friction." },
      { code: "phy.work_energy_power", name: "Work, Energy and Power", description: "Work-energy theorem, kinetic and potential energy, conservation of energy, power." },
      { code: "phy.gravitation", name: "Gravitation", description: "Universal law of gravitation, free fall, weight vs mass, simple problems." },
      { code: "phy.elasticity", name: "Elasticity", description: "Stress, strain, Hooke's law, Young's modulus, elastic limit." },
      { code: "phy.surface_tension", name: "Surface Tension", description: "Cohesion and adhesion, capillarity, examples of surface tension in daily life." },
      { code: "phy.viscosity", name: "Viscosity", description: "Coefficient of viscosity, terminal velocity, Stokes' law applications." },
      { code: "phy.thermodynamics", name: "Thermodynamics", description: "Zeroth and first law, isothermal and adiabatic processes, heat engines (introductory)." },
    ],
  },

  // ── CHEMISTRY (30 Qs) ─────────────────────────────────────────────────
  {
    code: "CHEMISTRY",
    name: "Chemistry",
    weight: 1,
    topics: [
      { code: "chem.acids_bases_salts", name: "Acids, Bases and Salts", description: "Indicators, pH scale, neutralisation, common salts and their uses." },
      { code: "chem.chemical_equations", name: "Chemical Equations and Reactions", description: "Balanced equations, types of reactions, oxidation and reduction." },
      { code: "chem.metallurgy", name: "Principles of Metallurgy", description: "Occurrence of metals, concentration of ores, reduction methods, refining." },
      { code: "chem.atomic_structure", name: "Structure of Atom", description: "Sub-atomic particles, atomic models, Bohr's model, quantum numbers, electronic configuration." },
      { code: "chem.classification_elements", name: "Classification of Elements — Periodic Table", description: "Modern periodic law, periodic trends — atomic radius, ionisation, electron affinity." },
      { code: "chem.chemical_bonding", name: "Chemical Bonding", description: "Ionic, covalent and coordinate bonds, Lewis dot structures, bond polarity." },
      { code: "chem.carbon_compounds", name: "Carbon and its Compounds", description: "Allotropes, hydrocarbons, functional groups, ethanol, ethanoic acid, soaps and detergents." },
      { code: "chem.water_technology", name: "Water Technology", description: "Hard and soft water, types of hardness, water purification methods." },
      { code: "chem.solutions", name: "Solutions", description: "Solute and solvent, types of solutions, concentration, molarity, normality." },
      { code: "chem.electrochemistry", name: "Electrochemistry — Basics", description: "Electrolysis, conductors, applications in electroplating and refining." },
      { code: "chem.environmental_chem", name: "Environmental Chemistry", description: "Air and water pollution, acid rain, ozone depletion, greenhouse effect." },
      { code: "chem.polymers", name: "Polymers", description: "Natural and synthetic polymers, addition vs condensation polymers, common examples." },
    ],
  },
];

export async function seedApPolycetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "AP_POLYCET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — AP_POLYCET exam not found.");
  }
  console.log(`Seeding AP POLYCET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < apPolycetSyllabus.length; sIdx++) {
    const s = apPolycetSyllabus[sIdx];
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
  console.log(`Seeded AP POLYCET syllabus. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedApPolycetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
