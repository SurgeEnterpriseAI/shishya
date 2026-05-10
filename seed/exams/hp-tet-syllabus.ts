// HP TET (Himachal Pradesh Teacher Eligibility Test) — full syllabus tree.
// Conducted by Himachal Pradesh Board of School Education (HPBOSE), Dharamshala.
// 150 MCQs × 1 mark = 150 marks in 150 minutes. No negative marking.
// Multiple categories: JBT (Class 1–5), TGT (Arts/Non-Medical/Medical), Punjabi, Urdu,
// Sanskrit, Special Educator. The shared shape used here covers the JBT (primary)
// and TGT-Arts (upper-primary) papers, plus Lang I (Hindi) + Lang II (English).
// Source: official HPBOSE HP TET notification & syllabus (hpbose.org / hptet.in),
// cross-checked with NCTE TET framework.
//
// Run after seedExams: npx tsx seed/exams/hp-tet-syllabus.ts

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

export const hpTetSyllabus: SubjectSeed[] = [
  // ── CHILD DEVELOPMENT & PEDAGOGY ──────────────────────────────────────
  {
    code: "CDP",
    name: "Child Psychology and Pedagogy",
    weight: 1,
    topics: [
      {
        code: "cdp.development",
        name: "Child Development",
        description: "Development of the elementary-school child and its relation to learning.",
        subtopics: [
          { code: "cdp.development.concept", name: "Concept of Development", description: "Definition, principles and dimensions of child development." },
          { code: "cdp.development.heredity_environment", name: "Heredity and Environment", description: "Influence of heredity and environment on development." },
          { code: "cdp.development.socialisation", name: "Socialisation Processes", description: "Role of family, peers, school and culture." },
          { code: "cdp.development.theorists", name: "Piaget, Kohlberg and Vygotsky", description: "Cognitive, moral and socio-cultural theories." },
          { code: "cdp.development.child_centred", name: "Child-centred and Progressive Education", description: "NCF-aligned philosophy of progressive education." },
        ],
      },
      {
        code: "cdp.intelligence",
        name: "Intelligence and Personality",
        description: "Constructs of intelligence and personality.",
        subtopics: [
          { code: "cdp.intelligence.concept", name: "Concept of Intelligence", description: "Critical perspective on the construct of intelligence." },
          { code: "cdp.intelligence.multi", name: "Multi-Dimensional Intelligence", description: "Gardner's theory of multiple intelligences." },
          { code: "cdp.intelligence.creativity", name: "Creativity", description: "Concept of creativity and identifying creative learners." },
          { code: "cdp.intelligence.personality", name: "Personality", description: "Theories and assessment of personality." },
        ],
      },
      {
        code: "cdp.individual",
        name: "Individual Differences and Inclusive Education",
        description: "Diversity and inclusive practices.",
        subtopics: [
          { code: "cdp.individual.diversity", name: "Diversity Among Learners", description: "Differences based on language, caste, gender, region and ability." },
          { code: "cdp.individual.cwsn", name: "Children with Special Needs", description: "Identifying and supporting CWSN — sensory, motor and learning difficulties." },
          { code: "cdp.individual.gifted", name: "Talented and Creative Learners", description: "Differentiated strategies for gifted children." },
          { code: "cdp.individual.disadvantaged", name: "Disadvantaged Learners", description: "SC/ST/OBC, tribal communities of HP and equity in classrooms." },
        ],
      },
      {
        code: "cdp.learning",
        name: "Learning and Pedagogy",
        description: "How children think and learn and the implications for teaching.",
        subtopics: [
          { code: "cdp.learning.process", name: "Concept and Process of Learning", description: "Learning as construction of knowledge." },
          { code: "cdp.learning.theories", name: "Theories of Learning", description: "Behaviourism, cognitivism, constructivism and Gestalt." },
          { code: "cdp.learning.motivation", name: "Motivation in Learning", description: "Maslow, McClelland — intrinsic and extrinsic motivation." },
          { code: "cdp.learning.problem_solving", name: "Problem Solving", description: "Child as problem solver and scientific investigator." },
          { code: "cdp.learning.factors", name: "Factors Contributing to Learning", description: "Heredity, attitude, attention, environment." },
        ],
      },
      {
        code: "cdp.assessment",
        name: "Assessment and CCE",
        description: "Assessment and continuous evaluation.",
        subtopics: [
          { code: "cdp.assessment.afl_aol", name: "Assessment for and of Learning", description: "Distinction between formative and summative assessment." },
          { code: "cdp.assessment.cce", name: "School-based Assessment and CCE", description: "Continuous comprehensive evaluation in primary classrooms." },
          { code: "cdp.assessment.questioning", name: "Formulating Appropriate Questions", description: "Questions to assess readiness and develop critical thinking." },
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
      { code: "lang1.varna", name: "Varnamala and Uchchar", description: "Vowels, consonants and Devanagari script." },
      { code: "lang1.shabd_bhed", name: "Shabd Bhed", description: "Tatsam, tadbhav, deshi and videshi shabd." },
      { code: "lang1.sandhi_samas", name: "Sandhi and Samas", description: "Sandhi rules and six types of samas." },
      { code: "lang1.upsarg_pratyay", name: "Upsarg aur Pratyay", description: "Prefixes and suffixes in Hindi." },
      { code: "lang1.parts_of_speech", name: "Parts of Speech", description: "Sangya, sarvanaam, visheshan, kriya etc." },
      { code: "lang1.gender_number_tense", name: "Ling, Vachan, Kaal and Karak", description: "Gender, number, tense and case forms." },
      { code: "lang1.vakya", name: "Vakyarachna", description: "Sentence structure, types and punctuation." },
      { code: "lang1.muhavare", name: "Muhavare aur Lokoktiyan", description: "Hindi idioms and proverbs." },
      { code: "lang1.alankar", name: "Alankar, Ras and Chhand", description: "Figures of speech, ras and Hindi metres." },
      { code: "lang1.synonyms", name: "Paryayvachi aur Vilom", description: "Synonyms and antonyms in Hindi." },
      { code: "lang1.pahari", name: "Pahari Folk Literature", description: "Folk songs and oral traditions of Himachal Pradesh — pahari/dogri influences." },
      {
        code: "lang1.pedagogy",
        name: "Pedagogy of Hindi",
        description: "Pedagogy of teaching Hindi at school stage.",
        subtopics: [
          { code: "lang1.pedagogy.acquisition", name: "Acquisition vs Learning", description: "Difference between language acquisition and learning." },
          { code: "lang1.pedagogy.principles", name: "Principles of Hindi Teaching", description: "Aims and principles of teaching Hindi." },
          { code: "lang1.pedagogy.lsrw", name: "LSRW Skills", description: "Listening, speaking, reading and writing." },
          { code: "lang1.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbook, multimedia and ICT." },
          { code: "lang1.pedagogy.evaluation", name: "Evaluation", description: "Speaking, listening, reading and writing assessment." },
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
      { code: "lang2.transformation", name: "Sentence Transformation", description: "Transformation between sentence types." },
      { code: "lang2.vocabulary", name: "Vocabulary", description: "Synonyms, antonyms, one-word substitution." },
      { code: "lang2.idioms", name: "Idioms and Phrases", description: "English idioms and phrasal verbs." },
      {
        code: "lang2.pedagogy",
        name: "Pedagogy of English",
        description: "Pedagogy of teaching English as a second language.",
        subtopics: [
          { code: "lang2.pedagogy.acquisition", name: "Acquisition vs Learning", description: "Difference between language acquisition and learning." },
          { code: "lang2.pedagogy.principles", name: "Principles of English Teaching", description: "Approaches and methods." },
          { code: "lang2.pedagogy.lsrw", name: "LSRW Skills", description: "Listening, speaking, reading and writing." },
          { code: "lang2.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbooks and ICT." },
          { code: "lang2.pedagogy.evaluation", name: "Evaluation", description: "Assessment of LSRW skills." },
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
      { code: "math.numbers", name: "Number System", description: "Whole numbers, integers, place value, factors and multiples." },
      { code: "math.fractions", name: "Fractions and Decimals", description: "Operations on fractions and decimals." },
      { code: "math.lcm_hcf", name: "LCM and HCF", description: "Lowest common multiple and highest common factor." },
      { code: "math.percentage", name: "Percentage", description: "Percentage and applications." },
      { code: "math.profit_loss", name: "Profit, Loss and Discount", description: "Commercial mathematics." },
      { code: "math.simple_interest", name: "Simple and Compound Interest", description: "SI and CI calculations." },
      { code: "math.ratio", name: "Ratio and Proportion", description: "Ratio, proportion and unitary method." },
      { code: "math.algebra", name: "Algebra (TGT)", description: "Algebraic expressions and linear equations." },
      { code: "math.geometry", name: "Geometry", description: "Lines, angles, triangles and basic shapes." },
      { code: "math.mensuration", name: "Mensuration", description: "Area, perimeter, surface area and volume." },
      { code: "math.statistics", name: "Statistics and Data Handling", description: "Mean, median, mode and graphs." },
      { code: "math.measurement", name: "Measurement", description: "Length, mass, capacity, time and temperature." },
      {
        code: "math.pedagogy",
        name: "Pedagogy of Mathematics",
        description: "Mathematics-specific pedagogy.",
        subtopics: [
          { code: "math.pedagogy.nature", name: "Nature of Mathematics", description: "Mathematics as patterns and logical thinking." },
          { code: "math.pedagogy.curriculum", name: "Place of Mathematics in Curriculum", description: "Aims and importance of school mathematics." },
          { code: "math.pedagogy.evaluation", name: "Evaluation in Mathematics", description: "Formative, diagnostic and summative evaluation." },
          { code: "math.pedagogy.errors", name: "Error Analysis", description: "Identifying error patterns and remediation." },
        ],
      },
    ],
  },

  // ── ENVIRONMENTAL STUDIES (JBT) / SOCIAL SCIENCE & GA (TGT) ───────────
  {
    code: "EVS",
    name: "Environmental Studies / General Awareness",
    weight: 1,
    topics: [
      { code: "evs.family", name: "Family and Friends", description: "Family relationships and social bonds." },
      { code: "evs.food", name: "Food", description: "Sources of food, balanced diet and food preservation." },
      { code: "evs.shelter", name: "Shelter", description: "Houses across regions of HP and India." },
      { code: "evs.water", name: "Water", description: "Sources, conservation and water-borne diseases." },
      { code: "evs.travel", name: "Travel and Communication", description: "Modes of transport and communication." },
      { code: "evs.things_we_make", name: "Things We Make and Do", description: "Local crafts (Kullu shawl, Kangra paintings) and traditional occupations." },
      { code: "evs.our_body", name: "Our Body and Health", description: "Body parts, sense organs and hygiene." },
      { code: "evs.plants_animals", name: "Plants and Animals Around Us", description: "Plant and animal life of the Himalayan region." },
      { code: "evs.hp_geography", name: "Geography of Himachal Pradesh", description: "Himalayan ranges, rivers (Sutlej, Beas, Ravi, Chenab, Yamuna) and climate of HP." },
      { code: "evs.hp_culture", name: "Culture and Heritage of HP", description: "Folk dances (Nati, Kullu, Kinnauri), festivals (Kullu Dussehra, Lavi Mela) and tribal communities." },
      { code: "evs.hp_history", name: "History of Himachal Pradesh", description: "Princely states, freedom struggle in HP and statehood (1971)." },
      { code: "evs.solar_system", name: "Earth and Universe", description: "Earth's motion, solar system and basic space concepts." },
      { code: "evs.environmental_protection", name: "Environmental Protection", description: "Pollution, climate change, glacier retreat and conservation." },
      { code: "evs.india_constitution", name: "Indian Constitution and Polity (TGT)", description: "Preamble, fundamental rights, duties and DPSPs." },
      { code: "evs.current_affairs", name: "Current Affairs and General Awareness", description: "National and HP-specific current events, schemes and personalities." },
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
];

export async function seedHpTetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "HP_TET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — HP_TET exam not found.");
  }
  console.log(`Seeding HP TET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < hpTetSyllabus.length; sIdx++) {
    const s = hpTetSyllabus[sIdx];
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
  seedHpTetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
