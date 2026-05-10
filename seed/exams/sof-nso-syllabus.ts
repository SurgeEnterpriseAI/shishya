// SOF NSO — National Science Olympiad (Class 9-10 canonical syllabus).
// 4 sections × ~50 questions: Logical Reasoning, Science, Achievers, plus Class-specific weights.
// Source: sofworld.org official Class 9-10 NSO syllabus.
//
// Run after seedExams: npx tsx seed/exams/sof-nso-syllabus.ts

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

export const sofNsoSyllabus: SubjectSeed[] = [
  // ── LOGICAL REASONING ─────────────────────────────────────────────────
  {
    code: "LOGICAL_REASONING",
    name: "Logical Reasoning",
    weight: 1,
    topics: [
      { code: "lr.verbal_reasoning", name: "Verbal Reasoning", description: "Word-based analogy, classification and word formation problems." },
      { code: "lr.non_verbal_reasoning", name: "Non-Verbal Reasoning", description: "Figure-based pattern, analogy, classification and series problems." },
      { code: "lr.series", name: "Series Completion", description: "Number, alphabet and figural series — find the missing or next term." },
      { code: "lr.analogy", name: "Analogy", description: "Word, number and figural analogy with a common relation." },
      { code: "lr.coding_decoding", name: "Coding-Decoding", description: "Letter-letter, letter-number and substitution coding patterns." },
      { code: "lr.mathematical_operations", name: "Mathematical Operations", description: "Substitute symbols/operators and apply BODMAS to evaluate expressions." },
      { code: "lr.alphabet_test", name: "Alphabet Test", description: "Position of letters, alphabet rearrangement and letter-distance problems." },
      { code: "lr.ranking", name: "Ranking and Order", description: "Linear arrangement and rank from top/bottom problems." },
      { code: "lr.blood_relations", name: "Blood Relations", description: "Family-tree and pointing-style relationship problems." },
      { code: "lr.direction_sense", name: "Direction Sense", description: "Compass-based movement, shortest distance and final direction." },
      { code: "lr.missing_characters", name: "Missing Characters", description: "Find the missing number/letter inside a matrix or pattern." },
      { code: "lr.embedded_figures", name: "Embedded Figures", description: "Identify a smaller figure hidden in a complex figure." },
      { code: "lr.mirror_water_images", name: "Mirror and Water Images", description: "Mirror and water reflection of letters, numbers and figures." },
      { code: "lr.paper_folding_cutting", name: "Paper Folding and Cutting", description: "Predict the appearance of paper after folding, cutting and unfolding." },
      { code: "lr.cubes_dice", name: "Cubes and Dice", description: "Cube colouring, opposite faces, dice and counting cubes problems." },
      { code: "lr.figure_matrix", name: "Figure Matrix and Patterns", description: "3×3 figure matrices and odd-figure-out problems." },
    ],
  },

  // ── SCIENCE ───────────────────────────────────────────────────────────
  {
    code: "SCIENCE",
    name: "Science",
    weight: 1,
    topics: [
      { code: "sci.matter", name: "Matter in Our Surroundings",
        description: "States of matter, change of state, evaporation, latent heat and diffusion.",
        subtopics: [
          { code: "sci.matter.states", name: "States of Matter", description: "Solid, liquid, gas — properties and inter-conversion." },
          { code: "sci.matter.evaporation", name: "Evaporation and Latent Heat", description: "Factors affecting evaporation and latent heat of fusion/vaporization." },
        ],
      },
      { code: "sci.matter_pure", name: "Is Matter Around Us Pure", description: "Mixtures, solutions, suspensions, colloids and methods of separation." },
      { code: "sci.atoms_molecules", name: "Atoms and Molecules", description: "Laws of chemical combination, atomic and molecular masses, mole concept." },
      { code: "sci.structure_atom", name: "Structure of the Atom", description: "Sub-atomic particles, Thomson, Rutherford, Bohr models, isotopes and isobars." },
      { code: "sci.motion", name: "Motion", description: "Distance, displacement, velocity, acceleration and equations of motion." },
      { code: "sci.force_laws", name: "Force and Laws of Motion", description: "Newton's three laws, inertia, momentum and conservation of momentum." },
      { code: "sci.gravitation", name: "Gravitation", description: "Universal law of gravitation, free fall, mass vs weight, thrust and pressure." },
      { code: "sci.work_energy", name: "Work and Energy", description: "Work, kinetic and potential energy, conservation of energy and power." },
      { code: "sci.sound", name: "Sound", description: "Production, propagation, characteristics, reflection of sound and echo." },
      { code: "sci.fundamental_unit_life", name: "The Fundamental Unit of Life", description: "Cell structure, organelles, prokaryotic vs eukaryotic cells." },
      { code: "sci.tissues", name: "Tissues", description: "Plant tissues (meristematic, permanent) and animal tissues (epithelial, connective, muscular, nervous)." },
      { code: "sci.diversity_living", name: "Diversity in Living Organisms", description: "Five-kingdom classification and hierarchy of categories." },
      { code: "sci.fall_ill", name: "Why Do We Fall Ill", description: "Health, disease, infectious vs non-infectious diseases and immunization." },
      { code: "sci.natural_resources", name: "Natural Resources", description: "Air, water, soil, biogeochemical cycles and ozone layer." },
      { code: "sci.food_production", name: "Improvement in Food Resources", description: "Crop production, animal husbandry and sustainable agriculture." },
      { code: "sci.chemical_reactions", name: "Chemical Reactions and Equations (Class 10)", description: "Types of reactions, balancing equations, oxidation and reduction." },
      { code: "sci.acids_bases_salts", name: "Acids, Bases and Salts (Class 10)", description: "pH scale, indicators, properties and important salts." },
      { code: "sci.metals_non_metals", name: "Metals and Non-metals (Class 10)", description: "Physical and chemical properties, reactivity series, corrosion." },
      { code: "sci.life_processes", name: "Life Processes (Class 10)", description: "Nutrition, respiration, transportation and excretion in plants and animals." },
      { code: "sci.electricity", name: "Electricity (Class 10)", description: "Ohm's law, resistance, series/parallel circuits and electric power." },
      { code: "sci.magnetic_effects", name: "Magnetic Effects of Current (Class 10)", description: "Magnetic field, solenoid, electromagnetic induction and AC/DC generator." },
      { code: "sci.light", name: "Light — Reflection and Refraction (Class 10)", description: "Mirrors, lenses, refractive index and lens formula." },
      { code: "sci.environment", name: "Our Environment (Class 10)", description: "Ecosystem, food chains, ozone depletion and waste management." },
    ],
  },

  // ── ACHIEVERS SECTION ─────────────────────────────────────────────────
  {
    code: "ACHIEVERS",
    name: "Achievers Section",
    weight: 1,
    topics: [
      { code: "ach.higher_order_science", name: "Higher Order Science Application", description: "HOTS questions applying concepts from the Science section to novel scenarios." },
      { code: "ach.experimental_skills", name: "Experimental and Lab Skills", description: "Predicting outcomes of experiments and interpreting lab observations." },
      { code: "ach.data_analysis", name: "Data and Graph Analysis", description: "Reading and inferring from tables, charts and scientific graphs." },
      { code: "ach.problem_solving", name: "Problem Solving", description: "Multi-step numerical and conceptual problems blending two or more topics." },
      { code: "ach.real_world_application", name: "Real-World Applications", description: "Contextual questions linking science concepts to everyday phenomena." },
    ],
  },
];

export async function seedSofNsoSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "SOF_NSO" } });
  if (!exam) {
    throw new Error("Run seedExams() first — SOF_NSO exam not found.");
  }
  console.log(`Seeding SOF NSO syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < sofNsoSyllabus.length; sIdx++) {
    const s = sofNsoSyllabus[sIdx];
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
  seedSofNsoSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
