// NCERT / ICSE / state-board subject lists per (board, class).
//
// Hardcoded TS for the same reasons as colleges-data / schooling-data:
// reference data that only changes when a board revises its curriculum.
// Updates ship via PR (visible diff) instead of via DB seed.
//
// Per the Phase 0 audit decision: subject TILES surface for Class 10
// and Class 12 across CBSE + ICSE first (Day 1 of the schooling
// build). Other class/board combos render an honest "subjects coming"
// stub until populated.
//
// Each subject entry includes the NCERT/ICSE official chapter URL
// where applicable, so even before our chapter pages exist, students
// see the authoritative source.

export interface SchoolChapter {
  // URL slug for /schooling/[board]/class-[n]/[subject]/[chapter-slug]
  slug: string;
  // Display name as it appears in the NCERT textbook
  name: string;
  // Chapter number in the official textbook
  number: number;
  // 1-sentence summary shown on the chapter tile
  blurb?: string;
  // Direct NCERT PDF URL for this specific chapter, when known
  pdfUrl?: string;
}

export interface SchoolSubject {
  // URL slug for /schooling/[board]/class-[n]/[subject-slug]
  slug: string;
  // Display name
  name: string;
  // Short blurb shown on the subject tile
  blurb: string;
  // Approximate chapter count (NCERT) — used for the tile metadata
  chapterCount?: number;
  // Direct link to NCERT/board chapter PDFs index for this subject + class
  officialChapterIndex?: string;
  // Tag indicating if this subject is foundational for a downstream
  // entrance exam — drives the cross-link surface on the subject page
  // (e.g., "This subject is foundational for JEE Main").
  feedsExams?: string[];
  // Full chapter list. Populated for high-priority subjects first;
  // others fall back to officialChapterIndex.
  chapters?: SchoolChapter[];
}

export interface ClassSyllabus {
  // ISO-style key: "cbse-class-10", "icse-class-12"
  key: string;
  boardSlug: string;          // matches schooling-data.ts board slugs
  classNum: number;
  subjects: SchoolSubject[];
}

