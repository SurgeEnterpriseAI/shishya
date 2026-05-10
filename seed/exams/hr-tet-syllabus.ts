// HTET (Haryana Teacher Eligibility Test) — full syllabus tree.
// Conducted by Board of School Education Haryana (BSEH).
// Three levels: Level-1 PRT (Classes I-V), Level-2 TGT (VI-VIII), Level-3 PGT (IX-XII).
// Each level: 150 MCQs × 1 mark = 150 marks in 150 minutes. No negative marking.
// Source: official HTET notification & syllabus (bseh.org.in),
// cross-checked with NCTE TET framework. Includes Haryana GK section unique to HTET.
//
// Run after seedExams: npx tsx seed/exams/hr-tet-syllabus.ts

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

export const hrTetSyllabus: SubjectSeed[] = [
  // ── CHILD DEVELOPMENT & PEDAGOGY (All 3 levels) ───────────────────────
  {
    code: "CDP",
    name: "Child Development and Pedagogy",
    weight: 1,
    topics: [
      { code: "cdp.child_development", name: "Child Development",
        description: "Development concepts of the elementary and secondary school child.",
        subtopics: [
          { code: "cdp.child_development.concept", name: "Concept of Development & Relationship with Learning", description: "Definition, principles and how development affects learning." },
          { code: "cdp.child_development.principles", name: "Principles of Development", description: "Continuity, sequence, individual differences, integration." },
          { code: "cdp.child_development.heredity_environment", name: "Influence of Heredity and Environment", description: "Nature vs nurture and the role of family/school/peers." },
          { code: "cdp.child_development.dimensions", name: "Dimensions of Development", description: "Physical, cognitive, social, emotional and moral dimensions." },
          { code: "cdp.child_development.piaget", name: "Piaget's Cognitive Development", description: "Stages of cognitive development and educational implications." },
          { code: "cdp.child_development.kohlberg", name: "Kohlberg's Moral Development", description: "Pre-conventional, conventional and post-conventional levels." },
          { code: "cdp.child_development.vygotsky", name: "Vygotsky's Socio-cultural Theory", description: "ZPD, scaffolding and social mediation of learning." },
          { code: "cdp.child_development.intelligence", name: "Concept of Intelligence", description: "IQ, Gardner's multiple intelligences and emotional intelligence." },
          { code: "cdp.child_development.individual_differences", name: "Individual Differences", description: "Differences based on language, caste, gender, ability and aptitude." },
          { code: "cdp.child_development.gender", name: "Gender as a Social Construct", description: "Gender bias and gender roles in education." },
          { code: "cdp.child_development.adolescence", name: "Adolescence", description: "Physical, emotional and social changes during adolescence (PGT relevance)." },
          { code: "cdp.child_development.personality", name: "Personality", description: "Personality theories and adjustment in school context." },
        ],
      },
      { code: "cdp.learning_theories", name: "Learning Theories",
        description: "Major theories of learning and pedagogy.",
        subtopics: [
          { code: "cdp.learning_theories.thorndike", name: "Thorndike's Connectionism", description: "Trial and error, laws of readiness, exercise and effect." },
          { code: "cdp.learning_theories.pavlov", name: "Pavlov's Classical Conditioning", description: "Stimulus-response association and classroom implications." },
          { code: "cdp.learning_theories.skinner", name: "Skinner's Operant Conditioning", description: "Reinforcement, punishment and programmed instruction." },
          { code: "cdp.learning_theories.gestalt", name: "Gestalt Theory and Insight Learning", description: "Insight, perception and problem-solving as a whole." },
          { code: "cdp.learning_theories.constructivism", name: "Constructivism", description: "Child as constructor of knowledge — Piaget and Vygotsky." },
          { code: "cdp.learning_theories.observational", name: "Observational Learning", description: "Bandura's modelling, imitation and self-efficacy." },
          { code: "cdp.learning_theories.motivation", name: "Motivation", description: "Intrinsic and extrinsic motivation and Maslow's hierarchy." },
          { code: "cdp.learning_theories.memory", name: "Memory and Forgetting", description: "Types of memory, theories of forgetting, transfer of learning." },
        ],
      },
      { code: "cdp.inclusive_education", name: "Inclusive Education and CWSN",
        description: "Educating diverse learners and children with special needs.",
        subtopics: [
          { code: "cdp.inclusive_education.disadvantaged", name: "Learners from Disadvantaged Backgrounds", description: "SC/ST/minority/migrant and economically disadvantaged learners." },
          { code: "cdp.inclusive_education.learning_difficulties", name: "Learners with Learning Difficulties", description: "Dyslexia, dyscalculia, ADHD identification and support." },
          { code: "cdp.inclusive_education.talented", name: "Talented and Specially-abled", description: "Strategies for gifted and creative children." },
          { code: "cdp.inclusive_education.rte", name: "Right to Education Act 2009", description: "RTE provisions and inclusive classroom requirements." },
          { code: "cdp.inclusive_education.guidance", name: "Guidance and Counselling", description: "Educational and vocational guidance for adolescents." },
        ],
      },
      { code: "cdp.assessment", name: "Assessment and Evaluation",
        description: "Forms and methods of assessment in school education.",
        subtopics: [
          { code: "cdp.assessment.types", name: "Assessment for vs Assessment of Learning", description: "Formative vs summative assessment." },
          { code: "cdp.assessment.cce", name: "Continuous and Comprehensive Evaluation", description: "CCE perspective, tools and practice." },
          { code: "cdp.assessment.tools", name: "Tools and Techniques", description: "Tests, projects, observation and rubrics." },
        ],
      },
    ],
  },

  // ── HARYANA GENERAL KNOWLEDGE (UNIQUE TO HTET) ────────────────────────
  {
    code: "HARYANA_GK",
    name: "Haryana General Knowledge and Reasoning",
    weight: 1,
    topics: [
      {
        code: "haryana.history",
        name: "History of Haryana",
        description: "Ancient to modern history of Haryana.",
        subtopics: [
          { code: "haryana.history.ancient", name: "Ancient Haryana", description: "Indus Valley sites in Haryana — Rakhigarhi, Mitathal, Banawali." },
          { code: "haryana.history.medieval", name: "Medieval Haryana", description: "Battles of Panipat, Tarain — Haryana under Sultanates and Mughals." },
          { code: "haryana.history.modern", name: "Modern Haryana and Freedom Struggle", description: "1857 in Haryana, Rao Tula Ram and freedom-movement contributions." },
          { code: "haryana.history.formation", name: "Formation of Haryana (1966)", description: "Punjab Reorganisation Act 1966 and creation of Haryana." },
        ],
      },
      {
        code: "haryana.geography",
        name: "Geography of Haryana",
        description: "Physical and economic geography of Haryana.",
        subtopics: [
          { code: "haryana.geography.physical", name: "Physical Features", description: "Plains, Aravallis, Shivaliks, rivers (Yamuna, Ghaggar) and climate." },
          { code: "haryana.geography.agriculture", name: "Agriculture", description: "Crops, irrigation, Green Revolution and dairying in Haryana." },
          { code: "haryana.geography.industry", name: "Industries", description: "Auto industry of Gurugram-Faridabad, IMT Manesar." },
        ],
      },
      {
        code: "haryana.culture",
        name: "Art, Culture and Literature of Haryana",
        description: "Cultural heritage, folk arts and literature.",
        subtopics: [
          { code: "haryana.culture.literature", name: "Haryanvi Literature", description: "Pandit Lakhmi Chand, Surdas, folk literature." },
          { code: "haryana.culture.dance", name: "Folk Dance and Music", description: "Saang, Phag, Ghoomar, Loor and folk songs." },
          { code: "haryana.culture.festivals", name: "Festivals", description: "Teej, Gangaur, Sohna and regional fairs." },
          { code: "haryana.culture.dress", name: "Dress and Cuisine", description: "Traditional Haryanvi attire and cuisine." },
        ],
      },
      {
        code: "haryana.administration",
        name: "Haryana Administration and Welfare",
        description: "Administrative and welfare aspects of Haryana.",
        subtopics: [
          { code: "haryana.administration.structure", name: "Administrative Structure", description: "Divisions, districts, Vidhan Sabha and Punjab & Haryana High Court." },
          { code: "haryana.administration.welfare", name: "Welfare Schemes", description: "Beti Bachao Beti Padhao, Saksham Yuva and other schemes." },
          { code: "haryana.administration.sports", name: "Sports in Haryana", description: "Haryana sports policy, Olympic medallists and akhada tradition." },
        ],
      },
      { code: "haryana.reasoning", name: "Quantitative Aptitude and Reasoning",
        description: "Numerical and logical reasoning section of HTET.",
        subtopics: [
          { code: "haryana.reasoning.arithmetic", name: "Arithmetic", description: "Number system, percentage, ratio, profit-loss, time-work." },
          { code: "haryana.reasoning.series", name: "Series and Coding", description: "Number, letter series and coding-decoding." },
          { code: "haryana.reasoning.directions", name: "Directions and Blood Relations", description: "Direction sense and family-tree puzzles." },
          { code: "haryana.reasoning.analogy", name: "Analogy and Classification", description: "Word, number, figure analogy and odd-one-out." },
          { code: "haryana.reasoning.visual", name: "Non-Verbal Reasoning", description: "Mirror image, water image, embedded figures." },
        ],
      },
    ],
  },

  // ── HINDI ─────────────────────────────────────────────────────────────
  {
    code: "LANG1",
    name: "Hindi",
    weight: 1,
    topics: [
      { code: "lang1.comprehension", name: "Hindi Gadyansh and Padyansh",
        description: "Reading unseen Hindi prose and poetry passages.",
        subtopics: [
          { code: "lang1.comprehension.gadyansh", name: "Gadyansh (Prose)", description: "Unseen Hindi prose with comprehension and grammar questions." },
          { code: "lang1.comprehension.padyansh", name: "Padyansh (Poetry)", description: "Unseen Hindi poetry with comprehension and inference questions." },
        ],
      },
      { code: "lang1.grammar", name: "Hindi Vyakaran",
        description: "Hindi grammar topics.",
        subtopics: [
          { code: "lang1.grammar.varnamala", name: "Varnamala and Sandhi", description: "Hindi alphabet, vowels, consonants and sandhi rules." },
          { code: "lang1.grammar.shabd_bhed", name: "Shabd Bhed", description: "Parts of speech — sangya, sarvanam, kriya etc." },
          { code: "lang1.grammar.kaal_vachan", name: "Kaal, Vachan, Lingatva", description: "Tense, number and gender." },
          { code: "lang1.grammar.muhavre", name: "Muhavare and Lokoktiyan", description: "Idioms and proverbs." },
          { code: "lang1.grammar.paryayvachi", name: "Paryayvachi and Vilom Shabd", description: "Synonyms and antonyms in Hindi." },
        ],
      },
      { code: "lang1.pedagogy", name: "Hindi Pedagogy",
        description: "Methods of teaching Hindi.",
        subtopics: [
          { code: "lang1.pedagogy.principles", name: "Principles of Language Teaching", description: "Approaches to teaching Hindi at primary and upper-primary levels." },
          { code: "lang1.pedagogy.skills", name: "Language Skills", description: "Listening, speaking, reading and writing in Hindi." },
          { code: "lang1.pedagogy.evaluation", name: "Evaluation and Remedial", description: "Assessment of Hindi proficiency and remedial teaching." },
          { code: "lang1.pedagogy.tlm", name: "Teaching Aids", description: "Textbooks, multimedia and TLM in Hindi classroom." },
        ],
      },
    ],
  },

  // ── ENGLISH ───────────────────────────────────────────────────────────
  {
    code: "LANG2",
    name: "English",
    weight: 1,
    topics: [
      { code: "lang2.comprehension", name: "Reading Comprehension",
        description: "Unseen English prose and poetry passages.",
        subtopics: [
          { code: "lang2.comprehension.prose", name: "Prose Comprehension", description: "Discursive prose with comprehension and grammar questions." },
          { code: "lang2.comprehension.poem", name: "Poem Comprehension", description: "Unseen poem with literal and inferential questions." },
        ],
      },
      { code: "lang2.grammar", name: "English Grammar",
        description: "Core English grammar topics.",
        subtopics: [
          { code: "lang2.grammar.tenses", name: "Tenses", description: "Simple, continuous, perfect tenses in English." },
          { code: "lang2.grammar.articles", name: "Articles and Prepositions", description: "Definite, indefinite articles and common prepositions." },
          { code: "lang2.grammar.voice", name: "Active and Passive Voice", description: "Conversion between active and passive voice." },
          { code: "lang2.grammar.narration", name: "Direct and Indirect Narration", description: "Reported speech rules and conversion." },
          { code: "lang2.grammar.error", name: "Error Detection and Correction", description: "Spotting errors and sentence correction." },
        ],
      },
      { code: "lang2.vocab", name: "Vocabulary",
        description: "English vocabulary building.",
        subtopics: [
          { code: "lang2.vocab.synonyms", name: "Synonyms and Antonyms", description: "Common synonyms and antonyms." },
          { code: "lang2.vocab.idioms", name: "Idioms and Phrases", description: "Common English idioms and phrasal verbs." },
          { code: "lang2.vocab.one_word", name: "One-Word Substitution", description: "Single-word substitutes for phrases." },
        ],
      },
      { code: "lang2.pedagogy", name: "English Pedagogy",
        description: "Methods of teaching English as second language.",
        subtopics: [
          { code: "lang2.pedagogy.principles", name: "Principles of L2 Teaching", description: "Approaches to teaching English in Haryanvi-Hindi context." },
          { code: "lang2.pedagogy.skills", name: "Language Skills", description: "LSRW skills development in English." },
          { code: "lang2.pedagogy.evaluation", name: "Evaluation", description: "Assessing English proficiency in primary and upper-primary classes." },
        ],
      },
    ],
  },

  // ── SUBJECT-SPECIFIC (Math/EVS for L1, Math-Sci or SS for L2) ─────────
  {
    code: "SUBJECT_SPECIFIC",
    name: "Subject-Specific Knowledge (Level-wise)",
    weight: 1,
    topics: [
      { code: "subj.math_primary", name: "Mathematics — Level 1 (Classes I-V)",
        description: "PRT-level mathematics content and pedagogy.",
        subtopics: [
          { code: "subj.math_primary.numbers", name: "Numbers and Operations", description: "Numbers up to 1,00,000, four operations, fractions and decimals." },
          { code: "subj.math_primary.measurement", name: "Measurement", description: "Length, weight, capacity, time and money." },
          { code: "subj.math_primary.geometry", name: "Geometry", description: "Shapes, lines, angles, perimeter and area." },
          { code: "subj.math_primary.data", name: "Data Handling", description: "Pictographs, bar graphs and simple data." },
          { code: "subj.math_primary.pedagogy", name: "Pedagogy of Mathematics", description: "Place of maths in curriculum, language of maths, error analysis." },
        ],
      },
      { code: "subj.evs", name: "EVS — Level 1 (Classes I-V)",
        description: "PRT-level EVS content and pedagogy.",
        subtopics: [
          { code: "subj.evs.family", name: "Family and Friends", description: "Relationships, work, animals and plants." },
          { code: "subj.evs.food_shelter", name: "Food, Shelter and Water", description: "Sources, components and conservation." },
          { code: "subj.evs.travel", name: "Travel and Things We Make", description: "Transport, communication, occupations and crafts." },
          { code: "subj.evs.environment", name: "Environment and Conservation", description: "Pollution, biodiversity and sustainable living." },
          { code: "subj.evs.pedagogy", name: "Pedagogy of EVS", description: "Concept and scope of EVS, integrated approach, activities and CCE." },
        ],
      },
      { code: "subj.math_sci_upper", name: "Mathematics & Science — Level 2 (Classes VI-VIII)",
        description: "TGT-level math-science content and pedagogy.",
        subtopics: [
          { code: "subj.math_sci_upper.math", name: "Mathematics Content", description: "Number system, algebra, geometry, mensuration and data handling." },
          { code: "subj.math_sci_upper.science", name: "Science Content", description: "Food, materials, world of living, motion, force, electricity, natural phenomena." },
          { code: "subj.math_sci_upper.pedagogy", name: "Pedagogical Issues", description: "Nature, aims, approaches, evaluation in math and science." },
        ],
      },
      { code: "subj.social", name: "Social Studies — Level 2 (Classes VI-VIII)",
        description: "TGT-level social studies content and pedagogy.",
        subtopics: [
          { code: "subj.social.history", name: "History", description: "Ancient, medieval and modern India." },
          { code: "subj.social.geography", name: "Geography", description: "Earth, India, Haryana and world geography." },
          { code: "subj.social.civics", name: "Civics", description: "Constitution, democracy, local government." },
          { code: "subj.social.economics", name: "Economics", description: "Basic economics and Indian economy." },
          { code: "subj.social.pedagogy", name: "Pedagogy of Social Studies", description: "Methods, sources, projects and evaluation." },
        ],
      },
      { code: "subj.pgt_subject", name: "Subject-Specific — Level 3 (PGT, Classes IX-XII)",
        description: "PGT-level subject knowledge for school subjects (Hindi/English/Math/Sci/SS).",
        subtopics: [
          { code: "subj.pgt_subject.hindi", name: "Hindi (PGT)", description: "Hindi sahitya, vyakaran, and PGT-level Hindi pedagogy." },
          { code: "subj.pgt_subject.english", name: "English (PGT)", description: "English literature, advanced grammar and pedagogy." },
          { code: "subj.pgt_subject.maths", name: "Mathematics (PGT)", description: "Algebra, calculus, trigonometry, statistics and pedagogy." },
          { code: "subj.pgt_subject.physics", name: "Physics (PGT)", description: "Mechanics, electromagnetism, optics, modern physics." },
          { code: "subj.pgt_subject.chemistry", name: "Chemistry (PGT)", description: "Physical, organic, inorganic chemistry." },
          { code: "subj.pgt_subject.biology", name: "Biology (PGT)", description: "Botany, zoology, genetics and biotechnology." },
          { code: "subj.pgt_subject.history", name: "History (PGT)", description: "Ancient, medieval, modern history of India and world." },
          { code: "subj.pgt_subject.geography", name: "Geography (PGT)", description: "Physical, human and economic geography." },
          { code: "subj.pgt_subject.poly_sci", name: "Political Science (PGT)", description: "Indian government, political theory, IR." },
          { code: "subj.pgt_subject.economics", name: "Economics (PGT)", description: "Micro, macro, Indian and development economics." },
          { code: "subj.pgt_subject.commerce", name: "Commerce (PGT)", description: "Accountancy, business studies and economics." },
        ],
      },
    ],
  },
];

export async function seedHrTetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "HR_TET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — HR_TET exam not found.");
  }
  console.log(`Seeding HTET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < hrTetSyllabus.length; sIdx++) {
    const s = hrTetSyllabus[sIdx];
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
  seedHrTetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
