// COMEDK UGET 2026 — full syllabus tree as published by COMEDK on comedk.org.
// Pattern: Physics + Chemistry + Mathematics, 60 questions each (180 total), 1 mark per Q.
// Curriculum basis: NCERT / PUC Karnataka, Class 11 + 12 (~33% Class 11, ~67% Class 12).
// Source: COMEDK UGET 2026 Information Brochure on comedk.org.
//
// Run after seedExams: npx tsx seed/exams/comedk-syllabus.ts

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

export const comedkSyllabus: SubjectSeed[] = [
  // ── PHYSICS ───────────────────────────────────────────────────────────
  {
    code: "PHYSICS",
    name: "Physics",
    weight: 1,
    topics: [
      { code: "phy.physical_world", name: "Physical World and Measurement", description: "Scope of physics, units of measurement, system of units, dimensional analysis, errors and significant figures." },
      { code: "phy.kinematics", name: "Kinematics", description: "Motion in a straight line and plane, scalars and vectors, projectile motion, uniform circular motion." },
      { code: "phy.laws_motion", name: "Laws of Motion", description: "Newton's laws, conservation of linear momentum, equilibrium of concurrent forces, friction, dynamics of circular motion." },
      { code: "phy.work_energy", name: "Work, Energy and Power", description: "Work done by constant and variable forces, kinetic and potential energy, work-energy theorem, conservation of mechanical energy, collisions." },
      { code: "phy.rotational", name: "Motion of System of Particles and Rigid Body", description: "Centre of mass, torque, angular momentum, moment of inertia, theorems of perpendicular and parallel axes, rolling motion." },
      { code: "phy.gravitation", name: "Gravitation", description: "Universal law of gravitation, acceleration due to gravity, gravitational potential energy, Kepler's laws, satellites and escape velocity." },
      { code: "phy.bulk_matter", name: "Properties of Bulk Matter", description: "Elasticity, stress-strain, Hooke's law, fluid pressure, Bernoulli's principle, viscosity, surface tension, thermal expansion." },
      { code: "phy.thermodynamics", name: "Thermodynamics", description: "Thermal equilibrium, zeroth and first laws, heat, work, internal energy, isothermal and adiabatic processes, second law, heat engines." },
      { code: "phy.kinetic_theory", name: "Behaviour of Perfect Gases and Kinetic Theory", description: "Equation of state, kinetic theory postulates, RMS velocity, degrees of freedom, mean free path." },
      { code: "phy.oscillation_waves", name: "Oscillations and Waves", description: "Periodic motion, simple harmonic motion, energy in SHM, simple pendulum, wave motion, superposition, beats, Doppler effect." },
      { code: "phy.electrostatics", name: "Electrostatics", description: "Electric charges, Coulomb's law, electric field and potential, Gauss's law, capacitors and dielectrics." },
      { code: "phy.current_electricity", name: "Current Electricity", description: "Ohm's law, drift velocity, resistivity, Kirchhoff's laws, Wheatstone bridge, potentiometer, internal resistance." },
      { code: "phy.magnetic_effects", name: "Magnetic Effects of Current and Magnetism", description: "Biot-Savart law, Ampere's law, force on a moving charge and current-carrying conductor, moving coil galvanometer, Earth's magnetism, magnetic materials." },
      { code: "phy.emi_ac", name: "Electromagnetic Induction and Alternating Currents", description: "Faraday's and Lenz's laws, self and mutual inductance, AC generator, LCR circuits, resonance, transformers." },
      { code: "phy.em_waves", name: "Electromagnetic Waves", description: "Displacement current, properties of EM waves, electromagnetic spectrum and applications." },
      { code: "phy.optics", name: "Optics", description: "Reflection, refraction, lenses, mirrors, dispersion, optical instruments, wave optics — interference, diffraction and polarisation." },
      { code: "phy.dual_nature", name: "Dual Nature of Matter and Radiation", description: "Photoelectric effect, Einstein's equation, particle nature of light, de Broglie hypothesis, Davisson-Germer experiment." },
      { code: "phy.atoms_nuclei", name: "Atoms and Nuclei", description: "Alpha-scattering, Bohr model, hydrogen spectrum, composition of nucleus, mass-energy relation, radioactivity, fission and fusion." },
      { code: "phy.electronic_devices", name: "Electronic Devices", description: "Energy bands in solids, semiconductors, p-n junction, diodes, rectifiers, transistors, logic gates." },
      { code: "phy.communication", name: "Communication Systems", description: "Elements of a communication system, propagation of EM waves in atmosphere, modulation — amplitude and frequency." },
    ],
  },

  // ── CHEMISTRY ─────────────────────────────────────────────────────────
  {
    code: "CHEMISTRY",
    name: "Chemistry",
    weight: 1,
    topics: [
      { code: "chem.basic_concepts", name: "Some Basic Concepts of Chemistry", description: "Mole concept, stoichiometry, empirical and molecular formulae, laws of chemical combination." },
      { code: "chem.atomic_structure", name: "Atomic Structure", description: "Bohr's model, dual nature, quantum numbers, orbitals, Aufbau, Hund's rule, electronic configurations." },
      { code: "chem.states_matter", name: "States of Matter: Gases and Liquids", description: "Gas laws, ideal gas equation, kinetic theory, real gases, liquefaction, vapour pressure, surface tension and viscosity." },
      { code: "chem.solid_state", name: "Solid State", description: "Crystalline and amorphous solids, unit cells, packing, density, defects, electrical and magnetic properties." },
      { code: "chem.bonding", name: "Chemical Bonding and Molecular Structure", description: "Ionic and covalent bonds, VSEPR, valence bond and MO theories, hybridisation, hydrogen bonding." },
      { code: "chem.thermodynamics", name: "Thermodynamics", description: "First and second laws, enthalpy, entropy, Gibbs free energy, Hess's law, spontaneity criteria." },
      { code: "chem.equilibrium", name: "Chemical Equilibrium", description: "Reversible reactions, law of mass action, Kc and Kp, Le Chatelier's principle, applications." },
      { code: "chem.ionic_equilibrium", name: "Ionic Equilibrium", description: "Acids, bases and salts, Bronsted-Lowry and Lewis concepts, pH, buffer solutions, solubility product, common ion effect." },
      { code: "chem.redox_electrochem", name: "Redox Reactions and Electrochemistry", description: "Oxidation states, balancing redox reactions, conductance, electrochemical cells, EMF, Nernst equation, electrolysis, batteries." },
      { code: "chem.kinetics", name: "Chemical Kinetics", description: "Rate of reaction, order, molecularity, integrated rate equations, half-life, Arrhenius equation, collision theory." },
      { code: "chem.s_p_block", name: "s-Block and p-Block Elements and Metallurgy", description: "Group 1, 2, 13-18 elements — properties, anomalous behaviour, important compounds; principles and processes of isolation of metals." },
      { code: "chem.d_f_block", name: "d- and f-Block Elements and Coordination Compounds", description: "Transition and inner-transition elements, oxidation states, lanthanoid contraction, Werner theory, IUPAC nomenclature, isomerism, CFT." },
      { code: "chem.solutions", name: "Solutions", description: "Concentration units, vapour pressure, Raoult's law, colligative properties, abnormal molar mass, van't Hoff factor." },
      { code: "chem.surface_chem", name: "Surface Chemistry", description: "Adsorption, catalysis, colloids, emulsions, micelles, Tyndall effect, Brownian motion." },
      { code: "chem.hydrocarbons", name: "Hydrocarbons, Haloalkanes and Haloarenes", description: "Alkanes, alkenes, alkynes and aromatic hydrocarbons; preparation and properties of haloalkanes and haloarenes; SN1/SN2." },
      { code: "chem.oxygen_compounds", name: "Oxygen Containing Organic Compounds", description: "Alcohols, phenols, ethers, aldehydes, ketones and carboxylic acids — preparation, properties and uses." },
      { code: "chem.nitrogen_compounds", name: "Nitrogen Containing Organic Compounds", description: "Amines, diazonium salts, cyanides and isocyanides — preparation, properties and applications." },
      { code: "chem.biomol_polymer", name: "Bio-Molecules and Polymers", description: "Carbohydrates, proteins, nucleic acids, vitamins, hormones; classification and types of polymers, polymerisation." },
      { code: "chem.everyday_life", name: "Chemistry in Everyday Life", description: "Drugs and medicines, food chemistry, soaps and detergents, antiseptics and disinfectants." },
      { code: "chem.environmental", name: "Environmental Chemistry", description: "Air, water and soil pollution; greenhouse effect; ozone depletion; green chemistry approaches." },
    ],
  },

  // ── MATHEMATICS ───────────────────────────────────────────────────────
  {
    code: "MATHEMATICS",
    name: "Mathematics",
    weight: 1,
    topics: [
      { code: "math.sets", name: "Sets, Relations and Functions", description: "Set operations, Cartesian product, types of relations and functions, composition and inverse." },
      { code: "math.trigonometry", name: "Trigonometric Functions", description: "Trigonometric ratios, identities, equations, properties of triangles, heights and distances." },
      { code: "math.induction", name: "Principle of Mathematical Induction", description: "Statement and applications of induction in proving algebraic and divisibility statements." },
      { code: "math.complex", name: "Complex Numbers and Quadratic Equations", description: "Algebra of complex numbers, modulus and argument, polar form, roots of quadratic equations, theory of equations." },
      { code: "math.linear_quad_inequal", name: "Linear and Quadratic Inequalities", description: "Linear inequalities in one and two variables, graphical solution of linear inequalities, quadratic inequalities." },
      { code: "math.permutation", name: "Permutation and Combination", description: "Fundamental principle of counting, nPr and nCr, permutations with repetition, applications." },
      { code: "math.binomial", name: "Binomial Theorem", description: "Binomial theorem for positive integral index, general and middle term, properties of binomial coefficients." },
      { code: "math.sequences", name: "Sequences and Series", description: "Arithmetic, geometric and harmonic progressions; sums of special series; AM-GM inequality." },
      { code: "math.straight_line", name: "Straight Lines", description: "Slope, various forms of equations, distance between parallel lines, angle between lines, family of lines." },
      { code: "math.conic", name: "Conic Sections", description: "Standard equations of circle, parabola, ellipse and hyperbola; tangents and normals." },
      { code: "math.three_dim", name: "Introduction to Three-Dimensional Geometry", description: "Coordinates of a point in space, distance and section formulae." },
      { code: "math.limits_derivatives", name: "Limits and Derivatives", description: "Limits of standard functions, algebra of limits, derivative as a rate measure." },
      { code: "math.statistics", name: "Statistics", description: "Measures of dispersion, mean deviation, variance and standard deviation of grouped and ungrouped data." },
      { code: "math.probability", name: "Probability", description: "Random experiments, axiomatic probability, conditional probability, multiplication theorem, Bayes' theorem, Bernoulli trials." },
      { code: "math.relations_func_xii", name: "Relations and Functions (Class XII)", description: "Types of relations and functions, composition, invertibility, binary operations." },
      { code: "math.inverse_trig", name: "Inverse Trigonometric Functions", description: "Domain and range of inverse trigonometric functions, properties and elementary identities." },
      { code: "math.matrices", name: "Matrices", description: "Types of matrices, operations on matrices, transpose, symmetric and skew-symmetric matrices, elementary operations, inverse." },
      { code: "math.determinants", name: "Determinants", description: "Determinant of a square matrix up to order 3, properties, area of a triangle, adjoint and inverse, system of linear equations." },
      { code: "math.continuity_diff", name: "Continuity and Differentiability", description: "Continuity, differentiability of standard functions, logarithmic and parametric differentiation, Rolle's and Lagrange's theorems." },
      { code: "math.app_derivatives", name: "Applications of Derivatives", description: "Rate of change, increasing and decreasing functions, tangents and normals, maxima and minima, approximations." },
      { code: "math.indef_integrals", name: "Indefinite Integrals", description: "Integration as inverse of differentiation, integration by substitution, parts and partial fractions." },
      { code: "math.def_integrals", name: "Definite Integrals", description: "Definite integral as a limit of a sum, fundamental theorem of calculus, properties of definite integrals." },
      { code: "math.app_integrals", name: "Application of Integrals", description: "Area under simple curves, area between two curves." },
      { code: "math.diff_eq", name: "Differential Equations", description: "Order, degree, formation, solution by separation of variables, homogeneous and linear ODEs." },
      { code: "math.vectors", name: "Vector Algebra", description: "Vectors, magnitude and direction, scalar and vector products, scalar triple product, applications." },
      { code: "math.three_dim_xii", name: "Three Dimensional Geometry", description: "Direction cosines and ratios, equations of lines and planes, distance between lines, angle between line and plane." },
    ],
  },
];

export async function seedComedkSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "KA_COMEDK" } });
  if (!exam) {
    throw new Error("Run seedExams() first — KA_COMEDK exam not found.");
  }
  console.log(`Seeding COMEDK syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < comedkSyllabus.length; sIdx++) {
    const s = comedkSyllabus[sIdx];
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
  seedComedkSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
