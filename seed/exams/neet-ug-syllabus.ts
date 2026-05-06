// NEET UG — full syllabus tree.
// 200 questions in 200 minutes (180 to attempt, optional Q's per section).
// Three subjects: Physics (50/45 attempted), Chemistry (50/45), Biology (100/90).
// Marks: +4 correct, −1 wrong. Languages: 13.
//
// Aligned with the NTA NEET UG syllabus (Class 11 + Class 12 NCERT).
// Run after seedExams: npx tsx seed/exams/neet-ug-syllabus.ts

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

export const neetUgSyllabus: SubjectSeed[] = [
  // ── PHYSICS (Class 11 + 12) ──────────────────────────────────────────
  {
    code: "PHYSICS",
    name: "Physics",
    weight: 0.25,
    topics: [
      { code: "neet.phy.measurement", name: "Physical World and Measurement", description: "Units, dimensions, errors and measurement." },
      { code: "neet.phy.kinematics", name: "Kinematics", description: "Motion in a straight line and in a plane; projectile motion; relative velocity." },
      { code: "neet.phy.laws_motion", name: "Laws of Motion", description: "Newton's laws, friction, circular motion." },
      { code: "neet.phy.work_energy", name: "Work, Energy and Power", description: "Work-energy theorem, conservative forces, collisions." },
      { code: "neet.phy.rotational", name: "Motion of System of Particles and Rigid Body", description: "Centre of mass, moment of inertia, torque, rotational dynamics." },
      { code: "neet.phy.gravitation", name: "Gravitation", description: "Newton's law of gravitation, Kepler's laws, gravitational potential and energy, escape velocity." },
      { code: "neet.phy.solids_fluids", name: "Properties of Bulk Matter", description: "Elasticity, fluid mechanics, surface tension, viscosity, thermal expansion." },
      { code: "neet.phy.thermodynamics", name: "Thermodynamics", description: "Zeroth, first and second laws of thermodynamics; thermodynamic processes; Carnot engine." },
      { code: "neet.phy.kinetic_theory", name: "Behaviour of Perfect Gases and Kinetic Theory", description: "Ideal gas equation, kinetic theory of gases, RMS speed, degrees of freedom." },
      { code: "neet.phy.oscillations", name: "Oscillations", description: "Simple harmonic motion, energy in SHM, simple pendulum, damped and forced oscillations." },
      { code: "neet.phy.waves", name: "Waves", description: "Wave motion, transverse and longitudinal waves, superposition, Doppler effect." },
      { code: "neet.phy.electrostatics", name: "Electrostatics", description: "Coulomb's law, electric field and potential, capacitors, dielectrics." },
      { code: "neet.phy.current", name: "Current Electricity", description: "Ohm's law, drift velocity, Kirchhoff's laws, Wheatstone bridge, potentiometer." },
      { code: "neet.phy.magnetism", name: "Magnetic Effects of Current and Magnetism", description: "Biot-Savart law, Ampère's law, magnetic dipole, Earth's magnetism." },
      { code: "neet.phy.induction", name: "Electromagnetic Induction and Alternating Currents", description: "Faraday's law, Lenz's law, self/mutual inductance, AC circuits, LC resonance, transformer." },
      { code: "neet.phy.em_waves", name: "Electromagnetic Waves", description: "Maxwell's equations, EM spectrum, properties of EM waves." },
      { code: "neet.phy.optics", name: "Optics",
        description: "Ray and wave optics — reflection, refraction, lens/mirror formulae, interference, diffraction, polarization.",
        subtopics: [
          { code: "neet.phy.optics.ray", name: "Ray Optics" },
          { code: "neet.phy.optics.wave", name: "Wave Optics" },
        ],
      },
      { code: "neet.phy.dual_nature", name: "Dual Nature of Matter and Radiation", description: "Photoelectric effect, de Broglie hypothesis, Davisson-Germer experiment." },
      { code: "neet.phy.atoms_nuclei", name: "Atoms and Nuclei", description: "Bohr's model, hydrogen spectrum, nuclear binding energy, radioactivity, fission, fusion." },
      { code: "neet.phy.semiconductors", name: "Electronic Devices", description: "Semiconductors, p-n junction, diodes, transistors, logic gates basics." },
    ],
  },

  // ── CHEMISTRY (Class 11 + 12) ────────────────────────────────────────
  {
    code: "CHEMISTRY",
    name: "Chemistry",
    weight: 0.25,
    topics: [
      // Physical Chemistry
      { code: "neet.chem.basic_concepts", name: "Some Basic Concepts of Chemistry", description: "Mole concept, stoichiometry, empirical and molecular formulae." },
      { code: "neet.chem.atomic_structure", name: "Structure of Atom", description: "Quantum numbers, electron configuration, Aufbau, Hund, Pauli." },
      { code: "neet.chem.classification", name: "Classification of Elements and Periodicity", description: "Periodic table, periodic trends." },
      { code: "neet.chem.bonding", name: "Chemical Bonding and Molecular Structure", description: "Ionic, covalent, hydrogen bonding, VSEPR, hybridisation, MO theory basics." },
      { code: "neet.chem.states", name: "States of Matter — Gases and Liquids", description: "Gas laws, ideal gas, liquefaction, intermolecular forces." },
      { code: "neet.chem.thermo", name: "Thermodynamics (Chemical)", description: "First law, enthalpy, entropy, Gibbs free energy, spontaneity." },
      { code: "neet.chem.equilibrium", name: "Equilibrium", description: "Chemical equilibrium, Kc and Kp, ionic equilibrium, pH, buffer solutions." },
      { code: "neet.chem.redox", name: "Redox Reactions", description: "Oxidation states, balancing redox equations, electrochemistry basics." },
      { code: "neet.chem.solutions", name: "Solutions", description: "Concentration, colligative properties, Raoult's law, abnormal molecular mass." },
      { code: "neet.chem.electrochem", name: "Electrochemistry", description: "EMF, Nernst equation, galvanic cells, conductance, Faraday's laws." },
      { code: "neet.chem.kinetics", name: "Chemical Kinetics", description: "Rate laws, order and molecularity, Arrhenius equation, half-life." },
      { code: "neet.chem.surface", name: "Surface Chemistry", description: "Adsorption, catalysis, colloids, emulsions." },
      // Inorganic Chemistry
      { code: "neet.chem.h_s_block", name: "Hydrogen and s-Block Elements", description: "Properties of hydrogen, alkali and alkaline earth metals." },
      { code: "neet.chem.p_block", name: "p-Block Elements", description: "Group 13–18 elements, anomalous behaviour, oxides, halides." },
      { code: "neet.chem.d_f_block", name: "d- and f-Block Elements", description: "Transition metals, lanthanoids, actinoids, oxidation states, complexes." },
      { code: "neet.chem.coordination", name: "Coordination Compounds", description: "Werner's theory, IUPAC nomenclature, isomerism, CFT, magnetic and colour properties." },
      { code: "neet.chem.metallurgy", name: "General Principles and Processes of Isolation of Elements", description: "Concentration, reduction, refining of metals; thermodynamic and electrochemical principles." },
      // Organic Chemistry
      { code: "neet.chem.organic_basics", name: "Organic Chemistry — Some Basic Principles and Techniques", description: "IUPAC nomenclature, isomerism, reaction mechanisms, electrophilic and nucleophilic reactions." },
      { code: "neet.chem.hydrocarbons", name: "Hydrocarbons", description: "Alkanes, alkenes, alkynes, aromatic; reactions and mechanisms." },
      { code: "neet.chem.haloalkanes", name: "Haloalkanes and Haloarenes", description: "SN1/SN2 reactions, elimination, environmental effects." },
      { code: "neet.chem.alcohols_phenols", name: "Alcohols, Phenols and Ethers", description: "Preparation, reactions, acidity, IUPAC nomenclature." },
      { code: "neet.chem.aldehydes_acids", name: "Aldehydes, Ketones and Carboxylic Acids", description: "Nucleophilic addition, reduction, oxidation, derivatives." },
      { code: "neet.chem.amines", name: "Organic Compounds Containing Nitrogen", description: "Amines, diazonium salts, cyanides, isocyanides." },
      { code: "neet.chem.biomolecules", name: "Biomolecules", description: "Carbohydrates, proteins, vitamins, hormones, nucleic acids." },
      { code: "neet.chem.polymers", name: "Polymers", description: "Classification, polymerisation, biodegradable polymers." },
      { code: "neet.chem.everyday", name: "Chemistry in Everyday Life", description: "Drugs, cosmetics, soaps and detergents, food additives." },
      { code: "neet.chem.environmental", name: "Environmental Chemistry", description: "Air, water, soil pollution; greenhouse effect; ozone depletion." },
      { code: "neet.chem.salt_analysis", name: "Salt Analysis (Practical)", description: "Identification of cations and anions; group analysis." },
    ],
  },

  // ── BIOLOGY (Class 11 + 12) ──────────────────────────────────────────
  {
    code: "BIOLOGY",
    name: "Biology",
    weight: 0.50, // 100 of 200 Qs
    topics: [
      // Class 11 — Diversity in Living World
      { code: "neet.bio.diversity", name: "Diversity in Living World", description: "Taxonomy, classification systems, five-kingdom system, plant and animal kingdoms." },
      { code: "neet.bio.plant_kingdom", name: "Plant Kingdom", description: "Algae, bryophytes, pteridophytes, gymnosperms, angiosperms — life cycles." },
      { code: "neet.bio.animal_kingdom", name: "Animal Kingdom", description: "Classification of phyla up to class level with examples and characteristic features." },
      // Structural Organisation
      { code: "neet.bio.morphology", name: "Morphology of Flowering Plants", description: "Root, stem, leaf, flower, fruit, seed; floral diagrams and formulae." },
      { code: "neet.bio.anatomy_plant", name: "Anatomy of Flowering Plants", description: "Tissues, tissue systems, secondary growth in dicot stem and root." },
      { code: "neet.bio.animal_tissue", name: "Structural Organisation in Animals", description: "Animal tissues; morphology and anatomy of cockroach, frog, earthworm." },
      // Cell
      { code: "neet.bio.cell", name: "Cell — The Unit of Life", description: "Cell theory, prokaryotes vs eukaryotes, organelles, cell membrane." },
      { code: "neet.bio.biomolecules", name: "Biomolecules", description: "Carbohydrates, proteins, lipids, nucleic acids, enzymes, metabolism." },
      { code: "neet.bio.cell_cycle", name: "Cell Cycle and Cell Division", description: "Mitosis, meiosis, cell-cycle regulation." },
      // Plant Physiology
      { code: "neet.bio.transport_plant", name: "Transport in Plants", description: "Means of transport, water and mineral absorption, transpiration, translocation." },
      { code: "neet.bio.mineral", name: "Mineral Nutrition", description: "Essential elements, deficiency symptoms, nitrogen metabolism." },
      { code: "neet.bio.photosynthesis", name: "Photosynthesis in Higher Plants", description: "Light and dark reactions, C3/C4 pathways, Calvin cycle, photorespiration." },
      { code: "neet.bio.respiration_plant", name: "Respiration in Plants", description: "Glycolysis, Krebs cycle, ETC, fermentation, RQ." },
      { code: "neet.bio.growth", name: "Plant Growth and Development", description: "Phytohormones, photoperiodism, vernalisation." },
      // Human Physiology
      { code: "neet.bio.digestion", name: "Digestion and Absorption", description: "Human digestive system, digestion of macromolecules, absorption mechanisms, disorders." },
      { code: "neet.bio.breathing", name: "Breathing and Exchange of Gases", description: "Respiratory system, mechanism of breathing, gas exchange, transport of gases, disorders." },
      { code: "neet.bio.body_fluids", name: "Body Fluids and Circulation", description: "Blood composition, heart, cardiac cycle, ECG, double circulation, disorders." },
      { code: "neet.bio.excretion", name: "Excretory Products and their Elimination", description: "Modes of excretion, human kidney, urine formation, regulation, disorders." },
      { code: "neet.bio.locomotion", name: "Locomotion and Movement", description: "Types of movement, skeletal muscle, joints, disorders." },
      { code: "neet.bio.neural", name: "Neural Control and Coordination", description: "Neuron, nerve impulse, central and peripheral nervous systems, reflex arc." },
      { code: "neet.bio.endocrine", name: "Chemical Coordination and Integration", description: "Endocrine glands, hormones and their actions, disorders." },
      // Class 12 — Reproduction
      { code: "neet.bio.repro_org", name: "Reproduction in Organisms", description: "Asexual and sexual reproduction, life span, ageing." },
      { code: "neet.bio.flower_repro", name: "Sexual Reproduction in Flowering Plants", description: "Microsporogenesis, megasporogenesis, pollination, fertilisation, seed formation." },
      { code: "neet.bio.human_repro", name: "Human Reproduction", description: "Male and female reproductive systems, gametogenesis, menstrual cycle, pregnancy, lactation." },
      { code: "neet.bio.repro_health", name: "Reproductive Health", description: "Birth control, MTP, STIs, infertility, ART." },
      // Genetics & Evolution
      { code: "neet.bio.heredity", name: "Principles of Inheritance and Variation", description: "Mendelian genetics, sex-linked inheritance, mutations, pedigree analysis, genetic disorders." },
      { code: "neet.bio.dna_rna", name: "Molecular Basis of Inheritance", description: "DNA structure, replication, transcription, translation, regulation of gene expression, human genome." },
      { code: "neet.bio.evolution", name: "Evolution", description: "Theories of evolution, evidences, Hardy-Weinberg principle, human evolution." },
      // Biology in Human Welfare
      { code: "neet.bio.health_disease", name: "Human Health and Disease", description: "Pathogens, immunity, AIDS, cancer, drug abuse." },
      { code: "neet.bio.food_production", name: "Strategies for Enhancement in Food Production", description: "Plant breeding, tissue culture, animal husbandry, microbes in food production." },
      { code: "neet.bio.microbes", name: "Microbes in Human Welfare", description: "Microbes in industrial products, sewage treatment, biogas, biocontrol." },
      // Biotechnology
      { code: "neet.bio.biotech_principles", name: "Biotechnology — Principles and Processes", description: "Recombinant DNA technology, tools, processes." },
      { code: "neet.bio.biotech_applications", name: "Biotechnology and its Applications", description: "Biotechnology in agriculture, medicine, transgenic organisms, ethical issues." },
      // Ecology
      { code: "neet.bio.organism_pop", name: "Organisms and Populations", description: "Organism and environment, population attributes, growth, interactions." },
      { code: "neet.bio.ecosystem", name: "Ecosystem", description: "Structure and function, energy flow, nutrient cycling, productivity, ecological pyramids." },
      { code: "neet.bio.biodiversity", name: "Biodiversity and Conservation", description: "Patterns, importance, loss, conservation strategies, hotspots, IUCN categories." },
      { code: "neet.bio.environment", name: "Environmental Issues", description: "Pollution, deforestation, global warming, ozone depletion, e-waste." },
    ],
  },
];

export async function seedNeetUgSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "NEET_UG" } });
  if (!exam) {
    throw new Error("Run seedExams() first — NEET_UG exam not found.");
  }
  console.log(`Seeding NEET UG syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < neetUgSyllabus.length; sIdx++) {
    const s = neetUgSyllabus[sIdx];
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
  seedNeetUgSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
