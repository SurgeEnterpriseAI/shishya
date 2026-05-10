// KCET (Karnataka Common Entrance Test) — full syllabus tree.
// Based on Karnataka 1st PUC + 2nd PUC (NCERT-aligned) curriculum.
// Engineering: Physics 60 + Chemistry 60 + Mathematics 60.
// Medical/Pharmacy/Agriculture: Physics 60 + Chemistry 60 + Biology 60.
// 1 mark per question, no negative marking, 80 minutes per paper.
//
// Run after seedExams: npx tsx seed/exams/kcet-syllabus.ts

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

export const kcetSyllabus: SubjectSeed[] = [
  // ── PHYSICS (60 Qs) ───────────────────────────────────────────────────
  {
    code: "PHYSICS",
    name: "Physics",
    weight: 1,
    topics: [
      // 1st PUC (Class 11)
      { code: "phy.physical_world", name: "Physical World (1st PUC)", description: "Scope and excitement of physics, fundamental forces, role in society." },
      { code: "phy.units_measurement", name: "Units and Measurement (1st PUC)", description: "SI units, dimensional analysis, errors, significant figures." },
      { code: "phy.motion_straight_line", name: "Motion in a Straight Line (1st PUC)", description: "Position, displacement, velocity, acceleration, kinematic equations." },
      { code: "phy.motion_plane", name: "Motion in a Plane (1st PUC)", description: "Vectors, projectile motion, uniform circular motion." },
      { code: "phy.laws_motion", name: "Laws of Motion (1st PUC)", description: "Newton's laws, friction, dynamics of circular motion." },
      { code: "phy.work_energy_power", name: "Work, Energy and Power (1st PUC)", description: "Work-energy theorem, conservative forces, collisions." },
      { code: "phy.system_particles", name: "System of Particles and Rotational Motion (1st PUC)", description: "Centre of mass, torque, angular momentum, moment of inertia." },
      { code: "phy.gravitation", name: "Gravitation (1st PUC)", description: "Kepler's laws, gravitational potential, satellites, escape velocity." },
      { code: "phy.mech_solids", name: "Mechanical Properties of Solids (1st PUC)", description: "Stress, strain, elasticity, Hooke's law, elastic moduli." },
      { code: "phy.mech_fluids", name: "Mechanical Properties of Fluids (1st PUC)", description: "Pressure, Pascal's law, Bernoulli's principle, viscosity, surface tension." },
      { code: "phy.thermal_props", name: "Thermal Properties of Matter (1st PUC)", description: "Temperature, expansion, calorimetry, heat transfer." },
      { code: "phy.thermodynamics", name: "Thermodynamics (1st PUC)", description: "First and second laws, heat engines, refrigerators, Carnot cycle." },
      { code: "phy.kinetic_theory", name: "Kinetic Theory (1st PUC)", description: "Behavior of gases, molecular interpretation, mean free path, equipartition." },
      { code: "phy.oscillations", name: "Oscillations (1st PUC)", description: "SHM, energy in SHM, damped and forced oscillations, resonance." },
      { code: "phy.waves", name: "Waves (1st PUC)", description: "Transverse and longitudinal waves, superposition, Doppler effect." },
      // 2nd PUC (Class 12)
      { code: "phy.electric_charges", name: "Electric Charges and Fields (2nd PUC)", description: "Coulomb's law, electric field, Gauss's law, dipole." },
      { code: "phy.electrostatic_potential", name: "Electrostatic Potential and Capacitance (2nd PUC)", description: "Potential, equipotential surfaces, capacitors, dielectrics." },
      { code: "phy.current_electricity", name: "Current Electricity (2nd PUC)", description: "Drift velocity, Ohm's law, Kirchhoff's laws, Wheatstone bridge, potentiometer." },
      { code: "phy.moving_charges", name: "Moving Charges and Magnetism (2nd PUC)", description: "Biot-Savart, Ampere's law, force on conductor, cyclotron, galvanometer." },
      { code: "phy.magnetism_matter", name: "Magnetism and Matter (2nd PUC)", description: "Bar magnet, Earth's magnetism, dia/para/ferromagnetism." },
      { code: "phy.emi", name: "Electromagnetic Induction (2nd PUC)", description: "Faraday's law, Lenz's law, self/mutual inductance, AC generator." },
      { code: "phy.alternating_current", name: "Alternating Current (2nd PUC)", description: "RMS values, RLC circuits, resonance, transformer, power factor." },
      { code: "phy.em_waves", name: "Electromagnetic Waves (2nd PUC)", description: "Maxwell's equations, displacement current, EM spectrum." },
      { code: "phy.ray_optics", name: "Ray Optics and Optical Instruments (2nd PUC)", description: "Reflection, refraction, lenses, optical instruments — microscope, telescope." },
      { code: "phy.wave_optics", name: "Wave Optics (2nd PUC)", description: "Huygens principle, interference, diffraction, polarization." },
      { code: "phy.dual_nature", name: "Dual Nature of Radiation and Matter (2nd PUC)", description: "Photoelectric effect, Einstein's equation, de Broglie wavelength." },
      { code: "phy.atoms", name: "Atoms (2nd PUC)", description: "Rutherford and Bohr models, hydrogen spectra, energy levels." },
      { code: "phy.nuclei", name: "Nuclei (2nd PUC)", description: "Mass-energy, binding energy, fission, fusion, radioactive decay." },
      { code: "phy.semiconductors", name: "Semiconductor Electronics (2nd PUC)", description: "Energy bands, p-n junction, diodes, transistor, logic gates." },
      { code: "phy.communication", name: "Communication Systems (2nd PUC)", description: "Modulation, propagation, bandwidth, communication block diagrams." },
    ],
  },

  // ── CHEMISTRY (60 Qs) ─────────────────────────────────────────────────
  {
    code: "CHEMISTRY",
    name: "Chemistry",
    weight: 1,
    topics: [
      // 1st PUC
      { code: "chem.basic_concepts", name: "Some Basic Concepts of Chemistry (1st PUC)", description: "Mole concept, stoichiometry, empirical and molecular formula." },
      { code: "chem.atomic_structure", name: "Structure of Atom (1st PUC)", description: "Bohr's model, dual nature of electron, quantum numbers, orbitals." },
      { code: "chem.classification", name: "Classification of Elements and Periodicity (1st PUC)", description: "Modern periodic law, periodic trends, electronic configuration." },
      { code: "chem.bonding", name: "Chemical Bonding and Molecular Structure (1st PUC)", description: "Ionic, covalent bonds, VSEPR, hybridization, MO theory." },
      { code: "chem.states_matter", name: "States of Matter — Gases and Liquids (1st PUC)", description: "Gas laws, ideal gas equation, real gas behaviour." },
      { code: "chem.thermodynamics_11", name: "Thermodynamics (1st PUC)", description: "First law, enthalpy, Hess's law, second law, Gibbs free energy." },
      { code: "chem.equilibrium_11", name: "Equilibrium (1st PUC)", description: "Chemical and ionic equilibrium, Kc/Kp, Le Chatelier, pH, buffers, Ksp." },
      { code: "chem.redox", name: "Redox Reactions (1st PUC)", description: "Oxidation number, balancing redox equations, redox titrations." },
      { code: "chem.hydrogen", name: "Hydrogen (1st PUC)", description: "Position in periodic table, isotopes, hydrides, hard/soft water." },
      { code: "chem.s_block", name: "s-Block Elements (1st PUC)", description: "Alkali and alkaline earth metals, anomalous behaviour, diagonal relationship." },
      { code: "chem.p_block_11", name: "p-Block Elements — Groups 13 and 14 (1st PUC)", description: "Boron family, carbon family — properties, important compounds." },
      { code: "chem.organic_basics_11", name: "Organic Chemistry — Some Basic Principles (1st PUC)", description: "IUPAC nomenclature, isomerism, electronic effects, reactive intermediates." },
      { code: "chem.hydrocarbons", name: "Hydrocarbons (1st PUC)", description: "Alkanes, alkenes, alkynes, aromatic hydrocarbons, mechanisms." },
      { code: "chem.environmental_chem", name: "Environmental Chemistry (1st PUC)", description: "Air, water, soil pollution; greenhouse effect; acid rain." },
      // 2nd PUC
      { code: "chem.solid_state", name: "Solid State (2nd PUC)", description: "Crystalline vs amorphous, unit cells, packing, defects, properties." },
      { code: "chem.solutions", name: "Solutions (2nd PUC)", description: "Concentration units, Raoult's law, colligative properties, abnormal molar mass." },
      { code: "chem.electrochemistry", name: "Electrochemistry (2nd PUC)", description: "Galvanic cells, Nernst equation, conductance, batteries, fuel cells, corrosion." },
      { code: "chem.chemical_kinetics", name: "Chemical Kinetics (2nd PUC)", description: "Rate, order, molecularity, Arrhenius equation, integrated rate equations." },
      { code: "chem.surface_chemistry", name: "Surface Chemistry (2nd PUC)", description: "Adsorption, catalysis, colloids, emulsions." },
      { code: "chem.metallurgy", name: "General Principles of Isolation of Elements (2nd PUC)", description: "Concentration, reduction, refining of metals, thermodynamic principles." },
      { code: "chem.p_block_12", name: "p-Block Elements (2nd PUC)", description: "Groups 15-18 — properties, oxoacids, allotropes, anomalous behaviour." },
      { code: "chem.d_f_block", name: "d- and f-Block Elements (2nd PUC)", description: "Transition metals, lanthanoids, actinoids, complex formation." },
      { code: "chem.coordination", name: "Coordination Compounds (2nd PUC)", description: "Werner theory, IUPAC, isomerism, VBT, CFT, applications." },
      { code: "chem.haloalkanes", name: "Haloalkanes and Haloarenes (2nd PUC)", description: "Nomenclature, SN1/SN2, elimination, polyhalogen compounds." },
      { code: "chem.alcohols", name: "Alcohols, Phenols and Ethers (2nd PUC)", description: "Preparation, properties, reactions, mechanism of dehydration." },
      { code: "chem.aldehydes_ketones", name: "Aldehydes, Ketones and Carboxylic Acids (2nd PUC)", description: "Nucleophilic addition, oxidation, named reactions, acidity." },
      { code: "chem.amines", name: "Amines (2nd PUC)", description: "Classification, preparation, properties, diazonium salts." },
      { code: "chem.biomolecules", name: "Biomolecules (2nd PUC)", description: "Carbohydrates, proteins, vitamins, nucleic acids, hormones." },
      { code: "chem.polymers", name: "Polymers (2nd PUC)", description: "Classification, polymerisation methods, important polymers." },
      { code: "chem.everyday_life", name: "Chemistry in Everyday Life (2nd PUC)", description: "Drugs, antiseptics, soaps, food additives." },
    ],
  },

  // ── MATHEMATICS (60 Qs) ───────────────────────────────────────────────
  {
    code: "MATHEMATICS",
    name: "Mathematics",
    weight: 1,
    topics: [
      // 1st PUC
      { code: "math.sets", name: "Sets (1st PUC)", description: "Sets, types, operations, Venn diagrams, applications." },
      { code: "math.relations_functions_11", name: "Relations and Functions (1st PUC)", description: "Cartesian product, types of relations and functions, composition." },
      { code: "math.trig_functions", name: "Trigonometric Functions (1st PUC)", description: "Trig identities, equations, sum/difference and multiple-angle formulas." },
      { code: "math.principle_mathematical_induction", name: "Principle of Mathematical Induction (1st PUC)", description: "PMI proofs for natural number statements." },
      { code: "math.complex_numbers", name: "Complex Numbers and Quadratic Equations (1st PUC)", description: "Argand plane, modulus, polar form, quadratic with complex roots." },
      { code: "math.linear_inequalities", name: "Linear Inequalities (1st PUC)", description: "Algebraic and graphical solutions in one and two variables." },
      { code: "math.permutations", name: "Permutations and Combinations (1st PUC)", description: "Counting principle, nPr, nCr, applications." },
      { code: "math.binomial", name: "Binomial Theorem (1st PUC)", description: "Expansion for positive integral index, general term, middle term." },
      { code: "math.sequences", name: "Sequences and Series (1st PUC)", description: "AP, GP, sum of n terms, sum of special series." },
      { code: "math.straight_lines", name: "Straight Lines (1st PUC)", description: "Slope, forms of line equations, distance, angle between lines." },
      { code: "math.conic_sections", name: "Conic Sections (1st PUC)", description: "Circle, parabola, ellipse, hyperbola — standard forms." },
      { code: "math.intro_3d_geometry", name: "Introduction to Three-Dimensional Geometry (1st PUC)", description: "3D coordinates, distance, section formula." },
      { code: "math.limits_derivatives", name: "Limits and Derivatives (1st PUC)", description: "Limit definition, standard limits, derivatives of basic functions." },
      { code: "math.mathematical_reasoning", name: "Mathematical Reasoning (1st PUC)", description: "Statements, connectives, validity of arguments." },
      { code: "math.statistics_11", name: "Statistics (1st PUC)", description: "Mean deviation, variance, standard deviation, coefficient of variation." },
      { code: "math.probability_11", name: "Probability (1st PUC)", description: "Sample space, events, axiomatic probability, Boole's inequality." },
      // 2nd PUC
      { code: "math.relations_functions_12", name: "Relations and Functions (2nd PUC)", description: "Types, composition, invertibility, binary operations." },
      { code: "math.inverse_trig", name: "Inverse Trigonometric Functions (2nd PUC)", description: "Domain, range, principal values, properties." },
      { code: "math.matrices", name: "Matrices (2nd PUC)", description: "Operations, transpose, symmetric matrices, elementary transformations, inverse." },
      { code: "math.determinants", name: "Determinants (2nd PUC)", description: "Properties, minors, cofactors, adjoint, system of linear equations." },
      { code: "math.continuity", name: "Continuity and Differentiability (2nd PUC)", description: "Continuity tests, chain rule, implicit differentiation, MVT, Rolle's theorem." },
      { code: "math.applications_derivatives", name: "Applications of Derivatives (2nd PUC)", description: "Rate of change, increasing/decreasing, tangent/normal, maxima/minima." },
      { code: "math.integrals", name: "Integrals (2nd PUC)", description: "Indefinite integrals, by substitution/parts/partial fractions, definite integrals." },
      { code: "math.applications_integrals", name: "Applications of Integrals (2nd PUC)", description: "Area under curves, between curves." },
      { code: "math.differential_equations", name: "Differential Equations (2nd PUC)", description: "Order, degree, formation, variable separable, linear, homogeneous DEs." },
      { code: "math.vectors", name: "Vector Algebra (2nd PUC)", description: "Vectors in space, dot/cross product, scalar triple product, projections." },
      { code: "math.three_d_geometry", name: "Three-Dimensional Geometry (2nd PUC)", description: "Direction cosines, lines, planes, distance and angle formulas." },
      { code: "math.linear_programming", name: "Linear Programming (2nd PUC)", description: "LPP, graphical method, feasible region, optimization." },
      { code: "math.probability_12", name: "Probability (2nd PUC)", description: "Conditional probability, Bayes' theorem, random variables, binomial distribution." },
    ],
  },

  // ── BIOLOGY (60 Qs — Medical/Pharmacy/Agriculture Track) ──────────────
  {
    code: "BIOLOGY",
    name: "Biology",
    weight: 1,
    topics: [
      // 1st PUC (~40% weight)
      { code: "bio.living_world", name: "The Living World (1st PUC)", description: "Diversity, taxonomic categories, taxonomical aids." },
      { code: "bio.biological_classification", name: "Biological Classification (1st PUC)", description: "Five-kingdom system, monera, protista, fungi, virus, viroids, lichens." },
      { code: "bio.plant_kingdom", name: "Plant Kingdom (1st PUC)", description: "Algae, bryophytes, pteridophytes, gymnosperms, angiosperms." },
      { code: "bio.animal_kingdom", name: "Animal Kingdom (1st PUC)", description: "Classification of non-chordates and chordates, salient features." },
      { code: "bio.morphology_plants", name: "Morphology of Flowering Plants (1st PUC)", description: "Root, stem, leaf, inflorescence, flower, fruit, seed; floral diagram." },
      { code: "bio.anatomy_plants", name: "Anatomy of Flowering Plants (1st PUC)", description: "Plant tissues, tissue systems, anatomy of dicot and monocot." },
      { code: "bio.structural_animals", name: "Structural Organisation in Animals (1st PUC)", description: "Animal tissues, morphology and anatomy of cockroach/frog/earthworm." },
      { code: "bio.cell_unit_life", name: "Cell — The Unit of Life (1st PUC)", description: "Cell theory, prokaryotic and eukaryotic cells, organelles." },
      { code: "bio.biomolecules_11", name: "Biomolecules (1st PUC)", description: "Carbohydrates, proteins, lipids, enzymes, nucleic acids." },
      { code: "bio.cell_cycle", name: "Cell Cycle and Cell Division (1st PUC)", description: "Phases of cell cycle, mitosis, meiosis, significance." },
      { code: "bio.transport_plants", name: "Transport in Plants (1st PUC)", description: "Diffusion, osmosis, transpiration, water and mineral uptake, translocation." },
      { code: "bio.mineral_nutrition", name: "Mineral Nutrition (1st PUC)", description: "Essential elements, deficiency symptoms, nitrogen cycle." },
      { code: "bio.photosynthesis", name: "Photosynthesis in Higher Plants (1st PUC)", description: "Pigments, light and dark reactions, C3/C4/CAM, photorespiration." },
      { code: "bio.respiration_plants", name: "Respiration in Plants (1st PUC)", description: "Glycolysis, Krebs cycle, ETS, fermentation, respiratory quotient." },
      { code: "bio.plant_growth", name: "Plant Growth and Development (1st PUC)", description: "Growth phases, plant hormones, photoperiodism, vernalization." },
      { code: "bio.digestion", name: "Digestion and Absorption (1st PUC)", description: "Human digestive system, digestion of nutrients, disorders." },
      { code: "bio.breathing", name: "Breathing and Exchange of Gases (1st PUC)", description: "Respiratory system, gas exchange, transport, regulation." },
      { code: "bio.body_fluids", name: "Body Fluids and Circulation (1st PUC)", description: "Blood, heart, cardiac cycle, ECG, lymphatic system, disorders." },
      { code: "bio.excretory", name: "Excretory Products and their Elimination (1st PUC)", description: "Nephron, urine formation, regulation, dialysis." },
      { code: "bio.locomotion", name: "Locomotion and Movement (1st PUC)", description: "Muscle types, sliding filament theory, joints, disorders." },
      { code: "bio.neural_control", name: "Neural Control and Coordination (1st PUC)", description: "Nervous system, neuron, reflex, sense organs." },
      { code: "bio.chemical_coordination", name: "Chemical Coordination and Integration (1st PUC)", description: "Endocrine glands, hormones, mechanism of hormone action." },
      // 2nd PUC (~60% weight)
      { code: "bio.reproduction_organisms", name: "Reproduction in Organisms (2nd PUC)", description: "Asexual and sexual reproduction, life span, life cycles." },
      { code: "bio.sexual_repro_plants", name: "Sexual Reproduction in Flowering Plants (2nd PUC)", description: "Microsporogenesis, megasporogenesis, double fertilization, embryogeny." },
      { code: "bio.human_reproduction", name: "Human Reproduction (2nd PUC)", description: "Male/female reproductive systems, gametogenesis, menstrual cycle, embryogenesis." },
      { code: "bio.reproductive_health", name: "Reproductive Health (2nd PUC)", description: "Population control, contraception, STDs, infertility, ART." },
      { code: "bio.principles_inheritance", name: "Principles of Inheritance and Variation (2nd PUC)", description: "Mendelism, linkage, sex-linked inheritance, mutations, pedigree." },
      { code: "bio.molecular_inheritance", name: "Molecular Basis of Inheritance (2nd PUC)", description: "DNA, replication, transcription, translation, lac operon, genetic code." },
      { code: "bio.evolution", name: "Evolution (2nd PUC)", description: "Origin of life, evidence of evolution, mechanisms, human evolution." },
      { code: "bio.health_disease", name: "Human Health and Disease (2nd PUC)", description: "Pathogens, immunity, AIDS, cancer, drug abuse." },
      { code: "bio.food_production", name: "Strategies for Enhancement in Food Production (2nd PUC)", description: "Plant breeding, animal husbandry, tissue culture, biofortification." },
      { code: "bio.microbes_welfare", name: "Microbes in Human Welfare (2nd PUC)", description: "Microbes in food, industry, sewage, biogas, biocontrol." },
      { code: "bio.biotech_principles", name: "Biotechnology — Principles and Processes (2nd PUC)", description: "Genetic engineering, restriction enzymes, vectors, PCR, bioreactors." },
      { code: "bio.biotech_applications", name: "Biotechnology and its Applications (2nd PUC)", description: "Transgenic organisms, recombinant insulin, gene therapy, GMO." },
      { code: "bio.organisms_populations", name: "Organisms and Populations (2nd PUC)", description: "Ecological factors, population attributes, growth, interactions." },
      { code: "bio.ecosystem", name: "Ecosystem (2nd PUC)", description: "Productivity, food chains, energy flow, nutrient cycles, ecological pyramids." },
      { code: "bio.biodiversity", name: "Biodiversity and Conservation (2nd PUC)", description: "Levels of biodiversity, hotspots, conservation strategies." },
      { code: "bio.environmental_issues", name: "Environmental Issues (2nd PUC)", description: "Pollution, deforestation, ozone depletion, greenhouse effect." },
    ],
  },
];

export async function seedKcetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "KA_KCET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — KA_KCET exam not found.");
  }
  console.log(`Seeding KCET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < kcetSyllabus.length; sIdx++) {
    const s = kcetSyllabus[sIdx];
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
  console.log(`✓ Seeded KCET syllabus. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedKcetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
