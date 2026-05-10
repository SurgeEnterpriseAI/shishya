// NDA (National Defence Academy) — full syllabus tree.
// Two papers:
//   Paper 1 — Mathematics: 120 questions × 2.5 marks = 300 marks, 2.5 hours
//   Paper 2 — General Ability Test (GAT): 150 questions = 600 marks, 2.5 hours
//             — Part A: English (200 marks); Part B: General Knowledge (400 marks)
// Negative marking: 1/3 of marks per wrong answer.
// Source: UPSC official NDA notification (upsc.gov.in) cross-checked with
// Adda247 / Testbook / Career Power. Mathematics is at Class-XII level.
//
// Run after seedExams: npx tsx seed/exams/nda-syllabus.ts

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

export const ndaSyllabus: SubjectSeed[] = [
  // ── MATHEMATICS ───────────────────────────────────────────────────────
  {
    code: "MATHS",
    name: "Mathematics",
    weight: 1,
    topics: [
      { code: "math.algebra", name: "Algebra",
        description: "Sets, relations, real and complex numbers, sequences and series, equations.",
        subtopics: [
          { code: "math.algebra.sets", name: "Sets, Operations and Venn Diagrams", description: "Concept of set, operations on sets, Venn diagrams, De Morgan's laws." },
          { code: "math.algebra.relations", name: "Cartesian Product, Relations and Equivalence Relation", description: "Cartesian product, relations, equivalence relations." },
          { code: "math.algebra.real_numbers", name: "Real Numbers", description: "Representation of real numbers on the number line." },
          { code: "math.algebra.complex_numbers", name: "Complex Numbers", description: "Basic properties, modulus, argument, cube roots of unity." },
          { code: "math.algebra.binary_system", name: "Binary System of Numbers", description: "Conversion of decimal to binary and vice versa." },
          { code: "math.algebra.progressions", name: "Arithmetic, Geometric and Harmonic Progressions", description: "AP, GP and HP — sum, mean and properties." },
          { code: "math.algebra.quadratic", name: "Quadratic Equations with Real Coefficients", description: "Roots, nature of roots and applications." },
          { code: "math.algebra.linear_inequalities", name: "Linear Inequalities of Two Variables", description: "Graphical solution of linear inequalities in two variables." },
          { code: "math.algebra.permutation_combination", name: "Permutation and Combination", description: "Fundamental principle of counting, P(n,r) and C(n,r)." },
          { code: "math.algebra.binomial", name: "Binomial Theorem and Applications", description: "Binomial theorem for positive integral index, general and middle term." },
          { code: "math.algebra.logarithms", name: "Logarithms and Applications", description: "Properties of logarithms and their use." },
        ],
      },
      { code: "math.matrices_determinants", name: "Matrices and Determinants",
        description: "Operations on matrices and determinant theory up to Class XII.",
        subtopics: [
          { code: "math.matrices_determinants.types", name: "Types of Matrices", description: "Row, column, square, diagonal, scalar, identity and null matrices." },
          { code: "math.matrices_determinants.operations", name: "Operations on Matrices", description: "Addition, scalar multiplication and matrix multiplication." },
          { code: "math.matrices_determinants.determinant", name: "Determinant of a Matrix", description: "Determinant of 2×2 and 3×3 matrices and basic properties." },
          { code: "math.matrices_determinants.adjoint_inverse", name: "Adjoint and Inverse of a Square Matrix", description: "Adjoint, inverse and conditions for invertibility." },
          { code: "math.matrices_determinants.linear_eqs", name: "Solution of Linear Equations", description: "Cramer's rule and matrix-method solutions." },
        ],
      },
      { code: "math.trigonometry", name: "Trigonometry",
        description: "Angles, ratios, identities, inverse functions and applications.",
        subtopics: [
          { code: "math.trigonometry.angles", name: "Angles and Their Measures – Degrees and Radians", description: "Conversion between degrees and radians." },
          { code: "math.trigonometry.ratios", name: "Trigonometric Ratios", description: "Ratios for standard and general angles." },
          { code: "math.trigonometry.identities", name: "Trigonometric Identities and Formulae", description: "Sum, difference, multiple and sub-multiple angle formulae." },
          { code: "math.trigonometry.inverse", name: "Inverse Trigonometric Functions", description: "Definitions, principal values and basic properties." },
          { code: "math.trigonometry.heights_distances", name: "Heights and Distances", description: "Application of trigonometry to find heights and distances." },
          { code: "math.trigonometry.triangles", name: "Properties of Triangles", description: "Sine rule, cosine rule, area and projection formulae." },
        ],
      },
      { code: "math.analytical_geometry", name: "Analytical Geometry of Two and Three Dimensions",
        description: "Coordinate geometry in 2D and 3D — lines, conics, planes, spheres.",
        subtopics: [
          { code: "math.analytical_geometry.cartesian", name: "Rectangular Cartesian Coordinate System", description: "Basics of 2D coordinate geometry." },
          { code: "math.analytical_geometry.distance", name: "Distance Formula and Section Formula", description: "Distance between two points, internal/external division." },
          { code: "math.analytical_geometry.line", name: "Equation of a Line in Various Forms", description: "Slope-intercept, point-slope, normal and intercept forms." },
          { code: "math.analytical_geometry.angle_between_lines", name: "Angle between Two Lines", description: "Angle, parallel and perpendicular lines." },
          { code: "math.analytical_geometry.distance_point_line", name: "Distance of a Point from a Line", description: "Perpendicular distance and shortest distance." },
          { code: "math.analytical_geometry.circle", name: "Equation of a Circle (Standard and General Form)", description: "Standard, general and special forms of circle equations." },
          { code: "math.analytical_geometry.conics", name: "Conic Sections – Parabola, Ellipse, Hyperbola", description: "Eccentricity, axis, directrix and focus of conic sections." },
          { code: "math.analytical_geometry.3d_point", name: "Point in 3-D Space and Distance", description: "Coordinates of a point in space; distance between two points." },
          { code: "math.analytical_geometry.direction_cosines", name: "Direction Cosines and Direction Ratios", description: "Direction cosines and ratios of a line in space." },
          { code: "math.analytical_geometry.line_3d", name: "Equation of a Line in Space", description: "Equations of lines in space — symmetric and parametric forms." },
          { code: "math.analytical_geometry.plane", name: "Equation of a Plane", description: "Equation of a plane in different forms." },
          { code: "math.analytical_geometry.angle_3d", name: "Angle between Two Lines / Planes", description: "Angles between lines and planes in 3D." },
          { code: "math.analytical_geometry.sphere", name: "Equation of a Sphere", description: "Standard equation of a sphere." },
        ],
      },
      { code: "math.differential_calculus", name: "Differential Calculus",
        description: "Functions, limits, continuity, derivatives and their applications.",
        subtopics: [
          { code: "math.differential_calculus.functions", name: "Concept of a Real-valued Function", description: "Domain, range and graph of a function." },
          { code: "math.differential_calculus.composite", name: "Composite, One-One, Onto and Inverse Functions", description: "Definitions and examples of these function types." },
          { code: "math.differential_calculus.limits", name: "Limits and Continuity", description: "Notion of limit, standard limits and continuity of functions." },
          { code: "math.differential_calculus.derivative", name: "Derivative of a Function", description: "Geometrical and physical interpretation of a derivative." },
          { code: "math.differential_calculus.rules", name: "Rules of Differentiation", description: "Sum, product, quotient, chain rule and second-order derivatives." },
          { code: "math.differential_calculus.applications", name: "Applications of Derivatives", description: "Increasing/decreasing functions, maxima and minima." },
        ],
      },
      { code: "math.integral_calculus", name: "Integral Calculus and Differential Equations",
        description: "Integration techniques, definite integrals, areas and basic differential equations.",
        subtopics: [
          { code: "math.integral_calculus.integration", name: "Integration as Inverse of Differentiation", description: "Indefinite integration and standard integrals." },
          { code: "math.integral_calculus.methods", name: "Methods of Integration", description: "Integration by substitution and by parts." },
          { code: "math.integral_calculus.standard", name: "Standard Integrals", description: "Algebraic, trigonometric, exponential and hyperbolic integrals." },
          { code: "math.integral_calculus.definite", name: "Definite Integrals and Areas", description: "Evaluation of definite integrals; area of plane regions bounded by curves." },
          { code: "math.integral_calculus.de_order_degree", name: "Order and Degree of a Differential Equation", description: "Definition and formation of differential equations." },
          { code: "math.integral_calculus.de_solutions", name: "General and Particular Solutions of First-Order DEs", description: "First-order, first-degree differential equations and applications." },
          { code: "math.integral_calculus.growth_decay", name: "Application to Growth and Decay", description: "Use of differential equations in growth and decay problems." },
        ],
      },
      { code: "math.vector_algebra", name: "Vector Algebra",
        description: "Vectors in 2D and 3D, dot and cross products, applications.",
        subtopics: [
          { code: "math.vector_algebra.basics", name: "Vectors in 2D and 3D", description: "Magnitude, direction, unit and null vectors." },
          { code: "math.vector_algebra.operations", name: "Addition and Scalar Multiplication", description: "Vector addition and scalar multiplication." },
          { code: "math.vector_algebra.dot_product", name: "Scalar (Dot) Product", description: "Dot product of two vectors and its properties." },
          { code: "math.vector_algebra.cross_product", name: "Vector (Cross) Product", description: "Cross product of two vectors and its properties." },
          { code: "math.vector_algebra.applications", name: "Applications of Vectors", description: "Work done by a force, moment of a force and geometrical applications." },
        ],
      },
      { code: "math.statistics", name: "Statistics",
        description: "Classification, representation and central-tendency measures of data.",
        subtopics: [
          { code: "math.statistics.classification", name: "Classification of Data", description: "Frequency distribution, cumulative frequency distribution." },
          { code: "math.statistics.graphical", name: "Graphical Representation", description: "Histogram, pie chart and frequency polygon." },
          { code: "math.statistics.central_tendency", name: "Measures of Central Tendency", description: "Mean, median and mode." },
          { code: "math.statistics.variance_sd", name: "Variance and Standard Deviation", description: "Determination and comparison of variance and standard deviation." },
          { code: "math.statistics.correlation", name: "Correlation and Regression", description: "Concepts of correlation and basic regression." },
        ],
      },
      { code: "math.probability", name: "Probability",
        description: "Sample space, events, probability theorems and binomial distribution.",
        subtopics: [
          { code: "math.probability.random_experiment", name: "Random Experiment, Sample Space and Events", description: "Outcomes and associated sample space; events." },
          { code: "math.probability.event_types", name: "Types of Events", description: "Mutually exclusive and exhaustive, impossible and certain, complementary, elementary and composite events." },
          { code: "math.probability.union_intersection", name: "Union and Intersection of Events", description: "Union and intersection of two or more events." },
          { code: "math.probability.definition", name: "Definition of Probability", description: "Classical and statistical definitions of probability." },
          { code: "math.probability.theorems", name: "Elementary Theorems on Probability", description: "Addition theorem and simple problems." },
          { code: "math.probability.conditional", name: "Conditional Probability and Bayes' Theorem", description: "Conditional probability and Bayes' theorem with simple problems." },
          { code: "math.probability.random_variable", name: "Random Variable as a Function on a Sample Space", description: "Concept of random variable." },
          { code: "math.probability.binomial", name: "Binomial Distribution", description: "Random experiments giving rise to binomial distribution." },
        ],
      },
    ],
  },

  // ── GENERAL ABILITY TEST (GAT) ────────────────────────────────────────
  {
    code: "ENGLISH",
    name: "General Ability Test — English",
    weight: 1,
    topics: [
      { code: "eng.grammar", name: "Grammar and Usage", description: "Rules of grammar and correct usage at intermediate level." },
      { code: "eng.vocabulary", name: "Vocabulary", description: "Word meanings, synonyms, antonyms and word usage." },
      { code: "eng.comprehension", name: "Comprehension", description: "Reading comprehension passages with main idea and inference questions." },
      { code: "eng.cohesion", name: "Cohesion in Extended Text", description: "Sentence linkage and paragraph cohesion." },
      { code: "eng.spotting_errors", name: "Spotting Errors", description: "Identify the part of a sentence containing a grammatical error." },
      { code: "eng.sentence_improvement", name: "Sentence Improvement", description: "Choose the best alternative for an underlined phrase." },
      { code: "eng.fill_blanks", name: "Fill in the Blanks", description: "Sentence completion using appropriate words." },
      { code: "eng.synonyms", name: "Synonyms", description: "Closest in meaning to the underlined word." },
      { code: "eng.antonyms", name: "Antonyms", description: "Opposite in meaning to the underlined word." },
      { code: "eng.idioms_phrases", name: "Idioms and Phrases", description: "Meaning of common English idioms and phrasal verbs." },
      { code: "eng.cloze_test", name: "Cloze Test", description: "Fill multiple blanks within a passage." },
      { code: "eng.sentence_arrangement", name: "Sentence Arrangement / Para Jumbles", description: "Re-order sentences to form a coherent paragraph." },
      { code: "eng.spelling", name: "Spelling Check", description: "Identify the correctly or incorrectly spelt word." },
      { code: "eng.one_word", name: "One-Word Substitution", description: "Replace a phrase with a single word." },
    ],
  },

  {
    code: "GK",
    name: "General Ability Test — General Knowledge",
    weight: 1,
    topics: [
      { code: "gk.physics", name: "Physics (~25%)",
        description: "Mechanics, heat, light, sound, electricity, magnetism and applications.",
        subtopics: [
          { code: "gk.physics.matter", name: "Properties and States of Matter", description: "Mass, weight, volume, density, specific gravity." },
          { code: "gk.physics.archimedes", name: "Archimedes' Principle and Pressure", description: "Archimedes' principle, pressure, barometer." },
          { code: "gk.physics.motion", name: "Motion, Velocity and Acceleration", description: "Motion of objects, velocity and acceleration." },
          { code: "gk.physics.newton", name: "Newton's Laws of Motion", description: "Force, momentum, parallelogram of forces." },
          { code: "gk.physics.gravitation", name: "Stability, Equilibrium and Gravitation", description: "Stability and equilibrium of bodies, gravitation." },
          { code: "gk.physics.work_energy", name: "Work, Power and Energy", description: "Elementary ideas of work, power and energy." },
          { code: "gk.physics.heat", name: "Heat and Temperature", description: "Effects of heat, temperature, modes of transfer of heat." },
          { code: "gk.physics.sound", name: "Sound Waves", description: "Sound waves and their properties; simple musical instruments." },
          { code: "gk.physics.light", name: "Light – Reflection and Refraction", description: "Rectilinear propagation, reflection, refraction, mirrors and lenses." },
          { code: "gk.physics.eye", name: "Human Eye", description: "Structure and working of the human eye." },
          { code: "gk.physics.magnetism", name: "Magnetism", description: "Natural and artificial magnets; Earth as a magnet." },
          { code: "gk.physics.electricity", name: "Electricity", description: "Static and current electricity, conductors, Ohm's law, electrical circuits." },
          { code: "gk.physics.electrical_effects", name: "Effects of Current and Electrical Power", description: "Heating, lighting and magnetic effects; measurement of electrical power." },
          { code: "gk.physics.cells", name: "Primary and Secondary Cells", description: "Working of primary and secondary cells; X-rays." },
          { code: "gk.physics.appliances", name: "Common Appliances and Instruments", description: "Pendulum, pulleys, siphon, levers, pumps, hydrometer, pressure cooker, telescope, microscope, mariner's compass, lightning conductor, safety fuses." },
        ],
      },
      { code: "gk.chemistry", name: "Chemistry (~15%)",
        description: "Atomic structure, common substances and chemical principles.",
        subtopics: [
          { code: "gk.chemistry.physical_chemical", name: "Physical and Chemical Changes", description: "Difference between physical and chemical changes." },
          { code: "gk.chemistry.elements", name: "Elements, Mixtures and Compounds", description: "Symbols, formulae, simple chemical equations." },
          { code: "gk.chemistry.atom", name: "Structure of Atom and Valency", description: "Atomic structure, atomic and molecular weights, valency." },
          { code: "gk.chemistry.gases", name: "Hydrogen, Oxygen, Nitrogen and Carbon Dioxide", description: "Preparation and properties of these gases." },
          { code: "gk.chemistry.oxidation", name: "Oxidation and Reduction", description: "Concept of oxidation, reduction and redox." },
          { code: "gk.chemistry.acids_bases", name: "Acids, Bases and Salts", description: "Properties and uses of acids, bases and salts." },
          { code: "gk.chemistry.carbon", name: "Carbon and Its Compounds", description: "Different forms of carbon." },
          { code: "gk.chemistry.fertilizers", name: "Fertilisers – Natural and Artificial", description: "Types and uses of fertilisers." },
          { code: "gk.chemistry.everyday", name: "Substances of Daily Use", description: "Soap, glass, ink, paper, cement, paints, safety matches, gunpowder." },
          { code: "gk.chemistry.law_combination", name: "Law of Chemical Combination", description: "Statement and explanation (excluding numerical problems)." },
          { code: "gk.chemistry.air_water", name: "Properties of Air and Water", description: "Composition and properties of air and water." },
        ],
      },
      { code: "gk.general_science", name: "General Science (~10%)",
        description: "Biology, human body, food and health.",
        subtopics: [
          { code: "gk.general_science.life", name: "Difference between Living and Non-living", description: "Characteristics of living things." },
          { code: "gk.general_science.cells", name: "Basis of Life – Cells, Protoplasm and Tissues", description: "Cells, protoplasm and tissues." },
          { code: "gk.general_science.reproduction", name: "Growth and Reproduction in Plants and Animals", description: "Reproduction, growth in plants and animals." },
          { code: "gk.general_science.human_body", name: "Human Body and Important Organs", description: "Elementary knowledge of the human body and its organs." },
          { code: "gk.general_science.epidemics", name: "Common Epidemics", description: "Causes, prevention and control of common epidemics." },
          { code: "gk.general_science.food", name: "Food and Nutrition", description: "Source of energy, constituents of food, balanced diet." },
          { code: "gk.general_science.solar", name: "Solar System", description: "Meteors, comets and eclipses." },
          { code: "gk.general_science.scientists", name: "Achievements of Eminent Scientists", description: "Notable contributions of scientists worldwide." },
        ],
      },
      { code: "gk.history", name: "History, Freedom Movement (~20%)",
        description: "Indian history with focus on freedom struggle and modern world history.",
        subtopics: [
          { code: "gk.history.modern_world", name: "Forces Shaping the Modern World", description: "Renaissance, exploration and discovery." },
          { code: "gk.history.revolutions", name: "Revolutions and Wars", description: "American War of Independence, French, Industrial and Russian revolutions." },
          { code: "gk.history.science_society", name: "Impact of Science and Technology on Society", description: "Scientific advances and societal impact." },
          { code: "gk.history.one_world", name: "Concept of One World, UN and Panchsheel", description: "United Nations, Panchsheel, democracy, socialism and communism." },
          { code: "gk.history.india_world", name: "Role of India in the Present World", description: "India's place in the modern global order." },
          { code: "gk.history.indian_history", name: "Broad Survey of Indian History", description: "Indian history with emphasis on culture and civilisation." },
          { code: "gk.history.gandhi", name: "Basic Teachings of Mahatma Gandhi", description: "Key teachings and contributions of Gandhi." },
          { code: "gk.history.freedom_movement", name: "Freedom Movement in India", description: "Indian National Movement, key events and personalities." },
          { code: "gk.history.constitution", name: "Indian Constitution and Administration", description: "Elementary study of the Constitution and administration." },
          { code: "gk.history.five_year_plans", name: "Five-Year Plans of India", description: "Elementary knowledge of Indian Five-Year Plans." },
          { code: "gk.history.panchayati_raj", name: "Panchayati Raj, Co-operatives and Community Development", description: "Local governance and rural development programmes." },
          { code: "gk.history.bhoodan_sarvodaya", name: "Bhoodan, Sarvodaya, National Integration and Welfare State", description: "Post-independence movements and welfare initiatives." },
        ],
      },
      { code: "gk.geography", name: "Geography (~20%)",
        description: "Physical, Indian and world geography.",
        subtopics: [
          { code: "gk.geography.earth", name: "The Earth – Shape, Size and Movements", description: "Latitudes, longitudes, shape of the Earth, movements and effects." },
          { code: "gk.geography.time", name: "Concept of Time and International Date Line", description: "Time zones and the International Date Line." },
          { code: "gk.geography.origin_rocks", name: "Origin of Earth and Rocks", description: "Origin of Earth and classification of rocks." },
          { code: "gk.geography.weathering", name: "Weathering – Mechanical and Chemical", description: "Types of weathering processes." },
          { code: "gk.geography.earthquakes_volcanoes", name: "Earthquakes and Volcanoes", description: "Causes and effects of earthquakes and volcanoes." },
          { code: "gk.geography.atmosphere", name: "Atmosphere and Climate", description: "Composition, temperature, atmospheric pressure, planetary winds, cyclones and anticyclones." },
          { code: "gk.geography.condensation", name: "Condensation, Humidity and Precipitation", description: "Water vapour, humidity and forms of precipitation." },
          { code: "gk.geography.ocean_currents", name: "Ocean Currents and Tides", description: "Causes and patterns of ocean currents and tides." },
          { code: "gk.geography.climate_types", name: "Types of Climates and Natural Regions", description: "Major types of climate and natural regions of the world." },
          { code: "gk.geography.india_regional", name: "Regional Geography of India", description: "Climate, vegetation, minerals, power resources, agriculture and industries of India." },
          { code: "gk.geography.transport", name: "Sea, Land and Air Routes of India", description: "Important sea ports and main routes of India." },
          { code: "gk.geography.imports_exports", name: "Main Items of Imports and Exports of India", description: "India's chief import and export items." },
        ],
      },
      { code: "gk.current_events", name: "Current Events (~10%)",
        description: "Important national and international events of the recent past.",
        subtopics: [
          { code: "gk.current_events.india", name: "Important Events in India in Recent Years", description: "Major political, social and economic events in India." },
          { code: "gk.current_events.world", name: "Current Important World Events", description: "Major events, summits and treaties globally." },
          { code: "gk.current_events.personalities", name: "Prominent Personalities", description: "Indian and international leaders, scientists, sportspersons and artists in the news." },
        ],
      },
    ],
  },
];

export async function seedNdaSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "NDA" } });
  if (!exam) {
    throw new Error("Run seedExams() first — NDA exam not found.");
  }
  console.log(`Seeding NDA syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < ndaSyllabus.length; sIdx++) {
    const s = ndaSyllabus[sIdx];
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
    console.log(`  ✓ ${s.code} — ${s.topics.length} top-level topics`);
  }
  console.log(`Done. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedNdaSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
