// TN TET (Tamil Nadu Teacher Eligibility Test) — full syllabus tree.
// Conducted by Teachers Recruitment Board (TRB), Tamil Nadu.
// Two papers, each 150 MCQs × 1 mark = 150 marks in 3 hours. No negative marking.
// Paper I: Classes 1-5 (CDP, Lang I, Lang II, Math, EVS).
// Paper II: Classes 6-8 (CDP, Lang I, Lang II, Math+Science OR Social Studies).
// Source: trb.tn.gov.in TNTET Paper I & Paper II official syllabus PDFs,
// cross-checked with NCTE TET framework and Careerpower / Adda247 / Cheggindia coverage.
//
// Run after seedExams: npx tsx seed/exams/tn-tet-syllabus.ts

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

export const tnTetSyllabus: SubjectSeed[] = [
  // ── CHILD DEVELOPMENT & PEDAGOGY ──────────────────────────────────────
  {
    code: "CDP",
    name: "Child Development and Pedagogy",
    weight: 1,
    topics: [
      { code: "tntet.cdp.development", name: "Child Development and Educational Psychology",
        description: "Concept and principles of child growth and development for ages 6-14.",
        subtopics: [
          { code: "tntet.cdp.development.concept", name: "Concept of Growth and Development", description: "Definition of growth and development and their relationship with learning." },
          { code: "tntet.cdp.development.principles", name: "Principles of Development", description: "Continuous, sequential, individual-difference and cephalocaudal/proximodistal principles." },
          { code: "tntet.cdp.development.heredity_environment", name: "Influence of Heredity and Environment", description: "Nature vs nurture, role of family, school, peers and culture." },
          { code: "tntet.cdp.development.dimensions", name: "Dimensions of Development", description: "Physical, cognitive, emotional, social, language and moral development." },
          { code: "tntet.cdp.development.adolescence", name: "Adolescence (Paper II)", description: "Physical and emotional changes during adolescence (11-14 years)." },
        ],
      },
      { code: "tntet.cdp.learning_theories", name: "Learning Theories",
        description: "Major theories of learning and their classroom implications.",
        subtopics: [
          { code: "tntet.cdp.learning_theories.behaviourism", name: "Behaviourism", description: "Pavlov classical conditioning, Skinner operant conditioning and Thorndike connectionism." },
          { code: "tntet.cdp.learning_theories.gestalt", name: "Gestalt and Insight Learning", description: "Perception, problem-solving and insight learning." },
          { code: "tntet.cdp.learning_theories.piaget", name: "Piaget — Cognitive Development", description: "Stages of cognitive development and schema theory." },
          { code: "tntet.cdp.learning_theories.vygotsky", name: "Vygotsky — Socio-cultural Theory", description: "Zone of Proximal Development and scaffolding." },
          { code: "tntet.cdp.learning_theories.bruner", name: "Bruner — Discovery Learning", description: "Modes of representation and spiral curriculum." },
          { code: "tntet.cdp.learning_theories.kohlberg", name: "Kohlberg — Moral Development", description: "Stages of moral reasoning and educational implications." },
          { code: "tntet.cdp.learning_theories.constructivism", name: "Constructivism", description: "Knowledge construction by learners through experience." },
        ],
      },
      { code: "tntet.cdp.intelligence", name: "Intelligence and Creativity",
        description: "Concept and theories of intelligence and creativity.",
        subtopics: [
          { code: "tntet.cdp.intelligence.theories", name: "Theories of Intelligence", description: "Spearman, Thurstone, Gardner — multi-dimensional intelligence." },
          { code: "tntet.cdp.intelligence.measurement", name: "Measurement of Intelligence", description: "IQ, intelligence tests and educational implications." },
          { code: "tntet.cdp.intelligence.creativity", name: "Creativity", description: "Concept and identification of creativity in learners." },
          { code: "tntet.cdp.intelligence.multiple", name: "Multiple Intelligences", description: "Gardner's eight intelligences and classroom strategies." },
        ],
      },
      { code: "tntet.cdp.individual_differences", name: "Individual Differences and Personality",
        description: "Differences among learners and personality theories.",
        subtopics: [
          { code: "tntet.cdp.individual_differences.basis", name: "Basis of Differences", description: "Differences based on language, caste, gender, community, religion and ability." },
          { code: "tntet.cdp.individual_differences.gender", name: "Gender as a Social Construct", description: "Gender roles, gender bias and educational practice." },
          { code: "tntet.cdp.individual_differences.personality", name: "Personality and Theories", description: "Type, trait and self-theories of personality." },
        ],
      },
      { code: "tntet.cdp.inclusive_education", name: "Inclusive Education and Children with Special Needs",
        description: "Diverse learners and inclusive classrooms.",
        subtopics: [
          { code: "tntet.cdp.inclusive_education.disadvantaged", name: "Disadvantaged Learners", description: "SC/ST/minority/migrant and economically weaker children in classrooms." },
          { code: "tntet.cdp.inclusive_education.disabilities", name: "Children with Learning Difficulties", description: "Dyslexia, dysgraphia, dyscalculia, ADHD and assistive strategies." },
          { code: "tntet.cdp.inclusive_education.gifted", name: "Gifted and Talented Children", description: "Identification and differentiated strategies for gifted learners." },
          { code: "tntet.cdp.inclusive_education.rte", name: "Right to Education Act 2009", description: "RTE provisions, child rights and inclusion mandate." },
        ],
      },
      { code: "tntet.cdp.learning_pedagogy", name: "Learning and Pedagogy",
        description: "How children learn and pedagogical approaches.",
        subtopics: [
          { code: "tntet.cdp.learning_pedagogy.how_children_learn", name: "How Children Think and Learn", description: "Children as active constructors of knowledge." },
          { code: "tntet.cdp.learning_pedagogy.motivation", name: "Motivation and Learning", description: "Intrinsic and extrinsic motivation and theories of motivation." },
          { code: "tntet.cdp.learning_pedagogy.cognition_emotion", name: "Cognition and Emotion", description: "Role of emotion in cognition and learning." },
          { code: "tntet.cdp.learning_pedagogy.teaching_methods", name: "Teaching Methods", description: "Activity-based, project, child-centred and progressive approaches." },
          { code: "tntet.cdp.learning_pedagogy.classroom_mgmt", name: "Classroom Management", description: "Discipline, leadership, group dynamics and managing diverse classrooms." },
        ],
      },
      { code: "tntet.cdp.assessment", name: "Assessment and Evaluation",
        description: "Assessment for and of learning in classrooms.",
        subtopics: [
          { code: "tntet.cdp.assessment.formative_summative", name: "Formative and Summative Assessment", description: "Distinction between assessment for learning and assessment of learning." },
          { code: "tntet.cdp.assessment.cce", name: "Continuous Comprehensive Evaluation", description: "CCE perspective, practice and tools." },
          { code: "tntet.cdp.assessment.tools", name: "Assessment Tools", description: "Tests, observation, portfolios, rubrics and questioning techniques." },
        ],
      },
      { code: "tntet.cdp.guidance", name: "Guidance, Counselling and Mental Health",
        description: "Mental health, guidance and counselling in schools.",
        subtopics: [
          { code: "tntet.cdp.guidance.mental_health", name: "Mental Health and Hygiene", description: "Mental wellbeing, defence mechanisms and adjustment." },
          { code: "tntet.cdp.guidance.counselling", name: "Guidance and Counselling", description: "Educational, vocational and personal counselling." },
        ],
      },
    ],
  },

  // ── LANGUAGE I (Tamil) ────────────────────────────────────────────────
  {
    code: "LANG1",
    name: "Language I — Tamil",
    weight: 1,
    topics: [
      { code: "tntet.tamil.grammar", name: "Tamil Grammar (Ilakkanam)",
        description: "Tamil grammar rules and structure.",
        subtopics: [
          { code: "tntet.tamil.grammar.eluttu", name: "Eluttu Ilakkanam", description: "Tamil letters — vowels, consonants and combined characters." },
          { code: "tntet.tamil.grammar.sol", name: "Sol Ilakkanam", description: "Word forms, parts of speech and word formation." },
          { code: "tntet.tamil.grammar.porul", name: "Porul Ilakkanam", description: "Meaning and content classification (akam, puram)." },
          { code: "tntet.tamil.grammar.yappu", name: "Yappu Ilakkanam", description: "Prosody — venba, agaval and Tamil meter rules." },
          { code: "tntet.tamil.grammar.ani", name: "Ani Ilakkanam", description: "Figures of speech (uvamai, urubu, etc.)." },
        ],
      },
      { code: "tntet.tamil.literature", name: "Tamil Literature",
        description: "Classical to modern Tamil literature.",
        subtopics: [
          { code: "tntet.tamil.literature.sangam", name: "Sangam Literature", description: "Tolkappiyam, Ettuthogai, Pathupattu — themes and society." },
          { code: "tntet.tamil.literature.thirukkural", name: "Thirukkural", description: "Thiruvalluvar's Kural — secular ethics and global relevance." },
          { code: "tntet.tamil.literature.bhakti", name: "Bhakti Literature", description: "Alvars, Nayanars, Periyapuranam and Divya Prabandham." },
          { code: "tntet.tamil.literature.epics", name: "Tamil Epics", description: "Silappathikaram, Manimekalai and Cheevaka Chinthamani." },
          { code: "tntet.tamil.literature.modern", name: "Modern Tamil Literature", description: "Bharathiyar, Bharathidasan and contemporary writers." },
        ],
      },
      { code: "tntet.tamil.comprehension", name: "Tamil Comprehension", description: "Unseen Tamil prose and poem with comprehension and inference questions." },
      { code: "tntet.tamil.vocabulary", name: "Vocabulary", description: "Synonyms, antonyms, idioms (pazhamozhi) and one-word substitution." },
      { code: "tntet.tamil.pedagogy", name: "Pedagogy of Tamil Language",
        description: "Methods of teaching Tamil at primary stage.",
        subtopics: [
          { code: "tntet.tamil.pedagogy.acquisition", name: "Language Acquisition vs Learning", description: "Krashen's principles and natural acquisition of Tamil." },
          { code: "tntet.tamil.pedagogy.principles", name: "Principles of Tamil Teaching", description: "Key principles guiding Tamil language instruction." },
          { code: "tntet.tamil.pedagogy.skills", name: "LSRW Skills", description: "Listening, speaking, reading and writing in Tamil classrooms." },
          { code: "tntet.tamil.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbooks, multimedia and multilingual resources for Tamil teaching." },
          { code: "tntet.tamil.pedagogy.evaluation", name: "Evaluation of Tamil Proficiency", description: "Speaking, listening, reading and writing assessment in Tamil." },
          { code: "tntet.tamil.pedagogy.remedial", name: "Remedial Teaching", description: "Identifying and addressing language-learning gaps in Tamil." },
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
      { code: "tntet.eng.comprehension", name: "Reading Comprehension", description: "Two unseen prose passages with comprehension and inference questions." },
      { code: "tntet.eng.grammar", name: "English Grammar",
        description: "Grammar rules used in English communication.",
        subtopics: [
          { code: "tntet.eng.grammar.tenses", name: "Tenses", description: "Simple, continuous, perfect and perfect continuous tenses." },
          { code: "tntet.eng.grammar.parts_speech", name: "Parts of Speech", description: "Nouns, pronouns, verbs, adjectives, adverbs, prepositions and conjunctions." },
          { code: "tntet.eng.grammar.voice_speech", name: "Voice and Reported Speech", description: "Active/passive voice and direct/indirect speech transformation." },
          { code: "tntet.eng.grammar.sentence", name: "Sentence Structure", description: "Subject-verb agreement, types of sentences and clause analysis." },
        ],
      },
      { code: "tntet.eng.vocabulary", name: "Vocabulary", description: "Synonyms, antonyms, one-word substitution and word formation." },
      { code: "tntet.eng.phonology", name: "Phonology", description: "Phonemes, syllables, stress, intonation and pronunciation." },
      { code: "tntet.eng.pedagogy", name: "Pedagogy of English",
        description: "Approaches and methods of teaching English at primary stage.",
        subtopics: [
          { code: "tntet.eng.pedagogy.principles", name: "Principles of English Teaching", description: "Communicative, structural-situational and direct methods." },
          { code: "tntet.eng.pedagogy.skills", name: "LSRW Skills in English", description: "Listening, speaking, reading and writing in English classrooms." },
          { code: "tntet.eng.pedagogy.diverse_classroom", name: "Teaching in Diverse Classrooms", description: "Strategies for multilingual and multi-level English classrooms." },
          { code: "tntet.eng.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbooks, audio-visual aids, dictionaries and digital resources." },
          { code: "tntet.eng.pedagogy.assessment", name: "Evaluating Language Proficiency", description: "Speaking, listening, reading and writing assessment in English." },
          { code: "tntet.eng.pedagogy.remedial", name: "Remedial Teaching", description: "Identifying language-learning gaps and remedial strategies." },
        ],
      },
    ],
  },

  // ── MATHEMATICS (Paper I + Paper II Math content) ─────────────────────
  {
    code: "MATH",
    name: "Mathematics",
    weight: 1,
    topics: [
      { code: "tntet.math.number_system", name: "Number System", description: "Whole numbers, integers, place value, divisibility, HCF and LCM." },
      { code: "tntet.math.fractions", name: "Fractions and Decimals", description: "Operations on fractions and decimals and their conversions." },
      { code: "tntet.math.algebra", name: "Algebra", description: "Linear equations, identities, polynomials and basic algebra." },
      { code: "tntet.math.geometry", name: "Geometry", description: "Lines, angles, triangles, circles, polygons and properties." },
      { code: "tntet.math.mensuration", name: "Mensuration", description: "Area, perimeter, surface area and volume of standard 2D/3D figures." },
      { code: "tntet.math.data_handling", name: "Data Handling", description: "Tables, bar graphs, pictographs, mean, median and mode." },
      { code: "tntet.math.percentage", name: "Percentage and Ratio", description: "Percentage, ratio, proportion and unitary method." },
      { code: "tntet.math.profit_loss", name: "Profit, Loss and Interest", description: "CP/SP, profit/loss, simple and compound interest." },
      { code: "tntet.math.time_distance", name: "Time, Speed and Distance", description: "Trains, boats and average speed problems." },
      { code: "tntet.math.measurement", name: "Measurement", description: "Length, weight, capacity, time and money." },
      { code: "tntet.math.pedagogy", name: "Pedagogy of Mathematics",
        description: "Approaches to teaching mathematics in classrooms.",
        subtopics: [
          { code: "tntet.math.pedagogy.nature", name: "Nature of Mathematics", description: "Mathematics as a logical and exact science and its place in curriculum." },
          { code: "tntet.math.pedagogy.curriculum", name: "Place of Mathematics in Curriculum", description: "Aims and objectives of teaching mathematics." },
          { code: "tntet.math.pedagogy.language", name: "Language of Mathematics", description: "Symbols, terminology and mathematical language." },
          { code: "tntet.math.pedagogy.community", name: "Community Mathematics", description: "Connecting mathematics to real-life context and community." },
          { code: "tntet.math.pedagogy.evaluation", name: "Evaluation in Mathematics", description: "Diagnostic, formative and summative assessment in math." },
          { code: "tntet.math.pedagogy.remedial", name: "Remedial Teaching in Math", description: "Identifying common errors and remediation strategies." },
          { code: "tntet.math.pedagogy.problems", name: "Problems of Teaching Math", description: "Common difficulties faced by teachers and learners." },
        ],
      },
    ],
  },

  // ── ENVIRONMENTAL STUDIES (Paper I) ───────────────────────────────────
  {
    code: "EVS",
    name: "Environmental Studies (Paper I)",
    weight: 1,
    topics: [
      { code: "tntet.evs.family_friends", name: "Family and Friends", description: "Family relationships, friends, animals and plants in our surroundings." },
      { code: "tntet.evs.food", name: "Food", description: "Food from various sources, nutrition, balanced diet and food preservation." },
      { code: "tntet.evs.shelter", name: "Shelter", description: "Houses, types of shelter, building materials and animal homes." },
      { code: "tntet.evs.water", name: "Water", description: "Sources, conservation, water cycle, purification and water-borne diseases." },
      { code: "tntet.evs.travel", name: "Travel", description: "Means of transport, journey, distances and modes of communication." },
      { code: "tntet.evs.things_we_make", name: "Things We Make and Do", description: "Tools, technology, traditional crafts and materials." },
      { code: "tntet.evs.our_environment", name: "Our Environment", description: "Plants, animals, birds, weather, climate and natural phenomena." },
      { code: "tntet.evs.health", name: "Health and Hygiene", description: "Personal hygiene, common diseases and preventive practices." },
      { code: "tntet.evs.tn_specific", name: "Tamil Nadu Environment", description: "TN's natural features, rivers, forests, wildlife sanctuaries and biodiversity." },
      { code: "tntet.evs.pedagogy", name: "Pedagogy of EVS",
        description: "Methods of teaching EVS in primary classrooms.",
        subtopics: [
          { code: "tntet.evs.pedagogy.concept", name: "Concept and Scope of EVS", description: "Nature, scope and integrated nature of environmental studies." },
          { code: "tntet.evs.pedagogy.significance", name: "Significance of EVS", description: "Why environmental studies matter at the primary stage." },
          { code: "tntet.evs.pedagogy.activities", name: "Activities and Experimentation", description: "Hands-on activities, experiments and field visits." },
          { code: "tntet.evs.pedagogy.cce", name: "CCE in EVS", description: "Continuous and comprehensive evaluation in EVS." },
          { code: "tntet.evs.pedagogy.materials", name: "Teaching Materials", description: "Charts, models, multimedia and field-based resources." },
          { code: "tntet.evs.pedagogy.problems", name: "Problems of Teaching EVS", description: "Difficulties and remedial strategies in EVS teaching." },
        ],
      },
    ],
  },

  // ── PAPER II: MATHEMATICS & SCIENCE ───────────────────────────────────
  {
    code: "MATH_SCI",
    name: "Mathematics and Science (Paper II)",
    weight: 1,
    topics: [
      { code: "tntet.ms.algebra", name: "Algebra", description: "Polynomials, equations, exponents and algebraic identities." },
      { code: "tntet.ms.number_system", name: "Number System", description: "Real numbers, rational/irrational, surds and indices." },
      { code: "tntet.ms.geometry", name: "Geometry and Trigonometry", description: "Triangles, circles, coordinate geometry and basic trigonometry." },
      { code: "tntet.ms.mensuration", name: "Mensuration", description: "Area, surface area and volume of 2D/3D figures." },
      { code: "tntet.ms.statistics", name: "Statistics", description: "Mean, median, mode, range and basic data interpretation." },
      { code: "tntet.ms.physics", name: "Physics",
        description: "Physics topics relevant to upper primary classes.",
        subtopics: [
          { code: "tntet.ms.physics.mechanics", name: "Force, Motion and Work", description: "Force, friction, motion, simple machines and energy." },
          { code: "tntet.ms.physics.heat", name: "Heat and Light", description: "Temperature, heat transfer, reflection, refraction and lenses." },
          { code: "tntet.ms.physics.electricity", name: "Electricity and Magnetism", description: "Current, circuits, magnets and electromagnetic basics." },
          { code: "tntet.ms.physics.sound", name: "Sound", description: "Production, propagation and properties of sound." },
        ],
      },
      { code: "tntet.ms.chemistry", name: "Chemistry",
        description: "Chemistry topics for classes 6-8.",
        subtopics: [
          { code: "tntet.ms.chemistry.matter", name: "Matter and Its Nature", description: "States of matter, mixtures, solutions and separation techniques." },
          { code: "tntet.ms.chemistry.elements", name: "Elements and Compounds", description: "Atoms, molecules, periodic classification and chemical reactions." },
          { code: "tntet.ms.chemistry.acids_bases", name: "Acids, Bases and Salts", description: "Common acids/bases, indicators, salts and their uses." },
        ],
      },
      { code: "tntet.ms.biology", name: "Biology and Life Processes",
        description: "Life processes, plants and animals.",
        subtopics: [
          { code: "tntet.ms.biology.plants", name: "World of Plants", description: "Plant structure, photosynthesis, reproduction and classification." },
          { code: "tntet.ms.biology.animals", name: "World of Animals", description: "Animal classification, habitats and adaptations." },
          { code: "tntet.ms.biology.human_body", name: "Human Body and Health", description: "Organ systems, nutrition, diseases and hygiene." },
          { code: "tntet.ms.biology.environment", name: "Environment and Ecology", description: "Ecosystems, biodiversity, pollution and conservation." },
        ],
      },
      { code: "tntet.ms.pedagogy", name: "Pedagogy of Math and Science",
        description: "Methods of teaching mathematics and science.",
        subtopics: [
          { code: "tntet.ms.pedagogy.nature", name: "Nature and Structure", description: "Nature of math/science as disciplines and their structure." },
          { code: "tntet.ms.pedagogy.aims", name: "Aims and Objectives", description: "Aims of teaching math and science at upper primary level." },
          { code: "tntet.ms.pedagogy.methods", name: "Methods of Teaching", description: "Activity-based, experimental, project and inquiry methods." },
          { code: "tntet.ms.pedagogy.lab", name: "Laboratory and Practical Work", description: "Role of practical work, lab safety and equipment." },
          { code: "tntet.ms.pedagogy.evaluation", name: "Evaluation", description: "Formative and summative evaluation in math/science." },
          { code: "tntet.ms.pedagogy.remedial", name: "Remedial Teaching", description: "Common misconceptions and remedial strategies." },
        ],
      },
    ],
  },

  // ── PAPER II: SOCIAL STUDIES ──────────────────────────────────────────
  {
    code: "SOCIAL_STUDIES",
    name: "Social Studies (Paper II Alternative)",
    weight: 1,
    topics: [
      { code: "tntet.ss.history", name: "History",
        description: "Indian and world history topics for classes 6-8.",
        subtopics: [
          { code: "tntet.ss.history.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Mauryan, Gupta and southern dynasties." },
          { code: "tntet.ss.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals, Marathas, Vijayanagar and Bhakti-Sufi movements." },
          { code: "tntet.ss.history.modern", name: "Modern India and Freedom Struggle", description: "British rule, 1857 revolt, INC, Gandhian movement and independence." },
          { code: "tntet.ss.history.tn", name: "History of Tamil Nadu", description: "Sangam age, Pallavas, Cholas, Pandyas, Vijayanagar and Nayak rule." },
          { code: "tntet.ss.history.world", name: "World History", description: "French Revolution, Industrial Revolution and World Wars." },
        ],
      },
      { code: "tntet.ss.geography", name: "Geography",
        description: "Physical, human and economic geography.",
        subtopics: [
          { code: "tntet.ss.geography.earth", name: "The Earth and Solar System", description: "Solar system, latitudes, longitudes and earth's movements." },
          { code: "tntet.ss.geography.physical", name: "Physical Geography", description: "Landforms, atmosphere, hydrosphere and biosphere." },
          { code: "tntet.ss.geography.india", name: "Geography of India", description: "Physical features, climate, rivers and natural resources." },
          { code: "tntet.ss.geography.tn", name: "Geography of Tamil Nadu", description: "Districts, rivers, climate, agriculture and industries." },
          { code: "tntet.ss.geography.maps", name: "Maps and Map Reading", description: "Types of maps, scales, symbols and map projections." },
        ],
      },
      { code: "tntet.ss.civics", name: "Civics and Political Science",
        description: "Indian Constitution and democratic institutions.",
        subtopics: [
          { code: "tntet.ss.civics.constitution", name: "Indian Constitution", description: "Preamble, fundamental rights, duties and DPSPs." },
          { code: "tntet.ss.civics.government", name: "Union and State Government", description: "President, PM, Parliament, Governor and CM." },
          { code: "tntet.ss.civics.local", name: "Local Self-Government", description: "Panchayati Raj, urban local bodies and 73rd/74th Amendments." },
          { code: "tntet.ss.civics.judiciary", name: "Indian Judiciary", description: "Supreme Court, High Courts and judicial review." },
        ],
      },
      { code: "tntet.ss.economics", name: "Economics",
        description: "Basic economic concepts at upper primary level.",
        subtopics: [
          { code: "tntet.ss.economics.basics", name: "Basic Concepts", description: "Wants, needs, scarcity, production, consumption and exchange." },
          { code: "tntet.ss.economics.indian_economy", name: "Indian Economy", description: "Sectors, planning, banking and economic challenges." },
          { code: "tntet.ss.economics.development", name: "Development", description: "HDI, sustainable development and rural-urban development." },
        ],
      },
      { code: "tntet.ss.pedagogy", name: "Pedagogy of Social Studies",
        description: "Methods of teaching social studies.",
        subtopics: [
          { code: "tntet.ss.pedagogy.concept", name: "Concept and Nature", description: "Nature, scope and integrated character of social studies." },
          { code: "tntet.ss.pedagogy.aims", name: "Aims and Objectives", description: "Aims of teaching social studies at upper primary level." },
          { code: "tntet.ss.pedagogy.methods", name: "Methods of Teaching", description: "Story-telling, dramatisation, project and field-based methods." },
          { code: "tntet.ss.pedagogy.materials", name: "Teaching Materials", description: "Maps, charts, time-lines, models and digital resources." },
          { code: "tntet.ss.pedagogy.evaluation", name: "Evaluation in Social Studies", description: "Formative and summative evaluation strategies." },
          { code: "tntet.ss.pedagogy.problems", name: "Problems of Teaching", description: "Common difficulties and remedial strategies in social studies." },
        ],
      },
    ],
  },
];

export async function seedTnTetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "TN_TET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — TN_TET exam not found.");
  }
  console.log(`Seeding TN TET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < tnTetSyllabus.length; sIdx++) {
    const s = tnTetSyllabus[sIdx];
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
  seedTnTetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
