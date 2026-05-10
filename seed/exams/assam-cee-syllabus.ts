// Assam CEE (Common Entrance Examination) — full syllabus tree.
// Conducted by Assam Science and Technology University (ASTU) for B.E./B.Tech admissions.
// 120 MCQs: 40 Physics + 40 Chemistry + 40 Mathematics. 3-hour offline pen-and-paper test.
// Based on AHSEC (Assam Higher Secondary Education Council) / NCERT Class 11+12 curriculum.
// Source: astu.ac.in official Assam CEE syllabus (per AHSEC HS curriculum).
//
// Run after seedExams: npx tsx seed/exams/assam-cee-syllabus.ts

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

export const assamCeeSyllabus: SubjectSeed[] = [
  // ── PHYSICS (40 Qs) ──────────────────────────────────────────────────
  {
    code: "PHYSICS",
    name: "Physics",
    weight: 1,
    topics: [
      { code: "phy.measurement", name: "Units and Measurement", description: "SI units, dimensional analysis, errors and significant figures." },
      { code: "phy.kinematics_1d", name: "Motion in One Dimension", description: "Displacement, velocity, acceleration, equations of uniformly accelerated motion." },
      { code: "phy.kinematics_2d", name: "Motion in Two or Three Dimensions", description: "Projectile motion, uniform circular motion, relative velocity in 2D." },
      { code: "phy.laws_motion", name: "Laws of Motion", description: "Newton's laws, friction, free-body diagrams, dynamics on inclines." },
      { code: "phy.work_energy", name: "Work, Energy and Power", description: "Work-energy theorem, conservative forces, collisions, power." },
      { code: "phy.rotational", name: "Rotational Motion and Moment of Inertia", description: "Moment of inertia, torque, angular momentum, rolling motion." },
      { code: "phy.gravitation", name: "Gravitation", description: "Kepler's laws, escape velocity, satellites, gravitational potential." },
      { code: "phy.solids_fluids", name: "Solids and Fluids", description: "Elastic moduli, Bernoulli, viscosity, surface tension." },
      { code: "phy.heat_thermo", name: "Heat and Thermodynamics", description: "Calorimetry, laws of thermodynamics, heat engines and refrigerators." },
      { code: "phy.transference_heat", name: "Transference of Heat", description: "Conduction, convection, radiation, Stefan's law." },
      { code: "phy.oscillations", name: "Oscillations", description: "SHM, energy in SHM, simple and compound pendulum." },
      { code: "phy.waves", name: "Waves", description: "Wave equation, beats, standing waves, Doppler effect." },
      { code: "phy.electrostatics", name: "Electrostatics", description: "Coulomb's law, field, potential, Gauss's law, dielectrics." },
      { code: "phy.current_electricity", name: "Current Electricity", description: "Ohm's law, Kirchhoff, Wheatstone bridge, drift velocity." },
      { code: "phy.thermal_chemical_effects", name: "Thermal and Chemical Effects of Currents", description: "Joule's law, Peltier, Seebeck, Thomson effects, electrolysis." },
      { code: "phy.magnetic_effects", name: "Magnetic Effects of Currents", description: "Biot-Savart, Ampere's law, force on charge, cyclotron, solenoid." },
      { code: "phy.magnetostatics", name: "Magnetostatics", description: "Magnetic dipole, Earth's magnetism, dia/para/ferromagnetism." },
      { code: "phy.emi_ac", name: "Electromagnetic Induction and Alternating Currents", description: "Faraday, Lenz, self/mutual inductance, RLC circuits, transformer." },
      { code: "phy.em_waves", name: "Electromagnetic Waves", description: "Maxwell's equations, EM spectrum." },
      { code: "phy.ray_optics", name: "Ray Optics", description: "Reflection, refraction, lenses, prism, optical instruments." },
      { code: "phy.wave_optics", name: "Wave Optics", description: "Huygens, interference, diffraction, polarisation." },
      { code: "phy.electron_photons", name: "Electron and Photons", description: "Photoelectric effect, Einstein's equation, work function." },
      { code: "phy.atoms", name: "Atoms", description: "Rutherford and Bohr models, hydrogen spectrum." },
      { code: "phy.molecules_nuclei", name: "Molecules and Nuclei", description: "Mass defect, fission, fusion, decay laws." },
      { code: "phy.semiconductors", name: "Solids and Semiconductor Devices", description: "P-N junction, diodes, BJT, logic gates." },
    ],
  },

  // ── CHEMISTRY (40 Qs) ────────────────────────────────────────────────
  {
    code: "CHEMISTRY",
    name: "Chemistry",
    weight: 1,
    topics: [
      { code: "chem.basic_concepts", name: "Some Basic Concepts", description: "Mole concept, stoichiometry, empirical and molecular formulae." },
      { code: "chem.states_matter", name: "States of Matter", description: "Gas laws, ideal vs real gases, van der Waals, liquid state." },
      { code: "chem.atomic_structure", name: "Atomic Structure", description: "Bohr model, quantum numbers, orbitals, electron configuration." },
      { code: "chem.solutions", name: "Solutions", description: "Concentration units, Raoult's law, colligative properties." },
      { code: "chem.thermodynamics", name: "Chemical Energetics and Thermodynamics", description: "First law, enthalpy, entropy, Gibbs energy." },
      { code: "chem.equilibrium", name: "Chemical Equilibrium", description: "Kc, Kp, ionic equilibrium, pH, buffers, Ksp." },
      { code: "chem.redox_electro", name: "Redox Reactions and Electrochemistry", description: "Oxidation numbers, balancing, galvanic cells, Nernst equation." },
      { code: "chem.kinetics", name: "Rates of Chemical Reactions and Chemical Kinetics", description: "Rate laws, order, integrated rate equations, Arrhenius." },
      { code: "chem.surface", name: "Surface Chemistry", description: "Adsorption, catalysis, colloids, emulsions." },
      { code: "chem.periodic", name: "Chemical Families – Periodic Properties", description: "Periodic trends, classification of elements." },
      { code: "chem.bonding", name: "Chemical Bonding and Molecular Structure", description: "Ionic, covalent, coordinate; VSEPR, hybridization, MOT." },
      { code: "chem.nonmetals_1", name: "Chemistry of Non-Metals (I)", description: "Hydrogen, group 14 non-metals." },
      { code: "chem.nonmetals_2", name: "Chemistry of Non-Metals (II)", description: "Group 15-18 non-metals — preparation, properties." },
      { code: "chem.heavy_metals", name: "Heavy Metals", description: "Iron, copper, lead, zinc — metallurgy and compounds." },
      { code: "chem.representative", name: "Chemistry of Representative Elements", description: "s-block and p-block representative elements." },
      { code: "chem.alkali", name: "Alkali Metals", description: "Group 1 — properties, compounds, biological role." },
      { code: "chem.alkaline_earth", name: "Alkaline Earth Metals", description: "Group 2 — properties, compounds, hardness of water." },
      { code: "chem.boron_carbon", name: "Boron and Carbon Family", description: "Group 13 and 14 — properties and important compounds." },
      { code: "chem.nitrogen_oxygen", name: "Nitrogen and Oxygen Family", description: "Group 15 and 16 — properties and important compounds." },
      { code: "chem.halogens_noble", name: "Halogen Family and Noble Gases", description: "Group 17 and 18 — properties and uses." },
      { code: "chem.transition", name: "Transition Metals including Lanthanides", description: "d- and f-block elements, oxidation states, complexes." },
      { code: "chem.coordination", name: "Coordination Compounds", description: "Werner's theory, IUPAC, isomerism, VBT, CFT." },
      { code: "chem.nuclear", name: "Nuclear Chemistry", description: "Radioactivity, decay laws, fission, fusion, isotopes in tracer." },
      { code: "chem.organic_basics", name: "Some Basic Principles of Organic Chemistry", description: "IUPAC nomenclature, isomerism, electron displacement effects." },
      { code: "chem.organic_classification", name: "Classification of Organic Compounds", description: "Functional groups, homologous series." },
      { code: "chem.hydrocarbons", name: "Hydrocarbons", description: "Alkanes, alkenes, alkynes, aromatic hydrocarbons." },
      { code: "chem.haloalkanes", name: "Organic Compounds containing Halogens", description: "Haloalkanes and haloarenes — SN1/SN2, elimination." },
      { code: "chem.alcohols_ethers", name: "Organic Compounds containing Oxygen", description: "Alcohols, phenols, ethers, aldehydes, ketones, carboxylic acids." },
      { code: "chem.amines", name: "Organic Compounds containing Nitrogen", description: "Amines, nitro compounds, diazonium salts." },
      { code: "chem.polymers", name: "Synthetic and Natural Polymers", description: "Addition, condensation, biodegradable polymers." },
      { code: "chem.biomolecules", name: "Biomolecules and Biological Processes", description: "Carbohydrates, proteins, enzymes, vitamins, nucleic acids." },
      { code: "chem.everyday_life", name: "Chemistry in Action", description: "Drugs, soaps, detergents, food preservatives." },
      { code: "chem.environmental", name: "Environmental Chemistry", description: "Air, water, soil pollution, green chemistry." },
    ],
  },

  // ── MATHEMATICS (40 Qs) ──────────────────────────────────────────────
  {
    code: "MATHEMATICS",
    name: "Mathematics",
    weight: 1,
    topics: [
      { code: "math.sets", name: "Sets and Functions", description: "Set operations, types of relations, domain/range, composite functions." },
      { code: "math.algebra", name: "Algebra", description: "Quadratic equations, sequences, binomial theorem, complex numbers." },
      { code: "math.matrices_det", name: "Matrices and Determinants", description: "Operations, properties, inverse, system of linear equations." },
      { code: "math.trigonometry", name: "Trigonometry", description: "Identities, equations, sum/difference and multiple angle formulas, ITF." },
      { code: "math.coordinate", name: "Coordinate Geometry (2D)", description: "Straight lines, circles, parabola, ellipse, hyperbola." },
      { code: "math.three_d_geom", name: "Three-Dimensional Geometry", description: "Direction cosines/ratios, lines, planes, angles." },
      { code: "math.calculus_limits", name: "Limits and Continuity", description: "Limits, continuity, differentiability." },
      { code: "math.calculus_diff", name: "Differential Calculus", description: "Differentiation rules, applications — tangent, normal, max-min." },
      { code: "math.calculus_integ", name: "Integral Calculus", description: "Indefinite and definite integrals, applications — area." },
      { code: "math.diff_equations", name: "Differential Equations", description: "Order, degree, variable separable, linear, homogeneous." },
      { code: "math.vectors", name: "Vector Algebra", description: "Dot/cross product, scalar triple product, projections." },
      { code: "math.statistics", name: "Statistics", description: "Mean deviation, variance, SD, coefficient of variation." },
      { code: "math.probability", name: "Probability", description: "Conditional probability, Bayes' theorem, binomial distribution." },
      { code: "math.lpp", name: "Linear Programming", description: "LPP formulation, graphical method, feasible region." },
      { code: "math.permutations", name: "Permutations and Combinations", description: "nPr, nCr, circular arrangements." },
      { code: "math.math_reasoning", name: "Mathematical Reasoning", description: "Logical statements, validity of arguments." },
    ],
  },
];

export async function seedAssamCeeSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "AS_ASSAMCEE" } });
  if (!exam) {
    throw new Error("Run seedExams() first — AS_ASSAMCEE exam not found.");
  }
  console.log(`Seeding Assam CEE syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < assamCeeSyllabus.length; sIdx++) {
    const s = assamCeeSyllabus[sIdx];
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
  console.log(`✓ Seeded Assam CEE syllabus. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedAssamCeeSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
