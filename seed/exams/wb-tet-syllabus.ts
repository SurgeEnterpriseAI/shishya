// WB TET (West Bengal Teacher Eligibility Test) — full syllabus tree.
// Conducted by West Bengal Board of Primary Education (WBBPE).
// Two papers, each 150 MCQs × 1 mark = 150 marks in 150 minutes. No negative marking.
// Source: official WB TET notification & syllabus (wbbpe.org),
// cross-checked with NCTE TET framework. Covers Paper I (Class 1–5) and Paper II (Class 6–8).
// Languages on offer for Lang I/II: Bengali, English, Hindi, Urdu, Santali, Nepali, Telugu.
//
// Run after seedExams: npx tsx seed/exams/wb-tet-syllabus.ts

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

export const wbTetSyllabus: SubjectSeed[] = [
  // ── CHILD DEVELOPMENT & PEDAGOGY ──────────────────────────────────────
  {
    code: "CDP",
    name: "Child Development and Pedagogy",
    weight: 1,
    topics: [
      { code: "cdp.development_learning", name: "Child Development and Learning",
        description: "Concepts of development, principles and influences on the elementary school child.",
        subtopics: [
          { code: "cdp.development_learning.concept", name: "Concept of Development and Relationship with Learning", description: "Definition, principles and how development affects learning." },
          { code: "cdp.development_learning.principles", name: "Principles of Child Development", description: "Continuity, sequence, individual differences and integration." },
          { code: "cdp.development_learning.heredity_environment", name: "Influence of Heredity and Environment", description: "Nature vs nurture and the role of family/school/community." },
          { code: "cdp.development_learning.socialization", name: "Socialization Processes", description: "Role of teachers, parents and peers in socialization." },
          { code: "cdp.development_learning.piaget", name: "Piaget — Cognitive Constructs", description: "Stages of cognitive development and their educational implications." },
          { code: "cdp.development_learning.kohlberg", name: "Kohlberg — Moral Constructs", description: "Stages of moral development and classroom implications." },
          { code: "cdp.development_learning.vygotsky", name: "Vygotsky — Socio-cultural Theory", description: "ZPD, scaffolding and social mediation of learning." },
          { code: "cdp.development_learning.child_centred", name: "Child-Centred and Progressive Education", description: "Progressive education and child-centred pedagogy." },
        ],
      },
      { code: "cdp.intelligence_personality", name: "Intelligence, Personality and Differences",
        description: "Concepts of intelligence and individual differences among learners.",
        subtopics: [
          { code: "cdp.intelligence_personality.concept", name: "Critical Perspective on Intelligence", description: "Single vs multi-dimensional intelligence; IQ critique." },
          { code: "cdp.intelligence_personality.gardner", name: "Multi-Dimensional Intelligence", description: "Gardner's theory of multiple intelligences." },
          { code: "cdp.intelligence_personality.language_thought", name: "Language and Thought", description: "Relationship between language acquisition and cognitive growth." },
          { code: "cdp.intelligence_personality.gender", name: "Gender as a Social Construct", description: "Gender bias in education and gender roles." },
          { code: "cdp.intelligence_personality.individual_differences", name: "Individual Differences among Learners", description: "Diversity based on language, caste, gender, religion and ability." },
        ],
      },
      { code: "cdp.assessment", name: "Assessment and Evaluation",
        description: "Forms and methods of classroom assessment.",
        subtopics: [
          { code: "cdp.assessment.types", name: "Assessment for Learning vs Assessment of Learning", description: "Formative and summative assessment in schools." },
          { code: "cdp.assessment.cce", name: "School-Based Assessment and CCE", description: "Continuous comprehensive evaluation in West Bengal schools." },
          { code: "cdp.assessment.questioning", name: "Formulating Appropriate Questions", description: "Questions that promote learning, readiness and critical thinking." },
        ],
      },
      { code: "cdp.inclusive", name: "Inclusive Education and CWSN",
        description: "Addressing the needs of diverse and special learners.",
        subtopics: [
          { code: "cdp.inclusive.disadvantaged", name: "Learners from Disadvantaged Backgrounds", description: "SC/ST/OBC, minority, migrant and economically deprived learners." },
          { code: "cdp.inclusive.learning_difficulties", name: "Children with Learning Difficulties", description: "Dyslexia, dysgraphia, dyscalculia and ADHD." },
          { code: "cdp.inclusive.talented", name: "Talented and Specially-abled Learners", description: "Strategies for gifted and creative learners." },
        ],
      },
      { code: "cdp.learning_pedagogy", name: "Learning and Pedagogy",
        description: "Theories and practice of learning relevant to the elementary school.",
        subtopics: [
          { code: "cdp.learning_pedagogy.alternative", name: "Alternative Conceptions of Learning", description: "Errors as a step in the learning process." },
          { code: "cdp.learning_pedagogy.cognition_emotion", name: "Cognition and Emotion", description: "Role of emotion in learning and cognition." },
          { code: "cdp.learning_pedagogy.motivation", name: "Motivation in Learning", description: "Intrinsic, extrinsic motivation and theories." },
          { code: "cdp.learning_pedagogy.classroom", name: "Classroom Management", description: "Discipline, environment and classroom processes." },
          { code: "cdp.learning_pedagogy.rights", name: "Child Rights and Punishment", description: "Child rights and the implications of punishment." },
          { code: "cdp.learning_pedagogy.guidance", name: "Guidance and Counselling", description: "Educational, vocational and personal guidance." },
          { code: "cdp.learning_pedagogy.problem_solving", name: "Problem-Solving and Scientific Investigation", description: "Child as constructor of knowledge and investigator." },
          { code: "cdp.learning_pedagogy.social", name: "Learning as a Social Activity", description: "Social context of learning and collaborative work." },
          { code: "cdp.learning_pedagogy.error", name: "Error Analysis", description: "Significance of errors as a learning step." },
        ],
      },
    ],
  },

  // ── LANGUAGE I (Bengali) ──────────────────────────────────────────────
  {
    code: "LANG1",
    name: "Language I — Bengali",
    weight: 1,
    topics: [
      { code: "lang1.comprehension", name: "Apath Gadya / Padya", description: "Two unseen passages (prose, poem, narrative or scientific) with comprehension questions." },
      { code: "lang1.varna", name: "Varna and Dhwoni", description: "Bengali vowels, consonants, syllables and pronunciation." },
      { code: "lang1.shabd", name: "Shabd Gathan", description: "Word formation, tatsam, tadbhav, deshi and bideshi shabd." },
      { code: "lang1.sandhi", name: "Sandhi", description: "Swar sandhi, byanjan sandhi and bisarg sandhi in Bengali." },
      { code: "lang1.samas", name: "Samas", description: "Tatpurush, dvandva, dvigu, karmadharaya, bahubrihi and abyayibhab." },
      { code: "lang1.upsarg_pratyay", name: "Upsarg and Pratyay", description: "Prefixes and suffixes in Bengali word formation." },
      { code: "lang1.parts_of_speech", name: "Padaprakaran", description: "Bishesya, sarbanam, bisheshan, kriya, abyay etc." },
      { code: "lang1.gender_number_tense", name: "Ling, Bachan and Kal", description: "Gender, number, tense and case in Bengali." },
      { code: "lang1.sentence", name: "Bakya Rachna and Punctuation", description: "Sentence structure, types and punctuation in Bengali." },
      { code: "lang1.idioms", name: "Probad and Bagdhara", description: "Bengali idioms, phrases and proverbs." },
      { code: "lang1.synonyms_antonyms", name: "Samartthak and Bipoaritarthak Shabd", description: "Synonyms and antonyms in Bengali." },
      { code: "lang1.alankar", name: "Alankar and Ras", description: "Figures of speech and rasa in Bengali literature." },
      { code: "lang1.pedagogy", name: "Pedagogy of Bengali Language",
        description: "Pedagogy specific to Bengali at primary and upper-primary level.",
        subtopics: [
          { code: "lang1.pedagogy.lsrw", name: "LSRW Proficiency Evaluation", description: "Listening, speaking, reading and writing assessment." },
          { code: "lang1.pedagogy.materials", name: "Teaching Materials and Multilingual Resources", description: "Textbooks, audio-visual aids and ICT for Bengali." },
          { code: "lang1.pedagogy.remedial", name: "Remedial Teaching Strategies", description: "Diagnostic and remedial work in Bengali." },
          { code: "lang1.pedagogy.principles", name: "Language Principles and Communicative Approach", description: "Principles of language teaching and the communicative approach." },
          { code: "lang1.pedagogy.diverse", name: "Challenges in a Diverse Classroom", description: "Multilingual learners and language disorders." },
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
        description: "Two unseen passages (prose/poetry) with comprehension and grammar questions.",
        subtopics: [
          { code: "lang2.comprehension.prose", name: "Unseen Prose Passage", description: "Discursive, literary, narrative or scientific prose with comprehension questions." },
          { code: "lang2.comprehension.poem", name: "Unseen Poem", description: "Comprehension and literary-device questions from a poem." },
        ],
      },
      { code: "lang2.determiners", name: "Determiners", description: "Articles, quantifiers and other determiners in English." },
      { code: "lang2.subject_verb", name: "Subject-Verb Concord", description: "Concord rules for singular and plural subjects." },
      { code: "lang2.questions", name: "Question Formation", description: "Yes/No questions, WH-questions and tag questions." },
      { code: "lang2.prepositions", name: "Prepositions", description: "Prepositions of time, place and movement." },
      { code: "lang2.tenses", name: "Tenses", description: "Present, past, future — simple, continuous, perfect, perfect-continuous." },
      { code: "lang2.phrasal_verbs", name: "Phrasal Verbs", description: "Common phrasal verbs and their meanings." },
      { code: "lang2.gerund_participle", name: "Gerunds and Participles", description: "Use of gerunds and participles in sentences." },
      { code: "lang2.auxiliaries", name: "Auxiliary Verbs", description: "Primary and modal auxiliaries in English." },
      { code: "lang2.voice_narration", name: "Voice and Narration", description: "Active/passive voice and direct/indirect speech." },
      { code: "lang2.vocabulary", name: "Vocabulary", description: "Synonyms, antonyms, one-word substitutions and word-formation." },
      { code: "lang2.pedagogy", name: "Pedagogy of English Language",
        description: "Pedagogy of teaching English as a second language.",
        subtopics: [
          { code: "lang2.pedagogy.diverse", name: "Diverse Classrooms and Language Disorders", description: "Multilingual learners and language difficulties." },
          { code: "lang2.pedagogy.phonology", name: "Phonology — Vowels and Consonants", description: "English phonemes, vowel and consonant sounds." },
          { code: "lang2.pedagogy.lsrw", name: "LSRW Proficiency Evaluation", description: "Assessment of listening, speaking, reading and writing." },
          { code: "lang2.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbooks, multimedia and ICT for English." },
          { code: "lang2.pedagogy.special_needs", name: "Strategies for Special Needs Learners", description: "Inclusive English-language teaching." },
          { code: "lang2.pedagogy.remedial", name: "Remedial Teaching", description: "Diagnostic and remedial work in English." },
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
      { code: "math.geometry_shapes", name: "Geometry — Shapes and Spatial Understanding", description: "2D and 3D shapes, spatial relationships and basic geometry." },
      { code: "math.solids", name: "Solids — Surface Area and Volume", description: "Cube, cuboid, cylinder, sphere — surface area and volume basics." },
      { code: "math.perimeter_area", name: "Perimeter and Area", description: "Perimeter and area of plane figures (square, rectangle, triangle)." },
      { code: "math.measurement", name: "Measurement", description: "Length, weight, capacity, time and money in standard units." },
      { code: "math.numbers", name: "Numbers and Place Value", description: "Whole numbers, place value and Indian/international numeral systems." },
      { code: "math.arithmetic", name: "Arithmetic Operations", description: "Addition, subtraction, multiplication and division." },
      { code: "math.fractions", name: "Fractions", description: "Proper, improper, mixed fractions and decimal fractions." },
      { code: "math.data_handling", name: "Data Handling", description: "Pictograph, bar graph and simple data interpretation." },
      { code: "math.patterns", name: "Patterns", description: "Number, shape and growing patterns." },
      { code: "math.factors_multiples", name: "Factors and Multiples", description: "Prime/composite numbers, HCF and LCM." },
      { code: "math.pedagogy", name: "Pedagogical Issues in Mathematics",
        description: "Pedagogy specific to primary mathematics.",
        subtopics: [
          { code: "math.pedagogy.nature", name: "Nature and Language of Mathematics", description: "Mathematics as a science of patterns and its language." },
          { code: "math.pedagogy.methods", name: "Teaching Methods and Materials", description: "Activity, play-way, inductive and discovery methods." },
          { code: "math.pedagogy.evaluation", name: "Continuous Evaluation and Error Analysis", description: "Diagnostic, formative and summative evaluation." },
          { code: "math.pedagogy.diagnostic", name: "Diagnostic and Remedial Approaches", description: "Identifying and remediating mathematical errors." },
          { code: "math.pedagogy.curriculum", name: "Place of Mathematics in Curriculum", description: "Mathematics in the elementary school curriculum." },
          { code: "math.pedagogy.community", name: "Community Mathematics", description: "Linking mathematics with the child's environment." },
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
      { code: "evs.scope", name: "Concept and Scope of EVS", description: "Definition, scope and significance of environmental studies." },
      { code: "evs.health_hygiene", name: "Health and Hygiene", description: "Personal cleanliness, food, water and prevention of diseases." },
      { code: "evs.shelter_habitats", name: "Shelters and Habitats", description: "Houses for humans and habitats for animals." },
      { code: "evs.transportation", name: "Transportation", description: "Railways, waterways and airways — modes and importance." },
      { code: "evs.water_resources", name: "Water Resources and Pollution", description: "Sources, uses, conservation and water pollution." },
      { code: "evs.air_atmosphere", name: "Air and Atmosphere", description: "Composition, pollution and the greenhouse effect." },
      { code: "evs.soil", name: "Soil — Types, Erosion and Pollution", description: "Soil types, erosion, conservation and pollution." },
      { code: "evs.plants_animals", name: "Plants and Animals", description: "Plant parts, life processes and animal classification." },
      { code: "evs.our_environment", name: "Our Environment", description: "Components of environment and their interrelation." },
      { code: "evs.bengal_culture", name: "West Bengal — Land, People and Heritage", description: "Geography, culture, festivals and heritage of West Bengal." },
      { code: "evs.solar_system", name: "Solar System and Earth", description: "Solar system, earth's motions and basic geography." },
      { code: "evs.constitution_basics", name: "Constitution and Governance Basics", description: "Basic constitutional concepts and local self-government." },
      { code: "evs.pedagogy", name: "Pedagogy of EVS",
        description: "Pedagogy specific to environmental studies at primary level.",
        subtopics: [
          { code: "evs.pedagogy.significance", name: "Significance of EVS — Integrated Approach", description: "Integration of science and social science in EVS." },
          { code: "evs.pedagogy.principles", name: "Learning Principles and Activities", description: "Activity-based, experiential and discovery learning." },
          { code: "evs.pedagogy.scope_relations", name: "Scope and Relation to Science and Social Science", description: "EVS as a precursor to science and social science." },
          { code: "evs.pedagogy.cce", name: "CCE in EVS", description: "Continuous comprehensive evaluation in environmental studies." },
          { code: "evs.pedagogy.experiments", name: "Experimentation and Practical Work", description: "Experiments, projects and field work in EVS." },
          { code: "evs.pedagogy.materials", name: "Teaching Aids and Materials", description: "Charts, models, real objects and ICT resources." },
        ],
      },
    ],
  },

  // ── MATHEMATICS & SCIENCE (Paper II) ─────────────────────────────────
  {
    code: "MATH_SCI",
    name: "Mathematics and Science (Paper II)",
    weight: 1,
    topics: [
      { code: "math_sci.math.numbers", name: "Number System (Class 6–8)", description: "Integers, rationals, real numbers and operations." },
      { code: "math_sci.math.algebra", name: "Algebra", description: "Algebraic expressions, identities and linear equations in one/two variables." },
      { code: "math_sci.math.geometry", name: "Geometry", description: "Triangles, quadrilaterals, circles and constructions." },
      { code: "math_sci.math.mensuration", name: "Mensuration", description: "Area, perimeter, surface area and volume of plane and solid figures." },
      { code: "math_sci.math.commercial", name: "Commercial Mathematics", description: "Profit/loss, discount, simple and compound interest." },
      { code: "math_sci.math.statistics", name: "Statistics and Data Handling", description: "Mean, median, mode and graphical representation of data." },
      { code: "math_sci.math.pedagogy", name: "Pedagogy of Mathematics",
        description: "Pedagogy specific to upper-primary mathematics.",
        subtopics: [
          { code: "math_sci.math.pedagogy.nature", name: "Nature of Mathematics", description: "Mathematics as patterns and reasoning." },
          { code: "math_sci.math.pedagogy.methods", name: "Methods of Teaching", description: "Inductive, deductive and analytical-synthetic methods." },
          { code: "math_sci.math.pedagogy.evaluation", name: "Evaluation in Mathematics", description: "Diagnostic, formative and summative evaluation." },
          { code: "math_sci.math.pedagogy.remedial", name: "Remedial Teaching", description: "Identifying and remediating learning gaps." },
        ],
      },
      { code: "math_sci.science.matter", name: "Matter and Materials", description: "States of matter, mixtures, separation and chemical change." },
      { code: "math_sci.science.living", name: "Living World and Cell", description: "Cells, tissues, plant and animal classification." },
      { code: "math_sci.science.body", name: "Human Body and Health", description: "Organ systems, nutrition, immunisation and diseases." },
      { code: "math_sci.science.microbes", name: "Microorganisms", description: "Bacteria, viruses, fungi — useful and harmful." },
      { code: "math_sci.science.motion", name: "Motion and Force", description: "Types of motion, force, friction and Newton's laws (basic)." },
      { code: "math_sci.science.light_sound", name: "Light, Heat and Sound", description: "Reflection, refraction, heat transfer and sound waves." },
      { code: "math_sci.science.electricity", name: "Electricity and Magnetism", description: "Electric current, circuits, magnets and electromagnetism." },
      { code: "math_sci.science.air_water", name: "Air and Water Quality", description: "Composition, pollution and conservation of air and water." },
      { code: "math_sci.science.acids_bases", name: "Acids, Bases and Salts", description: "Properties, indicators and uses of acids, bases and salts." },
      { code: "math_sci.science.energy", name: "Sources of Energy", description: "Conventional and alternative sources of energy." },
      { code: "math_sci.science.environment", name: "Environment and Ecosystem", description: "Ecosystem, food chains, biodiversity and pollution." },
      { code: "math_sci.science.pedagogy", name: "Pedagogy of Science",
        description: "Pedagogy specific to upper-primary science.",
        subtopics: [
          { code: "math_sci.science.pedagogy.nature", name: "Nature and Structure of Science", description: "Science as a way of knowing and understanding nature." },
          { code: "math_sci.science.pedagogy.aims", name: "Aims and Objectives", description: "Cognitive, affective and skill-related objectives." },
          { code: "math_sci.science.pedagogy.methods", name: "Methods of Teaching Science", description: "Inquiry, project and demonstration methods." },
          { code: "math_sci.science.pedagogy.evaluation", name: "Evaluation in Science", description: "Diagnostic, formative and summative evaluation." },
        ],
      },
    ],
  },

  // ── SOCIAL STUDIES (Paper II) ────────────────────────────────────────
  {
    code: "SOCIAL_STUDIES",
    name: "Social Studies (Paper II)",
    weight: 1,
    topics: [
      { code: "ss.history.ancient", name: "Ancient India", description: "Indus Valley civilisation, Vedic age, Mahajanapadas and Mauryan period." },
      { code: "ss.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughal empire and bhakti-sufi movements." },
      { code: "ss.history.bengal", name: "History of Bengal", description: "Bengal Renaissance, partition of Bengal and freedom struggle in Bengal." },
      { code: "ss.history.modern", name: "Modern India", description: "British rule, 1857 revolt, freedom movement and independence." },
      { code: "ss.geography.earth", name: "Earth as a Planet", description: "Solar system, latitudes, longitudes and motions of the earth." },
      { code: "ss.geography.physical", name: "Physical Geography of India", description: "Mountains, plains, rivers, climate and natural vegetation." },
      { code: "ss.geography.bengal", name: "Geography of West Bengal", description: "Physical features, climate, rivers and resources of West Bengal." },
      { code: "ss.geography.world", name: "World Geography", description: "Continents, oceans, important countries and physical features." },
      { code: "ss.civics.constitution", name: "Indian Constitution", description: "Preamble, fundamental rights, duties and DPSPs." },
      { code: "ss.civics.democracy", name: "Indian Democracy and Government", description: "Parliament, executive, judiciary and elections." },
      { code: "ss.civics.local", name: "Local Self-Government", description: "Panchayati raj and municipalities in West Bengal." },
      { code: "ss.economics", name: "Indian Economy", description: "Sectors of the economy, agriculture, industry and services." },
      { code: "ss.environment", name: "Environment and Sustainable Development", description: "Pollution, conservation and sustainable practices." },
      { code: "ss.diversity", name: "Social Diversity", description: "Indian diversity — language, religion and culture." },
      { code: "ss.pedagogy", name: "Pedagogical Issues in Social Studies",
        description: "Pedagogy specific to upper-primary social studies.",
        subtopics: [
          { code: "ss.pedagogy.concept", name: "Concept and Nature of Social Studies", description: "Scope and aims of social studies." },
          { code: "ss.pedagogy.classroom", name: "Classroom Processes and Discourse", description: "Discussion, debate and inquiry approaches." },
          { code: "ss.pedagogy.thinking", name: "Developing Critical Thinking", description: "Cultivating reasoning in social-science learners." },
          { code: "ss.pedagogy.sources", name: "Primary and Secondary Sources", description: "Use of historical sources and contemporary data." },
          { code: "ss.pedagogy.projects", name: "Projects and Field Work", description: "Project method and field-based learning." },
          { code: "ss.pedagogy.evaluation", name: "Evaluation in Social Studies", description: "Tools and techniques for assessing learning." },
        ],
      },
    ],
  },
];

export async function seedWbTetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "WB_TET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — WB_TET exam not found.");
  }
  console.log(`Seeding WB TET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < wbTetSyllabus.length; sIdx++) {
    const s = wbTetSyllabus[sIdx];
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
  seedWbTetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
