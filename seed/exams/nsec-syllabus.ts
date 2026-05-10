// NSEC (National Standard Examination in Chemistry) — full syllabus tree.
// Stage-1 Chemistry Olympiad. 80 MCQs, 3 hours.
// Scope: Class 11+12 NCERT chemistry + olympiad-style problem solving across physical, inorganic, organic.
// Source: HBCSE olympiads.hbcse.tifr.res.in/how-to-prepare/syllabus/ + IAPT NSEC brochure.
//
// Run after seedExams: npx tsx seed/exams/nsec-syllabus.ts

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

export const nsecSyllabus: SubjectSeed[] = [
  {
    code: "CHEMISTRY",
    name: "Chemistry",
    weight: 1,
    topics: [
      // ── PHYSICAL CHEMISTRY ─────────────────────────────────────────────
      { code: "chem.basic_concepts", name: "Some Basic Concepts of Chemistry",
        description: "Mole concept, stoichiometry, empirical and molecular formulas, concentration units." },
      { code: "chem.atomic_structure", name: "Structure of Atom",
        description: "Bohr model, quantum numbers, orbitals, electronic configuration and Aufbau principle.",
        subtopics: [
          { code: "chem.atomic_structure.quantum", name: "Quantum Mechanical Model", description: "Wave-particle duality, Schrodinger equation qualitative and orbital shapes." },
          { code: "chem.atomic_structure.config", name: "Electronic Configurations", description: "Aufbau, Pauli exclusion, Hund's rule and exceptional configurations." },
        ],
      },
      { code: "chem.periodicity", name: "Classification of Elements and Periodicity",
        description: "Modern periodic table, periodic trends in radii, ionisation enthalpy, electron gain enthalpy and electronegativity." },
      { code: "chem.bonding", name: "Chemical Bonding and Molecular Structure",
        description: "Ionic, covalent, coordinate bonding; VSEPR; valence bond and molecular orbital theories; hybridisation." },
      { code: "chem.states_matter", name: "States of Matter",
        description: "Ideal/real gases, kinetic theory, liquefaction; liquid-state properties; solid-state classification, lattices and unit cells.",
        subtopics: [
          { code: "chem.states_matter.gases", name: "Gases", description: "Gas laws, ideal gas equation, Dalton's and Graham's laws, real gases and van der Waals equation." },
          { code: "chem.states_matter.solids", name: "Solid State", description: "Crystal lattices, packing efficiency, unit cells and defects in solids." },
        ],
      },
      { code: "chem.thermodynamics", name: "Chemical Thermodynamics",
        description: "First law, enthalpy, Hess's law, entropy, Gibbs energy and spontaneity criteria." },
      { code: "chem.equilibrium", name: "Equilibrium",
        description: "Chemical equilibrium, Kc/Kp, Le Chatelier's principle, ionic equilibria, pH, buffers, solubility product." },
      { code: "chem.solutions", name: "Solutions",
        description: "Concentration, Raoult's law, ideal/non-ideal solutions, colligative properties and van't Hoff factor." },
      { code: "chem.electrochemistry", name: "Electrochemistry",
        description: "Galvanic cells, EMF, Nernst equation, conductance, Kohlrausch's law, electrolysis and batteries." },
      { code: "chem.kinetics", name: "Chemical Kinetics",
        description: "Rate laws, order, molecularity, Arrhenius equation, integrated rate equations and collision theory." },
      { code: "chem.surface", name: "Surface Chemistry",
        description: "Adsorption, catalysis, colloids, emulsions and Tyndall effect." },

      // ── INORGANIC CHEMISTRY ────────────────────────────────────────────
      { code: "chem.s_block", name: "s-Block Elements",
        description: "Group 1 and 2 — alkali and alkaline-earth metal trends, anomalous behaviour and important compounds." },
      { code: "chem.p_block", name: "p-Block Elements",
        description: "Groups 13-18 — periodic trends, important compounds, allotropy, oxoacids and noble gases.",
        subtopics: [
          { code: "chem.p_block.13_14", name: "Groups 13 and 14", description: "Boron, aluminium, carbon and silicon — borax, alums, silicates and carbon allotropes." },
          { code: "chem.p_block.15_16", name: "Groups 15 and 16", description: "Nitrogen and oxygen families — oxoacids, ammonia, nitric acid, sulphuric acid, ozone." },
          { code: "chem.p_block.17_18", name: "Groups 17 and 18", description: "Halogens and noble gases — interhalogens, oxoacids of halogens, xenon compounds." },
        ],
      },
      { code: "chem.d_f_block", name: "d- and f-Block Elements",
        description: "Transition metals, variable oxidation states, magnetic and catalytic properties; lanthanoids and actinoids." },
      { code: "chem.coordination", name: "Coordination Compounds",
        description: "Werner theory, ligands, nomenclature, isomerism, CFT and applications including chelation." },
      { code: "chem.element_isolation", name: "General Principles of Isolation of Elements",
        description: "Metallurgical principles — concentration, reduction, refining and thermodynamics of extraction." },

      // ── ORGANIC CHEMISTRY ──────────────────────────────────────────────
      { code: "chem.organic_basics", name: "Organic Chemistry — Basic Principles",
        description: "IUPAC nomenclature, isomerism, reaction mechanisms, electron displacement effects and reactive intermediates.",
        subtopics: [
          { code: "chem.organic_basics.nomenclature", name: "IUPAC Nomenclature", description: "Naming hydrocarbons and functional-group compounds per IUPAC rules." },
          { code: "chem.organic_basics.isomerism", name: "Isomerism", description: "Structural, geometric, optical isomerism and stereochemistry basics." },
          { code: "chem.organic_basics.mechanisms", name: "Reaction Mechanisms", description: "SN1/SN2, E1/E2, electrophilic and nucleophilic addition/substitution." },
        ],
      },
      { code: "chem.hydrocarbons", name: "Hydrocarbons",
        description: "Alkanes, alkenes, alkynes and aromatic hydrocarbons — preparation, properties and reactions." },
      { code: "chem.haloalkanes", name: "Haloalkanes and Haloarenes",
        description: "Nomenclature, preparation, nucleophilic substitution and elimination of alkyl/aryl halides." },
      { code: "chem.alcohols_phenols_ethers", name: "Alcohols, Phenols and Ethers",
        description: "Preparation, physical and chemical properties; acidity of phenols; Williamson ether synthesis." },
      { code: "chem.aldehydes_ketones_acids", name: "Aldehydes, Ketones and Carboxylic Acids",
        description: "Carbonyl chemistry, named reactions (Aldol, Cannizzaro, Clemmensen) and acid derivatives." },
      { code: "chem.amines", name: "Organic Compounds Containing Nitrogen",
        description: "Amines, diazonium salts, cyanides/isocyanides, nitro compounds — preparation and reactions." },
      { code: "chem.biomolecules", name: "Biomolecules",
        description: "Carbohydrates, proteins, amino acids, nucleic acids, enzymes and vitamins at NCERT level." },
      { code: "chem.polymers", name: "Polymers",
        description: "Classification, addition and condensation polymers, copolymers and biodegradable polymers." },
      { code: "chem.everyday", name: "Chemistry in Everyday Life",
        description: "Drugs, cleansing agents, food additives — chemical aspects at NCERT level." },
      { code: "chem.environmental", name: "Environmental Chemistry",
        description: "Atmospheric, water and soil pollution; greenhouse effect; ozone layer; green chemistry." },

      // ── OLYMPIAD-STYLE EXTENSION ───────────────────────────────────────
      { code: "chem.problem_solving", name: "Olympiad-style Problem Solving",
        description: "Multi-concept numerical problems and analytical reasoning typical of NSEC question style." },
    ],
  },
];

export async function seedNsecSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "NSEC" } });
  if (!exam) {
    throw new Error("Run seedExams() first — NSEC exam not found.");
  }
  console.log(`Seeding NSEC syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < nsecSyllabus.length; sIdx++) {
    const s = nsecSyllabus[sIdx];
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
  seedNsecSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
