// Bihar DCECE (Diploma Certificate Entrance Competitive Examination) — full syllabus tree.
// Conducting body: Bihar Combined Entrance Competitive Examination Board (bceceboard.bihar.gov.in).
// Streams: PE (Polytechnic Engineering), PM (Para-Medical Intermediate), PMM (Para-Medical Matric), PPE (Part-Time Polytechnic).
// Pattern: 90 MCQs (some streams), 150 MCQs (PE) — duration 2h 15m. +5 for correct, -1.25 for incorrect.
// Subjects covered across streams: Physics, Chemistry, Mathematics, Biology, English, Hindi, GK, General Science.
// Syllabus level: Class 10 (PMM) and Class 12 (PM) NCERT / Bihar Board.
//
// Run after seedExams: npx tsx seed/exams/bihar-dcece-syllabus.ts

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

export const biharDceceSyllabus: SubjectSeed[] = [
  // ── PHYSICS ──────────────────────────────────────────────────────────
  {
    code: "PHYSICS",
    name: "Physics",
    weight: 1,
    topics: [
      { code: "phy.units_measurement", name: "Units, Dimensions and Measurement", description: "SI units, dimensional analysis, error analysis, significant figures." },
      { code: "phy.kinematics", name: "Kinematics", description: "Distance, displacement, velocity, acceleration, equations of motion, projectile motion." },
      { code: "phy.laws_motion", name: "Laws of Motion", description: "Newton's three laws, momentum, friction, conservation of momentum." },
      { code: "phy.work_energy_power", name: "Work, Energy and Power", description: "Work-energy theorem, conservation of energy, power, collisions." },
      { code: "phy.gravitation", name: "Gravitation", description: "Universal law of gravitation, escape velocity, Kepler's laws (basic)." },
      { code: "phy.heat_thermodynamics", name: "Heat and Thermodynamics", description: "Specific heat, latent heat, laws of thermodynamics, gas laws." },
      { code: "phy.oscillations_waves", name: "Oscillations and Waves", description: "SHM, wave motion, sound waves, Doppler effect (introductory)." },
      { code: "phy.optics", name: "Ray and Wave Optics", description: "Reflection, refraction, lenses, prisms, optical instruments, interference, diffraction basics." },
      { code: "phy.electrostatics", name: "Electrostatics", description: "Coulomb's law, electric field, potential, capacitors." },
      { code: "phy.current_electricity", name: "Current Electricity", description: "Ohm's law, Kirchhoff's laws, Wheatstone bridge, heating effect." },
      { code: "phy.magnetism", name: "Magnetism and Magnetic Effects of Current", description: "Magnetic field, Biot-Savart law, force on conductor, EMI." },
      { code: "phy.modern_physics", name: "Modern Physics", description: "Photoelectric effect, atomic models, nuclear physics basics, semiconductors." },
    ],
  },

  // ── CHEMISTRY ────────────────────────────────────────────────────────
  {
    code: "CHEMISTRY",
    name: "Chemistry",
    weight: 1,
    topics: [
      { code: "chem.atomic_structure", name: "Atomic Structure", description: "Atomic models, quantum numbers, electronic configuration, isotopes." },
      { code: "chem.periodic_table", name: "Periodic Table and Periodicity", description: "Modern periodic law, trends — atomic radius, IE, EA, electronegativity." },
      { code: "chem.chemical_bonding", name: "Chemical Bonding", description: "Ionic, covalent, coordinate, hydrogen bonds, VSEPR, hybridisation." },
      { code: "chem.states_matter", name: "States of Matter", description: "Gas laws, ideal gas equation, kinetic theory, liquid and solid states." },
      { code: "chem.acids_bases_salts", name: "Acids, Bases and Salts", description: "pH, indicators, neutralisation, common salts." },
      { code: "chem.redox", name: "Redox Reactions", description: "Oxidation numbers, balancing redox equations." },
      { code: "chem.metallurgy", name: "General Principles of Metallurgy", description: "Concentration, reduction, refining of metals." },
      { code: "chem.organic_basics", name: "Basic Principles of Organic Chemistry", description: "IUPAC nomenclature, isomerism, electron displacement effects." },
      { code: "chem.hydrocarbons", name: "Hydrocarbons", description: "Alkanes, alkenes, alkynes, aromatic hydrocarbons." },
      { code: "chem.environmental", name: "Environmental Chemistry", description: "Pollution, greenhouse effect, ozone layer depletion." },
      { code: "chem.everyday_chemistry", name: "Chemistry in Everyday Life", description: "Soaps, detergents, drugs, food preservatives." },
    ],
  },

  // ── MATHEMATICS ──────────────────────────────────────────────────────
  {
    code: "MATHEMATICS",
    name: "Mathematics",
    weight: 1,
    topics: [
      { code: "math.algebra", name: "Algebra", description: "Polynomials, linear and quadratic equations, progressions." },
      { code: "math.set_theory", name: "Set Theory and Functions", description: "Set operations, types of functions, domain and range." },
      { code: "math.trigonometry", name: "Trigonometry", description: "Trigonometric ratios, identities, equations, applications." },
      { code: "math.coordinate_geometry", name: "Coordinate Geometry", description: "Straight lines, circles, conic sections (basic)." },
      { code: "math.geometry", name: "Geometry", description: "Triangles, similarity, congruence, circles, theorems." },
      { code: "math.mensuration", name: "Mensuration", description: "Areas and volumes — cuboid, cylinder, cone, sphere, frustum." },
      { code: "math.statistics", name: "Statistics", description: "Mean, median, mode, standard deviation." },
      { code: "math.probability", name: "Probability", description: "Classical probability, conditional probability basics." },
      { code: "math.calculus_basic", name: "Differentiation and Integration (Basic)", description: "Derivatives, integrals — for PM stream Class 12 candidates." },
    ],
  },

  // ── BIOLOGY (PM and PMM streams) ─────────────────────────────────────
  {
    code: "BIOLOGY",
    name: "Biology",
    weight: 1,
    topics: [
      { code: "bio.cell_biology", name: "Cell Biology", description: "Cell theory, prokaryotes vs eukaryotes, organelles, cell division." },
      { code: "bio.tissue", name: "Tissues", description: "Plant and animal tissues, structure and function." },
      { code: "bio.classification", name: "Diversity of Living Organisms", description: "Five-kingdom classification, plant and animal kingdoms." },
      { code: "bio.plant_physiology", name: "Plant Physiology", description: "Photosynthesis, respiration, transpiration, plant hormones." },
      { code: "bio.human_physiology", name: "Human Physiology", description: "Digestion, respiration, circulation, excretion, nervous and endocrine systems." },
      { code: "bio.reproduction", name: "Reproduction", description: "Asexual and sexual reproduction, human reproductive system." },
      { code: "bio.genetics", name: "Genetics and Heredity", description: "Mendel's laws, sex determination, mutation, DNA basics." },
      { code: "bio.evolution", name: "Evolution", description: "Theories, evidence, Darwinism, human evolution." },
      { code: "bio.ecology", name: "Ecology and Environment", description: "Ecosystems, food chains, biogeochemical cycles, biodiversity." },
      { code: "bio.health_disease", name: "Health and Disease", description: "Communicable and non-communicable diseases, immunity, vaccines." },
    ],
  },

  // ── GENERAL KNOWLEDGE & GENERAL SCIENCE ──────────────────────────────
  {
    code: "GENERAL_KNOWLEDGE",
    name: "General Knowledge",
    weight: 1,
    topics: [
      { code: "gk.current_affairs", name: "Current Affairs", description: "National and international events, sports, awards, books." },
      { code: "gk.history", name: "History", description: "Indian history — ancient, medieval, modern; freedom movement." },
      { code: "gk.geography", name: "Geography", description: "Indian and world geography, physical and political features." },
      { code: "gk.polity", name: "Indian Polity", description: "Constitution, parliament, judiciary, fundamental rights." },
      { code: "gk.economy", name: "Indian Economy", description: "Basic concepts, planning, banking, fiscal and monetary policy." },
      { code: "gk.general_science", name: "General Science", description: "Everyday physics, chemistry and biology, scientific instruments and discoveries." },
    ],
  },
];

export async function seedBiharDceceSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "BR_DCECE" } });
  if (!exam) {
    throw new Error("Run seedExams() first — BR_DCECE exam not found.");
  }
  console.log(`Seeding Bihar DCECE syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < biharDceceSyllabus.length; sIdx++) {
    const s = biharDceceSyllabus[sIdx];
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
  console.log(`Seeded Bihar DCECE syllabus. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedBiharDceceSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
