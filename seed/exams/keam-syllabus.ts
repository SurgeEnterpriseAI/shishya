// KEAM (Kerala Engineering Architecture Medical) — full syllabus tree.
// Based on Kerala Higher Secondary (Class 11 + 12) and CBSE NCERT curriculum.
// Engineering exam: 150 Qs total — Mathematics 75 + Physics 45 + Chemistry 30.
// Weightage ratio Math : Physics : Chemistry = 5 : 3 : 2.
// Duration: 180 minutes. Includes negative marking.
// Source: cee.kerala.gov.in (official notification, Jan 2026).
//
// Run after seedExams: npx tsx seed/exams/keam-syllabus.ts

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

export const keamSyllabus: SubjectSeed[] = [
  // ── PHYSICS (45 Qs) ───────────────────────────────────────────────────
  {
    code: "PHYSICS",
    name: "Physics",
    weight: 3,
    topics: [
      { code: "phy.units_measurement", name: "Units and Measurement", description: "SI units, dimensional analysis, error analysis, significant figures." },
      { code: "phy.kinematics", name: "Kinematics", description: "Motion in a straight line and plane, projectile, relative velocity, circular motion." },
      { code: "phy.laws_motion", name: "Laws of Motion", description: "Newton's laws, friction, dynamics, banking, conservation of momentum." },
      { code: "phy.work_energy_power", name: "Work, Energy and Power", description: "Work-energy theorem, conservative forces, potential energy, collisions." },
      { code: "phy.rotational", name: "Motion of System of Particles and Rigid Body", description: "Centre of mass, torque, angular momentum, moment of inertia, rolling motion." },
      { code: "phy.gravitation", name: "Gravitation", description: "Universal law, Kepler's laws, gravitational potential, satellites, escape velocity." },
      { code: "phy.solids_fluids", name: "Mechanics of Solids and Fluids", description: "Elasticity, Hooke's law, Pascal's and Bernoulli's principles, viscosity, surface tension." },
      { code: "phy.heat_thermo", name: "Heat and Thermodynamics", description: "Thermal expansion, calorimetry, gas laws, kinetic theory, first and second laws of thermodynamics." },
      { code: "phy.oscillations", name: "Oscillations and Simple Harmonic Motion", description: "SHM equations, energy in SHM, simple and physical pendulum, damped/forced oscillation." },
      { code: "phy.waves", name: "Waves", description: "Transverse and longitudinal waves, superposition, beats, standing waves, Doppler effect." },
      { code: "phy.electrostatics", name: "Electrostatics", description: "Coulomb's law, electric field, Gauss's law, potential, capacitance, dielectrics." },
      { code: "phy.current_electricity", name: "Current Electricity", description: "Ohm's law, Kirchhoff's laws, Wheatstone bridge, potentiometer, drift velocity." },
      { code: "phy.magnetic_effects", name: "Magnetic Effects of Current and Magnetism", description: "Biot-Savart law, Ampere's law, force on conductor, galvanometer, Earth's magnetism." },
      { code: "phy.emi_ac", name: "Electromagnetic Induction and Alternating Current", description: "Faraday's law, Lenz's law, RLC circuits, transformer, AC generator, resonance." },
      { code: "phy.em_waves", name: "Electromagnetic Waves", description: "Maxwell's equations, displacement current, EM spectrum and applications." },
      { code: "phy.optics", name: "Optics", description: "Ray optics — reflection, refraction, lenses, optical instruments; wave optics — interference, diffraction, polarization." },
      { code: "phy.dual_nature", name: "Dual Nature of Matter and Radiation", description: "Photoelectric effect, Einstein's equation, de Broglie wavelength, Davisson-Germer." },
      { code: "phy.atomic_nuclear", name: "Atomic Nucleus", description: "Bohr's model, hydrogen spectrum, mass defect, fission, fusion, radioactive decay." },
      { code: "phy.solids_semiconductors", name: "Solids and Semiconductor Devices", description: "Energy bands, p-n junction, diode, transistor, logic gates." },
      { code: "phy.principles_communication", name: "Principles of Communication", description: "Modulation (AM/FM), bandwidth, propagation, communication systems." },
    ],
  },

  // ── CHEMISTRY (30 Qs) ─────────────────────────────────────────────────
  {
    code: "CHEMISTRY",
    name: "Chemistry",
    weight: 2,
    topics: [
      { code: "chem.basic_concepts", name: "Some Basic Concepts of Chemistry", description: "Mole concept, stoichiometry, empirical and molecular formula." },
      { code: "chem.atomic_structure", name: "Structure of Atom", description: "Atomic models, dual nature, quantum numbers, orbitals, electronic configuration." },
      { code: "chem.classification", name: "Classification of Elements and Periodicity", description: "Modern periodic law, periodic trends in properties." },
      { code: "chem.bonding", name: "Chemical Bonding and Molecular Structure", description: "Ionic, covalent, hydrogen bonds, VSEPR, hybridization, MO theory." },
      { code: "chem.states_matter", name: "States of Matter", description: "Gas laws, kinetic theory, real gases, intermolecular forces, liquid state." },
      { code: "chem.thermodynamics", name: "Chemical Thermodynamics", description: "First law, enthalpy, Hess's law, second law, free energy, spontaneity." },
      { code: "chem.equilibrium", name: "Equilibrium", description: "Chemical and ionic equilibrium, Kc, Kp, pH, buffers, Ksp." },
      { code: "chem.redox_electrochem", name: "Redox Reactions and Electrochemistry", description: "Oxidation numbers, electrochemical cells, Nernst equation, conductance, batteries." },
      { code: "chem.kinetics", name: "Chemical Kinetics", description: "Rate, order, molecularity, integrated rate law, Arrhenius equation." },
      { code: "chem.surface_chem", name: "Surface Chemistry", description: "Adsorption, catalysis, colloids, emulsions, Tyndall effect." },
      { code: "chem.hydrogen_sblock", name: "Hydrogen and s-Block Elements", description: "Hydrogen, alkali and alkaline earth metals, key compounds and reactions." },
      { code: "chem.p_block", name: "p-Block Elements", description: "Groups 13 to 18 — properties, oxoacids, anomalous behaviour, key compounds." },
      { code: "chem.d_f_block", name: "d- and f-Block Elements", description: "Transition metals, lanthanoids, actinoids, properties, complex formation." },
      { code: "chem.coordination", name: "Coordination Compounds", description: "Werner theory, IUPAC nomenclature, isomerism, VBT, CFT, applications." },
      { code: "chem.metallurgy", name: "General Principles and Processes of Isolation of Metals", description: "Concentration, reduction, refining; thermodynamic principles; industrial processes." },
      { code: "chem.organic_principles", name: "Basic Principles of Organic Chemistry", description: "IUPAC nomenclature, isomerism, electronic effects, reactive intermediates." },
      { code: "chem.hydrocarbons", name: "Hydrocarbons", description: "Alkanes, alkenes, alkynes, aromatic — preparation, properties, mechanisms." },
      { code: "chem.haloalkanes", name: "Organic Compounds with Halogens", description: "Haloalkanes, haloarenes, SN1/SN2, elimination reactions." },
      { code: "chem.oxygen_compounds", name: "Organic Compounds with Oxygen", description: "Alcohols, phenols, ethers, aldehydes, ketones, carboxylic acids." },
      { code: "chem.nitrogen_compounds", name: "Organic Compounds with Nitrogen", description: "Amines, diazonium salts, cyanides, nitro compounds." },
      { code: "chem.polymers", name: "Polymers", description: "Classification, addition vs condensation polymerisation, important polymers." },
      { code: "chem.biomolecules", name: "Biomolecules", description: "Carbohydrates, amino acids, proteins, vitamins, nucleic acids, hormones." },
      { code: "chem.environmental", name: "Environmental Chemistry", description: "Air, water, soil pollution; greenhouse effect; ozone layer; green chemistry." },
      { code: "chem.everyday_life", name: "Chemistry in Everyday Life", description: "Drugs, food additives, soaps and detergents." },
    ],
  },

  // ── MATHEMATICS (75 Qs) ───────────────────────────────────────────────
  {
    code: "MATHEMATICS",
    name: "Mathematics",
    weight: 5,
    topics: [
      // Algebra
      { code: "math.sets", name: "Sets, Relations and Functions", description: "Set operations, types of relations, domain/range, composition, invertibility." },
      { code: "math.complex_numbers", name: "Complex Numbers", description: "Argand plane, modulus, polar form, De Moivre's theorem, roots of unity." },
      { code: "math.quadratic", name: "Quadratic Equations", description: "Roots, nature, sum and product, equations reducible to quadratic." },
      { code: "math.sequences", name: "Sequences and Series", description: "AP, GP, HP, arithmetic-geometric series, sum of special series." },
      { code: "math.permutations", name: "Permutations and Combinations", description: "Counting principle, nPr, nCr, applications, circular arrangements." },
      { code: "math.binomial", name: "Mathematical Induction and Binomial Theorem", description: "PMI, binomial expansion, general/middle term, applications." },
      { code: "math.matrices", name: "Matrices and Determinants", description: "Operations, transpose, inverse, properties of determinants, system of linear equations." },
      { code: "math.linear_inequalities", name: "Linear Inequations", description: "Algebraic and graphical solutions in one and two variables." },
      // Trigonometry
      { code: "math.trig_functions", name: "Trigonometric Functions and Identities", description: "Trig identities, sum/difference and multiple-angle formulas, transformations." },
      { code: "math.trig_equations", name: "Trigonometric Equations", description: "General solutions of trigonometric equations." },
      { code: "math.inverse_trig", name: "Inverse Trigonometric Functions", description: "Domain, range, principal value, properties." },
      { code: "math.solutions_triangles", name: "Solutions of Triangles", description: "Sine and cosine rules, area of triangle, properties, heights and distances." },
      // Geometry
      { code: "math.straight_lines", name: "Straight Lines", description: "Slope, equations of lines, angle between lines, distance from a point." },
      { code: "math.pair_lines", name: "Pair of Straight Lines", description: "Homogeneous and general second-degree equation representing two lines." },
      { code: "math.circles", name: "Circles", description: "Equation of circle, position of point, tangent, normal, family of circles." },
      { code: "math.conic_sections", name: "Conic Sections", description: "Parabola, ellipse, hyperbola — equations, properties, tangents and normals." },
      { code: "math.three_d_geometry", name: "Three-Dimensional Geometry", description: "Direction cosines, lines, planes, distance and angle formulas." },
      { code: "math.vectors", name: "Vectors", description: "Vector operations, dot and cross products, scalar triple product, projection." },
      // Statistics & Probability
      { code: "math.statistics", name: "Statistics", description: "Measures of dispersion — mean deviation, variance, standard deviation, coefficient of variation." },
      { code: "math.probability", name: "Probability", description: "Conditional probability, Bayes' theorem, random variables, binomial distribution." },
      // Calculus
      { code: "math.limits", name: "Limits and Continuity", description: "Limit definition, standard limits, continuity tests, types of discontinuities." },
      { code: "math.differentiation", name: "Differentiation", description: "Differentiation rules, chain rule, implicit/parametric, higher order derivatives." },
      { code: "math.applications_derivatives", name: "Applications of Derivatives", description: "Rate of change, tangent/normal, monotonicity, maxima/minima, approximations." },
      { code: "math.integration", name: "Integration", description: "Indefinite integrals, by substitution/parts/partial fractions, definite integrals, properties." },
      { code: "math.applications_integrals", name: "Applications of Integrals", description: "Area under curves, area between curves and lines." },
      { code: "math.differential_equations", name: "Differential Equations", description: "Order, degree, formation, variable separable, linear and homogeneous DEs." },
      { code: "math.linear_programming", name: "Linear Programming", description: "LPP formulation, graphical solution, feasible region, optimal value." },
    ],
  },
];

export async function seedKeamSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "KL_KEAM" } });
  if (!exam) {
    throw new Error("Run seedExams() first — KL_KEAM exam not found.");
  }
  console.log(`Seeding KEAM syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < keamSyllabus.length; sIdx++) {
    const s = keamSyllabus[sIdx];
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
  console.log(`✓ Seeded KEAM syllabus. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedKeamSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
