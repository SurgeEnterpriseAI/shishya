// JKTET (Jammu & Kashmir Teacher Eligibility Test) — full syllabus tree.
// Conducted by J&K Board of School Education (JKBOSE) / J&K SED.
// Two papers, each 150 MCQs × 1 mark = 150 marks in 150 minutes. No negative marking.
// Source: official JKBOSE JKTET notification & syllabus (jkbose.nic.in / jkbose.co.in),
// cross-checked with NCTE TET framework. Paper I (Class 1–5) and Paper II (Class 6–8).
// Languages on offer for Lang I/II: English, Urdu, Kashmiri, Hindi, Dogri (Lang II differs from Lang I).
//
// Run after seedExams: npx tsx seed/exams/jk-tet-syllabus.ts

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

export const jkTetSyllabus: SubjectSeed[] = [
  // ── CHILD DEVELOPMENT & PEDAGOGY ──────────────────────────────────────
  {
    code: "CDP",
    name: "Child Development and Pedagogy",
    weight: 1,
    topics: [
      {
        code: "cdp.development",
        name: "Concept of Development",
        description: "Concept of growth and development and principles.",
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
          { code: "cdp.theories.gestalt", name: "Gestalt and Insight", description: "Köhler's insight learning and Gestalt principles." },
          { code: "cdp.theories.piaget", name: "Piaget", description: "Cognitive development stages." },
          { code: "cdp.theories.vygotsky", name: "Vygotsky", description: "Socio-cultural theory and ZPD." },
        ],
      },
      {
        code: "cdp.intelligence",
        name: "Intelligence and Personality",
        description: "Intelligence, creativity and personality.",
        subtopics: [
          { code: "cdp.intelligence.concept", name: "Concept and Theories of Intelligence", description: "Spearman, Thorndike, Thurstone, Gardner — multi-dimensional intelligence." },
          { code: "cdp.intelligence.measurement", name: "Measurement of Intelligence", description: "IQ and intelligence tests." },
          { code: "cdp.intelligence.creativity", name: "Creativity", description: "Concept of creativity and identifying creative learners." },
          { code: "cdp.intelligence.personality", name: "Personality", description: "Theories and assessment of personality." },
        ],
      },
      {
        code: "cdp.individual",
        name: "Individual Differences and Inclusive Education",
        description: "Diverse learners and inclusive practices.",
        subtopics: [
          { code: "cdp.individual.diversity", name: "Diversity Among Learners", description: "Differences based on language, religion, region, gender and ability." },
          { code: "cdp.individual.cwsn", name: "Children with Special Needs", description: "Identifying and supporting CWSN." },
          { code: "cdp.individual.gifted", name: "Gifted and Creative Learners", description: "Differentiated strategies for gifted children." },
          { code: "cdp.individual.disadvantaged", name: "Disadvantaged Learners", description: "Marginalised, migrant and conflict-affected children of J&K." },
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
        description: "Assessment and continuous evaluation.",
        subtopics: [
          { code: "cdp.assessment.afl_aol", name: "Assessment for and of Learning", description: "Distinction between formative and summative assessment." },
          { code: "cdp.assessment.cce", name: "School-based Assessment and CCE", description: "Continuous comprehensive evaluation." },
          { code: "cdp.assessment.rte", name: "RTE Act 2009", description: "Salient provisions of the Right to Education Act applied in J&K." },
        ],
      },
    ],
  },

  // ── LANGUAGE I (English / Urdu / Kashmiri / Hindi / Dogri) ───────────
  {
    code: "LANG1",
    name: "Language I — English / Urdu / Kashmiri / Hindi / Dogri",
    weight: 1,
    topics: [
      { code: "lang1.comprehension_prose", name: "Unseen Prose Passages", description: "Two unseen prose passages with comprehension and grammar questions in chosen Lang I." },
      { code: "lang1.comprehension_poem", name: "Unseen Poem", description: "Unseen poem with comprehension and figures of speech." },
      { code: "lang1.script", name: "Script and Phonology", description: "Vowels, consonants and script (Devanagari/Nastaliq/Roman/Sharada-Perso-Arabic for Kashmiri)." },
      { code: "lang1.parts_of_speech", name: "Parts of Speech", description: "Parts of speech in the chosen Lang I." },
      { code: "lang1.tense_case", name: "Tense, Gender, Number, Case", description: "Tense, gender, number and case forms." },
      { code: "lang1.vakya", name: "Sentence Structure", description: "Sentence types and punctuation." },
      { code: "lang1.idioms", name: "Idioms and Proverbs", description: "Idioms and proverbs in the chosen Lang I." },
      { code: "lang1.synonyms", name: "Synonyms and Antonyms", description: "Synonyms and antonyms." },
      { code: "lang1.literature", name: "Literature of Lang I", description: "Major writers and poets in chosen Lang I — Habba Khatoon, Lal Ded, Rasul Mir for Kashmiri etc." },
      { code: "lang1.kashmiri_specific", name: "Kashmiri-Specific Topics", description: "Kashmiri vocabulary, gender, case forms and folk literature for Kashmiri Lang I papers." },
      { code: "lang1.urdu_specific", name: "Urdu-Specific Topics", description: "Urdu vocabulary, tasrif, sarf-o-nahw and shayri (ghazal, nazm) for Urdu papers." },
      {
        code: "lang1.pedagogy",
        name: "Pedagogy of Language Development",
        description: "Pedagogy for teaching the chosen Lang I at school stage.",
        subtopics: [
          { code: "lang1.pedagogy.acquisition", name: "Acquisition vs Learning", description: "Difference between language acquisition and learning." },
          { code: "lang1.pedagogy.principles", name: "Principles of Language Teaching", description: "Aims and principles of teaching the regional language." },
          { code: "lang1.pedagogy.lsrw", name: "LSRW Skills", description: "Listening, speaking, reading and writing." },
          { code: "lang1.pedagogy.diverse", name: "Multilingual Classroom", description: "Challenges of teaching language in multilingual J&K classrooms." },
          { code: "lang1.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbook, multimedia and multilingual resources." },
          { code: "lang1.pedagogy.evaluation", name: "Evaluation in Language", description: "Speaking, listening, reading and writing assessment." },
        ],
      },
    ],
  },

  // ── LANGUAGE II (English / Urdu / Hindi) ─────────────────────────────
  {
    code: "LANG2",
    name: "Language II — English / Urdu / Hindi",
    weight: 1,
    topics: [
      { code: "lang2.comprehension", name: "Unseen Prose Passages", description: "Two unseen prose passages — comprehension, vocabulary and grammar." },
      { code: "lang2.poem", name: "Unseen Poem", description: "Unseen poem with comprehension and literary-device questions." },
      { code: "lang2.parts_of_speech", name: "Parts of Speech", description: "Parts of speech in chosen Lang II." },
      { code: "lang2.tense", name: "Tenses", description: "Present, past and future tense forms." },
      { code: "lang2.voice_narration", name: "Voice and Narration", description: "Active-passive voice; direct-indirect speech." },
      { code: "lang2.articles_prepositions", name: "Articles and Prepositions", description: "Use of articles and prepositions." },
      { code: "lang2.subject_verb", name: "Subject-Verb Agreement", description: "Concord between subject and verb." },
      { code: "lang2.transformation", name: "Sentence Transformation", description: "Transformation between sentence types." },
      { code: "lang2.vocabulary", name: "Vocabulary", description: "Synonyms, antonyms and one-word substitution." },
      { code: "lang2.idioms", name: "Idioms and Phrases", description: "Idioms and phrasal verbs." },
      {
        code: "lang2.pedagogy",
        name: "Pedagogy of Lang II",
        description: "Pedagogy of teaching second language.",
        subtopics: [
          { code: "lang2.pedagogy.acquisition", name: "Acquisition vs Learning", description: "Difference between language acquisition and learning." },
          { code: "lang2.pedagogy.principles", name: "Principles of Lang II Teaching", description: "Approaches and methods." },
          { code: "lang2.pedagogy.lsrw", name: "LSRW Skills", description: "Listening, speaking, reading and writing." },
          { code: "lang2.pedagogy.errors", name: "Errors and Disorders", description: "Common errors in multilingual settings." },
          { code: "lang2.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbooks, audio-visual aids and ICT." },
          { code: "lang2.pedagogy.evaluation", name: "Evaluation", description: "Assessment of LSRW skills in Lang II." },
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
        description: "Mathematics-specific pedagogy.",
        subtopics: [
          { code: "math.pedagogy.nature", name: "Nature of Mathematics", description: "Mathematics as patterns and logical thinking." },
          { code: "math.pedagogy.curriculum", name: "Place of Mathematics in Curriculum", description: "Aims and importance of school mathematics." },
          { code: "math.pedagogy.community", name: "Community Mathematics", description: "Linking school mathematics with the local environment in J&K." },
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
      { code: "evs.shelter", name: "Shelter", description: "Houses across regions of J&K — Kashmir, Jammu and Ladakh." },
      { code: "evs.water", name: "Water", description: "Sources, conservation and water-borne diseases." },
      { code: "evs.travel", name: "Travel and Communication", description: "Modes of transport and communication in mountainous regions." },
      { code: "evs.things_we_make", name: "Things We Make and Do", description: "Local crafts (Pashmina, papier-mache, walnut woodwork) and traditional occupations." },
      { code: "evs.our_body", name: "Our Body and Health", description: "Body parts, sense organs, hygiene and common diseases." },
      { code: "evs.plants_animals", name: "Plants and Animals Around Us", description: "Plant and animal life of the Himalayan region." },
      { code: "evs.jk_geography", name: "Geography of J&K", description: "Kashmir Valley, Jammu plains, Pir Panjal range, rivers (Jhelum, Chenab) and Dal Lake." },
      { code: "evs.jk_culture", name: "Culture and Heritage of J&K", description: "Folk dances (Rouf, Dumhal), festivals (Eid, Lohri, Hemis) and cultural diversity." },
      { code: "evs.jk_history", name: "History of J&K", description: "Ancient kingdoms, accession to India and modern statehood developments." },
      { code: "evs.solar_system", name: "Earth and Universe", description: "Earth's motion, solar system and basic space concepts." },
      { code: "evs.environmental_protection", name: "Environmental Protection", description: "Pollution, climate change, glacier retreat and Himalayan conservation." },
      {
        code: "evs.pedagogy",
        name: "Pedagogical Issues in EVS",
        description: "EVS-specific pedagogy.",
        subtopics: [
          { code: "evs.pedagogy.scope", name: "Concept and Scope of EVS", description: "Significance and scope of environmental studies." },
          { code: "evs.pedagogy.integrated", name: "EVS as Integrated Subject", description: "Integration of science and social science." },
          { code: "evs.pedagogy.approaches", name: "Approaches to Teaching EVS", description: "Activity-based and discovery approaches." },
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
      { code: "ss.history.jk", name: "History of J&K", description: "Ancient Kashmir, Sultans of Kashmir, Dogra rule and accession to India." },
      { code: "ss.geography.earth", name: "Earth and the Universe", description: "Solar system, latitudes, longitudes and motions." },
      { code: "ss.geography.physical", name: "Physical Features of India", description: "Mountains, plains, plateaus, rivers and climate." },
      { code: "ss.geography.resources", name: "Natural Resources", description: "Soil, water, forest, mineral and energy resources." },
      { code: "ss.geography.jk", name: "Geography of J&K", description: "Kashmir Valley, Jammu region, Ladakh, glaciers and rivers." },
      { code: "ss.geography.world", name: "World Geography", description: "Continents, oceans and important countries." },
      { code: "ss.civics.constitution", name: "Indian Constitution", description: "Preamble, fundamental rights, duties and DPSPs." },
      { code: "ss.civics.democracy", name: "Indian Democracy", description: "Parliament, executive, judiciary and elections." },
      { code: "ss.civics.local", name: "Local Self-Government", description: "Panchayati raj and municipal institutions in J&K." },
      { code: "ss.economics", name: "Indian Economy", description: "Sectors of the economy, agriculture, industry and services." },
      { code: "ss.environment", name: "Environment and Sustainable Development", description: "Pollution, climate change and conservation." },
      { code: "ss.jk_culture", name: "Culture of J&K", description: "Sufi tradition, Kashmiri Shaivism, folk culture and arts." },
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

export async function seedJkTetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "JK_KASHMIR_TET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — JK_KASHMIR_TET exam not found.");
  }
  console.log(`Seeding JKTET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < jkTetSyllabus.length; sIdx++) {
    const s = jkTetSyllabus[sIdx];
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
  seedJkTetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
