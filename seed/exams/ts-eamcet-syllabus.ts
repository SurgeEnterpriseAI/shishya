// TS EAMCET / TG EAPCET (Telangana State Engineering Agriculture Medical CET) — full syllabus tree.
// Based on Telangana Intermediate (Class 11 + 12) curriculum, NCERT-aligned.
// Engineering (MPC): Mathematics 80 + Physics 40 + Chemistry 40 = 160 Qs.
// Agriculture/Pharmacy (BiPC): Botany 40 + Zoology 40 + Physics 40 + Chemistry 40 = 160 Qs.
// 1 mark per question, no negative marking, 3 hours.
// Source: eapcet.tgche.ac.in
//
// Run after seedExams: npx tsx seed/exams/ts-eamcet-syllabus.ts

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

export const tsEamcetSyllabus: SubjectSeed[] = [
  // ── MATHEMATICS (80 Qs) ───────────────────────────────────────────────
  {
    code: "MATHEMATICS",
    name: "Mathematics",
    weight: 2,
    topics: [
      // Algebra
      { code: "math.functions", name: "Functions", description: "Types of functions, domain, range, composition, inverse." },
      { code: "math.mathematical_induction", name: "Mathematical Induction", description: "Principle of mathematical induction and applications." },
      { code: "math.matrices", name: "Matrices", description: "Types, operations, transpose, adjoint, inverse, system of linear equations." },
      { code: "math.complex_numbers", name: "Complex Numbers", description: "Algebra, modulus, argument, polar form, geometrical representation." },
      { code: "math.de_moivre", name: "De Moivre's Theorem", description: "Statement, applications, nth roots of unity." },
      { code: "math.quadratic_expressions", name: "Quadratic Expressions", description: "Roots, nature, sign of quadratic expression, location of roots." },
      { code: "math.theory_equations", name: "Theory of Equations", description: "Relation between roots and coefficients, transformation of equations." },
      { code: "math.permutations", name: "Permutations and Combinations", description: "Fundamental principle, nPr, nCr, applications, circular arrangements." },
      { code: "math.binomial", name: "Binomial Theorem", description: "For positive integral and rational index, general and middle terms." },
      { code: "math.partial_fractions", name: "Partial Fractions", description: "Resolution of rational functions into partial fractions." },
      // Trigonometry
      { code: "math.trig_ratios", name: "Trigonometric Ratios up to Transformations", description: "Trig identities, compound, multiple, sub-multiple angles." },
      { code: "math.trig_equations", name: "Trigonometric Equations", description: "General solutions of trigonometric equations." },
      { code: "math.inverse_trig", name: "Inverse Trigonometric Functions", description: "Domain, range, principal values, properties." },
      { code: "math.hyperbolic", name: "Hyperbolic Functions", description: "Definitions, identities, derivatives." },
      { code: "math.properties_triangles", name: "Properties of Triangles", description: "Sine and cosine rules, half-angle formulas, area, in-radius and circumradius." },
      // Vector Algebra
      { code: "math.addition_vectors", name: "Addition of Vectors", description: "Vectors in 2D and 3D, components, position vectors." },
      { code: "math.product_vectors", name: "Product of Vectors", description: "Dot product, cross product, scalar/vector triple products." },
      // Probability & Statistics
      { code: "math.measures_dispersion", name: "Measures of Dispersion", description: "Range, mean deviation, variance, standard deviation, coefficient of variation." },
      { code: "math.probability", name: "Probability", description: "Sample space, conditional probability, Bayes' theorem, independence." },
      { code: "math.random_variables", name: "Random Variables and Probability Distributions", description: "Discrete and continuous random variables, binomial and Poisson distributions." },
      // Coordinate Geometry
      { code: "math.locus", name: "Locus", description: "Definition and equation of locus." },
      { code: "math.transformation_axes", name: "Transformation of Axes", description: "Translation and rotation of axes." },
      { code: "math.straight_lines", name: "Straight Lines", description: "Forms of equations of lines, angle, distance, family of lines." },
      { code: "math.pair_lines", name: "Pair of Straight Lines", description: "Homogeneous and general second-degree equation, angle between lines." },
      { code: "math.circle", name: "Circle", description: "Equation, position of point, tangent, normal, chord of contact." },
      { code: "math.system_circles", name: "System of Circles", description: "Common chord, common tangents, radical axis, orthogonal circles." },
      { code: "math.parabola", name: "Parabola", description: "Standard form, properties, focal chord, tangent and normal." },
      { code: "math.ellipse", name: "Ellipse", description: "Standard form, eccentricity, focal properties, tangent and normal." },
      { code: "math.hyperbola", name: "Hyperbola", description: "Standard form, asymptotes, conjugate hyperbola, tangent and normal." },
      { code: "math.three_d", name: "Three-Dimensional Coordinates", description: "Distance, section formula, centroid in 3D." },
      { code: "math.direction_cosines", name: "Direction Cosines and Direction Ratios", description: "Direction cosines/ratios of a line, angle between two lines." },
      { code: "math.plane", name: "Plane", description: "Equation of plane in various forms, angle between planes, distance from point." },
      // Calculus
      { code: "math.limits_continuity", name: "Limits and Continuity", description: "Standard limits, L'Hopital's rule, continuity tests." },
      { code: "math.differentiation", name: "Differentiation", description: "Methods of differentiation, chain rule, implicit, parametric, logarithmic." },
      { code: "math.applications_derivatives", name: "Applications of Derivatives", description: "Tangent/normal, rate of change, errors, monotonicity, maxima/minima." },
      { code: "math.integration", name: "Integration", description: "Methods of integration — substitution, parts, partial fractions; integration of special forms." },
      { code: "math.definite_integration", name: "Definite Integration", description: "Properties, definite integrals as limit of sum, areas under curves." },
      { code: "math.differential_equations", name: "Differential Equations", description: "Order, degree, formation, variable separable, linear, homogeneous DEs." },
    ],
  },

  // ── PHYSICS (40 Qs) ───────────────────────────────────────────────────
  {
    code: "PHYSICS",
    name: "Physics",
    weight: 1,
    topics: [
      { code: "phy.physical_world", name: "Physical World", description: "Scope of physics, fundamental forces, role in society." },
      { code: "phy.units_measurement", name: "Units and Measurements", description: "SI units, dimensional analysis, errors, significant figures." },
      { code: "phy.motion_straight_line", name: "Motion in a Straight Line", description: "Position, displacement, velocity, acceleration, kinematic equations." },
      { code: "phy.motion_plane", name: "Motion in a Plane", description: "Vector kinematics, projectile motion, uniform circular motion." },
      { code: "phy.laws_motion", name: "Laws of Motion", description: "Newton's laws, friction, dynamics of circular motion, banking." },
      { code: "phy.work_energy_power", name: "Work, Energy and Power", description: "Work-energy theorem, conservative forces, collisions." },
      { code: "phy.system_particles", name: "System of Particles and Rotational Motion", description: "Centre of mass, torque, angular momentum, moment of inertia, rolling motion." },
      { code: "phy.oscillations", name: "Oscillations", description: "SHM, energy in SHM, simple and compound pendulum, damped/forced oscillations." },
      { code: "phy.gravitation", name: "Gravitation", description: "Universal law, Kepler's laws, gravitational potential, satellites, escape velocity." },
      { code: "phy.mech_solids", name: "Mechanical Properties of Solids", description: "Stress, strain, elastic moduli, Poisson's ratio, elastic energy." },
      { code: "phy.mech_fluids", name: "Mechanical Properties of Fluids", description: "Pressure, Pascal's law, Bernoulli's equation, viscosity, surface tension." },
      { code: "phy.thermal_props", name: "Thermal Properties of Matter", description: "Thermal expansion, calorimetry, heat transfer, Newton's law of cooling." },
      { code: "phy.thermodynamics", name: "Thermodynamics", description: "Zeroth, first and second laws; isothermal, adiabatic; heat engines; Carnot cycle." },
      { code: "phy.kinetic_theory", name: "Kinetic Theory", description: "Behaviour of gases, kinetic interpretation of temperature, mean free path." },
      { code: "phy.waves", name: "Waves", description: "Transverse and longitudinal waves, superposition, beats, standing waves, Doppler effect." },
      { code: "phy.ray_optics", name: "Ray Optics and Optical Instruments", description: "Reflection, refraction, lenses, optical instruments — microscope, telescope." },
      { code: "phy.wave_optics", name: "Wave Optics", description: "Huygens principle, interference, diffraction, polarization." },
      { code: "phy.electric_charges", name: "Electric Charges and Fields", description: "Coulomb's law, electric field, Gauss's law, dipole." },
      { code: "phy.electrostatic_potential", name: "Electrostatic Potential and Capacitance", description: "Potential, equipotential surfaces, capacitors, dielectrics." },
      { code: "phy.current_electricity", name: "Current Electricity", description: "Drift velocity, Ohm's law, Kirchhoff's laws, Wheatstone bridge, potentiometer." },
      { code: "phy.moving_charges", name: "Moving Charges and Magnetism", description: "Biot-Savart law, Ampere's law, force on current-carrying conductor, cyclotron." },
      { code: "phy.magnetism_matter", name: "Magnetism and Matter", description: "Bar magnet, Earth's magnetism, dia/para/ferromagnetism." },
      { code: "phy.emi", name: "Electromagnetic Induction", description: "Faraday's law, Lenz's law, self/mutual inductance, AC generator, eddy currents." },
      { code: "phy.alternating_current", name: "Alternating Current", description: "RMS values, RLC circuits, resonance, transformer, power factor." },
      { code: "phy.em_waves", name: "Electromagnetic Waves", description: "Maxwell's equations, displacement current, EM spectrum." },
      { code: "phy.dual_nature", name: "Dual Nature of Radiation and Matter", description: "Photoelectric effect, Einstein's equation, de Broglie wavelength." },
      { code: "phy.atoms", name: "Atoms", description: "Rutherford and Bohr models, hydrogen spectrum." },
      { code: "phy.nuclei", name: "Nuclei", description: "Mass-energy equivalence, binding energy, fission, fusion, radioactive decay." },
      { code: "phy.semiconductors", name: "Semiconductor Electronics", description: "Energy bands, p-n junction, diodes, transistor, logic gates." },
      { code: "phy.communication", name: "Communication Systems", description: "Modulation, propagation, bandwidth, basic communication systems." },
    ],
  },

  // ── CHEMISTRY (40 Qs) ─────────────────────────────────────────────────
  {
    code: "CHEMISTRY",
    name: "Chemistry",
    weight: 1,
    topics: [
      { code: "chem.atomic_structure", name: "Atomic Structure", description: "Atomic models, dual nature, quantum numbers, orbitals, electronic configuration." },
      { code: "chem.classification", name: "Classification of Elements and Periodicity", description: "Modern periodic law, periodic trends in atomic radius, IE, EA, electronegativity." },
      { code: "chem.bonding", name: "Chemical Bonding and Molecular Structure", description: "Ionic, covalent, hydrogen bonds, VSEPR, hybridization, MO theory, polarity." },
      { code: "chem.states_matter", name: "States of Matter — Gases and Liquids", description: "Gas laws, kinetic theory, real gases, liquefaction, intermolecular forces." },
      { code: "chem.stoichiometry", name: "Stoichiometry", description: "Mole concept, equivalent weight, empirical and molecular formula, limiting reagent." },
      { code: "chem.thermodynamics", name: "Thermodynamics", description: "First law, enthalpy, Hess's law, second law, free energy, spontaneity." },
      { code: "chem.chem_equilibrium", name: "Chemical Equilibrium and Acids-Bases", description: "Kc/Kp, Le Chatelier, Bronsted-Lowry, pH, buffers, Ksp." },
      { code: "chem.hydrogen_compounds", name: "Hydrogen and its Compounds", description: "Position, isotopes, hydrides, hydrogen peroxide, hard/soft water." },
      { code: "chem.s_block", name: "s-Block Elements", description: "Alkali and alkaline earth metals, anomalous behaviour, diagonal relationship." },
      { code: "chem.p_block_13_14", name: "p-Block Elements — Groups 13 and 14", description: "Boron and carbon families — properties and important compounds." },
      { code: "chem.environmental", name: "Environmental Chemistry", description: "Air, water, soil pollution; greenhouse effect; ozone depletion." },
      { code: "chem.organic_principles", name: "Organic Chemistry — Some Basic Principles", description: "IUPAC nomenclature, isomerism, electronic effects, reactive intermediates." },
      { code: "chem.hydrocarbons", name: "Hydrocarbons", description: "Alkanes, alkenes, alkynes, aromatic — preparation, properties, mechanisms." },
      { code: "chem.solid_state", name: "Solid State", description: "Crystalline vs amorphous, unit cells, packing, defects, electrical/magnetic properties." },
      { code: "chem.solutions", name: "Solutions", description: "Concentration, Raoult's law, colligative properties, abnormal molar mass, van't Hoff factor." },
      { code: "chem.electrochemistry", name: "Electrochemistry and Chemical Kinetics", description: "Galvanic cells, Nernst equation, conductance; rate laws, order, Arrhenius equation." },
      { code: "chem.surface_chem", name: "Surface Chemistry", description: "Adsorption, catalysis, colloids, emulsions, Tyndall effect." },
      { code: "chem.metallurgy", name: "General Principles of Metallurgy", description: "Concentration, reduction methods, refining, thermodynamic principles." },
      { code: "chem.p_block_15_18", name: "p-Block Elements — Groups 15 to 18", description: "Nitrogen, oxygen, halogen and noble gas families — properties and compounds." },
      { code: "chem.d_f_block", name: "d- and f-Block Elements", description: "Transition metals, lanthanoids, actinoids — properties, oxidation states, complexes." },
      { code: "chem.coordination", name: "Coordination Compounds", description: "Werner theory, IUPAC nomenclature, isomerism, VBT, CFT, applications." },
      { code: "chem.haloalkanes", name: "Haloalkanes and Haloarenes", description: "Nomenclature, SN1/SN2, elimination, polyhalogen compounds." },
      { code: "chem.alcohols_phenols", name: "Alcohols, Phenols and Ethers", description: "Preparation, properties, reactions, mechanism of dehydration." },
      { code: "chem.aldehydes_ketones", name: "Aldehydes, Ketones and Carboxylic Acids", description: "Nucleophilic addition, oxidation, named reactions, acidity." },
      { code: "chem.nitrogen_organic", name: "Organic Compounds Containing Nitrogen", description: "Amines, diazonium salts, cyanides, nitro compounds." },
      { code: "chem.biomolecules", name: "Biomolecules", description: "Carbohydrates, proteins, vitamins, nucleic acids, hormones." },
      { code: "chem.chemistry_everyday", name: "Chemistry in Everyday Life", description: "Drugs, antibiotics, soaps, food preservatives." },
      { code: "chem.polymers", name: "Polymers", description: "Classification, addition vs condensation polymerisation, biodegradable polymers." },
    ],
  },

  // ── BOTANY (40 Qs — BiPC Track) ───────────────────────────────────────
  {
    code: "BOTANY",
    name: "Botany",
    weight: 1,
    topics: [
      { code: "bot.diversity_living", name: "Diversity in the Living World", description: "Living world, taxonomic categories, taxonomical aids." },
      { code: "bot.classification", name: "Biological Classification", description: "Five-kingdom system, monera, protista, fungi, virus, viroids, lichens." },
      { code: "bot.science_plants", name: "Science of Plants — Botany", description: "Branches of botany, history, scope of plant science." },
      { code: "bot.plant_systematics", name: "Plant Systematics", description: "Taxonomy, systems of classification, taxonomical hierarchy." },
      { code: "bot.plant_kingdom", name: "Plant Kingdom", description: "Algae, bryophytes, pteridophytes, gymnosperms, angiosperms." },
      { code: "bot.morphology_plants", name: "Structural Organization in Plants — Morphology", description: "Root, stem, leaf, inflorescence, flower, fruit, seed; floral diagrams." },
      { code: "bot.reproduction_plants_morph", name: "Reproduction in Plants", description: "Modes of reproduction, sexual reproduction in flowering plants, double fertilization." },
      { code: "bot.taxonomy_angiosperms", name: "Taxonomy of Angiosperms", description: "Bentham and Hooker's classification, families — Fabaceae, Solanaceae, Liliaceae." },
      { code: "bot.cell_structure", name: "Cell Structure and Function", description: "Cell theory, prokaryotic vs eukaryotic, organelles, cell wall, nucleus." },
      { code: "bot.internal_organization", name: "Internal Organization of Plants", description: "Plant tissues, anatomy of dicot and monocot stem, root, leaf." },
      { code: "bot.plant_ecology", name: "Plant Ecology", description: "Ecological adaptations, plant communities, ecosystem dynamics." },
      { code: "bot.plant_physiology", name: "Plant Physiology", description: "Transport, mineral nutrition, photosynthesis, respiration, growth and development." },
      { code: "bot.transport", name: "Transport in Plants", description: "Diffusion, osmosis, transpiration, water and mineral uptake, translocation." },
      { code: "bot.mineral_nutrition", name: "Mineral Nutrition", description: "Essential elements, deficiency symptoms, nitrogen cycle, biological N-fixation." },
      { code: "bot.photosynthesis", name: "Photosynthesis in Higher Plants", description: "Pigments, light/dark reactions, C3/C4/CAM, photorespiration." },
      { code: "bot.respiration", name: "Respiration in Plants", description: "Glycolysis, Krebs cycle, ETS, fermentation, respiratory quotient." },
      { code: "bot.growth_development", name: "Plant Growth and Development", description: "Phases of growth, plant hormones, photoperiodism, vernalization." },
      { code: "bot.genetics", name: "Genetics", description: "Mendelism, linkage, sex-linked inheritance, polygenic inheritance, mutations." },
      { code: "bot.molecular_biology", name: "Molecular Biology", description: "DNA structure, replication, transcription, translation, genetic code, lac operon." },
      { code: "bot.biotech_applications", name: "Biotechnology and its Applications", description: "Genetic engineering, transgenic plants, GMOs, RNAi, agricultural applications." },
      { code: "bot.microbes_welfare", name: "Microbes in Human Welfare", description: "Microbes in food, industry, sewage treatment, biogas, biocontrol agents." },
    ],
  },

  // ── ZOOLOGY (40 Qs — BiPC Track) ──────────────────────────────────────
  {
    code: "ZOOLOGY",
    name: "Zoology",
    weight: 1,
    topics: [
      { code: "zoo.diversity_animals", name: "Diversity in the Living World — Animals", description: "Diversity, classification basis, taxonomic hierarchy in animal kingdom." },
      { code: "zoo.structural_animals", name: "Structural Organisation in Animals", description: "Animal tissues, morphology and anatomy of cockroach/frog/earthworm." },
      { code: "zoo.animal_diversity_invertebrate", name: "Animal Diversity — I: Invertebrate Phyla", description: "Porifera through Echinodermata — body plan, organization, classification." },
      { code: "zoo.animal_diversity_chordata", name: "Animal Diversity — II: Phylum Chordata", description: "Protochordata, fishes, amphibians, reptiles, birds, mammals." },
      { code: "zoo.locomotion_protozoa", name: "Locomotion and Reproduction in Protozoa", description: "Body organization, modes of locomotion and reproduction in protozoans." },
      { code: "zoo.biology_periplaneta", name: "Type Study — Periplaneta americana", description: "External features, digestive, respiratory, circulatory, reproductive systems." },
      { code: "zoo.ecology_environment", name: "Ecology and Environment", description: "Organisms and populations, ecosystem, biodiversity, environmental issues." },
      { code: "zoo.biology_human_welfare", name: "Biology and Human Welfare", description: "Parasitism, vectors, animals useful and harmful to humans." },
      { code: "zoo.human_anatomy_1", name: "Human Anatomy and Physiology — I", description: "Digestion and absorption; breathing and exchange of gases." },
      { code: "zoo.human_anatomy_2", name: "Human Anatomy and Physiology — II", description: "Body fluids and circulation; excretory products and their elimination." },
      { code: "zoo.human_anatomy_3", name: "Human Anatomy and Physiology — III", description: "Locomotion and movement; muscle, bone, joints, disorders." },
      { code: "zoo.human_anatomy_4", name: "Human Anatomy and Physiology — IV", description: "Neural control and coordination; chemical control and integration." },
      { code: "zoo.human_reproduction", name: "Human Reproduction", description: "Male/female reproductive systems, gametogenesis, menstrual cycle, embryogenesis." },
      { code: "zoo.reproductive_health", name: "Reproductive Health", description: "Population control, contraception, STDs, ART, infertility." },
      { code: "zoo.genetics_zoo", name: "Genetics", description: "Mendelism, sex determination, linkage, mutations, pedigree analysis." },
      { code: "zoo.organic_evolution", name: "Organic Evolution", description: "Origin of life, evidence of evolution, mechanisms, human evolution." },
      { code: "zoo.applied_biology", name: "Applied Biology", description: "Animal husbandry, dairy, poultry, fisheries, bee-keeping." },
    ],
  },
];

export async function seedTsEamcetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "TS_EAMCET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — TS_EAMCET exam not found.");
  }
  console.log(`Seeding TS EAMCET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < tsEamcetSyllabus.length; sIdx++) {
    const s = tsEamcetSyllabus[sIdx];
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
  console.log(`✓ Seeded TS EAMCET syllabus. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedTsEamcetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
