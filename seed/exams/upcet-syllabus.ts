// UPCET / UPSEE (UP Combined Entrance Test) — full syllabus tree.
// Conducted (historically) by AKTU and now by NTA for B.Tech and other UG/PG admissions in UP.
// For B.Tech, UP currently uses JEE Main; UPCET continues for B.Pharm/MBA/MCA/B.Arch via CUET-format.
// Subject syllabus for engineering-relevant tracks: NCERT Class 11 + 12 PCM curriculum.
// Source: aktu.ac.in / nta.ac.in UPCET notification (NCERT Class 11+12).
//
// Run after seedExams: npx tsx seed/exams/upcet-syllabus.ts

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

export const upcetSyllabus: SubjectSeed[] = [
  // ── PHYSICS ──────────────────────────────────────────────────────────
  {
    code: "PHYSICS",
    name: "Physics",
    weight: 1,
    topics: [
      // Class 11
      { code: "phy.measurement", name: "Units and Measurement (Class 11)", description: "SI units, dimensional analysis, errors, significant figures." },
      { code: "phy.kinematics", name: "Kinematics (Class 11)", description: "Motion in 1D and 2D, projectile motion, relative velocity." },
      { code: "phy.laws_motion", name: "Laws of Motion (Class 11)", description: "Newton's laws, friction, free-body diagrams." },
      { code: "phy.work_energy", name: "Work, Energy and Power (Class 11)", description: "Work-energy theorem, conservative forces, collisions." },
      { code: "phy.rotational", name: "Rotational Motion (Class 11)", description: "Centre of mass, moment of inertia, torque, angular momentum." },
      { code: "phy.gravitation", name: "Gravitation (Class 11)", description: "Kepler's laws, escape velocity, satellites." },
      { code: "phy.solids_fluids", name: "Properties of Solids and Liquids (Class 11)", description: "Elasticity, Bernoulli, viscosity, surface tension." },
      { code: "phy.thermal", name: "Heat and Thermodynamics (Class 11)", description: "Calorimetry, heat transfer, laws of thermodynamics." },
      { code: "phy.kinetic_theory", name: "Kinetic Theory of Gases (Class 11)", description: "Ideal gas, RMS speed, mean free path." },
      { code: "phy.oscillations_waves", name: "Oscillations and Waves (Class 11)", description: "SHM, simple pendulum, beats, standing waves, Doppler effect." },
      // Class 12
      { code: "phy.electrostatics", name: "Electrostatics (Class 12)", description: "Coulomb's law, field, potential, Gauss's law, dielectrics, capacitance." },
      { code: "phy.current_electricity", name: "Current Electricity (Class 12)", description: "Ohm, Kirchhoff, Wheatstone, drift velocity, potentiometer." },
      { code: "phy.magnetic_effects", name: "Magnetic Effects of Current and Magnetism (Class 12)", description: "Biot-Savart, Ampere, cyclotron, solenoid, Earth's magnetism." },
      { code: "phy.emi_ac", name: "Electromagnetic Induction and AC (Class 12)", description: "Faraday, Lenz, RLC circuits, resonance, transformer." },
      { code: "phy.em_waves", name: "Electromagnetic Waves (Class 12)", description: "Maxwell's equations, EM spectrum." },
      { code: "phy.optics", name: "Optics (Class 12)", description: "Ray optics, lens, prism, Huygens, interference, diffraction, polarisation." },
      { code: "phy.dual_nature", name: "Dual Nature of Matter (Class 12)", description: "Photoelectric effect, de Broglie, Davisson-Germer." },
      { code: "phy.atoms_nuclei", name: "Atoms and Nuclei (Class 12)", description: "Bohr model, mass defect, fission, fusion, decay laws." },
      { code: "phy.electronic_devices", name: "Electronic Devices (Class 12)", description: "Semiconductors, P-N junction, diodes, BJT, logic gates." },
      { code: "phy.communication", name: "Communication Systems (Class 12)", description: "Modulation, propagation, bandwidth." },
    ],
  },

  // ── CHEMISTRY ────────────────────────────────────────────────────────
  {
    code: "CHEMISTRY",
    name: "Chemistry",
    weight: 1,
    topics: [
      // Class 11
      { code: "chem.basic_concepts", name: "Some Basic Concepts of Chemistry (Class 11)", description: "Mole concept, stoichiometry, empirical and molecular formulae." },
      { code: "chem.atomic_structure", name: "Structure of Atom (Class 11)", description: "Bohr model, quantum numbers, orbitals." },
      { code: "chem.periodic", name: "Classification and Periodicity (Class 11)", description: "Modern periodic law, periodic trends." },
      { code: "chem.bonding", name: "Chemical Bonding (Class 11)", description: "Ionic, covalent, coordinate; VSEPR, hybridization, MOT." },
      { code: "chem.states", name: "States of Matter (Class 11)", description: "Gas laws, ideal vs real gases, van der Waals." },
      { code: "chem.thermodynamics", name: "Chemical Thermodynamics (Class 11)", description: "First law, enthalpy, entropy, Gibbs energy." },
      { code: "chem.equilibrium", name: "Equilibrium (Class 11)", description: "Chemical and ionic equilibrium, pH, buffers." },
      { code: "chem.redox", name: "Redox Reactions (Class 11)", description: "Oxidation numbers, balancing, redox titrations." },
      { code: "chem.hydrogen", name: "Hydrogen (Class 11)", description: "Position of H, hydrides, water, H₂O₂." },
      { code: "chem.s_block", name: "s-Block Elements (Class 11)", description: "Alkali and alkaline earth metals, important compounds." },
      { code: "chem.p_block_11", name: "p-Block Elements (Class 11 — Groups 13/14)", description: "Boron and carbon families." },
      { code: "chem.organic_basics", name: "General Organic Chemistry (Class 11)", description: "IUPAC, isomerism, mechanisms." },
      { code: "chem.hydrocarbons", name: "Hydrocarbons (Class 11)", description: "Alkanes, alkenes, alkynes, aromatic hydrocarbons." },
      { code: "chem.environmental", name: "Environmental Chemistry (Class 11)", description: "Pollution, green chemistry." },
      // Class 12
      { code: "chem.solid_state", name: "Solid State (Class 12)", description: "Unit cell, packing efficiency, point defects." },
      { code: "chem.solutions", name: "Solutions (Class 12)", description: "Concentration, Raoult's law, colligative properties." },
      { code: "chem.electrochem", name: "Electrochemistry (Class 12)", description: "Galvanic cells, Nernst, conductance, batteries." },
      { code: "chem.kinetics", name: "Chemical Kinetics (Class 12)", description: "Rate laws, integrated rate equations, Arrhenius." },
      { code: "chem.surface", name: "Surface Chemistry (Class 12)", description: "Adsorption, catalysis, colloids." },
      { code: "chem.metallurgy", name: "Isolation of Elements (Class 12)", description: "Concentration, reduction, refining." },
      { code: "chem.p_block_12", name: "p-Block Elements (Class 12 — Groups 15-18)", description: "Nitrogen, oxygen, halogen, noble gas families." },
      { code: "chem.dfblock", name: "d- and f-Block Elements (Class 12)", description: "Transition metals, lanthanoids, actinoids." },
      { code: "chem.coordination", name: "Coordination Compounds (Class 12)", description: "Werner's theory, IUPAC, isomerism, VBT, CFT." },
      { code: "chem.haloalkanes", name: "Haloalkanes and Haloarenes (Class 12)", description: "Nomenclature, SN1/SN2, elimination." },
      { code: "chem.alcohols", name: "Alcohols, Phenols and Ethers (Class 12)", description: "Preparation, properties, dehydration mechanism." },
      { code: "chem.aldehydes_ketones", name: "Aldehydes, Ketones and Carboxylic Acids (Class 12)", description: "Nucleophilic addition, aldol, Cannizzaro." },
      { code: "chem.amines", name: "Amines (Class 12)", description: "Amines, diazonium salts, Hofmann bromamide." },
      { code: "chem.biomolecules", name: "Biomolecules (Class 12)", description: "Carbohydrates, proteins, enzymes, nucleic acids." },
      { code: "chem.polymers", name: "Polymers (Class 12)", description: "Addition vs condensation, biodegradable polymers." },
      { code: "chem.everyday_life", name: "Chemistry in Everyday Life (Class 12)", description: "Drugs, soaps, detergents, food preservatives." },
    ],
  },

  // ── MATHEMATICS ──────────────────────────────────────────────────────
  {
    code: "MATHEMATICS",
    name: "Mathematics",
    weight: 1,
    topics: [
      { code: "math.algebra", name: "Algebra", description: "Quadratic equations, complex numbers, sequences, matrices, determinants." },
      { code: "math.modern_algebra", name: "Modern Algebra", description: "Sets, relations, functions, group properties at introductory level." },
      { code: "math.coordinate", name: "Co-ordinate Geometry", description: "Straight lines, circles, parabola, ellipse, hyperbola." },
      { code: "math.three_d_geom", name: "Three-Dimensional Geometry", description: "Direction cosines/ratios, lines, planes." },
      { code: "math.probability", name: "Probability", description: "Conditional probability, Bayes' theorem, binomial distribution." },
      { code: "math.trig", name: "Trigonometry", description: "Trigonometric identities, equations, ITF, heights and distances." },
      { code: "math.calculus_limits", name: "Limit, Continuity and Differentiability", description: "Limit definitions, continuity, basic differentiation." },
      { code: "math.calculus_diff", name: "Differential Calculus", description: "Differentiation rules, applications — tangent, normal, max-min." },
      { code: "math.calculus_integ", name: "Integral Calculus", description: "Indefinite and definite integrals, applications — area." },
      { code: "math.diff_equations", name: "Differential Equations", description: "Order, degree, variable separable, linear DEs." },
      { code: "math.vectors", name: "Vectors", description: "Dot/cross product, scalar triple product, projections." },
      { code: "math.dynamics", name: "Dynamics", description: "Velocity, acceleration, projectiles, work and energy in mechanics." },
      { code: "math.statics", name: "Statics", description: "Equilibrium of forces, centre of gravity, friction." },
      { code: "math.statistics", name: "Statistics", description: "Mean, median, mode, theory of probability, dispersion, SD." },
      { code: "math.binomial", name: "Binomial Theorem", description: "Expansion, general and middle terms, applications." },
      { code: "math.permutations", name: "Permutations and Combinations", description: "nPr, nCr, circular and restricted arrangements." },
      { code: "math.math_induction", name: "Mathematical Induction", description: "Principle of mathematical induction and proofs." },
      { code: "math.math_reasoning", name: "Mathematical Reasoning", description: "Logical statements, validity of arguments, tautologies." },
      { code: "math.lpp", name: "Linear Programming", description: "LPP formulation, graphical method, feasible region." },
    ],
  },
];

export async function seedUpcetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "UP_UPCET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — UP_UPCET exam not found.");
  }
  console.log(`Seeding UPCET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < upcetSyllabus.length; sIdx++) {
    const s = upcetSyllabus[sIdx];
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
  console.log(`✓ Seeded UPCET syllabus. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedUpcetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
