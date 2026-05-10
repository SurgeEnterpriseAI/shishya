// Silverzone International Olympiad of Science (iOS) — Class 9-10 syllabus.
// Source: silverzone.org/Science-Olympiad and Silverzone iOS sample papers (Class 9/10).
// 50 questions × 60 minutes (Class 9-12). Integrated PCB.
//
// Run after seedExams: npx tsx seed/exams/szf-ios-syllabus.ts

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

export const szfIosSyllabus: SubjectSeed[] = [
  // ── PHYSICS ───────────────────────────────────────────────────────────
  {
    code: "PHYSICS",
    name: "Physics",
    weight: 0.25,
    topics: [
      { code: "sci.phys.motion", name: "Motion", description: "Distance, displacement, velocity, acceleration, equations of motion, graphs." },
      { code: "sci.phys.force_laws", name: "Force and Laws of Motion", description: "Newton's three laws, inertia, momentum, conservation of momentum." },
      { code: "sci.phys.gravitation", name: "Gravitation", description: "Universal law, free fall, mass vs weight, thrust and pressure, buoyancy." },
      { code: "sci.phys.work_energy", name: "Work, Energy and Power", description: "Work done by force, kinetic and potential energy, conservation, power." },
      { code: "sci.phys.sound", name: "Sound", description: "Production, propagation, reflection, echo, ultrasound, range of hearing." },
      { code: "sci.phys.light", name: "Light — Reflection and Refraction", description: "Spherical mirrors, mirror formula, refraction laws, lenses, lens formula, magnification." },
      { code: "sci.phys.human_eye", name: "Human Eye and Colourful World", description: "Eye structure, defects of vision, refraction through prism, dispersion, scattering." },
      { code: "sci.phys.electricity", name: "Electricity", description: "Electric current, Ohm's law, resistance, series/parallel circuits, heating effect, power." },
      { code: "sci.phys.magnetism", name: "Magnetic Effects of Current", description: "Magnetic field, Oersted experiment, solenoid, electromagnetic induction, AC vs DC." },
      { code: "sci.phys.energy_sources", name: "Sources of Energy", description: "Conventional and non-conventional sources, solar, wind, nuclear, biomass." },
    ],
  },

  // ── CHEMISTRY ─────────────────────────────────────────────────────────
  {
    code: "CHEMISTRY",
    name: "Chemistry",
    weight: 0.25,
    topics: [
      { code: "sci.chem.matter", name: "Matter in Our Surroundings", description: "States of matter, change of state, evaporation, latent heat, diffusion." },
      { code: "sci.chem.matter_pure", name: "Is Matter Around Us Pure?", description: "Mixtures, solutions, suspensions, colloids, separation techniques." },
      { code: "sci.chem.atoms_molecules", name: "Atoms and Molecules", description: "Laws of chemical combination, atomic/molecular mass, mole concept." },
      { code: "sci.chem.atomic_structure", name: "Structure of the Atom", description: "Thomson, Rutherford, Bohr models, electron configuration, valency, isotopes." },
      { code: "sci.chem.reactions", name: "Chemical Reactions and Equations", description: "Balancing equations, types — combination, decomposition, displacement, redox." },
      { code: "sci.chem.acids_bases", name: "Acids, Bases and Salts", description: "pH, indicators, neutralisation, common salts, properties and uses." },
      { code: "sci.chem.metals_nonmetals", name: "Metals and Non-Metals", description: "Physical/chemical properties, reactivity series, extraction, corrosion, alloys." },
      { code: "sci.chem.carbon", name: "Carbon and its Compounds", description: "Covalent bonding, allotropes, hydrocarbons, functional groups, soap and detergents." },
      { code: "sci.chem.periodic", name: "Periodic Classification", description: "Mendeleev's table, modern periodic law, periodic trends in groups and periods." },
    ],
  },

  // ── BIOLOGY ───────────────────────────────────────────────────────────
  {
    code: "BIOLOGY",
    name: "Biology",
    weight: 0.25,
    topics: [
      { code: "sci.bio.cell", name: "Cell — Fundamental Unit of Life", description: "Cell structure, prokaryotic vs eukaryotic, organelles and their functions." },
      { code: "sci.bio.tissues", name: "Tissues", description: "Plant tissues — meristematic and permanent; animal tissues — epithelial, connective, muscular, nervous." },
      { code: "sci.bio.diversity", name: "Diversity in Living Organisms", description: "Five-kingdom classification, hierarchy, characteristics of major groups." },
      { code: "sci.bio.health", name: "Why Do We Fall Ill", description: "Health vs disease, infectious/non-infectious diseases, immunisation." },
      { code: "sci.bio.natural_resources", name: "Natural Resources", description: "Air, water, soil, biogeochemical cycles, pollution and conservation." },
      { code: "sci.bio.food_resources", name: "Improvement in Food Resources", description: "Crop production, animal husbandry, plant breeding, sustainable agriculture." },
      { code: "sci.bio.life_processes", name: "Life Processes", description: "Nutrition, respiration, transportation, excretion in plants and animals." },
      { code: "sci.bio.control_coordination", name: "Control and Coordination", description: "Nervous system, reflex action, hormones in animals and plants." },
      { code: "sci.bio.reproduction", name: "How Do Organisms Reproduce", description: "Asexual and sexual reproduction, reproductive health, contraception." },
      { code: "sci.bio.heredity_evolution", name: "Heredity and Evolution", description: "Mendel's laws, sex determination, evolution, fossils, speciation." },
      { code: "sci.bio.environment", name: "Our Environment", description: "Ecosystem, food chains/webs, ozone depletion, waste management." },
    ],
  },

  // ── REASONING & APTITUDE ──────────────────────────────────────────────
  {
    code: "REASONING",
    name: "Reasoning and Aptitude",
    weight: 0.15,
    topics: [
      { code: "reason.verbal", name: "Verbal Reasoning", description: "Series, analogy, coding-decoding, classification with science context." },
      { code: "reason.non_verbal", name: "Non-Verbal Reasoning", description: "Figure series, mirror images, embedded figures, pattern completion." },
      { code: "reason.scientific", name: "Scientific Reasoning", description: "Experiment-based reasoning, cause-effect, hypothesis testing in PCB contexts." },
      { code: "reason.data_chart", name: "Data and Chart Interpretation", description: "Reading scientific tables, graphs, periodic trends and biological data." },
    ],
  },

  // ── ACHIEVERS ─────────────────────────────────────────────────────────
  {
    code: "ACHIEVERS",
    name: "Achievers Section",
    weight: 0.1,
    topics: [
      { code: "ach.hots", name: "Higher Order Thinking", description: "Multi-step PCB application questions integrating two or more chapters." },
      { code: "ach.experimental", name: "Experimental and Lab-based", description: "Apparatus identification, observation interpretation, lab procedure questions." },
      { code: "ach.contemporary", name: "Contemporary Science", description: "Current science news — space missions, vaccines, materials, climate." },
    ],
  },
];

export async function seedSzfIosSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "SZF_IOS" } });
  if (!exam) {
    throw new Error("Run seedExams() first — SZF_IOS exam not found.");
  }
  console.log(`Seeding SZF iOS syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < szfIosSyllabus.length; sIdx++) {
    const s = szfIosSyllabus[sIdx];
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
  seedSzfIosSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
