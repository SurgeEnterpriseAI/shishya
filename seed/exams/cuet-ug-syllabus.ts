// CUET UG (Common University Entrance Test, Undergraduate) — full syllabus tree.
// Conducted by NTA. Used for admission to central / state / private universities.
//
// Per NTA's CUET-UG 2026 notification (cuet.nta.nic.in), the test has:
//   • Section IA — Languages (13)
//   • Section IB — Other Languages (~20 additional)
//   • Section II — Domain Subjects (24 subjects, codes 301–326)
//   • Section III — General Aptitude Test (code 501)
//
// This seed covers the General Test in detail plus 5 representative domain
// subjects (Mathematics, Physics, Chemistry, Biology, English) with topics
// drawn from NCERT Class 11–12. The remaining domain subjects are listed
// under "Other Domain Subjects" — one topic per subject.
//
// Run after seedExams: npx tsx seed/exams/cuet-ug-syllabus.ts

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

export const cuetUgSyllabus: SubjectSeed[] = [
  // ── GENERAL APTITUDE TEST (Section III, Code 501) ─────────────────────
  {
    code: "GENERAL_TEST",
    name: "General Aptitude Test",
    weight: 1,
    topics: [
      { code: "gen.gk", name: "General Knowledge",
        description: "Static GK — countries & capitals, polity, books & authors, awards, Indian history, important days." },
      { code: "gen.current_affairs", name: "Current Affairs",
        description: "National & international events of the last 12 months — summits, schemes, sports, appointments." },
      { code: "gen.indian_history", name: "Indian History & National Movement",
        description: "Ancient, medieval, modern India and the freedom struggle — high-level facts only." },
      { code: "gen.indian_polity", name: "General Polity",
        description: "Constitution, Parliament, judiciary, fundamental rights and duties, governance basics." },
      { code: "gen.science_tech", name: "Science & Technology",
        description: "Inventions, discoveries, space, defence, IT — general awareness level." },
      { code: "gen.environment", name: "Environment & Ecology",
        description: "Climate change, biodiversity, environmental laws and recent environmental events." },
      { code: "gen.numerical_ability", name: "Numerical Ability",
        description: "Basic arithmetic — percentages, ratio, averages, time-work, time-speed-distance, profit-loss.",
        subtopics: [
          { code: "gen.num.percentage", name: "Percentage", description: "Simple percentage change and applied percentage problems." },
          { code: "gen.num.ratio_proportion", name: "Ratio & Proportion", description: "Direct, inverse and compound ratios." },
          { code: "gen.num.averages", name: "Averages", description: "Simple averages and weighted averages." },
          { code: "gen.num.profit_loss", name: "Profit & Loss", description: "CP / SP / MP, discount and profit percentage." },
          { code: "gen.num.time_work", name: "Time & Work", description: "Work-rate and combined-work problems." },
          { code: "gen.num.time_speed_distance", name: "Time, Speed & Distance", description: "Relative speed, trains, boats and streams basics." },
          { code: "gen.num.si_ci", name: "Simple & Compound Interest", description: "Basic SI and CI calculations." },
        ],
      },
      { code: "gen.quant_reasoning", name: "Quantitative Reasoning",
        description: "Application of basic mathematical concepts — algebra, geometry, mensuration, statistics." },
      { code: "gen.mental_ability", name: "General Mental Ability",
        description: "Series, analogies, classification, coding-decoding, blood relations, directions." },
      { code: "gen.logical_reasoning", name: "Logical & Analytical Reasoning",
        description: "Statement & conclusion, cause & effect, syllogism, logical deductions, Venn diagrams." },
      { code: "gen.data_interpretation", name: "Data Interpretation",
        description: "Reading and interpreting tables, bar / line / pie charts." },
      { code: "gen.basic_grammar", name: "Basic Grammar & Vocabulary",
        description: "Synonyms, antonyms, fill-in-the-blanks, basic sentence-correction." },
    ],
  },

  // ── MATHEMATICS DOMAIN (Code 319) ─────────────────────────────────────
  {
    code: "MATH_DOMAIN",
    name: "Mathematics / Applied Mathematics (Domain)",
    weight: 1,
    topics: [
      // Algebra
      { code: "math.relations_functions", name: "Relations & Functions",
        description: "Reflexive, symmetric, transitive and equivalence relations; one-one and onto functions; composition." },
      { code: "math.inverse_trig", name: "Inverse Trigonometric Functions",
        description: "Definition, range, domain, principal value branch and elementary properties." },
      { code: "math.matrices", name: "Matrices",
        description: "Order, types, transpose, symmetric / skew-symmetric, addition, multiplication and elementary operations." },
      { code: "math.determinants", name: "Determinants",
        description: "Properties, minors, cofactors, adjoint, inverse and solving simultaneous equations by matrix method." },

      // Calculus
      { code: "math.continuity_differentiability", name: "Continuity & Differentiability",
        description: "Continuity, differentiability, derivatives of composite, implicit, inverse-trig, exponential and log functions." },
      { code: "math.applications_derivatives", name: "Applications of Derivatives",
        description: "Rate of change, increasing / decreasing functions, tangents and normals, maxima and minima." },
      { code: "math.integrals", name: "Integrals",
        description: "Indefinite integrals by substitution, parts and partial fractions; definite integrals and properties." },
      { code: "math.applications_integrals", name: "Applications of the Integrals",
        description: "Area under simple curves, between two curves, and bounded regions." },
      { code: "math.differential_equations", name: "Differential Equations",
        description: "Order, degree; solution of first-order first-degree, separable, homogeneous and linear DEs." },

      // Vectors & 3D
      { code: "math.vectors", name: "Vectors",
        description: "Vector addition, scalar multiplication, dot and cross product, projection and direction cosines." },
      { code: "math.three_d_geometry", name: "Three-Dimensional Geometry",
        description: "Direction cosines, equations of lines and planes, angle between them, shortest distance." },

      // Linear Programming
      { code: "math.linear_programming", name: "Linear Programming",
        description: "Formulation, graphical method for two-variable LP problems, feasible region, optimal solution." },

      // Probability
      { code: "math.probability", name: "Probability",
        description: "Conditional probability, multiplication theorem, independent events, Bayes' theorem, random variable, binomial distribution." },
    ],
  },

  // ── PHYSICS DOMAIN (Code 322) ─────────────────────────────────────────
  {
    code: "PHYSICS_DOMAIN",
    name: "Physics (Domain)",
    weight: 1,
    topics: [
      { code: "phy.electrostatics", name: "Electrostatics",
        description: "Electric charges, Coulomb's law, electric field, dipoles, Gauss's law, potential, capacitance." },
      { code: "phy.current_electricity", name: "Current Electricity",
        description: "Ohm's law, drift velocity, resistance, Kirchhoff's laws, Wheatstone bridge, cells and EMF." },
      { code: "phy.magnetic_effects", name: "Magnetic Effects of Current & Magnetism",
        description: "Biot-Savart, Ampere's law, force on a current, moving-coil galvanometer, magnetism and matter." },
      { code: "phy.emi_ac", name: "Electromagnetic Induction & Alternating Current",
        description: "Faraday's law, Lenz's law, self / mutual inductance, AC generators, LCR circuits, transformers." },
      { code: "phy.em_waves", name: "Electromagnetic Waves",
        description: "Displacement current, EM spectrum, basic features of EM waves." },
      { code: "phy.optics", name: "Optics",
        description: "Reflection, refraction, lenses, mirrors, prisms, optical instruments, wave optics — interference, diffraction, polarisation." },
      { code: "phy.dual_nature", name: "Dual Nature of Radiation & Matter",
        description: "Photoelectric effect, Einstein's equation, de Broglie wavelength, Davisson-Germer experiment." },
      { code: "phy.atoms_nuclei", name: "Atoms & Nuclei",
        description: "Bohr model, hydrogen spectrum, nuclear structure, mass-energy, radioactivity, fission and fusion." },
      { code: "phy.electronic_devices", name: "Electronic Devices",
        description: "Semiconductors, p-n junction diode, rectifiers, special-purpose diodes, junction transistor basics, logic gates." },
      { code: "phy.communication_systems", name: "Communication Systems",
        description: "Elements of a communication system, modulation (AM), bandwidth, propagation of EM waves." },
    ],
  },

  // ── CHEMISTRY DOMAIN (Code 306) ───────────────────────────────────────
  {
    code: "CHEMISTRY_DOMAIN",
    name: "Chemistry (Domain)",
    weight: 1,
    topics: [
      { code: "chem.solid_state", name: "Solid State",
        description: "Classification of solids, unit cells, packing efficiency, point defects, electrical / magnetic properties." },
      { code: "chem.solutions", name: "Solutions",
        description: "Concentration units, Raoult's law, colligative properties, abnormal molar mass, van't Hoff factor." },
      { code: "chem.electrochemistry", name: "Electrochemistry",
        description: "Galvanic / electrolytic cells, electrode potentials, Nernst equation, conductance, batteries, corrosion." },
      { code: "chem.chemical_kinetics", name: "Chemical Kinetics",
        description: "Rate of reaction, order and molecularity, integrated rate equations, Arrhenius equation, collision theory." },
      { code: "chem.surface_chemistry", name: "Surface Chemistry",
        description: "Adsorption, catalysis, colloids, emulsions, types of solutions and tyndall effect." },
      { code: "chem.isolation_elements", name: "General Principles & Processes of Isolation of Elements",
        description: "Principles of metallurgy — concentration, reduction, refining; thermodynamic and electrochemical principles." },
      { code: "chem.p_block", name: "p-Block Elements",
        description: "Group 15, 16, 17, 18 elements — trends, oxoacids, allotropes, important compounds." },
      { code: "chem.d_f_block", name: "d- and f-Block Elements",
        description: "Transition metals, lanthanoids and actinoids — electronic configuration, oxidation states, properties." },
      { code: "chem.coordination_compounds", name: "Coordination Compounds",
        description: "Werner's theory, IUPAC nomenclature, isomerism, bonding (VBT, CFT), importance and applications." },
      { code: "chem.haloalkanes_haloarenes", name: "Haloalkanes & Haloarenes",
        description: "Nomenclature, methods of preparation, physical and chemical properties, mechanisms (SN1, SN2)." },
      { code: "chem.alcohols_phenols_ethers", name: "Alcohols, Phenols & Ethers",
        description: "Preparation, properties, reactions; identification and uses of common alcohols and phenols." },
      { code: "chem.aldehydes_ketones_acids", name: "Aldehydes, Ketones & Carboxylic Acids",
        description: "Nomenclature, structure, preparation, important reactions and uses." },
      { code: "chem.amines", name: "Amines",
        description: "Classification, preparation, properties, identification of primary, secondary, tertiary amines; diazonium salts." },
      { code: "chem.biomolecules", name: "Biomolecules",
        description: "Carbohydrates, proteins, enzymes, vitamins, nucleic acids — structure and biological role." },
      { code: "chem.polymers", name: "Polymers",
        description: "Classification, methods of polymerisation, important polymers and biodegradable polymers." },
      { code: "chem.everyday_chemistry", name: "Chemistry in Everyday Life",
        description: "Drugs, soaps, detergents, food preservatives — classification and applications." },
    ],
  },

  // ── BIOLOGY DOMAIN (Code 304) ─────────────────────────────────────────
  {
    code: "BIOLOGY_DOMAIN",
    name: "Biology / Biological Studies (Domain)",
    weight: 1,
    topics: [
      { code: "bio.reproduction_organisms", name: "Reproduction in Organisms",
        description: "Modes of reproduction — asexual and sexual; reproductive cycles." },
      { code: "bio.sexual_reproduction_plants", name: "Sexual Reproduction in Flowering Plants",
        description: "Flower structure, microsporogenesis, megasporogenesis, double fertilisation, post-fertilisation events." },
      { code: "bio.human_reproduction", name: "Human Reproduction",
        description: "Male / female reproductive systems, gametogenesis, menstrual cycle, fertilisation, pregnancy, lactation." },
      { code: "bio.reproductive_health", name: "Reproductive Health",
        description: "Reproductive health issues, contraception, MTP, STIs, infertility, ART techniques." },
      { code: "bio.heredity_variation", name: "Principles of Inheritance & Variation",
        description: "Mendelian genetics, deviations, sex determination, linkage, mutations, genetic disorders." },
      { code: "bio.molecular_basis", name: "Molecular Basis of Inheritance",
        description: "DNA, RNA, replication, transcription, translation, gene regulation, human genome project." },
      { code: "bio.evolution", name: "Evolution",
        description: "Origin of life, theories of evolution, Hardy-Weinberg principle, human evolution." },
      { code: "bio.health_disease", name: "Human Health & Disease",
        description: "Pathogens, immunity, vaccines, AIDS, cancer, drugs and alcohol abuse." },
      { code: "bio.food_production", name: "Strategies for Enhancement in Food Production",
        description: "Animal husbandry, plant breeding, tissue culture, single-cell protein, biofortification." },
      { code: "bio.microbes_human_welfare", name: "Microbes in Human Welfare",
        description: "Microbes in food production, industry, sewage treatment, biogas, biocontrol agents." },
      { code: "bio.biotechnology_principles", name: "Biotechnology — Principles & Processes",
        description: "Recombinant DNA technology, tools, restriction enzymes, vectors, PCR, gene cloning." },
      { code: "bio.biotechnology_applications", name: "Biotechnology — Applications",
        description: "Application in agriculture, medicine, GM crops, transgenic animals, gene therapy, ELISA." },
      { code: "bio.organisms_populations", name: "Organisms & Populations",
        description: "Ecology basics, population attributes, growth models, population interactions." },
      { code: "bio.ecosystem", name: "Ecosystem",
        description: "Components, energy flow, ecological pyramids, productivity, decomposition, nutrient cycles." },
      { code: "bio.biodiversity_conservation", name: "Biodiversity & Conservation",
        description: "Biodiversity patterns, loss, threats, conservation strategies, biodiversity hotspots." },
      { code: "bio.environmental_issues", name: "Environmental Issues",
        description: "Air, water and soil pollution, solid waste, ozone depletion, deforestation, greenhouse effect." },
    ],
  },

  // ── ENGLISH DOMAIN (Section IA — Code 101) ────────────────────────────
  {
    code: "ENGLISH",
    name: "English (Language Test)",
    weight: 1,
    topics: [
      { code: "eng.reading_factual", name: "Reading Comprehension — Factual Passages",
        description: "Comprehension of factual passages — direct and detail-based questions." },
      { code: "eng.reading_literary", name: "Reading Comprehension — Literary Passages",
        description: "Comprehension of poetry, fiction, drama excerpts — theme and tone." },
      { code: "eng.reading_narrative", name: "Reading Comprehension — Narrative Passages",
        description: "Comprehension of short stories and narrative texts." },
      { code: "eng.synonyms", name: "Synonyms",
        description: "Identify the closest meaning to a given word." },
      { code: "eng.antonyms", name: "Antonyms",
        description: "Identify the opposite meaning of a given word." },
      { code: "eng.vocabulary", name: "Vocabulary in Context",
        description: "Meaning of a word as used in a passage or sentence." },
      { code: "eng.fill_blanks", name: "Fill in the Blanks",
        description: "Choose the correct word to complete a sentence." },
      { code: "eng.error_spotting", name: "Error Spotting & Correction",
        description: "Identify and correct grammatical / structural errors." },
      { code: "eng.rearrangement", name: "Rearrangement of Sentences",
        description: "Reorder jumbled sentences into a coherent paragraph." },
      { code: "eng.idioms_phrases", name: "Idioms & Phrases",
        description: "Meaning and usage of common English idioms and phrases." },
      { code: "eng.one_word_substitution", name: "One-Word Substitution",
        description: "Replace a phrase with a single appropriate word." },
      { code: "eng.verbal_reasoning", name: "Verbal Reasoning",
        description: "Analogies, odd-one-out and inference-based language questions." },
    ],
  },

  // ── OTHER DOMAIN SUBJECTS ─────────────────────────────────────────────
  // One topic per remaining Section II domain subject (per NTA's CUET-UG
  // 2026 list of 24 domain subject codes 301–326).
  {
    code: "OTHER_DOMAINS",
    name: "Other Domain Subjects",
    weight: 1,
    topics: [
      { code: "other.accountancy", name: "Accountancy / Book-Keeping",
        description: "NCERT Class 12 — partnership, share & debenture accounting, financial statement analysis, cash-flow." },
      { code: "other.agriculture", name: "Agriculture",
        description: "NCERT Class 12 — agro-meteorology, soil & water conservation, crop production, livestock." },
      { code: "other.anthropology", name: "Anthropology",
        description: "NCERT Class 12 — physical, social-cultural, archaeological and applied anthropology." },
      { code: "other.business_studies", name: "Business Studies",
        description: "NCERT Class 12 — principles of management, business environment, marketing, finance." },
      { code: "other.economics", name: "Economics / Business Economics",
        description: "NCERT Class 12 — micro and macro economics, national income, money, banking, government budget." },
      { code: "other.environmental_science", name: "Environmental Science",
        description: "Ecology, ecosystems, biodiversity, pollution, environmental policy and sustainability." },
      { code: "other.computer_science", name: "Computer Science / Informatics Practices",
        description: "NCERT Class 12 — Python programming, data structures, databases, networking, cyber-ethics." },
      { code: "other.fine_arts", name: "Fine Arts / Visual Arts / Commercial Arts",
        description: "Indian art history, painting, sculpture, graphic and commercial-art fundamentals." },
      { code: "other.geography", name: "Geography / Geology",
        description: "NCERT Class 12 — human geography, India and the world, geology basics." },
      { code: "other.history", name: "History",
        description: "NCERT Class 12 — themes in Indian history (ancient, medieval, modern); world history." },
      { code: "other.home_science", name: "Home Science",
        description: "Human development, family resource management, nutrition, fabric and apparel, communication." },
      { code: "other.knowledge_tradition", name: "Knowledge Tradition & Practices in India",
        description: "Indian knowledge systems — astronomy, mathematics, philosophy, literature, art, medicine." },
      { code: "other.legal_studies", name: "Legal Studies",
        description: "Indian Constitution, judiciary, legal services, human rights, international law basics." },
      { code: "other.mass_media", name: "Mass Media / Mass Communication",
        description: "Print, broadcast, digital media; journalism, advertising, public relations." },
      { code: "other.performing_arts", name: "Performing Arts",
        description: "Indian classical dance, music, theatre — history, gharanas, forms and practitioners." },
      { code: "other.physical_education", name: "Physical Education",
        description: "NCERT Class 12 — sports training, physiology, sports psychology, biomechanics, yoga." },
      { code: "other.political_science", name: "Political Science",
        description: "NCERT Class 12 — politics in India since Independence, contemporary world politics." },
      { code: "other.psychology", name: "Psychology",
        description: "NCERT Class 12 — variations in psychological attributes, self & personality, meeting life challenges, social behaviour." },
      { code: "other.sanskrit", name: "Sanskrit",
        description: "Sanskrit prose, poetry, drama; grammar — sandhi, samasa, karaka, verb conjugation." },
      { code: "other.sociology", name: "Sociology",
        description: "NCERT Class 12 — Indian society, social institutions, change and development in India." },
      { code: "other.teaching_aptitude", name: "Teaching Aptitude",
        description: "Teaching methods, learners, communication, evaluation systems and educational research." },
      { code: "other.tourism", name: "Tourism",
        description: "History, types and impact of tourism; tourism geography, products and management." },
      { code: "other.entrepreneurship", name: "Entrepreneurship",
        description: "Entrepreneurial ventures, business arithmetic, resource mobilisation, enterprise marketing." },
    ],
  },
];

export async function seedCuetUgSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "CUET_UG" } });
  if (!exam) {
    throw new Error("Run seedExams() first — CUET_UG exam not found.");
  }
  console.log(`Seeding CUET UG syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < cuetUgSyllabus.length; sIdx++) {
    const s = cuetUgSyllabus[sIdx];
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
  seedCuetUgSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
