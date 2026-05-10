// CG TET (Chhattisgarh Teacher Eligibility Test) — full syllabus tree.
// Conducted by Chhattisgarh Professional Examination Board (CGPEB / VYAPAM).
// Two papers, each 150 MCQs × 1 mark = 150 marks in 150 minutes. No negative marking.
// Source: official CG VYAPAM CG TET notification & syllabus (vyapamcg.cgstate.gov.in),
// cross-checked with NCTE TET framework. Paper I (Class 1–5) and Paper II (Class 6–8).
// Languages on offer: Hindi (Lang I), English (Lang II) — predominantly Hindi-medium.
//
// Run after seedExams: npx tsx seed/exams/cg-tet-syllabus.ts

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

export const cgTetSyllabus: SubjectSeed[] = [
  // ── CHILD DEVELOPMENT & PEDAGOGY ──────────────────────────────────────
  {
    code: "CDP",
    name: "Child Development and Pedagogy (Bal Vikas evam Shiksha Shastra)",
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
          { code: "cdp.development.adolescence", name: "Adolescence (Paper II)", description: "Physical and emotional changes during adolescence." },
        ],
      },
      {
        code: "cdp.theories",
        name: "Theories of Learning",
        description: "Major theories of learning and their educational implications.",
        subtopics: [
          { code: "cdp.theories.behaviourism", name: "Behaviourism", description: "Pavlov, Thorndike, Skinner — classical and operant conditioning." },
          { code: "cdp.theories.gestalt", name: "Gestalt and Insight", description: "Perception, problem-solving and insight learning." },
          { code: "cdp.theories.piaget", name: "Piaget", description: "Cognitive development stages." },
          { code: "cdp.theories.vygotsky", name: "Vygotsky", description: "Socio-cultural theory, ZPD and scaffolding." },
        ],
      },
      {
        code: "cdp.intelligence",
        name: "Intelligence and Personality",
        description: "Intelligence, creativity and personality at school age.",
        subtopics: [
          { code: "cdp.intelligence.concept", name: "Concept of Intelligence", description: "Theories — Spearman, Thorndike, Thurstone, Gardner." },
          { code: "cdp.intelligence.measurement", name: "Measurement of Intelligence", description: "IQ, intelligence tests and educational implications." },
          { code: "cdp.intelligence.creativity", name: "Creativity", description: "Concept of creativity and identifying creative learners." },
          { code: "cdp.intelligence.personality", name: "Personality", description: "Theories and assessment of personality." },
        ],
      },
      {
        code: "cdp.individual",
        name: "Individual Differences and Inclusive Education",
        description: "Diverse learners and inclusive practices.",
        subtopics: [
          { code: "cdp.individual.diversity", name: "Diversity Among Learners", description: "Differences based on language, caste, gender, religion, region and ability." },
          { code: "cdp.individual.cwsn", name: "Children with Special Needs", description: "Identifying and supporting CWSN — sensory, motor and learning difficulties." },
          { code: "cdp.individual.gifted", name: "Talented Learners", description: "Differentiated strategies for gifted children." },
          { code: "cdp.individual.disadvantaged", name: "Disadvantaged Learners", description: "SC/ST/OBC, tribal and migrant children of Chhattisgarh." },
        ],
      },
      {
        code: "cdp.learning",
        name: "Learning and Pedagogy",
        description: "How children think and learn and the implications for teaching.",
        subtopics: [
          { code: "cdp.learning.process", name: "Concept of Learning", description: "Learning as construction of knowledge." },
          { code: "cdp.learning.motivation", name: "Motivation in Learning", description: "Maslow, McClelland — intrinsic and extrinsic motivation." },
          { code: "cdp.learning.problem", name: "Problem Solving", description: "Child as problem solver and scientific investigator." },
          { code: "cdp.learning.errors", name: "Children's Errors as Steps", description: "Children's errors as steps in the learning process." },
        ],
      },
      {
        code: "cdp.assessment",
        name: "Assessment, RTE and CCE",
        description: "Assessment and evaluation in elementary classrooms.",
        subtopics: [
          { code: "cdp.assessment.afl_aol", name: "Assessment for and of Learning", description: "Distinction between formative and summative assessment." },
          { code: "cdp.assessment.cce", name: "School-based Assessment and CCE", description: "Continuous comprehensive evaluation in primary classrooms." },
          { code: "cdp.assessment.rte", name: "RTE Act 2009", description: "Salient provisions of the Right to Education Act." },
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
      { code: "lang1.comprehension_prose", name: "Apathit Gadyansh", description: "Two unseen prose passages with comprehension and grammar questions." },
      { code: "lang1.comprehension_poem", name: "Apathit Padyansh", description: "Unseen poem with comprehension and figures of speech." },
      { code: "lang1.varna", name: "Varnamala", description: "Vowels, consonants and Devanagari script." },
      { code: "lang1.shabd_bhed", name: "Shabd Bhed", description: "Tatsam, tadbhav, deshi and videshi shabd." },
      { code: "lang1.sandhi", name: "Sandhi", description: "Swar sandhi, vyanjan sandhi and visarg sandhi." },
      { code: "lang1.samas", name: "Samas", description: "Six types of samas in Hindi." },
      { code: "lang1.upsarg_pratyay", name: "Upsarg aur Pratyay", description: "Prefixes and suffixes in Hindi." },
      { code: "lang1.parts_of_speech", name: "Parts of Speech", description: "Sangya, sarvanaam, visheshan, kriya etc." },
      { code: "lang1.gender_number_tense", name: "Ling, Vachan, Kaal", description: "Gender, number, tense and case." },
      { code: "lang1.vakya", name: "Vakyarachna", description: "Sentence structure, types and punctuation." },
      { code: "lang1.muhavare", name: "Muhavare aur Lokoktiyan", description: "Hindi idioms and proverbs." },
      { code: "lang1.alankar", name: "Alankar, Ras and Chhand", description: "Figures of speech, ras and Hindi metres." },
      { code: "lang1.synonyms", name: "Paryayvachi aur Vilom", description: "Synonyms and antonyms in Hindi." },
      {
        code: "lang1.pedagogy",
        name: "Pedagogy of Hindi",
        description: "Pedagogy for teaching Hindi at primary stage.",
        subtopics: [
          { code: "lang1.pedagogy.acquisition", name: "Acquisition vs Learning", description: "Difference between language acquisition and learning." },
          { code: "lang1.pedagogy.principles", name: "Principles of Hindi Teaching", description: "Aims and principles of teaching Hindi as the regional language." },
          { code: "lang1.pedagogy.lsrw", name: "LSRW Skills in Hindi", description: "Listening, speaking, reading and writing." },
          { code: "lang1.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbook, multimedia and ICT." },
          { code: "lang1.pedagogy.evaluation", name: "Evaluation", description: "Speaking, listening, reading and writing assessment." },
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
      { code: "lang2.comprehension", name: "Unseen Prose Passages", description: "Two unseen prose passages — comprehension, vocabulary and grammar." },
      { code: "lang2.poem", name: "Unseen Poem", description: "Unseen poem with comprehension and literary-device questions." },
      { code: "lang2.parts_of_speech", name: "Parts of Speech", description: "Noun, pronoun, verb, adverb, adjective, preposition, conjunction, interjection." },
      { code: "lang2.tense", name: "Tenses", description: "Present, past and future tense." },
      { code: "lang2.voice_narration", name: "Voice and Narration", description: "Active-passive voice; direct-indirect speech." },
      { code: "lang2.articles", name: "Articles and Determiners", description: "Use of a/an/the and determiners." },
      { code: "lang2.prepositions", name: "Prepositions", description: "Common prepositions in English." },
      { code: "lang2.subject_verb", name: "Subject-Verb Agreement", description: "Concord between subject and verb." },
      { code: "lang2.modals", name: "Modals", description: "Can, could, may, might, must, shall, should, will, would." },
      { code: "lang2.transformation", name: "Sentence Transformation", description: "Affirmative-negative, simple-compound-complex." },
      { code: "lang2.vocabulary", name: "Vocabulary", description: "Synonyms, antonyms, one-word substitution, homophones." },
      { code: "lang2.idioms", name: "Idioms and Phrases", description: "English idioms and phrasal verbs." },
      {
        code: "lang2.pedagogy",
        name: "Pedagogy of English",
        description: "Pedagogy of teaching English as a second language.",
        subtopics: [
          { code: "lang2.pedagogy.acquisition", name: "Acquisition vs Learning", description: "Difference between language acquisition and learning." },
          { code: "lang2.pedagogy.principles", name: "Principles of English Teaching", description: "Approaches and methods of teaching English." },
          { code: "lang2.pedagogy.lsrw", name: "LSRW Skills", description: "Listening, speaking, reading and writing in English." },
          { code: "lang2.pedagogy.errors", name: "Errors and Disorders", description: "Common errors and language disorders." },
          { code: "lang2.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbooks, audio-visual aids and ICT." },
          { code: "lang2.pedagogy.evaluation", name: "Evaluation", description: "Assessment of LSRW skills in English." },
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
      { code: "math.simple_interest", name: "Simple Interest", description: "Simple interest calculations." },
      { code: "math.ratio", name: "Ratio and Proportion", description: "Ratio, proportion and unitary method." },
      { code: "math.geometry", name: "Geometry", description: "Lines, angles and basic shapes." },
      { code: "math.mensuration", name: "Mensuration", description: "Area and perimeter of plane figures." },
      { code: "math.measurement", name: "Measurement", description: "Length, mass, capacity, time and temperature." },
      { code: "math.data_handling", name: "Data Handling", description: "Pictograph, bar graph and simple data interpretation." },
      { code: "math.money_time", name: "Money and Time", description: "Money calculations, calendar and clock." },
      {
        code: "math.pedagogy",
        name: "Pedagogy of Mathematics",
        description: "Mathematics-specific pedagogy at primary level.",
        subtopics: [
          { code: "math.pedagogy.nature", name: "Nature of Mathematics", description: "Mathematics as patterns and logical thinking." },
          { code: "math.pedagogy.curriculum", name: "Place of Mathematics in Curriculum", description: "Aims and importance of school mathematics." },
          { code: "math.pedagogy.community", name: "Community Mathematics", description: "Linking school mathematics with the local environment in Chhattisgarh." },
          { code: "math.pedagogy.evaluation", name: "Evaluation", description: "Formative, diagnostic and summative evaluation." },
          { code: "math.pedagogy.errors", name: "Error Analysis", description: "Identifying error patterns and remediation." },
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
      { code: "evs.family", name: "Family and Friends", description: "Family relationships and social bonds." },
      { code: "evs.food", name: "Food", description: "Sources of food, balanced diet and food preservation." },
      { code: "evs.shelter", name: "Shelter", description: "Houses across regions of Chhattisgarh and India." },
      { code: "evs.water", name: "Water", description: "Sources, conservation and water-borne diseases." },
      { code: "evs.travel", name: "Travel and Communication", description: "Modes of transport and communication." },
      { code: "evs.things_we_make", name: "Things We Make and Do", description: "Local crafts, bell-metal art and traditional occupations of Chhattisgarh." },
      { code: "evs.our_body", name: "Our Body and Health", description: "Body parts, sense organs, hygiene and common diseases." },
      { code: "evs.plants_animals", name: "Plants and Animals Around Us", description: "Plant and animal life and conservation." },
      { code: "evs.cg_geography", name: "Geography of Chhattisgarh", description: "Plateau region, rivers (Mahanadi, Indravati) and forests of Chhattisgarh." },
      { code: "evs.cg_culture", name: "Culture and Heritage of Chhattisgarh", description: "Tribal communities (Gond, Halba, Baiga), Hareli, Pola festivals and Pandavani." },
      { code: "evs.cg_minerals", name: "Minerals and Industry of Chhattisgarh", description: "Coal, iron ore deposits and major industries (Bhilai Steel)." },
      { code: "evs.solar_system", name: "Earth and Universe", description: "Earth's motion, solar system and basic space concepts." },
      { code: "evs.environmental_protection", name: "Environmental Protection", description: "Pollution, climate change and conservation." },
      {
        code: "evs.pedagogy",
        name: "Pedagogical Issues in EVS",
        description: "EVS pedagogy at primary level.",
        subtopics: [
          { code: "evs.pedagogy.scope", name: "Concept and Scope of EVS", description: "Significance and scope of environmental studies." },
          { code: "evs.pedagogy.integrated", name: "EVS as Integrated Subject", description: "Integration of science and social science." },
          { code: "evs.pedagogy.approaches", name: "Approaches to Teaching EVS", description: "Activity-based, experiment-based and discovery approaches." },
          { code: "evs.pedagogy.cce", name: "CCE in EVS", description: "Continuous comprehensive evaluation." },
          { code: "evs.pedagogy.tlm", name: "Teaching Aids", description: "Charts, models and ICT." },
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
      { code: "math_sci.quadratic", name: "Quadratic Equations", description: "Roots of quadratic equations." },
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
      { code: "math_sci.science.electricity", name: "Electricity and Magnetism", description: "Current, circuits and magnetic effects." },
      { code: "math_sci.science.environment", name: "Environment and Ecosystem", description: "Ecosystem, food chains and pollution." },
      {
        code: "math_sci.pedagogy",
        name: "Pedagogy of Math and Science",
        description: "Pedagogy specific to math and science.",
        subtopics: [
          { code: "math_sci.pedagogy.nature", name: "Nature of Math and Science", description: "Math and science as ways of knowing." },
          { code: "math_sci.pedagogy.methods", name: "Methods of Teaching", description: "Inquiry, project and experimental methods." },
          { code: "math_sci.pedagogy.lab", name: "Lab Work", description: "Lab safety and practical work." },
          { code: "math_sci.pedagogy.evaluation", name: "Evaluation", description: "Achievement, diagnostic and remedial assessment." },
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
      { code: "ss.history.modern", name: "Modern India", description: "British conquest, colonial rule and freedom struggle." },
      { code: "ss.history.cg", name: "History of Chhattisgarh", description: "Kalchuri, Maratha rule, statehood movement and tribal uprisings." },
      { code: "ss.geography.earth", name: "Earth and the Universe", description: "Solar system, latitudes, longitudes and motions." },
      { code: "ss.geography.physical", name: "Physical Features of India", description: "Mountains, plains, plateaus, rivers and climate." },
      { code: "ss.geography.resources", name: "Natural Resources", description: "Soil, water, forest, mineral and energy resources." },
      { code: "ss.geography.cg", name: "Geography of Chhattisgarh", description: "Physical features, climate, agriculture, minerals and forests." },
      { code: "ss.geography.world", name: "World Geography", description: "Continents, oceans and important countries." },
      { code: "ss.civics.constitution", name: "Indian Constitution", description: "Preamble, fundamental rights, duties and DPSPs." },
      { code: "ss.civics.democracy", name: "Indian Democracy", description: "Parliament, executive, judiciary and elections." },
      { code: "ss.civics.local", name: "Local Self-Government", description: "Panchayati raj and PESA Act in Chhattisgarh." },
      { code: "ss.economics", name: "Indian Economy", description: "Sectors of the economy and planning." },
      { code: "ss.environment", name: "Environment and Sustainable Development", description: "Pollution, climate change and conservation." },
      { code: "ss.cg_culture", name: "Culture of Chhattisgarh", description: "Tribal heritage, Pandavani, Panthi dance, folk music and festivals." },
      {
        code: "ss.pedagogy",
        name: "Pedagogical Issues in Social Studies",
        description: "Pedagogy specific to social studies.",
        subtopics: [
          { code: "ss.pedagogy.nature", name: "Concept and Nature of Social Studies", description: "Scope and aims of social studies." },
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

export async function seedCgTetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "CG_TET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — CG_TET exam not found.");
  }
  console.log(`Seeding CG TET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < cgTetSyllabus.length; sIdx++) {
    const s = cgTetSyllabus[sIdx];
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
  seedCgTetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