// ─────────────────────────────────────────────────────────────────────
// CBSE Class 10  (per CBSE/NCERT 2024-25 curriculum)
// Source: https://www.cbse.gov.in/cbsenew/curriculum.html
// ─────────────────────────────────────────────────────────────────────
const CBSE_CLASS_10_SUBJECTS: SchoolSubject[] = [
  {
    slug: "mathematics",
    name: "Mathematics",
    blurb: "Real numbers, polynomials, linear equations, trigonometry, statistics. The foundation for every quantitative entrance exam.",
    chapterCount: 15,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?jemh1=0-15",
    feedsExams: ["JEE_MAIN"],
    chapters: [
      { slug: "real-numbers",                       number: 1,  name: "Real Numbers",                              blurb: "Euclid's division lemma, fundamental theorem of arithmetic, irrationality proofs." },
      { slug: "polynomials",                        number: 2,  name: "Polynomials",                               blurb: "Geometric meaning of zeroes, division algorithm, relationships between coefficients and zeroes." },
      { slug: "pair-of-linear-equations",           number: 3,  name: "Pair of Linear Equations in Two Variables", blurb: "Graphical + algebraic methods (substitution, elimination, cross-multiplication)." },
      { slug: "quadratic-equations",                number: 4,  name: "Quadratic Equations",                       blurb: "Factorisation, quadratic formula, nature of roots via discriminant." },
      { slug: "arithmetic-progressions",            number: 5,  name: "Arithmetic Progressions",                   blurb: "nth term, sum of n terms, applications." },
      { slug: "triangles",                          number: 6,  name: "Triangles",                                 blurb: "Similarity, criteria for similarity, areas of similar triangles, Pythagoras theorem." },
      { slug: "coordinate-geometry",                number: 7,  name: "Coordinate Geometry",                       blurb: "Distance, section formula, area of a triangle." },
      { slug: "introduction-to-trigonometry",       number: 8,  name: "Introduction to Trigonometry",              blurb: "Trigonometric ratios, identities, complementary-angle relationships." },
      { slug: "applications-of-trigonometry",       number: 9,  name: "Some Applications of Trigonometry",         blurb: "Heights + distances using angles of elevation and depression." },
      { slug: "circles",                            number: 10, name: "Circles",                                   blurb: "Tangents to circles, theorems on tangent length from an external point." },
      { slug: "areas-related-to-circles",           number: 11, name: "Areas Related to Circles",                  blurb: "Sector + segment areas, composite figures." },
      { slug: "surface-areas-and-volumes",          number: 12, name: "Surface Areas and Volumes",                 blurb: "Combinations of solids, frustum of a cone." },
      { slug: "statistics",                         number: 13, name: "Statistics",                                blurb: "Mean / median / mode for grouped data, cumulative frequency curves." },
      { slug: "probability",                        number: 14, name: "Probability",                               blurb: "Theoretical (classical) probability of an event." },
    ],
  },
  {
    slug: "science",
    name: "Science",
    blurb: "Light + electricity + chemical reactions + heredity + ecosystems. Combined physics, chemistry, biology — splits in Class 11.",
    chapterCount: 13,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?jesc1=0-13",
    feedsExams: ["JEE_MAIN", "NEET_UG"],
    chapters: [
      { slug: "chemical-reactions-and-equations", number: 1,  name: "Chemical Reactions and Equations",     blurb: "Balancing, types (combination, decomposition, redox), corrosion, rancidity." },
      { slug: "acids-bases-and-salts",            number: 2,  name: "Acids, Bases and Salts",                blurb: "Indicators, neutralisation, pH scale, salt nomenclature." },
      { slug: "metals-and-non-metals",            number: 3,  name: "Metals and Non-Metals",                 blurb: "Reactivity series, extraction, properties, ionic + covalent bonds." },
      { slug: "carbon-and-its-compounds",         number: 4,  name: "Carbon and Its Compounds",              blurb: "Catenation, functional groups, homologous series, soaps and detergents." },
      { slug: "life-processes",                   number: 5,  name: "Life Processes",                        blurb: "Nutrition, respiration, transportation, excretion in plants and animals." },
      { slug: "control-and-coordination",         number: 6,  name: "Control and Coordination",              blurb: "Nervous system, hormones in plants and animals." },
      { slug: "how-do-organisms-reproduce",       number: 7,  name: "How Do Organisms Reproduce?",           blurb: "Asexual + sexual reproduction, reproductive health." },
      { slug: "heredity",                          number: 8,  name: "Heredity",                              blurb: "Mendel's laws, sex determination, evolution basics." },
      { slug: "light-reflection-and-refraction",  number: 9,  name: "Light – Reflection and Refraction",     blurb: "Spherical mirrors, lenses, lens formula, magnification, refractive index." },
      { slug: "human-eye-and-colourful-world",    number: 10, name: "The Human Eye and the Colourful World", blurb: "Accommodation, defects of vision, prisms, dispersion, atmospheric refraction." },
      { slug: "electricity",                       number: 11, name: "Electricity",                           blurb: "Ohm's law, resistance, series + parallel circuits, heating effect, power." },
      { slug: "magnetic-effects-of-current",      number: 12, name: "Magnetic Effects of Electric Current",  blurb: "Magnetic fields, force on a conductor, electromagnetic induction, AC + DC." },
      { slug: "our-environment",                  number: 13, name: "Our Environment",                       blurb: "Ecosystems, food chains, ozone depletion, waste management." },
    ],
  },
  {
    slug: "social-science",
    name: "Social Science",
    blurb: "History, geography, civics, economics. Includes the rise of nationalism, agriculture, federalism, money + credit.",
    chapterCount: 18,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?jess1=0-18",
  },
  {
    slug: "english",
    name: "English (First Flight + Footprints)",
    blurb: "Prose, poetry, supplementary reading + grammar + writing skills. Two textbooks: First Flight (main) + Footprints Without Feet (supplementary).",
    chapterCount: 11,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?jeff1=0-12",
  },
  {
    slug: "hindi-a",
    name: "Hindi Course A (Kshitij + Kritika)",
    blurb: "हिंदी कोर्स A. क्षितिज (पद्य + गद्य) + कृतिका. CBSE Class 10 का मुख्य हिंदी पाठ्यक्रम.",
    chapterCount: 14,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?jhks1=0-13",
  },
  {
    slug: "hindi-b",
    name: "Hindi Course B (Sparsh + Sanchayan)",
    blurb: "हिंदी कोर्स B. स्पर्श + संचयन. हिंदी द्वितीय भाषा के रूप में पढ़ने वालों के लिए.",
    chapterCount: 13,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?jhsp1=0-13",
  },
  {
    slug: "computer-applications",
    name: "Computer Applications (Optional)",
    blurb: "Networking, HTML, cybersecurity, scratch programming. CBSE skill-subject taught alongside the 5 main subjects.",
    chapterCount: 7,
  },
];

