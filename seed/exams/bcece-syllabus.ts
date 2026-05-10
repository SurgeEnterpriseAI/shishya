// BCECE 2026 — full syllabus tree as published by BCECEB on bceceboard.bihar.gov.in.
// Pattern: Physics, Chemistry, Mathematics, Biology — 100 MCQs per section, 90 minutes each.
// Curriculum basis: Bihar Board (BSEB) / NCERT Class 11 + 12.
// Source: BCECEB BCECE 2026 Information Brochure / Subject-wise syllabus (bceceboard.bihar.gov.in/BCECEexSyllabus.php).
//
// Run after seedExams: npx tsx seed/exams/bcece-syllabus.ts

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

export const bceceSyllabus: SubjectSeed[] = [
  // ── PHYSICS ───────────────────────────────────────────────────────────
  {
    code: "PHYSICS",
    name: "Physics",
    weight: 1,
    topics: [
      { code: "phy.physical_world", name: "Physical World and Measurement", description: "Scope and excitement of physics, units of measurement, system of units, dimensional analysis, errors and significant figures." },
      { code: "phy.kinematics", name: "Kinematics", description: "Motion in a straight line and plane, scalars and vectors, projectile motion, uniform circular motion." },
      { code: "phy.laws_motion", name: "Laws of Motion", description: "Newton's three laws, conservation of momentum, friction, equilibrium, dynamics of circular motion." },
      { code: "phy.work_energy", name: "Work, Energy and Power", description: "Work done by constant and variable forces, kinetic and potential energy, work-energy theorem, conservation of mechanical energy, collisions." },
      { code: "phy.rotational", name: "Motion of System of Particles and Rigid Body", description: "Centre of mass, torque, angular momentum, moment of inertia, theorems of perpendicular and parallel axes, rolling motion." },
      { code: "phy.gravitation", name: "Gravitation", description: "Universal law of gravitation, acceleration due to gravity, gravitational potential energy, Kepler's laws, satellites and escape velocity." },
      { code: "phy.bulk_matter", name: "Properties of Bulk Matter", description: "Elasticity, fluid statics and dynamics, Bernoulli's principle, viscosity, surface tension, thermal expansion and conduction." },
      { code: "phy.thermodynamics", name: "Heat and Thermodynamics", description: "Thermal equilibrium, zeroth, first and second laws, isothermal and adiabatic processes, heat engines and refrigerators." },
      { code: "phy.kinetic_theory", name: "Behaviour of Perfect Gas and Kinetic Theory", description: "Ideal gas equation, kinetic theory postulates, RMS velocity, degrees of freedom, mean free path." },
      { code: "phy.oscillations_waves", name: "Oscillations and Waves", description: "Periodic motion, simple harmonic motion, simple pendulum, wave motion, principle of superposition, beats, Doppler effect." },
      { code: "phy.electrostatics", name: "Electrostatics", description: "Coulomb's law, electric field and potential, Gauss's law, capacitors and dielectrics." },
      { code: "phy.current_electricity", name: "Current Electricity", description: "Ohm's law, drift velocity, resistivity, Kirchhoff's laws, Wheatstone bridge, potentiometer, internal resistance." },
      { code: "phy.magnetic_effect", name: "Magnetic Effects of Current and Magnetism", description: "Biot-Savart law, Ampere's law, force on a moving charge, moving coil galvanometer, bar magnet, Earth's magnetism, magnetic materials." },
      { code: "phy.emi_ac", name: "Electromagnetic Induction and Alternating Currents", description: "Faraday's and Lenz's laws, self and mutual inductance, AC generator, LCR circuits, resonance, transformers." },
      { code: "phy.em_waves", name: "Electromagnetic Waves", description: "Displacement current, properties of EM waves, electromagnetic spectrum and uses." },
      { code: "phy.optics", name: "Optics", description: "Reflection, refraction, lenses, mirrors, prism, optical instruments, wave optics — interference, diffraction and polarisation." },
      { code: "phy.dual_nature", name: "Dual Nature of Matter and Radiation", description: "Photoelectric effect, Einstein's equation, particle nature of light, de Broglie hypothesis, Davisson-Germer experiment." },
      { code: "phy.atoms_nuclei", name: "Atoms and Nuclei", description: "Alpha-scattering, Bohr model, hydrogen spectrum, composition of nucleus, mass-energy relation, radioactivity, fission and fusion." },
      { code: "phy.electronic_devices", name: "Electronic Devices", description: "Energy bands in solids, semiconductors, p-n junction, diodes, rectifier, transistor characteristics, logic gates." },
      { code: "phy.communication", name: "Communication Systems", description: "Elements of a communication system, propagation of EM waves, modulation — amplitude and frequency." },
    ],
  },

  // ── CHEMISTRY ─────────────────────────────────────────────────────────
  {
    code: "CHEMISTRY",
    name: "Chemistry",
    weight: 1,
    topics: [
      { code: "chem.basic_concepts", name: "Some Basic Concepts of Chemistry", description: "Mole concept, stoichiometry, empirical and molecular formulae, laws of chemical combination." },
      { code: "chem.atomic_structure", name: "Structure of Atom", description: "Bohr's model, dual nature, quantum numbers, orbitals, Aufbau, Hund's rule, electronic configurations." },
      { code: "chem.periodicity", name: "Classification of Elements and Periodicity in Properties", description: "Long-form periodic table, periodic trends in atomic radii, ionisation energy, electron affinity, electronegativity." },
      { code: "chem.bonding", name: "Chemical Bonding and Molecular Structure", description: "Ionic and covalent bonds, VSEPR, valence bond and MO theories, hybridisation, hydrogen bonding." },
      { code: "chem.states_matter", name: "States of Matter: Gases and Liquids", description: "Gas laws, ideal gas equation, kinetic theory, real gases, liquefaction, vapour pressure, surface tension and viscosity." },
      { code: "chem.thermodynamics", name: "Thermodynamics", description: "First and second laws, enthalpy, entropy, Gibbs free energy, Hess's law, spontaneity criteria." },
      { code: "chem.equilibrium", name: "Equilibrium", description: "Chemical equilibrium, Kc and Kp, Le Chatelier's principle, ionic equilibrium, acids and bases, pH, buffer solutions, solubility product." },
      { code: "chem.redox", name: "Redox Reactions", description: "Oxidation states, balancing redox reactions, redox titrations, electron-transfer concept of oxidation and reduction." },
      { code: "chem.hydrogen", name: "Hydrogen", description: "Position in periodic table, isotopes, preparation and properties of hydrogen and water, hydrogen peroxide, heavy water." },
      { code: "chem.s_block", name: "s-Block Elements", description: "Group 1 (alkali metals) and Group 2 (alkaline earth metals) — properties, anomalous behaviour, important compounds." },
      { code: "chem.p_block_1", name: "p-Block Elements (Group 13-14)", description: "Boron and carbon family — properties, anomalous behaviour, important compounds." },
      { code: "chem.organic_basics", name: "Organic Chemistry — Some Basic Principles and Techniques", description: "Tetravalence of carbon, isomerism, methods of purification, qualitative and quantitative analysis, electronic effects, reactive intermediates." },
      { code: "chem.hydrocarbons", name: "Hydrocarbons", description: "Alkanes, alkenes, alkynes and aromatic hydrocarbons — preparation, properties and reactions; aromaticity." },
      { code: "chem.environmental", name: "Environmental Chemistry", description: "Air, water and soil pollution; greenhouse effect; ozone depletion; green chemistry approaches." },
      { code: "chem.solid_state", name: "Solid State", description: "Classification of solids, unit cells, packing efficiency, density of cubic crystals, defects, electrical and magnetic properties." },
      { code: "chem.solutions", name: "Solutions", description: "Concentration units, vapour pressure, Raoult's law, colligative properties, abnormal molar mass, van't Hoff factor." },
      { code: "chem.electrochemistry", name: "Electrochemistry", description: "Conductance in electrolytic solutions, electrochemical cells, EMF, Nernst equation, batteries, fuel cells, corrosion." },
      { code: "chem.kinetics", name: "Chemical Kinetics", description: "Rate of reaction, order, molecularity, integrated rate equations, half-life, Arrhenius equation, collision theory." },
      { code: "chem.surface", name: "Surface Chemistry", description: "Adsorption, catalysis, colloids, emulsions, micelles, properties of colloids." },
      { code: "chem.metallurgy", name: "General Principles and Processes of Isolation of Elements", description: "Occurrence and principles of extraction of metals, refining methods, metallurgy of aluminium, copper, zinc and iron." },
      { code: "chem.p_block_2", name: "p-Block Elements (Group 15-18)", description: "Nitrogen, oxygen, halogen and noble gas families — properties, anomalous behaviour, important compounds." },
      { code: "chem.d_f_block", name: "d- and f-Block Elements", description: "Transition and inner-transition elements, oxidation states, lanthanoid contraction, important compounds." },
      { code: "chem.coordination", name: "Coordination Compounds", description: "Werner's theory, IUPAC nomenclature, isomerism, valence bond and crystal field theories, importance in biology and industry." },
      { code: "chem.haloalkanes", name: "Haloalkanes and Haloarenes", description: "Nomenclature, preparation, physical and chemical properties, SN1/SN2 mechanisms, polyhalogen compounds." },
      { code: "chem.alcohol_phenol_ether", name: "Alcohols, Phenols and Ethers", description: "Preparation and properties of alcohols, phenols and ethers; commercially important alcohols." },
      { code: "chem.carbonyl_acid", name: "Aldehydes, Ketones and Carboxylic Acids", description: "Preparation, nucleophilic addition reactions, oxidation and reduction, acidity of carboxylic acids and reactions." },
      { code: "chem.nitrogen_organic", name: "Organic Compounds Containing Nitrogen", description: "Amines, diazonium salts, cyanides and isocyanides — preparation, properties and applications." },
      { code: "chem.biomolecules", name: "Biomolecules", description: "Carbohydrates, proteins, enzymes, vitamins, nucleic acids — structure and biological function." },
      { code: "chem.polymers", name: "Polymers", description: "Classification, methods of polymerisation, important natural and synthetic polymers, biodegradable polymers." },
      { code: "chem.everyday_life", name: "Chemistry in Everyday Life", description: "Drugs and medicines, food chemistry, cleansing agents — soaps and detergents." },
    ],
  },

  // ── MATHEMATICS ───────────────────────────────────────────────────────
  {
    code: "MATHEMATICS",
    name: "Mathematics",
    weight: 1,
    topics: [
      { code: "math.sets_functions", name: "Sets and Functions", description: "Sets and their representations, types of sets, set operations, Cartesian product, relations and functions, domain and range." },
      { code: "math.trigonometry", name: "Trigonometric Functions", description: "Trigonometric ratios, identities, equations, properties of triangles, heights and distances." },
      { code: "math.algebra_1", name: "Algebra (I)", description: "Principle of mathematical induction, complex numbers and quadratic equations, linear inequalities, permutation and combination, binomial theorem, sequence and series." },
      { code: "math.coord_geo_1", name: "Coordinate Geometry (I)", description: "Straight lines, conic sections — circle, parabola, ellipse and hyperbola; introduction to three-dimensional geometry." },
      { code: "math.calculus_1", name: "Calculus (I)", description: "Limits and derivatives — limits of standard functions, derivative as a rate measure, derivatives of polynomial and trigonometric functions." },
      { code: "math.statistics", name: "Statistics and Probability (I)", description: "Measures of dispersion, variance and standard deviation; classical and axiomatic probability, conditional probability." },
      { code: "math.relations_func_xii", name: "Relations and Functions (II)", description: "Types of relations, equivalence relations, types of functions, composition, invertibility, binary operations, inverse trigonometric functions." },
      { code: "math.algebra_2", name: "Algebra (II)", description: "Matrices and determinants — types, operations, transpose, determinants up to order 3, adjoint and inverse, solution of linear equations." },
      { code: "math.calculus_2", name: "Calculus (II)", description: "Continuity and differentiability, applications of derivatives, indefinite and definite integrals, area under curves, differential equations." },
      { code: "math.vectors_3d", name: "Vectors and Three-Dimensional Geometry (II)", description: "Vectors, scalar and vector products, scalar triple product; direction cosines, equations of lines and planes in space." },
      { code: "math.linear_programming", name: "Linear Programming", description: "Linear programming problems, mathematical formulation, graphical solution method, feasible and optimal solutions." },
      { code: "math.probability_xii", name: "Probability (II)", description: "Conditional probability, multiplication theorem, independent events, Bayes' theorem, random variables and Bernoulli trials." },
      { code: "math.mathematical_reasoning", name: "Mathematical Reasoning", description: "Mathematically acceptable statements, connectives, validating statements, contradiction and contrapositive." },
    ],
  },

  // ── BIOLOGY ───────────────────────────────────────────────────────────
  {
    code: "BIOLOGY",
    name: "Biology",
    weight: 1,
    topics: [
      { code: "bio.diversity", name: "Diversity in Living World", description: "What is living, biodiversity, classification, taxonomic categories; five-kingdom classification; plant and animal kingdoms." },
      { code: "bio.structural_org", name: "Structural Organisation in Animals and Plants", description: "Morphology and anatomy of flowering plants, structural organisation in animals (tissues), earthworm, cockroach and frog." },
      { code: "bio.cell", name: "Cell: Structure and Function", description: "Cell theory, prokaryotic and eukaryotic cells, cell organelles, cell cycle and division, biomolecules and enzymes." },
      { code: "bio.plant_physiology", name: "Plant Physiology", description: "Transport in plants, mineral nutrition, photosynthesis, respiration, plant growth and development." },
      { code: "bio.human_physiology", name: "Human Physiology", description: "Digestion and absorption, breathing and exchange of gases, body fluids and circulation, excretion, locomotion, neural and chemical coordination." },
      { code: "bio.reproduction", name: "Reproduction", description: "Reproduction in organisms, sexual reproduction in flowering plants, human reproduction, reproductive health." },
      { code: "bio.genetics", name: "Genetics and Evolution", description: "Mendelian genetics, chromosomal theory, molecular basis of inheritance, evolution — origin of life and theories." },
      { code: "bio.human_welfare", name: "Biology and Human Welfare", description: "Human health and disease, microbes in human welfare, strategies for enhancement in food production." },
      { code: "bio.biotechnology", name: "Biotechnology and Its Applications", description: "Principles and processes of biotechnology, applications in health and agriculture, genetically modified organisms." },
      { code: "bio.ecology", name: "Ecology and Environment", description: "Organisms and populations, ecosystems, biodiversity and conservation, environmental issues." },
    ],
  },
];

export async function seedBceceSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "BR_BCECE" } });
  if (!exam) {
    throw new Error("Run seedExams() first — BR_BCECE exam not found.");
  }
  console.log(`Seeding BCECE syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < bceceSyllabus.length; sIdx++) {
    const s = bceceSyllabus[sIdx];
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
  seedBceceSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
