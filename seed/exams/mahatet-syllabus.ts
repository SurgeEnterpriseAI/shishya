// MAHA TET (Maharashtra Teacher Eligibility Test) — full syllabus tree.
// Conducted by Maharashtra State Council of Examination (MSCE), Pune.
// Two papers, each 150 MCQs × 1 mark = 150 marks in 150 minutes. No negative marking.
// Source: official MAHA TET notification & syllabus (mahatet.in / mscepune.in),
// cross-checked with NCTE TET framework. Covers Paper I (Class 1–5) and Paper II (Class 6–8).
// Languages on offer for Lang I/II: Marathi, English, Urdu, Hindi, Bengali, Gujarati,
// Telugu, Sindhi, Kannada (one as Lang I, one as Lang II — different from Lang I).
//
// Run after seedExams: npx tsx seed/exams/mahatet-syllabus.ts

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

export const mahatetSyllabus: SubjectSeed[] = [
  // ── CHILD DEVELOPMENT & PEDAGOGY ──────────────────────────────────────
  {
    code: "CDP",
    name: "Child Development and Pedagogy",
    weight: 1,
    topics: [
      { code: "cdp.development", name: "Development of Child",
        description: "Concept of development and the factors influencing it.",
        subtopics: [
          { code: "cdp.development.growth_maturation", name: "Growth, Maturation and Development", description: "Definitions, distinctions and their relationship with learning." },
          { code: "cdp.development.principles", name: "Principles of Development", description: "Continuity, sequence, individual differences and integration." },
          { code: "cdp.development.factors", name: "Biological, Psychological and Sociological Factors", description: "Influence of biological, psychological and sociological factors on development." },
          { code: "cdp.development.dimensions", name: "Dimensions of Development", description: "Physical, motor, cognitive, emotional, social, moral and language development." },
          { code: "cdp.development.theorists", name: "Theorists of Development", description: "Piaget, Kohlberg, Chomsky, Carl Rogers and their contributions." },
          { code: "cdp.development.individual_differences", name: "Individual Differences", description: "Differences in attitudes, aptitude, intelligence and personality." },
          { code: "cdp.development.personality", name: "Personality and Mental Health", description: "Personality theories and mental health of school-age children." },
          { code: "cdp.development.methods", name: "Methods of Studying the Child", description: "Observation, interview and case-study methods." },
        ],
      },
      { code: "cdp.learning", name: "Understanding Learning",
        description: "Concept of learning and approaches to its study.",
        subtopics: [
          { code: "cdp.learning.concept", name: "Concept and Nature of Learning", description: "Learning as input, process and outcome." },
          { code: "cdp.learning.factors", name: "Personal and Environmental Factors", description: "Factors that influence learning at primary and upper-primary level." },
          { code: "cdp.learning.behaviourism", name: "Behaviouristic Approach", description: "Pavlov, Thorndike and Skinner — classical and operant conditioning." },
          { code: "cdp.learning.constructivism", name: "Constructivist Approach", description: "Piaget and Vygotsky — knowledge as constructed by the learner." },
          { code: "cdp.learning.gestalt", name: "Gestalt Approach", description: "Perception, insight and problem solving as a whole." },
          { code: "cdp.learning.observational", name: "Observational Approach", description: "Bandura's social-learning theory and modelling." },
          { code: "cdp.learning.motivation", name: "Motivation and Learning", description: "Concept, theories and applications of motivation." },
          { code: "cdp.learning.memory", name: "Memory, Forgetting and Transfer", description: "Memory types, theories of forgetting and transfer of learning." },
        ],
      },
      { code: "cdp.pedagogical_concerns", name: "Pedagogical Concerns",
        description: "Teaching, planning, classroom management and assessment.",
        subtopics: [
          { code: "cdp.pedagogical_concerns.relationships", name: "Teaching-Learner Relationships", description: "Teacher-pupil interaction in elementary classrooms." },
          { code: "cdp.pedagogical_concerns.diverse", name: "Diverse Learners and Inclusive Education", description: "Children from diverse backgrounds, CWSN and inclusive practice." },
          { code: "cdp.pedagogical_concerns.methods", name: "Methods of Teaching-Learning", description: "Inquiry, project, observation and activity-based learning." },
          { code: "cdp.pedagogical_concerns.classroom", name: "Heterogeneous Classroom Organisation", description: "Managing classrooms with diverse learners." },
          { code: "cdp.pedagogical_concerns.lesson_planning", name: "Lesson Planning and Phases", description: "Pre-active, interactive and post-active phases of teaching." },
          { code: "cdp.pedagogical_concerns.management", name: "Classroom Management and Behaviour", description: "Discipline, motivation and child rights." },
          { code: "cdp.pedagogical_concerns.assessment", name: "Assessment for and of Learning, CCE", description: "Distinction between assessment for and of learning; CCE practice." },
          { code: "cdp.pedagogical_concerns.policy", name: "NCF 2005 and RTE Act (Paper II)", description: "Provisions of NCF 2005 and the Right to Education Act 2009." },
        ],
      },
    ],
  },

  // ── LANGUAGE I (Marathi) ──────────────────────────────────────────────
  {
    code: "LANG1",
    name: "Language I — Marathi",
    weight: 1,
    topics: [
      { code: "lang1.comprehension", name: "Apathit Gadya / Padya Vaachan", description: "Two unseen passages (prose and poetry) with comprehension and grammar questions." },
      { code: "lang1.varna_uchchar", name: "Varna and Uchchar", description: "Marathi vowels, consonants, syllables and pronunciation." },
      { code: "lang1.shabd_siddhi", name: "Shabd Siddhi", description: "Word formation, tatsam-tadbhav, deshi and foreign-origin words." },
      { code: "lang1.sandhi", name: "Sandhi", description: "Swar sandhi, vyanjan sandhi and visarg sandhi rules in Marathi." },
      { code: "lang1.samas", name: "Samas", description: "Tatpurush, dvandva, dvigu, karmadharaya, bahuvrihi and avyayibhav." },
      { code: "lang1.upsarg_pratyay", name: "Upsarg and Pratyay", description: "Prefixes and suffixes in Marathi." },
      { code: "lang1.parts_of_speech", name: "Shabdancha Prakar (Parts of Speech)", description: "Naam, sarvanaam, visheshan, kriyapad, avyay etc." },
      { code: "lang1.gender_number_tense", name: "Ling, Vachan, Kaal", description: "Gender, number, tense and case in Marathi sentences." },
      { code: "lang1.vakya", name: "Vakyarachna and Punctuation", description: "Sentence structure, types and punctuation in Marathi." },
      { code: "lang1.muhavare", name: "Muhavare and Mhani", description: "Marathi idioms and proverbs." },
      { code: "lang1.alankar", name: "Alankar and Ras", description: "Figures of speech and ras in Marathi literature." },
      { code: "lang1.synonyms_antonyms", name: "Samanarthi and Virudharthi Shabd", description: "Synonyms and antonyms in Marathi." },
      { code: "lang1.three_lang_formula", name: "Three-Language Formula (Paper II)", description: "Place of Marathi in the three-language formula." },
      { code: "lang1.pedagogy", name: "Pedagogy of Marathi Language",
        description: "Pedagogical principles for teaching Marathi at primary and upper-primary level.",
        subtopics: [
          { code: "lang1.pedagogy.principles", name: "Principles of Language Teaching", description: "Aims, principles and approaches to teaching Marathi." },
          { code: "lang1.pedagogy.skills", name: "Listening, Speaking, Reading, Writing", description: "Development of LSRW skills in Marathi." },
          { code: "lang1.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbooks, audio-visual aids and ICT for Marathi." },
          { code: "lang1.pedagogy.evaluation", name: "Evaluation in Marathi", description: "Assessment of comprehension, expression and grammar." },
          { code: "lang1.pedagogy.remedial", name: "Remedial Teaching", description: "Diagnostic and remedial work in Marathi." },
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
      { code: "lang2.comprehension", name: "Unseen Prose Passages",
        description: "Two unseen prose passages — discursive, literary, narrative or scientific.",
        subtopics: [
          { code: "lang2.comprehension.understanding", name: "Comprehension Questions", description: "Main idea, inference and detail questions." },
          { code: "lang2.comprehension.vocabulary", name: "Vocabulary in Context", description: "Word meaning, synonyms and antonyms in context." },
          { code: "lang2.comprehension.grammar", name: "Grammar from Passage", description: "Grammar questions tied to the passage." },
        ],
      },
      { code: "lang2.parts_of_speech", name: "Parts of Speech and Tenses", description: "Noun, pronoun, verb, adjective, adverb, preposition, conjunction; tenses." },
      { code: "lang2.voice_articles", name: "Voice, Articles and Prepositions", description: "Active/passive voice, articles and common prepositions." },
      { code: "lang2.degrees_clauses", name: "Degrees of Comparison and Clauses", description: "Positive/comparative/superlative; main and subordinate clauses." },
      { code: "lang2.verbs_adverbs", name: "Verbs, Adverbs and Conjunctions", description: "Types of verbs, adverbs and connectors in English." },
      { code: "lang2.narration", name: "Direct and Indirect Speech", description: "Reported speech and changes in tense, pronouns and time." },
      { code: "lang2.sentences", name: "Types of Sentences", description: "Assertive, interrogative, imperative, exclamatory and optative sentences." },
      { code: "lang2.phrases_composition", name: "Phrases, Letters and Précis", description: "Phrasal verbs, letter-writing and précis-writing skills." },
      { code: "lang2.vocabulary", name: "Vocabulary and Spelling", description: "Synonyms, antonyms, one-word substitutions and correct spelling." },
      { code: "lang2.phonetics", name: "Phonetics and Transcription", description: "English phonemes, stress, intonation and IPA basics." },
      { code: "lang2.pedagogy", name: "Pedagogy of English Language",
        description: "Pedagogy specific to English as second/third language.",
        subtopics: [
          { code: "lang2.pedagogy.history_nature", name: "History and Nature of English Language", description: "Place of English in school curriculum." },
          { code: "lang2.pedagogy.skills", name: "LSRW Skills Development", description: "Integration of listening, speaking, reading and writing." },
          { code: "lang2.pedagogy.communicative", name: "Communicative Approach", description: "Communicative language teaching and other modern approaches." },
          { code: "lang2.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbooks, multimedia and ICT for English." },
          { code: "lang2.pedagogy.lesson_planning", name: "Lesson Planning and Curriculum", description: "Planning English lessons and curricular goals." },
          { code: "lang2.pedagogy.evaluation", name: "Evaluation Methods", description: "Assessment of speaking, listening, reading and writing." },
          { code: "lang2.pedagogy.remedial", name: "Remedial Teaching", description: "Identification and remediation of English-language difficulties." },
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
      { code: "math.whole_numbers", name: "Whole Numbers and Place Value", description: "Whole numbers, place value and Indian/international numeral systems." },
      { code: "math.operations", name: "Arithmetic Operations and Currency", description: "Four operations and their applications including Indian currency." },
      { code: "math.factors_multiples", name: "Prime, Composite, LCM and GCM", description: "Prime/composite numbers, divisibility, LCM and HCF/GCM." },
      { code: "math.fractions", name: "Fractions and Decimals", description: "Proper, improper, mixed fractions and decimal operations." },
      { code: "math.rational_numbers", name: "Rational Numbers (Paper II)", description: "Operations on rational numbers and their representation." },
      { code: "math.squares_cubes", name: "Square Roots, Cube Roots and Factorisation", description: "Squares, cubes, square root, cube root and factorisation." },
      { code: "math.ratio_percentage", name: "Ratio, Proportion, Percentages, Profit-Loss", description: "Commercial mathematics for primary level." },
      { code: "math.geometry", name: "Geometry", description: "Angles, shapes, symmetry, reflection and basic constructions." },
      { code: "math.measurements", name: "Measurements", description: "Length, weight, capacity, area and perimeter in standard units." },
      { code: "math.data_handling", name: "Data Presentation and Bar Graphs", description: "Pictographs, bar graphs and simple data interpretation." },
      { code: "math.pedagogy", name: "Pedagogy of Mathematics",
        description: "Mathematics-specific pedagogical concerns.",
        subtopics: [
          { code: "math.pedagogy.nature", name: "Nature of Mathematics", description: "Mathematics as a subject and its nature." },
          { code: "math.pedagogy.objectives", name: "Instructional Objectives", description: "Cognitive, affective and psychomotor objectives." },
          { code: "math.pedagogy.methods", name: "Methods and Materials of Teaching", description: "Methods, models and materials for teaching mathematics." },
          { code: "math.pedagogy.planning", name: "Planning and Scholastic Achievement Test", description: "Lesson planning and achievement testing." },
          { code: "math.pedagogy.diagnostic", name: "Diagnostic and Remedial Approaches", description: "Identifying and remediating learning gaps in mathematics." },
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
      { code: "evs.body_systems", name: "Body Systems", description: "Digestive, respiratory, nervous, circulatory and excretory systems." },
      { code: "evs.family_society", name: "Family and Society", description: "Family structures, relationships and occupations of people." },
      { code: "evs.plants_animals", name: "Plants and Animals", description: "Plant parts, photosynthesis, pollination and animal classification." },
      { code: "evs.food_nutrition", name: "Food and Nutrition", description: "Food, nutrients, balanced diet and deficiency diseases." },
      { code: "evs.shelter", name: "Housing and Basic Needs", description: "Houses, basic needs and shelter for animals." },
      { code: "evs.matter_environment", name: "Air, Water, Earth and Sky", description: "Components of environment and their interdependence." },
      { code: "evs.weather", name: "Weather and Seasons", description: "Weather elements, seasons and the climate of Maharashtra." },
      { code: "evs.india_geography", name: "India — Geography and States", description: "States, capitals, rivers and physical features of India." },
      { code: "evs.maharashtra", name: "Maharashtra — Land, People and Culture", description: "Geography, culture, festivals and heritage of Maharashtra." },
      { code: "evs.history_constitution", name: "Indian History and Constitution", description: "Important events in Indian history and basic constitutional concepts." },
      { code: "evs.un_organizations", name: "UN and International Organisations", description: "United Nations and major specialised agencies." },
      { code: "evs.health_hygiene", name: "Health and Hygiene", description: "Personal hygiene, immunisation and common diseases." },
      { code: "evs.pedagogy", name: "Pedagogy of EVS",
        description: "EVS-specific pedagogy at primary level.",
        subtopics: [
          { code: "evs.pedagogy.scope", name: "EVS Scope and Objectives", description: "Concept, scope and objectives of environmental studies." },
          { code: "evs.pedagogy.relations", name: "Relations with Science and Social Studies", description: "Integration of science and social science in EVS." },
          { code: "evs.pedagogy.curriculum", name: "Curriculum Transaction and CCE", description: "Methods of curriculum transaction and CCE in EVS." },
          { code: "evs.pedagogy.environments", name: "Learning Environments", description: "Creating effective learning environments for EVS." },
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
      { code: "math_sci.science.measurement", name: "Units and Measurement", description: "SI units, measurement of length, mass, time and temperature." },
      { code: "math_sci.science.natural_resources", name: "Natural Resources — Air, Water, Pressure", description: "Air, atmospheric pressure and water resources." },
      { code: "math_sci.science.solar_system", name: "Solar System and Earth Layers", description: "Sun, planets, moons and the layered structure of the earth." },
      { code: "math_sci.science.light", name: "Light", description: "Propagation, reflection and refraction; mirrors and lenses." },
      { code: "math_sci.science.sound_heat", name: "Sound and Heat", description: "Sound — production, propagation; heat — transfer and effects." },
      { code: "math_sci.science.mechanics", name: "Motion, Force and Friction", description: "Types of motion, force, Newton's laws and friction." },
      { code: "math_sci.science.electricity", name: "Magnetism and Electricity", description: "Magnets, electric current, circuits and applications." },
      { code: "math_sci.science.matter", name: "Matter and Chemical Changes", description: "States of matter, mixtures, physical and chemical changes." },
      { code: "math_sci.science.chemistry", name: "Elements, Compounds and Equations", description: "Elements, compounds, mixtures and chemical equations." },
      { code: "math_sci.science.cell_biology", name: "Cell Theory and Biology", description: "Cell structure, cell theory and cell organelles." },
      { code: "math_sci.science.plants", name: "Plant Systems", description: "Plant nutrition, reproduction, transport and respiration." },
      { code: "math_sci.science.animal_systems", name: "Animal Organ Systems", description: "Digestive, respiratory, circulatory and reproductive systems." },
      { code: "math_sci.science.microbes", name: "Microbes and Diseases", description: "Bacteria, viruses, fungi and common communicable diseases." },
      { code: "math_sci.science.environment", name: "Environment and Ecosystems", description: "Ecosystem, food chains, biodiversity and conservation." },
      { code: "math_sci.science.pedagogy", name: "Pedagogy of Science",
        description: "Science-specific pedagogy at upper-primary level.",
        subtopics: [
          { code: "math_sci.science.pedagogy.nature", name: "Nature and History of Science", description: "Science as a way of knowing and its development." },
          { code: "math_sci.science.pedagogy.aims", name: "Aims and Objectives of Teaching", description: "Cognitive, affective and skill objectives." },
          { code: "math_sci.science.pedagogy.lab", name: "Laboratory Instruction", description: "Lab equipment, safety and experimentation." },
          { code: "math_sci.science.pedagogy.curriculum", name: "Curriculum Transaction", description: "Approaches and strategies for science curriculum." },
          { code: "math_sci.science.pedagogy.evaluation", name: "Evaluation and Achievement Testing", description: "Tests, diagnostic work and remedial teaching." },
        ],
      },
      { code: "math_sci.math.numbers", name: "Number Systems and Operations", description: "Integers, rationals, real numbers and operations." },
      { code: "math_sci.math.fractions", name: "Fractions and Rational Numbers", description: "Operations on fractions and rational numbers." },
      { code: "math_sci.math.algebra", name: "Algebra", description: "Algebraic expressions, identities and linear equations." },
      { code: "math_sci.math.geometry", name: "Geometry and Measurements", description: "Triangles, quadrilaterals, circles and constructions." },
      { code: "math_sci.math.data", name: "Data Interpretation", description: "Reading bar graphs, pie charts, mean/median/mode." },
    ],
  },

  // ── SOCIAL STUDIES (Paper II) ────────────────────────────────────────
  {
    code: "SOCIAL_STUDIES",
    name: "Social Studies (Paper II)",
    weight: 1,
    topics: [
      { code: "ss.geography.earth", name: "Earth and Landforms", description: "Earth, mountains, plateaus, plains and major landforms." },
      { code: "ss.geography.climate", name: "Climate and Solar System", description: "Climate elements, solar system, latitudes and longitudes." },
      { code: "ss.geography.continents", name: "Continents — Location, Features, Resources", description: "Major continents, their physical features and resources." },
      { code: "ss.geography.maps", name: "Maps and Cardinal Points", description: "Reading maps and using cardinal/ordinal directions." },
      { code: "ss.geography.maharashtra", name: "Geography of Maharashtra", description: "Physical features, climate, rivers and resources of Maharashtra." },
      { code: "ss.history.prehistoric", name: "Prehistoric and Ancient India", description: "Stone Age, Indus Valley and Vedic civilisation." },
      { code: "ss.history.harappa_vedic", name: "Harappan and Vedic Civilisations", description: "Indus Valley sites and the Vedic period of India." },
      { code: "ss.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughal empire and regional kingdoms." },
      { code: "ss.history.maratha", name: "Maratha Empire", description: "Shivaji Maharaj, Peshwas and rise/fall of the Maratha empire." },
      { code: "ss.history.british", name: "British Colonial Rule and Revolts", description: "British conquest, 1857 revolt and its aftermath." },
      { code: "ss.history.freedom", name: "Freedom Movement", description: "Indian National Congress, Gandhian era and independence movement." },
      { code: "ss.history.modern", name: "Modern India", description: "Post-independence India and the formation of states." },
      { code: "ss.civics.family_community", name: "Family and Community", description: "Family, community and social institutions." },
      { code: "ss.civics.constitution", name: "Indian Constitution", description: "Preamble, fundamental rights, duties and DPSPs." },
      { code: "ss.civics.government", name: "Central and State Government", description: "Parliament, executive, judiciary and state legislatures." },
      { code: "ss.civics.local", name: "Local Self-Government", description: "Panchayati raj and municipal institutions." },
      { code: "ss.civics.democracy", name: "Democracy and Elections", description: "Democratic values, elections and political parties." },
      { code: "ss.civics.international", name: "International Organisations", description: "UN and major international organisations." },
      { code: "ss.economics.concepts", name: "Concepts of Economics", description: "Production, consumption, demand and supply." },
      { code: "ss.economics.market", name: "Market and Supply-Demand", description: "Market types and law of supply and demand." },
      { code: "ss.economics.national_income", name: "National Income and GDP", description: "National income, GDP, GNP and per-capita income." },
      { code: "ss.economics.maharashtra", name: "Maharashtra Economic Sectors", description: "Agriculture, industry and services in Maharashtra." },
      { code: "ss.economics.resources", name: "Natural Resources and Development", description: "Use of natural resources and sustainable development." },
      { code: "ss.pedagogy", name: "Pedagogy of Social Studies",
        description: "Pedagogy specific to social studies at upper-primary level.",
        subtopics: [
          { code: "ss.pedagogy.nature", name: "Nature and Scope", description: "Nature, scope and significance of social studies." },
          { code: "ss.pedagogy.aims", name: "Aims and Methods", description: "Aims, methods and approaches to teaching." },
          { code: "ss.pedagogy.materials", name: "Materials and Resources", description: "Charts, maps, ICT and other resources." },
          { code: "ss.pedagogy.planning", name: "Instructional Planning", description: "Planning lessons and units in social studies." },
          { code: "ss.pedagogy.evaluation", name: "Curriculum and Evaluation", description: "Curriculum design and evaluation tools." },
        ],
      },
    ],
  },
];

export async function seedMahatetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "MH_MAHATET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — MH_MAHATET exam not found.");
  }
  console.log(`Seeding MAHA TET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < mahatetSyllabus.length; sIdx++) {
    const s = mahatetSyllabus[sIdx];
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
  seedMahatetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