// ─────────────────────────────────────────────────────────────────────
// CBSE Class 12  (per CBSE/NCERT 2024-25 curriculum)
// Streams: Science (PCM / PCMB / PCB), Commerce, Humanities
// Source: https://www.cbse.gov.in/cbsenew/curriculum.html
// ─────────────────────────────────────────────────────────────────────
const CBSE_CLASS_12_SUBJECTS: SchoolSubject[] = [
  // Science stream
  {
    slug: "physics",
    name: "Physics",
    blurb: "Electrostatics, current electricity, magnetism, EMI, EM waves, optics, modern physics. The single most-tested subject for engineering entrances.",
    chapterCount: 15,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?leph1=0-8",
    feedsExams: ["JEE_MAIN", "JEE_ADVANCED", "NEET_UG"],
    chapters: [
      { slug: "electric-charges-and-fields",         number: 1,  name: "Electric Charges and Fields",          blurb: "Coulomb's law, electric field, dipole, Gauss's law." },
      { slug: "electrostatic-potential-capacitance", number: 2,  name: "Electrostatic Potential and Capacitance", blurb: "Potential due to charges, capacitor combinations, energy stored." },
      { slug: "current-electricity",                 number: 3,  name: "Current Electricity",                  blurb: "Ohm's law, drift velocity, Kirchhoff's laws, Wheatstone bridge, potentiometer." },
      { slug: "moving-charges-and-magnetism",        number: 4,  name: "Moving Charges and Magnetism",         blurb: "Biot-Savart, Ampere's law, force on current, cyclotron, galvanometer." },
      { slug: "magnetism-and-matter",                number: 5,  name: "Magnetism and Matter",                 blurb: "Bar magnet, earth's magnetism, dia/para/ferromagnetism, Curie's law." },
      { slug: "electromagnetic-induction",           number: 6,  name: "Electromagnetic Induction",            blurb: "Faraday's laws, Lenz's law, self + mutual inductance, motional EMF." },
      { slug: "alternating-current",                 number: 7,  name: "Alternating Current",                  blurb: "RMS values, LCR series, resonance, power factor, transformer." },
      { slug: "electromagnetic-waves",               number: 8,  name: "Electromagnetic Waves",                blurb: "Displacement current, EM spectrum, properties of EM waves." },
      { slug: "ray-optics-and-optical-instruments",  number: 9,  name: "Ray Optics and Optical Instruments",   blurb: "Mirrors, refraction, lens formula, prism, microscope, telescope." },
      { slug: "wave-optics",                          number: 10, name: "Wave Optics",                         blurb: "Huygens principle, interference, diffraction, polarisation." },
      { slug: "dual-nature-of-radiation-and-matter", number: 11, name: "Dual Nature of Radiation and Matter",  blurb: "Photoelectric effect, de Broglie hypothesis, Davisson-Germer experiment." },
      { slug: "atoms",                                number: 12, name: "Atoms",                                blurb: "Rutherford + Bohr models, hydrogen spectrum, energy levels." },
      { slug: "nuclei",                               number: 13, name: "Nuclei",                               blurb: "Mass defect, binding energy, radioactivity, fission, fusion." },
      { slug: "semiconductor-electronics",           number: 14, name: "Semiconductor Electronics",            blurb: "p-n junction, diode, BJT, logic gates." },
    ],
  },
  {
    slug: "chemistry",
    name: "Chemistry",
    blurb: "Solid state, solutions, electrochemistry, kinetics, coordination compounds, biomolecules. Critical for NEET, fundamental for JEE.",
    chapterCount: 16,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?lech1=0-9",
    feedsExams: ["JEE_MAIN", "JEE_ADVANCED", "NEET_UG"],
    chapters: [
      { slug: "solutions",                         number: 1,  name: "Solutions",                            blurb: "Types, concentration, Raoult's law, colligative properties, abnormal molar mass." },
      { slug: "electrochemistry",                  number: 2,  name: "Electrochemistry",                     blurb: "Galvanic cells, Nernst equation, conductivity, electrolysis, batteries." },
      { slug: "chemical-kinetics",                 number: 3,  name: "Chemical Kinetics",                    blurb: "Rate, order, molecularity, integrated rate equations, Arrhenius, collision theory." },
      { slug: "the-d-and-f-block-elements",        number: 4,  name: "The d- and f-Block Elements",          blurb: "Transition metals, lanthanides, actinides, oxidation states, complex formation." },
      { slug: "coordination-compounds",            number: 5,  name: "Coordination Compounds",               blurb: "Ligands, nomenclature, isomerism, bonding theories (VBT, CFT)." },
      { slug: "haloalkanes-and-haloarenes",        number: 6,  name: "Haloalkanes and Haloarenes",           blurb: "Preparation, properties, SN1/SN2, E1/E2 mechanisms." },
      { slug: "alcohols-phenols-and-ethers",       number: 7,  name: "Alcohols, Phenols and Ethers",         blurb: "Preparation, properties, acidity of phenols, Reimer-Tiemann, Williamson." },
      { slug: "aldehydes-ketones-carboxylic-acids", number: 8, name: "Aldehydes, Ketones and Carboxylic Acids", blurb: "Nucleophilic addition, oxidation, Aldol, Cannizzaro, ester formation." },
      { slug: "amines",                            number: 9,  name: "Amines",                                blurb: "Preparation, basicity, Hofmann, Carbylamine, diazonium salts." },
      { slug: "biomolecules",                      number: 10, name: "Biomolecules",                          blurb: "Carbohydrates, proteins, enzymes, nucleic acids, vitamins." },
    ],
  },
  {
    slug: "mathematics",
    name: "Mathematics",
    blurb: "Relations + functions, calculus, vectors, 3-D geometry, linear programming, probability. The hardest of the three for JEE.",
    chapterCount: 13,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?lemh1=0-13",
    feedsExams: ["JEE_MAIN", "JEE_ADVANCED"],
    chapters: [
      { slug: "relations-and-functions",        number: 1,  name: "Relations and Functions",          blurb: "Types of relations, types of functions, composition, inverse." },
      { slug: "inverse-trigonometric-functions", number: 2, name: "Inverse Trigonometric Functions",   blurb: "Principal value branches, properties, identities." },
      { slug: "matrices",                       number: 3,  name: "Matrices",                          blurb: "Types, operations, transpose, symmetric/skew-symmetric, invertibility." },
      { slug: "determinants",                   number: 4,  name: "Determinants",                      blurb: "Properties, area of triangle, adjoint, inverse, system of equations." },
      { slug: "continuity-and-differentiability", number: 5, name: "Continuity and Differentiability", blurb: "Continuity, derivative, chain rule, logarithmic + parametric differentiation." },
      { slug: "applications-of-derivatives",    number: 6,  name: "Application of Derivatives",        blurb: "Rate of change, tangents + normals, maxima + minima, monotonicity." },
      { slug: "integrals",                      number: 7,  name: "Integrals",                         blurb: "Indefinite + definite, methods of integration, fundamental theorem of calculus." },
      { slug: "applications-of-integrals",      number: 8,  name: "Application of Integrals",          blurb: "Area under curves, between curves." },
      { slug: "differential-equations",         number: 9,  name: "Differential Equations",            blurb: "Order, degree, formation, solution of variables-separable + linear equations." },
      { slug: "vector-algebra",                 number: 10, name: "Vector Algebra",                    blurb: "Types, dot + cross product, applications to geometry." },
      { slug: "three-dimensional-geometry",     number: 11, name: "Three Dimensional Geometry",        blurb: "Direction cosines, equations of lines + planes, distance formulas." },
      { slug: "linear-programming",             number: 12, name: "Linear Programming",                blurb: "Graphical method for solving LPP, feasible region." },
      { slug: "probability",                    number: 13, name: "Probability",                       blurb: "Conditional probability, Bayes' theorem, binomial distribution." },
    ],
  },
  {
    slug: "biology",
    name: "Biology",
    blurb: "Reproduction, genetics + evolution, biology + human welfare, biotechnology, ecology. The largest single-subject weight in NEET.",
    chapterCount: 13,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?lebo1=0-16",
    feedsExams: ["NEET_UG"],
    chapters: [
      { slug: "sexual-reproduction-flowering-plants", number: 1, name: "Sexual Reproduction in Flowering Plants", blurb: "Flower structure, micro/megasporogenesis, double fertilisation, apomixis." },
      { slug: "human-reproduction",                  number: 2,  name: "Human Reproduction",                       blurb: "Male + female reproductive systems, gametogenesis, menstrual cycle, parturition." },
      { slug: "reproductive-health",                 number: 3,  name: "Reproductive Health",                      blurb: "STIs, contraception, infertility, MTP, amniocentesis." },
      { slug: "principles-of-inheritance",           number: 4,  name: "Principles of Inheritance and Variation",  blurb: "Mendel's laws, linkage, sex determination, mutations, pedigree." },
      { slug: "molecular-basis-of-inheritance",      number: 5,  name: "Molecular Basis of Inheritance",           blurb: "DNA, transcription, translation, regulation, Human Genome Project." },
      { slug: "evolution",                            number: 6,  name: "Evolution",                                 blurb: "Theories, evidences, Hardy-Weinberg, human evolution." },
      { slug: "human-health-and-disease",            number: 7,  name: "Human Health and Disease",                 blurb: "Pathogens, immunity, AIDS, cancer, drug + alcohol abuse." },
      { slug: "microbes-in-human-welfare",           number: 8,  name: "Microbes in Human Welfare",                blurb: "Fermentation, sewage treatment, biofertilisers, biocontrol agents." },
      { slug: "biotechnology-principles-and-processes", number: 9, name: "Biotechnology: Principles and Processes", blurb: "Restriction enzymes, vectors, recombinant DNA, PCR, bioreactor." },
      { slug: "biotechnology-and-its-applications",  number: 10, name: "Biotechnology and Its Applications",       blurb: "Transgenic organisms, gene therapy, RNAi, GM crops, biosafety." },
      { slug: "organisms-and-populations",           number: 11, name: "Organisms and Populations",                blurb: "Ecological factors, population attributes, growth curves, interactions." },
      { slug: "ecosystem",                            number: 12, name: "Ecosystem",                                blurb: "Structure, energy flow, food chains, biogeochemical cycles." },
      { slug: "biodiversity-and-conservation",       number: 13, name: "Biodiversity and Conservation",            blurb: "Patterns, threats, conservation strategies, biodiversity hotspots." },
    ],
  },
  // Commerce stream
  {
    slug: "accountancy",
    name: "Accountancy",
    blurb: "Partnership, financial statements, cash flow, ratio analysis. Single largest CA Foundation prep input.",
    chapterCount: 13,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?leac1=0-6",
  },
  {
    slug: "business-studies",
    name: "Business Studies",
    blurb: "Principles of management, business environment, marketing, consumer protection. Conceptual subject — strong reading + writing weight.",
    chapterCount: 12,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?lebs1=0-12",
  },
  {
    slug: "economics",
    name: "Economics",
    blurb: "Microeconomics (consumer behaviour, market structures) + macroeconomics (national income, money + banking, government budget).",
    chapterCount: 16,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?leie1=0-6",
    feedsExams: ["IPMAT"],
  },
  // Humanities
  {
    slug: "history",
    name: "History",
    blurb: "Themes in Indian history (3 volumes). Bricks, beads + bones; kings + chronicles; colonialism + countryside; Mahatma Gandhi; framing the constitution.",
    chapterCount: 15,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?lehs1=0-15",
    feedsExams: ["UPSC_PRELIMS"],
  },
  {
    slug: "political-science",
    name: "Political Science",
    blurb: "Contemporary world politics + politics in India since Independence. UPSC-relevant for Polity + International Relations.",
    chapterCount: 16,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?leps1=0-9",
    feedsExams: ["UPSC_PRELIMS"],
  },
  {
    slug: "geography",
    name: "Geography",
    blurb: "Fundamentals of human geography + India: people + economy. Strong UPSC overlap, especially for Indian geography paper.",
    chapterCount: 17,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?legy1=0-10",
    feedsExams: ["UPSC_PRELIMS"],
  },
  {
    slug: "english-core",
    name: "English Core (Flamingo + Vistas)",
    blurb: "Prose, poetry, supplementary (short stories). Required across all streams — counts toward best-of-5 percentage.",
    chapterCount: 12,
    officialChapterIndex: "https://ncert.nic.in/textbook.php?lefl1=0-8",
  },
];

