// AP TET (Andhra Pradesh Teacher Eligibility Test) — full syllabus tree.
// Conducted by School Education Department / APCFSS, Andhra Pradesh.
// Two papers, each 150 MCQs × 1 mark = 150 marks in 2.5 hours. No negative marking.
// Paper I: Classes 1-5 (CDP, Lang I, Lang II, Math, EVS).
// Paper II: Classes 6-8 (CDP, Lang I, Lang II + Math&Sci OR Social Studies).
// Lang I options: Telugu, Urdu, Hindi, Tamil, Kannada, Odia. Lang II: English.
// Source: aptet.apcfss.in Information Bulletin 2024 (official AP TET notification),
// cross-checked with adda247 / collegesearch / teachersbadi coverage.
//
// Run after seedExams: npx tsx seed/exams/ap-tet-syllabus.ts

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

export const apTetSyllabus: SubjectSeed[] = [
  // ── CHILD DEVELOPMENT & PEDAGOGY ──────────────────────────────────────
  {
    code: "CDP",
    name: "Child Development and Pedagogy",
    weight: 1,
    topics: [
      { code: "aptet.cdp.development", name: "Development of Child",
        description: "Concept and principles of child growth and development.",
        subtopics: [
          { code: "aptet.cdp.development.concept", name: "Concept of Growth and Development", description: "Definition, distinction between growth and development and their relationship with learning." },
          { code: "aptet.cdp.development.principles", name: "Principles of Development", description: "Continuity, sequence, individual differences and integration in development." },
          { code: "aptet.cdp.development.heredity_environment", name: "Heredity and Environment", description: "Influence of heredity and environment on child development." },
          { code: "aptet.cdp.development.dimensions", name: "Dimensions of Development", description: "Physical, cognitive, emotional, social, language and moral development." },
          { code: "aptet.cdp.development.adolescence", name: "Adolescence (Paper II)", description: "Physical, emotional and social changes during adolescence (11-14)." },
        ],
      },
      { code: "aptet.cdp.learning_theories", name: "Learning Theories",
        description: "Major theories of learning and classroom implications.",
        subtopics: [
          { code: "aptet.cdp.learning_theories.behaviourism", name: "Behaviourism", description: "Pavlov, Skinner and Thorndike — conditioning and connectionism." },
          { code: "aptet.cdp.learning_theories.gestalt", name: "Gestalt and Insight Learning", description: "Perception, problem-solving and insight learning." },
          { code: "aptet.cdp.learning_theories.piaget", name: "Piaget — Cognitive Development", description: "Stages of cognitive development and schema theory." },
          { code: "aptet.cdp.learning_theories.vygotsky", name: "Vygotsky — Socio-cultural Theory", description: "Zone of Proximal Development and scaffolding." },
          { code: "aptet.cdp.learning_theories.bruner", name: "Bruner — Discovery Learning", description: "Modes of representation and spiral curriculum." },
          { code: "aptet.cdp.learning_theories.kohlberg", name: "Kohlberg — Moral Development", description: "Stages of moral reasoning and educational implications." },
          { code: "aptet.cdp.learning_theories.erikson", name: "Erikson — Psychosocial Stages", description: "Eight stages of psychosocial development." },
        ],
      },
      { code: "aptet.cdp.intelligence", name: "Intelligence and Creativity",
        description: "Theories of intelligence and creativity.",
        subtopics: [
          { code: "aptet.cdp.intelligence.theories", name: "Theories of Intelligence", description: "Spearman, Thurstone, Gardner — multi-dimensional intelligence." },
          { code: "aptet.cdp.intelligence.iq", name: "Measurement of Intelligence", description: "IQ, intelligence tests and educational implications." },
          { code: "aptet.cdp.intelligence.creativity", name: "Creativity", description: "Concept and identification of creativity in learners." },
        ],
      },
      { code: "aptet.cdp.individual_differences", name: "Individual Differences and Personality",
        description: "Differences among learners and personality.",
        subtopics: [
          { code: "aptet.cdp.individual_differences.basis", name: "Basis of Differences", description: "Differences based on language, caste, gender, community, religion and ability." },
          { code: "aptet.cdp.individual_differences.gender", name: "Gender as a Social Construct", description: "Gender roles, gender bias and educational practice." },
          { code: "aptet.cdp.individual_differences.personality", name: "Personality", description: "Type, trait and self-theories of personality." },
        ],
      },
      { code: "aptet.cdp.inclusive_education", name: "Inclusive Education and Children with Special Needs",
        description: "Diverse learners and inclusive classrooms.",
        subtopics: [
          { code: "aptet.cdp.inclusive_education.disadvantaged", name: "Disadvantaged Learners", description: "SC/ST/minority/migrant children and educational equity." },
          { code: "aptet.cdp.inclusive_education.disabilities", name: "Children with Learning Difficulties", description: "Dyslexia, dysgraphia, dyscalculia, ADHD and assistive strategies." },
          { code: "aptet.cdp.inclusive_education.gifted", name: "Gifted and Talented Children", description: "Identification and differentiated strategies for gifted learners." },
          { code: "aptet.cdp.inclusive_education.rte", name: "Right to Education Act 2009", description: "RTE provisions and inclusive education mandate." },
        ],
      },
      { code: "aptet.cdp.learning_pedagogy", name: "Learning and Pedagogy",
        description: "How children learn and pedagogical approaches.",
        subtopics: [
          { code: "aptet.cdp.learning_pedagogy.how", name: "How Children Think and Learn", description: "Children as active constructors of knowledge." },
          { code: "aptet.cdp.learning_pedagogy.motivation", name: "Motivation and Learning", description: "Intrinsic/extrinsic motivation and theories of motivation." },
          { code: "aptet.cdp.learning_pedagogy.methods", name: "Pedagogical Methods", description: "Enquiry-based, project-based and child-centred learning." },
          { code: "aptet.cdp.learning_pedagogy.classroom_mgmt", name: "Classroom Management", description: "Discipline, leadership and group dynamics." },
        ],
      },
      { code: "aptet.cdp.assessment", name: "Assessment and Evaluation",
        description: "Assessment for and of learning.",
        subtopics: [
          { code: "aptet.cdp.assessment.types", name: "Formative and Summative Assessment", description: "Distinction between assessment for learning and of learning." },
          { code: "aptet.cdp.assessment.cce", name: "Continuous Comprehensive Evaluation", description: "CCE perspective, practice and tools." },
          { code: "aptet.cdp.assessment.tools", name: "Assessment Tools", description: "Tests, observation, portfolios, rubrics and questioning." },
        ],
      },
    ],
  },

  // ── LANGUAGE I (Telugu / Urdu / Hindi / Tamil / Kannada / Odia) ──────
  {
    code: "LANG1",
    name: "Language I (Telugu / Urdu / Hindi / Tamil / Kannada / Odia)",
    weight: 1,
    topics: [
      { code: "aptet.lang1.telugu", name: "Telugu", description: "Telugu grammar (vyakaranam), literature, comprehension and pedagogy of Telugu language." },
      { code: "aptet.lang1.urdu", name: "Urdu", description: "Urdu grammar, vocabulary, classical and modern literature, and Urdu pedagogy." },
      { code: "aptet.lang1.hindi", name: "Hindi", description: "Hindi grammar (vyakaran), literature, comprehension and pedagogy of Hindi." },
      { code: "aptet.lang1.tamil", name: "Tamil", description: "Tamil grammar (ilakkanam), classical literature, comprehension and pedagogy of Tamil." },
      { code: "aptet.lang1.kannada", name: "Kannada", description: "Kannada grammar (vyakarana), literature, comprehension and pedagogy of Kannada." },
      { code: "aptet.lang1.odia", name: "Odia", description: "Odia grammar (vyakarana), literature, comprehension and pedagogy of Odia." },
      { code: "aptet.lang1.comprehension", name: "Reading Comprehension", description: "Unseen prose and poem passages in chosen Language I with comprehension and inference." },
      { code: "aptet.lang1.grammar", name: "Grammar and Vocabulary", description: "Grammatical rules, vocabulary, idioms and synonyms/antonyms in chosen language." },
      { code: "aptet.lang1.pedagogy", name: "Pedagogy of Language I",
        description: "Methods of teaching the chosen Language I.",
        subtopics: [
          { code: "aptet.lang1.pedagogy.acquisition", name: "Language Acquisition vs Learning", description: "Krashen's principles and natural acquisition of mother tongue." },
          { code: "aptet.lang1.pedagogy.principles", name: "Principles of Language Teaching", description: "Key principles guiding primary-level language instruction." },
          { code: "aptet.lang1.pedagogy.skills", name: "LSRW Skills", description: "Listening, speaking, reading and writing in classrooms." },
          { code: "aptet.lang1.pedagogy.diverse", name: "Teaching in Diverse Classrooms", description: "Multilingual classrooms, language errors and disorders." },
          { code: "aptet.lang1.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbooks, multimedia and multilingual resources." },
          { code: "aptet.lang1.pedagogy.evaluation", name: "Evaluation of Language Proficiency", description: "Speaking, listening, reading and writing assessment." },
          { code: "aptet.lang1.pedagogy.remedial", name: "Remedial Teaching", description: "Identifying and addressing language-learning gaps." },
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
      { code: "aptet.eng.comprehension", name: "Reading Comprehension", description: "Two unseen prose passages with comprehension and inference questions." },
      { code: "aptet.eng.grammar", name: "English Grammar",
        description: "Grammar rules used in English communication.",
        subtopics: [
          { code: "aptet.eng.grammar.tenses", name: "Tenses", description: "Simple, continuous, perfect and perfect continuous tenses." },
          { code: "aptet.eng.grammar.parts_speech", name: "Parts of Speech", description: "Nouns, pronouns, verbs, adjectives, adverbs, prepositions and conjunctions." },
          { code: "aptet.eng.grammar.voice", name: "Voice and Reported Speech", description: "Active/passive voice and direct/indirect speech." },
          { code: "aptet.eng.grammar.sentence", name: "Sentence Structure", description: "Subject-verb agreement, types of sentences and clause analysis." },
        ],
      },
      { code: "aptet.eng.vocabulary", name: "Vocabulary", description: "Synonyms, antonyms and one-word substitution." },
      { code: "aptet.eng.phonology", name: "Phonology", description: "Phonemes, syllables, stress, intonation and pronunciation." },
      { code: "aptet.eng.pedagogy", name: "Pedagogy of English",
        description: "Approaches and methods of teaching English at primary stage.",
        subtopics: [
          { code: "aptet.eng.pedagogy.principles", name: "Principles of English Teaching", description: "Communicative, structural-situational and direct methods." },
          { code: "aptet.eng.pedagogy.skills", name: "LSRW Skills in English", description: "Listening, speaking, reading and writing in English classrooms." },
          { code: "aptet.eng.pedagogy.diverse", name: "Teaching in Diverse Classrooms", description: "Strategies for multilingual English classrooms." },
          { code: "aptet.eng.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbooks, audio-visual aids, dictionaries and digital resources." },
          { code: "aptet.eng.pedagogy.assessment", name: "Evaluating Language Proficiency", description: "Speaking, listening, reading and writing assessment in English." },
          { code: "aptet.eng.pedagogy.remedial", name: "Remedial Teaching", description: "Remedial strategies for English language gaps." },
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
      { code: "aptet.math.numbers", name: "Numbers", description: "Whole numbers, integers, place value, divisibility, HCF and LCM." },
      { code: "aptet.math.fractions", name: "Fractions and Decimals", description: "Operations on fractions and decimals and their conversions." },
      { code: "aptet.math.arithmetic", name: "Arithmetic", description: "Percentage, ratio-proportion, profit-loss and interest." },
      { code: "aptet.math.algebra", name: "Algebra", description: "Variables, expressions, linear equations and identities." },
      { code: "aptet.math.geometry", name: "Geometry", description: "Lines, angles, triangles, circles, polygons and properties." },
      { code: "aptet.math.mensuration", name: "Mensuration", description: "Area, perimeter, surface area and volume of standard figures." },
      { code: "aptet.math.data_handling", name: "Data Handling", description: "Tables, bar graphs, pictographs, mean, median and mode." },
      { code: "aptet.math.measurement", name: "Measurement", description: "Length, weight, capacity, time and money." },
      { code: "aptet.math.pedagogy", name: "Pedagogy of Mathematics",
        description: "Methods of teaching mathematics in classrooms.",
        subtopics: [
          { code: "aptet.math.pedagogy.nature", name: "Nature of Mathematics", description: "Math as logical and exact science and place in curriculum." },
          { code: "aptet.math.pedagogy.aims", name: "Aims and Objectives", description: "Aims of teaching mathematics at primary stage." },
          { code: "aptet.math.pedagogy.methods", name: "Methods of Teaching", description: "Activity-based, problem-solving and inductive-deductive methods." },
          { code: "aptet.math.pedagogy.evaluation", name: "Evaluation in Math", description: "Diagnostic, formative and summative assessment." },
          { code: "aptet.math.pedagogy.remedial", name: "Remedial Teaching", description: "Identifying common errors and remediation strategies." },
        ],
      },
    ],
  },

  // ── EVS (Paper I) ─────────────────────────────────────────────────────
  {
    code: "EVS",
    name: "Environmental Studies (Paper I)",
    weight: 1,
    topics: [
      { code: "aptet.evs.living_world", name: "Living World", description: "Plants, animals, classification, life processes and biodiversity." },
      { code: "aptet.evs.life_processes", name: "Life Processes", description: "Nutrition, respiration, transportation, excretion and reproduction." },
      { code: "aptet.evs.natural_phenomena", name: "Natural Phenomena", description: "Light, sound, force, electricity and magnetism in everyday life." },
      { code: "aptet.evs.environment", name: "Our Environment", description: "Ecosystems, biodiversity, pollution, conservation and natural resources." },
      { code: "aptet.evs.transport_communication", name: "Transportation and Communication", description: "Modes of transport, postal system, telecom and digital media." },
      { code: "aptet.evs.professions_services", name: "Professions and Services", description: "Various professions, public services and community roles." },
      { code: "aptet.evs.food_shelter", name: "Food and Shelter", description: "Food sources, balanced diet, types of shelter and building materials." },
      { code: "aptet.evs.water", name: "Water", description: "Sources, conservation, water cycle and water-borne diseases." },
      { code: "aptet.evs.ap_specific", name: "Andhra Pradesh Environment", description: "AP's natural features, rivers, forests, sanctuaries and biodiversity." },
      { code: "aptet.evs.pedagogy", name: "Pedagogy of EVS",
        description: "Methods of teaching environmental studies.",
        subtopics: [
          { code: "aptet.evs.pedagogy.concept", name: "Concept and Scope of EVS", description: "Nature, scope and integrated character of EVS." },
          { code: "aptet.evs.pedagogy.activities", name: "Activities and Experimentation", description: "Hands-on activities, experiments and field visits." },
          { code: "aptet.evs.pedagogy.cce", name: "CCE in EVS", description: "Continuous and comprehensive evaluation in EVS." },
          { code: "aptet.evs.pedagogy.materials", name: "Teaching Materials", description: "Charts, models, multimedia and field-based resources." },
          { code: "aptet.evs.pedagogy.problems", name: "Problems of Teaching EVS", description: "Difficulties and remedial strategies in EVS teaching." },
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
      { code: "aptet.ms.algebra", name: "Algebra", description: "Polynomials, equations, exponents and algebraic identities." },
      { code: "aptet.ms.geometry", name: "Geometry", description: "Triangles, quadrilaterals, circles, coordinate geometry and basic trigonometry." },
      { code: "aptet.ms.mensuration", name: "Mensuration", description: "Area, surface area and volume of 2D and 3D figures." },
      { code: "aptet.ms.statistics", name: "Statistics", description: "Mean, median, mode, range and basic data interpretation." },
      { code: "aptet.ms.physics", name: "Physics",
        description: "Physics topics for upper primary.",
        subtopics: [
          { code: "aptet.ms.physics.mechanics", name: "Force, Motion and Work", description: "Force, friction, motion, simple machines and energy." },
          { code: "aptet.ms.physics.heat_light", name: "Heat and Light", description: "Temperature, heat transfer, reflection, refraction and lenses." },
          { code: "aptet.ms.physics.electricity", name: "Electricity and Magnetism", description: "Current, circuits, magnets and electromagnetic basics." },
          { code: "aptet.ms.physics.sound", name: "Sound", description: "Production, propagation and properties of sound." },
        ],
      },
      { code: "aptet.ms.chemistry", name: "Chemistry",
        description: "Chemistry topics for classes 6-8.",
        subtopics: [
          { code: "aptet.ms.chemistry.matter", name: "Matter and Its Nature", description: "States of matter, mixtures, solutions and separation techniques." },
          { code: "aptet.ms.chemistry.elements", name: "Elements, Compounds and Reactions", description: "Atoms, molecules, periodic table and chemical reactions." },
          { code: "aptet.ms.chemistry.acids_bases", name: "Acids, Bases and Salts", description: "Common acids/bases, indicators, salts and uses." },
        ],
      },
      { code: "aptet.ms.biology", name: "Biology",
        description: "Life processes, plants, animals and ecology.",
        subtopics: [
          { code: "aptet.ms.biology.plants", name: "World of Plants", description: "Plant structure, photosynthesis, reproduction and classification." },
          { code: "aptet.ms.biology.animals", name: "World of Animals", description: "Animal classification, habitats and adaptations." },
          { code: "aptet.ms.biology.human", name: "Human Body and Health", description: "Organ systems, nutrition, diseases and hygiene." },
          { code: "aptet.ms.biology.environment", name: "Environment and Ecology", description: "Ecosystems, biodiversity, pollution and conservation." },
        ],
      },
      { code: "aptet.ms.pedagogy", name: "Pedagogy of Math and Science",
        description: "Methods of teaching math and science.",
        subtopics: [
          { code: "aptet.ms.pedagogy.nature", name: "Nature and Aims", description: "Nature of math/science and aims of teaching." },
          { code: "aptet.ms.pedagogy.methods", name: "Methods of Teaching", description: "Activity-based, experimental, project and inquiry methods." },
          { code: "aptet.ms.pedagogy.lab", name: "Laboratory and Practical Work", description: "Practical work, lab safety and equipment." },
          { code: "aptet.ms.pedagogy.evaluation", name: "Evaluation", description: "Formative and summative evaluation in math/science." },
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
      { code: "aptet.ss.history", name: "History",
        description: "Indian and world history for classes 6-8.",
        subtopics: [
          { code: "aptet.ss.history.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Mauryas, Guptas and southern dynasties." },
          { code: "aptet.ss.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals, Marathas and Bhakti-Sufi movements." },
          { code: "aptet.ss.history.modern", name: "Modern India and Freedom Struggle", description: "British rule, INC, Gandhian movement and partition." },
          { code: "aptet.ss.history.ap", name: "History of Andhra Pradesh", description: "Satavahanas, Eastern Chalukyas, Vijayanagara and modern AP." },
          { code: "aptet.ss.history.world", name: "World History", description: "French Revolution, Industrial Revolution and World Wars." },
        ],
      },
      { code: "aptet.ss.geography", name: "Geography",
        description: "Physical, human and economic geography.",
        subtopics: [
          { code: "aptet.ss.geography.earth", name: "The Earth", description: "Solar system, latitudes, longitudes and earth's movements." },
          { code: "aptet.ss.geography.physical", name: "Physical Geography", description: "Landforms, atmosphere, hydrosphere and biosphere." },
          { code: "aptet.ss.geography.india", name: "Geography of India", description: "Physical features, climate, rivers and natural resources." },
          { code: "aptet.ss.geography.ap", name: "Geography of Andhra Pradesh", description: "Districts, rivers (Krishna, Godavari), coastline and resources." },
          { code: "aptet.ss.geography.maps", name: "Maps and Map Reading", description: "Types of maps, scales, symbols and projections." },
        ],
      },
      { code: "aptet.ss.civics", name: "Civics",
        description: "Indian Constitution and democratic institutions.",
        subtopics: [
          { code: "aptet.ss.civics.constitution", name: "Indian Constitution", description: "Preamble, fundamental rights, duties and DPSPs." },
          { code: "aptet.ss.civics.government", name: "Union and State Government", description: "President, PM, Parliament, Governor and CM." },
          { code: "aptet.ss.civics.local", name: "Local Self-Government", description: "Panchayati Raj, urban local bodies and 73rd/74th Amendments." },
        ],
      },
      { code: "aptet.ss.economics", name: "Economics",
        description: "Basic economic concepts at upper primary level.",
        subtopics: [
          { code: "aptet.ss.economics.basics", name: "Basic Concepts", description: "Wants, needs, scarcity, production, consumption." },
          { code: "aptet.ss.economics.indian_economy", name: "Indian Economy", description: "Sectors, planning, banking and economic challenges." },
        ],
      },
      { code: "aptet.ss.pedagogy", name: "Pedagogy of Social Studies",
        description: "Methods of teaching social studies.",
        subtopics: [
          { code: "aptet.ss.pedagogy.nature", name: "Nature and Scope", description: "Nature, scope and integrated character of social studies." },
          { code: "aptet.ss.pedagogy.methods", name: "Methods of Teaching", description: "Story-telling, dramatisation, project and field-based methods." },
          { code: "aptet.ss.pedagogy.materials", name: "Teaching Materials", description: "Maps, charts, time-lines, models and digital resources." },
          { code: "aptet.ss.pedagogy.evaluation", name: "Evaluation", description: "Formative and summative evaluation strategies." },
        ],
      },
    ],
  },
];

export async function seedApTetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "AP_TET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — AP_TET exam not found.");
  }
  console.log(`Seeding AP TET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < apTetSyllabus.length; sIdx++) {
    const s = apTetSyllabus[sIdx];
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
  seedApTetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
