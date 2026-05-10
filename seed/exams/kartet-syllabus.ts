// KAR TET (Karnataka Teacher Eligibility Test) — full syllabus tree.
// Conducted by Department of School Education, Government of Karnataka (KSEAB).
// Two papers, each 150 MCQs × 1 mark = 150 marks in 150 minutes. No negative marking.
// Source: official KARTET notification & syllabus (schooleducation.kar.nic.in /
// schooleducation.karnataka.gov.in), cross-checked with NCTE TET framework.
// Covers Paper I (Class 1–5) and Paper II (Class 6–8).
// Languages on offer for Lang I/II: Kannada, English, Urdu, Tamil, Telugu, Marathi, Hindi.
//
// Run after seedExams: npx tsx seed/exams/kartet-syllabus.ts

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

export const kartetSyllabus: SubjectSeed[] = [
  // ── CHILD DEVELOPMENT & PEDAGOGY ──────────────────────────────────────
  {
    code: "CDP",
    name: "Child Development and Pedagogy",
    weight: 1,
    topics: [
      { code: "cdp.development_learning", name: "Child Development and Learning",
        description: "Concept of development and its relationship with learning.",
        subtopics: [
          { code: "cdp.development_learning.concept", name: "Concept of Development & Relationship with Learning", description: "Definition, principles and how development affects learning." },
          { code: "cdp.development_learning.principles", name: "Principles of Development of Children", description: "Continuous, sequential, individual-difference and integration principles." },
          { code: "cdp.development_learning.heredity_environment", name: "Influence of Heredity and Environment", description: "Nature vs nurture; family, school and community influence." },
          { code: "cdp.development_learning.socialization", name: "Socialization Processes", description: "Role of teachers, parents and peers in socialisation." },
          { code: "cdp.development_learning.piaget", name: "Piaget — Cognitive Development", description: "Stages of cognitive development and educational implications." },
          { code: "cdp.development_learning.kohlberg", name: "Kohlberg — Moral Development", description: "Stages of moral development." },
          { code: "cdp.development_learning.vygotsky", name: "Vygotsky — Socio-cultural Theory", description: "ZPD, scaffolding and social mediation." },
          { code: "cdp.development_learning.child_centred", name: "Child-Centred and Progressive Education", description: "NCF-aligned child-centred and progressive pedagogy." },
        ],
      },
      { code: "cdp.individual_differences", name: "Individual Differences and Intelligence",
        description: "Differences among learners and theories of intelligence.",
        subtopics: [
          { code: "cdp.individual_differences.intelligence", name: "Critical Perspective on Intelligence", description: "Single vs multiple intelligence and IQ critique." },
          { code: "cdp.individual_differences.multidim", name: "Multi-Dimensional Intelligence", description: "Gardner's theory of multiple intelligences." },
          { code: "cdp.individual_differences.language_thought", name: "Language and Thought", description: "Relationship between language and cognitive growth." },
          { code: "cdp.individual_differences.gender", name: "Gender as a Social Construct", description: "Gender roles, gender bias and educational practice." },
          { code: "cdp.individual_differences.diversity", name: "Individual Differences among Learners", description: "Diversity based on language, caste, gender, religion and ability." },
        ],
      },
      { code: "cdp.assessment", name: "Assessment for Learning",
        description: "Concept and types of school-based assessment.",
        subtopics: [
          { code: "cdp.assessment.types", name: "Assessment for vs Assessment of Learning", description: "Formative and summative assessment in schools." },
          { code: "cdp.assessment.cce", name: "School-Based Assessment and CCE", description: "Continuous and comprehensive evaluation in schools." },
          { code: "cdp.assessment.questioning", name: "Formulating Appropriate Questions", description: "Questions to assess readiness, enhance learning and develop critical thinking." },
        ],
      },
      { code: "cdp.inclusive", name: "Inclusive Education and CWSN",
        description: "Addressing diverse learners and children with special needs.",
        subtopics: [
          { code: "cdp.inclusive.disadvantaged", name: "Learners from Disadvantaged Backgrounds", description: "SC/ST/OBC, minority, migrant and economically deprived learners." },
          { code: "cdp.inclusive.learning_difficulties", name: "Learners with Learning Difficulties", description: "Dyslexia, dysgraphia, dyscalculia and ADHD." },
          { code: "cdp.inclusive.talented", name: "Talented and Specially-abled Learners", description: "Strategies for gifted and creative learners." },
          { code: "cdp.inclusive.rte", name: "Right to Education Act 2009", description: "Provisions of the RTE Act and inclusive classrooms." },
        ],
      },
      { code: "cdp.learning_pedagogy", name: "Learning and Pedagogy",
        description: "Theories of learning and their pedagogical implications.",
        subtopics: [
          { code: "cdp.learning_pedagogy.how", name: "How Children Think and Learn", description: "Why and how children fail to achieve at school." },
          { code: "cdp.learning_pedagogy.processes", name: "Basic Processes of Teaching and Learning", description: "Children's strategies of learning; learning as a social activity." },
          { code: "cdp.learning_pedagogy.problem_solver", name: "Child as Problem Solver and Investigator", description: "Child as constructor of knowledge and scientific investigator." },
          { code: "cdp.learning_pedagogy.alternative", name: "Alternative Conceptions of Learning", description: "Errors as significant steps in learning." },
          { code: "cdp.learning_pedagogy.cognition_emotion", name: "Cognition and Emotion", description: "Role of emotion in cognition and learning." },
          { code: "cdp.learning_pedagogy.motivation", name: "Motivation and Learning", description: "Intrinsic, extrinsic motivation and theories." },
          { code: "cdp.learning_pedagogy.factors", name: "Factors Contributing to Learning", description: "Personal and environmental factors influencing learning." },
        ],
      },
    ],
  },

  // ── LANGUAGE I (Kannada) ──────────────────────────────────────────────
  {
    code: "LANG1",
    name: "Language I — Kannada",
    weight: 1,
    topics: [
      { code: "lang1.comprehension", name: "Reading Unseen Passages",
        description: "Unseen passages — prose, drama or poetry — with comprehension questions.",
        subtopics: [
          { code: "lang1.comprehension.prose", name: "Unseen Prose / Drama Passage", description: "Comprehension and inference from a Kannada prose or drama excerpt." },
          { code: "lang1.comprehension.poem", name: "Unseen Poem", description: "Literary devices and inference from a Kannada poem." },
        ],
      },
      { code: "lang1.varnamale", name: "Varnamale", description: "Kannada vowels (svaragalu), consonants (vyanjanagalu) and pronunciation." },
      { code: "lang1.shabd", name: "Shabd Roopagalu", description: "Word formation, tatsama-tadbhava, deshya and anya-bhasha words." },
      { code: "lang1.sandhi", name: "Sandhi", description: "Lopa sandhi, agama sandhi, adesha sandhi and other sandhi rules." },
      { code: "lang1.samasa", name: "Samasa", description: "Tatpurusha, dvandva, dvigu, karmadharaya, bahuvrihi and amshi samasa." },
      { code: "lang1.alankara", name: "Alankara", description: "Shabda alankara and artha alankara (figures of speech)." },
      { code: "lang1.chandassu", name: "Chandassu", description: "Kannada prosody and metres." },
      { code: "lang1.parts_of_speech", name: "Padagalu / Parts of Speech", description: "Naama, sarvanama, kriya, vishesha, avyaya in Kannada." },
      { code: "lang1.gender_number_tense", name: "Linga, Vachana, Kala", description: "Gender, number, tense and case in Kannada." },
      { code: "lang1.sentence", name: "Vakya Rachane and Punctuation", description: "Sentence structure, types and punctuation in Kannada." },
      { code: "lang1.idioms", name: "Gaadegalu and Naudigalu", description: "Kannada proverbs, idioms and phrases." },
      { code: "lang1.synonyms_antonyms", name: "Samanarthaka and Virudharthaka Padagalu", description: "Synonyms and antonyms in Kannada." },
      { code: "lang1.pedagogy", name: "Pedagogy of Kannada Language",
        description: "Pedagogy specific to teaching Kannada at primary and upper-primary level.",
        subtopics: [
          { code: "lang1.pedagogy.acquisition", name: "Language Development and Acquisition", description: "First-language acquisition theories and Kannada teaching." },
          { code: "lang1.pedagogy.lsr", name: "Listening, Speaking and Grammar in Communication", description: "Role of listening, speaking and grammar in communicative competence." },
          { code: "lang1.pedagogy.diverse", name: "Challenges in Diverse Classrooms", description: "Multilingual learners and language disorders." },
          { code: "lang1.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbooks, multimedia and ICT for Kannada." },
          { code: "lang1.pedagogy.remedial", name: "Remedial Teaching", description: "Diagnostic and remedial work in Kannada." },
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
        description: "Two unseen passages — prose, drama or poetry — with comprehension and grammar questions.",
        subtopics: [
          { code: "lang2.comprehension.prose", name: "Unseen Prose Passage", description: "Discursive, literary, narrative or scientific prose with questions." },
          { code: "lang2.comprehension.poem", name: "Unseen Poem", description: "Literary devices, comprehension and inference from a poem." },
        ],
      },
      { code: "lang2.parts_of_speech", name: "Parts of Speech", description: "Noun, pronoun, verb, adjective, adverb, preposition, conjunction, interjection." },
      { code: "lang2.tenses", name: "Tenses", description: "Present, past, future — simple, continuous, perfect and perfect-continuous." },
      { code: "lang2.articles_determiners", name: "Articles and Determiners", description: "A/an/the and quantifiers/determiners." },
      { code: "lang2.voice", name: "Active and Passive Voice", description: "Conversion between active and passive voice." },
      { code: "lang2.narration", name: "Direct and Indirect Speech", description: "Reporting verbs and changes in tense, pronouns and time." },
      { code: "lang2.subject_verb", name: "Subject-Verb Agreement", description: "Concord rules for singular and plural subjects." },
      { code: "lang2.modals", name: "Modals", description: "Can, could, may, might, shall, should, will, would, must, ought to." },
      { code: "lang2.prepositions", name: "Prepositions", description: "Prepositions of time, place, movement and direction." },
      { code: "lang2.vocabulary", name: "Vocabulary", description: "Synonyms, antonyms, one-word substitutions and word-formation." },
      { code: "lang2.phonetics", name: "English Phonetics", description: "Vowel and consonant sounds, stress and intonation basics." },
      { code: "lang2.pedagogy", name: "Pedagogy of English Language",
        description: "Pedagogy of teaching English as a second/third language.",
        subtopics: [
          { code: "lang2.pedagogy.development", name: "Pedagogical Approaches to Language Development", description: "Communicative, structural and direct methods." },
          { code: "lang2.pedagogy.grammar", name: "Grammar in Communicative Contexts", description: "Grammar as a tool for communicative competence." },
          { code: "lang2.pedagogy.multilingual", name: "Multilingual Classroom Challenges", description: "Teaching English in multilingual Karnataka classrooms." },
          { code: "lang2.pedagogy.skills", name: "LSRW Skills Development", description: "Listening, speaking, reading and writing in English." },
          { code: "lang2.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbooks, audio-visual aids and ICT for English." },
          { code: "lang2.pedagogy.remedial", name: "Remedial Teaching", description: "Diagnostic and remedial English instruction." },
        ],
      },
    ],
  },

  // ── MATHEMATICS (Paper I) ─────────────────────────────────────────────
  {
    code: "MATH",
    name: "Mathematics",
    weight: 1,
    topics: [
      { code: "math.numbers", name: "Numbers", description: "Whole numbers, place value and Indian numeral system." },
      { code: "math.fractions", name: "Fractions", description: "Proper, improper, mixed fractions and decimal fractions." },
      { code: "math.algebraic_expressions", name: "Algebraic Expressions (Basic)", description: "Introduction to algebraic expressions and simple equations." },
      { code: "math.geometric_figures", name: "Geometrical Figures and Spatial Knowledge", description: "Plane geometric figures and spatial relationships." },
      { code: "math.solid_shapes", name: "3-D Geometric Shapes", description: "Cubes, cuboids, cylinders, spheres and cones." },
      { code: "math.measurement", name: "Measurements", description: "Weight, time, volume, length and capacity in standard units." },
      { code: "math.data_handling", name: "Data Handling and Central Tendency", description: "Pictograph, bar graph, mean and basic data interpretation." },
      { code: "math.ratio_proportion", name: "Ratio, Proportion and Daily-Life Applications", description: "Ratio, proportion, unitary method and applications." },
      { code: "math.lines_angles", name: "Lines, Angles and Polygons", description: "Lines, angles, triangles, quadrilaterals and polygons." },
      { code: "math.basic_algebra", name: "Basic Algebra", description: "Introduction to algebra, variables and simple equations." },
      { code: "math.pedagogy", name: "Pedagogical Issues in Mathematics",
        description: "Pedagogy specific to primary mathematics.",
        subtopics: [
          { code: "math.pedagogy.nature", name: "Nature of Mathematics and Logical Thinking", description: "Mathematics as a science of patterns and reasoning." },
          { code: "math.pedagogy.curriculum", name: "Place of Mathematics in Curriculum", description: "Aims of teaching mathematics and curricular focus." },
          { code: "math.pedagogy.language", name: "Language of Mathematics", description: "Mathematical vocabulary, symbols and communication." },
          { code: "math.pedagogy.community", name: "Community Mathematics", description: "Linking school mathematics with the child's environment." },
          { code: "math.pedagogy.evaluation", name: "Evaluation through Formal and Informal Methods", description: "Diagnostic, formative and summative evaluation." },
          { code: "math.pedagogy.problems", name: "Problems of Teaching", description: "Common difficulties and misconceptions in primary mathematics." },
          { code: "math.pedagogy.error_analysis", name: "Error Analysis and Remedial Teaching", description: "Identifying and remediating errors." },
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
      { code: "evs.environment_components", name: "Environment Components and Ecosystems", description: "Biotic and abiotic components and their interactions." },
      { code: "evs.biodiversity", name: "Biodiversity, Food Chains and Pyramids", description: "Biodiversity, food chains, food webs and ecological pyramids." },
      { code: "evs.pollution", name: "Pollution and Sustainable Development", description: "Air, water, soil and noise pollution; sustainable development." },
      { code: "evs.living_organisms", name: "Living Organisms and Life Processes", description: "Characteristics of living things, plant and animal life processes." },
      { code: "evs.energy_sources", name: "Energy Sources", description: "Solar, wind, geothermal and other renewable/non-renewable sources." },
      { code: "evs.health_nutrition", name: "Health and Nutrition", description: "Balanced diet, deficiency diseases and personal hygiene." },
      { code: "evs.natural_phenomena", name: "Natural Phenomena", description: "Day-night, seasons, weather and natural events." },
      { code: "evs.electricity_basics", name: "Electricity and Basic Physics", description: "Simple electric circuits and basic physical concepts." },
      { code: "evs.shelter_food_water", name: "Shelter, Food and Water", description: "Basic needs and their sources." },
      { code: "evs.family_friends", name: "Family and Friends", description: "Family structures, relationships, animals, plants and friends." },
      { code: "evs.travel_transport", name: "Travel and Transport", description: "Modes of transport and communication." },
      { code: "evs.things_we_make", name: "Things We Make and Do", description: "Local crafts, occupations and products of Karnataka." },
      { code: "evs.karnataka", name: "Karnataka — Land, Culture and Heritage",
        description: "Karnataka-specific environmental and cultural content.",
        subtopics: [
          { code: "evs.karnataka.geography", name: "Geography of Karnataka", description: "Physical features, climate, rivers and natural resources of Karnataka." },
          { code: "evs.karnataka.culture", name: "Culture and Heritage of Karnataka", description: "Folk traditions, festivals and historical heritage of Karnataka." },
        ],
      },
      { code: "evs.pedagogy", name: "Pedagogical Issues in EVS",
        description: "Pedagogy specific to environmental studies at primary level.",
        subtopics: [
          { code: "evs.pedagogy.scope", name: "Concept and Scope of EVS", description: "Definition, scope and significance of EVS." },
          { code: "evs.pedagogy.integrated", name: "EVS as an Integrated Subject", description: "Integration of science and social science." },
          { code: "evs.pedagogy.approaches", name: "Approaches to Presenting Concepts", description: "Activity, experiential and discovery learning." },
          { code: "evs.pedagogy.activities", name: "Activities and Experimentation", description: "Field trips, projects and experiments." },
          { code: "evs.pedagogy.cce", name: "CCE in EVS", description: "Continuous comprehensive evaluation in EVS." },
          { code: "evs.pedagogy.tlm", name: "Teaching Aids and Materials", description: "Charts, models and ICT for EVS." },
        ],
      },
    ],
  },

  // ── MATHEMATICS (Paper II) ───────────────────────────────────────────
  {
    code: "MATH_SCI",
    name: "Mathematics and Science (Paper II)",
    weight: 1,
    topics: [
      { code: "math_sci.math.number_system", name: "Number System", description: "Integers, rational numbers and real numbers." },
      { code: "math_sci.math.statistics_probability", name: "Statistics and Probability", description: "Mean, median, mode and basic probability." },
      { code: "math_sci.math.arithmetic_progression", name: "Arithmetic Progression", description: "AP — first term, common difference, nth term and sum." },
      { code: "math_sci.math.trigonometry", name: "Trigonometry", description: "Trigonometric ratios, identities and heights and distances." },
      { code: "math_sci.math.coordinate_geometry", name: "Coordinate Geometry", description: "Cartesian plane, distance formula and section formula." },
      { code: "math_sci.math.identities_equations", name: "Identities and Linear Equations", description: "Algebraic identities and pair of linear equations in two variables." },
      { code: "math_sci.math.quadratic", name: "Quadratic Equations", description: "Quadratic equations, roots and discriminant." },
      { code: "math_sci.math.polynomials", name: "Polynomials", description: "Polynomials, zeros and division algorithm." },
      { code: "math_sci.math.mensuration", name: "Mensuration", description: "Area, perimeter, surface area and volume of plane and solid figures." },
      { code: "math_sci.math.triangles_quadrilaterals", name: "Triangles, Quadrilaterals and Circles", description: "Properties, congruence, similarity and circle theorems." },
      { code: "math_sci.math.pedagogy", name: "Pedagogy of Mathematics",
        description: "Pedagogy specific to upper-primary mathematics.",
        subtopics: [
          { code: "math_sci.math.pedagogy.problem_solving", name: "Problem-Solving Methods", description: "Heuristic, analytic and synthetic problem-solving." },
          { code: "math_sci.math.pedagogy.evaluation", name: "Evaluation in Mathematics", description: "Diagnostic, formative and summative evaluation." },
          { code: "math_sci.math.pedagogy.remedial", name: "Remedial Teaching", description: "Identifying and remediating learning gaps." },
        ],
      },
      { code: "math_sci.science.physics_motion", name: "Physics — Motion and Gravitation", description: "Motion, laws of motion, gravitation and equations of motion." },
      { code: "math_sci.science.physics_light", name: "Physics — Light", description: "Reflection, refraction, lenses, mirrors and image formation." },
      { code: "math_sci.science.physics_electricity", name: "Physics — Electricity and Magnetism", description: "Electric circuits, resistance, magnetism, AC/DC motors and generators." },
      { code: "math_sci.science.chemistry_metals", name: "Chemistry — Metals and Non-Metals", description: "Properties of metals and non-metals, reactivity series." },
      { code: "math_sci.science.chemistry_acids", name: "Chemistry — Acids, Bases and Salts", description: "Properties, indicators and uses of acids, bases and salts." },
      { code: "math_sci.science.chemistry_atoms", name: "Chemistry — Atoms and Molecules", description: "Atomic structure, electron configuration and molecules." },
      { code: "math_sci.science.chemistry_polymers", name: "Chemistry — Polymers and Daily Life", description: "Polymers, soaps, medicines and chemicals in daily life." },
      { code: "math_sci.science.biology_food", name: "Biology — Food and Nutrition", description: "Sources of food, food constituents and nutrition." },
      { code: "math_sci.science.biology_microorganisms", name: "Biology — Microorganisms", description: "Bacteria, viruses, fungi and the kingdoms of life." },
      { code: "math_sci.science.biology_classification", name: "Biology — Vertebrates and Invertebrates", description: "Animal classification — vertebrates and invertebrates." },
      { code: "math_sci.science.biology_cell", name: "Biology — Cell and Organ Systems", description: "Cell types, tissues and human organ systems." },
      { code: "math_sci.science.pedagogy", name: "Pedagogy of Science",
        description: "Pedagogy specific to upper-primary science.",
        subtopics: [
          { code: "math_sci.science.pedagogy.nature", name: "Nature and Structure of Science", description: "Science as a way of knowing." },
          { code: "math_sci.science.pedagogy.aims", name: "Aims and Objectives", description: "Cognitive, affective and skill objectives." },
          { code: "math_sci.science.pedagogy.methods", name: "Methods of Teaching Science", description: "Inquiry, project, demonstration and experimental methods." },
          { code: "math_sci.science.pedagogy.evaluation", name: "Evaluation in Science", description: "Achievement, diagnostic tests and remedial work." },
        ],
      },
    ],
  },

  // ── SOCIAL SCIENCE (Paper II) ────────────────────────────────────────
  {
    code: "SOCIAL_STUDIES",
    name: "Social Studies (Paper II)",
    weight: 1,
    topics: [
      { code: "ss.history.ancient", name: "Ancient India", description: "Vedic period, Mauryan and Gupta empires." },
      { code: "ss.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Vijayanagara, Mughals and bhakti-sufi movements." },
      { code: "ss.history.karnataka", name: "History of Karnataka", description: "Kadambas, Chalukyas, Hoysalas, Vijayanagara and Mysuru kingdoms." },
      { code: "ss.history.modern", name: "Modern India", description: "British rule, freedom struggle and independence." },
      { code: "ss.geography.earth", name: "Earth Systems", description: "Solar system, latitudes, longitudes and motions of the earth." },
      { code: "ss.geography.environments", name: "Environments and Resources", description: "Natural and human environments and resources." },
      { code: "ss.geography.agriculture", name: "Agriculture", description: "Types of agriculture, crops and agricultural practices in India." },
      { code: "ss.geography.karnataka", name: "Geography of Karnataka", description: "Physical features, rivers, climate and resources of Karnataka." },
      { code: "ss.geography.world", name: "World Geography", description: "Continents, oceans and important countries." },
      { code: "ss.civics.diversity", name: "Diversity and Indian Society", description: "Linguistic, religious and cultural diversity in India." },
      { code: "ss.civics.constitution", name: "Indian Constitution", description: "Preamble, fundamental rights, duties and DPSPs." },
      { code: "ss.civics.democracy", name: "Democracy and Government", description: "Parliamentary democracy, executive and legislature." },
      { code: "ss.civics.judiciary", name: "Judiciary", description: "Supreme Court, High Courts and the judicial system." },
      { code: "ss.civics.local", name: "Local Self-Government", description: "Panchayati raj and municipalities in Karnataka." },
      { code: "ss.economics", name: "Indian Economy", description: "Sectors of the economy and economic development." },
      { code: "ss.environment", name: "Environment and Sustainable Development", description: "Pollution, conservation and sustainable practices." },
      { code: "ss.pedagogy", name: "Pedagogical Issues in Social Studies",
        description: "Pedagogy specific to upper-primary social studies.",
        subtopics: [
          { code: "ss.pedagogy.concept", name: "Concept and Nature of Social Studies", description: "Scope and aims of social studies." },
          { code: "ss.pedagogy.inquiry", name: "Inquiry-Based Learning", description: "Inquiry, project and discovery approaches." },
          { code: "ss.pedagogy.classroom", name: "Classroom Processes and Discourse", description: "Discussion, debate and inquiry in social studies." },
          { code: "ss.pedagogy.thinking", name: "Developing Critical Thinking", description: "Reasoning and analytical thinking in social studies." },
          { code: "ss.pedagogy.sources", name: "Primary and Secondary Sources", description: "Use of historical sources and contemporary data." },
          { code: "ss.pedagogy.evaluation", name: "Evaluation in Social Studies", description: "Tools and techniques for assessing learning." },
        ],
      },
    ],
  },
];

export async function seedKartetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "KA_KARTET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — KA_KARTET exam not found.");
  }
  console.log(`Seeding KAR TET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < kartetSyllabus.length; sIdx++) {
    const s = kartetSyllabus[sIdx];
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
  seedKartetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