// ─────────────────────────────────────────────────────────────────────
// ICSE Class 10  (per CISCE 2024-25 curriculum)
// Source: https://cisce.org/curriculum.aspx
// ─────────────────────────────────────────────────────────────────────
const ICSE_CLASS_10_SUBJECTS: SchoolSubject[] = [
  { slug: "english-language",   name: "English I (Language)",      blurb: "Composition, comprehension, grammar.", chapterCount: 0 },
  { slug: "english-literature", name: "English II (Literature)",   blurb: "Treasure Chest, Merchant of Venice, poems.", chapterCount: 0 },
  { slug: "mathematics",        name: "Mathematics",               blurb: "ICSE Maths — wider arithmetic + commercial maths than CBSE.", chapterCount: 25, feedsExams: ["JEE_MAIN"] },
  { slug: "physics",            name: "Physics",                   blurb: "Force, energy, light, sound, current electricity, modern physics.", chapterCount: 11, feedsExams: ["JEE_MAIN", "NEET_UG"] },
  { slug: "chemistry",          name: "Chemistry",                 blurb: "Periodic properties, chemical bonding, analytical chemistry, acids + bases, ammonia.", chapterCount: 11, feedsExams: ["JEE_MAIN", "NEET_UG"] },
  { slug: "biology",            name: "Biology",                   blurb: "Cell + genetics + plant physiology + human anatomy + ecology.", chapterCount: 12, feedsExams: ["NEET_UG"] },
  { slug: "history-civics",     name: "History + Civics",          blurb: "Indian history (1857-1947) + Indian constitution + UN.", chapterCount: 0 },
  { slug: "geography",          name: "Geography",                 blurb: "Map work + agriculture + industry + India regional studies.", chapterCount: 0 },
  { slug: "computer-applications", name: "Computer Applications", blurb: "Java programming — classes, objects, arrays, strings.", chapterCount: 11 },
];

