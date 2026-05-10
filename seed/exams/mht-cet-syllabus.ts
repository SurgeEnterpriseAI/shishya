// MHT-CET (Maharashtra Common Entrance Test) — full syllabus tree.
// Based on Maharashtra State Board (SCERT) Class 11 + 12 curriculum.
// Weightage: 20% Class 11 + 80% Class 12 (per official cetcell.mahacet.org notification).
// PCM track: Physics 50 Qs + Chemistry 50 Qs + Mathematics 100 Qs.
// PCB track: Physics 50 Qs + Chemistry 50 Qs + Biology (Botany + Zoology) 100 Qs.
// No negative marking.
//
// Run after seedExams: npx tsx seed/exams/mht-cet-syllabus.ts

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

export const mhtCetSyllabus: SubjectSeed[] = [
  // ── PHYSICS (50 Qs) ───────────────────────────────────────────────────
  {
    code: "PHYSICS",
    name: "Physics",
    weight: 1,
    topics: [
      // Class 11 — only ~20% weightage in MHT-CET
      { code: "phy.measurement", name: "Units and Measurement (Class 11 — ~20% weight)", description: "SI units, dimensional analysis, error propagation, significant figures." },
      { code: "phy.kinematics", name: "Motion in a Straight Line and Plane (Class 11 — ~20% weight)", description: "1-D and 2-D kinematics, projectile motion, relative velocity, uniform circular motion." },
      { code: "phy.laws_motion", name: "Laws of Motion (Class 11 — ~20% weight)", description: "Newton's laws, friction, free-body diagrams, dynamics on inclines." },
      { code: "phy.work_energy", name: "Work, Energy and Power (Class 11 — ~20% weight)", description: "Work-energy theorem, conservative forces, potential energy, collisions." },
      { code: "phy.gravitation", name: "Gravitation (Class 11 — ~20% weight)", description: "Kepler's laws, gravitational potential, escape velocity, orbital motion." },
      { code: "phy.thermal", name: "Thermal Properties of Matter (Class 11 — ~20% weight)", description: "Thermal expansion, calorimetry, heat transfer, Newton's law of cooling." },
      { code: "phy.thermodynamics_11", name: "Thermodynamics — Basics (Class 11 — ~20% weight)", description: "Zeroth, first and second laws; PV diagrams; heat engines and refrigerators." },
      { code: "phy.kinetic_theory", name: "Kinetic Theory of Gases (Class 11 — ~20% weight)", description: "Ideal gas equation, RMS speed, degrees of freedom, mean free path." },
      { code: "phy.oscillations", name: "Oscillations (Class 11 — ~20% weight)", description: "Simple harmonic motion, energy in SHM, simple and compound pendulum." },
      { code: "phy.waves", name: "Waves (Class 11 — ~20% weight)", description: "Wave equation, superposition, beats, standing waves on strings and pipes." },
      // Class 12 — 80% weightage
      { code: "phy.rotational", name: "Rotational Dynamics (Class 12)", description: "Moment of inertia, torque, angular momentum, rolling motion, banking of road." },
      { code: "phy.mechanical_props_solids", name: "Mechanical Properties of Solids (Class 12)", description: "Stress, strain, elastic moduli, Poisson's ratio, elastic energy." },
      { code: "phy.fluid_mechanics", name: "Mechanical Properties of Fluids (Class 12)", description: "Viscosity, Stokes' law, Bernoulli's principle, surface tension, Reynolds number." },
      { code: "phy.thermodynamics_12", name: "Thermodynamics (Class 12)", description: "Carnot cycle, entropy, isothermal and adiabatic processes." },
      { code: "phy.wave_optics", name: "Wave Theory of Light", description: "Huygens principle, interference (Young's double slit), diffraction, polarization." },
      { code: "phy.electrostatics", name: "Electrostatics (Class 12)", description: "Coulomb's law, electric field and potential, Gauss's law, dielectrics." },
      { code: "phy.capacitance", name: "Capacitance (Class 12)", description: "Capacitors in series and parallel, energy stored, dielectric insertion." },
      { code: "phy.current_electricity", name: "Current Electricity (Class 12)", description: "Ohm's law, Kirchhoff's laws, Wheatstone bridge, potentiometer, drift velocity." },
      { code: "phy.magnetic_effects", name: "Magnetic Effects of Electric Current (Class 12)", description: "Biot-Savart law, Ampere's law, force on a charged particle, cyclotron, solenoid." },
      { code: "phy.magnetism_matter", name: "Magnetism and Matter (Class 12)", description: "Bar magnet, magnetic dipole, Earth's magnetism, dia/para/ferromagnetism." },
      { code: "phy.emi", name: "Electromagnetic Induction (Class 12)", description: "Faraday's and Lenz's laws, self and mutual inductance, AC generator, eddy currents." },
      { code: "phy.ac", name: "Alternating Current (Class 12)", description: "RMS values, RLC circuits, resonance, power factor, transformer." },
      { code: "phy.em_waves", name: "Electromagnetic Waves (Class 12)", description: "Maxwell's equations, EM spectrum, displacement current." },
      { code: "phy.dual_nature", name: "Dual Nature of Radiation and Matter (Class 12)", description: "Photoelectric effect, Einstein's equation, de Broglie wavelength, Davisson-Germer." },
      { code: "phy.atoms_nuclei", name: "Atoms and Nuclei (Class 12)", description: "Rutherford and Bohr models, hydrogen spectrum, mass defect, fission, fusion, decay laws." },
      { code: "phy.semiconductors", name: "Semiconductor Electronics (Class 12)", description: "P-N junction, diodes, rectifiers, BJT, logic gates, Zener diode." },
      { code: "phy.communication", name: "Communication Systems (Class 12)", description: "Modulation (AM/FM/PM), bandwidth, ground/space wave propagation." },
    ],
  },

  // ── CHEMISTRY (50 Qs) ─────────────────────────────────────────────────
  {
    code: "CHEMISTRY",
    name: "Chemistry",
    weight: 1,
    topics: [
      // Class 11 (~20%)
      { code: "chem.basic_concepts", name: "Some Basic Concepts of Chemistry (Class 11 — ~20% weight)", description: "Mole concept, stoichiometry, empirical and molecular formula, limiting reagent." },
      { code: "chem.atomic_structure", name: "Structure of Atom (Class 11 — ~20% weight)", description: "Bohr model, quantum numbers, orbital shapes, Aufbau principle, electron configuration." },
      { code: "chem.periodic_table", name: "Periodic Classification (Class 11 — ~20% weight)", description: "Modern periodic law, periodic trends in atomic radius, IE, EA, electronegativity." },
      { code: "chem.bonding", name: "Chemical Bonding and Molecular Structure (Class 11 — ~20% weight)", description: "Ionic, covalent, coordinate bonds; VSEPR, hybridization, MOT for diatomics." },
      { code: "chem.states_matter", name: "States of Matter (Class 11 — ~20% weight)", description: "Gas laws, ideal vs real gases, van der Waals equation, liquid state." },
      { code: "chem.redox", name: "Redox Reactions (Class 11 — ~20% weight)", description: "Oxidation numbers, balancing redox equations, redox titrations." },
      { code: "chem.hydrogen_sblock", name: "Hydrogen and s-Block Elements (Class 11 — ~20% weight)", description: "Position of hydrogen, alkali and alkaline earth metals, diagonal relationships." },
      { code: "chem.basic_organic_11", name: "Basic Principles of Organic Chemistry (Class 11 — ~20% weight)", description: "IUPAC nomenclature, isomerism, electron displacement effects, reaction mechanisms." },
      { code: "chem.hydrocarbons_11", name: "Hydrocarbons (Class 11 — ~20% weight)", description: "Alkanes, alkenes, alkynes, aromatic hydrocarbons; preparation and reactions." },
      // Class 12 (~80%)
      { code: "chem.solid_state", name: "Solid State (Class 12)", description: "Crystalline vs amorphous, unit cell, packing efficiency, point defects, semiconductors." },
      { code: "chem.solutions", name: "Solutions (Class 12)", description: "Concentration units, Raoult's law, colligative properties, abnormal molar mass, van't Hoff factor." },
      { code: "chem.electrochem", name: "Electrochemistry (Class 12)", description: "Galvanic and electrolytic cells, Nernst equation, conductance, Kohlrausch's law, batteries." },
      { code: "chem.kinetics", name: "Chemical Kinetics (Class 12)", description: "Rate laws, order, molecularity, integrated rate equations, Arrhenius equation, collision theory." },
      { code: "chem.surface_chemistry", name: "Surface Chemistry (Class 12)", description: "Adsorption, catalysis, colloids, emulsions, Tyndall effect, gels." },
      { code: "chem.metallurgy", name: "General Principles of Isolation of Elements (Class 12)", description: "Concentration of ores, reduction methods, refining, thermodynamic principles." },
      { code: "chem.pblock_12", name: "p-Block Elements (Class 12)", description: "Group 15 to 18 — preparation, properties, anomalous behavior of first element." },
      { code: "chem.dfblock", name: "d- and f-Block Elements (Class 12)", description: "Transition metals, lanthanoids, actinoids — properties, oxidation states, complex formation." },
      { code: "chem.coordination", name: "Coordination Compounds (Class 12)", description: "Werner's theory, IUPAC nomenclature, isomerism, VBT, CFT, applications." },
      { code: "chem.haloalkanes", name: "Haloalkanes and Haloarenes (Class 12)", description: "Nomenclature, SN1/SN2 mechanisms, elimination, polyhalogen compounds." },
      { code: "chem.alcohols", name: "Alcohols, Phenols and Ethers (Class 12)", description: "Preparation, physical and chemical properties, mechanism of dehydration." },
      { code: "chem.aldehydes_ketones", name: "Aldehydes, Ketones and Carboxylic Acids (Class 12)", description: "Nucleophilic addition, oxidation, Aldol and Cannizzaro reactions, acidity of carboxylic acids." },
      { code: "chem.amines", name: "Organic Compounds Containing Nitrogen (Class 12)", description: "Amines, diazonium salts, cyanides and isocyanides, Hofmann bromamide reaction." },
      { code: "chem.biomolecules", name: "Biomolecules (Class 12)", description: "Carbohydrates, proteins, enzymes, vitamins, nucleic acids, hormones." },
      { code: "chem.polymers", name: "Polymers (Class 12)", description: "Classification, addition vs condensation polymerisation, biodegradable polymers." },
      { code: "chem.chemistry_everyday", name: "Chemistry in Everyday Life (Class 12)", description: "Drugs, antiseptics, antibiotics, soaps and detergents, food preservatives." },
    ],
  },

  // ── MATHEMATICS (100 Qs) ──────────────────────────────────────────────
  {
    code: "MATHEMATICS",
    name: "Mathematics",
    weight: 1,
    topics: [
      // Class 11 (~20%)
      { code: "math.sets_relations", name: "Sets, Relations and Functions (Class 11 — ~20% weight)", description: "Set operations, types of relations, domain/range, composite and inverse functions." },
      { code: "math.trig_functions_11", name: "Trigonometric Functions (Class 11 — ~20% weight)", description: "Trigonometric identities, equations, sum/difference and multiple-angle formulas." },
      { code: "math.complex_numbers", name: "Complex Numbers and Quadratic Equations (Class 11 — ~20% weight)", description: "Argand plane, modulus, argument, polar form, De Moivre's theorem, roots of unity." },
      { code: "math.linear_inequalities", name: "Linear Inequalities (Class 11 — ~20% weight)", description: "Algebraic and graphical solution of linear inequalities in one and two variables." },
      { code: "math.permutations", name: "Permutations and Combinations (Class 11 — ~20% weight)", description: "Fundamental counting principle, nPr, nCr, circular and restricted arrangements." },
      { code: "math.binomial_11", name: "Binomial Theorem (Class 11 — ~20% weight)", description: "Expansion for positive integral index, general and middle terms, applications." },
      { code: "math.sequences", name: "Sequences and Series (Class 11 — ~20% weight)", description: "AP, GP, HP, arithmetic-geometric series, sum of special series." },
      { code: "math.straight_lines_11", name: "Straight Lines (Class 11 — ~20% weight)", description: "Slope, forms of line equation, distance from a point, angle between lines." },
      { code: "math.conic_sections", name: "Conic Sections (Class 11 — ~20% weight)", description: "Circle, parabola, ellipse, hyperbola — standard equations and properties." },
      { code: "math.intro_3d", name: "Introduction to Three-Dimensional Geometry (Class 11 — ~20% weight)", description: "Coordinates in 3D space, distance and section formula." },
      { code: "math.limits_derivatives", name: "Limits and Derivatives (Class 11 — ~20% weight)", description: "Limit definitions, standard limits, derivative as limit, basic differentiation rules." },
      { code: "math.statistics_11", name: "Statistics (Class 11 — ~20% weight)", description: "Measures of dispersion — mean deviation, variance, standard deviation, coefficient of variation." },
      // Class 12 (~80%)
      { code: "math.relations_functions_12", name: "Relations and Functions (Class 12)", description: "Types of functions, composition, invertibility, binary operations." },
      { code: "math.inverse_trig", name: "Inverse Trigonometric Functions (Class 12)", description: "Domain, range, principal values, properties and identities." },
      { code: "math.matrices", name: "Matrices (Class 12)", description: "Types, operations, transpose, symmetric/skew, elementary transformations, inverse." },
      { code: "math.determinants", name: "Determinants (Class 12)", description: "Properties, minors, cofactors, area of triangle, adjoint, system of linear equations." },
      { code: "math.continuity_diff", name: "Continuity and Differentiability (Class 12)", description: "Continuity tests, differentiability, chain rule, implicit and parametric differentiation, Rolle's and MVT." },
      { code: "math.applications_derivatives", name: "Applications of Derivatives (Class 12)", description: "Rate of change, tangent and normal, monotonicity, maxima/minima, approximations." },
      { code: "math.integrals", name: "Integrals (Class 12)", description: "Indefinite integrals, integration by substitution/parts/partial fractions, definite integrals, properties." },
      { code: "math.applications_integrals", name: "Applications of Integrals (Class 12)", description: "Area under curves, area between curves, area bounded by lines and conics." },
      { code: "math.differential_equations", name: "Differential Equations (Class 12)", description: "Order, degree, formation, variable separable, linear and homogeneous DEs." },
      { code: "math.vector_algebra", name: "Vector Algebra (Class 12)", description: "Vectors in 2D/3D, dot and cross products, scalar triple product, projections." },
      { code: "math.three_d_geometry", name: "Three-Dimensional Geometry (Class 12)", description: "Direction cosines/ratios, lines, planes, angle between lines and planes, distance formulas." },
      { code: "math.linear_programming", name: "Linear Programming (Class 12)", description: "LPP formulation, graphical method, feasible region, optimal solutions." },
      { code: "math.probability_12", name: "Probability (Class 12)", description: "Conditional probability, Bayes' theorem, random variables, Bernoulli and binomial distributions." },
      { code: "math.mathematical_logic", name: "Mathematical Logic (Class 12 — Maharashtra Board)", description: "Statements, logical connectives, truth tables, tautology and contradiction." },
    ],
  },

  // ── BIOLOGY (100 Qs — PCB Track Only) ─────────────────────────────────
  {
    code: "BIOLOGY",
    name: "Biology",
    weight: 1,
    topics: [
      // Class 11 (~20%)
      { code: "bio.diversity", name: "Diversity in Living Organisms (Class 11 — ~20% weight)", description: "Taxonomy, five-kingdom classification, plant and animal kingdom basics." },
      { code: "bio.kingdom_systems", name: "Kingdom Plantae and Animalia (Class 11 — ~20% weight)", description: "Algae, bryophytes, pteridophytes, gymnosperms, angiosperms; non-chordates and chordates." },
      { code: "bio.biomolecules_11", name: "Biomolecules (Class 11 — ~20% weight)", description: "Carbohydrates, proteins, lipids, nucleic acids, enzymes." },
      { code: "bio.cell_structure_11", name: "Cell Structure and Organisation (Class 11 — ~20% weight)", description: "Cell theory, prokaryotes vs eukaryotes, cell organelles, cell division." },
      { code: "bio.respiration_11", name: "Respiration and Energy Transfer (Class 11 — ~20% weight)", description: "Glycolysis, Krebs cycle, ETS, fermentation, ATP yield." },
      { code: "bio.photosynthesis_11", name: "Photosynthesis (Class 11 — ~20% weight)", description: "Light and dark reactions, C3/C4/CAM pathways, photorespiration." },
      { code: "bio.human_nutrition", name: "Human Nutrition (Class 11 — ~20% weight)", description: "Digestive system, digestion of carbs/proteins/fats, absorption, balanced diet." },
      { code: "bio.excretion_11", name: "Excretion and Osmoregulation (Class 11 — ~20% weight)", description: "Modes of excretion, structure of nephron, urine formation, dialysis." },
      { code: "bio.origin_evolution", name: "Origin and Evolution of Life (Class 11 — ~20% weight)", description: "Theories of origin, evolutionary evidence, Darwinism, Hardy-Weinberg principle." },
      { code: "bio.plant_growth", name: "Plant Growth and Development (Class 11 — ~20% weight)", description: "Phases of growth, plant hormones, photoperiodism, vernalization." },
      // Class 12 (~80%)
      { code: "bio.reproduction_organisms", name: "Reproduction in Lower and Higher Plants (Class 12)", description: "Asexual and sexual reproduction, microsporogenesis, megasporogenesis, double fertilization." },
      { code: "bio.reproduction_animals", name: "Reproduction in Lower and Higher Animals (Class 12)", description: "Modes of reproduction, human reproductive system, gametogenesis, menstrual cycle, embryogenesis." },
      { code: "bio.reproductive_health", name: "Reproductive Health (Class 12)", description: "Population control, contraception, STDs, infertility, ART, MTP." },
      { code: "bio.inheritance_variation", name: "Inheritance and Variation (Genetics) (Class 12)", description: "Mendel's laws, sex determination, mutations, pedigree analysis, chromosomal theory." },
      { code: "bio.molecular_basis", name: "Molecular Basis of Inheritance (Class 12)", description: "DNA structure, replication, transcription, translation, genetic code, lac operon, human genome." },
      { code: "bio.evolution_12", name: "Origin and Evolution (Class 12)", description: "Evidence of evolution, mechanisms, speciation, human evolution." },
      { code: "bio.health_disease", name: "Human Health and Disease (Class 12)", description: "Pathogens, immunity, AIDS, cancer, drug abuse, vaccines." },
      { code: "bio.enhancement_food", name: "Enhancement in Food Production (Class 12)", description: "Plant breeding, tissue culture, animal husbandry, single cell protein, biofortification." },
      { code: "bio.microbes_welfare", name: "Microbes in Human Welfare (Class 12)", description: "Microbes in industry, food, sewage treatment, biogas, biocontrol agents." },
      { code: "bio.biotech_principles", name: "Biotechnology — Principles and Processes (Class 12)", description: "Genetic engineering, restriction enzymes, vectors, PCR, gel electrophoresis, bioreactors." },
      { code: "bio.biotech_applications", name: "Biotechnology and its Applications (Class 12)", description: "Transgenic plants and animals, recombinant insulin, gene therapy, GMO ethics, RNAi." },
      { code: "bio.organisms_populations", name: "Organisms and Populations (Class 12)", description: "Ecological niche, abiotic factors, population attributes, growth models, interactions." },
      { code: "bio.ecosystem", name: "Ecosystems and Energy Flow (Class 12)", description: "Productivity, food chains, trophic levels, biogeochemical cycles, ecological pyramids." },
      { code: "bio.biodiversity", name: "Biodiversity and Conservation (Class 12)", description: "Levels of biodiversity, hotspots, extinction, protected areas, in-situ and ex-situ conservation." },
      { code: "bio.environmental_issues", name: "Environmental Issues (Class 12)", description: "Pollution (air, water, soil), greenhouse effect, ozone depletion, deforestation, e-waste." },
      { code: "bio.control_coordination", name: "Control and Coordination (Class 12)", description: "Nervous system, reflex action, brain structure, endocrine glands, hormonal regulation." },
      { code: "bio.animal_husbandry", name: "Animal Husbandry (Class 12)", description: "Cattle, poultry, fisheries, apiculture, breeding programmes." },
    ],
  },
];

export async function seedMhtCetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "MH_MHTCET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — MH_MHTCET exam not found.");
  }
  console.log(`Seeding MHT-CET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < mhtCetSyllabus.length; sIdx++) {
    const s = mhtCetSyllabus[sIdx];
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
  console.log(`✓ Seeded MHT-CET syllabus. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedMhtCetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
