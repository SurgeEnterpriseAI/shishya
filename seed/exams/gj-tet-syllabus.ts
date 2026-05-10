// Gujarat TET (TET-1 + TET-2) — full syllabus tree.
// Conducted by State Examination Board (SEB), Gandhinagar.
// Two papers, each 150 MCQs × 1 mark = 150 marks. No negative marking.
// TET-1: Classes 1-5 (CDP, Lang I, Lang II, Math, EVS).
// TET-2: Classes 6-8 (CDP, Lang I, Lang II, Math+Sci OR Social Science).
// Lang I options: Gujarati, Hindi, Sindhi, Marathi, Urdu, English.
// Source: sebexam.org Gujarat TET-1 / TET-2 syllabus 2025 (official),
// cross-checked with MaruGujarat / Testbook coverage.
//
// Run after seedExams: npx tsx seed/exams/gj-tet-syllabus.ts

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

export const gjTetSyllabus: SubjectSeed[] = [
  // ── CHILD DEVELOPMENT & PEDAGOGY ──────────────────────────────────────
  {
    code: "CDP",
    name: "Child Development and Pedagogy",
    weight: 1,
    topics: [
      { code: "gjtet.cdp.development", name: "Child Development",
        description: "Concept and principles of child growth and development.",
        subtopics: [
          { code: "gjtet.cdp.development.concept", name: "Concept of Growth and Development", description: "Definition of growth, development and their relationship with learning." },
          { code: "gjtet.cdp.development.principles", name: "Principles of Development", description: "Continuity, sequence, individual differences and integration." },
          { code: "gjtet.cdp.development.heredity", name: "Heredity and Environment", description: "Influence of heredity and environment on development." },
          { code: "gjtet.cdp.development.dimensions", name: "Dimensions of Development", description: "Physical, cognitive, emotional, social, language and moral development." },
          { code: "gjtet.cdp.development.adolescence", name: "Adolescence (TET-2)", description: "Physical and emotional changes during adolescence (11-14)." },
        ],
      },
      { code: "gjtet.cdp.learning_theories", name: "Theories of Learning",
        description: "Major theories of learning and educational implications.",
        subtopics: [
          { code: "gjtet.cdp.learning_theories.behaviourism", name: "Behaviourism", description: "Pavlov, Skinner and Thorndike — conditioning and connectionism." },
          { code: "gjtet.cdp.learning_theories.gestalt", name: "Gestalt and Insight Learning", description: "Perception, problem-solving and insight learning." },
          { code: "gjtet.cdp.learning_theories.piaget", name: "Piaget — Cognitive Development", description: "Stages of cognitive development and schema theory." },
          { code: "gjtet.cdp.learning_theories.vygotsky", name: "Vygotsky — Socio-cultural Theory", description: "Zone of Proximal Development and scaffolding." },
          { code: "gjtet.cdp.learning_theories.bruner", name: "Bruner — Discovery Learning", description: "Modes of representation and spiral curriculum." },
          { code: "gjtet.cdp.learning_theories.kohlberg", name: "Kohlberg — Moral Development", description: "Stages of moral reasoning and educational implications." },
          { code: "gjtet.cdp.learning_theories.constructivism", name: "Constructivism", description: "Knowledge construction by learners through experience." },
        ],
      },
      { code: "gjtet.cdp.intelligence", name: "Intelligence and Creativity",
        description: "Theories of intelligence and creativity.",
        subtopics: [
          { code: "gjtet.cdp.intelligence.theories", name: "Theories of Intelligence", description: "Spearman, Thurstone, Gardner — multi-dimensional intelligence." },
          { code: "gjtet.cdp.intelligence.iq", name: "Measurement of Intelligence", description: "IQ, intelligence tests and educational implications." },
          { code: "gjtet.cdp.intelligence.creativity", name: "Creativity", description: "Concept and identification of creativity in learners." },
        ],
      },
      { code: "gjtet.cdp.individual_differences", name: "Individual Differences and Personality",
        description: "Differences among learners and personality.",
        subtopics: [
          { code: "gjtet.cdp.individual_differences.basis", name: "Basis of Differences", description: "Differences based on language, caste, gender, community and ability." },
          { code: "gjtet.cdp.individual_differences.gender", name: "Gender as a Social Construct", description: "Gender roles, gender bias and educational practice." },
          { code: "gjtet.cdp.individual_differences.personality", name: "Personality", description: "Type, trait and self-theories of personality." },
        ],
      },
      { code: "gjtet.cdp.inclusive_education", name: "Inclusive Education and Special Needs",
        description: "Diverse learners and inclusive classrooms.",
        subtopics: [
          { code: "gjtet.cdp.inclusive_education.disadvantaged", name: "Disadvantaged Learners", description: "SC/ST/minority/migrant children and educational equity." },
          { code: "gjtet.cdp.inclusive_education.disabilities", name: "Children with Learning Difficulties", description: "Dyslexia, dysgraphia, dyscalculia, ADHD." },
          { code: "gjtet.cdp.inclusive_education.gifted", name: "Gifted and Talented Children", description: "Identification and differentiated strategies for gifted learners." },
          { code: "gjtet.cdp.inclusive_education.rte", name: "Right to Education Act 2009", description: "RTE provisions and inclusive education mandate." },
        ],
      },
      { code: "gjtet.cdp.learning_pedagogy", name: "Learning and Pedagogy",
        description: "How children learn and pedagogical approaches.",
        subtopics: [
          { code: "gjtet.cdp.learning_pedagogy.how", name: "How Children Think and Learn", description: "Children as active constructors of knowledge." },
          { code: "gjtet.cdp.learning_pedagogy.motivation", name: "Motivation and Learning", description: "Intrinsic/extrinsic motivation and theories of motivation." },
          { code: "gjtet.cdp.learning_pedagogy.methods", name: "Pedagogical Methods", description: "Activity-based, project, child-centred and progressive approaches." },
          { code: "gjtet.cdp.learning_pedagogy.classroom_mgmt", name: "Classroom Management", description: "Discipline, leadership and managing diverse classrooms." },
        ],
      },
      { code: "gjtet.cdp.assessment", name: "Assessment and Evaluation",
        description: "Assessment for and of learning.",
        subtopics: [
          { code: "gjtet.cdp.assessment.types", name: "Formative and Summative Assessment", description: "Distinction between assessment for and of learning." },
          { code: "gjtet.cdp.assessment.cce", name: "Continuous Comprehensive Evaluation", description: "CCE perspective, practice and tools." },
          { code: "gjtet.cdp.assessment.tools", name: "Assessment Tools", description: "Tests, observation, portfolios, rubrics and questioning." },
        ],
      },
    ],
  },

  // ── LANGUAGE I (Gujarati / Hindi / Sindhi / Marathi / Urdu / English) ──
  {
    code: "LANG1",
    name: "Language I (Gujarati / Hindi / Sindhi / Marathi / Urdu / English)",
    weight: 1,
    topics: [
      { code: "gjtet.lang1.gujarati", name: "Gujarati",
        description: "Gujarati grammar, literature and pedagogy.",
        subtopics: [
          { code: "gjtet.lang1.gujarati.grammar", name: "Gujarati Grammar (Vyakaran)", description: "Sandhi, samas, alankar, chand and grammatical rules in Gujarati." },
          { code: "gjtet.lang1.gujarati.literature", name: "Gujarati Literature", description: "Famous Gujarati writers — Narsinh Mehta, Premanand, Govardhanram, Umashankar Joshi and modern writers." },
          { code: "gjtet.lang1.gujarati.vocabulary", name: "Gujarati Vocabulary", description: "Synonyms, antonyms, idioms (rudhi prayog) and one-word substitution." },
          { code: "gjtet.lang1.gujarati.comprehension", name: "Gujarati Comprehension", description: "Unseen Gujarati prose and poem with comprehension questions." },
        ],
      },
      { code: "gjtet.lang1.hindi", name: "Hindi",
        description: "Hindi grammar, literature and pedagogy.",
        subtopics: [
          { code: "gjtet.lang1.hindi.grammar", name: "Hindi Grammar (Vyakaran)", description: "Sandhi, samas, alankar, chand and grammatical rules in Hindi." },
          { code: "gjtet.lang1.hindi.literature", name: "Hindi Literature", description: "Premchand, Tulsidas, Surdas, Mahadevi Verma and Hindi literature streams." },
          { code: "gjtet.lang1.hindi.comprehension", name: "Hindi Comprehension", description: "Unseen Hindi passages with comprehension questions." },
        ],
      },
      { code: "gjtet.lang1.sindhi", name: "Sindhi",
        description: "Sindhi grammar, literature and pedagogy.",
        subtopics: [
          { code: "gjtet.lang1.sindhi.grammar", name: "Sindhi Grammar", description: "Sindhi grammar rules and structure." },
          { code: "gjtet.lang1.sindhi.literature", name: "Sindhi Literature", description: "Notable Sindhi writers and literary works." },
          { code: "gjtet.lang1.sindhi.comprehension", name: "Sindhi Comprehension", description: "Unseen Sindhi passages with comprehension questions." },
        ],
      },
      { code: "gjtet.lang1.marathi", name: "Marathi",
        description: "Marathi grammar, literature and pedagogy.",
        subtopics: [
          { code: "gjtet.lang1.marathi.grammar", name: "Marathi Grammar (Vyakaran)", description: "Sandhi, samas and grammatical rules in Marathi." },
          { code: "gjtet.lang1.marathi.literature", name: "Marathi Literature", description: "Famous Marathi writers — Tukaram, Dnyaneshwar, Ranade and modern Marathi authors." },
          { code: "gjtet.lang1.marathi.comprehension", name: "Marathi Comprehension", description: "Unseen Marathi passages with comprehension questions." },
        ],
      },
      { code: "gjtet.lang1.urdu", name: "Urdu",
        description: "Urdu grammar, literature and pedagogy.",
        subtopics: [
          { code: "gjtet.lang1.urdu.grammar", name: "Urdu Grammar", description: "Urdu grammar rules and morphology." },
          { code: "gjtet.lang1.urdu.literature", name: "Urdu Literature", description: "Mir, Ghalib, Iqbal, Premchand and classical/modern Urdu literature." },
          { code: "gjtet.lang1.urdu.comprehension", name: "Urdu Comprehension", description: "Unseen Urdu passages with comprehension questions." },
        ],
      },
      { code: "gjtet.lang1.english", name: "English (as Language I)",
        description: "English grammar, comprehension and vocabulary as Language I.",
        subtopics: [
          { code: "gjtet.lang1.english.grammar", name: "English Grammar", description: "Tenses, parts of speech, voice and reported speech." },
          { code: "gjtet.lang1.english.literature", name: "English Literature", description: "Notable English writers and major literary works." },
          { code: "gjtet.lang1.english.comprehension", name: "English Comprehension", description: "Unseen English passages with comprehension questions." },
        ],
      },
      { code: "gjtet.lang1.pedagogy", name: "Pedagogy of Language I",
        description: "Methods of teaching the chosen Language I.",
        subtopics: [
          { code: "gjtet.lang1.pedagogy.acquisition", name: "Language Acquisition vs Learning", description: "Krashen's principles and natural acquisition." },
          { code: "gjtet.lang1.pedagogy.principles", name: "Principles of Language Teaching", description: "Key principles guiding primary-level language instruction." },
          { code: "gjtet.lang1.pedagogy.skills", name: "LSRW Skills", description: "Listening, speaking, reading and writing in classrooms." },
          { code: "gjtet.lang1.pedagogy.diverse", name: "Teaching in Diverse Classrooms", description: "Multilingual classrooms and language errors." },
          { code: "gjtet.lang1.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbooks, multimedia and multilingual resources." },
          { code: "gjtet.lang1.pedagogy.evaluation", name: "Evaluation of Language Proficiency", description: "Speaking, listening, reading and writing assessment." },
          { code: "gjtet.lang1.pedagogy.remedial", name: "Remedial Teaching", description: "Identifying and addressing language-learning gaps." },
        ],
      },
    ],
  },

  // ── LANGUAGE II ───────────────────────────────────────────────────────
  {
    code: "LANG2",
    name: "Language II",
    weight: 1,
    topics: [
      { code: "gjtet.lang2.comprehension", name: "Reading Comprehension", description: "Two unseen prose passages with comprehension and inference questions." },
      { code: "gjtet.lang2.grammar", name: "Grammar",
        description: "Grammar rules used in language communication.",
        subtopics: [
          { code: "gjtet.lang2.grammar.tenses", name: "Tenses", description: "Simple, continuous, perfect and perfect continuous tenses." },
          { code: "gjtet.lang2.grammar.parts_speech", name: "Parts of Speech", description: "Nouns, pronouns, verbs, adjectives, adverbs, prepositions and conjunctions." },
          { code: "gjtet.lang2.grammar.voice", name: "Voice and Reported Speech", description: "Active/passive voice and direct/indirect speech." },
          { code: "gjtet.lang2.grammar.sentence", name: "Sentence Structure", description: "Subject-verb agreement, sentence types and clause analysis." },
        ],
      },
      { code: "gjtet.lang2.vocabulary", name: "Vocabulary", description: "Synonyms, antonyms and one-word substitution." },
      { code: "gjtet.lang2.pedagogy", name: "Pedagogy of Language II",
        description: "Methods of teaching Language II at primary stage.",
        subtopics: [
          { code: "gjtet.lang2.pedagogy.principles", name: "Principles of Language II Teaching", description: "Communicative, structural-situational and direct methods." },
          { code: "gjtet.lang2.pedagogy.skills", name: "LSRW Skills", description: "Listening, speaking, reading and writing in language classrooms." },
          { code: "gjtet.lang2.pedagogy.diverse", name: "Teaching in Diverse Classrooms", description: "Strategies for multilingual classrooms." },
          { code: "gjtet.lang2.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbooks, audio-visual aids and digital resources." },
          { code: "gjtet.lang2.pedagogy.assessment", name: "Evaluating Language Proficiency", description: "Speaking, listening, reading and writing assessment." },
          { code: "gjtet.lang2.pedagogy.remedial", name: "Remedial Teaching", description: "Remedial strategies for language gaps." },
        ],
      },
    ],
  },

  // ── MATHEMATICS ────────────────────────────────────────────────────────
  {
    code: "MATH",
    name: "Mathematics",
    weight: 1,
    topics: [
      { code: "gjtet.math.numbers", name: "Number System", description: "Whole numbers, integers, place value, divisibility, HCF and LCM." },
      { code: "gjtet.math.fractions", name: "Fractions and Decimals", description: "Operations on fractions and decimals and their conversions." },
      { code: "gjtet.math.arithmetic", name: "Arithmetic", description: "Percentage, ratio-proportion, profit-loss and interest." },
      { code: "gjtet.math.algebra", name: "Algebra", description: "Variables, expressions, linear equations and identities." },
      { code: "gjtet.math.geometry", name: "Geometry", description: "Lines, angles, triangles, circles, polygons and properties." },
      { code: "gjtet.math.mensuration", name: "Mensuration", description: "Area, perimeter, surface area and volume of standard figures." },
      { code: "gjtet.math.data_handling", name: "Data Handling", description: "Tables, bar graphs, pictographs, mean, median and mode." },
      { code: "gjtet.math.measurement", name: "Measurement", description: "Length, weight, capacity, time and money." },
      { code: "gjtet.math.pedagogy", name: "Pedagogy of Mathematics",
        description: "Methods of teaching mathematics in classrooms.",
        subtopics: [
          { code: "gjtet.math.pedagogy.nature", name: "Nature of Mathematics", description: "Math as a logical and exact science and place in curriculum." },
          { code: "gjtet.math.pedagogy.aims", name: "Aims and Objectives", description: "Aims of teaching mathematics at primary stage." },
          { code: "gjtet.math.pedagogy.methods", name: "Methods of Teaching", description: "Activity-based, problem-solving, inductive-deductive methods." },
          { code: "gjtet.math.pedagogy.evaluation", name: "Evaluation in Math", description: "Diagnostic, formative and summative assessment." },
          { code: "gjtet.math.pedagogy.remedial", name: "Remedial Teaching", description: "Identifying common errors and remediation strategies." },
        ],
      },
    ],
  },

  // ── EVS (TET-1) ──────────────────────────────────────────────────────
  {
    code: "EVS",
    name: "Environmental Studies (TET-1)",
    weight: 1,
    topics: [
      { code: "gjtet.evs.family_friends", name: "Family and Friends", description: "Family relationships, friends, animals and plants in our surroundings." },
      { code: "gjtet.evs.food", name: "Food", description: "Food sources, balanced diet, food preservation and nutrition." },
      { code: "gjtet.evs.shelter", name: "Shelter", description: "Houses, types of shelter, building materials and animal homes." },
      { code: "gjtet.evs.water", name: "Water", description: "Sources, conservation, water cycle and water-borne diseases." },
      { code: "gjtet.evs.travel", name: "Travel", description: "Means of transport, journey, distances and modes of communication." },
      { code: "gjtet.evs.things_we_make", name: "Things We Make and Do", description: "Tools, technology, traditional crafts and materials." },
      { code: "gjtet.evs.environment", name: "Our Environment", description: "Plants, animals, birds, weather, climate and natural phenomena." },
      { code: "gjtet.evs.health", name: "Health and Hygiene", description: "Personal hygiene, common diseases and preventive practices." },
      { code: "gjtet.evs.gj_specific", name: "Gujarat Environment", description: "Gujarat's natural features, Rann of Kutch, Gir forest, Saurashtra and biodiversity." },
      { code: "gjtet.evs.pedagogy", name: "Pedagogy of EVS",
        description: "Methods of teaching environmental studies.",
        subtopics: [
          { code: "gjtet.evs.pedagogy.concept", name: "Concept and Scope of EVS", description: "Nature, scope and integrated character of EVS." },
          { code: "gjtet.evs.pedagogy.activities", name: "Activities and Experimentation", description: "Hands-on activities, experiments and field visits." },
          { code: "gjtet.evs.pedagogy.cce", name: "CCE in EVS", description: "Continuous and comprehensive evaluation in EVS." },
          { code: "gjtet.evs.pedagogy.materials", name: "Teaching Materials", description: "Charts, models, multimedia and field-based resources." },
          { code: "gjtet.evs.pedagogy.problems", name: "Problems of Teaching EVS", description: "Difficulties and remedial strategies." },
        ],
      },
    ],
  },

  // ── TET-2: MATHEMATICS & SCIENCE ──────────────────────────────────────
  {
    code: "MATH_SCI",
    name: "Mathematics and Science (TET-2)",
    weight: 1,
    topics: [
      { code: "gjtet.ms.algebra", name: "Algebra", description: "Polynomials, equations, exponents and algebraic identities." },
      { code: "gjtet.ms.geometry", name: "Geometry", description: "Triangles, quadrilaterals, circles, coordinate geometry and basic trigonometry." },
      { code: "gjtet.ms.mensuration", name: "Mensuration", description: "Area, surface area and volume of 2D and 3D figures." },
      { code: "gjtet.ms.statistics", name: "Statistics", description: "Mean, median, mode, range and basic data interpretation." },
      { code: "gjtet.ms.physics", name: "Physics",
        description: "Physics topics for upper primary.",
        subtopics: [
          { code: "gjtet.ms.physics.mechanics", name: "Force, Motion and Work", description: "Force, friction, motion, simple machines and energy." },
          { code: "gjtet.ms.physics.heat_light", name: "Heat and Light", description: "Temperature, heat transfer, reflection, refraction and lenses." },
          { code: "gjtet.ms.physics.electricity", name: "Electricity and Magnetism", description: "Current, circuits, magnets and electromagnetic basics." },
          { code: "gjtet.ms.physics.sound", name: "Sound", description: "Production, propagation and properties of sound." },
        ],
      },
      { code: "gjtet.ms.chemistry", name: "Chemistry",
        description: "Chemistry topics for classes 6-8.",
        subtopics: [
          { code: "gjtet.ms.chemistry.matter", name: "Matter and Its Nature", description: "States of matter, mixtures, solutions and separation techniques." },
          { code: "gjtet.ms.chemistry.elements", name: "Elements, Compounds and Reactions", description: "Atoms, molecules, periodic table and chemical reactions." },
          { code: "gjtet.ms.chemistry.acids_bases", name: "Acids, Bases and Salts", description: "Common acids/bases, indicators, salts and uses." },
        ],
      },
      { code: "gjtet.ms.biology", name: "Biology",
        description: "Life processes, plants, animals and ecology.",
        subtopics: [
          { code: "gjtet.ms.biology.plants", name: "World of Plants", description: "Plant structure, photosynthesis, reproduction and classification." },
          { code: "gjtet.ms.biology.animals", name: "World of Animals", description: "Animal classification, habitats and adaptations." },
          { code: "gjtet.ms.biology.human", name: "Human Body and Health", description: "Organ systems, nutrition, diseases and hygiene." },
          { code: "gjtet.ms.biology.environment", name: "Environment and Ecology", description: "Ecosystems, biodiversity, pollution and conservation." },
        ],
      },
      { code: "gjtet.ms.pedagogy", name: "Pedagogy of Math and Science",
        description: "Methods of teaching math and science.",
        subtopics: [
          { code: "gjtet.ms.pedagogy.nature", name: "Nature and Aims", description: "Nature of math/science and aims of teaching." },
          { code: "gjtet.ms.pedagogy.methods", name: "Methods of Teaching", description: "Activity-based, experimental, project and inquiry methods." },
          { code: "gjtet.ms.pedagogy.lab", name: "Laboratory and Practical Work", description: "Practical work, lab safety and equipment." },
          { code: "gjtet.ms.pedagogy.evaluation", name: "Evaluation", description: "Formative and summative evaluation." },
        ],
      },
    ],
  },

  // ── TET-2: SOCIAL SCIENCE ─────────────────────────────────────────────
  {
    code: "SOCIAL_STUDIES",
    name: "Social Science (TET-2)",
    weight: 1,
    topics: [
      { code: "gjtet.ss.history", name: "History",
        description: "Indian and world history for classes 6-8.",
        subtopics: [
          { code: "gjtet.ss.history.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Mauryas, Guptas and southern dynasties." },
          { code: "gjtet.ss.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals, Marathas and Bhakti-Sufi movements." },
          { code: "gjtet.ss.history.modern", name: "Modern India and Freedom Struggle", description: "British rule, INC, Gandhian movement and partition." },
          { code: "gjtet.ss.history.gujarat", name: "History of Gujarat", description: "Solanki, Vaghela, Sultanate and Maratha rule; Gujarat in freedom movement." },
          { code: "gjtet.ss.history.world", name: "World History", description: "French Revolution, Industrial Revolution and World Wars." },
        ],
      },
      { code: "gjtet.ss.geography", name: "Geography",
        description: "Physical, human and economic geography.",
        subtopics: [
          { code: "gjtet.ss.geography.earth", name: "The Earth", description: "Solar system, latitudes, longitudes and earth's movements." },
          { code: "gjtet.ss.geography.physical", name: "Physical Geography", description: "Landforms, atmosphere, hydrosphere and biosphere." },
          { code: "gjtet.ss.geography.india", name: "Geography of India", description: "Physical features, climate, rivers and natural resources." },
          { code: "gjtet.ss.geography.gujarat", name: "Geography of Gujarat", description: "Districts, rivers, coastline, Rann of Kutch and Saurashtra." },
          { code: "gjtet.ss.geography.maps", name: "Maps and Map Reading", description: "Types of maps, scales, symbols and projections." },
        ],
      },
      { code: "gjtet.ss.civics", name: "Civics",
        description: "Indian Constitution and democratic institutions.",
        subtopics: [
          { code: "gjtet.ss.civics.constitution", name: "Indian Constitution", description: "Preamble, fundamental rights, duties and DPSPs." },
          { code: "gjtet.ss.civics.government", name: "Union and State Government", description: "President, PM, Parliament, Governor and CM." },
          { code: "gjtet.ss.civics.local", name: "Local Self-Government", description: "Panchayati Raj, urban local bodies and 73rd/74th Amendments." },
        ],
      },
      { code: "gjtet.ss.economics", name: "Economics",
        description: "Basic economic concepts at upper primary level.",
        subtopics: [
          { code: "gjtet.ss.economics.basics", name: "Basic Concepts", description: "Wants, needs, scarcity, production and consumption." },
          { code: "gjtet.ss.economics.indian_economy", name: "Indian Economy", description: "Sectors, planning, banking and Gujarat economic profile." },
        ],
      },
      { code: "gjtet.ss.pedagogy", name: "Pedagogy of Social Science",
        description: "Methods of teaching social science.",
        subtopics: [
          { code: "gjtet.ss.pedagogy.nature", name: "Nature and Scope", description: "Nature, scope and integrated character of social science." },
          { code: "gjtet.ss.pedagogy.methods", name: "Methods of Teaching", description: "Story-telling, dramatisation, project and field-based methods." },
          { code: "gjtet.ss.pedagogy.materials", name: "Teaching Materials", description: "Maps, charts, time-lines, models and digital resources." },
          { code: "gjtet.ss.pedagogy.evaluation", name: "Evaluation", description: "Formative and summative evaluation strategies." },
        ],
      },
    ],
  },
];

export async function seedGjTetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "GJ_TET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — GJ_TET exam not found.");
  }
  console.log(`Seeding Gujarat TET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < gjTetSyllabus.length; sIdx++) {
    const s = gjTetSyllabus[sIdx];
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
  seedGjTetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