// ─────────────────────────────────────────────────────────────────────
// ICSE Class 12 (ISC) (per CISCE 2024-25 curriculum)
// ─────────────────────────────────────────────────────────────────────
const ICSE_CLASS_12_SUBJECTS: SchoolSubject[] = [
  { slug: "english",      name: "English",      blurb: "Compulsory paper across all streams.", chapterCount: 0 },
  { slug: "mathematics",  name: "Mathematics",  blurb: "Calculus, probability, vectors, 3-D geometry, linear programming.", chapterCount: 16, feedsExams: ["JEE_MAIN", "JEE_ADVANCED"] },
  { slug: "physics",      name: "Physics",      blurb: "Electrostatics, current electricity, magnetism, EM waves, modern physics, communication.", chapterCount: 11, feedsExams: ["JEE_MAIN", "JEE_ADVANCED", "NEET_UG"] },
  { slug: "chemistry",    name: "Chemistry",    blurb: "Physical, inorganic + organic. Slightly broader scope than CBSE.", chapterCount: 11, feedsExams: ["JEE_MAIN", "JEE_ADVANCED", "NEET_UG"] },
  { slug: "biology",      name: "Biology",      blurb: "Reproduction, genetics, evolution, biotechnology, ecology.", chapterCount: 14, feedsExams: ["NEET_UG"] },
  { slug: "accounts",     name: "Accounts",     blurb: "Partnership accounts, company accounts, financial statement analysis, ratio + cash flow.", chapterCount: 0 },
  { slug: "commerce",     name: "Commerce",     blurb: "Forms of business, management, trade, finance, leadership.", chapterCount: 0 },
  { slug: "economics",    name: "Economics",    blurb: "Micro + macro + Indian economic problems. Slightly heavier theory than CBSE.", chapterCount: 0, feedsExams: ["IPMAT"] },
  { slug: "history",      name: "History",      blurb: "World history + Indian history post-1857.", chapterCount: 0 },
  { slug: "psychology",   name: "Psychology",   blurb: "ISC offers a full psychology paper (CBSE has it too but lighter coverage).", chapterCount: 0 },
];

