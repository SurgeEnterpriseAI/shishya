// Bihar TET (BTET) — full syllabus tree.
// Conducted by Bihar School Examination Board (BSEB), Patna.
// Two papers, each 150 MCQs × 1 mark = 150 marks in 150 minutes. No negative marking.
// Source: official BSEB BTET notification & syllabus (biharboardonline.bihar.gov.in / bsebstet.org),
// cross-checked with NCTE TET framework. Paper I (Class 1–5) and Paper II (Class 6–8).
// Languages on offer for Lang I/II: Hindi, Urdu, Bengali, Sanskrit, English (Lang I differs from Lang II).
//
// Run after seedExams: npx tsx seed/exams/br-tet-syllabus.ts

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

export const brTetSyllabus: SubjectSeed[] = [
  // ── CHILD DEVELOPMENT & PEDAGOGY ──────────────────────────────────────
  {
    code: "CDP",
    name: "Child Development and Pedagogy",
    weight: 1,
    topics: [
      {
        code: "cdp.development",
        name: "Concept of Development and Learning",
        description: "Development of the elementary-school child and its relation to learning.",
        subtopics: [
          { code: "cdp.development.concept", name: "Concept of Development", description: "Definition, principles and dimensions of child development." },
          { code: "cdp.development.heredity_environment", name: "Heredity and Environment", description: "Influence of heredity and environment on development." },
          { code: "cdp.development.socialisation", name: "Socialisation Processes", description: "Role of family, peers, school and culture." },
          { code: "cdp.development.theorists", name: "Piaget, Kohlberg, Vygotsky", description: "Cognitive, moral and socio-cultural theories of development." },
          { code: "cdp.development.child_centred", name: "Child-centred and Progressive Education", description: "NCF-aligned philosophy of progressive education." },
        ],
      },
      {
        code: "cdp.intelligence",
        name: "Intelligence, Personality and Individual Differences",
        description: "Constructs of intelligence, personality and diversity in classrooms.",
        subtopics: [
          { code: "cdp.intelligence.concept", name: "Concept of Intelligence", description: "Critical perspective on the construct of intelligence." },
          { code: "cdp.intelligence.multi", name: "Multi-Dimensional Intelligence", description: "Gardner's theory of multiple intelligences." },
          { code: "cdp.intelligence.personality", name: "Personality and its Theories", description: "Allport, Cattell, Freud — theories and assessment of personality." },
          { code: "cdp.intelligence.individual_diff", name: "Individual Differences Among Learners", description: "Differences based on language, caste, gender, community, religion and ability." },
          { code: "cdp.intelligence.gender", name: "Gender as a Social Construct", description: "Gender roles, gender bias and educational practice." },
        ],
      },
      {
        code: "cdp.inclusive",
        name: "Inclusive Education and CWSN",
        description: "Addressing diverse and special-needs learners.",
        subtopics: [
          { code: "cdp.inclusive.disadvantaged", name: "Disadvantaged Learners", description: "SC/ST/minority/migrant children and equity in classrooms." },
          { code: "cdp.inclusive.cwsn", name: "Children with Disabilities", description: "Identifying and supporting CWSN — dyslexia, ADHD, sensory and motor impairments." },
          { code: "cdp.inclusive.gifted", name: "Talented and Creative Learners", description: "Differentiated strategies for gifted and creative children." },
        ],
      },
      {
        code: "cdp.learning",
        name: "Learning and Pedagogy",
        description: "How children think and learn and the implications for teaching.",
        subtopics: [
          { code: "cdp.learning.process", name: "How Children Think and Learn", description: "Why and how children fail to achieve success at school." },
          { code: "cdp.learning.basic", name: "Basic Processes of Teaching and Learning", description: "Children's strategies of learning; learning as a social activity." },
          { code: "cdp.learning.problem", name: "Child as Problem Solver", description: "View of the child as a constructor of knowledge." },
          { code: "cdp.learning.errors", name: "Alternative Conceptions of Learning", description: "Children's errors as significant steps in the learning process." },
          { code: "cdp.learning.cognition_emotion", name: "Cognition and Emotion", description: "Role of emotion in cognition and learning." },
          { code: "cdp.learning.motivation", name: "Motivation and Learning", description: "Intrinsic and extrinsic motivation; theories of motivation." },
          { code: "cdp.learning.factors", name: "Factors Contributing to Learning", description: "Heredity, attitude, attention, environment and their effect on learning." },
        ],
      },
      {
        code: "cdp.assessment",
        name: "Assessment and CCE",
        description: "Assessment and continuous evaluation in elementary classrooms.",
        subtopics: [
          { code: "cdp.assessment.afl_aol", name: "Assessment for and of Learning", description: "Distinction between formative and summative assessment." },
          { code: "cdp.assessment.cce", name: "School-Based Assessment and CCE", description: "Continuous comprehensive evaluation — perspective and practice." },
          { code: "cdp.assessment.questioning", name: "Formulating Appropriate Questions", description: "Questions to assess readiness and develop critical thinking." },
          { code: "cdp.assessment.rte", name: "RTE Act 2009", description: "Salient provisions of the Right to Education Act and its implementation." },
        ],
      },
    ],
  },

  // ── LANGUAGE I (Hindi) ────────────────────────────────────────────────
  {
    code: "LANG1",
    name: "Language I — Hindi / Urdu / Bengali",
    weight: 1,
    topics: [
      { code: "lang1.comprehension_prose", name: "Apathit Gadyansh", description: "Two unseen prose passages with comprehension, grammar and vocabulary questions." },
      { code: "lang1.comprehension_poem", name: "Apathit Padyansh", description: "Unseen poem with comprehension and literary devices." },
      { code: "lang1.varna", name: "Varnamala", description: "Vowels, consonants and pronunciation in the chosen Lang I script." },
      { code: "lang1.shabd_bhed", name: "Shabd Bhed", description: "Tatsam, tadbhav, deshi and videshi shabd; word categories." },
      { code: "lang1.sandhi", name: "Sandhi", description: "Swar sandhi, vyanjan sandhi and visarg sandhi rules." },
      { code: "lang1.samas", name: "Samas", description: "Tatpurush, dvandva, dvigu, karmadharaya, bahuvrihi and avyayibhav." },
      { code: "lang1.upsarg_pratyay", name: "Upsarg aur Pratyay", description: "Prefixes and suffixes in word formation." },
      { code: "lang1.parts_of_speech", name: "Parts of Speech", description: "Sangya, sarvanaam, visheshan, kriya, kriya-visheshan, samuchchaya, vismayadi (Hindi/Urdu/Bengali equivalents)." },
      { code: "lang1.gender_number_tense", name: "Ling, Vachan, Kaal", description: "Gender, number, tense and case forms." },
      { code: "lang1.vakya", name: "Vakyarachna", description: "Sentence structure, types and punctuation." },
      { code: "lang1.muhavare", name: "Muhavare aur Lokoktiyan", description: "Idioms and proverbs in the chosen Lang I." },
      { code: "lang1.alankar_ras", name: "Alankar aur Ras", description: "Figures of speech and ras in literary appreciation." },
      { code: "lang1.synonyms", name: "Paryayvachi aur Vilom", description: "Synonyms and antonyms." },
      {
        code: "lang1.pedagogy",
        name: "Pedagogy of Language Development",
        description: "Pedagogical concepts for teaching the chosen Lang I.",
        subtopics: [
          { code: "lang1.pedagogy.acquisition", name: "Learning and Acquisition", description: "Difference between language acquisition and learning; Krashen's principles." },
          { code: "lang1.pedagogy.principles", name: "Principles of Language Teaching", description: "Aims and principles of teaching the regional language." },
          { code: "lang1.pedagogy.lsrw", name: "LSRW Skills", description: "Listening, speaking, reading and writing — integrated approach." },
          { code: "lang1.pedagogy.grammar_role", name: "Role of Grammar", description: "Critical perspective on the role of grammar at primary stage." },
          { code: "lang1.pedagogy.diverse", name: "Multilingual Classroom", description: "Challenges of teaching language in a multilingual setting." },
          { code: "lang1.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbook, multimedia materials and multilingual resources." },
          { code: "lang1.pedagogy.evaluation", name: "Evaluating Language Proficiency", description: "Speaking, listening, reading and writing assessment." },
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
      { code: "lang2.poem", name: "Unseen Poem", description: "Unseen poem with literary-device and inference questions." },
      { code: "lang2.parts_of_speech", name: "Parts of Speech", description: "Noun, pronoun, verb, adverb, adjective, preposition, conjunction, interjection." },
      { code: "lang2.tense", name: "Tenses", description: "Twelve tenses — present, past and future forms." },
      { code: "lang2.voice_narration", name: "Voice and Narration", description: "Active-passive voice and direct-indirect speech." },
      { code: "lang2.articles", name: "Articles and Determiners", description: "Use of a/an/the and other determiners." },
      { code: "lang2.prepositions", name: "Prepositions", description: "Common prepositions and their usage." },
      { code: "lang2.subject_verb", name: "Subject-Verb Agreement", description: "Concord and agreement between subject and verb." },
      { code: "lang2.modals", name: "Modals", description: "Can, could, may, might, must, shall, should, will, would, ought to." },
      { code: "lang2.transformation", name: "Sentence Transformation", description: "Transformation between simple, compound and complex sentences." },
      { code: "lang2.vocabulary", name: "Vocabulary", description: "Synonyms, antonyms, one-word substitution, homophones." },
      { code: "lang2.idioms", name: "Idioms and Phrases", description: "Idioms and phrasal verbs in English." },
      {
        code: "lang2.pedagogy",
        name: "Pedagogy of English",
        description: "Pedagogy of English as a second language.",
        subtopics: [
          { code: "lang2.pedagogy.acquisition", name: "Acquisition vs Learning", description: "Difference between language acquisition and language learning." },
          { code: "lang2.pedagogy.principles", name: "Principles of English Teaching", description: "Approaches, methods and principles." },
          { code: "lang2.pedagogy.lsrw", name: "LSRW Skills", description: "Listening, speaking, reading and writing in English." },
          { code: "lang2.pedagogy.errors", name: "Errors and Disorders", description: "Common errors and language disorders in multilingual classes." },
          { code: "lang2.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbooks, audio-visual aids and ICT for English." },
          { code: "lang2.pedagogy.evaluation", name: "Evaluation in English", description: "Assessment of LSRW skills." },
        ],
      },
    ],
  },

  // ── MATHEMATICS (Paper I — Primary) ──────────────────────────────────
  {
    code: "MATH",
    name: "Mathematics (Paper I)",
    weight: 1,
    topics: [
      { code: "math.numbers", name: "Number System", description: "Whole numbers, integers, place value, factors and multiples." },
      { code: "math.fractions", name: "Fractions and Decimals", description: "Operations on fractions and decimals." },
      { code: "math.lcm_hcf", name: "LCM and HCF", description: "Lowest common multiple and highest common factor." },
      { code: "math.percentage", name: "Percentage", description: "Percentage and applications." },
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
        description: "Mathematics-specific pedagogy at primary level.",
        subtopics: [
          { code: "math.pedagogy.nature", name: "Nature of Mathematics", description: "Mathematics as a science of patterns and logical thinking." },
          { code: "math.pedagogy.curriculum", name: "Place of Mathematics in Curriculum", description: "Aims, objectives and importance of school mathematics." },
          { code: "math.pedagogy.language", name: "Language of Mathematics", description: "Symbols, terms and discourse of mathematics." },
          { code: "math.pedagogy.community", name: "Community Mathematics", description: "Linking school mathematics with the local environment." },
          { code: "math.pedagogy.evaluation", name: "Evaluation in Mathematics", description: "Formative, diagnostic and summative evaluation." },
          { code: "math.pedagogy.errors", name: "Error Analysis and Remedial Teaching", description: "Identifying error patterns and providing remediation." },
          { code: "math.pedagogy.problems", name: "Problems of Teaching", description: "Math anxiety, abstraction and challenges of mixed-ability classrooms." },
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
      { code: "evs.family_friends", name: "Family and Friends", description: "Family relationships, peers, animals and friendships." },
      { code: "evs.food", name: "Food", description: "Sources of food, balanced diet and food preservation." },
      { code: "evs.shelter", name: "Shelter", description: "Houses across regions of Bihar and India." },
      { code: "evs.water", name: "Water", description: "Sources, conservation, purification and water-borne diseases." },
      { code: "evs.travel", name: "Travel and Communication", description: "Modes of transport and communication." },
      { code: "evs.things_we_make", name: "Things We Make and Do", description: "Local crafts, handicrafts and traditional occupations of Bihar." },
      { code: "evs.our_body", name: "Our Body and Health", description: "Body parts, sense organs, hygiene and common diseases." },
      { code: "evs.plants_animals", name: "Plants and Animals Around Us", description: "Plant and animal life and conservation." },
      { code: "evs.bihar_geography", name: "Geography of Bihar", description: "Location, rivers (Ganga, Kosi), forests and climate of Bihar." },
      { code: "evs.bihar_culture", name: "Culture and Heritage of Bihar", description: "Folk dances (Jat-Jatin), festivals (Chhath), Madhubani painting and tribal communities of Bihar." },
      { code: "evs.solar_system", name: "Earth and Universe", description: "Earth's motion, solar system and basic space concepts." },
      { code: "evs.environmental_protection", name: "Environmental Protection", description: "Pollution, climate change, conservation and sustainable development." },
      {
        code: "evs.pedagogy",
        name: "Pedagogical Issues in EVS",
        description: "EVS-specific pedagogy at primary level.",
        subtopics: [
          { code: "evs.pedagogy.scope", name: "Concept and Scope of EVS", description: "Significance and scope of environmental studies." },
          { code: "evs.pedagogy.integrated", name: "EVS as Integrated Subject", description: "Integration of science and social science in EVS." },
          { code: "evs.pedagogy.approaches", name: "Approaches to Teaching EVS", description: "Activity-based and discovery approaches." },
          { code: "evs.pedagogy.cce", name: "CCE in EVS", description: "Continuous comprehensive evaluation." },
          { code: "evs.pedagogy.tlm", name: "Teaching Aids and Materials", description: "Charts, models and ICT in EVS." },
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
      { code: "math_sci.mensuration", name: "Mensuration", description: "Area, surface area and volume of plane figures and solids." },
      { code: "math_sci.statistics", name: "Statistics and Probability", description: "Mean, median, mode and elementary probability." },
      { code: "math_sci.trigonometry", name: "Introduction to Trigonometry", description: "Trigonometric ratios and basic identities." },
      { code: "math_sci.science.living", name: "Living and Non-living", description: "Characteristics of living things and basic classification." },
      { code: "math_sci.science.human_body", name: "Human Body Systems", description: "Digestive, respiratory, circulatory, nervous and reproductive systems." },
      { code: "math_sci.science.plant", name: "Plant Life", description: "Photosynthesis, transpiration and plant nutrition." },
      { code: "math_sci.science.matter", name: "Matter and its Nature", description: "Atoms, molecules, elements and compounds." },
      { code: "math_sci.science.acids", name: "Acids, Bases and Salts", description: "Properties of acids, bases, salts and pH scale." },
      { code: "math_sci.science.force", name: "Force, Motion and Energy", description: "Force, motion, work, energy and Newton's laws." },
      { code: "math_sci.science.heat_light_sound", name: "Heat, Light and Sound", description: "Heat transfer, reflection/refraction of light and sound waves." },
      { code: "math_sci.science.electricity", name: "Electricity and Magnetism", description: "Current, circuits and magnetic effects." },
      { code: "math_sci.science.environment", name: "Environment and Ecosystem", description: "Ecosystem, food chains and pollution." },
      {
        code: "math_sci.pedagogy",
        name: "Pedagogy of Math and Science",
        description: "Pedagogy specific to math and science at upper-primary level.",
        subtopics: [
          { code: "math_sci.pedagogy.nature", name: "Nature and Aims", description: "Nature, aims and structure of math and science." },
          { code: "math_sci.pedagogy.methods", name: "Methods of Teaching", description: "Inquiry, project, demonstration and experimental methods." },
          { code: "math_sci.pedagogy.lab", name: "Lab and Practical Work", description: "Lab safety and equipment in science teaching." },
          { code: "math_sci.pedagogy.evaluation", name: "Evaluation", description: "Achievement test, diagnostic test and remedial work." },
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
      { code: "ss.history.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Mauryan and Gupta empires." },
      { code: "ss.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals, bhakti and sufi movements." },
      { code: "ss.history.modern", name: "Modern India and Freedom Struggle", description: "British conquest, colonial rule and freedom struggle." },
      { code: "ss.history.bihar", name: "History of Bihar", description: "Magadh, Nalanda, Champaran Satyagraha and Bihar's role in freedom struggle." },
      { code: "ss.geography.earth", name: "Earth and the Universe", description: "Solar system, latitudes, longitudes and motions." },
      { code: "ss.geography.physical", name: "Physical Features of India", description: "Mountains, plains, plateaus, rivers and climate." },
      { code: "ss.geography.resources", name: "Natural Resources", description: "Soil, water, forest, mineral and energy resources." },
      { code: "ss.geography.bihar", name: "Geography of Bihar", description: "Physical features, climate, agriculture and minerals of Bihar." },
      { code: "ss.geography.world", name: "World Geography", description: "Continents, oceans and important countries." },
      { code: "ss.civics.constitution", name: "Indian Constitution", description: "Preamble, fundamental rights, duties and DPSPs." },
      { code: "ss.civics.democracy", name: "Indian Democracy", description: "Parliament, executive, judiciary and elections." },
      { code: "ss.civics.local", name: "Local Self-Government", description: "Panchayati raj and municipal institutions in Bihar." },
      { code: "ss.economics", name: "Indian Economy", description: "Sectors of the economy, agriculture, industry and services." },
      { code: "ss.environment", name: "Environment and Sustainable Development", description: "Pollution, climate change and conservation." },
      { code: "ss.bihar_culture", name: "Art and Culture of Bihar", description: "Folk dances (Bhojpuri, Mithila), Madhubani art, festivals and architecture." },
      {
        code: "ss.pedagogy",
        name: "Pedagogical Issues in Social Studies",
        description: "Pedagogy specific to social studies at upper-primary level.",
        subtopics: [
          { code: "ss.pedagogy.nature", name: "Concept and Nature of Social Studies", description: "Scope and aims of social studies." },
          { code: "ss.pedagogy.classroom", name: "Classroom Processes", description: "Discussion, debate and inquiry in social studies." },
          { code: "ss.pedagogy.thinking", name: "Critical Thinking", description: "Cultivating reasoning and analytical thinking." },
          { code: "ss.pedagogy.sources", name: "Primary and Secondary Sources", description: "Use of historical sources, data and maps." },
          { code: "ss.pedagogy.projects", name: "Project Work and Field Visits", description: "Project method and field-based learning." },
          { code: "ss.pedagogy.evaluation", name: "Evaluation in Social Studies", description: "Tools and techniques for assessing learning." },
        ],
      },
    ],
  },
];

export async function seedBrTetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "BR_TET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — BR_TET exam not found.");
  }
  console.log(`Seeding Bihar TET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < brTetSyllabus.length; sIdx++) {
    const s = brTetSyllabus[sIdx];
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
  seedBrTetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
