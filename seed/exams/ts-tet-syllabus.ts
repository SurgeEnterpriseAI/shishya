// TS TET / TG TET (Telangana Teacher Eligibility Test) — full syllabus tree.
// Conducted by School Education Department, Telangana via TGTET portal.
// Two papers, each 150 MCQs × 1 mark = 150 marks in 2.5 hours. No negative marking.
// Paper I: Classes 1-5 (CDP, Lang I, Lang II, Math, EVS).
// Paper II: Classes 6-8 (CDP, Lang I, Lang II + Math&Sci OR Social Studies).
// Lang I (Paper I): Telugu, Urdu, Hindi, Bengali, Kannada, Marathi, Tamil, Gujarati.
// Lang II: English (mandatory).
// Source: tgtet.cgg.gov.in / tgtet.aptonline.in official syllabus,
// cross-checked with adda247 / careerpower / shiksha coverage.
//
// Run after seedExams: npx tsx seed/exams/ts-tet-syllabus.ts

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

export const tsTetSyllabus: SubjectSeed[] = [
  // ── CHILD DEVELOPMENT & PEDAGOGY ──────────────────────────────────────
  {
    code: "CDP",
    name: "Child Development and Pedagogy",
    weight: 1,
    topics: [
      { code: "tstet.cdp.development", name: "Stages of Child Development",
        description: "Concept and principles of child growth and development.",
        subtopics: [
          { code: "tstet.cdp.development.concept", name: "Concept of Growth and Development", description: "Definition, distinction between growth and development and their relationship with learning." },
          { code: "tstet.cdp.development.principles", name: "Principles of Development", description: "Continuity, sequence, individual differences and integration." },
          { code: "tstet.cdp.development.heredity", name: "Heredity and Environment", description: "Influence of heredity and environment on child development." },
          { code: "tstet.cdp.development.dimensions", name: "Dimensions of Development", description: "Physical, cognitive, emotional, social, language and moral development." },
          { code: "tstet.cdp.development.adolescence", name: "Adolescence (Paper II)", description: "Physical and emotional changes during adolescence (11-14)." },
        ],
      },
      { code: "tstet.cdp.learning_theories", name: "Theories of Learning",
        description: "Major theories of learning and classroom implications.",
        subtopics: [
          { code: "tstet.cdp.learning_theories.behaviourism", name: "Behaviourism", description: "Pavlov, Skinner and Thorndike — conditioning and connectionism." },
          { code: "tstet.cdp.learning_theories.gestalt", name: "Gestalt and Insight Learning", description: "Perception, problem-solving and insight learning." },
          { code: "tstet.cdp.learning_theories.piaget", name: "Piaget — Cognitive Development", description: "Stages of cognitive development and schema theory." },
          { code: "tstet.cdp.learning_theories.vygotsky", name: "Vygotsky — Socio-cultural Theory", description: "Zone of Proximal Development and scaffolding." },
          { code: "tstet.cdp.learning_theories.bruner", name: "Bruner — Discovery Learning", description: "Modes of representation and spiral curriculum." },
          { code: "tstet.cdp.learning_theories.kohlberg", name: "Kohlberg — Moral Development", description: "Stages of moral reasoning." },
          { code: "tstet.cdp.learning_theories.constructivism", name: "Constructivism", description: "Knowledge construction by learners through experience." },
        ],
      },
      { code: "tstet.cdp.intelligence", name: "Intelligence and Creativity",
        description: "Theories of intelligence and creativity.",
        subtopics: [
          { code: "tstet.cdp.intelligence.theories", name: "Theories of Intelligence", description: "Spearman, Thurstone, Gardner — multi-dimensional intelligence." },
          { code: "tstet.cdp.intelligence.iq", name: "Measurement of Intelligence", description: "IQ, intelligence tests and educational implications." },
          { code: "tstet.cdp.intelligence.creativity", name: "Creativity", description: "Concept and identification of creativity in learners." },
        ],
      },
      { code: "tstet.cdp.individual_differences", name: "Individual Differences and Personality",
        description: "Differences among learners and personality.",
        subtopics: [
          { code: "tstet.cdp.individual_differences.basis", name: "Basis of Differences", description: "Differences based on language, caste, gender, community and ability." },
          { code: "tstet.cdp.individual_differences.gender", name: "Gender as a Social Construct", description: "Gender roles, gender bias and educational practice." },
          { code: "tstet.cdp.individual_differences.personality", name: "Personality", description: "Type, trait and self-theories of personality." },
        ],
      },
      { code: "tstet.cdp.inclusive_education", name: "Inclusive Education and Special Needs",
        description: "Diverse learners and inclusive classrooms.",
        subtopics: [
          { code: "tstet.cdp.inclusive_education.disadvantaged", name: "Disadvantaged Learners", description: "SC/ST/minority/migrant children and educational equity." },
          { code: "tstet.cdp.inclusive_education.disabilities", name: "Children with Learning Difficulties", description: "Dyslexia, dysgraphia, dyscalculia, ADHD." },
          { code: "tstet.cdp.inclusive_education.gifted", name: "Gifted and Talented Children", description: "Identification and differentiated strategies for gifted learners." },
          { code: "tstet.cdp.inclusive_education.rte", name: "Right to Education Act 2009", description: "RTE provisions and inclusive education mandate." },
        ],
      },
      { code: "tstet.cdp.learning_pedagogy", name: "Learning and Pedagogy",
        description: "How children learn and pedagogical approaches.",
        subtopics: [
          { code: "tstet.cdp.learning_pedagogy.how", name: "How Children Think and Learn", description: "Children as active constructors of knowledge." },
          { code: "tstet.cdp.learning_pedagogy.motivation", name: "Motivation and Group Dynamics", description: "Intrinsic/extrinsic motivation and group dynamics." },
          { code: "tstet.cdp.learning_pedagogy.methods", name: "Teaching Methods", description: "Activity-based, project, child-centred and progressive approaches." },
          { code: "tstet.cdp.learning_pedagogy.classroom_mgmt", name: "Classroom Management", description: "Discipline, leadership and managing diverse classrooms." },
        ],
      },
      { code: "tstet.cdp.assessment", name: "Assessment and Evaluation",
        description: "Assessment for and of learning.",
        subtopics: [
          { code: "tstet.cdp.assessment.types", name: "Formative and Summative Assessment", description: "Distinction between assessment for and of learning." },
          { code: "tstet.cdp.assessment.cce", name: "Continuous Comprehensive Evaluation", description: "CCE perspective, practice and tools." },
          { code: "tstet.cdp.assessment.tools", name: "Assessment Tools", description: "Tests, observation, portfolios, rubrics and questioning." },
        ],
      },
    ],
  },

  // ── LANGUAGE I (Telugu / Urdu / Hindi / Bengali / Kannada / Marathi / Tamil / Gujarati) ──
  {
    code: "LANG1",
    name: "Language I (Telugu / Urdu / Hindi / Bengali / Kannada / Marathi / Tamil / Gujarati)",
    weight: 1,
    topics: [
      { code: "tstet.lang1.telugu", name: "Telugu", description: "Telugu grammar (vyakaranam), literature, comprehension and pedagogy." },
      { code: "tstet.lang1.urdu", name: "Urdu", description: "Urdu grammar, vocabulary, classical and modern literature, and Urdu pedagogy." },
      { code: "tstet.lang1.hindi", name: "Hindi", description: "Hindi grammar (vyakaran), literature, comprehension and pedagogy." },
      { code: "tstet.lang1.bengali", name: "Bengali", description: "Bengali grammar (byakaran), literature, comprehension and pedagogy." },
      { code: "tstet.lang1.kannada", name: "Kannada", description: "Kannada grammar (vyakarana), literature, comprehension and pedagogy." },
      { code: "tstet.lang1.marathi", name: "Marathi", description: "Marathi grammar (vyakaran), literature, comprehension and pedagogy." },
      { code: "tstet.lang1.tamil", name: "Tamil", description: "Tamil grammar (ilakkanam), classical literature, comprehension and pedagogy." },
      { code: "tstet.lang1.gujarati", name: "Gujarati", description: "Gujarati grammar (vyakaran), literature, comprehension and pedagogy." },
      { code: "tstet.lang1.comprehension", name: "Reading Comprehension", description: "Unseen prose and poem passages in the chosen Language I." },
      { code: "tstet.lang1.grammar_vocab", name: "Grammar and Vocabulary", description: "Grammar rules, vocabulary, idioms and synonyms/antonyms in the chosen language." },
      { code: "tstet.lang1.pedagogy", name: "Pedagogy of Language I",
        description: "Methods of teaching the chosen Language I.",
        subtopics: [
          { code: "tstet.lang1.pedagogy.acquisition", name: "Language Acquisition vs Learning", description: "Krashen's principles and natural acquisition of mother tongue." },
          { code: "tstet.lang1.pedagogy.principles", name: "Principles of Language Teaching", description: "Key principles guiding primary-level language instruction." },
          { code: "tstet.lang1.pedagogy.skills", name: "LSRW Skills", description: "Listening, speaking, reading and writing in classrooms." },
          { code: "tstet.lang1.pedagogy.diverse", name: "Teaching in Diverse Classrooms", description: "Multilingual classrooms, language errors and disorders." },
          { code: "tstet.lang1.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbooks, multimedia and multilingual resources." },
          { code: "tstet.lang1.pedagogy.evaluation", name: "Evaluation of Language Proficiency", description: "Speaking, listening, reading and writing assessment." },
          { code: "tstet.lang1.pedagogy.remedial", name: "Remedial Teaching", description: "Identifying and addressing language-learning gaps." },
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
      { code: "tstet.eng.comprehension", name: "Reading Comprehension", description: "Two unseen prose passages with comprehension and inference questions." },
      { code: "tstet.eng.grammar", name: "English Grammar",
        description: "Grammar rules used in English communication.",
        subtopics: [
          { code: "tstet.eng.grammar.tenses", name: "Tenses", description: "Simple, continuous, perfect and perfect continuous tenses." },
          { code: "tstet.eng.grammar.parts_speech", name: "Parts of Speech", description: "Nouns, pronouns, verbs, adjectives, adverbs, prepositions and conjunctions." },
          { code: "tstet.eng.grammar.voice", name: "Voice and Reported Speech", description: "Active/passive voice and direct/indirect speech." },
          { code: "tstet.eng.grammar.sentence", name: "Sentence Structure", description: "Subject-verb agreement, types of sentences and clause analysis." },
        ],
      },
      { code: "tstet.eng.vocabulary", name: "Vocabulary", description: "Synonyms, antonyms and one-word substitution." },
      { code: "tstet.eng.creative_writing", name: "Creative Writing", description: "Composition, paragraph writing, letter writing and basic creative writing skills." },
      { code: "tstet.eng.spoken", name: "Basic Spoken English", description: "Pronunciation, conversation skills and oral communication." },
      { code: "tstet.eng.pedagogy", name: "Pedagogy of English",
        description: "Approaches and methods of teaching English at primary stage.",
        subtopics: [
          { code: "tstet.eng.pedagogy.principles", name: "Principles of English Teaching", description: "Communicative, structural-situational and direct methods." },
          { code: "tstet.eng.pedagogy.skills", name: "LSRW Skills in English", description: "Listening, speaking, reading and writing in English classrooms." },
          { code: "tstet.eng.pedagogy.diverse", name: "Teaching in Diverse Classrooms", description: "Strategies for multilingual English classrooms." },
          { code: "tstet.eng.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbooks, audio-visual aids, dictionaries and digital resources." },
          { code: "tstet.eng.pedagogy.assessment", name: "Evaluating Language Proficiency", description: "Speaking, listening, reading and writing assessment in English." },
          { code: "tstet.eng.pedagogy.remedial", name: "Remedial Teaching", description: "Remedial strategies for English language gaps." },
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
      { code: "tstet.math.numbers", name: "Number System", description: "Whole numbers, integers, place value, divisibility, HCF and LCM." },
      { code: "tstet.math.fractions", name: "Fractions and Decimals", description: "Operations on fractions and decimals and their conversions." },
      { code: "tstet.math.arithmetic", name: "Arithmetic", description: "Percentage, ratio-proportion, profit-loss and interest." },
      { code: "tstet.math.algebra", name: "Algebra", description: "Variables, expressions, linear equations and identities." },
      { code: "tstet.math.geometry", name: "Geometry", description: "Lines, angles, triangles, circles, polygons and properties." },
      { code: "tstet.math.mensuration", name: "Mensuration", description: "Area, perimeter, surface area and volume of standard figures." },
      { code: "tstet.math.statistics", name: "Statistics", description: "Mean, median, mode, range and basic data interpretation." },
      { code: "tstet.math.measurement", name: "Measurement", description: "Length, weight, capacity, time and money." },
      { code: "tstet.math.problem_solving", name: "Problem Solving", description: "Strategies for solving math word problems." },
      { code: "tstet.math.pedagogy", name: "Pedagogy of Mathematics",
        description: "Methods of teaching mathematics in classrooms.",
        subtopics: [
          { code: "tstet.math.pedagogy.nature", name: "Nature of Mathematics", description: "Math as a logical and exact science and place in curriculum." },
          { code: "tstet.math.pedagogy.aims", name: "Aims and Objectives", description: "Aims of teaching mathematics at primary stage." },
          { code: "tstet.math.pedagogy.methods", name: "Methods of Teaching", description: "Activity-based, problem-solving and inductive-deductive methods." },
          { code: "tstet.math.pedagogy.evaluation", name: "Evaluation in Math", description: "Diagnostic, formative and summative assessment." },
          { code: "tstet.math.pedagogy.remedial", name: "Remedial Teaching", description: "Identifying common errors and remediation strategies." },
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
      { code: "tstet.evs.ecosystems", name: "Ecosystems", description: "Components of ecosystems, food chains and biodiversity." },
      { code: "tstet.evs.pollution", name: "Pollution", description: "Air, water, soil and noise pollution — causes, effects and control." },
      { code: "tstet.evs.conservation", name: "Conservation", description: "Conservation of forests, wildlife, water and natural resources." },
      { code: "tstet.evs.natural_resources", name: "Natural Resources", description: "Renewable and non-renewable resources and their sustainable use." },
      { code: "tstet.evs.disaster_mgmt", name: "Disaster Management", description: "Floods, droughts, earthquakes, cyclones and disaster preparedness." },
      { code: "tstet.evs.sustainable_development", name: "Sustainable Development", description: "SDGs, sustainable practices and green energy." },
      { code: "tstet.evs.living_world", name: "Living World", description: "Plants, animals, classification, life processes and biodiversity." },
      { code: "tstet.evs.human_body", name: "Human Body and Health", description: "Organ systems, nutrition, common diseases and hygiene." },
      { code: "tstet.evs.ts_specific", name: "Telangana Environment", description: "TS's natural features, rivers, forests, sanctuaries and biodiversity." },
      { code: "tstet.evs.pedagogy", name: "Pedagogy of EVS",
        description: "Methods of teaching environmental studies.",
        subtopics: [
          { code: "tstet.evs.pedagogy.concept", name: "Concept and Scope of EVS", description: "Nature, scope and integrated character of EVS." },
          { code: "tstet.evs.pedagogy.activities", name: "Activities and Experimentation", description: "Hands-on activities, experiments and field visits." },
          { code: "tstet.evs.pedagogy.cce", name: "CCE in EVS", description: "Continuous and comprehensive evaluation in EVS." },
          { code: "tstet.evs.pedagogy.materials", name: "Teaching Materials", description: "Charts, models, multimedia and field-based resources." },
          { code: "tstet.evs.pedagogy.problems", name: "Problems of Teaching EVS", description: "Difficulties and remedial strategies in EVS teaching." },
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
      { code: "tstet.ms.algebra", name: "Algebra", description: "Polynomials, equations, exponents and algebraic identities." },
      { code: "tstet.ms.geometry", name: "Geometry", description: "Triangles, quadrilaterals, circles, coordinate geometry and basic trigonometry." },
      { code: "tstet.ms.mensuration", name: "Mensuration", description: "Area, surface area and volume of 2D and 3D figures." },
      { code: "tstet.ms.statistics", name: "Statistics", description: "Mean, median, mode, range and basic data interpretation." },
      { code: "tstet.ms.physics", name: "Physics — Physical Component",
        description: "Physics topics for upper primary.",
        subtopics: [
          { code: "tstet.ms.physics.mechanics", name: "Force and Motion", description: "Force, friction, motion, simple machines and energy." },
          { code: "tstet.ms.physics.heat_light", name: "Heat and Light", description: "Temperature, heat transfer, reflection, refraction and lenses." },
          { code: "tstet.ms.physics.electricity", name: "Electricity and Magnetism", description: "Current, circuits, magnets and electromagnetic basics." },
          { code: "tstet.ms.physics.sound", name: "Sound", description: "Production, propagation and properties of sound." },
        ],
      },
      { code: "tstet.ms.chemistry", name: "Chemistry — Physical Component",
        description: "Chemistry topics for classes 6-8.",
        subtopics: [
          { code: "tstet.ms.chemistry.matter", name: "Matter and Its Nature", description: "States of matter, mixtures, solutions and separation techniques." },
          { code: "tstet.ms.chemistry.elements", name: "Elements, Compounds and Reactions", description: "Atoms, molecules, periodic table and chemical reactions." },
          { code: "tstet.ms.chemistry.acids_bases", name: "Acids, Bases and Salts", description: "Common acids/bases, indicators, salts and uses." },
        ],
      },
      { code: "tstet.ms.biology", name: "Biology — Biological Component",
        description: "Life processes, plants, animals and ecology.",
        subtopics: [
          { code: "tstet.ms.biology.plants", name: "World of Plants", description: "Plant structure, photosynthesis, reproduction and classification." },
          { code: "tstet.ms.biology.animals", name: "World of Animals", description: "Animal classification, habitats and adaptations." },
          { code: "tstet.ms.biology.human", name: "Human Body and Health", description: "Organ systems, nutrition, diseases and hygiene." },
          { code: "tstet.ms.biology.environment", name: "Environment and Ecology", description: "Ecosystems, biodiversity, pollution and conservation." },
        ],
      },
      { code: "tstet.ms.pedagogy", name: "Pedagogy of Math and Science",
        description: "Methods of teaching math and science.",
        subtopics: [
          { code: "tstet.ms.pedagogy.nature", name: "Nature and Aims", description: "Nature of math/science and aims of teaching." },
          { code: "tstet.ms.pedagogy.methods", name: "Methods of Teaching", description: "Activity-based, experimental, project and inquiry methods." },
          { code: "tstet.ms.pedagogy.lab", name: "Laboratory and Practical Work", description: "Practical work, lab safety and equipment." },
          { code: "tstet.ms.pedagogy.evaluation", name: "Evaluation", description: "Formative and summative evaluation in math/science." },
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
      { code: "tstet.ss.history", name: "History",
        description: "Indian and world history for classes 6-8.",
        subtopics: [
          { code: "tstet.ss.history.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Mauryas, Guptas and southern dynasties." },
          { code: "tstet.ss.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals, Marathas and Bhakti-Sufi movements." },
          { code: "tstet.ss.history.modern", name: "Modern India and Freedom Struggle", description: "British rule, INC, Gandhian movement and partition." },
          { code: "tstet.ss.history.ts", name: "History of Telangana", description: "Satavahanas, Kakatiyas, Qutb Shahis, Asaf Jahis and Telangana movement." },
          { code: "tstet.ss.history.world", name: "World History", description: "French Revolution, Industrial Revolution and World Wars." },
        ],
      },
      { code: "tstet.ss.geography", name: "Geography",
        description: "Physical, human and economic geography.",
        subtopics: [
          { code: "tstet.ss.geography.earth", name: "The Earth", description: "Solar system, latitudes, longitudes and earth's movements." },
          { code: "tstet.ss.geography.physical", name: "Physical Geography", description: "Landforms, atmosphere, hydrosphere and biosphere." },
          { code: "tstet.ss.geography.india", name: "Geography of India", description: "Physical features, climate, rivers and natural resources." },
          { code: "tstet.ss.geography.ts", name: "Geography of Telangana", description: "Districts, rivers (Godavari, Krishna), climate and resources." },
          { code: "tstet.ss.geography.maps", name: "Maps and Map Reading", description: "Types of maps, scales, symbols and projections." },
        ],
      },
      { code: "tstet.ss.civics", name: "Civics",
        description: "Indian Constitution and democratic institutions.",
        subtopics: [
          { code: "tstet.ss.civics.constitution", name: "Indian Constitution", description: "Preamble, fundamental rights, duties and DPSPs." },
          { code: "tstet.ss.civics.government", name: "Union and State Government", description: "President, PM, Parliament, Governor and CM." },
          { code: "tstet.ss.civics.local", name: "Local Self-Government", description: "Panchayati Raj, urban local bodies and 73rd/74th Amendments." },
        ],
      },
      { code: "tstet.ss.economics", name: "Economics",
        description: "Basic economic concepts at upper primary level.",
        subtopics: [
          { code: "tstet.ss.economics.basics", name: "Basic Concepts", description: "Wants, needs, scarcity, production and consumption." },
          { code: "tstet.ss.economics.indian_economy", name: "Indian Economy", description: "Sectors, planning, banking and economic challenges." },
        ],
      },
      { code: "tstet.ss.pedagogy", name: "Pedagogy of Social Studies",
        description: "Methods of teaching social studies.",
        subtopics: [
          { code: "tstet.ss.pedagogy.nature", name: "Nature and Scope", description: "Nature, scope and integrated character of social studies." },
          { code: "tstet.ss.pedagogy.methods", name: "Methods of Teaching", description: "Story-telling, dramatisation, project and field-based methods." },
          { code: "tstet.ss.pedagogy.materials", name: "Teaching Materials", description: "Maps, charts, time-lines, models and digital resources." },
          { code: "tstet.ss.pedagogy.evaluation", name: "Evaluation", description: "Formative and summative evaluation strategies." },
        ],
      },
    ],
  },
];

export async function seedTsTetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "TS_TET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — TS_TET exam not found.");
  }
  console.log(`Seeding TS TET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < tsTetSyllabus.length; sIdx++) {
    const s = tsTetSyllabus[sIdx];
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
  seedTsTetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
