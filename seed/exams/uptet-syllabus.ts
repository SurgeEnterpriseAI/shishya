// UPTET (Uttar Pradesh Teacher Eligibility Test) — full syllabus tree.
// Conducted by UPBEB (Uttar Pradesh Basic Education Board / PNP Allahabad).
// Two papers, each 150 MCQs × 1 mark = 150 marks in 150 minutes. No negative marking.
// Source: official UPTET notification & syllabus (updeled.gov.in / upbasiceduboard.gov.in),
// cross-checked with NCTE TET framework. Covers Paper I (Class 1–5) and Paper II (Class 6–8).
// Languages on offer for Lang I/II: Hindi, English, Sanskrit, Urdu.
//
// Run after seedExams: npx tsx seed/exams/uptet-syllabus.ts

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

export const uptetSyllabus: SubjectSeed[] = [
  // ── CHILD DEVELOPMENT & PEDAGOGY (Paper I + Paper II) ─────────────────
  {
    code: "CDP",
    name: "Child Development and Pedagogy",
    weight: 1,
    topics: [
      { code: "cdp.child_development", name: "Child Development",
        description: "Concept and principles of child development relevant to the primary and upper-primary stage.",
        subtopics: [
          { code: "cdp.child_development.concept", name: "Concept of Development & Relationship with Learning", description: "Definition, principles, and how development influences learning." },
          { code: "cdp.child_development.principles", name: "Principles of Development", description: "Continuous, sequential, individual-difference, cephalocaudal, and proximodistal principles." },
          { code: "cdp.child_development.heredity_environment", name: "Influence of Heredity and Environment", description: "Nature vs nurture; role of family, school, peers, culture in development." },
          { code: "cdp.child_development.dimensions", name: "Dimensions of Development", description: "Physical, motor, cognitive, emotional, social, moral and language dimensions." },
          { code: "cdp.child_development.socialization", name: "Socialization Processes", description: "Role of teachers, parents and peers in social development." },
          { code: "cdp.child_development.piaget", name: "Piaget's Theory of Cognitive Development", description: "Stages, schemata, assimilation and accommodation." },
          { code: "cdp.child_development.kohlberg", name: "Kohlberg's Theory of Moral Development", description: "Pre-conventional, conventional and post-conventional levels." },
          { code: "cdp.child_development.vygotsky", name: "Vygotsky's Socio-cultural Theory", description: "Zone of proximal development, scaffolding, social mediation of learning." },
          { code: "cdp.child_development.bruner", name: "Bruner's Theory of Cognitive Growth", description: "Enactive, iconic and symbolic modes of representation." },
          { code: "cdp.child_development.intelligence", name: "Concept of Intelligence", description: "IQ, multi-dimensional intelligence and Gardner's multiple intelligences." },
          { code: "cdp.child_development.individual_differences", name: "Individual Differences among Learners", description: "Differences based on language, caste, gender, religion, ability and aptitude." },
          { code: "cdp.child_development.personality", name: "Personality and Adjustment", description: "Personality theories, mental health and adjustment in school context." },
          { code: "cdp.child_development.gender", name: "Gender as a Social Construct", description: "Gender roles, gender bias and educational practice." },
          { code: "cdp.child_development.language_thought", name: "Language and Thought", description: "Relationship between language acquisition and cognitive development." },
        ],
      },
      { code: "cdp.learning_theories", name: "Learning Theories and Pedagogy",
        description: "Approaches and theories explaining how children learn.",
        subtopics: [
          { code: "cdp.learning_theories.thorndike", name: "Thorndike's Connectionism", description: "Trial and error, laws of readiness, exercise and effect." },
          { code: "cdp.learning_theories.pavlov", name: "Pavlov's Classical Conditioning", description: "Stimulus-response association and classroom implications." },
          { code: "cdp.learning_theories.skinner", name: "Skinner's Operant Conditioning", description: "Reinforcement, punishment, programmed instruction." },
          { code: "cdp.learning_theories.gestalt", name: "Gestalt Theory and Insight Learning", description: "Perception, insight and problem-solving as a whole." },
          { code: "cdp.learning_theories.constructivism", name: "Constructivism", description: "Child as constructor of knowledge; Piaget and Vygotsky perspectives." },
          { code: "cdp.learning_theories.observational", name: "Observational/Social Learning", description: "Bandura's modelling, imitation and self-efficacy." },
          { code: "cdp.learning_theories.motivation", name: "Motivation and Learning", description: "Intrinsic vs extrinsic motivation, Maslow's hierarchy, achievement motivation." },
          { code: "cdp.learning_theories.memory_forgetting", name: "Memory, Forgetting and Transfer", description: "Types of memory, theories of forgetting, transfer of learning." },
        ],
      },
      { code: "cdp.inclusive_education", name: "Inclusive Education and CWSN",
        description: "Addressing diverse learners and children with special needs.",
        subtopics: [
          { code: "cdp.inclusive_education.disadvantaged", name: "Learners from Disadvantaged Backgrounds", description: "SC/ST/minority/migrant and economically disadvantaged learners." },
          { code: "cdp.inclusive_education.learning_difficulties", name: "Learners with Learning Difficulties", description: "Dyslexia, dysgraphia, dyscalculia, ADHD identification and support." },
          { code: "cdp.inclusive_education.talented", name: "Talented, Creative and Specially-abled Learners", description: "Differentiated strategies for gifted and creative children." },
          { code: "cdp.inclusive_education.rte", name: "Right to Education Act 2009", description: "Provisions of the RTE Act and inclusive classroom requirements." },
        ],
      },
      { code: "cdp.assessment", name: "Assessment and Evaluation",
        description: "Forms and methods of assessment in school education.",
        subtopics: [
          { code: "cdp.assessment.types", name: "Assessment for vs Assessment of Learning", description: "Formative vs summative assessment in primary classrooms." },
          { code: "cdp.assessment.cce", name: "Continuous and Comprehensive Evaluation", description: "CCE perspective, tools and practice." },
          { code: "cdp.assessment.questioning", name: "Formulating Appropriate Questions", description: "Questions for readiness, enhancement and critical thinking." },
        ],
      },
      { code: "cdp.pedagogy_concerns", name: "Pedagogical Concerns",
        description: "Teaching-learning approaches in primary and upper-primary classrooms.",
        subtopics: [
          { code: "cdp.pedagogy_concerns.methods", name: "Inquiry, Project and Activity Based Learning", description: "Methods that make learners active constructors of knowledge." },
          { code: "cdp.pedagogy_concerns.classroom_management", name: "Classroom Management and Behaviour", description: "Heterogeneous classroom organisation, discipline and child rights." },
          { code: "cdp.pedagogy_concerns.lesson_planning", name: "Lesson Planning", description: "Pre-active, interactive and post-active phases of teaching." },
          { code: "cdp.pedagogy_concerns.guidance", name: "Guidance and Counselling", description: "Educational, vocational and personal guidance for learners." },
        ],
      },
    ],
  },

  // ── LANGUAGE I (Hindi) ────────────────────────────────────────────────
  {
    code: "LANG1",
    name: "Language I — Hindi",
    weight: 1,
    topics: [
      { code: "lang1.comprehension", name: "Language Comprehension",
        description: "Unseen prose and poetry passages with comprehension, grammar and vocabulary questions.",
        subtopics: [
          { code: "lang1.comprehension.prose", name: "Unseen Prose Passage (Gadyansh)", description: "Comprehension, inference and verbal ability from a Hindi prose excerpt." },
          { code: "lang1.comprehension.poetry", name: "Unseen Poetry Passage (Padyansh)", description: "Comprehension, literary devices (alankar, ras) and inference from a Hindi poem." },
        ],
      },
      { code: "lang1.grammar", name: "Hindi Grammar (Vyakaran)",
        description: "Hindi grammar fundamentals as per primary and upper-primary syllabus.",
        subtopics: [
          { code: "lang1.grammar.varna", name: "Varna Vichar", description: "Vowels (svar), consonants (vyanjan) and matra usage." },
          { code: "lang1.grammar.shabd", name: "Shabd Vichar", description: "Word formation, tatsam-tadbhav, deshaj-videshaj words." },
          { code: "lang1.grammar.sandhi", name: "Sandhi", description: "Swar sandhi, vyanjan sandhi and visarg sandhi rules." },
          { code: "lang1.grammar.samas", name: "Samas", description: "Tatpurush, dvandva, dvigu, karmadharaya, bahuvrihi, avyayibhav." },
          { code: "lang1.grammar.sangya_sarvanam", name: "Sangya, Sarvanam, Visheshan, Kriya", description: "Noun, pronoun, adjective and verb classes in Hindi." },
          { code: "lang1.grammar.ling_vachan_kaal", name: "Ling, Vachan, Kaal", description: "Gender, number and tense in Hindi sentences." },
          { code: "lang1.grammar.vakya", name: "Vakya Rachna", description: "Sentence structure, types of sentences, punctuation (viram chinh)." },
          { code: "lang1.grammar.upsarg_pratyay", name: "Upsarg and Pratyay", description: "Prefixes and suffixes in Hindi word-formation." },
          { code: "lang1.grammar.muhavare", name: "Muhavare and Lokoktiyan", description: "Idioms, proverbs and their meanings/usage." },
          { code: "lang1.grammar.paryayvachi_vilom", name: "Paryayvachi and Vilom Shabd", description: "Synonyms and antonyms in Hindi." },
        ],
      },
      { code: "lang1.pedagogy", name: "Pedagogy of Hindi Language Development",
        description: "Hindi-specific pedagogical concepts at primary and upper-primary stages.",
        subtopics: [
          { code: "lang1.pedagogy.acquisition", name: "Language Acquisition and Learning", description: "Difference between acquisition and learning; first-language pedagogy." },
          { code: "lang1.pedagogy.principles", name: "Principles of Hindi Language Teaching", description: "Key principles guiding Hindi instruction in elementary classes." },
          { code: "lang1.pedagogy.skills", name: "Listening, Speaking, Reading, Writing (LSRW)", description: "Integration of LSRW skills in the Hindi classroom." },
          { code: "lang1.pedagogy.diverse", name: "Challenges in a Diverse Classroom", description: "Multilingual learners, language errors and disorders in Hindi instruction." },
          { code: "lang1.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbooks, multimedia, multilingual resources for Hindi." },
          { code: "lang1.pedagogy.evaluation", name: "Evaluation of Language Proficiency", description: "Assessment of comprehension, expression and grammatical accuracy." },
          { code: "lang1.pedagogy.remedial", name: "Remedial Teaching", description: "Identifying gaps and providing remediation in Hindi." },
        ],
      },
    ],
  },

  // ── LANGUAGE II (English) ─────────────────────────────────────────────
  {
    code: "LANG2",
    name: "Language II — English",
    weight: 1,
    topics: [
      { code: "lang2.comprehension", name: "Language Comprehension",
        description: "Unseen English passages — prose and poetry — with comprehension and inference questions.",
        subtopics: [
          { code: "lang2.comprehension.prose", name: "Unseen Prose Passage", description: "Comprehension, inference and vocabulary questions from a prose passage." },
          { code: "lang2.comprehension.poem", name: "Unseen Poem", description: "Comprehension and literary-device questions from an English poem." },
        ],
      },
      { code: "lang2.grammar", name: "English Grammar",
        description: "Grammar of English at primary and upper-primary level.",
        subtopics: [
          { code: "lang2.grammar.parts_of_speech", name: "Parts of Speech", description: "Noun, pronoun, verb, adjective, adverb, preposition, conjunction, interjection." },
          { code: "lang2.grammar.tenses", name: "Tenses", description: "Present, past and future — simple, continuous, perfect and perfect-continuous." },
          { code: "lang2.grammar.articles_determiners", name: "Articles and Determiners", description: "A/an/the and other determiners, including some/any/much/many." },
          { code: "lang2.grammar.voice", name: "Active and Passive Voice", description: "Conversion between active and passive voice." },
          { code: "lang2.grammar.narration", name: "Direct and Indirect Speech", description: "Reporting verbs and changes in tense, pronouns and time references." },
          { code: "lang2.grammar.punctuation", name: "Punctuation", description: "Capital letters, full-stop, comma, question mark, quotation marks." },
          { code: "lang2.grammar.subject_verb", name: "Subject-Verb Agreement", description: "Concord rules for singular/plural subjects." },
          { code: "lang2.grammar.modals", name: "Modal Auxiliaries", description: "Can, could, may, might, shall, should, will, would, must, ought to." },
          { code: "lang2.grammar.vocabulary", name: "Vocabulary", description: "Synonyms, antonyms, one-word substitutions and word formation." },
        ],
      },
      { code: "lang2.pedagogy", name: "Pedagogy of English Language Development",
        description: "Pedagogical principles for teaching English as a second language.",
        subtopics: [
          { code: "lang2.pedagogy.acquisition", name: "Learning and Acquisition", description: "Krashen's input hypothesis and second-language acquisition theories." },
          { code: "lang2.pedagogy.principles", name: "Principles of English Language Teaching", description: "Communicative approach, structural approach and direct method." },
          { code: "lang2.pedagogy.skills", name: "Role of Listening, Speaking, Reading, Writing", description: "Integration of LSRW in the English classroom." },
          { code: "lang2.pedagogy.grammar_role", name: "Role of Grammar in Communication", description: "Grammar as a tool for communicative competence rather than rote rules." },
          { code: "lang2.pedagogy.diverse", name: "Challenges of Teaching in Diverse Classrooms", description: "Language difficulties, errors and disorders among ESL learners." },
          { code: "lang2.pedagogy.evaluation", name: "Evaluating Language Proficiency", description: "Assessment of speaking, listening, reading and writing skills." },
          { code: "lang2.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbooks, audio-visual aids and multilingual resources." },
          { code: "lang2.pedagogy.remedial", name: "Remedial Teaching", description: "Diagnostic teaching for English learners with difficulties." },
        ],
      },
    ],
  },

  // ── MATHEMATICS (Paper I + content shared with Paper II) ─────────────
  {
    code: "MATH",
    name: "Mathematics",
    weight: 1,
    topics: [
      { code: "math.numbers", name: "Number System", description: "Whole numbers, place value, four basic operations and Indian currency." },
      { code: "math.factors_multiples", name: "Factors, Multiples, HCF and LCM", description: "Prime/composite numbers, divisibility, HCF and LCM." },
      { code: "math.fractions", name: "Fractions and Decimals", description: "Proper, improper, mixed fractions, decimals and operations on them." },
      { code: "math.rational_numbers", name: "Rational Numbers (Class 6–8)", description: "Operations on rational numbers, properties and representation on number line." },
      { code: "math.exponents", name: "Exponents and Powers", description: "Laws of exponents, square and cube roots, scientific notation." },
      { code: "math.algebra", name: "Algebra", description: "Algebraic expressions, linear equations, identities, factorisation." },
      { code: "math.ratio_proportion", name: "Ratio, Proportion and Percentage", description: "Unitary method, ratio, proportion, percentage and applications." },
      { code: "math.profit_loss_si", name: "Profit, Loss and Simple Interest", description: "Profit/loss, discount, simple interest and compound interest basics." },
      { code: "math.geometry", name: "Geometry", description: "Lines, angles, triangles, quadrilaterals, circles and constructions." },
      { code: "math.mensuration", name: "Mensuration", description: "Perimeter, area and volume of plane figures and solid shapes." },
      { code: "math.symmetry", name: "Symmetry and Reflection", description: "Line symmetry, rotational symmetry and reflection in mirrors." },
      { code: "math.data_handling", name: "Data Handling", description: "Tally marks, pictographs, bar graphs, pie charts and mean/median/mode." },
      { code: "math.measurement", name: "Measurement", description: "Length, weight, capacity, time and temperature in standard units." },
      { code: "math.pedagogy", name: "Pedagogical Issues in Mathematics",
        description: "Mathematics-specific teaching, evaluation and remediation methods.",
        subtopics: [
          { code: "math.pedagogy.nature", name: "Nature of Mathematics and Logical Thinking", description: "Mathematics as the science of patterns; logical reasoning at primary level." },
          { code: "math.pedagogy.curriculum", name: "Place of Mathematics in Curriculum", description: "Aims of teaching mathematics; mathematics in NCERT/UP Board syllabus." },
          { code: "math.pedagogy.language", name: "Language of Mathematics", description: "Mathematical vocabulary, symbolisation and communication." },
          { code: "math.pedagogy.community", name: "Community Mathematics", description: "Linking school mathematics with the child's environment." },
          { code: "math.pedagogy.evaluation", name: "Evaluation through Formal and Informal Methods", description: "Diagnostic evaluation and CCE in mathematics." },
          { code: "math.pedagogy.problems_teaching", name: "Problems of Teaching", description: "Common difficulties and misconceptions in primary mathematics." },
          { code: "math.pedagogy.error_analysis", name: "Error Analysis and Remedial Teaching", description: "Identifying error patterns and providing diagnostic-remedial support." },
        ],
      },
    ],
  },

  // ── ENVIRONMENTAL STUDIES (Paper I) ──────────────────────────────────
  {
    code: "EVS",
    name: "Environmental Studies",
    weight: 1,
    topics: [
      { code: "evs.family_friends", name: "Family and Friends", description: "Family structures, relationships, animals, plants and friends in the child's surroundings." },
      { code: "evs.food", name: "Food", description: "Sources of food, nutrients, balanced diet, food preservation and deficiency diseases." },
      { code: "evs.shelter", name: "Shelter", description: "Houses across regions, building materials and shelter for animals." },
      { code: "evs.water", name: "Water", description: "Sources of water, water cycle, conservation, scarcity and water-borne diseases." },
      { code: "evs.travel", name: "Travel", description: "Modes of transport, road, rail, water and air; communication systems." },
      { code: "evs.things_we_make", name: "Things We Make and Do", description: "Local crafts, occupations and products of UP regions." },
      { code: "evs.body_health", name: "Body and Health", description: "Body parts, organs, hygiene, immunisation and common diseases." },
      { code: "evs.plants_animals", name: "Plants and Animals", description: "Plant parts, photosynthesis, life cycle of animals and adaptations." },
      { code: "evs.weather_seasons", name: "Weather, Air and Sky", description: "Air, weather elements, seasons, solar system basics." },
      { code: "evs.our_country", name: "Our Country — India and UP", description: "States, capitals, major rivers, monuments and cultural heritage of UP." },
      { code: "evs.civics_governance", name: "Governance and Constitution", description: "Panchayati raj, municipalities, state and central government, basics of the Constitution." },
      { code: "evs.environment_protection", name: "Environment Protection", description: "Pollution, conservation, government schemes and sustainable development." },
      { code: "evs.pedagogy", name: "Pedagogical Issues in EVS",
        description: "EVS-specific pedagogy and integration with science and social studies.",
        subtopics: [
          { code: "evs.pedagogy.concept_scope", name: "Concept and Scope of EVS", description: "Scope and significance of environmental studies in primary classes." },
          { code: "evs.pedagogy.integrated", name: "EVS as an Integrated Subject", description: "Integration of science and social science perspectives." },
          { code: "evs.pedagogy.approaches", name: "Approaches to Presenting Concepts", description: "Activity-based, experiential and discovery learning in EVS." },
          { code: "evs.pedagogy.activities", name: "Activities and Experimentation", description: "Field trips, projects and experiments suitable for primary children." },
          { code: "evs.pedagogy.cce", name: "CCE in EVS", description: "Continuous comprehensive evaluation in environmental studies." },
          { code: "evs.pedagogy.tlm", name: "Teaching Aids and Materials", description: "Charts, models, real objects and ICT resources for EVS." },
          { code: "evs.pedagogy.problems", name: "Problems in Teaching EVS", description: "Common challenges and remediation in primary EVS classrooms." },
        ],
      },
    ],
  },

  // ── MATHEMATICS & SCIENCE (Paper II option) ──────────────────────────
  {
    code: "MATH_SCI",
    name: "Mathematics and Science (Paper II)",
    weight: 1,
    topics: [
      { code: "math_sci.science.matter", name: "Matter and Materials", description: "States of matter, mixtures, separation, acids/bases/salts and chemical changes." },
      { code: "math_sci.science.living", name: "Living World", description: "Cells, tissues, plant nutrition, transport and reproduction in plants." },
      { code: "math_sci.science.human_body", name: "Human Body and Health", description: "Digestive, respiratory, circulatory, excretory and nervous systems; nutrition and diseases." },
      { code: "math_sci.science.microorganisms", name: "Microorganisms", description: "Bacteria, viruses, fungi, useful and harmful microbes." },
      { code: "math_sci.science.motion_force", name: "Motion and Force", description: "Types of motion, force, friction and Newton's laws (introductory)." },
      { code: "math_sci.science.energy", name: "Work, Energy and Sound", description: "Forms of energy, conservation, sound production and propagation." },
      { code: "math_sci.science.light", name: "Light", description: "Rectilinear propagation, reflection, refraction and image formation by mirrors/lenses." },
      { code: "math_sci.science.electricity", name: "Electricity and Magnetism", description: "Electric current, circuits, magnets, electromagnets and applications." },
      { code: "math_sci.science.natural_resources", name: "Natural Resources", description: "Air, water, soil, coal, petroleum, conservation and pollution." },
      { code: "math_sci.science.environment", name: "Environment and Ecosystem", description: "Ecosystem components, food chains, biodiversity and environmental issues." },
      { code: "math_sci.science.pedagogy", name: "Pedagogical Issues in Science", description: "Nature of science, aims of teaching, lab work, problem-solving, evaluation and remedial teaching." },
      { code: "math_sci.math.number_system", name: "Number System (Class 6–8)", description: "Integers, rational numbers, real numbers, square/cube roots, exponents." },
      { code: "math_sci.math.algebra", name: "Algebra (Class 6–8)", description: "Algebraic expressions, identities, linear equations in one/two variables, factorisation." },
      { code: "math_sci.math.geometry", name: "Geometry (Class 6–8)", description: "Triangles, quadrilaterals, circles, constructions and Pythagoras theorem." },
      { code: "math_sci.math.mensuration", name: "Mensuration (Class 6–8)", description: "Area, perimeter, surface area and volume of 2D and 3D figures." },
      { code: "math_sci.math.commercial", name: "Commercial Mathematics", description: "Profit/loss, discount, simple and compound interest, banking basics." },
      { code: "math_sci.math.statistics", name: "Statistics and Probability", description: "Data representation, mean/median/mode, introduction to probability." },
      { code: "math_sci.math.pedagogy", name: "Pedagogical Issues in Mathematics", description: "Mathematics curriculum, language of mathematics, evaluation and remedial teaching." },
    ],
  },

  // ── SOCIAL STUDIES (Paper II option) ─────────────────────────────────
  {
    code: "SOCIAL_STUDIES",
    name: "Social Studies (Paper II)",
    weight: 1,
    topics: [
      { code: "ss.history.ancient", name: "Ancient India", description: "Stone Age, Indus Valley Civilisation, Vedic period, Mahajanapadas and Mauryan empire." },
      { code: "ss.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Vijayanagara, Mughal empire, bhakti and sufi movements." },
      { code: "ss.history.modern", name: "Modern India", description: "Advent of Europeans, British rule, 1857 revolt, freedom struggle and independence." },
      { code: "ss.history.uttar_pradesh", name: "History of Uttar Pradesh", description: "Major events, dynasties and freedom-movement contributions of UP." },
      { code: "ss.geography.earth", name: "Earth as a Planet", description: "Solar system, latitudes, longitudes, motions of the Earth, time zones." },
      { code: "ss.geography.physical", name: "Physical Geography of India", description: "Major landforms, climate, rivers, soils and natural vegetation." },
      { code: "ss.geography.resources", name: "Resources and Agriculture", description: "Natural resources, agriculture, industries and trade in India and UP." },
      { code: "ss.geography.world", name: "World Geography", description: "Continents, oceans, important countries and physical features." },
      { code: "ss.civics.constitution", name: "Indian Constitution", description: "Preamble, fundamental rights and duties, Directive Principles." },
      { code: "ss.civics.government", name: "Indian Government and Democracy", description: "Parliament, executive, judiciary, elections and democracy." },
      { code: "ss.civics.local", name: "Local Self-Government", description: "Panchayati raj, municipalities and urban local bodies in UP." },
      { code: "ss.civics.un", name: "United Nations and International Organisations", description: "UN, its organs and major international organisations." },
      { code: "ss.economics.basics", name: "Basic Economics", description: "Concepts of demand, supply, market, money and banking." },
      { code: "ss.economics.development", name: "Indian Economy and Development", description: "Five-year plans, sectors of the economy, agriculture, industry and services." },
      { code: "ss.environment", name: "Environmental Issues", description: "Pollution, climate change, conservation and sustainable development." },
      { code: "ss.home_science", name: "Home Science", description: "Nutrition, child care, family and household management as per UP syllabus." },
      { code: "ss.pedagogy", name: "Pedagogical Issues in Social Studies",
        description: "Pedagogy specific to Social Studies at upper-primary level.",
        subtopics: [
          { code: "ss.pedagogy.concept", name: "Concept and Nature of Social Studies", description: "Scope, aims and objectives of social studies education." },
          { code: "ss.pedagogy.classroom", name: "Classroom Processes, Activities and Discourse", description: "Discussion, debate, project method and inquiry approach." },
          { code: "ss.pedagogy.thinking", name: "Developing Critical Thinking", description: "Cultivating reasoning and inquiry in social-science learners." },
          { code: "ss.pedagogy.sources", name: "Sources — Primary and Secondary", description: "Use of historical sources, maps and contemporary data." },
          { code: "ss.pedagogy.projects", name: "Projects and Field Work", description: "Project-based and field-based learning in social studies." },
          { code: "ss.pedagogy.evaluation", name: "Evaluation in Social Studies", description: "Tools and techniques for assessing social-studies learning." },
        ],
      },
    ],
  },
];

export async function seedUptetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "UP_UPTET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — UP_UPTET exam not found.");
  }
  console.log(`Seeding UPTET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < uptetSyllabus.length; sIdx++) {
    const s = uptetSyllabus[sIdx];
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
  seedUptetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
