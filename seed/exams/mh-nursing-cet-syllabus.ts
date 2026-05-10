// MH B.Sc Nursing CET — full syllabus tree.
// Conducting body: Maharashtra State CET Cell, Mumbai (cetcell.mahacet.org).
// Pattern: 100 MCQs (some years 200) covering Physics, Chemistry, Biology, English, Nursing Aptitude.
// Class 11 + 12 NCERT / Maharashtra HSC Board level. No negative marking.
//
// Run after seedExams: npx tsx seed/exams/mh-nursing-cet-syllabus.ts

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

export const mhNursingCetSyllabus: SubjectSeed[] = [
  // ── PHYSICS ──────────────────────────────────────────────────────────
  {
    code: "PHYSICS",
    name: "Physics",
    weight: 1,
    topics: [
      { code: "phy.measurement", name: "Units and Measurement", description: "SI units, dimensional analysis, errors and significant figures." },
      { code: "phy.kinematics", name: "Motion in a Straight Line and Plane", description: "1-D and 2-D kinematics, projectile motion, relative velocity." },
      { code: "phy.laws_motion", name: "Laws of Motion", description: "Newton's laws, friction, free-body diagrams." },
      { code: "phy.work_energy_power", name: "Work, Energy and Power", description: "Work-energy theorem, conservative forces, collisions." },
      { code: "phy.gravitation", name: "Gravitation", description: "Universal law, escape velocity, Kepler's laws." },
      { code: "phy.thermodynamics", name: "Thermodynamics", description: "Laws of thermodynamics, isothermal and adiabatic processes, heat engines." },
      { code: "phy.oscillations", name: "Oscillations", description: "SHM, energy in SHM, simple pendulum." },
      { code: "phy.waves", name: "Waves", description: "Wave equation, superposition, beats, Doppler effect." },
      { code: "phy.electrostatics", name: "Electrostatics", description: "Coulomb's law, electric field and potential, Gauss's law, capacitance." },
      { code: "phy.current_electricity", name: "Current Electricity", description: "Ohm's law, Kirchhoff's laws, drift velocity, Wheatstone bridge." },
      { code: "phy.magnetic_effects", name: "Magnetic Effects and Magnetism", description: "Biot-Savart law, Ampere's law, force on conductor, magnetic materials." },
      { code: "phy.emi_ac", name: "Electromagnetic Induction and Alternating Current", description: "Faraday's law, Lenz's law, AC circuits, transformer." },
      { code: "phy.optics", name: "Ray and Wave Optics", description: "Reflection, refraction, lenses, interference, diffraction, polarization." },
      { code: "phy.modern_physics", name: "Dual Nature, Atoms and Nuclei", description: "Photoelectric effect, Bohr model, radioactivity, fission, fusion." },
      { code: "phy.electronic_devices", name: "Electronic Devices", description: "Semiconductors, p-n junction, diodes, transistors, logic gates." },
    ],
  },

  // ── CHEMISTRY ────────────────────────────────────────────────────────
  {
    code: "CHEMISTRY",
    name: "Chemistry",
    weight: 1,
    topics: [
      { code: "chem.basic_concepts", name: "Some Basic Concepts of Chemistry", description: "Mole concept, stoichiometry, empirical formula, limiting reagent." },
      { code: "chem.atomic_structure", name: "Structure of Atom", description: "Bohr model, quantum numbers, orbital shapes, electronic configuration." },
      { code: "chem.periodic_table", name: "Classification of Elements", description: "Modern periodic law, periodic trends." },
      { code: "chem.bonding", name: "Chemical Bonding and Molecular Structure", description: "Ionic, covalent, VSEPR, hybridisation, MOT basics." },
      { code: "chem.states_matter", name: "States of Matter", description: "Gas laws, kinetic theory, real vs ideal gas, liquid state." },
      { code: "chem.thermodynamics", name: "Chemical Thermodynamics", description: "First law, enthalpy, entropy, Gibbs free energy, spontaneity." },
      { code: "chem.equilibrium", name: "Equilibrium", description: "Chemical and ionic equilibrium, Le Chatelier's principle, pH, buffers." },
      { code: "chem.redox", name: "Redox Reactions", description: "Oxidation states, balancing redox equations, electrochemistry basics." },
      { code: "chem.solutions", name: "Solutions", description: "Concentration units, Raoult's law, colligative properties." },
      { code: "chem.organic_basics", name: "Basic Principles of Organic Chemistry", description: "IUPAC nomenclature, isomerism, electron displacement effects, reaction mechanisms." },
      { code: "chem.hydrocarbons", name: "Hydrocarbons", description: "Alkanes, alkenes, alkynes, aromatic hydrocarbons." },
      { code: "chem.haloalkanes", name: "Haloalkanes and Haloarenes", description: "Nomenclature, SN1/SN2 mechanisms, elimination reactions." },
      { code: "chem.alcohols", name: "Alcohols, Phenols and Ethers", description: "Preparation, properties, reactions." },
      { code: "chem.aldehydes_ketones", name: "Aldehydes, Ketones and Carboxylic Acids", description: "Nucleophilic addition, oxidation, aldol and Cannizzaro reactions." },
      { code: "chem.biomolecules", name: "Biomolecules", description: "Carbohydrates, proteins, enzymes, vitamins, nucleic acids." },
      { code: "chem.everyday_chem", name: "Chemistry in Everyday Life", description: "Drugs, antiseptics, antibiotics, soaps, food additives." },
    ],
  },

  // ── BIOLOGY ──────────────────────────────────────────────────────────
  {
    code: "BIOLOGY",
    name: "Biology",
    weight: 1,
    topics: [
      { code: "bio.diversity", name: "Diversity in Living Organisms", description: "Taxonomy, five-kingdom classification, plant and animal kingdoms." },
      { code: "bio.cell_structure", name: "Cell Structure and Function", description: "Cell theory, prokaryotes vs eukaryotes, organelles, cell division." },
      { code: "bio.biomolecules", name: "Biomolecules", description: "Carbohydrates, proteins, lipids, nucleic acids, enzymes." },
      { code: "bio.plant_physiology", name: "Plant Physiology", description: "Photosynthesis, respiration, transpiration, plant hormones, growth." },
      { code: "bio.human_digestion", name: "Digestion and Absorption", description: "Human digestive system, digestion of macronutrients, absorption." },
      { code: "bio.human_respiration", name: "Breathing and Exchange of Gases", description: "Respiratory system, mechanism of breathing, gas transport." },
      { code: "bio.body_fluids", name: "Body Fluids and Circulation", description: "Blood, heart structure, cardiac cycle, blood pressure, lymphatic system." },
      { code: "bio.excretion", name: "Excretory Products and their Elimination", description: "Nephron structure, urine formation, dialysis, regulation." },
      { code: "bio.locomotion", name: "Locomotion and Movement", description: "Skeletal and muscular systems, joints, movement disorders." },
      { code: "bio.neural_control", name: "Neural Control and Coordination", description: "Nervous system, reflex, brain structure, sense organs." },
      { code: "bio.endocrine", name: "Chemical Coordination — Endocrine System", description: "Endocrine glands, hormones, hormonal disorders." },
      { code: "bio.reproduction", name: "Reproduction in Organisms and Humans", description: "Reproductive systems, gametogenesis, menstrual cycle, pregnancy." },
      { code: "bio.reproductive_health", name: "Reproductive Health", description: "Contraception, STDs, infertility, ART, MTP." },
      { code: "bio.genetics", name: "Genetics and Inheritance", description: "Mendel's laws, sex determination, mutation, pedigree analysis." },
      { code: "bio.molecular_biology", name: "Molecular Basis of Inheritance", description: "DNA structure, replication, transcription, translation, genetic code." },
      { code: "bio.evolution", name: "Evolution", description: "Theories, evidence, mechanisms, speciation, human evolution." },
      { code: "bio.health_disease", name: "Human Health and Disease", description: "Pathogens, immunity, AIDS, cancer, drug abuse, vaccines." },
      { code: "bio.biotechnology", name: "Biotechnology — Principles and Applications", description: "Genetic engineering, recombinant DNA, transgenic organisms, gene therapy." },
      { code: "bio.ecology", name: "Ecology and Environment", description: "Ecosystems, biogeochemical cycles, biodiversity, pollution, conservation." },
    ],
  },
];

export async function seedMhNursingCetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "MH_NURSING_CET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — MH_NURSING_CET exam not found.");
  }
  console.log(`Seeding MH Nursing CET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < mhNursingCetSyllabus.length; sIdx++) {
    const s = mhNursingCetSyllabus[sIdx];
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
  console.log(`Seeded MH Nursing CET syllabus. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedMhNursingCetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
