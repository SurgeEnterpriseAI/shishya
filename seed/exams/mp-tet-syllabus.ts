// MP TET (Madhya Pradesh Teacher Eligibility Test) — full syllabus tree.
// Conducted by Madhya Pradesh Employees Selection Board (MPESB / formerly VYAPAM).
// Three categories: Varg-1 (Class 11–12 / TGT), Varg-2 (Class 6–8 / Middle School)
// and Varg-3 (Class 1–5 / Primary). 150 MCQs × 1 mark = 150 marks in 150 minutes.
// No negative marking. Source: official MPESB rulebook & notification (esb.mp.gov.in),
// cross-checked with NCTE TET framework.
// Languages on offer for Lang I/II: Hindi, English, Sanskrit, Urdu (Lang I differs from Lang II).
//
// Run after seedExams: npx tsx seed/exams/mp-tet-syllabus.ts

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

export const mpTetSyllabus: SubjectSeed[] = [
  // ── CHILD DEVELOPMENT & PEDAGOGY ──────────────────────────────────────
  {
    code: "CDP",
    name: "Child Development and Pedagogy (Bal Vikas evam Shikshan Shastra)",
    weight: 1,
    topics: [
      {
        code: "cdp.development",
        name: "Concept of Development",
        description: "Concept of growth and development and its principles.",
        subtopics: [
          { code: "cdp.development.concept", name: "Growth and Development", description: "Definition, distinction and relationship of growth and development with learning." },
          { code: "cdp.development.principles", name: "Principles of Development", description: "Continuity, sequence, individual differences and integration in development." },
          { code: "cdp.development.heredity_environment", name: "Heredity and Environment", description: "Influence of heredity and environment on the development of the child." },
          { code: "cdp.development.dimensions", name: "Dimensions of Development", description: "Physical, cognitive, emotional, social, language and moral development." },
          { code: "cdp.development.adolescence", name: "Adolescence (Varg-1, Varg-2)", description: "Physical and emotional changes during adolescence and the teacher's role." },
        ],
      },
      {
        code: "cdp.theories",
        name: "Theories of Learning and Development",
        description: "Major theories that inform classroom practice in MP schools.",
        subtopics: [
          { code: "cdp.theories.piaget", name: "Piaget's Cognitive Stages", description: "Sensori-motor, pre-operational, concrete and formal operational stages." },
          { code: "cdp.theories.kohlberg", name: "Kohlberg's Moral Development", description: "Pre-conventional, conventional and post-conventional stages of moral reasoning." },
          { code: "cdp.theories.vygotsky", name: "Vygotsky — Socio-cultural Theory", description: "Social construction of knowledge, ZPD and scaffolding." },
          { code: "cdp.theories.behaviourism", name: "Behaviourism", description: "Pavlov, Thorndike, Skinner — classical and operant conditioning." },
          { code: "cdp.theories.gestalt", name: "Gestalt and Insight Learning", description: "Köhler's insight learning and Gestalt principles of perception." },
        ],
      },
      {
        code: "cdp.intelligence_personality",
        name: "Intelligence, Creativity and Personality",
        description: "Constructs of intelligence, creativity and personality at the school stage.",
        subtopics: [
          { code: "cdp.intelligence_personality.intelligence", name: "Intelligence — Concept and Theories", description: "Spearman, Thorndike, Thurstone, Gardner — multi-dimensional intelligence." },
          { code: "cdp.intelligence_personality.iq", name: "Measurement of Intelligence", description: "IQ, intelligence tests and their educational implications." },
          { code: "cdp.intelligence_personality.creativity", name: "Creativity", description: "Concept of creativity and identifying creative learners." },
          { code: "cdp.intelligence_personality.personality", name: "Personality and its Assessment", description: "Theories of Allport, Cattell, Freud and methods of personality assessment." },
        ],
      },
      {
        code: "cdp.individual_differences",
        name: "Individual Differences and Inclusive Education",
        description: "Diverse learners and inclusive practices.",
        subtopics: [
          { code: "cdp.individual_differences.diversity", name: "Diversity Among Learners", description: "Differences based on language, caste, gender, religion, region and ability." },
          { code: "cdp.individual_differences.cwsn", name: "Children with Special Needs", description: "Identifying and supporting children with disabilities and learning difficulties." },
          { code: "cdp.individual_differences.gifted", name: "Gifted, Creative and Talented Learners", description: "Differentiated strategies for high-ability and creative children." },
          { code: "cdp.individual_differences.disadvantaged", name: "Disadvantaged and Deprived Learners", description: "SC/ST/OBC, minority and migrant children and equity in classrooms." },
        ],
      },
      {
        code: "cdp.learning",
        name: "Learning and Pedagogy",
        description: "How children think and learn and its implications for teaching.",
        subtopics: [
          { code: "cdp.learning.process", name: "Concept and Process of Learning", description: "Learning as construction of knowledge; factors affecting learning." },
          { code: "cdp.learning.motivation", name: "Motivation in Learning", description: "Maslow, McClelland — intrinsic and extrinsic motivation." },
          { code: "cdp.learning.memory", name: "Memory and Forgetting", description: "STM, LTM and theories of forgetting." },
          { code: "cdp.learning.transfer", name: "Transfer of Learning", description: "Types and theories of transfer of learning." },
          { code: "cdp.learning.problem_solving", name: "Problem Solving and Critical Thinking", description: "Child as a problem solver and scientific investigator." },
        ],
      },
      {
        code: "cdp.assessment",
        name: "Assessment, RTE and NEP",
        description: "Assessment, school-level evaluation and policy framework.",
        subtopics: [
          { code: "cdp.assessment.afl_aol", name: "Assessment for and of Learning", description: "Distinction, formative vs summative assessment, CCE." },
          { code: "cdp.assessment.tools", name: "Tools of Assessment", description: "Achievement test, diagnostic test, portfolios, rubrics." },
          { code: "cdp.assessment.rte", name: "Right to Education Act 2009", description: "Salient provisions of the RTE Act and its impact in MP." },
          { code: "cdp.assessment.nep", name: "NEP 2020 and NCF", description: "Salient features of NEP 2020 and NCF 2005 relevant to school education." },
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
      { code: "lang1.comprehension", name: "Apathit Gadyansh", description: "Two unseen prose passages with comprehension, grammar and vocabulary questions." },
      { code: "lang1.padyansh", name: "Apathit Padyansh", description: "Unseen poetry passage with comprehension and literary devices." },
      { code: "lang1.varna_uchchar", name: "Varnamala aur Uchchar", description: "Hindi vowels, consonants and pronunciation rules (Devanagari)." },
      { code: "lang1.shabd_bhed", name: "Shabd Bhed", description: "Tatsam, tadbhav, deshi and videshi shabd in Hindi." },
      { code: "lang1.sandhi", name: "Sandhi", description: "Swar sandhi, vyanjan sandhi and visarg sandhi." },
      { code: "lang1.samas", name: "Samas", description: "Tatpurush, dvandva, dvigu, karmadharaya, bahuvrihi and avyayibhav." },
      { code: "lang1.upsarg_pratyay", name: "Upsarg aur Pratyay", description: "Prefixes and suffixes in Hindi word formation." },
      { code: "lang1.vyakaran", name: "Vyakaran — Parts of Speech", description: "Sangya, sarvanaam, visheshan, kriya, kriya-visheshan, samuchchaya, vismayadi." },
      { code: "lang1.ling_vachan_kaal", name: "Ling, Vachan, Kaal", description: "Gender, number, tense and case (karak) in Hindi." },
      { code: "lang1.vakyarachna", name: "Vakyarachna and Punctuation", description: "Sentence structure, types and Hindi punctuation marks." },
      { code: "lang1.muhavare_lokoktiyan", name: "Muhavare aur Lokoktiyan", description: "Hindi idioms and proverbs and their use in sentences." },
      { code: "lang1.alankar_ras_chhand", name: "Alankar, Ras and Chhand", description: "Figures of speech, nine ras and major Hindi metres." },
      { code: "lang1.synonyms_antonyms", name: "Paryayvachi aur Vilom", description: "Synonyms and antonyms in Hindi." },
      {
        code: "lang1.pedagogy",
        name: "Pedagogy of Hindi Language",
        description: "Pedagogical principles for teaching Hindi at primary / upper-primary level.",
        subtopics: [
          { code: "lang1.pedagogy.principles", name: "Principles of Language Teaching", description: "Aims, principles and approaches to teaching Hindi as the mother tongue." },
          { code: "lang1.pedagogy.lsrw", name: "Listening, Speaking, Reading, Writing", description: "Development of LSRW skills in Hindi." },
          { code: "lang1.pedagogy.acquisition", name: "Language Acquisition vs Learning", description: "Krashen's principles applied to Hindi as the regional language." },
          { code: "lang1.pedagogy.grammar", name: "Role of Grammar in Hindi", description: "Critical perspective on the role of grammar at the primary stage." },
          { code: "lang1.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbooks, audio-visual aids and ICT for teaching Hindi." },
          { code: "lang1.pedagogy.evaluation", name: "Evaluation in Hindi", description: "Assessment of comprehension, expression and grammar." },
          { code: "lang1.pedagogy.remedial", name: "Remedial Teaching", description: "Diagnostic and remedial work in Hindi." },
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
      { code: "lang2.comprehension", name: "Unseen Prose Passages", description: "Two unseen prose passages with comprehension, vocabulary and grammar questions." },
      { code: "lang2.poem", name: "Unseen Poem", description: "Unseen poem with comprehension, inference and figures of speech." },
      { code: "lang2.parts_of_speech", name: "Parts of Speech", description: "Noun, pronoun, verb, adverb, adjective, preposition, conjunction, interjection." },
      { code: "lang2.tense", name: "Tenses", description: "Present, past and future tense — simple, continuous, perfect and perfect continuous." },
      { code: "lang2.voice_narration", name: "Voice and Narration", description: "Active and passive voice; direct and indirect speech." },
      { code: "lang2.articles_prepositions", name: "Articles and Prepositions", description: "Use of a/an/the and common prepositions." },
      { code: "lang2.subject_verb", name: "Subject-Verb Agreement", description: "Concord and agreement of subject with verb." },
      { code: "lang2.modals", name: "Modal Auxiliaries", description: "Can, could, may, might, must, shall, should, will, would." },
      { code: "lang2.transformation", name: "Sentence Transformation", description: "Affirmative-negative, assertive-interrogative, simple-compound-complex transformation." },
      { code: "lang2.vocabulary", name: "Vocabulary", description: "Synonyms, antonyms, one-word substitution and homophones." },
      { code: "lang2.idioms", name: "Idioms and Phrases", description: "Common English idioms and phrasal verbs." },
      { code: "lang2.punctuation", name: "Punctuation", description: "Capitalisation, commas, semicolon, colon, apostrophe, quotation marks." },
      {
        code: "lang2.pedagogy",
        name: "Pedagogy of English Language",
        description: "Pedagogical concerns specific to teaching English as a second language.",
        subtopics: [
          { code: "lang2.pedagogy.acquisition", name: "Learning and Acquisition", description: "Difference between language acquisition and language learning." },
          { code: "lang2.pedagogy.principles", name: "Principles of English Teaching", description: "Key principles guiding teaching of English at school level." },
          { code: "lang2.pedagogy.lsrw", name: "LSRW Skills in English", description: "Development of listening, speaking, reading and writing skills." },
          { code: "lang2.pedagogy.diverse", name: "Challenges of Multilingual Classroom", description: "Language difficulties, errors and disorders in multilingual classes." },
          { code: "lang2.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbooks, multimedia and authentic materials in English." },
          { code: "lang2.pedagogy.evaluation", name: "Evaluating Language Proficiency", description: "Assessment of LSRW skills in English." },
          { code: "lang2.pedagogy.remedial", name: "Remedial Teaching in English", description: "Identifying common errors and providing remedial instruction." },
        ],
      },
    ],
  },

  // ── MATHEMATICS ───────────────────────────────────────────────────────
  {
    code: "MATH",
    name: "Mathematics",
    weight: 1,
    topics: [
      { code: "math.numbers", name: "Number System", description: "Whole numbers, integers, rational numbers, place value, factors and multiples." },
      { code: "math.fractions", name: "Fractions and Decimals", description: "Operations on fractions and decimals; conversions." },
      { code: "math.lcm_hcf", name: "LCM and HCF", description: "Lowest common multiple and highest common factor — methods and word problems." },
      { code: "math.percentage", name: "Percentage and Profit-Loss", description: "Percentage, profit-loss, discount and applied problems." },
      { code: "math.simple_interest", name: "Simple and Compound Interest", description: "SI, CI calculations and applications." },
      { code: "math.ratio_proportion", name: "Ratio and Proportion", description: "Ratio, proportion, partnership and direct/inverse variation." },
      { code: "math.algebra", name: "Algebra (Varg-1, Varg-2)", description: "Algebraic expressions, identities, linear and quadratic equations." },
      { code: "math.geometry", name: "Geometry", description: "Lines, angles, triangles, quadrilaterals, circles and constructions." },
      { code: "math.mensuration", name: "Mensuration", description: "Area and perimeter of plane figures; surface area and volume of solids." },
      { code: "math.statistics", name: "Statistics and Data Handling", description: "Bar graph, pie chart, mean, median and mode." },
      { code: "math.time_work_distance", name: "Time, Work and Distance", description: "Time-work, time-distance and applied word problems." },
      { code: "math.money_unitary", name: "Money and Unitary Method", description: "Currency conversions, unitary method and average." },
      {
        code: "math.pedagogy",
        name: "Pedagogy of Mathematics",
        description: "Mathematics-specific pedagogy at the relevant level.",
        subtopics: [
          { code: "math.pedagogy.nature", name: "Nature of Mathematics", description: "Mathematics as a science of patterns and logical thinking." },
          { code: "math.pedagogy.curriculum", name: "Place of Mathematics in Curriculum", description: "Aims, objectives and importance of school mathematics." },
          { code: "math.pedagogy.language", name: "Language of Mathematics", description: "Symbols, terms and discourse of mathematics in classrooms." },
          { code: "math.pedagogy.community", name: "Community Mathematics", description: "Linking school mathematics with the local environment in MP." },
          { code: "math.pedagogy.evaluation", name: "Evaluation in Mathematics", description: "Formative, diagnostic and summative evaluation tools." },
          { code: "math.pedagogy.errors", name: "Error Analysis and Remedial Teaching", description: "Identifying error patterns and addressing them." },
          { code: "math.pedagogy.problems_teaching", name: "Problems of Teaching Mathematics", description: "Math anxiety, abstraction and challenges of mixed-ability classrooms." },
        ],
      },
    ],
  },

  // ── ENVIRONMENTAL STUDIES (Varg-3 / Primary) ─────────────────────────
  {
    code: "EVS",
    name: "Environmental Studies (Varg-3)",
    weight: 1,
    topics: [
      { code: "evs.family_friends", name: "Family and Friends", description: "Family relationships, peers, animals and friendships." },
      { code: "evs.food", name: "Food", description: "Sources of food, balanced diet and food preservation." },
      { code: "evs.shelter", name: "Shelter", description: "Houses across regions of MP and India and building materials." },
      { code: "evs.water", name: "Water", description: "Sources, conservation, purification and water-borne diseases." },
      { code: "evs.travel", name: "Travel and Communication", description: "Modes of transport and communication — past and present." },
      { code: "evs.things_we_make", name: "Things We Make and Do", description: "Local crafts, handicrafts of MP and traditional occupations." },
      { code: "evs.our_body", name: "Our Body and Health", description: "Body parts, sense organs, hygiene and common diseases." },
      { code: "evs.plants_animals", name: "Plants and Animals Around Us", description: "Plant and animal life, classification basics and conservation." },
      { code: "evs.natural_resources", name: "Natural Resources", description: "Air, water, soil, minerals and energy sources." },
      { code: "evs.mp_geography", name: "Geography of Madhya Pradesh", description: "Location, rivers (Narmada, Tapi), forests and climate of MP." },
      { code: "evs.mp_culture", name: "Culture and Heritage of MP", description: "Folk dances, festivals, fairs and tribal communities of MP." },
      { code: "evs.solar_system", name: "Earth and Universe", description: "Earth's motion, solar system and basic space concepts." },
      { code: "evs.environmental_protection", name: "Environmental Protection", description: "Pollution, climate change, conservation and 3R principle." },
      {
        code: "evs.pedagogy",
        name: "Pedagogical Issues in EVS",
        description: "EVS-specific pedagogy at primary level.",
        subtopics: [
          { code: "evs.pedagogy.scope", name: "Concept and Scope of EVS", description: "Significance and scope of environmental studies at primary stage." },
          { code: "evs.pedagogy.integrated", name: "EVS as Integrated Subject", description: "Integration of science and social science in EVS." },
          { code: "evs.pedagogy.approaches", name: "Approaches to Teaching EVS", description: "Activity-based, experiment-based and discovery approaches." },
          { code: "evs.pedagogy.cce", name: "CCE in EVS", description: "Continuous comprehensive evaluation in environmental studies." },
          { code: "evs.pedagogy.tlm", name: "Teaching Aids and Materials", description: "Charts, models, real objects and ICT in EVS teaching." },
        ],
      },
    ],
  },

  // ── MATHEMATICS & SCIENCE (Varg-2 — Math/Sci stream) ─────────────────
  {
    code: "MATH_SCI",
    name: "Mathematics and Science (Varg-2)",
    weight: 1,
    topics: [
      { code: "math_sci.algebra", name: "Algebraic Expressions and Identities", description: "Polynomials, factorisation and algebraic identities." },
      { code: "math_sci.linear_eq", name: "Linear Equations", description: "Linear equations in one and two variables." },
      { code: "math_sci.quadratic", name: "Quadratic Equations", description: "Roots of quadratic equations and methods of solution." },
      { code: "math_sci.geometry", name: "Geometry — Lines, Angles, Triangles", description: "Properties of triangles, congruence and similarity." },
      { code: "math_sci.mensuration", name: "Mensuration of Solids", description: "Surface area and volume of cube, cuboid, cylinder, cone and sphere." },
      { code: "math_sci.statistics_prob", name: "Statistics and Probability", description: "Mean, median, mode, frequency tables and probability basics." },
      { code: "math_sci.trigonometry", name: "Introduction to Trigonometry", description: "Trigonometric ratios and identities for upper-primary level." },
      { code: "math_sci.science.living", name: "Living and Non-living Things", description: "Characteristics of living things and basic classification." },
      { code: "math_sci.science.human_body", name: "Human Body Systems", description: "Digestive, respiratory, circulatory, nervous and reproductive systems." },
      { code: "math_sci.science.plant", name: "Plant Life", description: "Photosynthesis, transpiration, plant nutrition and reproduction." },
      { code: "math_sci.science.matter", name: "Matter and its Nature", description: "Atoms, molecules, elements, compounds and mixtures." },
      { code: "math_sci.science.acids_bases", name: "Acids, Bases and Salts", description: "Properties of acids, bases, salts and pH scale." },
      { code: "math_sci.science.force", name: "Force, Motion and Energy", description: "Force, motion, work, energy and Newton's laws (basic)." },
      { code: "math_sci.science.heat_light_sound", name: "Heat, Light and Sound", description: "Heat transfer, reflection/refraction of light and sound waves." },
      { code: "math_sci.science.electricity", name: "Electricity and Magnetism", description: "Current, circuits, magnets and electromagnetic effects." },
      { code: "math_sci.science.universe", name: "Solar System and Universe", description: "Planets, stars, galaxies and earth's place in the universe." },
      { code: "math_sci.science.environment", name: "Environment and Ecosystem", description: "Ecosystem, food chains, biodiversity and pollution." },
      { code: "math_sci.science.agriculture", name: "Agriculture and Crops of MP", description: "Major crops, agriculture practices and food production in MP." },
      {
        code: "math_sci.pedagogy",
        name: "Pedagogy of Math and Science",
        description: "Pedagogy specific to math and science at upper-primary level.",
        subtopics: [
          { code: "math_sci.pedagogy.nature", name: "Nature and Structure of Math/Science", description: "Math/science as ways of knowing and understanding." },
          { code: "math_sci.pedagogy.methods", name: "Methods of Teaching", description: "Inquiry, project, demonstration and experimental methods." },
          { code: "math_sci.pedagogy.lab", name: "Laboratory and Practical Work", description: "Lab safety, equipment and innovations in science teaching." },
          { code: "math_sci.pedagogy.evaluation", name: "Evaluation in Math and Science", description: "Achievement test, diagnostic test and remedial work." },
        ],
      },
    ],
  },

  // ── SOCIAL STUDIES (Varg-2 — SS stream) ──────────────────────────────
  {
    code: "SOCIAL_STUDIES",
    name: "Social Studies (Varg-2)",
    weight: 1,
    topics: [
      { code: "ss.history.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Mauryan and Gupta empires." },
      { code: "ss.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals, bhakti and sufi movements." },
      { code: "ss.history.modern", name: "Modern India", description: "British conquest, colonial rule and the freedom struggle." },
      { code: "ss.history.mp", name: "History of Madhya Pradesh", description: "Major dynasties (Paramaras, Chandelas, Holkars, Scindias) and freedom struggle in MP." },
      { code: "ss.geography.earth", name: "Earth and the Universe", description: "Solar system, latitudes, longitudes, motions and time zones." },
      { code: "ss.geography.physical", name: "Physical Features of India", description: "Mountains, plains, plateaus, rivers and climate of India." },
      { code: "ss.geography.resources", name: "Natural Resources", description: "Soil, water, forest, mineral and energy resources." },
      { code: "ss.geography.mp", name: "Geography of Madhya Pradesh", description: "Physical features, climate, agriculture, minerals, forests and tourism of MP." },
      { code: "ss.geography.world", name: "World Geography", description: "Continents, oceans and important countries of the world." },
      { code: "ss.civics.constitution", name: "Indian Constitution", description: "Preamble, fundamental rights, duties and DPSPs." },
      { code: "ss.civics.democracy", name: "Indian Democracy and Government", description: "Parliament, executive, judiciary and elections." },
      { code: "ss.civics.local", name: "Local Self-Government", description: "Panchayati raj and municipal institutions in MP." },
      { code: "ss.civics.un", name: "United Nations and International Bodies", description: "UN, its principal organs and major specialised agencies." },
      { code: "ss.economics", name: "Indian Economy", description: "Sectors of the economy, agriculture, industry, services and planning." },
      { code: "ss.environment", name: "Environment and Sustainable Development", description: "Pollution, climate change, conservation and environmental movements." },
      { code: "ss.art_culture_mp", name: "Art and Culture of MP", description: "Folk dances (Matki, Phulpati), music, painting, handicrafts and tribal heritage." },
      {
        code: "ss.pedagogy",
        name: "Pedagogical Issues in Social Studies",
        description: "Pedagogy specific to social studies at upper-primary level.",
        subtopics: [
          { code: "ss.pedagogy.nature", name: "Concept and Nature of Social Studies", description: "Scope, aims and objectives of social studies." },
          { code: "ss.pedagogy.classroom", name: "Classroom Processes and Discourse", description: "Discussion, debate and inquiry in social studies class." },
          { code: "ss.pedagogy.thinking", name: "Developing Critical Thinking", description: "Cultivating reasoning and analytical thinking." },
          { code: "ss.pedagogy.sources", name: "Primary and Secondary Sources", description: "Use of historical sources, data and maps." },
          { code: "ss.pedagogy.projects", name: "Project Work and Field Visits", description: "Project method and field-based learning." },
          { code: "ss.pedagogy.evaluation", name: "Evaluation in Social Studies", description: "Tools and techniques for assessing learning." },
        ],
      },
    ],
  },
];

export async function seedMpTetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "MP_TET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — MP_TET exam not found.");
  }
  console.log(`Seeding MP TET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < mpTetSyllabus.length; sIdx++) {
    const s = mpTetSyllabus[sIdx];
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
  seedMpTetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
