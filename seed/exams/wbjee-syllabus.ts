// WBJEE 2026 — full syllabus tree as published by WBJEEB on wbjeeb.nic.in.
// Paper 1: Mathematics — 75 questions. Paper 2: Physics + Chemistry — 80 questions (40 + 40).
// Curriculum basis: WBCHSE / CBSE Class 11 + 12.
// Source: WBJEE 2026 Information Bulletin (cdnbbsr.s3waas.gov.in/.../202603101506582412.pdf).
//
// Run after seedExams: npx tsx seed/exams/wbjee-syllabus.ts

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

export const wbjeeSyllabus: SubjectSeed[] = [
  // ── MATHEMATICS ───────────────────────────────────────────────────────
  {
    code: "MATHEMATICS",
    name: "Mathematics",
    weight: 1,
    topics: [
      { code: "math.algebra", name: "Algebra",
        subtopics: [
          { code: "math.algebra.ap_gp_hp", name: "A.P., G.P., H.P.", description: "Arithmetic, geometric and harmonic progressions; means; sums of finite series." },
          { code: "math.algebra.sets_relations", name: "Sets, Relations and Mappings", description: "Set operations, types of relations, equivalence relations, functions and their inverses." },
          { code: "math.algebra.logarithms", name: "Logarithms", description: "Definition, laws of logarithms, change of base, common and natural logarithms." },
          { code: "math.algebra.complex", name: "Complex Numbers", description: "Algebra of complex numbers, modulus, argument, polar form, De Moivre's theorem, cube roots of unity." },
          { code: "math.algebra.permutation", name: "Permutation and Combination", description: "Counting principles, nPr and nCr formulas, circular and restricted permutations." },
          { code: "math.algebra.poly_quad", name: "Polynomial Equation and Quadratic Equation", description: "Roots and coefficients relations, nature of roots, common roots, theory of equations up to degree 4." },
          { code: "math.algebra.induction", name: "Principle of Mathematical Induction", description: "Statement and proof techniques using induction on natural numbers." },
          { code: "math.algebra.matrices", name: "Matrices and Determinants", description: "Algebra of matrices, transpose, inverse, determinants up to order three, Cramer's rule." },
          { code: "math.algebra.binomial", name: "Binomial Theorem (positive integral index)", description: "Expansion, general and middle term, properties of binomial coefficients." },
          { code: "math.algebra.statistics", name: "Statistics and Probability", description: "Measures of dispersion, classical and axiomatic probability, conditional probability, Bayes' theorem." },
        ],
      },
      { code: "math.trigonometry", name: "Trigonometry",
        subtopics: [
          { code: "math.trigonometry.functions", name: "Trigonometric Functions and Identities", description: "Compound, multiple and sub-multiple angles; transformation formulae; conditional identities." },
          { code: "math.trigonometry.equations", name: "Trigonometric Equations", description: "General solutions of trigonometric equations." },
          { code: "math.trigonometry.inverse", name: "Inverse Trigonometric Functions", description: "Domain, range, principal values and properties of inverse trig functions." },
          { code: "math.trigonometry.triangle", name: "Properties of Triangles", description: "Sine rule, cosine rule, projection formulae, area of triangle, in-radius and circum-radius." },
        ],
      },
      { code: "math.coord_2d", name: "Coordinate Geometry of Two Dimensions",
        subtopics: [
          { code: "math.coord_2d.straight_line", name: "Straight Line", description: "Slope, various forms of equations, distance, angle between lines, family of lines." },
          { code: "math.coord_2d.circle", name: "Circle", description: "General and standard equations, tangent, normal, family of circles, orthogonality." },
          { code: "math.coord_2d.conic", name: "Parabola, Ellipse and Hyperbola", description: "Standard equations, focus, directrix, eccentricity, tangents and normals." },
          { code: "math.coord_2d.transform", name: "Transformation of Axes", description: "Translation and rotation of coordinate axes." },
        ],
      },
      { code: "math.coord_3d", name: "Coordinate Geometry of Three Dimensions", description: "Direction cosines and ratios, equation of a straight line and plane in space, distance of a point from a plane, angle between line and plane." },
      { code: "math.calculus", name: "Calculus",
        subtopics: [
          { code: "math.calculus.limits", name: "Limits, Continuity and Differentiability", description: "Limits of standard functions, continuity, differentiability, derivative as a rate of change." },
          { code: "math.calculus.differential", name: "Differential Calculus", description: "Differentiation rules, derivatives of implicit and parametric functions, higher order derivatives." },
          { code: "math.calculus.integral", name: "Integral Calculus", description: "Indefinite integrals, methods of integration, definite integrals and their properties." },
          { code: "math.calculus.application", name: "Application of Calculus", description: "Tangent and normal, maxima and minima, area under curves, mean value theorems." },
          { code: "math.calculus.differential_eq", name: "Differential Equations", description: "Order, degree, formation and solution of first-order first-degree ODEs by separation of variables and linear method." },
        ],
      },
      { code: "math.vectors", name: "Vectors", description: "Addition, scalar and vector products, scalar triple product, application to geometry and mechanics." },
    ],
  },

  // ── PHYSICS ───────────────────────────────────────────────────────────
  {
    code: "PHYSICS",
    name: "Physics",
    weight: 1,
    topics: [
      { code: "phy.units_measurement", name: "Physical World, Measurements, Units and Dimensions", description: "SI units, dimensional analysis, errors in measurement, significant figures." },
      { code: "phy.kinematics", name: "Kinematics", description: "Motion in one and two dimensions, scalars and vectors, projectile motion, relative velocity." },
      { code: "phy.laws_motion", name: "Laws of Motion", description: "Newton's laws, conservation of momentum, friction, equilibrium of concurrent forces." },
      { code: "phy.com_friction", name: "Motion of Centre of Mass, Connected Systems, Friction", description: "Centre of mass, system of particles, pulley and connected-body problems, friction in dynamics." },
      { code: "phy.gravitation", name: "Gravitation", description: "Newton's law of gravitation, gravitational potential energy, Kepler's laws, satellite motion, escape velocity." },
      { code: "phy.bulk_matter", name: "Bulk Properties of Matter", description: "Elasticity, stress and strain, Hooke's law, surface tension, capillarity." },
      { code: "phy.viscosity", name: "Viscosity", description: "Coefficient of viscosity, Stokes' law, terminal velocity, Poiseuille's equation, Reynolds number." },
      { code: "phy.thermodynamics", name: "Thermodynamics", description: "Zeroth, first and second laws, isothermal and adiabatic processes, Carnot engine, entropy." },
      { code: "phy.kinetic_theory", name: "Kinetic Theory of Gases", description: "Postulates, pressure of an ideal gas, RMS speed, mean free path, equipartition of energy." },
      { code: "phy.oscillation_waves", name: "Oscillations and Waves", description: "Simple harmonic motion, energy in SHM, free, damped and forced oscillations, transverse and longitudinal waves, beats, Doppler effect." },
      { code: "phy.electrostatics", name: "Electrostatics", description: "Coulomb's law, electric field and potential, Gauss's law, capacitors, dielectrics." },
      { code: "phy.current_electricity", name: "Current Electricity", description: "Ohm's law, resistivity, Kirchhoff's laws, Wheatstone bridge, potentiometer, drift velocity." },
      { code: "phy.magnetic_effect", name: "Magnetic Effect of Current", description: "Biot-Savart law, Ampere's law, force on a current-carrying conductor, moving coil galvanometer." },
      { code: "phy.magnetics", name: "Magnetics", description: "Bar magnets, magnetic field of Earth, dia-, para- and ferromagnetism, hysteresis." },
      { code: "phy.emi_ac", name: "Electromagnetic Induction and Alternating Current", description: "Faraday's and Lenz's laws, self and mutual inductance, AC generator, LCR circuits, resonance, transformers." },
      { code: "phy.em_waves", name: "Electromagnetic Waves", description: "Displacement current, Maxwell's equations qualitatively, EM spectrum and applications." },
      { code: "phy.optics_ray", name: "Optics I (Ray Optics)", description: "Reflection and refraction, lens and mirror formulae, total internal reflection, optical instruments." },
      { code: "phy.optics_wave", name: "Optics II (Wave Optics)", description: "Huygens' principle, interference, Young's double-slit, diffraction, polarisation." },
      { code: "phy.dual_nature", name: "Particle Nature of Light and Wave-Particle Dualism", description: "Photoelectric effect, Einstein's equation, de Broglie wavelength, Davisson-Germer experiment." },
      { code: "phy.atomic", name: "Atomic Physics", description: "Bohr model of hydrogen atom, hydrogen spectrum, X-ray production and spectra." },
      { code: "phy.nuclear", name: "Nuclear Physics", description: "Composition of nucleus, mass defect, binding energy, radioactivity, nuclear fission and fusion." },
      { code: "phy.solid_state_electronics", name: "Solid State Electronics", description: "Energy bands, intrinsic and extrinsic semiconductors, p-n junction, diodes, transistors, logic gates." },
    ],
  },

  // ── CHEMISTRY ─────────────────────────────────────────────────────────
  {
    code: "CHEMISTRY",
    name: "Chemistry",
    weight: 1,
    topics: [
      { code: "chem.atoms_arithmetic", name: "Atoms, Molecules and Chemical Arithmetic", description: "Mole concept, stoichiometry, equivalent weight, empirical and molecular formulae." },
      { code: "chem.atomic_structure", name: "Atomic Structure", description: "Bohr model, dual nature of matter, quantum numbers, orbitals, electronic configurations." },
      { code: "chem.radioactivity", name: "Radioactivity and Nuclear Chemistry", description: "Alpha, beta, gamma decay, half-life, radioactive series, nuclear reactions and applications." },
      { code: "chem.periodic_table", name: "The Periodic Table and Chemical Families", description: "Long-form periodic table, periodic trends in atomic radii, ionisation energy, electron affinity, electronegativity." },
      { code: "chem.bonding", name: "Chemical Bonding and Molecular Structure", description: "Ionic, covalent and coordinate bonds, VSEPR, hybridisation, MO theory of diatomics, hydrogen bonding." },
      { code: "chem.coordination", name: "Coordination Compounds", description: "Werner's theory, IUPAC nomenclature, isomerism, valence bond and crystal field theory." },
      { code: "chem.solid_state", name: "Solid State", description: "Classification of solids, unit cells, packing efficiency, density of cubic crystals, defects, semiconductors." },
      { code: "chem.liquid_state", name: "Liquid State", description: "Vapour pressure, surface tension, viscosity and their dependence on temperature." },
      { code: "chem.gaseous_state", name: "Gaseous State", description: "Gas laws, ideal gas equation, kinetic theory, real gases and van der Waals equation, liquefaction." },
      { code: "chem.energetics_dynamics", name: "Chemical Energetics and Chemical Dynamics", description: "Thermodynamics laws, enthalpy, entropy, free energy, chemical equilibrium, Le Chatelier's principle, kinetics." },
      { code: "chem.solutions", name: "Physical Chemistry of Solutions", description: "Concentration units, Raoult's law, colligative properties, abnormal molar mass, van't Hoff factor." },
      { code: "chem.ionic_redox", name: "Ionic and Redox Equilibria", description: "Acid-base equilibria, pH, buffer solutions, solubility product, oxidation-reduction, electrochemical cells." },
      { code: "chem.hydrogen", name: "Hydrogen", description: "Position in periodic table, isotopes, preparation and properties of hydrogen and water, hydrogen peroxide, heavy water." },
      { code: "chem.non_metals", name: "Chemistry of Non-Metallic Elements and their Compounds", description: "Group 14-18 non-metals: occurrence, preparation and properties; oxoacids of nitrogen, phosphorus, sulphur, halogens." },
      { code: "chem.metals", name: "Chemistry of Metals", description: "s-, p-, d- and f-block metals; principles of metallurgy, transition and inner-transition element chemistry." },
      { code: "chem.industry", name: "Chemistry in Industry", description: "Large-scale manufacture of important chemicals — H2SO4, ammonia, HNO3, cement, glass." },
      { code: "chem.polymers", name: "Polymers", description: "Classification, methods of polymerisation, important natural and synthetic polymers, biodegradable polymers." },
      { code: "chem.surface", name: "Surface Chemistry", description: "Adsorption, catalysis, colloids, emulsions and gels, Tyndall effect, Brownian motion." },
      { code: "chem.environmental", name: "Environmental Chemistry", description: "Air, water and soil pollution; greenhouse effect; ozone depletion; green chemistry." },
      { code: "chem.organic_carbon", name: "Chemistry of Carbon Compounds", description: "General principles of organic chemistry: bonding, hybridisation, isomerism, electronic effects, reactive intermediates." },
      { code: "chem.organic_general", name: "General Organic Chemistry — Hydrocarbons", description: "Alkanes, alkenes and alkynes — preparation, properties and reaction mechanisms; aromaticity." },
      { code: "chem.haloalkanes", name: "Haloalkanes and Haloarenes", description: "Nomenclature, preparation, properties, SN1/SN2 and elimination reactions, polyhalogen compounds." },
      { code: "chem.alcohol_ether", name: "Alcohols, Phenols and Ethers", description: "Preparation, physical and chemical properties of alcohols, phenols and ethers; commercial importance." },
      { code: "chem.aromatic", name: "Aromatic Compounds", description: "Benzene, electrophilic aromatic substitution, directing effects, important aromatic compounds." },
      { code: "chem.carbonyl", name: "Aldehydes, Ketones and Carboxylic Acids", description: "Preparation, nucleophilic addition, oxidation, reduction and acidity; common reactions and uses." },
      { code: "chem.nitrogen_compounds", name: "Organic Compounds Containing Nitrogen", description: "Amines, nitro compounds, diazonium salts, cyanides, isocyanides — preparation and reactions." },
      { code: "chem.application_chem", name: "Application Oriented Chemistry", description: "Drugs and medicines, dyes, soaps and detergents, food additives." },
      { code: "chem.biomolecules", name: "Introduction to Bio-Molecules", description: "Carbohydrates, proteins, nucleic acids, vitamins and hormones — structure and biological function." },
      { code: "chem.qualitative", name: "Principles of Qualitative Analysis", description: "Detection of cations and anions in aqueous solutions, group reagents, basic radicals." },
    ],
  },
];

export async function seedWbjeeSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "WB_WBJEE" } });
  if (!exam) {
    throw new Error("Run seedExams() first — WB_WBJEE exam not found.");
  }
  console.log(`Seeding WBJEE syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < wbjeeSyllabus.length; sIdx++) {
    const s = wbjeeSyllabus[sIdx];
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
  seedWbjeeSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
