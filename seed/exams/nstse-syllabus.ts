// NSTSE — National Level Science Talent Search Examination (Unified Council).
// Class 9-10 syllabus. Source: unifiedcouncil.com/about-nstse and NSTSE syllabus PDF.
// 60 questions × 60 minutes. Concept-application heavy, no negative marking.
//
// Run after seedExams: npx tsx seed/exams/nstse-syllabus.ts

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

export const nstseSyllabus: SubjectSeed[] = [
  // ── MATHEMATICS ───────────────────────────────────────────────────────
  {
    code: "MATH",
    name: "Mathematics",
    weight: 0.3,
    topics: [
      { code: "math.real_numbers", name: "Real Numbers", description: "Euclid's division lemma, fundamental theorem of arithmetic, irrationals, decimals." },
      { code: "math.polynomials", name: "Polynomials", description: "Zeroes, relationship with coefficients, division algorithm, factor theorem." },
      { code: "math.linear_eqs", name: "Linear Equations in Two Variables", description: "Algebraic and graphical methods, consistency, applications." },
      { code: "math.quadratic_eqs", name: "Quadratic Equations", description: "Roots, discriminant, nature of roots, real-life applications." },
      { code: "math.ap", name: "Arithmetic Progression", description: "nth term, sum of n terms, applied progression problems." },
      { code: "math.coordinate_geometry", name: "Coordinate Geometry", description: "Distance, section formula, area of triangle in coordinate plane." },
      { code: "math.triangles", name: "Triangles", description: "Similarity, BPT, areas of similar triangles, Pythagoras applications." },
      { code: "math.circles", name: "Circles", description: "Tangent properties, number of tangents from external point, related theorems." },
      { code: "math.constructions", name: "Constructions", description: "Division of a line segment, tangents to a circle, similar triangle constructions." },
      { code: "math.trigonometry", name: "Trigonometry", description: "Ratios, identities, applications in heights and distances." },
      { code: "math.mensuration", name: "Mensuration", description: "Surface area and volume of combinations of solids, conversion of solids." },
      { code: "math.statistics", name: "Statistics", description: "Mean, median, mode of grouped data, ogives, relationship between measures." },
      { code: "math.probability", name: "Probability", description: "Classical probability, simple events, dice, cards and coins." },
    ],
  },

  // ── PHYSICS ───────────────────────────────────────────────────────────
  {
    code: "PHYSICS",
    name: "Physics",
    weight: 0.18,
    topics: [
      { code: "phys.motion", name: "Motion", description: "Kinematics in one dimension, motion graphs, equations of uniform acceleration." },
      { code: "phys.force_laws", name: "Force and Laws of Motion", description: "Newton's laws, momentum and impulse, application problems." },
      { code: "phys.gravitation", name: "Gravitation", description: "Universal law, free fall, mass/weight, pressure, buoyancy, Archimedes." },
      { code: "phys.work_energy", name: "Work, Energy and Power", description: "Work-energy theorem, KE/PE, conservation, mechanical power." },
      { code: "phys.sound", name: "Sound", description: "Wave parameters, longitudinal vs transverse, reflection, ultrasound." },
      { code: "phys.light_reflection_refraction", name: "Light — Reflection and Refraction", description: "Mirrors, lenses, sign convention, ray diagrams, image formation." },
      { code: "phys.human_eye", name: "Human Eye and Colourful World", description: "Vision defects, prism dispersion, atmospheric refraction phenomena." },
      { code: "phys.electricity", name: "Electricity", description: "Ohm's law, resistance combinations, electrical power and heating." },
      { code: "phys.magnetism", name: "Magnetic Effects of Current", description: "Magnetic fields, motor, generator, electromagnetic induction basics." },
    ],
  },

  // ── CHEMISTRY ─────────────────────────────────────────────────────────
  {
    code: "CHEMISTRY",
    name: "Chemistry",
    weight: 0.17,
    topics: [
      { code: "chem.matter", name: "Matter", description: "States, physical/chemical changes, evaporation and latent heat." },
      { code: "chem.atoms_molecules", name: "Atoms and Molecules", description: "Laws of chemical combination, mole concept, molar mass, formulae." },
      { code: "chem.atomic_structure", name: "Structure of the Atom", description: "Sub-atomic particles, atomic models, electron configuration, isotopes." },
      { code: "chem.reactions", name: "Chemical Reactions and Equations", description: "Types of reactions, balancing, redox, oxidation states." },
      { code: "chem.acids_bases", name: "Acids, Bases and Salts", description: "pH, indicators, common salts, manufacturing of NaOH, bleaching powder." },
      { code: "chem.metals_nonmetals", name: "Metals and Non-Metals", description: "Reactivity series, extraction of metals, refining, alloys, corrosion." },
      { code: "chem.carbon", name: "Carbon and its Compounds", description: "Bonding, hydrocarbons, isomerism, functional groups, soaps." },
      { code: "chem.periodic", name: "Periodic Classification", description: "Modern periodic table, periodic trends — atomic size, electronegativity." },
    ],
  },

  // ── BIOLOGY ───────────────────────────────────────────────────────────
  {
    code: "BIOLOGY",
    name: "Biology",
    weight: 0.17,
    topics: [
      { code: "bio.cell", name: "Cell — Fundamental Unit of Life", description: "Cell theory, organelles, prokaryotic/eukaryotic differences." },
      { code: "bio.tissues", name: "Tissues", description: "Plant and animal tissues, structure-function relationship." },
      { code: "bio.diversity", name: "Diversity in Living Organisms", description: "Five-kingdom classification, taxonomic hierarchy." },
      { code: "bio.life_processes", name: "Life Processes", description: "Nutrition, respiration, transportation, excretion in plants and animals." },
      { code: "bio.control_coordination", name: "Control and Coordination", description: "Nervous system, hormones, plant movements and tropisms." },
      { code: "bio.reproduction", name: "Reproduction", description: "Asexual/sexual reproduction in plants and humans, reproductive health." },
      { code: "bio.heredity_evolution", name: "Heredity and Evolution", description: "Mendelian inheritance, sex determination, evolutionary evidence." },
      { code: "bio.natural_resources", name: "Natural Resources and Environment", description: "Cycles in nature, ecosystems, pollution, conservation, food chains." },
      { code: "bio.disease_health", name: "Health and Disease", description: "Communicable/non-communicable diseases, immunity and vaccines." },
    ],
  },

  // ── REASONING / GENERAL QUESTIONS ─────────────────────────────────────
  {
    code: "REASONING",
    name: "General Questions and Reasoning",
    weight: 0.18,
    topics: [
      { code: "reason.series", name: "Number and Letter Series", description: "Identifying patterns and finding the missing/next term." },
      { code: "reason.analogy_classification", name: "Analogy and Classification", description: "Word, number, letter and figure analogies; odd-one-out." },
      { code: "reason.coding", name: "Coding-Decoding", description: "Letter-letter, letter-number, conditional and substitution coding." },
      { code: "reason.directions", name: "Direction Sense", description: "Compass-based movement, shortest distance, final direction." },
      { code: "reason.blood_relations", name: "Blood Relations", description: "Family tree problems, generation-based relationships." },
      { code: "reason.puzzles", name: "Puzzles and Seating Arrangement", description: "Linear/circular arrangement, calendar, clock-based problems." },
      { code: "reason.data_sufficiency", name: "Data Sufficiency", description: "Determining whether given statements suffice to answer a question." },
      { code: "reason.critical_thinking", name: "Critical Thinking", description: "Logical/inductive reasoning, decision-making, subjective and objective analysis." },
      { code: "reason.scientific_application", name: "Scientific Reasoning Application", description: "Applying PCB concepts to novel real-world contexts and experiments." },
    ],
  },
];

export async function seedNstseSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "NSTSE" } });
  if (!exam) {
    throw new Error("Run seedExams() first — NSTSE exam not found.");
  }
  console.log(`Seeding NSTSE syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < nstseSyllabus.length; sIdx++) {
    const s = nstseSyllabus[sIdx];
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
  seedNstseSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
