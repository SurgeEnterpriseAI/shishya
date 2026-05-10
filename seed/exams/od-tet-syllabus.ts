// OTET (Odisha Teacher Eligibility Test) — full syllabus tree.
// Conducted by Board of Secondary Education (BSE), Odisha.
// Two papers, each 150 MCQs × 1 mark = 150 marks in 150 minutes. No negative marking.
// Source: official OTET notification & syllabus (bseodisha.ac.in / bseodisha.nic.in),
// cross-checked with NCTE TET framework. Paper I (Class 1–5) and Paper II (Class 6–8).
// Languages on offer for Lang I/II: Odia, English, Hindi, Telugu, Bengali, Urdu (Lang I differs from Lang II).
//
// Run after seedExams: npx tsx seed/exams/od-tet-syllabus.ts

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

export const odTetSyllabus: SubjectSeed[] = [
  // ── CHILD DEVELOPMENT & PEDAGOGY ──────────────────────────────────────
  {
    code: "CDP",
    name: "Child Development and Pedagogy",
    weight: 1,
    topics: [
      {
        code: "cdp.development",
        name: "Concept of Development",
        description: "Concept of growth and development and its principles.",
        subtopics: [
          { code: "cdp.development.concept", name: "Growth and Development", description: "Definition, distinction and relationship of growth and development with learning." },
          { code: "cdp.development.principles", name: "Principles of Development", description: "Continuity, sequence, individual differences and integration." },
          { code: "cdp.development.heredity_environment", name: "Heredity and Environment", description: "Influence of heredity and environment on the development of the child." },
          { code: "cdp.development.dimensions", name: "Dimensions of Development", description: "Physical, cognitive, emotional, social, language and moral development." },
          { code: "cdp.development.adolescence", name: "Adolescence (Paper II)", description: "Physical and emotional changes during adolescence and the teacher's role." },
        ],
      },
      {
        code: "cdp.theories",
        name: "Theories of Learning",
        description: "Major theories of learning and their educational implications.",
        subtopics: [
          { code: "cdp.theories.behaviourism", name: "Behaviourism", description: "Pavlov, Thorndike, Skinner — classical and operant conditioning." },
          { code: "cdp.theories.gestalt", name: "Gestalt and Insight Learning", description: "Köhler's insight learning and Gestalt principles." },
          { code: "cdp.theories.piaget", name: "Piaget — Cognitive Stages", description: "Sensori-motor, pre-operational, concrete and formal operational stages." },
          { code: "cdp.theories.kohlberg", name: "Kohlberg — Moral Development", description: "Pre-conventional, conventional and post-conventional stages." },
          { code: "cdp.theories.vygotsky", name: "Vygotsky — Socio-cultural Theory", description: "Social construction of knowledge, ZPD and scaffolding." },
        ],
      },
      {
        code: "cdp.intelligence",
        name: "Intelligence, Creativity and Personality",
        description: "Constructs of intelligence, creativity and personality.",
        subtopics: [
          { code: "cdp.intelligence.concept", name: "Concept of Intelligence", description: "Theories of intelligence — Spearman, Thorndike, Thurstone, Gardner." },
          { code: "cdp.intelligence.measurement", name: "Measurement of Intelligence", description: "IQ, intelligence tests and their educational implications." },
          { code: "cdp.intelligence.creativity", name: "Creativity", description: "Concept of creativity and identifying creative learners." },
          { code: "cdp.intelligence.personality", name: "Personality", description: "Theories of personality and methods of assessment." },
        ],
      },
      {
        code: "cdp.individual",
        name: "Individual Differences and Inclusive Education",
        description: "Diverse learners and inclusive practices.",
        subtopics: [
          { code: "cdp.individual.diversity", name: "Diversity Among Learners", description: "Differences based on language, caste, gender, religion, region and ability." },
          { code: "cdp.individual.cwsn", name: "Children with Special Needs", description: "Identifying and supporting children with disabilities and learning difficulties." },
          { code: "cdp.individual.gifted", name: "Gifted and Creative Learners", description: "Differentiated strategies for high-ability and creative children." },
          { code: "cdp.individual.disadvantaged", name: "Disadvantaged Learners", description: "SC/ST/minority/migrant children and equity in classrooms." },
        ],
      },
      {
        code: "cdp.learning",
        name: "Learning and Pedagogy",
        description: "How children think and learn and the implications for teaching.",
        subtopics: [
          { code: "cdp.learning.process", name: "Concept of Learning", description: "Learning as construction of knowledge; factors affecting learning." },
          { code: "cdp.learning.motivation", name: "Motivation", description: "Maslow, McClelland — intrinsic and extrinsic motivation." },
          { code: "cdp.learning.problem_solving", name: "Problem Solving", description: "Child as problem solver and scientific investigator." },
          { code: "cdp.learning.errors", name: "Children's Errors as Steps", description: "Children's errors as significant steps in the learning process." },
        ],
      },
      {
        code: "cdp.assessment",
        name: "Assessment, RTE and CCE",
        description: "Assessment and evaluation in elementary classrooms.",
        subtopics: [
          { code: "cdp.assessment.afl_aol", name: "Assessment for and of Learning", description: "Distinction between formative and summative assessment." },
          { code: "cdp.assessment.cce", name: "School-based Assessment and CCE", description: "Continuous comprehensive evaluation in primary classrooms." },
          { code: "cdp.assessment.rte", name: "RTE Act 2009", description: "Salient provisions of the Right to Education Act 2009." },
        ],
      },
    ],
  },

  // ── LANGUAGE I (Odia) ─────────────────────────────────────────────────
  {
    code: "LANG1",
    name: "Language I — Odia / Hindi / Telugu / Bengali / Urdu",
    weight: 1,
    topics: [
      { code: "lang1.comprehension_prose", name: "Apathit Gadya (Unseen Prose)", description: "Two unseen prose passages with comprehension and grammar questions in chosen Lang I." },
      { code: "lang1.comprehension_poem", name: "Apathit Padya (Unseen Poem)", description: "Unseen poem with comprehension and figures-of-speech questions." },
      { code: "lang1.varna", name: "Varna and Uchchar", description: "Vowels, consonants and pronunciation rules of the chosen language." },
      { code: "lang1.shabd", name: "Shabd Bhed", description: "Tatsam, tadbhav, deshi and videshi words; categories of words." },
      { code: "lang1.sandhi_samas", name: "Sandhi and Samas", description: "Sandhi rules and samas types in Odia/Hindi etc." },
      { code: "lang1.upsarg_pratyay", name: "Prefixes and Suffixes", description: "Word formation through upsarg and pratyay." },
      { code: "lang1.parts_of_speech", name: "Parts of Speech", description: "Parts of speech in the chosen language." },
      { code: "lang1.tense_case", name: "Tense, Gender, Number and Case", description: "Verb tense, gender, number and case forms." },
      { code: "lang1.vakya", name: "Sentence Structure", description: "Sentence types and punctuation in the chosen language." },
      { code: "lang1.idioms", name: "Idioms and Proverbs", description: "Common idioms and proverbs and their use." },
      { code: "lang1.alankar", name: "Alankar and Ras", description: "Figures of speech and ras in literary appreciation." },
      { code: "lang1.synonyms", name: "Synonyms and Antonyms", description: "Synonyms and antonyms in the chosen language." },
      {
        code: "lang1.pedagogy",
        name: "Pedagogy of Language Development",
        description: "Pedagogy for teaching the chosen Lang I at primary stage.",
        subtopics: [
          { code: "lang1.pedagogy.acquisition", name: "Acquisition vs Learning", description: "Difference between language acquisition and learning." },
          { code: "lang1.pedagogy.principles", name: "Principles of Language Teaching", description: "Aims and principles of teaching the regional language." },
          { code: "lang1.pedagogy.lsrw", name: "LSRW Skills", description: "Listening, speaking, reading and writing skills development." },
          { code: "lang1.pedagogy.diverse", name: "Multilingual Classroom", description: "Challenges of teaching language in a multilingual setting." },
          { code: "lang1.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbook, multimedia and multilingual resources." },
          { code: "lang1.pedagogy.evaluation", name: "Evaluation in Language", description: "Speaking, listening, reading and writing assessment." },
          { code: "lang1.pedagogy.remedial", name: "Remedial Teaching", description: "Diagnostic and remedial work in language." },
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
      { code: "lang2.comprehension", name: "Unseen Prose Passages", description: "Two unseen prose passages — comprehension, vocabulary and grammar." },
      { code: "lang2.poem", name: "Unseen Poem", description: "Unseen poem with comprehension and literary-device questions." },
      { code: "lang2.parts_of_speech", name: "Parts of Speech", description: "Noun, pronoun, verb, adverb, adjective, preposition, conjunction, interjection." },
      { code: "lang2.tense", name: "Tenses", description: "Present, past and future tense — simple, continuous, perfect forms." },
      { code: "lang2.voice_narration", name: "Voice and Narration", description: "Active-passive voice; direct-indirect speech." },
      { code: "lang2.articles", name: "Articles and Determiners", description: "Use of a/an/the and other determiners." },
      { code: "lang2.prepositions", name: "Prepositions", description: "Use of common prepositions in English." },
      { code: "lang2.subject_verb", name: "Subject-Verb Agreement", description: "Concord and agreement between subject and verb." },
      { code: "lang2.modals", name: "Modals", description: "Can, could, may, might, must, shall, should, will, would, ought to." },
      { code: "lang2.transformation", name: "Sentence Transformation", description: "Affirmative-negative, simple-compound-complex transformation." },
      { code: "lang2.vocabulary", name: "Vocabulary", description: "Synonyms, antonyms, one-word substitution, homophones." },
      { code: "lang2.idioms", name: "Idioms and Phrases", description: "English idioms and phrasal verbs." },
      {
        code: "lang2.pedagogy",
        name: "Pedagogy of English",
        description: "Pedagogy of teaching English as a second language.",
        subtopics: [
          { code: "lang2.pedagogy.acquisition", name: "Acquisition vs Learning", description: "Difference between language acquisition and learning." },
          { code: "lang2.pedagogy.principles", name: "Principles of English Teaching", description: "Approaches, methods and principles." },
          { code: "lang2.pedagogy.lsrw", name: "LSRW Skills", description: "Listening, speaking, reading and writing in English." },
          { code: "lang2.pedagogy.errors", name: "Errors and Disorders", description: "Common errors and language disorders." },
          { code: "lang2.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbooks, audio-visual aids and ICT for English." },
          { code: "lang2.pedagogy.evaluation", name: "Evaluation in English", description: "Assessment of LSRW skills." },
        ],
      },
    ],
  },

  // ── MATHEMATICS (Paper I) ────────────────────────────────────────────
  {
    code: "MATH",
    name: "Mathematics (Paper I)",
    weight: 1,
    topics: [
      { code: "math.numbers", name: "Number System", description: "Whole numbers, integers, place value, factors and multiples." },
      { code: "math.fractions", name: "Fractions and Decimals", description: "Operations on fractions and decimals." },
      { code: "math.lcm_hcf", name: "LCM and HCF", description: "Lowest common multiple and highest common factor." },
      { code: "math.percentage", name: "Percentage", description: "Percentage calculations and applications." },
      { code: "math.profit_loss", name: "Profit, Loss and Discount", description: "Commercial mathematics for primary level." },
      { code: "math.simple_interest", name: "Simple Interest", description: "Simple interest and applications." },
      { code: "math.ratio", name: "Ratio and Proportion", description: "Ratio, proportion and unitary method." },
      { code: "math.geometry", name: "Geometry", description: "Lines, angles, basic shapes — square, rectangle, triangle, circle." },
      { code: "math.mensuration", name: "Mensuration", description: "Area and perimeter of simple plane figures." },
      { code: "math.measurement", name: "Measurement", description: "Length, mass, capacity, time and temperature." },
      { code: "math.data_handling", name: "Data Handling", description: "Pictograph, bar graph and simple data interpretation." },
      { code: "math.money_time", name: "Money and Time", description: "Money calculations, calendar and clock problems." },
      {
        code: "math.pedagogy",
        name: "Pedagogy of Mathematics",
        description: "Mathematics-specific pedagogy.",
        subtopics: [
          { code: "math.pedagogy.nature", name: "Nature of Mathematics", description: "Mathematics as patterns and logical thinking." },
          { code: "math.pedagogy.curriculum", name: "Place of Mathematics in Curriculum", description: "Aims and importance of school mathematics." },
          { code: "math.pedagogy.community", name: "Community Mathematics", description: "Linking school mathematics with the local environment." },
          { code: "math.pedagogy.evaluation", name: "Evaluation", description: "Formative, diagnostic and summative evaluation." },
          { code: "math.pedagogy.errors", name: "Error Analysis and Remedial Teaching", description: "Identifying error patterns and providing remediation." },
        ],
      },
    ],
  },

  // ── ENVIRONMENTAL STUDIES (Paper I) ──────────────────────────────────
  {
    code: "EVS",
    name: "Environmental Studies (Paper I)",
    weight: 1,
    topics: [
      { code: "evs.family", name: "Family and Friends", description: "Family relationships, peers and social bonds." },
      { code: "evs.food", name: "Food", description: "Sources of food, balanced diet and food preservation." },
      { code: "evs.shelter", name: "Shelter", description: "Houses across regions of Odisha and India." },
      { code: "evs.water", name: "Water", description: "Sources, conservation and water-borne diseases." },
      { code: "evs.travel", name: "Travel and Communication", description: "Transport and communication — past and present." },
      { code: "evs.things_we_make", name: "Things We Make and Do", description: "Local crafts, handicrafts of Odisha and traditional occupations." },
      { code: "evs.our_body", name: "Our Body and Health", description: "Body parts, sense organs, hygiene and common diseases." },
      { code: "evs.plants_animals", name: "Plants and Animals Around Us", description: "Plant and animal life and conservation." },
      { code: "evs.odisha_landscape", name: "Landscape of Odisha", description: "Coastal plains, Eastern Ghats, rivers (Mahanadi) and Chilika Lake." },
      { code: "evs.odisha_climate", name: "Climate of Odisha", description: "Climate, monsoon, cyclones and seasonal variations." },
      { code: "evs.odisha_natural", name: "Natural Resources of Odisha", description: "Forests, minerals (iron, bauxite), wildlife and conservation." },
      { code: "evs.odisha_agri_industry", name: "Agriculture and Industry of Odisha", description: "Major crops, fisheries and key industries of Odisha." },
      { code: "evs.odisha_culture", name: "Culture and Heritage of Odisha", description: "Konark, Jagannath temple, Odissi dance, Pattachitra and tribal communities." },
      { code: "evs.solar_system", name: "Earth and Universe", description: "Earth's motion, solar system and basic space concepts." },
      { code: "evs.environmental_protection", name: "Environmental Protection", description: "Pollution, climate change and conservation." },
      {
        code: "evs.pedagogy",
        name: "Pedagogical Issues in EVS",
        description: "EVS-specific pedagogy at primary level.",
        subtopics: [
          { code: "evs.pedagogy.scope", name: "Concept and Scope of EVS", description: "Significance and scope of environmental studies." },
          { code: "evs.pedagogy.integrated", name: "EVS as Integrated Subject", description: "Integration of science and social science in EVS." },
          { code: "evs.pedagogy.approaches", name: "Approaches to Teaching EVS", description: "Activity-based and discovery approaches." },
          { code: "evs.pedagogy.cce", name: "CCE in EVS", description: "Continuous comprehensive evaluation." },
          { code: "evs.pedagogy.tlm", name: "Teaching Aids", description: "Charts, models and ICT in EVS teaching." },
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
      { code: "math_sci.algebra", name: "Algebra", description: "Algebraic expressions, identities and linear equations." },
      { code: "math_sci.quadratic", name: "Quadratic Equations", description: "Roots of quadratic equations and applications." },
      { code: "math_sci.geometry", name: "Geometry", description: "Triangles, quadrilaterals, congruence and similarity." },
      { code: "math_sci.mensuration", name: "Mensuration", description: "Area, surface area and volume of solids." },
      { code: "math_sci.statistics", name: "Statistics and Probability", description: "Mean, median, mode and elementary probability." },
      { code: "math_sci.trigonometry", name: "Trigonometry", description: "Trigonometric ratios and identities." },
      { code: "math_sci.science.living", name: "Living and Non-living", description: "Characteristics of living things and classification." },
      { code: "math_sci.science.human_body", name: "Human Body Systems", description: "Digestive, respiratory, circulatory, nervous and reproductive systems." },
      { code: "math_sci.science.plant", name: "Plant Life", description: "Plant structure, function and reproduction." },
      { code: "math_sci.science.matter", name: "Matter and its Nature", description: "Atoms, molecules, elements and compounds." },
      { code: "math_sci.science.acids", name: "Acids, Bases and Salts", description: "Properties of acids, bases, salts and pH." },
      { code: "math_sci.science.force", name: "Force, Motion and Energy", description: "Force, motion, work, energy and Newton's laws." },
      { code: "math_sci.science.heat_light_sound", name: "Heat, Light and Sound", description: "Heat transfer, reflection/refraction and sound waves." },
      { code: "math_sci.science.electricity", name: "Electricity and Magnetism", description: "Current, circuits, magnets and electromagnetic effects." },
      { code: "math_sci.science.environment", name: "Environment and Ecosystem", description: "Ecosystem, food chains and pollution." },
      {
        code: "math_sci.pedagogy",
        name: "Pedagogy of Math and Science",
        description: "Pedagogy specific to math and science.",
        subtopics: [
          { code: "math_sci.pedagogy.nature", name: "Nature of Math and Science", description: "Math and science as ways of knowing." },
          { code: "math_sci.pedagogy.methods", name: "Methods of Teaching", description: "Inquiry, project, demonstration and experimental methods." },
          { code: "math_sci.pedagogy.lab", name: "Lab Work", description: "Lab safety and equipment in science." },
          { code: "math_sci.pedagogy.evaluation", name: "Evaluation", description: "Achievement, diagnostic and remedial assessment." },
        ],
      },
    ],
  },

  // ── SOCIAL SCIENCE (Paper II) ────────────────────────────────────────
  {
    code: "SOCIAL_STUDIES",
    name: "Social Science (Paper II)",
    weight: 1,
    topics: [
      { code: "ss.history.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Mauryan and Gupta empires." },
      { code: "ss.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals, bhakti and sufi movements." },
      { code: "ss.history.modern", name: "Modern India", description: "British conquest, colonial rule and freedom struggle." },
      { code: "ss.history.odisha", name: "History of Odisha", description: "Kalinga, Eastern Gangas, Mukunda Dev and freedom struggle in Odisha." },
      { code: "ss.geography.earth", name: "Earth and the Universe", description: "Solar system, latitudes, longitudes and motions." },
      { code: "ss.geography.physical", name: "Physical Features of India", description: "Mountains, plains, plateaus, rivers and climate." },
      { code: "ss.geography.resources", name: "Natural Resources", description: "Soil, water, forest, mineral and energy resources." },
      { code: "ss.geography.odisha", name: "Geography of Odisha", description: "Physical features, climate, agriculture and minerals of Odisha." },
      { code: "ss.geography.world", name: "World Geography", description: "Continents, oceans and important countries." },
      { code: "ss.civics.constitution", name: "Indian Constitution", description: "Preamble, fundamental rights, duties and DPSPs." },
      { code: "ss.civics.democracy", name: "Indian Democracy", description: "Parliament, executive, judiciary and elections." },
      { code: "ss.civics.local", name: "Local Self-Government", description: "Panchayati raj and municipal institutions in Odisha." },
      { code: "ss.economics", name: "Indian Economy", description: "Sectors of the economy, agriculture, industry and services." },
      { code: "ss.environment", name: "Environment and Sustainable Development", description: "Pollution, climate change and conservation." },
      { code: "ss.odisha_culture", name: "Art and Culture of Odisha", description: "Odissi dance, Pattachitra, Konark, Jagannath culture and tribal heritage." },
      {
        code: "ss.pedagogy",
        name: "Pedagogical Issues in Social Science",
        description: "Pedagogy specific to social science.",
        subtopics: [
          { code: "ss.pedagogy.nature", name: "Concept and Nature of Social Science", description: "Scope and aims of social science." },
          { code: "ss.pedagogy.classroom", name: "Classroom Processes", description: "Discussion, debate and inquiry." },
          { code: "ss.pedagogy.thinking", name: "Critical Thinking", description: "Cultivating reasoning and analytical thinking." },
          { code: "ss.pedagogy.sources", name: "Primary and Secondary Sources", description: "Use of sources, data and maps." },
          { code: "ss.pedagogy.projects", name: "Project Work and Field Visits", description: "Project method and field-based learning." },
          { code: "ss.pedagogy.evaluation", name: "Evaluation", description: "Tools and techniques for assessing learning." },
        ],
      },
    ],
  },
];

export async function seedOdTetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "OD_TET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — OD_TET exam not found.");
  }
  console.log(`Seeding OTET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < odTetSyllabus.length; sIdx++) {
    const s = odTetSyllabus[sIdx];
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
  seedOdTetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
