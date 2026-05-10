// OJEE 2026 — full syllabus tree as published by OJEE Cell on ojee.nic.in.
// Engineering (B.Tech) track: Physics + Chemistry + Mathematics, 120 MCQs total.
// The OJEE engineering syllabus mirrors JEE Main and the CHSE Odisha Class 11 + 12 curriculum.
// Source: OJEE 2026 Information Brochure (cdnbbsr.s3waas.gov.in/.../202601281979424955.pdf).
//
// Run after seedExams: npx tsx seed/exams/ojee-syllabus.ts

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

export const ojeeSyllabus: SubjectSeed[] = [
  // ── PHYSICS ───────────────────────────────────────────────────────────
  {
    code: "PHYSICS",
    name: "Physics",
    weight: 1,
    topics: [
      { code: "phy.measurement", name: "Physics and Measurement", description: "Units of measurement, system of units, dimensional analysis and its applications, errors and significant figures." },
      { code: "phy.kinematics", name: "Kinematics", description: "Frame of reference, motion in a straight line and plane, scalars and vectors, projectile motion, uniform circular motion." },
      { code: "phy.laws_motion", name: "Laws of Motion", description: "Newton's laws, conservation of linear momentum, equilibrium of concurrent forces, friction, dynamics of circular motion." },
      { code: "phy.work_energy", name: "Work, Energy and Power", description: "Work done by constant and variable forces, kinetic and potential energy, work-energy theorem, conservation of mechanical energy, collisions." },
      { code: "phy.rotational", name: "Rotational Motion", description: "Centre of mass, torque, angular momentum, moment of inertia, theorems of perpendicular and parallel axes, rolling motion." },
      { code: "phy.gravitation", name: "Gravitation", description: "Universal law of gravitation, acceleration due to gravity, gravitational potential energy, Kepler's laws, satellites and escape velocity." },
      { code: "phy.solids_liquids", name: "Properties of Solids and Liquids", description: "Elasticity, stress and strain, Hooke's law, fluid pressure, Bernoulli's principle, surface tension, viscosity, thermal expansion and conduction." },
      { code: "phy.thermodynamics", name: "Thermodynamics", description: "Thermal equilibrium, zeroth and first laws, isothermal and adiabatic processes, second law, heat engines, refrigerators." },
      { code: "phy.kinetic_theory", name: "Kinetic Theory of Gases", description: "Equation of state, kinetic theory postulates, RMS velocity, degrees of freedom, mean free path, equipartition of energy." },
      { code: "phy.oscillations_waves", name: "Oscillations and Waves", description: "Periodic motion, simple harmonic motion, energy in SHM, simple pendulum, wave motion, superposition, beats, Doppler effect." },
      { code: "phy.electrostatics", name: "Electrostatics", description: "Coulomb's law, electric field and potential, Gauss's law, capacitors and dielectrics." },
      { code: "phy.current_electricity", name: "Current Electricity", description: "Ohm's law, drift velocity, resistivity, Kirchhoff's laws, Wheatstone bridge, potentiometer, internal resistance." },
      { code: "phy.magnetic_effects", name: "Magnetic Effects of Current and Magnetism", description: "Biot-Savart law, Ampere's law, force on a moving charge, moving coil galvanometer, Earth's magnetism, magnetic materials." },
      { code: "phy.emi_ac", name: "Electromagnetic Induction and Alternating Currents", description: "Faraday's and Lenz's laws, self and mutual inductance, AC generator, LCR circuits, resonance, transformers." },
      { code: "phy.em_waves", name: "Electromagnetic Waves", description: "Displacement current, properties of EM waves, electromagnetic spectrum and uses." },
      { code: "phy.optics", name: "Optics", description: "Reflection, refraction, lenses, mirrors, prisms, optical instruments, wave optics — interference, diffraction and polarisation." },
      { code: "phy.dual_nature", name: "Dual Nature of Matter and Radiation", description: "Photoelectric effect, Einstein's equation, particle nature of light, de Broglie wavelength, Davisson-Germer experiment." },
      { code: "phy.atoms_nuclei", name: "Atoms and Nuclei", description: "Alpha-scattering, Bohr model, hydrogen spectrum, composition of nucleus, mass-energy relation, radioactivity, fission and fusion." },
      { code: "phy.electronic_devices", name: "Electronic Devices", description: "Energy bands in solids, semiconductors, p-n junction, diodes, rectifier, transistors, logic gates." },
      { code: "phy.communication", name: "Communication Systems", description: "Elements of a communication system, propagation of EM waves, modulation — amplitude and frequency." },
    ],
  },

  // ── CHEMISTRY ─────────────────────────────────────────────────────────
  {
    code: "CHEMISTRY",
    name: "Chemistry",
    weight: 1,
    topics: [
      { code: "chem.basic_concepts", name: "Some Basic Concepts in Chemistry", description: "Mole concept, stoichiometry, empirical and molecular formulae, laws of chemical combination." },
      { code: "chem.states_matter", name: "States of Matter", description: "Gas laws, ideal gas equation, kinetic theory of gases, real gases, liquefaction, properties of liquids and solids." },
      { code: "chem.atomic_structure", name: "Atomic Structure", description: "Bohr's model, dual nature of matter and radiation, quantum numbers, orbitals, Aufbau, Hund's rule, electronic configurations." },
      { code: "chem.bonding", name: "Chemical Bonding and Molecular Structure", description: "Ionic and covalent bonds, VSEPR, valence bond and MO theories, hybridisation, hydrogen bonding." },
      { code: "chem.thermodynamics", name: "Chemical Thermodynamics", description: "First and second laws, enthalpy, entropy, Gibbs free energy, Hess's law, spontaneity criteria." },
      { code: "chem.solutions", name: "Solutions", description: "Concentration units, vapour pressure, Raoult's law, colligative properties, abnormal molar mass, van't Hoff factor." },
      { code: "chem.equilibrium", name: "Equilibrium", description: "Chemical equilibrium, Kc and Kp, Le Chatelier's principle, ionic equilibrium, acids and bases, pH, buffer, solubility product." },
      { code: "chem.redox_electrochem", name: "Redox Reactions and Electrochemistry", description: "Oxidation states, balancing redox reactions, electrochemical cells, EMF, Nernst equation, Kohlrausch's law, electrolysis, batteries." },
      { code: "chem.kinetics", name: "Chemical Kinetics", description: "Rate of reaction, order, molecularity, integrated rate equations, half-life, Arrhenius equation, collision theory." },
      { code: "chem.surface", name: "Surface Chemistry", description: "Adsorption, catalysis, colloids, emulsions, micelles, properties of colloids." },
      { code: "chem.purification", name: "Purification and Characterisation of Organic Compounds", description: "Methods of purification, qualitative and quantitative analysis, determination of empirical and molecular formulae." },
      { code: "chem.hydrocarbons", name: "Hydrocarbons", description: "Alkanes, alkenes, alkynes and aromatic hydrocarbons — preparation, properties and reactions; aromaticity." },
      { code: "chem.organic_basics", name: "Some Basic Principles of Organic Chemistry", description: "Tetravalence of carbon, isomerism, electronic effects, reactive intermediates, methods of purification." },
      { code: "chem.halogens", name: "Organic Compounds Containing Halogens", description: "Haloalkanes and haloarenes — preparation, properties, SN1/SN2 mechanisms, polyhalogen compounds." },
      { code: "chem.oxygen_compounds", name: "Organic Compounds Containing Oxygen", description: "Alcohols, phenols, ethers, aldehydes, ketones and carboxylic acids — preparation, properties and uses." },
      { code: "chem.nitrogen_compounds", name: "Organic Compounds Containing Nitrogen", description: "Amines, nitro compounds, diazonium salts, cyanides, isocyanides — preparation and reactions." },
      { code: "chem.polymers", name: "Polymers", description: "Classification, methods of polymerisation, important natural and synthetic polymers, biodegradable polymers." },
      { code: "chem.biomolecules", name: "Biomolecules", description: "Carbohydrates, proteins, enzymes, vitamins, nucleic acids, hormones — structure and biological function." },
      { code: "chem.everyday_life", name: "Chemistry in Everyday Life", description: "Drugs and medicines, food chemistry, soaps and detergents, cleansing agents." },
      { code: "chem.practical", name: "Principles Related to Practical Chemistry", description: "Detection of elements, functional group identification, qualitative analysis of cations and anions, basic titrimetry." },
    ],
  },

  // ── MATHEMATICS ───────────────────────────────────────────────────────
  {
    code: "MATHEMATICS",
    name: "Mathematics",
    weight: 1,
    topics: [
      { code: "math.sets", name: "Sets, Relations and Functions", description: "Set operations, Cartesian product, types of relations and functions, composition and inverse." },
      { code: "math.complex_quad", name: "Complex Numbers and Quadratic Equations", description: "Algebra of complex numbers, modulus, argument, polar form, roots of quadratic equations, theory of equations." },
      { code: "math.matrices_det", name: "Matrices and Determinants", description: "Algebra of matrices, transpose, determinants up to order 3, properties, adjoint and inverse, system of linear equations." },
      { code: "math.permutation", name: "Permutations and Combinations", description: "Fundamental principle of counting, factorial, nPr and nCr, applications in selection and arrangement." },
      { code: "math.induction", name: "Mathematical Induction", description: "Principle of mathematical induction and its simple applications in algebraic and divisibility statements." },
      { code: "math.binomial", name: "Binomial Theorem and Its Simple Applications", description: "Binomial theorem for positive integral index, general and middle term, properties of binomial coefficients." },
      { code: "math.sequence_series", name: "Sequence and Series", description: "Arithmetic, geometric and harmonic progressions, AM-GM inequality, sums of special series." },
      { code: "math.limit_continuity_diff", name: "Limit, Continuity and Differentiability", description: "Limits of standard functions, continuity, differentiability, mean value theorems, applications of derivatives." },
      { code: "math.integral", name: "Integral Calculus", description: "Indefinite integration by substitution, parts and partial fractions; definite integrals and their properties; area under curves." },
      { code: "math.diff_eq", name: "Differential Equations", description: "Order, degree, formation, solution by separation of variables, homogeneous and linear differential equations." },
      { code: "math.coord_geo", name: "Co-ordinate Geometry", description: "Straight lines, conic sections — circle, parabola, ellipse and hyperbola; tangent and normal." },
      { code: "math.three_d_geo", name: "Three-Dimensional Geometry", description: "Direction cosines and ratios, equations of lines and planes, angle between lines and planes, distance formulae." },
      { code: "math.vectors", name: "Vector Algebra", description: "Addition, scalar and vector products, scalar triple product, applications to geometry." },
      { code: "math.statistics_prob", name: "Statistics and Probability", description: "Measures of dispersion; classical and axiomatic probability, conditional probability, Bayes' theorem, Bernoulli trials." },
      { code: "math.trigonometry", name: "Trigonometry", description: "Trigonometric ratios and identities, equations, properties of triangles, heights and distances, inverse trigonometric functions." },
      { code: "math.reasoning", name: "Mathematical Reasoning", description: "Mathematically acceptable statements, logical connectives, validating statements, contradiction and contrapositive." },
    ],
  },
];

export async function seedOjeeSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "OD_OJEE" } });
  if (!exam) {
    throw new Error("Run seedExams() first — OD_OJEE exam not found.");
  }
  console.log(`Seeding OJEE syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < ojeeSyllabus.length; sIdx++) {
    const s = ojeeSyllabus[sIdx];
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
  seedOjeeSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
