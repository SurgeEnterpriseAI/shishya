// KTET (Kerala Teacher Eligibility Test) — full syllabus tree.
// Conducted by Kerala Pareeksha Bhavan, Government of Kerala.
// Four categories, each 150 MCQs × 1 mark = 150 marks. No negative marking.
// Category I: Lower Primary Classes (1-5).
// Category II: Upper Primary Classes (6-8).
// Category III: High School Classes (9-10) / Higher Secondary subject teachers.
// Category IV: Language teachers, specialist teachers and physical education.
// Lang I options: Malayalam, Tamil, Kannada (medium of instruction).
// Lang II: English (and/or Arabic for Cat IV).
// Source: ktet.kerala.gov.in official syllabus PDFs (syllabus1-syllabus4),
// cross-checked with Careerpower / Adda247 / Collegedekho coverage.
//
// Run after seedExams: npx tsx seed/exams/ktet-syllabus.ts

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

export const ktetSyllabus: SubjectSeed[] = [
  // ── CHILD DEVELOPMENT & PEDAGOGY ──────────────────────────────────────
  {
    code: "CDP",
    name: "Child Development and Pedagogy",
    weight: 1,
    topics: [
      { code: "ktet.cdp.development", name: "Child Development",
        description: "Concept and principles of child growth and development.",
        subtopics: [
          { code: "ktet.cdp.development.concept", name: "Concept of Development", description: "Definition of development and its relationship with learning at primary stage." },
          { code: "ktet.cdp.development.principles", name: "Principles of Development", description: "Continuity, sequence and individual differences." },
          { code: "ktet.cdp.development.heredity", name: "Heredity and Environment", description: "Influence of heredity and environment on development." },
          { code: "ktet.cdp.development.dimensions", name: "Dimensions of Development", description: "Physical, cognitive, emotional, social, language and moral development." },
          { code: "ktet.cdp.development.adolescence", name: "Adolescence (Cat II/III)", description: "Physical and emotional changes during adolescence." },
        ],
      },
      { code: "ktet.cdp.learning_theories", name: "Theories of Learning",
        description: "Major theories of learning and educational implications.",
        subtopics: [
          { code: "ktet.cdp.learning_theories.behaviourism", name: "Behaviourism", description: "Pavlov, Skinner and Thorndike — conditioning and connectionism." },
          { code: "ktet.cdp.learning_theories.gestalt", name: "Gestalt and Insight Learning", description: "Perception, problem-solving and insight learning." },
          { code: "ktet.cdp.learning_theories.piaget", name: "Piaget — Cognitive Development", description: "Stages of cognitive development and schema theory." },
          { code: "ktet.cdp.learning_theories.vygotsky", name: "Vygotsky — Socio-cultural Theory", description: "Zone of Proximal Development and scaffolding." },
          { code: "ktet.cdp.learning_theories.bruner", name: "Bruner — Discovery Learning", description: "Modes of representation and spiral curriculum." },
          { code: "ktet.cdp.learning_theories.kohlberg", name: "Kohlberg — Moral Development", description: "Stages of moral reasoning and educational implications." },
          { code: "ktet.cdp.learning_theories.constructivism", name: "Constructivism", description: "Knowledge construction by learners through experience." },
        ],
      },
      { code: "ktet.cdp.intelligence", name: "Intelligence and Creativity",
        description: "Theories of intelligence and creativity.",
        subtopics: [
          { code: "ktet.cdp.intelligence.theories", name: "Theories of Intelligence", description: "Spearman, Thurstone, Gardner — multi-dimensional intelligence." },
          { code: "ktet.cdp.intelligence.iq", name: "Measurement of Intelligence", description: "IQ, intelligence tests and educational implications." },
          { code: "ktet.cdp.intelligence.creativity", name: "Creativity", description: "Concept and identification of creativity in learners." },
        ],
      },
      { code: "ktet.cdp.individual_differences", name: "Individual Differences",
        description: "Differences among learners.",
        subtopics: [
          { code: "ktet.cdp.individual_differences.basis", name: "Basis of Differences", description: "Differences based on language, caste, gender, community and ability." },
          { code: "ktet.cdp.individual_differences.gender", name: "Gender as a Social Construct", description: "Gender roles, gender bias and educational practice." },
          { code: "ktet.cdp.individual_differences.personality", name: "Personality", description: "Type, trait and self-theories of personality." },
        ],
      },
      { code: "ktet.cdp.inclusive_education", name: "Inclusive Education and Special Needs",
        description: "Diverse learners and inclusive classrooms.",
        subtopics: [
          { code: "ktet.cdp.inclusive_education.disadvantaged", name: "Disadvantaged Learners", description: "SC/ST/minority/migrant children and educational equity." },
          { code: "ktet.cdp.inclusive_education.disabilities", name: "Children with Learning Difficulties", description: "Dyslexia, dysgraphia, dyscalculia, ADHD." },
          { code: "ktet.cdp.inclusive_education.gifted", name: "Gifted and Talented Children", description: "Identification and differentiated strategies for gifted learners." },
          { code: "ktet.cdp.inclusive_education.rte", name: "Right to Education Act 2009", description: "RTE provisions and inclusive education mandate." },
          { code: "ktet.cdp.inclusive_education.kerala_inclusive", name: "Kerala Inclusive Education", description: "SSA, Samagra Shiksha and Kerala-specific inclusive practices." },
        ],
      },
      { code: "ktet.cdp.learning_pedagogy", name: "Learning and Pedagogy",
        description: "How children learn and pedagogical approaches.",
        subtopics: [
          { code: "ktet.cdp.learning_pedagogy.how", name: "How Children Think and Learn", description: "Children as active constructors of knowledge." },
          { code: "ktet.cdp.learning_pedagogy.motivation", name: "Motivation and Learning", description: "Intrinsic/extrinsic motivation and theories of motivation." },
          { code: "ktet.cdp.learning_pedagogy.methods", name: "Pedagogical Methods", description: "Activity-based, project, child-centred and progressive learning." },
          { code: "ktet.cdp.learning_pedagogy.classroom_mgmt", name: "Classroom Management", description: "Discipline, leadership and managing diverse classrooms." },
        ],
      },
      { code: "ktet.cdp.assessment", name: "Assessment and Evaluation",
        description: "Assessment for and of learning.",
        subtopics: [
          { code: "ktet.cdp.assessment.types", name: "Formative and Summative Assessment", description: "Distinction between assessment for and of learning." },
          { code: "ktet.cdp.assessment.cce", name: "Continuous Comprehensive Evaluation", description: "CCE perspective, practice and tools." },
          { code: "ktet.cdp.assessment.tools", name: "Assessment Tools", description: "Tests, observation, portfolios, rubrics and questioning." },
        ],
      },
      { code: "ktet.cdp.adolescent_psychology", name: "Adolescent Psychology (Cat III/IV)",
        description: "Psychology of adolescent learners and teaching aptitude.",
        subtopics: [
          { code: "ktet.cdp.adolescent_psychology.development", name: "Adolescent Development", description: "Physical, cognitive and emotional changes during adolescence." },
          { code: "ktet.cdp.adolescent_psychology.aptitude", name: "Teaching Aptitude", description: "Qualities of a good teacher and pedagogical aptitude for adolescents." },
          { code: "ktet.cdp.adolescent_psychology.guidance", name: "Guidance and Counselling", description: "Educational, vocational and personal counselling for adolescents." },
        ],
      },
    ],
  },

  // ── LANGUAGE I (Malayalam / Tamil / Kannada) ──────────────────────────
  {
    code: "LANG1",
    name: "Language I (Malayalam / Tamil / Kannada)",
    weight: 1,
    topics: [
      { code: "ktet.lang1.malayalam", name: "Malayalam",
        description: "Malayalam grammar, literature and pedagogy.",
        subtopics: [
          { code: "ktet.lang1.malayalam.grammar", name: "Malayalam Grammar (Vyakaranam)", description: "Sandhi, samasa, alankara and grammatical rules in Malayalam." },
          { code: "ktet.lang1.malayalam.literature", name: "Malayalam Literature", description: "Famous Malayalam writers — Thunchaththu Ezhuthachan, Kumaran Asan, Vallathol and modern writers." },
          { code: "ktet.lang1.malayalam.vocabulary", name: "Malayalam Vocabulary", description: "Synonyms, antonyms, idioms and one-word substitution." },
          { code: "ktet.lang1.malayalam.comprehension", name: "Malayalam Comprehension", description: "Unseen Malayalam prose and poem with comprehension questions." },
        ],
      },
      { code: "ktet.lang1.tamil", name: "Tamil",
        description: "Tamil grammar, literature and pedagogy.",
        subtopics: [
          { code: "ktet.lang1.tamil.grammar", name: "Tamil Grammar (Ilakkanam)", description: "Eluttu, sol, porul and Tamil grammar rules." },
          { code: "ktet.lang1.tamil.literature", name: "Tamil Literature", description: "Sangam literature, Thirukkural, epics and modern Tamil writers." },
          { code: "ktet.lang1.tamil.comprehension", name: "Tamil Comprehension", description: "Unseen Tamil passages with comprehension questions." },
        ],
      },
      { code: "ktet.lang1.kannada", name: "Kannada",
        description: "Kannada grammar, literature and pedagogy.",
        subtopics: [
          { code: "ktet.lang1.kannada.grammar", name: "Kannada Grammar (Vyakarana)", description: "Sandhi, samasa, alankara and grammatical rules in Kannada." },
          { code: "ktet.lang1.kannada.literature", name: "Kannada Literature", description: "Famous Kannada writers — Pampa, Kuvempu, Da Ra Bendre and Jnanpith laureates." },
          { code: "ktet.lang1.kannada.comprehension", name: "Kannada Comprehension", description: "Unseen Kannada passages with comprehension questions." },
        ],
      },
      { code: "ktet.lang1.pedagogy", name: "Pedagogy of Language I",
        description: "Methods of teaching the chosen Language I.",
        subtopics: [
          { code: "ktet.lang1.pedagogy.acquisition", name: "Language Acquisition vs Learning", description: "Krashen's principles and natural acquisition of mother tongue." },
          { code: "ktet.lang1.pedagogy.principles", name: "Principles of Language Teaching", description: "Key principles guiding primary-level language instruction." },
          { code: "ktet.lang1.pedagogy.skills", name: "LSRW Skills", description: "Listening, speaking, reading and writing in classrooms." },
          { code: "ktet.lang1.pedagogy.diverse", name: "Teaching in Diverse Classrooms", description: "Multilingual classrooms and language errors." },
          { code: "ktet.lang1.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbooks, multimedia and multilingual resources." },
          { code: "ktet.lang1.pedagogy.evaluation", name: "Evaluation of Language Proficiency", description: "Assessment of LSRW skills." },
          { code: "ktet.lang1.pedagogy.remedial", name: "Remedial Teaching", description: "Identifying and addressing language-learning gaps." },
        ],
      },
    ],
  },

  // ── LANGUAGE II (English / Arabic) ────────────────────────────────────
  {
    code: "LANG2",
    name: "Language II (English / Arabic)",
    weight: 1,
    topics: [
      { code: "ktet.lang2.english", name: "English Language",
        description: "English grammar, comprehension and vocabulary.",
        subtopics: [
          { code: "ktet.lang2.english.comprehension", name: "Reading Comprehension", description: "Two unseen prose passages with comprehension and inference." },
          { code: "ktet.lang2.english.grammar", name: "English Grammar", description: "Tenses, parts of speech, voice, reported speech and sentence structure." },
          { code: "ktet.lang2.english.vocabulary", name: "Vocabulary", description: "Synonyms, antonyms and one-word substitution." },
          { code: "ktet.lang2.english.phonology", name: "Phonology and Pronunciation", description: "Phonemes, syllables, stress and intonation." },
        ],
      },
      { code: "ktet.lang2.arabic", name: "Arabic Language (Cat IV alternative)",
        description: "Arabic grammar, vocabulary and comprehension for Arabic teachers.",
        subtopics: [
          { code: "ktet.lang2.arabic.grammar", name: "Arabic Grammar (Nahw)", description: "Arabic grammar rules and morphology." },
          { code: "ktet.lang2.arabic.vocabulary", name: "Arabic Vocabulary", description: "Vocabulary, synonyms, antonyms and word formation in Arabic." },
          { code: "ktet.lang2.arabic.literature", name: "Arabic Literature", description: "Classical and modern Arabic literature and authors." },
          { code: "ktet.lang2.arabic.comprehension", name: "Arabic Comprehension", description: "Unseen Arabic passages with comprehension questions." },
        ],
      },
      { code: "ktet.lang2.pedagogy", name: "Pedagogy of Language II",
        description: "Methods of teaching English/Arabic at primary stage.",
        subtopics: [
          { code: "ktet.lang2.pedagogy.principles", name: "Principles of Language II Teaching", description: "Communicative, structural-situational and direct methods." },
          { code: "ktet.lang2.pedagogy.skills", name: "LSRW Skills", description: "Listening, speaking, reading and writing in language classrooms." },
          { code: "ktet.lang2.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbooks, audio-visual aids and digital resources." },
          { code: "ktet.lang2.pedagogy.assessment", name: "Evaluating Language Proficiency", description: "Assessment of LSRW skills." },
          { code: "ktet.lang2.pedagogy.remedial", name: "Remedial Teaching", description: "Remedial strategies for language gaps." },
        ],
      },
    ],
  },

  // ── MATHEMATICS (Cat I + Cat II) ──────────────────────────────────────
  {
    code: "MATH",
    name: "Mathematics",
    weight: 1,
    topics: [
      { code: "ktet.math.natural_numbers", name: "Natural Numbers and Number System", description: "Natural numbers, place value, divisibility, HCF and LCM." },
      { code: "ktet.math.fractions", name: "Fractions and Decimals", description: "Operations on fractions and decimals and their conversions." },
      { code: "ktet.math.measurements", name: "Measurements", description: "Length, weight, capacity, time, money and standard units." },
      { code: "ktet.math.geometry", name: "Geometry", description: "Lines, angles, triangles, circles, polygons and properties." },
      { code: "ktet.math.algebra", name: "Algebra (Cat II)", description: "Variables, expressions, linear equations and identities." },
      { code: "ktet.math.mensuration", name: "Mensuration", description: "Area, perimeter, surface area and volume of standard figures." },
      { code: "ktet.math.data_handling", name: "Data Handling", description: "Tables, bar graphs, pictographs, mean, median and mode." },
      { code: "ktet.math.arithmetic", name: "Arithmetic", description: "Percentage, ratio-proportion, profit-loss and interest." },
      { code: "ktet.math.pedagogy", name: "Pedagogy of Mathematics",
        description: "Methods of teaching mathematics in classrooms.",
        subtopics: [
          { code: "ktet.math.pedagogy.nature", name: "Nature of Mathematics", description: "Math as a logical and exact science and place in curriculum." },
          { code: "ktet.math.pedagogy.aims", name: "Aims and Objectives", description: "Aims of teaching mathematics at primary stage." },
          { code: "ktet.math.pedagogy.methods", name: "Methods of Teaching", description: "Activity-based, problem-solving, inductive-deductive methods." },
          { code: "ktet.math.pedagogy.evaluation", name: "Evaluation in Math", description: "Diagnostic, formative and summative assessment." },
          { code: "ktet.math.pedagogy.remedial", name: "Remedial Teaching", description: "Identifying common errors and remediation strategies." },
        ],
      },
    ],
  },

  // ── EVS (Cat I) ───────────────────────────────────────────────────────
  {
    code: "EVS",
    name: "Environmental Studies (Category I)",
    weight: 1,
    topics: [
      { code: "ktet.evs.family", name: "Family", description: "Family relationships, types of families and family roles." },
      { code: "ktet.evs.water", name: "Water", description: "Sources, conservation, water cycle and water-borne diseases." },
      { code: "ktet.evs.agriculture", name: "Agriculture", description: "Crops, agricultural practices and Kerala agricultural seasons." },
      { code: "ktet.evs.soil", name: "Soil", description: "Types of soil, soil conservation and soil-related farming." },
      { code: "ktet.evs.diseases", name: "Diseases", description: "Common communicable and non-communicable diseases." },
      { code: "ktet.evs.food", name: "Food", description: "Food sources, balanced diet and food preservation." },
      { code: "ktet.evs.plants", name: "Plants", description: "Plant structure, growth, photosynthesis and classification." },
      { code: "ktet.evs.animals", name: "Animals", description: "Animal classification, habitats and adaptations." },
      { code: "ktet.evs.air", name: "Air", description: "Composition of air, atmospheric layers and air pollution." },
      { code: "ktet.evs.kerala_environment", name: "Kerala Environment", description: "Kerala's natural features, backwaters, Western Ghats and biodiversity." },
      { code: "ktet.evs.pedagogy", name: "Pedagogy of EVS",
        description: "Methods of teaching environmental studies.",
        subtopics: [
          { code: "ktet.evs.pedagogy.concept", name: "Concept and Scope of EVS", description: "Nature, scope and integrated character of EVS." },
          { code: "ktet.evs.pedagogy.activities", name: "Activities and Experimentation", description: "Hands-on activities, experiments and field visits." },
          { code: "ktet.evs.pedagogy.cce", name: "CCE in EVS", description: "Continuous and comprehensive evaluation in EVS." },
          { code: "ktet.evs.pedagogy.materials", name: "Teaching Materials", description: "Charts, models, multimedia and field-based resources." },
          { code: "ktet.evs.pedagogy.problems", name: "Problems of Teaching EVS", description: "Difficulties and remedial strategies." },
        ],
      },
    ],
  },

  // ── CATEGORY II/III SUBJECT-SPECIFIC: MATH & SCIENCE ─────────────────
  {
    code: "MATH_SCI",
    name: "Mathematics and Science (Category II/III)",
    weight: 1,
    topics: [
      { code: "ktet.ms.algebra", name: "Algebra", description: "Polynomials, equations, exponents and algebraic identities." },
      { code: "ktet.ms.geometry", name: "Geometry and Trigonometry", description: "Triangles, circles, coordinate geometry and basic trigonometry." },
      { code: "ktet.ms.mensuration", name: "Mensuration", description: "Area, surface area and volume of 2D and 3D figures." },
      { code: "ktet.ms.statistics", name: "Statistics and Probability", description: "Mean, median, mode, standard deviation and basic probability." },
      { code: "ktet.ms.physics", name: "Physics",
        description: "Physics topics for upper primary and high school.",
        subtopics: [
          { code: "ktet.ms.physics.mechanics", name: "Force and Motion", description: "Force, friction, motion, simple machines and energy." },
          { code: "ktet.ms.physics.heat_light", name: "Heat, Light and Sound", description: "Temperature, heat transfer, optics and sound." },
          { code: "ktet.ms.physics.electricity", name: "Electricity and Magnetism", description: "Current, circuits, magnets and electromagnetic induction." },
        ],
      },
      { code: "ktet.ms.chemistry", name: "Chemistry",
        description: "Chemistry topics for classes 6-10.",
        subtopics: [
          { code: "ktet.ms.chemistry.matter", name: "Matter and Its Nature", description: "States of matter, mixtures, solutions and separation techniques." },
          { code: "ktet.ms.chemistry.elements", name: "Elements, Compounds and Reactions", description: "Atoms, molecules, periodic table and chemical reactions." },
          { code: "ktet.ms.chemistry.acids_bases", name: "Acids, Bases and Salts", description: "Common acids/bases, indicators, salts and uses." },
        ],
      },
      { code: "ktet.ms.biology", name: "Biology",
        description: "Life processes, plants, animals and ecology.",
        subtopics: [
          { code: "ktet.ms.biology.plants", name: "World of Plants", description: "Plant structure, photosynthesis, reproduction and classification." },
          { code: "ktet.ms.biology.animals", name: "World of Animals", description: "Animal classification, habitats and adaptations." },
          { code: "ktet.ms.biology.human", name: "Human Body and Health", description: "Organ systems, nutrition, diseases and hygiene." },
          { code: "ktet.ms.biology.environment", name: "Environment and Ecology", description: "Ecosystems, biodiversity, pollution and conservation." },
        ],
      },
      { code: "ktet.ms.pedagogy", name: "Pedagogy of Math and Science",
        description: "Methods of teaching math and science.",
        subtopics: [
          { code: "ktet.ms.pedagogy.nature", name: "Nature and Aims", description: "Nature of math/science and aims of teaching." },
          { code: "ktet.ms.pedagogy.methods", name: "Methods of Teaching", description: "Activity-based, experimental, project and inquiry methods." },
          { code: "ktet.ms.pedagogy.lab", name: "Laboratory and Practical Work", description: "Practical work, lab safety and equipment." },
          { code: "ktet.ms.pedagogy.evaluation", name: "Evaluation", description: "Formative and summative evaluation." },
        ],
      },
    ],
  },

  // ── CATEGORY II/III: SOCIAL SCIENCE ──────────────────────────────────
  {
    code: "SOCIAL_STUDIES",
    name: "Social Science (Category II/III)",
    weight: 1,
    topics: [
      { code: "ktet.ss.history", name: "History",
        description: "Indian and Kerala history.",
        subtopics: [
          { code: "ktet.ss.history.ancient", name: "Ancient and Medieval India", description: "Indus Valley, Vedic age, Mauryas, Guptas, Sultanate and Mughals." },
          { code: "ktet.ss.history.modern", name: "Modern India and Freedom Struggle", description: "British rule, INC, Gandhian movement and partition." },
          { code: "ktet.ss.history.kerala", name: "History of Kerala", description: "Cheras, Travancore, Kochi, Malabar and Kerala renaissance." },
          { code: "ktet.ss.history.world", name: "World History", description: "French Revolution, Industrial Revolution and World Wars." },
        ],
      },
      { code: "ktet.ss.geography", name: "Geography",
        description: "Physical, human and economic geography.",
        subtopics: [
          { code: "ktet.ss.geography.earth", name: "The Earth", description: "Solar system, latitudes, longitudes and earth's movements." },
          { code: "ktet.ss.geography.physical", name: "Physical Geography", description: "Landforms, atmosphere, hydrosphere and biosphere." },
          { code: "ktet.ss.geography.india", name: "Geography of India", description: "Physical features, climate, rivers and natural resources." },
          { code: "ktet.ss.geography.kerala", name: "Geography of Kerala", description: "Districts, rivers, climate, backwaters and Western Ghats." },
          { code: "ktet.ss.geography.maps", name: "Maps and Map Reading", description: "Types of maps, scales, symbols and projections." },
        ],
      },
      { code: "ktet.ss.civics", name: "Civics and Political Science",
        description: "Indian Constitution and democratic institutions.",
        subtopics: [
          { code: "ktet.ss.civics.constitution", name: "Indian Constitution", description: "Preamble, fundamental rights, duties and DPSPs." },
          { code: "ktet.ss.civics.government", name: "Union and State Government", description: "President, PM, Parliament, Governor and CM." },
          { code: "ktet.ss.civics.local", name: "Local Self-Government", description: "Panchayati Raj and Kerala's strong local governance model." },
        ],
      },
      { code: "ktet.ss.economics", name: "Economics",
        description: "Basic economic concepts.",
        subtopics: [
          { code: "ktet.ss.economics.basics", name: "Basic Concepts", description: "Wants, needs, scarcity, production and consumption." },
          { code: "ktet.ss.economics.indian_economy", name: "Indian and Kerala Economy", description: "Sectors, planning, banking and Kerala's economic profile." },
        ],
      },
      { code: "ktet.ss.pedagogy", name: "Pedagogy of Social Science",
        description: "Methods of teaching social science.",
        subtopics: [
          { code: "ktet.ss.pedagogy.nature", name: "Nature and Scope", description: "Nature, scope and integrated character of social science." },
          { code: "ktet.ss.pedagogy.methods", name: "Methods of Teaching", description: "Story-telling, dramatisation, project and field-based methods." },
          { code: "ktet.ss.pedagogy.materials", name: "Teaching Materials", description: "Maps, charts, time-lines, models and digital resources." },
          { code: "ktet.ss.pedagogy.evaluation", name: "Evaluation", description: "Formative and summative evaluation strategies." },
        ],
      },
    ],
  },

  // ── CATEGORY IV: SPECIALIST TEACHER SUBJECTS ──────────────────────────
  {
    code: "SPECIALIST",
    name: "Category IV — Specialist Teacher Subjects",
    weight: 0.6,
    topics: [
      { code: "ktet.specialist.physical_education", name: "Physical Education", description: "Sports, yoga, fitness, anatomy and physical training pedagogy." },
      { code: "ktet.specialist.drawing", name: "Drawing and Art", description: "Fundamentals of drawing, art history, techniques and art teaching pedagogy." },
      { code: "ktet.specialist.music", name: "Music", description: "Music theory, ragas, instruments, vocal training and music teaching pedagogy." },
      { code: "ktet.specialist.hindi", name: "Hindi", description: "Hindi grammar, literature and pedagogy of Hindi as a specialist subject." },
      { code: "ktet.specialist.urdu", name: "Urdu", description: "Urdu grammar, literature and pedagogy of Urdu as a specialist subject." },
      { code: "ktet.specialist.sanskrit", name: "Sanskrit", description: "Sanskrit grammar, literature and pedagogy of Sanskrit." },
      { code: "ktet.specialist.arabic", name: "Arabic (Specialist)", description: "Arabic grammar, literature and pedagogy of Arabic as a specialist subject." },
    ],
  },
];

export async function seedKtetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "KL_KTET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — KL_KTET exam not found.");
  }
  console.log(`Seeding KTET (Kerala) syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < ktetSyllabus.length; sIdx++) {
    const s = ktetSyllabus[sIdx];
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
  seedKtetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