// ─────────────────────────────────────────────────────────────────────
// Public lookup table.
// ─────────────────────────────────────────────────────────────────────

export const CLASS_SYLLABUS: ClassSyllabus[] = [
  { key: "cbse-class-10", boardSlug: "cbse",       classNum: 10, subjects: CBSE_CLASS_10_SUBJECTS },
  { key: "cbse-class-12", boardSlug: "cbse",       classNum: 12, subjects: CBSE_CLASS_12_SUBJECTS },
  { key: "icse-class-10", boardSlug: "icse-cisce", classNum: 10, subjects: ICSE_CLASS_10_SUBJECTS },
  { key: "icse-class-12", boardSlug: "icse-cisce", classNum: 12, subjects: ICSE_CLASS_12_SUBJECTS },
];

export function findClassSyllabus(boardSlug: string, classNum: number): ClassSyllabus | undefined {
  return CLASS_SYLLABUS.find((c) => c.boardSlug === boardSlug && c.classNum === classNum);
}

export function findSubject(boardSlug: string, classNum: number, subjectSlug: string): SchoolSubject | undefined {
  return findClassSyllabus(boardSlug, classNum)?.subjects.find((s) => s.slug === subjectSlug);
}

export function findChapter(boardSlug: string, classNum: number, subjectSlug: string, chapterSlug: string): SchoolChapter | undefined {
  return findSubject(boardSlug, classNum, subjectSlug)?.chapters?.find((c) => c.slug === chapterSlug);
}

