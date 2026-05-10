// JKCET (J&K Common Entrance Test) — full syllabus tree.
// Conducted by JKBOPEE for B.E./B.Tech admissions in J&K UT.
// 180 questions: 60 Physics + 60 Chemistry + 60 Mathematics. 0.25 negative marking.
// Based on JKBOSE / NCERT Class 11 + 12 curriculum.
// Source: jkbopee.gov.in official JKCET syllabus PDF.
//
// Run after seedExams: npx tsx seed/exams/jkcet-syllabus.ts

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

export const jkcetSyllabus: SubjectSeed[] = [
  // ── PHYSICS (60 Qs) ───────────────────────────────────────────────────
  {
    code: "PHYSICS",
    name: "Physics",
    weight: 1,
    topics: [
      // Class 11
      { code: "phy.measurement", name: "Physical World, Units and Measurement (Class 11)", description: "SI units, dimensional analysis, error propagation, significant figures." },
      { code: "phy.kinematics", name: "Kinematics (Class 11)", description: "Motion in a straight line and plane, projectile motion, relative velocity." },
      { code: "phy.laws_motion", name: "Laws of Motion (Class 11)", description: "Newton's laws, friction, free-body diagrams, dynamics on inclines." },
      { code: "phy.work_energy", name: "Work, Energy and Power (Class 11)", description: "Work-energy theorem, conservative forces, potential energy, collisions." },
      { code: "phy.rotational", name: "System of Particles and Rotational Motion (Class 11)", description: "Centre of mass, moment of inertia, torque, angular momentum, rolling motion." },
      { code: "phy.gravitation", name: "Gravitation (Class 11)", description: "Kepler's laws, gravitational potential, escape velocity, orbital motion, satellites." },
      { code: "phy.solids_fluids", name: "Mechanical Properties of Solids and Fluids (Class 11)", description: "Stress, strain, elastic moduli, Bernoulli's principle, viscosity, surface tension." },
      { code: "phy.thermal", name: "Thermal Properties of Matter (Class 11)", description: "Thermal expansion, calorimetry, heat transfer, Newton's law of cooling." },
      { code: "phy.thermodynamics", name: "Thermodynamics (Class 11)", description: "Zeroth, first and second laws; PV diagrams; heat engines and refrigerators." },
      { code: "phy.kinetic_theory", name: "Kinetic Theory of Gases (Class 11)", description: "Ideal gas equation, RMS speed, degrees of freedom, mean free path." },
      { code: "phy.oscillations", name: "Oscillations (Class 11)", description: "Simple harmonic motion, energy in SHM, simple and compound pendulum." },
      { code: "phy.waves", name: "Waves (Class 11)", description: "Wave equation, superposition, beats, standing waves, Doppler effect." },
      // Class 12
      { code: "phy.electrostatics", name: "Electrostatics (Class 12)", description: "Coulomb's law, electric field and potential, Gauss's law, dielectrics." },
      { code: "phy.capacitance", name: "Capacitance (Class 12)", description: "Capacitors in series and parallel, energy stored, dielectric insertion." },
      { code: "phy.current_electricity", name: "Current Electricity (Class 12)", description: "Ohm's law, Kirchhoff's laws, Wheatstone bridge, potentiometer, drift velocity." },
      { code: "phy.magnetic_effects", name: "Magnetic Effects of Current (Class 12)", description: "Biot-Savart law, Ampere's law, force on charged particle, cyclotron, solenoid." },
      { code: "phy.magnetism", name: "Magnetism and Matter (Class 12)", description: "Bar magnet, Earth's magnetism, dia/para/ferromagnetism." },
      { code: "phy.emi", name: "Electromagnetic Induction (Class 12)", description: "Faraday's and Lenz's laws, self/mutual inductance, AC generator, eddy currents." },
      { code: "phy.ac", name: "Alternating Current (Class 12)", description: "RMS values, RLC circuits, resonance, power factor, transformer." },
      { code: "phy.em_waves", name: "Electromagnetic Waves (Class 12)", description: "Maxwell's equations, EM spectrum, displacement current." },
      { code: "phy.ray_optics", name: "Ray Optics (Class 12)", description: "Reflection, refraction, lenses, prism, optical instruments." },
      { code: "phy.wave_optics", name: "Wave Optics (Class 12)", description: "Huygens principle, interference (Young's double slit), diffraction, polarisation." },
      { code: "phy.dual_nature", name: "Dual Nature of Radiation and Matter (Class 12)", description: "Photoelectric effect, Einstein's equation, de Broglie wavelength." },
      { code: "phy.atoms_nuclei", name: "Atoms and Nuclei (Class 12)", description: "Rutherford and Bohr models, hydrogen spectrum, mass defect, fission, fusion, decay." },
      { code: "phy.semiconductors", name: "Semiconductor Electronics (Class 12)", description: "P-N junction, diodes, rectifiers, BJT, logic gates, Zener diode." },
      { code: "phy.communication", name: "Communication Systems (Class 12)", description: "Modulation (AM/FM), bandwidth, ground/sky/space wave propagation." },
    ],
  },

  // ── CHEMISTRY (60 Qs) ─────────────────────────────────────────────────
  {
    code: "CHEMISTRY",
    name: "Chemistry",
    weight: 1,
    topics: [
      // Class 11
      { code: "chem.basic_concepts", name: "Some Basic Concepts of Chemistry (Class 11)", description: "Mole concept, stoichiometry, empirical and molecular formula, limiting reagent." },
      { code: "chem.atomic_structure", name: "Structure of Atom (Class 11)", description: "Bohr model, quantum numbers, orbital shapes, Aufbau principle." },
      { code: "chem.periodic_classification", name: "Classification of Elements and Periodicity (Class 11)", description: "Modern periodic law, periodic trends in atomic radius, IE, EA, EN." },
      { code: "chem.bonding", name: "Chemical Bonding and Molecular Structure (Class 11)", description: "Ionic, covalent, coordinate bonds; VSEPR; hybridization; MOT." },
      { code: "chem.states_matter", name: "States of Matter (Class 11)", description: "Gas laws, ideal vs real gases, van der Waals equation, liquid state." },
      { code: "chem.thermodynamics_chem", name: "Chemical Thermodynamics (Class 11)", description: "First law, enthalpy, entropy, Gibbs energy, spontaneity." },
      { code: "chem.equilibrium", name: "Equilibrium (Class 11)", description: "Chemical equilibrium, Kc/Kp, ionic equilibrium, pH, buffer, solubility product." },
      { code: "chem.redox", name: "Redox Reactions (Class 11)", description: "Oxidation numbers, balancing redox equations, redox titrations." },
      { code: "chem.hydrogen", name: "Hydrogen (Class 11)", description: "Position of hydrogen, dihydrogen, hydrides, water, hydrogen peroxide." },
      { code: "chem.s_block", name: "s-Block Elements (Class 11)", description: "Alkali and alkaline earth metals, diagonal relationships, important compounds." },
      { code: "chem.p_block_11", name: "p-Block Elements (Class 11 — Groups 13 and 14)", description: "Boron family and carbon family — properties and important compounds." },
      { code: "chem.organic_basics", name: "Basic Principles of Organic Chemistry (Class 11)", description: "IUPAC nomenclature, isomerism, electron displacement effects, mechanisms." },
      { code: "chem.hydrocarbons", name: "Hydrocarbons (Class 11)", description: "Alkanes, alkenes, alkynes, aromatic hydrocarbons; preparation and reactions." },
      { code: "chem.environmental_chem", name: "Environmental Chemistry (Class 11)", description: "Air, water, soil pollution, green chemistry." },
      // Class 12
      { code: "chem.solid_state", name: "Solid State (Class 12)", description: "Crystalline vs amorphous, unit cell, packing efficiency, point defects." },
      { code: "chem.solutions", name: "Solutions (Class 12)", description: "Concentration units, Raoult's law, colligative properties, van't Hoff factor." },
      { code: "chem.electrochem", name: "Electrochemistry (Class 12)", description: "Galvanic and electrolytic cells, Nernst equation, conductance, batteries." },
      { code: "chem.kinetics", name: "Chemical Kinetics (Class 12)", description: "Rate laws, order, molecularity, integrated rate equations, Arrhenius equation." },
      { code: "chem.surface_chem", name: "Surface Chemistry (Class 12)", description: "Adsorption, catalysis, colloids, emulsions, gels." },
      { code: "chem.metallurgy", name: "Isolation of Elements (Class 12)", description: "Concentration of ores, reduction methods, refining." },
      { code: "chem.p_block_12", name: "p-Block Elements (Class 12 — Groups 15 to 18)", description: "Nitrogen, oxygen, halogen and noble gas families." },
      { code: "chem.dfblock", name: "d- and f-Block Elements (Class 12)", description: "Transition metals, lanthanoids, actinoids — properties and oxidation states." },
      { code: "chem.coordination", name: "Coordination Compounds (Class 12)", description: "Werner's theory, IUPAC nomenclature, isomerism, VBT, CFT, applications." },
      { code: "chem.haloalkanes", name: "Haloalkanes and Haloarenes (Class 12)", description: "Nomenclature, SN1/SN2 mechanisms, elimination reactions." },
      { code: "chem.alcohols", name: "Alcohols, Phenols and Ethers (Class 12)", description: "Preparation, properties, mechanism of dehydration." },
      { code: "chem.aldehydes_ketones", name: "Aldehydes, Ketones and Carboxylic Acids (Class 12)", description: "Nucleophilic addition, aldol, Cannizzaro, acidity of carboxylic acids." },
      { code: "chem.amines", name: "Organic Compounds with Nitrogen (Class 12)", description: "Amines, diazonium salts, cyanides, isocyanides, Hofmann bromamide." },
      { code: "chem.biomolecules", name: "Biomolecules (Class 12)", description: "Carbohydrates, proteins, enzymes, vitamins, nucleic acids, hormones." },
      { code: "chem.polymers", name: "Polymers (Class 12)", description: "Classification, addition vs condensation polymerisation, biodegradable polymers." },
      { code: "chem.everyday_life", name: "Chemistry in Everyday Life (Class 12)", description: "Drugs, antiseptics, antibiotics, soaps and detergents, food preservatives." },
    ],
  },

  // ── MATHEMATICS (60 Qs) ───────────────────────────────────────────────
  {
    code: "MATHEMATICS",
    name: "Mathematics",
    weight: 1,
    topics: [
      // Class 11
      { code: "math.sets", name: "Sets, Relations and Functions (Class 11)", description: "Set operations, types of relations, domain/range, composite and inverse functions." },
      { code: "math.trig_11", name: "Trigonometric Functions (Class 11)", description: "Trigonometric identities, equations, sum/difference and multiple-angle formulas." },
      { code: "math.complex", name: "Complex Numbers and Quadratic Equations (Class 11)", description: "Argand plane, modulus, argument, polar form, De Moivre's theorem." },
      { code: "math.linear_ineq", name: "Linear Inequalities (Class 11)", description: "Algebraic and graphical solution of linear inequalities." },
      { code: "math.permutations", name: "Permutations and Combinations (Class 11)", description: "Fundamental counting principle, nPr, nCr, circular arrangements." },
      { code: "math.binomial", name: "Binomial Theorem (Class 11)", description: "Expansion for positive integral index, general and middle terms." },
      { code: "math.sequences", name: "Sequences and Series (Class 11)", description: "AP, GP, HP, AGP, sum of special series." },
      { code: "math.straight_lines", name: "Straight Lines (Class 11)", description: "Slope, line equation forms, distance from a point, angle between lines." },
      { code: "math.conic_sections", name: "Conic Sections (Class 11)", description: "Circle, parabola, ellipse, hyperbola — standard equations and properties." },
      { code: "math.intro_3d", name: "Introduction to 3D Geometry (Class 11)", description: "Coordinates in 3D, distance and section formula." },
      { code: "math.limits_derivatives", name: "Limits and Derivatives (Class 11)", description: "Limit definitions, standard limits, derivative as limit, basic differentiation rules." },
      { code: "math.statistics_11", name: "Statistics (Class 11)", description: "Mean deviation, variance, standard deviation, coefficient of variation." },
      { code: "math.probability_11", name: "Probability (Class 11)", description: "Sample space, events, axiomatic probability." },
      // Class 12
      { code: "math.relations_func_12", name: "Relations and Functions (Class 12)", description: "Types of functions, composition, invertibility, binary operations." },
      { code: "math.inverse_trig", name: "Inverse Trigonometric Functions (Class 12)", description: "Domain, range, principal values, identities." },
      { code: "math.matrices", name: "Matrices (Class 12)", description: "Types, operations, transpose, symmetric/skew, elementary transformations." },
      { code: "math.determinants", name: "Determinants (Class 12)", description: "Properties, minors, cofactors, area of triangle, adjoint, inverse, system of equations." },
      { code: "math.continuity", name: "Continuity and Differentiability (Class 12)", description: "Continuity, differentiability, chain rule, implicit and parametric differentiation." },
      { code: "math.app_derivatives", name: "Applications of Derivatives (Class 12)", description: "Rate of change, tangent and normal, monotonicity, maxima/minima, approximations." },
      { code: "math.integrals", name: "Integrals (Class 12)", description: "Indefinite integrals, by-parts, substitution, partial fractions, definite integrals." },
      { code: "math.app_integrals", name: "Applications of Integrals (Class 12)", description: "Area under curves, area between curves." },
      { code: "math.diff_equations", name: "Differential Equations (Class 12)", description: "Order, degree, formation, variable separable, linear and homogeneous DEs." },
      { code: "math.vectors", name: "Vector Algebra (Class 12)", description: "Vectors in 2D/3D, dot and cross products, scalar triple product." },
      { code: "math.three_d_geom", name: "Three-Dimensional Geometry (Class 12)", description: "Direction cosines/ratios, lines, planes, angle between lines and planes." },
      { code: "math.lpp", name: "Linear Programming (Class 12)", description: "LPP formulation, graphical method, feasible region, optimal solutions." },
      { code: "math.probability_12", name: "Probability (Class 12)", description: "Conditional probability, Bayes' theorem, random variables, binomial distribution." },
    ],
  },
];

export async function seedJkcetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "JK_JKCET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — JK_JKCET exam not found.");
  }
  console.log(`Seeding JKCET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < jkcetSyllabus.length; sIdx++) {
    const s = jkcetSyllabus[sIdx];
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
  console.log(`✓ Seeded JKCET syllabus. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedJkcetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
