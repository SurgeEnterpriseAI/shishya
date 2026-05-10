// NSEJS (National Standard Examination in Junior Science) — full syllabus tree.
// Stage-1 Junior Science Olympiad. 80 MCQs, 2 hours.
// Scope: Class 8-10 NCERT integrated — Physics, Chemistry, Biology, Mathematics.
// Source: HBCSE olympiads.hbcse.tifr.res.in/how-to-prepare/syllabus/ + IAPT NSEJS brochure + Allen NSEJS page.
//
// Run after seedExams: npx tsx seed/exams/nsejs-syllabus.ts

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

export const nsejsSyllabus: SubjectSeed[] = [
  // ── PHYSICS ────────────────────────────────────────────────────────────
  {
    code: "PHYSICS",
    name: "Physics",
    weight: 1,
    topics: [
      { code: "js.phy.measurement", name: "Measurement and Units",
        description: "SI units, measuring instruments, significant figures and basic dimensional ideas at Class 8-10 level." },
      { code: "js.phy.motion", name: "Motion",
        description: "Distance, displacement, speed, velocity, acceleration and motion graphs." },
      { code: "js.phy.force_laws", name: "Force and Laws of Motion",
        description: "Newton's three laws of motion, momentum and conservation of momentum." },
      { code: "js.phy.gravitation", name: "Gravitation",
        description: "Universal law of gravitation, free fall, mass and weight, thrust and pressure, buoyancy." },
      { code: "js.phy.work_energy", name: "Work, Energy and Power",
        description: "Work, kinetic and potential energy, conservation of energy and units of energy/power." },
      { code: "js.phy.sound", name: "Sound",
        description: "Production and propagation of sound, reflection, echo, range of hearing and ultrasound applications." },
      { code: "js.phy.light", name: "Light — Reflection and Refraction",
        description: "Reflection from plane and spherical mirrors, mirror formula, refraction, refractive index and lens formula.",
        subtopics: [
          { code: "js.phy.light.mirrors", name: "Mirrors", description: "Plane and spherical mirrors, image formation and mirror equation." },
          { code: "js.phy.light.lenses", name: "Lenses", description: "Convex and concave lenses, lens formula and magnification." },
          { code: "js.phy.light.eye", name: "Human Eye and Defects", description: "Eye structure, defects of vision (myopia, hyperopia) and corrections." },
        ],
      },
      { code: "js.phy.electricity", name: "Electricity",
        description: "Electric current, potential difference, Ohm's law, resistance, series/parallel circuits and power dissipation." },
      { code: "js.phy.magnetic_effects", name: "Magnetic Effects of Current",
        description: "Magnetic field lines, Oersted's experiment, electromagnets, motor and generator (qualitative)." },
      { code: "js.phy.energy_sources", name: "Sources of Energy",
        description: "Conventional and non-conventional sources, fossil fuels, solar, wind, nuclear and biomass energy." },
      { code: "js.phy.heat", name: "Heat and Temperature",
        description: "Heat as form of energy, temperature, thermometers, specific heat and change of state." },
    ],
  },

  // ── CHEMISTRY ──────────────────────────────────────────────────────────
  {
    code: "CHEMISTRY",
    name: "Chemistry",
    weight: 1,
    topics: [
      { code: "js.chem.matter_states", name: "Matter — Nature and States",
        description: "States of matter, physical properties, change of state, latent heat and evaporation." },
      { code: "js.chem.matter_pure", name: "Is Matter Around Us Pure?",
        description: "Mixtures, solutions, suspensions, colloids, separation techniques and elements vs compounds." },
      { code: "js.chem.atoms_molecules", name: "Atoms and Molecules",
        description: "Laws of chemical combination, atomic and molecular masses, mole concept and chemical formulas." },
      { code: "js.chem.atomic_structure", name: "Structure of the Atom",
        description: "Discovery of subatomic particles, Thomson, Rutherford and Bohr models, isotopes and isobars." },
      { code: "js.chem.chemical_reactions", name: "Chemical Reactions and Equations",
        description: "Balancing equations, types of reactions (combination, decomposition, displacement, redox) and oxidation/reduction." },
      { code: "js.chem.acids_bases_salts", name: "Acids, Bases and Salts",
        description: "Properties of acids and bases, pH scale, neutralisation, salts and chemicals from common salt." },
      { code: "js.chem.metals_nonmetals", name: "Metals and Non-metals",
        description: "Physical and chemical properties, reactivity series, ionic compounds, metallurgy and corrosion." },
      { code: "js.chem.carbon_compounds", name: "Carbon and its Compounds",
        description: "Bonding in carbon, allotropes, hydrocarbons, functional groups, ethanol, ethanoic acid and soaps." },
      { code: "js.chem.periodic_classification", name: "Periodic Classification of Elements",
        description: "Doebereiner triads, Newlands' law, Mendeleev's table and modern periodic table trends." },
    ],
  },

  // ── BIOLOGY ────────────────────────────────────────────────────────────
  {
    code: "BIOLOGY",
    name: "Biology",
    weight: 1,
    topics: [
      { code: "js.bio.cell", name: "Cell — The Fundamental Unit of Life",
        description: "Cell theory, prokaryotic vs eukaryotic cells, cell organelles and cell division basics." },
      { code: "js.bio.tissues", name: "Tissues",
        description: "Plant tissues (meristematic, permanent) and animal tissues (epithelial, connective, muscular, nervous)." },
      { code: "js.bio.diversity", name: "Diversity in Living Organisms",
        description: "Hierarchical classification, five kingdoms and major plant/animal groups." },
      { code: "js.bio.life_processes", name: "Life Processes",
        description: "Nutrition, respiration, transportation, excretion in plants and animals." },
      { code: "js.bio.control_coordination", name: "Control and Coordination",
        description: "Nervous system, reflex action and chemical coordination through hormones in plants and animals." },
      { code: "js.bio.reproduction", name: "How Do Organisms Reproduce?",
        description: "Asexual and sexual reproduction, reproduction in plants and humans and reproductive health." },
      { code: "js.bio.heredity_evolution", name: "Heredity and Evolution",
        description: "Mendelian inheritance, sex determination, evidences of evolution and human evolution basics." },
      { code: "js.bio.health_disease", name: "Why Do We Fall Ill?",
        description: "Health and disease, infectious and non-infectious diseases and principles of treatment." },
      { code: "js.bio.food_resources", name: "Improvement in Food Resources",
        description: "Crop production, animal husbandry, fisheries and food preservation." },
      { code: "js.bio.environment", name: "Our Environment and Natural Resources",
        description: "Ecosystem, food chains, environmental issues, biogeochemical cycles and conservation of resources." },
    ],
  },

  // ── MATHEMATICS ────────────────────────────────────────────────────────
  {
    code: "MATHEMATICS",
    name: "Mathematics",
    weight: 1,
    topics: [
      { code: "js.math.number_systems", name: "Number Systems",
        description: "Real numbers, rational/irrational numbers, Euclid's division lemma and laws of exponents." },
      { code: "js.math.polynomials", name: "Polynomials",
        description: "Degree, zeros, factorisation, remainder theorem, factor theorem and identities." },
      { code: "js.math.linear_equations", name: "Linear Equations",
        description: "Linear equations in one and two variables — graphical and algebraic solutions." },
      { code: "js.math.quadratic_equations", name: "Quadratic Equations",
        description: "Solution by factorisation, completing the square, quadratic formula and discriminant." },
      { code: "js.math.progressions", name: "Arithmetic Progressions",
        description: "AP — nth term, sum of n terms and word problems." },
      { code: "js.math.coordinate_geometry", name: "Coordinate Geometry",
        description: "Cartesian system, distance formula, section formula and area of a triangle." },
      { code: "js.math.triangles", name: "Triangles",
        description: "Congruence, similarity, basic proportionality theorem and Pythagoras theorem." },
      { code: "js.math.circles", name: "Circles",
        description: "Tangents, properties of chords and angle properties of circles." },
      { code: "js.math.constructions", name: "Geometric Constructions",
        description: "Constructing tangents, dividing line segments and similar triangles." },
      { code: "js.math.trigonometry", name: "Introduction to Trigonometry",
        description: "Trigonometric ratios, ratios of complementary angles, basic identities and heights and distances." },
      { code: "js.math.mensuration", name: "Mensuration",
        description: "Areas of plane figures and surface areas/volumes of cubes, cuboids, cylinders, cones and spheres." },
      { code: "js.math.statistics", name: "Statistics",
        description: "Mean, median, mode and graphical representation (bar graph, histogram, frequency polygon)." },
      { code: "js.math.probability", name: "Probability",
        description: "Classical probability, simple events and elementary probability problems." },
    ],
  },
];

export async function seedNsejsSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "NSEJS" } });
  if (!exam) {
    throw new Error("Run seedExams() first — NSEJS exam not found.");
  }
  console.log(`Seeding NSEJS syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < nsejsSyllabus.length; sIdx++) {
    const s = nsejsSyllabus[sIdx];
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
  seedNsejsSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