/**
 * Walk every (board, class, subject) tuple that has a chapter list,
 * yielding one entry per chapter. Used by sitemap + generateStaticParams.
 */
export function allChapterPaths(): Array<{
  boardSlug: string;
  classNum: number;
  subjectSlug: string;
  chapterSlug: string;
}> {
  const out: Array<{ boardSlug: string; classNum: number; subjectSlug: string; chapterSlug: string }> = [];
  for (const cls of CLASS_SYLLABUS) {
    for (const subject of cls.subjects) {
      if (!subject.chapters) continue;
      for (const ch of subject.chapters) {
        out.push({
          boardSlug: cls.boardSlug,
          classNum: cls.classNum,
          subjectSlug: subject.slug,
          chapterSlug: ch.slug,
        });
      }
    }
  }
  return out;
}

/** Class-level NCERT URL for the "official syllabus" link on a class page. */
export function ncertClassUrl(boardSlug: string, classNum: number): string | null {
  // NCERT hosts CBSE chapter PDFs at well-known per-class paths.
  if (boardSlug === "cbse") {
    return `https://ncert.nic.in/textbook.php?fec1=${classNum}-12`;
  }
  if (boardSlug === "icse-cisce") {
    return "https://cisce.org/curriculum.aspx";
  }
  return null;
}
