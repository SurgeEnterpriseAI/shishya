// Punjab CET (PCET / Punjab Combined Entrance Test) — full syllabus tree.
// Conducted (historically) for B.E./B.Tech admissions in Punjab engineering colleges; now
// most state institutes use JEE Main. PU CET (UG) of Panjab University also follows similar
// PCM structure based on NCERT Class 11 + 12. PCM track: Physics + Chemistry + Mathematics.
// Source: PSEB / Panjab University CET syllabus (NCERT Class 11 + 12 — sciencegrades XI, XII).
//
// Run after seedExams: npx tsx seed/exams/punjab-cet-syllabus.ts

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

export const punjabCetSyllabus: SubjectSeed[] = [
  // ── PHYSICS ──────────────────────────────────────────────────────────
  {
    code: "PHYSICS",
    name: "Physics",
    weight: 1,
    topics: [
      // Class 11
      { code: "phy.measurement", name: "Physical World, Units and Measurement (Class 11)", description: "SI units, dimensional analysis, errors and significant figures." },
      { code: "phy.kinematics", name: "Kinematics (Class 11)", description: "Motion in a straight line and in a plane, projectile motion, relative velocity." },
      { code: "phy.laws_motion", name: "Laws of Motion (Class 11)", description: "Newton's laws, friction, banked roads, free-body diagrams." },
      { code: "phy.work_energy", name: "Work, Energy and Power (Class 11)", description: "Work-energy theorem, conservative forces, collisions." },
      { code: "phy.rotational", name: "System of Particles and Rotational Motion (Class 11)", description: "Centre of mass, moment of inertia, torque, angular momentum, rolling." },
      { code: "phy.gravitation", name: "Gravitation (Class 11)", description: "Kepler's laws, escape velocity, gravitational potential, satellites." },
      { code: "phy.solids_fluids", name: "Mechanical Properties of Solids and Fluids (Class 11)", description: "Stress-strain, elasticity, Bernoulli, viscosity, surface tension." },
      { code: "phy.thermal", name: "Thermal Properties of Matter (Class 11)", description: "Thermal expansion, calorimetry, heat transfer, cooling." },
      { code: "phy.thermodynamics", name: "Thermodynamics (Class 11)", description: "Zeroth, first, second laws; PV diagrams; heat engines." },
      { code: "phy.kinetic_theory", name: "Kinetic Theory of Gases (Class 11)", description: "Ideal gas equation, RMS speed, degrees of freedom, mean free path." },
      { code: "phy.oscillations", name: "Oscillations (Class 11)", description: "SHM, energy in SHM, simple and compound pendulum." },
      { code: "phy.waves", name: "Waves (Class 11)", description: "Wave equation, beats, standing waves, Doppler effect." },
      // Class 12
      { code: "phy.electrostatics", name: "Electrostatics (Class 12)", description: "Coulomb's law, electric field/potential, Gauss's law, dielectrics." },
      { code: "phy.capacitance", name: "Capacitance (Class 12)", description: "Capacitors, energy stored, dielectric insertion." },
      { code: "phy.current_electricity", name: "Current Electricity (Class 12)", description: "Ohm's law, Kirchhoff, Wheatstone bridge, drift velocity, potentiometer." },
      { code: "phy.magnetic_effects", name: "Magnetic Effects of Current (Class 12)", description: "Biot-Savart, Ampere's law, force on charge, cyclotron, solenoid." },
      { code: "phy.magnetism", name: "Magnetism and Matter (Class 12)", description: "Bar magnet, dia/para/ferromagnetism, Earth's magnetism." },
      { code: "phy.emi", name: "Electromagnetic Induction (Class 12)", description: "Faraday's, Lenz's laws, self/mutual inductance, AC generator." },
      { code: "phy.ac", name: "Alternating Current (Class 12)", description: "RMS values, RLC circuits, resonance, transformer, power factor." },
      { code: "phy.em_waves", name: "Electromagnetic Waves (Class 12)", description: "Maxwell's equations, EM spectrum, displacement current." },
      { code: "phy.ray_optics", name: "Ray Optics (Class 12)", description: "Reflection, refraction, lenses, prism, optical instruments." },
      { code: "phy.wave_optics", name: "Wave Optics (Class 12)", description: "Huygens, interference, diffraction, polarisation." },
      { code: "phy.dual_nature", name: "Dual Nature of Radiation and Matter (Class 12)", description: "Photoelectric effect, de Broglie, Davisson-Germer." },
      { code: "phy.atoms_nuclei", name: "Atoms and Nuclei (Class 12)", description: "Bohr model, hydrogen spectrum, mass defect, fission, fusion." },
      { code: "phy.semiconductors", name: "Semiconductor Electronics (Class 12)", description: "P-N junction, diodes, BJT, logic gates, Zener diode." },
      { code: "phy.communication", name: "Communication Systems (Class 12)", description: "Modulation, bandwidth, propagation modes." },
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
      { code: "chem.atomic_structure", name: "Structure of Atom (Class 11)", description: "Bohr model, quantum numbers, orbitals, electron configuration." },
      { code: "chem.periodic_classification", name: "Classification and Periodicity (Class 11)", description: "Modern periodic law, periodic trends." },
      { code: "chem.bonding", name: "Chemical Bonding and Molecular Structure (Class 11)", description: "Ionic, covalent, coordinate; VSEPR, hybridization, MOT." },
      { code: "chem.states_matter", name: "States of Matter (Class 11)", description: "Gas laws, ideal vs real gases, van der Waals, liquid state." },
      { code: "chem.thermodynamics_chem", name: "Chemical Thermodynamics (Class 11)", description: "First law, enthalpy, entropy, Gibbs energy, spontaneity." },
      { code: "chem.equilibrium", name: "Equilibrium (Class 11)", description: "Chemical and ionic equilibrium, pH, buffer, Ksp." },
      { code: "chem.redox", name: "Redox Reactions (Class 11)", description: "Oxidation numbers, balancing, redox titrations." },
      { code: "chem.hydrogen", name: "Hydrogen (Class 11)", description: "Position of H, hydrides, water, H₂O₂." },
      { code: "chem.s_block", name: "s-Block Elements (Class 11)", description: "Alkali and alkaline earth metals, important compounds." },
      { code: "chem.p_block_11", name: "p-Block Elements (Class 11 — Groups 13/14)", description: "Boron and carbon families." },
      { code: "chem.organic_basics", name: "General Organic Chemistry (Class 11)", description: "IUPAC nomenclature, isomerism, reaction mechanisms." },
      { code: "chem.hydrocarbons", name: "Hydrocarbons (Class 11)", description: "Alkanes, alkenes, alkynes, aromatic hydrocarbons." },
      { code: "chem.environmental_chem", name: "Environmental Chemistry (Class 11)", description: "Air, water, soil pollution, green chemistry." },
      // Class 12
      { code: "chem.solid_state", name: "Solid State (Class 12)", description: "Unit cell, packing efficiency, point defects." },
      { code: "chem.solutions", name: "Solutions (Class 12)", description: "Concentration units, Raoult's law, colligative properties." },
      { code: "chem.electrochem", name: "Electrochemistry (Class 12)", description: "Galvanic cells, Nernst equation, conductance." },
      { code: "chem.kinetics", name: "Chemical Kinetics (Class 12)", description: "Rate laws, integrated rate equations, Arrhenius." },
      { code: "chem.surface_chem", name: "Surface Chemistry (Class 12)", description: "Adsorption, catalysis, colloids, emulsions." },
      { code: "chem.metallurgy", name: "Isolation of Elements (Class 12)", description: "Concentration, reduction, refining methods." },
      { code: "chem.p_block_12", name: "p-Block Elements (Class 12 — Groups 15-18)", description: "Nitrogen, oxygen, halogen, noble gas families." },
      { code: "chem.dfblock", name: "d- and f-Block Elements (Class 12)", description: "Transition metals, lanthanoids, actinoids." },
      { code: "chem.coordination", name: "Coordination Compounds (Class 12)", description: "Werner's theory, IUPAC, isomerism, VBT, CFT." },
      { code: "chem.haloalkanes", name: "Haloalkanes and Haloarenes (Class 12)", description: "Nomenclature, SN1/SN2, elimination." },
      { code: "chem.alcohols", name: "Alcohols, Phenols and Ethers (Class 12)", description: "Preparation, properties, dehydration mechanism." },
      { code: "chem.aldehydes_ketones", name: "Aldehydes, Ketones and Carboxylic Acids (Class 12)", description: "Nucleophilic addition, aldol, Cannizzaro." },
      { code: "chem.amines", name: "Amines (Class 12)", description: "Amines, diazonium salts, Hofmann bromamide." },
      { code: "chem.biomolecules", name: "Biomolecules (Class 12)", description: "Carbohydrates, proteins, nucleic acids, vitamins." },
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
      // Class 11
      { code: "math.sets", name: "Sets, Relations and Functions (Class 11)", description: "Set operations, types of relations, domain/range, composite functions." },
      { code: "math.trig_11", name: "Trigonometric Functions (Class 11)", description: "Identities, equations, sum/difference and multiple-angle formulas." },
      { code: "math.complex", name: "Complex Numbers (Class 11)", description: "Argand plane, modulus, polar form, De Moivre's theorem." },
      { code: "math.linear_ineq", name: "Linear Inequalities (Class 11)", description: "Algebraic and graphical solution." },
      { code: "math.permutations", name: "Permutations and Combinations (Class 11)", description: "nPr, nCr, circular and restricted arrangements." },
      { code: "math.binomial", name: "Binomial Theorem (Class 11)", description: "Expansion, general and middle terms, applications." },
      { code: "math.sequences", name: "Sequences and Series (Class 11)", description: "AP, GP, HP, AGP, sum of special series." },
      { code: "math.straight_lines", name: "Straight Lines (Class 11)", description: "Slope, line equations, distance, angle between lines." },
      { code: "math.conic", name: "Conic Sections (Class 11)", description: "Circle, parabola, ellipse, hyperbola." },
      { code: "math.intro_3d", name: "Introduction to 3D Geometry (Class 11)", description: "3D coordinates, distance and section formulas." },
      { code: "math.limits_derivatives", name: "Limits and Derivatives (Class 11)", description: "Limit definitions, basic differentiation rules." },
      { code: "math.statistics_11", name: "Statistics (Class 11)", description: "Mean deviation, variance, SD, coefficient of variation." },
      { code: "math.probability_11", name: "Probability (Class 11)", description: "Sample space, events, axiomatic probability." },
      // Class 12
      { code: "math.relations_func_12", name: "Relations and Functions (Class 12)", description: "Types, composition, invertibility, binary operations." },
      { code: "math.inverse_trig", name: "Inverse Trigonometric Functions (Class 12)", description: "Domain, range, principal values." },
      { code: "math.matrices", name: "Matrices (Class 12)", description: "Operations, transpose, symmetric/skew, inverse." },
      { code: "math.determinants", name: "Determinants (Class 12)", description: "Properties, cofactors, adjoint, system of equations." },
      { code: "math.continuity", name: "Continuity and Differentiability (Class 12)", description: "Continuity, chain rule, implicit, parametric, MVT." },
      { code: "math.app_derivatives", name: "Applications of Derivatives (Class 12)", description: "Tangent, normal, monotonicity, maxima/minima." },
      { code: "math.integrals", name: "Integrals (Class 12)", description: "Indefinite, by-parts, substitution, partial fractions, definite." },
      { code: "math.app_integrals", name: "Applications of Integrals (Class 12)", description: "Area under curves, area between curves." },
      { code: "math.diff_equations", name: "Differential Equations (Class 12)", description: "Order, degree, variable separable, linear, homogeneous." },
      { code: "math.vectors", name: "Vector Algebra (Class 12)", description: "Dot/cross product, scalar triple product, projections." },
      { code: "math.three_d_geom", name: "Three-Dimensional Geometry (Class 12)", description: "Direction cosines/ratios, lines, planes." },
      { code: "math.lpp", name: "Linear Programming (Class 12)", description: "LPP formulation, graphical method, feasible region." },
      { code: "math.probability_12", name: "Probability (Class 12)", description: "Conditional probability, Bayes' theorem, binomial distribution." },
    ],
  },
];

export async function seedPunjabCetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "PB_PUNJABCET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — PB_PUNJABCET exam not found.");
  }
  console.log(`Seeding Punjab CET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < punjabCetSyllabus.length; sIdx++) {
    const s = punjabCetSyllabus[sIdx];
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
  console.log(`✓ Seeded Punjab CET syllabus. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedPunjabCetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
