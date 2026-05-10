// PSTET (Punjab State Teacher Eligibility Test) — full syllabus tree.
// Conducted by State Council of Educational Research & Training (SCERT) Punjab.
// Two papers: Paper I (Classes I-V) and Paper II (Classes VI-VIII).
// Each paper: 150 MCQs × 1 mark = 150 marks in 150 minutes. No negative marking.
// Source: official PSTET notification & syllabus (educationrecruitmentboard.com /
// SCERT Punjab), cross-checked with NCTE TET framework.
// Languages on offer for Lang I/II: Punjabi, Hindi, English, Urdu.
//
// Run after seedExams: npx tsx seed/exams/pb-tet-syllabus.ts

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

export const pbTetSyllabus: SubjectSeed[] = [
  // ── CHILD DEVELOPMENT & PEDAGOGY (Paper I + II) ───────────────────────
  {
    code: "CDP",
    name: "Child Development and Pedagogy",
    weight: 1,
    topics: [
      { code: "cdp.child_development", name: "Child Development",
        description: "Concepts of development of the elementary school child.",
        subtopics: [
          { code: "cdp.child_development.concept", name: "Concept of Development & Relationship with Learning", description: "Definition of development and how it relates to learning." },
          { code: "cdp.child_development.principles", name: "Principles of Child Development", description: "Continuity, sequence, individual differences and integration." },
          { code: "cdp.child_development.heredity_environment", name: "Influence of Heredity and Environment", description: "Nature vs nurture and the role of family, school and community." },
          { code: "cdp.child_development.socialization", name: "Socialization Processes", description: "Role of teachers, parents and peers in socialization." },
          { code: "cdp.child_development.piaget", name: "Piaget's Cognitive Development", description: "Stages of cognitive development and educational implications." },
          { code: "cdp.child_development.kohlberg", name: "Kohlberg's Moral Development", description: "Pre-conventional, conventional and post-conventional levels." },
          { code: "cdp.child_development.vygotsky", name: "Vygotsky's Socio-cultural Theory", description: "ZPD, scaffolding and social mediation of learning." },
          { code: "cdp.child_development.child_centred", name: "Child-Centred and Progressive Education", description: "Progressive pedagogy and child-centred classrooms." },
          { code: "cdp.child_development.intelligence", name: "Concept of Intelligence", description: "Critical perspective on intelligence and Gardner's multiple intelligences." },
          { code: "cdp.child_development.language_thought", name: "Language and Thought", description: "Relationship between language and cognitive development." },
          { code: "cdp.child_development.gender", name: "Gender as a Social Construct", description: "Gender roles, gender bias and educational practice." },
          { code: "cdp.child_development.individual_differences", name: "Individual Differences among Learners", description: "Diversity based on language, caste, gender, religion and ability." },
          { code: "cdp.child_development.assessment", name: "Distinction between Assessment for and of Learning", description: "Formative vs summative assessment." },
        ],
      },
      { code: "cdp.inclusive_education", name: "Inclusive Education and CWSN",
        description: "Addressing diverse learners and children with special needs.",
        subtopics: [
          { code: "cdp.inclusive_education.disadvantaged", name: "Learners from Disadvantaged Backgrounds", description: "SC/ST/minority/migrant learners and educational support." },
          { code: "cdp.inclusive_education.learning_difficulties", name: "Learners with Learning Difficulties", description: "Dyslexia, dyscalculia, ADHD identification and remediation." },
          { code: "cdp.inclusive_education.talented", name: "Talented and Creative Learners", description: "Strategies for gifted and creatively able children." },
          { code: "cdp.inclusive_education.rte", name: "Right to Education Act 2009", description: "RTE provisions and inclusive classroom requirements." },
        ],
      },
      { code: "cdp.learning_pedagogy", name: "Learning and Pedagogy",
        description: "How children learn and pedagogical approaches.",
        subtopics: [
          { code: "cdp.learning_pedagogy.how_children_think", name: "How Children Think and Learn", description: "Children as active constructors of knowledge." },
          { code: "cdp.learning_pedagogy.motivation", name: "Motivation and Learning", description: "Intrinsic and extrinsic motivation, Maslow's hierarchy." },
          { code: "cdp.learning_pedagogy.cognition_emotion", name: "Cognition and Emotion", description: "Role of emotion in learning and cognition." },
          { code: "cdp.learning_pedagogy.failure_learning", name: "Alternative Conceptions and 'Errors'", description: "Children's alternative conceptions and the role of errors in learning." },
          { code: "cdp.learning_pedagogy.factors", name: "Factors Affecting Learning", description: "Personal and environmental factors influencing learning." },
        ],
      },
    ],
  },

  // ── LANGUAGE I — PUNJABI / HINDI / ENGLISH / URDU ─────────────────────
  {
    code: "LANG1",
    name: "Language I (Medium of Instruction — Punjabi/Hindi/English/Urdu)",
    weight: 1,
    topics: [
      { code: "lang1.comprehension", name: "Language Comprehension",
        description: "Reading unseen passages — prose or drama.",
        subtopics: [
          { code: "lang1.comprehension.unseen", name: "Unseen Passages", description: "Comprehension, inference, grammar and verbal-ability questions." },
          { code: "lang1.comprehension.poem", name: "Unseen Poem", description: "Comprehension and inference questions on a poem." },
        ],
      },
      { code: "lang1.pedagogy", name: "Pedagogy of Language Development",
        description: "Methods and challenges of teaching the first language.",
        subtopics: [
          { code: "lang1.pedagogy.learning_acquisition", name: "Learning and Acquisition", description: "Distinction between language learning and acquisition." },
          { code: "lang1.pedagogy.principles", name: "Principles of Language Teaching", description: "Approaches to language teaching at the primary level." },
          { code: "lang1.pedagogy.role_of_listening_speaking", name: "Role of Listening and Speaking", description: "Function of listening and speaking; how children use language." },
          { code: "lang1.pedagogy.grammar", name: "Critical Perspective on Grammar", description: "Role of grammar in learning a language for communication." },
          { code: "lang1.pedagogy.diverse_classroom", name: "Challenges in Diverse Classrooms", description: "Language difficulties, errors and disorders in heterogeneous classrooms." },
          { code: "lang1.pedagogy.language_skills", name: "Language Skills", description: "Listening, speaking, reading and writing skills." },
          { code: "lang1.pedagogy.evaluation", name: "Evaluation of Language Comprehension", description: "Evaluating language comprehension and proficiency — oral and written." },
          { code: "lang1.pedagogy.tlm", name: "Teaching-Learning Materials", description: "Textbooks, multimedia, multilingual classroom resources." },
          { code: "lang1.pedagogy.remedial", name: "Remedial Teaching", description: "Diagnostic and remedial teaching strategies." },
        ],
      },
      { code: "lang1.punjabi_grammar", name: "Punjabi Vyakaran",
        description: "Punjabi grammar topics for medium-Punjabi candidates.",
        subtopics: [
          { code: "lang1.punjabi_grammar.varnamala", name: "Varnamala and Mukhandar", description: "Gurmukhi script — letters, vowel symbols and pronunciation." },
          { code: "lang1.punjabi_grammar.shabad_bhed", name: "Shabad Bhed", description: "Parts of speech in Punjabi — naam, painanaam, kiriya etc." },
          { code: "lang1.punjabi_grammar.kaal", name: "Kaal and Vachan", description: "Tense, number and gender in Punjabi." },
          { code: "lang1.punjabi_grammar.muhavre", name: "Muhavre and Akhane", description: "Idioms and proverbs in Punjabi." },
        ],
      },
    ],
  },

  // ── LANGUAGE II ───────────────────────────────────────────────────────
  {
    code: "LANG2",
    name: "Language II (different from Language I)",
    weight: 1,
    topics: [
      { code: "lang2.comprehension", name: "Comprehension",
        description: "Reading two unseen prose passages with comprehension and grammar questions.",
        subtopics: [
          { code: "lang2.comprehension.discursive", name: "Discursive Passage", description: "A discursive prose passage with reasoning, inference and language ability questions." },
          { code: "lang2.comprehension.literary", name: "Literary or Narrative Passage", description: "A literary, narrative or scientific passage." },
        ],
      },
      { code: "lang2.pedagogy", name: "Pedagogy of Language Development",
        description: "Methods and challenges of teaching the second language.",
        subtopics: [
          { code: "lang2.pedagogy.learning_acquisition", name: "Learning and Acquisition", description: "Distinction between language learning and acquisition." },
          { code: "lang2.pedagogy.principles", name: "Principles of Language Teaching", description: "Approaches to second-language teaching." },
          { code: "lang2.pedagogy.listening_speaking", name: "Role of Listening and Speaking", description: "Function of listening and speaking in second-language learning." },
          { code: "lang2.pedagogy.grammar", name: "Critical Perspective on Grammar", description: "Role of grammar in second-language learning." },
          { code: "lang2.pedagogy.diverse_classroom", name: "Challenges in Diverse Classrooms", description: "Second-language difficulties and errors." },
          { code: "lang2.pedagogy.language_skills", name: "Language Skills", description: "Listening, speaking, reading and writing skills in L2." },
          { code: "lang2.pedagogy.evaluation", name: "Evaluation of Language Proficiency", description: "Tools for assessing L2 comprehension and proficiency." },
          { code: "lang2.pedagogy.tlm", name: "Teaching-Learning Materials", description: "Textbooks, multimedia and multilingual L2 resources." },
          { code: "lang2.pedagogy.remedial", name: "Remedial Teaching", description: "Diagnostic and remedial L2 teaching strategies." },
        ],
      },
    ],
  },

  // ── MATHEMATICS (Paper I) ──────────────────────────────────────────────
  {
    code: "MATH",
    name: "Mathematics (Paper I — Classes I-V)",
    weight: 1,
    topics: [
      { code: "math.content", name: "Mathematical Content",
        description: "Topics from Class I-V Mathematics.",
        subtopics: [
          { code: "math.content.numbers", name: "Numbers and Place Value", description: "Numbers up to 1,00,000; place value and number names." },
          { code: "math.content.operations", name: "Addition and Subtraction", description: "Addition and subtraction with regrouping and word problems." },
          { code: "math.content.multiplication", name: "Multiplication and Division", description: "Multiplication tables, long division and word problems." },
          { code: "math.content.fractions", name: "Fractions and Decimals", description: "Concept of fractions, equivalent fractions, decimals." },
          { code: "math.content.measurement", name: "Measurement", description: "Length, weight, capacity, time and money." },
          { code: "math.content.geometry", name: "Geometry", description: "Shapes, lines, angles, perimeter and area of basic shapes." },
          { code: "math.content.data_handling", name: "Data Handling", description: "Pictographs, bar graphs and simple data interpretation." },
          { code: "math.content.patterns", name: "Patterns", description: "Number and shape patterns at primary level." },
        ],
      },
      { code: "math.pedagogy", name: "Pedagogical Issues",
        description: "Pedagogy of mathematics at primary level.",
        subtopics: [
          { code: "math.pedagogy.nature", name: "Nature of Mathematics", description: "Logical thinking and the nature of mathematics in NCF." },
          { code: "math.pedagogy.curriculum", name: "Place of Mathematics in Curriculum", description: "Position and importance of mathematics in school curriculum." },
          { code: "math.pedagogy.language", name: "Language of Mathematics", description: "Mathematical vocabulary, symbols and reasoning." },
          { code: "math.pedagogy.community", name: "Community Mathematics", description: "Connecting mathematics to everyday life and community." },
          { code: "math.pedagogy.evaluation", name: "Evaluation in Mathematics", description: "Formal and informal methods of assessment in mathematics." },
          { code: "math.pedagogy.problems", name: "Problems of Teaching", description: "Common difficulties faced by primary mathematics teachers." },
          { code: "math.pedagogy.error_analysis", name: "Error Analysis and Remediation", description: "Identifying common errors and providing remedial support." },
          { code: "math.pedagogy.diagnostic", name: "Diagnostic and Remedial Teaching", description: "Diagnostic assessment and remedial strategies." },
        ],
      },
    ],
  },

  // ── ENVIRONMENTAL STUDIES (Paper I) ────────────────────────────────────
  {
    code: "EVS",
    name: "Environmental Studies (Paper I — Classes I-V)",
    weight: 1,
    topics: [
      { code: "evs.content", name: "EVS Content",
        description: "Themes drawn from NCERT/Punjab EVS textbooks for Classes III-V.",
        subtopics: [
          { code: "evs.content.family", name: "Family and Friends", description: "Relationships, work, animals, plants in our surroundings." },
          { code: "evs.content.food", name: "Food", description: "Food sources, components, balanced diet and food preservation." },
          { code: "evs.content.shelter", name: "Shelter", description: "Houses across regions, materials and environment." },
          { code: "evs.content.water", name: "Water", description: "Sources, conservation, water-borne diseases and water cycle." },
          { code: "evs.content.travel", name: "Travel", description: "Transport, communication and journeys across India." },
          { code: "evs.content.things_we_make", name: "Things We Make and Do", description: "Local crafts, occupations, recycling and waste management." },
          { code: "evs.content.environment", name: "Environment and Conservation", description: "Pollution, conservation, biodiversity, climate." },
        ],
      },
      { code: "evs.pedagogy", name: "Pedagogical Issues",
        description: "Pedagogy of EVS at primary level.",
        subtopics: [
          { code: "evs.pedagogy.concept", name: "Concept and Scope of EVS", description: "Integrated approach in EVS — covering science and social science." },
          { code: "evs.pedagogy.significance", name: "Significance of EVS", description: "Role of EVS in primary education." },
          { code: "evs.pedagogy.science_social", name: "Integrated EVS Approach", description: "Linking science and social-science aspects in EVS." },
          { code: "evs.pedagogy.environmental", name: "Environmental Studies & Education", description: "Goals, strategies and approaches in EVS pedagogy." },
          { code: "evs.pedagogy.learning", name: "Learning Principles in EVS", description: "Activity-based and experiential learning in EVS." },
          { code: "evs.pedagogy.activities", name: "Activities and Experimentation", description: "Practical activities, demonstrations and field visits." },
          { code: "evs.pedagogy.cce", name: "CCE in EVS", description: "Continuous and comprehensive evaluation in EVS." },
          { code: "evs.pedagogy.tlm", name: "Teaching Materials and Aids", description: "TLM, charts, models and ICT in EVS classrooms." },
          { code: "evs.pedagogy.problems", name: "Problems in Teaching EVS", description: "Common difficulties in teaching EVS at primary level." },
        ],
      },
    ],
  },

  // ── MATHEMATICS & SCIENCE (Paper II) ──────────────────────────────────
  {
    code: "MATH_SCI",
    name: "Mathematics and Science (Paper II — Classes VI-VIII)",
    weight: 1,
    topics: [
      { code: "math_sci.math_content", name: "Mathematics Content (Class VI-VIII)",
        description: "Mathematical topics for upper-primary level.",
        subtopics: [
          { code: "math_sci.math_content.number_system", name: "Number System", description: "Integers, rational numbers, exponents and powers." },
          { code: "math_sci.math_content.algebra", name: "Algebra", description: "Linear equations, expressions, identities and factorisation." },
          { code: "math_sci.math_content.geometry", name: "Geometry", description: "Lines and angles, triangles, quadrilaterals, circles." },
          { code: "math_sci.math_content.mensuration", name: "Mensuration", description: "Perimeter, area, surface area and volume of solids." },
          { code: "math_sci.math_content.commercial", name: "Commercial Mathematics", description: "Ratio, proportion, percentage, profit-loss, SI/CI." },
          { code: "math_sci.math_content.data_handling", name: "Data Handling", description: "Mean, median, mode, bar/pie graphs and probability." },
          { code: "math_sci.math_content.patterns", name: "Symmetry and Practical Geometry", description: "Symmetry, constructions and 3-D visualisation." },
        ],
      },
      { code: "math_sci.science_content", name: "Science Content (Class VI-VIII)",
        description: "Science topics for upper-primary level.",
        subtopics: [
          { code: "math_sci.science_content.food", name: "Food", description: "Sources, components, food production and balanced diet." },
          { code: "math_sci.science_content.materials", name: "Materials", description: "Materials of daily use, fibres, metals, non-metals." },
          { code: "math_sci.science_content.world_living", name: "The World of Living", description: "Plants, animals, microorganisms and reproduction." },
          { code: "math_sci.science_content.moving", name: "Moving Things, People and Ideas", description: "Motion, force, friction and simple machines." },
          { code: "math_sci.science_content.things_work", name: "How Things Work", description: "Electricity, magnetism, light and sound." },
          { code: "math_sci.science_content.natural_phenomena", name: "Natural Phenomena", description: "Reflection, refraction, atmospheric phenomena." },
          { code: "math_sci.science_content.natural_resources", name: "Natural Resources", description: "Air, water, soil, minerals and conservation." },
        ],
      },
      { code: "math_sci.pedagogy", name: "Pedagogical Issues",
        description: "Pedagogy of mathematics and science.",
        subtopics: [
          { code: "math_sci.pedagogy.nature_aim", name: "Nature and Aims of Science/Maths", description: "Aims and objectives of teaching science and mathematics." },
          { code: "math_sci.pedagogy.understanding", name: "Understanding and Appreciating Science", description: "Approaches to building scientific temper and reasoning." },
          { code: "math_sci.pedagogy.approaches", name: "Approaches and Methods", description: "Constructivist, inquiry-based and project methods." },
          { code: "math_sci.pedagogy.text_aids", name: "Text and Teaching Aids", description: "Textbooks, lab equipment, ICT in science teaching." },
          { code: "math_sci.pedagogy.evaluation", name: "Evaluation in Science/Maths", description: "Continuous and diagnostic evaluation in science and maths." },
          { code: "math_sci.pedagogy.problems", name: "Problems of Teaching", description: "Common difficulties in upper-primary science and maths." },
          { code: "math_sci.pedagogy.remedial", name: "Remedial Teaching", description: "Diagnostic and remedial strategies." },
          { code: "math_sci.pedagogy.innovations", name: "Innovations in Teaching", description: "Recent innovations in pedagogy and educational technology." },
        ],
      },
    ],
  },

  // ── SOCIAL STUDIES (Paper II) ─────────────────────────────────────────
  {
    code: "SOCIAL_STUDIES",
    name: "Social Studies / Social Sciences (Paper II — Classes VI-VIII)",
    weight: 1,
    topics: [
      { code: "ss.history.ancient", name: "Ancient India", description: "Stone Age, Indus Valley Civilisation, Vedic period, Mahajanapadas and Mauryan empire." },
      { code: "ss.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals, Vijayanagara and Bhakti-Sufi movements." },
      { code: "ss.history.modern", name: "Modern India", description: "Advent of Europeans, British rule, 1857, freedom struggle and independence." },
      { code: "ss.history.punjab", name: "History of Punjab and Sikh Gurus", description: "Punjab history, ten Sikh Gurus, Maharaja Ranjit Singh and Anglo-Sikh wars." },
      { code: "ss.geography.earth", name: "Earth as a Planet", description: "Solar system, latitudes, longitudes, motions of the Earth." },
      { code: "ss.geography.physical_india", name: "Physical Geography of India", description: "Major landforms, climate, rivers and natural vegetation of India." },
      { code: "ss.geography.physical_punjab", name: "Geography of Punjab", description: "Physical features, rivers (5 doabs), climate and resources of Punjab." },
      { code: "ss.geography.resources", name: "Resources and Agriculture", description: "Natural resources, agriculture and industries of India and Punjab." },
      { code: "ss.geography.world", name: "World Geography", description: "Continents, oceans and important countries." },
      { code: "ss.civics.constitution", name: "Indian Constitution and Government", description: "Preamble, fundamental rights, duties and DPSPs." },
      { code: "ss.civics.democracy", name: "Indian Democracy", description: "Parliament, executive, judiciary and elections." },
      { code: "ss.civics.local", name: "Local Self-Government", description: "Panchayati Raj and urban local bodies in Punjab." },
      { code: "ss.economics.basics", name: "Basic Economics", description: "Concepts of demand, supply, money and banking." },
      { code: "ss.economics.development", name: "Indian Economy and Development", description: "Five-year plans, sectors of the economy." },
      { code: "ss.environment", name: "Environmental Issues", description: "Pollution, climate change, conservation and sustainable development." },
      { code: "ss.pedagogy", name: "Pedagogical Issues in Social Studies",
        description: "Pedagogy specific to Social Studies at upper-primary level.",
        subtopics: [
          { code: "ss.pedagogy.concept", name: "Concept and Nature of Social Studies", description: "Scope, aims and objectives of social studies." },
          { code: "ss.pedagogy.classroom", name: "Classroom Processes and Activities", description: "Discussion, debate, project and inquiry methods." },
          { code: "ss.pedagogy.thinking", name: "Developing Critical Thinking", description: "Cultivating reasoning and inquiry in social-science learners." },
          { code: "ss.pedagogy.sources", name: "Sources — Primary and Secondary", description: "Use of historical sources, maps and contemporary data." },
          { code: "ss.pedagogy.projects", name: "Projects and Field Work", description: "Project-based and field-based learning in social studies." },
          { code: "ss.pedagogy.evaluation", name: "Evaluation in Social Studies", description: "Tools and techniques of evaluation in social studies." },
        ],
      },
    ],
  },
];

export async function seedPbTetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "PB_TET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — PB_TET exam not found.");
  }
  console.log(`Seeding PSTET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < pbTetSyllabus.length; sIdx++) {
    const s = pbTetSyllabus[sIdx];
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
  seedPbTetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
