// REET (Rajasthan Eligibility Examination for Teachers) — full syllabus tree.
// Conducted by Board of Secondary Education Rajasthan (BSER), Ajmer.
// Two levels, each 150 MCQs × 1 mark = 150 marks in 150 minutes. No negative marking.
// Source: official REET notification & syllabus (rajeduboard.rajasthan.gov.in / reet2024.co.in),
// cross-checked with NCTE TET framework. Covers Level 1 (Class 1–5) and Level 2 (Class 6–8).
// Languages on offer for Lang I/II: Hindi, English, Sanskrit, Urdu, Sindhi, Punjabi, Gujarati.
// Rajasthan-specific content (geography, history, culture) is included as per BSER syllabus.
//
// Run after seedExams: npx tsx seed/exams/reet-syllabus.ts

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

export const reetSyllabus: SubjectSeed[] = [
  // ── CHILD DEVELOPMENT & PEDAGOGY ──────────────────────────────────────
  {
    code: "CDP",
    name: "Child Development and Pedagogy",
    weight: 1,
    topics: [
      { code: "cdp.development", name: "Growth and Development",
        description: "Concept and principles of child growth and development.",
        subtopics: [
          { code: "cdp.development.concept", name: "Concept of Growth and Development", description: "Definition, distinction between growth and development, and their relationship with learning." },
          { code: "cdp.development.principles", name: "Principles of Development", description: "Continuity, sequence, individual differences and integration in development." },
          { code: "cdp.development.heredity_environment", name: "Heredity and Environment", description: "Influence of heredity and environment on the development of the child." },
          { code: "cdp.development.dimensions", name: "Dimensions of Development", description: "Physical, cognitive, emotional, social, language and moral development." },
          { code: "cdp.development.adolescence", name: "Adolescence — Meaning and Characteristics (Level 2)", description: "Physical and emotional changes during adolescence and the teacher's role." },
        ],
      },
      { code: "cdp.learning_theories", name: "Theories of Learning",
        description: "Major theories of learning and their educational implications.",
        subtopics: [
          { code: "cdp.learning_theories.behaviourism", name: "Behaviourism", description: "Pavlov's classical conditioning, Skinner's operant conditioning and Thorndike's connectionism." },
          { code: "cdp.learning_theories.gestalt", name: "Gestalt and Insight Learning", description: "Perception, problem-solving and insight learning." },
          { code: "cdp.learning_theories.cognitivism", name: "Cognitivism — Piaget and Bruner", description: "Cognitive development stages and modes of representation." },
          { code: "cdp.learning_theories.constructivism", name: "Constructivism — Vygotsky", description: "Social construction of knowledge, ZPD and scaffolding." },
        ],
      },
      { code: "cdp.intelligence", name: "Intelligence and Creativity",
        description: "Concept and theories of intelligence and creativity.",
        subtopics: [
          { code: "cdp.intelligence.concept", name: "Concept and Theories of Intelligence", description: "Spearman, Thorndike, Thurstone, Gardner — multi-dimensional intelligence." },
          { code: "cdp.intelligence.measurement", name: "Measurement of Intelligence", description: "IQ, intelligence tests and their educational implications." },
          { code: "cdp.intelligence.creativity", name: "Creativity", description: "Concept of creativity, identifying and fostering creative learners." },
        ],
      },
      { code: "cdp.motivation", name: "Motivation and Implications for Learning",
        description: "Concept and theories of motivation and their implications.",
        subtopics: [
          { code: "cdp.motivation.concept", name: "Concept of Motivation", description: "Intrinsic and extrinsic motivation in classroom learning." },
          { code: "cdp.motivation.maslow", name: "Maslow's Hierarchy of Needs", description: "Need-based motivation and educational application." },
          { code: "cdp.motivation.achievement", name: "Achievement Motivation", description: "McClelland's theory and methods to enhance achievement motivation." },
        ],
      },
      { code: "cdp.individual_differences", name: "Individual Differences and Personality",
        description: "Diversity among learners and personality dimensions.",
        subtopics: [
          { code: "cdp.individual_differences.diversity", name: "Diversity Among Learners", description: "Differences based on language, caste, gender, region, religion and ability." },
          { code: "cdp.individual_differences.personality", name: "Personality and its Assessment", description: "Concept and theories of personality (Allport, Cattell), and assessment methods." },
          { code: "cdp.individual_differences.adjustment", name: "Adjustment and Maladjustment", description: "Adjustment mechanisms, defense mechanisms and the teacher's role." },
        ],
      },
      { code: "cdp.diverse_learners", name: "Diverse Learners and Inclusive Education",
        description: "Addressing the needs of diverse and special learners.",
        subtopics: [
          { code: "cdp.diverse_learners.gifted", name: "Gifted and Talented Learners", description: "Identification and educational provisions for gifted children." },
          { code: "cdp.diverse_learners.backward", name: "Backward and Slow Learners", description: "Causes of backwardness, identification and remediation." },
          { code: "cdp.diverse_learners.cwsn", name: "Children with Special Needs", description: "Visual, hearing, locomotor, intellectual and learning disabilities." },
          { code: "cdp.diverse_learners.learning_disabilities", name: "Learning Disabilities", description: "Dyslexia, dysgraphia, dyscalculia and ADHD." },
          { code: "cdp.diverse_learners.inclusive", name: "Inclusive Education and RTE", description: "Inclusion, RTE Act 2009 and the role of the teacher." },
        ],
      },
      { code: "cdp.assessment", name: "Assessment and Evaluation",
        description: "Concept of assessment, types and tools used in classrooms.",
        subtopics: [
          { code: "cdp.assessment.types", name: "Assessment for and of Learning", description: "Formative, summative and diagnostic assessment." },
          { code: "cdp.assessment.cce", name: "Continuous Comprehensive Evaluation", description: "CCE — concept, scholastic and co-scholastic areas." },
          { code: "cdp.assessment.action_research", name: "Action Research in Education", description: "Concept, steps and use of action research by teachers." },
        ],
      },
      { code: "cdp.pedagogy", name: "Teaching Learning and Pedagogy",
        description: "Pedagogical concepts in elementary classrooms.",
        subtopics: [
          { code: "cdp.pedagogy.methods", name: "Teaching Methods", description: "Activity-based, project, inquiry, discussion and play-way methods." },
          { code: "cdp.pedagogy.classroom_management", name: "Classroom Management", description: "Discipline, leadership and classroom climate." },
          { code: "cdp.pedagogy.guidance", name: "Guidance and Counselling", description: "Educational, vocational and personal guidance." },
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
      { code: "lang1.comprehension", name: "Apathit Gadyansh / Padyansh", description: "Two unseen passages (one prose and one poem) with comprehension, grammar and vocabulary questions." },
      { code: "lang1.varna_vichar", name: "Varna Vichar", description: "Vowels, consonants, syllables and pronunciation in Hindi." },
      { code: "lang1.shabd_vichar", name: "Shabd Vichar", description: "Word formation, tatsam-tadbhav, deshaj-videshaj words." },
      { code: "lang1.sandhi", name: "Sandhi", description: "Swar sandhi, vyanjan sandhi and visarg sandhi rules." },
      { code: "lang1.samas", name: "Samas", description: "Tatpurush, dvandva, dvigu, karmadharaya, bahuvrihi, avyayibhav." },
      { code: "lang1.upsarg_pratyay", name: "Upsarg and Pratyay", description: "Prefixes and suffixes in Hindi." },
      { code: "lang1.sangya_sarvanam", name: "Sangya, Sarvanam, Visheshan, Kriya", description: "Noun, pronoun, adjective and verb in Hindi." },
      { code: "lang1.ling_vachan_kaal", name: "Ling, Vachan, Kaal, Karak", description: "Gender, number, tense and case in Hindi sentences." },
      { code: "lang1.vakya_rachna", name: "Vakya Rachna and Viram Chinh", description: "Sentence structure, types of sentences and punctuation." },
      { code: "lang1.muhavare", name: "Muhavare aur Lokoktiyan", description: "Idioms and proverbs of Hindi." },
      { code: "lang1.paryayvachi_vilom", name: "Paryayvachi, Vilom and Anekarthi Shabd", description: "Synonyms, antonyms and words with multiple meanings." },
      { code: "lang1.alankar_ras", name: "Alankar and Ras", description: "Figures of speech and rasas in Hindi literature." },
      { code: "lang1.pedagogy", name: "Pedagogy of Hindi Language",
        description: "Pedagogical aspects of teaching Hindi at primary and upper-primary level.",
        subtopics: [
          { code: "lang1.pedagogy.principles", name: "Principles of Hindi Teaching", description: "Aims and principles of teaching Hindi as a first language." },
          { code: "lang1.pedagogy.skills", name: "Listening, Speaking, Reading, Writing", description: "Development of LSRW skills in Hindi." },
          { code: "lang1.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbooks, multimedia and ICT in Hindi instruction." },
          { code: "lang1.pedagogy.evaluation", name: "Evaluation in Hindi", description: "Assessment of comprehension, expression and accuracy." },
          { code: "lang1.pedagogy.remedial", name: "Remedial Teaching in Hindi", description: "Diagnostic and remedial approach for Hindi learners." },
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
      { code: "lang2.comprehension", name: "Unseen Passages",
        description: "Two unseen passages — one prose and one poem — with comprehension, grammar and vocabulary questions.",
        subtopics: [
          { code: "lang2.comprehension.prose", name: "Unseen Prose Passage", description: "Comprehension, inference and verbal-ability questions from prose." },
          { code: "lang2.comprehension.poem", name: "Unseen Poem", description: "Literary devices, comprehension and inference from a poem." },
        ],
      },
      { code: "lang2.parts_of_speech", name: "Parts of Speech", description: "Noun, pronoun, verb, adjective, adverb, preposition, conjunction, interjection." },
      { code: "lang2.tenses", name: "Tenses", description: "Present, past and future — simple, continuous, perfect, perfect-continuous." },
      { code: "lang2.articles_determiners", name: "Articles and Determiners", description: "A/an/the and quantifiers/determiners." },
      { code: "lang2.voice", name: "Active and Passive Voice", description: "Conversion between active and passive constructions." },
      { code: "lang2.narration", name: "Direct and Indirect Speech", description: "Reporting verbs and changes in tense, pronouns and time." },
      { code: "lang2.subject_verb", name: "Subject-Verb Agreement", description: "Concord rules for singular/plural subjects." },
      { code: "lang2.modals", name: "Modals", description: "Can, could, may, might, shall, should, will, would, must, ought to." },
      { code: "lang2.vocabulary", name: "Vocabulary", description: "Synonyms, antonyms, one-word substitution and word-formation." },
      { code: "lang2.phonetics", name: "English Sounds and Phonetic Symbols", description: "Vowel and consonant sounds, stress and intonation basics." },
      { code: "lang2.questions", name: "Question Forms", description: "Yes/No questions, WH-questions and tag questions." },
      { code: "lang2.pedagogy", name: "Pedagogy of English Language",
        description: "Pedagogy for teaching English at primary and upper-primary levels.",
        subtopics: [
          { code: "lang2.pedagogy.acquisition", name: "Language Acquisition and Learning", description: "Krashen's theories and second-language acquisition." },
          { code: "lang2.pedagogy.principles", name: "Principles of Language Teaching", description: "Communicative, structural and direct methods." },
          { code: "lang2.pedagogy.skills", name: "LSRW Skills", description: "Listening, speaking, reading and writing in English classrooms." },
          { code: "lang2.pedagogy.diverse", name: "Diverse Classroom and Errors", description: "Multilingual learners, language difficulties and disorders." },
          { code: "lang2.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbooks, audio-visual aids and ICT for English." },
          { code: "lang2.pedagogy.evaluation", name: "Evaluation of Proficiency", description: "Assessment of speaking, listening, reading and writing." },
          { code: "lang2.pedagogy.remedial", name: "Remedial Teaching", description: "Diagnostic and remedial work for English learners." },
        ],
      },
    ],
  },

  // ── MATHEMATICS (Level 1) ─────────────────────────────────────────────
  {
    code: "MATH",
    name: "Mathematics",
    weight: 1,
    topics: [
      { code: "math.numbers", name: "Whole Numbers up to One Crore", description: "Place value, comparison, rounding off and Indian numeral system." },
      { code: "math.operations", name: "Four Basic Operations", description: "Addition, subtraction, multiplication and division of whole numbers." },
      { code: "math.indian_currency", name: "Indian Currency", description: "Notes, coins, conversion and money problems in daily life." },
      { code: "math.factors_multiples", name: "Factors, Multiples, HCF and LCM", description: "Prime/composite numbers, divisibility, HCF and LCM." },
      { code: "math.fractions", name: "Fractions", description: "Comparison and operations on like, unlike, proper, improper and mixed fractions." },
      { code: "math.decimals", name: "Decimals", description: "Decimal place value, conversion and operations on decimals." },
      { code: "math.unitary_method", name: "Unitary Method, Average, Profit-Loss, Simple Interest", description: "Application-based arithmetic problems." },
      { code: "math.plane_figures", name: "Plane Figures — Area and Perimeter", description: "Square, rectangle, triangle and circle — area and perimeter." },
      { code: "math.measurement", name: "Measurement", description: "Length, weight, capacity, time and temperature in standard units." },
      { code: "math.geometry_basics", name: "Geometry Basics", description: "Points, lines, angles, basic shapes and their properties." },
      { code: "math.data_handling", name: "Data Handling", description: "Tally marks, pictographs, bar graphs and simple data interpretation." },
      { code: "math.pedagogy", name: "Pedagogical Issues in Mathematics",
        description: "Teaching, evaluation and remediation in primary mathematics.",
        subtopics: [
          { code: "math.pedagogy.nature", name: "Nature of Mathematics and Logical Thinking", description: "Mathematics as the study of patterns and logical reasoning." },
          { code: "math.pedagogy.curriculum", name: "Place of Mathematics in Curriculum", description: "Aims of teaching mathematics and curricular focus." },
          { code: "math.pedagogy.language", name: "Language of Mathematics", description: "Mathematical vocabulary, symbols and communication." },
          { code: "math.pedagogy.community", name: "Community Mathematics", description: "Linking school mathematics with the child's environment." },
          { code: "math.pedagogy.evaluation", name: "Evaluation in Mathematics", description: "Formal, informal and diagnostic evaluation." },
          { code: "math.pedagogy.errors", name: "Error Analysis and Remedial Teaching", description: "Identifying error patterns and providing remediation." },
        ],
      },
    ],
  },

  // ── ENVIRONMENTAL STUDIES (Level 1) ──────────────────────────────────
  {
    code: "EVS",
    name: "Environmental Studies",
    weight: 1,
    topics: [
      { code: "evs.family", name: "Family and Society", description: "Family structures, social relationships and community life." },
      { code: "evs.clothing_shelter", name: "Clothing and Shelter", description: "Different types of clothing and houses across regions." },
      { code: "evs.profession", name: "Profession and Occupations", description: "Local, regional and traditional occupations of people in Rajasthan and India." },
      { code: "evs.public_places", name: "Public Places and Institutions", description: "Schools, markets, hospitals, post-offices and other public services." },
      { code: "evs.our_culture", name: "Our Culture and Civilisation", description: "Cultural diversity, festivals, traditions and heritage." },
      { code: "evs.transport_communication", name: "Transport and Communication", description: "Modes of transport and communication systems past and present." },
      { code: "evs.personal_hygiene", name: "Personal Hygiene and Diseases", description: "Personal cleanliness, balanced diet and common diseases." },
      { code: "evs.living_world", name: "Living World — Plants and Animals", description: "Plant and animal life around us; classification basics." },
      { code: "evs.matter_energy", name: "Matter and Energy", description: "Air, water, sources of energy and their uses." },
      { code: "evs.solar_system", name: "Solar System and Space", description: "Sun, planets, moon and basic space concepts." },
      { code: "evs.rajasthan", name: "Rajasthan — Land, Culture and Heritage",
        description: "Rajasthan-specific environmental and cultural content as per BSER syllabus.",
        subtopics: [
          { code: "evs.rajasthan.geography", name: "Geography of Rajasthan", description: "Location, physical features, deserts, rivers and climate of Rajasthan." },
          { code: "evs.rajasthan.culture", name: "Culture, Festivals and Folk Heritage", description: "Folk dances, music, fairs and festivals of Rajasthan." },
          { code: "evs.rajasthan.history", name: "Historical Personalities of Rajasthan", description: "Maharana Pratap, Prithviraj Chauhan and other regional personalities." },
        ],
      },
      { code: "evs.india_world", name: "India and the World", description: "States, capitals, neighbouring countries and basic world geography." },
      { code: "evs.environmental_protection", name: "Environmental Protection", description: "Pollution, conservation and sustainable development." },
      { code: "evs.pedagogy", name: "Pedagogical Issues in EVS",
        description: "EVS-specific pedagogy and integration of science and social science.",
        subtopics: [
          { code: "evs.pedagogy.scope", name: "Concept and Scope of EVS", description: "Significance and scope of environmental studies." },
          { code: "evs.pedagogy.integrated", name: "EVS as an Integrated Subject", description: "Integration of science and social science in EVS." },
          { code: "evs.pedagogy.approaches", name: "Approaches to Teaching EVS", description: "Activity, experiment and discovery approaches." },
          { code: "evs.pedagogy.cce", name: "CCE in EVS", description: "Continuous comprehensive evaluation in environmental studies." },
          { code: "evs.pedagogy.tlm", name: "Teaching Aids and Materials", description: "Charts, models, real objects and ICT for EVS." },
        ],
      },
    ],
  },

  // ── MATH & SCIENCE (Level 2) ─────────────────────────────────────────
  {
    code: "MATH_SCI",
    name: "Mathematics and Science (Level 2)",
    weight: 1,
    topics: [
      { code: "math_sci.math.indices", name: "Indices and Algebraic Expressions", description: "Laws of indices, algebraic expressions and their operations." },
      { code: "math_sci.math.equations", name: "Equations and Roots", description: "Linear equations in one/two variables and quadratic equations." },
      { code: "math_sci.math.factors", name: "Factors and Polynomials", description: "Factorisation, polynomials and identities." },
      { code: "math_sci.math.squares_cubes", name: "Squares, Cubes and their Roots", description: "Square root, cube root and their applications." },
      { code: "math_sci.math.percentage", name: "Percentage, Profit-Loss, Discount", description: "Commercial mathematics for upper-primary level." },
      { code: "math_sci.math.interest", name: "Simple and Compound Interest", description: "SI, CI and applications in real-life problems." },
      { code: "math_sci.math.ratio", name: "Ratio and Proportion", description: "Ratio, proportion, partnership and direct/inverse variation." },
      { code: "math_sci.math.lines_angles", name: "Lines and Angles", description: "Lines, angles, parallel lines and intersecting lines." },
      { code: "math_sci.math.plane_figures", name: "Plane Figures, Area and Perimeter", description: "Triangles, quadrilaterals, polygons and their properties." },
      { code: "math_sci.math.surface_volume", name: "Surface Area and Volume", description: "Cube, cuboid, cylinder, cone, sphere — surface area and volume." },
      { code: "math_sci.math.statistics", name: "Statistics", description: "Data representation, mean, median, mode and graphs." },
      { code: "math_sci.math.probability", name: "Probability", description: "Introduction to probability and its applications." },
      { code: "math_sci.math.graphs", name: "Graphs", description: "Reading and drawing bar graphs, pie charts and line graphs." },
      { code: "math_sci.math.pedagogy", name: "Pedagogy of Mathematics",
        description: "Mathematics-specific pedagogy at upper-primary level.",
        subtopics: [
          { code: "math_sci.math.pedagogy.nature", name: "Nature and Logical Thinking", description: "Mathematics as patterns and the nature of logical reasoning." },
          { code: "math_sci.math.pedagogy.curriculum", name: "Place of Mathematics in Curriculum", description: "Aims and importance of mathematics in school curriculum." },
          { code: "math_sci.math.pedagogy.evaluation", name: "Evaluation in Mathematics", description: "Diagnostic, formative and summative evaluation." },
          { code: "math_sci.math.pedagogy.remedial", name: "Remedial Teaching", description: "Identifying errors and providing remedial mathematics." },
        ],
      },
      { code: "math_sci.science.living", name: "Living and Non-Living Organisms", description: "Characteristics of living things and classification." },
      { code: "math_sci.science.human_body", name: "Human Body and Health", description: "Organ systems, nutrition, immunisation and adolescence." },
      { code: "math_sci.science.reproduction", name: "Animal Reproduction and Adolescence", description: "Sexual and asexual reproduction, adolescent changes." },
      { code: "math_sci.science.mechanics", name: "Mechanics — Force and Motion", description: "Force, motion, friction and Newton's laws (basic)." },
      { code: "math_sci.science.heat_light", name: "Heat, Light and Sound", description: "Heat transfer, reflection/refraction of light and sound waves." },
      { code: "math_sci.science.electricity", name: "Electricity and Magnetism", description: "Current, circuits, magnets and electromagnetic effects." },
      { code: "math_sci.science.solar_system", name: "Solar System and Universe", description: "Solar system, stars, galaxies and earth's place in the universe." },
      { code: "math_sci.science.matter", name: "Structure of Matter", description: "Atoms, molecules, elements, compounds and mixtures." },
      { code: "math_sci.science.chemicals", name: "Chemical Substances", description: "Acids, bases, salts and chemicals in daily life." },
      { code: "math_sci.science.agriculture", name: "Agriculture and Resources", description: "Crops, agricultural resources and food production." },
      { code: "math_sci.science.environment", name: "Environment and Ecosystem", description: "Ecosystem, food chains, biodiversity and pollution." },
      { code: "math_sci.science.pedagogy", name: "Pedagogy of Science",
        description: "Science-specific pedagogy at upper-primary level.",
        subtopics: [
          { code: "math_sci.science.pedagogy.nature", name: "Nature and Structure of Science", description: "Science as a way of knowing and understanding nature." },
          { code: "math_sci.science.pedagogy.aims", name: "Aims of Teaching Science", description: "Cognitive, affective and psychomotor objectives." },
          { code: "math_sci.science.pedagogy.methods", name: "Methods of Teaching Science", description: "Inquiry, project, demonstration and experimental methods." },
          { code: "math_sci.science.pedagogy.lab", name: "Laboratory Work and Innovations", description: "Lab safety, equipment and innovations in science teaching." },
          { code: "math_sci.science.pedagogy.evaluation", name: "Evaluation in Science", description: "Achievement test, diagnostic test and remedial work." },
        ],
      },
    ],
  },

  // ── SOCIAL SCIENCE (Level 2) ─────────────────────────────────────────
  {
    code: "SOCIAL_SCIENCE",
    name: "Social Science (Level 2)",
    weight: 1,
    topics: [
      { code: "ss.history.ancient", name: "Ancient Indian Civilisation", description: "Indus Valley, Vedic age and major ancient kingdoms." },
      { code: "ss.history.mauryan", name: "Mauryan and Gupta Periods", description: "Chandragupta Maurya, Ashoka, Gupta dynasty and their cultural achievements." },
      { code: "ss.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals, bhakti and sufi movements." },
      { code: "ss.history.modern", name: "Modern India", description: "British conquest, colonial rule and freedom struggle." },
      { code: "ss.history.rajasthan", name: "History of Rajasthan", description: "Rajput dynasties, freedom struggle and unification of Rajasthan." },
      { code: "ss.geography.earth", name: "Earth as a Planet", description: "Solar system, latitudes, longitudes, motions and time zones." },
      { code: "ss.geography.physical_features", name: "Physical Features of India", description: "Mountains, plains, plateaus, rivers and climate of India." },
      { code: "ss.geography.resources", name: "Natural Resources", description: "Soil, water, forest, mineral and energy resources." },
      { code: "ss.geography.rajasthan", name: "Rajasthan — Geography and Resources", description: "Physical features, climate, agriculture, minerals and tourism of Rajasthan." },
      { code: "ss.geography.world", name: "World Geography", description: "Continents, oceans and important countries of the world." },
      { code: "ss.civics.constitution", name: "Indian Constitution", description: "Preamble, fundamental rights, duties and Directive Principles." },
      { code: "ss.civics.democracy", name: "Indian Democracy and Government", description: "Parliament, executive, judiciary and elections." },
      { code: "ss.civics.local", name: "Local Self-Government", description: "Panchayati raj and municipal institutions in Rajasthan." },
      { code: "ss.civics.un", name: "United Nations", description: "UN, its principal organs and major specialised agencies." },
      { code: "ss.economics", name: "Indian Economy", description: "Sectors of the economy, agriculture, industry and services." },
      { code: "ss.environment", name: "Environment and Sustainable Development", description: "Pollution, climate change, conservation and environmental movements." },
      { code: "ss.art_culture", name: "Art and Culture of Rajasthan", description: "Folk dances, music, painting, handicrafts and architecture." },
      { code: "ss.pedagogy", name: "Pedagogical Issues in Social Science",
        description: "Pedagogy specific to Social Science at upper-primary level.",
        subtopics: [
          { code: "ss.pedagogy.nature", name: "Concept and Nature of Social Science", description: "Scope, aims and objectives of social science." },
          { code: "ss.pedagogy.classroom", name: "Classroom Processes and Discourse", description: "Discussion, debate and inquiry in social science class." },
          { code: "ss.pedagogy.thinking", name: "Developing Critical Thinking", description: "Cultivating reasoning and analytical thinking." },
          { code: "ss.pedagogy.sources", name: "Primary and Secondary Sources", description: "Use of historical sources, data and maps." },
          { code: "ss.pedagogy.projects", name: "Project Work and Field Visits", description: "Project method and field-based learning." },
          { code: "ss.pedagogy.evaluation", name: "Evaluation in Social Science", description: "Tools and techniques for assessing learning." },
        ],
      },
    ],
  },
];

export async function seedReetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "RJ_REET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — RJ_REET exam not found.");
  }
  console.log(`Seeding REET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < reetSyllabus.length; sIdx++) {
    const s = reetSyllabus[sIdx];
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
  seedReetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
